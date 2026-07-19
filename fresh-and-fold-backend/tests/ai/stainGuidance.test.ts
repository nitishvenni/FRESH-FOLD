import { describe, expect, it } from "vitest";
import { getStainCareGuidance } from "../../src/ai/stainGuidance";

const noCandidates = [] as const;

describe("deterministic stain guidance", () => {
  it("returns meaningfully different, bounded guidance for supported stains", () => {
    const coffee = getStainCareGuidance({ status: "complete", stain: "coffee", candidates: noCandidates });
    const oil = getStainCareGuidance({ status: "complete", stain: "oil", candidates: noCandidates });
    const tomatoSauce = getStainCareGuidance({ status: "complete", stain: "tomato_sauce", candidates: noCandidates });
    const mud = getStainCareGuidance({ status: "complete", stain: "mud", candidates: noCandidates });
    const blood = getStainCareGuidance({ status: "complete", stain: "blood", candidates: noCandidates });

    expect(oil.cleaningRecommendation).toContain("absorb excess oil");
    expect(tomatoSauce.cleaningRecommendation).toContain("Lift excess residue");
    expect(mud.cleaningRecommendation).toContain("surface soil");
    expect(blood.cleaningRecommendation).toContain("possible blood-like stain");
    expect(coffee.cleaningRecommendation).not.toBe(oil.cleaningRecommendation);
    expect(mud.cleaningRecommendation).not.toBe(coffee.cleaningRecommendation);
    expect(blood.safetyNotes.join(" ")).not.toMatch(/pathogen|definitely blood/i);
  });

  it("uses generic conservative guidance for unknown and ambiguous stains", () => {
    const unknown = getStainCareGuidance({ status: "partial", stain: "unknown", candidates: noCandidates });
    const ambiguous = getStainCareGuidance({
      status: "partial",
      stain: "unknown",
      candidates: [
        { stain: "coffee", confidence: 0.61 },
        { stain: "tea", confidence: 0.48 },
      ],
    });

    expect(unknown.specialTreatment).toContain("Avoid heat");
    expect(ambiguous.specialTreatment).toContain("do not combine category-specific treatments");
    expect(ambiguous.serviceRecommendation).toBeNull();
  });

  it("returns no treatment instruction for a no-stain result", () => {
    expect(getStainCareGuidance({ status: "no_match", stain: null, candidates: noCandidates })).toMatchObject({
      cleaningRecommendation: null,
      specialTreatment: null,
      serviceRecommendation: null,
    });
  });

  it("does not contain guarantees or hazardous chemical-mixing instructions", () => {
    const guidance = [
      getStainCareGuidance({ status: "complete", stain: "coffee", candidates: noCandidates }),
      getStainCareGuidance({ status: "complete", stain: "oil", candidates: noCandidates }),
      getStainCareGuidance({ status: "partial", stain: "unknown", candidates: noCandidates }),
    ];
    const allCopy = guidance
      .flatMap((entry) => [entry.cleaningRecommendation, entry.specialTreatment, ...entry.safetyNotes])
      .filter((value): value is string => typeof value === "string")
      .join(" ");

    expect(allCopy).not.toMatch(/guarantee|cannot damage|colorfast/i);
    expect(allCopy).not.toMatch(/bleach.*(ammonia|vinegar)|ammonia.*(bleach|vinegar)|vinegar.*(bleach|ammonia)/i);
  });
});
