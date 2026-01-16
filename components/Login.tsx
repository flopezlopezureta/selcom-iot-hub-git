
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (username: string, pass: string) => Promise<void>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await onLogin(username, password);
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas o cuenta inactiva.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="bg-[#1e293b] border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-cyan-500 rounded-2xl flex items-center justify-center text-[#0f172a] font-black text-3xl mb-4 shadow-lg">S</div>
            <h1 className="text-2xl font-bold text-white brand-logo tracking-widest uppercase">Selcom IoT Hub</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2 border-t border-slate-800 pt-2 w-full text-center">Acceso al Sistema</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Terminal ID / Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all placeholder:text-slate-700"
                placeholder="admin"
                required
              />
            </div>
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Clave de Acceso</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all placeholder:text-slate-700 pr-14"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors p-2"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] py-3 px-4 rounded-xl text-center font-black uppercase tracking-wider">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-bold hover:bg-cyan-500 transition-all shadow-lg uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? 'Autenticando...' : 'Acceder al Hub'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-600 text-[9px] uppercase font-bold tracking-widest leading-relaxed">
              Credenciales por defecto:<br />
              Usuario: <span className="text-slate-400">admin</span> / Clave: <span className="text-slate-400">admindemo</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
