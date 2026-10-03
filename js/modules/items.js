/**
 * SHIV SHAKTI HP GAS - ITEMS & RATES MASTER MODULE
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { utils } from '../utils.js';
import { auth } from '../auth.js';

let itemsList = [];

export const itemsModule = {
  async init() {
    this.renderContainer();
    await this.loadItems();
  },

  renderContainer() {
    const root = document.getElementById('view-items');
    if (!root) return;

    root.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);">Items & Rates Master Catalog</h2>
            <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Official pricing catalog for domestic/commercial refills, deposits, regulators, stoves & statutory fees</p>
          </div>
          <div>
            <button id="item-create-btn" class="btn btn-primary btn-sm" ${auth.getCurrentUser()?.role !== 'ADMIN' ? 'disabled' : ''}>
              <i class="fa-solid fa-plus"></i> Add Product / Cylinder
            </button>
          </div>
        </div>
      </div>

      <!-- Filters Toolbar -->
      <div class="card" style="margin-bottom:16px; padding:14px 20px;">
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
          <input type="text" id="item-search-input" class="form-control" placeholder="Search item code or name..." style="flex:1; min-width:240px;">
          <select id="item-category-filter" class="form-select" style="width:180px;">
            <option value="all">All Categories</option>
            <option value="SALE">SALE (Refills)</option>
            <option value="SECURITY_DEPOSIT">SECURITY DEPOSIT</option>
            <option value="SERVICE">SERVICE / CHARGES</option>
            <option value="ACCESSORY">ACCESSORY / APPLIANCE</option>
          </select>
          <select id="item-status-filter" class="form-select" style="width:130px;">
            <option value="active" selected>Active</option>
            <option value="deleted">Trash</option>
          </select>
          <button id="item-refresh-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-arrows-rotate"></i></button>
        </div>
      </div>

      <!-- Items Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Cylinder Variant</th>
                <th class="text-right">Current Rate</th>
                <th class="text-center">GST %</th>
                <th class="text-center">SV Package</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody id="item-table-body">
              <tr><td colspan="8" class="text-center" style="color:var(--text-muted); padding:24px;">Loading item rates catalog...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('item-create-btn').addEventListener('click', () => this.openItemModal());
    document.getElementById('item-search-input').addEventListener('input', utils.debounce((e) => {
      this.loadItems(e.target.value);
    }, 300));
    document.getElementById('item-category-filter').addEventListener('change', () => this.loadItems());
    document.getElementById('item-status-filter').addEventListener('change', () => this.loadItems());
    document.getElementById('item-refresh-btn').addEventListener('click', () => this.loadItems());
  },

  async loadItems(search = '') {
    const cat = document.getElementById('item-category-filter')?.value || 'all';
    const status = document.getElementById('item-status-filter')?.value || 'active';

    const res = await api('listItems', { category: cat, status, search }, { loader: false });
    const tbody = document.getElementById('item-table-body');
    if (!tbody) return;

    if (!res.ok || !res.data || !res.data.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding:24px; color:var(--text-muted);">No items found in catalog.</td></tr>';
      itemsList = [];
      return;
    }

    itemsList = res.data;
    tbody.innerHTML = itemsList.map(it => `
      <tr style="${it.IsDeleted ? 'opacity:0.6;' : ''}">
        <td><strong>${utils.escapeHtml(it.ItemCode)}</strong></td>
        <td><strong>${utils.escapeHtml(it.ItemName)}</strong></td>
        <td><span class="badge badge-info">${it.Category}</span></td>
        <td>${utils.escapeHtml(it.CylinderType || '-')}</td>
        <td class="text-right num-font" style="font-weight:700; color:var(--primary); font-size:15px;">${utils.formatCurrency(it.Rate)}</td>
        <td class="text-center num-font">${it.TaxPercent}%</td>
        <td class="text-center">${it.IsPackageItem ? '<span class="badge badge-success">INCLUDED</span>' : '-'}</td>
        <td class="text-center">
          <button class="btn btn-secondary btn-sm view-rate-hist-btn" data-id="${it.ItemID}" data-code="${it.ItemCode}" title="Rate History">
            <i class="fa-solid fa-clock-rotate-left"></i>
          </button>
          ${!it.IsDeleted && auth.getCurrentUser()?.role === 'ADMIN' ? `
          <button class="btn btn-primary btn-sm update-rate-btn" data-id="${it.ItemID}" title="Revise Rate">
            <i class="fa-solid fa-indian-rupee-sign"></i>
          </button>
          <button class="btn btn-secondary btn-sm edit-item-btn" data-id="${it.ItemID}" title="Edit Item Details">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-danger btn-sm del-item-btn" data-id="${it.ItemID}" title="Delete Item">
            <i class="fa-solid fa-trash"></i>
          </button>` : ''}
          ${it.IsDeleted && auth.getCurrentUser()?.role === 'ADMIN' ? `
          <button class="btn btn-success btn-sm restore-item-btn" data-id="${it.ItemID}" title="Restore">
            <i class="fa-solid fa-rotate-left"></i>
          </button>` : ''}
        </td>
      </tr>
    `).join('');

    // Bind item buttons
    tbody.querySelectorAll('.view-rate-hist-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const code = e.currentTarget.dataset.code;
        this.openRateHistoryModal(id, code);
      });
    });

    tbody.querySelectorAll('.update-rate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const obj = itemsList.find(i => i.ItemID === id);
        if (obj) this.openReviseRateModal(obj);
      });
    });

    tbody.querySelectorAll('.edit-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const obj = itemsList.find(i => i.ItemID === id);
        if (obj) this.openItemModal(obj);
      });
    });

    tbody.querySelectorAll('.del-item-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const confirmed = await ui.confirm('Are you sure you want to remove this item?', 'Delete Item');
        if (confirmed) {
          const res = await api('deleteItem', { ItemID: id });
          if (res.ok) {
            ui.success('Item deleted.');
            this.loadItems();
          }
        }
      });
    });

    tbody.querySelectorAll('.restore-item-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const res = await api('restoreItem', { ItemID: id });
        if (res.ok) {
          ui.success('Item restored.');
          this.loadItems();
        }
      });
    });
  },

  async openReviseRateModal(item) {
    const oldRate = parseFloat(item.Rate) || 0;
    const html = `
      <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
        <!-- Card 1: Product Header -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-box-open"></i>
            <span>Current Product Price Position</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0;">
            <div>
              <div style="font-weight:700; font-size:15px; color:var(--navy-primary);">${utils.escapeHtml(item.ItemName)}</div>
              <div style="font-size:11px; color:var(--text-muted); font-family:var(--font-mono);">${item.ItemCode} &bull; ${item.Category} ${item.CylinderType ? `&bull; ${item.CylinderType}` : ''}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Current Active Rate</div>
              <div class="num-font" style="font-size:18px; font-weight:900; color:var(--navy-accent);">${utils.formatCurrency(oldRate)}</div>
            </div>
          </div>
        </div>

        <!-- Card 2: New Price & Dynamic Up/Down Indicator -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-arrow-trend-up"></i>
            <span>Set / Revise Selling Price (Up / Down)</span>
          </div>
          <div class="modal-section-body">
            <div class="form-group">
              <label class="form-label" style="font-weight:700;"><i class="fa-solid fa-indian-rupee-sign"></i> New Selling Rate (₹) *</label>
              <input type="number" id="rr-rate" class="form-control num-font" value="${oldRate}" min="0" step="any" required style="font-size:18px; font-weight:800;">
            </div>

            <!-- Quick Adjust Pills -->
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
              <button type="button" class="btn btn-outline btn-sm rr-delta-btn" data-delta="10" style="font-size:11px; padding:3px 8px;">+₹10</button>
              <button type="button" class="btn btn-outline btn-sm rr-delta-btn" data-delta="25" style="font-size:11px; padding:3px 8px;">+₹25</button>
              <button type="button" class="btn btn-outline btn-sm rr-delta-btn" data-delta="50" style="font-size:11px; padding:3px 8px;">+₹50</button>
              <button type="button" class="btn btn-outline btn-sm rr-delta-btn" data-delta="-10" style="font-size:11px; padding:3px 8px;">-₹10</button>
              <button type="button" class="btn btn-outline btn-sm rr-delta-btn" data-delta="-25" style="font-size:11px; padding:3px 8px;">-₹25</button>
              <button type="button" class="btn btn-outline btn-sm rr-delta-btn" data-delta="-50" style="font-size:11px; padding:3px 8px;">-₹50</button>
              <button type="button" class="btn btn-outline btn-sm rr-delta-pct-btn" data-pct="5" style="font-size:11px; padding:3px 8px;">+5%</button>
              <button type="button" class="btn btn-outline btn-sm rr-delta-pct-btn" data-pct="-5" style="font-size:11px; padding:3px 8px;">-5%</button>
            </div>

            <!-- Dynamic Price Trend Banner -->
            <div id="rr-trend-banner" style="padding:10px 14px; border-radius:6px; background:#f8fafc; border:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span style="font-size:10.5px; text-transform:uppercase; font-weight:700; color:#64748b;">Price Trend</span>
                <div id="rr-trend-label" style="font-size:13px; font-weight:800; color:#475569;">No Price Change</div>
              </div>
              <div id="rr-diff-badge" style="font-size:12px; font-weight:800; font-family:var(--font-mono); padding:4px 10px; border-radius:4px; background:#f1f5f9; color:#475569;">
                ₹0.00 (0.00%)
              </div>
            </div>

            <!-- Reason & Preset Chips -->
            <div class="form-group" style="margin-top:12px;">
              <label class="form-label" style="font-weight:700;"><i class="fa-solid fa-file-signature"></i> Price Revision Justification / Reason *</label>
              <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
                <button type="button" class="btn btn-secondary btn-sm rr-chip-btn" data-reason="Monthly HPCL PSU Tariff Revision" style="font-size:10px; padding:2px 8px;">HPCL Tariff Revision</button>
                <button type="button" class="btn btn-secondary btn-sm rr-chip-btn" data-reason="Commercial LPG Market Price Fluctuation" style="font-size:10px; padding:2px 8px;">Commercial Price Fluctuation</button>
                <button type="button" class="btn btn-secondary btn-sm rr-chip-btn" data-reason="Domestic Subsidized Rate Adjustment" style="font-size:10px; padding:2px 8px;">Domestic Rate Adjustment</button>
                <button type="button" class="btn btn-secondary btn-sm rr-chip-btn" data-reason="Statutory GST / Transportation Update" style="font-size:10px; padding:2px 8px;">GST / Freight Update</button>
              </div>
              <textarea id="rr-reason" class="form-control" rows="2" placeholder="e.g. Monthly HPCL PSU price revision or commercial tariff change..." required></textarea>
              <div class="form-hint">This revision will be permanently audited and recorded in the Rate History ledger.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const rateInput = document.getElementById('rr-rate');
      const trendLabel = document.getElementById('rr-trend-label');
      const diffBadge = document.getElementById('rr-diff-badge');
      const trendBanner = document.getElementById('rr-trend-banner');

      const updateTrend = () => {
        const newRate = parseFloat(rateInput.value) || 0;
        const diff = newRate - oldRate;
        const pct = oldRate > 0 ? ((diff / oldRate) * 100) : 0;

        if (diff > 0) {
          trendLabel.innerHTML = `<span style="color:#16a34a;"><i class="fa-solid fa-arrow-trend-up"></i> Price Up (+₹${diff.toFixed(2)})</span>`;
          diffBadge.style.background = '#dcfce7';
          diffBadge.style.color = '#15803d';
          diffBadge.textContent = `+₹${diff.toFixed(2)} (+${pct.toFixed(2)}%)`;
          trendBanner.style.background = '#f0fdf4';
          trendBanner.style.borderColor = '#bbf7d0';
        } else if (diff < 0) {
          trendLabel.innerHTML = `<span style="color:#dc2626;"><i class="fa-solid fa-arrow-trend-down"></i> Price Down (-₹${Math.abs(diff).toFixed(2)})</span>`;
          diffBadge.style.background = '#fee2e2';
          diffBadge.style.color = '#b91c1c';
          diffBadge.textContent = `-₹${Math.abs(diff).toFixed(2)} (${pct.toFixed(2)}%)`;
          trendBanner.style.background = '#fef2f2';
          trendBanner.style.borderColor = '#fecaca';
        } else {
          trendLabel.innerHTML = '<span>No Price Change</span>';
          diffBadge.style.background = '#f1f5f9';
          diffBadge.style.color = '#475569';
          diffBadge.textContent = '₹0.00 (0.00%)';
          trendBanner.style.background = '#f8fafc';
          trendBanner.style.borderColor = '#e2e8f0';
        }
      };

      rateInput?.addEventListener('input', updateTrend);

      // Delta button handlers
      document.querySelectorAll('.rr-delta-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const delta = parseFloat(e.currentTarget.dataset.delta) || 0;
          const cur = parseFloat(rateInput.value) || 0;
          rateInput.value = Math.max(0, cur + delta).toFixed(2);
          updateTrend();
        });
      });

      // Delta percentage handlers
      document.querySelectorAll('.rr-delta-pct-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const pct = parseFloat(e.currentTarget.dataset.pct) || 0;
          const cur = parseFloat(rateInput.value) || 0;
          rateInput.value = Math.max(0, cur * (1 + pct / 100)).toFixed(2);
          updateTrend();
        });
      });

      // Reason chips handlers
      document.querySelectorAll('.rr-chip-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const reasonInput = document.getElementById('rr-reason');
          if (reasonInput) reasonInput.value = e.currentTarget.dataset.reason;
        });
      });
    }, 100);

    const data = await ui.formModal(html, `Set / Revise Price: ${item.ItemName}`, () => {
      const rate = parseFloat(document.getElementById('rr-rate').value);
      const reason = document.getElementById('rr-reason').value.trim();
      if (rate === undefined || isNaN(rate) || rate < 0) {
        Swal.showValidationMessage('Enter a valid non-negative rate!');
        return false;
      }
      if (!reason) {
        Swal.showValidationMessage('Mandatory explanation reason is required for rate revisions!');
        return false;
      }
      return {
        ItemID: item.ItemID,
        NewRate: rate,
        Reason: reason
      };
    });

    if (data) {
      const res = await api('adminUpdateRates', data, { loaderMessage: 'Updating product rate master...' });
      if (res.ok) {
        ui.success('Rate revised and permanently recorded in rate history audit.');
        this.loadItems();
      }
    }
  },

  async openRateHistoryModal(itemId, itemCode) {
    const res = await api('getRateHistory', { ItemID: itemId }, { loaderMessage: 'Loading rate history...' });
    if (!res.ok || !res.data) return;

    const list = res.data;
    const rows = list.map(h => `
      <tr>
        <td>${utils.formatDate(h.ChangedAt?.substring(0, 10))}</td>
        <td class="text-right num-font">${utils.formatCurrency(h.OldRate)}</td>
        <td class="text-right num-font" style="font-weight:700; color:var(--primary);">${utils.formatCurrency(h.NewRate)}</td>
        <td>${utils.escapeHtml(h.Reason || '-')}</td>
        <td>${utils.escapeHtml(h.ChangedByName || 'Admin')}</td>
      </tr>
    `).join('');

    const html = `
      <div style="text-align:left;">
        <div style="max-height:350px; overflow-y:auto; border:1px solid #eee; border-radius:6px;">
          <table class="table" style="font-size:12px;">
            <thead>
              <tr>
                <th>Date</th>
                <th class="text-right">Old Rate</th>
                <th class="text-right">New Rate</th>
                <th>Reason</th>
                <th>Changed By</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows : '<tr><td colspan="5" class="text-center" style="padding:16px;">No rate revisions logged yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    ui.viewDetails(`Rate Audit History: ${itemCode}`, html);
  },

  async openItemModal(item = null) {
    const isEdit = Boolean(item);
    const html = `
      <div style="display:flex; flex-direction:column; gap:6px; text-align:left;">
        <!-- Section 1: Item Identification -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-tag"></i>
            <span>Product Definition & Variants</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-barcode"></i> Item / SKU Code *</label>
              <input type="text" id="im-code" class="form-control" placeholder="e.g. CYL-142" value="${item ? item.ItemCode : ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-box"></i> Item Name *</label>
              <input type="text" id="im-name" class="form-control" placeholder="e.g. 14.2 KG Domestic Refill" value="${item ? utils.escapeHtml(item.ItemName) : ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-layer-group"></i> Category</label>
              <select id="im-cat" class="form-select">
                <option value="SALE" ${item && item.Category === 'SALE' ? 'selected' : ''}>SALE (Gas / Refill)</option>
                <option value="SECURITY_DEPOSIT" ${item && item.Category === 'SECURITY_DEPOSIT' ? 'selected' : ''}>SECURITY DEPOSIT</option>
                <option value="SERVICE" ${item && item.Category === 'SERVICE' ? 'selected' : ''}>SERVICE / CHARGES</option>
                <option value="ACCESSORY" ${item && item.Category === 'ACCESSORY' ? 'selected' : ''}>ACCESSORY / APPLIANCE (Stove, Hose, etc.)</option>
                <option value="EXPENSE" ${item && item.Category === 'EXPENSE' ? 'selected' : ''}>EXPENSE ITEM</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-gas-pump"></i> Cylinder Variant</label>
              <select id="im-cyl" class="form-select">
                <option value="">None (Accessory / Service)</option>
                <option value="14.2 KG Domestic" ${item && item.CylinderType === '14.2 KG Domestic' ? 'selected' : ''}>14.2 KG Domestic</option>
                <option value="19 KG Commercial" ${item && item.CylinderType === '19 KG Commercial' ? 'selected' : ''}>19 KG Commercial</option>
                <option value="5 KG Commercial" ${item && item.CylinderType === '5 KG Commercial' ? 'selected' : ''}>5 KG Commercial</option>
                <option value="5 KG Domestic" ${item && item.CylinderType === '5 KG Domestic' ? 'selected' : ''}>5 KG Domestic</option>
                <option value="2 KG Commercial" ${item && item.CylinderType === '2 KG Commercial' ? 'selected' : ''}>2 KG Commercial</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Section 2: Pricing & GST -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-calculator"></i>
            <span>Pricing, Tax & Package Details</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-indian-rupee-sign"></i> Unit Sales Rate (₹) *</label>
              <input type="number" id="im-rate" class="form-control num-font" placeholder="0.00" value="${item ? item.Rate : '0'}" min="0" step="any" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-percent"></i> GST Tax %</label>
              <input type="number" id="im-tax" class="form-control num-font" placeholder="5" value="${item ? item.TaxPercent : '0'}" min="0" step="any">
            </div>
          </div>

          <div style="margin-top:10px; padding:10px 12px; background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--r-sm); display:flex; align-items:center; gap:10px;">
            <input type="checkbox" id="im-is-pkg" ${item && item.IsPackageItem ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
            <label for="im-is-pkg" style="font-size:12px; font-weight:600; cursor:pointer; margin:0;">
              <i class="fa-solid fa-box-open" style="color:var(--navy-accent); margin-right:4px;"></i> Include automatically in New SV Connection Package
            </label>
          </div>

          <div class="form-group" style="margin-top:12px;">
            <label class="form-label"><i class="fa-solid fa-align-left"></i> Description / Specifications</label>
            <input type="text" id="im-desc" class="form-control" placeholder="Brief technical or billing description" value="${item ? utils.escapeHtml(item.Description || '') : ''}">
          </div>
        </div>
      </div>
    `;

    const result = await ui.formModal(html, isEdit ? `Edit Item: ${item.ItemName}` : 'Add Catalog Item', () => {
      const code = document.getElementById('im-code').value.trim();
      const name = document.getElementById('im-name').value.trim();
      const rate = parseFloat(document.getElementById('im-rate').value);
      if (!code || !name) {
        Swal.showValidationMessage('Item Code and Name are required!');
        return false;
      }
      return {
        ItemID: isEdit ? item.ItemID : null,
        ItemCode: code,
        ItemName: name,
        Category: document.getElementById('im-cat').value,
        CylinderType: document.getElementById('im-cyl').value,
        Rate: rate || 0,
        TaxPercent: parseFloat(document.getElementById('im-tax').value) || 0,
        IsPackageItem: document.getElementById('im-is-pkg').checked ? 1 : 0,
        Description: document.getElementById('im-desc').value.trim()
      };
    });

    if (result) {
      const res = await api('saveItem', result, { loaderMessage: 'Saving item...' });
      if (res.ok) {
        ui.success('Catalog item saved.');
        this.loadItems();
      }
    }
  }
};
