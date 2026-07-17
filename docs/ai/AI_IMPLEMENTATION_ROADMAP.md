# Fresh & Fold AI Implementation Roadmap

## Purpose and status

This is the approved implementation plan for Tier-1 AI. It is a planning document only. It does not authorize changes to pricing, automatic order placement, or unrelated UI refinements.

The AI system will provide garment recognition, stain detection, fabric identification, care-label interpretation, and natural-language booking as one backend-mediated system. Every booking-related result becomes a reviewed `BookingDraft`; it is never an order or payment instruction.

## Non-negotiable product rules

- AI classifies and recommends; deterministic Fresh & Fold code maps catalog IDs and calculates prices.
- The mobile app must never contain an OpenAI API key.
- Users must review AI detections and booking drafts before entering the existing booking flow.
- Manual booking remains available after every AI success, low-confidence result, error, and cancellation.
- Unknown, low-confidence, unreadable, and unmapped outcomes are valid results, not failures to hide.
- Scan images are not permanently stored by default and are never logged as raw image data.
- Existing pricing and payment endpoints remain authoritative.
- UI refinement is frozen. Future AI work may add only the screens/components needed for the approved feature flows.

## Current-system facts that constrain implementation

The current mobile booking route is:

```text
/home → /select-service → /schedule-basic → /select-address
      → /order-summary → /payment → /order-confirmation → /track-order
```

`/select-service` currently selects both the single order service and item quantities. The order contract accepts a global `service`, item quantities, and address/payment data. It does not support a different service for each item. Date and slot exist only in mobile route state; they are not stored by the current order model or order-creation payload.

The supported catalog IDs are `shirt`, `tshirt`, `jeans`, `trousers`, `dress`, `jacket`, `sweater`, `bedsheet`, `pillowcover`, `towel`, `curtain`, and `blanket`. Supported service IDs are `wash`, `dry`, and `express`.

Consequences for AI:

- AI cannot invent catalog IDs, prices, estimated weights, or calendar delivery dates.
- Garments such as sarees, suits, and shoes remain unmapped until the catalog supports them.
- A request such as “wash everything except my blazer” must be marked as an unresolved service conflict, not converted into an order.
- An AI draft can prefill existing item/service controls only after review. The existing booking screens collect all missing information.

## Target architecture

```text
Image or text input
  → authenticated backend AI router
  → input validation and normalization
  → reusable OpenAI provider
  → strict structured-output validation
  → deterministic catalog mapper and existing price preview
  → reviewed BookingDraft
  → existing /select-service booking route
  → existing price preview, payment, and order creation
```

Image analysis uses one shared upload and provider pipeline. Natural-language booking uses the same provider, contracts, catalog mapping, confidence rules, and `BookingDraft`. The backend is the source of truth for runtime validation and mapping.

## Shared contracts

All AI results must carry a status (`complete`, `partial`, `no_match`, or `unreadable` as applicable), warnings, a request ID, and `requiresUserReview: true`.

The shared `BookingDraft` contains only reviewed/pre-fillable information:

- `source`: `manual`, `smart_scan`, or `natural_language`
- mapped or unresolved items with detected labels, quantities, confidence, and optional service recommendations
- one global service when determinable from the current booking contract
- optional pickup date, existing slot, or free-text pickup preference
- special instructions, warnings, and unresolved fields

Pricing is intentionally excluded from the draft. A displayed price preview is created only by the existing server calculator, and the final displayed amount is refreshed with `/orders/preview` after user edits.

## Image and privacy pipeline

```text
Camera or gallery
  → one-image validation
  → client JPEG normalization and resize
  → authenticated multipart request
  → backend size, MIME, and magic-byte validation
  → in-memory OpenAI image input
  → structured result
  → discard image buffer
```

The target mobile maximum is a 1600px long edge and an approximately 4 MB upload cap. The backend hard limit is 5 MB. Neither the client nor backend persists scan images by default.

## Backend endpoints

| Endpoint | Purpose |
| --- | --- |
| `POST /ai/analyze` | Authenticated multipart image analysis; capability selects garment, stain, fabric, or care-label analysis. |
| `POST /ai/booking/parse` | Authenticated typed natural-language request; returns a reviewed booking draft. |
| `POST /orders/preview` | Existing authoritative deterministic price preview after review. |
| Future `POST /ai/events` | Metadata-only analytics event endpoint; not part of initial phases. |

All AI endpoints return consistent errors shaped as `{ code, message, retryable, requestId }` and are separately rate limited.

## Phase sequence

| Phase | Outcome | Depends on |
| --- | --- | --- |
| [A](PHASE_A_SHARED_AI_INFRASTRUCTURE.md) | Shared contracts, provider, mapping, validation, and secure image foundation | Approved roadmap and backend deployment configuration |
| [B](PHASE_B_GARMENT_RECOGNITION.md) | Garment recognition MVP | Phase A |
| [C](PHASE_C_BOOKING_DRAFT_INTEGRATION.md) | Mandatory review and existing-booking prefill | Phases A–B |
| [D](PHASE_D_FABRIC_IDENTIFICATION.md) | Fabric identification through the shared image path | Phase A |
| [E](PHASE_E_STAIN_DETECTION.md) | Stain detection through the shared image path | Phase A |
| [F](PHASE_F_CARE_LABEL_READER.md) | Care-label OCR/symbol interpretation | Phase A |
| [G](PHASE_G_NATURAL_LANGUAGE_BOOKING.md) | Typed natural-language booking drafts | Phases A and C |
| [H](PHASE_H_ADMIN_AI_OPERATIONS.md) | Metadata-only AI operations analytics | Earlier feature phases |

## Cross-phase acceptance gates

- No AI endpoint may be exposed without JWT authentication, request limits, and structured response validation.
- No AI response may create an order, create a payment, or bypass `/orders/preview`.
- No mapped item may fall outside the existing canonical catalog.
- No scan result may present an AI-generated amount as a final price.
- Every new capability must document and test low-confidence, unknown, invalid-image, network, timeout, provider, rate-limit, and cancellation paths.
- Model names remain backend configuration, not hardcoded mobile values. Missing configuration returns `AI_NOT_CONFIGURED`; it never returns fake data.

## Documentation index

- [Phase A — Shared AI Infrastructure](PHASE_A_SHARED_AI_INFRASTRUCTURE.md)
- [Phase B — Garment Recognition](PHASE_B_GARMENT_RECOGNITION.md)
- [Phase C — Booking Draft Integration](PHASE_C_BOOKING_DRAFT_INTEGRATION.md)
- [Phase D — Fabric Identification](PHASE_D_FABRIC_IDENTIFICATION.md)
- [Phase E — Stain Detection](PHASE_E_STAIN_DETECTION.md)
- [Phase F — Care Label Reader](PHASE_F_CARE_LABEL_READER.md)
- [Phase G — Natural-Language Booking](PHASE_G_NATURAL_LANGUAGE_BOOKING.md)
- [Phase H — Admin AI Operations](PHASE_H_ADMIN_AI_OPERATIONS.md)
