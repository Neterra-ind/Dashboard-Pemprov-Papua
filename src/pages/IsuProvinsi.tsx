import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
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
import { DataTable } from '@/components/DataTable'
import { FilterSelect } from '@/components/FilterSelect'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { KlasifikasiBadge, TrendBadge } from '@/components/ui/Badge'
import { hitungPerHariRange } from '@/lib/aggregations'
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
import { daftarBerita, daftarIsuProvinsi, daftarKategoriIsu, semuaKlasifikasi } from '@/data/mockData'
import type { Isu } from '@/types'

const columns: ColumnDef<Isu, any>[] = [
  {
    accessorKey: 'namaIsu',
    header: 'Nama Isu',
    cell: (info) => (
      <div className="max-w-sm">
        <p className="font-medium text-slate-800 dark:text-slate-100">{info.getValue<string>()}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{info.row.original.opd}</p>
      </div>
    ),
  },
  { accessorKey: 'kategori', header: 'Kategori' },
  {
    accessorKey: 'klasifikasi',
    header: 'Klasifikasi',
    cell: (info) => <KlasifikasiBadge value={info.getValue()} />,
  },
  {
    accessorKey: 'trend',
    header: 'Trend',
    cell: (info) => <TrendBadge value={info.getValue()} />,
  },
  {
    accessorKey: 'jumlahBerita',
    header: 'Jml Berita',
    cell: (info) => <span className="tabular-nums">{info.getValue<number>()}</span>,
  },
]

export function IsuProvinsi() {
  const [kategori, setKategori] = useState('')
  const [klasifikasi, setKlasifikasi] = useState('')

  const terfilter = useMemo(
    () =>
      daftarIsuProvinsi.filter(
        (isu) => (!kategori || isu.kategori === kategori) && (!klasifikasi || isu.klasifikasi === klasifikasi),
      ),
    [kategori, klasifikasi],
  )

  // Kategori dari isu Provinsi yang lolos filter (kategori/klasifikasi), dipakai
  // untuk menarik berita riil yang sepadan agar grafik tren & sentimen konsisten dengan
  // rentang tanggal data asli (bukan tanggal isu yang jarang/tidak merata).
  const kategoriTerfilter = useMemo(() => new Set(terfilter.map((isu) => isu.kategori)), [terfilter])

  const beritaTerfilter = useMemo(
    () => daftarBerita.filter((b) => !b.entitasTerkait && kategoriTerfilter.has(b.kategori)),
    [kategoriTerfilter],
  )

  const rentangTanggalData = useMemo(() => {
    const semuaTanggal = daftarBerita.map((b) => b.tanggal).sort()
    return { min: semuaTanggal[0], max: semuaTanggal[semuaTanggal.length - 1] }
  }, [])

  const volumeSentimen = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of beritaTerfilter) map.set(b.sentimen, (map.get(b.sentimen) ?? 0) + 1)
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [beritaTerfilter])

  const trenMingguan = useMemo(
    () =>
      hitungPerHariRange(
        beritaTerfilter.map((b) => ({ tanggal: b.tanggal })),
        rentangTanggalData.min,
        rentangTanggalData.max,
      ),
    [beritaTerfilter, rentangTanggalData],
  )

  const mediaShare = useMemo(() => {
    const map = new Map<string, number>()
    for (const isu of terfilter) {
      for (const sumber of isu.sumberUtama) {
        map.set(sumber, (map.get(sumber) ?? 0) + 1)
      }
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [terfilter])

  const eksposMedia = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of beritaTerfilter) map.set(b.sumber, (map.get(b.sumber) ?? 0) + 1)
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [beritaTerfilter])

  const top5Isu = useMemo(
    () =>
      [...terfilter]
        .sort((a, b) => b.jumlahBerita - a.jumlahBerita)
        .slice(0, 5)
        .map((isu) => ({ name: isu.namaIsu, value: isu.jumlahBerita })),
    [terfilter],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Isu Provinsi Papua"
        subtitle="Tren pemberitaan, sentimen, dan distribusi media untuk isu-isu tingkat provinsi."
      />

      <Card className="p-5">
        <div className="flex flex-wrap gap-3">
          <FilterSelect label="Kategori Isu" value={kategori} options={daftarKategoriIsu} onChange={setKategori} />
          <FilterSelect label="Klasifikasi" value={klasifikasi} options={semuaKlasifikasi} onChange={setKlasifikasi} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Grafik Tren" subtitle="Jumlah berita per hari (sesuai filter)" />
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trenMingguan} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <AreaGradient id="provTren" color={chart.accent} />
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
                  fill="url(#provTren)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Volume Sentimen" subtitle="Distribusi berita per sentimen" />
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={volumeSentimen} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={2} stroke="none">
                  {volumeSentimen.map((entry) => (
                    <Cell key={entry.name} fill={SENTIMEN_COLOR[entry.name]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend content={<ChartLegend />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader title="Top 5 Isu Provinsi Papua" subtitle="Berdasarkan jumlah berita/postingan" />
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={top5Isu} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid {...gridProps} horizontal={false} />
              <XAxis type="number" {...axisProps} allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={220} />
              <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
              <Bar dataKey="value" name="Berita" fill={chart.accent} radius={[0, 6, 6, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Media Share" subtitle="Distribusi sumber pemberitaan isu Provinsi (sesuai filter)" />
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={mediaShare} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={140} />
                <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                <Bar dataKey="value" name="Isu" fill={chart.gold} radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Ekspos Media" subtitle="Jumlah pemberitaan per nama media (sesuai filter)" />
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={eksposMedia} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={140} />
                <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                <Bar dataKey="value" name="Berita" fill={chart.accent} radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="p-5">
        <DataTable data={terfilter} columns={columns} searchPlaceholder="Cari nama isu, OPD..." />
      </Card>
    </div>
  )
}
