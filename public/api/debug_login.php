<?php
// api/debug_login.php
require_once 'db.php';
header('Content-Type: text/plain');

echo "--- DEBUG LOGUEO ---\n";

try {
    $db = getDB();

    // 1. Buscar usuario admin
    echo "1. Buscando usuario 'admin'...\n";
    $stmt = $db->prepare("SELECT * FROM users WHERE username = 'admin'");
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        die("ERROR: El usuario 'admin' NO existe en la base de datos.\n");
    }

    echo "   [OK] Usuario encontrado (ID: " . $user['id'] . ")\n";
    echo "   [INFO] Hash en DB: " . $user['password_hash'] . "\n";
    echo "   [INFO] Active: " . $user['active'] . "\n";

    // 2. Probar contraseña 'admindemo'
    $pass_to_test = 'admindemo';
    echo "\n2. Probando verificar contraseña '$pass_to_test'...\n";

    $is_valid = password_verify($pass_to_test, $user['password_hash']);

    if ($is_valid) {
        echo "   [EXITO] password_verify devolvió TRUE. La contraseña es correcta.\n";
        echo "   -> Si el login falla, el problema es cómo llegan los datos desde el navegador.\n";
    } else {
        echo "   [FALLO] password_verify devolvió FALSE.\n";
        echo "   -> El hash en la base de datos NO coincide con 'admindemo'.\n";
        echo "   -> Recomiendo ejecutar reset_password.php de nuevo.\n";
    }

} catch (Exception $e) {
    echo "ERROR EXCEPCION: " . $e->getMessage();
}
?>