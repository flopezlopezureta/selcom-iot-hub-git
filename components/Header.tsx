
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">T</div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">T-SIM7080-S3</h1>
            <p className="text-xs text-slate-500">IoT Integration & Code Hub</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <a href="#" className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-1">Generador</a>
          <a href="#docs" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Documentación</a>
          <a href="#pinout" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Pinout</a>
        </nav>
        <button className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-full hover:bg-slate-800 transition-all shadow-sm">
          GitHub Repo
        </button>
      </div>
    </header>
  );
};

export default Header;
