<?php
/**
 * Ecclesia Manager — On-Premise API Configuration
 *
 * Edit the database credentials below to match your MySQL setup.
 * Place the GEMINI_API_KEY here if you want AI guidance features.
 */

// Database
define('DB_HOST', 'localhost');
define('DB_NAME', 'ecclesia');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Gemini AI (optional — leave empty to disable)
define('GEMINI_API_KEY', '');

// Session
define('SESSION_LIFETIME', 86400); // 24 hours

// CORS — set to your app's origin in production
define('CORS_ORIGIN', '*');

// ============================================================
// Internal — do not edit below
// ============================================================

// Start session
session_set_cookie_params([
    'lifetime' => SESSION_LIFETIME,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

// PDO connection
try {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed.']);
    exit;
}

// Helpers
function json_response($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    if (CORS_ORIGIN) {
        header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
    }
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function require_auth(): array {
    if (empty($_SESSION['user'])) {
        json_response(['error' => 'Unauthorized'], 401);
    }
    return $_SESSION['user'];
}

function require_admin(): array {
    $user = require_auth();
    if ($user['role'] !== 'admin') {
        json_response(['error' => 'Forbidden'], 403);
    }
    return $user;
}

function get_body(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

function uuid(): string {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    json_response(null, 204);
}
