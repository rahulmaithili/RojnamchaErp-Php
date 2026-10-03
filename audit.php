<?php
/**
 * SHIV SHAKTI HP GAS - AUDIT LOGGING ENGINE
 * Records every sensitive create, update, delete, status change and administrative override
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

class Audit {
    public static function log(
        ?int $userId,
        ?string $username,
        string $action,
        string $module,
        ?string $recordId = null,
        $oldValue = null,
        $newValue = null,
        ?string $reason = null
    ): void {
        try {
            $db = Database::getConnection();
            $now = date('Y-m-d H:i:s');
            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
            $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'CLI/System';

            $oldStr = is_array($oldValue) || is_object($oldValue) ? json_encode($oldValue, JSON_UNESCAPED_UNICODE) : (string)$oldValue;
            $newStr = is_array($newValue) || is_object($newValue) ? json_encode($newValue, JSON_UNESCAPED_UNICODE) : (string)$newValue;

            $stmt = $db->prepare("INSERT INTO audit_logs (
                Timestamp, UserID, Username, Action, Module, RecordID, OldValue, NewValue, IPAddress, UserAgent, Reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

            $stmt->execute([
                $now,
                $userId,
                $username ?? 'system',
                strtoupper($action),
                strtolower($module),
                $recordId,
                $oldStr,
                $newStr,
                $ip,
                $ua,
                $reason
            ]);
        } catch (Exception $e) {
            // Silently log or ignore audit failure to prevent breaking primary transactions
            error_log('Audit Log Failure: ' . $e->getMessage());
        }
    }
}
