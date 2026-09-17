export type SessionScreen = "queue" | "connecting" | "audio" | "reconnecting" | "ended";

export interface SessionViewState {
  screen: SessionScreen;
  activeSeconds: number;
  canSendFriendRequest: boolean;
  canRequestVideo: boolean;
}

export function formatActiveSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}
