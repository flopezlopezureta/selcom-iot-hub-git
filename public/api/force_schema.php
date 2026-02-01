<?php
header('Content-Type: text/plain');
require_once 'db.php';
try {
    $db = getDB();
    echo "Running Schema Fix...\n";

    $cols = [
        'model_variant' => 'VARCHAR(50) DEFAULT "ESP32-WROOM"',
        'actuators' => 'JSON',
        'actuator_states' => 'JSON',
        'thresholds' => 'JSON'
    ];
    foreach ($cols as $col => $type) {
        try {
            $db->exec("ALTER TABLE devices ADD COLUMN $col $type");
            echo "Added $col ($type)\n";
        } catch (Exception $e) {
            echo "Failed to add $col: " . $e->getMessage() . "\n";
        }
    }

    $stmt = $db->query("DESCRIBE devices");
    echo "\nNew Structure:\n";
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        echo "{$row['Field']}\n";
    }
} catch (Exception $e) {
    echo "Fatal Error: " . $e->getMessage();
}
?>