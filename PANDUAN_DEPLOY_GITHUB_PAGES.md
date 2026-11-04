# 🚀 PANDUAN DEPLOYMENT FRONTEND KE GITHUB PAGES & BACKEND GAS REST API
### SI-DIKDAS: Sistem Informasi Layanan Pendidikan Dasar
### Dinas Pendidikan dan Kebudayaan Kabupaten Konawe Utara

Aplikasi ini menggunakan arsitektur **GAS-PRO-API** (Frontend decoupled statis yang di-hosting di **GitHub Pages** dengan backend **Google Apps Script REST API JSON murni**). Bebas iframe, bebas limit eksekusi lambat, aman, dan dapat diakses dengan domain kustom atau `username.github.io`.

---

## 🧭 TAHAP 1: Setup Backend Google Apps Script (REST API)

1. Buka **[https://script.google.com](https://script.google.com)** → Buat **Proyek Baru**.
2. Beri nama proyek: **`SI-DIKDAS Backend REST API`**.
3. Buka file `Code.gs`, hapus isinya, lalu salin isi file [backend/Kode.gs](file:///c:/Users/Digitalisasi/Documents/APLIKASI%20WEB%20SAHBIN/ANTI%20GRAVITY/APK%20SI%20DIKDAS/backend/Kode.gs).
4. Klik **"+"** di samping menu Files → pilih **Script** → beri nama `Migrasi` → salin isi file [backend/Migrasi.gs](file:///c:/Users/Digitalisasi/Documents/APLIKASI%20WEB%20SAHBIN/ANTI%20GRAVITY/APK%20SI%20DIKDAS/backend/Migrasi.gs).
5. **Jalankan Inisialisasi Otomatis (Auto-Setup):**
   - Pada toolbar atas, pilih fungsi: **`setupAppEnvironment`**.
   - Klik **▶ Run**.
   - Berikan izin (Review Permissions → Advanced → Allow).
   - Sistem akan otomatis membuat Google Spreadsheet database, folder Drive, dan token keamanan.
6. **Deploy sebagai Web App:**
   - Klik tombol biru **Deploy** (kanan atas) → **New deployment**.
   - Klik ikon gerigi (Select type) → pilih **Web app**.
   - Konfigurasi:
     - **Execute as**: **`Me`** *(Email Google Anda)*
     - **Who has access**: **`Anyone`**
   - Klik **Deploy**.
   - Salin **Web App URL** yang dihasilkan (format: `https://script.google.com/macros/s/AKfycb.../exec`).

---

## 🧭 TAHAP 2: Masukkan URL Backend ke Frontend

1. Buka file [js/config.js](file:///c:/Users/Digitalisasi/Documents/APLIKASI%20WEB%20SAHBIN/ANTI%20GRAVITY/APK%20SI%20DIKDAS/js/config.js) di komputer Anda.
2. Ganti URL contoh dengan **Web App URL** yang Anda salin pada Tahap 1:
   ```javascript
   const GAS_URL = 'https://script.google.com/macros/s/AKfycbz_URL_DEPLOY_ANDA_DISINI/exec';
   ```
3. Simpan berkas (`Ctrl + S`).

---

## 🧭 TAHAP 3: Deploy Frontend ke GitHub Pages (Terminal Git)

### 1. Buat Repositori Baru di GitHub
- Buka **[https://github.com](https://github.com)** → login ke akun Anda.
- Klik tombol hijau **New repository** (atau tanda **+** di pojok kanan atas):
  - Repository name: misal **`si-dikdas-konut`**
  - Pilih opsi **Public** *(wajib agar GitHub Pages gratis)*.
  - **JANGAN** centang *"Add a README file"*, *.gitignore*, atau lisensi.
  - Klik **Create repository**.

### 2. Eksekusi Perintah Git di Terminal (PowerShell / Command Prompt)
Buka terminal di folder proyek ini (`c:\Users\Digitalisasi\Documents\APLIKASI WEB SAHBIN\ANTI GRAVITY\APK SI DIKDAS`), lalu jalankan urutan perintah berikut:

```bash
# 1. Inisialisasi Git
git init

# 2. Tambahkan seluruh berkas (perhatikan tanda titik)
git add .

# 3. Buat commit pertama
git commit -m "Deploy SI-DIKDAS Konawe Utara dengan Desain Stitch UI/UX"

# 4. Ubah branch ke main
git branch -M main

# 5. Hubungkan ke repositori GitHub Anda (ganti USERNAME dan REPO Anda)
git remote add origin https://github.com/USERNAME/si-dikdas-konut.git

# 6. Kirim ke GitHub
git push -u origin main
```

> **Catatan Autentikasi GitHub:**  
> Jika terminal meminta password, gunakan **Personal Access Token (PAT)** Anda (bukan password akun GitHub).  
> *(Cara buat PAT: Buka https://github.com/settings/tokens → Generate new token classic → centang opsi `repo` → Copy token).*

---

## 🧭 TAHAP 4: Aktifkan GitHub Pages

1. Pada halaman repositori GitHub Anda, buka tab **Settings** (di bilah atas).
2. Di menu bilah kiri, klik **Pages**.
3. Di bagian **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: Pilih `main` dan folder `/ (root)`
   - Klik **Save**.
4. Tunggu 1–2 menit, lalu refresh halaman Settings → Pages.
5. Akan muncul banner hijau bertuliskan:
   > **Your site is live at https://USERNAME.github.io/si-dikdas-konut/**
6. Klik tautan tersebut dan aplikasi web SI-DIKDAS Anda kini **aktif online secara global**!

---

## 🔑 Kredensial Login Administrator Bawaan
- **Username**: `admin`
- **Password**: `dikdas123`

*(Password, nama pejabat, kop surat, dan logo instansi dapat diubah secara langsung kapan saja lewat menu "Ganti Logo & Pengaturan" di dalam panel Admin).*
