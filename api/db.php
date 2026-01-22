<?php
// api/db.php - Configuración de base de datos y IA

// CARGAR VARIABLES DE ENTORNO
function loadEnv($path)
{
    if (!file_exists($path)) {
        die(json_encode(['error' => 'Archivo .env no encontrado. Por favor configura el archivo .env']));
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Ignorar comentarios
        if (strpos(trim($line), '#') === 0) {
            continue;
        }

        // Parsear línea
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);

            // Establecer variable de entorno
            if (!array_key_exists($key, $_ENV)) {
                $_ENV[$key] = $value;
                putenv("$key=$value");
            }
        }
    }
}

// Cargar .env
loadEnv(__DIR__ . '/.env');

// CONFIGURACIÓN DE BASE DE DATOS (desde .env)
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? '');
define('DB_USER', $_ENV['DB_USER'] ?? '');
define('DB_PASS', $_ENV['DB_PASS'] ?? '');

// CONFIGURACIÓN DE IA (Google Gemini) - desde .env
define('GEMINI_API_KEY', $_ENV['GEMINI_API_KEY'] ?? '');

// CONFIGURACIÓN DE ENTORNO
define('ENVIRONMENT', $_ENV['ENVIRONMENT'] ?? 'production');
define('ALLOWED_ORIGIN', $_ENV['ALLOWED_ORIGIN'] ?? 'https://selcom.cl');

// Configuración de errores según entorno
if (ENVIRONMENT === 'production') {
    // Producción: NO mostrar errores
    ini_set('display_errors', 0);
    ini_set('display_startup_errors', 0);
    error_reporting(0);
} else {
    // Desarrollo: Mostrar errores
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
}

function getDB()
{
    try {
        $db = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
        return $db;
    } catch (PDOException $e) {
        header('Content-Type: application/json', true, 500);

        // En producción, no exponer detalles del error
        if (ENVIRONMENT === 'production') {
            echo json_encode(['error' => 'Error de conexión a la base de datos']);
        } else {
            echo json_encode(['error' => 'Error de conexión a la base de datos: ' . $e->getMessage()]);
        }
        exit;
    }
}

// Configuración de CORS (restringido al dominio permitido)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Lista de orígenes permitidos
$allowedOrigins = [
    ALLOWED_ORIGIN,
    'http://localhost:5173',  // Desarrollo local
    'http://localhost:3000',  // Desarrollo local alternativo
];

if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // Si no está en la lista, usar el dominio principal
    header("Access-Control-Allow-Origin: " . ALLOWED_ORIGIN);
}

header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// Security Headers
header("Strict-Transport-Security: max-age=31536000; includeSubDomains");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: strict-origin-when-cross-origin");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}
?>