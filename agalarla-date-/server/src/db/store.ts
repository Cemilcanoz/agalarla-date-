/**
 * Data-access abstraction.
 *
 * Routes depend only on the `DataStore` interface, never on a concrete
 * database driver. Production wires the PostgreSQL implementation
 * (`createPgStore`); tests inject `createInMemoryStore()` so no real
 * database or Redis instance is required.
 */
import type {
  PreferenceRecord,
  ProfileRecord,
  QueueEntryRecord,
  UserRecord,
} from "../types/api.js";

export interface DataStore {
  // Users
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createUser(user: UserRecord): Promise<UserRecord>;

  // Profiles
  getProfile(userId: string): Promise<ProfileRecord | null>;
  upsertProfile(profile: ProfileRecord): Promise<ProfileRecord>;

  // Preferences
  getPreferences(userId: string): Promise<PreferenceRecord | null>;
  upsertPreferences(pref: PreferenceRecord): Promise<PreferenceRecord>;

  // Blocks (directional; either direction hides the pair)
  isBlockedEitherWay(userA: string, userB: string): Promise<boolean>;
  /** All user ids blocked by `userId` or who blocked `userId`. */
  listBlockedUserIds(userId: string): Promise<string[]>;
  addBlock(blockerId: string, blockedId: string): Promise<void>;

  // Queue
  getQueueEntry(userId: string): Promise<QueueEntryRecord | null>;
  upsertQueueEntry(entry: QueueEntryRecord): Promise<QueueEntryRecord>;
  setQueueStatus(
    userId: string,
    status: QueueEntryRecord["status"],
  ): Promise<QueueEntryRecord | null>;
  /** User ids currently in `queued` status, oldest first, excluding one id. */
  listQueuedUserIds(excludeUserId: string): Promise<string[]>;
}

/**
 * Simple process-local store used for tests and local development without a
 * database. Not for production: state is lost on restart and not shared
 * across instances.
 */
export function createInMemoryStore(): DataStore {
  const users = new Map<string, UserRecord>();
  const usersByEmail = new Map<string, string>(); // lower(email) -> id
  const profiles = new Map<string, ProfileRecord>();
  const preferences = new Map<string, PreferenceRecord>();
  const blocks = new Set<string>(); // `${blockerId}:${blockedId}`
  const queue = new Map<string, QueueEntryRecord>();

  const key = (a: string, b: string) => `${a}:${b}`;

  return {
    async findUserByEmail(email) {
      const id = usersByEmail.get(email.toLowerCase());
      return id ? (users.get(id) ?? null) : null;
    },
    async findUserById(id) {
      return users.get(id) ?? null;
    },
    async createUser(user) {
      users.set(user.id, user);
      usersByEmail.set(user.email.toLowerCase(), user.id);
      return user;
    },

    async getProfile(userId) {
      return profiles.get(userId) ?? null;
    },
    async upsertProfile(profile) {
      profiles.set(profile.userId, profile);
      return profile;
    },

    async getPreferences(userId) {
      return preferences.get(userId) ?? null;
    },
    async upsertPreferences(pref) {
      preferences.set(pref.userId, pref);
      return pref;
    },

    async isBlockedEitherWay(userA, userB) {
      return blocks.has(key(userA, userB)) || blocks.has(key(userB, userA));
    },
    async listBlockedUserIds(userId) {
      const result = new Set<string>();
      for (const entry of blocks) {
        const [blocker, blocked] = entry.split(":");
        if (blocker === userId) result.add(blocked);
        if (blocked === userId) result.add(blocker);
      }
      return [...result];
    },
    async addBlock(blockerId, blockedId) {
      blocks.add(key(blockerId, blockedId));
    },

    async getQueueEntry(userId) {
      return queue.get(userId) ?? null;
    },
    async upsertQueueEntry(entry) {
      queue.set(entry.userId, entry);
      return entry;
    },
    async setQueueStatus(userId, status) {
      const current = queue.get(userId);
      if (!current) return null;
      const updated = { ...current, status };
      queue.set(userId, updated);
      return updated;
    },
    async listQueuedUserIds(excludeUserId) {
      return [...queue.values()]
        .filter((e) => e.status === "queued" && e.userId !== excludeUserId)
        .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
        .map((e) => e.userId);
    },
  };
}
