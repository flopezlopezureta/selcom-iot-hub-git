<?php
require_once 'db.php';
$db = getDB();
$stmt = $db->query("DESCRIBE devices");
echo "Table Structure:\n";
print_r($stmt->fetchAll());

echo "\n\nSample Data (Last device updated):\n";
$stmt = $db->query("SELECT id, name, actuators, actuator_states, thresholds FROM devices ORDER BY updated_at DESC LIMIT 1");
print_r($stmt->fetchAll());
?>