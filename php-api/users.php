<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    require_admin();
    $stmt = $pdo->query('SELECT uid, username, name, email, role, last_four_digits, phone, created_at FROM users ORDER BY created_at DESC');
    json_response($stmt->fetchAll());
}

if ($method === 'PATCH') {
    require_admin();
    $uid = $_GET['uid'] ?? '';
    if (!$uid) json_response(['error' => 'UID required'], 400);

    $body = get_body();
    if (isset($body['role'])) {
        if (!in_array($body['role'], ['admin', 'congregation', 'public'])) {
            json_response(['error' => 'Invalid role.'], 400);
        }
        $stmt = $pdo->prepare('UPDATE users SET role = ? WHERE uid = ?');
        $stmt->execute([$body['role'], $uid]);
    }
    json_response(['ok' => true]);
}

if ($method === 'DELETE') {
    require_admin();
    $uid = $_GET['uid'] ?? '';
    if (!$uid) json_response(['error' => 'UID required'], 400);
    $stmt = $pdo->prepare('DELETE FROM users WHERE uid = ?');
    $stmt->execute([$uid]);
    json_response(['ok' => true]);
}

json_response(['error' => 'Method not allowed'], 405);
