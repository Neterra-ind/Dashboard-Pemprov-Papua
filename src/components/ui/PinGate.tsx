/**
 * PinGate — Dialog PIN untuk melindungi halaman Upload Data
 *
 * Jika user belum authenticated di session ini, tampilkan form PIN.
 * Jika sudah, langsung tampilkan children (konten upload).
 */
import { useState, useEffect, type ReactNode, type KeyboardEvent } from 'react'
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { verifyPin, isUploadAuthenticated } from '@/lib/uploadAuth'
import logoNeterra from '@/assets/logo-neterra.png'

interface PinGateProps {
  children: ReactNode
}

export function PinGate({ children }: PinGateProps) {
  const [authenticated, setAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [locked, setLocked] = useState(false)
  const [lockTimer, setLockTimer] = useState(0)

  // Cek sesi aktif saat komponen mount
  useEffect(() => {
    if (isUploadAuthenticated()) {
      setAuthenticated(true)
    }
  }, [])

  // Countdown timer saat locked
  useEffect(() => {
    if (!locked) return
    if (lockTimer <= 0) {
      setLocked(false)
      setAttempts(0)
      return
    }
    const t = setTimeout(() => setLockTimer((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [locked, lockTimer])

  async function handleSubmit() {
    if (locked || loading || !pin.trim()) return

    setLoading(true)
    setError('')

    try {
      const ok = await verifyPin(pin)
      if (ok) {
        setAuthenticated(true)
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        setPin('')
        if (newAttempts >= 5) {
          // Kunci 60 detik setelah 5 percobaan salah
          setLocked(true)
          setLockTimer(60)
          setError('Terlalu banyak percobaan salah. Coba lagi dalam 60 detik.')
        } else {
          setError(`PIN salah. Percobaan ${newAttempts}/5.`)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit()
  }

  if (authenticated) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-lg">
          {/* Header */}
          <div className="flex flex-col items-center gap-3 bg-gradient-to-br from-slate-800 to-slate-900 px-8 py-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-2 ring-white/20">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold text-white">Upload Data</h1>
              <p className="mt-1 text-sm text-slate-400">
                Halaman ini hanya untuk admin data
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-7">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Masukkan PIN Admin
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value)
                  if (error) setError('')
                }}
                onKeyDown={handleKeyDown}
                disabled={locked || loading}
                placeholder="••••••••"
                autoFocus
                className={[
                  'w-full rounded-xl border px-4 py-3 pr-11 text-sm text-slate-900 outline-none',
                  'transition-colors placeholder:text-slate-300',
                  'focus:border-slate-400 focus:ring-2 focus:ring-slate-200',
                  error
                    ? 'border-red-400 bg-red-50 focus:ring-red-100'
                    : 'border-[var(--color-border)] bg-slate-50',
                  locked || loading ? 'cursor-not-allowed opacity-60' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
              <button
                type="button"
                onClick={() => setShowPin((s) => !s)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Error / countdown */}
            {error && (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
            {locked && lockTimer > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Mencoba lagi dalam{' '}
                <span className="font-semibold text-slate-700">{lockTimer}s</span>
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={locked || loading || !pin.trim()}
              className={[
                'mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3',
                'text-sm font-semibold text-white transition-colors',
                locked || loading || !pin.trim()
                  ? 'cursor-not-allowed bg-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-900',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Memverifikasi…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Masuk
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 border-t border-[var(--color-border)] px-8 py-4">
            <span className="text-xs text-slate-400">Powered by</span>
            <img src={logoNeterra} alt="Neterra Indonesia" className="h-4 w-auto object-contain opacity-70" />
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Hanya admin data Neterra yang memiliki akses ke halaman ini.
          <br />
          Pengguna dashboard tidak perlu PIN.
        </p>
      </div>
    </div>
  )
}
