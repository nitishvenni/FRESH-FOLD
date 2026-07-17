# Phase G — Natural-Language Booking

## Scope

Add typed natural-language booking in AI Care. The user describes a request and receives a structured, editable `BookingDraft` that enters the existing booking flow only after review. The feature extracts known garments, quantities, one global service when valid, pickup date/slot or preference, and special instructions.

The initial approved scope is typed text. Voice input requires recording and transcription dependencies that do not exist today; it may be added only as a separately approved extension using the same parsing and review path.

## Architecture

```text
typed request → POST /ai/booking/parse → strict NaturalLanguageBookingResult
             → deterministic catalog mapper → reviewed BookingDraft
             → existing /select-service flow
```

The parser does not create an order. It may retain a pickup preference such as “tomorrow evening,” but it only produces an existing slot when the preference exactly maps to one supported slot. Missing or ambiguous scheduling data proceeds to the existing scheduler.

## Dependencies

- Phase A contracts, provider, catalog mapper, error handling, authentication, and rate limits.
- Phase C review-to-existing-booking integration.
- Existing booking service/item representation and route state.

## Expected files

Create:

- `fresh-and-fold-mobile/app/ai-booking.tsx`
- natural-language parsing tests and fixtures

Modify:

- `fresh-and-fold-backend/src/ai/contracts.ts`
- `fresh-and-fold-backend/src/ai/prompts.ts`
- `fresh-and-fold-backend/src/ai/router.ts`
- `fresh-and-fold-mobile/app/ai-care.tsx`
- shared mobile AI types/service and draft-review components
- `fresh-and-fold-mobile/app/select-service.tsx` only through the Phase C prefill contract

## Implementation tasks

1. Add a text-only booking parser with strict `NaturalLanguageBookingResult` validation.
2. Extract only supported garments and map them deterministically through the approved catalog aliases.
3. Represent unknown garments, unclear quantities, conflicting services, and ambiguous dates/times as unresolved fields.
4. Validate a service recommendation against the current single-service order model.
5. Produce a reviewed `BookingDraft` without pricing, payment, address, or order-creation fields.
6. Add a dedicated natural-language booking entry in AI Care and a mandatory review/edit step.
7. Continue into the existing `/select-service` route and let current screens collect missing scheduling/address information.

## Acceptance criteria

- A parsed request never silently creates an order or payment.
- The user can edit, remove, or manually add supported items before continuing.
- Only real catalog IDs can prefill `/select-service`.
- Per-item service requests remain unresolved under the current global-service order contract.
- Ambiguous dates/times are preserved as preferences or unresolved fields, never represented as confirmed scheduled pickups.
- Final price remains the existing backend preview/order calculation.

## Testing requirements

- Parsing fixtures for direct requests, unknown garments, aliases, missing quantities, future/past dates, ambiguous time preferences, unsupported services, and conflicting per-item services.
- Contract tests for partial/unknown/malformed output.
- End-to-end manual tests from typed request through review and existing booking screens.
- Regression tests proving a natural-language request cannot call payment or order creation directly.

## Security constraints

- Authenticate and rate limit parsing requests.
- Treat the user request as untrusted text; it cannot alter prompts, prices, catalog data, or ordering permissions.
- Do not retain raw booking text in future analytics by default.
- Do not expose model configuration or API keys to mobile.

## Dependencies on previous phases

Phases A and C are required.

## Explicitly out of scope

- Voice recording/transcription until separately approved.
- Automatic order placement, payment, or address selection.
- Per-item services, multiple-order orchestration, or schedule persistence changes.
- Admin analytics.
