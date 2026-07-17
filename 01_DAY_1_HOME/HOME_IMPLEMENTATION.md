\# Fresh & Fold AI  
\# Day 1 — Home Screen Implementation

\# HOME\_IMPLEMENTATION.md

Version: 1.0  
Status: Approved for Implementation

\---

\# 1\. PURPOSE

This document defines the implementation requirements for the redesigned Fresh & Fold Home screen.

The Home screen redesign must follow the approved Dark Mode and Light Mode visual references provided with this specification.

The objective is to transform the existing Home screen into a premium, AI-first laundry dashboard while preserving all existing working business logic.

This is primarily a UI and UX implementation task.

Existing functionality must not be unnecessarily rewritten.

\---

\# 2\. SOURCE OF TRUTH

Before modifying code, read:

00\_UI\_FOUNDATION/README.md

00\_UI\_FOUNDATION/DESIGN\_TOKENS.md

00\_UI\_FOUNDATION/COMPONENT\_LIBRARY.md

00\_UI\_FOUNDATION/USER\_FLOW.md

00\_UI\_FOUNDATION/SCREEN\_SPECIFICATIONS.md

00\_UI\_FOUNDATION/MOTION\_SYSTEM.md

00\_UI\_FOUNDATION/IMPLEMENTATION.md

Then read:

01\_DAY\_1\_HOME/HOME\_IMPLEMENTATION.md

Also inspect:

1\. Approved Dark Mode Home reference image.  
2\. Approved Light Mode Home reference image.  
3\. Approved Concept 7 Bucket \+ Fold AI Care logo asset.

The visual reference images are the source of truth for the intended Home screen visual composition.

The repository is the source of truth for:

\- Existing routes  
\- Existing APIs  
\- Existing authentication  
\- Existing state management  
\- Existing business logic  
\- Existing order lifecycle  
\- Existing booking lifecycle  
\- Existing payment flow  
\- Existing data models

Do not assume repository structure from documentation.

Audit the repository first.

\---

\# 3\. CRITICAL CODEX INSTRUCTION

DO NOT START CODING IMMEDIATELY.

First:

1\. Inspect the repository.  
2\. Identify the mobile application.  
3\. Identify the current Home screen.  
4\. Identify the current bottom navigation.  
5\. Identify existing theme implementation.  
6\. Identify reusable UI components.  
7\. Identify authentication/user state.  
8\. Identify order state and APIs.  
9\. Identify booking flow.  
10\. Identify existing support and profile routes.  
11\. Identify notification implementation.  
12\. Identify asset management.  
13\. Identify animation libraries already installed.  
14\. Identify whether booking drafts already exist.  
15\. Identify any dependencies required by this implementation.

After inspection, create an implementation plan.

Only then begin modifications.

Do not invent file paths before repository inspection.

\---

\# 4\. PRIMARY IMPLEMENTATION RULE

PRESERVE BUSINESS LOGIC.

The Home redesign must not unnecessarily rewrite:

\- Authentication  
\- OTP flow  
\- JWT handling  
\- API clients  
\- Backend endpoints  
\- Existing order logic  
\- Existing payment logic  
\- Existing address logic  
\- Existing tracking logic  
\- Existing Socket.IO logic  
\- Existing notification logic  
\- Existing database models

UI components may consume this existing logic.

Do not duplicate existing logic.

\---

\# 5\. APPROVED HOME DESIGN

The Home screen must closely follow the approved visual reference.

There are two visual variants:

DARK MODE

and

LIGHT MODE

Both modes must use the same:

\- Component hierarchy  
\- Information architecture  
\- Navigation  
\- Features  
\- Functional behavior

Only visual theme tokens change.

Do not create two separate Home screen implementations.

Use one component tree controlled by the application's theme system.

\---

\# 6\. HOME SCREEN ARCHITECTURE

The final Home screen hierarchy is:

Home

├── Header  
│   ├── Dynamic Greeting  
│   ├── User First Name  
│   └── Notifications  
│  
├── Hero Section  
│   ├── AI Care Status  
│   ├── Hero Headline  
│   ├── Hero Description  
│   ├── Smart Scan CTA  
│   └── Laundry Hero Visual  
│  
├── Quick Actions  
│   ├── New Booking  
│   ├── Continue Booking / Bookings  
│   ├── Offers  
│   └── Refer & Earn  
│  
├── Current Order  
│   ├── Order Information  
│   ├── Order Status  
│   └── Progress Timeline  
│  
├── AI Recommendation  
│  
├── Environmental Impact  
│  
└── Bottom Navigation  
    ├── Home  
    ├── Orders  
    ├── AI Care  
    ├── Support  
    └── Profile

\---

\# 7\. HEADER

The previous hamburger/menu button must be removed.

Do not replace it with another navigation button.

The Home screen already has permanent bottom navigation.

The header should remain minimal.

Structure:

Good Evening,  
{FirstName} 👋

                                    Notifications

Greeting must dynamically change based on local time.

Suggested states:

Morning

Good Morning,

Afternoon

Good Afternoon,

Evening

Good Evening,

Night

Good Night,

Use the authenticated user's first name.

Do not hardcode:

Clyode

The notification button appears in the upper-right area.

If unread notifications exist, display a subtle unread indicator.

Do not add another AI button to the header.

The previous generic sparkle AI button must not be used.

\---

\# 8\. HERO SECTION

The Hero section is the visual centerpiece of the Home screen.

The approved reference composition must be preserved.

The section contains:

AI Care Mode    ● Active

Laundry,  
reimagined.

Smart care for every fabric.  
Cleaner results, every time.

Smart Scan CTA

Laundry Hero Visual

The hero image should visually integrate with the background.

Avoid making the hero visual look like a separate rectangular image card.

Use gradients, masks, positioning, clipping, or overlays where appropriate.

The Hero must adapt responsively to different device heights and widths.

Do not hardcode the layout for only the reference device.

\---

\# 9\. AI CARE STATUS

Display:

AI Care Mode    ● Active

This is a status element.

It is NOT another primary navigation destination.

It communicates that AI Care capabilities are available.

Do not use Gemini-style sparkle branding as the primary AI Care identity.

Use the Fresh & Fold AI Care visual language defined in the approved assets and design system.

\---

\# 10\. HERO HEADLINE

Primary headline:

Laundry,  
reimagined.

Maintain the approved typography hierarchy.

"reimagined." may use the theme's accent treatment.

Dark Mode and Light Mode must preserve sufficient contrast.

The headline should be one of the strongest visual elements on the screen.

Do not reduce it to standard card-heading typography.

\---

\# 11\. HERO DESCRIPTION

Display:

Smart care for every fabric.  
Cleaner results, every time.

This is supporting copy.

Keep it visually secondary to the headline.

\---

\# 12\. SMART SCAN CTA

Display a prominent Smart Scan action.

Structure:

\[ Scan Icon \]

Smart Scan

AI analyzes your clothes

\[ Arrow \]

Tapping Smart Scan should navigate to the Smart Scan entry point when available.

If the Smart Scan feature has not yet been implemented:

Do not build fake AI functionality.

Instead:

\- Connect to an existing Smart Scan route if one exists.

OR

\- Route to an approved placeholder/shell screen.

The architecture must allow the actual Smart Scan implementation to be added later without redesigning Home.

Do not use the AI Care Bucket \+ Fold logo as the Smart Scan icon.

Smart Scan represents image scanning.

AI Care represents the broader AI platform.

These are separate concepts.

\---

\# 13\. QUICK ACTIONS

The Home screen contains exactly four Quick Actions.

1\. New Booking  
2\. Continue Booking / Bookings  
3\. Offers  
4\. Refer & Earn

Do not add:

My Orders

Support

Profile

These already exist elsewhere in the navigation architecture.

\---

\# 14\. NEW BOOKING

Label:

New Booking

Suggested supporting text:

Schedule Pickup

or

Start Booking

Use whichever better matches the existing application terminology.

Tapping this action starts the existing manual booking flow.

Do not create a second booking flow.

Reuse the existing booking flow.

\---

\# 15\. BOOKING DRAFT / CONTINUE BOOKING

This action represents unfinished booking progress.

It is NOT an Order.

A Booking Draft is a temporary booking session that has not yet completed the confirmation/order creation process.

Examples include a user leaving during:

\- Service selection  
\- Item selection  
\- Pickup scheduling  
\- Address selection  
\- Order summary  
\- Payment

If an active draft exists, display:

Continue Booking

with contextual supporting text.

Examples:

Continue Booking  
Complete your address

Continue Booking  
Select pickup time

Continue Booking  
Payment pending

The user must resume from the appropriate saved step.

If no draft exists, display a neutral state such as:

Bookings

No pending booking

Do not confuse Booking Drafts with confirmed Orders.

\---

\# 16\. BOOKING DRAFT LIFECYCLE

Target draft expiration:

12 hours

Each draft should conceptually contain:

\- User reference  
\- Current booking step  
\- Selected service  
\- Selected items  
\- Quantities  
\- Pickup information  
\- Address reference  
\- Pricing snapshot where appropriate  
\- Created timestamp  
\- Updated timestamp  
\- Expiration timestamp

IMPORTANT:

Do not implement a new database model during the Home UI refactor without first auditing the backend.

If Booking Draft persistence does not currently exist:

1\. Document the missing capability.  
2\. Implement the Home UI in a way that supports draft state.  
3\. Propose the required backend/database changes separately.  
4\. Do not introduce an unreviewed breaking backend change.

When the Booking Draft feature is formally implemented:

\- Drafts expire after 12 hours.  
\- Completed bookings remove their associated draft.  
\- Explicitly discarded drafts are removed.  
\- Expired drafts must not be resumable.  
\- Backend must validate expiration.  
\- Database cleanup may use MongoDB TTL where appropriate.

MongoDB TTL cleanup must not be treated as exact real-time expiration.

The backend must reject or ignore expired drafts even if the expired document has not yet been physically deleted.

For MVP, prefer one active draft per user unless existing architecture supports multiple drafts.

\---

\# 17\. OFFERS

Label:

Offers

Suggested supporting text:

Best Deals

This action opens the existing Offers experience if available.

If Offers does not exist yet, use an approved placeholder route or mark it as a pending feature.

Do not create fake backend promotions.

\---

\# 18\. REFER & EARN

Label:

Refer & Earn

Suggested supporting text:

Invite & Earn

This action opens the referral experience.

If referral functionality does not exist yet, create only the UI entry point or approved placeholder.

Do not invent reward balances or referral earnings.

\---

\# 19\. CURRENT ORDER

The Home screen displays the most relevant active order.

Example:

CURRENT ORDER

Order \#FF784521

Premium Wash • 8 Items

In Progress

The data must come from existing order data where available.

Do not hardcode the example order.

If multiple active orders exist, follow existing product/business rules to determine which order appears.

If no rule exists, prefer the active order with the nearest relevant delivery or most recent activity.

Do not change backend order semantics solely for the Home redesign.

\---

\# 20\. CURRENT ORDER TIMELINE

The approved visual reference uses a horizontal progress timeline.

Conceptual stages:

Picked Up

Cleaning

Ironing

Out for Delivery

Delivered

However, the actual timeline must respect existing backend order statuses.

Do not invent statuses that conflict with backend logic.

Map existing backend statuses to user-friendly display labels.

The current stage receives the strongest emphasis.

Completed stages appear completed.

Future stages appear subdued.

The timeline should animate only when appropriate.

Do not run continuous distracting animations.

Tapping the Current Order card should open the existing Order Details or Live Tracking experience.

\---

\# 21\. NO ACTIVE ORDER STATE

If no active order exists:

Do not display fake order data.

Replace the Current Order card with an intentional empty state.

Example:

No active orders

Ready when you are.

\[ Start New Booking \]

Keep the empty state visually consistent with the premium design system.

\---

\# 22\. AI RECOMMENDATION

Display an AI Recommendation section below Current Order.

Approved visual concept:

AI RECOMMENDATION

Denim looks better with  
cold water wash.

Keeps color 34% longer

Try Premium Wash →

The actual recommendation system may not exist on Day 1\.

If real AI recommendations are unavailable:

Use isolated demo/mock data only for development or hackathon demonstration.

Mock data must not be embedded deeply into UI components.

Create a clear data interface so future AI responses can replace mock data.

Example conceptual interface:

AIRecommendation

\- id  
\- title  
\- description  
\- reason  
\- actionLabel  
\- actionType  
\- image  
\- confidence optional

Do not call Gemini or OpenAI directly from the Home component.

AI integration belongs to the AI service layer.

\---

\# 23\. ENVIRONMENTAL IMPACT

Display:

You're making a difference 🌍

Water Saved

CO₂ Prevented

Time Saved

Example values shown in the visual reference are illustrative.

Do not present fake metrics as real user data in production.

If real impact calculations exist:

Use them.

If they do not exist:

Use isolated demo values only in development/demo mode.

The component architecture should support real metrics later.

\---

\# 24\. BOTTOM NAVIGATION

The final approved bottom navigation is:

Home

Orders

AI Care

Support

Profile

Exact order:

Home | Orders | \[AI Care\] | Support | Profile

This replaces the navigation shown in the early visual mockups.

Do not use:

Home | Bookings | AI Care | Orders | Profile

Do not use:

Home | Services | AI Care | Orders | Profile

The approved navigation is:

Home | Orders | AI Care | Support | Profile

\---

\# 25\. AI CARE CENTER ACTION

AI Care is the signature center navigation action.

It must visually stand out from the other four navigation destinations.

Use the approved:

CONCEPT 7

BUCKET \+ FOLD

The bucket contains folded fabric arranged to form a hidden letter "F".

This is the official Fresh & Fold AI Care identity.

The implementation must use the actual approved logo asset supplied with the project.

Do not attempt to recreate the logo using:

\- Emoji  
\- Lucide icons  
\- CSS shapes  
\- Generic bucket icons  
\- Generic AI icons  
\- Sparkles  
\- Stars  
\- Gemini-like symbols  
\- Robot icons  
\- Brain icons

Use the approved asset.

The logo should remain recognizable at navigation size.

Provide an appropriate optimized asset variant if required.

\---

\# 26\. AI CARE ACTION BEHAVIOR

Tapping the center AI Care action should open the AI Care Hub.

Future AI Care Hub capabilities include:

\- Smart Scan  
\- Gallery Scan  
\- Describe Laundry  
\- Care Label Scan  
\- Recent Analyses

Day 1 does not require full AI implementation.

If the AI Care Hub does not exist:

Create only the navigation-safe shell required for future integration.

Do not implement Gemini/OpenAI calls during the Home redesign.

\---

\# 27\. BOTTOM NAVIGATION RESPONSIBILITIES

HOME

Dashboard and overview.

ORDERS

Confirmed orders.

Includes relevant active and historical order experiences according to existing architecture.

AI CARE

AI-powered laundry intelligence.

SUPPORT

Customer support experience.

PROFILE

Account and preferences.

Do not place Booking Drafts inside Orders.

Booking Drafts belong to the booking workflow.

\---

\# 28\. DARK MODE

The approved Dark Mode reference is the canonical visual target.

Characteristics:

\- Deep near-black background  
\- Premium dark surfaces  
\- Controlled glass effects  
\- High contrast typography  
\- Subtle borders  
\- Restrained shadows  
\- Strategic accent usage  
\- Integrated hero imagery  
\- Elevated center AI Care action

Avoid excessive glowing.

Avoid neon cyberpunk styling.

Avoid making every card glass.

Dark Mode should feel premium and calm.

\---

\# 29\. LIGHT MODE

The approved Light Mode reference is the canonical visual target.

Characteristics:

\- Bright atmospheric background  
\- Soft depth  
\- Strong typography contrast  
\- Controlled translucent surfaces  
\- Premium blue accents  
\- Integrated hero imagery  
\- Elevated center AI Care action

Avoid washed-out text.

Avoid excessive blur.

Avoid making every surface transparent.

Light Mode must remain highly readable.

\---

\# 30\. THEME IMPLEMENTATION

Do not maintain separate component implementations for Light and Dark Mode.

Use:

Theme Provider

↓

Design Tokens

↓

Shared Components

↓

Theme Variants

All colors must come from design tokens.

All spacing must come from spacing tokens.

All radii must come from radius tokens.

All typography must use typography tokens.

All motion must use motion tokens.

Avoid hardcoded values unless technically unavoidable and documented.

\---

\# 31\. RESPONSIVE BEHAVIOR

The approved reference represents one visual target.

Do not hardcode the screen for a single device resolution.

The Home screen must adapt to:

\- Small Android phones  
\- Standard phones  
\- Large phones  
\- iPhone safe areas  
\- Android status/navigation areas

Use responsive sizing carefully.

Hero imagery may crop responsively.

Text must never overlap imagery.

Bottom navigation must respect safe-area insets.

The Home screen must remain scrollable when vertical space is insufficient.

\---

\# 32\. REUSABLE COMPONENTS

Prefer reusable components defined by COMPONENT\_LIBRARY.md.

Likely Home components include:

HomeHeader

HeroSection

AICareStatus

SmartScanCTA

QuickActions

QuickActionItem

CurrentOrderCard

OrderProgressTimeline

AIRecommendationCard

ImpactCard

BottomNavigation

AICareFAB

Do not blindly create these exact files before repository inspection.

Reuse existing compatible components where appropriate.

Extract new components only when they provide meaningful reuse or maintainability.

\---

\# 33\. MOTION

Follow:

MOTION\_SYSTEM.md

Home motion should remain subtle.

Suggested sequence:

Header

↓

Hero content

↓

Smart Scan CTA

↓

Quick Actions

↓

Current Order

↓

Recommendation

↓

Impact

Do not make users wait for content.

Animations should enhance hierarchy without delaying interaction.

\---

\# 34\. AI CARE FAB MOTION

The center AI Care action may have a subtle idle state.

Avoid continuous distracting movement.

On press:

\- Provide immediate visual feedback.  
\- Use appropriate scale/compression.  
\- Use haptic feedback where supported.  
\- Transition into AI Care Hub.

The approved Bucket \+ Fold logo must remain visually intact during animation.

Do not distort the logo excessively.

\---

\# 35\. CURRENT ORDER MOTION

When the Home screen loads:

The existing progress state may reveal subtly.

Do not replay elaborate timeline animations every time the user returns to Home.

If order status changes in real time:

Animate only the changed stage.

\---

\# 36\. PERFORMANCE

Target smooth interaction.

Avoid excessive blur layers.

Avoid stacking expensive transparency effects.

Optimize hero images.

Optimize AI Care logo assets.

Avoid unnecessary re-renders.

Use performant list/scroll primitives.

Do not sacrifice performance to reproduce decorative effects.

Visual fidelity is important.

Usability and performance are more important.

\---

\# 37\. ACCESSIBILITY

Support:

\- Screen readers  
\- Sufficient contrast  
\- Reduced motion  
\- Dynamic text where practical  
\- Minimum touch target sizes  
\- Clear accessibility labels

The AI Care logo must have an accessible label:

AI Care

Do not rely solely on icon recognition.

The Current Order timeline must expose status information to screen readers.

\---

\# 38\. LOADING STATES

The Home screen should not display a full-screen spinner for normal data loading.

Use skeleton states for:

\- Current Order  
\- AI Recommendation  
\- Impact metrics

The Hero and navigation should remain available where possible.

\---

\# 39\. ERROR STATES

If Current Order fails:

Do not break the Home screen.

Display a localized retry state inside the Current Order section.

If Recommendation fails:

Hide the recommendation or show a safe fallback.

If Impact metrics fail:

Hide or gracefully degrade the section.

One failed Home widget must not crash the entire Home screen.

\---

\# 40\. OFFLINE BEHAVIOR

Where existing architecture supports cached data:

Show the most recent safe cached state.

Clearly avoid presenting stale operational information as real-time if that distinction matters.

New Booking actions requiring connectivity should handle offline state gracefully.

\---

\# 41\. ANALYTICS EVENTS

If analytics infrastructure exists, consider events such as:

home\_viewed

home\_smart\_scan\_pressed

home\_new\_booking\_pressed

home\_continue\_booking\_pressed

home\_offers\_pressed

home\_refer\_pressed

home\_current\_order\_pressed

home\_ai\_recommendation\_pressed

home\_ai\_care\_pressed

Do not introduce a new analytics platform solely for this screen.

\---

\# 42\. IMPLEMENTATION SEQUENCE

Codex must implement Day 1 in controlled stages.

STAGE 1

Repository audit.

No modifications.

STAGE 2

Identify required shared design-system changes.

STAGE 3

Implement or adapt reusable Home components.

STAGE 4

Implement Home layout.

STAGE 5

Implement Dark Mode.

STAGE 6

Implement Light Mode.

STAGE 7

Update bottom navigation.

STAGE 8

Integrate approved Bucket \+ Fold AI Care logo.

STAGE 9

Connect existing routes and real data.

STAGE 10

Add safe placeholders only for unavailable future features.

STAGE 11

Implement motion.

STAGE 12

Accessibility pass.

STAGE 13

Performance pass.

STAGE 14

Regression testing.

\---

\# 43\. DO NOT DO

Do not:

Rewrite the backend.

Rewrite authentication.

Rewrite payment.

Rewrite tracking.

Rename API routes without necessity.

Create duplicate booking flows.

Create duplicate Orders screens.

Place Booking Drafts inside Orders.

Hardcode user names.

Hardcode order IDs.

Hardcode production impact metrics.

Implement fake AI as real AI.

Call Gemini directly from UI components.

Replace the approved AI Care logo.

Use Gemini-style sparkle branding.

Reintroduce the hamburger menu.

Add another AI icon in the header.

Change the approved bottom navigation.

Create separate Light and Dark Home screens.

Rebuild working features unnecessarily.

\---

\# 44\. VISUAL ACCEPTANCE CRITERIA

The implementation is visually accepted when:

✓ Dark Mode closely matches the approved Dark Mode Home reference.

✓ Light Mode closely matches the approved Light Mode Home reference.

✓ Overall composition remains consistent with the approved references.

✓ Hamburger menu is removed.

✓ Header contains greeting and Notifications.

✓ Hero composition is preserved.

✓ Smart Scan remains prominent.

✓ Quick Actions contain the approved four actions.

✓ Current Order timeline is visually clear.

✓ AI Recommendation matches the intended premium presentation.

✓ Environmental Impact section is preserved.

✓ Bottom navigation uses the approved architecture.

✓ Concept 7 Bucket \+ Fold logo is used for AI Care.

✓ Generic sparkle branding is not used as the AI Care identity.

\---

\# 45\. FUNCTIONAL ACCEPTANCE CRITERIA

✓ Existing authentication still works.

✓ Existing New Booking flow still works.

✓ Existing Orders flow still works.

✓ Existing Support flow still works.

✓ Existing Profile flow still works.

✓ Current Order uses real existing data where available.

✓ Booking Draft is not treated as an Order.

✓ AI Care navigation does not break existing navigation.

✓ Light/Dark theme switching works.

✓ Back navigation works.

✓ No existing API contract is unintentionally broken.

✓ No existing business logic is unnecessarily duplicated.

\---

\# 46\. BOOKING DRAFT ACCEPTANCE CRITERIA

When formally implemented:

✓ Booking progress can be resumed.

✓ User resumes from the correct step.

✓ Draft and Order are separate concepts.

✓ Draft expires after 12 hours.

✓ Expired draft cannot be resumed.

✓ Successful booking removes the associated draft.

✓ Explicit discard removes the draft.

✓ Backend validates expiration.

✓ Database cleanup handles expired records.

✓ MVP avoids uncontrolled accumulation of drafts.

\---

\# 47\. DAY 1 SCOPE BOUNDARY

Day 1 IS:

Home redesign

Light Mode

Dark Mode

Bottom navigation redesign

AI Care center action integration

Approved AI Care logo integration

Existing data integration

Booking Draft UI readiness

AI Care Hub navigation shell if necessary

Motion polish

Responsive behavior

Accessibility

Testing

Day 1 IS NOT:

Gemini integration

OpenAI integration

Garment recognition

Fabric detection

Stain detection

Care label AI

OCR pipeline

Smart Scan backend

Production AI recommendations

Full Booking Draft backend implementation unless separately approved

Referral backend implementation

Impact calculation backend

\---

\# 48\. CODEX FINAL INSTRUCTION

Before implementation:

Audit the repository and report:

1\. Current Home screen path.  
2\. Current bottom navigation implementation.  
3\. Existing Home components.  
4\. Existing theme system.  
5\. Existing Light/Dark Mode support.  
6\. Existing Orders integration.  
7\. Existing booking flow.  
8\. Existing Booking Draft capability, if any.  
9\. Existing notification route/state.  
10\. Existing Support route.  
11\. Existing Profile route.  
12\. Existing animation libraries.  
13\. Existing icon libraries.  
14\. Existing asset system.  
15\. Files that need modification.  
16\. Files that need creation.  
17\. Dependencies, if any.  
18\. Risks to existing functionality.

Then provide a concise implementation plan.

Do not modify code until the repository audit and implementation plan are complete.

When implementation begins:

Work incrementally.

Preserve existing business logic.

Use the approved Home visual references.

Use the approved Concept 7 Bucket \+ Fold asset.

Implement one shared Home architecture for both themes.

Do not invent missing backend functionality.

If documentation conflicts with technical reality in the repository:

Preserve working business logic.

Report the conflict.

Adapt the UI implementation safely.

\---

\# 49\. DEFINITION OF DONE

Day 1 Home implementation is complete when:

✓ Home screen redesign is implemented.

✓ Dark Mode matches the approved visual direction.

✓ Light Mode matches the approved visual direction.

✓ Header architecture is updated.

✓ Hamburger menu is removed.

✓ Notifications remain accessible.

✓ Hero is implemented.

✓ Smart Scan CTA is implemented.

✓ Quick Actions are updated.

✓ Booking Draft UI state is supported architecturally.

✓ Current Order is integrated.

✓ AI Recommendation component is ready.

✓ Environmental Impact component is ready.

✓ Bottom navigation is updated.

✓ AI Care is the center action.

✓ Approved Concept 7 Bucket \+ Fold logo is used.

✓ Support is present in bottom navigation.

✓ Existing flows remain functional.

✓ No duplicate navigation destinations are introduced.

✓ No fake AI functionality is presented as production functionality.

✓ Home is responsive.

✓ Home is accessible.

✓ Home performs smoothly.

✓ Regression testing passes.

\---

