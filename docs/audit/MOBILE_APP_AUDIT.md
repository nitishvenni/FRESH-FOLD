# Mobile App Audit

## Architecture Summary

The mobile app is a functional Expo Router app with a polished user journey for login, booking, address selection, payment, tracking, history, profile, and support. It has good use of AsyncStorage, skeleton/loading components, socket updates, and feature components, but screen files are large and business logic is often embedded directly in screens.

## Screen Scores

| Screen | Purpose | Navigation/API/State | Gaps | Score |
| --- | --- | --- | --- | --- |
| `index.tsx` | Auth-based redirect. | Reads `useAuth`, redirects to `/home` or `/login`. | Minimal loading nuance depends on layout auth bootstrap. | 8 |
| `_layout.tsx` | Root providers, fonts, auth redirects, tabs. | AuthProvider, theme, unauthorized handling, tab visibility. | Route allowlist is hard-coded; no role/session refresh. | 8 |
| `login.tsx` | Mobile OTP request. | Calls `/auth/send-otp`, routes to OTP. | No resend timing here, no SMS provider status, no accessibility labels on all custom UI. | 7 |
| `otp.tsx` | OTP verification. | Calls `/auth/verify-otp`, stores token, calls auth login. | No lockout UI, resend flow appears limited, local OTP fallback can expose security risk in backend. | 7 |
| `home.tsx` | Main dashboard and active order prompt. | Fetches `/orders`, shows active order, routes into booking/tracking/history. | Large inline UI; repeated fetch logic; partial empty/error states. | 7 |
| `select-service.tsx` | Choose wash/dry/express. | Local selection, routes to item selection. | Static services; no backend-driven pricing/service availability. | 7 |
| `select-items.tsx` | Choose laundry items/quantities. | Local item state, uses pricing utility, routes to schedule. | Static catalog; no item search/categories from backend; accessibility of quantity controls should be improved. | 7 |
| `schedule-basic.tsx` | Date/time slot selection. | Local generated dates/slots, routes to address selection. | Slots are not reserved or checked with backend; no capacity rules. | 6 |
| `schedule-premium.tsx` | Premium schedule path. | Simple local selection, routes to legacy create order. | Underdeveloped compared to main flow; likely legacy/partial. | 5 |
| `select-address.tsx` | Pick saved address. | Calls `/addresses`, caches addresses, routes to add/edit/payment summary. | No delete/default address; error/empty states exist but are basic. | 7 |
| `add-address.tsx` | Add/edit address with map/location. | Calls `/addresses` and `PUT /addresses/:id`, uses location/map state. | Very large file; map/native fallbacks increase complexity; no geocoding service abstraction; no backend serviceability check. | 7 |
| `order-summary.tsx` | Price review before payment. | Calls `/orders/preview`; routes to payment with params. | Relies on URL params for order context; no persistent checkout model. | 7 |
| `payment.tsx` | Razorpay payment and order creation. | Calls payment create/verify/failure and `/orders`. | Complex 412-line screen; retry/polling logic is inline; payment state is not persisted across app restarts. | 7 |
| `order-confirmation.tsx` | Success confirmation. | Uses route params, routes to tracking/home. | Relies on params rather than fetching confirmed order details. | 7 |
| `order-history.tsx` | Past order list and reorder. | Uses order hook/service; routes to tracking/reorder. | Limited filtering/search; no pagination. | 7 |
| `track-order.tsx` | Live order tracking. | Calls `/orders`, listens to sockets for updates. | Fetches all orders to find one; no `GET /orders/:id`; socket auth not scoped. | 7 |
| `support.tsx` | AI/support chat and ticket handoff. | Calls support query/escalate/ticket routes; socket ticket messages; local persistence. | Very large 1050-line screen; support state machine should be extracted; inline instructional text exists. | 7 |
| `profile.tsx` | User profile/settings. | Local display data, routes to profile/address/history/support, logout. | No backend profile endpoint; notifications toggle is local-ish; profile editing not persisted to user model. | 6 |
| `edit-profile.tsx` | Edit display profile. | Local/AsyncStorage profile values. | Backend has no profile fields, so data is not authoritative. | 5 |
| `create-order.tsx` | Legacy/simple order creation. | Posts `/orders` without payment verification token. | Backend now requires payment verification; likely dead/broken legacy path. | 3 |
| `live.tsx` | Map live tracking demo. | Simulated rider movement. | No backend rider data; looks prototype-only. | 4 |
| `explore.tsx` | Expo starter explore page. | Template links. | Not product-relevant. | 2 |
| `modal.tsx` | Expo starter modal. | Template close link. | Not product-relevant. | 2 |

## State Management

- Auth is centralized in context.
- Checkout state is mostly passed through route params, making deep links/reloads fragile.
- Support chat uses component state plus local persistence helpers.
- Orders use a mix of direct screen fetches and service hooks.
- There is no global normalized entity cache.

## API Usage

- Good: `apiRequest` centralizes token injection, JSON parsing, 401 logout, and network errors.
- Weak: some screens call `apiRequest` directly while others use services.
- Missing: typed API contract shared with backend.

## UX Quality

Strengths:

- Clear booking flow.
- Skeletons/loaders exist for several order surfaces.
- Support chat is ambitious and live.
- Visual polish is above baseline.

Gaps:

- Loading, empty, and error states are inconsistent by screen.
- Some screens still look like prototypes/template leftovers.
- Static service/catalog/slot data limits operational realism.
- Accessibility labels, focus order, and screen-reader hints are not consistently visible in the code.

## Technical Debt

- Large screens: `support.tsx`, `add-address.tsx`, `payment.tsx`, `home.tsx`.
- Duplicate components and duplicate API layers.
- Static pricing duplicated with backend.
- Legacy screens likely no longer match backend requirements.
- No test coverage found.

