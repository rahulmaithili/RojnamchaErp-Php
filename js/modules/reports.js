/**
 * SHIV SHAKTI HP GAS - COMPREHENSIVE BUSINESS REPORTS MODULE
 */

import { api } from '../api.js';
import { utils } from '../utils.js';

let reportData = [];

export const reportsModule = {
  async init() {
    this.renderContainer();
    await this.loadReport();
  },

  renderContainer() {
    const root = document.getElementById('view-reports');
    if (!root) return;

    root.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);">Management Information & Audit Reports</h2>
            <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Consolidated analytics for billing, payment modes, product sales, customer statements & reversals</p>
          </div>
          <div style="display:flex; gap:8px;">
            <button id="rep-print-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-print"></i> Print Report</button>
            <button id="rep-export-btn" class="btn btn-outline btn-sm"><i class="fa-solid fa-file-csv"></i> Export CSV</button>
          </div>
        </div>
      </div>

      <!-- Filters Toolbar -->
      <div class="card" style="margin-bottom:16px; padding:14px 20px;">
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
          <div class="form-group" style="width:200px;">
            <label class="form-label" style="font-size:11px;">Report Type</label>
            <select id="rep-type-select" class="form-select" style="height:36px;">
              <option value="daily_sales" selected>Daily Sales Summary</option>
              <option value="payment_modes">Payment Mode Tenders</option>
              <option value="item_sales">Product / Variant Sales</option>
              <option value="cancelled_bills">Cancelled Bills Audit</option>
            </select>
          </div>
          <div class="form-group" style="width:150px;">
            <label class="form-label" style="font-size:11px;">Start Date</label>
            <input type="date" id="rep-start-date" class="form-control" value="${utils.today()}" style="height:36px;">
          </div>
          <div class="form-group" style="width:150px;">
            <label class="form-label" style="font-size:11px;">End Date</label>
            <input type="date" id="rep-end-date" class="form-control" value="${utils.today()}" style="height:36px;">
          </div>
          <div class="form-group" style="align-self: flex-end;">
            <button id="rep-load-btn" class="btn btn-primary btn-sm" style="height:36px;"><i class="fa-solid fa-filter"></i> Generate</button>
          </div>
        </div>
      </div>

      <!-- Report Table Container -->
      <div class="card">
        <div id="rep-table-container" class="table-responsive">
          <div style="text-align:center; padding:30px; color:var(--text-muted);">Select filters and click "Generate" to compile report.</div>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('rep-load-btn').addEventListener('click', () => this.loadReport());
    document.getElementById('rep-type-select').addEventListener('change', () => this.loadReport());

    document.getElementById('rep-export-btn').addEventListener('click', () => {
      const type = document.getElementById('rep-type-select').value;
      if (!reportData.length) return;

      if (type === 'daily_sales') {
        utils.exportCSV('Daily_Sales_Report', [
          { label: 'Date', key: 'BillDate' },
          { label: 'Bills Count', key: 'TotalBills' },
          { label: 'Total Revenue (₹)', key: 'TotalAmount' },
          { label: 'Cash (₹)', key: 'TotalCash' },
          { label: 'UPI (₹)', key: 'TotalUPI' },
          { label: 'Dues (₹)', key: 'TotalDues' }
        ], reportData);
      } else if (type === 'item_sales') {
        utils.exportCSV('Item_Sales_Report', [
          { label: 'Product Name', key: 'ItemName' },
          { label: 'Category', key: 'Category' },
          { label: 'Units Sold', key: 'TotalQuantity' },
          { label: 'Total Revenue (₹)', key: 'TotalRevenue' }
        ], reportData);
      } else {
        utils.exportCSV(`Report_${type}`, Object.keys(reportData[0] || {}).map(k => ({ label: k, key: k })), reportData);
      }
    });

    document.getElementById('rep-print-btn').addEventListener('click', () => {
      window.print();
    });
  },

  async loadReport() {
    const type = document.getElementById('rep-type-select')?.value || 'daily_sales';
    const startDate = document.getElementById('rep-start-date')?.value || utils.today();
    const endDate = document.getElementById('rep-end-date')?.value || utils.today();

    const res = await api('getReport', { type, startDate, endDate }, { loaderMessage: 'Compiling report data...' });
    const container = document.getElementById('rep-table-container');
    if (!container) return;

    if (!res.ok || !res.data || !res.data.length) {
      container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">No records found matching the specified date range.</div>';
      reportData = [];
      return;
    }

    reportData = res.data;

    if (type === 'daily_sales') {
      container.innerHTML = `
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Date</th>
              <th class="text-center">Bills</th>
              <th class="text-right">Subtotal</th>
              <th class="text-right">Tax</th>
              <th class="text-right">Net Sales</th>
              <th class="text-right">Cash</th>
              <th class="text-right">UPI</th>
              <th class="text-right">Dues Added</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.map(r => `
              <tr>
                <td><strong>${utils.formatDate(r.BillDate)}</strong></td>
                <td class="text-center num-font">${r.TotalBills}</td>
                <td class="text-right num-font">${utils.formatCurrency(r.Subtotal)}</td>
                <td class="text-right num-font">${utils.formatCurrency(r.TaxAmount)}</td>
                <td class="text-right num-font" style="font-weight:700; color:var(--primary); font-size:15px;">${utils.formatCurrency(r.TotalAmount)}</td>
                <td class="text-right num-font" style="color:var(--color-success);">${utils.formatCurrency(r.TotalCash)}</td>
                <td class="text-right num-font" style="color:var(--color-info);">${utils.formatCurrency(r.TotalUPI)}</td>
                <td class="text-right num-font" style="color:var(--color-danger);">${utils.formatCurrency(r.TotalDues)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (type === 'item_sales') {
      container.innerHTML = `
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Cylinder Type</th>
              <th class="text-center">Units Sold</th>
              <th class="text-right">Total Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.map(r => `
              <tr>
                <td><strong>${utils.escapeHtml(r.ItemName)}</strong></td>
                <td><span class="badge badge-info">${r.Category}</span></td>
                <td>${utils.escapeHtml(r.CylinderType || '-')}</td>
                <td class="text-center num-font" style="font-weight:700;">${r.TotalQuantity}</td>
                <td class="text-right num-font" style="font-weight:700; color:var(--primary);">${utils.formatCurrency(r.TotalRevenue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (type === 'payment_modes') {
      container.innerHTML = `
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Payment Tender Mode</th>
              <th class="text-center">Transactions Count</th>
              <th class="text-right">Total Collected</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.map(r => `
              <tr>
                <td><strong>${utils.escapeHtml(r.PaymentMode)}</strong></td>
                <td class="text-center num-font">${r.TransactionsCount}</td>
                <td class="text-right num-font" style="font-weight:700; color:var(--color-success); font-size:15px;">${utils.formatCurrency(r.TotalCollected)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (type === 'cancelled_bills') {
      container.innerHTML = `
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Bill No</th>
              <th>Date</th>
              <th>Customer</th>
              <th class="text-right">Cancelled Amount</th>
              <th>Cancellation Reason</th>
              <th>Cancelled By</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.map(r => `
              <tr style="color:var(--color-danger);">
                <td><strong>${utils.escapeHtml(r.BillNumber)}</strong></td>
                <td>${utils.formatDate(r.BillDate)}</td>
                <td>${utils.escapeHtml(r.CustomerName)}</td>
                <td class="text-right num-font" style="font-weight:700;">${utils.formatCurrency(r.TotalAmount)}</td>
                <td>${utils.escapeHtml(r.CancelReason || 'Reversal')}</td>
                <td>${utils.escapeHtml(r.CancelledByName || 'Admin')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  }
};
