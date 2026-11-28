// Service layer: business logic and data access.
// It knows nothing about HTTP (no req/res), so it can be reused and tested on its own.
//
// Data is stored in PostgreSQL through Prisma, so every function is now async:
// a database call takes time, and the function returns a Promise of the result.

import { prisma } from "../db/prisma.js";
import { NotFoundError } from "../errors/app-error.js";
import { Prisma } from "../generated/prisma/client.js";
import type { Book } from "../models/book.model.js";
import type { CreateBookInput, UpdateBookInput } from "../schemas/book.schema.js";

function notFound(id: number): NotFoundError {
  return new NotFoundError(`Book with id ${id} not found`);
}

// Prisma throws error code P2025 when update/delete finds no row to change
function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

// Sorted by id, so the list keeps the same order as the in-memory version (oldest first)
export async function getAllBooks(): Promise<Book[]> {
  return prisma.book.findMany({ orderBy: { id: "asc" } });
}

export async function getBookById(id: number): Promise<Book> {
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) {
    throw notFound(id);
  }
  return book;
}

// The database generates the id (autoincrement) and the default for `available`
export async function createBook(input: CreateBookInput): Promise<Book> {
  return prisma.book.create({ data: input });
}

// Changes only the fields that were sent. One query: no separate "does it exist?" check,
// which could also be wrong if another request deleted the book in between.
export async function updateBook(id: number, input: UpdateBookInput): Promise<Book> {
  try {
    return await prisma.book.update({ where: { id }, data: input });
  } catch (error) {
    if (isRecordNotFound(error)) {
      throw notFound(id);
    }
    throw error; // anything else is unexpected: the error handler returns 500
  }
}

export async function deleteBook(id: number): Promise<void> {
  try {
    await prisma.book.delete({ where: { id } });
  } catch (error) {
    if (isRecordNotFound(error)) {
      throw notFound(id);
    }
    throw error;
  }
}
