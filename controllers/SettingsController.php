<?php
/**
 * SettingsController
 * System Settings & Key-Value Configuration Store
 */
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../audit.php';
require_once __DIR__ . '/../auth.php';

class SettingsController {
    public static function handle(string $action, array $payload, ?array $user): array {
        $db = Database::getConnection();

        switch ($action) {
            case 'getSettings':
                $stmt = $db->query("SELECT * FROM settings ORDER BY Category, SettingKey");
                $rows = $stmt->fetchAll();
                $map = [];
                foreach ($rows as $r) {
                    $map[$r['SettingKey']] = $r['SettingValue'];
                }
                return ['ok' => true, 'data' => ['list' => $rows, 'map' => $map]];

            case 'saveSettings':
                if (!$user || $user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin authorization required to modify settings.']];
                }

                $settings = $payload['settings'] ?? [];
                if (!is_array($settings)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Settings dictionary required.']];
                }

                $now = date('Y-m-d H:i:s');
                $stmt = $db->prepare("INSERT INTO settings (SettingKey, SettingValue, UpdatedAt) VALUES (:k, :v, :u)
                    ON CONFLICT(SettingKey) DO UPDATE SET SettingValue = excluded.SettingValue, UpdatedAt = excluded.UpdatedAt");

                foreach ($settings as $k => $v) {
                    $stmt->execute([':k' => $k, ':v' => (string)$v, ':u' => $now]);
                }

                Audit::log($user['userId'], $user['username'], 'SETTINGS_UPDATE', 'settings', null, null, $settings, 'System settings updated');
                return ['ok' => true, 'data' => null, 'message' => 'Settings saved successfully.'];

            default:
                return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Invalid settings action.']];
        }
    }
}
