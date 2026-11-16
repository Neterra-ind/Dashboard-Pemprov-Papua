/**
 * Halaman Upload Data Excel — IMD News & IMD Socmed
 *
 * Fitur:
 * - Drag & drop atau klik untuk upload file .xlsx/.xls
 * - Deteksi otomatis format: IMD News (kolom Judul, Isi, Media, Link...)
 *   vs IMD Socmed (kolom Username, Platform, Like, Comment, Share...)
 * - Auto-klasifikasi kategori dari judul + isi (keyword matching 21 sektor)
 * - Mapping sentimen: positive/negative/neutral → Positif/Negatif/Netral
 * - Preview tabel hasil konversi
 * - Inject data ke BeritaStore (localStorage) → semua halaman langsung pakai
 * - Tombol Reset ke data default
 */
import { useCallback, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { CheckCircle2, FileSpreadsheet, RefreshCw, Trash2, Upload, AlertCircle, Info, LogOut } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import type { BeritaRaw, Engagement } from '@/types'
import { klasifikasiKategori, mapSentimen, mapPlatform } from '@/lib/klasifikasiKategori'
import { useBerita } from '@/lib/beritaStore'
import { PinGate } from '@/components/ui/PinGate'
import { logoutUpload } from '@/lib/uploadAuth'

// ── Tipe helper internal ──────────────────────────────────────────────────

type FormatExcel = 'news' | 'socmed' | 'tidak-dikenal'

interface HasilParse {
  format: FormatExcel
  rows: BeritaRaw[]
  errors: string[]
}

// ── Fungsi parse ──────────────────────────────────────────────────────────

function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '')
}

function detectFormat(headers: string[]): FormatExcel {
  const h = headers.map(normalizeKey)
  if (h.some((x) => x.includes('like') || x.includes('comment') || x.includes('share') || x.includes('platform'))) {
    return 'socmed'
  }
  if (h.some((x) => x.includes('judul') || x.includes('media') || x.includes('narasumber'))) {
    return 'news'
  }
  return 'tidak-dikenal'
}

function parseTanggal(raw: unknown): string {
  if (!raw) return ''
  if (typeof raw === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(raw)
    if (d) {
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.y}-${pad(d.m)}-${pad(d.d)}`
    }
  }
  const s = String(raw).trim()
  // Try yyyy-mm-dd already
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  // dd/mm/yyyy
  const dm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dm) return `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`
  // dd-mm-yyyy
  const dm2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/)
  if (dm2) return `${dm2[3]}-${dm2[2].padStart(2, '0')}-${dm2[1].padStart(2, '0')}`
  return s.slice(0, 10)
}

function parseRow(format: FormatExcel, row: Record<string, unknown>): BeritaRaw | null {
  // Normalize keys
  const r: Record<string, string> = {}
  for (const [k, v] of Object.entries(row)) {
    r[normalizeKey(k)] = String(v ?? '').trim()
  }

  if (format === 'news') {
    // Kolom IMD News: Tanggal, Judul, Isi, Sentimen, Media, Narasumber, Link
    const judul = r['judul'] ?? r['title'] ?? r['headline'] ?? ''
    const isi = r['isi'] ?? r['konten'] ?? r['content'] ?? ''
    const tanggal = parseTanggal(row['Tanggal'] ?? row['tanggal'] ?? r['tanggal'] ?? '')
    const sumber = r['media'] ?? r['sumber'] ?? r['mediamassa'] ?? r['source'] ?? ''
    const url = r['link'] ?? r['url'] ?? ''
    const sentimenRaw = r['sentimen'] ?? r['sentiment'] ?? ''

    if (!judul && !isi) return null

    const kategori = klasifikasiKategori(judul, isi)
    const sentimen = mapSentimen(sentimenRaw)

    // Cek apakah ada tanda pimpinan di judul/isi
    let entitasTerkait: string | undefined
    const teks = (judul + ' ' + isi).toLowerCase()
    if (teks.includes('gubernur') || teks.includes('gov')) entitasTerkait = 'Gubernur'
    if (teks.includes('wakil gubernur') || teks.includes('wagub')) entitasTerkait = 'Wakil Gubernur'

    // Kolom kurasi AI (opsional — hanya ada jika file sudah dikurasi)
    const subjekQuery = r['subjekquery'] ?? r['subjek_query'] ?? r['subjek'] ?? ''
    const sentimenKurasi = r['sentimenkurasi'] ?? r['sentimen_kurasi'] ?? r['kurasisentimen'] ?? ''
    const framingKinerja = r['framingkinerja'] ?? r['framing_kinerja'] ?? r['framing'] ?? ''
    const statusDuplikasi = r['statusduplikasi'] ?? r['status_duplikasi'] ?? r['duplikasi'] ?? ''
    const narasumberJabatan = r['narasumberjabatan'] ?? r['narasumber_jabatan'] ?? r['narasumber'] ?? ''
    const alasanKurasi = r['alasankurasi'] ?? r['alasan_kurasi'] ?? r['alasan'] ?? ''

    return {
      tanggal,
      judul,
      sumber,
      sentimen,
      url,
      kategori,
      isi: isi.slice(0, 200),
      entitasTerkait,
      tipe: 'gubernur',
      // Kurasi AI — disertakan hanya jika ada isinya
      ...(subjekQuery && { subjek_query: subjekQuery }),
      ...(sentimenKurasi && { sentimen_kurasi: sentimenKurasi }),
      ...(framingKinerja && { framing_kinerja: framingKinerja as import('@/types').FramingKinerja }),
      ...(statusDuplikasi && { status_duplikasi: statusDuplikasi as import('@/types').StatusDuplikasi }),
      ...(narasumberJabatan && { narasumber_jabatan: narasumberJabatan }),
      ...(alasanKurasi && { alasan_kurasi: alasanKurasi }),
    }
  }

  if (format === 'socmed') {
    // Kolom IMD Socmed: Tanggal, Jam, Username, Isi, Sentimen, Platform, Like, Comment, Share, Quote, View, Link
    const isi = r['isi'] ?? r['konten'] ?? r['content'] ?? r['caption'] ?? r['text'] ?? ''
    const username = r['username'] ?? r['user'] ?? r['akun'] ?? ''
    const tanggal = parseTanggal(row['Tanggal'] ?? row['tanggal'] ?? r['tanggal'] ?? '')
    const platformRaw = r['platform'] ?? r['mediasosial'] ?? r['media'] ?? ''
    const url = r['link'] ?? r['url'] ?? ''
    const sentimenRaw = r['sentimen'] ?? r['sentiment'] ?? ''

    if (!isi && !username) return null

    const judul = isi.slice(0, 100) || `[${username}] Post`
    const kategori = klasifikasiKategori(judul, isi)
    const sentimen = mapSentimen(sentimenRaw)
    const platform = mapPlatform(platformRaw)

    const engagement: Engagement = {
      like: parseInt(r['like'] ?? r['likes'] ?? '0') || 0,
      comment: parseInt(r['comment'] ?? r['comments'] ?? r['komentar'] ?? '0') || 0,
      share: parseInt(r['share'] ?? r['shares'] ?? '0') || 0,
      quote: parseInt(r['quote'] ?? r['quotes'] ?? r['retweet'] ?? '0') || 0,
      view: parseInt(r['view'] ?? r['views'] ?? r['impresi'] ?? '0') || 0,
    }

    return {
      tanggal,
      judul,
      sumber: platform ?? platformRaw ?? 'Media Sosial',
      sentimen,
      url,
      kategori,
      isi: isi.slice(0, 200),
      username,
      platform: platform as string | undefined,
      engagement,
      tipe: 'socmed',
    }
  }

  return null
}

function parseExcel(file: File): Promise<HasilParse> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const wb = XLSX.read(data, { type: 'array', cellDates: false })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: true, defval: '' })

        if (rawRows.length === 0) {
          resolve({ format: 'tidak-dikenal', rows: [], errors: ['File kosong atau tidak ada data.'] })
          return
        }

        const headers = Object.keys(rawRows[0])
        const format = detectFormat(headers)

        if (format === 'tidak-dikenal') {
          resolve({
            format,
            rows: [],
            errors: [`Kolom tidak dikenal: ${headers.join(', ')}. Pastikan file adalah IMD News atau IMD Socmed.`],
          })
          return
        }

        const rows: BeritaRaw[] = []
        const errors: string[] = []

        for (let i = 0; i < rawRows.length; i++) {
          try {
            const parsed = parseRow(format, rawRows[i])
            if (parsed) rows.push(parsed)
          } catch (err) {
            errors.push(`Baris ${i + 2}: ${String(err)}`)
          }
        }

        resolve({ format, rows, errors })
      } catch (err) {
        resolve({ format: 'tidak-dikenal', rows: [], errors: [String(err)] })
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

// ── UI Components ─────────────────────────────────────────────────────────

function StatusChip({ sentimen }: { sentimen: string }) {
  const cls =
    sentimen === 'Positif'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : sentimen === 'Negatif'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-slate-100 text-slate-600 border-slate-200'
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>{sentimen}</span>
  )
}

function FormatBadge({ format }: { format: FormatExcel }) {
  if (format === 'news')
    return (
      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
        📰 IMD News
      </span>
    )
  if (format === 'socmed')
    return (
      <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
        📱 IMD Socmed
      </span>
    )
  return null
}

// ── Halaman Utama ─────────────────────────────────────────────────────────

export function UploadData() {
  const { berita: beritaAktif, isCustom, setBerita, resetKeDefault, hapusSemuaData } = useBerita()

  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasil, setHasil] = useState<HasilParse | null>(null)
  const [namaFile, setNamaFile] = useState('')
  const [subjekInput, setSubjekInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const prosesFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('Hanya file Excel (.xlsx atau .xls) yang didukung.')
      return
    }
    setIsLoading(true)
    setHasil(null)
    setNamaFile(file.name)
    const result = await parseExcel(file)
    setHasil(result)
    setIsLoading(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) prosesFile(file)
    },
    [prosesFile],
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) prosesFile(file)
    e.target.value = ''
  }

  const handleTerapkan = () => {
    if (!hasil?.rows.length) return
    const subjek = subjekInput.trim() || undefined
    setBerita(hasil.rows, subjek)
    setHasil(null)
    setNamaFile('')
    setSubjekInput('')
  }

  const handleReset = () => {
    if (confirm('Reset data ke default? Data upload akan dihapus.')) {
      resetKeDefault()
      setHasil(null)
      setNamaFile('')
    }
  }

  const handleHapusSemua = () => {
    if (confirm('Hapus semua data? Dashboard akan kosong sampai Anda upload file baru.')) {
      hapusSemuaData()
      setHasil(null)
      setNamaFile('')
      setSubjekInput('')
    }
  }

  function handleLogout() {
    if (confirm('Keluar dari sesi upload? Anda harus memasukkan PIN lagi untuk kembali.')) {
      logoutUpload()
      window.location.reload()
    }
  }

  return (
    <PinGate>
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Upload Data Excel"
          subtitle="Upload file Excel IMD untuk memperbarui data di seluruh halaman dashboard"
        />
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          title="Keluar dari sesi upload admin"
        >
          <LogOut className="h-3.5 w-3.5" />
          Keluar Sesi
        </button>
      </div>

      {/* Status data aktif */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {isCustom ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <Info className="h-5 w-5 text-blue-400" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {isCustom ? 'Menggunakan data upload' : 'Menggunakan data default (contoh)'}
                </p>
                <p className="text-xs text-slate-500">
                  {beritaAktif.length.toLocaleString('id-ID')} berita/postingan aktif di dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCustom && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reset ke Data Default
                </button>
              )}
              <button
                onClick={handleHapusSemua}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus Semua Data
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zone Upload */}
      <Card>
        <CardHeader
          title="Upload File Excel"
          subtitle="Mendukung format IMD News (Judul, Isi, Media, Sentimen) dan IMD Socmed (Username, Platform, Like, Comment, Share)"
        />
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors
              ${isDragging ? 'border-accent bg-accent-soft/40' : 'border-slate-200 hover:border-accent/50 hover:bg-slate-50/80'}`}
          >
            {isLoading ? (
              <RefreshCw className="h-10 w-10 animate-spin text-accent" />
            ) : (
              <FileSpreadsheet className="h-10 w-10 text-slate-300" />
            )}
            <div>
              <p className="font-medium text-slate-700">
                {isLoading ? 'Memproses file...' : 'Drag & drop file Excel di sini'}
              </p>
              <p className="text-xs text-slate-400 mt-1">atau klik untuk pilih file (.xlsx, .xls)</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </CardContent>
      </Card>

      {/* Hasil parse */}
      {hasil && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6 pb-4">
            <div className="flex items-center gap-2.5">
              <Upload className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm font-semibold text-slate-800">{namaFile}</p>
                <div className="mt-1 flex items-center gap-2">
                  <FormatBadge format={hasil.format} />
                  <span className="text-xs text-slate-500">
                    {hasil.rows.length.toLocaleString('id-ID')} baris berhasil diproses
                  </span>
                </div>
              </div>
            </div>
            {hasil.rows.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">
                    Nama subjek query <span className="text-slate-400">(opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={subjekInput}
                    onChange={(e) => setSubjekInput(e.target.value)}
                    placeholder="cth: Gubernur Papua, Bupati Mimika"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent/30 w-64"
                  />
                </div>
                <button
                  onClick={handleTerapkan}
                  className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-pressed transition-colors self-end"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Terapkan ke Dashboard
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {hasil.errors.length > 0 && (
            <CardContent className="pt-0">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700">
                      {hasil.errors.length} peringatan
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {hasil.errors.slice(0, 5).map((e, i) => (
                        <li key={i} className="text-xs text-amber-600">{e}</li>
                      ))}
                      {hasil.errors.length > 5 && (
                        <li className="text-xs text-amber-500">...dan {hasil.errors.length - 5} peringatan lainnya</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          )}

          {/* Preview tabel */}
          {hasil.rows.length > 0 && (
            <CardContent className="pt-0">
              <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                Preview (10 baris pertama)
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  {(() => {
                    const adaKurasi = hasil.rows.some((r) => !!(r as any).framing_kinerja)
                    return (
                      <>
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Tanggal</th>
                      <th className="px-3 py-2 text-left font-semibold">Judul / Isi</th>
                      <th className="px-3 py-2 text-left font-semibold">Sumber</th>
                      <th className="px-3 py-2 text-left font-semibold">Kategori</th>
                      <th className="px-3 py-2 text-left font-semibold">Sentimen</th>
                      {adaKurasi && (
                        <th className="px-3 py-2 text-left font-semibold">Framing</th>
                      )}
                      {hasil.format === 'socmed' && (
                        <th className="px-3 py-2 text-left font-semibold">Engagement</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hasil.rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 whitespace-nowrap text-slate-500">{row.tanggal}</td>
                        <td className="px-3 py-2 max-w-xs">
                          <p className="line-clamp-2 text-slate-800">{row.judul}</p>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-600">{row.sumber}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                            {row.kategori}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <StatusChip sentimen={row.sentimen} />
                        </td>
                        {adaKurasi && (
                          <td className="px-3 py-2 whitespace-nowrap text-[11px] text-slate-500">
                            {(row as any).framing_kinerja ?? '—'}
                          </td>
                        )}
                        {hasil.format === 'socmed' && (
                          <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                            {row.engagement
                              ? `👍${row.engagement.like} 💬${row.engagement.comment} 🔁${row.engagement.share}`
                              : '—'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                      </>
                    )
                  })()}
                </table>
                {hasil.rows.length > 10 && (
                  <p className="px-3 py-2 text-center text-xs text-slate-400 border-t border-slate-200">
                    ...dan {(hasil.rows.length - 10).toLocaleString('id-ID')} baris lainnya
                  </p>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Panduan format */}
      <Card>
        <CardHeader title="Panduan Format Excel" />
        <CardContent className="pt-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
              <p className="text-sm font-semibold text-blue-800 mb-2">📰 IMD News</p>
              <p className="text-xs text-blue-700 mb-2">Kolom yang diperlukan:</p>
              <div className="flex flex-wrap gap-1.5">
                {['Tanggal', 'Judul', 'Isi', 'Sentimen', 'Media', 'Link'].map((k) => (
                  <code key={k} className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] text-blue-700">
                    {k}
                  </code>
                ))}
              </div>
              <p className="mt-2 text-xs text-blue-500">
                Kolom opsional: Narasumber, Sentimen_Kurasi, Framing_Kinerja, Status_Duplikasi, Alasan_Kurasi
              </p>
            </div>
            <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-4">
              <p className="text-sm font-semibold text-purple-800 mb-2">📱 IMD Socmed</p>
              <p className="text-xs text-purple-700 mb-2">Kolom yang diperlukan:</p>
              <div className="flex flex-wrap gap-1.5">
                {['Tanggal', 'Username', 'Isi', 'Sentimen', 'Platform', 'Like', 'Comment', 'Share', 'Link'].map((k) => (
                  <code key={k} className="rounded bg-purple-100 px-1.5 py-0.5 text-[11px] text-purple-700">
                    {k}
                  </code>
                ))}
              </div>
              <p className="mt-2 text-xs text-purple-500">
                Kolom opsional: Jam, Quote, View
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-600">
              <strong>Sentimen:</strong> Nilai <code>positive/negative/neutral</code> (Inggris) atau{' '}
              <code>positif/negatif/netral</code> (Indonesia) diterima — keduanya otomatis dikonversi.
              <br />
              <strong>Kategori:</strong> Auto-diklasifikasi dari judul + isi menggunakan 21 sektor Neterra.
              <br />
              <strong>Tanggal:</strong> Format yang diterima: <code>YYYY-MM-DD</code>, <code>DD/MM/YYYY</code>, atau serial Excel.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
    </PinGate>
  )
}
