# AIeGator Design System

A modern, mood-forward design system built for event discovery.

## Design Philosophy

### Core Principles

1. **Dark Mode First**: Optimized for nighttime browsing and event discovery
2. **Mood Over Category**: Visual language that evokes feeling, not just information
3. **Imagery Forward**: Rich event photos as primary visual element
4. **Minimal Chrome**: Let content breathe, reduce UI friction
5. **Fluid Motion**: Subtle animations that feel alive, not distracting
6. **Accessibility**: WCAG AA compliant, high contrast, readable type

### Visual Identity

- **Aesthetic**: Modern editorial meets underground event flyer
- **Vibe**: Sophisticated but not sterile, warm but not cluttered
- **Reference**: Resident Advisor meets Airbnb Experiences meets Apple Music

---

## Color System

### Base Palette

```css
/* Background Layers */
--bg-base: #0A0A0B;        /* Deepest background */
--bg-elevated: #141416;    /* Cards, modals */
--bg-surface: #1C1C1F;     /* Interactive surfaces */
--bg-overlay: #242428;     /* Hover states, overlays */

/* Text Hierarchy */
--text-primary: #FFFFFF;   /* Headlines, important */
--text-secondary: #A1A1AA; /* Body text, descriptions */
--text-tertiary: #71717A;  /* Metadata, captions */
--text-muted: #52525B;     /* Disabled, hints */

/* Borders & Dividers */
--border-subtle: #27272A;  /* Card borders */
--border-medium: #3F3F46;  /* Input borders */
--border-strong: #52525B;  /* Focus states */
```

### Accent Colors

```css
/* Primary Brand */
--accent-primary: #8B5CF6;     /* Purple - main actions */
--accent-primary-hover: #7C3AED;
--accent-primary-muted: rgba(139, 92, 246, 0.15);

/* Semantic */
--success: #22C55E;
--warning: #F59E0B;
--error: #EF4444;
--info: #3B82F6;
```

### Mood Colors

Each mood has a signature gradient for visual identity:

```css
/* Move - Physical energy */
--mood-move: linear-gradient(135deg, #F97316 0%, #EF4444 100%);
--mood-move-solid: #F97316;

/* Chill - Relaxation */
--mood-chill: linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%);
--mood-chill-solid: #06B6D4;

/* Connect - Social */
--mood-connect: linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%);
--mood-connect-solid: #EC4899;

/* Learn - Educational */
--mood-learn: linear-gradient(135deg, #10B981 0%, #06B6D4 100%);
--mood-learn-solid: #10B981;

/* Celebrate - Festive */
--mood-celebrate: linear-gradient(135deg, #FBBF24 0%, #F97316 100%);
--mood-celebrate-solid: #FBBF24;

/* Create - Artistic */
--mood-create: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
--mood-create-solid: #8B5CF6;

/* Explore - Discovery */
--mood-explore: linear-gradient(135deg, #14B8A6 0%, #22C55E 100%);
--mood-explore-solid: #14B8A6;
```

### Vertical Colors

```css
/* Holistic */
--vertical-holistic: linear-gradient(135deg, #14B8A6 0%, #10B981 100%);
--vertical-holistic-solid: #14B8A6;

/* Dance */
--vertical-dance: linear-gradient(135deg, #EC4899 0%, #F43F5E 100%);
--vertical-dance-solid: #EC4899;
```

---

## Typography

### Font Stack

```css
/* Display & Headlines */
--font-display: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Body Text */
--font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Monospace (tags, code) */
--font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
```

### Type Scale

```css
/* Display */
--text-display-lg: 3.5rem;    /* 56px - Hero headlines */
--text-display: 2.5rem;       /* 40px - Page titles */
--text-display-sm: 2rem;      /* 32px - Section headers */

/* Headings */
--text-h1: 1.75rem;           /* 28px */
--text-h2: 1.5rem;            /* 24px */
--text-h3: 1.25rem;           /* 20px */
--text-h4: 1.125rem;          /* 18px */

/* Body */
--text-lg: 1.125rem;          /* 18px */
--text-base: 1rem;            /* 16px */
--text-sm: 0.875rem;          /* 14px */
--text-xs: 0.75rem;           /* 12px */

/* Line Heights */
--leading-tight: 1.2;
--leading-normal: 1.5;
--leading-relaxed: 1.7;

/* Letter Spacing */
--tracking-tight: -0.02em;
--tracking-normal: 0;
--tracking-wide: 0.02em;
```

---

## Spacing

### Base Unit: 4px

```css
--space-0: 0;
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-5: 1.25rem;    /* 20px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */
--space-24: 6rem;      /* 96px */
```

### Container Widths

```css
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;
```

---

## Radii & Shadows

### Border Radius

```css
--radius-none: 0;
--radius-sm: 0.25rem;     /* 4px - Small elements */
--radius-md: 0.5rem;      /* 8px - Buttons, inputs */
--radius-lg: 0.75rem;     /* 12px - Cards */
--radius-xl: 1rem;        /* 16px - Large cards */
--radius-2xl: 1.5rem;     /* 24px - Modals */
--radius-full: 9999px;    /* Pills, avatars */
```

### Shadows

```css
/* Subtle elevation */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.4);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.5);

/* Glow effects */
--glow-accent: 0 0 20px rgba(139, 92, 246, 0.3);
--glow-mood: 0 0 30px var(--mood-color, rgba(139, 92, 246, 0.2));
```

---

## Components

### Event Card

```
┌─────────────────────────────────────┐
│                                     │
│         [Event Image 16:9]          │
│                                     │
│  ┌──────────────────────────────┐   │
│  │ Mood Pill  │  Walking Dist.  │   │
│  └──────────────────────────────┘   │
├─────────────────────────────────────┤
│ Event Title (H3)                    │
│ Venue Name • Neighborhood           │
│                                     │
│ 📅 Sat, Jan 15 • 8:00 PM           │
│ 💰 $15-25                          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🧘 yoga  ⚡3  👥 social         │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Specs:**
- Aspect ratio: 16:9 for image
- Border radius: `--radius-lg`
- Background: `--bg-elevated`
- Border: 1px `--border-subtle`
- Hover: Scale 1.02, shadow `--shadow-lg`

### Mood Chip

```
┌───────────────────┐
│ 🏃 Move           │
└───────────────────┘
```

**States:**
- Default: `--bg-surface`, `--text-secondary`
- Hover: Mood gradient background
- Selected: Mood gradient, white text, glow

### Filter Bar

```
┌─────────────────────────────────────────────────┐
│ Tonight  Weekend  Holistic  Dance  |  📍 Mission │
└─────────────────────────────────────────────────┘
```

**Specs:**
- Horizontal scroll on mobile
- Sticky positioning below header
- Background blur effect: `backdrop-filter: blur(12px)`

### Neighborhood Selector

```
┌─────────────────────────────────────┐
│ 📍 Select Your Neighborhood         │
├─────────────────────────────────────┤
│ 🏠 Home: Mission District           │
│ 💼 Work: SoMa                       │
│ + Add another neighborhood          │
├─────────────────────────────────────┤
│ Walking radius: ●───○ 10 min        │
└─────────────────────────────────────┘
```

---

## Motion

### Timing Functions

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Duration Scale

```css
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 400ms;
--duration-slower: 600ms;
```

### Animation Patterns

```css
/* Fade In Up */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scale In */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Stagger children */
.stagger-children > * {
  animation: fadeInUp var(--duration-normal) var(--ease-out) forwards;
  opacity: 0;
}
.stagger-children > *:nth-child(1) { animation-delay: 0ms; }
.stagger-children > *:nth-child(2) { animation-delay: 50ms; }
.stagger-children > *:nth-child(3) { animation-delay: 100ms; }
/* ... etc */
```

---

## Responsive Breakpoints

```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

### Mobile-First Approach

```css
/* Base styles for mobile */
.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

/* Tablet */
@media (min-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-6);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .card-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Wide */
@media (min-width: 1280px) {
  .card-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

---

## Iconography

### Icon System
- **Library**: Lucide React (consistent, open-source)
- **Size Scale**: 16, 20, 24, 32
- **Stroke Width**: 1.5 (default), 2 (bold)

### Custom Mood Icons
| Mood | Icon | Emoji Alternative |
|------|------|-------------------|
| Move | Activity | 🏃 |
| Chill | Coffee | 😌 |
| Connect | Users | 🤝 |
| Learn | BookOpen | 📚 |
| Celebrate | PartyPopper | 🎉 |
| Create | Palette | 🎨 |
| Explore | Compass | 🧭 |

### Vertical Icons
| Vertical | Icon | Emoji |
|----------|------|-------|
| Holistic | Lotus | 🧘 |
| Dance | Music | 💃 |

---

## Accessibility Guidelines

### Color Contrast
- Text on backgrounds: minimum 4.5:1 ratio
- Large text (18px+): minimum 3:1 ratio
- Interactive elements: minimum 3:1 against adjacent colors

### Focus States
```css
:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
```

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Screen Reader Support
- Semantic HTML elements
- ARIA labels for icon buttons
- Skip links for navigation
- Announce dynamic content updates

---

## File Structure

```
apps/web/
├── src/
│   ├── styles/
│   │   ├── globals.css        # CSS variables, resets
│   │   ├── components.css     # Component styles
│   │   └── utilities.css      # Utility classes
│   ├── components/
│   │   ├── ui/               # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Chip.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Modal.tsx
│   │   ├── events/           # Event-specific
│   │   │   ├── EventCard.tsx
│   │   │   ├── EventGrid.tsx
│   │   │   └── EventDetail.tsx
│   │   ├── discovery/        # Discovery features
│   │   │   ├── MoodSelector.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   └── NeighborhoodPicker.tsx
│   │   └── layout/           # Layout components
│   │       ├── Header.tsx
│   │       ├── Navigation.tsx
│   │       └── Footer.tsx
│   └── lib/
│       └── cn.ts             # Class name utility
```
