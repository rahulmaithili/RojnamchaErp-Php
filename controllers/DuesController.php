<?php
/**
 * DuesController
 * Customer Outstanding Dues Ledger, Aging Analysis, Dues Recovery Receipts & Write-off
 */
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../audit.php';
require_once __DIR__ . '/../auth.php';

class DuesController {
    public static function handle(string $action, array $payload, ?array $user): array {
        if (!$user || !Auth::checkPermission($user, 'dues', 'read')) {
            return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
        }

        $db = Database::getConnection();

        switch ($action) {
            case 'listDues':
                $status = $payload['status'] ?? 'pending';
                $search = trim($payload['search'] ?? '');
                $today = date('Y-m-d');

                $sql = "SELECT d.*, c.Name as CustomerName, c.Mobile as CustomerMobile, c.ConsumerNo, c.Area, b.BillNumber 
                        FROM customer_dues d 
                        JOIN customers c ON d.CustomerID = c.CustomerID 
                        LEFT JOIN bills b ON d.BillID = b.BillID 
                        WHERE 1=1";
                $params = [];

                if ($status === 'pending') {
                    $sql .= " AND d.Status != 'CLEARED' AND d.IsWrittenOff = 0";
                } elseif ($status === 'cleared') {
                    $sql .= " AND d.Status = 'CLEARED'";
                } elseif ($status === 'written_off') {
                    $sql .= " AND d.IsWrittenOff = 1";
                }

                if (!empty($search)) {
                    $sql .= " AND (c.Name LIKE ? OR c.Mobile LIKE ? OR d.DueNumber LIKE ? OR c.ConsumerNo LIKE ?)";
                    $term = "%$search%";
                    $params[] = $term;
                    $params[] = $term;
                    $params[] = $term;
                    $params[] = $term;
                }

                $sql .= " ORDER BY d.DueID DESC LIMIT " . MAX_PAGE_SIZE;
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $dues = $stmt->fetchAll();

                // Compute aging bracket for each due
                foreach ($dues as &$d) {
                    $diffDays = max(0, (strtotime($today) - strtotime($d['DueDate'])) / 86400);
                    $d['AgingDays'] = $diffDays;
                    if ($diffDays <= 7) $d['AgingBracket'] = '0-7 Days';
                    elseif ($diffDays <= 30) $d['AgingBracket'] = '8-30 Days';
                    elseif ($diffDays <= 60) $d['AgingBracket'] = '31-60 Days';
                    else $d['AgingBracket'] = '60+ Days';
                }

                return ['ok' => true, 'data' => $dues];

            case 'recoverDue':
                if (!Auth::checkPermission($user, 'dues', 'update') && !Auth::checkPermission($user, 'billing', 'create')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }

                $dueId = (int)($payload['DueID'] ?? 0);
                $amount = (float)($payload['Amount'] ?? 0);
                $paymentMode = trim($payload['PaymentMode'] ?? 'CASH');
                $refNo = trim($payload['ReferenceNo'] ?? '');
                $notes = trim($payload['Notes'] ?? '');
                $payDate = $payload['PaymentDate'] ?? date('Y-m-d');

                if ($dueId <= 0 || $amount <= 0) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Valid due ID and positive payment amount are required.']];
                }

                $stmt = $db->prepare("SELECT * FROM customer_dues WHERE DueID = ?");
                $stmt->execute([$dueId]);
                $due = $stmt->fetch();

                if (!$due) {
                    return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Due record not found.']];
                }

                if ($due['Status'] === 'CLEARED' || (int)$due['IsWrittenOff'] === 1) {
                    return ['ok' => false, 'error' => ['code' => 'CONFLICT', 'message' => 'Due is already settled or written off.']];
                }

                $paymentPaise = (int)round($amount * 100);
                $remainingPaise = (int)$due['RemainingPaise'];

                if ($paymentPaise > $remainingPaise) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => "Payment amount (₹$amount) cannot exceed remaining balance (₹{$due['RemainingAmount']})."]];
                }

                $newPaidPaise = (int)$due['PaidPaise'] + $paymentPaise;
                $newRemainingPaise = $remainingPaise - $paymentPaise;
                $newStatus = $newRemainingPaise === 0 ? 'CLEARED' : 'PARTIAL';

                $db->beginTransaction();
                try {
                    $now = date('Y-m-d H:i:s');
                    $datePrefix = date('Ymd', strtotime($payDate));

                    // Generate Receipt Number
                    $seqStmt = $db->prepare("SELECT COUNT(*) FROM due_payments WHERE ReceiptNumber LIKE ?");
                    $seqStmt->execute(["RCT-$datePrefix%"]);
                    $seq = (int)$seqStmt->fetchColumn() + 1;
                    $rctNo = sprintf("RCT-%s-%04d", $datePrefix, $seq);

                    // Insert Due Payment Record
                    $insPay = $db->prepare("INSERT INTO due_payments (
                        ReceiptNumber, DueID, CustomerID, PaymentDate, Amount, AmountPaise, PaymentMode, ReferenceNo, Notes, CreatedBy, CreatedByName, CreatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    $insPay->execute([
                        $rctNo, $dueId, $due['CustomerID'], $payDate, $amount, $paymentPaise,
                        $paymentMode, $refNo, $notes, $user['userId'], $user['fullName'], $now
                    ]);
                    $receiptId = (int)$db->lastInsertId();

                    // Update Due Record
                    $updDue = $db->prepare("UPDATE customer_dues SET 
                        PaidAmount = ?, PaidPaise = ?, RemainingAmount = ?, RemainingPaise = ?, Status = ?, UpdatedBy = ?, UpdatedAt = ?
                        WHERE DueID = ?");
                    $updDue->execute([
                        $newPaidPaise / 100, $newPaidPaise, $newRemainingPaise / 100, $newRemainingPaise, $newStatus,
                        $user['userId'], $now, $dueId
                    ]);

                    // Deduct Customer Current Dues
                    $updCust = $db->prepare("UPDATE customers SET 
                        CurrentDues = MAX(0, CurrentDues - ?),
                        CurrentDuesPaise = MAX(0, CurrentDuesPaise - ?),
                        UpdatedAt = ?
                        WHERE CustomerID = ?");
                    $updCust->execute([$amount, $paymentPaise, $now, $due['CustomerID']]);

                    // Sync Cashbook if mode is CASH
                    if ($paymentMode === 'CASH') {
                        $cbCheck = $db->prepare("SELECT CashbookID FROM cashbook WHERE Date = ?");
                        $cbCheck->execute([$payDate]);
                        $cbId = $cbCheck->fetchColumn();
                        if ($cbId) {
                            $updCb = $db->prepare("UPDATE cashbook SET 
                                DuesCash = DuesCash + ?,
                                TotalInflow = TotalInflow + ?,
                                ExpectedClosing = ExpectedClosing + ?,
                                UpdatedAt = ?
                                WHERE CashbookID = ?");
                            $updCb->execute([$amount, $amount, $amount, $now, $cbId]);
                        } else {
                            $insCb = $db->prepare("INSERT INTO cashbook (Date, OpeningCash, DuesCash, TotalInflow, ExpectedClosing, PhysicalClosing, CreatedBy, CreatedAt, UpdatedAt)
                                VALUES (?, 0, ?, ?, ?, 0, ?, ?, ?)");
                            $insCb->execute([$payDate, $amount, $amount, $amount, $user['userId'], $now, $now]);
                        }
                    }

                    $db->commit();

                    Audit::log($user['userId'], $user['username'], 'DUE_RECOVERY', 'dues', (string)$dueId, $due, [
                        'receiptNumber' => $rctNo,
                        'amount' => $amount,
                        'remaining' => $newRemainingPaise / 100
                    ], "Due recovered via receipt $rctNo");

                    return [
                        'ok' => true,
                        'data' => [
                            'ReceiptID' => $receiptId,
                            'ReceiptNumber' => $rctNo,
                            'PaidAmount' => $amount,
                            'RemainingAmount' => $newRemainingPaise / 100,
                            'Status' => $newStatus
                        ],
                        'message' => "Payment of ₹" . number_format($amount, 2) . " recovered successfully. Receipt $rctNo generated."
                    ];
                } catch (Exception $e) {
                    $db->rollBack();
                    return ['ok' => false, 'error' => ['code' => 'SERVER', 'message' => 'Failed to process dues recovery: ' . $e->getMessage()]];
                }

            case 'writeOffDue':
                if ($user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin authorization strictly required for due write-off.']];
                }

                $dueId = (int)($payload['DueID'] ?? 0);
                $reason = trim($payload['Reason'] ?? '');
                if ($dueId <= 0 || empty($reason)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Valid due ID and mandatory write-off reason are required.']];
                }

                $stmt = $db->prepare("SELECT * FROM customer_dues WHERE DueID = ?");
                $stmt->execute([$dueId]);
                $due = $stmt->fetch();

                if (!$due || $due['Status'] === 'CLEARED' || (int)$due['IsWrittenOff'] === 1) {
                    return ['ok' => false, 'error' => ['code' => 'CONFLICT', 'message' => 'Due cannot be written off.']];
                }

                $db->beginTransaction();
                try {
                    $now = date('Y-m-d H:i:s');
                    $remAmt = (float)$due['RemainingAmount'];
                    $remPaise = (int)$due['RemainingPaise'];

                    $upd = $db->prepare("UPDATE customer_dues SET 
                        Status = 'WRITTEN_OFF', IsWrittenOff = 1, WriteOffReason = ?, WrittenOffBy = ?, WrittenOffAt = ?, UpdatedAt = ?
                        WHERE DueID = ?");
                    $upd->execute([$reason, $user['userId'], $now, $now, $dueId]);

                    // Deduct remaining from customer dues
                    $updCust = $db->prepare("UPDATE customers SET 
                        CurrentDues = MAX(0, CurrentDues - ?),
                        CurrentDuesPaise = MAX(0, CurrentDuesPaise - ?),
                        UpdatedAt = ?
                        WHERE CustomerID = ?");
                    $updCust->execute([$remAmt, $remPaise, $now, $due['CustomerID']]);

                    $db->commit();

                    Audit::log($user['userId'], $user['username'], 'DUE_WRITEOFF', 'dues', (string)$dueId, $due, ['reason' => $reason], "Due {$due['DueNumber']} written off");

                    return ['ok' => true, 'data' => null, 'message' => "Due {$due['DueNumber']} has been written off."];
                } catch (Exception $e) {
                    $db->rollBack();
                    return ['ok' => false, 'error' => ['code' => 'SERVER', 'message' => 'Failed to write off due: ' . $e->getMessage()]];
                }

            default:
                return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Invalid dues action.']];
        }
    }
}
