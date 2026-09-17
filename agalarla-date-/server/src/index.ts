/**
 * Server entrypoint.
 *
 * Wires the PostgreSQL-backed store and starts Fastify. Requires
 * `DATABASE_URL` and `SESSION_JWT_SECRET` (see `.env.example`). `REDIS_URL`
 * is reserved for the shared rate limiter / queue presence in a later step.
 */
import { Pool } from "pg";
import { buildApp } from "./app.js";
import { createPgStore } from "./db/pg.js";

async function main(): Promise<void> {
  const jwtSecret = process.env.SESSION_JWT_SECRET;
  const databaseUrl = process.env.DATABASE_URL;

  if (!jwtSecret) {
    throw new Error("SESSION_JWT_SECRET tanımlı değil.");
  }
  if (!databaseUrl) {
    throw new Error("DATABASE_URL tanımlı değil.");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const store = createPgStore(pool);

  const app = await buildApp({ jwtSecret, store, logger: true });

  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? "0.0.0.0";

  try {
    await app.listen({ port, host });
    app.log.info(`API listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    await pool.end();
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
