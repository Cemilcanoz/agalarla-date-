export interface QueueCandidate {
  id: string;
  age: number;
  language: string;
  minPreferredAge: number;
  maxPreferredAge: number;
  maxDistanceKm: number;
  distanceKm: number;
  inQueue: boolean;
}

export interface MatchSession {
  sessionId: string;
  participantIds: readonly [string, string];
}

export interface MatchingContext {
  blockedUsersByUser: ReadonlyMap<string, ReadonlySet<string>>;
  recentPeersByUser?: ReadonlyMap<string, ReadonlySet<string>>;
}

function contains(map: ReadonlyMap<string, ReadonlySet<string>>, userId: string, peerId: string): boolean {
  return map.get(userId)?.has(peerId) ?? false;
}

export function canMatch(requester: QueueCandidate, candidate: QueueCandidate, context: MatchingContext): boolean {
  if (!requester.inQueue || !candidate.inQueue || requester.id === candidate.id) return false;
  if (requester.language !== candidate.language) return false;
  if (candidate.age < requester.minPreferredAge || candidate.age > requester.maxPreferredAge) return false;
  if (requester.age < candidate.minPreferredAge || requester.age > candidate.maxPreferredAge) return false;
  if (candidate.distanceKm > requester.maxDistanceKm || candidate.distanceKm > candidate.maxDistanceKm) return false;
  if (contains(context.blockedUsersByUser, requester.id, candidate.id)) return false;
  if (contains(context.blockedUsersByUser, candidate.id, requester.id)) return false;
  if (context.recentPeersByUser && contains(context.recentPeersByUser, requester.id, candidate.id)) return false;
  return true;
}

export function findEligibleMatch(
  requester: QueueCandidate,
  candidates: readonly QueueCandidate[],
  context: MatchingContext,
): QueueCandidate | null {
  return candidates.find((candidate) => canMatch(requester, candidate, context)) ?? null;
}

export function createMatchSession(firstUserId: string, secondUserId: string, createId: () => string): MatchSession {
  if (!firstUserId || !secondUserId || firstUserId === secondUserId) {
    throw new Error("A session requires two different users");
  }
  return { sessionId: createId(), participantIds: [firstUserId, secondUserId] };
}
