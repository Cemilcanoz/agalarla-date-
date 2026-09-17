/**
 * JWT authentication preHandler.
 *
 * Registers `@fastify/jwt` and exposes `app.authenticate`, a preHandler hook
 * that verifies the bearer token and populates `request.authUser`. Any route
 * that lists it in `preHandler` requires a valid token, otherwise it fails
 * with the stable `UNAUTHENTICATED` error.
 */
import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { unauthenticated } from "../errors.js";
import type { AuthTokenClaims } from "../types/api.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
  interface FastifyRequest {
    authUser?: AuthTokenClaims;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthTokenClaims;
    user: AuthTokenClaims;
  }
}

export interface AuthPluginOptions {
  jwtSecret: string;
  tokenTtl?: string;
}

export async function registerAuth(
  app: FastifyInstance,
  opts: AuthPluginOptions,
): Promise<void> {
  await app.register(fastifyJwt, {
    secret: opts.jwtSecret,
    sign: { expiresIn: opts.tokenTtl ?? "12h" },
  });

  app.decorate(
    "authenticate",
    async function (
      request: FastifyRequest,
      _reply: FastifyReply,
    ): Promise<void> {
      try {
        const claims = await request.jwtVerify<AuthTokenClaims>();
        request.authUser = claims;
      } catch {
        throw unauthenticated();
      }
    },
  );
}
