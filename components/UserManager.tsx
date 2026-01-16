
import React, { useState, useEffect } from 'react';
import { databaseService } from '../services/databaseService';
import { User } from '../types';

interface UserManagerProps {
  user: User;
}

const UserManager: React.FC<UserManagerProps> = ({ user }) => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    refreshUsers();
  }, [user]);

  const refreshUsers = async () => {
    try {
      const data = await databaseService.getUsers(user.role === 'admin' ? undefined : user.company_id);
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load users:", error);
      setUsers([]);
    }
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('¿Eliminar acceso de usuario?')) {
      databaseService.deleteUser(id);
      refreshUsers();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-white font-bold text-xl uppercase tracking-tight">Usuarios del Sistema</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            {user.role === 'admin' ? 'Gestión Global de Accesos' : `Operadores de ${user.company_id}`}
          </p>
        </div>
        {user.role === 'admin' && (
          <p className="text-slate-500 text-[9px] font-bold uppercase max-w-[200px] text-right">
            Para crear usuarios por cliente, vaya a la sección "Empresas" y use el botón "Usuarios".
          </p>
        )}
      </div>

      <div className="bg-[#1e293b] rounded-[2rem] border border-slate-800/50 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-900/50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-800">
              <th className="px-8 py-5">Usuario / Nombre</th>
              <th className="px-8 py-5">Rol</th>
              <th className="px-8 py-5">Empresa Asignada</th>
              <th className="px-8 py-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-8 py-5">
                  <p className="text-white font-bold text-sm">{u.full_name}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">@{u.username}</p>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${u.role === 'admin' ? 'border-rose-500/30 text-rose-400 bg-rose-500/5' :
                      u.role === 'client' ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5' : 'border-slate-500/30 text-slate-400'
                    }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-8 py-5 text-slate-400 text-sm font-semibold">{u.company_id || 'SISTEMA'}</td>
                <td className="px-8 py-5 text-right">
                  {u.id !== user.id && (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-2 text-slate-500 hover:text-rose-500 hover:bg-slate-700 rounded-lg transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-8 py-20 text-center text-slate-600 font-bold uppercase text-[10px] tracking-widest">
                  No se encontraron usuarios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManager;
