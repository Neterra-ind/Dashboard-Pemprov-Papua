import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ExternalLink, TrendingUp } from 'lucide-react'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { FilterSelect } from '@/components/FilterSelect'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { AreaGradient, axisProps, ChartLegend, ChartTooltip, chart, cursorFill, gridProps } from '@/lib/chartTheme'
import { hitungPerHariRange } from '@/lib/aggregations'
import { cn } from '@/lib/utils'
import { daftarIsuGubernur, daftarIsuWakilGubernur, daftarJenisSumber, daftarNarasumber, reputasiByEntitas } from '@/data/mockData'
import { getJenisSumber } from '@/lib/utils'
import beritaPapuaRaw from '@/data/beritaPapua.json'

type BeritaRaw = { tanggal: string; judul: string; sumber: string; sentimen: string; url: string; kategori: string; entitasTerkait?: string }
const beritaPapua = beritaPapuaRaw as BeritaRaw[]
import type { EntitasPimpinan } from '@/types'
import fotoGubernur from '@/assets/gubernur-papua.jpg'
import fotoWakilGubernur from '@/assets/wakil-gubernur-papua.jpg'

const SENTIMEN_COLOR = { Positif: chart.positive, Negatif: chart.negative }

const TABS: { key: EntitasPimpinan; label: string }[] = [
  { key: 'Gubernur', label: 'Isu Gubernur Papua' },
  { key: 'Wakil Gubernur', label: 'Isu Wakil Gubernur Papua' },
]

const FOTO_PIMPINAN: Record<EntitasPimpinan, string> = {
  Gubernur: fotoGubernur,
  'Wakil Gubernur': fotoWakilGubernur,
}

export function IsuPimpinan() {
  const [tab, setTab] = useState<EntitasPimpinan>('Gubernur')
  const [jenisSumber, setJenisSumber] = useState('')
  const [dariTanggal, setDariTanggal] = useState('')
  const [sampaiTanggal, setSampaiTanggal] = useState('')
  const [selectedJudul, setSelectedJudul] = useState<string | null>(null)

  const reputasi = reputasiByEntitas(tab)
  const beritaTerkait = useMemo(() => {
    setSelectedJudul(null)
    return beritaPapua.filter(
      (b) =>
        b.entitasTerkait === tab &&
        (!jenisSumber || getJenisSumber(b.sumber) === jenisSumber) &&
        (!dariTanggal || b.tanggal >= dariTanggal) &&
        (!sampaiTanggal || b.tanggal <= sampaiTanggal),
    )
  }, [tab, jenisSumber, dariTanggal, sampaiTanggal])

  const beritaDitampilkan = selectedJudul
    ? beritaTerkait.filter((b) => b.judul === selectedJudul)
    : beritaTerkait

  const timelineEkspos = useMemo(() => {
    if (beritaTerkait.length === 0) return []
    const tanggalList = beritaTerkait.map((b) => b.tanggal).sort()
    return hitungPerHariRange(
      beritaTerkait.map((b) => ({ tanggal: b.tanggal })),
      tanggalList[0],
      tanggalList[tanggalList.length - 1],
    )
  }, [beritaTerkait])

  const eksposMedia = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of beritaTerkait) {
      map.set(b.sumber, (map.get(b.sumber) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [beritaTerkait])

  // Isu Dominan = isu pimpinan (unit analisis per-topik, hasil clustering
  // judul+isi di mockData.ts). Isu Gubernur/Wakil Gubernur ditampilkan semua (tidak
  // dibatasi top-N seperti Isu Provinsi), supaya setiap isu yang pernah diberitakan
  // tetap terlihat untuk kebutuhan monitoring pimpinan.
  const isuGubernur = useMemo(() => {
    const daftarIsuTab = tab === 'Gubernur' ? daftarIsuGubernur : daftarIsuWakilGubernur
    return daftarIsuTab
      .filter(isu => (isu.tipe ?? 'gubernur') !== 'personal')
      .map(isu => ({
        name: isu.namaIsu,
        judul: isu.namaIsu,
        jumlah: isu.jumlahBerita,
        fill: isu.klasifikasi === 'Negatif' ? '#ef4444' : '#1e293b',
      }))
  }, [tab])

  const isuPersonal = useMemo(() => {
    const daftarIsuTab = tab === 'Gubernur' ? daftarIsuGubernur : daftarIsuWakilGubernur
    return daftarIsuTab
      .filter(isu => (isu.tipe ?? 'gubernur') === 'personal')
      .map(isu => ({
        name: isu.namaIsu,
        judul: isu.namaIsu,
        jumlah: isu.jumlahBerita,
        fill: isu.klasifikasi === 'Negatif' ? '#ef4444' : '#1e293b',
      }))
  }, [tab])

  const topNarasumber = useMemo(() =>
    daftarNarasumber
      .map(({ nama, jabatan, kunci }) => ({
        label: `${nama}||${jabatan}`,
        jumlah: beritaTerkait.filter(b => kunci.some(k => b.judul.includes(k))).length,
      }))
      .filter(n => n.jumlah > 0)
      .sort((a, b) => b.jumlah - a.jumlah)
  , [beritaTerkait])

  function WrapTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
    const text = payload?.value ?? ''
    const maxChars = 22
    const words = text.split(' ')
    const lines: string[] = []
    let current = ''
    for (const w of words) {
      if ((current + (current ? ' ' : '') + w).length > maxChars && current) {
        lines.push(current)
        current = w
      } else {
        current = current ? `${current} ${w}` : w
      }
      if (lines.length === 2) { lines[1] += '…'; current = ''; break }
    }
    if (current) lines.push(current)
    const lineH = 13
    const totalH = lines.length * lineH
    return (
      <g transform={`translate(${x},${y})`}>
        {lines.map((l, i) => (
          <text
            key={i}
            x={0}
            y={i * lineH - totalH / 2 + lineH * 0.5}
            textAnchor="end"
            fill="#64748b"
            fontSize={11}
          >
            {l}
          </text>
        ))}
      </g>
    )
  }

  function NameJabatanTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
    const parts = (payload?.value ?? '||').split('||')
    const nama = parts[0]
    const jabatan = parts[1] ?? ''
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={-4} textAnchor="end" fill="#1e293b" fontSize={11} fontWeight={600} className="dark:fill-slate-200">{nama}</text>
        <text x={0} y={9} textAnchor="end" fill="#94a3b8" fontSize={10}>{jabatan}</text>
      </g>
    )
  }

  if (!reputasi) return null

  const sentimenPie = [
    { name: 'Positif', value: reputasi.positiveRatio },
    { name: 'Negatif', value: reputasi.negativeRatio },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Isu Gubernur & Wakil Gubernur"
        subtitle="Pemantauan persepsi publik, citra media, dan narasi yang melekat pada entitas pimpinan daerah — Media Share of Voice (SoV) & sentimen netizen/media."
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect label="Jenis Sumber" value={jenisSumber} options={daftarJenisSumber} onChange={setJenisSumber} />
          <DateRangeFilter
            dari={dariTanggal}
            sampai={sampaiTanggal}
            onDariChange={setDariTanggal}
            onSampaiChange={setSampaiTanggal}
          />
          {(dariTanggal || sampaiTanggal) && (
            <button
              type="button"
              onClick={() => { setDariTanggal(''); setSampaiTanggal('') }}
              className="self-end rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Reset Tanggal
            </button>
          )}
        </div>
      </Card>

      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
              tab === key
                ? 'border-accent text-accent-pressed'
                : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <img
                src={FOTO_PIMPINAN[tab]}
                alt={reputasi.nama}
                className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-primary/15"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{reputasi.nama}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{tab} Papua</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total Berita {beritaTerkait.length}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Timeline Ekspos Berita</p>
              <p className="mb-2 text-[11px] text-slate-400 dark:text-slate-500">Jumlah berita per hari (sesuai filter)</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={timelineEkspos} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <AreaGradient id="pimpinanTren" color={chart.accent} />
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="tanggal" {...axisProps} minTickGap={40} tickFormatter={(v: string) => { const d = new Date(v); return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }} />
                  <YAxis {...axisProps} allowDecimals={false} width={36} />
                  <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                  <Area type="monotone" dataKey="jumlah" name="Berita" stroke={chart.accent} fill="url(#pimpinanTren)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {reputasi.topIsu.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                >
                  {t}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Sentimen Netizen/Media" subtitle="Rasio positif vs negatif" />
          <CardContent>
            <ResponsiveContainer width="100%" height={216}>
              <PieChart>
                <Pie data={sentimenPie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="none">
                  {sentimenPie.map((entry) => (
                    <Cell key={entry.name} fill={SENTIMEN_COLOR[entry.name as 'Positif' | 'Negatif']} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip valueSuffix="%" />} />
                <Legend content={<ChartLegend />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {isuGubernur.length > 0 && (
          <Card>
            <CardContent>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Isu Gubernur</p>
              <ResponsiveContainer width="100%" height={Math.max(200, isuGubernur.length * 44)}>
                <BarChart
                  data={isuGubernur}
                  layout="vertical"
                  margin={{ left: 8, right: 40, top: 0, bottom: 0 }}
                  style={{ cursor: 'pointer' }}
                  onClick={(d) => {
                    const judul = d?.activePayload?.[0]?.payload?.judul
                    if (judul) setSelectedJudul((prev) => prev === judul ? null : judul)
                  }}
                >
                  <CartesianGrid {...gridProps} horizontal={false} />
                  <XAxis type="number" {...axisProps} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" {...axisProps} width={160} tick={<WrapTick />} />
                  <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                  <Bar dataKey="jumlah" name="Berita" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {isuGubernur.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.fill}
                        opacity={selectedJudul && selectedJudul !== entry.judul ? 0.3 : 1}
                      />
                    ))}
                    <LabelList dataKey="jumlah" position="right" style={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {isuPersonal.length > 0 && (
          <Card>
            <CardContent>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Isu Personal</p>
              <ResponsiveContainer width="100%" height={Math.max(200, isuPersonal.length * 44)}>
                <BarChart
                  data={isuPersonal}
                  layout="vertical"
                  margin={{ left: 8, right: 40, top: 0, bottom: 0 }}
                  style={{ cursor: 'pointer' }}
                  onClick={(d) => {
                    const judul = d?.activePayload?.[0]?.payload?.judul
                    if (judul) setSelectedJudul((prev) => prev === judul ? null : judul)
                  }}
                >
                  <CartesianGrid {...gridProps} horizontal={false} />
                  <XAxis type="number" {...axisProps} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" {...axisProps} width={160} tick={<WrapTick />} />
                  <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                  <Bar dataKey="jumlah" name="Berita" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {isuPersonal.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.fill}
                        opacity={selectedJudul && selectedJudul !== entry.judul ? 0.3 : 1}
                      />
                    ))}
                    <LabelList dataKey="jumlah" position="right" style={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader title="Ekspos Media" subtitle="Jumlah pemberitaan per nama media" />
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(200, eksposMedia.length * 36)}>
            <BarChart data={eksposMedia} layout="vertical" margin={{ left: 8, right: 12, top: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} horizontal={false} />
              <XAxis type="number" {...axisProps} allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={120} />
              <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
              <Bar dataKey="value" name="Berita" fill={chart.accent} radius={[0, 6, 6, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {topNarasumber.length > 0 && (
        <Card>
          <CardHeader title="Narasumber" subtitle="Tokoh/pejabat yang paling banyak disebut dalam berita" />
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(160, topNarasumber.length * 52)}>
              <BarChart data={topNarasumber} layout="vertical" margin={{ left: 8, right: 48, top: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="label" {...axisProps} width={180} tick={<NameJabatanTick />} />
                <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                <Bar dataKey="jumlah" name="Sebutan" fill={chart.accent} radius={[0, 4, 4, 0]} maxBarSize={22}>
                  <LabelList dataKey="jumlah" position="right" style={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader
          title={`Berita Terkait ${tab}`}
          subtitle={
            selectedJudul
              ? `${beritaDitampilkan.length} berita untuk judul terpilih · klik baris untuk buka · klik lagi bar untuk reset`
              : `${beritaTerkait.length} berita · klik bar di atas untuk filter · klik untuk buka sumber asli`
          }
        />
        <CardContent className="space-y-2">
          {selectedJudul && (
            <div className="flex items-center justify-between rounded-lg bg-accent/10 px-3 py-2">
              <p className="text-xs font-medium text-accent-pressed line-clamp-1">{selectedJudul}</p>
              <button
                type="button"
                onClick={() => setSelectedJudul(null)}
                className="ml-3 shrink-0 text-xs text-slate-400 hover:text-slate-700"
              >
                ✕ Reset
              </button>
            </div>
          )}
          {beritaDitampilkan.length === 0 && (
            <p className="text-sm text-slate-400">Belum ada berita tercatat untuk entitas ini.</p>
          )}
          {beritaDitampilkan.slice(0, 20).map((b, i) => (
            <a
              key={`${b.url}-${i}`}
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
            >
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-slate-800 hover:underline dark:text-slate-100">
                  {b.judul}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {b.sumber} · {b.tanggal} · {b.sentimen}
                </p>
              </div>
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            </a>
          ))}
        </CardContent>
      </Card>

      <p className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
        <TrendingUp className="h-3 w-3" /> Engagement rate rata-rata: {reputasi.engagementRate}%
      </p>
    </div>
  )
}
