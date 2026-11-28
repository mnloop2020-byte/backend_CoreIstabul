// Password hashing with bcrypt.
//
// We never store the password itself, only its bcrypt hash:
// - Hashing is one-way: the hash cannot be turned back into the password.
// - bcrypt adds a random "salt" to every hash, so two users with the same password get
//   different hashes, and precomputed tables of common passwords do not work.
// - bcrypt is slow on purpose (the cost factor). One check takes a fraction of a second for
//   us, but trying millions of guesses after a database leak becomes very expensive.

import bcrypt from "bcryptjs";

// Each +1 doubles the work. 12 is a common choice today.
const COST_FACTOR = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST_FACTOR);
}

// Re-hashes the given password with the salt stored inside `hash` and compares the results
export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// A real hash of a random password, used when the email does not exist.
// Login still runs one bcrypt check, so it takes the same time whether or not the
// account exists. Otherwise the response time would reveal which emails are registered.
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomUUID(), COST_FACTOR);
