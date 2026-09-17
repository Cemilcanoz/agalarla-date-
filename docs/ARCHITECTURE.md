# Sprint 0 Architecture and Realtime Contract

## Decision

The MVP is a mobile-first web application. The client uses React, TypeScript, and Vite; the API and realtime service use Node.js, TypeScript, and Fastify. PostgreSQL is the durable source of truth, Redis is used only for queue presence, rate limits, and ephemeral coordination, and LiveKit supplies audio/video transport. This separation lets the product validate the web pilot quickly while retaining a clear path to a native client later.

## System boundaries

```text
React web client
  ├─ HTTPS REST ───────► Fastify API ─────► PostgreSQL
  ├─ WebSocket ────────► Realtime gateway ─► Redis
  └─ LiveKit token ────► LiveKit room (audio/video media)

Fastify API / realtime gateway ────────────► LiveKit server API
```

- The API authenticates users, stores profiles, evaluates preferences, creates reports/blocks/friendships, and issues short-lived LiveKit join tokens.
- The realtime gateway owns match queue transitions and session snapshots. It writes durable session changes through the API/service layer; it never trusts a browser timestamp.
- LiveKit carries media only. It cannot grant friendship, unlock video, or advance active session time.
- PostgreSQL stores user, consent, session, friendship, report, block, and configuration records. Redis loss must not create a friendship or unlock video incorrectly.

## Client and deployment scope

| Layer | Sprint 0 choice | Rationale |
| --- | --- | --- |
| Client | React + TypeScript + Vite | Fast mobile-first web shell; no framework-specific server dependency |
| API | Node.js 20 + TypeScript + Fastify | Shared types with client and low-overhead REST/WebSocket support |
| Durable data | PostgreSQL | Transactional friendship, blocks, consent, and audit metadata |
| Ephemeral data | Redis | Queue presence, heartbeat state, rate-limit counters |
| Media | LiveKit Cloud for pilot; self-hosted compatible | Selected in `docs/WEBRTC_SPIKE.md`; avoids storing media in application services |
| Hosting | Static client + containerized API/realtime services | Separates public client delivery from private service credentials |

## Authority rules

1. The browser may request an action but cannot decide eligibility, elapsed active time, friendship, consent completion, or block effects.
2. A session snapshot contains a monotonically increasing `revision`. Clients replace state only with a newer revision.
3. `activeSeconds` is computed by the server exclusively while both participants are confirmed connected.
4. Video is available only if `canRequestVideo=true`; video media starts only if `videoConsent.status=accepted` for both participants.
5. A successful block ends active media immediately, removes the reporter/blocker from the queue, and prevents future candidate selection in both directions.

## Session data model

```ts
type SessionState = "QUEUED" | "CONNECTING" | "AUDIO_ACTIVE" | "RECONNECTING" | "ENDED";
type MediaMode = "AUDIO" | "VIDEO";
type ConnectionState = "CONNECTED" | "RECONNECTING" | "DISCONNECTED";

interface SessionSnapshot {
  sessionId: string;
  revision: number;
  state: SessionState;
  activeSeconds: number;
  connection: ConnectionState;
  capabilities: { canSendFriendRequest: boolean; canRequestVideo: boolean };
  friendshipStatus: "none" | "outgoing" | "incoming" | "mutual";
  videoConsent: "idle" | "requested" | "accepted" | "declined" | "expired" | "cancelled";
  mediaMode: MediaMode;
  endReason?: "skipped" | "blocked" | "reported" | "connection_lost" | "peer_left" | "completed";
  serverTimestamp: string;
}
```

Unlocks are capabilities, not mutually exclusive `SessionState` values. A video decline or camera failure does not change `state` away from `AUDIO_ACTIVE`.

## Realtime envelope

All gateway events use this envelope. The client ignores events with an unknown `schemaVersion`, an unrelated `sessionId`, or a non-increasing `revision`.

```ts
interface RealtimeEvent<T> {
  type: string;
  schemaVersion: 1;
  eventId: string;
  occurredAt: string;
  sessionId?: string;
  revision?: number;
  payload: T;
}
```

| Event | Payload / client behaviour |
| --- | --- |
| `queue.status_changed` | `{ status: "queued" | "matching" | "no_match" | "error", retryAfterSeconds? }`; update queue screen |
| `session.started` | Full `SessionSnapshot` plus safe peer summary and LiveKit endpoint/token; enter audio connection flow |
| `session.updated` | Full `SessionSnapshot`; update timer, controls, consent, and connection state |
| `session.ended` | Final `SessionSnapshot`; stop media and expose chat only for `friendshipStatus="mutual"` |
| `friend.request_updated` | `{ session: SessionSnapshot }`; render non-authoritative request status |
| `video.request_updated` | `{ session: SessionSnapshot, expiresAt? }`; render request/consent outcome |
| `safety.action_completed` | `{ action: "skip" | "block" | "report", session?: SessionSnapshot }`; leave or refresh safely |

## Commands and idempotency

Every state-changing HTTP endpoint and WebSocket command accepts an `Idempotency-Key` UUID. A retry with the same authenticated user, route, and key returns the original result.

| Command | Server checks |
| --- | --- |
| `POST /v1/queue/join` | authenticated, age/rules/profile complete, not rate-limited |
| `POST /v1/queue/leave` | caller is queued or active; ends/updates session safely |
| `POST /v1/sessions/:id/heartbeat` | participant and current session; refreshes connection presence only |
| `POST /v1/sessions/:id/friend-requests` | participant, session active, `canSendFriendRequest` |
| `POST /v1/sessions/:id/video-requests` | participant, session active, `canRequestVideo` |
| `POST /v1/video-requests/:id/consent` | intended participant, unexpired request, explicit accept/decline |
| `POST /v1/sessions/:id/skip` | participant; ends caller's session and requeues only by explicit user choice |
| `POST /v1/sessions/:id/block` | participant; block persists before queue/session effects |
| `POST /v1/sessions/:id/reports` | participant; category required, media content excluded |

## Errors

API and realtime command failures use `{ code, message, retryable }`. Required stable codes are:

`UNAUTHENTICATED`, `FORBIDDEN`, `NOT_ELIGIBLE`, `CONSENT_REQUIRED`, `PROFILE_INCOMPLETE`, `SESSION_NOT_ACTIVE`, `FEATURE_LOCKED`, `REQUEST_EXPIRED`, `CONFLICT`, `RATE_LIMITED`, `PERMISSION_DENIED`, `DEVICE_UNAVAILABLE`, `NETWORK_UNAVAILABLE`, and `INTERNAL`.

The client maps codes to safe, plain-language copy; it never exposes stack traces or private peer data.

## Reconnect and timer rules

- A participant heartbeat is expected every 10 seconds while a session is active.
- Missing heartbeat moves the participant to `RECONNECTING`; `activeSeconds` stops immediately.
- The reconnect grace period is 15 seconds, matching the WebRTC spike. A valid return before expiry restores `AUDIO_ACTIVE`; otherwise the server ends the session with `connection_lost`.
- Page reload, client clock changes, duplicate sockets, and stale events do not add active time.

## Environment contract

Only variable names and non-secret local defaults belong in the repository.

| Variable | Owner | Required outside local development |
| --- | --- | --- |
| `VITE_API_BASE_URL` | client | yes |
| `VITE_REALTIME_URL` | client | yes |
| `VITE_LIVEKIT_URL` | client | yes |
| `DATABASE_URL` | API | yes; secret |
| `REDIS_URL` | realtime | yes; secret |
| `LIVEKIT_API_KEY` | API | yes; secret |
| `LIVEKIT_API_SECRET` | API | yes; secret |
| `SESSION_JWT_SECRET` | API | yes; secret |

## Open implementation decisions

- Auth provider and age-verification level must be selected before Sprint 1 registration work.
- The matching filter algorithm and pilot geography must be approved before queue launch.
- Retention periods for session metadata, reports, and account deletion must be reviewed against the target-market legal policy.
