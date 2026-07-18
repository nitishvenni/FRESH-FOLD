import type { StainCandidate, StainCareGuidance, StainType } from "./contracts";

type StainGuidanceInput = {
  status: "complete" | "partial" | "no_match" | "unreadable";
  stain: StainType | null;
  candidates: readonly StainCandidate[];
};

const guidance = (
  cleaningRecommendation: string | null,
  specialTreatment: string | null,
  safetyNotes: readonly string[]
): StainCareGuidance => ({
  cleaningRecommendation,
  specialTreatment,
  safetyNotes: [...safetyNotes],
  // Stain appearance alone is insufficient to select a booking service safely.
  serviceRecommendation: null,
});

const UNKNOWN_GUIDANCE = guidance(
  "Blot gently rather than rubbing, and check the garment care label before treatment.",
  "Avoid heat until the mark and fabric are better understood. Test any treatment on an inconspicuous area where appropriate.",
  [
    "Do not mix cleaning products.",
    "Consider professional cleaning for delicate, valuable, or uncertain garments.",
  ]
);

const AMBIGUOUS_GUIDANCE = guidance(
  "Blot gently rather than rubbing and follow the garment care label.",
  "Because more than one stain type is plausible, avoid heat and do not combine category-specific treatments.",
  [
    "Do not mix cleaning products.",
    "Test any treatment on an inconspicuous area where appropriate.",
    "Consider professional cleaning if the mark or fabric remains uncertain.",
  ]
);

const guidanceByStain: Record<Exclude<StainType, "unknown">, StainCareGuidance> = {
  coffee: guidance(
    "Blot promptly and rinse gently where the care label permits.",
    "Avoid heat until the mark has been treated and laundered according to the care label.",
    ["Do not rub aggressively.", "Test any treatment on an inconspicuous area where appropriate."]
  ),
  tea: guidance(
    "Blot promptly and rinse gently where the care label permits.",
    "Avoid heat until the mark has been treated and laundered according to the care label.",
    ["Do not rub aggressively.", "Test any treatment on an inconspicuous area where appropriate."]
  ),
  blood: guidance(
    "For a possible blood-like stain, use cool-water-oriented handling only where the care label permits.",
    "Avoid heat and aggressive rubbing; seek professional cleaning if the garment is delicate or the mark is uncertain.",
    ["This is visual guidance only and is not a medical or biological determination.", "Use appropriate hygiene precautions."]
  ),
  oil: guidance(
    "Blot or absorb excess oil gently, then use a mild grease-targeting pre-treatment only when fabric-safe.",
    "Avoid heat until the mark has been treated and check the care label before laundering.",
    ["Do not rub aggressively, which can spread absorbed oil.", "Test any treatment on an inconspicuous area where appropriate."]
  ),
  ink: guidance(
    "Blot carefully without rubbing or spreading the mark.",
    "Use a fabric-appropriate targeted treatment only where the care label permits, or seek professional cleaning when uncertain.",
    ["Do not use unverified treatments on delicate or color-sensitive garments.", "Test any treatment on an inconspicuous area where appropriate."]
  ),
  mud: guidance(
    "Allow loose surface soil to dry, then remove it gently where safe before laundering according to the care label.",
    "Avoid aggressive scraping or rubbing that may damage the fabric.",
    ["Test any treatment on an inconspicuous area where appropriate."]
  ),
  wine: guidance(
    "Blot promptly and rinse gently where the care label permits.",
    "Avoid heat until the mark has been treated and laundered according to the care label.",
    ["Do not rub aggressively.", "Test any treatment on an inconspicuous area where appropriate."]
  ),
  grass: guidance(
    "Use a fabric-safe pre-treatment where the care label permits, then launder as directed.",
    "Avoid heat until the mark has been treated.",
    ["Test any treatment on an inconspicuous area where appropriate."]
  ),
  sweat: guidance(
    "Launder according to the care label and use a fabric-safe pre-treatment where appropriate.",
    "Avoid aggressive treatment on delicate or color-sensitive fabric.",
    ["Test any treatment on an inconspicuous area where appropriate."]
  ),
  tomato_sauce: guidance(
    "Lift excess residue carefully, then use a fabric-safe pre-treatment where the care label permits.",
    "Avoid rubbing the residue deeper into the fabric and avoid heat until treated.",
    ["Test any treatment on an inconspicuous area where appropriate."]
  ),
  makeup: guidance(
    "Blot gently and use a fabric-safe pre-treatment only where the care label permits.",
    "Avoid rubbing, which can spread pigmented or oily residue.",
    ["Test any treatment on an inconspicuous area where appropriate."]
  ),
};

/** Maps a validated classification to bounded, non-binding guidance. */
export const getStainCareGuidance = (input: StainGuidanceInput): StainCareGuidance => {
  if (input.status === "no_match") {
    return guidance(null, null, ["No visible stain was identified in this image."]);
  }

  if (input.stain === "unknown") {
    return input.candidates.length > 0 ? AMBIGUOUS_GUIDANCE : UNKNOWN_GUIDANCE;
  }

  if (input.stain === null) {
    return UNKNOWN_GUIDANCE;
  }

  return guidanceByStain[input.stain];
};
