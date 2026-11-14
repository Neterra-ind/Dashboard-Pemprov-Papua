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
import { AlertTriangle, ArrowRight, Building2, Download, Newspaper, UserRound } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { downloadXlsx } from '@/lib/exportXlsx'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { PageHeader, SectionLabel } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/Badge'
import { FilterSelect } from '@/components/FilterSelect'
import { useRole } from '@/lib/role'
import { useDisposisi } from '@/lib/store'
import {
  daftarEarlyWarning,
  daftarIsu,
  daftarIsuProvinsi,
  daftarJenisSumber,
  daftarOpd,
  daftarRankingOpd,
  substansiMasalahUntuk,
} from '@/data/mockData'
import { getJenisSumber } from '@/lib/utils'
import beritaPapuaRaw from '@/data/beritaPapua.json'

type BeritaRaw = { tanggal: string; judul: string; sumber: string; sentimen: string; url: string; kategori: string; entitasTerkait?: string }
const beritaPapua = beritaPapuaRaw as BeritaRaw[]
import { hitungPerHariRange, levelKeAngka } from '@/lib/aggregations'
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
import ilustrasiPapua from '@/assets/ilustrasi-papua.jpeg'

const waktuSekarang = new Date().toLocaleString('id-ID', {
  dateStyle: 'full',
  timeStyle: 'short',
})

function HeroBanner() {
  return (
    <div className="relative h-44 w-full overflow-hidden rounded-[20px] border border-[var(--color-border)] shadow-[var(--shadow-card)] sm:h-auto sm:min-h-36 lg:min-h-28 sm:aspect-[4/1]">
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

  const isuOpd = useMemo(
    () => daftarIsu.filter((isu) => isu.opd === opdAktif).slice(0, 12),
    [opdAktif],
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
  const { statusUntukIsu } = useDisposisi()
  const [jenisSumber, setJenisSumber] = useState('')

  const beritaFiltered = useMemo(
    () => (jenisSumber ? beritaPapua.filter((b) => getJenisSumber(b.sumber) === jenisSumber) : beritaPapua),
    [jenisSumber],
  )

  const totalBeritaPemprov = beritaFiltered.length
  const totalBeritaGubernur = useMemo(
    () => beritaFiltered.filter((b) => b.entitasTerkait === 'Gubernur').length,
    [beritaFiltered],
  )
  const totalBeritaOpd = useMemo(
    () => beritaFiltered.filter((b) => b.kategori === 'Tata Kelola Pemerintahan').length,
    [beritaFiltered],
  )
  const totalBeritaNegatif = useMemo(
    () => beritaFiltered.filter((b) => b.sentimen === 'Negatif').length,
    [beritaFiltered],
  )

  const belumDitindaklanjuti = useMemo(
    () =>
      daftarEarlyWarning.filter(
        (isu) =>
          (isu.levelRisiko === 'Critical' || isu.levelRisiko === 'High') &&
          statusUntukIsu(isu.id) === 'Belum Ditindaklanjuti',
      ),
    [statusUntukIsu],
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

  const topIsuProvinsi = useMemo(
    () => [...daftarIsuProvinsi].sort((a, b) => b.jumlahBerita - a.jumlahBerita).slice(0, 5),
    [],
  )
  const earlyWarningTeratas = useMemo(
    () =>
      [...daftarEarlyWarning]
        .sort(
          (a, b) => levelKeAngka(b.levelRisiko) - levelKeAngka(a.levelRisiko) || b.viralityScore - a.viralityScore,
        )
        .slice(0, 4),
    [],
  )

  const puncakPemberitaan = useMemo(() => {
    const map = new Map<string, { judul: string; jumlah: number; negatif: number; tanggal: string }>()
    for (const b of beritaFiltered) {
      const e = map.get(b.judul) ?? { judul: b.judul, jumlah: 0, negatif: 0, tanggal: b.tanggal }
      e.jumlah++
      if (b.sentimen === 'Negatif') e.negatif++
      if (b.tanggal > e.tanggal) e.tanggal = b.tanggal
      map.set(b.judul, e)
    }
    const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
    return Array.from(map.values())
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 10)
      .map(({ judul, jumlah, negatif, tanggal }) => {
        const d = new Date(tanggal)
        const tgl = `${d.getDate()} ${BULAN[d.getMonth()]}`
        const label = judul.length > 38 ? judul.slice(0, 36) + '…' : judul
        const isNegatif = jumlah > 0 && negatif / jumlah > 0.5
        return { name: `${label} (${tgl})`, judul, jumlah, fill: isNegatif ? '#ef4444' : '#1e293b' }
      })
  }, [beritaFiltered])

  const rankingOpdTeratas = useMemo(
    () =>
      daftarRankingOpd
        .filter((r) => r.jumlahNegatif > 0)
        .slice(0, 8)
        .map((r) => ({ name: r.opd.replace('Dinas ', ''), value: r.jumlahNegatif })),
    [],
  )

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
      {belumDitindaklanjuti.length > 0 && (
        <Link
          to="/early-warning"
          className="group flex items-center justify-between gap-4 rounded-[20px] border border-negative/20 bg-negative-soft px-5 py-4 transition-colors hover:bg-negative-soft/70"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-negative text-white">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-slate-800">
              {belumDitindaklanjuti.length} Isu Potensi Negatif/Negatif berisiko tinggi membutuhkan
              perhatian segera
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
        <FilterSelect label="Jenis Sumber" value={jenisSumber} options={daftarJenisSumber} onChange={setJenisSumber} />
      </Card>

      {/* 4 — KPI Cards */}
      <section>
        <SectionLabel hint="periode data aktif">Ringkasan Pemberitaan</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Berita Pemprov Papua"
            value={totalBeritaPemprov}
            icon={Newspaper}
            tone="accent"
            caption="seluruh pemberitaan terpantau"
          />
          <StatCard
            label="Total Berita Gubernur"
            value={totalBeritaGubernur}
            icon={UserRound}
            caption="entitas pimpinan daerah"
          />
          <StatCard
            label="Total Berita OPD"
            value={totalBeritaOpd}
            icon={Building2}
            tone="warning"
            caption="tata kelola pemerintahan"
          />
          <StatCard
            label="Total Berita Negatif"
            value={totalBeritaNegatif}
            icon={AlertTriangle}
            tone="negative"
            caption="perlu perhatian OPD"
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
      {/* 6 — Puncak Pemberitaan */}
      <section>
        <SectionLabel hint="10 hari dengan berita terbanyak · merah = dominan negatif">Puncak Pemberitaan</SectionLabel>
        <Card>
          <CardHeader
            title="Hari Terpadat Pemberitaan"
            subtitle={puncakPemberitaan[0] ? `Puncak: ${puncakPemberitaan[0].name} dengan ${puncakPemberitaan[0].jumlah} berita` : ''}
          />
          <CardContent>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={puncakPemberitaan} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={280} />
                <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                <Bar dataKey="jumlah" name="Berita" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {puncakPemberitaan.map((entry) => (
                    <Cell key={entry.judul} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="jumlah" position="right" style={{ fontSize: 12, fill: '#64748b', fontVariantNumeric: 'tabular-nums' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionLabel>Analitik Sekunder</SectionLabel>

        <Card>
          <CardHeader
            title="Issues Negatif"
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
            {earlyWarningTeratas.length === 0 && (
              <p className="text-sm text-slate-400">Tidak ada isu berisiko tinggi saat ini.</p>
            )}
            {earlyWarningTeratas.map((isu) => (
              <Link
                key={isu.id}
                to={`/isu/${isu.id}`}
                className="rounded-xl border border-[var(--color-border)] p-4 transition-colors hover:border-primary/30 hover:bg-slate-50"
              >
                <p className="text-sm font-semibold text-slate-800">{substansiMasalahUntuk(isu)}</p>
                <p className="mt-1.5 text-xs text-slate-500">
                  {isu.jumlahBerita} ekspos berita · Kewenangan: {isu.opd}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Publikasi Kinerja OPD" subtitle="OPD dengan isu negatif terbanyak" />
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rankingOpdTeratas} layout="vertical" margin={{ left: 8, right: 16 }}>
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

      {/* 6 — Detailed Table */}
      <section>
        <SectionLabel>Isu Teratas</SectionLabel>
        <Card id="isu-provinsi" className="scroll-mt-4">
          <CardHeader
            title="Top 5 Isu Provinsi Papua"
            subtitle="Berdasarkan jumlah berita/postingan"
          />
          <CardContent className="pt-2">
            <div className="divide-y divide-[var(--color-border)]">
              {topIsuProvinsi.map((isu, idx) => (
                <div key={isu.id} className="flex items-center gap-4 py-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-xs font-bold text-primary">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">{isu.namaIsu}</p>
                    <p className="text-xs text-slate-500">{isu.kategori}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-700">
                    {isu.jumlahBerita}
                    <span className="ml-1 text-xs font-normal text-slate-400">brt</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
