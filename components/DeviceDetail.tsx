
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Device, SensorType } from '../types';
import { generateIoTCode } from '../services/geminiService';
import { databaseService } from '../services/databaseService';
import CodeViewer from './CodeViewer';

interface DeviceDetailProps {
  device: Device;
  onBack: () => void;
  onRefresh: () => void;
}

type TabType = 'monitoring' | 'history' | 'firmware' | 'troubleshooting';

const DeviceDetail: React.FC<DeviceDetailProps> = ({ device, onBack, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<TabType>('monitoring');
  const [dataPoints, setDataPoints] = useState<{ value: number; time: string; date: string; timestamp: number }[]>([]);
  
  const [minThreshold, setMinThreshold] = useState<number>(device.thresholds?.min ?? 20);
  const [maxThreshold, setMaxThreshold] = useState<number>(device.thresholds?.max ?? 80);
  
  const [intervalSec, setIntervalSec] = useState<number>(device.hardwareConfig?.interval || 10);
  const [timeRange, setTimeRange] = useState<number>(5);
  const [draggingThreshold, setDraggingThreshold] = useState<'min' | 'max' | null>(null);
  
  const [generatedSketch, setGeneratedSketch] = useState<{code: string, explanation: string} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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
  }, [device.id, device.thresholds, device.hardwareConfig]);

  // Inicializar puntos al cargar el componente o cambiar rango de tiempo
  useEffect(() => {
    const now = new Date();
    const pointsCount = 60;
    const msPerPoint = (timeRange * 60 * 1000) / pointsCount;

    const initial = Array.from({ length: pointsCount }, (_, i) => {
      const ts = now.getTime() - (pointsCount - 1 - i) * msPerPoint;
      const d = new Date(ts);
      return {
        value: device.value + Math.sin(i * 0.3) * 5 + (Math.random() - 0.5) * 2,
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: d.toLocaleDateString(),
        timestamp: ts
      };
    });
    setDataPoints(initial);
  }, [device.id, timeRange]);

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

  const chartScales = useMemo(() => {
    if (dataPoints.length === 0) return { yTicks: [], xTicks: [], pathPoints: [], minThresholdY: 150, maxThresholdY: 50, range: 100, minVal: 0, maxVal: 100 };
    const vals = dataPoints.map(p => p.value);
    
    const minVal = Math.min(...vals, minThreshold) - 5;
    const maxVal = Math.max(...vals, maxThreshold) + 5;
    const range = Math.max(1, maxVal - minVal);
    
    const yTicks = Array.from({ length: 5 }, (_, i) => ({ 
      value: (maxVal - (range / 4) * i).toFixed(1), 
      pos: (i / 4) * 300 
    }));

    const xTicks = Array.from({ length: 6 }, (_, i) => {
      const index = Math.floor((i / 5) * (dataPoints.length - 1));
      return {
        label: dataPoints[index]?.time || '',
        pos: (i / 5) * 1000
      };
    });
    
    const pathPoints = dataPoints.map((d, i) => ({ 
      x: (i / (dataPoints.length - 1)) * 1000, 
      y: 300 - ((d.value - minVal) / range) * 300 
    }));

    return { 
      yTicks, 
      xTicks,
      pathPoints, 
      minThresholdY: 300 - ((minThreshold - minVal) / range) * 300, 
      maxThresholdY: 300 - ((maxThreshold - minVal) / range) * 300,
      minVal,
      maxVal,
      range
    };
  }, [dataPoints, minThreshold, maxThreshold]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * 1000;
    const svgY = ((e.clientY - rect.top) / rect.height) * 300;

    if (draggingThreshold) {
      const newValue = chartScales.maxVal - (svgY / 300) * chartScales.range;
      if (draggingThreshold === 'min') {
        setMinThreshold(Math.min(newValue, maxThreshold - 0.5));
      } else {
        setMaxThreshold(Math.max(newValue, minThreshold + 0.5));
      }
    } else {
      const index = Math.round((svgX / 1000) * (dataPoints.length - 1));
      const clampedIndex = Math.max(0, Math.min(dataPoints.length - 1, index));
      setHoverIndex(clampedIndex);
    }
  };

  const handleMouseUp = () => {
    if (draggingThreshold) {
      databaseService.updateDevice(device.id, {
        thresholds: { min: minThreshold, max: maxThreshold }
      });
      onRefresh(); // Notificar al padre para persistir y actualizar el estado global
    }
    setDraggingThreshold(null);
  };

  const isOutOfRange = device.value < minThreshold || device.value > maxThreshold;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-12 select-none" 
         onMouseUp={handleMouseUp}
         onMouseLeave={() => { if(draggingThreshold) handleMouseUp(); setHoverIndex(null); }}>
      
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
          {['monitoring', 'history', 'firmware', 'troubleshooting'].map((t) => (
            <button key={t} onClick={() => setActiveTab(t as TabType)} className={`px-4 lg:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'bg-cyan-500 text-[#0f172a] shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}>{t === 'troubleshooting' ? 'Soporte' : t}</button>
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
                  <span className={`text-3xl sm:text-4xl lg:text-5xl font-black tabular-nums ${isOutOfRange ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'text-cyan-400'}`}>
                    {device.value.toFixed(2)}
                  </span>
                  <span className="text-white text-[10px] sm:text-sm font-black uppercase ml-1">{device.unit}</span>
                </div>
              </div>
              
              <div className="flex gap-2 sm:gap-4 overflow-hidden">
                <div className="flex flex-col justify-between h-[200px] sm:h-[300px] text-[10px] sm:text-[12px] font-black text-white w-10 sm:w-16 text-right pr-1 sm:pr-3 shrink-0">
                  {chartScales.yTicks.map((tick, i) => <span key={i} className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{tick.value}</span>)}
                </div>
                
                <div className="flex-1 flex flex-col gap-4 sm:gap-6 min-w-0">
                  <div className="h-[200px] sm:h-[300px] relative bg-slate-900/40 rounded-xl border border-slate-700/30">
                    <svg 
                      ref={svgRef}
                      className="w-full h-full cursor-crosshair overflow-visible" 
                      viewBox="0 0 1000 300" 
                      preserveAspectRatio="none"
                      onMouseMove={handleMouseMove}
                    >
                      <defs>
                        <clipPath id="chartClip">
                          <rect x="2" y="2" width="996" height="296" rx="12" />
                        </clipPath>
                      </defs>

                      <g clipPath="url(#chartClip)">
                        {chartScales.yTicks.map((tick, i) => (
                          <line key={i} x1="0" y1={tick.pos} x2="1000" y2={tick.pos} stroke="#475569" strokeWidth="1" strokeDasharray="6,6" opacity="0.3" />
                        ))}
                        
                        {hoverIndex !== null && !draggingThreshold && (
                          <line x1={chartScales.pathPoints[hoverIndex].x} y1="0" x2={chartScales.pathPoints[hoverIndex].x} y2="300" stroke="#22d3ee" strokeWidth="3" opacity="0.8" />
                        )}

                        <path d={`M ${chartScales.pathPoints.map(p => `${p.x},${p.y}`).join(' L ')}`} fill="none" stroke="#22d3ee" strokeWidth="4.5" className="drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]" />
                        
                        <g onMouseDown={() => setDraggingThreshold('max')} className="cursor-ns-resize group">
                          <line x1="0" y1={chartScales.maxThresholdY} x2="1000" y2={chartScales.maxThresholdY} stroke="#f43f5e" strokeWidth="3" strokeDasharray="10,5" className="group-hover:stroke-rose-400 transition-colors" />
                        </g>

                        <g onMouseDown={() => setDraggingThreshold('min')} className="cursor-ns-resize group">
                          <line x1="0" y1={chartScales.minThresholdY} x2="1000" y2={chartScales.minThresholdY} stroke="#f43f5e" strokeWidth="3" strokeDasharray="10,5" className="group-hover:stroke-rose-400 transition-colors" />
                        </g>
                      </g>

                      {hoverIndex !== null && chartScales.pathPoints[hoverIndex] && !draggingThreshold && (
                        <g className="pointer-events-none">
                          <circle cx={chartScales.pathPoints[hoverIndex].x} cy={chartScales.pathPoints[hoverIndex].y} r="8" fill="#22d3ee" stroke="#0f172a" strokeWidth="3" className="drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                          <foreignObject 
                            x={chartScales.pathPoints[hoverIndex].x > 700 ? chartScales.pathPoints[hoverIndex].x - 270 : chartScales.pathPoints[hoverIndex].x + 10} 
                            y={chartScales.pathPoints[hoverIndex].y - 110} 
                            width="260" 
                            height="180"
                          >
                            <div className="bg-black/95 border-2 border-cyan-500 rounded-[1.5rem] p-5 shadow-[0_15px_60px_rgba(0,0,0,0.9)] flex flex-col justify-center animate-in zoom-in-95 duration-200">
                              <div className="flex items-baseline gap-1 mb-2">
                                <p className="text-3xl sm:text-4xl font-black text-white tracking-tighter leading-none">
                                  {dataPoints[hoverIndex].value.toFixed(2)}
                                </p>
                                <span className="text-cyan-400 text-[11px] font-bold uppercase">{device.unit}</span>
                              </div>
                              <div className="flex items-center gap-3 border-t border-slate-800 pt-4 mt-2">
                                <svg className="w-6 h-6 text-cyan-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" /></svg>
                                <p className="text-2xl sm:text-3xl text-white font-black uppercase tracking-tight leading-none tabular-nums">
                                  {dataPoints[hoverIndex].time}
                                </p>
                              </div>
                            </div>
                          </foreignObject>
                        </g>
                      )}

                      {!draggingThreshold && (
                        <>
                           <text x="10" y={chartScales.maxThresholdY - 10} className="text-[9px] sm:text-[10px] fill-rose-400 font-black uppercase pointer-events-none opacity-40">LÍMITE SUP: {maxThreshold.toFixed(1)}</text>
                           <text x="10" y={chartScales.minThresholdY + 20} className="text-[9px] sm:text-[10px] fill-rose-400 font-black uppercase pointer-events-none opacity-40">LÍMITE INF: {minThreshold.toFixed(1)}</text>
                        </>
                      )}
                    </svg>
                  </div>
                  
                  <div className="flex justify-between px-2 sm:px-4 pt-3 h-10 items-center border-t-2 border-slate-700/50">
                    {chartScales.xTicks.map((tick, i) => (
                      <span key={i} className="text-[9px] sm:text-[12px] font-black text-white uppercase tracking-tighter w-16 sm:w-24 text-center whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] truncate">
                        {tick.label}
                      </span>
                    ))}
                  </div>
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
                
                <div className="space-y-4">
                  <label className="text-[10px] sm:text-[11px] font-black text-white uppercase block mb-2 tracking-widest">Umbrales Activos</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 border-2 border-slate-800 p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-inner text-center">
                      <p className="text-[9px] text-slate-400 font-black uppercase mb-1">Mínimo</p>
                      <p className="text-white text-lg sm:text-xl font-black font-mono leading-none">{minThreshold.toFixed(1)}</p>
                    </div>
                    <div className="bg-slate-900 border-2 border-slate-800 p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-inner text-center">
                      <p className="text-[9px] text-slate-400 font-black uppercase mb-1">Máximo</p>
                      <p className="text-white text-lg sm:text-xl font-black font-mono leading-none">{maxThreshold.toFixed(1)}</p>
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
                <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${isOutOfRange ? 'bg-rose-500 animate-ping' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]'}`}></div>
                <span className={`text-sm sm:text-lg font-black uppercase ${isOutOfRange ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isOutOfRange ? 'FUERA DE RANGO' : 'SISTEMA ÓPTIMO'}
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
                } catch(e) { console.error(e); }
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
