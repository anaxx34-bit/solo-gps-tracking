/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

/**
 * SOLO App Types
 */
export type UserRole = "parent" | "driver" | "admin";

export interface BusLocation {
  id: number;
  busId: number;
  latitude: string;
  longitude: string;
  accuracy?: number;
  speed?: string;
  heading?: string;
  createdAt: Date;
}

export interface StudentInfo {
  id: number;
  parentId: number;
  name: string;
  schoolId?: number;
  homeStopId?: number;
  schoolStopId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationInfo {
  id: number;
  userId: number;
  type: "bus_approaching" | "child_boarded" | "child_at_school" | "child_at_home" | "route_deviation" | "alert";
  title: string;
  message?: string;
  relatedBusId?: number;
  relatedStudentId?: number;
  read: boolean;
  createdAt: Date;
}
