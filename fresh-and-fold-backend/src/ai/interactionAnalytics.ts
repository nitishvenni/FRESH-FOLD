import { z } from "zod";
import express, { NextFunction, Request, Response, Router } from "express";
import AIInteraction, {
  AI_CONFIDENCE_BUCKETS,
  AI_INTERACTION_CAPABILITIES,
  AI_INTERACTION_OUTCOMES,
  type AiConfidenceBucket,
  type AiInteractionCapability,
  type AiInteractionOutcome,
} from "../models/AIInteraction";
import { logAiDiagnostic } from "./diagnostics";
import type { AiErrorCode } from "./errors";
import { AiError, getAiRequestId } from "./errors";

const RETENTION_DAYS = 90;
export const MAX_CORRECTION_COUNT = 50;

export const confidenceBucketFor = (confidence: number | null | undefined): AiConfidenceBucket => {
  if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return "unavailable";
  }
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
};

export const confidenceBucketForValues = (values: readonly (number | null | undefined)[]) => {
  const meaningful = values.filter((value): value is number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
  );
  return confidenceBucketFor(meaningful.length ? Math.max(...meaningful) : null);
};

export const interactionExpiresAt = (createdAt = new Date()): Date =>
  new Date(createdAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);

export const outcomeFromStatus = (status: unknown): Extract<AiInteractionOutcome, "complete" | "partial" | "no_match" | "unreadable"> => {
  switch (status) {
    case "complete": case "partial": case "no_match": case "unreadable": return status;
    default: return "partial";
  }
};

export type InteractionRecord = {
  capability: AiInteractionCapability;
  requestId: string;
  userId: string;
  outcome: AiInteractionOutcome;
  confidenceBucket?: AiConfidenceBucket;
  mappedCount?: number;
  unmappedCount?: number;
  durationMs?: number;
  provider?: "openai" | "gemini";
  modelAlias?: "vision" | "text";
  errorCode?: AiErrorCode;
  source?: "typed" | "voice";
};

export const getAiInteractionUserId = (request: Request): string | null => {
  const user = (request as Request & { user?: unknown }).user;
  if (!user || typeof user !== "object") return null;
  const candidate = (user as { userId?: unknown; id?: unknown; _id?: unknown }).userId ??
    (user as { id?: unknown }).id ?? (user as { _id?: unknown })._id;
  const value = typeof candidate === "string" ? candidate.trim() : "";
  return value && value.length <= 128 ? value : null;
};

const boundedCount = (value: number | undefined) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? Math.min(value, 1000) : 0;
const boundedDuration = (value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.min(Math.round(value), 120000) : undefined;

/** Best-effort only: callers deliberately do not await this write. */
export const recordAiInteraction = async (record: InteractionRecord): Promise<void> => {
  try {
    await AIInteraction.updateOne(
      { requestId: record.requestId },
      { $setOnInsert: {
        capability: record.capability, requestId: record.requestId, userId: record.userId,
        outcome: record.outcome, confidenceBucket: record.confidenceBucket ?? "unavailable",
        mappedCount: boundedCount(record.mappedCount), unmappedCount: boundedCount(record.unmappedCount),
        correctionCount: 0, continuedToBooking: false, ...(boundedDuration(record.durationMs) !== undefined ? { durationMs: boundedDuration(record.durationMs) } : {}),
        ...(record.provider === "openai" || record.provider === "gemini" ? { provider: record.provider } : {}),
        ...(record.modelAlias ? { modelAlias: record.modelAlias } : {}),
        ...(record.errorCode ? { errorCode: record.errorCode } : {}),
        ...(record.source ? { source: record.source } : {}), expiresAt: interactionExpiresAt(),
      } },
      { upsert: true }
    ).exec();
    logAiDiagnostic({ requestId: record.requestId, stage: "ai_interaction_recorded" });
  } catch {
    logAiDiagnostic({ requestId: record.requestId, stage: "ai_interaction_record_failed" });
  }
};

export const AiInteractionEventSchema = z.object({
  requestId: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/),
  event: z.enum(["reviewed", "continued_to_booking", "cancelled"]),
  correctionCount: z.number().int().min(0).max(MAX_CORRECTION_COUNT).optional(),
}).strict();
export type AiInteractionEvent = z.infer<typeof AiInteractionEventSchema>;

export const applyAiInteractionEvent = async (userId: string, event: AiInteractionEvent): Promise<boolean> => {
  if (event.event === "reviewed") {
    const result = await AIInteraction.updateOne(
      { requestId: event.requestId, userId, reviewedAt: null },
      { $set: { reviewedAt: new Date(), ...(event.correctionCount !== undefined ? { correctionCount: event.correctionCount } : {}) } }
    ).exec();
    if (result.matchedCount === 1) return true;
    return (await AIInteraction.exists({ requestId: event.requestId, userId })) !== null;
  }
  const update = event.event === "continued_to_booking"
    ? { $set: { continuedToBooking: true } }
    : { $set: { outcome: "cancelled" } };
  const result = await AIInteraction.updateOne({ requestId: event.requestId, userId }, update).exec();
  return result.matchedCount === 1;
};

/** Capability-local, authenticated lifecycle endpoint. It has no provider call. */
export const registerAiInteractionEventRoutes = (router: Router) => {
  router.post("/events", express.json(), async (req: Request, res: Response, next: NextFunction) => {
    const requestId = getAiRequestId(res);
    const parsed = AiInteractionEventSchema.safeParse(req.body);
    if (!parsed.success) {
      logAiDiagnostic({ requestId, stage: "ai_interaction_event_rejected", errorCode: "AI_INVALID_REQUEST" });
      return next(new AiError("AI_INVALID_REQUEST"));
    }
    const userId = getAiInteractionUserId(req);
    if (!userId) {
      logAiDiagnostic({ requestId, stage: "ai_interaction_event_rejected", errorCode: "AI_INVALID_REQUEST" });
      return next(new AiError("AI_INVALID_REQUEST"));
    }
    try {
      const updated = await applyAiInteractionEvent(userId, parsed.data);
      if (!updated) {
        logAiDiagnostic({ requestId, stage: "ai_interaction_event_rejected", errorCode: "AI_INVALID_REQUEST" });
        return next(new AiError("AI_INVALID_REQUEST"));
      }
      logAiDiagnostic({ requestId, stage: "ai_interaction_event_received" });
      return res.status(200).json({ success: true, requestId });
    } catch {
      logAiDiagnostic({ requestId, stage: "ai_interaction_event_rejected", errorCode: "AI_PROVIDER_UNAVAILABLE" });
      return next(new AiError("AI_PROVIDER_UNAVAILABLE"));
    }
  });
};

export const aggregateAiInteractions = async (from: Date, to: Date) => {
  const rows = await AIInteraction.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $facet: {
      total: [{ $count: "count" }],
      capability: [{ $group: { _id: "$capability", count: { $sum: 1 } } }],
      outcome: [{ $group: { _id: "$outcome", count: { $sum: 1 } } }],
      confidence: [{ $group: { _id: "$confidenceBucket", count: { $sum: 1 } } }],
      source: [{ $match: { source: { $in: ["typed", "voice"] } } }, { $group: { _id: "$source", count: { $sum: 1 } } }],
      totals: [{ $group: { _id: null, mappedCount: { $sum: "$mappedCount" }, unmappedCount: { $sum: "$unmappedCount" }, correctionCount: { $sum: "$correctionCount" }, reviewedCount: { $sum: { $cond: [{ $ne: ["$reviewedAt", null] }, 1, 0] } }, continuedToBookingCount: { $sum: { $cond: ["$continuedToBooking", 1, 0] } }, averageMs: { $avg: "$durationMs" } } }],
    } },
  ]).exec();
  const row = rows[0] ?? {};
  const fill = (values: readonly string[], source: Array<{ _id: string; count: number }> = []) =>
    values.map((key) => ({ [values === AI_CONFIDENCE_BUCKETS ? "bucket" : values === AI_INTERACTION_CAPABILITIES ? "capability" : values === AI_INTERACTION_OUTCOMES ? "outcome" : "source"]: key, count: source.find((item) => item._id === key)?.count ?? 0 }));
  const total = row.totals?.[0] ?? {};
  return {
    totalInteractions: row.total?.[0]?.count ?? 0,
    byCapability: fill(AI_INTERACTION_CAPABILITIES, row.capability), byOutcome: fill(AI_INTERACTION_OUTCOMES, row.outcome),
    confidenceBuckets: fill(AI_CONFIDENCE_BUCKETS, row.confidence),
    bySource: fill(["typed", "voice"], row.source),
    mapping: { mappedCount: total.mappedCount ?? 0, unmappedCount: total.unmappedCount ?? 0 },
    review: { reviewedCount: total.reviewedCount ?? 0, continuedToBookingCount: total.continuedToBookingCount ?? 0, correctionCount: total.correctionCount ?? 0 },
    duration: { averageMs: typeof total.averageMs === "number" ? Math.round(total.averageMs) : null },
  };
};
