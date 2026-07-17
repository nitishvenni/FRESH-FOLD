# Performance Audit

## Mobile

## Large Renders

- `support.tsx` is 1050 lines and manages chat rendering, socket handling, storage hydration, escalation, keyboard behavior, and API requests.
- `add-address.tsx` is 934 lines and mixes forms, map loading, location, validation, and API persistence.
- `payment.tsx` is 412 lines and handles preview, payment order, Razorpay, verification, failure logging, and order creation.
- `home.tsx` is 405 lines and mixes dashboard UI with order fetching.

These screens should be split before AI features add image capture, uploads, previews, progress, and results.

## Repeated API Calls

- Admin socket events often trigger full refetches of orders/tickets/analytics.
- Mobile `track-order.tsx` fetches all orders to find a target order.
- Pricing preview can be requested from both summary/payment surfaces.
- No client cache layer or request de-duplication exists.

## Heavy Components

- Map screen can be heavy due to native map, keyboard handling, location state, and form state in one component.
- Support chat can grow without virtualization.
- Admin tables render all orders/tickets without pagination.

## Image Loading

- Mobile uses app assets, but no product image pipeline exists.
- AI vision features will need thumbnailing, compression, upload progress, and CDN/object storage.

## Bundle Size

- Mobile includes maps, Razorpay, Reanimated, Expo Notifications, and skeleton libraries.
- Admin includes charts, heatmap, Framer Motion, Lucide.
- Backend includes `framer-motion`, which appears unnecessary and should be removed in a later cleanup.

## Navigation Performance

- Expo Router route param passing is simple but large checkout payloads in params can become fragile.
- Admin lazy-loads pages, which is good.
- No measured performance tooling was found.

## React Optimization

Existing:

- Admin uses `useMemo` and `useCallback` in `AdminContext`.
- Some mobile screens use memoization.

Opportunities:

- Extract support/address/payment hooks.
- Virtualize long chat and order/ticket lists.
- Use server-side pagination and filtering.
- Prefer single-order endpoint for tracking.
- Avoid full admin refetch on every socket event when payload can update local state safely.

## Backend Bottlenecks

- Admin orders and tickets return full collections.
- Support analytics scans tickets/interactions without explicit indexes.
- In-memory rate limit is not distributed.
- Socket events are broad (`io.emit`) rather than scoped for some order events.
- No background workers for slow operations.

## Database Bottlenecks

- Missing operational indexes for order/user/status/createdAt and support SLA fields.
- Embedded support messages can make ticket documents large.
- No pagination increases memory and latency as collections grow.

