<?php
header("Access-Control-Allow-Origin: *");
// Retry deployment trigger V3
header("Content-Type: application/json; charset=UTF-8");

require_once 'db.php';

try {
    // 0. Connect using getDB() from db.php (it doesn't have a Database class)
    $db = getDB();

    // 1. Add columns to 'devices'
    echo "<h2>Updating 'devices' table...</h2>";

    $alterQueries = [
        "ADD COLUMN is_maintenance TINYINT(1) DEFAULT 0",
        "ADD COLUMN calibration_offset FLOAT DEFAULT 0.0",
        "ADD COLUMN heartbeat_interval INT DEFAULT 60",
        "ADD COLUMN firmware_version VARCHAR(50) DEFAULT 'v1.0.0'",
        "ADD COLUMN notification_preferences JSON DEFAULT NULL"
    ];

    foreach ($alterQueries as $column) {
        try {
            // Check if column exists first could be cleaner, but straight ALTER IGNORE is tricky in PDO.
            // We'll wrap in try-catch to ignore "Duplicate column" errors.
            $sql = "ALTER TABLE devices " . $column;
            $db->exec($sql);
            echo "Added column: $column <br>";
        } catch (PDOException $e) {
            echo "Skipped (maybe exists): $column - " . $e->getMessage() . "<br>";
        }
    }

    // 2. Create 'device_logs' table
    echo "<h2>Creating 'device_logs' table...</h2>";
    $createTable = "CREATE TABLE IF NOT EXISTS device_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_id INT NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        message TEXT,
        severity VARCHAR(20) DEFAULT 'INFO',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $db->exec($createTable);
    echo "Table 'device_logs' check/creation complete.<br>";

    // 3. Create 'settings_history' or generic audit if needed? 
    // For now device_logs covers device specific stuff.

    echo "<h1>Migration V2 Success!</h1>";

} catch (Exception $e) {
    http_response_code(500);
    echo "<h1>Error: " . $e->getMessage() . "</h1>";
}
?>