import type { ItemKey } from "../utils/bookingData";

export type AiErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_RATE_LIMITED"
  | "AI_INVALID_IMAGE"
  | "AI_IMAGE_TOO_LARGE"
  | "AI_UNSUPPORTED_IMAGE"
  | "AI_TIMEOUT"
  | "AI_PROVIDER_UNAVAILABLE"
  | "AI_INVALID_PROVIDER_RESPONSE";

export type AiErrorResponse = {
  code: AiErrorCode;
  message: string;
  retryable: boolean;
  requestId: string;
};

export type AiAnalysisStatus = "complete" | "partial" | "no_match" | "unreadable";

export type DetectedGarment = {
  detectedLabel: string;
  quantity: number | null;
  confidence: number;
};

export type MappedGarmentDetection = DetectedGarment & {
  normalizedLabel: string;
  /** null keeps unsupported labels useful without inventing a catalog entry. */
  catalogItemId: ItemKey | null;
  mappingStatus: "mapped" | "unmapped";
};

export type BookingDraft = {
  status: AiAnalysisStatus;
  warnings: string[];
  requestId: string;
  requiresUserReview: true;
  source: "manual" | "smart_scan" | "natural_language";
  items: MappedGarmentDetection[];
  service: "wash" | "dry" | "express" | null;
  pickupDate: string | null;
  pickupSlot: string | null;
  pickupPreference: string | null;
  specialInstructions: string | null;
  unresolvedFields: string[];
};

/** Local-only review state; it is never sent to pricing, payment, or order APIs. */
export type BookingReviewItem = {
  id: string;
  detectedLabel: string;
  catalogItemId: ItemKey | null;
  mappingStatus: "mapped" | "unmapped";
  quantity: number | null;
  confidence: number;
  removed: boolean;
};

/** Compact, transient route state for the existing /select-service screen. */
export type SmartScanBookingPrefill = {
  version: 1;
  source: "smart_scan";
  items: Partial<Record<ItemKey, number>>;
};

export type GarmentRecognitionResult = {
  status: AiAnalysisStatus;
  warnings: string[];
  requestId: string;
  requiresUserReview: true;
  detections: MappedGarmentDetection[];
};

export type FabricType =
  | "cotton"
  | "linen"
  | "silk"
  | "wool"
  | "polyester"
  | "denim"
  | "rayon"
  | "other"
  | "unknown";

export type FabricCandidate = {
  fabric: FabricType;
  confidence: number;
};

/** Guidance is advisory; garment care labels remain more authoritative. */
export type FabricCareGuidance = {
  washing: string | null;
  drying: string | null;
  ironing: string | null;
  serviceRecommendation: "wash" | "dry" | "express" | null;
};

export type FabricIdentificationResult = {
  status: AiAnalysisStatus;
  candidates: FabricCandidate[];
  careGuidance: FabricCareGuidance;
  warnings: string[];
  requestId: string;
  requiresUserReview: true;
};

export type StainType =
  | "coffee"
  | "blood"
  | "oil"
  | "ink"
  | "mud"
  | "wine"
  | "grass"
  | "sweat"
  | "unknown";

/** Advisory only; no stain-care result changes booking or pricing state. */
export type StainCareGuidance = {
  cleaningRecommendation: string | null;
  specialTreatment: string | null;
  safetyNotes: string[];
  serviceRecommendation: "wash" | "dry" | "express" | null;
};

export type StainAnalysisResult = {
  status: AiAnalysisStatus;
  stain: StainType | null;
  confidence: number | null;
  careGuidance: StainCareGuidance;
  warnings: string[];
  requestId: string;
  requiresUserReview: true;
};
