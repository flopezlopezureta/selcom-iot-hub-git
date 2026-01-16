-- Database Schema for Selcom IoT Hub
-- To be executed in MySQL

-- Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50),
    service_status ENUM('active', 'suspended', 'expired', 'pending') DEFAULT 'active',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role ENUM('admin', 'client', 'viewer') DEFAULT 'client',
    company_id VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Devices Table
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mac_address VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(100),
    unit VARCHAR(20),
    status ENUM('online', 'offline', 'maintenance') DEFAULT 'offline',
    last_value DECIMAL(15, 4) DEFAULT 0,
    company_id VARCHAR(50),
    hardware_config JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Measurements Table
CREATE TABLE IF NOT EXISTS measurements (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50),
    value DECIMAL(15, 4) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Initial Data
INSERT INTO companies (id, name, tax_id, service_status) VALUES ('SEL-001', 'Agrícola del Valle', '76.123.456-K', 'active');

-- Note: Password is 'admindemo' hashed with PASSWORD_DEFAULT (bcrypt)
-- Using a sample hash for 'admindemo': $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
INSERT INTO users (id, username, password_hash, full_name, role, active) 
VALUES ('1', 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador Global', 'admin', 1);

INSERT INTO users (id, username, password_hash, full_name, role, company_id, active) 
VALUES ('2', 'juan.perez', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Juan Pérez', 'client', 'SEL-001', 1);
