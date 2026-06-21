# DESIGN.md — Workshop Bench

A custom design system for a career strategy planner, built around an industrial workshop / toolmaker's bench metaphor. Skills are tools on a pegboard, finished projects are labeled drawers, and the interface should feel tactile, hands-on, and competence-first rather than soft or aspirational.

This is an original concept, not extracted from an existing live site. Hand this file to your coding agent (Claude Code, Cursor, v0, Lovable, etc.) as a style reference.

## Concept

The product helps someone track what they've built and decide what to do next. The workshop frame makes that literal: your skills are tools you own, your past projects are labeled and stored, and choosing your next move is "opening the bench" rather than browsing a dashboard. Avoid soft SaaS tropes — no gradients, no rounded pill badges, no friendly mascot energy. This should feel like a well-organized shop, not an app.

## Color palette

| Token | Hex | Use |
|---|---|---|
| `bg-base` | `#E8E4DA` | Page background — unbleached canvas/linen tone |
| `bg-panel` | `#D8D2BE` | Header bars, nav strips, secondary surfaces |
| `bg-card` | `#E8E4DA` | Same as base; cards sit flush, separated by rules not shadows |
| `ink` | `#2C2A24` | Primary text, stamped headlines, borders |
| `ink-muted` | `#5C5848` | Body copy, secondary text |
| `line` | `#C9C2AC` | Hairline rule color, grid dividers |
| `accent-rust` | `#B5512E` | Primary CTA, active-state badge, single accent color |
| `accent-rust-bg` | `#FBE9DF` | Text-on-rust (for badges/buttons using rust fill) |

Rule: one accent only (rust). Everything else is tone-on-tone canvas, ink, and muted line work. Do not add a second accent color — the restraint is the point.

## Typography

- **Display / headline**: Oswald, weight 500–600, uppercase, tight letter-spacing (0.02–0.06em depending on size). Used for h1, section labels, nav, buttons — anything that reads like a stamped or stenciled label.
- **Body**: Archivo, weight 400–500, sentence case, normal tracking. Used for paragraph copy, descriptions, form labels.
- **Scale**: h1 32px/600, h2 22px/500, body 15–16px/400, eyebrow/label 11px/500 uppercase with 0.06–0.08em tracking.

Pairing logic: Oswald's condensed industrial weight reads like type stamped into metal or stenciled onto a crate; Archivo stays neutral and legible underneath it so body copy doesn't compete.

## Layout

- Flat surfaces, no shadows, no border-radius above 3px (this is a shop, not an app — sharp corners read as cut material, not soft UI).
- Structure communicated with 0.5–2px hairline rules (`line` token) rather than card elevation. A 2px `ink` rule marks a major section boundary (e.g. under the header, above a footer strip); 1px `line` rules separate minor grid cells.
- Header/nav bar: `bg-panel`, bottom border 2px solid `ink`, all-caps Oswald labels, small status badge in rust on the right (e.g. "open").
- Hero: eyebrow label in a small filled `ink` tag (not a pill — sharp corners), large Oswald headline (max ~10 words, uppercase), one line of Archivo supporting copy, one rust CTA button with sharp 3px corners.
- Below the hero, use a flush grid strip (no gaps beyond 1px `line` dividers) of icon tiles or stat cells — this is the "pegboard" or "drawer row" signature moment. 4–6 cells, each holding one Tabler outline icon or one stat, centered, on `bg-card`.

ASCII layout reference:
```
┌─────────────────────────────────────────────┐
│ WORKBENCH      TOOLS  DRAWERS  JOBS    [open]│  ← panel header, 2px bottom rule
├─────────────────────────────────────────────┤
│ [SKILLS INVENTORY]                           │  ← ink tag, eyebrow
│ EVERY SKILL, HUNG WHERE YOU CAN FIND IT      │  ← Oswald h1, uppercase
│ Label what you've built, jar what you've...  │  ← Archivo body
│ [ OPEN THE BENCH → ]                         │  ← rust button, 3px corners
├───────┬───────┬───────┬───────┬─────────────┤
│  🔧   │  ✏️   │  📚   │  🔨   │  📦         │  ← pegboard icon strip
└───────┴───────┴───────┴───────┴─────────────┘
```

## Components

**Button (primary)**: `accent-rust` background, `accent-rust-bg` text, no border, 3px corners, Oswald uppercase 13px, padding 11px 22px, letter-spacing 0.03em. Arrow glyph (`→`) suffix on navigational actions.

**Button (secondary)**: transparent background, 1.5–2px solid `ink` border, `ink` text, same Oswald uppercase treatment, sharp corners.

**Status badge**: rust fill, `accent-rust-bg` text, 2–3px corners, 10px Oswald uppercase, small padding (2px 8px). Use sparingly — one per view, for live/active state only.

**Eyebrow tag**: solid `ink` fill, `bg-base` text, 11px Oswald uppercase, sharp corners, inline-block — reads like a label stamped onto material.

**Icon tiles / pegboard strip**: equal-width grid cells, `bg-card` fill, 1px `line` dividers between cells, 2px `ink` top rule separating the strip from content above. Single Tabler outline icon centered per cell, `ink-muted` color, 20px size. No labels inside the tiles — let the icon stand alone, like a tool silhouette on a pegboard.

**Drawer / record card**: used for individual project or skill entries. Flush rectangle, `bg-card`, 1px `line` border, small Oswald uppercase label top-left (acts like a drawer label), Archivo detail text below. No shadow, no radius beyond 2px.

## Motion

Minimal. If used at all: a single deliberate hover state on pegboard icon tiles (icon shifts color from `ink-muted` to `ink`, no scale/transform), and a button active-state of `scale(0.98)`. No page-load animation sequences — the workshop metaphor implies stillness and order, not motion.

## Voice

Plain, direct, slightly terse — like instructions stenciled on a crate. Active voice, no filler. "Open the bench," not "Get started." Errors and empty states should read like a shop foreman's note: state what's missing and what to do about it, no apology.
