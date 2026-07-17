# Phase H — Admin AI Operations Integration

## Scope

Add metadata-only AI operations analytics after the customer-facing capabilities are stable. This phase lets the Admin Console report real usage and quality indicators without storing scan images, raw OCR, raw natural-language requests, or full model responses.

## Architecture

Introduce an optional `AIInteraction` event/model separate from the existing support-specific `SupportInteraction` model. It records capability, outcome, confidence bucket, mapping/correction counts, draft continuation, duration, model alias, and request ID. It does not reuse support-ticket metrics for customer AI features.

Future Admin analytics aggregate metadata through a dedicated backend endpoint. The Admin Console consumes the aggregate only; it does not view original customer images or raw model prompts.

## Dependencies

- Phase A common request IDs, error codes, model aliases, and confidence contracts.
- Any customer-facing phases whose metrics are being reported: B/C for Smart Scan, D for fabric, E for stain, F for care labels, and G for natural-language booking.
- Existing Admin authentication, data context, analytics page, and backend admin middleware.

## Expected files

Create:

- `fresh-and-fold-backend/src/models/AIInteraction.ts`
- AI analytics aggregation/service module and tests

Modify:

- `fresh-and-fold-backend/src/index.ts` or the AI router to record metadata-only events
- backend admin routes/types as required for an AI analytics aggregate
- `fresh-and-fold-admin/src/admin/types.ts`
- `fresh-and-fold-admin/src/admin/AdminContext.tsx`
- Admin analytics page/components only for approved AI operations metrics

## Implementation tasks

1. Define the metadata-only interaction schema and retention approach.
2. Record successful, low-confidence, unreadable, failed, cancelled, and rate-limited outcomes without raw input.
3. Record mapped/unmapped counts and user correction counts in aggregate-friendly form.
4. Record whether a reviewed draft continued into manual booking; do not infer that it became a paid order unless a reliable existing linkage is available.
5. Add an authenticated aggregate endpoint for Smart Scan usage, garment-recognition confidence, manual corrections, fabric/stain/care-label usage, and natural-language booking usage.
6. Add Admin types/data loading and display the approved aggregate metrics.

## Acceptance criteria

- Analytics uses actual backend-recorded interaction metadata, not UI mock data.
- No stored event includes image binary/base64, OCR text, raw booking text, or full AI response.
- Existing support analytics remain intact and separate.
- Admin access remains protected by existing admin authentication.
- Metrics handle unavailable/zero data honestly.

## Testing requirements

- Model validation tests that reject raw image/text fields.
- Event creation tests for each capability and outcome.
- Aggregation tests for zero, partial, and multiple event datasets.
- Admin API authorization tests and UI tests for loading/error/empty states.

## Security constraints

- Metadata minimization is mandatory.
- Do not expose customer image data or AI prompts to Admin users.
- Keep admin endpoints behind existing admin middleware.
- Do not include API keys, provider responses, or internal stack traces in analytics output.

## Dependencies on previous phases

Phase A is required. Each reported metric additionally requires its corresponding customer-facing phase to be complete.

## Explicitly out of scope

- Admin-side image analysis, recommendations, or automated operational decisions.
- Backfilling historical data that was not recorded safely.
- Storing original images or customer message content for analytics.
- Any change to pricing, payment, order fulfillment, or support-ticket behavior.
