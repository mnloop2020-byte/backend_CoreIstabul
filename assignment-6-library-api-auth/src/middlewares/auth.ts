// Authentication and authorization middlewares.
//
// authenticate: "Who are you?"   Reads the access token and sets req.user.  Failure -> 401
// authorize:    "Are you allowed?" Checks req.user.role.                    Failure -> 403
//
// Used together on a route:  router.post("/", authenticate, authorize("ADMIN"), handler)

import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "../auth/tokens.js";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error.js";
import type { Role } from "../generated/prisma/client.js";

// Expects the header:  Authorization: Bearer <access token>
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header) {
    throw new UnauthorizedError("Authentication required: send an access token in the Authorization header");
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new UnauthorizedError('Authorization header must be "Bearer <token>"');
  }

  req.user = verifyAccessToken(token); // throws a 401 if the token is invalid or expired
  next();
}

// Returns a middleware that lets only the given roles through
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      // authorize was used without authenticate before it: a bug in the routes, fail closed
      throw new UnauthorizedError("Authentication required");
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError("You do not have permission to perform this action");
    }
    next();
  };
}
