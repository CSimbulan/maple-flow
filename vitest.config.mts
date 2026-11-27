import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    environment: "node",
    // Process Pothos with Vite so it shares our copy of graphql (otherwise it loads the CJS build
    // while our code loads the ESM build, and graphql rejects types from "another realm").
    server: { deps: { inline: [/@pothos\//] } },
    // The first run downloads a MongoDB binary for mongodb-memory-server.
    hookTimeout: 120_000,
  },
});
