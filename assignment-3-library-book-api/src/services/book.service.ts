// Service layer: business logic and data access.
// It knows nothing about HTTP (no req/res), so it can be reused and tested on its own.

import { NotFoundError } from "../errors/app-error.js";
import type { Book } from "../models/book.model.js";
import type { CreateBookInput, UpdateBookInput } from "../schemas/book.schema.js";

// In-memory storage (data resets when the server restarts)
const books: Book[] = [
  { id: 1, title: "Clean Code", author: "Robert C. Martin", genre: "Programming", available: true },
  { id: 2, title: "1984", author: "George Orwell", genre: "Fiction", available: false },
  { id: 3, title: "Sapiens", author: "Yuval Noah Harari", genre: "History", available: true },
];

let nextId = 4;

// Find the stored book or throw a 404 error
function findBookOrThrow(id: number): Book {
  const book = books.find((b) => b.id === id);
  if (!book) {
    throw new NotFoundError(`Book with id ${id} not found`);
  }
  return book;
}

// Returns copies so callers cannot change the stored data by accident
export function getAllBooks(): Book[] {
  return books.map((book) => ({ ...book }));
}

export function getBookById(id: number): Book {
  return { ...findBookOrThrow(id) };
}

export function createBook(input: CreateBookInput): Book {
  const book: Book = { id: nextId++, ...input };
  books.push(book);
  return { ...book };
}

// Changes only the fields that were sent
export function updateBook(id: number, input: UpdateBookInput): Book {
  const book = findBookOrThrow(id);
  Object.assign(book, input);
  return { ...book };
}

export function deleteBook(id: number): void {
  const index = books.findIndex((b) => b.id === id);
  if (index === -1) {
    throw new NotFoundError(`Book with id ${id} not found`);
  }
  books.splice(index, 1);
}
