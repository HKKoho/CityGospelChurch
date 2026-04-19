#!/bin/bash
# ============================================================
# Ecclesia Manager — On-Premise Deployment Script
# ============================================================
#
# This script builds the React app and prepares everything
# for FTP upload to a PHP + MySQL shared hosting server.
#
# Prerequisites (on YOUR machine, not the server):
#   - Node.js 18+
#   - npm
#
# Prerequisites (on the SERVER):
#   - PHP 7.4+ with PDO_MySQL extension
#   - MySQL 5.7+ or MariaDB 10.3+
#   - Apache with mod_rewrite enabled
#   - phpMyAdmin or MySQL CLI access
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# After the script finishes, upload the `deploy/` folder
# contents to your server via FTP.
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$SCRIPT_DIR/deploy"

echo ""
echo "=========================================="
echo "  Ecclesia Manager — Build & Deploy"
echo "=========================================="
echo ""

# ----------------------------------------------------------
# Step 1: Clean previous deploy
# ----------------------------------------------------------
echo "[1/5] Cleaning previous deploy..."
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# ----------------------------------------------------------
# Step 2: Install dependencies & build React app
# ----------------------------------------------------------
echo "[2/5] Installing dependencies..."
cd "$SCRIPT_DIR"
npm ci --silent

echo "[3/5] Building production bundle..."
npm run build

# ----------------------------------------------------------
# Step 3: Assemble deploy folder
# ----------------------------------------------------------
echo "[4/5] Assembling deploy folder..."

# React SPA → deploy/app/
cp -r "$SCRIPT_DIR/dist/." "$DEPLOY_DIR/app/"

# PHP API → deploy/php-api/
cp -r "$SCRIPT_DIR/php-api" "$DEPLOY_DIR/php-api"

# Database schema → deploy/database/
cp -r "$SCRIPT_DIR/database" "$DEPLOY_DIR/database"

# .htaccess is already in dist/ via public/.htaccess
# Verify it's there
if [ ! -f "$DEPLOY_DIR/app/.htaccess" ]; then
  echo "  Adding .htaccess for SPA routing..."
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
# Step 4: Print instructions
# ----------------------------------------------------------
echo "[5/5] Done!"
echo ""
echo "=========================================="
echo "  DEPLOY FOLDER READY: deploy/"
echo "=========================================="
echo ""
echo "  deploy/"
echo "  ├── app/                 ← React SPA (upload to /app/ on server)"
echo "  │   ├── index.html"
echo "  │   ├── assets/"
echo "  │   ├── .htaccess"
echo "  │   └── ..."
echo "  ├── php-api/             ← PHP backend (upload to /php-api/ on server)"
echo "  │   ├── config.php       ← EDIT THIS: DB credentials"
echo "  │   ├── auth/"
echo "  │   ├── rooms.php"
echo "  │   └── ..."
echo "  └── database/"
echo "      └── schema.sql       ← Import into MySQL"
echo ""
echo "=========================================="
echo "  NEXT STEPS (on the server)"
echo "=========================================="
echo ""
echo "  1. CREATE DATABASE"
echo "     - Open phpMyAdmin (or MySQL CLI)"
echo "     - Create database: ecclesia"
echo "     - Import: database/schema.sql"
echo ""
echo "  2. CONFIGURE PHP API"
echo "     - Edit php-api/config.php"
echo "     - Set DB_HOST, DB_NAME, DB_USER, DB_PASS"
echo "     - Optionally set GEMINI_API_KEY"
echo ""
echo "  3. FTP UPLOAD"
echo "     Upload to your server's web root (e.g. public_html/):"
echo ""
echo "     public_html/"
echo "     ├── index.php          ← your existing PHP site (untouched)"
echo "     ├── app/               ← upload deploy/app/ here"
echo "     │   ├── index.html"
echo "     │   ├── assets/"
echo "     │   └── .htaccess"
echo "     └── php-api/           ← upload deploy/php-api/ here"
echo "         ├── config.php"
echo "         ├── auth/"
echo "         └── ..."
echo ""
echo "  4. INITIALIZE ADMIN ACCOUNT"
echo "     Visit: https://yoursite.com/php-api/setup.php"
echo "     This creates the admin account (admin / admin123)."
echo "     *** DELETE setup.php after first run! ***"
echo ""
echo "  5. VERIFY"
echo "     Visit: https://yoursite.com/app/"
echo "     Login with: admin / admin123"
echo "     Change password immediately."
echo ""
echo "  6. CREATE USER ACCOUNTS"
echo "     In the admin panel, use the Users tab to create"
echo "     accounts for congregation members."
echo ""
echo "=========================================="
echo ""
