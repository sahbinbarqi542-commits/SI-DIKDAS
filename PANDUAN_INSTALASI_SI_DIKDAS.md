# 📋 PANDUAN INSTALASI & DEPLOYMENT APLIKASI WEB SI-DIKDAS
### Dinas Pendidikan dan Kebudayaan Kabupaten Konawe Utara

Aplikasi web **SI-DIKDAS** dibangun dengan arsitektur **Google Apps Script (GAS) 4 File Modular** (SPA Murni) tanpa dependensi berbayar, memanfaatkan Google Sheets sebagai database relasional dan Google Drive sebagai penyimpanan foto/berkas.

---

## 🛠️ Langkah-Langkah Pemasangan di Google Apps Script

### Langkah 1: Buka Google Apps Script
1. Buka peramban Anda dan kunjungi: **[https://script.google.com](https://script.google.com)**
2. Pastikan Anda telah login menggunakan akun Google resmi (misal: akun kedinasan / Google Workspace).
3. Klik tombol **"+ Proyek Baru"** (New Project) di kiri atas.
4. Beri judul proyek di kiri atas: **`SI-DIKDAS Konawe Utara`**.

---

### Langkah 2: Buat & Salin 4 File Modular
Aplikasi ini terdiri dari 4 file yang ada di folder kerja komputer Anda:

1. **File `Kode.gs`**:
   - Buka file default `Code.gs` di editor Apps Script.
   - Hapus semua isinya, lalu salin seluruh isi file [Kode.gs](file:///c:/Users/Digitalisasi/Documents/APLIKASI%20WEB%20SAHBIN/ANTI%20GRAVITY/APK%20SI%20DIKDAS/Kode.gs).
   - Simpan (Ctrl + S).

2. **File `Index.html`**:
   - Klik tanda **"+"** di samping tulisan Files → Pilih **HTML**.
   - Beri nama: `Index` *(tanpa ekstensi .html)*.
   - Hapus isinya, lalu salin seluruh isi file [Index.html](file:///c:/Users/Digitalisasi/Documents/APLIKASI%20WEB%20SAHBIN/ANTI%20GRAVITY/APK%20SI%20DIKDAS/Index.html).
   - Simpan (Ctrl + S).

3. **File `Stylesheet.html`**:
   - Klik tanda **"+"** → Pilih **HTML**.
   - Beri nama: `Stylesheet` *(tanpa ekstensi .html)*.
   - Hapus isinya, lalu salin seluruh isi file [Stylesheet.html](file:///c:/Users/Digitalisasi/Documents/APLIKASI%20WEB%20SAHBIN/ANTI%20GRAVITY/APK%20SI%20DIKDAS/Stylesheet.html).
   - Simpan (Ctrl + S).

4. **File `JavaScript.html`**:
   - Klik tanda **"+"** → Pilih **HTML**.
   - Beri nama: `JavaScript` *(tanpa ekstensi .html)*.
   - Hapus isinya, lalu salin seluruh isi file [JavaScript.html](file:///c:/Users/Digitalisasi/Documents/APLIKASI%20WEB%20SAHBIN/ANTI%20GRAVITY/APK%20SI%20DIKDAS/JavaScript.html).
   - Simpan (Ctrl + S).

---

### Langkah 3: Jalankan Fungsi Auto-Setup Basis Data
Fungsi `setupAppEnvironment()` akan membuat otomatis:
- Spreadsheet database multi-sheet (`TB_Config`, `TB_Users`, `TB_BOSP`, `TB_PIP`, `TB_Sarpras`, `TB_Pengumuman`).
- Folder Google Drive induk dan sub-folder upload (`01_Branding_Logos`, `02_Kurikulum_BOSP_PIP`, `03_Sarpras_Dokumentasi`).
- Data awal sekolah per kecamatan dan akun Admin Tunggal default.

**Cara menjalankannya:**
1. Di toolbar atas editor Apps Script, cari dropdown pilihan fungsi (biasanya bertuliskan `doGet`).
2. Ubah dropdown tersebut dan pilih **`setupAppEnvironment`**.
3. Klik tombol **▶ Run** (Jalankan).
4. Saat pertama kali dijalankan, Google akan memunculkan jendela **"Authorization Required"**:
   - Klik **Review Permissions** (Tinjau Izin).
   - Pilih akun Google Anda.
   - Klik **Advanced** (Lanjutan) di bagian bawah.
   - Klik **Go to SI-DIKDAS Konawe Utara (unsafe)**.
   - Klik **Allow** (Izinkan).
5. Buka tab **Execution Log** di bagian bawah. Anda akan melihat pesan sukses beserta ID Spreadsheet dan Folder Drive yang baru dibuat!

---

### Langkah 4: Publikasikan (Deploy) sebagai Aplikasi Web
1. Klik tombol biru **"Deploy"** di pojok kanan atas → Pilih **"New deployment"** (Penerapan baru).
2. Klik ikon gerigi (Select type) di samping kiri → Pilih **"Web app"** (Aplikasi web).
3. Isi konfigurasi sebagai berikut:
   - **Description**: `SI-DIKDAS Versi 1.0 - Konawe Utara`
   - **Execute as**: **`Me (email Anda)`** *(Penting: agar form upload dapat menulis ke Drive/Sheets dinas tanpa meminta login Google pada publik)*.
   - **Who has access**: **`Anyone`** (Siapa saja, termasuk anonim).
4. Klik tombol **"Deploy"**.
5. Salin tautan **Web App URL** yang diberikan (contoh format: `https://script.google.com/macros/s/.../exec`).
6. Selesai! Buka URL tersebut di browser komputer atau ponsel Anda.

---

## 🔑 Kredensial Login Admin Tunggal Default
- **Username**: `admin`
- **Password**: `dikdas123`

*(Catatan: Anda dapat langsung mengubah profil, logo instansi, nama pejabat, dan data melalui menu "Ganti Logo & Branding" di dalam panel Admin)*.
