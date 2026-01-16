<?php
// api/test_full.php
// Este archivo NO depende de db.php, tiene todo incluido para aislar el error.

header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

$response = [];

try {
    // 1. Definir credenciales directamente
    $host = 'localhost';
    $db_name = 'selcomc1_iot';
    $user = 'selcomc1_sel-iot';
    $pass = 'Dan15223.';

    $response['config'] = [
        'host' => $host,
        'db' => $db_name,
        'user' => $user,
        // No mostramos la pass por seguridad en el log
    ];

    // 2. Intentar conexion
    $dsn = "mysql:host=$host;dbname=$db_name;charset=utf8mb4";
    $response['dsn'] = $dsn;

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];

    $pdo = new PDO($dsn, $user, $pass, $options);

    $response['status'] = 'CONECTADO EXITOSAMENTE';

    // 3. Prueba rápida de consulta
    $stmt = $pdo->query("SELECT VERSION() as version");
    $response['mysql_version'] = $stmt->fetchColumn();

} catch (PDOException $e) {
    http_response_code(500);
    $response['error'] = 'Error de Base de Datos: ' . $e->getMessage();
} catch (Exception $e) {
    http_response_code(500);
    $response['error'] = 'Error General: ' . $e->getMessage();
}

echo json_encode($response, JSON_PRETTY_PRINT);
?>