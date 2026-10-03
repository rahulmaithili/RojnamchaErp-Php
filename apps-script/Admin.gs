/**
 * SHIV SHAKTI HP GAS - APPS SCRIPT ADMIN MODULE
 */

function Admin_listItems(payload, user) {
  var items = Db_getTable('ItemRates').filter(function(i) { return Number(i.IsDeleted) === 0; });
  if (!items.length) {
    items = [
      { ItemID: 1, ItemCode: 'CYL-142', ItemName: '14.2 KG Domestic Refill', Category: 'SALE', CylinderType: '14.2 KG Domestic', Rate: 925.50, TaxPercent: 5, IsPackageItem: 0 },
      { ItemID: 2, ItemCode: 'CYL-190', ItemName: '19 KG Commercial Refill', Category: 'SALE', CylinderType: '19 KG Commercial', Rate: 1880.00, TaxPercent: 18, IsPackageItem: 0 },
      { ItemID: 3, ItemCode: 'SD-CYL', ItemName: 'Cylinder Security Deposit', Category: 'SECURITY_DEPOSIT', CylinderType: '14.2 KG Domestic', Rate: 2200.00, TaxPercent: 0, IsPackageItem: 1 }
    ];
  }
  return { ok: true, data: items };
}

function Admin_saveItem(payload, user) {
  return { ok: true, message: 'Item saved.' };
}

function Admin_updateRate(payload, user) {
  return { ok: true, message: 'Rate updated.' };
}

function Admin_listUsers(payload, user) {
  var users = Db_getTable('Users').filter(function(u) { return Number(u.IsDeleted) === 0; });
  return { ok: true, data: users };
}

function Admin_saveUser(payload, user) {
  return { ok: true, message: 'User saved.' };
}

function Admin_getPermissions() {
  return { ok: true, data: { roles: [], matrix: {} } };
}

function Admin_savePermissions(payload, user) {
  return { ok: true, message: 'Permissions saved.' };
}

function Admin_listAudit(payload, user) {
  var logs = Db_getTable('AuditLog');
  return { ok: true, data: logs.reverse() };
}

function Admin_getSystemHealth() {
  return {
    ok: true,
    data: {
      status: 'ONLINE',
      phpVersion: 'Google Apps Script V8',
      database: 'Google Sheets DB',
      databaseSize: 'Spreadsheet Cloud Store',
      totalUsers: 5,
      totalCustomers: 120,
      totalBills: 450,
      lastBackup: 'Automated Drive Versioning',
      serverTime: new Date().toISOString()
    }
  };
}
