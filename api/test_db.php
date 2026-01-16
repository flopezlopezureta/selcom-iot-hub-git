<?php
// api/test_db.php
require_once 'db.php';

header('Content-Type: application/json');

// Reportar todos los errores
error_reporting(E_ALL);
// ini_set('display_errors', 1);

$response = [
    'success' => false,
    'steps' => []
];

try {
    // 1. Probar conexión
    $response['steps']['connection'] = 'Intentando conectar...';
    $db = getDB();
    $response['steps']['connection'] = 'OK';

    // 2. Verificar tablas
    $response['steps']['tables'] = 'Verificando tablas...';
    $tables = $db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $response['steps']['tables_found'] = $tables;

    // 3. Verificar usuario admin
    $response['steps']['admin_check'] = 'Buscando usuario admin...';
    $stmt = $db->prepare("SELECT id, username, role, active, password_hash FROM users WHERE username = 'admin'");
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        $response['steps']['admin_check'] = 'Usuario encontrado';
        $response['user_data'] = [
            'username' => $user['username'],
            'role' => $user['role'],
            'active' => $user['active'],
            'hash_len' => strlen($user['password_hash'])
        ];
    } else {
        $response['steps']['admin_check'] = 'Usuario admin NO encontrado';
    }

    $response['success'] = true;

} catch (Exception $e) {
    http_response_code(500);
    $response['error'] = $e->getMessage();
    $response['trace'] = $e->getTraceAsString();
}

echo json_encode($response, JSON_PRETTY_PRINT);
?>