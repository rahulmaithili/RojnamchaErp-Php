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

    // 1. Fetch all active catalog items so user can choose ANY product added to the system
    let catalogItems = [];
    try {
      const itRes = await api('listItems', { status: 'active' }, { loader: false });
      if (itRes && itRes.ok && Array.isArray(itRes.data)) {
        catalogItems = itRes.data;
      }
    } catch(e) {}

    const catalogOptions = catalogItems.map(it => `
      <option value="${it.ItemID}">
        ${utils.escapeHtml(it.ItemName)} (${it.Category || 'EQUIPMENT'}) — ₹${it.Rate || 0}
      </option>
    `).join('');

    // Pre-populate with standard cylinders so truck exchange is ready
    let purchaseItems = [
      {
        ItemID: catalogItems.find(i => (i.CylinderType || '').includes('14.2') || (i.ItemName || '').includes('14.2'))?.ItemID || null,
        ItemName: '14.2 KG Domestic',
        Category: 'CYLINDER',
        CylinderType: '14.2 KG Domestic',
        FilledQty: 306,
        EmptyQty: 306,
        DefectiveQty: 0,
        Rate: 850.50,
        Total: 306 * 850.50
      },
      {
        ItemID: catalogItems.find(i => (i.CylinderType || '').includes('19') || (i.ItemName || '').includes('19'))?.ItemID || null,
        ItemName: '19 KG Commercial',
        Category: 'CYLINDER',
        CylinderType: '19 KG Commercial',
        FilledQty: 0,
        EmptyQty: 0,
        DefectiveQty: 0,
        Rate: 1850.00,
        Total: 0
      },
      {
        ItemID: catalogItems.find(i => (i.CylinderType || '').includes('5') || (i.ItemName || '').includes('5 KG'))?.ItemID || null,
        ItemName: '5 KG Commercial',
        Category: 'CYLINDER',
        CylinderType: '5 KG Commercial',
        FilledQty: 0,
        EmptyQty: 0,
        DefectiveQty: 0,
        Rate: 425.00,
        Total: 0
      }
    ];

    const html = `
      <div style="display:flex; flex-direction:column; gap:12px; text-align:left;">
        <!-- Top Landscape Row: Supplier Details & Logistics -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <!-- Left: Invoice Identification -->
          <div class="modal-section-card" style="margin:0;">
            <div class="modal-section-header">
              <i class="fa-solid fa-file-invoice"></i>
              <span>Supplier & Invoice Details</span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div class="form-group" style="grid-column:1 / -1;">
                <label class="form-label"><i class="fa-solid fa-building"></i> Supplier / Vendor *</label>
                <select id="pm-vendor" class="form-select" required>
                  <option value="">-- Choose Vendor / Plant --</option>
                  ${vndOptions}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-hashtag"></i> Supplier Bill / Invoice No *</label>
                <input type="text" id="pm-inv-no" class="form-control" placeholder="e.g. INV-2026-908" required>
              </div>
              <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-calendar-day"></i> Plant Invoice Date *</label>
                <input type="date" id="pm-date" class="form-control" value="${utils.today()}">
              </div>
            </div>
          </div>

          <!-- Right: Godown In & Logistics -->
          <div class="modal-section-card" style="margin:0;">
            <div class="modal-section-header">
              <i class="fa-solid fa-truck-ramp-box"></i>
              <span>Godown Receipt & Truck Details</span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-warehouse text-primary"></i> Godown In Date (Physical Arrival) *</label>
                <input type="date" id="pm-godown-date" class="form-control" value="${utils.today()}" style="font-weight:700; border-color:var(--primary);">
              </div>
              <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-truck"></i> Truck Number</label>
                <input type="text" id="pm-truck-no" class="form-control" placeholder="e.g. BR-07-GA-1234">
              </div>
              <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-id-badge"></i> Driver Name</label>
                <input type="text" id="pm-driver-name" class="form-control" placeholder="Driver Name">
              </div>
              <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-note-sticky"></i> Batch Remarks</label>
                <input type="text" id="pm-remarks" class="form-control" placeholder="e.g. HPCL Plant Inward">
              </div>
            </div>
          </div>
        </div>

        <!-- Section 2: Product Catalog Inwards & 1:1 Empty Return -->
        <div class="modal-section-card" style="border:1px solid #93c5fd; background:#f8fafc;">
          <div class="modal-section-header" style="justify-content:space-between; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-boxes-stacked text-primary"></i>
              <span>Inward Products & Cylinder 1:1 Return Exchange</span>
            </div>
            <span style="font-size:11.5px; color:#0369a1; font-weight:700;">
              <i class="fa-solid fa-circle-check"></i> HPCL Bottling Truck 1:1 Exchange Active
            </span>
          </div>

          <!-- Product Selector Row from Item Master Catalog -->
          <div style="display:flex; gap:10px; align-items:flex-end; background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:10px 14px; margin-bottom:12px;">
            <div style="flex:1;">
              <label style="font-size:12px; font-weight:700; color:#1e40af; margin-bottom:4px; display:block;">
                <i class="fa-solid fa-cart-plus"></i> Select Any Product / Accessory from Catalog to Add:
              </label>
              <select id="pm-catalog-select" class="form-select form-select-sm" style="font-size:12.5px;">
                <option value="">-- Choose Any Product from Catalog --</option>
                ${catalogOptions}
              </select>
            </div>
            <button type="button" id="pm-add-catalog-btn" class="btn btn-primary btn-sm" style="height:32px; padding:0 14px; white-space:nowrap;">
              <i class="fa-solid fa-plus"></i> Add Product to Invoice
            </button>
          </div>

          <!-- Expansive Landscape Items Table -->
          <div style="border:1px solid var(--border); border-radius:6px; background:#fff; overflow:hidden;">
            <table class="table table-sm" style="margin:0; font-size:12px; width:100%;">
              <thead>
                <tr style="background:#e2e8f0;">
                  <th style="min-width:200px;">Product / Item Name</th>
                  <th style="width:110px;">Category</th>
                  <th style="width:120px; text-align:center; color:var(--color-success); font-weight:700;">Filled Received (+Stock)</th>
                  <th style="width:120px; text-align:center; color:var(--color-info); font-weight:700;">Sound Empty Return (-Empty)</th>
                  <th style="width:110px; text-align:center; color:var(--color-danger); font-weight:700;">Defective Return (-Empty)</th>
                  <th style="width:105px; text-align:right;">Rate (₹)</th>
                  <th style="width:120px; text-align:right;">Total (₹)</th>
                  <th style="width:40px; text-align:center;"></th>
                </tr>
              </thead>
              <tbody id="pm-items-table-body">
              </tbody>
            </table>
          </div>

          <!-- Bottom Financials & Totals Row -->
          <div style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap:12px; margin-top:12px; align-items:center; background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:12px 16px;">
            <div style="font-size:12px; color:#475569;">
              <span id="pm-total-cyl-badge" class="badge" style="background:#0284c7; color:#fff; font-size:11.5px; margin-right:8px;">306 Filled Cylinders</span>
              <span id="pm-total-empty-badge" class="badge" style="background:#059669; color:#fff; font-size:11.5px;">306 Empties Returned</span>
            </div>
            <div>
              <label class="form-label" style="font-size:11.5px; margin-bottom:2px; font-weight:700;">Total Invoice Amount (₹) *</label>
              <input type="number" id="pm-total" class="form-control form-control-sm num-font" placeholder="0.00" step="any" min="1" required style="font-size:14px; font-weight:800; color:#0f172a;">
            </div>
            <div>
              <label class="form-label" style="font-size:11.5px; margin-bottom:2px; font-weight:700;">Paid Amount (₹)</label>
              <input type="number" id="pm-paid" class="form-control form-control-sm num-font" placeholder="0.00" step="any" min="0" value="0" style="font-size:14px;">
            </div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const tbody = document.getElementById('pm-items-table-body');
      const addSel = document.getElementById('pm-catalog-select');
      const addBtn = document.getElementById('pm-add-catalog-btn');
      const totalIn = document.getElementById('pm-total');
      const cylBadge = document.getElementById('pm-total-cyl-badge');
      const emptyBadge = document.getElementById('pm-total-empty-badge');

      const renderTable = () => {
        if (!tbody) return;
        if (!purchaseItems.length) {
          tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding:16px; color:var(--text-muted);">No products in invoice. Add items above.</td></tr>';
          if (totalIn) totalIn.value = '0.00';
          return;
        }

        tbody.innerHTML = purchaseItems.map((it, idx) => {
          const isCyl = (it.Category === 'CYLINDER') || Boolean(it.CylinderType);
          return `
            <tr>
              <td><strong>${utils.escapeHtml(it.ItemName)}</strong></td>
              <td><span class="badge ${isCyl ? 'badge-primary' : 'badge-info'}" style="font-size:10px;">${it.Category || 'EQUIPMENT'}</span></td>
              <td class="text-center">
                <input type="number" class="form-control form-control-sm text-center num-font p-in-f" data-idx="${idx}" value="${it.FilledQty}" min="0" style="width:85px; margin:auto; font-weight:700;">
              </td>
              <td class="text-center">
                ${isCyl ? `
                  <input type="number" class="form-control form-control-sm text-center num-font p-in-e" data-idx="${idx}" value="${it.EmptyQty}" min="0" style="width:85px; margin:auto;">
                ` : `<span style="color:#94a3b8; font-weight:600;">—</span>`}
              </td>
              <td class="text-center">
                ${isCyl ? `
                  <input type="number" class="form-control form-control-sm text-center num-font p-in-d" data-idx="${idx}" value="${it.DefectiveQty}" min="0" style="width:80px; margin:auto;">
                ` : `<span style="color:#94a3b8; font-weight:600;">—</span>`}
              </td>
              <td class="text-right">
                <input type="number" class="form-control form-control-sm text-right num-font p-in-r" data-idx="${idx}" value="${it.Rate}" min="0" step="any" style="width:95px; margin-left:auto;">
              </td>
              <td class="text-right num-font" style="font-weight:700; vertical-align:middle;">
                ${utils.formatCurrency(it.Total)}
              </td>
              <td class="text-center" style="vertical-align:middle;">
                <button type="button" class="btn btn-outline btn-sm p-in-del" data-idx="${idx}" style="color:var(--color-danger); border:none; padding:2px 6px;">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </td>
            </tr>
          `;
        }).join('');

        // Compute totals
        const grandSum = purchaseItems.reduce((acc, i) => acc + (Number(i.Total) || 0), 0);
        if (totalIn && document.activeElement !== totalIn) {
          totalIn.value = grandSum.toFixed(2);
        }

        const totalFilledCyl = purchaseItems.filter(i => i.Category === 'CYLINDER' || i.CylinderType).reduce((acc, i) => acc + (Number(i.FilledQty) || 0), 0);
        const totalEmptyRet = purchaseItems.filter(i => i.Category === 'CYLINDER' || i.CylinderType).reduce((acc, i) => acc + ((Number(i.EmptyQty) || 0) + (Number(i.DefectiveQty) || 0)), 0);

        if (cylBadge) cylBadge.textContent = `${totalFilledCyl} Filled Cylinders`;
        if (emptyBadge) emptyBadge.textContent = `${totalEmptyRet} Empties Returned`;

        // Bind events
        tbody.querySelectorAll('.p-in-f').forEach(inp => {
          inp.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const val = Math.max(0, parseInt(e.target.value) || 0);
            purchaseItems[idx].FilledQty = val;
            // 1:1 auto sound empty rule for cylinders
            if (purchaseItems[idx].Category === 'CYLINDER' || purchaseItems[idx].CylinderType) {
              const def = purchaseItems[idx].DefectiveQty || 0;
              purchaseItems[idx].EmptyQty = Math.max(0, val - def);
            }
            purchaseItems[idx].Total = val * (purchaseItems[idx].Rate || 0);
            renderTable();
          });
        });

        tbody.querySelectorAll('.p-in-e').forEach(inp => {
          inp.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            purchaseItems[idx].EmptyQty = Math.max(0, parseInt(e.target.value) || 0);
            renderTable();
          });
        });

        tbody.querySelectorAll('.p-in-d').forEach(inp => {
          inp.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const defVal = Math.max(0, parseInt(e.target.value) || 0);
            purchaseItems[idx].DefectiveQty = defVal;
            const filled = purchaseItems[idx].FilledQty || 0;
            purchaseItems[idx].EmptyQty = Math.max(0, filled - defVal);
            renderTable();
          });
        });

        tbody.querySelectorAll('.p-in-r').forEach(inp => {
          inp.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const rate = Math.max(0, parseFloat(e.target.value) || 0);
            purchaseItems[idx].Rate = rate;
            purchaseItems[idx].Total = (purchaseItems[idx].FilledQty || 0) * rate;
            renderTable();
          });
        });

        tbody.querySelectorAll('.p-in-del').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            purchaseItems.splice(idx, 1);
            renderTable();
          });
        });
      };

      addBtn?.addEventListener('click', () => {
        const itId = parseInt(addSel?.value);
        if (!itId) return;
        const itObj = catalogItems.find(i => Number(i.ItemID) === itId);
        if (itObj) {
          const isCyl = (itObj.Category === 'CYLINDER') || Boolean(itObj.CylinderType);
          purchaseItems.push({
            ItemID: itObj.ItemID,
            ItemName: itObj.ItemName,
            Category: itObj.Category || 'EQUIPMENT',
            CylinderType: itObj.CylinderType || (isCyl ? itObj.ItemName : null),
            FilledQty: 1,
            EmptyQty: isCyl ? 1 : 0,
            DefectiveQty: 0,
            Rate: Number(itObj.Rate) || 0,
            Total: Number(itObj.Rate) || 0
          });
          if (addSel) addSel.value = '';
          renderTable();
        }
      });

      renderTable();
    }, 150);

    const data = await ui.formModal(html, 'Record Purchase / Stock Inwards', () => {
      const vId = parseInt(document.getElementById('pm-vendor').value);
      const invNo = document.getElementById('pm-inv-no').value.trim();
      const total = parseFloat(document.getElementById('pm-total').value);
      if (!vId || !invNo || !total || total <= 0) {
        Swal.showValidationMessage('Vendor, invoice number and positive total amount are required!');
        return false;
      }

      const godownDate = document.getElementById('pm-godown-date')?.value || document.getElementById('pm-date').value;

      const cylItems = [];
      const invoiceItems = [];

      purchaseItems.forEach(p => {
        const qty = p.FilledQty || 0;
        if (qty > 0 || (p.EmptyQty || 0) > 0 || (p.DefectiveQty || 0) > 0) {
          if (p.Category === 'CYLINDER' || p.CylinderType) {
            cylItems.push({
              CylinderType: p.CylinderType || p.ItemName,
              FilledQty: qty,
              EmptyQty: p.EmptyQty || 0,
              DefectiveQty: p.DefectiveQty || 0
            });
          }
          if (qty > 0) {
            invoiceItems.push({
              ItemID: p.ItemID || 0,
              ItemName: p.ItemName,
              Quantity: qty,
              Rate: p.Rate || 0,
              Total: p.Total || (qty * (p.Rate || 0))
            });
          }
        }
      });

      return {
        VendorID: vId,
        InvoiceNumber: invNo,
        PurchaseDate: document.getElementById('pm-date').value,
        TotalAmount: total,
        PaidAmount: parseFloat(document.getElementById('pm-paid').value) || 0,
        Remarks: document.getElementById('pm-remarks').value.trim(),
        IsPlantCylinderPurchase: cylItems.length > 0 ? 1 : 0,
        GodownDate: godownDate,
        TruckNumber: document.getElementById('pm-truck-no')?.value.trim() || '',
        DriverName: document.getElementById('pm-driver-name')?.value.trim() || '',
        CylinderItems: cylItems,
        items: invoiceItems
      };
    }, { maxWidth: '1080px' });

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
