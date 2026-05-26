# Nothing Web — Design System

> Reference: GitBook 2026. Font: General Sans (headings) + Inter (body). Clean, calm, professional.

## Font

- **Headings**: General Sans Variable, bold (700), tight line-height
- **Body**: Inter, regular (400), relaxed line-height
- **Mono**: Geist Mono / SF Mono
- **CDN**: Inter from `https://rsms.me/inter/inter.css`, General Sans from `https://cdn.fontshare.com`
- **Feature settings**: `'cv02', 'cv03', 'cv04', 'cv11'` (Inter optimized glyphs)
- **Global letter-spacing**: `-0.01em`

### Type Scale

| Element | Font | Size | Weight | Line-height | Color |
|---------|------|------|--------|-------------|-------|
| Page hero (h1) | General Sans | 40-48px | 700 | 1.1 | #1C1917 |
| Page title (h1) | General Sans | 30-36px | 700 | 1.2 | #1C1917 |
| Section title (h2) | General Sans | 20-24px | 700 | 1.3 | #1C1917 |
| Card title | General Sans | 16-18px | 700 | 1.3 | #1C1917 |
| Body | Inter / system | 16px | 400 | 1.6 | #1C1917 |
| Description | Inter / system | 16-18px | 400 | 1.6 | #787878 |
| Small text | Inter / system | 14px | 400 | 1.5 | #787878 |
| Label (uppercase) | General Sans | 12-14px | 700 | 1.6 | #FE551B (brand) |
| Nav item | system | 14-15px | 400-500 | 1.2 | #374151 |
| Stat number | General Sans | 36-48px | 700 | 1 | #1C1917 |
| Code / ID | Geist Mono | 14px | 400-600 | 1.3 | #555 |
| Tiny (badges) | system | 12px | 500 | 1 | varies |

## Colors

### Light (default)

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#ffffff` | Page background |
| `--foreground` | `#1C1917` | Primary text (warm black) |
| `--muted-foreground` | `#787878` | Description, secondary text |
| `--border` | `#e5e7eb` | Card borders, dividers |
| `--card` | `#ffffff` | Card background |
| `--secondary` | `#f6f6f6` | Hover, muted backgrounds |
| `--sidebar-bg` | `#fafafa` | Sidebar background |
| `--brand` | `#FE551B` | Accent — labels, highlights, NMP glow |
| `--primary` | `#111111` | Button background (black) |
| `--primary-foreground` | `#ffffff` | Button text |
| `--destructive` | `#dc3545` | Error, delete |

### Dark

| Token | Value |
|-------|-------|
| `--background` | `#0a0a0a` |
| `--foreground` | `#ededed` |
| `--muted-foreground` | `#666666` |
| `--border` | `#262626` |
| `--card` | `#141414` |
| `--brand` | `#FE551B` |
| `--primary` | `#ededed` |
| `--primary-foreground` | `#0a0a0a` |

## Spacing & Layout

| Token | Value | Notes |
|-------|-------|-------|
| Base unit | 8px | All spacing multiples of 8 |
| Page padding | 24-32px | `px-6 py-8` |
| Content max-width | 48rem | `max-w-3xl` |
| Form max-width | 42rem | `max-w-2xl` |
| Card padding | 20-24px | `p-5` or `p-6` |
| Section gap | 32px | `space-y-8` |
| Item gap | 8-12px | `space-y-2` or `gap-3` |
| Sidebar width | 256px | `w-64` |
| TopBar height | 64px | `h-16` |

## Border Radius

| Token | Value |
|-------|-------|
| `sm` | 4px |
| `md` | 6px |
| `lg` | 8px |
| `xl` | 10px |
| `full` | 9999px (pills, buttons) |

## Shadows (use sparingly)

```
sm:  rgba(0, 0, 0, 0.05) 0px 1px 5px 0px
md:  rgba(0, 0, 0, 0.25) 0px 1px 2px 0px
lg:  rgba(0, 0, 0, 0.15) 0px 4px 12px 0px
```

Prefer **borders over shadows** for card separation.

## Components

### Button
- Primary: `bg-#111 text-white rounded-full px-5 h-10`
- Outline: `border-#e5e7eb bg-transparent rounded-full px-5 h-10`
- Ghost: no border, hover bg-secondary
- Destructive: `bg-#dc3545 text-white rounded-full`
- All buttons: `rounded-full` (pill shape)

### Card
- `border: 1px solid #e5e7eb`
- `border-radius: 8-10px` (rounded-lg to rounded-xl)
- `background: white`
- **No shadow** in most cases
- Padding: `p-5` or `p-6`

### Badge
- Small rounded pill
- NMP badge: brand background
- Status badges: muted background

### Input
- `border: 1px solid #e5e7eb`
- `border-radius: 8px`
- `padding: 7px 14px`
- No shadow, focus ring on focus

### Sidebar
- Fixed left, `w-64`
- Active item: left 2px brand-color bar
- Items: `py-2.5`, `text-[0.9rem]`

### TopBar
- `h-16`, white bg, bottom border
- Logo left: `text-xl font-bold` + brand dot
- Search center: `max-w-md`
- User actions right

## Principles

1. **No decorative shadows** — use borders
2. **No gradients** — solid colors only
3. **No glow effects** — brand color as border or background
4. **95% black/white/gray** — brand color only at key moments (labels, active states, CTA highlights)
5. **Typography hierarchy is king** — large bold headings vs light gray descriptions creates visual contrast without decoration
6. **Generous whitespace** — better empty than crowded
7. **Gentle interactions** — hover = background change, 150ms transition, no scale/lift
8. **Empty states guide users** — never just "0" or "No data", always say what to do next
9. **Mobile: bottom nav** — sidebar collapses, bottom bar appears with 5 icons
