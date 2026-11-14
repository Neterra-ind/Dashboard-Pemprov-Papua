import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

/** Kartu metrik design system — selalu punya: garis aksen atas, angka besar,
 *  label, dan ikon. Hanya warna aksen yang mengikuti Primary Color. */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  caption,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: 'default' | 'accent' | 'positive' | 'negative' | 'warning'
  caption?: string
}) {
  const iconStyle = {
    default: 'bg-primary-50 text-primary-500',
    accent: 'bg-accent text-white',
    positive: 'bg-success-soft text-success',
    negative: 'bg-danger-soft text-danger',
    warning: 'bg-warning-soft text-warning',
  }[tone]

  const accentLine = {
    default: 'bg-primary-500',
    accent: 'bg-accent',
    positive: 'bg-success',
    negative: 'bg-danger',
    warning: 'bg-warning',
  }[tone]

  // Angka ribuan memakai pemisah titik gaya Indonesia (mis. 3.210).
  const displayValue = typeof value === 'number' ? value.toLocaleString('id-ID') : value

  return (
    <Card className="rise-in relative overflow-hidden p-5">
      {/* Top accent line */}
      <span className={cn('absolute inset-x-0 top-0 h-1', accentLine)} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="kpi-number text-[28px] leading-none text-slate-900 2xl:text-[30px]">{displayValue}</p>
          <p className="mt-2.5 text-[13px] font-semibold leading-snug text-slate-600">{label}</p>
          {caption && <p className="mt-0.5 text-xs text-slate-400">{caption}</p>}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            iconStyle,
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
    </Card>
  )
}
