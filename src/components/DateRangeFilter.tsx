import { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronDown, X } from 'lucide-react'

function isoHariIni(): string {
  return new Date().toISOString().slice(0, 10)
}

function isoNHariLalu(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function isoAwalBulanIni(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function isoAwalBulanLalu(): string {
  const d = new Date()
  d.setDate(0) // hari terakhir bulan lalu
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function isoAkhirBulanLalu(): string {
  const d = new Date()
  d.setDate(0)
  return d.toISOString().slice(0, 10)
}

function formatTanggal(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const PRESETS = [
  { label: '7 hari terakhir',   dari: () => isoNHariLalu(6),       sampai: () => isoHariIni() },
  { label: '30 hari terakhir',  dari: () => isoNHariLalu(29),      sampai: () => isoHariIni() },
  { label: 'Bulan ini',         dari: () => isoAwalBulanIni(),     sampai: () => isoHariIni() },
  { label: 'Bulan lalu',        dari: () => isoAwalBulanLalu(),    sampai: () => isoAkhirBulanLalu() },
]

export function DateRangeFilter({
  label = 'Periode',
  dari,
  sampai,
  onDariChange,
  onSampaiChange,
}: {
  label?: string
  dari: string
  sampai: string
  onDariChange: (value: string) => void
  onSampaiChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const adaFilter = !!(dari || sampai)

  const teksTampil = dari && sampai
    ? `${formatTanggal(dari)} – ${formatTanggal(sampai)}`
    : dari
      ? `Sejak ${formatTanggal(dari)}`
      : sampai
        ? `Sampai ${formatTanggal(sampai)}`
        : 'Semua periode'

  function applyPreset(preset: typeof PRESETS[0]) {
    onDariChange(preset.dari())
    onSampaiChange(preset.sampai())
    setOpen(false)
  }

  function reset() {
    onDariChange('')
    onSampaiChange('')
  }

  return (
    <div ref={containerRef} className="relative">
      {label && <span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={[
            'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition',
            adaFilter
              ? 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10'
              : 'border-[var(--color-border-strong)] bg-white text-slate-600 hover:border-primary/40 hover:bg-slate-50',
          ].join(' ')}
        >
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>{teksTampil}</span>
          <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {adaFilter && (
          <button
            type="button"
            onClick={reset}
            title="Hapus filter tanggal"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-30 mt-2 w-72 rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-pop)]">
          {/* Preset cepat */}
          <div className="border-b border-[var(--color-border)] p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Preset Cepat</p>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="rounded-lg border border-[var(--color-border)] bg-slate-50 px-2.5 py-1.5 text-left text-xs font-medium text-slate-600 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {/* Input manual */}
          <div className="flex gap-2 p-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              Dari
              <input
                type="date"
                value={dari}
                onChange={(e) => onDariChange(e.target.value)}
                className="w-32 rounded-lg border border-[var(--color-border-strong)] bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              Sampai
              <input
                type="date"
                value={sampai}
                onChange={(e) => onSampaiChange(e.target.value)}
                className="w-32 rounded-lg border border-[var(--color-border-strong)] bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
