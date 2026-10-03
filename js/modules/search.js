/**
 * SHIV SHAKTI HP GAS - GLOBAL SEARCH DROPDOWN MODULE
 */

import { api } from '../api.js';
import { utils } from '../utils.js';
import { router } from '../router.js';

export const searchModule = {
  init() {
    const input = document.getElementById('global-search-input');
    const dropdown = document.getElementById('global-search-dropdown');
    if (!input || !dropdown) return;

    input.addEventListener('input', utils.debounce(async (e) => {
      const q = e.target.value.trim();
      if (q.length < 2) {
        dropdown.style.display = 'none';
        return;
      }

      const res = await api('globalSearch', { query: q }, { loader: false, silentError: true });
      if (!res.ok || !res.data || !res.data.length) {
        dropdown.innerHTML = '<div style="padding:12px; font-size:12px; color:var(--text-muted); text-align:center;">No matching records found.</div>';
        dropdown.style.display = 'block';
        return;
      }

      dropdown.innerHTML = res.data.map(item => `
        <div class="search-result-item" data-module="${item.module}" data-id="${item.id}">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${utils.escapeHtml(item.title)}</strong>
            <span class="badge badge-info" style="font-size:10px;">${item.category}</span>
          </div>
          <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">${utils.escapeHtml(item.subtitle)}</div>
        </div>
      `).join('');

      dropdown.style.display = 'block';

      dropdown.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', (ev) => {
          const mod = ev.currentTarget.dataset.module;
          dropdown.style.display = 'none';
          input.value = '';
          router.navigate(mod);
        });
      });
    }, 300));

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }
};
