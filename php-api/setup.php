<?php
/**
 * First-run setup script.
 * Creates the default admin account with a proper password hash.
 * Run once after importing schema.sql, then delete this file.
 *
 * Usage: php setup.php
 * Or visit in browser: http://yourserver/php-api/setup.php
 */

require_once __DIR__ . '/config.php';

$adminPassword = 'admin123'; // Change this!
$hash = password_hash($adminPassword, PASSWORD_DEFAULT);

// Check if default admin exists
$stmt = $pdo->prepare('SELECT uid FROM users WHERE uid = ?');
$stmt->execute(['admin-default-001']);

if ($stmt->fetch()) {
    // Update the placeholder hash
    $stmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE uid = ?');
    $stmt->execute([$hash, 'admin-default-001']);
    echo "Admin account updated. Username: admin, Password: $adminPassword\n";
} else {
    // Create admin
    $stmt = $pdo->prepare('INSERT INTO users (uid, username, password_hash, name, email, role) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute(['admin-default-001', 'admin', $hash, 'Administrator', 'admin@church.local', 'admin']);
    echo "Admin account created. Username: admin, Password: $adminPassword\n";
}

echo "\n** IMPORTANT: Change the admin password immediately and delete this file! **\n";
