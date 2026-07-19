import { z } from "zod";

export const AnalysisStatusSchema = z.enum([
  "complete",
  "partial",
  "no_match",
  "unreadable",
]);

export const ConfidenceSchema = z.number().min(0).max(1);

export const DetectedGarmentSchema = z.object({
  /** A model-observed label, retained even when the catalog cannot support it. */
  detectedLabel: z.string().trim().min(1).max(120),
  /** Null means the image does not support a reliable count. */
  quantity: z.number().int().min(1).max(99).nullable(),
  confidence: ConfidenceSchema,
});

export type DetectedGarment = z.infer<typeof DetectedGarmentSchema>;

export const CatalogMappingStatusSchema = z.enum(["mapped", "unmapped"]);

export const MappedGarmentDetectionSchema = DetectedGarmentSchema.extend({
  normalizedLabel: z.string().min(1),
  catalogItemId: z.string().nullable(),
  mappingStatus: CatalogMappingStatusSchema,
});

export type MappedGarmentDetection = z.infer<typeof MappedGarmentDetectionSchema>;

/** Strict provider output: it never contains a canonical catalog ID. */
export const GarmentModelOutputSchema = z.object({
  status: AnalysisStatusSchema,
  detections: z.array(DetectedGarmentSchema).max(30),
  warnings: z.array(z.string().trim().min(1).max(240)).max(20),
});

export type GarmentModelOutput = z.infer<typeof GarmentModelOutputSchema>;

const ReviewedResultSchema = z.object({
  status: AnalysisStatusSchema,
  warnings: z.array(z.string().trim().min(1).max(240)).max(20),
  requestId: z.string().min(8).max(100),
  requiresUserReview: z.literal(true),
});

export const GarmentAnalysisSchema = ReviewedResultSchema.extend({
  detections: z.array(MappedGarmentDetectionSchema).max(30),
});

export const CareLabelAnalysisSchema = ReviewedResultSchema.extend({
  extractedText: z.string().trim().max(1_000).nullable(),
  confidence: ConfidenceSchema.nullable(),
});

export const ServiceIdSchema = z.enum(["wash", "dry", "express"]);

export const StainTypeSchema = z.enum([
  "coffee",
  "tea",
  "blood",
  "oil",
  "ink",
  "mud",
  "wine",
  "grass",
  "sweat",
  "tomato_sauce",
  "makeup",
  "unknown",
]);

export const KnownStainTypeSchema = z.enum([
  "coffee",
  "tea",
  "blood",
  "oil",
  "ink",
  "mud",
  "wine",
  "grass",
  "sweat",
  "tomato_sauce",
  "makeup",
]);

export type StainType = z.infer<typeof StainTypeSchema>;

export const StainCandidateSchema = z.object({
  stain: KnownStainTypeSchema,
  confidence: ConfidenceSchema,
});

export type StainCandidate = z.infer<typeof StainCandidateSchema>;

const validateFinalStainSemantics = (
  value: {
    status: z.infer<typeof AnalysisStatusSchema>;
    stain: StainType | null;
    confidence: number | null;
    candidates: readonly StainCandidate[];
  },
  context: z.RefinementCtx
) => {
  if (
    value.status === "no_match" &&
    (value.stain !== null || value.confidence !== null || value.candidates.length !== 0)
  ) {
    context.addIssue({
      code: "custom",
      message: "A no_match stain result must have null stain and confidence.",
      path: ["stain"],
    });
  }

  if (value.stain === null && value.status !== "no_match") {
    context.addIssue({
      code: "custom",
      message: "Only a no_match result may have a null stain.",
      path: ["stain"],
    });
  }

  if (value.stain === null && value.confidence !== null) {
    context.addIssue({
      code: "custom",
      message: "A null stain must have null confidence.",
      path: ["confidence"],
    });
  }

  if (
    value.status === "unreadable" &&
    (value.stain !== "unknown" || value.confidence !== null || value.candidates.length !== 0)
  ) {
    context.addIssue({
      code: "custom",
      message: "An unreadable stain result must be an unknown stain with no confidence or candidates.",
      path: ["stain"],
    });
  }

  const hasKnownPrimaryStain = value.stain !== null && value.stain !== "unknown";
  if (hasKnownPrimaryStain && (value.confidence === null || value.candidates.length !== 0)) {
    context.addIssue({
      code: "custom",
      message: "A known primary stain requires confidence and cannot include competing candidates.",
      path: ["confidence"],
    });
  }

  if (value.stain === "unknown" && value.confidence !== null) {
    context.addIssue({
      code: "custom",
      message: "An unknown stain cannot have a single primary confidence value.",
      path: ["confidence"],
    });
  }

  if (value.stain === "unknown" && value.candidates.length === 1) {
    context.addIssue({
      code: "custom",
      message: "An ambiguous stain requires at least two plausible candidates.",
      path: ["candidates"],
    });
  }

  if (value.stain === "unknown" && value.status !== "unreadable" && value.status !== "partial") {
    context.addIssue({
      code: "custom",
      message: "An unknown visible stain requires a partial result.",
      path: ["status"],
    });
  }

  const stains = value.candidates.map((candidate) => candidate.stain);
  if (new Set(stains).size !== stains.length) {
    context.addIssue({
      code: "custom",
      message: "Final stain candidates must be distinct.",
      path: ["candidates"],
    });
  }

  const candidatesAreSorted = value.candidates.every((candidate, index, candidates) => {
    const previous = candidates[index - 1];
    return (
      !previous ||
      previous.confidence > candidate.confidence ||
      (previous.confidence === candidate.confidence &&
        previous.stain.localeCompare(candidate.stain, "en-US") <= 0)
    );
  });
  if (!candidatesAreSorted) {
    context.addIssue({
      code: "custom",
      message: "Final stain candidates must use deterministic confidence ordering.",
      path: ["candidates"],
    });
  }
};

/** Advisory only; never a guarantee of removal, fabric safety, or color safety. */
export const StainCareGuidanceSchema = z.object({
  cleaningRecommendation: z.string().trim().min(1).max(240).nullable(),
  specialTreatment: z.string().trim().min(1).max(240).nullable(),
  safetyNotes: z.array(z.string().trim().min(1).max(240)).max(10),
  serviceRecommendation: ServiceIdSchema.nullable(),
});

export type StainCareGuidance = z.infer<typeof StainCareGuidanceSchema>;

/**
 * Type-safe but semantically permissive provider boundary for Phase E. The
 * application deterministically normalizes recoverable combinations before
 * validating the strict public StainAnalysisSchema.
 */
export const StainModelOutputSchema = z
  .object({
    status: AnalysisStatusSchema,
    stain: StainTypeSchema.nullable().optional().default(null),
    confidence: ConfidenceSchema.nullable().optional().default(null),
    candidates: z.array(StainCandidateSchema).max(10).optional().default([]),
    warnings: z.array(z.string().trim().min(1).max(240)).max(20).optional().default([]),
  });

export type StainModelOutput = z.infer<typeof StainModelOutputSchema>;

export const StainAnalysisSchema = ReviewedResultSchema.extend({
  stain: StainTypeSchema.nullable(),
  confidence: ConfidenceSchema.nullable(),
  candidates: z.array(StainCandidateSchema).max(3),
  careGuidance: StainCareGuidanceSchema,
}).superRefine(validateFinalStainSemantics);

export type StainAnalysis = z.infer<typeof StainAnalysisSchema>;

export const FabricTypeSchema = z.enum([
  "cotton",
  "linen",
  "silk",
  "wool",
  "polyester",
  "denim",
  "rayon",
  "other",
  "unknown",
]);

export const FabricCandidateSchema = z.object({
  fabric: FabricTypeSchema,
  confidence: ConfidenceSchema,
});

export type FabricCandidate = z.infer<typeof FabricCandidateSchema>;

/** Advisory guidance only; manufacturer care labels remain more authoritative. */
export const FabricCareGuidanceSchema = z.object({
  washing: z.string().trim().min(1).max(240).nullable(),
  drying: z.string().trim().min(1).max(240).nullable(),
  ironing: z.string().trim().min(1).max(240).nullable(),
  serviceRecommendation: ServiceIdSchema.nullable(),
});

export type FabricCareGuidance = z.infer<typeof FabricCareGuidanceSchema>;

/** Strict provider output for Phase D. It has no catalog, booking, or price data. */
export const FabricModelOutputSchema = z.object({
  status: AnalysisStatusSchema,
  candidates: z.array(FabricCandidateSchema).max(9),
  careGuidance: FabricCareGuidanceSchema,
  warnings: z.array(z.string().trim().min(1).max(240)).max(20),
});

export type FabricModelOutput = z.infer<typeof FabricModelOutputSchema>;

export const FabricAnalysisSchema = ReviewedResultSchema.extend({
  candidates: z.array(FabricCandidateSchema).max(9),
  careGuidance: FabricCareGuidanceSchema,
});

export type FabricAnalysis = z.infer<typeof FabricAnalysisSchema>;

export const BookingDraftSchema = ReviewedResultSchema.extend({
  source: z.enum(["manual", "smart_scan", "natural_language"]),
  items: z.array(MappedGarmentDetectionSchema).max(30),
  service: ServiceIdSchema.nullable(),
  pickupDate: z.string().date().nullable(),
  pickupSlot: z.string().trim().min(1).max(120).nullable(),
  pickupPreference: z.string().trim().min(1).max(240).nullable(),
  specialInstructions: z.string().trim().max(1_000).nullable(),
  unresolvedFields: z.array(z.string().trim().min(1).max(120)).max(20),
});

export type BookingDraft = z.infer<typeof BookingDraftSchema>;
