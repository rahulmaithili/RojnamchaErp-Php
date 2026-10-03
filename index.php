<?php
/**
 * SHIV SHAKTI HP GAS (PANDAUL) ERP - Main Application Entry Point
 * Handles auto-detection, subfolder extraction recovery, and environment routing.
 */

$rootDir = __DIR__;
$dataFile = $rootDir . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'db_config.json';
$setupFile = $rootDir . DIRECTORY_SEPARATOR . 'setup.php';

// If setup is not completed yet, route to setup.php
if (!file_exists($dataFile) && file_exists($setupFile)) {
    header('Location: setup.php');
    exit;
}

// 1. If index.html exists in root, serve it directly
if (file_exists($rootDir . DIRECTORY_SEPARATOR . 'index.html')) {
    // Deliver index.html
    readfile($rootDir . DIRECTORY_SEPARATOR . 'index.html');
    exit;
}

// 2. Recovery check: Did user extract zip into a subfolder inside htdocs?
$subdirs = glob($rootDir . '/*', GLOB_ONLYDIR);
$foundSubdir = null;
foreach ($subdirs as $dir) {
    if (file_exists($dir . DIRECTORY_SEPARATOR . 'index.html')) {
        $foundSubdir = basename($dir);
        break;
    }
}

if ($foundSubdir) {
    // Redirect to the subfolder where the files actually reside
    header("Location: $foundSubdir/");
    exit;
}

// 3. Fallback error page if index.html is truly missing
http_response_code(404);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Setup Incomplete - Shiv Shakti HP Gas ERP</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 40px 20px; text-align: center; }
    .box { max-width: 600px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    h2 { color: #b91c1c; margin-bottom: 12px; }
    p { font-size: 14px; line-height: 1.6; color: #475569; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #0369a1; }
    .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #0284c7; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="box">
    <h2>Missing Frontend Files</h2>
    <p>Database is installed, but <code>index.html</code> was not found inside the <code>htdocs/</code> directory.</p>
    <p>Please ensure you have uploaded and extracted all project files (including <code>index.html</code>, <code>js/</code>, <code>css/</code>, <code>controllers/</code>) directly inside <code>htdocs/</code>.</p>
    <a href="setup.php" class="btn">Open Setup Wizard</a>
  </div>
</body>
</html>
