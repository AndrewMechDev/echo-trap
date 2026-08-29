/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adapters_LocalWav2Vec2DetectionAdapter from "../adapters/LocalWav2Vec2DetectionAdapter.js";
import type * as adapters_TruthScanDetectionAdapter from "../adapters/TruthScanDetectionAdapter.js";
import type * as detections from "../detections.js";
import type * as domain_thresholds from "../domain/thresholds.js";
import type * as ports_TelephonyPort from "../ports/TelephonyPort.js";
import type * as ports_VoiceDetectionPort from "../ports/VoiceDetectionPort.js";
import type * as ports_VoiceSynthesisPort from "../ports/VoiceSynthesisPort.js";
import type * as usecases_evaluarAudio from "../usecases/evaluarAudio.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "adapters/LocalWav2Vec2DetectionAdapter": typeof adapters_LocalWav2Vec2DetectionAdapter;
  "adapters/TruthScanDetectionAdapter": typeof adapters_TruthScanDetectionAdapter;
  detections: typeof detections;
  "domain/thresholds": typeof domain_thresholds;
  "ports/TelephonyPort": typeof ports_TelephonyPort;
  "ports/VoiceDetectionPort": typeof ports_VoiceDetectionPort;
  "ports/VoiceSynthesisPort": typeof ports_VoiceSynthesisPort;
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
