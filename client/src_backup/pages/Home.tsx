import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { Bus, Users, MapPin, Bell } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  if (isAuthenticated) {
    return null; // Will be redirected by App.tsx
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b border-blue-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bus className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-blue-900">SOLO</h1>
          </div>
          <p className="text-sm text-gray-600">Safety Of Loved Ones</p>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Real-Time School Bus Tracking
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Keep your children safe with live GPS tracking, instant notifications, and complete visibility into school transportation.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href={getLoginUrl()}>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg">
                Get Started
              </Button>
            </a>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/dev-login")}
              className="px-8 py-6 text-lg border-amber-300 text-amber-600 hover:bg-amber-50"
            >
              Dev Login (Testing)
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8 mt-16">
          <Card className="p-6 border-blue-200 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <MapPin className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Live Bus Tracking</h3>
                <p className="text-gray-600">
                  Monitor your child's school bus location in real-time with updates every 10 seconds.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-blue-200 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <Bell className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Notifications</h3>
                <p className="text-gray-600">
                  Receive instant alerts when the bus approaches, your child boards, and arrives at destinations.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-blue-200 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <Users className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">For Everyone</h3>
                <p className="text-gray-600">
                  Designed for parents, school administrators, and bus drivers to work together seamlessly.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-blue-200 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <Bus className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Route Management</h3>
                <p className="text-gray-600">
                  Track routes, manage student pickups/dropoffs, and receive alerts for any deviations.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-12 mt-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
          <p className="text-blue-100 mb-6 max-w-xl mx-auto">
            Sign up now to start tracking your child's school bus and receive real-time updates.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href={getLoginUrl()}>
              <Button size="lg" variant="secondary" className="px-8 py-6 text-lg">
                Sign In / Sign Up
              </Button>
            </a>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/dev-login")}
              className="px-8 py-6 text-lg"
            >
              Dev Login
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2026 SOLO - Safety Of Loved Ones. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
