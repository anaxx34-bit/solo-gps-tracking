import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  userType: mysqlEnum("userType", ["parent", "driver", "admin"]).default("parent"),
  schoolId: int("schoolId"), // For admins and drivers
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Update user table to include role-specific fields
// Note: role field already exists in users table (admin | user)
// We'll use role='admin' for school admins, role='user' for parents and drivers
// Additional userType field to distinguish parent/driver
export const userTypes = mysqlEnum("userType", ["parent", "driver", "admin"]);

/**
 * School Bus Tracking System Tables
 */

// Buses table
export const buses = mysqlTable("buses", {
  id: int("id").autoincrement().primaryKey(),
  busNumber: varchar("busNumber", { length: 50 }).notNull().unique(),
  driverId: int("driverId").notNull(),
  capacity: int("capacity").notNull(),
  status: mysqlEnum("status", ["idle", "in_transit", "completed"]).default("idle").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Bus = typeof buses.$inferSelect;
export type InsertBus = typeof buses.$inferInsert;

// Routes table
export const routes = mysqlTable("routes", {
  id: int("id").autoincrement().primaryKey(),
  routeName: varchar("routeName", { length: 100 }).notNull(),
  busId: int("busId").notNull(),
  schoolId: int("schoolId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Route = typeof routes.$inferSelect;
export type InsertRoute = typeof routes.$inferInsert;

// Bus stops table
export const stops = mysqlTable("stops", {
  id: int("id").autoincrement().primaryKey(),
  routeId: int("routeId").notNull(),
  stopName: varchar("stopName", { length: 100 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  stopOrder: int("stopOrder").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Stop = typeof stops.$inferSelect;
export type InsertStop = typeof stops.$inferInsert;

// Students table
export const students = mysqlTable("students", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parentId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  schoolId: int("schoolId"),
  homeStopId: int("homeStopId"),
  schoolStopId: int("schoolStopId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

// Trips table
export const trips = mysqlTable("trips", {
  id: int("id").autoincrement().primaryKey(),
  busId: int("busId").notNull(),
  routeId: int("routeId").notNull(),
  driverId: int("driverId").notNull(),
  startTime: timestamp("startTime"),
  endTime: timestamp("endTime"),
  status: mysqlEnum("status", ["not_started", "in_progress", "completed"]).default("not_started").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = typeof trips.$inferInsert;

// Trip students (many-to-many: which students are on which trip)
export const tripStudents = mysqlTable("tripStudents", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  studentId: int("studentId").notNull(),
  pickedUp: boolean("pickedUp").default(false).notNull(),
  droppedOff: boolean("droppedOff").default(false).notNull(),
  pickupTime: timestamp("pickupTime"),
  dropoffTime: timestamp("dropoffTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TripStudent = typeof tripStudents.$inferSelect;
export type InsertTripStudent = typeof tripStudents.$inferInsert;

// GPS Locations table (real-time tracking)
export const gpsLocations = mysqlTable("gpsLocations", {
  id: int("id").autoincrement().primaryKey(),
  busId: int("busId").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: int("accuracy"),
  speed: decimal("speed", { precision: 8, scale: 2 }),
  heading: decimal("heading", { precision: 6, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GpsLocation = typeof gpsLocations.$inferSelect;
export type InsertGpsLocation = typeof gpsLocations.$inferInsert;

// Geofences table (school zones, bus stops, etc.)
export const geofences = mysqlTable("geofences", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["school", "stop", "home", "custom"]).default("custom").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  radiusMeters: int("radiusMeters").notNull().default(500), // Default 500 meters
  schoolId: int("schoolId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Geofence = typeof geofences.$inferSelect;
export type InsertGeofence = typeof geofences.$inferInsert;

// Geofence events table (tracks when bus enters/exits geofences)
export const geofenceEvents = mysqlTable("geofenceEvents", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  busId: int("busId").notNull(),
  geofenceId: int("geofenceId").notNull(),
  eventType: mysqlEnum("eventType", ["enter", "exit"]).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GeofenceEvent = typeof geofenceEvents.$inferSelect;
export type InsertGeofenceEvent = typeof geofenceEvents.$inferInsert;

// Notifications table
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["bus_approaching", "child_boarded", "child_at_school", "child_at_home", "route_deviation", "alert"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message"),
  relatedBusId: int("relatedBusId"),
  relatedStudentId: int("relatedStudentId"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Alarm settings table (parent preferences for arrival notifications)
export const alarmSettings = mysqlTable("alarmSettings", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parentId").notNull(),
  studentId: int("studentId").notNull(),
  busId: int("busId"),
  alarmTimeMinutes: int("alarmTimeMinutes").notNull().default(5), // 2, 5, or 10 minutes
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AlarmSetting = typeof alarmSettings.$inferSelect;
export type InsertAlarmSetting = typeof alarmSettings.$inferInsert;

// ETA data table (tracks ETA and distance for each GPS location)
export const etaData = mysqlTable("etaData", {
  id: int("id").autoincrement().primaryKey(),
  busId: int("busId").notNull(),
  tripId: int("tripId").notNull(),
  nextStopId: int("nextStopId"),
  distanceToNextStop: decimal("distanceToNextStop", { precision: 10, scale: 2 }), // in meters
  estimatedArrivalTime: timestamp("estimatedArrivalTime"), // ETA timestamp
  currentSpeed: decimal("currentSpeed", { precision: 8, scale: 2 }), // in m/s
  averageSpeed: decimal("averageSpeed", { precision: 8, scale: 2 }), // in m/s
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EtaData = typeof etaData.$inferSelect;
export type InsertEtaData = typeof etaData.$inferInsert;

// Alarm notifications table (tracks triggered alarms)
export const alarmNotifications = mysqlTable("alarmNotifications", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parentId").notNull(),
  studentId: int("studentId").notNull(),
  busId: int("busId").notNull(),
  alarmSettingId: int("alarmSettingId"),
  triggerTime: timestamp("triggerTime").defaultNow().notNull(),
  dismissedAt: timestamp("dismissedAt"),
  openedAt: timestamp("openedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AlarmNotification = typeof alarmNotifications.$inferSelect;
export type InsertAlarmNotification = typeof alarmNotifications.$inferInsert;