import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ExternalLink, RefreshCw, Rss } from 'lucide-react'
import { DataTable } from '@/components/DataTable'
import { FilterSelect } from '@/components/FilterSelect'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { PlatformBadge } from '@/components/PlatformBadge'
import { SentimenBadge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useRole } from '@/lib/role'
import { getJenisSumber } from '@/lib/utils'
import { daftarJenisSumber, daftarKategoriIsu } from '@/data/mockData'
import type { BeritaRaw } from '@/types'
import { useBerita } from '@/lib/beritaStore'

const SUMBER_AKTIF = [{ nama: 'Media Online (RSS/API)', tipe: 'Otomatis', interval: '15 menit', icon: Rss }]

const DUPLIKASI_OPTIONS = ['Unik', 'Pengulangan Berita', 'Potensi Duplikat']

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

export function DataSumber() {
  const { role } = useRole()
  const { berita: beritaPapua } = useBerita()
  const [jenisSumber, setJenisSumber] = useState('')
  const [kategori, setKategori] = useState('')
  const [duplikasiFilter, setDuplikasiFilter] = useState('')
  const [dariTanggal, setDariTanggal] = useState('')
  const [sampaiTanggal, setSampaiTanggal] = useState('')

  const adaKurasi = useMemo(
    () => beritaPapua.some((b) => !!(b as any).framing_kinerja),
    [beritaPapua],
  )

  const filtered = useMemo(() => {
    return beritaPapua.filter(
      (b) =>
        (!jenisSumber || getJenisSumber(b.sumber) === jenisSumber) &&
        (!kategori || b.kategori === kategori) &&
        (!duplikasiFilter || (b as any).status_duplikasi === duplikasiFilter) &&
        (!dariTanggal || b.tanggal >= dariTanggal) &&
        (!sampaiTanggal || b.tanggal <= sampaiTanggal),
    )
  }, [beritaPapua, jenisSumber, kategori, duplikasiFilter, dariTanggal, sampaiTanggal])

  const columns = useMemo<ColumnDef<BeritaRaw, any>[]>(
    () => [
      {
        accessorKey: 'tanggal',
        header: 'Tanggal',
        cell: (info) => <span className="whitespace-nowrap text-xs text-slate-500">{info.getValue<string>()}</span>,
      },
      {
        accessorKey: 'judul',
        header: 'Judul',
        cell: (info) => {
          const row = info.row.original
          const sentKurasi = (row as any).sentimen_kurasi as string | undefined
          const framing = (row as any).framing_kinerja as string | undefined
          const duplikasi = (row as any).status_duplikasi as string | undefined
          return (
            <div className="max-w-md">
              <a
                href={row.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-start gap-1 font-medium text-slate-800 hover:underline dark:text-slate-100"
              >
                <span>{info.getValue<string>()}</span>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              </a>
              <p className="mt-0.5 text-xs text-slate-500">{row.sumber}</p>
              {(sentKurasi || framing || duplikasi) && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {sentKurasi && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SENTIMEN_KURASI_COLOR[sentKurasi] ?? 'bg-slate-100 text-slate-600'}`}>
                      {sentKurasi}
                    </span>
                  )}
                  {framing && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${FRAMING_COLOR[framing] ?? 'bg-slate-100 text-slate-600'}`}>
                      {framing}
                    </span>
                  )}
                  {duplikasi && duplikasi !== 'Unik' && (
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                      {duplikasi}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        },
      },
      {
        id: 'jenisSumber',
        accessorFn: (row) => getJenisSumber(row.sumber),
        header: 'Jenis Sumber',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <PlatformBadge platform={info.getValue()} size="sm" />
            <span className="text-xs">{info.getValue<string>()}</span>
          </div>
        ),
      },
      { accessorKey: 'kategori', header: 'Kategori', cell: (info) => <span className="text-xs">{info.getValue<string>()}</span> },
      {
        accessorKey: 'sentimen',
        header: 'Sentimen',
        cell: (info) => <SentimenBadge value={info.getValue()} />,
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Sumber"
        subtitle="Semua berita dan postingan yang masuk ke sistem monitoring"
      />

      {role === 'Super Admin' && (
        <Card>
          <CardHeader
            title="Manajemen Sumber Data"
            subtitle="Status koneksi sumber data yang aktif dipantau sistem"
          />
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SUMBER_AKTIF.map((s) => (
              <div key={s.nama} className="rounded-xl border border-[var(--color-border)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <s.icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold text-slate-800">{s.nama}</span>
                </div>
                <p className="text-xs text-slate-500">{s.tipe}</p>
                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-positive">
                  <RefreshCw className="h-3 w-3" /> Refresh setiap {s.interval}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect label="Jenis Sumber" value={jenisSumber} options={daftarJenisSumber} onChange={setJenisSumber} />
          <FilterSelect label="Kategori" value={kategori} options={daftarKategoriIsu} onChange={setKategori} />
          {adaKurasi && (
            <FilterSelect
              label="Status Duplikasi"
              value={duplikasiFilter}
              options={DUPLIKASI_OPTIONS}
              onChange={setDuplikasiFilter}
            />
          )}
          <DateRangeFilter
            dari={dariTanggal}
            sampai={sampaiTanggal}
            onDariChange={setDariTanggal}
            onSampaiChange={setSampaiTanggal}
          />
          {(dariTanggal || sampaiTanggal) && (
            <button
              type="button"
              onClick={() => {
                setDariTanggal('')
                setSampaiTanggal('')
              }}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Reset Tanggal
            </button>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <DataTable data={filtered} columns={columns} searchPlaceholder="Cari judul, media, kategori..." />
      </Card>
    </div>
  )
}
