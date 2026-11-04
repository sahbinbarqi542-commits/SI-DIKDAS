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

let publicSarprasSearchResults = [];

/**
 * 3B. CEK STATUS & VERIFIKASI USULAN SARPRAS (PUBLIK & SEKOLAH)
 */
async function handleSarprasCheck(e) {
  e.preventDefault();
  const query = document.getElementById('sarprasQueryInput').value.trim();
  const btn = document.getElementById('btnSubmitSarprasCheck');
  const resBox = document.getElementById('sarprasCheckResultBox');
  const countSpan = document.getElementById('sarprasResCount');
  const listContainer = document.getElementById('sarprasResContentList');

  if (!query) return;

  btn.disabled = true;
  btn.innerHTML = `<span class="inline-block animate-spin mr-1">⏳</span> Memeriksa...`;

  const res = await callGasApi('checkSarpras', { query });
  btn.disabled = false;
  btn.innerHTML = `<span class="material-symbols-outlined text-[20px]">fact_check</span><span>Cek Status Verifikasi</span>`;

  resBox.classList.remove('hidden');

  if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
    publicSarprasSearchResults = res.data;
    countSpan.innerText = `${res.data.length} Usulan Terdata`;
    countSpan.className = "text-xs bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-3 py-0.5 rounded-full font-bold";

    let html = '';
    res.data.forEach(item => {
      let statusBadge = '';
      if (item.status_usulan === 'Rekomendasi DAK Fisik 2027') {
        statusBadge = `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-xs font-bold"><span class="material-symbols-outlined text-[15px]">verified</span> Rekomendasi DAK Fisik 2027</span>`;
      } else if (item.status_usulan === 'Prioritas APBD Perubahan') {
        statusBadge = `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sky-500/30 text-sky-200 border border-sky-400/40 text-xs font-bold"><span class="material-symbols-outlined text-[15px]">bookmark</span> Prioritas APBD Perubahan</span>`;
      } else if (item.status_usulan === 'Selesai Direhab') {
        statusBadge = `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/40 text-xs font-bold"><span class="material-symbols-outlined text-[15px]">check_circle</span> Selesai Direhab</span>`;
      } else if (item.status_usulan === 'Ditolak / Belum Memenuhi Kriteria') {
        statusBadge = `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-500/30 text-rose-200 border border-rose-400/40 text-xs font-bold"><span class="material-symbols-outlined text-[15px]">cancel</span> Belum Memenuhi Kriteria</span>`;
      } else {
        statusBadge = `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/40 text-xs font-bold"><span class="material-symbols-outlined text-[15px]">hourglass_top</span> Menunggu Verifikasi Lapangan</span>`;
      }

      html += `
        <div class="bg-white/10 rounded-2xl p-5 border border-white/20 text-white space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/15 pb-3">
            <div>
              <div class="text-base font-extrabold text-white">${item.nama_sekolah || '-'}</div>
              <div class="text-xs text-amber-200">NPSN: ${item.npsn || '-'} • Kec. ${item.kecamatan || '-'} • No. Usulan: <b>${item.id_sarpras || '-'}</b></div>
            </div>
            <div>${statusBadge}</div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div class="bg-black/20 p-3 rounded-xl border border-white/10">
              <span class="text-amber-200/80 block text-[11px] mb-0.5">Fasilitas & Kondisi:</span>
              <span class="font-bold text-white text-sm">${item.jenis_fasilitas || '-'} (${item.jumlah_unit || 1} Unit)</span>
              <div class="text-xs font-semibold ${item.kondisi === 'Rusak Berat' ? 'text-rose-300' : 'text-amber-300'} mt-0.5">${item.kondisi || 'Rusak Sedang'}</div>
            </div>
            <div class="bg-black/20 p-3 rounded-xl border border-white/10">
              <span class="text-amber-200/80 block text-[11px] mb-0.5">Estimasi Kebutuhan RAB:</span>
              <span class="font-extrabold text-white text-sm">Rp ${Number(item.estimasi_biaya || 0).toLocaleString('id-ID')}</span>
              <div class="text-[11px] text-white/70 mt-0.5">Tgl: ${item.tgl_pendataan || '-'}</div>
            </div>
            <div class="bg-black/20 p-3 rounded-xl border border-white/10">
              <span class="text-amber-200/80 block text-[11px] mb-0.5">Uraian Kebutuhan:</span>
              <span class="font-medium text-white/90 line-clamp-2">${item.kebutuhan_penanganan || 'Perbaikan / Rehabilitasi Sarpras'}</span>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div>
              ${item.foto_sarpras_url ? `<a href="${item.foto_sarpras_url}" target="_blank" class="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-white underline"><span class="material-symbols-outlined text-[16px]">photo_camera</span><span>Lihat Lampiran Foto Kerusakan</span></a>` : ''}
            </div>
            <button type="button" onclick="printPublicSarprasSlip('${item.id_sarpras}')" class="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 border border-white/30 transition-all shadow-sm active:scale-95">
              <span class="material-symbols-outlined text-[16px]">print</span>
              <span>Cetak Berita Acara / Surat Verifikasi</span>
            </button>
          </div>
        </div>
      `;
    });
    listContainer.innerHTML = html;
  } else {
    countSpan.innerText = "0 Usulan";
    countSpan.className = "text-xs bg-rose-500/30 text-rose-200 border border-rose-400/30 px-3 py-0.5 rounded-full font-bold";
    listContainer.innerHTML = `
      <div class="p-6 text-center bg-black/20 rounded-2xl border border-white/10 text-white">
        <span class="material-symbols-outlined text-4xl text-amber-300 mb-2">search_off</span>
        <p class="font-bold text-sm">Usulan Sarpras Tidak Ditemukan</p>
        <p class="text-xs text-amber-200/80 mt-1 max-w-md mx-auto">
          Belum ada rekam data usulan sarpras dengan nomor registrasi atau NPSN "${query}". Pastikan NPSN sudah sesuai atau ajukan usulan baru di bawah.
        </p>
        <button type="button" onclick="openModal('modalSarprasPublic')" class="mt-4 px-5 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-md">
          <span class="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Ajukan Usulan Kerusakan Sekolah Sekarang</span>
        </button>
      </div>
    `;
  }
}

function printPublicSarprasSlip(id) {
  const item = publicSarprasSearchResults.find(x => String(x.id_sarpras) === String(id)) || sarprasCache.find(x => String(x.id_sarpras) === String(id));
  if (!item) return alert("Data usulan tidak ditemukan.");
  previewSarprasVerifikasiSlip(id, item);
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

// Sarpras Admin CRUD, Verifikasi, & Manual Input
let currentSarprasFilter = 'all';

function updatePendingSarprasBadge() {
  const pendingCount = sarprasCache.filter(r => (r.status_usulan || '').trim() === 'Menunggu Verifikasi').length;
  const badge = document.getElementById('badgePendingSarprasCount');
  if (badge) {
    badge.innerText = pendingCount;
    if (pendingCount > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

async function loadAdminSarpras() {
  const tbody = document.getElementById('tbodyAdminSarpras');
  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-slate-500">Memuat data Sarpras...</td></tr>`;

  const res = await callGasApi('getSarpras', { token: currentAdminToken });
  sarprasCache = (res && res.success && Array.isArray(res.data)) ? res.data : [];

  updatePendingSarprasBadge();
  renderSarprasTableData(currentSarprasFilter);
}

function renderSarprasTableData(filterStatus = 'all') {
  const tbody = document.getElementById('tbodyAdminSarpras');
  if (!tbody) return;

  const displayList = filterStatus === 'all'
    ? sarprasCache
    : sarprasCache.filter(r => (r.status_usulan || '').trim() === filterStatus);

  if (displayList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-slate-400">
          <span class="material-symbols-outlined text-4xl block text-slate-300 mb-2">folder_open</span>
          <p class="font-bold text-slate-600">${filterStatus === 'all' ? 'Belum ada data usulan / kondisi sarpras.' : 'Tidak ada usulan dengan status "' + filterStatus + '".'}</p>
          <p class="text-xs text-slate-400 mt-1">Silakan klik tombol <b>+ Input Sarpras Manual</b> di atas untuk menambahkan data.</p>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  displayList.forEach((r, idx) => {
    html += `
      <tr class="border-b hover:bg-slate-50">
        <td class="p-3 font-semibold text-center">${idx + 1}</td>
        <td class="p-3">
          <div class="font-bold">${r.nama_sekolah || '-'}</div>
          <div class="text-xs text-slate-400">NPSN: ${r.npsn || '-'} - Kec. ${r.kecamatan || '-'}</div>
        </td>
        <td class="p-3 font-medium">${r.jenis_fasilitas || '-'}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded-full text-xs font-bold ${r.kondisi === 'Rusak Berat' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">${r.kondisi || 'Baik'}</span></td>
        <td class="p-3 font-bold">Rp ${Number(r.estimasi_biaya || 0).toLocaleString('id-ID')}</td>
        <td class="p-3">
          <select onchange="updateSarprasStatusAction('${r.id_sarpras}', this.value)" class="text-xs font-semibold p-1.5 border rounded-lg bg-white">
            <option value="Menunggu Verifikasi" ${r.status_usulan === 'Menunggu Verifikasi' ? 'selected' : ''}>Menunggu Verifikasi</option>
            <option value="Rekomendasi DAK Fisik 2027" ${r.status_usulan === 'Rekomendasi DAK Fisik 2027' ? 'selected' : ''}>DAK Fisik 2027</option>
            <option value="Prioritas APBD Perubahan" ${r.status_usulan === 'Prioritas APBD Perubahan' ? 'selected' : ''}>APBD Perubahan</option>
            <option value="Perbaikan Swakelola Sekolah (BOSP)" ${r.status_usulan === 'Perbaikan Swakelola Sekolah (BOSP)' ? 'selected' : ''}>Swakelola BOSP</option>
            <option value="Ditolak / Belum Memenuhi Kriteria" ${r.status_usulan === 'Ditolak / Belum Memenuhi Kriteria' ? 'selected' : ''}>Ditolak</option>
            <option value="Selesai Direhab" ${r.status_usulan === 'Selesai Direhab' ? 'selected' : ''}>Selesai</option>
          </select>
        </td>
        <td class="p-3 text-center">
          ${r.foto_sarpras_url ? `<a href="${r.foto_sarpras_url}" target="_blank" class="text-primary hover:underline text-xs"><span class="material-symbols-outlined text-[18px]">photo_camera</span></a>` : '-'}
        </td>
        <td class="p-3 text-center">
          <div class="flex items-center justify-center gap-1">
            <button onclick="openModalVerifikasiSarpras('${r.id_sarpras}')" title="Menu Verifikasi & Rekomendasi" class="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs shadow-sm inline-flex items-center gap-1 active:scale-95 transition-all">
              <span class="material-symbols-outlined text-[14px]">domain_verification</span>
              <span>Verifikasi</span>
            </button>
            <button onclick="previewSarprasVerifikasiSlip('${r.id_sarpras}')" title="Cetak Berita Acara" class="p-1 text-slate-500 hover:text-primary rounded-lg hover:bg-slate-100">
              <span class="material-symbols-outlined text-[18px]">print</span>
            </button>
            <button onclick="deleteSarprasItem('${r.id_sarpras}')" title="Hapus Data Sarpras" class="p-1 text-rose-600 hover:text-rose-800 rounded-lg hover:bg-rose-50 font-bold text-xs">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function filterSarprasByStatus(status) {
  currentSarprasFilter = status;
  renderSarprasTableData(status);

  const btnAll = document.getElementById('btnFilterSarprasAll');
  const btnPending = document.getElementById('btnFilterSarprasPending');
  if (status === 'all') {
    if (btnAll) btnAll.className = "px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold shadow-sm";
    if (btnPending) btnPending.className = "px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold border border-amber-300 shadow-sm flex items-center gap-1";
  } else {
    if (btnAll) btnAll.className = "px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 shadow-sm";
    if (btnPending) btnPending.className = "px-3 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1 ring-2 ring-amber-400";
  }
}

function openModalVerifikasiSarpras(id) {
  const item = sarprasCache.find(x => String(x.id_sarpras) === String(id));
  if (!item) return alert("Data sarpras tidak ditemukan.");

  document.getElementById('verifSarprasId').value = item.id_sarpras;
  document.getElementById('verifIdNpsn').innerText = `${item.id_sarpras || '-'} / NPSN: ${item.npsn || '-'}`;
  document.getElementById('verifNamaSekolah').innerText = item.nama_sekolah || '-';
  document.getElementById('verifKecamatan').innerText = `Kecamatan ${item.kecamatan || '-'}`;
  document.getElementById('verifFasilitasKondisi').innerText = `${item.jenis_fasilitas || '-'} (${item.jumlah_unit || 1} Unit) - Kondisi: ${item.kondisi || 'Rusak'}`;
  document.getElementById('verifPenanganan').innerText = item.kebutuhan_penanganan || 'Rehabilitasi Fasilitas';
  document.getElementById('verifRab').innerText = `Rp ${Number(item.estimasi_biaya || 0).toLocaleString('id-ID')}`;

  const fotoContainer = document.getElementById('verifFotoContainer');
  const fotoLink = document.getElementById('verifFotoLink');
  if (item.foto_sarpras_url) {
    fotoLink.href = item.foto_sarpras_url;
    fotoContainer.classList.remove('hidden');
  } else {
    fotoContainer.classList.add('hidden');
  }

  document.getElementById('verifStatusDecision').value = item.status_usulan || 'Menunggu Verifikasi';
  document.getElementById('modalVerifikasiSarpras').classList.remove('hidden');
}

async function handleSaveVerifikasiDecision(e) {
  e.preventDefault();
  const id = document.getElementById('verifSarprasId').value;
  const status = document.getElementById('verifStatusDecision').value;
  const btn = document.getElementById('btnSaveVerifDecision');

  btn.disabled = true;
  btn.innerHTML = `<span class="inline-block animate-spin mr-1">â³</span> Menyimpan...`;

  const res = await callGasApi('updateSarprasStatus', { id, status }, true);
  btn.disabled = false;
  btn.innerHTML = `<span class="material-symbols-outlined text-[18px]">check_circle</span><span>Simpan Hasil Verifikasi</span>`;

  if (res.success) {
    const item = sarprasCache.find(x => String(x.id_sarpras) === String(id));
    if (item) item.status_usulan = status;
    renderSarprasTableData(currentSarprasFilter);
    updatePendingSarprasBadge();
    loadDashboardAnalytics();
    closeModal('modalVerifikasiSarpras');
    alert(`Verifikasi berhasil disimpan!\nStatus usulan kini menjadi: ${status}`);
  } else {
    alert("Gagal menyimpan verifikasi: " + res.message);
  }
}

function previewCurrentVerifikasiSlip() {
  const id = document.getElementById('verifSarprasId').value;
  if (!id) return;
  previewSarprasVerifikasiSlip(id);
}

function previewSarprasVerifikasiSlip(id, directItem = null) {
  const item = directItem || sarprasCache.find(x => String(x.id_sarpras) === String(id));
  if (!item) return alert("Data sarpras tidak ditemukan.");

  const contentHtml = `
    <div style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="font-size: 13pt; font-weight: bold; margin: 0; text-decoration: underline;">BERITA ACARA VERIFIKASI KELAYAKAN SARANA &amp; PRASARANA</h3>
        <p style="margin: 4px 0 0 0; font-size: 10pt; color: #475569;">Nomor Registrasi: <b>${item.id_sarpras || '-'}</b></p>
      </div>

      <p style="margin-bottom: 12px; text-align: justify;">
        Pada hari ini, Tim Teknis Verifikasi Seksi Kelembagaan dan Sarana Prasarana Bidang Pembinaan Pendidikan Dasar Dinas Pendidikan dan Kebudayaan Kabupaten Konawe Utara telah melakukan verifikasi dokumen dan validasi kelayakan usulan fisik sekolah dengan rincian data sebagai berikut:
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10pt;">
        <tr>
          <td style="width: 32%; padding: 7px; border: 1px solid #cbd5e1; font-weight: bold; background: #f8fafc;">Nama Satuan Pendidikan</td>
          <td style="width: 68%; padding: 7px; border: 1px solid #cbd5e1;"><b>${item.nama_sekolah || '-'}</b></td>
        </tr>
        <tr>
          <td style="padding: 7px; border: 1px solid #cbd5e1; font-weight: bold; background: #f8fafc;">NPSN / Wilayah Kecamatan</td>
          <td style="padding: 7px; border: 1px solid #cbd5e1;">NPSN: ${item.npsn || '-'} â€¢ Kecamatan ${item.kecamatan || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 7px; border: 1px solid #cbd5e1; font-weight: bold; background: #f8fafc;">Jenis Objek &amp; Volume</td>
          <td style="padding: 7px; border: 1px solid #cbd5e1;">${item.jenis_fasilitas || '-'} (Sebanyak ${item.jumlah_unit || 1} Unit)</td>
        </tr>
        <tr>
          <td style="padding: 7px; border: 1px solid #cbd5e1; font-weight: bold; background: #f8fafc;">Tingkat Kerusakan Lapangan</td>
          <td style="padding: 7px; border: 1px solid #cbd5e1; font-weight: bold; color: ${item.kondisi === 'Rusak Berat' ? '#b91c1c' : '#d97706'};">${item.kondisi || 'Rusak Sedang'}</td>
        </tr>
        <tr>
          <td style="padding: 7px; border: 1px solid #cbd5e1; font-weight: bold; background: #f8fafc;">Uraian Rencana Penanganan</td>
          <td style="padding: 7px; border: 1px solid #cbd5e1;">${item.kebutuhan_penanganan || 'Rehabilitasi ruang kelas / sarana penunjang'}</td>
        </tr>
        <tr>
          <td style="padding: 7px; border: 1px solid #cbd5e1; font-weight: bold; background: #f8fafc;">Estimasi Kebutuhan RAB</td>
          <td style="padding: 7px; border: 1px solid #cbd5e1; font-weight: bold; color: #0f172a;">Rp ${Number(item.estimasi_biaya || 0).toLocaleString('id-ID')}</td>
        </tr>
        <tr>
          <td style="padding: 7px; border: 1px solid #cbd5e1; font-weight: bold; background: #f8fafc;">Status Keputusan Verifikasi</td>
          <td style="padding: 7px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 11pt; color: #0284c7;">
            â­ ${item.status_usulan || 'Menunggu Verifikasi'}
          </td>
        </tr>
      </table>

      <div style="background: #f1f5f9; padding: 12px; border-left: 4px solid #0284c7; border-radius: 6px; margin-bottom: 24px; font-size: 10pt;">
        <b>Catatan Resmi Tim Verifikator Disdikbud Konawe Utara:</b>
        <p style="margin: 4px 0 0 0; color: #334155;">
          Usulan telah diperiksa kesesuaiannya dengan Data Pokok Pendidikan (Dapodik) dan pertimbangan kelayakan teknis prasarana dasar. Rekomendasi di atas menjadi dasar acuan penyusunan Rencana Kerja Pemerintah Daerah (RKPD) dan usulan Dana Alokasi Khusus (DAK) Fisik Pendidikan.
        </p>
      </div>
    </div>
  `;

  openPdfModal("BERITA ACARA VERIFIKASI SARANA &amp; PRASARANA", "DISDIKBUD KABUPATEN KONAWE UTARA - BIDANG PENDIDIKAN DASAR", contentHtml);
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
  if (res.success) {
    loadDashboardAnalytics();
  } else {
    alert("Gagal update status: " + res.message);
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
    loadAdminBosp();
    loadAdminPip();
    loadAdminSarpras();
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

    renderAdminCharts(d);
  }
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
