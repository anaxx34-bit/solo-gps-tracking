import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { eq, gte, and } from "drizzle-orm";
import * as geofenceUtils from "./_core/geofenceUtils";
import * as etaUtils from "./_core/etaUtils";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Bus tracking and location routes
  buses: router({
    list: publicProcedure.query(() => db.getAllBuses()),
    getById: publicProcedure.input(z.object({ busId: z.number() })).query(({ input }) => db.getBusById(input.busId)),
    getLocation: publicProcedure
      .input(z.object({ busId: z.number() }))
      .query(({ input }) => db.getLatestBusLocation(input.busId)),
    getLocationHistory: publicProcedure
      .input(z.object({ busId: z.number(), limit: z.number().default(100) }))
      .query(({ input }) => db.getBusLocationHistory(input.busId, input.limit)),
    recordLocation: publicProcedure
      .input(
        z.object({
          busId: z.number(),
          latitude: z.string(),
          longitude: z.string(),
          accuracy: z.number().optional(),
          speed: z.string().optional(),
          heading: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.recordGpsLocation({
          busId: input.busId,
          latitude: input.latitude as any,
          longitude: input.longitude as any,
          accuracy: input.accuracy,
          speed: input.speed as any,
          heading: input.heading as any,
        });
      }),
    // Get geofence status for a bus
    getGeofenceStatus: publicProcedure
      .input(z.object({ busId: z.number() }))
      .query(async ({ input }) => {
        const location = await db.getLatestBusLocation(input.busId);
        if (!location) {
          return { insideGeofences: [], nearbyGeofences: [] };
        }
        const latitude = parseFloat(location.latitude);
        const longitude = parseFloat(location.longitude);
        return geofenceUtils.getGeofenceStatus(latitude, longitude);
      }),
    // Get route status for a bus
    getRouteStatus: publicProcedure
      .input(z.object({ busId: z.number(), routeId: z.number() }))
      .query(async ({ input }) => {
        const location = await db.getLatestBusLocation(input.busId);
        if (!location) {
          return {
            isOnRoute: true,
            distanceFromRoute: 0,
            nearestStopIndex: 0,
            nearestStopDistance: 0,
          };
        }
        const latitude = parseFloat(location.latitude);
        const longitude = parseFloat(location.longitude);
        return geofenceUtils.getRouteStatus(latitude, longitude, input.routeId);
      }),
    // Get comprehensive status for a bus
    getStatus: publicProcedure
      .input(z.object({ busId: z.number(), tripId: z.number() }))
      .query(async ({ input }) => {
        return geofenceUtils.getBusStatus(input.busId, input.tripId);
      }),
  }),

  // Student and parent routes
  students: router({
    getByParent: protectedProcedure.query(({ ctx }) => db.getStudentsByParent(ctx.user.id)),
    getById: protectedProcedure
      .input(z.object({ studentId: z.number() }))
      .query(({ input }) => db.getStudentById(input.studentId)),
  }),

  // Trip and driver routes
  trips: router({
    create: protectedProcedure
      .input(
        z.object({
          busId: z.number(),
          routeId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return db.createTrip({
          busId: input.busId,
          routeId: input.routeId,
          driverId: ctx.user.id,
          status: "not_started",
        });
      }),
    getById: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(({ input }) => db.getTripById(input.tripId)),
    updateStatus: protectedProcedure
      .input(z.object({ tripId: z.number(), status: z.enum(["not_started", "in_progress", "completed"]) }))
      .mutation(async ({ input }) => db.updateTripStatus(input.tripId, input.status)),
    getStudents: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .query(({ input }) => db.getTripStudents(input.tripId)),
    markPickedUp: protectedProcedure
      .input(z.object({ tripStudentId: z.number() }))
      .mutation(async ({ input }) => db.markStudentPickedUp(input.tripStudentId)),
    markDroppedOff: protectedProcedure
      .input(z.object({ tripStudentId: z.number() }))
      .mutation(async ({ input }) => db.markStudentDroppedOff(input.tripStudentId)),
    // GPS Tracking endpoints
    start: protectedProcedure
      .input(
        z.object({
          busId: z.number(),
          routeId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const trip = await db.createTrip({
          busId: input.busId,
          routeId: input.routeId,
          driverId: ctx.user.id,
          status: "in_progress",
          startTime: new Date(),
        });
        return trip;
      }),
    recordLocation: protectedProcedure
      .input(
        z.object({
          tripId: z.number(),
          busId: z.number(),
          latitude: z.number(),
          longitude: z.number(),
          accuracy: z.number().optional(),
          speed: z.number().optional(),
          heading: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Record the GPS location
        const locationResult = await db.recordGpsLocation({
          busId: input.busId,
          latitude: input.latitude.toString() as any,
          longitude: input.longitude.toString() as any,
          accuracy: input.accuracy,
          speed: input.speed ? input.speed.toString() : undefined as any,
          heading: input.heading ? input.heading.toString() : undefined as any,
        });

        try {
          // Check for geofence events (enter/exit)
          const geofenceEvents = await db.checkGeofenceEvents(
            input.busId,
            input.tripId,
            input.latitude,
            input.longitude
          );

          // Record geofence events and trigger notifications
          for (const event of geofenceEvents) {
            const recorded = await db.recordGeofenceEventIfNew(
              input.tripId,
              input.busId,
              event.geofenceId,
              event.eventType,
              input.latitude,
              input.longitude
            );

            if (recorded) {
              // Create notification for geofence event
              const recipients = await db.getNotificationRecipients(input.busId);
              const eventText = event.eventType === 'enter' ? 'entered' : 'exited';
              
              for (const recipient of recipients) {
                await db.createNotification({
                  userId: recipient.userId,
                  type: event.eventType === 'enter' ? 'bus_approaching' : 'alert',
                  title: `Bus ${eventText} ${event.geofence.name}`,
                  message: `Bus has ${eventText} the ${event.geofence.type} zone at ${new Date().toLocaleTimeString()}.`,
                  relatedBusId: input.busId,
                });
              }
            }
          }

          // Check for route deviation
          const trip = await db.getTripById(input.tripId);
          if (trip) {
            const route = await db.getRouteById(trip.routeId);
            if (route) {
              const stops = await db.getStopsByRoute(route.id);
              if (stops.length >= 2) {
                const { isInCorridor, distanceFromRoute } = db.isPointInRouteCorridor(
                  input.latitude,
                  input.longitude,
                  stops,
                  200 // 200 meters corridor width
                );

                if (!isInCorridor) {
                  // Check if we already have a recent route deviation notification
                  const dbInstance = await db.getDb();
                  let hasRecentDeviation = false;
                  
                  if (dbInstance) {
                    const recentDeviation = await dbInstance.select().from(db.notifications)
                      .where(
                        and(
                          eq(db.notifications.type, 'route_deviation'),
                          eq(db.notifications.relatedBusId, input.busId),
                          gte(db.notifications.createdAt, new Date(Date.now() - 300000)) // 5 minutes
                        )
                      )
                      .limit(1);
                    
                    hasRecentDeviation = recentDeviation.length > 0;
                  }

                  if (!hasRecentDeviation) {
                    // Record route deviation and notify
                    await db.recordRouteDeviation(
                      input.busId,
                      input.tripId,
                      distanceFromRoute,
                      route.schoolId ?? undefined
                    );
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Error checking geofence/route deviation:", error);
          // Continue even if geofence/route checking fails
        }

        return locationResult;
      }),
    end: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .mutation(async ({ input }) => {
        return db.updateTripStatus(input.tripId, "completed");
      }),
  }),

  // Geofences
  geofences: router({
    list: publicProcedure.query(() => db.getAllGeofences()),
    getById: publicProcedure
      .input(z.object({ geofenceId: z.number() }))
      .query(({ input }) => db.getGeofenceById(input.geofenceId)),
    getBySchool: publicProcedure
      .input(z.object({ schoolId: z.number() }))
      .query(({ input }) => db.getGeofencesBySchool(input.schoolId)),
    getByType: publicProcedure
      .input(z.object({ type: z.string() }))
      .query(({ input }) => db.getGeofencesByType(input.type)),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          type: z.enum(["school", "stop", "home", "custom"]),
          latitude: z.number(),
          longitude: z.number(),
          radiusMeters: z.number().default(500),
          schoolId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createGeofence({
          name: input.name,
          type: input.type,
          latitude: input.latitude.toString() as any,
          longitude: input.longitude.toString() as any,
          radiusMeters: input.radiusMeters,
          schoolId: input.schoolId,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          geofenceId: z.number(),
          name: z.string().optional(),
          radiusMeters: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.updateGeofence(input.geofenceId, {
          name: input.name,
          radiusMeters: input.radiusMeters,
        });
      }),
    getEvents: publicProcedure
      .input(z.object({ tripId: z.number() }))
      .query(({ input }) => db.getGeofenceEventsByTrip(input.tripId)),
    getEventsByBus: publicProcedure
      .input(z.object({ busId: z.number(), limit: z.number().default(100) }))
      .query(({ input }) => db.getGeofenceEventsByBus(input.busId, input.limit)),
  }),

  // Notifications
  notifications: router({
    list: protectedProcedure.query(({ ctx }) => db.getUserNotifications(ctx.user.id)),
    markAsRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ input }) => db.markNotificationAsRead(input.notificationId)),
  }),

  // ETA and Alarm Settings
  eta: router({
    // Get ETA for a bus
    getETA: publicProcedure
      .input(z.object({ busId: z.number(), tripId: z.number() }))
      .query(async ({ input }) => {
        const location = await db.getLatestBusLocation(input.busId);
        if (!location) {
          return null;
        }

        const latitude = parseFloat(location.latitude);
        const longitude = parseFloat(location.longitude);
        const currentSpeed = location.speed ? parseFloat(location.speed.toString()) : 0;

        const etaResult = await etaUtils.calculateETA(
          input.busId,
          input.tripId,
          latitude,
          longitude,
          currentSpeed
        );

        // Record ETA data
        await db.recordEtaData({
          busId: input.busId,
          tripId: input.tripId,
          nextStopId: etaResult.nextStopId,
          distanceToNextStop: etaResult.distanceToNextStop.toString() as any,
          estimatedArrivalTime: etaResult.estimatedArrivalTime,
          currentSpeed: etaResult.currentSpeed.toString() as any,
          averageSpeed: etaResult.averageSpeed.toString() as any,
        });

        return etaResult;
      }),

    // Get latest ETA data for a bus
    getLatest: publicProcedure
      .input(z.object({ busId: z.number() }))
      .query(async ({ input }) => {
        return db.getLatestEtaData(input.busId);
      }),

    // Get ETA history for a trip
    getHistory: publicProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ input }) => {
        return db.getEtaDataByTrip(input.tripId);
      }),
  }),

  alarmSettings: router({
    // Get alarm settings for a parent and student
    get: protectedProcedure
      .input(z.object({ studentId: z.number() }))
      .query(async ({ input, ctx }) => {
        return db.getAlarmSetting(ctx.user.id, input.studentId);
      }),

    // Get all alarm settings for a parent
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getAlarmSettingsByParent(ctx.user.id);
      }),

    // Create or update alarm settings
    update: protectedProcedure
      .input(
        z.object({
          studentId: z.number(),
          alarmTimeMinutes: z.enum(["2", "5", "10"]).transform((val) => parseInt(val)),
          enabled: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return db.createOrUpdateAlarmSetting({
          parentId: ctx.user.id,
          studentId: input.studentId,
          alarmTimeMinutes: input.alarmTimeMinutes,
          enabled: input.enabled ?? true,
        });
      }),
  }),

  alarmNotifications: router({
    // Get active alarm notifications for a parent
    getActive: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getActiveAlarmNotifications(ctx.user.id);
      }),

    // Dismiss an alarm notification
    dismiss: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ input }) => {
        return db.dismissAlarmNotification(input.notificationId);
      }),

    // Mark alarm notification as opened
    open: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ input }) => {
        return db.openAlarmNotification(input.notificationId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
