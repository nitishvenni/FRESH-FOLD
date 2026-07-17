\# Fresh & Fold AI  
\# UI FOUNDATION

\# USER\_FLOW.md

Version 2.0

\---

\# Purpose

This document defines the complete user journey of Fresh & Fold AI.

The goal is NOT to redesign the existing application.

The goal is to enhance the existing experience while preserving all business logic.

Existing booking, payment, tracking and authentication flows remain unchanged.

AI is integrated as an additional intelligent entry point.

\---

\# Core Principle

Fresh & Fold supports TWO booking methods.

Manual Booking

and

AI Booking

Both eventually merge into the same backend workflow.

No duplicate order logic should exist.

\---

\# High-Level Product Flow

User Opens App

↓

Authentication

↓

Home

↓

Choose Booking Method

↓

Manual Booking  
OR  
AI Care

↓

Common Booking Flow

↓

Payment

↓

Tracking

↓

History

\---

\# Existing Flow (Preserved)

The existing flow already works correctly.

Do not redesign its logic.

Authentication

↓

Home

↓

Service Selection

↓

Item Selection

↓

Pickup Schedule

↓

Address

↓

Booking Summary

↓

Payment

↓

Booking Confirmation

↓

Live Tracking

↓

Order History

Only the UI is upgraded.

\---

\# New AI Flow

The AI flow is an alternative booking path.

It should feel magical but remain technically simple.

Home

↓

Tap AI Care FAB

↓

AI Action Sheet

↓

Choose Action

↓

Smart Scan  
OR  
Gallery Scan  
OR  
Describe Laundry  
OR  
Scan Care Label

↓

AI Processing

↓

AI Results

↓

Booking Draft

↓

Continue

↓

Pickup Schedule

↓

Address

↓

Booking Summary

↓

Payment

↓

Confirmation

↓

Tracking

Notice

AI skips

Service Selection

Item Selection

because AI prepares them automatically.

\---

\# Home Screen

Purpose

Welcome users.

Highlight AI.

Display current order.

Provide quick access.

Layout

Hero

↓

AI Care

↓

Current Order

↓

Quick Actions

↓

AI Recommendations

↓

Environmental Impact

↓

Bottom Navigation

\---

\# AI Care Hub

The center FAB opens

AI Care

instead of directly opening the camera.

Options

Smart Scan

Take Photo

Gallery Scan

Describe Laundry

Scan Care Label

Recent AI Scans

Future AI tools can be added without changing navigation.

\---

\# Smart Scan Flow

Tap Smart Scan

↓

Camera Opens

↓

Take Photo

↓

Image Preview

↓

Confirm

↓

AI Processing

↓

Results

↓

Booking Draft

↓

Continue

\---

\# Gallery Scan Flow

AI Care

↓

Choose Gallery

↓

Select Image

↓

AI Processing

↓

Results

↓

Booking Draft

↓

Continue

\---

\# Describe Laundry Flow

AI Care

↓

Text Input

↓

AI Understanding

↓

Booking Draft

↓

Review

↓

Continue

\---

\# Care Label Flow

AI Care

↓

Camera

↓

Scan Label

↓

Read Symbols

↓

Explain Instructions

↓

Suggest Service

↓

Continue

\---

\# AI Processing

This screen replaces generic loading.

Display progressive updates.

Examples

Identifying garments...

Reading care labels...

Checking stains...

Preparing recommendations...

Creating booking...

Never use an indefinite spinner.

\---

\# AI Results

Display

Detected Garments

↓

Detected Fabrics

↓

Detected Stains

↓

Care Instructions

↓

Recommended Services

↓

Estimated Price

↓

Confidence

↓

Booking Draft

Users may edit before continuing.

\---

\# Booking Draft

AI prepares

Items

Services

Estimated Price

Pickup Suggestion

Delivery Suggestion

Users remain in control.

Everything can be edited.

\---

\# Manual Booking

This flow remains identical.

Service

↓

Items

↓

Pickup

↓

Address

↓

Summary

↓

Payment

Only visuals change.

\---

\# Pickup

No workflow changes.

Users choose

Address

Date

Time

AI may recommend preferred slots.

Users choose the final option.

\---

\# Payment

No changes.

Supports

Coupons

Wallet

Cards

UPI

Cash (if available)

Only UI improvements.

\---

\# Confirmation

Display

Booking ID

Pickup Time

Driver ETA

AI Care Reminder

Next Steps

\---

\# Tracking

Tracking remains the same.

Visual redesign only.

Timeline

Booking

↓

Pickup

↓

Cleaning

↓

Ironing

↓

Quality Check

↓

Out For Delivery

↓

Delivered

Each completed stage animates.

\---

\# History

Users can

Search

Filter

Rebook

View Invoice

View Timeline

Visual improvements only.

\---

\# Support

Default

AI Assistant

↓

Human Escalation

if required.

The user should never need to choose between AI and Human initially.

The system decides.

\---

\# Notifications

Push users to important actions.

Examples

Pickup arriving

Laundry completed

Delivery today

Recommendation available

AI reminder

\---

\# Profile

Manage

Addresses

Payment

Preferences

Notifications

Settings

Laundry Preferences

Visual redesign only.

\---

\# Admin Flow

Dashboard

↓

Orders

↓

Analytics

↓

Support

↓

Customer Details

↓

Order Details

↓

AI Escalations

↓

Reports

Existing backend remains unchanged.

\---

\# AI Integration Points

AI enters only here

Home FAB

Support

Recommendations

Booking Draft

Care Label

Everything else remains deterministic.

\---

\# Protected Flow

Never change

Authentication

Order Creation Logic

Payment Logic

Tracking Logic

Notification Logic

Database Relationships

Only user experience changes.

\---

\# Future Flow Extensions

Wardrobe Management

Voice Booking

Subscription Plans

WhatsApp Booking

Driver Tracking

Laundry History AI

Predictive Pickup

These should plug into AI Care without changing navigation.

\---

\# Definition of Done

The flow is complete when

✓ Existing users can continue using the app exactly as before.

✓ New users naturally discover AI Care.

✓ AI reduces effort instead of adding complexity.

✓ Manual and AI booking merge into one backend workflow.

✓ No duplicated booking logic exists.

✓ Every AI feature begins from the AI Care Hub.

The application should feel like one cohesive experience rather than two separate systems.

\---

End of USER\_FLOW.md  
