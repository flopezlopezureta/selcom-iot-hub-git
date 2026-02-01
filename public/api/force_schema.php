<?php
header('Content-Type: text/plain');
require_once 'db.php';
try {
    $db = getDB();
    echo "Running Schema Fix...\n";

    $cols = ['actuators', 'actuator_states', 'thresholds'];
    foreach ($cols as $col) {
        try {
            $db->exec("ALTER TABLE devices ADD COLUMN $col JSON");
            echo "Added $col\n";
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