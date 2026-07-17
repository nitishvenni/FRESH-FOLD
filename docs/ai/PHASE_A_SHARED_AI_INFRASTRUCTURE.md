# Phase A — Shared AI Infrastructure

## Scope

Create the reusable, secure backend and mobile foundations required by every Tier-1 AI capability. Phase A establishes contracts, deterministic catalog mapping, image validation, provider configuration, and common error/confidence behavior. It does not expose a user-facing AI capability with mocked results.

## Architecture

Phase A implements the common path described in the master roadmap:

```text
authenticated request → input validation → provider → strict schema validation
                      → deterministic mapping → reviewed result
```

OpenAI calls are backend-only. A reusable provider accepts a capability-specific prompt, image or text input, model alias, and strict output schema. The provider returns validated data to a capability router; routers do not parse arbitrary prose.

The catalog mapper is deterministic. It normalizes model labels and aliases, then returns either a real catalog ID or an explicit unmapped result. It is the only code allowed to assign catalog IDs to AI detections.

## Dependencies

- Backend environment configuration for `OPENAI_API_KEY`, `AI_VISION_MODEL`, `AI_TEXT_MODEL`, and timeout settings.
- OpenAI Node SDK, Zod, and multipart upload support added only to the backend.
- `expo-image-picker` and `expo-image-manipulator` are planned mobile dependencies for later image phases; they may be installed/configured in this phase without exposing the feature flow.
- Existing JWT middleware, API base URL, pricing calculator, and order preview endpoint.

## Expected files

Create:

- `fresh-and-fold-backend/src/ai/contracts.ts`
- `fresh-and-fold-backend/src/ai/catalog.ts`
- `fresh-and-fold-backend/src/ai/provider.ts`
- `fresh-and-fold-backend/src/ai/prompts.ts`
- `fresh-and-fold-backend/src/ai/imageInput.ts`
- `fresh-and-fold-backend/src/ai/router.ts`
- `fresh-and-fold-mobile/types/ai.ts`
- `fresh-and-fold-mobile/services/aiService.ts`
- `fresh-and-fold-mobile/utils/aiImage.ts`

Modify:

- backend `package.json`, lockfile, `src/index.ts`, and rate-limit middleware as needed to mount the authenticated AI router
- mobile `package.json`, lockfile, and `app.json` only for required picker/manipulation configuration
- backend deployment environment configuration; no secrets are committed

## Implementation tasks

1. Define runtime Zod schemas and matching TypeScript contracts for all analysis results and `BookingDraft`.
2. Define canonical catalog IDs, aliases, mapping statuses, and allowed service IDs from the existing catalog.
3. Implement a provider abstraction around the configured OpenAI Responses API model. Require strict structured output and validate the received result again with Zod.
4. Implement capability-specific prompts that treat image/OCR content as untrusted data and prohibit pricing, order placement, catalog invention, and false certainty.
5. Implement authenticated AI routes and consistent error translation, including provider timeout and invalid structured-output errors.
6. Add a dedicated AI rate limiter with per-user/IP limits and accurate retry information.
7. Add multipart image validation: one file, 5 MB server limit, accepted image MIME types, signature verification, and no filesystem persistence.
8. Add mobile type/service/image utilities that support the later screens without sending images or keys directly to OpenAI.
9. Ensure the existing `/orders/preview` calculator remains the only pricing authority.

## Acceptance criteria

- The backend has one reusable AI provider and one authenticated AI router; no disconnected feature-specific providers exist.
- A missing API key or model returns `AI_NOT_CONFIGURED` and no synthetic data.
- Invalid, oversized, multiple, or unsupported images are rejected before provider invocation.
- Catalog mapping can return only existing item IDs or `null` with an unmapped status.
- Contracts represent unknown, partial, low-confidence, unreadable, and review-required outcomes.
- Provider output that violates the contract is rejected with a safe error.
- No AI key, scan image, base64 payload, raw OCR, or full AI response is logged.

## Testing requirements

- Unit tests for label normalization and all mapped/unmapped aliases.
- Contract tests for valid, partial, unknown, and malformed provider outputs.
- Route tests for no authentication, rate limit, missing configuration, invalid MIME/signature, oversized input, timeout, and provider failure.
- Test fixtures must be licensed/synthetic and must not be user scan images.
- Verify existing `/orders/preview` output is unchanged for the supported catalog.

## Security constraints

- `OPENAI_API_KEY` is server-only and omitted from mobile config and source control.
- Use multipart requests only for image routes; do not set JSON content headers for them.
- Process images in memory and discard buffers after a response.
- Use JWT authentication before rate-limit accounting.
- Do not treat OCR text or detected labels as instructions.

## Dependencies on previous phases

None. This is the foundation phase.

## Explicitly out of scope

- User-facing scan screens and AI result views
- Real garment, stain, fabric, care-label, or natural-language inference flows
- Any order, payment, pricing, catalog, or Admin UI behavior change
- Persisting scan images or AI interaction analytics
