/**
 * SHIV SHAKTI HP GAS - ADVANCED APPEARANCE & THEME PALETTE SYSTEM
 * 35+ Curated UI Presets, Real-time Dashboard Preview, Custom Color Pickers & Personalization
 */

import { api } from '../api.js';
import { ui } from '../ui.js';
import { auth } from '../auth.js';

export const UI_THEMES = [
  // Section 1 — Classic enterprise
  { id: 'UI 1', name: 'Enterprise Navy', primary: '#1E3A5F', secondary: '#4F6D8C', bg: '#F7F9FC', card: '#FFFFFF', accent: '#5B8DEF', onAccent: '#FFFFFF' },
  { id: 'UI 2', name: 'Graphite & Cyan', primary: '#2C313C', secondary: '#49515F', bg: '#F5F7FA', card: '#FFFFFF', accent: '#00B8D9', onAccent: '#FFFFFF' },
  { id: 'UI 3', name: 'Forest Executive', primary: '#234E52', secondary: '#52796F', bg: '#F8FAF8', card: '#FFFFFF', accent: '#84A98C', onAccent: '#FFFFFF' },
  { id: 'UI 4', name: 'Walnut & Sand', primary: '#4E3D32', secondary: '#7B6855', bg: '#FAF7F2', card: '#FFFFFF', accent: '#C49A6C', onAccent: '#FFFFFF' },
  { id: 'UI 5', name: 'Emerald Corporate', primary: '#0F766E', secondary: '#4CAF94', bg: '#F5FBFA', card: '#FFFFFF', accent: '#22C55E', onAccent: '#FFFFFF' },
  { id: 'UI 6', name: 'Mocha Executive', primary: '#5B4636', secondary: '#8B7355', bg: '#FCFAF7', card: '#FFFFFF', accent: '#D4A373', onAccent: '#FFFFFF' },
  { id: 'UI 7', name: 'Charcoal & Soft Gold', primary: '#2B2F36', secondary: '#4A4F57', bg: '#F7F7F7', card: '#FFFFFF', accent: '#D4AF37', onAccent: '#222222' },

  // Section 2 — Latest SaaS 2026
  { id: 'UIv1', name: 'Zinc & Sky', primary: '#18181B', secondary: '#3F3F46', bg: '#FAFAFA', card: '#FFFFFF', accent: '#0EA5E9', onAccent: '#FFFFFF' },
  { id: 'UIv2', name: 'Ink & Violet', primary: '#0F0F12', secondary: '#27272A', bg: '#FAFAFA', card: '#FFFFFF', accent: '#8B5CF6', onAccent: '#FFFFFF' },
  { id: 'UIv3', name: 'Slate & Rose', primary: '#1E293B', secondary: '#475569', bg: '#F8FAFC', card: '#FFFFFF', accent: '#F43F5E', onAccent: '#FFFFFF' },
  { id: 'UIv4', name: 'Stone & Amber', primary: '#292524', secondary: '#57534E', bg: '#FAFAF9', card: '#FFFFFF', accent: '#F59E0B', onAccent: '#222222' },
  { id: 'UIv5', name: 'Mineral Teal', primary: '#134E4A', secondary: '#5F7A78', bg: '#F4F7F6', card: '#FFFFFF', accent: '#2DD4BF', onAccent: '#134E4A' },
  { id: 'UIv6', name: 'Paper & Copper', primary: '#3F2E24', secondary: '#6B5344', bg: '#FBF8F4', card: '#FFFFFF', accent: '#C47B4A', onAccent: '#FFFFFF' },
  { id: 'UIv7', name: 'Obsidian & Mint', primary: '#111827', secondary: '#374151', bg: '#F9FAFB', card: '#FFFFFF', accent: '#34D399', onAccent: '#111827' },
  { id: 'UIv8', name: 'Cloud & Indigo Soft', primary: '#312E81', secondary: '#4C51BF', bg: '#F5F5FF', card: '#FFFFFF', accent: '#818CF8', onAccent: '#FFFFFF' },

  // Section 3 — 2026 Trends
  { id: 'UIv9', name: 'Aurora Violet', primary: '#1A1025', secondary: '#3B2A52', bg: '#FAF8FC', card: '#FFFFFF', accent: '#A78BFA', onAccent: '#1A1025' },
  { id: 'UIv10', name: 'Midnight Neon', primary: '#0A0A0F', secondary: '#1C1C28', bg: '#F7F7FB', card: '#FFFFFF', accent: '#22D3EE', onAccent: '#0A0A0F' },
  { id: 'UIv11', name: 'Soft Coral SaaS', primary: '#1F2937', secondary: '#4B5563', bg: '#FFF9F7', card: '#FFFFFF', accent: '#FB7185', onAccent: '#FFFFFF' },
  { id: 'UIv12', name: 'Arctic Frost', primary: '#0C4A6E', secondary: '#0369A1', bg: '#F0F9FF', card: '#FFFFFF', accent: '#38BDF8', onAccent: '#0C4A6E' },
  { id: 'UIv13', name: 'Quiet Olive', primary: '#1C1917', secondary: '#44403C', bg: '#FAFAF5', card: '#FFFFFF', accent: '#A3B18A', onAccent: '#1C1917' },
  { id: 'UIv14', name: 'Ink & Lime', primary: '#09090B', secondary: '#27272A', bg: '#FAFAFA', card: '#FFFFFF', accent: '#A3E635', onAccent: '#09090B' },
  { id: 'UIv15', name: 'Rose Quartz', primary: '#3F1D2E', secondary: '#6B3A4F', bg: '#FDF8FA', card: '#FFFFFF', accent: '#E879A9', onAccent: '#FFFFFF' },
  { id: 'UIv16', name: 'Carbon Electric', primary: '#111827', secondary: '#1F2937', bg: '#F8FAFC', card: '#FFFFFF', accent: '#6366F1', onAccent: '#FFFFFF' },
  { id: 'UIv17', name: 'Warm Terracotta', primary: '#292524', secondary: '#57534E', bg: '#FFFBF5', card: '#FFFFFF', accent: '#E07A5F', onAccent: '#FFFFFF' },
  { id: 'UIv18', name: 'Ocean Deep', primary: '#0B1D36', secondary: '#1B3A5F', bg: '#F4F8FC', card: '#FFFFFF', accent: '#14B8A6', onAccent: '#0B1D36' },

  // Section 4 — Designer Picks 2026
  { id: 'UIv19', name: 'Cloud Dancer', primary: '#141414', secondary: '#2B2F36', bg: '#F0EEE9', card: '#FFFFFF', accent: '#BFD3E7', onAccent: '#141414' },
  { id: 'UIv20', name: 'Soft Ember Glow', primary: '#2B1538', secondary: '#5A4B8A', bg: '#EDE7E3', card: '#FFFFFF', accent: '#FF6A3D', onAccent: '#FFFFFF' },
  { id: 'UIv21', name: 'Mood Mode Cyan', primary: '#0B0D10', secondary: '#151A21', bg: '#F4F6F8', card: '#FFFFFF', accent: '#40E0FF', onAccent: '#0B0D10' },
  { id: 'UIv22', name: 'Neon Lime Pop', primary: '#070A0F', secondary: '#1A1F2E', bg: '#F7F8FA', card: '#FFFFFF', accent: '#B6FF3B', onAccent: '#070A0F' },
  { id: 'UIv23', name: 'Laser Magenta', primary: '#0F0A12', secondary: '#2A1A28', bg: '#FDF8FC', card: '#FFFFFF', accent: '#FF3BD4', onAccent: '#FFFFFF' },
  { id: 'UIv24', name: 'Holo Lilac AI', primary: '#07070A', secondary: '#1A1528', bg: '#F3F0FF', card: '#FFFFFF', accent: '#B9A7FF', onAccent: '#07070A' },
  { id: 'UIv25', name: 'Plasma Teal', primary: '#0A1214', secondary: '#163038', bg: '#F0FFFC', card: '#FFFFFF', accent: '#00F5D4', onAccent: '#0A1214' },
  { id: 'UIv26', name: 'Eco Digital', primary: '#101417', secondary: '#316263', bg: '#F5F7F4', card: '#FFFFFF', accent: '#C36A4A', onAccent: '#FFFFFF' },
  { id: 'UIv27', name: 'Warm Mahogany', primary: '#221A18', secondary: '#7A2E2A', bg: '#F5EFE7', card: '#FFFFFF', accent: '#C9A46B', onAccent: '#221A18' },
  { id: 'UIv28', name: 'Fiery Coral Ruby', primary: '#1A0A0C', secondary: '#4A1520', bg: '#FFF8F7', card: '#FFFFFF', accent: '#FF5A4A', onAccent: '#FFFFFF' },
  { id: 'UIv29', name: 'Signal Blue Tech', primary: '#0A0F1A', secondary: '#152040', bg: '#F5F7FF', card: '#FFFFFF', accent: '#3B7BFF', onAccent: '#FFFFFF' },
  { id: 'UIv30', name: 'Fig & Pear', primary: '#2D1F24', secondary: '#5C3D45', bg: '#FBF7F2', card: '#FFFFFF', accent: '#A8C256', onAccent: '#2D1F24' },

  // Section 5 — Modern X / SaaS product picks
  { id: 'UIv31', name: 'Fintech Blurple', primary: '#0A2540', secondary: '#425466', bg: '#F6F9FC', card: '#FFFFFF', accent: '#635BFF', onAccent: '#FFFFFF' },
  { id: 'UIv32', name: 'Violet Flow', primary: '#1C1D22', secondary: '#44454D', bg: '#F7F8F8', card: '#FFFFFF', accent: '#5E6AD2', onAccent: '#FFFFFF' },
  { id: 'UIv33', name: 'Mono Pro', primary: '#000000', secondary: '#525252', bg: '#FAFAFA', card: '#FFFFFF', accent: '#171717', onAccent: '#FFFFFF' },
  { id: 'UIv34', name: 'Warm Analytics', primary: '#7C2D12', secondary: '#9A3412', bg: '#FFF7ED', card: '#FFFFFF', accent: '#F97316', onAccent: '#222222' }
];

let activeTheme = UI_THEMES[0];
let customColorsOpen = false;

export const themeManager = {
  init() {
    this.restoreTheme();
  },

  restoreTheme() {
    const saved = localStorage.getItem('app_theme_palette');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p && p.primary) {
          activeTheme = p;
          this.applyCssVariables(p);
          return;
        }
      } catch (e) {}
    }
    // Default to Enterprise Navy
    activeTheme = UI_THEMES[0];
    this.applyCssVariables(activeTheme);
  },

  darkenHex(hex, percent = 25) {
    if (!hex || typeof hex !== 'string') return hex;
    let clean = hex.replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
    let num = parseInt(clean, 16);
    if (isNaN(num)) return hex;
    let r = Math.max(0, Math.floor((num >> 16) * (1 - percent / 100)));
    let g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - percent / 100)));
    let b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - percent / 100)));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  },

  applyCssVariables(t) {
    if (!t) return;
    const darkerPrimary = this.darkenHex(t.primary, 26);
    const sidebarGrad = `linear-gradient(180deg, ${t.primary} 0%, ${darkerPrimary} 100%)`;

    // Apply to both documentElement and document.body for ultimate specificity
    const targets = [document.documentElement, document.body].filter(Boolean);
    targets.forEach(el => {
      el.style.setProperty('--navy-primary', t.primary);
      el.style.setProperty('--navy-dark', darkerPrimary);
      el.style.setProperty('--navy-light', t.secondary || t.primary);
      el.style.setProperty('--navy-hover', t.secondary || t.primary);
      el.style.setProperty('--navy-accent', t.accent);
      el.style.setProperty('--primary', t.primary);
      el.style.setProperty('--primary-dark', darkerPrimary);
      el.style.setProperty('--primary-hover', t.secondary || t.primary);
      el.style.setProperty('--accent', t.accent);
      el.style.setProperty('--c-secondary', t.secondary || t.primary);
      el.style.setProperty('--c-bg', t.bg || '#F5F7FA');
      el.style.setProperty('--c-card', t.card || '#FFFFFF');
      el.style.setProperty('--c-on-accent', t.onAccent || '#FFFFFF');
      el.style.setProperty('--bg-body', t.bg || '#F5F7FA');
      el.style.setProperty('--bg-surface', t.card || '#FFFFFF');
      el.style.setProperty('--bg-sidebar', sidebarGrad);
      el.style.setProperty('--border-focus', t.accent);
      el.style.setProperty('--color-surface', t.card || '#FFFFFF');
      el.style.setProperty('--color-surface-subtle', t.bg || '#F5F7FA');
      el.style.setProperty('--border-color', '#e2e8f0');
    });

    if (document.body) {
      document.body.setAttribute('data-theme', t.id || 'custom');
    }

    // Direct DOM element sync to ensure instantaneous visual update of sidebar
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) {
      sidebar.style.background = sidebarGrad;
    }

    // Store in localStorage
    localStorage.setItem('app_theme_palette', JSON.stringify(t));
    localStorage.setItem('erp_theme', t.id || 'custom');
  },

  previewTheme(themeObj) {
    activeTheme = themeObj;
    this.applyCssVariables(themeObj);
    this.updatePreviewElements(themeObj);
  },

  async applyAndSaveTheme(themeObj, isPermanentDefault = false) {
    activeTheme = themeObj;
    this.applyCssVariables(themeObj);
    localStorage.setItem('app_theme_palette', JSON.stringify(themeObj));

    if (isPermanentDefault && auth.getCurrentUser()?.role === 'ADMIN') {
      await api('saveSettings', {
        DEFAULT_THEME: themeObj.id || themeObj.name,
        THEME_VARS: JSON.stringify(themeObj)
      }, { loaderMessage: 'Setting default theme system-wide...' });
    }

    ui.success(`Theme "${themeObj.name}" applied successfully!`);
    this.updatePreviewElements(themeObj);
  },

  resetToNavy() {
    const navy = UI_THEMES[0];
    activeTheme = navy;
    this.applyCssVariables(navy);
    localStorage.setItem('app_theme_palette', JSON.stringify(navy));
    ui.success('Reset to Enterprise Navy theme.');
    this.updatePreviewElements(navy);
  },

  updatePreviewElements(t) {
    // Update live badge and text
    const badge = document.getElementById('thm-active-title');
    if (badge) badge.textContent = `${t.name} [${t.id || 'Custom'}]`;

    // Highlight card in grid
    document.querySelectorAll('.thm-card').forEach(el => {
      if (el.dataset.id === t.id) {
        el.classList.add('active');
        if (!el.querySelector('.thm-badge-check')) {
          el.insertAdjacentHTML('afterbegin', `<i class="fa-solid fa-circle-check thm-badge-check"></i><div class="thm-badge-preview">PREVIEW</div>`);
        }
      } else {
        el.classList.remove('active');
        el.querySelectorAll('.thm-badge-check, .thm-badge-preview').forEach(b => b.remove());
      }
    });

    // Update mini dash sidebar & KPIs
    const side = document.getElementById('thm-dash-sidebar');
    if (side) side.style.background = t.primary;

    const kpi1 = document.getElementById('thm-dash-kpi1');
    if (kpi1) kpi1.style.background = t.primary;

    const kpi2 = document.getElementById('thm-dash-kpi2');
    if (kpi2) kpi2.style.background = t.secondary;

    const kpi3 = document.getElementById('thm-dash-kpi3');
    if (kpi3) {
      kpi3.style.background = t.accent;
      kpi3.style.color = t.onAccent || '#FFFFFF';
    }

    const actionBtn = document.getElementById('thm-dash-actbtn');
    if (actionBtn) {
      actionBtn.style.background = t.accent;
      actionBtn.style.color = t.onAccent || '#FFFFFF';
    }

    // Update custom inputs
    const primInput = document.getElementById('thm-cp-primary');
    if (primInput) primInput.value = t.primary;
    const primText = document.getElementById('thm-val-primary');
    if (primText) primText.textContent = t.primary;
    const primBox = document.getElementById('thm-box-primary');
    if (primBox) {
      primBox.style.background = t.primary;
      primBox.style.color = '#FFFFFF';
    }

    const accInput = document.getElementById('thm-cp-accent');
    if (accInput) accInput.value = t.accent;
    const accText = document.getElementById('thm-val-accent');
    if (accText) accText.textContent = t.accent;
    const accBox = document.getElementById('thm-box-accent');
    if (accBox) {
      accBox.style.background = t.accent;
      accBox.style.color = t.onAccent || '#FFFFFF';
    }

    const txtInput = document.getElementById('thm-cp-text');
    if (txtInput) txtInput.value = '#1A1A1A';
    const txtBox = document.getElementById('thm-box-text');
    if (txtBox) {
      txtBox.style.background = '#1A1A1A';
      txtBox.style.color = '#FFFFFF';
    }
  },

  renderAppearanceHtml() {
    const t = activeTheme;

    const paletteCards = UI_THEMES.map(p => {
      const isAct = p.id === t.id;
      return `
        <div class="thm-card ${isAct ? 'active' : ''}" data-id="${p.id}" title="${p.name}">
          ${isAct ? `<i class="fa-solid fa-circle-check thm-badge-check"></i><div class="thm-badge-preview">PREVIEW</div>` : ''}
          <div class="thm-bars">
            <span class="thm-bar" style="background:${p.primary};"></span>
            <span class="thm-bar" style="background:${p.secondary};"></span>
            <span class="thm-bar" style="background:${p.accent};"></span>
          </div>
          <div class="thm-card-info">
            <div class="thm-card-name">${p.name}</div>
            <div class="thm-card-code">${p.id}</div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="card" style="margin-bottom:20px;">
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <div>
            <h3 style="font-size:18px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-palette" style="color:var(--navy-accent);"></i> Appearance
            </h3>
          </div>
        </div>

        <!-- Personalization Notice Banner -->
        <div style="background:#f0f9ff; border:1px solid #bae6fd; color:#0369a1; padding:12px 16px; border-radius:var(--r-md); font-size:13px; display:flex; align-items:center; gap:10px; margin-bottom:20px;">
          <i class="fa-solid fa-circle-info" style="font-size:16px;"></i>
          <span><strong>Note:</strong> Your profile picture and theme colors are personal — changes apply directly to your active browser session.</span>
        </div>

        <!-- Profile Picture Section -->
        <div style="margin-bottom:24px; padding-bottom:20px; border-bottom:1px solid var(--border);">
          <h4 style="font-size:14px; font-weight:700; color:var(--text-main); margin-bottom:10px; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-image"></i> Profile Picture
          </h4>
          <div style="display:flex; align-items:center; gap:16px;">
            <div id="thm-avatar-preview" style="width:54px; height:54px; border-radius:50%; background:var(--navy-primary); color:#fff; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:800; overflow:hidden; border:2px solid var(--navy-accent);">
              <i class="fa-solid fa-user"></i>
            </div>
            <div>
              <input type="file" id="thm-avatar-file-input" accept="image/*" style="display:none;">
              <button id="thm-upload-avatar-btn" class="btn btn-secondary btn-sm" style="margin-bottom:4px;">
                <i class="fa-solid fa-upload"></i> Upload Picture
              </button>
              <div style="font-size:11.5px; color:var(--text-muted);">Upload a new profile picture. Recommended size: 200×200px.</div>
            </div>
          </div>
        </div>

        <!-- Theme Header -->
        <div style="margin-bottom:14px;">
          <h4 style="font-size:14px; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-palette"></i> Theme
          </h4>
          <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">
            Tap a palette to preview it below — nothing changes until you hit Set Now. As admin you can also set the default every visitor sees on first load.
          </p>
        </div>

        <!-- 35 Palettes Grid -->
        <div class="thm-palette-grid">
          ${paletteCards}
        </div>

        <!-- Live Mini Dashboard Preview Card -->
        <div class="thm-mini-dash" style="background:${t.bg || '#f0fffc'}; border:1.5px solid ${t.accent};">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${t.accent};"></span>
              <strong id="thm-active-title" style="font-size:14px; color:${t.primary};">${t.name} [${t.id}]</strong>
              <span class="badge badge-success" style="font-size:10px;">APPLIED</span>
            </div>
            <div style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
              <i class="fa-solid fa-circle-check" style="color:#10b981;"></i> This palette is active on your account
            </div>
          </div>

          <!-- Mini Mockup Shell -->
          <div class="thm-dash-shell">
            <div class="thm-dash-sidebar" id="thm-dash-sidebar" style="background:${t.primary};">
              <i class="fa-solid fa-gauge-high"></i>
              <i class="fa-solid fa-truck"></i>
              <i class="fa-solid fa-users"></i>
              <i class="fa-solid fa-gear"></i>
            </div>
            <div class="thm-dash-main" style="background:${t.bg || '#f8fafc'};">
              <div class="thm-dash-kpis">
                <div class="thm-dash-kpi" id="thm-dash-kpi1" style="background:${t.primary};">
                  <span style="font-size:9.5px; opacity:0.8;">ORDERS</span>
                  <strong class="num-font" style="font-size:16px;">128</strong>
                </div>
                <div class="thm-dash-kpi" id="thm-dash-kpi2" style="background:${t.secondary};">
                  <span style="font-size:9.5px; opacity:0.8;">REVENUE</span>
                  <strong class="num-font" style="font-size:16px;">₹9.4k</strong>
                </div>
                <div class="thm-dash-kpi accent-kpi" id="thm-dash-kpi3" style="background:${t.accent}; color:${t.onAccent || '#FFFFFF'};">
                  <span style="font-size:9.5px; opacity:0.9;">GROWTH</span>
                  <strong class="num-font" style="font-size:16px;">+18%</strong>
                </div>
              </div>
              <div style="display:flex; gap:8px; align-items:center; margin-top:4px;">
                <button class="btn btn-sm" id="thm-dash-actbtn" style="background:${t.accent}; color:${t.onAccent || '#FFFFFF'}; font-size:11px; padding:4px 10px; border-radius:4px; font-weight:700;">
                  Primary Action
                </button>
                <span class="badge badge-info" style="font-size:10px;">Active</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons Bar -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-top:16px;">
            <div style="display:flex; gap:8px;">
              <button id="thm-set-now-btn" class="btn btn-primary btn-sm">
                <i class="fa-solid fa-check"></i> Currently Applied
              </button>
              <button id="thm-set-default-btn" class="btn btn-secondary btn-sm" ${auth.getCurrentUser()?.role !== 'ADMIN' ? 'disabled' : ''}>
                <i class="fa-solid fa-thumbtack"></i> Set as Default
              </button>
            </div>
            <div>
              <button id="thm-toggle-custom-btn" class="btn btn-outline btn-sm">
                <i class="fa-solid fa-chevron-down" id="thm-custom-chevron"></i> Show custom colors
              </button>
            </div>
          </div>

          <!-- Custom Color Pickers Accordion -->
          <div id="thm-custom-section" style="display:none; margin-top:18px; border-top:1px dashed var(--border); padding-top:16px;">
            <div class="form-grid" style="margin-bottom:14px;">
              <div class="form-group">
                <label class="form-label" style="display:flex; justify-content:space-between;">
                  <span>Primary Color</span>
                  <span id="thm-val-primary" class="num-font" style="font-size:11px; color:var(--text-muted);">${t.primary}</span>
                </label>
                <input type="color" id="thm-cp-primary" class="form-control" value="${t.primary}" style="height:38px; padding:2px; cursor:pointer;">
              </div>
              <div class="form-group">
                <label class="form-label" style="display:flex; justify-content:space-between;">
                  <span>Accent Color</span>
                  <span id="thm-val-accent" class="num-font" style="font-size:11px; color:var(--text-muted);">${t.accent}</span>
                </label>
                <input type="color" id="thm-cp-accent" class="form-control" value="${t.accent}" style="height:38px; padding:2px; cursor:pointer;">
              </div>
              <div class="form-group">
                <label class="form-label">
                  <span>Text Color</span>
                </label>
                <input type="color" id="thm-cp-text" class="form-control" value="#1A1A1A" style="height:38px; padding:2px; cursor:pointer;">
              </div>
            </div>

            <!-- Live Color Swatch Cards -->
            <div class="thm-custom-swatches">
              <div class="thm-swatch-box" id="thm-box-primary" style="background:${t.primary}; color:#ffffff;">
                PRIMARY<br><span style="font-size:10px; opacity:0.8;">${t.primary}</span>
              </div>
              <div class="thm-swatch-box" id="thm-box-accent" style="background:${t.accent}; color:${t.onAccent || '#FFFFFF'};">
                ACCENT<br><span style="font-size:10px; opacity:0.8;">${t.accent}</span>
              </div>
              <div class="thm-swatch-box" id="thm-box-text" style="background:#1A1A1A; color:#ffffff;">
                TEXT<br><span style="font-size:10px; opacity:0.8;">#1A1A1A</span>
              </div>
            </div>

            <!-- Custom Color Action Buttons -->
            <div style="display:flex; gap:8px; margin-top:16px;">
              <button id="thm-apply-custom-btn" class="btn btn-success btn-sm">
                <i class="fa-solid fa-check"></i> Apply Colors
              </button>
              <button id="thm-reset-navy-btn" class="btn btn-secondary btn-sm">
                <i class="fa-solid fa-rotate-left"></i> Reset to Navy
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  bindAppearanceEvents() {
    // 1. Palette Card click listener
    document.querySelectorAll('.thm-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const themeObj = UI_THEMES.find(u => u.id === id);
        if (themeObj) {
          this.previewTheme(themeObj);
        }
      });
    });

    // 2. Set as Default & Currently Applied Buttons
    document.getElementById('thm-set-now-btn')?.addEventListener('click', () => {
      this.applyAndSaveTheme(activeTheme, false);
    });

    document.getElementById('thm-set-default-btn')?.addEventListener('click', () => {
      this.applyAndSaveTheme(activeTheme, true);
    });

    // 3. Custom color accordion toggle
    const toggleBtn = document.getElementById('thm-toggle-custom-btn');
    const chevron = document.getElementById('thm-custom-chevron');
    const customSec = document.getElementById('thm-custom-section');
    toggleBtn?.addEventListener('click', () => {
      customColorsOpen = !customColorsOpen;
      if (customSec) customSec.style.display = customColorsOpen ? 'block' : 'none';
      if (chevron) {
        chevron.className = customColorsOpen ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
      }
      toggleBtn.innerHTML = customColorsOpen
        ? '<i class="fa-solid fa-chevron-up"></i> Hide custom colors'
        : '<i class="fa-solid fa-chevron-down"></i> Show custom colors';
    });

    // 4. Color Pickers input listener (live update)
    const cpPrim = document.getElementById('thm-cp-primary');
    const cpAcc = document.getElementById('thm-cp-accent');
    const cpTxt = document.getElementById('thm-cp-text');

    const updateCustomInputs = () => {
      const primVal = cpPrim?.value || activeTheme.primary;
      const accVal = cpAcc?.value || activeTheme.accent;
      const customTheme = {
        id: 'Custom',
        name: 'Custom Palette',
        primary: primVal,
        secondary: primVal,
        accent: accVal,
        bg: '#F5F7FA',
        card: '#FFFFFF',
        onAccent: '#FFFFFF'
      };
      this.previewTheme(customTheme);
    };

    cpPrim?.addEventListener('input', updateCustomInputs);
    cpAcc?.addEventListener('input', updateCustomInputs);
    cpTxt?.addEventListener('input', updateCustomInputs);

    // 5. Apply custom colors button
    document.getElementById('thm-apply-custom-btn')?.addEventListener('click', () => {
      const customTheme = {
        id: 'Custom',
        name: 'Custom Palette',
        primary: cpPrim?.value || '#1E3A5F',
        secondary: cpPrim?.value || '#4F6D8C',
        accent: cpAcc?.value || '#5B8DEF',
        bg: '#F5F7FA',
        card: '#FFFFFF',
        onAccent: '#FFFFFF'
      };
      this.applyAndSaveTheme(customTheme, false);
    });

    // 6. Reset to Navy
    document.getElementById('thm-reset-navy-btn')?.addEventListener('click', () => {
      this.resetToNavy();
    });

    // 7. Profile Picture Upload
    const avatarInput = document.getElementById('thm-avatar-file-input');
    const avatarBtn = document.getElementById('thm-upload-avatar-btn');
    avatarBtn?.addEventListener('click', () => avatarInput?.click());

    avatarInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (re) => {
        const base64 = re.target.result;
        localStorage.setItem('app_user_avatar', base64);
        const prev = document.getElementById('thm-avatar-preview');
        if (prev) {
          prev.innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover;">`;
        }
        // Also update header avatar if present
        const hdrAvatar = document.querySelector('.user-avatar');
        if (hdrAvatar) {
          hdrAvatar.innerHTML = `<img src="${base64}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        }
        ui.success('Profile avatar updated successfully!');
      };
      reader.readAsDataURL(file);
    });

    // Load saved avatar on mount
    const savedAvatar = localStorage.getItem('app_user_avatar');
    if (savedAvatar) {
      const prev = document.getElementById('thm-avatar-preview');
      if (prev) {
        prev.innerHTML = `<img src="${savedAvatar}" style="width:100%; height:100%; object-fit:cover;">`;
      }
    }
  }
};
