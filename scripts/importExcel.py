"""Importer: baca file Excel IMD News/Socmed Papua di folder repo lalu tulis
   src/data/beritaPapua.json dalam skema BeritaMentah dashboard.

   - Kolom input News: Tanggal, Judul, Isi, Sentimen, Media, Narasumber, Link
   - Kolom input Socmed: Tanggal, Jam, Username, Isi, Sentimen, Platform, ..., Link
   - Output: [{tanggal, judul, sumber, sentimen, url, kategori, entitasTerkait?}]
   Jalankan: python scripts/importExcel.py
"""
from __future__ import annotations

import glob
import json
import os
import re
import sys
from collections import Counter

try:
    from openpyxl import load_workbook
except ImportError:
    print("openpyxl belum terpasang: pip install openpyxl", file=sys.stderr)
    sys.exit(1)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "src", "data", "beritaPapua.json")

SENTIMEN_MAP = {"positive": "Positif", "neutral": "Netral", "negative": "Negatif"}

KATEGORI = [
    "Pelayanan Publik",
    "Infrastruktur",
    "Pendidikan",
    "Kesehatan",
    "Ekonomi & Ketahanan Pangan",
    "Pariwisata",
    "Lingkungan & Bencana",
    "Sosial & Kemiskinan",
    "Keamanan & Ketertiban",
    "Tata Kelola Pemerintahan",
]

# Kata kunci untuk klasifikasi kategori (urutan: yang lebih spesifik dulu).
KAT_KEYS: list[tuple[str, list[str]]] = [
    ("Kesehatan", ["puskesmas", "rumah sakit", "rsud", "stunting", "imunisasi", "dokter", "pasien", "kesehatan", "wabah", "malaria", "gizi"]),
    ("Pendidikan", ["sekolah", "siswa", "guru", "pendidikan", "kampus", "universitas", "kurikulum", "beasiswa", "pelajar"]),
    ("Infrastruktur", ["jalan", "jembatan", "bandara", "pelabuhan", "proyek", "pembangunan", "trans papua", "infrastruktur", "konstruksi", "aspal"]),
    ("Pariwisata", ["wisata", "pariwisata", "destinasi", "turis", "budaya papua", "festival"]),
    ("Lingkungan & Bencana", ["banjir", "longsor", "gempa", "cuaca", "bencana", "lingkungan", "hutan", "tambang", "polusi", "deforestasi", "kebakaran", "erupsi"]),
    ("Keamanan & Ketertiban", ["opm", "kkb", "keamanan", "tni", "polri", "tnp", "penembakan", "tersangka", "narkoba", "konflik", "demonstrasi", "ricuh", "kriminal", "pencurian", "kejahatan", "penangkapan"]),
    ("Sosial & Kemiskinan", ["bantuan sosial", "bansos", "kemiskinan", "pengangguran", "stunt", "penyandang disabilitas", "miskin", "pengungsi"]),
    ("Ekonomi & Ketahanan Pangan", ["ekonomi", "harga", "pangan", "beras", "bbm", "inflasi", "pertanian", "nelayan", "umkm", "perdagangan", "logistik", "pasar"]),
    ("Pelayanan Publik", ["layanan", "ktp", "dukcapil", "kependudukan", "antre", "pelayanan", "perizinan"]),
    ("Tata Kelola Pemerintahan", ["gubernur", "wakil gubernur", "bupati", "wali kota", "pemprov", "pemkab", "pemkot", "apbd", "anggaran", "korupsi", "kpk", "birokrasi", "dpr", "dprd", "pemilu", "pilkada"]),
]

GUB = "Matius D. Fakhiri"
WAGUB = "Aryoko Rumaropen"
GUB_KEYS = ["matius d. fakhiri", "matius fakhiri", "mathius d. fakhiri", "mathius fakhiri", "gubernur papua"]
WAGUB_KEYS = ["aryoko rumaropen", "wakil gubernur papua", "wagub papua"]

MAX_JUDUL = 200
# Batas target total baris untuk menjaga ukuran JSON dashboard.
TARGET_ROWS = 4000


def strip_html(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s or "")
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def klasifikasi_kategori(judul: str, narasumber: str) -> str:
    teks = f"{judul} {narasumber}".lower()
    for kat, keys in KAT_KEYS:
        for k in keys:
            if k in teks:
                return kat
    return "Tata Kelola Pemerintahan"


def entitas_terkait(judul: str, narasumber: str, default: str | None) -> str | None:
    teks = f"{judul} {narasumber}".lower()
    for k in WAGUB_KEYS:
        if k in teks:
            return "Wakil Gubernur"
    for k in GUB_KEYS:
        if k in teks:
            return "Gubernur"
    return default


def parse_tanggal(v) -> str | None:
    if v is None:
        return None
    s = str(v)[:10]
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return s
    return None


def parse_sentimen(v) -> str:
    return SENTIMEN_MAP.get(str(v).strip().lower(), "Netral")


def iter_rows(path: str, is_socmed: bool, forced_entitas: str | None):
    wb = load_workbook(path, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = ws.iter_rows(values_only=True)
    header = next(rows, None)
    if not header:
        return
    idx = {str(h).strip(): i for i, h in enumerate(header) if h is not None}
    # Field posisi
    i_tgl = idx.get("Tanggal")
    # Untuk socmed, pakai Isi sebagai teks "judul" (socmed tidak punya kolom Judul).
    i_judul = idx.get("Judul") if "Judul" in idx else idx.get("Isi")
    i_sentimen = idx.get("Sentimen")
    i_media = idx.get("Media") if "Media" in idx else idx.get("Platform")
    i_nara = idx.get("Narasumber") if "Narasumber" in idx else idx.get("Username")
    i_link = idx.get("Link")
    for r in rows:
        try:
            tgl = parse_tanggal(r[i_tgl]) if i_tgl is not None else None
            if not tgl:
                continue
            judul = strip_html(str(r[i_judul] or "") if i_judul is not None else "")[:MAX_JUDUL]
            if not judul:
                continue
            sumber_raw = str(r[i_media] or "").strip() if i_media is not None else ""
            if not sumber_raw:
                sumber_raw = "Socmed" if is_socmed else "Media"
            # Normalisasi nama platform socmed
            if is_socmed:
                sumber = sumber_raw.title()
            else:
                sumber = sumber_raw
            narasumber = str(r[i_nara] or "") if i_nara is not None else ""
            sentimen = parse_sentimen(r[i_sentimen]) if i_sentimen is not None else "Netral"
            url = str(r[i_link] or "").strip() if i_link is not None else ""
            kategori = klasifikasi_kategori(judul, narasumber)
            ent = entitas_terkait(judul, narasumber, forced_entitas)
            out = {
                "tanggal": tgl,
                "judul": judul,
                "sumber": sumber or "Tidak diketahui",
                "sentimen": sentimen,
                "url": url or "#",
                "kategori": kategori,
            }
            if ent:
                out["entitasTerkait"] = ent
            yield out
        except Exception:
            continue
    wb.close()


def main():
    # Urutan: file Gubernur & Wakil Gubernur DULU supaya entitasTerkait tidak
    # ditiban oleh pembacaan file Papua umum (URL sering sama persis).
    sumber_files = [
        ("IMD News Isu - All Data - Gubernur Papua - 16102026 - 14112026.xlsx", False, "Gubernur"),
        ("IMD News Isu - All Data - Wakil Gubernur Papua - 16102026 - 14112026.xlsx", False, "Wakil Gubernur"),
        ("IMD News Isu - All Data - Papua - 16102026 - 14112026.xlsx", False, None),
        ("IMD Socmed Isu - All Data - Papua - 16102026 - 14112026.xlsx", True, None),
    ]
    rows_news: list[dict] = []
    rows_socmed: list[dict] = []
    seen_urls: set[str] = set()
    for fname, is_socmed, forced in sumber_files:
        p = os.path.join(ROOT, fname)
        if not os.path.exists(p):
            matches = glob.glob(os.path.join(ROOT, fname.replace(" - 16102026 - 14112026", " - *")))
            if matches:
                p = matches[0]
            else:
                print(f"SKIP (tidak ketemu): {fname}", file=sys.stderr)
                continue
        bucket = rows_socmed if is_socmed else rows_news
        n_before = len(bucket)
        for row in iter_rows(p, is_socmed, forced):
            key = row["url"]
            if key and key != "#" and key in seen_urls:
                continue
            if key and key != "#":
                seen_urls.add(key)
            bucket.append(row)
        print(f"{os.path.basename(p)}: +{len(bucket) - n_before} baris")

    # Alokasi target: 85% news + 15% socmed, selalu simpan SEMUA baris dengan
    # entitasTerkait (Gubernur/Wakil Gubernur) supaya halaman pimpinan ada datanya.
    target_news = int(TARGET_ROWS * 0.85)
    target_socmed = TARGET_ROWS - target_news

    def sampling_rata(baris: list[dict], target: int) -> list[dict]:
        baris.sort(key=lambda r: r["tanggal"], reverse=True)
        if len(baris) <= target:
            return baris
        wajib = [r for r in baris if r.get("entitasTerkait")]
        sisa = [r for r in baris if not r.get("entitasTerkait")]
        slot_sisa = max(0, target - len(wajib))
        if slot_sisa <= 0 or not sisa:
            return (wajib + sisa)[:target]
        step = len(sisa) / slot_sisa
        kept, i = [], 0.0
        while int(i) < len(sisa) and len(kept) < slot_sisa:
            kept.append(sisa[int(i)])
            i += step
        return wajib + kept

    rows_news = sampling_rata(rows_news, target_news)
    rows_socmed = sampling_rata(rows_socmed, target_socmed)
    all_rows = rows_news + rows_socmed
    all_rows.sort(key=lambda r: r["tanggal"], reverse=True)

    cats = Counter(r["kategori"] for r in all_rows)
    ents = Counter(r.get("entitasTerkait", "-") for r in all_rows)
    sents = Counter(r["sentimen"] for r in all_rows)
    print(f"total ditulis: {len(all_rows)}")
    print(f"kategori: {dict(cats)}")
    print(f"entitas: {dict(ents)}")
    print(f"sentimen: {dict(sents)}")

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(all_rows, f, ensure_ascii=False, separators=(",", ":"))
    print(f"ditulis ke: {OUT} ({os.path.getsize(OUT)/1024:.1f} KB)")


if __name__ == "__main__":
    main()
