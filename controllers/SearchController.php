<?php
/**
 * SearchController
 * Global Debounced Search Across Bills, Customers, Employees, Items, Dues & Vendors
 */
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth.php';

class SearchController {
    public static function handle(string $action, array $payload, ?array $user): array {
        if (!$user) {
            return ['ok' => false, 'error' => ['code' => 'AUTH', 'message' => 'Unauthorized.']];
        }

        $db = Database::getConnection();
        $query = trim($payload['query'] ?? '');

        if (strlen($query) < 2) {
            return ['ok' => true, 'data' => []];
        }

        $term = "%$query%";
        $results = [];

        // 1. Bills
        $bStmt = $db->prepare("SELECT BillID, BillNumber, CustomerName, TotalAmount, BillDate 
            FROM bills WHERE (BillNumber LIKE ? OR CustomerName LIKE ? OR CustomerMobile LIKE ?) AND IsDeleted = 0 LIMIT 5");
        $bStmt->execute([$term, $term, $term]);
        while ($r = $bStmt->fetch()) {
            $results[] = [
                'category' => 'Bills',
                'id' => $r['BillID'],
                'title' => $r['BillNumber'],
                'subtitle' => "{$r['CustomerName']} • ₹" . number_format($r['TotalAmount'], 2),
                'date' => $r['BillDate'],
                'module' => 'billing'
            ];
        }

        // 2. Customers
        $cStmt = $db->prepare("SELECT CustomerID, Name, Mobile, ConsumerNo, Area 
            FROM customers WHERE (Name LIKE ? OR Mobile LIKE ? OR ConsumerNo LIKE ?) AND IsDeleted = 0 LIMIT 5");
        $cStmt->execute([$term, $term, $term]);
        while ($r = $cStmt->fetch()) {
            $results[] = [
                'category' => 'Customers',
                'id' => $r['CustomerID'],
                'title' => $r['Name'],
                'subtitle' => "Mob: {$r['Mobile']} • Area: {$r['Area']}",
                'date' => $r['ConsumerNo'],
                'module' => 'customers'
            ];
        }

        // 3. Employees
        $eStmt = $db->prepare("SELECT EmpID, Name, Mobile, Role 
            FROM employees WHERE (Name LIKE ? OR Mobile LIKE ? OR Role LIKE ?) AND IsDeleted = 0 LIMIT 5");
        $eStmt->execute([$term, $term, $term]);
        while ($r = $eStmt->fetch()) {
            $results[] = [
                'category' => 'Employees',
                'id' => $r['EmpID'],
                'title' => $r['Name'],
                'subtitle' => "Role: {$r['Role']} • {$r['Mobile']}",
                'date' => '',
                'module' => 'employees'
            ];
        }

        // 4. Items & Rates
        $iStmt = $db->prepare("SELECT ItemID, ItemName, ItemCode, Rate, Category 
            FROM item_rates WHERE (ItemName LIKE ? OR ItemCode LIKE ?) AND IsDeleted = 0 LIMIT 5");
        $iStmt->execute([$term, $term]);
        while ($r = $iStmt->fetch()) {
            $results[] = [
                'category' => 'Products',
                'id' => $r['ItemID'],
                'title' => $r['ItemName'],
                'subtitle' => "Code: {$r['ItemCode']} • Rate: ₹" . number_format($r['Rate'], 2),
                'date' => $r['Category'],
                'module' => 'items'
            ];
        }

        return ['ok' => true, 'data' => $results];
    }
}
