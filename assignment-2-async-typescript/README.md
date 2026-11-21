# Async Task Management Backend with TypeScript

Session 2 assignment: a Node.js backend for users and tasks, written in TypeScript with ES Modules (ESM). Every operation is asynchronous (Promises / async-await) and handles both success and failure cases.

## Requirements Checklist

| # | Requirement | Where |
|---|---|---|
| 1 | Node.js backend with TypeScript and ESM | `"type": "module"` in `package.json`, `"module": "NodeNext"` in `tsconfig.json` |
| 2 | `Task` and `User` interfaces | [`src/types.ts`](src/types.ts) |
| 3 | Async task operations with Promises / async-await | [`src/modules/tasks/task.service.ts`](src/modules/tasks/task.service.ts), [`src/modules/users/user.service.ts`](src/modules/users/user.service.ts) |
| 4 | Success and failure handling | Custom errors in [`src/errors.ts`](src/errors.ts), `try/catch` and `Promise.allSettled` in [`src/index.ts`](src/index.ts) |
| 5 | Strict mode and npm scripts | `"strict": true` in `tsconfig.json`, scripts below |
| 6 | Verification and AI usage | Tests (`npm test`) and the [AI Usage](#ai-usage) section |

## Features

### Users
- `getUsers()`: get all users.
- `getUserById(id)`: get one user. Fails with `NotFoundError` if it does not exist.
- `createUser({ name, email })`: create a user. Fails with `ValidationError` for an empty name, an invalid email or a duplicate email.

### Tasks
- `getTasks()`: get all tasks.
- `getTaskById(id)`: get one task. Fails with `NotFoundError` if it does not exist.
- `getTasksByUser(userId)`: get a user's tasks. Fails if the user does not exist.
- `createTask({ title, description, userId })`: create a task. Fails if the title is empty or the user does not exist.
- `updateTask(id, updates)`: update only the fields sent.
- `deleteTask(id)`: delete a task and return it.

Each operation waits a short time (`delay()`) to simulate a real database call.

## Technologies

- Node.js 22+
- TypeScript 7 (strict mode)
- ES Modules (ESM)
- `node:test` for tests (built into Node, no extra package)

Data is stored in memory and is lost when the app restarts.

## Project Structure

```text
assignment-2-async-typescript/
├── src/
│   ├── index.ts                  # Demo: success, failure, Promise.all, Promise.allSettled
│   ├── types.ts                  # User, Task and input types
│   ├── errors.ts                 # NotFoundError, ValidationError
│   ├── utils/
│   │   └── delay.ts              # Simulated database latency
│   └── modules/
│       ├── users/
│       │   ├── user.service.ts
│       │   └── user.service.test.ts
│       └── tasks/
│           ├── task.service.ts
│           └── task.service.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

## How to Run

```bash
cd assignment-2-async-typescript
npm install
npm run dev
```

## npm Scripts

| Script | What it does |
|---|---|
| `npm run build` | Deletes `dist/` and compiles `src/` to `dist/` |
| `npm run typecheck` | Checks types without writing files |
| `npm start` | Runs the compiled app (`dist/index.js`); run `build` first |
| `npm run dev` | Builds, then runs the app |
| `npm test` | Builds, then runs all tests |
| `npm run clean` | Deletes `dist/` |

## Verification

```bash
npm run typecheck   # no type errors
npm test            # 13 tests, all passing
npm run dev         # prints success and failure cases
```

The tests cover:
- Creating, updating and deleting tasks.
- Creating users and normalizing their email.
- Rejecting a missing task or user (`NotFoundError`).
- Rejecting invalid input (`ValidationError`).
- Returning copies, so changing a result does not change the stored data.

## AI Usage

I used **Claude Code** (Anthropic, model Claude Opus 5.5) as an assistant for this assignment.

**What the AI did:**
- Proposed the folder structure, the `tsconfig.json` settings and the npm scripts.
- Wrote the first version of the services, error classes, demo and tests.
- Ran the type check, tests and demo to confirm they work.

**What I did:**
- Reviewed and understood every file before submitting.
- Ran `npm run typecheck`, `npm test` and `npm run dev` myself and checked the output.
- Decided the repository layout: each assignment in its own folder (confirmed with the instructor).

**Key concepts practiced:**
- ESM + TypeScript: imports use the `.js` extension of the compiled file (`NodeNext`).
- In strict mode, the `error` in `catch` is `unknown`, so it must be checked with `instanceof` before use.
- `throw` inside an `async` function rejects the returned Promise.
- `Promise.all` fails as soon as one promise rejects; `Promise.allSettled` waits for all and reports each result.

## Author

Mohammed
