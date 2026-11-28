// Seed: adds the starting books and the first ADMIN account.
// Run with `npm run db:seed` (Prisma runs the command set in prisma.config.ts).
// Safe to run again: it never deletes, duplicates or overwrites data.
//
// Why a seed for the admin: registration always creates a USER (otherwise anyone could
// make themselves an admin), so the first ADMIN has to be created outside the API.

import { hashPassword } from "../src/auth/password.js";
import { initialBooks } from "../src/db/initial-books.js";
import { prisma } from "../src/db/prisma.js";

async function seedBooks(): Promise<void> {
  const existing = await prisma.book.count();
  if (existing > 0) {
    console.log(`Books skipped: the books table already has ${existing} book(s).`);
    return;
  }
  const { count } = await prisma.book.createMany({ data: initialBooks });
  console.log(`Books: added ${count}.`);
}

async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.startsWith("CHANGE_ME") || password.length < 8) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 8 characters) in .env first.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin skipped: ${email} already exists (role ${existing.role}).`);
    return;
  }

  await prisma.user.create({
    data: { email, passwordHash: await hashPassword(password), role: "ADMIN" },
  });
  console.log(`Admin: created ${email}.`);
}

try {
  await seedBooks();
  await seedAdmin();
} finally {
  await prisma.$disconnect();
}
