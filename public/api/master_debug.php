<?php
// api/master_debug.php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

require_once 'db.php';

$results = [
    'env_status' => [
        'DB_HOST' => defined('DB_HOST') ? DB_HOST : 'NOT DEFINED',
        'DB_NAME' => defined('DB_NAME') ? DB_NAME : 'NOT DEFINED',
        'DB_USER' => defined('DB_USER') ? DB_USER : 'NOT DEFINED',
        'ENVIRONMENT' => defined('ENVIRONMENT') ? ENVIRONMENT : 'NOT DEFINED',
        'ALLOWED_ORIGIN' => defined('ALLOWED_ORIGIN') ? ALLOWED_ORIGIN : 'NOT DEFINED',
    ],
    'db_connection' => [
        'success' => false,
        'error' => null
    ],
    'user_check' => [
        'admin_exists' => false,
        'total_users' => 0,
        'users_list' => []
    ],
    'request_headers' => getallheaders()
];

try {
    $db = getDB();
    $results['db_connection']['success'] = true;

    // Check users
    $stmt = $db->query("SELECT id, username, role, active FROM users");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $results['user_check']['total_users'] = count($users);
    $results['user_check']['users_list'] = $users;

    foreach ($users as $u) {
        if ($u['username'] === 'admin') {
            $results['user_check']['admin_exists'] = true;
        }
    }

} catch (Exception $e) {
    $results['db_connection']['error'] = $e->getMessage();
}

echo json_encode($results, JSON_PRETTY_PRINT);
?>