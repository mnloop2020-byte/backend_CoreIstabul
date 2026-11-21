import { NotFoundError, ValidationError } from "../../errors.js";
import type { CreateTaskInput, Task, UpdateTaskInput } from "../../types.js";
import { delay } from "../../utils/delay.js";
import { getUserById } from "../users/user.service.js";

// In-memory storage (data is lost when the app restarts)
const tasks: Task[] = [
  {
    id: 1,
    title: "Learn Node.js",
    description: "Understand Node.js fundamentals",
    completed: false,
    userId: 1,
    createdAt: new Date(),
  },
];

let nextTaskId = 2;

// Copy a task so callers cannot change the stored one by accident
function copyTask(task: Task): Task {
  return { ...task, createdAt: new Date(task.createdAt) };
}

// Find the stored task or reject with NotFoundError
function findTaskOrThrow(id: number): Task {
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    throw new NotFoundError(`Task with id ${id} not found`);
  }
  return task;
}

// Get all tasks
export async function getTasks(): Promise<Task[]> {
  await delay();
  return tasks.map(copyTask);
}

// Get one task by id
export async function getTaskById(id: number): Promise<Task> {
  await delay();
  return copyTask(findTaskOrThrow(id));
}

// Get all tasks of one user. Rejects if the user does not exist.
export async function getTasksByUser(userId: number): Promise<Task[]> {
  await getUserById(userId); // throws NotFoundError for an unknown user
  return tasks.filter((t) => t.userId === userId).map(copyTask);
}

// Create a task. The owner must exist and the title must not be empty.
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const title = input.title.trim();
  if (title.length === 0) {
    throw new ValidationError("Task title is required");
  }

  // Waits for the user lookup; if it rejects, createTask rejects with the same error
  await getUserById(input.userId);

  const task: Task = {
    id: nextTaskId++,
    title,
    description: input.description.trim(),
    completed: false,
    userId: input.userId,
    createdAt: new Date(),
  };
  tasks.push(task);

  return copyTask(task);
}

// Update only the fields that were sent
export async function updateTask(id: number, updates: UpdateTaskInput): Promise<Task> {
  await delay();

  const task = findTaskOrThrow(id);

  if (updates.title !== undefined) {
    const title = updates.title.trim();
    if (title.length === 0) {
      throw new ValidationError("Task title cannot be empty");
    }
    task.title = title;
  }
  if (updates.description !== undefined) {
    task.description = updates.description.trim();
  }
  if (updates.completed !== undefined) {
    task.completed = updates.completed;
  }

  return copyTask(task);
}

// Delete a task and return it
export async function deleteTask(id: number): Promise<Task> {
  await delay();

  const index = tasks.findIndex((t) => t.id === id);
  const [deleted] = index === -1 ? [] : tasks.splice(index, 1);

  // `deleted` is `Task | undefined` because of noUncheckedIndexedAccess
  if (!deleted) {
    throw new NotFoundError(`Task with id ${id} not found`);
  }

  return deleted;
}
