import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DataTable } from '@/components/DataTable'
import { FilterSelect } from '@/components/FilterSelect'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { KlasifikasiBadge } from '@/components/ui/Badge'
import { axisProps, ChartTooltip, chart, cursorFill, gridProps } from '@/lib/chartTheme'
import { daftarIsu, daftarOpd, daftarRankingOpd } from '@/data/mockData'
import type { Isu, RankingOpd } from '@/types'

const rankingColumns: ColumnDef<RankingOpd, any>[] = [
  { accessorKey: 'opd', header: 'OPD' },
  {
    accessorKey: 'jumlahBerita',
    header: 'Total Berita',
    cell: (info) => <span className="tabular-nums">{info.getValue<number>()}</span>,
  },
  {
    accessorKey: 'jumlahPositif',
    header: 'Isu Positif',
    cell: (info) => <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{info.getValue<number>()}</span>,
  },
  {
    accessorKey: 'jumlahNegatif',
    header: 'Isu Negatif/Potensi Negatif',
    cell: (info) => <span className="tabular-nums text-rose-600 dark:text-rose-400">{info.getValue<number>()}</span>,
  },
]

const isuColumns: ColumnDef<Isu, any>[] = [
  {
    accessorKey: 'namaIsu',
    header: 'Nama Isu',
    cell: (info) => (
      <div className="max-w-sm">
        <p className="font-medium text-slate-800 dark:text-slate-100">{info.getValue<string>()}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{info.row.original.scope}</p>
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
    accessorKey: 'jumlahBerita',
    header: 'Jml Berita',
    cell: (info) => <span className="tabular-nums">{info.getValue<number>()}</span>,
  },
]

export function PemberitaanOpd() {
  const [opd, setOpd] = useState('')

  const topPopuler = useMemo(
    () =>
      [...daftarRankingOpd]
        .sort((a, b) => b.jumlahBerita - a.jumlahBerita)
        .slice(0, 8)
        .map((r) => ({ name: r.opd.replace('Dinas ', ''), value: r.jumlahBerita })),
    [],
  )

  const topNegatif = useMemo(
    () =>
      [...daftarRankingOpd]
        .sort((a, b) => b.jumlahNegatif - a.jumlahNegatif)
        .slice(0, 8)
        .map((r) => ({ name: r.opd.replace('Dinas ', ''), value: r.jumlahNegatif })),
    [],
  )

  const isuTerfilter = useMemo(() => (opd ? daftarIsu.filter((isu) => isu.opd === opd) : daftarIsu), [opd])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pemberitaan OPD"
        subtitle="Monitoring isu dan kinerja publikasi setiap Organisasi Perangkat Daerah — ranking OPD terpopuler dan OPD paling banyak diberitakan negatif."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="OPD Terpopuler" subtitle="Berdasarkan total berita/postingan" />
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topPopuler} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={150} />
                <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                <Bar dataKey="value" name="Berita" fill={chart.accent} radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="OPD Paling Banyak Diberitakan Negatif" subtitle="Isu Negatif + Potensi Negatif" />
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topNegatif} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={150} />
                <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                <Bar dataKey="value" name="Isu negatif" fill={chart.negative} radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="p-5">
        <DataTable data={daftarRankingOpd} columns={rankingColumns} searchPlaceholder="Cari OPD..." />
      </Card>

      <Card className="p-5">
        <div className="mb-4">
          <FilterSelect label="Drill-down per OPD" value={opd} options={daftarOpd} onChange={setOpd} />
        </div>
        <DataTable data={isuTerfilter} columns={isuColumns} searchPlaceholder="Cari nama isu..." />
      </Card>
    </div>
  )
}
