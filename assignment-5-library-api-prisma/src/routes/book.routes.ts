// Routes layer: maps each URL + HTTP method to a controller function.
// Mounted at /api/books in app.ts, so "/" here means "/api/books".

import { Router } from "express";

import * as bookController from "../controllers/book.controller.js";
import { validateBody } from "../middlewares/validate-body.js";
import { createBookSchema, updateBookSchema } from "../schemas/book.schema.js";

export const bookRouter = Router();

bookRouter.get("/", bookController.getAllBooks);
bookRouter.get("/:id", bookController.getBookById);
bookRouter.post("/", validateBody(createBookSchema), bookController.createBook);
bookRouter.patch("/:id", validateBody(updateBookSchema), bookController.updateBook);
bookRouter.delete("/:id", bookController.deleteBook);
