import { useMemo, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { FilterSelect } from '@/components/FilterSelect'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { daftarEarlyWarning, semuaKlasifikasi } from '@/data/mockData'

export function EarlyWarning() {
  const [klasifikasi, setKlasifikasi] = useState('')

  const klasifikasiOptions = semuaKlasifikasi.filter((k) => k !== 'Positif')

  const terfilter = useMemo(
    () =>
      daftarEarlyWarning
        .filter((isu) => !klasifikasi || isu.klasifikasi === klasifikasi)
        .sort((a, b) => b.tanggalMulai.localeCompare(a.tanggalMulai)),
    [klasifikasi],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Isu Negatif"
        subtitle="Berita negatif atau berpotensi negatif yang perlu direspons OPD."
      />

      <Card className="p-5">
        <div className="flex flex-wrap gap-3">
          <FilterSelect label="Klasifikasi" value={klasifikasi} options={klasifikasiOptions} onChange={setKlasifikasi} />
        </div>
      </Card>

      <Card>
        {terfilter.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
            Tidak ada isu berisiko tinggi/kritis dengan filter saat ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 w-10">No</th>
                  <th className="px-4 py-3 w-28">Tanggal</th>
                  <th className="px-4 py-3">Judul</th>
                  <th className="px-4 py-3 max-w-xs">Ringkasan</th>
                  <th className="px-4 py-3 w-40">Kewenangan OPD</th>
                  <th className="px-4 py-3 w-36">Sumber Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {terfilter.map((isu, idx) => (
                  <tr key={isu.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-medium tabular-nums">{idx + 1}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{isu.tanggalMulai}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800 leading-snug">{isu.namaIsu}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs leading-relaxed max-w-xs">
                      {isu.ringkasanAI}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{isu.opd}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {isu.sumberUtama.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
