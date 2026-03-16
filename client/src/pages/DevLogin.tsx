import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Bus, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DevLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"parent" | "driver" | "admin">("parent");

  const devCredentials = {
  parent: { email: "parent@test.com", password: "dev-login" },
  driver: { email: "driver@test.com", password: "dev-login" },
  admin: { email: "admin@test.com", password: "dev-login" },
};

  const handleQuickLogin = async (role: "parent" | "driver" | "admin") => {
    const cred = devCredentials[role];
    setEmail(cred.email);
    setPassword(cred.password);
    setSelectedRole(role);
    await performLogin(cred.email, cred.password);
  };

  const performLogin = async (emailVal: string, passwordVal: string) => {
    if (!emailVal || !passwordVal) {
      toast.error("Please enter email and password");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: emailVal, password: passwordVal }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Login failed");
        return;
      }

      const data = await response.json();
      toast.success(`Logged in as ${data.userType}`);
      
      // Reload to trigger auth check
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 border-b border-blue-200 bg-white/80 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bus className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-blue-900">SOLO</h1>
          </div>
          <p className="text-sm text-gray-600">Development Login</p>
        </div>
      </div>

      <div className="w-full max-w-md mt-20">
        {/* Warning Banner */}
        <Card className="mb-6 border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Development Mode</p>
              <p className="text-sm text-amber-800 mt-1">
                This is a temporary development login system for testing. OAuth is disabled.
              </p>
            </div>
          </div>
        </Card>

        {/* Login Card */}
        <Card className="p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Dev Login</h2>

          {/* Quick Login Buttons */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Quick Login:</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => handleQuickLogin("parent")}
                disabled={isLoading}
                variant={selectedRole === "parent" ? "default" : "outline"}
                className="text-xs"
              >
                {isLoading && selectedRole === "parent" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Parent"
                )}
              </Button>
              <Button
                onClick={() => handleQuickLogin("driver")}
                disabled={isLoading}
                variant={selectedRole === "driver" ? "default" : "outline"}
                className="text-xs"
              >
                {isLoading && selectedRole === "driver" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Driver"
                )}
              </Button>
              <Button
                onClick={() => handleQuickLogin("admin")}
                disabled={isLoading}
                variant={selectedRole === "admin" ? "default" : "outline"}
                className="text-xs"
              >
                {isLoading && selectedRole === "admin" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Admin"
                )}
              </Button>
            </div>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or login manually</span>
            </div>
          </div>

          {/* Manual Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@test.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>

          {/* Credentials Reference */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-3">Test Credentials:</p>
            <div className="space-y-2 text-xs text-gray-600">
              <div>
                <p className="font-medium text-gray-700">Parent</p>
                <p>Email: parent@test.com</p>
                <p>Password: parent123</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Driver</p>
                <p>Email: driver@test.com</p>
                <p>Password: driver123</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Admin</p>
                <p>Email: admin@test.com</p>
                <p>Password: admin123</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
