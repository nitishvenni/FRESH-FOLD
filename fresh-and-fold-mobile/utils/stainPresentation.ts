import type { StainType } from "../types/ai";

export const ambiguousStainDisclaimer =
  "Appearance alone may not reliably identify what caused the stain.";

/** Uses cautious, user-facing labels for advisory stain results. */
export const formatStainLabel = (stain: StainType | null): string => {
  if (stain === null) return "No stain detected";
  if (stain === "unknown") return "Unknown stain";
  if (stain === "blood") return "Possible blood-like stain";
  if (stain === "tomato_sauce") return "Tomato / food sauce";
  return `${stain[0].toUpperCase()}${stain.slice(1)} stain`;
};
