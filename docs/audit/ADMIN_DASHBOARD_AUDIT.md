# Admin Dashboard Audit

## Architecture Summary

The admin dashboard is a Vite/React app with a clean four-page operations surface. It centralizes API calls, sockets, derived metrics, notifications, and mutations in `AdminContext`. This makes pages simple, but the context has become a large state/service hub.

## Page Scores

| Page | Existing Functionality | Gaps | Score |
| --- | --- | --- | --- |
| Login/Reset in `App.tsx` | Admin login, password reset with reset key, token localStorage, password visibility toggles. | No MFA, no account lockout UI, reset-key flow is operationally risky, no registration guard in UI. | 7 |
| Dashboard | Revenue/order cards, active/delivered counts, ticket alerts, AI resolution metrics, revenue chart, activity feed, overdue tickets. | Metrics are derived client-side from full order fetch; no date filters; no server-side dashboard aggregate. | 8 |
| Orders | Search, status filter, order table, order drawer, status update, simulation. | No pagination, assignment, date filters, refund/payment tools, export, audit log, or address/customer detail management. | 7 |
| Analytics | Support analytics, revenue chart, heatmap, common issues, overdue tickets. | Limited operational analytics; revenue is client-derived; no conversion/payment/drop-off metrics. | 7 |
| Support | Ticket search/filter, status updates, live chat, admin replies, sound toggle, alert clearing. | No agent assignment, canned replies, internal notes, customer profile sidebar, attachment support, priority/severity. | 8 |

## Components

- Strong component set: `DashboardCards`, `OrderTable`, `TicketTable`, `LiveChat`, `RevenueChart`, `RevenueHeatmap`, `Sidebar`, `TopBar`, `Skeleton`, `OrderDrawer`.
- Components use shared style helpers, but much layout/styling remains inline.
- `glassCard` style is reused widely and creates visual consistency.

## Analytics

Existing:

- Total revenue/orders/client-derived status counts.
- AI resolved/escalated count and rates.
- Average response/resolution time.
- Overdue support tickets.
- Common escalation reasons.
- Revenue by local date and heatmap.

Missing:

- Time range filters.
- Server-side aggregates.
- Payment success/failure analytics.
- Funnel metrics for booking flow.
- Service/item demand analysis.
- Customer retention/cohort metrics.
- SLA trend charts.

## Responsiveness

- Uses responsive CSS grid with `auto-fit/minmax`.
- Tables are horizontally scrollable through shared table wrappers.
- Sidebar/topbar behavior should be manually verified on narrow screens; code suggests responsiveness but not a full mobile admin design.

## Performance

- Admin fetches full orders and tickets into client memory.
- Socket events often trigger full refetches.
- No pagination or incremental updates.
- Derived metrics are memoized, which helps at small scale.
- Charts render from client-derived data.

## UI Consistency

- Consistent dark glass theme, gold accent, cards, tables, and badges.
- Buttons/inputs/selects share base styles.
- Some controls are text-heavy instead of icon/tool patterns.
- Inline styles make design evolution harder than CSS modules/design tokens.

## Missing Features

- Admin user management and roles.
- Customer/user management.
- Address/customer order detail management.
- Refund/payment reconciliation.
- Inventory/pricing management.
- Service area management.
- Staff/agent assignment.
- Real audit log.
- Exports/reports.
- Configurable catalog, service slots, and delivery capacity.

