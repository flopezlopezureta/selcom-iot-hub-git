
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DeviceDetail from './components/DeviceDetail';
import DeviceCreator from './components/DeviceCreator';
import CompanyCreator from './components/CompanyCreator';
import Login from './components/Login';
import CompanyManager from './components/CompanyManager';
import UserManager from './components/UserManager';
import { ViewMode, Device, User, Company } from './types';
import { databaseService } from './services/databaseService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('selcom_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lastUpdates, setLastUpdates] = useState<Record<string, number>>({});

  const refreshData = useCallback(async () => {
    if (currentUser) {
      try {
        const [filteredDevices, allCompanies] = await Promise.all([
          databaseService.getDevices(currentUser),
          databaseService.getCompanies()
        ]);
        setDevices(filteredDevices);
        setCompanies(allCompanies);
      } catch (error) {
        console.error('Error al refrescar datos:', error);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    databaseService.init();
    refreshData();
  }, [currentUser, refreshData]);

  // Motor de simulación inteligente: verifica cada segundo qué dispositivos deben actualizarse
  useEffect(() => {
    if (!currentUser || devices.length === 0) return;

    const ticker = setInterval(() => {
      const now = Date.now();
      let hasChanges = false;

      const updatedDevices = devices.map(d => {
        const samplingIntervalMs = (d.hardwareConfig?.interval || 10) * 1000;
        const lastUpdate = lastUpdates[d.id] || 0;

        if (now - lastUpdate >= samplingIntervalMs) {
          hasChanges = true;
          // Actualizamos el registro de tiempo localmente
          lastUpdates[d.id] = now;

          return {
            ...d,
            value: Math.max(0, d.value + (Math.random() - 0.5) * 0.8)
          };
        }
        return d;
      });

      if (hasChanges) {
        setDevices(updatedDevices);
        setLastUpdates({ ...lastUpdates });
      }
    }, 1000);

    return () => clearInterval(ticker);
  }, [currentUser, devices, lastUpdates]);

  // Mantener el dispositivo seleccionado sincronizado con la lista global
  const activeSelectedDevice = selectedDevice
    ? devices.find(d => d.id === selectedDevice.id) || selectedDevice
    : null;

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('selcom_auth');
    localStorage.removeItem('selcom_auth_user');
    setViewMode('dashboard');
    setSelectedDevice(null);
  };

  const handleDeviceAction = async (id: string, action: 'delete' | 'edit') => {
    if (action === 'delete') {
      if (confirm('¿Eliminar este activo del sistema?')) {
        await databaseService.deleteDevice(id);
        refreshData();
      }
    } else {
      const dev = devices.find(d => d.id === id);
      if (dev) {
        setSelectedDevice(dev);
        setViewMode('create-device');
      }
    }
  };

  const renderContent = () => {
    if (!currentUser) return null;

    switch (viewMode) {
      case 'dashboard':
        return (
          <Dashboard
            user={currentUser}
            devices={devices}
            onSelectDevice={(d) => {
              setSelectedDevice(d);
              setViewMode('device-detail');
            }}
          />
        );
      case 'companies': return <CompanyManager onCreateClick={() => setViewMode('create-company')} />;
      case 'create-company': return <CompanyCreator onCancel={() => setViewMode('companies')} onSuccess={() => { refreshData(); setViewMode('companies'); }} />;
      case 'users': return <UserManager user={currentUser} />;
      case 'devices':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold text-xl uppercase tracking-tight">Activos en Red</h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                  {currentUser.role === 'admin' ? 'Todos los clientes' : `Filtro: ${currentUser.company_id}`}
                </p>
              </div>
              {currentUser?.role === 'admin' && (
                <button onClick={() => { setSelectedDevice(null); setViewMode('create-device'); }} className="px-6 py-2.5 bg-cyan-600 text-white rounded-xl text-xs font-bold uppercase hover:bg-cyan-500 transition-all">+ Proveer Activo</button>
              )}
            </div>
            {devices.length === 0 ? (
              <div className="bg-[#1e293b] p-20 rounded-[2rem] border border-slate-800/50 text-center">
                <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em]">No se encontraron dispositivos vinculados</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {devices.map(d => (
                  <div key={d.id} className="bg-[#1e293b] p-6 rounded-[2rem] border border-slate-800/50 flex flex-col gap-6 group hover:border-cyan-500/30 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                        <div className="p-3 bg-slate-900 rounded-2xl text-cyan-400 border border-slate-800"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg></div>
                        <div>
                          <h4 className="text-white font-bold uppercase text-sm tracking-tight">{d.name}</h4>
                          <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest">{d.mac_address}</p>
                        </div>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full ${d.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-white text-4xl font-black tracking-tighter tabular-nums">{d.value.toFixed(2)}</span>
                      <span className="text-slate-500 text-xs font-bold uppercase">{d.unit}</span>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-slate-800/50">
                      <button onClick={() => { setSelectedDevice(d); setViewMode('device-detail'); }} className="flex-1 py-2 bg-cyan-600/10 text-cyan-400 rounded-xl text-[9px] font-black uppercase hover:bg-cyan-600 hover:text-white transition-all">Ver Live</button>
                      {currentUser.role === 'admin' && (
                        <>
                          <button onClick={() => handleDeviceAction(d.id, 'edit')} className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl text-[9px] font-black uppercase hover:text-white transition-all">Editar</button>
                          <button onClick={() => handleDeviceAction(d.id, 'delete')} className="px-3 py-2 bg-rose-500/10 text-rose-400 rounded-xl text-[9px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all">X</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'create-device': return <DeviceCreator editDevice={selectedDevice} companies={companies} onCancel={() => setViewMode('devices')} onSuccess={() => { refreshData(); setViewMode('devices'); }} />;
      case 'device-detail': return activeSelectedDevice ? <DeviceDetail device={activeSelectedDevice} onBack={() => { setViewMode('devices'); setSelectedDevice(null); }} onRefresh={refreshData} /> : null;
      default: return <Dashboard user={currentUser} devices={devices} onSelectDevice={(d) => { setSelectedDevice(d); setViewMode('device-detail'); }} />;
    }
  };

  if (!currentUser) return (
    <Login onLogin={async (u, p) => {
      const user = await databaseService.login(u, p);
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('selcom_auth_user', JSON.stringify(user));
      } else {
        throw new Error('Credenciales inválidas');
      }
    }} />
  );

  return (
    <div className="min-h-screen bg-[#0f172a] flex text-slate-200">
      <Sidebar
        currentView={viewMode}
        userRole={currentUser.role}
        companyId={currentUser.company_id}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
        onViewChange={(v) => { setViewMode(v as ViewMode); if (v !== 'device-detail' && v !== 'create-device') setSelectedDevice(null); }}
      />
      <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
        <div className="container mx-auto max-w-7xl">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-slate-800 rounded-lg"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg></button>
              <div>
                <h2 className="text-white text-2xl font-black uppercase tracking-tight">Selcom Cloud</h2>
                <div className="flex items-center gap-2">
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">{currentUser.full_name}</p>
                  <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                  <p className="text-cyan-500 text-[10px] font-bold uppercase tracking-[0.2em]">{currentUser.role === 'admin' ? 'Super Admin' : currentUser.company_id}</p>
                </div>
              </div>
            </div>
          </div>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
