/**
 * SHIV SHAKTI HP GAS - CENTRAL API CLIENT
 * Handles authentication headers, timeout, retries, duplicate submission locks and standardized responses
 */

import { CONFIG } from './config.js';
import { ui } from './ui.js';

// In-flight active requests map for duplicate prevention
const activeRequests = new Set();

export async function api(action, payload = {}, options = {}) {
  const showModalLoader = options.loader === true;
  const loaderMessage = options.loaderMessage || 'Processing request...';
  const silentError = options.silentError === true;
  
  // Duplicate submission guard for write operations
  const reqKey = `${action}:${JSON.stringify(payload)}`;
  if (activeRequests.has(reqKey)) {
    console.warn(`[API] Duplicate submission blocked for action: ${action}`);
    return { ok: false, error: { code: 'CONFLICT', message: 'Request is already being processed.' } };
  }
  activeRequests.add(reqKey);

  // Show either modal loader (for critical writes) or top animated load bar (for fast reads)
  if (showModalLoader) {
    ui.loading(loaderMessage);
  } else {
    ui.startLoadBar();
  }

  const token = localStorage.getItem(CONFIG.STORAGE_TOKEN) || '';
  const requestBody = {
    action,
    token,
    payload
  };

  let attempt = 0;
  const maxAttempts = 1 + CONFIG.MAX_RETRY_ATTEMPTS;

  while (attempt < maxAttempts) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.DEFAULT_TIMEOUT);

    try {
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const resData = await response.json();
      activeRequests.delete(reqKey);

      if (showModalLoader) {
        ui.close();
      } else {
        ui.stopLoadBar();
      }

      // Check standard response envelope
      if (!resData.ok) {
        const err = resData.error || { code: 'SERVER', message: 'An unknown server error occurred.' };

        // Handle AUTH error -> Trigger automatic logout
        if (err.code === 'AUTH') {
          localStorage.removeItem(CONFIG.STORAGE_TOKEN);
          localStorage.removeItem(CONFIG.STORAGE_USER);
          ui.error(err.message, 'Session Expired');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
          return resData;
        }

        if (!silentError) {
          ui.error(err.message, `Error (${err.code})`);
        }
      }

      return resData;

    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle retry on network disconnect or timeout
      if (attempt < maxAttempts) {
        console.warn(`[API] Retrying action ${action} (attempt ${attempt + 1}/${maxAttempts})...`);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      activeRequests.delete(reqKey);
      if (showModalLoader) {
        ui.close();
      } else {
        ui.stopLoadBar();
      }

      const isTimeout = fetchError.name === 'AbortError';
      const msg = isTimeout 
        ? 'Server request timed out after 30 seconds. Please check your connection.'
        : `Network connection failed: ${fetchError.message}`;

      if (!silentError) {
        ui.error(msg, 'Network Error');
      }

      return {
        ok: false,
        error: {
          code: isTimeout ? 'TIMEOUT' : 'NETWORK',
          message: msg
        }
      };
    }
  }
}
