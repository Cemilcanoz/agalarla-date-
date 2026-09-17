/**
 * Shared API request/response types and stable error codes.
 *
 * Error codes mirror the stable set defined in `docs/ARCHITECTURE.md`.
 * The client maps these codes to safe, plain-language copy and never
 * relies on HTTP status text alone.
 */

/** Stable error codes shared across the API and realtime gateway. */
export enum ApiErrorCode {
  UNAUTHENTICATED = "UNAUTHENTICATED",
  FORBIDDEN = "FORBIDDEN",
  NOT_ELIGIBLE = "NOT_ELIGIBLE",
  CONSENT_REQUIRED = "CONSENT_REQUIRED",
  PROFILE_INCOMPLETE = "PROFILE_INCOMPLETE",
  SESSION_NOT_ACTIVE = "SESSION_NOT_ACTIVE",
  FEATURE_LOCKED = "FEATURE_LOCKED",
  REQUEST_EXPIRED = "REQUEST_EXPIRED",
  CONFLICT = "CONFLICT",
  RATE_LIMITED = "RATE_LIMITED",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  DEVICE_UNAVAILABLE = "DEVICE_UNAVAILABLE",
  NETWORK_UNAVAILABLE = "NETWORK_UNAVAILABLE",
  INTERNAL = "INTERNAL",
}

/** Uniform error envelope returned by every failing endpoint. */
export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  retryable: boolean;
}

/** Maps each stable code to the HTTP status the API returns. */
export const ERROR_HTTP_STATUS: Record<ApiErrorCode, number> = {
  [ApiErrorCode.UNAUTHENTICATED]: 401,
  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.NOT_ELIGIBLE]: 403,
  [ApiErrorCode.CONSENT_REQUIRED]: 403,
  [ApiErrorCode.PROFILE_INCOMPLETE]: 409,
  [ApiErrorCode.SESSION_NOT_ACTIVE]: 409,
  [ApiErrorCode.FEATURE_LOCKED]: 403,
  [ApiErrorCode.REQUEST_EXPIRED]: 410,
  [ApiErrorCode.CONFLICT]: 409,
  [ApiErrorCode.RATE_LIMITED]: 429,
  [ApiErrorCode.PERMISSION_DENIED]: 403,
  [ApiErrorCode.DEVICE_UNAVAILABLE]: 409,
  [ApiErrorCode.NETWORK_UNAVAILABLE]: 503,
  [ApiErrorCode.INTERNAL]: 500,
};

/** Codes the client may safely retry without user changes. */
export const RETRYABLE_CODES: ReadonlySet<ApiErrorCode> = new Set([
  ApiErrorCode.RATE_LIMITED,
  ApiErrorCode.NETWORK_UNAVAILABLE,
  ApiErrorCode.INTERNAL,
]);

/* ----------------------------- Domain records ----------------------------- */

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface ProfileRecord {
  userId: string;
  displayName: string;
  birthDate: string; // ISO date (YYYY-MM-DD)
  bio: string;
  updatedAt: string;
}

export interface PreferenceRecord {
  userId: string;
  minAge: number;
  maxAge: number;
  updatedAt: string;
}

export type QueueStatus = "queued" | "matched" | "left";

export interface QueueEntryRecord {
  userId: string;
  joinedAt: string;
  idempotencyKey: string | null;
  status: QueueStatus;
}

/* ------------------------------ Auth payloads ----------------------------- */

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  userId: string;
  email: string;
  /** True until the user fills out display name, birth date and bio. */
  profileIncomplete: boolean;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  email: string;
  profileIncomplete: boolean;
  token: string;
}

/** Decoded JWT payload stored under `request.user`. */
export interface AuthTokenClaims {
  sub: string; // user id
  email: string;
}

/* ---------------------------- Profile payloads ---------------------------- */

export interface UpdateProfileRequest {
  displayName: string;
  birthDate: string; // YYYY-MM-DD
  bio: string;
}

export interface UpdateProfileResponse {
  userId: string;
  displayName: string;
  birthDate: string;
  bio: string;
  profileIncomplete: boolean;
  updatedAt: string;
}

export interface UpdatePreferencesRequest {
  minAge: number;
  maxAge: number;
}

export interface UpdatePreferencesResponse {
  userId: string;
  minAge: number;
  maxAge: number;
  updatedAt: string;
}

/* ----------------------------- Queue payloads ----------------------------- */

export interface QueueJoinResponse {
  userId: string;
  status: QueueStatus;
  joinedAt: string;
  /** True when an identical Idempotency-Key replayed a prior join. */
  idempotentReplay: boolean;
}

export interface QueueLeaveResponse {
  userId: string;
  status: QueueStatus;
}
