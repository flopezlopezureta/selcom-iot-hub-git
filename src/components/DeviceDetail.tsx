// DeviceDetail.tsx - v1.5.3 - Final UI Polish
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Device, SensorType, AuditLog, NotificationSettings } from '../types';
import { generateIoTCode } from '../services/geminiService';
import { databaseService } from '../services/databaseService';
import CodeViewer from './CodeViewer';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
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

  const [minThreshold, setMinThreshold] = useState<number>(device.thresholds?.min ?? 20);
  const [maxThreshold, setMaxThreshold] = useState<number>(device.thresholds?.max ?? 80);

  // Local string states for smooth input typing (allows decimal points)
  const [minInput, setMinInput] = useState(String(device.thresholds?.min ?? 20));
  const [maxInput, setMaxInput] = useState(String(device.thresholds?.max ?? 80));

  useEffect(() => {
    setMinInput(minThreshold.toFixed(1));
  }, [minThreshold]);

  useEffect(() => {
    setMaxInput(maxThreshold.toFixed(1));
  }, [maxThreshold]);

  const [intervalSec, setIntervalSec] = useState<number>(device.hardwareConfig?.interval || 10);
  const [timeRange, setTimeRange] = useState<number>(5);
  const [draggingThreshold, setDraggingThreshold] = useState<'min' | 'max' | null>(null);
  const chartRef = useRef<any>(null);

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
    push: true,
    critical_only: true
  });

  const [actuatorLevels, setActuatorLevels] = useState<Record<number, boolean>>(device.actuator_states || {});

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: device.name,
    mac_address: device.mac_address,
    unit: device.unit
  });

  // Sync edit form when device changes
  useEffect(() => {
    setEditForm({
      name: device.name,
      mac_address: device.mac_address,
      unit: device.unit
    });
  }, [device.id, device.name, device.mac_address, device.unit]);

  const handleSaveEdit = async () => {
    await databaseService.updateDevice(device.id, {
      name: editForm.name,
      mac_address: editForm.mac_address,
      unit: editForm.unit
    });
    setShowEditModal(false);
    onRefresh();
  };

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
          // Force UTC interpretation if not already specified
          const timestampStr = h.timestamp.includes('Z') || h.timestamp.includes('+')
            ? h.timestamp
            : h.timestamp.replace(' ', 'T') + 'Z';
          const d = new Date(timestampStr);
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

  const handleToggleActuator = async (pin: number) => {
    const newState = !actuatorLevels[pin];
    const newLevels = { ...actuatorLevels, [pin]: newState };
    setActuatorLevels(newLevels);
    await databaseService.updateDevice(device.id, { actuator_states: newLevels });
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

  const handleMouseDown = (e: any) => {
    if (!e || !e.chartY || !e.viewBox) return;

    const { y, height } = e.viewBox;
    // Use stable chartDomain calculation logic instead of dynamic activeDomain
    const values = dataPoints.map(p => p.value);
    const minVal = Math.min(...values, minThreshold, maxThreshold);
    const maxVal = Math.max(...values, minThreshold, maxThreshold);
    const padding = (maxVal - minVal) * 0.2 || 1;
    const currentMinD = minVal - padding;
    const currentMaxD = maxVal + padding;
    const range = currentMaxD - currentMinD;

    // Calculate value: top of viewBox is maxD, bottom is minD
    const ratio = (e.chartY - y) / height;
    const clickValue = currentMaxD - (ratio * range);

    // Expand margin to 15% for even easier grabbing on small screens
    const thresholdMargin = range * 0.15;

    if (Math.abs(clickValue - maxThreshold) < thresholdMargin) {
      setDraggingThreshold('max');
    } else if (Math.abs(clickValue - minThreshold) < thresholdMargin) {
      setDraggingThreshold('min');
    }
  };

  const handleMouseMove = (e: any) => {
    if (!draggingThreshold || !e || !e.chartY || !e.viewBox) return;

    const { y, height } = e.viewBox;
    const [minD, maxD] = chartDomain;
    const range = maxD - minD;

    const ratio = (e.chartY - y) / height;
    const newValue = maxD - (ratio * range);
    const roundedValue = Math.round(newValue * 10) / 10;

    if (draggingThreshold === 'min') {
      setMinThreshold(Math.min(roundedValue, maxThreshold - 0.5));
    } else {
      setMaxThreshold(Math.max(roundedValue, minThreshold + 0.5));
    }
  };

  const handleMouseUp = () => {
    if (draggingThreshold) {
      saveFromDrag();
    }
    setDraggingThreshold(null);
  };

  // Ensure values are numbers to prevent "toFixed is not a function" error
  const safeValue = Number(device.value) || 0;
  const safeOffset = Number(calibrationOffset) || 0;
  const displayedValue = safeValue + safeOffset;

  // Calculate consistent domain for chart and dragging
  const chartDomain = useMemo(() => {
    const values = dataPoints.map(p => p.value);
    const minVal = Math.min(...values, minThreshold, maxThreshold);
    const maxVal = Math.max(...values, minThreshold, maxThreshold);
    const padding = (maxVal - minVal) * 0.3 || 2; // Increased padding for stability
    return [minVal - padding, maxVal + padding];
  }, [dataPoints, minThreshold, maxThreshold]);

  const isOutOfRange = !maintenanceMode && (displayedValue < minThreshold || displayedValue > maxThreshold);

  // Persistence helpers
  const saveThresholds = () => {
    const min = parseFloat(minInput);
    const max = parseFloat(maxInput);

    if (!isNaN(min) && !isNaN(max)) {
      setMinThreshold(min);
      setMaxThreshold(max);
      databaseService.updateDevice(device.id, {
        thresholds: { min, max }
      });
      onRefresh();
    }
  };

  const saveFromDrag = () => {
    databaseService.updateDevice(device.id, {
      thresholds: { min: minThreshold, max: maxThreshold }
    });
    onRefresh();
  };

  return (
    <>
      <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-12">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 bg-slate-800/80 text-slate-300 rounded-lg hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <h2 className="text-white text-xl sm:text-2xl font-bold tracking-tight truncate">{device.name}</h2>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-cyan-400 hover:bg-slate-700 transition-all"
                  title="Editar dispositivo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-slate-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] truncate">ID: {device.mac_address}</p>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${mode === 'grafana' ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                  Modo: {mode}
                </span>
              </div>
            </div>
          </div>
          <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 overflow-x-auto shadow-inner no-scrollbar">
            {['monitoring', 'controls', 'history', 'audit', 'firmware', 'troubleshooting'].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t as TabType)}
                className={`px-4 lg:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'bg-cyan-500 text-[#0f172a] shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                style={{ display: t === 'controls' && (!device.actuators || device.actuators.length === 0) ? 'none' : 'block' }}
              >
                {t === 'troubleshooting' ? 'Soporte' : t === 'history' ? 'Historial' : t === 'audit' ? 'Eventos' : t === 'monitoring' ? 'Monitor' : t === 'controls' ? 'Control' : t}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'monitoring' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              <div className={`rounded-[2rem] border p-10 shadow-2xl relative overflow-hidden group transition-all duration-700 ${mode === 'grafana' ? 'bg-[#0f172a] border-slate-700' : 'bg-[#1e293b] border-slate-800/40'}`}>
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
                      <h3 className="text-white font-black text-xs tracking-[0.3em] uppercase">Mecanismo de Telemetría Real-Time</h3>
                    </div>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Estado analógico sincronizado</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Última Señal</p>
                    <p className="text-white font-mono text-sm font-bold">{dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].time : '--:--:--'}</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-stretch gap-6 py-4">
                  {mode === 'grafana' ? (
                    <Gauge
                      value={displayedValue}
                      min={minThreshold}
                      max={maxThreshold}
                      unit={device.unit}
                      size={180}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-900/40 rounded-2xl border border-slate-700/20 min-w-[140px]">
                      <span className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mb-2">Actual</span>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-black brand-logo tracking-tighter tabular-nums ${isOutOfRange ? 'text-rose-500' : 'text-cyan-400'}`}>
                          {displayedValue.toFixed(1)}
                        </span>
                        <span className="text-slate-500 text-xs font-bold uppercase">{device.unit}</span>
                      </div>
                      <div className="mt-3 flex gap-4 text-[9px] font-bold">
                        <span className="text-rose-400">Min: {minThreshold.toFixed(1)}</span>
                        <span className="text-rose-400">Max: {maxThreshold.toFixed(1)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 w-full h-[320px] bg-slate-900/40 rounded-2xl border border-slate-700/30 p-4 overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={dataPoints}
                        margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        style={{ cursor: draggingThreshold ? 'ns-resize' : 'default' }}
                      >
                        <defs>
                          <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isOutOfRange ? "#f43f5e" : "#22d3ee"} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={isOutOfRange ? "#f43f5e" : "#22d3ee"} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                        <XAxis
                          dataKey="time"
                          tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }}
                          tickLine={{ stroke: '#334155' }}
                          axisLine={{ stroke: '#334155' }}
                        />
                        <YAxis
                          domain={chartDomain}
                          tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }}
                          tickLine={{ stroke: '#334155' }}
                          axisLine={{ stroke: '#334155' }}
                          width={40}
                        />
                        <Tooltip
                          active={draggingThreshold ? false : undefined}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: isOutOfRange ? '#f43f5e' : '#22d3ee',
                            borderRadius: '1rem',
                            color: '#fff',
                            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
                            padding: '12px 16px',
                            pointerEvents: 'none'
                          }}
                          wrapperStyle={{ pointerEvents: 'none' }}
                          formatter={(value: number) => [`${value.toFixed(2)} ${device.unit}`, 'Valor']}
                          labelFormatter={(label: string, payload: any[]) => {
                            if (payload && payload[0]) {
                              return `${payload[0].payload.date} ${label}`;
                            }
                            return label;
                          }}
                          labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}
                          itemStyle={{ color: isOutOfRange ? '#f43f5e' : '#22d3ee', fontWeight: 'bold', fontSize: '14px' }}
                          cursor={{ stroke: isOutOfRange ? '#f43f5e' : '#22d3ee', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        {/* Threshold Reference Lines */}
                        {/* Hidden Wide Hit Areas for easiest dragging */}
                        <ReferenceLine
                          y={minThreshold}
                          stroke="transparent"
                          strokeWidth={20}
                          isFront
                          style={{ cursor: 'ns-resize' }}
                          onMouseDown={() => setDraggingThreshold('min')}
                        />
                        <ReferenceLine
                          y={maxThreshold}
                          stroke="transparent"
                          strokeWidth={20}
                          isFront
                          style={{ cursor: 'ns-resize' }}
                          onMouseDown={() => setDraggingThreshold('max')}
                        />

                        {/* Visible Lines */}
                        <ReferenceLine
                          y={minThreshold}
                          stroke="#f43f5e"
                          strokeDasharray="5 5"
                          strokeWidth={draggingThreshold === 'min' ? 4 : 2}
                          isFront
                          label={{
                            value: `Min: ${minThreshold.toFixed(1)}`,
                            fill: '#f43f5e',
                            fontSize: 10,
                            fontWeight: 'bold',
                            position: 'left'
                          }}
                        />
                        <ReferenceLine
                          y={maxThreshold}
                          stroke="#f43f5e"
                          strokeDasharray="5 5"
                          strokeWidth={draggingThreshold === 'max' ? 4 : 2}
                          isFront
                          label={{
                            value: `Max: ${maxThreshold.toFixed(1)}`,
                            fill: '#f43f5e',
                            fontSize: 10,
                            fontWeight: 'bold',
                            position: 'left'
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={isOutOfRange ? "#f43f5e" : "#22d3ee"}
                          strokeWidth={3}
                          fill="url(#colorVal)"
                          animationDuration={1500}
                          dot={false}
                          activeDot={{ r: 6, fill: isOutOfRange ? "#f43f5e" : "#22d3ee", stroke: '#fff', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>


            <div className="space-y-6 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar border-t border-slate-800/30 pt-4">
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
                          type="text"
                          inputMode="decimal"
                          value={minInput}
                          onChange={e => setMinInput(e.target.value)}
                          onBlur={saveThresholds}
                          className="w-full bg-transparent text-white text-lg sm:text-xl font-black font-mono leading-none text-center outline-none"
                        />
                      </div>
                      <div className="bg-slate-900 border-2 border-slate-800 p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-inner text-center">
                        <p className="text-[9px] text-slate-400 font-black uppercase mb-1">Máximo</p>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={maxInput}
                          onChange={e => setMaxInput(e.target.value)}
                          onBlur={saveThresholds}
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
                      device.hardwareConfig.networkMode,
                      undefined,
                      device.actuators
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
        )
        }

        {
          activeTab === 'controls' && device.actuators && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-[#1e293b] rounded-[2rem] border border-slate-800 p-10 shadow-2xl">
                <div className="flex items-center gap-6 mb-12">
                  <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-rose-500 border border-slate-800 shadow-inner">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Centro de Control de Salidas</h3>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Gestión de actuadores y lógica de campo</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {device.actuators.map((act) => (
                    <div key={act.pin} className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-800/10 rounded-full -mr-12 -mt-12 transition-all group-hover:bg-slate-800/20"></div>

                      <div className="flex justify-between items-start relative z-10 mb-8">
                        <div>
                          <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Pin GPIO {act.pin}</p>
                          <h4 className="text-white text-lg font-bold uppercase">{act.name}</h4>
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${act.mode === 'manual' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                          {act.mode === 'manual' ? 'Manual' : act.mode === 'auto_high' ? 'Auto >' : 'Auto <'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-slate-950/50 p-6 rounded-3xl border border-slate-800/50">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado Actual</span>
                          <span className={`text-sm font-black uppercase mt-1 ${actuatorLevels[act.pin] ? 'text-emerald-400' : 'text-slate-600'}`}>
                            {actuatorLevels[act.pin] ? 'Activo (HIGH)' : 'Inactivo (LOW)'}
                          </span>
                        </div>

                        {act.mode === 'manual' ? (
                          <button
                            onClick={() => handleToggleActuator(act.pin)}
                            className={`w-16 h-8 rounded-full p-1 transition-all duration-300 ${actuatorLevels[act.pin] ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-slate-700'}`}
                          >
                            <div className={`w-6 h-6 rounded-full bg-white shadow-lg transform transition-transform duration-300 ${actuatorLevels[act.pin] ? 'translate-x-8' : 'translate-x-0'}`} />
                          </button>
                        ) : (
                          <div className="text-right">
                            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">En Control Auto</p>
                            <p className="text-white font-mono text-xs font-bold mt-1">Uptate: {act.threshold} {device.unit}</p>
                          </div>
                        )}
                      </div>

                      {act.mode !== 'manual' && (
                        <p className="mt-6 text-[9px] text-slate-500 leading-relaxed font-medium italic">
                          * Este pin es controlado automáticamente por el hardware basado en el sensor principal. Los cambios manuales están bloqueados.
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {(!device.actuators || device.actuators.length === 0) && (
                  <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest">No hay actuadores configurados para este dispositivo.</p>
                  </div>
                )}
              </div>
            </div>
          )
        }
      </div>

      {/* Edit Device Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1e293b] border border-slate-800 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-6">
              <div className="p-3 bg-cyan-500 rounded-2xl text-[#0f172a]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h4 className="text-white font-bold text-lg uppercase tracking-widest">Editar Dispositivo</h4>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Modificar datos de identificación</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Nombre del Dispositivo</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 text-white text-sm outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                  placeholder="Nombre del sensor"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">ID Dispositivo</label>
                <input
                  type="text"
                  value={editForm.mac_address}
                  onChange={(e) => setEditForm({ ...editForm, mac_address: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 text-white text-sm font-mono outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                  placeholder="ESP32S3-001001"
                />
                <p className="text-[9px] text-slate-600 mt-2 ml-1 uppercase font-bold">Este ID debe coincidir con el del ESP32</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Unidad de Medida</label>
                <input
                  type="text"
                  value={editForm.unit}
                  onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 text-white text-sm outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                  placeholder="m, °C, bar, %..."
                />
              </div>
            </div>

            <div className="flex gap-4 pt-8 mt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditForm({ name: device.name, mac_address: device.mac_address, unit: device.unit });
                }}
                className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 py-4 bg-cyan-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-cyan-900/20 hover:bg-cyan-500 transition-all"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeviceDetail;
