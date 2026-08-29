interface EchoTrapPanelProps {
  audioUrl?: string;
  transcript?: string;
  isPlaying: boolean;
}

export function EchoTrapPanel({ audioUrl, transcript, isPlaying }: EchoTrapPanelProps) {
  return (
    <section className="panel honeypot-panel" aria-labelledby="honeypot-title">
      <div className="panel__heading">
        <div>
          <span className="eyebrow">Respuesta defensiva</span>
          <h2 id="honeypot-title">EchoTrap honeypot</h2>
        </div>
        <span className={`status-chip ${isPlaying ? "status-chip--active" : ""}`}>
          {isPlaying ? "Reproduciendo" : audioUrl ? "Listo" : "En espera"}
        </span>
      </div>
      <p className="muted-copy">
        Si la voz da rojo, EchoTrap reproduce una respuesta dilatoria para ganar tiempo.
      </p>
      {audioUrl ? (
        <audio className="audio-player" controls src={audioUrl} aria-label="Respuesta dilatoria de EchoTrap" />
      ) : (
        <div className="empty-state">Todavía no se activó una respuesta dilatoria.</div>
      )}
      {transcript && (
        <div className="honeypot-transcript">
          <span className="eyebrow">Transcripción disponible</span>
          <p>“{transcript}”</p>
        </div>
      )}
    </section>
  );
}
