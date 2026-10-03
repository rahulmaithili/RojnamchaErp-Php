/**
 * SHIV SHAKTI HP GAS - EMPLOYEE MASTER & HR MANAGEMENT MODULE
 * Complete Workforce Management: Hawkers, Godown Handlers, Drivers & Staff
 * Includes Profile Photos, Official ID Badge Generation & KYC Document Vault
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { utils } from '../utils.js';
import { auth } from '../auth.js';
import { printEngine } from './print.js';

let employeeList = [];

export const employeeModule = {
  async init() {
    this.renderContainer();
    await this.loadEmployees();
  },

  renderContainer() {
    const root = document.getElementById('view-employees');
    if (!root) return;

    root.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);">Staff & Delivery Workforce Master</h2>
            <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Manage delivery hawkers, godown handlers, cashiers, ID badges & KYC documents</p>
          </div>
          <div>
            <button id="emp-create-btn" class="btn btn-primary btn-sm" ${!auth.can('employees', 'create') ? 'disabled' : ''}>
              <i class="fa-solid fa-user-plus"></i> Add Employee / Hawker
            </button>
          </div>
        </div>
      </div>

      <!-- Search Toolbar -->
      <div class="card" style="margin-bottom:16px; padding:14px 20px;">
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
          <input type="text" id="emp-search-input" class="form-control" placeholder="Search employee name, mobile or role..." style="flex:1; min-width:240px;">
          <select id="emp-status-filter" class="form-select" style="width:140px;">
            <option value="active" selected>Active</option>
            <option value="deleted">Trash / Deleted</option>
          </select>
          <button id="emp-refresh-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-arrows-rotate"></i> Refresh</button>
        </div>
      </div>

      <!-- Employees Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Emp Code</th>
                <th>Staff Member</th>
                <th>Role / Designation</th>
                <th>Mobile</th>
                <th>Joining Date</th>
                <th class="text-right">Base Salary</th>
                <th class="text-right">Delivery Incentive</th>
                <th class="text-center">Status</th>
                <th class="text-center" style="min-width:240px;">Actions</th>
              </tr>
            </thead>
            <tbody id="emp-table-body">
              <tr><td colspan="9" class="text-center" style="color:var(--text-muted); padding:24px;">Loading employee master...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('emp-create-btn').addEventListener('click', () => this.openEmployeeModal());
    document.getElementById('emp-search-input').addEventListener('input', utils.debounce((e) => {
      this.loadEmployees(e.target.value);
    }, 300));
    document.getElementById('emp-status-filter').addEventListener('change', () => this.loadEmployees());
    document.getElementById('emp-refresh-btn').addEventListener('click', () => this.loadEmployees());
  },

  async loadEmployees(search = '') {
    const status = document.getElementById('emp-status-filter')?.value || 'active';
    const res = await api('listEmployees', { status, search }, { loader: false });
    const tbody = document.getElementById('emp-table-body');
    if (!tbody) return;

    if (!res.ok || !res.data || !res.data.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9">
            <div class="empty-state">
              <div class="empty-state-icon"><i class="fa-solid fa-id-card-clip"></i></div>
              <div class="empty-state-title">No employees found</div>
              <div class="empty-state-desc">Add employees or hawkers to start managing attendance, ID cards and dispatches.</div>
            </div>
          </td>
        </tr>
      `;
      employeeList = [];
      return;
    }

    employeeList = res.data;
    tbody.innerHTML = employeeList.map(e => `
      <tr style="${e.IsDeleted ? 'opacity:0.6;' : ''}">
        <td><strong>${utils.escapeHtml(e.EmpCode)}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            ${e.Photo ? `
              <img src="${e.Photo}" alt="" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1.5px solid #cbd5e1; flex-shrink:0;">
            ` : `
              <div style="width:36px; height:36px; border-radius:50%; background:#e2e8f0; color:#334155; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0;">
                ${utils.escapeHtml((e.Name || 'E').charAt(0).toUpperCase())}
              </div>
            `}
            <div>
              <div style="font-weight:700; color:var(--text-main); font-size:13.5px;">${utils.escapeHtml(e.Name)}</div>
              ${e.EmergencyContact ? `<div style="font-size:11px; color:var(--text-muted);"><i class="fa-solid fa-phone-volume"></i> ${utils.escapeHtml(e.EmergencyContact)}</div>` : ''}
            </div>
          </div>
        </td>
        <td><span class="badge ${e.Role === 'Hawker' ? 'badge-warning' : 'badge-info'}">${utils.escapeHtml(e.Role)}</span></td>
        <td>${utils.escapeHtml(e.Mobile)}</td>
        <td>${utils.formatDate(e.JoiningDate)}</td>
        <td class="text-right num-font" style="font-weight:700;">${utils.formatCurrency(e.Salary)}</td>
        <td class="text-right num-font">${utils.formatCurrency(e.PerDeliveryRate)} / trip</td>
        <td class="text-center">
          <span class="badge ${e.Status === 'ACTIVE' ? 'badge-success' : 'badge-secondary'}">${e.Status}</span>
        </td>
        <td class="text-center" style="white-space:nowrap;">
          <button class="btn btn-primary btn-sm idcard-emp-btn" data-id="${e.EmpID}" title="Generate Official ID Card" style="padding:4px 8px; margin-right:3px;">
            <i class="fa-solid fa-id-card"></i> ID Card
          </button>
          <button class="btn btn-outline btn-sm docs-emp-btn" data-id="${e.EmpID}" title="KYC Documents Vault (Aadhaar, DL, Police, etc.)" style="padding:4px 8px; margin-right:3px;">
            <i class="fa-solid fa-folder-open"></i> Docs
          </button>
          ${!e.IsDeleted && auth.can('employees', 'update') ? `
          <button class="btn btn-secondary btn-sm edit-emp-btn" data-id="${e.EmpID}" title="Edit Staff Profile" style="padding:4px 8px; margin-right:3px;">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>` : ''}
          ${!e.IsDeleted && auth.can('employees', 'delete') ? `
          <button class="btn btn-danger btn-sm del-emp-btn" data-id="${e.EmpID}" title="Delete" style="padding:4px 8px; margin-right:3px;">
            <i class="fa-solid fa-trash"></i>
          </button>` : ''}
          ${e.IsDeleted && auth.getCurrentUser()?.role === 'ADMIN' ? `
          <button class="btn btn-success btn-sm res-emp-btn" data-id="${e.EmpID}" title="Restore" style="padding:4px 8px;">
            <i class="fa-solid fa-rotate-left"></i>
          </button>` : ''}
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.idcard-emp-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const obj = employeeList.find(x => x.EmpID === id);
        if (obj) printEngine.openPreview('id_card', obj, 'id_card');
      });
    });

    tbody.querySelectorAll('.docs-emp-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const obj = employeeList.find(x => x.EmpID === id);
        if (obj) this.openDocumentsModal(obj);
      });
    });

    tbody.querySelectorAll('.edit-emp-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const obj = employeeList.find(x => x.EmpID === id);
        if (obj) this.openEmployeeModal(obj);
      });
    });

    tbody.querySelectorAll('.del-emp-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const confirmed = await ui.confirm('Are you sure you want to move this employee to trash?', 'Delete Employee');
        if (confirmed) {
          const res = await api('deleteEmployee', { EmpID: id });
          if (res.ok) {
            ui.success('Employee deleted.');
            this.loadEmployees();
          }
        }
      });
    });

    tbody.querySelectorAll('.res-emp-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const res = await api('restoreEmployee', { EmpID: id });
        if (res.ok) {
          ui.success('Employee restored.');
          this.loadEmployees();
        }
      });
    });
  },

  async openEmployeeModal(emp = null) {
    const isEdit = Boolean(emp);
    let photoBase64 = emp ? (emp.Photo || null) : null;

    const html = `
      <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
        <!-- Photo Upload Box -->
        <div class="modal-section-card" style="margin-bottom:6px;">
          <div style="display:flex; align-items:center; gap:16px;">
            <div id="em-photo-preview" style="width:68px; height:68px; border-radius:50%; border:2px solid #2563eb; overflow:hidden; background:#f1f5f9; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              ${photoBase64 ? `<img src="${photoBase64}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="fa-solid fa-camera" style="font-size:24px; color:#94a3b8;"></i>`}
            </div>
            <div style="flex:1;">
              <label class="form-label" style="font-weight:700; margin-bottom:4px;"><i class="fa-solid fa-image"></i> Staff Photo (Passport Style)</label>
              <input type="file" id="em-photo-input" class="form-control" accept="image/png,image/jpeg,image/webp" style="font-size:12px; padding:4px 8px;">
              <div style="font-size:11px; color:var(--text-muted); margin-top:3px;">Used on Official ID Badges and Dispatches (JPG, PNG). Max 2MB.</div>
            </div>
            ${photoBase64 ? `
            <div>
              <button type="button" id="em-photo-clear" class="btn btn-outline btn-sm" title="Remove Photo" style="color:#ef4444;"><i class="fa-solid fa-trash"></i></button>
            </div>` : ''}
          </div>
        </div>

        <!-- Section 1: Personal Identification -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-id-card-clip"></i>
            <span>Personal & Contact Information</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-user"></i> Full Legal Name *</label>
              <input type="text" id="em-name" class="form-control" placeholder="e.g. Ramesh Kumar" value="${emp ? utils.escapeHtml(emp.Name) : ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-phone"></i> Mobile Number *</label>
              <input type="tel" id="em-mobile" class="form-control" placeholder="10-digit mobile" value="${emp ? emp.Mobile : ''}" maxlength="10" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-phone-volume"></i> Emergency Contact</label>
              <input type="text" id="em-emergency" class="form-control" placeholder="Family / Alternate contact" value="${emp ? utils.escapeHtml(emp.EmergencyContact || '') : ''}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-circle-check"></i> Employment Status</label>
              <select id="em-status" class="form-select">
                <option value="ACTIVE" ${!emp || emp.Status === 'ACTIVE' ? 'selected' : ''}>Active (Active Duty)</option>
                <option value="INACTIVE" ${emp && emp.Status === 'INACTIVE' ? 'selected' : ''}>Inactive (Deactivated)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Section 2: Role & Payroll -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-briefcase"></i>
            <span>Role, Joining & Compensation</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-user-tag"></i> Designation / Role *</label>
              <select id="em-role" class="form-select">
                <option value="Hawker" ${emp && emp.Role === 'Hawker' ? 'selected' : ''}>Hawker / Delivery Staff</option>
                <option value="Godown Staff" ${emp && emp.Role === 'Godown Staff' ? 'selected' : ''}>Godown Staff</option>
                <option value="Cashier" ${emp && emp.Role === 'Cashier' ? 'selected' : ''}>Cashier / Counter Staff</option>
                <option value="Driver" ${emp && emp.Role === 'Driver' ? 'selected' : ''}>Driver</option>
                <option value="Manager" ${emp && emp.Role === 'Manager' ? 'selected' : ''}>Manager</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-calendar-day"></i> Joining Date</label>
              <input type="date" id="em-joining" class="form-control" value="${emp ? emp.JoiningDate : utils.today()}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-indian-rupee-sign"></i> Monthly Salary (₹)</label>
              <input type="number" id="em-salary" class="form-control num-font" placeholder="12000" value="${emp ? emp.Salary : '12000'}" min="0">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-gas-pump"></i> Per-Delivery Incentive (₹)</label>
              <input type="number" id="em-delivery-rate" class="form-control num-font" placeholder="5" value="${emp ? emp.PerDeliveryRate : '5'}" min="0" step="any">
            </div>
          </div>
        </div>

        <!-- Section 3: Address & Banking -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-building-columns"></i>
            <span>Residential Address & Banking Details</span>
          </div>
          <div class="modal-section-body">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-location-dot"></i> Residential Address</label>
              <input type="text" id="em-address" class="form-control" placeholder="Village / Ward / Landmark, Pandaul" value="${emp ? utils.escapeHtml(emp.Address || '') : ''}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-credit-card"></i> Bank Account / UPI ID</label>
              <input type="text" id="em-bank" class="form-control" placeholder="Bank Name, A/C No, IFSC or UPI ID" value="${emp ? utils.escapeHtml(emp.BankDetails || '') : ''}">
            </div>
          </div>
        </div>
      </div>
    `;

    const result = await ui.formModal(html, isEdit ? `Edit Staff: ${emp.Name}` : 'Register New Employee / Hawker', () => {
      const name = document.getElementById('em-name').value.trim();
      const mobile = document.getElementById('em-mobile').value.trim();
      if (!name || !mobile) {
        Swal.showValidationMessage('Name and Mobile are required!');
        return false;
      }
      return {
        EmpID: isEdit ? emp.EmpID : null,
        Name: name,
        Mobile: mobile,
        Role: document.getElementById('em-role').value,
        JoiningDate: document.getElementById('em-joining').value,
        Salary: parseFloat(document.getElementById('em-salary').value) || 0,
        PerDeliveryRate: parseFloat(document.getElementById('em-delivery-rate').value) || 0,
        EmergencyContact: document.getElementById('em-emergency').value.trim(),
        Status: document.getElementById('em-status').value,
        Address: document.getElementById('em-address').value.trim(),
        BankDetails: document.getElementById('em-bank').value.trim(),
        Photo: photoBase64
      };
    }, {
      onRender: () => {
        const fileInput = document.getElementById('em-photo-input');
        const clearBtn = document.getElementById('em-photo-clear');
        const preview = document.getElementById('em-photo-preview');

        fileInput?.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          if (file.size > 2 * 1024 * 1024) {
            ui.alert('Photo must be less than 2MB', 'warning');
            return;
          }
          const reader = new FileReader();
          reader.onload = (re) => {
            photoBase64 = re.target.result;
            if (preview) {
              preview.innerHTML = `<img src="${photoBase64}" style="width:100%; height:100%; object-fit:cover;">`;
            }
          };
          reader.readAsDataURL(file);
        });

        clearBtn?.addEventListener('click', () => {
          photoBase64 = '';
          if (preview) {
            preview.innerHTML = `<i class="fa-solid fa-camera" style="font-size:24px; color:#94a3b8;"></i>`;
          }
        });
      }
    });

    if (result) {
      const res = await api('saveEmployee', result, { loaderMessage: 'Saving employee...' });
      if (res.ok) {
        ui.success('Employee profile saved.');
        this.loadEmployees();
      }
    }
  },

  /**
   * KYC & MULTI-TYPE DOCUMENT MANAGEMENT VAULT
   * Upload, View, Print, Download, Delete documents for Hawkers & Staff
   */
  async openDocumentsModal(emp) {
    const fetchDocs = async () => {
      const res = await api('listEmployeeDocuments', { EmpID: emp.EmpID }, { loader: false });
      return (res.ok && res.data) ? res.data : [];
    };

    let docs = await fetchDocs();

    const buildDocsTableHtml = (items) => {
      if (!items || !items.length) {
        return `
          <div style="text-align:center; padding:24px 16px; color:var(--text-muted); background:#f8fafc; border-radius:8px; border:1px dashed #cbd5e1;">
            <i class="fa-solid fa-folder-open" style="font-size:32px; color:#94a3b8; margin-bottom:8px;"></i>
            <div style="font-weight:700; color:var(--text-main);">No KYC Documents Uploaded</div>
            <div style="font-size:12px; margin-top:2px;">Upload Aadhaar, DL, Police Verification or Agreement using the form below.</div>
          </div>
        `;
      }

      return `
        <div class="table-responsive" style="max-height:260px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px;">
          <table class="table table-hover" style="margin-bottom:0; font-size:12px;">
            <thead style="background:#f1f5f9; position:sticky; top:0; z-index:2;">
              <tr>
                <th>Doc Type</th>
                <th>Title / Document No.</th>
                <th>File & Size</th>
                <th>Uploaded</th>
                <th class="text-center" style="width:140px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(d => {
                const kb = d.FileSize ? (d.FileSize / 1024).toFixed(1) + ' KB' : '';
                return `
                  <tr>
                    <td><span class="badge badge-info" style="font-size:11px;">${utils.escapeHtml(d.DocType)}</span></td>
                    <td>
                      <div style="font-weight:700; color:var(--text-main);">${utils.escapeHtml(d.DocTitle || d.DocType)}</div>
                      ${d.DocNumber ? `<div style="font-size:11px; color:#64748b;">No: <strong>${utils.escapeHtml(d.DocNumber)}</strong></div>` : ''}
                      ${d.Notes ? `<div style="font-size:10px; color:#94a3b8; font-style:italic;">${utils.escapeHtml(d.Notes)}</div>` : ''}
                    </td>
                    <td>
                      <div>${utils.escapeHtml(d.FileName)}</div>
                      <small style="color:#64748b;">${kb}</small>
                    </td>
                    <td><small style="color:#64748b;">${utils.formatDate(d.UploadedAt)}</small></td>
                    <td class="text-center" style="white-space:nowrap;">
                      <button class="btn btn-outline btn-sm view-doc-btn" data-id="${d.DocID}" title="View Document" style="padding:2px 6px; font-size:11px; margin-right:2px;">
                        <i class="fa-solid fa-eye"></i>
                      </button>
                      <button class="btn btn-secondary btn-sm dl-doc-btn" data-id="${d.DocID}" title="Download Document" style="padding:2px 6px; font-size:11px; margin-right:2px;">
                        <i class="fa-solid fa-download"></i>
                      </button>
                      <button class="btn btn-primary btn-sm print-doc-btn" data-id="${d.DocID}" title="Print Document" style="padding:2px 6px; font-size:11px; margin-right:2px;">
                        <i class="fa-solid fa-print"></i>
                      </button>
                      ${auth.can('employees', 'delete') || auth.can('employees', 'update') ? `
                      <button class="btn btn-danger btn-sm del-doc-btn" data-id="${d.DocID}" title="Delete Document" style="padding:2px 6px; font-size:11px;">
                        <i class="fa-solid fa-trash"></i>
                      </button>` : ''}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    };

    const modalHtml = `
      <div style="display:flex; flex-direction:column; gap:12px; text-align:left;">
        <!-- Employee Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; background:linear-gradient(135deg,#001f3f,#002b5c); color:#fff; padding:12px 16px; border-radius:8px;">
          <div style="display:flex; align-items:center; gap:12px;">
            ${emp.Photo ? `
              <img src="${emp.Photo}" alt="" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:2px solid #fff;">
            ` : `
              <div style="width:40px; height:40px; border-radius:50%; background:#fff; color:#001f3f; display:flex; align-items:center; justify-content:center; font-weight:800;">
                ${utils.escapeHtml((emp.Name || 'E').charAt(0).toUpperCase())}
              </div>
            `}
            <div>
              <div style="font-size:14px; font-weight:800;">${utils.escapeHtml(emp.Name)} (${utils.escapeHtml(emp.EmpCode)})</div>
              <div style="font-size:11px; color:#93c5fd;">Role: ${utils.escapeHtml(emp.Role)} | Mobile: ${utils.escapeHtml(emp.Mobile)}</div>
            </div>
          </div>
          <div>
            <span class="badge badge-warning" style="font-size:11px;"><i class="fa-solid fa-shield-halved"></i> KYC Documents Vault</span>
          </div>
        </div>

        <!-- Document List Container -->
        <div>
          <h4 style="font-size:13px; font-weight:700; margin:0 0 6px; color:var(--text-main);"><i class="fa-solid fa-folder-tree"></i> Stored Documents</h4>
          <div id="emp-docs-list-box">
            ${buildDocsTableHtml(docs)}
          </div>
        </div>

        <!-- Upload New Document Form -->
        <div class="modal-section-card" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px;">
          <div class="modal-section-header" style="margin-bottom:8px; font-size:13px; font-weight:700; color:#001f3f;">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <span>Upload New Verification Document</span>
          </div>
          <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px;">
            <div class="form-group">
              <label class="form-label" style="font-size:11.5px; font-weight:700;">Document Type *</label>
              <select id="new-doc-type" class="form-select" style="font-size:12px;">
                <option value="Aadhaar Card">Aadhaar Card (UIDAI)</option>
                <option value="Driving License">Driving License (DL)</option>
                <option value="Voter ID">Voter ID Card (EPIC)</option>
                <option value="PAN Card">PAN Card</option>
                <option value="Police Verification">Police Verification Certificate</option>
                <option value="Bank Passbook">Bank Passbook / Cheque</option>
                <option value="Employment Agreement">Employment Agreement</option>
                <option value="Medical Certificate">Medical Fitness Certificate</option>
                <option value="Other">Other Document</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11.5px; font-weight:700;">Document Title</label>
              <input type="text" id="new-doc-title" class="form-control" placeholder="e.g. Aadhaar Front & Back" style="font-size:12px;">
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11.5px; font-weight:700;">Document ID / Number</label>
              <input type="text" id="new-doc-number" class="form-control" placeholder="e.g. 12-digit Aadhaar / DL No" style="font-size:12px;">
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11.5px; font-weight:700;">Attach File (Image / PDF) *</label>
              <input type="file" id="new-doc-file" class="form-control" accept="image/*,application/pdf" style="font-size:12px; padding:3px 6px;">
            </div>
          </div>
          <div class="form-group" style="margin-top:8px;">
            <label class="form-label" style="font-size:11.5px;">Verification Notes (Optional)</label>
            <input type="text" id="new-doc-notes" class="form-control" placeholder="e.g. Verified by Agency Manager on Pandaul office" style="font-size:12px;">
          </div>
          <div style="text-align:right; margin-top:10px;">
            <button type="button" id="upload-doc-submit-btn" class="btn btn-primary btn-sm">
              <i class="fa-solid fa-cloud-arrow-up"></i> Upload & Save Document
            </button>
          </div>
        </div>
      </div>
    `;

    const bindDocActionButtons = () => {
      const listBox = document.getElementById('emp-docs-list-box');
      if (!listBox) return;

      // View Action
      listBox.querySelectorAll('.view-doc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const docId = parseInt(e.currentTarget.dataset.id);
          const doc = docs.find(d => d.DocID === docId);
          if (!doc) return;

          if (doc.MimeType && doc.MimeType.startsWith('image/')) {
            ui.viewDetails(
              `${doc.DocType}: ${doc.DocTitle || doc.FileName}`,
              `
              <div style="text-align:center; padding:10px;">
                <div style="margin-bottom:8px; font-size:12px; color:#64748b;">
                  <strong>Doc Number:</strong> ${utils.escapeHtml(doc.DocNumber || 'N/A')} | 
                  <strong>Uploaded:</strong> ${utils.formatDate(doc.UploadedAt)}
                </div>
                <img src="${doc.FileData}" alt="${utils.escapeHtml(doc.DocTitle)}" style="max-width:100%; max-height:70vh; border-radius:6px; border:1px solid #cbd5e1; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
              </div>
              `,
              () => {
                const w = window.open('', '_blank');
                w.document.write(`<html><head><title>${doc.DocTitle}</title></head><body style="margin:0; text-align:center;"><img src="${doc.FileData}" style="max-width:100%;"></body></html>`);
                w.document.close();
                w.focus();
                w.print();
              }
            );
          } else {
            // PDF or other document
            const w = window.open(doc.FileData, '_blank');
            if (!w) {
              const a = document.createElement('a');
              a.href = doc.FileData;
              a.target = '_blank';
              a.click();
            }
          }
        });
      });

      // Download Action
      listBox.querySelectorAll('.dl-doc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const docId = parseInt(e.currentTarget.dataset.id);
          const doc = docs.find(d => d.DocID === docId);
          if (!doc) return;

          const a = document.createElement('a');
          a.href = doc.FileData;
          a.download = doc.FileName || `Document_${doc.DocID}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });
      });

      // Print Action
      listBox.querySelectorAll('.print-doc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const docId = parseInt(e.currentTarget.dataset.id);
          const doc = docs.find(d => d.DocID === docId);
          if (!doc) return;

          const w = window.open('', '_blank');
          if (!w) {
            ui.alert('Please allow popups to print documents.', 'warning');
            return;
          }

          if (doc.MimeType && doc.MimeType.startsWith('image/')) {
            w.document.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>${utils.escapeHtml(doc.DocTitle || doc.FileName)}</title>
                <style>
                  body { margin: 20px; font-family: Arial, sans-serif; text-align: center; }
                  .header { margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                  img { max-width: 95%; max-height: 85vh; border: 1px solid #ccc; }
                </style>
              </head>
              <body>
                <div class="header">
                  <h3 style="margin:0;">SHIV SHAKTI HP GAS - KYC DOCUMENT</h3>
                  <p style="margin:4px 0 0; font-size:12px;">Staff: <strong>${utils.escapeHtml(emp.Name)}</strong> (${utils.escapeHtml(emp.EmpCode)}) | Type: <strong>${utils.escapeHtml(doc.DocType)}</strong> | No: <strong>${utils.escapeHtml(doc.DocNumber || '-')}</strong></p>
                </div>
                <img src="${doc.FileData}">
              </body>
              </html>
            `);
          } else {
            w.document.write(`
              <!DOCTYPE html>
              <html>
              <head><title>${utils.escapeHtml(doc.DocTitle || doc.FileName)}</title></head>
              <body style="margin:0;">
                <iframe src="${doc.FileData}" style="width:100%; height:100vh; border:none;"></iframe>
              </body>
              </html>
            `);
          }
          w.document.close();
          w.focus();
          setTimeout(() => { w.print(); }, 500);
        });
      });

      // Delete Action
      listBox.querySelectorAll('.del-doc-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const docId = parseInt(e.currentTarget.dataset.id);
          const confirmed = await ui.confirm('Are you sure you want to delete this document from staff vault?', 'Delete Document');
          if (confirmed) {
            const res = await api('deleteEmployeeDocument', { DocID: docId });
            if (res.ok) {
              ui.success('Document deleted successfully.');
              docs = await fetchDocs();
              listBox.innerHTML = buildDocsTableHtml(docs);
              bindDocActionButtons();
            }
          }
        });
      });
    };

    await ui.formModal(modalHtml, `KYC Documents: ${emp.Name}`, null, {
      icon: 'fa-folder-open',
      onRender: () => {
        bindDocActionButtons();

        const uploadBtn = document.getElementById('upload-doc-submit-btn');
        uploadBtn?.addEventListener('click', async () => {
          const fileInput = document.getElementById('new-doc-file');
          const docType = document.getElementById('new-doc-type').value;
          const docTitle = document.getElementById('new-doc-title').value.trim() || docType;
          const docNumber = document.getElementById('new-doc-number').value.trim();
          const notes = document.getElementById('new-doc-notes').value.trim();

          if (!fileInput.files || !fileInput.files[0]) {
            ui.alert('Please select a file to upload.', 'warning');
            return;
          }

          const file = fileInput.files[0];
          if (file.size > 10 * 1024 * 1024) {
            ui.alert('File size exceeds 10MB limit.', 'warning');
            return;
          }

          const reader = new FileReader();
          reader.onload = async (re) => {
            const base64Data = re.target.result;
            const payload = {
              EmpID: emp.EmpID,
              DocType: docType,
              DocTitle: docTitle,
              DocNumber: docNumber,
              FileName: file.name,
              FileData: base64Data,
              MimeType: file.type || 'application/octet-stream',
              FileSize: file.size,
              Notes: notes
            };

            const res = await api('uploadEmployeeDocument', payload, { loaderMessage: 'Uploading document...' });
            if (res.ok) {
              ui.success('Document uploaded to vault.');
              // Reset upload inputs
              fileInput.value = '';
              document.getElementById('new-doc-title').value = '';
              document.getElementById('new-doc-number').value = '';
              document.getElementById('new-doc-notes').value = '';

              // Refresh list
              docs = await fetchDocs();
              const listBox = document.getElementById('emp-docs-list-box');
              if (listBox) {
                listBox.innerHTML = buildDocsTableHtml(docs);
                bindDocActionButtons();
              }
            }
          };
          reader.readAsDataURL(file);
        });
      }
    });
  }
};
