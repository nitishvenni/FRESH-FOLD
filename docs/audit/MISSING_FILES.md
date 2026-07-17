# Missing Files and Modules

## AI and ML

- `backend/src/ai/`
- `backend/src/ai/visionService.ts`
- `backend/src/ai/naturalLanguageBookingService.ts`
- `backend/src/ai/promptManager.ts`
- `backend/src/ai/modelClient.ts`
- `backend/src/ai/confidence.ts`
- `backend/src/ai/resultSchemas.ts`
- `backend/src/ai/recommendationEngine.ts`
- `backend/src/ocr/careLabelReader.ts`
- `backend/src/image/preprocess.ts`
- `backend/src/image/thumbnail.ts`
- `backend/src/image/metadata.ts`

## Upload and Storage

- `backend/src/storage/objectStorage.ts`
- `backend/src/storage/signedUrls.ts`
- `backend/src/upload/uploadMiddleware.ts`
- `backend/src/upload/validators.ts`
- `backend/src/models/MediaAsset.ts`
- `backend/src/models/AIAnalysis.ts`

## Jobs and Caching

- `backend/src/jobs/worker.ts`
- `backend/src/jobs/queues.ts`
- `backend/src/jobs/processAIAnalysis.ts`
- `backend/src/cache/redis.ts`
- `backend/src/cache/rateLimitStore.ts`

## API Organization

- `backend/src/routes/*`
- `backend/src/controllers/*`
- `backend/src/services/*`
- `backend/src/validators/*`
- `backend/src/errors/*`
- `backend/src/config/env.ts`
- `backend/src/server.ts`
- `backend/src/app.ts`

## Shared Types

- `packages/shared`
- `packages/shared/src/api.ts`
- `packages/shared/src/orderStatus.ts`
- `packages/shared/src/pricing.ts`
- `packages/shared/src/supportStatus.ts`
- `packages/shared/src/catalog.ts`

## Testing

- Backend unit/integration tests.
- Mobile component/screen tests.
- Admin component tests.
- API contract tests.
- Payment webhook/verification tests.
- Support intent/prompt tests.
- E2E booking flow tests.

## Mobile

- Camera/photo capture screen.
- AI result review screen.
- Booking draft store/hook.
- Upload progress component.
- Image preview/crop/compress utility.
- Unified UI primitive folder after duplicate cleanup.

## Admin

- User/customer management page.
- Catalog/pricing management page.
- AI review queue page.
- Media/analysis detail drawer.
- Audit log page.
- Payment reconciliation/refund page.

## Observability

- Logger module.
- Request ID middleware.
- Metrics/telemetry module.
- Error reporting integration.
- Health readiness/liveness separation.

