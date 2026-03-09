import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { MapPin, Clock, Navigation, ChevronLeft, Loader2, AlertTriangle, CheckCircle, MapPinOff } from "lucide-react";
import { MapView } from "@/components/Map";
import AlarmNotification from "@/components/AlarmNotification";

interface MarkerData {
  marker: google.maps.Marker | null;
  lastLat: number;
  lastLng: number;
}

export default function LiveTracking() {
  const { busId } = useParams<{ busId: string }>();
  const [, navigate] = useLocation();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerDataRef = useRef<MarkerData>({
    marker: null,
    lastLat: 0,
    lastLng: 0,
  });
  const [isTracking, setIsTracking] = useState(true);
  const [updateTimestamp, setUpdateTimestamp] = useState<Date | null>(null);
  const [tripId, setTripId] = useState<number | null>(null);
  const [activeAlarm, setActiveAlarm] = useState<any | null>(null);

  const busIdNum = parseInt(busId || "0");

  // Fetch bus location
  const { data: busLocation, refetch } = trpc.buses.getLocation.useQuery(
    { busId: busIdNum },
    { enabled: !!busIdNum, refetchInterval: 10000 } // Update every 10 seconds
  );

  // Fetch bus details
  const { data: bus } = trpc.buses.getById.useQuery(
    { busId: busIdNum },
    { enabled: !!busIdNum }
  );

  // Fetch geofence status
  const { data: geofenceStatus } = trpc.buses.getGeofenceStatus.useQuery(
    { busId: busIdNum },
    { enabled: !!busIdNum, refetchInterval: 10000 }
  );

  // Fetch route status (requires tripId)
  const { data: routeStatus } = trpc.buses.getRouteStatus.useQuery(
    { busId: busIdNum, routeId: 1 }, // routeId would come from trip in production
    { enabled: !!busIdNum && !!tripId, refetchInterval: 10000 }
  );

  // Fetch comprehensive bus status
  const { data: busStatus } = trpc.buses.getStatus.useQuery(
    { busId: busIdNum, tripId: tripId || 0 },
    { enabled: !!busIdNum && !!tripId, refetchInterval: 10000 }
  );

  // Fetch ETA data
  const { data: etaData } = trpc.eta.getETA.useQuery(
    { busId: busIdNum, tripId: tripId || 0 },
    { enabled: !!busIdNum && !!tripId, refetchInterval: 10000 }
  );

  // Check for active alarms
  const { data: activeAlarms } = trpc.alarmNotifications.getActive.useQuery(
    undefined,
    { refetchInterval: 5000 }
  );

  // Auto-refetch location every 10 seconds
  useEffect(() => {
    if (!isTracking) return;

    const interval = setInterval(() => {
      refetch();
    }, 10000);

    return () => clearInterval(interval);
  }, [isTracking, refetch]);

  // Check for active alarms and display the first one
  useEffect(() => {
    if (activeAlarms && activeAlarms.length > 0 && !activeAlarm) {
      setActiveAlarm(activeAlarms[0]);
    }
  }, [activeAlarms, activeAlarm]);

  // Update marker position smoothly when location changes
  useEffect(() => {
    if (!mapRef.current || !busLocation) return;

    const newLat = parseFloat(busLocation.latitude);
    const newLng = parseFloat(busLocation.longitude);

    // Create or update marker
    if (!markerDataRef.current.marker) {
      // Create new marker
      markerDataRef.current.marker = new google.maps.Marker({
        position: { lat: newLat, lng: newLng },
        map: mapRef.current,
        title: bus?.busNumber || "Bus Location",
        icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
      });
    } else {
      // Smoothly animate marker to new position
      const marker = markerDataRef.current.marker;
      const startLat = markerDataRef.current.lastLat || newLat;
      const startLng = markerDataRef.current.lastLng || newLng;
      
      // Animate over 1 second (10 steps of 100ms each)
      const steps = 10;
      let currentStep = 0;
      
      const animateMarker = () => {
        currentStep++;
        const progress = currentStep / steps;
        const lat = startLat + (newLat - startLat) * progress;
        const lng = startLng + (newLng - startLng) * progress;
        
        marker.setPosition({ lat, lng });
        
        if (currentStep < steps) {
          setTimeout(animateMarker, 100);
        }
      };
      
      animateMarker();
    }

    // Update stored coordinates
    markerDataRef.current.lastLat = newLat;
    markerDataRef.current.lastLng = newLng;

    // Update timestamp
    setUpdateTimestamp(new Date());

    // Center map on marker
    mapRef.current.setCenter({ lat: newLat, lng: newLng });
    mapRef.current.setZoom(15);
  }, [busLocation, bus?.busNumber]);

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;

    if (busLocation) {
      const location = {
        lat: parseFloat(busLocation.latitude),
        lng: parseFloat(busLocation.longitude),
      };

      map.setCenter(location);
      map.setZoom(15);

      // Create initial marker
      markerDataRef.current.marker = new google.maps.Marker({
        position: location,
        map: map,
        title: bus?.busNumber || "Bus Location",
        icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
      });

      markerDataRef.current.lastLat = location.lat;
      markerDataRef.current.lastLng = location.lng;
    }
  };

  const calculateETA = () => {
    if (!etaData || !etaData.estimatedArrivalTime) {
      return "Calculating...";
    }
    const now = new Date();
    const eta = new Date(etaData.estimatedArrivalTime);
    const diffMs = eta.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    
    if (diffMins < 0) {
      return "Arrived";
    }
    if (diffMins === 0) {
      return `${diffSecs}s`;
    }
    return `${diffMins}m ${diffSecs}s`;
  };

  const calculateDistance = () => {
    if (!etaData) {
      return "Calculating...";
    }
    const distanceMeters = parseFloat(etaData.distanceToNextStop.toString());
    if (distanceMeters < 1000) {
      return `${Math.round(distanceMeters)}m`;
    }
    return `${(distanceMeters / 1000).toFixed(1)}km`;
  };

  const dismissAlarmMutation = trpc.alarmNotifications.dismiss.useMutation();
  
  const handleDismissAlarm = async () => {
    if (activeAlarm) {
      try {
        await dismissAlarmMutation.mutateAsync({ notificationId: activeAlarm.id });
        setActiveAlarm(null);
      } catch (error) {
        console.error("Error dismissing alarm:", error);
      }
    }
  };

  const getUpdateStatus = () => {
    if (!updateTimestamp) return "Waiting for location...";
    const now = new Date();
    const secondsAgo = Math.floor((now.getTime() - updateTimestamp.getTime()) / 1000);
    if (secondsAgo < 60) {
      return `Updated ${secondsAgo}s ago`;
    }
    return `Updated ${Math.floor(secondsAgo / 60)}m ago`;
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50">
      {/* Alarm Notification */}
      {activeAlarm && (
        <AlarmNotification
          title="Bus Arrival Alert"
          message={activeAlarm.message || "Your child's bus is approaching"}
          nextStopName={etaData?.nextStopName || "Next Stop"}
          timeToArrival={etaData?.timeToArrival || 300}
          distanceToNextStop={etaData?.distanceToNextStop || 0}
          onDismiss={handleDismissAlarm}
        />
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="hover:bg-gray-100"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{bus?.busNumber || "Bus"}</h1>
              <p className="text-sm text-gray-600">Live Tracking</p>
            </div>
          </div>
          <div className={`w-3 h-3 rounded-full ${isTracking ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {busLocation ? (
          <MapView
            initialCenter={{ lat: 40.7128, lng: -74.006 }}
            initialZoom={15}
            onMapReady={handleMapReady}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading bus location...</p>
            </div>
          </div>
        )}
      </div>

      {/* Route Deviation Warning */}
      {busStatus?.hasRouteDeviation && (
        <div className="absolute top-4 right-4 z-20">
          <Card className="border-red-200 bg-red-50 p-4 shadow-lg max-w-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Route Deviation</p>
                <p className="text-sm text-red-800 mt-1">
                  Bus is {Math.round(routeStatus?.distanceFromRoute || 0)}m off route
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Geofence Status */}
      {geofenceStatus && geofenceStatus.insideGeofences.length > 0 && (
        <div className="absolute top-4 left-4 z-20">
          <Card className="border-blue-200 bg-blue-50 p-4 shadow-lg max-w-xs">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">Inside Geofence</p>
                <p className="text-sm text-blue-800 mt-1">
                  {geofenceStatus.insideGeofences[0].name}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Info Panel */}
      <Card className="absolute bottom-4 left-4 right-4 p-4 shadow-lg max-h-72 overflow-y-auto">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-600">Current Location</span>
            </div>
            {busLocation && (
              <span className="text-sm font-mono text-gray-900">
                {busLocation.latitude}, {busLocation.longitude}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">Distance to Next Stop</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{calculateDistance()}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-gray-600">Estimated Arrival</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{calculateETA()}</span>
          </div>

          {/* Geofence Status Details */}
          {geofenceStatus && (
            <>
              {geofenceStatus.insideGeofences.length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Inside Geofences:</p>
                  <div className="space-y-1">
                    {geofenceStatus.insideGeofences.map((gf) => (
                      <div key={gf.id} className="text-xs text-gray-600 flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span>{gf.name} ({Math.round(gf.distance)}m)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {geofenceStatus.nearbyGeofences.length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Nearby Geofences:</p>
                  <div className="space-y-1">
                    {geofenceStatus.nearbyGeofences.slice(0, 2).map((gf) => (
                      <div key={gf.id} className="text-xs text-gray-600 flex items-center gap-2">
                        <MapPinOff className="w-3 h-3 text-amber-600" />
                        <span>{gf.name} ({Math.round(gf.distance)}m away)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Route Status */}
          {routeStatus && (
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Route Status</span>
                <span className={`text-xs font-semibold ${routeStatus.isOnRoute ? 'text-green-600' : 'text-red-600'}`}>
                  {routeStatus.isOnRoute ? 'On Route' : `Off Route (${Math.round(routeStatus.distanceFromRoute)}m)`}
                </span>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-3">
              📡 {getUpdateStatus()}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsTracking(!isTracking)}
                className="flex-1"
                variant={isTracking ? "default" : "outline"}
              >
                {isTracking ? "Tracking Active" : "Tracking Paused"}
              </Button>
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
