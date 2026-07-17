# Implementation Readiness

## Scores

| Area | Score |
| --- | --- |
| Architecture maturity | 5/10 |
| Frontend mobile | 7/10 |
| Admin dashboard | 7/10 |
| Backend | 5/10 |
| Database | 5/10 |
| Scalability | 4/10 |
| Security | 4/10 |
| Maintainability | 5/10 |
| Production readiness | 5/10 |
| Technical debt | 7/10 debt level |

## Summary

Fresh & Fold is a capable MVP-plus product. The booking, payment, tracking, admin operations, and support workflows are real enough to build from. The main problem is that the architecture is still concentrated and manually wired: backend logic is centralized in one file, data contracts are duplicated, validation is inconsistent, and there is no media/job/storage layer for AI.

## Top 20 Priorities Before AI Implementation

1. Lock down or remove public `/admin/register`.
2. Add startup validation for required environment variables.
3. Restrict CORS and authenticate Socket.IO.
4. Add rate limits for OTP and admin login.
5. Split backend routes/controllers/services out of `index.ts`.
6. Add request validation schemas.
7. Add centralized error handling and structured logging.
8. Add `.env.example` and deployment docs.
9. Add pagination/filtering for admin orders and tickets.
10. Add database indexes for orders, support, addresses, and payment attempts.
11. Create shared order/status/pricing/catalog constants.
12. Remove duplicate payment endpoints or mark one version deprecated.
13. Persist pickup date/slot in Order.
14. Add user profile endpoint/model fields or remove local-only profile promises.
15. Consolidate mobile duplicated components.
16. Extract mobile support/address/payment flows into hooks/components.
17. Add tests for payment/order/support/auth flows.
18. Add object storage and upload architecture.
19. Add background job processing.
20. Add AI analysis/media database models and admin review queue.

## Biggest Architectural Risks

- Backend `index.ts` will become unmanageable if AI is added directly.
- No media storage/upload layer exists.
- No worker/job architecture exists.
- Static catalog/pricing and duplicated constants will make AI mapping brittle.
- Admin/user APIs return full collections without pagination.
- Socket security and CORS are too permissive.
- Current support "AI" is rule-based; future LLM integration needs prompt/version/result governance.

## Biggest Strengths

- End-to-end paid order flow exists.
- Payment verification is thoughtfully protected with context hash and short-lived token.
- Admin dashboard is useful and operationally coherent.
- Support ticket model has unusually good early SLA and analytics fields.
- Mobile UX covers the main customer journey.
- Socket updates and push notifications are already integrated.

## Recommended AI Feature Order

1. AI Natural Language Booking.
2. AI Care Label Reader.
3. AI Garment Recognition.
4. AI Fabric Identification.
5. AI Stain Detection.

Rationale: natural language booking can reuse current order/address/payment primitives with less infrastructure than vision. Care label OCR is narrower than full garment/stain recognition. Garment/fabric/stain features should wait until upload, storage, job processing, and review UX are stable.

