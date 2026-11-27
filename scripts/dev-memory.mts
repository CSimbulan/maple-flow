// Runs `next dev` against a throwaway in-memory MongoDB with dev login on.
// Handy before Atlas is set up, and used by the Playwright tests. Data is lost when it stops.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { MongoMemoryServer } from "mongodb-memory-server";

const port = process.env.PORT ?? "3000";
const mongo = await MongoMemoryServer.create();
const uri = mongo.getUri("maple-flow");
console.log(`In-memory MongoDB at ${uri}`);

const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev", "--port", port], {
  stdio: "inherit",
  env: {
    ...process.env,
    // Process env wins over .env.local, so this never touches the Atlas database.
    MONGODB_URI: uri,
    AUTH_DEV_LOGIN: "true",
    AUTH_SECRET: process.env.AUTH_SECRET || randomBytes(32).toString("base64"),
  },
});

async function shutdown(code: number) {
  await mongo.stop();
  process.exit(code);
}
child.on("exit", (code) => void shutdown(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => child.kill(signal));
}
