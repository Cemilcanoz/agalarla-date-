import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  makeApp,
  registerUser,
  registerWithProfile,
} from "./helpers.js";
import { createInMemoryStore } from "../db/store.js";
import { createRateLimiter } from "../ratelimit.js";
import { selectCandidate } from "../routes/queue.js";
import { ApiErrorCode } from "../types/api.js";

let app: FastifyInstance;

afterEach(async () => {
  await app?.close();
});

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

describe("POST /v1/queue/join", () => {
  it("queues a user with a complete profile", async () => {
    ({ app } = await makeApp());
    const { token } = await registerWithProfile(app, "q1@example.com");
    const res = await app.inject({
      method: "POST",
      url: "/v1/queue/join",
      headers: auth(token),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe("queued");
  });

  it("rejects join without a token (UNAUTHENTICATED)", async () => {
    ({ app } = await makeApp());
    const res = await app.inject({ method: "POST", url: "/v1/queue/join" });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe(ApiErrorCode.UNAUTHENTICATED);
  });

  it("rejects join when the profile is incomplete (PROFILE_INCOMPLETE)", async () => {
    ({ app } = await makeApp());
    const { token } = await registerUser(app, "incomplete@example.com");
    const res = await app.inject({
      method: "POST",
      url: "/v1/queue/join",
      headers: auth(token),
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe(ApiErrorCode.PROFILE_INCOMPLETE);
  });

  it("rejects an underage user (NOT_ELIGIBLE)", async () => {
    ({ app } = await makeApp());
    const { token } = await registerWithProfile(
      app,
      "minor@example.com",
      "2015-01-01",
    );
    const res = await app.inject({
      method: "POST",
      url: "/v1/queue/join",
      headers: auth(token),
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe(ApiErrorCode.NOT_ELIGIBLE);
  });

  it("returns CONFLICT when already queued", async () => {
    ({ app } = await makeApp());
    const { token } = await registerWithProfile(app, "dupq@example.com");
    await app.inject({
      method: "POST",
      url: "/v1/queue/join",
      headers: auth(token),
    });
    const res = await app.inject({
      method: "POST",
      url: "/v1/queue/join",
      headers: auth(token),
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe(ApiErrorCode.CONFLICT);
  });

  it("replays the original result for the same Idempotency-Key", async () => {
    ({ app } = await makeApp());
    const { token } = await registerWithProfile(app, "idem@example.com");
    const key = randomUUID();
    const first = await app.inject({
      method: "POST",
      url: "/v1/queue/join",
      headers: { ...auth(token), "idempotency-key": key },
    });
    const second = await app.inject({
      method: "POST",
      url: "/v1/queue/join",
      headers: { ...auth(token), "idempotency-key": key },
    });
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(200);
    expect(second.json().idempotentReplay).toBe(true);
  });

  it("enforces the rate limit (RATE_LIMITED)", async () => {
    const rateLimiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    ({ app } = await makeApp({ rateLimiter }));
    const { token } = await registerWithProfile(app, "rl@example.com");
    // First join consumes the single allowed hit.
    await app.inject({
      method: "POST",
      url: "/v1/queue/join",
      headers: auth(token),
    });
    // Leave so the second join is not blocked by CONFLICT first.
    await app.inject({
      method: "POST",
      url: "/v1/queue/leave",
      headers: auth(token),
    });
    const res = await app.inject({
      method: "POST",
      url: "/v1/queue/join",
      headers: auth(token),
    });
    expect(res.statusCode).toBe(429);
    expect(res.json().code).toBe(ApiErrorCode.RATE_LIMITED);
  });

  it("matches two eligible users who have not blocked each other", async () => {
    ({ app } = await makeApp());
    const a = await registerWithProfile(app, "a@example.com");
    const b = await registerWithProfile(app, "b@example.com");
    await app.inject({
      method: "POST",
      url: "/v1/queue/join",
      headers: auth(a.token),
    });
    const res = await app.inject({
      method: "POST",
      url: "/v1/queue/join",
      headers: auth(b.token),
    });
    expect(res.json().status).toBe("matched");
  });
});

describe("POST /v1/queue/leave", () => {
  it("leaves the queue after joining", async () => {
    ({ app } = await makeApp());
    const { token } = await registerWithProfile(app, "leave@example.com");
    await app.inject({
      method: "POST",
      url: "/v1/queue/join",
      headers: auth(token),
    });
    const res = await app.inject({
      method: "POST",
      url: "/v1/queue/leave",
      headers: auth(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("left");
  });

  it("returns CONFLICT when leaving without being queued", async () => {
    ({ app } = await makeApp());
    const { token } = await registerWithProfile(app, "noq@example.com");
    const res = await app.inject({
      method: "POST",
      url: "/v1/queue/leave",
      headers: auth(token),
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe(ApiErrorCode.CONFLICT);
  });
});

describe("block exclusion in candidate selection", () => {
  it("excludes blocked users from the candidate pool in both directions", async () => {
    const store = createInMemoryStore();
    // Two queued candidates for user "me".
    await store.upsertQueueEntry({
      userId: "blocked-user",
      joinedAt: "2026-01-01T00:00:00.000Z",
      idempotencyKey: null,
      status: "queued",
    });
    await store.upsertQueueEntry({
      userId: "ok-user",
      joinedAt: "2026-01-01T00:00:01.000Z",
      idempotencyKey: null,
      status: "queued",
    });
    // "me" blocked "blocked-user".
    await store.addBlock("me", "blocked-user");

    const candidate = await selectCandidate(store, "me");
    expect(candidate).toBe("ok-user");
  });

  it("returns null when every candidate is blocked", async () => {
    const store = createInMemoryStore();
    await store.upsertQueueEntry({
      userId: "x",
      joinedAt: "2026-01-01T00:00:00.000Z",
      idempotencyKey: null,
      status: "queued",
    });
    // Reverse-direction block: "x" blocked "me".
    await store.addBlock("x", "me");
    const candidate = await selectCandidate(store, "me");
    expect(candidate).toBeNull();
  });
});
