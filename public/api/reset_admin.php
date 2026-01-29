<?php
// api/reset_admin.php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');
require_once 'db.php';

echo "--- RESET ADMIN PASSWORD ---\n";

try {
    $db = getDB();
    $newPass = 'admindemo';

    // 1. Generar hash fresco
    $newHash = password_hash($newPass, PASSWORD_DEFAULT);
    echo "Generando nuevo hash local: $newHash\n";

    // 2. Actualizar directo en BD
    $stmt = $db->prepare("UPDATE users SET password_hash = ? WHERE username = 'admin'");
    $stmt->execute([$newHash]);
    echo "Update ejecutado.\n";

    // 3. Revisar lo que quedó
    $check = $db->query("SELECT * FROM users WHERE username = 'admin'")->fetch(PDO::FETCH_ASSOC);
    echo "Hash recuperado de BD: " . $check['password_hash'] . "\n";

    // 4. Verificar
    if (password_verify($newPass, $check['password_hash'])) {
        echo "¡VERIFICACIÓN CORRECTA! La contraseña ahora es 'admindemo'\n";
        echo "Por favor intenta entrar al Login ahora.\n";
    } else {
        echo "¡FALLO CRITICO! Algo modifica el hash al guardarse o leerse.\n";
        echo "Largo del hash guardado: " . strlen($check['password_hash']) . "\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
?>