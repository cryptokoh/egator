# AIeGator Design Themes

## Current Theme: "Dark Vibe"

Dark-mode event discovery with mood-based gradients and a purple accent.

### Color Palette

#### Backgrounds (Layered depth)
| Token | Hex | Usage |
|-------|-----|-------|
| bg-base | `#0A0A0B` | Page background |
| bg-elevated | `#141416` | Cards, elevated surfaces |
| bg-surface | `#1C1C1F` | Input fields, chips, tags |
| bg-overlay | `#242428` | Overlays, hover states |

#### Text Hierarchy
| Token | Hex | Usage |
|-------|-----|-------|
| text-primary | `#FFFFFF` | Headings, important content |
| text-secondary | `#A1A1AA` | Body text, descriptions |
| text-tertiary | `#71717A` | Labels, metadata |
| text-muted | `#52525B` | Placeholders, disabled |

#### Borders
| Token | Hex | Usage |
|-------|-----|-------|
| border-subtle | `#27272A` | Card borders, dividers |
| border-medium | `#3F3F46` | Hover borders, active |
| border-strong | `#52525B` | Focus borders |

#### Accent
| Token | Hex | Usage |
|-------|-----|-------|
| accent | `#8B5CF6` | Primary actions, links, brand |
| accent-hover | `#7C3AED` | Hover state |
| accent-muted | `rgba(139,92,246,0.15)` | Subtle backgrounds |

#### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| success | `#22C55E` | Confirmations |
| warning | `#F59E0B` | Caution states |
| error | `#EF4444` | Errors |
| info | `#3B82F6` | Information |

### Mood Colors (Solid)
| Mood | Hex | Gradient |
|------|-----|----------|
| Move | `#F97316` | `#F97316 -> #EF4444` (orange to red) |
| Chill | `#06B6D4` | `#06B6D4 -> #3B82F6` (cyan to blue) |
| Connect | `#EC4899` | `#EC4899 -> #8B5CF6` (pink to purple) |
| Learn | `#10B981` | `#10B981 -> #06B6D4` (emerald to cyan) |
| Celebrate | `#FBBF24` | `#FBBF24 -> #F97316` (amber to orange) |
| Create | `#8B5CF6` | `#8B5CF6 -> #EC4899` (purple to pink) |
| Explore | `#14B8A6` | `#14B8A6 -> #22C55E` (teal to green) |

### Vertical Colors
| Vertical | Hex | Gradient |
|----------|-----|----------|
| Holistic | `#14B8A6` | `#14B8A6 -> #10B981` (teal to emerald) |
| Dance | `#EC4899` | `#EC4899 -> #F43F5E` (pink to rose) |

### Typography
- **Display**: Inter, -apple-system, BlinkMacSystemFont, sans-serif
- **Body**: Inter, -apple-system, BlinkMacSystemFont, sans-serif
- **Mono**: JetBrains Mono, SF Mono, Consolas, monospace
- **Display sizes**: 3.5rem (lg), 2.5rem (md), 2rem (sm) with tight tracking

### Effects
- **Glow**: `0 0 20px rgba(139, 92, 246, 0.3)` - accent glow for selected mood chips
- **Glass**: `bg-bg-overlay/80 backdrop-blur-xl border border-white/5` - frosted glass for header/filter bar
- **Card hover**: `scale(1.02)` + border color shift + shadow lift

### Animations
- **fade-in-up**: 0.3s ease-out, translateY(12px) to 0
- **scale-in**: 0.2s ease-out, scale(0.95) to 1
- **points-toast**: 2s float-up with fade in/out for gamification popups
- **Stagger delays**: 50ms increments for card grid entrance

### CSS Variables
```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Component Patterns
- **Cards**: `bg-bg-elevated border border-border-subtle rounded-xl` + hover scale/shadow
- **Chips**: `bg-bg-surface text-text-secondary rounded-full` + selected state with mood gradient
- **Buttons**: primary (accent bg), secondary (surface bg + border), ghost (transparent)
- **Inputs**: `bg-bg-surface border-border-subtle` + focus accent ring
- **Scrollbar**: thin (8px), bg-base track, border-medium thumb

### Gamification
- **Points toast**: bottom-right fixed, accent border glow, float-up animation
- **Points badge**: accent/10 bg with flame icon, shown in header
- **Point values**: mood select (+1), filter (+1), event click (+2)
