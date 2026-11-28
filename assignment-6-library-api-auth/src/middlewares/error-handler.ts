import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { AppError, NotFoundError } from "../errors/app-error.js";

// Every error response has the same shape:
// { "error": { "message": "...", "details"?: [{ "field": "...", "message": "..." }] } }

// Runs when no route matched the request
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Express recognizes an error handler by its 4 parameters, so `_next` must stay
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  // 1. Validation failed (Zod)
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: "Validation failed",
        details: err.issues.map((issue) => ({
          field: issue.path.join(".") || "body",
          message: issue.message,
        })),
      },
    });
    return;
  }

  // 2. Our expected errors (404, 400, ...)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { message: err.message } });
    return;
  }

  // 3. Malformed JSON body: express.json() throws an error with type "entity.parse.failed"
  if (err instanceof SyntaxError && "type" in err && err.type === "entity.parse.failed") {
    res.status(400).json({ error: { message: "Request body is not valid JSON" } });
    return;
  }

  // 4. Anything else is a bug: log it, but do not leak details to the client
  console.error(err);
  res.status(500).json({ error: { message: "Internal server error" } });
}
