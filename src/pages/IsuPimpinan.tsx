import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ExternalLink, Newspaper, TrendingUp } from 'lucide-react'
import { FilterSelect } from '@/components/FilterSelect'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { KlasifikasiBadge } from '@/components/ui/Badge'
import { AreaGradient, axisProps, ChartLegend, ChartTooltip, chart, cursorFill, gridProps } from '@/lib/chartTheme'
import { hitungPerHariRange } from '@/lib/aggregations'
import { cn } from '@/lib/utils'
import { daftarIsuGubernur, daftarIsuWakilGubernur, daftarJenisSumber, reputasiByEntitas } from '@/data/mockData'
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

  const reputasi = reputasiByEntitas(tab)
  const isuTerkait = useMemo(
    () => (tab === 'Gubernur' ? daftarIsuGubernur : daftarIsuWakilGubernur).slice(0, 8),
    [tab],
  )

  const beritaTerkait = useMemo(
    () => beritaPapua.filter((b) => b.entitasTerkait === tab && (!jenisSumber || getJenisSumber(b.sumber) === jenisSumber)),
    [tab, jenisSumber],
  )

  const timelineEkspos = useMemo(() => {
    if (beritaTerkait.length === 0) return []
    const tanggalList = beritaTerkait.map((b) => b.tanggal).sort()
    return hitungPerHariRange(
      beritaTerkait.map((b) => ({ tanggal: b.tanggal })),
      tanggalList[0],
      tanggalList[tanggalList.length - 1],
    )
  }, [beritaTerkait])

  const topKategori = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of beritaTerkait) map.set(b.kategori, (map.get(b.kategori) ?? 0) + 1)
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)
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
        <FilterSelect label="Jenis Sumber" value={jenisSumber} options={daftarJenisSumber} onChange={setJenisSumber} />
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
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
              <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Timeline Ekspos Berita</p>
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={timelineEkspos} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <AreaGradient id="pimpinanTren" color={chart.accent} />
                  </defs>
                  <XAxis dataKey="tanggal" {...axisProps} minTickGap={48} tickFormatter={(v: string) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}` }} />
                  <YAxis {...axisProps} allowDecimals={false} width={28} />
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

        <Card>
          <CardHeader title="Ekspos Media" subtitle="Jumlah pemberitaan per nama media" />
          <CardContent>
            <ResponsiveContainer width="100%" height={216}>
              <BarChart data={eksposMedia} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={90} />
                <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                <Bar dataKey="value" name="Berita" fill={chart.accent} radius={[0, 6, 6, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader title={`Top Kategori Isu — ${tab}`} subtitle="Jumlah pemberitaan per kategori (data nyata)" />
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topKategori} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid {...gridProps} horizontal={false} />
              <XAxis type="number" {...axisProps} allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={200} />
              <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
              <Bar dataKey="value" name="Berita" fill={chart.accent} radius={[0, 6, 6, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={`Isu Terkait ${tab}`}
          subtitle="Isu yang melekat pada entitas ini, diurutkan berdasarkan jumlah berita"
        />
        <CardContent className="space-y-3">
          {isuTerkait.map((isu) => (
            <Link
              key={isu.id}
              to={`/isu/${isu.id}`}
              className="flex items-start justify-between gap-3 rounded-xl border border-[var(--color-border)] p-3.5 transition-colors hover:border-primary/30 hover:bg-slate-50"
            >
              <div className="flex gap-2.5">
                <Newspaper className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{isu.namaIsu}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {isu.kategori} · {isu.jumlahBerita} berita
                  </p>
                </div>
              </div>
              <KlasifikasiBadge value={isu.klasifikasi} />
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={`Berita Terkait ${tab}`}
          subtitle={`${beritaTerkait.length} berita · klik untuk buka sumber asli`}
        />
        <CardContent className="space-y-2">
          {beritaTerkait.length === 0 && (
            <p className="text-sm text-slate-400">Belum ada berita tercatat untuk entitas ini.</p>
          )}
          {beritaTerkait.slice(0, 20).map((b, i) => (
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
