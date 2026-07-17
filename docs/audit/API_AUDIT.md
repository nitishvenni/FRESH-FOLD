# API Audit

## API Inventory

| Method | Path | Auth | Purpose | Notes |
| --- | --- | --- | --- | --- |
| GET | `/` | None | Root metadata. | Basic docs link. |
| GET | `/health` | None | Health, DB, OTP, payment config. | Good operational endpoint. |
| POST | `/auth/send-otp` | None | Send/create OTP for mobile. | Needs OTP rate limit. |
| POST | `/auth/verify-otp` | None | Verify OTP and return user JWT. | Local fallback stores/logs OTP. |
| POST | `/admin/register` | None | Create admin. | Dangerous public endpoint. |
| POST | `/admin/login` | None | Admin login JWT. | Good bcrypt usage. |
| POST | `/admin/forgot-password` | Reset key | Reset admin password. | Rate limited; operationally simple. |
| POST | `/orders/preview` | User JWT | Price items/service. | Used by order summary/payment. |
| POST | `/payments/create-order` | User JWT | Create Razorpay order. | Preferred plural route. |
| POST | `/payment/create-order` | User JWT | Alias for create payment order. | Duplicate alias. |
| POST | `/payments/verify` | User JWT | Verify Razorpay payment. | Duplicate alias exists. |
| POST | `/payment/verify` | User JWT | Alias for verify payment. | Used by mobile. |
| POST | `/payments/failure` | User JWT | Log failed payment. | Duplicate implementation. |
| POST | `/payment/failure` | User JWT | Log failed payment. | Used by mobile. |
| POST | `/orders` | User JWT | Create paid order. | Requires payment verification token. |
| GET | `/orders` | User JWT | List user's orders. | No pagination, no single-order endpoint. |
| POST | `/support/query` | User JWT | Rule-based support response or escalation. | Rate limited. |
| POST | `/support/escalate` | User JWT | Force support ticket escalation. | Rate limited. |
| GET | `/support/tickets/active` | User JWT | Fetch active user ticket. | Good support continuity. |
| POST | `/support/tickets/message` | User JWT | User replies to own ticket. | Ownership checked. |
| GET | `/addresses` | User JWT | List user addresses. | No pagination/default/delete. |
| POST | `/user/save-push-token` | User JWT | Save Expo push token. | No Expo token validation on input. |
| POST | `/addresses` | User JWT | Create address. | Manual validation. |
| PUT | `/addresses/:addressId` | User JWT | Update address. | Ownership checked. |
| GET | `/admin/orders` | Admin JWT | List all orders. | No pagination/filter server-side. |
| GET | `/admin/tickets` | Admin JWT | List support tickets. | No pagination/filter server-side. |
| POST | `/admin/tickets/message` | Admin JWT | Admin replies to ticket. | Updates first response/SLA. |
| PATCH | `/admin/tickets/:id/status` | Admin JWT | Update ticket status. | Good status normalization. |
| GET | `/admin/support/analytics` | Admin JWT | Support analytics/SLA. | Useful but unpaginated aggregation. |
| PUT | `/admin/orders/:id` | Admin JWT | Update order status. | Duplicate/less validated route. |
| PATCH | `/admin/orders/:id/status` | Admin JWT | Update order status and push/socket notify. | Preferred route. |
| POST | `/admin/orders/:id/simulate` | Admin JWT | Simulate order progression. | Useful demo/testing tool; risky in production. |

## Request and Response Patterns

- Most responses return `{ success: true }` plus domain data.
- Errors commonly return `{ message }`, sometimes with `{ code }`.
- Payment endpoints include stronger error codes.
- No OpenAPI schema or generated client.
- No version prefix such as `/api/v1`.

## Validation

- Manual validation for mobile, address, pincode, payment context, and status.
- Missing structured schema validation for most payloads.
- Missing payload size tuning beyond `express.json()` defaults.

## Possible Errors

Common:

- 400 invalid input.
- 401 invalid/missing token.
- 403 admin role denied.
- 404 ticket/order/address not found.
- 409 payment already used.
- 429 support/reset rate limit.
- 500 route failures.
- 503 database unavailable or reset not configured.

## Missing Endpoints

- `GET /orders/:id`.
- Cancel order.
- Delete address.
- Set default address.
- User profile get/update.
- Catalog/service/pricing management.
- Schedule availability/capacity.
- Admin user/customer management.
- Payment/refund/reconciliation.
- File upload and media retrieval.
- AI analysis submit/status/result endpoints.
- Background job status endpoints.
- Audit log endpoints.

## Unused or Duplicate Endpoints

- `/payment/*` and `/payments/*` aliases are duplicates.
- `PUT /admin/orders/:id` overlaps with `PATCH /admin/orders/:id/status` but has weaker validation.
- `/admin/register` is not used by admin UI and should not be publicly available.

