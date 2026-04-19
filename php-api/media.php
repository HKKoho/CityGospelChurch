<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $category = $_GET['category'] ?? null;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 1000;

    if ($category) {
        $stmt = $pdo->prepare('SELECT * FROM media WHERE category = ? ORDER BY created_at DESC LIMIT ?');
        $stmt->execute([$category, $limit]);
    } else {
        $stmt = $pdo->prepare('SELECT * FROM media ORDER BY created_at DESC LIMIT ?');
        $stmt->execute([$limit]);
    }
    json_response($stmt->fetchAll());
}

if ($method === 'POST') {
    require_admin();
    $body = get_body();
    $id = uuid();
    $stmt = $pdo->prepare(
        'INSERT INTO media (id, title, type, url, description, category, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())'
    );
    $stmt->execute([
        $id,
        $body['title'] ?? '',
        $body['type'] ?? 'video',
        $body['url'] ?? '',
        $body['description'] ?? '',
        $body['category'] ?? '',
    ]);
    json_response(['id' => $id], 201);
}

if ($method === 'DELETE') {
    require_admin();
    $id = $_GET['id'] ?? '';
    if (!$id) json_response(['error' => 'ID required'], 400);
    $stmt = $pdo->prepare('DELETE FROM media WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['ok' => true]);
}

json_response(['error' => 'Method not allowed'], 405);
