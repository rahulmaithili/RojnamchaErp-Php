/**
 * SHIV SHAKTI HP GAS - USER & ACCESS CONTROL MODULE
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { utils } from '../utils.js';
import { auth } from '../auth.js';

let usersList = [];

export const usersModule = {
  async init() {
    this.renderContainer();
    await this.loadUsers();
  },

  renderContainer() {
    const root = document.getElementById('view-users');
    if (!root) return;

    root.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);">User Accounts & Security Credentials</h2>
            <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Manage operator accounts, salted password security, account lockouts and role assignments</p>
          </div>
          <div>
            <button id="user-create-btn" class="btn btn-primary btn-sm" ${auth.getCurrentUser()?.role !== 'ADMIN' ? 'disabled' : ''}>
              <i class="fa-solid fa-user-plus"></i> Add User Account
            </button>
          </div>
        </div>
      </div>

      <!-- Search Toolbar -->
      <div class="card" style="margin-bottom:16px; padding:14px 20px;">
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
          <input type="text" id="user-search-input" class="form-control" placeholder="Search username, full name or mobile..." style="flex:1; min-width:240px;">
          <select id="user-status-filter" class="form-select" style="width:130px;">
            <option value="active" selected>Active</option>
            <option value="deleted">Trash</option>
          </select>
          <button id="user-refresh-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-arrows-rotate"></i></button>
        </div>
      </div>

      <!-- Users Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Email / Mobile</th>
                <th>Status</th>
                <th>Last Login</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody id="user-table-body">
              <tr><td colspan="7" class="text-center" style="color:var(--text-muted); padding:24px;">Loading users...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('user-create-btn').addEventListener('click', () => this.openUserModal());
    document.getElementById('user-search-input').addEventListener('input', utils.debounce((e) => {
      this.loadUsers(e.target.value);
    }, 300));
    document.getElementById('user-status-filter').addEventListener('change', () => this.loadUsers());
    document.getElementById('user-refresh-btn').addEventListener('click', () => this.loadUsers());
  },

  async loadUsers(search = '') {
    const status = document.getElementById('user-status-filter')?.value || 'active';
    const res = await api('listUsers', { status, search }, { loader: false });
    const tbody = document.getElementById('user-table-body');
    if (!tbody) return;

    if (!res.ok || !res.data || !res.data.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:24px; color:var(--text-muted);">No user accounts found.</td></tr>';
      usersList = [];
      return;
    }

    usersList = res.data;
    tbody.innerHTML = usersList.map(u => `
      <tr style="${u.IsDeleted ? 'opacity:0.6;' : ''}">
        <td><strong>${utils.escapeHtml(u.Username)}</strong></td>
        <td>${utils.escapeHtml(u.FullName)}</td>
        <td><span class="badge badge-info">${u.Role}</span></td>
        <td>${utils.escapeHtml(u.Email || u.Mobile || '-')}</td>
        <td><span class="badge ${u.Status === 'ACTIVE' ? 'badge-success' : 'badge-secondary'}">${u.Status}</span></td>
        <td>${u.LastLoginAt ? utils.formatDate(u.LastLoginAt.substring(0, 10)) : 'Never'}</td>
        <td class="text-center">
          ${auth.getCurrentUser()?.role === 'ADMIN' ? `
          <button class="btn btn-secondary btn-sm edit-user-btn" data-id="${u.UserID}" title="Edit Profile">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-warning btn-sm reset-pwd-btn" data-id="${u.UserID}" data-name="${u.Username}" title="Reset Password">
            <i class="fa-solid fa-key"></i>
          </button>
          ${!u.IsDeleted ? `
          <button class="btn btn-danger btn-sm del-user-btn" data-id="${u.UserID}" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>` : `
          <button class="btn btn-success btn-sm restore-user-btn" data-id="${u.UserID}" title="Restore">
            <i class="fa-solid fa-rotate-left"></i>
          </button>`}
          ` : '-'}
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.edit-user-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const obj = usersList.find(x => x.UserID === id);
        if (obj) this.openUserModal(obj);
      });
    });

    tbody.querySelectorAll('.reset-pwd-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const uname = e.currentTarget.dataset.name;
        const newPass = await ui.prompt(`Reset Password: ${uname}`, 'Enter new password (min 6 chars)...', 'password');
        if (newPass) {
          const res = await api('resetPassword', { UserID: id, NewPassword: newPass });
          if (res.ok) {
            ui.success(`Password for ${uname} reset successfully.`);
          }
        }
      });
    });

    tbody.querySelectorAll('.del-user-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const confirmed = await ui.confirm('Are you sure you want to move this user to trash?', 'Delete User');
        if (confirmed) {
          const res = await api('deleteUser', { UserID: id });
          if (res.ok) {
            ui.success('User deleted.');
            this.loadUsers();
          }
        }
      });
    });

    tbody.querySelectorAll('.restore-user-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const res = await api('restoreUser', { UserID: id });
        if (res.ok) {
          ui.success('User restored.');
          this.loadUsers();
        }
      });
    });
  },

  async openUserModal(user = null) {
    const isEdit = Boolean(user);
    const html = `
      <div style="display:flex; flex-direction:column; gap:6px; text-align:left;">
        <!-- Section 1: User Account & Role -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-user-shield"></i>
            <span>Account Credentials & Security Role</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-at"></i> Username (Login ID) *</label>
              <input type="text" id="um-username" class="form-control" placeholder="e.g. operator1" value="${user ? user.Username : ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-user-gear"></i> Assigned System Role *</label>
              <select id="um-role" class="form-select">
                <option value="ADMIN" ${user && user.Role === 'ADMIN' ? 'selected' : ''}>ADMIN (Full System Access)</option>
                <option value="MANAGER" ${user && user.Role === 'MANAGER' ? 'selected' : ''}>MANAGER (Operations & Inventory)</option>
                <option value="CASHIER" ${user && user.Role === 'CASHIER' ? 'selected' : ''}>CASHIER (Counter POS & Cashbook)</option>
                <option value="DELIVERY" ${user && user.Role === 'DELIVERY' ? 'selected' : ''}>DELIVERY (Dispatches & Returns)</option>
                <option value="VIEWER" ${user && user.Role === 'VIEWER' ? 'selected' : ''}>VIEWER (Read-Only Access)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-circle-check"></i> Account Status</label>
              <select id="um-status" class="form-select">
                <option value="ACTIVE" ${!user || user.Status === 'ACTIVE' ? 'selected' : ''}>ACTIVE (Can Login)</option>
                <option value="INACTIVE" ${user && user.Status === 'INACTIVE' ? 'selected' : ''}>INACTIVE (Login Blocked)</option>
              </select>
            </div>
            ${!isEdit ? `
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-key"></i> Initial Password *</label>
              <input type="password" id="um-password" class="form-control" placeholder="Default: User@12345">
            </div>` : ''}
          </div>
        </div>

        <!-- Section 2: Personal Profile & Contact -->
        <div class="modal-section-card">
          <div class="modal-section-header">
            <i class="fa-solid fa-id-card"></i>
            <span>Personal Profile & Contact</span>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-signature"></i> Operator Full Name *</label>
              <input type="text" id="um-fullname" class="form-control" placeholder="e.g. Anand Kumar" value="${user ? utils.escapeHtml(user.FullName) : ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-phone"></i> Mobile Phone</label>
              <input type="tel" id="um-mobile" class="form-control" placeholder="10-digit mobile" value="${user ? user.Mobile || '' : ''}">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fa-solid fa-envelope"></i> Email Address</label>
              <input type="email" id="um-email" class="form-control" placeholder="operator@shivshaktigas.com" value="${user ? user.Email || '' : ''}">
            </div>
          </div>
        </div>
      </div>
    `;

    const result = await ui.formModal(html, isEdit ? `Edit User: ${user.Username}` : 'Create Operator Account', () => {
      const username = document.getElementById('um-username').value.trim();
      const fullName = document.getElementById('um-fullname').value.trim();
      if (!username || !fullName) {
        Swal.showValidationMessage('Username and Full Name are required!');
        return false;
      }
      return {
        UserID: isEdit ? user.UserID : null,
        Username: username,
        FullName: fullName,
        Role: document.getElementById('um-role').value,
        Status: document.getElementById('um-status').value,
        Email: document.getElementById('um-email').value.trim(),
        Mobile: document.getElementById('um-mobile').value.trim(),
        Password: !isEdit ? (document.getElementById('um-password').value || 'User@12345') : undefined
      };
    });

    if (result) {
      const res = await api('saveUser', result, { loaderMessage: 'Saving user account...' });
      if (res.ok) {
        ui.success('User account saved.');
        this.loadUsers();
      }
    }
  }
};
