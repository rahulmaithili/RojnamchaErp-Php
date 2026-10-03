<?php
/**
 * SHIV SHAKTI HP GAS - ONE-CLICK AUTO SETUP & INSTALLER
 * Optimized for InfinityFree, cPanel, Shared Hosting, and Local Deployments
 */

// Suppress all PHP errors/warnings from polluting JSON output
error_reporting(0);
ini_set('display_errors', '0');
ob_start(); // Buffer any stray output before JSON

// Protect execution if already locked
$lockFile = __DIR__ . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'setup.lock';
$isLocked = file_exists($lockFile);

// Handle AJAX actions
if (isset($_GET['action']) || isset($_POST['action'])) {
    ob_clean(); // Clear any buffered output before sending JSON
    header('Content-Type: application/json; charset=utf-8');
    $action = $_GET['action'] ?? $_POST['action'] ?? '';

    if ($isLocked && $action !== 'unlock') {
        echo json_encode([
            'ok' => false,
            'message' => 'Installer is locked for security. To re-run setup, delete the file: data/setup.lock'
        ]);
        exit;
    }

    if ($action === 'check_env') {
        $phpVersion = PHP_VERSION;
        $hasPdo = extension_loaded('pdo');
        $hasSqlite = extension_loaded('pdo_sqlite');
        $hasMysql = extension_loaded('pdo_mysql');
        
        $dataDir = __DIR__ . DIRECTORY_SEPARATOR . 'data';
        if (!is_dir($dataDir)) {
            @mkdir($dataDir, 0755, true);
        }
        $isDataWritable = is_writable($dataDir);

        $hasIndexHtml = file_exists(__DIR__ . DIRECTORY_SEPARATOR . 'index.html');
        $hasApiPhp = file_exists(__DIR__ . DIRECTORY_SEPARATOR . 'api.php');
        $hasJsDir = is_dir(__DIR__ . DIRECTORY_SEPARATOR . 'js');

        // Check if extracted inside a subfolder
        $subfolderWithApp = null;
        if (!$hasIndexHtml) {
            $dirs = glob(__DIR__ . DIRECTORY_SEPARATOR . '*', GLOB_ONLYDIR);
            foreach ($dirs as $d) {
                if (file_exists($d . DIRECTORY_SEPARATOR . 'index.html')) {
                    $subfolderWithApp = basename($d);
                    break;
                }
            }
        }

        echo json_encode([
            'ok' => true,
            'phpVersion' => $phpVersion,
            'isPhpOk' => version_compare($phpVersion, '7.4.0', '>='),
            'hasPdo' => $hasPdo,
            'hasSqlite' => $hasSqlite,
            'hasMysql' => $hasMysql,
            'isDataWritable' => $isDataWritable,
            'hasIndexHtml' => $hasIndexHtml,
            'hasApiPhp' => $hasApiPhp,
            'hasJsDir' => $hasJsDir,
            'subfolderWithApp' => $subfolderWithApp
        ]);
        exit;
    }

    if ($action === 'fix_subfolder') {
        $subfolder = trim($_POST['folder'] ?? '');
        $srcDir = realpath(__DIR__ . DIRECTORY_SEPARATOR . $subfolder);
        if (!$srcDir || !is_dir($srcDir) || strpos($srcDir, __DIR__) !== 0) {
            echo json_encode(['ok' => false, 'message' => 'Invalid subfolder']);
            exit;
        }

        $items = scandir($srcDir);
        $moved = 0;
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;
            $src = $srcDir . DIRECTORY_SEPARATOR . $item;
            $dst = __DIR__ . DIRECTORY_SEPARATOR . $item;
            if (!file_exists($dst)) {
                if (@rename($src, $dst)) {
                    $moved++;
                }
            }
        }

        echo json_encode([
            'ok' => true,
            'moved' => $moved,
            'message' => "Successfully moved files to root directory!"
        ]);
        exit;
    }

    if ($action === 'setup_sqlite') {
        try {
            $dataDir = __DIR__ . DIRECTORY_SEPARATOR . 'data';
            if (!is_dir($dataDir)) {
                @mkdir($dataDir, 0777, true);
            }
            @chmod($dataDir, 0777);

            // Write htaccess in data folder to protect sqlite
            @file_put_contents($dataDir . DIRECTORY_SEPARATOR . '.htaccess', "Deny from all\n");

            // Write SQLite config
            $cfg = [
                'DB_DRIVER' => 'sqlite',
                'DB_HOST' => '127.0.0.1',
                'DB_PORT' => '3306',
                'DB_NAME' => 'erp_database.sqlite',
                'DB_USER' => '',
                'DB_PASS' => '',
                'CONFIGURED_AT' => date('Y-m-d H:i:s')
            ];
            file_put_contents($dataDir . DIRECTORY_SEPARATOR . 'db_config.json', json_encode($cfg, JSON_PRETTY_PRINT));

            // Run database setup
            require_once __DIR__ . '/db.php';
            Database::setupDatabase();

            // Verify tables
            $db = Database::getConnection();
            $tables = $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll(PDO::FETCH_COLUMN);

            echo json_encode([
                'ok' => true,
                'driver' => 'sqlite',
                'tableCount' => count($tables),
                'tables' => $tables,
                'message' => 'SQLite Database initialized and migrated successfully!'
            ]);
        } catch (Throwable $e) {
            echo json_encode([
                'ok' => false,
                'message' => 'SQLite Setup Failed: ' . $e->getMessage()
            ]);
        }
        exit;
    }

    if ($action === 'setup_mysql') {
        $host = trim($_POST['host'] ?? '127.0.0.1');
        $port = trim($_POST['port'] ?? '3306');
        $dbname = trim($_POST['dbname'] ?? '');
        $user = trim($_POST['user'] ?? '');
        $pass = trim($_POST['pass'] ?? '');

        if (empty($dbname) || empty($user)) {
            echo json_encode(['ok' => false, 'message' => 'Database Name and Username are required for MySQL!']);
            exit;
        }

        try {
            // Test connection first
            $dsn = "mysql:host=$host;port=$port;charset=utf8mb4";
            $testPdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
            ]);

            // Create database if permitted
            try {
                $testPdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            } catch (Exception $e) {
                // Ignore if InfinityFree restricts CREATE DATABASE (usually created in vPanel)
            }

            // Save config
            $dataDir = __DIR__ . DIRECTORY_SEPARATOR . 'data';
            if (!is_dir($dataDir)) {
                @mkdir($dataDir, 0777, true);
            }
            $cfg = [
                'DB_DRIVER' => 'mysql',
                'DB_HOST' => $host,
                'DB_PORT' => $port,
                'DB_NAME' => $dbname,
                'DB_USER' => $user,
                'DB_PASS' => $pass,
                'CONFIGURED_AT' => date('Y-m-d H:i:s')
            ];
            file_put_contents($dataDir . DIRECTORY_SEPARATOR . 'db_config.json', json_encode($cfg, JSON_PRETTY_PRINT));

            // Connect to specific database
            $dbPdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4", $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
            ]);

            // Execute schema adapted for MySQL
            require_once __DIR__ . '/db.php';
            Database::setConnection($dbPdo);
            Database::setupDatabase();

            $tables = $dbPdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

            echo json_encode([
                'ok' => true,
                'driver' => 'mysql',
                'tableCount' => count($tables),
                'tables' => $tables,
                'message' => 'MySQL Database connected and all ERP tables created successfully!'
            ]);
        } catch (Throwable $e) {
            echo json_encode([
                'ok' => false,
                'message' => 'MySQL Connection / Setup Failed: ' . $e->getMessage()
            ]);
        }
        exit;
    }

    if ($action === 'lock') {
        $dataDir = __DIR__ . DIRECTORY_SEPARATOR . 'data';
        file_put_contents($dataDir . DIRECTORY_SEPARATOR . 'setup.lock', 'Installed on ' . date('Y-m-d H:i:s'));
        echo json_encode(['ok' => true, 'message' => 'Setup wizard locked for security.']);
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shiv Shakti HP Gas ERP - Auto Setup & Installer</title>
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root {
      --primary: #001f3f;
      --accent: #0284c7;
      --success: #15803d;
      --danger: #b91c1c;
      --bg: #f8fafc;
      --surface: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --muted: #64748b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); min-height: 100vh; padding: 30px 16px; display: flex; justify-content: center; align-items: flex-start; }
    .installer-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08); max-width: 760px; width: 100%; overflow: hidden; }
    .header { background: linear-gradient(135deg, #001f3f 0%, #003366 100%); color: #ffffff; padding: 24px 28px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
    .header p { font-size: 13px; opacity: 0.85; margin-top: 4px; }
    .badge-hp { background: #ea580c; color: #fff; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; }
    .content { padding: 28px; }
    .check-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .check-item { background: #f1f5f9; padding: 12px 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px; }
    .check-item strong { display: block; font-size: 13px; margin-bottom: 2px; }
    .status-ok { color: var(--success); font-weight: 700; }
    .status-fail { color: var(--danger); font-weight: 700; }
    .tabs { display: flex; gap: 8px; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; }
    .tab-btn { background: none; border: none; padding: 10px 18px; font-size: 13px; font-weight: 700; color: var(--muted); cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -2px; }
    .tab-btn.active { color: var(--accent); border-color: var(--accent); }
    .tab-panel { display: none; }
    .tab-panel.active { display: block; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 5px; color: #334155; }
    .form-control { width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; }
    .form-control:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15); }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 20px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: 0.2s; text-decoration: none; }
    .btn-primary { background: var(--accent); color: #fff; }
    .btn-primary:hover { background: #026ca3; }
    .btn-success { background: var(--success); color: #fff; }
    .btn-success:hover { background: #166534; }
    .console-box { background: #0f172a; color: #38bdf8; font-family: monospace; font-size: 12px; padding: 14px; border-radius: 6px; max-height: 220px; overflow-y: auto; margin-top: 20px; display: none; }
    .success-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-top: 20px; display: none; }
    .success-card h3 { color: #166534; font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px; }
    .cred-box { background: #ffffff; border: 1px dashed #86efac; border-radius: 6px; padding: 12px 16px; margin: 14px 0; font-size: 13px; }
    .alert-box { padding: 12px 16px; border-radius: 6px; font-size: 13px; margin-bottom: 16px; }
    .alert-info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
    .alert-warning { background: #fffbeb; border: 1px solid #fef3c7; color: #92400e; }
  </style>
</head>
<body>

<div class="installer-card">
  <!-- Header -->
  <div class="header">
    <div>
      <h1>SHIV SHAKTI HP GAS (PANDAUL)</h1>
      <p>Automatic ERP Database Installer & Hosting Setup</p>
    </div>
    <span class="badge-hp"><i class="fa-solid fa-fire"></i> HP GAS</span>
  </div>

  <div class="content">
    <?php if ($isLocked): ?>
      <div class="alert-box alert-warning">
        <strong><i class="fa-solid fa-lock"></i> Setup is Locked:</strong> The ERP database is already installed and protected. To access your system directly, click the button below. If you want to re-run setup, delete the file <code>data/setup.lock</code> via File Manager.
      </div>
      <div style="text-align:center; padding: 20px 0;">
        <a href="index.php" class="btn btn-success" style="font-size:15px; padding:14px 28px;">
          <i class="fa-solid fa-rocket"></i> Launch Shiv Shakti HP Gas ERP
        </a>
      </div>
    <?php else: ?>

      <!-- System Environment Health Check -->
      <div class="alert-box alert-info">
        <i class="fa-solid fa-circle-info"></i> <strong>Hosting Compatibility Check:</strong> Verifying server capabilities on InfinityFree / Cloud server...
      </div>

      <div class="check-grid" id="checks-grid">
        <div class="check-item">
          <strong>PHP Version</strong>
          <span id="chk-php"><i class="fa-solid fa-spinner fa-spin"></i> Checking...</span>
        </div>
        <div class="check-item">
          <strong>PDO SQLite</strong>
          <span id="chk-sqlite"><i class="fa-solid fa-spinner fa-spin"></i> Checking...</span>
        </div>
        <div class="check-item">
          <strong>PDO MySQL</strong>
          <span id="chk-mysql"><i class="fa-solid fa-spinner fa-spin"></i> Checking...</span>
        </div>
        <div class="check-item">
          <strong>Frontend Files</strong>
          <span id="chk-files"><i class="fa-solid fa-spinner fa-spin"></i> Checking...</span>
        </div>
      </div>

      <!-- File Structure Recovery Banner -->
      <div id="file-warning-box" style="display:none; margin-bottom:20px;"></div>

      <!-- Database Options Tabs -->
      <div class="tabs">
        <button type="button" class="tab-btn active" data-tab="mysql-tab">
          <i class="fa-solid fa-database"></i> InfinityFree MySQL (vPanel)
        </button>
        <button type="button" class="tab-btn" data-tab="sqlite-tab">
          <i class="fa-solid fa-bolt"></i> 1-Click SQLite (Alternative)
        </button>
      </div>

      <!-- Tab 1: MySQL (Default) -->
      <div id="mysql-tab" class="tab-panel active">
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:14px; margin-bottom:14px;">
          <p style="font-size:12.5px; color:#166534; font-weight:600;">
            <i class="fa-solid fa-circle-check"></i> Your InfinityFree MySQL credentials are pre-filled below. Just click the button!
          </p>
        </div>
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:12px;">
          <div class="form-group">
            <label>MySQL Host Name *</label>
            <input type="text" id="my-host" class="form-control" placeholder="e.g. sql101.infinityfree.com" value="sql101.infinityfree.com">
          </div>
          <div class="form-group">
            <label>Port</label>
            <input type="text" id="my-port" class="form-control" value="3306">
          </div>
        </div>
        <div class="form-group">
          <label>Database Name *</label>
          <input type="text" id="my-dbname" class="form-control" placeholder="e.g. if0_42675336_Rojnamcha" value="if0_42675336_Rojnamcha">
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="form-group">
            <label>Username *</label>
            <input type="text" id="my-user" class="form-control" placeholder="e.g. if0_42675336" value="if0_42675336">
          </div>
          <div class="form-group">
            <label>Password *</label>
            <input type="password" id="my-pass" class="form-control" placeholder="vPanel Password" value="rahulJulee">
          </div>
        </div>
        <button type="button" id="btn-run-mysql" class="btn btn-primary" style="width:100%; font-size:14px; padding:13px;">
          <i class="fa-solid fa-plug"></i> Connect MySQL &amp; Auto Setup Tables
        </button>
      </div>

      <!-- Tab 2: SQLite Alternative -->
      <div id="sqlite-tab" class="tab-panel">
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:18px; margin-bottom:18px;">
          <h4 style="font-size:14px; font-weight:800; color:#0f172a; margin-bottom:6px;">
            <i class="fa-solid fa-check-double" style="color:var(--success);"></i> Zero Configuration Setup
          </h4>
          <p style="font-size:12.5px; color:#475569; line-height:1.5;">
            SQLite stores data in a file in <code>data/erp_database.sqlite</code> without requiring a separate database server.
          </p>
        </div>
        <button type="button" id="btn-run-sqlite" class="btn btn-primary" style="width:100%; font-size:14px; padding:13px;">
          <i class="fa-solid fa-play"></i> Run 1-Click SQLite Auto Setup
        </button>
      </div>

      <!-- Live Execution Log -->
      <div id="console" class="console-box"></div>

      <!-- Success Card -->
      <div id="success-box" class="success-card">
        <h3><i class="fa-solid fa-circle-check"></i> Database Setup Completed Successfully!</h3>
        <p style="font-size:13px; color:#14532d; margin-top:4px;">
          All tables, HPCL cylinder categories, stock ledgers, and initial settings are configured and ready.
        </p>
        
        <div class="cred-box">
          <div style="font-weight:700; color:#166534; margin-bottom:4px;">DEFAULT ADMIN LOGIN CREDENTIALS:</div>
          <div><strong>Username:</strong> <code style="background:#f1f5f9; padding:2px 6px; border-radius:3px;">admin</code></div>
          <div><strong>Password:</strong> <code style="background:#f1f5f9; padding:2px 6px; border-radius:3px;">admin123</code></div>
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:16px;">
          <a href="index.php" class="btn btn-success" style="flex:1;">
            <i class="fa-solid fa-right-to-bracket"></i> Launch Shiv Shakti HP Gas ERP
          </a>
          <button type="button" id="btn-lock" class="btn btn-primary" style="background:#334155;">
            <i class="fa-solid fa-shield-halved"></i> Lock Setup Wizard
          </button>
        </div>
      </div>

    <?php endif; ?>
  </div>
</div>

<script>
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const tabId = e.currentTarget.dataset.tab;
      document.getElementById(tabId)?.classList.add('active');
    });
  });

  const logConsole = (msg) => {
    const box = document.getElementById('console');
    if (!box) return;
    box.style.display = 'block';
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  };

  // 1. Initial Environment Check
  async function checkEnvironment() {
    try {
      const res = await fetch('setup.php?action=check_env');
      const data = await res.json();
      if (data.ok) {
        document.getElementById('chk-php').innerHTML = `<span class="${data.isPhpOk ? 'status-ok' : 'status-fail'}">${data.phpVersion} ${data.isPhpOk ? '✓' : '✗'}</span>`;
        document.getElementById('chk-sqlite').innerHTML = `<span class="${data.hasSqlite ? 'status-ok' : 'status-fail'}">${data.hasSqlite ? 'Enabled ✓' : 'Disabled ✗'}</span>`;
        document.getElementById('chk-mysql').innerHTML = `<span class="${data.hasMysql ? 'status-ok' : 'status-fail'}">${data.hasMysql ? 'Enabled ✓' : 'Disabled ✗'}</span>`;
        
        const filesEl = document.getElementById('chk-files');
        const warnBox = document.getElementById('file-warning-box');
        if (data.hasIndexHtml) {
          filesEl.innerHTML = `<span class="status-ok">Present ✓</span>`;
          if (warnBox) warnBox.style.display = 'none';
        } else {
          filesEl.innerHTML = `<span class="status-fail">Missing ✗</span>`;
          if (warnBox) {
            warnBox.style.display = 'block';
            if (data.subfolderWithApp) {
              warnBox.innerHTML = `
                <div style="background:#fef3c7; border:1px solid #fde68a; color:#92400e; padding:16px; border-radius:8px; font-size:13px;">
                  <strong style="display:block; font-size:14px; margin-bottom:6px;"><i class="fa-solid fa-triangle-exclamation"></i> Files Detected in Subfolder: <code>htdocs/${data.subfolderWithApp}</code></strong>
                  Your project files were extracted into a subfolder. To fix the 404 error, they must be moved directly into <code>htdocs</code>.
                  <div style="margin-top:12px;">
                    <button type="button" id="btn-fix-folder" class="btn btn-primary" style="padding:8px 16px; font-size:12.5px;">
                      <i class="fa-solid fa-folder-tree"></i> Move Files to htdocs Root Automatically
                    </button>
                  </div>
                </div>
              `;
              document.getElementById('btn-fix-folder')?.addEventListener('click', async () => {
                const b = document.getElementById('btn-fix-folder');
                b.disabled = true;
                b.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Moving files...';
                const fd = new FormData();
                fd.append('folder', data.subfolderWithApp);
                const r = await fetch('setup.php?action=fix_subfolder', { method: 'POST', body: fd });
                const d = await r.json();
                if (d.ok) {
                  alert(d.message || 'Files moved successfully!');
                  location.reload();
                } else {
                  alert('Error moving files: ' + d.message);
                  b.disabled = false;
                  b.innerHTML = 'Retry Moving Files';
                }
              });
            } else {
              warnBox.innerHTML = `
                <div style="background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:16px; border-radius:8px; font-size:13px;">
                  <strong style="display:block; font-size:14px; margin-bottom:6px;"><i class="fa-solid fa-circle-exclamation"></i> Frontend Files Missing in <code>htdocs/</code></strong>
                  Only <code>setup.php</code> is present in this folder. <code>index.html</code>, <code>js/</code>, <code>css/</code>, and <code>api.php</code> were not uploaded.
                  Please upload <strong>RojnamchaERP.zip</strong> to your InfinityFree File Manager inside <code>htdocs/</code> and extract all files there.
                </div>
              `;
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
  checkEnvironment();

  // 2. Setup SQLite Handler
  document.getElementById('btn-run-sqlite')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-run-sqlite');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Setting up database...';
    logConsole('Initiating 1-Click SQLite setup...');

    try {
      const res = await fetch('setup.php?action=setup_sqlite');
      const data = await res.json();
      if (data.ok) {
        logConsole('✓ SQLite database connected.');
        logConsole(`✓ ${data.tableCount} ERP tables created successfully:`);
        (data.tables || []).forEach(t => logConsole(`   + ${t}`));
        logConsole('✓ Default admin user & master items seeded.');
        logConsole('✓ Database setup completed!');
        document.getElementById('success-box').style.display = 'block';
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Setup Complete!';
      } else {
        logConsole('✗ Error: ' + data.message);
        alert('Setup Error: ' + data.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Retry SQLite Setup';
      }
    } catch (err) {
      logConsole('✗ Network error during setup: ' + err.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-play"></i> Retry SQLite Setup';
    }
  });

  // 3. Setup MySQL Handler
  document.getElementById('btn-run-mysql')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-run-mysql');
    const host = document.getElementById('my-host').value.trim();
    const port = document.getElementById('my-port').value.trim();
    const dbname = document.getElementById('my-dbname').value.trim();
    const user = document.getElementById('my-user').value.trim();
    const pass = document.getElementById('my-pass').value;

    if (!dbname || !user) {
      alert('Database Name and Username are required!');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting to MySQL...';
    logConsole(`Connecting to MySQL host: ${host}:${port}...`);

    const formData = new FormData();
    formData.append('action', 'setup_mysql');
    formData.append('host', host);
    formData.append('port', port);
    formData.append('dbname', dbname);
    formData.append('user', user);
    formData.append('pass', pass);

    try {
      const res = await fetch('setup.php', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.ok) {
        logConsole('✓ MySQL connection verified.');
        logConsole(`✓ ${data.tableCount} tables created and verified:`);
        (data.tables || []).forEach(t => logConsole(`   + ${t}`));
        logConsole('✓ Default admin user & items seeded.');
        logConsole('✓ MySQL Setup completed!');
        document.getElementById('success-box').style.display = 'block';
        btn.innerHTML = '<i class="fa-solid fa-check"></i> MySQL Setup Complete!';
      } else {
        logConsole('✗ MySQL Error: ' + data.message);
        alert('MySQL Setup Failed: ' + data.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-plug"></i> Retry MySQL Setup';
      }
    } catch (err) {
      logConsole('✗ Network error: ' + err.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-plug"></i> Retry MySQL Setup';
    }
  });

  // 4. Lock Installer Handler
  document.getElementById('btn-lock')?.addEventListener('click', async () => {
    try {
      const res = await fetch('setup.php?action=lock');
      const data = await res.json();
      if (data.ok) {
        alert('Installer locked. You will now be redirected to the ERP login screen.');
        window.location.href = 'index.html';
      }
    } catch (err) {
      window.location.href = 'index.html';
    }
  });
</script>

</body>
</html>
