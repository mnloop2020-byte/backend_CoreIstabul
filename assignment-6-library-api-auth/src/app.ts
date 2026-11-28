import express, { type Express } from "express";

import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import { authRouter } from "./routes/auth.routes.js";
import { bookRouter } from "./routes/book.routes.js";

// Builds the Express app without starting it.
// server.ts starts it; tests start it on a random port.
export function createApp(): Express {
  const app = express();

  // Parse JSON request bodies into req.body
  app.use(express.json());

  app.use("/api/auth", authRouter);
  app.use("/api/books", bookRouter);

  // Order matters: these run only if no route above handled the request
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
