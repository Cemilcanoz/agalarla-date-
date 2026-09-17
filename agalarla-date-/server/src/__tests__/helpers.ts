/** Shared test helpers: build an app on the in-memory store, register users. */
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { createInMemoryStore, type DataStore } from "../db/store.js";
import { createRateLimiter, type RateLimiter } from "../ratelimit.js";

const JWT_SECRET = "test-secret-please-change-0123456789";

export interface TestContext {
  app: FastifyInstance;
  store: DataStore;
}

export async function makeApp(
  overrides: { store?: DataStore; rateLimiter?: RateLimiter } = {},
): Promise<TestContext> {
  const store = overrides.store ?? createInMemoryStore();
  const rateLimiter =
    overrides.rateLimiter ?? createRateLimiter({ limit: 100, windowMs: 60_000 });
  const app = await buildApp({ jwtSecret: JWT_SECRET, store, rateLimiter });
  await app.ready();
  return { app, store };
}

export async function registerUser(
  app: FastifyInstance,
  email: string,
  password = "supersecret1",
): Promise<{ userId: string; token: string }> {
  const res = await app.inject({
    method: "POST",
    url: "/v1/auth/register",
    payload: { email, password },
  });
  const body = res.json();
  return { userId: body.userId, token: body.token };
}

/** Registers a user and fills a complete, adult profile. Returns token. */
export async function registerWithProfile(
  app: FastifyInstance,
  email: string,
  birthDate = "1995-01-01",
): Promise<{ userId: string; token: string }> {
  const { userId, token } = await registerUser(app, email);
  await app.inject({
    method: "PUT",
    url: "/v1/profile",
    headers: { authorization: `Bearer ${token}` },
    payload: { displayName: "Test User", birthDate, bio: "hi" },
  });
  return { userId, token };
}
