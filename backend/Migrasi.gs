/**
 * ============================================================================
 * SI-DIKDAS KONAWE UTARA - MODUL MIGRASI & SINKRONISASI DATABASE
 * (gas-migrasi-database Pattern)
 * ============================================================================
 * Fitur:
 * - Migrasi aman antar-spreadsheet tanpa menyentuh/mengubah spreadsheet lama
 * - Pembacaan batch berbasis nama kolom (header)
 * - Operasi upsert idempoten (bebas duplikasi data)
 * - Mode Dry-Run (simulasi pindai sebelum tulis nyata)
 * ============================================================================
 */

function openSourceSpreadsheet(idOrUrl) {
  const m = String(idOrUrl).match(/\/d\/([A-Za-z0-9_-]{20,})/);
  const id = m ? m[1] : String(idOrUrl).trim();
  const currentId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

  if (id === currentId) {
    throw new Error('Spreadsheet yang dimasukkan adalah spreadsheet aplikasi baru. Masukkan ID/URL spreadsheet LAMA.');
  }

  try {
    return SpreadsheetApp.openById(id);
  } catch (e) {
    throw new Error('Spreadsheet lama tidak dapat dibuka. Pastikan ID benar dan berada di akun Google yang sama.');
  }
}

function readSourceSheet(ss, sheetName) {
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return [];
  const v = sh.getDataRange().getValues();
  if (v.length <= 1) return [];

  const headers = v[0].map(h => String(h).trim());
  return v.slice(1).filter(r => r.join('') !== '').map(r => {
    const o = {};
    headers.forEach((k, i) => { if (k) o[k] = r[i]; });
    return o;
  });
}

/**
 * Eksekusi rencana migrasi data secara batch & idempoten
 */
function executeMigrationPlan(plan, dryRun) {
  const ssTarget = getDb();
  const sh = ssTarget.getSheetByName(plan.targetSheet);
  if (!sh) throw new Error("Sheet target " + plan.targetSheet + " tidak ditemukan.");

  const values = sh.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim());
  const index = {};

  for (let r = 1; r < values.length; r++) {
    const o = {};
    headers.forEach((k, i) => o[k] = values[r][i]);
    const k = plan.keyFn(o);
    if (k) index[k] = r;
  }

  const res = { inserted: 0, updated: 0, skipped: 0 };
  const newRows = [];
  const seen = {};

  plan.rows.forEach(src => {
    const k = plan.keyFn(src);
    if (!k || seen[k]) { res.skipped++; return; }
    seen[k] = true;

    if (index[k] !== undefined) {
      const row = values[index[k]];
      let changed = false;
      (plan.updatableFields || []).forEach(f => {
        const i = headers.indexOf(f);
        if (i === -1 || src[f] === undefined || src[f] === '') return;
        const v = src[f];
        if (String(row[i]) !== String(v)) {
          row[i] = v;
          changed = true;
        }
      });
      changed ? res.updated++ : res.skipped++;
    } else {
      const newRow = headers.map(f => {
        if (f === 'id_bosp' && !src[f]) return 'BOSP-MIG-' + Utilities.getUuid().slice(0, 8);
        if (f === 'id_sarpras' && !src[f]) return 'SAR-MIG-' + Utilities.getUuid().slice(0, 8);
        if (f === 'id_pip' && !src[f]) return 'PIP-MIG-' + Utilities.getUuid().slice(0, 8);
        return src[f] !== undefined ? src[f] : '';
      });
      newRows.push(newRow);
      res.inserted++;
    }
  });

  if (!dryRun && (res.updated > 0 || newRows.length > 0)) {
    const all = values.concat(newRows);
    sh.getRange(1, 1, all.length, headers.length).setValues(all);
    bump(plan.targetSheet);
  }

  return res;
}

/**
 * Helper Migrasi Semua Data dari Spreadsheet Lama
 * @param {string} oldSpreadsheetIdOrUrl
 * @param {boolean} dryRun - jika true hanya simulasi
 */
function migrasiDatabaseDariLama(oldSpreadsheetIdOrUrl, dryRun) {
  Logger.log("🔄 Memulai migrasi data dari spreadsheet lama (DryRun: " + dryRun + ")...");
  const ssOld = openSourceSpreadsheet(oldSpreadsheetIdOrUrl);
  const report = {};

  // 1. Migrasi BOSP
  const bospOldRows = readSourceSheet(ssOld, 'TB_BOSP') || readSourceSheet(ssOld, 'BOSP');
  if (bospOldRows.length > 0) {
    report.BOSP = executeMigrationPlan({
      targetSheet: 'TB_BOSP',
      rows: bospOldRows,
      keyFn: o => String(o.npsn || o.NPSN || '').trim() + '_' + String(o.tahun || o.Tahun || '').trim(),
      updatableFields: ['alokasi_dana', 'status_salur', 'catatan_spj', 'url_dokumen_spj']
    }, dryRun);
  }

  // 2. Migrasi PIP
  const pipOldRows = readSourceSheet(ssOld, 'TB_PIP') || readSourceSheet(ssOld, 'PIP');
  if (pipOldRows.length > 0) {
    report.PIP = executeMigrationPlan({
      targetSheet: 'TB_PIP',
      rows: pipOldRows,
      keyFn: o => String(o.nisn || o.NISN || '').trim(),
      updatableFields: ['status_pencairan', 'nominal_bantuan', 'keterangan']
    }, dryRun);
  }

  // 3. Migrasi Sarpras
  const sarprasOldRows = readSourceSheet(ssOld, 'TB_Sarpras') || readSourceSheet(ssOld, 'Sarpras');
  if (sarprasOldRows.length > 0) {
    report.Sarpras = executeMigrationPlan({
      targetSheet: 'TB_Sarpras',
      rows: sarprasOldRows,
      keyFn: o => String(o.id_sarpras || o.id || o.npsn || '').trim(),
      updatableFields: ['kondisi', 'status_usulan', 'estimasi_biaya', 'kebutuhan_penanganan']
    }, dryRun);
  }

  Logger.log("✅ Laporan Hasil Migrasi: " + JSON.stringify(report));
  return report;
}
