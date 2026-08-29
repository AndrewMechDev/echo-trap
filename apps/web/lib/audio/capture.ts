import { convertirAWav } from "./convertToWav";
import { downsampleBuffer } from "./downsample";
import { hasVoiceActivity } from "./vad";
import { AUDIO_WORKLET_SOURCE } from "./worklet";

const SEGMENT_DURATION_MS = 5000;
const MINIMUM_AUDIO_MS = 4000;
const TARGET_SAMPLE_RATE = 16000;

export interface AudioChunk {
  buffer: ArrayBuffer;
  mimeType: "audio/wav";
  duracionMs: number;
}

type ChunkListener = (chunk: AudioChunk) => Promise<void> | void;
type ErrorListener = (error: Error) => void;

function elegirMimeType(): string {
  const candidatos = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidatos.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

function obtenerDuracionWav(buffer: ArrayBuffer): number {
  const vista = new DataView(buffer);
  if (buffer.byteLength < 44) return 0;

  const canales = vista.getUint16(22, true);
  const sampleRate = vista.getUint32(24, true);
  const bytesDeDatos = vista.getUint32(40, true);
  if (!canales || !sampleRate) return 0;

  return (bytesDeDatos / (canales * 2 * sampleRate)) * 1000;
}

export class AudioCapture {
  private mediaRecorder?: MediaRecorder;
  private mediaStream?: MediaStream;
  private audioContext?: AudioContext;
  private workletNode?: AudioWorkletNode;
  private segmentTimer?: number;
  private segmentParts: Blob[] = [];
  private segmentHasVoice = false;
  private stopping = false;
  private processingSegment = false;

  constructor(
    private readonly onChunk: ChunkListener,
    private readonly onError: ErrorListener,
  ) {}

  async start(): Promise<void> {
    if (this.mediaRecorder) return;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Este navegador no permite acceder al micrófono.");
      }

      const mimeType = elegirMimeType();
      if (!mimeType) {
        throw new Error("Este navegador no ofrece un formato de audio compatible.");
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new AudioContext();
      const workletBlob = new Blob([AUDIO_WORKLET_SOURCE], {
        type: "application/javascript",
      });
      const workletUrl = URL.createObjectURL(workletBlob);
      try {
        await this.audioContext.audioWorklet.addModule(workletUrl);
      } finally {
        URL.revokeObjectURL(workletUrl);
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, "echo-trap-vad");
      this.workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
        const samples = event.data;
        const audioAtTargetRate = downsampleBuffer(
          samples,
          this.audioContext?.sampleRate ?? TARGET_SAMPLE_RATE,
          TARGET_SAMPLE_RATE,
        );
        if (hasVoiceActivity(audioAtTargetRate)) {
          this.segmentHasVoice = true;
        }
      };

      // El nodo se conecta a una ganancia muda para que el navegador mantenga
      // activo el procesamiento sin reproducir la llamada por los parlantes.
      const silentOutput = this.audioContext.createGain();
      silentOutput.gain.value = 0;
      source.connect(this.workletNode);
      this.workletNode.connect(silentOutput);
      silentOutput.connect(this.audioContext.destination);

      this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType });
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.segmentParts.push(event.data);
      };
      this.mediaRecorder.onerror = () => {
        this.onError(new Error("El navegador dejó de entregar audio."));
      };
      this.mediaRecorder.onstop = () => {
        void this.finalizarSegmento(mimeType);
      };

      await this.audioContext.resume();
      this.iniciarSegmento();
    } catch (error) {
      await this.cleanup();
      this.onError(error instanceof Error ? error : new Error("No se pudo iniciar el micrófono."));
      throw error;
    }
  }

  stop(): void {
    this.stopping = true;
    if (this.segmentTimer) window.clearTimeout(this.segmentTimer);
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    } else {
      void this.cleanup();
    }
  }

  private iniciarSegmento() {
    if (!this.mediaRecorder || this.mediaRecorder.state !== "inactive") return;

    this.segmentParts = [];
    this.segmentHasVoice = false;
    this.mediaRecorder.start();
    this.segmentTimer = window.setTimeout(() => {
      if (this.mediaRecorder?.state === "recording") this.mediaRecorder.stop();
    }, SEGMENT_DURATION_MS);
  }

  private async finalizarSegmento(mimeType: string) {
    if (this.segmentTimer) window.clearTimeout(this.segmentTimer);
    if (this.processingSegment) return;
    this.processingSegment = true;

    const parts = this.segmentParts;
    const hadVoice = this.segmentHasVoice;
    this.segmentParts = [];
    this.segmentHasVoice = false;

    try {
      if (hadVoice && parts.length > 0) {
        const grabacion = new Blob(parts, { type: mimeType });
        const wav = await convertirAWav(grabacion);
        const duracionMs = obtenerDuracionWav(wav.buffer);

        // TruthScan devuelve un resultado inválido para cualquier clip menor
        // a cuatro segundos, aunque la API responda con status "done".
        if (duracionMs >= MINIMUM_AUDIO_MS) {
          await this.onChunk({ ...wav, duracionMs });
        }
      }
    } catch (error) {
      this.onError(error instanceof Error ? error : new Error("No se pudo preparar el audio."));
    } finally {
      this.processingSegment = false;
      if (!this.stopping) this.iniciarSegmento();
      else await this.cleanup();
    }
  }

  private async cleanup() {
    if (this.segmentTimer) window.clearTimeout(this.segmentTimer);
    this.segmentTimer = undefined;
    this.mediaRecorder = undefined;
    this.workletNode?.disconnect();
    this.workletNode = undefined;
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = undefined;
    if (this.audioContext) await this.audioContext.close();
    this.audioContext = undefined;
    this.stopping = false;
  }
}

