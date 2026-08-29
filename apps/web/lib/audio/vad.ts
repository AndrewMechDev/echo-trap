const DEFAULT_RMS_THRESHOLD = 0.018;

export function calculateRms(samples: Float32Array): number {
  if (samples.length === 0) return 0;

  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / samples.length);
}
export function hasVoiceActivity(
  samples: Float32Array,
  threshold = DEFAULT_RMS_THRESHOLD,
): boolean {
  return calculateRms(samples) >= threshold;
}
