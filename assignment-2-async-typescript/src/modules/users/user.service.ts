import { NotFoundError, ValidationError } from "../../errors.js";
import type { CreateUserInput, User } from "../../types.js";
import { delay } from "../../utils/delay.js";

// In-memory storage (data is lost when the app restarts)
const users: User[] = [
  { id: 1, name: "Mohammed", email: "mohammed@example.com" },
];

let nextUserId = 2;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Get all users.
// Returns copies so callers cannot change the stored data by accident.
export async function getUsers(): Promise<User[]> {
  await delay();
  return users.map((user) => ({ ...user }));
}

// Get one user. Rejects with NotFoundError when the id does not exist.
// Note: `throw` inside an async function = the returned Promise rejects.
export async function getUserById(id: number): Promise<User> {
  await delay();

  const user = users.find((u) => u.id === id);
  if (!user) {
    throw new NotFoundError(`User with id ${id} not found`);
  }

  return { ...user };
}

// Create a user after validating the input.
export async function createUser(input: CreateUserInput): Promise<User> {
  await delay();

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (name.length === 0) {
    throw new ValidationError("User name is required");
  }
  if (!EMAIL_PATTERN.test(email)) {
    throw new ValidationError(`Invalid email: "${input.email}"`);
  }
  if (users.some((u) => u.email === email)) {
    throw new ValidationError(`Email already in use: ${email}`);
  }

  const user: User = { id: nextUserId++, name, email };
  users.push(user);

  return { ...user };
}
