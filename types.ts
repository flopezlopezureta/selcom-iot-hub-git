
export enum SensorType {
  TEMPERATURE_HUMIDITY = 'DHT22 / BME280',
  LEVEL = 'Nivel',
  PRESSURE = 'Presión',
  FLOW = 'Caudal',
  BATTERY = 'Batería',
  INDUSTRIAL_4_20MA = '4-20mA',
  I2C = 'I2C'
}

export type UserRole = 'admin' | 'client' | 'viewer';

export type ServiceStatus = 'active' | 'suspended' | 'expired' | 'pending';

export interface Company {
  id: string;
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  tax_id?: string;
  billing_address?: string;
  service_start_date?: string;
  service_end_date?: string;
  service_status: ServiceStatus;
  active: boolean;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  email?: string;
  full_name?: string;
  role: UserRole;
  company_id?: string;
  active: boolean;
}

export enum HardwareType {
  T_SIM7080_S3 = 'LilyGO T-SIM7080-S3',
  WALTER_ESP32_S3 = 'Walter ESP32-S3 (NB-IoT/Cat-M1)',
  ESP32_C6 = 'ESP32-C6 (WiFi 6 / Zigbee)',
  ESP32_S3 = 'ESP32-S3 (Standard)',
  ESP32_S3_N16R8 = 'ESP32-S3 N16R8 (16MB Flash/8MB PSRAM)'
}

export enum ProtocolType {
  HTTP_POST = 'HTTP POST (JSON)',
  MQTT = 'MQTT (Pub/Sub)',
  HTTPS = 'HTTPS Seguro',
  THINGSBOARD = 'ThingsBoard (Telemetry)'
}

export enum NetworkMode {
  CAT_M1 = 'LTE Cat-M1 (eMTC)',
  NB_IOT = 'NB-IoT',
  AUTO = 'Automático (M1/NB)',
  WIFI = 'WiFi (Native)'
}

export interface Device {
  id: string;
  name: string;
  mac_address: string;
  type: SensorType | string;
  unit: string;
  status: 'online' | 'offline' | 'maintenance';
  value: number;
  progress: number;
  company_id: string;
  location?: string;
  thresholds?: {
    min: number;
    max: number;
  };
  hardwareConfig?: {
    hardware: HardwareType;
    sensor: SensorType;
    protocol: ProtocolType;
    networkMode: NetworkMode;
    endpoint: string;
    interval: number; // segundos
  };
  model_variant?: string;
}

export interface Measurement {
  id: string;
  device_id: string;
  value: number;
  timestamp: string;
}

export type ViewMode = 'dashboard' | 'companies' | 'users' | 'devices' | 'device-detail' | 'create-device' | 'create-company';
