
// In-memory users storage
const users = [
  {
    id: 1,
    name: "Mohammed",
    email: "mohammed@example.com"
  }
];

// Get all users
export function getUsers() {
  return users;
}

// Get user by ID
export function getUserById(id) {
  return users.find(user => user.id === id);
}

// Create a new user
export function createUser(name, email) {
  const newUser = {
    id: users.length + 1,
    name,
    email
  };

  users.push(newUser);

  return newUser;
}
