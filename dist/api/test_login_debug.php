<?php
// api/test_login_debug.php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

// Intentamos cargar db.php para usar la conexión real
if (file_exists('db.php')) {
    require_once 'db.php';
} else {
    die("No se encuentra db.php");
}

echo "--- Debug Login ---\n";

try {
    $db = getDB();
    echo "Conexión a BD obtenida.\n";

    $username = 'admin';
    $password = 'admindemo';

    echo "Buscando usuario: '$username'...\n";
    $stmt = $db->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo "ERROR: Usuario '$username' NO encontrado en la tabla 'users'.\n";
    } else {
        echo "OK: Usuario encontrado.\n";
        echo "ID: " . $user['id'] . "\n";
        echo "Status (active): " . $user['active'] . " (Debe ser 1)\n";
        echo "Hash en DB: " . $user['password_hash'] . "\n";

        echo "Verificando contraseña '$password'...\n";
        $isValid = password_verify($password, $user['password_hash']);

        if ($isValid) {
            echo "¡VERIFICACIÓN EXITOSA! La contraseña coincide.\n";
            if ($user['active'] != 1) {
                echo "PROBLEMA: La contraseña es correcta pero el usuario NO está activo.\n";
            }
        } else {
            echo "FALLÓ: La contraseña no coincide con el hash.\n";
            echo "Esto indica que el hash en 'schema.sql' no es compatible con este servidor PHP.\n";
            echo "Generando nuevo hash válido para '$password':\n";
            echo password_hash($password, PASSWORD_DEFAULT) . "\n";
        }
    }

} catch (Exception $e) {
    echo "Excepción: " . $e->getMessage();
}
?>