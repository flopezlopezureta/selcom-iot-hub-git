
import { SensorType, ProtocolType, NetworkMode, HardwareType } from "../types";

export const generateIoTCode = async (
  hardware: HardwareType,
  sensor: SensorType,
  protocol: ProtocolType,
  endpoint: string,
  networkMode: NetworkMode,
  topic?: string
) => {
  try {
    // Intentar primero con la API (si se desea mantener como opción)
    // Para este caso, dado que el usuario reportó problemas, podemos priorizar el fallback o usarlo ante error.
    // Vamos a intentar la API, y si falla, usamos el local.

    // CONFIGURACIÓN DE PROMPT (Se queda en el frontend para facilitar cambios, pero se envía al backend)
    const hardwareProfiles: Record<string, string> = {
      [HardwareType.T_SIM7080_S3]: `Hardware: LilyGO T-SIM7080-S3. Módem: SIM7080G (LTE-M/NB-IoT). Pins: PWRKEY=41, MODEM_RX=17, MODEM_TX=18. Requiere librería TinyGSM.`,
      [HardwareType.WALTER_ESP32_S3]: `Hardware: Walter ESP32-S3. Módem: Sequans GM02S. Requiere librería específica de Walter o TinyGSM compatible con Sequans.`,
      [HardwareType.ESP32_C6]: `Hardware: ESP32-C6 (WiFi 6 / Matter). Usa WiFi nativo.`,
      [HardwareType.ESP32_S3]: `Hardware: ESP32-S3 Standard. Usa WiFi nativo.`,
      [HardwareType.ESP32_S3_N16R8]: `Hardware: ESP32-S3 N16R8. 16MB Flash, 8MB PSRAM.`
    };

    const networkInstructions = networkMode === NetworkMode.WIFI
      ? "Usa la librería WiFi.h nativa de ESP32."
      : `Usa comunicación Celular (${networkMode}). Configura el APN. Usa TinyGsmClient.`;

    const protocolInstructions = protocol === ProtocolType.MQTT
      ? `Usa la librería PubSubClient en tópico: ${topic || 'v1/devices/me/telemetry'}.`
      : `Usa HTTPClient.h. POST JSON a: ${endpoint}.`;

    const prompt = `
      Genera código C++ (.ino) para:
      - PLACA: ${hardware} (${hardwareProfiles[hardware]})
      - RED: ${networkMode} (${networkInstructions})
      - PROTOCOLO: ${protocol} (${protocolInstructions})
      - SENSOR: ${sensor}
      
      Reglas: Manejo de errores, LED status con millis(), JSON consistente.
      Devuelve JSON: {"code": "...", "explanation": "..."}
    `;

    // LLAMADA AL BACKEND PHP (Proxy Seguro)
    const response = await fetch('./api/iot_backend.php?action=proxy_gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      console.warn("API de IA falló, usando generador local...");
      return generateLocally(hardware, sensor, protocol, endpoint, networkMode, topic);
    }

    const textData = await response.text();
    let jsonString = textData;

    // Limpiar bloques de código markdown si los hay (```json ... ```)
    const jsonMatch = textData.match(/```json\n([\s\S]*?)\n```/) || textData.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1];
    }

    let json;
    try {
      json = JSON.parse(jsonString);
    } catch (e) {
      console.warn("Error parseando JSON de IA:", e, jsonString);
      throw new Error("Formato JSON inválido de IA");
    }

    // Si la respuesta está vacía o es un error
    if (!json || !json.code) {
      throw new Error("Respuesta de IA incompleta");
    }

    return json;

  } catch (error) {
    console.error('Error generando código con IA, cambiando a local:', error);
    return generateLocally(hardware, sensor, protocol, endpoint, networkMode, topic);
  }
};

const generateLocally = (
  hardware: HardwareType,
  sensor: SensorType,
  protocol: ProtocolType,
  endpoint: string,
  networkMode: NetworkMode,
  topic?: string
) => {
  let code = "";
  const explanation = "Generado localmente usando plantilla optimizada para " + hardware;

  // --- PLANTILLAS BÁSICAS ---

  // 1. Encabezados y Defines según Hardware
  if (hardware === HardwareType.T_SIM7080_S3) {
    code += `
#define TINY_GSM_MODEM_SIM7080
#define TINY_GSM_RX_BUFFER 1024
#define SerialAT Serial1

// T-SIM7080 Pin definition
#define MODEM_PWKEY 41
#define MODEM_TX    17
#define MODEM_RX    18
#define LED_PIN     1

#include <TinyGsmClient.h>
#include <ArduinoHttpClient.h>
#include <SPI.h>
#include <Ticker.h>

const char apn[]  = "YOUR_APN_HERE"; // Configurar APN
const char gprsUser[] = "";
const char gprsPass[] = "";

HardwareSerial SerialAT(1);
TinyGsm modem(SerialAT);
TinyGsmClient client(modem);
`;
  } else if (hardware.includes("ESP32")) {
    code += `
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

WiFiClient client;
#define LED_PIN 2
`;
  }

  // 2. Setup Loop y Conexión
  code += `
void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
`;

  if (hardware === HardwareType.T_SIM7080_S3) {
    code += `
  // Encender Modem
  pinMode(MODEM_PWKEY, OUTPUT);
  digitalWrite(MODEM_PWKEY, LOW);
  delay(100);
  digitalWrite(MODEM_PWKEY, HIGH);
  delay(1000);
  digitalWrite(MODEM_PWKEY, LOW);

  SerialAT.begin(9600, SERIAL_8N1, MODEM_RX, MODEM_TX);
  delay(3000);
  Serial.println("Inicializando modem...");
  modem.restart();
  
  if (!modem.waitForNetwork()) {
      Serial.println("Fallo en red");
      while (true);
  }
  
  if (!modem.gprsConnect(apn, gprsUser, gprsPass)) {
      Serial.println("Fallo GPRS");
      while (true);
  }
  Serial.println("Conectado a Red Celular");
`;
  } else if (hardware.includes("ESP32")) {
    code += `
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi Conectado");
`;
  }

  code += `
}

void loop() {
  // Simulación de lectura de sensor: ${sensor}
  float value = random(20, 100) / 1.0; 
  String payload = "{\\"${sensor}\\": " + String(value) + "}";
  
  Serial.print("Enviando: ");
  Serial.println(payload);

`;

  // 3. Envío de Datos (Protocolo)
  if (protocol === ProtocolType.HTTP_POST || protocol === ProtocolType.HTTPS) {
    if (hardware === HardwareType.T_SIM7080_S3) {
      code += `
  HttpClient http(client, "${endpoint.split('/')[2] || 'example.com'}", ${protocol === ProtocolType.HTTPS ? 443 : 80});
  int err = http.post("${endpoint}", "application/json", payload);
  if (err != 0) {
    Serial.println("Error HTTP");
  } else {
    Serial.println("Enviado OK");
  }
`;
    } else {
      code += `
  HTTPClient http;
  http.begin("${endpoint}");
  http.addHeader("Content-Type", "application/json");
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0) {
    Serial.print("HTTP Code: ");
    Serial.println(httpResponseCode);
  } else {
    Serial.print("Error code: ");
    Serial.println(httpResponseCode);
  }
  http.end();
`;
    }
  }

  code += `
  delay(10000); // Esperar 10s
}
`;

  return { code, explanation };
};
