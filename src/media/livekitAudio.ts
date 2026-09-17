import { Room, RoomEvent } from "livekit-client";

export type AudioConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected";

export interface MediaTokenResponse {
  url: string;
  token: string;
  roomName: string;
  expiresAt: string;
}

export interface AudioRoomPort {
  connect(url: string, token: string): Promise<void>;
  enableMicrophone(): Promise<void>;
  disconnect(): Promise<void>;
  onReconnecting(listener: () => void): void;
  onReconnected(listener: () => void): void;
  onDisconnected(listener: () => void): void;
}

export interface StartAudioSessionOptions {
  apiBaseUrl: string;
  sessionId: string;
  fetcher?: typeof fetch;
  room?: AudioRoomPort;
  requestMicrophone?: () => Promise<MediaStream>;
  onStateChange?: (state: AudioConnectionState) => void;
}

export class MediaSessionError extends Error {
  constructor(
    public readonly code: "MICROPHONE_DENIED" | "TOKEN_FAILED" | "INVALID_TOKEN_RESPONSE" | "CONNECTION_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "MediaSessionError";
  }
}

class LiveKitAudioRoom implements AudioRoomPort {
  private readonly room = new Room({ adaptiveStream: true, dynacast: true });

  connect(url: string, token: string): Promise<void> {
    return this.room.connect(url, token);
  }

  async enableMicrophone(): Promise<void> {
    await this.room.localParticipant.setMicrophoneEnabled(true);
  }

  async disconnect(): Promise<void> {
    await this.room.disconnect();
  }

  onReconnecting(listener: () => void): void {
    this.room.on(RoomEvent.Reconnecting, listener);
  }

  onReconnected(listener: () => void): void {
    this.room.on(RoomEvent.Reconnected, listener);
  }

  onDisconnected(listener: () => void): void {
    this.room.on(RoomEvent.Disconnected, listener);
  }
}

function isMediaTokenResponse(value: unknown): value is MediaTokenResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.url === "string" && /^(wss|https):\/\//.test(candidate.url) &&
    typeof candidate.token === "string" && candidate.token.length > 0 &&
    typeof candidate.roomName === "string" && candidate.roomName.length > 0 &&
    typeof candidate.expiresAt === "string" && !Number.isNaN(Date.parse(candidate.expiresAt))
  );
}

async function requestMediaToken(apiBaseUrl: string, sessionId: string, fetcher: typeof fetch): Promise<MediaTokenResponse> {
  const response = await fetcher(
    `${apiBaseUrl.replace(/\/$/, "")}/v1/sessions/${encodeURIComponent(sessionId)}/media-token`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Idempotency-Key": crypto.randomUUID() },
    },
  );

  if (!response.ok) throw new MediaSessionError("TOKEN_FAILED", "Sesli görüşme yetkisi alınamadı.");
  const payload: unknown = await response.json();
  if (!isMediaTokenResponse(payload)) {
    throw new MediaSessionError("INVALID_TOKEN_RESPONSE", "Medya sunucusu geçersiz yanıt verdi.");
  }
  return payload;
}

export async function startAudioSession(options: StartAudioSessionOptions): Promise<{
  roomName: string;
  expiresAt: string;
  disconnect: () => Promise<void>;
}> {
  const fetcher = options.fetcher ?? fetch;
  const room = options.room ?? new LiveKitAudioRoom();
  const requestMicrophone =
    options.requestMicrophone ?? (() => navigator.mediaDevices.getUserMedia({ audio: true, video: false }));

  let permissionStream: MediaStream;
  try {
    permissionStream = await requestMicrophone();
  } catch {
    throw new MediaSessionError("MICROPHONE_DENIED", "Mikrofon izni olmadan sesli görüşme başlatılamaz.");
  }
  permissionStream.getTracks().forEach((track) => track.stop());

  options.onStateChange?.("connecting");
  const credentials = await requestMediaToken(options.apiBaseUrl, options.sessionId, fetcher);
  room.onReconnecting(() => options.onStateChange?.("reconnecting"));
  room.onReconnected(() => options.onStateChange?.("connected"));
  room.onDisconnected(() => options.onStateChange?.("disconnected"));

  try {
    await room.connect(credentials.url, credentials.token);
    await room.enableMicrophone();
    options.onStateChange?.("connected");
  } catch {
    await room.disconnect();
    throw new MediaSessionError("CONNECTION_FAILED", "Sesli görüşme bağlantısı kurulamadı.");
  }

  return {
    roomName: credentials.roomName,
    expiresAt: credentials.expiresAt,
    disconnect: async () => {
      await room.disconnect();
      options.onStateChange?.("disconnected");
    },
  };
}
