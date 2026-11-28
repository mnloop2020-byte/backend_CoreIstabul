// Seed: adds the starting books to an empty database.
// Run with `npm run db:seed` (Prisma runs the command set in prisma.config.ts).
// Safe to run again: it does nothing if the table already has books, so it never
// deletes or duplicates data.

import { initialBooks } from "../src/db/initial-books.js";
import { prisma } from "../src/db/prisma.js";

async function main(): Promise<void> {
  const existing = await prisma.book.count();
  if (existing > 0) {
    console.log(`Seed skipped: the books table already has ${existing} book(s).`);
    return;
  }

  const { count } = await prisma.book.createMany({ data: initialBooks });
  console.log(`Seed done: added ${count} books.`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
