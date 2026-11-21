import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

// Reusable middleware: validates req.body against any Zod schema.
// - Valid:   replaces req.body with the parsed data (trimmed, defaults applied) and continues.
// - Invalid: schema.parse throws a ZodError, which the error handler turns into a 400.
export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = schema.parse(req.body);
    next();
  };
}
