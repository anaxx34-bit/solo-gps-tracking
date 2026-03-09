/**
 * Development Login System
 * Temporary authentication bypass for testing without OAuth
 * Allows login with email/password and role selection
 */

import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

// Development test credentials
const DEV_CREDENTIALS = {
  parent: {
    email: "parent@test.com",
    password: "parent123",
    name: "Test Parent",
    userType: "parent" as const,
  },
  driver: {
    email: "driver@test.com",
    password: "driver123",
    name: "Test Driver",
    userType: "driver" as const,
  },
  admin: {
    email: "admin@test.com",
    password: "admin123",
    name: "Test Admin",
    userType: "admin" as const,
  },
};

export function registerDevLoginRoutes(app: Express) {
  // Dev login endpoint
  app.post("/api/dev-login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      // Find matching credential
      let credentialKey: keyof typeof DEV_CREDENTIALS | null = null;
      for (const key of Object.keys(DEV_CREDENTIALS) as Array<keyof typeof DEV_CREDENTIALS>) {
        const cred = DEV_CREDENTIALS[key];
        if (cred.email === email && cred.password === password) {
          credentialKey = key;
          break;
        }
      }

      if (!credentialKey) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const credential = DEV_CREDENTIALS[credentialKey];
      const openId = `dev-${credentialKey}-${Date.now()}`;

      // Create or update user in database
      await db.upsertUser({
        openId,
        name: credential.name,
        email: credential.email,
        loginMethod: "dev-login",
        role: credentialKey === "admin" ? "admin" : "user",
        userType: credential.userType,
        lastSignedIn: new Date(),
      });

      // Create session token
      const sessionToken = await sdk.createSessionToken(openId, {
        name: credential.name,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        message: `Logged in as ${credential.userType}`,
        userType: credential.userType,
      });
    } catch (error) {
      console.error("[Dev Login] Error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Get available dev credentials (for UI)
  app.get("/api/dev-credentials", (req: Request, res: Response) => {
    const credentials = Object.entries(DEV_CREDENTIALS).map(([key, cred]) => ({
      role: key,
      email: cred.email,
      password: cred.password,
      userType: cred.userType,
    }));
    res.json(credentials);
  });
}
