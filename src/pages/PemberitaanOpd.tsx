import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DataTable } from '@/components/DataTable'
import { FilterSelect } from '@/components/FilterSelect'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { KlasifikasiBadge } from '@/components/ui/Badge'
import { axisProps, ChartTooltip, chart, cursorFill, gridProps } from '@/lib/chartTheme'
import { daftarIsu, daftarNarasumber, daftarOpd, daftarRankingOpd } from '@/data/mockData'
import type { Isu, RankingOpd } from '@/types'
import beritaPapuaRaw from '@/data/beritaPapua.json'

type BeritaRaw = { tanggal: string; judul: string; sumber: string; sentimen: string; url: string; kategori: string; entitasTerkait?: string }
const beritaPapua = beritaPapuaRaw as BeritaRaw[]

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

function NameJabatanTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const parts = (payload?.value ?? '||').split('||')
  const nama = parts[0]
  const jabatan = parts[1] ?? ''
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={-4} textAnchor="end" fill="#1e293b" fontSize={11} fontWeight={600}>{nama}</text>
      <text x={0} y={9} textAnchor="end" fill="#94a3b8" fontSize={10}>{jabatan}</text>
    </g>
  )
}

const eksposMediaOpd = Object.entries(
  beritaPapua.reduce((acc, b) => { acc[b.sumber] = (acc[b.sumber] || 0) + 1; return acc }, {} as Record<string, number>)
).map(([name, value]) => ({ name, value }))
  .sort((a, b) => b.value - a.value)
  .slice(0, 10)

const puncakPemberitaanOpd = Object.entries(
  beritaPapua.reduce((acc, b) => { acc[b.tanggal] = (acc[b.tanggal] || 0) + 1; return acc }, {} as Record<string, number>)
).map(([name, value]) => ({ name, value }))
  .sort((a, b) => b.value - a.value)
  .slice(0, 10)

const topNarasumberOpd = daftarNarasumber
  .map(({ nama, jabatan, kunci }) => ({
    label: `${nama}||${jabatan}`,
    jumlah: beritaPapua.filter(b => !b.entitasTerkait && kunci.some(k => b.judul.includes(k))).length,
  }))
  .filter(n => n.jumlah > 0)
  .sort((a, b) => b.jumlah - a.jumlah)

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
            <ResponsiveContainer width="100%" height={Math.max(160, topPopuler.length * 44)}>
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
            <ResponsiveContainer width="100%" height={Math.max(160, topNegatif.length * 44)}>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Ekspos Media" subtitle="Jumlah pemberitaan per nama media" />
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, eksposMediaOpd.length * 36)}>
              <BarChart data={eksposMediaOpd} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={120} />
                <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                <Bar dataKey="value" name="Berita" fill={chart.accent} radius={[0, 6, 6, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Puncak Pemberitaan" subtitle="Tanggal dengan volume berita tertinggi" />
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, puncakPemberitaanOpd.length * 44)}>
              <BarChart data={puncakPemberitaanOpd} layout="vertical" margin={{ left: 8, right: 48 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={80} />
                <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                <Bar dataKey="value" name="Berita" fill={chart.accent} radius={[0, 6, 6, 0]} maxBarSize={22}>
                  <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {topNarasumberOpd.length > 0 && (
        <Card>
          <CardHeader title="Narasumber Aktif" subtitle="Tokoh/pejabat yang paling banyak disebut dalam berita OPD" />
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(160, topNarasumberOpd.length * 52)}>
              <BarChart data={topNarasumberOpd} layout="vertical" margin={{ left: 8, right: 48, top: 0, bottom: 0 }}>
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
