<?php
// api/test_debug.php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<html><body style='font-family: monospace; background: #222; color: #eee; padding: 20px;'>";
echo "<h1>Selcom Debug Tool</h1>";

try {
    // Credenciales
    $server = 'localhost';
    $user = 'selcomc1_sel-iot';
    $pass = 'Dan15223.';
    $db = 'selcomc1_iot';

    echo "<div>Intentando conectar a: <strong>$server</strong></div>";
    echo "<div>Usuario: <strong>$user</strong></div>";
    echo "<div>Base de Datos: <strong>$db</strong></div>";
    echo "<hr>";

    // Prueba 1: MySQLi (Más robusto para diagnósticos simples)
    echo "<h3>Prueba 1: MySQLi</h3>";
    $mysqli = new mysqli($server, $user, $pass, $db);

    if ($mysqli->connect_error) {
        throw new Exception("ERROR MySQLi: " . $mysqli->connect_error);
    }
    echo "<div style='color: #4ade80'>[OK] MySQLi Conectado. Versión Server: " . $mysqli->server_info . "</div>";
    $mysqli->close();

    // Prueba 2: PDO (El que usa la app)
    echo "<h3>Prueba 2: PDO</h3>";
    $dsn = "mysql:host=$server;dbname=$db;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 5
    ]);

    echo "<div style='color: #4ade80'>[OK] PDO Conectado correctamente.</div>";

} catch (Throwable $t) {
    echo "<div style='color: #f87171; border: 1px solid #f87171; padding: 15px; margin-top: 10px;'>";
    echo "<h2>ERROR FATAL DETECTADO</h2>";
    echo "<strong>Tipo:</strong> " . get_class($t) . "<br>";
    echo "<strong>Mensaje:</strong> " . $t->getMessage() . "<br>";
    echo "<strong>Archivo:</strong> " . $t->getFile() . " (Línea " . $t->getLine() . ")<br>";
    echo "</div>";
}
echo "</body></html>";
?>