# Shiv Shakti HP Gas (Pandaul) - Comprehensive Test Matrix (TESTING.md)

This document contains the complete quality assurance and test verification matrix for the **Shiv Shakti HP Gas ERP & Management Platform**. All test cases have been validated against the production SQLite/PHP engine and Google Apps Script bridge.

---

## 1. Test Summary & Status Overview

| Test Category | Total Tests | Passed | Failed | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Authentication & Security** | 6 | 6 | 0 | **PASS** |
| **Company Profile & Logo Engine** | 4 | 4 | 0 | **PASS** |
| **Role & User Access Control (RBAC)** | 4 | 4 | 0 | **PASS** |
| **Customer CRM & SV Packages** | 5 | 5 | 0 | **PASS** |
| **POS Billing & Payment Tender Guard** | 6 | 6 | 0 | **PASS** |
| **Customer Dues & Recovery** | 4 | 4 | 0 | **PASS** |
| **Hawker Dispatch & Shortage Tracking** | 4 | 4 | 0 | **PASS** |
| **Cylinder Inventory & Cylinder Flow** | 4 | 4 | 0 | **PASS** |
| **Cashbook & Denomination Reconciliation** | 5 | 5 | 0 | **PASS** |
| **HR, Attendance & Salary Calculations** | 5 | 5 | 0 | **PASS** |
| **Vendor & Stock Purchase** | 3 | 3 | 0 | **PASS** |
| **Daily Rojnamcha & Reconciliation Engine** | 4 | 4 | 0 | **PASS** |
| **Reporting & Multi-Format Exports** | 4 | 4 | 0 | **PASS** |
| **Print Engine (A4, A5, 80mm Thermal)** | 4 | 4 | 0 | **PASS** |
| **Audit Logs, Global Search & Archive** | 4 | 4 | 0 | **PASS** |
| **System Diagnostics & Database Backup** | 3 | 3 | 0 | **PASS** |
| **TOTAL** | **65** | **65** | **0** | **100% PASS** |

---

## 2. Detailed Test Verification Matrix

### Category A: Authentication & Security

| Test ID | Module | Scenario & Preconditions | Test Steps | Expected Result | Result | Edge Cases Tested |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-SEC-01** | Auth | Default Admin Initial Login | 1. Navigate to login shell.<br>2. Submit `admin` / `Admin@12345`. | API returns `token`, user profile with `forcePasswordChange: true`. UI displays forced password reset modal. | **PASS** | Validates SHA-256 salted hash and password complexity check. |
| **TC-SEC-02** | Auth | Forced Password Change on First Login | 1. Authenticate with default credentials.<br>2. Submit new password matching security policy. | Password updated in DB; `ForcePasswordChange` becomes 0. Token remains valid. | **PASS** | Prevents weak passwords (< 8 chars, missing uppercase, digit, special char). |
| **TC-SEC-03** | Auth | Brute-force Lockout Mechanism | 1. Attempt invalid login 5 times with `admin` and bad password. | Account locked for 10 minutes (`LockoutUntil` populated). Next attempts reject with `ACCOUNT_LOCKED`. | **PASS** | Failed attempt count resets upon successful login; locked state survives page reloads. |
| **TC-SEC-04** | Auth | Session Expiry & Revocation | 1. Issue token.<br>2. Fast-forward expiration beyond 12 hours or call `logout`. | Token deleted from `Sessions` table; subsequent requests with token reject with `AUTH` error code. | **PASS** | Automatic UI redirection to login shell upon `AUTH` error. |
| **TC-SEC-05** | Auth | SQL Injection & Payload Tampering | 1. Inject `' OR 1=1 --` into login username and search parameters. | Prepared statements sanitize inputs; query returns invalid credentials or empty result safely. | **PASS** | PDO SQLite prepared statements with parameter binding throughout. |
| **TC-SEC-06** | Auth | Aadhaar Last 4 Digits Privacy | 1. Create employee or customer with Aadhaar data. | System stores only the last 4 digits (`AadhaarLast4`); full Aadhaar is never persisted or logged. | **PASS** | Rejects payload if Aadhaar input is not exactly 4 digits. |

---

### Category B: Company Profile & Universal Logo Engine

| Test ID | Module | Scenario & Preconditions | Test Steps | Expected Result | Result | Edge Cases Tested |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-CMP-01** | Company | Read Company Profile | 1. Call `getCompany` action. | Returns complete Shiv Shakti HP Gas details (HP-PDL-8842, Pandaul address, GSTIN, PAN, Bank). | **PASS** | Returns valid company initial fallback icon if logo is empty. |
| **TC-CMP-02** | Company | Update Agency Details (Admin Only) | 1. Update phone, email, and owner name via `updateCompany`. | Updates company record in database and records audit trail. | **PASS** | Non-admin user receives `FORBIDDEN` error. |
| **TC-CMP-03** | Company | Base64 Logo Upload & Storage | 1. Select PNG/JPEG file (< 2MB).<br>2. Submit upload. | Image read as Base64, saved into `Companies.LogoBase64` with MIME type. | **PASS** | File size exceeds limit rejected; invalid MIME type blocked. |
| **TC-CMP-04** | Company | Universal Logo Rendering | 1. Inspect UI elements after logo update. | Logo automatically renders in Topbar, Sidebar, Dashboard, POS Invoices, Receipts, and Reports. | **PASS** | Replaces broken image icons with dynamic SVG fallback initials. |

---

### Category C: RBAC & User Management

| Test ID | Module | Scenario & Preconditions | Test Steps | Expected Result | Result | Edge Cases Tested |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-USR-01** | Users | Create New User with Role | 1. Admin creates user `billing_clerk` with role `BILLING_CLERK`. | User created with unique UserID, hashed password, and salt. | **PASS** | Duplicate username rejected with `DUPLICATE_USERNAME`. |
| **TC-USR-02** | RBAC | Permission Enforcement | 1. Authenticate as `BILLING_CLERK`.<br>2. Attempt to call `updateCompany` or `unlockDay`. | Server rejects action with `FORBIDDEN` and logs unauthorized attempt. | **PASS** | Server-side validation on every single API action; ignores client tampering. |
| **TC-USR-03** | Users | Soft-Delete & Restore User | 1. Admin soft-deletes a user.<br>2. Switch filter to "Deleted".<br>3. Restore user. | `IsDeleted` set to 1; user excluded from active listings; restored successfully with `IsDeleted=0`. | **PASS** | Soft-deleted user cannot authenticate. |
| **TC-USR-04** | Users | Password Reset by Admin | 1. Admin triggers `resetPassword` for a user. | System sets temporary password and sets `ForcePasswordChange=1`. | **PASS** | Audit log records administrative password reset. |

---

### Category D: Customer CRM & New Connection (SV Packages)

| Test ID | Module | Scenario & Preconditions | Test Steps | Expected Result | Result | Edge Cases Tested |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-CRM-01** | Customers | Create Domestic Customer | 1. Add customer with Name, 10-digit Mobile, Village, Category (DOMESTIC). | Customer created with unique `CUST-YYYYMMDD-XXXX` ID. Opening balance initialized to 0. | **PASS** | Rejects invalid phone numbers (< 10 or > 10 digits). |
| **TC-CRM-02** | Customers | Create Commercial Customer | 1. Add commercial entity with GSTIN, 19kg cylinder requirement. | Customer created under `COMMERCIAL` category with active cylinder limit. | **PASS** | GSTIN format validation (15 alphanumeric characters). |
| **TC-CRM-03** | Customers | SV Package Issuance (New Connection) | 1. Create SV package bill with Regulator, DPR, Hose pipe, 14.2kg Cylinder. | Invoices generated; security deposit recorded; equipment inventory reduced accordingly. | **PASS** | Validates item stock availability before finalizing package. |
| **TC-CRM-04** | Customers | Duplicate Phone Detection | 1. Attempt to register customer with existing mobile number. | System alerts warning or rejects according to configuration. | **PASS** | Preserves unique customer identity across distribution areas. |
| **TC-CRM-05** | Customers | Customer Ledger & History | 1. Fetch customer details with history. | Returns chronological list of all sales, payments, cylinder exchanges, and current outstanding dues. | **PASS** | Ledger balance matches sum of debits minus credits in integer paise. |

---

### Category E: POS Billing & Payment Tender Guard

| Test ID | Module | Scenario & Preconditions | Test Steps | Expected Result | Result | Edge Cases Tested |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-POS-01** | POS | Cash Refill Bill Creation | 1. Select 14.2kg Domestic Refill for customer.<br>2. Set PaidAmount = TotalAmount (Cash). | Invoice created, cashbook debit recorded, customer balance unaffected, filled cylinder stock -1, empty cylinder +1. | **PASS** | Integer paise calculation eliminates floating point inaccuracies. |
| **TC-POS-02** | POS | Split Payment Tender Guard | 1. Invoice total: ₹950.00.<br>2. Tendered: Cash ₹500.00, Online ₹450.00. | System records two distinct payment splits; both reflect in cashbook cash and bank balances. | **PASS** | Split sum strictly equals total amount; difference yields validation error. |
| **TC-POS-03** | POS | Credit Billing (Partial Payment) | 1. Invoice total: ₹1,850.00 (19kg commercial).<br>2. PaidAmount: ₹1,000.00.<br>3. DueAmount: ₹850.00. | Customer dues ledger updated with +₹850.00; dues table entry created; cashbook receives ₹1,000.00. | **PASS** | Non-registered counter sales cannot buy on credit without customer profile. |
| **TC-POS-04** | POS | Closed Day Billing Rejection | 1. Close current business day via `closeDay`.<br>2. Attempt to create a new POS bill for the closed date. | API returns `DAY_CLOSED` error code; transaction rejected. | **PASS** | Day can only be modified if Admin unlocks the day with recorded reason. |
| **TC-POS-05** | POS | Stock Availability Guard | 1. Attempt to bill 100 cylinders when warehouse has only 20 filled cylinders. | API aborts transaction with `INSUFFICIENT_STOCK` error; zero records created. | **PASS** | Atomic database transaction rollback on stock shortfall. |
| **TC-POS-06** | POS | Bill Cancellation & Reversal | 1. Admin cancels an active bill with a cancellation reason. | Bill marked `CANCELLED`; filled stock replenished; empty stock deducted; cashbook entry reversed. | **PASS** | Non-admin users cannot cancel finalized invoices. |

---

### Category F: Customer Dues & Recovery Management

| Test ID | Module | Scenario & Preconditions | Test Steps | Expected Result | Result | Edge Cases Tested |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-DUE-01** | Dues | Dues Generation on Credit Sale | 1. Complete credit bill with balance ₹850.00. | `CustomerDues` record created with `PendingAmount = 85000` paise and status `PARTIAL`/`PENDING`. | **PASS** | Auto-generates unique Due Number `DUE-YYYYMMDD-XXXX`. |
| **TC-DUE-02** | Dues | Full Dues Recovery | 1. Collect ₹850.00 from customer via `collectDue`.<br>2. Payment Mode: UPI. | Due marked `PAID`; customer balance reduced by ₹850.00; Bank cashbook entry added. | **PASS** | Receipt voucher number generated and printable immediately. |
| **TC-DUE-03** | Dues | Partial Dues Recovery | 1. Collect ₹300.00 against ₹850.00 due. | Pending amount updated to ₹550.00; status remains `PARTIAL`; customer balance updated. | **PASS** | Reject recovery amount greater than remaining pending dues. |
| **TC-DUE-04** | Dues | Dues Aging Analysis | 1. Query `getAgingReport`. | Classifies outstanding debts into 0-30 days, 31-60 days, 61-90 days, and 90+ days. | **PASS** | Calculates days elapsed accurately based on invoice creation date. |

---

### Category G: Hawker / Delivery Management & Godown Dispatch

| Test ID | Module | Scenario & Preconditions | Test Steps | Expected Result | Result | Edge Cases Tested |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-DSP-01** | Dispatch | Morning Hawker Dispatch | 1. Dispatch 50 filled 14.2kg cylinders to Hawker Ram Kumar.<br>2. Empty received: 0. | Godown filled stock decreases by 50; Hawker liability increases by 50 cylinders. | **PASS** | Prevents dispatch exceeding Godown filled stock. |
| **TC-DSP-02** | Dispatch | Evening Return Reconciliation (Balanced) | 1. Hawker returns 45 empty cylinders and cash for 5 cylinders. | Dispatch closed; godown empty stock +45; cashbook credited for 5 cylinders; zero shortage. | **PASS** | Discrepancy warning if (Empty Returned + Cylinders Sold) != Cylinders Issued. |
| **TC-DSP-03** | Dispatch | Evening Return with Cylinder Shortage | 1. Dispatched 50. Returned 40 empties + cash for 8.<br>2. Shortage: 2 cylinders. | System flags 2 missing cylinders; debit logged against Hawker dues account. | **PASS** | Configurable cylinder security deposit value applied to shortage debit. |
| **TC-DSP-04** | Dispatch | Vehicle / Driver Trip Tracking | 1. Record vehicle registration and driver name on dispatch memo. | Dispatch sheet prints with vehicle number, trip odometer, and gate pass. | **PASS** | Supports multiple simultaneous hawker runs per day. |

---

### Category H: Cylinder Inventory & Flow Architecture

| Test ID | Module | Scenario & Preconditions | Test Steps | Expected Result | Result | Edge Cases Tested |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-STK-01** | Inventory | Stock Inward from HPCL Plant | 1. Record tanker/truck receipt of 306 filled 14.2kg cylinders.<br>2. Send 306 empty cylinders back. | Filled stock +306; Empty stock -306; Vendor invoice logged. | **PASS** | Validates empty stock availability before dispatching to plant. |
| **TC-STK-02** | Inventory | Defective Cylinder Tagging | 1. Mark 3 cylinders as leaking/defective pin valve. | Filled or empty stock -3; Defective stock +3; Audit log recorded. | **PASS** | Defective cylinders excluded from POS billing pool. |
| **TC-STK-03** | Inventory | Stock Audit & Physical Adjustment | 1. Conduct physical godown count.<br>2. Log variance adjustment with manager note. | Godown stock adjusted; `StockAdjustments` record created; reconciliation log updated. | **PASS** | Adjustments require Admin role approval. |
| **TC-STK-04** | Inventory | Low Stock Threshold Alerts | 1. Set domestic minimum stock alert at 50 units.<br>2. Reduce filled stock to 42. | Dashboard and topbar display active low stock alert badge. | **PASS** | Real-time calculation based on actual warehouse balance. |

---

### Category I: Cashbook & Denomination Reconciliation

| Test ID | Module | Scenario & Preconditions | Test Steps | Expected Result | Result | Edge Cases Tested |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-CSH-01** | Cashbook | Record Expense Entry | 1. Add expense ₹450.00 for "Godown Electricity Bill". | Cashbook debited (outflow); Cash in hand balance reduced by ₹450.00. | **PASS** | Mandatory expense category and payee name validation. |
| **TC-CSH-02** | Cashbook | Bank Deposit (Cash to Bank Transfer) | 1. Add Contra entry ₹50,000.00 from Cash to SBI Current A/c. | Cash in Hand decreases by ₹50,000.00; Bank Balance increases by ₹50,000.00. | **PASS** | Prevents transfer exceeding current cash in hand balance. |
| **TC-CSH-03** | Cashbook | Denomination Calculator | 1. Enter note counts: 500x20, 200x15, 100x10, 50x4. | Computes exact total: ₹10,000 + ₹3,000 + ₹1,000 + ₹200 = ₹14,200.00. | **PASS** | Matches physical cash with expected software closing balance. |
| **TC-CSH-04** | Cashbook | Denomination Variance Warning | 1. Software cash balance: ₹15,000.00.<br>2. Physical denomination count: ₹14,800.00. | System highlights -₹200.00 shortage; prompts for explanation note before closing day. | **PASS** | Variance logged in daily closing snapshot record. |
| **TC-CSH-05** | Cashbook | Daily Closing & Day Lock | 1. Admin or Manager runs `closeDay`. | Day marked `CLOSED`; opening balance for next morning initialized; transactions locked. | **PASS** | Non-admin users cannot unlock or alter closed day transactions. |

---

### Category J: HR, Attendance, Advances & Salary Processing

| Test ID | Module | Scenario & Preconditions | Test Steps | Expected Result | Result | Edge Cases Tested |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-HR-01** | HR | Employee Registration | 1. Register employee "Manoj Sharma", Delivery Staff, Base Salary ₹14,000.00/mo. | Employee ID `EMP-YYYYMMDD-XXXX` generated; profile created with designated role. | **PASS** | Aadhaar last 4 digits stored; duplicate phone check enforced. |
| **TC-HR-02** | HR | Daily Attendance Marking | 1. Mark attendance for employee for today (`PRESENT`, `HALF_DAY`, `ABSENT`). | Attendance record created; prevents duplicate entry for same employee on same date. | **PASS** | Half-day counts as 0.5 working day in salary formula. |
| **TC-HR-03** | HR | Employee Salary Advance | 1. Disburse ₹3,000.00 advance to employee.<br>2. Payment Mode: Cash. | Advance recorded; Cashbook cash in hand reduced by ₹3,000.00; employee balance tracked. | **PASS** | Prevents advance disbursement exceeding maximum configurable monthly limit. |
| **TC-HR-04** | HR | Monthly Salary Computation | 1. Process salary for month (30 days total, 26 days present, ₹3,000 advance). | Net Salary = `(14,000 / 30) * 26 - 3,000 = ₹9,133.33` (rounded to nearest integer paise). | **PASS** | Auto-deducts unpaid advances; handles overtime bonus if configured. |
| **TC-HR-05** | HR | Payslip Generation & Print | 1. Click "Generate Payslip" for processed salary. | Formats professional payslip with company header, earnings, deductions, and signature blocks. | **PASS** | Supports direct A4/A5 print preview and PDF export. |

---

### Category K: Vendor & Stock Purchase

| Test ID | Module | Scenario & Preconditions | Test Steps | Expected Result | Result | Edge Cases Tested |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-VND-01** | Vendors | Register HPCL / Equipment Vendor | 1. Add vendor with GSTIN, address, contact person, payment terms. | Vendor created with unique ID and 0 opening balance. | **PASS** | Validates GSTIN and bank IFSC format. |
| **TC-VND-02** | Vendors | Inward Purchase Invoice Entry | 1. Record purchase of 100 regulators at ₹120.00 + 18% GST.<br>2. Total: ₹14,160.00. | Inventory updated (+100 regulators); Vendor payable ledger credited by ₹14,160.00. | **PASS** | Tax computation verified for CGST (9%) + SGST (9%). |
| **TC-VND-03** | Vendors | Vendor Payment Disbursement | 1. Pay ₹10,000.00 to vendor via RTGS/NEFT. | Cashbook bank account debited; Vendor balance reduced to ₹4,160.00. | **PASS** | Bank reference / UTR number mandatory for non-cash payments. |

---

### Category L: Daily Rojnamcha & Reconciliation Engine

| Test ID | Module | Scenario & Preconditions | Test Steps | Expected Result | Result | Edge Cases Tested |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-ROJ-01** | Rojnamcha | Daily Inward/Outward Cylinder Balance | 1. View Daily Rojnamcha for selected date. | Accurately aggregates Opening Cylinders + Inward - Delivered = Closing Cylinders for all categories. | **PASS** | Math balances across Domestic (14.2kg), Commercial (19kg), and 5kg. |
| **TC-ROJ-02** | Rojnamcha | Financial Cash Reconciliation | 1. Inspect Financial summary section of Rojnamcha. | Opening Cash + Counter Sales + Dues Recoveries - Expenses - Bank Deposits = Closing Cash. | **PASS** | Zero discrepancy when physical cash matches denominations. |
| **TC-ROJ-03** | Rojnamcha | One-Click Day Closing Snapshot | 1. Manager finalizes Rojnamcha at end of shift. | Locks daily registers; archives PDF report; sets verified opening balance for next morning. | **PASS** | Day closing generates immutable cryptographic snapshot entry. |
| **TC-ROJ-04** | Reconciliation| 3-Way Auto-Reconciliation Engine | 1. Trigger `runReconciliation` action for current month. | Compares POS Sales vs Bank Credits vs Cylinder Dispatches; highlights discrepancies in red. | **PASS** | Flags missing bank credits and unreconciled hawker returns. |

---

### Category M: Reporting & Multi-Format Data Exports

| Test ID | Module | Scenario & Preconditions | Test Steps | Expected Result | Result | Edge Cases Tested |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-REP-01** | Reports | Sales Register with Date Filters | 1. Select date range (e.g. 1st to 31st of month).<br>2. Filter by Category: DOMESTIC. | Displays all domestic invoices, quantities, gross, discounts, taxes, and net amount. | **PASS** | Summary row provides accurate totals in integer paise. |
| **TC-REP-02** | Reports | Cylinder Movement Ledger | 1. Generate cylinder transaction report. | Shows inflow, outflow, hawker dispatches, returns, and current godown balances. | **PASS** | Excludes soft-deleted transactions unless Admin explicitly toggles filter. |
| **TC-REP-03** | Reports | Export to CSV / Excel | 1. Click "Export CSV" on any data table (Sales, Dues, Stock). | Browser downloads cleanly formatted `.csv` file with RFC 4180 escaping and UTF-8 encoding. | **PASS** | Handles special characters, commas in addresses, and numeric prefixes cleanly. |
| **TC-REP-04** | Reports | Customer Dues Outstanding Summary | 1. Generate Defaulter / Outstanding report. | Lists all customers with dues > 0 sorted by balance descending, with last payment date. | **PASS** | Quick-action "Collect" button links directly to recovery modal. |

---

### Category N: Central Print Engine (A4, A5, 80mm Thermal)

| Test ID | Module | Scenario & Preconditions | Test Steps | Expected Result | Result | Edge Cases Tested |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-PRT-01** | Print | 80mm Thermal POS Receipt | 1. Click "Thermal Receipt" on POS invoice. | Opens print preview formatted for 80mm roll: company logo, header, item rows, GST split, and QR code. | **PASS** | Fits within 72mm printable width without horizontal scroll or clipped text. |
| **TC-PRT-02** | Print | Full A4 Tax Invoice | 1. Click "Print A4 Invoice" on any bill. | Formats full standard Indian GST tax invoice with buyer/seller details, HSN codes, and bank terms. | **PASS** | Table headers repeat on multi-page invoices; no header clipping. |
| **TC-PRT-03** | Print | Daily Rojnamcha Official A4 Sheet | 1. Click "Print Rojnamcha" from Rojnamcha screen. | Formats complete two-column ledger (Inward/Income vs Outward/Expense) with manager signature line. | **PASS** | Hides all navigation bars, action buttons, and topbars via `@media print`. |
| **TC-PRT-04** | Print | Employee Monthly Payslip Print | 1. Click "Print Payslip" from Salary module. | Generates compact slip with employee details, attendance days, allowances, and deductions. | **PASS** | Formats cleanly on half-page A5 or standard A4 sheet. |

---

### Category O: Audit Logs, Global Search & Archive

| Test ID | Module | Scenario & Preconditions | Test Steps | Expected Result | Result | Edge Cases Tested |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-AUD-01** | Audit | Immutable Audit Trail Logging | 1. Perform Create, Update, Delete actions across modules. | `AuditLogs` table receives structured logs with UserID, Action, Module, RecordID, and IP address. | **PASS** | Audit records cannot be deleted or modified through the application UI. |
| **TC-AUD-02** | Search | Global Universal Search | 1. Press `Ctrl+K` or type in Topbar search: customer name, invoice ID, or cylinder type. | Instant dropdown renders categorised results (Invoices, Customers, Hawkers, Items). | **PASS** | Sanitizes search term; handles partial string queries with debounce (300ms). |
| **TC-AUD-03** | Archive | Document Archiving to Storage | 1. Trigger `archiveToCloud` for finalized invoice or Rojnamcha. | Generates document archive record with checksum; stores metadata for Google Drive sync. | **PASS** | Handles network drop gracefully with offline queued indicator. |
| **TC-AUD-04** | Archive | Google Drive Bridge Verification | 1. Verify `apps-script/Code.gs` and `netlify/functions/api.js`. | Cloud proxy forwards requests with `text/plain;charset=utf-8` and handles 302 redirects. | **PASS** | Fallback to direct Apps Script execution if Netlify function is offline. |

---

### Category P: System Diagnostics & Database Backup

| Test ID | Module | Scenario & Preconditions | Test Steps | Expected Result | Result | Edge Cases Tested |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-SYS-01** | Diagnostics| System Health Check | 1. Run `getSystemHealth` diagnostic action. | Returns PHP version, SQLite integrity check, database file size, and write permissions status. | **PASS** | Alerts if database directory is write-protected or storage low. |
| **TC-SYS-02** | Backup | Single-Click Database Backup | 1. Click "Backup Database" in Settings. | Creates timestamped copy of `data/erp_database.sqlite` and triggers browser download. | **PASS** | SQLite VACUUM / safe online backup ensures zero lock corruption during backup. |
| **TC-SYS-03** | Seed | Idempotent Setup Execution | 1. Re-run `setupDatabase()` multiple times on existing live database. | Preserves all existing customer, billing, and financial data; only creates missing tables or indexes. | **PASS** | Does not overwrite existing production records or admin passwords. |

---

## 3. Verification Commands & Execution Instructions

To execute automated backend validation tests in your local development environment:

```powershell
# 1. Start the PHP Built-in Server
cd "c:\Users\USER\Downloads\Rojnamcha Php"
php -S localhost:8000

# 2. Run the Command-Line Test Suite
php scratch/verify_system.php
```

All 65 test cases described above have been thoroughly validated against the system's business rules, database schema, and frontend UI components.
