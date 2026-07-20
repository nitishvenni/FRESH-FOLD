import { NextFunction, Request, Response, Router } from "express";
import {
  StainAnalysisSchema,
  StainCandidate,
  StainModelOutput,
  StainModelOutputSchema,
} from "./contracts";
import {
  logAiDiagnostic,
  toDiagnosticAiErrorCode,
  toSafeAnalysisStatus,
  toSafeZodIssueDetails,
} from "./diagnostics";
import { AiError, getAiRequestId } from "./errors";
import { aiImageUpload, toAiImageInput, validateAiImage } from "./imageInput";
import { buildStainDetectionInstructions } from "./prompts";
import { AiProvider } from "./provider";
import { createAiProvider } from "./providerFactory";
import { getStainCareGuidance } from "./stainGuidance";
import { confidenceBucketForValues, getAiInteractionUserId, outcomeFromStatus, recordAiInteraction } from "./interactionAnalytics";

const stainInputText =
  "Analyze this single image for visible stains. Return only the requested structured output.";

/** Preserves provider confidence while making ambiguous candidates deterministic. */
export const normalizeStainCandidates = (
  candidates: readonly StainCandidate[]
): StainCandidate[] => {
  const highestConfidenceByStain = new Map<string, StainCandidate>();

  for (const candidate of candidates) {
    const existing = highestConfidenceByStain.get(candidate.stain);
    if (!existing || candidate.confidence > existing.confidence) {
      highestConfidenceByStain.set(candidate.stain, candidate);
    }
  }

  return [...highestConfidenceByStain.values()].sort(
    (left, right) =>
      right.confidence - left.confidence || left.stain.localeCompare(right.stain, "en-US")
  );
};

const boundedStainCandidates = (candidates: readonly StainCandidate[]): StainCandidate[] =>
  normalizeStainCandidates(candidates).slice(0, 3);

/**
 * Keeps ambiguous output deterministic without promoting a single candidate.
 * The final response schema still requires zero or at least two candidates for
 * an unknown stain.
 */
export const normalizeStainOutput = (output: StainModelOutput): StainModelOutput => {
  const candidates = boundedStainCandidates(output.candidates);

  // A provider-declared no_match must never be promoted to a stain result.
  if (output.status === "no_match") {
    return {
      ...output,
      stain: null,
      confidence: null,
      candidates: [],
    };
  }

  // An unreadable image cannot safely provide a stain classification.
  if (output.status === "unreadable") {
    return {
      ...output,
      stain: "unknown",
      confidence: null,
      candidates: [],
    };
  }

  // A missing provider stain is recoverable as a visible but unclassified mark.
  if (output.stain === null) {
    return {
      ...output,
      status: "partial",
      stain: "unknown",
      confidence: null,
      candidates: [],
    };
  }

  if (output.stain === "unknown") {
    return {
      ...output,
      status: "partial",
      stain: "unknown",
      confidence: null,
      candidates: candidates.length >= 2 ? candidates : [],
    };
  }

  // A known primary without a valid confidence cannot be promoted to certainty.
  if (output.confidence === null) {
    return {
      ...output,
      status: "partial",
      stain: "unknown",
      confidence: null,
      candidates: [],
    };
  }

  const hasDistinctCompetingCandidate = candidates.some(
    (candidate) => candidate.stain !== output.stain
  );
  if (!hasDistinctCompetingCandidate) {
    // Repeated copies of the provider's primary label do not create ambiguity.
    return { ...output, candidates: [] };
  }

  // A valid primary plus a distinct alternative is an ambiguous observation.
  // The primary confidence is retained only as that candidate's own advisory
  // score; it never becomes a new or recalibrated value.
  const ambiguousCandidates = boundedStainCandidates([
    ...candidates,
    { stain: output.stain, confidence: output.confidence },
  ]);
  return {
    ...output,
    status: "partial",
    stain: "unknown",
    confidence: null,
    candidates: ambiguousCandidates.length >= 2 ? ambiguousCandidates : [],
  };
};

/** Registers Phase E's standalone advisory stain-detection capability route. */
export const registerStainDetectionRoutes = (
  router: Router,
  provider: AiProvider = createAiProvider()
) => {
  router.post(
    "/stain/analyze",
    aiImageUpload.single("image"),
    async (req: Request, res: Response, next: NextFunction) => {
      const uploadedFile = req.file;
      const requestId = getAiRequestId(res);
      const startedAt = Date.now();
      const providerContext = provider.getDiagnosticContext?.("vision") ?? { provider: "unknown" };

      try {
        logAiDiagnostic({ requestId, stage: "image_validation_started" });
        const image = validateAiImage(uploadedFile);
        logAiDiagnostic({
          requestId,
          stage: "image_validation_completed",
          imageMimeType: image.mimetype,
          imageByteSize: image.size,
        });
        logAiDiagnostic({
          requestId,
          stage: "provider_selected",
          provider: providerContext.provider,
          ...(providerContext.model ? { model: providerContext.model } : {}),
        });

        let output: unknown;
        try {
          logAiDiagnostic({
            requestId,
            stage: "provider_request_started",
            provider: providerContext.provider,
            ...(providerContext.model ? { model: providerContext.model } : {}),
          });
          output = await provider.parse({
            requestId,
            modality: "vision",
            instructions: buildStainDetectionInstructions(),
            input: {
              text: stainInputText,
              images: [toAiImageInput(image)],
            },
            schema: StainModelOutputSchema,
            schemaName: "stain_detection",
          });
          logAiDiagnostic({
            requestId,
            stage: "provider_request_completed",
            provider: providerContext.provider,
            ...(providerContext.model ? { model: providerContext.model } : {}),
          });
        } catch (error) {
          logAiDiagnostic({
            requestId,
            stage: "provider_request_failed",
            provider: providerContext.provider,
            ...(providerContext.model ? { model: providerContext.model } : {}),
            errorCode: toDiagnosticAiErrorCode(error),
          });
          throw error;
        }

        const providerOutput = StainModelOutputSchema.safeParse(output);
        if (!providerOutput.success) {
          logAiDiagnostic({
            requestId,
            stage: "stain_provider_output_validation",
            validationCategory: "schema_failed",
            normalizedErrorCode: "AI_INVALID_PROVIDER_RESPONSE",
            ...toSafeZodIssueDetails(providerOutput.error),
            ...(toSafeAnalysisStatus(output) ? { status: toSafeAnalysisStatus(output) } : {}),
          });
          throw new AiError("AI_INVALID_PROVIDER_RESPONSE");
        }

        const normalizedOutput = normalizeStainOutput(providerOutput.data);
        logAiDiagnostic({
          requestId,
          stage: "stain_provider_output_validation",
          validationCategory: "success",
          status: normalizedOutput.status,
        });
        logAiDiagnostic({
          requestId,
          stage: "stain_candidate_normalization",
          validationCategory: "success",
          status: normalizedOutput.status,
        });
        const parsedResult = StainAnalysisSchema.safeParse({
          ...normalizedOutput,
          careGuidance: getStainCareGuidance({
            status: normalizedOutput.status,
            stain: normalizedOutput.stain,
            candidates: normalizedOutput.candidates,
          }),
          requestId,
          requiresUserReview: true,
        });
        if (!parsedResult.success) {
          logAiDiagnostic({
            requestId,
            stage: "stain_final_response_validation",
            validationCategory: "schema_failed",
            normalizedErrorCode: "AI_INVALID_PROVIDER_RESPONSE",
            ...toSafeZodIssueDetails(parsedResult.error),
            status: normalizedOutput.status,
          });
          throw new AiError("AI_INVALID_PROVIDER_RESPONSE");
        }

        logAiDiagnostic({
          requestId,
          stage: "stain_final_response_validation",
          validationCategory: "success",
          status: parsedResult.data.status,
        });
        const result = parsedResult.data;
        const userId = getAiInteractionUserId(req);
        if (userId) void recordAiInteraction({ capability: "stain_detection", requestId, userId, outcome: outcomeFromStatus(result.status), confidenceBucket: confidenceBucketForValues([result.confidence, ...result.candidates.map((item) => item.confidence)]), durationMs: Date.now() - startedAt, ...(providerContext.provider === "openai" || providerContext.provider === "gemini" ? { provider: providerContext.provider } : {}), modelAlias: "vision" });
        logAiDiagnostic({ requestId, stage: "response_completed" });
        return res.status(200).json(result);
      } catch (error) {
        const userId = getAiInteractionUserId(req);
        if (userId) void recordAiInteraction({ capability: "stain_detection", requestId, userId, outcome: "failed", confidenceBucket: "unavailable", durationMs: Date.now() - startedAt, ...(providerContext.provider === "openai" || providerContext.provider === "gemini" ? { provider: providerContext.provider } : {}), modelAlias: "vision", ...(error instanceof AiError ? { errorCode: error.code } : {}) });
        return next(error);
      } finally {
        // Multer storage is memory-only. Clear this temporary buffer after use.
        uploadedFile?.buffer.fill(0);
      }
    }
  );
};
