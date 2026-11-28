// Tests for the book endpoints: role-based permissions, the original API contract
// (the 22 tests from the previous version, now sent as ADMIN), and data persistence.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { initialBooks } from "./db/initial-books.js";
import { prisma } from "./db/prisma.js";
import type { Book } from "./models/book.model.js";
import {
  ADMIN,
  USER,
  disconnect,
  login,
  request,
  resetDatabase,
  startServer,
  stopServer,
  type ErrorBody,
} from "./test-helpers.js";

let adminToken: string;
let userToken: string;

before(async () => {
  await resetDatabase();
  await startServer();
  adminToken = (await login(ADMIN)).accessToken;
  userToken = (await login(USER)).accessToken;
});

after(async () => {
  await stopServer();
  await disconnect();
});

const newBook = { title: "The Pragmatic Programmer", author: "Hunt & Thomas", genre: "Programming" };

// Sends a request as ADMIN (allowed to do everything)
const asAdmin = (method: string, path: string, body?: unknown) =>
  request(method, path, { body, token: adminToken });

// Creates a book as ADMIN and returns it
const createBook = async () => (await asAdmin("POST", "/api/books", newBook)).body as Book;

// The permission table from the assignment:
//   | Action            | ADMIN | USER | Guest |
//   | View books        |  yes  | yes  |  no   |
//   | View book details |  yes  | yes  |  no   |
//   | Add book          |  yes  |  no  |  no   |
//   | Update book       |  yes  |  no  |  no   |
//   | Delete book       |  yes  |  no  |  no   |
describe("Role-based authorization", () => {
  describe("Guest (no token): every book endpoint returns 401", () => {
    const cases: [string, string, unknown?][] = [
      ["GET", "/api/books"],
      ["GET", "/api/books/1"],
      ["POST", "/api/books", newBook],
      ["PATCH", "/api/books/1", { available: false }],
      ["DELETE", "/api/books/1"],
    ];
    for (const [method, path, body] of cases) {
      it(`${method} ${path} -> 401`, async () => {
        const res = await request(method, path, { body });
        assert.equal(res.status, 401);
      });
    }

    it("did not change any data", async () => {
      assert.equal(await prisma.book.count(), initialBooks.length);
      assert.equal((await prisma.book.findUnique({ where: { id: 1 } }))?.available, true);
    });
  });

  describe("USER: can view, cannot add, update or delete", () => {
    it("GET /api/books -> 200", async () => {
      const res = await request("GET", "/api/books", { token: userToken });
      assert.equal(res.status, 200);
    });

    it("GET /api/books/1 -> 200", async () => {
      const res = await request("GET", "/api/books/1", { token: userToken });
      assert.equal(res.status, 200);
    });

    it("POST /api/books -> 403 and no book is created", async () => {
      const before = await prisma.book.count();
      const res = await request("POST", "/api/books", { body: newBook, token: userToken });
      assert.equal(res.status, 403);
      assert.equal((res.body as ErrorBody).error.message, "You do not have permission to perform this action");
      assert.equal(await prisma.book.count(), before);
    });

    it("PATCH /api/books/1 -> 403 and the book is unchanged", async () => {
      const res = await request("PATCH", "/api/books/1", { body: { available: false }, token: userToken });
      assert.equal(res.status, 403);
      assert.equal((await prisma.book.findUnique({ where: { id: 1 } }))?.available, true);
    });

    it("DELETE /api/books/1 -> 403 and the book still exists", async () => {
      const res = await request("DELETE", "/api/books/1", { token: userToken });
      assert.equal(res.status, 403);
      assert.ok(await prisma.book.findUnique({ where: { id: 1 } }));
    });

    it("gets 403 (not 400) even with an invalid body: permission is checked first", async () => {
      const res = await request("POST", "/api/books", { body: {}, token: userToken });
      assert.equal(res.status, 403);
    });
  });

  describe("ADMIN: can do everything", () => {
    it("GET /api/books -> 200", async () => {
      assert.equal((await asAdmin("GET", "/api/books")).status, 200);
    });

    it("GET /api/books/1 -> 200", async () => {
      assert.equal((await asAdmin("GET", "/api/books/1")).status, 200);
    });

    it("POST, PATCH and DELETE -> 201, 200, 204", async () => {
      const created = await asAdmin("POST", "/api/books", newBook);
      assert.equal(created.status, 201);
      const id = (created.body as Book).id;

      assert.equal((await asAdmin("PATCH", `/api/books/${id}`, { available: false })).status, 200);
      assert.equal((await asAdmin("DELETE", `/api/books/${id}`)).status, 204);
    });
  });
});

// The original contract tests from the previous version. They only changed to send an ADMIN token.
describe("GET /api/books", () => {
  it("returns all books from the database, oldest first", async () => {
    const res = await asAdmin("GET", "/api/books");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));

    // The first 3 are the seeded books, in insertion order
    assert.deepEqual(
      (res.body as Book[]).slice(0, 3),
      initialBooks.map((book, index) => ({ id: index + 1, ...book })),
    );
  });
});

describe("GET /api/books/:id", () => {
  it("returns one book", async () => {
    const res = await asAdmin("GET", "/api/books/1");
    assert.equal(res.status, 200);
    assert.equal((res.body as Book).id, 1);
  });

  it("returns 404 for a missing book", async () => {
    const res = await asAdmin("GET", "/api/books/999");
    assert.equal(res.status, 404);
    assert.equal((res.body as ErrorBody).error.message, "Book with id 999 not found");
  });

  it("returns 400 for a non-numeric id", async () => {
    const res = await asAdmin("GET", "/api/books/abc");
    assert.equal(res.status, 400);
  });

  it("returns 400 for an id too large for the database INT column", async () => {
    const res = await asAdmin("GET", "/api/books/2147483648");
    assert.equal(res.status, 400);
  });
});

describe("POST /api/books", () => {
  it("creates a book with available=true by default", async () => {
    const res = await asAdmin("POST", "/api/books", newBook);
    assert.equal(res.status, 201);

    const book = res.body as Book;
    assert.equal(typeof book.id, "number");
    assert.equal(book.title, newBook.title);
    assert.equal(book.available, true);
  });

  it("trims text fields", async () => {
    const res = await asAdmin("POST", "/api/books", { ...newBook, title: "  Spaced  " });
    assert.equal((res.body as Book).title, "Spaced");
  });

  it("returns 400 with details when required fields are missing", async () => {
    const res = await asAdmin("POST", "/api/books", { title: "Only a title" });
    assert.equal(res.status, 400);

    const fields = (res.body as ErrorBody).error.details?.map((d) => d.field);
    assert.deepEqual(fields, ["author", "genre"]);
  });

  it("returns 400 for a wrong type", async () => {
    const res = await asAdmin("POST", "/api/books", { ...newBook, available: "yes" });
    assert.equal(res.status, 400);
  });

  it("returns 400 for unknown fields such as id", async () => {
    const res = await asAdmin("POST", "/api/books", { ...newBook, id: 50 });
    assert.equal(res.status, 400);
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await asAdmin("POST", "/api/books", "{ bad json");
    assert.equal(res.status, 400);
    assert.equal((res.body as ErrorBody).error.message, "Request body is not valid JSON");
  });
});

describe("PATCH /api/books/:id", () => {
  it("updates only the fields sent", async () => {
    const created = await createBook();

    const res = await asAdmin("PATCH", `/api/books/${created.id}`, { available: false });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ...created, available: false });
  });

  it("returns 400 for an empty body", async () => {
    const res = await asAdmin("PATCH", "/api/books/1", {});
    assert.equal(res.status, 400);
  });

  it("returns 400 for an empty title", async () => {
    const res = await asAdmin("PATCH", "/api/books/1", { title: "   " });
    assert.equal(res.status, 400);
  });

  it("returns 404 for a missing book", async () => {
    const res = await asAdmin("PATCH", "/api/books/999", { available: true });
    assert.equal(res.status, 404);
  });
});

describe("DELETE /api/books/:id", () => {
  it("deletes a book and returns 204", async () => {
    const created = await createBook();

    const res = await asAdmin("DELETE", `/api/books/${created.id}`);
    assert.equal(res.status, 204);
    assert.equal(res.body, undefined);

    const after = await asAdmin("GET", `/api/books/${created.id}`);
    assert.equal(after.status, 404);
  });

  it("returns 404 for a missing book", async () => {
    const res = await asAdmin("DELETE", "/api/books/999");
    assert.equal(res.status, 404);
  });
});

// These tests check the database directly with Prisma, not through the API
describe("Data persistence in PostgreSQL", () => {
  it("POST saves the book in the database", async () => {
    const created = await createBook();
    const row = await prisma.book.findUnique({ where: { id: created.id } });
    assert.deepEqual(row, created);
  });

  it("PATCH changes the row in the database", async () => {
    const created = await createBook();
    await asAdmin("PATCH", `/api/books/${created.id}`, { genre: "Software" });
    const row = await prisma.book.findUnique({ where: { id: created.id } });
    assert.equal(row?.genre, "Software");
  });

  it("DELETE removes the row from the database", async () => {
    const created = await createBook();
    await asAdmin("DELETE", `/api/books/${created.id}`);
    const row = await prisma.book.findUnique({ where: { id: created.id } });
    assert.equal(row, null);
  });

  it("keeps the data after the server restarts", async () => {
    const created = await createBook();

    // Stop the server and start a new one. With in-memory storage the book would be gone.
    await stopServer();
    await startServer();

    // The access token is still valid: it is checked by signature, not stored in the server
    const res = await asAdmin("GET", `/api/books/${created.id}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, created);
  });
});

describe("Unknown routes", () => {
  it("returns 404 in the same error format", async () => {
    const res = await request("GET", "/api/unknown");
    assert.equal(res.status, 404);
    assert.equal((res.body as ErrorBody).error.message, "Route not found: GET /api/unknown");
  });
});
