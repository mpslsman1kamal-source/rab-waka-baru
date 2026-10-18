# Panduan Instalasi — RAB Waka

Aplikasi terdiri dari dua bagian:
1. **Backend** — file `.gs` di Google Apps Script (REST API + Google Sheets + Drive).
2. **Frontend** — folder ini (`index.html`, `css/`, `js/`) yang dihosting di GitHub Pages.

## A. Backend (Google Apps Script)

1. Buka https://script.google.com → **Proyek baru**. Beri nama `RAB Waka`.
2. Buat berkas skrip sesuai nama file yang Anda terima, lalu tempel isinya satu per satu:
   `Db.gs`, `Kode.gs`, `Auth.gs`, `Rab.gs`, `Berkas.gs`, `Notifikasi.gs`, `Cetak.gs`, `Admin.gs`, `Setup.gs`.
   (Hapus `Code.gs` bawaan.)
3. Buka **Pengaturan proyek** → centang **Tampilkan file manifes "appsscript.json"** → ganti isinya dengan `appsscript.json` yang dikirim.
4. Pilih fungsi **`setupAppEnvironment`** → **Jalankan**. Setujui izin (Drive, Sheets, Mail, External request).
5. Buka **Log eksekusi**: catat **email admin** dan **sandi awal**. Spreadsheet dan folder Drive dibuat otomatis.
6. (Opsional, untuk uji coba) jalankan **`seedDemoUsers`** untuk membuat akun contoh tiap peran. Hapus akun ini sebelum dipakai sungguhan.
7. **Terapkan → Deployment baru → Aplikasi web**
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**
   - Salin URL berakhiran **`/exec`**.
8. Setiap mengubah kode `.gs`: **Terapkan → Kelola deployment → Edit → Versi baru**. URL tetap sama.

## B. Frontend (GitHub Pages)

1. Ekstrak ZIP `rab-waka-frontend.zip`. Anda akan mendapat folder `rab-waka-frontend`.
2. Buka `js/config.js`, ganti `GANTI_DENGAN_URL_WEB_APP_GAS` dengan URL `/exec` dari langkah A.7. Simpan.
3. Buat repositori kosong di GitHub (mis. `rab-waka`), tanpa README.
4. Buka terminal **di dalam folder `rab-waka-frontend`** (folder yang berisi `index.html`). Periksa dengan `dir` (Windows) atau `ls` (Mac/Linux): `index.html` harus terlihat langsung.
5. Jalankan:
   ```
   git init
   git add .
   git commit -m "RAB Waka v1.0"
   git branch -M main
   git remote add origin https://github.com/USERNAME/rab-waka.git
   git push -u origin main
   ```
   Saat diminta sandi, gunakan **Personal Access Token** (GitHub → Settings → Developer settings → Tokens, izin `repo`).
   Jangan memakai "Upload files" di web GitHub — struktur folder bisa rusak.
6. Repo → **Settings → Pages** → Source: *Deploy from a branch*, Branch **main**, folder **/ (root)** → Save. Centang **Enforce HTTPS**.
7. Tunggu 1–2 menit, buka `https://USERNAME.github.io/rab-waka/`.

Memperbarui: ubah file → `git add .` → `git commit -m "pesan"` → `git push`.

## C. Konfigurasi awal (login sebagai Admin)

1. **Ganti sandi awal** (menu pengguna).
2. **Admin → Notifikasi**: isi identitas sekolah, tahun ajaran, `APP_URL` (URL GitHub Pages), dan token WhatsApp (Fonnte) bila dipakai.
3. **Admin → Pagu**: pagu induk dan pagu per Waka per semester.
4. **Admin → Katalog SSH**: harga bawaan hanyalah **contoh**. Ganti lewat Impor CSV dengan harga resmi/juknis.
5. **Admin → Pengguna**: buat akun Kepala Sekolah, Bendahara, Waka, Staf.

## D. Uji penerimaan singkat
- Waka menyusun RAB → mengajukan (surat usulan + 3 pernyataan wajib).
- Bendahara memeriksa: tandai Setuju/Revisi per item → kembalikan / teruskan.
- Kepala Sekolah memvalidasi/menyetujui.
- Item "didanai lain" tidak menambah nilai BOSP; "kebutuhan riil" wajib foto kondisi.
- Cetak PDF, cek rekap & grafik, cek notifikasi email.

## Catatan
- Pengiriman ke ARKAS dilakukan manual (tidak ada tombol integrasi).
- Ukuran A4 PDF dari server perlu dicek pada pencetakan pertama; alternatif: cetak dari halaman **Cetak** lewat browser.
- WhatsApp (Fonnte) dan email perlu dicoba langsung di akun Anda.
