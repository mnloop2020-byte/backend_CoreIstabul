import { createApp } from "./app.js";
import { prisma } from "./db/prisma.js";

const PORT = Number(process.env.PORT ?? 3000);

const server = createApp().listen(PORT, (error) => {
  // Express 5 passes startup errors (e.g. port already in use) to this callback
  if (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
  console.log(`Library API running at http://localhost:${PORT}/api/books`);
});

// On Ctrl+C (SIGINT) or a stop signal (SIGTERM): stop taking new requests,
// then close the database connections cleanly before exiting.
function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
