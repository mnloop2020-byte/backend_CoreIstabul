import { z } from "zod";

// TypeScript types disappear at runtime, so they cannot check data sent by a client.
// Zod schemas run at runtime: they validate req.body and give us the TypeScript type too.

// A required, non-empty string. Missing -> "is required", wrong type -> "must be a string".
const nonEmptyText = (field: string) =>
  z
    .string({
      error: (issue) =>
        issue.input === undefined ? `${field} is required` : `${field} must be a string`,
    })
    .trim()
    .min(1, { error: `${field} cannot be empty` });

// Error when the body is not an object at all (missing, an array, a number, ...).
// Returning undefined keeps Zod's default message for other issues (e.g. unknown keys).
const bodyError = {
  error: (issue: { code?: string }) =>
    issue.code === "invalid_type" ? "Request body must be a JSON object" : undefined,
};

// POST /api/books
// strictObject rejects unknown fields (e.g. a client trying to send "id").
export const createBookSchema = z.strictObject(
  {
    title: nonEmptyText("title"),
    author: nonEmptyText("author"),
    genre: nonEmptyText("genre"),
    available: z.boolean({ error: "available must be true or false" }).default(true),
  },
  bodyError,
);

// PATCH /api/books/:id
// Same fields, all optional, but at least one must be sent.
export const updateBookSchema = z
  .strictObject(
    {
      title: nonEmptyText("title").optional(),
      author: nonEmptyText("author").optional(),
      genre: nonEmptyText("genre").optional(),
      available: z.boolean({ error: "available must be true or false" }).optional(),
    },
    bodyError,
  )
  .refine((data) => Object.keys(data).length > 0, {
    error: "Send at least one field to update",
  });

// Types inferred from the schemas: one source of truth, no duplication
export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
