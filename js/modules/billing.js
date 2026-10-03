/**
 * SHIV SHAKTI HP GAS - POS BILLING & NEW SV CONNECTION MODULE
 * Multi-Line Cart, Integer-Paise Balance Guard, Live Settlement Validation & Printing
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { utils } from '../utils.js';
import { auth } from '../auth.js';
import { printEngine } from './print.js';

let availableItems = [];
let availableCustomers = [];
let cart = [];

export const billingModule = {
  async init() {
    this.renderContainer();
    await Promise.all([this.loadItems(), this.loadCustomers(), this.loadRecentBills()]);
    this.initCart();
  },

  renderContainer() {
    const root = document.getElementById('view-billing');
    if (!root) return;

    root.innerHTML = `
      <div style="display:grid; grid-template-columns: 1fr 380px; gap:20px;" class="pos-layout-grid">
        <!-- Left: Cart & Product Selector -->
        <div>
          <!-- Customer & Header Card -->
          <div class="card" style="margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
              <h2 style="font-size:18px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-cash-register" style="color:var(--primary);"></i> POS Counter Billing
              </h2>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button id="pos-hawker-sale-btn" class="btn btn-info btn-sm" style="background:#0284c7; border-color:#0284c7; color:#fff;" title="Record Hawker Dispatch Sale & HP Pay Collection">
                  <i class="fa-solid fa-truck-ramp-box"></i> Hawker Dispatch Sale
                </button>
                <button id="pos-refund-sv-btn" class="btn btn-warning btn-sm" style="background:#d97706; border-color:#d97706; color:#fff;" title="Customer Connection Surrender / Security Refund">
                  <i class="fa-solid fa-hand-holding-dollar"></i> Return Security Deposit
                </button>
                <button id="pos-sv-package-btn" class="btn btn-secondary btn-sm">
                  <i class="fa-solid fa-box-open"></i> New SV Package
                </button>
                <button id="pos-quick-cust-btn" class="btn btn-outline btn-sm">
                  <i class="fa-solid fa-user-plus"></i> Add Customer
                </button>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:12px;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Customer Selection</label>
                <select id="pos-customer-select" class="form-select">
                  <option value="">Counter Walk-in Customer</option>
                </select>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Billing Date</label>
                  <input type="date" id="pos-bill-date" class="form-control" value="${utils.today()}">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label">Discount (₹)</label>
                  <input type="number" id="pos-discount" class="form-control" value="0" min="0" step="any">
                </div>
              </div>
            </div>
          </div>

          <!-- Product Line Selector -->
          <div class="card" style="margin-bottom:16px;">
            <div style="display:flex; gap:10px; align-items:flex-end;">
              <div class="form-group" style="flex:1;">
                <label class="form-label">Select Product / Service Refill</label>
                <select id="pos-item-select" class="form-select">
                  <option value="">-- Choose Item --</option>
                </select>
              </div>
              <div class="form-group" style="width:100px;">
                <label class="form-label">Quantity</label>
                <input type="number" id="pos-item-qty" class="form-control" value="1" min="1" step="1">
              </div>
              <button id="pos-add-to-cart-btn" class="btn btn-primary" style="height:40px;">
                <i class="fa-solid fa-cart-plus"></i> Add Item
              </button>
            </div>
          </div>

          <!-- Cart Items Table -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Cart Items (<span id="pos-cart-count">0</span>)</div>
              <button id="pos-clear-cart-btn" class="btn btn-outline btn-sm" style="color:var(--color-danger);">
                <i class="fa-solid fa-trash"></i> Clear Cart
              </button>
            </div>

            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Category</th>
                    <th class="text-center">Qty</th>
                    <th class="text-right">Rate</th>
                    <th class="text-right">Total</th>
                    <th class="text-center" style="width:50px;">Action</th>
                  </tr>
                </thead>
                <tbody id="pos-cart-table-body">
                  <tr><td colspan="6" class="text-center" style="color:var(--text-muted); padding:24px;">Cart is empty. Select an item above to add.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Right: Multi-Tender Settlement & Balance Guard -->
        <div>
          <div class="card" style="position:sticky; top:20px;">
            <div class="card-header">
              <div class="card-title"><i class="fa-solid fa-wallet"></i> Settlement Tender</div>
            </div>

            <div class="card-body" style="padding:18px 20px;">
              <!-- Bill Totals Summary -->
              <div style="background:var(--bg-body); border-radius:var(--radius-md); padding:14px; margin-bottom:16px; border:1px solid var(--border);">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px;">
                  <span>Subtotal:</span>
                  <span id="pos-summary-subtotal" class="num-font">₹0.00</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px;">
                  <span>GST Tax:</span>
                  <span id="pos-summary-tax" class="num-font">₹0.00</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px;">
                  <span>Discount:</span>
                  <span id="pos-summary-discount" class="num-font">₹0.00</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-weight:800; font-size:18px; border-top:1px dashed var(--border); padding-top:8px;">
                  <span>Net Total:</span>
                  <span id="pos-summary-net" class="num-font" style="color:var(--primary);">₹0.00</span>
                </div>
              </div>

              <!-- Payment Inputs -->
              <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
                <div class="form-group">
                  <label class="form-label" style="display:flex; justify-content:space-between;">
                    <span><i class="fa-solid fa-money-bill-1-wave" style="color:var(--color-success);"></i> Cash Tender</span>
                    <a href="#" id="pos-auto-cash-btn" style="font-size:11px; color:var(--primary);">Fill All</a>
                  </label>
                  <input type="number" id="pos-pay-cash" class="form-control num-font" value="0" min="0" step="any">
                </div>

                <div class="form-group">
                  <label class="form-label" style="display:flex; justify-content:space-between;">
                    <span><i class="fa-solid fa-qrcode" style="color:var(--color-info);"></i> UPI / QR</span>
                    <a href="#" id="pos-auto-upi-btn" style="font-size:11px; color:var(--primary);">Fill All</a>
                  </label>
                  <input type="number" id="pos-pay-upi" class="form-control num-font" value="0" min="0" step="any">
                </div>

                <div class="form-group">
                  <label class="form-label">
                    <span><i class="fa-solid fa-gas-pump" style="color:#e94560;"></i> HP Pay</span>
                  </label>
                  <input type="number" id="pos-pay-hppay" class="form-control num-font" value="0" min="0" step="any">
                </div>

                <div class="form-group">
                  <label class="form-label" style="display:flex; justify-content:space-between;">
                    <span><i class="fa-solid fa-hand-holding-dollar" style="color:var(--color-warning);"></i> Credit Dues</span>
                    <span style="font-size:11px; color:var(--text-muted);">Requires Customer</span>
                  </label>
                  <input type="number" id="pos-pay-dues" class="form-control num-font" value="0" min="0" step="any">
                </div>

                <div class="form-group">
                  <label class="form-label">
                    <span><i class="fa-solid fa-building-columns"></i> Bank / Cheque / RTGS</span>
                  </label>
                  <input type="number" id="pos-pay-bank" class="form-control num-font" value="0" min="0" step="any">
                </div>
              </div>

              <!-- Balance Guard Banner -->
              <div id="pos-balance-guard" style="padding:10px; border-radius:var(--radius-sm); font-size:12px; font-weight:700; text-align:center; margin-bottom:16px; background:var(--color-success-bg); color:var(--color-success);">
                Settlement Balanced (₹0.00 difference)
              </div>

              <!-- Generate & Print Action Buttons -->
              <button id="pos-generate-bill-btn" class="btn btn-primary" style="width:100%; height:44px; font-size:15px; margin-bottom:8px;">
                <i class="fa-solid fa-file-invoice-dollar"></i> Generate & Save Bill
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Bills Log Table -->
      <div class="card" style="margin-top:24px;">
        <div class="card-header">
          <div class="card-title"><i class="fa-solid fa-clock-rotate-left"></i> Today's Bills Register</div>
          <div style="display:flex; gap:8px;">
            <input type="text" id="pos-search-bill" class="form-control" placeholder="Search bill no or customer..." style="width:240px; height:34px; font-size:12px;">
            <button id="pos-reload-bills-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-arrows-rotate"></i></button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Date</th>
                <th>Customer</th>
                <th class="text-right">Total Amount</th>
                <th>Payment Modes</th>
                <th class="text-center">Status</th>
                <th class="text-center">Print / Actions</th>
              </tr>
            </thead>
            <tbody id="pos-recent-bills-body">
              <tr><td colspan="7" class="text-center" style="color:var(--text-muted); padding:20px;">Loading bills...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    // Add to cart
    document.getElementById('pos-add-to-cart-btn').addEventListener('click', () => this.addItemToCart());

    // Clear cart
    document.getElementById('pos-clear-cart-btn').addEventListener('click', () => {
      cart = [];
      this.renderCart();
    });

    // Discount & Payments live updates
    const paymentInputs = ['pos-discount', 'pos-pay-cash', 'pos-pay-upi', 'pos-pay-hppay', 'pos-pay-dues', 'pos-pay-bank'];
    paymentInputs.forEach(id => {
      document.getElementById(id).addEventListener('input', () => this.updateTotalsAndGuard());
    });

    // Auto fill buttons
    document.getElementById('pos-auto-cash-btn').addEventListener('click', (e) => {
      e.preventDefault();
      this.autoFillPayment('pos-pay-cash');
    });

    document.getElementById('pos-auto-upi-btn').addEventListener('click', (e) => {
      e.preventDefault();
      this.autoFillPayment('pos-pay-upi');
    });

    // Generate Bill
    document.getElementById('pos-generate-bill-btn').addEventListener('click', () => this.generateBill());

    // Quick Add Customer
    document.getElementById('pos-quick-cust-btn').addEventListener('click', () => this.openQuickCustomerModal());

    // Hawker Dispatch Sale from POS
    document.getElementById('pos-hawker-sale-btn')?.addEventListener('click', () => this.openHawkerDispatchModal());

    // SV Package
    document.getElementById('pos-sv-package-btn').addEventListener('click', () => this.openSVPackageModal());

    // Security Refund (SV Surrender)
    document.getElementById('pos-refund-sv-btn')?.addEventListener('click', () => this.openSecurityRefundModal());

    // Reload Bills
    document.getElementById('pos-reload-bills-btn').addEventListener('click', () => this.loadRecentBills());

    // Filter Bills
    document.getElementById('pos-search-bill').addEventListener('input', utils.debounce((e) => {
      this.loadRecentBills(e.target.value);
    }, 300));
  },

  async loadItems() {
    const res = await api('listItems', { status: 'active' }, { loader: false });
    if (res.ok && res.data) {
      availableItems = res.data;
      const select = document.getElementById('pos-item-select');
      if (select) {
        select.innerHTML = '<option value="">-- Choose Item --</option>' +
          availableItems.map(it => `
            <option value="${it.ItemID}" data-rate="${it.Rate}" data-tax="${it.TaxPercent || 0}" data-cat="${it.Category}" data-cyl="${it.CylinderType || ''}">
              ${utils.escapeHtml(it.ItemName)} (${utils.formatCurrency(it.Rate)})
            </option>
          `).join('');
      }
    }
  },

  async loadCustomers() {
    const res = await api('listCustomers', { status: 'active' }, { loader: false });
    if (res.ok && res.data) {
      availableCustomers = res.data;
      const select = document.getElementById('pos-customer-select');
      if (select) {
        select.innerHTML = '<option value="">Counter Walk-in Customer</option>' +
          availableCustomers.map(c => `
            <option value="${c.CustomerID}" data-name="${utils.escapeHtml(c.Name)}" data-mob="${c.Mobile}" data-cons="${c.ConsumerNo || ''}">
              ${utils.escapeHtml(c.Name)} (${c.Mobile}) ${c.ConsumerNo ? '• #' + c.ConsumerNo : ''}
            </option>
          `).join('');
      }
    }
  },

  initCart() {
    // If empty, auto-add default 14.2 KG Domestic Refill
    if (availableItems.length && !cart.length) {
      const defaultItem = availableItems.find(i => i.CylinderType === '14.2 KG Domestic' && i.Category === 'SALE');
      if (defaultItem) {
        cart.push({
          ItemID: defaultItem.ItemID,
          ItemName: defaultItem.ItemName,
          Category: defaultItem.Category,
          CylinderType: defaultItem.CylinderType,
          Quantity: 1,
          Rate: Number(defaultItem.Rate),
          RatePaise: utils.toPaise(defaultItem.Rate),
          TaxPercent: Number(defaultItem.TaxPercent || 0),
          Total: Number(defaultItem.Rate)
        });
      }
    }
    this.renderCart();
  },

  addItemToCart() {
    const select = document.getElementById('pos-item-select');
    const qtyInput = document.getElementById('pos-item-qty');
    const itemId = parseInt(select.value);
    const qty = parseInt(qtyInput.value) || 1;

    if (!itemId) {
      ui.warn('Please select a product from the list.');
      return;
    }

    const itemObj = availableItems.find(i => i.ItemID === itemId);
    if (!itemObj) return;

    // Check if already in cart
    const existing = cart.find(c => c.ItemID === itemId);
    if (existing) {
      existing.Quantity += qty;
      existing.Total = existing.Quantity * existing.Rate;
    } else {
      cart.push({
        ItemID: itemObj.ItemID,
        ItemName: itemObj.ItemName,
        Category: itemObj.Category,
        CylinderType: itemObj.CylinderType,
        Quantity: qty,
        Rate: Number(itemObj.Rate),
        RatePaise: utils.toPaise(itemObj.Rate),
        TaxPercent: Number(itemObj.TaxPercent || 0),
        Total: qty * Number(itemObj.Rate)
      });
    }

    // Reset selectors
    select.value = '';
    qtyInput.value = '1';
    this.renderCart();
  },

  renderCart() {
    const tbody = document.getElementById('pos-cart-table-body');
    const countEl = document.getElementById('pos-cart-count');
    if (!tbody) return;

    countEl.textContent = cart.length;

    if (!cart.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--text-muted); padding:24px;">Cart is empty. Select an item above to add.</td></tr>';
      this.updateTotalsAndGuard();
      return;
    }

    tbody.innerHTML = cart.map((it, idx) => `
      <tr>
        <td><strong>${utils.escapeHtml(it.ItemName)}</strong></td>
        <td><span class="badge badge-info">${it.Category}</span></td>
        <td class="text-center">
          <input type="number" class="form-control text-center cart-qty-edit" data-idx="${idx}" value="${it.Quantity}" min="1" style="width:60px; height:32px; display:inline-block;">
        </td>
        <td class="text-right num-font">${utils.formatCurrency(it.Rate)}</td>
        <td class="text-right num-font" style="font-weight:700;">${utils.formatCurrency(it.Total)}</td>
        <td class="text-center">
          <button class="btn btn-outline btn-sm cart-remove-item" data-idx="${idx}" style="color:var(--color-danger); border:none;" title="Remove">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </td>
      </tr>
    `).join('');

    // Bind quantity and delete listeners
    tbody.querySelectorAll('.cart-qty-edit').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const val = parseInt(e.target.value) || 1;
        cart[idx].Quantity = Math.max(1, val);
        cart[idx].Total = cart[idx].Quantity * cart[idx].Rate;
        this.renderCart();
      });
    });

    tbody.querySelectorAll('.cart-remove-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx);
        cart.splice(idx, 1);
        this.renderCart();
      });
    });

    this.updateTotalsAndGuard();
  },

  updateTotalsAndGuard() {
    let subtotalPaise = 0;
    let taxPaise = 0;

    cart.forEach(it => {
      const lineTotalPaise = it.RatePaise * it.Quantity;
      const lineTaxPaise = Math.round((lineTotalPaise * it.TaxPercent) / 100);
      subtotalPaise += lineTotalPaise;
      taxPaise += lineTaxPaise;
    });

    const discountAmount = parseFloat(document.getElementById('pos-discount')?.value || 0);
    const discountPaise = utils.toPaise(discountAmount);

    let netBillPaise = subtotalPaise + taxPaise - discountPaise;
    if (netBillPaise < 0) netBillPaise = 0;

    // Update Totals Display
    const subEl = document.getElementById('pos-summary-subtotal');
    const taxEl = document.getElementById('pos-summary-tax');
    const discEl = document.getElementById('pos-summary-discount');
    const netEl = document.getElementById('pos-summary-net');

    if (subEl) subEl.textContent = utils.formatCurrency(subtotalPaise / 100);
    if (taxEl) taxEl.textContent = utils.formatCurrency(taxPaise / 100);
    if (discEl) discEl.textContent = utils.formatCurrency(discountPaise / 100);
    if (netEl) netEl.textContent = utils.formatCurrency(netBillPaise / 100);

    // Read Payment Inputs in Paise
    const cashPaise = utils.toPaise(document.getElementById('pos-pay-cash')?.value || 0);
    const upiPaise = utils.toPaise(document.getElementById('pos-pay-upi')?.value || 0);
    const hpPayPaise = utils.toPaise(document.getElementById('pos-pay-hppay')?.value || 0);
    const duesPaise = utils.toPaise(document.getElementById('pos-pay-dues')?.value || 0);
    const bankPaise = utils.toPaise(document.getElementById('pos-pay-bank')?.value || 0);

    const totalSettlementPaise = cashPaise + upiPaise + hpPayPaise + duesPaise + bankPaise;
    const diffPaise = netBillPaise - totalSettlementPaise;

    const guardEl = document.getElementById('pos-balance-guard');
    if (guardEl) {
      if (diffPaise === 0) {
        guardEl.style.background = 'var(--color-success-bg)';
        guardEl.style.color = 'var(--color-success)';
        guardEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> Settlement Balanced (₹0.00 difference)';
      } else if (diffPaise > 0) {
        guardEl.style.background = 'var(--color-danger-bg)';
        guardEl.style.color = 'var(--color-danger)';
        guardEl.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Underpaid: Enter remaining ${utils.formatCurrency(diffPaise / 100)}`;
      } else {
        guardEl.style.background = 'var(--color-warning-bg)';
        guardEl.style.color = 'var(--color-warning)';
        guardEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Overpaid by ${utils.formatCurrency(Math.abs(diffPaise) / 100)}`;
      }
    }

    return { netBillPaise, totalSettlementPaise, diffPaise };
  },

  autoFillPayment(targetFieldId) {
    const { netBillPaise } = this.updateTotalsAndGuard();
    // Zero out others
    ['pos-pay-cash', 'pos-pay-upi', 'pos-pay-hppay', 'pos-pay-dues', 'pos-pay-bank'].forEach(id => {
      document.getElementById(id).value = '0';
    });
    document.getElementById(targetFieldId).value = (netBillPaise / 100).toFixed(2);
    this.updateTotalsAndGuard();
  },

  async generateBill() {
    if (!cart.length) {
      ui.warn('Cart is empty. Please add items to generate a bill.');
      return;
    }

    const { netBillPaise, totalSettlementPaise, diffPaise } = this.updateTotalsAndGuard();

    // Guard Check
    if (diffPaise !== 0) {
      ui.error(`Settlement mismatch! Net bill total is ${utils.formatCurrency(netBillPaise / 100)} but tenders sum to ${utils.formatCurrency(totalSettlementPaise / 100)}. Difference: ${utils.formatCurrency(Math.abs(diffPaise) / 100)}`);
      return;
    }

    const custSelect = document.getElementById('pos-customer-select');
    const custId = custSelect.value ? parseInt(custSelect.value) : null;
    const selectedOption = custSelect.options[custSelect.selectedIndex];

    const duesAmount = parseFloat(document.getElementById('pos-pay-dues')?.value || 0);
    if (duesAmount > 0 && !custId) {
      ui.warn('Customer selection is mandatory when credit dues payment mode is used.');
      return;
    }

    const payload = {
      BillDate: document.getElementById('pos-bill-date').value,
      CustomerID: custId,
      CustomerName: custId ? selectedOption.dataset.name : 'Counter Walk-in',
      CustomerMobile: custId ? selectedOption.dataset.mob : '',
      ConsumerNo: custId ? selectedOption.dataset.cons : '',
      DiscountAmount: parseFloat(document.getElementById('pos-discount')?.value || 0),
      PaidCash: parseFloat(document.getElementById('pos-pay-cash')?.value || 0),
      PaidUPI: parseFloat(document.getElementById('pos-pay-upi')?.value || 0),
      PaidHPPay: parseFloat(document.getElementById('pos-pay-hppay')?.value || 0),
      PaidDues: duesAmount,
      PaidBank: parseFloat(document.getElementById('pos-pay-bank')?.value || 0),
      items: cart
    };

    const res = await api('addBill', payload, { loaderMessage: 'Generating tax invoice...' });
    if (res.ok && res.data) {
      ui.toast(`Bill ${res.data.BillNumber} saved!`);

      // Ask to print
      const shouldPrint = await ui.confirm(`Bill ${res.data.BillNumber} generated successfully! Would you like to print the receipt now?`, 'Print Bill', 'Print Receipt');
      if (shouldPrint) {
        const fullBillRes = await api('getBill', { BillID: res.data.BillID });
        if (fullBillRes.ok && fullBillRes.data) {
          printEngine.openPreview('pos_invoice', fullBillRes.data, '80mm');
        }
      }

      // Reset Form & Reload Bills
      cart = [];
      this.initCart();
      ['pos-discount', 'pos-pay-cash', 'pos-pay-upi', 'pos-pay-hppay', 'pos-pay-dues', 'pos-pay-bank'].forEach(id => {
        document.getElementById(id).value = '0';
      });
      custSelect.value = '';
      this.loadRecentBills();
    }
  },

  async loadRecentBills(search = '') {
    const res = await api('listBills', { date: utils.today(), search }, { loader: false });
    const tbody = document.getElementById('pos-recent-bills-body');
    if (!tbody) return;

    if (!res.ok || !res.data || !res.data.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color:var(--text-muted); padding:20px;">No bills generated for today yet.</td></tr>';
      return;
    }

    tbody.innerHTML = res.data.map(b => {
      const pmList = [];
      if (Number(b.PaidCash) > 0) pmList.push('Cash');
      if (Number(b.PaidUPI) > 0) pmList.push('UPI');
      if (Number(b.PaidHPPay) > 0) pmList.push('HP Pay');
      if (Number(b.PaidDues) > 0) pmList.push('Dues');
      if (Number(b.PaidBank) > 0) pmList.push('Bank');

      return `
        <tr style="${b.IsCancelled ? 'opacity:0.6; text-decoration:line-through;' : ''}">
          <td><strong>${utils.escapeHtml(b.BillNumber)}</strong></td>
          <td>${utils.formatDate(b.BillDate)}</td>
          <td>${utils.escapeHtml(b.CustomerName)}</td>
          <td class="text-right num-font" style="font-weight:700;">${utils.formatCurrency(b.TotalAmount)}</td>
          <td><span class="badge badge-secondary">${pmList.join(', ') || 'N/A'}</span></td>
          <td class="text-center">
            ${b.IsCancelled ? '<span class="badge badge-danger">CANCELLED</span>' : '<span class="badge badge-success">FINAL</span>'}
          </td>
          <td class="text-center" style="white-space:nowrap;">
            <button class="action-icon view-icon view-bill-action" data-id="${b.BillID}" title="View Details">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="action-icon print-icon print-bill-action" data-id="${b.BillID}" title="Print Receipt">
              <i class="fa-solid fa-print"></i>
            </button>
            ${!b.IsCancelled && auth.can('billing', 'delete') ? `
            <button class="action-icon delete-icon cancel-bill-action" data-id="${b.BillID}" data-no="${b.BillNumber}" title="Cancel Bill">
              <i class="fa-solid fa-ban"></i>
            </button>` : ''}
          </td>
        </tr>
      `;
    }).join('');

    // Bind Eye Button (View Details)
    tbody.querySelectorAll('.view-bill-action').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const bId = parseInt(e.currentTarget.dataset.id);
        const billRes = await api('getBill', { BillID: bId });
        if (billRes.ok && billRes.data) {
          this.viewBillDetails(billRes.data);
        }
      });
    });

    tbody.querySelectorAll('.print-bill-action').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const bId = parseInt(e.currentTarget.dataset.id);
        const billRes = await api('getBill', { BillID: bId });
        if (billRes.ok && billRes.data) {
          printEngine.openPreview('pos_invoice', billRes.data, 'a4_tax');
        }
      });
    });

    tbody.querySelectorAll('.cancel-bill-action').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const bId = parseInt(e.currentTarget.dataset.id);
        const bNo = e.currentTarget.dataset.no;
        const reason = await ui.prompt(`Cancel Bill ${bNo}`, 'Mandatory reason for bill cancellation...');
        if (reason) {
          const res = await api('cancelBill', { BillID: bId, Reason: reason });
          if (res.ok) {
            ui.success(`Bill ${bNo} cancelled and stock/dues effects reversed.`);
            this.loadRecentBills();
          }
        }
      });
    });
  },

  viewBillDetails(bill) {
    const items = bill.items || bill.Items || [];
    const itemRows = items.map((it, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td><strong>${utils.escapeHtml(it.ItemName || 'Item')}</strong></td>
        <td style="text-align:center;">${it.Quantity || 1}</td>
        <td class="num text-right">${utils.formatCurrency(it.Rate || 0)}</td>
        <td class="num text-right font-weight-bold">${utils.formatCurrency(it.Total || 0)}</td>
      </tr>
    `).join('');

    const html = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <!-- Header Info -->
        <div style="background:var(--bg-body); border:1px solid var(--border); border-radius:var(--r-sm); padding:14px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Invoice Information</div>
            <div style="font-size:16px; font-weight:800; color:var(--primary); margin-top:2px;">${utils.escapeHtml(bill.BillNumber)}</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:3px;">Date: <strong>${utils.formatDate(bill.BillDate)}</strong></div>
            <div style="margin-top:6px;">
              ${bill.IsCancelled ? '<span class="badge badge-danger">CANCELLED</span>' : '<span class="badge badge-success">FINAL INVOICE</span>'}
            </div>
          </div>
          <div>
            <div style="font-size:11px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Customer Information</div>
            <div style="font-size:14px; font-weight:700; margin-top:2px;">${utils.escapeHtml(bill.CustomerName || 'Counter Sale')}</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:3px;">Mobile: <strong>${utils.escapeHtml(bill.CustomerMobile || '-')}</strong></div>
            <div style="font-size:12px; color:var(--text-muted);">Consumer No: <strong>${utils.escapeHtml(bill.ConsumerNo || 'COUNTER')}</strong></div>
          </div>
        </div>

        <!-- Line items -->
        <div style="border:1px solid var(--border); border-radius:var(--r-sm); overflow:hidden;">
          <table class="data-table" style="margin:0;">
            <thead>
              <tr>
                <th style="width:40px; text-align:center;">#</th>
                <th>Item Description</th>
                <th style="width:60px; text-align:center;">Qty</th>
                <th style="width:100px;" class="text-right">Rate</th>
                <th style="width:110px;" class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows || '<tr><td colspan="5" class="text-center">No items found.</td></tr>'}
            </tbody>
          </table>
        </div>

        <!-- Totals & Payment Breakdown -->
        <div style="display:grid; grid-template-columns:1.2fr 1fr; gap:16px; align-items:start;">
          <div style="background:var(--bg-body); border:1px solid var(--border); border-radius:var(--r-sm); padding:12px; font-size:12.5px;">
            <div style="font-weight:700; color:var(--primary); margin-bottom:6px; font-size:11px; text-transform:uppercase;">Settlement Details</div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Cash Tendered:</span> <strong class="num-font">${utils.formatCurrency(bill.PaidCash || 0)}</strong></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>UPI / Digital:</span> <strong class="num-font">${utils.formatCurrency(bill.PaidUPI || 0)}</strong></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>HP Pay:</span> <strong class="num-font">${utils.formatCurrency(bill.PaidHPPay || 0)}</strong></div>
            <div style="display:flex; justify-content:space-between; color:#b91c1c;"><span>Credit Dues:</span> <strong class="num-font">${utils.formatCurrency(bill.PaidDues || 0)}</strong></div>
          </div>

          <div style="background:var(--bg-body); border:1px solid var(--border); border-radius:var(--r-sm); padding:12px; font-size:12.5px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Subtotal:</span> <span class="num-font">${utils.formatCurrency(bill.Subtotal || 0)}</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>GST Tax:</span> <span class="num-font">${utils.formatCurrency(bill.TaxAmount || 0)}</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span>Discount:</span> <span class="num-font">-${utils.formatCurrency(bill.DiscountAmount || 0)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:800; border-top:1px dashed var(--border); padding-top:6px; color:var(--primary);">
              <span>Grand Total:</span>
              <span class="num-font">${utils.formatCurrency(bill.TotalAmount || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    ui.viewDetails(`Bill #${bill.BillNumber}`, html, () => {
      printEngine.openPreview('pos_invoice', bill, 'a4_tax');
    });
  },

  async openQuickCustomerModal() {
    const html = `
      <div style="display:flex; flex-direction:column; gap:6px; text-align:left;">
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-user-plus"></i>
            <span>Quick Customer Registration</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-user"></i> Full Legal Name *</label>
              <input type="text" id="qc-name" class="form-control" required placeholder="Full Name">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-phone"></i> 10-Digit Mobile *</label>
              <input type="tel" id="qc-mobile" class="form-control" required placeholder="9876543210" maxlength="10">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-hashtag"></i> Consumer Number</label>
              <input type="text" id="qc-consumer" class="form-control" placeholder="Optional Consumer No">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-location-dot"></i> Village / Area</label>
              <input type="text" id="qc-area" class="form-control" placeholder="Village or Bazar">
            </div>
          </div>
        </div>
      </div>
    `;

    const data = await ui.formModal(html, 'Quick Add Customer', () => {
      const name = document.getElementById('qc-name').value.trim();
      const mobile = document.getElementById('qc-mobile').value.trim();
      if (!name || !mobile) {
        Swal.showValidationMessage('Name and Mobile are required!');
        return false;
      }
      if (!/^\d{10}$/.test(mobile)) {
        Swal.showValidationMessage('Enter a valid 10-digit mobile number!');
        return false;
      }
      return {
        Name: name,
        Mobile: mobile,
        ConsumerNo: document.getElementById('qc-consumer').value.trim(),
        Area: document.getElementById('qc-area').value.trim()
      };
    });

    if (data) {
      const res = await api('saveCustomer', data, { loaderMessage: 'Registering customer...' });
      if (res.ok && res.data) {
        ui.success('Customer registered successfully!');
        await this.loadCustomers();
        document.getElementById('pos-customer-select').value = res.data.CustomerID;
      }
    }
  },

  /**
   * New SV Package Builder with Custom Product Selection & Templates
   */
  async openSVPackageModal() {
    // Standard template presets
    const templates = {
      sbc_14: {
        name: 'Domestic 14.2 KG SBC (Single Bottle Connection)',
        cylType: '14.2 KG Domestic',
        items: [
          { name: '14.2 KG Domestic Cylinder Security Deposit', cat: 'SECURITY_DEPOSIT', qty: 1, rate: 2200 },
          { name: 'LPG Pressure Regulator Security Deposit', cat: 'SECURITY_DEPOSIT', qty: 1, rate: 250 },
          { name: 'Suraksha LPG Hose Pipe (1.5M)', cat: 'EQUIPMENT', qty: 1, rate: 190 },
          { name: 'Domestic Gas Consumer Card (DGCC Blue Book)', cat: 'SERVICE', qty: 1, rate: 59 },
          { name: '14.2 KG Domestic Refill (First Cylinder Gas)', cat: 'CYLINDER', qty: 1, rate: 1042 }
        ]
      },
      dbc_14: {
        name: 'Domestic 14.2 KG DBC (Double Bottle Connection)',
        cylType: '14.2 KG Domestic',
        items: [
          { name: '14.2 KG Domestic Cylinder Security Deposit (2 Nos)', cat: 'SECURITY_DEPOSIT', qty: 2, rate: 2200 },
          { name: 'LPG Pressure Regulator Security Deposit', cat: 'SECURITY_DEPOSIT', qty: 1, rate: 250 },
          { name: 'Suraksha LPG Hose Pipe (1.5M)', cat: 'EQUIPMENT', qty: 1, rate: 190 },
          { name: 'Domestic Gas Consumer Card (DGCC Blue Book)', cat: 'SERVICE', qty: 1, rate: 59 },
          { name: '14.2 KG Domestic Refill (First Cylinder Gas)', cat: 'CYLINDER', qty: 1, rate: 1042 }
        ]
      },
      commercial_19: {
        name: 'Commercial 19 KG Connection Package',
        cylType: '19 KG Commercial',
        items: [
          { name: '19 KG Commercial Cylinder Security Deposit', cat: 'SECURITY_DEPOSIT', qty: 1, rate: 3500 },
          { name: 'Commercial High Pressure / LOT Regulator', cat: 'EQUIPMENT', qty: 1, rate: 450 },
          { name: '19 KG Commercial Refill (First Gas)', cat: 'CYLINDER', qty: 1, rate: 1850 }
        ]
      },
      custom: {
        name: 'Custom Package (Choose Any Catalog Products)',
        cylType: '14.2 KG Domestic',
        items: []
      }
    };

    let selectedPackageItems = [];

    // Helper to load items from template
    const loadTemplateItems = (tmplKey) => {
      const tmpl = templates[tmplKey];
      if (!tmpl) return [];
      const list = [];
      tmpl.items.forEach(ti => {
        // Try matching catalog item
        const match = availableItems.find(ai => ai.ItemName.toLowerCase().includes(ti.name.toLowerCase().slice(0, 10))) || null;
        list.push({
          ItemID: match ? match.ItemID : null,
          ItemName: ti.name,
          Category: ti.cat,
          CylinderType: tmpl.cylType,
          Quantity: ti.qty,
          Rate: ti.rate,
          Total: ti.qty * ti.rate
        });
      });
      return list;
    };

    selectedPackageItems = loadTemplateItems('sbc_14');

    const productDropdownOptions = availableItems.map(it => `
      <option value="${it.ItemID}" data-name="${utils.escapeHtml(it.ItemName)}" data-rate="${it.Rate}" data-cat="${it.Category}" data-cyl="${it.CylinderType || ''}">
        ${utils.escapeHtml(it.ItemName)} (${utils.formatCurrency(it.Rate)}) - [${it.Category}]
      </option>
    `).join('');

    const html = `
      <div style="display:flex; flex-direction:column; gap:10px; text-align:left;">
        <!-- Section 1: Consumer Profile -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-id-card"></i>
            <span>New SV Consumer Profile</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-user"></i> Full Legal Name *</label>
              <input type="text" id="sv-name" class="form-control" placeholder="Consumer Full Name" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-phone"></i> Mobile Number *</label>
              <input type="tel" id="sv-mobile" class="form-control" placeholder="10-digit mobile" maxlength="10" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-location-dot"></i> Delivery Address</label>
              <input type="text" id="sv-addr" class="form-control" placeholder="House, Village, Landmark">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-fingerprint"></i> Aadhaar (Last 4 Digits)</label>
              <input type="text" id="sv-aadhaar" class="form-control" maxlength="4" placeholder="Last 4 digits">
            </div>
          </div>
        </div>

        <!-- Section 2: Package Preset & Custom Item Selector -->
        <div class="modal-section-card">
          <div class="modal-section-header" style="justify-content:space-between; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-boxes-packing"></i>
              <span>SV Package Products Builder</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <label style="font-size:12px; font-weight:700; margin:0;">Template:</label>
              <select id="sv-template-sel" class="form-select form-select-sm" style="font-size:12px; width:220px;">
                <option value="sbc_14" selected>Domestic 14.2 KG SBC (Single)</option>
                <option value="dbc_14">Domestic 14.2 KG DBC (Double)</option>
                <option value="commercial_19">Commercial 19 KG Package</option>
                <option value="custom">-- Custom Package (Blank) --</option>
              </select>
            </div>
          </div>

          <!-- Add Product Row -->
          <div style="display:flex; gap:8px; align-items:flex-end; background:var(--bg-body); padding:10px; border-radius:var(--r-sm); border:1px solid var(--border); margin-bottom:10px;">
            <div style="flex:1;">
              <label class="form-label" style="font-size:11px; margin-bottom:3px;"><i class="fa-solid fa-plus-circle"></i> Add Any Product / Accessory from Catalog:</label>
              <select id="sv-add-prod-select" class="form-select form-select-sm">
                <option value="">-- Choose Catalog Product to Add --</option>
                ${productDropdownOptions}
              </select>
            </div>
            <button type="button" id="sv-add-prod-btn" class="btn btn-secondary btn-sm" style="height:32px;">
              <i class="fa-solid fa-cart-plus"></i> Add Item
            </button>
          </div>

          <!-- Dynamic Products Table -->
          <div style="max-height:380px; overflow-y:auto; overflow-x:hidden; border:1px solid var(--border); border-radius:var(--r-sm); background:var(--bg-surface);">
            <table class="table table-sm" style="margin:0; font-size:12px; width:100%;">
              <thead>
                <tr style="background:var(--bg-body);">
                  <th style="min-width:220px;">Product / Component</th>
                  <th style="width:130px;">Category</th>
                  <th style="width:80px; text-align:center;">Qty</th>
                  <th style="width:110px; text-align:right;">Rate (₹)</th>
                  <th style="width:110px; text-align:right;">Total (₹)</th>
                  <th style="width:45px; text-align:center;"></th>
                </tr>
              </thead>
              <tbody id="sv-pkg-table-body">
              </tbody>
            </table>
          </div>

          <!-- Package Summary Bar -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding:8px 12px; background:var(--bg-body); border-radius:var(--r-sm); border:1px solid var(--border);">
            <span style="font-size:12px; font-weight:700;">Total Package Items: <strong id="sv-pkg-item-count">0</strong></span>
            <span style="font-size:15px; font-weight:800; color:var(--primary);">Grand Total: <strong id="sv-pkg-grand-total">₹0.00</strong></span>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const tbody = document.getElementById('sv-pkg-table-body');
      const countEl = document.getElementById('sv-pkg-item-count');
      const totalEl = document.getElementById('sv-pkg-grand-total');
      const tmplSel = document.getElementById('sv-template-sel');
      const addProdSel = document.getElementById('sv-add-prod-select');
      const addProdBtn = document.getElementById('sv-add-prod-btn');

      const renderTable = () => {
        if (!tbody) return;
        if (!selectedPackageItems.length) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:16px; color:var(--text-muted);">No items in package. Add products above.</td></tr>';
          if (countEl) countEl.textContent = '0';
          if (totalEl) totalEl.textContent = utils.formatCurrency(0);
          return;
        }

        tbody.innerHTML = selectedPackageItems.map((it, idx) => `
          <tr>
            <td><strong>${utils.escapeHtml(it.ItemName)}</strong></td>
            <td><span class="badge badge-info" style="font-size:10px;">${it.Category || 'EQUIPMENT'}</span></td>
            <td class="text-center">
              <input type="number" class="form-control form-control-sm text-center sv-item-qty" data-idx="${idx}" value="${it.Quantity}" min="1" max="10" style="height:26px; font-size:12px; width:55px; margin:auto;">
            </td>
            <td class="text-right">
              <input type="number" class="form-control form-control-sm text-right sv-item-rate" data-idx="${idx}" value="${it.Rate}" min="0" step="any" style="height:26px; font-size:12px; width:85px; margin-left:auto;">
            </td>
            <td class="text-right num-font font-bold" style="vertical-align:middle;">${utils.formatCurrency(it.Total)}</td>
            <td class="text-center" style="vertical-align:middle;">
              <button type="button" class="btn btn-outline btn-sm sv-item-del" data-idx="${idx}" style="color:var(--color-danger); border:none; padding:2px 6px;">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </td>
          </tr>
        `).join('');

        const sumTot = selectedPackageItems.reduce((acc, i) => acc + (Number(i.Total) || 0), 0);
        if (countEl) countEl.textContent = selectedPackageItems.length;
        if (totalEl) totalEl.textContent = utils.formatCurrency(sumTot);

        // Bind input listeners
        tbody.querySelectorAll('.sv-item-qty').forEach(qIn => {
          qIn.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const qty = Math.max(1, parseInt(e.target.value) || 1);
            selectedPackageItems[idx].Quantity = qty;
            selectedPackageItems[idx].Total = qty * selectedPackageItems[idx].Rate;
            renderTable();
          });
        });

        tbody.querySelectorAll('.sv-item-rate').forEach(rIn => {
          rIn.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const rate = Math.max(0, parseFloat(e.target.value) || 0);
            selectedPackageItems[idx].Rate = rate;
            selectedPackageItems[idx].Total = selectedPackageItems[idx].Quantity * rate;
            renderTable();
          });
        });

        tbody.querySelectorAll('.sv-item-del').forEach(delBtn => {
          delBtn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            selectedPackageItems.splice(idx, 1);
            renderTable();
          });
        });
      };

      tmplSel?.addEventListener('change', (e) => {
        selectedPackageItems = loadTemplateItems(e.target.value);
        renderTable();
      });

      addProdBtn?.addEventListener('click', () => {
        const itId = parseInt(addProdSel.value);
        if (!itId) return;
        const itObj = availableItems.find(i => i.ItemID === itId);
        if (itObj) {
          selectedPackageItems.push({
            ItemID: itObj.ItemID,
            ItemName: itObj.ItemName,
            Category: itObj.Category,
            CylinderType: itObj.CylinderType || '14.2 KG Domestic',
            Quantity: 1,
            Rate: Number(itObj.Rate),
            Total: Number(itObj.Rate)
          });
          addProdSel.value = '';
          renderTable();
        }
      });

      renderTable();
    }, 150);

    const resData = await ui.formModal(html, 'Issue New Connection SV Package', () => {
      const name = document.getElementById('sv-name').value.trim();
      const mobile = document.getElementById('sv-mobile').value.trim();
      if (!name || !mobile) {
        Swal.showValidationMessage('Customer Name and Mobile are required!');
        return false;
      }
      if (!selectedPackageItems.length) {
        Swal.showValidationMessage('Select at least one product component in the package!');
        return false;
      }

      return {
        CustomerName: name,
        Mobile: mobile,
        Address: document.getElementById('sv-addr').value.trim(),
        AadhaarLast4: document.getElementById('sv-aadhaar').value.trim(),
        packageItems: selectedPackageItems.map(p => ({
          ItemID: p.ItemID,
          ItemName: p.ItemName,
          Category: p.Category,
          CylinderType: p.CylinderType,
          Quantity: p.Quantity,
          Rate: p.Rate,
          RatePaise: utils.toPaise(p.Rate),
          TaxPercent: 0,
          Total: p.Total
        }))
      };
    }, { maxWidth: '920px' });

    if (resData) {
      const totalPkgAmount = resData.packageItems.reduce((sum, it) => sum + it.Total, 0);
      resData.PaidCash = totalPkgAmount;

      const apiRes = await api('issueNewConnectionPackage', resData, { loaderMessage: 'Registering SV connection & bill...' });
      if (apiRes.ok && apiRes.data) {
        ui.success(`New SV Connection & Bill ${apiRes.data.BillNumber} issued successfully!`);
        await this.loadCustomers();
        this.loadRecentBills();
      }
    }
  },

  /**
   * Return Security Deposit (SV Surrender / Connection Closure) Workflow
   * Includes Custom Amount Input for Vintage/Old SV Presets
   */
  async openSecurityRefundModal(preselectedCustomer = null) {
    const custOptions = availableCustomers.map(c => `
      <option value="${c.CustomerID}" data-name="${utils.escapeHtml(c.Name)}" data-mob="${utils.escapeHtml(c.Mobile)}" data-cons="${utils.escapeHtml(c.ConsumerNo || '')}" ${preselectedCustomer && preselectedCustomer.CustomerID === c.CustomerID ? 'selected' : ''}>
        ${utils.escapeHtml(c.Name)} (${c.Mobile}) ${c.ConsumerNo ? '- ' + c.ConsumerNo : ''}
      </option>
    `).join('');

    const html = `
      <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
        <!-- Section 1: Customer Selection -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-user-check"></i>
            <span>Consumer Identification & Verification</span>
          </div>
          <div class="form-grid">
            <div class="form-group" style="grid-column:1 / -1;">
              <label class="form-label"><i class="fa-solid fa-address-book"></i> Select Registered Consumer</label>
              <select id="sr-cust-select" class="form-select">
                <option value="">-- Manual Walk-in / Not in Dropdown --</option>
                ${custOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-user"></i> Customer Name *</label>
              <input type="text" id="sr-cust-name" class="form-control" value="${preselectedCustomer ? utils.escapeHtml(preselectedCustomer.Name) : ''}" required placeholder="Full Name">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-phone"></i> Mobile Number *</label>
              <input type="tel" id="sr-cust-mobile" class="form-control" value="${preselectedCustomer ? utils.escapeHtml(preselectedCustomer.Mobile) : ''}" required placeholder="10-digit mobile" maxlength="10">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-hashtag"></i> Consumer Number</label>
              <input type="text" id="sr-cust-consumerno" class="form-control" value="${preselectedCustomer ? utils.escapeHtml(preselectedCustomer.ConsumerNo || '') : ''}" placeholder="HPCL Consumer No">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-gas-pump"></i> Cylinder Type</label>
              <select id="sr-cylinder-type" class="form-select">
                <option value="14.2 KG Domestic" selected>14.2 KG Domestic</option>
                <option value="19 KG Commercial">19 KG Commercial</option>
                <option value="5 KG Domestic">5 KG Domestic</option>
                <option value="5 KG Commercial">5 KG Commercial</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Section 2: Equipment Returned (Inventory Check) -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-boxes-stacked"></i>
            <span>Equipments Surrendered / Returned to Godown</span>
          </div>
          <div style="background:var(--bg-surface); padding:10px 14px; border:1px solid var(--border); border-radius:var(--r-sm); display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; cursor:pointer;">
                <input type="checkbox" id="sr-chk-cylinder" checked style="cursor:pointer; width:16px; height:16px;">
                <span>Sound Empty Cylinder Returned (+1 Stock)</span>
              </label>
              <input type="number" id="sr-qty-cylinder" class="form-control" value="1" min="0" max="5" style="width:70px; text-align:center;">
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; cursor:pointer;">
                <input type="checkbox" id="sr-chk-regulator" checked style="cursor:pointer; width:16px; height:16px;">
                <span>LPG Pressure Regulator Returned</span>
              </label>
              <input type="number" id="sr-qty-regulator" class="form-control" value="1" min="0" max="5" style="width:70px; text-align:center;">
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; cursor:pointer;">
                <input type="checkbox" id="sr-chk-passbook" checked style="cursor:pointer; width:16px; height:16px;">
                <span>DGCC Blue Book / SV Subscription Voucher Surrendered</span>
              </label>
              <span style="font-size:11.5px; color:var(--text-muted);">Physical Document</span>
            </div>
          </div>
        </div>

        <!-- Section 3: Old SV Era & Custom Security Deposit Input -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-calculator"></i>
            <span>SV Tariff Era & Custom Deposit Calculation</span>
          </div>
          <div class="form-grid">
            <div class="form-group" style="grid-column:1 / -1;">
              <label class="form-label"><i class="fa-solid fa-clock-rotate-left"></i> Original SV Tariff Era Preset</label>
              <select id="sr-sv-era" class="form-select">
                <option value="CURRENT" selected>Current Modern Tariff (Cylinder ₹2,200 + Regulator ₹250 = ₹2,450)</option>
                <option value="2012_2019">2012 – 2019 Era (Cylinder ₹1,400 + Regulator ₹150 = ₹1,550)</option>
                <option value="2006_2011">2006 – 2011 Era (Cylinder ₹900 + Regulator ₹100 = ₹1,000)</option>
                <option value="PRE_2006">Pre-2006 Vintage Era (Cylinder ₹500 + Regulator ₹50 = ₹550)</option>
                <option value="CUSTOM">Custom / Manual Exact Amount (Type directly from Old SV Paper)</option>
              </select>
              <small style="color:var(--text-muted); font-size:11px;">Select SV issue era or manually edit any amount below.</small>
            </div>

            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-fire"></i> Cylinder Security Held (₹) *</label>
              <input type="number" id="sr-cyl-deposit" class="form-control num-font" value="2200.00" min="0" step="any" required>
            </div>

            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-gauge-high"></i> Regulator Security Held (₹) *</label>
              <input type="number" id="sr-reg-deposit" class="form-control num-font" value="250.00" min="0" step="any" required>
            </div>

            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-coins"></i> Total Security Held (₹)</label>
              <input type="number" id="sr-sec-amount" class="form-control num-font" value="2450.00" min="0" step="any" required>
            </div>

            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-file-invoice-dollar"></i> Deduction / Penalty (₹)</label>
              <input type="number" id="sr-deduction" class="form-control num-font" value="0.00" min="0" step="any">
              <small style="color:var(--text-muted); font-size:11px;">(Missing passbook, lost cap, or damage)</small>
            </div>

            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-hand-holding-dollar"></i> Net Refund Amount (₹)</label>
              <input type="number" id="sr-net-refund" class="form-control num-font" value="2450.00" step="any" style="font-weight:800; color:var(--color-danger); background:#fee2e2;">
            </div>

            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-credit-card"></i> Refund Payment Mode</label>
              <select id="sr-pay-mode" class="form-select">
                <option value="CASH" selected>CASH (Paid from Daily Cashbook Till)</option>
                <option value="UPI">UPI / Digital Transfer</option>
                <option value="BANK">BANK / NEFT / Cheque</option>
              </select>
            </div>

            <div class="form-group" style="grid-column:1 / -1;">
              <label class="form-label"><i class="fa-solid fa-receipt"></i> Reference / Txn / Cheque No (If non-cash)</label>
              <input type="text" id="sr-ref-no" class="form-control" placeholder="UPI Txn ID or Bank Cheque No">
            </div>
            <div class="form-group" style="grid-column:1 / -1;">
              <label class="form-label"><i class="fa-solid fa-note-sticky"></i> Surrender Reason / Notes</label>
              <input type="text" id="sr-reason" class="form-control" value="Old SV Connection Surrender & Security Deposit Return" placeholder="Reason for surrender">
            </div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const custSel = document.getElementById('sr-cust-select');
      const nameIn = document.getElementById('sr-cust-name');
      const mobIn = document.getElementById('sr-cust-mobile');
      const consIn = document.getElementById('sr-cust-consumerno');
      const eraSel = document.getElementById('sr-sv-era');
      const cylDepIn = document.getElementById('sr-cyl-deposit');
      const regDepIn = document.getElementById('sr-reg-deposit');
      const secIn = document.getElementById('sr-sec-amount');
      const dedIn = document.getElementById('sr-deduction');
      const netIn = document.getElementById('sr-net-refund');
      const cylSel = document.getElementById('sr-cylinder-type');

      const calcNet = () => {
        const cyl = parseFloat(cylDepIn?.value) || 0;
        const reg = parseFloat(regDepIn?.value) || 0;
        const totalSec = cyl + reg;
        if (secIn) secIn.value = totalSec.toFixed(2);

        const ded = parseFloat(dedIn?.value) || 0;
        const net = Math.max(0, totalSec - ded);
        if (netIn) netIn.value = net.toFixed(2);
      };

      cylDepIn?.addEventListener('input', calcNet);
      regDepIn?.addEventListener('input', calcNet);
      dedIn?.addEventListener('input', calcNet);

      eraSel?.addEventListener('change', () => {
        const era = eraSel.value;
        if (era === 'CURRENT') {
          if (cylDepIn) cylDepIn.value = '2200.00';
          if (regDepIn) regDepIn.value = '250.00';
        } else if (era === '2012_2019') {
          if (cylDepIn) cylDepIn.value = '1400.00';
          if (regDepIn) regDepIn.value = '150.00';
        } else if (era === '2006_2011') {
          if (cylDepIn) cylDepIn.value = '900.00';
          if (regDepIn) regDepIn.value = '100.00';
        } else if (era === 'PRE_2006') {
          if (cylDepIn) cylDepIn.value = '500.00';
          if (regDepIn) regDepIn.value = '50.00';
        }
        calcNet();
      });

      cylSel?.addEventListener('change', () => {
        if (cylSel.value.includes('19 KG')) {
          if (cylDepIn) cylDepIn.value = '3500.00';
          if (regDepIn) regDepIn.value = '250.00';
        } else if (cylSel.value.includes('5 KG Domestic')) {
          if (cylDepIn) cylDepIn.value = '800.00';
          if (regDepIn) regDepIn.value = '250.00';
        }
        calcNet();
      });

      custSel?.addEventListener('change', () => {
        const val = custSel.value;
        if (!val || !nameIn) return;
        const opt = custSel.options[custSel.selectedIndex];
        nameIn.value = opt.dataset.name || '';
        if (mobIn) mobIn.value = opt.dataset.mob || '';
        if (consIn) consIn.value = opt.dataset.cons || '';
      });
    }, 150);

    const data = await ui.formModal(html, 'Return Security Deposit (SV Surrender)', () => {
      const name = document.getElementById('sr-cust-name').value.trim();
      const mobile = document.getElementById('sr-cust-mobile').value.trim();
      if (!name || !mobile) {
        Swal.showValidationMessage('Customer Name and Mobile are required!');
        return false;
      }
      const cylDep = parseFloat(document.getElementById('sr-cyl-deposit').value) || 0;
      const regDep = parseFloat(document.getElementById('sr-reg-deposit').value) || 0;
      const secAmt = parseFloat(document.getElementById('sr-sec-amount').value) || (cylDep + regDep);
      const dedAmt = parseFloat(document.getElementById('sr-deduction').value) || 0;
      const netAmt = parseFloat(document.getElementById('sr-net-refund').value) || Math.max(0, secAmt - dedAmt);

      if (secAmt <= 0) {
        Swal.showValidationMessage('Security deposit amount must be greater than zero!');
        return false;
      }

      const custSel = document.getElementById('sr-cust-select');
      const custId = custSel.value ? parseInt(custSel.value) : (preselectedCustomer ? preselectedCustomer.CustomerID : null);

      return {
        CustomerID: custId,
        CustomerName: name,
        Mobile: mobile,
        ConsumerNo: document.getElementById('sr-cust-consumerno').value.trim(),
        CylinderType: document.getElementById('sr-cylinder-type').value,
        OriginalSVEra: document.getElementById('sr-sv-era').value,
        CylinderDepositAmount: cylDep,
        RegulatorDepositAmount: regDep,
        CylindersReturned: document.getElementById('sr-chk-cylinder').checked ? (parseInt(document.getElementById('sr-qty-cylinder').value) || 1) : 0,
        RegulatorReturned: document.getElementById('sr-chk-regulator').checked ? (parseInt(document.getElementById('sr-qty-regulator').value) || 1) : 0,
        PassbookReturned: document.getElementById('sr-chk-passbook').checked ? 1 : 0,
        SecurityAmount: secAmt,
        DeductionAmount: dedAmt,
        RefundAmount: netAmt,
        PaymentMode: document.getElementById('sr-pay-mode').value,
        ReferenceNo: document.getElementById('sr-ref-no').value.trim(),
        Reason: document.getElementById('sr-reason').value.trim()
      };
    });

    if (data) {
      const res = await api('refundSecurityDeposit', data, { loaderMessage: 'Processing security refund & inventory update...' });
      if (res.ok && res.data) {
        ui.success(`Security Refund Voucher ${res.data.RefundNumber} processed successfully! Amount: ${utils.formatCurrency(res.data.RefundAmount)}`);
        printEngine.openPreview('security_refund', res.data, 'a4');
        await this.loadCustomers();
      }
    }
  },

  /**
   * Hawker Dispatch Sale Settlement directly from POS Counter Billing
   * Includes HP Pay Consumer Count & Auto Calculation (Rate * Consumer Count)
   */
  async openHawkerDispatchModal() {
    const hawkersRes = await api('listEmployees', { status: 'active' }, { loader: false });
    const hawkerEmployees = hawkersRes.ok && hawkersRes.data ? hawkersRes.data : [];

    const hawkerOptions = hawkerEmployees.map(h => `
      <option value="${h.EmpID}">${utils.escapeHtml(h.Name)} (${h.Role})</option>
    `).join('');

    const defaultRate = 1042.00;

    const html = `
      <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
        <!-- Section 1: Hawker Assignment -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-truck-ramp-box"></i>
            <span>Hawker Dispatch Delivery Settlement</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-user-gear"></i> Delivery Hawker / Driver *</label>
              <select id="hpos-hawker" class="form-select" required>
                <option value="">-- Choose Assigned Hawker --</option>
                ${hawkerOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-calendar-day"></i> Dispatch Date *</label>
              <input type="date" id="hpos-date" class="form-control" value="${document.getElementById('pos-bill-date')?.value || utils.today()}" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-fire"></i> Cylinder Variant</label>
              <select id="hpos-cyl-type" class="form-select">
                <option value="14.2 KG Domestic" selected>14.2 KG Domestic</option>
                <option value="19 KG Commercial">19 KG Commercial</option>
                <option value="5 KG Commercial">5 KG Commercial</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-tag"></i> Cylinder Rate (₹) *</label>
              <input type="number" id="hpos-rate" class="form-control num-font" value="${defaultRate}" min="1" step="any" required>
            </div>
          </div>
        </div>

        <!-- Section 2: Cylinder Movement -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-gas-pump"></i>
            <span>Cylinder Quantities (Loaded vs Returned)</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-arrow-up-from-bracket text-primary"></i> Outward Loaded Full *</label>
              <input type="number" id="hpos-loaded" class="form-control num-font" value="40" min="1" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-rotate-left text-danger"></i> Returned Full Unsold</label>
              <input type="number" id="hpos-ret-full" class="form-control num-font" value="0" min="0">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-arrow-down-to-bracket text-warning"></i> Returned Sound Empty</label>
              <input type="number" id="hpos-ret-empty" class="form-control num-font" value="40" min="0">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-check-double text-success"></i> Net Sold Cylinders</label>
              <input type="number" id="hpos-net-sold" class="form-control num-font" value="40" readonly style="font-weight:800; background:#f0fdf4; color:#15803d;">
            </div>
          </div>
        </div>

        <!-- Section 3: Financial Settlement & HP Pay Calculation -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-wallet"></i>
            <span>Trip Collections (Cash, UPI & HP Pay Formula)</span>
          </div>
          <div class="form-grid">
            <div class="form-group" style="grid-column:1 / -1; background:#e0f2fe; padding:8px 12px; border-radius:4px; border:1px solid #bae6fd;">
              <span style="font-size:12px; font-weight:700; color:#0369a1;">Expected Collection: <strong id="hpos-expected-txt" class="num-font" style="font-size:14px;">₹41,680.00</strong></span>
            </div>

            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-money-bill"></i> Cash Deposited (₹)</label>
              <input type="number" id="hpos-cash" class="form-control num-font" value="0" min="0" step="any">
            </div>

            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-qrcode"></i> UPI Deposited (₹)</label>
              <input type="number" id="hpos-upi" class="form-control num-font" value="0" min="0" step="any">
            </div>

            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-users text-primary"></i> HP Pay Consumer Count (Qty) *</label>
              <input type="number" id="hpos-hppay-count" class="form-control num-font" value="0" min="0" placeholder="Number of Consumers">
              <small style="color:var(--text-muted); font-size:11px;">(Delivery done to HP Pay consumers)</small>
            </div>

            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-mobile-screen-button text-primary"></i> HP Pay Amount [Rate × Count] (₹)</label>
              <input type="number" id="hpos-hppay-amount" class="form-control num-font" value="0" min="0" step="any" style="font-weight:700;">
              <small style="color:var(--text-muted); font-size:11px;">Auto-calculated: Rate × Count</small>
            </div>

            <!-- Dynamic 6-Digit HP Pay Consumer Numbers Grid -->
            <div id="hpos-hppay-consumers-box" style="grid-column:1 / -1; display:none; background:#f0f9ff; border:1px solid #bae6fd; border-radius:6px; padding:12px 14px; margin-top:2px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <label style="font-size:12px; font-weight:700; color:#0369a1; margin:0;">
                  <i class="fa-solid fa-mobile-screen"></i> HP Pay 6-Digit Consumer Numbers (HPCL Official Format):
                </label>
                <span id="hpos-hppay-badge" class="badge" style="background:#0284c7; color:#fff; font-size:11px;">0 / 0 Entered</span>
              </div>
              <div id="hpos-hppay-inputs-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:8px;"></div>
              <div style="font-size:11px; color:#0284c7; margin-top:6px;">
                <i class="fa-solid fa-circle-info"></i> Enter 6-digit HPCL consumer number for each delivery (e.g. <code>204512</code>). These are recorded in the Daily Rojnamcha.
              </div>
            </div>

            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-hand-holding-dollar"></i> Customer Dues Allowed (₹)</label>
              <input type="number" id="hpos-dues" class="form-control num-font" value="0" min="0" step="any">
            </div>

            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-scale-balanced"></i> Settlement Variance</label>
              <input type="text" id="hpos-variance" class="form-control" readonly value="Balanced" style="font-weight:700;">
            </div>

            <div class="form-group" style="grid-column:1 / -1;">
              <label class="form-label"><i class="fa-solid fa-location-dot"></i> Route / Area & Remarks</label>
              <input type="text" id="hpos-remarks" class="form-control" placeholder="Village / Area / Cart Number">
            </div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const rateIn = document.getElementById('hpos-rate');
      const loadedIn = document.getElementById('hpos-loaded');
      const retFullIn = document.getElementById('hpos-ret-full');
      const netSoldIn = document.getElementById('hpos-net-sold');
      const expTxt = document.getElementById('hpos-expected-txt');
      const cashIn = document.getElementById('hpos-cash');
      const upiIn = document.getElementById('hpos-upi');
      const hpCountIn = document.getElementById('hpos-hppay-count');
      const hpAmtIn = document.getElementById('hpos-hppay-amount');
      const duesIn = document.getElementById('hpos-dues');
      const varIn = document.getElementById('hpos-variance');
      const cylSel = document.getElementById('hpos-cyl-type');

      const recalc = () => {
        const rate = parseFloat(rateIn?.value) || 0;
        const loaded = parseInt(loadedIn?.value) || 0;
        const retFull = parseInt(retFullIn?.value) || 0;
        const netSold = Math.max(0, loaded - retFull);
        if (netSoldIn) netSoldIn.value = netSold;

        const expected = netSold * rate;
        if (expTxt) expTxt.textContent = utils.formatCurrency(expected);

        const hpCount = parseInt(hpCountIn?.value) || 0;
        const hpCalc = Math.round(hpCount * rate * 100) / 100;
        if (hpAmtIn && document.activeElement !== hpAmtIn) {
          hpAmtIn.value = hpCalc;
        }

        const cash = parseFloat(cashIn?.value) || 0;
        const upi = parseFloat(upiIn?.value) || 0;
        const hp = parseFloat(hpAmtIn?.value) || 0;
        const dues = parseFloat(duesIn?.value) || 0;

        const totalDep = cash + upi + hp + dues;
        const diff = totalDep - expected;

        if (varIn) {
          if (Math.abs(diff) < 0.01) {
            varIn.value = 'Balanced ✓';
            varIn.style.color = '#15803d';
            varIn.style.background = '#f0fdf4';
          } else if (diff < 0) {
            varIn.value = `Shortage: -${utils.formatCurrency(Math.abs(diff))}`;
            varIn.style.color = '#b91c1c';
            varIn.style.background = '#fef2f2';
          } else {
            varIn.value = `Excess: +${utils.formatCurrency(diff)}`;
            varIn.style.color = '#0284c7';
            varIn.style.background = '#f0f9ff';
          }
        }
      };

      const renderHpConsumerInputs = () => {
        const count = parseInt(hpCountIn?.value) || 0;
        const box = document.getElementById('hpos-hppay-consumers-box');
        const grid = document.getElementById('hpos-hppay-inputs-grid');
        const badge = document.getElementById('hpos-hppay-badge');
        if (!box || !grid) return;

        if (count <= 0) {
          box.style.display = 'none';
          grid.innerHTML = '';
          return;
        }

        box.style.display = 'block';

        // Keep existing values if any
        const existingVals = Array.from(grid.querySelectorAll('.hpos-cno-input')).map(i => i.value.trim());

        let gridHtml = '';
        for (let i = 0; i < count; i++) {
          const val = existingVals[i] || '';
          gridHtml += `
            <div style="background:#fff; border:1px solid #bae6fd; border-radius:4px; padding:6px 8px;">
              <label style="font-size:10.5px; font-weight:700; color:#0369a1; display:block; margin-bottom:2px;">Consumer #${i + 1} (6-Digit):</label>
              <input type="text" class="form-control form-control-sm hpos-cno-input" maxlength="6" pattern="[0-9]{6}" inputmode="numeric" placeholder="e.g. 201452" value="${val}" style="font-family:monospace; font-weight:700; text-align:center; height:28px; font-size:12.5px; letter-spacing:1px;">
            </div>
          `;
        }
        grid.innerHTML = gridHtml;

        const updateBadge = () => {
          const filled = Array.from(grid.querySelectorAll('.hpos-cno-input')).filter(i => i.value.trim().length === 6).length;
          if (badge) {
            badge.textContent = `${filled} / ${count} Verified (6-Dig)`;
            badge.style.background = (filled === count) ? '#16a34a' : '#0284c7';
          }
        };

        grid.querySelectorAll('.hpos-cno-input').forEach(inp => {
          inp.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            updateBadge();
          });
        });
        updateBadge();
      };

      [rateIn, loadedIn, retFullIn, cashIn, upiIn, duesIn].forEach(el => el?.addEventListener('input', recalc));

      hpCountIn?.addEventListener('input', () => {
        const rate = parseFloat(rateIn?.value) || 0;
        const hpCount = parseInt(hpCountIn?.value) || 0;
        if (hpAmtIn) hpAmtIn.value = (hpCount * rate).toFixed(2);
        renderHpConsumerInputs();
        recalc();
      });

      hpAmtIn?.addEventListener('input', recalc);

      cylSel?.addEventListener('change', () => {
        if (cylSel.value.includes('19 KG')) {
          if (rateIn) rateIn.value = '1850.00';
        } else if (cylSel.value.includes('5 KG')) {
          if (rateIn) rateIn.value = '425.00';
        } else {
          if (rateIn) rateIn.value = '1042.00';
        }
        recalc();
      });

      renderHpConsumerInputs();
      recalc();
    }, 150);

    const data = await ui.formModal(html, 'Record Hawker Dispatch Sale (POS Counter)', () => {
      const empId = parseInt(document.getElementById('hpos-hawker').value);
      const loaded = parseInt(document.getElementById('hpos-loaded').value);
      if (!empId) {
        Swal.showValidationMessage('Select a delivery hawker!');
        return false;
      }
      if (!loaded || loaded <= 0) {
        Swal.showValidationMessage('Loaded cylinders quantity must be greater than zero!');
        return false;
      }

      const rate = parseFloat(document.getElementById('hpos-rate').value) || defaultRate;
      const hpCount = parseInt(document.getElementById('hpos-hppay-count').value) || 0;
      const hpAmt = parseFloat(document.getElementById('hpos-hppay-amount').value) || (hpCount * rate);

      const consumerInputs = Array.from(document.querySelectorAll('.hpos-cno-input')).map(i => i.value.trim());
      if (hpCount > 0) {
        const valid6Digits = consumerInputs.filter(c => c.length === 6 && /^\d{6}$/.test(c));
        if (valid6Digits.length < hpCount) {
          Swal.showValidationMessage(`Please enter all ${hpCount} valid 6-digit HPCL consumer numbers (${valid6Digits.length}/${hpCount} entered)!`);
          return false;
        }
      }

      return {
        EmpID: empId,
        Date: document.getElementById('hpos-date').value,
        CylinderType: document.getElementById('hpos-cyl-type').value,
        Rate: rate,
        LoadedQuantity: loaded,
        ReturnedEmpty: parseInt(document.getElementById('hpos-ret-empty').value) || 0,
        ReturnedFull: parseInt(document.getElementById('hpos-ret-full').value) || 0,
        CashDeposited: parseFloat(document.getElementById('hpos-cash').value) || 0,
        UPIDeposited: parseFloat(document.getElementById('hpos-upi').value) || 0,
        HPPayConsumerCount: hpCount,
        HPPayRate: rate,
        HPPayDeposited: hpAmt,
        HPPayConsumerDetails: consumerInputs.join(', '),
        DuesAllowed: parseFloat(document.getElementById('hpos-dues').value) || 0,
        Remarks: document.getElementById('hpos-remarks').value.trim()
      };
    }, { maxWidth: '780px' });

    if (data) {
      const res = await api('saveDispatch', data, { loaderMessage: 'Recording hawker dispatch sale...' });
      if (res.ok && res.data) {
        ui.success(`Hawker dispatch saved successfully! HP Pay Count: ${data.HPPayConsumerCount} (${utils.formatCurrency(data.HPPayDeposited)})`);
        this.loadRecentBills();
      }
    }
  }
};
