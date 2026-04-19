<?php
require_once __DIR__ . '/../config.php';

if (empty($_SESSION['user'])) {
    json_response(['user' => null]);
}

// Refresh profile from DB in case role changed
$stmt = $pdo->prepare('SELECT uid, username, name, email, role, last_four_digits, phone, created_at FROM users WHERE uid = ? LIMIT 1');
$stmt->execute([$_SESSION['user']['uid']]);
$user = $stmt->fetch();

if (!$user) {
    session_destroy();
    json_response(['user' => null]);
}

$_SESSION['user'] = $user;
json_response(['user' => $user]);
