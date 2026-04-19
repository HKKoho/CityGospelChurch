<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$user = require_auth();

if ($method === 'GET') {
    if ($user['role'] === 'admin') {
        $stmt = $pdo->query('SELECT * FROM bookings ORDER BY created_at DESC');
    } else {
        $stmt = $pdo->prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC');
        $stmt->execute([$user['uid']]);
    }
    json_response($stmt->fetchAll());
}

if ($method === 'POST') {
    $body = get_body();
    $id = uuid();
    $stmt = $pdo->prepare(
        'INSERT INTO bookings (id, room_id, user_id, user_name, room_name, start_time, end_time, status, purpose, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
    );
    $stmt->execute([
        $id,
        $body['room_id'],
        $user['uid'],
        $body['user_name'] ?? $user['name'],
        $body['room_name'] ?? '',
        $body['start_time'],
        $body['end_time'],
        'pending',
        $body['purpose'] ?? '',
    ]);
    json_response(['id' => $id], 201);
}

if ($method === 'PATCH') {
    $id = $_GET['id'] ?? '';
    if (!$id) json_response(['error' => 'ID required'], 400);
    $body = get_body();

    // Only admins can change booking status
    if (isset($body['status'])) {
        require_admin();
        $stmt = $pdo->prepare('UPDATE bookings SET status = ? WHERE id = ?');
        $stmt->execute([$body['status'], $id]);
    }
    json_response(['ok' => true]);
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if (!$id) json_response(['error' => 'ID required'], 400);

    if ($user['role'] === 'admin') {
        $stmt = $pdo->prepare('DELETE FROM bookings WHERE id = ?');
        $stmt->execute([$id]);
    } else {
        $stmt = $pdo->prepare('DELETE FROM bookings WHERE id = ? AND user_id = ? AND status = ?');
        $stmt->execute([$id, $user['uid'], 'pending']);
    }
    json_response(['ok' => true]);
}

json_response(['error' => 'Method not allowed'], 405);
