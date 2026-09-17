import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, registerUser } from "./helpers.js";
import { ApiErrorCode } from "../types/api.js";

let app: FastifyInstance;

afterEach(async () => {
  await app?.close();
});

describe("POST /v1/auth/register", () => {
  it("creates an account and returns a token with profileIncomplete=true", async () => {
    ({ app } = await makeApp());
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: "new@example.com", password: "supersecret1" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.email).toBe("new@example.com");
    expect(body.profileIncomplete).toBe(true);
    expect(typeof body.token).toBe("string");
    expect(typeof body.userId).toBe("string");
  });

  it("rejects a duplicate email with CONFLICT", async () => {
    ({ app } = await makeApp());
    await registerUser(app, "dup@example.com");
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: "dup@example.com", password: "supersecret1" },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe(ApiErrorCode.CONFLICT);
  });

  it("rejects a too-short password with a validation error", async () => {
    ({ app } = await makeApp());
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: "short@example.com", password: "123" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /v1/auth/login", () => {
  it("returns a token for valid credentials", async () => {
    ({ app } = await makeApp());
    await registerUser(app, "user@example.com", "supersecret1");
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "user@example.com", password: "supersecret1" },
    });
    expect(res.statusCode).toBe(200);
    expect(typeof res.json().token).toBe("string");
  });

  it("rejects a wrong password with UNAUTHENTICATED", async () => {
    ({ app } = await makeApp());
    await registerUser(app, "user2@example.com", "supersecret1");
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "user2@example.com", password: "wrongpass1" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe(ApiErrorCode.UNAUTHENTICATED);
  });

  it("rejects an unknown email with UNAUTHENTICATED", async () => {
    ({ app } = await makeApp());
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "nobody@example.com", password: "supersecret1" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe(ApiErrorCode.UNAUTHENTICATED);
  });
});

describe("profile-protected routes", () => {
  it("rejects profile update without a token (UNAUTHENTICATED)", async () => {
    ({ app } = await makeApp());
    const res = await app.inject({
      method: "PUT",
      url: "/v1/profile",
      payload: { displayName: "X", birthDate: "1990-01-01", bio: "" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe(ApiErrorCode.UNAUTHENTICATED);
  });

  it("updates a profile and flips profileIncomplete to false", async () => {
    ({ app } = await makeApp());
    const { token } = await registerUser(app, "p@example.com");
    const res = await app.inject({
      method: "PUT",
      url: "/v1/profile",
      headers: { authorization: `Bearer ${token}` },
      payload: { displayName: "Ayşe", birthDate: "1994-05-06", bio: "merhaba" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().profileIncomplete).toBe(false);
  });

  it("rejects preferences with maxAge < minAge", async () => {
    ({ app } = await makeApp());
    const { token } = await registerUser(app, "pref@example.com");
    const res = await app.inject({
      method: "PUT",
      url: "/v1/profile/preferences",
      headers: { authorization: `Bearer ${token}` },
      payload: { minAge: 40, maxAge: 20 },
    });
    expect(res.statusCode).toBe(400);
  });
});
