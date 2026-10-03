<?php
/**
 * ItemController
 * Items & Rates Master, Product Catalog & Historical Rate Audit
 */
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../audit.php';
require_once __DIR__ . '/../auth.php';

class ItemController {
    public static function handle(string $action, array $payload, ?array $user): array {
        if (!$user || !Auth::checkPermission($user, 'items', 'read')) {
            return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
        }

        $db = Database::getConnection();

        switch ($action) {
            case 'listItems':
                $category = $payload['category'] ?? 'all';
                $status = $payload['status'] ?? 'active';
                $search = trim($payload['search'] ?? '');

                $sql = "SELECT * FROM item_rates WHERE 1=1";
                $params = [];

                if ($status === 'active') {
                    $sql .= " AND IsDeleted = 0";
                } elseif ($status === 'deleted') {
                    $sql .= " AND IsDeleted = 1";
                }

                if ($category !== 'all') {
                    $sql .= " AND Category = ?";
                    $params[] = $category;
                }

                if (!empty($search)) {
                    $sql .= " AND (ItemCode LIKE ? OR ItemName LIKE ? OR Description LIKE ?)";
                    $term = "%$search%";
                    $params[] = $term;
                    $params[] = $term;
                    $params[] = $term;
                }

                $sql .= " ORDER BY ItemID ASC";
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                return ['ok' => true, 'data' => $stmt->fetchAll()];

            case 'saveItem':
                if (!Auth::checkPermission($user, 'items', 'create') && !Auth::checkPermission($user, 'items', 'update')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }

                $itemId = !empty($payload['ItemID']) ? (int)$payload['ItemID'] : null;
                $code = trim($payload['ItemCode'] ?? '');
                $name = trim($payload['ItemName'] ?? '');
                $cat = trim($payload['Category'] ?? 'SALE');
                $cylType = !empty($payload['CylinderType']) ? trim($payload['CylinderType']) : null;
                $rate = (float)($payload['Rate'] ?? 0);
                $ratePaise = (int)round($rate * 100);
                $taxPct = (float)($payload['TaxPercent'] ?? 0);
                $desc = trim($payload['Description'] ?? '');
                $isPkg = !empty($payload['IsPackageItem']) ? 1 : 0;
                $status = trim($payload['Status'] ?? 'ACTIVE');
                $now = date('Y-m-d H:i:s');

                if (empty($code) || empty($name)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Item Code and Item Name are required.']];
                }

                if ($itemId) {
                    $stmt = $db->prepare("SELECT * FROM item_rates WHERE ItemID = ?");
                    $stmt->execute([$itemId]);
                    $old = $stmt->fetch();
                    if (!$old) {
                        return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Item not found.']];
                    }

                    // Check if rate changed, log in rate_history
                    if ((float)$old['Rate'] !== $rate) {
                        $reason = trim($payload['RateChangeReason'] ?? 'Admin rate revision');
                        $hist = $db->prepare("INSERT INTO rate_history (
                            ItemID, ItemCode, OldRate, NewRate, OldRatePaise, NewRatePaise, Reason, ChangedBy, ChangedByName, ChangedAt
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                        $hist->execute([
                            $itemId, $code, (float)$old['Rate'], $rate, (int)$old['RatePaise'], $ratePaise,
                            $reason, $user['userId'], $user['fullName'], $now
                        ]);
                    }

                    $upd = $db->prepare("UPDATE item_rates SET 
                        ItemCode = ?, ItemName = ?, Category = ?, CylinderType = ?, Rate = ?, RatePaise = ?,
                        TaxPercent = ?, Description = ?, IsPackageItem = ?, Status = ?, UpdatedBy = ?, UpdatedAt = ?
                        WHERE ItemID = ?");
                    $upd->execute([
                        $code, $name, $cat, $cylType, $rate, $ratePaise,
                        $taxPct, $desc, $isPkg, $status, $user['userId'], $now, $itemId
                    ]);

                    Audit::log($user['userId'], $user['username'], 'UPDATE', 'items', (string)$itemId, $old, $payload, 'Item rate updated');
                    return ['ok' => true, 'data' => ['ItemID' => $itemId], 'message' => 'Item updated successfully.'];
                } else {
                    $chk = $db->prepare("SELECT ItemID FROM item_rates WHERE ItemCode = ? AND IsDeleted = 0");
                    $chk->execute([$code]);
                    if ($chk->fetch()) {
                        return ['ok' => false, 'error' => ['code' => 'CONFLICT', 'message' => 'Item code already exists.']];
                    }

                    $ins = $db->prepare("INSERT INTO item_rates (
                        ItemCode, ItemName, Category, CylinderType, Rate, RatePaise, TaxPercent,
                        Description, IsPackageItem, Status, CreatedBy, CreatedAt, UpdatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)");
                    $ins->execute([
                        $code, $name, $cat, $cylType, $rate, $ratePaise, $taxPct,
                        $desc, $isPkg, $user['userId'], $now, $now
                    ]);
                    $newId = (int)$db->lastInsertId();

                    Audit::log($user['userId'], $user['username'], 'CREATE', 'items', (string)$newId, null, $payload, 'Item created');
                    return ['ok' => true, 'data' => ['ItemID' => $newId], 'message' => 'Item created successfully.'];
                }

            case 'deleteItem':
                if (!Auth::checkPermission($user, 'items', 'delete')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }
                $delId = (int)($payload['ItemID'] ?? 0);
                $now = date('Y-m-d H:i:s');
                $stmt = $db->prepare("UPDATE item_rates SET IsDeleted = 1, DeletedBy = ?, DeletedAt = ? WHERE ItemID = ?");
                $stmt->execute([$user['userId'], $now, $delId]);
                Audit::log($user['userId'], $user['username'], 'SOFT_DELETE', 'items', (string)$delId, null, null, 'Item soft deleted');
                return ['ok' => true, 'data' => null, 'message' => 'Item removed.'];

            case 'restoreItem':
                if ($user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin authorization required.']];
                }
                $resId = (int)($payload['ItemID'] ?? 0);
                $stmt = $db->prepare("UPDATE item_rates SET IsDeleted = 0, DeletedBy = NULL, DeletedAt = NULL WHERE ItemID = ?");
                $stmt->execute([$resId]);
                Audit::log($user['userId'], $user['username'], 'RESTORE', 'items', (string)$resId, null, null, 'Item restored');
                return ['ok' => true, 'data' => null, 'message' => 'Item restored.'];

            case 'adminUpdateRates':
                if ($user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin authorization required to update rates.']];
                }

                $itemId = (int)($payload['ItemID'] ?? 0);
                $newRate = (float)($payload['NewRate'] ?? 0);
                $reason = trim($payload['Reason'] ?? '');

                if ($itemId <= 0 || $newRate < 0 || empty($reason)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Valid Item, non-negative rate and mandatory reason required.']];
                }

                $stmt = $db->prepare("SELECT * FROM item_rates WHERE ItemID = ?");
                $stmt->execute([$itemId]);
                $item = $stmt->fetch();
                if (!$item) {
                    return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Item not found.']];
                }

                $now = date('Y-m-d H:i:s');
                $newRatePaise = (int)round($newRate * 100);

                // Insert rate history
                $hist = $db->prepare("INSERT INTO rate_history (
                    ItemID, ItemCode, OldRate, NewRate, OldRatePaise, NewRatePaise, Reason, ChangedBy, ChangedByName, ChangedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $hist->execute([
                    $itemId, $item['ItemCode'], (float)$item['Rate'], $newRate, (int)$item['RatePaise'], $newRatePaise,
                    $reason, $user['userId'], $user['fullName'] ?? ($user['username'] ?? 'Admin'), $now
                ]);

                // Update item
                $upd = $db->prepare("UPDATE item_rates SET Rate = ?, RatePaise = ?, UpdatedBy = ?, UpdatedAt = ? WHERE ItemID = ?");
                $upd->execute([$newRate, $newRatePaise, $user['userId'], $now, $itemId]);

                Audit::log($user['userId'], $user['username'], 'RATE_CHANGE', 'items', (string)$itemId, ['oldRate' => $item['Rate']], ['newRate' => $newRate, 'reason' => $reason], "Rate updated for {$item['ItemName']}");

                return ['ok' => true, 'data' => null, 'message' => "Rate for {$item['ItemName']} updated to ₹" . number_format($newRate, 2)];

            case 'getRateHistory':
                $itemId = !empty($payload['ItemID']) ? (int)$payload['ItemID'] : null;
                $sql = "SELECT * FROM rate_history WHERE 1=1";
                $params = [];
                if ($itemId) {
                    $sql .= " AND ItemID = ?";
                    $params[] = $itemId;
                }
                $sql .= " ORDER BY HistoryID DESC LIMIT 100";
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                return ['ok' => true, 'data' => $stmt->fetchAll()];

            default:
                return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Invalid items action.']];
        }
    }
}
