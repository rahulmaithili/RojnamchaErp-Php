<?php
/**
 * SHIV SHAKTI HP GAS - AUTHENTICATION & RBAC PERMISSION ENGINE
 * Enforces Salted SHA-256 Hashing, Account Lockouts, Session Tokens & Strict Authorization
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/audit.php';

class Auth {
    /**
     * Authenticate User with Password, Salt and Lockout Protection
     */
    public static function login(string $username, string $password, ?string $ip = null, ?string $userAgent = null): array {
        $db = Database::getConnection();
        $username = trim($username);

        $stmt = $db->prepare("SELECT * FROM users WHERE Username = ? AND IsDeleted = 0");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user) {
            return [
                'ok' => false,
                'code' => 'AUTH',
                'message' => 'Invalid username or password.'
            ];
        }

        // Check if account is deactivated
        if ($user['Status'] !== 'ACTIVE') {
            return [
                'ok' => false,
                'code' => 'FORBIDDEN',
                'message' => 'Account is inactive or disabled. Contact Administrator.'
            ];
        }

        $now = date('Y-m-d H:i:s');

        // Check Lockout
        if (!empty($user['LockUntil']) && $user['LockUntil'] > $now) {
            $lockUntilTime = strtotime($user['LockUntil']);
            $diffMins = max(1, ceil(($lockUntilTime - time()) / 60));
            return [
                'ok' => false,
                'code' => 'LOCKED',
                'message' => "Account is temporarily locked due to multiple failed attempts. Try again in $diffMins minutes."
            ];
        }

        // Verify Salted SHA-256 Password Hash
        $expectedHash = hash('sha256', $password . $user['Salt']);
        if (!hash_equals($user['PasswordHash'], $expectedHash)) {
            $failedAttempts = (int)$user['FailedAttempts'] + 1;
            $lockUntil = null;

            if ($failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
                $lockUntil = date('Y-m-d H:i:s', time() + (LOGIN_LOCKOUT_MINUTES * 60));
            }

            $update = $db->prepare("UPDATE users SET FailedAttempts = ?, LockUntil = ? WHERE UserID = ?");
            $update->execute([$failedAttempts, $lockUntil, $user['UserID']]);

            Audit::log($user['UserID'], $user['Username'], 'FAILED_LOGIN', 'users', (string)$user['UserID'], null, null, 'Invalid credentials attempt');

            $remaining = MAX_FAILED_LOGIN_ATTEMPTS - $failedAttempts;
            if ($remaining > 0) {
                return [
                    'ok' => false,
                    'code' => 'AUTH',
                    'message' => "Invalid credentials. $remaining attempt(s) remaining before account lockout."
                ];
            } else {
                return [
                    'ok' => false,
                    'code' => 'LOCKED',
                    'message' => "Account locked for " . LOGIN_LOCKOUT_MINUTES . " minutes due to repeated failed logins."
                ];
            }
        }

        // Login Succeeded: Reset attempts & generate secure session
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + (SESSION_LIFETIME_HOURS * 3600));

        $update = $db->prepare("UPDATE users SET FailedAttempts = 0, LockUntil = NULL, LastLoginAt = ? WHERE UserID = ?");
        $update->execute([$now, $user['UserID']]);

        // Insert Session
        $sessStmt = $db->prepare("INSERT INTO sessions (Token, UserID, ExpiresAt, IPAddress, UserAgent, CreatedAt) VALUES (?, ?, ?, ?, ?, ?)");
        $sessStmt->execute([$token, $user['UserID'], $expiresAt, $ip, $userAgent, $now]);

        Audit::log($user['UserID'], $user['Username'], 'LOGIN', 'auth', (string)$user['UserID'], null, null, 'User logged in successfully');

        return [
            'ok' => true,
            'token' => $token,
            'user' => [
                'userId' => (int)$user['UserID'],
                'username' => $user['Username'],
                'fullName' => $user['FullName'],
                'role' => $user['Role'],
                'email' => $user['Email'],
                'mobile' => $user['Mobile'],
                'forcePasswordChange' => (int)$user['ForcePasswordChange'] === 1
            ]
        ];
    }

    /**
     * Validate Session Token and return User
     */
    public static function validateToken(string $token): ?array {
        if (empty($token)) return null;

        $db = Database::getConnection();
        $now = date('Y-m-d H:i:s');

        $stmt = $db->prepare("SELECT s.*, u.Username, u.FullName, u.Role, u.Email, u.Mobile, u.Status, u.ForcePasswordChange 
            FROM sessions s 
            JOIN users u ON s.UserID = u.UserID 
            WHERE s.Token = ? AND s.ExpiresAt > ? AND u.IsDeleted = 0 AND u.Status = 'ACTIVE'");
        $stmt->execute([$token, $now]);
        $session = $stmt->fetch();

        if (!$session) return null;

        return [
            'userId' => (int)$session['UserID'],
            'username' => $session['Username'],
            'fullName' => $session['FullName'],
            'role' => $session['Role'],
            'email' => $session['Email'],
            'mobile' => $session['Mobile'],
            'forcePasswordChange' => (int)$session['ForcePasswordChange'] === 1,
            'token' => $token
        ];
    }

    /**
     * Logout & Destroy Session
     */
    public static function logout(string $token, ?array $currentUser = null): bool {
        $db = Database::getConnection();
        if ($currentUser) {
            Audit::log($currentUser['userId'], $currentUser['username'], 'LOGOUT', 'auth', (string)$currentUser['userId'], null, null, 'User logged out');
        }
        $stmt = $db->prepare("DELETE FROM sessions WHERE Token = ?");
        return $stmt->execute([$token]);
    }

    /**
     * Change Password
     */
    public static function changePassword(int $userId, string $oldPassword, string $newPassword): array {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM users WHERE UserID = ? AND IsDeleted = 0");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            return ['ok' => false, 'code' => 'NOT_FOUND', 'message' => 'User not found.'];
        }

        // Verify old password
        $oldHash = hash('sha256', $oldPassword . $user['Salt']);
        if (!hash_equals($user['PasswordHash'], $oldHash)) {
            return ['ok' => false, 'code' => 'VALIDATION', 'message' => 'Current password is incorrect.'];
        }

        if (strlen($newPassword) < 6) {
            return ['ok' => false, 'code' => 'VALIDATION', 'message' => 'New password must be at least 6 characters long.'];
        }

        $newSalt = bin2hex(random_bytes(16));
        $newHash = hash('sha256', $newPassword . $newSalt);
        $now = date('Y-m-d H:i:s');

        $upd = $db->prepare("UPDATE users SET PasswordHash = ?, Salt = ?, ForcePasswordChange = 0, UpdatedAt = ? WHERE UserID = ?");
        $upd->execute([$newHash, $newSalt, $now, $userId]);

        Audit::log($userId, $user['Username'], 'PASSWORD_CHANGE', 'users', (string)$userId, null, null, 'User changed own password');

        return ['ok' => true, 'message' => 'Password updated successfully.'];
    }

    /**
     * Check RBAC Permission
     */
    public static function checkPermission(array $user, string $module, string $action = 'read'): bool {
        if ($user['role'] === 'ADMIN') {
            return true;
        }

        $colMap = [
            'create' => 'CanCreate',
            'read'   => 'CanRead',
            'update' => 'CanUpdate',
            'delete' => 'CanDelete',
            'export' => 'CanExport',
            'print'  => 'CanPrint',
            'approve'=> 'CanApprove'
        ];

        $col = $colMap[strtolower($action)] ?? 'CanRead';

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT $col FROM permissions WHERE RoleName = ? AND ModuleName = ?");
        $stmt->execute([$user['role'], $module]);
        $val = $stmt->fetchColumn();

        return (int)$val === 1;
    }
}
