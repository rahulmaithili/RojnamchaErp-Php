<?php
/**
 * SHIV SHAKTI HP GAS - ERP DATABASE HANDLER & AUTOMATIC SCHEMA BUILDER
 * Supports PDO SQLite & MySQL with Idempotent Auto-Migration
 */

require_once __DIR__ . '/config.php';

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            try {
                if (DB_DRIVER === 'sqlite') {
                    $dbDir = dirname(DB_SQLITE_PATH);
                    if (!is_dir($dbDir)) {
                        mkdir($dbDir, 0755, true);
                        // Protect data directory from direct web access
                        file_put_contents($dbDir . DIRECTORY_SEPARATOR . '.htaccess', "Deny from all\n");
                    }
                    $dsn = 'sqlite:' . DB_SQLITE_PATH;
                    self::$instance = new PDO($dsn, null, null, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false
                    ]);
                    // Enable SQLite Foreign Keys and WAL Mode for high performance
                    self::$instance->exec('PRAGMA foreign_keys = ON;');
                    self::$instance->exec('PRAGMA journal_mode = WAL;');
                } else {
                    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
                    self::$instance = new PDO($dsn, DB_USER, DB_PASS, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false
                    ]);
                }
            } catch (PDOException $e) {
                http_response_code(500);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode([
                    'ok' => false,
                    'error' => [
                        'code' => 'SERVER',
                        'message' => 'Database connection failed: ' . $e->getMessage()
                    ]
                ]);
                exit;
            }
        }
        return self::$instance;
    }

    public static function setConnection(?PDO $pdo): void {
        self::$instance = $pdo;
    }

    public static function sqliteToMysql(string $sql): string {
        // Primary keys: INTEGER PRIMARY KEY AUTOINCREMENT -> INT NOT NULL AUTO_INCREMENT PRIMARY KEY
        $sql = preg_replace(
            '/(\b\w+\b)\s+INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/i',
            '`$1` INT NOT NULL AUTO_INCREMENT PRIMARY KEY',
            $sql
        );

        // SettingKey TEXT PRIMARY KEY -> `SettingKey` VARCHAR(191) NOT NULL PRIMARY KEY
        $sql = preg_replace(
            '/(\b\w+\b)\s+TEXT\s+PRIMARY\s+KEY/i',
            '`$1` VARCHAR(191) NOT NULL PRIMARY KEY',
            $sql
        );

        // Unique TEXT columns: column TEXT UNIQUE -> `column` VARCHAR(191) UNIQUE
        $sql = preg_replace(
            '/(\b\w+\b)\s+TEXT\s+UNIQUE\s+NOT\s+NULL/i',
            '`$1` VARCHAR(191) NOT NULL UNIQUE',
            $sql
        );
        $sql = preg_replace(
            '/(\b\w+\b)\s+TEXT\s+UNIQUE/i',
            '`$1` VARCHAR(191) UNIQUE',
            $sql
        );

        // Columns that appear in compound UNIQUE keys or index constraints
        $indexCols = [
            'RoleName', 'ModuleName', 'Date', 'SalaryMonth', 'CylinderType',
            'ItemCode', 'CustomerCode', 'ConsumerNo', 'Mobile', 'AltMobile', 'LPGID',
            'BillNumber', 'DueNumber', 'ReceiptNumber', 'EmpCode', 'AdvanceNumber',
            'SalaryNumber', 'VendorCode', 'DispatchNumber', 'ReturnNumber', 'RefundNumber',
            'ChallanNumber', 'InvoiceNumber', 'TruckNumber', 'VehicleNo', 'VehicleNumber'
        ];
        foreach ($indexCols as $col) {
            $sql = preg_replace("/\b$col\s+TEXT\b/i", "`$col` VARCHAR(191)", $sql);
        }

        // TEXT DEFAULT '...' -> VARCHAR(255) DEFAULT '...'
        $sql = preg_replace(
            '/(\b\w+\b)\s+TEXT(\s+NOT\s+NULL)?\s+DEFAULT\s+([\'"][^\'"]*[\'"])/i',
            '`$1` VARCHAR(255)$2 DEFAULT $3',
            $sql
        );

        // REAL -> DOUBLE
        $sql = preg_replace('/\bREAL\b/i', 'DOUBLE', $sql);

        // INSERT OR IGNORE -> INSERT IGNORE
        $sql = preg_replace('/INSERT\s+OR\s+IGNORE\s+INTO/i', 'INSERT IGNORE INTO', $sql);

        // Add ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 at end of CREATE TABLE
        if (stripos($sql, 'CREATE TABLE') !== false && !preg_match('/ENGINE\s*=/i', $sql)) {
            $sql = preg_replace('/\)\s*$/', ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci', trim($sql));
        }

        return $sql;
    }

    private static function execDdl(PDO $db, string $sql): void {
        $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $sql = self::sqliteToMysql($sql);
        }
        $db->exec($sql);
    }

    /**
     * Idempotent Database Setup
     * Creates all required tables, indices, and initial production seed data
     */
    public static function setupDatabase(): void {
        $db = self::getConnection();
        $isMysql = ($db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql');
        if ($isMysql) {
            $db->exec("SET FOREIGN_KEY_CHECKS = 0;");
        }

        // 1. Companies Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS companies (
            CompanyID INTEGER PRIMARY KEY AUTOINCREMENT,
            CompanyName TEXT NOT NULL,
            LegalName TEXT,
            AgencyName TEXT,
            DistributorCode TEXT,
            ECustCode TEXT,
            HPCLCode TEXT,
            AddressLine1 TEXT,
            AddressLine2 TEXT,
            Village TEXT,
            Block TEXT,
            District TEXT,
            State TEXT,
            PIN TEXT,
            Phone TEXT,
            AlternatePhone TEXT,
            Email TEXT,
            Website TEXT,
            GSTIN TEXT,
            PAN TEXT,
            LicenseNumber TEXT,
            BankName TEXT,
            BankAccount TEXT,
            IFSC TEXT,
            UPI TEXT,
            OwnerName TEXT,
            ManagerName TEXT,
            BusinessType TEXT,
            OpeningDate TEXT,
            Status TEXT DEFAULT 'ACTIVE',
            LogoBase64 TEXT,
            LogoMimeType TEXT,
            LogoUpdatedAt TEXT,
            CreatedAt TEXT,
            UpdatedAt TEXT
        )");

        // 2. Users Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS users (
            UserID INTEGER PRIMARY KEY AUTOINCREMENT,
            Username TEXT UNIQUE NOT NULL,
            PasswordHash TEXT NOT NULL,
            Salt TEXT NOT NULL,
            FullName TEXT NOT NULL,
            Email TEXT,
            Mobile TEXT,
            Role TEXT NOT NULL DEFAULT 'VIEWER',
            Status TEXT DEFAULT 'ACTIVE',
            ForcePasswordChange INTEGER DEFAULT 0,
            FailedAttempts INTEGER DEFAULT 0,
            LockUntil TEXT,
            LastLoginAt TEXT,
            IsDeleted INTEGER DEFAULT 0,
            CreatedBy INTEGER,
            CreatedAt TEXT,
            UpdatedBy INTEGER,
            UpdatedAt TEXT,
            DeletedBy INTEGER,
            DeletedAt TEXT
        )");

        // 3. Roles Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS roles (
            RoleID INTEGER PRIMARY KEY AUTOINCREMENT,
            RoleName TEXT UNIQUE NOT NULL,
            Description TEXT,
            IsSystem INTEGER DEFAULT 0,
            Status TEXT DEFAULT 'ACTIVE',
            CreatedAt TEXT
        )");

        // 4. Permissions Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS permissions (
            PermissionID INTEGER PRIMARY KEY AUTOINCREMENT,
            RoleName TEXT NOT NULL,
            ModuleName TEXT NOT NULL,
            CanCreate INTEGER DEFAULT 0,
            CanRead INTEGER DEFAULT 1,
            CanUpdate INTEGER DEFAULT 0,
            CanDelete INTEGER DEFAULT 0,
            CanExport INTEGER DEFAULT 0,
            CanPrint INTEGER DEFAULT 1,
            CanApprove INTEGER DEFAULT 0,
            UNIQUE(RoleName, ModuleName)
        )");

        // 5. Sessions Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS sessions (
            SessionID INTEGER PRIMARY KEY AUTOINCREMENT,
            Token TEXT UNIQUE NOT NULL,
            UserID INTEGER NOT NULL,
            ExpiresAt TEXT NOT NULL,
            IPAddress TEXT,
            UserAgent TEXT,
            CreatedAt TEXT,
            FOREIGN KEY (UserID) REFERENCES users(UserID)
        )");

        // 6. Audit Log Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS audit_logs (
            AuditID INTEGER PRIMARY KEY AUTOINCREMENT,
            Timestamp TEXT NOT NULL,
            UserID INTEGER,
            Username TEXT,
            Action TEXT NOT NULL,
            Module TEXT NOT NULL,
            RecordID TEXT,
            OldValue TEXT,
            NewValue TEXT,
            IPAddress TEXT,
            UserAgent TEXT,
            Reason TEXT
        )");

        // 7. Settings Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS settings (
            SettingKey TEXT PRIMARY KEY,
            SettingValue TEXT,
            Category TEXT,
            Description TEXT,
            UpdatedAt TEXT
        )");

        // 8. Item Rates Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS item_rates (
            ItemID INTEGER PRIMARY KEY AUTOINCREMENT,
            ItemCode TEXT UNIQUE NOT NULL,
            ItemName TEXT NOT NULL,
            Category TEXT NOT NULL,
            CylinderType TEXT,
            Rate REAL NOT NULL DEFAULT 0.0,
            RatePaise INTEGER NOT NULL DEFAULT 0,
            TaxPercent REAL DEFAULT 0.0,
            Description TEXT,
            IsPackageItem INTEGER DEFAULT 0,
            Status TEXT DEFAULT 'ACTIVE',
            IsDeleted INTEGER DEFAULT 0,
            CreatedBy INTEGER,
            CreatedAt TEXT,
            UpdatedBy INTEGER,
            UpdatedAt TEXT,
            DeletedBy INTEGER,
            DeletedAt TEXT
        )");

        // 9. Rate History Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS rate_history (
            HistoryID INTEGER PRIMARY KEY AUTOINCREMENT,
            ItemID INTEGER NOT NULL,
            ItemCode TEXT NOT NULL,
            OldRate REAL NOT NULL,
            NewRate REAL NOT NULL,
            OldRatePaise INTEGER NOT NULL,
            NewRatePaise INTEGER NOT NULL,
            Reason TEXT,
            ChangedBy INTEGER,
            ChangedByName TEXT,
            ChangedAt TEXT
        )");

        // 10. Customers Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS customers (
            CustomerID INTEGER PRIMARY KEY AUTOINCREMENT,
            CustomerCode TEXT UNIQUE NOT NULL,
            Name TEXT NOT NULL,
            Mobile TEXT UNIQUE NOT NULL,
            AltMobile TEXT,
            ConsumerNo TEXT,
            LPGID TEXT,
            Address TEXT,
            Area TEXT,
            Village TEXT,
            ConnectionType TEXT DEFAULT 'DOMESTIC',
            CylinderType TEXT DEFAULT '14.2 KG Domestic',
            AadhaarLast4 TEXT,
            Status TEXT DEFAULT 'ACTIVE',
            Tags TEXT,
            Notes TEXT,
            DOB TEXT,
            CurrentDues REAL DEFAULT 0.0,
            CurrentDuesPaise INTEGER DEFAULT 0,
            LifetimeValue REAL DEFAULT 0.0,
            TotalRefills INTEGER DEFAULT 0,
            LastRefillDate TEXT,
            IsDeleted INTEGER DEFAULT 0,
            CreatedBy INTEGER,
            CreatedAt TEXT,
            UpdatedBy INTEGER,
            UpdatedAt TEXT,
            DeletedBy INTEGER,
            DeletedAt TEXT
        )");

        // 11. Customer Interactions & CRM
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS customer_interactions (
            InteractionID INTEGER PRIMARY KEY AUTOINCREMENT,
            CustomerID INTEGER NOT NULL,
            Type TEXT NOT NULL,
            Notes TEXT NOT NULL,
            CreatedBy INTEGER,
            CreatedAt TEXT
        )");

        // 12. Followups Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS followups (
            FollowupID INTEGER PRIMARY KEY AUTOINCREMENT,
            CustomerID INTEGER NOT NULL,
            DueDate TEXT NOT NULL,
            Reason TEXT NOT NULL,
            Status TEXT DEFAULT 'PENDING',
            CompletedAt TEXT,
            Notes TEXT,
            CreatedBy INTEGER,
            CreatedAt TEXT,
            UpdatedBy INTEGER,
            UpdatedAt TEXT
        )");

        // 13. Bills Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS bills (
            BillID INTEGER PRIMARY KEY AUTOINCREMENT,
            BillNumber TEXT UNIQUE NOT NULL,
            BillDate TEXT NOT NULL,
            CustomerID INTEGER,
            CustomerName TEXT NOT NULL,
            CustomerMobile TEXT,
            ConsumerNo TEXT,
            Subtotal REAL NOT NULL,
            TaxAmount REAL DEFAULT 0.0,
            DiscountAmount REAL DEFAULT 0.0,
            TotalAmount REAL NOT NULL,
            TotalPaise INTEGER NOT NULL,
            SettlementPaise INTEGER NOT NULL,
            PaidCash REAL DEFAULT 0.0,
            PaidUPI REAL DEFAULT 0.0,
            PaidHPPay REAL DEFAULT 0.0,
            PaidDues REAL DEFAULT 0.0,
            PaidBank REAL DEFAULT 0.0,
            Status TEXT DEFAULT 'FINAL',
            IsCancelled INTEGER DEFAULT 0,
            CancelReason TEXT,
            CancelledBy INTEGER,
            CancelledAt TEXT,
            Notes TEXT,
            IsDeleted INTEGER DEFAULT 0,
            CreatedBy INTEGER,
            CreatedByName TEXT,
            CreatedAt TEXT,
            UpdatedBy INTEGER,
            UpdatedAt TEXT
        )");

        // 14. Bill Items Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS bill_items (
            BillItemID INTEGER PRIMARY KEY AUTOINCREMENT,
            BillID INTEGER NOT NULL,
            ItemID INTEGER NOT NULL,
            ItemName TEXT NOT NULL,
            Category TEXT NOT NULL,
            CylinderType TEXT,
            Quantity INTEGER NOT NULL,
            Rate REAL NOT NULL,
            RatePaise INTEGER NOT NULL,
            Discount REAL DEFAULT 0.0,
            TaxPercent REAL DEFAULT 0.0,
            Total REAL NOT NULL,
            TotalPaise INTEGER NOT NULL,
            FOREIGN KEY (BillID) REFERENCES bills(BillID)
        )");

        // 15. Bill Payments Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS bill_payments (
            PaymentID INTEGER PRIMARY KEY AUTOINCREMENT,
            BillID INTEGER NOT NULL,
            PaymentMode TEXT NOT NULL,
            Amount REAL NOT NULL,
            AmountPaise INTEGER NOT NULL,
            ReferenceNo TEXT,
            PaymentDate TEXT NOT NULL,
            CreatedBy INTEGER,
            CreatedAt TEXT,
            FOREIGN KEY (BillID) REFERENCES bills(BillID)
        )");

        // 16. Customer Dues Ledger Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS customer_dues (
            DueID INTEGER PRIMARY KEY AUTOINCREMENT,
            DueNumber TEXT UNIQUE NOT NULL,
            CustomerID INTEGER NOT NULL,
            BillID INTEGER,
            DueDate TEXT NOT NULL,
            OriginalAmount REAL NOT NULL,
            OriginalPaise INTEGER NOT NULL,
            PaidAmount REAL DEFAULT 0.0,
            PaidPaise INTEGER DEFAULT 0,
            RemainingAmount REAL NOT NULL,
            RemainingPaise INTEGER NOT NULL,
            Status TEXT DEFAULT 'PENDING',
            IsWrittenOff INTEGER DEFAULT 0,
            WriteOffReason TEXT,
            WrittenOffBy INTEGER,
            WrittenOffAt TEXT,
            CreatedBy INTEGER,
            CreatedAt TEXT,
            UpdatedBy INTEGER,
            UpdatedAt TEXT
        )");

        // 17. Due Payments Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS due_payments (
            ReceiptID INTEGER PRIMARY KEY AUTOINCREMENT,
            ReceiptNumber TEXT UNIQUE NOT NULL,
            DueID INTEGER NOT NULL,
            CustomerID INTEGER NOT NULL,
            PaymentDate TEXT NOT NULL,
            Amount REAL NOT NULL,
            AmountPaise INTEGER NOT NULL,
            PaymentMode TEXT NOT NULL,
            ReferenceNo TEXT,
            Notes TEXT,
            CreatedBy INTEGER,
            CreatedByName TEXT,
            CreatedAt TEXT
        )");

        // 18. Employees Master Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS employees (
            EmpID INTEGER PRIMARY KEY AUTOINCREMENT,
            EmpCode TEXT UNIQUE NOT NULL,
            Name TEXT NOT NULL,
            Mobile TEXT UNIQUE NOT NULL,
            Role TEXT NOT NULL,
            JoiningDate TEXT NOT NULL,
            Salary REAL DEFAULT 0.0,
            PerDeliveryRate REAL DEFAULT 0.0,
            Status TEXT DEFAULT 'ACTIVE',
            EmergencyContact TEXT,
            Address TEXT,
            BankDetails TEXT,
            Photo TEXT,
            UserID INTEGER,
            IsDeleted INTEGER DEFAULT 0,
            CreatedBy INTEGER,
            CreatedAt TEXT,
            UpdatedBy INTEGER,
            UpdatedAt TEXT,
            DeletedBy INTEGER,
            DeletedAt TEXT
        )");

        try {
            self::execDdl($db, "ALTER TABLE employees ADD COLUMN Photo TEXT");
        } catch (Exception $e) {}

        // 18b. Employee KYC & Multi-Type Documents Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS employee_documents (
            DocID INTEGER PRIMARY KEY AUTOINCREMENT,
            EmpID INTEGER NOT NULL,
            DocType TEXT NOT NULL,
            DocTitle TEXT NOT NULL,
            DocNumber TEXT,
            FileName TEXT NOT NULL,
            FileData TEXT NOT NULL,
            MimeType TEXT DEFAULT 'application/octet-stream',
            FileSize INTEGER DEFAULT 0,
            Notes TEXT,
            UploadedBy INTEGER,
            UploadedAt TEXT,
            FOREIGN KEY (EmpID) REFERENCES employees(EmpID) ON DELETE CASCADE
        )");

        // 19. Attendance Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS attendance (
            AttendanceID INTEGER PRIMARY KEY AUTOINCREMENT,
            EmpID INTEGER NOT NULL,
            Date TEXT NOT NULL,
            Status TEXT NOT NULL,
            Remarks TEXT,
            MarkedBy INTEGER,
            CreatedAt TEXT,
            UpdatedAt TEXT,
            UNIQUE(EmpID, Date)
        )");

        // 20. Advances Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS advances (
            AdvanceID INTEGER PRIMARY KEY AUTOINCREMENT,
            AdvanceNumber TEXT UNIQUE NOT NULL,
            EmpID INTEGER NOT NULL,
            Date TEXT NOT NULL,
            Amount REAL NOT NULL,
            AmountPaise INTEGER NOT NULL,
            Reason TEXT,
            RecoveredAmount REAL DEFAULT 0.0,
            RecoveredPaise INTEGER DEFAULT 0,
            BalanceAmount REAL NOT NULL,
            BalancePaise INTEGER NOT NULL,
            RecoveryMonth TEXT,
            Status TEXT DEFAULT 'ACTIVE',
            CreatedBy INTEGER,
            CreatedAt TEXT,
            UpdatedBy INTEGER,
            UpdatedAt TEXT
        )");

        // 21. Salaries Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS salaries (
            SalaryID INTEGER PRIMARY KEY AUTOINCREMENT,
            SalaryNumber TEXT UNIQUE NOT NULL,
            EmpID INTEGER NOT NULL,
            SalaryMonth TEXT NOT NULL,
            BaseSalary REAL NOT NULL,
            PresentDays REAL DEFAULT 0,
            AttendanceAdjustment REAL DEFAULT 0.0,
            DeliveriesCount INTEGER DEFAULT 0,
            DeliveryIncentive REAL DEFAULT 0.0,
            AdvanceDeduction REAL DEFAULT 0.0,
            ShortageDeduction REAL DEFAULT 0.0,
            OtherBonus REAL DEFAULT 0.0,
            NetSalary REAL NOT NULL,
            NetSalaryPaise INTEGER NOT NULL,
            Status TEXT DEFAULT 'DRAFT',
            FinalizedBy INTEGER,
            FinalizedAt TEXT,
            PaymentDate TEXT,
            PaymentMode TEXT,
            Remarks TEXT,
            CreatedAt TEXT,
            UpdatedAt TEXT,
            UNIQUE(EmpID, SalaryMonth)
        )");

        // 22. Leaves Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS leaves (
            LeaveID INTEGER PRIMARY KEY AUTOINCREMENT,
            EmpID INTEGER NOT NULL,
            LeaveType TEXT NOT NULL,
            StartDate TEXT NOT NULL,
            EndDate TEXT NOT NULL,
            DaysCount REAL NOT NULL,
            Reason TEXT,
            Status TEXT DEFAULT 'PENDING',
            ApprovedBy INTEGER,
            ApprovedAt TEXT,
            CreatedBy INTEGER,
            CreatedAt TEXT
        )");

        // 23. Vendors Master Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS vendors (
            VendorID INTEGER PRIMARY KEY AUTOINCREMENT,
            VendorCode TEXT UNIQUE NOT NULL,
            VendorName TEXT NOT NULL,
            Mobile TEXT,
            Address TEXT,
            GSTIN TEXT,
            ContactPerson TEXT,
            ItemsSupplied TEXT,
            OpeningBalance REAL DEFAULT 0.0,
            Status TEXT DEFAULT 'ACTIVE',
            Notes TEXT,
            IsDeleted INTEGER DEFAULT 0,
            CreatedBy INTEGER,
            CreatedAt TEXT,
            UpdatedBy INTEGER,
            UpdatedAt TEXT,
            DeletedBy INTEGER,
            DeletedAt TEXT
        )");

        // 24. Purchases Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS purchases (
            PurchaseID INTEGER PRIMARY KEY AUTOINCREMENT,
            InvoiceNumber TEXT NOT NULL,
            VendorID INTEGER NOT NULL,
            PurchaseDate TEXT NOT NULL,
            TotalAmount REAL NOT NULL,
            TotalPaise INTEGER NOT NULL,
            PaidAmount REAL DEFAULT 0.0,
            Status TEXT DEFAULT 'RECEIVED',
            Remarks TEXT,
            CreatedBy INTEGER,
            CreatedAt TEXT
        )");

        // 25. Purchase Items Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS purchase_items (
            PurchaseItemID INTEGER PRIMARY KEY AUTOINCREMENT,
            PurchaseID INTEGER NOT NULL,
            ItemID INTEGER NOT NULL,
            Quantity INTEGER NOT NULL,
            Rate REAL NOT NULL,
            Total REAL NOT NULL,
            FOREIGN KEY (PurchaseID) REFERENCES purchases(PurchaseID)
        )");

        // 26. Hawker / Delivery Dispatch Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS hawker_dispatch (
            DispatchID INTEGER PRIMARY KEY AUTOINCREMENT,
            DispatchNumber TEXT UNIQUE NOT NULL,
            Date TEXT NOT NULL,
            EmpID INTEGER NOT NULL,
            CylinderType TEXT NOT NULL DEFAULT '14.2 KG Domestic',
            LoadedQuantity INTEGER NOT NULL,
            ReturnedEmpty INTEGER DEFAULT 0,
            ReturnedFull INTEGER DEFAULT 0,
            NetSold INTEGER NOT NULL,
            Rate REAL NOT NULL,
            ExpectedCollection REAL NOT NULL,
            CashDeposited REAL DEFAULT 0.0,
            UPIDeposited REAL DEFAULT 0.0,
            HPPayDeposited REAL DEFAULT 0.0,
            DuesAllowed REAL DEFAULT 0.0,
            ShortageAmount REAL DEFAULT 0.0,
            ExcessAmount REAL DEFAULT 0.0,
            Area TEXT,
            VehicleNo TEXT,
            Status TEXT DEFAULT 'CLOSED',
            Remarks TEXT,
            CreatedBy INTEGER,
            CreatedAt TEXT,
            UpdatedBy INTEGER,
            UpdatedAt TEXT
        )");

        try {
            self::execDdl($db, "ALTER TABLE hawker_dispatch ADD COLUMN HPPayDeposited REAL DEFAULT 0.0");
        } catch (Exception $e) {}
        try {
            self::execDdl($db, "ALTER TABLE hawker_dispatch ADD COLUMN HPPayConsumerCount INTEGER DEFAULT 0");
        } catch (Exception $e) {}
        try {
            self::execDdl($db, "ALTER TABLE hawker_dispatch ADD COLUMN HPPayRate REAL DEFAULT 0.0");
        } catch (Exception $e) {}
        try {
            self::execDdl($db, "ALTER TABLE hawker_dispatch ADD COLUMN HPPayConsumerDetails TEXT");
        } catch (Exception $e) {}

        // 26b. HP Pay Consumer Transaction Ledger Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS hp_pay_transactions (
            TxnID INTEGER PRIMARY KEY AUTOINCREMENT,
            Date TEXT NOT NULL,
            DispatchID INTEGER,
            EmpID INTEGER NOT NULL,
            HawkerName TEXT NOT NULL,
            ConsumerNo TEXT NOT NULL,
            CylinderType TEXT NOT NULL DEFAULT '14.2 KG Domestic',
            Amount REAL NOT NULL DEFAULT 0.0,
            ReferenceNo TEXT,
            Remarks TEXT,
            CreatedAt TEXT
        )");

        // 26c. Plant Bottling Truck Receipts & Empty Return Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS plant_truck_receipts (
            ReceiptID INTEGER PRIMARY KEY AUTOINCREMENT,
            ReceiptNumber TEXT UNIQUE NOT NULL,
            ChallanNumber TEXT NOT NULL,
            InvoiceDate TEXT NOT NULL,
            GodownDate TEXT NOT NULL,
            TruckNumber TEXT,
            DriverName TEXT,
            TotalFilledReceived INTEGER NOT NULL DEFAULT 0,
            TotalEmptyReturned INTEGER NOT NULL DEFAULT 0,
            TotalDefectiveReturned INTEGER NOT NULL DEFAULT 0,
            DetailsJson TEXT,
            Remarks TEXT,
            CreatedBy INTEGER,
            CreatedAt TEXT
        )");

        // 26d. HPCL Cylinder Return & EMR Portal Records Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS hpcl_cylinder_returns (
            ReturnID INTEGER PRIMARY KEY AUTOINCREMENT,
            ReturnNumber TEXT UNIQUE NOT NULL,
            InvoiceNumber TEXT,
            InvoiceDate TEXT,
            ReturnDate TEXT NOT NULL,
            VehicleNumber TEXT NOT NULL,
            TotalQuantity INTEGER NOT NULL DEFAULT 0,
            DetailsJson TEXT,
            Status TEXT DEFAULT 'SUBMITTED',
            Remarks TEXT,
            CreatedBy INTEGER,
            CreatedAt TEXT
        )");

        // 27. Cylinder Stock Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS cylinder_stock (
            StockID INTEGER PRIMARY KEY AUTOINCREMENT,
            Date TEXT NOT NULL,
            CylinderType TEXT NOT NULL,
            OpeningFull INTEGER NOT NULL DEFAULT 0,
            OpeningEmpty INTEGER NOT NULL DEFAULT 0,
            PlantReceipt INTEGER NOT NULL DEFAULT 0,
            EMRReceived INTEGER NOT NULL DEFAULT 0,
            CounterSold INTEGER NOT NULL DEFAULT 0,
            HawkerSold INTEGER NOT NULL DEFAULT 0,
            DefectiveReceived INTEGER NOT NULL DEFAULT 0,
            SoundEmptyReceived INTEGER NOT NULL DEFAULT 0,
            SentToPlant INTEGER NOT NULL DEFAULT 0,
            ClosingFull INTEGER NOT NULL DEFAULT 0,
            ClosingEmpty INTEGER NOT NULL DEFAULT 0,
            PhysicalCountFull INTEGER,
            PhysicalCountEmpty INTEGER,
            VarianceFull INTEGER DEFAULT 0,
            VarianceEmpty INTEGER DEFAULT 0,
            Remarks TEXT,
            CreatedBy INTEGER,
            CreatedAt TEXT,
            UpdatedAt TEXT,
            UNIQUE(Date, CylinderType)
        )");

        try {
            self::execDdl($db, "ALTER TABLE cylinder_stock ADD COLUMN OpeningEmpty INTEGER NOT NULL DEFAULT 0");
        } catch (Exception $e) {}
        try {
            self::execDdl($db, "ALTER TABLE cylinder_stock ADD COLUMN EMRReceived INTEGER NOT NULL DEFAULT 0");
        } catch (Exception $e) {}

        // 28. Stock Ledger / Movements Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS stock_movements (
            MovementID INTEGER PRIMARY KEY AUTOINCREMENT,
            Date TEXT NOT NULL,
            CylinderType TEXT NOT NULL,
            MovementType TEXT NOT NULL,
            Quantity INTEGER NOT NULL,
            FullOrEmpty TEXT NOT NULL,
            ReferenceNo TEXT,
            Reason TEXT,
            CreatedBy INTEGER,
            CreatedAt TEXT
        )");

        // 29. Cashbook Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS cashbook (
            CashbookID INTEGER PRIMARY KEY AUTOINCREMENT,
            Date TEXT UNIQUE NOT NULL,
            OpeningCash REAL NOT NULL DEFAULT 0.0,
            CounterCash REAL NOT NULL DEFAULT 0.0,
            HawkerCash REAL NOT NULL DEFAULT 0.0,
            DuesCash REAL NOT NULL DEFAULT 0.0,
            OtherInflow REAL NOT NULL DEFAULT 0.0,
            TotalInflow REAL NOT NULL DEFAULT 0.0,
            Expenses REAL NOT NULL DEFAULT 0.0,
            Refunds REAL NOT NULL DEFAULT 0.0,
            BankDeposit REAL NOT NULL DEFAULT 0.0,
            TotalOutflow REAL NOT NULL DEFAULT 0.0,
            ExpectedClosing REAL NOT NULL DEFAULT 0.0,
            PhysicalClosing REAL NOT NULL DEFAULT 0.0,
            Variance REAL NOT NULL DEFAULT 0.0,
            VarianceReason TEXT,
            Denomination500 INTEGER DEFAULT 0,
            Denomination200 INTEGER DEFAULT 0,
            Denomination100 INTEGER DEFAULT 0,
            Denomination50 INTEGER DEFAULT 0,
            Denomination20 INTEGER DEFAULT 0,
            Denomination10 INTEGER DEFAULT 0,
            DenominationCoins REAL DEFAULT 0.0,
            IsClosed INTEGER DEFAULT 0,
            ClosedBy INTEGER,
            ClosedAt TEXT,
            CreatedBy INTEGER,
            CreatedAt TEXT,
            UpdatedAt TEXT
        )");

        // 30. Day Closings Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS day_closings (
            ClosingID INTEGER PRIMARY KEY AUTOINCREMENT,
            Date TEXT UNIQUE NOT NULL,
            IsLocked INTEGER DEFAULT 1,
            TotalBilling REAL NOT NULL,
            TotalCashInflow REAL NOT NULL,
            TotalDigitalInflow REAL NOT NULL,
            TotalDuesAdded REAL NOT NULL,
            TotalDuesRecovered REAL NOT NULL,
            TotalExpenses REAL NOT NULL,
            TotalCylindersSold INTEGER NOT NULL,
            ClosedBy INTEGER NOT NULL,
            ClosedByName TEXT,
            ClosedAt TEXT NOT NULL,
            IsUnlocked INTEGER DEFAULT 0,
            UnlockedBy INTEGER,
            UnlockedByName TEXT,
            UnlockedAt TEXT,
            UnlockReason TEXT
        )");

        // 31. Notifications Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS notifications (
            NotificationID INTEGER PRIMARY KEY AUTOINCREMENT,
            Type TEXT NOT NULL,
            Title TEXT NOT NULL,
            Message TEXT NOT NULL,
            IsRead INTEGER DEFAULT 0,
            CreatedAt TEXT
        )");

        // 32. Archives / Backups Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS archives (
            ArchiveID INTEGER PRIMARY KEY AUTOINCREMENT,
            FileName TEXT NOT NULL,
            FileType TEXT NOT NULL,
            Date TEXT NOT NULL,
            FilePath TEXT,
            FileSize INTEGER,
            CreatedBy INTEGER,
            CreatedAt TEXT
        )");

        // 33. Security Deposit Return / SV Surrender Table
        self::execDdl($db, "CREATE TABLE IF NOT EXISTS security_refunds (
            RefundID INTEGER PRIMARY KEY AUTOINCREMENT,
            RefundNumber TEXT UNIQUE NOT NULL,
            Date TEXT NOT NULL,
            CustomerID INTEGER NOT NULL,
            CustomerName TEXT NOT NULL,
            CustomerMobile TEXT,
            ConsumerNo TEXT,
            CylinderType TEXT NOT NULL DEFAULT '14.2 KG Domestic',
            CylindersReturned INTEGER DEFAULT 1,
            RegulatorReturned INTEGER DEFAULT 1,
            PassbookReturned INTEGER DEFAULT 1,
            SecurityAmount REAL NOT NULL,
            DeductionAmount REAL DEFAULT 0.0,
            RefundAmount REAL NOT NULL,
            RefundAmountPaise INTEGER NOT NULL,
            PaymentMode TEXT DEFAULT 'CASH',
            ReferenceNo TEXT,
            Reason TEXT,
            Status TEXT DEFAULT 'COMPLETED',
            CreatedBy INTEGER,
            CreatedAt TEXT,
            UpdatedAt TEXT
        )");

        try {
            self::execDdl($db, "ALTER TABLE security_refunds ADD COLUMN CylinderDepositAmount REAL DEFAULT 0.0");
        } catch (Exception $e) {}
        try {
            self::execDdl($db, "ALTER TABLE security_refunds ADD COLUMN RegulatorDepositAmount REAL DEFAULT 0.0");
        } catch (Exception $e) {}
        try {
            self::execDdl($db, "ALTER TABLE security_refunds ADD COLUMN OriginalSVEra TEXT DEFAULT 'CURRENT'");
        } catch (Exception $e) {}

        // --- SEED INITIAL DATA SAFELY ---
        self::seedInitialData($db);
    }

    private static function seedInitialData(PDO $db): void {
        $now = date('Y-m-d H:i:s');
        $insertIgnore = ($db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql') ? 'INSERT IGNORE' : 'INSERT OR IGNORE';

        // 1. Seed Default Company Profile
        $stmt = $db->query("SELECT COUNT(*) FROM companies");
        if ((int)$stmt->fetchColumn() === 0) {
            $stmt = $db->prepare("INSERT INTO companies (
                CompanyName, LegalName, AgencyName, DistributorCode, ECustCode, HPCLCode,
                AddressLine1, AddressLine2, Village, Block, District, State, PIN,
                Phone, AlternatePhone, Email, GSTIN, PAN, LicenseNumber, BankName,
                BankAccount, IFSC, UPI, OwnerName, ManagerName, BusinessType, OpeningDate,
                Status, CreatedAt, UpdatedAt
            ) VALUES (
                'Shiv Shakti HP Gas', 'Shiv Shakti HP Gas Agency', 'Shiv Shakti HP Gas (Pandaul)', 'HP-PDL-8842', 'EC-884201', 'HPCL-BIH-042',
                'Near High School Chowk, Main Road', 'Pandaul Bazar', 'Pandaul', 'Pandaul', 'Madhubani', 'Bihar', '847234',
                '9431400001', '9431400002', 'shivshaktihpgas.pdl@gmail.com', '10ABCDE1234F1Z5', 'ABCDE1234F', 'GAS/PDL/2012/88', 'State Bank of India',
                '389012345678', 'SBIN0002980', 'shivshakti.gas@sbi', 'Ramesh Kumar Choudhary', 'Sanjay Kumar', 'LPG Distribution Agency', '2012-04-15',
                'ACTIVE', :created, :updated
            )");
            $stmt->execute([':created' => $now, ':updated' => $now]);
        }

        // 2. Seed Default Roles
        $roles = [
            ['ADMIN', 'Full system access & administration', 1],
            ['MANAGER', 'Operational supervisor with report access', 1],
            ['CASHIER', 'Counter POS billing, cashbook, and dues collection', 1],
            ['DELIVERY', 'Hawker & delivery dispatch logs access', 1],
            ['VIEWER', 'Read-only access to records and reports', 1]
        ];
        foreach ($roles as $r) {
            $check = $db->prepare("SELECT COUNT(*) FROM roles WHERE RoleName = ?");
            $check->execute([$r[0]]);
            if ((int)$check->fetchColumn() === 0) {
                $ins = $db->prepare("INSERT INTO roles (RoleName, Description, IsSystem, CreatedAt) VALUES (?, ?, ?, ?)");
                $ins->execute([$r[0], $r[1], $r[2], $now]);
            }
        }

        // 3. Seed Default Permissions
        $modules = [
            'dashboard', 'company', 'users', 'permissions', 'billing', 'customers',
            'dues', 'dispatch', 'stock', 'cashbook', 'employees', 'attendance',
            'salary', 'advances', 'leaves', 'vendors', 'purchases', 'items',
            'reports', 'rojnamcha', 'archive', 'audit', 'settings'
        ];

        foreach ($modules as $mod) {
            // Admin: Full permissions
            $db->exec("$insertIgnore INTO permissions (RoleName, ModuleName, CanCreate, CanRead, CanUpdate, CanDelete, CanExport, CanPrint, CanApprove)
                VALUES ('ADMIN', '$mod', 1, 1, 1, 1, 1, 1, 1)");

            // Manager: All except admin-specific modules
            $isMgmt = in_array($mod, ['users', 'permissions', 'company', 'settings', 'audit']);
            $db->exec("$insertIgnore INTO permissions (RoleName, ModuleName, CanCreate, CanRead, CanUpdate, CanDelete, CanExport, CanPrint, CanApprove)
                VALUES ('MANAGER', '$mod', " . ($isMgmt ? 0 : 1) . ", 1, " . ($isMgmt ? 0 : 1) . ", 0, 1, 1, 1)");

            // Cashier: Billing, Customers, Dues, Cashbook, Print
            $isCashier = in_array($mod, ['dashboard', 'billing', 'customers', 'dues', 'cashbook', 'items', 'reports', 'rojnamcha']);
            $db->exec("$insertIgnore INTO permissions (RoleName, ModuleName, CanCreate, CanRead, CanUpdate, CanDelete, CanExport, CanPrint, CanApprove)
                VALUES ('CASHIER', '$mod', " . ($isCashier ? 1 : 0) . ", " . ($isCashier ? 1 : 0) . ", " . ($isCashier ? 1 : 0) . ", 0, 0, 1, 0)");

            // Delivery: Dispatch, Customers read, Attendance read
            $isDelivery = in_array($mod, ['dashboard', 'dispatch', 'customers', 'attendance']);
            $db->exec("$insertIgnore INTO permissions (RoleName, ModuleName, CanCreate, CanRead, CanUpdate, CanDelete, CanExport, CanPrint, CanApprove)
                VALUES ('DELIVERY', '$mod', " . ($mod === 'dispatch' ? 1 : 0) . ", " . ($isDelivery ? 1 : 0) . ", 0, 0, 0, 1, 0)");

            // Viewer: Read-only
            $db->exec("$insertIgnore INTO permissions (RoleName, ModuleName, CanCreate, CanRead, CanUpdate, CanDelete, CanExport, CanPrint, CanApprove)
                VALUES ('VIEWER', '$mod', 0, 1, 0, 0, 1, 1, 0)");
        }

        // 4. Seed Default Admin User: admin / Admin@12345
        $stmt = $db->query("SELECT COUNT(*) FROM users WHERE Username = 'admin'");
        if ((int)$stmt->fetchColumn() === 0) {
            $salt = bin2hex(random_bytes(16));
            // Salted SHA-256 hash
            $passwordHash = hash('sha256', 'Admin@12345' . $salt);
            $stmt = $db->prepare("INSERT INTO users (
                Username, PasswordHash, Salt, FullName, Email, Mobile, Role, Status,
                ForcePasswordChange, CreatedAt, UpdatedAt
            ) VALUES (
                'admin', :hash, :salt, 'System Administrator', 'admin@shivshaktihpgas.com', '9431400000', 'ADMIN', 'ACTIVE',
                1, :created, :updated
            )");
            $stmt->execute([
                ':hash' => $passwordHash,
                ':salt' => $salt,
                ':created' => $now,
                ':updated' => $now
            ]);
        }

        // 5. Seed Default Item Rates
        $items = [
            ['CYL-142', '14.2 KG Domestic Refill', 'SALE', '14.2 KG Domestic', 925.50, 92550, 5.0, 'Standard domestic subsidized refill', 0],
            ['CYL-190', '19 KG Commercial Refill', 'SALE', '19 KG Commercial', 1880.00, 188000, 18.0, 'Commercial blue cylinder refill', 0],
            ['CYL-050C', '5 KG Commercial Refill', 'SALE', '5 KG Commercial', 520.00, 52000, 18.0, '5 KG commercial cylinder refill', 0],
            ['CYL-050D', '5 KG Domestic FTL Refill', 'SALE', '5 KG Domestic', 370.00, 37000, 5.0, '5 KG domestic free trade LPG refill', 0],
            ['CYL-020C', '2 KG Chotu Refill', 'SALE', '2 KG Commercial', 210.00, 21000, 18.0, '2 KG portable refill', 0],
            ['SD-CYL', 'Cylinder Security Deposit', 'SECURITY_DEPOSIT', '14.2 KG Domestic', 2200.00, 220000, 0.0, 'Refundable cylinder security deposit', 1],
            ['SD-REG', 'DPR Regulator Security Deposit', 'SECURITY_DEPOSIT', NULL, 250.00, 25000, 0.0, 'Refundable regulator security deposit', 1],
            ['HOSE-15', 'Suraksha LPG Hose 1.5M', 'SALE', NULL, 190.00, 19000, 18.0, 'ISI certified steel braided safety hose', 1],
            ['STOVE-2B', 'Domestic LPG Stove 2-Burner', 'SALE', NULL, 1450.00, 145000, 18.0, 'ISI 2-Burner stainless steel cooktop', 1],
            ['FEE-PASS', 'Blue Book / Passbook Fee', 'SERVICE', NULL, 50.00, 5000, 0.0, 'Consumer booklet & documentation', 1],
            ['FEE-ADMIN', 'New Connection Admin & DGCC Charge', 'SERVICE', NULL, 118.00, 11800, 18.0, 'Installation inspection & registration', 1],
            ['SRV-INSP', 'Mandatory 5-Yr Safety Inspection', 'SERVICE', NULL, 236.00, 23600, 18.0, 'Mandatory domestic checkup service', 0]
        ];

        foreach ($items as $it) {
            $check = $db->prepare("SELECT COUNT(*) FROM item_rates WHERE ItemCode = ?");
            $check->execute([$it[0]]);
            if ((int)$check->fetchColumn() === 0) {
                $ins = $db->prepare("INSERT INTO item_rates (
                    ItemCode, ItemName, Category, CylinderType, Rate, RatePaise, TaxPercent,
                    Description, IsPackageItem, Status, CreatedAt, UpdatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)");
                $ins->execute([$it[0], $it[1], $it[2], $it[3], $it[4], $it[5], $it[6], $it[7], $it[8], $now, $now]);
            }
        }

        // 6. Seed Default Settings
        $settings = [
            ['LOW_STOCK_THRESHOLD_142', '50', 'INVENTORY', 'Alert threshold for 14.2 KG Domestic full cylinders'],
            ['LOW_STOCK_THRESHOLD_190', '15', 'INVENTORY', 'Alert threshold for 19 KG Commercial full cylinders'],
            ['LOW_STOCK_THRESHOLD_050', '10', 'INVENTORY', 'Alert threshold for 5 KG cylinders'],
            ['DEFAULT_THEME', 'navy', 'UI', 'Default interface theme'],
            ['DARK_MODE', '0', 'UI', 'Default dark mode state'],
            ['ALLOW_PARTIAL_DUES', '1', 'BILLING', 'Allow partial bill dues settlement'],
            ['PRINT_FOOTER_NOTE', 'HP Gas Suraksha Sanrakshit. For LPG Emergency Call 1906. Thank You!', 'PRINT', 'Footer note printed on bills and receipts'],
            ['AUTO_ARCHIVE_ENABLED', '1', 'SYSTEM', 'Enable daily automated closing archive'],
            ['GST_ENABLED', '1', 'TAX', 'Enable GST calculation on commercial and service items']
        ];

        foreach ($settings as $st) {
            $check = $db->prepare("SELECT COUNT(*) FROM settings WHERE SettingKey = ?");
            $check->execute([$st[0]]);
            if ((int)$check->fetchColumn() === 0) {
                $ins = $db->prepare("INSERT INTO settings (SettingKey, SettingValue, Category, Description, UpdatedAt) VALUES (?, ?, ?, ?, ?)");
                $ins->execute([$st[0], $st[1], $st[2], $st[3], $now]);
            }
        }

        // 7. Seed Official Delivery Hawkers (Matching Agency Rojnamcha Sheet)
        $defaultHawkers = [
            ['HWK-001', 'MONU', '9800000001', 'Hawker', '2025-01-01', 12000.0, 15.0],
            ['HWK-002', 'SAROJ', '9800000002', 'Hawker', '2025-01-01', 12000.0, 15.0],
            ['HWK-003', 'BHOGENDRA', '9800000003', 'Hawker', '2025-01-01', 12000.0, 15.0],
            ['HWK-004', 'RAVI PRAKASH', '9800000004', 'Hawker', '2025-01-01', 12000.0, 15.0],
            ['HWK-005', 'GENA LAL', '9800000005', 'Hawker', '2025-01-01', 12000.0, 15.0],
            ['HWK-006', 'BECHAN', '9800000006', 'Hawker', '2025-01-01', 12000.0, 15.0],
            ['HWK-007', 'DINESH', '9800000007', 'Hawker', '2025-01-01', 12000.0, 15.0],
            ['HWK-008', 'MANTUN', '9800000008', 'Hawker', '2025-01-01', 12000.0, 15.0],
            ['HWK-009', 'BAJRANGI', '9800000009', 'Hawker', '2025-01-01', 12000.0, 15.0],
            ['HWK-010', 'SUJIT', '9800000010', 'Hawker', '2025-01-01', 12000.0, 15.0],
            ['HWK-011', 'SANJAY', '9800000011', 'Hawker', '2025-01-01', 12000.0, 15.0]
        ];

        foreach ($defaultHawkers as $hwk) {
            $chk = $db->prepare("SELECT COUNT(*) FROM employees WHERE Name = ? OR EmpCode = ?");
            $chk->execute([$hwk[1], $hwk[0]]);
            if ((int)$chk->fetchColumn() === 0) {
                $insHwk = $db->prepare("INSERT INTO employees (EmpCode, Name, Mobile, Role, JoiningDate, Salary, PerDeliveryRate, Status, CreatedAt, UpdatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)");
                $insHwk->execute([$hwk[0], $hwk[1], $hwk[2], $hwk[3], $hwk[4], $hwk[5], $hwk[6], $now, $now]);
            }
        }
    }
}
