/**
 * SHIV SHAKTI HP GAS - APPS SCRIPT DATABASE SETUP & REPOSITORY HANDLER
 */

function Setup_setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = [
    { name: 'Companies', headers: ['CompanyID', 'CompanyName', 'LegalName', 'AgencyName', 'DistributorCode', 'ECustCode', 'HPCLCode', 'AddressLine1', 'Village', 'District', 'State', 'PIN', 'Phone', 'Email', 'GSTIN', 'BankName', 'BankAccount', 'IFSC', 'UPI', 'LogoBase64', 'LogoMimeType', 'CreatedAt', 'UpdatedAt'] },
    { name: 'Users', headers: ['UserID', 'Username', 'PasswordHash', 'Salt', 'FullName', 'Email', 'Mobile', 'Role', 'Status', 'ForcePasswordChange', 'FailedAttempts', 'LockUntil', 'LastLoginAt', 'IsDeleted', 'CreatedAt', 'UpdatedAt'] },
    { name: 'Roles', headers: ['RoleID', 'RoleName', 'Description', 'CreatedAt'] },
    { name: 'Permissions', headers: ['PermissionID', 'RoleName', 'ModuleName', 'CanCreate', 'CanRead', 'CanUpdate', 'CanDelete', 'CanExport', 'CanPrint', 'CanApprove'] },
    { name: 'Sessions', headers: ['SessionID', 'Token', 'UserID', 'ExpiresAt', 'CreatedAt'] },
    { name: 'AuditLog', headers: ['AuditID', 'Timestamp', 'UserID', 'Username', 'Action', 'Module', 'RecordID', 'Reason'] },
    { name: 'Settings', headers: ['SettingKey', 'SettingValue', 'Category', 'Description', 'UpdatedAt'] },
    { name: 'ItemRates', headers: ['ItemID', 'ItemCode', 'ItemName', 'Category', 'CylinderType', 'Rate', 'RatePaise', 'TaxPercent', 'IsPackageItem', 'Status', 'IsDeleted'] },
    { name: 'RateHistory', headers: ['HistoryID', 'ItemID', 'ItemCode', 'OldRate', 'NewRate', 'Reason', 'ChangedByName', 'ChangedAt'] },
    { name: 'Customers', headers: ['CustomerID', 'CustomerCode', 'Name', 'Mobile', 'AltMobile', 'ConsumerNo', 'LPGID', 'Address', 'Area', 'Village', 'ConnectionType', 'CylinderType', 'AadhaarLast4', 'Status', 'CurrentDues', 'LifetimeValue', 'TotalRefills', 'LastRefillDate', 'IsDeleted', 'CreatedAt'] },
    { name: 'Bills', headers: ['BillID', 'BillNumber', 'BillDate', 'CustomerID', 'CustomerName', 'CustomerMobile', 'ConsumerNo', 'Subtotal', 'TaxAmount', 'DiscountAmount', 'TotalAmount', 'TotalPaise', 'SettlementPaise', 'PaidCash', 'PaidUPI', 'PaidHPPay', 'PaidDues', 'PaidBank', 'Status', 'IsCancelled', 'CancelReason', 'CreatedByName', 'CreatedAt'] },
    { name: 'BillItems', headers: ['BillItemID', 'BillID', 'ItemID', 'ItemName', 'Category', 'CylinderType', 'Quantity', 'Rate', 'TaxPercent', 'Total'] },
    { name: 'BillPayments', headers: ['PaymentID', 'BillID', 'PaymentMode', 'Amount', 'PaymentDate', 'ReferenceNo', 'CreatedAt'] },
    { name: 'CustomerDues', headers: ['DueID', 'DueNumber', 'CustomerID', 'BillID', 'DueDate', 'OriginalAmount', 'PaidAmount', 'RemainingAmount', 'Status', 'IsWrittenOff', 'WriteOffReason', 'CreatedAt'] },
    { name: 'DuePayments', headers: ['ReceiptID', 'ReceiptNumber', 'DueID', 'CustomerID', 'PaymentDate', 'Amount', 'PaymentMode', 'Notes', 'CreatedByName', 'CreatedAt'] },
    { name: 'Employees', headers: ['EmpID', 'EmpCode', 'Name', 'Mobile', 'Role', 'JoiningDate', 'Salary', 'PerDeliveryRate', 'Status', 'EmergencyContact', 'Address', 'BankDetails', 'IsDeleted', 'CreatedAt'] },
    { name: 'Attendance', headers: ['AttendanceID', 'EmpID', 'Date', 'Status', 'Remarks', 'CreatedAt'] },
    { name: 'Salaries', headers: ['SalaryID', 'SalaryNumber', 'EmpID', 'SalaryMonth', 'BaseSalary', 'PresentDays', 'DeliveriesCount', 'NetSalary', 'Status', 'PaymentDate', 'CreatedAt'] },
    { name: 'Advances', headers: ['AdvanceID', 'AdvanceNumber', 'EmpID', 'Date', 'Amount', 'RecoveryMonth', 'Status', 'CreatedAt'] },
    { name: 'HawkerDispatch', headers: ['DispatchID', 'DispatchNumber', 'Date', 'EmpID', 'CylinderType', 'LoadedQuantity', 'ReturnedEmpty', 'ReturnedFull', 'NetSold', 'Rate', 'ExpectedCollection', 'CashDeposited', 'UPIDeposited', 'DuesAllowed', 'ShortageAmount', 'ExcessAmount', 'VehicleNo', 'CreatedAt'] },
    { name: 'CylinderStock', headers: ['StockID', 'Date', 'CylinderType', 'OpeningFull', 'PlantReceipt', 'CounterSold', 'HawkerSold', 'ClosingFull', 'ClosingEmpty', 'PhysicalCountFull', 'VarianceFull', 'Remarks', 'CreatedAt'] },
    { name: 'Cashbook', headers: ['CashbookID', 'Date', 'OpeningCash', 'CounterCash', 'HawkerCash', 'DuesCash', 'OtherInflow', 'TotalInflow', 'Expenses', 'Refunds', 'BankDeposit', 'ExpectedClosing', 'PhysicalClosing', 'Variance', 'VarianceReason', 'IsClosed', 'CreatedAt'] },
    { name: 'DayClosings', headers: ['ClosingID', 'Date', 'IsLocked', 'TotalBilling', 'TotalCashInflow', 'ClosedByName', 'ClosedAt'] },
    { name: 'Archives', headers: ['ArchiveID', 'FileName', 'FileType', 'Date', 'FileSize', 'CreatedByName', 'CreatedAt'] }
  ];

  sheets.forEach(function (def) {
    var sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
      sheet.appendRow(def.headers);
      sheet.setFrozenRows(1);
    }
  });

  return { ok: true, message: 'All Google Sheets tables initialized successfully.' };
}
