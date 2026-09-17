import { describe, expect, it } from "vitest";
import { evaluateQueueEligibility, isAdult } from "../../src/domain/eligibility";
import { createMatchSession, findEligibleMatch, type QueueCandidate } from "../../src/domain/matching";

const now = new Date("2026-09-17T12:00:00.000Z");

describe("Sprint 1 eligibility rules", () => {
  it("rejects someone whose 18th birthday has not arrived", () => {
    expect(isAdult("2008-09-18", now)).toBe(false);
    expect(evaluateQueueEligibility({ birthDate: "2008-09-18", agreedToRules: true, profileComplete: true }, now))
      .toEqual({ eligible: false, reason: "UNDERAGE" });
  });

  it("accepts someone on their 18th birthday", () => {
    expect(isAdult("2008-09-17", now)).toBe(true);
  });

  it("requires rules consent and a complete profile", () => {
    expect(evaluateQueueEligibility({ birthDate: "2000-01-01", agreedToRules: false, profileComplete: true }, now))
      .toEqual({ eligible: false, reason: "RULES_REQUIRED" });
    expect(evaluateQueueEligibility({ birthDate: "2000-01-01", agreedToRules: true, profileComplete: false }, now))
      .toEqual({ eligible: false, reason: "PROFILE_INCOMPLETE" });
  });
});

describe("Sprint 1 matching rules", () => {
  const requester: QueueCandidate = {
    id: "user_A", age: 24, language: "tr", minPreferredAge: 20, maxPreferredAge: 30,
    maxDistanceKm: 25, distanceKm: 0, inQueue: true,
  };
  const candidate: QueueCandidate = {
    id: "user_B", age: 26, language: "tr", minPreferredAge: 20, maxPreferredAge: 30,
    maxDistanceKm: 30, distanceKm: 10, inQueue: true,
  };

  it("excludes blocks in both directions", () => {
    const blockedByRequester = new Map([[requester.id, new Set([candidate.id])]]);
    expect(findEligibleMatch(requester, [candidate], { blockedUsersByUser: blockedByRequester })).toBeNull();

    const blockedByCandidate = new Map([[candidate.id, new Set([requester.id])]]);
    expect(findEligibleMatch(requester, [candidate], { blockedUsersByUser: blockedByCandidate })).toBeNull();
  });

  it("creates one shared session for a compatible pair", () => {
    const match = findEligibleMatch(requester, [candidate], { blockedUsersByUser: new Map() });
    expect(match?.id).toBe(candidate.id);

    const session = createMatchSession(requester.id, candidate.id, () => "session_A_B");
    expect(session).toEqual({ sessionId: "session_A_B", participantIds: ["user_A", "user_B"] });
  });

  it("excludes recently matched peers", () => {
    const recent = new Map([[requester.id, new Set([candidate.id])]]);
    expect(findEligibleMatch(requester, [candidate], {
      blockedUsersByUser: new Map(), recentPeersByUser: recent,
    })).toBeNull();
  });
});
