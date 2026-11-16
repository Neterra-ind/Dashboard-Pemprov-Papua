# Panduan Kurasi AI — IMD News Excel

Script ini membaca file Excel IMD News, menganalisis setiap artikel dengan
Google Gemini AI, lalu menghasilkan file Excel baru yang siap diupload ke
dashboard.

## Kolom yang ditambahkan

| Kolom | Isi |
|---|---|
| `sentimen_kurasi` | Positif / Negatif / Potensi Negatif / Netral |
| `klasifikasi` | Positif / Negatif / Potensi Negatif |
| `framing_kinerja` | Respons / Sosialisasi / Seremoni / dll |
| `narasumber_jabatan` | "Jabatan, Instansi, Nama; ..." |
| `status_duplikasi` | Unik / Pengulangan Berita / Potensi Duplikat |
| `alasan_kurasi` | Alasan singkat AI memilih sentimen |

---

## Langkah-langkah

### 1. Pasang Python dan paket yang dibutuhkan

Buka Command Prompt (Windows) atau Terminal (Mac), lalu jalankan:

```
pip install openpyxl requests
```

### 2. Dapatkan API Key Gemini (gratis)

1. Buka: https://aistudio.google.com/apikey
2. Login dengan akun Google
3. Klik **"Create API Key"**
4. Copy key yang dihasilkan (mulai dengan `AIzaSy...`)

### 3. Jalankan script

Buka Command Prompt di folder repo (Dashboard-Pemprov-Papua), lalu:

```
python scripts/kurasi_ai.py "IMD News Isu - Gubernur Papua.xlsx" --api-key AIzaSy... --subjek "Gubernur Papua"
```

**Ganti:**
- `"IMD News Isu - Gubernur Papua.xlsx"` → nama file Excel IMD News Anda
- `AIzaSy...` → API key yang sudah disalin
- `"Gubernur Papua"` → subjek monitoring (sesuai nama query IMD)

### 4. Tunggu proses selesai

Estimasi waktu: **~15–20 menit** untuk 200 artikel
(ada jeda 4,5 detik antar artikel untuk menghindari batas kuota API)

Di layar akan tampil progress seperti:
```
[  1/207] Gubernur Papua Resmikan Jembatan Trans-Papua → Positif
[  2/207] Warga Keluhkan Jalan Rusak di Jayapura → Negatif
[  3/207] ...
```

### 5. Upload hasil ke dashboard

File output: `IMD News Isu - Gubernur Papua_KURASI.xlsx`

Upload file ini di dashboard → halaman **Upload Data**.

---

## Tips

**Jika koneksi terputus di tengah proses:**
Jalankan dengan flag `--simpan-progres`:
```
python scripts/kurasi_ai.py file.xlsx --api-key AIzaSy... --simpan-progres
```
Script akan menyimpan progres tiap 10 artikel. Jika terhenti, jalankan ulang
perintah yang sama — script otomatis melanjutkan dari artikel terakhir.

**Untuk melanjutkan dari baris tertentu:**
```
python scripts/kurasi_ai.py file.xlsx --api-key AIzaSy... --mulai 150
```
(mulai dari baris ke-150)

**Estimasi biaya:**
- 200 artikel × ~1.500 token/artikel = ~300.000 token
- Gemini 2.0 Flash: $0.10/juta token input → **~$0.03** per run
- Praktisnya hampir gratis

---

## Contoh output ringkasan

```
=======================================================
RINGKASAN KURASI
=======================================================
Total artikel  : 207

Sentimen Kurasi:
  Positif             : 89
  Netral              : 72
  Potensi Negatif     : 25
  Negatif             : 21

Klasifikasi:
  Positif             : 89
  Potensi Negatif     : 97
  Negatif             : 21

Framing Kinerja (top 5):
  Program/Kinerja          : 54
  Seremoni                 : 38
  Respons                  : 29
  Sosialisasi              : 22
  (kosong)                 : 18

Status Duplikat:
  Unik                     : 178
  Pengulangan Berita       : 19
  Potensi Duplikat         : 10
=======================================================
```
