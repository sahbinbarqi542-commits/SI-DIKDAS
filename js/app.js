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
let pipCache = [];
let sarprasCache = [];
let ruangBelajarCache = [];
let activeRbCategory = 'Semua';
let newsCache = [];
let daftarSekolahCache = [];
let sekolahPerKecamatanCache = {};
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
  await loadRuangBelajar();
  await loadNews();
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
    document.querySelectorAll('.app-hotline-dynamic').forEach(el => el.innerText = "Hotline: " + cfg.hotline_wa);
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
    if (document.getElementById('inputCfgHotline')) {
      document.getElementById('inputCfgHotline').value = cfg.hotline_wa || '';
    }
    if (document.getElementById('inputCfgEmail')) {
      document.getElementById('inputCfgEmail').value = cfg.email_dinas || 'dikdas@konaweutarakab.go.id';
    }
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
  loadDashboardAnalytics();
  loadAdminBosp();
  loadAdminPip();
  loadAdminSarpras();
  loadAdminRuangBelajar();
  loadAdminNews();
}

function scrollToAdminSection(id) {
  const el = document.getElementById(id);
  const container = document.getElementById('adminPanelScrollContainer');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('ring-4', 'ring-amber-400', 'transition-all');
    setTimeout(() => {
      el.classList.remove('ring-4', 'ring-amber-400');
    }, 2200);
  }
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
 * 5. BOSP, PIP, & SARPRAS ADMIN CRUD (INPUT MANUAL LENGKAP)
 */
async function loadAdminBosp() {
  const tbody = document.getElementById('tbodyAdminBosp');
  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-slate-500">Memuat data BOSP...</td></tr>`;

  const res = await callGasApi('getBosp', { token: currentAdminToken });
  bospCache = (res && res.success && Array.isArray(res.data)) ? res.data : [];

  if (bospCache.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-slate-400">
          <span class="material-symbols-outlined text-4xl block text-slate-300 mb-2">folder_open</span>
          <p class="font-bold text-slate-600">Belum ada data alokasi BOSP.</p>
          <p class="text-xs text-slate-400 mt-1">Silakan klik tombol <b>+ Input BOSP Baru</b> di atas untuk menambahkan data manual.</p>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  bospCache.forEach((r, idx) => {
    html += `
      <tr class="border-b hover:bg-slate-50">
        <td class="p-3 font-semibold text-center">${idx + 1}</td>
        <td class="p-3 font-mono font-bold text-primary">${r.npsn || '-'}</td>
        <td class="p-3 font-bold">${r.nama_sekolah || '-'}</td>
        <td class="p-3">${r.jenjang || '-'}</td>
        <td class="p-3">${r.kecamatan || '-'}</td>
        <td class="p-3 font-bold text-emerald-700">Rp ${Number(r.alokasi_dana || 0).toLocaleString('id-ID')}</td>
        <td class="p-3"><span class="px-2.5 py-1 rounded-full text-xs font-bold ${r.status_salur === 'Tersalurkan' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${r.status_salur || 'Proses'}</span></td>
        <td class="p-3 text-center">
          <button onclick="deleteBospItem('${r.id_bosp}')" title="Hapus Data BOSP" class="text-rose-600 hover:text-rose-800 font-bold text-xs p-1">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
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

// PIP (Program Indonesia Pintar) Admin CRUD
async function loadAdminPip() {
  const tbody = document.getElementById('tbodyAdminPip');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9" class="text-center py-6 text-slate-500">Memuat data PIP...</td></tr>`;

  const res = await callGasApi('getPip', { token: currentAdminToken });
  pipCache = (res && res.success && Array.isArray(res.data)) ? res.data : [];

  if (pipCache.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-8 text-slate-400">
          <span class="material-symbols-outlined text-4xl block text-slate-300 mb-2">folder_open</span>
          <p class="font-bold text-slate-600">Belum ada data siswa penerima beasiswa PIP.</p>
          <p class="text-xs text-slate-400 mt-1">Silakan klik tombol <b>+ Input Siswa PIP Baru</b> di atas untuk menambahkan data manual.</p>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  pipCache.forEach((r, idx) => {
    html += `
      <tr class="border-b hover:bg-slate-50">
        <td class="p-3 font-semibold text-center">${idx + 1}</td>
        <td class="p-3 font-mono font-bold text-primary">${r.nisn || '-'}</td>
        <td class="p-3 font-bold">${r.nama_siswa || '-'}</td>
        <td class="p-3">
          <div>${r.nama_sekolah || '-'}</div>
          <div class="text-[11px] text-slate-400">${r.jenjang || ''} - ${r.kelas || ''}</div>
        </td>
        <td class="p-3">${r.kecamatan || '-'}</td>
        <td class="p-3 font-bold text-sky-700">Rp ${Number(r.nominal_bantuan || r.nominal || 0).toLocaleString('id-ID')}</td>
        <td class="p-3">
          <span class="px-2.5 py-1 rounded-full text-xs font-bold ${r.status_pencairan === 'Sudah Cair' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
            ${r.status_pencairan || 'Proses'}
          </span>
        </td>
        <td class="p-3 text-xs">${r.nama_bank_penyalur || r.bank || '-'}</td>
        <td class="p-3 text-center">
          <button onclick="deletePipItem('${r.id_pip}')" title="Hapus Data PIP" class="text-rose-600 hover:text-rose-800 font-bold text-xs p-1">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

async function handleSavePipAdmin(e) {
  e.preventDefault();
  const payload = {
    tahun: document.getElementById('admPipTahun').value,
    nisn: document.getElementById('admPipNisn').value.trim(),
    nama_siswa: document.getElementById('admPipNama').value.trim(),
    nama_sekolah: document.getElementById('admPipSekolah').value.trim(),
    jenjang: document.getElementById('admPipJenjang').value,
    kelas: document.getElementById('admPipKelas').value.trim(),
    kecamatan: document.getElementById('admPipKecamatan').value,
    nominal_bantuan: document.getElementById('admPipNominal').value,
    status_pencairan: document.getElementById('admPipStatus').value,
    nama_bank_penyalur: document.getElementById('admPipBank').value,
    keterangan: document.getElementById('admPipKeterangan').value.trim()
  };

  const res = await callGasApi('savePip', payload, true);
  if (res.success) {
    alert("Data Beasiswa PIP berhasil disimpan!");
    document.getElementById('formAddPip').reset();
    closeModal('modalAddPip');
    loadAdminPip();
    loadDashboardAnalytics();
  } else {
    alert("Gagal: " + res.message);
  }
}

async function deletePipItem(id) {
  if (confirm("Hapus data siswa PIP ini?")) {
    const res = await callGasApi('deletePip', { id }, true);
    if (res.success) {
      loadAdminPip();
      loadDashboardAnalytics();
    } else {
      alert("Gagal: " + res.message);
    }
  }
}

// Sarpras Admin CRUD & Manual Input
async function loadAdminSarpras() {
  const tbody = document.getElementById('tbodyAdminSarpras');
  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-slate-500">Memuat data Sarpras...</td></tr>`;

  const res = await callGasApi('getSarpras', { token: currentAdminToken });
  sarprasCache = (res && res.success && Array.isArray(res.data)) ? res.data : [];

  const badgeEl = document.getElementById('badgePendingSarprasCount');
  if (badgeEl) {
    const pendingCount = sarprasCache.filter(r => !r.status_usulan || r.status_usulan === 'Menunggu Verifikasi').length;
    badgeEl.innerText = pendingCount > 0 ? `${pendingCount} Menunggu` : sarprasCache.length;
  }

  if (sarprasCache.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-slate-400">
          <span class="material-symbols-outlined text-4xl block text-slate-300 mb-2">folder_open</span>
          <p class="font-bold text-slate-600">Belum ada data usulan / kondisi sarpras.</p>
          <p class="text-xs text-slate-400 mt-1">Silakan klik tombol <b>+ Input Sarpras Manual</b> di atas untuk menambahkan data.</p>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  sarprasCache.forEach((r, idx) => {
    const isAccepted = r.status_usulan === 'Berkas Diterima' || r.status_usulan?.includes('DAK') || r.status_usulan?.includes('APBD');
    const isRejected = r.status_usulan === 'Berkas Ditolak';
    html += `
      <tr class="border-b hover:bg-slate-50">
        <td class="p-3 font-semibold text-center">${idx + 1}</td>
        <td class="p-3">
          <div class="font-bold text-slate-900">${r.nama_sekolah || '-'}</div>
          <div class="text-[11px] text-slate-500 mt-0.5">NPSN: <span class="font-mono font-semibold">${r.npsn || '-'}</span> | Kec. ${r.kecamatan || '-'}</div>
        </td>
        <td class="p-3 font-medium">${r.jenis_fasilitas || '-'}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded-full text-xs font-bold ${r.kondisi === 'Rusak Berat' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">${r.kondisi || 'Baik'}</span></td>
        <td class="p-3 font-bold text-slate-900">Rp ${Number(r.estimasi_biaya || 0).toLocaleString('id-ID')}</td>
        <td class="p-3">
          <div class="space-y-1.5">
            <div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                isAccepted ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                isRejected ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                'bg-amber-100 text-amber-800 border border-amber-300'
              }">${r.status_usulan || 'Menunggu Verifikasi'}</span>
            </div>
            <!-- Tombol Aksi Verifikasi: Berkas Diterima / Berkas Ditolak -->
            <div class="flex items-center gap-1">
              <button onclick="updateSarprasStatusAction('${r.id_sarpras}', 'Berkas Diterima')" title="Verifikasi Berkas Diterima" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-sm flex items-center gap-1 active:scale-95 transition-all">
                <i class="fa-solid fa-check"></i> Berkas Diterima
              </button>
              <button onclick="updateSarprasStatusAction('${r.id_sarpras}', 'Berkas Ditolak')" title="Verifikasi Berkas Ditolak" class="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-sm flex items-center gap-1 active:scale-95 transition-all">
                <i class="fa-solid fa-xmark"></i> Berkas Ditolak
              </button>
            </div>
            <div>
              <select onchange="updateSarprasStatusAction('${r.id_sarpras}', this.value)" class="text-[11px] font-semibold p-1 border rounded-lg bg-white w-full focus:ring-1 focus:ring-amber-500">
                <option value="Menunggu Verifikasi" ${r.status_usulan === 'Menunggu Verifikasi' ? 'selected' : ''}>Menunggu Verifikasi</option>
                <option value="Berkas Diterima" ${r.status_usulan === 'Berkas Diterima' ? 'selected' : ''}>✅ Berkas Diterima</option>
                <option value="Berkas Ditolak" ${r.status_usulan === 'Berkas Ditolak' ? 'selected' : ''}>❌ Berkas Ditolak</option>
                <option value="Rekomendasi DAK Fisik 2027" ${r.status_usulan === 'Rekomendasi DAK Fisik 2027' ? 'selected' : ''}>⭐ Rekomendasi DAK Fisik 2027</option>
                <option value="Prioritas APBD Perubahan" ${r.status_usulan === 'Prioritas APBD Perubahan' ? 'selected' : ''}>📌 Prioritas APBD Perubahan</option>
                <option value="Selesai Direhab" ${r.status_usulan === 'Selesai Direhab' ? 'selected' : ''}>Selesai Direhab</option>
              </select>
            </div>
          </div>
        </td>
        <td class="p-3 text-center">
          ${r.foto_sarpras_url ? `<a href="${r.foto_sarpras_url}" target="_blank" class="text-primary hover:underline text-xs"><span class="material-symbols-outlined text-[18px]">photo_camera</span></a>` : '-'}
        </td>
        <td class="p-3 text-center">
          <button onclick="deleteSarprasItem('${r.id_sarpras}')" title="Hapus Data Sarpras" class="text-rose-600 hover:text-rose-800 font-bold text-xs p-1">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

async function handleSaveSarprasAdmin(e) {
  e.preventDefault();
  const payload = {
    tgl_pendataan: document.getElementById('admSarTgl').value,
    npsn: document.getElementById('admSarNpsn').value.trim(),
    nama_sekolah: document.getElementById('admSarSekolah').value.trim(),
    kecamatan: document.getElementById('admSarKecamatan').value,
    jenis_fasilitas: document.getElementById('admSarFasilitas').value,
    kondisi: document.getElementById('admSarKondisi').value,
    jumlah_unit: document.getElementById('admSarJumlah').value,
    kebutuhan_penanganan: document.getElementById('admSarPenanganan').value.trim(),
    estimasi_biaya: document.getElementById('admSarRab').value,
    status_usulan: document.getElementById('admSarStatus').value,
    foto_sarpras_url: document.getElementById('admSarFoto').value.trim()
  };

  const res = await callGasApi('saveSarpras', payload, true);
  if (res.success) {
    alert("Data Sarpras berhasil disimpan secara manual!");
    document.getElementById('formAddSarpras').reset();
    closeModal('modalAddSarpras');
    loadAdminSarpras();
    loadDashboardAnalytics();
  } else {
    alert("Gagal: " + res.message);
  }
}

async function deleteSarprasItem(id) {
  if (confirm("Hapus data sarpras ini?")) {
    const res = await callGasApi('deleteSarpras', { id }, true);
    if (res.success) {
      loadAdminSarpras();
      loadDashboardAnalytics();
    } else {
      alert("Gagal: " + res.message);
    }
  }
}

async function updateSarprasStatusAction(id, status) {
  const res = await callGasApi('updateSarprasStatus', { id, status }, true);
  if (res && res.success) {
    alert(`Status Sarpras berhasil diubah: "${status}"`);
    loadAdminSarpras();
    loadDashboardAnalytics();
  } else {
    alert("Gagal update status: " + (res.message || "Terjadi kesalahan"));
  }
}

// Danger Zone: Kosongkan Seluruh Data Database
async function confirmClearAllData() {
  const pass = prompt("PERINGATAN KEAMANAN:\nAnda akan mengosongkan seluruh data transaksi (BOSP, PIP, dan Sarpras).\nKetik 'KOSONGKAN' untuk mengonfirmasi:");
  if (pass !== 'KOSONGKAN') {
    alert("Operasi dibatalkan.");
    return;
  }

  const btn = document.getElementById('btnResetDatabase');
  if (btn) btn.disabled = true;

  const res = await callGasApi('clearAllData', {}, true);
  if (btn) btn.disabled = false;

  if (res && res.success) {
    alert("✅ Seluruh data transaksi BOSP, PIP, dan Sarpras telah berhasil dikosongkan!\nDatabase kini bersih dan siap diinput manual oleh Admin.");
    bospCache = [];
    pipCache = [];
    sarprasCache = [];
    ruangBelajarCache = [];
    newsCache = [];
    loadAdminBosp();
    loadAdminPip();
    loadAdminSarpras();
    loadAdminRuangBelajar();
    loadAdminNews();
    renderRuangBelajarPublic();
    renderNewsPublic();
    loadDashboardAnalytics();
  } else {
    alert("Gagal mengosongkan data: " + ((res && res.message) ? res.message : 'Sesi tidak valid'));
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

function exportPipToExcel() {
  if (!pipCache || pipCache.length === 0) return alert("Data Beasiswa PIP kosong.");
  const cleanData = pipCache.map((r, i) => ({
    "No": i + 1,
    "Tahun": r.tahun,
    "NISN": r.nisn,
    "Nama Siswa": r.nama_siswa,
    "Nama Sekolah": r.nama_sekolah,
    "Jenjang": r.jenjang,
    "Kelas": r.kelas,
    "Kecamatan": r.kecamatan,
    "Nominal Bantuan": r.nominal_bantuan || r.nominal,
    "Status Pencairan": r.status_pencairan || r.status,
    "Bank Penyalur": r.nama_bank_penyalur || r.bank,
    "Keterangan": r.keterangan
  }));
  const ws = XLSX.utils.json_to_sheet(cleanData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PIP_Konut_2026");
  XLSX.writeFile(wb, "Rekap_Penerima_Beasiswa_PIP_Konawe_Utara.xlsx");
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

    // Update Landing Page Stats
    if (document.getElementById('statTotalSekolah')) {
      document.getElementById('statTotalSekolah').innerText = d.totalSekolah || 0;
    }
    if (document.getElementById('statTotalBosp')) {
      document.getElementById('statTotalBosp').innerText = d.totalBosp > 0 ? ("Rp " + (d.totalBosp / 1000000000).toFixed(1) + " M") : "Rp 0";
    }
    if (document.getElementById('statTotalPip')) {
      document.getElementById('statTotalPip').innerText = Number(d.totalPip || 0).toLocaleString('id-ID');
    }
    if (document.getElementById('statTotalSarpras')) {
      document.getElementById('statTotalSarpras').innerText = Number(d.totalSarpras || 0).toLocaleString('id-ID');
    }

    // Update Hero Fanned Cards
    if (document.getElementById('dashBospMetric')) {
      document.getElementById('dashBospMetric').innerText = d.totalBosp > 0 ? ("Rp " + (d.totalBosp / 1000000000).toFixed(1) + " M") : "Rp 0";
    }
    if (document.getElementById('dashPipMetric')) {
      document.getElementById('dashPipMetric').innerText = (d.totalPip || 0) + " Siswa Konut";
    }
    if (document.getElementById('dashSarprasMetric')) {
      document.getElementById('dashSarprasMetric').innerText = (d.totalSarpras || 0) + " Usulan";
    }
    if (document.getElementById('dashSekolahSummary')) {
      document.getElementById('dashSekolahSummary').innerText = (d.totalSekolah || 0) + " Sekolah Terdata";
    }

    // Cache dynamic school & kecamatan data
    daftarSekolahCache = Array.isArray(d.daftarSekolah) ? d.daftarSekolah : [];
    sekolahPerKecamatanCache = (typeof d.sekolahPerKecamatan === 'object' && d.sekolahPerKecamatan !== null) ? d.sekolahPerKecamatan : {};

    // Update Section Kecamatan & Sekolah
    if (document.getElementById('statSekolahDaftarCount')) {
      document.getElementById('statSekolahDaftarCount').innerText = `${d.totalSekolah || 0} Satpen`;
    }

    const containerKec = document.getElementById('containerKecamatanList');
    if (containerKec) {
      const kecNames = Object.keys(sekolahPerKecamatanCache);
      if (kecNames.length === 0) {
        containerKec.innerHTML = `
          <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 text-xs w-full flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-amber-600">info</span>
            <span>Belum ada sekolah terdata. Nama sekolah per kecamatan akan otomatis muncul dan terdaftar di sini setelah diinput manual oleh Admin pada menu Kurikulum/BOSP/PIP atau Sarpras.</span>
          </div>
        `;
      } else {
        let htmlKec = '';
        kecNames.sort().forEach(kec => {
          const list = sekolahPerKecamatanCache[kec] || [];
          htmlKec += `
            <button onclick="showKecamatanSchools('${escapeAttr(kec)}')" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-primary hover:text-white transition-all cursor-pointer font-bold border border-slate-200 flex items-center gap-2 group active:scale-95 shadow-sm">
              <span>Kec. ${kec}</span>
              <span class="px-2 py-0.5 rounded-full bg-white group-hover:bg-white/20 text-primary group-hover:text-white text-[10px] font-extrabold border border-slate-200 group-hover:border-transparent">${list.length} Satpen</span>
            </button>
          `;
        });
        containerKec.innerHTML = htmlKec;
      }
    }

    renderAdminCharts(d);
  }
}

function showKecamatanSchools(kec) {
  const container = document.getElementById('containerKecamatanSchools');
  const title = document.getElementById('kecamatanSelectedTitle');
  const grid = document.getElementById('kecamatanSchoolsGrid');
  if (!container || !grid) return;

  const list = (sekolahPerKecamatanCache && sekolahPerKecamatanCache[kec]) ? sekolahPerKecamatanCache[kec] : [];
  title.innerText = `Daftar Satuan Pendidikan - Kec. ${kec} (${list.length} Sekolah)`;
  
  if (list.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-xs text-slate-400">Tidak ada sekolah terdaftar di kecamatan ini.</div>`;
  } else {
    let html = '';
    list.forEach((s) => {
      html += `
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-primary/40 transition-all flex items-start gap-2.5 shadow-sm">
          <div class="w-8 h-8 rounded-lg ${s.jenjang === 'SMP' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-primary'} flex items-center justify-center font-bold text-xs shrink-0">
            ${s.jenjang || 'SD'}
          </div>
          <div class="flex-1 min-w-0">
            <h5 class="font-bold text-slate-900 text-xs truncate" title="${escapeAttr(s.nama_sekolah)}">${escapeHtml(s.nama_sekolah)}</h5>
            <div class="text-[11px] text-slate-500 mt-0.5">NPSN: <span class="font-mono font-semibold">${s.npsn || '-'}</span></div>
          </div>
        </div>
      `;
    });
    grid.innerHTML = html;
  }
  container.classList.remove('hidden');
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderAdminCharts(analytics) {
  // Chart BOSP per Kecamatan
  const ctxBosp = document.getElementById('chartAdminBosp');
  if (ctxBosp) {
    const rawLabels = (analytics && analytics.bospKecamatan) ? Object.keys(analytics.bospKecamatan) : [];
    const labels = rawLabels.length > 0 ? rawLabels : ['Belum ada input'];
    const dataVals = rawLabels.length > 0 
      ? Object.values(analytics.bospKecamatan).map(v => (v / 1000000000).toFixed(1))
      : [0];

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
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: { legend: { display: false } } 
      }
    });
  }

  // Chart Sarpras
  const ctxSar = document.getElementById('chartAdminSarpras');
  if (ctxSar) {
    const kondisi = (analytics && analytics.sarprasKondisi) ? analytics.sarprasKondisi : {};
    const totalSarpras = Object.values(kondisi).reduce((a, b) => a + b, 0);

    let labels = Object.keys(kondisi);
    let dataVals = Object.values(kondisi);
    let bgColors = ['#10B981', '#F59E0B', '#EF4444'];

    if (totalSarpras === 0) {
      labels = ['Menunggu data input'];
      dataVals = [1];
      bgColors = ['#cbd5e1'];
    }

    if (chartSarprasObj) chartSarprasObj.destroy();
    chartSarprasObj = new Chart(ctxSar, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataVals,
          backgroundColor: bgColors,
          borderWidth: 2
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } } 
      }
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
    app_name: document.getElementById('inputCfgAppName').value.trim(),
    app_tagline: document.getElementById('inputCfgTagline').value.trim(),
    hotline_wa: document.getElementById('inputCfgHotline') ? document.getElementById('inputCfgHotline').value.trim() : '',
    email_dinas: document.getElementById('inputCfgEmail') ? document.getElementById('inputCfgEmail').value.trim() : '',
    logo_utama_url: document.getElementById('inputCfgLogoUtama').value.trim(),
    logo_pemkab_url: document.getElementById('inputCfgLogoPemkab').value.trim(),
    nama_kabid_dikdas: document.getElementById('inputCfgNamaKabid').value.trim(),
    nip_kabid_dikdas: document.getElementById('inputCfgNipKabid').value.trim()
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

/**
 * ============================================================================
 * 10. RUANG BELAJAR & KOLABORASI (VIDEO, MEDIA PEMBELAJARAN, & MODUL AJAR)
 * ============================================================================
 */
async function loadRuangBelajar() {
  const res = await callGasApi('getRuangBelajar');
  ruangBelajarCache = (res && res.success && Array.isArray(res.data)) ? res.data : [];
  renderRuangBelajarPublic();
  if (currentAdminToken) {
    loadAdminRuangBelajar();
  }
}

function filterRuangBelajarPublic(cat) {
  activeRbCategory = cat;
  document.querySelectorAll('#filterRuangBelajarButtons .filter-rb-btn').forEach(btn => {
    if (btn.getAttribute('data-category') === cat) {
      btn.className = 'filter-rb-btn px-3.5 py-2 rounded-xl bg-indigo-600 text-white shadow-sm transition-all';
    } else {
      btn.className = 'filter-rb-btn px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all';
    }
  });
  renderRuangBelajarPublic();
}

function renderRuangBelajarPublic() {
  const grid = document.getElementById('containerRuangBelajarGrid');
  if (!grid) return;

  const filtered = activeRbCategory === 'Semua' 
    ? ruangBelajarCache 
    : ruangBelajarCache.filter(item => item.kategori === activeRbCategory);

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        <span class="material-symbols-outlined text-5xl text-indigo-300 mb-2">smart_display</span>
        <p class="font-bold text-slate-700 text-sm">Belum ada materi pembelajaran yang diinput.</p>
        <p class="text-xs text-slate-400 mt-1">Admin dapat menambahkan video edukasi, media interaktif, atau modul ajar melalui Portal Admin.</p>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(item => {
    // Check if YouTube
    let ytEmbedHtml = '';
    const ytMatch = String(item.url_materi || '').match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      const ytId = ytMatch[1];
      ytEmbedHtml = `
        <div class="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-inner">
          <iframe class="w-full h-full" src="https://www.youtube.com/embed/${ytId}" title="${escapeAttr(item.judul)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
      `;
    } else if (item.url_thumbnail) {
      ytEmbedHtml = `
        <div class="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-100 border">
          <img src="${escapeAttr(item.url_thumbnail)}" alt="${escapeAttr(item.judul)}" class="w-full h-full object-cover">
        </div>
      `;
    } else {
      ytEmbedHtml = `
        <div class="relative w-full aspect-video rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 flex flex-col items-center justify-center text-white p-4 text-center">
          <span class="material-symbols-outlined text-4xl mb-1 opacity-90">${item.kategori?.includes('Video') ? 'play_circle' : 'menu_book'}</span>
          <span class="text-xs font-bold uppercase tracking-wider opacity-80">${item.kategori || 'Media Digital'}</span>
        </div>
      `;
    }

    html += `
      <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group">
        <div>
          ${ytEmbedHtml}
          <div class="flex items-center gap-2 mt-4 mb-2 flex-wrap">
            <span class="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">${escapeHtml(item.kategori || 'Video Pembelajaran')}</span>
            <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">${escapeHtml(item.jenjang || 'SD/SMP')} - ${escapeHtml(item.kelas || 'Semua Kelas')}</span>
          </div>
          <h4 class="font-extrabold text-slate-900 text-sm mb-1.5 leading-snug group-hover:text-primary transition-colors">${escapeHtml(item.judul)}</h4>
          <p class="text-xs text-slate-500 line-clamp-2 mb-3">${escapeHtml(item.deskripsi || 'Materi pembelajaran digital Disdikbud Konawe Utara.')}</p>
        </div>
        <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span class="text-[11px] text-slate-400 font-medium">Oleh: <strong class="text-slate-600">${escapeHtml(item.kontributor || 'Disdikbud Konut')}</strong></span>
          <a href="${escapeAttr(item.url_materi)}" target="_blank" class="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold hover:underline">
            <span>Buka Media</span>
            <span class="material-symbols-outlined text-[16px]">open_in_new</span>
          </a>
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;
}

async function loadAdminRuangBelajar() {
  const tbody = document.getElementById('tbodyAdminRuangBelajar');
  if (!tbody) return;
  
  if (ruangBelajarCache.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-slate-400">
          <span class="material-symbols-outlined text-4xl block text-slate-300 mb-2">video_library</span>
          <p class="font-bold text-slate-600">Belum ada materi pembelajaran diinput.</p>
          <p class="text-xs text-slate-400 mt-1">Klik tombol <b>+ Input Materi Baru</b> di atas untuk menambahkan video atau media pembelajaran.</p>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  ruangBelajarCache.forEach((r, idx) => {
    html += `
      <tr class="border-b hover:bg-slate-50">
        <td class="p-3 font-semibold text-center">${idx + 1}</td>
        <td class="p-3">
          <div class="font-bold text-slate-900">${escapeHtml(r.judul || '-')}</div>
          <div class="text-[11px] text-slate-400 max-w-xs truncate">${escapeHtml(r.deskripsi || '-')}</div>
        </td>
        <td class="p-3 font-semibold text-indigo-700">${escapeHtml(r.kategori || '-')}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">${escapeHtml(r.jenjang || '-')} - ${escapeHtml(r.kelas || '-')}</span></td>
        <td class="p-3 font-medium text-slate-600">${escapeHtml(r.kontributor || '-')}</td>
        <td class="p-3 text-center">
          <a href="${escapeAttr(r.url_materi)}" target="_blank" class="text-indigo-600 hover:underline font-bold text-xs inline-flex items-center gap-0.5">
            <span class="material-symbols-outlined text-[16px]">open_in_new</span>
            <span>Link</span>
          </a>
        </td>
        <td class="p-3 text-center">
          <button onclick="deleteRuangBelajarItem('${r.id_materi}')" title="Hapus Materi" class="text-rose-600 hover:text-rose-800 font-bold text-xs p-1">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

async function handleSaveRuangBelajarAdmin(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSubmitRuangBelajarAdmin');
  btn.disabled = true;
  btn.innerHTML = `<span class="inline-block animate-spin mr-2">⏳</span> Menyimpan...`;

  const payload = {
    judul: document.getElementById('admRbJudul').value.trim(),
    kategori: document.getElementById('admRbKategori').value,
    jenjang: document.getElementById('admRbJenjang').value,
    kelas: document.getElementById('admRbKelas').value,
    kontributor: document.getElementById('admRbKontributor').value.trim(),
    url_materi: document.getElementById('admRbUrl').value.trim(),
    url_thumbnail: document.getElementById('admRbThumbnail').value.trim(),
    deskripsi: document.getElementById('admRbDeskripsi').value.trim()
  };

  const res = await callGasApi('saveRuangBelajar', payload, true);
  btn.disabled = false;
  btn.innerHTML = `Simpan Materi Pembelajaran`;

  if (res && res.success) {
    alert("✅ Materi Ruang Belajar berhasil disimpan!");
    document.getElementById('formAddRuangBelajar').reset();
    closeModal('modalAddRuangBelajar');
    loadRuangBelajar();
  } else {
    alert("Gagal menyimpan materi: " + (res.message || "Terjadi kesalahan."));
  }
}

async function deleteRuangBelajarItem(id) {
  if (!confirm("Apakah Anda yakin ingin menghapus materi pembelajaran ini?")) return;
  const res = await callGasApi('deleteRuangBelajar', { id }, true);
  if (res && res.success) {
    alert("Materi pembelajaran berhasil dihapus.");
    loadRuangBelajar();
  } else {
    alert("Gagal menghapus: " + res.message);
  }
}

/**
 * ============================================================================
 * 11. CEK STATUS VERIFIKASI USULAN SARPRAS (PUBLIK)
 * ============================================================================
 */
async function handleCheckSarprasPublic(e) {
  e.preventDefault();
  const query = document.getElementById('checkSarprasQuery').value.trim();
  const btn = document.getElementById('btnSubmitCheckSarpras');
  const resBox = document.getElementById('checkSarprasResult');

  if (!query) return alert("Masukkan NPSN atau Nama Satuan Pendidikan!");

  btn.disabled = true;
  btn.innerHTML = `<span class="inline-block animate-spin mr-1">⏳</span> Cek`;

  const res = await callGasApi('checkSarpras', { query });
  btn.disabled = false;
  btn.innerHTML = `<span class="material-symbols-outlined text-[18px]">search</span><span>Cek</span>`;

  resBox.classList.remove('hidden');

  if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
    let html = '';
    res.data.forEach(item => {
      const isAccepted = item.status_usulan === 'Berkas Diterima' || item.status_usulan?.includes('DAK') || item.status_usulan?.includes('APBD');
      const isRejected = item.status_usulan === 'Berkas Ditolak';
      html += `
        <div class="p-4 rounded-2xl border ${isAccepted ? 'bg-emerald-50 border-emerald-200' : isRejected ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'} space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-700">${escapeHtml(item.id_sarpras)}</span>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${
              item.status_usulan === 'Berkas Diterima' ? 'bg-emerald-600 text-white' :
              item.status_usulan === 'Berkas Ditolak' ? 'bg-rose-600 text-white' :
              item.status_usulan?.includes('DAK') ? 'bg-indigo-600 text-white' :
              item.status_usulan?.includes('APBD') ? 'bg-blue-600 text-white' :
              'bg-amber-500 text-white'
            }">${escapeHtml(item.status_usulan || 'Menunggu Verifikasi')}</span>
          </div>
          <div class="font-extrabold text-sm text-slate-900">${escapeHtml(item.nama_sekolah)}</div>
          <div class="text-xs text-slate-600">NPSN: ${escapeHtml(item.npsn)} | Kec. ${escapeHtml(item.kecamatan)}</div>
          <div class="text-xs text-slate-700">Fasilitas: <strong>${escapeHtml(item.jenis_fasilitas)} (${escapeHtml(item.kondisi)})</strong></div>
          <div class="text-xs text-slate-700">Penanganan: <em>${escapeHtml(item.kebutuhan_penanganan || '-')}</em></div>
          <div class="text-xs font-bold text-slate-900">Estimasi Usulan: Rp ${Number(item.estimasi_biaya || 0).toLocaleString('id-ID')}</div>
        </div>
      `;
    });
    resBox.innerHTML = html;
  } else {
    resBox.innerHTML = `
      <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 text-center">
        ${(res && res.message) ? escapeHtml(res.message) : "Usulan Sarpras untuk sekolah tersebut belum ditemukan atau masih dalam proses rekapitulasi."}
      </div>
    `;
  }
}

/**
 * ============================================================================
 * 12. WARTA EDUKASI & PENGUMUMAN RESMI DINAS
 * ============================================================================
 */
async function loadNews() {
  const res = await callGasApi('getNews');
  newsCache = (res && res.success && Array.isArray(res.data)) ? res.data : [];
  renderNewsPublic();
  if (currentAdminToken) {
    loadAdminNews();
  }
}

function renderNewsPublic() {
  const container = document.getElementById('containerNewsList');
  if (!container) return;

  if (newsCache.length === 0) {
    container.innerHTML = `
      <div class="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-center">
        <span class="material-symbols-outlined text-4xl text-emerald-400 mb-2">newspaper</span>
        <p class="font-bold text-slate-700 text-sm">Belum ada Warta Edukasi yang dipublikasikan.</p>
        <p class="text-xs text-slate-400 mt-1">Pengumuman dan surat edaran resmi akan tampil di sini setelah diinput melalui Portal Admin.</p>
      </div>
    `;
    return;
  }

  let html = '';
  newsCache.forEach(r => {
    let dateStr = r.tgl_terbit || '-';
    try {
      if (r.tgl_terbit) {
        dateStr = new Date(r.tgl_terbit).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch(e) {}

    html += `
      <article class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-5 items-start sm:items-center">
        <div class="w-full sm:w-28 h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0">
          <img class="w-full h-full object-cover" src="${escapeAttr(r.foto_url || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&q=80')}" alt="Warta">
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 text-[11px] text-slate-400 font-medium mb-1.5">
            <span class="px-2 py-0.5 rounded ${
              r.kategori?.includes('Sarpras') ? 'bg-amber-100 text-amber-800' :
              r.kategori?.includes('TIK') ? 'bg-emerald-100 text-emerald-800' :
              r.kategori?.includes('Kurikulum') ? 'bg-indigo-100 text-indigo-800' :
              'bg-blue-100 text-primary'
            } font-bold">${escapeHtml(r.kategori || 'Surat Edaran')}</span>
            <span>${escapeHtml(dateStr)}</span>
          </div>
          <h4 class="text-sm font-bold text-slate-900 mb-1 hover:text-primary transition-colors cursor-pointer">
            ${escapeHtml(r.judul || '-')}
          </h4>
          <p class="text-xs text-slate-500 line-clamp-2">
            ${escapeHtml(r.isi_ringkas || '-')}
          </p>
          ${r.link_dokumen_url ? `
            <div class="mt-2">
              <a href="${escapeAttr(r.link_dokumen_url)}" target="_blank" class="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                <span class="material-symbols-outlined text-[14px]">download</span>
                <span>Unduh Berkas Surat Edaran</span>
              </a>
            </div>
          ` : ''}
        </div>
      </article>
    `;
  });
  container.innerHTML = html;
}

async function loadAdminNews() {
  const tbody = document.getElementById('tbodyAdminNews');
  if (!tbody) return;

  if (newsCache.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-slate-400">
          <span class="material-symbols-outlined text-4xl block text-slate-300 mb-2">newspaper</span>
          <p class="font-bold text-slate-600">Belum ada data Warta Edukasi diinput.</p>
          <p class="text-xs text-slate-400 mt-1">Klik tombol <b>+ Input Warta Edukasi</b> di atas untuk menambahkan berita atau surat edaran.</p>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  newsCache.forEach((r, idx) => {
    let dateStr = r.tgl_terbit || '-';
    try {
      if (r.tgl_terbit) {
        dateStr = new Date(r.tgl_terbit).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch(e) {}

    html += `
      <tr class="border-b hover:bg-slate-50">
        <td class="p-3 font-semibold text-center">${idx + 1}</td>
        <td class="p-3">
          <div class="font-bold text-slate-900">${escapeHtml(r.judul || '-')}</div>
          <div class="text-[11px] text-slate-400 mt-0.5">Rilis: ${escapeHtml(dateStr)}</div>
        </td>
        <td class="p-3 font-semibold text-primary">${escapeHtml(r.kategori || '-')}</td>
        <td class="p-3"><p class="text-xs text-slate-600 max-w-xs truncate">${escapeHtml(r.isi_ringkas || '-')}</p></td>
        <td class="p-3 text-center">
          ${r.link_dokumen_url ? `<a href="${escapeAttr(r.link_dokumen_url)}" target="_blank" class="text-primary hover:underline text-xs font-bold"><span class="material-symbols-outlined text-[18px]">attachment</span></a>` : '-'}
        </td>
        <td class="p-3 text-center">
          <button onclick="deleteNewsItem('${r.id_pengumuman}')" title="Hapus Berita" class="text-rose-600 hover:text-rose-800 font-bold text-xs p-1">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

async function handleSaveNewsAdmin(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSubmitNewsAdmin');
  btn.disabled = true;
  btn.innerHTML = `<span class="inline-block animate-spin mr-2">⏳</span> Menyimpan...`;

  const payload = {
    judul: document.getElementById('admNewsJudul').value.trim(),
    kategori: document.getElementById('admNewsKategori').value,
    tgl_terbit: document.getElementById('admNewsTgl').value,
    isi_ringkas: document.getElementById('admNewsIsi').value.trim(),
    foto_url: document.getElementById('admNewsFoto').value.trim(),
    link_dokumen_url: document.getElementById('admNewsDoc').value.trim(),
    status_tampil: 'PUBLISH'
  };

  const res = await callGasApi('saveNews', payload, true);
  btn.disabled = false;
  btn.innerHTML = `Publikasikan Berita`;

  if (res && res.success) {
    alert("✅ Warta Edukasi berhasil diterbitkan!");
    document.getElementById('formAddNews').reset();
    closeModal('modalAddNews');
    loadNews();
  } else {
    alert("Gagal menerbitkan warta: " + ((res && res.message) ? res.message : "Terjadi kesalahan"));
  }
}

async function deleteNewsItem(id) {
  if (!confirm("Apakah Anda yakin ingin menghapus warta edukasi ini?")) return;
  const res = await callGasApi('deleteNews', { id }, true);
  if (res && res.success) {
    alert("Berita berhasil dihapus.");
    loadNews();
  } else {
    alert("Gagal menghapus: " + res.message);
  }
}

/**
 * String Escaping Helpers
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
