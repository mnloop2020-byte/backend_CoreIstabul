// Integration tests: start the real app on a random port and send real HTTP requests
// to it. The app stores data in a real PostgreSQL test database (from .env.test).
// Uses only Node built-ins: node:test, node:assert and the global fetch.

import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

import { createApp } from "./app.js";
import { initialBooks } from "./db/initial-books.js";
import { prisma } from "./db/prisma.js";
import type { Book } from "./models/book.model.js";

type ErrorBody = { error: { message: string; details?: { field: string; message: string }[] } };

let server: Server;
let baseUrl: string;

// Starts the app on a free port (0 = let the OS pick one)
async function startServer(): Promise<void> {
  server = createApp().listen(0);
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://localhost:${port}`;
}

async function stopServer(): Promise<void> {
  server.close();
  await once(server, "close");
}

before(async () => {
  // Safety check: the reset below deletes every book, so never run it on the real database.
  const databaseName = new URL(process.env.DATABASE_URL ?? "").pathname;
  if (!databaseName.includes("test")) {
    throw new Error(`Refusing to run tests on "${databaseName}": use a test database (npm test loads .env.test).`);
  }

  // Start every run from the same data: empty table, ids from 1, then the 3 starting books.
  await prisma.$executeRaw`TRUNCATE TABLE books RESTART IDENTITY`;
  await prisma.book.createMany({ data: initialBooks });

  await startServer();
});

after(async () => {
  await stopServer();
  await prisma.$disconnect();
});

// Sends a request; `body` can be an object (sent as JSON) or a raw string
async function request(method: string, path: string, body?: unknown) {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const res = await fetch(`${baseUrl}${path}`, init);
  const text = await res.text();
  return { status: res.status, body: text ? (JSON.parse(text) as unknown) : undefined };
}

const newBook = { title: "The Pragmatic Programmer", author: "Hunt & Thomas", genre: "Programming" };

describe("GET /api/books", () => {
  it("returns all books from the database, oldest first", async () => {
    const res = await request("GET", "/api/books");
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
    const res = await request("GET", "/api/books/1");
    assert.equal(res.status, 200);
    assert.equal((res.body as Book).id, 1);
  });

  it("returns 404 for a missing book", async () => {
    const res = await request("GET", "/api/books/999");
    assert.equal(res.status, 404);
    assert.equal((res.body as ErrorBody).error.message, "Book with id 999 not found");
  });

  it("returns 400 for a non-numeric id", async () => {
    const res = await request("GET", "/api/books/abc");
    assert.equal(res.status, 400);
  });

  it("returns 400 for an id too large for the database INT column", async () => {
    const res = await request("GET", "/api/books/2147483648");
    assert.equal(res.status, 400);
  });
});

describe("POST /api/books", () => {
  it("creates a book with available=true by default", async () => {
    const res = await request("POST", "/api/books", newBook);
    assert.equal(res.status, 201);

    const book = res.body as Book;
    assert.equal(typeof book.id, "number");
    assert.equal(book.title, newBook.title);
    assert.equal(book.available, true);
  });

  it("trims text fields", async () => {
    const res = await request("POST", "/api/books", { ...newBook, title: "  Spaced  " });
    assert.equal((res.body as Book).title, "Spaced");
  });

  it("returns 400 with details when required fields are missing", async () => {
    const res = await request("POST", "/api/books", { title: "Only a title" });
    assert.equal(res.status, 400);

    const fields = (res.body as ErrorBody).error.details?.map((d) => d.field);
    assert.deepEqual(fields, ["author", "genre"]);
  });

  it("returns 400 for a wrong type", async () => {
    const res = await request("POST", "/api/books", { ...newBook, available: "yes" });
    assert.equal(res.status, 400);
  });

  it("returns 400 for unknown fields such as id", async () => {
    const res = await request("POST", "/api/books", { ...newBook, id: 50 });
    assert.equal(res.status, 400);
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await request("POST", "/api/books", "{ bad json");
    assert.equal(res.status, 400);
    assert.equal((res.body as ErrorBody).error.message, "Request body is not valid JSON");
  });
});

describe("PATCH /api/books/:id", () => {
  it("updates only the fields sent", async () => {
    const created = (await request("POST", "/api/books", newBook)).body as Book;

    const res = await request("PATCH", `/api/books/${created.id}`, { available: false });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ...created, available: false });
  });

  it("returns 400 for an empty body", async () => {
    const res = await request("PATCH", "/api/books/1", {});
    assert.equal(res.status, 400);
  });

  it("returns 400 for an empty title", async () => {
    const res = await request("PATCH", "/api/books/1", { title: "   " });
    assert.equal(res.status, 400);
  });

  it("returns 404 for a missing book", async () => {
    const res = await request("PATCH", "/api/books/999", { available: true });
    assert.equal(res.status, 404);
  });
});

describe("DELETE /api/books/:id", () => {
  it("deletes a book and returns 204", async () => {
    const created = (await request("POST", "/api/books", newBook)).body as Book;

    const res = await request("DELETE", `/api/books/${created.id}`);
    assert.equal(res.status, 204);
    assert.equal(res.body, undefined);

    const after = await request("GET", `/api/books/${created.id}`);
    assert.equal(after.status, 404);
  });

  it("returns 404 for a missing book", async () => {
    const res = await request("DELETE", "/api/books/999");
    assert.equal(res.status, 404);
  });
});

// These tests check the database directly with Prisma, not through the API,
// to prove the API really saves data in PostgreSQL (not in memory).
describe("Data persistence in PostgreSQL", () => {
  it("POST saves the book in the database", async () => {
    const created = (await request("POST", "/api/books", newBook)).body as Book;

    const row = await prisma.book.findUnique({ where: { id: created.id } });
    assert.deepEqual(row, created);
  });

  it("PATCH changes the row in the database", async () => {
    const created = (await request("POST", "/api/books", newBook)).body as Book;
    await request("PATCH", `/api/books/${created.id}`, { genre: "Software" });

    const row = await prisma.book.findUnique({ where: { id: created.id } });
    assert.equal(row?.genre, "Software");
  });

  it("DELETE removes the row from the database", async () => {
    const created = (await request("POST", "/api/books", newBook)).body as Book;
    await request("DELETE", `/api/books/${created.id}`);

    const row = await prisma.book.findUnique({ where: { id: created.id } });
    assert.equal(row, null);
  });

  it("keeps the data after the server restarts", async () => {
    const created = (await request("POST", "/api/books", newBook)).body as Book;

    // Stop the server and start a new one. With in-memory storage the book would be gone.
    await stopServer();
    await startServer();

    const res = await request("GET", `/api/books/${created.id}`);
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
