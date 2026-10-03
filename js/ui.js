/**
 * SHIV SHAKTI HP GAS - UNIFIED SWEETALERT2 UI MODULE
 * Strictly standardizes all dialogs, alerts, toasts, confirmations, loaders & detail views
 */

export const ui = {
  success(message, title = 'Success') {
    return Swal.fire({
      icon: 'success',
      title,
      text: message,
      confirmButtonColor: '#001f3f',
      timer: 2500,
      timerProgressBar: true,
      customClass: {
        popup: 'cool-swal-popup'
      }
    });
  },

  error(message, title = 'Error') {
    return Swal.fire({
      icon: 'error',
      title,
      text: message,
      confirmButtonColor: '#ef4444',
      customClass: {
        popup: 'cool-swal-popup'
      }
    });
  },

  warn(message, title = 'Warning') {
    return Swal.fire({
      icon: 'warning',
      title,
      text: message,
      confirmButtonColor: '#f59e0b',
      customClass: {
        popup: 'cool-swal-popup'
      }
    });
  },

  toast(message, icon = 'success') {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });
    return Toast.fire({ icon, title: message });
  },

  async confirm(message, title = 'Confirm Action', confirmBtnText = 'Yes, Proceed') {
    const res = await Swal.fire({
      title,
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#001f3f',
      cancelButtonColor: '#64748b',
      confirmButtonText: confirmBtnText,
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'cool-swal-popup'
      }
    });
    return res.isConfirmed;
  },

  async prompt(title, inputPlaceholder = '', inputType = 'text', inputValidator = null) {
    const res = await Swal.fire({
      title,
      input: inputType,
      inputPlaceholder,
      showCancelButton: true,
      confirmButtonColor: '#001f3f',
      cancelButtonColor: '#64748b',
      inputValidator: inputValidator || ((value) => {
        if (!value || !value.trim()) return 'This field cannot be empty!';
      }),
      customClass: {
        popup: 'cool-swal-popup'
      }
    });
    return res.isConfirmed ? res.value.trim() : null;
  },

  loading(message = 'Processing request...') {
    // Show top load bar
    this.startLoadBar();
    Swal.fire({
      title: message,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  },

  close() {
    this.stopLoadBar();
    Swal.close();
  },

  startLoadBar() {
    const bar = document.getElementById('top-loadbar');
    if (bar) bar.style.display = 'block';
  },

  stopLoadBar() {
    const bar = document.getElementById('top-loadbar');
    if (bar) bar.style.display = 'none';
  },

  formModal(htmlContent, title = 'Enter Details', onConfirmCallback = null, options = {}) {
    return new Promise((resolve) => {
      const modal = document.getElementById('app-form-modal');
      const titleEl = document.getElementById('app-form-modal-title');
      const bodyEl = document.getElementById('app-form-modal-body');
      const errorBox = document.getElementById('app-form-modal-error');
      const errorText = document.getElementById('app-form-modal-error-text');
      const closeBtn = document.getElementById('app-form-modal-close-btn');
      const cancelBtn = document.getElementById('app-form-modal-cancel-btn');
      const submitBtn = document.getElementById('app-form-modal-submit-btn');

      if (!modal || !bodyEl) {
        // Fallback to Swal if modal element not present
        Swal.fire({
          title,
          html: htmlContent,
          showCancelButton: true,
          confirmButtonColor: '#001f3f',
          cancelButtonColor: '#64748b',
          confirmButtonText: '<i class="fa-solid fa-check"></i> Submit',
          cancelButtonText: 'Cancel',
          preConfirm: () => (onConfirmCallback ? onConfirmCallback() : true)
        }).then(r => resolve(r.isConfirmed ? r.value : null));
        return;
      }

      // Contextual Icon mapping
      let icon = options.icon || 'fa-pen-to-square';
      const tLower = title.toLowerCase();
      if (tLower.includes('employee') || tLower.includes('staff')) icon = 'fa-user-plus';
      else if (tLower.includes('consumer') || tLower.includes('customer')) icon = 'fa-user-tag';
      else if (tLower.includes('dispatch') || tLower.includes('trip')) icon = 'fa-truck-ramp-box';
      else if (tLower.includes('rate') || tLower.includes('catalog') || tLower.includes('item')) icon = 'fa-box-open';
      else if (tLower.includes('advance') || tLower.includes('due') || tLower.includes('payment') || tLower.includes('salary')) icon = 'fa-wallet';
      else if (tLower.includes('vendor') || tLower.includes('supplier')) icon = 'fa-handshake';
      else if (tLower.includes('purchase') || tLower.includes('inward')) icon = 'fa-cart-flatbed';
      else if (tLower.includes('stock')) icon = 'fa-boxes-stacked';

      const modalContent = modal.querySelector('.modal-content');
      if (modalContent) {
        modalContent.style.maxWidth = options.maxWidth || '680px';
      }

      titleEl.innerHTML = `<i class="fa-solid ${icon}"></i> ${title}`;
      bodyEl.innerHTML = htmlContent;
      if (errorBox) errorBox.style.display = 'none';

      let isClosed = false;
      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        if (modalContent) modalContent.style.maxWidth = '680px';
        modal.style.display = 'none';
        modal.removeEventListener('click', onBackdropClick);
        document.removeEventListener('keydown', onKeyDown);
        if (closeBtn) closeBtn.onclick = null;
        if (cancelBtn) cancelBtn.onclick = null;
        if (submitBtn) submitBtn.onclick = null;
      };

      const closeWithNull = () => {
        cleanup();
        resolve(null);
      };

      const onBackdropClick = (e) => {
        if (e.target === modal) closeWithNull();
      };

      const onKeyDown = (e) => {
        if (e.key === 'Escape') closeWithNull();
      };

      modal.addEventListener('click', onBackdropClick);
      document.addEventListener('keydown', onKeyDown);
      if (closeBtn) closeBtn.onclick = closeWithNull;
      if (cancelBtn) cancelBtn.onclick = closeWithNull;

      if (submitBtn) {
        submitBtn.onclick = async () => {
          if (errorBox) errorBox.style.display = 'none';
          if (onConfirmCallback) {
            try {
              const res = await onConfirmCallback();
              if (res === false || res === null || res === undefined) {
                return;
              }
              cleanup();
              resolve(res);
            } catch (err) {
              if (errorBox && errorText) {
                errorText.textContent = err.message || 'Validation error. Please verify form inputs.';
                errorBox.style.display = 'block';
                errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }
          } else {
            cleanup();
            resolve(true);
          }
        };
      }

      // Intercept Swal.showValidationMessage for smooth inline feedback
      window.Swal = window.Swal || {};
      Swal.showValidationMessage = (msg) => {
        if (errorBox && errorText) {
          errorText.textContent = msg;
          errorBox.style.display = 'block';
          errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      };

      if (typeof options.onRender === 'function') {
        try { options.onRender(modal); } catch (e) { console.error('formModal onRender error:', e); }
      }

      modal.style.display = 'flex';
    });
  },

  /**
   * Universal Eye-Button Detail View Modal
   */
  viewDetails(title, contentHtml, onPrintCallback = null) {
    const modal = document.getElementById('view-details-modal');
    const titleEl = document.getElementById('view-details-title');
    const bodyEl = document.getElementById('view-details-body');
    const printBtn = document.getElementById('view-details-print-btn');
    const closeBtn = document.getElementById('view-details-close-btn');
    const closeAction = document.getElementById('view-details-close-action');

    if (!modal || !bodyEl) return;

    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-eye"></i> ${title}`;
    bodyEl.innerHTML = contentHtml;

    if (printBtn) {
      if (onPrintCallback) {
        printBtn.style.display = 'inline-flex';
        printBtn.onclick = () => {
          modal.style.display = 'none';
          onPrintCallback();
        };
      } else {
        printBtn.style.display = 'none';
      }
    }

    const doClose = () => { modal.style.display = 'none'; };
    if (closeBtn) closeBtn.onclick = doClose;
    if (closeAction) closeAction.onclick = doClose;

    modal.style.display = 'flex';
  }
};
