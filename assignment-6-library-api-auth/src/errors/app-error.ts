// Base class for expected errors: each one carries its HTTP status code.
// The error-handler middleware turns them into JSON responses.
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

// 404: the requested resource does not exist
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}

// 400: the request itself is invalid (e.g. a non-numeric id)
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

// 401: we do not know who you are (no token, or an invalid/expired one). Log in and try again.
export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(401, message);
  }
}

// 403: we know who you are, but your role is not allowed to do this. Logging in again will not help.
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, message);
  }
}

// 409: the request conflicts with existing data (e.g. an email that is already registered)
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}
