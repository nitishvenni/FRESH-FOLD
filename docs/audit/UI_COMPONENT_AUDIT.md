# UI Component Audit

## Mobile Reusable UI

Components include:

- Cards: `Card`, `ui/Card`, `SummaryCard`, `ActionCard`, `ServiceCard`, `PaymentMethodCard`, `AddressCard`, `ItemCard`, `DateChip`, `TimeSlotCard`.
- Orders: `ActiveOrderCard`, `OrderCard`, `orders/OrderCard`, `OrderTimeline`, `orders/OrderTimeline`, `OrderSkeleton`, `TrackOrderSkeleton`.
- Chat/support: `ChatBubble`, `chat/ChatBubble`, support screen custom UI.
- Feedback: `Loader`, `ui/Loader`, `ToastHost`, `NetworkBanner`, `EmptyStateAnimation`.
- Navigation: `AppTabBar`, `FloatingTabBar`, `haptic-tab`.
- Inputs: `ui/Input`, `ui/Button`, `ui/OTPInput`.
- Template/themed: `themed-text`, `themed-view`, `collapsible`, `hello-wave`, `external-link`, `parallax-scroll-view`.

## Admin Reusable UI

Components include:

- Layout/navigation: `Layout`, `Sidebar`, `TopBar`, `PageTransition`, `CursorGlow`.
- Metrics/cards: `DashboardCards`, `MetricCard`, `StatCard`, `LiveActivityFeed`, `Skeleton`.
- Tables/drawers: `OrderTable`, `TicketTable`, `OrderDrawer`.
- Support: `LiveChat`.
- Charts: `RevenueChart`, `RevenueHeatmap`.

## Buttons

- Mobile has generic `ui/Button` but many screens use custom TouchableOpacity/Pressable styles.
- Admin has shared `buttonStyle`/`smallButtonStyle` but no true Button component.
- Disabled/loading states exist in some flows, not uniformly.

## Cards

- Mobile cards are duplicated between top-level and `ui`.
- Admin uses `glassCard` everywhere, producing consistency but making nested card surfaces common.

## Inputs and Forms

- Mobile OTP has a dedicated component.
- Address/payment/support forms are mostly screen-local.
- Admin input/select styles are centralized, but validation messages are local.

## Typography

- Mobile loads Inter and applies global typography in layout; many local font sizes/weights exist.
- Admin typography is inline with repeated sizes and uppercase labels.
- No formal typography scale shared across apps.

## Icons

- Admin uses Lucide icons.
- Mobile uses Expo/vector icons and native symbols.
- Icon usage is reasonably strong, but some admin commands are still text-only.

## Colors and Theme Consistency

- Admin is a dark glassmorphism theme with gold accents.
- Mobile uses theme hooks/context and a richer style language, but multiple theme files exist.
- `constants/theme.ts` appears to be Expo starter theme; `theme/theme.ts` appears more product-specific.

## Spacing and Animation

- Admin uses consistent grid gaps and Framer Motion page transitions.
- Mobile uses Reanimated and haptics in some components.
- No shared spacing scale enforced across mobile.

## Loading Indicators

- Mobile has loader/skeleton components and uses them in several screens.
- Admin has `Skeleton` and page suspense fallback.
- Missing: consistent retry/error empty components across all screens.

## Duplicate Components

- `Card` duplicated.
- `Loader` duplicated.
- `OrderCard` duplicated.
- `OrderTimeline` duplicated.
- `ChatBubble` duplicated.
- Template components remain alongside product components.

## Recommendations

- Consolidate mobile primitives into one `components/ui` system.
- Move order/chat feature components into one canonical location.
- Create shared status badge, empty state, error state, and retry components.
- Introduce design tokens for spacing, type, radius, and semantic colors.
- Convert admin style objects into component primitives or CSS modules once the surface grows.

