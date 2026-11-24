/**
 * isuEngine — membangun daftar "Isu" (klaster topik/event) dan "Berita" dari
 * data berita AKTIF (hasil upload atau default), menggantikan daftarIsu/
 * daftarBerita statis di mockData.ts yang dihitung sekali dari beritaPapua.json
 * dan tidak pernah berubah meski user upload data baru.
 *
 * Dipakai oleh DetailIsu.tsx, TindakLanjut.tsx, dan Dashboard.tsx (Admin OPD)
 * — ketiganya sebelumnya membaca isu dari mockData (data contoh), sehingga
 * tidak tersambung ke data upload. Pipeline klasterisasi & rumus turunan
 * (level risiko, klasifikasi, tren) sama dengan yang sudah dipakai & terbukti
 * di IsuPimpinan.tsx — hanya sumber datanya yang kini berita aktif (live),
 * bukan JSON bundel statis.
 */
import { useMemo } from 'react'
import type {
  Berita,
  BeritaRaw,
  EntitasPimpinan,
  Isu,
  JenisSumber,
  KategoriIsu,
  Klasifikasi,
  LevelRisiko,
  Opd,
  ScopeIsu,
  Sentimen,
  Trend,
} from '@/types'
import { ambilIsuUntukTampilan, nilaiMayoritas, ringkasKlasterIsu } from '@/lib/klasterIsu'
import { useBerita, isRelevan } from '@/lib/beritaStore'
import { getJenisSumber } from '@/lib/utils'
import {
  KATEGORI_OPD_MAP,
  REKOMENDASI_POOL,
  estimasiEskalasiUntuk,
  levelDariSentimen,
  penyebabUntuk,
  ringkasanUntuk,
  risikoUntuk,
} from '@/data/mockData'

const AMBANG_KEMIRIPAN_ISU = 0.5

/** Sentimen efektif: utamakan hasil kurasi AI (sentimen_kurasi), fallback ke sentimen IMD mentah. */
function sentimenEfektif(b: BeritaRaw): Sentimen {
  const sk = (b as any).sentimen_kurasi as string | undefined
  if (sk === 'Positif' || sk === 'Negatif' || sk === 'Netral') return sk
  if (sk === 'Campuran') return 'Netral'
  const s = b.sentimen
  if (s === 'Positif' || s === 'Negatif' || s === 'Netral') return s
  return 'Netral'
}

/** Entitas efektif: utamakan subjek_query hasil kurasi AI, fallback ke entitasTerkait. */
function entitasEfektif(b: BeritaRaw): EntitasPimpinan | undefined {
  const sq = (b as any).subjek_query as string | undefined
  if (sq === 'Gubernur') return 'Gubernur'
  if (sq === 'Wakil Gubernur') return 'Wakil Gubernur'
  if (b.entitasTerkait === 'Gubernur' || b.entitasTerkait === 'Wakil Gubernur') return b.entitasTerkait
  return undefined
}

function opdEfektif(b: BeritaRaw, kategori: KategoriIsu): Opd {
  return ((b as any).opd || KATEGORI_OPD_MAP[kategori]) as Opd
}

function scopeUntukEntitas(entitas?: EntitasPimpinan): ScopeIsu {
  if (entitas === 'Gubernur') return 'Gubernur'
  // Wakil Gubernur diperlakukan sebagai Provinsi — sama seperti mockData —
  // agar beritanya tetap muncul di Isu Papua (Provinsi).
  return 'Provinsi'
}

function klasifikasiDariRatio(negatifRatio: number): Klasifikasi {
  if (negatifRatio >= 0.4) return 'Negatif'
  if (negatifRatio >= 0.15) return 'Potensi Negatif'
  return 'Positif'
}

function levelDariRatio(negatifRatio: number, total: number): LevelRisiko {
  if (negatifRatio >= 0.5) return total >= 20 ? 'Critical' : 'High'
  if (negatifRatio >= 0.25) return 'Medium'
  return 'Low'
}

/** Rekomendasi tindak lanjut — dipilih deterministik dari tingkat risiko & klasifikasi
 *  (bukan acak), supaya jumlah & isi rekomendasi konsisten mengikuti urgensi isu nyata. */
function rekomendasiUntuk(level: LevelRisiko, klasifikasi: Klasifikasi): string[] {
  if (klasifikasi === 'Positif') return [REKOMENDASI_POOL[4]] // "Pantau ... secara berkala"
  const jumlah = level === 'Critical' ? 4 : level === 'High' ? 3 : level === 'Medium' ? 2 : 1
  return REKOMENDASI_POOL.slice(0, jumlah)
}

export interface HasilIsuEngine {
  daftarIsu: Isu[]
  daftarBerita: Berita[]
}

/** Bangun daftarIsu + daftarBerita dari array BeritaRaw aktif (upload atau default). */
export function bangunIsuDariBerita(sumberBerita: BeritaRaw[]): HasilIsuEngine {
  const relevan = sumberBerita.filter(isRelevan)
  if (relevan.length === 0) return { daftarIsu: [], daftarBerita: [] }

  const klasterHasil = ringkasKlasterIsu(relevan, AMBANG_KEMIRIPAN_ISU)
  const isuIdByBerita = new Map<BeritaRaw, string>()

  const daftarIsu: Isu[] = klasterHasil
    .map((klaster, index) => {
      const rows = klaster.anggota
      const total = rows.length

      const jumlahPerSentimen: Record<Sentimen, number> = { Positif: 0, Netral: 0, Negatif: 0 }
      for (const r of rows) jumlahPerSentimen[sentimenEfektif(r)]++
      const sentimenDominan = (Object.entries(jumlahPerSentimen) as [Sentimen, number][]).sort(
        (a, b) => b[1] - a[1],
      )[0][0]
      const negatifRatio = jumlahPerSentimen.Negatif / total

      const kategori = nilaiMayoritas(rows.map((r) => r.kategori)) as KategoriIsu
      const entitasTerkait = nilaiMayoritas(rows.map((r) => entitasEfektif(r)))
      const level = levelDariRatio(negatifRatio, total)
      const klasifikasi = klasifikasiDariRatio(negatifRatio)
      const scope = scopeUntukEntitas(entitasTerkait)
      const opd = nilaiMayoritas(rows.map((r) => opdEfektif(r, kategori)))

      const urutanTanggal = [...rows].sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1))
      const tanggalMulai = urutanTanggal[0]?.tanggal ?? ''
      const urutanTerbaruDulu = [...urutanTanggal].reverse()
      const judulRelevanTerbaru = urutanTerbaruDulu.find((r) => /papua/i.test(r.judul))
      const namaIsu = (judulRelevanTerbaru ?? urutanTerbaruDulu[0])?.judul ?? 'Isu tanpa judul'

      const tanggalUnik = [...new Set(rows.map((r) => r.tanggal))].sort()
      const tengah = tanggalUnik[Math.floor(tanggalUnik.length / 2)]
      const jumlahAwal = rows.filter((r) => r.tanggal < tengah).length
      const jumlahAkhir = rows.filter((r) => r.tanggal >= tengah).length
      const trend: Trend = jumlahAkhir > jumlahAwal ? 'Naik' : jumlahAkhir < jumlahAwal ? 'Turun' : 'Stabil'

      // Virality score dihitung dari rasio negatif + volume pemberitaan + tren —
      // bukan angka acak seperti di data contoh.
      const volumeScore = Math.min(40, total * 4)
      const trendBonus = trend === 'Naik' ? 15 : trend === 'Stabil' ? 5 : 0
      const viralityScore = Math.round(Math.min(99, negatifRatio * 45 + volumeScore + trendBonus))

      const sumberUtama = [...new Set(rows.map((r) => getJenisSumber(r.sumber)))] as JenisSumber[]

      const id = `isu-${index + 1}-${scope.toLowerCase().replace(/\s+/g, '-')}`
      for (const r of rows) isuIdByBerita.set(r, id)

      return {
        id,
        namaIsu,
        scope,
        kategori,
        opd,
        entitasTerkait,
        klasifikasi,
        levelRisiko: level,
        viralityScore,
        estimasiEskalasi: estimasiEskalasiUntuk(klasifikasi, level),
        jumlahBerita: total,
        sentimenDominan,
        ringkasanAI: ringkasanUntuk(namaIsu, sentimenDominan),
        penyebabAI: penyebabUntuk(kategori),
        risikoAI: risikoUntuk(level),
        rekomendasiAI: rekomendasiUntuk(level, klasifikasi),
        sumberUtama: sumberUtama.length ? sumberUtama : (['Media Online'] as JenisSumber[]),
        tanggalMulai,
        trend,
      }
    })
    .sort((a, b) => b.jumlahBerita - a.jumlahBerita)

  const petaIsuById = new Map(daftarIsu.map((isu) => [isu.id, isu]))

  const daftarBerita: Berita[] = relevan
    .map((r, i) => {
      const isuId = isuIdByBerita.get(r)
      const isuAcuan = isuId ? petaIsuById.get(isuId) : undefined
      const sentimen = sentimenEfektif(r)
      const kategori = (r.kategori as KategoriIsu) ?? isuAcuan?.kategori ?? 'Administrasi & Pemerintahan'
      const adaKurasi = !!(r as any).sentimen_kurasi || !!(r as any).framing_kinerja
      return {
        id: `berita-${i + 1}`,
        isuId: isuAcuan?.id ?? '',
        tanggal: r.tanggal,
        judul: r.judul,
        sumber: r.sumber,
        jenisSumber: getJenisSumber(r.sumber),
        opd: isuAcuan?.opd ?? opdEfektif(r, kategori),
        entitasTerkait: entitasEfektif(r),
        kategori,
        sentimen,
        levelRisiko: levelDariSentimen(sentimen),
        // Confidence di sini menandakan apakah artikel sudah melalui kurasi AI
        // (nilai lebih bisa dipercaya) atau masih hasil klasifikasi otomatis IMD —
        // bukan angka acak seperti pada data contoh.
        confidenceScore: adaKurasi ? 95 : 70,
        ringkasanAI: ringkasanUntuk(r.judul, sentimen),
        url: r.url,
        platform: (r as any).platform,
        engagement: (r as any).engagement,
        username: (r as any).username,
        isi: r.isi,
      }
    })
    .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))

  return { daftarIsu, daftarBerita }
}

/** Hook: daftarIsu + daftarBerita dari data aktif (useBerita()), dihitung ulang
 *  otomatis setiap kali data upload berubah. */
export function useIsuEngine(): HasilIsuEngine {
  const { berita } = useBerita()
  return useMemo(() => bangunIsuDariBerita(berita), [berita])
}

export function cariIsuById(daftarIsu: Isu[], id: string): Isu | undefined {
  return daftarIsu.find((isu) => isu.id === id)
}

export function cariBeritaUntukIsu(daftarBerita: Berita[], isuId: string): Berita[] {
  return daftarBerita.filter((b) => b.isuId === isuId)
}

export { ambilIsuUntukTampilan }
