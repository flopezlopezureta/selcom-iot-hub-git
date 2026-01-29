
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Device, SensorType, AuditLog, NotificationSettings } from '../types';
import { generateIoTCode } from '../services/geminiService';
import { databaseService } from '../services/databaseService';
import CodeViewer from './CodeViewer';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';

interface DeviceDetailProps {
  device: Device;
  onBack: () => void;
  onRefresh: () => void;
}

type TabType = 'monitoring' | 'history' | 'audit' | 'firmware' | 'troubleshooting';

const DeviceDetail: React.FC<DeviceDetailProps> = ({ device, onBack, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<TabType>('monitoring');
  const [dataPoints, setDataPoints] = useState<{ value: number; time: string; date: string; timestamp: number }[]>([]);

  const [minThreshold, setMinThreshold] = useState<number>(device.thresholds?.min ?? 20);
  const [maxThreshold, setMaxThreshold] = useState<number>(device.thresholds?.max ?? 80);

  const [intervalSec, setIntervalSec] = useState<number>(device.hardwareConfig?.interval || 10);
  const [timeRange, setTimeRange] = useState<number>(5);
  // const [draggingThreshold, setDraggingThreshold] = useState<'min' | 'max' | null>(null); // Removed for Recharts version

  const [generatedSketch, setGeneratedSketch] = useState<{ code: string, explanation: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // const [hoverIndex, setHoverIndex] = useState<number | null>(null); // Removed for Recharts
  // const svgRef = useRef<SVGSVGElement>(null); // Removed for Recharts

  // New Dashboard Features State
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(device.maintenance_mode || false);
  const [calibrationOffset, setCalibrationOffset] = useState<number>(device.calibration_offset || 0);
  const [heartbeatInterval, setHeartbeatInterval] = useState<number>(device.heartbeat_interval || 1800);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(device.notification_settings || {
    email: true,
    whatsapp: false,
    push: true,
    critical_only: true
  });

  const timeOptions = [
    { label: '5m', value: 5 },
    { label: '15m', value: 15 },
    { label: '1h', value: 60 },
    { label: '12h', value: 720 },
  ];

  // Sincronizar estados locales con las propiedades del dispositivo cuando cambien externamente
  useEffect(() => {
    if (device.thresholds) {
      setMinThreshold(device.thresholds.min);
      setMaxThreshold(device.thresholds.max);
    }
    if (device.hardwareConfig) {
      setIntervalSec(device.hardwareConfig.interval);
    }
    // Update local state if device props change significantly
    setMaintenanceMode(device.maintenance_mode || false);
    setCalibrationOffset(device.calibration_offset || 0);
    setHeartbeatInterval(device.heartbeat_interval || 1800);
    if (device.notification_settings) setNotifSettings(device.notification_settings);
  }, [device.id, device.thresholds, device.hardwareConfig, device.maintenance_mode, device.calibration_offset, device.heartbeat_interval]);

  // Cargar historial real desde la base de datos
  useEffect(() => {
    const loadHistory = async () => {
      const history = await databaseService.getMeasurements(device.id, 100);

      if (Array.isArray(history) && history.length > 0) {
        const mapped = history.map((h: any) => {
          const d = new Date(h.timestamp);
          return {
            value: parseFloat(h.value),
            time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            date: d.toLocaleDateString(),
            timestamp: d.getTime()
          };
        });
        setDataPoints(mapped);
      } else {
        const now = new Date();
        setDataPoints([{
          value: device.value,
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          date: now.toLocaleDateString(),
          timestamp: now.getTime()
        }]);
      }
    };

    loadHistory();
    // Polling cada 5 segundos para actualizar
    const interval = setInterval(loadHistory, 5000);
    return () => clearInterval(interval);
  }, [device.id]);

  // Load Audit Logs
  useEffect(() => {
    if (activeTab === 'audit') {
      setLoadingLogs(true);
      databaseService.getAuditLogs(device.id).then(logs => {
        setAuditLogs(logs);
        setLoadingLogs(false);
      });
    }
  }, [device.id, activeTab]);

  const handleUpdateDevice = async (updates: any) => {
    await databaseService.updateDevice(device.id, updates);
    onRefresh(); // Refresh parent to get updated device object
  };

  // Sincronizar historial con el valor global que viene de App.tsx
  useEffect(() => {
    const now = new Date();
    const newPoint = {
      value: device.value,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: now.toLocaleDateString(),
      timestamp: now.getTime()
    };

    setDataPoints(prev => {
      if (prev.length > 0 && Math.abs(prev[prev.length - 1].timestamp - newPoint.timestamp) < 500) {
        return prev;
      }
      return [...prev.slice(1), newPoint];
    });
  }, [device.value]);

  // handleMouseUp for threshold removed/commented out as interaction changed
  /*
  const handleMouseUp = () => {
    if (draggingThreshold) {
      databaseService.updateDevice(device.id, {
        thresholds: { min: minThreshold, max: maxThreshold }
      });
      onRefresh(); 
    }
    setDraggingThreshold(null);
  };
  */

  const displayedValue = device.value + calibrationOffset;
  const isOutOfRange = !maintenanceMode && (displayedValue < minThreshold || displayedValue > maxThreshold);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-12 select-none">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-slate-800/80 text-slate-300 rounded-lg hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <div className="overflow-hidden">
            <h2 className="text-white text-xl sm:text-2xl font-bold tracking-tight truncate">{device.name}</h2>
            <p className="text-slate-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] truncate">MAC: {device.mac_address}</p>
          </div>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 overflow-x-auto shadow-inner no-scrollbar">
          {['monitoring', 'history', 'audit', 'firmware', 'troubleshooting'].map((t) => (
            <button key={t} onClick={() => setActiveTab(t as TabType)} className={`px-4 lg:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'bg-cyan-500 text-[#0f172a] shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}>{t === 'troubleshooting' ? 'Soporte' : t === 'history' ? 'Historial' : t === 'audit' ? 'Eventos' : t === 'monitoring' ? 'Monitor' : t}</button>
          ))}
        </div>
      </div>

      {activeTab === 'monitoring' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            <div className="bg-[#1e293b] rounded-[1.5rem] sm:rounded-[2rem] border border-slate-800/40 p-4 sm:p-8 shadow-2xl relative overflow-visible">
              <div className="flex flex-col sm:flex-row justify-between items-start mb-6 sm:mb-10 gap-4">
                <div className="w-full sm:w-auto">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <h3 className="text-white font-bold text-xs sm:text-sm tracking-widest uppercase">Telemetría Live</h3>
                  </div>
                  <p className="text-slate-400 text-[9px] sm:text-[11px] font-bold uppercase">Mueva las líneas rojas para fijar límites</p>
                </div>
                <div className="flex items-baseline gap-1 bg-slate-900 px-4 py-3 sm:px-6 sm:py-4 rounded-2xl border-2 border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.2)] self-end sm:self-auto">
                  <span className={`text-3xl sm:text-4xl lg:text-5xl font-black tabular-nums ${isOutOfRange ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]' : maintenanceMode ? 'text-amber-400' : 'text-cyan-400'}`}>
                    {displayedValue.toFixed(2)}
                  </span>
                  <span className="text-white text-[10px] sm:text-sm font-black uppercase ml-1">{device.unit}</span>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-4 h-[300px]">
                <div className="flex-1 min-w-0 bg-slate-900/40 rounded-xl border border-slate-700/30 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dataPoints}>
                      <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                      <XAxis
                        dataKey="time"
                        stroke="#94a3b8"
                        tick={{ fontSize: 10, fontWeight: 'bold' }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fontSize: 10, fontWeight: 'bold' }}
                        tickLine={false}
                        axisLine={false}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#22d3ee', borderRadius: '1rem', color: '#fff', boxShadow: '0 10px 30px -10px rgba(34, 211, 238, 0.4)' }}
                        itemStyle={{ color: '#22d3ee', fontWeight: 'black', textTransform: 'uppercase', fontSize: '11px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '0.5rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}
                        cursor={{ stroke: '#22d3ee', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <ReferenceLine y={maxThreshold} label={{ value: 'MAX', fill: '#f43f5e', fontSize: 10, fontWeight: 'bold' }} stroke="#f43f5e" strokeDasharray="3 3" />
                      <ReferenceLine y={minThreshold} label={{ value: 'MIN', fill: '#f43f5e', fontSize: 10, fontWeight: 'bold' }} stroke="#f43f5e" strokeDasharray="3 3" />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#22d3ee"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorVal)"
                        animationDuration={1000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#1e293b] rounded-[1.5rem] sm:rounded-[2rem] border border-slate-800/40 p-6 sm:p-8 shadow-2xl">
              <h3 className="text-white font-bold text-xs sm:text-sm uppercase tracking-widest mb-6 border-b border-slate-800 pb-4">Panel de Control</h3>
              <div className="space-y-6 sm:space-y-8">
                <div>
                  <div className="flex justify-between text-[10px] sm:text-[11px] font-black text-white uppercase mb-3 tracking-widest">
                    <span>Muestreo</span>
                    <span className="text-cyan-400 font-mono text-xs">{intervalSec}s</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    value={intervalSec}
                    onChange={e => {
                      const newInterval = parseInt(e.target.value);
                      setIntervalSec(newInterval);
                      databaseService.updateDevice(device.id, {
                        hardwareConfig: { ...device.hardwareConfig!, interval: newInterval }
                      });
                      onRefresh();
                    }}
                    className="w-full h-2 bg-slate-800 rounded-lg accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Maintenance Mode Toggle */}
                <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Modo Mantenimiento</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Suprime alertas locales</span>
                  </div>
                  <button
                    onClick={() => {
                      const newVal = !maintenanceMode;
                      setMaintenanceMode(newVal);
                      handleUpdateDevice({ maintenance_mode: newVal });
                    }}
                    className={`w-12 h-6 rounded-full p-1 transition-all ${maintenanceMode ? 'bg-amber-500' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${maintenanceMode ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Calibration & Heartbeat */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Calibración (+/-)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={calibrationOffset}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCalibrationOffset(val);
                      }}
                      onBlur={() => handleUpdateDevice({ calibration_offset: calibrationOffset })}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2 text-center font-mono font-bold focus:border-cyan-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Heartbeat (seg)</label>
                    <input
                      type="number"
                      value={heartbeatInterval}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setHeartbeatInterval(val);
                      }}
                      onBlur={() => handleUpdateDevice({ heartbeat_interval: heartbeatInterval })}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2 text-center font-mono font-bold focus:border-cyan-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <label className="text-[10px] font-black text-white uppercase tracking-widest block">Notificaciones</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const n = { ...notifSettings, email: !notifSettings.email };
                        setNotifSettings(n);
                        handleUpdateDevice({ notification_settings: n });
                      }}
                      className={`p-2 rounded-lg border text-[9px] font-bold uppercase transition-all ${notifSettings.email ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                    >
                      Email
                    </button>
                    <button
                      onClick={() => {
                        const n = { ...notifSettings, whatsapp: !notifSettings.whatsapp };
                        setNotifSettings(n);
                        handleUpdateDevice({ notification_settings: n });
                      }}
                      className={`p-2 rounded-lg border text-[9px] font-bold uppercase transition-all ${notifSettings.whatsapp ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={() => {
                        const n = { ...notifSettings, push: !notifSettings.push };
                        setNotifSettings(n);
                        handleUpdateDevice({ notification_settings: n });
                      }}
                      className={`p-2 rounded-lg border text-[9px] font-bold uppercase transition-all ${notifSettings.push ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                    >
                      Push
                    </button>
                    <button
                      onClick={() => {
                        const n = { ...notifSettings, critical_only: !notifSettings.critical_only };
                        setNotifSettings(n);
                        handleUpdateDevice({ notification_settings: n });
                      }}
                      className={`p-2 rounded-lg border text-[9px] font-bold uppercase transition-all ${notifSettings.critical_only ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                    >
                      Solo Críticas
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] sm:text-[11px] font-black text-white uppercase block mb-2 tracking-widest">Umbrales Activos</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 border-2 border-slate-800 p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-inner text-center">
                      <p className="text-[9px] text-slate-400 font-black uppercase mb-1">Mínimo</p>
                      <input
                        type="number"
                        value={minThreshold}
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          setMinThreshold(val);
                          databaseService.updateDevice(device.id, { thresholds: { min: val, max: maxThreshold } });
                          onRefresh();
                        }}
                        className="w-full bg-transparent text-white text-lg sm:text-xl font-black font-mono leading-none text-center outline-none"
                      />
                    </div>
                    <div className="bg-slate-900 border-2 border-slate-800 p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-inner text-center">
                      <p className="text-[9px] text-slate-400 font-black uppercase mb-1">Máximo</p>
                      <input
                        type="number"
                        value={maxThreshold}
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          setMaxThreshold(val);
                          databaseService.updateDevice(device.id, { thresholds: { min: minThreshold, max: val } });
                          onRefresh();
                        }}
                        className="w-full bg-transparent text-white text-lg sm:text-xl font-black font-mono leading-none text-center outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <label className="text-[10px] sm:text-[11px] font-black text-white uppercase block mb-4 tracking-widest">Zoom Histórico</label>
                  <div className="grid grid-cols-2 gap-2">
                    {timeOptions.map(opt => (
                      <button key={opt.value} onClick={() => setTimeRange(opt.value)} className={`py-2 text-[10px] sm:text-[11px] font-black uppercase border-2 rounded-xl transition-all ${timeRange === opt.value ? 'bg-cyan-500 border-cyan-400 text-[#0f172a] shadow-lg shadow-cyan-500/20' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}>{opt.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={`bg-[#1e293b] rounded-[1.5rem] sm:rounded-[2rem] border-2 p-6 sm:p-8 transition-all ${isOutOfRange ? 'border-rose-500/50 bg-rose-500/5 shadow-[0_0_30px_rgba(244,63,94,0.2)]' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
              <h4 className="text-white text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-4">Estado Alarma</h4>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${isOutOfRange ? 'bg-rose-500 animate-ping' : maintenanceMode ? 'bg-amber-500' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]'}`}></div>
                <span className={`text-sm sm:text-lg font-black uppercase ${isOutOfRange ? 'text-rose-400' : maintenanceMode ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {maintenanceMode ? 'MANTENIMIENTO' : isOutOfRange ? 'FUERA DE RANGO' : 'SISTEMA ÓPTIMO'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="bg-[#1e293b] rounded-[1.5rem] sm:rounded-[2rem] border border-slate-800/40 overflow-hidden shadow-2xl">
            <div className="p-6 sm:p-8 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center bg-slate-900/50 gap-4">
              <div className="text-center sm:text-left">
                <h3 className="text-white font-bold text-xs sm:text-sm uppercase tracking-widest">Registro de Mediciones</h3>
                <p className="text-slate-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest">Historial en tiempo real</p>
              </div>
              <button onClick={() => {
                const csv = "Fecha,Hora,Valor,Unidad\n" + dataPoints.map(p => `${p.date},${p.time},${p.value.toFixed(2)},${device.unit}`).join("\n");
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.setAttribute('hidden', '');
                a.setAttribute('href', url);
                a.setAttribute('download', `log_${device.mac_address}.csv`);
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }} className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 text-cyan-400 rounded-xl text-[9px] sm:text-[10px] font-black uppercase border border-slate-700 hover:bg-cyan-500 hover:text-white transition-all">
                Exportar CSV
              </button>
            </div>
            <div className="max-h-[500px] sm:max-h-[600px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left min-w-[500px]">
                <thead>
                  <tr className="bg-slate-900/30 text-slate-500 text-[9px] sm:text-[10px] uppercase font-black tracking-widest border-b border-slate-800">
                    <th className="px-6 sm:px-8 py-4 sm:py-5">Timestamp</th>
                    <th className="px-6 sm:px-8 py-4 sm:py-5">Valor</th>
                    <th className="px-6 sm:px-8 py-4 sm:py-5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {[...dataPoints].reverse().map((p, i) => {
                    const out = p.value < minThreshold || p.value > maxThreshold;
                    return (
                      <tr key={i} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 sm:px-8 py-4 font-mono text-xs sm:text-sm">
                          <span className="text-white font-bold">{p.date}</span>
                          <span className="text-slate-500 ml-2 sm:ml-3">{p.time}</span>
                        </td>
                        <td className="px-6 sm:px-8 py-4">
                          <span className={`text-base sm:text-lg font-black ${out ? 'text-rose-400' : 'text-cyan-400'}`}>
                            {p.value.toFixed(2)}
                          </span>
                          <span className="text-slate-500 text-[9px] sm:text-[10px] font-bold uppercase ml-2">{device.unit}</span>
                        </td>
                        <td className="px-6 sm:px-8 py-4">
                          <span className={`px-2 sm:px-3 py-1 rounded-lg text-[8px] sm:text-[9px] font-black uppercase ${out ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                            {out ? 'Alerta' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="bg-[#1e293b] rounded-[1.5rem] sm:rounded-[2rem] border border-slate-800/40 overflow-hidden shadow-2xl">
            <div className="p-6 sm:p-8 border-b border-slate-800">
              <h3 className="text-white font-bold text-xs sm:text-sm uppercase tracking-widest">Auditoría de Eventos</h3>
              <p className="text-slate-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest">Trazabilidad de cambios y alertas</p>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {loadingLogs ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs animate-pulse">Cargando logs...</div>
              ) : auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">No hay eventos registrados</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-900/50 text-[9px] font-black text-slate-400 uppercase tracking-widest sticky top-0">
                    <tr>
                      <th className="px-6 py-3">Fecha</th>
                      <th className="px-6 py-3">Evento</th>
                      <th className="px-6 py-3">Descripción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="px-6 py-3 text-[10px] font-mono text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${log.event_type === 'ALARM' ? 'bg-rose-500/20 text-rose-400' :
                              log.event_type === 'MAINTENANCE' ? 'bg-amber-500/20 text-amber-400' :
                                log.event_type === 'CONFIG_CHANGE' ? 'bg-cyan-500/20 text-cyan-400' :
                                  'bg-slate-700/50 text-slate-300'
                            }`}>
                            {log.event_type}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-[11px] text-slate-300">{log.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'firmware' && (
        <div className="animate-in fade-in duration-500">
          <div className="bg-[#1e293b] rounded-[1.5rem] sm:rounded-[2rem] border border-slate-800/40 p-6 sm:p-8 shadow-2xl mb-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div>
                <h3 className="text-white font-bold text-xs sm:text-sm uppercase tracking-widest mb-1">Generador de Firmware IA</h3>
                <p className="text-slate-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest">Código C++ para {device.hardwareConfig?.hardware}</p>
              </div>
              <button onClick={async () => {
                if (!device.hardwareConfig) return;
                setIsGenerating(true);
                try {
                  const res = await generateIoTCode(
                    device.hardwareConfig.hardware,
                    device.hardwareConfig.sensor as SensorType,
                    device.hardwareConfig.protocol,
                    device.hardwareConfig.endpoint,
                    device.hardwareConfig.networkMode
                  );
                  setGeneratedSketch(res);
                } catch (e) { console.error(e); }
                finally { setIsGenerating(false); }
              }} disabled={isGenerating} className="w-full sm:w-auto px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-cyan-900/20 disabled:opacity-50">
                {isGenerating ? 'Generando...' : 'Generar Sketch'}
              </button>
            </div>
          </div>
          {generatedSketch && <CodeViewer code={generatedSketch.code} explanation={generatedSketch.explanation} />}
        </div>
      )}
    </div>
  );
};

export default DeviceDetail;
