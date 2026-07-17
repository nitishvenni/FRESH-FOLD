# Security Audit

## Authentication

Strengths:

- User and admin JWTs are implemented.
- Admin passwords use bcrypt.
- User OTP supports MSG91.

Risks:

- Public `/admin/register`.
- Missing startup validation for `JWT_SECRET`.
- Local OTP fallback logs OTPs.
- No refresh/revocation/session table.
- Admin token is stored in localStorage.

## JWT

- User token payload: `userId`, `mobile`.
- Admin token payload: `adminId`, `role`.
- Expiration: 7 days.
- No issuer/audience checks.
- No token rotation.

## Password Handling

- Admin password hashing uses bcrypt cost 10.
- Password reset uses static `ADMIN_RESET_KEY`, not a time-limited reset token.
- No password complexity beyond min length in reset route.
- No login rate limit on `/admin/login`.

## Secrets and Environment

- Required secrets are not centrally validated.
- No `.env.example` found.
- Health endpoint discloses whether OTP/payment providers are configured; this is useful operationally but should be considered before public exposure.

## Validation

- Manual validation exists but is inconsistent.
- No schema library.
- No sanitization layer.
- No strict schema constraints for many Mongoose fields.

## Injection Risks

- Mongoose is used rather than raw queries.
- Admin email search uses escaped regex, which is good.
- Request bodies are trusted as objects in many routes; no NoSQL injection guard middleware was found.

## XSS and CSRF

- Admin is a SPA using localStorage bearer token, so classic CSRF is lower than cookie auth, but XSS token theft is a concern.
- No CSP/security headers found.
- No helmet middleware.

## File Uploads

- No file uploads exist yet.
- Before AI vision features, add MIME validation, size limits, virus/malware scanning strategy, object storage policies, signed URLs, and retention controls.

## Authorization

- User resource ownership checks exist for addresses and user ticket messages.
- Admin routes are role-gated.
- Missing fine-grained admin permissions and action audit log.
- Socket connections are unauthenticated and CORS-open.

## Sensitive Logging

- Local OTP values are logged.
- Payment errors and general errors are logged raw in some places.
- No redaction policy.

## Priority Security Fixes

1. Remove or lock down `/admin/register`.
2. Fail startup when `JWT_SECRET` or `MONGO_URI` are missing.
3. Add OTP/admin-login rate limits.
4. Restrict CORS and authenticate sockets.
5. Remove console OTP logging outside local development.
6. Add helmet/security headers.
7. Add structured validation and NoSQL injection protection.
8. Add admin audit logs.

