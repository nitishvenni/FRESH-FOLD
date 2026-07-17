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

export type GarmentRecognitionResult = {
  status: AiAnalysisStatus;
  warnings: string[];
  requestId: string;
  requiresUserReview: true;
  detections: MappedGarmentDetection[];
};
