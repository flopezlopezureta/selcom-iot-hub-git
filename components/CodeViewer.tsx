
import React, { useState } from 'react';

interface CodeViewerProps {
  code: string;
  explanation: string;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ code, explanation }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 animate-in slide-in-from-right-10 duration-500">
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/50"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></span>
            <span className="ml-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">firmware_v1.0.ino</span>
          </div>
          <button 
            onClick={copyToClipboard}
            className="text-[10px] font-bold px-4 py-2 rounded-lg bg-cyan-600/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-600/20 transition-all uppercase tracking-widest"
          >
            {copied ? '¡Copiado!' : 'Copiar Sketch'}
          </button>
        </div>
        <div className="p-0 max-h-[500px] overflow-auto">
          <pre className="p-6 text-[13px] text-emerald-400/90 leading-relaxed overflow-x-auto bg-black/40">
            <code>{code}</code>
          </pre>
        </div>
      </div>

      <div className="bg-cyan-950/20 border border-cyan-900/50 rounded-2xl p-6">
        <h3 className="text-cyan-400 font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-widest">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Notas de Implementación
        </h3>
        <p className="text-slate-400 text-xs leading-relaxed italic">
          {explanation}
        </p>
      </div>
    </div>
  );
};

export default CodeViewer;
