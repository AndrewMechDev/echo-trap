/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adapters_DeepgramTranscriptionAdapter from "../adapters/DeepgramTranscriptionAdapter.js";
import type * as adapters_DeepgramVoiceAdapter from "../adapters/DeepgramVoiceAdapter.js";
import type * as adapters_GeminiContentAnalysisAdapter from "../adapters/GeminiContentAnalysisAdapter.js";
import type * as adapters_MiniMaxContentAnalysisAdapter from "../adapters/MiniMaxContentAnalysisAdapter.js";
import type * as adapters_TavilyWebSearchAdapter from "../adapters/TavilyWebSearchAdapter.js";
import type * as adapters_TruthScanDetectionAdapter from "../adapters/TruthScanDetectionAdapter.js";
import type * as alerts from "../alerts.js";
import type * as calls from "../calls.js";
import type * as contenido from "../contenido.js";
import type * as detections from "../detections.js";
import type * as domain_thresholds from "../domain/thresholds.js";
import type * as honeypot from "../honeypot.js";
import type * as ports_AudioContentAnalysisPort from "../ports/AudioContentAnalysisPort.js";
import type * as ports_ContentAnalysisPort from "../ports/ContentAnalysisPort.js";
import type * as ports_TelephonyPort from "../ports/TelephonyPort.js";
import type * as ports_TranscriptionPort from "../ports/TranscriptionPort.js";
import type * as ports_VoiceDetectionPort from "../ports/VoiceDetectionPort.js";
import type * as ports_VoiceSynthesisPort from "../ports/VoiceSynthesisPort.js";
import type * as ports_WebSearchPort from "../ports/WebSearchPort.js";
import type * as usecases_activarHoneypot from "../usecases/activarHoneypot.js";
import type * as usecases_analizarContenido from "../usecases/analizarContenido.js";
import type * as usecases_evaluarAudio from "../usecases/evaluarAudio.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "adapters/DeepgramTranscriptionAdapter": typeof adapters_DeepgramTranscriptionAdapter;
  "adapters/DeepgramVoiceAdapter": typeof adapters_DeepgramVoiceAdapter;
  "adapters/GeminiContentAnalysisAdapter": typeof adapters_GeminiContentAnalysisAdapter;
  "adapters/MiniMaxContentAnalysisAdapter": typeof adapters_MiniMaxContentAnalysisAdapter;
  "adapters/TavilyWebSearchAdapter": typeof adapters_TavilyWebSearchAdapter;
  "adapters/TruthScanDetectionAdapter": typeof adapters_TruthScanDetectionAdapter;
  alerts: typeof alerts;
  calls: typeof calls;
  contenido: typeof contenido;
  detections: typeof detections;
  "domain/thresholds": typeof domain_thresholds;
  honeypot: typeof honeypot;
  "ports/AudioContentAnalysisPort": typeof ports_AudioContentAnalysisPort;
  "ports/ContentAnalysisPort": typeof ports_ContentAnalysisPort;
  "ports/TelephonyPort": typeof ports_TelephonyPort;
  "ports/TranscriptionPort": typeof ports_TranscriptionPort;
  "ports/VoiceDetectionPort": typeof ports_VoiceDetectionPort;
  "ports/VoiceSynthesisPort": typeof ports_VoiceSynthesisPort;
  "ports/WebSearchPort": typeof ports_WebSearchPort;
  "usecases/activarHoneypot": typeof usecases_activarHoneypot;
  "usecases/analizarContenido": typeof usecases_analizarContenido;
  "usecases/evaluarAudio": typeof usecases_evaluarAudio;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
