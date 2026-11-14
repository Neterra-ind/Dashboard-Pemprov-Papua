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
import { daftarIsuProvinsi, daftarKategoriIsu, semuaKlasifikasi } from '@/data/mockData'
import beritaPapuaRaw from '@/data/beritaPapua.json'
import type { Isu } from '@/types'

type BeritaRaw = {
  tanggal: string
  judul: string
  sumber: string
  sentimen: string
  url: string
  kategori: string
  entitasTerkait?: string
}

const beritaPapua = beritaPapuaRaw as BeritaRaw[]

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

  // Tabel isu tetap pakai mock (untuk klasifikasi, trend, OPD)
  const terfilter = useMemo(
    () =>
      daftarIsuProvinsi.filter(
        (isu) => (!kategori || isu.kategori === kategori) && (!klasifikasi || isu.klasifikasi === klasifikasi),
      ),
    [kategori, klasifikasi],
  )

  // Semua grafik memakai data nyata dari beritaPapua.json
  const beritaTerfilter = useMemo(
    () =>
      beritaPapua.filter(
        (b) => !b.entitasTerkait && (!kategori || b.kategori === kategori),
      ),
    [kategori],
  )

  const rentangTanggalData = useMemo(() => {
    const semuaTanggal = beritaPapua.map((b) => b.tanggal).sort()
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

  // Ekspos media: jumlah berita per nama media (dari data nyata)
  const eksposMedia = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of beritaTerfilter) map.set(b.sumber, (map.get(b.sumber) ?? 0) + 1)
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [beritaTerfilter])

  // Top 5 kategori dari data nyata
  const top5Isu = useMemo(() => {
    const src = beritaPapua.filter((b) => !b.entitasTerkait && (!kategori || b.kategori === kategori))
    const map = new Map<string, number>()
    for (const b of src) map.set(b.kategori, (map.get(b.kategori) ?? 0) + 1)
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [kategori])

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
        <CardHeader title="Top 5 Kategori Isu Provinsi Papua" subtitle="Jumlah berita/postingan per kategori isu" />
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={top5Isu} layout="vertical" margin={{ left: 8, right: 24 }}>
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
        <CardHeader title="Ekspos Media" subtitle="Top 10 media yang paling banyak memberitakan (sesuai filter kategori)" />
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={eksposMedia} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid {...gridProps} horizontal={false} />
              <XAxis type="number" {...axisProps} allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={180} />
              <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
              <Bar dataKey="value" name="Berita" fill={chart.accent} radius={[0, 6, 6, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="p-5">
        <DataTable data={terfilter} columns={columns} searchPlaceholder="Cari nama isu, OPD..." />
      </Card>
    </div>
  )
}
