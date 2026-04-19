#!/bin/bash
# ============================================================
# Ecclesia Manager — On-Premise Deployment Script
# ============================================================
#
# RUN THIS ON YOUR DEV MACHINE — not on the server.
# It builds the React app, assembles everything, and creates
# a single .zip file you FTP to the server.
#
# Prerequisites (on YOUR machine):
#   - Node.js 18+
#   - npm
#   - zip
#
# Prerequisites (on the SERVER):
#   - PHP 7.4+ with PDO_MySQL and ZipArchive extensions
#   - MySQL 5.7+ or MariaDB 10.3+
#   - Apache with mod_rewrite enabled
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Output:
#   ecclesia-deploy.zip  ← upload this single file via FTP
#
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$SCRIPT_DIR/deploy"
ZIP_NAME="ecclesia-deploy.zip"

echo ""
echo "=========================================="
echo "  Ecclesia Manager — Build & Package"
echo "=========================================="
echo ""

# ----------------------------------------------------------
# Step 1: Clean
# ----------------------------------------------------------
echo "[1/6] Cleaning previous build..."
rm -rf "$DEPLOY_DIR"
rm -f "$SCRIPT_DIR/$ZIP_NAME"
mkdir -p "$DEPLOY_DIR"

# ----------------------------------------------------------
# Step 2: Install dependencies
# ----------------------------------------------------------
echo "[2/6] Installing dependencies..."
cd "$SCRIPT_DIR"
npm ci --silent

# ----------------------------------------------------------
# Step 3: Build React app
# ----------------------------------------------------------
echo "[3/6] Building production bundle..."
npm run build

# ----------------------------------------------------------
# Step 4: Assemble deploy folder
# ----------------------------------------------------------
echo "[4/6] Assembling deploy folder..."

# React SPA → deploy/app/
cp -r "$SCRIPT_DIR/dist/." "$DEPLOY_DIR/app/"

# PHP API → deploy/php-api/
cp -r "$SCRIPT_DIR/php-api" "$DEPLOY_DIR/php-api"

# Database schema → deploy/database/
cp -r "$SCRIPT_DIR/database" "$DEPLOY_DIR/database"

# .htaccess (ensure it exists)
if [ ! -f "$DEPLOY_DIR/app/.htaccess" ]; then
  cat > "$DEPLOY_DIR/app/.htaccess" << 'HTACCESS'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /app/

  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . index.html [L]
</IfModule>
HTACCESS
fi

# ----------------------------------------------------------
# Step 5: Create the PHP installer (run by the remote user)
# ----------------------------------------------------------
cat > "$DEPLOY_DIR/install.php" << 'INSTALLER'
<?php
/**
 * Ecclesia Manager — Server Installer
 *
 * This script:
 *   1. Creates the MySQL database and tables
 *   2. Sets up the default admin account
 *   3. Verifies PHP extensions
 *
 * HOW TO USE:
 *   1. Upload ecclesia-deploy.zip to your server via FTP
 *      (e.g. into public_html/ or any web-accessible folder)
 *   2. Unzip it — you'll get: app/, php-api/, database/, install.php
 *   3. Edit php-api/config.php with your MySQL credentials
 *   4. Visit this file in your browser:
 *      https://yoursite.com/install.php
 *   5. DELETE this file after installation!
 */

// Prevent re-running
$lockFile = __DIR__ . '/.installed';

?><!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ecclesia Manager — 安裝程式</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 2rem; }
    .container { max-width: 700px; margin: 0 auto; }
    h1 { font-size: 1.8rem; margin-bottom: 1rem; }
    h2 { font-size: 1.2rem; margin: 1.5rem 0 0.5rem; color: #94a3b8; }
    .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; }
    .ok { color: #4ade80; } .fail { color: #f87171; } .warn { color: #fbbf24; }
    .row { display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #334155; }
    .row:last-child { border: none; }
    pre { background: #0f172a; padding: 1rem; border-radius: 8px; overflow-x: auto; font-size: 0.85rem; margin: 0.5rem 0; }
    button, .btn { background: #3b82f6; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 8px; font-size: 1rem; cursor: pointer; text-decoration: none; display: inline-block; }
    button:hover, .btn:hover { background: #2563eb; }
    .btn-danger { background: #ef4444; } .btn-danger:hover { background: #dc2626; }
    .steps { counter-reset: step; list-style: none; }
    .steps li { counter-increment: step; padding: 0.5rem 0; padding-left: 2rem; position: relative; }
    .steps li::before { content: counter(step); position: absolute; left: 0; background: #3b82f6; color: white; width: 1.5rem; height: 1.5rem; border-radius: 50%; text-align: center; font-size: 0.8rem; line-height: 1.5rem; }
  </style>
</head>
<body>
<div class="container">
  <h1>⛪ Ecclesia Manager 安裝程式</h1>

<?php

// ============================================================
// Check if already installed
// ============================================================
if (file_exists($lockFile)) {
    echo '<div class="card"><p class="warn">⚠ 已經安裝過了。如需重新安裝，請刪除 <code>.installed</code> 檔案。</p></div>';
    echo '<p style="margin-top:1rem"><a href="app/" class="btn">前往應用程式 →</a></p>';
    echo '</div></body></html>';
    exit;
}

// ============================================================
// Step 1: Check PHP extensions
// ============================================================
echo '<h2>1. 環境檢查</h2>';
echo '<div class="card">';

$checks = [
    ['PHP 版本 ≥ 7.4', version_compare(PHP_VERSION, '7.4.0', '>='), PHP_VERSION],
    ['PDO_MySQL', extension_loaded('pdo_mysql'), extension_loaded('pdo_mysql') ? '已啟用' : '未安裝'],
    ['JSON', extension_loaded('json'), extension_loaded('json') ? '已啟用' : '未安裝'],
    ['cURL', extension_loaded('curl'), extension_loaded('curl') ? '已啟用' : '未安裝（Gemini AI 需要）'],
    ['Sessions', session_status() !== PHP_SESSION_DISABLED, session_status() !== PHP_SESSION_DISABLED ? '已啟用' : '已停用'],
];

$allOk = true;
foreach ($checks as [$label, $pass, $detail]) {
    $cls = $pass ? 'ok' : 'fail';
    $icon = $pass ? '✓' : '✗';
    echo "<div class='row'><span>$label</span><span class='$cls'>$icon $detail</span></div>";
    if (!$pass && $label !== 'cURL') $allOk = false;
}
echo '</div>';

if (!$allOk) {
    echo '<div class="card"><p class="fail">❌ 環境檢查未通過，請先安裝缺少的 PHP 擴展。</p></div>';
    echo '</div></body></html>';
    exit;
}

// ============================================================
// Step 2: Check config.php
// ============================================================
echo '<h2>2. 資料庫設定</h2>';

$configFile = __DIR__ . '/php-api/config.php';
if (!file_exists($configFile)) {
    echo '<div class="card"><p class="fail">❌ 找不到 php-api/config.php。請確認檔案已上傳。</p></div>';
    echo '</div></body></html>';
    exit;
}

// ============================================================
// Step 3: Run installation if POST
// ============================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'install') {

    echo '<h2>3. 安裝中...</h2>';
    echo '<div class="card">';

    try {
        // Load config to get DB credentials
        // We can't require config.php because it starts a session and outputs JSON on error
        // Instead, parse the defines manually
        $configContent = file_get_contents($configFile);

        preg_match("/define\('DB_HOST',\s*'([^']*)'\)/", $configContent, $m);
        $dbHost = $m[1] ?? 'localhost';
        preg_match("/define\('DB_NAME',\s*'([^']*)'\)/", $configContent, $m);
        $dbName = $m[1] ?? 'ecclesia';
        preg_match("/define\('DB_USER',\s*'([^']*)'\)/", $configContent, $m);
        $dbUser = $m[1] ?? 'root';
        preg_match("/define\('DB_PASS',\s*'([^']*)'\)/", $configContent, $m);
        $dbPass = $m[1] ?? '';

        echo "<div class='row'><span>資料庫主機</span><span>$dbHost</span></div>";
        echo "<div class='row'><span>資料庫名稱</span><span>$dbName</span></div>";
        echo "<div class='row'><span>使用者</span><span>$dbUser</span></div>";

        // Connect without database first to create it
        $pdo = new PDO("mysql:host=$dbHost;charset=utf8mb4", $dbUser, $dbPass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);

        // Create database if not exists
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        echo "<div class='row'><span>建立資料庫</span><span class='ok'>✓ $dbName</span></div>";

        // Switch to the database
        $pdo->exec("USE `$dbName`");

        // Import schema
        $schemaFile = __DIR__ . '/database/schema.sql';
        if (!file_exists($schemaFile)) {
            throw new Exception('找不到 database/schema.sql');
        }

        $sql = file_get_contents($schemaFile);
        // Remove the INSERT for default admin (we'll do it properly below)
        $sql = preg_replace('/INSERT INTO users.*?;/s', '', $sql);
        $pdo->exec($sql);
        echo "<div class='row'><span>匯入資料表</span><span class='ok'>✓ 7 個資料表</span></div>";

        // Create admin account with proper hash
        $adminPass = 'admin123';
        $hash = password_hash($adminPass, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT IGNORE INTO users (uid, username, password_hash, name, email, role) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute(['admin-default-001', 'admin', $hash, 'Administrator', 'admin@church.local', 'admin']);
        echo "<div class='row'><span>管理員帳號</span><span class='ok'>✓ admin / admin123</span></div>";

        // Write lock file
        file_put_contents($lockFile, date('Y-m-d H:i:s'));
        echo "<div class='row'><span>安裝完成</span><span class='ok'>✓</span></div>";

    } catch (Exception $e) {
        echo "<div class='row'><span>錯誤</span><span class='fail'>✗ " . htmlspecialchars($e->getMessage()) . "</span></div>";
        echo '</div>';
        echo '<div class="card"><p class="fail">安裝失敗。請檢查 php-api/config.php 中的資料庫設定是否正確。</p></div>';
        echo '</div></body></html>';
        exit;
    }

    echo '</div>';

    echo '<h2>4. 完成！</h2>';
    echo '<div class="card">';
    echo '<p class="ok" style="font-size:1.2rem;margin-bottom:1rem">✓ 安裝成功！</p>';
    echo '<ol class="steps">';
    echo '<li>用 <code>admin</code> / <code>admin123</code> 登入</li>';
    echo '<li>立即更改管理員密碼</li>';
    echo '<li>在管理面板中建立會眾帳號</li>';
    echo '<li><strong class="fail">刪除此 install.php 檔案！</strong></li>';
    echo '</ol>';
    echo '</div>';
    echo '<p style="margin-top:1rem"><a href="app/" class="btn">前往應用程式 →</a></p>';
    echo '</div></body></html>';
    exit;
}

// ============================================================
// Show install form
// ============================================================
echo '<div class="card">';
echo '<p>設定檔位置：<code>php-api/config.php</code></p>';
echo '<pre>';
echo "DB_HOST = '...'\n";
echo "DB_NAME = 'ecclesia'\n";
echo "DB_USER = '...'\n";
echo "DB_PASS = '...'";
echo '</pre>';
echo '<p style="margin-top:0.5rem" class="warn">⚠ 請先用文字編輯器或 FTP 編輯 config.php，填入正確的 MySQL 帳密。</p>';
echo '</div>';

echo '<h2>3. 開始安裝</h2>';
echo '<div class="card">';
echo '<p>點擊下方按鈕將會：</p>';
echo '<ol class="steps" style="margin: 1rem 0">';
echo '<li>建立 MySQL 資料庫 <code>ecclesia</code></li>';
echo '<li>匯入所有資料表（users, rooms, bookings, media, attendance, worksheet, sessions）</li>';
echo '<li>建立預設管理員帳號（admin / admin123）</li>';
echo '</ol>';
echo '<form method="POST">';
echo '<input type="hidden" name="action" value="install">';
echo '<button type="submit">開始安裝</button>';
echo '</form>';
echo '</div>';

?>

</div>
</body>
</html>
INSTALLER

# ----------------------------------------------------------
# Step 6: Create zip
# ----------------------------------------------------------
echo "[5/6] Creating $ZIP_NAME..."
cd "$DEPLOY_DIR"
zip -r "$SCRIPT_DIR/$ZIP_NAME" . -x "*.DS_Store" > /dev/null

echo "[6/6] Done!"
echo ""
echo "=========================================="
echo "  OUTPUT: $ZIP_NAME"
echo "=========================================="
echo ""
echo "  Send this ONE file to the remote user."
echo "  Tell them to follow these steps:"
echo ""
echo "  ┌─────────────────────────────────────────────────┐"
echo "  │  REMOTE USER STEPS                              │"
echo "  │                                                 │"
echo "  │  1. FTP upload ecclesia-deploy.zip              │"
echo "  │     to: public_html/ (the web root)             │"
echo "  │                                                 │"
echo "  │  2. Unzip it there                              │"
echo "  │     (cPanel: File Manager → right-click → Extract)"
echo "  │     Result:                                     │"
echo "  │       public_html/                              │"
echo "  │       ├── index.php   (existing site, untouched)│"
echo "  │       ├── app/        (React frontend)          │"
echo "  │       ├── php-api/    (PHP backend)             │"
echo "  │       ├── database/   (SQL schema)              │"
echo "  │       └── install.php (installer)               │"
echo "  │                                                 │"
echo "  │  3. Edit php-api/config.php                     │"
echo "  │     Set DB_HOST, DB_NAME, DB_USER, DB_PASS      │"
echo "  │                                                 │"
echo "  │  4. Visit: https://yoursite.com/install.php     │"
echo "  │     Click '開始安裝' — creates DB + admin       │"
echo "  │                                                 │"
echo "  │  5. Visit: https://yoursite.com/app/            │"
echo "  │     Login: admin / admin123                     │"
echo "  │                                                 │"
echo "  │  6. DELETE install.php and database/ folder     │"
echo "  │                                                 │"
echo "  └─────────────────────────────────────────────────┘"
echo ""
