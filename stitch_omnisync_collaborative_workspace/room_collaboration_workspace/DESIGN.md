---
name: Kinetic Sync
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1c1b1d'
  surface-container: '#201f22'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#313032'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#ffb783'
  on-tertiary: '#4f2500'
  tertiary-container: '#d97721'
  on-tertiary-container: '#452000'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
  success-emerald: '#10b981'
  warning-amber: '#f59e0b'
  error-rose: '#f43f5e'
  slate-surface: '#18181b'
  slate-border: '#27272a'
  indigo-soft: rgba(99, 102, 241, 0.1)
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.04em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  mono:
    fontFamily: Geist Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  sidebar-l1: 64px
  sidebar-l2: 260px
  topbar-height: 56px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 24px
---

## Brand & Style

The brand personality is **Professional, Technical, and Fluid**. It is designed for high-performance teams who require zero-friction collaboration. The aesthetic takes inspiration from the "Linear" and "Vercel" schools of design: high-fidelity, content-focused, and precision-engineered.

The design style is **Minimalist with Subtle Glassmorphism**. It utilizes a sophisticated layering system where the UI feels like a series of translucent panes hovering over a workspace. The interface remains unobtrusive, prioritizing the "Live" content while providing immediate access to powerful tools through keyboard-first interactions and non-blocking overlays. Key visual signatures include hairline borders, multi-layered ambient shadows, and high-density information layouts.

## Colors

The design system operates primarily in a **Full Dark Mode**, utilizing deep zinc and slate grays to create a focused environment. 

- **Primary & Secondary**: The Indigo and Violet hues are used for "Action" states, active indicators, and brand-touchpoints. They should be used sparingly to maintain high signal-to-noise ratios.
- **Surface Strategy**: The background (`#09090b`) acts as the "Floor." Docked panels use `slate-surface`, while floating elements utilize semi-transparent versions of these grays with background blurs to create depth.
- **Semantic Colors**: Emerald, Amber, and Rose are reserved strictly for functional feedback (Online status, warnings, and error states).
- **Presence Colors**: For RTC cursors, a programmatic palette of high-vibrancy colors (Cyan, Orange, Pink, Lime) should be assigned to unique participants to ensure visibility on the canvas.

## Typography

The typography system is built for data-rich environments where legibility at small scales is paramount. 

- **Geist** is used for display, headings, and UI labels to provide a technical, sharp appearance. 
- **Inter** handles the heavy lifting for body text and chat logs, ensuring maximum readability during long sessions.
- **Tight Tracking**: Larger display styles use negative letter spacing to create a cohesive, "locked-in" look characteristic of premium SaaS tools.
- **Mono**: A monospace variant of Geist should be used for metadata, coordinates on the canvas, and webhook/integration panels.

## Layout & Spacing

The layout is a **Multi-Tiered Sidebar Grid** system designed for complex navigation.

- **L1 Sidebar (Primary)**: A fixed 64px vertical rail for high-level workspace switching.
- **L2 Sidebar (Secondary)**: A 260px collapsible panel for contextual navigation (Participant lists, folder structures, or layer trees).
- **Collaboration Canvas**: The central workspace is fluid and expands to fill all remaining space.
- **Non-Blocking UI**: Floating panels (like Chat or RTC controls) should respect a 16px "safe zone" from the edges of the canvas.
- **Responsive Reflow**: On mobile, the L2 sidebar transitions into a full-screen drawer, and the L1 rail moves to a bottom navigation bar. RTC controls are enlarged for touch-target optimization.

## Elevation & Depth

Visual hierarchy is established through a combination of **Tonal Layering** and **Ambient Shadows**.

- **Level 0 (Base)**: Darkest surface (`#09090b`). No shadow.
- **Level 1 (Docked Panels)**: `slate-surface`. 1px solid `slate-border`.
- **Level 2 (Pop-overs/Cards)**: Subtle shadow: `0 4px 12px rgba(0,0,0,0.4)`. High-contrast border.
- **Level 3 (Modals/Command Palette)**: Multi-layered shadow: `0 0 1px rgba(0,0,0,0.4), 0 12px 24px rgba(0,0,0,0.5), 0 20px 40px rgba(0,0,0,0.4)`. These elements should use a background-blur (12px) to maintain a sense of the context beneath them.
- **Active State (Focus)**: Elements currently being edited by other users on the canvas should feature a 2px "Glow" border in that user's assigned presence color.

## Shapes

The shape language is modern and approachable without being overly playful.

- **Small Components**: Buttons, inputs, and chips use a **12px** radius.
- **Cards & Docked Panels**: Content containers use a **16px** radius.
- **Large Containers**: Modals and primary canvas views use a **20px** radius.
- **Avatars**: Always circular (pill-shaped) to distinguish human actors from square/rounded UI artifacts.

## Components

- **Buttons**: Primary buttons use a gradient from Indigo to Violet. Ghost buttons use a subtle `slate-border` and white text.
- **Chat Bubbles**: Use a "Message Group" pattern. Only the final message in a sequence shows the timestamp. Threads are indicated by a 2px vertical line in `slate-border` color to the left of the replies.
- **RTC Controls**: A floating pill-shaped bar at the bottom center of the canvas. Active states (Mic on, Camera on) use the primary gradient; inactive/muted states use a semi-transparent slate.
- **Participant Avatars**: Include a 3px "Presence Pip" at the bottom right. Green for active, Amber for idle. If the user is "Following" someone, the avatar should have a glowing ring.
- **Collaboration Canvas**: Cursors consist of a colored arrow and a small label with the user's name. When a user clicks, a "pulse" animation in their presence color radiates from the cursor point.
- **Input Fields**: Focus state uses a 1px Indigo border and a soft Indigo outer glow. Placeholder text is in a muted gray to reduce visual noise.