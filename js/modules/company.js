/**
 * SHIV SHAKTI HP GAS - COMPANY PROFILE & BASE64 LOGO MODULE
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { utils } from '../utils.js';
import { auth } from '../auth.js';
import { printEngine } from './print.js';

let currentCompany = null;

export const companyModule = {
  async init() {
    this.renderContainer();
    await this.loadCompany();
  },

  renderContainer() {
    const root = document.getElementById('view-company');
    if (!root) return;

    root.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size: 20px; font-weight: 800; color: var(--text-main);">Company & Agency Profile</h2>
            <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">Manage agency registration, statutory details, bank accounts and official branding</p>
          </div>
          <div>
            <button id="company-save-btn" class="btn btn-primary" ${auth.getCurrentUser()?.role !== 'ADMIN' ? 'disabled' : ''}>
              <i class="fa-solid fa-floppy-disk"></i> Save Changes
            </button>
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 280px 1fr; gap:20px;" class="company-layout-grid">
        <!-- Logo Branding Card -->
        <div class="card" style="text-align:center;">
          <div class="card-header">
            <div class="card-title"><i class="fa-solid fa-image"></i> Official Logo</div>
          </div>
          <div class="card-body">
            <div id="company-logo-preview-box" style="width:140px; height:140px; margin: 0 auto 16px auto; border:2px dashed var(--border); border-radius:var(--radius-md); display:flex; align-items:center; justify-content:center; padding:8px; overflow:hidden;">
              <div class="logo-fallback" style="width:100%; height:100%; font-size:24px;">HP</div>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <input type="file" id="company-logo-file-input" accept="image/png, image/jpeg, image/webp, image/svg+xml" style="display:none;">
              <button id="company-logo-upload-btn" class="btn btn-secondary btn-sm" ${auth.getCurrentUser()?.role !== 'ADMIN' ? 'disabled' : ''}>
                <i class="fa-solid fa-upload"></i> Upload / Replace Logo
              </button>
              <button id="company-logo-remove-btn" class="btn btn-danger btn-sm" ${auth.getCurrentUser()?.role !== 'ADMIN' ? 'disabled' : ''}>
                <i class="fa-solid fa-trash"></i> Remove Logo
              </button>
            </div>
            <p style="font-size:11px; color:var(--text-muted); margin-top:12px;">
              Supports PNG, JPG, WEBP, SVG up to 3MB.<br>Logo renders automatically on bills, receipts, rojnamcha & payslips.
            </p>
          </div>
        </div>

        <!-- Agency Information Form -->
        <div class="card">
          <form id="company-form">
            <h3 style="font-size:15px; font-weight:700; margin-bottom:14px; border-bottom:1px solid var(--border); padding-bottom:6px;">Agency Identification</h3>
            <div class="form-grid" style="margin-bottom:20px;">
              <div class="form-group">
                <label class="form-label">Company / Trade Name *</label>
                <input type="text" id="cmp-name" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label">Agency Title *</label>
                <input type="text" id="cmp-agency" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label">HPCL Distributor Code *</label>
                <input type="text" id="cmp-dist-code" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label">E-Cust / SAP Code</label>
                <input type="text" id="cmp-ecust" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">GSTIN</label>
                <input type="text" id="cmp-gstin" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">PAN Number</label>
                <input type="text" id="cmp-pan" class="form-control">
              </div>
            </div>

            <h3 style="font-size:15px; font-weight:700; margin-bottom:14px; border-bottom:1px solid var(--border); padding-bottom:6px;">Contact & Location</h3>
            <div class="form-grid" style="margin-bottom:20px;">
              <div class="form-group" style="grid-column: span 2;">
                <label class="form-label">Address Line 1</label>
                <input type="text" id="cmp-addr1" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Village / Town</label>
                <input type="text" id="cmp-village" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">District</label>
                <input type="text" id="cmp-district" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">State</label>
                <input type="text" id="cmp-state" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">PIN Code</label>
                <input type="text" id="cmp-pin" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Primary Phone</label>
                <input type="text" id="cmp-phone" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Official Email</label>
                <input type="email" id="cmp-email" class="form-control">
              </div>
            </div>

            <h3 style="font-size:15px; font-weight:700; margin-bottom:14px; border-bottom:1px solid var(--border); padding-bottom:6px;">Bank & Digital Settlement</h3>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Bank Name</label>
                <input type="text" id="cmp-bank-name" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Bank Account Number</label>
                <input type="text" id="cmp-bank-acc" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">IFSC Code</label>
                <input type="text" id="cmp-ifsc" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Agency UPI ID / QR VPA</label>
                <input type="text" id="cmp-upi" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Proprietor / Owner Name</label>
                <input type="text" id="cmp-owner" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Agency Manager</label>
                <input type="text" id="cmp-manager" class="form-control">
              </div>
            </div>
          </form>
        </div>
      </div>
    `;

    // Bind Handlers
    document.getElementById('company-save-btn').addEventListener('click', () => this.saveCompany());
    document.getElementById('company-logo-upload-btn').addEventListener('click', () => {
      document.getElementById('company-logo-file-input').click();
    });
    document.getElementById('company-logo-file-input').addEventListener('change', (e) => this.handleLogoUpload(e));
    document.getElementById('company-logo-remove-btn').addEventListener('click', () => this.handleLogoRemove());
  },

  async loadCompany() {
    const res = await api('getCompany', {}, { loader: false });
    if (!res.ok || !res.data) return;

    currentCompany = res.data;
    printEngine.setCompany(currentCompany);

    // Populate Fields
    document.getElementById('cmp-name').value = currentCompany.CompanyName || '';
    document.getElementById('cmp-agency').value = currentCompany.AgencyName || '';
    document.getElementById('cmp-dist-code').value = currentCompany.DistributorCode || '';
    document.getElementById('cmp-ecust').value = currentCompany.ECustCode || '';
    document.getElementById('cmp-gstin').value = currentCompany.GSTIN || '';
    document.getElementById('cmp-pan').value = currentCompany.PAN || '';
    document.getElementById('cmp-addr1').value = currentCompany.AddressLine1 || '';
    document.getElementById('cmp-village').value = currentCompany.Village || '';
    document.getElementById('cmp-district').value = currentCompany.District || '';
    document.getElementById('cmp-state').value = currentCompany.State || '';
    document.getElementById('cmp-pin').value = currentCompany.PIN || '';
    document.getElementById('cmp-phone').value = currentCompany.Phone || '';
    document.getElementById('cmp-email').value = currentCompany.Email || '';
    document.getElementById('cmp-bank-name').value = currentCompany.BankName || '';
    document.getElementById('cmp-bank-acc').value = currentCompany.BankAccount || '';
    document.getElementById('cmp-ifsc').value = currentCompany.IFSC || '';
    document.getElementById('cmp-upi').value = currentCompany.UPI || '';
    document.getElementById('cmp-owner').value = currentCompany.OwnerName || '';
    document.getElementById('cmp-manager').value = currentCompany.ManagerName || '';

    // Render Logo in Preview Box & Topbar/Sidebar
    const box = document.getElementById('company-logo-preview-box');
    utils.renderCompanyLogo(box, currentCompany);
    this.updateGlobalBranding(currentCompany);
  },

  async saveCompany() {
    const payload = {
      CompanyID: currentCompany ? currentCompany.CompanyID : 1,
      CompanyName: document.getElementById('cmp-name').value,
      AgencyName: document.getElementById('cmp-agency').value,
      DistributorCode: document.getElementById('cmp-dist-code').value,
      ECustCode: document.getElementById('cmp-ecust').value,
      GSTIN: document.getElementById('cmp-gstin').value,
      PAN: document.getElementById('cmp-pan').value,
      AddressLine1: document.getElementById('cmp-addr1').value,
      Village: document.getElementById('cmp-village').value,
      District: document.getElementById('cmp-district').value,
      State: document.getElementById('cmp-state').value,
      PIN: document.getElementById('cmp-pin').value,
      Phone: document.getElementById('cmp-phone').value,
      Email: document.getElementById('cmp-email').value,
      BankName: document.getElementById('cmp-bank-name').value,
      BankAccount: document.getElementById('cmp-bank-acc').value,
      IFSC: document.getElementById('cmp-ifsc').value,
      UPI: document.getElementById('cmp-upi').value,
      OwnerName: document.getElementById('cmp-owner').value,
      ManagerName: document.getElementById('cmp-manager').value
    };

    const res = await api('saveCompany', payload, { loaderMessage: 'Saving company profile...' });
    if (res.ok && res.data) {
      currentCompany = res.data;
      printEngine.setCompany(currentCompany);
      this.updateGlobalBranding(currentCompany);
      ui.success('Company profile updated successfully.');
    }
  },

  async handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const { base64, mimeType } = await utils.logoToBase64(file);
      const res = await api('uploadCompanyLogo', {
        CompanyID: currentCompany ? currentCompany.CompanyID : 1,
        logoBase64: base64,
        mimeType
      }, { loaderMessage: 'Uploading logo...' });

      if (res.ok) {
        currentCompany.LogoBase64 = base64;
        currentCompany.LogoMimeType = mimeType;
        printEngine.setCompany(currentCompany);

        const box = document.getElementById('company-logo-preview-box');
        utils.renderCompanyLogo(box, currentCompany);
        this.updateGlobalBranding(currentCompany);
        ui.success('Logo uploaded and applied across all documents.');
      }
    } catch (err) {
      ui.error(err.message, 'Logo Upload Failed');
    }
  },

  async handleLogoRemove() {
    const confirmed = await ui.confirm('Are you sure you want to remove the company logo? A standard fallback initials avatar will be used instead.', 'Remove Logo');
    if (!confirmed) return;

    const res = await api('removeCompanyLogo', { CompanyID: currentCompany ? currentCompany.CompanyID : 1 }, { loaderMessage: 'Removing logo...' });
    if (res.ok) {
      currentCompany.LogoBase64 = null;
      currentCompany.LogoMimeType = null;
      printEngine.setCompany(currentCompany);

      const box = document.getElementById('company-logo-preview-box');
      utils.renderCompanyLogo(box, currentCompany);
      this.updateGlobalBranding(currentCompany);
      ui.success('Logo removed successfully.');
    }
  },

  updateGlobalBranding(company) {
    // Update Sidebar Logo & Name
    const sideLogo = document.getElementById('sidebar-logo-container');
    if (sideLogo) utils.renderCompanyLogo(sideLogo, company);

    const sideName = document.getElementById('sidebar-company-name');
    if (sideName && company.CompanyName) sideName.textContent = company.CompanyName;

    const sideSub = document.getElementById('sidebar-agency-sub');
    if (sideSub && company.DistributorCode) sideSub.textContent = `Code: ${company.DistributorCode}`;
  }
};
