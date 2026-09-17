import { useState } from "react";
import { formatActiveSeconds, type SessionScreen, type SessionViewState } from "./session";

const initialState: SessionViewState = {
  screen: "queue",
  activeSeconds: 0,
  canSendFriendRequest: false,
  canRequestVideo: false
};

const screenCopy: Record<SessionScreen, { title: string; body: string }> = {
  queue: {
    title: "Yeni bir sohbet ara",
    body: "Tercihlerine uyan biri bulunduğunda güvenli sesli görüşme başlayacak."
  },
  connecting: {
    title: "Bağlantı kuruluyor",
    body: "Mikrofonun yalnızca görüşme için kullanılır. İzin vermeden sesli sohbet başlamaz."
  },
  audio: {
    title: "Sesli sohbet aktif",
    body: "Süre sunucuda doğrulanır. İstediğin anda geçebilir, engelleyebilir veya raporlayabilirsin."
  },
  reconnecting: {
    title: "Yeniden bağlanılıyor",
    body: "Bağlantı kurulana kadar aktif süre ilerlemez."
  },
  ended: {
    title: "Görüşme sona erdi",
    body: "Hazır olduğunda yeni bir eşleşme arayabilirsin."
  }
};

export function App() {
  const [state, setState] = useState(initialState);
  const copy = screenCopy[state.screen];
  const isSessionActive = state.screen === "audio" || state.screen === "reconnecting";

  function simulateMatch() {
    setState({ ...initialState, screen: "connecting" });
  }

  function startAudio() {
    setState({ screen: "audio", activeSeconds: 30, canSendFriendRequest: true, canRequestVideo: false });
  }

  function endSession() {
    setState({ ...state, screen: "ended" });
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <p className="eyebrow">Agalarla Date</p>
        <span className="status" aria-live="polite">Güvenli görüşme</span>
      </header>

      <section className="card" aria-labelledby="screen-title">
        <p className="step">Sprint 0 · İstemci kabuğu</p>
        <h1 id="screen-title">{copy.title}</h1>
        <p>{copy.body}</p>

        {isSessionActive && (
          <div className="timer" aria-live="polite">
            <span>Sunucu süresi</span>
            <strong>{formatActiveSeconds(state.activeSeconds)}</strong>
          </div>
        )}

        <div className="actions">
          {state.screen === "queue" && <button onClick={simulateMatch}>Eşleşme ara</button>}
          {state.screen === "connecting" && <button onClick={startAudio}>Mikrofon izniyle devam et</button>}
          {state.screen === "audio" && state.canSendFriendRequest && <button>Arkadaşlık isteği gönder</button>}
          {state.screen === "ended" && <button onClick={simulateMatch}>Yeniden eşleş</button>}
        </div>

        {isSessionActive && (
          <div className="safety-actions" aria-label="Güvenlik kontrolleri">
            <button className="secondary" onClick={endSession}>Geç</button>
            <button className="secondary" onClick={endSession}>Engelle</button>
            <button className="secondary" onClick={endSession}>Raporla</button>
          </div>
        )}
      </section>
    </main>
  );
}
