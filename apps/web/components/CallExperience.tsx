"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AlertPopup } from "./AlertPopup";
import { ContentAnalysisPanel } from "./ContentAnalysisPanel";
import { EchoTrapPanel } from "./EchoTrapPanel";
import { Semaphore } from "./Semaphore";
import { Timeline } from "./Timeline";
import { api } from "../lib/convex/api";
import { useAudioDetection, type AudioChunk } from "../lib/audio/useAudioDetection";

type CallId = string;

export function CallExperience() {
  const [callId, setCallId] = useState<CallId | null>(null);

  if (!callId) return <Landing onCallCreated={setCallId} />;
  return <LiveCall callId={callId} onEnd={() => setCallId(null)} />;
}

function Landing({ onCallCreated }: { onCallCreated: (callId: CallId) => void }) {
  const createCall = useMutation(api.calls.crearLlamada);
  const [contact, setContact] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsStarting(true);
    setError("");
    try {
      const id = await createCall({ contactoConfianza: contact.trim() || undefined });
      onCallCreated(id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo iniciar la llamada.");
      setIsStarting(false);
    }
  };

  return (
    <main className="hero-shell">
      <div className="chrome-inferno" aria-hidden="true">
        <div className="chrome-inferno__glow chrome-inferno__glow--one" />
        <div className="chrome-inferno__glow chrome-inferno__glow--two" />
        <div className="chrome-inferno__grain" />
      </div>
      <div className="hero-content">
        <div className="brand-mark"><span>ET</span><i /></div>
        <span className="eyebrow">Protección inteligente para tus llamadas</span>
        <h1>Escuchá la señal detrás de la voz.</h1>
        <p className="hero-copy">
          EchoTrap analiza si una voz fue clonada por IA y te ayuda a ganar tiempo cuando una llamada se vuelve peligrosa.
        </p>
        <form className="start-card" onSubmit={handleSubmit}>
          <label htmlFor="trusted-contact">Contacto de confianza <span>(opcional)</span></label>
          <input
            id="trusted-contact"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="Nombre o teléfono para avisar"
            autoComplete="tel"
          />
          <button className="primary-button" type="submit" disabled={isStarting}>
            {isStarting ? "Iniciando llamada…" : "Iniciar detección"}
          </button>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
        <p className="hero-footnote">Sin login · procesamiento reactivo · tus alertas en tiempo real</p>
      </div>
    </main>
  );
}

function LiveCall({ callId, onEnd }: { callId: CallId; onEnd: () => void }) {
  const evaluateAudio = useAction(api.detections.evaluarAudioAction);
  const detections = useQuery(api.detections.listarDeteccionesPorLlamada, { callId });
  const alerts = useQuery(api.alerts.listarAlertasPorLlamada, { callId });
  const contentAnalyses = useQuery(api.contenido.obtenerAnalisisContenidoPorLlamada, { callId });
  const call = useQuery(api.calls.obtenerLlamada, { callId });

  const [isSending, setIsSending] = useState(false);
  const [lastError, setLastError] = useState("");
  const [honeypotUrl, setHoneypotUrl] = useState<string>();
  const [isHoneypotPlaying, setIsHoneypotPlaying] = useState(false);
  const [activeAlert, setActiveAlert] = useState<{ tipo: string; timestamp: number } | null>(null);
  const knownAlertIds = useRef(new Set<string>());
  const previousHoneypotUrl = useRef<string | undefined>(undefined);
  const honeypotPlayer = useRef<HTMLAudioElement | undefined>(undefined);

  const playHoneypot = useCallback((audio: ArrayBuffer | Uint8Array) => {
    const bytes = audio instanceof ArrayBuffer
      ? new Uint8Array(audio)
      : new Uint8Array(audio.buffer, audio.byteOffset, audio.byteLength);
    const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: "audio/mpeg" }));
    setHoneypotUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return url;
    });
    previousHoneypotUrl.current = url;
    honeypotPlayer.current?.pause();
    const player = new Audio(url);
    player.onplay = () => setIsHoneypotPlaying(true);
    player.onpause = () => setIsHoneypotPlaying(false);
    player.onended = () => setIsHoneypotPlaying(false);
    honeypotPlayer.current = player;
    void player.play().catch(() => {
      // El control visible del panel queda disponible si el navegador bloquea autoplay.
    });
  }, []);

  const handleChunk = useCallback(async (chunk: AudioChunk) => {
    setIsSending(true);
    setLastError("");
    try {
      const result = await evaluateAudio({
        callId,
        audioBuffer: chunk.buffer,
        mimeType: chunk.mimeType,
        duracionMs: chunk.duracionMs,
      });
      if (!result.ok) {
        setLastError("reason" in result ? result.reason : "TruthScan no devolvió un veredicto.");
      } else if (result.honeypotAudio) {
        playHoneypot(result.honeypotAudio);
      }
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "No se pudo analizar este segmento.");
    } finally {
      setIsSending(false);
    }
  }, [callId, evaluateAudio, playHoneypot]);

  const handleAudioError = useCallback((error: Error) => {
    setLastError(error.message);
  }, []);

  const { isRecording, start, stop } = useAudioDetection({
    onChunk: handleChunk,
    onError: handleAudioError,
  });

  useEffect(() => {
    if (!alerts) return;
    const newAlert = alerts.find((alert) => !knownAlertIds.current.has(alert._id));
    alerts.forEach((alert) => knownAlertIds.current.add(alert._id));
    if (newAlert) setActiveAlert(newAlert);
  }, [alerts]);

  useEffect(() => {
    return () => {
      honeypotPlayer.current?.pause();
      if (previousHoneypotUrl.current) URL.revokeObjectURL(previousHoneypotUrl.current);
    };
  }, []);

  const latestDetection = detections?.[detections.length - 1];
  const latestContent = contentAnalyses?.[contentAnalyses.length - 1];

  const toggleRecording = async () => {
    if (isRecording) stop();
    else await start();
  };

  const endCall = () => {
    stop();
    onEnd();
  };

  return (
    <main className="dashboard-shell">
      <AlertPopup alert={activeAlert} onClose={() => setActiveAlert(null)} />
      <header className="dashboard-header">
        <div className="brand-lockup"><div className="brand-mark brand-mark--small"><span>ET</span><i /></div><strong>EchoTrap</strong></div>
        <div className="live-indicator"><span /> {isRecording ? "Escuchando" : "Llamada lista"}</div>
      </header>

      <div className="dashboard-grid">
        <section className="dashboard-main">
          <div className="call-context">
            <div>
              <span className="eyebrow">Sesión activa</span>
              <h1>Protección en tiempo real</h1>
            </div>
            {call?.contactoConfianza && <span className="contact-badge">Aviso: {call.contactoConfianza}</span>}
          </div>

          <Semaphore
            verdict={latestDetection?.veredicto as "verde" | "amarillo" | "rojo" | undefined}
            score={latestDetection?.score}
            isLoading={isSending}
            errorMessage={lastError}
          />

          <div className="recording-controls">
            <button className={`record-button ${isRecording ? "record-button--active" : ""}`} type="button" onClick={toggleRecording}>
              <span className="record-button__dot" aria-hidden="true" />
              {isRecording ? "Detener detección" : "Escuchar esta llamada"}
            </button>
            <p>{isRecording ? "Se envía un segmento cada 5 segundos cuando hay voz." : "El micrófono permanece apagado hasta que lo actives."}</p>
          </div>

          <Timeline detections={detections ?? []} />
        </section>

        <aside className="dashboard-side">
          <EchoTrapPanel audioUrl={honeypotUrl} isPlaying={isHoneypotPlaying} transcript={latestContent?.transcript} />
          <ContentAnalysisPanel analysis={latestContent} />
          <button className="secondary-button" type="button" onClick={endCall}>Cerrar llamada</button>
        </aside>
      </div>
    </main>
  );
}
