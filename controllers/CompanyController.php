<?php
/**
 * CompanyController
 * Manages Company Profile and Logo Base64 Storage & Retrieval
 */
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../audit.php';
require_once __DIR__ . '/../auth.php';

class CompanyController {
    public static function handle(string $action, array $payload, ?array $user): array {
        $db = Database::getConnection();

        switch ($action) {
            case 'getCompany':
                $stmt = $db->query("SELECT * FROM companies LIMIT 1");
                $company = $stmt->fetch();
                if (!$company) {
                    return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Company profile not found.']];
                }
                return ['ok' => true, 'data' => $company];

            case 'saveCompany':
                if (!$user || $user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin authorization required.']];
                }

                $cId = (int)($payload['CompanyID'] ?? 1);
                $stmt = $db->prepare("SELECT * FROM companies WHERE CompanyID = ?");
                $stmt->execute([$cId]);
                $old = $stmt->fetch();

                $now = date('Y-m-d H:i:s');
                $update = $db->prepare("UPDATE companies SET
                    CompanyName = :CompanyName,
                    LegalName = :LegalName,
                    AgencyName = :AgencyName,
                    DistributorCode = :DistributorCode,
                    ECustCode = :ECustCode,
                    HPCLCode = :HPCLCode,
                    AddressLine1 = :AddressLine1,
                    AddressLine2 = :AddressLine2,
                    Village = :Village,
                    Block = :Block,
                    District = :District,
                    State = :State,
                    PIN = :PIN,
                    Phone = :Phone,
                    AlternatePhone = :AlternatePhone,
                    Email = :Email,
                    Website = :Website,
                    GSTIN = :GSTIN,
                    PAN = :PAN,
                    LicenseNumber = :LicenseNumber,
                    BankName = :BankName,
                    BankAccount = :BankAccount,
                    IFSC = :IFSC,
                    UPI = :UPI,
                    OwnerName = :OwnerName,
                    ManagerName = :ManagerName,
                    BusinessType = :BusinessType,
                    OpeningDate = :OpeningDate,
                    Status = :Status,
                    UpdatedAt = :UpdatedAt
                WHERE CompanyID = :CompanyID");

                $update->execute([
                    ':CompanyName' => trim($payload['CompanyName'] ?? 'Shiv Shakti HP Gas'),
                    ':LegalName' => trim($payload['LegalName'] ?? ''),
                    ':AgencyName' => trim($payload['AgencyName'] ?? ''),
                    ':DistributorCode' => trim($payload['DistributorCode'] ?? ''),
                    ':ECustCode' => trim($payload['ECustCode'] ?? ''),
                    ':HPCLCode' => trim($payload['HPCLCode'] ?? ''),
                    ':AddressLine1' => trim($payload['AddressLine1'] ?? ''),
                    ':AddressLine2' => trim($payload['AddressLine2'] ?? ''),
                    ':Village' => trim($payload['Village'] ?? ''),
                    ':Block' => trim($payload['Block'] ?? ''),
                    ':District' => trim($payload['District'] ?? ''),
                    ':State' => trim($payload['State'] ?? ''),
                    ':PIN' => trim($payload['PIN'] ?? ''),
                    ':Phone' => trim($payload['Phone'] ?? ''),
                    ':AlternatePhone' => trim($payload['AlternatePhone'] ?? ''),
                    ':Email' => trim($payload['Email'] ?? ''),
                    ':Website' => trim($payload['Website'] ?? ''),
                    ':GSTIN' => trim($payload['GSTIN'] ?? ''),
                    ':PAN' => trim($payload['PAN'] ?? ''),
                    ':LicenseNumber' => trim($payload['LicenseNumber'] ?? ''),
                    ':BankName' => trim($payload['BankName'] ?? ''),
                    ':BankAccount' => trim($payload['BankAccount'] ?? ''),
                    ':IFSC' => trim($payload['IFSC'] ?? ''),
                    ':UPI' => trim($payload['UPI'] ?? ''),
                    ':OwnerName' => trim($payload['OwnerName'] ?? ''),
                    ':ManagerName' => trim($payload['ManagerName'] ?? ''),
                    ':BusinessType' => trim($payload['BusinessType'] ?? ''),
                    ':OpeningDate' => trim($payload['OpeningDate'] ?? ''),
                    ':Status' => trim($payload['Status'] ?? 'ACTIVE'),
                    ':UpdatedAt' => $now,
                    ':CompanyID' => $cId
                ]);

                Audit::log($user['userId'], $user['username'], 'UPDATE', 'company', (string)$cId, $old, $payload, 'Company details updated');

                $stmt = $db->prepare("SELECT * FROM companies WHERE CompanyID = ?");
                $stmt->execute([$cId]);
                $fresh = $stmt->fetch();

                return ['ok' => true, 'data' => $fresh, 'message' => 'Company profile updated successfully.'];

            case 'uploadCompanyLogo':
                if (!$user || $user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin authorization required.']];
                }

                $base64Data = $payload['logoBase64'] ?? '';
                $mimeType = $payload['mimeType'] ?? 'image/png';
                $cId = (int)($payload['CompanyID'] ?? 1);

                if (empty($base64Data)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'No logo data provided.']];
                }

                $allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
                if (!in_array(strtolower($mimeType), $allowed)) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Invalid image format. PNG, JPEG, WEBP and SVG supported.']];
                }

                // Check size (approx base64 length limit 3MB)
                if (strlen($base64Data) > 4000000) {
                    return ['ok' => false, 'error' => ['code' => 'VALIDATION', 'message' => 'Logo size exceeds 3MB limit.']];
                }

                $now = date('Y-m-d H:i:s');
                $stmt = $db->prepare("UPDATE companies SET LogoBase64 = ?, LogoMimeType = ?, LogoUpdatedAt = ?, UpdatedAt = ? WHERE CompanyID = ?");
                $stmt->execute([$base64Data, $mimeType, $now, $now, $cId]);

                Audit::log($user['userId'], $user['username'], 'LOGO_UPLOAD', 'company', (string)$cId, null, null, 'Company logo uploaded and updated');

                return ['ok' => true, 'data' => ['logoBase64' => $base64Data, 'mimeType' => $mimeType], 'message' => 'Company logo uploaded successfully.'];

            case 'removeCompanyLogo':
                if (!$user || $user['role'] !== 'ADMIN') {
                    return ['ok' => false, 'error' => ['code' => 'FORBIDDEN', 'message' => 'Admin authorization required.']];
                }

                $cId = (int)($payload['CompanyID'] ?? 1);
                $now = date('Y-m-d H:i:s');
                $stmt = $db->prepare("UPDATE companies SET LogoBase64 = NULL, LogoMimeType = NULL, LogoUpdatedAt = ?, UpdatedAt = ? WHERE CompanyID = ?");
                $stmt->execute([$now, $now, $cId]);

                Audit::log($user['userId'], $user['username'], 'LOGO_REMOVE', 'company', (string)$cId, null, null, 'Company logo removed');

                return ['ok' => true, 'data' => null, 'message' => 'Company logo removed successfully.'];

            default:
                return ['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Invalid company action.']];
        }
    }
}
