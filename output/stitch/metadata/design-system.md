# Archival Muse

Source asset: `assets/6f4d58a7410f452582454574e8782263`
Project: `17599490654555022081`

## Summary
- Color mode: LIGHT
- Body font: MANROPE
- Display font: NOTO_SERIF
- Label font: MANROPE
- Primary color override: `#5D3A5D`
- Secondary color override: `#2D2926`
- Tertiary color override: `#C5A059`
- Neutral override: `#F9F7F2`
- Roundness: `ROUND_FOUR`
- Spacing scale: `3`

## Design MD

# Design System Specification: High-End Editorial

## 1. Overview & Creative North Star: "The Digital Archivist"
This design system moves beyond the transactional nature of e-commerce to create a space that feels like a curated, private library. The **Creative North Star** is "The Digital Archivist"—an aesthetic that treats every piece of fan merchandise not as a "product," but as a certified artifact.

To break the "template" look common in modern web apps, this system rejects rigid, boxed-in grids in favor of **intentional asymmetry** and **tonal layering**. We mimic the tactile experience of high-end print media through generous white space, "stacked paper" depth, and a typography-first hierarchy that prioritizes emotional resonance over raw density.

---

## 2. Colors: Tonal Ink & Paper
The palette is rooted in the "archival" experience: ink on heavy-stock paper.

### The Palette (Material Design Convention)
- **Background / Surface:** `#fbf9f4` (Ivory/Paper)
- **Primary (Accent):** `#442445` (Deep Plum) | Container: `#5d3a5d`
- **Secondary (Neutral):** `#635d5a` (Warm Charcoal)
- **Tertiary (Certified):** `#402d00` (Deep Gold) | Container: `#5d4200`
- **On-Surface (Text):** `#1b1c19` (Charcoal Ink)

### The "No-Line" Rule
Designers are prohibited from using 1px solid borders to section content. Visual boundaries must be defined solely through background color shifts. Use `surface-container-low` sections against a `surface` background to create zones. If a hard break is needed, use a change in vertical whitespace or a transition from `surface` to `surface-container-high`.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of paper. Use the `surface-container` tiers to create depth:
1. Base Layer: `surface` (`#fbf9f4`)
2. Sectioning: `surface-container-low` (`#f5f3ee`) for large background blocks.
3. Interactive Elements: `surface-container-lowest` (`#ffffff`) for cards and inputs to make them pop forward like fresh stationery.

### The "Glass & Gradient" Rule
For floating elements (modals, dropdowns), use glassmorphism. Apply `surface-container-lowest` at 80% opacity with a `backdrop-blur-md`. Main CTAs should utilize a subtle linear gradient from `primary` (`#442445`) to `primary_container` (`#5d3a5d`) at a 135-degree angle.

## 3. Typography: The Editorial Voice
- **Display & Headlines (Noto Serif):** Used for storytelling. `display-lg` (3.5rem) should be used with tight letter-spacing to feel like a book title.
- **Titles & Body (Manrope):** Clean sans-serif for utilitarian areas.
- Headlines should use `primary` (`#442445`).
- `label-sm` should be uppercase with `letter-spacing: 0.05em`.

## 4. Elevation & Depth: Tonal Layering
- Place a `surface-container-lowest` (`#ffffff`) card atop a `surface-container-low` (`#f5f3ee`) background.
- Ambient shadows should be 30px-50px blur at 4% opacity using the on-surface color.
- If a container requires definition for accessibility, use the `outline-variant` token at 15% opacity.
- Use `sm` or `md` roundedness tokens.

## 5. Components
### Buttons
- Primary: gradient of `primary` to `primary-container`, white text, no border.
- Secondary: `surface-container-high` background with `on-surface` text.
- Tertiary: text-only in `primary` with a 2px underline on hover.

### Input Fields
- Use `surface-container-lowest` background with a ghost border at 15% opacity `outline-variant`.
- Focus state uses `primary` at 50% opacity.

### Cards & Collections
- Do not use horizontal dividers.
- Use 48px or 64px vertical whitespace.
- Prefer asymmetrical padding.

### Archival Badges
- Certified badge uses `tertiary_container` (`#5d4200`) background and `on_tertiary_fixed` (`#261900`) text.

## 6. Do’s and Don’ts
### Do
- Use overlapping elements.
- Use ink colors for text instead of pure black.
- Prioritize whitespace.

### Don’t
- Don’t use standard 1px gray dividers.
- Don’t use vibrant or neon colors.
- Don’t use generic icons.
