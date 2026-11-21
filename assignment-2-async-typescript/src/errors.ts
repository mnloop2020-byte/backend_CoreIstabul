// Custom error classes let callers tell failure types apart with `instanceof`.

// The requested record does not exist (like HTTP 404)
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

// The input data is invalid (like HTTP 400)
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
