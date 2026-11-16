import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DataTable } from '@/components/DataTable'
import { FilterSelect } from '@/components/FilterSelect'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { PageHeader, SectionLabel } from '@/components/ui/PageHeader'
import { axisProps, ChartTooltip, chart, cursorFill, gridProps } from '@/lib/chartTheme'
import { daftarNarasumber, daftarOpd } from '@/data/mockData'
import { useBerita } from '@/lib/beritaStore'
import type { BeritaRaw, FramingKinerja, StatusDuplikasi } from '@/types'

// ── Komponen tick kustom ────────────────────────────────────────────────────

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

// ── Kolom tabel berita per OPD ──────────────────────────────────────────────

const FRAMING_COLOR: Record<string, string> = {
  'Respons': 'bg-blue-50 text-blue-700',
  'Sosialisasi': 'bg-teal-50 text-teal-700',
  'Seremoni': 'bg-purple-50 text-purple-700',
  'Klarifikasi': 'bg-amber-50 text-amber-700',
  'Program/Kinerja': 'bg-emerald-50 text-emerald-700',
  'Isu Terhubung': 'bg-orange-50 text-orange-700',
  'Hal Terhubung': 'bg-slate-100 text-slate-600',
  'Seremoni Pasif': 'bg-violet-50 text-violet-700',
}

const SENTIMEN_KURASI_COLOR: Record<string, string> = {
  'Positif': 'bg-emerald-100 text-emerald-700',
  'Negatif': 'bg-red-100 text-red-700',
  'Potensi Negatif': 'bg-amber-100 text-amber-700',
  'Netral': 'bg-slate-100 text-slate-600',
}

const beritaOpdColumns: ColumnDef<BeritaRaw, any>[] = [
  {
    accessorKey: 'tanggal',
    header: 'Tanggal',
    cell: (info) => <span className="whitespace-nowrap tabular-nums text-xs text-slate-500">{info.getValue<string>()}</span>,
  },
  {
    accessorKey: 'judul',
    header: 'Judul',
    cell: (info) => {
      const b = info.row.original as BeritaRaw & { framing_kinerja?: FramingKinerja; status_duplikasi?: StatusDuplikasi; sentimen_kurasi?: string }
      const sentKurasi = b.sentimen_kurasi
      const framing = b.framing_kinerja
      const dupStatus = b.status_duplikasi
      return (
        <div className="max-w-xs space-y-1">
          <p className="font-medium text-slate-800 text-sm leading-snug">{info.getValue<string>()}</p>
          <p className="text-xs text-slate-400">{b.sumber}</p>
          <div className="flex flex-wrap gap-1">
            {sentKurasi && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SENTIMEN_KURASI_COLOR[sentKurasi] ?? 'bg-slate-100 text-slate-600'}`}>
                {sentKurasi}
              </span>
            )}
            {framing && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${FRAMING_COLOR[framing] ?? 'bg-slate-100 text-slate-600'}`}>
                {framing}
              </span>
            )}
            {dupStatus && dupStatus !== 'Unik' && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                {dupStatus}
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
      <a
        href={info.getValue<string>()}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-primary hover:underline"
      >
        Buka ↗
      </a>
    ),
  },
]

// ── Daftar pilihan filter status duplikasi ──────────────────────────────────
const DUPLIKASI_OPTIONS: StatusDuplikasi[] = ['Unik', 'Pengulangan Berita', 'Potensi Duplikat']

// ── Komponen utama ──────────────────────────────────────────────────────────

export function PemberitaanOpd() {
  const { berita: semuaBerita } = useBerita()
  const [opdFilter, setOpdFilter] = useState('')
  const [duplikasiFilter, setDuplikasiFilter] = useState('')

  // ── Berita yang bukan milik pimpinan (OPD scope) ─────────────────────────
  const beritaOpd = useMemo(
    () => semuaBerita.filter((b) => !b.entitasTerkait || (b.entitasTerkait !== 'Gubernur' && b.entitasTerkait !== 'Wakil Gubernur')),
    [semuaBerita],
  )

  // ── Apakah ada data kurasi AI ─────────────────────────────────────────────
  const adaKurasi = useMemo(
    () => beritaOpd.some((b) => !!(b as any).framing_kinerja),
    [beritaOpd],
  )

  // ── Chart: Isu Dominan (top 10 judul terbanyak) ──────────────────────────
  const puncakPemberitaan = useMemo(() => {
    const map = new Map<string, { jumlah: number; negatif: number }>()
    for (const b of beritaOpd) {
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
  }, [beritaOpd])

  // ── Chart: Ekspos Media (top 10 media/sumber) ────────────────────────────
  const eksposMedia = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of beritaOpd) {
      map.set(b.sumber, (map.get(b.sumber) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [beritaOpd])

  // ── Chart: Narasumber (dari mockData keyword matching) ───────────────────
  const topNarasumber = useMemo(
    () =>
      daftarNarasumber
        .map(({ nama, jabatan, kunci }) => ({
          label: `${nama}||${jabatan}`,
          jumlah: beritaOpd.filter((b) => kunci.some((k) => b.judul.includes(k))).length,
        }))
        .filter((n) => n.jumlah > 0)
        .sort((a, b) => b.jumlah - a.jumlah),
    [beritaOpd],
  )

  // ── Chart: Framing Kinerja (hanya jika ada kurasi AI) ───────────────────
  const framingKinerja = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of beritaOpd) {
      const f = (b as any).framing_kinerja as string | undefined
      if (f && f.trim()) map.set(f.trim(), (map.get(f.trim()) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [beritaOpd])

  // ── Tabel Drill-down: berita difilter per OPD + duplikasi ────────────────
  // Deteksi OPD dari field kategori (KATEGORI_OPD_MAP) atau keyword di judul
  const KATEGORI_OPD_MAP: Record<string, string> = {
    'Ekonomi, Keuangan & Industri': 'Dinas Perindustrian dan Energi',
    'Infrastruktur': 'Dinas Pekerjaan Umum',
    'Administrasi & Pemerintahan': 'Sekretariat Daerah Provinsi Papua',
    'Politik & Kebijakan': 'Sekretariat Daerah Provinsi Papua',
    'Kesehatan': 'Dinas Kesehatan',
    'Kebencanaan': 'Dinas Pekerjaan Umum',
    'Hukum & HAM': 'Sekretariat Daerah Provinsi Papua',
    'Koperasi & UMKM': 'Dinas Perindustrian dan Energi',
    'Sosial, Budaya & Pariwisata': 'Dinas Pariwisata dan Ekonomi Kreatif',
    'Energi, SDA & Lingkungan': 'Dinas Lingkungan Hidup',
    'Pendidikan & IPTEK': 'Dinas Pendidikan',
    'Agro-Maritim': 'Dinas Ketahanan Pangan, Kelautan dan Pertanian',
    'Pemuda & Olahraga': 'Dinas Sosial',
    'Ketenagakerjaan': 'Dinas Perindustrian dan Energi',
    'Pertahanan & Ideologi': 'Satuan Polisi Pamong Praja',
    'Perhubungan': 'Dinas Perhubungan',
    'Pemilu & Politik Praktis': 'Sekretariat Daerah Provinsi Papua',
    'Agraria dan Tata Ruang': 'Dinas Pekerjaan Umum',
    'Kependudukan': 'Dinas Komunikasi dan Informatika',
    'Pemberdayaan Perempuan & Perlindungan Anak': 'Dinas Sosial',
    'Pembangunan Desa': 'Pemerintah Kabupaten/Kota',
  }

  const beritaDrilldown = useMemo(() => {
    return beritaOpd.filter((b) => {
      // Filter OPD berdasarkan mapping kategori
      if (opdFilter) {
        const opdDariKategori = KATEGORI_OPD_MAP[b.kategori]
        if (opdDariKategori !== opdFilter) return false
      }
      // Filter status duplikasi
      if (duplikasiFilter) {
        const dup = (b as any).status_duplikasi as string | undefined
        if ((dup ?? 'Unik') !== duplikasiFilter) return false
      }
      return true
    })
  }, [beritaOpd, opdFilter, duplikasiFilter])

  // ── OPD terpopuler (dari mapping kategori) ───────────────────────────────
  const opdPopuler = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of beritaOpd) {
      const opd = KATEGORI_OPD_MAP[b.kategori]
      if (opd) map.set(opd, (map.get(opd) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name: name.replace('Dinas ', '').replace('Satuan Polisi Pamong Praja', 'Satpol PP'), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [beritaOpd])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pemberitaan OPD"
        subtitle={`${beritaOpd.length} berita terkait OPD & tata kelola pemerintahan`}
      />

      {/* ── Baris chart utama ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Isu Dominan" subtitle="Top 10 judul/topik terbanyak" />
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, puncakPemberitaan.length * 48)}>
              <BarChart data={puncakPemberitaan} layout="vertical" margin={{ left: 8, right: 40, top: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={160} tick={<WrapTick />} />
                <Tooltip content={<ChartTooltip />} cursor={cursorFill} />
                <Bar dataKey="jumlah" name="Berita" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {puncakPemberitaan.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="jumlah" position="right" style={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="OPD Terpopuler" subtitle="Berdasarkan mapping kategori berita" />
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(160, opdPopuler.length * 44)}>
              <BarChart data={opdPopuler} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
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

      {/* ── Narasumber & Ekspos Media ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {topNarasumber.length > 0 && (
          <Card>
            <CardHeader title="Narasumber" subtitle="Pejabat OPD yang dikutip media" />
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
          <CardHeader title="Ekspos Media" subtitle="Top 10 media berdasarkan jumlah berita OPD" />
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, eksposMedia.length * 36)}>
              <BarChart data={eksposMedia} layout="vertical" margin={{ left: 8, right: 12, top: 0, bottom: 0 }}>
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

      {/* ── Framing Kinerja (hanya jika ada data kurasi AI) ─────────────── */}
      {adaKurasi && framingKinerja.length > 0 && (
        <section>
          <SectionLabel hint="dari kurasi AI">Framing Kinerja OPD</SectionLabel>
          <Card>
            <CardHeader
              title="Distribusi Framing Kinerja"
              subtitle="Bagaimana media membingkai liputan OPD"
            />
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
        </section>
      )}

      {/* ── Drill-down: Daftar Berita per OPD ────────────────────────────── */}
      <section>
        <SectionLabel>Drill-down Berita per OPD</SectionLabel>
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap gap-3">
            <FilterSelect
              label="Filter OPD"
              value={opdFilter}
              options={daftarOpd}
              onChange={setOpdFilter}
            />
            {adaKurasi && (
              <FilterSelect
                label="Status Duplikasi"
                value={duplikasiFilter}
                options={DUPLIKASI_OPTIONS}
                onChange={setDuplikasiFilter}
              />
            )}
          </div>
          <DataTable
            data={beritaDrilldown}
            columns={beritaOpdColumns}
            searchPlaceholder="Cari judul berita..."
          />
        </Card>
      </section>
    </div>
  )
}
