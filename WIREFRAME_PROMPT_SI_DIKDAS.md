Create detailed wireframes for SI-DIKDAS (Sistem Informasi Layanan Pendidikan Dasar) - Dinas Pendidikan dan Kebudayaan Kabupaten Konawe Utara.
Use grayscale/black-and-white wireframe style only — no colors, no images, just layout structure, placeholder boxes, labels, and navigation flow.

## Application Context
SI-DIKDAS is an integrated public service portal, data management system, and interactive analytics dashboard for the Primary Education Division (Bidang Dikdas) of Dinas Pendidikan dan Kebudayaan Kabupaten Konawe Utara.
The system is divided into two primary wings: the Public Information & School Service Portal, and the Protected Multi-Role Admin Management Portal covering Curriculum (BOSP, PIP, SPMB) and Facilities/Infrastructure (Sarpras).

Has 5 main sections:
1. Public Portal & Service Inquiries (Kurikulum, PIP Lookup, Sarpras public reports)
2. Authentication & Role Gate
3. Admin Executive Analytics Dashboard (Interactive Charts & Metrics)
4. Management & Manual Data Entry Modules (BOSP, PIP, SPMB, Sarpras)
5. System Configuration & Official Report PDF Generation (Dynamic Logo replacer & letterhead export)

## Wireframe Pages Required

--- PAGE W-01: PUBLIC LANDING PAGE (PORTAL UTAMA) ---
Layout: Full-width responsive header, hero section, 2-column feature highlight, data statistics row, news cards grid, multi-column footer.
- Top Utility Bar: Emergency hotline, service hours, link: [icon: lock] "Login Portal Admin Dikdas"
- Main Header: Dynamic agency logo placeholder [Box with X] "Logo Pemkab / Dikbud Konut", Agency title "DINAS PENDIDIKAN DAN KEBUDAYAAN KAB. KONAWE UTARA", App title "SI-DIKDAS: Sistem Informasi Layanan Pendidikan Dasar", Search bar [icon: search] "Cari layanan, juknis, atau pengumuman...", Navigation menu items: "Beranda", "Layanan Kurikulum", "Layanan Sarpras", "Pengumuman", "Kontak"
- Hero Section: High-impact hero box with badge "PORTAL TERPADU LAYANAN PENDIDIKAN DASAR", Main headline text "Transparansi dan Akselerasi Layanan Pendidikan Dasar Konawe Utara", Subtitle "Pusat informasi resmi penyaluran BOSP, bantuan PIP, SPMB, serta usulan sarana dan prasarana sekolah SD & SMP", Two CTA buttons: [Button: Filled Dark] "Eksplorasi Seksi Kurikulum →", [Button: Outlined] "Layanan Seksi Sarpras →"
- Key Service Quick Cards (2 Wide Cards):
  - Card 1: [icon: book-open] "SEKSI KURIKULUM & KESISWAAN" — bullet points: "Monitoring & SPJ BOSP", "Pengecekan Bantuan Siswa PIP", "Informasi & Juknis SPMB SD/SMP", Button [icon: arrow-right] "Buka Layanan Kurikulum"
  - Card 2: [icon: building] "SEKSI SARANA & PRASARANA (SARPRAS)" — bullet points: "Pendataan Kondisi Gedung & Ruang", "Formulir Usulan Rehab & DAK Fisik", "Distribusi Bantuan TIK & Mebeler", Button [icon: arrow-right] "Buka Layanan Sarpras"
- Live Stats Metric Counter Bar: 4 metric boxes ("124 Total Sekolah Terdata", "Rp 18.4 M Realisasi BOSP 2026", "6,420 Siswa Penerima PIP", "48 Sekolah Prioritas Rehab DAK")
- Public Announcement & News Section: Section header with filter pills ("Semua", "Edaran Kurikulum", "Informasi Sarpras"), 3 news card placeholders with [Box with X] thumbnail, date stamp badge, headline, and "Unduh Surat Edaran [icon: download]"
- Footer: Agency address "Kompleks Perkantoran Pemkab Konawe Utara", contact channels, external links to Kemendikbudristek, copyright text.

--- PAGE W-02: PUBLIC KURIKULUM CHANNEL & PIP LOOKUP ---
Layout: Breadcrumb navigation, tabbed interface header ("Layanan BOSP", "Cek Status PIP Siswa", "Petunjuk SPMB SD/SMP"), dynamic content container.
- Header: Breadcrumb "Beranda > Seksi Kurikulum", Title "Layanan Informasi & Administrasi Kurikulum Dikdas"
- Tab Bar: 3 active-state pills: [Tab: Outlined Active] "Cek Bantuan PIP Siswa", [Tab: Inactive] "Penyaluran Dana BOSP", [Tab: Inactive] "Juknis SPMB / PPDB"
- PIP Search Box Container (Centered prominent card):
  - Card Header: [icon: search] "Cek Status Pencairan Program Indonesia Pintar (PIP)"
  - Input field with clear label: "Masukkan Nomor Induk Siswa Nasional (NISN): [e.g. 0081234567]"
  - Input field: "Pilih Tahun Anggaran: [Dropdown: 2026 / 2025]"
  - Action Button: [Button: Filled Dark] "Periksa Status Penyaluran PIP"
- Search Result State Box (Conditionally displayed below):
  - Student identity summary row: NISN, Nama Siswa, Asal Sekolah (e.g. "SDN 1 Asera"), Jenjang / Kelas ("SD / Kelas V")
  - Status Indicator Badge: [Badge: Filled Dark] "DANA SUDAH CAIR / TERSALURKAN"
  - Detail table: Nominal Bantuan ("Rp 450.000"), Bank Penyalur ("Bank BRI Unit Wanggudu"), Tanggal Terbit SK, Status Rekening ("Buku Tabungan / SimPel Aktif"), Catatan Dinas ("Silakan bawa bukti cetak ini ke bank penyalur terdekat")
  - Download Button: [Button: Outlined] [icon: printer] "Cetak Bukti Verifikasi PIP (PDF)"

--- PAGE W-03: PUBLIC SARPRAS CHANNEL & ONLINE SCHOOL DAMAGE SUBMISSION ---
Layout: 2-column layout. Left column (40%): Public summary chart & guidance. Right column (60%): Interactive damage reporting form for school operators.
- Header: Breadcrumb "Beranda > Seksi Sarpras", Title "Pusat Pendataan & Usulan Sarana Prasarana Sekolah"
- Left Column (Public Info):
  - Mini Chart Placeholder: [Chart Frame: Donut Chart] labeled "Statistik Kondisi Ruang Kelas SD/SMP Konawe Utara (Baik: 62%, Rusak Sedang: 25%, Rusak Berat: 13%)"
  - Info Box: "Alur Usulan Bantuan Rehab Gedung & TIK Melalui SI-Dikdas" (Numbered steps 1 to 4)
  - Helpdesk contact box: WhatsApp number & Sarpras technical staff contact.
- Right Column (Form Pengajuan Usulan Sarpras Mandiri Sekolah):
  - Form Header: [icon: edit] "Formulir Pelaporan Kerusakan & Usulan Kebutuhan Sarpras"
  - Form Fields:
    - Field 1: "NPSN Sekolah: [Input Text]" + [Button: Small] "Validasi Sekolah"
    - Field 2: "Nama Sekolah & Kecamatan: [Input Auto-filled Disabled]"
    - Field 3: "Jenis Fasilitas / Ruang: [Dropdown: Ruang Kelas / Lab Komputer TIK / Toilet Siswa / Perpustakaan / Mebeler]"
    - Field 4: "Tingkat Kerusakan: [Radio buttons: Rusak Ringan / Rusak Sedang / Rusak Berat]"
    - Field 5: "Jumlah Unit Terdampak: [Input Number: e.g. 3 Ruang]"
    - Field 6: "Deskripsi Detail Kerusakan: [Textarea]"
    - Field 7: "Unggah Foto Bukti Fisik: [Box with X] Drag & drop file area ('Format JPG/PNG, maks 5MB, kompresi otomatis')"
    - Field 8: "Nama & No. HP Kepala Sekolah / Operator: [Input Text]"
  - Form Action Bar: [Button: Outlined] "Reset Formulir", [Button: Filled Dark] "Kirim Usulan ke Seksi Sarpras [icon: send]"

--- PAGE W-04: MOBILE RESPONSIVE BREAKPOINT VIEW (HOMEPAGE & PIP LOOKUP) ---
Layout: 390px mobile viewport width single-column layout.
- Sticky Mobile Navbar: [icon: menu] Hamburger button, Mini App Logo, "SI-DIKDAS", [icon: user] Login icon
- Hero Mobile Card: Headline "Layanan Pendidikan Dasar Konawe Utara", Quick Action Pills ("Kurikulum", "Sarpras", "PIP", "BOSP")
- Quick PIP Lookup Mobile Card: Collapsed search input + Large touch-friendly button "Cek PIP"
- Mobile Stats Scroll: Horizontal swipable metric cards
- Mobile Bottom Navigation Bar (Fixed 4 items): [icon: home] "Beranda", [icon: book] "Kurikulum", [icon: building] "Sarpras", [icon: lock] "Admin"

--- PAGE W-05: AUTHENTICATION PAGE (ADMIN PORTAL LOGIN - SINGLE ADMIN ROLE) ---
Layout: Centered login card on minimal background.
- Card Header: Dynamic Logo Placeholder [Box with X], Title "PORTAL ADMIN SI-DIKDAS", Subtitle "Dinas Pendidikan dan Kebudayaan Kab. Konawe Utara"
- Form Inputs:
  - Input 1: "Nama Pengguna / Username: [Input Text with icon: user]"
  - Input 2: "Kata Sandi / Password: [Input Password with icon: lock and show/hide toggle]"
  - Info note: "Satu akun Admin Terpadu untuk mengelola seluruh Seksi Kurikulum, Sarpras, dan Pengaturan Sistem."
- Remember me checkbox + "Bantuan Akses / Lupa Sandi?" link
- Submit Action: [Button: Full-Width Filled Dark] "Masuk ke Sistem Administrasi [icon: log-in]"
- Footer Notice: "Sistem Terlindungi Enkripsi Sesi Google Apps Script - Hanya untuk Personil Resmi Dikbud Konut"

--- PAGE W-06: ADMIN EXECUTIVE DASHBOARD & INTERACTIVE CHARTS ---
Layout: Permanent left sidebar navigation, top bar, main dashboard area with KPI tiles and 3 major chart frames.
- Left Sidebar Navigation:
  - Branding Section: Dynamic Logo [Box with X] + "SI-DIKDAS KONUT", Logged-in badge "Admin SI-Dikdas"
  - Menu Items with simple icons:
    - [icon: layout-dashboard] "Dashboard Utama" (Active indicator)
    - Section Divider: "SEKSI KURIKULUM"
    - [icon: dollar-sign] "Data Penyaluran BOSP" [Badge: "Tahap 1"]
    - [icon: award] "Data Program PIP" [Badge: "24 Baru"]
    - [icon: user-check] "Daya Tampung SPMB"
    - Section Divider: "SEKSI SARPRAS"
    - [icon: home] "Pendataan Sarpras Fisik"
    - [icon: alert-triangle] "Verifikasi Usulan Rehab" [Badge: "12 Pending"]
    - Section Divider: "PENGATURAN"
    - [icon: settings] "Konfigurasi & Ganti Logo"
    - [icon: file-text] "Pusat Laporan & Cetak PDF"
    - [icon: log-out] "Keluar Sistem"
- Top Header Bar: Page title "Dashboard Eksekutif & Statistik Pendidikan Dasar", Academic Year Filter "[Dropdown: 2026/2027]", District Filter "[Dropdown: Semua Kecamatan]", Notification bell [icon: bell with badge: "5"], User avatar dropdown.
- Top KPI Metric Cards (4 Grid Cards):
  - Card 1: "Realisasi BOSP" -> "Rp 18,450,000,000 / 92% Tersalurkan" [Mini trend graph]
  - Card 2: "Penerima Beasiswa PIP" -> "6,420 Siswa Terverifikasi" [Mini trend graph]
  - Card 3: "Total Usulan Sarpras" -> "64 Usulan (18 Rusak Berat)" [Badge: "Perlu Verifikasi"]
  - Card 4: "Kepatuhan SPJ Sekolah" -> "112 / 124 Sekolah Selesai" [Progress bar]
- Analytics Chart Section:
  - Chart Frame 1 (Left 60%): [Chart Frame: Bar Chart] labeled "Komparasi Pagu vs Realisasi Penyaluran BOSP SD & SMP per Kecamatan di Konawe Utara (Sumbu X: Kecamatan, Sumbu Y: Miliar Rupiah)"
  - Chart Frame 2 (Right 40%): [Chart Frame: Donut Chart] labeled "Distribusi Status Pencairan Beasiswa PIP (Cair: 78%, Belum Aktivasi: 18%, Gagal Salur: 4%)"
  - Chart Frame 3 (Full Width): [Chart Frame: Stacked Bar Chart] labeled "Peta Kerusakan Fasilitas Sekolah per Kategori (Ruang Kelas, Lab TIK, Toilet, Mebeler - Baik vs Rusak Sedang vs Rusak Berat)"
- Recent Activities Table (Mini 5 rows): Timestamp, Submitter School, Activity Type, Status Pill, Quick View button.

--- PAGE W-07: ADMIN KURIKULUM - BOSP & PIP DATA MANAGEMENT ---
Layout: Sidebar + Top bar. Header controls, tab switcher ("Manajemen BOSP", "Manajemen PIP Siswa"), filter bar, responsive data table, sticky bottom action/pagination.
- Header Controls: Page title "Manajemen Data Seksi Kurikulum", Action buttons: [Button: Outlined] [icon: upload] "Import Batch (Excel)", [Button: Filled Dark] [icon: plus] "Input Data Manual Baru"
- Sub-Module Tabs: [Pill: Active] "Data Penyaluran BOSP 2026", [Pill: Inactive] "Data Penerima PIP"
- Search & Filter Toolbar:
  - Search box: [icon: search] "Cari Nama Sekolah, NPSN, atau NISN..."
  - Dropdown Filter 1: "Jenjang: [Semua / SD / SMP]"
  - Dropdown Filter 2: "Kecamatan: [Semua Kecamatan / Asera / Lasolo / Molawe / Wiwirano ...]"
  - Dropdown Filter 3: "Status Salur: [Semua / Siap Salur / Cair / SPJ Terverifikasi]"
  - Export Group: [Button: Outlined] [icon: file-spreadsheet] "Ekspor Excel (.xlsx)", [Button: Outlined] [icon: printer] "Cetak Rekap PDF"
- Main Data Table:
  - Columns: Checkbox, No, NPSN, Nama Sekolah, Jenjang, Kecamatan, Alokasi Dana (Rp), Tahap, Status SPJ (Pill: "Terverifikasi" / "Menunggu Revisi"), Aksi
  - Row Actions: [icon: eye] View SPJ document, [icon: edit] Edit alokasi, [icon: check] Approve SPJ, [icon: trash] Delete
- Table Pagination Footer: Showing 1-15 of 124 entries, page navigation buttons [1] [2] [3] ... [Next]

--- PAGE W-08: MODAL / SLIDE-OVER FORM - INPUT DATA MANUAL BOSP & PIP ---
Layout: Modal overlay dialog (600px width) with dimmed backdrop.
- Modal Header: Title "Formulir Input / Pemutakhiran Data BOSP Sekolah", Close button [icon: x]
- Form Sections:
  - Section 1 (Identitas Sekolah):
    - Input: "Pilih Sekolah: [Searchable Dropdown: Ketik NPSN atau Nama Sekolah]"
    - Disabled fields: "Jenjang: SD Negeri 1 Lasolo", "Kecamatan: Lasolo"
  - Section 2 (Alokasi Dana & Tahap):
    - Input: "Tahun Anggaran: [Dropdown: 2026]", "Tahap Pencairan: [Dropdown: Tahap 1 (Jan-Jun) / Tahap 2 (Jul-Des)]"
    - Input: "Nominal Alokasi Dana: [Input Currency: Rp 145.000.000]"
    - Input: "Tanggal Penyaluran: [Date Picker]"
  - Section 3 (Verifikasi SPJ & Berkas):
    - Radio Buttons: "Status SPJ: [ ] Belum Terima  [x] Sedang Diverifikasi  [ ] SPJ Lengkap & Disetujui"
    - Upload field: "Unggah Lembar Pengesahan SPJ / Bukti Transfer: [Box with X] (Upload PDF/Drive Link)"
    - Textarea: "Catatan Koreksi Tim Manajemen Kurikulum: [Textarea]"
- Modal Action Footer: [Button: Outlined] "Batalkan", [Button: Filled Dark] [icon: save] "Simpan Data Penyaluran"

--- PAGE W-09: ADMIN SARPRAS - INVENTORY & DAMAGE VERIFICATION ---
Layout: Sidebar + Top bar. Header controls, statistics ribbon, filter bar, data table with image thumbnails and status approval triggers.
- Header: Title "Manajemen Sarana Prasarana & Usulan Rehabilitasi", Action buttons: [Button: Outlined] [icon: file-spreadsheet] "Ekspor Rekap DAK (Excel)", [Button: Filled Dark] [icon: plus] "Input Pendataan Sarpras Manual"
- Quick Filter Metric Badges: "Semua (64)", "Perlu Survey Lapangan (18)", "Rekomendasi DAK 2027 (12)", "Prioritas APBD (10)", "Selesai Direhab (24)"
- Search & Filter Row: NPSN search, Facility type dropdown, Damage severity dropdown (Rusak Berat/Sedang/Ringan).
- Data Table:
  - Columns: Checkbox, No, Foto Kerusakan [Small Box with X Thumbnail], Sekolah & NPSN, Fasilitas, Tingkat Kerusakan (Pill: "RUSAK BERAT"), Estimasi Kebutuhan (Rp), Status Usulan, Aksi
  - Row Actions: [Button: Small Dark] "Verifikasi & Rekomendasi", [icon: eye] Preview Full Photos, [icon: printer] Cetak Berita Acara Survey
- Quick Decision Drawer (Opens on clicking Verifikasi): Split view modal with high-res photo preview on left, and evaluation checklist + decision dropdown ("Setujui DAK Fisik / Survey Ulang / Tolak Usulan") on right.

--- PAGE W-10: MODAL / PAGE - INPUT MANUAL PENDATAAN KONDISI SARPRAS ---
Layout: Stepped form layout (Step 1: Identitas Sekolah & Fasilitas -> Step 2: Rincian Kerusakan Fisik -> Step 3: Dokumentasi Foto & Anggaran).
- Step Indicators: [Step 1: Done] "Profil Sekolah", [Step 2: Active] "Kondisi Fisik", [Step 3: Pending] "Lampiran Bukti"
- Form Body:
  - Input: "Jenis Ruang / Sarpras: [Dropdown: Ruang Kelas / Laboratorium IPA / Lab Komputer / Ruang Guru / Jamban/Toilet / Pagar Sekolah]"
  - Counter Fields: "Kondisi Baik: [Number]", "Rusak Ringan: [Number]", "Rusak Sedang: [Number]", "Rusak Berat: [Number]"
  - Checklist Komponen Rusak: "[x] Kerusakan Atap/Plafon", "[x] Kerusakan Kusen & Daun Pintu/Jendela", "[ ] Kerusakan Pondasi/Struktur", "[x] Lantai Keramik Pecah"
  - Input: "Estimasi Biaya Perbaikan (RAB): [Input Currency: Rp 85.000.000]"
  - Upload Area: Multiple file dropzone [Box with X] "Unggah Foto Bukti Fisik Kerusakan (Foto Depan, Interior, Atap - Minimal 3 Foto)"
- Action Buttons: [Button: Outlined] "Kembali", [Button: Filled Dark] "Simpan & Daftarkan ke Database Sarpras"

--- PAGE W-11: SUPER ADMIN - SYSTEM CONFIGURATION & LIVE BRANDING CUSTOMIZER ---
Layout: Sidebar + Top bar. Tabbed configuration interface ("Identitas & Ganti Logo", "Pejabat Penandatangan", "Manajemen Akun Admin").
- Active Tab: "Pengaturan Identitas & Ganti Logo Instansi"
- 2-Column Setting Layout:
  - Left Panel (Control Form):
    - Form Input: "Nama Aplikasi: [Input: SI-DIKDAS: Sistem Informasi Layanan Pendidikan Dasar]"
    - Form Input: "Tagline / Semboyan: [Input: Maju Bersama Pendidikan Berkualitas Konawe Utara]"
    - Upload Logo Utama (Aplikasi): [Box with X] "Upload Logo Aplikasi (PNG Transparan, maks 2MB)" + URL Input fallback
    - Upload Logo Daerah (Pemkab Konawe Utara): [Box with X] "Upload Logo Daerah Pemkab"
    - Upload Logo Tut Wuri Handayani / Kemendikbud: [Box with X] "Upload Logo Tutwuri"
    - Action: [Button: Filled Dark] [icon: check] "Simpan & Terapkan Perubahan Logo"
  - Right Panel (Live Dynamic Preview Card):
    - Preview box demonstrating how the Header, Navbar, Mobile view, and Official PDF Kop will look immediately with the new logos.
    - Notice badge: "Perubahan logo akan langsung tampil di seluruh antarmuka portal dan lembar cetak PDF tanpa perlu refresh manual."
- Pejabat Penandatangan Configuration:
  - Input: "Nama Kepala Dinas: [Input Text: Dr. H. Asrap, M.Pd]"
  - Input: "NIP Kepala Dinas: [Input Text: 1968...]"
  - Input: "Nama Kabid Dikdas: [Input Text: H. Sahbin, S.Pd., M.Si]"
  - Input: "NIP Kabid Dikdas: [Input Text: 1974...]"

--- PAGE W-12: OFFICIAL REPORT PRINT PREVIEW & PDF GENERATOR ---
Layout: Realistic A4-proportioned paper preview on gray background with top floating toolbar.
- Floating Toolbar: [Button: Filled Dark] [icon: printer] "Cetak Sekarang (Print)", [Button: Outlined] [icon: download] "Unduh File PDF", [Dropdown: Pilih Format Kop: Kop Resmi Pemkab Konut / Kop Bidang Dikdas], Zoom controls [ - 100% + ]
- A4 Paper Preview Container:
  - Official Kop Surat (Header):
    - Left: Official Logo Pemkab Konawe Utara [Box with X]
    - Right: Logo Tut Wuri Handayani [Box with X]
    - Center Text: "PEMERINTAH KABUPATEN KONAWE UTARA", "DINAS PENDIDIKAN DAN KEBUDAYAAN", "BIDANG PENDIDIKAN DASAR", Address: "Jl. Poros Wanggudu - Kendari, Kompleks Perkantoran Pemkab, Wanggudu", Double horizontal divider line (thick + thin)
  - Document Title: "REKAPITULASI PENYALURAN DANA BANTUAN OPERASIONAL SATUAN PENDIDIKAN (BOSP) SD & SMP", Sub-title: "KABUPATEN KONAWE UTARA - TAHUN ANGGARAN 2026"
  - Filter Meta Row: "Periode Cetak: Semester Ganjil 2026 | Jenjang: SD & SMP | Tanggal Cetak: 04 November 2026"
  - Data Table: Structured lines, bordered cells, alternating row shades, columns matching the report.
  - Total Summary Row: "TOTAL KESELURUHAN REALISASI: Rp 18.450.000.000 (Terbilang: Delapan Belas Miliar...)"
  - Verification & Signature Footer:
    - Left side: [Box with X] HMAC QR Code for document authenticity validation ("Pindai untuk memverifikasi keaslian dokumen resmi Dikbud Konut")
    - Right side: Date of issuance, Official Title "Kepala Bidang Pendidikan Dasar", Signature placeholder, Official Name & NIP.

## Wireframe Style Notes
- Use only grayscale: white, light gray (#EEEEEE), medium gray (#AAAAAA), dark gray (#333333), black
- Text placeholders: Use actual representative labels, not "Lorem Ipsum"
- Buttons: Show shape and label clearly — primary buttons filled dark, secondary outlined
- Images/covers: Show as plain box with X through it (standard wireframe placeholder)
- Charts: Show as empty chart frames with axis labels and chart type label inside
- Icons: Show as simple labeled squares [icon: name]
- Number badges: Show on nav items where relevant (pending counts, notifications)
- Show mobile breakpoint for at least the HOME page as additional frame (PAGE W-04)
- Add flow arrows between key pages:
  - [W-01 Home] -> [W-02 Kurikulum / PIP Lookup] -> [W-02 Result PDF Print]
  - [W-01 Home] -> [W-03 Sarpras Submission] -> [W-09 Sarpras Admin Review]
  - [W-01 Home] -> [W-05 Admin Login] -> [W-06 Executive Dashboard]
  - [W-06 Dashboard] -> [W-07 BOSP & PIP Management] -> [W-08 Manual Input Modal] -> [W-12 PDF Export]
  - [W-06 Dashboard] -> [W-11 System Settings & Ganti Logo] -> [Live Preview Dynamic Header]
