import { createApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 3000);

createApp().listen(PORT, (error) => {
  // Express 5 passes startup errors (e.g. port already in use) to this callback
  if (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
  console.log(`Library API running at http://localhost:${PORT}/api/books`);
});
