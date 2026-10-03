/**
 * SHIV SHAKTI HP GAS - HAWKER DISPATCH & DELIVERY RECONCILIATION MODULE
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { utils } from '../utils.js';
import { auth } from '../auth.js';

let dispatchLogs = [];
let hawkerEmployees = [];

export const dispatchModule = {
  async init() {
    this.renderContainer();
    await Promise.all([this.loadHawkers(), this.loadDispatchLogs()]);
  },

  renderContainer() {
    const root = document.getElementById('view-dispatch');
    if (!root) return;

    root.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);">Hawker & Godown Delivery Dispatch</h2>
            <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Track vehicle cylinder loading, returns, net distribution, collections & shortage reconciliation</p>
          </div>
          <div style="display:flex; gap:8px;">
            <button id="disp-perf-btn" class="btn btn-secondary btn-sm">
              <i class="fa-solid fa-chart-column"></i> Hawker Performance
            </button>
            <button id="disp-create-btn" class="btn btn-primary btn-sm" ${!auth.can('dispatch', 'create') ? 'disabled' : ''}>
              <i class="fa-solid fa-truck-ramp-box"></i> New Dispatch Log
            </button>
          </div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="card" style="margin-bottom:16px; padding:14px 20px;">
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
          <input type="date" id="disp-date-filter" class="form-control" value="${utils.today()}" style="width:160px;">
          <select id="disp-hawker-filter" class="form-select" style="width:200px;">
            <option value="">All Delivery Hawkers</option>
          </select>
          <button id="disp-refresh-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-arrows-rotate"></i></button>
        </div>
      </div>

      <!-- Dispatch Records Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Trip No</th>
                <th>Hawker</th>
                <th>Cylinder</th>
                <th class="text-center">Loaded</th>
                <th class="text-center">Ret. Empty</th>
                <th class="text-center">Net Sold</th>
                <th class="text-right">Expected</th>
                <th class="text-right">Cash Dep.</th>
                <th class="text-right">UPI</th>
                <th class="text-left" style="min-width:140px;">HP Pay Delivery</th>
                <th class="text-right">Shortage / Excess</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody id="disp-table-body">
              <tr><td colspan="12" class="text-center" style="color:var(--text-muted); padding:24px;">Loading dispatch logs...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('disp-create-btn').addEventListener('click', () => this.openDispatchModal());
    document.getElementById('disp-date-filter').addEventListener('change', () => this.loadDispatchLogs());
    document.getElementById('disp-hawker-filter').addEventListener('change', () => this.loadDispatchLogs());
    document.getElementById('disp-refresh-btn').addEventListener('click', () => this.loadDispatchLogs());
    document.getElementById('disp-perf-btn').addEventListener('click', () => this.openPerformanceModal());
  },

  async loadHawkers() {
    const res = await api('listEmployees', { status: 'active' }, { loader: false });
    if (res.ok && res.data) {
      hawkerEmployees = res.data;
      const select = document.getElementById('disp-hawker-filter');
      if (select) {
        select.innerHTML = '<option value="">All Delivery Hawkers</option>' +
          hawkerEmployees.map(e => `<option value="${e.EmpID}">${utils.escapeHtml(e.Name)} (${e.Role})</option>`).join('');
      }
    }
  },

  async loadDispatchLogs() {
    const date = document.getElementById('disp-date-filter')?.value || utils.today();
    const empId = document.getElementById('disp-hawker-filter')?.value || null;

    const res = await api('listDispatch', { date, EmpID: empId }, { loader: false });
    const tbody = document.getElementById('disp-table-body');
    if (!tbody) return;

    if (!res.ok || !res.data || !res.data.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12">
            <div class="empty-state">
              <div class="empty-state-icon"><i class="fa-solid fa-truck"></i></div>
              <div class="empty-state-title">No dispatch logs found</div>
              <div class="empty-state-desc">No vehicle dispatches recorded for date ${utils.formatDate(date)}.</div>
            </div>
          </td>
        </tr>
      `;
      dispatchLogs = [];
      return;
    }

    dispatchLogs = res.data;
    tbody.innerHTML = dispatchLogs.map(d => {
      const shortage = Number(d.ShortageAmount) || 0;
      const excess = Number(d.ExcessAmount) || 0;
      let diffHtml = '<span class="num-font" style="color:var(--color-success);">0.00</span>';
      if (shortage > 0) {
        diffHtml = `<span class="num-font" style="color:var(--color-danger); font-weight:700;">-${utils.formatCurrency(shortage)}</span>`;
      } else if (excess > 0) {
        diffHtml = `<span class="num-font" style="color:var(--color-info); font-weight:700;">+${utils.formatCurrency(excess)}</span>`;
      }

      const hpCount = Number(d.HPPayConsumerCount || 0);
      const hpAmt = Number(d.HPPayDeposited || 0);
      let hpDetails = d.HPPayConsumerDetails || '';
      let hpDeliveryHtml = '<span style="color:var(--text-muted);">-</span>';
      if (hpCount > 0 || hpAmt > 0) {
        hpDeliveryHtml = `
          <div>
            <span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700; font-size:11px;">
              <i class="fa-solid fa-mobile-screen"></i> ${hpCount} Cyl (${utils.formatCurrency(hpAmt)})
            </span>
            ${hpDetails ? `<div style="font-family:monospace; font-size:10.5px; color:#0284c7; font-weight:700; margin-top:2px; word-break:break-all;" title="Consumer Nos: ${utils.escapeHtml(hpDetails)}">${utils.escapeHtml(hpDetails)}</div>` : ''}
          </div>
        `;
      }

      return `
        <tr>
          <td><strong>${utils.escapeHtml(d.DispatchNumber)}</strong></td>
          <td><strong>${utils.escapeHtml(d.HawkerName)}</strong></td>
          <td>${utils.escapeHtml(d.CylinderType)}</td>
          <td class="text-center num-font" style="font-weight:700;">${d.LoadedQuantity}</td>
          <td class="text-center num-font">${d.ReturnedEmpty}</td>
          <td class="text-center num-font" style="font-weight:700; color:var(--primary);">${d.NetSold}</td>
          <td class="text-right num-font">${utils.formatCurrency(d.ExpectedCollection)}</td>
          <td class="text-right num-font" style="color:var(--color-success);">${utils.formatCurrency(d.CashDeposited)}</td>
          <td class="text-right num-font" style="color:var(--color-info);">${utils.formatCurrency(d.UPIDeposited)}</td>
          <td class="text-left">${hpDeliveryHtml}</td>
          <td class="text-right">${diffHtml}</td>
          <td class="text-center" style="white-space:nowrap;">
            <div style="display:inline-flex; gap:6px; align-items:center;">
              <button class="action-icon view-icon view-disp-btn" data-id="${d.DispatchID}" title="View Dispatch Details">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button class="action-icon print-icon print-disp-btn" data-id="${d.DispatchID}" title="Print Gate Pass">
                <i class="fa-solid fa-print"></i>
              </button>
              ${auth.can('dispatch', 'update') ? `
              <button class="action-icon edit-icon edit-disp-btn" data-id="${d.DispatchID}" title="Edit Trip Log">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.view-disp-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const obj = dispatchLogs.find(d => d.DispatchID === id);
        if (obj) this.viewDispatchDetails(obj);
      });
    });

    tbody.querySelectorAll('.print-disp-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const obj = dispatchLogs.find(d => d.DispatchID === id);
        if (obj) {
          import('./print.js').then(m => m.printEngine.openPreview('gate_pass', obj));
        }
      });
    });

    tbody.querySelectorAll('.edit-disp-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const obj = dispatchLogs.find(d => d.DispatchID === id);
        if (obj) this.openDispatchModal(obj);
      });
    });
  },

  viewDispatchDetails(d) {
    const shortage = Number(d.ShortageAmount) || 0;
    const excess = Number(d.ExcessAmount) || 0;
    let diffStatus = '<span class="badge badge-success">Balanced (No Shortage)</span>';
    if (shortage > 0) {
      diffStatus = `<span class="badge badge-danger">Shortage: -${utils.formatCurrency(shortage)}</span>`;
    } else if (excess > 0) {
      diffStatus = `<span class="badge badge-info">Excess: +${utils.formatCurrency(excess)}</span>`;
    }

    const html = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="background:var(--color-surface-subtle); padding:16px; border-radius:var(--r-md); display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; border:1px solid var(--border-color);">
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Dispatch Number</div>
            <div style="font-size:16px; font-weight:800; color:var(--primary);">${utils.escapeHtml(d.DispatchNumber || 'DISP-' + d.DispatchID)}</div>
          </div>
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Trip Date</div>
            <div style="font-size:14px; font-weight:600;">${utils.formatDate(d.Date)}</div>
          </div>
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Hawker / Driver</div>
            <div style="font-size:14px; font-weight:700;">${utils.escapeHtml(d.HawkerName || d.EmployeeName || 'N/A')}</div>
          </div>
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Cylinder Variant</div>
            <div style="font-size:14px; font-weight:600;">${utils.escapeHtml(d.CylinderType || '14.2 KG Domestic')}</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px;">
          <div style="background:var(--color-surface); border:1px solid var(--border-color); border-radius:var(--r-sm); padding:12px; text-align:center;">
            <div style="font-size:11px; color:var(--text-muted); font-weight:700;">LOADED</div>
            <div class="num-font" style="font-size:20px; font-weight:800; color:var(--text-main);">${d.LoadedQuantity || 0}</div>
          </div>
          <div style="background:var(--color-surface); border:1px solid var(--border-color); border-radius:var(--r-sm); padding:12px; text-align:center;">
            <div style="font-size:11px; color:var(--text-muted); font-weight:700;">EMPTY RET.</div>
            <div class="num-font" style="font-size:20px; font-weight:800; color:var(--text-muted);">${d.ReturnedEmpty || 0}</div>
          </div>
          <div style="background:var(--color-surface); border:1px solid var(--border-color); border-radius:var(--r-sm); padding:12px; text-align:center;">
            <div style="font-size:11px; color:var(--text-muted); font-weight:700;">FULL RET.</div>
            <div class="num-font" style="font-size:20px; font-weight:800; color:var(--text-muted);">${d.ReturnedFull || 0}</div>
          </div>
          <div style="background:var(--color-surface); border:1px solid var(--border-color); border-radius:var(--r-sm); padding:12px; text-align:center;">
            <div style="font-size:11px; color:var(--text-muted); font-weight:700;">NET DELIVERED</div>
            <div class="num-font" style="font-size:20px; font-weight:800; color:var(--color-success);">${d.NetSold || 0}</div>
          </div>
        </div>

        <div style="background:var(--color-surface-subtle); border:1px solid var(--border-color); border-radius:var(--r-md); padding:16px;">
          <h4 style="font-size:12px; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px; font-weight:800;">Collections & Settlement</h4>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
            <span>Expected Revenue Collection:</span>
            <strong class="num-font">${utils.formatCurrency(d.ExpectedCollection || 0)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
            <span>Cash Deposited:</span>
            <strong class="num-font" style="color:var(--color-success);">${utils.formatCurrency(d.CashDeposited || 0)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
            <span>UPI / Digital Deposited:</span>
            <strong class="num-font" style="color:var(--color-info);">${utils.formatCurrency(d.UPIDeposited || 0)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; margin-top:4px;">
            <span>Reconciliation Status:</span>
            <span>${diffStatus}</span>
          </div>
        </div>
      </div>
    `;

    ui.viewDetails(`Dispatch Trip Memo #${d.DispatchNumber || d.DispatchID}`, html, () => {
      import('./print.js').then(m => m.printEngine.openPreview('gate_pass', d));
    });
  },

  async openDispatchModal(disp = null) {
    const isEdit = Boolean(disp);
    const hawkerOptions = hawkerEmployees.map(h => `
      <option value="${h.EmpID}" ${disp && Number(disp.EmpID) === Number(h.EmpID) ? 'selected' : ''}>
        ${utils.escapeHtml(h.Name)} (${h.Role})
      </option>
    `).join('');

    let existingConsumersText = '';
    if (disp && disp.HPPayConsumerDetails) {
      try {
        const parsed = JSON.parse(disp.HPPayConsumerDetails);
        if (Array.isArray(parsed)) {
          existingConsumersText = parsed.map(p => typeof p === 'object' ? p.ConsumerNo : p).filter(Boolean).join(', ');
        } else {
          existingConsumersText = String(disp.HPPayConsumerDetails);
        }
      } catch(e) {
        existingConsumersText = String(disp.HPPayConsumerDetails);
      }
    }

    const html = `
      <div style="display:flex; flex-direction:column; gap:6px; text-align:left;">
        <!-- Section 1: Trip & Hawker Assignment -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-truck-ramp-box"></i>
            <span>Hawker & Trip Assignment</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-user-gear"></i> Delivery Hawker *</label>
              <select id="dm-hawker" class="form-select" required>
                <option value="">-- Choose Assigned Hawker --</option>
                ${hawkerOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-calendar-day"></i> Dispatch Date *</label>
              <input type="date" id="dm-date" class="form-control" value="${disp ? disp.Date : utils.today()}" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-truck"></i> Vehicle / Cart Number</label>
              <input type="text" id="dm-vehicle" class="form-control" placeholder="e.g. BR-32-1234 / Cart #3" value="${disp ? utils.escapeHtml(disp.VehicleNo || '') : ''}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-route"></i> Delivery Route / Area</label>
              <input type="text" id="dm-remarks" class="form-control" placeholder="e.g. Pandaul Bazar & Ward 4" value="${disp ? utils.escapeHtml(disp.Remarks || '') : ''}">
            </div>
          </div>
        </div>

        <!-- Section 2: Cylinder Inventory Movement -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-gas-pump"></i>
            <span>Cylinder Movement (Loaded vs Returned)</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-fire"></i> Cylinder Variant</label>
              <select id="dm-cyl-type" class="form-select">
                <option value="14.2 KG Domestic" ${!disp || disp.CylinderType === '14.2 KG Domestic' ? 'selected' : ''}>14.2 KG Domestic</option>
                <option value="19 KG Commercial" ${disp && disp.CylinderType === '19 KG Commercial' ? 'selected' : ''}>19 KG Commercial</option>
                <option value="5 KG Commercial" ${disp && disp.CylinderType === '5 KG Commercial' ? 'selected' : ''}>5 KG Commercial</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-arrow-up-from-bracket text-primary"></i> Outward Loaded Full *</label>
              <input type="number" id="dm-loaded" class="form-control num-font" placeholder="40" value="${disp ? disp.LoadedQuantity : '40'}" min="1" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-arrow-down-to-bracket text-warning"></i> Returned Empty</label>
              <input type="number" id="dm-ret-empty" class="form-control num-font" placeholder="0" value="${disp ? disp.ReturnedEmpty : '0'}" min="0">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-rotate-left text-danger"></i> Returned Full Unsold</label>
              <input type="number" id="dm-ret-full" class="form-control num-font" placeholder="0" value="${disp ? disp.ReturnedFull : '0'}" min="0">
            </div>
          </div>
        </div>

        <!-- Section 3: Financial Settlements & Collection -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-wallet"></i>
            <span>Trip Collections & Dues Breakdown</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-money-bill"></i> Cash Deposited (₹)</label>
              <input type="number" id="dm-cash" class="form-control num-font" placeholder="0" value="${disp ? disp.CashDeposited : '0'}" min="0" step="any">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-qrcode"></i> UPI Deposited (₹)</label>
              <input type="number" id="dm-upi" class="form-control num-font" placeholder="0" value="${disp ? disp.UPIDeposited : '0'}" min="0" step="any">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-users text-primary"></i> HP Pay Consumer Count (Qty)</label>
              <input type="number" id="dm-hppay-count" class="form-control num-font" placeholder="0" value="${disp ? (disp.HPPayConsumerCount || 0) : '0'}" min="0">
              <small style="color:var(--text-muted); font-size:11px;">Delivery to HP Pay Consumers</small>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-mobile-screen-button text-primary"></i> HP Pay Total (₹)</label>
              <input type="number" id="dm-hppay" class="form-control num-font" placeholder="0" value="${disp ? (disp.HPPayDeposited || 0) : '0'}" min="0" step="any">
              <small style="color:var(--text-muted); font-size:11px;">Auto: Rate × Consumer Count</small>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-hand-holding-dollar"></i> Customer Dues Allowed (₹)</label>
              <input type="number" id="dm-dues" class="form-control num-font" placeholder="0" value="${disp ? disp.DuesAllowed : '0'}" min="0" step="any">
            </div>

            <!-- HP Pay Individual Consumer Numbers Section -->
            <div class="form-group" style="grid-column: 1 / -1; margin-top:8px;">
              <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
                <span><i class="fa-solid fa-address-book text-primary"></i> HP Pay Consumer Numbers (Comma or Newline separated)</span>
                <span id="dm-hppay-badge" class="badge badge-info" style="font-size:11px;">0 Consumers</span>
              </label>
              <textarea id="dm-hppay-consumers" class="form-control" rows="2" placeholder="e.g. 201452, 201453, 201454 (Enter 6-digit HPCL consumer numbers)">${existingConsumersText}</textarea>
              <small style="color:var(--text-muted); font-size:11px;">Enter 6-digit HPCL consumer numbers to automatically compute consumer count, revenue and populate Rojnamcha register.</small>
            </div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const consumersTextarea = document.getElementById('dm-hppay-consumers');
      const hpCountIn = document.getElementById('dm-hppay-count');
      const hpAmtIn = document.getElementById('dm-hppay');
      const badge = document.getElementById('dm-hppay-badge');

      const updateFromConsumers = () => {
        const text = consumersTextarea?.value || '';
        const list = text.split(/[\r\n,]+/).map(s => s.trim()).filter(Boolean);
        const count = list.length;
        if (badge) badge.textContent = `${count} Consumer${count === 1 ? '' : 's'}`;
        if (count > 0 && hpCountIn) {
          hpCountIn.value = count;
          const rate = (disp && Number(disp.Rate) > 0) ? Number(disp.Rate) : 1042.00;
          if (hpAmtIn) hpAmtIn.value = (count * rate).toFixed(2);
        }
      };

      consumersTextarea?.addEventListener('input', updateFromConsumers);
      updateFromConsumers();

      hpCountIn?.addEventListener('input', () => {
        const count = parseInt(hpCountIn.value) || 0;
        const rate = (disp && Number(disp.Rate) > 0) ? Number(disp.Rate) : 1042.00;
        if (hpAmtIn) hpAmtIn.value = (count * rate).toFixed(2);
        if (badge) badge.textContent = `${count} Consumer${count === 1 ? '' : 's'}`;
      });
    }, 150);

    const result = await ui.formModal(html, isEdit ? `Edit Dispatch: ${disp.DispatchNumber}` : 'Record Hawker Dispatch Trip', () => {
      const empId = parseInt(document.getElementById('dm-hawker').value);
      const loaded = parseInt(document.getElementById('dm-loaded').value);
      if (!empId) {
        Swal.showValidationMessage('Select delivery hawker!');
        return false;
      }
      if (!loaded || loaded <= 0) {
        Swal.showValidationMessage('Loaded cylinders must be greater than zero!');
        return false;
      }
      const hpCount = parseInt(document.getElementById('dm-hppay-count').value) || 0;
      const rate = (disp && Number(disp.Rate) > 0) ? Number(disp.Rate) : 1042.00;
      const hpAmt = parseFloat(document.getElementById('dm-hppay').value) || (hpCount * rate);

      return {
        DispatchID: isEdit ? disp.DispatchID : null,
        EmpID: empId,
        Date: document.getElementById('dm-date').value,
        CylinderType: document.getElementById('dm-cyl-type').value,
        LoadedQuantity: loaded,
        ReturnedEmpty: parseInt(document.getElementById('dm-ret-empty').value) || 0,
        ReturnedFull: parseInt(document.getElementById('dm-ret-full').value) || 0,
        CashDeposited: parseFloat(document.getElementById('dm-cash').value) || 0,
        UPIDeposited: parseFloat(document.getElementById('dm-upi').value) || 0,
        HPPayConsumerCount: hpCount,
        HPPayRate: rate,
        HPPayDeposited: hpAmt,
        HPPayConsumerDetails: document.getElementById('dm-hppay-consumers')?.value.trim() || '',
        DuesAllowed: parseFloat(document.getElementById('dm-dues').value) || 0,
        VehicleNo: document.getElementById('dm-vehicle').value.trim(),
        Remarks: document.getElementById('dm-remarks').value.trim()
      };
    });

    if (result) {
      const res = await api('saveDispatch', result, { loaderMessage: 'Saving dispatch trip...' });
      if (res.ok) {
        ui.success('Dispatch log saved successfully.');
        this.loadDispatchLogs();
      }
    }
  },

  async openPerformanceModal() {
    const res = await api('getHawkerPerformance', {}, { loaderMessage: 'Calculating hawker performance...' });
    if (!res.ok || !res.data) return;

    const list = res.data;
    const rows = list.map(h => `
      <tr>
        <td><strong>${utils.escapeHtml(h.Name)}</strong></td>
        <td class="text-center num-font">${h.TotalTrips}</td>
        <td class="text-center num-font">${h.TotalSold}</td>
        <td class="text-right num-font">${utils.formatCurrency(h.TotalCash)}</td>
        <td class="text-right num-font">${utils.formatCurrency(h.TotalUPI)}</td>
        <td class="text-right num-font" style="${Number(h.TotalShortage) > 0 ? 'color:var(--color-danger); font-weight:700;' : ''}">
          ${utils.formatCurrency(h.TotalShortage)}
        </td>
      </tr>
    `).join('');

    const html = `
      <div style="text-align:left;">
        <div style="max-height:360px; overflow-y:auto; border:1px solid #eee; border-radius:6px;">
          <table class="table" style="font-size:12.5px;">
            <thead>
              <tr>
                <th>Hawker</th>
                <th class="text-center">Trips</th>
                <th class="text-center">Total Sold</th>
                <th class="text-right">Cash</th>
                <th class="text-right">UPI</th>
                <th class="text-right">Shortage</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows : '<tr><td colspan="6" class="text-center" style="padding:16px;">No performance records available.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    ui.viewDetails('Hawker Performance Register', html);
  }
};
