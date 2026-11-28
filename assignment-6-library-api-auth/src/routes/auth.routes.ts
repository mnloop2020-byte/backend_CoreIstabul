// Auth routes, mounted at /api/auth in app.ts

import { Router } from "express";

import * as authController from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validate-body.js";
import { loginSchema, refreshTokenSchema, registerSchema } from "../schemas/auth.schema.js";

export const authRouter = Router();

// Public: anyone can call these
authRouter.post("/register", validateBody(registerSchema), authController.register);
authRouter.post("/login", validateBody(loginSchema), authController.login);
authRouter.post("/refresh", validateBody(refreshTokenSchema), authController.refresh);
authRouter.post("/logout", validateBody(refreshTokenSchema), authController.logout);

// Needs a valid access token
authRouter.get("/me", authenticate, authController.me);
