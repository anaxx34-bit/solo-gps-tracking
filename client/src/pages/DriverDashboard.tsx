import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Square, Users, CheckCircle2, MapPin, AlertCircle, AlertTriangle, MapPinOff, Navigation } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

export default function DriverDashboard() {
  const { user } = useAuth();
  const [activeTrip, setActiveTrip] = useState<number | null>(null);
  const [tripStarted, setTripStarted] = useState(false);
  const [gpsTracking, setGpsTracking] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "tracking" | "error">("idle");
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeBusId, setActiveBusId] = useState<number | null>(null);
  const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const { data: buses, isLoading: busesLoading } = trpc.buses.list.useQuery();
  const startTrip = trpc.trips.start.useMutation();
  const recordLocation = trpc.trips.recordLocation.useMutation();
  const endTrip = trpc.trips.end.useMutation();

  // Fetch geofence status
  const { data: geofenceStatus } = trpc.buses.getGeofenceStatus.useQuery(
    { busId: activeBusId || 0 },
    { enabled: !!activeBusId && tripStarted, refetchInterval: 10000 }
  );

  // Fetch route status
  const { data: routeStatus } = trpc.buses.getRouteStatus.useQuery(
    { busId: activeBusId || 0, routeId: 1 },
    { enabled: !!activeBusId && tripStarted, refetchInterval: 10000 }
  );

  // Fetch comprehensive bus status
  const { data: busStatus } = trpc.buses.getStatus.useQuery(
    { busId: activeBusId || 0, tripId: activeTrip || 0 },
    { enabled: !!activeBusId && !!activeTrip && tripStarted, refetchInterval: 10000 }
  );

  // Request geolocation permission and start tracking
  const requestGeolocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setGpsStatus("error");
      return;
    }

    try {
      setGpsStatus("tracking");
      // Request high accuracy GPS
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy, speed, heading } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          setGpsStatus("tracking");
        },
        (error) => {
          console.error("Geolocation error:", error);
          setGpsStatus("error");
          let errorMsg = "Failed to get location";
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = "Location permission denied";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMsg = "Location unavailable";
          }
          toast.error(errorMsg);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } catch (error) {
      console.error("Geolocation error:", error);
      setGpsStatus("error");
      toast.error("Failed to access geolocation");
    }
  };

  // Stop geolocation tracking
  const stopGeolocation = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsStatus("idle");
    setCurrentLocation(null);
  };

  // Send GPS location to backend every 10 seconds
  useEffect(() => {
    if (!gpsTracking || !currentLocation || !activeTrip || !activeBusId) return;

    const sendLocation = async () => {
      try {
        await recordLocation.mutateAsync({
          tripId: activeTrip,
          busId: activeBusId,
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
        });
      } catch (error) {
        console.error("Failed to record location:", error);
      }
    };

    // Send immediately on first location
    sendLocation();

    // Then send every 10 seconds
    gpsIntervalRef.current = setInterval(sendLocation, 10000);

    return () => {
      if (gpsIntervalRef.current) {
        clearInterval(gpsIntervalRef.current);
      }
    };
  }, [gpsTracking, currentLocation, activeTrip, activeBusId, recordLocation]);

  const handleStartTrip = async (busId: number, routeId: number) => {
    try {
      // Start the trip on backend
      const trip = await startTrip.mutateAsync({ busId, routeId });
      
      if (trip) {
        const tripId = trip.id;
        setActiveTrip(tripId);
        setActiveBusId(busId);
        setTripStarted(true);

        // Request geolocation permission
        await requestGeolocation();
        setGpsTracking(true);

        toast.success("Trip started with GPS tracking");
      }
    } catch (error) {
      console.error("Failed to start trip:", error);
      toast.error("Failed to start trip");
    }
  };

  const handleEndTrip = async () => {
    if (!activeTrip) return;

    try {
      // Stop GPS tracking
      stopGeolocation();
      if (gpsIntervalRef.current) {
        clearInterval(gpsIntervalRef.current);
      }
      setGpsTracking(false);

      // End the trip on backend
      await endTrip.mutateAsync({ tripId: activeTrip });

      setActiveTrip(null);
      setActiveBusId(null);
      setTripStarted(false);
      toast.success("Trip ended successfully");
    } catch (error) {
      console.error("Failed to end trip:", error);
      toast.error("Failed to end trip");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Driver Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your bus route and student pickups</p>
        </div>

        {tripStarted && (
          <Card className="border-green-200 bg-green-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Trip in Progress</p>
                  <p className="text-sm text-green-800">GPS tracking active</p>
                  {currentLocation && (
                    <p className="text-xs text-green-700 mt-1">
                      📍 {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleEndTrip}
                variant="destructive"
                className="gap-2"
                disabled={endTrip.isPending}
              >
                <Square className="w-4 h-4" />
                End Trip
              </Button>
            </div>
          </Card>
        )}

        {/* Route Deviation Warning */}
        {busStatus?.hasRouteDeviation && (
          <Card className="border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">⚠️ Route Deviation Detected</p>
                <p className="text-sm text-red-800 mt-1">
                  Bus is {Math.round(routeStatus?.distanceFromRoute || 0)}m off the assigned route. Please return to route.
                </p>
              </div>
            </div>
          </Card>
        )}

        {gpsStatus === "error" && tripStarted && (
          <Card className="border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">GPS Error</p>
                <p className="text-sm text-red-800">Unable to access location. Check permissions.</p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Your Bus</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {busesLoading ? "-" : buses?.[0]?.busNumber || "N/A"}
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Capacity</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {busesLoading ? "-" : buses?.[0]?.capacity || "N/A"}
                </p>
              </div>
              <Users className="w-12 h-12 text-purple-600 opacity-20" />
            </div>
          </Card>
        </div>

        {tripStarted && gpsTracking && (
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              GPS Tracking Status
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status</span>
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${gpsStatus === "tracking" ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></span>
                  <span className="font-semibold text-gray-900 capitalize">{gpsStatus}</span>
                </span>
              </div>
              {currentLocation && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Latitude</span>
                    <span className="font-mono text-gray-900">{currentLocation.lat.toFixed(6)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Longitude</span>
                    <span className="font-mono text-gray-900">{currentLocation.lng.toFixed(6)}</span>
                  </div>
                </>
              )}
              <p className="text-xs text-gray-600 mt-4">
                📡 Location updates are sent to the backend every 10 seconds
              </p>
            </div>
          </Card>
        )}

        {/* Geofence Status Card */}
        {tripStarted && geofenceStatus && (
          <Card className="p-6 bg-purple-50 border-purple-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              Geofence Status
            </h2>
            <div className="space-y-3">
              {geofenceStatus.insideGeofences.length > 0 ? (
                <>
                  <p className="text-sm font-semibold text-gray-700">Inside Geofences:</p>
                  <div className="space-y-2">
                    {geofenceStatus.insideGeofences.map((gf) => (
                      <div key={gf.id} className="flex items-center gap-2 p-2 bg-white rounded border border-purple-100">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{gf.name}</p>
                          <p className="text-xs text-gray-600">{gf.type} • {Math.round(gf.distance)}m away</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600">Not inside any geofences</p>
              )}

              {geofenceStatus.nearbyGeofences.length > 0 && (
                <>
                  <p className="text-sm font-semibold text-gray-700 mt-4">Nearby Geofences:</p>
                  <div className="space-y-2">
                    {geofenceStatus.nearbyGeofences.slice(0, 2).map((gf) => (
                      <div key={gf.id} className="flex items-center gap-2 p-2 bg-white rounded border border-amber-100">
                        <MapPinOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{gf.name}</p>
                          <p className="text-xs text-gray-600">{gf.type} • {Math.round(gf.distance)}m away</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Route Status Card */}
        {tripStarted && routeStatus && (
          <Card className={`p-6 ${routeStatus.isOnRoute ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Navigation className="w-5 h-5" style={{ color: routeStatus.isOnRoute ? '#16a34a' : '#dc2626' }} />
              Route Status
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status</span>
                <span className={`font-semibold ${routeStatus.isOnRoute ? 'text-green-600' : 'text-red-600'}`}>
                  {routeStatus.isOnRoute ? '✓ On Route' : '✗ Off Route'}
                </span>
              </div>
              {!routeStatus.isOnRoute && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Distance from Route</span>
                  <span className="font-semibold text-red-600">{Math.round(routeStatus.distanceFromRoute)}m</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Nearest Stop</span>
                <span className="font-semibold text-gray-900">Stop #{routeStatus.nearestStopIndex + 1} ({Math.round(routeStatus.nearestStopDistance)}m)</span>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Trip Controls</h2>
          {busesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : buses && buses.length > 0 ? (
            <div className="space-y-4">
              {buses.map((bus) => (
                <div key={bus.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">{bus.busNumber}</p>
                    <p className="text-sm text-gray-600">
                      Status: {bus.status === "in_transit" ? "In Transit" : "Idle"}
                    </p>
                  </div>
                  {!tripStarted && (
                    <Button
                      onClick={() => handleStartTrip(bus.id, 1)}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                      disabled={startTrip.isPending}
                    >
                      <Play className="w-4 h-4" />
                      Start Trip
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No buses assigned</p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Student Pickup List</h2>
          <div className="space-y-3">
            <div className="p-4 border border-gray-200 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">John Smith</p>
                <p className="text-sm text-gray-600">Stop: Main Street</p>
              </div>
              <Button variant="outline" size="sm">
                Mark Picked Up
              </Button>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Sarah Johnson</p>
                <p className="text-sm text-gray-600">Stop: Oak Avenue</p>
              </div>
              <Button variant="outline" size="sm">
                Mark Picked Up
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
