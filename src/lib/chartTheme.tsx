import type { ReactNode } from 'react'

/* ============================================================================
   NETTERRA — TEMA VISUALISASI TERPADU
   Semua chart (bar, line, area, donut) di seluruh dashboard memakai token yang
   sama dari sini: warna, sumbu, grid, gradient, tooltip, dan legend. Ini yang
   membuat setiap grafik terasa berasal dari satu produk.
   ============================================================================ */

/** Palet warna chart — diturunkan dari Primary #07324F, seimbang & harmonis
 *  (bukan sekadar mengulang primary). Sentimen tetap hijau/merah/abu. */
export const chart = {
  accent: '#07324f', // Primary navy
  accentSoft: '#5b7a93',
  gold: '#e0a73e',
  positive: '#0e7c57',
  negative: '#d93a34',
  neutral: '#94a3b8',
  axis: '#7a8c9e',
  grid: '#e9eff5',
} as const

/** Warna berdasarkan nama sentimen (dipakai pada donut & bar per-sentimen). */
export const SENTIMEN_COLOR: Record<string, string> = {
  Positif: chart.positive,
  Netral: chart.neutral,
  Negatif: chart.negative,
}

/** Palet seri kategorikal — untuk pie/bar/treemap dengan >1 kategori. */
export const SERIES: string[] = [
  '#07324f', // navy
  '#2f80b7', // steel blue
  '#38a78e', // teal
  '#e0a73e', // amber
  '#d9694a', // coral
  '#7c6fb0', // muted violet
]

/** Properti standar untuk <CartesianGrid>. */
export const gridProps = {
  strokeDasharray: '4 4',
  stroke: chart.grid,
} as const

/** Properti standar untuk sumbu — tipis, tanpa garis, warna lembut. */
export const axisProps = {
  tick: { fill: chart.axis, fontSize: 12 },
  tickLine: false,
  axisLine: false,
} as const

/** Kursor tipis untuk tooltip bar/area. */
export const cursorFill = { fill: 'rgba(148, 163, 184, 0.10)' }
export const cursorLine = { stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }

/**
 * Potong label panjang (nama media, nama narasumber, dll) dengan ellipsis
 * agar tidak overflow/terpotong keluar area chart pada sumbu kategori.
 */
export function truncateLabel(text: string, maxChars: number): string {
  if (!text) return text
  return text.length > maxChars ? `${text.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…` : text
}

/** Definisi gradient area — sisipkan di dalam <defs> lalu rujuk via url(#id). */
export function AreaGradient({ id, color }: { id: string; color: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={0.24} />
      <stop offset="95%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  )
}

/** Tooltip terpadu — kartu putih, sudut membulat, bayangan lembut. */
export function ChartTooltip({
  active,
  payload,
  label,
  valueSuffix = '',
  labelOverride,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number | string; color?: string; payload?: Record<string, unknown> }>
  label?: string | number
  valueSuffix?: string
  labelOverride?: (payload: Record<string, unknown> | undefined) => ReactNode
}) {
  if (!active || !payload || payload.length === 0) return null
  const heading = labelOverride ? labelOverride(payload[0]?.payload) : label

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white/95 px-3 py-2 shadow-[var(--shadow-pop)] backdrop-blur">
      {heading != null && heading !== '' && (
        <p className="mb-1 text-xs font-semibold text-slate-700">{heading}</p>
      )}
      <div className="space-y-0.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color ?? chart.accent }}
            />
            {entry.name && <span className="text-slate-500">{entry.name}</span>}
            <span className="ml-auto font-semibold tabular-nums text-slate-800">
              {entry.value}
              {valueSuffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Konten legend terpadu — titik bulat + label kecil rapi. */
export function ChartLegend({
  payload,
}: {
  payload?: Array<{ value?: string; color?: string }>
}) {
  if (!payload) return null
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2">
      {payload.map((entry, i) => (
        <span key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.value}
        </span>
      ))}
    </div>
  )
}
