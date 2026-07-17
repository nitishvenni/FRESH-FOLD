# Phase E — Stain Detection

## Scope

Add stain detection to AI Care using the shared image pipeline. The feature attempts to identify coffee, blood, oil, ink, mud, wine, grass, sweat, or unknown. It returns confidence, a cautious cleaning recommendation, optional allowed service recommendation, special-treatment guidance, and safety/care notes.

## Architecture

Stain detection is another capability of the common authenticated image-analysis route. The structured result explicitly supports `unknown`, no stain detected, and low confidence. It is care guidance only and has no automatic effect on an order.

## Dependencies

- Phase A provider, upload validation, structured contracts, errors, and rate limits.
- AI Care entry point and shared analysis result presentation.

## Expected files

Create or extend:

- stain prompt/result configuration and tests under `fresh-and-fold-backend/src/ai/`
- stain-specific content in the shared mobile analysis result presentation

Modify:

- `fresh-and-fold-backend/src/ai/contracts.ts`
- `fresh-and-fold-backend/src/ai/prompts.ts`
- `fresh-and-fold-backend/src/ai/router.ts`
- `fresh-and-fold-mobile/app/ai-care.tsx`
- shared mobile AI service, types, and result route/components

## Implementation tasks

1. Add strict `StainDetectionResult` validation and constrained stain labels.
2. Prompt for uncertainty-aware assessment, recommended method, special treatment, and safety notes.
3. Require `unknown` or partial output when a stain cannot be confidently identified.
4. Ensure recommendations are non-binding and use only existing service IDs when a service is suggested.
5. Add the AI Care stain entry and result/retry/manual-booking paths.

## Acceptance criteria

- The feature can clearly say no stain is detected or the stain is uncertain.
- It never presents an uncertain stain type as definite.
- It does not claim guaranteed stain removal or create a cleaning order.
- User-visible safety/care notes are retained for every relevant result.
- Manual booking remains available regardless of result status.

## Testing requirements

- Fixtures for each supported stain label, no-stain images, visually ambiguous images, and invalid images.
- Contract tests for unknown/low-confidence output and for invalid model output.
- Manual testing of provider failure, timeout, network failure, permission denial, cancellation, and rate limiting.

## Security constraints

- Reuse all Phase A upload, authentication, logging, and privacy controls.
- Do not log images or user-facing care recommendations with identifiable customer context.
- Treat the image only as analysis input, never as executable prompt content.

## Dependencies on previous phases

Phase A is required. It is independent of Phases B–D except for shared result UI reuse.

## Explicitly out of scope

- Chemical inventory, staff workflow, or guaranteed treatment decisions.
- Fabric classification and care-label OCR.
- Order placement, automatic service selection, and Admin analytics.
