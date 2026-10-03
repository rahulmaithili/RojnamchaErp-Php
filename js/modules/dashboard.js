/**
 * SHIV SHAKTI HP GAS - DASHBOARD MODULE
 * Real-Time KPIs, Chart.js Visualizations & Business Health Metrics
 */

import { api } from '../api.js';
import { utils } from '../utils.js';

let paymentChart = null;
let trendChart = null;

export const dashboardModule = {
  async init() {
    this.renderContainer();
    await this.loadData('today');
  },

  renderContainer() {
    const root = document.getElementById('view-dashboard');
    if (!root) return;

    root.innerHTML = `
      <div class="card" style="margin-bottom: 20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size: 20px; font-weight: 800; color: var(--text-main);">Agency Operations Overview</h2>
            <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">Real-time KPIs calculated dynamically from database transactions</p>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <select id="dash-date-filter" class="form-select" style="min-width: 140px; height: 38px;">
              <option value="today" selected>Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
            </select>
            <button id="dash-refresh-btn" class="btn btn-secondary btn-sm" title="Refresh Dashboard">
              <i class="fa-solid fa-arrows-rotate"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- KPI Grid (AdminLTE 4-Column Responsive Grid) -->
      <div id="dash-kpi-grid" class="lte-kpi-grid" style="margin-bottom: 22px;">
        <!-- Dynamic KPIs rendered here -->
        <div class="card skeleton skeleton-card"></div>
        <div class="card skeleton skeleton-card"></div>
        <div class="card skeleton skeleton-card"></div>
        <div class="card skeleton skeleton-card"></div>
      </div>

      <!-- Analytics Charts Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; margin-bottom: 20px;">
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fa-solid fa-chart-pie" style="color:var(--primary);"></i> Revenue Collection Modes</div>
          </div>
          <div class="card-body">
            <div style="height: 260px; position: relative;">
              <canvas id="dash-payment-chart"></canvas>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fa-solid fa-chart-line" style="color:var(--color-success);"></i> 7-Day Sales Trend</div>
          </div>
          <div class="card-body">
            <div style="height: 260px; position: relative;">
              <canvas id="dash-trend-chart"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Operations Table Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 20px;">
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fa-solid fa-truck-fast" style="color:var(--color-info);"></i> Top Hawker Deliveries</div>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Hawker</th>
                  <th class="text-center">Sold</th>
                  <th class="text-right">Collection</th>
                </tr>
              </thead>
              <tbody id="dash-top-hawkers-body">
                <tr><td colspan="3" class="text-center" style="color:var(--text-muted);">Loading hawkers...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fa-solid fa-clock-rotate-left" style="color:var(--color-warning);"></i> Dues Aging Analysis</div>
          </div>
          <div class="card-body">
            <div id="dash-dues-aging-box" style="display:flex; flex-direction:column; gap:12px;">
              <!-- Rendered dynamically -->
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('dash-date-filter').addEventListener('change', (e) => {
      this.loadData(e.target.value);
    });

    document.getElementById('dash-refresh-btn').addEventListener('click', () => {
      const val = document.getElementById('dash-date-filter').value;
      this.loadData(val);
    });
  },

  async loadData(filter = 'today') {
    const res = await api('getDashboard', { filter }, { loader: false });
    if (!res.ok || !res.data) return;

    const { kpi, charts } = res.data;
    this.renderKPIs(kpi);
    this.renderCharts(charts);
    this.renderHawkers(charts.topHawkers || []);
    this.renderAging(charts.ageing || {});
  },

  renderKPIs(kpi) {
    const grid = document.getElementById('dash-kpi-grid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="small-box bg-navy" onclick="location.hash='#billing'" style="cursor:pointer;" title="Click to view billing">
        <div class="inner">
          <h3 class="num-font">${utils.formatCurrency(kpi.grossBilling)}</h3>
          <p>Gross Billing</p>
        </div>
        <div class="icon"><i class="fa-solid fa-receipt"></i></div>
        <div class="small-box-footer">${kpi.totalBills} bills generated <i class="fa-solid fa-arrow-circle-right"></i></div>
      </div>

      <div class="small-box bg-success" onclick="location.hash='#cashbook'" style="cursor:pointer;" title="Click to view cashbook">
        <div class="inner">
          <h3 class="num-font">${utils.formatCurrency(kpi.netCashInflow)}</h3>
          <p>Cash Drawer Inflow</p>
        </div>
        <div class="icon"><i class="fa-solid fa-money-bill-wave"></i></div>
        <div class="small-box-footer">Counter + Dues Recoveries <i class="fa-solid fa-arrow-circle-right"></i></div>
      </div>

      <div class="small-box bg-info" onclick="location.hash='#billing'" style="cursor:pointer;" title="Click to view digital transactions">
        <div class="inner">
          <h3 class="num-font">${utils.formatCurrency(kpi.digitalSettlements)}</h3>
          <p>Digital / UPI</p>
        </div>
        <div class="icon"><i class="fa-solid fa-qrcode"></i></div>
        <div class="small-box-footer">UPI + HP Pay + Bank <i class="fa-solid fa-arrow-circle-right"></i></div>
      </div>

      <div class="small-box bg-danger" onclick="location.hash='#dues'" style="cursor:pointer;" title="Click to manage dues">
        <div class="inner">
          <h3 class="num-font">${utils.formatCurrency(kpi.outstandingDues)}</h3>
          <p>Outstanding Dues</p>
        </div>
        <div class="icon"><i class="fa-solid fa-hand-holding-dollar"></i></div>
        <div class="small-box-footer">Pending recoveries <i class="fa-solid fa-arrow-circle-right"></i></div>
      </div>

      <div class="small-box bg-purple" onclick="location.hash='#stock'" style="cursor:pointer;" title="Click to check stock">
        <div class="inner">
          <h3 class="num-font">${kpi.cylindersDelivered} <span style="font-size:16px;">Units</span></h3>
          <p>Delivered Today</p>
        </div>
        <div class="icon"><i class="fa-solid fa-gas-pump"></i></div>
        <div class="small-box-footer">Counter + Hawker Trips <i class="fa-solid fa-arrow-circle-right"></i></div>
      </div>

      <div class="small-box ${kpi.isDayClosed ? 'bg-navy' : 'bg-warning'}" onclick="location.hash='#cashbook'" style="cursor:pointer;" title="Click to view day closing">
        <div class="inner">
          <h3 style="font-size:22px;">${kpi.isDayClosed ? '<i class="fa-solid fa-lock"></i> CLOSED' : '<i class="fa-solid fa-lock-open"></i> ACTIVE'}</h3>
          <p>Day Status</p>
        </div>
        <div class="icon"><i class="fa-solid ${kpi.isDayClosed ? 'fa-lock' : 'fa-door-open'}"></i></div>
        <div class="small-box-footer">Closing: ${utils.formatCurrency(kpi.closingCash)} <i class="fa-solid fa-arrow-circle-right"></i></div>
      </div>

      <div class="small-box bg-info" onclick="location.hash='#attendance'" style="cursor:pointer;" title="Click to view attendance">
        <div class="inner">
          <h3 class="num-font">${kpi.employeesPresent} <span style="font-size:16px;">Present</span></h3>
          <p>Staff Attendance</p>
        </div>
        <div class="icon"><i class="fa-solid fa-user-check"></i></div>
        <div class="small-box-footer">Active Duty Staff <i class="fa-solid fa-arrow-circle-right"></i></div>
      </div>

      <div class="small-box ${kpi.lowStockCount > 0 ? 'bg-danger' : 'bg-success'}" onclick="location.hash='#stock'" style="cursor:pointer;" title="Click to inspect cylinder stock">
        <div class="inner">
          <h3 class="num-font">${kpi.lowStockCount}</h3>
          <p>Stock Alerts</p>
        </div>
        <div class="icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div class="small-box-footer">${kpi.lowStockCount > 0 ? 'Replenishment Needed' : 'Inventory Balanced'} <i class="fa-solid fa-arrow-circle-right"></i></div>
      </div>
    `;
  },

  renderCharts(charts) {
    // Payment Breakdown
    const pmCtx = document.getElementById('dash-payment-chart');
    if (pmCtx && charts.paymentModes) {
      if (paymentChart) paymentChart.destroy();
      const labels = Object.keys(charts.paymentModes);
      const data = Object.values(charts.paymentModes);

      paymentChart = new Chart(pmCtx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: ['#10b981', '#0284c7', '#8b5cf6', '#64748b', '#f59e0b'],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
          }
        }
      });
    }

    // 7-Day Trend
    const trCtx = document.getElementById('dash-trend-chart');
    if (trCtx && charts.trend) {
      if (trendChart) trendChart.destroy();
      trendChart = new Chart(trCtx, {
        type: 'line',
        data: {
          labels: charts.trend.labels,
          datasets: [{
            label: 'Sales (₹)',
            data: charts.trend.data,
            borderColor: '#0f3460',
            backgroundColor: 'rgba(15, 52, 96, 0.08)',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
            x: { grid: { display: false } }
          }
        }
      });
    }
  },

  renderHawkers(hawkers) {
    const tbody = document.getElementById('dash-top-hawkers-body');
    if (!tbody) return;

    if (!hawkers.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-center" style="color:var(--text-muted); padding:16px;">No hawker dispatch logs found.</td></tr>';
      return;
    }

    tbody.innerHTML = hawkers.map(h => `
      <tr>
        <td><strong>${utils.escapeHtml(h.Name)}</strong></td>
        <td class="text-center num-font">${h.TotalSold}</td>
        <td class="text-right num-font" style="color:var(--color-success); font-weight:600;">${utils.formatCurrency(h.TotalCollected)}</td>
      </tr>
    `).join('');
  },

  renderAging(aging) {
    const box = document.getElementById('dash-dues-aging-box');
    if (!box) return;

    const entries = Object.entries(aging);
    const total = entries.reduce((sum, [, val]) => sum + val, 0);

    box.innerHTML = entries.map(([label, amount]) => {
      const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
      return `
        <div>
          <div style="display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:4px;">
            <span>${label}</span>
            <strong class="num-font">${utils.formatCurrency(amount)} (${pct}%)</strong>
          </div>
          <div style="height:6px; background:var(--border); border-radius:3px; overflow:hidden;">
            <div style="width:${pct}%; height:100%; background:var(--primary);"></div>
          </div>
        </div>
      `;
    }).join('');
  }
};
