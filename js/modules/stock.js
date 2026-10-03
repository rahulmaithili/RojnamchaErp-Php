/**
 * SHIV SHAKTI HP GAS - CYLINDER INVENTORY & STOCK AUDIT MODULE
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { utils } from '../utils.js';
import { auth } from '../auth.js';

let stockData = [];

export const stockModule = {
  async init() {
    this.renderContainer();
    await this.loadStock();
  },

  renderContainer() {
    const root = document.getElementById('view-stock');
    if (!root) return;

    root.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);">Cylinder Inventory & Godown Stock</h2>
            <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Track full & sound empty cylinder positions, plant receipts, dispatch sales and physical count audits</p>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button id="stock-hpcl-return-btn" class="btn btn-warning btn-sm" style="background:#d97706; border-color:#d97706; color:#fff;" ${!auth.can('stock', 'create') ? 'disabled' : ''}>
              <i class="fa-solid fa-arrow-rotate-left"></i> HPCL Cylinder Return (Portal)
            </button>
            <button id="stock-emr-in-btn" class="btn btn-primary btn-sm" style="background:#2563eb; border-color:#2563eb; color:#fff;" ${!auth.can('stock', 'create') ? 'disabled' : ''}>
              <i class="fa-solid fa-plus-circle"></i> Receive EMR Filled (+Stock)
            </button>
            <button id="stock-truck-in-btn" class="btn btn-success btn-sm" style="background:#15803d; border-color:#15803d; color:#fff;" ${!auth.can('stock', 'create') ? 'disabled' : ''}>
              <i class="fa-solid fa-truck-moving"></i> Truck Stock In (Plant Receipt)
            </button>
            <button id="stock-adjust-btn" class="btn btn-secondary btn-sm" ${!auth.can('stock', 'update') ? 'disabled' : ''}>
              <i class="fa-solid fa-sliders"></i> Stock Adjustment
            </button>
            <button id="stock-ledger-btn" class="btn btn-outline btn-sm">
              <i class="fa-solid fa-book"></i> Movements Ledger
            </button>
            <button id="stock-save-btn" class="btn btn-primary btn-sm" ${!auth.can('stock', 'update') ? 'disabled' : ''}>
              <i class="fa-solid fa-floppy-disk"></i> Save Stock Count
            </button>
          </div>
        </div>
      </div>

      <!-- Date Filter Bar -->
      <div class="card" style="margin-bottom:16px; padding:14px 20px;">
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
          <label style="font-size:13px; font-weight:600;">Inventory Date:</label>
          <input type="date" id="stock-date-filter" class="form-control" value="${utils.today()}" style="width:160px;">
          <button id="stock-refresh-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-arrows-rotate"></i> Reload</button>
        </div>
      </div>

      <!-- Stock Table Grid -->
      <div class="card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Cylinder Variant</th>
                <th class="text-center">Opening Full</th>
                <th class="text-center">Plant Rec.</th>
                <th class="text-center" style="background:#eff6ff; color:#1d4ed8;">EMR Rec.</th>
                <th class="text-center">Counter Sold</th>
                <th class="text-center">Hawker Sold</th>
                <th class="text-center">System Cl. Full</th>
                <th class="text-center" style="background:#e0f2fe;">Physical Full</th>
                <th class="text-center">Variance Full</th>
                <th class="text-center">Sound Empty</th>
                <th class="text-center">Defective</th>
                <th class="text-center">Sent Plant</th>
                <th class="text-center">Action</th>
              </tr>
            </thead>
            <tbody id="stock-table-body">
              <tr><td colspan="13" class="text-center" style="color:var(--text-muted); padding:24px;">Loading stock inventory...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('stock-date-filter').addEventListener('change', () => this.loadStock());
    document.getElementById('stock-refresh-btn').addEventListener('click', () => this.loadStock());
    document.getElementById('stock-hpcl-return-btn')?.addEventListener('click', () => this.openHpclReturnModal());
    document.getElementById('stock-emr-in-btn')?.addEventListener('click', () => this.openEmrReceiptModal());
    document.getElementById('stock-truck-in-btn')?.addEventListener('click', () => this.openPlantTruckModal());
    document.getElementById('stock-save-btn').addEventListener('click', () => this.saveStockCounts());
    document.getElementById('stock-adjust-btn').addEventListener('click', () => this.openAdjustmentModal());
    document.getElementById('stock-ledger-btn').addEventListener('click', () => this.openLedgerModal());
  },

  async loadStock() {
    const date = document.getElementById('stock-date-filter')?.value || utils.today();
    const res = await api('getStock', { date }, { loader: false });
    const tbody = document.getElementById('stock-table-body');
    if (!tbody) return;

    if (!res.ok || !res.data) return;

    stockData = res.data;
    tbody.innerHTML = stockData.map((s, idx) => `
      <tr>
        <td><strong>${utils.escapeHtml(s.CylinderType)}</strong></td>
        <td class="text-center num-font">${s.OpeningFull}</td>
        <td class="text-center">
          <input type="number" class="form-control text-center stock-in-field num-font" data-idx="${idx}" data-field="PlantReceipt" value="${s.PlantReceipt || 0}" min="0" style="width:70px; display:inline-block; height:32px;">
        </td>
        <td class="text-center num-font" style="background:#eff6ff; color:#1d4ed8; font-weight:700;">
          ${s.EMRReceived || 0}
        </td>
        <td class="text-center num-font" style="color:var(--color-info);">${s.CounterSold}</td>
        <td class="text-center num-font" style="color:var(--color-info);">${s.HawkerSold}</td>
        <td class="text-center num-font" style="font-weight:700; color:var(--primary); font-size:15px;">
          ${s.ClosingFull}
        </td>
        <td class="text-center" style="background:#e0f2fe;">
          <input type="number" class="form-control text-center stock-in-field num-font" data-idx="${idx}" data-field="PhysicalCountFull" value="${s.PhysicalCountFull !== null ? s.PhysicalCountFull : s.ClosingFull}" min="0" style="width:75px; display:inline-block; height:32px; font-weight:700;">
        </td>
        <td class="text-center num-font" style="font-weight:700; ${Number(s.VarianceFull) !== 0 ? 'color:var(--color-danger);' : 'color:var(--color-success);'}">
          ${Number(s.VarianceFull) > 0 ? '+' + s.VarianceFull : s.VarianceFull}
        </td>
        <td class="text-center num-font">${s.ClosingEmpty || s.SoundEmptyReceived}</td>
        <td class="text-center">
          <input type="number" class="form-control text-center stock-in-field num-font" data-idx="${idx}" data-field="DefectiveReceived" value="${s.DefectiveReceived || 0}" min="0" style="width:65px; display:inline-block; height:32px;">
        </td>
        <td class="text-center">
          <input type="number" class="form-control text-center stock-in-field num-font" data-idx="${idx}" data-field="SentToPlant" value="${s.SentToPlant || 0}" min="0" style="width:65px; display:inline-block; height:32px;">
        </td>
        <td class="text-center" style="white-space:nowrap;">
          <button class="action-icon view-icon view-stock-btn" data-idx="${idx}" title="View Cylinder Balance Breakdown">
            <i class="fa-solid fa-eye"></i>
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.view-stock-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx);
        const st = stockData[idx];
        if (st) this.viewStockDetails(st);
      });
    });

    tbody.querySelectorAll('.stock-in-field').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const fld = e.target.dataset.field;
        const val = parseInt(e.target.value) || 0;
        stockData[idx][fld] = val;
      });
    });
  },

  viewStockDetails(s) {
    const variance = Number(s.VarianceFull) || 0;
    const varBadge = variance === 0
      ? '<span class="badge badge-success">0 Variance (Matched)</span>'
      : variance > 0
        ? `<span class="badge badge-info">+${variance} Surplus Full</span>`
        : `<span class="badge badge-danger">${variance} Shortage Full</span>`;

    const html = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="background:var(--color-surface-subtle); padding:16px; border-radius:var(--r-md); display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border-color);">
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Cylinder Category</div>
            <div style="font-size:18px; font-weight:800; color:var(--primary);">${utils.escapeHtml(s.CylinderType)}</div>
          </div>
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Audit Status</div>
            <div>${varBadge}</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;">
          <div style="background:var(--color-surface); border:1px solid var(--border-color); border-radius:var(--r-sm); padding:12px; text-align:center;">
            <div style="font-size:11px; color:var(--text-muted); font-weight:700;">OPENING FULL</div>
            <div class="num-font" style="font-size:22px; font-weight:800; color:var(--text-main);">${s.OpeningFull || 0}</div>
          </div>
          <div style="background:var(--color-surface); border:1px solid var(--border-color); border-radius:var(--r-sm); padding:12px; text-align:center;">
            <div style="font-size:11px; color:var(--text-muted); font-weight:700;">PLANT RECEIPTS</div>
            <div class="num-font" style="font-size:22px; font-weight:800; color:var(--color-success);">${s.PlantReceipt || 0}</div>
          </div>
          <div style="background:var(--color-surface); border:1px solid var(--border-color); border-radius:var(--r-sm); padding:12px; text-align:center;">
            <div style="font-size:11px; color:var(--text-muted); font-weight:700;">TOTAL ISSUED</div>
            <div class="num-font" style="font-size:22px; font-weight:800; color:var(--color-info);">${Number(s.CounterSold || 0) + Number(s.HawkerSold || 0)}</div>
          </div>
        </div>

        <div style="background:var(--color-surface-subtle); border:1px solid var(--border-color); border-radius:var(--r-md); padding:16px;">
          <h4 style="font-size:12px; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px; font-weight:800;">Closing Balance Breakdown</h4>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
            <span>System Full Closing:</span>
            <strong class="num-font">${s.ClosingFull || 0} Cylinders</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
            <span>Physical Physical Full Counted:</span>
            <strong class="num-font" style="color:var(--primary); font-weight:800;">${s.PhysicalCountFull !== null ? s.PhysicalCountFull : s.ClosingFull} Cylinders</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
            <span>Sound Empty at Godown:</span>
            <strong class="num-font">${s.ClosingEmpty || s.SoundEmptyReceived || 0} Cylinders</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
            <span>Defective / Leaking Cylinders:</span>
            <strong class="num-font" style="color:var(--color-danger);">${s.DefectiveReceived || 0} Cylinders</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 0;">
            <span>Sent Back to Bottling Plant:</span>
            <strong class="num-font">${s.SentToPlant || 0} Cylinders</strong>
          </div>
        </div>
      </div>
    `;

    ui.viewDetails(`Cylinder Ledger: ${s.CylinderType}`, html, () => {
      ui.info('Printing Cylinder Master Ledger is available in Rojnamcha sheet.');
    });
  },

  async saveStockCounts() {
    const date = document.getElementById('stock-date-filter')?.value || utils.today();
    const res = await api('saveStock', { stocks: stockData }, { loaderMessage: 'Saving cylinder stock...' });
    if (res.ok) {
      ui.success('Cylinder inventory counts updated.');
      this.loadStock();
    }
  },

  async openAdjustmentModal() {
    const html = `
      <div style="display:flex; flex-direction:column; gap:6px; text-align:left;">
        <!-- Section 1: Adjustment Specifics -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-boxes-stacked"></i>
            <span>Cylinder Stock Correction Parameters</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-fire"></i> Cylinder Variant *</label>
              <select id="adj-cyl-type" class="form-select">
                <option value="14.2 KG Domestic">14.2 KG Domestic</option>
                <option value="19 KG Commercial">19 KG Commercial</option>
                <option value="5 KG Commercial">5 KG Commercial</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-right-left"></i> Adjustment Type *</label>
              <select id="adj-type" class="form-select">
                <option value="FULL_IN">Full Stock Addition (+)</option>
                <option value="FULL_OUT">Full Stock Reduction (-)</option>
                <option value="SOUND_EMPTY_IN">Sound Empty Addition (+)</option>
                <option value="DEFECTIVE_IN">Defective Cylinder Logged (+)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-calculator"></i> Quantity (Cylinders) *</label>
              <input type="number" id="adj-qty" class="form-control num-font" value="1" min="1" required>
            </div>
          </div>
        </div>

        <!-- Section 2: Audit Reason -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-shield-halved"></i>
            <span>Mandatory Physical Audit Justification</span>
          </div>
          <div class="form-group">
            <label class="form-label"><i class="fa-solid fa-file-signature"></i> Audit Reason & Discrepancy Note *</label>
            <textarea id="adj-reason" class="form-control" rows="2" placeholder="Explain physical stock count correction, leak cylinder return, or audit discrepancy..." required></textarea>
            <div class="form-hint">Physical stock updates are strictly logged with timestamp and user ID in the Audit Trail.</div>
          </div>
        </div>
      </div>
    `;

    const result = await ui.formModal(html, 'Manual Stock Adjustment', () => {
      const qty = parseInt(document.getElementById('adj-qty').value);
      const reason = document.getElementById('adj-reason').value.trim();
      if (!qty || qty <= 0) {
        Swal.showValidationMessage('Quantity must be greater than zero!');
        return false;
      }
      if (!reason) {
        Swal.showValidationMessage('Mandatory explanation reason is required for inventory adjustments!');
        return false;
      }
      return {
        CylinderType: document.getElementById('adj-cyl-type').value,
        FullOrEmpty: document.getElementById('adj-type').value,
        Quantity: qty,
        Reason: reason,
        Date: utils.today()
      };
    });

    if (result) {
      const res = await api('adjustStock', result, { loaderMessage: 'Recording adjustment...' });
      if (res.ok) {
        ui.success('Stock adjustment logged.');
        this.loadStock();
      }
    }
  },

  async openLedgerModal() {
    const res = await api('getStockLedger', {}, { loaderMessage: 'Loading stock movements ledger...' });
    if (!res.ok || !res.data) return;

    const list = res.data;
    const rows = list.map(m => `
      <tr>
        <td>${utils.formatDate(m.Date)}</td>
        <td><strong>${utils.escapeHtml(m.CylinderType)}</strong></td>
        <td><span class="badge badge-info">${m.MovementType}</span></td>
        <td class="text-center num-font" style="font-weight:700;">${m.Quantity}</td>
        <td>${utils.escapeHtml(m.ReferenceNo || '-')}</td>
        <td>${utils.escapeHtml(m.Reason || '-')}</td>
      </tr>
    `).join('');

    const html = `
      <div style="text-align:left;">
        <div style="max-height:360px; overflow-y:auto; border:1px solid #eee; border-radius:6px;">
          <table class="table" style="font-size:12px;">
            <thead>
              <tr>
                <th>Date</th>
                <th>Cylinder</th>
                <th>Movement Type</th>
                <th class="text-center">Qty</th>
                <th>Ref No</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows : '<tr><td colspan="6" class="text-center" style="padding:16px;">No stock movement records logged.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    ui.viewDetails('Cylinder Movements Ledger', html);
  },

  /**
   * Plant Truck Stock In & Empty Return Workflow
   * Handles separate Invoice Date vs Godown In Date,
   * Filled cylinders received into Godown stock,
   * and Sound/Defective Empty returned to Bottling Plant.
   */
  async openPlantTruckModal() {
    const today = utils.today();
    const cylTypes = [
      '14.2 KG Domestic',
      '19 KG Commercial',
      '5 KG Commercial',
      '5 KG Domestic',
      '2 KG Commercial'
    ];

    const cylRows = cylTypes.map((c, idx) => `
      <tr>
        <td><strong>${utils.escapeHtml(c)}</strong></td>
        <td>
          <input type="number" class="form-control form-control-sm text-center num-font ptm-filled" data-cyl="${c}" value="${idx === 0 ? 306 : 0}" min="0" style="width:90px; margin:auto;">
        </td>
        <td>
          <input type="number" class="form-control form-control-sm text-center num-font ptm-empty" data-cyl="${c}" value="${idx === 0 ? 306 : 0}" min="0" style="width:90px; margin:auto;">
        </td>
        <td>
          <input type="number" class="form-control form-control-sm text-center num-font ptm-defective" data-cyl="${c}" value="0" min="0" style="width:90px; margin:auto;">
        </td>
      </tr>
    `).join('');

    const html = `
      <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
        <!-- Section 1: Challan & Inward Dates -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-file-invoice"></i>
            <span>Plant Bottling Challan & Gate Inward Details</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-receipt"></i> Plant Invoice / Challan No *</label>
              <input type="text" id="ptm-challan" class="form-control" placeholder="e.g. INV-BTL-9901" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-calendar"></i> Plant Billing Date (Invoice Date) *</label>
              <input type="date" id="ptm-inv-date" class="form-control" value="${today}" required>
              <small style="color:var(--text-muted); font-size:11px;">Date on Plant Invoice</small>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-warehouse text-primary"></i> Godown In Date (Physical Arrival) *</label>
              <input type="date" id="ptm-godown-date" class="form-control" value="${today}" required style="border-color:var(--primary); font-weight:700;">
              <small style="color:var(--text-muted); font-size:11px;">Date stock physically enters godown</small>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-truck"></i> Truck / Vehicle Number</label>
              <input type="text" id="ptm-truck" class="form-control" placeholder="e.g. BR-07-GA-1234">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-id-badge"></i> Driver Name</label>
              <input type="text" id="ptm-driver" class="form-control" placeholder="Driver Name">
            </div>
          </div>
        </div>

        <!-- Section 2: Filled In vs Empty Returned -->
        <div class="modal-section-card">
          <div class="modal-section-header" style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:6px;">
              <i class="fa-solid fa-gas-pump"></i>
              <span>Cylinder Inward & Empty Return Exchange Matrix</span>
            </div>
            <label style="font-size:11.5px; font-weight:700; color:var(--primary); display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="checkbox" id="ptm-auto-match" checked style="accent-color:var(--primary);">
              <span>1:1 Equal Empty Return Rule</span>
            </label>
          </div>
          <div style="border:1px solid var(--border); border-radius:var(--r-sm); overflow:hidden; background:var(--bg-surface);">
            <table class="table table-sm" style="margin:0; font-size:12.5px;">
              <thead>
                <tr style="background:var(--bg-body);">
                  <th>Cylinder Variant</th>
                  <th class="text-center" style="color:var(--color-success); font-weight:700;">Filled Received (+Full Stock)</th>
                  <th class="text-center" style="color:var(--color-info); font-weight:700;">Sound Empty Returned (-Empty Stock)</th>
                  <th class="text-center" style="color:var(--color-danger); font-weight:700;">Defective Returned (-Empty Stock)</th>
                </tr>
              </thead>
              <tbody>
                ${cylRows}
              </tbody>
            </table>
          </div>

          <!-- Total Summary Bar -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding:8px 14px; background:var(--bg-body); border-radius:var(--r-sm); border:1px solid var(--border); font-size:13px; font-weight:700;">
            <span>Total Filled Inward: <strong id="ptm-tot-filled" class="num-font text-success" style="font-size:15px;">306</strong></span>
            <span>Total Empty Sent to Plant: <strong id="ptm-tot-empty" class="num-font text-info" style="font-size:15px;">306</strong></span>
          </div>
        </div>

        <!-- Remarks -->
        <div class="modal-section-card">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label"><i class="fa-solid fa-note-sticky"></i> Remarks / Bottling Plant Location</label>
            <input type="text" id="ptm-remarks" class="form-control" placeholder="e.g. Baddi Bottling Plant load / driver seal intact">
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const recalcTotals = () => {
        let fTot = 0, eTot = 0;
        document.querySelectorAll('.ptm-filled').forEach(el => fTot += (parseInt(el.value) || 0));
        document.querySelectorAll('.ptm-empty').forEach(el => eTot += (parseInt(el.value) || 0));
        document.querySelectorAll('.ptm-defective').forEach(el => eTot += (parseInt(el.value) || 0));
        const fEl = document.getElementById('ptm-tot-filled');
        const eEl = document.getElementById('ptm-tot-empty');
        if (fEl) fEl.textContent = fTot;
        if (eEl) eEl.textContent = eTot;
      };

      // 1:1 auto-match: changing filled received updates sound empty returned
      document.querySelectorAll('.ptm-filled').forEach(fEl => {
        fEl.addEventListener('input', (e) => {
          const auto = document.getElementById('ptm-auto-match')?.checked;
          if (auto) {
            const cyl = e.target.dataset.cyl;
            const eEl = document.querySelector(`.ptm-empty[data-cyl="${cyl}"]`);
            const dEl = document.querySelector(`.ptm-defective[data-cyl="${cyl}"]`);
            const fVal = parseInt(e.target.value) || 0;
            const dVal = parseInt(dEl?.value) || 0;
            if (eEl) {
              eEl.value = Math.max(0, fVal - dVal);
            }
          }
          recalcTotals();
        });
      });

      // Changing defective updates sound empty to keep total equal
      document.querySelectorAll('.ptm-defective').forEach(dEl => {
        dEl.addEventListener('input', (e) => {
          const auto = document.getElementById('ptm-auto-match')?.checked;
          if (auto) {
            const cyl = e.target.dataset.cyl;
            const fEl = document.querySelector(`.ptm-filled[data-cyl="${cyl}"]`);
            const eEl = document.querySelector(`.ptm-empty[data-cyl="${cyl}"]`);
            const fVal = parseInt(fEl?.value) || 0;
            const dVal = parseInt(e.target.value) || 0;
            if (eEl) {
              eEl.value = Math.max(0, fVal - dVal);
            }
          }
          recalcTotals();
        });
      });

      document.querySelectorAll('.ptm-empty').forEach(el => {
        el.addEventListener('input', recalcTotals);
      });
      recalcTotals();
    }, 150);

    const result = await ui.formModal(html, 'Plant Truck Stock Inward & Empty Return', () => {
      const challan = document.getElementById('ptm-challan').value.trim();
      const godownDate = document.getElementById('ptm-godown-date').value;
      if (!challan) {
        Swal.showValidationMessage('Plant Invoice / Challan Number is required!');
        return false;
      }
      if (!godownDate) {
        Swal.showValidationMessage('Godown physical arrival date is required!');
        return false;
      }

      const items = [];
      document.querySelectorAll('.ptm-filled').forEach(fIn => {
        const cyl = fIn.dataset.cyl;
        const eIn = document.querySelector(`.ptm-empty[data-cyl="${cyl}"]`);
        const dIn = document.querySelector(`.ptm-defective[data-cyl="${cyl}"]`);
        const fQty = parseInt(fIn.value) || 0;
        const eQty = parseInt(eIn?.value) || 0;
        const dQty = parseInt(dIn?.value) || 0;

        if (fQty > 0 || eQty > 0 || dQty > 0) {
          items.push({
            CylinderType: cyl,
            FilledQty: fQty,
            EmptyQty: eQty,
            DefectiveQty: dQty
          });
        }
      });

      if (!items.length) {
        Swal.showValidationMessage('Specify quantities for filled cylinders received or empty returned!');
        return false;
      }

      return {
        ChallanNumber: challan,
        InvoiceDate: document.getElementById('ptm-inv-date').value,
        GodownDate: godownDate,
        TruckNumber: document.getElementById('ptm-truck').value.trim(),
        DriverName: document.getElementById('ptm-driver').value.trim(),
        Remarks: document.getElementById('ptm-remarks').value.trim(),
        Items: items
      };
    });

    if (result) {
      const res = await api('receivePlantTruck', result, { loaderMessage: 'Recording plant truck arrival & updating godown stock...' });
      if (res.ok && res.data) {
        ui.success(res.message || `Plant Truck Receipt ${res.data.ReceiptNumber} logged!`);
        this.loadStock();
      }
    }
  },

  /**
   * Receive EMR Filled Cylinders
   * Automatically adds quantity to Godown Filled Stock (e.g. 10 + 20 = 30)
   */
  async openEmrReceiptModal() {
    const curDate = document.getElementById('stock-date-filter')?.value || utils.today();
    const defaultCyl = '14.2 KG Domestic';
    const found = stockData.find(s => s.CylinderType === defaultCyl);
    const curStock = found ? Number(found.ClosingFull || 0) : 10;

    const html = `
      <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
        <!-- Card 1: EMR Inward Description -->
        <div class="modal-section-card" style="background:#eff6ff; border:1px solid #bfdbfe; padding:12px 16px; border-radius:6px;">
          <div style="display:flex; align-items:center; gap:8px; color:#1e40af; font-weight:700; font-size:13px;">
            <i class="fa-solid fa-shield-halved"></i>
            <span>EMR (Emergency / Replacement) Cylinder Inward</span>
          </div>
          <p style="margin:4px 0 0; font-size:12px; color:#1e3a8a;">
            When filled EMR cylinders arrive from bottling plant, your <strong>Filled Godown Stock increases</strong> directly (e.g. Current ${curStock} + Received 20 = ${curStock + 20} Filled Stock).
          </p>
        </div>

        <!-- Card 2: Receipt Parameters -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-boxes-stacked"></i>
            <span>Receipt Details & Calculation</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-calendar"></i> Receipt Date *</label>
              <input type="date" id="emr-date" class="form-control" value="${curDate}" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-gas-pump"></i> Cylinder Variant *</label>
              <select id="emr-cyl-type" class="form-select">
                <option value="14.2 KG Domestic">14.2 KG Domestic</option>
                <option value="19 KG Commercial">19 KG Commercial</option>
                <option value="5 KG Commercial">5 KG Commercial</option>
                <option value="5 KG Domestic">5 KG Domestic</option>
                <option value="2 KG Commercial">2 KG Commercial</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-file-invoice"></i> Challan / Memo No. *</label>
              <input type="text" id="emr-challan" class="form-control" value="EMR-${Date.now().toString().slice(-6)}" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-calculator"></i> Received EMR Quantity *</label>
              <input type="number" id="emr-qty" class="form-control num-font" value="20" min="1" step="1" required style="font-weight:700; font-size:16px;">
            </div>
          </div>

          <!-- Dynamic Live Calculation Banner -->
          <div id="emr-calc-banner" style="margin-top:12px; padding:12px 16px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-size:11px; color:#166534; text-transform:uppercase; font-weight:700;">Live Stock Impact</span>
              <div style="font-size:13px; color:#14532d; font-weight:600; margin-top:2px;">
                Current Filled: <span id="emr-prev-val" class="num-font" style="font-weight:800;">${curStock}</span> + EMR: <span id="emr-add-val" class="num-font" style="font-weight:800; color:#16a34a;">20</span>
              </div>
            </div>
            <div style="text-align:right;">
              <span style="font-size:11px; color:#166534; text-transform:uppercase; font-weight:700;">Projected New Filled Stock</span>
              <div id="emr-new-val" class="num-font" style="font-size:22px; font-weight:900; color:#15803d;">${curStock + 20}</div>
            </div>
          </div>

          <div class="form-group" style="margin-top:12px;">
            <label class="form-label"><i class="fa-solid fa-note-sticky"></i> Remarks / Reason</label>
            <input type="text" id="emr-remarks" class="form-control" placeholder="e.g. EMR replacement against defective return load">
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const cylSelect = document.getElementById('emr-cyl-type');
      const qtyInput = document.getElementById('emr-qty');
      const prevEl = document.getElementById('emr-prev-val');
      const addEl = document.getElementById('emr-add-val');
      const newEl = document.getElementById('emr-new-val');

      const updateCalc = () => {
        const cyl = cylSelect.value;
        const sRow = stockData.find(s => s.CylinderType === cyl);
        const cur = sRow ? Number(sRow.ClosingFull || 0) : 0;
        const add = parseInt(qtyInput.value) || 0;
        if (prevEl) prevEl.textContent = cur;
        if (addEl) addEl.textContent = add;
        if (newEl) newEl.textContent = cur + add;
      };

      cylSelect?.addEventListener('change', updateCalc);
      qtyInput?.addEventListener('input', updateCalc);
    }, 100);

    const result = await ui.formModal(html, 'Receive EMR Filled Cylinders (+Stock)', () => {
      const qty = parseInt(document.getElementById('emr-qty').value) || 0;
      const challan = document.getElementById('emr-challan').value.trim();
      if (qty <= 0) {
        Swal.showValidationMessage('Quantity must be greater than zero!');
        return false;
      }
      if (!challan) {
        Swal.showValidationMessage('Challan / Memo number is required!');
        return false;
      }
      return {
        Date: document.getElementById('emr-date').value,
        CylinderType: document.getElementById('emr-cyl-type').value,
        Quantity: qty,
        ChallanNumber: challan,
        Remarks: document.getElementById('emr-remarks').value.trim()
      };
    });

    if (result) {
      const res = await api('recordEMRReceipt', result, { loaderMessage: 'Recording EMR cylinder receipt & updating stock...' });
      if (res.ok) {
        ui.success(res.message || 'EMR cylinders received. Filled stock increased successfully!');
        this.loadStock();
      }
    }
  },

  /**
   * HPCL Portal: CYLINDER RETURN Screen
   * Exact reproduction of HPCL official portal cylinder return interface
   */
  async openHpclReturnModal() {
    const curDate = document.getElementById('stock-date-filter')?.value || utils.today();
    const defaultRetNo = `RET-${curDate.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const equipmentOptions = [
      { code: '(036) 14.2 KG EMPTY LPG CYLINDER', type: '14.2 KG Domestic', def: false },
      { code: '(064) 19 KG EMPTY LPG CYLINDER', type: '19 KG Commercial', def: false },
      { code: '(055) 5 KG COMM EMPTY LPG CYLINDER', type: '5 KG Commercial', def: false },
      { code: '(022) 5 KG DOM EMPTY LPG CYLINDER', type: '5 KG Domestic', def: false },
      { code: '(011) 2 KG COMM EMPTY LPG CYLINDER', type: '2 KG Commercial', def: false },
      { code: '(037) 14.2 KG DEFECTIVE LPG CYLINDER', type: '14.2 KG Domestic', def: true },
      { code: '(065) 19 KG DEFECTIVE LPG CYLINDER', type: '19 KG Commercial', def: true }
    ];

    const emrReasonOptions = [
      { code: '', label: '-- Select Reason (if EMR/Defective) --' },
      { code: 'VALVE_FAULTY', label: 'VALVE_FAULTY: Valve Pin Leak / Broken' },
      { code: 'BODY_LEAK', label: 'BODY_LEAK: Body Pin Leak / Porosity' },
      { code: 'FOOTRING_DAMAGED', label: 'FOOTRING_DAMAGED: Foot Ring Detached / Bent' },
      { code: 'BUNG_THREAD_WORN', label: 'BUNG_THREAD_WORN: Bung Thread Stripped' },
      { code: 'DENTED_BULGED', label: 'DENTED_BULGED: Dented / Bulged Shell' },
      { code: 'TARE_MISMATCH', label: 'TARE_MISMATCH: Tare Weight Discrepancy' },
      { code: 'SPURIOUS_MARK', label: 'SPURIOUS_MARK: Non-OMC / Spurious Markings' },
      { code: 'TEST_EXPIRED', label: 'TEST_EXPIRED: Hydro-Test Expired / Due' }
    ];

    const html = `
      <div style="display:flex; flex-direction:column; gap:12px; text-align:left; max-width:98vw;">
        <!-- HPCL Portal Header Banner -->
        <div style="background:#003366; color:#ffffff; padding:12px 18px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:16px; font-weight:800; letter-spacing:0.5px;">HINDUSTAN PETROLEUM CORPORATION LIMITED</div>
            <div style="font-size:12px; opacity:0.85;">CYLINDER RETURN PORTAL ENTRY & INWARD RETURN DISPATCH</div>
          </div>
          <div style="font-size:12px; font-weight:700; background:rgba(255,255,255,0.15); padding:6px 12px; border-radius:4px;">
            OFFICIAL HPCL FORMAT
          </div>
        </div>

        <!-- Header Input Fields -->
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:14px;">
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
            <div class="form-group" style="margin:0;">
              <label class="form-label" style="font-size:12px; font-weight:700; color:#334155;">INVOICE NO. *</label>
              <input type="text" id="hpcl-inv-no" class="form-control" placeholder="e.g. 2026/09/INV-9821" value="INV-${curDate.replace(/-/g, '')}-01" required>
            </div>
            <div class="form-group" style="margin:0;">
              <label class="form-label" style="font-size:12px; font-weight:700; color:#334155;">INVOICE DATE *</label>
              <input type="date" id="hpcl-inv-date" class="form-control" value="${curDate}" required>
            </div>
            <div class="form-group" style="margin:0;">
              <label class="form-label" style="font-size:12px; font-weight:700; color:#334155;">RETURN NO. *</label>
              <input type="text" id="hpcl-ret-no" class="form-control" value="${defaultRetNo}" required>
            </div>
            <div class="form-group" style="margin:0;">
              <label class="form-label" style="font-size:12px; font-weight:700; color:#334155;">RETURN DATE *</label>
              <input type="date" id="hpcl-ret-date" class="form-control" value="${curDate}" required>
            </div>
            <div class="form-group" style="margin:0;">
              <label class="form-label" style="font-size:12px; font-weight:700; color:#334155;">VEHICLE NO. *</label>
              <input type="text" id="hpcl-veh-no" class="form-control" placeholder="e.g. BR06GB2452" value="BR06GB2452" required style="text-transform:uppercase;">
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
            <button type="button" id="hpcl-fetch-btn" class="btn btn-secondary btn-sm" style="font-size:12px;">
              <i class="fa-solid fa-bolt"></i> Auto-Fill Sound Empty from Godown
            </button>
            <button type="button" id="hpcl-clear-btn" class="btn btn-outline btn-sm" style="font-size:12px;">
              <i class="fa-solid fa-eraser"></i> Clear Rows
            </button>
          </div>
        </div>

        <!-- Table Grid Container matching Screenshot -->
        <div style="border:1px solid #cbd5e1; border-radius:6px; overflow-x:auto; background:#ffffff;">
          <table class="table" style="font-size:11px; margin:0; min-width:900px;" id="hpcl-return-table">
            <thead>
              <tr style="background:#0f2942; color:#ffffff;">
                <th style="width:40px; text-align:center;">
                  <input type="checkbox" id="hpcl-select-all" style="cursor:pointer;">
                </th>
                <th style="width:110px;">VEHICLE NO.</th>
                <th style="min-width:220px;">EQUIPMENT CODE</th>
                <th style="width:110px;">EMPTY OR DEFECTIVE</th>
                <th style="width:80px; text-align:center;">QUANTITY</th>
                <th style="width:65px; text-align:center;">SEALED</th>
                <th style="width:120px;">RETURN TYPE</th>
                <th style="min-width:180px;">EMR REASON CODE</th>
                <th style="min-width:130px;">REMARKS</th>
              </tr>
            </thead>
            <tbody id="hpcl-rows-body">
              <!-- Rows added dynamically -->
            </tbody>
          </table>
        </div>

        <!-- Grid Toolbar Actions & Summary -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding:4px 0;">
          <div style="display:flex; gap:8px;">
            <button type="button" id="hpcl-add-row-btn" class="btn btn-primary btn-sm" style="font-size:12px;">
              <i class="fa-solid fa-plus"></i> Add Row
            </button>
            <button type="button" id="hpcl-del-row-btn" class="btn btn-danger btn-sm" style="font-size:12px;">
              <i class="fa-solid fa-trash"></i> Delete Row
            </button>
          </div>
          <div style="display:flex; gap:16px; align-items:center;">
            <div style="font-size:13px; font-weight:700; color:#334155;">
              TOTAL RETURNING CYLINDERS: <span id="hpcl-total-cyl-qty" class="num-font" style="font-size:18px; font-weight:900; color:#0f2942;">0</span> NOS
            </div>
          </div>
        </div>

        <!-- Global Remarks -->
        <div class="form-group" style="margin:0;">
          <label class="form-label" style="font-size:12px; font-weight:600;"><i class="fa-solid fa-note-sticky"></i> Remarks / Gate Pass Reference</label>
          <input type="text" id="hpcl-global-remarks" class="form-control" placeholder="e.g. Empty cylinders dispatched back to Barauni / HPCL Bottling Plant">
        </div>
      </div>
    `;

    setTimeout(() => {
      const tbody = document.getElementById('hpcl-rows-body');
      const vehInput = document.getElementById('hpcl-veh-no');
      const totQtyEl = document.getElementById('hpcl-total-cyl-qty');
      const selectAll = document.getElementById('hpcl-select-all');

      const recalcTotals = () => {
        let tot = 0;
        document.querySelectorAll('.hpcl-row-qty').forEach(inEl => {
          tot += (parseInt(inEl.value) || 0);
        });
        if (totQtyEl) totQtyEl.textContent = tot;
      };

      const createRowHtml = (eqCode = '(036) 14.2 KG EMPTY LPG CYLINDER', isDef = false, qty = 306, retType = 'Delivered Load', reasonCode = '', rem = '') => {
        const vNo = vehInput ? vehInput.value.trim().toUpperCase() : 'BR06GB2452';
        return `
          <tr class="hpcl-data-row">
            <td style="text-align:center;">
              <input type="checkbox" class="hpcl-row-check" style="cursor:pointer;">
            </td>
            <td>
              <input type="text" class="form-control form-control-sm hpcl-row-veh" value="${vNo}" style="font-size:11px; text-transform:uppercase;">
            </td>
            <td>
              <select class="form-select form-select-sm hpcl-row-eq" style="font-size:11px;">
                ${equipmentOptions.map(eq => `
                  <option value="${eq.code}" ${eq.code === eqCode ? 'selected' : ''}>${eq.code}</option>
                `).join('')}
              </select>
            </td>
            <td>
              <select class="form-select form-select-sm hpcl-row-empt-def" style="font-size:11px;">
                <option value="Empty" ${!isDef ? 'selected' : ''}>Empty</option>
                <option value="Defective" ${isDef ? 'selected' : ''}>Defective</option>
              </select>
            </td>
            <td>
              <input type="number" class="form-control form-control-sm text-center num-font hpcl-row-qty" value="${qty}" min="1" style="font-size:12px; font-weight:700;">
            </td>
            <td style="text-align:center;">
              <input type="checkbox" class="hpcl-row-sealed" checked style="cursor:pointer;">
            </td>
            <td>
              <select class="form-select form-select-sm hpcl-row-ret-type" style="font-size:11px;">
                <option value="Delivered Load" ${retType === 'Delivered Load' ? 'selected' : ''}>Delivered Load</option>
                <option value="EMR" ${retType === 'EMR' ? 'selected' : ''}>EMR</option>
                <option value="Spurious" ${retType === 'Spurious' ? 'selected' : ''}>Spurious</option>
                <option value="OMC Exchange" ${retType === 'OMC Exchange' ? 'selected' : ''}>OMC Exchange</option>
                <option value="Plant Defective" ${retType === 'Plant Defective' ? 'selected' : ''}>Plant Defective</option>
              </select>
            </td>
            <td>
              <select class="form-select form-select-sm hpcl-row-reason" style="font-size:11px;">
                ${emrReasonOptions.map(r => `
                  <option value="${r.code}" ${r.code === reasonCode ? 'selected' : ''}>${r.label}</option>
                `).join('')}
              </select>
            </td>
            <td>
              <input type="text" class="form-control form-control-sm hpcl-row-remarks" value="${rem}" placeholder="Row remarks" style="font-size:11px;">
            </td>
          </tr>
        `;
      };

      // Add default initial row
      if (tbody) {
        tbody.innerHTML = createRowHtml('(036) 14.2 KG EMPTY LPG CYLINDER', false, 306, 'Delivered Load');
        recalcTotals();
      }

      // Add Row Button
      document.getElementById('hpcl-add-row-btn')?.addEventListener('click', () => {
        if (!tbody) return;
        tbody.insertAdjacentHTML('beforeend', createRowHtml('(036) 14.2 KG EMPTY LPG CYLINDER', false, 0, 'Delivered Load'));
        recalcTotals();
      });

      // Delete Row Button
      document.getElementById('hpcl-del-row-btn')?.addEventListener('click', () => {
        const checked = tbody?.querySelectorAll('.hpcl-row-check:checked');
        if (checked && checked.length > 0) {
          checked.forEach(ch => ch.closest('tr')?.remove());
        } else {
          tbody?.lastElementChild?.remove();
        }
        recalcTotals();
      });

      // Clear Rows Button
      document.getElementById('hpcl-clear-btn')?.addEventListener('click', () => {
        if (tbody) tbody.innerHTML = '';
        recalcTotals();
      });

      // Auto-Fill Button: populate from current godown stock positions
      document.getElementById('hpcl-fetch-btn')?.addEventListener('click', () => {
        if (!tbody) return;
        tbody.innerHTML = '';
        stockData.forEach(s => {
          const emptyQty = Number(s.ClosingEmpty || s.SoundEmptyReceived || 0);
          const defQty = Number(s.DefectiveReceived || 0);
          if (emptyQty > 0) {
            let code = '(036) 14.2 KG EMPTY LPG CYLINDER';
            if (s.CylinderType.includes('19')) code = '(064) 19 KG EMPTY LPG CYLINDER';
            else if (s.CylinderType.includes('5 KG Comm')) code = '(055) 5 KG COMM EMPTY LPG CYLINDER';
            else if (s.CylinderType.includes('5 KG Dom')) code = '(022) 5 KG DOM EMPTY LPG CYLINDER';
            else if (s.CylinderType.includes('2 KG')) code = '(011) 2 KG COMM EMPTY LPG CYLINDER';
            tbody.insertAdjacentHTML('beforeend', createRowHtml(code, false, emptyQty, 'Delivered Load'));
          }
          if (defQty > 0) {
            let defCode = '(037) 14.2 KG DEFECTIVE LPG CYLINDER';
            if (s.CylinderType.includes('19')) defCode = '(065) 19 KG DEFECTIVE LPG CYLINDER';
            tbody.insertAdjacentHTML('beforeend', createRowHtml(defCode, true, defQty, 'EMR', 'VALVE_FAULTY'));
          }
        });
        if (!tbody.children.length) {
          tbody.innerHTML = createRowHtml('(036) 14.2 KG EMPTY LPG CYLINDER', false, 306, 'Delivered Load');
        }
        recalcTotals();
      });

      // Select All Checkbox
      selectAll?.addEventListener('change', (e) => {
        document.querySelectorAll('.hpcl-row-check').forEach(c => c.checked = e.target.checked);
      });

      // Delegate Quantity Change
      tbody?.addEventListener('input', (e) => {
        if (e.target.classList.contains('hpcl-row-qty')) {
          recalcTotals();
        }
      });

      // Sync Vehicle Number across rows when edited
      vehInput?.addEventListener('input', (e) => {
        const val = e.target.value.toUpperCase();
        document.querySelectorAll('.hpcl-row-veh').forEach(vIn => vIn.value = val);
      });
    }, 100);

    const result = await ui.formModal(html, 'HPCL Portal: CYLINDER RETURN Entry', () => {
      const invNo = document.getElementById('hpcl-inv-no').value.trim();
      const vehNo = document.getElementById('hpcl-veh-no').value.trim();
      const retDate = document.getElementById('hpcl-ret-date').value;

      if (!invNo) {
        Swal.showValidationMessage('Invoice Number is required!');
        return false;
      }
      if (!vehNo) {
        Swal.showValidationMessage('Vehicle Number is required!');
        return false;
      }

      const rows = [];
      document.querySelectorAll('#hpcl-rows-body tr.hpcl-data-row').forEach(tr => {
        const eqCode = tr.querySelector('.hpcl-row-eq').value;
        const emptDef = tr.querySelector('.hpcl-row-empt-def').value;
        const qty = parseInt(tr.querySelector('.hpcl-row-qty').value) || 0;
        const sealed = tr.querySelector('.hpcl-row-sealed').checked ? 1 : 0;
        const retType = tr.querySelector('.hpcl-row-ret-type').value;
        const emrReason = tr.querySelector('.hpcl-row-reason').value;
        const rem = tr.querySelector('.hpcl-row-remarks').value.trim();

        if (qty > 0) {
          rows.push({
            EquipmentCode: eqCode,
            EmptyOrDefective: emptDef,
            Quantity: qty,
            Sealed: sealed,
            ReturnType: retType,
            EmrReasonCode: emrReason,
            Remarks: rem
          });
        }
      });

      if (!rows.length) {
        Swal.showValidationMessage('At least one row with quantity > 0 is required for cylinder return!');
        return false;
      }

      return {
        InvoiceNumber: invNo,
        InvoiceDate: document.getElementById('hpcl-inv-date').value,
        ReturnNumber: document.getElementById('hpcl-ret-no').value.trim(),
        ReturnDate: retDate,
        VehicleNumber: vehNo.toUpperCase(),
        Remarks: document.getElementById('hpcl-global-remarks').value.trim(),
        Rows: rows
      };
    });

    if (result) {
      const res = await api('recordHpclCylinderReturn', result, { loaderMessage: 'Submitting HPCL Cylinder Return & updating stock...' });
      if (res.ok) {
        ui.success(res.message || 'HPCL Cylinder Return submitted successfully!');
        this.loadStock();
      }
    }
  }
};
