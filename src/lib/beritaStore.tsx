/**
 * BeritaStore — context global untuk data berita aktif.
 *
 * Data default: beritaPapua.json (bundled).
 * Saat user upload Excel, data di-replace di localStorage + context ini.
 * Semua halaman yang sebelumnya baca beritaPapua.json langsung
 * seharusnya pakai hook useBerita() dari sini agar data upload masuk.
 */
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { BeritaRaw } from '@/types'
import defaultData from '@/data/beritaPapua.json'

const LS_KEY = 'neterra_berita_aktif'

function loadFromStorage(): BeritaRaw[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as BeritaRaw[]
  } catch {
    return null
  }
}

interface BeritaStoreCtx {
  berita: BeritaRaw[]
  isCustom: boolean
  setBerita: (data: BeritaRaw[]) => void
  resetKeDefault: () => void
}

const BeritaStoreContext = createContext<BeritaStoreCtx | null>(null)

export function BeritaStoreProvider({ children }: { children: ReactNode }) {
  const [berita, setBeritaState] = useState<BeritaRaw[]>(() => {
    return loadFromStorage() ?? (defaultData as BeritaRaw[])
  })
  const [isCustom, setIsCustom] = useState(() => !!loadFromStorage())

  function setBerita(data: BeritaRaw[]) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {
      // localStorage mungkin penuh — tetap update state
    }
    setBeritaState(data)
    setIsCustom(true)
  }

  function resetKeDefault() {
    localStorage.removeItem(LS_KEY)
    setBeritaState(defaultData as BeritaRaw[])
    setIsCustom(false)
  }

  return (
    <BeritaStoreContext.Provider value={{ berita, isCustom, setBerita, resetKeDefault }}>
      {children}
    </BeritaStoreContext.Provider>
  )
}

export function useBerita(): BeritaStoreCtx {
  const ctx = useContext(BeritaStoreContext)
  if (!ctx) throw new Error('useBerita must be used within BeritaStoreProvider')
  return ctx
}
