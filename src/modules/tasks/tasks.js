
 // In-memory tasks storage
const tasks = [
  {
    id: 1,
    title: "Learn Node.js",
    description: "Understand Node.js fundamentals",
    completed: false
  }
];

let nextTaskId = 2;

// Get all tasks
export function getTasks() {
  return tasks;
}

// Get task by ID
export function getTaskById(id) {
  return tasks.find(task => task.id === id);
}

// Create a new task
export function createTask(title, description) {
  const newTask = {
    id: nextTaskId++,
    title,
    description,
    completed: false
  };

  tasks.push(newTask);

  return newTask;
}

// Update an existing task
export function updateTask(id, updates) {
  const task = tasks.find(task => task.id === id);

  if (!task) {
    return undefined;
  }

  if (updates.title !== undefined) {
    task.title = updates.title;
  }

  if (updates.description !== undefined) {
    task.description = updates.description;
  }

  if (updates.completed !== undefined) {
    task.completed = updates.completed;
  }

  return task;
}

// Delete a task
export function deleteTask(id) {
  const taskIndex = tasks.findIndex(task => task.id === id);

  if (taskIndex === -1) {
    return undefined;
  }

  const [deletedTask] = tasks.splice(taskIndex, 1);

  return deletedTask;
}
