// One shared Prisma Client for the whole app.
// Each PrismaClient holds its own pool of database connections, so creating one per
// request would quickly use up the connections PostgreSQL allows.

import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "../config/env.js";
import { PrismaClient } from "../generated/prisma/client.js";

// Prisma 7 connects through a driver adapter: here the `pg` PostgreSQL driver.
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});
