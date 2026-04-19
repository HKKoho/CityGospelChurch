<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $user = require_auth();
    $session_id = $_GET['session_id'] ?? null;
    $user_id = $_GET['user_id'] ?? null;

    if ($user['role'] === 'admin' && $session_id) {
        $stmt = $pdo->prepare('SELECT * FROM attendance WHERE session_id = ? ORDER BY created_at DESC');
        $stmt->execute([$session_id]);
    } elseif ($user['role'] === 'admin') {
        $stmt = $pdo->query('SELECT * FROM attendance ORDER BY created_at DESC');
    } else {
        $stmt = $pdo->prepare('SELECT * FROM attendance WHERE user_id = ? ORDER BY created_at DESC');
        $stmt->execute([$user['uid']]);
    }
    json_response($stmt->fetchAll());
}

if ($method === 'POST') {
    $body = get_body();

    // Kiosk check-in (no auth required — uses session_id + last_four_digits)
    if (isset($body['kiosk_checkin'])) {
        $session_id = $body['session_id'] ?? '';
        $last_four = $body['last_four_digits'] ?? '';
        $name = $body['name'] ?? '';

        if (!$session_id || !$last_four || !$name) {
            json_response(['error' => 'Missing fields.'], 400);
        }

        // Check duplicate
        $stmt = $pdo->prepare('SELECT id FROM attendance WHERE session_id = ? AND last_four_digits = ? LIMIT 1');
        $stmt->execute([$session_id, $last_four]);
        if ($stmt->fetch()) {
            json_response(['error' => 'Already checked in.'], 409);
        }

        $id = uuid();
        $stmt = $pdo->prepare(
            'INSERT INTO attendance (id, date, user_id, user_name, last_four_digits, status, session_id, created_at)
             VALUES (?, CURDATE(), ?, ?, ?, ?, ?, NOW())'
        );
        $stmt->execute([$id, 'kiosk', $name, $last_four, 'present', $session_id]);
        json_response(['id' => $id], 201);
    }

    // Regular check-in (auth required)
    $user = require_auth();
    $id = uuid();
    $stmt = $pdo->prepare(
        'INSERT INTO attendance (id, date, user_id, user_name, last_four_digits, status, session_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())'
    );
    $stmt->execute([
        $id,
        $body['date'] ?? date('Y-m-d'),
        $user['uid'],
        $body['user_name'] ?? $user['name'],
        $body['last_four_digits'] ?? '',
        $body['status'] ?? 'present',
        $body['session_id'] ?? null,
    ]);
    json_response(['id' => $id], 201);
}

json_response(['error' => 'Method not allowed'], 405);
