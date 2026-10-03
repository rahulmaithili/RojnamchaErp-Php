<?php
/**
 * CustomerController
 * Complete CRM 360, Customer Master, Refill Tracking & Interaction History
 */
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../audit.php';
require_once __DIR__ . '/../auth.php';

class CustomerController {
    public static function handle(string $action, array $payload, ?array $user): array {
        if (!$user || !Auth::checkPermission($user, 'customers', 'read')) {
            return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
        }

        $db = Database::getConnection();

        switch ($action) {
            case 'listCustomers':
                $search = trim($payload['search'] ?? '');
                $status = $payload['status'] ?? 'active';
                $connType = $payload['connectionType'] ?? 'all';

                $sql = "SELECT CustomerID, CustomerCode, Name, Mobile, AltMobile, ConsumerNo, LPGID, 
                               Address, Area, Village, ConnectionType, CylinderType, AadhaarLast4, 
                               Status, CurrentDues, LifetimeValue, TotalRefills, LastRefillDate, IsDeleted, CreatedAt 
                        FROM customers WHERE 1=1";
                $params = [];

                if ($status === 'active') {
                    $sql .= " AND IsDeleted = 0";
                } elseif ($status === 'deleted') {
                    $sql .= " AND IsDeleted = 1";
                }

                if ($connType !== 'all') {
                    $sql .= " AND ConnectionType = ?";
                    $params[] = $connType;
                }

                if (!empty($search)) {
                    $sql .= " AND (Name LIKE ? OR Mobile LIKE ? OR ConsumerNo LIKE ? OR LPGID LIKE ? OR Area LIKE ?)";
                    $term = "%$search%";
                    $params[] = $term;
                    $params[] = $term;
                    $params[] = $term;
                    $params[] = $term;
                    $params[] = $term;
                }

                $sql .= " ORDER BY CustomerID DESC LIMIT " . MAX_PAGE_SIZE;
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $customers = $stmt->fetchAll();

                return ['ok' => true, 'data' => $customers];

            case 'getCustomer':
                $custId = (int)($payload['CustomerID'] ?? 0);
                $stmt = $db->prepare("SELECT * FROM customers WHERE CustomerID = ?");
                $stmt->execute([$custId]);
                $cust = $stmt->fetch();
                if (!$cust) {
                    return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Customer not found.']];
                }
                return ['ok' => true, 'data' => $cust];

            case 'getCustomer360':
                $custId = (int)($payload['CustomerID'] ?? 0);
                $stmt = $db->prepare("SELECT * FROM customers WHERE CustomerID = ?");
                $stmt->execute([$custId]);
                $cust = $stmt->fetch();
                if (!$cust) {
                    return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Customer not found.']];
                }

                // Recent Bills
                $billStmt = $db->prepare("SELECT BillID, BillNumber, BillDate, TotalAmount, PaidCash, PaidUPI, PaidDues, Status, IsCancelled 
                    FROM bills WHERE CustomerID = ? AND IsDeleted = 0 ORDER BY BillID DESC LIMIT 10");
                $billStmt->execute([$custId]);
                $bills = $billStmt->fetchAll();

                // Dues Records
                $dueStmt = $db->prepare("SELECT DueID, DueNumber, DueDate, OriginalAmount, PaidAmount, RemainingAmount, Status, IsWrittenOff 
                    FROM customer_dues WHERE CustomerID = ? ORDER BY DueID DESC");
                $dueStmt->execute([$custId]);
                $dues = $dueStmt->fetchAll();

                // Interactions
                $intStmt = $db->prepare("SELECT * FROM customer_interactions WHERE CustomerID = ? ORDER BY InteractionID DESC LIMIT 10");
                $intStmt->execute([$custId]);
                $interactions = $intStmt->fetchAll();

                // Followups
                $folStmt = $db->prepare("SELECT * FROM followups WHERE CustomerID = ? ORDER BY FollowupID DESC LIMIT 10");
                $folStmt->execute([$custId]);
                $followups = $folStmt->fetchAll();

                // Calculate average refill days
                $refillDates = $db->prepare("SELECT BillDate FROM bills WHERE CustomerID = ? AND IsCancelled = 0 AND IsDeleted = 0 ORDER BY BillDate ASC");
                $refillDates->execute([$custId]);
                $dates = $refillDates->fetchAll(PDO::FETCH_COLUMN);

                $avgGap = 0;
                if (count($dates) > 1) {
                    $first = strtotime($dates[0]);
                    $last = strtotime(end($dates));
                    $diffDays = ($last - $first) / 86400;
                    $avgGap = round($diffDays / (count($dates) - 1));
                }

                return [
                    'ok' => true,
                    'data' => [
                        'customer' => $cust,
                        'bills' => $bills,
                        'dues' => $dues,
                        'interactions' => $interactions,
                        'followups' => $followups,
                        'metrics' => [
                            'averageRefillDays' => $avgGap,
                            'totalBillsCount' => count($dates)
                        ]
                    ]
                ];

            case 'saveCustomer':
                if (!Auth::checkPermission($user, 'customers', 'update') && !Auth::checkPermission($user, 'customers', 'create')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }

                $custId = !empty($payload['CustomerID']) ? (int)$payload['CustomerID'] : null;
                $name = trim($payload['Name'] ?? '');
                $mobile = trim($payload['Mobile'] ?? '');
                $consumerNo = trim($payload['ConsumerNo'] ?? '');
                $lpgId = trim($payload['LPGID'] ?? '');
                $address = trim($payload['Address'] ?? '');
                $area = trim($payload['Area'] ?? '');
                $village = trim($payload['Village'] ?? '');
                $connType = trim($payload['ConnectionType'] ?? 'DOMESTIC');
                $cylType = trim($payload['CylinderType'] ?? '14.2 KG Domestic');
                $aadhaar = trim($payload['AadhaarLast4'] ?? '');
                $now = date('Y-m-d H:i:s');

                if (empty($name) || empty($mobile)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Customer Name and Mobile are required.']];
                }

                if (!preg_match('/^[0-9]{10}$/', $mobile)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Mobile must be a valid 10-digit number.']];
                }

                // Never store full Aadhaar
                if (strlen($aadhaar) > 4) {
                    $aadhaar = substr($aadhaar, -4);
                }

                if ($custId) {
                    // Update
                    $stmt = $db->prepare("SELECT * FROM customers WHERE CustomerID = ?");
                    $stmt->execute([$custId]);
                    $old = $stmt->fetch();
                    if (!$old) {
                        return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Customer not found.']];
                    }

                    // Duplicate mobile check
                    $chk = $db->prepare("SELECT CustomerID FROM customers WHERE Mobile = ? AND CustomerID != ? AND IsDeleted = 0");
                    $chk->execute([$mobile, $custId]);
                    if ($chk->fetch()) {
                        return ['ok' => false, 'error' => ['code' => 'CONFLICT', 'message' => 'Another customer with this mobile already exists.']];
                    }

                    $upd = $db->prepare("UPDATE customers SET 
                        Name = ?, Mobile = ?, AltMobile = ?, ConsumerNo = ?, LPGID = ?,
                        Address = ?, Area = ?, Village = ?, ConnectionType = ?, CylinderType = ?,
                        AadhaarLast4 = ?, Status = ?, Notes = ?, DOB = ?, UpdatedBy = ?, UpdatedAt = ?
                        WHERE CustomerID = ?");
                    $upd->execute([
                        $name, $mobile, trim($payload['AltMobile'] ?? ''), $consumerNo, $lpgId,
                        $address, $area, $village, $connType, $cylType,
                        $aadhaar, trim($payload['Status'] ?? 'ACTIVE'), trim($payload['Notes'] ?? ''),
                        $payload['DOB'] ?? null, $user['userId'], $now, $custId
                    ]);

                    Audit::log($user['userId'], $user['username'], 'UPDATE', 'customers', (string)$custId, $old, $payload, 'Customer updated');
                    return ['ok' => true, 'data' => ['CustomerID' => $custId], 'message' => 'Customer profile updated.'];
                } else {
                    // Create
                    $chk = $db->prepare("SELECT CustomerID FROM customers WHERE Mobile = ? AND IsDeleted = 0");
                    $chk->execute([$mobile]);
                    if ($chk->fetch()) {
                        return ['ok' => false, 'error' => ['code' => 'CONFLICT', 'message' => 'Customer with this mobile already exists.']];
                    }

                    $seq = (int)$db->query("SELECT COUNT(*) FROM customers")->fetchColumn() + 1;
                    $code = sprintf("CUST-%s-%04d", date('Ymd'), $seq);

                    $ins = $db->prepare("INSERT INTO customers (
                        CustomerCode, Name, Mobile, AltMobile, ConsumerNo, LPGID, Address, Area, Village,
                        ConnectionType, CylinderType, AadhaarLast4, Status, Notes, DOB, CreatedBy, CreatedAt, UpdatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?)");
                    $ins->execute([
                        $code, $name, $mobile, trim($payload['AltMobile'] ?? ''), $consumerNo, $lpgId,
                        $address, $area, $village, $connType, $cylType, $aadhaar,
                        trim($payload['Notes'] ?? ''), $payload['DOB'] ?? null, $user['userId'], $now, $now
                    ]);
                    $newId = (int)$db->lastInsertId();

                    Audit::log($user['userId'], $user['username'], 'CREATE', 'customers', (string)$newId, null, $payload, 'Customer created');
                    return ['ok' => true, 'data' => ['CustomerID' => $newId, 'CustomerCode' => $code], 'message' => 'Customer created successfully.'];
                }

            case 'deleteCustomer':
                if (!Auth::checkPermission($user, 'customers', 'delete')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }
                $delId = (int)($payload['CustomerID'] ?? 0);
                $now = date('Y-m-d H:i:s');
                $stmt = $db->prepare("UPDATE customers SET IsDeleted = 1, DeletedBy = ?, DeletedAt = ? WHERE CustomerID = ?");
                $stmt->execute([$user['userId'], $now, $delId]);

                Audit::log($user['userId'], $user['username'], 'SOFT_DELETE', 'customers', (string)$delId, null, null, 'Customer soft deleted');
                return ['ok' => true, 'data' => null, 'message' => 'Customer deleted.'];

            case 'restoreCustomer':
                if ($user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin authorization required.']];
                }
                $resId = (int)($payload['CustomerID'] ?? 0);
                $stmt = $db->prepare("UPDATE customers SET IsDeleted = 0, DeletedBy = NULL, DeletedAt = NULL WHERE CustomerID = ?");
                $stmt->execute([$resId]);

                Audit::log($user['userId'], $user['username'], 'RESTORE', 'customers', (string)$resId, null, null, 'Customer restored');
                return ['ok' => true, 'data' => null, 'message' => 'Customer restored.'];

            case 'addInteraction':
                $custId = (int)($payload['CustomerID'] ?? 0);
                $type = trim($payload['Type'] ?? 'NOTE');
                $notes = trim($payload['Notes'] ?? '');
                if (!$custId || empty($notes)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Customer and notes are required.']];
                }

                $now = date('Y-m-d H:i:s');
                $stmt = $db->prepare("INSERT INTO customer_interactions (CustomerID, Type, Notes, CreatedBy, CreatedAt) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$custId, $type, $notes, $user['userId'], $now]);

                return ['ok' => true, 'data' => null, 'message' => 'Interaction added.'];

            case 'getRefillReminders':
                // Find active customers whose last refill was > 25 days ago
                $cutoffDate = date('Y-m-d', strtotime('-25 days'));
                $stmt = $db->prepare("SELECT CustomerID, CustomerCode, Name, Mobile, ConsumerNo, Area, LastRefillDate, TotalRefills 
                    FROM customers 
                    WHERE IsDeleted = 0 AND Status = 'ACTIVE' AND LastRefillDate <= ? AND LastRefillDate IS NOT NULL 
                    ORDER BY LastRefillDate ASC LIMIT 50");
                $stmt->execute([$cutoffDate]);
                $reminders = $stmt->fetchAll();

                return ['ok' => true, 'data' => $reminders];

            default:
                return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Invalid customer action.']];
        }
    }
}
