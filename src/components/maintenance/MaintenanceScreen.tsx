import React from 'react';
import { MAINTENANCE_INFO } from '../../config/maintenance';

export const MaintenanceScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999999] w-screen h-screen bg-[#0B132B] text-white flex flex-col items-center justify-center p-6 overflow-hidden select-none font-anthropic">
      {/* Main Container */}
      <div className="relative max-w-lg w-full bg-slate-900/90 border border-slate-800 rounded-[2px] p-8 sm:p-10 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-500 font-anthropic">
        
        {/* Logo / Icon Header */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-auto max-w-[220px] h-16 px-4 py-2 rounded-[2px] bg-slate-950 border border-slate-800 shadow-xs flex items-center justify-center relative">
            <img src="/logo.png" alt="Interact Camena Logo" className="w-full h-full object-contain filter drop-shadow-xs" />
          </div>

          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider font-title">
            <span className="w-1.5 h-1.5 rounded-[2px] bg-amber-400"></span>
            Mentenanță Activă
          </div>
        </div>

        {/* Titles & Message */}
        <div className="space-y-2 font-anthropic">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-anthropicSerif">
            {MAINTENANCE_INFO.title}
          </h1>
          <p className="text-sm font-semibold text-sky-300 font-title">
            {MAINTENANCE_INFO.subtitle}
          </p>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1 font-anthropic">
            {MAINTENANCE_INFO.message}
          </p>
        </div>

        {/* Status Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-[2px] p-4 text-left text-xs text-slate-300 space-y-1.5 font-anthropic">
          <div className="flex items-center gap-1.5 font-bold text-white font-title text-[11px] uppercase tracking-wider">
            <svg className="w-3.5 h-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Notificare Acces
          </div>
          <p className="text-slate-400 leading-relaxed text-xs">
            {MAINTENANCE_INFO.notice}
          </p>
        </div>

        {/* Footer Contact Info */}
        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 font-anthropic">
          <span>&copy; 2026 Interact Camena Piatra Neamț</span>
          <a
            href={`mailto:${MAINTENANCE_INFO.contactEmail}`}
            className="text-sky-400 hover:text-sky-300 hover:underline font-data"
          >
            {MAINTENANCE_INFO.contactEmail}
          </a>
        </div>
      </div>
    </div>
  );
};
