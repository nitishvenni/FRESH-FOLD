import { NextFunction, Request, Response, Router } from "express";
import {
  FabricAnalysisSchema,
  FabricCandidate,
  FabricModelOutputSchema,
} from "./contracts";
import { logAiDiagnostic, toDiagnosticAiErrorCode } from "./diagnostics";
import { AiError, getAiRequestId } from "./errors";
import { aiImageUpload, toAiImageInput, validateAiImage } from "./imageInput";
import { buildFabricIdentificationInstructions } from "./prompts";
import { AiProvider } from "./provider";
import { createAiProvider } from "./providerFactory";

const fabricInputText =
  "Analyze this single image for visually plausible fabric candidates. Return only the requested structured output.";

/**
 * Keeps the provider's confidence values intact while making duplicate removal
 * and ranking deterministic for the public result.
 */
export const normalizeFabricCandidates = (
  candidates: readonly FabricCandidate[]
): FabricCandidate[] => {
  const highestConfidenceByFabric = new Map<string, FabricCandidate>();

  for (const candidate of candidates) {
    const existing = highestConfidenceByFabric.get(candidate.fabric);
    if (!existing || candidate.confidence > existing.confidence) {
      highestConfidenceByFabric.set(candidate.fabric, candidate);
    }
  }

  return [...highestConfidenceByFabric.values()].sort(
    (left, right) =>
      right.confidence - left.confidence || left.fabric.localeCompare(right.fabric, "en-US")
  );
};

/** Registers Phase D's standalone fabric-identification capability route. */
export const registerFabricIdentificationRoutes = (
  router: Router,
  provider: AiProvider = createAiProvider()
) => {
  router.post(
    "/fabric/analyze",
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
            instructions: buildFabricIdentificationInstructions(),
            input: {
              text: fabricInputText,
              images: [toAiImageInput(image)],
            },
            schema: FabricModelOutputSchema,
            schemaName: "fabric_identification",
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

        const providerOutput = FabricModelOutputSchema.safeParse(output);
        if (!providerOutput.success) {
          logAiDiagnostic({
            requestId,
            stage: "application_zod_validation",
            validationCategory: "schema_failed",
          });
          throw new AiError("AI_INVALID_PROVIDER_RESPONSE");
        }

        const parsedResult = FabricAnalysisSchema.safeParse({
          ...providerOutput.data,
          candidates: normalizeFabricCandidates(providerOutput.data.candidates),
          requestId,
          requiresUserReview: true,
        });

        if (!parsedResult.success) {
          logAiDiagnostic({
            requestId,
            stage: "application_zod_validation",
            validationCategory: "schema_failed",
          });
          throw new AiError("AI_INVALID_PROVIDER_RESPONSE");
        }

        logAiDiagnostic({
          requestId,
          stage: "application_zod_validation",
          validationCategory: "success",
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
