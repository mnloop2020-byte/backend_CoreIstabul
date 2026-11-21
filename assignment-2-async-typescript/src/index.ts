import { NotFoundError, ValidationError } from "./errors.js";
import {
  createTask,
  deleteTask,
  getTaskById,
  getTasks,
  getTasksByUser,
  updateTask,
} from "./modules/tasks/task.service.js";
import { createUser, getUserById, getUsers } from "./modules/users/user.service.js";

function section(title: string): void {
  console.log(`\n===== ${title} =====`);
}

// Runs an async operation and reports success or failure without stopping the app.
// With `strict`, the `error` in catch is `unknown`, so we check its type before using it.
async function runSafely<T>(label: string, operation: () => Promise<T>): Promise<void> {
  try {
    const result = await operation();
    console.log(`[OK]   ${label}:`, result);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      console.log(`[FAIL] ${label} -> ${error.name}: ${error.message}`);
    } else {
      throw error; // unexpected error: let it reach main().catch
    }
  }
}

async function main(): Promise<void> {
  // 1. Success cases: each await waits for the previous step
  section("1. Success cases (async/await)");

  const user = await createUser({ name: "Ahmed", email: "ahmed@example.com" });
  console.log("Created user:", user);

  const task = await createTask({
    title: "Learn TypeScript",
    description: "Interfaces, strict mode and async/await",
    userId: user.id,
  });
  console.log("Created task:", task);

  const updated = await updateTask(task.id, { completed: true });
  console.log("Updated task:", updated);

  console.log("Ahmed's tasks:", await getTasksByUser(user.id));

  // 2. Independent operations run in parallel with Promise.all
  section("2. Parallel operations (Promise.all)");

  const [allUsers, allTasks] = await Promise.all([getUsers(), getTasks()]);
  console.log(`Users: ${allUsers.length}, Tasks: ${allTasks.length}`);

  // 3. Failure cases: each one is caught and reported
  section("3. Failure cases (try/catch)");

  await runSafely("Get task 999", () => getTaskById(999));
  await runSafely("Create task for user 999", () =>
    createTask({ title: "Orphan task", description: "", userId: 999 }),
  );
  await runSafely("Create task with empty title", () =>
    createTask({ title: "   ", description: "", userId: user.id }),
  );
  await runSafely("Create user with invalid email", () =>
    createUser({ name: "Bad", email: "not-an-email" }),
  );
  await runSafely("Create user with duplicate email", () =>
    createUser({ name: "Ahmed 2", email: "ahmed@example.com" }),
  );

  // 4. Promise.allSettled: get every result, even when some fail
  section("4. Mixed results (Promise.allSettled)");

  const results = await Promise.allSettled([getUserById(1), getUserById(999)]);
  for (const result of results) {
    if (result.status === "fulfilled") {
      console.log("fulfilled:", result.value.name);
    } else {
      const reason: unknown = result.reason;
      console.log("rejected: ", reason instanceof Error ? reason.message : reason);
    }
  }

  // 5. Clean up
  section("5. Delete");

  const deleted = await deleteTask(task.id);
  console.log("Deleted task:", deleted.title);
  await runSafely("Delete the same task again", () => deleteTask(task.id));
}

// Top-level handler: an unexpected error sets a failing exit code instead of crashing silently
main().catch((error: unknown) => {
  console.error("Unexpected error:", error);
  process.exitCode = 1;
});
