# Phase F — Care Label Reader

## Scope

Add care-label interpretation to AI Care. The feature reads visible care symbols and OCR-readable text, then returns structured washing, bleaching, drying, ironing, dry-cleaning, and plain-language instructions. It must identify unreadable regions and make clear that the original label image remains the source of truth.

## Architecture

Care-label reading uses the shared authenticated image route and strict result validation. The provider receives the image and returns only the approved care-label schema. The result preserves ambiguity rather than inferring missing label instructions.

OCR content is untrusted input. It is data to interpret, never instructions to follow or a way to alter the system prompt, catalog, pricing, or order flow.

## Dependencies

- Phase A image/provider/router/contracts foundation.
- AI Care entry point and shared image/result presentation.

## Expected files

Create or extend:

- care-label prompt/result configuration and test fixtures under `fresh-and-fold-backend/src/ai/`
- care-label-specific result presentation in the shared mobile analysis route/components

Modify:

- `fresh-and-fold-backend/src/ai/contracts.ts`
- `fresh-and-fold-backend/src/ai/prompts.ts`
- `fresh-and-fold-backend/src/ai/router.ts`
- `fresh-and-fold-mobile/app/ai-care.tsx`
- shared mobile AI service, types, and result route/components

## Implementation tasks

1. Add strict `CareLabelResult` validation for symbols, OCR snippets, categories, confidence, and unreadable regions.
2. Constrain output to visible/legible instructions and clear plain-language explanations.
3. Mark unreadable symbols or text rather than guessing missing instructions.
4. State that the image/label is the source of truth, especially for low-confidence interpretations.
5. Add AI Care navigation, retry, cancellation, and manual-care fallback states.

## Acceptance criteria

- Symbols and OCR text retain individual confidence where meaningful.
- Unreadable or uncertain regions are visible to the user.
- The feature can return `unreadable` without invented care directions.
- No care-label result updates an order or overrides the current pricing/service system.

## Testing requirements

- Fixtures for clear labels, symbols-only labels, text-only labels, low-light/blurred labels, partial labels, and unreadable labels.
- Contract tests for missing categories, unknown symbols, OCR uncertainty, and malformed output.
- Manual checks for image capture/cancel/retry/network/provider/timeout behavior.

## Security constraints

- Reuse Phase A in-memory processing, authentication, rate limits, and logging restrictions.
- Explicitly isolate OCR text from prompt instructions.
- Do not persist label photos or raw OCR by default.

## Dependencies on previous phases

Phase A is required. It can proceed independently from garment, fabric, and stain features.

## Explicitly out of scope

- Legal, medical, or warranty advice.
- Automatic modification of booking service or item selection.
- General document OCR outside garment care labels.
- Admin analytics.
