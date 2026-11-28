// Tests for registration, login, the authenticate middleware, refresh tokens and logout.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import jwt from "jsonwebtoken";

import { hashToken } from "./auth/tokens.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import {
  ADMIN,
  USER,
  disconnect,
  login,
  request,
  resetDatabase,
  startServer,
  stopServer,
  type ErrorBody,
  type TokenPair,
} from "./test-helpers.js";

before(async () => {
  await resetDatabase();
  await startServer();
});

after(async () => {
  await stopServer();
  await disconnect();
});

const message = (body: unknown) => (body as ErrorBody).error.message;

describe("POST /api/auth/register", () => {
  const account = { email: "New.Reader@Example.com", password: "a-strong-password" };

  it("creates a USER and never returns the password or its hash", async () => {
    const res = await request("POST", "/api/auth/register", { body: account });
    assert.equal(res.status, 201);

    const user = res.body as Record<string, unknown>;
    assert.equal(user.email, "new.reader@example.com"); // saved in lowercase
    assert.equal(user.role, "USER");
    assert.equal(typeof user.id, "number");
    assert.equal("password" in user, false);
    assert.equal("passwordHash" in user, false);
  });

  it("stores a bcrypt hash in the database, not the plain password", async () => {
    const row = await prisma.user.findUnique({ where: { email: "new.reader@example.com" } });
    assert.ok(row);
    assert.notEqual(row.passwordHash, account.password);
    assert.match(row.passwordHash, /^\$2[aby]\$12\$/); // bcrypt format, cost factor 12
  });

  it("returns 409 for an email that is already registered (any letter case)", async () => {
    const res = await request("POST", "/api/auth/register", {
      body: { ...account, email: "NEW.READER@example.com" },
    });
    assert.equal(res.status, 409);
    assert.equal(message(res.body), "Email is already registered");
  });

  it('rejects "role" in the body, so nobody can register as ADMIN', async () => {
    const res = await request("POST", "/api/auth/register", {
      body: { email: "sneaky@example.com", password: "a-strong-password", role: "ADMIN" },
    });
    assert.equal(res.status, 400);
    assert.equal(await prisma.user.count({ where: { email: "sneaky@example.com" } }), 0);
  });

  it("returns 400 for an invalid email and a short password", async () => {
    const res = await request("POST", "/api/auth/register", { body: { email: "not-an-email", password: "short" } });
    assert.equal(res.status, 400);
    const fields = (res.body as ErrorBody).error.details?.map((d) => d.field);
    assert.deepEqual(fields, ["email", "password"]);
  });

  it("returns 400 for a password longer than bcrypt's 72-byte limit", async () => {
    const res = await request("POST", "/api/auth/register", {
      body: { email: "long@example.com", password: "x".repeat(73) },
    });
    assert.equal(res.status, 400);
  });
});

describe("POST /api/auth/login", () => {
  it("returns an access token, a refresh token and the user", async () => {
    const res = await request("POST", "/api/auth/login", { body: USER });
    assert.equal(res.status, 200);

    const body = res.body as TokenPair & { tokenType: string; user: { email: string; role: string } };
    assert.equal(body.tokenType, "Bearer");
    assert.equal(body.user.email, USER.email);
    assert.equal(body.user.role, "USER");

    // The access token carries the user id and role, and expires in 15 minutes
    const payload = jwt.decode(body.accessToken) as jwt.JwtPayload;
    assert.equal(payload.role, "USER");
    assert.equal(payload.type, "access");
    assert.equal(payload.exp! - payload.iat!, 15 * 60);

    // Only the hash of the refresh token is stored
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(body.refreshToken) } });
    assert.ok(stored);
    assert.equal(stored.revokedAt, null);
  });

  it("returns the same 401 message for a wrong password and an unknown email", async () => {
    const wrongPassword = await request("POST", "/api/auth/login", { body: { ...USER, password: "wrong-password" } });
    const unknownEmail = await request("POST", "/api/auth/login", {
      body: { email: "nobody@test.local", password: "whatever-123" },
    });

    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    // Same message: the response does not reveal which emails are registered
    assert.equal(message(wrongPassword.body), "Invalid email or password");
    assert.equal(message(unknownEmail.body), "Invalid email or password");
  });

  it("returns 400 when fields are missing", async () => {
    const res = await request("POST", "/api/auth/login", { body: {} });
    assert.equal(res.status, 400);
  });
});

describe("Authentication middleware (GET /api/auth/me)", () => {
  it("returns the logged-in user with a valid access token", async () => {
    const { accessToken } = await login(ADMIN);
    const res = await request("GET", "/api/auth/me", { token: accessToken });
    assert.equal(res.status, 200);
    assert.equal((res.body as { email: string }).email, ADMIN.email);
    assert.equal((res.body as { role: string }).role, "ADMIN");
  });

  it("returns 401 without a token", async () => {
    const res = await request("GET", "/api/auth/me");
    assert.equal(res.status, 401);
  });

  it('returns 401 when the header is not "Bearer <token>"', async () => {
    const { accessToken } = await login(USER);
    const res = await request("GET", "/api/auth/me", { authorization: `Basic ${accessToken}` });
    assert.equal(res.status, 401);
  });

  it("returns 401 for a malformed token", async () => {
    const res = await request("GET", "/api/auth/me", { token: "not.a.jwt" });
    assert.equal(res.status, 401);
  });

  it("returns 401 for an expired access token", async () => {
    const expired = jwt.sign(
      { role: "USER", type: "access", exp: Math.floor(Date.now() / 1000) - 60 },
      env.JWT_ACCESS_SECRET,
      { algorithm: "HS256", subject: "2" },
    );
    const res = await request("GET", "/api/auth/me", { token: expired });
    assert.equal(res.status, 401);
    assert.equal(message(res.body), "Invalid or expired access token");
  });

  it("returns 401 for a token signed with a different secret (e.g. a forged ADMIN token)", async () => {
    const forged = jwt.sign({ role: "ADMIN", type: "access" }, "an-attacker-secret-that-is-long-enough", {
      algorithm: "HS256",
      subject: "2",
      expiresIn: "15m",
    });
    const res = await request("GET", "/api/auth/me", { token: forged });
    assert.equal(res.status, 401);
  });

  it("returns 401 when a refresh token is used as an access token", async () => {
    const { refreshToken } = await login(USER);
    const res = await request("GET", "/api/auth/me", { token: refreshToken });
    assert.equal(res.status, 401);
  });
});

describe("POST /api/auth/refresh", () => {
  it("returns a new access token and a new refresh token (rotation)", async () => {
    const first = await login(USER);
    const res = await request("POST", "/api/auth/refresh", { body: { refreshToken: first.refreshToken } });
    assert.equal(res.status, 200);

    const second = res.body as TokenPair;
    assert.notEqual(second.refreshToken, first.refreshToken);

    // The new access token works
    const me = await request("GET", "/api/auth/me", { token: second.accessToken });
    assert.equal(me.status, 200);

    // The old refresh token is now revoked in the database
    const old = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(first.refreshToken) } });
    assert.ok(old?.revokedAt);
  });

  it("rejects an old refresh token and then ends every session of that user (reuse detection)", async () => {
    const first = await login(USER);
    const second = (await request("POST", "/api/auth/refresh", { body: { refreshToken: first.refreshToken } }))
      .body as TokenPair;

    // Someone uses the old token again: a real client never does this, so it may be stolen
    const reuse = await request("POST", "/api/auth/refresh", { body: { refreshToken: first.refreshToken } });
    assert.equal(reuse.status, 401);

    // Now even the newest refresh token is revoked: the user must log in again
    const afterReuse = await request("POST", "/api/auth/refresh", { body: { refreshToken: second.refreshToken } });
    assert.equal(afterReuse.status, 401);
  });

  it("returns 401 for an access token or a random string", async () => {
    const { accessToken } = await login(USER);
    const withAccess = await request("POST", "/api/auth/refresh", { body: { refreshToken: accessToken } });
    const withRandom = await request("POST", "/api/auth/refresh", { body: { refreshToken: "random" } });
    assert.equal(withAccess.status, 401);
    assert.equal(withRandom.status, 401);
  });

  it("returns 400 without a refreshToken field", async () => {
    const res = await request("POST", "/api/auth/refresh", { body: {} });
    assert.equal(res.status, 400);
  });
});

describe("POST /api/auth/logout", () => {
  it("returns 204 and the refresh token cannot be used again", async () => {
    const { refreshToken } = await login(USER);

    const res = await request("POST", "/api/auth/logout", { body: { refreshToken } });
    assert.equal(res.status, 204);

    const refresh = await request("POST", "/api/auth/refresh", { body: { refreshToken } });
    assert.equal(refresh.status, 401);
  });

  it("returns 204 even for an unknown token, so it reveals nothing", async () => {
    const res = await request("POST", "/api/auth/logout", { body: { refreshToken: "unknown" } });
    assert.equal(res.status, 204);
  });
});
