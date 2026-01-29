
import { Company, User, Device } from '../types';

const API_BASE = './api/iot_backend.php';

export const databaseService = {
  init: () => {
    // Ya no es necesario inicializar el localStorage localmente.
    // La base de datos se inicializa con el script SQL en el servidor.
    console.log('Database service initialized (API Mode)');
  },

  getCompanies: async (): Promise<Company[]> => {
    try {
      const res = await fetch(`${API_BASE}?action=get_companies`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
  },

  addCompany: async (company: Omit<Company, 'id'>) => {
    const res = await fetch(`${API_BASE}?action=add_company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(company)
    });
    return await res.json();
  },

  deleteCompany: async (id: string) => {
    const res = await fetch(`${API_BASE}?action=delete_company&id=${id}`);
    return await res.json();
  },

  getDevices: async (user?: User | null): Promise<Device[]> => {
    if (!user) return [];
    try {
      const res = await fetch(`${API_BASE}?action=get_devices&company_id=${user.company_id}&role=${user.role}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching devices:', error);
      return [];
    }
  },

  addDevice: async (device: any) => {
    const res = await fetch(`${API_BASE}?action=add_device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(device)
    });
    return await res.json();
  },

  updateDevice: async (id: string, updates: any) => {
    const res = await fetch(`${API_BASE}?action=update_device&id=${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return await res.json();
  },

  deleteDevice: async (id: string) => {
    const res = await fetch(`${API_BASE}?action=delete_device&id=${id}`);
    return await res.json();
  },

  getMeasurements: async (deviceId: string, limit: number = 100) => {
    try {
      const res = await fetch(`${API_BASE}?action=get_measurements&device_id=${deviceId}&limit=${limit}`);
      return await res.json();
    } catch (error) {
      console.error("Error fetching measurements:", error);
      return [];
    }
  },

  getAuditLogs: async (deviceId: string, limit: number = 50) => {
    try {
      const res = await fetch(`${API_BASE}?action=get_audit_logs&device_id=${deviceId}&limit=${limit}`);
      return await res.json();
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      return [];
    }
  },

  getUsers: async (companyId?: string): Promise<User[]> => {
    try {
      const res = await fetch(`${API_BASE}?action=get_users${companyId ? `&company_id=${companyId}` : ''}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  addUser: async (user: Omit<User, 'id'>) => {
    const res = await fetch(`${API_BASE}?action=add_user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    return await res.json();
  },

  login: async (username: string, pass: string): Promise<User | null> => {
    try {
      const res = await fetch(`${API_BASE}?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pass })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user;
    } catch (e) {
      return null;
    }
  },

  updateCompany: async (id: string, updates: any) => {
    const res = await fetch(`${API_BASE}?action=update_company&id=${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return await res.json();
  },

  deleteUser: async (id: string) => {
    const res = await fetch(`${API_BASE}?action=delete_user&id=${id}`);
    return await res.json();
  },

  updateUser: async (id: string, updates: any) => {
    const res = await fetch(`${API_BASE}?action=update_user&id=${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return await res.json();
  }
};
