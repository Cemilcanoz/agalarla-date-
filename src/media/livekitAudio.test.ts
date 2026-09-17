import { describe, expect, it, vi } from "vitest";
import { MediaSessionError, startAudioSession, type AudioRoomPort } from "./livekitAudio";

function fakeStream(): MediaStream {
  return { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
}

function fakeRoom(): AudioRoomPort & { connect: ReturnType<typeof vi.fn>; enableMicrophone: ReturnType<typeof vi.fn> } {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    enableMicrophone: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    onReconnecting: vi.fn(),
    onReconnected: vi.fn(),
    onDisconnected: vi.fn(),
  };
}

describe("startAudioSession", () => {
  it("requests permission, fetches a short-lived token and joins audio", async () => {
    const room = fakeRoom();
    const states: string[] = [];
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      url: "wss://pilot.livekit.cloud",
      token: "short-lived-token",
      roomName: "session_123",
      expiresAt: "2026-09-17T13:00:00.000Z",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const session = await startAudioSession({
      apiBaseUrl: "https://api.example.test",
      sessionId: "session_123",
      fetcher,
      room,
      requestMicrophone: async () => fakeStream(),
      onStateChange: (state) => states.push(state),
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/v1/sessions/session_123/media-token",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    expect(room.connect).toHaveBeenCalledWith("wss://pilot.livekit.cloud", "short-lived-token");
    expect(room.enableMicrophone).toHaveBeenCalledOnce();
    expect(session.roomName).toBe("session_123");
    expect(states).toEqual(["connecting", "connected"]);
  });

  it("does not request a token when microphone permission is denied", async () => {
    const fetcher = vi.fn();
    await expect(startAudioSession({
      apiBaseUrl: "https://api.example.test",
      sessionId: "session_123",
      fetcher,
      room: fakeRoom(),
      requestMicrophone: async () => { throw new DOMException("denied", "NotAllowedError"); },
    })).rejects.toEqual(expect.objectContaining<Partial<MediaSessionError>>({ code: "MICROPHONE_DENIED" }));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects malformed token responses without exposing the token", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: "secret" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    await expect(startAudioSession({
      apiBaseUrl: "https://api.example.test",
      sessionId: "session_123",
      fetcher,
      room: fakeRoom(),
      requestMicrophone: async () => fakeStream(),
    })).rejects.toEqual(expect.objectContaining<Partial<MediaSessionError>>({ code: "INVALID_TOKEN_RESPONSE" }));
  });
});
