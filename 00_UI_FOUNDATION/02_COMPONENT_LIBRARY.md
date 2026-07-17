\# Fresh & Fold AI  
\# UI FOUNDATION

\# COMPONENT\_LIBRARY.md

Version 2.0

\---

\# Purpose

This document defines every reusable UI component used throughout the Fresh & Fold AI ecosystem.

The goal is to eliminate duplicated UI, enforce consistency, improve maintainability, and accelerate feature development.

Every screen must be assembled using these components.

No feature should create its own custom button, card, input, modal, or layout unless explicitly approved.

\---

\# Component Philosophy

Components should be:

Reusable

Composable

Accessible

Animated

Theme Aware

Responsive

AI Ready

Every component should solve one problem extremely well.

\---

\# Component Architecture

Shared

↓

Primitive Components

↓

Layout Components

↓

Business Components

↓

Feature Components

↓

Screens

Business logic must never exist inside primitive UI components.

\---

\# Folder Structure

Shared Components

components/

ui/

Button/

Card/

Input/

Badge/

Avatar/

Chip/

Divider/

Icon/

Loader/

EmptyState/

Progress/

Toast/

BottomSheet/

Modal/

Tooltip/

FloatingAction/

SearchBar/

Tabs/

Switch/

Dropdown/

List/

Timeline/

Section/

Animation/

AI/

shared/

Admin Components

components/admin/

MetricCard/

DashboardCard/

ChartCard/

Table/

Sidebar/

Topbar/

Analytics/

OrderStatus/

SupportChat/

Filters/

Search/

Dialogs/

\---

\# Primitive Components

These are the building blocks.

Button

Text

Icon

Image

Divider

Spacer

Badge

Chip

Avatar

Progress

Loader

Skeleton

Tooltip

Modal

Bottom Sheet

Toast

Input

Textarea

Dropdown

Checkbox

Radio

Switch

Every higher-level component must be composed from these primitives.

\---

\# Layout Components

Container

Screen

Section

CardGrid

Stack

Row

Column

Grid

Scrollable

SafeArea

Header

Footer

BottomNavigation

TopNavigation

FloatingDock

Layout components handle positioning only.

\---

\# Button System

Button Variants

Primary

Secondary

Ghost

Outline

Glass

AI

Success

Danger

Premium

FAB

Button Sizes

XS

SM

MD

LG

XL

States

Default

Hover

Pressed

Focused

Loading

Disabled

Success

Error

Buttons should support:

Icons

Loading Spinner

Gradient

Glass Style

Ripple

Haptic Feedback

Accessibility

\---

\# Card System

Card Types

Surface Card

Glass Card

Hero Card

Metric Card

AI Card

Recommendation Card

Order Card

Booking Card

Analytics Card

Expandable Card

Cards should support:

Header

Body

Footer

Actions

Status

Animation

Loading

\---

\# AI Components

AI Badge

AI Status Chip

AI Processing Card

AI Confidence Meter

Recommendation Card

Analysis Result

Smart Scan Card

AI Insight Card

Reasoning Card

Booking Suggestion Card

These components are exclusive to AI experiences.

\---

\# Input System

Text Input

Search Input

OTP Input

Phone Input

Date Picker

Time Picker

Location Picker

Address Input

Voice Input

AI Prompt Input

Camera Upload Input

Gallery Upload Input

All inputs share one behavior system.

\---

\# Navigation Components

Bottom Navigation

Floating Center Action

Navigation Drawer

Sidebar

Top Bar

Breadcrumb

Tabs

Segment Control

Back Button

Floating Action Button

\---

\# Feedback Components

Toast

Snackbar

Banner

Alert

Dialog

Confirmation Sheet

Error State

Success State

Loading State

Skeleton

Progress Indicator

\---

\# Empty States

No Orders

No Notifications

No Internet

No Search Results

No Bookings

No Recommendations

No AI Results

No History

Each empty state includes:

Illustration

Headline

Description

Primary CTA

Secondary CTA

\---

\# Loading System

General Loading

AI Processing

Image Upload

Payment

Booking

Tracking

Search

Analytics

Loading should never use a plain spinner.

Instead use:

Skeleton

Progress Steps

AI Status Updates

Animated Placeholders

\---

\# Smart Scan Components

Camera Preview

Capture Button

Upload Button

Image Preview

Garment List

Fabric List

Stain List

Care Label Viewer

Confidence Indicator

Recommendation Summary

Booking Draft Card

Analysis Timeline

These components will be reused throughout the AI workflow.

\---

\# Order Components

Order Card

Status Timeline

Progress Tracker

Pickup Card

Delivery Card

Payment Summary

Invoice Card

Service Badge

Timeline Event

Live Status Indicator

\---

\# Recommendation Components

Recommendation Card

Reason Badge

Estimated Savings

Environmental Impact

Premium Upgrade Card

Related Suggestions

Explanation Section

Recommendations should always explain why they exist.

\---

\# Sustainability Components

Water Saved

CO₂ Saved

Time Saved

Eco Score

Impact Card

Monthly Summary

Achievement Badge

\---

\# Dashboard Components

Metric Card

Revenue Card

Chart Card

Heatmap

Orders Table

Support Queue

Recent Activity

Alert Panel

Statistics Grid

Filter Panel

KPI Widget

Every dashboard screen must be built using these.

\---

\# Animation Components

Fade In

Slide Up

Scale In

Hero Transition

Shared Element

Card Expand

Progress Reveal

Counter Animation

Floating Dock

AI Pulse

Confidence Animation

Timeline Animation

Reusable across mobile and admin.

\---

\# Accessibility Requirements

Every component supports:

Screen Readers

Keyboard Navigation

Focus State

Reduced Motion

Touch Targets

Contrast

Dynamic Font Scaling

\---

\# Component Rules

No duplicated buttons.

No duplicated cards.

No duplicated inputs.

No duplicated loaders.

No duplicated navigation.

Every feature imports existing components.

Never recreate an existing component.

\---

\# Naming Convention

Components use PascalCase.

Examples

PrimaryButton

GlassCard

HeroCard

SmartScanCard

RecommendationCard

TimelineProgress

AIConfidenceBadge

Avoid vague names.

Bad

Card2

ButtonNew

AwesomeCard

\---

\# Theme Requirements

Every component must automatically support:

Light Theme

Dark Theme

Accessibility Theme

No component manually changes colors.

Everything comes from Design Tokens.

\---

\# Motion Requirements

Components must never define custom animations.

Every animation comes from Motion Tokens.

Shared transitions should be preferred over isolated effects.

\---

\# Definition of Done

The Component Library is complete when:

✓ Every screen can be built using existing components.

✓ No duplicate UI exists.

✓ Components are documented.

✓ Components support theming.

✓ Components support accessibility.

✓ Components support animation.

✓ Components support responsive layouts.

✓ Components are reusable across mobile and admin.

The component library should become the foundation of every future feature and significantly reduce implementation time while ensuring a consistent premium user experience.

\---

\# Related Documents

README.md

DESIGN\_TOKENS.md

IMPLEMENTATION.md

TESTS.md

TODO.md

\---

End of COMPONENT\_LIBRARY.md  
