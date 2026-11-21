// Shape of a user stored in the system
export interface User {
  id: number;
  name: string;
  email: string;
}

// Shape of a task stored in the system
export interface Task {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  userId: number; // the user who owns the task
  createdAt: Date;
}

// Input types: what the caller sends. The service fills in the rest (id, createdAt, ...).
export type CreateUserInput = Omit<User, "id">;

export type CreateTaskInput = Pick<Task, "title" | "description" | "userId">;

// Every field is optional: the caller sends only what changes
export type UpdateTaskInput = Partial<Pick<Task, "title" | "description" | "completed">>;
