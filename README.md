# Backend Core Istanbul – Assignments

Each assignment is a separate project in its own folder, with its own `package.json` and README.

| # | Assignment | Stack | Folder |
|---|---|---|---|
| 1 | Task Management Backend | Node.js, JavaScript, ESM | [assignment-1-task-management](./assignment-1-task-management) |
| 2 | Async Task Management Backend | Node.js, TypeScript (strict), ESM, async/await | [assignment-2-async-typescript](./assignment-2-async-typescript) |
| 3 | Library Book Management API | Express 5, TypeScript, Zod, REST | [assignment-3-library-book-api](./assignment-3-library-book-api) |
| 4 | AI-Assisted PostgreSQL Database Project (library database) | PostgreSQL 18, SQL | [assignment-4-postgresql-library-db](./assignment-4-postgresql-library-db) |
| 5 | Library Book Management API with Prisma ORM and PostgreSQL (Session 6) | Express 5, TypeScript, Zod, Prisma 7, PostgreSQL | [assignment-5-library-api-prisma](./assignment-5-library-api-prisma) |

## How to Run an Assignment

```bash
cd <assignment-folder>
npm install   # only needed if the assignment has dependencies
npm start     # assignment 1
npm run dev   # assignments 2, 3 and 5
```

Assignment 4 is SQL only: run `bash run-all.sh` in its folder (see its README).
Assignment 5 needs PostgreSQL and a `.env` file first (see its README).

See each folder's README for details.

## Author

Mohammed
