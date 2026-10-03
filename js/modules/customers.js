/**
 * SHIV SHAKTI HP GAS - CUSTOMER CRM & 360 PROFILE MODULE
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { utils } from '../utils.js';
import { auth } from '../auth.js';
import { printEngine } from './print.js';
import { billingModule } from './billing.js';

let customerList = [];

export const customerModule = {
  async init() {
    this.renderContainer();
    await this.loadCustomers();
  },

  renderContainer() {
    const root = document.getElementById('view-customers');
    if (!root) return;

    root.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);">Customer Relationship Management (CRM)</h2>
            <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Track consumers, refill consumption history, dues balances and 360 profiles</p>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button id="cust-refund-deposit-btn" class="btn btn-warning btn-sm" style="background:#d97706; border-color:#d97706; color:#fff;" title="Surrender SV Connection & Return Security Deposit">
              <i class="fa-solid fa-hand-holding-dollar"></i> Return Security Deposit
            </button>
            <button id="cust-reminders-btn" class="btn btn-secondary btn-sm">
              <i class="fa-solid fa-bell"></i> Refill Reminders
            </button>
            <button id="cust-export-btn" class="btn btn-outline btn-sm">
              <i class="fa-solid fa-file-csv"></i> Export CSV
            </button>
            <button id="cust-create-btn" class="btn btn-primary btn-sm" ${!auth.can('customers', 'create') ? 'disabled' : ''}>
              <i class="fa-solid fa-user-plus"></i> New Consumer
            </button>
          </div>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="card" style="margin-bottom:16px; padding:14px 20px;">
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
          <input type="text" id="cust-search-input" class="form-control" placeholder="Search by name, mobile, consumer no, or village..." style="flex:1; min-width:240px;">
          <select id="cust-conn-filter" class="form-select" style="width:160px;">
            <option value="all">All Connections</option>
            <option value="DOMESTIC">Domestic</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="NEW_SV">New SV</option>
          </select>
          <select id="cust-status-filter" class="form-select" style="width:130px;">
            <option value="active" selected>Active</option>
            <option value="deleted">Trash / Deleted</option>
          </select>
          <button id="cust-filter-refresh-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-arrows-rotate"></i></button>
        </div>
      </div>

      <!-- Customers Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Consumer Code</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Consumer No</th>
                <th>Area / Village</th>
                <th class="text-right">Current Dues</th>
                <th class="text-center">Total Refills</th>
                <th>Last Refill</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody id="cust-table-body">
              <tr><td colspan="9" class="text-center" style="color:var(--text-muted); padding:24px;">Loading customers...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('cust-create-btn').addEventListener('click', () => this.openCustomerModal());
    document.getElementById('cust-refund-deposit-btn')?.addEventListener('click', () => billingModule.openSecurityRefundModal());
    document.getElementById('cust-search-input').addEventListener('input', utils.debounce((e) => {
      this.loadCustomers(e.target.value);
    }, 300));
    document.getElementById('cust-conn-filter').addEventListener('change', () => this.loadCustomers());
    document.getElementById('cust-status-filter').addEventListener('change', () => this.loadCustomers());
    document.getElementById('cust-filter-refresh-btn').addEventListener('click', () => this.loadCustomers());

    document.getElementById('cust-export-btn').addEventListener('click', () => {
      utils.exportCSV('Shiv_Shakti_Customers', [
        { label: 'Customer Code', key: 'CustomerCode' },
        { label: 'Name', key: 'Name' },
        { label: 'Mobile', key: 'Mobile' },
        { label: 'Consumer No', key: 'ConsumerNo' },
        { label: 'Area', key: 'Area' },
        { label: 'Connection Type', key: 'ConnectionType' },
        { label: 'Current Dues (₹)', key: 'CurrentDues' },
        { label: 'Total Refills', key: 'TotalRefills' },
        { label: 'Last Refill Date', key: 'LastRefillDate' }
      ], customerList);
    });

    document.getElementById('cust-reminders-btn').addEventListener('click', () => this.openRemindersModal());
  },

  async loadCustomers(search = '') {
    const connType = document.getElementById('cust-conn-filter')?.value || 'all';
    const status = document.getElementById('cust-status-filter')?.value || 'active';

    const res = await api('listCustomers', { search, connectionType: connType, status }, { loader: false });
    const tbody = document.getElementById('cust-table-body');
    if (!tbody) return;

    if (!res.ok || !res.data || !res.data.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9">
            <div class="empty-state">
              <div class="empty-state-icon"><i class="fa-solid fa-users-slash"></i></div>
              <div class="empty-state-title">No customers found</div>
              <div class="empty-state-desc">Try adjusting search criteria or add a new customer to the database.</div>
            </div>
          </td>
        </tr>
      `;
      customerList = [];
      return;
    }

    customerList = res.data;
    tbody.innerHTML = customerList.map(c => `
      <tr style="${c.IsDeleted ? 'opacity:0.6;' : ''}">
        <td><strong>${utils.escapeHtml(c.CustomerCode)}</strong></td>
        <td>
          <a href="#" class="view-cust-360-btn" data-id="${c.CustomerID}" style="color:var(--primary); font-weight:700; text-decoration:none;">
            ${utils.escapeHtml(c.Name)}
          </a>
        </td>
        <td>${utils.escapeHtml(c.Mobile)}</td>
        <td>${utils.escapeHtml(c.ConsumerNo || '-')}</td>
        <td>${utils.escapeHtml(c.Area || c.Village || '-')}</td>
        <td class="text-right num-font" style="font-weight:700; ${Number(c.CurrentDues) > 0 ? 'color:var(--color-danger);' : ''}">
          ${utils.formatCurrency(c.CurrentDues)}
        </td>
        <td class="text-center num-font">${c.TotalRefills}</td>
        <td>${utils.formatDate(c.LastRefillDate)}</td>
        <td class="text-center" style="white-space:nowrap;">
          <button class="action-icon view-icon view-cust-360-btn" data-id="${c.CustomerID}" title="View Consumer 360 & Statement">
            <i class="fa-solid fa-eye"></i>
          </button>
          ${!c.IsDeleted && auth.can('customers', 'update') ? `
          <button class="action-icon edit-icon edit-cust-btn" data-id="${c.CustomerID}" title="Edit Profile">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>` : ''}
          ${!c.IsDeleted && auth.can('customers', 'delete') ? `
          <button class="action-icon delete-icon del-cust-btn" data-id="${c.CustomerID}" title="Delete Customer">
            <i class="fa-solid fa-trash"></i>
          </button>` : ''}
          ${c.IsDeleted && auth.getCurrentUser()?.role === 'ADMIN' ? `
          <button class="action-icon print-icon restore-cust-btn" data-id="${c.CustomerID}" title="Restore">
            <i class="fa-solid fa-rotate-left"></i>
          </button>` : ''}
        </td>
      </tr>
    `).join('');

    // Bind item actions
    tbody.querySelectorAll('.view-cust-360-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = parseInt(e.currentTarget.dataset.id);
        this.openCustomer360Modal(id);
      });
    });

    tbody.querySelectorAll('.edit-cust-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const obj = customerList.find(c => c.CustomerID === id);
        if (obj) this.openCustomerModal(obj);
      });
    });

    tbody.querySelectorAll('.del-cust-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const confirmed = await ui.confirm('Are you sure you want to move this customer record to trash?', 'Delete Customer');
        if (confirmed) {
          const delRes = await api('deleteCustomer', { CustomerID: id });
          if (delRes.ok) {
            ui.success('Customer deleted.');
            this.loadCustomers();
          }
        }
      });
    });

    tbody.querySelectorAll('.restore-cust-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const res = await api('restoreCustomer', { CustomerID: id });
        if (res.ok) {
          ui.success('Customer restored.');
          this.loadCustomers();
        }
      });
    });
  },

  async openCustomerModal(cust = null) {
    const isEdit = Boolean(cust);
    const html = `
      <div style="display:flex; flex-direction:column; gap:6px; text-align:left;">
        <!-- Section 1: Consumer Identification -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-id-card"></i>
            <span>Consumer Identification</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-user"></i> Full Consumer Name *</label>
              <input type="text" id="cm-name" class="form-control" placeholder="e.g. Shyam Sundar" value="${cust ? utils.escapeHtml(cust.Name) : ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-phone"></i> Mobile Number *</label>
              <input type="tel" id="cm-mobile" class="form-control" placeholder="10-digit mobile" value="${cust ? cust.Mobile : ''}" maxlength="10" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-phone-flip"></i> Alternate Mobile</label>
              <input type="tel" id="cm-alt-mobile" class="form-control" placeholder="Optional phone" value="${cust ? cust.AltMobile || '' : ''}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-hashtag"></i> Consumer Number</label>
              <input type="text" id="cm-consumer" class="form-control" placeholder="e.g. 612345" value="${cust ? cust.ConsumerNo || '' : ''}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-barcode"></i> 17-Digit LPG ID</label>
              <input type="text" id="cm-lpgid" class="form-control" placeholder="17-digit LPG ID" value="${cust ? cust.LPGID || '' : ''}" maxlength="17">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-fingerprint"></i> Aadhaar (Last 4 Digits)</label>
              <input type="text" id="cm-aadhaar" class="form-control" placeholder="4 digits" value="${cust ? cust.AadhaarLast4 || '' : ''}" maxlength="4">
            </div>
          </div>
        </div>

        <!-- Section 2: Connection & Category -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-fire-flame-curved"></i>
            <span>Connection Type & Status</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-gas-pump"></i> Connection Category</label>
              <select id="cm-conn-type" class="form-select">
                <option value="DOMESTIC" ${cust && cust.ConnectionType === 'DOMESTIC' ? 'selected' : ''}>Domestic (14.2 KG Cyl)</option>
                <option value="COMMERCIAL" ${cust && cust.ConnectionType === 'COMMERCIAL' ? 'selected' : ''}>Commercial (19 KG Cyl)</option>
                <option value="NEW_SV" ${cust && cust.ConnectionType === 'NEW_SV' ? 'selected' : ''}>New SV Connection</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-circle-check"></i> Account Status</label>
              <select id="cm-status" class="form-select">
                <option value="ACTIVE" ${!cust || cust.Status === 'ACTIVE' ? 'selected' : ''}>Active (Regular Consumer)</option>
                <option value="INACTIVE" ${cust && cust.Status === 'INACTIVE' ? 'selected' : ''}>Inactive (Dormant / Blocked)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-map-pin"></i> Area / Locality</label>
              <input type="text" id="cm-area" class="form-control" placeholder="Bazar / Chowk / Mohalla" value="${cust ? utils.escapeHtml(cust.Area || '') : ''}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-house-chimney"></i> Village / Town</label>
              <input type="text" id="cm-village" class="form-control" placeholder="Village name" value="${cust ? utils.escapeHtml(cust.Village || '') : ''}">
            </div>
          </div>
        </div>

        <!-- Section 3: Address & Notes -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-location-dot"></i>
            <span>Street Address & Notes</span>
          </div>
          <div class="modal-section-body">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-road"></i> Full Street / Delivery Address</label>
              <input type="text" id="cm-address" class="form-control" placeholder="House / Shop No, Street, Pandaul" value="${cust ? utils.escapeHtml(cust.Address || '') : ''}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-comment-dots"></i> Notes & Delivery Remarks</label>
              <textarea id="cm-notes" class="form-control" rows="2" placeholder="Customer landmark, delivery instructions, etc.">${cust ? utils.escapeHtml(cust.Notes || '') : ''}</textarea>
            </div>
          </div>
        </div>
      </div>
    `;

    const result = await ui.formModal(html, isEdit ? `Edit Consumer: ${cust.Name}` : 'Register New Consumer', () => {
      const name = document.getElementById('cm-name').value.trim();
      const mobile = document.getElementById('cm-mobile').value.trim();
      if (!name || !mobile) {
        Swal.showValidationMessage('Name and Mobile are required!');
        return false;
      }
      if (!/^\d{10}$/.test(mobile)) {
        Swal.showValidationMessage('Mobile must be exactly 10 digits!');
        return false;
      }
      return {
        CustomerID: isEdit ? cust.CustomerID : null,
        Name: name,
        Mobile: mobile,
        AltMobile: document.getElementById('cm-alt-mobile').value.trim(),
        ConsumerNo: document.getElementById('cm-consumer').value.trim(),
        LPGID: document.getElementById('cm-lpgid').value.trim(),
        AadhaarLast4: document.getElementById('cm-aadhaar').value.trim(),
        ConnectionType: document.getElementById('cm-conn-type').value,
        Area: document.getElementById('cm-area').value.trim(),
        Village: document.getElementById('cm-village').value.trim(),
        Status: document.getElementById('cm-status').value,
        Address: document.getElementById('cm-address').value.trim(),
        Notes: document.getElementById('cm-notes').value.trim()
      };
    });

    if (result) {
      const saveRes = await api('saveCustomer', result, { loaderMessage: 'Saving consumer profile...' });
      if (saveRes.ok) {
        ui.success(isEdit ? 'Customer profile updated.' : 'New customer registered.');
        this.loadCustomers();
      }
    }
  },

  async openCustomer360Modal(customerId) {
    const res = await api('getCustomer360', { CustomerID: customerId }, { loaderMessage: 'Loading 360 profile...' });
    if (!res.ok || !res.data) return;

    const { customer, bills, dues, metrics } = res.data;

    const billRows = (bills || []).map(b => `
      <tr>
        <td><strong>${utils.escapeHtml(b.BillNumber)}</strong></td>
        <td>${utils.formatDate(b.BillDate)}</td>
        <td class="text-right num-font">${utils.formatCurrency(b.TotalAmount)}</td>
        <td class="text-right num-font">${utils.formatCurrency(b.PaidCash)}</td>
        <td class="text-right num-font">${utils.formatCurrency(b.PaidUPI)}</td>
        <td class="text-right num-font" style="color:var(--color-danger);">${utils.formatCurrency(b.PaidDues)}</td>
      </tr>
    `).join('');

    const html = `
      <div style="text-align:left;">
        <!-- Top Metrics -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:16px;">
          <div style="background:#f1f5f9; padding:10px; border-radius:6px;">
            <div style="font-size:11px; color:#64748b;">Current Dues</div>
            <div style="font-size:16px; font-weight:800; color:var(--color-danger);" class="num-font">${utils.formatCurrency(customer.CurrentDues)}</div>
          </div>
          <div style="background:#f1f5f9; padding:10px; border-radius:6px;">
            <div style="font-size:11px; color:#64748b;">Lifetime Value</div>
            <div style="font-size:16px; font-weight:800; color:var(--primary);" class="num-font">${utils.formatCurrency(customer.LifetimeValue)}</div>
          </div>
          <div style="background:#f1f5f9; padding:10px; border-radius:6px;">
            <div style="font-size:11px; color:#64748b;">Total Refills</div>
            <div style="font-size:16px; font-weight:800;" class="num-font">${customer.TotalRefills}</div>
          </div>
          <div style="background:#f1f5f9; padding:10px; border-radius:6px;">
            <div style="font-size:11px; color:#64748b;">Avg Refill Gap</div>
            <div style="font-size:16px; font-weight:800;" class="num-font">${metrics.averageRefillDays ? metrics.averageRefillDays + ' Days' : 'N/A'}</div>
          </div>
        </div>

        <div style="font-size:13px; line-height:1.6; margin-bottom:14px; background:#fafafa; border:1px solid #e5e5e5; padding:10px; border-radius:6px;">
          <div><strong>Mobile:</strong> ${customer.Mobile} | <strong>Consumer No:</strong> ${customer.ConsumerNo || 'N/A'} | <strong>LPG ID:</strong> ${customer.LPGID || 'N/A'}</div>
          <div><strong>Address:</strong> ${customer.Address || '-'}, ${customer.Area || ''} (${customer.Village || ''})</div>
          <div><strong>Last Refill:</strong> ${utils.formatDate(customer.LastRefillDate)}</div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
          <div style="font-weight:700; font-size:13px;">Recent Purchases & Refills</div>
          <button id="c360-refund-btn" class="btn btn-warning btn-sm" style="background:#d97706; border-color:#d97706; color:#fff; font-size:11.5px; padding:4px 10px;">
            <i class="fa-solid fa-hand-holding-dollar"></i> Return Security / Surrender SV
          </button>
        </div>
        <div style="max-height:200px; overflow-y:auto; border:1px solid #eee; border-radius:6px;">
          <table class="table" style="font-size:12px;">
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Date</th>
                <th class="text-right">Total</th>
                <th class="text-right">Cash</th>
                <th class="text-right">UPI</th>
                <th class="text-right">Dues</th>
              </tr>
            </thead>
            <tbody>
              ${billRows.length ? billRows : '<tr><td colspan="6" class="text-center" style="padding:12px; color:#999;">No previous bills found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    ui.viewDetails(`Consumer 360: ${customer.Name}`, html, () => {
      printEngine.openPreview('dues_statement', { customer, dues }, 'a4_tax');
    });

    setTimeout(() => {
      document.getElementById('c360-refund-btn')?.addEventListener('click', () => {
        Swal.close();
        billingModule.openSecurityRefundModal(customer);
      });
    }, 150);
  },

  async openRemindersModal() {
    const res = await api('getRefillReminders', {}, { loaderMessage: 'Calculating refill reminders...' });
    if (!res.ok || !res.data) return;

    const list = res.data;
    const rows = list.map(c => `
      <tr>
        <td><strong>${utils.escapeHtml(c.Name)}</strong></td>
        <td>${utils.escapeHtml(c.Mobile)}</td>
        <td>${utils.escapeHtml(c.Area || '-')}</td>
        <td>${utils.formatDate(c.LastRefillDate)}</td>
        <td class="text-center">
          <a href="tel:${c.Mobile}" class="btn btn-primary btn-sm" title="Call Consumer"><i class="fa-solid fa-phone"></i> Call</a>
        </td>
      </tr>
    `).join('');

    const html = `
      <div style="text-align:left;">
        <p style="font-size:13px; color:#64748b; margin-bottom:12px;">
          Showing consumers whose last refill was over 25 days ago. Good candidates for proactive dispatch reminders:
        </p>
        <div style="max-height:350px; overflow-y:auto; border:1px solid #eee; border-radius:6px;">
          <table class="table" style="font-size:12px;">
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile</th>
                <th>Area</th>
                <th>Last Refill</th>
                <th class="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows : '<tr><td colspan="5" class="text-center" style="padding:20px; color:#888;">No overdue refill reminders found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    ui.viewDetails('Customer Refill Reminders', html);
  }
};
