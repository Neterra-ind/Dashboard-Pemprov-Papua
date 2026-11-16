// Domain types untuk prototype "Regional Media Analytics — Pemprov Papua",
// duplikat dari prototype dashboard monitoring isu daerah, dengan domain data
// disesuaikan untuk Provinsi Papua (Gubernur/Wakil Gubernur, OPD tingkat provinsi).

export type ScopeIsu = 'Nasional' | 'Provinsi' | 'Gubernur' | 'Wakil Gubernur'

export type EntitasPimpinan = 'Gubernur' | 'Wakil Gubernur'

export type Opd =
  | 'Dinas Kesehatan'
  | 'Dinas Pendidikan'
  | 'Dinas Pekerjaan Umum'
  | 'Dinas Perhubungan'
  | 'Dinas Sosial'
  | 'Dinas Ketahanan Pangan, Kelautan dan Pertanian'
  | 'Dinas Pariwisata dan Ekonomi Kreatif'
  | 'Dinas Perindustrian dan Energi'
  | 'Dinas Lingkungan Hidup'
  | 'Dinas Komunikasi dan Informatika'
  | 'Dinas Perumahan Rakyat dan Kawasan Permukiman'
  | 'Satuan Polisi Pamong Praja'
  | 'Sekretariat Daerah Provinsi Papua'
  | 'Pemerintah Kabupaten/Kota'

export type KategoriIsu =
  // 21 sektor Neterra — definisi lengkap di Kategori_Berita-Report_Evaluasi.docx
  | 'Ekonomi, Keuangan & Industri'
  | 'Infrastruktur'
  | 'Administrasi & Pemerintahan'
  | 'Politik & Kebijakan'
  | 'Kesehatan'
  | 'Kebencanaan'
  | 'Hukum & HAM'
  | 'Koperasi & UMKM'
  | 'Sosial, Budaya & Pariwisata'
  | 'Energi, SDA & Lingkungan'
  | 'Pendidikan & IPTEK'
  | 'Agro-Maritim'
  | 'Pemuda & Olahraga'
  | 'Ketenagakerjaan'
  | 'Pertahanan & Ideologi'
  | 'Perhubungan'
  | 'Pemilu & Politik Praktis'
  | 'Agraria dan Tata Ruang'
  | 'Kependudukan'
  | 'Pemberdayaan Perempuan & Perlindungan Anak'
  | 'Pembangunan Desa'

export type JenisSumber = 'Media Online' | 'Media Sosial'

export type Platform = 'Facebook' | 'Twitter' | 'YouTube' | 'Instagram' | 'TikTok' | 'Telegram'

/** Metrik engagement dari platform media sosial (IMD Socmed). */
export interface Engagement {
  like: number
  comment: number
  share: number
  quote: number
  view: number
}

export type Sentimen = 'Positif' | 'Netral' | 'Negatif'

/** Klasifikasi isu level (Module B PRD): Positif, Negatif, atau Potensi Negatif (Early Warning). */
export type Klasifikasi = 'Positif' | 'Negatif' | 'Potensi Negatif'

export type LevelRisiko = 'Low' | 'Medium' | 'High' | 'Critical'

export type Trend = 'Naik' | 'Turun' | 'Stabil'

export type StatusPenanganan =
  | 'Belum Ditindaklanjuti'
  | 'Didisposisikan'
  | 'Diproses'
  | 'Selesai'

export type Role = 'Eksekutif' | 'Admin OPD' | 'Super Admin'

export interface TitikTren {
  tanggal: string
  nilai: number
}

// ── Isu (inti dashboard, lintas Module A & B PRD) ──────────────────────────
export interface Isu {
  id: string
  namaIsu: string
  scope: ScopeIsu
  kategori: KategoriIsu
  opd: Opd
  entitasTerkait?: EntitasPimpinan
  klasifikasi: Klasifikasi
  levelRisiko: LevelRisiko
  viralityScore: number
  estimasiEskalasi: string
  jumlahBerita: number
  sentimenDominan: Sentimen
  ringkasanAI: string
  penyebabAI: string
  risikoAI: string
  rekomendasiAI: string[]
  sumberUtama: JenisSumber[]
  tanggalMulai: string
  trend: Trend
  tipe?: string
}

// Data Sumber — berita/postingan mentah
export interface Berita {
  id: string
  isuId: string
  tanggal: string
  judul: string
  sumber: string
  jenisSumber: JenisSumber
  opd: Opd
  entitasTerkait?: EntitasPimpinan
  kategori: KategoriIsu
  sentimen: Sentimen
  levelRisiko: LevelRisiko
  confidenceScore: number
  ringkasanAI: string
  url: string
  // Kolom tambahan untuk Media Sosial (dari IMD Socmed)
  platform?: Platform
  engagement?: Engagement
  username?: string
  isi?: string
}

/** Framing kinerja pemda/pimpinan — taksonomi Neterra. */
export type FramingKinerja =
  | 'Respons'
  | 'Sosialisasi'
  | 'Seremoni'
  | 'Klarifikasi'
  | 'Program/Kinerja'
  | 'Isu Terhubung'
  | 'Hal Terhubung'
  | 'Seremoni Pasif'

/** Status duplikasi artikel hasil kurasi AI. */
export type StatusDuplikasi = 'Unik' | 'Pengulangan Berita' | 'Potensi Duplikat'

/**
 * Shape JSON mentah dari beritaPapua.json dan hasil upload Excel.
 * Digunakan di semua page yang membaca file JSON langsung.
 */
export interface BeritaRaw {
  tanggal: string
  judul: string
  sumber: string
  sentimen: string
  url: string
  kategori: string
  isi?: string
  entitasTerkait?: string
  tipe?: string
  // Kolom tambahan Media Sosial
  platform?: string
  username?: string
  engagement?: Engagement
  // Kolom kurasi AI (dari file _KURASI.xlsx)
  sentimen_kurasi?: string        // Positif | Negatif | Potensi Negatif | Netral
  klasifikasi?: Klasifikasi       // 3 label (tanpa Netral)
  framing_kinerja?: FramingKinerja
  narasumber_jabatan?: string     // "Jabatan, Instansi, Nama; ..."
  status_duplikasi?: StatusDuplikasi
  alasan_kurasi?: string
}

// Reputasi/Share of Voice Gubernur & Wakil Gubernur (Module A)
export interface ReputasiPimpinan {
  entitas: EntitasPimpinan
  nama: string
  shareOfVoiceRatio: number
  positiveRatio: number
  negativeRatio: number
  engagementRate: number
  topIsu: string[]
  trendData: TitikTren[]
}

// Ranking OPD (Module B — Pemberitaan OPD)
export interface RankingOpd {
  opd: Opd
  jumlahBerita: number
  jumlahPositif: number
  jumlahNegatif: number
  severityScore: number
}

// Tindak Lanjut / Disposisi ke OPD
export interface TindakLanjut {
  id: string
  isuId: string
  opdTujuan: Opd
  catatanArahan: string
  didisposisikanOleh: string
  tanggalDisposisi: string
  status: StatusPenanganan
  catatanTindakLanjut?: string
  tanggalTindakLanjut?: string
}

// Riwayat alert otomatis (WhatsApp/Telegram) — Non-Functional Requirement
export interface AlertNotifikasi {
  id: string
  isuId: string
  pesan: string
  channel: 'WhatsApp' | 'Telegram'
  tanggal: string
  penerima: string
}
