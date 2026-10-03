/**
 * SHIV SHAKTI HP GAS - CLIENT SYSTEM CONFIGURATION
 */

export const CONFIG = {
  APP_NAME: 'Shiv Shakti HP Gas ERP',
  AGENCY_NAME: 'Shiv Shakti HP Gas (Pandaul)',
  VERSION: '1.0.0',
  
  // API endpoints
  // Primary is local PHP backend; Fallback supports Netlify proxy or direct web service
  API_URL: 'api.php',
  API_PROXY_URL: '/api',
  APPS_SCRIPT_URL: '', // Optional Google Apps Script bridge if connected
  
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  MAX_RETRY_ATTEMPTS: 1,
  
  // Regional settings
  TIMEZONE: 'Asia/Kolkata',
  CURRENCY: '₹',
  CURRENCY_CODE: 'INR',
  
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 150,
  
  // Storage keys
  STORAGE_TOKEN: 'ss_gas_auth_token',
  STORAGE_USER: 'ss_gas_auth_user',
  STORAGE_THEME: 'ss_gas_theme',
  STORAGE_DARK: 'ss_gas_dark_mode'
};
