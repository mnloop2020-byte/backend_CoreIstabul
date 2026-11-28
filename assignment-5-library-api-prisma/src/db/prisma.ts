// One shared Prisma Client for the whole app.
// Each PrismaClient holds its own pool of database connections, so creating one per
// request would quickly use up the connections PostgreSQL allows.

import "dotenv/config"; // loads .env into process.env (does not override variables that are already set)

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // Fail at startup with a clear message instead of on the first request
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and set your password.");
}

// Prisma 7 connects through a driver adapter: here the `pg` PostgreSQL driver.
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
