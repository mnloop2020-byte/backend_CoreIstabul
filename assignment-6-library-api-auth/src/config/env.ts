// Reads the settings from environment variables (.env) and checks them once, at startup.
// A missing or weak secret stops the server immediately with a clear message,
// instead of failing later on the first login.

import "dotenv/config"; // loads .env (does not override variables that are already set)

import { z } from "zod";

// "15m", "7d", "3600s": the duration format jsonwebtoken understands
const duration = z.string().regex(/^\d+[smhd]$/, { error: 'must look like "15m", "12h" or "7d"' });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, { error: "is required" }),
  // A short secret can be guessed by brute force, and then anyone can create valid tokens
  JWT_ACCESS_SECRET: z.string().min(32, { error: "must be at least 32 characters" }),
  JWT_REFRESH_SECRET: z.string().min(32, { error: "must be at least 32 characters" }),
  JWT_ACCESS_EXPIRES_IN: duration.default("15m"),
  JWT_REFRESH_EXPIRES_IN: duration.default("7d"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `  ${issue.path.join(".")} ${issue.message}`);
  throw new Error(`Invalid environment variables (see .env.example):\n${problems.join("\n")}`);
}

// Two different secrets: a refresh token can never be accepted as an access token, and the reverse
if (parsed.data.JWT_ACCESS_SECRET === parsed.data.JWT_REFRESH_SECRET) {
  throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.");
}

export const env = parsed.data;
