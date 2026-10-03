<?php
/**
 * CashController
 * Daily Cashbook, Currency Denominations Breakdown, Variance Auditing & EOD Day Closing
 */
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../audit.php';
require_once __DIR__ . '/../auth.php';

class CashController {
    public static function handle(string $action, array $payload, ?array $user): array {
        if (!$user || !Auth::checkPermission($user, 'cashbook', 'read')) {
            return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
        }

        $db = Database::getConnection();

        switch ($action) {
            case 'getCashbook':
                $date = $payload['date'] ?? date('Y-m-d');
                $stmt = $db->prepare("SELECT * FROM cashbook WHERE Date = ?");
                $stmt->execute([$date]);
                $cb = $stmt->fetch();

                if (!$cb) {
                    // Pull previous day physical closing as today's opening
                    $prevDate = date('Y-m-d', strtotime($date . ' -1 day'));
                    $prevStmt = $db->prepare("SELECT PhysicalClosing, ExpectedClosing FROM cashbook WHERE Date = ?");
                    $prevStmt->execute([$prevDate]);
                    $prev = $prevStmt->fetch();

                    $opening = $prev ? (float)($prev['PhysicalClosing'] > 0 ? $prev['PhysicalClosing'] : $prev['ExpectedClosing']) : 0.0;

                    // Pull today's actual Counter Cash from POS bills
                    $posStmt = $db->prepare("SELECT COALESCE(SUM(PaidCash), 0) FROM bills WHERE BillDate = ? AND IsCancelled = 0 AND IsDeleted = 0");
                    $posStmt->execute([$date]);
                    $counter = (float)$posStmt->fetchColumn();

                    // Pull today's actual Hawker Cash deposits
                    $hwkStmt = $db->prepare("SELECT COALESCE(SUM(CashDeposited), 0) FROM hawker_dispatch WHERE Date = ?");
                    $hwkStmt->execute([$date]);
                    $hawker = (float)$hwkStmt->fetchColumn();

                    // Pull today's Dues Cash recoveries
                    $duesStmt = $db->prepare("SELECT COALESCE(SUM(Amount), 0) FROM due_payments WHERE PaymentDate = ? AND PaymentMode = 'CASH'");
                    $duesStmt->execute([$date]);
                    $dues = (float)$duesStmt->fetchColumn();

                    $totalInflow = $counter + $hawker + $dues;
                    $expected = $opening + $totalInflow;

                    $cb = [
                        'Date' => $date,
                        'OpeningCash' => $opening,
                        'CounterCash' => $counter,
                        'HawkerCash' => $hawker,
                        'DuesCash' => $dues,
                        'OtherInflow' => 0.0,
                        'TotalInflow' => $totalInflow,
                        'Expenses' => 0.0,
                        'Refunds' => 0.0,
                        'BankDeposit' => 0.0,
                        'TotalOutflow' => 0.0,
                        'ExpectedClosing' => $expected,
                        'PhysicalClosing' => 0.0,
                        'Variance' => 0.0,
                        'VarianceReason' => '',
                        'Denomination500' => 0,
                        'Denomination200' => 0,
                        'Denomination100' => 0,
                        'Denomination50' => 0,
                        'Denomination20' => 0,
                        'Denomination10' => 0,
                        'DenominationCoins' => 0.0,
                        'IsClosed' => 0
                    ];
                }

                // Check day closing table
                $dcStmt = $db->prepare("SELECT * FROM day_closings WHERE Date = ?");
                $dcStmt->execute([$date]);
                $dayClosing = $dcStmt->fetch();

                return [
                    'ok' => true,
                    'data' => [
                        'cashbook' => $cb,
                        'dayClosing' => $dayClosing
                    ]
                ];

            case 'saveCashbook':
                if (!Auth::checkPermission($user, 'cashbook', 'update') && !Auth::checkPermission($user, 'cashbook', 'create')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }

                $date = $payload['Date'] ?? date('Y-m-d');

                // Check if Day is already closed
                $cbCheck = $db->prepare("SELECT IsClosed FROM cashbook WHERE Date = ?");
                $cbCheck->execute([$date]);
                if ((int)$cbCheck->fetchColumn() === 1 && $user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'DAY_CLOSED', 'message' => 'Cashbook is locked because the day is closed.']];
                }

                $opening = (float)($payload['OpeningCash'] ?? 0);
                $counter = (float)($payload['CounterCash'] ?? 0);
                $hawker = (float)($payload['HawkerCash'] ?? 0);
                $dues = (float)($payload['DuesCash'] ?? 0);
                $otherInflow = (float)($payload['OtherInflow'] ?? 0);
                $expenses = (float)($payload['Expenses'] ?? 0);
                $refunds = (float)($payload['Refunds'] ?? 0);
                $bankDep = (float)($payload['BankDeposit'] ?? 0);

                $d500 = (int)($payload['Denomination500'] ?? 0);
                $d200 = (int)($payload['Denomination200'] ?? 0);
                $d100 = (int)($payload['Denomination100'] ?? 0);
                $d50 = (int)($payload['Denomination50'] ?? 0);
                $d20 = (int)($payload['Denomination20'] ?? 0);
                $d10 = (int)($payload['Denomination10'] ?? 0);
                $dCoins = (float)($payload['DenominationCoins'] ?? 0);

                // Compute Physical Cash from Denominations
                $physicalCash = ($d500 * 500) + ($d200 * 200) + ($d100 * 100) + ($d50 * 50) + ($d20 * 20) + ($d10 * 10) + $dCoins;

                $totalInflow = $counter + $hawker + $dues + $otherInflow;
                $totalOutflow = $expenses + $refunds + $bankDep;
                $expectedClosing = $opening + $totalInflow - $totalOutflow;
                $variance = round($physicalCash - $expectedClosing, 2);
                $varianceReason = trim($payload['VarianceReason'] ?? '');

                // If physical cash is counted and variance != 0, require reason
                if ($physicalCash > 0 && abs($variance) > 0.5 && empty($varianceReason)) {
                    return ['ok' => false, 'error' => [
                        'code' => 'VALIDATION',
                        'message' => "Cash variance of ₹" . number_format($variance, 2) . " detected. A mandatory variance explanation is required."
                    ]];
                }

                $now = date('Y-m-d H:i:s');
                $db->beginTransaction();
                try {
                    $stmt = $db->prepare("INSERT INTO cashbook (
                        Date, OpeningCash, CounterCash, HawkerCash, DuesCash, OtherInflow, TotalInflow,
                        Expenses, Refunds, BankDeposit, TotalOutflow, ExpectedClosing, PhysicalClosing,
                        Variance, VarianceReason, Denomination500, Denomination200, Denomination100,
                        Denomination50, Denomination20, Denomination10, DenominationCoins,
                        CreatedBy, CreatedAt, UpdatedAt
                    ) VALUES (
                        :Date, :OpeningCash, :CounterCash, :HawkerCash, :DuesCash, :OtherInflow, :TotalInflow,
                        :Expenses, :Refunds, :BankDeposit, :TotalOutflow, :ExpectedClosing, :PhysicalClosing,
                        :Variance, :VarianceReason, :Denomination500, :Denomination200, :Denomination100,
                        :Denomination50, :Denomination20, :Denomination10, :DenominationCoins,
                        :CreatedBy, :CreatedAt, :UpdatedAt
                    ) ON CONFLICT(Date) DO UPDATE SET
                        OpeningCash = excluded.OpeningCash,
                        CounterCash = excluded.CounterCash,
                        HawkerCash = excluded.HawkerCash,
                        DuesCash = excluded.DuesCash,
                        OtherInflow = excluded.OtherInflow,
                        TotalInflow = excluded.TotalInflow,
                        Expenses = excluded.Expenses,
                        Refunds = excluded.Refunds,
                        BankDeposit = excluded.BankDeposit,
                        TotalOutflow = excluded.TotalOutflow,
                        ExpectedClosing = excluded.ExpectedClosing,
                        PhysicalClosing = excluded.PhysicalClosing,
                        Variance = excluded.Variance,
                        VarianceReason = excluded.VarianceReason,
                        Denomination500 = excluded.Denomination500,
                        Denomination200 = excluded.Denomination200,
                        Denomination100 = excluded.Denomination100,
                        Denomination50 = excluded.Denomination50,
                        Denomination20 = excluded.Denomination20,
                        Denomination10 = excluded.Denomination10,
                        DenominationCoins = excluded.DenominationCoins,
                        UpdatedAt = excluded.UpdatedAt");

                    $stmt->execute([
                        ':Date' => $date,
                        ':OpeningCash' => $opening,
                        ':CounterCash' => $counter,
                        ':HawkerCash' => $hawker,
                        ':DuesCash' => $dues,
                        ':OtherInflow' => $otherInflow,
                        ':TotalInflow' => $totalInflow,
                        ':Expenses' => $expenses,
                        ':Refunds' => $refunds,
                        ':BankDeposit' => $bankDep,
                        ':TotalOutflow' => $totalOutflow,
                        ':ExpectedClosing' => $expectedClosing,
                        ':PhysicalClosing' => $physicalCash,
                        ':Variance' => $variance,
                        ':VarianceReason' => $varianceReason,
                        ':Denomination500' => $d500,
                        ':Denomination200' => $d200,
                        ':Denomination100' => $d100,
                        ':Denomination50' => $d50,
                        ':Denomination20' => $d20,
                        ':Denomination10' => $d10,
                        ':DenominationCoins' => $dCoins,
                        ':CreatedBy' => $user['userId'],
                        ':CreatedAt' => $now,
                        ':UpdatedAt' => $now
                    ]);

                    $db->commit();
                    Audit::log($user['userId'], $user['username'], 'CASHBOOK_SAVE', 'cashbook', $date, null, $payload, "Cashbook updated for $date");

                    return [
                        'ok' => true,
                        'data' => [
                            'ExpectedClosing' => $expectedClosing,
                            'PhysicalClosing' => $physicalCash,
                            'Variance' => $variance
                        ],
                        'message' => 'Cashbook saved successfully.'
                    ];
                } catch (Exception $e) {
                    $db->rollBack();
                    return ['ok' => false, 'error' => ['code' => 'SERVER', 'message' => 'Failed to save cashbook: ' . $e->getMessage()]];
                }

            case 'closeDay':
                if (!Auth::checkPermission($user, 'cashbook', 'approve') && $user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Authorization to perform day closing required.']];
                }

                $date = $payload['Date'] ?? date('Y-m-d');

                // Check if already closed
                $chk = $db->prepare("SELECT IsClosed FROM cashbook WHERE Date = ?");
                $chk->execute([$date]);
                if ((int)$chk->fetchColumn() === 1) {
                    return ['ok' => false, 'error' => ['code' => 'CONFLICT', 'message' => "Business day $date is already closed."]];
                }

                // Compute final summary for day_closings
                $bStmt = $db->prepare("SELECT 
                    COALESCE(SUM(TotalAmount), 0) as grossBilling,
                    COALESCE(SUM(PaidCash), 0) as cashBilling,
                    COALESCE(SUM(PaidUPI + PaidHPPay + PaidBank), 0) as digitalBilling,
                    COALESCE(SUM(PaidDues), 0) as duesAdded
                FROM bills WHERE BillDate = ? AND IsCancelled = 0 AND IsDeleted = 0");
                $bStmt->execute([$date]);
                $bData = $bStmt->fetch();

                $dueRec = (float)$db->query("SELECT COALESCE(SUM(Amount), 0) FROM due_payments WHERE PaymentDate = '$date'")->fetchColumn();

                $cylSold = (int)$db->query("SELECT COALESCE(SUM(Quantity), 0) FROM bill_items bi 
                    JOIN bills b ON bi.BillID = b.BillID 
                    WHERE b.BillDate = '$date' AND bi.Category = 'SALE' AND b.IsCancelled = 0 AND b.IsDeleted = 0")->fetchColumn();

                $cbData = $db->query("SELECT Expenses FROM cashbook WHERE Date = '$date'")->fetch();
                $expenses = $cbData ? (float)$cbData['Expenses'] : 0.0;

                $db->beginTransaction();
                try {
                    $now = date('Y-m-d H:i:s');

                    // Mark Cashbook IsClosed = 1
                    $updCb = $db->prepare("UPDATE cashbook SET IsClosed = 1, ClosedBy = ?, ClosedAt = ?, UpdatedAt = ? WHERE Date = ?");
                    $updCb->execute([$user['userId'], $now, $now, $date]);

                    // Insert Day Closings Record
                    $insDc = $db->prepare("INSERT INTO day_closings (
                        Date, IsLocked, TotalBilling, TotalCashInflow, TotalDigitalInflow, TotalDuesAdded,
                        TotalDuesRecovered, TotalExpenses, TotalCylindersSold, ClosedBy, ClosedByName, ClosedAt
                    ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(Date) DO UPDATE SET
                        IsLocked = 1, TotalBilling = excluded.TotalBilling, TotalCashInflow = excluded.TotalCashInflow,
                        ClosedBy = excluded.ClosedBy, ClosedByName = excluded.ClosedByName, ClosedAt = excluded.ClosedAt,
                        IsUnlocked = 0");

                    $insDc->execute([
                        $date, (float)$bData['grossBilling'], (float)$bData['cashBilling'] + $dueRec,
                        (float)$bData['digitalBilling'], (float)$bData['duesAdded'], $dueRec,
                        $expenses, $cylSold, $user['userId'], $user['fullName'], $now
                    ]);

                    $db->commit();
                    Audit::log($user['userId'], $user['username'], 'DAY_CLOSE', 'cashbook', $date, null, null, "Business day $date closed and locked");

                    return ['ok' => true, 'data' => null, 'message' => "Business day $date has been successfully closed and locked."];
                } catch (Exception $e) {
                    $db->rollBack();
                    return ['ok' => false, 'error' => ['code' => 'SERVER', 'message' => 'Failed to close day: ' . $e->getMessage()]];
                }

            case 'unlockDay':
                if ($user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Only Admin can unlock a closed day.']];
                }

                $date = $payload['Date'] ?? date('Y-m-d');
                $reason = trim($payload['Reason'] ?? '');
                if (empty($reason)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Mandatory unlock reason required.']];
                }

                $db->beginTransaction();
                try {
                    $now = date('Y-m-d H:i:s');
                    $updCb = $db->prepare("UPDATE cashbook SET IsClosed = 0, UpdatedAt = ? WHERE Date = ?");
                    $updCb->execute([$now, $date]);

                    $updDc = $db->prepare("UPDATE day_closings SET 
                        IsLocked = 0, IsUnlocked = 1, UnlockedBy = ?, UnlockedByName = ?, UnlockedAt = ?, UnlockReason = ?
                        WHERE Date = ?");
                    $updDc->execute([$user['userId'], $user['fullName'], $now, $reason, $date]);

                    $db->commit();
                    Audit::log($user['userId'], $user['username'], 'DAY_UNLOCK', 'cashbook', $date, null, ['reason' => $reason], "Business day $date unlocked: $reason");

                    return ['ok' => true, 'data' => null, 'message' => "Business day $date has been unlocked."];
                } catch (Exception $e) {
                    $db->rollBack();
                    return ['ok' => false, 'error' => ['code' => 'SERVER', 'message' => 'Failed to unlock day: ' . $e->getMessage()]];
                }

            default:
                return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Invalid cash action.']];
        }
    }
}
