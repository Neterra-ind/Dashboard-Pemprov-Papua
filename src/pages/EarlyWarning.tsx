import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { FilterSelect } from '@/components/FilterSelect'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { KATEGORI_OPD_MAP, daftarJenisSumber } from '@/data/mockData'
import { useBerita, isRelevan } from '@/lib/beritaStore'
import { getJenisSumber } from '@/lib/utils'
import type { KategoriIsu } from '@/types'

const PAGE_SIZE = 10

export function EarlyWarning() {
  const { berita } = useBerita()
  const [jenisSumber, setJenisSumber] = useState('')
  const [dariTanggal, setDariTanggal] = useState('')
  const [sampaiTanggal, setSampaiTanggal] = useState('')
  const [page, setPage] = useState(1)

  const beritaNegatif = useMemo(
    () =>
      berita
        .filter((b) => {
          if (!isRelevan(b)) return false
          // Gunakan sentimen_kurasi (AI-verified) jika ada, fallback ke sentimen IMD
          const sentimenEfektif = (b as any).sentimen_kurasi || b.sentimen
          // "Potensi Negatif" juga wajib tampil di Early Warning — bukan hanya Negatif murni
          return sentimenEfektif === 'Negatif' || sentimenEfektif === 'Potensi Negatif'
        })
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    [berita],
  )

  const terfilter = useMemo(
    () =>
      beritaNegatif.filter((b) => {
        if (jenisSumber && getJenisSumber(b.sumber) !== jenisSumber) return false
        if (dariTanggal && b.tanggal < dariTanggal) return false
        if (sampaiTanggal && b.tanggal > sampaiTanggal) return false
        return true
      }),
    [beritaNegatif, jenisSumber, dariTanggal, sampaiTanggal],
  )

  useEffect(() => {
    setPage(1)
  }, [jenisSumber, dariTanggal, sampaiTanggal])

  const totalPage = Math.max(1, Math.ceil(terfilter.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPage)
  const sliced = terfilter.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Isu Negatif"
        subtitle="Berita negatif atau berpotensi negatif yang perlu direspons OPD."
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Jenis Sumber"
            value={jenisSumber}
            options={daftarJenisSumber}
            onChange={setJenisSumber}
          />
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
              className="self-end rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-500 hover:bg-slate-50"
            >
              Reset
            </button>
          )}
        </div>
      </Card>

      <Card>
        {terfilter.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
            Tidak ada berita negatif dengan filter saat ini.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="w-10 px-4 py-3">No</th>
                    <th className="w-24 px-4 py-3">Tanggal</th>
                    <th className="min-w-[220px] px-4 py-3">Judul</th>
                    <th className="min-w-[200px] px-4 py-3">Ringkasan</th>
                    <th className="w-44 px-4 py-3">Kewenangan OPD</th>
                    <th className="w-36 px-4 py-3">Sumber Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sliced.map((b, idx) => {
                    const nomor = (safePage - 1) * PAGE_SIZE + idx + 1
                    const opd = (b as any).opd || KATEGORI_OPD_MAP[b.kategori as KategoriIsu] || b.kategori
                    const tingkat = (b as any).sentimen_kurasi === 'Potensi Negatif' ? 'Potensi Negatif' : 'Negatif'
                    const isLink = !!b.url && b.url !== '#' && b.url.startsWith('http')
                    const ringkasan = b.isi
                      ? b.isi.length > 160
                        ? b.isi.slice(0, 160) + '…'
                        : b.isi
                      : '—'
                    return (
                      <tr
                        key={`${b.tanggal}-${b.judul}-${idx}`}
                        className="align-top transition-colors hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-3 font-medium tabular-nums text-slate-400">
                          {nomor}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                          {b.tanggal}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              tingkat === 'Potensi Negatif'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {tingkat}
                          </span>
                          <br />
                          {isLink ? (
                            <a
                              href={b.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold leading-snug text-slate-800 hover:text-primary hover:underline"
                            >
                              {b.judul}
                            </a>
                          ) : (
                            <span className="font-semibold leading-snug text-slate-800">
                              {b.judul}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs leading-relaxed text-slate-600">
                          {ringkasan}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-700">{opd}</td>
                        <td className="px-4 py-3">
                          {isLink ? (
                            <a
                              href={b.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              {b.sumber}
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500">{b.sumber}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPage > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                <span className="text-xs text-slate-500">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, terfilter.length)} dari{' '}
                  {terfilter.length} berita
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 text-xs font-medium text-slate-700">
                    {safePage} / {totalPage}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPage, p + 1))}
                    disabled={safePage === totalPage}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
