/**
 * SHIV SHAKTI HP GAS - EMPLOYEE ATTENDANCE MODULE
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { utils } from '../utils.js';
import { auth } from '../auth.js';

let attendanceRecords = [];

export const attendanceModule = {
  async init() {
    this.renderContainer();
    await this.loadAttendance();
  },

  renderContainer() {
    const root = document.getElementById('view-attendance');
    if (!root) return;

    root.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);">Daily Staff Attendance Register</h2>
            <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Track daily roster presence, leaves, half-days and sync with payroll calculation</p>
          </div>
          <div style="display:flex; gap:8px;">
            <button id="att-mark-all-btn" class="btn btn-secondary btn-sm" ${!auth.can('attendance', 'create') ? 'disabled' : ''}>
              <i class="fa-solid fa-check-double"></i> Mark All Present
            </button>
            <button id="att-save-btn" class="btn btn-primary btn-sm" ${!auth.can('attendance', 'create') ? 'disabled' : ''}>
              <i class="fa-solid fa-floppy-disk"></i> Save Attendance
            </button>
          </div>
        </div>
      </div>

      <!-- Date Toolbar -->
      <div class="card" style="margin-bottom:16px; padding:14px 20px;">
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
          <label style="font-size:13px; font-weight:600;">Attendance Date:</label>
          <input type="date" id="att-date-filter" class="form-control" value="${utils.today()}" style="width:160px;">
          <button id="att-refresh-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-arrows-rotate"></i> Reload</button>
        </div>
      </div>

      <!-- Attendance Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Role</th>
                <th class="text-center" style="width:200px;">Attendance Status</th>
                <th>Remarks / Reason</th>
              </tr>
            </thead>
            <tbody id="att-table-body">
              <tr><td colspan="4" class="text-center" style="color:var(--text-muted); padding:24px;">Loading attendance roster...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('att-date-filter').addEventListener('change', () => this.loadAttendance());
    document.getElementById('att-refresh-btn').addEventListener('click', () => this.loadAttendance());
    document.getElementById('att-save-btn').addEventListener('click', () => this.saveAttendance());
    document.getElementById('att-mark-all-btn').addEventListener('click', () => {
      document.querySelectorAll('.att-status-select').forEach(sel => {
        sel.value = 'PRESENT';
      });
      ui.toast('All marked present. Click "Save Attendance" to commit.');
    });
  },

  async loadAttendance() {
    const date = document.getElementById('att-date-filter')?.value || utils.today();
    const res = await api('getAttendance', { date }, { loader: false });
    const tbody = document.getElementById('att-table-body');
    if (!tbody) return;

    if (!res.ok || !res.data || !res.data.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding:24px; color:var(--text-muted);">No active staff found in employee master.</td></tr>';
      return;
    }

    attendanceRecords = res.data;
    tbody.innerHTML = attendanceRecords.map((r, idx) => `
      <tr>
        <td><strong>${utils.escapeHtml(r.Name)}</strong></td>
        <td><span class="badge badge-secondary">${utils.escapeHtml(r.Role)}</span></td>
        <td class="text-center">
          <select class="form-select att-status-select" data-idx="${idx}" style="height:34px; font-weight:700;">
            <option value="PRESENT" ${(!r.Status || r.Status === 'PRESENT') ? 'selected' : ''}>PRESENT</option>
            <option value="ABSENT" ${r.Status === 'ABSENT' ? 'selected' : ''}>ABSENT</option>
            <option value="HALF_DAY" ${r.Status === 'HALF_DAY' ? 'selected' : ''}>HALF DAY</option>
            <option value="LEAVE" ${r.Status === 'LEAVE' ? 'selected' : ''}>LEAVE</option>
          </select>
        </td>
        <td>
          <input type="text" class="form-control att-remarks-input" data-idx="${idx}" value="${utils.escapeHtml(r.Remarks || '')}" placeholder="Optional notes" style="height:34px;">
        </td>
      </tr>
    `).join('');
  },

  async saveAttendance() {
    const date = document.getElementById('att-date-filter').value;
    const records = [];

    const selects = document.querySelectorAll('.att-status-select');
    const remarks = document.querySelectorAll('.att-remarks-input');

    selects.forEach((sel, i) => {
      const idx = parseInt(sel.dataset.idx);
      const emp = attendanceRecords[idx];
      records.push({
        EmpID: emp.EmpID,
        Status: sel.value,
        Remarks: remarks[i].value.trim()
      });
    });

    const res = await api('markAttendance', { Date: date, records }, { loaderMessage: 'Saving attendance roster...' });
    if (res.ok) {
      ui.success(`Attendance roster for ${utils.formatDate(date)} saved successfully.`);
      this.loadAttendance();
    }
  }
};
