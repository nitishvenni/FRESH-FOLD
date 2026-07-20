import mongoose from "mongoose";

export const AI_INTERACTION_CAPABILITIES = [
  "garment_recognition",
  "fabric_identification",
  "stain_detection",
  "care_label_reader",
  "natural_language_booking",
] as const;

export const AI_INTERACTION_OUTCOMES = [
  "complete",
  "partial",
  "no_match",
  "unreadable",
  "failed",
  "rate_limited",
  "cancelled",
] as const;

export const AI_CONFIDENCE_BUCKETS = ["high", "medium", "low", "unavailable"] as const;

const aiInteractionSchema = new mongoose.Schema(
  {
    capability: { type: String, enum: AI_INTERACTION_CAPABILITIES, required: true, immutable: true },
    source: { type: String, enum: ["typed", "voice"], default: undefined, immutable: true },
    requestId: { type: String, required: true, unique: true, immutable: true, index: true },
    // This internal ownership reference is used only to authorize lifecycle updates.
    userId: { type: String, required: true, immutable: true, select: false },
    // A reliably reported cancellation may replace an earlier in-progress outcome.
    outcome: { type: String, enum: AI_INTERACTION_OUTCOMES, required: true },
    confidenceBucket: { type: String, enum: AI_CONFIDENCE_BUCKETS, required: true, immutable: true },
    mappedCount: { type: Number, required: true, min: 0, max: 1000, immutable: true },
    unmappedCount: { type: Number, required: true, min: 0, max: 1000, immutable: true },
    correctionCount: { type: Number, required: true, min: 0, max: 50, default: 0 },
    reviewedAt: { type: Date, default: null },
    continuedToBooking: { type: Boolean, required: true, default: false },
    durationMs: { type: Number, min: 0, max: 120000, default: null, immutable: true },
    provider: { type: String, enum: ["openai", "gemini"], default: null, immutable: true },
    // A server-derived alias (vision/text), never a provider model ID or configuration object.
    modelAlias: { type: String, enum: ["vision", "text"], default: null, immutable: true },
    errorCode: { type: String, default: null, immutable: true },
    expiresAt: { type: Date, required: true, immutable: true },
  },
  { timestamps: true, strict: "throw", minimize: true }
);

aiInteractionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AiInteractionCapability = (typeof AI_INTERACTION_CAPABILITIES)[number];
export type AiInteractionOutcome = (typeof AI_INTERACTION_OUTCOMES)[number];
export type AiConfidenceBucket = (typeof AI_CONFIDENCE_BUCKETS)[number];

export default mongoose.models.AIInteraction ||
  mongoose.model("AIInteraction", aiInteractionSchema);
