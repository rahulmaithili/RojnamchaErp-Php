<?php
/**
 * UserController
 * Administrative User Management, Passwords & Role Control
 */
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../audit.php';
require_once __DIR__ . '/../auth.php';

class UserController {
    public static function handle(string $action, array $payload, ?array $user): array {
        if (!$user || !Auth::checkPermission($user, 'users', 'read')) {
            return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
        }

        $db = Database::getConnection();

        switch ($action) {
            case 'listUsers':
                $status = $payload['status'] ?? 'active';
                $search = trim($payload['search'] ?? '');

                $sql = "SELECT UserID, Username, FullName, Email, Mobile, Role, Status, ForcePasswordChange, LastLoginAt, IsDeleted, CreatedAt 
                        FROM users WHERE 1=1";
                $params = [];

                if ($status === 'active') {
                    $sql .= " AND IsDeleted = 0";
                } elseif ($status === 'deleted') {
                    $sql .= " AND IsDeleted = 1";
                }

                if (!empty($search)) {
                    $sql .= " AND (Username LIKE ? OR FullName LIKE ? OR Mobile LIKE ?)";
                    $term = "%$search%";
                    $params[] = $term;
                    $params[] = $term;
                    $params[] = $term;
                }

                $sql .= " ORDER BY UserID DESC";
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $users = $stmt->fetchAll();

                return ['ok' => true, 'data' => $users];

            case 'saveUser':
                if (!Auth::checkPermission($user, 'users', 'update') && !Auth::checkPermission($user, 'users', 'create')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin permission required to save user.']];
                }

                $userId = !empty($payload['UserID']) ? (int)$payload['UserID'] : null;
                $username = trim($payload['Username'] ?? '');
                $fullName = trim($payload['FullName'] ?? '');
                $email = trim($payload['Email'] ?? '');
                $mobile = trim($payload['Mobile'] ?? '');
                $role = trim($payload['Role'] ?? 'VIEWER');
                $status = trim($payload['Status'] ?? 'ACTIVE');
                $now = date('Y-m-d H:i:s');

                if (empty($username) || empty($fullName)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Username and Full Name are required.']];
                }

                if ($userId) {
                    // Update
                    $stmt = $db->prepare("SELECT * FROM users WHERE UserID = ?");
                    $stmt->execute([$userId]);
                    $old = $stmt->fetch();
                    if (!$old) {
                        return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'User not found.']];
                    }

                    // Check username unique
                    $chk = $db->prepare("SELECT COUNT(*) FROM users WHERE Username = ? AND UserID != ?");
                    $chk->execute([$username, $userId]);
                    if ((int)$chk->fetchColumn() > 0) {
                        return ['ok' => false, 'error' => ['code' => 'CONFLICT', 'message' => 'Username already in use.']];
                    }

                    $upd = $db->prepare("UPDATE users SET Username = ?, FullName = ?, Email = ?, Mobile = ?, Role = ?, Status = ?, UpdatedBy = ?, UpdatedAt = ? WHERE UserID = ?");
                    $upd->execute([$username, $fullName, $email, $mobile, $role, $status, $user['userId'], $now, $userId]);

                    // If password is also provided
                    if (!empty($payload['Password'])) {
                        $salt = bin2hex(random_bytes(16));
                        $hash = hash('sha256', $payload['Password'] . $salt);
                        $pwUpd = $db->prepare("UPDATE users SET PasswordHash = ?, Salt = ?, ForcePasswordChange = ? WHERE UserID = ?");
                        $pwUpd->execute([$hash, $salt, !empty($payload['ForcePasswordChange']) ? 1 : 0, $userId]);
                    }

                    Audit::log($user['userId'], $user['username'], 'UPDATE', 'users', (string)$userId, $old, $payload, 'User updated');
                    return ['ok' => true, 'data' => ['UserID' => $userId], 'message' => 'User updated successfully.'];
                } else {
                    // Create
                    $chk = $db->prepare("SELECT COUNT(*) FROM users WHERE Username = ?");
                    $chk->execute([$username]);
                    if ((int)$chk->fetchColumn() > 0) {
                        return ['ok' => false, 'error' => ['code' => 'CONFLICT', 'message' => 'Username already exists.']];
                    }

                    $password = !empty($payload['Password']) ? $payload['Password'] : 'User@12345';
                    $salt = bin2hex(random_bytes(16));
                    $hash = hash('sha256', $password . $salt);

                    $ins = $db->prepare("INSERT INTO users (Username, PasswordHash, Salt, FullName, Email, Mobile, Role, Status, ForcePasswordChange, CreatedBy, CreatedAt, UpdatedAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)");
                    $ins->execute([$username, $hash, $salt, $fullName, $email, $mobile, $role, $status, $user['userId'], $now, $now]);
                    $newId = (int)$db->lastInsertId();

                    Audit::log($user['userId'], $user['username'], 'CREATE', 'users', (string)$newId, null, $payload, 'User created');
                    return ['ok' => true, 'data' => ['UserID' => $newId], 'message' => 'User created successfully with default password.'];
                }

            case 'deleteUser':
                if (!Auth::checkPermission($user, 'users', 'delete')) {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Permission denied.']];
                }
                $delId = (int)($payload['UserID'] ?? 0);
                if ($delId === $user['userId']) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'You cannot delete your own account.']];
                }

                $now = date('Y-m-d H:i:s');
                $stmt = $db->prepare("UPDATE users SET IsDeleted = 1, DeletedBy = ?, DeletedAt = ? WHERE UserID = ?");
                $stmt->execute([$user['userId'], $now, $delId]);

                Audit::log($user['userId'], $user['username'], 'SOFT_DELETE', 'users', (string)$delId, null, null, 'User soft deleted');
                return ['ok' => true, 'data' => null, 'message' => 'User moved to trash.'];

            case 'restoreUser':
                if ($user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Only Admin can restore users.']];
                }
                $resId = (int)($payload['UserID'] ?? 0);
                $stmt = $db->prepare("UPDATE users SET IsDeleted = 0, DeletedBy = NULL, DeletedAt = NULL WHERE UserID = ?");
                $stmt->execute([$resId]);

                Audit::log($user['userId'], $user['username'], 'RESTORE', 'users', (string)$resId, null, null, 'User restored');
                return ['ok' => true, 'data' => null, 'message' => 'User restored successfully.'];

            case 'resetPassword':
                if ($user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Only Admin can reset user passwords.']];
                }
                $targetId = (int)($payload['UserID'] ?? 0);
                $newPassword = $payload['NewPassword'] ?? 'Reset@12345';
                $salt = bin2hex(random_bytes(16));
                $hash = hash('sha256', $newPassword . $salt);
                $now = date('Y-m-d H:i:s');

                $stmt = $db->prepare("UPDATE users SET PasswordHash = ?, Salt = ?, ForcePasswordChange = 1, FailedAttempts = 0, LockUntil = NULL, UpdatedAt = ? WHERE UserID = ?");
                $stmt->execute([$hash, $salt, $now, $targetId]);

                Audit::log($user['userId'], $user['username'], 'PASSWORD_RESET', 'users', (string)$targetId, null, null, 'Admin reset user password');
                return ['ok' => true, 'data' => null, 'message' => "Password reset to '$newPassword'. User must change password on login."];

            case 'changeRole':
                if ($user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Only Admin can modify roles.']];
                }
                $targetId = (int)($payload['UserID'] ?? 0);
                $newRole = trim($payload['Role'] ?? 'VIEWER');
                $now = date('Y-m-d H:i:s');

                $stmt = $db->prepare("UPDATE users SET Role = ?, UpdatedBy = ?, UpdatedAt = ? WHERE UserID = ?");
                $stmt->execute([$newRole, $user['userId'], $now, $targetId]);

                Audit::log($user['userId'], $user['username'], 'ROLE_CHANGE', 'users', (string)$targetId, null, ['Role' => $newRole], 'Admin modified user role');
                return ['ok' => true, 'data' => null, 'message' => "User role updated to $newRole."];

            case 'approveUserReset':
                if ($user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Only Admin can approve password resets.']];
                }
                $targetId = (int)($payload['UserID'] ?? 0);
                $now = date('Y-m-d H:i:s');
                $stmt = $db->prepare("UPDATE users SET Status = 'ACTIVE', FailedAttempts = 0, LockUntil = NULL, ForcePasswordChange = 0, UpdatedAt = ? WHERE UserID = ?");
                $stmt->execute([$now, $targetId]);

                // Mark any auth notifications for this user as read
                try {
                    $uStmt = $db->prepare("SELECT Username FROM users WHERE UserID = ?");
                    $uStmt->execute([$targetId]);
                    $tName = $uStmt->fetchColumn();
                    if ($tName) {
                        $updNotif = $db->prepare("UPDATE notifications SET IsRead = 1 WHERE Title LIKE ?");
                        $updNotif->execute(["%$tName%"]);
                    }
                } catch (Throwable $e) {}

                Audit::log($user['userId'], $user['username'], 'APPROVE_RESET', 'users', (string)$targetId, null, null, 'Admin approved password reset & activated login');
                return ['ok' => true, 'data' => null, 'message' => 'User account approved and activated successfully!'];

            case 'rejectUserReset':
                if ($user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Only Admin can reject password resets.']];
                }
                $targetId = (int)($payload['UserID'] ?? 0);
                $now = date('Y-m-d H:i:s');
                $stmt = $db->prepare("UPDATE users SET Status = 'DISABLED', UpdatedAt = ? WHERE UserID = ?");
                $stmt->execute([$now, $targetId]);

                Audit::log($user['userId'], $user['username'], 'REJECT_RESET', 'users', (string)$targetId, null, null, 'Admin rejected password reset request');
                return ['ok' => true, 'data' => null, 'message' => 'Password reset request rejected and account disabled.'];

            default:
                return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Invalid user action.']];
        }
    }
}
