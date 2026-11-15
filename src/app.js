// Import Users Module
import {
  getUsers,
  createUser
} from "./modules/users/users.js";

// Import Tasks Module
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask
} from "./modules/tasks/tasks.js";

// Test Users
console.log("===== USERS =====");

console.log("All Users:", getUsers());

const newUser = createUser(
  "Ahmed",
  "ahmed@example.com"
);

console.log("Created User:", newUser);

// Test Tasks
console.log("\n===== TASKS =====");

console.log("All Tasks:", getTasks());

const newTask = createTask(
  "Learn Express",
  "Learn how to build REST APIs"
);

console.log("Created Task:", newTask);

// Update Task
const updatedTask = updateTask(newTask.id, {
  completed: true
});

console.log("Updated Task:", updatedTask);

// Delete Task
const deletedTask = deleteTask(newTask.id);

console.log("Deleted Task:", deletedTask);

console.log("Remaining Tasks:", getTasks());