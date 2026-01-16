<?php
// api/test_gemini.php
// Diagnostic script for Gemini API connection - TEST MODE

require_once 'db.php';

header('Content-Type: text/plain');

echo "Diagnostico de Conexion a Gemini AI (TEST MODE)\n";
echo "===================================\n";
echo "PHP Version: " . phpversion() . "\n";
echo "API Key Definida: " . (defined('GEMINI_API_KEY') ? "SI" : "NO") . "\n";

if (!function_exists('curl_init')) {
    echo "ERROR CRITICO: La extensión CURL de PHP no está activada en este servidor.\n";
    exit;
}

// MODELO SELECCIONADO (Validado por lista anterior)
$model = "gemini-2.0-flash-001";

echo "Intentando conectar con modelo: $model...\n";
$url = "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=" . GEMINI_API_KEY;

$payload = [
    'contents' => [
        [
            'parts' => [
                ['text' => 'Hello, reply with "OK" if you can hear me.']
            ]
        ]
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true); // Volvemos a POST para generar contenido
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_VERBOSE, true);
$verbose = fopen('php://temp', 'w+');
curl_setopt($ch, CURLOPT_STDERR, $verbose);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);

curl_close($ch);

echo "Codigo HTTP: $httpCode\n";

if ($response === false) {
    echo "Error CURL: $curlError\n";
    rewind($verbose);
    $verboseLog = stream_get_contents($verbose);
    echo "Log Verbose CURL:\n$verboseLog\n";
} else {
    // echo "Respuesta RAW:\n$response\n";
    $json = json_decode($response, true);

    // Verificación simple de éxito
    if (isset($json['candidates'][0]['content']['parts'][0]['text'])) {
        echo "\n>>> EXITO: La API respondio correctamente. <<<\n";
        echo "Respuesta de IA: " . $json['candidates'][0]['content']['parts'][0]['text'] . "\n";
    } else {
        echo "\nFALLO: La API respondio pero hay un error en el contenido.\n";
        echo "Respuesta Completa:\n$response\n";
    }
}
?>