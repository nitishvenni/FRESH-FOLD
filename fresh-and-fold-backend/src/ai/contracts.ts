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

export const FabricAnalysisSchema = ReviewedResultSchema.extend({
  detectedLabel: z.string().trim().min(1).max(120).nullable(),
  confidence: ConfidenceSchema.nullable(),
});

export const StainAnalysisSchema = ReviewedResultSchema.extend({
  detectedLabel: z.string().trim().min(1).max(120).nullable(),
  confidence: ConfidenceSchema.nullable(),
});

export const CareLabelAnalysisSchema = ReviewedResultSchema.extend({
  extractedText: z.string().trim().max(1_000).nullable(),
  confidence: ConfidenceSchema.nullable(),
});

export const ServiceIdSchema = z.enum(["wash", "dry", "express"]);

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
