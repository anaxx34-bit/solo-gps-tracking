import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Loader2, Bus, Users, AlertTriangle, CheckCircle2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: buses, isLoading: busesLoading } = trpc.buses.list.useQuery();
  const { data: notifications } = trpc.notifications.list.useQuery();

  const activeAlerts = notifications?.filter((n) => n.type === "route_deviation" && !n.read) || [];
  const geofenceAlerts = notifications?.filter((n) => n.type === "bus_approaching" && !n.read) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">School Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor all buses and student assignments</p>
        </div>

        {/* Route Deviation Alerts */}
        {activeAlerts.length > 0 && (
          <Card className="border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">
                  {activeAlerts.length} route deviation alert(s)
                </p>
                <p className="text-sm text-red-800 mt-1">
                  {activeAlerts[0]?.title}
                </p>
                {activeAlerts.length > 1 && (
                  <p className="text-sm text-red-800">
                    +{activeAlerts.length - 1} more
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Geofence Alerts */}
        {geofenceAlerts.length > 0 && (
          <Card className="border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">
                  {geofenceAlerts.length} geofence event(s)
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  {geofenceAlerts[0]?.title}
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Buses</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {busesLoading ? "-" : buses?.length || 0}
                </p>
              </div>
              <Bus className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Routes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {busesLoading ? "-" : Math.ceil((buses?.length || 0) / 2)}
                </p>
              </div>
              <Users className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">All Buses</h2>
          {busesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : buses && buses.length > 0 ? (
            <div className="space-y-3">
              {buses.map((bus) => {
                // Check if this bus has active route deviation alerts
                const busDeviationAlerts = activeAlerts.filter(
                  (alert) => alert.relatedBusId === bus.id
                );
                const busGeofenceAlerts = geofenceAlerts.filter(
                  (alert) => alert.relatedBusId === bus.id
                );

                return (
                  <div
                    key={bus.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      busDeviationAlerts.length > 0
                        ? "border-red-200 bg-red-50 hover:bg-red-100"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold text-gray-900">{bus.busNumber}</p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            bus.status === "in_transit"
                              ? "bg-blue-100 text-blue-800"
                              : bus.status === "idle"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {bus.status === "in_transit"
                            ? "In Transit"
                            : bus.status === "idle"
                            ? "Idle"
                            : "Completed"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Capacity: {bus.capacity} students
                      </p>

                      {/* Route Deviation Badge */}
                      {busDeviationAlerts.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-semibold text-red-600">
                            Route Deviation
                          </span>
                        </div>
                      )}

                      {/* Geofence Status Badge */}
                      {busGeofenceAlerts.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-600">
                            {busGeofenceAlerts[0]?.title}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No buses registered yet</p>
          )}
        </Card>

        {/* Recent Alerts */}
        {(activeAlerts.length > 0 || geofenceAlerts.length > 0) && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Alerts</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {[...activeAlerts, ...geofenceAlerts]
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )
                .slice(0, 10)
                .map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.type === "route_deviation"
                        ? "border-red-200 bg-red-50"
                        : "border-blue-200 bg-blue-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p
                          className={`font-semibold ${
                            alert.type === "route_deviation"
                              ? "text-red-900"
                              : "text-blue-900"
                          }`}
                        >
                          {alert.title}
                        </p>
                        {alert.message && (
                          <p
                            className={`text-sm mt-1 ${
                              alert.type === "route_deviation"
                                ? "text-red-800"
                                : "text-blue-800"
                            }`}
                          >
                            {alert.message}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 mt-1">
                          {new Date(alert.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      {!alert.read && (
                        <Badge variant="default" className="ml-2">
                          New
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
