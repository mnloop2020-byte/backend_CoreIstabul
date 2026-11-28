// Controller layer: translates HTTP <-> service calls.
// It reads the request, calls the service, and chooses the status code.
// The service talks to the database, so every handler is async and awaits it.
// Express 5 passes errors from async handlers (rejected Promises) to the error handler automatically.

import type { Request, Response } from "express";

import { BadRequestError } from "../errors/app-error.js";
import type { CreateBookInput, UpdateBookInput } from "../schemas/book.schema.js";
import * as bookService from "../services/book.service.js";

type IdParams = { id: string };

// Largest value a PostgreSQL INT column (the books.id type) can hold.
// A bigger id would make the database query fail with a 500 instead of a clear 400.
const MAX_ID = 2_147_483_647;

// URL params are always strings: "/api/books/abc" must be rejected, not looked up
function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0 || id > MAX_ID) {
    throw new BadRequestError(`Invalid book id: "${raw}"`);
  }
  return id;
}

// GET /api/books
export async function getAllBooks(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await bookService.getAllBooks());
}

// GET /api/books/:id
export async function getBookById(req: Request<IdParams>, res: Response): Promise<void> {
  const book = await bookService.getBookById(parseId(req.params.id));
  res.status(200).json(book);
}

// POST /api/books  (body already validated by the validateBody middleware)
export async function createBook(
  req: Request<object, unknown, CreateBookInput>,
  res: Response,
): Promise<void> {
  const book = await bookService.createBook(req.body);
  res.status(201).json(book);
}

// PATCH /api/books/:id  (body already validated)
export async function updateBook(
  req: Request<IdParams, unknown, UpdateBookInput>,
  res: Response,
): Promise<void> {
  const book = await bookService.updateBook(parseId(req.params.id), req.body);
  res.status(200).json(book);
}

// DELETE /api/books/:id
export async function deleteBook(req: Request<IdParams>, res: Response): Promise<void> {
  await bookService.deleteBook(parseId(req.params.id));
  res.status(204).send(); // 204 No Content: success with an empty body
}
