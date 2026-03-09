import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import AlarmSettings from "@/components/AlarmSettings";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Clock, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function ParentDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // Fetch parent's students
  const { data: students, isLoading: studentsLoading } = trpc.students.getByParent.useQuery();
  const { data: notifications } = trpc.notifications.list.useQuery();

  // Get selected student details
  const selectedStudent = students?.find((s) => s.id === parseInt(selectedStudentId));

  // Fetch bus location if student has a school stop
  const { data: busLocation } = trpc.buses.getLocation.useQuery(
    { busId: selectedStudent?.schoolStopId || 0 },
    { enabled: !!selectedStudent?.schoolStopId }
  );

  // Fetch ETA data for the bus
  const { data: etaData } = trpc.eta.getLatest.useQuery(
    { busId: selectedStudent?.schoolStopId || 0 },
    { enabled: !!selectedStudent?.schoolStopId, refetchInterval: 10000 }
  );

  const unreadNotifications = notifications?.filter((n) => !n.read) || [];

  const handleTrackingClick = () => {
    if (selectedStudent?.schoolStopId) {
      navigate(`/tracking/${selectedStudent.schoolStopId}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parent Dashboard</h1>
          <p className="text-gray-600 mt-2">Track your child's school bus in real-time</p>
        </div>

        {unreadNotifications.length > 0 && (
          <Card className="border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">You have {unreadNotifications.length} new notification(s)</p>
                <p className="text-sm text-amber-800 mt-1">
                  {unreadNotifications[0]?.title}
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Your Child</h2>
          {studentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : students && students.length > 0 ? (
            <div className="space-y-4">
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a child to track" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No children registered yet</p>
          )}
        </Card>

        {selectedStudent && (
          <>
            <AlarmSettings studentId={selectedStudent.id} studentName={selectedStudent.name} />

            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Bus Status</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Current Location</p>
                    {busLocation ? (
                      <p className="font-semibold text-gray-900">
                        {busLocation.latitude}, {busLocation.longitude}
                      </p>
                    ) : (
                      <p className="text-gray-500">Tracking in progress...</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <Clock className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Estimated Arrival</p>
                    {etaData && etaData.estimatedArrivalTime ? (
                      <p className="font-semibold text-gray-900">
                        {(() => {
                          const now = new Date();
                          const eta = new Date(etaData.estimatedArrivalTime);
                          const diffMs = eta.getTime() - now.getTime();
                          const diffMins = Math.floor(diffMs / 60000);
                          const diffSecs = Math.floor((diffMs % 60000) / 1000);
                          if (diffMins < 0) return "Arrived";
                          if (diffMins === 0) return `${diffSecs}s`;
                          return `${diffMins}m ${diffSecs}s`;
                        })()}
                      </p>
                    ) : (
                      <p className="font-semibold text-gray-900">Calculating...</p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleTrackingClick}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
                >
                  View Live Map
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
