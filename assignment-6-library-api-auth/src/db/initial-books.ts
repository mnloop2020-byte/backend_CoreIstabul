import type { CreateBookInput } from "../schemas/book.schema.js";

// The 3 books the in-memory version started with.
// Used by the seed script (prisma/seed.ts) and by the tests.
export const initialBooks: CreateBookInput[] = [
  { title: "Clean Code", author: "Robert C. Martin", genre: "Programming", available: true },
  { title: "1984", author: "George Orwell", genre: "Fiction", available: false },
  { title: "Sapiens", author: "Yuval Noah Harari", genre: "History", available: true },
];
