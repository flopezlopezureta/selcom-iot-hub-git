
import React, { useState, useEffect, useMemo } from 'react';
import { databaseService } from '../services/databaseService';
import { generateIoTCode } from '../services/geminiService';
import { HardwareType, SensorType, ProtocolType, NetworkMode, Company, Device } from '../types';
import CodeViewer from './CodeViewer';

interface DeviceCreatorProps {
  onSuccess: () => void;
  onCancel: () => void;
  companies: Company[];
  editDevice?: Device | null;
}

const DeviceCreator: React.FC<DeviceCreatorProps> = ({ onSuccess, onCancel, companies, editDevice }) => {
  const [formData, setFormData] = useState({
    name: '',
    mac_address: '',
    company_id: '',
    unit: 'm',
    hardware: HardwareType.T_SIM7080_S3,
    sensor: SensorType.LEVEL,
    protocol: ProtocolType.HTTP_POST,
    networkMode: NetworkMode.NB_IOT,
    endpoint: 'https://iot.selcom.cl/api/v1',
    interval: 30
  });

  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    "Inicializando motor de IA...",
    "Analizando arquitectura de hardware...",
    "Optimizando stack de protocolos...",
    "Configurando registros del sensor...",
    "Validando seguridad de red...",
    "Compilando sketch personalizado..."
  ];

  // Mapeo de compatibilidad de Hardware -> Modos de Red
  const allowedNetworkModes = useMemo(() => {
    switch (formData.hardware) {
      case HardwareType.T_SIM7080_S3:
        return [NetworkMode.NB_IOT, NetworkMode.CAT_M1, NetworkMode.AUTO];
      case HardwareType.WALTER_ESP32_S3:
        return [NetworkMode.NB_IOT, NetworkMode.CAT_M1];
      case HardwareType.ESP32_C6:
      case HardwareType.ESP32_S3:
      case HardwareType.ESP32_S3_N16R8:
        return [NetworkMode.WIFI];
      default:
        return Object.values(NetworkMode);
    }
  }, [formData.hardware]);

  // Asegurar consistencia de red al cambiar hardware
  useEffect(() => {
    if (!allowedNetworkModes.includes(formData.networkMode)) {
      setFormData(prev => ({ ...prev, networkMode: allowedNetworkModes[0] }));
    }
  }, [formData.hardware, allowedNetworkModes]);

  useEffect(() => {
    if (editDevice && editDevice.hardwareConfig) {
      setFormData({
        name: editDevice.name,
        mac_address: editDevice.mac_address,
        company_id: editDevice.company_id,
        unit: editDevice.unit,
        hardware: editDevice.hardwareConfig.hardware,
        sensor: editDevice.hardwareConfig.sensor,
        protocol: editDevice.hardwareConfig.protocol,
        networkMode: editDevice.hardwareConfig.networkMode,
        endpoint: editDevice.hardwareConfig.endpoint,
        interval: editDevice.hardwareConfig.interval
      });
    } else if (companies.length > 0 && !formData.company_id) {
      setFormData(prev => ({ ...prev, company_id: companies[0].id }));
    }
  }, [editDevice, companies]);

  const [previewCode, setPreviewCode] = useState<{ code: string, explanation: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Efecto para rotar mensajes de carga
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 1500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGeneratePreview = async () => {
    setIsGenerating(true);
    setPreviewCode(null);
    try {
      const result = await generateIoTCode(
        formData.hardware,
        formData.sensor,
        formData.protocol,
        formData.endpoint,
        formData.networkMode
      );
      setPreviewCode(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const config = {
      name: formData.name,
      mac_address: formData.mac_address,
      company_id: formData.company_id,
      type: formData.sensor,
      unit: formData.unit,
      hardwareConfig: {
        hardware: formData.hardware,
        sensor: formData.sensor,
        protocol: formData.protocol,
        networkMode: formData.networkMode,
        endpoint: formData.endpoint,
        interval: formData.interval
      }
    };

    if (editDevice) {
      await databaseService.updateDevice(editDevice.id, config);
    } else {
      await databaseService.addDevice(config);
    }
    onSuccess();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 pb-20">
      <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 lg:p-12">
        <div className="flex items-center gap-4 mb-10 border-b border-slate-800 pb-6">
          <div className="p-3 bg-cyan-500 rounded-2xl text-[#0f172a]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h2 className="text-white text-2xl font-black uppercase tracking-tight">
              {editDevice ? 'Configuración de Activo' : 'Nuevo Activo IoT'}
            </h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Hardware Provisioning & Logic Integration</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* SECCIÓN 1: IDENTIDAD Y EMPRESA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] border-l-2 border-cyan-500 pl-3">Identidad del Activo</h3>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Nombre del Dispositivo</label>
                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 text-white outline-none focus:ring-1 focus:ring-cyan-500" placeholder="Ej: Sensor Nivel Estanque 04" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">ID Físico (MAC / IMEI)</label>
                <input required value={formData.mac_address} onChange={e => setFormData({ ...formData, mac_address: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 text-white font-mono" placeholder="7C:9E:BD:..." />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Asignar a Cliente</label>
                <select value={formData.company_id} onChange={e => setFormData({ ...formData, company_id: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 text-white">
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] border-l-2 border-amber-500 pl-3">Parámetros de Medición</h3>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Sensor / Tipo de Dato</label>
                <select value={formData.sensor} onChange={e => setFormData({ ...formData, sensor: e.target.value as SensorType })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 text-white">
                  {Object.values(SensorType).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Unidad</label>
                  <input required value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 text-white" placeholder="m, °C, bar..." />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Intervalo (Seg)</label>
                  <input type="number" min="1" max="3600" value={formData.interval} onChange={e => setFormData({ ...formData, interval: parseInt(e.target.value) })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: STACK TECNOLÓGICO (Consistencia HW) */}
          <div className="space-y-8 bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800">
            <h3 className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] border-l-2 border-emerald-500 pl-3">Stack de Comunicaciones</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase">Core Hardware</label>
                <select value={formData.hardware} onChange={e => setFormData({ ...formData, hardware: e.target.value as HardwareType })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold">
                  {Object.values(HardwareType).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase italic">La elección de HW limita los protocolos disponibles.</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase">Modo de Red (Filtro Activo)</label>
                <select value={formData.networkMode} onChange={e => setFormData({ ...formData, networkMode: e.target.value as NetworkMode })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold">
                  {allowedNetworkModes.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase">Protocolo de Capa 7</label>
                <select value={formData.protocol} onChange={e => setFormData({ ...formData, protocol: e.target.value as ProtocolType })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold">
                  {Object.values(ProtocolType).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Servidor / API Endpoint</label>
              <input value={formData.endpoint} onChange={e => setFormData({ ...formData, endpoint: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-cyan-400 font-mono text-sm" placeholder="https://..." />
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-end gap-4 pt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={handleGeneratePreview}
              disabled={isGenerating}
              className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${isGenerating ? 'bg-cyan-500/10 text-cyan-500 cursor-not-allowed border border-cyan-500/30' : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'}`}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generando Preview...
                </>
              ) : (
                'Generar Sketch Firmware IA'
              )}
            </button>
            <button type="button" onClick={onCancel} className="px-8 py-4 bg-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase">Cancelar</button>
            <button type="submit" className="px-10 py-4 bg-cyan-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-cyan-900/20 hover:bg-cyan-500 transition-all">
              {editDevice ? 'Actualizar Configuración' : 'Proveer Activo en Red'}
            </button>
          </div>
        </form>

        {isGenerating && (
          <div className="mt-12 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-slate-900/60 border border-cyan-500/20 rounded-3xl p-10 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent -translate-x-full animate-[scan_2s_infinite]"></div>

              <div className="relative mb-6">
                <div className="w-16 h-16 bg-cyan-500/10 rounded-full border-2 border-cyan-500/40 flex items-center justify-center animate-pulse">
                  <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 animate-bounce"></div>
              </div>

              <div className="space-y-2">
                <p className="text-white font-black uppercase tracking-[0.2em] text-sm animate-pulse">
                  IA Generando Código Fuente
                </p>
                <div className="flex items-center gap-3 justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping"></span>
                  <p className="text-cyan-400/70 text-[10px] font-bold uppercase tracking-widest">
                    {loadingMessages[loadingStep]}
                  </p>
                </div>
              </div>

              <div className="mt-8 w-full max-w-xs h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-500 ease-out"
                  style={{ width: `${((loadingStep + 1) / loadingMessages.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {previewCode && !isGenerating && (
          <div className="mt-12 space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <h4 className="text-white font-black text-[10px] uppercase tracking-widest">Sugerencia de Implementación Generada</h4>
            </div>
            <CodeViewer code={previewCode.code} explanation={previewCode.explanation} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes scan {
          from { transform: translateX(-100%); }
          to { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default DeviceCreator;
