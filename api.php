<?php
/**
 * SHIV SHAKTI HP GAS - MASTER API ROUTER
 * Single Entry Point for All Frontend Actions
 */

// Suppress PHP errors/warnings so they don't corrupt JSON responses on shared hosting
error_reporting(0);
ini_set('display_errors', '0');
ob_start(); // Buffer any stray output

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
ob_clean(); // Clear buffer before sending headers
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS request
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

// Controllers
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/CompanyController.php';
require_once __DIR__ . '/controllers/DashboardController.php';
require_once __DIR__ . '/controllers/UserController.php';
require_once __DIR__ . '/controllers/PermissionController.php';
require_once __DIR__ . '/controllers/BillingController.php';
require_once __DIR__ . '/controllers/CustomerController.php';
require_once __DIR__ . '/controllers/DuesController.php';
require_once __DIR__ . '/controllers/DispatchController.php';
require_once __DIR__ . '/controllers/StockController.php';
require_once __DIR__ . '/controllers/CashController.php';
require_once __DIR__ . '/controllers/HrController.php';
require_once __DIR__ . '/controllers/VendorController.php';
require_once __DIR__ . '/controllers/ItemController.php';
require_once __DIR__ . '/controllers/ReportController.php';
require_once __DIR__ . '/controllers/ArchiveController.php';
require_once __DIR__ . '/controllers/SearchController.php';
require_once __DIR__ . '/controllers/SettingsController.php';
require_once __DIR__ . '/controllers/AuditController.php';

try {
    // Ensure database and schema are initialized
    Database::setupDatabase();

    // Read Input JSON or POST Body
    $rawInput = file_get_contents('php://input');
    $data = [];
    if (!empty($rawInput)) {
        $data = json_decode($rawInput, true) ?: [];
    }
    if (empty($data)) {
        $data = $_POST;
    }

    $action = $data['action'] ?? ($_GET['action'] ?? '');
    $token = $data['token'] ?? ($_GET['token'] ?? '');
    $payload = $data['payload'] ?? [];
    if (is_string($payload)) {
        $payload = json_decode($payload, true) ?: [];
    }

    // Authenticate token (if provided)
    $currentUser = null;
    if (!empty($token)) {
        $currentUser = Auth::validateToken($token);
    }

    // Public / Unauthenticated actions
    $publicActions = ['login', 'setupDatabase', 'getMeta', 'forgotPassword'];

    if (!in_array($action, $publicActions)) {
        if (!$currentUser) {
            http_response_code(200); // Standard JSON envelope
            echo json_encode([
                'ok' => false,
                'error' => [
                    'code' => 'AUTH',
                    'message' => 'Session expired or invalid authentication token. Please log in again.'
                ]
            ]);
            exit;
        }
    }

    // Dispatcher Matrix
    $response = null;

    switch ($action) {
        // Setup & Meta
        case 'setupDatabase':
            Database::setupDatabase();
            $response = ['ok' => true, 'message' => 'Database tables and seed data initialized successfully.'];
            break;

        case 'getMeta':
            $db = Database::getConnection();
            $comp = $db->query("SELECT CompanyName, LegalName, AgencyName, DistributorCode, Phone, Email, LogoBase64, LogoMimeType FROM companies LIMIT 1")->fetch();
            $response = [
                'ok' => true,
                'data' => [
                    'appName' => APP_NAME,
                    'version' => APP_VERSION,
                    'company' => $comp,
                    'currency' => CURRENCY_SYMBOL,
                    'timezone' => date_default_timezone_get()
                ]
            ];
            break;

        // Auth
        case 'login':
        case 'logout':
        case 'changePassword':
        case 'forgotPassword':
        case 'getMe':
            $response = AuthController::handle($action, $payload, $currentUser);
            break;

        // Company & Logo
        case 'getCompany':
        case 'saveCompany':
        case 'uploadCompanyLogo':
        case 'removeCompanyLogo':
            $response = CompanyController::handle($action, $payload, $currentUser);
            break;

        // Dashboard & Diagnostics
        case 'getDashboard':
        case 'getSystemHealth':
            $response = DashboardController::handle($action, $payload, $currentUser);
            break;

        // Users
        case 'listUsers':
        case 'saveUser':
        case 'deleteUser':
        case 'restoreUser':
        case 'resetPassword':
        case 'changeRole':
            $response = UserController::handle($action, $payload, $currentUser);
            break;

        // Permissions
        case 'getPermissions':
        case 'savePermissions':
            $response = PermissionController::handle($action, $payload, $currentUser);
            break;

        // Billing
        case 'listEntries':
        case 'listBills':
        case 'getBill':
        case 'addEntry':
        case 'addBill':
        case 'cancelBill':
        case 'issueNewConnectionPackage':
        case 'refundSecurityDeposit':
        case 'listSecurityRefunds':
            $response = BillingController::handle($action, $payload, $currentUser);
            break;

        // Customers / CRM
        case 'listCustomers':
        case 'getCustomer':
        case 'getCustomer360':
        case 'saveCustomer':
        case 'deleteCustomer':
        case 'restoreCustomer':
        case 'addInteraction':
        case 'getRefillReminders':
            $response = CustomerController::handle($action, $payload, $currentUser);
            break;

        // Dues
        case 'listDues':
        case 'recoverDue':
        case 'writeOffDue':
            $response = DuesController::handle($action, $payload, $currentUser);
            break;

        // Dispatch
        case 'listVendorLog':
        case 'listDispatch':
        case 'saveVendorLog':
        case 'saveDispatch':
        case 'getHawkerPerformance':
            $response = DispatchController::handle($action, $payload, $currentUser);
            break;

        // Stock
        case 'getStock':
        case 'saveStock':
        case 'adjustStock':
        case 'getStockLedger':
        case 'receivePlantTruck':
        case 'listPlantReceipts':
            $response = StockController::handle($action, $payload, $currentUser);
            break;

        // Cashbook & Day Closing
        case 'getCashbook':
        case 'saveCashbook':
        case 'closeDay':
        case 'unlockDay':
            $response = CashController::handle($action, $payload, $currentUser);
            break;

        // HR & Payroll
        case 'listEmployees':
        case 'saveEmployee':
        case 'deleteEmployee':
        case 'restoreEmployee':
        case 'markAttendance':
        case 'getAttendance':
        case 'saveAdvance':
        case 'calcSalary':
        case 'finalizeSalary':
        case 'listLeaves':
        case 'saveLeave':
        case 'listEmployeeDocuments':
        case 'uploadEmployeeDocument':
        case 'deleteEmployeeDocument':
            $response = HrController::handle($action, $payload, $currentUser);
            break;

        // Vendors & Purchases
        case 'listVendors':
        case 'saveVendor':
        case 'deleteVendor':
        case 'restoreVendor':
        case 'listPurchases':
        case 'savePurchase':
            $response = VendorController::handle($action, $payload, $currentUser);
            break;

        // Items & Rates
        case 'listItems':
        case 'saveItem':
        case 'deleteItem':
        case 'restoreItem':
        case 'adminUpdateRates':
        case 'getRateHistory':
            $response = ItemController::handle($action, $payload, $currentUser);
            break;

        // Reports & Rojnamcha
        case 'getReport':
        case 'getRojnamcha':
        case 'getReconciliation':
            $response = ReportController::handle($action, $payload, $currentUser);
            break;

        // Archives, Backups, Data Import/Export & System Reset
        case 'backupDatabase':
        case 'getArchiveHistory':
        case 'downloadDatabase':
        case 'exportDataJson':
        case 'importDataJson':
        case 'restoreSqliteFile':
        case 'resetDatabase':
            $response = ArchiveController::handle($action, $payload, $currentUser);
            break;

        // Global Search
        case 'globalSearch':
            $response = SearchController::handle($action, $payload, $currentUser);
            break;

        // Settings
        case 'getSettings':
        case 'saveSettings':
            $response = SettingsController::handle($action, $payload, $currentUser);
            break;

        // Audit Logs
        case 'listAudit':
            $response = AuditController::handle($action, $payload, $currentUser);
            break;

        default:
            $response = [
                'ok' => false,
                'error' => [
                    'code' => 'NOT_FOUND',
                    'message' => "Unknown action '{$action}'"
                ]
            ];
            break;
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE);

} catch (Throwable $t) {
    http_response_code(200);
    echo json_encode([
        'ok' => false,
        'error' => [
            'code' => 'SERVER',
            'message' => 'Internal Server Error: ' . $t->getMessage()
        ]
    ]);
}
