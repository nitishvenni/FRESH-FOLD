# AI Readiness Audit

## Overall Readiness

Fresh & Fold has a solid transactional foundation for orders, payments, addresses, and support, but it is not yet ready for vision-based AI features. The biggest missing layer is media ingestion: image capture UI, upload API, object storage, preprocessing, async jobs, model orchestration, result persistence, confidence scoring, review UI, and safety/retention controls.

The strongest existing AI-adjacent foundation is support automation: `promptControl.ts`, support interactions, confidence scores, escalation, tickets, and analytics.

## AI Garment Recognition

Existing reusable components:

- Item catalog and pricing in mobile/backend.
- Item selection UI and order item structure.
- Order preview endpoint can price recognized items once mapped to known item keys.

Existing APIs:

- `/orders/preview`.
- `/orders`.

Required backend changes:

- Image upload endpoint.
- Object storage integration.
- Garment recognition service.
- Mapping from model labels to canonical catalog item keys.
- Confidence threshold and manual correction flow.
- Analysis result schema.

Required frontend changes:

- Camera/gallery capture.
- Upload progress.
- Recognition result review/edit screen.
- Item correction UI before checkout.

Required database changes:

- `GarmentAnalysis` or `AIAnalysis` collection.
- Store image URL, labels, quantities, confidence, user corrections, model version.

Required storage changes:

- Private object storage, signed upload/read URLs, thumbnails.

Required UI changes:

- Add photo-based item selection option.
- Add review state for low confidence items.

Integration difficulty:

- High.

Estimated complexity:

- Large. Requires full media and async AI pipeline.

Potential blockers:

- No storage/upload architecture.
- Static catalog lacks aliases/training labels.
- No background worker.

## AI Stain Detection

Existing reusable components:

- Support escalation reasons include stain/damage language.
- Order/support flows can attach future issue context.

Existing APIs:

- None specific.

Required backend changes:

- Multi-image upload.
- Stain detection model/service.
- Result schema with stain type, severity, location, confidence.
- Recommendation engine for treatment/service upsell.

Required frontend changes:

- Guided garment/stain photo capture.
- Display stain bounding/region results.
- User confirmation and consent.

Required database changes:

- Store stain detections linked to user/order/garment.
- Optional pre/post-cleaning inspection records.

Required storage changes:

- Original and processed images.

Required UI changes:

- Stain review cards, confidence labels, treatment notes.

Integration difficulty:

- High.

Estimated complexity:

- Large.

Potential blockers:

- No image annotations/rendering system.
- No human review workflow.

## AI Fabric Identification

Existing reusable components:

- Service selection and pricing can be extended by fabric rules.
- Support knowledge can answer service limitations.

Existing APIs:

- None specific.

Required backend changes:

- Image upload and fabric classifier.
- Fabric taxonomy.
- Care recommendations.
- Rules mapping fabric to allowed services.

Required frontend changes:

- Capture flow and results display.
- Warnings for delicate fabrics.

Required database changes:

- Fabric result fields per garment/analysis.
- Model version and confidence fields.

Required storage changes:

- Same media pipeline as garment recognition.

Required UI changes:

- Fabric badges and service warnings in checkout.

Integration difficulty:

- Medium-high after media pipeline exists.

Estimated complexity:

- Medium-large.

Potential blockers:

- Static item model has no garment entities separate from order line items.

## AI Care Label Reader

Existing reusable components:

- Address/order/support flows are unrelated but stable.
- Potential to reuse item/service review UI once created.

Existing APIs:

- None specific.

Required backend changes:

- OCR service.
- Care symbol/text parser.
- Structured JSON parser and confidence scoring.
- Care instruction storage.

Required frontend changes:

- Care-label capture guide.
- OCR result correction UI.
- Warnings in checkout.

Required database changes:

- Care label text, symbols, parsed instructions, confidence, source image.

Required storage changes:

- Label image storage and thumbnails.

Required UI changes:

- Parsed care instruction display.

Integration difficulty:

- Medium-high.

Estimated complexity:

- Medium-large.

Potential blockers:

- No OCR utility or structured parser.

## AI Natural Language Booking

Existing reusable components:

- `support/promptControl.ts` detects intents and confidence.
- Support interactions/tickets store intent, confidence, outcome.
- Order preview and address APIs can be composed.
- Static pricing utility can price requested items.

Existing APIs:

- `/support/query`.
- `/orders/preview`.
- `/addresses`.
- `/orders`.
- Payment endpoints.

Required backend changes:

- LLM/NLU service for extracting service, items, quantities, date, slot, address intent.
- Prompt management and structured JSON validation.
- Conversation state/session model.
- Draft booking endpoint.
- Confirmation-before-payment workflow.

Required frontend changes:

- Chat booking flow or natural language input in booking.
- Clarification prompts.
- Draft order review screen.

Required database changes:

- Booking draft/session collection.
- Store extracted entities, missing fields, confidence, corrections.

Required storage changes:

- None required unless combined with vision.

Required UI changes:

- Conversational booking review/edit UI.

Integration difficulty:

- Medium.

Estimated complexity:

- Medium, because order/payment/address primitives already exist.

Potential blockers:

- Checkout state currently lives in route params, not durable booking drafts.
- No LLM integration or prompt evaluation harness.
- Schedule slots are not backend-modeled.

## Recommended AI Foundation Sequence

1. Add shared catalog/status/API types.
2. Add backend route/service/validation layers.
3. Add object storage and upload service.
4. Add AI analysis collection and job model.
5. Add background worker.
6. Add model provider abstraction.
7. Add confidence/review UX.
8. Build natural language booking first, then image-based features.

