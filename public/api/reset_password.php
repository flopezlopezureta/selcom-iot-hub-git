<?php
// api/reset_password.php
require_once 'db.php';
header('Content-Type: text/plain');

try {
    $db = getDB();

    // 1. Password a establecer: "admindemo"
    $new_pass = 'admindemo';
    $hash = password_hash($new_pass, PASSWORD_DEFAULT);

    // 2. Verificar si existe el usuario 'admin'
    $stmt = $db->prepare("SELECT id FROM users WHERE username='admin'");
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        // Actualizar existente
        $update = $db->prepare("UPDATE users SET password_hash = ?, active = 1 WHERE username = 'admin'");
        $update->execute([$hash]);
        echo "ÉXITO: La contraseña del usuario 'admin' ha sido reseteada a: $new_pass";
    } else {
        // Crear si no existe
        $insert = $db->prepare("INSERT INTO users (id, username, password_hash, full_name, role, active) VALUES ('1', 'admin', ?, 'Administrador Global', 'admin', 1)");
        $insert->execute([$hash]);
        echo "ÉXITO: Se ha CREADO el usuario 'admin' con la contraseña: $new_pass";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
?>