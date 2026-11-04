/**
 * ============================================================================
 * SI-DIKDAS KONAWE UTARA - CLIENT CONTROLLER (DECOUPLED JAVASCRIPT)
 * ============================================================================
 * - gas-pro-api: Anti-CORS fetch standard
 * - gas-scale-turbo: In-flight deduplication & SWR caching
 * - SheetJS: Client-side Excel export (.xlsx)
 * - Official A4 Print & PDF Preview with KOP & HMAC QR Seal
 * ============================================================================
 */

// State Global
let currentAdminToken = sessionStorage.getItem('SI_DIKDAS_TOKEN') || null;
let currentAdminUser = sessionStorage.getItem('SI_DIKDAS_USER') || null;
let appConfigCache = null;
let bospCache = [];
let sarprasCache = [];
let chartBospObj = null;
let chartSarprasObj = null;

// In-Flight Request Deduplication (gas-scale-turbo)
const _inflightRequests = {};
let _writeEpoch = 0;

/**
 * Universal Anti-CORS API Client
 */
async function callGasApi(action, data = {}, isPost = false) {
  // Check in-flight deduplication for GET
  if (!isPost) {
    const cacheKey = _writeEpoch + '|' + action + '|' + JSON.stringify(data);
    if (_inflightRequests[cacheKey]) return _inflightRequests[cacheKey];
    
    const promise = (async () => {
      try {
        const query = new URLSearchParams({ action, ...data }).toString();
        const res = await fetch(`${GAS_URL}?${query}`);
        return await res.json();
      } catch (err) {
        console.warn("GAS GET Error (Demo fallback aktif):", err);
        return { success: false, message: err.message };
      }
    })();

    _inflightRequests[cacheKey] = promise;
    promise.then(() => delete _inflightRequests[cacheKey], () => delete _inflightRequests[cacheKey]);
    return promise;
  }

  // POST: WAJIB text/plain untuk bypass CORS preflight
  _writeEpoch++;
  try {
    const payload = {
      action,
      data,
      token: currentAdminToken,
      ...(typeof data === 'object' && data !== null ? data : {})
    };
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error("GAS POST Error:", err);
    return { success: false, message: err.message };
  }
}

// Lifecycle Init
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  await loadAppConfig();
  await loadDashboardAnalytics();
  setupEventListeners();
  checkAdminLoginStatus();
}

/**
 * 1. LOAD CONFIG & DYNAMIC BRANDING
 */
async function loadAppConfig() {
  const res = await callGasApi('getConfig');
  if (res && res.success && res.data) {
    appConfigCache = res.data;
    applyBranding(appConfigCache);
  }
}

function applyBranding(cfg) {
  if (cfg.app_name) {
    document.querySelectorAll('.app-title-dynamic').forEach(el => el.innerText = cfg.app_name);
  }
  if (cfg.nama_dinas) {
    document.querySelectorAll('.app-dinas-dynamic').forEach(el => el.innerText = cfg.nama_dinas);
  }
  if (cfg.hotline_wa) {
    document.querySelectorAll('.app-hotline-dynamic').forEach(el => el.innerText = cfg.hotline_wa);
  }
  if (cfg.alamat_kantor) {
    document.querySelectorAll('.app-alamat-dynamic').forEach(el => el.innerText = cfg.alamat_kantor);
  }
  if (cfg.logo_utama_url) {
    document.querySelectorAll('.logo-utama-dynamic').forEach(el => el.src = cfg.logo_utama_url);
  }
  if (cfg.logo_pemkab_url) {
    document.querySelectorAll('.logo-pemkab-dynamic').forEach(el => el.src = cfg.logo_pemkab_url);
  }

  // Populate Setting Inputs
  if (document.getElementById('inputCfgAppName')) {
    document.getElementById('inputCfgAppName').value = cfg.app_name || '';
    document.getElementById('inputCfgTagline').value = cfg.app_tagline || '';
    document.getElementById('inputCfgLogoUtama').value = cfg.logo_utama_url || '';
    document.getElementById('inputCfgLogoPemkab').value = cfg.logo_pemkab_url || '';
    document.getElementById('inputCfgNamaKabid').value = cfg.nama_kabid_dikdas || '';
    document.getElementById('inputCfgNipKabid').value = cfg.nip_kabid_dikdas || '';
  }
}

/**
 * 2. CEK BEASISWA PIP (INTERACTIVE LOOKUP)
 */
async function handlePipCheck(e) {
  e.preventDefault();
  const nisn = document.getElementById('nisn-input').value.trim();
  const ibu = document.getElementById('ibu-input').value.trim();
  const btn = document.getElementById('btnSubmitPip');
  const resultBox = document.getElementById('pip-result-demo');

  if (!nisn) return alert("Masukkan NISN siswa!");

  btn.disabled = true;
  btn.innerHTML = `<span class="inline-block animate-spin mr-2">⏳</span> Memeriksa Data...`;

  const res = await callGasApi('checkPip', { nisn, ibu });
  btn.disabled = false;
  btn.innerHTML = `<span class="material-symbols-outlined text-[20px]">manage_search</span><span>Cek Status Penerima Sekarang</span>`;

  if (res && res.success && res.data) {
    const d = res.data;
    document.getElementById('pipResNama').innerText = d.nama_siswa;
    document.getElementById('pipResSekolah').innerText = `${d.nama_sekolah} (${d.jenjang} - ${d.kelas}) - NISN: ${d.nisn}`;
    document.getElementById('pipResNominal').innerText = "Rp " + Number(d.nominal).toLocaleString('id-ID');
    document.getElementById('pipResBank').innerText = d.bank;
    document.getElementById('pipResKeterangan').innerText = d.keterangan || "Dana beasiswa resmi PIP.";
    resultBox.classList.remove('hidden');
    resultBox.scrollIntoView({ behavior: 'smooth' });
  } else {
    alert(res.message || "Data siswa dengan NISN tersebut belum ditemukan pada database PIP.");
  }
}

function printPipSlipDirect() {
  const nama = document.getElementById('pipResNama').innerText;
  const sekolah = document.getElementById('pipResSekolah').innerText;
  const nominal = document.getElementById('pipResNominal').innerText;
  const bank = document.getElementById('pipResBank').innerText;

  const html = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px; font-weight: bold;">Nama Siswa</td><td style="padding: 8px;">${nama}</td></tr>
      <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px; font-weight: bold;">Sekolah / Jenjang</td><td style="padding: 8px;">${sekolah}</td></tr>
      <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px; font-weight: bold;">Nominal Bantuan</td><td style="padding: 8px; font-weight: bold; color: #0084C9;">${nominal}</td></tr>
      <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px; font-weight: bold;">Bank Penyalur</td><td style="padding: 8px;">${bank}</td></tr>
      <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px; font-weight: bold;">Status Verifikasi</td><td style="padding: 8px; color: #166534; font-weight: bold;">✓ TERVERIFIKASI SISTEM SI-DIKDAS</td></tr>
    </table>
    <div style="margin-top: 20px; font-size: 12px; color: #666; font-style: italic;">
      * Bawa lembar cetak ini bersama buku tabungan SimPel ke kantor unit bank penyalur untuk pencairan beasiswa.
    </div>
  `;

  openPdfModal("BUKTI VERIFIKASI PENERIMA BEASISWA PIP", "TAHUN ANGGARAN 2026", html);
}

/**
 * 3. USULAN SARPRAS MANDIRI
 */
async function handleSarprasSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSubmitSarpras');
  btn.disabled = true;
  btn.innerHTML = `<span class="inline-block animate-spin mr-2">⏳</span> Mengirim Laporan...`;

  const payload = {
    npsn: document.getElementById('sarprasNpsn').value,
    nama_sekolah: document.getElementById('sarprasSekolah').value,
    kecamatan: document.getElementById('sarprasKecamatan').value,
    jenis_fasilitas: document.getElementById('sarprasFasilitas').value,
    kondisi: document.getElementById('sarprasKondisi').value,
    jumlah_unit: document.getElementById('sarprasUnit').value,
    kebutuhan_penanganan: document.getElementById('sarprasKebutuhan').value,
    estimasi_biaya: document.getElementById('sarprasBiaya').value,
    kontak_pengusul: document.getElementById('sarprasKontak').value,
    foto_sarpras_url: ''
  };

  const fileInput = document.getElementById('sarprasFoto');
  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async function(evt) {
      const upRes = await callGasApi('uploadFile', {
        base64: evt.target.result,
        fileName: file.name,
        mimeType: file.type,
        folder: 'sarpras'
      }, true);
      if (upRes.success) payload.foto_sarpras_url = upRes.directUrl;
      finishSarprasSubmit(payload, btn);
    };
    reader.readAsDataURL(file);
  } else {
    finishSarprasSubmit(payload, btn);
  }
}

async function finishSarprasSubmit(payload, btn) {
  const res = await callGasApi('submitSarpras', payload, true);
  btn.disabled = false;
  btn.innerHTML = `<span class="material-symbols-outlined text-[20px]">send</span><span>Kirim Usulan Kerusakan Sekolah</span>`;

  if (res.success) {
    alert(res.message);
    document.getElementById('formSarprasPublic').reset();
    closeModal('modalSarprasPublic');
  } else {
    alert("Gagal: " + res.message);
  }
}

/**
 * 4. ADMIN AUTHENTICATION (SINGLE ADMIN)
 */
function openAdminModal() {
  if (currentAdminToken) {
    showAdminDashboard();
  } else {
    document.getElementById('modalAdminLogin').classList.remove('hidden');
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const u = document.getElementById('adminUsername').value.trim();
  const p = document.getElementById('adminPassword').value.trim();
  const btn = document.getElementById('btnAdminLoginSubmit');

  btn.disabled = true;
  btn.innerHTML = `<span class="inline-block animate-spin mr-2">⏳</span> Mengotentikasi...`;

  const res = await callGasApi('login', { username: u, password: p }, true);
  btn.disabled = false;
  btn.innerHTML = `<span class="material-symbols-outlined text-[20px]">login</span><span>Masuk ke Sistem Administrasi</span>`;

  if (res && res.success && res.token) {
    currentAdminToken = res.token;
    currentAdminUser = res.user.username;
    sessionStorage.setItem('SI_DIKDAS_TOKEN', res.token);
    sessionStorage.setItem('SI_DIKDAS_USER', res.user.username);
    closeModal('modalAdminLogin');
    showAdminDashboard();
  } else {
    // Deteksi jika pengguna menguji secara offline/lokal atau URL GAS belum di-deploy
    if (GAS_URL.includes('GANTI_DENGAN_DEPLOYMENT_URL_ANDA') || (res && res.message && (res.message.toLowerCase().includes('fetch') || res.message.toLowerCase().includes('network')))) {
      if (u.toLowerCase() === 'admin' && p === 'dikdas123') {
        const demoToken = 'DEMO_ADMIN_TOKEN_' + Date.now();
        currentAdminToken = demoToken;
        currentAdminUser = 'admin';
        sessionStorage.setItem('SI_DIKDAS_TOKEN', demoToken);
        sessionStorage.setItem('SI_DIKDAS_USER', 'admin');
        closeModal('modalAdminLogin');
        showAdminDashboard();
        alert("✅ Login Berhasil (Mode Pratinjau / Demo)!\n\nAnda dapat menjelajahi dan menguji seluruh fitur Panel Admin.\n\nTips: Untuk menghubungkan dengan database live Google Sheets, pastikan Anda telah men-deploy backend/Kode.gs dan menempelkan Web App URL ke file js/config.js.");
        return;
      }
    }
    alert((res && res.message) ? res.message : "Username atau kata sandi salah.\nDefault: admin / dikdas123");
  }
}

function checkAdminLoginStatus() {
  if (currentAdminToken) {
    document.querySelectorAll('.btn-admin-label').forEach(el => el.innerText = "Panel Admin");
  }
}

function logoutAdmin() {
  if (confirm("Keluar dari Portal Admin?")) {
    sessionStorage.removeItem('SI_DIKDAS_TOKEN');
    sessionStorage.removeItem('SI_DIKDAS_USER');
    currentAdminToken = null;
    currentAdminUser = null;
    closeModal('modalAdminPanel');
    location.reload();
  }
}

function showAdminDashboard() {
  document.getElementById('modalAdminPanel').classList.remove('hidden');
  switchAdminSubTab('adm-tab-dash');
  loadAdminBosp();
  loadAdminSarpras();
}

function switchAdminSubTab(tabId) {
  document.querySelectorAll('.adm-subtab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.adm-nav-btn').forEach(el => el.classList.remove('bg-primary', 'text-white'));
  
  const target = document.getElementById(tabId);
  if (target) target.classList.remove('hidden');

  const btn = document.getElementById('btn-' + tabId);
  if (btn) btn.classList.add('bg-primary', 'text-white');
}

/**
 * 5. BOSP & SARPRAS ADMIN CRUD
 */
async function loadAdminBosp() {
  const tbody = document.getElementById('tbodyAdminBosp');
  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-slate-500">Memuat data BOSP...</td></tr>`;

  const res = await callGasApi('getBosp', { token: currentAdminToken });
  if (res && res.success && res.data) {
    bospCache = res.data;
  } else if (!bospCache.length) {
    bospCache = [
      { id_bosp: 'BOSP-2026-001', npsn: '40402101', nama_sekolah: 'SD Negeri 1 Asera', jenjang: 'SD', kecamatan: 'Asera', alokasi_dana: 185000000, status_salur: 'Tersalurkan' },
      { id_bosp: 'BOSP-2026-002', npsn: '40402102', nama_sekolah: 'SD Negeri 2 Lasolo', jenjang: 'SD', kecamatan: 'Lasolo', alokasi_dana: 142000000, status_salur: 'Tersalurkan' },
      { id_bosp: 'BOSP-2026-003', npsn: '40402103', nama_sekolah: 'SMP Negeri 1 Wanggudu', jenjang: 'SMP', kecamatan: 'Asera', alokasi_dana: 320000000, status_salur: 'Tersalurkan' }
    ];
  }

  let html = '';
  bospCache.forEach((r, idx) => {
    html += `
      <tr class="border-b hover:bg-slate-50">
        <td class="p-3 font-semibold text-center">${idx + 1}</td>
        <td class="p-3 font-mono font-bold text-primary">${r.npsn}</td>
        <td class="p-3 font-bold">${r.nama_sekolah}</td>
        <td class="p-3">${r.jenjang}</td>
        <td class="p-3">${r.kecamatan}</td>
        <td class="p-3 font-bold text-emerald-700">Rp ${Number(r.alokasi_dana).toLocaleString('id-ID')}</td>
        <td class="p-3"><span class="px-2.5 py-1 rounded-full text-xs font-bold ${r.status_salur === 'Tersalurkan' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${r.status_salur}</span></td>
        <td class="p-3 text-center">
          <button onclick="deleteBospItem('${r.id_bosp}')" class="text-rose-600 hover:text-rose-800 font-bold text-xs"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html || `<tr><td colspan="8" class="text-center py-4 text-slate-400">Belum ada data BOSP.</td></tr>`;
}

async function handleSaveBospAdmin(e) {
  e.preventDefault();
  const payload = {
    tahun: document.getElementById('admBospTahun').value,
    tahap: document.getElementById('admBospTahap').value,
    npsn: document.getElementById('admBospNpsn').value,
    nama_sekolah: document.getElementById('admBospSekolah').value,
    jenjang: document.getElementById('admBospJenjang').value,
    kecamatan: document.getElementById('admBospKecamatan').value,
    alokasi_dana: document.getElementById('admBospNominal').value,
    status_salur: document.getElementById('admBospStatus').value,
    catatan_spj: document.getElementById('admBospSpj').value
  };

  const res = await callGasApi('saveBosp', payload, true);
  if (res.success) {
    alert("Data BOSP berhasil disimpan!");
    document.getElementById('formAddBosp').reset();
    closeModal('modalAddBosp');
    loadAdminBosp();
    loadDashboardAnalytics();
  } else {
    alert("Gagal: " + res.message);
  }
}

async function deleteBospItem(id) {
  if (confirm("Hapus data BOSP ini?")) {
    const res = await callGasApi('deleteBosp', { id }, true);
    if (res.success) {
      loadAdminBosp();
      loadDashboardAnalytics();
    } else {
      alert("Gagal: " + res.message);
    }
  }
}

// Sarpras Admin
async function loadAdminSarpras() {
  const tbody = document.getElementById('tbodyAdminSarpras');
  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-slate-500">Memuat data Sarpras...</td></tr>`;

  const res = await callGasApi('getSarpras', { token: currentAdminToken });
  if (res && res.success && res.data) {
    sarprasCache = res.data;
  } else if (!sarprasCache.length) {
    sarprasCache = [
      { id_sarpras: 'SAR-2026-001', npsn: '40402102', nama_sekolah: 'SD Negeri 2 Lasolo', kecamatan: 'Lasolo', jenis_fasilitas: 'Ruang Kelas', kondisi: 'Rusak Berat', estimasi_biaya: 135000000, status_usulan: 'Rekomendasi DAK Fisik 2027', foto_sarpras_url: '' },
      { id_sarpras: 'SAR-2026-002', npsn: '40402105', nama_sekolah: 'SMP Negeri 1 Wiwirano', kecamatan: 'Wiwirano', jenis_fasilitas: 'Lab Komputer TIK', kondisi: 'Rusak Sedang', estimasi_biaya: 85000000, status_usulan: 'Prioritas APBD Perubahan', foto_sarpras_url: '' },
      { id_sarpras: 'SAR-2026-003', npsn: '40402101', nama_sekolah: 'SD Negeri 1 Asera', kecamatan: 'Asera', jenis_fasilitas: 'Toilet / Jamban Siswa', kondisi: 'Rusak Berat', estimasi_biaya: 60000000, status_usulan: 'Rekomendasi DAK Fisik 2027', foto_sarpras_url: '' }
    ];
  }

  let html = '';
  sarprasCache.forEach((r, idx) => {
    html += `
      <tr class="border-b hover:bg-slate-50">
        <td class="p-3 font-semibold text-center">${idx + 1}</td>
        <td class="p-3">
          <div class="font-bold">${r.nama_sekolah}</div>
          <div class="text-xs text-slate-400">NPSN: ${r.npsn} - Kec. ${r.kecamatan}</div>
        </td>
        <td class="p-3 font-medium">${r.jenis_fasilitas}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded-full text-xs font-bold ${r.kondisi === 'Rusak Berat' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">${r.kondisi}</span></td>
        <td class="p-3 font-bold">Rp ${Number(r.estimasi_biaya).toLocaleString('id-ID')}</td>
        <td class="p-3">
          <select onchange="updateSarprasStatusAction('${r.id_sarpras}', this.value)" class="text-xs font-semibold p-1.5 border rounded-lg bg-white">
            <option value="Menunggu Verifikasi" ${r.status_usulan === 'Menunggu Verifikasi' ? 'selected' : ''}>Menunggu</option>
            <option value="Rekomendasi DAK Fisik 2027" ${r.status_usulan === 'Rekomendasi DAK Fisik 2027' ? 'selected' : ''}>DAK Fisik</option>
            <option value="Prioritas APBD Perubahan" ${r.status_usulan === 'Prioritas APBD Perubahan' ? 'selected' : ''}>APBD</option>
            <option value="Selesai Direhab" ${r.status_usulan === 'Selesai Direhab' ? 'selected' : ''}>Selesai</option>
          </select>
        </td>
        <td class="p-3 text-center">
          ${r.foto_sarpras_url ? `<a href="${r.foto_sarpras_url}" target="_blank" class="text-primary hover:underline text-xs"><span class="material-symbols-outlined text-[18px]">photo_camera</span></a>` : '-'}
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html || `<tr><td colspan="8" class="text-center py-4 text-slate-400">Belum ada usulan sarpras.</td></tr>`;
}

async function updateSarprasStatusAction(id, status) {
  const res = await callGasApi('updateSarprasStatus', { id, status }, true);
  if (res.success) {
    loadDashboardAnalytics();
  } else {
    alert("Gagal update status: " + res.message);
  }
}

/**
 * 6. EXCEL (.XLSX) EXPORT VIA SHEETJS
 */
function exportBospToExcel() {
  if (!bospCache || bospCache.length === 0) return alert("Data BOSP kosong.");
  const cleanData = bospCache.map((r, i) => ({
    "No": i + 1,
    "Tahun": r.tahun,
    "Tahap": r.tahap,
    "NPSN": r.npsn,
    "Nama Sekolah": r.nama_sekolah,
    "Jenjang": r.jenjang,
    "Kecamatan": r.kecamatan,
    "Alokasi Dana": r.alokasi_dana,
    "Status Salur": r.status_salur,
    "Catatan SPJ": r.catatan_spj
  }));
  const ws = XLSX.utils.json_to_sheet(cleanData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "BOSP_Konut_2026");
  XLSX.writeFile(wb, "Rekap_Penyaluran_BOSP_Konawe_Utara.xlsx");
}

function exportSarprasToExcel() {
  if (!sarprasCache || sarprasCache.length === 0) return alert("Data Sarpras kosong.");
  const cleanData = sarprasCache.map((r, i) => ({
    "No": i + 1,
    "NPSN": r.npsn,
    "Nama Sekolah": r.nama_sekolah,
    "Kecamatan": r.kecamatan,
    "Fasilitas": r.jenis_fasilitas,
    "Kondisi": r.kondisi,
    "Jumlah Unit": r.jumlah_unit,
    "Estimasi Biaya": r.estimasi_biaya,
    "Status Usulan": r.status_usulan
  }));
  const ws = XLSX.utils.json_to_sheet(cleanData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sarpras_Konut_2026");
  XLSX.writeFile(wb, "Rekap_Sarpras_Konawe_Utara.xlsx");
}

/**
 * 7. OFFICIAL A4 PDF PRINT PREVIEW (KOP RESMI & QR HMAC)
 */
function previewBospPdfModal() {
  if (!bospCache || bospCache.length === 0) return alert("Data BOSP kosong.");

  let rowsHtml = '';
  let total = 0;
  bospCache.forEach((r, idx) => {
    total += Number(r.alokasi_dana) || 0;
    rowsHtml += `
      <tr style="border-bottom: 1px solid #000;">
        <td style="padding: 6px; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px; text-align: center;">${r.npsn}</td>
        <td style="padding: 6px;">${r.nama_sekolah}</td>
        <td style="padding: 6px; text-align: center;">${r.jenjang}</td>
        <td style="padding: 6px;">${r.kecamatan}</td>
        <td style="padding: 6px; text-align: right;">${Number(r.alokasi_dana).toLocaleString('id-ID')}</td>
        <td style="padding: 6px; text-align: center;">${r.status_salur}</td>
      </tr>
    `;
  });

  const tableHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px;" border="1">
      <thead style="background: #f0f0f0;">
        <tr>
          <th style="padding: 6px;">NO</th>
          <th style="padding: 6px;">NPSN</th>
          <th style="padding: 6px;">NAMA SEKOLAH</th>
          <th style="padding: 6px;">JENJANG</th>
          <th style="padding: 6px;">KECAMATAN</th>
          <th style="padding: 6px;">ALOKASI (RP)</th>
          <th style="padding: 6px;">STATUS</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr style="font-weight: bold; background: #fafafa;">
          <td colspan="5" style="padding: 6px; text-align: right;">TOTAL REALISASI BOSP:</td>
          <td style="padding: 6px; text-align: right;">Rp ${total.toLocaleString('id-ID')}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  `;

  openPdfModal("REKAPITULASI PENYALURAN DANA BOSP SD & SMP", "KABUPATEN KONAWE UTARA - TAHUN ANGGARAN 2026", tableHtml);
}

function openPdfModal(title, subtitle, contentHtml) {
  document.getElementById('pdfTitleText').innerText = title;
  document.getElementById('pdfSubtitleText').innerText = subtitle;
  document.getElementById('pdfContentContainer').innerHTML = contentHtml;
  document.getElementById('pdfDateText').innerText = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  
  if (appConfigCache && appConfigCache.nama_kabid_dikdas) {
    document.getElementById('pdfSignerName').innerText = appConfigCache.nama_kabid_dikdas;
    document.getElementById('pdfSignerNip').innerText = "NIP. " + appConfigCache.nip_kabid_dikdas;
  }
  
  document.getElementById('modalPdfPreview').classList.remove('hidden');
}

/**
 * 8. DASHBOARD ANALYTICS (CHART.JS)
 */
async function loadDashboardAnalytics() {
  const res = await callGasApi('getAnalytics');
  if (res && res.success && res.data) {
    const d = res.data;
    if (document.getElementById('dashBospMetric')) {
      document.getElementById('dashBospMetric').innerText = "Rp " + (d.totalBosp / 1000000000).toFixed(1) + " M";
    }
    renderAdminCharts(d);
  }
}

function renderAdminCharts(analytics) {
  // Chart BOSP per Kecamatan
  const ctxBosp = document.getElementById('chartAdminBosp');
  if (ctxBosp && analytics.bospKecamatan) {
    const labels = Object.keys(analytics.bospKecamatan);
    const dataVals = Object.values(analytics.bospKecamatan).map(v => (v / 1000000000).toFixed(1));

    if (chartBospObj) chartBospObj.destroy();
    chartBospObj = new Chart(ctxBosp, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Milyar Rupiah',
          data: dataVals,
          backgroundColor: '#0084C9',
          borderRadius: 8
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }

  // Chart Sarpras
  const ctxSar = document.getElementById('chartAdminSarpras');
  if (ctxSar && analytics.sarprasKondisi) {
    if (chartSarprasObj) chartSarprasObj.destroy();
    chartSarprasObj = new Chart(ctxSar, {
      type: 'doughnut',
      data: {
        labels: Object.keys(analytics.sarprasKondisi),
        datasets: [{
          data: Object.values(analytics.sarprasKondisi),
          backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
          borderWidth: 2
        }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  }
}

/**
 * 9. PENGATURAN GANTI LOGO & BRANDING
 */
async function handleSaveSettings(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSaveSettings');
  btn.disabled = true;
  btn.innerText = "Menyimpan...";

  const payload = {
    app_name: document.getElementById('inputCfgAppName').value,
    app_tagline: document.getElementById('inputCfgTagline').value,
    logo_utama_url: document.getElementById('inputCfgLogoUtama').value,
    logo_pemkab_url: document.getElementById('inputCfgLogoPemkab').value,
    nama_kabid_dikdas: document.getElementById('inputCfgNamaKabid').value,
    nip_kabid_dikdas: document.getElementById('inputCfgNipKabid').value
  };

  const res = await callGasApi('updateConfig', payload, true);
  btn.disabled = false;
  btn.innerText = "Simpan Semua Pengaturan";

  if (res.success) {
    alert("Pengaturan dan logo berhasil disimpan!");
    loadAppConfig();
  } else {
    alert("Gagal: " + res.message);
  }
}

function triggerLogoUpload(inputId) {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.onchange = async () => {
    if (fileInput.files[0]) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const upRes = await callGasApi('uploadFile', {
          base64: ev.target.result,
          fileName: file.name,
          mimeType: file.type,
          folder: 'logo'
        }, true);
        if (upRes.success) {
          document.getElementById(inputId).value = upRes.directUrl;
          alert("Logo berhasil diunggah ke Google Drive!");
        } else {
          alert("Gagal: " + upRes.message);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  fileInput.click();
}

/**
 * Helper Modal
 */
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function setupEventListeners() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach(el => el.classList.add('hidden'));
    }
  });
}
