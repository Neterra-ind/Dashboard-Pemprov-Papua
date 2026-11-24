import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ClipboardCheck } from 'lucide-react'
import { FilterSelect } from '@/components/FilterSelect'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/Badge'
import { useRole } from '@/lib/role'
import { useDisposisi } from '@/lib/store'
import { daftarOpd } from '@/data/mockData'
import { cariIsuById, useIsuEngine } from '@/lib/isuEngine'
import type { StatusPenanganan, TindakLanjut as TindakLanjutType } from '@/types'

function FormTindakLanjut({ item }: { item: TindakLanjutType }) {
  const { updateTindakLanjut } = useDisposisi()
  const [status, setStatus] = useState<StatusPenanganan>(
    item.status === 'Didisposisikan' ? 'Diproses' : item.status,
  )
  const [catatan, setCatatan] = useState(item.catatanTindakLanjut ?? '')
  const [tersimpan, setTersimpan] = useState(false)

  function simpan() {
    updateTindakLanjut(item.id, status, catatan.trim() || 'Sedang ditindaklanjuti.')
    setTersimpan(true)
    setTimeout(() => setTersimpan(false), 2500)
  }

  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusPenanganan)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="Diproses">Diproses</option>
          <option value="Selesai">Selesai</option>
        </select>
        <button
          type="button"
          onClick={simpan}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-primary-strong"
        >
          <ClipboardCheck className="h-3.5 w-3.5" /> Update Status
        </button>
        {tersimpan && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Tersimpan
          </span>
        )}
      </div>
      <textarea
        value={catatan}
        onChange={(e) => setCatatan(e.target.value)}
        rows={2}
        placeholder="Catatan tindak lanjut / bukti penanganan..."
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      />
    </div>
  )
}

export function TindakLanjut() {
  const { opdAktif, setOpdAktif } = useRole()
  const { daftarTindakLanjut } = useDisposisi()
  const { daftarIsu } = useIsuEngine()

  const disposisiOpd = useMemo(
    () =>
      daftarTindakLanjut
        .filter((t) => t.opdTujuan === opdAktif)
        .sort((a, b) => (a.tanggalDisposisi < b.tanggalDisposisi ? 1 : -1)),
    [daftarTindakLanjut, opdAktif],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tindak Lanjut / Disposisi"
        subtitle="Isu yang telah didisposisikan pimpinan ke OPD Anda. Update status penanganan dan catatan tindak lanjut di sini."
      />

      <Card className="p-5">
        <FilterSelect label="OPD" value={opdAktif} options={daftarOpd} onChange={(v) => setOpdAktif(v as typeof opdAktif)} />
      </Card>

      <div className="space-y-3">
        {disposisiOpd.length === 0 && (
          <Card className="p-8 text-center text-sm text-slate-400">
            Belum ada isu yang didisposisikan ke OPD ini.
          </Card>
        )}
        {disposisiOpd.map((item) => {
          const isu = cariIsuById(daftarIsu, item.isuId)
          return (
            <Card key={item.id}>
              <CardHeader
                title={isu ? isu.namaIsu : item.isuId}
                subtitle={`Didisposisikan oleh ${item.didisposisikanOleh} · ${item.tanggalDisposisi}`}
              />
              <CardContent>
                {isu && (
                  <Link
                    to={`/isu/${isu.id}`}
                    className="mb-2 inline-block text-xs font-medium text-brand-red hover:underline dark:text-brand-gold"
                  >
                    Lihat detail isu →
                  </Link>
                )}
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-medium">Catatan arahan: </span>
                  {item.catatanArahan}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Status saat ini:</span>
                  <StatusBadge value={item.status} />
                </div>
                {item.status !== 'Selesai' && <FormTindakLanjut item={item} />}
                {item.status === 'Selesai' && item.catatanTindakLanjut && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      {item.catatanTindakLanjut} ({item.tanggalTindakLanjut})
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
