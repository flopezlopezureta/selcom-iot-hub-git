<?php
// api/iot_backend.php - Controlador API Principal con CRUD completo
require_once 'db.php';

$action = $_GET['action'] ?? '';
$db = getDB();

header('Content-Type: application/json');

// Función auxiliar para obtener datos POST
function getRequestData()
{
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

try {
    switch ($action) {
        case 'login':
            $data = getRequestData();

            $username = isset($data['username']) && is_string($data['username']) ? trim($data['username']) : '';
            $password = isset($data['password']) && is_string($data['password']) ? trim($data['password']) : '';

            // Si llegan como array por error, tomar el primer elemento (parche de seguridad)
            if (is_array($data['username'] ?? null))
                $username = (string) ($data['username'][0] ?? '');
            if (is_array($data['password'] ?? null))
                $password = (string) ($data['password'][0] ?? '');

            $stmt = $db->prepare("SELECT u.*, c.name as company_name 
                                 FROM users u 
                                 LEFT JOIN companies c ON u.company_id = c.id 
                                 WHERE u.username = ? AND u.active = 1");
            $stmt->execute([$username]);
            $user = $stmt->fetch();

            if ($user) {
                // Verificar hash
                $isValid = password_verify($password, $user['password_hash']);
            } else {
                $isValid = false;
            }

            if ($isValid) {
                unset($user['password_hash']);
                echo json_encode(['success' => true, 'user' => $user]);
            } else {
                http_response_code(401);
                echo json_encode(['error' => 'Credenciales inválidas']);
            }
            break;

        // --- DISPOSITIVOS ---
        case 'get_devices':
            $company_id = $_GET['company_id'] ?? null;
            $role = $_GET['role'] ?? 'client';

            if ($role === 'admin') {
                $stmt = $db->query("SELECT * FROM devices ORDER BY created_at DESC");
            } else {
                $stmt = $db->prepare("SELECT * FROM devices WHERE company_id = ? ORDER BY created_at DESC");
                $stmt->execute([$company_id]);
            }

            $devices = $stmt->fetchAll();
            foreach ($devices as &$d) {
                $d['hardwareConfig'] = json_decode($d['hardware_config'], true);
                unset($d['hardware_config']);
                $d['value'] = (float) $d['last_value'];
            }
            echo json_encode($devices);
            break;

        case 'get_measurements':
            $device_id = $_GET['device_id'] ?? '';
            $limit = $_GET['limit'] ?? 100;

            $stmt = $db->prepare("SELECT value, timestamp FROM measurements WHERE device_id = ? ORDER BY timestamp DESC LIMIT ?");
            $stmt->execute([$device_id, $limit]);
            $measurements = $stmt->fetchAll();

            // Revertir para que el gráfico vaya de antiguo a nuevo
            echo json_encode(array_reverse($measurements));
            break;

        case 'add_device':
            $data = getRequestData();
            $id = uniqid('dev_');
            $stmt = $db->prepare("INSERT INTO devices (id, name, mac_address, type, unit, last_value, company_id, hardware_config, model_variant) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $id,
                $data['name'],
                $data['mac_address'],
                $data['type'],
                $data['unit'],
                $data['value'] ?? 0,
                $data['company_id'],
                json_encode($data['hardwareConfig']),
                $data['model_variant'] ?? 'ESP32-WROOM'
            ]);
            echo json_encode(['success' => true, 'id' => $id]);
            break;

        case 'update_device':
            $data = getRequestData();
            $id = $_GET['id'] ?? '';
            $stmt = $db->prepare("UPDATE devices SET name=?, mac_address=?, type=?, unit=?, company_id=?, hardware_config=?, model_variant=? WHERE id=?");
            $stmt->execute([
                $data['name'],
                $data['mac_address'],
                $data['type'],
                $data['unit'],
                $data['company_id'],
                json_encode($data['hardwareConfig']),
                $data['model_variant'] ?? 'ESP32-WROOM',
                $id
            ]);
            echo json_encode(['success' => true]);
            break;

        case 'delete_device':
            $id = $_GET['id'] ?? '';
            $stmt = $db->prepare("DELETE FROM devices WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;

        // --- EMPRESAS ---
        case 'get_companies':
            $stmt = $db->query("SELECT * FROM companies ORDER BY name ASC");
            echo json_encode($stmt->fetchAll());
            break;

        case 'add_company':
            $data = getRequestData();
            $id = 'COMP-' . strtoupper(substr(md5(time()), 0, 5));
            $stmt = $db->prepare("INSERT INTO companies (id, name, tax_id, service_status, active) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$id, $data['name'], $data['tax_id'], $data['service_status'], $data['active'] ? 1 : 0]);
            echo json_encode(['success' => true, 'id' => $id]);
            break;

        case 'update_company':
            $data = getRequestData();
            $id = $_GET['id'] ?? '';
            $stmt = $db->prepare("UPDATE companies SET name=?, service_status=? WHERE id=?");
            $stmt->execute([$data['name'], $data['service_status'], $id]);
            echo json_encode(['success' => true]);
            break;

        case 'delete_company':
            $id = $_GET['id'] ?? '';
            $stmt = $db->prepare("DELETE FROM companies WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;

        // --- USUARIOS ---
        case 'delete_user':
            $id = $_GET['id'] ?? '';
            $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;

        case 'update_user':
            $data = getRequestData();
            $id = $_GET['id'] ?? '';
            // Construir query dinámica para permitir updates parciales (ej: solo password)
            $fields = [];
            $values = [];

            if (isset($data['full_name'])) {
                $fields[] = "full_name=?";
                $values[] = $data['full_name'];
            }
            if (isset($data['username'])) {
                $fields[] = "username=?";
                $values[] = $data['username'];
            }
            if (isset($data['role'])) {
                $fields[] = "role=?";
                $values[] = $data['role'];
            }
            if (isset($data['active'])) {
                $fields[] = "active=?";
                $values[] = $data['active'] ? 1 : 0;
            }
            if (!empty($data['password'])) {
                $fields[] = "password_hash=?";
                $values[] = password_hash($data['password'], PASSWORD_DEFAULT);
            }

            if (!empty($fields)) {
                $values[] = $id; // ID para el WHERE
                $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id=?";
                $stmt = $db->prepare($sql);
                $stmt->execute($values);
            }
            echo json_encode(['success' => true]);
            break;

        case 'get_users':
            $company_id = $_GET['company_id'] ?? null;
            if ($company_id) {
                $stmt = $db->prepare("SELECT id, username, full_name, role, company_id, active FROM users WHERE company_id = ?");
                $stmt->execute([$company_id]);
            } else {
                $stmt = $db->query("SELECT id, username, full_name, role, company_id, active FROM users");
            }
            echo json_encode($stmt->fetchAll());
            break;

        case 'add_user':
            $data = getRequestData();
            $id = uniqid('u');
            $hash = password_hash($data['password'], PASSWORD_DEFAULT);
            $stmt = $db->prepare("INSERT INTO users (id, username, password_hash, full_name, role, company_id, active) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$id, $data['username'], $hash, $data['full_name'], $data['role'], $data['company_id'], $data['active'] ? 1 : 0]);
            echo json_encode(['success' => true, 'id' => $id]);
            break;

        // --- PROXY IA ---
        case 'proxy_gemini':
            $data = getRequestData();
            $prompt = $data['prompt'] ?? '';
            if (empty($prompt))
                throw new Exception('Prompt requerido');

            $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=" . GEMINI_API_KEY;
            $payload = ['contents' => [['parts' => [['text' => $prompt]]]], 'generationConfig' => ['responseMimeType' => 'application/json']];

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            $response = curl_exec($ch);
            curl_close($ch);

            $resData = json_decode($response, true);
            echo $resData['candidates'][0]['content']['parts'][0]['text'] ?? '{}';
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Acción no encontrada']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>