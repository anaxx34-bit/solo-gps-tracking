import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock context for testing
function createMockContext(userId: number = 1, userType: "parent" | "driver" | "admin" = "parent"): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `test-user-${userId}`,
      email: `user${userId}@test.com`,
      name: `Test User ${userId}`,
      loginMethod: "test",
      role: userType === "admin" ? "admin" : "user",
      userType,
      schoolId: userType === "admin" ? 1 : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Bus Tracking Procedures", () => {
  describe("buses.list", () => {
    it("should return an empty array or list of buses", async () => {
      const caller = appRouter.createCaller(createMockContext());
      const buses = await caller.buses.list();
      expect(Array.isArray(buses)).toBe(true);
    });
  });

  describe("buses.getById", () => {
    it("should return undefined for non-existent bus", async () => {
      const caller = appRouter.createCaller(createMockContext());
      const bus = await caller.buses.getById({ busId: 99999 });
      expect(bus).toBeUndefined();
    });
  });

  describe("buses.getLocation", () => {
    it("should return undefined for bus with no location data", async () => {
      const caller = appRouter.createCaller(createMockContext());
      const location = await caller.buses.getLocation({ busId: 99999 });
      expect(location).toBeUndefined();
    });
  });

  describe("buses.recordLocation", () => {
    it("should record a GPS location for a bus", async () => {
      const caller = appRouter.createCaller(createMockContext());
      const result = await caller.buses.recordLocation({
        busId: 1,
        latitude: "40.7128",
        longitude: "-74.0060",
        accuracy: 10,
        speed: "25.5",
        heading: "90.0",
      });
      expect(result).toBeDefined();
    });

    it("should handle location updates with minimal data", async () => {
      const caller = appRouter.createCaller(createMockContext());
      const result = await caller.buses.recordLocation({
        busId: 1,
        latitude: "40.7128",
        longitude: "-74.0060",
      });
      expect(result).toBeDefined();
    });
  });
});

describe("Student Procedures", () => {
  describe("students.getByParent", () => {
    it("should require authentication", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      } as any);

      try {
        await caller.students.getByParent();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should return an empty array for parent with no students", async () => {
      const caller = appRouter.createCaller(createMockContext(1, "parent"));
      const students = await caller.students.getByParent();
      expect(Array.isArray(students)).toBe(true);
    });
  });

  describe("students.getById", () => {
    it("should require authentication", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      } as any);

      try {
        await caller.students.getById({ studentId: 1 });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should return undefined for non-existent student", async () => {
      const caller = appRouter.createCaller(createMockContext(1, "parent"));
      const student = await caller.students.getById({ studentId: 99999 });
      expect(student).toBeUndefined();
    });
  });
});

describe("Trip Procedures", () => {
  describe("trips.create", () => {
    it("should require authentication", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      } as any);

      try {
        await caller.trips.create({ busId: 1, routeId: 1 });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should create a trip for authenticated driver", async () => {
      const caller = appRouter.createCaller(createMockContext(1, "driver"));
      const result = await caller.trips.create({ busId: 1, routeId: 1 });
      expect(result).toBeDefined();
    });
  });

  describe("trips.updateStatus", () => {
    it("should require authentication", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      } as any);

      try {
        await caller.trips.updateStatus({ tripId: 1, status: "in_progress" });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should update trip status", async () => {
      const caller = appRouter.createCaller(createMockContext(1, "driver"));
      const result = await caller.trips.updateStatus({ tripId: 1, status: "in_progress" });
      expect(result).toBeDefined();
    });
  });

  describe("trips.getStudents", () => {
    it("should require authentication", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      } as any);

      try {
        await caller.trips.getStudents({ tripId: 1 });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should return an empty array for trip with no students", async () => {
      const caller = appRouter.createCaller(createMockContext(1, "driver"));
      const students = await caller.trips.getStudents({ tripId: 1 });
      expect(Array.isArray(students)).toBe(true);
    });
  });
});

describe("Notification Procedures", () => {
  describe("notifications.list", () => {
    it("should require authentication", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      } as any);

      try {
        await caller.notifications.list();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should return an empty array for user with no notifications", async () => {
      const caller = appRouter.createCaller(createMockContext(1, "parent"));
      const notifications = await caller.notifications.list();
      expect(Array.isArray(notifications)).toBe(true);
    });
  });

  describe("notifications.markAsRead", () => {
    it("should require authentication", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      } as any);

      try {
        await caller.notifications.markAsRead({ notificationId: 1 });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should mark notification as read", async () => {
      const caller = appRouter.createCaller(createMockContext(1, "parent"));
      const result = await caller.notifications.markAsRead({ notificationId: 1 });
      expect(result).toBeDefined();
    });
  });
});
