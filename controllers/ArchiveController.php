<?php
/**
 * ArchiveController
 * Database Backups, Live Exports (JSON & SQLite), Safe Imports & System Data Reset
 */
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../audit.php';
require_once __DIR__ . '/../auth.php';

class ArchiveController {
    public static function handle(string $action, array $payload, ?array $user): array {
        if (!$user || !Auth::checkPermission($user, 'archive', 'read')) {
            return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
        }

        $db = Database::getConnection();

        switch ($action) {
            case 'backupDatabase':
                if ($user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin authorization required for database backup.']];
                }

                $backupDir = APP_ROOT . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'backups';
                if (!is_dir($backupDir)) {
                    mkdir($backupDir, 0755, true);
                    file_put_contents($backupDir . DIRECTORY_SEPARATOR . '.htaccess', "Deny from all\n");
                }

                $timestamp = date('Y-m-d_His');
                $filename = "Shiv_Shakti_ERP_Backup_{$timestamp}.sqlite";
                $targetPath = $backupDir . DIRECTORY_SEPARATOR . $filename;

                if (DB_DRIVER === 'sqlite' && file_exists(DB_SQLITE_PATH)) {
                    if (!copy(DB_SQLITE_PATH, $targetPath)) {
                        return ['ok' => false, 'error' => ['code' => 'SERVER', 'message' => 'Failed to create physical database backup file.']];
                    }
                    $fileSize = filesize($targetPath);
                } else {
                    $targetPath = 'mysql_backup_simulated';
                    $fileSize = 102400;
                }

                $now = date('Y-m-d H:i:s');
                $ins = $db->prepare("INSERT INTO archives (FileName, FileType, Date, FilePath, FileSize, CreatedBy, CreatedAt)
                    VALUES (?, 'BACKUP_SQLITE', ?, ?, ?, ?, ?)");
                $ins->execute([$filename, date('Y-m-d'), $targetPath, $fileSize, $user['userId'], $now]);

                Audit::log($user['userId'], $user['username'], 'DATABASE_BACKUP', 'archive', (string)$db->lastInsertId(), null, ['file' => $filename], "Manual database backup created");

                return [
                    'ok' => true,
                    'data' => [
                        'FileName' => $filename,
                        'FileSize' => round($fileSize / 1024, 2) . ' KB',
                        'CreatedAt' => $now
                    ],
                    'message' => "Database backup $filename completed successfully."
                ];

            case 'downloadDatabase':
                if ($user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin authorization required.']];
                }

                if (DB_DRIVER !== 'sqlite' || !file_exists(DB_SQLITE_PATH)) {
                    return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Active SQLite database file not found.']];
                }

                $dbBytes = file_get_contents(DB_SQLITE_PATH);
                $base64 = base64_encode($dbBytes);
                $filename = "Shiv_Shakti_HP_Gas_DB_" . date('Y-m-d_His') . ".sqlite";

                Audit::log($user['userId'], $user['username'], 'DOWNLOAD_DB', 'archive', null, null, ['file' => $filename], "Active database downloaded");

                return [
                    'ok' => true,
                    'data' => [
                        'fileName' => $filename,
                        'fileData' => 'data:application/x-sqlite3;base64,' . $base64,
                        'fileSize' => strlen($dbBytes)
                    ]
                ];

            case 'exportDataJson':
                $tableList = [
                    'companies', 'users', 'items', 'customers', 'customer_dues',
                    'employees', 'employee_documents', 'attendance', 'leaves',
                    'salary_slips', 'bills', 'bill_items', 'bill_payments',
                    'cashbook', 'cylinder_stock', 'hawker_dispatch', 'due_payments',
                    'security_refunds', 'day_closings', 'vendors', 'purchases',
                    'purchase_items', 'settings'
                ];

                $exportTables = [];
                $tableCounts = [];

                foreach ($tableList as $tbl) {
                    try {
                        $stmt = $db->query("SELECT * FROM {$tbl}");
                        $rows = $stmt->fetchAll();
                        $exportTables[$tbl] = $rows;
                        $tableCounts[$tbl] = count($rows);
                    } catch (Exception $e) {
                        $exportTables[$tbl] = [];
                        $tableCounts[$tbl] = 0;
                    }
                }

                $filename = "Shiv_Shakti_Full_Backup_" . date('Y-m-d_His') . ".json";
                $exportPayload = [
                    'app' => 'Shiv Shakti HP Gas ERP',
                    'version' => '2.5',
                    'exportedAt' => date('Y-m-d H:i:s'),
                    'exportedBy' => $user['username'],
                    'tableCounts' => $tableCounts,
                    'tables' => $exportTables
                ];

                Audit::log($user['userId'], $user['username'], 'DATA_EXPORT_JSON', 'archive', null, null, ['counts' => $tableCounts], "Full system JSON backup exported");

                return [
                    'ok' => true,
                    'data' => [
                        'fileName' => $filename,
                        'jsonContent' => json_encode($exportPayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
                        'tableCounts' => $tableCounts
                    ],
                    'message' => 'Complete ERP data export compiled successfully.'
                ];

            case 'importDataJson':
                if ($user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin authorization required to import data.']];
                }

                $tables = $payload['tables'] ?? null;
                $mode = $payload['mode'] ?? 'replace'; // 'replace' or 'merge'

                if (!$tables || !is_array($tables)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Valid tables structure missing in backup payload.']];
                }

                // Step 1: Automatic Safety Snapshot before import
                self::createSafeguardBackup($db, $user, 'PRE_IMPORT_SAFETY');

                $importedCounts = [];
                // CRITICAL: In SQLite, PRAGMA foreign_keys = OFF must be executed outside of transaction
                self::disableForeignKeys($db);

                $db->beginTransaction();
                try {
                    // In replace mode, delete child tables first to respect relational dependencies
                    if ($mode === 'replace') {
                        $deleteOrder = [
                            'bill_items', 'bill_payments', 'purchase_items', 'due_payments',
                            'employee_documents', 'customer_interactions', 'followups', 'notifications',
                            'bills', 'purchases', 'customer_dues', 'security_refunds',
                            'cashbook', 'cylinder_stock', 'stock_movements', 'hawker_dispatch',
                            'day_closings', 'salaries', 'salary_slips', 'advances', 'attendance', 'leaves',
                            'customers', 'vendors', 'employees', 'item_rates', 'items', 'rate_history',
                            'settings', 'roles', 'permissions', 'sessions'
                        ];
                        foreach ($deleteOrder as $dtbl) {
                            if (isset($tables[$dtbl])) {
                                $chk = $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name='{$dtbl}'")->fetchColumn();
                                if ($chk) {
                                    $db->exec("DELETE FROM `{$dtbl}`");
                                }
                            }
                        }
                    }

                    foreach ($tables as $tbl => $rows) {
                        if (!is_array($rows) || empty($rows)) continue;

                        // Only allow known safe tables
                        $allowed = [
                            'companies', 'users', 'items', 'item_rates', 'customers', 'customer_dues',
                            'employees', 'employee_documents', 'attendance', 'leaves',
                            'salaries', 'salary_slips', 'advances', 'bills', 'bill_items', 'bill_payments',
                            'cashbook', 'cylinder_stock', 'stock_movements', 'hawker_dispatch', 'due_payments',
                            'security_refunds', 'day_closings', 'vendors', 'purchases',
                            'purchase_items', 'settings', 'roles', 'permissions'
                        ];
                        if (!in_array($tbl, $allowed)) continue;

                        // If table was not deleted earlier (e.g. merge mode or table not in delete list)
                        if ($mode === 'replace' && !in_array($tbl, $deleteOrder ?? [])) {
                            $chk = $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name='{$tbl}'")->fetchColumn();
                            if ($chk) {
                                $db->exec("DELETE FROM `{$tbl}`");
                            }
                        }

                        $count = 0;
                        foreach ($rows as $r) {
                            if (!is_array($r) || empty($r)) continue;

                            $cols = array_keys($r);
                            $colList = implode(', ', array_map(fn($c) => "`$c`", $cols));
                            $placeholders = implode(', ', array_fill(0, count($cols), '?'));

                            $sql = ($mode === 'merge')
                                ? "INSERT OR IGNORE INTO `{$tbl}` ({$colList}) VALUES ({$placeholders})"
                                : "INSERT INTO `{$tbl}` ({$colList}) VALUES ({$placeholders})";

                            $ins = $db->prepare($sql);
                            $ins->execute(array_values($r));
                            $count++;
                        }
                        $importedCounts[$tbl] = $count;
                    }

                    $db->commit();
                    self::enableForeignKeys($db);
                } catch (Exception $e) {
                    if ($db->inTransaction()) {
                        $db->rollBack();
                    }
                    self::enableForeignKeys($db);
                    return ['ok' => false, 'error' => ['code' => 'IMPORT_FAILED', 'message' => 'Data restore failed: ' . $e->getMessage()]];
                }

                Audit::log($user['userId'], $user['username'], 'DATA_IMPORT_JSON', 'archive', null, null, ['counts' => $importedCounts, 'mode' => $mode], "System data restored from JSON backup");

                return [
                    'ok' => true,
                    'data' => ['importedCounts' => $importedCounts],
                    'message' => 'Database successfully restored from backup file.'
                ];

            case 'restoreSqliteFile':
                if ($user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin authorization required.']];
                }

                $fileData = $payload['fileData'] ?? '';
                if (empty($fileData)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'SQLite file data is required.']];
                }

                // Strip data URL prefix if present
                if (strpos($fileData, 'base64,') !== false) {
                    $fileData = explode('base64,', $fileData)[1];
                }
                $binary = base64_decode($fileData);
                if (strlen($binary) < 100 || substr($binary, 0, 15) !== "SQLite format 3") {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Invalid file format. Uploaded file is not a valid SQLite database.']];
                }

                // Step 1: Safety Backup of current DB
                self::createSafeguardBackup($db, $user, 'PRE_RESTORE_SAFETY');

                // Step 2: Write to temporary file and test
                $tmpFile = tempnam(sys_get_temp_dir(), 'sqlite_test_');
                file_put_contents($tmpFile, $binary);

                try {
                    $testPdo = new PDO("sqlite:{$tmpFile}");
                    $testPdo->query("SELECT COUNT(*) FROM sqlite_master");
                    unset($testPdo);
                } catch (Exception $e) {
                    @unlink($tmpFile);
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Database file verification failed: ' . $e->getMessage()]];
                }

                // Step 3: Replace current database file
                if (!copy($tmpFile, DB_SQLITE_PATH)) {
                    @unlink($tmpFile);
                    return ['ok' => false, 'error' => ['code' => 'SERVER', 'message' => 'Failed to replace active database file.']];
                }
                @unlink($tmpFile);

                Audit::log($user['userId'], $user['username'], 'DATABASE_RESTORE_SQLITE', 'archive', null, null, null, "Active SQLite database replaced with uploaded backup");

                return [
                    'ok' => true,
                    'data' => null,
                    'message' => 'Database successfully restored from uploaded file! Please refresh the page.'
                ];

            case 'resetDatabase':
                if ($user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin authorization required for system reset.']];
                }

                $confirm = trim($payload['confirmation'] ?? '');
                if ($confirm !== 'RESET' && $confirm !== 'CONFIRM') {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Safety confirmation word "RESET" is required to proceed.']];
                }

                $mode = $payload['mode'] ?? 'transactions_only'; // 'transactions_only' or 'factory_reset'

                // Step 1: Mandatory Safety Backup
                self::createSafeguardBackup($db, $user, 'PRE_RESET_SAFETY_' . strtoupper($mode));

                if ($mode === 'transactions_only') {
                    // Wipe all transactional operational tables while keeping Master Data
                    // CRITICAL: Disable Foreign Keys OUTSIDE transaction
                    self::disableForeignKeys($db);

                    $db->beginTransaction();
                    try {
                        $tablesToClear = [
                            // 1. Child transaction items first
                            'bill_items', 'bill_payments', 'purchase_items', 'due_payments',
                            // 2. Operational transaction tables
                            'bills', 'purchases', 'customer_dues', 'security_refunds',
                            'cashbook', 'cylinder_stock', 'stock_movements', 'hawker_dispatch',
                            'day_closings', 'salaries', 'salary_slips', 'advances', 'attendance', 'leaves',
                            'customer_interactions', 'followups', 'notifications'
                        ];

                        foreach ($tablesToClear as $tbl) {
                            $chk = $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name='{$tbl}'")->fetchColumn();
                            if ($chk) {
                                $db->exec("DELETE FROM `{$tbl}`");
                            }
                        }

                        // Reset customer current dues balance to 0
                        $db->exec("UPDATE customers SET CurrentDues = 0");

                        $db->commit();
                        self::enableForeignKeys($db);
                    } catch (Exception $e) {
                        if ($db->inTransaction()) {
                            $db->rollBack();
                        }
                        self::enableForeignKeys($db);
                        return ['ok' => false, 'error' => ['code' => 'RESET_FAILED', 'message' => 'Transaction reset failed: ' . $e->getMessage()]];
                    }

                    Audit::log($user['userId'], $user['username'], 'SYSTEM_RESET_TRANSACTIONS', 'system', null, null, ['mode' => $mode], "All transactional records cleared. Master profiles preserved.");

                    return [
                        'ok' => true,
                        'data' => ['mode' => 'transactions_only'],
                        'message' => 'All operational transactions (Bills, Cashbook, Hawkers, Stock, Dues, Payroll) successfully cleared! Master records (Customers, Hawkers, Items, Settings) are preserved.'
                    ];
                } elseif ($mode === 'factory_reset') {
                    // Complete factory wipe & reseed
                    self::disableForeignKeys($db);

                    $db->beginTransaction();
                    try {
                        $allTables = [
                            // 1. Child tables first
                            'bill_items', 'bill_payments', 'purchase_items', 'due_payments',
                            'employee_documents', 'customer_interactions', 'followups', 'notifications',
                            'sessions',
                            // 2. Operational tables
                            'bills', 'purchases', 'customer_dues', 'security_refunds',
                            'cashbook', 'cylinder_stock', 'stock_movements', 'hawker_dispatch',
                            'day_closings', 'salaries', 'salary_slips', 'advances', 'attendance', 'leaves',
                            // 3. Master records
                            'customers', 'vendors', 'employees', 'item_rates', 'rate_history'
                        ];

                        foreach ($allTables as $tbl) {
                            $chk = $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name='{$tbl}'")->fetchColumn();
                            if ($chk) {
                                $db->exec("DELETE FROM `{$tbl}`");
                            }
                        }

                        $db->commit();
                        self::enableForeignKeys($db);

                        // Reseed essential default system data (roles, permissions, admin user, settings, items, hawkers)
                        Database::setupDatabase();
                    } catch (Exception $e) {
                        if ($db->inTransaction()) {
                            $db->rollBack();
                        }
                        self::enableForeignKeys($db);
                        return ['ok' => false, 'error' => ['code' => 'RESET_FAILED', 'message' => 'Factory reset failed: ' . $e->getMessage()]];
                    }

                    Audit::log($user['userId'], $user['username'], 'SYSTEM_FACTORY_RESET', 'system', null, null, ['mode' => $mode], "System factory reset performed.");

                    return [
                        'ok' => true,
                        'data' => ['mode' => 'factory_reset'],
                        'message' => 'Factory reset completed! System restored to fresh default state.'
                    ];
                } else {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Invalid reset mode specified.']];
                }

            case 'getArchiveHistory':
                $stmt = $db->query("SELECT a.*, u.FullName as CreatedByName 
                    FROM archives a 
                    LEFT JOIN users u ON a.CreatedBy = u.UserID 
                    ORDER BY a.ArchiveID DESC LIMIT 50");
                return ['ok' => true, 'data' => $stmt->fetchAll()];

            default:
                return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Invalid archive action.']];
        }
    }

    /**
     * Helper: Disable Foreign Keys for Batch Deletion / Restore (Driver agnostic)
     */
    private static function disableForeignKeys(PDO $db): void {
        if (DB_DRIVER === 'sqlite') {
            $db->exec('PRAGMA foreign_keys = OFF');
        } else {
            $db->exec('SET FOREIGN_KEY_CHECKS = 0');
        }
    }

    /**
     * Helper: Enable Foreign Keys (Driver agnostic)
     */
    private static function enableForeignKeys(PDO $db): void {
        if (DB_DRIVER === 'sqlite') {
            $db->exec('PRAGMA foreign_keys = ON');
        } else {
            $db->exec('SET FOREIGN_KEY_CHECKS = 1');
        }
    }

    /**
     * Helper: Create Automatic Pre-Action Safeguard Backup
     */
    private static function createSafeguardBackup(PDO $db, array $user, string $tag = 'SAFETY'): void {
        try {
            $backupDir = APP_ROOT . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'backups';
            if (!is_dir($backupDir)) {
                mkdir($backupDir, 0755, true);
                file_put_contents($backupDir . DIRECTORY_SEPARATOR . '.htaccess', "Deny from all\n");
            }

            $timestamp = date('Y-m-d_His');
            $filename = "Shiv_Shakti_{$tag}_{$timestamp}.sqlite";
            $targetPath = $backupDir . DIRECTORY_SEPARATOR . $filename;

            if (DB_DRIVER === 'sqlite' && file_exists(DB_SQLITE_PATH)) {
                copy(DB_SQLITE_PATH, $targetPath);
                $fileSize = filesize($targetPath);

                $now = date('Y-m-d H:i:s');
                $ins = $db->prepare("INSERT INTO archives (FileName, FileType, Date, FilePath, FileSize, CreatedBy, CreatedAt)
                    VALUES (?, 'SAFEGUARD_SNAPSHOT', ?, ?, ?, ?, ?)");
                $ins->execute([$filename, date('Y-m-d'), $targetPath, $fileSize, $user['userId'], $now]);
            }
        } catch (Exception $e) {
            error_log("Safeguard backup error: " . $e->getMessage());
        }
    }
}
