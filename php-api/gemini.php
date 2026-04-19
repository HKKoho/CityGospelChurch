<?php
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Method not allowed'], 405);
}

if (!GEMINI_API_KEY) {
    json_response(['error' => 'Gemini API is not configured.'], 503);
}

$payload = json_encode([
    'contents' => [['parts' => [['text' => 'Provide 3 contemporary tips for improving church community engagement using digital platforms. Focus on room booking efficiency and roll call accuracy.']]]],
    'systemInstruction' => ['parts' => [['text' => 'You are a digital transformation consultant for community organizations. Provide concise, actionable advice in markdown format.']]],
]);

$ch = curl_init('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . GEMINI_API_KEY);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    json_response(['error' => 'Failed to generate guidance.'], 500);
}

$data = json_decode($response, true);
$text = $data['candidates'][0]['content']['parts'][0]['text'] ?? 'No guidance generated.';
json_response(['text' => $text]);
