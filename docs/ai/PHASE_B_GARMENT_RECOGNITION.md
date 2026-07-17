# Phase B — Garment Recognition MVP

## Scope

Deliver image-based garment recognition using the Phase A shared image/provider path. The result identifies supported garments, quantities when confidently visible, confidence, deterministic catalog mapping, and a non-authoritative service recommendation. It prepares a reviewable booking draft; it does not enter payment or create an order.

## Architecture

The mobile Smart Scan entry captures or selects one image, normalizes it with the shared image utility, and sends it to `POST /ai/analyze` with the garment capability. The backend validates the image, requests strict garment output, validates it, maps labels to the existing catalog, and returns `GarmentRecognitionResult`.

The result has two separate responsibilities:

- AI data: detected label, count when visible, confidence, and warnings.
- Deterministic data: catalog mapping and optional price preview only when all needed inputs are known.

Weight remains `null`. Fresh & Fold has no defensible deterministic weight-estimation system or kilogram-based catalog. Delivery output is limited to existing static service turnaround if a service is determinable; no calendar delivery promise is made.

## Dependencies

- Phase A contracts, image pipeline, provider, rate limiter, and catalog mapper.
- Existing catalog IDs and backend pricing calculator.
- New AI-specific mobile screens/components permitted by the frozen-UI constraint.

## Expected files

Create:

- `fresh-and-fold-mobile/app/smart-scan.tsx`
- `fresh-and-fold-mobile/app/ai-analysis.tsx` or an equivalent shared result route
- garment-specific tests and fixtures under the appropriate backend/mobile test locations

Modify:

- `fresh-and-fold-backend/src/ai/prompts.ts`
- `fresh-and-fold-backend/src/ai/router.ts`
- `fresh-and-fold-mobile/services/aiService.ts`
- Home Smart Scan routing only as needed to open the new entry point

## Implementation tasks

1. Add the garment-analysis capability to the common router and provider prompt set.
2. Restrict accepted garment labels to the approved detection vocabulary plus `unknown`.
3. Map labels through the Phase A catalog mapper; do not let the model emit catalog IDs.
4. Build a garment result state that displays mapped, unmapped, multiple-item, low-confidence, and no-garment outcomes honestly.
5. Create a `BookingDraft` from mapped candidates while retaining unsupported/unresolved items and warnings.
6. Show an optional deterministic preview only when valid known quantities and a valid global service are present; label it as a preview.
7. Provide an explicit manual-booking action in every result state.

## Acceptance criteria

- Supported detected labels map only to actual catalog IDs.
- Saree, silk saree, suit, shoes, and other unsupported detections remain unresolved rather than being coerced into items.
- The user sees confidence and can distinguish detected labels from catalog mappings.
- No garment scan creates an order, starts payment, or declares a final amount.
- Estimated weight is not presented as a factual or calculated value.
- A no-garment, multi-garment, or low-confidence result remains usable through manual booking.

## Testing requirements

- Fixtures covering every supported item, aliases, multiple garments, obscured garments, unsupported garments, and no garment.
- Mapping and quantity edge-case tests, including `null` quantity for uncertain counts.
- Mobile tests/manual checks for cancel, gallery denial, camera denial, retry, network failure, and AI timeout.
- Contract tests proving price previews use deterministic calculator data only.

## Security constraints

- Use Phase A authenticated multipart upload and image limits.
- Do not retain garment images or write raw detections to logs.
- Do not include payment, address, or private customer data in the garment prompt.

## Dependencies on previous phases

Phase A is required.

## Explicitly out of scope

- Booking-flow prefill and user-editable confirmation; that is Phase C.
- Fabric, stain, and care-label analysis.
- Per-item services, weight estimates, or a new catalog.
- Admin analytics.
