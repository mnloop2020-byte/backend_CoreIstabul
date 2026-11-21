# Library Book Management API

Session 4 assignment: a REST API for managing library books, built with **Express 5**, **TypeScript** and **Zod**. Data is stored in memory.

## Requirements Checklist

| # | Requirement | Where |
|---|---|---|
| 1 | REST API with Express 5 and TypeScript | [`src/app.ts`](src/app.ts), [`src/server.ts`](src/server.ts) |
| 2 | Book model: `id`, `title`, `author`, `genre`, `available` | [`src/models/book.model.ts`](src/models/book.model.ts) |
| 3 | Five CRUD endpoints with in-memory storage | [`src/routes/book.routes.ts`](src/routes/book.routes.ts), [`src/services/book.service.ts`](src/services/book.service.ts) |
| 4 | Routes, Controllers and Services layers | `src/routes/`, `src/controllers/`, `src/services/` |
| 5 | Zod validation for POST and PATCH | [`src/schemas/book.schema.ts`](src/schemas/book.schema.ts), [`src/middlewares/validate-body.ts`](src/middlewares/validate-body.ts) |
| 6 | Error handling, Postman testing, AI usage | [`src/middlewares/error-handler.ts`](src/middlewares/error-handler.ts), [`postman/`](postman/), [AI Usage](#ai-usage) |

## Endpoints

Base URL: `http://localhost:3000/api/books`

| Method | Path | Description | Success | Errors |
|---|---|---|---|---|
| GET | `/api/books` | Get all books | 200 | |
| GET | `/api/books/:id` | Get one book | 200 | 400 invalid id, 404 |
| POST | `/api/books` | Create a book | 201 | 400 validation |
| PATCH | `/api/books/:id` | Update some fields of a book | 200 | 400 validation / invalid id, 404 |
| DELETE | `/api/books/:id` | Delete a book | 204 (empty body) | 400 invalid id, 404 |

### Example: create a book

```http
POST /api/books
Content-Type: application/json

{
  "title": "The Pragmatic Programmer",
  "author": "Andrew Hunt & David Thomas",
  "genre": "Programming"
}
```

Response `201 Created`:

```json
{
  "id": 4,
  "title": "The Pragmatic Programmer",
  "author": "Andrew Hunt & David Thomas",
  "genre": "Programming",
  "available": true
}
```

## Validation Rules (Zod)

| Field | POST | PATCH |
|---|---|---|
| `title`, `author`, `genre` | Required, non-empty string (trimmed) | Optional, non-empty string if sent |
| `available` | Optional boolean, defaults to `true` | Optional boolean |
| Unknown fields (e.g. `id`) | Rejected | Rejected |
| Empty body `{}` | Rejected (fields missing) | Rejected (send at least one field) |

## Error Format

Every error returns the same JSON shape:

```json
{
  "error": {
    "message": "Validation failed",
    "details": [
      { "field": "author", "message": "author is required" },
      { "field": "genre", "message": "genre is required" }
    ]
  }
}
```

| Status | When |
|---|---|
| 400 | Validation failed, invalid id (e.g. `/api/books/abc`) or malformed JSON |
| 404 | Book not found, or unknown route |
| 500 | Unexpected error (details are logged on the server, not sent to the client) |

## Project Structure

```text
assignment-3-library-book-api/
├── src/
│   ├── server.ts                   # Starts the HTTP server
│   ├── app.ts                      # Builds the Express app (middlewares, routes, error handler)
│   ├── app.test.ts                 # Integration tests (node:test + fetch)
│   ├── models/book.model.ts        # Book interface
│   ├── schemas/book.schema.ts      # Zod schemas for POST and PATCH
│   ├── routes/book.routes.ts       # URL + method -> controller
│   ├── controllers/book.controller.ts  # HTTP request/response handling
│   ├── services/book.service.ts    # Business logic + in-memory storage
│   ├── middlewares/
│   │   ├── validate-body.ts        # Validates req.body with a Zod schema
│   │   └── error-handler.ts        # 404 handler + central error handler
│   └── errors/app-error.ts         # AppError, NotFoundError, BadRequestError
├── postman/
│   └── library-book-api.postman_collection.json
├── package.json
├── tsconfig.json
└── README.md
```

**Request flow:** `route` → `validateBody` (POST/PATCH only) → `controller` → `service`. Any error thrown along the way goes to `errorHandler`; Express 5 forwards errors from route handlers automatically.

## How to Run

```bash
cd assignment-3-library-book-api
npm install
npm run dev
```

The server runs at `http://localhost:3000/api/books`. Set the `PORT` environment variable to use a different port.

## npm Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Runs the server from TypeScript with auto-restart on changes (`tsx watch`) |
| `npm run build` | Deletes `dist/` and compiles `src/` to `dist/` |
| `npm start` | Runs the compiled server (`dist/server.js`); run `build` first |
| `npm run typecheck` | Checks types without writing files |
| `npm test` | Builds, then runs the integration tests |

## Testing

### Postman

1. Start the server: `npm run dev`.
2. In Postman, choose **Import** and select `postman/library-book-api.postman_collection.json`.
3. Open the collection and click **Run**, keeping the default order.

The collection has 12 requests with built-in checks:
- **Success cases:** list, create, get, update and delete. "Create book" saves the new id, and the requests after it use that id.
- **Failure cases:** deleted book (404), invalid id (400), missing fields (400), wrong type (400), malformed JSON (400), empty PATCH (400), unknown route (404).

### Automated tests

```bash
npm test   # 17 tests, all passing
```

The tests start the real app on a random port and send HTTP requests to it, covering every endpoint with its success and failure cases.

## AI Usage

I used **Claude Code** (Anthropic, model Claude Opus 5.5) as an assistant for this assignment.

**What the AI did:**
- Proposed the folder structure (routes / controllers / services) and the npm scripts.
- Wrote the first version of the Zod schemas, middlewares, endpoints, Postman collection and tests.
- Ran the type check and tests, and checked the error messages with real requests.

**What I did:**
- Reviewed and understood every file before submitting.
- Imported the collection into Postman and ran it against the running server.

**Key concepts practiced:**
- Separating Routes, Controllers and Services, and what each layer is responsible for.
- TypeScript types do not exist at runtime, so Zod validates the request body and `z.infer` produces the matching type.
- Express 5 passes errors thrown in route handlers to the error handler automatically.
- Choosing the right HTTP status codes: 200, 201, 204, 400, 404 and 500.

## Author

Mohammed
