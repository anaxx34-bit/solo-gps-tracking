import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface AlarmSettingsProps {
  studentId: number;
  studentName: string;
}

export default function AlarmSettings({ studentId, studentName }: AlarmSettingsProps) {
  const [selectedTime, setSelectedTime] = useState<string>("5");
  const [isSaving, setIsSaving] = useState(false);
  const [savedTime, setSavedTime] = useState<number | null>(null);

  // Fetch current alarm settings
  const { data: alarmSetting } = trpc.alarmSettings.get.useQuery(
    { studentId },
    { enabled: !!studentId }
  );

  // Update mutation
  const updateAlarmMutation = trpc.alarmSettings.update.useMutation();

  // Initialize with saved settings
  useEffect(() => {
    if (alarmSetting) {
      setSelectedTime(alarmSetting.alarmTimeMinutes.toString());
      setSavedTime(alarmSetting.alarmTimeMinutes);
    }
  }, [alarmSetting]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateAlarmMutation.mutateAsync({
        studentId,
        alarmTimeMinutes: selectedTime as "2" | "5" | "10",
        enabled: true,
      });
      setSavedTime(parseInt(selectedTime));
      toast.success(`Alarm set to ${selectedTime} minutes before arrival`);
    } catch (error) {
      toast.error("Failed to save alarm settings");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanged = parseInt(selectedTime) !== savedTime;

  return (
    <Card className="p-6 border-blue-100 bg-gradient-to-br from-blue-50 to-blue-25">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-100 rounded-lg">
          <Bell className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Arrival Notification Settings
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Get notified when {studentName}'s bus is approaching their stop
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alert me this many minutes before arrival:
              </label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 minutes</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              {savedTime !== null && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Currently set to {savedTime} minutes</span>
                </div>
              )}
            </div>

            <Button
              onClick={handleSave}
              disabled={!hasChanged || isSaving}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>

          <div className="mt-4 p-3 bg-blue-100 rounded-lg flex gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              You will receive a notification with sound and vibration when the bus is approaching.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
