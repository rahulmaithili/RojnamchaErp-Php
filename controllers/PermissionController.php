<?php
/**
 * PermissionController
 * Manages Role Based Access Control (RBAC) Matrix
 */
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../audit.php';
require_once __DIR__ . '/../auth.php';

class PermissionController {
    public static function handle(string $action, array $payload, ?array $user): array {
        $db = Database::getConnection();

        switch ($action) {
            case 'getPermissions':
                $roles = $db->query("SELECT RoleName, Description, IsSystem, Status FROM roles ORDER BY RoleID ASC")->fetchAll();
                $perms = $db->query("SELECT * FROM permissions ORDER BY RoleName, ModuleName")->fetchAll();

                // Group by role
                $matrix = [];
                foreach ($perms as $p) {
                    $matrix[$p['RoleName']][$p['ModuleName']] = [
                        'create' => (int)$p['CanCreate'],
                        'read' => (int)$p['CanRead'],
                        'update' => (int)$p['CanUpdate'],
                        'delete' => (int)$p['CanDelete'],
                        'export' => (int)$p['CanExport'],
                        'print' => (int)$p['CanPrint'],
                        'approve' => (int)$p['CanApprove']
                    ];
                }

                return [
                    'ok' => true,
                    'data' => [
                        'roles' => $roles,
                        'matrix' => $matrix
                    ]
                ];

            case 'savePermissions':
                if (!$user || $user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin authorization required.']];
                }

                $role = trim($payload['RoleName'] ?? '');
                $matrix = $payload['Permissions'] ?? [];

                if (empty($role) || !is_array($matrix)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Role and permission list required.']];
                }

                // Prevent stripping admin of all permissions
                if ($role === 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'ADMIN role permissions cannot be restricted.']];
                }

                $db->beginTransaction();
                try {
                    $upd = $db->prepare("UPDATE permissions SET 
                        CanCreate = :c, CanRead = :r, CanUpdate = :u, CanDelete = :d, CanExport = :e, CanPrint = :p, CanApprove = :a
                        WHERE RoleName = :role AND ModuleName = :mod");

                    foreach ($matrix as $mod => $actions) {
                        $upd->execute([
                            ':c' => !empty($actions['create']) ? 1 : 0,
                            ':r' => !empty($actions['read']) ? 1 : 0,
                            ':u' => !empty($actions['update']) ? 1 : 0,
                            ':d' => !empty($actions['delete']) ? 1 : 0,
                            ':e' => !empty($actions['export']) ? 1 : 0,
                            ':p' => !empty($actions['print']) ? 1 : 0,
                            ':a' => !empty($actions['approve']) ? 1 : 0,
                            ':role' => $role,
                            ':mod' => $mod
                        ]);
                    }
                    $db->commit();
                    Audit::log($user['userId'], $user['username'], 'UPDATE', 'permissions', $role, null, $matrix, "Permissions updated for $role");

                    return ['ok' => true, 'data' => null, 'message' => "Permissions for $role updated successfully."];
                } catch (Exception $e) {
                    $db->rollBack();
                    return ['ok' => false, 'error' => ['code' => 'SERVER', 'message' => $e->getMessage()]];
                }

            default:
                return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Invalid permission action.']];
        }
    }
}
