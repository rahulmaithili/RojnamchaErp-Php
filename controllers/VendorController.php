<?php
/**
 * VendorController
 * Supplier Management, Stock Receipts, Invoices & Purchases
 */
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../audit.php';
require_once __DIR__ . '/../auth.php';

class VendorController {
    public static function handle(string $action, array $payload, ?array $user): array {
        if (!$user || !Auth::checkPermission($user, 'vendors', 'read')) {
            return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
        }

        $db = Database::getConnection();

        switch ($action) {
            case 'listVendors':
                $status = $payload['status'] ?? 'active';
                $search = trim($payload['search'] ?? '');

                $sql = "SELECT * FROM vendors WHERE 1=1";
                $params = [];

                if ($status === 'active') {
                    $sql .= " AND IsDeleted = 0";
                } elseif ($status === 'deleted') {
                    $sql .= " AND IsDeleted = 1";
                }

                if (!empty($search)) {
                    $sql .= " AND (VendorName LIKE ? OR Mobile LIKE ? OR ContactPerson LIKE ?)";
                    $term = "%$search%";
                    $params[] = $term;
                    $params[] = $term;
                    $params[] = $term;
                }

                $sql .= " ORDER BY VendorID DESC";
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                return ['ok' => true, 'data' => $stmt->fetchAll()];

            case 'saveVendor':
                if (!Auth::checkPermission($user, 'vendors', 'create') && !Auth::checkPermission($user, 'vendors', 'update')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }

                $vendorId = !empty($payload['VendorID']) ? (int)$payload['VendorID'] : null;
                $name = trim($payload['VendorName'] ?? '');
                $mobile = trim($payload['Mobile'] ?? '');
                $gstin = trim($payload['GSTIN'] ?? '');
                $address = trim($payload['Address'] ?? '');
                $contact = trim($payload['ContactPerson'] ?? '');
                $items = trim($payload['ItemsSupplied'] ?? '');
                $now = date('Y-m-d H:i:s');

                if (empty($name)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Vendor name is required.']];
                }

                if ($vendorId) {
                    $upd = $db->prepare("UPDATE vendors SET 
                        VendorName = ?, Mobile = ?, Address = ?, GSTIN = ?, ContactPerson = ?, ItemsSupplied = ?,
                        Status = ?, Notes = ?, UpdatedBy = ?, UpdatedAt = ? WHERE VendorID = ?");
                    $upd->execute([
                        $name, $mobile, $address, $gstin, $contact, $items,
                        trim($payload['Status'] ?? 'ACTIVE'), trim($payload['Notes'] ?? ''),
                        $user['userId'], $now, $vendorId
                    ]);
                    Audit::log($user['userId'], $user['username'], 'UPDATE', 'vendors', (string)$vendorId, null, $payload, 'Vendor updated');
                    return ['ok' => true, 'data' => ['VendorID' => $vendorId], 'message' => 'Vendor profile updated.'];
                } else {
                    $seq = (int)$db->query("SELECT COUNT(*) FROM vendors")->fetchColumn() + 1;
                    $code = sprintf("VND-%s-%04d", date('Ymd'), $seq);

                    $ins = $db->prepare("INSERT INTO vendors (
                        VendorCode, VendorName, Mobile, Address, GSTIN, ContactPerson, ItemsSupplied,
                        OpeningBalance, Status, Notes, CreatedBy, CreatedAt, UpdatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)");
                    $ins->execute([
                        $code, $name, $mobile, $address, $gstin, $contact, $items,
                        (float)($payload['OpeningBalance'] ?? 0), trim($payload['Notes'] ?? ''),
                        $user['userId'], $now, $now
                    ]);
                    $newId = (int)$db->lastInsertId();
                    Audit::log($user['userId'], $user['username'], 'CREATE', 'vendors', (string)$newId, null, $payload, 'Vendor created');
                    return ['ok' => true, 'data' => ['VendorID' => $newId, 'VendorCode' => $code], 'message' => 'Vendor added successfully.'];
                }

            case 'deleteVendor':
                if (!Auth::checkPermission($user, 'vendors', 'delete')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }
                $delId = (int)($payload['VendorID'] ?? 0);
                $now = date('Y-m-d H:i:s');
                $stmt = $db->prepare("UPDATE vendors SET IsDeleted = 1, DeletedBy = ?, DeletedAt = ? WHERE VendorID = ?");
                $stmt->execute([$user['userId'], $now, $delId]);
                Audit::log($user['userId'], $user['username'], 'SOFT_DELETE', 'vendors', (string)$delId, null, null, 'Vendor soft deleted');
                return ['ok' => true, 'data' => null, 'message' => 'Vendor deleted.'];

            case 'restoreVendor':
                if ($user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin authorization required.']];
                }
                $resId = (int)($payload['VendorID'] ?? 0);
                $stmt = $db->prepare("UPDATE vendors SET IsDeleted = 0, DeletedBy = NULL, DeletedAt = NULL WHERE VendorID = ?");
                $stmt->execute([$resId]);
                Audit::log($user['userId'], $user['username'], 'RESTORE', 'vendors', (string)$resId, null, null, 'Vendor restored');
                return ['ok' => true, 'data' => null, 'message' => 'Vendor restored.'];

            case 'listPurchases':
                $stmt = $db->query("SELECT p.*, v.VendorName FROM purchases p JOIN vendors v ON p.VendorID = v.VendorID ORDER BY p.PurchaseID DESC LIMIT 100");
                return ['ok' => true, 'data' => $stmt->fetchAll()];

            case 'savePurchase':
                if (!Auth::checkPermission($user, 'purchases', 'create')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }

                $vendorId = (int)($payload['VendorID'] ?? 0);
                $invNo = trim($payload['InvoiceNumber'] ?? '');
                $pDate = $payload['PurchaseDate'] ?? date('Y-m-d');
                $total = (float)($payload['TotalAmount'] ?? 0);
                $paid = (float)($payload['PaidAmount'] ?? 0);
                $items = $payload['items'] ?? [];

                if ($vendorId <= 0 || empty($invNo) || $total <= 0) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Vendor, invoice number and positive total amount required.']];
                }

                $now = date('Y-m-d H:i:s');
                $db->beginTransaction();
                try {
                    $insP = $db->prepare("INSERT INTO purchases (InvoiceNumber, VendorID, PurchaseDate, TotalAmount, TotalPaise, PaidAmount, Status, Remarks, CreatedBy, CreatedAt)
                        VALUES (?, ?, ?, ?, ?, ?, 'RECEIVED', ?, ?, ?)");
                    $insP->execute([$invNo, $vendorId, $pDate, $total, (int)round($total * 100), $paid, trim($payload['Remarks'] ?? ''), $user['userId'], $now]);
                    $pId = (int)$db->lastInsertId();

                    if (!empty($items) && is_array($items)) {
                        $insIt = $db->prepare("INSERT INTO purchase_items (PurchaseID, ItemID, Quantity, Rate, Total) VALUES (?, ?, ?, ?, ?)");
                        foreach ($items as $it) {
                            $insIt->execute([$pId, (int)($it['ItemID'] ?? 0), (int)($it['Quantity'] ?? 1), (float)($it['Rate'] ?? 0), (float)($it['Total'] ?? 0)]);
                        }
                    }

                    // Process automatic Godown Inward & 1:1 Empty Return if Plant Cylinder Purchase
                    $isPlantPurchase = !empty($payload['IsPlantCylinderPurchase']);
                    $truckResult = null;
                    if ($isPlantPurchase && !empty($payload['CylinderItems']) && is_array($payload['CylinderItems'])) {
                        require_once __DIR__ . '/StockController.php';
                        $godownDate = trim($payload['GodownDate'] ?? $pDate);
                        $truckPayload = [
                            'InvoiceDate' => $pDate,
                            'GodownDate' => $godownDate,
                            'ChallanNumber' => $invNo,
                            'TruckNumber' => trim($payload['TruckNumber'] ?? ''),
                            'DriverName' => trim($payload['DriverName'] ?? ''),
                            'Remarks' => "Auto Inward from Purchase Invoice: $invNo",
                            'Items' => $payload['CylinderItems']
                        ];
                        $truckResult = StockController::processPlantTruckReceipt($db, $truckPayload, $user);
                    }

                    $db->commit();
                    Audit::log($user['userId'], $user['username'], 'PURCHASE_RECEIPT', 'purchases', (string)$pId, null, $payload, "Purchase invoice $invNo registered");
                    $msg = 'Purchase registered successfully.';
                    if ($truckResult) {
                        $msg .= " Godown cylinder stock inward & 1:1 empty return updated for {$truckPayload['GodownDate']} (Truck Receipt: {$truckResult['ReceiptNumber']}).";
                    }
                    return ['ok' => true, 'data' => ['PurchaseID' => $pId, 'TruckReceipt' => $truckResult], 'message' => $msg];
                } catch (Exception $e) {
                    $db->rollBack();
                    return ['ok' => false, 'error' => ['code' => 'SERVER', 'message' => 'Failed to save purchase: ' . $e->getMessage()]];
                }

            default:
                return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Invalid vendor action.']];
        }
    }
}
