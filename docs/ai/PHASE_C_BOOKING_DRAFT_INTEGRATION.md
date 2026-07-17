# Phase C — Garment Review and Booking Draft Integration

## Scope

Connect reviewed garment-recognition results to the existing booking route without creating a parallel order architecture. This phase adds the mandatory review/edit step and safely pre-fills the existing `/select-service` screen with known quantities and an optional valid global service.

## Architecture

```text
garment result → user review/edit → validated BookingDraft
               → /select-service prefill → existing scheduling/address/payment flow
```

The booking draft is transient UI state or compact route state. It contains no final price, payment token, or order ID. The user still sees and can change the regular service/item controls. Existing `/orders/preview` recomputes the price after review.

## Dependencies

- Phase A shared contracts and mapper.
- Phase B garment recognition result flow.
- Existing `select-service`, `schedule-basic`, `select-address`, `order-summary`, payment, and preview endpoints.

## Expected files

Create or extend:

- shared review/edit components or logic used by `app/ai-analysis.tsx`
- tests for draft conversion and booking-route prefill

Modify:

- `fresh-and-fold-mobile/app/select-service.tsx`
- `fresh-and-fold-mobile/types/ai.ts`
- `fresh-and-fold-mobile/services/aiService.ts` only if draft validation transport is required
- route navigation from Smart Scan result to the existing booking path

## Implementation tasks

1. Display every detected item, its mapping status, quantity, confidence, and any warning before the Continue action.
2. Permit the user to remove, correct, or manually add only currently supported catalog items.
3. Convert the reviewed selection into a validated `BookingDraft` using known catalog IDs only.
4. Pass a compact validated prefill into `/select-service`; never pass AI-generated price data.
5. Update `/select-service` to apply prefill safely while preserving all normal manual controls and price calculation.
6. Route all missing information through the existing scheduler, address, summary, payment, confirmation, and tracking screens.
7. Preserve manual booking as an explicit alternative.

## Acceptance criteria

- Review is mandatory before booking continuation.
- No unreviewed item, arbitrary ID, price, payment token, or AI service claim reaches order creation.
- Existing manual booking produces the same payloads as before.
- Existing `/orders/preview` is used after review and remains the displayed authority.
- Unmapped items and ambiguous quantities do not block manual booking, but do not prefill unsupported IDs.
- Per-item service requests are surfaced as unresolved because the current order supports only one global service.

## Testing requirements

- Draft-to-prefill tests for all supported catalog IDs.
- Tests rejecting arbitrary/malformed route prefill and ensuring fallback to normal empty selection.
- Regression checks for the normal manual booking flow and server price preview.
- Manual end-to-end test from a scan result through a paid/mock payment and created order.

## Security constraints

- Treat route prefill as untrusted client input; server-side pricing/order validation remains unchanged.
- Do not persist an AI draft with sensitive scan/image data.
- Do not add an AI-specific order or payment endpoint.

## Dependencies on previous phases

Phases A and B are required.

## Explicitly out of scope

- Changing the current pricing rules, payment verification, or order authority.
- Persisting pickup date/slot; this remains an existing booking-domain limitation.
- Supporting different services per item or splitting one AI request into multiple orders.
- Fabric, stain, care-label, natural-language, or Admin functionality.
