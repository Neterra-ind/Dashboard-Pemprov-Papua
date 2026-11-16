/**
 * Auto-klasifikasi kategori berita berdasarkan keyword dari 21 sektor Neterra.
 * Definisi lengkap: Kategori_Berita-Report_Evaluasi.docx
 *
 * Urutan array menentukan prioritas — kategori paling atas menang jika ada kecocokan ganda.
 */

import type { KategoriIsu } from '@/types'

interface RuleKategori {
  kategori: KategoriIsu
  keywords: string[]
}

const RULES: RuleKategori[] = [
  {
    kategori: 'Pemilu & Politik Praktis',
    keywords: [
      'pemilu', 'pilkada', 'pilpres', 'pileg', 'kampanye', 'calon gubernur', 'calon bupati',
      'calon walikota', 'paslon', 'kpu', 'bawaslu', 'partai politik', 'suara pilkada',
      'koalisi', 'dpt', 'daftar pemilih', 'quick count', 'real count', 'surat suara',
    ],
  },
  {
    kategori: 'Hukum & HAM',
    keywords: [
      'korupsi', 'suap', 'gratifikasi', 'kpk', 'polisi', 'pengadilan', 'kejaksaan',
      'hukum', 'penegakan hukum', 'ham', 'hak asasi', 'pidana', 'perdata', 'dakwaan',
      'terdakwa', 'tersangka', 'penahanan', 'vonis', 'hakim', 'jaksa', 'advokat',
      'otsus', 'otonomi khusus', 'pelanggaran', 'investigasi',
    ],
  },
  {
    kategori: 'Kebencanaan',
    keywords: [
      'banjir', 'gempa', 'longsor', 'bencana', 'tsunami', 'kebakaran hutan', 'kekeringan',
      'bpbd', 'bnpb', 'evakuasi', 'pengungsi', 'tanggap darurat', 'bencana alam',
      'cuaca ekstrem', 'angin kencang', 'banjir bandang', 'abrasi', 'rob',
    ],
  },
  {
    kategori: 'Kesehatan',
    keywords: [
      'kesehatan', 'rumah sakit', 'puskesmas', 'dokter', 'nakes', 'tenaga kesehatan',
      'obat', 'vaksin', 'imunisasi', 'stunting', 'gizi', 'malaria', 'covid', 'wabah',
      'pandemi', 'bpjs', 'dinas kesehatan', 'posyandu', 'penyakit', 'kematian ibu',
      'kematian bayi', 'sanitasi', 'air bersih kesehatan',
    ],
  },
  {
    kategori: 'Pendidikan & IPTEK',
    keywords: [
      'pendidikan', 'sekolah', 'siswa', 'guru', 'belajar', 'kurikulum', 'universitas',
      'perguruan tinggi', 'beasiswa', 'ujian', 'literasi', 'iptek', 'inovasi', 'riset',
      'penelitian', 'teknologi', 'digital', 'internet', 'ai', 'kecerdasan buatan',
      'dinas pendidikan', 'kampus', 'mahasiswa', 'dosen',
    ],
  },
  {
    kategori: 'Infrastruktur',
    keywords: [
      'jalan', 'jembatan', 'gedung', 'bangunan', 'konstruksi', 'infrastruktur',
      'proyek', 'pembangunan jalan', 'jaringan air', 'drainase', 'irigasi',
      'listrik', 'pln', 'bandara', 'pelabuhan', 'dermaga', 'terminal', 'pasar',
      'perbaikan jalan', 'pu', 'pekerjaan umum', 'penataan kota', 'rusun',
    ],
  },
  {
    kategori: 'Perhubungan',
    keywords: [
      'transportasi', 'angkutan', 'bus', 'kapal', 'penerbangan', 'pesawat',
      'dishub', 'dinas perhubungan', 'terminal bus', 'bandar udara', 'jadwal penerbangan',
      'tarif', 'subsidi angkutan', 'mobilitas', 'kemacetan', 'lalu lintas',
    ],
  },
  {
    kategori: 'Ekonomi, Keuangan & Industri',
    keywords: [
      'ekonomi', 'apbd', 'anggaran', 'investasi', 'industri', 'pertumbuhan ekonomi',
      'inflasi', 'ekspor', 'impor', 'perdagangan', 'pasar', 'harga', 'keuangan daerah',
      'pajak', 'retribusi', 'bea cukai', 'bumn', 'bumd', 'perusahaan daerah',
      'kawasan industri', 'free trade zone', 'kemiskinan', 'ketimpangan',
    ],
  },
  {
    kategori: 'Koperasi & UMKM',
    keywords: [
      'umkm', 'usaha mikro', 'usaha kecil', 'koperasi', 'wirausaha', 'entrepreneur',
      'inkubasi', 'modal usaha', 'kredit usaha', 'kur', 'produk lokal', 'olahan',
      'pengrajin', 'peternak', 'nelayan kecil', 'pedagang kaki lima', 'pasar tradisional',
    ],
  },
  {
    kategori: 'Agro-Maritim',
    keywords: [
      'pertanian', 'padi', 'sawah', 'petani', 'panen', 'pupuk', 'benih', 'holtikultura',
      'peternakan', 'sapi', 'babi', 'ayam', 'kehutanan', 'hutan', 'illegal logging',
      'perikanan', 'nelayan', 'budidaya ikan', 'kelautan', 'sumber daya laut',
      'dinas pertanian', 'dinas peternakan', 'dinas kehutanan', 'dinas kelautan',
      'kakao', 'kopi', 'kelapa sawit', 'sagu',
    ],
  },
  {
    kategori: 'Energi, SDA & Lingkungan',
    keywords: [
      'lingkungan', 'hidup', 'dlh', 'dinas lingkungan', 'pencemaran', 'limbah',
      'sampah', 'polusi', 'energi', 'bbm', 'minyak', 'gas', 'tambang', 'pertambangan',
      'minerba', 'nikel', 'tembaga', 'emas', 'batu bara', 'ebt', 'energi terbarukan',
      'solar panel', 'pembangkit', 'sda', 'sumber daya alam', 'reklamasi',
    ],
  },
  {
    kategori: 'Sosial, Budaya & Pariwisata',
    keywords: [
      'sosial', 'kemiskinan', 'perlindungan sosial', 'bansos', 'pkh', 'bst',
      'budaya', 'adat', 'suku', 'tradisi', 'festival', 'seni', 'budaya papua',
      'pariwisata', 'wisata', 'destinasi', 'turis', 'objek wisata', 'dinas pariwisata',
      'hotel', 'penginapan', 'pantai', 'gunung', 'ekowisata',
    ],
  },
  {
    kategori: 'Pemuda & Olahraga',
    keywords: [
      'pemuda', 'olahraga', 'atlet', 'pon', 'porda', 'sepak bola', 'futsal', 'basket',
      'voli', 'renang', 'tinju', 'angkat besi', 'stadion', 'gor', 'dispora',
      'pramuka', 'karang taruna', 'generasi muda', 'usia produktif',
    ],
  },
  {
    kategori: 'Ketenagakerjaan',
    keywords: [
      'tenaga kerja', 'naker', 'disnaker', 'pengangguran', 'pekerja', 'buruh',
      'upah', 'umk', 'umr', 'phk', 'hubungan industrial', 'serikat pekerja',
      'serikat buruh', 'k3', 'keselamatan kerja', 'bpjstk', 'bpjs ketenagakerjaan',
      'pelatihan vokasi', 'balai latihan kerja', 'blk', 'tki', 'pekerja migran',
    ],
  },
  {
    kategori: 'Pertahanan & Ideologi',
    keywords: [
      'kkb', 'kpb', 'opm', 'teroris', 'terorisme', 'separatis', 'keamanan', 'konflik',
      'tni', 'polri', 'brimob', 'kodam', 'kodim', 'polda', 'polres', 'intel',
      'bnpt', 'radikalisme', 'nkri', 'pancasila', 'ideologi', 'wawasan nusantara',
    ],
  },
  {
    kategori: 'Politik & Kebijakan',
    keywords: [
      'kebijakan', 'perda', 'pergub', 'peraturan', 'regulasi', 'legislasi', 'dprd',
      'politik', 'pemerintah', 'gubernur', 'wakil gubernur', 'bupati', 'walikota',
      'forkopimda', 'musrenbang', 'rpjmd', 'rencana pembangunan', 'program',
    ],
  },
  {
    kategori: 'Administrasi & Pemerintahan',
    keywords: [
      'pelayanan publik', 'administrasi', 'birokrasi', 'asn', 'pns', 'aparatur',
      'jabatan', 'mutasi', 'rotasi', 'lelang jabatan', 'bkd', 'bkpsdm',
      'e-government', 'digitalisasi layanan', 'mall pelayanan', 'perizinan',
      'oss', 'ktp', 'akta', 'dukcapil', 'capil', 'opd', 'skpd',
    ],
  },
  {
    kategori: 'Agraria dan Tata Ruang',
    keywords: [
      'lahan', 'tanah', 'tata ruang', 'rtrw', 'bpn', 'sertifikat tanah', 'hgu',
      'hgb', 'konflik lahan', 'sengketa tanah', 'pertanahan', 'tata guna lahan',
      'peruntukan lahan', 'kawasan lindung', 'atrt', 'agraria',
    ],
  },
  {
    kategori: 'Kependudukan',
    keywords: [
      'kependudukan', 'penduduk', 'sensus', 'kelahiran', 'kematian', 'migrasi',
      'transmigrasi', 'pendatang', 'orang asli papua', 'oap', 'kependudukan',
      'akte lahir', 'kk', 'kartu keluarga', 'ktp elektronik', 'e-ktp',
    ],
  },
  {
    kategori: 'Pemberdayaan Perempuan & Perlindungan Anak',
    keywords: [
      'perempuan', 'wanita', 'gender', 'kekerasan', 'kdrt', 'anak', 'perlindungan anak',
      'pppa', 'dp3a', 'komnas perempuan', 'komnas ham anak', 'tppo', 'perdagangan orang',
      'pemberdayaan perempuan', 'posyandu', 'pkk', 'bkb', 'posyandu remaja',
    ],
  },
  {
    kategori: 'Pembangunan Desa',
    keywords: [
      'desa', 'kampung', 'distrik', 'dana desa', 'dd', 'bumdes', 'bumkam',
      'musyawarah desa', 'pembangunan kampung', 'apbdes', 'kepala desa', 'kades',
      'bpd', 'badan permusyawaratan desa', 'idm', 'sdgs desa', 'desa mandiri',
    ],
  },
]

/**
 * Klasifikasikan teks (judul + isi) ke salah satu dari 21 kategori Neterra.
 * Kembalikan 'Administrasi & Pemerintahan' sebagai fallback jika tidak ada kecocokan.
 */
export function klasifikasiKategori(judul: string, isi = ''): KategoriIsu {
  const teks = (judul + ' ' + isi).toLowerCase()

  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (teks.includes(kw)) {
        return rule.kategori
      }
    }
  }

  return 'Administrasi & Pemerintahan'
}

/**
 * Map sentimen dari format IMD Excel (lowercase English) ke format dashboard (Indonesian).
 */
export function mapSentimen(raw: string): 'Positif' | 'Netral' | 'Negatif' {
  const v = raw.toLowerCase().trim()
  if (v === 'positive' || v === 'positif') return 'Positif'
  if (v === 'negative' || v === 'negatif') return 'Negatif'
  return 'Netral'
}

/**
 * Map nama platform dari IMD Socmed Excel ke nilai standar dashboard.
 */
export function mapPlatform(raw: string): import('@/types').Platform | undefined {
  const v = raw.toLowerCase().trim()
  if (v.includes('facebook') || v === 'fb') return 'Facebook'
  if (v.includes('twitter') || v === 'x') return 'Twitter'
  if (v.includes('youtube') || v === 'yt') return 'YouTube'
  if (v.includes('instagram') || v === 'ig') return 'Instagram'
  if (v.includes('tiktok')) return 'TikTok'
  if (v.includes('telegram')) return 'Telegram'
  return undefined
}
