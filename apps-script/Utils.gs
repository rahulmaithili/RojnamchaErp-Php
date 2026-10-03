/**
 * SHIV SHAKTI HP GAS - APPS SCRIPT VENDOR, ARCHIVE & UTILS MODULES
 */

// Vendor
function Vendor_listVendors(payload, user) {
  return { ok: true, data: [] };
}

function Vendor_saveVendor(payload, user) {
  return { ok: true, message: 'Vendor saved.' };
}

// Archive
function Archive_backupDatabase(user) {
  return { ok: true, message: 'Backup created in Google Drive.' };
}

// Utils
function Utils_formatDate(date) {
  return Utilities.formatDate(new Date(date), 'Asia/Kolkata', 'yyyy-MM-dd');
}
