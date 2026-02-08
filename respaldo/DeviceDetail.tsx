
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Device, Client, DeviceLog } from '../types';
import { databaseService } from '../services/databaseService';

interface DeviceDetailProps {
  device: Device;
  onBack: () => void;
  isDemoMode: boolean; // Mantenemos el tipo pero lo ignoramos internamente para no romper la firma
  onUpdateDevice: (device: Device) => void;
}

type TabType = 'monitor' | 'history' | 'config';

const DeviceDetail: React.FC<DeviceDetailProps> = ({ device, onBack, onUpdateDevice }) => {
  const [activeTab, setActiveTab] = useState<TabType>('monitor');
  const [dataPoints, setDataPoints] = useState<{ value: number; time: string }[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartHeight = 320;

  // Estados de configuración local
  const [highLimit, setHighLimit] = useState(device.highLimit || 90);
  const [lowLimit, setLowLimit] = useState(device.lowLimit || 10);
  const [calibrationOffset, setCalibrationOffset] = useState(device.calibrationOffset || 0);
  const [heartbeatInterval, setHeartbeatInterval] = useState(device.heartbeatInterval || 10);
  const [isMaintenance, setIsMaintenance] = useState(device.status === 'maintenance');
  
  const [draggingLine, setDraggingLine] = useState<'high' | 'low' | null>(null);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [clientInfo, setClientInfo] = useState<Client | null>(null);

  useEffect(() => {
    setHighLimit(device.highLimit || 90);
    setLowLimit(device.lowLimit || 10);
    setCalibrationOffset(device.calibrationOffset || 0);
    setIsMaintenance(device.status === 'maintenance');
    
    if (device.clientId) {
      const clients = databaseService.getClients();
      const owner = clients.find(c => c.id === device.clientId);
      if (owner) setClientInfo(owner);
    }
  }, [device]);

  useEffect(() => {
    // INICIO LIMPIO: En producción solo mostramos el valor actual como punto inicial.
    // Sin backend real, no hay histórico, así que inicializamos con el valor actual.
    const now = new Date();
    const initial = [
        {
            value: device.value,
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ];
    setDataPoints(initial);
    // Se ha eliminado el setInterval que generaba ruido aleatorio.
  }, [device.value, calibrationOffset]);

  const stats = useMemo(() => {
    if (dataPoints.length === 0) return { avg: '0', min: '0', max: '0', uptime: '99,9 %', latest: '--', rawLatest: 0 };
    const values = dataPoints.map(d => d.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = dataPoints[dataPoints.length - 1].value;
    
    return {
      avg: avg.toFixed(1).replace('.', ','),
      min: min.toFixed(1).replace('.', ','),
      max: max.toFixed(1).replace('.', ','),
      latest: latest.toFixed(1).replace('.', ','),
      rawLatest: latest,
      uptime: '99,9 %'
    };
  }, [dataPoints]);

  useEffect(() => {
    if (!isMaintenance && (stats.rawLatest > highLimit || stats.rawLatest < lowLimit)) {
      setIsAlarmActive(true);
    } else {
      setIsAlarmActive(false);
    }
  }, [stats.rawLatest, highLimit, lowLimit, isMaintenance]);

  const handleSendWhatsApp = () => {
    if (!clientInfo || !clientInfo.phone) {
      alert("Este dispositivo no tiene un cliente con WhatsApp configurado.");
      return;
    }
    const message = `🚨 *ALERTA SELCOM IOT* 🚨%0A%0ADispositivo: ${device.name}%0AID: ${device.id}%0A%0A⚠️ *VALOR FUERA DE RANGO*%0AValor Actual: ${stats.latest} ${device.unit}%0ALímite Configurado: ${stats.rawLatest > highLimit ? highLimit : lowLimit} ${device.unit}%0A%0APor favor verificar el equipo inmediatamente.`;
    window.open(`https://wa.me/${clientInfo.phone}?text=${message}`, '_blank');
  };

  const handleSaveConfig = () => {
     const newStatus = isMaintenance ? 'maintenance' : (device.status === 'maintenance' ? 'online' : device.status);
     const newLog: DeviceLog = {
         id: `l${Date.now()}`,
         timestamp: new Date().toISOString(),
         type: 'CONFIG',
         message: `Actualización manual: Mantenimiento=${isMaintenance}, Offset=${calibrationOffset}, Intervalo=${heartbeatInterval}min`,
         user: 'Admin'
     };
     
     const currentLogs = device.logs || [];

     onUpdateDevice({
         ...device,
         status: newStatus,
         calibrationOffset: calibrationOffset,
         heartbeatInterval: heartbeatInterval,
         logs: [newLog, ...currentLogs]
     });
     alert("Configuración guardada exitosamente.");
  };

  // --- CHART LOGIC ---
  const handleMouseDown = (type: 'high' | 'low') => (e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingLine(type);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (draggingLine) {
      const y = e.clientY - rect.top;
      let newValue = ((chartHeight - y) / chartHeight) * 100;
      newValue = Math.max(0, Math.min(100, newValue));
      if (draggingLine === 'high') setHighLimit(newValue);
      else setLowLimit(newValue);
    } else {
      const x = e.clientX - rect.left;
      const index = Math.round((x / rect.width) * (dataPoints.length - 1));
      if (index >= 0 && index < dataPoints.length) setHoverIndex(index);
    }
  };

  const handleMouseUp = () => {
    if (draggingLine) {
      onUpdateDevice({ ...device, highLimit, lowLimit });
      setDraggingLine(null);
    }
  };

  const chartPath = useMemo(() => {
    const width = 1000;
    const maxVal = 100; 
    // Si solo hay un punto, duplicarlo para dibujar una línea plana
    let pointsToRender = dataPoints;
    if (dataPoints.length === 1) {
        pointsToRender = [{...dataPoints[0], time: ''}, dataPoints[0]];
    }

    const points = pointsToRender.map((d, i) => {
      const x = (i / (pointsToRender.length - 1)) * width;
      const y = chartHeight - (d.value / maxVal) * chartHeight;
      return `${x},${y}`;
    });
    return points.length > 0 ? `M ${points.join(' L ')}` : '';
  }, [dataPoints, chartHeight]);

  const getYPos = (val: number) => chartHeight - (val / 100) * chartHeight;

  return (
    <div className={`space-y-6 animate-in slide-in-from-bottom-4 duration-500 relative ${isAlarmActive ? 'p-2' : ''}`} onMouseUp={handleMouseUp}>
      
      {/* Alarma Visual Overlay */}
      {isAlarmActive && (
        <div className="fixed inset-0 border-[12px] border-red-600/50 z-50 pointer-events-none animate-pulse"></div>
      )}

      {/* Header Alarma */}
      {isAlarmActive && (
        <div className="bg-red-600 text-white p-4 rounded-xl flex items-center justify-between shadow-lg shadow-red-900/50 animate-bounce">
          <div className="flex items-center gap-3">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
             <div>
               <h3 className="font-black text-lg uppercase tracking-widest">Alerta Crítica Detectada</h3>
               <p className="text-sm font-medium">Valor actual ({stats.latest} {device.unit}) fuera de rango.</p>
             </div>
          </div>
          <button onClick={handleSendWhatsApp} className="bg-white text-red-600 px-6 py-2 rounded-lg font-bold uppercase text-xs flex items-center gap-2 hover:bg-slate-100 transition-colors">
             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
             Notificar WhatsApp
          </button>
        </div>
      )}

      {/* Header Info Dispositivo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-slate-800/80 text-slate-300 rounded-lg hover:text-white transition-all hover:bg-slate-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <div>
            <h2 className="text-white text-2xl font-bold tracking-tight flex items-center gap-3">
                {device.name}
                {isMaintenance && <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded font-bold uppercase tracking-widest">En Mantenimiento</span>}
            </h2>
            <div className="flex items-center gap-2">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">ID: {device.id} • FW: {device.firmwareVersion || 'v1.0.0'}</p>
              {clientInfo && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">Cliente: {clientInfo.companyName}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="border-b border-slate-800 flex gap-6">
        <button 
            onClick={() => setActiveTab('monitor')}
            className={`pb-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'monitor' ? 'text-cyan-400 border-cyan-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
        >
            Monitoreo en Vivo
        </button>
        <button 
            onClick={() => setActiveTab('history')}
            className={`pb-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'history' ? 'text-cyan-400 border-cyan-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
        >
            Historial de Eventos
        </button>
        <button 
            onClick={() => setActiveTab('config')}
            className={`pb-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'config' ? 'text-cyan-400 border-cyan-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
        >
            Configuración Avanzada
        </button>
      </div>

      {/* CONTENIDO TABS */}
      {activeTab === 'monitor' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Gráfico Principal */}
            <div className={`lg:col-span-3 bg-[#1e293b] rounded-[2rem] border transition-all duration-300 p-8 overflow-hidden relative shadow-2xl ${isAlarmActive ? 'border-red-500 shadow-red-500/20' : 'border-slate-800/40'}`}>
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                <svg className={`w-5 h-5 ${isAlarmActive ? 'text-red-500' : 'text-cyan-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                <h3 className="text-white font-bold text-sm tracking-wide">Tendencia en Tiempo Real</h3>
                </div>
                <div className="flex items-center gap-4 bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-800/50">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isAlarmActive ? 'bg-red-500 animate-ping' : 'bg-slate-500'}`}></span>
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Valor Actual:</span>
                    <span className={`${isAlarmActive ? 'text-red-500' : 'text-cyan-400'} font-bold text-sm`}>{stats.latest} {device.unit}</span>
                </div>
                </div>
            </div>

            <div 
                className={`h-[${chartHeight}px] w-full relative ${draggingLine ? 'cursor-ns-resize' : 'cursor-crosshair'}`}
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => { setHoverIndex(null); }}
                style={{ height: chartHeight }}
            >
                <div className="absolute inset-0 flex flex-col justify-between opacity-[0.05] pointer-events-none">
                {[100, 75, 50, 25, 0].map(val => (
                    <div key={val} className="w-full border-t border-slate-300 flex items-center">
                    <span className="text-[10px] text-slate-400 pr-3 -translate-y-1/2 font-bold">{val}</span>
                    </div>
                ))}
                </div>

                <div className="absolute w-full border-t-2 border-dashed border-rose-500/60 z-10 hover:border-rose-400 group cursor-ns-resize transition-colors" style={{ top: `${getYPos(highLimit)}px` }} onMouseDown={handleMouseDown('high')}>
                <div className="absolute right-0 -top-3 bg-rose-500 text-white text-[9px] font-bold px-1.5 rounded opacity-50 group-hover:opacity-100">MAX</div>
                </div>

                <div className="absolute w-full border-t-2 border-dashed border-amber-500/60 z-10 hover:border-amber-400 group cursor-ns-resize transition-colors" style={{ top: `${getYPos(lowLimit)}px` }} onMouseDown={handleMouseDown('low')}>
                <div className="absolute right-0 -top-3 bg-amber-500 text-black text-[9px] font-bold px-1.5 rounded opacity-50 group-hover:opacity-100">MIN</div>
                </div>

                <svg className="w-full h-full pointer-events-none" viewBox={`0 0 1000 ${chartHeight}`} preserveAspectRatio="none">
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isAlarmActive ? "#ef4444" : "#22d3ee"} stopOpacity="0.15" />
                    <stop offset="100%" stopColor={isAlarmActive ? "#ef4444" : "#22d3ee"} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={`${chartPath} L 1000,${chartHeight} L 0,${chartHeight} Z`} fill="url(#chartGradient)" />
                <path d={chartPath} fill="none" stroke={isAlarmActive ? "#ef4444" : "#22d3ee"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                
                {hoverIndex !== null && dataPoints[hoverIndex] && !draggingLine && (
                    <>
                    <line x1={(hoverIndex / (dataPoints.length - 1)) * 1000} y1="0" x2={(hoverIndex / (dataPoints.length - 1)) * 1000} y2={chartHeight} stroke="#22d3ee" strokeWidth="1" strokeDasharray="4 4" />
                    <circle cx={(hoverIndex / (dataPoints.length - 1)) * 1000} cy={chartHeight - (dataPoints[hoverIndex].value / 100) * chartHeight} r="6" fill="#22d3ee" />
                    </>
                )}
                </svg>

                {hoverIndex !== null && dataPoints[hoverIndex] && !draggingLine && (
                <div className="absolute pointer-events-none bg-slate-900/90 border border-cyan-500/30 px-3 py-2 rounded-xl shadow-2xl backdrop-blur-sm -translate-x-1/2 -translate-y-[110%]"
                    style={{ left: `${(hoverIndex / (dataPoints.length - 1)) * 100}%`, top: `${chartHeight - (dataPoints[hoverIndex].value / 100) * chartHeight}px` }}>
                    <p className="text-white font-bold text-sm leading-none mb-1">{dataPoints[hoverIndex].value.toFixed(1).replace('.', ',')} {device.unit}</p>
                    <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest leading-none">{dataPoints[hoverIndex].time}</p>
                </div>
                )}
            </div>
            </div>

            {/* Panel Control Rápido */}
            <div className="lg:col-span-1 space-y-6">
                 <div className="bg-[#1e293b] p-6 rounded-[2rem] border border-slate-800/40 shadow-xl h-full">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Estado Actual</h3>
                    <div className="space-y-4">
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                             <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Promedio (1h)</p>
                             <p className="text-white text-xl font-bold">{stats.avg} {device.unit}</p>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                             <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Mín / Máx</p>
                             <p className="text-white text-lg font-bold">{stats.min} / {stats.max}</p>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                             <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Uptime</p>
                             <p className="text-emerald-400 text-lg font-bold">{stats.uptime}</p>
                        </div>
                    </div>
                 </div>
            </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-[#1e293b] rounded-[2rem] border border-slate-800/40 p-8 shadow-xl animate-in fade-in slide-in-from-left-4 duration-300">
            <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Log de Auditoría y Eventos
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800">
                            <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fecha / Hora</th>
                            <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipo</th>
                            <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mensaje</th>
                            <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Usuario</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {(!device.logs || device.logs.length === 0) ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500 text-sm">No hay eventos registrados.</td>
                            </tr>
                        ) : (
                            device.logs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-900/30 transition-colors">
                                    <td className="p-4 text-sm font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                            log.type === 'ALARM' ? 'bg-rose-500/10 text-rose-400' :
                                            log.type === 'CONFIG' ? 'bg-cyan-500/10 text-cyan-400' :
                                            log.type === 'MAINTENANCE' ? 'bg-amber-500/10 text-amber-500' :
                                            'bg-slate-500/10 text-slate-400'
                                        }`}>
                                            {log.type}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-slate-300">{log.message}</td>
                                    <td className="p-4 text-sm text-slate-500 font-bold">{log.user || 'Sistema'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Panel Izquierdo: Configuración Técnica */}
            <div className="bg-[#1e293b] rounded-[2rem] border border-slate-800/40 p-8 shadow-xl">
                 <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>
                    Parámetros Operativos
                 </h3>
                 
                 <div className="space-y-6">
                     <div>
                         <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Offset de Calibración (+/-)</label>
                         <div className="flex items-center gap-2">
                             <input type="number" step="0.1" value={calibrationOffset} onChange={e => setCalibrationOffset(parseFloat(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none" />
                             <span className="text-slate-500 font-bold">{device.unit}</span>
                         </div>
                         <p className="text-[9px] text-slate-500 mt-2">Ajuste por software para corregir deriva del sensor sin reprogramar.</p>
                     </div>

                     <div>
                         <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Heartbeat Interval (Minutos)</label>
                         <input type="number" value={heartbeatInterval} onChange={e => setHeartbeatInterval(parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none" />
                         <p className="text-[9px] text-slate-500 mt-2">Tiempo máximo esperado entre reportes antes de marcar como Offline.</p>
                     </div>

                     <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
                         <div>
                             <p className="text-sm font-bold text-white">Modo Mantenimiento</p>
                             <p className="text-[10px] text-slate-500">Silencia todas las alarmas durante reparaciones.</p>
                         </div>
                         <button 
                             onClick={() => setIsMaintenance(!isMaintenance)}
                             className={`w-12 h-6 rounded-full transition-colors relative ${isMaintenance ? 'bg-amber-500' : 'bg-slate-700'}`}
                         >
                             <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isMaintenance ? 'left-7' : 'left-1'}`}></span>
                         </button>
                     </div>
                 </div>
            </div>

            {/* Panel Derecho: Guardar y Estado */}
            <div className="space-y-6">
                <div className="bg-[#1e293b] rounded-[2rem] border border-slate-800/40 p-8 shadow-xl">
                    <h3 className="text-white font-bold text-lg mb-4">Acciones de Firmware</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 border-b border-slate-800">
                            <span className="text-slate-400 text-sm">Versión Actual</span>
                            <span className="text-white font-mono font-bold">{device.firmwareVersion || 'v1.0.0'}</span>
                        </div>
                        <button className="w-full py-3 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest border border-slate-700 hover:bg-slate-700 transition-all">
                            Verificar Actualizaciones (OTA)
                        </button>
                        <button className="w-full py-3 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest border border-slate-700 hover:bg-slate-700 transition-all">
                            Reiniciar Dispositivo
                        </button>
                    </div>
                </div>

                <button 
                    onClick={handleSaveConfig}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/20 uppercase tracking-widest transition-all"
                >
                    Guardar Cambios
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default DeviceDetail;
