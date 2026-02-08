
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DeviceDetail from './components/DeviceDetail';
import DeviceCreator from './components/DeviceCreator';
import CompanyCreator from './components/CompanyCreator';
import Login from './components/Login';
import CompanyManager from './components/CompanyManager';
import UserManager from './components/UserManager';
import ProfileSettings from './components/ProfileSettings';
import Settings from './components/Settings';
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
  const [dashboardMode, setDashboardMode] = useState<'normal' | 'grafana'>(() => {
    return (localStorage.getItem('selcom_dashboard_mode') as 'normal' | 'grafana') || 'normal';
  });

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
            key={`dashboard-${dashboardMode}`}
            user={currentUser}
            devices={devices}
            mode={dashboardMode}
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
              <Dashboard
                key={`devices-${dashboardMode}`}
                user={currentUser}
                devices={devices}
                mode={dashboardMode}
                onSelectDevice={(d) => {
                  setSelectedDevice(d);
                  setViewMode('device-detail');
                }}
              />
            )}
          </div>
        );
      case 'create-device': return <DeviceCreator editDevice={selectedDevice} companies={companies} onCancel={() => setViewMode('devices')} onSuccess={() => { refreshData(); setViewMode('devices'); }} />;
      case 'device-detail': return activeSelectedDevice ? <DeviceDetail device={activeSelectedDevice} mode={dashboardMode} onBack={() => { setViewMode('devices'); setSelectedDevice(null); }} onRefresh={refreshData} /> : null;
      case 'settings': return <Settings user={currentUser} dashboardMode={dashboardMode} onModeChange={setDashboardMode} />;
      case 'profile': return <ProfileSettings user={currentUser} />;
      default: return <Dashboard user={currentUser} devices={devices} mode={dashboardMode} onSelectDevice={(d) => { setSelectedDevice(d); setViewMode('device-detail'); }} />;
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
    <div className="min-h-screen bg-[#020617] flex selection:bg-cyan-500/30">

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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-5">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-3 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/50 text-slate-400 hover:text-white transition-all shadow-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-white text-3xl font-black uppercase tracking-tighter brand-logo">Cloud HUB</h2>
                  <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-cyan-500/20">Active v1.5.7</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">{currentUser.full_name}</p>
                  <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                  <p className="text-cyan-500/80 text-[10px] font-black uppercase tracking-[0.2em]">{currentUser.role === 'admin' ? 'Infraestructura Global' : currentUser.company_id}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end px-4 py-2 bg-slate-900/40 rounded-2xl border border-slate-800/50">
                <span className="text-slate-500 text-[8px] font-black uppercase tracking-widest">Estado Sistema</span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500 text-[10px] font-bold uppercase">Online</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse"></span>
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
