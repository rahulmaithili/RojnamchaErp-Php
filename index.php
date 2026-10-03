<?php
/**
 * SHIV SHAKTI HP GAS (PANDAUL) ERP - Main Application Entry Point
 * Handles auto-detection, subfolder extraction recovery, 1-click ZIP extract/upload, and environment routing.
 */

error_reporting(E_ALL & ~E_NOTICE);
ini_set('display_errors', '0');

$rootDir = __DIR__;
$dataFile = $rootDir . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'db_config.json';
$setupFile = $rootDir . DIRECTORY_SEPARATOR . 'setup.php';

// Handle ZIP Upload & Auto-Extract
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['zip_file'])) {
    if ($_FILES['zip_file']['error'] === UPLOAD_ERR_OK) {
        $tmp = $_FILES['zip_file']['tmp_name'];
        if (class_exists('ZipArchive')) {
            $zip = new ZipArchive();
            if ($zip->open($tmp) === TRUE) {
                $zip->extractTo($rootDir);
                $zip->close();
                header('Location: index.php');
                exit;
            } else {
                $uploadError = "Failed to open ZIP archive.";
            }
        } else {
            $uploadError = "PHP ZipArchive extension is not enabled on this host.";
        }
    } else {
        $uploadError = "Upload failed with error code: " . $_FILES['zip_file']['error'];
    }
}

// Handle Local ZIP Extract
if (isset($_GET['extract_zip'])) {
    $targetZip = $rootDir . DIRECTORY_SEPARATOR . basename($_GET['extract_zip']);
    if (file_exists($targetZip) && class_exists('ZipArchive')) {
        $zip = new ZipArchive();
        if ($zip->open($targetZip) === TRUE) {
            $zip->extractTo($rootDir);
            $zip->close();
            header('Location: index.php');
            exit;
        }
    }
}

// Diagnostic mode
if (isset($_GET['diag'])) {
    header('Content-Type: text/html; charset=utf-8');
    echo "<!DOCTYPE html><html><head><title>System Diagnostic</title><style>body{font-family:monospace;padding:20px;background:#0f172a;color:#38bdf8;line-height:1.6;}h2{color:#4ade80;}ul{list-style:none;padding-left:10px;}.ok{color:#4ade80;}.bad{color:#f87171;}</style></head><body>";
    echo "<h2>Shiv Shakti HP Gas ERP - Directory & Asset Audit</h2>";
    echo "<div>PHP Version: " . PHP_VERSION . "</div>";
    echo "<div>Root Dir: " . htmlspecialchars($rootDir) . "</div><br>";

    $required = [
        'index.html' => 'file',
        'api.php' => 'file',
        'auth.php' => 'file',
        'db.php' => 'file',
        'js' => 'dir',
        'js/app.js' => 'file',
        'js/ui.js' => 'file',
        'css' => 'dir',
        'css/theme.css' => 'file',
        'css/components.css' => 'file',
        'controllers' => 'dir',
        'data/db_config.json' => 'file'
    ];

    echo "<strong>Core File Checks:</strong><ul>";
    foreach ($required as $path => $type) {
        $full = $rootDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $path);
        $exists = ($type === 'dir') ? is_dir($full) : file_exists($full);
        $cls = $exists ? 'ok' : 'bad';
        $icon = $exists ? '✓' : '✗';
        echo "<li class='$cls'>$icon [$type] $path</li>";
    }
    echo "</ul><br>";

    echo "<strong>All Items Found in Root Dir:</strong><ul>";
    foreach (scandir($rootDir) as $item) {
        if ($item === '.' || $item === '..') continue;
        $fullPath = $rootDir . DIRECTORY_SEPARATOR . $item;
        $isDir = is_dir($fullPath);
        echo "<li>" . ($isDir ? "[DIR] " : "[FILE] ") . htmlspecialchars($item);
        if ($isDir) {
            $subItems = @scandir($fullPath);
            if ($subItems) {
                $subList = array_diff($subItems, ['.', '..']);
                echo " <small style='color:#94a3b8;'>(" . count($subList) . " items: " . htmlspecialchars(implode(', ', array_slice($subList, 0, 5))) . "...)</small>";
            }
        }
        echo "</li>";
    }
    echo "</ul>";
    echo "<p><a href='index.php' style='color:#38bdf8;'>&laquo; Back to App</a></p>";
    echo "</body></html>";
    exit;
}

// 1. If setup is not completed yet, route to setup.php
if (!file_exists($dataFile) && file_exists($setupFile)) {
    header('Location: setup.php');
    exit;
}

// 2. Check if frontend assets exist in root
$hasIndexHtml = file_exists($rootDir . DIRECTORY_SEPARATOR . 'index.html');
$hasAppJs = file_exists($rootDir . DIRECTORY_SEPARATOR . 'js' . DIRECTORY_SEPARATOR . 'app.js');
$hasThemeCss = file_exists($rootDir . DIRECTORY_SEPARATOR . 'css' . DIRECTORY_SEPARATOR . 'theme.css');
$hasControllers = is_dir($rootDir . DIRECTORY_SEPARATOR . 'controllers');

// 3. Subfolder Auto-Recovery: Search if user extracted zip into any subfolder
if (!$hasAppJs || !$hasThemeCss || !$hasControllers) {
    $subdirs = glob($rootDir . DIRECTORY_SEPARATOR . '*', GLOB_ONLYDIR);
    $foundSubdir = null;
    foreach ($subdirs as $dir) {
        if (file_exists($dir . DIRECTORY_SEPARATOR . 'js' . DIRECTORY_SEPARATOR . 'app.js')) {
            $foundSubdir = $dir;
            break;
        }
    }

    if ($foundSubdir) {
        // Attempt recursive copy to root
        function copyDirRecursive($src, $dst) {
            if (is_dir($src)) {
                if (!is_dir($dst)) @mkdir($dst, 0755, true);
                $files = scandir($src);
                foreach ($files as $file) {
                    if ($file !== '.' && $file !== '..') {
                        copyDirRecursive("$src/$file", "$dst/$file");
                    }
                }
            } else if (file_exists($src) && !file_exists($dst)) {
                @copy($src, $dst);
            }
        }

        copyDirRecursive($foundSubdir, $rootDir);

        if (file_exists($rootDir . DIRECTORY_SEPARATOR . 'js' . DIRECTORY_SEPARATOR . 'app.js')) {
            header('Location: index.php');
            exit;
        }

        $folderName = basename($foundSubdir);
        header("Location: $folderName/");
        exit;
    }

    // 4. Missing assets page with 1-Click ZIP Upload & Extract Form
    $existingZips = glob($rootDir . DIRECTORY_SEPARATOR . '*.zip');
    http_response_code(200);
    header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Upload Assets - Shiv Shakti HP Gas ERP</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 40px 16px; margin: 0; }
    .card { max-width: 650px; margin: 0 auto; background: #ffffff; padding: 36px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
    .badge { display: inline-block; background: #fee2e2; color: #b91c1c; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; margin-bottom: 12px; }
    h1 { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0 0 10px; }
    p { font-size: 13.5px; color: #475569; line-height: 1.6; margin-bottom: 16px; }
    .step-box { background: #f1f5f9; border-radius: 8px; padding: 18px; margin: 20px 0; font-size: 13px; color: #334155; }
    .step-box ol { margin: 0; padding-left: 20px; line-height: 1.8; }
    code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #0284c7; font-weight: bold; }
    .btn-row { display: flex; gap: 10px; margin-top: 24px; flex-wrap: wrap; }
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 11px 20px; border-radius: 6px; font-size: 13px; font-weight: 700; text-decoration: none; cursor: pointer; border: none; }
    .btn-primary { background: #0284c7; color: #fff; }
    .btn-success { background: #16a34a; color: #fff; }
    .btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
    .upload-zone { border: 2px dashed #38bdf8; background: #f0f9ff; padding: 22px; border-radius: 10px; text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Missing Folders: js, css, controllers</span>
    <h1>Folders Were Not Uploaded (404)</h1>
    <p>
      Your database is ready and core PHP files are active. However, the folders <code>js/</code>, <code>css/</code>, and <code>controllers/</code> were not uploaded to your server.
    </p>

    <?php if (!empty($uploadError)): ?>
      <div style="background:#fee2e2; border:1px solid #fca5a5; color:#991b1b; padding:12px; border-radius:6px; font-size:13px; margin-bottom:16px;">
        <strong>Upload Error:</strong> <?= htmlspecialchars($uploadError) ?>
      </div>
    <?php endif; ?>

    <?php if (!empty($existingZips)): ?>
      <div style="background:#ecfdf5; border:1px solid #a7f3d0; padding:16px; border-radius:8px; margin:16px 0;">
        <strong style="color:#065f46; display:block; margin-bottom:6px;">📦 ZIP Archive Detected on Server:</strong>
        <?php foreach ($existingZips as $zp): $zName = basename($zp); ?>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <span><code><?= htmlspecialchars($zName) ?></code></span>
            <a href="index.php?extract_zip=<?= urlencode($zName) ?>" class="btn btn-success" style="padding:7px 14px; font-size:12px;">
              ⚡ 1-Click Auto-Extract All Folders
            </a>
          </div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>

    <!-- 1-Click Direct ZIP Upload Form -->
    <div class="upload-zone">
      <h3 style="margin:0 0 6px; font-size:15px; color:#0369a1;">⚡ Option 1: 1-Click ZIP Upload & Auto-Install</h3>
      <p style="font-size:12.5px; color:#0284c7; margin-bottom:14px;">Select <strong>RojnamchaERP.zip</strong> from your computer to extract all folders instantly:</p>
      <form action="index.php" method="POST" enctype="multipart/form-data" style="display:inline-block;">
        <input type="file" name="zip_file" accept=".zip" required style="font-size:12.5px; margin-bottom:10px;">
        <br>
        <button type="submit" class="btn btn-primary" style="margin-top:6px;">
          🚀 Upload & Auto-Extract Folders
        </button>
      </form>
    </div>

    <!-- Manual Option -->
    <div class="step-box">
      <strong>Option 2: Using InfinityFree File Manager:</strong>
      <ol>
        <li>Upload <strong>RojnamchaERP.zip</strong> inside <code>htdocs/</code>.</li>
        <li>Right click it in Monsta FTP and click <strong>Extract</strong>.</li>
        <li>Make sure the extracted folders (<code>js</code>, <code>css</code>, <code>controllers</code>) are directly inside <code>htdocs/</code>.</li>
      </ol>
    </div>

    <div class="btn-row">
      <a href="setup.php" class="btn btn-secondary">Open Setup Wizard</a>
      <a href="index.php?diag=1" class="btn btn-secondary">View File Audit</a>
    </div>
  </div>
</body>
</html>
<?php
    exit;
}

// 5. Assets verified! Deliver index.html
header('Content-Type: text/html; charset=utf-8');
readfile($rootDir . DIRECTORY_SEPARATOR . 'index.html');
exit;
