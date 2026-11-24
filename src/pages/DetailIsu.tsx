import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  ListChecks,
  Sparkles,
} from 'lucide-react'
import { DisposisiModal } from '@/components/DisposisiModal'
import { SeverityGauge } from '@/components/SeverityGauge'
import { PlatformBadge } from '@/components/PlatformBadge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { KlasifikasiBadge, StatusBadge, TrendBadge } from '@/components/ui/Badge'
import { useDisposisi } from '@/lib/store'
import { cariBeritaUntukIsu, cariIsuById, useIsuEngine } from '@/lib/isuEngine'

export function DetailIsu() {
  const { id } = useParams<{ id: string }>()
  const { daftarIsu, daftarBerita } = useIsuEngine()
  const isu = id ? cariIsuById(daftarIsu, id) : undefined
  const { statusUntukIsu, tindakLanjutUntukIsu } = useDisposisi()
  const [modalTerbuka, setModalTerbuka] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  if (!isu) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">Isu tidak ditemukan.</p>
        <Link to="/" className="text-sm font-medium text-brand-red hover:underline dark:text-brand-gold">
          ← Kembali ke Executive Summary
        </Link>
      </div>
    )
  }

  const status = statusUntukIsu(isu.id)
  const riwayat = tindakLanjutUntukIsu(isu.id)
  const sumberBerita = cariBeritaUntukIsu(daftarBerita, isu.id)

  return (
    <div className="space-y-5">
      <Link
        to="/early-warning"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900">{isu.namaIsu}</h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>{isu.scope}</span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {isu.opd}
                </span>
                <span>Mulai {isu.tanggalMulai}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <KlasifikasiBadge value={isu.klasifikasi} />
              <TrendBadge value={isu.trend} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SeverityGauge score={isu.viralityScore} />
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">Status Penanganan</span>
              <StatusBadge value={status} />
            </div>
          </div>

          {status !== 'Selesai' && (
            <button
              type="button"
              onClick={() => setModalTerbuka(true)}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-strong"
            >
              <Sparkles className="h-4 w-4" />
              Tindak Lanjuti ke OPD
            </button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Ringkasan AI" />
        <CardContent className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
          {isu.ringkasanAI}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Rekomendasi Tindak Lanjut" />
        <CardContent>
          <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            {isu.rekomendasiAI.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-red dark:text-brand-gold" />
                {r}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Daftar Sumber Berita" subtitle={`${sumberBerita.length} sumber ditemukan`} />
        <CardContent className="space-y-2">
          {sumberBerita.length === 0 && (
            <p className="text-sm text-slate-400">Belum ada sumber berita tercatat untuk isu ini.</p>
          )}
          {sumberBerita.map((b) => (
            <a
              key={b.id}
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
            >
              <PlatformBadge platform={b.jenisSumber} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800 hover:underline dark:text-slate-100">
                  {b.judul}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {b.sumber} · {b.tanggal} · Confidence {b.confidenceScore}%
                </p>
              </div>
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            </a>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Riwayat Disposisi" subtitle="Log tindak lanjut ke OPD" />
        <CardContent className="space-y-3">
          {riwayat.length === 0 && (
            <p className="text-sm text-slate-400">Belum ada disposisi untuk isu ini.</p>
          )}
          {riwayat.map((r) => (
            <div key={r.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
              <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    Didisposisikan ke {r.opdTujuan}
                  </p>
                  <StatusBadge value={r.status} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Oleh {r.didisposisikanOleh} · {r.tanggalDisposisi}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{r.catatanArahan}</p>
                {r.catatanTindakLanjut && (
                  <div className="mt-1 flex items-start gap-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      {r.catatanTindakLanjut} ({r.tanggalTindakLanjut})
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {modalTerbuka && (
        <DisposisiModal
          isu={isu}
          onClose={() => setModalTerbuka(false)}
          onSubmitted={() => {
            setModalTerbuka(false)
            setToast(`Isu berhasil didisposisikan ke ${isu.opd}`)
            setTimeout(() => setToast(null), 3500)
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex animate-[toastIn_0.2s_ease-out] items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          {toast}
        </div>
      )}
    </div>
  )
}
