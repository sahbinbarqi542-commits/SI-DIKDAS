/**
 * ============================================================================
 * SI-DIKDAS: SISTEM INFORMASI LAYANAN PENDIDIKAN DASAR
 * Dinas Pendidikan dan Kebudayaan Kabupaten Konawe Utara
 * ============================================================================
 * Arsitektur: Google Apps Script (GAS) Web App - Single Page Application (SPA)
 * Database: Google Sheets Multi-Table
 * Penyimpanan Berkas: Google Drive
 * Visual UI: Sky-Blue Horizon & Cloud Glassmorphism with Bento Grid System
 * ============================================================================
 */

// Konstanta Konfigurasi Global
const APP_NAME = "SI-DIKDAS: Sistem Informasi Layanan Pendidikan Dasar";
const APP_TAGLINE = "Membangun Masa Depan Pendidikan Dasar Konawe Utara yang Cerdas dan Adaptif";
const SCRIPT_PROP = PropertiesService.getScriptProperties();

/**
 * Entry point Web App
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('SI-DIKDAS | Dinas Pendidikan dan Kebudayaan Kab. Konawe Utara')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper untuk menyertakan file modular HTML (Stylesheet & JavaScript)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Mendapatkan Spreadsheet Database aktif
 */
function getDatabase() {
  const sheetId = SCRIPT_PROP.getProperty('DATABASE_SHEET_ID');
  if (sheetId) {
    try {
      const sh = SpreadsheetApp.openById(sheetId);
      if (sh) return sh;
    } catch (e) {
      console.warn("Gagal membuka sheet dari property, beralih ke active sheet:", e);
    }
  }
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    ss = SpreadsheetApp.create('DATABASE_SI_DIKDAS_KONAWE_UTARA');
    SCRIPT_PROP.setProperty('DATABASE_SHEET_ID', ss.getId());
  }
  return ss;
}

/**
 * Helper untuk memastikan sheet ada dengan headers tertentu
 */
function getOrCreateSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground('#0080E6')
        .setFontColor('#FFFFFF')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * ============================================================================
 * AUTO-SETUP ENVIRONMENT APLIKASI
 * Menyiapkan Google Drive, Sheets, Dummy Data, dan Akun Admin Tunggal
 * ============================================================================
 */
function setupAppEnvironment() {
  try {
    const ss = getDatabase();
    SCRIPT_PROP.setProperty('DATABASE_SHEET_ID', ss.getId());

    // 1. Buat / Ambil Folder Google Drive
    let rootFolder;
    const rootFolderId = SCRIPT_PROP.getProperty('ROOT_FOLDER_ID');
    if (rootFolderId) {
      try {
        rootFolder = DriveApp.getFolderById(rootFolderId);
      } catch (err) {
        rootFolder = null;
      }
    }
    if (!rootFolder) {
      const folders = DriveApp.getFoldersByName('DRIVE_SI_DIKDAS_KONUT');
      rootFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder('DRIVE_SI_DIKDAS_KONUT');
      rootFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      SCRIPT_PROP.setProperty('ROOT_FOLDER_ID', rootFolder.getId());
    }

    // Sub-folders
    const subFolderNames = ['01_Branding_Logos', '02_Kurikulum_BOSP_PIP', '03_Sarpras_Dokumentasi'];
    subFolderNames.forEach(name => {
      const existing = rootFolder.getFoldersByName(name);
      if (!existing.hasNext()) {
        const sub = rootFolder.createFolder(name);
        sub.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }
    });

    // 2. Buat Sheet TB_Config
    const configHeaders = ['key', 'value', 'deskripsi', 'updated_at'];
    const configSheet = getOrCreateSheet(ss, 'TB_Config', configHeaders);
    if (configSheet.getLastRow() <= 1) {
      const initialConfigs = [
        ['app_name', 'SI-DIKDAS: Sistem Informasi Layanan Pendidikan Dasar', 'Nama resmi aplikasi', new Date()],
        ['app_tagline', 'Membangun Masa Depan Pendidikan Dasar Konawe Utara yang Cerdas dan Adaptif', 'Tagline portal', new Date()],
        ['nama_dinas', 'Dinas Pendidikan dan Kebudayaan Kabupaten Konawe Utara', 'Nama instansi', new Date()],
        ['nama_bidang', 'Bidang Pembinaan Pendidikan Dasar (Dikdas)', 'Nama bidang pengelola', new Date()],
        ['alamat_kantor', 'Kompleks Perkantoran Pemerintah Daerah Kab. Konawe Utara, Wanggudu', 'Alamat kantor', new Date()],
        ['email_kontak', 'dikdas.dikbud@konaweutarakab.go.id', 'Email resmi', new Date()],
        ['hotline_wa', '0812-4567-8910', 'No WhatsApp Layanan', new Date()],
        ['nama_kadis', 'Dr. H. Asrap, M.Pd.', 'Nama Kepala Dinas', new Date()],
        ['nip_kadis', '19680512 199412 1 002', 'NIP Kepala Dinas', new Date()],
        ['nama_kabid_dikdas', 'H. Sahbin, S.Pd., M.Si.', 'Nama Kabid Dikdas', new Date()],
        ['nip_kabid_dikdas', '19740815 199803 1 005', 'NIP Kabid Dikdas', new Date()],
        ['logo_utama_url', 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg', 'URL Logo Utama / Tut Wuri Handayani', new Date()],
        ['logo_pemkab_url', 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Lambang_Kabupaten_Konawe_Utara.png', 'URL Logo Pemkab Konawe Utara', new Date()]
      ];
      configSheet.getRange(2, 1, initialConfigs.length, 4).setValues(initialConfigs);
    }

    // 3. Buat Sheet TB_Users (Admin Tunggal)
    const userHeaders = ['id_user', 'username', 'password_hash', 'nama_lengkap', 'role', 'status_aktif', 'last_login'];
    const userSheet = getOrCreateSheet(ss, 'TB_Users', userHeaders);
    if (userSheet.getLastRow() <= 1) {
      const defaultUsers = [
        ['USR-001', 'admin', hashPassword('dikdas123'), 'Administrator Dikdas Konawe Utara', 'ADMIN_UTAMA', 'AKTIF', new Date()]
      ];
      userSheet.getRange(2, 1, defaultUsers.length, 7).setValues(defaultUsers);
    }

    // 4. Buat Sheet TB_BOSP
    const bospHeaders = ['id_bosp', 'tahun_anggaran', 'tahap', 'npsn', 'nama_sekolah', 'jenjang', 'kecamatan', 'alokasi_dana', 'status_salur', 'tgl_cair', 'catatan_spj', 'url_dokumen_spj'];
    const bospSheet = getOrCreateSheet(ss, 'TB_BOSP', bospHeaders);
    if (bospSheet.getLastRow() <= 1) {
      const sampleBosp = [
        ['BOSP-2026-001', 2026, 'Tahap 1', '40402101', 'SD Negeri 1 Asera', 'SD', 'Asera', 185000000, 'Tersalurkan', '2026-02-15', 'SPJ Lengkap & Terverifikasi', ''],
        ['BOSP-2026-002', 2026, 'Tahap 1', '40402102', 'SD Negeri 2 Lasolo', 'SD', 'Lasolo', 142000000, 'Tersalurkan', '2026-02-18', 'SPJ Lengkap & Terverifikasi', ''],
        ['BOSP-2026-003', 2026, 'Tahap 1', '40402103', 'SMP Negeri 1 Wanggudu', 'SMP', 'Asera', 320000000, 'Tersalurkan', '2026-02-20', 'SPJ Dalam Verifikasi', ''],
        ['BOSP-2026-004', 2026, 'Tahap 1', '40402104', 'SD Negeri 1 Molawe', 'SD', 'Molawe', 115000000, 'Tersalurkan', '2026-02-22', 'Menunggu SPJ', ''],
        ['BOSP-2026-005', 2026, 'Tahap 1', '40402105', 'SMP Negeri 1 Wiwirano', 'SMP', 'Wiwirano', 245000000, 'Proses Transfer', '', 'Belum Ada SPJ', ''],
        ['BOSP-2026-006', 2026, 'Tahap 1', '40402106', 'SD Negeri 3 Lembo', 'SD', 'Lembo', 98000000, 'Tersalurkan', '2026-02-25', 'SPJ Lengkap & Terverifikasi', ''],
        ['BOSP-2026-007', 2026, 'Tahap 1', '40402107', 'SMP Negeri 1 Sawa', 'SMP', 'Sawa', 210000000, 'Tersalurkan', '2026-02-26', 'SPJ Dalam Verifikasi', '']
      ];
      bospSheet.getRange(2, 1, sampleBosp.length, 12).setValues(sampleBosp);
    }

    // 5. Buat Sheet TB_PIP
    const pipHeaders = ['id_pip', 'tahun', 'nisn', 'nama_siswa', 'nama_sekolah', 'jenjang', 'kelas', 'kecamatan', 'nominal_bantuan', 'status_pencairan', 'nama_bank_penyalur', 'keterangan'];
    const pipSheet = getOrCreateSheet(ss, 'TB_PIP', pipHeaders);
    if (pipSheet.getLastRow() <= 1) {
      const samplePip = [
        ['PIP-2026-001', 2026, '0084729183', 'Aura Kasih Pratiwi', 'SD Negeri 1 Asera', 'SD', 'Kelas V', 'Asera', 450000, 'Sudah Cair', 'Bank BRI Unit Wanggudu', 'Dana telah masuk rekening SimPel'],
        ['PIP-2026-002', 2026, '0091238472', 'Muhammad Fikri Al-Ghazali', 'SMP Negeri 1 Wanggudu', 'SMP', 'Kelas VIII', 'Asera', 750000, 'Sudah Cair', 'Bank BRI Unit Wanggudu', 'Telah ditarik siswa didampingi orang tua'],
        ['PIP-2026-003', 2026, '0078392014', 'Siti Rahmawati', 'SD Negeri 2 Lasolo', 'SD', 'Kelas IV', 'Lasolo', 450000, 'Belum Aktivasi', 'Bank BRI Unit Lasolo', 'Buku tabungan belum diaktivasi di bank'],
        ['PIP-2026-004', 2026, '0103948572', 'Dimas Arya Pratama', 'SMP Negeri 1 Wiwirano', 'SMP', 'Kelas VII', 'Wiwirano', 750000, 'Sudah Cair', 'Bank BNI Cabang Konawe Utara', 'Sudah tersalurkan'],
        ['PIP-2026-005', 2026, '0082736451', 'Nur Halimah', 'SD Negeri 1 Molawe', 'SD', 'Kelas VI', 'Molawe', 450000, 'Siap Ambil', 'Bank BRI Unit Molawe', 'SK Pemberian sudah terbit, silakan ke bank']
      ];
      pipSheet.getRange(2, 1, samplePip.length, 12).setValues(samplePip);
    }

    // 6. Buat Sheet TB_Sarpras
    const sarprasHeaders = ['id_sarpras', 'tgl_pendataan', 'npsn', 'nama_sekolah', 'kecamatan', 'jenis_fasilitas', 'kondisi', 'jumlah_unit', 'kebutuhan_penanganan', 'estimasi_biaya', 'status_usulan', 'foto_sarpras_url', 'url_proposal'];
    const sarprasSheet = getOrCreateSheet(ss, 'TB_Sarpras', sarprasHeaders);
    if (sarprasSheet.getLastRow() <= 1) {
      const sampleSarpras = [
        ['SAR-2026-001', '2026-02-10', '40402102', 'SD Negeri 2 Lasolo', 'Lasolo', 'Ruang Kelas', 'Rusak Berat', 3, 'Rehabilitasi Total Rangka Atap & Plafon Roboh', 135000000, 'Rekomendasi DAK Fisik 2027', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=500', ''],
        ['SAR-2026-002', '2026-02-14', '40402105', 'SMP Negeri 1 Wiwirano', 'Wiwirano', 'Lab Komputer TIK', 'Rusak Sedang', 1, 'Perbaikan Instalasi Listrik & Pengadaan 15 Unit Chromebook', 85000000, 'Prioritas APBD Perubahan', 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=500', ''],
        ['SAR-2026-003', '2026-02-20', '40402101', 'SD Negeri 1 Asera', 'Asera', 'Toilet / Jamban Siswa', 'Rusak Berat', 4, 'Pembangunan Baru Sanitasi & Jamban Ramah Disabilitas', 60000000, 'Rekomendasi DAK Fisik 2027', '', ''],
        ['SAR-2026-004', '2026-02-22', '40402104', 'SD Negeri 1 Molawe', 'Molawe', 'Mebeler', 'Rusak Sedang', 40, 'Pengadaan Meja dan Kursi Belajar Siswa', 32000000, 'Perlu Survey Lapangan', '', ''],
        ['SAR-2026-005', '2026-02-25', '40402106', 'SD Negeri 3 Lembo', 'Lembo', 'Ruang Perpustakaan', 'Baik', 1, 'Pemeliharaan Rutin Cat dan Tata Buku', 12000000, 'Selesai Direhab', '', '']
      ];
      sarprasSheet.getRange(2, 1, sampleSarpras.length, 13).setValues(sampleSarpras);
    }

    // 7. Buat Sheet TB_Pengumuman
    const newsHeaders = ['id_post', 'tgl_publish', 'judul', 'kategori', 'ringkasan', 'isi_konten', 'file_lampiran_url', 'status_tampil'];
    const newsSheet = getOrCreateSheet(ss, 'TB_Pengumuman', newsHeaders);
    if (newsSheet.getLastRow() <= 1) {
      const sampleNews = [
        ['POST-01', '2026-02-28', 'Batas Akhir Pelaporan SPJ Dana BOSP Tahap 1 Tahun 2026', 'KURIKULUM', 'Dinas Pendidikan dan Kebudayaan mengimbau seluruh Kepala SD dan SMP se-Konawe Utara untuk menuntaskan verifikasi SPJ.', 'Seluruh berkas verifikasi diunggah melalui portal SI-DIKDAS paling lambat 31 Maret 2026.', '', 'PUBLISH'],
        ['POST-02', '2026-02-20', 'Petunjuk Teknis Pengusulan DAK Fisik Sarpras Bidang Dikdas 2027', 'SARPRAS', 'Format resmi pengajuan proposal rehabilitasi gedung dan bantuan peralatan TIK jenjang SD/SMP.', 'Sekolah wajib melampirkan foto faktual kerusakan 3 dimensi dan estimasi kebutuhan perbaikan.', '', 'PUBLISH'],
        ['POST-03', '2026-02-15', 'Jadwal Sosialisasi Petunjuk Teknis SPMB Jalur Zonasi dan Afirmasi', 'KURIKULUM', 'Sosialisasi penerimaan siswa baru bagi satuan pendidikan tingkat SD dan SMP di wilayah Konawe Utara.', 'Kegiatan akan dilaksanakan secara daring dan luring di Aula Dinas Dikbud Konawe Utara.', '', 'PUBLISH']
      ];
      newsSheet.getRange(2, 1, sampleNews.length, 8).setValues(sampleNews);
    }

    return {
      success: true,
      message: "Lingkungan SI-DIKDAS berhasil disiapkan! Spreadsheet ID: " + ss.getId() + " | Folder Drive: " + rootFolder.getName(),
      data: {
        spreadsheetId: ss.getId(),
        spreadsheetUrl: ss.getUrl(),
        folderId: rootFolder.getId()
      }
    };
  } catch (error) {
    console.error("Gagal setupAppEnvironment:", error);
    return { success: false, message: "Terjadi kesalahan saat setup: " + error.toString() };
  }
}

/**
 * Hash Password Sederhana & Aman (SHA-256)
 */
function hashPassword(password) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  let txtHash = '';
  for (let i = 0; i < rawHash.length; i++) {
    let byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    let byteHex = byteVal.toString(16);
    if (byteHex.length == 1) byteHex = '0' + byteHex;
    txtHash += byteHex;
  }
  return txtHash;
}

/**
 * ============================================================================
 * MODUL PENGATURAN & BRANDING DINAMIS (GANTI LOGO)
 * ============================================================================
 */
function getAppConfig() {
  try {
    const ss = getDatabase();
    const sheet = ss.getSheetByName('TB_Config');
    if (!sheet) return { success: false, message: "Sheet TB_Config belum dibuat. Silakan jalankan auto-setup." };

    const data = sheet.getDataRange().getValues();
    const config = {};
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        config[data[i][0]] = data[i][1];
      }
    }
    return { success: true, data: config };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function updateAppConfig(configObject) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getDatabase();
    const sheet = ss.getSheetByName('TB_Config');
    const data = sheet.getDataRange().getValues();
    const now = new Date();

    for (const key in configObject) {
      let found = false;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          sheet.getRange(i + 1, 2).setValue(configObject[key]);
          sheet.getRange(i + 1, 4).setValue(now);
          found = true;
          break;
        }
      }
      if (!found) {
        sheet.appendRow([key, configObject[key], 'Konfigurasi Tambahan', now]);
      }
    }

    return { success: true, message: "Pengaturan dan Logo berhasil disimpan & diperbarui secara langsung!" };
  } catch (err) {
    return { success: false, message: "Gagal menyimpan konfigurasi: " + err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Upload file ke Google Drive (untuk ganti logo / upload foto sarpras / SPJ)
 */
function uploadFileToDrive(base64Data, fileName, mimeType, folderCategory) {
  try {
    const rootFolderId = SCRIPT_PROP.getProperty('ROOT_FOLDER_ID');
    let targetFolder;

    if (rootFolderId) {
      const rootFolder = DriveApp.getFolderById(rootFolderId);
      const subName = folderCategory === 'logo' ? '01_Branding_Logos' :
                      folderCategory === 'sarpras' ? '03_Sarpras_Dokumentasi' : '02_Kurikulum_BOSP_PIP';
      const subs = rootFolder.getFoldersByName(subName);
      targetFolder = subs.hasNext() ? subs.next() : rootFolder;
    } else {
      targetFolder = DriveApp.getRootFolder();
    }

    const decoded = Utilities.base64Decode(base64Data.split(',')[1] || base64Data);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    const file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Ambil direct preview URL
    const fileUrl = file.getDownloadUrl() || file.getUrl();

    return {
      success: true,
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      directUrl: "https://lh3.googleusercontent.com/d/" + file.getId()
    };
  } catch (err) {
    return { success: false, message: "Gagal upload file: " + err.toString() };
  }
}

/**
 * ============================================================================
 * MODUL AUTENTIKASI SINGLE ADMIN
 * ============================================================================
 */
function loginAdmin(username, password) {
  try {
    const ss = getDatabase();
    const sheet = ss.getSheetByName('TB_Users');
    if (!sheet) return { success: false, message: "Sistem belum diinisialisasi." };

    const data = sheet.getDataRange().getValues();
    const inputHash = hashPassword(password.trim());

    for (let i = 1; i < data.length; i++) {
      const dbUsername = String(data[i][1]).trim();
      const dbHash = String(data[i][2]).trim();
      const dbStatus = String(data[i][5]).trim();

      if (dbUsername.toLowerCase() === username.trim().toLowerCase()) {
        if (dbStatus !== 'AKTIF') {
          return { success: false, message: "Akun ini sedang dinonaktifkan." };
        }
        if (dbHash === inputHash) {
          // Buat Session Token Sederhana
          const token = Utilities.getUuid();
          sheet.getRange(i + 1, 7).setValue(new Date());

          return {
            success: true,
            message: "Login berhasil! Selamat datang di Portal Admin SI-DIKDAS.",
            data: {
              token: token,
              nama: data[i][3],
              role: data[i][4],
              username: dbUsername
            }
          };
        } else {
          return { success: false, message: "Kata sandi yang Anda masukkan salah." };
        }
      }
    }
    return { success: false, message: "Username admin tidak ditemukan." };
  } catch (err) {
    return { success: false, message: "Kesalahan login: " + err.toString() };
  }
}

/**
 * ============================================================================
 * MODUL CEK PIP PUBLIK (VIA NISN)
 * ============================================================================
 */
function checkPipStatusPublic(nisn, tahun) {
  try {
    const ss = getDatabase();
    const sheet = ss.getSheetByName('TB_PIP');
    if (!sheet) return { success: false, message: "Data PIP belum tersedia." };

    const data = sheet.getDataRange().getValues();
    const cleanNisn = String(nisn).trim();
    const targetTahun = tahun ? String(tahun).trim() : '';

    for (let i = 1; i < data.length; i++) {
      const rowNisn = String(data[i][2]).trim();
      const rowTahun = String(data[i][1]).trim();

      if (rowNisn === cleanNisn && (!targetTahun || rowTahun === targetTahun)) {
        return {
          success: true,
          data: {
            id: data[i][0],
            tahun: data[i][1],
            nisn: data[i][2],
            nama_siswa: data[i][3],
            nama_sekolah: data[i][4],
            jenjang: data[i][5],
            kelas: data[i][6],
            kecamatan: data[i][7],
            nominal: Number(data[i][8]),
            status: data[i][9],
            bank: data[i][10],
            keterangan: data[i][11]
          }
        };
      }
    }
    return { success: false, message: "Data siswa dengan NISN " + cleanNisn + " tidak ditemukan pada tahun anggaran yang dipilih." };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * ============================================================================
 * MODUL USULAN KERUSAKAN SARPRAS MANDIRI PUBLIK
 * ============================================================================
 */
function submitPublicSarprasReport(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getDatabase();
    const sheet = ss.getSheetByName('TB_Sarpras');
    if (!sheet) return { success: false, message: "Tabel Sarpras belum tersedia." };

    const newId = 'SAR-' + new Date().getFullYear() + '-' + Utilities.formatDate(new Date(), "GMT+7", "MMddHHmmss");
    const today = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");

    sheet.appendRow([
      newId,
      today,
      payload.npsn || '',
      payload.nama_sekolah || '',
      payload.kecamatan || '',
      payload.jenis_fasilitas || '',
      payload.kondisi || 'Rusak Sedang',
      payload.jumlah_unit || 1,
      payload.kebutuhan_penanganan || '',
      Number(payload.estimasi_biaya) || 0,
      'Menunggu Verifikasi',
      payload.foto_sarpras_url || '',
      payload.kontak_pengusul || ''
    ]);

    return {
      success: true,
      message: "Usulan kerusakan sekolah berhasil dikirim! ID Laporan: " + newId + ". Tim Sarpras Dikdas akan segera memverifikasi."
    };
  } catch (err) {
    return { success: false, message: "Gagal mengirim usulan: " + err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ============================================================================
 * MODUL DASHBOARD ANALYTICS & STATISTIK (CHART.JS DATA)
 * ============================================================================
 */
function getDashboardAnalytics() {
  try {
    const ss = getDatabase();
    const bospSheet = ss.getSheetByName('TB_BOSP');
    const pipSheet = ss.getSheetByName('TB_PIP');
    const sarprasSheet = ss.getSheetByName('TB_Sarpras');

    // 1. Data BOSP
    let totalBospPagu = 0;
    let bospPerKecamatan = {};
    if (bospSheet && bospSheet.getLastRow() > 1) {
      const bospRows = bospSheet.getDataRange().getValues();
      for (let i = 1; i < bospRows.length; i++) {
        const kec = bospRows[i][6] || 'Lainnya';
        const nominal = Number(bospRows[i][7]) || 0;
        totalBospPagu += nominal;
        bospPerKecamatan[kec] = (bospPerKecamatan[kec] || 0) + nominal;
      }
    }

    // 2. Data PIP
    let totalPipSiswa = 0;
    let pipStatusCounts = { 'Sudah Cair': 0, 'Belum Aktivasi': 0, 'Siap Ambil': 0 };
    if (pipSheet && pipSheet.getLastRow() > 1) {
      const pipRows = pipSheet.getDataRange().getValues();
      totalPipSiswa = pipRows.length - 1;
      for (let i = 1; i < pipRows.length; i++) {
        const st = pipRows[i][9] || 'Belum Aktivasi';
        pipStatusCounts[st] = (pipStatusCounts[st] || 0) + 1;
      }
    }

    // 3. Data Sarpras
    let totalUsulanSarpras = 0;
    let sarprasCondition = { 'Baik': 0, 'Rusak Ringan': 0, 'Rusak Sedang': 0, 'Rusak Berat': 0 };
    let sarprasFasilitas = {};
    if (sarprasSheet && sarprasSheet.getLastRow() > 1) {
      const sarprasRows = sarprasSheet.getDataRange().getValues();
      totalUsulanSarpras = sarprasRows.length - 1;
      for (let i = 1; i < sarprasRows.length; i++) {
        const kondisi = sarprasRows[i][6] || 'Baik';
        const fas = sarprasRows[i][5] || 'Lainnya';
        sarprasCondition[kondisi] = (sarprasCondition[kondisi] || 0) + 1;
        sarprasFasilitas[fas] = (sarprasFasilitas[fas] || 0) + 1;
      }
    }

    return {
      success: true,
      data: {
        summary: {
          totalSekolah: 124, // Baseline satuan pendidikan Dikdas Konut
          totalBosp: totalBospPagu,
          totalPip: totalPipSiswa,
          totalSarpras: totalUsulanSarpras
        },
        charts: {
          bospKecamatan: bospPerKecamatan,
          pipStatus: pipStatusCounts,
          sarprasKondisi: sarprasCondition,
          sarprasFasilitas: sarprasFasilitas
        }
      }
    };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * ============================================================================
 * MODUL CRUD BOSP & PIP (ADMIN PANEL)
 * ============================================================================
 */
function getAllBospData() {
  try {
    const ss = getDatabase();
    const sheet = ss.getSheetByName('TB_BOSP');
    if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: [] };

    const data = sheet.getDataRange().getValues();
    const rows = [];
    for (let i = 1; i < data.length; i++) {
      rows.push({
        rowIndex: i + 1,
        id_bosp: data[i][0],
        tahun: data[i][1],
        tahap: data[i][2],
        npsn: data[i][3],
        nama_sekolah: data[i][4],
        jenjang: data[i][5],
        kecamatan: data[i][6],
        alokasi_dana: data[i][7],
        status_salur: data[i][8],
        tgl_cair: data[i][9],
        catatan_spj: data[i][10],
        url_dokumen_spj: data[i][11]
      });
    }
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function saveBospRecord(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getDatabase();
    const sheet = ss.getSheetByName('TB_BOSP');
    const id = payload.id_bosp || ('BOSP-' + payload.tahun + '-' + Utilities.formatDate(new Date(), "GMT+7", "HHmmss"));

    if (payload.rowIndex && payload.rowIndex > 1) {
      // Edit record
      sheet.getRange(payload.rowIndex, 2, 1, 11).setValues([[
        payload.tahun, payload.tahap, payload.npsn, payload.nama_sekolah, payload.jenjang,
        payload.kecamatan, Number(payload.alokasi_dana), payload.status_salur,
        payload.tgl_cair, payload.catatan_spj, payload.url_dokumen_spj || ''
      ]]);
    } else {
      // Tambah baru
      sheet.appendRow([
        id, payload.tahun, payload.tahap, payload.npsn, payload.nama_sekolah, payload.jenjang,
        payload.kecamatan, Number(payload.alokasi_dana), payload.status_salur,
        payload.tgl_cair, payload.catatan_spj, payload.url_dokumen_spj || ''
      ]);
    }
    return { success: true, message: "Data BOSP berhasil disimpan!" };
  } catch (err) {
    return { success: false, message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function deleteBospRecord(rowIndex) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getDatabase();
    const sheet = ss.getSheetByName('TB_BOSP');
    if (rowIndex > 1 && rowIndex <= sheet.getLastRow()) {
      sheet.deleteRow(rowIndex);
      return { success: true, message: "Data BOSP berhasil dihapus." };
    }
    return { success: false, message: "Baris tidak valid." };
  } catch (err) {
    return { success: false, message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ============================================================================
 * MODUL CRUD SARPRAS (ADMIN PANEL)
 * ============================================================================
 */
function getAllSarprasData() {
  try {
    const ss = getDatabase();
    const sheet = ss.getSheetByName('TB_Sarpras');
    if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: [] };

    const data = sheet.getDataRange().getValues();
    const rows = [];
    for (let i = 1; i < data.length; i++) {
      rows.push({
        rowIndex: i + 1,
        id_sarpras: data[i][0],
        tgl_pendataan: data[i][1],
        npsn: data[i][2],
        nama_sekolah: data[i][3],
        kecamatan: data[i][4],
        jenis_fasilitas: data[i][5],
        kondisi: data[i][6],
        jumlah_unit: data[i][7],
        kebutuhan_penanganan: data[i][8],
        estimasi_biaya: data[i][9],
        status_usulan: data[i][10],
        foto_sarpras_url: data[i][11],
        url_proposal: data[i][12]
      });
    }
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function updateSarprasStatus(rowIndex, newStatus) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getDatabase();
    const sheet = ss.getSheetByName('TB_Sarpras');
    if (rowIndex > 1 && rowIndex <= sheet.getLastRow()) {
      sheet.getRange(rowIndex, 11).setValue(newStatus);
      return { success: true, message: "Status usulan sarpras berhasil diubah menjadi: " + newStatus };
    }
    return { success: false, message: "Baris data sarpras tidak ditemukan." };
  } catch (err) {
    return { success: false, message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function saveSarprasRecord(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getDatabase();
    const sheet = ss.getSheetByName('TB_Sarpras');
    const id = payload.id_sarpras || ('SAR-' + new Date().getFullYear() + '-' + Utilities.formatDate(new Date(), "GMT+7", "MMddHHmm"));

    if (payload.rowIndex && payload.rowIndex > 1) {
      sheet.getRange(payload.rowIndex, 2, 1, 12).setValues([[
        payload.tgl_pendataan, payload.npsn, payload.nama_sekolah, payload.kecamatan,
        payload.jenis_fasilitas, payload.kondisi, Number(payload.jumlah_unit),
        payload.kebutuhan_penanganan, Number(payload.estimasi_biaya), payload.status_usulan,
        payload.foto_sarpras_url || '', payload.url_proposal || ''
      ]]);
    } else {
      sheet.appendRow([
        id, payload.tgl_pendataan, payload.npsn, payload.nama_sekolah, payload.kecamatan,
        payload.jenis_fasilitas, payload.kondisi, Number(payload.jumlah_unit),
        payload.kebutuhan_penanganan, Number(payload.estimasi_biaya), payload.status_usulan,
        payload.foto_sarpras_url || '', payload.url_proposal || ''
      ]);
    }
    return { success: true, message: "Data Sarpras berhasil disimpan!" };
  } catch (err) {
    return { success: false, message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}
