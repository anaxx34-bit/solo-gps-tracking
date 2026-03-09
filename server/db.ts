import { eq, and, desc, lte, gte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, buses, routes, stops, students, trips, tripStudents, gpsLocations, geofences, geofenceEvents, notifications, alarmSettings, etaData, alarmNotifications, InsertBus, InsertRoute, InsertStop, InsertStudent, InsertTrip, InsertTripStudent, InsertGpsLocation, InsertGeofence, InsertGeofenceEvent, InsertNotification, InsertAlarmSetting, InsertEtaData, InsertAlarmNotification } from "../drizzle/schema";
import { sql } from "drizzle-orm";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Bus queries
export async function getAllBuses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(buses);
}

export async function getBusById(busId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(buses).where(eq(buses.id, busId)).limit(1);
  return result[0];
}

export async function createBus(bus: InsertBus) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(buses).values(bus);
  return result;
}

// Route queries
export async function getRoutesByBus(busId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(routes).where(eq(routes.busId, busId));
}

export async function getRouteById(routeId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(routes).where(eq(routes.id, routeId)).limit(1);
  return result[0];
}

// Stop queries
export async function getStopsByRoute(routeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stops).where(eq(stops.routeId, routeId));
}

// Student queries
export async function getStudentsByParent(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(students).where(eq(students.parentId, parentId));
}

export async function getStudentById(studentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  return result[0];
}

export async function createStudent(student: InsertStudent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(students).values(student);
  return result;
}

// Trip queries
export async function createTrip(trip: InsertTrip) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(trips).values(trip);
  // Fetch the most recently created trip for this driver
  const created = await db.select().from(trips)
    .where(eq(trips.driverId, trip.driverId))
    .orderBy(desc(trips.createdAt))
    .limit(1);
  return created[0];
}

export async function getTripById(tripId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
  return result[0];
}

export async function getTripsByBus(busId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trips).where(eq(trips.busId, busId));
}

export async function updateTripStatus(tripId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(trips).set({ status: status as any }).where(eq(trips.id, tripId));
}

// Trip student queries
export async function addStudentToTrip(tripStudent: InsertTripStudent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(tripStudents).values(tripStudent);
}

export async function getTripStudents(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tripStudents).where(eq(tripStudents.tripId, tripId));
}

export async function markStudentPickedUp(tripStudentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(tripStudents).set({ pickedUp: true, pickupTime: new Date() }).where(eq(tripStudents.id, tripStudentId));
}

export async function markStudentDroppedOff(tripStudentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(tripStudents).set({ droppedOff: true, dropoffTime: new Date() }).where(eq(tripStudents.id, tripStudentId));
}

// GPS Location queries
export async function recordGpsLocation(location: InsertGpsLocation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(gpsLocations).values(location);
}

export async function getLatestBusLocation(busId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(gpsLocations).where(eq(gpsLocations.busId, busId)).orderBy(desc(gpsLocations.createdAt)).limit(1);
  return result[0];
}

export async function getBusLocationHistory(busId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gpsLocations).where(eq(gpsLocations.busId, busId)).orderBy(desc(gpsLocations.createdAt)).limit(limit);
}

// Notification queries
export async function createNotification(notification: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(notifications).values(notification);
}

export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(notifications).set({ read: true }).where(eq(notifications.id, notificationId));
}

// Geofence queries
export async function getAllGeofences() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(geofences);
}

export async function getGeofenceById(geofenceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(geofences).where(eq(geofences.id, geofenceId)).limit(1);
  return result[0];
}

export async function getGeofencesBySchool(schoolId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(geofences).where(eq(geofences.schoolId, schoolId));
}

export async function getGeofencesByType(type: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(geofences).where(eq(geofences.type, type as any));
}

export async function createGeofence(geofence: InsertGeofence) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(geofences).values(geofence);
  // Fetch the most recently created geofence
  const created = await db.select().from(geofences).orderBy(desc(geofences.createdAt)).limit(1);
  return created[0];
}

export async function updateGeofence(geofenceId: number, data: Partial<InsertGeofence>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(geofences).set(data).where(eq(geofences.id, geofenceId));
}

// Geofence events queries
export async function recordGeofenceEvent(event: InsertGeofenceEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(geofenceEvents).values(event);
}

export async function getGeofenceEventsByTrip(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(geofenceEvents).where(eq(geofenceEvents.tripId, tripId)).orderBy(desc(geofenceEvents.createdAt));
}

export async function getLatestGeofenceEvent(tripId: number, geofenceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(geofenceEvents)
    .where(and(eq(geofenceEvents.tripId, tripId), eq(geofenceEvents.geofenceId, geofenceId)))
    .orderBy(desc(geofenceEvents.createdAt))
    .limit(1);
  return result[0];
}

export async function getGeofenceEventsByBus(busId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(geofenceEvents).where(eq(geofenceEvents.busId, busId)).orderBy(desc(geofenceEvents.createdAt)).limit(limit);
}

// Utility function to calculate distance between two coordinates (Haversine formula)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

// Check if a point is inside a geofence
export function isPointInGeofence(lat: number, lon: number, geofence: { latitude: string | number; longitude: string | number; radiusMeters: number }): boolean {
  const distance = calculateDistance(
    lat,
    lon,
    parseFloat(geofence.latitude.toString()),
    parseFloat(geofence.longitude.toString())
  );
  return distance <= geofence.radiusMeters;
}

// Get the closest point on a line segment to a given point
export function getClosestPointOnLineSegment(
  lat: number,
  lon: number,
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): { lat: number; lon: number; distance: number } {
  // Convert to radians
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1Rad = toRad(lat1);
  const lon1Rad = toRad(lon1);
  const lat2Rad = toRad(lat2);
  const lon2Rad = toRad(lon2);
  const latRad = toRad(lat);
  const lonRad = toRad(lon);

  // Calculate bearing from point 1 to point 2
  const dLon = lon2Rad - lon1Rad;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const bearing = Math.atan2(y, x);

  // Calculate distance from point 1 to current point
  const dLat = latRad - lat1Rad;
  const dLonPoint = lonRad - lon1Rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(latRad) * Math.sin(dLonPoint / 2) * Math.sin(dLonPoint / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distToPoint = R * c;

  // Calculate distance from point 1 to point 2
  const dLatSeg = lat2Rad - lat1Rad;
  const dLonSeg = lon2Rad - lon1Rad;
  const aSeg = Math.sin(dLatSeg / 2) * Math.sin(dLatSeg / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLonSeg / 2) * Math.sin(dLonSeg / 2);
  const cSeg = 2 * Math.atan2(Math.sqrt(aSeg), Math.sqrt(1 - aSeg));
  const segmentLength = R * cSeg;

  // Calculate along-track distance
  const alongTrackDist = Math.cos(bearing) * distToPoint;

  // If the closest point is beyond the segment, use the endpoints
  if (alongTrackDist <= 0) {
    return { lat: lat1, lon: lon1, distance: distToPoint };
  }
  if (alongTrackDist >= segmentLength) {
    const dist2 = calculateDistance(lat, lon, lat2, lon2);
    return { lat: lat2, lon: lon2, distance: dist2 };
  }

  // Calculate the closest point on the segment
  const crossTrackDist = Math.asin(Math.sin(distToPoint / R) * Math.sin(bearing)) * R;
  const closestLat = toDeg(Math.asin(
    Math.sin(lat1Rad) * Math.cos(alongTrackDist / R) +
    Math.cos(lat1Rad) * Math.sin(alongTrackDist / R) * Math.cos(bearing)
  ));
  const closestLon = toDeg(
    lon1Rad + Math.atan2(
      Math.sin(bearing) * Math.sin(alongTrackDist / R) * Math.cos(lat1Rad),
      Math.cos(alongTrackDist / R) - Math.sin(lat1Rad) * Math.sin(toRad(closestLat))
    )
  );

  const distance = Math.abs(crossTrackDist);
  return { lat: closestLat, lon: closestLon, distance };
}

// Check if a point is within a corridor (route) with specified width
export function isPointInRouteCorridor(
  lat: number,
  lon: number,
  routeStops: Array<{ latitude: string | number; longitude: string | number }>,
  corridorWidthMeters: number = 200
): { isInCorridor: boolean; distanceFromRoute: number } {
  if (routeStops.length < 2) {
    return { isInCorridor: true, distanceFromRoute: 0 }; // Can't determine corridor with less than 2 stops
  }

  let minDistance = Infinity;

  // Check distance to each segment of the route
  for (let i = 0; i < routeStops.length - 1; i++) {
    const lat1 = parseFloat(routeStops[i].latitude.toString());
    const lon1 = parseFloat(routeStops[i].longitude.toString());
    const lat2 = parseFloat(routeStops[i + 1].latitude.toString());
    const lon2 = parseFloat(routeStops[i + 1].longitude.toString());

    const closest = getClosestPointOnLineSegment(lat, lon, lat1, lon1, lat2, lon2);
    minDistance = Math.min(minDistance, closest.distance);
  }

  return {
    isInCorridor: minDistance <= corridorWidthMeters,
    distanceFromRoute: minDistance,
  };
}

// Check geofence entry/exit and return events to trigger
export async function checkGeofenceEvents(
  busId: number,
  tripId: number,
  lat: number,
  lon: number
): Promise<Array<{ geofenceId: number; eventType: 'enter' | 'exit'; geofence: any }>> {
  const db = await getDb();
  if (!db) return [];

  const events: Array<{ geofenceId: number; eventType: 'enter' | 'exit'; geofence: any }> = [];
  const allGeofences = await getAllGeofences();

  for (const geofence of allGeofences) {
    const isInside = isPointInGeofence(lat, lon, geofence);
    const lastEvent = await getLatestGeofenceEvent(tripId, geofence.id);

    // Check if we need to trigger an event
    if (isInside && (!lastEvent || lastEvent.eventType === 'exit')) {
      // Bus entered the geofence
      events.push({ geofenceId: geofence.id, eventType: 'enter', geofence });
    } else if (!isInside && lastEvent && lastEvent.eventType === 'enter') {
      // Bus exited the geofence
      events.push({ geofenceId: geofence.id, eventType: 'exit', geofence });
    }
  }

  return events;
}

// Record a geofence event
export async function recordGeofenceEventIfNew(
  tripId: number,
  busId: number,
  geofenceId: number,
  eventType: 'enter' | 'exit',
  lat: number,
  lon: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Check if this exact event was already recorded recently (within last 60 seconds)
  const recentEvent = await db.select().from(geofenceEvents)
    .where(
      and(
        eq(geofenceEvents.tripId, tripId),
        eq(geofenceEvents.geofenceId, geofenceId),
        eq(geofenceEvents.eventType, eventType),
        gte(geofenceEvents.createdAt, new Date(Date.now() - 60000))
      )
    )
    .limit(1);

  if (recentEvent.length > 0) {
    return false; // Event already recorded recently
  }

  // Record the new event
  await recordGeofenceEvent({
    tripId,
    busId,
    geofenceId,
    eventType,
    latitude: lat.toString() as any,
    longitude: lon.toString() as any,
  });

  return true;
}

// Get all users who should be notified for a bus
export async function getNotificationRecipients(busId: number, schoolId?: number) {
  const db = await getDb();
  if (!db) return [];

  // Get parents of students on this bus and admins of the school
  const query = db.select({ userId: users.id }).from(users)
    .where(
      or(
        eq(users.userType, 'admin'),
        eq(users.userType, 'parent')
      )
    );

  return query;
}

// Create a route deviation record in notifications table
export async function recordRouteDeviation(
  busId: number,
  tripId: number,
  distanceFromRoute: number,
  schoolId?: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get all admins and parents to notify
  const recipients = await getNotificationRecipients(busId, schoolId);

  for (const recipient of recipients) {
    await createNotification({
      userId: recipient.userId,
      type: 'route_deviation',
      title: `Route Deviation Detected`,
      message: `Bus has deviated ${Math.round(distanceFromRoute)}m from the assigned route.`,
      relatedBusId: busId,
    });
  }
}



// Alarm settings queries
export async function getAlarmSetting(parentId: number, studentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(alarmSettings)
    .where(
      and(
        eq(alarmSettings.parentId, parentId),
        eq(alarmSettings.studentId, studentId)
      )
    )
    .limit(1);
  return result[0];
}

export async function getAlarmSettingByStudentAndBus(studentId: number, busId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(alarmSettings)
    .where(
      and(
        eq(alarmSettings.studentId, studentId),
        eq(alarmSettings.busId, busId)
      )
    )
    .limit(1);
  return result[0];
}

export async function getAlarmSettingsByBus(busId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alarmSettings).where(eq(alarmSettings.busId, busId));
}

export async function getAlarmSettingsByParent(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alarmSettings).where(eq(alarmSettings.parentId, parentId));
}

export async function getAlarmSettingsForStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alarmSettings).where(eq(alarmSettings.studentId, studentId));
}

export async function createOrUpdateAlarmSetting(setting: InsertAlarmSetting) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getAlarmSetting(setting.parentId, setting.studentId);
  if (existing) {
    await db.update(alarmSettings)
      .set({ alarmTimeMinutes: setting.alarmTimeMinutes, enabled: setting.enabled })
      .where(
        and(
          eq(alarmSettings.parentId, setting.parentId),
          eq(alarmSettings.studentId, setting.studentId)
        )
      );
    return { ...existing, ...setting };
  } else {
    await db.insert(alarmSettings).values(setting);
    const created = await getAlarmSetting(setting.parentId, setting.studentId);
    return created;
  }
}

// ETA data queries
export async function recordEtaData(etaRecord: InsertEtaData) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(etaData).values(etaRecord);
}

export async function getLatestEtaData(busId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(etaData)
    .where(eq(etaData.busId, busId))
    .orderBy(desc(etaData.createdAt))
    .limit(1);
  return result[0];
}

export async function getEtaDataByTrip(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(etaData)
    .where(eq(etaData.tripId, tripId))
    .orderBy(desc(etaData.createdAt));
}

// Alarm notification queries
export async function createAlarmNotification(notification: InsertAlarmNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(alarmNotifications).values(notification);
}

export async function dismissAlarmNotification(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(alarmNotifications)
    .set({ dismissedAt: new Date() })
    .where(eq(alarmNotifications.id, notificationId));
}

export async function openAlarmNotification(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(alarmNotifications)
    .set({ openedAt: new Date() })
    .where(eq(alarmNotifications.id, notificationId));
}

export async function getActiveAlarmNotifications(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alarmNotifications)
    .where(
      and(
        eq(alarmNotifications.parentId, parentId),
        eq(alarmNotifications.dismissedAt, null as any),
        eq(alarmNotifications.openedAt, null as any)
      )
    )
    .orderBy(desc(alarmNotifications.triggerTime));
}

// Export new tables for use in routers
export { notifications, alarmSettings, etaData, alarmNotifications };
