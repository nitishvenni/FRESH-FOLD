# Phase D — Fabric Identification

## Scope

Add fabric identification to AI Care using the shared image pipeline. The feature returns ranked candidates for cotton, linen, silk, wool, polyester, denim, rayon, other, or unknown; it provides cautious washing, drying, ironing, and service guidance.

## Architecture

Fabric identification is a distinct capability of the shared `POST /ai/analyze` image route. It uses the Phase A provider, result contracts, timeout/error handling, and image validation. The result may contain multiple candidate fabrics and must support `unknown` without a forced primary prediction.

Fabric advice is guidance, not a guarantee. It does not modify an order unless a user separately chooses to start manual booking.

## Dependencies

- Phase A image pipeline, provider, contracts, and care-result presentation support.
- AI Care as the entry point.

## Expected files

Create or extend:

- fabric prompt/result configuration under `fresh-and-fold-backend/src/ai/`
- fabric-specific result presentation and tests

Modify:

- `fresh-and-fold-backend/src/ai/contracts.ts`
- `fresh-and-fold-backend/src/ai/prompts.ts`
- `fresh-and-fold-backend/src/ai/router.ts`
- `fresh-and-fold-mobile/app/ai-care.tsx`
- shared mobile analysis result route/components and AI service/types

## Implementation tasks

1. Add the fabric capability and strict `FabricIdentificationResult` validation.
2. Require a ranked candidate list with confidence values and allow unknown/other as valid outcomes.
3. Return recommendations for washing, drying, and ironing that reflect uncertainty and do not override a care label.
4. Return an optional service recommendation only from allowed existing service IDs.
5. Add AI Care navigation to image capture/gallery and a result state that explains low confidence and multiple candidates.
6. Keep a manual-booking exit available without creating a booking automatically.

## Acceptance criteria

- A result can contain multiple plausible fabrics or only `unknown`.
- Low confidence is visible and never phrased as a definitive fabric diagnosis.
- Care-label information, when available to the user, is presented as the source of truth over image inference.
- No fabric result changes catalog, pricing, service, or order state without user action.

## Testing requirements

- Contract tests for high, low, multiple, unknown, and malformed candidate results.
- Fixtures for common supported fabric classes and ambiguous visual cases.
- Mobile tests/manual checks for image permission, cancellation, unreadable image, timeout, retry, and manual fallback.

## Security constraints

- Reuse Phase A image and authentication controls exactly.
- Do not log fabric photos or raw model output.
- Do not present washing advice as a safety guarantee when confidence is low.

## Dependencies on previous phases

Phase A is required. It does not require garment recognition or booking-draft integration.

## Explicitly out of scope

- Automatic wash-cycle control or any external appliance integration.
- Care-label OCR; that is Phase F.
- Automatic booking and per-item service assignment.
- Admin analytics.
