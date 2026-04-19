<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $last_four = $_GET['last_four_digits'] ?? null;

    if ($last_four) {
        $stmt = $pdo->prepare('SELECT * FROM worksheet WHERE last_four_digits = ? LIMIT 1');
        $stmt->execute([$last_four]);
        $result = $stmt->fetch();
        json_response($result ? [$result] : []);
    } else {
        $stmt = $pdo->query('SELECT * FROM worksheet ORDER BY name');
        json_response($stmt->fetchAll());
    }
}

if ($method === 'POST') {
    require_admin();
    $body = get_body();

    // Support batch insert (array of entries)
    $entries = isset($body[0]) ? $body : [$body];
    $ids = [];

    $stmt = $pdo->prepare('INSERT INTO worksheet (id, last_four_digits, name, department) VALUES (?, ?, ?, ?)');
    foreach ($entries as $entry) {
        $id = uuid();
        $stmt->execute([
            $id,
            $entry['last_four_digits'] ?? '',
            $entry['name'] ?? '',
            $entry['department'] ?? null,
        ]);
        $ids[] = $id;
    }
    json_response(['ids' => $ids, 'count' => count($ids)], 201);
}

if ($method === 'DELETE') {
    require_admin();
    $id = $_GET['id'] ?? '';
    if (!$id) json_response(['error' => 'ID required'], 400);
    $stmt = $pdo->prepare('DELETE FROM worksheet WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['ok' => true]);
}

json_response(['error' => 'Method not allowed'], 405);
