import { z } from "zod";

// Error when the body is not an object at all (same message as the book schemas)
const bodyError = {
  error: (issue: { code?: string }) =>
    issue.code === "invalid_type" ? "Request body must be a JSON object" : undefined,
};

const requiredString = (field: string) =>
  z.string({
    error: (issue) => (issue.input === undefined ? `${field} is required` : `${field} must be a string`),
  });

// Emails are compared in lowercase, so "Sara@Mail.com" and "sara@mail.com" are one account
const email = requiredString("email")
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "email must be a valid email address" }));

// bcrypt only uses the first 72 bytes of a password, so longer ones are rejected
// instead of being cut silently.
const newPassword = requiredString("password")
  .min(8, { error: "password must be at least 8 characters" })
  .refine((value) => new TextEncoder().encode(value).length <= 72, {
    error: "password must be at most 72 bytes",
  });

// POST /api/auth/register
// strictObject rejects unknown fields, so a client cannot send "role": "ADMIN".
// Every new account is a USER.
export const registerSchema = z.strictObject({ email, password: newPassword }, bodyError);

// POST /api/auth/login
// No length rules here: the login just checks the password against the stored hash.
export const loginSchema = z.strictObject(
  { email, password: requiredString("password").min(1, { error: "password is required" }) },
  bodyError,
);

// POST /api/auth/refresh and POST /api/auth/logout
export const refreshTokenSchema = z.strictObject(
  { refreshToken: requiredString("refreshToken").min(1, { error: "refreshToken is required" }) },
  bodyError,
);

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
