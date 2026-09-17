# Agalarla Date — Client UX Contract

## Purpose

This document is the client contract for Sprint 0. It defines what the user can see and do; it does not make the client the authority for matching, time, consent, friendship, or safety decisions.

## Product rules the client must preserve

- Matching starts only after a signed-in adult has accepted the community rules and completed the required profile fields.
- The server is the source of truth for session state, active seconds, feature availability, friendship, block status, and video consent.
- Skip, block, and report are reachable in every session state. Block and report require a confirmation step; skip does not.
- A video camera is never activated by an unlock event. Both people must separately consent after the video feature becomes available.
- Reconnecting is a recovery state, not extra active time. The client displays server-provided active seconds only.

## Information architecture

| Area | Screens | Primary outcome |
| --- | --- | --- |
| Entry | Sign in, age gate, community rules | Eligible user reaches profile setup |
| Profile | Basic profile, interests, preferences | User can enter the matching queue |
| Match | Queue, matching, no-match, queue error | User starts or safely leaves a search |
| Session | Audio call, reconnect, ended | User can speak, see status, or recover safely |
| Trust unlocks | Friend request, video request, consent | Features are understandable without coercion |
| Relationship | Friend chat, request states | Persistent chat is available only after mutual friendship |
| Safety | Skip, block, report, confirmation, submitted | User can exit or report from any session |

## Screen and state matrix

| Screen | Normal state | Loading / transient state | Error / recovery state | Required actions |
| --- | --- | --- | --- | --- |
| Age gate | Date-of-birth entry and 18+ notice | Eligibility check | Not eligible; service unavailable | Continue, sign out |
| Community rules | Readable rules and explicit acceptance | Saving acceptance | Acceptance could not be saved | Accept, retry, sign out |
| Profile | Nickname, photo, age range, language, interests, intent | Uploading/saving | Field validation, upload failure | Save, retry, remove upload |
| Preferences | Age range, language, distance, intent filters | Saving filters | Invalid or unavailable filters | Save, reset |
| Queue | Searching animation and cancel affordance | Match negotiation | No compatible user; queue unavailable | Leave queue, retry, edit preferences |
| Audio session | Peer summary, server timer, mute, skip, safety menu | Connecting media | Microphone denied, device missing, connection failed | Mute, retry, skip, block, report |
| Reconnect | Last server timer and clear reconnecting status | Retrying connection | Recovery timeout or session ended | Retry, leave |
| Friend request | Locked explanation or enabled request state | Sending request | Request rejected/expired | Send, dismiss |
| Video request | Feature enabled, request/accept/reject states | Request pending, permission request | Camera denied, device missing, request expired | Request, accept, decline, continue audio |
| Friend chat | Conversation for mutual friends | Sending message | Message unavailable / friendship removed | Send, return |
| Session ended | Explicit reason and next safe action | Friendship finalisation | State refresh failed | Return to queue, open chat when available |

## Session presentation model

The UI renders an additive set of capabilities instead of treating unlocks as mutually exclusive session states.

```text
sessionState: QUEUED | CONNECTING | AUDIO_ACTIVE | RECONNECTING | ENDED
capabilities: canSendFriendRequest, canRequestVideo
mediaMode: AUDIO | VIDEO
```

`canSendFriendRequest` remains true after video becomes available. `mediaMode` becomes `VIDEO` only after both participants consent and media setup succeeds. A declined or expired request leaves `mediaMode` as `AUDIO`.

## Minimum server-to-client contract

The event names below are proposed names for Kişi 2 and Kişi 3 to confirm before implementation. Payloads must include a session identifier, a monotonic server revision, and an ISO-8601 server timestamp; clients ignore older revisions.

| Event | Required client effect |
| --- | --- |
| `queue.status_changed` | Render queue, matching, no-match, or recoverable error state |
| `session.started` | Enter audio session with peer-safe profile summary and `activeSeconds` |
| `session.updated` | Update server timer, connection status, capabilities, and end reason |
| `session.ended` | Stop local media, display end reason, expose chat only if `friendshipStatus=mutual` |
| `friend.request_updated` | Update request controls without optimistic authority overrides |
| `video.request_updated` | Render pending, accepted, declined, expired, or cancelled consent state |
| `safety.action_completed` | Confirm skip/block/report result; immediately leave or refresh the affected session |

Every command response must return a stable machine-readable error code. Required initial codes: `NOT_ELIGIBLE`, `CONSENT_REQUIRED`, `SESSION_NOT_ACTIVE`, `FEATURE_LOCKED`, `REQUEST_EXPIRED`, `PERMISSION_DENIED`, `DEVICE_UNAVAILABLE`, `NETWORK_UNAVAILABLE`, `RATE_LIMITED`, and `UNKNOWN`.

## Time and reconnect behaviour

- Display `activeSeconds` received from the server; never calculate unlock eligibility from wall-clock time.
- On foreground return or websocket recovery, request a fresh session snapshot before enabling controls.
- `RECONNECTING` must show that time is paused until a newer server snapshot says otherwise.
- The backend must define the reconnect grace period and the terminal `endReason`; the client must not invent either.

## Consent and permission UX

- Explain why microphone permission is requested before invoking the browser/device prompt.
- Request camera permission only after the user accepts an available video request.
- Before accepting video, show a local camera preview and an explicit "Kamerayı aç" action.
- A declined video request keeps the audio call uninterrupted and gives neither participant a punitive message.
- Permission-denied, device-unavailable, and network-quality failures have distinct plain-language copy and a safe audio-only fallback.

## Accessibility and responsive baseline

- Mobile-first layout; all primary actions remain reachable with one hand and at 200% text zoom.
- Use visible labels in addition to icons for skip, mute, block, report, and video actions.
- Keyboard focus order follows visual order; modal dialogs trap focus and restore it on close.
- Status/timer and reconnect changes use a non-disruptive live region; safety confirmations are announced immediately.
- Do not signal locked/unlocked, connection quality, or errors by colour alone.

## Analytics boundary

Emit only behavioural metadata: `queue_joined`, `queue_left`, `session_viewed`, `friend_unlock_presented`, `friend_request_clicked`, `video_unlock_presented`, `video_request_clicked`, `video_consent_selected`, `skip_clicked`, `block_confirmed`, and `report_submitted`.

Never put message text, audio/video, profile photos, precise location, date of birth, or raw peer identifiers in client analytics. The backend owns any pseudonymous correlation identifiers.

## Acceptance criteria for this contract

- [ ] Every listed screen has normal, loading/transient, and error/recovery treatment.
- [ ] The session UI relies on server state and server active seconds for unlocks.
- [ ] Friend and video availability are additive capabilities, not conflicting screen states.
- [ ] Safety actions are available from all session screens.
- [ ] Video consent and device permission are separate, explicit actions.
- [ ] Kişi 2 and Kişi 3 confirm or revise the proposed event/error contract before app-shell implementation starts.
