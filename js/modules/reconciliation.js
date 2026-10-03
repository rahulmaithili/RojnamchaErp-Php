/**
 * SHIV SHAKTI HP GAS - CENTRALIZED RECONCILIATION ENGINE MODULE
 */

import { api } from '../api.js';
import { utils } from '../utils.js';

export const reconciliationModule = {
  async init() {
    this.renderContainer();
    await this.loadReconciliation();
  },

  renderContainer() {
    const root = document.getElementById('view-reconciliation');
    if (!root) return;

    root.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);">Centralized System Reconciliation Engine</h2>
            <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Automated 3-way mathematical validation of Billings vs Settlements, Cash Drawer vs Denominations, & Hawker Stock vs Collections</p>
          </div>
          <div>
            <button id="recon-refresh-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-arrows-rotate"></i> Re-Verify</button>
          </div>
        </div>
      </div>

      <!-- Date Filter -->
      <div class="card" style="margin-bottom:16px; padding:14px 20px;">
        <div style="display:flex; gap:12px; align-items:center;">
          <label style="font-size:13px; font-weight:600;">Reconciliation Audit Date:</label>
          <input type="date" id="recon-date-filter" class="form-control" value="${utils.today()}" style="width:160px;">
          <button id="recon-run-btn" class="btn btn-primary btn-sm"><i class="fa-solid fa-play"></i> Run Verification</button>
        </div>
      </div>

      <!-- Overall Status Banner -->
      <div id="recon-status-banner" style="margin-bottom:20px;"></div>

      <!-- Checks Grid -->
      <div id="recon-checks-container" style="display:flex; flex-direction:column; gap:16px;"></div>
    `;

    document.getElementById('recon-date-filter').addEventListener('change', () => this.loadReconciliation());
    document.getElementById('recon-refresh-btn').addEventListener('click', () => this.loadReconciliation());
    document.getElementById('recon-run-btn').addEventListener('click', () => this.loadReconciliation());
  },

  async loadReconciliation() {
    const date = document.getElementById('recon-date-filter')?.value || utils.today();
    const res = await api('getReconciliation', { date }, { loaderMessage: 'Verifying reconciliation ledger...' });
    if (!res.ok || !res.data) return;

    const { overallStatus, checks } = res.data;
    const banner = document.getElementById('recon-status-banner');
    const container = document.getElementById('recon-checks-container');

    const isBalanced = overallStatus === 'BALANCED';

    banner.innerHTML = `
      <div style="padding:18px 24px; border-radius:var(--radius-lg); display:flex; align-items:center; gap:16px; background:${isBalanced ? 'var(--color-success-bg)' : 'var(--color-danger-bg)'}; border:1px solid ${isBalanced ? 'var(--color-success)' : 'var(--color-danger)'};">
        <div style="width:48px; height:48px; border-radius:50%; background:${isBalanced ? 'var(--color-success)' : 'var(--color-danger)'}; color:white; display:flex; align-items:center; justify-content:center; font-size:24px;">
          <i class="fa-solid ${isBalanced ? 'fa-check' : 'fa-triangle-exclamation'}"></i>
        </div>
        <div>
          <div style="font-size:18px; font-weight:800; color:${isBalanced ? 'var(--color-success)' : 'var(--color-danger)'};">
            SYSTEM STATUS: ${overallStatus}
          </div>
          <div style="font-size:13px; color:var(--text-muted); margin-top:2px;">
            ${isBalanced ? 'All operational ledgers, cash drawer balances and hawker delivery settlements match expected values perfectly.' : 'One or more discrepancies detected across POS settlements, cash drawer or hawker collections.'}
          </div>
        </div>
      </div>
    `;

    container.innerHTML = (checks || []).map(c => {
      const isMatched = c.status === 'MATCHED';
      const isPending = c.status === 'PENDING_PHYSICAL_COUNT';

      let statusBadge = '<span class="badge badge-success"><i class="fa-solid fa-check"></i> MATCHED</span>';
      if (!isMatched && !isPending) {
        statusBadge = '<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation"></i> DISCREPANCY</span>';
      } else if (isPending) {
        statusBadge = '<span class="badge badge-warning">PENDING COUNT</span>';
      }

      return `
        <div class="card" style="border-left:4px solid ${isMatched ? 'var(--color-success)' : (isPending ? 'var(--color-warning)' : 'var(--color-danger)')};">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div style="font-size:16px; font-weight:700; color:var(--text-main);">${utils.escapeHtml(c.source)}</div>
            ${statusBadge}
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; background:var(--bg-body); padding:12px; border-radius:var(--radius-md); margin-bottom:10px;">
            <div>
              <div style="font-size:11px; color:var(--text-muted);">Expected Target</div>
              <div class="num-font" style="font-size:16px; font-weight:700;">${utils.formatCurrency(c.expected)}</div>
            </div>
            <div>
              <div style="font-size:11px; color:var(--text-muted);">Actual Ledger Value</div>
              <div class="num-font" style="font-size:16px; font-weight:700;">${utils.formatCurrency(c.actual)}</div>
            </div>
            <div>
              <div style="font-size:11px; color:var(--text-muted);">Variance Difference</div>
              <div class="num-font" style="font-size:16px; font-weight:700; color:${c.difference > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">
                ${c.difference > 0 ? '±' : ''}${utils.formatCurrency(c.difference)}
              </div>
            </div>
          </div>

          <div style="font-size:12.5px; color:var(--text-muted);">
            <i class="fa-solid fa-circle-info"></i> ${utils.escapeHtml(c.note)}
          </div>
        </div>
      `;
    }).join('');
  }
};
