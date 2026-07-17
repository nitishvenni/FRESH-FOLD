# Fresh & Fold Project Overview

## Purpose

Fresh & Fold is a laundry ordering platform with three applications:

- Mobile customer app for OTP login, service selection, item selection, scheduling, address capture, payment, order tracking, profile, and support.
- Admin dashboard for operations monitoring, order status management, revenue/support analytics, and live support ticket handling.
- Express/MongoDB backend for authentication, orders, payments, addresses, support automation, admin APIs, sockets, and push notifications.

## Current Features

- Customer OTP authentication by mobile number.
- Admin email/password login plus reset-key password reset.
- Item-wise laundry pricing with service multipliers.
- Address creation/editing with map/location fields.
- Razorpay payment order creation and verification, with mock payment support.
- Paid order creation after a short-lived payment verification token.
- User order history and order tracking.
- Admin order list, status update, and simulated workflow progression.
- Expo push-token registration and order status push notifications.
- Rule-based support assistant with confidence score, escalation, active tickets, live ticket chat, SLA metrics, and admin support analytics.
- Admin dashboard cards, charts, heatmap, live activity feed, notifications, and support chat.

## Mobile App Architecture

- Framework: Expo SDK 54, React Native 0.81, React 19, Expo Router.
- Routes live in `fresh-and-fold-mobile/app`.
- Shared UI lives in `components`, with additional duplicates in `components/ui`, `components/orders`, and `components/chat`.
- Auth is global through `context/AuthContext.tsx` and AsyncStorage token persistence.
- API access is split between `utils/api.ts` and `services/api.ts`; feature-specific services exist for orders, payments, and support.
- Styling is mostly local `StyleSheet.create` per screen/component, with some theme hooks/context.

## Admin Dashboard Architecture

- Framework: Vite, React 19, React Router 7.
- Entry shell is `src/App.tsx`.
- Admin data, socket subscriptions, login, derived metrics, and mutations are centralized in `src/admin/AdminContext.tsx`.
- Pages live in `src/pages`: Dashboard, Orders, Analytics, Support.
- Reusable components live in `src/components`.
- Styling is centralized as inline `CSSProperties` helpers in `src/admin/styles.ts`, with extensive inline page-level style objects.

## Backend Architecture

- Framework: Express 5, TypeScript, Mongoose, Socket.IO.
- Main API implementation is concentrated in `fresh-and-fold-backend/src/index.ts` with 2089 lines.
- Models live in `src/models`.
- Middleware is limited to `authMiddleware.ts` and `rateLimit.ts`.
- Support prompt/intent control lives in `src/support/promptControl.ts`.
- Utilities include push notifications and OTP generation.
- There are no controllers, route modules, service modules, validators, repositories, tests, or shared API types.

## Database

MongoDB via Mongoose models:

- `User`: mobile, OTP, OTP expiry, push token.
- `Admin`: email, hashed password, role.
- `Address`: user-owned address and coordinates.
- `Order`: user, address, items, service, payment fields, status.
- `PaymentAttempt`: failed payment logging.
- `SupportInteraction`: support assistant interaction log.
- `SupportTicket`: escalated support ticket with messages, SLA fields, status history.

## APIs

The backend exposes:

- Public health/root endpoints.
- User OTP endpoints.
- Admin auth endpoints.
- Order preview/create/list endpoints.
- Razorpay payment create/verify/failure endpoints.
- Address create/list/update endpoints.
- Support query/escalation/ticket-message endpoints.
- Admin order, ticket, and support analytics endpoints.

## Authentication

- Mobile auth uses OTP and JWTs signed with `JWT_SECRET`.
- Admin auth uses bcrypt password hashes and JWTs containing `role`.
- Admin middleware is implemented inline in `index.ts`; user auth middleware is separate.
- Tokens expire in 7 days.

## Third-party Integrations

- MongoDB through Mongoose.
- Razorpay for payments.
- MSG91 for OTP when configured; local console OTP fallback otherwise.
- Expo server SDK for push notifications.
- Socket.IO for live order/ticket updates.
- Render deployment configuration for backend.

## Deployment Status

- `render.yaml` deploys only `fresh-and-fold-backend`.
- Mobile/admin default API URLs point to `https://fresh-and-fold-backend.onrender.com`.
- No deployment config was found for admin or mobile builds beyond Expo/EAS scripts and Vite scripts.
- No CI/CD, test pipeline, environment schema, or migration workflow was found.

## Technology Stack

- Mobile: Expo, Expo Router, React Native, AsyncStorage, Socket.IO client, Razorpay RN, Expo Notifications, Reanimated, Maps.
- Admin: Vite, React, React Router, Framer Motion, Lucide, Recharts, React Calendar Heatmap, Socket.IO client.
- Backend: Express, Mongoose, JWT, bcrypt, Razorpay, Socket.IO, Expo Server SDK, dotenv.
- Database: MongoDB.

## Folder Organization

- `fresh-and-fold-mobile`: customer app.
- `fresh-and-fold-admin`: admin dashboard.
- `fresh-and-fold-backend`: API server.
- `render.yaml`: backend Render service.
- `docs/audit`: generated audit reports.

