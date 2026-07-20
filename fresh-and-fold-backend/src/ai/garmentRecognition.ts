import { NextFunction, Request, Response, Router } from "express";
import {
  GarmentAnalysisSchema,
  GarmentModelOutputSchema,
} from "./contracts";
import { mapDetectedGarment } from "./catalog";
import { logAiDiagnostic, toDiagnosticAiErrorCode } from "./diagnostics";
import { AiError, getAiRequestId } from "./errors";
import { aiImageUpload, toAiImageInput, validateAiImage } from "./imageInput";
import { buildGarmentRecognitionInstructions } from "./prompts";
import { createAiProvider } from "./providerFactory";
import { AiProvider } from "./provider";
import { confidenceBucketForValues, getAiInteractionUserId, outcomeFromStatus, recordAiInteraction } from "./interactionAnalytics";

const garmentInputText =
  "Analyze this single image for garments. Return only the requested structured output.";

/**
 * Registers Phase B's only capability route. It composes the Phase A provider,
 * image validation, contracts, request IDs, and deterministic catalog mapper.
 */
export const registerGarmentRecognitionRoutes = (
  router: Router,
  provider: AiProvider = createAiProvider()
) => {
  router.post(
    "/garments/analyze",
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

        let output;
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
            instructions: buildGarmentRecognitionInstructions(),
            input: {
              text: garmentInputText,
              images: [toAiImageInput(image)],
            },
            schema: GarmentModelOutputSchema,
            schemaName: "garment_recognition",
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

        const mappedDetections = output.detections.map(mapDetectedGarment);
        logAiDiagnostic({ requestId, stage: "deterministic_mapping_completed" });
        const parsedResult = GarmentAnalysisSchema.safeParse({
          ...output,
          requestId,
          requiresUserReview: true,
          detections: mappedDetections,
        });

        if (!parsedResult.success) {
          logAiDiagnostic({
            requestId,
            stage: "application_zod_validation",
            validationCategory: "schema_failed",
          });
          throw parsedResult.error;
        }

        logAiDiagnostic({
          requestId,
          stage: "application_zod_validation",
          validationCategory: "success",
        });
        const result = parsedResult.data;
        const userId = getAiInteractionUserId(req);
        if (userId) {
          void recordAiInteraction({ capability: "garment_recognition", requestId, userId,
            outcome: outcomeFromStatus(result.status), confidenceBucket: confidenceBucketForValues(result.detections.map((item) => item.confidence)),
            mappedCount: result.detections.filter((item) => item.mappingStatus === "mapped").length,
            unmappedCount: result.detections.filter((item) => item.mappingStatus === "unmapped").length,
            durationMs: Date.now() - startedAt,
            ...(providerContext.provider === "openai" || providerContext.provider === "gemini" ? { provider: providerContext.provider } : {}), modelAlias: "vision" });
        }
        logAiDiagnostic({ requestId, stage: "response_completed" });

        return res.status(200).json(result);
      } catch (error) {
        const userId = getAiInteractionUserId(req);
        if (userId) void recordAiInteraction({ capability: "garment_recognition", requestId, userId, outcome: "failed", confidenceBucket: "unavailable", durationMs: Date.now() - startedAt, ...(providerContext.provider === "openai" || providerContext.provider === "gemini" ? { provider: providerContext.provider } : {}), modelAlias: "vision", ...(error instanceof AiError ? { errorCode: error.code } : {}) });
        return next(error);
      } finally {
        // Multer storage is memory-only. Clear this temporary buffer after use.
        uploadedFile?.buffer.fill(0);
      }
    }
  );
};
