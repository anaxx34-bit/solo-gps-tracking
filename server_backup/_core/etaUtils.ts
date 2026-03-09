/**
 * ETA Calculation Utilities
 * Provides helper functions for calculating estimated arrival times and distances
 */

import * as db from "../db";

export interface ETAResult {
  nextStopId: number | null;
  nextStopName: string | null;
  distanceToNextStop: number; // in meters
  estimatedArrivalTime: Date | null;
  currentSpeed: number; // in m/s
  averageSpeed: number; // in m/s
  timeToArrival: number; // in seconds
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return db.calculateDistance(lat1, lon1, lat2, lon2);
}

/**
 * Find the next stop on the route based on bus location
 */
export async function getNextStop(
  busLat: number,
  busLon: number,
  routeId: number,
  currentStopIndex: number = 0
): Promise<{ stopId: number; stopName: string; distance: number; index: number } | null> {
  const stops = await db.getStopsByRoute(routeId);

  if (stops.length === 0) {
    return null;
  }

  // Find the next unvisited stop
  for (let i = currentStopIndex; i < stops.length; i++) {
    const stop = stops[i];
    const stopLat = parseFloat(stop.latitude.toString());
    const stopLon = parseFloat(stop.longitude.toString());
    const distance = calculateDistance(busLat, busLon, stopLat, stopLon);

    // If we haven't reached this stop yet (distance > 50m), it's the next stop
    if (distance > 50) {
      return {
        stopId: stop.id,
        stopName: stop.stopName,
        distance,
        index: i,
      };
    }
  }

  // If all stops are within 50m, return the last stop
  if (stops.length > 0) {
    const lastStop = stops[stops.length - 1];
    const stopLat = parseFloat(lastStop.latitude.toString());
    const stopLon = parseFloat(lastStop.longitude.toString());
    const distance = calculateDistance(busLat, busLon, stopLat, stopLon);

    return {
      stopId: lastStop.id,
      stopName: lastStop.stopName,
      distance,
      index: stops.length - 1,
    };
  }

  return null;
}

/**
 * Calculate average speed from recent GPS locations
 */
export async function calculateAverageSpeed(busId: number, windowSeconds: number = 300): Promise<number> {
  const locations = await db.getBusLocationHistory(busId, 50);

  if (locations.length < 2) {
    return 0;
  }

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const recentLocations = locations.filter((loc) => {
    const age = now - loc.createdAt.getTime();
    return age <= windowMs;
  });

  if (recentLocations.length < 2) {
    return 0;
  }

  let totalDistance = 0;
  let totalTime = 0;

  for (let i = 0; i < recentLocations.length - 1; i++) {
    const current = recentLocations[i];
    const next = recentLocations[i + 1];

    const currentLat = parseFloat(current.latitude.toString());
    const currentLon = parseFloat(current.longitude.toString());
    const nextLat = parseFloat(next.latitude.toString());
    const nextLon = parseFloat(next.longitude.toString());

    const distance = calculateDistance(currentLat, currentLon, nextLat, nextLon);
    const timeDiff = (current.createdAt.getTime() - next.createdAt.getTime()) / 1000; // in seconds

    totalDistance += distance;
    totalTime += timeDiff;
  }

  if (totalTime === 0) {
    return 0;
  }

  return totalDistance / totalTime; // m/s
}

/**
 * Calculate ETA for a bus to reach its next stop
 */
export async function calculateETA(
  busId: number,
  tripId: number,
  busLat: number,
  busLon: number,
  currentSpeed: number = 0
): Promise<ETAResult> {
  const trip = await db.getTripById(tripId);

  if (!trip) {
    return {
      nextStopId: null,
      nextStopName: null,
      distanceToNextStop: 0,
      estimatedArrivalTime: null,
      currentSpeed: 0,
      averageSpeed: 0,
      timeToArrival: 0,
    };
  }

  // Get the next stop
  const nextStop = await getNextStop(busLat, busLon, trip.routeId, 0);

  if (!nextStop) {
    return {
      nextStopId: null,
      nextStopName: null,
      distanceToNextStop: 0,
      estimatedArrivalTime: null,
      currentSpeed: currentSpeed,
      averageSpeed: 0,
      timeToArrival: 0,
    };
  }

  // Get average speed if current speed is not provided
  let speed = currentSpeed;
  if (speed === 0) {
    speed = await calculateAverageSpeed(busId, 300); // 5 minute window
  }

  // Use a default speed if we still don't have one (10 m/s = 36 km/h)
  if (speed === 0) {
    speed = 10;
  }

  // Calculate time to arrival in seconds
  const timeToArrival = nextStop.distance / speed;

  // Calculate estimated arrival time
  const estimatedArrivalTime = new Date(Date.now() + timeToArrival * 1000);

  // Get average speed for reference
  const averageSpeed = await calculateAverageSpeed(busId, 300);

  return {
    nextStopId: nextStop.stopId,
    nextStopName: nextStop.stopName,
    distanceToNextStop: nextStop.distance,
    estimatedArrivalTime,
    currentSpeed: speed,
    averageSpeed: averageSpeed || speed,
    timeToArrival,
  };
}

/**
 * Check if ETA has reached the alarm threshold for a parent
 */
export async function shouldTriggerAlarm(
  etaResult: ETAResult,
  alarmTimeMinutes: number
): Promise<boolean> {
  if (!etaResult.estimatedArrivalTime) {
    return false;
  }

  const now = Date.now();
  const etaTime = etaResult.estimatedArrivalTime.getTime();
  const alarmThresholdMs = alarmTimeMinutes * 60 * 1000;

  // Trigger alarm if ETA is within the alarm threshold
  return etaTime - now <= alarmThresholdMs && etaTime - now > 0;
}

/**
 * Format time to arrival as a human-readable string
 */
export function formatTimeToArrival(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (minutes === 0) {
    return `${secs}s`;
  } else if (minutes < 60) {
    return `${minutes}m ${secs}s`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
}

/**
 * Format distance as a human-readable string
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(1)}km`;
  }
}
