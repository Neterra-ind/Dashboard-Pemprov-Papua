/**
 * BeritaStore — context global untuk data berita aktif.
 *
 * Data default: beritaPapua.json (bundled).
 * Saat user upload Excel, data di-replace di localStorage + context ini.
 * Semua halaman yang sebelumnya baca beritaPapua.json langsung
 * seharusnya pakai hook useBerita() dari sini agar data upload masuk.
 *
 * subjekQuery: nama subjek yang di-query di IMD (mis. "Gubernur Papua",
 * "Bupati Mimika") — dipakai sebagai label KPI di Dashboard agar
 * fleksibel untuk 10+ daerah.
 */
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { BeritaRaw } from '@/types'
import defaultData from '@/data/beritaPapua.json'

const LS_KEY = 'neterra_berita_aktif'
const LS_SUBJEK_KEY = 'neterra_subjek_query'
const DEFAULT_SUBJEK = 'Gubernur & Pemprov Papua'

function loadFromStorage(): BeritaRaw[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as BeritaRaw[]
  } catch {
    return null
  }
}

function loadSubjekFromStorage(): string {
  return localStorage.getItem(LS_SUBJEK_KEY) ?? DEFAULT_SUBJEK
}

interface BeritaStoreCtx {
  berita: BeritaRaw[]
  isCustom: boolean
  subjekQuery: string
  setBerita: (data: BeritaRaw[], subjek?: string) => void
  resetKeDefault: () => void
  hapusSemuaData: () => void
}

const BeritaStoreContext = createContext<BeritaStoreCtx | null>(null)

export function BeritaStoreProvider({ children }: { children: ReactNode }) {
  const [berita, setBeritaState] = useState<BeritaRaw[]>(() => {
    return loadFromStorage() ?? (defaultData as BeritaRaw[])
  })
  const [isCustom, setIsCustom] = useState(() => !!loadFromStorage())
  const [subjekQuery, setSubjekQuery] = useState<string>(() => loadSubjekFromStorage())

  function setBerita(data: BeritaRaw[], subjek?: string) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data))
      if (subjek) {
        localStorage.setItem(LS_SUBJEK_KEY, subjek)
      }
    } catch {
      // localStorage mungkin penuh — tetap update state
    }
    setBeritaState(data)
    setIsCustom(true)
    if (subjek) setSubjekQuery(subjek)
  }

  function resetKeDefault() {
    localStorage.removeItem(LS_KEY)
    localStorage.removeItem(LS_SUBJEK_KEY)
    setBeritaState(defaultData as BeritaRaw[])
    setIsCustom(false)
    setSubjekQuery(DEFAULT_SUBJEK)
  }

  function hapusSemuaData() {
    localStorage.removeItem(LS_KEY)
    localStorage.removeItem(LS_SUBJEK_KEY)
    setBeritaState([])
    setIsCustom(false)
    setSubjekQuery(DEFAULT_SUBJEK)
  }

  return (
    <BeritaStoreContext.Provider value={{ berita, isCustom, subjekQuery, setBerita, resetKeDefault, hapusSemuaData }}>
      {children}
    </BeritaStoreContext.Provider>
  )
}

export function useBerita(): BeritaStoreCtx {
  const ctx = useContext(BeritaStoreContext)
  if (!ctx) throw new Error('useBerita must be used within BeritaStoreProvider')
  return ctx
}

// ── Helper: filter berdasarkan subjek_query kurasi AI ──────────────────────

/** Apakah berita ini relevan (bukan Tidak Relevan)? */
export function isRelevan(b: BeritaRaw): boolean {
  const sq = (b as any).subjek_query as string | undefined
  if (!sq) return true // data lama tanpa kurasi → anggap relevan
  return sq !== 'Tidak Relevan'
}

/** Apakah berita ini termasuk Gubernur atau Wakil Gubernur (untuk Isu Pimpinan)? */
export function isPimpinan(b: BeritaRaw): boolean {
  const sq = (b as any).subjek_query as string | undefined
  if (sq) return sq === 'Gubernur' || sq === 'Wakil Gubernur'
  return b.entitasTerkait === 'Gubernur' || b.entitasTerkait === 'Wakil Gubernur'
}

/** Filter untuk halaman Isu Provinsi & Pemberitaan OPD: relevan dan bukan pimpinan spesifik */
export function isProvinsi(b: BeritaRaw): boolean {
  if (!isRelevan(b)) return false
  const sq = (b as any).subjek_query as string | undefined
  if (sq) return sq !== 'Gubernur' && sq !== 'Wakil Gubernur' && sq !== 'Tidak Relevan'
  // fallback data lama
  return !b.entitasTerkait || (b.entitasTerkait !== 'Gubernur' && b.entitasTerkait !== 'Wakil Gubernur')
}
