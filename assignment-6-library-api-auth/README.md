# Secure Library API: Authentication and Role-Based Authorization

**Session 7 assignment: Secure Your Library API.**

This extends the Library API from Session 6 ([`assignment-5-library-api-prisma`](../assignment-5-library-api-prisma): Express 5, TypeScript, Zod, Prisma, PostgreSQL) with user accounts, hashed passwords, JWT access and refresh tokens, and `USER` / `ADMIN` roles.

## Summary: How It Works

**Two questions on every protected request:**
1. **Authentication: who are you?** The client sends `Authorization: Bearer <access token>`. The `authenticate` middleware checks the token's signature and expiry, then sets `req.user = { id, role }`. No token, or an invalid one, gives **401 Unauthorized**.
2. **Authorization: are you allowed?** `authorize("ADMIN")` checks `req.user.role`. The wrong role gives **403 Forbidden**. Logging in again will not help, because the role itself is not allowed.

**Permission table (from the assignment):**

| Action | ADMIN | USER | Guest (no token) |
|---|---|---|---|
| View books (`GET /api/books`) | ✓ | ✓ | ✗ 401 |
| View book details (`GET /api/books/:id`) | ✓ | ✓ | ✗ 401 |
| Add book (`POST /api/books`) | ✓ | ✗ 403 | ✗ 401 |
| Update book (`PATCH /api/books/:id`) | ✓ | ✗ 403 | ✗ 401 |
| Delete book (`DELETE /api/books/:id`) | ✓ | ✗ 403 | ✗ 401 |

**Request flow for a protected route:**

```text
Request -> authenticate -> authorize("ADMIN") -> validateBody -> Controller -> Service -> Prisma -> PostgreSQL
              | 401            | 403                 | 400
              +----------------+---------------------+--> errorHandler -> JSON error
```

Permission is checked **before** the body is validated. A USER who sends an invalid book gets 403, not 400, so the API does not reveal its validation rules to someone who is not allowed to write.

**The login flow:**

```text
1. POST /api/auth/register  {email, password}      -> 201 user (always role USER)
2. POST /api/auth/login     {email, password}      -> 200 {accessToken, refreshToken, user}
3. GET  /api/books          Authorization: Bearer <accessToken>
   ... 15 minutes later the access token expires -> 401 ...
4. POST /api/auth/refresh   {refreshToken}         -> 200 NEW accessToken + NEW refreshToken
5. POST /api/auth/logout    {refreshToken}         -> 204, the refresh token stops working
```

**Why two tokens:**
- The **access token** is sent with every request, so it is the token most likely to leak. It lives only **15 minutes**. It is checked by its signature alone, with no database query, so it is fast.
- The **refresh token** is sent only to `/api/auth/refresh`, and lives **7 days**. It is also stored in the database, so the server can revoke it (logout). Without it, the user would have to log in again every 15 minutes.
- The two are signed with **different secrets**, and each has a `type` claim. A refresh token can never be used as an access token, and the reverse.

## Requirements Checklist

| # | Requirement | Where |
|---|---|---|
| 1 | User registration and login | `POST /api/auth/register`, `POST /api/auth/login`: [`src/routes/auth.routes.ts`](src/routes/auth.routes.ts), [`src/services/auth.service.ts`](src/services/auth.service.ts) |
| 2 | Store passwords securely using hashing | bcrypt, cost factor 12: [`src/auth/password.ts`](src/auth/password.ts) |
| 3 | JWT access and refresh tokens | [`src/auth/tokens.ts`](src/auth/tokens.ts), rotation and revocation in [`src/services/auth.service.ts`](src/services/auth.service.ts) |
| 4 | Authentication middleware | `authenticate` in [`src/middlewares/auth.ts`](src/middlewares/auth.ts) |
| 5 | USER and ADMIN roles | `enum Role` in [`prisma/schema.prisma`](prisma/schema.prisma), migration [`add_auth`](prisma/migrations/20261128110546_add_auth/migration.sql) |
| 6 | Protect endpoints with role-based authorization | `authorize("ADMIN")` in [`src/routes/book.routes.ts`](src/routes/book.routes.ts) |
| 7 | Test the authentication and authorization flows | 59 automated tests: [`src/auth.test.ts`](src/auth.test.ts), [`src/books.test.ts`](src/books.test.ts). See [Testing](#testing) |
| 8 | Update the README and Postman collection | This README, and [`postman/library-book-api-auth.postman_collection.json`](postman/library-book-api-auth.postman_collection.json) |

## Auth Endpoints

Base URL: `http://localhost:3000/api/auth`

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/register` | `{ "email", "password" }` | 201 user | 400 validation, 409 email already registered |
| POST | `/login` | `{ "email", "password" }` | 200 tokens + user | 400 validation, 401 invalid email or password |
| POST | `/refresh` | `{ "refreshToken" }` | 200 new tokens + user | 400 validation, 401 invalid, expired, revoked or reused token |
| POST | `/logout` | `{ "refreshToken" }` | 204 (empty body) | 400 validation |
| GET | `/me` | (Bearer token) | 200 current user | 401 |

**Validation (Zod):**
- `email` must be a valid email. It is trimmed and saved in lowercase, so `Sara@Mail.com` and `sara@mail.com` are the same account.
- `password` for register must be 8 to 72 bytes. bcrypt only uses the first 72 bytes, so longer passwords are rejected instead of being cut silently.
- Unknown fields are rejected. In particular, `"role": "ADMIN"` in the register body gives 400: **every new account is a USER**.

### Example: login

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "reader@example.com", "password": "reader-pass-123" }
```

Response `200 OK`:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "Bearer",
  "user": { "id": 2, "email": "reader@example.com", "role": "USER", "createdAt": "2026-11-28T11:10:19.753Z" }
}
```

The access token's payload (readable by anyone, but it cannot be changed without the secret):

```json
{ "role": "USER", "type": "access", "sub": "2", "iat": 1795000000, "exp": 1795000900 }
```

## Book Endpoints

The same as Session 6: same paths, bodies, responses, validation and error messages. The only change is that each request needs a token, as shown in the permission table above.

## Security Decisions

| Decision | Why |
|---|---|
| **bcrypt with cost factor 12** | Hashing is one-way, and bcrypt adds a random salt to each hash, so equal passwords get different hashes. It is slow on purpose: fine for one login, very expensive for millions of guesses after a database leak. |
| **Same message for a wrong password and an unknown email** | `"Invalid email or password"` in both cases, so an attacker cannot find out which emails are registered. |
| **A bcrypt check even when the email does not exist** | Login compares against a dummy hash, so both cases take the same time. Otherwise the response time would show which emails exist. |
| **Registration always creates a USER** | If the client could send `role`, anyone could make themselves an admin. The first ADMIN is created by the seed script from `.env`. |
| **Refresh tokens stored as SHA-256 hashes** | A leaked `refresh_tokens` table cannot be used to log in. SHA-256 is enough here (no bcrypt needed): the token is a long random value, not a password a person could guess. |
| **Refresh token rotation** | Each refresh gives a new refresh token and revokes the old one, so each token works only once. |
| **Reuse detection** | If a revoked refresh token is used again, someone probably has a stolen copy. The server then revokes **every** session of that user, so the attacker's tokens stop working too. |
| **Safe under concurrent refreshes** | The old token is revoked with `UPDATE ... WHERE revoked_at IS NULL`, so if two requests use the same token at once, only one succeeds. |
| **Algorithm pinned to HS256** | `jwt.verify(..., { algorithms: ["HS256"] })` stops an attacker from switching the token to another algorithm, such as `none`. |
| **Secrets checked at startup** | The server refuses to start if a JWT secret is missing, shorter than 32 characters, or if both secrets are the same. See [`src/config/env.ts`](src/config/env.ts). |
| **Secrets only in `.env`** | `.env` and `.env.test` are ignored by Git. The Postman collection has an empty `adminPassword` variable that you fill in locally. |

**Known limits (and why they are acceptable here):**
- **An access token keeps working until it expires, even after logout.** It is checked without a database query, so it cannot be revoked. That is why it lives only 15 minutes.
- **A role change applies at the next refresh**, because the role is inside the access token.
- **No rate limiting on login.** Many guesses are possible, though bcrypt makes each one slow. A production API would add a limiter such as `express-rate-limit`.

## Database Schema

The `add_auth` migration adds two tables and a `Role` enum to the `books` table from Session 6 ([`migration.sql`](prisma/migrations/20261128110546_add_auth/migration.sql)):

```text
users (id, email UNIQUE, password_hash, role DEFAULT 'USER', created_at)
   1
   |
   *
refresh_tokens (id, token_hash UNIQUE, user_id -> users ON DELETE CASCADE, expires_at, revoked_at, created_at)
```

`refresh_tokens.user_id` has its own index, because PostgreSQL does not index foreign keys automatically, and "revoke all sessions of this user" searches by it.

## Project Structure

```text
assignment-6-library-api-auth/
├── prisma/
│   ├── schema.prisma                 # Book, User, RefreshToken, Role
│   ├── migrations/                   # init (books) + add_auth (users, refresh_tokens)
│   └── seed.ts                       # Starting books + the first ADMIN from .env
├── src/
│   ├── config/env.ts                 # Reads and checks environment variables at startup
│   ├── auth/
│   │   ├── password.ts               # bcrypt hash and verify
│   │   └── tokens.ts                 # Sign/verify access and refresh JWTs, hash refresh tokens
│   ├── middlewares/
│   │   ├── auth.ts                   # authenticate (401) and authorize(...roles) (403)
│   │   ├── validate-body.ts          # Unchanged
│   │   └── error-handler.ts          # Unchanged
│   ├── routes/
│   │   ├── auth.routes.ts            # /api/auth/*
│   │   └── book.routes.ts            # /api/books/* with the permission table
│   ├── controllers/auth.controller.ts
│   ├── services/auth.service.ts      # register, login, refresh (rotation), logout
│   ├── schemas/auth.schema.ts        # Zod: register, login, refresh/logout
│   ├── errors/app-error.ts           # + UnauthorizedError 401, ForbiddenError 403, ConflictError 409
│   ├── types/express.d.ts            # Adds req.user to Express's Request type
│   ├── auth.test.ts                  # Auth flow tests
│   ├── books.test.ts                 # Permission table + Session 6 contract tests
│   └── test-helpers.ts               # Test server, database reset, request and login helpers
├── postman/library-book-api-auth.postman_collection.json
├── .env.example / .env.test.example  # Templates (the real files are not committed)
└── README.md
```

## How to Run

Requirements: Node.js 22+ and PostgreSQL (tested on PostgreSQL 18).

1. **Install** (this also generates Prisma Client):

   ```bash
   cd assignment-6-library-api-auth
   npm install
   ```

2. **Configure.** Create two empty databases, `library_auth_db` and `library_auth_test_db` (for example in pgAdmin). Copy the templates:

   ```bash
   cp .env.example .env
   cp .env.test.example .env.test
   ```

   In both files, set your PostgreSQL password and two different JWT secrets. Generate each secret with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

   In `.env`, also set `ADMIN_EMAIL` and `ADMIN_PASSWORD` for the first admin account.

3. **Create the tables, then the starting books and the ADMIN:**

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

4. **Start the API:**

   ```bash
   npm run dev
   ```

   It runs at `http://localhost:3000`.

## npm Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Runs the server from TypeScript with auto-restart (`tsx watch`) |
| `npm run build` | Deletes `dist/` and compiles `src/` to `dist/` |
| `npm start` | Runs the compiled server (`dist/server.js`); run `build` first |
| `npm run typecheck` | Checks types without writing files |
| `npm test` | Applies migrations to the test database, builds, then runs all tests (one file at a time) |
| `npm run db:seed` | Adds the starting books and the ADMIN account if they do not exist |
| `npm run prisma:migrate` | Creates and applies a new migration after a schema change |
| `npm run prisma:generate` | Regenerates Prisma Client (also runs after `npm install`) |
| `npm run prisma:studio` | Opens Prisma Studio to browse the data |

## Testing

### Automated tests

```bash
npm test   # 59 tests, all passing
```

The tests start the real app and send real HTTP requests. They use a separate database (`library_auth_test_db` from `.env.test`), which is emptied and refilled before each test file. They refuse to run if the database name does not contain `test`, so they can never wipe real data.

| File | Tests | What they check |
|---|---|---|
| [`auth.test.ts`](src/auth.test.ts) | 22 | Register (USER role, no hash in the response, bcrypt hash in the database, 409 duplicate in any letter case, `role` rejected, invalid input, the 72-byte limit). Login (both tokens, payload and 15-minute expiry, same 401 message for wrong password and unknown email). The middleware with no token, a wrong scheme, a malformed token, an expired token, a forged token and a refresh token. Refresh (rotation, old token revoked, reuse ends all sessions). Logout (204, then refresh fails) |
| [`books.test.ts`](src/books.test.ts) | 37 | **The full permission table:** Guest gets 401 on all 5 endpoints, USER can view but gets 403 on add, update and delete, ADMIN can do everything. The tests also check the database to show that a refused request changed nothing. Plus the 22 Session 6 contract and persistence tests, now sent as ADMIN |

**Do the tests really catch bugs?** I broke the protection on purpose in the compiled code, ran the tests, then restored it:

| Bug introduced | Result |
|---|---|
| Removed `authorize("ADMIN")` from `POST /api/books` | 2 tests failed |
| Removed `authenticate` from the book routes | 22 tests failed |
| Skipped refresh-token reuse detection | 2 tests failed |
| Original code | 59 passed |

### Manual check on the development database

With a real server and `library_auth_db` after `npm run db:seed`:

| Step | Result |
|---|---|
| Guest `GET /api/books` | 401 |
| Register `reader@example.com` | 201, `"role":"USER"` |
| USER `GET /api/books` | 200 |
| USER `POST /api/books` | 403 `You do not have permission to perform this action` |
| ADMIN `GET /api/auth/me` | 200, `"role":"ADMIN"` |
| ADMIN `POST /api/books` | 201, the book was created |
| `SELECT ... FROM users` in `psql` | `password_hash` starts with `$2b$12$` (bcrypt, cost 12) for both accounts |
| Running the seed a second time | Skipped the books and the admin, with no duplicates |

### Postman

1. Run `npm run db:seed`, then start the server with `npm run dev`.
2. Import [`postman/library-book-api-auth.postman_collection.json`](postman/library-book-api-auth.postman_collection.json).
3. Open the collection's **Variables** tab and set `adminPassword` to the `ADMIN_PASSWORD` from your `.env`. It is empty in the file on purpose.
4. Click **Run**, keeping the default order.

The collection has 37 requests with 49 built-in checks, in 3 folders:
- **1. Auth (15):** register (a new email on every run), 409 duplicate, 400 when sending `role`, 401 wrong password, login, `me`, refresh, reuse of an old refresh token (401, and the newest token is revoked too), logout, refresh after logout (401), then logins that save the tokens for the next folders.
- **2. Authorization (10):** the permission table. Guest gets 401 on every endpoint, and USER gets 200 on view and 403 on add, update and delete.
- **3. Books as ADMIN (12):** the Session 6 requests, unchanged except for the ADMIN token, which is set once on the folder.

## AI Usage

I used **Claude Code** (Anthropic, model Claude Opus 5.5) as an assistant for this assignment.

**What the AI did:**
- Created this folder from the submitted Session 6 version, so that assignment stays unchanged.
- Chose the libraries (`bcryptjs`, `jsonwebtoken`) and explained the security decisions listed above.
- Wrote the schema and the `add_auth` migration, the auth service, the middlewares, the routes, the seed script and the tests.
- Generated random JWT secrets and the ADMIN password straight into my local `.env` files, without showing them.
- Ran the type check and the tests, broke the protections on purpose to show the tests catch it, and checked the full flow and the stored hashes against a real server and database.
- Rebuilt the Postman collection.

**What I did:**
- Gave the AI the assignment requirements.
- Set up my local PostgreSQL 18 and kept all secrets in local `.env` files that are not committed.
- Imported the Postman collection, set the admin password as a local (not shared) variable, and ran the whole collection against the running server: 37 requests, 49 of 49 checks passed, 0 errors.

**Key concepts practiced:**
- Authentication (401: who are you?) vs authorization (403: are you allowed?).
- Hashing (one-way, bcrypt with salt and cost) vs encryption, and why passwords are hashed.
- What a JWT is (signed, not encrypted), why access tokens are short-lived, and why refresh tokens are stored and rotated.
- Not leaking information: generic login errors, equal response time, checking permission before validation.
- Never trusting the client with its own role.

## Author

Mohammed
