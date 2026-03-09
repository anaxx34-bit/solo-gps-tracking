/**
 * Geofence and Route Deviation Utilities
 * Provides helper functions for checking bus status relative to geofences and routes
 */

import * as db from "../db";

export interface GeofenceStatus {
  insideGeofences: Array<{
    id: number;
    name: string;
    type: string;
    distance: number;
  }>;
  nearbyGeofences: Array<{
    id: number;
    name: string;
    type: string;
    distance: number;
  }>;
}

export interface RouteStatus {
  isOnRoute: boolean;
  distanceFromRoute: number;
  nearestStopIndex: number;
  nearestStopDistance: number;
}

/**
 * Get geofence status for a bus at a specific location
 */
export async function getGeofenceStatus(
  latitude: number,
  longitude: number
): Promise<GeofenceStatus> {
  const allGeofences = await db.getAllGeofences();
  const insideGeofences: GeofenceStatus["insideGeofences"] = [];
  const nearbyGeofences: GeofenceStatus["nearbyGeofences"] = [];

  for (const geofence of allGeofences) {
    const distance = db.calculateDistance(
      latitude,
      longitude,
      parseFloat(geofence.latitude.toString()),
      parseFloat(geofence.longitude.toString())
    );

    if (distance <= geofence.radiusMeters) {
      insideGeofences.push({
        id: geofence.id,
        name: geofence.name,
        type: geofence.type,
        distance,
      });
    } else if (distance <= geofence.radiusMeters + 500) {
      // Nearby if within 500m of boundary
      nearbyGeofences.push({
        id: geofence.id,
        name: geofence.name,
        type: geofence.type,
        distance: distance - geofence.radiusMeters,
      });
    }
  }

  return {
    insideGeofences: insideGeofences.sort((a, b) => a.distance - b.distance),
    nearbyGeofences: nearbyGeofences.sort((a, b) => a.distance - b.distance),
  };
}

/**
 * Get route status for a bus at a specific location
 */
export async function getRouteStatus(
  latitude: number,
  longitude: number,
  routeId: number
): Promise<RouteStatus> {
  const stops = await db.getStopsByRoute(routeId);

  if (stops.length < 2) {
    return {
      isOnRoute: true,
      distanceFromRoute: 0,
      nearestStopIndex: 0,
      nearestStopDistance: 0,
    };
  }

  const { isInCorridor, distanceFromRoute } = db.isPointInRouteCorridor(
    latitude,
    longitude,
    stops,
    200 // 200 meters corridor width
  );

  // Find nearest stop
  let nearestStopIndex = 0;
  let nearestStopDistance = Infinity;

  for (let i = 0; i < stops.length; i++) {
    const stopLat = parseFloat(stops[i].latitude.toString());
    const stopLng = parseFloat(stops[i].longitude.toString());
    const distance = db.calculateDistance(latitude, longitude, stopLat, stopLng);

    if (distance < nearestStopDistance) {
      nearestStopDistance = distance;
      nearestStopIndex = i;
    }
  }

  return {
    isOnRoute: isInCorridor,
    distanceFromRoute,
    nearestStopIndex,
    nearestStopDistance,
  };
}

/**
 * Get comprehensive status for a bus
 */
export async function getBusStatus(
  busId: number,
  tripId: number
): Promise<{
  geofenceStatus: GeofenceStatus;
  routeStatus: RouteStatus | null;
  hasRouteDeviation: boolean;
}> {
  // Get current location
  const location = await db.getLatestBusLocation(busId);
  if (!location) {
    return {
      geofenceStatus: { insideGeofences: [], nearbyGeofences: [] },
      routeStatus: null,
      hasRouteDeviation: false,
    };
  }

  const latitude = parseFloat(location.latitude);
  const longitude = parseFloat(location.longitude);

  // Get geofence status
  const geofenceStatus = await getGeofenceStatus(latitude, longitude);

  // Get route status
  const trip = await db.getTripById(tripId);
  let routeStatus: RouteStatus | null = null;
  let hasRouteDeviation = false;

  if (trip) {
    routeStatus = await getRouteStatus(latitude, longitude, trip.routeId);
    hasRouteDeviation = !routeStatus.isOnRoute && routeStatus.distanceFromRoute > 200;
  }

  return {
    geofenceStatus,
    routeStatus,
    hasRouteDeviation,
  };
}
