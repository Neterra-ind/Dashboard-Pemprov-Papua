import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { DisposisiModal } from '@/components/DisposisiModal'
import { SeverityGauge } from '@/components/SeverityGauge'
import { FilterSelect } from '@/components/FilterSelect'
import { Card, CardContent } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { KlasifikasiBadge } from '@/components/ui/Badge'
import { useDisposisi } from '@/lib/store'
import { daftarEarlyWarning, semuaKlasifikasi } from '@/data/mockData'
import type { Isu } from '@/types'

export function EarlyWarning() {
  const { statusUntukIsu } = useDisposisi()
  const [klasifikasi, setKlasifikasi] = useState('')
  const [isuDipilih, setIsuDipilih] = useState<Isu | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const klasifikasiOptions = semuaKlasifikasi.filter((k) => k !== 'Positif')

  const terfilter = useMemo(
    () =>
      daftarEarlyWarning
        .filter((isu) => !klasifikasi || isu.klasifikasi === klasifikasi)
        .sort((a, b) => b.viralityScore - a.viralityScore),
    [klasifikasi],
  )

  function tampilkanToast(pesan: string) {
    setToast(pesan)
    setTimeout(() => setToast(null), 3500)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Isu Negatif"
        subtitle="Berita negatif atau berpotensi negatif yang perlu direspons OPD. Disposisikan ke OPD terkait langsung dari sini."
      />

      <Card className="p-5">
        <div className="flex flex-wrap gap-3">
          <FilterSelect label="Klasifikasi" value={klasifikasi} options={klasifikasiOptions} onChange={setKlasifikasi} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {terfilter.length === 0 && (
          <Card className="p-8 text-center text-sm text-slate-400 lg:col-span-2">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
            Tidak ada isu berisiko tinggi/kritis dengan filter saat ini.
          </Card>
        )}
        {terfilter.map((isu) => {
          const status = statusUntukIsu(isu.id)
          return (
            <Card key={isu.id}>
              <CardContent className="space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/isu/${isu.id}`} className="hover:underline">
                    <p className="font-semibold text-slate-800">{isu.namaIsu}</p>
                  </Link>
                  <KlasifikasiBadge value={isu.klasifikasi} />
                </div>

                <p className="text-xs text-slate-500">
                  {isu.jumlahBerita} ekspos berita · Kewenangan: {isu.opd}
                </p>

                <SeverityGauge score={isu.viralityScore} />

                {status !== 'Selesai' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsuDipilih(isu)}
                      className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-primary-strong"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Tindak Lanjuti ke OPD
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {isuDipilih && (
        <DisposisiModal
          isu={isuDipilih}
          onClose={() => setIsuDipilih(null)}
          onSubmitted={() => {
            tampilkanToast(`Isu berhasil didisposisikan ke ${isuDipilih.opd}`)
            setIsuDipilih(null)
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
