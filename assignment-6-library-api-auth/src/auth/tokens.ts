// JWT access and refresh tokens.
//
// A JWT is a signed JSON object: anyone can read its content, but only the server (which
// knows the secret) can create a valid signature. If someone edits the content, for example
// changing "role" to "ADMIN", the signature no longer matches and verify() rejects it.
//
// Access token:  short-lived (15m). Sent with every request in the Authorization header.
//                Checked only by its signature and expiry, with no database query.
// Refresh token: long-lived (7d). Sent only to /api/auth/refresh to get a new pair of tokens.
//                Also stored (hashed) in the database, so it can be revoked on logout.
//
// The two use different secrets, so one can never be accepted in place of the other.

import { createHash, randomUUID } from "node:crypto";

import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";

import { env } from "../config/env.js";
import { UnauthorizedError } from "../errors/app-error.js";
import type { Role } from "../generated/prisma/client.js";

// Who is making the request: set on req.user by the authenticate middleware
export interface AuthUser {
  id: number;
  role: Role;
}

// Only HS256 is accepted, so an attacker cannot switch the token to another algorithm (e.g. "none")
const ALGORITHM = "HS256";

// The content (payload) of each token type. `sub` (subject) is the user id, as the JWT standard says.
const accessPayloadSchema = z.object({
  sub: z.string(),
  role: z.enum(["USER", "ADMIN"]),
  type: z.literal("access"),
});

const refreshPayloadSchema = z.object({
  sub: z.string(),
  type: z.literal("refresh"),
  exp: z.number(), // expiry time in seconds since 1970, added by jwt.sign
});

export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ role: user.role, type: "access" }, env.JWT_ACCESS_SECRET, {
    algorithm: ALGORITHM,
    subject: String(user.id),
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

// jwtid (a random id) makes every refresh token unique, even two created in the same second
export function signRefreshToken(userId: number): { token: string; expiresAt: Date } {
  const token = jwt.sign({ type: "refresh" }, env.JWT_REFRESH_SECRET, {
    algorithm: ALGORITHM,
    subject: String(userId),
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
    jwtid: randomUUID(),
  });
  const { exp } = refreshPayloadSchema.parse(jwt.decode(token));
  return { token, expiresAt: new Date(exp * 1000) };
}

// Checks the signature and the expiry, then the payload shape.
// Any problem becomes a 401 with a generic message: the client does not need the details.
function verify<T>(token: string, secret: string, schema: z.ZodType<T>, message: string): T {
  try {
    return schema.parse(jwt.verify(token, secret, { algorithms: [ALGORITHM] }));
  } catch {
    throw new UnauthorizedError(message);
  }
}

export function verifyAccessToken(token: string): AuthUser {
  const payload = verify(token, env.JWT_ACCESS_SECRET, accessPayloadSchema, "Invalid or expired access token");
  return { id: Number(payload.sub), role: payload.role };
}

export function verifyRefreshToken(token: string): { userId: number } {
  const payload = verify(token, env.JWT_REFRESH_SECRET, refreshPayloadSchema, "Invalid or expired refresh token");
  return { userId: Number(payload.sub) };
}

// The database stores only this hash of each refresh token. SHA-256 is enough here (no bcrypt
// needed): the token is a long random value, not a password a person could guess.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
