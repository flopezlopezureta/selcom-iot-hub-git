
import React, { useMemo, useState, useEffect } from 'react';
import { Device, User } from '../types';
import Sparkline from './Sparkline';
import { databaseService } from '../services/databaseService';

interface DashboardProps {
  user: User;
  devices: Device[];
  mode?: 'normal' | 'grafana';
  onSelectDevice: (device: Device) => void;
}

const DeviceCard = ({ device, onClick }: { device: Device; onClick: (d: Device) => void; key?: React.Key }) => {
  const [history, setHistory] = useState<{ value: number }[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const data = await databaseService.getMeasurements(device.id, 20);
      if (Array.isArray(data)) {
        setHistory(data.map((m: any) => ({ value: parseFloat(m.value) })));
      }
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 10000);
    return () => clearInterval(interval);
  }, [device.id]);

  const min = device.thresholds?.min ?? 20;
  const max = device.thresholds?.max ?? 80;
  const isAlarm = device.value < min || device.value > max;
  const isWarning = !isAlarm && (device.value < min + 5 || device.value > max - 5);

  const statusColor = isAlarm ? 'rose' : isWarning ? 'amber' : 'cyan';

  return (
    <div
      onClick={() => onClick(device)}
      className={`relative overflow-hidden p-6 rounded-[2rem] border-2 cursor-pointer transition-all duration-500 group
        ${statusColor === 'rose' ? 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.1)]' :
          statusColor === 'amber' ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/50' :
            'bg-slate-900/40 border-slate-800/50 hover:border-cyan-500/30 hover:bg-slate-800/60 shadow-xl'}`}
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h4 className="text-white font-black text-[11px] uppercase tracking-[0.2em] mb-1 group-hover:text-cyan-400 transition-colors">
            {device.name}
          </h4>
          <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">ID: {device.mac_address}</p>
        </div>
        <div className={`w-2 h-2 rounded-full animate-pulse ${device.status === 'online' ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className={`text-4xl font-black brand-logo tabular-nums transition-all ${statusColor === 'rose' ? 'text-rose-400' : statusColor === 'amber' ? 'text-amber-400' : 'text-cyan-400'}`}>
          {device.value.toFixed(1)}
        </span>
        <span className="text-slate-500 text-[10px] font-black uppercase opacity-60 tracking-widest">{device.unit}</span>
      </div>

      <div className="mt-4">
        <Sparkline data={history} color={statusColor === 'rose' ? '#f43f5e' : statusColor === 'amber' ? '#f59e0b' : '#22d3ee'} />
      </div>

      {/* Background Glow Effect */}
      <div className={`absolute -right-10 -bottom-10 w-32 h-32 blur-[80px] rounded-full opacity-20 transition-all duration-700 group-hover:opacity-40
        ${statusColor === 'rose' ? 'bg-rose-500' : statusColor === 'amber' ? 'bg-amber-500' : 'bg-cyan-500'}`}></div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user, devices, mode = 'normal', onSelectDevice }) => {
  const stats = useMemo(() => {
    if (!Array.isArray(devices)) return { total: '00', online: '00', offline: '00' };
    return {
      total: devices.length.toString().padStart(2, '0'),
      online: devices.filter(d => d.status === 'online').length.toString().padStart(2, '0'),
      offline: devices.filter(d => d.status === 'offline').length.toString().padStart(2, '0'),
    };
  }, [devices]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Stat Bar Inspired by Grafana Header - Only shown in Grafana mode or as requested */}
      {mode === 'grafana' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-slate-900/60 border-l-4 border-cyan-500 p-6 rounded-2xl shadow-xl">
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Activos Monitoreados</p>
            <p className="text-white text-3xl font-black brand-logo">{stats.total}</p>
          </div>
          <div className="bg-slate-900/60 border-l-4 border-emerald-500 p-6 rounded-2xl shadow-xl">
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Online (Heartbeat)</p>
            <p className="text-emerald-400 text-3xl font-black brand-logo">{stats.online}</p>
          </div>
          <div className="bg-slate-900/60 border-l-4 border-rose-500 p-6 rounded-2xl shadow-xl">
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Alarmas Críticas</p>
            <p className="text-rose-400 text-3xl font-black brand-logo">
              {devices.filter(d => d.value < (d.thresholds?.min ?? 20) || d.value > (d.thresholds?.max ?? 80)).length.toString().padStart(2, '0')}
            </p>
          </div>
          <div className="hidden lg:block bg-slate-900/60 border-l-4 border-amber-500 p-6 rounded-2xl shadow-xl">
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Uptime Global</p>
            <p className="text-amber-400 text-3xl font-black brand-logo">99.8%</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-black text-[11px] uppercase tracking-[0.4em] flex items-center gap-3">
            {mode === 'grafana' ? 'NOC Central Support - Industrial' : 'Explorador de Telemetría'}
            <div className="h-1 w-12 bg-cyan-500/20 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 animate-[loading_2s_infinite]"></div>
            </div>
          </h3>
          <div className="flex gap-2">
            <span className={`px-3 py-1 bg-slate-800 text-[8px] font-black uppercase rounded-lg border border-slate-700 ${mode === 'grafana' ? 'text-orange-400 border-orange-500/30' : 'text-slate-400'}`}>
              {mode === 'grafana' ? 'NOC View Active' : '60s Refresh'}
            </span>
          </div>
        </div>

        {mode === 'grafana' ? (
          <div className="bg-[#0f172a] rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-800">
                  <th className="px-8 py-5">Identificador</th>
                  <th className="px-8 py-5 text-center">Valor Actual</th>
                  <th className="px-8 py-5 text-center">Unidad</th>
                  <th className="px-8 py-5 text-center">Estado</th>
                  <th className="px-8 py-5 text-right">Tendencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {devices.map(d => {
                  const isAlarm = d.value < (d.thresholds?.min ?? 20) || d.value > (d.thresholds?.max ?? 80);
                  return (
                    <tr key={d.id} onClick={() => onSelectDevice(d)} className="hover:bg-cyan-500/5 cursor-pointer transition-colors group">
                      <td className="px-8 py-6">
                        <p className="text-white font-bold uppercase text-xs tracking-tight">{d.name}</p>
                        <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">ID: {d.mac_address}</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`text-2xl font-black brand-logo ${isAlarm ? 'text-rose-500' : 'text-cyan-400'}`}>
                          {d.value.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center text-slate-500 text-[10px] font-bold uppercase">{d.unit}</td>
                      <td className="px-8 py-6 text-center">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${d.status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="w-24 h-8 ml-auto opacity-50 group-hover:opacity-100 transition-opacity">
                          <Sparkline data={[]} color={isAlarm ? '#f43f5e' : '#22d3ee'} width={100} height={30} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {devices.map((d) => (
              <DeviceCard key={d.id} device={d} onClick={onSelectDevice} />
            ))}

            {devices.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-32 bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-800/50">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] font-mono">Esperando señales de radio...</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;

