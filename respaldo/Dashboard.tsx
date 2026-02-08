
import React, { useEffect, useState, useMemo } from 'react';
import { databaseService } from '../services/databaseService';
import { Device } from '../types';

const Dashboard: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    databaseService.checkConnection().then(active => {
      setDbStatus(active ? 'connected' : 'error');
      if (active) {
        setDevices(databaseService.getDevices());
      }
    });
  }, []);

  const stats = useMemo(() => {
    const total = devices.length;
    const online = devices.filter(d => d.status === 'online').length;
    const offline = devices.filter(d => d.status === 'offline').length;
    const alerts = devices.filter(d => d.status === 'maintenance').length;
    
    return {
      total: total.toString().padStart(2, '0'),
      online: online.toString().padStart(2, '0'),
      offline: offline.toString().padStart(2, '0'),
      alerts: alerts.toString().padStart(2, '0')
    };
  }, [devices]);

  const SummaryCard = ({ icon, label, value, colorClass }: any) => (
    <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800/50 flex items-center gap-5 group hover:border-cyan-500/30 transition-all">
      <div className={`p-3 rounded-xl ${colorClass} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
        <p className="text-white text-3xl font-extrabold">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4 px-4 py-2 bg-slate-900/50 rounded-lg border border-slate-800 w-fit">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Sistema: {dbStatus === 'connected' ? 'En línea' : 'Conectando...'}
          </span>
        </div>
        <div className="w-px h-3 bg-slate-700"></div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Nodo: T-SIM7080-S3
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          label="Dispositivos" 
          value={stats.total} 
          colorClass="bg-cyan-500/10 text-cyan-400"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>}
        />
        <SummaryCard 
          label="Online" 
          value={stats.online} 
          colorClass="bg-emerald-500/10 text-emerald-400"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>}
        />
        <SummaryCard 
          label="Offline" 
          value={stats.offline} 
          colorClass="bg-slate-500/10 text-slate-500"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636"></path></svg>}
        />
        <SummaryCard 
          label="Alertas" 
          value={stats.alerts} 
          colorClass="bg-rose-500/10 text-rose-400"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1e293b] rounded-[2rem] border border-slate-800/50 p-8 text-center">
          <p className="text-sm font-bold mb-6 text-white uppercase tracking-wider">Estado del Hub T-SIM7080-S3</p>
          <div className="max-w-md mx-auto space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
              <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Latencia LTE-M</span>
              <span className="text-cyan-400 font-bold text-xl">142ms</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
              <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Uptime</span>
              <span className="text-emerald-400 font-bold text-xl">14d 05h</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Firmware</span>
              <span className="text-slate-400 font-bold text-xl">v1.2.4</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-[2rem] border border-slate-800/50 p-8">
           <p className="text-sm font-bold mb-6 text-white uppercase tracking-wider text-center">Configuración de Almacenamiento</p>
           <div className="space-y-4">
              <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Motor</p>
                <p className="text-white font-bold text-lg">TSDB Persistence</p>
              </div>
              <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Data Endpoint</p>
                <p className="text-cyan-400 font-mono text-xs break-all">api.selcom.io/v1/write</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
