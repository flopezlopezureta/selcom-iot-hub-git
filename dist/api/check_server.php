<?php
// api/check_server.php - Script de diagnóstico
require_once 'db.php';

header('Content-Type: application/json');

$report = [
    'php_version' => PHP_VERSION,
    'environment' => ENVIRONMENT,
    'allowed_origin' => ALLOWED_ORIGIN,
    'drivers' => PDO::getAvailableDrivers(),
    'database' => [
        'connected' => false,
        'error' => null,
        'tables' => []
    ]
];

try {
    $db = getDB();
    $report['database']['connected'] = true;

    $stmt = $db->query("SHOW TABLES");
    $report['database']['tables'] = $stmt->fetchAll(PDO::FETCH_COLUMN);

} catch (Throwable $e) {
    $report['database']['error'] = $e->getMessage();
}

echo json_encode($report, JSON_PRETTY_PRINT);
?>