/**
 * SHIV SHAKTI HP GAS - RBAC PERMISSION MATRIX MODULE
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { auth } from '../auth.js';

let matrixData = {};
let selectedRole = 'MANAGER';

export const permissionsModule = {
  async init() {
    this.renderContainer();
    await this.loadPermissions();
  },

  renderContainer() {
    const root = document.getElementById('view-permissions');
    if (!root) return;

    root.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);">Role-Based Access Control (RBAC) Permissions</h2>
            <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Configure granular module-level authorization matrix across user roles</p>
          </div>
          <div>
            <button id="perm-save-btn" class="btn btn-primary btn-sm" ${auth.getCurrentUser()?.role !== 'ADMIN' ? 'disabled' : ''}>
              <i class="fa-solid fa-floppy-disk"></i> Save Permissions
            </button>
          </div>
        </div>
      </div>

      <!-- Role Selector Tabs -->
      <div class="card" style="margin-bottom:16px; padding:12px 20px;">
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <span style="font-size:13px; font-weight:700;">Select Role to Configure:</span>
          <div style="display:flex; gap:8px;" id="perm-role-btn-group">
            <button class="btn btn-primary btn-sm perm-role-btn" data-role="MANAGER">MANAGER</button>
            <button class="btn btn-secondary btn-sm perm-role-btn" data-role="CASHIER">CASHIER</button>
            <button class="btn btn-secondary btn-sm perm-role-btn" data-role="DELIVERY">DELIVERY</button>
            <button class="btn btn-secondary btn-sm perm-role-btn" data-role="VIEWER">VIEWER</button>
          </div>
        </div>
      </div>

      <!-- Permission Matrix Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>System Module</th>
                <th class="text-center">Create</th>
                <th class="text-center">Read / View</th>
                <th class="text-center">Update</th>
                <th class="text-center">Delete</th>
                <th class="text-center">Export</th>
                <th class="text-center">Print</th>
                <th class="text-center">Approve</th>
              </tr>
            </thead>
            <tbody id="perm-matrix-table-body">
              <tr><td colspan="8" class="text-center" style="padding:24px; color:var(--text-muted);">Loading permission matrix...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    document.querySelectorAll('.perm-role-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.perm-role-btn').forEach(b => {
          b.className = 'btn btn-secondary btn-sm perm-role-btn';
        });
        e.currentTarget.className = 'btn btn-primary btn-sm perm-role-btn';
        selectedRole = e.currentTarget.dataset.role;
        this.renderRoleMatrix();
      });
    });

    document.getElementById('perm-save-btn').addEventListener('click', () => this.savePermissions());
  },

  async loadPermissions() {
    const res = await api('getPermissions', {}, { loader: false });
    if (!res.ok || !res.data) return;

    matrixData = res.data.matrix || {};
    this.renderRoleMatrix();
  },

  renderRoleMatrix() {
    const tbody = document.getElementById('perm-matrix-table-body');
    if (!tbody) return;

    const rolePerms = matrixData[selectedRole] || {};
    const modules = Object.keys(rolePerms);

    if (!modules.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding:24px;">No modules configured for this role.</td></tr>';
      return;
    }

    tbody.innerHTML = modules.map(mod => {
      const p = rolePerms[mod] || {};
      return `
        <tr>
          <td><strong style="text-transform:capitalize;">${mod}</strong></td>
          <td class="text-center"><input type="checkbox" class="perm-chk" data-mod="${mod}" data-act="create" ${p.create ? 'checked' : ''}></td>
          <td class="text-center"><input type="checkbox" class="perm-chk" data-mod="${mod}" data-act="read" ${p.read ? 'checked' : ''}></td>
          <td class="text-center"><input type="checkbox" class="perm-chk" data-mod="${mod}" data-act="update" ${p.update ? 'checked' : ''}></td>
          <td class="text-center"><input type="checkbox" class="perm-chk" data-mod="${mod}" data-act="delete" ${p.delete ? 'checked' : ''}></td>
          <td class="text-center"><input type="checkbox" class="perm-chk" data-mod="${mod}" data-act="export" ${p.export ? 'checked' : ''}></td>
          <td class="text-center"><input type="checkbox" class="perm-chk" data-mod="${mod}" data-act="print" ${p.print ? 'checked' : ''}></td>
          <td class="text-center"><input type="checkbox" class="perm-chk" data-mod="${mod}" data-act="approve" ${p.approve ? 'checked' : ''}></td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.perm-chk').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const mod = e.target.dataset.mod;
        const act = e.target.dataset.act;
        if (!matrixData[selectedRole]) matrixData[selectedRole] = {};
        if (!matrixData[selectedRole][mod]) matrixData[selectedRole][mod] = {};
        matrixData[selectedRole][mod][act] = e.target.checked ? 1 : 0;
      });
    });
  },

  async savePermissions() {
    const res = await api('savePermissions', {
      RoleName: selectedRole,
      Permissions: matrixData[selectedRole]
    }, { loaderMessage: `Saving permissions for ${selectedRole}...` });

    if (res.ok) {
      ui.success(`Permissions for ${selectedRole} updated successfully.`);
    }
  }
};
