<?php
/**
 * Selcom IoT Hub - Deployment Cleanup Script
 * Este script elimina los archivos de código fuente que se subieron por error a public_html
 */

$filesToDelete = [
    'index.tsx',
    'index.css',
    'types.ts',
    'package.json',
    'package-lock.json',
    'tailwind.config.js',
    'postcss.config.js',
    'vite.config.ts',
    'tsconfig.json',
    'metadata.json',
    '.env',
    '.env.local',
    'App.tsx'
];

// Comprobar si el index.html es el de desarrollo (contiene index.tsx)
if (file_exists('index.html')) {
    $content = file_get_contents('index.html');
    if (strpos($content, 'index.tsx') !== false) {
        $filesToDelete[] = 'index.html';
    }
}

$foldersToDelete = [
    'components',
    'services',
    'node_modules',
    '.git'
];

echo "<h2>Limpieza de Selcom IoT Hub</h2>";

foreach ($filesToDelete as $file) {
    if (file_exists($file)) {
        if (unlink($file)) {
            echo "✅ Archivo eliminado: $file <br>";
        } else {
            echo "❌ Error al eliminar archivo: $file <br>";
        }
    }
}

foreach ($foldersToDelete as $folder) {
    if (is_dir($folder)) {
        if (deleteDirectory($folder)) {
            echo "✅ Carpeta eliminada: $folder <br>";
        } else {
            echo "❌ Error al eliminar carpeta: $folder <br>";
        }
    }
}

function deleteDirectory($dir)
{
    if (!file_exists($dir))
        return true;
    if (!is_dir($dir))
        return unlink($dir);
    foreach (scandir($dir) as $item) {
        if ($item == '.' || $item == '..')
            continue;
        if (!deleteDirectory($dir . DIRECTORY_SEPARATOR . $item))
            return false;
    }
    return rmdir($dir);
}

echo "<br><b>Limpieza completada. Por favor borra este archivo (cleanup.php) por seguridad.</b>";
?>