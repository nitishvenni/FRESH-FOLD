import { NextFunction, Request, Response, Router } from "express";
import {
  CARE_LABEL_CATEGORY_ORDER,
  CareLabelAnalysisSchema,
  CareLabelCategory,
  CareLabelModelOutput,
  CareLabelModelOutputSchema,
  CareLabelModelReading,
  CareLabelReading,
} from "./contracts";
import {
  logAiDiagnostic,
  toDiagnosticAiErrorCode,
  toSafeAnalysisStatus,
  toSafeZodIssueDetails,
} from "./diagnostics";
import { AiError, getAiRequestId } from "./errors";
import { aiImageUpload, toAiImageInput, validateAiImage } from "./imageInput";
import { buildCareLabelInstructions } from "./prompts";
import { AiProvider } from "./provider";
import { createAiProvider } from "./providerFactory";
import { confidenceBucketForValues, getAiInteractionUserId, outcomeFromStatus, recordAiInteraction } from "./interactionAnalytics";

const careLabelInputText =
  "Analyze this single image for visible garment care-label text and symbols. Return only the requested structured output.";

const blankReading = (
  category: CareLabelCategory,
  status: "unreadable" | "not_shown"
): CareLabelReading => ({
  category,
  status,
  observedSymbol: null,
  observedText: null,
  interpretation: null,
  confidence: null,
});

const toFinalReading = (reading: CareLabelModelReading): CareLabelReading => {
  const hasObservedEvidence = reading.observedSymbol !== null || reading.observedText !== null;

  if (
    reading.status === "recognized" &&
    hasObservedEvidence &&
    reading.interpretation !== null &&
    reading.confidence !== null
  ) {
    return reading;
  }

  if (reading.status === "not_shown") {
    return blankReading(reading.category, "not_shown");
  }

  if (reading.status === "uncertain" || reading.status === "unreadable") {
    return {
      category: reading.category,
      status: reading.status,
      observedSymbol: reading.observedSymbol,
      observedText: reading.observedText,
      interpretation: null,
      confidence: null,
    };
  }

  // Incomplete recognized evidence is never promoted to a care direction.
  return {
    category: reading.category,
    status: "uncertain",
    observedSymbol: reading.observedSymbol,
    observedText: reading.observedText,
    interpretation: null,
    confidence: null,
  };
};

const readingsConflict = (readings: readonly CareLabelReading[]): boolean =>
  new Set(
    readings.map((reading) =>
      JSON.stringify({
        status: reading.status,
        observedSymbol: reading.observedSymbol,
        observedText: reading.observedText,
        interpretation: reading.interpretation,
      })
    )
  ).size > 1;

const normalizeUnreadableRegions = (regions: readonly string[]): string[] =>
  [...new Set(regions)].slice(0, 5);

/**
 * Converts recoverable provider variations into the fixed, strict public care
 * label contract. It never invents text, symbols, confidence, or directions.
 */
export const normalizeCareLabelOutput = (output: CareLabelModelOutput) => {
  if (output.status === "no_match") {
    return {
      ...output,
      extractedText: null,
      readings: CARE_LABEL_CATEGORY_ORDER.map((category) => blankReading(category, "not_shown")),
      unreadableRegions: [],
    };
  }

  if (output.status === "unreadable") {
    return {
      ...output,
      extractedText: null,
      readings: CARE_LABEL_CATEGORY_ORDER.map((category) => blankReading(category, "unreadable")),
      unreadableRegions: normalizeUnreadableRegions(output.unreadableRegions),
    };
  }

  const readingsByCategory = new Map<CareLabelCategory, CareLabelReading[]>();
  for (const modelReading of output.readings) {
    const normalized = toFinalReading(modelReading);
    const existing = readingsByCategory.get(normalized.category) ?? [];
    existing.push(normalized);
    readingsByCategory.set(normalized.category, existing);
  }

  const readings = CARE_LABEL_CATEGORY_ORDER.map((category) => {
    const categoryReadings = readingsByCategory.get(category) ?? [];
    if (categoryReadings.length === 0) {
      return blankReading(category, "unreadable");
    }

    if (readingsConflict(categoryReadings)) {
      return {
        category,
        status: "uncertain" as const,
        observedSymbol: null,
        observedText: null,
        interpretation: null,
        confidence: null,
      };
    }

    return categoryReadings[0];
  });

  const containsUncertainReading = readings.some(
    (reading) => reading.status === "uncertain" || reading.status === "unreadable"
  );
  const containsRecognizedReading = readings.some((reading) => reading.status === "recognized");

  return {
    ...output,
    status: output.status === "complete" && (containsUncertainReading || !containsRecognizedReading)
      ? "partial"
      : output.status,
    readings,
    unreadableRegions: normalizeUnreadableRegions(output.unreadableRegions),
  };
};

/** Registers Phase F's standalone care-label reading capability route. */
export const registerCareLabelReaderRoutes = (
  router: Router,
  provider: AiProvider = createAiProvider()
) => {
  router.post(
    "/care-label/analyze",
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
            instructions: buildCareLabelInstructions(),
            input: { text: careLabelInputText, images: [toAiImageInput(image)] },
            schema: CareLabelModelOutputSchema,
            schemaName: "care_label_reader",
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

        const providerOutput = CareLabelModelOutputSchema.safeParse(output);
        if (!providerOutput.success) {
          logAiDiagnostic({
            requestId,
            stage: "care_label_provider_output_validation",
            validationCategory: "schema_failed",
            normalizedErrorCode: "AI_INVALID_PROVIDER_RESPONSE",
            ...toSafeZodIssueDetails(providerOutput.error),
            ...(toSafeAnalysisStatus(output) ? { status: toSafeAnalysisStatus(output) } : {}),
          });
          throw new AiError("AI_INVALID_PROVIDER_RESPONSE");
        }

        const normalizedOutput = normalizeCareLabelOutput(providerOutput.data);
        logAiDiagnostic({
          requestId,
          stage: "care_label_provider_output_validation",
          validationCategory: "success",
          status: normalizedOutput.status,
        });
        logAiDiagnostic({
          requestId,
          stage: "care_label_normalization",
          validationCategory: "success",
          status: normalizedOutput.status,
        });

        const parsedResult = CareLabelAnalysisSchema.safeParse({
          ...normalizedOutput,
          requestId,
          requiresUserReview: true,
        });
        if (!parsedResult.success) {
          logAiDiagnostic({
            requestId,
            stage: "care_label_final_response_validation",
            validationCategory: "schema_failed",
            normalizedErrorCode: "AI_INVALID_PROVIDER_RESPONSE",
            ...toSafeZodIssueDetails(parsedResult.error),
            status: normalizedOutput.status,
          });
          throw new AiError("AI_INVALID_PROVIDER_RESPONSE");
        }

        logAiDiagnostic({
          requestId,
          stage: "care_label_final_response_validation",
          validationCategory: "success",
          status: parsedResult.data.status,
        });
        const result = parsedResult.data;
        const userId = getAiInteractionUserId(req);
        if (userId) void recordAiInteraction({ capability: "care_label_reader", requestId, userId, outcome: outcomeFromStatus(result.status), confidenceBucket: confidenceBucketForValues(result.readings.map((item) => item.confidence)), durationMs: Date.now() - startedAt, ...(providerContext.provider === "openai" || providerContext.provider === "gemini" ? { provider: providerContext.provider } : {}), modelAlias: "vision" });
        logAiDiagnostic({ requestId, stage: "response_completed" });
        return res.status(200).json(result);
      } catch (error) {
        const userId = getAiInteractionUserId(req);
        if (userId) void recordAiInteraction({ capability: "care_label_reader", requestId, userId, outcome: "failed", confidenceBucket: "unavailable", durationMs: Date.now() - startedAt, ...(providerContext.provider === "openai" || providerContext.provider === "gemini" ? { provider: providerContext.provider } : {}), modelAlias: "vision", ...(error instanceof AiError ? { errorCode: error.code } : {}) });
        return next(error);
      } finally {
        uploadedFile?.buffer.fill(0);
      }
    }
  );
};
