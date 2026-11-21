// Controller layer: translates HTTP <-> service calls.
// It reads the request, calls the service, and chooses the status code.
// Errors thrown here are passed to the error handler automatically (Express 5).

import type { Request, Response } from "express";

import { BadRequestError } from "../errors/app-error.js";
import type { CreateBookInput, UpdateBookInput } from "../schemas/book.schema.js";
import * as bookService from "../services/book.service.js";

type IdParams = { id: string };

// URL params are always strings: "/api/books/abc" must be rejected, not looked up
function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestError(`Invalid book id: "${raw}"`);
  }
  return id;
}

// GET /api/books
export function getAllBooks(_req: Request, res: Response): void {
  res.status(200).json(bookService.getAllBooks());
}

// GET /api/books/:id
export function getBookById(req: Request<IdParams>, res: Response): void {
  const book = bookService.getBookById(parseId(req.params.id));
  res.status(200).json(book);
}

// POST /api/books  (body already validated by the validateBody middleware)
export function createBook(req: Request<object, unknown, CreateBookInput>, res: Response): void {
  const book = bookService.createBook(req.body);
  res.status(201).json(book);
}

// PATCH /api/books/:id  (body already validated)
export function updateBook(req: Request<IdParams, unknown, UpdateBookInput>, res: Response): void {
  const book = bookService.updateBook(parseId(req.params.id), req.body);
  res.status(200).json(book);
}

// DELETE /api/books/:id
export function deleteBook(req: Request<IdParams>, res: Response): void {
  bookService.deleteBook(parseId(req.params.id));
  res.status(204).send(); // 204 No Content: success with an empty body
}
