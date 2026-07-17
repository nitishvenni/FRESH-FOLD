import { NextFunction, Request, Response, Router } from "express";
import {
  GarmentAnalysisSchema,
  GarmentModelOutputSchema,
} from "./contracts";
import { mapDetectedGarment } from "./catalog";
import { getAiRequestId } from "./errors";
import { aiImageUpload, toAiImageInput, validateAiImage } from "./imageInput";
import { buildGarmentRecognitionInstructions } from "./prompts";
import { createAiProvider } from "./providerFactory";
import { AiProvider } from "./provider";

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

      try {
        const image = validateAiImage(uploadedFile);
        const output = await provider.parse({
          modality: "vision",
          instructions: buildGarmentRecognitionInstructions(),
          input: {
            text: garmentInputText,
            images: [toAiImageInput(image)],
          },
          schema: GarmentModelOutputSchema,
          schemaName: "garment_recognition",
        });

        const result = GarmentAnalysisSchema.parse({
          ...output,
          requestId: getAiRequestId(res),
          requiresUserReview: true,
          detections: output.detections.map(mapDetectedGarment),
        });

        return res.status(200).json(result);
      } catch (error) {
        return next(error);
      } finally {
        // Multer storage is memory-only. Clear this temporary buffer after use.
        uploadedFile?.buffer.fill(0);
      }
    }
  );
};
