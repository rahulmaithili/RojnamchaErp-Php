<?php
/**
 * AuthController
 */
require_once __DIR__ . '/../auth.php';

class AuthController {
    public static function handle(string $action, array $payload, ?array $user): array {
        $ip = $_SERVER['REMOTE_ADDR'] ?? null;
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? null;

        switch ($action) {
            case 'login':
                $username = $payload['username'] ?? '';
                $password = $payload['password'] ?? '';
                if (empty($username) || empty($password)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Username and password are required.']];
                }
                $res = Auth::login($username, $password, $ip, $ua);
                if (!$res['ok']) {
                    return ['ok' => false, 'error' => ['code' => $res['code'], 'message' => $res['message']]];
                }
                return ['ok' => true, 'data' => ['token' => $res['token'], 'user' => $res['user']], 'message' => 'Login successful.'];

            case 'logout':
                $token = $payload['token'] ?? ($user['token'] ?? '');
                Auth::logout($token, $user);
                return ['ok' => true, 'data' => null, 'message' => 'Logged out successfully.'];

            case 'changePassword':
                if (!$user) {
                    return ['ok' => false, 'error' => ['code' => 'AUTH', 'message' => 'Unauthorized.']];
                }
                $oldPass = $payload['oldPassword'] ?? '';
                $newPass = $payload['newPassword'] ?? '';
                $res = Auth::changePassword($user['userId'], $oldPass, $newPass);
                if (!$res['ok']) {
                    return ['ok' => false, 'error' => ['code' => $res['code'], 'message' => $res['message']]];
                }
                return ['ok' => true, 'data' => null, 'message' => $res['message']];

            case 'forgotPassword':
                $userParam = $payload['username'] ?? '';
                $codeParam = $payload['verificationCode'] ?? '';
                $newPassParam = $payload['newPassword'] ?? '';
                $res = Auth::resetForgottenPassword($userParam, $codeParam, $newPassParam);
                if (!$res['ok']) {
                    return ['ok' => false, 'error' => ['code' => $res['code'], 'message' => $res['message']]];
                }
                return ['ok' => true, 'data' => null, 'message' => $res['message']];

            case 'getMe':
                if (!$user) {
                    return ['ok' => false, 'error' => ['code' => 'AUTH', 'message' => 'Unauthorized.']];
                }
                return ['ok' => true, 'data' => $user];

            default:
                return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Invalid auth action.']];
        }
    }
}
