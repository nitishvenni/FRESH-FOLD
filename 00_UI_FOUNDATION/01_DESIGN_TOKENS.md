\# Fresh & Fold AI  
\# UI FOUNDATION

\# DESIGN\_TOKENS.md

Version 2.0

\---

\# Purpose

This document defines the complete visual language of Fresh & Fold AI.

Every visual property in the application must originate from these tokens.

No component may hardcode values.

These tokens will be implemented as reusable constants for both:

• Mobile Application (React Native)

• Admin Dashboard (React)

This document is the single source of truth for every designer and developer.

\---

\# Token Philosophy

Tokens are not colors.

Tokens are not spacing.

Tokens represent product decisions.

Changing one token should update the entire product consistently.

Never duplicate values.

Never create "almost the same" values.

Consistency creates premium quality.

\---

\# Folder Structure

Mobile

src/theme/

colors.ts

spacing.ts

radius.ts

typography.ts

shadow.ts

glass.ts

opacity.ts

motion.ts

gradients.ts

blur.ts

icons.ts

zIndex.ts

layout.ts

index.ts

Admin

src/theme/

colors.ts

spacing.ts

radius.ts

typography.ts

shadow.ts

glass.ts

motion.ts

index.ts

\---

\# Token Categories

The following token groups must exist.

✓ Colors

✓ Gradients

✓ Typography

✓ Font Weights

✓ Letter Spacing

✓ Line Heights

✓ Border Radius

✓ Shadows

✓ Blur

✓ Glass

✓ Elevation

✓ Opacity

✓ Spacing

✓ Sizing

✓ Icon Sizes

✓ Animation Duration

✓ Animation Curves

✓ Layout

✓ Z Index

No visual value should exist outside these groups.

\---

\# Color Tokens

Create semantic color tokens.

Never name colors after hex values.

Good

Primary

Accent

Success

Danger

Surface

Background

Muted

Border

Glass

Overlay

Bad

Blue500

Gray600

DarkBlue

LightBlue

The component should describe intent.

Not appearance.

\---

\# Surface Hierarchy

The application should contain multiple surface levels.

Background

↓

Primary Surface

↓

Secondary Surface

↓

Glass Surface

↓

Elevated Surface

↓

Modal Surface

↓

Floating Surface

Every screen should use this hierarchy.

\---

\# Glass System

Create reusable glass variants.

Glass XS

Glass Small

Glass Medium

Glass Large

Glass Hero

Each variant defines

Blur

Opacity

Border

Shadow

Brightness

Components should reference variants instead of creating custom glass.

\---

\# Border Radius System

Create reusable radius tokens.

Small

Medium

Large

XL

XXL

Pill

Circle

No custom radius values allowed.

\---

\# Spacing System

Spacing should follow a consistent scale.

Tiny

Small

Medium

Large

XL

2XL

3XL

4XL

Every layout should use spacing tokens only.

Never use arbitrary margins or paddings.

\---

\# Typography System

Typography should define hierarchy.

Display

Hero

Heading

Title

Subtitle

Body

Caption

Label

Button

Tiny

Each token defines

Font Size

Weight

Line Height

Letter Spacing

Platform adjustments

Never specify typography directly inside components.

\---

\# Icon System

Icons must follow one sizing scale.

Tiny

Small

Medium

Large

XL

Hero

All icons should inherit color from semantic tokens.

Never embed icon colors.

\---

\# Shadow System

Instead of one shadow,

create elevation levels.

Level 0

None

Level 1

Subtle

Level 2

Card

Level 3

Floating

Level 4

Modal

Level 5

Hero

Both mobile and web should implement matching visual depth.

\---

\# Motion System

Motion is part of the design system.

Create reusable durations.

Instant

Fast

Normal

Slow

Hero

Create reusable easing curves.

Standard

Enter

Exit

Bounce

Spring

No component should define custom animation timings.

\---

\# Animation Tokens

Define reusable animation presets.

Fade

Scale

Slide

Float

Expand

Collapse

Press

Release

Pulse

Glow

Shimmer

Every screen animation should reuse these presets.

\---

\# Loading Tokens

Loading experiences should share consistent visuals.

Skeleton

Shimmer

Progress

AI Processing

Placeholder

These tokens ensure identical loading behavior.

\---

\# Blur Tokens

Create reusable blur strengths.

None

Light

Medium

Strong

Hero

Avoid arbitrary blur values.

\---

\# Opacity Tokens

Create semantic opacity values.

Disabled

Muted

Secondary

Primary

Overlay

Glass

Hover

Pressed

Never use raw opacity values.

\---

\# Gradient Tokens

Gradients should be semantic.

Hero Gradient

AI Gradient

Premium Gradient

Success Gradient

Danger Gradient

Overlay Gradient

Glass Gradient

No custom gradients inside components.

\---

\# Layout Tokens

Create layout helpers.

Screen Padding

Card Padding

Safe Area

Section Gap

Grid Gap

Content Width

Sidebar Width

Bottom Navigation Height

Header Height

Floating Action Offset

\---

\# Z Index Tokens

Create reusable layers.

Background

Content

Floating Card

Navigation

Bottom Sheet

Modal

Toast

Overlay

Tooltip

Always reference tokens.

Never use random z-index values.

\---

\# Responsive Tokens

Desktop

Tablet

Mobile

Large Mobile

Compact Mobile

Layout behavior should adapt using tokens.

\---

\# Accessibility Tokens

Touch Target

Minimum Font

Focus Ring

Contrast

Reduced Motion

High Contrast

These tokens must be available to every component.

\---

\# AI Experience Tokens

Fresh & Fold includes AI-first interactions.

Create dedicated tokens for

AI Badge

AI Processing

Confidence Indicator

Recommendation Card

AI Status

AI Highlight

These should visually distinguish AI experiences from normal UI.

\---

\# Sustainability Tokens

Create reusable visual styles for

Water Saved

CO₂ Saved

Time Saved

Eco Badge

Environmental achievements should have a consistent identity.

\---

\# Dark Mode Strategy

Dark mode is not an inversion.

Every token must define:

Light

Dark

Components switch automatically.

No component may manually adjust colors.

\---

\# Token Rules

Never hardcode values.

Never duplicate tokens.

Never reference another component.

Tokens must remain platform-independent.

Every component imports tokens.

Every screen imports components.

\---

\# Expected Output

Codex should generate:

Shared Theme

Theme Provider

Light Theme

Dark Theme

Design Token Constants

Reusable Utility Functions

Platform-specific adapters

No hardcoded visual values anywhere in the application.

\---

\# Definition of Done

✓ Complete token system

✓ Shared theme

✓ Mobile theme

✓ Admin theme

✓ Dark mode support

✓ Responsive tokens

✓ Motion tokens

✓ AI tokens

✓ Accessibility tokens

✓ Zero hardcoded styling

The design system should be capable of supporting every future feature without introducing new visual constants.

