# Phase C.1 — Catalog Expansion and Deterministic Garment Classification

## Implemented catalog additions

The supported billable catalog now includes `shorts`, `leggings`, `skirt`, `kurta`, `saree`, and `hoodie` alongside the existing catalog. Sweatshirts remain billed as the existing `sweater` item through a deterministic alias; no `sweatshirt` catalog ID exists.

The backend pricing calculator remains authoritative. AI output, Smart Scan review state, and route prefill contain no price and cannot override backend pricing.

## Deterministic classification boundary

Provider `detectedLabel` values are preserved for display. The mapper normalizes a separate candidate, performs an exact alias lookup, then repeatedly removes only approved leading descriptors before requiring another exact alias lookup. Approved descriptors are colors, `folded`, `formal`, `printed`, `patterned`, `short sleeve`, and `long sleeve`. Material terms are not removed.

This keeps compound or material-specific labels such as `shirt dress`, `saree blouse`, `silk saree`, `black suit`, `shoes`, and `handbag` unmapped. Plain and approved color-prefixed sarees map to `saree`.

## Catalog synchronization technical debt

The same catalog is currently represented in three application areas: backend authoritative pricing, backend AI aliases, and mobile selection/display pricing. They are synchronized in this phase, but they are not yet sourced from a shared package or generated artifact.

A future refactor may centralize those representations with validation across backend and mobile builds. That refactor is explicitly out of scope for Phase C.1; it must preserve backend price authority and existing booking/payment contracts.
