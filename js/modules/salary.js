/**
 * SHIV SHAKTI HP GAS - PAYROLL & SALARY DISBURSEMENT MODULE
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { utils } from '../utils.js';
import { auth } from '../auth.js';
import { printEngine } from './print.js';

let employees = [];
let currentCalc = null;

export const salaryModule = {
  async init() {
    this.renderContainer();
    await this.loadEmployees();
  },

  renderContainer() {
    const root = document.getElementById('view-salary');
    if (!root) return;

    const currentMonth = new Date().toISOString().substring(0, 7);

    root.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);">Payroll & Employee Salary Engine</h2>
            <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Automated attendance prorating, delivery incentive credits, advance recovery and payslip printing</p>
          </div>
          <div>
            <button id="sal-issue-advance-btn" class="btn btn-secondary btn-sm" ${!auth.can('salary', 'create') ? 'disabled' : ''}>
              <i class="fa-solid fa-hand-holding-dollar"></i> Issue Staff Advance
            </button>
          </div>
        </div>
      </div>

      <!-- Controls Card -->
      <div class="card" style="margin-bottom:20px;">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Salary Month</label>
            <input type="month" id="sal-month" class="form-control" value="${currentMonth}">
          </div>
          <div class="form-group">
            <label class="form-label">Select Employee</label>
            <select id="sal-employee-select" class="form-select">
              <option value="">-- Choose Staff Member --</option>
            </select>
          </div>
          <div class="form-group" style="align-self: flex-end;">
            <button id="sal-calc-btn" class="btn btn-primary" style="width:100%; height:40px;">
              <i class="fa-solid fa-calculator"></i> Calculate Payroll
            </button>
          </div>
        </div>
      </div>

      <!-- Salary Breakdown Card (Initially empty) -->
      <div id="sal-breakdown-card" class="card" style="display:none;">
        <!-- Calculated breakdown loaded here -->
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('sal-calc-btn').addEventListener('click', () => this.calculateSalary());
    document.getElementById('sal-issue-advance-btn').addEventListener('click', () => this.openAdvanceModal());
  },

  async loadEmployees() {
    const res = await api('listEmployees', { status: 'active' }, { loader: false });
    if (res.ok && res.data) {
      employees = res.data;
      const select = document.getElementById('sal-employee-select');
      if (select) {
        select.innerHTML = '<option value="">-- Choose Staff Member --</option>' +
          employees.map(e => `<option value="${e.EmpID}">${utils.escapeHtml(e.Name)} (${e.Role})</option>`).join('');
      }
    }
  },

  async calculateSalary() {
    const empId = parseInt(document.getElementById('sal-employee-select').value);
    const month = document.getElementById('sal-month').value;

    if (!empId) {
      ui.warn('Please select an employee.');
      return;
    }

    const res = await api('calcSalary', { EmpID: empId, SalaryMonth: month }, { loaderMessage: 'Calculating payroll...' });
    if (!res.ok || !res.data) return;

    currentCalc = res.data;
    const card = document.getElementById('sal-breakdown-card');
    card.style.display = 'block';

    card.innerHTML = `
      <div class="card-header">
        <div class="card-title">Salary Breakdown: ${utils.escapeHtml(currentCalc.EmployeeName)} (${month})</div>
        <div style="display:flex; gap:8px;">
          <button id="sal-view-modal-btn" class="btn btn-secondary btn-sm" title="View Payslip Summary">
            <i class="fa-solid fa-eye"></i> View Summary
          </button>
          <button id="sal-print-slip-btn" class="btn btn-secondary btn-sm" title="Print Official Payslip">
            <i class="fa-solid fa-print"></i> Print Payslip
          </button>
          <button id="sal-finalize-btn" class="btn btn-success btn-sm" ${!auth.can('salary', 'approve') ? 'disabled' : ''}>
            <i class="fa-solid fa-check"></i> Finalize & Lock Payroll
          </button>
        </div>
      </div>

      <div class="card-body">
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px; margin-bottom:20px;">
          <!-- Earnings -->
          <div style="background:var(--bg-body); padding:16px; border-radius:var(--radius-md); border:1px solid var(--border);">
            <h4 style="font-size:14px; font-weight:700; color:var(--color-success); margin-bottom:12px;">Earnings & Additions</h4>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px;">
              <span>Basic Monthly Pay:</span>
              <strong class="num-font">${utils.formatCurrency(currentCalc.BaseSalary)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px;">
              <span>Attendance Prorated (${currentCalc.PresentDays}/${currentCalc.TotalDaysInMonth} days):</span>
              <strong class="num-font">${currentCalc.AttendanceAdjustment >= 0 ? '+' : ''}${utils.formatCurrency(currentCalc.AttendanceAdjustment)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px;">
              <span>Delivery Incentives (${currentCalc.DeliveriesCount} trips):</span>
              <strong class="num-font" style="color:var(--color-success);">+${utils.formatCurrency(currentCalc.DeliveryIncentive)}</strong>
            </div>
          </div>

          <!-- Deductions -->
          <div style="background:var(--bg-body); padding:16px; border-radius:var(--radius-md); border:1px solid var(--border);">
            <h4 style="font-size:14px; font-weight:700; color:var(--color-danger); margin-bottom:12px;">Deductions & Recoveries</h4>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px;">
              <span>Advance Deductions:</span>
              <strong class="num-font" style="color:var(--color-danger);">-${utils.formatCurrency(currentCalc.AdvanceDeduction)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px;">
              <span>Delivery Shortage Deductions:</span>
              <strong class="num-font" style="color:var(--color-danger);">-${utils.formatCurrency(currentCalc.ShortageDeduction)}</strong>
            </div>
          </div>
        </div>

        <div style="background:var(--primary-light); border:1px solid var(--primary); padding:16px; border-radius:var(--radius-md); display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:16px; font-weight:700; color:var(--primary);">Net Payable Salary:</span>
          <span class="num-font" style="font-size:24px; font-weight:800; color:var(--primary);">${utils.formatCurrency(currentCalc.NetSalary)}</span>
        </div>
      </div>
    `;

    document.getElementById('sal-view-modal-btn')?.addEventListener('click', () => this.viewSalaryDetails(currentCalc, month));
    document.getElementById('sal-finalize-btn').addEventListener('click', () => this.finalizeSalary());
    document.getElementById('sal-print-slip-btn').addEventListener('click', () => {
      printEngine.openPreview('payslip', {
        ...currentCalc,
        SalaryNumber: `SAL-${month.replace('-', '')}-${empId}`
      }, 'A4');
    });
  },

  viewSalaryDetails(calc, month) {
    const grossEarnings = Number(calc.BaseSalary || 0) + Number(calc.AttendanceAdjustment || 0) + Number(calc.DeliveryIncentive || 0);
    const totalDeductions = Number(calc.AdvanceDeduction || 0) + Number(calc.ShortageDeduction || 0);

    const html = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <!-- 1. Executive Employee Identity Card -->
        <div style="background:linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-body) 100%); padding:18px 20px; border-radius:var(--r-md); display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border); box-shadow:var(--shadow-sm); flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, var(--navy-primary) 0%, var(--navy-accent) 100%); color:#fff; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; box-shadow:0 4px 10px rgba(0,0,0,0.15);">
              ${(calc.EmployeeName || 'EM').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div style="font-size:17px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                <span>${utils.escapeHtml(calc.EmployeeName)}</span>
                <span style="font-size:11px; font-weight:700; padding:2px 8px; border-radius:var(--r-pill); background:rgba(0,116,217,0.12); color:var(--navy-accent);">
                  ID: #${calc.EmpID}
                </span>
              </div>
              <div style="font-size:12px; color:var(--text-muted); margin-top:3px; display:flex; align-items:center; gap:8px;">
                <span><i class="fa-solid fa-briefcase" style="color:var(--navy-accent);"></i> ${utils.escapeHtml(calc.Role || 'Staff')}</span>
                <span>•</span>
                <span><i class="fa-regular fa-calendar-check"></i> Month: <strong>${month}</strong></span>
              </div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700; letter-spacing:0.5px;">Payslip Voucher</div>
            <div style="font-size:14px; font-weight:800; font-family:var(--font-mono); color:var(--navy-primary); margin-top:2px;">
              SAL-${month.replace('-', '')}-${calc.EmpID}
            </div>
            <span style="display:inline-block; margin-top:4px; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:var(--r-pill); background:#ecfdf5; color:#15803d; border:1px solid #bbf7d0;">
              <i class="fa-solid fa-circle-check"></i> AUDITED
            </span>
          </div>
        </div>

        <!-- 2. Dual Breakdown: Earnings vs Deductions -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <!-- EARNINGS CARD -->
          <div style="background:var(--bg-surface); border:1px solid #bbf7d0; border-radius:var(--r-md); overflow:hidden; box-shadow:var(--shadow-sm);">
            <div style="background:linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding:12px 16px; border-bottom:1px solid #bbf7d0; display:flex; justify-content:space-between; align-items:center;">
              <div style="color:#15803d; font-size:12.5px; text-transform:uppercase; font-weight:800; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-circle-arrow-up"></i> Earnings & Allowances
              </div>
              <span style="font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px; background:#16a34a; color:#fff;">CREDIT</span>
            </div>
            <div style="padding:14px 16px; display:flex; flex-direction:column; gap:10px;">
              <div style="display:flex; justify-content:space-between; font-size:13px; padding-bottom:8px; border-bottom:1px dashed var(--border);">
                <span style="color:var(--text-main);"><i class="fa-solid fa-money-bill-wave" style="color:#16a34a; width:18px;"></i> Base Salary (Fixed)</span>
                <strong class="num-font" style="font-size:14px;">${utils.formatCurrency(calc.BaseSalary)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:13px; padding-bottom:8px; border-bottom:1px dashed var(--border);">
                <span style="color:var(--text-main);"><i class="fa-solid fa-user-clock" style="color:#0ea5e9; width:18px;"></i> Attendance Adjustment</span>
                <strong class="num-font" style="font-size:14px; color:${Number(calc.AttendanceAdjustment) < 0 ? '#dc2626' : '#16a34a'};">
                  ${Number(calc.AttendanceAdjustment) >= 0 ? '+' : ''}${utils.formatCurrency(calc.AttendanceAdjustment)}
                </strong>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:13px; padding-bottom:8px; border-bottom:1px dashed var(--border);">
                <span style="color:var(--text-main);"><i class="fa-solid fa-truck-ramp-box" style="color:#eab308; width:18px;"></i> Delivery Incentives / Bonus</span>
                <strong class="num-font" style="font-size:14px; color:#16a34a;">+${utils.formatCurrency(calc.DeliveryIncentive)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding-top:6px; margin-top:2px; font-weight:800; font-size:13px; color:#15803d;">
                <span>Gross Total Earnings:</span>
                <span class="num-font" style="font-size:16px;">${utils.formatCurrency(grossEarnings)}</span>
              </div>
            </div>
          </div>

          <!-- DEDUCTIONS CARD -->
          <div style="background:var(--bg-surface); border:1px solid #fecaca; border-radius:var(--r-md); overflow:hidden; box-shadow:var(--shadow-sm);">
            <div style="background:linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); padding:12px 16px; border-bottom:1px solid #fecaca; display:flex; justify-content:space-between; align-items:center;">
              <div style="color:#b91c1c; font-size:12.5px; text-transform:uppercase; font-weight:800; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-circle-arrow-down"></i> Deductions & Recoveries
              </div>
              <span style="font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px; background:#dc2626; color:#fff;">DEBIT</span>
            </div>
            <div style="padding:14px 16px; display:flex; flex-direction:column; gap:10px;">
              <div style="display:flex; justify-content:space-between; font-size:13px; padding-bottom:8px; border-bottom:1px dashed var(--border);">
                <span style="color:var(--text-main);"><i class="fa-solid fa-hand-holding-dollar" style="color:#dc2626; width:18px;"></i> Advance Recovery</span>
                <strong class="num-font" style="font-size:14px; color:#dc2626;">-${utils.formatCurrency(calc.AdvanceDeduction)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:13px; padding-bottom:8px; border-bottom:1px dashed var(--border);">
                <span style="color:var(--text-main);"><i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b; width:18px;"></i> Shortage / Loss Deductions</span>
                <strong class="num-font" style="font-size:14px; color:#dc2626;">-${utils.formatCurrency(calc.ShortageDeduction)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:13px; padding-bottom:8px; border-bottom:1px dashed var(--border);">
                <span style="color:var(--text-muted);"><i class="fa-solid fa-file-invoice" style="width:18px;"></i> Other Taxes / TDS</span>
                <strong class="num-font" style="font-size:14px; color:var(--text-muted);">₹0.00</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding-top:6px; margin-top:2px; font-weight:800; font-size:13px; color:#b91c1c;">
                <span>Total Deductions:</span>
                <span class="num-font" style="font-size:16px;">-${utils.formatCurrency(totalDeductions)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Net Hero Banner -->
        <div style="background:linear-gradient(135deg, var(--navy-primary) 0%, var(--navy-dark) 100%); color:#ffffff; padding:20px 24px; border-radius:var(--r-md); display:flex; justify-content:space-between; align-items:center; box-shadow:0 8px 24px rgba(0,31,63,0.25); flex-wrap:wrap; gap:16px;">
          <div>
            <div style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1px; opacity:0.85;">
              NET TAKE-HOME SALARY PAYABLE
            </div>
            <div style="font-size:12px; opacity:0.75; margin-top:4px;">
              Gross Earnings [${utils.formatCurrency(grossEarnings)}] — Deductions [${utils.formatCurrency(totalDeductions)}]
            </div>
          </div>
          <div style="text-align:right;">
            <div class="num-font" style="font-size:32px; font-weight:900; color:#38bdf8; text-shadow:0 2px 8px rgba(0,0,0,0.3);">
              ${utils.formatCurrency(calc.NetSalary)}
            </div>
            <div style="font-size:11px; font-weight:700; color:#4ade80; display:flex; align-items:center; justify-content:flex-end; gap:4px; margin-top:2px;">
              <i class="fa-solid fa-shield-halved"></i> Ready for Bank Transfer / Cash Disbursement
            </div>
          </div>
        </div>
      </div>
    `;

    ui.viewDetails(`Salary Payslip: ${calc.EmployeeName}`, html, () => {
      printEngine.openPreview('payslip', {
        ...calc,
        SalaryNumber: `SAL-${month.replace('-', '')}-${calc.EmpID}`
      }, 'A4');
    });
  },

  async finalizeSalary() {
    const res = await api('finalizeSalary', currentCalc, { loaderMessage: 'Finalizing payroll...' });
    if (res.ok) {
      ui.success('Salary finalized and advances deducted.');
    }
  },

  async openAdvanceModal() {
    const empOptions = employees.map(e => `<option value="${e.EmpID}">${utils.escapeHtml(e.Name)} (${e.Role})</option>`).join('');
    const currentMonth = new Date().toISOString().substring(0, 7);

    const html = `
      <div style="display:flex; flex-direction:column; gap:6px; text-align:left;">
        <!-- Section 1: Staff & Amount -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-hand-holding-dollar"></i>
            <span>Staff Advance Disbursal Details</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-user-tie"></i> Employee *</label>
              <select id="adv-emp" class="form-select" required>
                <option value="">-- Choose Employee --</option>
                ${empOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-indian-rupee-sign"></i> Advance Amount (₹) *</label>
              <input type="number" id="adv-amt" class="form-control num-font" placeholder="e.g. 2000" min="1" step="any" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-calendar-day"></i> Disbursal Date</label>
              <input type="date" id="adv-date" class="form-control" value="${utils.today()}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-calendar-check"></i> Deduction Month</label>
              <input type="month" id="adv-rec-month" class="form-control" value="${currentMonth}">
            </div>
          </div>
        </div>

        <!-- Section 2: Reason & Audit -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-file-pen"></i>
            <span>Advance Justification & Notes</span>
          </div>
          <div class="form-group">
            <label class="form-label"><i class="fa-solid fa-comment"></i> Purpose / Reason for Advance</label>
            <input type="text" id="adv-reason" class="form-control" placeholder="e.g. Festival advance, emergency medical assistance, fuel allowance">
          </div>
        </div>
      </div>
    `;

    const data = await ui.formModal(html, 'Issue Staff Advance', () => {
      const empId = parseInt(document.getElementById('adv-emp').value);
      const amt = parseFloat(document.getElementById('adv-amt').value);
      if (!empId || !amt || amt <= 0) {
        Swal.showValidationMessage('Employee and positive amount are required!');
        return false;
      }
      return {
        EmpID: empId,
        Amount: amt,
        Date: document.getElementById('adv-date').value,
        RecoveryMonth: document.getElementById('adv-rec-month').value,
        Reason: document.getElementById('adv-reason').value.trim()
      };
    });

    if (data) {
      const res = await api('saveAdvance', data, { loaderMessage: 'Registering advance...' });
      if (res.ok) {
        ui.success('Employee advance registered.');
      }
    }
  }
};
