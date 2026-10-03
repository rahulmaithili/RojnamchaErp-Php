<?php
/**
 * AuditController
 * Audit Trail Logs Viewer with Multi-Attribute Filtering
 */
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth.php';

class AuditController {
    public static function handle(string $action, array $payload, ?array $user): array {
        if (!$user || !Auth::checkPermission($user, 'audit', 'read')) {
            return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
        }

        $db = Database::getConnection();

        switch ($action) {
            case 'listAudit':
                $module = $payload['module'] ?? 'all';
                $search = trim($payload['search'] ?? '');
                $startDate = $payload['startDate'] ?? null;
                $endDate = $payload['endDate'] ?? null;

                $sql = "SELECT * FROM audit_logs WHERE 1=1";
                $params = [];

                if ($module !== 'all') {
                    $sql .= " AND Module = ?";
                    $params[] = strtolower($module);
                }

                if (!empty($startDate) && !empty($endDate)) {
                    $sql .= " AND SUBSTR(Timestamp, 1, 10) BETWEEN ? AND ?";
                    $params[] = $startDate;
                    $params[] = $endDate;
                }

                if (!empty($search)) {
                    $sql .= " AND (Username LIKE ? OR Action LIKE ? OR Reason LIKE ? OR RecordID LIKE ?)";
                    $term = "%$search%";
                    $params[] = $term;
                    $params[] = $term;
                    $params[] = $term;
                    $params[] = $term;
                }

                $sql .= " ORDER BY AuditID DESC LIMIT 150";
                $stmt = $db->prepare($sql);
                $stmt->execute($params);

                return ['ok' => true, 'data' => $stmt->fetchAll()];

            default:
                return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Invalid audit action.']];
        }
    }
}
