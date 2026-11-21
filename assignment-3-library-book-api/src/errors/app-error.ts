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
