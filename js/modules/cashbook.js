/**
 * SHIV SHAKTI HP GAS - DAILY CASHBOOK, DENOMINATIONS & EOD CLOSING MODULE
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { utils } from '../utils.js';
import { auth } from '../auth.js';

let currentCashbook = null;

export const cashbookModule = {
  async init() {
    this.renderContainer();
    await this.loadCashbook();
  },

  renderContainer() {
    const root = document.getElementById('view-cashbook');
    if (!root) return;

    root.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);">Daily Cashbook & End-of-Day Closing</h2>
            <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Cash drawer inflows, expenses, physical currency denominations and day closing lockdown</p>
          </div>
          <div style="display:flex; gap:8px;">
            <button id="cb-view-btn" class="btn btn-secondary btn-sm" title="View Cash Summary">
              <i class="fa-solid fa-eye"></i> View Summary
            </button>
            <button id="cb-print-btn" class="btn btn-secondary btn-sm" title="Print Rojnamcha Sheet">
              <i class="fa-solid fa-print"></i> Print Rojnamcha
            </button>
            <button id="cb-save-btn" class="btn btn-secondary btn-sm" ${!auth.can('cashbook', 'update') ? 'disabled' : ''}>
              <i class="fa-solid fa-floppy-disk"></i> Save Cashbook
            </button>
            <button id="cb-close-day-btn" class="btn btn-primary btn-sm" ${!auth.can('cashbook', 'approve') ? 'disabled' : ''}>
              <i class="fa-solid fa-lock"></i> Close Business Day
            </button>
            <button id="cb-unlock-day-btn" class="btn btn-danger btn-sm" style="display:none;" ${auth.getCurrentUser()?.role !== 'ADMIN' ? 'disabled' : ''}>
              <i class="fa-solid fa-lock-open"></i> Unlock Day (Admin)
            </button>
          </div>
        </div>
      </div>

      <!-- Date Selector & Status -->
      <div class="card" style="margin-bottom:16px; padding:14px 20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; gap:12px; align-items:center;">
            <label style="font-size:13px; font-weight:600;">Cashbook Date:</label>
            <input type="date" id="cb-date-filter" class="form-control" value="${utils.today()}" style="width:160px;">
            <button id="cb-refresh-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-arrows-rotate"></i></button>
          </div>
          <div id="cb-day-status-badge">
            <span class="badge badge-success" style="font-size:12px; padding:6px 12px;"><i class="fa-solid fa-lock-open"></i> ACTIVE / OPEN</span>
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 380px; gap:20px;" class="cashbook-layout-grid">
        <!-- Inflows & Outflows Ledger -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fa-solid fa-money-bill-transfer"></i> Daily Cash Reconciliation</div>
          </div>
          <div class="card-body">
            <div class="form-grid" style="margin-bottom:20px;">
              <div class="form-group">
                <label class="form-label">Opening Cash Drawer (₹)</label>
                <input type="number" id="cb-opening" class="form-control num-font" step="any" min="0">
              </div>
              <div class="form-group">
                <label class="form-label">Counter Cash Billing (₹)</label>
                <input type="number" id="cb-counter" class="form-control num-font" step="any" readonly style="background:var(--bg-body);">
              </div>
              <div class="form-group">
                <label class="form-label">Hawker Cash Collected (₹)</label>
                <input type="number" id="cb-hawker" class="form-control num-font" step="any" readonly style="background:var(--bg-body);">
              </div>
              <div class="form-group">
                <label class="form-label">Customer Dues Recovered (₹)</label>
                <input type="number" id="cb-dues" class="form-control num-font" step="any" readonly style="background:var(--bg-body);">
              </div>
            </div>

            <h3 style="font-size:14px; font-weight:700; margin-bottom:12px; border-bottom:1px solid var(--border); padding-bottom:6px;">Other Inflows & Outflows</h3>
            <div class="form-grid" style="margin-bottom:20px;">
              <div class="form-group">
                <label class="form-label">Other Inflows (₹)</label>
                <input type="number" id="cb-other-inflow" class="form-control num-font" step="any" min="0" value="0">
              </div>
              <div class="form-group">
                <label class="form-label">Agency Expenses (₹)</label>
                <input type="number" id="cb-expenses" class="form-control num-font" step="any" min="0" value="0">
              </div>
              <div class="form-group">
                <label class="form-label">Security Deposit Refunds (₹)</label>
                <input type="number" id="cb-refunds" class="form-control num-font" step="any" min="0" value="0">
              </div>
              <div class="form-group">
                <label class="form-label">Bank Cash Deposits (₹)</label>
                <input type="number" id="cb-bank-dep" class="form-control num-font" step="any" min="0" value="0">
              </div>
            </div>

            <!-- Expected Summary Box -->
            <div style="background:var(--bg-body); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px;">
                <span>Total Day Inflow:</span>
                <strong id="cb-total-inflow-lbl" class="num-font" style="color:var(--color-success);">₹0.00</strong>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px;">
                <span>Total Day Outflow:</span>
                <strong id="cb-total-outflow-lbl" class="num-font" style="color:var(--color-danger);">₹0.00</strong>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:17px; font-weight:800; border-top:1px dashed var(--border); padding-top:8px;">
                <span>System Expected Closing Cash:</span>
                <span id="cb-expected-closing-lbl" class="num-font" style="color:var(--primary);">₹0.00</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Physical Currency Denominations -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fa-solid fa-coins"></i> Currency Denominations</div>
          </div>
          <div class="card-body">
            <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:14px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px; font-weight:600; width:70px;">₹500 ×</span>
                <input type="number" id="denom-500" class="form-control text-center denom-input num-font" value="0" min="0" style="width:90px; height:34px;">
                <span id="denom-500-total" class="num-font" style="width:100px; text-align:right;">₹0.00</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px; font-weight:600; width:70px;">₹200 ×</span>
                <input type="number" id="denom-200" class="form-control text-center denom-input num-font" value="0" min="0" style="width:90px; height:34px;">
                <span id="denom-200-total" class="num-font" style="width:100px; text-align:right;">₹0.00</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px; font-weight:600; width:70px;">₹100 ×</span>
                <input type="number" id="denom-100" class="form-control text-center denom-input num-font" value="0" min="0" style="width:90px; height:34px;">
                <span id="denom-100-total" class="num-font" style="width:100px; text-align:right;">₹0.00</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px; font-weight:600; width:70px;">₹50 ×</span>
                <input type="number" id="denom-50" class="form-control text-center denom-input num-font" value="0" min="0" style="width:90px; height:34px;">
                <span id="denom-50-total" class="num-font" style="width:100px; text-align:right;">₹0.00</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px; font-weight:600; width:70px;">₹20 ×</span>
                <input type="number" id="denom-20" class="form-control text-center denom-input num-font" value="0" min="0" style="width:90px; height:34px;">
                <span id="denom-20-total" class="num-font" style="width:100px; text-align:right;">₹0.00</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px; font-weight:600; width:70px;">₹10 ×</span>
                <input type="number" id="denom-10" class="form-control text-center denom-input num-font" value="0" min="0" style="width:90px; height:34px;">
                <span id="denom-10-total" class="num-font" style="width:100px; text-align:right;">₹0.00</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px; font-weight:600; width:70px;">Coins</span>
                <input type="number" id="denom-coins" class="form-control text-center denom-input num-font" value="0" min="0" step="any" style="width:90px; height:34px;">
                <span id="denom-coins-total" class="num-font" style="width:100px; text-align:right;">₹0.00</span>
              </div>
            </div>

            <div style="border-top:2px solid var(--border); padding-top:10px; margin-bottom:12px;">
              <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:800; margin-bottom:6px;">
                <span>Physical Cash:</span>
                <span id="denom-grand-total" class="num-font">₹0.00</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:700;">
                <span>Variance:</span>
                <span id="cb-variance-lbl" class="num-font">₹0.00</span>
              </div>
            </div>

            <div class="form-group" id="cb-variance-reason-group" style="display:none;">
              <label class="form-label" style="color:var(--color-danger);">Mandatory Variance Explanation *</label>
              <textarea id="cb-variance-reason" class="form-control" rows="2" placeholder="Explain discrepancy between physical and expected cash..."></textarea>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('cb-date-filter').addEventListener('change', () => this.loadCashbook());
    document.getElementById('cb-refresh-btn').addEventListener('click', () => this.loadCashbook());
    document.getElementById('cb-save-btn').addEventListener('click', () => this.saveCashbook());
    document.getElementById('cb-close-day-btn').addEventListener('click', () => this.closeDay());
    document.getElementById('cb-unlock-day-btn').addEventListener('click', () => this.unlockDay());
    document.getElementById('cb-view-btn')?.addEventListener('click', () => this.viewCashDetails());
    document.getElementById('cb-print-btn')?.addEventListener('click', async () => {
      const date = document.getElementById('cb-date-filter')?.value || utils.today();
      const res = await api('getRojnamcha', { date });
      if (res.ok && res.data) {
        import('./print.js').then(m => m.printEngine.openPreview('rojnamcha', res.data));
      }
    });

    // Live denomination calculations
    const denomInputs = ['denom-500', 'denom-200', 'denom-100', 'denom-50', 'denom-20', 'denom-10', 'denom-coins'];
    denomInputs.forEach(id => {
      document.getElementById(id).addEventListener('input', () => this.calculateDenominations());
    });

    const inflowOutflowInputs = ['cb-opening', 'cb-other-inflow', 'cb-expenses', 'cb-refunds', 'cb-bank-dep'];
    inflowOutflowInputs.forEach(id => {
      document.getElementById(id).addEventListener('input', () => this.calculateDenominations());
    });
  },

  viewCashDetails() {
    if (!currentCashbook) {
      ui.warn('Please load cashbook first.');
      return;
    }
    const { physicalGrandTotal, expectedClosing, variance } = this.calculateDenominations();
    const date = document.getElementById('cb-date-filter')?.value || utils.today();

    const html = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="background:var(--color-surface-subtle); padding:16px; border-radius:var(--r-md); display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border-color);">
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Business Date</div>
            <div style="font-size:16px; font-weight:800; color:var(--primary);">${utils.formatDate(date)}</div>
          </div>
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Day Closing Status</div>
            <div>${Number(currentCashbook.IsClosed) === 1 ? '<span class="badge badge-danger">LOCKED</span>' : '<span class="badge badge-success">OPEN</span>'}</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;">
          <div style="background:var(--color-surface); border:1px solid var(--border-color); border-radius:var(--r-sm); padding:12px; text-align:center;">
            <div style="font-size:11px; color:var(--text-muted); font-weight:700;">OPENING CASH</div>
            <div class="num-font" style="font-size:20px; font-weight:800; color:var(--text-main);">${utils.formatCurrency(currentCashbook.OpeningCash || 0)}</div>
          </div>
          <div style="background:var(--color-surface); border:1px solid var(--border-color); border-radius:var(--r-sm); padding:12px; text-align:center;">
            <div style="font-size:11px; color:var(--text-muted); font-weight:700;">TOTAL INFLOW</div>
            <div class="num-font" style="font-size:20px; font-weight:800; color:var(--color-success);">${document.getElementById('cb-total-inflow-lbl')?.textContent || '₹0.00'}</div>
          </div>
          <div style="background:var(--color-surface); border:1px solid var(--border-color); border-radius:var(--r-sm); padding:12px; text-align:center;">
            <div style="font-size:11px; color:var(--text-muted); font-weight:700;">TOTAL OUTFLOW</div>
            <div class="num-font" style="font-size:20px; font-weight:800; color:var(--color-danger);">${document.getElementById('cb-total-outflow-lbl')?.textContent || '₹0.00'}</div>
          </div>
        </div>

        <div style="background:var(--color-surface-subtle); border:1px solid var(--border-color); border-radius:var(--r-md); padding:16px;">
          <h4 style="font-size:12px; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px; font-weight:800;">Drawer Cash Breakdown</h4>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
            <span>System Expected Closing:</span>
            <strong class="num-font">${utils.formatCurrency(expectedClosing)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
            <span>Counted Physical Currency:</span>
            <strong class="num-font" style="color:var(--primary); font-weight:800;">${utils.formatCurrency(physicalGrandTotal)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
            <span>Cash Variance:</span>
            <strong class="num-font" style="color:${Math.abs(variance) < 0.5 ? 'var(--color-success)' : 'var(--color-danger)'};">${variance > 0 ? '+' : ''}${utils.formatCurrency(variance)}</strong>
          </div>
          ${currentCashbook.VarianceReason ? `
          <div style="padding:8px 0; font-size:12px; color:var(--text-muted);">
            <strong>Reason for Variance:</strong> ${utils.escapeHtml(currentCashbook.VarianceReason)}
          </div>` : ''}
        </div>
      </div>
    `;

    ui.viewDetails(`Cashbook Summary (${utils.formatDate(date)})`, html, async () => {
      const res = await api('getRojnamcha', { date });
      if (res.ok && res.data) {
        import('./print.js').then(m => m.printEngine.openPreview('rojnamcha', res.data));
      }
    });
  },

  async loadCashbook() {
    const date = document.getElementById('cb-date-filter')?.value || utils.today();
    const res = await api('getCashbook', { date }, { loader: false });
    if (!res.ok || !res.data) return;

    currentCashbook = res.data.cashbook;
    const isClosed = Number(currentCashbook.IsClosed) === 1;

    // Update Status Badge & Buttons
    const badge = document.getElementById('cb-day-status-badge');
    const closeBtn = document.getElementById('cb-close-day-btn');
    const unlockBtn = document.getElementById('cb-unlock-day-btn');

    if (isClosed) {
      badge.innerHTML = '<span class="badge badge-danger" style="font-size:12px; padding:6px 12px;"><i class="fa-solid fa-lock"></i> DAY CLOSED & LOCKED</span>';
      closeBtn.style.display = 'none';
      if (auth.getCurrentUser()?.role === 'ADMIN') {
        unlockBtn.style.display = 'inline-flex';
      }
    } else {
      badge.innerHTML = '<span class="badge badge-success" style="font-size:12px; padding:6px 12px;"><i class="fa-solid fa-lock-open"></i> ACTIVE / OPEN</span>';
      closeBtn.style.display = 'inline-flex';
      unlockBtn.style.display = 'none';
    }

    // Populate Fields
    document.getElementById('cb-opening').value = currentCashbook.OpeningCash || 0;
    document.getElementById('cb-counter').value = currentCashbook.CounterCash || 0;
    document.getElementById('cb-hawker').value = currentCashbook.HawkerCash || 0;
    document.getElementById('cb-dues').value = currentCashbook.DuesCash || 0;
    document.getElementById('cb-other-inflow').value = currentCashbook.OtherInflow || 0;
    document.getElementById('cb-expenses').value = currentCashbook.Expenses || 0;
    document.getElementById('cb-refunds').value = currentCashbook.Refunds || 0;
    document.getElementById('cb-bank-dep').value = currentCashbook.BankDeposit || 0;

    // Denominations
    document.getElementById('denom-500').value = currentCashbook.Denomination500 || 0;
    document.getElementById('denom-200').value = currentCashbook.Denomination200 || 0;
    document.getElementById('denom-100').value = currentCashbook.Denomination100 || 0;
    document.getElementById('denom-50').value = currentCashbook.Denomination50 || 0;
    document.getElementById('denom-20').value = currentCashbook.Denomination20 || 0;
    document.getElementById('denom-10').value = currentCashbook.Denomination10 || 0;
    document.getElementById('denom-coins').value = currentCashbook.DenominationCoins || 0;

    document.getElementById('cb-variance-reason').value = currentCashbook.VarianceReason || '';

    this.calculateDenominations();
  },

  calculateDenominations() {
    const d500 = parseInt(document.getElementById('denom-500').value) || 0;
    const d200 = parseInt(document.getElementById('denom-200').value) || 0;
    const d100 = parseInt(document.getElementById('denom-100').value) || 0;
    const d50 = parseInt(document.getElementById('denom-50').value) || 0;
    const d20 = parseInt(document.getElementById('denom-20').value) || 0;
    const d10 = parseInt(document.getElementById('denom-10').value) || 0;
    const dCoins = parseFloat(document.getElementById('denom-coins').value) || 0;

    document.getElementById('denom-500-total').textContent = utils.formatCurrency(d500 * 500);
    document.getElementById('denom-200-total').textContent = utils.formatCurrency(d200 * 200);
    document.getElementById('denom-100-total').textContent = utils.formatCurrency(d100 * 100);
    document.getElementById('denom-50-total').textContent = utils.formatCurrency(d50 * 50);
    document.getElementById('denom-20-total').textContent = utils.formatCurrency(d20 * 20);
    document.getElementById('denom-10-total').textContent = utils.formatCurrency(d10 * 10);
    document.getElementById('denom-coins-total').textContent = utils.formatCurrency(dCoins);

    const physicalGrandTotal = (d500 * 500) + (d200 * 200) + (d100 * 100) + (d50 * 50) + (d20 * 20) + (d10 * 10) + dCoins;
    document.getElementById('denom-grand-total').textContent = utils.formatCurrency(physicalGrandTotal);

    // Calculate Inflows & Outflows
    const opening = parseFloat(document.getElementById('cb-opening').value) || 0;
    const counter = parseFloat(document.getElementById('cb-counter').value) || 0;
    const hawker = parseFloat(document.getElementById('cb-hawker').value) || 0;
    const dues = parseFloat(document.getElementById('cb-dues').value) || 0;
    const otherInflow = parseFloat(document.getElementById('cb-other-inflow').value) || 0;

    const expenses = parseFloat(document.getElementById('cb-expenses').value) || 0;
    const refunds = parseFloat(document.getElementById('cb-refunds').value) || 0;
    const bankDep = parseFloat(document.getElementById('cb-bank-dep').value) || 0;

    const totalInflow = counter + hawker + dues + otherInflow;
    const totalOutflow = expenses + refunds + bankDep;
    const expectedClosing = opening + totalInflow - totalOutflow;

    document.getElementById('cb-total-inflow-lbl').textContent = utils.formatCurrency(totalInflow);
    document.getElementById('cb-total-outflow-lbl').textContent = utils.formatCurrency(totalOutflow);
    document.getElementById('cb-expected-closing-lbl').textContent = utils.formatCurrency(expectedClosing);

    const variance = physicalGrandTotal - expectedClosing;
    const varEl = document.getElementById('cb-variance-lbl');
    const reasonBox = document.getElementById('cb-variance-reason-group');

    if (physicalGrandTotal > 0) {
      if (Math.abs(variance) > 0.5) {
        varEl.style.color = 'var(--color-danger)';
        varEl.textContent = `${variance > 0 ? '+' : ''}${utils.formatCurrency(variance)}`;
        reasonBox.style.display = 'block';
      } else {
        varEl.style.color = 'var(--color-success)';
        varEl.textContent = '₹0.00 (Balanced)';
        reasonBox.style.display = 'none';
      }
    } else {
      varEl.style.color = 'var(--text-muted)';
      varEl.textContent = '₹0.00';
      reasonBox.style.display = 'none';
    }

    return { physicalGrandTotal, expectedClosing, variance };
  },

  async saveCashbook() {
    const { physicalGrandTotal, expectedClosing, variance } = this.calculateDenominations();
    const reason = document.getElementById('cb-variance-reason').value.trim();

    if (physicalGrandTotal > 0 && Math.abs(variance) > 0.5 && !reason) {
      ui.warn(`A variance of ${utils.formatCurrency(variance)} was detected. An explanation is mandatory before saving.`);
      return;
    }

    const payload = {
      Date: document.getElementById('cb-date-filter').value,
      OpeningCash: parseFloat(document.getElementById('cb-opening').value) || 0,
      CounterCash: parseFloat(document.getElementById('cb-counter').value) || 0,
      HawkerCash: parseFloat(document.getElementById('cb-hawker').value) || 0,
      DuesCash: parseFloat(document.getElementById('cb-dues').value) || 0,
      OtherInflow: parseFloat(document.getElementById('cb-other-inflow').value) || 0,
      Expenses: parseFloat(document.getElementById('cb-expenses').value) || 0,
      Refunds: parseFloat(document.getElementById('cb-refunds').value) || 0,
      BankDeposit: parseFloat(document.getElementById('cb-bank-dep').value) || 0,
      Denomination500: parseInt(document.getElementById('denom-500').value) || 0,
      Denomination200: parseInt(document.getElementById('denom-200').value) || 0,
      Denomination100: parseInt(document.getElementById('denom-100').value) || 0,
      Denomination50: parseInt(document.getElementById('denom-50').value) || 0,
      Denomination20: parseInt(document.getElementById('denom-20').value) || 0,
      Denomination10: parseInt(document.getElementById('denom-10').value) || 0,
      DenominationCoins: parseFloat(document.getElementById('denom-coins').value) || 0,
      VarianceReason: reason
    };

    const res = await api('saveCashbook', payload, { loaderMessage: 'Saving cashbook...' });
    if (res.ok) {
      ui.success('Cashbook and currency denominations saved.');
      this.loadCashbook();
    }
  },

  async closeDay() {
    const date = document.getElementById('cb-date-filter').value;
    const confirmed = await ui.confirm(
      `Are you sure you want to close business day ${utils.formatDate(date)}? Once locked, sales and ledger entries cannot be altered without Admin authorization.`,
      'Confirm Day Closing',
      'Yes, Close & Lock Day'
    );
    if (!confirmed) return;

    const res = await api('closeDay', { Date: date }, { loaderMessage: 'Closing business day...' });
    if (res.ok) {
      ui.success(`Business day ${utils.formatDate(date)} locked successfully.`);
      this.loadCashbook();
    }
  },

  async unlockDay() {
    const date = document.getElementById('cb-date-filter').value;
    const reason = await ui.prompt(`Unlock Business Day: ${utils.formatDate(date)}`, 'Mandatory audit reason for unlocking...');
    if (reason) {
      const res = await api('unlockDay', { Date: date, Reason: reason }, { loaderMessage: 'Unlocking day...' });
      if (res.ok) {
        ui.success(`Day ${utils.formatDate(date)} unlocked.`);
        this.loadCashbook();
      }
    }
  }
};
