# Design System Specification

## 1. Creative North Star: The Monolithic Garden
This design system is built on the philosophy of **"The Monolithic Garden."** It treats the digital interface not as a series of flat screens, but as a deep, architectural space where knowledge is cultivated. Inspired by the focused productivity of Obsidian, we move away from "standard" web aesthetics by embracing high-contrast typography against ink-dark voids, using intentional tonal shifts rather than lines to define space. The goal is a high-end, editorial feel that prioritizes the user’s cognitive flow over UI ornamentation.

## 2. Color & Tonal Architecture
The palette is rooted in deep charcoal and Obsidian’s signature violet. We follow a strict hierarchical layering system to create depth without visual clutter.

### The "No-Line" Rule
Standard 1px solid borders are strictly prohibited for sectioning. Structural boundaries must be defined solely through background color shifts. For example, a side navigation panel should use `surface-container-low` (#1C1B1B) sitting against a `surface` (#131313) main content area. This creates a "molded" look rather than a "boxed" look.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Each deeper level of interaction should shift in tone:
- **Base Layer:** `surface` (#131313) – The infinite canvas.
- **Sectioning:** `surface-container-low` (#1C1B1B) – Sidebars and inactive panels.
- **Active Workspace:** `surface-container` (#201F1F) – The primary editor or chat focus.
- **Elevated Elements:** `surface-container-high` (#2A2A2A) – Tooltips, menus, and floating cards.

### The Glass & Gradient Rule
To move beyond a flat "template" feel, main action areas (like the Socratic Q&A input) should utilize **Glassmorphism**. Use `surface-variant` (#353534) at 60% opacity with a `backdrop-filter: blur(12px)`. 

For Primary CTAs, apply a subtle linear gradient:
- **Start:** `primary` (#D0BCFF)
- **End:** `primary-container` (#733EE4)
- **Angle:** 135deg
This provides a "visual soul" and a sense of premium polish that flat colors cannot achieve.

## 3. Typography: Editorial Precision
The typography uses a high-contrast scale to establish an immediate sense of authority and order.

*   **Display & Headlines (Inter):** These are the "landmarks." Use `display-md` (2.75rem) for main workspace titles with a letter-spacing of `-0.02em` to feel tighter and more bespoke.
*   **Body (Inter):** Use `body-lg` (1rem) for note content to ensure maximum readability. The line-height should be generous (1.6) to mimic a physical manuscript.
*   **Labels (Space Grotesk):** All metadata, tags, and small utility text must use `label-md` in Space Grotesk. This "technical" typeface contrasts with the clean Inter body text, signaling to the user that this information is functional/system-level.

## 4. Elevation & Depth: Tonal Layering
We do not use shadows to mimic light; we use tonal shifts to mimic material.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section to create a soft, natural "recessed" effect.
*   **Ambient Shadows:** If a floating element (like a modal) requires a shadow, it must be nearly invisible. 
    *   *Shadow:* `0 20px 40px rgba(0, 0, 0, 0.4)`
    *   *Tint:* Use a 4% opacity of `on-surface` (#E5E2E1) as a glow filter to make the object feel like it belongs to the environment.
*   **The Ghost Border:** If a border is required for accessibility (e.g., in high-contrast needs), use `outline-variant` (#494455) at **15% opacity**. Never use 100% opaque borders.

## 5. Components

### Buttons
- **Primary:** Gradient fill (Primary to Primary-Container), `md` (0.375rem) roundedness. No border. Text color: `on-primary-fixed` (#23005C).
- **Secondary:** Surface-only. Use `surface-container-highest` (#353534) background with a "Ghost Border."
- **Tertiary:** Text-only in `primary` (#D0BCFF) with no background, used for low-emphasis navigation.

### Input Fields (Socratic Q&A)
- **Field Style:** Use `surface-container-lowest` (#0E0E0E) to create a "sunken" feel, suggesting a deep well for thoughts.
- **Active State:** Instead of a thick border, use a subtle outer glow of `primary` (#D0BCFF) at 20% opacity and change the label color to `primary`.

### Cards & Lists
- **Forbid Dividers:** Do not use lines to separate notes in a list. Use `spacing-4` (1rem) of vertical white space and a subtle background hover state using `surface-container-high`.
- **Note Items:** Headline in `title-md`, preview text in `body-sm` (color: `on-surface-variant`).

### Knowledge Chips
- **Selection Chips:** Use `secondary-container` (#5417BE) with `label-sm` text. Use `full` (9999px) roundedness to contrast against the mostly rectangular UI.

## 6. Do’s and Don’ts

### Do
*   **Use Asymmetry:** In the note-list, vary the metadata shown to create a rhythmic, editorial feel rather than a rigid table.
*   **Embrace the Dark:** Allow large areas of `surface` (#131313) to remain empty. This "digital breathing room" is essential for a focused garden.
*   **Intentional Type Scaling:** Drop the body text size to `body-sm` for secondary sidebars to visually recede those panels.

### Don’t
*   **No Pure White:** Never use #FFFFFF for body text; use `on-surface` (#E5E2E1) to reduce eye strain in the dark environment.
*   **No Sharp Corners:** Avoid `none` (0px) roundedness. Even the most "brutalist" elements should have at least `sm` (0.125rem) to feel premium and touched by hand.
*   **No Default Shadows:** Never use standard CSS drop shadows. If it isn't diffused and tinted, it doesn't belong.