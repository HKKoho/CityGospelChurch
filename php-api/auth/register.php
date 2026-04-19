<?php
require_once __DIR__ . '/../config.php';

// Only admins can create new user accounts
$admin = require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Method not allowed'], 405);
}

$body = get_body();
$username = trim($body['username'] ?? '');
$password = $body['password'] ?? '';
$name = trim($body['name'] ?? '');
$role = $body['role'] ?? 'public';

if (!$username || !$password || !$name) {
    json_response(['error' => 'Username, password, and name are required.'], 400);
}

if (!in_array($role, ['admin', 'congregation', 'public'])) {
    json_response(['error' => 'Invalid role.'], 400);
}

// Check username uniqueness
$stmt = $pdo->prepare('SELECT uid FROM users WHERE username = ? LIMIT 1');
$stmt->execute([$username]);
if ($stmt->fetch()) {
    json_response(['error' => 'Username already exists.'], 409);
}

$uid = uuid();
$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare('INSERT INTO users (uid, username, password_hash, name, email, role) VALUES (?, ?, ?, ?, ?, ?)');
$stmt->execute([$uid, $username, $hash, $name, $body['email'] ?? '', $role]);

json_response(['uid' => $uid, 'username' => $username, 'name' => $name, 'role' => $role], 201);
