<?php
/**
 * DashboardController
 * Computes Real-Time KPIs & Analytics from Database
 */
require_once __DIR__ . '/../db.php';

class DashboardController {
    public static function handle(string $action, array $payload, ?array $user): array {
        $db = Database::getConnection();

        switch ($action) {
            case 'getDashboard':
                $filter = $payload['filter'] ?? 'today';
                $customDate = $payload['date'] ?? date('Y-m-d');
                $today = date('Y-m-d');

                // Compute start & end dates
                if ($filter === 'yesterday') {
                    $startDate = date('Y-m-d', strtotime('-1 day'));
                    $endDate = $startDate;
                } elseif ($filter === 'this_week') {
                    $startDate = date('Y-m-d', strtotime('monday this week'));
                    $endDate = date('Y-m-d');
                } elseif ($filter === 'this_month') {
                    $startDate = date('Y-m-01');
                    $endDate = date('Y-m-d');
                } elseif ($filter === 'custom') {
                    $startDate = $customDate;
                    $endDate = $customDate;
                } else { // today
                    $startDate = $today;
                    $endDate = $today;
                }

                // 1. Gross Billing & Settlements
                $billStmt = $db->prepare("SELECT 
                    COUNT(*) as totalBills,
                    COALESCE(SUM(TotalAmount), 0) as grossBilling,
                    COALESCE(SUM(PaidCash), 0) as cashBilling,
                    COALESCE(SUM(PaidUPI + PaidHPPay + PaidBank), 0) as digitalBilling,
                    COALESCE(SUM(PaidDues), 0) as duesBilling
                FROM bills WHERE BillDate BETWEEN ? AND ? AND IsCancelled = 0 AND IsDeleted = 0");
                $billStmt->execute([$startDate, $endDate]);
                $billStats = $billStmt->fetch();

                // 2. Dues Recovered
                $dueRecStmt = $db->prepare("SELECT COALESCE(SUM(Amount), 0) FROM due_payments WHERE PaymentDate BETWEEN ? AND ?");
                $dueRecStmt->execute([$startDate, $endDate]);
                $duesRecovered = (float)$dueRecStmt->fetchColumn();

                // 3. Outstanding Dues Total
                $outDuesStmt = $db->query("SELECT COALESCE(SUM(RemainingAmount), 0) FROM customer_dues WHERE Status != 'CLEARED' AND IsWrittenOff = 0");
                $outstandingDues = (float)$outDuesStmt->fetchColumn();

                // 4. Cylinders Delivered
                $cylStmt = $db->prepare("SELECT COALESCE(SUM(Quantity), 0) FROM bill_items bi 
                    JOIN bills b ON bi.BillID = b.BillID 
                    WHERE b.BillDate BETWEEN ? AND ? AND b.IsCancelled = 0 AND b.IsDeleted = 0 AND bi.Category = 'SALE'");
                $cylStmt->execute([$startDate, $endDate]);
                $cylindersDelivered = (int)$cylStmt->fetchColumn();

                // 5. Cashbook Stats for selected date
                $cashStmt = $db->prepare("SELECT 
                    OpeningCash, CounterCash, HawkerCash, DuesCash, OtherInflow, 
                    Expenses, Refunds, BankDeposit, ExpectedClosing, PhysicalClosing, Variance, IsClosed
                FROM cashbook WHERE Date = ?");
                $cashStmt->execute([$endDate]);
                $cashStats = $cashStmt->fetch();

                $closingCash = $cashStats ? (float)($cashStats['PhysicalClosing'] > 0 ? $cashStats['PhysicalClosing'] : $cashStats['ExpectedClosing']) : 0.0;
                $todayExpenses = $cashStats ? (float)$cashStats['Expenses'] : 0.0;
                $todayRefunds = $cashStats ? (float)$cashStats['Refunds'] : 0.0;
                $netCashInflow = (float)$billStats['cashBilling'] + $duesRecovered;

                // 6. New Customers
                $custStmt = $db->prepare("SELECT COUNT(*) FROM customers WHERE SUBSTR(CreatedAt, 1, 10) BETWEEN ? AND ? AND IsDeleted = 0");
                $custStmt->execute([$startDate, $endDate]);
                $newCustomers = (int)$custStmt->fetchColumn();

                // 7. Attendance Present
                $attStmt = $db->prepare("SELECT COUNT(*) FROM attendance WHERE Date = ? AND Status IN ('PRESENT', 'HALF_DAY')");
                $attStmt->execute([$endDate]);
                $employeesPresent = (int)$attStmt->fetchColumn();

                // 8. Pending Followups
                $folStmt = $db->prepare("SELECT COUNT(*) FROM followups WHERE DueDate <= ? AND Status = 'PENDING'");
                $folStmt->execute([$endDate]);
                $pendingFollowups = (int)$folStmt->fetchColumn();

                // 9. Low Stock Check
                $lowStockCount = 0;
                $thresholdStmt = $db->query("SELECT SettingKey, SettingValue FROM settings WHERE Category = 'INVENTORY'");
                $thresholds = $thresholdStmt->fetchAll(PDO::FETCH_KEY_PAIR);
                $th142 = (int)($thresholds['LOW_STOCK_THRESHOLD_142'] ?? 50);

                $stockStmt = $db->prepare("SELECT ClosingFull FROM cylinder_stock WHERE Date = ? AND CylinderType = '14.2 KG Domestic'");
                $stockStmt->execute([$endDate]);
                $stockVal = $stockStmt->fetchColumn();
                if ($stockVal !== false && (int)$stockVal < $th142) {
                    $lowStockCount++;
                }

                // 10. Payment Mode Breakdown
                $paymentModes = [
                    'Cash' => (float)$billStats['cashBilling'],
                    'UPI' => 0.0,
                    'HP Pay' => 0.0,
                    'Bank/Other' => 0.0,
                    'Dues' => (float)$billStats['duesBilling']
                ];
                $pmStmt = $db->prepare("SELECT PaymentMode, SUM(Amount) as total FROM bill_payments bp 
                    JOIN bills b ON bp.BillID = b.BillID 
                    WHERE b.BillDate BETWEEN ? AND ? AND b.IsCancelled = 0 AND b.IsDeleted = 0 
                    GROUP BY PaymentMode");
                $pmStmt->execute([$startDate, $endDate]);
                while ($row = $pmStmt->fetch()) {
                    $m = $row['PaymentMode'];
                    if (isset($paymentModes[$m])) {
                        $paymentModes[$m] = (float)$row['total'];
                    } elseif ($m === 'HP_PAY') {
                        $paymentModes['HP Pay'] = (float)$row['total'];
                    } else {
                        $paymentModes['Bank/Other'] += (float)$row['total'];
                    }
                }

                // 11. Dues Ageing Breakdown
                $ageing = ['0-7 Days' => 0.0, '8-30 Days' => 0.0, '31-60 Days' => 0.0, '60+ Days' => 0.0];
                $allDues = $db->query("SELECT DueDate, RemainingAmount FROM customer_dues WHERE Status != 'CLEARED' AND IsWrittenOff = 0")->fetchAll();
                foreach ($allDues as $d) {
                    $days = max(0, (strtotime($today) - strtotime($d['DueDate'])) / 86400);
                    $amt = (float)$d['RemainingAmount'];
                    if ($days <= 7) $ageing['0-7 Days'] += $amt;
                    elseif ($days <= 30) $ageing['8-30 Days'] += $amt;
                    elseif ($days <= 60) $ageing['31-60 Days'] += $amt;
                    else $ageing['60+ Days'] += $amt;
                }

                // 12. Top Hawkers (Performance)
                $hawkers = $db->prepare("SELECT e.Name, SUM(hd.NetSold) as TotalSold, SUM(hd.CashDeposited + hd.UPIDeposited) as TotalCollected 
                    FROM hawker_dispatch hd 
                    JOIN employees e ON hd.EmpID = e.EmpID 
                    WHERE hd.Date BETWEEN ? AND ? 
                    GROUP BY hd.EmpID ORDER BY TotalSold DESC LIMIT 5");
                $hawkers->execute([$startDate, $endDate]);
                $topHawkers = $hawkers->fetchAll();

                // 13. Sales Trend (Past 7 days)
                $trendLabels = [];
                $trendData = [];
                for ($i = 6; $i >= 0; $i--) {
                    $d = date('Y-m-d', strtotime("-$i days"));
                    $trendLabels[] = date('d M', strtotime($d));
                    $tStmt = $db->prepare("SELECT COALESCE(SUM(TotalAmount), 0) FROM bills WHERE BillDate = ? AND IsCancelled = 0 AND IsDeleted = 0");
                    $tStmt->execute([$d]);
                    $trendData[] = (float)$tStmt->fetchColumn();
                }

                return [
                    'ok' => true,
                    'data' => [
                        'filter' => $filter,
                        'startDate' => $startDate,
                        'endDate' => $endDate,
                        'kpi' => [
                            'grossBilling' => (float)$billStats['grossBilling'],
                            'totalBills' => (int)$billStats['totalBills'],
                            'netCashInflow' => $netCashInflow,
                            'digitalSettlements' => (float)$billStats['digitalBilling'],
                            'outstandingDues' => $outstandingDues,
                            'cylindersDelivered' => $cylindersDelivered,
                            'closingCash' => $closingCash,
                            'newCustomers' => $newCustomers,
                            'employeesPresent' => $employeesPresent,
                            'pendingFollowups' => $pendingFollowups,
                            'lowStockCount' => $lowStockCount,
                            'todayExpenses' => $todayExpenses,
                            'todayRefunds' => $todayRefunds,
                            'isDayClosed' => $cashStats ? (int)$cashStats['IsClosed'] === 1 : false
                        ],
                        'charts' => [
                            'paymentModes' => $paymentModes,
                            'ageing' => $ageing,
                            'topHawkers' => $topHawkers,
                            'trend' => [
                                'labels' => $trendLabels,
                                'data' => $trendData
                            ]
                        ]
                    ]
                ];

            case 'getSystemHealth':
                $dbSize = file_exists(DB_SQLITE_PATH) ? filesize(DB_SQLITE_PATH) : 0;
                $usersCount = $db->query("SELECT COUNT(*) FROM users WHERE IsDeleted = 0")->fetchColumn();
                $custCount = $db->query("SELECT COUNT(*) FROM customers WHERE IsDeleted = 0")->fetchColumn();
                $billsCount = $db->query("SELECT COUNT(*) FROM bills WHERE IsDeleted = 0")->fetchColumn();
                $lastBackup = $db->query("SELECT CreatedAt FROM archives ORDER BY ArchiveID DESC LIMIT 1")->fetchColumn() ?: 'None';

                return [
                    'ok' => true,
                    'data' => [
                        'status' => 'ONLINE',
                        'phpVersion' => PHP_VERSION,
                        'database' => DB_DRIVER . ' (ACID compliant)',
                        'databaseSize' => round($dbSize / 1024, 2) . ' KB',
                        'totalUsers' => (int)$usersCount,
                        'totalCustomers' => (int)$custCount,
                        'totalBills' => (int)$billsCount,
                        'lastBackup' => $lastBackup,
                        'serverTime' => date('Y-m-d H:i:s'),
                        'timezone' => date_default_timezone_get()
                    ]
                ];

            default:
                return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Invalid dashboard action.']];
        }
    }
}
