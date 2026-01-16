
import React, { useState, useEffect } from 'react';
import { databaseService } from '../services/databaseService';
import { Company, User, UserRole } from '../types';

interface UserManagementSubPanelProps {
  company: Company;
  onBack: () => void;
}

const UserManagementSubPanel: React.FC<UserManagementSubPanelProps> = ({ company, onBack }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    role: 'client' as UserRole,
    password: 'password123'
  });

  useEffect(() => {
    refreshUsers();
  }, [company]);

  const refreshUsers = async () => {
    try {
      const companyUsers = await databaseService.getUsers(company.id);
      setUsers(Array.isArray(companyUsers) ? companyUsers : []);
    } catch (error) {
      console.error("Error loading users:", error);
      setUsers([]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        databaseService.updateUser(editingUser.id, {
          username: formData.username,
          full_name: formData.full_name,
          role: formData.role
        });
        setSuccessMessage("Usuario actualizado correctamente");
      } else {
        databaseService.addUser({
          username: formData.username,
          full_name: formData.full_name,
          role: formData.role,
          password: formData.password,
          company_id: company.id,
          active: true
        });
        setSuccessMessage(`Usuario @${formData.username} creado con éxito`);
      }

      setFormData({
        username: '',
        full_name: '',
        role: 'client',
        password: 'password123'
      });
      setEditingUser(null);
      refreshUsers();

      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (error) {
      alert("Error al procesar el usuario");
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de eliminar este acceso?')) {
      databaseService.deleteUser(id);
      refreshUsers();
    }
  };

  const handleResetPassword = (user: User) => {
    const newPass = Math.random().toString(36).slice(-8).toUpperCase();
    databaseService.updateUser(user.id, { password: newPass });
    setTempPassword(newPass);
    setTimeout(() => setTempPassword(null), 10000);
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      full_name: user.full_name || '',
      role: user.role,
      password: ''
    });
  };

  return (
    <div className="animate-in slide-in-from-right-8 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <div>
            <h3 className="text-white font-bold text-xl uppercase tracking-tight">Accesos: {company.name}</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Gestión de Credenciales de Cliente</p>
          </div>
        </div>
      </div>

      {tempPassword && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl mb-6 animate-bounce">
          <p className="text-amber-500 text-xs font-bold uppercase text-center tracking-widest">
            ¡Nueva Clave Generada!: <span className="bg-amber-500 text-[#0f172a] px-2 py-0.5 rounded ml-2 font-mono">{tempPassword}</span>
          </p>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl mb-6 text-emerald-400 text-xs font-bold uppercase text-center tracking-widest animate-in fade-in zoom-in">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
            {successMessage}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#1e293b] rounded-[2rem] border border-slate-800/50 overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-800">
                <th className="px-6 py-4">Operador</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/20 transition-all group">
                  <td className="px-6 py-4">
                    <p className="text-white font-bold text-sm">{u.full_name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">@{u.username}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${u.role === 'client' ? 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5' : 'text-slate-400 border-slate-500/20 bg-slate-500/5'}`}>
                      {u.role === 'client' ? 'Administrador' : 'Visualizador'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleResetPassword(u)} className="p-2 text-slate-500 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-all" title="Reset Clave">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <button onClick={() => startEdit(u)} className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-slate-700 rounded-lg transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="p-2 text-slate-500 hover:text-rose-500 hover:bg-slate-700 rounded-lg transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-20 text-center text-slate-600 font-bold uppercase text-[10px] tracking-widest">No hay operadores asignados</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-[#1e293b] rounded-[2rem] border border-slate-800/50 p-6 shadow-2xl h-fit">
          <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-6 border-b border-slate-800 pb-4">
            {editingUser ? 'Actualizar Datos' : 'Registrar Nuevo'}
          </h4>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombre Completo</label>
              <input required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-1 focus:ring-cyan-500 outline-none" placeholder="Juan Pérez" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Username / Login</label>
              <input required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-1 focus:ring-cyan-500 outline-none" placeholder="j.perez" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Perfil</label>
              <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none">
                <option value="client">Administrador de Planta</option>
                <option value="viewer">Solo Lectura</option>
              </select>
            </div>
            {!editingUser && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Password Temporal</label>
                <input required type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-1 focus:ring-cyan-500 outline-none font-mono" />
              </div>
            )}
            <div className="pt-4 flex gap-3">
              <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg shadow-cyan-900/20">
                {editingUser ? 'Guardar Cambios' : 'Confirmar Registro'}
              </button>
              {editingUser && (
                <button type="button" onClick={() => { setEditingUser(null); setFormData({ username: '', full_name: '', role: 'client', password: 'password123' }); }} className="px-4 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-bold uppercase">
                  X
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserManagementSubPanel;
