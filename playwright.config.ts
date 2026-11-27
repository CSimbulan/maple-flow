import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Starts Next.js against a throwaway in-memory MongoDB with dev login enabled.
  webServer: {
    command: "npm run dev:memory",
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}/signin`,
    timeout: 180_000,
    reuseExistingServer: false,
  },
});
