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
  | 'Pelayanan Publik'
  | 'Infrastruktur'
  | 'Pendidikan'
  | 'Kesehatan'
  | 'Ekonomi & Ketahanan Pangan'
  | 'Pariwisata'
  | 'Lingkungan & Bencana'
  | 'Sosial & Kemiskinan'
  | 'Keamanan & Ketertiban'
  | 'Tata Kelola Pemerintahan'

export type JenisSumber = 'Media Online' | 'Media Sosial'

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
