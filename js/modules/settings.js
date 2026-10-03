/**
 * SHIV SHAKTI HP GAS - SYSTEM SETTINGS & APPEARANCE MODULE
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { CONFIG } from '../config.js';
import { auth } from '../auth.js';
import { themeManager } from './theme.js';

let settingsMap = {};
let currentTab = 'appearance';

export const settingsModule = {
  async init() {
    this.renderContainer();
    await Promise.all([this.loadSettings(), this.loadHealth()]);
  },

  renderContainer() {
    const root = document.getElementById('view-settings');
    if (!root) return;

    root.innerHTML = `
      <!-- Settings Header Card -->
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);">Settings & System Preferences</h2>
            <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Themes, 35+ UI palettes, inventory thresholds, document footers and database health</p>
          </div>
          <div style="display:flex; gap:8px;">
            <button id="set-backup-btn" class="btn btn-secondary btn-sm" ${auth.getCurrentUser()?.role !== 'ADMIN' ? 'disabled' : ''}>
              <i class="fa-solid fa-database"></i> Trigger Backup
            </button>
            <button id="set-save-btn" class="btn btn-primary btn-sm" ${auth.getCurrentUser()?.role !== 'ADMIN' ? 'disabled' : ''}>
              <i class="fa-solid fa-floppy-disk"></i> Save Settings
            </button>
          </div>
        </div>
      </div>

      <!-- Settings Navigation Tabs Bar (Matching Reference Architecture) -->
      <div class="card" style="margin-bottom:20px; padding:8px 12px;">
        <div style="display:flex; gap:8px; overflow-x:auto;" id="set-nav-tabs">
          <button class="btn btn-sm btn-primary set-tab-btn" data-tab="appearance">
            <i class="fa-solid fa-palette"></i> Appearance & Themes
          </button>
          <button class="btn btn-sm btn-outline set-tab-btn" data-tab="thresholds">
            <i class="fa-solid fa-sliders"></i> Inventory & Alerts
          </button>
          <button class="btn btn-sm btn-outline set-tab-btn" data-tab="printing">
            <i class="fa-solid fa-print"></i> Document Footers
          </button>
          <button class="btn btn-sm btn-outline set-tab-btn" data-tab="diagnostics">
            <i class="fa-solid fa-heart-pulse"></i> System Diagnostics
          </button>
        </div>
      </div>

      <!-- Tab 1: Appearance & 35 Theme Presets -->
      <div id="set-tab-content-appearance" class="set-tab-content">
        ${themeManager.renderAppearanceHtml()}
      </div>

      <!-- Tab 2: Inventory & Thresholds -->
      <div id="set-tab-content-thresholds" class="set-tab-content" style="display:none;">
        <div class="card">
          <h3 style="font-size:15px; font-weight:700; margin-bottom:14px; border-bottom:1px solid var(--border); padding-bottom:6px;">Inventory Low-Stock Thresholds</h3>
          <p style="font-size:12.5px; color:var(--text-muted); margin-bottom:14px;">Define minimum alert levels in godown inventory before stock alerts trigger.</p>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">14.2 KG Domestic Alert Level</label>
              <input type="number" id="set-th-142" class="form-control num-font" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">19 KG Commercial Alert Level</label>
              <input type="number" id="set-th-190" class="form-control num-font" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">5 KG Cylinder Alert Level</label>
              <input type="number" id="set-th-050" class="form-control num-font" min="1">
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: Document Footers -->
      <div id="set-tab-content-printing" class="set-tab-content" style="display:none;">
        <div class="card">
          <h3 style="font-size:15px; font-weight:700; margin-bottom:14px; border-bottom:1px solid var(--border); padding-bottom:6px;">Printing & Document Footers</h3>
          <p style="font-size:12.5px; color:var(--text-muted); margin-bottom:14px;">Custom statutory notices, safety warnings and helpline numbers printed on receipts and invoices.</p>
          <div class="form-group">
            <label class="form-label">Receipt & Invoice Footer Notice</label>
            <textarea id="set-print-footer" class="form-control" rows="3"></textarea>
          </div>
        </div>
      </div>

      <!-- Tab 4: Diagnostics & Health -->
      <div id="set-tab-content-diagnostics" class="set-tab-content" style="display:none;">
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fa-solid fa-heart-pulse" style="color:var(--color-success);"></i> Live System Health Diagnostics</div>
            <button id="set-health-refresh-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-arrows-rotate"></i> Reload Health</button>
          </div>
          <div class="card-body">
            <div id="set-health-container" style="display:flex; flex-direction:column; gap:12px; font-size:13px;">
              <div class="skeleton skeleton-card"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    themeManager.bindAppearanceEvents();
  },

  bindEvents() {
    // 1. Tab Navigation
    document.querySelectorAll('.set-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // 2. Global Actions
    document.getElementById('set-save-btn')?.addEventListener('click', () => this.saveSettings());
    document.getElementById('set-backup-btn')?.addEventListener('click', () => this.triggerBackup());
    document.getElementById('set-health-refresh-btn')?.addEventListener('click', () => this.loadHealth());
  },

  switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.set-tab-btn').forEach(b => {
      if (b.dataset.tab === tab) {
        b.className = 'btn btn-sm btn-primary set-tab-btn';
      } else {
        b.className = 'btn btn-sm btn-outline set-tab-btn';
      }
    });

    document.querySelectorAll('.set-tab-content').forEach(c => {
      c.style.display = 'none';
    });

    const activeEl = document.getElementById(`set-tab-content-${tab}`);
    if (activeEl) {
      activeEl.style.display = 'block';
    }
  },

  async loadSettings() {
    const res = await api('getSettings', {}, { loader: false });
    if (!res.ok || !res.data) return;

    settingsMap = res.data.map || {};

    const th142 = document.getElementById('set-th-142');
    if (th142) th142.value = settingsMap['LOW_STOCK_THRESHOLD_142'] || 50;

    const th190 = document.getElementById('set-th-190');
    if (th190) th190.value = settingsMap['LOW_STOCK_THRESHOLD_190'] || 15;

    const th050 = document.getElementById('set-th-050');
    if (th050) th050.value = settingsMap['LOW_STOCK_THRESHOLD_050'] || 10;

    const footer = document.getElementById('set-print-footer');
    if (footer) footer.value = settingsMap['PRINT_FOOTER_NOTE'] || 'HP Gas Suraksha Sanrakshit. For LPG Emergency Call 1906. Thank You!';
  },

  async loadHealth() {
    const res = await api('getSystemHealth', {}, { loader: false });
    const box = document.getElementById('set-health-container');
    if (!box) return;

    if (!res.ok || !res.data) {
      box.innerHTML = '<div style="color:var(--color-danger);">Unable to read health metrics.</div>';
      return;
    }

    const h = res.data;
    box.innerHTML = `
      <div class="diag-row">
        <span>Server Status:</span> <strong style="color:var(--color-success);"><i class="fa-solid fa-circle-check"></i> ${h.status}</strong>
      </div>
      <div class="diag-row">
        <span>PHP Engine Version:</span> <strong>PHP ${h.phpVersion}</strong>
      </div>
      <div class="diag-row">
        <span>Primary Database:</span> <strong>${h.database}</strong>
      </div>
      <div class="diag-row">
        <span>Physical DB Size:</span> <strong class="num-font">${h.databaseSize}</strong>
      </div>
      <div class="diag-row">
        <span>Registered Customers:</span> <strong class="num-font">${h.totalCustomers}</strong>
      </div>
      <div class="diag-row">
        <span>Total Bills Generated:</span> <strong class="num-font">${h.totalBills}</strong>
      </div>
      <div class="diag-row">
        <span>Last Database Backup:</span> <strong style="font-size:11px;">${h.lastBackup}</strong>
      </div>
      <div class="diag-row">
        <span>Server Clock:</span> <strong class="num-font" style="font-size:11.5px;">${h.serverTime}</strong>
      </div>
    `;
  },

  async saveSettings() {
    const payload = {
      settings: {
        'LOW_STOCK_THRESHOLD_142': document.getElementById('set-th-142')?.value || '50',
        'LOW_STOCK_THRESHOLD_190': document.getElementById('set-th-190')?.value || '15',
        'LOW_STOCK_THRESHOLD_050': document.getElementById('set-th-050')?.value || '10',
        'PRINT_FOOTER_NOTE': document.getElementById('set-print-footer')?.value || ''
      }
    };

    const res = await api('saveSettings', payload, { loaderMessage: 'Saving system settings...' });
    if (res.ok) {
      ui.success('System settings saved successfully.');
    }
  },

  async triggerBackup() {
    const confirmed = await ui.confirm('Create a physical snapshot backup copy of the complete database right now?', 'Database Backup', 'Yes, Create Backup');
    if (!confirmed) return;

    const res = await api('backupDatabase', {}, { loaderMessage: 'Generating database backup copy...' });
    if (res.ok && res.data) {
      ui.success(`Backup copy created: ${res.data.FileName} (${res.data.FileSize})`);
      this.loadHealth();
    }
  }
};
