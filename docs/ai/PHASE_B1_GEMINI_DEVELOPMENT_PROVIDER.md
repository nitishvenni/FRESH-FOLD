# Phase B.1 — Gemini Development Provider Adapter

## Purpose

Phase B.1 adds Gemini as an optional backend development/testing provider behind the existing `AiProvider` abstraction. OpenAI remains the default provider and no mobile client receives provider configuration or credentials.

## Provider selection

Set `AI_PROVIDER` on the backend only:

```env
# Omit this variable, or set it to openai, to use the existing OpenAI Responses provider.
AI_PROVIDER=gemini
GEMINI_API_KEY=your_local_gemini_key
GEMINI_VISION_MODEL=your_configured_gemini_vision_model
GEMINI_TEXT_MODEL=your_configured_gemini_text_model
AI_REQUEST_TIMEOUT_MS=30000
```

Restart the backend after changing environment variables. To return to OpenAI, set `AI_PROVIDER=openai` and provide `OPENAI_API_KEY`, `AI_VISION_MODEL`, and `AI_TEXT_MODEL`. There is no automatic fallback between providers.

## Request handling and privacy

Gemini receives a transient base64 inline image through the official `@google/genai` Interactions API. The backend uses `store: false`, does not use the Files API, clears the Multer buffer after the request, and does not log image bytes, base64 payloads, provider output, or credentials.

The provider requests JSON-schema structured output, then parses that JSON and validates it again with the existing application Zod schema. The deterministic Fresh & Fold catalog mapper remains the only component that can assign `catalogItemId`.

## Local manual verification

1. Add a valid Gemini key and vision-capable model name to the backend `.env`; never add those values to mobile configuration or commit them.
2. Start the backend and authenticate through the existing mobile app.
3. Submit a Smart Scan image and confirm `POST /ai/garments/analyze` retains its existing response shape, request ID, and mapped/unmapped garment behavior.
4. Temporarily remove `GEMINI_API_KEY` or `GEMINI_VISION_MODEL`; confirm the endpoint returns `AI_NOT_CONFIGURED` and no mocked result.
5. Restore OpenAI configuration with `AI_PROVIDER=openai`; repeat the request and confirm provider selection requires no mobile change.
6. Review backend logs during both flows: no raw image, base64 data, Gemini response body, or secret should be present.

No real Gemini request is made by the automated test suite.
