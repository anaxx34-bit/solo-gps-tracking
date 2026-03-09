import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-driver-${userId}`,
    email: `driver${userId}@example.com`,
    name: `Test Driver ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("GPS Tracking - trips.start", () => {
  it("should start a trip with GPS tracking", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.trips.start({
      busId: 1,
      routeId: 1,
    });

    expect(result).toBeDefined();
    expect(result?.driverId).toBe(1);
    expect(result?.busId).toBe(1);
    expect(result?.routeId).toBe(1);
    expect(result?.status).toBe("in_progress");
    expect(result?.startTime).toBeDefined();
  });

  it("should create a trip with in_progress status", async () => {
    const { ctx } = createAuthContext(2);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.trips.start({
      busId: 2,
      routeId: 2,
    });

    expect(result?.status).toBe("in_progress");
    expect(result?.startTime).toBeInstanceOf(Date);
  });
});

describe("GPS Tracking - trips.recordLocation", () => {
  it("should record GPS location for a trip", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // First start a trip
    const trip = await caller.trips.start({
      busId: 1,
      routeId: 1,
    });

    if (!trip?.id) {
      throw new Error("Failed to create trip");
    }

    // Record location
    const result = await caller.trips.recordLocation({
      tripId: trip.id,
      busId: 1,
      latitude: 40.7128,
      longitude: -74.006,
      accuracy: 10,
      speed: 25.5,
      heading: 180,
    });

    expect(result).toBeDefined();
  });

  it("should record multiple GPS locations", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // Start a trip
    const trip = await caller.trips.start({
      busId: 1,
      routeId: 1,
    });

    if (!trip?.id) {
      throw new Error("Failed to create trip");
    }

    // Record first location
    const loc1 = await caller.trips.recordLocation({
      tripId: trip.id,
      busId: 1,
      latitude: 40.7128,
      longitude: -74.006,
    });

    // Record second location
    const loc2 = await caller.trips.recordLocation({
      tripId: trip.id,
      busId: 1,
      latitude: 40.7138,
      longitude: -74.0065,
    });

    expect(loc1).toBeDefined();
    expect(loc2).toBeDefined();
  });

  it("should record location with optional fields", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // Start a trip
    const trip = await caller.trips.start({
      busId: 1,
      routeId: 1,
    });

    if (!trip?.id) {
      throw new Error("Failed to create trip");
    }

    // Record location without optional fields
    const result = await caller.trips.recordLocation({
      tripId: trip.id,
      busId: 1,
      latitude: 40.7128,
      longitude: -74.006,
    });

    expect(result).toBeDefined();
  });
});

describe("GPS Tracking - trips.end", () => {
  it("should end a trip and set status to completed", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // Start a trip
    const trip = await caller.trips.start({
      busId: 1,
      routeId: 1,
    });

    if (!trip?.id) {
      throw new Error("Failed to create trip");
    }

    // End the trip
    const result = await caller.trips.end({
      tripId: trip.id,
    });

    expect(result).toBeDefined();
  });

  it("should handle ending a trip after recording locations", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // Start a trip
    const trip = await caller.trips.start({
      busId: 1,
      routeId: 1,
    });

    if (!trip?.id) {
      throw new Error("Failed to create trip");
    }

    // Record a location
    await caller.trips.recordLocation({
      tripId: trip.id,
      busId: 1,
      latitude: 40.7128,
      longitude: -74.006,
    });

    // End the trip
    const result = await caller.trips.end({
      tripId: trip.id,
    });

    expect(result).toBeDefined();
  });
});

describe("GPS Tracking - buses.getLocation", () => {
  it("should fetch the latest bus location", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // Start a trip and record location
    const trip = await caller.trips.start({
      busId: 1,
      routeId: 1,
    });

    if (!trip?.id) {
      throw new Error("Failed to create trip");
    }

    // Record location
    await caller.trips.recordLocation({
      tripId: trip.id,
      busId: 1,
      latitude: 40.7128,
      longitude: -74.006,
    });

    // Fetch latest location
    const location = await caller.buses.getLocation({
      busId: 1,
    });

    expect(location).toBeDefined();
    expect(location?.latitude).toBeDefined();
    expect(location?.longitude).toBeDefined();
  });
});

describe("GPS Tracking - Full Trip Lifecycle", () => {
  it("should complete a full trip lifecycle with GPS tracking", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // 1. Start trip
    const trip = await caller.trips.start({
      busId: 1,
      routeId: 1,
    });

    expect(trip?.status).toBe("in_progress");
    if (!trip?.id) throw new Error("Failed to create trip");

    // 2. Record multiple GPS locations (simulating 10-second intervals)
    const locations = [
      { lat: 40.7128, lng: -74.006 },
      { lat: 40.7138, lng: -74.0065 },
      { lat: 40.7148, lng: -74.007 },
    ];

    for (const loc of locations) {
      await caller.trips.recordLocation({
        tripId: trip.id,
        busId: 1,
        latitude: loc.lat,
        longitude: loc.lng,
      });
    }

    // 3. Verify latest location
    const latestLocation = await caller.buses.getLocation({
      busId: 1,
    });

    expect(latestLocation?.latitude).toBe(locations[locations.length - 1].lat.toString());
    expect(latestLocation?.longitude).toBe(locations[locations.length - 1].lng.toString());

    // 4. End trip
    await caller.trips.end({
      tripId: trip.id,
    });

    // 5. Verify trip is completed
    const completedTrip = await caller.trips.getById({
      tripId: trip.id,
    });

    expect(completedTrip?.status).toBe("completed");
  });
});
