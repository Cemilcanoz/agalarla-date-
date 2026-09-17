/**
 * Matching queue routes (all require authentication).
 *
 *   POST /v1/queue/join   — join the pool; accepts an `Idempotency-Key` header
 *   POST /v1/queue/leave  — leave the pool
 *
 * Server checks on join (per ARCHITECTURE.md):
 *   authenticated, profile complete, eligible (age >= 18), not rate-limited.
 * Blocked users are excluded from candidate selection in both directions.
 *
 * Error codes: UNAUTHENTICATED, PROFILE_INCOMPLETE, NOT_ELIGIBLE,
 *              RATE_LIMITED, CONFLICT.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError } from "../errors.js";
import {
  conflict,
  notEligible,
  profileIncomplete,
  rateLimited,
  unauthenticated,
} from "../errors.js";
import { ApiErrorCode } from "../types/api.js";
import type { DataStore } from "../db/store.js";
import type { RateLimiter } from "../ratelimit.js";
import { ageFromBirthDate, isProfileComplete } from "../domain.js";
import type { QueueJoinResponse, QueueLeaveResponse } from "../types/api.js";

const MIN_AGE = 18;

export interface QueueRoutesDeps {
  store: DataStore;
  rateLimiter: RateLimiter;
}

const idempotencyKeySchema = z.string().uuid();

/**
 * Picks the first queued candidate that is not blocked in either direction.
 * Exported for direct unit testing of the block-exclusion rule.
 */
export async function selectCandidate(
  store: DataStore,
  userId: string,
): Promise<string | null> {
  const queued = await store.listQueuedUserIds(userId);
  for (const candidateId of queued) {
    const blocked = await store.isBlockedEitherWay(userId, candidateId);
    if (!blocked) return candidateId;
  }
  return null;
}

export async function registerQueueRoutes(
  app: FastifyInstance,
  deps: QueueRoutesDeps,
): Promise<void> {
  const { store, rateLimiter } = deps;

  app.post(
    "/v1/queue/join",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const auth = request.authUser;
      if (!auth) throw unauthenticated();
      const userId = auth.sub;

      // Optional idempotency key from the standard header.
      const rawKey = request.headers["idempotency-key"];
      let idempotencyKey: string | null = null;
      if (typeof rawKey === "string" && rawKey.length > 0) {
        const parsed = idempotencyKeySchema.safeParse(rawKey);
        if (!parsed.success) {
          throw new ApiError(
            ApiErrorCode.CONFLICT,
            "Idempotency-Key geçerli bir UUID olmalı.",
          );
        }
        idempotencyKey = parsed.data;

        // Replay: same key on an entry that is still queued/matched.
        const existing = await store.getQueueEntry(userId);
        if (
          existing &&
          existing.idempotencyKey === idempotencyKey &&
          existing.status !== "left"
        ) {
          const replay: QueueJoinResponse = {
            userId,
            status: existing.status,
            joinedAt: existing.joinedAt,
            idempotentReplay: true,
          };
          return reply.code(200).send(replay);
        }
      }

      // Profile must be complete before queueing.
      const profile = await store.getProfile(userId);
      if (!isProfileComplete(profile)) {
        throw profileIncomplete("Kuyruğa girmeden önce profilinizi tamamlayın.");
      }

      // Eligibility: minimum age.
      if (ageFromBirthDate(profile!.birthDate) < MIN_AGE) {
        throw notEligible("Bu hizmeti kullanmak için en az 18 yaşında olmalısınız.");
      }

      // Already actively queued (without a matching idempotency key) -> conflict.
      const current = await store.getQueueEntry(userId);
      if (current && current.status === "queued") {
        throw conflict("Zaten kuyruktasınız.");
      }

      // Rate limit join attempts.
      if (!rateLimiter.hit(`queue:join:${userId}`)) {
        throw rateLimited("Çok sık kuyruğa giriyorsunuz. Lütfen bekleyin.");
      }

      const joinedAt = new Date().toISOString();
      await store.upsertQueueEntry({
        userId,
        joinedAt,
        idempotencyKey,
        status: "queued",
      });

      // Attempt an immediate match, excluding blocked users both ways.
      const candidateId = await selectCandidate(store, userId);
      if (candidateId) {
        await store.setQueueStatus(userId, "matched");
        await store.setQueueStatus(candidateId, "matched");
      }

      const finalEntry = await store.getQueueEntry(userId);
      const body: QueueJoinResponse = {
        userId,
        status: finalEntry?.status ?? "queued",
        joinedAt,
        idempotentReplay: false,
      };
      return reply.code(201).send(body);
    },
  );

  app.post(
    "/v1/queue/leave",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const auth = request.authUser;
      if (!auth) throw unauthenticated();
      const userId = auth.sub;

      const entry = await store.getQueueEntry(userId);
      if (!entry || entry.status === "left") {
        throw conflict("Kuyrukta değilsiniz.");
      }

      const updated = await store.setQueueStatus(userId, "left");
      const body: QueueLeaveResponse = {
        userId,
        status: updated?.status ?? "left",
      };
      return reply.code(200).send(body);
    },
  );
}
