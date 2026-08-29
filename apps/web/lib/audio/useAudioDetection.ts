"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioCapture, type AudioChunk } from "./capture";

interface UseAudioDetectionOptions {
  onChunk: (chunk: AudioChunk) => Promise<void> | void;
  onError: (error: Error) => void;
}

export function useAudioDetection({ onChunk, onError }: UseAudioDetectionOptions) {
  const captureRef = useRef<AudioCapture | undefined>(undefined);
  const onChunkRef = useRef(onChunk);
  const onErrorRef = useRef(onError);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    onChunkRef.current = onChunk;
    onErrorRef.current = onError;
  }, [onChunk, onError]);

  const start = useCallback(async () => {
    if (captureRef.current) return;

    const capture = new AudioCapture(
      (chunk) => onChunkRef.current(chunk),
      (error) => onErrorRef.current(error),
    );
    captureRef.current = capture;
    try {
      await capture.start();
      setIsRecording(true);
    } catch {
      captureRef.current = undefined;
    }
  }, []);

  const stop = useCallback(() => {
    captureRef.current?.stop();
    captureRef.current = undefined;
    setIsRecording(false);
  }, []);

  useEffect(() => () => captureRef.current?.stop(), []);

  return { isRecording, start, stop };
}

export type { AudioChunk };
