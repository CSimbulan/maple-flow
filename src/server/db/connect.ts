import mongoose from "mongoose";

type Cache = { promise: Promise<typeof mongoose> | null };

// Next.js dev reloads modules, so keep one connection on globalThis.
const globalCache = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = (globalCache.__mongoose ??= { promise: null });

export function connectDb(uri = process.env.MONGODB_URI): Promise<typeof mongoose> {
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
  }
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 }).catch((err) => {
      cache.promise = null;
      throw err;
    });
  }
  return cache.promise;
}
