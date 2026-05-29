---
name: Cozy Diorama
colors:
  surface: '#fff8f6'
  surface-dim: '#ffd0bb'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1eb'
  surface-container: '#ffeae1'
  surface-container-high: '#ffe2d6'
  surface-container-highest: '#ffdbcc'
  on-surface: '#351000'
  on-surface-variant: '#4f4633'
  inverse-surface: '#561f00'
  inverse-on-surface: '#ffede6'
  outline: '#817661'
  outline-variant: '#d3c5ac'
  surface-tint: '#795900'
  primary: '#795900'
  on-primary: '#ffffff'
  primary-container: '#fbbf24'
  on-primary-container: '#6c4f00'
  inverse-primary: '#f9bd22'
  secondary: '#006d36'
  on-secondary: '#ffffff'
  secondary-container: '#6dfe9c'
  on-secondary-container: '#007439'
  tertiary: '#b91a24'
  on-tertiary: '#ffffff'
  tertiary-container: '#ffb6b0'
  on-tertiary-container: '#aa091b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdf9f'
  primary-fixed-dim: '#f9bd22'
  on-primary-fixed: '#261a00'
  on-primary-fixed-variant: '#5c4300'
  secondary-fixed: '#6dfe9c'
  secondary-fixed-dim: '#4de082'
  on-secondary-fixed: '#00210c'
  on-secondary-fixed-variant: '#005227'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#fff8f6'
  on-background: '#351000'
  surface-variant: '#ffdbcc'
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style

This design system is built on the concept of a "digital terrarium"—a contained, warm, and hyper-tactile space that feels protected and inviting. It targets lifestyle, gardening, or community-focused applications that prioritize emotional connection over cold efficiency.

The visual style is a refined **Glassmorphism**, taking cues from the soft lighting of the reference image. It utilizes translucent layers to mimic the look of frosted greenhouse glass, allowing the vibrant, earthy background colors to bleed through. The atmosphere is defined by "Golden Hour" warmth: optimistic, gentle, and playful. Every interaction should feel soft and deliberate, like tending to a well-kept garden.

## Colors

The palette is pulled directly from the lush, sun-drenched garden diorama. 

- **Primary (Sunbeam):** A soft golden yellow used for primary actions and highlights, evoking the sunflowers and warm sky.
- **Secondary (Sprout):** A vibrant, lush green derived from the bushes and grass, used for growth-related indicators and success states.
- **Tertiary (Vine-Ripe):** A warm terracotta red, balanced between the tomatoes and the soil, used for urgency or delete actions.
- **Neutral (Earth):** A deep, warm brown for text and high-contrast iconography, ensuring legibility while maintaining the cozy aesthetic.
- **Surface:** Semi-transparent whites (`rgba(255, 255, 255, 0.6)`) serve as the base for all containers to achieve the glass effect.

## Typography

Geist was selected for its clean, geometric, yet friendly personality. It bridges the gap between technical precision and organic softness. 

- **Headlines:** Use Bold weights with tight letter spacing to create a sturdy, "contained" look for titles.
- **Body:** Regular weights provide excellent legibility against blurred glass backgrounds.
- **Labels:** Semibold and uppercase for small metadata to maintain structure in a soft environment.
- **Hierarchy:** Rely on size and weight contrast rather than color shifts, as the background colors will vary significantly through the glass panels.

## Layout & Spacing

The layout philosophy follows a **Fluid Grid** model that mimics the organic but organized grid of a garden plot. Elements should feel like they have "room to breathe," mirroring the airy quality of the sky in the reference image.

- **Desktop:** 12-column grid with generous 24px gutters. Content is centered with a max-width of 1280px to maintain the "diorama" feel.
- **Mobile:** 4-column grid with 16px margins.
- **Rhythm:** Use an 8px baseline. Vertical spacing between sections should be aggressive (`lg` or `xl`) to emphasize the isolation of different "islands" of content.

## Elevation & Depth

This system ignores traditional shadows in favor of **Layered Translucency**. Depth is communicated through the intensity of the backdrop blur and the thickness of the inner "glow."

- **Level 1 (Surface):** Backdrop blur of 12px, 60% opacity white fill, 1px solid white border at 30% opacity.
- **Level 2 (Raised):** Backdrop blur of 20px, 70% opacity white fill, 1.5px solid white border at 50% opacity. This layer receives a very soft, large-radius ambient shadow (`rgba(120, 53, 15, 0.1)`) to suggest it is floating higher above the "soil."
- **Overlays:** Full-screen blurs (32px) are used for modals to completely isolate the user's focus, like looking through a thick morning mist.

## Shapes

The shape language is consistently "squishy" and organic. There are no sharp corners in this design system.

- **Standard Elements:** Use `rounded-md` (0.5rem) for input fields and small cards.
- **Interactive Containers:** Use `rounded-lg` (1rem) for main content modules and glass panels.
- **Special Elements:** High-priority buttons and chips use `rounded-xl` (1.5rem) or full pills to differentiate them from the structural containers.

## Components

### Buttons
Primary buttons are high-contrast, solid blocks of **Sunbeam Yellow** (#FBBF24) with **Earth Brown** (#78350F) text. They should have a subtle inner-bevel effect to feel "pressable." Secondary buttons use the glass style with a slightly thicker white border.

### Chips & Tags
Small, pill-shaped elements using the **Sprout Green** or **Vine-Ripe Red** colors at 20% opacity with solid text. These should look like little leaves or berries scattered on the interface.

### Input Fields
Soft white glass backgrounds with a 1px white border. On focus, the border transitions to a solid **Sunbeam Yellow** and the backdrop blur increases.

### Cards
Large glass panels with `rounded-lg` corners. Cards should always have a 1px white stroke to ensure they separate from each other when stacked.

### Progress Bars
The track is a semi-transparent Earth Brown, while the filler is a vibrant Sprout Green gradient, symbolizing a plant growing.