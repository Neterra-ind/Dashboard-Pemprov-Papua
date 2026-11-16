// Mengelompokkan berita jadi "isu" berdasarkan kemiripan judul + potongan awal isi
// (event-level), menggantikan pendekatan lama yang mengelompokkan per kategori x
// entitas (yang hanya menghasilkan ~20-30 "isu" kategori besar, bukan topik/event
// spesifik yang diberitakan berulang oleh banyak media).

const PANJANG_ISI_UNTUK_KLASTER = 220

function normalisasiTeks(teks: string): string {
  let t = teks.replace(/\[.*?\]/g, '').toLowerCase()
  t = t.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  return t
}

/** Buang " - NamaMedia" di akhir judul sebelum dinormalisasi. */
function bersihkanJudul(judul: string): string {
  return judul.replace(/\s*-\s*[A-Za-z0-9. ]+$/, '')
}

function bigramKata(teks: string): Set<string> {
  const kata = teks.split(' ').filter(Boolean)
  const bigram = new Set<string>()
  for (let i = 0; i < kata.length - 1; i++) bigram.add(kata[i] + ' ' + kata[i + 1])
  if (kata.length === 1) bigram.add(kata[0])
  return bigram
}

function skorKemiripan(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let irisan = 0
  for (const x of a) if (b.has(x)) irisan++
  return (2 * irisan) / (a.size + b.size)
}

function buatUnionFind(n: number) {
  const parent = Array.from({ length: n }, (_, i) => i)
  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }
  function union(a: number, b: number) {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[ra] = rb
  }
  return { find, union }
}

export interface TeksBeritaUntukKlaster {
  judul: string
  isi?: string
}

/**
 * Gabungkan judul (bobot 2x, karena lebih padat makna) dengan potongan awal isi,
 * lalu bandingkan bigram-nya. Mengurangi risiko klaster terpecah hanya karena
 * judul ditulis ulang beda gaya oleh redaksi yang berbeda.
 */
function bigramGabunganUntukKlaster(item: TeksBeritaUntukKlaster): Set<string> {
  const judulBersih = normalisasiTeks(bersihkanJudul(item.judul))
  const isiPotongan = normalisasiTeks((item.isi ?? '').slice(0, PANJANG_ISI_UNTUK_KLASTER))
  return bigramKata(`${judulBersih} ${judulBersih} ${isiPotongan}`)
}

/**
 * Kelompokkan array berita jadi klaster isu berdasarkan kemiripan judul+isi.
 * @returns array berisi nomor klaster (indeks representatif) untuk tiap item,
 *          sejajar dengan `items` — items[i] masuk klaster klasterIds[i].
 */
export function klasterkanBerita<T extends TeksBeritaUntukKlaster>(
  items: T[],
  ambang = 0.5,
): number[] {
  const n = items.length
  const bigramPerItem = items.map(bigramGabunganUntukKlaster)
  const { find, union } = buatUnionFind(n)

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (skorKemiripan(bigramPerItem[i], bigramPerItem[j]) >= ambang) {
        union(i, j)
      }
    }
  }
  return items.map((_, i) => find(i))
}

export interface KlasterIsuRingkas<T> {
  klasterId: number
  jumlahBerita: number
  contohJudul: string
  anggota: T[]
}

/** Ringkas hasil klasterkanBerita jadi daftar isu terurut dari paling banyak diberitakan. */
export function ringkasKlasterIsu<T extends TeksBeritaUntukKlaster>(
  items: T[],
  ambang = 0.5,
): KlasterIsuRingkas<T>[] {
  if (items.length === 0) return []
  const klasterIds = klasterkanBerita(items, ambang)
  const map = new Map<number, T[]>()
  klasterIds.forEach((id, i) => {
    if (!map.has(id)) map.set(id, [])
    map.get(id)!.push(items[i])
  })
  return Array.from(map.entries())
    .map(([klasterId, anggota]) => ({
      klasterId,
      jumlahBerita: anggota.length,
      contohJudul: anggota[0].judul,
      anggota,
    }))
    .sort((a, b) => b.jumlahBerita - a.jumlahBerita)
}

/** Ambil nilai yang paling sering muncul di antara anggota klaster (mayoritas). */
export function nilaiMayoritas<T>(nilai: T[]): T {
  const hitung = new Map<T, number>()
  for (const v of nilai) hitung.set(v, (hitung.get(v) ?? 0) + 1)
  return [...hitung.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

export type ScopeIsuGenerik = 'Provinsi' | 'Gubernur' | 'Wakil Gubernur'

const BATAS_ISU_PROVINSI = 10

/**
 * Pilih isu yang ditampilkan di halaman sesuai scope-nya:
 * - Provinsi (isu Papua/Provinsi secara umum): dibatasi top 10 berdasarkan jumlahBerita.
 * - Gubernur, Wakil Gubernur, OPD: semua isu ditampilkan, tetap diurutkan dari
 *   jumlahBerita terbanyak supaya isu paling ramai ada di atas.
 */
export function ambilIsuUntukTampilan<T extends { jumlahBerita: number }>(
  daftarIsu: T[],
  scope: ScopeIsuGenerik,
): T[] {
  const terurut = [...daftarIsu].sort((a, b) => b.jumlahBerita - a.jumlahBerita)
  if (scope === 'Provinsi') {
    return terurut.slice(0, BATAS_ISU_PROVINSI)
  }
  return terurut
}
