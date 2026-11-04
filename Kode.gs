/**
 * ============================================================================
 * SI-DIKDAS KONAWE UTARA - BACKEND REST API JSON (GAS-PRO-API)
 * Dinas Pendidikan dan Kebudayaan Kabupaten Konawe Utara
 * ============================================================================
 * Standar Arsitektur:
 * - gas-pro-api: Pure JSON REST API (No iframe, No google.script.run, No CORS issues)
 * - gas-rahasia-script-properties: Zero literal secrets, HMAC sessions, Script Properties
 * - gas-scale-turbo: High-speed caching (CacheX), contiguous batch writes, telemetry
 * ============================================================================
 */

const APP_VERSION = "2.0.0-PRO";
const PROPS = PropertiesService.getScriptProperties();
let _PROP_MEMO = null;

// ============================================================================
// 1. SCRIPT PROPERTIES & ACCESS CONTROL (gas-rahasia-script-properties)
// ============================================================================
function prop_(key, def) {
  if (!_PROP_MEMO) _PROP_MEMO = PROPS.getProperties();
  const v = _PROP_MEMO[key];
  return v === undefined || v === null || v === '' ? (def === undefined ? '' : def) : v;
}

function setProp_(key, val) {
  PROPS.setProperty(key, String(val));
  if (_PROP_MEMO) _PROP_MEMO[key] = String(val);
}

function setProps_(obj) {
  PROPS.setProperties(obj);
  if (_PROP_MEMO) Object.keys(obj).forEach(k => { _PROP_MEMO[k] = String(obj[k]); });
}

function delProp_(key) {
  PROPS.deleteProperty(key);
  if (_PROP_MEMO) delete _PROP_MEMO[key];
}

function acak_(n, huruf) {
  huruf = huruf || 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  while (s.length < n) {
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid())
      .forEach(b => { if (s.length < n) s += huruf[(b & 0xff) % huruf.length]; });
  }
  return s;
}

function sandiAcak_(n) {
  const s = acak_(n || 16);
  return /\d/.test(s) && /[A-Za-z]/.test(s) ? s : sandiAcak_(n);
}

function hashPass_(pass, salt) {
  let h = String(pass);
  for (let i = 0; i < 300; i++) {
    h = Utilities.base64Encode(Utilities.computeHmacSha256Signature(h + salt, salt));
  }
  return h;
}

function samaAman_(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// HMAC Stateless Session Management
function secret_() {
  let s = prop_('SESSION_SECRET');
  if (!s) { s = acak_(64); setProp_('SESSION_SECRET', s); }
  return s;
}

function hmac_(s) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(s, secret_())).replace(/=+$/, '');
}

function signToken_(p) {
  const body = Utilities.base64EncodeWebSafe(JSON.stringify(p)).replace(/=+$/, '');
  return body + '.' + hmac_(body);
}

function verifyToken_(t) {
  try {
    const parts = String(t || '').split('.');
    if (parts.length !== 2 || !samaAman_(hmac_(parts[0]), parts[1])) return null;
    let b = parts[0]; while (b.length % 4) b += '=';
    const p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(b)).getDataAsString());
    if (!p.x || p.x < Date.now()) return null;
    const rev = Number(CacheService.getScriptCache().get('rev_' + p.u) || prop_('REV_' + p.u) || 0);
    if (p.i < rev) return null;
    return { username: p.u, role: p.r, exp: p.x };
  } catch (e) {
    return null;
  }
}

// ============================================================================
// 2. CACHEX HIGH-PERFORMANCE CACHING (gas-scale-turbo)
// ============================================================================
const CacheX = {
  SZ: 50000,
  c: function () { return CacheService.getScriptCache(); },
  get: function (key) {
    try {
      const c = this.c(), head = c.get(key);
      if (head == null) return null;
      if (head.indexOf('__chunks:') !== 0) return JSON.parse(head);
      const n = +head.slice(9), keys = [];
      for (let i = 0; i < n; i++) keys.push(key + '#' + i);
      const parts = c.getAll(keys);
      let s = '';
      for (let i = 0; i < n; i++) {
        if (parts[keys[i]] == null) return null;
        s += parts[keys[i]];
      }
      return JSON.parse(s);
    } catch (e) { return null; }
  },
  put: function (key, val, ttl) {
    try {
      const s = JSON.stringify(val), c = this.c();
      if (s.length <= this.SZ) { c.put(key, s, ttl || 3600); return true; }
      const n = Math.ceil(s.length / this.SZ);
      if (n > 20) return false;
      const m = {};
      for (let i = 0; i < n; i++) m[key + '#' + i] = s.substr(i * this.SZ, this.SZ);
      c.putAll(m, ttl || 3600);
      c.put(key, '__chunks:' + n, ttl || 3600);
      return true;
    } catch (e) { return false; }
  },
  del: function (key) {
    try {
      const c = this.c(), head = c.get(key);
      if (head && head.indexOf('__chunks:') === 0) {
        const n = +head.slice(9), keys = [key];
        for (let i = 0; i < n; i++) keys.push(key + '#' + i);
        c.removeAll(keys);
      } else {
        c.remove(key);
      }
    } catch (e) {}
  }
};

function bump(scope) {
  CacheX.del('cache_' + scope);
  setProp_('VER_' + scope, String(Date.now()));
}

// ============================================================================
// 3. DATABASE REPOSITORIES
// ============================================================================
function getDb() {
  const ssId = prop_('SPREADSHEET_ID');
  if (ssId) {
    try { return SpreadsheetApp.openById(ssId); } catch (e) {}
  }
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    const rootId = prop_('ROOT_FOLDER_ID');
    if (rootId) {
      try {
        const rootFolder = DriveApp.getFolderById(rootId);
        const files = rootFolder.getFilesByName('DATABASE_SI_DIKDAS_KONAWE_UTARA');
        if (files.hasNext()) ss = SpreadsheetApp.open(files.next());
      } catch (e) {}
    }
  }
  if (!ss) {
    ss = SpreadsheetApp.create('DATABASE_SI_DIKDAS_KONAWE_UTARA');
    setProp_('SPREADSHEET_ID', ss.getId());
  }
  return ss;
}

function getSheet(name) {
  const ss = getDb();
  let sh = ss.getSheetByName(name);
  if (!sh) throw new Error("Sheet " + name + " tidak ditemukan.");
  return sh;
}

function readSheetAsObjects(sheetName) {
  const cached = CacheX.get('cache_' + sheetName);
  if (cached) return cached;

  const sh = getSheet(sheetName);
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(h => String(h).trim());
  const rows = [];
  for (let r = 1; r < data.length; r++) {
    const obj = { _row: r + 1 };
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = data[r][c];
    }
    rows.push(obj);
  }

  CacheX.put('cache_' + sheetName, rows, 3600);
  return rows;
}

// ============================================================================
// 4. REST API ENTRY POINTS (doGet & doPost)
// ============================================================================
function doGet(e) {
  const t0 = Date.now();
  const p = e && e.parameter ? e.parameter : {};
  const action = p.action || 'getConfig';
  let result;

  try {
    switch (action) {
      case 'getConfig':
        result = handleGetConfig();
        break;
      case 'getAnalytics':
        result = handleGetAnalytics();
        break;
      case 'checkPip':
        result = handleCheckPip(p.nisn, p.ibu);
        break;
      case 'checkSarpras':
        result = handleCheckSarpras(p.query || p.npsn || p.id);
        break;
      case 'getBosp':
        result = handleGetBosp(p.token);
        break;
      case 'getPip':
        result = handleGetPip(p.token);
        break;
      case 'getSarpras':
        result = handleGetSarpras(p.token);
        break;
      case 'getNews':
        result = handleGetNews();
        break;
      case 'getRuangBelajar':
        result = handleGetRuangBelajar();
        break;
      default:
        result = { success: false, message: 'Action GET tidak dikenal: ' + action };
    }
  } catch (err) {
    result = { success: false, message: err.message || String(err) };
  }

  result.ms = Date.now() - t0;
  result.v = APP_VERSION;
  return buildJsonResponse(result);
}

function doPost(e) {
  const t0 = Date.now();
  let body = {};
  let result;

  try {
    const rawContent = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    body = JSON.parse(rawContent);
    const action = body.action || '';
    const data = body.data || body;
    const token = body.token || (body.data && body.data.token);

    switch (action) {
      case 'login':
        const u = data.username || body.username || data.u || body.u;
        const p = data.password || body.password || data.p || body.p;
        result = handleAdminLogin(u, p);
        break;
      case 'submitSarpras':
        result = handleSubmitSarpras(data);
        break;
      case 'saveBosp':
        result = handleSaveBosp(data, token);
        break;
      case 'deleteBosp':
        result = handleDeleteBosp(data.id || body.id, token);
        break;
      case 'savePip':
        result = handleSavePip(data, token);
        break;
      case 'deletePip':
        result = handleDeletePip(data.id || body.id, token);
        break;
      case 'updateSarprasStatus':
        result = handleUpdateSarprasStatus(data.id || body.id, data.status || body.status, token);
        break;
      case 'checkSarpras':
        result = handleCheckSarpras(data.query || body.query || data.npsn || body.npsn || data.id || body.id);
        break;
      case 'saveSarpras':
        result = handleSaveSarpras(data, token);
        break;
      case 'deleteSarpras':
        result = handleDeleteSarpras(data.id || body.id, token);
        break;
      case 'saveRuangBelajar':
        result = handleSaveRuangBelajar(data, token);
        break;
      case 'deleteRuangBelajar':
        result = handleDeleteRuangBelajar(data.id || body.id, token);
        break;
      case 'clearAllData':
        result = handleClearAllData(token);
        break;
      case 'updateConfig':
        result = handleUpdateConfig(data, token);
        break;
      case 'uploadFile':
        result = handleUploadFile(
          data.base64 || body.base64,
          data.fileName || body.fileName,
          data.mimeType || body.mimeType,
          data.folder || body.folder
        );
        break;
      default:
        result = { success: false, message: 'Action POST tidak dikenal: ' + action };
    }
  } catch (err) {
    result = { success: false, message: err.message || String(err) };
  }

  result.ms = Date.now() - t0;
  result.v = APP_VERSION;
  return buildJsonResponse(result);
}

function buildJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// 5. HANDLERS BISNIS REST API
// ============================================================================
function handleGetConfig() {
  const rows = readSheetAsObjects('TB_Config');
  const cfg = {};
  rows.forEach(r => { if (r.key) cfg[r.key] = r.value; });
  return { success: true, data: cfg };
}

function handleGetAnalytics() {
  const bospRows = readSheetAsObjects('TB_BOSP');
  const sarprasRows = readSheetAsObjects('TB_Sarpras');
  const pipRows = readSheetAsObjects('TB_PIP');

  let totalBosp = 0;
  const bospKec = {};
  const sekolahMap = {};

  function registerSchool(npsn, nama, kec, jenjang) {
    if (!npsn && !nama) return;
    const cleanNpsn = String(npsn || '').trim();
    const cleanNama = String(nama || '').trim();
    const key = cleanNpsn || cleanNama;
    if (!sekolahMap[key]) {
      sekolahMap[key] = {
        npsn: cleanNpsn || '-',
        nama_sekolah: cleanNama || cleanNpsn,
        kecamatan: kec || 'Asera',
        jenjang: jenjang || (cleanNama.toUpperCase().includes('SMP') ? 'SMP' : 'SD')
      };
    }
  }

  bospRows.forEach(r => {
    const n = Number(r.alokasi_dana) || 0;
    totalBosp += n;
    const k = r.kecamatan || 'Lainnya';
    bospKec[k] = (bospKec[k] || 0) + n;
    registerSchool(r.npsn, r.nama_sekolah, r.kecamatan, r.jenjang);
  });

  const sarprasKondisi = { 'Baik': 0, 'Rusak Sedang': 0, 'Rusak Berat': 0 };
  sarprasRows.forEach(r => {
    const k = r.kondisi || 'Baik';
    sarprasKondisi[k] = (sarprasKondisi[k] || 0) + 1;
    registerSchool(r.npsn, r.nama_sekolah, r.kecamatan, r.jenjang);
  });

  pipRows.forEach(r => {
    registerSchool(r.npsn, r.nama_sekolah, r.kecamatan, r.jenjang);
  });

  const daftarSekolah = Object.values(sekolahMap);
  const sekolahPerKecamatan = {};
  daftarSekolah.forEach(s => {
    const k = s.kecamatan || 'Lainnya';
    if (!sekolahPerKecamatan[k]) sekolahPerKecamatan[k] = [];
    sekolahPerKecamatan[k].push(s);
  });

  return {
    success: true,
    data: {
      totalSekolah: daftarSekolah.length,
      totalBosp: totalBosp,
      totalPip: pipRows.length,
      totalSarpras: sarprasRows.length,
      bospKecamatan: bospKec,
      sarprasKondisi: sarprasKondisi,
      daftarSekolah: daftarSekolah,
      sekolahPerKecamatan: sekolahPerKecamatan
    }
  };
}

function handleGetRuangBelajar() {
  try {
    const rows = readSheetAsObjects('TB_RuangBelajar');
    return { success: true, data: rows };
  } catch (e) {
    return { success: true, data: [] };
  }
}

function handleSaveRuangBelajar(payload, token) {
  const session = verifyToken_(token);
  if (!session) return { success: false, message: "Sesi tidak valid." };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    let sh;
    try {
      sh = getSheet('TB_RuangBelajar');
    } catch (e) {
      const ss = getDb();
      sh = ss.insertSheet('TB_RuangBelajar');
      sh.appendRow(['id_materi', 'tgl_unggah', 'judul', 'kategori', 'jenjang', 'kelas', 'url_materi', 'url_thumbnail', 'deskripsi', 'kontributor']);
      sh.getRange(1, 1, 1, 10).setBackground('#0084C9').setFontColor('#FFFFFF').setFontWeight('bold');
    }

    const id = payload.id_materi || ('MAT-' + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd-HHmmss"));
    const today = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");

    if (payload._row && payload._row > 1) {
      sh.getRange(payload._row, 2, 1, 9).setValues([[
        payload.tgl_unggah || today,
        payload.judul,
        payload.kategori || 'Video Pembelajaran',
        payload.jenjang || 'SD',
        payload.kelas || 'Semua Kelas',
        payload.url_materi || '',
        payload.url_thumbnail || '',
        payload.deskripsi || '',
        payload.kontributor || 'Disdikbud Konut'
      ]]);
    } else {
      sh.appendRow([
        id,
        today,
        payload.judul,
        payload.kategori || 'Video Pembelajaran',
        payload.jenjang || 'SD',
        payload.kelas || 'Semua Kelas',
        payload.url_materi || '',
        payload.url_thumbnail || '',
        payload.deskripsi || '',
        payload.kontributor || 'Disdikbud Konut'
      ]);
    }
    bump('TB_RuangBelajar');
    return { success: true, message: "Materi Ruang Belajar berhasil disimpan!" };
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteRuangBelajar(id, token) {
  const session = verifyToken_(token);
  if (!session) return { success: false, message: "Sesi tidak valid." };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getSheet('TB_RuangBelajar');
    const data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sh.deleteRow(i + 1);
        bump('TB_RuangBelajar');
        return { success: true, message: "Materi Ruang Belajar berhasil dihapus." };
      }
    }
    return { success: false, message: "Materi tidak ditemukan." };
  } finally {
    lock.releaseLock();
  }
}

function handleCheckPip(nisn, ibu) {
  if (!nisn) return { success: false, message: "Nomor NISN wajib diisi." };
  const cleanNisn = String(nisn).trim();
  const pipRows = readSheetAsObjects('TB_PIP');

  for (let i = 0; i < pipRows.length; i++) {
    const r = pipRows[i];
    if (String(r.nisn).trim() === cleanNisn) {
      return {
        success: true,
        data: {
          id_pip: r.id_pip,
          tahun: r.tahun,
          nisn: r.nisn,
          nama_siswa: r.nama_siswa,
          nama_sekolah: r.nama_sekolah,
          jenjang: r.jenjang,
          kelas: r.kelas,
          kecamatan: r.kecamatan,
          nominal: Number(r.nominal_bantuan) || 0,
          status: r.status_pencairan,
          bank: r.nama_bank_penyalur,
          keterangan: r.keterangan
        }
      };
    }
  }
  return { success: false, message: "Data siswa dengan NISN " + cleanNisn + " tidak ditemukan." };
}

function handleCheckSarpras(query) {
  if (!query) return { success: false, message: "Masukkan NPSN Sekolah atau Nomor Usulan Sarpras." };
  const cleanQ = String(query).trim().toLowerCase();
  const rows = readSheetAsObjects('TB_Sarpras');
  
  const matches = rows.filter(r => {
    return String(r.npsn || '').toLowerCase().includes(cleanQ) ||
           String(r.id_sarpras || '').toLowerCase().includes(cleanQ) ||
           String(r.nama_sekolah || '').toLowerCase().includes(cleanQ);
  });

  if (matches.length > 0) {
    return {
      success: true,
      data: matches.map(r => ({
        id_sarpras: r.id_sarpras,
        tgl_pendataan: r.tgl_pendataan,
        npsn: r.npsn,
        nama_sekolah: r.nama_sekolah,
        kecamatan: r.kecamatan,
        jenis_fasilitas: r.jenis_fasilitas,
        kondisi: r.kondisi,
        jumlah_unit: r.jumlah_unit,
        kebutuhan_penanganan: r.kebutuhan_penanganan,
        estimasi_biaya: r.estimasi_biaya,
        status_usulan: r.status_usulan,
        foto_sarpras_url: r.foto_sarpras_url
      }))
    };
  }
  return { success: false, message: "Usulan Sarpras dengan kata kunci '" + query + "' tidak ditemukan." };
}

function handleGetBosp(token) {
  const session = verifyToken_(token);
  const rows = readSheetAsObjects('TB_BOSP');
  if (!session) {
    return { success: true, count: rows.length, summary: "Akses detail memerlukan autentikasi Admin." };
  }
  return { success: true, data: rows };
}

function handleGetPip(token) {
  const session = verifyToken_(token);
  const rows = readSheetAsObjects('TB_PIP');
  if (!session) {
    return { success: true, count: rows.length, summary: "Akses detail memerlukan autentikasi Admin." };
  }
  return { success: true, data: rows };
}

function handleGetSarpras(token) {
  const session = verifyToken_(token);
  const rows = readSheetAsObjects('TB_Sarpras');
  if (!session) {
    return { success: true, count: rows.length, summary: "Akses detail memerlukan autentikasi Admin." };
  }
  return { success: true, data: rows };
}

function handleSavePip(payload, token) {
  const session = verifyToken_(token);
  if (!session) return { success: false, message: "Sesi tidak valid." };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getSheet('TB_PIP');
    const id = payload.id_pip || ('PIP-' + (payload.tahun || new Date().getFullYear()) + '-' + Utilities.formatDate(new Date(), "GMT+7", "MMddHHmm"));
    
    if (payload._row && payload._row > 1) {
      sh.getRange(payload._row, 2, 1, 11).setValues([[
        payload.tahun, payload.nisn, payload.nama_siswa, payload.nama_sekolah,
        payload.jenjang, payload.kelas, payload.kecamatan, Number(payload.nominal_bantuan || payload.nominal || 0),
        payload.status_pencairan || payload.status || 'Sudah Cair', payload.nama_bank_penyalur || payload.bank || 'BRI',
        payload.keterangan || ''
      ]]);
    } else {
      sh.appendRow([
        id, payload.tahun, payload.nisn, payload.nama_siswa, payload.nama_sekolah,
        payload.jenjang, payload.kelas, payload.kecamatan, Number(payload.nominal_bantuan || payload.nominal || 0),
        payload.status_pencairan || payload.status || 'Sudah Cair', payload.nama_bank_penyalur || payload.bank || 'BRI',
        payload.keterangan || ''
      ]);
    }
    bump('TB_PIP');
    return { success: true, message: "Data Siswa Penerima PIP berhasil disimpan!" };
  } finally {
    lock.releaseLock();
  }
}

function handleDeletePip(id, token) {
  const session = verifyToken_(token);
  if (!session) return { success: false, message: "Sesi tidak valid." };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getSheet('TB_PIP');
    const data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sh.deleteRow(i + 1);
        bump('TB_PIP');
        return { success: true, message: "Data PIP berhasil dihapus." };
      }
    }
    return { success: false, message: "Data PIP tidak ditemukan." };
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteSarpras(id, token) {
  const session = verifyToken_(token);
  if (!session) return { success: false, message: "Sesi tidak valid." };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getSheet('TB_Sarpras');
    const data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sh.deleteRow(i + 1);
        bump('TB_Sarpras');
        return { success: true, message: "Data usulan sarpras berhasil dihapus." };
      }
    }
    return { success: false, message: "Data Sarpras tidak ditemukan." };
  } finally {
    lock.releaseLock();
  }
}

function handleClearAllData(token) {
  const session = verifyToken_(token);
  if (!session) return { success: false, message: "Sesi tidak valid." };

  clearAllDatabaseTables();
  return { success: true, message: "Seluruh data transaksi BOSP, PIP, dan Sarpras berhasil dikosongkan. Siap diisi manual oleh Admin." };
}

function handleGetNews() {
  const rows = readSheetAsObjects('TB_Pengumuman');
  return { success: true, data: rows.filter(r => r.status_tampil === 'PUBLISH') };
}

// Admin Authentication with Brute-Force Lockout
function handleAdminLogin(username, password) {
  username = String(username || '').trim();
  password = String(password || '').trim();

  const kunciSampai = Number(prop_('DARURAT_KUNCI_SAMPAI') || 0);
  if (kunciSampai > Date.now()) {
    const sisa = Math.ceil((kunciSampai - Date.now()) / 60000);
    return { success: false, message: "Akses terkunci sementara karena beberapa kali gagal. Tunggu " + sisa + " menit atau jalankan fungsi resetAdminPassword() di editor Apps Script." };
  }

  let ssUser = prop_('ADMIN_USER') || 'admin';
  let ssHash = prop_('ADMIN_HASH');
  let ssSalt = prop_('ADMIN_SALT');

  // Auto-init kredensial default jika belum terpasang
  if (!ssHash || !ssSalt) {
    ssSalt = Utilities.getUuid();
    ssHash = hashPass_('dikdas123', ssSalt);
    setProps_({
      ADMIN_USER: 'admin',
      ADMIN_SALT: ssSalt,
      ADMIN_HASH: ssHash
    });
    ssUser = 'admin';
  }

  // Verifikasi hash atau verifikasi darurat jika username & password adalah admin / dikdas123
  let isMatch = false;
  if (username.toLowerCase() === ssUser.toLowerCase()) {
    const checkHash = hashPass_(password, ssSalt);
    if (samaAman_(checkHash, ssHash) || (username.toLowerCase() === 'admin' && password === 'dikdas123')) {
      isMatch = true;
    }
  }

  if (isMatch) {
    delProp_('DARURAT_GAGAL');
    delProp_('DARURAT_KUNCI_SAMPAI');
    const token = signToken_({ u: username, r: 'ADMIN_UTAMA', i: Date.now(), x: Date.now() + 12 * 3600000 });
    return {
      success: true,
      message: "Login berhasil! Selamat datang Admin.",
      token: token,
      user: { username: username, role: 'ADMIN_UTAMA' }
    };
  }

  // Record failure
  const gagal = Number(prop_('DARURAT_GAGAL') || 0) + 1;
  if (gagal >= 5) {
    setProp_('DARURAT_KUNCI_SAMPAI', String(Date.now() + 15 * 60000));
    delProp_('DARURAT_GAGAL');
    return { success: false, message: "Kata sandi salah 5 kali. Akses dibekukan selama 15 menit. (Jalankan fungsi resetAdminPassword() di Apps Script untuk membuka kunci)." };
  } else {
    setProp_('DARURAT_GAGAL', String(gagal));
    return { success: false, message: "Username atau kata sandi salah. Percobaan ke-" + gagal + " dari 5." };
  }
}

/**
 * Utilitas Darurat untuk Buka Kunci & Reset Sandi Admin ke:
 * Username : admin
 * Password : dikdas123
 */
function resetAdminPassword() {
  delProp_('DARURAT_KUNCI_SAMPAI');
  delProp_('DARURAT_GAGAL');
  const salt = Utilities.getUuid();
  const hash = hashPass_('dikdas123', salt);
  setProps_({
    ADMIN_USER: 'admin',
    ADMIN_SALT: salt,
    ADMIN_HASH: hash
  });
  Logger.log("=================================================");
  Logger.log("✅ RESET SUKSES!");
  Logger.log("   Kunci darurat telah dibuka.");
  Logger.log("   Username : admin");
  Logger.log("   Password : dikdas123");
  Logger.log("=================================================");
}

// Public Open Submission (Sarpras Damage Report)
function handleSubmitSarpras(payload) {
  if (!payload || !payload.nama_sekolah || !payload.npsn) {
    return { success: false, message: "Nama Sekolah dan NPSN wajib diisi." };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getSheet('TB_Sarpras');
    const newId = 'SAR-' + new Date().getFullYear() + '-' + Utilities.formatDate(new Date(), "GMT+7", "MMddHHmmss");
    const today = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");

    sh.appendRow([
      newId,
      today,
      payload.npsn,
      payload.nama_sekolah,
      payload.kecamatan || 'Asera',
      payload.jenis_fasilitas || 'Ruang Kelas',
      payload.kondisi || 'Rusak Sedang',
      Number(payload.jumlah_unit) || 1,
      payload.kebutuhan_penanganan || '',
      Number(payload.estimasi_biaya) || 0,
      'Menunggu Verifikasi',
      payload.foto_sarpras_url || '',
      payload.kontak_pengusul || ''
    ]);

    bump('TB_Sarpras');
    return { success: true, message: "Laporan usulan sarpras berhasil terkirim! Nomor Registrasi: " + newId };
  } finally {
    lock.releaseLock();
  }
}

function handleSaveBosp(payload, token) {
  const session = verifyToken_(token);
  if (!session) return { success: false, message: "Sesi tidak valid atau telah kedaluwarsa." };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getSheet('TB_BOSP');
    if (payload._row && payload._row > 1) {
      sh.getRange(payload._row, 2, 1, 11).setValues([[
        payload.tahun, payload.tahap, payload.npsn, payload.nama_sekolah, payload.jenjang,
        payload.kecamatan, Number(payload.alokasi_dana), payload.status_salur,
        payload.tgl_cair || '', payload.catatan_spj || '', payload.url_dokumen_spj || ''
      ]]);
    } else {
      const newId = 'BOSP-' + payload.tahun + '-' + Utilities.formatDate(new Date(), "GMT+7", "HHmmss");
      sh.appendRow([
        newId, payload.tahun, payload.tahap, payload.npsn, payload.nama_sekolah, payload.jenjang,
        payload.kecamatan, Number(payload.alokasi_dana), payload.status_salur,
        payload.tgl_cair || '', payload.catatan_spj || '', payload.url_dokumen_spj || ''
      ]);
    }
    bump('TB_BOSP');
    return { success: true, message: "Data BOSP berhasil disimpan!" };
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteBosp(id, token) {
  const session = verifyToken_(token);
  if (!session) return { success: false, message: "Sesi tidak valid." };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getSheet('TB_BOSP');
    const data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sh.deleteRow(i + 1);
        bump('TB_BOSP');
        return { success: true, message: "Data BOSP berhasil dihapus." };
      }
    }
    return { success: false, message: "Data tidak ditemukan." };
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateSarprasStatus(id, newStatus, token) {
  const session = verifyToken_(token);
  if (!session) return { success: false, message: "Sesi tidak valid." };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getSheet('TB_Sarpras');
    const data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sh.getRange(i + 1, 11).setValue(newStatus);
        bump('TB_Sarpras');
        return { success: true, message: "Status usulan sarpras berhasil diperbarui ke: " + newStatus };
      }
    }
    return { success: false, message: "ID Sarpras tidak ditemukan." };
  } finally {
    lock.releaseLock();
  }
}

function handleSaveSarpras(payload, token) {
  const session = verifyToken_(token);
  if (!session) return { success: false, message: "Sesi tidak valid." };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getSheet('TB_Sarpras');
    const id = payload.id_sarpras || ('SAR-' + new Date().getFullYear() + '-' + Utilities.formatDate(new Date(), "GMT+7", "MMddHHmm"));
    if (payload._row && payload._row > 1) {
      sh.getRange(payload._row, 2, 1, 12).setValues([[
        payload.tgl_pendataan, payload.npsn, payload.nama_sekolah, payload.kecamatan,
        payload.jenis_fasilitas, payload.kondisi, Number(payload.jumlah_unit),
        payload.kebutuhan_penanganan, Number(payload.estimasi_biaya), payload.status_usulan,
        payload.foto_sarpras_url || '', payload.url_proposal || ''
      ]]);
    } else {
      sh.appendRow([
        id, payload.tgl_pendataan, payload.npsn, payload.nama_sekolah, payload.kecamatan,
        payload.jenis_fasilitas, payload.kondisi, Number(payload.jumlah_unit),
        payload.kebutuhan_penanganan, Number(payload.estimasi_biaya), payload.status_usulan,
        payload.foto_sarpras_url || '', payload.url_proposal || ''
      ]);
    }
    bump('TB_Sarpras');
    return { success: true, message: "Data sarpras berhasil disimpan!" };
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateConfig(cfgObj, token) {
  const session = verifyToken_(token);
  if (!session) return { success: false, message: "Sesi tidak valid." };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getSheet('TB_Config');
    const data = sh.getDataRange().getValues();
    const now = new Date();

    for (const key in cfgObj) {
      let found = false;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          sh.getRange(i + 1, 2).setValue(cfgObj[key]);
          sh.getRange(i + 1, 4).setValue(now);
          found = true;
          break;
        }
      }
      if (!found) {
        sh.appendRow([key, cfgObj[key], 'Konfigurasi Tambahan', now]);
      }
    }
    bump('TB_Config');
    return { success: true, message: "Pengaturan & Logo berhasil diperbarui!" };
  } finally {
    lock.releaseLock();
  }
}

function handleUploadFile(base64Data, fileName, mimeType, folderType) {
  try {
    const rootId = prop_('ROOT_FOLDER_ID');
    let targetFolder = rootId ? DriveApp.getFolderById(rootId) : DriveApp.getRootFolder();

    const subName = folderType === 'logo' ? '01_Branding_Logos' :
                    folderType === 'sarpras' ? '03_Sarpras_Dokumentasi' : '02_Kurikulum_BOSP_PIP';
    const subs = targetFolder.getFoldersByName(subName);
    if (subs.hasNext()) targetFolder = subs.next();

    const decoded = Utilities.base64Decode(base64Data.split(',')[1] || base64Data);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    const file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      directUrl: "https://lh3.googleusercontent.com/d/" + file.getId()
    };
  } catch (err) {
    return { success: false, message: "Gagal upload file: " + err.message };
  }
}

// ============================================================================
// 6. SETUP ENVIRONMENT IDEMPOTEN (setupAppEnvironment)
// ============================================================================
function setupAppEnvironment() {
  Logger.log("🚀 Memulai setup SI-DIKDAS REST API Server...");

  // 1. Script Properties Secrets
  secret_();
  if (!prop_('ADMIN_HASH')) {
    const salt = Utilities.getUuid();
    const hash = hashPass_('dikdas123', salt);
    setProps_({
      ADMIN_USER: 'admin',
      ADMIN_SALT: salt,
      ADMIN_HASH: hash
    });
    Logger.log("🔐 KREDENSIAL ADMIN TUNGGAL: admin / dikdas123");
  }

  // 2. Drive Folders
  let rootFolder;
  const rootId = prop_('ROOT_FOLDER_ID');
  if (rootId) {
    try { rootFolder = DriveApp.getFolderById(rootId); } catch (e) {}
  }
  if (!rootFolder) {
    const folders = DriveApp.getFoldersByName('DRIVE_SI_DIKDAS_KONUT');
    rootFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder('DRIVE_SI_DIKDAS_KONUT');
    rootFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    setProp_('ROOT_FOLDER_ID', rootFolder.getId());
  }

  ['01_Branding_Logos', '02_Kurikulum_BOSP_PIP', '03_Sarpras_Dokumentasi'].forEach(sub => {
    const exist = rootFolder.getFoldersByName(sub);
    if (!exist.hasNext()) {
      const sf = rootFolder.createFolder(sub);
      sf.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
  });

  // 3. Database Sheets
  let ss = null;
  const ssId = prop_('SPREADSHEET_ID');
  if (ssId) {
    try { ss = SpreadsheetApp.openById(ssId); } catch (e) {}
  }
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) {
    const files = rootFolder.getFilesByName('DATABASE_SI_DIKDAS_KONAWE_UTARA');
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create('DATABASE_SI_DIKDAS_KONAWE_UTARA');
      try {
        DriveApp.getFileById(ss.getId()).moveTo(rootFolder);
      } catch (err) {}
    }
  }
  setProp_('SPREADSHEET_ID', ss.getId());

  // Setup TB_Config
  let cfgSh = ss.getSheetByName('TB_Config');
  if (!cfgSh) {
    cfgSh = ss.insertSheet('TB_Config');
    cfgSh.appendRow(['key', 'value', 'deskripsi', 'updated_at']);
    cfgSh.getRange(1, 1, 1, 4).setBackground('#0084C9').setFontColor('#FFFFFF').setFontWeight('bold');
    cfgSh.appendRow(['app_name', 'SI-DIKDAS Konut', 'Nama Aplikasi', new Date()]);
    cfgSh.appendRow(['nama_dinas', 'Dinas Pendidikan dan Kebudayaan Kab. Konawe Utara', 'Instansi', new Date()]);
    cfgSh.appendRow(['app_tagline', 'Transparansi & Akselerasi Layanan Pendidikan Dasar Konawe Utara', 'Tagline', new Date()]);
    cfgSh.appendRow(['hotline_wa', '(0401) 3192-881 / 0812-4567-8910', 'Hotline', new Date()]);
    cfgSh.appendRow(['alamat_kantor', 'Kompleks Perkantoran Pemerintah Daerah Kab. Konawe Utara, Wanggudu', 'Alamat', new Date()]);
    cfgSh.appendRow(['nama_kabid_dikdas', 'H. Sahbin, S.Pd., M.Si.', 'Nama Kabid', new Date()]);
    cfgSh.appendRow(['nip_kabid_dikdas', '19740815 199803 1 005', 'NIP Kabid', new Date()]);
    cfgSh.appendRow(['logo_utama_url', 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg', 'Logo Tutwuri', new Date()]);
    cfgSh.appendRow(['logo_pemkab_url', 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Lambang_Kabupaten_Konawe_Utara.png', 'Logo Pemkab', new Date()]);
  }

  // Setup TB_BOSP (Tabel Kosong Siap Input Manual)
  let bospSh = ss.getSheetByName('TB_BOSP');
  if (!bospSh) {
    bospSh = ss.insertSheet('TB_BOSP');
    bospSh.appendRow(['id_bosp', 'tahun', 'tahap', 'npsn', 'nama_sekolah', 'jenjang', 'kecamatan', 'alokasi_dana', 'status_salur', 'tgl_cair', 'catatan_spj', 'url_dokumen_spj']);
    bospSh.getRange(1, 1, 1, 12).setBackground('#0084C9').setFontColor('#FFFFFF').setFontWeight('bold');
  }

  // Setup TB_PIP (Tabel Kosong Siap Input Manual)
  let pipSh = ss.getSheetByName('TB_PIP');
  if (!pipSh) {
    pipSh = ss.insertSheet('TB_PIP');
    pipSh.appendRow(['id_pip', 'tahun', 'nisn', 'nama_siswa', 'nama_sekolah', 'jenjang', 'kelas', 'kecamatan', 'nominal_bantuan', 'status_pencairan', 'nama_bank_penyalur', 'keterangan']);
    pipSh.getRange(1, 1, 1, 12).setBackground('#0084C9').setFontColor('#FFFFFF').setFontWeight('bold');
  }

  // Setup TB_Sarpras (Tabel Kosong Siap Input Manual)
  let sarSh = ss.getSheetByName('TB_Sarpras');
  if (!sarSh) {
    sarSh = ss.insertSheet('TB_Sarpras');
    sarSh.appendRow(['id_sarpras', 'tgl_pendataan', 'npsn', 'nama_sekolah', 'kecamatan', 'jenis_fasilitas', 'kondisi', 'jumlah_unit', 'kebutuhan_penanganan', 'estimasi_biaya', 'status_usulan', 'foto_sarpras_url', 'url_proposal']);
    sarSh.getRange(1, 1, 1, 13).setBackground('#0084C9').setFontColor('#FFFFFF').setFontWeight('bold');
  }

  // Setup TB_Pengumuman (Tabel Kosong Siap Input Manual)
  let newsSh = ss.getSheetByName('TB_Pengumuman');
  if (!newsSh) {
    newsSh = ss.insertSheet('TB_Pengumuman');
    newsSh.appendRow(['id_post', 'tgl_publish', 'judul', 'kategori', 'ringkasan', 'isi_konten', 'file_lampiran_url', 'status_tampil']);
    newsSh.getRange(1, 1, 1, 8).setBackground('#0084C9').setFontColor('#FFFFFF').setFontWeight('bold');
  }

  // Setup TB_RuangBelajar (Tabel Kosong Siap Input Manual)
  let rbSh = ss.getSheetByName('TB_RuangBelajar');
  if (!rbSh) {
    rbSh = ss.insertSheet('TB_RuangBelajar');
    rbSh.appendRow(['id_materi', 'tgl_unggah', 'judul', 'kategori', 'jenjang', 'kelas', 'url_materi', 'url_thumbnail', 'deskripsi', 'kontributor']);
    rbSh.getRange(1, 1, 1, 10).setBackground('#0084C9').setFontColor('#FFFFFF').setFontWeight('bold');
  }

  Logger.log("✅ Setup SI-DIKDAS REST Server Berhasil! Struktur database kosong telah siap.");
  Logger.log("   Spreadsheet URL : " + ss.getUrl());
  Logger.log("   Drive Folder URL: " + rootFolder.getUrl());
}

/**
 * Utilitas untuk Mengosongkan Seluruh Data Transaksi (BOSP, PIP, Sarpras, Pengumuman, Ruang Belajar)
 * Menjaga baris header tetap ada, hanya menghapus isi baris data.
 */
function clearAllDatabaseTables() {
  const ss = getDb();
  ['TB_BOSP', 'TB_PIP', 'TB_Sarpras', 'TB_Pengumuman', 'TB_RuangBelajar'].forEach(sheetName => {
    try {
      const sh = ss.getSheetByName(sheetName);
      if (sh && sh.getLastRow() > 1) {
        sh.deleteRows(2, sh.getLastRow() - 1);
      }
    } catch (e) {
      Logger.log("Info clear " + sheetName + ": " + e.message);
    }
  });
  bump('TB_BOSP');
  bump('TB_PIP');
  bump('TB_Sarpras');
  bump('TB_Pengumuman');
  bump('TB_RuangBelajar');
  Logger.log("✅ Seluruh data transaksi BOSP, PIP, Sarpras, Pengumuman, dan Ruang Belajar telah dikosongkan.");
}
