<?php
/**
 * ReportController
 * Comprehensive Reporting Engine, Official Daily Rojnamcha & Centralized System Reconciliation
 */
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../audit.php';
require_once __DIR__ . '/../auth.php';

class ReportController {
    public static function handle(string $action, array $payload, ?array $user): array {
        if (!$user || !Auth::checkPermission($user, 'reports', 'read')) {
            return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
        }

        $db = Database::getConnection();

        switch ($action) {
            case 'getReport':
                $type = $payload['type'] ?? 'daily_sales';
                $startDate = $payload['startDate'] ?? date('Y-m-d');
                $endDate = $payload['endDate'] ?? date('Y-m-d');

                switch ($type) {
                    case 'daily_sales':
                        $stmt = $db->prepare("SELECT 
                            b.BillDate,
                            COUNT(b.BillID) as TotalBills,
                            COALESCE(SUM(b.Subtotal), 0) as Subtotal,
                            COALESCE(SUM(b.TaxAmount), 0) as TaxAmount,
                            COALESCE(SUM(b.DiscountAmount), 0) as DiscountAmount,
                            COALESCE(SUM(b.TotalAmount), 0) as TotalAmount,
                            COALESCE(SUM(b.PaidCash), 0) as TotalCash,
                            COALESCE(SUM(b.PaidUPI), 0) as TotalUPI,
                            COALESCE(SUM(b.PaidHPPay), 0) as TotalHPPay,
                            COALESCE(SUM(b.PaidDues), 0) as TotalDues,
                            COALESCE(SUM(b.PaidBank), 0) as TotalBank
                        FROM bills b 
                        WHERE b.BillDate BETWEEN ? AND ? AND b.IsCancelled = 0 AND b.IsDeleted = 0
                        GROUP BY b.BillDate ORDER BY b.BillDate DESC");
                        $stmt->execute([$startDate, $endDate]);
                        return ['ok' => true, 'data' => $stmt->fetchAll()];

                    case 'payment_modes':
                        $stmt = $db->prepare("SELECT 
                            PaymentMode, 
                            COUNT(PaymentID) as TransactionsCount,
                            COALESCE(SUM(Amount), 0) as TotalCollected 
                        FROM bill_payments 
                        WHERE PaymentDate BETWEEN ? AND ? 
                        GROUP BY PaymentMode");
                        $stmt->execute([$startDate, $endDate]);
                        return ['ok' => true, 'data' => $stmt->fetchAll()];

                    case 'item_sales':
                        $stmt = $db->prepare("SELECT 
                            bi.ItemName, bi.Category, bi.CylinderType,
                            SUM(bi.Quantity) as TotalQuantity,
                            SUM(bi.Total) as TotalRevenue
                        FROM bill_items bi 
                        JOIN bills b ON bi.BillID = b.BillID 
                        WHERE b.BillDate BETWEEN ? AND ? AND b.IsCancelled = 0 AND b.IsDeleted = 0 
                        GROUP BY bi.ItemID, bi.ItemName ORDER BY TotalRevenue DESC");
                        $stmt->execute([$startDate, $endDate]);
                        return ['ok' => true, 'data' => $stmt->fetchAll()];

                    case 'customer_statement':
                        $custId = (int)($payload['CustomerID'] ?? 0);
                        if (!$custId) {
                            return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Customer selection required.']];
                        }
                        $stmt = $db->prepare("SELECT BillNumber as DocNo, BillDate as Date, 'BILL' as Type, TotalAmount as Debit, 0 as Credit, PaidDues as BalanceNote 
                            FROM bills WHERE CustomerID = ? AND IsDeleted = 0 AND IsCancelled = 0
                            UNION ALL
                            SELECT ReceiptNumber as DocNo, PaymentDate as Date, 'DUE_RECEIPT' as Type, 0 as Debit, Amount as Credit, PaymentMode as BalanceNote 
                            FROM due_payments WHERE CustomerID = ?
                            ORDER BY Date ASC");
                        $stmt->execute([$custId, $custId]);
                        return ['ok' => true, 'data' => $stmt->fetchAll()];

                    case 'cancelled_bills':
                        $stmt = $db->prepare("SELECT b.*, u.FullName as CancelledByName 
                            FROM bills b 
                            LEFT JOIN users u ON b.CancelledBy = u.UserID 
                            WHERE b.BillDate BETWEEN ? AND ? AND b.IsCancelled = 1 ORDER BY b.BillID DESC");
                        $stmt->execute([$startDate, $endDate]);
                        return ['ok' => true, 'data' => $stmt->fetchAll()];

                    default:
                        return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Invalid report type requested.']];
                }

            case 'getRojnamcha':
                $startDate = $payload['startDate'] ?? ($payload['date'] ?? date('Y-m-d'));
                $endDate = $payload['endDate'] ?? $startDate;
                if ($startDate > $endDate) {
                    $tmp = $startDate;
                    $startDate = $endDate;
                    $endDate = $tmp;
                }
                $isRange = ($startDate !== $endDate);
                $dateDisplay = $isRange ? "$startDate to $endDate" : $startDate;

                // 1. Company profile
                $company = $db->query("SELECT * FROM companies LIMIT 1")->fetch();

                // 2. Cashbook
                if (!$isRange) {
                    $cbStmt = $db->prepare("SELECT * FROM cashbook WHERE Date = ?");
                    $cbStmt->execute([$startDate]);
                    $cb = $cbStmt->fetch() ?: [
                        'Date' => $startDate, 'OpeningCash' => 0.0, 'CounterCash' => 0.0, 'HawkerCash' => 0.0,
                        'DuesCash' => 0.0, 'OtherInflow' => 0.0, 'TotalInflow' => 0.0, 'Expenses' => 0.0,
                        'Refunds' => 0.0, 'BankDeposit' => 0.0, 'ExpectedClosing' => 0.0, 'PhysicalClosing' => 0.0,
                        'Variance' => 0.0, 'IsClosed' => 0
                    ];
                } else {
                    $openStmt = $db->prepare("SELECT OpeningCash FROM cashbook WHERE Date = ?");
                    $openStmt->execute([$startDate]);
                    $openCash = (float)($openStmt->fetchColumn() ?: 0.0);

                    $closeStmt = $db->prepare("SELECT ExpectedClosing, PhysicalClosing, Variance, IsClosed FROM cashbook WHERE Date = ?");
                    $closeStmt->execute([$endDate]);
                    $closeRow = $closeStmt->fetch() ?: ['ExpectedClosing' => 0.0, 'PhysicalClosing' => 0.0, 'Variance' => 0.0, 'IsClosed' => 0];

                    $sumCbStmt = $db->prepare("SELECT 
                        COALESCE(SUM(CounterCash), 0) as CounterCash,
                        COALESCE(SUM(HawkerCash), 0) as HawkerCash,
                        COALESCE(SUM(DuesCash), 0) as DuesCash,
                        COALESCE(SUM(OtherInflow), 0) as OtherInflow,
                        COALESCE(SUM(TotalInflow), 0) as TotalInflow,
                        COALESCE(SUM(Expenses), 0) as Expenses,
                        COALESCE(SUM(Refunds), 0) as Refunds,
                        COALESCE(SUM(BankDeposit), 0) as BankDeposit
                    FROM cashbook WHERE Date BETWEEN ? AND ?");
                    $sumCbStmt->execute([$startDate, $endDate]);
                    $sumCb = $sumCbStmt->fetch();

                    $cb = [
                        'Date' => $dateDisplay,
                        'OpeningCash' => $openCash,
                        'CounterCash' => (float)$sumCb['CounterCash'],
                        'HawkerCash' => (float)$sumCb['HawkerCash'],
                        'DuesCash' => (float)$sumCb['DuesCash'],
                        'OtherInflow' => (float)$sumCb['OtherInflow'],
                        'TotalInflow' => (float)$sumCb['TotalInflow'],
                        'Expenses' => (float)$sumCb['Expenses'],
                        'Refunds' => (float)$sumCb['Refunds'],
                        'BankDeposit' => (float)$sumCb['BankDeposit'],
                        'ExpectedClosing' => (float)$closeRow['ExpectedClosing'],
                        'PhysicalClosing' => (float)$closeRow['PhysicalClosing'],
                        'Variance' => (float)$closeRow['Variance'],
                        'IsClosed' => (int)$closeRow['IsClosed']
                    ];
                }

                // 3. Cylinder stock positions
                if (!$isRange) {
                    $stockStmt = $db->prepare("SELECT * FROM cylinder_stock WHERE Date = ?");
                    $stockStmt->execute([$startDate]);
                    $stock = $stockStmt->fetchAll();
                    if (empty($stock)) {
                        require_once __DIR__ . '/StockController.php';
                        $calcStock = StockController::handle('getStock', ['date' => $startDate], $user);
                        $stock = $calcStock['data'] ?? [];
                    }
                } else {
                    $stockStmt = $db->prepare("SELECT 
                        CylinderType,
                        (SELECT OpeningFull FROM cylinder_stock cs1 WHERE cs1.CylinderType = cs.CylinderType AND cs1.Date = ? LIMIT 1) as OpeningFull,
                        (SELECT OpeningEmpty FROM cylinder_stock cs1 WHERE cs1.CylinderType = cs.CylinderType AND cs1.Date = ? LIMIT 1) as OpeningEmpty,
                        COALESCE(SUM(PlantReceipt), 0) as PlantReceipt,
                        COALESCE(SUM(CounterSold), 0) as CounterSold,
                        COALESCE(SUM(HawkerSold), 0) as HawkerSold,
                        COALESCE(SUM(CounterSold + HawkerSold), 0) as TotalSold,
                        COALESCE(SUM(SoundEmptyReceived + DefectiveReceived), 0) as EmptyReceived,
                        COALESCE(SUM(SentToPlant), 0) as EmptyReturnedPlant,
                        (SELECT ClosingFull FROM cylinder_stock cs2 WHERE cs2.CylinderType = cs.CylinderType AND cs2.Date = ? ORDER BY cs2.StockID DESC LIMIT 1) as ClosingFull,
                        (SELECT ClosingEmpty FROM cylinder_stock cs2 WHERE cs2.CylinderType = cs.CylinderType AND cs2.Date = ? ORDER BY cs2.StockID DESC LIMIT 1) as ClosingEmpty
                    FROM cylinder_stock cs
                    WHERE Date BETWEEN ? AND ?
                    GROUP BY CylinderType");
                    $stockStmt->execute([$startDate, $startDate, $endDate, $endDate, $startDate, $endDate]);
                    $stock = $stockStmt->fetchAll();
                }

                // 4. Detailed Cylinder & Accessories Sales item-by-item
                $itemsStmt = $db->prepare("SELECT 
                    bi.ItemName, bi.Category, bi.CylinderType, bi.Rate,
                    SUM(bi.Quantity) as Qty,
                    SUM(bi.Total) as TotalAmount,
                    SUM(b.PaidCash * (bi.Total / NULLIF(b.TotalAmount, 0))) as Cash,
                    SUM(b.PaidUPI * (bi.Total / NULLIF(b.TotalAmount, 0))) as UPI,
                    SUM(b.PaidHPPay * (bi.Total / NULLIF(b.TotalAmount, 0))) as HPPay,
                    SUM(b.PaidDues * (bi.Total / NULLIF(b.TotalAmount, 0))) as Dues,
                    SUM(b.PaidBank * (bi.Total / NULLIF(b.TotalAmount, 0))) as Bank
                FROM bill_items bi 
                JOIN bills b ON bi.BillID = b.BillID 
                WHERE b.BillDate BETWEEN ? AND ? AND b.IsCancelled = 0 AND b.IsDeleted = 0 
                GROUP BY bi.ItemName, bi.Rate
                ORDER BY bi.Category ASC, bi.Total DESC");
                $itemsStmt->execute([$startDate, $endDate]);
                $itemSales = $itemsStmt->fetchAll();

                // 4b. Category summary
                $salesCat = $db->prepare("SELECT 
                    bi.Category,
                    COUNT(DISTINCT b.BillID) as BillsCount,
                    SUM(bi.Quantity) as TotalUnits,
                    SUM(bi.Total) as TotalAmount
                FROM bill_items bi 
                JOIN bills b ON bi.BillID = b.BillID 
                WHERE b.BillDate BETWEEN ? AND ? AND b.IsCancelled = 0 AND b.IsDeleted = 0 
                GROUP BY bi.Category");
                $salesCat->execute([$startDate, $endDate]);
                $categorySales = $salesCat->fetchAll();

                // 5. Total Digital & Cash Collections
                $collStmt = $db->prepare("SELECT 
                    COALESCE(SUM(PaidCash), 0) as Cash,
                    COALESCE(SUM(PaidUPI), 0) as UPI,
                    COALESCE(SUM(PaidHPPay), 0) as HPPay,
                    COALESCE(SUM(PaidDues), 0) as Dues,
                    COALESCE(SUM(PaidBank), 0) as Bank,
                    COALESCE(SUM(TotalAmount), 0) as GrandTotal
                FROM bills WHERE BillDate BETWEEN ? AND ? AND IsCancelled = 0 AND IsDeleted = 0");
                $collStmt->execute([$startDate, $endDate]);
                $collections = $collStmt->fetch();

                // 5b. Previous Outstanding Dues Recovered
                $duesRecStmt = $db->prepare("SELECT 
                    dp.*, c.Name as CustomerName, c.CustomerCode, c.ConsumerNo, cd.DueNumber
                FROM due_payments dp
                LEFT JOIN customers c ON dp.CustomerID = c.CustomerID
                LEFT JOIN customer_dues cd ON dp.DueID = cd.DueID
                WHERE dp.PaymentDate BETWEEN ? AND ?
                ORDER BY dp.ReceiptID DESC");
                $duesRecStmt->execute([$startDate, $endDate]);
                $duesRecovered = $duesRecStmt->fetchAll();

                // 5c. All active customer dues summary
                $allDuesStmt = $db->query("SELECT 
                    COALESCE(SUM(CurrentDues), 0) as TotalOutstandingDues,
                    COUNT(CustomerID) as TotalDueCustomers
                FROM customers WHERE CurrentDues > 0 AND IsDeleted = 0");
                $duesSummary = $allDuesStmt->fetch();

                // 6. Hawker dispatches
                $hwkStmt = $db->prepare("SELECT 
                    e.EmpID,
                    e.Name as HawkerName,
                    COALESCE(SUM(hd.LoadedQuantity), 0) as LoadedQuantity,
                    COALESCE(SUM(hd.ReturnedEmpty), 0) as ReturnedEmpty,
                    COALESCE(SUM(hd.ReturnedFull), 0) as ReturnedFull,
                    COALESCE(SUM(hd.NetSold), 0) as NetSold,
                    COALESCE(SUM(hd.CashDeposited), 0) as CashDeposited,
                    COALESCE(SUM(hd.UPIDeposited), 0) as UPIDeposited,
                    COALESCE(SUM(hd.HPPayDeposited), 0) as HPPayDeposited,
                    COALESCE(SUM(hd.HPPayConsumerCount), 0) as HPPayConsumerCount,
                    COALESCE(MAX(hd.HPPayRate), 0) as HPPayRate,
                    COALESCE(SUM(hd.DuesAllowed), 0) as DuesAllowed,
                    COALESCE(SUM(hd.ShortageAmount), 0) as ShortageAmount
                FROM employees e
                LEFT JOIN hawker_dispatch hd ON e.EmpID = hd.EmpID AND hd.Date BETWEEN ? AND ?
                WHERE e.Role = 'Hawker' AND e.IsDeleted = 0
                GROUP BY e.EmpID, e.Name
                ORDER BY e.EmpID ASC");
                $hwkStmt->execute([$startDate, $endDate]);
                $hawkers = $hwkStmt->fetchAll();

                // 7. Day closing record
                $dcStmt = $db->prepare("SELECT * FROM day_closings WHERE Date = ?");
                $dcStmt->execute([$endDate]);
                $dayClosing = $dcStmt->fetch();

                // 8. Detailed HP Pay Consumer Number Transactions
                $hpPayTxnsStmt = $db->prepare("SELECT * FROM hp_pay_transactions WHERE Date BETWEEN ? AND ? ORDER BY TxnID ASC");
                $hpPayTxnsStmt->execute([$startDate, $endDate]);
                $hpPayTransactions = $hpPayTxnsStmt->fetchAll();

                return [
                    'ok' => true,
                    'data' => [
                        'date' => $dateDisplay,
                        'startDate' => $startDate,
                        'endDate' => $endDate,
                        'isRange' => $isRange,
                        'company' => $company,
                        'cashbook' => $cb,
                        'stock' => $stock,
                        'itemSales' => $itemSales,
                        'categorySales' => $categorySales,
                        'collections' => $collections,
                        'duesRecovered' => $duesRecovered,
                        'duesSummary' => $duesSummary,
                        'hawkers' => $hawkers,
                        'hpPayTransactions' => $hpPayTransactions,
                        'dayClosing' => $dayClosing
                    ]
                ];

            case 'getReconciliation':
                $date = $payload['date'] ?? date('Y-m-d');

                $checks = [];
                $hasDiscrepancy = false;

                // CHECK 1: POS Billing Total vs Payments Settlement Total
                $bStmt = $db->prepare("SELECT 
                    COALESCE(SUM(TotalAmount), 0) as BillTotal,
                    COALESCE(SUM(PaidCash + PaidUPI + PaidHPPay + PaidDues + PaidBank), 0) as SettlementTotal
                FROM bills WHERE BillDate = ? AND IsCancelled = 0 AND IsDeleted = 0");
                $bStmt->execute([$date]);
                $bRow = $bStmt->fetch();
                $diff1 = round(abs((float)$bRow['BillTotal'] - (float)$bRow['SettlementTotal']), 2);
                $isOk1 = $diff1 === 0.0;
                if (!$isOk1) $hasDiscrepancy = true;

                $checks[] = [
                    'source' => 'POS Billing vs Payment Modes',
                    'expected' => (float)$bRow['BillTotal'],
                    'actual' => (float)$bRow['SettlementTotal'],
                    'difference' => $diff1,
                    'status' => $isOk1 ? 'MATCHED' : 'DISCREPANCY',
                    'note' => $isOk1 ? 'All bills perfectly settled across payment modes' : 'Settlement mismatch detected in bill tenders'
                ];

                // CHECK 2: Cashbook Expected Closing vs Physical Denominations
                $cbStmt = $db->prepare("SELECT ExpectedClosing, PhysicalClosing, Variance, VarianceReason FROM cashbook WHERE Date = ?");
                $cbStmt->execute([$date]);
                $cbRow = $cbStmt->fetch();
                if ($cbRow && (float)$cbRow['PhysicalClosing'] > 0) {
                    $diff2 = round(abs((float)$cbRow['Variance']), 2);
                    $isOk2 = $diff2 === 0.0;
                    if (!$isOk2) $hasDiscrepancy = true;
                    $checks[] = [
                        'source' => 'Physical Cash vs Expected Cashbook',
                        'expected' => (float)$cbRow['ExpectedClosing'],
                        'actual' => (float)$cbRow['PhysicalClosing'],
                        'difference' => $diff2,
                        'status' => $isOk2 ? 'MATCHED' : 'DISCREPANCY',
                        'note' => $isOk2 ? 'Cash drawer matches exact system expected balance' : ('Variance: ' . ($cbRow['VarianceReason'] ?: 'Unexplained variance'))
                    ];
                } else {
                    $checks[] = [
                        'source' => 'Physical Cash vs Expected Cashbook',
                        'expected' => $cbRow ? (float)$cbRow['ExpectedClosing'] : 0.0,
                        'actual' => 0.0,
                        'difference' => 0.0,
                        'status' => 'PENDING_PHYSICAL_COUNT',
                        'note' => 'Physical cash denominations not yet submitted'
                    ];
                }

                // CHECK 3: Hawker Dispatch Loading vs Collections
                $hwkStmt = $db->prepare("SELECT 
                    COALESCE(SUM(ExpectedCollection), 0) as Expected,
                    COALESCE(SUM(CashDeposited + UPIDeposited + DuesAllowed), 0) as Deposited,
                    COALESCE(SUM(ShortageAmount), 0) as Shortage
                FROM hawker_dispatch WHERE Date = ?");
                $hwkStmt->execute([$date]);
                $hwkRow = $hwkStmt->fetch();
                $diff3 = round((float)$hwkRow['Shortage'], 2);
                $isOk3 = $diff3 === 0.0;
                if (!$isOk3) $hasDiscrepancy = true;

                $checks[] = [
                    'source' => 'Hawker Deliveries vs Collections',
                    'expected' => (float)$hwkRow['Expected'],
                    'actual' => (float)$hwkRow['Deposited'],
                    'difference' => $diff3,
                    'status' => $isOk3 ? 'MATCHED' : 'DISCREPANCY',
                    'note' => $isOk3 ? 'All hawker collections deposited in full' : "Hawker shortages totaling ₹" . number_format($diff3, 2)
                ];

                return [
                    'ok' => true,
                    'data' => [
                        'date' => $date,
                        'overallStatus' => $hasDiscrepancy ? 'DISCREPANCY DETECTED' : 'BALANCED',
                        'checks' => $checks
                    ]
                ];

            default:
                return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Invalid report action.']];
        }
    }
}
