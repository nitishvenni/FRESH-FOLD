# Directory Structure Audit

## Repository Root

- `.gitignore`: root ignore file.
- `render.yaml`: Render backend deployment config.
- `fresh-and-fold-mobile`: Expo customer app.
- `fresh-and-fold-admin`: Vite admin dashboard.
- `fresh-and-fold-backend`: Express/MongoDB backend.

## Mobile: `fresh-and-fold-mobile`

- `app`: Expo Router screens. This is the main product surface.
- `components`: reusable and feature UI components.
- `components/ui`: second component set for generic UI primitives.
- `components/orders`: order-specific duplicates of top-level order components.
- `components/chat`: chat-specific duplicate of top-level chat components.
- `context`: auth and theme providers.
- `services`: typed-ish API wrappers for orders, payments, support, and base API.
- `utils`: API request helper, formatting, haptics, notifications, pricing, socket, support chat persistence, toast.
- `constants`: API and theme constants.
- `hooks`: auth/theme/socket hooks.
- `theme`: richer theme tokens.
- `types`: local type declarations for Razorpay and NetInfo.
- `assets/images`: app icons and template React logos.
- `scripts`: Expo template reset script.

### Mobile Dependencies

- Screens depend directly on `utils/api.ts` and also on `services/*`.
- `services/api.ts` wraps `utils/api.ts`, so there is a partial service layer but it is not used consistently.
- `context/AuthContext.tsx` depends on AsyncStorage and registers the unauthorized handler from `utils/api.ts`.
- Order/pricing screens depend on `utils/pricing.ts`, while backend duplicates pricing constants.

## Admin: `fresh-and-fold-admin`

- `src/App.tsx`: login/reset UI, route shell, lazy page routes.
- `src/admin`: data context, constants, styles, types.
- `src/pages`: Dashboard, Orders, Analytics, Support.
- `src/components`: tables, charts, layout, live chat, notifications, cards.
- `src/assets`: unused Vite/React starter asset.
- `public`: Vite starter SVG.

### Admin Dependencies

- Pages consume `useAdminData` from `AdminContext`.
- Components consume shared inline style helpers from `admin/styles.ts`.
- `AdminContext` owns API calls, sockets, localStorage token, derived analytics, notifications, and mutations.

## Backend: `fresh-and-fold-backend`

- `src/index.ts`: server setup, constants, helpers, auth, payment, orders, addresses, support, admin APIs, sockets, Mongo connection.
- `src/models`: Mongoose schemas.
- `src/middleware`: user auth and in-memory rate limiter.
- `src/support`: deterministic support intent/prompt policy.
- `src/utils`: push notifications and OTP generation.
- `src/scripts`: admin reset script.
- `src/types`: Razorpay declaration.

### Backend Dependencies

- `index.ts` imports all models and utility modules directly.
- Models are independent Mongoose definitions.
- Middleware is thin and does not use a central error/response pattern.
- Support policy is separated, but route orchestration and persistence remain in `index.ts`.

## Dead or Template Folders

- `fresh-and-fold-mobile/app/explore.tsx`, `modal.tsx`, `components/hello-wave.tsx`, `external-link.tsx`, `parallax-scroll-view.tsx`, `themed-text.tsx`, `themed-view.tsx`, `constants/theme.ts`, and React logo assets appear to be Expo starter/template leftovers unless intentionally retained.
- `fresh-and-fold-admin/src/assets/react.svg` and `public/vite.svg` appear to be Vite starter leftovers.
- `fresh-and-fold-mobile/scripts/reset-project.js` is an Expo starter utility, not product code.

## Duplicate Code

- Mobile has `components/Card.tsx` and `components/ui/Card.tsx`.
- Mobile has `components/Loader.tsx` and `components/ui/Loader.tsx`.
- Mobile has `components/OrderCard.tsx` and `components/orders/OrderCard.tsx`.
- Mobile has `components/OrderTimeline.tsx` and `components/orders/OrderTimeline.tsx`.
- Mobile has `components/ChatBubble.tsx` and `components/chat/ChatBubble.tsx`.
- Mobile has API calls split between screen files, `utils/api.ts`, and `services/*`.
- Pricing constants exist in both backend `index.ts` and mobile `utils/pricing.ts`.
- Payment failure endpoints exist twice: `/payments/failure` and `/payment/failure`.
- Payment create/verify aliases exist in singular and plural route variants.

## Missing Architecture

- No shared package for API contracts, order statuses, pricing, support statuses, or DTOs.
- No backend route/controller/service layering.
- No validation schema library.
- No centralized error handling.
- No test folders.
- No background job worker folder.
- No storage/upload module.
- No AI/vision module.
- No database migration/index management folder.

