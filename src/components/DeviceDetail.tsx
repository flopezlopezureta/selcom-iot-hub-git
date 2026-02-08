// DeviceDetail.tsx - v1.7.0 - Pure SVG Restoration (Zero-Interference)
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Device, SensorType, AuditLog, NotificationSettings } from '../types';
import { generateIoTCode } from '../services/geminiService';
import { databaseService } from '../services/databaseService';
import CodeViewer from './CodeViewer';
import Gauge from './Gauge';

interface DeviceDetailProps {
  device: Device;
  mode?: 'normal' | 'grafana';
  onBack: () => void;
  onRefresh: () => void;
}

type TabType = 'monitoring' | 'history' | 'audit' | 'firmware' | 'troubleshooting' | 'controls';

const DeviceDetail: React.FC<DeviceDetailProps> = ({ device, mode = 'normal', onBack, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<TabType>('monitoring');
  const [dataPoints, setDataPoints] = useState<{ value: number; time: string; date: string; timestamp: number }[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartHeight = 320;

  const [minThreshold, setMinThreshold] = useState<number>(Number(device.thresholds?.min) || 1.0);
  const [maxThreshold, setMaxThreshold] = useState<number>(Number(device.thresholds?.max) || 9.0);

  // Local string states for smooth input typing
  const [minInput, setMinInput] = useState(String(device.thresholds?.min || 1.0));
  const [maxInput, setMaxInput] = useState(String(device.thresholds?.max || 9.0));

  useEffect(() => {
    if (!draggingThreshold) {
      setMinInput(minThreshold.toFixed(1));
    }
  }, [minThreshold]);

  useEffect(() => {
    if (!draggingThreshold) {
      setMaxInput(maxThreshold.toFixed(1));
    }
  }, [maxThreshold]);

  const [intervalSec, setIntervalSec] = useState<number>(device.hardwareConfig?.interval || 10);
  const [timeRange, setTimeRange] = useState<number>(5);
  const [draggingThreshold, setDraggingThreshold] = useState<'min' | 'max' | null>(null);

  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(device.maintenance_mode || false);
  const [calibrationOffset, setCalibrationOffset] = useState<number>(device.calibration_offset || 0);
  const [heartbeatInterval, setHeartbeatInterval] = useState<number>(device.heartbeat_interval || 1800);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(device.notification_settings || {
    push: true,
    critical_only: true
  });

  const [actuatorLevels, setActuatorLevels] = useState<Record<number, boolean>>(device.actuator_states || {});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSketch, setGeneratedSketch] = useState<{ code: string, explanation: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: device.name, mac_address: device.mac_address, unit: device.unit });

  useEffect(() => {
    setEditForm({ name: device.name, mac_address: device.mac_address, unit: device.unit });
  }, [device]);

  const timeOptions = [
    { label: '5m', value: 5 }, { label: '15m', value: 15 }, { label: '1h', value: 60 }, { label: '12h', value: 720 }
  ];

  // Logic for Historico
  useEffect(() => {
    const loadHistory = async () => {
      const history = await databaseService.getMeasurements(device.id, 100);
      if (Array.isArray(history) && history.length > 0) {
        const mapped = history.map((h: any) => {
          const timestampStr = h.timestamp.includes('Z') || h.timestamp.includes('+') ? h.timestamp : h.timestamp.replace(' ', 'T') + 'Z';
          const d = new Date(timestampStr);
          return {
            value: Number(parseFloat(h.value).toFixed(2)),
            time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            date: d.toLocaleDateString(),
            timestamp: d.getTime()
          };
        });
        setDataPoints(mapped);
      } else {
        const now = new Date();
        setDataPoints([{
          value: Number(device.value),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          date: now.toLocaleDateString(),
          timestamp: now.getTime()
        }]);
      }
    };
    loadHistory();
    const interval = setInterval(loadHistory, 3000);
    return () => clearInterval(interval);
  }, [device.id]);

  // Sync state with props
  useEffect(() => {
    if (!draggingThreshold) {
      if (device.thresholds) {
        setMinThreshold(Number(device.thresholds.min));
        setMaxThreshold(Number(device.thresholds.max));
      }
      setMaintenanceMode(device.maintenance_mode || false);
      setCalibrationOffset(device.calibration_offset || 0);
      setHeartbeatInterval(device.heartbeat_interval || 1800);
    }
  }, [device.id, device.thresholds, device.maintenance_mode, device.calibration_offset, device.heartbeat_interval, draggingThreshold]);

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
    onRefresh();
  };

  const saveThresholds = () => {
    const min = parseFloat(minInput);
    const max = parseFloat(maxInput);
    if (!isNaN(min) && !isNaN(max)) {
      setMinThreshold(min);
      setMaxThreshold(max);
      databaseService.updateDevice(device.id, { thresholds: { min, max } });
      onRefresh();
    }
  };

  const saveFromDrag = () => {
    databaseService.updateDevice(device.id, { thresholds: { min: minThreshold, max: maxThreshold } });
    onRefresh();
  };

  const chartDomain = useMemo(() => {
    const values = dataPoints.map(p => p.value);
    const minVal = Math.min(...values, minThreshold, maxThreshold);
    const maxVal = Math.max(...values, minThreshold, maxThreshold);
    const padding = (maxVal - minVal) * 0.3 || 2;
    return [minVal - padding, maxVal + padding];
  }, [dataPoints, minThreshold, maxThreshold]);

  const getYPos = (val: number) => {
    const [minD, maxD] = chartDomain;
    const range = maxD - minD;
    return chartHeight - ((val - minD) / range) * chartHeight;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggingThreshold) {
      const ratio = (chartHeight - y) / chartHeight;
      const [minD, maxD] = chartDomain;
      const newValue = minD + (ratio * (maxD - minD));
      const roundedValue = Math.round(newValue * 10) / 10;
      if (draggingThreshold === 'min') setMinThreshold(Math.min(roundedValue, maxThreshold - 0.5));
      else setMaxThreshold(Math.max(roundedValue, minThreshold + 0.5));
    } else {
      const index = Math.round((x / rect.width) * (dataPoints.length - 1));
      if (index >= 0 && index < dataPoints.length) setHoverIndex(index);
      else setHoverIndex(null);
    }
  };

  const chartPath = useMemo(() => {
    if (dataPoints.length < 2) return '';
    const [minD, maxD] = chartDomain;
    const range = maxD - minD;
    const points = dataPoints.map((d, i) => {
      const x = (i / (dataPoints.length - 1)) * 1000;
      const y = chartHeight - ((d.value - minD) / range) * chartHeight;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  }, [dataPoints, chartDomain]);

  const displayedValue = (Number(device.value) || 0) + (Number(calibrationOffset) || 0);
  const isOutOfRange = !maintenanceMode && (displayedValue < minThreshold || displayedValue > maxThreshold);

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.4); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #22d3ee; border-radius: 10px; border: 2px solid #0f172a; }
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { opacity: 1 !important; appearance: auto !important; }
      `}</style>

      <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20 overflow-visible">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 bg-slate-800/80 text-slate-300 rounded-lg hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <h2 className="text-white text-xl sm:text-2xl font-bold tracking-tight truncate">{device.name}</h2>
                <button onClick={() => setShowEditModal(true)} className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-cyan-400 hover:bg-slate-700 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
              </div>
              <p className="text-slate-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] truncate">ID: {device.mac_address}</p>
            </div>
          </div>
          <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 overflow-x-auto shadow-inner no-scrollbar">
            {['monitoring', 'controls', 'history', 'audit', 'firmware'].map((t) => (
              <button key={t} onClick={() => setActiveTab(t as TabType)} className={`px-4 lg:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'bg-cyan-500 text-[#0f172a] shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                {t === 'monitoring' ? 'Monitor' : t === 'controls' ? 'Control' : t === 'history' ? 'Historial' : t === 'audit' ? 'Eventos' : t}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'monitoring' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              <div className={`rounded-[2rem] border p-10 shadow-2xl relative overflow-hidden group transition-all duration-700 bg-[#1e293b] border-slate-800/40`}>
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                      <h3 className="text-white font-black text-xs tracking-[0.3em] uppercase">Telemetría Real-Time</h3>
                    </div>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">v1.7.0 SVG Engine</p>
                  </div>
                  <p className="text-white font-mono text-sm font-bold">{dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].time : '--:--:--'}</p>
                </div>

                <div className="flex flex-col md:flex-row items-stretch gap-6 py-4">
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-900/40 rounded-2xl border border-slate-700/20 min-w-[140px]">
                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mb-2">Actual</span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-4xl font-black brand-logo tracking-tighter tabular-nums ${isOutOfRange ? 'text-rose-500' : 'text-cyan-400'}`}>
                        {displayedValue.toFixed(1)}
                      </span>
                      <span className="text-slate-500 text-xs font-bold uppercase">{device.unit}</span>
                    </div>
                  </div>

                  <div
                    className="flex-1 w-full h-[320px] bg-slate-900/40 rounded-2xl border border-slate-700/30 p-4 relative overflow-hidden"
                    ref={containerRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoverIndex(null)}
                    onMouseUp={() => { if (draggingThreshold) { saveFromDrag(); setDraggingThreshold(null); } }}
                  >
                    <svg className="w-full h-full" viewBox={`0 0 1000 ${chartHeight}`} preserveAspectRatio="none" style={{ cursor: draggingThreshold ? 'ns-resize' : 'crosshair' }}>
                      <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={isOutOfRange ? "#f43f5e" : "#22d3ee"} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={isOutOfRange ? "#f43f5e" : "#22d3ee"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <g opacity="0.1">
                        {[0, 0.25, 0.5, 0.75, 1].map(p => (
                          <line key={p} x1="0" y1={chartHeight * p} x2="1000" y2={chartHeight * p} stroke="#64748b" strokeWidth="1" />
                        ))}
                      </g>
                      {chartPath && <path d={`${chartPath} L 1000,${chartHeight} L 0,${chartHeight} Z`} fill="url(#colorVal)" />}
                      {chartPath && <path d={chartPath} fill="none" stroke={isOutOfRange ? "#f43f5e" : "#22d3ee"} strokeWidth="3" strokeLinejoin="round" />}
                      {hoverIndex !== null && dataPoints[hoverIndex] && !draggingThreshold && (
                        <g>
                          <line x1={(hoverIndex / (dataPoints.length - 1)) * 1000} y1="0" x2={(hoverIndex / (dataPoints.length - 1)) * 1000} y2={chartHeight} stroke="#ffffff44" strokeWidth="1" strokeDasharray="4 4" />
                          <circle cx={(hoverIndex / (dataPoints.length - 1)) * 1000} cy={getYPos(dataPoints[hoverIndex].value)} r="5" fill={isOutOfRange ? "#f43f5e" : "#22d3ee"} stroke="#fff" strokeWidth="2" />
                        </g>
                      )}
                    </svg>

                    {/* Draggable Threshold Lines */}
                    <div className="absolute left-0 right-0 border-t-2 border-dashed border-rose-500/60 z-20 group cursor-ns-resize" style={{ top: `${getYPos(maxThreshold)}px`, padding: '12px 0', marginTop: '-12px' }} onMouseDown={() => setDraggingThreshold('max')}>
                      <div className="absolute right-4 -top-3 bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-tighter opacity-60 group-hover:opacity-100 transition-opacity">MAX: {maxThreshold.toFixed(1)}</div>
                    </div>
                    <div className="absolute left-0 right-0 border-t-2 border-dashed border-rose-500/60 z-20 group cursor-ns-resize" style={{ top: `${getYPos(minThreshold)}px`, padding: '12px 0', marginTop: '-12px' }} onMouseDown={() => setDraggingThreshold('min')}>
                      <div className="absolute right-4 -top-3 bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-tighter opacity-60 group-hover:opacity-100 transition-opacity">MIN: {minThreshold.toFixed(1)}</div>
                    </div>

                    {/* Manual Tooltip Card */}
                    {hoverIndex !== null && dataPoints[hoverIndex] && !draggingThreshold && (
                      <div className="absolute z-30 pointer-events-none bg-slate-900/95 border border-slate-700/50 p-3 rounded-xl shadow-2xl backdrop-blur-md -translate-x-1/2 -translate-y-[120%]" style={{ left: `${(hoverIndex / (dataPoints.length - 1)) * 100}%`, top: `${getYPos(dataPoints[hoverIndex].value)}px` }}>
                        <div className="text-white font-black text-sm tabular-nums mb-0.5">{dataPoints[hoverIndex].value.toFixed(2)} <span className="text-[10px] text-slate-500">{device.unit}</span></div>
                        <div className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">{dataPoints[hoverIndex].time}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={`bg-[#1e293b] rounded-[1.5rem] mt-6 sm:rounded-[2rem] border-2 p-6 sm:p-8 transition-all ${isOutOfRange ? 'border-rose-500/50 bg-rose-500/5 shadow-[0_0_30px_rgba(244,63,94,0.2)]' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
                <h4 className="text-white text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-4">Estado Alarma</h4>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${isOutOfRange ? 'bg-rose-500 animate-ping' : maintenanceMode ? 'bg-amber-500' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]'}`}></div>
                  <span className={`text-sm sm:text-lg font-black uppercase ${isOutOfRange ? 'text-rose-400' : maintenanceMode ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {maintenanceMode ? 'MANTENIMIENTO' : isOutOfRange ? 'FUERA DE RANGO' : 'SISTEMA ÓPTIMO'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-[#1e293b] rounded-[1.5rem] sm:rounded-[2rem] border border-slate-800/40 p-6 sm:p-8 shadow-2xl">
                <h3 className="text-white font-bold text-xs uppercase tracking-widest mb-6 border-b border-slate-800 pb-4">Ajustes Rápidos</h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-white uppercase tracking-widest block mb-4">Mantenimiento</label>
                    <button onClick={() => { const v = !maintenanceMode; setMaintenanceMode(v); handleUpdateDevice({ maintenance_mode: v }); }} className={`w-full py-3 rounded-xl border text-[10px] font-black uppercase transition-all ${maintenanceMode ? 'bg-amber-500 text-[#0f172a] border-amber-400' : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-white'}`}>
                      {maintenanceMode ? 'Activado' : 'Desactivado'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-slate-500 font-black uppercase mb-2 block text-center">Mínimo</label>
                      <input type="number" step="0.1" value={minInput} onChange={e => setMinInput(e.target.value)} onBlur={saveThresholds} className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 text-center font-mono font-bold outline-none focus:border-cyan-500" />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-black uppercase mb-2 block text-center">Máximo</label>
                      <input type="number" step="0.1" value={maxInput} onChange={e => setMaxInput(e.target.value)} onBlur={saveThresholds} className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 text-center font-mono font-bold outline-none focus:border-cyan-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-white uppercase tracking-widest block mb-4">Calibración Offset</label>
                    <input type="number" step="0.1" value={calibrationOffset} onChange={e => setCalibrationOffset(parseFloat(e.target.value))} onBlur={() => handleUpdateDevice({ calibration_offset: calibrationOffset })} className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 text-center font-mono font-bold outline-none focus:border-cyan-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Similar logic for history, audit, etc. simplified for restoration stability */}
        {activeTab === 'history' && (
          <div className="bg-[#1e293b] rounded-[1.5rem] border border-slate-800/40 p-8 shadow-2xl">
            <h3 className="text-white font-bold text-xs uppercase mb-6 tracking-widest">Historial de Mediciones</h3>
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
              <table className="w-full text-left">
                <thead className="bg-[#0f172a] text-[9px] font-black text-slate-500 uppercase tracking-widest sticky top-0">
                  <tr><th className="p-4">Timestamp</th><th className="p-4">Valor</th><th className="p-4">Estado</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {[...dataPoints].reverse().map((p, i) => (
                    <tr key={i} className="hover:bg-slate-900/30 font-mono text-xs">
                      <td className="p-4"><span className="text-white">{p.date}</span> <span className="text-slate-500">{p.time}</span></td>
                      <td className="p-4 font-black text-cyan-400">{p.value.toFixed(2)} {device.unit}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${p.value < minThreshold || p.value > maxThreshold ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {p.value < minThreshold || p.value > maxThreshold ? 'Alerta' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FW Generator */}
        {activeTab === 'firmware' && (
          <div className="animate-in fade-in duration-500">
            <div className="bg-[#1e293b] rounded-[1.5rem] sm:rounded-[2rem] border border-slate-800/40 p-6 sm:p-8 shadow-2xl mb-8 text-center sm:text-left">
              <h3 className="text-white font-bold text-xs uppercase tracking-widest mb-4">Generador de Firmware IA</h3>
              <button onClick={async () => {
                if (!device.hardwareConfig) return;
                setIsGenerating(true);
                try {
                  const res = await generateIoTCode(device.hardwareConfig.hardware, device.hardwareConfig.sensor as SensorType, device.hardwareConfig.protocol, device.hardwareConfig.endpoint, device.hardwareConfig.networkMode, undefined, device.actuators);
                  setGeneratedSketch(res);
                } catch (e) { console.error(e); }
                finally { setIsGenerating(false); }
              }} disabled={isGenerating} className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">
                {isGenerating ? 'Generando...' : 'Generar Sketch para ' + (device.hardwareConfig?.hardware || 'Node')}
              </button>
            </div>
            {generatedSketch && <CodeViewer code={generatedSketch.code} explanation={generatedSketch.explanation} />}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1e293b] border border-slate-800 rounded-[2.5rem] p-8 max-w-lg w-full">
            <h4 className="text-white font-bold text-lg uppercase tracking-widest mb-8 text-center">Editar Dispositivo</h4>
            <div className="space-y-5">
              <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 text-white text-sm outline-none" placeholder="Nombre" />
              <input type="text" value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 text-white text-sm outline-none" placeholder="Unidad" />
              <div className="flex gap-4 pt-8 border-t border-slate-800">
                <button onClick={() => setShowEditModal(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase">Cancelar</button>
                <button onClick={async () => { await handleUpdateDevice(editForm); setShowEditModal(false); }} className="flex-1 py-4 bg-cyan-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-cyan-900/20">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeviceDetail;
