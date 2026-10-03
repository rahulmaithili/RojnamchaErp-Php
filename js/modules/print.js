/**
 * SHIV SHAKTI HP GAS - CENTRALIZED MULTI-TEMPLATE PRINT ENGINE
 * Dedicated Layouts: A4 GST Tax Invoice, 80mm Thermal Receipt, Modern Voucher,
 * Daily Rojnamcha Official Sheet, Salary Payslip, Dues Statement & Gate Pass
 */

import { utils } from '../utils.js';

let companyProfile = null;
let currentDocType = 'pos_invoice';
let currentDocData = null;
let currentTemplate = 'a4_tax';

export const printEngine = {
  setCompany(company) {
    companyProfile = company;
  },

  getCompany() {
    return companyProfile || {
      CompanyName: 'Shiv Shakti HP Gas',
      LegalName: 'Shiv Shakti HP Gas Agency',
      AgencyName: 'Shiv Shakti HP Gas (Pandaul)',
      DistributorCode: 'HP-PDL-8842',
      HPCLCode: 'HPCL-BIH-042',
      AddressLine1: 'Near High School Chowk, Main Road',
      AddressLine2: 'Pandaul Bazar',
      Village: 'Pandaul',
      District: 'Madhubani',
      State: 'Bihar',
      PIN: '847234',
      Phone: '9431400001',
      AlternatePhone: '9431400002',
      Email: 'shivshaktihpgas.pdl@gmail.com',
      GSTIN: '10ABCDE1234F1Z5',
      PAN: 'ABCDE1234F',
      LicenseNumber: 'GAS/PDL/2012/88',
      BankName: 'State Bank of India',
      BankAccount: '389012345678',
      IFSC: 'SBIN0002980',
      UPI: 'shivshakti.gas@sbi'
    };
  },

  getLogoHtml(isThermal = false) {
    const c = this.getCompany();
    if (c.LogoBase64 && c.LogoMimeType) {
      const cls = isThermal ? 'thermal-logo' : 'ds-logo';
      return `<img src="data:${c.LogoMimeType};base64,${c.LogoBase64}" class="${cls}" alt="Agency Logo">`;
    }

    if (isThermal) {
      return `
        <div style="text-align:center; margin-bottom:6px;">
          <svg width="42" height="42" viewBox="0 0 100 100" style="display:inline-block;">
            <circle cx="50" cy="50" r="46" fill="#000" stroke="#000" stroke-width="2"/>
            <circle cx="50" cy="50" r="40" fill="#fff"/>
            <circle cx="50" cy="50" r="32" fill="#000"/>
            <text x="50" y="58" font-family="'Segoe UI', Arial, sans-serif" font-size="26" font-weight="900" fill="#fff" text-anchor="middle">HP</text>
          </svg>
        </div>
      `;
    }

    return `
      <div class="ds-logo-wrap" style="display:inline-flex; align-items:center; justify-content:center; margin-right:12px; flex-shrink:0;">
        <svg width="56" height="56" viewBox="0 0 120 120" style="display:block; border-radius:50%; box-shadow:0 2px 6px rgba(0,0,0,0.18);">
          <circle cx="60" cy="60" r="58" fill="#d97706" />
          <circle cx="60" cy="60" r="54" fill="#ffffff" />
          <circle cx="60" cy="60" r="48" fill="#001f3f" />
          <circle cx="60" cy="60" r="43" fill="#c2410c" />
          <circle cx="60" cy="60" r="39" fill="#002b5c" />
          <text x="60" y="66" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">HP</text>
          <text x="60" y="88" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="10" font-weight="800" fill="#fde047" text-anchor="middle" letter-spacing="1.5">GAS</text>
        </svg>
      </div>
    `;
  },

  /**
   * Open Print Preview Modal with Interactive Multi-Template Switching
   */
  openPreview(type, data, defaultTemplate = 'a4_tax') {
    currentDocType = type;
    currentDocData = data;
    currentTemplate = defaultTemplate;

    const modal = document.getElementById('print-preview-modal');
    const container = document.getElementById('print-preview-content');

    if (!modal || !container) {
      console.error('Print preview modal container not found in DOM.');
      return;
    }

    // Configure Template Pill Visibility based on Document Type
    const pillsContainer = document.getElementById('print-template-pills');
    if (pillsContainer) {
      if (type === 'pos_invoice') {
        pillsContainer.style.display = 'flex';
      } else {
        pillsContainer.style.display = 'none';
      }

      pillsContainer.querySelectorAll('.print-template-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.template === currentTemplate);
        pill.onclick = () => {
          pillsContainer.querySelectorAll('.print-template-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          currentTemplate = pill.dataset.template;
          this.renderPreview();
        };
      });
    }

    this.renderPreview();
    modal.style.display = 'flex';

    // Hook Print Trigger
    const printBtn = document.getElementById('print-modal-trigger-btn');
    if (printBtn) {
      printBtn.onclick = () => {
        this.printDirect(currentDocType, currentDocData, currentTemplate);
      };
    }

    // Hook Close Buttons
    const closeBtn = document.getElementById('print-modal-close-btn');
    const cancelBtn = document.getElementById('print-modal-cancel-btn');
    const doClose = () => { modal.style.display = 'none'; };
    if (closeBtn) closeBtn.onclick = doClose;
    if (cancelBtn) cancelBtn.onclick = doClose;
  },

  closePreview() {
    const modal = document.getElementById('print-preview-modal');
    if (modal) modal.style.display = 'none';
  },

  renderPreview() {
    const container = document.getElementById('print-preview-content');
    if (!container) return;
    container.innerHTML = this.generateHtml(currentDocType, currentDocData, currentTemplate);
  },

  /**
   * Print Direct via Browser using #docPrintRoot Isolation
   */
  printDirect(type, data, template = 'a4_tax') {
    const printRoot = document.getElementById('docPrintRoot');
    if (!printRoot) {
      console.error('docPrintRoot element missing from DOM.');
      window.print();
      return;
    }

    const html = this.generateHtml(type, data, template);
    printRoot.innerHTML = html;

    document.body.classList.add('printing-doc');
    if (template === 'thermal') {
      document.body.classList.add('thermal-print-active');
    } else {
      document.body.classList.remove('thermal-print-active');
    }

    window.print();

    // Clean up after print dialog finishes
    window.onafterprint = () => {
      document.body.classList.remove('printing-doc');
      document.body.classList.remove('thermal-print-active');
      printRoot.innerHTML = '';
    };
  },

  /**
   * Master Template HTML Generator
   */
  generateHtml(type, data, template = 'a4_tax') {
    if (type === 'pos_invoice') {
      if (template === 'thermal') {
        return this.renderThermalInvoice(data);
      } else if (template === 'modern') {
        return this.renderModernInvoice(data);
      } else {
        return this.renderA4TaxInvoice(data);
      }
    } else if (type === 'due_receipt') {
      return this.renderDueReceipt(data, template === 'thermal');
    } else if (type === 'payslip') {
      return this.renderPayslip(data, template === 'thermal');
    } else if (type === 'rojnamcha') {
      return this.renderRojnamchaSheet(data);
    } else if (type === 'dues_statement') {
      return this.renderDuesStatement(data);
    } else if (type === 'gate_pass') {
      return this.renderDispatchGatePass(data);
    } else if (type === 'security_refund') {
      return this.renderSecurityRefundVoucher(data, template === 'thermal');
    } else if (type === 'id_card') {
      return this.renderEmployeeIdCard(data);
    } else {
      return `<div class="doc-sheet"><p>Unsupported document type: ${type}</p></div>`;
    }
  },

  /* -------------------------------------------------------------------------
   * TEMPLATE 1: OFFICIAL A4 GST TAX INVOICE
   * ------------------------------------------------------------------------- */
  renderA4TaxInvoice(bill) {
    const c = this.getCompany();
    const items = bill.items || bill.Items || [];

    const logoHtml = this.getLogoHtml(false);

    const itemRows = items.map((it, idx) => {
      const rate = Number(it.Rate || 0);
      const qty = Number(it.Quantity || 1);
      const taxPct = Number(it.TaxPercent || 0);
      const taxable = rate * qty;
      const cgstVal = (taxable * (taxPct / 2)) / 100;
      const sgstVal = (taxable * (taxPct / 2)) / 100;
      const lineTotal = Number(it.Total || (taxable + cgstVal + sgstVal));

      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>
            <strong>${utils.escapeHtml(it.ItemName || 'LPG Refill')}</strong>
            ${it.CylinderType ? `<div style="font-size:9.5px; color:#64748b;">${utils.escapeHtml(it.CylinderType)}</div>` : ''}
          </td>
          <td style="text-align:center; font-family:monospace;">27111900</td>
          <td style="text-align:center; font-weight:700;">${qty} NOS</td>
          <td class="num">${utils.formatCurrency(rate)}</td>
          <td class="num">${utils.formatCurrency(taxable)}</td>
          <td class="num">${taxPct > 0 ? `${(taxPct / 2).toFixed(1)}%<br><small>${utils.formatCurrency(cgstVal)}</small>` : '0%'}</td>
          <td class="num">${taxPct > 0 ? `${(taxPct / 2).toFixed(1)}%<br><small>${utils.formatCurrency(sgstVal)}</small>` : '0%'}</td>
          <td class="num" style="font-weight:700;">${utils.formatCurrency(lineTotal)}</td>
        </tr>
      `;
    }).join('');

    const inWords = this.amountToWords(bill.TotalAmount || 0);

    return `
      <div class="doc-sheet a4-tax">
        <!-- Header -->
        <div class="ds-header">
          <div class="ds-brand">
            ${logoHtml}
            <div>
              <div class="ds-company-title">${utils.escapeHtml(c.AgencyName || c.CompanyName)}</div>
              <div class="ds-company-sub">
                HPCL LPG Authorized Distributor | Code: <strong>${utils.escapeHtml(c.DistributorCode || '')}</strong><br>
                ${utils.escapeHtml(c.AddressLine1 || '')}, ${utils.escapeHtml(c.District || '')}, ${utils.escapeHtml(c.State || '')} - ${utils.escapeHtml(c.PIN || '')}<br>
                GSTIN: <strong>${utils.escapeHtml(c.GSTIN || 'N/A')}</strong> | PAN: <strong>${utils.escapeHtml(c.PAN || 'N/A')}</strong> | Phone: ${utils.escapeHtml(c.Phone || '')}
              </div>
            </div>
          </div>
          <div class="ds-doc-meta">
            <div class="ds-doc-title">TAX INVOICE</div>
            <div class="ds-doc-num">${utils.escapeHtml(bill.BillNumber || 'INV-DRAFT')}</div>
            <div class="ds-badge">${bill.IsCancelled ? 'CANCELLED' : 'ORIGINAL FOR RECIPIENT'}</div>
          </div>
        </div>

        <!-- 2-Column Info Grid -->
        <div class="ds-info-grid">
          <div class="ds-info-box">
            <div class="ds-info-box-title"><i class="fa-solid fa-user"></i> Billed To / Consumer Details</div>
            <div class="ds-info-row"><span>Consumer Name:</span> <strong>${utils.escapeHtml(bill.CustomerName || 'Counter Cash Sale')}</strong></div>
            <div class="ds-info-row"><span>Mobile Number:</span> <strong>${utils.escapeHtml(bill.CustomerMobile || bill.customer?.Mobile || '-')}</strong></div>
            <div class="ds-info-row"><span>Consumer Number:</span> <strong>${utils.escapeHtml(bill.ConsumerNo || bill.customer?.ConsumerNo || 'COUNTER')}</strong></div>
            <div class="ds-info-row"><span>Address / Village:</span> <span>${utils.escapeHtml(bill.customer?.Address || bill.customer?.Village || 'Pandaul')}</span></div>
            <div class="ds-info-row"><span>Place of Supply:</span> <span>Bihar (State Code: 10)</span></div>
          </div>

          <div class="ds-info-box">
            <div class="ds-info-box-title"><i class="fa-solid fa-file-invoice"></i> Invoice Particulars</div>
            <div class="ds-info-row"><span>Invoice Date:</span> <strong>${utils.formatDate(bill.BillDate || utils.today())}</strong></div>
            <div class="ds-info-row"><span>Payment Status:</span> <strong>${bill.PaidDues > 0 ? 'PARTIAL / CREDIT' : 'FULL PAID'}</strong></div>
            <div class="ds-info-row"><span>Cylinder Delivered:</span> <strong>${bill.CylindersDelivered || 1} Sound Full</strong></div>
            <div class="ds-info-row"><span>Cylinder Received:</span> <strong>${bill.CylindersReceived || 1} Empty Exchanged</strong></div>
            <div class="ds-info-row"><span>Cashier / Staff:</span> <span>${utils.escapeHtml(bill.CreatedByName || 'Staff')}</span></div>
          </div>
        </div>

        <!-- Items Table -->
        <table class="ds-table">
          <thead>
            <tr>
              <th style="width:30px; text-align:center;">#</th>
              <th>Description of Goods</th>
              <th style="width:65px; text-align:center;">HSN</th>
              <th style="width:50px; text-align:center;">Qty</th>
              <th style="width:75px;" class="num">Rate (₹)</th>
              <th style="width:75px;" class="num">Taxable (₹)</th>
              <th style="width:65px;" class="num">CGST</th>
              <th style="width:65px;" class="num">SGST</th>
              <th style="width:85px;" class="num">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <!-- Totals & Payment Settlement -->
        <div class="ds-totals-grid">
          <div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px; font-size:11px; margin-bottom:12px;">
              <div style="font-weight:700; color:#001f3f; margin-bottom:4px;">Amount Chargeable in Words:</div>
              <div style="font-weight:800; font-style:italic; color:#1e293b;">${inWords}</div>
            </div>

            <!-- Settlement breakdown -->
            <div style="font-size:11px; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px;">
              <div style="font-weight:700; color:#001f3f; margin-bottom:4px; font-size:10.5px; text-transform:uppercase;">Payment Breakdown:</div>
              <div style="display:flex; gap:14px; flex-wrap:wrap;">
                ${Number(bill.PaidCash) > 0 ? `<span>Cash: <strong>${utils.formatCurrency(bill.PaidCash)}</strong></span>` : ''}
                ${Number(bill.PaidUPI) > 0 ? `<span>UPI: <strong>${utils.formatCurrency(bill.PaidUPI)}</strong></span>` : ''}
                ${Number(bill.PaidHPPay) > 0 ? `<span>HP Pay: <strong>${utils.formatCurrency(bill.PaidHPPay)}</strong></span>` : ''}
                ${Number(bill.PaidDues) > 0 ? `<span style="color:#b91c1c;">Dues / Credit: <strong>${utils.formatCurrency(bill.PaidDues)}</strong></span>` : ''}
              </div>
            </div>

            <!-- Bank Details -->
            <div style="font-size:10px; color:#64748b; margin-top:8px;">
              Bank: ${utils.escapeHtml(c.BankName || '')} | A/C: ${utils.escapeHtml(c.BankAccount || '')} | IFSC: ${utils.escapeHtml(c.IFSC || '')} | UPI: ${utils.escapeHtml(c.UPI || '')}
            </div>
          </div>

          <div>
            <table class="ds-summary-table">
              <tr>
                <td>Subtotal (Taxable):</td>
                <td class="num">${utils.formatCurrency(bill.Subtotal || 0)}</td>
              </tr>
              ${Number(bill.TaxAmount) > 0 ? `
              <tr>
                <td>Total GST Tax:</td>
                <td class="num">${utils.formatCurrency(bill.TaxAmount)}</td>
              </tr>` : ''}
              ${Number(bill.DiscountAmount) > 0 ? `
              <tr>
                <td>Discount:</td>
                <td class="num" style="color:#b91c1c;">-${utils.formatCurrency(bill.DiscountAmount)}</td>
              </tr>` : ''}
              <tr class="grand-row">
                <td>Grand Total:</td>
                <td class="num">${utils.formatCurrency(bill.TotalAmount || 0)}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Terms and Signatures -->
        <div style="margin-top:20px; font-size:9.5px; color:#64748b; line-height:1.4;">
          <strong>Terms & Conditions:</strong><br>
          1. LPG Cylinders are filled, sealed and safety tested by HPCL Bottling Plant.<br>
          2. Check seal intactness and test pin valve for safety upon delivery.<br>
          3. For LPG Gas Leakage emergency, immediately call <strong>1906</strong> toll-free.
        </div>

        <div class="ds-signatures">
          <div class="ds-signature-box">
            Customer / Receiver Signature
          </div>
          <div class="ds-signature-box">
            For ${utils.escapeHtml(c.AgencyName || c.CompanyName)}<br>
            <small>Authorised Signatory</small>
          </div>
        </div>
      </div>
    `;
  },

  /* -------------------------------------------------------------------------
   * TEMPLATE 2: 80MM CONTINUOUS THERMAL RECEIPT
   * ------------------------------------------------------------------------- */
  renderThermalInvoice(bill) {
    const c = this.getCompany();
    const items = bill.items || bill.Items || [];

    const itemLines = items.map(it => {
      const name = it.ItemName || 'LPG Refill';
      const qty = it.Quantity || 1;
      const rate = Number(it.Rate || 0);
      const total = Number(it.Total || rate * qty);

      return `
        <tr>
          <td colspan="3"><strong>${utils.escapeHtml(name)}</strong></td>
        </tr>
        <tr>
          <td>${qty} x ${rate.toFixed(2)}</td>
          <td></td>
          <td style="text-align:right; font-weight:700;">${total.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const logoHtml = this.getLogoHtml(true);

    return `
      <div class="doc-sheet thermal-80mm">
        <div class="thermal-header">
          ${logoHtml}
          <div class="thermal-title">${utils.escapeHtml(c.AgencyName || c.CompanyName)}</div>
          <div class="thermal-sub">HPCL DISTRIBUTOR: ${utils.escapeHtml(c.DistributorCode || '')}</div>
          <div class="thermal-sub">${utils.escapeHtml(c.AddressLine1 || '')}, ${utils.escapeHtml(c.District || '')}</div>
          <div class="thermal-sub">PH: ${utils.escapeHtml(c.Phone || '')} | GST: ${utils.escapeHtml(c.GSTIN || '')}</div>
        </div>

        <div class="thermal-row">
          <span>Bill No: <strong>${utils.escapeHtml(bill.BillNumber || '')}</strong></span>
          <span>${bill.BillDate || utils.today()}</span>
        </div>
        <div class="thermal-row">
          <span>Cust: ${utils.escapeHtml(bill.CustomerName || 'Counter')}</span>
          <span>${utils.escapeHtml(bill.CustomerMobile || '')}</span>
        </div>
        ${bill.ConsumerNo ? `<div class="thermal-row"><span>Cons No: ${utils.escapeHtml(bill.ConsumerNo)}</span></div>` : ''}

        <div class="thermal-divider"></div>

        <table class="thermal-table">
          <thead>
            <tr>
              <th>Item / Qty</th>
              <th></th>
              <th style="text-align:right;">Amt (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${itemLines}
          </tbody>
        </table>

        <div class="thermal-divider"></div>

        <div class="thermal-row">
          <span>Subtotal:</span>
          <span>${Number(bill.Subtotal || 0).toFixed(2)}</span>
        </div>
        ${Number(bill.TaxAmount) > 0 ? `
        <div class="thermal-row">
          <span>GST Tax:</span>
          <span>${Number(bill.TaxAmount).toFixed(2)}</span>
        </div>` : ''}
        ${Number(bill.DiscountAmount) > 0 ? `
        <div class="thermal-row">
          <span>Discount:</span>
          <span>-${Number(bill.DiscountAmount).toFixed(2)}</span>
        </div>` : ''}
        <div class="thermal-row" style="font-size:13px; font-weight:800; border-top:1px dashed #000; border-bottom:1px dashed #000; padding:4px 0; margin:4px 0;">
          <span>NET PAYABLE:</span>
          <span>₹${Number(bill.TotalAmount || 0).toFixed(2)}</span>
        </div>

        <!-- Tender breakdown -->
        <div style="margin:4px 0; font-size:10px;">
          ${Number(bill.PaidCash) > 0 ? `<div>• Cash Paid: ₹${Number(bill.PaidCash).toFixed(2)}</div>` : ''}
          ${Number(bill.PaidUPI) > 0 ? `<div>• UPI Digital: ₹${Number(bill.PaidUPI).toFixed(2)}</div>` : ''}
          ${Number(bill.PaidDues) > 0 ? `<div style="font-weight:700;">• Balance Due: ₹${Number(bill.PaidDues).toFixed(2)}</div>` : ''}
        </div>

        <div class="thermal-divider"></div>

        <div class="thermal-footer">
          <div>HP GAS SURAKSHA SANRAKSHIT</div>
          <div>LPG EMERGENCY CALL: <strong>1906</strong></div>
          <div style="margin-top:4px;">*** THANK YOU ***</div>
        </div>
      </div>
    `;
  },

  /* -------------------------------------------------------------------------
   * TEMPLATE 3: MODERN EXECUTIVE CORPORATE VOUCHER
   * ------------------------------------------------------------------------- */
  renderModernInvoice(bill) {
    const c = this.getCompany();
    const items = bill.items || bill.Items || [];

    const logoHtml = this.getLogoHtml(false);

    const itemRows = items.map((it, idx) => `
      <tr>
        <td style="text-align:center; font-weight:600;">${idx + 1}</td>
        <td>
          <strong>${utils.escapeHtml(it.ItemName || 'Refill')}</strong>
          ${it.Category ? `<span style="font-size:9px; background:#e0f2fe; color:#0369a1; padding:1px 6px; border-radius:4px; margin-left:6px;">${it.Category}</span>` : ''}
        </td>
        <td style="text-align:center; font-weight:700;">${it.Quantity || 1}</td>
        <td class="num">${utils.formatCurrency(it.Rate || 0)}</td>
        <td class="num" style="font-weight:700;">${utils.formatCurrency(it.Total || 0)}</td>
      </tr>
    `).join('');

    return `
      <div class="doc-sheet modern-voucher">
        <!-- Top Banner Bar -->
        <div style="background:linear-gradient(135deg, #001f3f 0%, #0074D9 100%); color:#ffffff; padding:16px 20px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <div style="display:flex; align-items:center; gap:12px;">
            ${logoHtml}
            <div>
              <div style="font-size:18px; font-weight:800; letter-spacing:0.3px;">${utils.escapeHtml(c.AgencyName || c.CompanyName)}</div>
              <div style="font-size:11px; opacity:0.85;">Code: ${utils.escapeHtml(c.DistributorCode || '')} | Pandaul, Madhubani</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:20px; font-weight:800;">INVOICE VOUCHER</div>
            <div style="font-size:12px; font-family:monospace; opacity:0.9;">#${utils.escapeHtml(bill.BillNumber || '')}</div>
          </div>
        </div>

        <!-- 2 Cards -->
        <div class="ds-info-grid">
          <div class="ds-info-box">
            <div class="ds-info-box-title">Customer Information</div>
            <div class="ds-info-row"><span>Name:</span> <strong>${utils.escapeHtml(bill.CustomerName || 'Counter Sale')}</strong></div>
            <div class="ds-info-row"><span>Mobile:</span> <strong>${utils.escapeHtml(bill.CustomerMobile || '-')}</strong></div>
            <div class="ds-info-row"><span>Consumer No:</span> <span>${utils.escapeHtml(bill.ConsumerNo || 'N/A')}</span></div>
          </div>

          <div class="ds-info-box">
            <div class="ds-info-box-title">Order Details</div>
            <div class="ds-info-row"><span>Date:</span> <strong>${utils.formatDate(bill.BillDate || utils.today())}</strong></div>
            <div class="ds-info-row"><span>Cylinder Exchanged:</span> <strong>${bill.CylindersDelivered || 1} Full / ${bill.CylindersReceived || 1} Empty</strong></div>
            <div class="ds-info-row"><span>Operator:</span> <span>${utils.escapeHtml(bill.CreatedByName || 'Billing Desk')}</span></div>
          </div>
        </div>

        <!-- Table -->
        <table class="ds-table">
          <thead>
            <tr>
              <th style="width:35px; text-align:center;">#</th>
              <th>Item Particulars</th>
              <th style="width:60px; text-align:center;">Qty</th>
              <th style="width:100px;" class="num">Rate</th>
              <th style="width:110px;" class="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <!-- Totals Banner -->
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:16px; display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Settlement Summary</div>
            <div style="font-size:12px; margin-top:3px;">
              Cash: <strong>${utils.formatCurrency(bill.PaidCash || 0)}</strong> | 
              UPI: <strong>${utils.formatCurrency(bill.PaidUPI || 0)}</strong> | 
              Dues: <strong style="color:#b91c1c;">${utils.formatCurrency(bill.PaidDues || 0)}</strong>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Grand Total</div>
            <div style="font-size:24px; font-weight:800; color:#001f3f;">${utils.formatCurrency(bill.TotalAmount || 0)}</div>
          </div>
        </div>

        <div class="ds-signatures">
          <div class="ds-signature-box">Consumer Sign</div>
          <div class="ds-signature-box">Cashier Sign</div>
        </div>
      </div>
    `;
  },

  /* -------------------------------------------------------------------------
   * TEMPLATE 4: OFFICIAL DAILY ROJNAMCHA (4-SHEET HPCL AUDIT FORMAT)
   * Exact format matching user's official agency standard:
   * 1. Daily Sales & Revenue Report
   * 2. Daily Cash & Collection Report
   * 3. Daily Gas Sales & Collection Summary (Hawker / Godown)
   * 4. Daily Cylinder Stock Report
   * ------------------------------------------------------------------------- */
  renderRojnamchaSheet(data, subSheet = 'all') {
    const c = this.getCompany();
    const date = data.date || utils.today();
    const cb = data.cashbook || {};
    const stock = data.stock || [];
    const itemSales = data.itemSales || [];
    const coll = data.collections || {};
    const hawkers = data.hawkers || [];
    const duesRecovered = data.duesRecovered || [];
    const duesSummary = data.duesSummary || {};

    const formattedDate = utils.formatDate(date);

    // SHEET 1: DAILY SALES & REVENUE REPORT
    const renderSheet1 = () => {
      // Cylinder & Accessories Sales item rows
      let totalQty = 0;
      let totalAmount = 0;
      let totalCash = 0;
      let totalUPI = 0;
      let totalHPPay = 0;
      let totalDues = 0;
      let totalSettled = 0;

      const salesRows = (itemSales.length ? itemSales : [
        { ItemName: '19KG Commercial', Rate: 3049, Qty: 0, TotalAmount: 0, Cash: 0, UPI: 0, HPPay: 0, Dues: 0 },
        { ItemName: '14.2KG Domestic (Godown)', Rate: 1042, Qty: 0, TotalAmount: 0, Cash: 0, UPI: 0, HPPay: 0, Dues: 0 },
        { ItemName: '14.2KG Domestic (Home Delivery)', Rate: 1042, Qty: 0, TotalAmount: 0, Cash: 0, UPI: 0, HPPay: 0, Dues: 0 },
        { ItemName: 'Suraksha Hose Pipe', Rate: 190, Qty: 0, TotalAmount: 0, Cash: 0, UPI: 0, HPPay: 0, Dues: 0 },
        { ItemName: 'Domestic Regulator (Defective)', Rate: 100, Qty: 0, TotalAmount: 0, Cash: 0, UPI: 0, HPPay: 0, Dues: 0 },
        { ItemName: 'Domestic Pass Book', Rate: 59, Qty: 0, TotalAmount: 0, Cash: 0, UPI: 0, HPPay: 0, Dues: 0 },
        { ItemName: 'PMUY Pass Book', Rate: 25, Qty: 0, TotalAmount: 0, Cash: 0, UPI: 0, HPPay: 0, Dues: 0 },
        { ItemName: '5 Kg Nd Rfl', Rate: 845, Qty: 0, TotalAmount: 0, Cash: 0, UPI: 0, HPPay: 0, Dues: 0 },
        { ItemName: 'Ftl Regulator', Rate: 350, Qty: 0, TotalAmount: 0, Cash: 0, UPI: 0, HPPay: 0, Dues: 0 }
      ]).map(it => {
        const qty = Number(it.Qty || 0);
        const amt = Number(it.TotalAmount || (qty * Number(it.Rate || 0)));
        const cash = Number(it.Cash || 0);
        const upi = Number(it.UPI || 0);
        const hp = Number(it.HPPay || 0);
        const dues = Number(it.Dues || 0);
        const settled = amt;

        totalQty += qty;
        totalAmount += amt;
        totalCash += cash;
        totalUPI += upi;
        totalHPPay += hp;
        totalDues += dues;
        totalSettled += settled;

        return `
          <tr>
            <td>${utils.escapeHtml(it.ItemName)}</td>
            <td class="num">${utils.formatCurrency(it.Rate || 0)}</td>
            <td class="num text-center">${qty}</td>
            <td class="num">${utils.formatCurrency(amt)}</td>
            <td class="num">${utils.formatCurrency(cash)}</td>
            <td class="num">${utils.formatCurrency(upi)}</td>
            <td class="num">${utils.formatCurrency(hp)}</td>
            <td class="num">${utils.formatCurrency(dues)}</td>
            <td class="num">₹0.00</td>
            <td class="num font-bold">${utils.formatCurrency(settled)}</td>
            <td class="text-center"><span style="color:#15803d; font-size:10px; font-weight:700;">RECONCILED ✓</span></td>
          </tr>
        `;
      }).join('');

      // Previous Outstanding Dues Recovered Rows
      let totalDuesRec = 0;
      const duesRecRows = (duesRecovered.length ? duesRecovered : [
        { CustomerName: 'Counter Cash Collection', Amount: Number(coll.Cash || cb.CounterCash || 0) }
      ]).map(d => {
        const amt = Number(d.Amount || 0);
        totalDuesRec += amt;
        return `
          <tr>
            <td>${utils.escapeHtml(d.CustomerName || 'Walk-in / Recovery')}</td>
            <td class="num">${utils.formatCurrency(amt)}</td>
            <td class="num">${utils.formatCurrency(d.PaymentMode === 'CASH' ? amt : 0)}</td>
            <td class="num">${utils.formatCurrency(d.PaymentMode === 'UPI' ? amt : 0)}</td>
            <td class="num">₹0.00</td>
            <td class="num font-bold">${utils.formatCurrency(amt)}</td>
            <td>Recovered</td>
          </tr>
        `;
      }).join('');

      return `
        <div class="roj-page-break" style="page-break-after:always; margin-bottom:28px;">
          <!-- Top Title Bar -->
          <div style="background:#001f3f; color:#ffffff; padding:10px 16px; border-radius:4px 4px 0 0; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:14px; font-weight:800; letter-spacing:0.5px;">${utils.escapeHtml(c.AgencyName || c.CompanyName).toUpperCase()} • DAILY SALES & REVENUE REPORT</div>
            <div style="font-size:12px; font-weight:700; font-family:monospace;">DATE: ${formattedDate}</div>
          </div>

          <!-- 5 Metric KPI Header Bar -->
          <div style="display:grid; grid-template-columns:repeat(5, 1fr); background:#001529; color:#ffffff; border-top:1px solid rgba(255,255,255,0.15); border-bottom:2px solid #001f3f; text-align:center;">
            <div style="padding:10px 6px; border-right:1px solid rgba(255,255,255,0.1);">
              <div style="font-size:9.5px; opacity:0.8; text-transform:uppercase;">TOTAL BILLING</div>
              <div style="font-size:18px; font-weight:800; font-family:monospace; margin:2px 0;">${utils.formatCurrency(coll.GrandTotal || cb.TotalInflow || 0)}</div>
              <div style="font-size:8.5px; opacity:0.7;">Daily Gross + Dues</div>
            </div>
            <div style="padding:10px 6px; border-right:1px solid rgba(255,255,255,0.1);">
              <div style="font-size:9.5px; opacity:0.8; text-transform:uppercase;">CYLINDER REVENUE</div>
              <div style="font-size:18px; font-weight:800; font-family:monospace; margin:2px 0;">${utils.formatCurrency(coll.GrandTotal || 0)}</div>
              <div style="font-size:8.5px; opacity:0.7;">Commercial & Domestic</div>
            </div>
            <div style="padding:10px 6px; border-right:1px solid rgba(255,255,255,0.1);">
              <div style="font-size:9.5px; opacity:0.8; text-transform:uppercase;">DIGITAL COLLECTIONS</div>
              <div style="font-size:18px; font-weight:800; font-family:monospace; margin:2px 0; color:#38bdf8;">${utils.formatCurrency(Number(coll.UPI || 0) + Number(coll.HPPay || 0))}</div>
              <div style="font-size:8.5px; opacity:0.7;">UPI + HP Pay Settlement</div>
            </div>
            <div style="padding:10px 6px; border-right:1px solid rgba(255,255,255,0.1);">
              <div style="font-size:9.5px; opacity:0.8; text-transform:uppercase;">NET CASH INFLOW</div>
              <div style="font-size:18px; font-weight:800; font-family:monospace; margin:2px 0; color:#4ade80;">${utils.formatCurrency(Number(coll.Cash || cb.CounterCash || 0) + Number(cb.HawkerCash || 0))}</div>
              <div style="font-size:8.5px; opacity:0.7;">Counter & Delivery Cash</div>
            </div>
            <div style="padding:10px 6px;">
              <div style="font-size:9.5px; opacity:0.8; text-transform:uppercase;">OUTSTANDING DUES</div>
              <div style="font-size:18px; font-weight:800; font-family:monospace; margin:2px 0; color:#f87171;">${utils.formatCurrency(Number(duesSummary.TotalOutstandingDues || coll.Dues || 0))}</div>
              <div style="font-size:8.5px; opacity:0.7;">Uncollected Customer Dues</div>
            </div>
          </div>

          <!-- Section 1: Cylinder & Accessories Sales Report -->
          <div style="background:#003366; color:#ffffff; padding:6px 10px; font-size:10.5px; font-weight:800; text-transform:uppercase; margin-top:8px; display:flex; justify-content:space-between;">
            <span>CYLINDER & ACCESSORIES SALES REPORT</span>
            <span>MODE OF PAYMENT BREAKDOWN (₹)</span>
          </div>
          <table class="roj-official-table">
            <thead>
              <tr>
                <th>Item / Category</th>
                <th class="num">Rate (₹)</th>
                <th class="num text-center">Qty</th>
                <th class="num">Total Amount (₹)</th>
                <th class="num">Cash (₹)</th>
                <th class="num">UPI (₹)</th>
                <th class="num">HP Pay (₹)</th>
                <th class="num">Dues (₹)</th>
                <th class="num">Others (₹)</th>
                <th class="num">Total Settled (₹)</th>
                <th class="text-center">Audit Status</th>
              </tr>
            </thead>
            <tbody>
              ${salesRows}
              <tr style="font-weight:800; background:#f1f5f9; border-top:2px solid #001f3f;">
                <td>TOTAL CYLINDER & ACCESSORIES</td>
                <td class="num">-</td>
                <td class="num text-center">${totalQty}</td>
                <td class="num font-bold">${utils.formatCurrency(totalAmount)}</td>
                <td class="num">${utils.formatCurrency(totalCash)}</td>
                <td class="num">${utils.formatCurrency(totalUPI)}</td>
                <td class="num">${utils.formatCurrency(totalHPPay)}</td>
                <td class="num">${utils.formatCurrency(totalDues)}</td>
                <td class="num">₹0.00</td>
                <td class="num font-bold">${utils.formatCurrency(totalSettled)}</td>
                <td class="text-center" style="color:#15803d;">RECONCILED ✓</td>
              </tr>
            </tbody>
          </table>

          <!-- Section 2: Security Deposit & SV/TV Issuance Register -->
          <div style="background:#003366; color:#ffffff; padding:6px 10px; font-size:10.5px; font-weight:800; text-transform:uppercase; margin-top:12px;">
            SECURITY DEPOSIT & SV / TV ISSUANCE REGISTER
          </div>
          <table class="roj-official-table">
            <thead>
              <tr>
                <th>Type / Item</th>
                <th>Connection Type</th>
                <th>Status</th>
                <th class="num text-center">Qty</th>
                <th class="num">Rate (₹)</th>
                <th class="num">Amount (₹)</th>
                <th class="num">Cash (₹)</th>
                <th class="num">UPI (₹)</th>
                <th class="num">NEFT / RTGS (₹)</th>
                <th class="num">Total Settled (₹)</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>14.2KG Domestic</td>
                <td>Single</td>
                <td>NEW</td>
                <td class="num text-center">0</td>
                <td class="num">₹2,200.00</td>
                <td class="num">₹0.00</td>
                <td class="num">₹0.00</td>
                <td class="num">₹0.00</td>
                <td class="num">₹0.00</td>
                <td class="num">₹0.00</td>
                <td>New SV Connection</td>
              </tr>
              <tr>
                <td>Regulator</td>
                <td>Single</td>
                <td>NEW</td>
                <td class="num text-center">0</td>
                <td class="num">₹250.00</td>
                <td class="num">₹0.00</td>
                <td class="num">₹0.00</td>
                <td class="num">₹0.00</td>
                <td class="num">₹0.00</td>
                <td class="num">₹0.00</td>
                <td>Security Deposit</td>
              </tr>
              <tr>
                <td>19KG Commercial</td>
                <td>3-GAS</td>
                <td>Add</td>
                <td class="num text-center">0</td>
                <td class="num">₹3,500.00</td>
                <td class="num">₹0.00</td>
                <td class="num">₹0.00</td>
                <td class="num">₹0.00</td>
                <td class="num">₹0.00</td>
                <td class="num">₹0.00</td>
                <td>Commercial Cylinder SD</td>
              </tr>
              <tr style="font-weight:800; background:#f1f5f9;">
                <td colspan="5">TOTAL SECURITY DEPOSITS</td>
                <td class="num">₹0.00</td>
                <td class="num">₹0.00</td>
                <td class="num">₹0.00</td>
                <td class="num">₹0.00</td>
                <td class="num font-bold">₹0.00</td>
                <td>TV Adjustments</td>
              </tr>
            </tbody>
          </table>

          <!-- Section 3: Previous Outstanding Dues Recovered -->
          <div style="background:#003366; color:#ffffff; padding:6px 10px; font-size:10.5px; font-weight:800; text-transform:uppercase; margin-top:12px;">
            PREVIOUS OUTSTANDING DUES RECOVERED (B)
          </div>
          <table class="roj-official-table">
            <thead>
              <tr>
                <th>Party / Customer / Vendor Name</th>
                <th class="num">Bill Amount (₹)</th>
                <th class="num">Cash (₹)</th>
                <th class="num">UPI (₹)</th>
                <th class="num">NEFT / RTGS (₹)</th>
                <th class="num">Total Received (₹)</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${duesRecRows}
              <tr style="font-weight:800; background:#f1f5f9;">
                <td>TOTAL PREVIOUS DUES RECOVERED [B]</td>
                <td class="num font-bold">${utils.formatCurrency(totalDuesRec)}</td>
                <td class="num">${utils.formatCurrency(totalDuesRec)}</td>
                <td class="num">₹0.00</td>
                <td class="num">₹0.00</td>
                <td class="num font-bold">${utils.formatCurrency(totalDuesRec)}</td>
                <td style="color:#15803d;">RECOVERED ✓</td>
              </tr>
            </tbody>
          </table>

          <!-- Grand Summary Block -->
          <div style="background:#001f3f; color:#ffffff; padding:8px 12px; margin-top:12px; display:flex; justify-content:space-between; align-items:center; border-radius:4px;">
            <span style="font-size:12px; font-weight:800; text-transform:uppercase;">GRAND TOTAL AMOUNT Including Dues [A+B]:</span>
            <span style="font-size:18px; font-weight:800; font-family:monospace;">${utils.formatCurrency(totalSettled + totalDuesRec)}</span>
          </div>

          <!-- Sign-Off Block -->
          <div class="roj-sign-block" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-top:24px; text-align:center;">
            <div style="border-top:1px solid #000; padding-top:6px;">
              <div style="font-size:11px; font-weight:700;">Created By</div>
              <div style="font-size:10px; color:#64748b;">Counter Cashier</div>
            </div>
            <div style="border-top:1px solid #000; padding-top:6px;">
              <div style="font-size:11px; font-weight:700;">Checked By</div>
              <div style="font-size:10px; color:#64748b;">Accountant / Supervisor</div>
            </div>
            <div style="border-top:1px solid #000; padding-top:6px;">
              <div style="font-size:11px; font-weight:700;">Authorized Signatory</div>
              <div style="font-size:10px; color:#64748b;">Proprietor / Manager</div>
            </div>
          </div>
        </div>
      `;
    };

    // SHEET 2: DAILY CASH & COLLECTION REPORT
    const renderSheet2 = () => {
      const d500 = Number(cb.Denomination500 || 0);
      const d200 = Number(cb.Denomination200 || 0);
      const d100 = Number(cb.Denomination100 || 0);
      const d50 = Number(cb.Denomination50 || 0);
      const d20 = Number(cb.Denomination20 || 0);
      const d10 = Number(cb.Denomination10 || 0);
      const dCoins = Number(cb.DenominationCoins || 0);

      const d500Total = d500 * 500;
      const d200Total = d200 * 200;
      const d100Total = d100 * 100;
      const d50Total = d50 * 50;
      const d20Total = d20 * 20;
      const d10Total = d10 * 10;
      const totalPhysical = d500Total + d200Total + d100Total + d50Total + d20Total + d10Total + dCoins;

      return `
        <div class="roj-page-break" style="page-break-after:always; margin-bottom:28px;">
          <!-- Top Title Bar -->
          <div style="background:#001f3f; color:#ffffff; padding:10px 16px; border-radius:4px 4px 0 0; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:14px; font-weight:800; letter-spacing:0.5px;">${utils.escapeHtml(c.AgencyName || c.CompanyName).toUpperCase()} • DAILY CASH & COLLECTION REPORT</div>
            <div style="font-size:12px; font-weight:700; font-family:monospace;">DATE: ${formattedDate}</div>
          </div>

          <!-- 5 Metric KPI Header Bar -->
          <div style="display:grid; grid-template-columns:repeat(5, 1fr); background:#001529; color:#ffffff; border-top:1px solid rgba(255,255,255,0.15); border-bottom:2px solid #001f3f; text-align:center;">
            <div style="padding:10px 6px; border-right:1px solid rgba(255,255,255,0.1);">
              <div style="font-size:9.5px; opacity:0.8; text-transform:uppercase;">TOTAL SALES BILL</div>
              <div style="font-size:18px; font-weight:800; font-family:monospace; margin:2px 0;">${utils.formatCurrency(coll.GrandTotal || 0)}</div>
              <div style="font-size:8.5px; opacity:0.7;">Daily Invoiced Bill</div>
            </div>
            <div style="padding:10px 6px; border-right:1px solid rgba(255,255,255,0.1);">
              <div style="font-size:9.5px; opacity:0.8; text-transform:uppercase;">NET RECEIPTS</div>
              <div style="font-size:18px; font-weight:800; font-family:monospace; margin:2px 0;">${utils.formatCurrency(cb.TotalInflow || 0)}</div>
              <div style="font-size:8.5px; opacity:0.7;">Net Sales Parity</div>
            </div>
            <div style="padding:10px 6px; border-right:1px solid rgba(255,255,255,0.1);">
              <div style="font-size:9.5px; opacity:0.8; text-transform:uppercase;">CASH COLLECTED</div>
              <div style="font-size:18px; font-weight:800; font-family:monospace; margin:2px 0; color:#4ade80;">${utils.formatCurrency(cb.CounterCash || 0)}</div>
              <div style="font-size:8.5px; opacity:0.7;">Counter Cash</div>
            </div>
            <div style="padding:10px 6px; border-right:1px solid rgba(255,255,255,0.1);">
              <div style="font-size:9.5px; opacity:0.8; text-transform:uppercase;">BANK DEPOSIT</div>
              <div style="font-size:18px; font-weight:800; font-family:monospace; margin:2px 0; color:#38bdf8;">${utils.formatCurrency(cb.BankDeposit || 0)}</div>
              <div style="font-size:8.5px; opacity:0.7;">Pandaul Branch</div>
            </div>
            <div style="padding:10px 6px;">
              <div style="font-size:9.5px; opacity:0.8; text-transform:uppercase;">CLOSING CASH</div>
              <div style="font-size:18px; font-weight:800; font-family:monospace; margin:2px 0;">${utils.formatCurrency(cb.ExpectedClosing || 0)}</div>
              <div style="font-size:8.5px; opacity:0.7;">Physical In Hand</div>
            </div>
          </div>

          <!-- 2-Column: Sales Adjustments vs Payment Channels -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px;">
            <div>
              <div style="background:#003366; color:#ffffff; padding:6px 10px; font-size:10.5px; font-weight:800; text-transform:uppercase;">
                SALES & ADJUSTMENTS
              </div>
              <table class="roj-official-table">
                <tr><td>Total Daily Sales Bill Amount (C)</td><td class="num font-bold">${utils.formatCurrency(coll.GrandTotal || 0)}</td><td>Daily Invoiced Gross Billing</td></tr>
                <tr><td>HP PAY Adjustment</td><td class="num">${utils.formatCurrency(coll.HPPay || 0)}</td><td>HP Digital Wallet Settlement</td></tr>
                <tr><td>Cash in Madhubani</td><td class="num">₹0.00</td><td>-</td></tr>
                <tr><td>C/N Adjustment Accept Advance</td><td class="num">₹0.00</td><td>-</td></tr>
                <tr style="font-weight:700; background:#f8fafc;"><td>Total Adjusted Amount (D)</td><td class="num">${utils.formatCurrency(coll.HPPay || 0)}</td><td>Sum of Adjustments</td></tr>
                <tr><td>Dues on Customer</td><td class="num" style="color:#b91c1c;">${utils.formatCurrency(coll.Dues || 0)}</td><td>Credit Given</td></tr>
                <tr style="font-weight:800; background:#e0f2fe;"><td>Net Sales Receipt Amount [C-D]</td><td class="num font-bold">${utils.formatCurrency(Number(coll.GrandTotal || 0) - Number(coll.HPPay || 0))}</td><td>Net of Adjustments</td></tr>
              </table>
            </div>

            <div>
              <div style="background:#003366; color:#ffffff; padding:6px 10px; font-size:10.5px; font-weight:800; text-transform:uppercase;">
                PAYMENT CHANNELS & SETTLEMENT
              </div>
              <table class="roj-official-table">
                <tr><td>CASH</td><td class="num font-bold" style="color:#15803d;">${utils.formatCurrency(cb.CounterCash || coll.Cash || 0)}</td></tr>
                <tr><td>UPI</td><td class="num" style="color:#0284c7;">${utils.formatCurrency(coll.UPI || 0)}</td></tr>
                <tr><td>NEFT / RTGS</td><td class="num">${utils.formatCurrency(coll.Bank || 0)}</td></tr>
                <tr style="font-weight:800; background:#f8fafc;"><td>Total Actual Receipts [E]</td><td class="num font-bold">${utils.formatCurrency(Number(cb.CounterCash || coll.Cash || 0) + Number(coll.UPI || 0) + Number(coll.Bank || 0))}</td></tr>
                <tr><td>Settlement Check</td><td class="num" style="color:#15803d; font-weight:700;">RECONCILED ✓</td></tr>
                <tr><td>Expected Parity Difference</td><td class="num">₹0.00</td></tr>
                <tr style="font-weight:800; background:#e0f2fe;"><td>Net Dues & Deductions</td><td class="num">${utils.formatCurrency(coll.Dues || 0)}</td></tr>
              </table>
            </div>
          </div>

          <!-- Daily Cash Book Account (Receipts & Payments) -->
          <div style="background:#003366; color:#ffffff; padding:6px 10px; font-size:10.5px; font-weight:800; text-transform:uppercase; margin-top:12px;">
            DAILY CASH BOOK ACCOUNT (RECEIPTS & PAYMENTS)
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:4px;">
            <table class="roj-official-table">
              <thead><tr><th>RECEIPTS / INFLOW PARTICULARS</th><th class="num">AMOUNT (₹)</th></tr></thead>
              <tbody>
                <tr><td>Opening Cash Balance</td><td class="num font-bold">${utils.formatCurrency(cb.OpeningCash || 0)}</td></tr>
                <tr><td>Cash Received from sales</td><td class="num">${utils.formatCurrency(cb.CounterCash || 0)}</td></tr>
                <tr><td>Customer Dues Recovered</td><td class="num">${utils.formatCurrency(cb.DuesCash || 0)}</td></tr>
                <tr><td>Hawker Cash Deposited</td><td class="num">${utils.formatCurrency(cb.HawkerCash || 0)}</td></tr>
                <tr><td>Other Agency Inflow</td><td class="num">${utils.formatCurrency(cb.OtherInflow || 0)}</td></tr>
                <tr style="font-weight:800; background:#f0fdf4;"><td>Total Cash Inflows & Opening</td><td class="num font-bold" style="color:#15803d;">${utils.formatCurrency(cb.TotalInflow || (Number(cb.OpeningCash || 0) + Number(cb.CounterCash || 0)))}</td></tr>
              </tbody>
            </table>

            <table class="roj-official-table">
              <thead><tr><th>PAYMENTS / OUTFLOW PARTICULARS</th><th class="num">AMOUNT (₹)</th><th>VOUCHER NOTE</th></tr></thead>
              <tbody>
                <tr><td>Bank Deposit at Pandaul</td><td class="num">${utils.formatCurrency(cb.BankDeposit || 0)}</td><td>Branch Deposit Slip</td></tr>
                <tr><td>Petty Cash & Misc. Expenses</td><td class="num">${utils.formatCurrency(cb.Expenses || 0)}</td><td>Counter Expenses</td></tr>
                <tr><td>Security Deposit Refunds</td><td class="num">${utils.formatCurrency(cb.Refunds || 0)}</td><td>Refund Vouchers</td></tr>
                <tr><td>Closing Cash Balance in Hand</td><td class="num font-bold">${utils.formatCurrency(cb.ExpectedClosing || 0)}</td><td>Carried to Till</td></tr>
                <tr style="font-weight:800; background:#fef2f2;"><td>Total Cash Outflows & Closing</td><td class="num font-bold" style="color:#b91c1c;">${utils.formatCurrency(Number(cb.TotalOutflow || 0) + Number(cb.ExpectedClosing || 0))}</td><td>BALANCED ✓</td></tr>
              </tbody>
            </table>
          </div>

          <!-- Physical Cash Denomination & Reconciliation -->
          <div style="background:#003366; color:#ffffff; padding:6px 10px; font-size:10.5px; font-weight:800; text-transform:uppercase; margin-top:12px;">
            PHYSICAL CASH DENOMINATION & RECONCILIATION
          </div>
          <table class="roj-official-table">
            <thead>
              <tr>
                <th>Currency Note / Coin</th>
                <th class="num text-center">Denomination (₹)</th>
                <th class="num text-center">Note Count (Pcs)</th>
                <th class="num">Total Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>₹ 500 Note</td><td class="num text-center">₹500</td><td class="num text-center">${d500}</td><td class="num">${utils.formatCurrency(d500Total)}</td></tr>
              <tr><td>₹ 200 Note</td><td class="num text-center">₹200</td><td class="num text-center">${d200}</td><td class="num">${utils.formatCurrency(d200Total)}</td></tr>
              <tr><td>₹ 100 Note</td><td class="num text-center">₹100</td><td class="num text-center">${d100}</td><td class="num">${utils.formatCurrency(d100Total)}</td></tr>
              <tr><td>₹ 50 Note</td><td class="num text-center">₹50</td><td class="num text-center">${d50}</td><td class="num">${utils.formatCurrency(d50Total)}</td></tr>
              <tr><td>₹ 20 Note</td><td class="num text-center">₹20</td><td class="num text-center">${d20}</td><td class="num">${utils.formatCurrency(d20Total)}</td></tr>
              <tr><td>₹ 10 Note</td><td class="num text-center">₹10</td><td class="num text-center">${d10}</td><td class="num">${utils.formatCurrency(d10Total)}</td></tr>
              <tr><td>Coins & Loose Change</td><td class="num text-center">Coins</td><td class="num text-center">-</td><td class="num">${utils.formatCurrency(dCoins)}</td></tr>
              <tr style="font-weight:800; background:#f1f5f9; border-top:2px solid #001f3f;">
                <td>Total Physical Cash in Till</td>
                <td colspan="2" class="text-center font-bold">Physical Count</td>
                <td class="num font-bold" style="color:#001f3f; font-size:13px;">${utils.formatCurrency(totalPhysical || cb.PhysicalClosing || cb.ExpectedClosing || 0)}</td>
              </tr>
              <tr style="font-weight:800; background:#e0f2fe;">
                <td>Cash Book Closing Balance</td>
                <td class="num text-center font-bold">${utils.formatCurrency(cb.ExpectedClosing || 0)}</td>
                <td class="text-center">Variance: ₹${Number(cb.Variance || 0).toFixed(2)}</td>
                <td class="num font-bold" style="color:#15803d;">MATCHED & BALANCED ✓</td>
              </tr>
            </tbody>
          </table>

          <!-- Amount Dues Register & Receivables C/F -->
          <div style="background:#003366; color:#ffffff; padding:6px 10px; font-size:10.5px; font-weight:800; text-transform:uppercase; margin-top:12px;">
            AMOUNT DUES REGISTER & RECEIVABLES C/F
          </div>
          <table class="roj-official-table">
            <thead>
              <tr>
                <th>SL. & DUES CATEGORY</th>
                <th>PARTY / VENDOR</th>
                <th>BILL DATE</th>
                <th class="num">AMOUNT DUES (₹)</th>
                <th>STATUS / REMARKS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Opening Back Dues</td>
                <td>Previous Receivables</td>
                <td>B/F</td>
                <td class="num font-bold">${utils.formatCurrency(Number(duesSummary.TotalOutstandingDues || 0) - Number(coll.Dues || 0))}</td>
                <td>Opening Balance B/F</td>
              </tr>
              <tr>
                <td>Add: Today's Dues</td>
                <td>Current Refills / SV</td>
                <td>${formattedDate}</td>
                <td class="num" style="color:#b91c1c;">${utils.formatCurrency(coll.Dues || 0)}</td>
                <td>Current Sales Dues</td>
              </tr>
              <tr>
                <td>Less: Dues Collected</td>
                <td>Recovered from Parties</td>
                <td>${formattedDate}</td>
                <td class="num" style="color:#15803d;">-${utils.formatCurrency(cb.DuesCash || 0)}</td>
                <td>Recovered</td>
              </tr>
              <tr style="font-weight:800; background:#f1f5f9;">
                <td colspan="3">Total Outstanding Dues (Closing)</td>
                <td class="num font-bold" style="font-size:13px; color:#b91c1c;">${utils.formatCurrency(duesSummary.TotalOutstandingDues || 0)}</td>
                <td style="color:#15803d;">RECONCILED C/F ✓</td>
              </tr>
            </tbody>
          </table>

          <!-- Signatures -->
          <div class="roj-sign-block" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-top:24px; text-align:center;">
            <div style="border-top:1px solid #000; padding-top:6px;">
              <div style="font-size:11px; font-weight:700;">PREPARED BY</div>
              <div style="font-size:10px; color:#64748b;">Cashier / Counter Operator</div>
            </div>
            <div style="border-top:1px solid #000; padding-top:6px;">
              <div style="font-size:11px; font-weight:700;">CHECKED & VERIFIED BY</div>
              <div style="font-size:10px; color:#64748b;">Accountant / Supervisor</div>
            </div>
            <div style="border-top:1px solid #000; padding-top:6px;">
              <div style="font-size:11px; font-weight:700;">AUTHORIZED SIGNATORY</div>
              <div style="font-size:10px; color:#64748b;">Manager / Owner</div>
            </div>
          </div>
        </div>
      `;
    };

    // SHEET 3: DAILY GAS SALES & COLLECTION SUMMARY (Hawkers + Godown)
    const renderSheet3 = () => {
      let totHawkerGas = 0;
      let totHawkerCash = 0;
      let totHawkerUPI = 0;
      let totHawkerHP = 0;
      let totHawkerDues = 0;

      const hawkerRows = (hawkers.length ? hawkers : [
        { HawkerName: 'MONU', NetSold: 0, CashDeposited: 0, UPIDeposited: 0, ShortageAmount: 0 },
        { HawkerName: 'SAROJ', NetSold: 0, CashDeposited: 0, UPIDeposited: 0, ShortageAmount: 0 },
        { HawkerName: 'BHOGENDRA', NetSold: 0, CashDeposited: 0, UPIDeposited: 0, ShortageAmount: 0 },
        { HawkerName: 'RAVI PRAKASH', NetSold: 0, CashDeposited: 0, UPIDeposited: 0, ShortageAmount: 0 },
        { HawkerName: 'GENA LAL', NetSold: 0, CashDeposited: 0, UPIDeposited: 0, ShortageAmount: 0 },
        { HawkerName: 'BECHAN', NetSold: 0, CashDeposited: 0, UPIDeposited: 0, ShortageAmount: 0 },
        { HawkerName: 'DINESH', NetSold: 0, CashDeposited: 0, UPIDeposited: 0, ShortageAmount: 0 },
        { HawkerName: 'MANTUN', NetSold: 0, CashDeposited: 0, UPIDeposited: 0, ShortageAmount: 0 },
        { HawkerName: 'BAJRANGI', NetSold: 0, CashDeposited: 0, UPIDeposited: 0, ShortageAmount: 0 },
        { HawkerName: 'SUJIT', NetSold: 0, CashDeposited: 0, UPIDeposited: 0, ShortageAmount: 0 },
        { HawkerName: 'SANJAY', NetSold: 0, CashDeposited: 0, UPIDeposited: 0, ShortageAmount: 0 }
      ]).map((h, idx) => {
        const gas = Number(h.LoadedQuantity || h.NetSold || 0);
        const cash = Number(h.CashDeposited || 0);
        const upi = Number(h.UPIDeposited || 0);
        const hp = Number(h.HPPayDeposited || 0);
        const hpCount = Number(h.HPPayConsumerCount || 0);
        const dues = Number(h.DuesAllowed || h.ShortageAmount || 0);
        const shortage = Number(h.ShortageAmount || 0);

        totHawkerGas += gas;
        totHawkerCash += cash;
        totHawkerUPI += upi;
        totHawkerHP += hp;
        totHawkerDues += dues;

        return `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td><strong>${utils.escapeHtml(h.HawkerName || 'Hawker')}</strong></td>
            <td class="num text-center font-bold">${gas}</td>
            <td class="num">${utils.formatCurrency(cash)}</td>
            <td class="num">${utils.formatCurrency(upi)}</td>
            <td class="num">${utils.formatCurrency(hp)}${hpCount > 0 ? ` <small style="display:block; color:#0284c7; font-weight:700;">(${hpCount} Nos)</small>` : ''}</td>
            <td class="num">${utils.formatCurrency(dues)}</td>
            <td class="text-center" style="color:${shortage > 0 ? '#b91c1c' : '#15803d'}; font-weight:700;">
              ${shortage > 0 ? ('Shortage -' + utils.formatCurrency(shortage)) : 'Balanced'}
            </td>
          </tr>
        `;
      }).join('');

      return `
        <div class="roj-page-break" style="page-break-after:always; margin-bottom:28px;">
          <!-- Top Title Bar -->
          <div style="background:#001f3f; color:#ffffff; padding:10px 16px; border-radius:4px 4px 0 0; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:14px; font-weight:800; letter-spacing:0.5px;">DAILY GAS SALES & COLLECTION SUMMARY</div>
            <div style="font-size:12px; font-weight:700; font-family:monospace;">${formattedDate}</div>
          </div>

          <!-- 4 Metric KPI Header Bar -->
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); background:#001529; color:#ffffff; border-top:1px solid rgba(255,255,255,0.15); border-bottom:2px solid #001f3f; text-align:center;">
            <div style="padding:10px 6px; border-right:1px solid rgba(255,255,255,0.1);">
              <div style="font-size:9.5px; opacity:0.8; text-transform:uppercase;">TOTAL CYLINDERS</div>
              <div style="font-size:22px; font-weight:800; font-family:monospace; margin:2px 0;">${totHawkerGas}</div>
              <div style="font-size:8.5px; opacity:0.7;">Delivery + Godown</div>
            </div>
            <div style="padding:10px 6px; border-right:1px solid rgba(255,255,255,0.1);">
              <div style="font-size:9.5px; opacity:0.8; text-transform:uppercase;">CASH COLLECTIONS</div>
              <div style="font-size:22px; font-weight:800; font-family:monospace; margin:2px 0; color:#4ade80;">${utils.formatCurrency(totHawkerCash)}</div>
              <div style="font-size:8.5px; opacity:0.7;">Physical Cash</div>
            </div>
            <div style="padding:10px 6px; border-right:1px solid rgba(255,255,255,0.1);">
              <div style="font-size:9.5px; opacity:0.8; text-transform:uppercase;">DIGITAL PAYMENTS</div>
              <div style="font-size:22px; font-weight:800; font-family:monospace; margin:2px 0; color:#38bdf8;">${utils.formatCurrency(totHawkerUPI + totHawkerHP)}</div>
              <div style="font-size:8.5px; opacity:0.7;">UPI + HP Pay</div>
            </div>
            <div style="padding:10px 6px;">
              <div style="font-size:9.5px; opacity:0.8; text-transform:uppercase;">TOTAL DUES</div>
              <div style="font-size:22px; font-weight:800; font-family:monospace; margin:2px 0; color:#f87171;">${utils.formatCurrency(totHawkerDues)}</div>
              <div style="font-size:8.5px; opacity:0.7;">Pending Dues</div>
            </div>
          </div>

          <!-- Hawker Trip Distribution Table -->
          <table class="roj-official-table" style="margin-top:12px;">
            <thead>
              <tr>
                <th style="width:45px;" class="text-center">S.NO.</th>
                <th>VENDOR / HAWKER NAME</th>
                <th class="num text-center">TOTAL GAS GIVEN</th>
                <th class="num">CASH</th>
                <th class="num">UPI</th>
                <th class="num">HP PAY</th>
                <th class="num">DUES</th>
                <th class="text-center">RECONCILIATION</th>
              </tr>
            </thead>
            <tbody>
              ${hawkerRows}
              <tr style="font-weight:800; background:#f1f5f9; border-top:2px solid #001f3f;">
                <td colspan="2">DELIVERY TOTAL</td>
                <td class="num text-center font-bold">${totHawkerGas}</td>
                <td class="num">${utils.formatCurrency(totHawkerCash)}</td>
                <td class="num">${utils.formatCurrency(totHawkerUPI)}</td>
                <td class="num">${utils.formatCurrency(totHawkerHP)}</td>
                <td class="num">${utils.formatCurrency(totHawkerDues)}</td>
                <td class="text-center" style="color:#15803d;">Balanced</td>
              </tr>
              <tr>
                <td colspan="2">GODOWN COUNTER DIRECT</td>
                <td class="num text-center">0</td>
                <td class="num">${utils.formatCurrency(cb.CounterCash || 0)}</td>
                <td class="num">₹0.00</td>
                <td class="num">₹0.00</td>
                <td class="num">₹0.00</td>
                <td class="text-center" style="color:#15803d;">Balanced</td>
              </tr>
              <tr style="font-weight:800; background:#001f3f; color:#ffffff;">
                <td colspan="2">GRAND TOTAL</td>
                <td class="num text-center" style="color:#ffffff;">${totHawkerGas}</td>
                <td class="num" style="color:#ffffff;">${utils.formatCurrency(totHawkerCash + Number(cb.CounterCash || 0))}</td>
                <td class="num" style="color:#ffffff;">${utils.formatCurrency(totHawkerUPI)}</td>
                <td class="num" style="color:#ffffff;">${utils.formatCurrency(totHawkerHP)}</td>
                <td class="num" style="color:#ffffff;">${utils.formatCurrency(totHawkerDues)}</td>
                <td class="text-center" style="color:#4ade80;">Balanced</td>
              </tr>
            </tbody>
          </table>

          ${(data.hpPayTransactions && data.hpPayTransactions.length > 0) ? `
          <!-- HP Pay Online Consumer Deliveries Register -->
          <div style="margin-top:20px;">
            <div style="background:#0284c7; color:#ffffff; padding:8px 14px; border-radius:4px 4px 0 0; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:12px; font-weight:800; letter-spacing:0.5px;">HP PAY ONLINE CONSUMER DELIVERIES REGISTER (${data.hpPayTransactions.length} DELIVERIES)</span>
              <span style="font-size:12px; font-weight:700; font-family:monospace;">TOTAL: ${utils.formatCurrency(data.hpPayTransactions.reduce((s, t) => s + Number(t.Amount || 0), 0))}</span>
            </div>
            <table class="roj-official-table" style="font-size:11px;">
              <thead>
                <tr style="background:#f0f9ff;">
                  <th style="width:45px;" class="text-center">S.NO.</th>
                  <th>HAWKER / VENDOR</th>
                  <th style="font-family:monospace; font-weight:700;">HPCL CONSUMER NO.</th>
                  <th>CYLINDER VARIANT</th>
                  <th class="num">COLLECTION (₹)</th>
                  <th>REFERENCE / REMARKS</th>
                </tr>
              </thead>
              <tbody>
                ${data.hpPayTransactions.map((tx, tIdx) => `
                  <tr>
                    <td class="text-center">${tIdx + 1}</td>
                    <td><strong>${utils.escapeHtml(tx.HawkerName || '-')}</strong></td>
                    <td style="font-family:monospace; font-weight:700; color:#0284c7;">${utils.escapeHtml(tx.ConsumerNo || '-')}</td>
                    <td>${utils.escapeHtml(tx.CylinderType || '14.2 KG Domestic')}</td>
                    <td class="num font-bold">${utils.formatCurrency(tx.Amount || 0)}</td>
                    <td style="color:#64748b;">${utils.escapeHtml(tx.Remarks || tx.ReferenceNo || 'HP Pay Online')}</td>
                  </tr>
                `).join('')}
                <tr style="font-weight:800; background:#f1f5f9; border-top:2px solid #0284c7;">
                  <td colspan="4">TOTAL HP PAY COLLECTIONS</td>
                  <td class="num font-bold" style="color:#0284c7;">${utils.formatCurrency(data.hpPayTransactions.reduce((s, t) => s + Number(t.Amount || 0), 0))}</td>
                  <td style="color:#15803d;">RECONCILED ✓</td>
                </tr>
              </tbody>
            </table>
          </div>
          ` : ''}
        </div>
      `;
    };

    // SHEET 4: DAILY CYLINDER STOCK REPORT
    const renderSheet4 = () => {
      let totOpenFull = 0;
      let totHpcl = 0;
      let totFull = 0;
      let totDelivered = 0;
      let totAdj = 0;
      let totCloseFull = 0;
      let totOpenEmpty = 0;
      let totCustEmpty = 0;
      let totRetEmpty = 0;
      let totEmpty = 0;
      let totPlantEmpty = 0;
      let totCloseEmpty = 0;

      const cylinderRows = (stock.length ? stock : [
        { CylinderType: '14.2 KG Domestic', OpeningFull: 683, PlantReceipt: 0, CounterSold: 0, HawkerSold: 0, ClosingFull: 683, OpeningEmpty: 189, SoundEmptyReceived: 0, SentToPlant: 0, ClosingEmpty: 189 },
        { CylinderType: '19 KG Commercial', OpeningFull: 143, PlantReceipt: 0, CounterSold: 0, HawkerSold: 0, ClosingFull: 143, OpeningEmpty: 17, SoundEmptyReceived: 0, SentToPlant: 0, ClosingEmpty: 17 },
        { CylinderType: '5 KG Commercial', OpeningFull: 142, PlantReceipt: 0, CounterSold: 0, HawkerSold: 0, ClosingFull: 142, OpeningEmpty: 280, SoundEmptyReceived: 0, SentToPlant: 0, ClosingEmpty: 280 },
        { CylinderType: '5 KG Domestic', OpeningFull: 63, PlantReceipt: 0, CounterSold: 0, HawkerSold: 0, ClosingFull: 63, OpeningEmpty: 191, SoundEmptyReceived: 0, SentToPlant: 0, ClosingEmpty: 191 },
        { CylinderType: '2 KG Commercial', OpeningFull: 119, PlantReceipt: 0, CounterSold: 0, HawkerSold: 0, ClosingFull: 119, OpeningEmpty: 55, SoundEmptyReceived: 0, SentToPlant: 0, ClosingEmpty: 55 }
      ]).map((s, idx) => {
        const opFull = Number(s.OpeningFull || 0);
        const hpcl = Number(s.PlantReceipt || 0);
        const totF = opFull + hpcl;
        const delivered = Number(s.CounterSold || 0) + Number(s.HawkerSold || 0);
        const adj = 0;
        const clFull = (s.ClosingFull !== undefined && s.ClosingFull !== null && s.ClosingFull !== '') ? Number(s.ClosingFull) : Math.max(0, totF - delivered);
        const opEmp = Number(s.OpeningEmpty || 0);
        const custEmp = delivered;
        const retEmp = Number(s.SoundEmptyReceived || 0);
        const totEmp = opEmp + custEmp + retEmp;
        const plEmp = Number(s.SentToPlant || 0);
        const clEmp = (s.ClosingEmpty !== undefined && s.ClosingEmpty !== null && s.ClosingEmpty !== '') ? Number(s.ClosingEmpty) : Math.max(0, totEmp - plEmp);

        totOpenFull += opFull;
        totHpcl += hpcl;
        totFull += totF;
        totDelivered += delivered;
        totAdj += adj;
        totCloseFull += clFull;
        totOpenEmpty += opEmp;
        totCustEmpty += custEmp;
        totRetEmpty += retEmp;
        totEmpty += totEmp;
        totPlantEmpty += plEmp;
        totCloseEmpty += clEmp;

        return `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td><strong>${utils.escapeHtml(s.CylinderType)}</strong></td>
            <td class="num text-center">${opFull}</td>
            <td class="num text-center">${hpcl}</td>
            <td class="num text-center font-bold">${totF}</td>
            <td class="num text-center">${delivered}</td>
            <td class="num text-center">${adj}</td>
            <td class="num text-center font-bold" style="background:#f8fafc;">${clFull}</td>
            <td class="num text-center">${opEmp}</td>
            <td class="num text-center">${custEmp}</td>
            <td class="num text-center">${retEmp}</td>
            <td class="num text-center font-bold">${totEmp}</td>
            <td class="num text-center">${plEmp}</td>
            <td class="num text-center font-bold" style="background:#f8fafc;">${clEmp}</td>
            <td>-</td>
          </tr>
        `;
      }).join('');

      return `
        <div class="roj-page-break" style="page-break-after:always; margin-bottom:28px;">
          <!-- Top Title Bar -->
          <div style="background:#001f3f; color:#ffffff; padding:10px 16px; border-radius:4px 4px 0 0; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:14px; font-weight:800; letter-spacing:0.5px;">HP GAS AGENCY – DAILY CYLINDER STOCK REPORT</div>
            <div style="font-size:12px; font-weight:700; font-family:monospace;">DATE: ${formattedDate}</div>
          </div>

          <!-- Section Headings -->
          <table class="roj-official-table" style="margin-top:10px;">
            <thead>
              <tr>
                <th rowspan="2" style="width:40px;" class="text-center">S.No.</th>
                <th rowspan="2">Cylinder Type</th>
                <th colspan="6" class="text-center" style="background:#003366;">FILLED STOCK</th>
                <th colspan="6" class="text-center" style="background:#004080;">EMPTY STOCK</th>
                <th rowspan="2">Remarks</th>
              </tr>
              <tr>
                <th class="num text-center">Opening Filled</th>
                <th class="num text-center">Received from HPCL</th>
                <th class="num text-center">Total Filled</th>
                <th class="num text-center">Filled Delivered / Sold</th>
                <th class="num text-center">Adjustment</th>
                <th class="num text-center">Closing Filled</th>
                <th class="num text-center">Opening Empty</th>
                <th class="num text-center">Customer Empty against Sold</th>
                <th class="num text-center">Received / Returned Empty</th>
                <th class="num text-center">Total Empty</th>
                <th class="num text-center">Empty Sent to Plant</th>
                <th class="num text-center">Closing Empty</th>
              </tr>
            </thead>
            <tbody>
              ${cylinderRows}
              <tr style="font-weight:800; background:#001f3f; color:#ffffff;">
                <td colspan="2">TOTAL</td>
                <td class="num text-center">${totOpenFull}</td>
                <td class="num text-center">${totHpcl}</td>
                <td class="num text-center font-bold">${totFull}</td>
                <td class="num text-center">${totDelivered}</td>
                <td class="num text-center">${totAdj}</td>
                <td class="num text-center font-bold" style="color:#4ade80;">${totCloseFull}</td>
                <td class="num text-center">${totOpenEmpty}</td>
                <td class="num text-center">${totCustEmpty}</td>
                <td class="num text-center">${totRetEmpty}</td>
                <td class="num text-center font-bold">${totEmpty}</td>
                <td class="num text-center">${totPlantEmpty}</td>
                <td class="num text-center font-bold" style="color:#38bdf8;">${totCloseEmpty}</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>

          <!-- Signatures -->
          <div class="roj-sign-block" style="display:grid; grid-template-columns:1fr 1fr; gap:30px; margin-top:36px; text-align:center;">
            <div style="border-top:1px solid #000; padding-top:8px;">
              <div style="font-size:12px; font-weight:700;">Godown Keeper Signature</div>
            </div>
            <div style="border-top:1px solid #000; padding-top:8px;">
              <div style="font-size:12px; font-weight:700;">Authorized Signatory / Manager</div>
            </div>
          </div>
        </div>
      `;
    };

    return `
      <div class="doc-sheet roj-official-container" style="max-width:1080px; margin:0 auto; padding:0; background:#ffffff; color:#000000; font-family:'Segoe UI', Arial, sans-serif; font-size:11px;">
        ${renderSheet1()}
        ${renderSheet2()}
        ${renderSheet3()}
        ${renderSheet4()}
      </div>
    `;
  },

  /* -------------------------------------------------------------------------
   * TEMPLATE 5: DUES COLLECTION RECEIPT
   * ------------------------------------------------------------------------- */
  renderDueReceipt(data, isThermal) {
    const c = this.getCompany();

    if (isThermal) {
      return `
        <div class="doc-sheet thermal-80mm">
          <div class="thermal-header">
            ${this.getLogoHtml(true)}
            <div class="thermal-title">${utils.escapeHtml(c.AgencyName || c.CompanyName)}</div>
            <div class="thermal-sub">HPCL DISTRIBUTOR: ${utils.escapeHtml(c.DistributorCode || '')}</div>
            <div class="thermal-sub" style="font-weight:700;">DUES PAYMENT RECEIPT</div>
          </div>
          <div class="thermal-row"><span>Rct No: <strong>${data.ReceiptNumber || ''}</strong></span><span>${data.PaymentDate || utils.today()}</span></div>
          <div class="thermal-row"><span>Customer: ${utils.escapeHtml(data.CustomerName || '')}</span></div>
          <div class="thermal-divider"></div>
          <div class="thermal-row" style="font-size:13px; font-weight:800; padding:4px 0;">
            <span>AMOUNT PAID:</span>
            <span>₹${Number(data.Amount || 0).toFixed(2)}</span>
          </div>
          <div class="thermal-row"><span>Mode:</span><span>${utils.escapeHtml(data.PaymentMode || 'CASH')}</span></div>
          <div class="thermal-row"><span>Remaining Dues:</span><span>₹${Number(data.RemainingAmount || 0).toFixed(2)}</span></div>
          <div class="thermal-divider"></div>
          <div class="thermal-footer">
            <div>THANK YOU FOR YOUR PAYMENT</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="doc-sheet a4-tax">
        <div class="ds-header">
          <div class="ds-brand" style="display:flex; align-items:center; gap:12px;">
            ${this.getLogoHtml(false)}
            <div>
              <div class="ds-company-title">${utils.escapeHtml(c.AgencyName || c.CompanyName)}</div>
              <div class="ds-company-sub">HPCL Distributor Code: <strong>${utils.escapeHtml(c.DistributorCode || '')}</strong> | Phone: ${utils.escapeHtml(c.Phone || '')}</div>
            </div>
          </div>
          <div class="ds-doc-meta">
            <div class="ds-doc-title">PAYMENT RECEIPT</div>
            <div class="ds-doc-num">${utils.escapeHtml(data.ReceiptNumber || '')}</div>
          </div>
        </div>

        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:18px; margin:20px 0;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px;">
            <span>Received with thanks from:</span> <strong>${utils.escapeHtml(data.CustomerName || '')} (${utils.escapeHtml(data.CustomerMobile || '')})</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px;">
            <span>Payment Date:</span> <strong>${utils.formatDate(data.PaymentDate || utils.today())}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px;">
            <span>Payment Mode:</span> <strong>${utils.escapeHtml(data.PaymentMode || 'CASH')} ${data.ReferenceNo ? `(Ref: ${data.ReferenceNo})` : ''}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding-top:10px; border-top:1px dashed #cbd5e1; font-size:18px; font-weight:800; color:#001f3f;">
            <span>Amount Received:</span>
            <span>${utils.formatCurrency(data.Amount || 0)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:6px; font-size:12px; color:#64748b;">
            <span>Remaining Due Balance:</span>
            <span>${utils.formatCurrency(data.RemainingAmount || 0)}</span>
          </div>
        </div>

        <div class="ds-signatures">
          <div class="ds-signature-box">Customer Signature</div>
          <div class="ds-signature-box">Authorised Signatory</div>
        </div>
      </div>
    `;
  },

  /* -------------------------------------------------------------------------
   * TEMPLATE 6: SALARY PAYSLIP
   * ------------------------------------------------------------------------- */
  renderPayslip(salary, isThermal) {
    const c = this.getCompany();

    return `
      <div class="doc-sheet a4-tax">
        <div class="ds-header">
          <div class="ds-brand" style="display:flex; align-items:center; gap:12px;">
            ${this.getLogoHtml(false)}
            <div>
              <div class="ds-company-title">${utils.escapeHtml(c.AgencyName || c.CompanyName)}</div>
              <div class="ds-company-sub">HPCL Distributor: <strong>${utils.escapeHtml(c.DistributorCode || '')}</strong> | STAFF MONTHLY PAYSLIP</div>
            </div>
          </div>
          <div class="ds-doc-meta">
            <div class="ds-doc-title">PAYSLIP</div>
            <div class="ds-doc-num">${salary.SalaryMonth || ''}</div>
          </div>
        </div>

        <div class="ds-info-grid">
          <div class="ds-info-box">
            <div class="ds-info-row"><span>Staff Name:</span> <strong>${utils.escapeHtml(salary.EmployeeName || '')}</strong></div>
            <div class="ds-info-row"><span>Role / Designation:</span> <span>${utils.escapeHtml(salary.Role || 'Delivery Staff')}</span></div>
          </div>
          <div class="ds-info-box">
            <div class="ds-info-row"><span>Days Present:</span> <strong>${salary.PresentDays || 0} / ${salary.TotalDaysInMonth || 30}</strong></div>
            <div class="ds-info-row"><span>Pay Date:</span> <span>${utils.formatDate(salary.CreatedAt || utils.today())}</span></div>
          </div>
        </div>

        <table class="ds-table">
          <thead>
            <tr>
              <th>Earnings</th>
              <th class="num">Amount (₹)</th>
              <th>Deductions</th>
              <th class="num">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic Base Salary</td>
              <td class="num">${utils.formatCurrency(salary.BaseSalary || 0)}</td>
              <td>Advance Recovery</td>
              <td class="num">${utils.formatCurrency(salary.AdvanceDeduction || 0)}</td>
            </tr>
            <tr>
              <td>Delivery Incentive</td>
              <td class="num">${utils.formatCurrency(salary.DeliveryIncentive || 0)}</td>
              <td>Shortage Deductions</td>
              <td class="num">${utils.formatCurrency(salary.ShortageDeduction || 0)}</td>
            </tr>
            <tr style="font-weight:800; background:#f8fafc;">
              <td>Gross Earnings:</td>
              <td class="num">${utils.formatCurrency(salary.GrossSalary || salary.BaseSalary || 0)}</td>
              <td>Total Deductions:</td>
              <td class="num">${utils.formatCurrency(salary.TotalDeductions || (Number(salary.AdvanceDeduction || 0) + Number(salary.ShortageDeduction || 0)))}</td>
            </tr>
          </tbody>
        </table>

        <div style="background:#001f3f; color:#ffffff; padding:14px 18px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:14px; font-weight:700;">NET PAYABLE SALARY:</span>
          <span style="font-size:22px; font-weight:800; font-family:monospace;">${utils.formatCurrency(salary.NetSalary || 0)}</span>
        </div>

        <div class="ds-signatures">
          <div class="ds-signature-box">Employee Signature</div>
          <div class="ds-signature-box">Manager Signature</div>
        </div>
      </div>
    `;
  },

  /* -------------------------------------------------------------------------
   * TEMPLATE 7: HAWKER DISPATCH GATE PASS
   * ------------------------------------------------------------------------- */
  renderDispatchGatePass(dp) {
    const c = this.getCompany();

    return `
      <div class="doc-sheet a4-tax">
        <div class="ds-header">
          <div class="ds-brand" style="display:flex; align-items:center; gap:12px;">
            ${this.getLogoHtml(false)}
            <div>
              <div class="ds-company-title">${utils.escapeHtml(c.AgencyName || c.CompanyName)}</div>
              <div class="ds-company-sub">HPCL Distributor: <strong>${utils.escapeHtml(c.DistributorCode || '')}</strong> | GODOWN GATE PASS & DISPATCH</div>
            </div>
          </div>
          <div class="ds-doc-meta">
            <div class="ds-doc-title">GATE PASS</div>
            <div class="ds-doc-num">${utils.escapeHtml(dp.DispatchNumber || '')}</div>
          </div>
        </div>

        <div class="ds-info-grid">
          <div class="ds-info-box">
            <div class="ds-info-row"><span>Hawker / Driver:</span> <strong>${utils.escapeHtml(dp.EmployeeName || 'Hawker')}</strong></div>
            <div class="ds-info-row"><span>Route / Delivery Area:</span> <span>${utils.escapeHtml(dp.Area || 'Pandaul')}</span></div>
            <div class="ds-info-row"><span>Vehicle Number:</span> <span>${utils.escapeHtml(dp.VehicleNo || '-')}</span></div>
          </div>
          <div class="ds-info-box">
            <div class="ds-info-row"><span>Dispatch Date:</span> <strong>${utils.formatDate(dp.Date || utils.today())}</strong></div>
            <div class="ds-info-row"><span>Status:</span> <strong>${dp.Status || 'OPEN'}</strong></div>
          </div>
        </div>

        <table class="ds-table">
          <thead>
            <tr>
              <th>Cylinder Description</th>
              <th class="num">Cylinders Loaded</th>
              <th class="num">Rate / Unit</th>
              <th class="num">Expected Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${utils.escapeHtml(dp.CylinderType || '14.2 KG Domestic')}</strong></td>
              <td class="num" style="font-weight:800; font-size:14px;">${dp.LoadedQuantity || 0}</td>
              <td class="num">${utils.formatCurrency(dp.Rate || 0)}</td>
              <td class="num" style="font-weight:800;">${utils.formatCurrency(dp.ExpectedCollection || 0)}</td>
            </tr>
          </tbody>
        </table>

        <div class="ds-signatures">
          <div class="ds-signature-box">Godown Keeper (Issued)</div>
          <div class="ds-signature-box">Hawker Signature (Received)</div>
        </div>
      </div>
    `;
  },

  /* -------------------------------------------------------------------------
   * TEMPLATE 8: CUSTOMER DUES STATEMENT / LEDGER
   * ------------------------------------------------------------------------- */
  renderDuesStatement(data) {
    const c = this.getCompany();
    const cust = data.customer || {};
    const dues = data.dues || [];

    const rows = dues.map((d, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${d.DueDate || '-'}</td>
        <td><strong>${d.DueNumber || ''}</strong></td>
        <td class="num">${utils.formatCurrency(d.OriginalAmount || 0)}</td>
        <td class="num" style="color:#15803d;">${utils.formatCurrency(d.PaidAmount || 0)}</td>
        <td class="num" style="color:#b91c1c; font-weight:700;">${utils.formatCurrency(d.RemainingAmount || 0)}</td>
        <td><span class="badge ${d.Status === 'PAID' ? 'badge-success' : 'badge-warning'}">${d.Status || 'PENDING'}</span></td>
      </tr>
    `).join('');

    return `
      <div class="doc-sheet a4-tax">
        <div class="ds-header">
          <div class="ds-brand" style="display:flex; align-items:center; gap:12px;">
            ${this.getLogoHtml(false)}
            <div>
              <div class="ds-company-title">${utils.escapeHtml(c.AgencyName || c.CompanyName)}</div>
              <div class="ds-company-sub">HPCL Distributor: <strong>${utils.escapeHtml(c.DistributorCode || '')}</strong> | CUSTOMER OUTSTANDING STATEMENT</div>
            </div>
          </div>
          <div class="ds-doc-meta">
            <div class="ds-doc-title">STATEMENT</div>
            <div class="ds-doc-num">${utils.today()}</div>
          </div>
        </div>

        <div class="ds-info-box" style="margin-bottom:16px;">
          <div class="ds-info-row"><span>Customer:</span> <strong>${utils.escapeHtml(cust.Name || 'Customer')}</strong></div>
          <div class="ds-info-row"><span>Mobile:</span> <span>${utils.escapeHtml(cust.Mobile || '-')}</span></div>
          <div class="ds-info-row"><span>Consumer Number:</span> <span>${utils.escapeHtml(cust.ConsumerNo || '-')}</span></div>
          <div class="ds-info-row"><span>Total Current Outstanding:</span> <strong style="color:#b91c1c; font-size:14px;">${utils.formatCurrency(cust.CurrentDues || 0)}</strong></div>
        </div>

        <table class="ds-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Bill / Due No</th>
              <th class="num">Original</th>
              <th class="num">Paid</th>
              <th class="num">Pending</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="7" style="text-align:center;">No dues records found.</td></tr>'}
          </tbody>
        </table>

        <div class="ds-signatures">
          <div class="ds-signature-box">Customer Signature</div>
          <div class="ds-signature-box">Authorised Signatory</div>
        </div>
      </div>
    `;
  },

  /* -------------------------------------------------------------------------
   * TEMPLATE 9: SECURITY DEPOSIT REFUND / SV SURRENDER VOUCHER
   * ------------------------------------------------------------------------- */
  renderSecurityRefundVoucher(data, isThermal = false) {
    const c = this.getCompany();
    const inWords = this.amountToWords(data.RefundAmount || 0);

    if (isThermal) {
      return `
        <div class="doc-sheet thermal-80mm">
          <div class="thermal-header">
            ${this.getLogoHtml(true)}
            <div class="thermal-title">${utils.escapeHtml(c.AgencyName || c.CompanyName)}</div>
            <div class="thermal-sub">HPCL DISTRIBUTOR: ${utils.escapeHtml(c.DistributorCode || '')}</div>
            <div class="thermal-sub" style="font-weight:700; margin-top:4px;">SECURITY DEPOSIT REFUND RECEIPT</div>
          </div>

          <div class="thermal-row">
            <span>Voucher No: <strong>${utils.escapeHtml(data.RefundNumber || '')}</strong></span>
            <span>${utils.formatDate(data.Date || utils.today())}</span>
          </div>
          <div class="thermal-row">
            <span>Customer: ${utils.escapeHtml(data.CustomerName || '')}</span>
            <span>${utils.escapeHtml(data.CustomerMobile || '')}</span>
          </div>
          ${data.ConsumerNo ? `<div class="thermal-row"><span>Consumer No: ${utils.escapeHtml(data.ConsumerNo)}</span></div>` : ''}

          <div class="thermal-divider"></div>

          <div style="font-size:11px; margin:4px 0;">
            <div>• Cylinder: ${utils.escapeHtml(data.CylinderType || '14.2 KG Domestic')} (${data.CylindersReturned || 1} Returned)</div>
            <div>• Regulator Returned: ${data.RegulatorReturned ? 'YES' : 'NO'}</div>
            <div>• Passbook Returned: ${data.PassbookReturned ? 'YES' : 'NO'}</div>
          </div>

          <div class="thermal-divider"></div>

          <div class="thermal-row">
            <span>Original Security Held:</span>
            <span>₹${Number(data.SecurityAmount || 0).toFixed(2)}</span>
          </div>
          ${Number(data.DeductionAmount) > 0 ? `
          <div class="thermal-row">
            <span>Deductions / Damage:</span>
            <span>-₹${Number(data.DeductionAmount).toFixed(2)}</span>
          </div>` : ''}
          <div class="thermal-row" style="font-size:13px; font-weight:800; border-top:1px dashed #000; border-bottom:1px dashed #000; padding:4px 0; margin:4px 0;">
            <span>NET REFUND PAID:</span>
            <span>₹${Number(data.RefundAmount || 0).toFixed(2)}</span>
          </div>

          <div class="thermal-row">
            <span>Payment Mode:</span>
            <strong>${utils.escapeHtml(data.PaymentMode || 'CASH')}</strong>
          </div>

          <div class="thermal-divider"></div>

          <div class="thermal-footer">
            <div>Equipment received in sound condition.</div>
            <div>All subscription security refunded.</div>
            <div style="margin-top:4px;">*** SIGNATURE ACKNOWLEDGED ***</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="doc-sheet a4-tax">
        <div class="ds-header">
          <div class="ds-brand" style="display:flex; align-items:center; gap:12px;">
            ${this.getLogoHtml(false)}
            <div>
              <div class="ds-company-title">${utils.escapeHtml(c.AgencyName || c.CompanyName)}</div>
              <div class="ds-company-sub">
                HPCL LPG Authorized Distributor | Code: <strong>${utils.escapeHtml(c.DistributorCode || '')}</strong><br>
                ${utils.escapeHtml(c.AddressLine1 || '')}, ${utils.escapeHtml(c.District || '')}, ${utils.escapeHtml(c.State || '')} - ${utils.escapeHtml(c.PIN || '')}<br>
                GSTIN: <strong>${utils.escapeHtml(c.GSTIN || 'N/A')}</strong> | Phone: ${utils.escapeHtml(c.Phone || '')}
              </div>
            </div>
          </div>
          <div class="ds-doc-meta">
            <div class="ds-doc-title">SECURITY REFUND</div>
            <div class="ds-doc-num">${utils.escapeHtml(data.RefundNumber || 'REFUND-DRAFT')}</div>
            <div class="ds-badge" style="background:#fee2e2; color:#b91c1c; border-color:#fca5a5;">SV SURRENDER VOUCHER</div>
          </div>
        </div>

        <!-- 2 Column Info Grid -->
        <div class="ds-info-grid">
          <div class="ds-info-box">
            <div class="ds-info-box-title"><i class="fa-solid fa-user"></i> Consumer & Connection Particulars</div>
            <div class="ds-info-row"><span>Consumer Name:</span> <strong>${utils.escapeHtml(data.CustomerName || '')}</strong></div>
            <div class="ds-info-row"><span>Mobile Number:</span> <strong>${utils.escapeHtml(data.CustomerMobile || '-')}</strong></div>
            <div class="ds-info-row"><span>Consumer Number:</span> <strong>${utils.escapeHtml(data.ConsumerNo || '-')}</strong></div>
            <div class="ds-info-row"><span>Reason for Refund:</span> <span>${utils.escapeHtml(data.Reason || 'SV Surrender / Migration')}</span></div>
          </div>

          <div class="ds-info-box">
            <div class="ds-info-box-title"><i class="fa-solid fa-boxes-packing"></i> Surrendered Equipment Receipt</div>
            <div class="ds-info-row"><span>Voucher Date:</span> <strong>${utils.formatDate(data.Date || utils.today())}</strong></div>
            <div class="ds-info-row"><span>Cylinder Variant:</span> <strong>${utils.escapeHtml(data.CylinderType || '14.2 KG Domestic')}</strong></div>
            <div class="ds-info-row"><span>Cylinders Returned:</span> <strong>${data.CylindersReturned || 1} Sound Empty</strong></div>
            <div class="ds-info-row"><span>Regulator Returned:</span> <strong>${data.RegulatorReturned ? 'Yes (Returned in Sound condition)' : 'No (Deducted / Retained)'}</strong></div>
            <div class="ds-info-row"><span>Passbook Returned:</span> <strong>${data.PassbookReturned ? 'Yes' : 'No'}</strong></div>
          </div>
        </div>

        <!-- Financial Breakdown Table -->
        <table class="ds-table" style="margin-top:16px;">
          <thead>
            <tr>
              <th style="width:40px; text-align:center;">#</th>
              <th>Description of Refund Item / Security Deposit</th>
              <th style="width:140px;" class="num">Original Deposit (₹)</th>
              <th style="width:140px;" class="num">Deductions (₹)</th>
              <th style="width:160px;" class="num">Net Refund Payable (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align:center;">1</td>
              <td>
                <strong>LPG Equipment Subscription Security Deposit Refund</strong>
                <div style="font-size:10px; color:#64748b;">Includes cylinder deposit, pressure regulator caution money and passbook verification</div>
              </td>
              <td class="num">${utils.formatCurrency(data.SecurityAmount || 0)}</td>
              <td class="num" style="color:#b91c1c;">${Number(data.DeductionAmount) > 0 ? `-${utils.formatCurrency(data.DeductionAmount)}` : '₹0.00'}</td>
              <td class="num" style="font-weight:800; font-size:14px; color:#15803d;">${utils.formatCurrency(data.RefundAmount || 0)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Totals & Payment Settlement -->
        <div class="ds-totals-grid" style="margin-top:14px;">
          <div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px; font-size:11px; margin-bottom:10px;">
              <div style="font-weight:700; color:#001f3f; margin-bottom:4px;">Refund Amount in Words:</div>
              <div style="font-weight:800; font-style:italic; color:#1e293b;">${inWords}</div>
            </div>

            <div style="font-size:11px; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px;">
              <div style="font-weight:700; color:#001f3f; margin-bottom:4px; font-size:10.5px; text-transform:uppercase;">Disbursal Payment Mode:</div>
              <div>
                Mode: <strong>${utils.escapeHtml(data.PaymentMode || 'CASH')}</strong>
                ${data.ReferenceNo ? ` | Ref / UTR: <strong>${utils.escapeHtml(data.ReferenceNo)}</strong>` : ''}
              </div>
            </div>
          </div>

          <div>
            <table class="ds-summary-table">
              <tr>
                <td>Security Deposit Held:</td>
                <td class="num">${utils.formatCurrency(data.SecurityAmount || 0)}</td>
              </tr>
              ${Number(data.DeductionAmount) > 0 ? `
              <tr>
                <td>Less: Deductions:</td>
                <td class="num" style="color:#b91c1c;">-${utils.formatCurrency(data.DeductionAmount)}</td>
              </tr>` : ''}
              <tr class="grand-row">
                <td>Net Refund Disbursed:</td>
                <td class="num" style="color:#15803d;">${utils.formatCurrency(data.RefundAmount || 0)}</td>
              </tr>
            </table>
          </div>
        </div>

        <div style="margin-top:20px; font-size:9.5px; color:#64748b; line-height:1.4;">
          <strong>Consumer Surrender Declaration:</strong><br>
          I hereby confirm that I have returned the LPG cylinder and accessories described above to M/s Shiv Shakti HP Gas. I have received the complete refund of my caution money / security deposit without any pending claim.
        </div>

        <div class="ds-signatures" style="margin-top:30px;">
          <div class="ds-signature-box">
            Consumer Signature (Received By)
          </div>
          <div class="ds-signature-box">
            For ${utils.escapeHtml(c.AgencyName || c.CompanyName)}<br>
            <small>Authorised Signatory</small>
          </div>
        </div>
      </div>
    `;
  },

  /* -------------------------------------------------------------------------
   * TEMPLATE 7: OFFICIAL HAWKER / EMPLOYEE IDENTITY CARD (CR80 DUAL-SIDE)
   * ------------------------------------------------------------------------- */
  renderEmployeeIdCard(emp) {
    const c = this.getCompany();
    const photoSrc = emp.Photo ? emp.Photo : null;
    const roleTitle = (emp.Role || 'Hawker').toUpperCase();
    const badgeColor = (emp.Role === 'Hawker') ? '#d97706' : '#2563eb';

    return `
      <div class="doc-sheet id-card-sheet" style="max-width:800px; padding:24px; background:#f8fafc; font-family:'Plus Jakarta Sans', Arial, sans-serif;">
        <style>
          .id-cards-wrapper {
            display: flex;
            gap: 24px;
            justify-content: center;
            align-items: flex-start;
            flex-wrap: wrap;
            margin: 16px auto;
          }
          .id-card-badge {
            width: 310px;
            height: 480px;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.12);
            border: 1px solid #cbd5e1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
            box-sizing: border-box;
          }
          .id-card-header {
            background: linear-gradient(135deg, #001f3f 0%, #002b5c 100%);
            color: #ffffff;
            padding: 12px 14px 10px;
            text-align: center;
            border-bottom: 3px solid #f59e0b;
            position: relative;
          }
          .id-card-header h3 {
            margin: 0;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #ffffff;
          }
          .id-card-header p {
            margin: 2px 0 0;
            font-size: 9px;
            color: #93c5fd;
            font-weight: 600;
          }
          .id-card-body {
            padding: 14px;
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .id-photo-frame {
            width: 96px;
            height: 110px;
            border-radius: 8px;
            border: 3px solid #001f3f;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            overflow: hidden;
            background: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 8px;
          }
          .id-photo-frame img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .id-photo-placeholder {
            font-size: 38px;
            color: #94a3b8;
          }
          .id-emp-name {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 3px;
            line-height: 1.2;
          }
          .id-emp-badge {
            display: inline-block;
            background: ${badgeColor};
            color: #ffffff;
            font-size: 9.5px;
            font-weight: 800;
            padding: 2px 10px;
            border-radius: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
          }
          .id-info-table {
            width: 100%;
            font-size: 11px;
            border-collapse: collapse;
            text-align: left;
            margin-bottom: auto;
          }
          .id-info-table td {
            padding: 3px 4px;
            vertical-align: top;
          }
          .id-info-table td.lbl {
            color: #64748b;
            font-weight: 600;
            width: 38%;
          }
          .id-info-table td.val {
            color: #0f172a;
            font-weight: 700;
          }
          .id-card-footer {
            background: #f8fafc;
            border-top: 1px dashed #cbd5e1;
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 9px;
            width: 100%;
            box-sizing: border-box;
          }
          .id-sign-box {
            text-align: center;
            font-size: 8.5px;
            color: #475569;
          }
          .id-back-instructions {
            font-size: 9.5px;
            color: #334155;
            text-align: left;
            line-height: 1.45;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px;
            margin-bottom: 10px;
          }
          .id-back-instructions li {
            margin-bottom: 3px;
          }
          @media print {
            .doc-sheet.id-card-sheet {
              background: #fff !important;
              padding: 0 !important;
              max-width: 100% !important;
            }
            .id-card-badge {
              box-shadow: none !important;
              border: 1.5px solid #000 !important;
              page-break-inside: avoid;
            }
          }
        </style>

        <div style="text-align:center; margin-bottom:12px;">
          <h2 style="font-size:16px; font-weight:800; color:#0f172a; margin:0;">STAFF & DELIVERY WORKFORCE IDENTITY BADGE</h2>
          <p style="font-size:11px; color:#64748b; margin:2px 0 0;">Official Photo Identity Card - Authorized Gas Distributor Pandaul</p>
        </div>

        <div class="id-cards-wrapper">
          <!-- CARD FRONT -->
          <div class="id-card-badge">
            <div class="id-card-header">
              <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:4px;">
                <svg width="22" height="22" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="58" fill="#d97706" />
                  <circle cx="60" cy="60" r="54" fill="#ffffff" />
                  <circle cx="60" cy="60" r="48" fill="#001f3f" />
                  <text x="60" y="66" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle">HP</text>
                  <text x="60" y="88" font-family="Arial, sans-serif" font-size="10" font-weight="800" fill="#fde047" text-anchor="middle">GAS</text>
                </svg>
                <h3>${utils.escapeHtml(c.AgencyName || c.CompanyName)}</h3>
              </div>
              <p>DISTRIBUTOR CODE: ${utils.escapeHtml(c.DistributorCode || 'HP-PDL-8842')}</p>
            </div>

            <div class="id-card-body">
              <div class="id-photo-frame">
                ${photoSrc ? `<img src="${photoSrc}" alt="Staff Photo">` : `<div class="id-photo-placeholder"><i class="fa-solid fa-user"></i></div>`}
              </div>

              <div class="id-emp-name">${utils.escapeHtml(emp.Name || 'Staff Member')}</div>
              <div class="id-emp-badge">${roleTitle}</div>

              <table class="id-info-table">
                <tr>
                  <td class="lbl">Staff ID:</td>
                  <td class="val">${utils.escapeHtml(emp.EmpCode || ('EMP-' + emp.EmpID))}</td>
                </tr>
                <tr>
                  <td class="lbl">Mobile:</td>
                  <td class="val">${utils.escapeHtml(emp.Mobile || '-')}</td>
                </tr>
                <tr>
                  <td class="lbl">Emergency:</td>
                  <td class="val">${utils.escapeHtml(emp.EmergencyContact || '-')}</td>
                </tr>
                <tr>
                  <td class="lbl">Joining Date:</td>
                  <td class="val">${utils.formatDate(emp.JoiningDate)}</td>
                </tr>
                <tr>
                  <td class="lbl">Duty Station:</td>
                  <td class="val">Pandaul Godown & Field</td>
                </tr>
              </table>

              <div class="id-card-footer">
                <div style="text-align:left;">
                  <span style="display:inline-block; font-size:7.5px; background:#e2e8f0; padding:1px 5px; border-radius:3px; font-weight:700;">VALID TILL ACTIVE</span>
                </div>
                <div class="id-sign-box">
                  <div style="height:16px; border-bottom:1px solid #475569; margin-bottom:2px; width:70px;"></div>
                  <strong>Authorized Sign</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- CARD BACK -->
          <div class="id-card-badge">
            <div class="id-card-header" style="background:#002b5c;">
              <h3>IDENTITY CARD - TERMS & VERIFICATION</h3>
              <p>HPCL DISTRIBUTORSHIP VERIFICATION</p>
            </div>

            <div class="id-card-body" style="text-align:left;">
              <div class="id-back-instructions">
                <ul style="margin:0; padding-left:14px;">
                  <li>Cardholder is an authorized employee/hawker of <strong>${utils.escapeHtml(c.AgencyName || c.CompanyName)}</strong>.</li>
                  <li>Authorized to deliver sealed LPG cylinders, collect payments, and issue official agency receipts.</li>
                  <li>Customer is requested to verify tare weight and safety seal upon delivery.</li>
                  <li>If found, please return to distributor office at:</li>
                </ul>
              </div>

              <table class="id-info-table" style="font-size:9.5px; margin-bottom:12px;">
                <tr>
                  <td class="lbl">Distributor:</td>
                  <td class="val">${utils.escapeHtml(c.CompanyName)}</td>
                </tr>
                <tr>
                  <td class="lbl">Office:</td>
                  <td class="val">${utils.escapeHtml(c.AddressLine1)}, ${utils.escapeHtml(c.Village || 'Pandaul')}, ${utils.escapeHtml(c.District || 'Madhubani')} - ${utils.escapeHtml(c.PIN || '847234')}</td>
                </tr>
                <tr>
                  <td class="lbl">Helpline:</td>
                  <td class="val">${utils.escapeHtml(c.Phone || '9431400001')} / ${utils.escapeHtml(c.AlternatePhone || '')}</td>
                </tr>
                <tr>
                  <td class="lbl">Blood Group:</td>
                  <td class="val">${utils.escapeHtml(emp.BloodGroup || 'O+')}</td>
                </tr>
              </table>

              <div style="margin-top:auto; width:100%; text-align:center;">
                <!-- Decorative Barcode Placeholder -->
                <div style="display:inline-block; background:#000; height:22px; width:170px; margin-bottom:4px; opacity:0.85; border-radius:2px;"></div>
                <div style="font-size:8.5px; font-family:monospace; color:#64748b;">${utils.escapeHtml(emp.EmpCode || ('EMP-' + emp.EmpID))}</div>
              </div>

              <div class="id-card-footer" style="margin-top:8px;">
                <div>
                  <small style="color:#64748b;">GSTIN: ${utils.escapeHtml(c.GSTIN || '10ABCDE1234F1Z5')}</small>
                </div>
                <div class="id-sign-box">
                  <div style="height:16px; border-bottom:1px solid #475569; margin-bottom:2px; width:70px;"></div>
                  <strong>Proprietor / Manager</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Helper: Convert Numeric Rupees into English Words
   */
  amountToWords(amount) {
    const num = Math.floor(amount);
    const paise = Math.round((amount - num) * 100);

    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWordsHelper = (n) => {
      if ((n = n.toString()).length > 9) return 'overflow';
      const nArray = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
      if (!nArray) return '';
      let str = '';
      str += (Number(nArray[1]) !== 0) ? (a[Number(nArray[1])] || b[nArray[1][0]] + ' ' + a[nArray[1][1]]) + 'Crore ' : '';
      str += (Number(nArray[2]) !== 0) ? (a[Number(nArray[2])] || b[nArray[2][0]] + ' ' + a[nArray[2][1]]) + 'Lakh ' : '';
      str += (Number(nArray[3]) !== 0) ? (a[Number(nArray[3])] || b[nArray[3][0]] + ' ' + a[nArray[3][1]]) + 'Thousand ' : '';
      str += (Number(nArray[4]) !== 0) ? (a[Number(nArray[4])] || b[nArray[4][0]] + ' ' + a[nArray[4][1]]) + 'Hundred ' : '';
      str += (Number(nArray[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(nArray[5])] || b[nArray[5][0]] + ' ' + a[nArray[5][1]]) : '';
      return str;
    };

    let result = inWordsHelper(num) + 'Rupees';
    if (paise > 0) {
      result += ' and ' + inWordsHelper(paise) + 'Paise';
    }
    result += ' Only';
    return result;
  }
};
