/**
 * SHIV SHAKTI HP GAS - SPA CLIENT ROUTER
 */

import { auth } from './auth.js';
import { ui } from './ui.js';

// Module dynamically loaded on demand
import { dashboardModule } from './modules/dashboard.js';
import { companyModule } from './modules/company.js';
import { billingModule } from './modules/billing.js';
import { customerModule } from './modules/customers.js';
import { duesModule } from './modules/dues.js';
import { dispatchModule } from './modules/dispatch.js';
import { stockModule } from './modules/stock.js';
import { cashbookModule } from './modules/cashbook.js';
import { employeeModule } from './modules/employees.js';
import { attendanceModule } from './modules/attendance.js';
import { salaryModule } from './modules/salary.js';
import { vendorModule } from './modules/vendors.js';
import { itemsModule } from './modules/items.js';
import { reportsModule } from './modules/reports.js';
import { rojnamchaModule } from './modules/rojnamcha.js';
import { reconciliationModule } from './modules/reconciliation.js';
import { usersModule } from './modules/users.js';
import { permissionsModule } from './modules/permissions.js';
import { settingsModule } from './modules/settings.js';
import { auditModule } from './modules/audit.js';
import { archiveModule } from './modules/archive.js';

const moduleRegistry = {
  dashboard: dashboardModule,
  company: companyModule,
  billing: billingModule,
  customers: customerModule,
  dues: duesModule,
  dispatch: dispatchModule,
  stock: stockModule,
  cashbook: cashbookModule,
  employees: employeeModule,
  attendance: attendanceModule,
  salary: salaryModule,
  vendors: vendorModule,
  items: itemsModule,
  reports: reportsModule,
  rojnamcha: rojnamchaModule,
  reconciliation: reconciliationModule,
  users: usersModule,
  permissions: permissionsModule,
  settings: settingsModule,
  audit: auditModule,
  archive: archiveModule
};

let currentRoute = 'dashboard';

export const router = {
  init() {
    // Bind all sidebar nav links
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const route = e.currentTarget.dataset.route;
        if (route) this.navigate(route);
      });
    });

    // Bind mobile bottom nav
    document.querySelectorAll('.mobile-nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const route = e.currentTarget.dataset.route;
        if (route) this.navigate(route);
      });
    });
  },

  navigate(route) {
    if (!auth.isAuthenticated()) return;

    if (!moduleRegistry[route]) {
      console.warn(`[Router] Unknown route: ${route}`);
      route = 'dashboard';
    }

    // Check RBAC permission
    if (!auth.can(route, 'read')) {
      ui.error(`You do not have authorization to access the ${route.toUpperCase()} module.`, 'Access Denied');
      return;
    }

    currentRoute = route;

    // Toggle view sections
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.style.display = 'none';
    });

    const targetSec = document.getElementById(`view-${route}`);
    if (targetSec) {
      targetSec.style.display = 'block';
    }

    // Update active state in sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.route === route) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update active state in mobile nav
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      if (item.dataset.route === route) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Close mobile drawer if open
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.remove('open');

    // Initialize the module
    if (moduleRegistry[route] && typeof moduleRegistry[route].init === 'function') {
      moduleRegistry[route].init();
    }
  },

  getCurrentRoute() {
    return currentRoute;
  }
};
