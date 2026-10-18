---
name: Cybernetic Precision
colors:
  surface: '#13131a'
  surface-dim: '#13131a'
  surface-bright: '#393840'
  surface-container-lowest: '#0e0e14'
  surface-container-low: '#1b1b22'
  surface-container: '#1f1f26'
  surface-container-high: '#2a2931'
  surface-container-highest: '#34343c'
  on-surface: '#e4e1eb'
  on-surface-variant: '#bbc9ce'
  inverse-surface: '#e4e1eb'
  inverse-on-surface: '#303037'
  outline: '#859398'
  outline-variant: '#3c494d'
  surface-tint: '#00d9ff'
  primary: '#afecff'
  on-primary: '#003641'
  primary-container: '#00d9ff'
  on-primary-container: '#005b6c'
  inverse-primary: '#00687b'
  secondary: '#c5c5d8'
  on-secondary: '#2e2f3e'
  secondary-container: '#474858'
  on-secondary-container: '#b7b7ca'
  tertiary: '#ffdeaa'
  on-tertiary: '#422d00'
  tertiary-container: '#ffbb2a'
  on-tertiary-container: '#6e4d00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#aeecff'
  primary-fixed-dim: '#00d9ff'
  on-primary-fixed: '#001f26'
  on-primary-fixed-variant: '#004e5d'
  secondary-fixed: '#e2e1f5'
  secondary-fixed-dim: '#c5c5d8'
  on-secondary-fixed: '#191a28'
  on-secondary-fixed-variant: '#454655'
  tertiary-fixed: '#ffdea9'
  tertiary-fixed-dim: '#febb29'
  on-tertiary-fixed: '#271900'
  on-tertiary-fixed-variant: '#5e4100'
  background: '#13131a'
  on-background: '#e4e1eb'
  surface-variant: '#34343c'
typography:
  display-hero:
    fontFamily: Space Grotesk
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  meta-label:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
  space-2xl: 4rem
---

## Brand & Style

This design system is tailored for an elite software engineer's public portfolio and integrated administrative console. It balances high-performance developer culture with high-end executive refinement. 

### Visual Tone & Aesthetic
The design language adopts a technical dark aesthetic influenced by modern telemetry dashboards and high-tier engineering tools. It avoids messy cyberpunk clutter in favor of crisp structural discipline:
- **Tone:** Authoritative, razor-sharp, futuristic, and uncluttered.
- **Audience:** Engineering executives, enterprise clients, fellow systems architects, and hiring panels seeking top-tier engineering talent.
- **Style Synthesis:** Deep slate-void darkness punctuated by calibrated cyan luminescence, razor-thin technical borders, micro-monospaced telemetry labels, and precise geometric topography.

## Colors

The palette is engineered specifically for deep-void contrast and visual hierarchy without causing eye fatigue over prolonged sessions.

### Surface Tiers
- **Canvas Base (`#111118`):** The foundational backdrop across all viewports.
- **Surface Level 1 (`#161622`):** Primary structural regions, sidebars, panel wells, and section canvases.
- **Surface Level 2 (`#181824`):** Cards, modular containers, grouped blocks, and elevated content panels.
- **Surface Level 3 (`#1F1F30`):** Overlays, dropdown menus, hover states, and active interactive containers.

### Borders & Delimiters
- **Subtle Technical Border (`#2A2A3C`):** Strict 1px division across all card edges, row splitters, and container frames.
- **Accent Border (`rgba(0, 217, 255, 0.4)`): Used exclusively for focused, active, or highlighted states.

### Typography & Content
- **Text Primary (`#F0F0F0`):** Headers, titles, primary readouts, and user inputs. Yields >14:1 contrast against `#111118`.
- **Text Secondary (`#8E8EA0`):** Body paragraphs, contextual commentary, and active secondary labels.
- **Text Muted (`#5C5C70`):** Inactive indicators, micro-metadata, table headers, and syntax framing characters.

### Interactive Accent
- **Electric Cyan (`#00D9FF`):** Strictly reserved for focal anchors—primary actions, selected navigation items, interactive links, glowing statuses, and commit highlights.
- **Cyan Glow Fill (`rgba(0, 217, 255, 0.12)`): Translucent backing for badges, active states, and pill indicators.

## Typography

The typographic hierarchy enforces clear functional boundaries across three specialized type families:

1. **Space Grotesk (Display & Headings):** High-tech, structural geometry that communicates cutting-edge engineering capability and modern vision.
2. **Inter (Body & Narrative):** Neutral, hyper-legible humanist sans-serif designed for frictionless reading across long-form case studies, architecture briefs, and admin logs.
3. **JetBrains Mono (Metadata, Code, & Indicators):** Monospaced precision for technical proof points—such as git hashes, server metrics, architecture tags, timestamps, and metric readouts. All uppercase meta-labels must apply `meta-label` tracking (`0.08em`).

## Layout & Spacing

The architecture operates on an 8px base rhythm, framed by an asymmetric structural grid designed to display telemetry, repository states, and deep case studies seamlessly.

### Grid & Breakpoints
- **Desktop (>= 1280px):** 12-column layout with 24px (`1.5rem`) gutters and variable margins constrained to a maximum content width of `1360px`. In the admin system, a persistent 280px sidebar anchors the left boundary while the workspace fluidly occupies remaining space.
- **Tablet (768px - 1279px):** 8-column layout with 24px (`1.5rem`) gutters and 32px (`2rem`) margins. Navigation shifts to a slim icon rail or docked header.
- **Mobile (< 768px):** 4-column layout with 16px (`1rem`) gutters and 20px (`1.25rem`) outer canvas margins. Multi-column cards stack vertically into singular blocks.

### Rhythmic Density
- Spacing inside interactive components stays compact (`space-xs` to `space-md`) to echo CLI and IDE density.
- Section-to-section transitions breathe with expansive breathing room (`space-xl` and `space-2xl`), delivering a refined portfolio presentation.

## Elevation & Depth

This design system avoids generic gray drop-shadows, using instead layered dark surfaces, crisp 1px borders, and targeted cyan optical glows.

### Elevation Hierarchy
- **Level 0 (Canvas Base):** Pure background `#111118`.
- **Level 1 (Structural Inset):** Surface `#161622` bounded by `1px solid #2A2A3C`.
- **Level 2 (Cards & Modules):** Surface `#181824` bounded by `1px solid #2A2A3C`. Shadow: `0 4px 20px -2px rgba(0, 0, 0, 0.45)`.
- **Level 3 (Popovers, Modals & Floating Toolbars):** Surface `#1F1F30` bounded by `1px solid #2A2A3C`. Shadow: `0 12px 36px -4px rgba(0, 0, 0, 0.7)`.

### The Cyan Glow Signature
Used exclusively for active, focused, or high-value signals:
- **Primary Interactive Elements (Buttons, Toggle Nodes):** `box-shadow: 0 0 20px rgba(0, 217, 255, 0.25)`.
- **Hovered Project Panels:** Transition the container's border from `#2A2A3C` to `rgba(0, 217, 255, 0.45)` with an ambient cast of `0 0 24px rgba(0, 217, 255, 0.08)`.

## Shapes

The interface balances precision with modern hardware refinement. Roundedness level `2` sets a 12px to 16px radius standard for container systems, preventing the interface from feeling brutally sharp while remaining architecturally structured.

### Radii Mapping
- **Input Fields, Badges & Micro-controls:** `8px` (`rounded-sm` / partial base) to retain sharp technical utility.
- **Cards, Code Panels & Action Modals:** `12px` to `16px` (`rounded-lg`), softening content modules against the dark base.
- **Status Pills, Avatar Containers & Tag Pills:** Full pill format (`9999px`) where circular containment conveys dynamic state or telemetry.

## Components

### Buttons
- **Primary:** Background `#00D9FF`, text `#111118` (high-contrast black), font weight 600 (Space Grotesk or Inter). Radius 10px. Resting shadow: `0 0 20px rgba(0, 217, 255, 0.25)`. On hover, elevation expands to `0 0 28px rgba(0, 217, 255, 0.45)`.
- **Secondary / Ghost:** Background `transparent`, border `1px solid #2A2A3C`, text `#F0F0F0`. On hover: surface shifts to `#1F1F30`, border shifts to `rgba(0, 217, 255, 0.4)`, text becomes `#00D9FF`.
- **Destructive (Admin):** Background `rgba(255, 68, 68, 0.1)`, border `1px solid rgba(255, 68, 68, 0.3)`, text `#FF6B6B`.

### Chips & Badges
- **Technical Tags:** Monospaced (`JetBrains Mono`, 12px), background `#161622`, border `1px solid #2A2A3C`, text `#8E8EA0`. Radius 6px.
- **Status / Live Badges:** Pill shape (`9999px`), background `rgba(0, 217, 255, 0.1)`, border `1px solid rgba(0, 217, 255, 0.3)`. Text is `#00D9FF` with an integrated 6px circular indicator exhibiting an optical pulse glow.

### Cards & Case Study Containers
- Constructed on `#181824` with a mandatory `1px solid #2A2A3C` perimeter and 16px radius.
- Inner padding: 24px (`space-lg`).
- Transitions must be smooth (`200ms cubic-bezier(0.16, 1, 0.3, 1)`): on hover, the border illuminates to `rgba(0, 217, 255, 0.35)` with an ambient `0 0 24px rgba(0, 217, 255, 0.08)` aura.

### Input Fields & Search Bars
- Background `#161622`, border `1px solid #2A2A3C`, text `#F0F0F0`, placeholder `#5C5C70`. Radius 10px.
- Height: 44px for standard inputs.
- Focus state: Border transitions to `#00D9FF`, with an accompanying glow: `0 0 0 1px #00D9FF, 0 0 16px rgba(0, 217, 255, 0.2)`. Outline is disabled.

### Checkboxes & Radio Controls
- Base box/circle: 18px size, background `#161622`, border `1px solid #2A2A3C`, radius 4px (checkbox) or `9999px` (radio).
- Checked State: Fill becomes `#00D9FF`, border becomes `#00D9FF`, with a deep slate glyph `#111118`. Glow: `0 0 10px rgba(0, 217, 255, 0.4)`.

### Lists & Data Rows (Admin & Timeline Views)
- Separated by `1px solid #2A2A3C` dividers. Alternating background striping is avoided in favor of clean interactive rows.
- Row hover: `#1F1F30` with the left edge displaying a 2px `#00D9FF` active indicator bar.

### Code Blocks & Architecture Windows
- Background `#111118`, framed inside a `#181824` structural container with a dedicated header toolbar containing file path labels (`JetBrains Mono`, `#8E8EA0`) and simulated terminal status lights.