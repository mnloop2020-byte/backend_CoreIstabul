// Shared helpers for the integration tests (auth.test.ts and books.test.ts).
// The tests start the real app on a random port and send real HTTP requests to it.
// Data goes to a separate PostgreSQL test database (from .env.test).

import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { createApp } from "./app.js";
import { hashPassword } from "./auth/password.js";
import { initialBooks } from "./db/initial-books.js";
import { prisma } from "./db/prisma.js";

export type ErrorBody = { error: { message: string; details?: { field: string; message: string }[] } };

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Two accounts created directly in the database before each test file
export const ADMIN = { email: "admin@test.local", password: "admin-password-123" };
export const USER = { email: "user@test.local", password: "user-password-123" };

let server: Server;
let baseUrl: string;

// Starts the app on a free port (0 = let the OS pick one)
export async function startServer(): Promise<void> {
  server = createApp().listen(0);
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://localhost:${port}`;
}

export async function stopServer(): Promise<void> {
  server.close();
  await once(server, "close");
}

// Empties every table and adds the same starting data, so each test file starts the same way
export async function resetDatabase(): Promise<void> {
  // Safety check: this deletes everything, so never run it on the real database
  const databaseName = new URL(process.env.DATABASE_URL ?? "").pathname;
  if (!databaseName.includes("test")) {
    throw new Error(`Refusing to run tests on "${databaseName}": use a test database (npm test loads .env.test).`);
  }

  await prisma.$executeRaw`TRUNCATE TABLE refresh_tokens, users, books RESTART IDENTITY`;
  await prisma.book.createMany({ data: initialBooks });
  await prisma.user.createMany({
    data: [
      { email: ADMIN.email, passwordHash: await hashPassword(ADMIN.password), role: "ADMIN" },
      { email: USER.email, passwordHash: await hashPassword(USER.password), role: "USER" },
    ],
  });
}

// Sends a request. `body` can be an object (sent as JSON) or a raw string.
// `token` is sent as "Authorization: Bearer <token>".
export async function request(
  method: string,
  path: string,
  options: { body?: unknown; token?: string; authorization?: string } = {},
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token !== undefined) headers.Authorization = `Bearer ${options.token}`;
  if (options.authorization !== undefined) headers.Authorization = options.authorization;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body:
      options.body === undefined
        ? undefined
        : typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? (JSON.parse(text) as unknown) : undefined };
}

// Logs in through the API and returns the tokens
export async function login(account: { email: string; password: string }): Promise<TokenPair> {
  const res = await request("POST", "/api/auth/login", { body: account });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${account.email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body as TokenPair;
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
