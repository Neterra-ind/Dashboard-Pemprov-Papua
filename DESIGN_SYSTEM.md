# Netterra Dashboard Design System

One visual language for every Netterra client dashboard. Layout, spacing, typography,
radius, shadows, and semantic/sentiment colors are **fixed**. The only thing that changes
between clients is the **Primary Color** — every token below is derived from it.

- Source of truth: [`src/index.css`](src/index.css) (`@theme` design tokens)
- Chart palette: [`src/lib/chartTheme.tsx`](src/lib/chartTheme.tsx)
- Primitives: `Card`, `StatCard`, `Badge`, `PageHeader`, `DataTable`, `FilterSelect`,
  `DateRangeFilter`, `SeverityGauge`, `AppLayout`

## Re-skinning for a new client

Change **only** the primary scale in `src/index.css` (`--color-primary-50 … 900`), then
swap the hero illustration, client logo, and content. Everything else re-themes automatically
because all components consume the token names — never raw hex.

```
Primary (current client — Pemprov Papua): #07324F  (navy)
```

---

## Design Tokens

### Primary (derived from #07324F)
| Token | Value | Token | Value |
|---|---|---|---|
| Primary-50 | `#E9F1F7` | Primary-500 (Base) | `#07324F` |
| Primary-100 | `#C8DCEC` | Primary-600 | `#062A43` |
| Primary-200 | `#9BBDD7` | Primary-700 | `#052237` |
| Primary-300 | `#6698BC` | Primary-800 | `#041A2B` |
| Primary-400 | `#35719B` | Primary-900 | `#03121E` |

Accent aliases: `accent = Primary-500`, `accent-strong = Primary-700`,
`accent-soft = Primary-50`, `accent-fg = #FFFFFF`.

### Accent (#FF4900) — emphasis only, NOT the primary
Used **sparingly (~10–15%)** for emphasis; primary (navy) stays the dominant color.
When the primary changes, the accent's brightness/saturation is retuned for harmony
while `#FF4900` remains the visual reference.

| Token | Value | Token | Value |
|---|---|---|---|
| Accent-50 | `#FFF2EC` | Accent-500 (Base) | `#FF4900` |
| Accent-100 | `#FFE0D2` | Accent-600 | `#E63F00` |
| Accent-200 | `#FFC1A5` | Accent-700 | `#BD3300` |
| Accent-300 | `#FF9B70` | Accent-800 | `#952800` |
| Accent-400 | `#FF6F38` | Accent-900 | `#7A2207` |

Derived: `accent-hover = 600` · `accent-pressed = 700` · `accent-soft/bg = 50` ·
`accent-border = 200` · `accent-text = 700` (AA on light) · `accent-fg = #FFFFFF` ·
optional `.accent-gradient` (500→400).

**Where accent is applied (only here):** Download/Export CTA · selected-nav indicator +
active state · active tabs · one highlighted headline KPI · headline metrics (e.g. Share
of Voice) · hero category badge. Everything else (workflow buttons, focus rings, links,
charts, hero overlay) uses **primary**.

### Semantic (harmonized with primary, WCAG AA)
| Role | Base | Background | Text |
|---|---|---|---|
| Success | `#0E7C57` | `#E6F5EE` | `#0A5F43` |
| Warning | `#B45309` | `#FBF1E0` | `#8A4708` |
| Danger  | `#D93A34` | `#FBEAEA` | `#A62B22` |
| Info    | `#1C7ED6` | `#E7F1FB` | `#155EA6` |

Sentiment (fixed): Positive → Success · Negative → Danger · Neutral → `#94A3B8`.

### Background
| Token | Value |
|---|---|
| App Background | `#F4F7FA` |
| Section Background | `#EEF3F8` |
| Card Background | `#FFFFFF` |
| Hover Background | `#F1F5F9` |
| Table Header Background | `#F2F6FA` |
| Input Background | `#FFFFFF` |
| Sidebar Background | `#FFFFFF` |
| Popup Background | `#FFFFFF` |

### Border
| Token | Value |
|---|---|
| Border Light | `#E6EDF3` |
| Border Medium | `#D5DFE9` |
| Border Strong | `#B9C7D6` |
| Divider | `#EAF0F5` |
| Hover Border | `#B7C6D6` |
| Focus Border | `#07324F` |
| Disabled Border | `#E9EEF3` |

### Text
| Token | Value |
|---|---|
| Text Primary | `#0F1E2E` |
| Text Secondary | `#47576B` |
| Text Muted | `#7A8C9E` |
| Text on Primary | `#FFFFFF` |

### Typography — Inter (fixed across all clients)
| Style | Size / Weight |
|---|---|
| Dashboard Title | 48 / Bold |
| Section Title | 30 / Bold |
| Card Title | 18 / SemiBold |
| Metric Number | 44–48 / ExtraBold |
| Body | 15 / Medium |
| Caption | 13 / Medium |
| Label | 12 / Medium |

### Radius / Shadow / Spacing
| Token | Value |
|---|---|
| Card Radius | `18px` |
| Card Padding | `24px` |
| Card Shadow | `0 2px 8px rgba(15,23,42,.05)` |
| Popup Shadow | `0 12px 32px -10px rgba(15,23,42,.22)` |
| Spacing | 8px base scale (gap-4/6, space-y-6/8) |

### Metric cards
Always: top accent line · large number (ExtraBold) · label · rounded icon chip.
Only the accent color follows the primary.

### Charts (balanced palette, not just primary)
Categorical series: `#07324F · #2F80B7 · #38A78E · #E0A73E · #D9694A · #7C6FB0`.
Axis `#7A8C9E`, grid `#E9EFF5`. Unified rounded bars, gradient area fills, one tooltip
and legend style (`ChartTooltip`, `ChartLegend` in `chartTheme.tsx`).

### Table
Header bg `#F2F6FA` · header text `#47576B` · row `#FFFFFF` · row hover `#F4F8FB` ·
selected row `#E9F1F7` · border `#E6EDF3`.

### Sidebar
Bg `#FFFFFF` · active item bg `#E9F1F7` + text/icon `#07324F` + left indicator ·
inactive `#5A6B7E` · hover `#F1F5F9` · icon `#7A8C9E`.
