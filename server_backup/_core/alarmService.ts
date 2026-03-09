/**
 * Alarm Notification Service
 * Handles push notifications with sound for bus arrival alarms
 */

import * as db from "../db";
import * as etaUtils from "./etaUtils";
import { eq, gte, and } from "drizzle-orm";
import { stops, alarmNotifications } from "../../drizzle/schema";

export interface AlarmTriggerRequest {
  parentId: number;
  studentId: number;
  busId: number;
  alarmSettingId?: number;
  studentName: string;
  nextStopName: string;
  timeToArrival: number; // in seconds
  distance: number; // in meters
}

/**
 * Trigger an alarm notification for a parent
 */
export async function triggerAlarmNotification(request: AlarmTriggerRequest): Promise<boolean> {
  try {
    // Create alarm notification record
    await db.createAlarmNotification({
      parentId: request.parentId,
      studentId: request.studentId,
      busId: request.busId,
      alarmSettingId: request.alarmSettingId,
      triggerTime: new Date(),
    });

    // Format the message
    const formattedTime = etaUtils.formatTimeToArrival(request.timeToArrival);
    const formattedDistance = etaUtils.formatDistance(request.distance);

    const message = `Your child's bus will arrive at ${request.nextStopName} in ${formattedTime} (${formattedDistance} away).`;

    // Create a high-priority notification in the system
    await db.createNotification({
      userId: request.parentId,
      type: "bus_approaching",
      title: `Bus Arrival Alert - ${request.studentName}`,
      message,
      relatedBusId: request.busId,
      relatedStudentId: request.studentId,
    });

    console.log(`[Alarm] Triggered for parent ${request.parentId}: ${message}`);

    return true;
  } catch (error) {
    console.error("[Alarm] Failed to trigger notification:", error);
    return false;
  }
}

/**
 * Check if alarms should be triggered for a specific trip
 */
export async function checkTripAlarms(trip: any): Promise<void> {
  try {
    // Get the bus location
    const location = await db.getLatestBusLocation(trip.busId);
    if (!location) {
      return;
    }

    const latitude = parseFloat(location.latitude);
    const longitude = parseFloat(location.longitude);
    const currentSpeed = location.speed ? parseFloat(location.speed.toString()) : 0;

    // Calculate ETA
    const etaResult = await etaUtils.calculateETA(
      trip.busId,
      trip.id,
      latitude,
      longitude,
      currentSpeed
    );

    if (!etaResult.nextStopId) {
      return;
    }

    // Get students on this trip
    const tripStudents = await db.getTripStudents(trip.id);

    // Get the next stop details
    const dbInstance = await db.getDb();
    if (!dbInstance) {
      return;
    }

    const nextStopResult = await dbInstance
      .select()
      .from(stops)
      .where(eq(stops.id, etaResult.nextStopId))
      .limit(1);

    if (!nextStopResult || nextStopResult.length === 0) {
      return;
    }

    const nextStop = nextStopResult[0];

    // For each student on this trip, check if their parent should be alerted
    for (const tripStudent of tripStudents) {
      if (tripStudent.pickedUp && !tripStudent.droppedOff) {
        // Get student details
        const student = await db.getStudentById(tripStudent.studentId);
        if (!student) {
          continue;
        }

        // Get parent's alarm settings
        const alarmSetting = await db.getAlarmSetting(student.parentId, student.id);
        if (!alarmSetting || !alarmSetting.enabled) {
          continue;
        }

        // Check if alarm should be triggered
        const shouldTrigger = await etaUtils.shouldTriggerAlarm(
          etaResult,
          alarmSetting.alarmTimeMinutes
        );

        if (shouldTrigger) {
          // Check if we already triggered an alarm recently (within 2 minutes)
          const recentAlarms = await dbInstance
            .select()
            .from(alarmNotifications)
            .where(
              and(
                eq(alarmNotifications.parentId, student.parentId),
                eq(alarmNotifications.studentId, student.id),
                eq(alarmNotifications.busId, trip.busId),
                gte(
                  alarmNotifications.triggerTime,
                  new Date(Date.now() - 2 * 60 * 1000)
                )
              )
            )
            .limit(1);

          if (!recentAlarms || recentAlarms.length === 0) {
            // Trigger the alarm
            await triggerAlarmNotification({
              parentId: student.parentId,
              studentId: student.id,
              busId: trip.busId,
              alarmSettingId: alarmSetting.id,
              studentName: student.name,
              nextStopName: nextStop.stopName,
              timeToArrival: etaResult.timeToArrival,
              distance: etaResult.distanceToNextStop,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("[Alarm] Error checking trip alarms:", error);
  }
}

/**
 * Format alarm notification for display
 */
export function formatAlarmNotification(alarm: any): string {
  const timeAgo = Date.now() - alarm.triggerTime.getTime();
  const minutesAgo = Math.floor(timeAgo / 60000);

  if (minutesAgo < 1) {
    return "Just now";
  } else if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  } else {
    const hoursAgo = Math.floor(minutesAgo / 60);
    return `${hoursAgo}h ago`;
  }
}
