\# Fresh & Fold AI  
\# UI FOUNDATION

\# IMPLEMENTATION.md

Version 1.0

\---

\# Purpose

This document provides the implementation strategy for upgrading the existing Fresh & Fold application to the new premium design system.

This is a UI refactor only.

Business logic must remain unchanged.

Authentication, backend APIs, payment processing, tracking, database models and order workflows are considered production logic and must not be rewritten.

The implementation should enhance presentation while preserving functionality.

\---

\# Repository Strategy

The repository already contains:

✓ Mobile Application

✓ Backend

✓ Admin Dashboard

✓ Authentication

✓ Orders

✓ Tracking

✓ Payment

✓ Notifications

✓ Theme

The objective is NOT to rebuild the application.

The objective is to progressively replace the UI layer.

\---

\# Golden Rule

Replace

Presentation

NOT

Business Logic

\---

\# Refactoring Philosophy

Never delete working features.

Never rewrite stable logic.

Never duplicate screens.

Never create parallel navigation.

Instead

Refactor

Reuse

Extract

Replace

Improve

\---

\# Implementation Order

The implementation MUST follow this sequence.

Phase 1

Design System

↓

Phase 2

Shared Components

↓

Phase 3

Layout Components

↓

Phase 4

Navigation

↓

Phase 5

Existing Screens

↓

Phase 6

Motion

↓

Phase 7

Testing

Do not skip phases.

\---

\# Phase 1

Theme

Tasks

Create Theme Provider

Create Design Tokens

Create Motion Tokens

Create Typography

Create Color System

Create Glass System

Create Shadow System

Create Radius System

Create Spacing System

Do NOT modify screens yet.

\---

\# Phase 2

Reusable Components

Implement

Button

Card

Input

Avatar

Badge

Chip

Timeline

FAB

Bottom Sheet

Toast

Skeleton

Loader

Recommendation Card

Hero Card

Glass Card

Order Card

Every component should be reusable.

\---

\# Phase 3

Layout

Create

Screen

Container

Section

Stack

Row

Column

Grid

Safe Area

Header

Footer

Bottom Navigation

Floating FAB

After this phase

no screen should manually implement layouts.

\---

\# Phase 4

Navigation

Keep existing routes.

Do NOT rename routes.

Do NOT change navigation architecture.

Replace only

Bottom Navigation

Headers

Transitions

Icons

Center FAB

Add

AI Care Hub

without affecting existing routing.

\---

\# Phase 5

Screen Refactoring Order

Implement exactly in this order.

1

Splash

2

Login

3

Home

4

Orders

5

Tracking

6

Profile

7

Support

8

Services

9

Items

10

Pickup

11

Address

12

Summary

13

Payment

14

Success

15

History

Reason

Highest impact screens first.

\---

\# Phase 6

Motion

Implement

Shared transitions

Hero animation

Bottom navigation

FAB

Cards

Loading

Timeline

Do NOT create screen-specific animations.

Everything uses Motion Tokens.

\---

\# Existing Screens

Modify only UI.

Do NOT touch

Hooks

Business logic

Network calls

State management

Validation

API contracts

Only replace

Layout

Components

Animations

Theme

Spacing

Typography

\---

\# New Screens

Create only

AI Care Hub

AI Processing

AI Results

Booking Draft

These integrate with existing flow.

\---

\# AI Integration

Existing flow

Home

↓

Services

↓

Items

↓

Pickup

↓

Payment

AI flow

Home

↓

AI Care

↓

AI Results

↓

Booking Draft

↓

Pickup

↓

Payment

Both flows merge.

\---

\# File Migration Strategy

Never modify many files simultaneously.

Instead

Create reusable components first.

Then migrate one screen at a time.

Commit after each completed screen.

\---

\# Screen Refactor Workflow

For every screen

Step 1

Extract UI

↓

Step 2

Replace components

↓

Step 3

Apply theme

↓

Step 4

Apply motion

↓

Step 5

Test

↓

Commit

Never refactor multiple screens together.

\---

\# Component Migration

Old Button

↓

PrimaryButton

Old Card

↓

GlassCard

Old Input

↓

InputField

Old Loader

↓

Skeleton

Old Modal

↓

Bottom Sheet

Reuse everywhere.

\---

\# Theme Migration

Replace every

Hardcoded Color

↓

Theme Token

Hardcoded Radius

↓

Radius Token

Hardcoded Padding

↓

Spacing Token

Hardcoded Font

↓

Typography Token

No exceptions.

\---

\# Safe Refactoring Rules

Allowed

Move files

Rename UI components

Extract shared components

Improve layout

Improve animations

Improve spacing

Improve typography

Not Allowed

Rewrite authentication

Rewrite API

Rewrite Redux/Context

Rewrite backend

Rewrite database

Rewrite payment

Rewrite tracking

Delete existing functionality

\---

\# Performance Rules

Avoid unnecessary renders.

Memoize expensive components.

Lazy-load heavy screens.

Optimize FlatLists.

Compress assets.

Avoid unnecessary blur layers.

Maintain smooth 60 FPS.

\---

\# Accessibility Rules

Every component must support

Screen readers

Dark mode

Dynamic fonts

Keyboard (Admin)

Touch targets

Reduced motion

Visible focus

\---

\# Testing After Every Screen

Visual regression

Navigation

Dark mode

Light mode

Tablet

Accessibility

Performance

No broken routes

No crashes

\---

\# Git Workflow

After each completed screen

Create commit

Example

feat(ui): redesign home screen

feat(ui): redesign tracking

feat(ui): redesign orders

Small commits only.

\---

\# Rollback Strategy

If a screen introduces regressions

Restore previous commit.

Never continue with broken screens.

Each screen must remain deployable.

\---

\# Code Quality

No inline styles.

No duplicated components.

No duplicated animations.

No duplicated colors.

No duplicated spacing.

Everything imports from Theme.

Everything uses shared UI.

\---

\# Success Criteria

The UI Foundation implementation is complete when

✓ Every existing screen has been visually upgraded.

✓ Business logic remains untouched.

✓ Theme is centralized.

✓ Motion is centralized.

✓ Components are reusable.

✓ Navigation remains stable.

✓ Existing features continue working.

✓ The application feels like a premium AI-first product.

\---

\# Codex Execution Rules

Read before coding:

README.md

DESIGN\_TOKENS.md

COMPONENT\_LIBRARY.md

USER\_FLOW.md

SCREEN\_SPECIFICATIONS.md

MOTION\_SYSTEM.md

Follow all documents strictly.

Do not invent new components.

Do not invent new navigation.

Do not modify business logic.

If implementation conflicts with documentation,

documentation takes priority.

\---

End of IMPLEMENTATION.md  
