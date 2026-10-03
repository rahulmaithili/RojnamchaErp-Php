<?php
/**
 * HrController
 * Employee Master, Daily Attendance Calendar, Advance Tracking, Payroll Engine & Leaves
 */
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../audit.php';
require_once __DIR__ . '/../auth.php';

class HrController {
    public static function handle(string $action, array $payload, ?array $user): array {
        if (!$user || !Auth::checkPermission($user, 'employees', 'read')) {
            return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
        }

        $db = Database::getConnection();

        switch ($action) {
            case 'listEmployees':
                $status = $payload['status'] ?? 'active';
                $search = trim($payload['search'] ?? '');

                $sql = "SELECT * FROM employees WHERE 1=1";
                $params = [];

                if ($status === 'active') {
                    $sql .= " AND IsDeleted = 0";
                } elseif ($status === 'deleted') {
                    $sql .= " AND IsDeleted = 1";
                }

                if (!empty($search)) {
                    $sql .= " AND (Name LIKE ? OR Mobile LIKE ? OR Role LIKE ? OR EmpCode LIKE ?)";
                    $term = "%$search%";
                    $params[] = $term;
                    $params[] = $term;
                    $params[] = $term;
                    $params[] = $term;
                }

                $sql .= " ORDER BY EmpID DESC";
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $employees = $stmt->fetchAll();

                return ['ok' => true, 'data' => $employees];

            case 'saveEmployee':
                if (!Auth::checkPermission($user, 'employees', 'update') && !Auth::checkPermission($user, 'employees', 'create')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }

                $empId = !empty($payload['EmpID']) ? (int)$payload['EmpID'] : null;
                $name = trim($payload['Name'] ?? '');
                $mobile = trim($payload['Mobile'] ?? '');
                $role = trim($payload['Role'] ?? 'Hawker');
                $joiningDate = $payload['JoiningDate'] ?? date('Y-m-d');
                $salary = (float)($payload['Salary'] ?? 0);
                $deliveryRate = (float)($payload['PerDeliveryRate'] ?? 0);
                $status = trim($payload['Status'] ?? 'ACTIVE');
                $now = date('Y-m-d H:i:s');

                if (empty($name) || empty($mobile)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Employee name and mobile are required.']];
                }

                if ($empId) {
                    // Update
                    $stmt = $db->prepare("SELECT * FROM employees WHERE EmpID = ?");
                    $stmt->execute([$empId]);
                    $old = $stmt->fetch();
                    if (!$old) {
                        return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Employee not found.']];
                    }

                    $chk = $db->prepare("SELECT EmpID FROM employees WHERE Mobile = ? AND EmpID != ? AND IsDeleted = 0");
                    $chk->execute([$mobile, $empId]);
                    if ($chk->fetch()) {
                        return ['ok' => false, 'error' => ['code' => 'CONFLICT', 'message' => 'Another employee with this mobile already exists.']];
                    }

                    $photoClause = "";
                    $params = [
                        $name, $mobile, $role, $joiningDate, $salary, $deliveryRate,
                        $status, trim($payload['EmergencyContact'] ?? ''), trim($payload['Address'] ?? ''),
                        trim($payload['BankDetails'] ?? '')
                    ];
                    if (array_key_exists('Photo', $payload)) {
                        $photoClause = ", Photo = ?";
                        $params[] = $payload['Photo'];
                    }
                    $params[] = $user['userId'];
                    $params[] = $now;
                    $params[] = $empId;

                    $upd = $db->prepare("UPDATE employees SET 
                        Name = ?, Mobile = ?, Role = ?, JoiningDate = ?, Salary = ?, PerDeliveryRate = ?,
                        Status = ?, EmergencyContact = ?, Address = ?, BankDetails = ? $photoClause, UpdatedBy = ?, UpdatedAt = ?
                        WHERE EmpID = ?");
                    $upd->execute($params);

                    Audit::log($user['userId'], $user['username'], 'UPDATE', 'employees', (string)$empId, $old, $payload, 'Employee updated');
                    return ['ok' => true, 'data' => ['EmpID' => $empId], 'message' => 'Employee updated successfully.'];
                } else {
                    // Create
                    $chk = $db->prepare("SELECT EmpID FROM employees WHERE Mobile = ? AND IsDeleted = 0");
                    $chk->execute([$mobile]);
                    if ($chk->fetch()) {
                        return ['ok' => false, 'error' => ['code' => 'CONFLICT', 'message' => 'Employee with this mobile already exists.']];
                    }

                    $seq = (int)$db->query("SELECT COUNT(*) FROM employees")->fetchColumn() + 1;
                    $code = sprintf("EMP-%s-%04d", date('Ymd'), $seq);
                    $photo = $payload['Photo'] ?? null;

                    $ins = $db->prepare("INSERT INTO employees (
                        EmpCode, Name, Mobile, Role, JoiningDate, Salary, PerDeliveryRate,
                        Status, EmergencyContact, Address, BankDetails, Photo, CreatedBy, CreatedAt, UpdatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?)");
                    $ins->execute([
                        $code, $name, $mobile, $role, $joiningDate, $salary, $deliveryRate,
                        trim($payload['EmergencyContact'] ?? ''), trim($payload['Address'] ?? ''),
                        trim($payload['BankDetails'] ?? ''), $photo, $user['userId'], $now, $now
                    ]);
                    $newId = (int)$db->lastInsertId();

                    Audit::log($user['userId'], $user['username'], 'CREATE', 'employees', (string)$newId, null, $payload, 'Employee created');
                    return ['ok' => true, 'data' => ['EmpID' => $newId, 'EmpCode' => $code], 'message' => 'Employee added successfully.'];
                }

            case 'deleteEmployee':
                if (!Auth::checkPermission($user, 'employees', 'delete')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }
                $delId = (int)($payload['EmpID'] ?? 0);
                $now = date('Y-m-d H:i:s');
                $stmt = $db->prepare("UPDATE employees SET IsDeleted = 1, DeletedBy = ?, DeletedAt = ? WHERE EmpID = ?");
                $stmt->execute([$user['userId'], $now, $delId]);

                Audit::log($user['userId'], $user['username'], 'SOFT_DELETE', 'employees', (string)$delId, null, null, 'Employee deleted');
                return ['ok' => true, 'data' => null, 'message' => 'Employee deleted.'];

            case 'restoreEmployee':
                if ($user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin authorization required.']];
                }
                $resId = (int)($payload['EmpID'] ?? 0);
                $stmt = $db->prepare("UPDATE employees SET IsDeleted = 0, DeletedBy = NULL, DeletedAt = NULL WHERE EmpID = ?");
                $stmt->execute([$resId]);

                Audit::log($user['userId'], $user['username'], 'RESTORE', 'employees', (string)$resId, null, null, 'Employee restored');
                return ['ok' => true, 'data' => null, 'message' => 'Employee restored.'];

            case 'markAttendance':
                if (!Auth::checkPermission($user, 'attendance', 'create') && !Auth::checkPermission($user, 'attendance', 'update')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }

                $date = $payload['Date'] ?? date('Y-m-d');
                $records = $payload['records'] ?? []; // array of {EmpID, Status, Remarks}

                if (empty($records) || !is_array($records)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Attendance records required.']];
                }

                $now = date('Y-m-d H:i:s');
                $db->beginTransaction();
                try {
                    $upsert = $db->prepare("INSERT INTO attendance (EmpID, Date, Status, Remarks, MarkedBy, CreatedAt, UpdatedAt)
                        VALUES (:EmpID, :Date, :Status, :Remarks, :MarkedBy, :CreatedAt, :UpdatedAt)
                        ON CONFLICT(EmpID, Date) DO UPDATE SET
                            Status = excluded.Status,
                            Remarks = excluded.Remarks,
                            MarkedBy = excluded.MarkedBy,
                            UpdatedAt = excluded.UpdatedAt");

                    foreach ($records as $r) {
                        $upsert->execute([
                            ':EmpID' => (int)$r['EmpID'],
                            ':Date' => $date,
                            ':Status' => trim($r['Status'] ?? 'PRESENT'),
                            ':Remarks' => trim($r['Remarks'] ?? ''),
                            ':MarkedBy' => $user['userId'],
                            ':CreatedAt' => $now,
                            ':UpdatedAt' => $now
                        ]);
                    }

                    $db->commit();
                    return ['ok' => true, 'data' => null, 'message' => "Attendance marked for $date."];
                } catch (Exception $e) {
                    $db->rollBack();
                    return ['ok' => false, 'error' => ['code' => 'SERVER', 'message' => 'Failed to mark attendance: ' . $e->getMessage()]];
                }

            case 'getAttendance':
                $date = $payload['date'] ?? date('Y-m-d');
                $month = $payload['month'] ?? date('Y-m');

                if (!empty($payload['mode']) && $payload['mode'] === 'month') {
                    $stmt = $db->prepare("SELECT a.*, e.Name, e.Role FROM attendance a 
                        JOIN employees e ON a.EmpID = e.EmpID 
                        WHERE a.Date LIKE ? AND e.IsDeleted = 0 ORDER BY a.Date ASC");
                    $stmt->execute(["$month%"]);
                    return ['ok' => true, 'data' => $stmt->fetchAll()];
                } else {
                    // For specific date
                    $stmt = $db->prepare("SELECT e.EmpID, e.Name, e.Role, a.Status, a.Remarks 
                        FROM employees e 
                        LEFT JOIN attendance a ON e.EmpID = a.EmpID AND a.Date = ? 
                        WHERE e.IsDeleted = 0 AND e.Status = 'ACTIVE' ORDER BY e.EmpID ASC");
                    $stmt->execute([$date]);
                    return ['ok' => true, 'data' => $stmt->fetchAll()];
                }

            case 'saveAdvance':
                if (!Auth::checkPermission($user, 'salary', 'create')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }

                $empId = (int)($payload['EmpID'] ?? 0);
                $amount = (float)($payload['Amount'] ?? 0);
                $date = $payload['Date'] ?? date('Y-m-d');
                $reason = trim($payload['Reason'] ?? '');
                $recMonth = $payload['RecoveryMonth'] ?? date('Y-m');

                if ($empId <= 0 || $amount <= 0) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Employee and positive advance amount required.']];
                }

                $now = date('Y-m-d H:i:s');
                $datePrefix = date('Ymd', strtotime($date));
                $seq = (int)$db->query("SELECT COUNT(*) FROM advances")->fetchColumn() + 1;
                $advNo = sprintf("ADV-%s-%04d", $datePrefix, $seq);
                $amtPaise = (int)round($amount * 100);

                $ins = $db->prepare("INSERT INTO advances (
                    AdvanceNumber, EmpID, Date, Amount, AmountPaise, Reason,
                    RecoveredAmount, RecoveredPaise, BalanceAmount, BalancePaise,
                    RecoveryMonth, Status, CreatedBy, CreatedAt, UpdatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, 'ACTIVE', ?, ?, ?)");
                $ins->execute([
                    $advNo, $empId, $date, $amount, $amtPaise, $reason,
                    $amount, $amtPaise, $recMonth, $user['userId'], $now, $now
                ]);

                Audit::log($user['userId'], $user['username'], 'ADVANCE_ISSUE', 'salary', (string)$db->lastInsertId(), null, $payload, "Advance of ₹$amount issued to employee #$empId");

                return ['ok' => true, 'data' => ['AdvanceNumber' => $advNo], 'message' => "Advance of ₹" . number_format($amount, 2) . " registered."];

            case 'calcSalary':
                $empId = (int)($payload['EmpID'] ?? 0);
                $month = $payload['SalaryMonth'] ?? date('Y-m');

                $eStmt = $db->prepare("SELECT * FROM employees WHERE EmpID = ?");
                $eStmt->execute([$empId]);
                $emp = $eStmt->fetch();

                if (!$emp) {
                    return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Employee not found.']];
                }

                // Days in month
                $totalDaysInMonth = (int)date('t', strtotime("$month-01"));

                // Attendance calculation
                $attStmt = $db->prepare("SELECT Status, COUNT(*) as cnt FROM attendance 
                    WHERE EmpID = ? AND Date LIKE ? GROUP BY Status");
                $attStmt->execute([$empId, "$month%"]);
                $attMap = $attStmt->fetchAll(PDO::FETCH_KEY_PAIR);

                $presentDays = (int)($attMap['PRESENT'] ?? 0) + ((int)($attMap['HALF_DAY'] ?? 0) * 0.5);
                $baseSalary = (float)$emp['Salary'];
                $perDayRate = $totalDaysInMonth > 0 ? ($baseSalary / $totalDaysInMonth) : 0;
                $attendanceAdjustment = round(($presentDays - $totalDaysInMonth) * $perDayRate, 2);

                // Deliveries incentive calculation
                $delStmt = $db->prepare("SELECT COALESCE(SUM(NetSold), 0), COALESCE(SUM(ShortageAmount), 0) FROM hawker_dispatch 
                    WHERE EmpID = ? AND Date LIKE ?");
                $delStmt->execute([$empId, "$month%"]);
                $delData = $delStmt->fetch();
                $deliveriesCount = (int)$delData[0];
                $shortageDeduction = (float)$delData[1];
                $deliveryIncentive = round($deliveriesCount * (float)$emp['PerDeliveryRate'], 2);

                // Outstanding advances for this recovery month
                $advStmt = $db->prepare("SELECT COALESCE(SUM(BalanceAmount), 0) FROM advances 
                    WHERE EmpID = ? AND RecoveryMonth = ? AND Status = 'ACTIVE'");
                $advStmt->execute([$empId, $month]);
                $advanceDeduction = (float)$advStmt->fetchColumn();

                $netSalary = max(0, $baseSalary + $attendanceAdjustment + $deliveryIncentive - $advanceDeduction - $shortageDeduction);

                return [
                    'ok' => true,
                    'data' => [
                        'EmpID' => $empId,
                        'EmployeeName' => $emp['Name'],
                        'SalaryMonth' => $month,
                        'BaseSalary' => $baseSalary,
                        'TotalDaysInMonth' => $totalDaysInMonth,
                        'PresentDays' => $presentDays,
                        'AttendanceAdjustment' => $attendanceAdjustment,
                        'DeliveriesCount' => $deliveriesCount,
                        'DeliveryIncentive' => $deliveryIncentive,
                        'AdvanceDeduction' => $advanceDeduction,
                        'ShortageDeduction' => $shortageDeduction,
                        'NetSalary' => $netSalary
                    ]
                ];

            case 'finalizeSalary':
                if (!Auth::checkPermission($user, 'salary', 'approve') && $user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin authorization required to finalize payroll.']];
                }

                $empId = (int)($payload['EmpID'] ?? 0);
                $month = $payload['SalaryMonth'] ?? date('Y-m');
                $netSalary = (float)($payload['NetSalary'] ?? 0);
                $netPaise = (int)round($netSalary * 100);

                $now = date('Y-m-d H:i:s');
                $salNo = sprintf("SAL-%s-%04d", str_replace('-', '', $month), $empId);

                $ins = $db->prepare("INSERT INTO salaries (
                    SalaryNumber, EmpID, SalaryMonth, BaseSalary, PresentDays, AttendanceAdjustment,
                    DeliveriesCount, DeliveryIncentive, AdvanceDeduction, ShortageDeduction, NetSalary, NetSalaryPaise,
                    Status, FinalizedBy, FinalizedAt, PaymentDate, PaymentMode, Remarks, CreatedAt, UpdatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'FINAL', ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(EmpID, SalaryMonth) DO UPDATE SET
                    NetSalary = excluded.NetSalary,
                    NetSalaryPaise = excluded.NetSalaryPaise,
                    Status = 'FINAL',
                    FinalizedBy = excluded.FinalizedBy,
                    FinalizedAt = excluded.FinalizedAt,
                    UpdatedAt = excluded.UpdatedAt");

                $ins->execute([
                    $salNo, $empId, $month, (float)($payload['BaseSalary'] ?? 0),
                    (float)($payload['PresentDays'] ?? 0), (float)($payload['AttendanceAdjustment'] ?? 0),
                    (int)($payload['DeliveriesCount'] ?? 0), (float)($payload['DeliveryIncentive'] ?? 0),
                    (float)($payload['AdvanceDeduction'] ?? 0), (float)($payload['ShortageDeduction'] ?? 0),
                    $netSalary, $netPaise, $user['userId'], $now, $payload['PaymentDate'] ?? date('Y-m-d'),
                    $payload['PaymentMode'] ?? 'BANK', trim($payload['Remarks'] ?? ''), $now, $now
                ]);

                // Mark advances as recovered
                if ((float)($payload['AdvanceDeduction'] ?? 0) > 0) {
                    $updAdv = $db->prepare("UPDATE advances SET 
                        RecoveredAmount = Amount, RecoveredPaise = AmountPaise, BalanceAmount = 0, BalancePaise = 0, Status = 'SETTLED', UpdatedAt = ?
                        WHERE EmpID = ? AND RecoveryMonth = ? AND Status = 'ACTIVE'");
                    $updAdv->execute([$now, $empId, $month]);
                }

                Audit::log($user['userId'], $user['username'], 'SALARY_FINALIZE', 'salary', $salNo, null, $payload, "Payroll finalized for employee #$empId for month $month");

                return ['ok' => true, 'data' => ['SalaryNumber' => $salNo], 'message' => "Salary slip $salNo finalized successfully."];

            case 'listLeaves':
                $empId = !empty($payload['EmpID']) ? (int)$payload['EmpID'] : null;
                $sql = "SELECT l.*, e.Name as EmployeeName FROM leaves l JOIN employees e ON l.EmpID = e.EmpID WHERE 1=1";
                $params = [];
                if ($empId) {
                    $sql .= " AND l.EmpID = ?";
                    $params[] = $empId;
                }
                $sql .= " ORDER BY l.LeaveID DESC";
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                return ['ok' => true, 'data' => $stmt->fetchAll()];

            case 'saveLeave':
                $empId = (int)($payload['EmpID'] ?? 0);
                $type = trim($payload['LeaveType'] ?? 'CASUAL');
                $start = $payload['StartDate'] ?? date('Y-m-d');
                $end = $payload['EndDate'] ?? date('Y-m-d');
                $days = max(1, (strtotime($end) - strtotime($start)) / 86400 + 1);
                $now = date('Y-m-d H:i:s');

                $ins = $db->prepare("INSERT INTO leaves (EmpID, LeaveType, StartDate, EndDate, DaysCount, Reason, Status, ApprovedBy, ApprovedAt, CreatedBy, CreatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?, ?, ?)");
                $ins->execute([$empId, $type, $start, $end, $days, trim($payload['Reason'] ?? ''), $user['userId'], $now, $user['userId'], $now]);

                return ['ok' => true, 'data' => null, 'message' => 'Leave approved and registered.'];

            case 'listEmployeeDocuments':
                $empId = (int)($payload['EmpID'] ?? 0);
                if (!$empId) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Employee ID is required.']];
                }
                $stmt = $db->prepare("SELECT DocID, EmpID, DocType, DocTitle, DocNumber, FileName, FileData, MimeType, FileSize, Notes, UploadedBy, UploadedAt FROM employee_documents WHERE EmpID = ? ORDER BY DocID DESC");
                $stmt->execute([$empId]);
                $docs = $stmt->fetchAll();
                return ['ok' => true, 'data' => $docs];

            case 'uploadEmployeeDocument':
                if (!Auth::checkPermission($user, 'employees', 'update') && !Auth::checkPermission($user, 'employees', 'create')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }
                $empId = (int)($payload['EmpID'] ?? 0);
                $docType = trim($payload['DocType'] ?? 'Aadhaar Card');
                $docTitle = trim($payload['DocTitle'] ?? $docType);
                $docNumber = trim($payload['DocNumber'] ?? '');
                $fileName = trim($payload['FileName'] ?? 'document.pdf');
                $fileData = $payload['FileData'] ?? '';
                $mimeType = trim($payload['MimeType'] ?? 'application/pdf');
                $fileSize = (int)($payload['FileSize'] ?? 0);
                $notes = trim($payload['Notes'] ?? '');
                $now = date('Y-m-d H:i:s');

                if (!$empId || empty($fileData)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Employee ID and file data are required.']];
                }

                $stmt = $db->prepare("INSERT INTO employee_documents (
                    EmpID, DocType, DocTitle, DocNumber, FileName, FileData, MimeType, FileSize, Notes, UploadedBy, UploadedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $empId, $docType, $docTitle, $docNumber, $fileName, $fileData, $mimeType, $fileSize, $notes, $user['userId'], $now
                ]);
                $docId = (int)$db->lastInsertId();

                Audit::log($user['userId'], $user['username'], 'UPLOAD_DOC', 'employee_documents', (string)$docId, null, [
                    'EmpID' => $empId, 'DocType' => $docType, 'FileName' => $fileName
                ], "Uploaded $docType for employee #$empId");

                return ['ok' => true, 'data' => ['DocID' => $docId], 'message' => 'Document uploaded successfully.'];

            case 'deleteEmployeeDocument':
                if (!Auth::checkPermission($user, 'employees', 'delete') && !Auth::checkPermission($user, 'employees', 'update')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }
                $docId = (int)($payload['DocID'] ?? 0);
                $stmt = $db->prepare("SELECT * FROM employee_documents WHERE DocID = ?");
                $stmt->execute([$docId]);
                $doc = $stmt->fetch();
                if (!$doc) {
                    return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Document not found.']];
                }

                $del = $db->prepare("DELETE FROM employee_documents WHERE DocID = ?");
                $del->execute([$docId]);

                Audit::log($user['userId'], $user['username'], 'DELETE_DOC', 'employee_documents', (string)$docId, $doc, null, "Deleted document #$docId for employee #{$doc['EmpID']}");

                return ['ok' => true, 'data' => null, 'message' => 'Document deleted successfully.'];

            default:
                return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Invalid HR action.']];
        }
    }
}
