import { describe, it, expect } from "vitest";
import * as etaUtils from "./_core/etaUtils";

describe("ETA Calculation", () => {
  describe("calculateDistance", () => {
    it("should calculate distance between two coordinates", () => {
      // New York to Los Angeles (approximately 3944 km)
      const distance = etaUtils.calculateDistance(40.7128, -74.006, 34.0522, -118.2437);
      expect(distance).toBeGreaterThan(3900000); // in meters
      expect(distance).toBeLessThan(4000000);
    });

    it("should return 0 for same coordinates", () => {
      const distance = etaUtils.calculateDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(distance).toBe(0);
    });

    it("should calculate short distances", () => {
      // Two points 1km apart
      const distance = etaUtils.calculateDistance(40.7128, -74.006, 40.7128, -73.9965);
      expect(distance).toBeGreaterThan(900);
      expect(distance).toBeLessThan(1100);
    });
  });

  describe("formatTimeToArrival", () => {
    it("should format seconds correctly", () => {
      expect(etaUtils.formatTimeToArrival(30)).toBe("30s");
      expect(etaUtils.formatTimeToArrival(60)).toBe("1m 0s");
      expect(etaUtils.formatTimeToArrival(90)).toBe("1m 30s");
      expect(etaUtils.formatTimeToArrival(600)).toBe("10m 0s");
      expect(etaUtils.formatTimeToArrival(3600)).toBe("1h 0m");
      expect(etaUtils.formatTimeToArrival(3660)).toBe("1h 1m");
    });
  });

  describe("formatDistance", () => {
    it("should format distance in meters", () => {
      expect(etaUtils.formatDistance(500)).toBe("500m");
      expect(etaUtils.formatDistance(999)).toBe("999m");
    });

    it("should format distance in kilometers", () => {
      expect(etaUtils.formatDistance(1000)).toBe("1.0km");
      expect(etaUtils.formatDistance(2500)).toBe("2.5km");
      expect(etaUtils.formatDistance(10000)).toBe("10.0km");
    });
  });

  describe("shouldTriggerAlarm", () => {
    it("should trigger alarm when ETA is within threshold", async () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 4 * 60 * 1000); // 4 minutes from now

      const etaResult: etaUtils.ETAResult = {
        nextStopId: 1,
        nextStopName: "Main Street",
        distanceToNextStop: 500,
        estimatedArrivalTime: futureTime,
        currentSpeed: 10,
        averageSpeed: 10,
        timeToArrival: 240,
      };

      const shouldTrigger = await etaUtils.shouldTriggerAlarm(etaResult, 5);
      expect(shouldTrigger).toBe(true);
    });

    it("should not trigger alarm when ETA is beyond threshold", async () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now

      const etaResult: etaUtils.ETAResult = {
        nextStopId: 1,
        nextStopName: "Main Street",
        distanceToNextStop: 1000,
        estimatedArrivalTime: futureTime,
        currentSpeed: 10,
        averageSpeed: 10,
        timeToArrival: 600,
      };

      const shouldTrigger = await etaUtils.shouldTriggerAlarm(etaResult, 5);
      expect(shouldTrigger).toBe(false);
    });

    it("should not trigger alarm when ETA is in the past", async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago

      const etaResult: etaUtils.ETAResult = {
        nextStopId: 1,
        nextStopName: "Main Street",
        distanceToNextStop: 0,
        estimatedArrivalTime: pastTime,
        currentSpeed: 10,
        averageSpeed: 10,
        timeToArrival: -300,
      };

      const shouldTrigger = await etaUtils.shouldTriggerAlarm(etaResult, 5);
      expect(shouldTrigger).toBe(false);
    });

    it("should handle different alarm thresholds", async () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 3 * 60 * 1000); // 3 minutes from now

      const etaResult: etaUtils.ETAResult = {
        nextStopId: 1,
        nextStopName: "Main Street",
        distanceToNextStop: 500,
        estimatedArrivalTime: futureTime,
        currentSpeed: 10,
        averageSpeed: 10,
        timeToArrival: 180,
      };

      // Should trigger for 2, 5, and 10 minute thresholds
      expect(await etaUtils.shouldTriggerAlarm(etaResult, 2)).toBe(true);
      expect(await etaUtils.shouldTriggerAlarm(etaResult, 5)).toBe(true);
      expect(await etaUtils.shouldTriggerAlarm(etaResult, 10)).toBe(true);
    });
  });
});
