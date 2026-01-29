<?php
// api/test_requirements.php
header('Content-Type: application/json');

$response = [
    'php_version' => phpversion(),
    'extensions' => [
        'pdo' => extension_loaded('pdo'),
        'pdo_mysql' => extension_loaded('pdo_mysql'),
        'mysqli' => extension_loaded('mysqli')
    ],
    'pdo_drivers' => extension_loaded('pdo') ? PDO::getAvailableDrivers() : [],
    'all_extensions' => get_loaded_extensions()
];

echo json_encode($response, JSON_PRETTY_PRINT);
?>