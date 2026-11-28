// Adds `req.user` to Express's Request type.
// The authenticate middleware sets it; route handlers after it can read it with full types.

import type { AuthUser } from "../auth/tokens.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
