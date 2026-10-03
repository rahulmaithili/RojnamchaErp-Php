/**
 * SHIV SHAKTI HP GAS - AUDIT TRAIL LOG VIEWER MODULE
 */

import { api } from '../api.js';
import { utils } from '../utils.js';

export const auditModule = {
  async init() {
    this.renderContainer();
    await this.loadAuditLogs();
  },

  renderContainer() {
    const root = document.getElementById('view-audit');
    if (!root) return;

    root.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);">Security Audit Trail & Override Log</h2>
            <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Immutable record of logins, rate changes, bill cancellations, write-offs & administrative overrides</p>
          </div>
          <div>
            <button id="aud-refresh-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-arrows-rotate"></i> Refresh Audit</button>
          </div>
        </div>
      </div>

      <!-- Filters Toolbar -->
      <div class="card" style="margin-bottom:16px; padding:14px 20px;">
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
          <input type="text" id="aud-search-input" class="form-control" placeholder="Search user, action or reason..." style="flex:1; min-width:240px;">
          <select id="aud-module-filter" class="form-select" style="width:160px;">
            <option value="all">All Modules</option>
            <option value="auth">Auth / Logins</option>
            <option value="billing">Billing / Invoices</option>
            <option value="dues">Dues / Write-offs</option>
            <option value="items">Items / Rates</option>
            <option value="cashbook">Cashbook / EOD</option>
            <option value="stock">Inventory</option>
          </select>
          <button id="aud-filter-btn" class="btn btn-primary btn-sm"><i class="fa-solid fa-filter"></i> Filter</button>
        </div>
      </div>

      <!-- Audit Logs Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Operator</th>
                <th>Action</th>
                <th>Module</th>
                <th>Record ID</th>
                <th>Reason / Summary</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody id="aud-table-body">
              <tr><td colspan="7" class="text-center" style="padding:24px; color:var(--text-muted);">Loading audit logs...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('aud-filter-btn').addEventListener('click', () => this.loadAuditLogs());
    document.getElementById('aud-refresh-btn').addEventListener('click', () => this.loadAuditLogs());
    document.getElementById('aud-module-filter').addEventListener('change', () => this.loadAuditLogs());
    document.getElementById('aud-search-input').addEventListener('input', utils.debounce(() => this.loadAuditLogs(), 300));
  },

  async loadAuditLogs() {
    const mod = document.getElementById('aud-module-filter')?.value || 'all';
    const search = document.getElementById('aud-search-input')?.value.trim() || '';

    const res = await api('listAudit', { module: mod, search }, { loader: false });
    const tbody = document.getElementById('aud-table-body');
    if (!tbody) return;

    if (!res.ok || !res.data || !res.data.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:24px; color:var(--text-muted);">No audit log entries matching criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = res.data.map(a => {
      let badgeClass = 'badge-secondary';
      if (a.Action.includes('CREATE')) badgeClass = 'badge-success';
      if (a.Action.includes('DELETE') || a.Action.includes('CANCEL') || a.Action.includes('WRITEOFF')) badgeClass = 'badge-danger';
      if (a.Action.includes('UPDATE') || a.Action.includes('CHANGE')) badgeClass = 'badge-warning';

      return `
        <tr>
          <td><span class="num-font" style="font-size:12px;">${a.Timestamp}</span></td>
          <td><strong>${utils.escapeHtml(a.Username)}</strong></td>
          <td><span class="badge ${badgeClass}">${a.Action}</span></td>
          <td><span class="badge badge-secondary">${a.Module}</span></td>
          <td>${utils.escapeHtml(a.RecordID || '-')}</td>
          <td>${utils.escapeHtml(a.Reason || '-')}</td>
          <td><span class="num-font" style="font-size:11px;">${utils.escapeHtml(a.IPAddress || '-')}</span></td>
        </tr>
      `;
    }).join('');
  }
};
