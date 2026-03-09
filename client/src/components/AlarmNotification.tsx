import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, X, Volume2 } from "lucide-react";

interface AlarmNotificationProps {
  title: string;
  message: string;
  nextStopName: string;
  timeToArrival: number; // in seconds
  distanceToNextStop: number; // in meters
  onDismiss: () => void;
}

export default function AlarmNotification({
  title,
  message,
  nextStopName,
  timeToArrival,
  distanceToNextStop,
  onDismiss,
}: AlarmNotificationProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [remainingTime, setRemainingTime] = useState(timeToArrival);

  // Format distance for display
  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Format time for display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (minutes === 0) {
      return `${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  // Play alarm sound
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Set frequency and duration
      oscillator.frequency.value = 800; // Hz
      oscillator.type = "sine";

      // Fade in
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);

      // Fade out
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      // Repeat every 1.5 seconds
      const interval = setInterval(() => {
        if (isPlaying) {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();

          osc.connect(gain);
          gain.connect(audioContext.destination);

          osc.frequency.value = 800;
          osc.type = "sine";

          gain.gain.setValueAtTime(0, audioContext.currentTime);
          gain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
          gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

          osc.start(audioContext.currentTime);
          osc.stop(audioContext.currentTime + 0.5);
        }
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  // Update countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setIsPlaying(false);
    onDismiss();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-red-50 border-2 border-red-500 shadow-2xl animate-pulse">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500 rounded-lg animate-bounce">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-red-900">{title}</h2>
                <p className="text-sm text-red-700">Bus Arriving Soon</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="text-red-600 hover:bg-red-100"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Message */}
          <p className="text-red-800 mb-4 text-base font-medium">{message}</p>

          {/* Stop and Distance Info */}
          <div className="bg-white rounded-lg p-4 mb-4 border border-red-200">
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-600">Next Stop</p>
                <p className="text-lg font-bold text-gray-900">{nextStopName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Distance</p>
                  <p className="text-base font-semibold text-gray-900">
                    {formatDistance(distanceToNextStop)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Time to Arrival</p>
                  <p className="text-base font-semibold text-gray-900">
                    {formatTime(remainingTime)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sound Control */}
          <div className="flex items-center gap-2 mb-4 p-3 bg-red-100 rounded-lg">
            <Volume2 className={`w-5 h-5 ${isPlaying ? "text-red-600 animate-pulse" : "text-gray-400"}`} />
            <span className="text-sm font-medium text-red-700">
              {isPlaying ? "Alarm is ringing" : "Alarm dismissed"}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isPlaying && (
              <Button
                onClick={() => setIsPlaying(false)}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-100"
              >
                Mute
              </Button>
            )}
            <Button
              onClick={handleDismiss}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Dismiss
            </Button>
          </div>

          {/* Info */}
          <p className="text-xs text-gray-600 text-center mt-4">
            Alarm will continue until dismissed
          </p>
        </div>
      </Card>

      {/* Hidden audio element for fallback */}
      <audio ref={audioRef} />
    </div>
  );
}
