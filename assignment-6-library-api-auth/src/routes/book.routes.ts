// Routes layer: maps each URL + HTTP method to a controller function.
// Mounted at /api/books in app.ts, so "/" here means "/api/books".
//
// Permissions:
//   | Action            | ADMIN | USER | Guest (no token) |
//   | View books        |  yes  | yes  | no (401)         |
//   | View book details |  yes  | yes  | no (401)         |
//   | Add book          |  yes  | 403  | no (401)         |
//   | Update book       |  yes  | 403  | no (401)         |
//   | Delete book       |  yes  | 403  | no (401)         |
//
// Order matters: authenticate (who?) -> authorize (allowed?) -> validateBody -> controller.
// Checking permission before validating the body means a USER gets 403 even for an invalid
// body, and the API does not reveal its validation rules to someone who may not write.

import { Router } from "express";

import * as bookController from "../controllers/book.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validate-body.js";
import { createBookSchema, updateBookSchema } from "../schemas/book.schema.js";

export const bookRouter = Router();

// Every book route needs a logged-in user (USER or ADMIN). Guests get 401.
bookRouter.use(authenticate);

bookRouter.get("/", bookController.getAllBooks);
bookRouter.get("/:id", bookController.getBookById);
bookRouter.post("/", authorize("ADMIN"), validateBody(createBookSchema), bookController.createBook);
bookRouter.patch("/:id", authorize("ADMIN"), validateBody(updateBookSchema), bookController.updateBook);
bookRouter.delete("/:id", authorize("ADMIN"), bookController.deleteBook);
