# Database Audit

## Collections and Schemas

## User

Fields:

- `mobile` required unique string.
- `otp`, `otpExpires`.
- `pushToken`.
- timestamps.

Relationships:

- One user has many addresses.
- One user has many orders.
- One user has many support interactions/tickets.

Concerns:

- No profile fields such as name/email/preferences.
- OTP stored directly; local fallback stores plaintext OTP.
- No explicit index for push token or createdAt beyond unique mobile.

## Admin

Fields:

- `email` required unique.
- `password` required hash.
- `role` default `admin`.
- timestamps.

Concerns:

- No permissions, status, last login, password reset tokens, MFA, or audit metadata.
- Public registration route makes this collection sensitive.

## Address

Fields:

- `userId` ref User required.
- `fullName`, `phone`, `street`, `city`, `pincode`, `houseNumber`, `building`, `locality`, `addressType`, `instructions`, `latitude`, `longitude`.
- timestamps.

Relationships:

- Belongs to User.
- Referenced by Order.

Concerns:

- Required fields are enforced in route, not schema.
- No default address marker.
- No serviceability zone, geohash, or delivery instructions constraints.
- No compound index on `userId`.

## Order

Fields:

- `userId` ref User required.
- `addressId` ref Address required.
- `items` with itemName, quantity, price, itemTotal.
- `service`, `deliveryCharge`, `totalAmount`.
- `paymentId`, `paymentOrderId`, `paymentSignature`, `paymentStatus`, `paidAt`.
- `status` enum from scheduled to delivered.
- timestamps.

Relationships:

- Belongs to User.
- Belongs to Address.
- May be referenced by SupportTicket.

Concerns:

- Pickup date/slot selected in mobile is not persisted in schema.
- No cancellation/refund fields.
- No staff assignment, delivery partner, bag count, weight, invoice, tax, discount, or notes.
- No order event history except current status.
- No indexes on `userId`, `status`, `createdAt`, or compound operational queues.

## PaymentAttempt

Fields:

- `userId`, optional `addressId`, `service`, `items`, `totalAmount`, payment IDs, `status: failed`, `reason`, `metadata`.

Concerns:

- Only failed attempts are modeled.
- No success payment collection separate from Order.
- No reconciliation state, gateway response normalization, or retry state.

## SupportInteraction

Fields:

- `userId`, `mobile`, `message`, `response`, `intent`, `confidenceScore`, `aiOutcome`, `reason`.
- timestamps.

Concerns:

- Good foundation for support analytics.
- No token usage/model metadata because current assistant is rule-based.
- No conversation/session id.

## SupportTicket

Fields:

- `userId`, `mobile`, `message`, `userMessage`, `aiReply`, `aiOutcome`, `reason`, `intent`, optional `orderId`.
- `status`, `statusHistory`.
- `confidenceScore`, first response/resolution timestamps, SLA due times, time metrics.
- embedded `messages`.
- timestamps.

Concerns:

- Embedded messages are fine initially but can grow large.
- No agent assignment, priority, tags, attachments, internal notes.
- No indexes on status/SLA due fields.

## ER-style Relationship Description

- User 1 - N Address.
- User 1 - N Order.
- Address 1 - N Order.
- User 1 - N SupportInteraction.
- User 1 - N SupportTicket.
- Order 0/1 - N SupportTicket.
- User 1 - N PaymentAttempt.
- Address 0/1 - N PaymentAttempt.
- Admin currently has no persisted relationship to ticket/order actions except `changedBy: "admin"` strings.

## Index Recommendations

- `Address`: `{ userId: 1, createdAt: -1 }`.
- `Order`: `{ userId: 1, createdAt: -1 }`, `{ status: 1, createdAt: -1 }`, `{ paymentId: 1 }`, `{ paymentOrderId: 1 }`.
- `SupportTicket`: `{ status: 1, updatedAt: -1 }`, `{ userId: 1, status: 1 }`, `{ responseDueAt: 1 }`, `{ resolutionDueAt: 1 }`.
- `SupportInteraction`: `{ createdAt: -1 }`, `{ aiOutcome: 1, createdAt: -1 }`, `{ intent: 1, createdAt: -1 }`.
- `PaymentAttempt`: `{ userId: 1, createdAt: -1 }`, `{ paymentOrderId: 1 }`.

## Migration Recommendations

- Add explicit schema-level required/enum/min/max constraints.
- Add persisted pickup/delivery schedule fields to Order.
- Add order status event collection or embedded event history.
- Add AI asset/analysis collections before vision features.
- Add admin action audit log.
- Add migration/index management script workflow.

