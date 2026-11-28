// Auth controller: translates HTTP <-> auth service calls.
// Bodies are already validated by validateBody before these handlers run.

import type { Request, Response } from "express";

import { UnauthorizedError } from "../errors/app-error.js";
import type { LoginInput, RefreshTokenInput, RegisterInput } from "../schemas/auth.schema.js";
import * as authService from "../services/auth.service.js";

// POST /api/auth/register -> 201 with the new user (no tokens: the client logs in next)
export async function register(req: Request<object, unknown, RegisterInput>, res: Response): Promise<void> {
  res.status(201).json(await authService.register(req.body));
}

// POST /api/auth/login -> 200 with access token, refresh token and the user
export async function login(req: Request<object, unknown, LoginInput>, res: Response): Promise<void> {
  res.status(200).json(await authService.login(req.body));
}

// POST /api/auth/refresh -> 200 with a NEW access token and a NEW refresh token
export async function refresh(req: Request<object, unknown, RefreshTokenInput>, res: Response): Promise<void> {
  res.status(200).json(await authService.refresh(req.body.refreshToken));
}

// POST /api/auth/logout -> 204, the refresh token can no longer be used
export async function logout(req: Request<object, unknown, RefreshTokenInput>, res: Response): Promise<void> {
  await authService.logout(req.body.refreshToken);
  res.status(204).send();
}

// GET /api/auth/me (needs authenticate) -> the logged-in user
export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError("Authentication required");
  }
  res.status(200).json(await authService.getUserById(req.user.id));
}
