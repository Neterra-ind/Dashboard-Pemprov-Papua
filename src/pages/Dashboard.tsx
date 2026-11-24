import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { AlertTriangle, ArrowRight, Building2, Download, Newspaper, UserRound, ThumbsUp, MessageCircle, Share2, Eye } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { downloadXlsx } from '@/lib/exportXlsx'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { PageHeader, SectionLabel } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/Badge'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { FilterSelect } from '@/components/FilterSelect'
import { useRole } from '@/lib/role'
import { useDisposisi } from '@/lib/store'
import {
  daftarJenisSumber,
  daftarOpd,
  KATEGORI_OPD_MAP,
} from '@/data/mockData'
import { useIsuEngine } from '@/lib/isuEngine'
import { getJenisSumber } from '@/lib/utils'
import { useBerita, isRelevan, isPimpinan, isProvinsi } from '@/lib/beritaStore'
import { hitungPerHariRange } from '@/lib/aggregations'
import type { KategoriIsu } from '@/types'
import {
  AreaGradient,
  axisProps,
  ChartLegend,
  ChartTooltip,
  chart,
  cursorFill,
  gridProps,
  SENTIMEN_COLOR,
} from '@/lib/chartTheme'
import ilustrasiPapua from '@/assets/Papua_Panorama_diperkecil.png'

const FRAMING_COLOR_MAP: Record<string, string> = {
  'Respons': '#3b82f6',
  'Sosialisasi': '#14b8a6',
  'Seremoni': '#8b5cf6',
  'Klarifikasi': '#f59e0b',
  'Program/Kinerja': '#10b981',
  'Isu Terhubung': '#f97316',
  'Hal Terhubung': '#94a3b8',
  'Seremoni Pasif': '#a855f7',
}

const waktuSekarang = new Date().toLocaleString('id-ID', {
  dateStyle: 'full',
  timeStyle: 'short',
})

function HeroBanner() {
  return (
    <div className="relative z-10 h-44 w-full overflow-hidden rounded-[20px] border border-[var(--color-border)] shadow-[var(--shadow-card)] sm:h-auto sm:min-h-36 lg:min-h-28 sm:aspect-[4/1] md:sticky md:top-4">
      <img
        src={ilustrasiPapua}
        alt="Ilustrasi Provinsi Papua"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary-strong/90 via-primary/50 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-center gap-1 px-6 sm:px-9">
        <span className="w-fit rounded-full bg-accent/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
          Government Media Analytics
        </span>
        <h2 className="mt-1 text-lg font-bold leading-tight text-white drop-shadow-sm sm:text-xl">
          Pemantauan Media Pemprov Papua
        </h2>
        <p className="max-w-md text-xs text-white/85 sm:text-[13px]">
          Pemantauan pemberitaan, sentimen, dan isu strategis Pemprov Papua secara real-time.
        </p>
      </div>
    </div>
  )
}

function AdminOpdSummary() {
  const { opdAktif, setOpdAktif } = useRole()
  const { statusUntukIsu } = useDisposisi()
  const { daftarIsu } = useIsuEngine()

  const isuOpd = useMemo(
    () => daftarIsu.filter((isu) => isu.opd === opdAktif).slice(0, 12),
    [daftarIsu, opdAktif],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Isu Relevan OPD Saya"
        subtitle="Isu yang berkaitan dengan kedinasan Anda beserta status tindak lanjut. Login sebagai Admin OPD hanya melihat data yang relevan dengan dinasnya."
      />

      <Card className="p-5">
        <FilterSelect
          label="Organisasi Perangkat Daerah (OPD)"
          value={opdAktif}
          options={daftarOpd}
          onChange={(v) => setOpdAktif(v as typeof opdAktif)}
        />
      </Card>

      <Card>
        <CardHeader
          title={`Isu — ${opdAktif}`}
          subtitle={`${isuOpd.length} isu ditemukan untuk OPD ini`}
          action={
            <Link
              to="/tindak-lanjut"
              className="rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-primary-strong"
            >
              Buka Tindak Lanjut
            </Link>
          }
        />
        <CardContent className="space-y-2.5">
          {isuOpd.length === 0 && (
            <p className="text-sm text-slate-400">Belum ada isu tercatat untuk OPD ini.</p>
          )}
          {isuOpd.map((isu) => (
            <Link
              key={isu.id}
              to={`/isu/${isu.id}`}
              className="flex items-start justify-between gap-3 rounded-xl border border-[var(--color-border)] p-3.5 transition-colors hover:border-primary/30 hover:bg-slate-50"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">{isu.namaIsu}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isu.kategori} · {isu.jumlahBerita} berita
                </p>
              </div>
              <StatusBadge value={statusUntukIsu(isu.id)} />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function Dashboard() {
  const { role } = useRole()
  const { berita: beritaPapua } = useBerita()
  const [jenisSumber, setJenisSumber] = useState('')
  const [dariTanggal, setDariTanggal] = useState('')
  const [sampaiTanggal, setSampaiTanggal] = useState('')

  const beritaFiltered = useMemo(
    () => beritaPapua.filter(
      (b) =>
        isRelevan(b) &&
        (!jenisSumber || getJenisSumber(b.sumber) === jenisSumber) &&
        (!dariTanggal || b.tanggal >= dariTanggal) &&
        (!sampaiTanggal || b.tanggal <= sampaiTanggal),
    ),
    [jenisSumber, dariTanggal, sampaiTanggal],
  )

  const totalBeritaPemprov = beritaFiltered.length
  const totalBeritaGubernur = useMemo(
    () => beritaFiltered.filter((b) => isPimpinan(b)).length,
    [beritaFiltered],
  )
  const totalBeritaOpd = useMemo(
    () => beritaFiltered.filter((b) => isProvinsi(b)).length,
    [beritaFiltered],
  )
  const totalBeritaNegatif = useMemo(
    () => beritaFiltered.filter((b) => ((b as any).sentimen_kurasi || b.sentimen) === 'Negatif').length,
    [beritaFiltered],
  )

  // Isu Negatif/Potensi Negatif dari DATA REAL (hasil upload), bukan data contoh —
  // sama persis dengan logika yang dipakai di halaman Early Warning, supaya
  // alert di Executive Summary selalu sinkron dengan data yang sedang aktif.
  const isuNegatifReal = useMemo(
    () =>
      beritaFiltered
        .filter((b) => {
          const sentimenEfektif = (b as any).sentimen_kurasi || b.sentimen
          return sentimenEfektif === 'Negatif' || sentimenEfektif === 'Potensi Negatif'
        })
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    [beritaFiltered],
  )

  const trenBerita = useMemo(() => {
    const semuaTanggal = beritaFiltered.map((b) => b.tanggal).sort()
    if (!semuaTanggal.length) return []
    return hitungPerHariRange(
      beritaFiltered.map((b) => ({ tanggal: b.tanggal })),
      semuaTanggal[0],
      semuaTanggal[semuaTanggal.length - 1],
    )
  }, [beritaFiltered])

  const distribusiSentimen = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of beritaFiltered) {
      map.set(b.sentimen, (map.get(b.sentimen) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [beritaFiltered])

  const totalSentimen = distribusiSentimen.reduce((s, d) => s + d.value, 0)

  const puncakPemberitaan = useMemo(() => {
    const map = new Map<string, { judul: string; jumlah: number; negatif: number }>()
    for (const b of beritaFiltered) {
      const e = map.get(b.judul) ?? { judul: b.judul, jumlah: 0, negatif: 0 }
      e.jumlah++
      if (b.sentimen === 'Negatif') e.negatif++
      map.set(b.judul, e)
    }
    return Array.from(map.values())
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 10)
      .map(({ judul, jumlah, negatif }) => {
        const isNegatif = jumlah > 0 && negatif / jumlah > 0.5
        return { name: judul, judul, jumlah, fill: isNegatif ? '#ef4444' : '#1e293b' }
      })
  }, [beritaFiltered])

  // Ranking OPD berdasarkan isu negatif/potensi negatif dari DATA REAL (hasil upload).
  const rankingOpdTeratas = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of isuNegatifReal) {
      const opd = (b as any).opd || KATEGORI_OPD_MAP[b.kategori as KategoriIsu] || b.kategori
      map.set(opd, (map.get(opd) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name: name.replace('Dinas ', ''), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [isuNegatifReal])

  // ── Kurasi AI ────────────────────────────────────────────────────────────
  const adaKurasi = useMemo(
    () => beritaFiltered.some((b) => !!(b as any).framing_kinerja),
    [beritaFiltered],
  )

  const distribusiFraming = useMemo(() => {
    if (!adaKurasi) return []
    const map = new Map<string, number>()
    for (const b of beritaFiltered) {
      const f = (b as any).framing_kinerja as string | undefined
      if (f) map.set(f, (map.get(f) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value, fill: FRAMING_COLOR_MAP[name] ?? '#94a3b8' }))
      .sort((a, b) => b.value - a.value)
  }, [beritaFiltered, adaKurasi])

  const distribusiSentimenKurasi = useMemo(() => {
    if (!adaKurasi) return []
    const map = new Map<string, number>()
    for (const b of beritaFiltered) {
      const s = (b as any).sentimen_kurasi as string | undefined
      if (s) map.set(s, (map.get(s) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [beritaFiltered, adaKurasi])

  const jumlahDuplikat = useMemo(() => {
    if (!adaKurasi) return 0
    return beritaFiltered.filter((b) => (b as any).status_duplikasi && (b as any).status_duplikasi !== 'Unik').length
  }, [beritaFiltered, adaKurasi])

  // ── Engagement dari data Socmed ─────────────────────────────────────────
  const beritaSocmed = useMemo(
    () => beritaFiltered.filter((b) => b.engagement && b.tipe === 'socmed'),
    [beritaFiltered],
  )

  const adaEngagement = beritaSocmed.length > 0

  const topEngagement = useMemo(() => {
    return [...beritaSocmed]
      .map((b) => ({
        name: b.judul.length > 48 ? b.judul.slice(0, 48) + '…' : b.judul,
        judul: b.judul,
        platform: b.platform ?? b.sumber,
        total: (b.engagement?.like ?? 0) + (b.engagement?.comment ?? 0) + (b.engagement?.share ?? 0) + (b.engagement?.view ?? 0),
        like: b.engagement?.like ?? 0,
        comment: b.engagement?.comment ?? 0,
        share: b.engagement?.share ?? 0,
        view: b.engagement?.view ?? 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [beritaSocmed])

  const totalEngagement = useMemo(() => ({
    like: beritaSocmed.reduce((s, b) => s + (b.engagement?.like ?? 0), 0),
    comment: beritaSocmed.reduce((s, b) => s + (b.engagement?.comment ?? 0), 0),
    share: beritaSocmed.reduce((s, b) => s + (b.engagement?.share ?? 0), 0),
    view: beritaSocmed.reduce((s, b) => s + (b.engagement?.view ?? 0), 0),
  }), [beritaSocmed])

  function handleExport() {
    const rows = beritaFiltered.map((b) => [
      b.tanggal,
      b.judul,
      b.sumber,
      getJenisSumber(b.sumber),
      b.kategori,
      b.sentimen,
      b.entitasTerkait ?? '-',
      b.url,
    ])
    downloadXlsx('Berita-Pemprov-Papua', {
      sheetName: 'Berita',
      headers: ['Tanggal', 'Judul', 'Media', 'Jenis Sumber', 'Kategori', 'Sentimen', 'Entitas Terkait', 'URL'],
      rows,
    })
  }

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
          <text key={i} x={0} y={i * lineH - totalH / 2 + lineH * 0.5} textAnchor="end" fill="#64748b" fontSize={11}>{l}</text>
        ))}
      </g>
    )
  }

  if (role === 'Admin OPD') {
    return <AdminOpdSummary />
  }

  return (
    <div className="space-y-8">
      {/* 1 — Hero Banner */}
      <HeroBanner />

      {/* Page title */}
      <PageHeader
        title="Executive Summary"
        subtitle={`Ringkasan pemantauan media Pemprov Papua · Data per ${waktuSekarang} WIB`}
        action={
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover active:bg-accent-pressed"
          >
            <Download className="h-4 w-4" />
            Download .xlsx
          </button>
        }
      />

      {/* 2 — Critical Alert */}
      {isuNegatifReal.length > 0 && (
        <Link
          to="/early-warning"
          className="group flex items-center justify-between gap-4 rounded-[20px] border border-negative/20 bg-negative-soft px-5 py-4 transition-colors hover:bg-negative-soft/70"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-negative text-white">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-slate-800">
              {isuNegatifReal.length} Isu Potensi Negatif/Negatif terpantau dari data real — perlu
              direspons OPD terkait
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 rounded-lg bg-white/80 px-3 py-1.5 text-xs font-semibold text-danger-text">
            Lihat Semua
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      {/* 3 — Filter Sumber */}
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

      {/* 4 — KPI Cards */}
      <section>
        <SectionLabel hint="periode data aktif">Ringkasan Pemberitaan</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Berita Papua"
            value={totalBeritaPemprov}
            icon={Newspaper}
            tone="accent"
            caption="seluruh pemberitaan terpantau"
          />
          <StatCard
            label="Berita Pimpinan"
            value={totalBeritaGubernur}
            icon={UserRound}
            caption="entitas pimpinan daerah"
          />
          <StatCard
            label="Total Berita OPD"
            value={totalBeritaOpd}
            icon={Building2}
            tone="warning"
            caption="pemberitaan OPD & layanan publik"
          />
          <StatCard
            label="Total Berita Negatif"
            value={totalBeritaNegatif}
            icon={AlertTriangle}
            tone="negative"
          />
        </div>
      </section>

      {/* 4 — Primary Analytics */}
      <section>
        <SectionLabel hint="rentang data penuh">Analitik Utama</SectionLabel>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Ekspos Isu Papua" subtitle="Jumlah berita per hari" />
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trenBerita} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <AreaGradient id="dashTren" color={chart.accent} />
                  </defs>
                  <CartesianGrid {...gridProps} vertical={false} />
                  <XAxis dataKey="tanggal" {...axisProps} minTickGap={24} />
                  <YAxis {...axisProps} allowDecimals={false} width={32} />
                  <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                  <Area
                    type="monotone"
                    dataKey="jumlah"
                    name="Berita"
                    stroke={chart.accent}
                    strokeWidth={2.5}
                    fill="url(#dashTren)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Sentimen Dominan Isu" subtitle="Distribusi seluruh pemberitaan" />
            <CardContent>
              <div className="relative">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={distribusiSentimen}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {distribusiSentimen.map((entry) => (
                        <Cell key={entry.name} fill={SENTIMEN_COLOR[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend content={<ChartLegend />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-x-0 top-[86px] flex -translate-y-1/2 flex-col items-center">
                  <span className="kpi-number text-2xl text-slate-900">{totalSentimen}</span>
                  <span className="text-[11px] text-slate-400">total berita</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 5 — Secondary Analytics */}
      {/* 6 — Isu Dominan */}
      <section>
        <SectionLabel>Isu Dominan</SectionLabel>
        <Card>
          <CardHeader
            title="Isu Dominan"
            subtitle={puncakPemberitaan[0] ? `Terbanyak: ${puncakPemberitaan[0].jumlah} berita` : ''}
          />
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, puncakPemberitaan.length * 44)}>
              <BarChart data={puncakPemberitaan} layout="vertical" margin={{ left: 8, right: 48, top: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={160} tick={<WrapTick />} />
                <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                <Bar dataKey="jumlah" name="Berita" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {puncakPemberitaan.map((entry) => (
                    <Cell key={entry.judul} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="jumlah" position="right" style={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* 6b — Engagement Sosial Media (hanya tampil jika ada data socmed) */}
      {adaEngagement && (
        <section>
          <SectionLabel hint="dari data IMD Sosmed">Engagement Media Sosial</SectionLabel>
          {/* KPI engagement */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total Like', value: totalEngagement.like, icon: ThumbsUp, color: 'text-blue-600 bg-blue-50' },
              { label: 'Total Komentar', value: totalEngagement.comment, icon: MessageCircle, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Total Share', value: totalEngagement.share, icon: Share2, color: 'text-amber-600 bg-amber-50' },
              { label: 'Total View', value: totalEngagement.view, icon: Eye, color: 'text-purple-600 bg-purple-50' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)]">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">{label}</p>
                  <p className="kpi-number text-xl">{value.toLocaleString('id-ID')}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Chart top postingan by engagement */}
          <Card>
            <CardHeader
              title="Top Postingan Sosmed by Engagement"
              subtitle={`${beritaSocmed.length} postingan · total engagement tertinggi`}
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(200, topEngagement.length * 48)}>
                <BarChart data={topEngagement} layout="vertical" margin={{ left: 8, right: 64, top: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} horizontal={false} />
                  <XAxis type="number" {...axisProps} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" {...axisProps} width={180} tick={<WrapTick />} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        labelOverride={(p) => (
                          <span className="font-semibold text-slate-700">
                            {(p as { platform?: string })?.platform ?? ''}
                          </span>
                        )}
                      />
                    }
                    cursor={cursorFill}
                  />
                  <Legend content={<ChartLegend />} />
                  <Bar dataKey="like" name="Like" stackId="a" fill="#3b82f6" maxBarSize={22} />
                  <Bar dataKey="comment" name="Komentar" stackId="a" fill="#10b981" maxBarSize={22} />
                  <Bar dataKey="share" name="Share" stackId="a" fill="#f59e0b" maxBarSize={22} />
                  <Bar dataKey="view" name="View" stackId="a" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    <LabelList dataKey="total" position="right" style={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>
      )}

      {/* 6c — Analitik Kurasi AI (hanya tampil jika data sudah dikurasi) */}
      {adaKurasi && (
        <section>
          <SectionLabel hint="dari kolom kurasi AI pipeline">Analitik Kurasi AI</SectionLabel>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Distribusi Framing Kinerja */}
            <Card>
              <CardHeader
                title="Distribusi Framing Kinerja"
                subtitle={`${distribusiFraming.reduce((s, d) => s + d.value, 0)} berita terkurasi`}
              />
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(180, distribusiFraming.length * 40)}>
                  <BarChart data={distribusiFraming} layout="vertical" margin={{ left: 8, right: 48, top: 0, bottom: 0 }}>
                    <CartesianGrid {...gridProps} horizontal={false} />
                    <XAxis type="number" {...axisProps} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" {...axisProps} width={140} />
                    <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                    <Bar dataKey="value" name="Berita" radius={[0, 4, 4, 0]} maxBarSize={22}>
                      {distribusiFraming.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                      <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Sentimen Kurasi + ringkasan duplikasi */}
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader
                  title="Sentimen Kurasi AI"
                  subtitle="Sentimen hasil verifikasi / override AI"
                />
                <CardContent>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={distribusiSentimenKurasi}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={54}
                          outerRadius={80}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {distribusiSentimenKurasi.map((entry) => (
                            <Cell key={entry.name} fill={SENTIMEN_COLOR[entry.name] ?? '#94a3b8'} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend content={<ChartLegend />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Duplikasi ringkasan */}
              {jumlahDuplikat > 0 && (
                <div className="flex items-center gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {jumlahDuplikat} berita terdeteksi duplikat atau pengulangan
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Filter di halaman Data Sumber → Status Duplikasi
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <SectionLabel>Analitik Sekunder</SectionLabel>

        <Card>
          <CardHeader
            title="Isu Negatif"
            subtitle="Berita negatif atau berpotensi negatif yang perlu direspons OPD"
            action={
              <Link
                to="/early-warning"
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Lihat semua <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {isuNegatifReal.length === 0 && (
              <p className="text-sm text-slate-400">Tidak ada isu berisiko tinggi saat ini.</p>
            )}
            {isuNegatifReal.slice(0, 4).map((b, i) => {
              const opd = (b as any).opd || KATEGORI_OPD_MAP[b.kategori as KategoriIsu] || b.kategori
              return (
                <Link
                  key={`${b.judul}-${i}`}
                  to="/early-warning"
                  className="rounded-xl border border-[var(--color-border)] p-4 transition-colors hover:border-primary/30 hover:bg-slate-50"
                >
                  <p className="line-clamp-2 text-sm font-semibold text-slate-800">{b.judul}</p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {b.sumber} · {b.tanggal} · Kewenangan: {opd}
                  </p>
                </Link>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Publikasi Kinerja OPD" />
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(160, rankingOpdTeratas.length * 44)}>
              <BarChart data={rankingOpdTeratas} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={168} />
                <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                <Bar dataKey="value" name="Isu negatif" fill={chart.accent} radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

    </div>
  )
}
