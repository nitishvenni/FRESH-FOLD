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

/**
 * Keeps ambiguous output deterministic without promoting a single candidate.
 * The final response schema still requires zero or at least two candidates for
 * an unknown stain.
 */
export const normalizeStainOutput = (output: StainModelOutput): StainModelOutput => {
  const candidates = normalizeStainCandidates(output.candidates);

  if (output.stain === "unknown" && candidates.length < 2) {
    return {
      ...output,
      stain: "unknown",
      confidence: null,
      candidates: [],
    };
  }

  return { ...output, candidates };
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
        logAiDiagnostic({ requestId, stage: "response_completed" });
        return res.status(200).json(parsedResult.data);
      } catch (error) {
        return next(error);
      } finally {
        // Multer storage is memory-only. Clear this temporary buffer after use.
        uploadedFile?.buffer.fill(0);
      }
    }
  );
};
