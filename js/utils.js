/**
 * SHIV SHAKTI HP GAS - CORE UTILITIES & HELPERS
 * Financial formatting, Integer Paise, Dates, CSV Exporter, Base64 Logo Handler & Sanitization
 */

export const utils = {
  /**
   * Currency Formatter in INR ₹ with JetBrains Mono numbers
   */
  formatCurrency(amount) {
    const val = Number(amount) || 0;
    return '₹' + val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  /**
   * Convert Rupee amount to Integer Paise
   */
  toPaise(amount) {
    return Math.round((Number(amount) || 0) * 100);
  },

  /**
   * Convert Integer Paise to Rupee float
   */
  fromPaise(paise) {
    return (Number(paise) || 0) / 100;
  },

  /**
   * Current Date in YYYY-MM-DD
   */
  today() {
    return new Date().toISOString().split('T')[0];
  },

  /**
   * Format Date to standard Indian business format: DD-MM-YYYY
   */
  formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      if (typeof dateStr === 'string' && dateStr.includes(' to ')) {
        const [d1, d2] = dateStr.split(' to ');
        return `${this.formatDate(d1.trim())} to ${this.formatDate(d2.trim())}`;
      }
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  },

  /**
   * Debounce execution
   */
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  },

  /**
   * Export array of objects to CSV download
   */
  exportCSV(filename, columns, data) {
    if (!data || !data.length) {
      alert('No data available to export.');
      return;
    }

    const headers = columns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');
    const rows = data.map(row => {
      return columns.map(col => {
        let val = row[col.key];
        if (col.format) val = col.format(val, row);
        if (val === null || val === undefined) val = '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${this.today()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Convert file to Base64 with MIME and size validation
   */
  async logoToBase64(file, maxSizeMB = 3) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No file selected'));

      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        return reject(new Error('Only PNG, JPG, WEBP, and SVG formats are permitted.'));
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        return reject(new Error(`File size exceeds maximum limit of ${maxSizeMB}MB.`));
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result; // data:image/png;base64,....
        const base64Data = result.split(',')[1];
        resolve({
          base64: base64Data,
          dataUrl: result,
          mimeType: file.type,
          size: file.size
        });
      };
      reader.onerror = () => reject(new Error('Failed to read file contents.'));
      reader.readAsDataURL(file);
    });
  },

  /**
   * Render Company Logo or high-fidelity Initials fallback
   */
  renderCompanyLogo(element, company, fallbackText = 'HP') {
    if (!element) return;
    if (company && company.LogoBase64 && company.LogoMimeType) {
      element.innerHTML = `<img src="data:${company.LogoMimeType};base64,${company.LogoBase64}" alt="${company.CompanyName || 'Logo'}" class="company-logo-img" style="max-width:100%; max-height:100%; object-fit:contain;">`;
    } else {
      const initials = company && company.CompanyName
        ? company.CompanyName.split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase()
        : fallbackText;
      element.innerHTML = `<div class="logo-fallback" style="width:100%; height:100%;">${initials}</div>`;
    }
  }
};
