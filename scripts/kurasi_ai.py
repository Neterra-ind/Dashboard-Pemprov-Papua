"""Kurasi AI — baca IMD News Excel, kurasi tiap artikel dengan Gemini API,
   tulis Excel baru dengan kolom-kolom tambahan siap upload ke dashboard.

   Kolom output baru:
     sentimen_kurasi   : Positif | Negatif | Potensi Negatif | Netral
     klasifikasi       : Positif | Negatif | Potensi Negatif
     framing_kinerja   : Respons | Sosialisasi | Seremoni | Klarifikasi |
                         Program/Kinerja | Isu Terhubung | Hal Terhubung |
                         Seremoni Pasif | (kosong jika tidak relevan)
     narasumber_jabatan: "Jabatan, Instansi, Nama; ..." (satu entri per narasumber)
     status_duplikasi  : Unik | Pengulangan Berita | Potensi Duplikat

   Cara pakai:
     1. Pastikan Python >= 3.9 dan openpyxl + requests terpasang:
           pip install openpyxl requests
     2. Dapatkan API key Gemini dari: https://aistudio.google.com/apikey
     3. Jalankan:
           python scripts/kurasi_ai.py <file_input.xlsx> [--api-key AIzaSy...]
        Atau set environment variable GEMINI_API_KEY terlebih dulu:
           set GEMINI_API_KEY=AIzaSy...        (Windows)
           export GEMINI_API_KEY=AIzaSy...     (Mac/Linux)
           python scripts/kurasi_ai.py <file_input.xlsx>
     4. Output: <file_input>_KURASI.xlsx di folder yang sama

   Estimasi biaya: ~$0.05–0.15 per 200 artikel (Gemini 2.0 Flash)
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("Paket 'requests' belum terpasang. Jalankan: pip install requests", file=sys.stderr)
    sys.exit(1)

try:
    import openpyxl
    from openpyxl import load_workbook
    from openpyxl.styles import Font, PatternFill, Alignment
except ImportError:
    print("Paket 'openpyxl' belum terpasang. Jalankan: pip install openpyxl", file=sys.stderr)
    sys.exit(1)


# ── Konfigurasi API ──────────────────────────────────────────────────────────

GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)

# Rate limiting: Gemini 2.0 Flash free tier ~15 req/menit
JEDA_ANTAR_REQUEST = 4.5   # detik — aman untuk 15 req/menit
MAX_RETRY = 3
JEDA_RETRY = 10            # detik setelah rate-limit error (429)

# ── Rubrik Sentimen Neterra (dari referensi-menu-dashboard-REVISED-v2.docx) ──

RUBRIK_SENTIMEN = """
DEFINISI SENTIMEN (berdasarkan tupoksi pimpinan/pemda):

POSITIF:
  Pemberitaan prestasi, inovasi, atau capaian kinerja pimpinan/OPD/lembaga binaan pemda.
  Contoh: peluncuran program baru, penghargaan diterima, realisasi anggaran tercapai,
  infrastruktur selesai dibangun, kunjungan kerja yang menghasilkan komitmen nyata.

NEGATIF (salah satu kondisi):
  (1) Pemberitaan yang menyerang pimpinan/pemda secara langsung — tuduhan, korupsi,
      kegagalan program, kritik keras dari legislatif/masyarakat, gugatan hukum.
  (2) Isu yang tidak kunjung mendapat respons konkret dari pemda — masalah berlarut,
      warga mengeluh tanpa tanggapan, infrastruktur rusak tanpa perbaikan.

POTENSI NEGATIF (salah satu kondisi):
  (1) Isu relevan yang berpeluang berdampak buruk pada pemda/masyarakat —
      bencana alam, konflik sosial, kelangkaan pangan/BBM, wabah penyakit.
  (2) Isu yang dapat menjadi kewenangan untuk ditindaklanjuti pemda —
      laporan masalah dari masyarakat yang belum viral/kritis tapi perlu respons.

NETRAL:
  Pemberitaan faktual/informatif tanpa muatan kinerja — jadwal acara, pelantikan
  tanpa konteks kinerja, berita seremonial murni, pemberitaan pihak lain yang
  menyebut Papua hanya sebagai lokasi.
"""

FRAMING_OPTIONS = """
FRAMING KINERJA (pilih SATU yang paling dominan, atau kosongkan jika tidak relevan):
  Respons        : Pemda/pimpinan merespons isu/kejadian/pertanyaan dari pihak lain
  Sosialisasi    : Pemda/pimpinan menyosialisasikan program/kebijakan ke masyarakat
  Seremoni       : Pimpinan hadir/memimpin acara seremonial (peresmian, pelantikan, upacara)
  Klarifikasi    : Pemda/pimpinan meluruskan informasi atau membantah tuduhan
  Program/Kinerja: Laporan capaian program, realisasi target, prestasi kerja nyata
  Isu Terhubung  : Isu eksternal yang terhubung ke agenda/kewenangan pemda
  Hal Terhubung  : Topik/hal lain yang berkaitan dengan aktivitas pemda (tidak langsung)
  Seremoni Pasif : Pimpinan hadir sebagai tamu/peserta, bukan pemimpin acara
"""

# ── Prompt template ──────────────────────────────────────────────────────────

def buat_prompt(judul: str, isi: str, narasumber_mentah: str, subjek: str) -> str:
    isi_potong = isi[:2000] if isi else "(tidak tersedia)"
    return f"""Kamu adalah analis media monitoring untuk pemerintah daerah Indonesia.
Tugasmu: menganalisis satu artikel berita dan mengisi metadata kurasi.

SUBJEK MONITORING: {subjek}

---
JUDUL: {judul}
ISI (potongan): {isi_potong}
NARASUMBER MENTAH (dari data IMD): {narasumber_mentah or "(kosong)"}
---

{RUBRIK_SENTIMEN}

{FRAMING_OPTIONS}

TUGAS — isi JSON berikut dengan tepat:

{{
  "sentimen_kurasi": "<Positif|Negatif|Potensi Negatif|Netral>",
  "klasifikasi": "<Positif|Negatif|Potensi Negatif>",
  "framing_kinerja": "<nama framing atau kosong>",
  "narasumber_jabatan": "<Jabatan, Instansi, Nama; Jabatan, Instansi, Nama>",
  "alasan": "<1-2 kalimat singkat alasan sentimen>"
}}

CATATAN:
- sentimen_kurasi menggunakan 4 label (Netral boleh)
- klasifikasi hanya 3 label (Netral masuk ke Potensi Negatif jika isu relevan, atau Positif jika tidak ada dampak)
- narasumber_jabatan: ekstrak dari kolom narasumber DAN dari isi artikel.
  Format setiap narasumber: "Jabatan, Instansi, Nama"
  Contoh: "Gubernur Papua, Pemprov Papua, Matius Fakhiri; Kepala Dinas Kesehatan, Dinkes Papua, dr. Robby"
  Jika jabatan tidak diketahui dari artikel, tulis "Narasumber, -, [nama]"
- Jawab HANYA dengan JSON valid, tanpa teks lain di luar JSON.
"""


# ── Panggil Gemini API ────────────────────────────────────────────────────────

def panggil_gemini(prompt: str, api_key: str) -> dict:
    """Kirim prompt ke Gemini, kembalikan dict hasil parsing JSON."""
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 512,
            "responseMimeType": "application/json",
        },
    }
    for percobaan in range(1, MAX_RETRY + 1):
        try:
            resp = requests.post(
                GEMINI_URL,
                params={"key": api_key},
                json=payload,
                timeout=30,
            )
            if resp.status_code == 429:
                print(f"  ⚠ Rate limit (429), tunggu {JEDA_RETRY}s...", file=sys.stderr)
                time.sleep(JEDA_RETRY)
                continue
            resp.raise_for_status()
            data = resp.json()
            teks = data["candidates"][0]["content"]["parts"][0]["text"]
            # Bersihkan markdown code block jika ada
            teks = re.sub(r"```(?:json)?\s*", "", teks).strip().rstrip("`").strip()
            return json.loads(teks)
        except (requests.RequestException, KeyError, json.JSONDecodeError) as e:
            if percobaan < MAX_RETRY:
                print(f"  ⚠ Percobaan {percobaan} gagal: {e}. Coba lagi...", file=sys.stderr)
                time.sleep(3)
            else:
                print(f"  ✖ Gagal setelah {MAX_RETRY} percobaan: {e}", file=sys.stderr)
                return {}
    return {}


def hasil_default() -> dict:
    return {
        "sentimen_kurasi": "Netral",
        "klasifikasi": "Positif",
        "framing_kinerja": "",
        "narasumber_jabatan": "",
        "alasan": "Gagal dikurasi",
    }


# ── Deteksi duplikat ─────────────────────────────────────────────────────────

def normalisasi_judul(judul: str) -> str:
    """Judul normal untuk perbandingan: lowercase, hapus tanda baca, trim."""
    s = judul.lower()
    s = re.sub(r"[^\w\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def kata_kunci_judul(judul_norm: str, top_n: int = 5) -> frozenset[str]:
    """Ambil kata bermakna (>= 4 huruf) sebagai fingerprint topik."""
    stopwords = {
        "yang", "dan", "dengan", "untuk", "dari", "pada", "ini", "itu",
        "akan", "dalam", "para", "oleh", "juga", "sudah", "telah", "tidak",
        "bisa", "atau", "ada", "pun", "punya", "bagi", "saat", "agar", "karena",
    }
    kata = [w for w in judul_norm.split() if len(w) >= 4 and w not in stopwords]
    return frozenset(kata[:top_n])


def tandai_duplikat(judul_list: list[str]) -> list[str]:
    """
    Kembalikan list status_duplikasi untuk setiap artikel.
    - Exact match (judul identik setelah normalisasi) → 'Pengulangan Berita'
    - Overlap kata kunci >= 60%                       → 'Potensi Duplikat'
    - Lainnya                                         → 'Unik'
    """
    normals = [normalisasi_judul(j) for j in judul_list]
    fingerprints = [kata_kunci_judul(n) for n in normals]
    status = ["Unik"] * len(judul_list)

    # Kumpulkan indeks per judul normal (exact)
    exact: dict[str, int] = {}
    for i, norm in enumerate(normals):
        if norm in exact:
            status[i] = "Pengulangan Berita"
        else:
            exact[norm] = i

    # Cek kesamaan fingerprint untuk yang belum ditandai
    for i in range(len(judul_list)):
        if status[i] != "Unik":
            continue
        fp_i = fingerprints[i]
        if not fp_i:
            continue
        for j in range(i):
            if status[j] == "Pengulangan Berita":
                continue
            fp_j = fingerprints[j]
            if not fp_j:
                continue
            overlap = len(fp_i & fp_j) / max(len(fp_i), len(fp_j))
            if overlap >= 0.6:
                status[i] = "Potensi Duplikat"
                break

    return status


# ── Baca Excel IMD ───────────────────────────────────────────────────────────

def baca_excel(path: str) -> tuple[list[str], list[list]]:
    """Kembalikan (header, rows) dari sheet pertama."""
    wb = load_workbook(path, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    rows_iter = ws.iter_rows(values_only=True)
    header = [str(h).strip() if h is not None else f"Kolom{i}"
              for i, h in enumerate(next(rows_iter, []))]
    rows = [list(r) for r in rows_iter]
    wb.close()
    return header, rows


# ── Tulis Excel hasil ────────────────────────────────────────────────────────

HEADER_BARU = [
    "sentimen_kurasi",
    "klasifikasi",
    "framing_kinerja",
    "narasumber_jabatan",
    "status_duplikasi",
    "alasan_kurasi",
]

WARNA_SENTIMEN = {
    "Positif":          "C6EFCE",   # hijau muda
    "Negatif":          "FFC7CE",   # merah muda
    "Potensi Negatif":  "FFEB9C",   # kuning
    "Netral":           "DDEBF7",   # biru muda
}

WARNA_DUPLIKAT = {
    "Pengulangan Berita": "FFD966",
    "Potensi Duplikat":   "FFE699",
    "Unik":               None,
}


def warna_sel(ws, baris: int, kolom: int, hex_color: str):
    ws.cell(row=baris, column=kolom).fill = PatternFill(
        fill_type="solid", fgColor=hex_color
    )


def tulis_excel(path_out: str, header_asli: list[str], rows_asli: list[list],
                hasil_kurasi: list[dict], status_duplikat: list[str]):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Hasil Kurasi"

    # Header
    header_lengkap = header_asli + HEADER_BARU
    for c, h in enumerate(header_lengkap, 1):
        sel = ws.cell(row=1, column=c, value=h)
        sel.font = Font(bold=True, color="FFFFFF")
        sel.fill = PatternFill(fill_type="solid", fgColor="2D5A87")
        sel.alignment = Alignment(horizontal="center", wrap_text=True)

    # Lebar kolom otomatis (perkiraan)
    ws.column_dimensions["A"].width = 12   # Tanggal
    ws.column_dimensions["B"].width = 50   # Judul
    # Kolom baru: lebar standar
    for col_idx in range(len(header_asli) + 1, len(header_lengkap) + 2):
        col_letter = openpyxl.utils.get_column_letter(col_idx)
        ws.column_dimensions[col_letter].width = 22

    # Baris data
    idx_sentimen_kurasi = header_lengkap.index("sentimen_kurasi") + 1
    idx_status_dup      = header_lengkap.index("status_duplikasi") + 1

    for r_idx, (row, kur, dup) in enumerate(
        zip(rows_asli, hasil_kurasi, status_duplikat), start=2
    ):
        # Data asli
        for c_idx, val in enumerate(row, 1):
            ws.cell(row=r_idx, column=c_idx, value=val)
        # Kolom kurasi
        offset = len(header_asli)
        ws.cell(row=r_idx, column=offset + 1, value=kur.get("sentimen_kurasi", ""))
        ws.cell(row=r_idx, column=offset + 2, value=kur.get("klasifikasi", ""))
        ws.cell(row=r_idx, column=offset + 3, value=kur.get("framing_kinerja", ""))
        ws.cell(row=r_idx, column=offset + 4, value=kur.get("narasumber_jabatan", ""))
        ws.cell(row=r_idx, column=offset + 5, value=dup)
        ws.cell(row=r_idx, column=offset + 6, value=kur.get("alasan", ""))

        # Warna sentimen
        warna_s = WARNA_SENTIMEN.get(kur.get("sentimen_kurasi", ""))
        if warna_s:
            warna_sel(ws, r_idx, idx_sentimen_kurasi, warna_s)

        # Warna duplikat
        warna_d = WARNA_DUPLIKAT.get(dup)
        if warna_d:
            warna_sel(ws, r_idx, idx_status_dup, warna_d)

    # Freeze baris header
    ws.freeze_panes = "A2"

    wb.save(path_out)


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Kurasi IMD News Excel dengan Gemini AI"
    )
    parser.add_argument("file", help="Path ke file Excel IMD News input")
    parser.add_argument(
        "--api-key", default=os.environ.get("GEMINI_API_KEY", ""),
        help="Gemini API key (atau set env var GEMINI_API_KEY)"
    )
    parser.add_argument(
        "--subjek", default="Gubernur Papua",
        help="Subjek monitoring, misal: 'Gubernur Papua' (default: 'Gubernur Papua')"
    )
    parser.add_argument(
        "--mulai", type=int, default=0,
        help="Mulai dari baris ke-N (untuk lanjut jika terhenti, default: 0)"
    )
    parser.add_argument(
        "--simpan-progres", action="store_true",
        help="Simpan file progres sementara tiap 10 artikel"
    )
    args = parser.parse_args()

    # Validasi
    if not args.api_key:
        print(
            "ERROR: API key Gemini tidak ditemukan.\n"
            "  Cara 1: python kurasi_ai.py file.xlsx --api-key AIzaSy...\n"
            "  Cara 2: set environment variable GEMINI_API_KEY=AIzaSy...",
            file=sys.stderr
        )
        sys.exit(1)

    if not os.path.exists(args.file):
        print(f"ERROR: File tidak ditemukan: {args.file}", file=sys.stderr)
        sys.exit(1)

    # Path output
    p = Path(args.file)
    path_out = str(p.parent / f"{p.stem}_KURASI{p.suffix}")
    path_progres = str(p.parent / f"{p.stem}_PROGRES.json")

    print(f"📂 Input  : {args.file}")
    print(f"📝 Output : {path_out}")
    print(f"🔍 Subjek : {args.subjek}")

    # Baca Excel
    print("\n⏳ Membaca Excel...")
    header, rows = baca_excel(args.file)
    print(f"   {len(rows)} baris ditemukan, {len(header)} kolom")

    # Cari posisi kolom penting
    idx = {h.lower(): i for i, h in enumerate(header)}
    i_judul = idx.get("judul", idx.get("title", 1))
    i_isi   = idx.get("isi", idx.get("content", -1))
    i_nara  = idx.get("narasumber", idx.get("narrator", -1))

    # Tandai duplikat (tidak perlu API)
    print("\n🔁 Mendeteksi duplikat...")
    judul_list = [str(r[i_judul] or "") for r in rows]
    status_duplikat = tandai_duplikat(judul_list)
    n_dup = sum(1 for s in status_duplikat if s != "Unik")
    print(f"   {n_dup} artikel terdeteksi duplikat/pengulangan dari {len(rows)} total")

    # Muat progres sebelumnya jika ada
    hasil_lama: list[dict] = []
    if os.path.exists(path_progres) and args.mulai == 0:
        try:
            with open(path_progres, encoding="utf-8") as f:
                hasil_lama = json.load(f)
            args.mulai = len(hasil_lama)
            print(f"\n♻ Progres ditemukan: {args.mulai} artikel sudah dikurasi, lanjut dari sana.")
        except Exception:
            hasil_lama = []

    hasil_kurasi: list[dict] = hasil_lama.copy()
    baris_baru = rows[args.mulai:]
    total = len(rows)

    if not baris_baru:
        print("\n✅ Semua artikel sudah dikurasi (progres penuh). Langsung tulis output...")
    else:
        print(f"\n🤖 Memulai kurasi AI untuk {len(baris_baru)} artikel "
              f"(dari baris {args.mulai + 1}/{total})...")
        print("   Tekan Ctrl+C untuk berhenti — progres tersimpan otomatis.\n")

        for i, baris in enumerate(baris_baru):
            no_global = args.mulai + i + 1
            judul = str(baris[i_judul] or "")
            isi   = str(baris[i_isi] or "") if i_isi >= 0 else ""
            nara  = str(baris[i_nara] or "") if i_nara >= 0 else ""

            judul_pendek = judul[:60] + "..." if len(judul) > 60 else judul
            print(f"  [{no_global:3d}/{total}] {judul_pendek}", end="", flush=True)

            prompt = buat_prompt(judul, isi, nara, args.subjek)
            hasil  = panggil_gemini(prompt, args.api_key)
            if not hasil:
                hasil = hasil_default()

            # Pastikan semua field ada
            for field in ["sentimen_kurasi", "klasifikasi", "framing_kinerja",
                          "narasumber_jabatan", "alasan"]:
                if field not in hasil:
                    hasil[field] = hasil_default()[field]

            hasil_kurasi.append(hasil)
            sentimen_label = hasil.get("sentimen_kurasi", "?")
            print(f" → {sentimen_label}", flush=True)

            # Simpan progres
            if args.simpan_progres and no_global % 10 == 0:
                with open(path_progres, "w", encoding="utf-8") as f:
                    json.dump(hasil_kurasi, f, ensure_ascii=False)
                print(f"   💾 Progres disimpan: {no_global}/{total}")

            # Jeda untuk menghindari rate limit
            if i < len(baris_baru) - 1:
                time.sleep(JEDA_ANTAR_REQUEST)

        # Hapus file progres sementara jika selesai
        if os.path.exists(path_progres):
            os.remove(path_progres)

    # Tulis Excel hasil
    print(f"\n💾 Menulis Excel hasil ke: {path_out}")
    tulis_excel(path_out, header, rows, hasil_kurasi, status_duplikat)

    # Ringkasan
    from collections import Counter
    sents = Counter(h.get("sentimen_kurasi", "") for h in hasil_kurasi)
    klas  = Counter(h.get("klasifikasi", "") for h in hasil_kurasi)
    framings = Counter(h.get("framing_kinerja", "(kosong)") for h in hasil_kurasi)
    dups  = Counter(status_duplikat)

    print("\n" + "="*55)
    print("RINGKASAN KURASI")
    print("="*55)
    print(f"Total artikel  : {len(hasil_kurasi)}")
    print(f"\nSentimen Kurasi:")
    for k, v in sorted(sents.items(), key=lambda x: -x[1]):
        print(f"  {k:<20}: {v}")
    print(f"\nKlasifikasi:")
    for k, v in sorted(klas.items(), key=lambda x: -x[1]):
        print(f"  {k:<20}: {v}")
    print(f"\nFraming Kinerja (top 5):")
    for k, v in sorted(framings.items(), key=lambda x: -x[1])[:5]:
        print(f"  {k:<25}: {v}")
    print(f"\nStatus Duplikat:")
    for k, v in sorted(dups.items(), key=lambda x: -x[1]):
        print(f"  {k:<25}: {v}")
    print("="*55)
    print(f"\n✅ Selesai! File hasil: {path_out}")
    print("   Upload file _KURASI.xlsx ke halaman Upload Data di dashboard.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏸ Dihentikan oleh pengguna. Progres tersimpan jika --simpan-progres aktif.")
        sys.exit(0)
