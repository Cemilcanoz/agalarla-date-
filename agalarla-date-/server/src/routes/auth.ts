/**
 * Auth routes: registration and login.
 *
 *   POST /v1/auth/register  — create account, returns JWT + profileIncomplete
 *   POST /v1/auth/login     — verify credentials, returns JWT
 *
 * Error codes: CONFLICT (email taken), UNAUTHENTICATED (bad credentials).
 */
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { DataStore } from "../db/store.js";
import { conflict, unauthenticated } from "../errors.js";
import { hashPassword, verifyPassword } from "../security.js";
import { isProfileComplete } from "../domain.js";
import type {
  AuthTokenClaims,
  LoginResponse,
  RegisterResponse,
} from "../types/api.js";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(200),
});

export interface AuthRoutesDeps {
  store: DataStore;
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  deps: AuthRoutesDeps,
): Promise<void> {
  const { store } = deps;

  const signToken = (user: { id: string; email: string }): string => {
    const claims: AuthTokenClaims = { sub: user.id, email: user.email };
    return app.jwt.sign(claims);
  };

  app.post("/v1/auth/register", async (request, reply) => {
    const { email, password } = credentialsSchema.parse(request.body);

    const existing = await store.findUserByEmail(email);
    if (existing) {
      throw conflict("Bu e-posta ile bir hesap zaten var.");
    }

    const user = await store.createUser({
      id: randomUUID(),
      email,
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString(),
    });

    const profile = await store.getProfile(user.id);
    const body: RegisterResponse = {
      userId: user.id,
      email: user.email,
      profileIncomplete: !isProfileComplete(profile),
      token: signToken(user),
    };
    return reply.code(201).send(body);
  });

  app.post("/v1/auth/login", async (request, reply) => {
    const { email, password } = credentialsSchema.parse(request.body);

    const user = await store.findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      // Same error for unknown email and wrong password (no user enumeration).
      throw unauthenticated("E-posta veya parola hatalı.");
    }

    const profile = await store.getProfile(user.id);
    const body: LoginResponse = {
      userId: user.id,
      email: user.email,
      profileIncomplete: !isProfileComplete(profile),
      token: signToken(user),
    };
    return reply.code(200).send(body);
  });
}
