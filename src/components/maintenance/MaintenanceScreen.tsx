import React from 'react';
import { MAINTENANCE_INFO } from '../../config/maintenance';

export const MaintenanceScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999999] w-screen h-screen bg-[#0B132B] text-white flex flex-col items-center justify-center p-6 overflow-hidden select-none font-sans">
      {/* Background Subtle Gradient Lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#A0D8EF]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-[#F9EBD1]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glassmorphism Container */}
      <div className="relative max-w-xl w-full bg-white/[0.04] border border-white/10 backdrop-blur-2xl rounded-3xl p-8 sm:p-12 shadow-2xl text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Logo / Icon Header */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-auto max-w-[260px] h-20 px-6 py-2.5 rounded-2xl bg-gradient-to-tr from-[#101D34] to-[#1E293B] border border-white/15 shadow-xl flex items-center justify-center relative">
            <img src="/logo.png" alt="Interact Camena Logo" className="w-full h-full object-contain filter drop-shadow-md" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
            </span>
          </div>

          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            Mentenanță Activă
          </div>
        </div>

        {/* Titles & Message */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-display">
            {MAINTENANCE_INFO.title}
          </h1>
          <p className="text-xl font-semibold text-[#A0D8EF]">
            {MAINTENANCE_INFO.subtitle}
          </p>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed pt-2">
            {MAINTENANCE_INFO.message}
          </p>
        </div>

        {/* Status Box */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 text-left text-xs sm:text-sm text-slate-300 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-white">
            <svg className="w-4 h-4 text-[#A0D8EF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Notificare Acces
          </div>
          <p className="text-slate-400 leading-relaxed">
            {MAINTENANCE_INFO.notice}
          </p>
        </div>

        {/* Footer Contact Info */}
        <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <span>&copy; 2026 Interact Camena Piatra Neamț</span>
          <a
            href={`mailto:${MAINTENANCE_INFO.contactEmail}`}
            className="text-[#A0D8EF] hover:underline font-medium flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {MAINTENANCE_INFO.contactEmail}
          </a>
        </div>
      </div>
    </div>
  );
};
