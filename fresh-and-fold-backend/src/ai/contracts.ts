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

export const CareLabelCategorySchema = z.enum([
  "washing",
  "bleaching",
  "drying",
  "ironing",
  "dry_cleaning",
]);

export type CareLabelCategory = z.infer<typeof CareLabelCategorySchema>;

/** Conservative bounded vocabulary. Unrecognized label symbols remain uncertain. */
export const CareSymbolSchema = z.enum([
  "wash",
  "do_not_wash",
  "hand_wash",
  "bleach_allowed",
  "non_chlorine_bleach_only",
  "do_not_bleach",
  "tumble_dry",
  "do_not_tumble_dry",
  "line_dry",
  "dry_flat",
  "iron",
  "do_not_iron",
  "dry_clean",
  "do_not_dry_clean",
]);

export type CareSymbol = z.infer<typeof CareSymbolSchema>;

export const CareLabelReadingStatusSchema = z.enum([
  "recognized",
  "uncertain",
  "unreadable",
  "not_shown",
]);

export type CareLabelReadingStatus = z.infer<typeof CareLabelReadingStatusSchema>;

const CareLabelModelReadingSchema = z.object({
  category: CareLabelCategorySchema,
  status: CareLabelReadingStatusSchema,
  observedSymbol: CareSymbolSchema.nullable().optional().default(null),
  observedText: z.string().trim().min(1).max(240).nullable().optional().default(null),
  interpretation: z.string().trim().min(1).max(240).nullable().optional().default(null),
  confidence: ConfidenceSchema.nullable().optional().default(null),
});

export type CareLabelModelReading = z.infer<typeof CareLabelModelReadingSchema>;

/** Type-safe provider boundary; deterministic code repairs only safe semantic variation. */
export const CareLabelModelOutputSchema = z.object({
  status: AnalysisStatusSchema,
  extractedText: z.string().trim().min(1).max(1_000).nullable().optional().default(null),
  readings: z.array(CareLabelModelReadingSchema).max(10).optional().default([]),
  unreadableRegions: z.array(z.string().trim().min(1).max(120)).max(10).optional().default([]),
  warnings: z.array(z.string().trim().min(1).max(240)).max(20).optional().default([]),
});

export type CareLabelModelOutput = z.infer<typeof CareLabelModelOutputSchema>;

export const CareLabelReadingSchema = z.object({
  category: CareLabelCategorySchema,
  status: CareLabelReadingStatusSchema,
  observedSymbol: CareSymbolSchema.nullable(),
  observedText: z.string().trim().min(1).max(240).nullable(),
  interpretation: z.string().trim().min(1).max(240).nullable(),
  confidence: ConfidenceSchema.nullable(),
});

export type CareLabelReading = z.infer<typeof CareLabelReadingSchema>;

export const CARE_LABEL_CATEGORY_ORDER = [
  "washing",
  "bleaching",
  "drying",
  "ironing",
  "dry_cleaning",
] as const satisfies readonly CareLabelCategory[];

const validateCareLabelAnalysis = (
  value: {
    status: z.infer<typeof AnalysisStatusSchema>;
    extractedText: string | null;
    readings: readonly CareLabelReading[];
  },
  context: z.RefinementCtx
) => {
  const categories = value.readings.map((reading) => reading.category);
  const hasCanonicalOrder =
    categories.length === CARE_LABEL_CATEGORY_ORDER.length &&
    categories.every((category, index) => category === CARE_LABEL_CATEGORY_ORDER[index]);
  if (!hasCanonicalOrder) {
    context.addIssue({
      code: "custom",
      message: "Care-label readings must contain each category in canonical order.",
      path: ["readings"],
    });
  }

  for (const [index, reading] of value.readings.entries()) {
    const hasObservedEvidence = reading.observedSymbol !== null || reading.observedText !== null;
    if (
      reading.status === "recognized" &&
      (!hasObservedEvidence || reading.interpretation === null || reading.confidence === null)
    ) {
      context.addIssue({
        code: "custom",
        message: "A recognized care-label reading requires observed evidence, interpretation, and confidence.",
        path: ["readings", index],
      });
    }

    if (
      (reading.status === "uncertain" || reading.status === "unreadable") &&
      (reading.interpretation !== null || reading.confidence !== null)
    ) {
      context.addIssue({
        code: "custom",
        message: "Uncertain or unreadable readings cannot include an interpretation or confidence.",
        path: ["readings", index],
      });
    }

    if (
      reading.status === "not_shown" &&
      (reading.observedSymbol !== null ||
        reading.observedText !== null ||
        reading.interpretation !== null ||
        reading.confidence !== null)
    ) {
      context.addIssue({
        code: "custom",
        message: "A not_shown reading cannot contain observed or interpreted care data.",
        path: ["readings", index],
      });
    }
  }

  if (
    value.status === "no_match" &&
    (value.extractedText !== null || value.readings.some((reading) => reading.status !== "not_shown"))
  ) {
    context.addIssue({
      code: "custom",
      message: "A no_match result cannot contain care-label evidence.",
      path: ["status"],
    });
  }

  if (
    value.status === "unreadable" &&
    (value.extractedText !== null || value.readings.some((reading) => reading.status !== "unreadable"))
  ) {
    context.addIssue({
      code: "custom",
      message: "An unreadable result cannot contain a care-label interpretation.",
      path: ["status"],
    });
  }
};

export const CareLabelAnalysisSchema = ReviewedResultSchema.extend({
  extractedText: z.string().trim().min(1).max(1_000).nullable(),
  readings: z.array(CareLabelReadingSchema).length(CARE_LABEL_CATEGORY_ORDER.length),
  unreadableRegions: z.array(z.string().trim().min(1).max(120)).max(5),
}).superRefine(validateCareLabelAnalysis);

export type CareLabelAnalysis = z.infer<typeof CareLabelAnalysisSchema>;

export const ServiceIdSchema = z.enum(["wash", "dry", "express"]);
/** Phase G.1 booking dimensions; advisory AI output never carries a price. */
export const CleaningServiceSchema = z.enum(["wash", "dry"]);
export const FulfillmentSpeedSchema = z.enum(["standard", "express"]);

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
  cleaningService: CleaningServiceSchema.nullable(),
  speed: FulfillmentSpeedSchema.nullable(),
  pickupDate: z.string().date().nullable(),
  pickupSlot: z.string().trim().min(1).max(120).nullable(),
  pickupPreference: z.string().trim().min(1).max(240).nullable(),
  specialInstructions: z.string().trim().max(1_000).nullable(),
  unresolvedFields: z.array(z.string().trim().min(1).max(120)).max(20),
});

export type BookingDraft = z.infer<typeof BookingDraftSchema>;

/**
 * Phase G accepts only a bounded typed request. The source text is untrusted
 * data and is never returned by this contract.
 */
export const NaturalLanguageBookingRequestSchema = z
  .object({
    requestText: z.string().trim().min(1).max(1_000),
    // Analytics-only source. It never reaches prompts, booking logic, or responses.
    source: z.enum(["typed", "voice"]).optional(),
  })
  .strict();

export const NaturalLanguageBookingStatusSchema = z.enum(["complete", "partial", "no_match"]);

/** Only slots that exist in the current scheduler can be represented. */
export const PickupSlotSchema = z.enum([
  "9 AM - 12 PM",
  "12 PM - 3 PM",
  "3 PM - 6 PM",
]);

/** Bounded application fields make uncertainty reviewable without echoing raw text. */
export const BookingUnresolvedFieldSchema = z.enum([
  "items",
  "quantity",
  "cleaning_service",
  "speed",
  "pickup_date",
  "pickup_slot",
  "special_instructions",
]);

/**
 * Provider boundary for Phase G. It intentionally contains observed garment
 * labels, never catalog IDs or other authoritative booking values.
 */
export const NaturalLanguageBookingModelOutputSchema = z
  .object({
    status: NaturalLanguageBookingStatusSchema,
    items: z.array(DetectedGarmentSchema).max(30).optional().default([]),
    cleaningService: CleaningServiceSchema.nullable().optional().default(null),
    speed: FulfillmentSpeedSchema.nullable().optional().default(null),
    pickupDate: z.string().date().nullable().optional().default(null),
    pickupSlot: PickupSlotSchema.nullable().optional().default(null),
    pickupPreference: z.string().trim().min(1).max(240).nullable().optional().default(null),
    specialInstructions: z.string().trim().max(1_000).nullable().optional().default(null),
    unresolvedFields: z.array(BookingUnresolvedFieldSchema).max(20).optional().default([]),
    warnings: z.array(z.string().trim().min(1).max(240)).max(20).optional().default([]),
  })
  .strict();

export type NaturalLanguageBookingModelOutput = z.infer<
  typeof NaturalLanguageBookingModelOutputSchema
>;

const validateNaturalLanguageBookingResult = (
  value: {
    status: z.infer<typeof NaturalLanguageBookingStatusSchema>;
    items: readonly MappedGarmentDetection[];
    cleaningService: z.infer<typeof CleaningServiceSchema> | null;
    speed: z.infer<typeof FulfillmentSpeedSchema> | null;
    pickupDate: string | null;
    pickupSlot: z.infer<typeof PickupSlotSchema> | null;
    pickupPreference: string | null;
    specialInstructions: string | null;
    unresolvedFields: readonly z.infer<typeof BookingUnresolvedFieldSchema>[];
  },
  context: z.RefinementCtx
) => {
  const hasUnresolvedItems = value.items.some(
    (item) => item.mappingStatus !== "mapped" || item.catalogItemId === null || item.quantity === null
  );
  const hasAnyBookingDetail =
    value.items.length > 0 ||
    value.cleaningService !== null ||
    value.speed !== null ||
    value.pickupDate !== null ||
    value.pickupSlot !== null ||
    value.pickupPreference !== null ||
    value.specialInstructions !== null;

  if (value.status === "no_match") {
    if (hasAnyBookingDetail || value.unresolvedFields.length > 0) {
      context.addIssue({
        code: "custom",
        message: "A no_match result cannot include booking details.",
      });
    }
    return;
  }

  if (!hasAnyBookingDetail) {
    context.addIssue({
      code: "custom",
      message: "A booking result needs details or no_match status.",
    });
  }

  if (
    value.status === "complete" &&
    (hasUnresolvedItems || value.unresolvedFields.length > 0 || value.items.length === 0)
  ) {
    context.addIssue({
      code: "custom",
      message: "A complete booking result cannot retain unresolved information.",
    });
  }
};

/** Strict public Phase G result, after deterministic catalog mapping. */
export const NaturalLanguageBookingResultSchema = BookingDraftSchema.extend({
  status: NaturalLanguageBookingStatusSchema,
  source: z.literal("natural_language"),
  pickupSlot: PickupSlotSchema.nullable(),
  unresolvedFields: z.array(BookingUnresolvedFieldSchema).max(20),
})
  .strict()
  .superRefine(validateNaturalLanguageBookingResult);

export type NaturalLanguageBookingResult = z.infer<typeof NaturalLanguageBookingResultSchema>;
