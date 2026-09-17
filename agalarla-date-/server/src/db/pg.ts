/**
 * PostgreSQL-backed implementation of `DataStore`.
 *
 * Used in production (wired from `index.ts`). Tests use the in-memory store
 * instead, so this module is not exercised by the unit test suite.
 */
import { Pool } from "pg";
import type { DataStore } from "./store.js";
import type {
  PreferenceRecord,
  ProfileRecord,
  QueueEntryRecord,
  QueueStatus,
  UserRecord,
} from "../types/api.js";

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}
interface ProfileRow {
  user_id: string;
  display_name: string;
  birth_date: Date;
  bio: string;
  updated_at: Date;
}
interface PreferenceRow {
  user_id: string;
  min_age: number;
  max_age: number;
  updated_at: Date;
}
interface QueueRow {
  user_id: string;
  joined_at: Date;
  idempotency_key: string | null;
  status: QueueStatus;
}

const iso = (d: Date): string => new Date(d).toISOString();
const isoDate = (d: Date): string => new Date(d).toISOString().slice(0, 10);

export function createPgStore(pool: Pool): DataStore {
  return {
    async findUserByEmail(email) {
      const { rows } = await pool.query<UserRow>(
        "SELECT id, email, password_hash, created_at FROM users WHERE lower(email) = lower($1) LIMIT 1",
        [email],
      );
      return rows[0] ? toUser(rows[0]) : null;
    },
    async findUserById(id) {
      const { rows } = await pool.query<UserRow>(
        "SELECT id, email, password_hash, created_at FROM users WHERE id = $1 LIMIT 1",
        [id],
      );
      return rows[0] ? toUser(rows[0]) : null;
    },
    async createUser(user) {
      const { rows } = await pool.query<UserRow>(
        `INSERT INTO users (id, email, password_hash, created_at)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, password_hash, created_at`,
        [user.id, user.email, user.passwordHash, user.createdAt],
      );
      return toUser(rows[0]);
    },

    async getProfile(userId) {
      const { rows } = await pool.query<ProfileRow>(
        "SELECT user_id, display_name, birth_date, bio, updated_at FROM profiles WHERE user_id = $1",
        [userId],
      );
      return rows[0] ? toProfile(rows[0]) : null;
    },
    async upsertProfile(profile) {
      const { rows } = await pool.query<ProfileRow>(
        `INSERT INTO profiles (user_id, display_name, birth_date, bio, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE
           SET display_name = EXCLUDED.display_name,
               birth_date   = EXCLUDED.birth_date,
               bio          = EXCLUDED.bio,
               updated_at   = EXCLUDED.updated_at
         RETURNING user_id, display_name, birth_date, bio, updated_at`,
        [
          profile.userId,
          profile.displayName,
          profile.birthDate,
          profile.bio,
          profile.updatedAt,
        ],
      );
      return toProfile(rows[0]);
    },

    async getPreferences(userId) {
      const { rows } = await pool.query<PreferenceRow>(
        "SELECT user_id, min_age, max_age, updated_at FROM preferences WHERE user_id = $1",
        [userId],
      );
      return rows[0] ? toPref(rows[0]) : null;
    },
    async upsertPreferences(pref) {
      const { rows } = await pool.query<PreferenceRow>(
        `INSERT INTO preferences (user_id, min_age, max_age, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE
           SET min_age = EXCLUDED.min_age,
               max_age = EXCLUDED.max_age,
               updated_at = EXCLUDED.updated_at
         RETURNING user_id, min_age, max_age, updated_at`,
        [pref.userId, pref.minAge, pref.maxAge, pref.updatedAt],
      );
      return toPref(rows[0]);
    },

    async isBlockedEitherWay(userA, userB) {
      const { rows } = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM blocks
           WHERE (blocker_id = $1 AND blocked_id = $2)
              OR (blocker_id = $2 AND blocked_id = $1)
         ) AS exists`,
        [userA, userB],
      );
      return rows[0]?.exists ?? false;
    },
    async listBlockedUserIds(userId) {
      const { rows } = await pool.query<{ other: string }>(
        `SELECT blocked_id AS other FROM blocks WHERE blocker_id = $1
         UNION
         SELECT blocker_id AS other FROM blocks WHERE blocked_id = $1`,
        [userId],
      );
      return rows.map((r) => r.other);
    },
    async addBlock(blockerId, blockedId) {
      await pool.query(
        `INSERT INTO blocks (blocker_id, blocked_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [blockerId, blockedId],
      );
    },

    async getQueueEntry(userId) {
      const { rows } = await pool.query<QueueRow>(
        "SELECT user_id, joined_at, idempotency_key, status FROM queue_entries WHERE user_id = $1",
        [userId],
      );
      return rows[0] ? toQueue(rows[0]) : null;
    },
    async upsertQueueEntry(entry) {
      const { rows } = await pool.query<QueueRow>(
        `INSERT INTO queue_entries (user_id, joined_at, idempotency_key, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE
           SET joined_at = EXCLUDED.joined_at,
               idempotency_key = EXCLUDED.idempotency_key,
               status = EXCLUDED.status
         RETURNING user_id, joined_at, idempotency_key, status`,
        [entry.userId, entry.joinedAt, entry.idempotencyKey, entry.status],
      );
      return toQueue(rows[0]);
    },
    async setQueueStatus(userId, status) {
      const { rows } = await pool.query<QueueRow>(
        `UPDATE queue_entries SET status = $2 WHERE user_id = $1
         RETURNING user_id, joined_at, idempotency_key, status`,
        [userId, status],
      );
      return rows[0] ? toQueue(rows[0]) : null;
    },
    async listQueuedUserIds(excludeUserId) {
      const { rows } = await pool.query<{ user_id: string }>(
        `SELECT user_id FROM queue_entries
         WHERE status = 'queued' AND user_id <> $1
         ORDER BY joined_at ASC`,
        [excludeUserId],
      );
      return rows.map((r) => r.user_id);
    },
  };
}

function toUser(r: UserRow): UserRecord {
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    createdAt: iso(r.created_at),
  };
}
function toProfile(r: ProfileRow): ProfileRecord {
  return {
    userId: r.user_id,
    displayName: r.display_name,
    birthDate: isoDate(r.birth_date),
    bio: r.bio,
    updatedAt: iso(r.updated_at),
  };
}
function toPref(r: PreferenceRow): PreferenceRecord {
  return {
    userId: r.user_id,
    minAge: r.min_age,
    maxAge: r.max_age,
    updatedAt: iso(r.updated_at),
  };
}
function toQueue(r: QueueRow): QueueEntryRecord {
  return {
    userId: r.user_id,
    joinedAt: iso(r.joined_at),
    idempotencyKey: r.idempotency_key,
    status: r.status,
  };
}
