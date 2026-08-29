/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as domain_thresholds from "../domain/thresholds.js";
import type * as ports_TelephonyPort from "../ports/TelephonyPort.js";
import type * as ports_VoiceDetectionPort from "../ports/VoiceDetectionPort.js";
import type * as ports_VoiceSynthesisPort from "../ports/VoiceSynthesisPort.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "domain/thresholds": typeof domain_thresholds;
  "ports/TelephonyPort": typeof ports_TelephonyPort;
  "ports/VoiceDetectionPort": typeof ports_VoiceDetectionPort;
  "ports/VoiceSynthesisPort": typeof ports_VoiceSynthesisPort;
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
