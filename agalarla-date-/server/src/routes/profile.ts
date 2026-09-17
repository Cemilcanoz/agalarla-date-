/**
 * Profile routes (all require authentication).
 *
 *   PUT /v1/profile              — update display_name, birth_date, bio
 *   PUT /v1/profile/preferences  — update min_age, max_age
 *
 * Error code: UNAUTHENTICATED.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { DataStore } from "../db/store.js";
import { unauthenticated } from "../errors.js";
import { isProfileComplete } from "../domain.js";
import type {
  UpdatePreferencesResponse,
  UpdateProfileResponse,
} from "../types/api.js";

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD bekleniyor"),
  bio: z.string().max(500).default(""),
});

const preferencesSchema = z
  .object({
    minAge: z.number().int().min(18).max(99),
    maxAge: z.number().int().min(18).max(99),
  })
  .refine((v) => v.maxAge >= v.minAge, {
    message: "maxAge, minAge değerinden küçük olamaz.",
    path: ["maxAge"],
  });

export interface ProfileRoutesDeps {
  store: DataStore;
}

export async function registerProfileRoutes(
  app: FastifyInstance,
  deps: ProfileRoutesDeps,
): Promise<void> {
  const { store } = deps;

  app.put(
    "/v1/profile",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const auth = request.authUser;
      if (!auth) throw unauthenticated();

      const input = profileSchema.parse(request.body);
      const saved = await store.upsertProfile({
        userId: auth.sub,
        displayName: input.displayName,
        birthDate: input.birthDate,
        bio: input.bio,
        updatedAt: new Date().toISOString(),
      });

      const body: UpdateProfileResponse = {
        userId: saved.userId,
        displayName: saved.displayName,
        birthDate: saved.birthDate,
        bio: saved.bio,
        profileIncomplete: !isProfileComplete(saved),
        updatedAt: saved.updatedAt,
      };
      return reply.code(200).send(body);
    },
  );

  app.put(
    "/v1/profile/preferences",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const auth = request.authUser;
      if (!auth) throw unauthenticated();

      const input = preferencesSchema.parse(request.body);
      const saved = await store.upsertPreferences({
        userId: auth.sub,
        minAge: input.minAge,
        maxAge: input.maxAge,
        updatedAt: new Date().toISOString(),
      });

      const body: UpdatePreferencesResponse = {
        userId: saved.userId,
        minAge: saved.minAge,
        maxAge: saved.maxAge,
        updatedAt: saved.updatedAt,
      };
      return reply.code(200).send(body);
    },
  );
}
