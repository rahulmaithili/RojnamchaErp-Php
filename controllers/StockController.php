<?php
/**
 * StockController
 * Cylinder Inventory Management, Physical Stock Audit, Discrepancy & Movements Ledger
 */
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../audit.php';
require_once __DIR__ . '/../auth.php';

class StockController {
    public static function handle(string $action, array $payload, ?array $user): array {
        if (!$user || !Auth::checkPermission($user, 'stock', 'read')) {
            return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
        }

        $db = Database::getConnection();

        switch ($action) {
            case 'getStock':
                $date = $payload['date'] ?? date('Y-m-d');
                $cylTypes = [
                    '14.2 KG Domestic',
                    '19 KG Commercial',
                    '5 KG Commercial',
                    '5 KG Domestic',
                    '2 KG Commercial'
                ];

                $stocks = [];
                foreach ($cylTypes as $type) {
                    $stmt = $db->prepare("SELECT * FROM cylinder_stock WHERE Date = ? AND CylinderType = ?");
                    $stmt->execute([$date, $type]);
                    $row = $stmt->fetch();

                    if (!$row) {
                        // Look for previous day closing full and empty to use as opening
                        $prevDate = date('Y-m-d', strtotime($date . ' -1 day'));
                        $prevStmt = $db->prepare("SELECT ClosingFull, ClosingEmpty FROM cylinder_stock WHERE Date = ? AND CylinderType = ?");
                        $prevStmt->execute([$prevDate, $type]);
                        $prev = $prevStmt->fetch();

                        $defaultOpenings = [
                            '14.2 KG Domestic' => ['full' => 683, 'empty' => 306],
                            '19 KG Commercial' => ['full' => 143, 'empty' => 50],
                            '5 KG Commercial' => ['full' => 142, 'empty' => 280],
                            '5 KG Domestic' => ['full' => 63, 'empty' => 191],
                            '2 KG Commercial' => ['full' => 119, 'empty' => 55]
                        ];

                        $opFull = $prev ? (int)$prev['ClosingFull'] : ($defaultOpenings[$type]['full'] ?? 0);
                        $opEmpty = $prev ? (int)$prev['ClosingEmpty'] : ($defaultOpenings[$type]['empty'] ?? 0);

                        // Calculate today's POS sales for this cylinder type
                        $posStmt = $db->prepare("SELECT COALESCE(SUM(bi.Quantity), 0) FROM bill_items bi 
                            JOIN bills b ON bi.BillID = b.BillID 
                            WHERE b.BillDate = ? AND bi.CylinderType = ? AND bi.Category = 'SALE' AND b.IsCancelled = 0 AND b.IsDeleted = 0");
                        $posStmt->execute([$date, $type]);
                        $soldPos = (int)$posStmt->fetchColumn();

                        // Calculate today's hawker sold
                        $hwkStmt = $db->prepare("SELECT COALESCE(SUM(NetSold), 0), COALESCE(SUM(ReturnedEmpty), 0) FROM hawker_dispatch WHERE Date = ? AND CylinderType = ?");
                        $hwkStmt->execute([$date, $type]);
                        $hwkData = $hwkStmt->fetch();
                        $soldHwk = (int)($hwkData[0] ?? 0);
                        $emptyRet = (int)($hwkData[1] ?? 0);

                        $closingFull = max(0, $opFull - ($soldPos + $soldHwk));
                        $closingEmpty = max(0, $opEmpty + ($soldPos + $emptyRet));

                        $stocks[] = [
                            'Date' => $date,
                            'CylinderType' => $type,
                            'OpeningFull' => $opFull,
                            'OpeningEmpty' => $opEmpty,
                            'PlantReceipt' => 0,
                            'CounterSold' => $soldPos,
                            'HawkerSold' => $soldHwk,
                            'DefectiveReceived' => 0,
                            'SoundEmptyReceived' => $emptyRet + $soldPos,
                            'SentToPlant' => 0,
                            'ClosingFull' => $closingFull,
                            'ClosingEmpty' => $closingEmpty,
                            'PhysicalCountFull' => null,
                            'PhysicalCountEmpty' => null,
                            'VarianceFull' => 0,
                            'VarianceEmpty' => 0,
                            'Remarks' => ''
                        ];
                    } else {
                        $stocks[] = $row;
                    }
                }

                return ['ok' => true, 'data' => $stocks];

            case 'saveStock':
                if (!Auth::checkPermission($user, 'stock', 'update') && !Auth::checkPermission($user, 'stock', 'create')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }

                $entries = $payload['stocks'] ?? [];
                if (empty($entries) || !is_array($entries)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Stock entries list required.']];
                }

                $db->beginTransaction();
                try {
                    $now = date('Y-m-d H:i:s');
                    $upsert = $db->prepare("INSERT INTO cylinder_stock (
                        Date, CylinderType, OpeningFull, OpeningEmpty, PlantReceipt, EMRReceived, CounterSold, HawkerSold,
                        DefectiveReceived, SoundEmptyReceived, SentToPlant, ClosingFull, ClosingEmpty,
                        PhysicalCountFull, PhysicalCountEmpty, VarianceFull, VarianceEmpty, Remarks,
                        CreatedBy, CreatedAt, UpdatedAt
                    ) VALUES (
                        :Date, :CylinderType, :OpeningFull, :OpeningEmpty, :PlantReceipt, :EMRReceived, :CounterSold, :HawkerSold,
                        :DefectiveReceived, :SoundEmptyReceived, :SentToPlant, :ClosingFull, :ClosingEmpty,
                        :PhysicalCountFull, :PhysicalCountEmpty, :VarianceFull, :VarianceEmpty, :Remarks,
                        :CreatedBy, :CreatedAt, :UpdatedAt
                    ) ON CONFLICT(Date, CylinderType) DO UPDATE SET
                        OpeningFull = excluded.OpeningFull,
                        OpeningEmpty = excluded.OpeningEmpty,
                        PlantReceipt = excluded.PlantReceipt,
                        EMRReceived = excluded.EMRReceived,
                        CounterSold = excluded.CounterSold,
                        HawkerSold = excluded.HawkerSold,
                        DefectiveReceived = excluded.DefectiveReceived,
                        SoundEmptyReceived = excluded.SoundEmptyReceived,
                        SentToPlant = excluded.SentToPlant,
                        ClosingFull = excluded.ClosingFull,
                        ClosingEmpty = excluded.ClosingEmpty,
                        PhysicalCountFull = excluded.PhysicalCountFull,
                        PhysicalCountEmpty = excluded.PhysicalCountEmpty,
                        VarianceFull = excluded.VarianceFull,
                        VarianceEmpty = excluded.VarianceEmpty,
                        Remarks = excluded.Remarks,
                        UpdatedAt = excluded.UpdatedAt");

                    foreach ($entries as $e) {
                        $date = $e['Date'] ?? date('Y-m-d');
                        $cylType = $e['CylinderType'];
                        $opFull = (int)($e['OpeningFull'] ?? 0);
                        $opEmpty = (int)($e['OpeningEmpty'] ?? 0);
                        $plantRec = (int)($e['PlantReceipt'] ?? 0);
                        $emrRec = (int)($e['EMRReceived'] ?? 0);
                        $cntSold = (int)($e['CounterSold'] ?? 0);
                        $hwkSold = (int)($e['HawkerSold'] ?? 0);
                        $defRec = (int)($e['DefectiveReceived'] ?? 0);
                        $soundRec = (int)($e['SoundEmptyReceived'] ?? 0);
                        $sentPlant = (int)($e['SentToPlant'] ?? 0);

                        $closingFull = max(0, $opFull + $plantRec + $emrRec - ($cntSold + $hwkSold));
                        $closingEmpty = max(0, ($opEmpty + $soundRec + $defRec) - $sentPlant);

                        $phyFull = isset($e['PhysicalCountFull']) && $e['PhysicalCountFull'] !== '' ? (int)$e['PhysicalCountFull'] : null;
                        $phyEmpty = isset($e['PhysicalCountEmpty']) && $e['PhysicalCountEmpty'] !== '' ? (int)$e['PhysicalCountEmpty'] : null;

                        $varFull = $phyFull !== null ? ($phyFull - $closingFull) : 0;
                        $varEmpty = $phyEmpty !== null ? ($phyEmpty - $closingEmpty) : 0;

                        $upsert->execute([
                            ':Date' => $date,
                            ':CylinderType' => $cylType,
                            ':OpeningFull' => $opFull,
                            ':OpeningEmpty' => $opEmpty,
                            ':PlantReceipt' => $plantRec,
                            ':EMRReceived' => $emrRec,
                            ':CounterSold' => $cntSold,
                            ':HawkerSold' => $hwkSold,
                            ':DefectiveReceived' => $defRec,
                            ':SoundEmptyReceived' => $soundRec,
                            ':SentToPlant' => $sentPlant,
                            ':ClosingFull' => $closingFull,
                            ':ClosingEmpty' => $closingEmpty,
                            ':PhysicalCountFull' => $phyFull,
                            ':PhysicalCountEmpty' => $phyEmpty,
                            ':VarianceFull' => $varFull,
                            ':VarianceEmpty' => $varEmpty,
                            ':Remarks' => trim($e['Remarks'] ?? ''),
                            ':CreatedBy' => $user['userId'],
                            ':CreatedAt' => $now,
                            ':UpdatedAt' => $now
                        ]);
                    }

                    $db->commit();
                    Audit::log($user['userId'], $user['username'], 'STOCK_UPDATE', 'stock', null, null, $entries, 'Daily cylinder stock updated');
                    return ['ok' => true, 'data' => null, 'message' => 'Cylinder stock counts updated successfully.'];
                } catch (Exception $e) {
                    $db->rollBack();
                    return ['ok' => false, 'error' => ['code' => 'SERVER', 'message' => 'Failed to save stock: ' . $e->getMessage()]];
                }

            case 'recordEMRReceipt':
                if (!Auth::checkPermission($user, 'stock', 'create') && !Auth::checkPermission($user, 'stock', 'update')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }

                $date = trim($payload['Date'] ?? date('Y-m-d'));
                $cylType = trim($payload['CylinderType'] ?? '14.2 KG Domestic');
                $qty = (int)($payload['Quantity'] ?? 0);
                $chlNo = trim($payload['ChallanNumber'] ?? 'EMR-' . date('Ymd'));
                $remarks = trim($payload['Remarks'] ?? 'EMR Replacement Filled Cylinders Received');

                if ($qty <= 0) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'EMR cylinder quantity must be greater than zero.']];
                }

                $db->beginTransaction();
                try {
                    $now = date('Y-m-d H:i:s');
                    $stCheck = $db->prepare("SELECT * FROM cylinder_stock WHERE Date = ? AND CylinderType = ?");
                    $stCheck->execute([$date, $cylType]);
                    $stRow = $stCheck->fetch();

                    $oldFull = 0;
                    $newFull = 0;

                    if ($stRow) {
                        $oldFull = (int)$stRow['ClosingFull'];
                        $newEmr = (int)$stRow['EMRReceived'] + $qty;
                        $opFull = (int)$stRow['OpeningFull'];
                        $plantRec = (int)$stRow['PlantReceipt'];
                        $cntSold = (int)$stRow['CounterSold'];
                        $hwkSold = (int)$stRow['HawkerSold'];

                        $newFull = max(0, $opFull + $plantRec + $newEmr - ($cntSold + $hwkSold));

                        $upd = $db->prepare("UPDATE cylinder_stock SET EMRReceived = ?, ClosingFull = ?, UpdatedAt = ? WHERE StockID = ?");
                        $upd->execute([$newEmr, $newFull, $now, $stRow['StockID']]);
                    } else {
                        $prevDate = date('Y-m-d', strtotime($date . ' -1 day'));
                        $prevStmt = $db->prepare("SELECT ClosingFull, ClosingEmpty FROM cylinder_stock WHERE Date = ? AND CylinderType = ?");
                        $prevStmt->execute([$prevDate, $cylType]);
                        $prev = $prevStmt->fetch();

                        $defaultOpenings = [
                            '14.2 KG Domestic' => ['full' => 683, 'empty' => 306],
                            '19 KG Commercial' => ['full' => 143, 'empty' => 50],
                            '5 KG Commercial' => ['full' => 142, 'empty' => 280],
                            '5 KG Domestic' => ['full' => 63, 'empty' => 191],
                            '2 KG Commercial' => ['full' => 119, 'empty' => 55]
                        ];

                        $opFull = $prev ? (int)$prev['ClosingFull'] : ($defaultOpenings[$cylType]['full'] ?? 0);
                        $opEmpty = $prev ? (int)$prev['ClosingEmpty'] : ($defaultOpenings[$cylType]['empty'] ?? 0);
                        $oldFull = $opFull;
                        $newFull = $opFull + $qty;

                        $ins = $db->prepare("INSERT INTO cylinder_stock (
                            Date, CylinderType, OpeningFull, OpeningEmpty, PlantReceipt, EMRReceived,
                            CounterSold, HawkerSold, DefectiveReceived, SoundEmptyReceived, SentToPlant,
                            ClosingFull, ClosingEmpty, CreatedBy, CreatedAt, UpdatedAt
                        ) VALUES (?, ?, ?, ?, 0, ?, 0, 0, 0, 0, 0, ?, ?, ?, ?, ?)");
                        $ins->execute([
                            $date, $cylType, $opFull, $opEmpty, $qty, $newFull, $opEmpty, $user['userId'], $now, $now
                        ]);
                    }

                    // Stock movement
                    $mv = $db->prepare("INSERT INTO stock_movements (Date, CylinderType, MovementType, Quantity, FullOrEmpty, ReferenceNo, Reason, CreatedBy, CreatedAt)
                        VALUES (?, ?, 'EMR_RECEIPT', ?, 'FULL_IN', ?, ?, ?, ?)");
                    $mv->execute([$date, $cylType, $qty, $chlNo, $remarks, $user['userId'], $now]);

                    $db->commit();
                    Audit::log($user['userId'], $user['username'], 'EMR_RECEIPT', 'stock', null, null, $payload, "EMR $qty $cylType received. Filled stock increased from $oldFull to $newFull");

                    return [
                        'ok' => true,
                        'data' => [
                            'CylinderType' => $cylType,
                            'Quantity' => $qty,
                            'OldFilledStock' => $oldFull,
                            'NewFilledStock' => $newFull
                        ],
                        'message' => "Success: $qty EMR {$cylType} cylinders received. Filled stock increased from $oldFull to $newFull."
                    ];
                } catch (Exception $e) {
                    $db->rollBack();
                    return ['ok' => false, 'error' => ['code' => 'SERVER', 'message' => 'Failed to record EMR receipt: ' . $e->getMessage()]];
                }

            case 'recordHpclCylinderReturn':
                if (!Auth::checkPermission($user, 'stock', 'create') && !Auth::checkPermission($user, 'stock', 'update')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }

                $invNo = trim($payload['InvoiceNumber'] ?? '');
                $invDate = trim($payload['InvoiceDate'] ?? date('Y-m-d'));
                $retDate = trim($payload['ReturnDate'] ?? date('Y-m-d'));
                $retNo = trim($payload['ReturnNumber'] ?? '');
                $vehicleNo = trim($payload['VehicleNumber'] ?? '');
                $rows = $payload['Rows'] ?? [];

                if (empty($invNo)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'HPCL Invoice number is required.']];
                }
                if (empty($vehicleNo)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Vehicle / Truck number is required.']];
                }
                if (empty($rows) || !is_array($rows)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'At least one cylinder return row is required.']];
                }

                $db->beginTransaction();
                try {
                    $now = date('Y-m-d H:i:s');
                    $datePrefix = date('Ymd', strtotime($retDate));

                    if (empty($retNo)) {
                        $seq = (int)$db->query("SELECT COUNT(*) FROM hpcl_cylinder_returns")->fetchColumn() + 1;
                        $retNo = sprintf("RET-%s-%04d", $datePrefix, $seq);
                    }

                    $totalQty = 0;
                    foreach ($rows as $r) {
                        $totalQty += (int)($r['Quantity'] ?? 0);
                    }

                    $insHpcl = $db->prepare("INSERT INTO hpcl_cylinder_returns (
                        ReturnNumber, InvoiceNumber, InvoiceDate, ReturnDate, VehicleNumber, TotalQuantity, DetailsJson, Remarks, CreatedBy, CreatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    $insHpcl->execute([
                        $retNo, $invNo, $invDate, $retDate, $vehicleNo, $totalQty, json_encode($rows),
                        trim($payload['Remarks'] ?? ''), $user['userId'], $now
                    ]);
                    $returnId = (int)$db->lastInsertId();

                    // Update cylinder stock for each row
                    foreach ($rows as $r) {
                        $rawCode = trim($r['EquipmentCode'] ?? '');
                        $cylType = '14.2 KG Domestic';
                        if (stripos($rawCode, '19') !== false) {
                            $cylType = '19 KG Commercial';
                        } elseif (stripos($rawCode, '5 KG COMM') !== false || stripos($rawCode, '(055)') !== false) {
                            $cylType = '5 KG Commercial';
                        } elseif (stripos($rawCode, '5 KG DOM') !== false || stripos($rawCode, '(022)') !== false) {
                            $cylType = '5 KG Domestic';
                        } elseif (stripos($rawCode, '2 KG') !== false || stripos($rawCode, '(011)') !== false) {
                            $cylType = '2 KG Commercial';
                        }

                        $qty = (int)($r['Quantity'] ?? 0);
                        if ($qty <= 0) continue;

                        $isDef = (trim($r['EmptyOrDefective'] ?? 'Empty') === 'Defective');
                        $retType = trim($r['ReturnType'] ?? 'Delivered Load');
                        $emrReason = trim($r['EmrReasonCode'] ?? '');
                        $rem = trim($r['Remarks'] ?? '');

                        $stCheck = $db->prepare("SELECT * FROM cylinder_stock WHERE Date = ? AND CylinderType = ?");
                        $stCheck->execute([$retDate, $cylType]);
                        $stRow = $stCheck->fetch();

                        if ($stRow) {
                            $newSent = (int)$stRow['SentToPlant'] + $qty;
                            $opEmpty = (int)($stRow['OpeningEmpty'] ?? 0);
                            $soundRec = (int)$stRow['SoundEmptyReceived'];
                            $defRec = (int)$stRow['DefectiveReceived'];

                            $avail = $opEmpty + $soundRec + $defRec;
                            if ($avail < $newSent) {
                                $opEmpty += ($newSent - $avail);
                            }

                            $clEmpty = max(0, ($opEmpty + $soundRec + $defRec) - $newSent);

                            $updSt = $db->prepare("UPDATE cylinder_stock SET OpeningEmpty = ?, SentToPlant = ?, ClosingEmpty = ?, UpdatedAt = ? WHERE StockID = ?");
                            $updSt->execute([$opEmpty, $newSent, $clEmpty, $now, $stRow['StockID']]);
                        } else {
                            $defaultOpenings = [
                                '14.2 KG Domestic' => ['full' => 683, 'empty' => 306],
                                '19 KG Commercial' => ['full' => 143, 'empty' => 50],
                                '5 KG Commercial' => ['full' => 142, 'empty' => 280],
                                '5 KG Domestic' => ['full' => 63, 'empty' => 191],
                                '2 KG Commercial' => ['full' => 119, 'empty' => 55]
                            ];
                            $opFull = $defaultOpenings[$cylType]['full'] ?? 0;
                            $opEmpty = max($qty, $defaultOpenings[$cylType]['empty'] ?? 0);
                            $clEmpty = max(0, $opEmpty - $qty);

                            $insSt = $db->prepare("INSERT INTO cylinder_stock (
                                Date, CylinderType, OpeningFull, OpeningEmpty, PlantReceipt, CounterSold, HawkerSold,
                                DefectiveReceived, SoundEmptyReceived, SentToPlant, ClosingFull, ClosingEmpty, CreatedBy, CreatedAt, UpdatedAt
                            ) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, ?, ?, ?, ?, ?, ?)");
                            $insSt->execute([$retDate, $cylType, $opFull, $opEmpty, $qty, $opFull, $clEmpty, $user['userId'], $now, $now]);
                        }

                        // Stock movement
                        $mvType = ($retType === 'EMR') ? 'EMR_RETURN' : 'SENT_TO_PLANT';
                        $fullOrEmp = $isDef ? 'DEFECTIVE_OUT' : 'EMPTY_OUT';
                        $mvDesc = "HPCL Return #$retNo ($retType, Reason: $emrReason, Remarks: $rem)";

                        $mv = $db->prepare("INSERT INTO stock_movements (Date, CylinderType, MovementType, Quantity, FullOrEmpty, ReferenceNo, Reason, CreatedBy, CreatedAt)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                        $mv->execute([$retDate, $cylType, $mvType, $qty, $fullOrEmp, $retNo, $mvDesc, $user['userId'], $now]);
                    }

                    $db->commit();
                    Audit::log($user['userId'], $user['username'], 'HPCL_RETURN', 'stock', (string)$returnId, null, $payload, "HPCL cylinder return #$retNo submitted ($totalQty cylinders)");

                    return [
                        'ok' => true,
                        'data' => [
                            'ReturnID' => $returnId,
                            'ReturnNumber' => $retNo,
                            'TotalQuantity' => $totalQty
                        ],
                        'message' => "HPCL Cylinder Return #$retNo ($totalQty cylinders) submitted successfully. Stock register updated."
                    ];
                } catch (Exception $e) {
                    $db->rollBack();
                    return ['ok' => false, 'error' => ['code' => 'SERVER', 'message' => 'Failed to record cylinder return: ' . $e->getMessage()]];
                }

            case 'listHpclReturns':
                $stmt = $db->query("SELECT * FROM hpcl_cylinder_returns ORDER BY ReturnID DESC LIMIT 100");
                return ['ok' => true, 'data' => $stmt->fetchAll()];

            case 'adjustStock':
                if ($user['role'] !== 'ADMIN' && !Auth::checkPermission($user, 'stock', 'update')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin authorization required for stock adjustments.']];
                }

                $date = $payload['Date'] ?? date('Y-m-d');
                $cylType = trim($payload['CylinderType'] ?? '');
                $qty = (int)($payload['Quantity'] ?? 0);
                $movType = trim($payload['MovementType'] ?? 'ADJUSTMENT');
                $fullOrEmpty = trim($payload['FullOrEmpty'] ?? 'FULL_IN');
                $reason = trim($payload['Reason'] ?? '');

                if (empty($cylType) || $qty <= 0 || empty($reason)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Cylinder type, positive quantity and mandatory reason are required.']];
                }

                $now = date('Y-m-d H:i:s');
                $stmt = $db->prepare("INSERT INTO stock_movements (Date, CylinderType, MovementType, Quantity, FullOrEmpty, ReferenceNo, Reason, CreatedBy, CreatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$date, $cylType, $movType, $qty, $fullOrEmpty, 'ADJ-' . time(), $reason, $user['userId'], $now]);

                Audit::log($user['userId'], $user['username'], 'STOCK_ADJUSTMENT', 'stock', null, null, $payload, "Manual stock adjustment: $reason");
                return ['ok' => true, 'data' => null, 'message' => 'Stock adjustment recorded.'];

            case 'getStockLedger':
                $startDate = $payload['startDate'] ?? date('Y-m-01');
                $endDate = $payload['endDate'] ?? date('Y-m-d');
                $cylType = $payload['CylinderType'] ?? 'all';

                $sql = "SELECT * FROM stock_movements WHERE Date BETWEEN ? AND ?";
                $params = [$startDate, $endDate];

                if ($cylType !== 'all') {
                    $sql .= " AND CylinderType = ?";
                    $params[] = $cylType;
                }

                $sql .= " ORDER BY MovementID DESC LIMIT 100";
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $movements = $stmt->fetchAll();

                return ['ok' => true, 'data' => $movements];

            case 'listPlantReceipts':
                $startDate = $payload['startDate'] ?? date('Y-m-01');
                $endDate = $payload['endDate'] ?? date('Y-m-d');
                $stmt = $db->prepare("SELECT * FROM plant_truck_receipts WHERE GodownDate BETWEEN ? AND ? ORDER BY ReceiptID DESC");
                $stmt->execute([$startDate, $endDate]);
                return ['ok' => true, 'data' => $stmt->fetchAll()];

            case 'receivePlantTruck':
                if (!Auth::checkPermission($user, 'stock', 'create') && !Auth::checkPermission($user, 'stock', 'update')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }

                $db->beginTransaction();
                try {
                    $res = self::processPlantTruckReceipt($db, $payload, $user);
                    $db->commit();
                    Audit::log($user['userId'], $user['username'], 'PLANT_RECEIPT', 'stock', (string)$res['ReceiptID'], null, $payload, "Plant truck stock received and stock register updated");
                    return [
                        'ok' => true,
                        'data' => $res,
                        'message' => "Plant truck receipt {$res['ReceiptNumber']} recorded. Godown stock successfully updated."
                    ];
                } catch (Exception $e) {
                    $db->rollBack();
                    return ['ok' => false, 'error' => ['code' => 'SERVER', 'message' => 'Failed to record truck receipt: ' . $e->getMessage()]];
                }

            default:
                return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Invalid stock action.']];
        }
    }

    public static function processPlantTruckReceipt(PDO $db, array $payload, array $user): array {
        $invoiceDate = trim($payload['InvoiceDate'] ?? date('Y-m-d'));
        $godownDate = trim($payload['GodownDate'] ?? date('Y-m-d'));
        $challanNo = trim($payload['ChallanNumber'] ?? '');
        $truckNo = trim($payload['TruckNumber'] ?? '');
        $driverName = trim($payload['DriverName'] ?? '');
        $remarks = trim($payload['Remarks'] ?? '');
        $items = $payload['Items'] ?? [];

        if (empty($challanNo)) {
            throw new Exception('Plant Challan / Invoice number is required.');
        }
        if (empty($godownDate)) {
            throw new Exception('Godown in date is required.');
        }
        if (empty($items) || !is_array($items)) {
            throw new Exception('At least one cylinder item entry is required.');
        }

        $totalFilled = 0;
        $totalEmpty = 0;
        $totalDefective = 0;

        foreach ($items as $item) {
            $totalFilled += (int)($item['FilledQty'] ?? 0);
            $totalEmpty += (int)($item['EmptyQty'] ?? 0);
            $totalDefective += (int)($item['DefectiveQty'] ?? 0);
        }

        if ($totalFilled <= 0 && $totalEmpty <= 0 && $totalDefective <= 0) {
            throw new Exception('Specify quantities for cylinders received or empty returned.');
        }

        $now = date('Y-m-d H:i:s');
        $datePrefix = date('Ymd', strtotime($godownDate));

        $seqStmt = $db->prepare("SELECT COUNT(*) FROM plant_truck_receipts WHERE ReceiptNumber LIKE ?");
        $seqStmt->execute(["TRK-$datePrefix%"]);
        $seq = (int)$seqStmt->fetchColumn() + 1;
        $receiptNo = sprintf("TRK-%s-%04d", $datePrefix, $seq);

        $insTrk = $db->prepare("INSERT INTO plant_truck_receipts (
            ReceiptNumber, ChallanNumber, InvoiceDate, GodownDate, TruckNumber, DriverName,
            TotalFilledReceived, TotalEmptyReturned, TotalDefectiveReturned, DetailsJson, Remarks,
            CreatedBy, CreatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $insTrk->execute([
            $receiptNo, $challanNo, $invoiceDate, $godownDate, $truckNo, $driverName,
            $totalFilled, $totalEmpty, $totalDefective, json_encode($items), $remarks,
            $user['userId'], $now
        ]);
        $receiptId = (int)$db->lastInsertId();

        // Update cylinder_stock on GodownDate for each cylinder type
        foreach ($items as $item) {
            $cylType = trim($item['CylinderType'] ?? '');
            if (empty($cylType)) continue;

            $filledQty = (int)($item['FilledQty'] ?? 0);
            $emptyQty = (int)($item['EmptyQty'] ?? 0);
            $defectiveQty = (int)($item['DefectiveQty'] ?? 0);

            if ($filledQty === 0 && $emptyQty === 0 && $defectiveQty === 0) continue;

            $stCheck = $db->prepare("SELECT * FROM cylinder_stock WHERE Date = ? AND CylinderType = ?");
            $stCheck->execute([$godownDate, $cylType]);
            $stRow = $stCheck->fetch();

            if ($stRow) {
                $newPlantRec = (int)$stRow['PlantReceipt'] + $filledQty;
                $newSentPlant = (int)$stRow['SentToPlant'] + $emptyQty + $defectiveQty;
                $opFull = (int)$stRow['OpeningFull'];
                $opEmpty = (int)($stRow['OpeningEmpty'] ?? 0);
                $cntSold = (int)$stRow['CounterSold'];
                $hwkSold = (int)$stRow['HawkerSold'];
                $soundRec = (int)$stRow['SoundEmptyReceived'];
                $defRec = (int)$stRow['DefectiveReceived'];

                // Balance opening empties if truck return exceeds current available empties
                $availableEmp = $opEmpty + $soundRec + $defRec;
                if ($availableEmp < $newSentPlant) {
                    $opEmpty += ($newSentPlant - $availableEmp);
                }

                $closingFull = max(0, $opFull + $newPlantRec - ($cntSold + $hwkSold));
                $closingEmpty = max(0, ($opEmpty + $soundRec + $defRec) - $newSentPlant);

                $updSt = $db->prepare("UPDATE cylinder_stock SET 
                    OpeningEmpty = ?, PlantReceipt = ?, SentToPlant = ?, ClosingFull = ?, ClosingEmpty = ?, UpdatedAt = ?
                    WHERE StockID = ?");
                $updSt->execute([$opEmpty, $newPlantRec, $newSentPlant, $closingFull, $closingEmpty, $now, $stRow['StockID']]);
            } else {
                $prevDate = date('Y-m-d', strtotime($godownDate . ' -1 day'));
                $prevStmt = $db->prepare("SELECT ClosingFull, ClosingEmpty FROM cylinder_stock WHERE Date = ? AND CylinderType = ?");
                $prevStmt->execute([$prevDate, $cylType]);
                $prev = $prevStmt->fetch();

                $defaultOpenings = [
                    '14.2 KG Domestic' => ['full' => 683, 'empty' => 306],
                    '19 KG Commercial' => ['full' => 143, 'empty' => 50],
                    '5 KG Commercial' => ['full' => 142, 'empty' => 280],
                    '5 KG Domestic' => ['full' => 63, 'empty' => 191],
                    '2 KG Commercial' => ['full' => 119, 'empty' => 55]
                ];

                $opFull = $prev ? (int)$prev['ClosingFull'] : ($defaultOpenings[$cylType]['full'] ?? 0);
                $opEmpty = $prev ? (int)$prev['ClosingEmpty'] : ($defaultOpenings[$cylType]['empty'] ?? 0);
                $truckEmptyTotal = $emptyQty + $defectiveQty;
                if ($opEmpty < $truckEmptyTotal) {
                    $opEmpty = $truckEmptyTotal;
                }

                $closingFull = max(0, $opFull + $filledQty);
                $closingEmpty = max(0, $opEmpty - $truckEmptyTotal);

                $insSt = $db->prepare("INSERT INTO cylinder_stock (
                    Date, CylinderType, OpeningFull, OpeningEmpty, PlantReceipt, CounterSold, HawkerSold,
                    DefectiveReceived, SoundEmptyReceived, SentToPlant, ClosingFull, ClosingEmpty,
                    CreatedBy, CreatedAt, UpdatedAt
                ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, ?, ?, ?, ?)");
                $insSt->execute([
                    $godownDate, $cylType, $opFull, $opEmpty, $filledQty, $truckEmptyTotal,
                    $closingFull, $closingEmpty, $user['userId'], $now, $now
                ]);
            }

            // Add stock movements
            if ($filledQty > 0) {
                $mv1 = $db->prepare("INSERT INTO stock_movements (Date, CylinderType, MovementType, Quantity, FullOrEmpty, ReferenceNo, Reason, CreatedBy, CreatedAt)
                    VALUES (?, ?, 'PLANT_RECEIPT', ?, 'FULL_IN', ?, ?, ?, ?)");
                $mv1->execute([
                    $godownDate, $cylType, $filledQty, $challanNo,
                    "Plant Truck Unloaded (Truck: $truckNo, Inv Date: $invoiceDate)",
                    $user['userId'], $now
                ]);
            }
            if ($emptyQty > 0) {
                $mv2 = $db->prepare("INSERT INTO stock_movements (Date, CylinderType, MovementType, Quantity, FullOrEmpty, ReferenceNo, Reason, CreatedBy, CreatedAt)
                    VALUES (?, ?, 'SENT_TO_PLANT', ?, 'EMPTY_OUT', ?, ?, ?, ?)");
                $mv2->execute([
                    $godownDate, $cylType, $emptyQty, $challanNo,
                    "Sound Empty Returned to Plant (Truck: $truckNo)",
                    $user['userId'], $now
                ]);
            }
            if ($defectiveQty > 0) {
                $mv3 = $db->prepare("INSERT INTO stock_movements (Date, CylinderType, MovementType, Quantity, FullOrEmpty, ReferenceNo, Reason, CreatedBy, CreatedAt)
                    VALUES (?, ?, 'SENT_TO_PLANT', ?, 'DEFECTIVE_OUT', ?, ?, ?, ?)");
                $mv3->execute([
                    $godownDate, $cylType, $defectiveQty, $challanNo,
                    "Defective Returned to Plant (Truck: $truckNo)",
                    $user['userId'], $now
                ]);
            }
        }

        return [
            'ReceiptID' => $receiptId,
            'ReceiptNumber' => $receiptNo,
            'TotalFilled' => $totalFilled,
            'TotalEmpty' => $totalEmpty
        ];
    }
}
