/**
 * SHIV SHAKTI HP GAS - CUSTOMER DUES LEDGER & RECOVERY MODULE
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { utils } from '../utils.js';
import { auth } from '../auth.js';
import { printEngine } from './print.js';

let duesList = [];

export const duesModule = {
  async init() {
    this.renderContainer();
    await this.loadDues();
  },

  renderContainer() {
    const root = document.getElementById('view-dues');
    if (!root) return;

    root.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);">Customer Outstanding Dues Ledger</h2>
            <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Credit receivables, aging analysis, recovery collection receipts and write-offs</p>
          </div>
          <div>
            <button id="dues-export-btn" class="btn btn-outline btn-sm">
              <i class="fa-solid fa-file-csv"></i> Export Dues
            </button>
          </div>
        </div>
      </div>

      <!-- Filters & Aging Stats Toolbar -->
      <div class="card" style="margin-bottom:16px; padding:14px 20px;">
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
          <input type="text" id="dues-search-input" class="form-control" placeholder="Search customer, mobile or due no..." style="flex:1; min-width:240px;">
          <select id="dues-status-filter" class="form-select" style="width:160px;">
            <option value="pending" selected>Pending & Partial</option>
            <option value="cleared">Settled / Cleared</option>
            <option value="written_off">Written Off</option>
          </select>
          <button id="dues-refresh-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-arrows-rotate"></i></button>
        </div>
      </div>

      <!-- Dues Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Due No</th>
                <th>Due Date</th>
                <th>Customer Name</th>
                <th>Mobile</th>
                <th class="text-right">Original Amt</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Remaining Balance</th>
                <th class="text-center">Aging</th>
                <th class="text-center">Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody id="dues-table-body">
              <tr><td colspan="10" class="text-center" style="color:var(--text-muted); padding:24px;">Loading dues ledger...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('dues-search-input').addEventListener('input', utils.debounce((e) => {
      this.loadDues(e.target.value);
    }, 300));
    document.getElementById('dues-status-filter').addEventListener('change', () => this.loadDues());
    document.getElementById('dues-refresh-btn').addEventListener('click', () => this.loadDues());

    document.getElementById('dues-export-btn').addEventListener('click', () => {
      utils.exportCSV('Shiv_Shakti_Dues_Ledger', [
        { label: 'Due Number', key: 'DueNumber' },
        { label: 'Customer Name', key: 'CustomerName' },
        { label: 'Mobile', key: 'CustomerMobile' },
        { label: 'Original Amount (₹)', key: 'OriginalAmount' },
        { label: 'Paid Amount (₹)', key: 'PaidAmount' },
        { label: 'Remaining Balance (₹)', key: 'RemainingAmount' },
        { label: 'Aging Bracket', key: 'AgingBracket' },
        { label: 'Status', key: 'Status' }
      ], duesList);
    });
  },

  async loadDues(search = '') {
    const status = document.getElementById('dues-status-filter')?.value || 'pending';
    const res = await api('listDues', { status, search }, { loader: false });
    const tbody = document.getElementById('dues-table-body');
    if (!tbody) return;

    if (!res.ok || !res.data || !res.data.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10">
            <div class="empty-state">
              <div class="empty-state-icon"><i class="fa-solid fa-hand-holding-dollar"></i></div>
              <div class="empty-state-title">No dues records found</div>
              <div class="empty-state-desc">All customer credit accounts in this filter bracket are clear.</div>
            </div>
          </td>
        </tr>
      `;
      duesList = [];
      return;
    }

    duesList = res.data;
    tbody.innerHTML = duesList.map(d => {
      let badgeClass = 'badge-success';
      if (d.AgingBracket === '8-30 Days') badgeClass = 'badge-info';
      if (d.AgingBracket === '31-60 Days') badgeClass = 'badge-warning';
      if (d.AgingBracket === '60+ Days') badgeClass = 'badge-danger';

      return `
        <tr style="${d.IsWrittenOff ? 'opacity:0.6;' : ''}">
          <td><strong>${utils.escapeHtml(d.DueNumber)}</strong></td>
          <td>${utils.formatDate(d.DueDate)}</td>
          <td><strong>${utils.escapeHtml(d.CustomerName)}</strong></td>
          <td>${utils.escapeHtml(d.CustomerMobile)}</td>
          <td class="text-right num-font">${utils.formatCurrency(d.OriginalAmount)}</td>
          <td class="text-right num-font" style="color:var(--color-success);">${utils.formatCurrency(d.PaidAmount)}</td>
          <td class="text-right num-font" style="font-weight:700; color:var(--color-danger);">${utils.formatCurrency(d.RemainingAmount)}</td>
          <td class="text-center"><span class="badge ${badgeClass}">${d.AgingBracket}</span></td>
          <td class="text-center">
            ${d.IsWrittenOff ? '<span class="badge badge-secondary">WRITTEN OFF</span>' : (d.Status === 'CLEARED' ? '<span class="badge badge-success">CLEARED</span>' : '<span class="badge badge-warning">PENDING</span>')}
          </td>
          <td class="text-center" style="white-space:nowrap;">
            <button class="action-icon view-icon view-due-btn" data-id="${d.DueID}" title="View Due Breakdown">
              <i class="fa-solid fa-eye"></i>
            </button>
            ${!d.IsWrittenOff && d.Status !== 'CLEARED' ? `
            <button class="action-icon edit-icon recover-due-btn" data-id="${d.DueID}" title="Collect Recovery">
              <i class="fa-solid fa-money-bill-transfer"></i>
            </button>` : ''}
            <button class="action-icon print-icon print-due-btn" data-id="${d.DueID}" title="Print Receipt">
              <i class="fa-solid fa-print"></i>
            </button>
            ${!d.IsWrittenOff && d.Status !== 'CLEARED' && auth.getCurrentUser()?.role === 'ADMIN' ? `
            <button class="action-icon delete-icon writeoff-due-btn" data-id="${d.DueID}" data-no="${d.DueNumber}" title="Write Off Due">
              <i class="fa-solid fa-ban"></i>
            </button>` : ''}
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.view-due-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const obj = duesList.find(d => d.DueID === id);
        if (obj) this.viewDueDetails(obj);
      });
    });

    tbody.querySelectorAll('.print-due-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const obj = duesList.find(d => d.DueID === id);
        if (obj) {
          printEngine.openPreview('due_receipt', {
            ReceiptNumber: obj.DueNumber,
            PaymentDate: obj.DueDate,
            CustomerName: obj.CustomerName,
            CustomerMobile: obj.CustomerMobile,
            PaymentMode: 'CREDIT / PENDING',
            Amount: obj.PaidAmount || 0,
            RemainingAmount: obj.RemainingAmount || 0
          }, 'a4_tax');
        }
      });
    });

    tbody.querySelectorAll('.recover-due-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const obj = duesList.find(d => d.DueID === id);
        if (obj) this.openRecoverModal(obj);
      });
    });

    tbody.querySelectorAll('.writeoff-due-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const dNo = e.currentTarget.dataset.no;
        const reason = await ui.prompt(`Write Off Due: ${dNo}`, 'Mandatory explanation for write-off...');
        if (reason) {
          const res = await api('writeOffDue', { DueID: id, Reason: reason });
          if (res.ok) {
            ui.success(`Due ${dNo} written off successfully.`);
            this.loadDues();
          }
        }
      });
    });
  },

  async openRecoverModal(due) {
    const html = `
      <div style="display:flex; flex-direction:column; gap:6px; text-align:left;">
        <!-- Card 1: Consumer & Due Summary -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-receipt"></i>
            <span>Customer Outstanding Due Summary</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:700; font-size:14px; color:var(--navy-primary);">${utils.escapeHtml(due.CustomerName)}</div>
              <div style="font-size:12px; color:var(--text-muted);"><i class="fa-solid fa-phone"></i> ${due.CustomerMobile} &bull; Due #${due.DueNumber}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px; color:var(--text-muted);">Remaining Due</div>
              <div class="num-font" style="font-size:18px; font-weight:800; color:#dc2626;">${utils.formatCurrency(due.RemainingAmount)}</div>
            </div>
          </div>
        </div>

        <!-- Card 2: Collection Inputs -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-hand-holding-dollar"></i>
            <span>Payment Receipt Information</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-indian-rupee-sign"></i> Amount Collected (₹) *</label>
              <input type="number" id="rec-amt" class="form-control num-font" value="${due.RemainingAmount}" max="${due.RemainingAmount}" min="1" step="any" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-credit-card"></i> Payment Mode</label>
              <select id="rec-mode" class="form-select">
                <option value="CASH">Cash Payment</option>
                <option value="UPI">UPI / Digital QR</option>
                <option value="BANK">Bank / Direct Transfer</option>
              </select>
            </div>
          </div>

          <div class="form-group" style="margin-top:10px;">
            <label class="form-label"><i class="fa-solid fa-hashtag"></i> Reference / UTR / Transaction ID</label>
            <input type="text" id="rec-ref" class="form-control" placeholder="UPI Reference or Bank Txn ID (Optional)">
          </div>

          <div class="form-group" style="margin-top:10px;">
            <label class="form-label"><i class="fa-solid fa-note-sticky"></i> Collection Remarks & Notes</label>
            <input type="text" id="rec-notes" class="form-control" placeholder="e.g. Cleared at delivery counter">
          </div>
        </div>
      </div>
    `;

    const data = await ui.formModal(html, `Collect Due: ${due.DueNumber}`, () => {
      const amt = parseFloat(document.getElementById('rec-amt').value);
      if (!amt || amt <= 0) {
        Swal.showValidationMessage('Enter a valid recovery amount!');
        return false;
      }
      if (amt > Number(due.RemainingAmount)) {
        Swal.showValidationMessage(`Amount cannot exceed remaining balance of ${utils.formatCurrency(due.RemainingAmount)}!`);
        return false;
      }
      return {
        DueID: due.DueID,
        Amount: amt,
        PaymentMode: document.getElementById('rec-mode').value,
        ReferenceNo: document.getElementById('rec-ref').value.trim(),
        Notes: document.getElementById('rec-notes').value.trim(),
        PaymentDate: utils.today()
      };
    });

    if (data) {
      const res = await api('recoverDue', data, { loaderMessage: 'Registering dues recovery...' });
      if (res.ok && res.data) {
        ui.toast(`Payment recovered! Receipt: ${res.data.ReceiptNumber}`);

        const shouldPrint = await ui.confirm(`Receipt ${res.data.ReceiptNumber} generated. Print payment receipt now?`, 'Print Receipt', 'Print Receipt');
        if (shouldPrint) {
          printEngine.openPreview('due_receipt', {
            ...due,
            ReceiptNumber: res.data.ReceiptNumber,
            Amount: data.Amount,
            PaymentMode: data.PaymentMode,
            PaymentDate: data.PaymentDate,
            RemainingAmount: res.data.RemainingAmount
          }, '80mm');
        }

        this.loadDues();
      }
    }
  },

  viewDueDetails(due) {
    const html = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="background:var(--bg-body); border:1px solid var(--border); border-radius:var(--r-sm); padding:14px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Due Record Info</div>
            <div style="font-size:16px; font-weight:800; color:var(--primary); margin-top:2px;">${utils.escapeHtml(due.DueNumber)}</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:3px;">Date: <strong>${utils.formatDate(due.DueDate)}</strong></div>
            <div style="margin-top:6px;">
              <span class="badge ${due.Status === 'CLEARED' ? 'badge-success' : 'badge-warning'}">${due.Status || 'PENDING'}</span>
              <span class="badge badge-info" style="margin-left:4px;">${due.AgingBracket || 'Current'}</span>
            </div>
          </div>
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Consumer Info</div>
            <div style="font-size:14px; font-weight:700; margin-top:2px;">${utils.escapeHtml(due.CustomerName)}</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:3px;">Mobile: <strong>${utils.escapeHtml(due.CustomerMobile || '-')}</strong></div>
          </div>
        </div>

        <div style="background:var(--bg-body); border:1px solid var(--border); border-radius:var(--r-sm); padding:16px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; text-align:center;">
          <div>
            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Original Credit</div>
            <div style="font-size:18px; font-weight:800;" class="num-font">${utils.formatCurrency(due.OriginalAmount)}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Recovered Paid</div>
            <div style="font-size:18px; font-weight:800; color:var(--color-success);" class="num-font">${utils.formatCurrency(due.PaidAmount)}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">Outstanding Due</div>
            <div style="font-size:18px; font-weight:800; color:var(--color-danger);" class="num-font">${utils.formatCurrency(due.RemainingAmount)}</div>
          </div>
        </div>
      </div>
    `;

    ui.viewDetails(`Due Record: ${due.DueNumber}`, html, () => {
      printEngine.openPreview('due_receipt', {
        ReceiptNumber: due.DueNumber,
        PaymentDate: due.DueDate,
        CustomerName: due.CustomerName,
        CustomerMobile: due.CustomerMobile,
        PaymentMode: 'CREDIT DUE RECORD',
        Amount: due.PaidAmount || 0,
        RemainingAmount: due.RemainingAmount || 0
      }, 'a4_tax');
    });
  }
};
