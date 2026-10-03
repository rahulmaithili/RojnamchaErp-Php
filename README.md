# SHIV SHAKTI HP GAS (PANDAUL) — COMPLETE ERP + POS + CRM + HR + INVENTORY + ROJNAMCHA SYSTEM

Enterprise-grade, production-ready LPG Agency Business Management System designed specifically for **Shiv Shakti HP Gas, Pandaul (Madhubani, Bihar)**.

---

## 1. ARCHITECTURE & TECH STACK

- **Frontend**: Single-Page Application (SPA) built with pure HTML5, CSS3, and Vanilla JavaScript ES6 Modules.
- **External UI Libraries**: 
  - FontAwesome 6.5.1
  - SweetAlert2 11 (Unified modal/dialog framework)
  - Chart.js 4.4.0 (Analytics and trends)
  - Google Fonts: Plus Jakarta Sans & JetBrains Mono (Financial numbers)
- **Backend**:
  - **Native PHP 8.x Web Service Engine**: Single entry point `api.php` with modular controller architecture (`controllers/`).
  - **Zero-Config Database**: Auto-initializing SQLite PDO (`data/erp_database.sqlite`) with ACID compliance, WAL mode, and complete foreign keys. Configurable to MySQL PDO via `config.php`.
  - **Optional Google Apps Script Backend**: Full standalone `.gs` script collection in `apps-script/` with `doPost(e)` and ScriptLock transaction safety.
  - **Netlify Serverless Function Proxy**: `netlify/functions/api.js` for reverse proxy forwarding.

---

## 2. KEY MODULES & CAPABILITIES

1. **Company & Agency Profile**: Full profile management with Distributor Code (`HP-PDL-8842`), SAP/E-Cust Code, statutory GSTIN/PAN, Bank/UPI, and Base64 Logo system rendering across receipts, payslips and reports.
2. **Role-Based Access Control (RBAC)**: Roles: `ADMIN`, `MANAGER`, `CASHIER`, `DELIVERY`, `VIEWER`. Granular module permissions for Create, Read, Update, Delete, Export, Print, and Approve.
3. **POS Counter Billing**: Multi-line cart, items catalog from Item Rates Master, payment tenders (Cash, UPI, HP Pay, Credit Dues, Bank/RTGS). **Integer-Paise Balance Guard** (`totalBillPaise === settlementPaise`). Bill cancellation with complete inventory and ledger reversals.
4. **New SV Connection Package**: Single-click atomic creation of consumer profile + package bill (Deposit for Cylinder, Deposit for Regulator, Passbook, Hose, Stove, Refill).
5. **Customer CRM & 360 Profile**: Unique 10-digit mobile, duplicate prevention, Aadhaar last-4 storage only, Customer 360 view (LTV, refill count, average refill gap, payment history, refill reminders).
6. **Customer Dues Ledger**: Aging analysis (0-7, 8-30, 31-60, 60+ days), partial/full recovery with automated receipt generation (`RCT-YYYYMMDD-XXXX`), and Admin-only write-offs with mandatory audit explanations.
7. **Hawker & Delivery Dispatch**: Vehicle loading logs, returned sound/empty cylinders, net sold calculation, expected collections, cash/UPI deposits, and daily shortage/excess auditing.
8. **Cylinder Inventory & Stock Ledger**: Variants: 14.2 KG Domestic, 19 KG Commercial, 5 KG Commercial, 5 KG Domestic, 2 KG Commercial. Opening full, plant receipts, sales, sound empty, sent to plant, closing full/empty, physical count variance, and stock adjustment audit.
9. **Daily Cashbook & End-of-Day Closing**: Drawer cash inflows, expenses, refunds, bank deposits, physical currency denomination counter (₹500, ₹200, ₹100, ₹50, ₹20, ₹10, Coins). Strict variance detection with mandatory explanation. End-of-Day lock and Admin unlock with audit log.
10. **HR, Attendance & Payroll**: Staff roster, daily attendance marking (Present, Absent, Half Day, Leave), bulk mark present, employee advance loans, and automated salary computation (base + attendance prorating + delivery incentives - advances - shortages = Net Salary) with payslip printing.
11. **Vendors & Stock Inwards**: Suppliers directory, purchase invoices and receipts.
12. **Items & Rate Master**: Item catalog with category and tax rates. Admin rate revision with mandatory explanation and immutable `rate_history` tracking.
13. **Official Daily Rojnamcha Engine**: Dedicated register module replicating the official business format for daily sales, stock positions, tender collections, and cash reconciliation.
14. **Centralized Reconciliation Engine**: Mathematical 3-way check of POS Billing vs Settlements, Physical Cash vs Cashbook, and Hawker Deliveries vs Collections. Shows prominent `BALANCED` or `DISCREPANCY DETECTED` status.
15. **Centralized Print Engine**: Dedicated preview modal supporting **A4 Standard**, **A5 Medium**, and **80mm Thermal Receipts** with dynamic company branding and logo rendering.

---

## 3. DEFAULT CREDENTIALS

On database creation, the system automatically creates the root administrator:

- **Username**: `admin`
- **Default Password**: `Admin@12345`
- **Security Policy**: The application enforces a **Mandatory Password Change** modal on the very first login.

---

## 4. QUICK START & DEPLOYMENT INSTRUCTIONS

### OPTION A: RUNNING WITH PHP BUILT-IN SERVER (INSTANT LOCAL DEV)

1. Open PowerShell / Command Prompt inside the project folder:
   ```powershell
   cd "c:\Users\USER\Downloads\Rojnamcha Php"
   ```
2. Start the built-in PHP web server:
   ```powershell
   php -S localhost:8000
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```
4. Log in with `admin` / `Admin@12345`.
5. Change the password when prompted. The database is initialized and seeded automatically in `data/erp_database.sqlite`.

---

### OPTION B: XAMPP / WAMP / APACHE (PRODUCTION ON WINDOWS)

1. Copy or clone the `Rojnamcha Php` folder into your web root (e.g., `C:\xampp\htdocs\shiv_shakti`).
2. Ensure the `pdo_sqlite` extension is enabled in `php.ini` (or set `DB_DRIVER = 'mysql'` in `config.php`).
3. Ensure the web server has write permissions on the `data/` folder.
4. Navigate to `http://localhost/shiv_shakti/index.html`.

---

### OPTION C: DEPLOYING TO NETLIFY & GOOGLE APPS SCRIPT

1. **Google Sheets Setup**:
   - Create a new Google Spreadsheet in Google Drive.
   - Open **Extensions > Apps Script**.
   - Copy the files from `apps-script/` into the Apps Script editor.
   - Run `Setup_setupDatabase()` from the script editor once to build the sheets and headers.
   - Click **Deploy > New Deployment**, select **Web app**, execute as **Me**, and allow access to **Anyone**.
   - Copy the generated Web App URL.
2. **Netlify Setup**:
   - Deploy this repository to Netlify.
   - In Netlify **Site configuration > Environment variables**, set:
     - `APPS_SCRIPT_URL` = `<Your Google Apps Script Web App URL>`
   - Netlify will automatically use `netlify.toml` and `netlify/functions/api.js` as the proxy.

---

## 5. COMPLETE API ACTION MATRIX

| Category | API Action | Description | Permission Required |
|---|---|---|---|
| **Auth** | `login` | Authenticate user credentials & return session token | Public |
| | `logout` | Invalidate active session token | Authenticated |
| | `changePassword`| Update account password | Self |
| | `getMe` | Return current authenticated user context | Authenticated |
| **Meta & Company**| `getMeta` | Agency branding, company profile, and logo | Public |
| | `getCompany` | Full company profile details | Authenticated |
| | `saveCompany` | Update agency statutory, banking, and address data | Admin |
| | `uploadCompanyLogo` | Upload Base64 logo up to 3MB | Admin |
| | `removeCompanyLogo` | Remove logo and reset to initials fallback | Admin |
| **Dashboard** | `getDashboard` | Real-time calculated KPIs, Chart.js analytics | Read |
| | `getSystemHealth` | Physical database size, server clock, status | Admin |
| **Users & RBAC** | `listUsers` | View user accounts (active/trash) | Admin |
| | `saveUser` | Create/edit operator account | Admin |
| | `deleteUser` | Soft-delete user account | Admin |
| | `restoreUser` | Restore deleted user account | Admin |
| | `resetPassword` | Administrative password reset | Admin |
| | `getPermissions` | View role authorization matrix | Authenticated |
| | `savePermissions`| Update granular module permissions | Admin |
| **POS Billing** | `listBills` | Browse sales register | Read |
| | `getBill` | Fetch full bill details with items & payments | Read |
| | `addBill` | Generate tax invoice with integer-paise guard | Create |
| | `cancelBill` | Cancel bill with reverse stock & dues | Delete / Admin |
| | `issueNewConnectionPackage` | Atomic customer creation + SV package bill | Create |
| **CRM & Dues** | `listCustomers` | Consumer master with search & filters | Read |
| | `getCustomer360`| 360 consumer profile (LTV, refill frequency) | Read |
| | `saveCustomer` | Create/edit customer with unique 10-digit mobile | Create / Update |
| | `deleteCustomer`| Soft-delete consumer record | Delete |
| | `getRefillReminders`| Overdue consumers (>25 days since last refill)| Read |
| | `listDues` | Outstanding credit receivables & aging | Read |
| | `recoverDue` | Settle due & issue receipt (`RCT-...`) | Update |
| | `writeOffDue` | Administrative due write-off with mandatory reason | Admin |
| **Dispatch & Stock**| `listDispatch` | View hawker delivery dispatch logs | Read |
| | `saveDispatch` | Record trip loading, returns & shortage | Create / Update |
| | `getHawkerPerformance` | Trips count, cylinders sold, collection totals | Read |
| | `getStock` | Full & empty cylinder positions by variant | Read |
| | `saveStock` | Save daily physical cylinder audit | Update |
| | `adjustStock` | Manual stock movement with mandatory reason | Update / Admin |
| | `getStockLedger`| Complete cylinder movements ledger | Read |
| **Cashbook & EOD**| `getCashbook` | Cash drawer reconciliation & denominations | Read |
| | `saveCashbook` | Save inflows, outflows, variance explanation | Create / Update |
| | `closeDay` | Lock business day entries | Approve / Admin |
| | `unlockDay` | Administrative day unlock with mandatory reason | Admin |
| **HR & Payroll** | `listEmployees` | Staff directory with roles & incentives | Read |
| | `saveEmployee` | Create/edit staff profile | Create / Update |
| | `markAttendance`| Daily attendance roster | Create / Update |
| | `getAttendance` | Daily and monthly attendance logs | Read |
| | `calcSalary` | Automated payroll calculation | Read |
| | `finalizeSalary`| Lock payroll & payslip generation | Approve / Admin |
| | `saveAdvance` | Register staff loan & recovery month | Create |
| **Items & Rates** | `listItems` | Catalog items and rates | Read |
| | `saveItem` | Create/edit product or service | Admin |
| | `adminUpdateRates`| Revise price with mandatory audit reason | Admin |
| | `getRateHistory`| Immutable pricing revision history | Read |
| **Vendors** | `listVendors` | Suppliers directory | Read |
| | `saveVendor` | Create/edit supplier | Create / Update |
| | `savePurchase` | Log stock purchase invoice | Create |
| **Reports & Audit**| `getReport` | Daily sales, payment tenders, item sales | Read |
| | `getRojnamcha` | Official Daily Rojnamcha layout data | Read |
| | `getReconciliation`| 3-way automated discrepancy validation | Read |
| | `listAudit` | Security audit trail logs | Admin |
| | `backupDatabase`| Physical SQLite database snapshot copy | Admin |
