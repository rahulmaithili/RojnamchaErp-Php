/**
 * SHIV SHAKTI HP GAS - DATA & BACKUP MANAGEMENT CENTER
 * Complete Data Management Suite (100% English Interface):
 * 1. DATA EXPORT: Physical SQLite (.sqlite) & Portable Full JSON (.json)
 * 2. DATA IMPORT: JSON File Restore (Full Replace or Merge) & Physical SQLite Restore
 * 3. DATA RESET: Operational Transactions Reset (Fresh Year / Go-Live) & Complete Factory Reset
 * 4. BACKUP AUDIT: Physical Storage Snapshot Register
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { utils } from '../utils.js';
import { auth } from '../auth.js';

export const archiveModule = {
  async init() {
    this.renderContainer();
    await this.loadArchiveHistory();
  },

  renderContainer() {
    const root = document.getElementById('view-archive');
    if (!root) return;

    const isAdmin = auth.getCurrentUser()?.role === 'ADMIN';

    root.innerHTML = `
      <!-- Header -->
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);"><i class="fa-solid fa-database" style="color:var(--brand); margin-right:8px;"></i> Data & Backup Management Center</h2>
            <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Complete database backup, exports, imports, and system reset (Full Disaster Recovery & Data Portability)</p>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button id="btn-quick-backup" class="btn btn-primary btn-sm" ${!isAdmin ? 'disabled' : ''}>
              <i class="fa-solid fa-shield-halved"></i> Quick Safety Backup
            </button>
            <button id="btn-download-db-top" class="btn btn-outline btn-sm" ${!isAdmin ? 'disabled' : ''}>
              <i class="fa-solid fa-download"></i> Download .sqlite DB
            </button>
          </div>
        </div>
      </div>

      <!-- Main 3-Column Operation Grid -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:20px; margin-bottom:20px;">
        
        <!-- CARD 1: DATA EXPORT -->
        <div class="card" style="border-top:4px solid #2563eb; display:flex; flex-direction:column;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
            <div style="width:40px; height:40px; border-radius:8px; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fa-solid fa-file-export"></i>
            </div>
            <div>
              <h3 style="font-size:16px; font-weight:800; margin:0; color:var(--text-main);">DATA EXPORT</h3>
              <p style="font-size:11.5px; color:var(--text-muted); margin:0;">Download Complete System Backup</p>
            </div>
          </div>
          <p style="font-size:12.5px; color:var(--text-muted); line-height:1.45; margin-bottom:14px;">
            Export and download a complete archive of all 22 system tables including Bills, Cashbook, Customers, Items, Hawkers, Stock, and KYC Documents.
          </p>

          <div style="display:flex; flex-direction:column; gap:10px; margin-top:auto;">
            <button id="btn-export-json" class="btn btn-primary" style="justify-content:center;">
              <i class="fa-solid fa-file-code"></i> Export Full JSON Backup (.json)
            </button>
            <button id="btn-export-sqlite" class="btn btn-secondary" style="justify-content:center;">
              <i class="fa-solid fa-database"></i> Download Active Database (.sqlite)
            </button>
          </div>
        </div>

        <!-- CARD 2: DATA IMPORT & RESTORE -->
        <div class="card" style="border-top:4px solid #16a34a; display:flex; flex-direction:column;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
            <div style="width:40px; height:40px; border-radius:8px; background:#f0fdf4; color:#16a34a; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fa-solid fa-file-import"></i>
            </div>
            <div>
              <h3 style="font-size:16px; font-weight:800; margin:0; color:var(--text-main);">DATA IMPORT & RESTORE</h3>
              <p style="font-size:11.5px; color:var(--text-muted); margin:0;">Restore from Backup File</p>
            </div>
          </div>
          <p style="font-size:12.5px; color:var(--text-muted); line-height:1.45; margin-bottom:14px;">
            Safely restore system data from a previously downloaded backup file. An automated safeguard backup is created before restoration.
          </p>

          <div style="display:flex; flex-direction:column; gap:10px; margin-top:auto;">
            <button id="btn-import-json-modal" class="btn btn-success" style="background:#16a34a; border-color:#16a34a; color:#fff; justify-content:center;" ${!isAdmin ? 'disabled' : ''}>
              <i class="fa-solid fa-upload"></i> Restore from JSON Backup
            </button>
            <button id="btn-restore-sqlite-modal" class="btn btn-outline" style="justify-content:center;" ${!isAdmin ? 'disabled' : ''}>
              <i class="fa-solid fa-hard-drive"></i> Upload & Replace .sqlite File
            </button>
          </div>
        </div>

        <!-- CARD 3: DATA RESET -->
        <div class="card" style="border-top:4px solid #ef4444; display:flex; flex-direction:column;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
            <div style="width:40px; height:40px; border-radius:8px; background:#fef2f2; color:#ef4444; display:flex; align-items:center; justify-content:center; font-size:18px;">
              <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <h3 style="font-size:16px; font-weight:800; margin:0; color:#b91c1c;">DATA RESET</h3>
              <p style="font-size:11.5px; color:var(--text-muted); margin:0;">Operational Wipe & Clean Start</p>
            </div>
          </div>
          <p style="font-size:12.5px; color:var(--text-muted); line-height:1.45; margin-bottom:14px;">
            Clear operational records for a fresh financial session or reset the ERP system to clean factory default installation.
          </p>

          <div style="display:flex; flex-direction:column; gap:10px; margin-top:auto;">
            <button id="btn-reset-trans-modal" class="btn btn-warning" style="justify-content:center;" ${!isAdmin ? 'disabled' : ''}>
              <i class="fa-solid fa-eraser"></i> Clear Transactions Only (Fresh Start)
            </button>
            <button id="btn-reset-factory-modal" class="btn btn-danger" style="justify-content:center;" ${!isAdmin ? 'disabled' : ''}>
              <i class="fa-solid fa-trash-can"></i> Complete Factory Reset
            </button>
          </div>
        </div>

      </div>

      <!-- Backup History Table -->
      <div class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div class="card-title"><i class="fa-solid fa-clock-rotate-left"></i> Physical Backup History & Storage Snapshots</div>
          <button id="arc-refresh-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-arrows-rotate"></i> Refresh</button>
        </div>

        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Backup File Name</th>
                <th>Snapshot Type</th>
                <th>Snapshot Date</th>
                <th>File Size</th>
                <th>Triggered By</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody id="arc-table-body">
              <tr><td colspan="6" class="text-center" style="padding:24px; color:var(--text-muted);">Loading backup history...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    // Quick Safety Backup
    document.getElementById('btn-quick-backup')?.addEventListener('click', () => this.triggerBackup());

    // Top Download DB
    document.getElementById('btn-download-db-top')?.addEventListener('click', () => this.downloadActiveSqlite());

    // Card 1: Export JSON
    document.getElementById('btn-export-json')?.addEventListener('click', () => this.exportJsonBackup());

    // Card 1: Download SQLite
    document.getElementById('btn-export-sqlite')?.addEventListener('click', () => this.downloadActiveSqlite());

    // Card 2: Import JSON Modal
    document.getElementById('btn-import-json-modal')?.addEventListener('click', () => this.openImportJsonModal());

    // Card 2: Restore SQLite Modal
    document.getElementById('btn-restore-sqlite-modal')?.addEventListener('click', () => this.openRestoreSqliteModal());

    // Card 3: Reset Transactions
    document.getElementById('btn-reset-trans-modal')?.addEventListener('click', () => this.openResetModal('transactions_only'));

    // Card 3: Factory Reset
    document.getElementById('btn-reset-factory-modal')?.addEventListener('click', () => this.openResetModal('factory_reset'));

    // Refresh history
    document.getElementById('arc-refresh-btn')?.addEventListener('click', () => this.loadArchiveHistory());
  },

  async loadArchiveHistory() {
    const res = await api('getArchiveHistory', {}, { loader: false });
    const tbody = document.getElementById('arc-table-body');
    if (!tbody) return;

    if (!res.ok || !res.data || !res.data.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:24px; color:var(--text-muted);">No backup records created yet. Click "Quick Safety Backup" to generate one.</td></tr>';
      return;
    }

    tbody.innerHTML = res.data.map(a => `
      <tr>
        <td><strong>${utils.escapeHtml(a.FileName)}</strong></td>
        <td><span class="badge ${a.FileType === 'SAFEGUARD_SNAPSHOT' ? 'badge-warning' : 'badge-info'}">${a.FileType}</span></td>
        <td>${utils.formatDate(a.Date)}</td>
        <td class="num-font">${Math.round((a.FileSize || 0) / 1024)} KB</td>
        <td>${utils.escapeHtml(a.CreatedByName || 'Admin')}</td>
        <td><span class="num-font" style="font-size:12px;">${a.CreatedAt}</span></td>
      </tr>
    `).join('');
  },

  async triggerBackup() {
    const confirmed = await ui.confirm('Create a physical backup snapshot of the database now?', 'Create Backup');
    if (!confirmed) return;

    const res = await api('backupDatabase', {}, { loaderMessage: 'Generating backup...' });
    if (res.ok && res.data) {
      ui.success(`Backup copy ${res.data.FileName} saved.`);
      this.loadArchiveHistory();
    }
  },

  async downloadActiveSqlite() {
    const res = await api('downloadDatabase', {}, { loaderMessage: 'Preparing database download...' });
    if (!res.ok || !res.data) {
      ui.error('Failed to prepare database download.', 'Download Error');
      return;
    }

    const { fileName, fileData } = res.data;
    const a = document.createElement('a');
    a.href = fileData;
    a.download = fileName || 'Shiv_Shakti_Database.sqlite';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    ui.success(`Physical database (${fileName}) downloaded successfully!`);
    this.loadArchiveHistory();
  },

  async exportJsonBackup() {
    const res = await api('exportDataJson', {}, { loaderMessage: 'Exporting complete system data...' });
    if (!res.ok || !res.data) {
      ui.error('Failed to compile JSON backup.', 'Export Error');
      return;
    }

    const { fileName, jsonContent } = res.data;
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'Shiv_Shakti_Full_Backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ui.success(`Universal JSON backup (${fileName}) successfully downloaded!`);
    this.loadArchiveHistory();
  },

  async openImportJsonModal() {
    const html = `
      <div style="display:flex; flex-direction:column; gap:12px; text-align:left;">
        <div class="modal-section-card" style="background:#f0fdf4; border:1px solid #bbf7d0;">
          <div style="font-size:12.5px; color:#15803d; line-height:1.45;">
            <strong><i class="fa-solid fa-shield-halved"></i> Safety Guarantee:</strong> An automated backup of your current database will be saved before initiating restoration.
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-weight:700;"><i class="fa-solid fa-file-code"></i> Select JSON Backup File (.json) *</label>
          <input type="file" id="import-json-file" class="form-control" accept=".json,application/json" style="padding:6px 10px;">
        </div>

        <div class="form-group">
          <label class="form-label" style="font-weight:700;"><i class="fa-solid fa-sliders"></i> Import Restoration Mode</label>
          <select id="import-json-mode" class="form-select">
            <option value="replace" selected>Full Replace & Overwrite (Erase current data and replace with backup)</option>
            <option value="merge">Merge & Append (Add new records without deleting existing data)</option>
          </select>
        </div>

        <div id="import-json-summary" style="display:none; padding:10px; background:#f8fafc; border-radius:6px; border:1px dashed #cbd5e1; font-size:12px;"></div>
      </div>
    `;

    let selectedBackup = null;

    const result = await ui.formModal(html, 'Restore Database from JSON Backup', async () => {
      if (!selectedBackup || !selectedBackup.tables) {
        Swal.showValidationMessage('Please select a valid ERP JSON backup file!');
        return false;
      }
      return {
        tables: selectedBackup.tables,
        mode: document.getElementById('import-json-mode').value
      };
    }, {
      icon: 'fa-file-import',
      onRender: () => {
        const fileInput = document.getElementById('import-json-file');
        const summaryBox = document.getElementById('import-json-summary');

        fileInput?.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (re) => {
            try {
              const parsed = JSON.parse(re.target.result);
              if (!parsed.tables || typeof parsed.tables !== 'object') {
                throw new Error('Not a valid Shiv Shakti ERP backup structure');
              }
              selectedBackup = parsed;
              const tableNames = Object.keys(parsed.tables).join(', ');
              summaryBox.style.display = 'block';
              summaryBox.innerHTML = `
                <div style="font-weight:700; color:#0f172a; margin-bottom:4px;">Verified Backup File:</div>
                <div>Exported At: <strong>${parsed.exportedAt || 'Unknown'}</strong></div>
                <div>Tables included: <span style="font-family:monospace; color:#2563eb;">${tableNames}</span></div>
              `;
            } catch (err) {
              selectedBackup = null;
              summaryBox.style.display = 'block';
              summaryBox.innerHTML = `<span style="color:#ef4444; font-weight:700;"><i class="fa-solid fa-circle-xmark"></i> Invalid JSON File: ${err.message}</span>`;
            }
          };
          reader.readAsText(file);
        });
      }
    });

    if (result) {
      const res = await api('importDataJson', result, { loaderMessage: 'Restoring database from backup...' });
      if (res.ok) {
        ui.alert('Database successfully restored from backup! The application will now reload to apply all changes.', 'success')
          .then(() => window.location.reload());
      }
    }
  },

  async openRestoreSqliteModal() {
    const html = `
      <div style="display:flex; flex-direction:column; gap:12px; text-align:left;">
        <div class="modal-section-card" style="background:#fef2f2; border:1px solid #fecaca;">
          <div style="font-size:12.5px; color:#b91c1c; line-height:1.45;">
            <strong><i class="fa-solid fa-triangle-exclamation"></i> Critical Notice:</strong> This operation will replace your active database with the uploaded .sqlite file. An automated safeguard snapshot of the current database will be saved in data/backups/ prior to replacement.
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-weight:700;"><i class="fa-solid fa-database"></i> Choose Physical SQLite File (.sqlite / .db) *</label>
          <input type="file" id="restore-sqlite-file" class="form-control" accept=".sqlite,.db,application/x-sqlite3" style="padding:6px 10px;">
        </div>

        <div id="restore-sqlite-status" style="display:none; font-size:12px; padding:8px 12px; border-radius:6px;"></div>
      </div>
    `;

    let fileBase64 = null;

    const result = await ui.formModal(html, 'Restore Physical SQLite Database', async () => {
      if (!fileBase64) {
        Swal.showValidationMessage('Please select a valid SQLite database file!');
        return false;
      }
      return { fileData: fileBase64 };
    }, {
      icon: 'fa-hard-drive',
      onRender: () => {
        const fileInput = document.getElementById('restore-sqlite-file');
        const statusBox = document.getElementById('restore-sqlite-status');

        fileInput?.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (re) => {
            fileBase64 = re.target.result;
            statusBox.style.display = 'block';
            statusBox.style.background = '#f0fdf4';
            statusBox.style.color = '#15803d';
            statusBox.innerHTML = `File ready: <strong>${utils.escapeHtml(file.name)}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
          };
          reader.readAsDataURL(file);
        });
      }
    });

    if (result) {
      const res = await api('restoreSqliteFile', result, { loaderMessage: 'Verifying and replacing database file...' });
      if (res.ok) {
        ui.alert('Database file successfully replaced! The page will now reload.', 'success')
          .then(() => window.location.reload());
      }
    }
  },

  async openResetModal(mode = 'transactions_only') {
    const isTransOnly = mode === 'transactions_only';
    const title = isTransOnly ? 'Clear Operational Transactions (Fresh Start)' : 'Complete Factory Reset';
    const alertBg = isTransOnly ? '#fffbeb' : '#fef2f2';
    const alertBorder = isTransOnly ? '#fde68a' : '#fecaca';
    const alertColor = isTransOnly ? '#b45309' : '#b91c1c';

    const html = `
      <div style="display:flex; flex-direction:column; gap:12px; text-align:left;">
        <div class="modal-section-card" style="background:${alertBg}; border:1px solid ${alertBorder};">
          <div style="font-size:12.5px; color:${alertColor}; line-height:1.45;">
            <strong><i class="fa-solid fa-triangle-exclamation"></i> Security Warning:</strong>
            ${isTransOnly ? `
              This operation will permanently delete all <strong>Bills, Invoices, Cashbook, Hawker Dispatches, Day Closings, Cylinder Stock Logs, and Dues Transactions</strong>.
              <br><br>
              <span style="color:#15803d; font-weight:700;"><i class="fa-solid fa-check"></i> Preserved:</span> Company Profile, Hawker & Staff Master, Customer Master, Items Catalog & Rates.
            ` : `
              This operation will <strong>completely wipe all system data</strong> and re-initialize factory defaults.
              Default Admin credentials (admin / admin123) and standard HP Gas product catalog will be restored.
            `}
          </div>
        </div>

        <div class="modal-section-card" style="background:#f0fdf4; border:1px solid #bbf7d0;">
          <div style="font-size:12px; color:#15803d;">
            <i class="fa-solid fa-shield-halved"></i> <strong>Safeguard Protection:</strong> An automated full backup snapshot will be saved in <code>data/backups/</code> prior to executing this reset.
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-weight:700; color:#b91c1c;">
            Type "RESET" below to confirm this permanent operation: *
          </label>
          <input type="text" id="reset-confirm-word" class="form-control" placeholder="RESET" style="font-weight:700; letter-spacing:1px; text-transform:uppercase;" required>
        </div>
      </div>
    `;

    const result = await ui.formModal(html, title, async () => {
      const word = document.getElementById('reset-confirm-word').value.trim().toUpperCase();
      if (word !== 'RESET') {
        Swal.showValidationMessage('You must type RESET in all caps to confirm!');
        return false;
      }
      return {
        mode,
        confirmation: word
      };
    }, {
      icon: isTransOnly ? 'fa-eraser' : 'fa-trash-can'
    });

    if (result) {
      const res = await api('resetDatabase', result, { loaderMessage: 'Performing system reset...' });
      if (res.ok) {
        ui.alert(res.message || 'Reset completed successfully! The page will now reload.', 'success')
          .then(() => window.location.reload());
      }
    }
  }
};
