
import React, { useMemo } from 'react';
import { Device, User } from '../types';

interface DashboardProps {
  user: User;
  devices: Device[];
  onSelectDevice: (device: Device) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, devices, onSelectDevice }) => {
  const stats = useMemo(() => {
    const total = devices.length;
    const online = devices.filter(d => d.status === 'online').length;
    const offline = devices.filter(d => d.status === 'offline').length;
    return {
      total: total.toString().padStart(2, '0'),
      online: online.toString().padStart(2, '0'),
      offline: offline.toString().padStart(2, '0'),
    };
  }, [devices]);

  const SummaryCard = ({ icon, label, value, colorClass }: any) => (
    <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800/50 flex items-center gap-5 group hover:border-cyan-500/30 transition-all">
      <div className={`p-3 rounded-xl ${colorClass} group-hover:scale-110 transition-transform`}>{icon}</div>
      <div>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
        <p className="text-white text-3xl font-extrabold">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="px-4 py-2 bg-slate-900/50 rounded-lg border border-slate-800 w-fit flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {user.role === 'admin' ? 'Monitorización Multi-Cliente' : `Estado Planta: ${user.company_id}`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard label="Dispositivos" value={stats.total} colorClass="bg-cyan-500/10 text-cyan-400" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>} />
        <SummaryCard label="En Línea" value={stats.online} colorClass="bg-emerald-500/10 text-emerald-400" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>} />
        <SummaryCard label="Fuera de Servicio" value={stats.offline} colorClass="bg-slate-500/10 text-slate-500" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636"></path></svg>} />
      </div>

      <div className="bg-[#1e293b] rounded-[2rem] border border-slate-800/50 p-8">
        <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-6 border-b border-slate-800 pb-4">Actividad Reciente del Sistema</h3>
        <div className="space-y-4">
          {devices.map(d => {
            const isAlarm = d.value < (d.thresholds?.min ?? 20) || d.value > (d.thresholds?.max ?? 80);
            return (
              <div 
                key={d.id} 
                onClick={() => onSelectDevice(d)}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group/row hover:scale-[1.01] ${isAlarm ? 'bg-rose-500/5 border-rose-500/30 hover:bg-rose-500/10' : 'bg-slate-900/30 border-slate-800/40 hover:bg-slate-800/60'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${d.status === 'online' ? (isAlarm ? 'bg-rose-500 animate-ping' : 'bg-emerald-400') : 'bg-slate-700'}`}></div>
                  <div>
                    <p className="text-white text-sm font-bold group-hover/row:text-cyan-400 transition-colors">{d.name}</p>
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">{d.mac_address}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  {isAlarm && (
                    <div className="hidden sm:flex px-4 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full items-center gap-2 animate-pulse">
                      <svg className="w-3 h-3 text-rose-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      <span className="text-rose-400 text-[9px] font-black uppercase tracking-widest">Alarma Crítica</span>
                    </div>
                  )}

                  <p className={`font-bold tabular-nums text-lg ${isAlarm ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]' : 'text-cyan-400'}`}>
                    {d.value.toFixed(2)} <span className="text-[10px] uppercase ml-1 opacity-60">{d.unit}</span>
                  </p>
                  
                  <div className="hidden group-hover/row:flex text-cyan-500 animate-in fade-in slide-in-from-left-2 duration-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                  </div>
                </div>
              </div>
            );
          })}
          {devices.length === 0 && (
            <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest text-center py-10 italic">No hay actividad registrada</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
