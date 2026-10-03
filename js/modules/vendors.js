/**
 * SHIV SHAKTI HP GAS - VENDOR & STOCK RECEIPT MODULE
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { utils } from '../utils.js';
import { auth } from '../auth.js';

let vendorList = [];

export const vendorModule = {
  async init() {
    this.renderContainer();
    await this.loadVendors();
  },

  renderContainer() {
    const root = document.getElementById('view-vendors');
    if (!root) return;

    root.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);">Suppliers, Vendors & Stock Inwards</h2>
            <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Manage plant distributors, accessories manufacturers, purchase invoices & stock receipts</p>
          </div>
          <div style="display:flex; gap:8px;">
            <button id="vnd-purchase-btn" class="btn btn-secondary btn-sm" ${!auth.can('vendors', 'create') ? 'disabled' : ''}>
              <i class="fa-solid fa-file-invoice"></i> Record Purchase Invoice
            </button>
            <button id="vnd-create-btn" class="btn btn-primary btn-sm" ${!auth.can('vendors', 'create') ? 'disabled' : ''}>
              <i class="fa-solid fa-plus"></i> Add Vendor
            </button>
          </div>
        </div>
      </div>

      <!-- Search Toolbar -->
      <div class="card" style="margin-bottom:16px; padding:14px 20px;">
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
          <input type="text" id="vnd-search-input" class="form-control" placeholder="Search vendor name, contact or mobile..." style="flex:1; min-width:240px;">
          <select id="vnd-status-filter" class="form-select" style="width:130px;">
            <option value="active" selected>Active</option>
            <option value="deleted">Trash</option>
          </select>
          <button id="vnd-refresh-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-arrows-rotate"></i></button>
        </div>
      </div>

      <!-- Vendors Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Vendor Code</th>
                <th>Supplier / Agency Name</th>
                <th>Contact Person</th>
                <th>Mobile</th>
                <th>GSTIN</th>
                <th>Supplied Items</th>
                <th class="text-right">Opening Bal</th>
                <th class="text-center">Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody id="vnd-table-body">
              <tr><td colspan="9" class="text-center" style="color:var(--text-muted); padding:24px;">Loading suppliers...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('vnd-create-btn').addEventListener('click', () => this.openVendorModal());
    document.getElementById('vnd-purchase-btn').addEventListener('click', () => this.openPurchaseModal());
    document.getElementById('vnd-search-input').addEventListener('input', utils.debounce((e) => {
      this.loadVendors(e.target.value);
    }, 300));
    document.getElementById('vnd-status-filter').addEventListener('change', () => this.loadVendors());
    document.getElementById('vnd-refresh-btn').addEventListener('click', () => this.loadVendors());
  },

  async loadVendors(search = '') {
    const status = document.getElementById('vnd-status-filter')?.value || 'active';
    const res = await api('listVendors', { status, search }, { loader: false });
    const tbody = document.getElementById('vnd-table-body');
    if (!tbody) return;

    if (!res.ok || !res.data || !res.data.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center" style="padding:24px; color:var(--text-muted);">No suppliers registered.</td></tr>';
      vendorList = [];
      return;
    }

    vendorList = res.data;
    tbody.innerHTML = vendorList.map(v => `
      <tr style="${v.IsDeleted ? 'opacity:0.6;' : ''}">
        <td><strong>${utils.escapeHtml(v.VendorCode)}</strong></td>
        <td><strong>${utils.escapeHtml(v.VendorName)}</strong></td>
        <td>${utils.escapeHtml(v.ContactPerson || '-')}</td>
        <td>${utils.escapeHtml(v.Mobile || '-')}</td>
        <td>${utils.escapeHtml(v.GSTIN || '-')}</td>
        <td>${utils.escapeHtml(v.ItemsSupplied || '-')}</td>
        <td class="text-right num-font">${utils.formatCurrency(v.OpeningBalance)}</td>
        <td class="text-center"><span class="badge ${v.Status === 'ACTIVE' ? 'badge-success' : 'badge-secondary'}">${v.Status}</span></td>
        <td class="text-center" style="white-space:nowrap;">
          <div style="display:inline-flex; gap:6px; align-items:center;">
            <button class="action-icon view-icon view-vnd-btn" data-id="${v.VendorID}" title="View Vendor Details">
              <i class="fa-solid fa-eye"></i>
            </button>
            ${!v.IsDeleted && auth.can('vendors', 'update') ? `
            <button class="action-icon edit-icon edit-vnd-btn" data-id="${v.VendorID}" title="Edit Supplier">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>` : ''}
            ${!v.IsDeleted && auth.can('vendors', 'delete') ? `
            <button class="action-icon delete-icon del-vnd-btn" data-id="${v.VendorID}" title="Delete">
              <i class="fa-solid fa-trash"></i>
            </button>` : ''}
            ${v.IsDeleted && auth.getCurrentUser()?.role === 'ADMIN' ? `
            <button class="btn btn-success btn-sm restore-vnd-btn" data-id="${v.VendorID}" title="Restore">
              <i class="fa-solid fa-rotate-left"></i>
            </button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.view-vnd-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const obj = vendorList.find(x => x.VendorID === id);
        if (obj) this.viewVendorDetails(obj);
      });
    });

    tbody.querySelectorAll('.edit-vnd-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const obj = vendorList.find(x => x.VendorID === id);
        if (obj) this.openVendorModal(obj);
      });
    });

    tbody.querySelectorAll('.del-vnd-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const confirmed = await ui.confirm('Are you sure you want to delete this vendor?', 'Delete Vendor');
        if (confirmed) {
          const res = await api('deleteVendor', { VendorID: id });
          if (res.ok) {
            ui.success('Vendor deleted.');
            this.loadVendors();
          }
        }
      });
    });

    tbody.querySelectorAll('.restore-vnd-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const res = await api('restoreVendor', { VendorID: id });
        if (res.ok) {
          ui.success('Vendor restored.');
          this.loadVendors();
        }
      });
    });
  },

  async openVendorModal(vnd = null) {
    const isEdit = Boolean(vnd);
    const html = `
      <div style="display:flex; flex-direction:column; gap:6px; text-align:left;">
        <!-- Section 1: Company Profile -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-building"></i>
            <span>Supplier / Corporate Profile</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-industry"></i> Vendor / Company Name *</label>
              <input type="text" id="vm-name" class="form-control" placeholder="e.g. Maya Appliances Ltd." value="${vnd ? utils.escapeHtml(vnd.VendorName) : ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-user-tie"></i> Contact Person</label>
              <input type="text" id="vm-contact" class="form-control" placeholder="e.g. Rajesh Sharma" value="${vnd ? utils.escapeHtml(vnd.ContactPerson || '') : ''}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-phone"></i> Mobile Phone</label>
              <input type="tel" id="vm-mobile" class="form-control" placeholder="10-digit mobile" value="${vnd ? vnd.Mobile || '' : ''}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-receipt"></i> GSTIN Tax Number</label>
              <input type="text" id="vm-gstin" class="form-control" placeholder="15-digit GSTIN" value="${vnd ? vnd.GSTIN || '' : ''}">
            </div>
          </div>
        </div>

        <!-- Section 2: Items & Address -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-truck-field"></i>
            <span>Supply Catalog & Operating Address</span>
          </div>
          <div class="modal-section-body">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-boxes-stacked"></i> Items Supplied Catalog</label>
              <input type="text" id="vm-items" class="form-control" placeholder="e.g. Gas Stoves, Suraksha Hose, Regulators, Refill Valves" value="${vnd ? utils.escapeHtml(vnd.ItemsSupplied || '') : ''}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-location-dot"></i> Warehouse / Office Address</label>
              <input type="text" id="vm-addr" class="form-control" placeholder="Supplier city, industrial area, state" value="${vnd ? utils.escapeHtml(vnd.Address || '') : ''}">
            </div>
          </div>
        </div>
      </div>
    `;

    const result = await ui.formModal(html, isEdit ? `Edit Vendor: ${vnd.VendorName}` : 'Add Supplier', () => {
      const name = document.getElementById('vm-name').value.trim();
      if (!name) {
        Swal.showValidationMessage('Vendor name is required!');
        return false;
      }
      return {
        VendorID: isEdit ? vnd.VendorID : null,
        VendorName: name,
        ContactPerson: document.getElementById('vm-contact').value.trim(),
        Mobile: document.getElementById('vm-mobile').value.trim(),
        GSTIN: document.getElementById('vm-gstin').value.trim(),
        ItemsSupplied: document.getElementById('vm-items').value.trim(),
        Address: document.getElementById('vm-addr').value.trim()
      };
    });

    if (result) {
      const res = await api('saveVendor', result, { loaderMessage: 'Saving supplier...' });
      if (res.ok) {
        ui.success('Supplier profile saved.');
        this.loadVendors();
      }
    }
  },

  async openPurchaseModal() {
    const vndOptions = vendorList.map(v => `<option value="${v.VendorID}" data-name="${utils.escapeHtml(v.VendorName)}">${utils.escapeHtml(v.VendorName)}</option>`).join('');

    const html = `
      <div style="display:flex; flex-direction:column; gap:6px; text-align:left;">
        <!-- Section 1: Bill Identification -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-file-invoice"></i>
            <span>Supplier Invoice Details</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-building"></i> Supplier / Vendor *</label>
              <select id="pm-vendor" class="form-select" required>
                <option value="">-- Choose Vendor --</option>
                ${vndOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-hashtag"></i> Supplier Bill / Invoice No *</label>
              <input type="text" id="pm-inv-no" class="form-control" placeholder="e.g. INV-2024-908" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-calendar-day"></i> Plant Invoice Date *</label>
              <input type="date" id="pm-date" class="form-control" value="${utils.today()}">
              <small style="color:var(--text-muted); font-size:11px;">Date on supplier bill</small>
            </div>
          </div>
        </div>

        <!-- Section 2: Financials & Received Summary -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-money-check-dollar"></i>
            <span>Billing Amounts & Goods Received</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-indian-rupee-sign"></i> Total Invoice Amount (₹) *</label>
              <input type="number" id="pm-total" class="form-control num-font" placeholder="0.00" step="any" min="1" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-wallet"></i> Immediate Paid Amount (₹)</label>
              <input type="number" id="pm-paid" class="form-control num-font" placeholder="0.00" step="any" min="0" value="0">
            </div>
          </div>

          <div class="form-group" style="margin-top:10px;">
            <label class="form-label"><i class="fa-solid fa-dolly"></i> Items Received Summary & Batch Notes</label>
            <input type="text" id="pm-remarks" class="form-control" placeholder="e.g. 306 HP Gas 14.2 KG Domestic Cylinders received in sound condition">
          </div>
        </div>

        <!-- Section 3: Plant Cylinder Inward & 1:1 Empty Return (HPCL Integration) -->
        <div class="modal-section-card" style="border:1px solid #93c5fd; background:#f0f9ff;">
          <div class="modal-section-header" style="display:flex; justify-content:space-between; align-items:center;">
            <label style="display:flex; align-items:center; gap:8px; font-weight:800; color:#001f3f; cursor:pointer; margin:0;">
              <input type="checkbox" id="pm-plant-toggle" checked style="accent-color:#001f3f; width:16px; height:16px;">
              <span><i class="fa-solid fa-gas-pump text-primary"></i> Plant Cylinder Purchase (Auto Godown Inward & 1:1 Empty Return)</span>
            </label>
          </div>

          <div id="pm-plant-box" style="margin-top:10px;">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-warehouse text-primary"></i> Godown In Date (Physical Arrival) *</label>
                <input type="date" id="pm-godown-date" class="form-control" value="${utils.today()}" style="font-weight:700; border-color:var(--primary);">
                <small style="color:var(--text-muted); font-size:11px;">Stock physically increases on this date</small>
              </div>
              <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-truck"></i> Truck Number</label>
                <input type="text" id="pm-truck-no" class="form-control" placeholder="e.g. BR-07-GA-1234">
              </div>
              <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-id-badge"></i> Driver Name</label>
                <input type="text" id="pm-driver-name" class="form-control" placeholder="Driver Name">
              </div>
            </div>

            <!-- Cylinder Quantities 1:1 Equal Exchange Table -->
            <div style="margin-top:10px; border:1px solid #cbd5e1; border-radius:6px; overflow:hidden; background:#ffffff;">
              <table class="table table-sm" style="margin:0; font-size:12px;">
                <thead>
                  <tr style="background:#e2e8f0;">
                    <th>Cylinder Type</th>
                    <th class="text-center" style="color:var(--color-success); font-weight:700;">Filled Received (+Stock)</th>
                    <th class="text-center" style="color:var(--color-info); font-weight:700;">Sound Empty Return (-Empty)</th>
                    <th class="text-center" style="color:var(--color-danger); font-weight:700;">Defective Return (-Empty)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>14.2 KG Domestic</strong></td>
                    <td><input type="number" class="form-control form-control-sm text-center num-font pm-cyl-f" data-cyl="14.2 KG Domestic" value="306" min="0" style="width:85px; margin:auto;"></td>
                    <td><input type="number" class="form-control form-control-sm text-center num-font pm-cyl-e" data-cyl="14.2 KG Domestic" value="306" min="0" style="width:85px; margin:auto;"></td>
                    <td><input type="number" class="form-control form-control-sm text-center num-font pm-cyl-d" data-cyl="14.2 KG Domestic" value="0" min="0" style="width:85px; margin:auto;"></td>
                  </tr>
                  <tr>
                    <td><strong>19 KG Commercial</strong></td>
                    <td><input type="number" class="form-control form-control-sm text-center num-font pm-cyl-f" data-cyl="19 KG Commercial" value="0" min="0" style="width:85px; margin:auto;"></td>
                    <td><input type="number" class="form-control form-control-sm text-center num-font pm-cyl-e" data-cyl="19 KG Commercial" value="0" min="0" style="width:85px; margin:auto;"></td>
                    <td><input type="number" class="form-control form-control-sm text-center num-font pm-cyl-d" data-cyl="19 KG Commercial" value="0" min="0" style="width:85px; margin:auto;"></td>
                  </tr>
                  <tr>
                    <td><strong>5 KG Commercial</strong></td>
                    <td><input type="number" class="form-control form-control-sm text-center num-font pm-cyl-f" data-cyl="5 KG Commercial" value="0" min="0" style="width:85px; margin:auto;"></td>
                    <td><input type="number" class="form-control form-control-sm text-center num-font pm-cyl-e" data-cyl="5 KG Commercial" value="0" min="0" style="width:85px; margin:auto;"></td>
                    <td><input type="number" class="form-control form-control-sm text-center num-font pm-cyl-d" data-cyl="5 KG Commercial" value="0" min="0" style="width:85px; margin:auto;"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style="font-size:11px; color:#0369a1; margin-top:6px; font-weight:600;">
              <i class="fa-solid fa-circle-info"></i> 1:1 Equal Rule Active: Sound empties returned automatically match filled received for HPCL Bottling truck exchange.
            </div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const toggle = document.getElementById('pm-plant-toggle');
      const box = document.getElementById('pm-plant-box');
      if (toggle && box) {
        toggle.addEventListener('change', () => {
          box.style.display = toggle.checked ? 'block' : 'none';
        });
      }

      // Auto 1:1 exchange listener on filled input
      document.querySelectorAll('.pm-cyl-f').forEach(fEl => {
        fEl.addEventListener('input', (e) => {
          const cyl = e.target.dataset.cyl;
          const eEl = document.querySelector(`.pm-cyl-e[data-cyl="${cyl}"]`);
          const dEl = document.querySelector(`.pm-cyl-d[data-cyl="${cyl}"]`);
          const fVal = parseInt(e.target.value) || 0;
          const dVal = parseInt(dEl?.value) || 0;
          if (eEl) {
            eEl.value = Math.max(0, fVal - dVal);
          }
        });
      });

      // Defective updates sound empty to keep total equal
      document.querySelectorAll('.pm-cyl-d').forEach(dEl => {
        dEl.addEventListener('input', (e) => {
          const cyl = e.target.dataset.cyl;
          const fEl = document.querySelector(`.pm-cyl-f[data-cyl="${cyl}"]`);
          const eEl = document.querySelector(`.pm-cyl-e[data-cyl="${cyl}"]`);
          const fVal = parseInt(fEl?.value) || 0;
          const dVal = parseInt(e.target.value) || 0;
          if (eEl) {
            eEl.value = Math.max(0, fVal - dVal);
          }
        });
      });
    }, 150);

    const data = await ui.formModal(html, 'Record Purchase / Stock Inwards', () => {
      const vId = parseInt(document.getElementById('pm-vendor').value);
      const invNo = document.getElementById('pm-inv-no').value.trim();
      const total = parseFloat(document.getElementById('pm-total').value);
      if (!vId || !invNo || !total || total <= 0) {
        Swal.showValidationMessage('Vendor, invoice number and positive total amount are required!');
        return false;
      }

      const isPlant = document.getElementById('pm-plant-toggle')?.checked || false;
      const cylItems = [];
      if (isPlant) {
        const godownDate = document.getElementById('pm-godown-date')?.value;
        if (!godownDate) {
          Swal.showValidationMessage('Godown in date is required for plant cylinder purchase!');
          return false;
        }

        document.querySelectorAll('.pm-cyl-f').forEach(fEl => {
          const cyl = fEl.dataset.cyl;
          const eEl = document.querySelector(`.pm-cyl-e[data-cyl="${cyl}"]`);
          const dEl = document.querySelector(`.pm-cyl-d[data-cyl="${cyl}"]`);
          const fQty = parseInt(fEl.value) || 0;
          const eQty = parseInt(eEl?.value) || 0;
          const dQty = parseInt(dEl?.value) || 0;
          if (fQty > 0 || eQty > 0 || dQty > 0) {
            cylItems.push({
              CylinderType: cyl,
              FilledQty: fQty,
              EmptyQty: eQty,
              DefectiveQty: dQty
            });
          }
        });
      }

      return {
        VendorID: vId,
        InvoiceNumber: invNo,
        PurchaseDate: document.getElementById('pm-date').value,
        TotalAmount: total,
        PaidAmount: parseFloat(document.getElementById('pm-paid').value) || 0,
        Remarks: document.getElementById('pm-remarks').value.trim(),
        IsPlantCylinderPurchase: isPlant ? 1 : 0,
        GodownDate: document.getElementById('pm-godown-date')?.value || document.getElementById('pm-date').value,
        TruckNumber: document.getElementById('pm-truck-no')?.value.trim() || '',
        DriverName: document.getElementById('pm-driver-name')?.value.trim() || '',
        CylinderItems: cylItems
      };
    });

    if (data) {
      const res = await api('savePurchase', data, { loaderMessage: 'Saving purchase receipt...' });
      if (res.ok) {
        ui.success(res.message || 'Purchase invoice recorded successfully.');
        this.loadVendors();
      }
    }
  },

  viewVendorDetails(v) {
    const html = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="background:var(--color-surface-subtle); padding:16px; border-radius:var(--r-md); display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border-color);">
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Vendor / Supplier</div>
            <div style="font-size:18px; font-weight:800; color:var(--primary);">${utils.escapeHtml(v.VendorName)}</div>
          </div>
          <div>
            <span class="badge ${v.Status === 'ACTIVE' ? 'badge-success' : 'badge-secondary'}">${v.Status}</span>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
          <div style="background:var(--color-surface); border:1px solid var(--border-color); border-radius:var(--r-sm); padding:12px;">
            <div style="font-size:11px; color:var(--text-muted); font-weight:700;">CONTACT PERSON</div>
            <div style="font-size:14px; font-weight:700;">${utils.escapeHtml(v.ContactPerson || '-')}</div>
          </div>
          <div style="background:var(--color-surface); border:1px solid var(--border-color); border-radius:var(--r-sm); padding:12px;">
            <div style="font-size:11px; color:var(--text-muted); font-weight:700;">MOBILE NUMBER</div>
            <div style="font-size:14px; font-weight:700;">${utils.escapeHtml(v.Mobile || '-')}</div>
          </div>
          <div style="background:var(--color-surface); border:1px solid var(--border-color); border-radius:var(--r-sm); padding:12px;">
            <div style="font-size:11px; color:var(--text-muted); font-weight:700;">GSTIN NUMBER</div>
            <div style="font-size:14px; font-weight:700;">${utils.escapeHtml(v.GSTIN || '-')}</div>
          </div>
          <div style="background:var(--color-surface); border:1px solid var(--border-color); border-radius:var(--r-sm); padding:12px;">
            <div style="font-size:11px; color:var(--text-muted); font-weight:700;">ITEMS SUPPLIED</div>
            <div style="font-size:14px; font-weight:700;">${utils.escapeHtml(v.ItemsSupplied || '-')}</div>
          </div>
        </div>

        <div style="background:var(--color-surface-subtle); padding:16px; border-radius:var(--r-md); border:1px solid var(--border-color);">
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
            <span>Opening Ledger Balance:</span>
            <strong class="num-font">${utils.formatCurrency(v.OpeningBalance || 0)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 0;">
            <span>Supplier Address:</span>
            <span>${utils.escapeHtml(v.Address || 'N/A')}</span>
          </div>
        </div>
      </div>
    `;

    ui.viewDetails(`Supplier: ${v.VendorName}`, html);
  }
};
