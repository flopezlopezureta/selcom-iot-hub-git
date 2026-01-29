<?php
require_once 'db.php';

try {
    $db = getDB();
    echo "Conectado a la base de datos.\n";

    // 1. Agregar columnas a la tabla 'devices'
    echo "Actualizando tabla 'devices'...\n";

    $cols = $db->query("SHOW COLUMNS FROM devices")->fetchAll(PDO::FETCH_COLUMN);

    if (!in_array('maintenance_mode', $cols)) {
        $db->exec("ALTER TABLE devices ADD COLUMN maintenance_mode BOOLEAN DEFAULT FALSE");
        echo "- Columna 'maintenance_mode' agregada.\n";
    }

    if (!in_array('calibration_offset', $cols)) {
        $db->exec("ALTER TABLE devices ADD COLUMN calibration_offset DECIMAL(10, 4) DEFAULT 0.0");
        echo "- Columna 'calibration_offset' agregada.\n";
    }

    if (!in_array('heartbeat_interval', $cols)) {
        $db->exec("ALTER TABLE devices ADD COLUMN heartbeat_interval INT DEFAULT 1800"); // Default 30 min
        echo "- Columna 'heartbeat_interval' agregada.\n";
    }

    if (!in_array('notification_settings', $cols)) {
        $db->exec("ALTER TABLE devices ADD COLUMN notification_settings JSON");
        echo "- Columna 'notification_settings' agregada.\n";
    }

    // 2. Crear tabla 'audit_logs'
    echo "Creando tabla 'audit_logs'...\n";
    $sql = "CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        device_id VARCHAR(50),
        event_type VARCHAR(50), -- 'CONFIG_CHANGE', 'ALARM', 'MAINTENANCE', 'SYSTEM'
        description TEXT,
        user_id VARCHAR(50), -- Opcional, si tenemos contexto de usuario
        metadata JSON,       -- Para guardar valores anteriores/nuevos
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;";

    $db->exec($sql);
    echo "- Tabla 'audit_logs' verificada/creada.\n";

    echo "\nActualización de esquema completada con éxito.";

} catch (PDOException $e) {
    die("Error en la base de datos: " . $e->getMessage());
}
?>