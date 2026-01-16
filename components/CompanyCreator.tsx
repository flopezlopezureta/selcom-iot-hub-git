
import React, { useState, useEffect } from 'react';
import { databaseService } from '../services/databaseService';

interface CompanyCreatorProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const CompanyCreator: React.FC<CompanyCreatorProps> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    tax_id: '',
    billing_address: '',
    service_start_date: new Date().toISOString().split('T')[0],
    service_end_date: '',
    active: true
  });

  const [errors, setErrors] = useState<{ tax_id?: string; contact_phone?: string }>({});

  // Algoritmo de validación de RUT Chileno (Módulo 11)
  const validateRut = (rut: string): boolean => {
    if (!rut || rut.length < 2) return false;
    const cleanRut = rut.replace(/[^0-9kK]/g, '');
    if (cleanRut.length < 2) return false;

    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1).toUpperCase();

    let sum = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const expectedDv = 11 - (sum % 11);
    const calculatedDv = expectedDv === 11 ? '0' : expectedDv === 10 ? 'K' : expectedDv.toString();

    return dv === calculatedDv;
  };

  // Formateador de RUT: 12.345.678-9
  const formatRut = (value: string) => {
    let clean = value.replace(/[^0-9kK]/g, '');
    if (clean.length <= 1) return clean;
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1).toUpperCase();
    return body.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
  };

  // Lógica de Telefono: +56 9 XXXX XXXX
  const formatAndValidatePhone = (value: string) => {
    let digits = value.replace(/\D/g, '');

    // Si tiene 8 digitos y no empieza con +56 o 56, asumimos numero local sin prefijo
    if (digits.length === 8 && !value.startsWith('+56')) {
      return `+56 9 ${digits}`;
    }
    // Si tiene 9 digitos (incluyendo el 9 inicial)
    if (digits.length === 9 && !value.startsWith('+56')) {
      return `+56 ${digits.slice(0, 1)} ${digits.slice(1)}`;
    }

    return value;
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRut(e.target.value);
    setFormData({ ...formData, tax_id: formatted });

    if (formatted && !validateRut(formatted)) {
      setErrors(prev => ({ ...prev, tax_id: 'RUT o Dígito Verificador Inválido' }));
    } else {
      setErrors(prev => ({ ...prev, tax_id: undefined }));
    }
  };

  const handlePhoneBlur = () => {
    const formatted = formatAndValidatePhone(formData.contact_phone);
    setFormData({ ...formData, contact_phone: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones finales
    const isRutValid = validateRut(formData.tax_id);
    if (!isRutValid) {
      setErrors(prev => ({ ...prev, tax_id: 'Debe ingresar un RUT válido para continuar' }));
      return;
    }

    await databaseService.addCompany({
      ...formData,
      service_status: 'active',
      active: formData.active
    });

    onSuccess();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 lg:p-12 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-10 border-b border-slate-800 pb-6">
          <div className="p-3 bg-emerald-500 rounded-2xl text-[#0f172a]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <div>
            <h2 className="text-white text-2xl font-bold tracking-tight uppercase">Ficha Técnica de Cliente</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Validación de Identidad y Servicio IoT</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Seccion 1: Identidad y Contacto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6 md:col-span-2">
              <h3 className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] border-l-2 border-cyan-500 pl-3">Identidad Corporativa</h3>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Razón Social</label>
                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all" placeholder="Nombre legal de la empresa" />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">RUT Empresa (Tax ID)</label>
                <input
                  required
                  value={formData.tax_id}
                  onChange={handleRutChange}
                  className={`w-full bg-slate-900 border ${errors.tax_id ? 'border-rose-500/50' : 'border-slate-800'} rounded-xl px-5 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-mono`}
                  placeholder="12.345.678-9"
                />
                {errors.tax_id && <p className="text-rose-500 text-[9px] font-black uppercase mt-2 ml-1 animate-pulse">{errors.tax_id}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Email de Notificaciones</label>
                <input type="email" required value={formData.contact_email} onChange={e => setFormData({ ...formData, contact_email: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="cobranza@empresa.com" />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Teléfono de Contacto</label>
                <input
                  value={formData.contact_phone}
                  onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                  onBlur={handlePhoneBlur}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                  placeholder="Ej: 912345678"
                />
                <p className="text-slate-600 text-[9px] mt-2 ml-1 uppercase font-bold tracking-tighter">Auto-prefijo: Ingresa 8 o 9 dígitos para formatear a +56 9</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Representante Legal</label>
                <input value={formData.contact_name} onChange={e => setFormData({ ...formData, contact_name: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Nombre completo" />
              </div>
            </div>
          </div>

          {/* Seccion 2: Facturación y Domicilio */}
          <div className="space-y-6">
            <h3 className="text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] border-l-2 border-amber-500 pl-3">Logística y Facturación</h3>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Dirección Matriz</label>
              <input value={formData.billing_address} onChange={e => setFormData({ ...formData, billing_address: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Calle, Número, Ciudad" />
            </div>
          </div>

          {/* Seccion 3: Vigencia del Servicio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6 md:col-span-2">
              <h3 className="text-rose-400 text-[10px] font-black uppercase tracking-[0.2em] border-l-2 border-rose-500 pl-3">Configuración de Contrato</h3>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Inicio de Recolección de Datos</label>
              <input type="date" value={formData.service_start_date} onChange={e => setFormData({ ...formData, service_start_date: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none appearance-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Cierre de Servicio (Opcional)</label>
              <input type="date" value={formData.service_end_date} onChange={e => setFormData({ ...formData, service_end_date: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none appearance-none" />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-8 border-t border-slate-800">
            <button type="button" onClick={onCancel} className="px-8 py-4 bg-slate-800 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">Descartar</button>
            <button
              type="submit"
              className="px-8 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-50"
              disabled={Object.values(errors).some(e => e !== undefined)}
            >
              Finalizar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyCreator;
