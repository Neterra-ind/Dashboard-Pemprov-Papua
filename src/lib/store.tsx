import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Opd, StatusPenanganan, TindakLanjut } from '@/types'
import { useRole } from '@/lib/role'

// Disposisi disimpan di localStorage (bukan di-seed dari data contoh) agar
// tindak lanjut yang dibuat admin tetap merujuk ke isu dari data upload nyata,
// dan tetap ada setelah reload halaman — sama seperti pola BeritaStore.
const LS_KEY = 'neterra_disposisi'

function muatDariStorage(): TindakLanjut[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as TindakLanjut[]
  } catch {
    return []
  }
}

function simpanKeStorage(data: TindakLanjut[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  } catch {
    // localStorage mungkin penuh — tetap lanjut, state React tidak terganggu
  }
}

interface DisposisiContextValue {
  daftarTindakLanjut: TindakLanjut[]
  statusUntukIsu: (isuId: string) => StatusPenanganan
  tindakLanjutUntukIsu: (isuId: string) => TindakLanjut[]
  tambahDisposisi: (isuId: string, opdTujuan: Opd, catatanArahan: string) => void
  updateTindakLanjut: (id: string, status: StatusPenanganan, catatan: string) => void
}

const DisposisiContext = createContext<DisposisiContextValue | null>(null)

export function DisposisiProvider({ children }: { children: ReactNode }) {
  const [daftarTindakLanjut, setDaftarTindakLanjutState] = useState<TindakLanjut[]>(() => muatDariStorage())
  const { role } = useRole()

  function ubahDaftar(updater: (prev: TindakLanjut[]) => TindakLanjut[]) {
    setDaftarTindakLanjutState((prev) => {
      const next = updater(prev)
      simpanKeStorage(next)
      return next
    })
  }

  const value = useMemo<DisposisiContextValue>(() => {
    function tindakLanjutUntukIsu(isuId: string) {
      return daftarTindakLanjut
        .filter((t) => t.isuId === isuId)
        .sort((a, b) => (a.tanggalDisposisi < b.tanggalDisposisi ? 1 : -1))
    }

    function statusUntukIsu(isuId: string): StatusPenanganan {
      const terbaru = tindakLanjutUntukIsu(isuId)[0]
      return terbaru?.status ?? 'Belum Ditindaklanjuti'
    }

    function tambahDisposisi(isuId: string, opdTujuan: Opd, catatanArahan: string) {
      const baru: TindakLanjut = {
        id: `tl-${Date.now()}`,
        isuId,
        opdTujuan,
        catatanArahan,
        didisposisikanOleh: role,
        tanggalDisposisi: new Date().toISOString().slice(0, 10),
        status: 'Didisposisikan',
      }
      ubahDaftar((prev) => [baru, ...prev])
    }

    function updateTindakLanjut(id: string, status: StatusPenanganan, catatan: string) {
      ubahDaftar((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
                catatanTindakLanjut: catatan,
                tanggalTindakLanjut: new Date().toISOString().slice(0, 10),
              }
            : t,
        ),
      )
    }

    return { daftarTindakLanjut, statusUntukIsu, tindakLanjutUntukIsu, tambahDisposisi, updateTindakLanjut }
  }, [daftarTindakLanjut, role])

  return <DisposisiContext.Provider value={value}>{children}</DisposisiContext.Provider>
}

export function useDisposisi() {
  const ctx = useContext(DisposisiContext)
  if (!ctx) throw new Error('useDisposisi harus dipakai di dalam DisposisiProvider')
  return ctx
}
