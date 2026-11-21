// Simulates the latency of a real database or network call.
// Returns a Promise that resolves after `ms` milliseconds.
export function delay(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
