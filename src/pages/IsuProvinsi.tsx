import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
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
import { DataTable } from '@/components/DataTable'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { FilterSelect } from '@/components/FilterSelect'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { PageHeader, SectionLabel } from '@/components/ui/PageHeader'
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
import { daftarJenisSumber, daftarKategoriIsu, daftarNarasumber, daftarOpd, KATEGORI_OPD_MAP } from '@/data/mockData'
import { getJenisSumber } from '@/lib/utils'
import { useBerita, isProvinsi } from '@/lib/beritaStore'
import type { BeritaRaw, FramingKinerja, KategoriIsu } from '@/types'

const FRAMING_COLOR: Record<string, string> = {
  'Respons': 'bg-blue-50 text-blue-700',
  'Sosialisasi': 'bg-teal-50 text-teal-700',
  'Seremoni': 'bg-purple-50 text-purple-700',
  'Klarifikasi': 'bg-amber-50 text-amber-700',
  'Program/Kinerja': 'bg-emerald-50 text-emerald-700',
  'Isu Terhubung': 'bg-orange-50 text-orange-700',
  'Seremoni Pasif': 'bg-violet-50 text-violet-700',
}

const SENTIMEN_KURASI_COLOR: Record<string, string> = {
  'Positif': 'bg-emerald-100 text-emerald-700',
  'Negatif': 'bg-red-100 text-red-700',
  'Potensi Negatif': 'bg-amber-100 text-amber-700',
  'Netral': 'bg-slate-100 text-slate-600',
}

const columns: ColumnDef<BeritaRaw, any>[] = [
  {
    accessorKey: 'tanggal',
    header: 'Tanggal',
    cell: (info) => <span className="whitespace-nowrap tabular-nums text-xs text-slate-500">{info.getValue<string>()}</span>,
  },
  {
    accessorKey: 'judul',
    header: 'Judul',
    cell: (info) => {
      const b = info.row.original as BeritaRaw & { framing_kinerja?: FramingKinerja; sentimen_kurasi?: string }
      return (
        <div className="max-w-xs space-y-1">
          <p className="font-medium text-slate-800 text-sm leading-snug">{info.getValue<string>()}</p>
          <p className="text-xs text-slate-400">{b.sumber} · {b.kategori}</p>
          <div className="flex flex-wrap gap-1">
            {b.sentimen_kurasi && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SENTIMEN_KURASI_COLOR[b.sentimen_kurasi] ?? 'bg-slate-100 text-slate-600'}`}>
                {b.sentimen_kurasi}
              </span>
            )}
            {b.framing_kinerja && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${FRAMING_COLOR[b.framing_kinerja] ?? 'bg-slate-100 text-slate-600'}`}>
                {b.framing_kinerja}
              </span>
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'sentimen',
    header: 'Sentimen',
    cell: (info) => {
      const val = info.getValue<string>()
      const colorMap: Record<string, string> = {
        Positif: 'text-emerald-600',
        Negatif: 'text-red-600',
        Netral: 'text-slate-500',
        'Potensi Negatif': 'text-amber-600',
      }
      return <span className={`text-xs font-semibold ${colorMap[val] ?? 'text-slate-500'}`}>{val}</span>
    },
  },
  {
    id: 'framing_kinerja',
    accessorFn: (row) => (row as any).framing_kinerja ?? '',
    header: 'Framing Kinerja',
    cell: (info) => {
      const val = info.getValue<string>()
      if (!val) return <span className="text-xs text-slate-300">—</span>
      return (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${FRAMING_COLOR[val] ?? 'bg-slate-100 text-slate-600'}`}>
          {val}
        </span>
      )
    },
  },
  {
    accessorKey: 'url',
    header: '',
    cell: (info) => (
      <a href={info.getValue<string>()} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
        Buka ↗
      </a>
    ),
  },
]

export function IsuProvinsi() {
  const { berita: semuaBerita } = useBerita()
  const [kategori, setKategori] = useState('')
  const [jenisSumber, setJenisSumber] = useState('')
  const [opdFilter, setOpdFilter] = useState('')
  const [isuDominanDipilih, setIsuDominanDipilih] = useState<string | null>(null)
  const [dariTanggal, setDariTanggal] = useState('')
  const [sampaiTanggal, setSampaiTanggal] = useState('')

  // Berita tingkat provinsi (bukan entitas pimpinan)
  const beritaProvinsi = useMemo(
    () => semuaBerita.filter((b) => isProvinsi(b)),
    [semuaBerita],
  )

  const adaKurasi = useMemo(
    () => beritaProvinsi.some((b) => !!(b as any).framing_kinerja),
    [beritaProvinsi],
  )

  // Berita dengan filter aktif (grafik)
  const beritaTerfilter = useMemo(
    () =>
      beritaProvinsi.filter(
        (b) =>
          (!kategori || b.kategori === kategori) &&
          (!jenisSumber || getJenisSumber(b.sumber) === jenisSumber) &&
          (!dariTanggal || b.tanggal >= dariTanggal) &&
          (!sampaiTanggal || b.tanggal <= sampaiTanggal),
      ),
    [beritaProvinsi, kategori, jenisSumber, dariTanggal, sampaiTanggal],
  )

  // Daftar berita drill-down: filter tambahan dari klik Isu Dominan + OPD
  const beritaDrilldown = useMemo(
    () =>
      beritaTerfilter.filter((b) => {
        if (isuDominanDipilih && b.judul !== isuDominanDipilih) return false
        if (opdFilter && KATEGORI_OPD_MAP[b.kategori as KategoriIsu] !== opdFilter) return false
        return true
      }),
    [beritaTerfilter, isuDominanDipilih, opdFilter],
  )

  const rentangTanggalData = useMemo(() => {
    const semuaTanggal = beritaProvinsi.map((b) => b.tanggal).sort()
    return { min: semuaTanggal[0] ?? '', max: semuaTanggal[semuaTanggal.length - 1] ?? '' }
  }, [beritaProvinsi])

  const volumeSentimen = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of beritaTerfilter) map.set(b.sentimen, (map.get(b.sentimen) ?? 0) + 1)
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [beritaTerfilter])

  const trenMingguan = useMemo(
    () =>
      rentangTanggalData.min
        ? hitungPerHariRange(
            beritaTerfilter.map((b) => ({ tanggal: b.tanggal })),
            rentangTanggalData.min,
            rentangTanggalData.max,
          )
        : [],
    [beritaTerfilter, rentangTanggalData],
  )

  const eksposMedia = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of beritaTerfilter) map.set(b.sumber, (map.get(b.sumber) ?? 0) + 1)
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [beritaTerfilter])

  // Isu Dominan: top 10 judul terbanyak dari data aktual
  const puncakPemberitaan = useMemo(() => {
    const map = new Map<string, { jumlah: number; negatif: number }>()
    for (const b of beritaTerfilter) {
      const e = map.get(b.judul) ?? { jumlah: 0, negatif: 0 }
      e.jumlah++
      if (b.sentimen === 'Negatif') e.negatif++
      map.set(b.judul, e)
    }
    return Array.from(map.entries())
      .map(([judul, { jumlah, negatif }]) => ({
        name: judul,
        jumlah,
        fill: jumlah > 0 && negatif / jumlah > 0.5 ? '#ef4444' : '#1e293b',
      }))
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 10)
  }, [beritaTerfilter])

  const topNarasumber = useMemo(
    () =>
      daftarNarasumber
        .map(({ nama, jabatan, kunci }) => ({
          label: `${nama}||${jabatan}`,
          jumlah: beritaTerfilter.filter((b) => kunci.some((k) => b.judul.includes(k))).length,
        }))
        .filter((n) => n.jumlah > 0)
        .sort((a, b) => b.jumlah - a.jumlah),
    [beritaTerfilter],
  )

  // Framing Kinerja (hanya jika ada kurasi AI)
  const framingKinerja = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of beritaTerfilter) {
      const f = (b as any).framing_kinerja as string | undefined
      if (f && f.trim()) map.set(f.trim(), (map.get(f.trim()) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [beritaTerfilter])

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Isu Provinsi Papua"
        subtitle="Tren pemberitaan, sentimen, dan distribusi media untuk isu-isu tingkat provinsi."
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect label="Kategori Isu" value={kategori} options={daftarKategoriIsu} onChange={setKategori} />
          <FilterSelect label="Jenis Sumber" value={jenisSumber} options={daftarJenisSumber} onChange={setJenisSumber} />
          <FilterSelect label="OPD" value={opdFilter} options={daftarOpd} onChange={setOpdFilter} />
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

      <div>
        <Card>
          <CardHeader
            title="Isu Dominan"
            subtitle={isuDominanDipilih ? 'Klik bar lain untuk ganti filter, klik lagi untuk reset' : 'Klik isu untuk lihat berita terkait di bawah'}
          />
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(260, puncakPemberitaan.length * 44)}>
              <BarChart data={puncakPemberitaan} layout="vertical" margin={{ left: 8, right: 48, top: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={160} tick={<WrapTick />} />
                <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                <Bar
                  dataKey="jumlah"
                  name="Berita"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={22}
                  style={{ cursor: 'pointer' }}
                  onClick={(data) => setIsuDominanDipilih((prev) => (prev === data.name ? null : data.name))}
                >
                  {puncakPemberitaan.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        isuDominanDipilih === null
                          ? entry.fill
                          : isuDominanDipilih === entry.name
                            ? entry.fill
                            : '#cbd5e1'
                      }
                    />
                  ))}
                  <LabelList dataKey="jumlah" position="right" style={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Ekspos Media" />
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(160, eksposMedia.length * 44)}>
              <BarChart data={eksposMedia} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={180} />
                <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                <Bar dataKey="value" name="Berita" fill={chart.accent} radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {topNarasumber.length > 0 && (
          <Card>
            <CardHeader title="Narasumber" />
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
      </div>

      {/* Framing Kinerja — hanya jika ada data kurasi AI */}
      {adaKurasi && framingKinerja.length > 0 && (
        <div>
          <SectionLabel hint="dari kurasi AI">Framing Kinerja</SectionLabel>
          <Card>
            <CardHeader title="Distribusi Framing Kinerja" subtitle="Bagaimana media membingkai liputan isu provinsi" />
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(180, framingKinerja.length * 44)}>
                <BarChart data={framingKinerja} layout="vertical" margin={{ left: 8, right: 48, top: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} horizontal={false} />
                  <XAxis type="number" {...axisProps} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" {...axisProps} width={140} />
                  <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                  <Bar dataKey="value" name="Berita" fill={chart.accent} radius={[0, 4, 4, 0]} maxBarSize={22}>
                    <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabel daftar berita aktual */}
      <div>
        <SectionLabel>Daftar Berita ({beritaDrilldown.length})</SectionLabel>
        {isuDominanDipilih && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary-soft px-3 py-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Filter isu:</span>
            <span className="flex-1 truncate text-xs font-medium text-primary">{isuDominanDipilih}</span>
            <button
              type="button"
              onClick={() => setIsuDominanDipilih(null)}
              className="shrink-0 rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              ✕ Reset
            </button>
          </div>
        )}
        <Card className="p-5">
          <DataTable data={beritaDrilldown} columns={columns} searchPlaceholder="Cari judul berita, media..." />
        </Card>
      </div>
    </div>
  )
}
