/**
 * uploadAuth — PIN gate untuk halaman Upload Data
 *
 * Cara kerja:
 * - PIN disimpan sebagai SHA-256 hash di kode ini (tidak plain text)
 * - Setelah PIN benar, flag disimpan di sessionStorage (habis saat tab ditutup)
 * - Setiap kunjungan baru ke /upload-data harus memasukkan PIN lagi
 *
 * Untuk mengganti PIN:
 * 1. Buka terminal, jalankan: node -e "const c=require('crypto');console.log(c.createHash('sha256').update('PIN_BARU_KAMU').digest('hex'))"
 * 2. Ganti nilai UPLOAD_PIN_HASH di bawah dengan hasil hash tersebut
 */

// SHA-256 dari PIN "neterra2024" — ganti hash ini jika ingin PIN berbeda
const UPLOAD_PIN_HASH = '3eb1f164c67d17431be61faaff9dfcbfcdab8eeb2ee393a4d013e6b6b446e6f2'

const SESSION_KEY = 'neterra_upload_auth'

/**
 * Hash sebuah string menggunakan Web Crypto API (SHA-256)
 * Tersedia di semua browser modern tanpa library tambahan
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verifikasi PIN yang dimasukkan user.
 * Returns true jika benar, sekaligus menyimpan sesi di sessionStorage.
 */
export async function verifyPin(pin: string): Promise<boolean> {
  const hash = await sha256(pin.trim())
  if (hash === UPLOAD_PIN_HASH) {
    sessionStorage.setItem(SESSION_KEY, '1')
    return true
  }
  return false
}

/**
 * Cek apakah sesi upload sedang aktif (sudah login di tab ini).
 * sessionStorage otomatis dihapus saat tab/browser ditutup.
 */
export function isUploadAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === '1'
}

/**
 * Logout dari sesi upload (hapus flag dari sessionStorage)
 */
export function logoutUpload(): void {
  sessionStorage.removeItem(SESSION_KEY)
}
