/**
 * Fastify application factory.
 *
 * `buildApp` wires the JWT plugin, a uniform error handler that emits the
 * stable `{ code, message, retryable }` body, and every route group. All
 * external dependencies (data store, rate limiter) are injected so tests can
 * run against the in-memory store without a database or Redis.
 */
import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { ApiError } from "./errors.js";
import { ApiErrorCode, ERROR_HTTP_STATUS } from "./types/api.js";
import { registerAuth } from "./middleware/auth.js";
import { createInMemoryStore, type DataStore } from "./db/store.js";
import { createRateLimiter, type RateLimiter } from "./ratelimit.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerProfileRoutes } from "./routes/profile.js";
import { registerQueueRoutes } from "./routes/queue.js";

export interface BuildAppOptions {
  jwtSecret: string;
  store?: DataStore;
  rateLimiter?: RateLimiter;
  logger?: boolean;
  tokenTtl?: string;
}

export async function buildApp(opts: BuildAppOptions): Promise<FastifyInstance> {
  const store = opts.store ?? createInMemoryStore();
  const rateLimiter =
    opts.rateLimiter ??
    createRateLimiter({ limit: 10, windowMs: 60_000 });

  const app = Fastify({ logger: opts.logger ?? false });

  // Uniform error handler for both thrown ApiErrors and validation failures.
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send(error.toBody());
    }
    if (error instanceof ZodError) {
      return reply.code(400).send({
        code: ApiErrorCode.CONFLICT,
        message: error.issues.map((i) => i.message).join("; "),
        retryable: false,
      });
    }
    // @fastify/jwt failures and anything unexpected.
    if ((error as { statusCode?: number }).statusCode === 401) {
      return reply.code(401).send({
        code: ApiErrorCode.UNAUTHENTICATED,
        message: "Kimlik doğrulaması gerekli.",
        retryable: false,
      });
    }
    app.log.error(error);
    return reply.code(ERROR_HTTP_STATUS[ApiErrorCode.INTERNAL]).send({
      code: ApiErrorCode.INTERNAL,
      message: "Beklenmeyen bir hata oluştu.",
      retryable: true,
    });
  });

  await registerAuth(app, { jwtSecret: opts.jwtSecret, tokenTtl: opts.tokenTtl });

  app.get("/health", async () => ({ status: "ok" }));

  await registerAuthRoutes(app, { store });
  await registerProfileRoutes(app, { store });
  await registerQueueRoutes(app, { store, rateLimiter });

  return app;
}
