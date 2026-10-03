<?php
/**
 * SHIV SHAKTI HP GAS (PANDAUL) ERP - Main Application Entry Point
 * Handles auto-detection, subfolder extraction recovery, asset verification, and environment routing.
 */

error_reporting(E_ALL & ~E_NOTICE);
ini_set('display_errors', '0');

$rootDir = __DIR__;
$dataFile = $rootDir . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'db_config.json';
$setupFile = $rootDir . DIRECTORY_SEPARATOR . 'setup.php';

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
        $isDir = is_dir($rootDir . DIRECTORY_SEPARATOR . $item);
        echo "<li>" . ($isDir ? "[DIR] " : "[FILE] ") . htmlspecialchars($item) . "</li>";
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

// 3. Subfolder Auto-Recovery: Did user extract zip into a subfolder?
if (!$hasAppJs || !$hasThemeCss || !$hasIndexHtml) {
    // Search subdirectories for js/app.js
    $subdirs = glob($rootDir . DIRECTORY_SEPARATOR . '*', GLOB_ONLYDIR);
    $foundSubdir = null;
    foreach ($subdirs as $dir) {
        if (file_exists($dir . DIRECTORY_SEPARATOR . 'js' . DIRECTORY_SEPARATOR . 'app.js')) {
            $foundSubdir = $dir;
            break;
        }
    }

    if ($foundSubdir) {
        // Attempt to move/copy all files from subfolder into root directory automatically
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

        // Re-check if assets are now in root
        if (file_exists($rootDir . DIRECTORY_SEPARATOR . 'js' . DIRECTORY_SEPARATOR . 'app.js')) {
            header('Location: index.php');
            exit;
        }

        // If copy failed, redirect to subfolder directly
        $folderName = basename($foundSubdir);
        header("Location: $folderName/");
        exit;
    }

    // 4. If assets are completely missing from the server
    http_response_code(200);
    header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Frontend Assets Missing - Shiv Shakti HP Gas ERP</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 40px 16px; margin: 0; }
    .card { max-width: 620px; margin: 0 auto; background: #ffffff; padding: 36px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
    .badge { display: inline-block; background: #fee2e2; color: #b91c1c; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; margin-bottom: 12px; }
    h1 { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0 0 10px; }
    p { font-size: 13.5px; color: #475569; line-height: 1.6; margin-bottom: 16px; }
    .step-box { background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; color: #334155; }
    .step-box ol { margin: 0; padding-left: 20px; line-height: 1.8; }
    code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #0284c7; font-weight: bold; }
    .btn-row { display: flex; gap: 10px; margin-top: 24px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 11px 20px; border-radius: 6px; font-size: 13px; font-weight: 700; text-decoration: none; cursor: pointer; }
    .btn-primary { background: #0284c7; color: #fff; }
    .btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Missing Project Folders</span>
    <h1>JavaScript & CSS Folders Not Found (404)</h1>
    <p>
      The main PHP and HTML files loaded, but the browser could not find <code>js/app.js</code> or <code>css/theme.css</code> on your server.
      This is why the screen appeared blank.
    </p>

    <div class="step-box">
      <strong>How to Fix in 1 Minute on InfinityFree:</strong>
      <ol>
        <li>Download <strong>RojnamchaERP.zip</strong> from your local computer.</li>
        <li>Open your InfinityFree <strong>Control Panel &rarr; Online File Manager (Monsta FTP)</strong>.</li>
        <li>Go into the <strong>htdocs/</strong> directory.</li>
        <li>Click <strong>Upload &rarr; Upload Zip</strong>, select <code>RojnamchaERP.zip</code>, and click <strong>Extract</strong>.</li>
        <li>Ensure the folders <code>js/</code>, <code>css/</code>, and <code>controllers/</code> are located directly inside <code>htdocs/</code>.</li>
      </ol>
    </div>

    <div class="btn-row">
      <a href="setup.php" class="btn btn-primary">Open Setup Wizard & Diagnostics</a>
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
