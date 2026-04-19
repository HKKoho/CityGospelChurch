<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 1000;
    $stmt = $pdo->prepare('SELECT * FROM rooms LIMIT ?');
    $stmt->execute([$limit]);
    json_response($stmt->fetchAll());
}

if ($method === 'POST') {
    require_admin();
    $body = get_body();
    $id = uuid();
    $stmt = $pdo->prepare('INSERT INTO rooms (id, name, capacity, description, image_url) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([
        $id,
        $body['name'] ?? '',
        (int)($body['capacity'] ?? 0),
        $body['description'] ?? '',
        $body['image_url'] ?? '',
    ]);
    json_response(['id' => $id], 201);
}

if ($method === 'DELETE') {
    require_admin();
    $id = $_GET['id'] ?? '';
    if (!$id) json_response(['error' => 'ID required'], 400);
    $stmt = $pdo->prepare('DELETE FROM rooms WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['ok' => true]);
}

json_response(['error' => 'Method not allowed'], 405);
