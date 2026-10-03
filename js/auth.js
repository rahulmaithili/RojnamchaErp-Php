/**
 * SHIV SHAKTI HP GAS - CLIENT AUTHENTICATION & SESSION STATE
 */

import { CONFIG } from './config.js';
import { api } from './api.js';
import { ui } from './ui.js';

let currentUser = null;
let currentToken = null;

// Initialize from localStorage
try {
  const storedUser = localStorage.getItem(CONFIG.STORAGE_USER);
  const storedToken = localStorage.getItem(CONFIG.STORAGE_TOKEN);
  if (storedUser && storedToken) {
    currentUser = JSON.parse(storedUser);
    currentToken = storedToken;
  }
} catch (e) {
  console.error('[Auth] Failed reading stored session:', e);
}

export const auth = {
  getCurrentUser() {
    return currentUser;
  },

  getToken() {
    return currentToken;
  },

  isAuthenticated() {
    return Boolean(currentToken && currentUser);
  },

  async login(username, password) {
    const res = await api('login', { username, password }, { loaderMessage: 'Authenticating...' });
    if (res.ok && res.data) {
      currentToken = res.data.token;
      currentUser = res.data.user;

      localStorage.setItem(CONFIG.STORAGE_TOKEN, currentToken);
      localStorage.setItem(CONFIG.STORAGE_USER, JSON.stringify(currentUser));
      return { ok: true, user: currentUser };
    }
    return { ok: false, error: res.error };
  },

  async logout() {
    const confirmed = await ui.confirm('Are you sure you want to log out of Shiv Shakti HP Gas ERP?', 'Confirm Logout');
    if (!confirmed) return false;

    if (currentToken) {
      await api('logout', { token: currentToken }, { silentError: true, loader: false });
    }

    currentUser = null;
    currentToken = null;
    localStorage.removeItem(CONFIG.STORAGE_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_USER);

    window.location.reload();
    return true;
  },

  async changePassword(oldPassword, newPassword) {
    const res = await api('changePassword', { oldPassword, newPassword }, { loaderMessage: 'Updating password...' });
    if (res.ok) {
      if (currentUser) {
        currentUser.forcePasswordChange = false;
        localStorage.setItem(CONFIG.STORAGE_USER, JSON.stringify(currentUser));
      }
      ui.success('Password changed successfully. Please keep your credentials secure.');
      return true;
    }
    return false;
  },

  can(module, action = 'read') {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    // Granular permissions matrix is checked server-side
    // Frontend role shortcuts
    if (currentUser.role === 'MANAGER') {
      return !['users', 'permissions', 'settings', 'company'].includes(module);
    }
    if (currentUser.role === 'CASHIER') {
      return ['dashboard', 'billing', 'customers', 'dues', 'cashbook', 'items', 'reports', 'rojnamcha'].includes(module);
    }
    if (currentUser.role === 'DELIVERY') {
      return ['dashboard', 'dispatch', 'customers', 'attendance'].includes(module);
    }
    if (currentUser.role === 'VIEWER') {
      return action === 'read' || action === 'print' || action === 'export';
    }
    return false;
  }
};
