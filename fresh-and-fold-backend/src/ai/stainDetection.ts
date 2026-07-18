import { NextFunction, Request, Response, Router } from "express";
import { StainAnalysisSchema, StainModelOutputSchema } from "./contracts";
import { logAiDiagnostic, toDiagnosticAiErrorCode } from "./diagnostics";
import { AiError, getAiRequestId } from "./errors";
import { aiImageUpload, toAiImageInput, validateAiImage } from "./imageInput";
import { buildStainDetectionInstructions } from "./prompts";
import { AiProvider } from "./provider";
import { createAiProvider } from "./providerFactory";

const stainInputText =
  "Analyze this single image for visible stains. Return only the requested structured output.";

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
            stage: "application_zod_validation",
            validationCategory: "schema_failed",
          });
          throw new AiError("AI_INVALID_PROVIDER_RESPONSE");
        }

        const parsedResult = StainAnalysisSchema.safeParse({
          ...providerOutput.data,
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
