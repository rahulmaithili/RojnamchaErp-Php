<?php
/**
 * DispatchController
 * Hawker & Delivery Dispatch Reconciliation, Cylinder Loading & Daily Shortage/Excess Tracking
 */
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../audit.php';
require_once __DIR__ . '/../auth.php';

class DispatchController {
    public static function handle(string $action, array $payload, ?array $user): array {
        if (!$user || !Auth::checkPermission($user, 'dispatch', 'read')) {
            return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
        }

        $db = Database::getConnection();

        switch ($action) {
            case 'listVendorLog':
            case 'listDispatch':
                $date = $payload['date'] ?? null;
                $startDate = $payload['startDate'] ?? null;
                $endDate = $payload['endDate'] ?? null;
                $empId = !empty($payload['EmpID']) ? (int)$payload['EmpID'] : null;

                $sql = "SELECT hd.*, e.Name as HawkerName, e.Mobile as HawkerMobile 
                        FROM hawker_dispatch hd 
                        JOIN employees e ON hd.EmpID = e.EmpID 
                        WHERE 1=1";
                $params = [];

                if (!empty($date)) {
                    $sql .= " AND hd.Date = ?";
                    $params[] = $date;
                } elseif (!empty($startDate) && !empty($endDate)) {
                    $sql .= " AND hd.Date BETWEEN ? AND ?";
                    $params[] = $startDate;
                    $params[] = $endDate;
                }

                if ($empId) {
                    $sql .= " AND hd.EmpID = ?";
                    $params[] = $empId;
                }

                $sql .= " ORDER BY hd.DispatchID DESC LIMIT " . MAX_PAGE_SIZE;
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $logs = $stmt->fetchAll();

                return ['ok' => true, 'data' => $logs];

            case 'saveVendorLog':
            case 'saveDispatch':
                if (!Auth::checkPermission($user, 'dispatch', 'create') && !Auth::checkPermission($user, 'dispatch', 'update')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }

                $dispatchDate = $payload['Date'] ?? date('Y-m-d');

                // Day closing check
                $cbCheck = $db->prepare("SELECT IsClosed FROM cashbook WHERE Date = ?");
                $cbCheck->execute([$dispatchDate]);
                if ((int)$cbCheck->fetchColumn() === 1 && $user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'DAY_CLOSED', 'message' => 'The business day is closed. Updates prohibited.']];
                }

                $empId = (int)($payload['EmpID'] ?? 0);
                $cylType = trim($payload['CylinderType'] ?? '14.2 KG Domestic');
                $loaded = (int)($payload['LoadedQuantity'] ?? 0);
                $retEmpty = (int)($payload['ReturnedEmpty'] ?? 0);
                $retFull = (int)($payload['ReturnedFull'] ?? 0);
                $rate = (float)($payload['Rate'] ?? 0);
                $cash = (float)($payload['CashDeposited'] ?? 0);
                $upi = (float)($payload['UPIDeposited'] ?? 0);
                $hpPay = (float)($payload['HPPayDeposited'] ?? 0);
                $hpPayCount = (int)($payload['HPPayConsumerCount'] ?? 0);
                $hpPayRate = (float)($payload['HPPayRate'] ?? 0);
                if ($hpPayRate <= 0 && $rate > 0) {
                    $hpPayRate = $rate;
                }
                if ($hpPayCount > 0 && $hpPay <= 0) {
                    $hpPay = round($hpPayCount * $hpPayRate, 2);
                }
                $dues = (float)($payload['DuesAllowed'] ?? 0);

                if ($empId <= 0 || $loaded <= 0) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Hawker and positive loaded cylinder count are required.']];
                }

                // If rate is 0, fetch current rate from item_rates
                if ($rate <= 0) {
                    $rStmt = $db->prepare("SELECT Rate FROM item_rates WHERE CylinderType = ? AND Category = 'SALE' AND Status = 'ACTIVE' LIMIT 1");
                    $rStmt->execute([$cylType]);
                    $rate = (float)$rStmt->fetchColumn() ?: 925.50;
                }
                if ($hpPayRate <= 0) {
                    $hpPayRate = $rate;
                }
                if ($hpPayCount > 0 && $hpPay <= 0) {
                    $hpPay = round($hpPayCount * $hpPayRate, 2);
                }

                $netSold = max(0, $loaded - $retFull);
                $expected = $netSold * $rate;
                $totalDeposited = $cash + $upi + $hpPay + $dues;
                $diff = $totalDeposited - $expected;
                $shortage = $diff < 0 ? abs($diff) : 0.0;
                $excess = $diff > 0 ? $diff : 0.0;

                $db->beginTransaction();
                try {
                    $now = date('Y-m-d H:i:s');
                    $datePrefix = date('Ymd', strtotime($dispatchDate));

                    $dispId = !empty($payload['DispatchID']) ? (int)$payload['DispatchID'] : null;

                    if ($dispId) {
                        // Update
                        $consumerDetails = $payload['HPPayConsumerDetails'] ?? null;
                        $consumerJson = is_array($consumerDetails) ? json_encode($consumerDetails) : (trim((string)$consumerDetails) ?: null);

                        $upd = $db->prepare("UPDATE hawker_dispatch SET 
                            Date = ?, EmpID = ?, CylinderType = ?, LoadedQuantity = ?, ReturnedEmpty = ?, ReturnedFull = ?,
                            NetSold = ?, Rate = ?, ExpectedCollection = ?, CashDeposited = ?, UPIDeposited = ?, HPPayDeposited = ?, 
                            HPPayConsumerCount = ?, HPPayRate = ?, HPPayConsumerDetails = ?, DuesAllowed = ?,
                            ShortageAmount = ?, ExcessAmount = ?, Area = ?, VehicleNo = ?, Remarks = ?, UpdatedBy = ?, UpdatedAt = ?
                            WHERE DispatchID = ?");
                        $upd->execute([
                            $dispatchDate, $empId, $cylType, $loaded, $retEmpty, $retFull,
                            $netSold, $rate, $expected, $cash, $upi, $hpPay,
                            $hpPayCount, $hpPayRate, $consumerJson, $dues,
                            $shortage, $excess, trim($payload['Area'] ?? ''), trim($payload['VehicleNo'] ?? ''),
                            trim($payload['Remarks'] ?? ''), $user['userId'], $now, $dispId
                        ]);
                    } else {
                        // Create
                        $consumerDetails = $payload['HPPayConsumerDetails'] ?? null;
                        $consumerJson = is_array($consumerDetails) ? json_encode($consumerDetails) : (trim((string)$consumerDetails) ?: null);

                        $seqStmt = $db->prepare("SELECT COUNT(*) FROM hawker_dispatch WHERE DispatchNumber LIKE ?");
                        $seqStmt->execute(["DSP-$datePrefix%"]);
                        $seq = (int)$seqStmt->fetchColumn() + 1;
                        $dispNo = sprintf("DSP-%s-%04d", $datePrefix, $seq);

                        $ins = $db->prepare("INSERT INTO hawker_dispatch (
                            DispatchNumber, Date, EmpID, CylinderType, LoadedQuantity, ReturnedEmpty, ReturnedFull,
                            NetSold, Rate, ExpectedCollection, CashDeposited, UPIDeposited, HPPayDeposited, 
                            HPPayConsumerCount, HPPayRate, HPPayConsumerDetails, DuesAllowed,
                            ShortageAmount, ExcessAmount, Area, VehicleNo, Remarks, CreatedBy, CreatedAt, UpdatedAt
                        ) VALUES (
                            ?, ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?, ?, ?
                        )");
                        $ins->execute([
                            $dispNo, $dispatchDate, $empId, $cylType, $loaded, $retEmpty, $retFull,
                            $netSold, $rate, $expected, $cash, $upi, $hpPay,
                            $hpPayCount, $hpPayRate, $consumerJson, $dues,
                            $shortage, $excess, trim($payload['Area'] ?? ''), trim($payload['VehicleNo'] ?? ''),
                            trim($payload['Remarks'] ?? ''), $user['userId'], $now, $now
                        ]);
                        $dispId = (int)$db->lastInsertId();
                    }

                    // Sync into hp_pay_transactions for audit & Rojnamcha print
                    $empNameStmt = $db->prepare("SELECT Name FROM employees WHERE EmpID = ?");
                    $empNameStmt->execute([$empId]);
                    $empName = $empNameStmt->fetchColumn() ?: 'Hawker';

                    $delTxn = $db->prepare("DELETE FROM hp_pay_transactions WHERE DispatchID = ?");
                    $delTxn->execute([$dispId]);

                    $consumerList = [];
                    if (!empty($consumerDetails)) {
                        if (is_array($consumerDetails)) {
                            $consumerList = $consumerDetails;
                        } else {
                            $rawList = preg_split('/[\r\n,]+/', (string)$consumerDetails);
                            foreach ($rawList as $rItem) {
                                $cNo = trim($rItem);
                                if (!empty($cNo)) {
                                    $consumerList[] = ['ConsumerNo' => $cNo, 'Amount' => $hpPayRate];
                                }
                            }
                        }
                    }

                    if (!empty($consumerList)) {
                        $insTxn = $db->prepare("INSERT INTO hp_pay_transactions (
                            Date, DispatchID, EmpID, HawkerName, ConsumerNo, CylinderType, Amount, ReferenceNo, Remarks, CreatedAt
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                        foreach ($consumerList as $c) {
                            $cNo = is_array($c) ? trim($c['ConsumerNo'] ?? '') : trim((string)$c);
                            if (empty($cNo)) continue;
                            $cAmt = is_array($c) && !empty($c['Amount']) ? (float)$c['Amount'] : $hpPayRate;
                            $cRef = is_array($c) ? trim($c['ReferenceNo'] ?? '') : '';
                            $cRem = is_array($c) ? trim($c['Remarks'] ?? '') : '';
                            $insTxn->execute([
                                $dispatchDate, $dispId, $empId, $empName, $cNo, $cylType, $cAmt, $cRef, $cRem, $now
                            ]);
                        }
                    }

                    // Auto-sync Cashbook hawker cash
                    if ($cash > 0) {
                        $cbCheck = $db->prepare("SELECT CashbookID FROM cashbook WHERE Date = ?");
                        $cbCheck->execute([$dispatchDate]);
                        $cbId = $cbCheck->fetchColumn();
                        if ($cbId) {
                            $updCb = $db->prepare("UPDATE cashbook SET 
                                HawkerCash = HawkerCash + ?,
                                TotalInflow = TotalInflow + ?,
                                ExpectedClosing = ExpectedClosing + ?,
                                UpdatedAt = ?
                                WHERE CashbookID = ?");
                            $updCb->execute([$cash, $cash, $cash, $now, $cbId]);
                        } else {
                            $insCb = $db->prepare("INSERT INTO cashbook (Date, OpeningCash, HawkerCash, TotalInflow, ExpectedClosing, PhysicalClosing, CreatedBy, CreatedAt, UpdatedAt)
                                VALUES (?, 0, ?, ?, ?, 0, ?, ?, ?)");
                            $insCb->execute([$dispatchDate, $cash, $cash, $cash, $user['userId'], $now, $now]);
                        }
                    }

                    $db->commit();

                    Audit::log($user['userId'], $user['username'], 'DISPATCH_LOG', 'dispatch', (string)$dispId, null, [
                        'empId' => $empId,
                        'netSold' => $netSold,
                        'cash' => $cash,
                        'shortage' => $shortage
                    ], "Hawker dispatch entry recorded");

                    return ['ok' => true, 'data' => ['DispatchID' => $dispId], 'message' => 'Hawker dispatch record saved.'];
                } catch (Exception $e) {
                    $db->rollBack();
                    return ['ok' => false, 'error' => ['code' => 'SERVER', 'message' => 'Failed to save dispatch: ' . $e->getMessage()]];
                }

            case 'listHPPayTransactions':
                $date = $payload['date'] ?? null;
                $startDate = $payload['startDate'] ?? null;
                $endDate = $payload['endDate'] ?? null;
                $empId = !empty($payload['EmpID']) ? (int)$payload['EmpID'] : null;

                $sql = "SELECT * FROM hp_pay_transactions WHERE 1=1";
                $params = [];
                if ($date) {
                    $sql .= " AND Date = ?";
                    $params[] = $date;
                } elseif ($startDate && $endDate) {
                    $sql .= " AND Date BETWEEN ? AND ?";
                    $params[] = $startDate;
                    $params[] = $endDate;
                }
                if ($empId) {
                    $sql .= " AND EmpID = ?";
                    $params[] = $empId;
                }
                $sql .= " ORDER BY TxnID ASC";
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                return ['ok' => true, 'data' => $stmt->fetchAll()];

            case 'getHawkerPerformance':
                $startDate = $payload['startDate'] ?? date('Y-m-01');
                $endDate = $payload['endDate'] ?? date('Y-m-d');

                $stmt = $db->prepare("SELECT 
                    e.EmpID, e.Name, e.Mobile,
                    COUNT(hd.DispatchID) as TotalTrips,
                    SUM(hd.LoadedQuantity) as TotalLoaded,
                    SUM(hd.NetSold) as TotalSold,
                    SUM(hd.ExpectedCollection) as TotalExpected,
                    SUM(hd.CashDeposited) as TotalCash,
                    SUM(hd.UPIDeposited) as TotalUPI,
                    SUM(hd.DuesAllowed) as TotalDues,
                    SUM(hd.ShortageAmount) as TotalShortage,
                    SUM(hd.ExcessAmount) as TotalExcess
                FROM employees e 
                JOIN hawker_dispatch hd ON e.EmpID = hd.EmpID 
                WHERE hd.Date BETWEEN ? AND ? 
                GROUP BY e.EmpID ORDER BY TotalSold DESC");
                $stmt->execute([$startDate, $endDate]);
                $perf = $stmt->fetchAll();

                return ['ok' => true, 'data' => $perf];

            default:
                return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Invalid dispatch action.']];
        }
    }
}
