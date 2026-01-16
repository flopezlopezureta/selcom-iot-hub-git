
import React from 'react';
import { ViewMode, UserRole } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  userRole: UserRole;
  companyId?: string;
  onViewChange: (view: ViewMode) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, userRole, companyId, onViewChange, isOpen, onClose, onLogout }) => {
  const handleItemClick = (id: string) => {
    onViewChange(id as ViewMode);
    if (window.innerWidth < 1024) onClose();
  };

  const getMenuItems = () => {
    const items = [
      { id: 'dashboard', label: 'Panel Principal', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
      { id: 'devices', label: 'Dispositivos', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z' },
    ];

    if (userRole === 'admin') {
      items.push({ id: 'companies', label: 'Empresas/Clientes', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' });
    }

    if (userRole === 'admin' || userRole === 'client') {
      items.push({ id: 'users', label: 'Gestión Usuarios', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' });
    }

    return items;
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden" onClick={onClose} />}
      <aside className={`fixed lg:sticky top-0 left-0 z-[70] h-screen w-72 bg-[#0f172a] border-r border-slate-800 flex flex-col transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center text-[#0f172a] font-black text-xl">S</div>
            <span className="text-white brand-logo text-lg uppercase tracking-wider">Selcom IoT</span>
          </div>
        </div>
        
        <div className="px-6 py-4 mb-4">
          <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Contexto Actual</p>
            <p className="text-white text-xs font-bold uppercase truncate">
              {userRole === 'admin' ? 'Consola Global' : companyId || 'Cargando...'}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {getMenuItems().map((item) => (
            <button key={item.id} onClick={() => handleItemClick(item.id)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${currentView === item.id ? 'bg-cyan-500/10 text-cyan-400 border-l-4 border-cyan-400' : 'text-slate-400 hover:bg-slate-800'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon}></path></svg>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-slate-800">
          <button onClick={onLogout} className="flex items-center gap-4 text-slate-500 hover:text-white text-sm font-semibold w-full px-4 py-2 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
