# Refactoring Report

## Folder Structure

- Split backend `index.ts` into app/server/config/routes/controllers/services.
- Group mobile screens by flow where possible: auth, booking, orders, support, profile.
- Consolidate mobile UI primitives under one canonical `components/ui`.
- Move admin data fetching/mutations out of `AdminContext` into services/hooks when the dashboard grows.

## Naming and Contracts

- Standardize singular/plural payment routes.
- Standardize support status casing between backend and admin.
- Create shared constants for order statuses, ticket statuses, pricing, services, and catalog.
- Add DTO types shared between backend/admin/mobile.

## Large Files

- Backend `src/index.ts`: 2089 lines. Highest refactor priority.
- Mobile `app/support.tsx`: 1050 lines.
- Mobile `app/add-address.tsx`: 934 lines.
- Mobile `app/payment.tsx`: 412 lines.
- Mobile `app/home.tsx`: 405 lines.
- Admin `AdminContext.tsx`: large multi-concern provider.

## Repeated Logic

- Payment failure handlers are duplicated.
- Payment aliases duplicate route surface.
- Pricing is duplicated in backend and mobile.
- Address validation is duplicated in create/update routes.
- Mobile API usage is split between direct `apiRequest` and services.
- Component duplicates exist for cards, loaders, order cards, timelines, and chat bubbles.

## Component Reuse

- Promote `Button`, `Input`, `Card`, `Loader`, `EmptyState`, `ErrorState`, `StatusBadge`, `QuantityStepper`.
- Remove template components/assets after confirming not used.
- Extract support chat message list/input/ticket banner into components.
- Extract address map/form sections into components.
- Extract payment state machine into hook/service.

## Hooks and Services

- Add `useAddresses`, `useCheckoutDraft`, `usePaymentFlow`, `useSupportTicket`, `useOrderTracking`.
- Add backend services: `AuthService`, `OrderService`, `PaymentService`, `AddressService`, `SupportService`, `AdminAnalyticsService`.
- Add validation schemas for each request.

## API Services

- Mobile should consume feature services consistently instead of mixing direct calls.
- Admin should use an `adminApi` helper that handles auth, parsing, and 401 behavior.
- Generate API clients from OpenAPI or shared DTOs when stable.

## Performance

- Add pagination and filters to admin order/ticket endpoints.
- Add `GET /orders/:id`.
- Use socket payloads to update local records where safe.
- Add indexes for operational queries.
- Virtualize long chat/list surfaces.

## Maintainability

- Add tests around payment verification, order creation, support escalation, address validation, and admin auth.
- Add `.env.example`.
- Add structured logger and centralized errors.
- Add API documentation.
- Add migration/index scripts.

## AI Preparation

- Do not add AI directly into current backend `index.ts`.
- First create upload/storage/job/service boundaries.
- Introduce durable booking drafts before natural language booking.
- Introduce media/analysis models before vision features.

