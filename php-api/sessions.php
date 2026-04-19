<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Active session — no auth required (kiosk needs this)
    $stmt = $pdo->prepare('SELECT * FROM sessions WHERE is_active = 1 LIMIT 1');
    $stmt->execute();
    $session = $stmt->fetch();
    json_response($session ? [$session] : []);
}

if ($method === 'POST') {
    require_admin();
    $body = get_body();

    // Deactivate all existing sessions
    $pdo->exec('UPDATE sessions SET is_active = 0 WHERE is_active = 1');

    $id = uuid();
    $stmt = $pdo->prepare('INSERT INTO sessions (id, name, date, is_active, created_at) VALUES (?, ?, CURDATE(), 1, NOW())');
    $stmt->execute([$id, $body['name'] ?? 'Session']);
    json_response(['id' => $id], 201);
}

if ($method === 'PATCH') {
    require_admin();
    $id = $_GET['id'] ?? '';
    if (!$id) json_response(['error' => 'ID required'], 400);

    $body = get_body();
    if (isset($body['is_active'])) {
        $stmt = $pdo->prepare('UPDATE sessions SET is_active = ? WHERE id = ?');
        $stmt->execute([$body['is_active'] ? 1 : 0, $id]);
    }
    json_response(['ok' => true]);
}

json_response(['error' => 'Method not allowed'], 405);
