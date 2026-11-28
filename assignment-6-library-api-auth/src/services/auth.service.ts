// Auth service: registration, login, token refresh and logout.
// Like the book service, it knows nothing about HTTP.

import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "../auth/password.js";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../auth/tokens.js";
import { prisma } from "../db/prisma.js";
import { ConflictError, UnauthorizedError } from "../errors/app-error.js";
import { Prisma, type Role } from "../generated/prisma/client.js";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema.js";

// What the API shows about a user. Never includes passwordHash.
export interface PublicUser {
  id: number;
  email: string;
  role: Role;
  createdAt: Date;
}

const publicUserFields = { id: true, email: true, role: true, createdAt: true } as const;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  user: PublicUser;
}

// Creates an access token and a refresh token, and saves the refresh token's hash
async function issueTokens(user: PublicUser): Promise<AuthTokens> {
  const accessToken = signAccessToken({ id: user.id, role: user.role });
  const { token: refreshToken, expiresAt } = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: { tokenHash: hashToken(refreshToken), userId: user.id, expiresAt },
  });

  return { accessToken, refreshToken, tokenType: "Bearer", user };
}

// Every new account is a USER. ADMIN accounts are created by the seed script.
export async function register(input: RegisterInput): Promise<PublicUser> {
  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.user.create({
      data: { email: input.email, passwordHash },
      select: publicUserFields,
    });
  } catch (error) {
    // P2002: unique constraint failed (users.email). The database enforces it, so two
    // requests at the same moment cannot both create the same email.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("Email is already registered");
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<AuthTokens> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Always run one bcrypt check (against a dummy hash if there is no such user), and always
  // return the same message. Then neither the message nor the response time tells an
  // attacker whether the email is registered.
  const passwordOk = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !passwordOk) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const { passwordHash: _hidden, ...publicUser } = user;
  return issueTokens(publicUser);
}

// Exchanges a valid refresh token for a new access token AND a new refresh token (rotation).
// The old refresh token is revoked, so each one works only once.
export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const { userId } = verifyRefreshToken(refreshToken); // signature + expiry (401 if bad)

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: { select: publicUserFields } },
  });
  if (!stored || stored.userId !== userId) {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  // Revoke it, but only if it is still active. The WHERE makes this safe when two
  // requests use the same token at the same moment: only one of them can change the row.
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null, expiresAt: { gt: new Date() } },
    data: { revokedAt: new Date() },
  });

  if (count === 0) {
    // The token was already used or logged out. A real client never does that, so someone
    // else probably has a copy of it (a stolen token). End every session of this user:
    // they must log in again, and the attacker's tokens stop working too.
    if (stored.revokedAt) {
      await revokeAllSessions(stored.userId);
    }
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  // The new access token uses the role stored now, so a role change applies from here on
  return issueTokens(stored.user);
}

// Revokes one refresh token. Always succeeds, even for an unknown token, so the endpoint
// does not reveal which tokens exist. The access token still works until it expires
// (at most 15 minutes), which is why it is kept short.
export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessions(userId: number): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// The current user. 401 if the account was deleted after the token was created.
export async function getUserById(id: number): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id }, select: publicUserFields });
  if (!user) {
    throw new UnauthorizedError("User no longer exists");
  }
  return user;
}
