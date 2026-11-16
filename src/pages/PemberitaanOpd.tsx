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
        <text key={i} x={0} y={i * lineH - totalH / 2 + lineH * 0.5} textAnchor="end" fill="#64748b" fontSize={11}>
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
  beritaPapua.reduce((acc, b) => {
    if (!acc[b.judul]) acc[b.judul] = { jumlah: 0, negatif: 0 }
    acc[b.judul].jumlah++
    if (b.sentimen === 'Negatif') acc[b.judul].negatif++
    return acc
  }, {} as Record<string, { jumlah: number; negatif: number }>)
).map(([judul, { jumlah, negatif }]) => ({
  name: judul,
  jumlah,
  fill: jumlah > 0 && negatif / jumlah > 0.5 ? '#ef4444' : '#1e293b',
}))
  .sort((a, b) => b.jumlah - a.jumlah)
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
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Isu Dominan" />
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, puncakPemberitaanOpd.length * 48)}>
              <BarChart data={puncakPemberitaanOpd} layout="vertical" margin={{ left: 8, right: 40, top: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={160} tick={<WrapTick />} />
                <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                <Bar dataKey="jumlah" name="Berita" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {puncakPemberitaanOpd.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="jumlah" position="right" style={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="OPD Terpopuler" subtitle="Berdasarkan total berita/postingan" />
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(160, topPopuler.length * 44)}>
              <BarChart data={topPopuler} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={150} />
                <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                <Bar dataKey="value" name="Berita" fill={chart.accent} radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {topNarasumberOpd.length > 0 && (
          <Card>
            <CardHeader title="Narasumber" />
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

        <Card>
          <CardHeader title="Ekspos Media" />
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, eksposMediaOpd.length * 36)}>
              <BarChart data={eksposMediaOpd} layout="vertical" margin={{ left: 8, right: 12, top: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={150} />
                <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                <Bar dataKey="value" name="Berita" fill={chart.accent} radius={[0, 6, 6, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4">
          <FilterSelect label="Drill-down per OPD" value={opd} options={daftarOpd} onChange={setOpd} />
        </div>
        <DataTable data={isuTerfilter} columns={isuColumns} searchPlaceholder="Cari nama isu..." />
      </Card>
    </div>
  )
}
