
# Task Management Backend Starter

A simple Node.js project for managing users and tasks using in-memory data storage and ES Modules (ESM).

## Features

### Users Module
- Get all users.
- Get a user by ID.
- Create a new user.

### Tasks Module
- Get all tasks.
- Get a task by ID.
- Create a new task.
- Update an existing task.
- Delete a task.

## Technologies Used

- Node.js
- JavaScript
- ES Modules (ESM)
- npm

No external packages or database are required.

## Project Structure

```text
backend_CoreIstabul/
├── src/
│   ├── app.js
│   └── modules/
│       ├── users/
│       │   └── users.js
│       └── tasks/
│           └── tasks.js
├── .gitignore
├── package.json
└── README.md
```

## Requirements

- Node.js installed
- npm installed

## How to Run

1. Clone or download the project.
2. Open the project directory in your terminal.
3. Run the application:

```bash
npm start
```

For development mode:

```bash
npm run dev
```

## Data Storage

This project uses in-memory arrays to store users and tasks.

Data is temporary and will be lost when the application restarts.

## Testing

The application demonstrates the following operations:

- Creating and retrieving users.
- Creating and retrieving tasks.
- Updating tasks.
- Deleting tasks.

Run the application using `npm start` and verify the output in the terminal.

## Author

Mohammed
