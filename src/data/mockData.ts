import type {
  AlertNotifikasi,
  Berita,
  EntitasPimpinan,
  Isu,
  JenisSumber,
  KategoriIsu,
  Klasifikasi,
  LevelRisiko,
  Opd,
  RankingOpd,
  ReputasiPimpinan,
  ScopeIsu,
  Sentimen,
  TindakLanjut,
  Trend,
} from '@/types'
import beritaPapuaMentah from './beritaPapua.json'
import { ambilIsuUntukTampilan, nilaiMayoritas, ringkasKlasterIsu } from '@/lib/klasterIsu'

// Dashboard Issue Monitoring — Pemprov Papua.
// PLACEHOLDER: src/data/beritaPapua.json saat ini berisi 642 berita CONTOH (judul diawali
// "[CONTOH]", sumber "Media Contoh A-F", url "#") — BUKAN berita riil. Ganti dengan hasil
// monitoring media Papua begitu datanya tersedia (format kolom sama: tanggal, judul, sumber,
// sentimen, url, kategori, entitasTerkait). Field lain (skor virality, rekomendasi tindak
// lanjut, riwayat disposisi) tetap simulasi untuk kebutuhan demo antarmuka.

// Seeded PRNG (mulberry32) supaya data mock konsisten setiap reload, bukan acak tiap render.
function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rng = mulberry32(20260728)

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function pickMany<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5)
  return shuffled.slice(0, Math.min(n, arr.length))
}

function randomInt(min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min
}

function tanggalMundur(hariKe: number) {
  const d = new Date()
  d.setDate(d.getDate() - hariKe)
  return d.toISOString().slice(0, 10)
}

export const daftarOpd: Opd[] = [
  'Dinas Kesehatan',
  'Dinas Pendidikan',
  'Dinas Pekerjaan Umum',
  'Dinas Perhubungan',
  'Dinas Sosial',
  'Dinas Ketahanan Pangan, Kelautan dan Pertanian',
  'Dinas Pariwisata dan Ekonomi Kreatif',
  'Dinas Perindustrian dan Energi',
  'Dinas Lingkungan Hidup',
  'Dinas Komunikasi dan Informatika',
  'Dinas Perumahan Rakyat dan Kawasan Permukiman',
  'Satuan Polisi Pamong Praja',
  'Sekretariat Daerah Provinsi Papua',
  'Pemerintah Kabupaten/Kota',
]

export const daftarKategoriIsu: KategoriIsu[] = [
  'Ekonomi, Keuangan & Industri',
  'Infrastruktur',
  'Administrasi & Pemerintahan',
  'Politik & Kebijakan',
  'Kesehatan',
  'Kebencanaan',
  'Hukum & HAM',
  'Koperasi & UMKM',
  'Sosial, Budaya & Pariwisata',
  'Energi, SDA & Lingkungan',
  'Pendidikan & IPTEK',
  'Agro-Maritim',
  'Pemuda & Olahraga',
  'Ketenagakerjaan',
  'Pertahanan & Ideologi',
  'Perhubungan',
  'Pemilu & Politik Praktis',
  'Agraria dan Tata Ruang',
  'Kependudukan',
  'Pemberdayaan Perempuan & Perlindungan Anak',
  'Pembangunan Desa',
]

export const daftarJenisSumber: JenisSumber[] = ['Media Online', 'Media Sosial']

const SENTIMEN: Sentimen[] = ['Positif', 'Netral', 'Negatif']

function levelDariSentimen(sentimen: Sentimen): LevelRisiko {
  if (sentimen === 'Negatif') return pick(['Medium', 'High', 'Critical'])
  if (sentimen === 'Netral') return pick(['Low', 'Medium'])
  return 'Low'
}

function viralityScoreUntuk(level: LevelRisiko) {
  const range: Record<LevelRisiko, [number, number]> = {
    Low: [5, 30],
    Medium: [25, 55],
    High: [50, 85],
    Critical: [75, 99],
  }
  const [min, max] = range[level]
  return randomInt(min, max)
}

function estimasiEskalasiUntuk(klasifikasi: Klasifikasi, level: LevelRisiko) {
  if (klasifikasi === 'Positif') return 'Tidak ada indikasi eskalasi negatif.'
  const map: Record<LevelRisiko, string> = {
    Low: 'Rendah — kemungkinan mereda dengan sendirinya dalam 3-5 hari.',
    Medium: 'Sedang — berpotensi membesar dalam 3-5 hari bila tidak direspons.',
    High: 'Tinggi — berpotensi membesar dalam 1-2 hari bila dibiarkan.',
    Critical: 'Sangat tinggi — berpotensi viral dan menjadi krisis komunikasi dalam 24 jam.',
  }
  return map[level]
}

function ringkasanUntuk(judul: string, sentimen: Sentimen) {
  const dampak =
    sentimen === 'Negatif'
      ? 'berisiko menjadi sorotan publik lebih luas bila tidak segera ditindaklanjuti'
      : sentimen === 'Netral'
        ? 'masih dalam tahap pemantauan, belum menunjukkan eskalasi signifikan'
        : 'mendapat respons positif dari masyarakat dan media'
  return `${judul}. Isu ini ${dampak}.`
}

function penyebabUntuk(kategori: KategoriIsu) {
  const map: Record<KategoriIsu, string> = {
    'Ekonomi, Keuangan & Industri': 'Fluktuasi harga dan ketimpangan arus logistik antarwilayah.',
    Infrastruktur: 'Keterbatasan anggaran pemeliharaan dan koordinasi lintas OPD.',
    'Administrasi & Pemerintahan': 'Proses birokrasi dinilai belum sepenuhnya transparan bagi publik.',
    'Politik & Kebijakan': 'Kebijakan yang belum tersosialisasi memicu respons publik beragam.',
    Kesehatan: 'Keterbatasan tenaga dan fasilitas kesehatan di sejumlah wilayah.',
    Kebencanaan: 'Kepadatan permukiman dan minimnya mitigasi dini di kawasan rawan.',
    'Hukum & HAM': 'Proses penegakan hukum belum menjawab harapan masyarakat.',
    'Koperasi & UMKM': 'Akses permodalan dan pasar produk lokal masih terbatas.',
    'Sosial, Budaya & Pariwisata': 'Penyaluran bantuan dan pengembangan wisata belum optimal.',
    'Energi, SDA & Lingkungan': 'Pengelolaan SDA dan isu pencemaran menjadi sorotan publik.',
    'Pendidikan & IPTEK': 'Ketimpangan fasilitas dan distribusi tenaga pendidik antarwilayah.',
    'Agro-Maritim': 'Produksi pertanian dan perikanan terhambat oleh keterbatasan infrastruktur.',
    'Pemuda & Olahraga': 'Fasilitas dan program pemberdayaan pemuda belum merata.',
    Ketenagakerjaan: 'Ketimpangan serapan tenaga kerja lokal di sektor industri.',
    'Pertahanan & Ideologi': 'Situasi keamanan memerlukan pendekatan komprehensif lintas sektor.',
    Perhubungan: 'Konektivitas transportasi antarpulau dan antardistrik masih terbatas.',
    'Pemilu & Politik Praktis': 'Tahapan pemilu memerlukan pengawasan dan koordinasi ketat.',
    'Agraria dan Tata Ruang': 'Sengketa lahan dan tata ruang memerlukan kepastian hukum.',
    Kependudukan: 'Data kependudukan yang belum mutakhir menghambat perencanaan layanan.',
    'Pemberdayaan Perempuan & Perlindungan Anak': 'Kasus kekerasan dan ketimpangan gender masih menjadi isu strategis.',
    'Pembangunan Desa': 'Penyaluran dana desa dan pengawasan pembangunan kampung perlu diperkuat.',
  }
  return map[kategori]
}

function risikoUntuk(level: LevelRisiko) {
  const map: Record<LevelRisiko, string> = {
    Low: 'Risiko rendah, dapat ditangani melalui mekanisme rutin OPD.',
    Medium: 'Risiko sedang, berpotensi menjadi perhatian media dalam waktu dekat.',
    High: 'Risiko tinggi, berpotensi memicu tekanan publik bila tidak direspons cepat.',
    Critical: 'Risiko kritis, berpotensi eskalasi cepat dan menjadi krisis komunikasi.',
  }
  return map[level]
}

const REKOMENDASI_POOL = [
  'Instruksikan OPD terkait untuk klarifikasi publik dalam 1x24 jam',
  'Jadwalkan sidak/kunjungan langsung ke lokasi isu',
  'Siapkan siaran pers resmi melalui Biro Komunikasi Publik',
  'Libatkan camat/lurah setempat untuk mediasi dengan warga',
  'Pantau perkembangan isu di media sosial secara berkala',
  'Koordinasikan penanganan dengan OPD lintas sektor terkait',
  'Verifikasi kebenaran informasi sebelum merespons publik',
]

const KATEGORI_OPD_MAP: Record<KategoriIsu, Opd> = {
  'Ekonomi, Keuangan & Industri': 'Dinas Perindustrian dan Energi',
  Infrastruktur: 'Dinas Pekerjaan Umum',
  'Administrasi & Pemerintahan': 'Sekretariat Daerah Provinsi Papua',
  'Politik & Kebijakan': 'Sekretariat Daerah Provinsi Papua',
  Kesehatan: 'Dinas Kesehatan',
  Kebencanaan: 'Dinas Pekerjaan Umum',
  'Hukum & HAM': 'Sekretariat Daerah Provinsi Papua',
  'Koperasi & UMKM': 'Dinas Perindustrian dan Energi',
  'Sosial, Budaya & Pariwisata': 'Dinas Pariwisata dan Ekonomi Kreatif',
  'Energi, SDA & Lingkungan': 'Dinas Lingkungan Hidup',
  'Pendidikan & IPTEK': 'Dinas Pendidikan',
  'Agro-Maritim': 'Dinas Ketahanan Pangan, Kelautan dan Pertanian',
  'Pemuda & Olahraga': 'Dinas Sosial',
  Ketenagakerjaan: 'Dinas Perindustrian dan Energi',
  'Pertahanan & Ideologi': 'Satuan Polisi Pamong Praja',
  Perhubungan: 'Dinas Perhubungan',
  'Pemilu & Politik Praktis': 'Sekretariat Daerah Provinsi Papua',
  'Agraria dan Tata Ruang': 'Dinas Pekerjaan Umum',
  Kependudukan: 'Dinas Komunikasi dan Informatika',
  'Pemberdayaan Perempuan & Perlindungan Anak': 'Dinas Sosial',
  'Pembangunan Desa': 'Pemerintah Kabupaten/Kota',
}

// Kalimat aktif ringkas (maks. 6-8 kata) per klaster kategori×entitas, ditulis berdasarkan
// substansi riil berita bersentimen negatif pada klaster tersebut — dipakai pada Issues
// Negatif agar penamaan isu langsung menggambarkan masalah di berita, bukan frasa generik.
// Masih kosong: diisi setelah berita riil Papua tersedia (kunci 'Kategori::Entitas' atau
// 'Kategori::none'). Sementara semua isu memakai kerangka SOROTAN_AKTIF_MAP di bawah.
const SUBSTANSI_SPESIFIK_MAP: Record<string, string> = {}

// Kerangka kalimat aktif ringkas per kategori — cadangan bila klaster kategori×entitas belum
// memiliki kalimat spesifik di SUBSTANSI_SPESIFIK_MAP di atas.
const SOROTAN_AKTIF_MAP: Record<KategoriIsu, string> = {
  'Ekonomi, Keuangan & Industri': 'Publik menyoroti ekonomi dan keuangan daerah',
  Infrastruktur: 'Publik menyoroti kondisi infrastruktur',
  'Administrasi & Pemerintahan': 'Publik menyoroti tata kelola pemerintahan',
  'Politik & Kebijakan': 'Publik menyoroti kebijakan pemerintah',
  Kesehatan: 'Publik menyoroti isu kesehatan',
  Kebencanaan: 'Publik menyoroti penanganan bencana',
  'Hukum & HAM': 'Publik menyoroti penegakan hukum dan HAM',
  'Koperasi & UMKM': 'Publik menyoroti pengembangan UMKM',
  'Sosial, Budaya & Pariwisata': 'Publik menyoroti isu sosial, budaya dan pariwisata',
  'Energi, SDA & Lingkungan': 'Publik menyoroti pengelolaan SDA dan lingkungan',
  'Pendidikan & IPTEK': 'Publik menyoroti isu pendidikan dan iptek',
  'Agro-Maritim': 'Publik menyoroti sektor pertanian dan kelautan',
  'Pemuda & Olahraga': 'Publik menyoroti pemberdayaan pemuda dan olahraga',
  Ketenagakerjaan: 'Publik menyoroti isu ketenagakerjaan',
  'Pertahanan & Ideologi': 'Publik menyoroti situasi pertahanan dan ideologi',
  Perhubungan: 'Publik menyoroti transportasi dan perhubungan',
  'Pemilu & Politik Praktis': 'Publik menyoroti penyelenggaraan pemilu',
  'Agraria dan Tata Ruang': 'Publik menyoroti agraria dan tata ruang',
  Kependudukan: 'Publik menyoroti isu kependudukan',
  'Pemberdayaan Perempuan & Perlindungan Anak': 'Publik menyoroti isu perempuan dan anak',
  'Pembangunan Desa': 'Publik menyoroti pembangunan desa dan kampung',
}

function substansiMasalahDari(kategori: KategoriIsu, entitasTerkait: EntitasPimpinan | undefined): string {
  const kunci = `${kategori}::${entitasTerkait ?? 'none'}`
  const spesifik = SUBSTANSI_SPESIFIK_MAP[kunci]
  if (spesifik) return `${spesifik}.`
  const sorotan = SOROTAN_AKTIF_MAP[kategori]
  const klausaEntitas = entitasTerkait ? ` melibatkan ${entitasTerkait} Papua` : ''
  return `${sorotan}${klausaEntitas}.`
}

const substansiMasalahById = new Map<string, string>()

export function substansiMasalahUntuk(isu: Isu): string {
  return substansiMasalahById.get(isu.id) ?? isu.namaIsu
}

function scopeUntukEntitas(entitasTerkait?: EntitasPimpinan): ScopeIsu {
  if (entitasTerkait === 'Gubernur') return 'Gubernur'
  // Wakil Gubernur diperlakukan sebagai Provinsi agar beritanya muncul di
  // Isu Papua (Provinsi), bukan hanya di tab Isu Pimpinan Wagub.
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

// ── Data Sumber (berita/postingan mentah) ──────────────────────────────────
// Format JSON diisi dari hasil kurasi AI (skill kurasi-ai-imd).
// Kolom kurasi (sentimen_kurasi, subjek_query) digunakan sebagai override
// bila ada — sehingga data IMD mentah yang belum dikurasi tetap bisa dibaca,
// tapi data terkurasi langsung menggunakan nilai yang sudah dikoreksi AI.
interface BeritaMentah {
  tanggal: string
  judul: string
  isi?: string
  sumber: string
  sentimen: Sentimen
  url: string
  kategori: KategoriIsu
  entitasTerkait?: EntitasPimpinan
  // Kolom opsional hasil kurasi AI (dari skill kurasi-ai-imd)
  sentimen_kurasi?: string   // override sentimen — Positif|Negatif|Netral|Campuran
  subjek_query?: string      // override entitasTerkait — Gubernur|Wakil Gubernur|Pemprov|Papua|Tidak Relevan
}

function normalisasiBerita(b: BeritaMentah): BeritaMentah {
  // Gunakan sentimen_kurasi (berbasis citra pemerintah) sebagai override sentimen
  // otomatis IMD (berbasis tone topik) bila kolom kurasi tersedia.
  const sentimenFinal: Sentimen =
    b.sentimen_kurasi === 'Positif' || b.sentimen_kurasi === 'Negatif' || b.sentimen_kurasi === 'Netral'
      ? b.sentimen_kurasi
      : b.sentimen_kurasi === 'Campuran'
        ? 'Netral'
        : b.sentimen

  // Gunakan subjek_query dari kurasi untuk menentukan entitasTerkait bila field
  // entitasTerkait belum di-set (backward compat dengan JSON lama).
  let entitasFinal = b.entitasTerkait
  if (entitasFinal == null && b.subjek_query) {
    if (b.subjek_query === 'Gubernur') entitasFinal = 'Gubernur'
    else if (b.subjek_query === 'Wakil Gubernur') entitasFinal = 'Wakil Gubernur'
  }

  return { ...b, sentimen: sentimenFinal, entitasTerkait: entitasFinal }
}

// Filter hanya berita yang relevan Papua: buang baris "Tidak Relevan" dari kurasi,
// atau (bila belum dikurasi) buang artikel yang tidak menyebut Papua sama sekali.
// Ini membuang ~2.378 artikel nasional/tidak relevan (promo, cuaca, dll.) yang
// masuk ke feed monitoring tanpa melalui proses kurasi.
const beritaMentah = (beritaPapuaMentah as BeritaMentah[])
  .filter(
    (b) =>
      b.subjek_query !== 'Tidak Relevan' &&
      (b.entitasTerkait != null ||
        b.subjek_query != null ||
        /papua/i.test(b.judul) ||
        (b.isi != null && /papua/i.test(b.isi))),
  )
  .map(normalisasiBerita)

// ── Isu — diklasterkan dari kemiripan judul+isi berita riil (unit analisis =
// topik/event, bukan kategori×entitas) ────────────────────────────────────
// Setiap klaster berisi berita yang membahas kejadian yang sama (dilihat dari
// kemiripan judul dan potongan awal isi), dari media berbeda sekalipun. Kategori,
// entitas terkait, sentimen dominan, severity, dan tren dihitung dari anggota
// klaster tersebut — bukan lagi dari kombinasi kategori×entitas yang terlalu lebar
// (hanya menghasilkan ~20-30 "isu" kategori besar, bukan topik spesifik).
const AMBANG_KEMIRIPAN_ISU = 0.5

const klasterHasil = ringkasKlasterIsu(beritaMentah, AMBANG_KEMIRIPAN_ISU)

// Peta dari tiap baris berita mentah (by reference) ke id isu klasternya —
// dipakai di bawah untuk membangun daftarBerita tanpa bergantung pada key
// kategori::entitas yang sudah tidak jadi unit analisis isu.
const isuIdByBerita = new WeakMap<BeritaMentah, string>()

export const daftarIsu: Isu[] = klasterHasil
  .map((klaster, index) => {
    const rows = klaster.anggota
    const total = rows.length
    const jumlahPerSentimen: Record<Sentimen, number> = { Positif: 0, Netral: 0, Negatif: 0 }
    for (const r of rows) jumlahPerSentimen[r.sentimen]++
    const sentimenDominan = (Object.entries(jumlahPerSentimen) as [Sentimen, number][]).sort(
      (a, b) => b[1] - a[1],
    )[0][0]
    const negatifRatio = jumlahPerSentimen.Negatif / total

    // Kategori & entitas isu diambil dari mayoritas anggota klaster — karena unit
    // analisisnya kini per-topik, 1 isu idealnya satu kategori yang sama, tapi
    // klaster yang longgar (ambang rendah) bisa saja mencampur sedikit kategori.
    const kategori = nilaiMayoritas(rows.map((r) => r.kategori))
    const entitasTerkait = nilaiMayoritas(rows.map((r) => r.entitasTerkait))

    const level = levelDariRatio(negatifRatio, total)
    const klasifikasi = klasifikasiDariRatio(negatifRatio)
    const scope = scopeUntukEntitas(entitasTerkait)
    const opd = KATEGORI_OPD_MAP[kategori]

    const urutanTanggal = [...rows].sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1))
    const tanggalMulai = urutanTanggal[0].tanggal
    // Utamakan judul yang secara eksplisit menyebut Papua sebagai representasi isu,
    // agar daftar isu (mis. Top 10 Isu Provinsi Papua) tidak menampilkan judul yang
    // sebenarnya membahas daerah/topik lain meski kontennya sempat menyinggung Papua.
    const urutanTerbaruDulu = [...urutanTanggal].reverse()
    const judulRelevanTerbaru = urutanTerbaruDulu.find((r) => /papua/i.test(r.judul))
    const namaIsu = (judulRelevanTerbaru ?? urutanTerbaruDulu[0]).judul

    const tanggalUnik = [...new Set(rows.map((r) => r.tanggal))].sort()
    const tengah = tanggalUnik[Math.floor(tanggalUnik.length / 2)]
    const jumlahAwal = rows.filter((r) => r.tanggal < tengah).length
    const jumlahAkhir = rows.filter((r) => r.tanggal >= tengah).length
    const trend: Trend = jumlahAkhir > jumlahAwal ? 'Naik' : jumlahAkhir < jumlahAwal ? 'Turun' : 'Stabil'

    const id = `isu-${index + 1}-${scope.toLowerCase().replace(/\s+/g, '-')}`
    substansiMasalahById.set(id, substansiMasalahDari(kategori, entitasTerkait))
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
      viralityScore: viralityScoreUntuk(level),
      estimasiEskalasi: estimasiEskalasiUntuk(klasifikasi, level),
      jumlahBerita: total,
      sentimenDominan,
      ringkasanAI: ringkasanUntuk(namaIsu, sentimenDominan),
      penyebabAI: penyebabUntuk(kategori),
      risikoAI: risikoUntuk(level),
      rekomendasiAI: pickMany(REKOMENDASI_POOL, randomInt(2, 4)),
      sumberUtama: ['Media Online'] as JenisSumber[],
      tanggalMulai,
      trend,
    }
  })
  .sort((a, b) => b.jumlahBerita - a.jumlahBerita)

// Isu Provinsi dibatasi top 10 (volume isu tingkat provinsi bisa sangat banyak dan
// kurang fokus bila ditampilkan semua). Isu Gubernur/Wakil Gubernur/OPD ditampilkan
// lengkap — lihat ambilIsuUntukTampilan di src/lib/klasterIsu.ts.
export const daftarIsuProvinsi = ambilIsuUntukTampilan(
  daftarIsu.filter((isu) => isu.scope === 'Provinsi'),
  'Provinsi',
)
export const daftarIsuGubernur = ambilIsuUntukTampilan(
  daftarIsu.filter((isu) => isu.entitasTerkait === 'Gubernur'),
  'Gubernur',
)
export const daftarIsuWakilGubernur = ambilIsuUntukTampilan(
  daftarIsu.filter((isu) => isu.entitasTerkait === 'Wakil Gubernur'),
  'Wakil Gubernur',
)

export const daftarEarlyWarning: Isu[] = daftarIsu.filter(
  (isu) => isu.klasifikasi === 'Negatif' || isu.klasifikasi === 'Potensi Negatif',
)

export function isuById(id: string): Isu | undefined {
  return daftarIsu.find((isu) => isu.id === id)
}

const petaIsuById = new Map(daftarIsu.map((isu) => [isu.id, isu]))

export const daftarBerita: Berita[] = beritaMentah
  .map((r, i) => {
    const isuId = isuIdByBerita.get(r)!
    const isuAcuan = petaIsuById.get(isuId)!
    return {
      id: `berita-${i + 1}`,
      isuId: isuAcuan.id,
      tanggal: r.tanggal,
      judul: r.judul,
      sumber: r.sumber,
      jenisSumber: 'Media Online' as JenisSumber,
      opd: isuAcuan.opd,
      entitasTerkait: r.entitasTerkait,
      kategori: r.kategori,
      sentimen: r.sentimen,
      levelRisiko: levelDariSentimen(r.sentimen),
      confidenceScore: randomInt(70, 99),
      ringkasanAI: ringkasanUntuk(r.judul, r.sentimen),
      url: r.url,
    }
  })
  .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))

export function beritaUntukIsu(isuId: string): Berita[] {
  return daftarBerita.filter((b) => b.isuId === isuId)
}

// ── Reputasi / Share of Voice Gubernur & Wakil Gubernur ────────────────────
function buatReputasiPimpinan(entitas: EntitasPimpinan, nama: string): ReputasiPimpinan {
  const positiveRatio = randomInt(35, 80)
  const negativeRatio = randomInt(5, Math.max(6, 100 - positiveRatio - 10))
  const isuTerkait = entitas === 'Gubernur' ? daftarIsuGubernur : daftarIsuWakilGubernur
  return {
    entitas,
    nama,
    shareOfVoiceRatio: randomInt(15, 65),
    positiveRatio,
    negativeRatio,
    engagementRate: Number((rng() * 10 + 1).toFixed(1)),
    topIsu: pickMany([...new Set(isuTerkait.map((isu) => isu.kategori))], 3),
    trendData: Array.from({ length: 14 }, (_, hari) => ({
      tanggal: tanggalMundur(13 - hari),
      nilai: randomInt(20, 100),
    })),
  }
}

export const daftarReputasiPimpinan: ReputasiPimpinan[] = [
  buatReputasiPimpinan('Gubernur', 'Matius D. Fakhiri'),
  buatReputasiPimpinan('Wakil Gubernur', 'Aryoko Rumaropen'),
]

export function reputasiByEntitas(entitas: EntitasPimpinan): ReputasiPimpinan | undefined {
  return daftarReputasiPimpinan.find((r) => r.entitas === entitas)
}

// ── Ranking OPD (Module B — Pemberitaan OPD) ───────────────────────────────
export const daftarRankingOpd: RankingOpd[] = daftarOpd
  .map((opd) => {
    const isuOpd = daftarIsu.filter((isu) => isu.opd === opd)
    return {
      opd,
      jumlahBerita: isuOpd.reduce((total, isu) => total + isu.jumlahBerita, 0),
      jumlahPositif: isuOpd.filter((isu) => isu.klasifikasi === 'Positif').length,
      jumlahNegatif: isuOpd.filter((isu) => isu.klasifikasi === 'Negatif' || isu.klasifikasi === 'Potensi Negatif')
        .length,
      severityScore: Math.round(
        isuOpd.reduce((total, isu) => total + viralityScoreUntuk(isu.levelRisiko), 0) /
          Math.max(isuOpd.length, 1),
      ),
    }
  })
  .sort((a, b) => b.jumlahBerita - a.jumlahBerita)

// ── Tindak Lanjut / Disposisi (seed) ───────────────────────────────────────
const calonDisposisi = daftarEarlyWarning.slice(0, 10)
const STATUS_SEED: Array<'Didisposisikan' | 'Diproses' | 'Selesai'> = [
  'Didisposisikan',
  'Diproses',
  'Selesai',
]

export const seedTindakLanjut: TindakLanjut[] = calonDisposisi.slice(0, 6).map((isu, i) => {
  const status = STATUS_SEED[i % STATUS_SEED.length]
  return {
    id: `tl-${i + 1}`,
    isuId: isu.id,
    opdTujuan: isu.opd,
    catatanArahan: 'Mohon segera diklarifikasi ke publik dan laporkan progres penanganan dalam 2x24 jam.',
    didisposisikanOleh: isu.entitasTerkait ?? 'Sekda',
    tanggalDisposisi: tanggalMundur(randomInt(1, 10)),
    status,
    catatanTindakLanjut:
      status === 'Selesai'
        ? 'Sudah dilakukan klarifikasi ke media dan penanganan lapangan, isu dinyatakan selesai.'
        : status === 'Diproses'
          ? 'Tim OPD sedang turun ke lapangan untuk verifikasi dan penanganan awal.'
          : undefined,
    tanggalTindakLanjut: status === 'Didisposisikan' ? undefined : tanggalMundur(randomInt(0, 5)),
  }
})

// ── Riwayat Alert Notifikasi (WhatsApp/Telegram) ───────────────────────────
export const daftarAlertNotifikasi: AlertNotifikasi[] = daftarEarlyWarning
  .filter((isu) => isu.levelRisiko === 'High' || isu.levelRisiko === 'Critical')
  .slice(0, 12)
  .map((isu, i) => ({
    id: `alert-${i + 1}`,
    isuId: isu.id,
    pesan: `Isu ${isu.klasifikasi === 'Potensi Negatif' ? 'Potensi Negatif' : 'Negatif'} — ${isu.namaIsu} (Severity ${isu.levelRisiko})`,
    channel: pick<'WhatsApp' | 'Telegram'>(['WhatsApp', 'Telegram']),
    tanggal: tanggalMundur(randomInt(0, 7)),
    penerima: pick(['Sekda', 'Kepala Diskominfo', 'Tim Humas']),
  }))
  .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))

export const semuaLevelRisiko: LevelRisiko[] = ['Low', 'Medium', 'High', 'Critical']
export const semuaSentimenList: Sentimen[] = SENTIMEN
export const semuaKlasifikasi: Klasifikasi[] = ['Positif', 'Negatif', 'Potensi Negatif']
export const semuaScopeIsu: ScopeIsu[] = ['Nasional', 'Provinsi', 'Gubernur', 'Wakil Gubernur']

export const daftarNarasumber = [
  { nama: 'Prabowo', jabatan: 'Presiden RI', kunci: ['Prabowo'] },
  { nama: 'Gibran Rakabuming', jabatan: 'Wakil Presiden RI', kunci: ['Gibran'] },
  { nama: 'Bahlil Lahadalia', jabatan: 'Menteri ESDM', kunci: ['Bahlil'] },
  { nama: 'Matius D. Fakhiri', jabatan: 'Gubernur Papua', kunci: ['Matius', 'Fakhiri'] },
  { nama: 'Aryoko Rumaropen', jabatan: 'Wakil Gubernur Papua', kunci: ['Aryoko', 'Rumaropen'] },
]
