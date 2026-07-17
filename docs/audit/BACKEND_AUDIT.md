# Backend Audit

## Architecture

The backend is a TypeScript Express/Mongoose server with Socket.IO. It is functional and covers the core product flows, but most implementation lives in one 2089-line `src/index.ts` file. This creates a high maintenance risk as AI, storage, and background workflows are added.

## Routes

Routes are declared directly in `index.ts`. There are no route modules, controllers, service classes, DTOs, or validators. This is workable for the current size but not ready for larger AI workflows.

## Controllers and Services

Not present as separate layers. Business logic for pricing, payment verification, order creation, support ticket upsert, SLA serialization, and admin analytics is embedded in route handlers or local helper functions.

## Middleware

Existing:

- `authMiddleware.ts`: verifies user JWT and attaches decoded payload.
- Inline `adminMiddleware`: verifies JWT and checks `role === "admin"`.
- `rateLimit.ts`: in-memory per-namespace/user/IP limiter.

Gaps:

- No central error middleware.
- No request validation middleware.
- No request ID/correlation ID.
- No structured logging middleware.
- No upload middleware.
- No CORS origin allowlist.

## Validation

Strengths:

- Mobile number and pincode validation exist.
- Order status validation exists in `PATCH /admin/orders/:id/status`.
- Address ownership is checked for user address operations.
- Payment verification compares payment context hash before order creation.

Weaknesses:

- Validation is manual and inconsistent.
- Mongoose schemas are permissive; many fields are optional strings/numbers.
- `PUT /admin/orders/:id` accepts status without enum validation, unlike the PATCH route.
- No schema validation for complex payloads like payment metadata or support messages.

## Authentication and Authorization

Strengths:

- JWT-based auth is implemented.
- Admin passwords are hashed with bcrypt.
- User/admin routes are separated by middleware.
- User-owned resources are checked for addresses and user ticket messages.

Risks:

- `JWT_SECRET` is cast without startup failure if missing.
- Admin registration endpoint is public and unguarded.
- Admin role is just a string in JWT; no permission model.
- Socket connections are unauthenticated and use open CORS.
- Tokens are long-lived and no revocation/refresh mechanism exists.

## Security

Good:

- Bcrypt for admin passwords.
- Razorpay signature verification.
- Short-lived payment verification token.
- Duplicate payment protection by unique fields and runtime checks.

Bad/Risky:

- CORS `origin: "*"` for HTTP and sockets.
- Local OTP fallback logs OTP to console.
- Public admin registration.
- No helmet/security headers.
- No input sanitization layer.
- No CSRF strategy for admin if browser token storage is used.
- No file upload security because uploads do not exist yet.

## Logging

Only `console.log` and `console.error` are used. No structured logs, severity levels, request IDs, redaction, or external logging integration.

## Error Handling

Mostly per-route try/catch. Response shapes vary (`message`, `code`, `success`). No centralized error types.

## File Upload and Storage

No upload or storage implementation was found. This is a major blocker for garment/stain/fabric/care-label AI features.

## Rate Limiting

In-memory limiter exists for support query, support escalation, and admin password reset. It is not distributed and resets on process restart. Auth OTP endpoints are not rate limited in code.

## Environment Configuration

Used variables include `MONGO_URI`, `JWT_SECRET`, `PORT`, `MOCK_PAYMENTS`, Razorpay keys, MSG91 keys, and `ADMIN_RESET_KEY`. There is no `.env.example`, environment schema, or startup validation.

## API Organization

Current organization is simple but brittle:

- All route registration is in one file.
- Helpers are local and cannot be tested in isolation easily.
- Pricing/support/order/payment logic is not modularized.
- No OpenAPI spec or API inventory generated from code.

## Potential Bugs and Code Smells

- Duplicate Socket.IO `connection` handlers.
- Some log strings show mojibake/encoding artifacts.
- `generateOTP.ts` exists but `index.ts` generates OTP inline.
- `buildControlledSupportReply` is deterministic, but fields are labeled as AI in analytics; this could mislead future planning.
- `framer-motion` is a backend dependency but appears frontend-only.
- Payment failure handlers are duplicated.
- `create-order.tsx` mobile path likely calls `/orders` without required payment token.
- Admin status casing differs between backend storage (`open`) and admin UI (`Open`) and depends on serializer normalization.
- No pagination on admin orders/tickets or user orders.

