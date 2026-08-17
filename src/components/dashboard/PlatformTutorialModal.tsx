import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound, ShieldAlert, User, Camera, Sliders,
  BellRing, Smartphone, Laptop, Moon, Sun,
  CheckCircle2, Target, CreditCard,
  Receipt, Trophy, Lightbulb,
  Heart, Megaphone, MessageSquare,
  ChevronRight, ChevronLeft, X, Sparkles, Compass, ShieldCheck,
  Check, AlertTriangle, Download
} from 'lucide-react';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';

interface PlatformTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMandatoryFirstTime?: boolean;
  currentUser?: any;
}

/* ============================================================== */
/*  Interactive & Animated Step Mockups                           */
/* ============================================================== */

// 1. Password Security Mockup
const MockPasswordSecurity = () => (
  <div className="space-y-3 font-anthropic">
    <div className="p-3.5 rounded-[2px] bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40">
      <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-bold font-title uppercase tracking-wider mb-1">
        <ShieldAlert size={15} /> Parolă Temporară Activă
      </div>
      <div className="text-xs text-rose-900 dark:text-rose-200">
        Parola inițială este comună. Schimbă parola imediat pentru a proteja confidențialitatea acțiunilor și voturilor tale.
      </div>
    </div>

    <div className="p-3.5 rounded-[2px] bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-2.5">
      <div>
        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1 font-title">
          Parolă Nouă Personală
        </label>
        <div className="h-9 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2px] flex items-center justify-between font-data text-xs text-slate-700 dark:text-slate-300">
          <span>••••••••••••</span>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-[2px] border border-emerald-200 dark:border-emerald-800">
            Puternică
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 pt-1">
        <div className="h-1.5 bg-emerald-500 rounded-[1px]" />
        <div className="h-1.5 bg-emerald-500 rounded-[1px]" />
        <div className="h-1.5 bg-emerald-500 rounded-[1px]" />
      </div>

      <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold pt-1">
        <Check size={14} /> Criptare sigură în baza de date Supabase
      </div>
    </div>
  </div>
);

// 2. Avatar Profile Mockup
const MockAvatarUploader = () => (
  <div className="space-y-3 font-anthropic">
    <div className="p-4 rounded-[2px] bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-violet-500/10 border border-blue-500/30 flex items-center gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-[2px] bg-indigo-600 text-white font-black text-xl flex items-center justify-center border-2 border-indigo-400 shadow-md">
          <span>AV</span>
        </div>
        <div className="absolute -bottom-1.5 -right-1.5 p-1 bg-blue-600 text-white rounded-[2px] shadow-xs">
          <Camera size={12} />
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900 dark:text-white font-title">Identitate Membru</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 font-title uppercase">
            Activ
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-anthropic">
          Poza te face recunoscut în clasament, la prezențe și pe proiecte.
        </p>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2 text-xs font-title font-bold text-slate-600 dark:text-slate-300">
      <div className="p-2.5 rounded-[2px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <span className="text-base">🏆</span>
        <span>Apare în Clasament</span>
      </div>
      <div className="p-2.5 rounded-[2px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <span className="text-base">📋</span>
        <span>Apare la Pontaj</span>
      </div>
    </div>
  </div>
);

// 3. Experience Mode Mockup
const MockExperienceSwitch = () => (
  <div className="space-y-3 font-anthropic">
    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-[2px] border border-slate-200 dark:border-slate-700 flex items-center justify-between">
      <div className="flex items-center gap-2 font-title font-bold text-xs">
        <span className="px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-[2px] shadow-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
          <span>🌱</span> Simplu (Easy)
        </span>
        <span className="px-3 py-1.5 text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span>⚡</span> Avansat
        </span>
      </div>
      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-title">
        Comutator Header
      </span>
    </div>

    <div className="grid grid-cols-3 gap-2">
      <div className="p-3 rounded-[2px] bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 text-center">
        <div className="text-lg mb-1">🎯</div>
        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-title">Activitate</div>
        <div className="text-[10px] text-slate-500 mt-0.5">Prezență, Evenimente</div>
      </div>
      <div className="p-3 rounded-[2px] bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 text-center">
        <div className="text-lg mb-1">🤝</div>
        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-title">Comunitate</div>
        <div className="text-[10px] text-slate-500 mt-0.5">Știri, Forum, Kudos</div>
      </div>
      <div className="p-3 rounded-[2px] bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-center">
        <div className="text-lg mb-1">💰</div>
        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-title">Finanțe</div>
        <div className="text-[10px] text-slate-500 mt-0.5">Cotizație, Chitanțe</div>
      </div>
    </div>
  </div>
);

// 4. Push Notifications Guide Mockup
const MockPushNotificationsGuide = () => {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'pc'>('ios');

  return (
    <div className="space-y-3 font-anthropic">
      <div className="flex rounded-[2px] bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 font-title text-xs font-bold">
        <button
          type="button"
          onClick={() => setPlatform('ios')}
          className={`flex-1 py-1.5 rounded-[2px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            platform === 'ios' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
          }`}
        >
          <Smartphone size={13} /> iPhone (iOS)
        </button>
        <button
          type="button"
          onClick={() => setPlatform('android')}
          className={`flex-1 py-1.5 rounded-[2px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            platform === 'android' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
          }`}
        >
          <Smartphone size={13} /> Android
        </button>
        <button
          type="button"
          onClick={() => setPlatform('pc')}
          className={`flex-1 py-1.5 rounded-[2px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            platform === 'pc' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
          }`}
        >
          <Laptop size={13} /> PC / Mac
        </button>
      </div>

      <div className="p-3.5 rounded-[2px] bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
        {platform === 'ios' && (
          <div className="space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white font-title flex items-center gap-1.5">
              <span>🍏</span> Safari pe iOS (Obligatoriu PWA):
            </div>
            <p>1. Deschide platforma în Safari.</p>
            <p>2. Apasă butonul de jos <strong>Share (Partajare ⎋)</strong>.</p>
            <p>3. Selectează <strong>„Adaugă la ecranul principal” (Add to Home Screen)</strong>.</p>
            <p>4. Deschide aplicația de pe ecran și apasă <strong>„Permite Notificările”</strong>.</p>
          </div>
        )}
        {platform === 'android' && (
          <div className="space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white font-title flex items-center gap-1.5">
              <span>🤖</span> Google Chrome pe Android:
            </div>
            <p>1. Deschide platforma în Chrome.</p>
            <p>2. Apasă pe pop-up-ul <strong>„Instalează aplicația”</strong> sau din meniul cu 3 puncte (⋮).</p>
            <p>3. La promptul de sistem, apasă <strong>„Permite Notificările”</strong>.</p>
          </div>
        )}
        {platform === 'pc' && (
          <div className="space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white font-title flex items-center gap-1.5">
              <span>💻</span> Windows / macOS Desktop:
            </div>
            <p>1. Apasă pe clopoțelul de notificări din colțul de sus.</p>
            <p>2. În dialogul browserului (stânga sus), apasă <strong>„Permite / Allow”</strong>.</p>
            <p>3. Primești alerte native instant chiar dacă tab-ul este minimizat.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// 5. Theme Toggle Mockup
const MockThemeToggle = () => (
  <div className="space-y-3 font-anthropic">
    <div className="grid grid-cols-2 gap-3">
      <div className="p-3.5 rounded-[2px] bg-[#0F1219] border border-slate-700 text-white flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <Moon size={16} className="text-indigo-400" />
          <span className="text-[10px] font-black font-title uppercase bg-indigo-950/60 px-1.5 py-0.5 rounded-[2px] text-indigo-300 border border-indigo-700">
            Recomandat
          </span>
        </div>
        <div className="text-xs font-bold font-title">Dark Obsidian</div>
        <div className="text-[10px] text-slate-400 mt-0.5">Contrast ridicat noaptea</div>
      </div>

      <div className="p-3.5 rounded-[2px] bg-white border border-slate-200 text-slate-900 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <Sun size={16} className="text-amber-500" />
          <span className="text-[10px] font-bold font-title uppercase bg-slate-100 px-1.5 py-0.5 rounded-[2px] text-slate-600 border border-slate-200">
            Opțiune
          </span>
        </div>
        <div className="text-xs font-bold font-title">Light Solar</div>
        <div className="text-[10px] text-slate-500 mt-0.5">Lizibilitate la soare</div>
      </div>
    </div>

    <div className="p-2.5 rounded-[2px] bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
      <Sparkles size={14} className="text-amber-500 shrink-0" />
      <span>Schimbă oricând tema cu un singur click pe butonul ☀️ / 🌙 din header.</span>
    </div>
  </div>
);

// 6. Attendance & Excuses Mockup
const MockExcuseWorkflow = () => (
  <div className="space-y-3 font-anthropic">
    <div className="grid grid-cols-3 gap-2 text-center font-data text-xs font-bold">
      <div className="p-2 rounded-[2px] bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        <div className="text-[10px] uppercase font-title font-bold">Prezență</div>
        <div className="text-sm font-black mt-0.5">+1 pct</div>
      </div>
      <div className="p-2 rounded-[2px] bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
        <div className="text-[10px] uppercase font-title font-bold">Nemotivată</div>
        <div className="text-sm font-black mt-0.5">-2 pct</div>
      </div>
      <div className="p-2 rounded-[2px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
        <div className="text-[10px] uppercase font-title font-bold">Motivată</div>
        <div className="text-sm font-black mt-0.5">0 pct</div>
      </div>
    </div>

    <div className="p-3.5 rounded-[2px] bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-900 dark:text-white font-title">Cerere de Învoire / Motivare</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 font-title">
          ⏳ În Așteptare
        </span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Selectează ședința din tab-ul <strong>Prezență</strong>, scrie motivul și trimite înainte de începere!
      </p>
    </div>
  </div>
);

// 7. Committees Selection Mockup
const MockCommitteesSelect = () => (
  <div className="space-y-3 font-anthropic">
    <div className="p-3 rounded-[2px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-title mb-2">
        Alege 1-2 Preferințe din Profil:
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs font-title font-semibold">
        <div className="p-2 rounded-[2px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
          <span>📢 PR & Social Media</span>
          <Check size={13} />
        </div>
        <div className="p-2 rounded-[2px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <span>🛠️ Logistică / Salahori</span>
        </div>
        <div className="p-2 rounded-[2px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <span>🤝 Sponsori & Fonduri</span>
        </div>
        <div className="p-2 rounded-[2px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
          <span>❤️ Servicii Comunitare</span>
          <Check size={13} />
        </div>
      </div>
    </div>

    <div className="p-2.5 rounded-[2px] bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
      <AlertTriangle size={15} className="shrink-0 text-amber-600" />
      <span><strong>Notă:</strong> Preferințele sunt orientative. Repartizarea finală se face în funcție de nevoile din teren.</span>
    </div>
  </div>
);

// 8. Digital Receipts Mockup
const MockDigitalReceipt = () => (
  <div className="space-y-3 font-anthropic">
    <div className="p-4 rounded-[2px] bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800/40">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Receipt size={16} className="text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold font-title text-blue-900 dark:text-blue-200 uppercase tracking-wider">
            Chitanță Electronică #048
          </span>
        </div>
        <span className="text-xs font-black font-data text-emerald-600 dark:text-emerald-400">15.00 RON</span>
      </div>

      <div className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
        Cotizație lunară achitată trezorierului · Înregistrată oficial în registru.
      </div>

      <div className="mt-3 pt-2.5 border-t border-blue-200/60 dark:border-blue-800/40 flex items-center justify-between text-xs">
        <span className="font-bold text-slate-500 font-data">Semnătură Digitală Valabilă ✓</span>
        <span className="px-2.5 py-1 rounded-[2px] bg-blue-600 text-white font-bold font-title uppercase text-[10px] flex items-center gap-1">
          <Download size={11} /> PDF
        </span>
      </div>
    </div>

    <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold text-center">
      Balanța ta și toate chitanțele PDF sunt disponibile oricând în <strong>Profilul Meu</strong>.
    </div>
  </div>
);

// 9. Leaderboard & Passport Mockup
const MockLeaderboardPassport = () => (
  <div className="space-y-3 font-anthropic">
    <div className="grid grid-cols-3 gap-2">
      <div className="p-2.5 rounded-[2px] bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-center">
        <div className="text-base">👑</div>
        <div className="text-[10px] font-bold uppercase font-title text-amber-800 dark:text-amber-300">Locul 1</div>
        <div className="text-xs font-black font-data mt-0.5">+48 pct</div>
      </div>
      <div className="p-2.5 rounded-[2px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-center">
        <div className="text-base">🥈</div>
        <div className="text-[10px] font-bold uppercase font-title text-slate-700 dark:text-slate-300">Locul 2</div>
        <div className="text-xs font-black font-data mt-0.5">+36 pct</div>
      </div>
      <div className="p-2.5 rounded-[2px] bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-center">
        <div className="text-base">🥉</div>
        <div className="text-[10px] font-bold uppercase font-title text-amber-700 dark:text-amber-400">Locul 3</div>
        <div className="text-xs font-black font-data mt-0.5">+29 pct</div>
      </div>
    </div>

    <div className="p-3 rounded-[2px] bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
      <div>
        <div className="font-bold text-slate-900 dark:text-white font-title">Pașaport Voluntar: Senior</div>
        <div className="text-slate-500 text-[11px]">Deblocat: „Voluntar de Fier” (100% prezență)</div>
      </div>
      <span className="text-base">🌟</span>
    </div>
  </div>
);

// 10. Initiatives & Polls Mockup
const MockInitiativesPolls = () => (
  <div className="space-y-3 font-anthropic">
    <div className="p-3 rounded-[2px] bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-purple-900 dark:text-purple-200 font-title">
          💡 Proiect: Târg Caritabil de Crăciun
        </span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-300 font-title">
          În Analiză
        </span>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        Buget estimat: <strong>800 RON</strong> · Trimis cu numele tău pentru bonus de implicare!
      </p>
    </div>

    <div className="p-3 rounded-[2px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-title mb-1.5">
        🗳️ Sondaj Live: Unde ținem următorul Teambuilding?
      </div>
      <div className="space-y-1 text-xs">
        <div className="p-1.5 rounded-[2px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 font-semibold flex items-center justify-between">
          <span>Cabana Munte (72% voturi)</span>
          <Check size={12} />
        </div>
      </div>
    </div>
  </div>
);

// 11. Community, News, Forum & Kudos Mockup
const MockCommunityKudos = () => (
  <div className="space-y-3 font-anthropic">
    <div className="p-3 rounded-[2px] bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/20 border border-rose-200 dark:border-rose-800/40 flex items-center gap-3">
      <div className="text-2xl">🤝</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-rose-900 dark:text-rose-200 font-title">
          Kudos primit: „Spirit de Echipă”
        </div>
        <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
          „Mulțumim pentru sprijinul logistic excepțional la acțiunea de weekend!”
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2 text-xs font-title font-bold text-slate-700 dark:text-slate-300">
      <div className="p-2.5 rounded-[2px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <Megaphone size={14} className="text-blue-500" />
        <span>Știri cu Comentarii</span>
      </div>
      <div className="p-2.5 rounded-[2px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <MessageSquare size={14} className="text-purple-500" />
        <span>Forum de Discuții</span>
      </div>
    </div>
  </div>
);

/* ============================================================== */
/*  The 11 Comprehensive Steps Definition                         */
/* ============================================================== */

interface TutorialStepItem {
  id: string;
  section: string;
  title: string;
  subtitle: string;
  icon: any;
  gradient: string;
  accentLight: string;
  accentDark: string;
  iconColor: string;
  description: string;
  bullets: string[];
  tip?: string | null;
  mockup: React.FC;
  sidebarHighlight: string;
}

const MASTER_TUTORIAL_STEPS: TutorialStepItem[] = [
  {
    id: 'security_password',
    section: 'Critic — Pasul 1',
    title: 'Schimbă Parola URGENT',
    subtitle: 'Securizează-ți contul și protejează-ți datele personale',
    icon: KeyRound,
    gradient: 'from-rose-600 via-red-600 to-amber-600',
    accentLight: 'bg-rose-50',
    accentDark: 'dark:bg-rose-950/30',
    iconColor: 'text-rose-600 dark:text-rose-400',
    description: 'Parola cu care te-ai autentificat inițial este una temporară generată de club. Pentru securitatea voturilor, a ideilor tale și a chitanțelor financiare, setează o parolă proprie.',
    bullets: [
      '🔒 Mergi în Profilul Tău → Schimbare Parolă',
      '🔑 Alege o parolă sigură (minim 6-8 caractere)',
      '🛡️ Parola ta este criptată ireversibil în baza de date Supabase',
      '⚠️ Nu partaja parola cu nimeni altcineva',
    ],
    tip: 'După finalizarea acestui tutorial, primul lucru pe care trebuie să îl faci este să îți actualizezi parola din Profil!',
    mockup: MockPasswordSecurity,
    sidebarHighlight: 'Profilul Meu → Securitate',
  },
  {
    id: 'profile_avatar',
    section: 'Identitate',
    title: 'Poza de Profil & Avatar',
    subtitle: 'Fii ușor de recunoscut în club și la activități',
    icon: User,
    gradient: 'from-blue-600 via-indigo-600 to-violet-600',
    accentLight: 'bg-blue-50',
    accentDark: 'dark:bg-blue-950/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    description: 'O poză reală de profil face experiența în comunitate mult mai prietenoasă și eficientă. Vei fi identificat rapid la pontaj, pe podiumul de clasament și la coordonarea pe proiecte.',
    bullets: [
      '📸 Încarcă o fotografie clară din secțiunea Profil',
      '🏆 Apare automat lângă numele tău pe podiumul de clasament',
      '📋 Coordonatorii te identifică rapid la pontaj la evenimente',
      '💬 Apare la comentarii pe Forum, Știri și în feed-ul de Kudos',
    ],
    tip: 'Poți actualiza oricând poza și biografia personală direct din Profil.',
    mockup: MockAvatarUploader,
    sidebarHighlight: 'Profilul Meu → Editează Avatar',
  },
  {
    id: 'easy_vs_advanced',
    section: 'Navigare',
    title: 'Modul Simplu (Easy Mode) vs Avansat',
    subtitle: 'O interfață compactă și aerisită pentru oricine',
    icon: Sliders,
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    accentLight: 'bg-emerald-50',
    accentDark: 'dark:bg-emerald-950/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    description: 'În colțul din dreapta sus găsești comutatorul 🌱 Simplu / ⚡ Avansat. Poți alege modul de lucru care ți se potrivește cel mai bine.',
    bullets: [
      '🌱 Easy Mode: Grupează compact toate modulele în 3 Hub-uri principale (Activitate, Comunitate, Finanțe)',
      '⚡ Advanced Mode: Deschide meniul lateral extins cu fiecare pagină individuală',
      '🔄 Ai aceleași funcționalități complete în ambele moduri, dar într-un format mult mai compact',
    ],
    tip: 'Preferința ta este salvată automat pe dispozitiv.',
    mockup: MockExperienceSwitch,
    sidebarHighlight: 'Header Dreapta-Sus (Comutator)',
  },
  {
    id: 'push_notifications',
    section: 'Alerte & Conectivitate',
    title: 'Notificări Push (iOS, Android & PC)',
    subtitle: 'Află primul de ședințe, voturi, chitanțe și anunțuri',
    icon: BellRing,
    gradient: 'from-purple-600 via-pink-600 to-rose-600',
    accentLight: 'bg-purple-50',
    accentDark: 'dark:bg-purple-950/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    description: 'Pentru a nu rata ședințele importante și confirmările de participare, activează notificările push pe telefonul sau calculatorul tău.',
    bullets: [
      '🍏 iPhone/iOS: Partajare (Share) → „Adaugă la ecranul principal” → Deschide aplicația și acceptă notificările',
      '🤖 Android: Apasă „Instalează aplicația” sau permite notificările din Google Chrome',
      '💻 PC/Mac: Apasă „Permite” la promptul browserului pentru alerte pe desktop',
    ],
    tip: 'Alertele includ: ședințe noi, termen cotizație, aprobare învoiri și aprecieri Kudos primite.',
    mockup: MockPushNotificationsGuide,
    sidebarHighlight: 'Clopoțel Notificări (Header)',
  },
  {
    id: 'dark_mode',
    section: 'Personalizare',
    title: 'Dark Mode & Confort Vizual',
    subtitle: 'Temă de noapte Obsidian cu contrast ridicat',
    icon: Moon,
    gradient: 'from-slate-700 via-slate-800 to-slate-950',
    accentLight: 'bg-slate-100',
    accentDark: 'dark:bg-slate-800/40',
    iconColor: 'text-slate-700 dark:text-slate-300',
    description: 'Platforma este construită pentru confort vizual total. Poți comuta oricând între Dark Mode (Sleek Obsidian) și Light Mode.',
    bullets: [
      '🌙 Dark Mode: Design întunecat de înaltă precizie, optim pentru utilizare de seară',
      '☀️ Light Mode: Contrast alb curat, perfect pentru citit la lumina zilei',
      '⚡ Schimbare instantă cu un singur click pe butonul Soare/Lună din header',
    ],
    tip: 'Setarea se păstrează automat pe toate dispozitivele de pe care te autentifici.',
    mockup: MockThemeToggle,
    sidebarHighlight: 'Header Dreapta-Sus (☀️ / 🌙)',
  },
  {
    id: 'attendance_and_excuses',
    section: 'Obligații & Regulament',
    title: 'Prezențe, Punctaj & Învoiri',
    subtitle: '+1 pct prezență · -2 pct nemotivată · 0 pct motivată',
    icon: CheckCircle2,
    gradient: 'from-teal-600 via-emerald-600 to-green-600',
    accentLight: 'bg-teal-50',
    accentDark: 'dark:bg-teal-950/30',
    iconColor: 'text-teal-600 dark:text-teal-400',
    description: 'Prezența la ședințe și proiecte este motorul implicării tale în club. Fiecare activitate contează direct în scorul tău de clasament.',
    bullets: [
      '✅ Prezență Confirmată: +1 punct în clasament',
      '❌ Absență Nemotivată: -2 puncte penalizare',
      '📝 Absență Motivată: 0 puncte (nu scade din scor)',
      '📩 Cum te învoiești: Mergi în Prezență, selectezi ședința, scrii motivul și trimiți cererea către Board înainte de începere',
    ],
    tip: 'Trimite cererea de motivare cât mai din timp pentru ca Board-ul să o poată analiza și aproba.',
    mockup: MockExcuseWorkflow,
    sidebarHighlight: 'Prezență & Învoiri',
  },
  {
    id: 'committees_assignment',
    section: 'Organizare',
    title: 'Comitete & Preferințe de Lucru',
    subtitle: 'Departamente operative și repartizare pe proiecte',
    icon: Target,
    gradient: 'from-indigo-600 via-blue-600 to-cyan-600',
    accentLight: 'bg-indigo-50',
    accentDark: 'dark:bg-indigo-950/30',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    description: 'Proiectele clubului funcționează prin departamente: PR & Media, Logistică/Salahori, Finanțe/Sponsori, Servicii Sociale, IT. Din Profil îți alegi domeniile preferate.',
    bullets: [
      '🎯 Alege 1-2 comitete favorite direct din Profilul Tău',
      '⚠️ Preferințele sunt orientative și nu sunt garantate',
      '👥 Coordonatorii de proiect repartizează echipele în funcție de nevoile din teren',
      '⏱️ Orele de voluntariat se acumulează automat pe baza implicării',
    ],
    tip: 'Actualizează-ți abilitățile și comitetele preferate pentru ca liderii de proiect să știe unde excelezi!',
    mockup: MockCommitteesSelect,
    sidebarHighlight: 'Profil → Comitete & Abilități',
  },
  {
    id: 'finance_and_receipts',
    section: 'Finanțe Transparente',
    title: 'Cotizație & Chitanțe Digitale',
    subtitle: '15 RON/lună · Chitanță PDF semnată digital',
    icon: CreditCard,
    gradient: 'from-cyan-600 via-blue-600 to-indigo-600',
    accentLight: 'bg-cyan-50',
    accentDark: 'dark:bg-cyan-950/30',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    description: 'Fiecare membru activ datorează cotizația lunară de 15 RON. Totul este 100% transparent și înregistrat electronic de trezorier.',
    bullets: [
      '💰 Cotizație lunară: 15 RON / lună (se calculează din luna înscrierii)',
      '🧾 Chitanțe Electronice PDF: Primești chitanță automată cu serie și semnătură digitală autorizată',
      '📥 Descărcare oricând: Toate chitanțele tale sunt păstrate în secțiunea Profil / Finanțe',
      '💳 Plata se predă trezorierului clubului, care emite chitanța în platformă',
    ],
    tip: 'Poți achita mai multe luni în avans. Balanța ta se actualizează în timp real.',
    mockup: MockDigitalReceipt,
    sidebarHighlight: 'Profilul Meu → Finanțe & Chitanțe',
  },
  {
    id: 'leaderboard_and_passport',
    section: 'Gamification & Merite',
    title: 'Clasament Live & Pașaport Voluntar',
    subtitle: 'Urcă pe podium și deblochează milestone-uri',
    icon: Trophy,
    gradient: 'from-amber-500 via-orange-500 to-yellow-500',
    accentLight: 'bg-amber-50',
    accentDark: 'dark:bg-amber-950/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    description: 'Clasamentul măsoară implicarea ta în club. Competiția este prietenoasă și recunoaște efortul celor mai activi voluntari.',
    bullets: [
      '👑 Clasamentul Bilunar: Recunoaște campionii fiecărei ediții de 2 luni',
      '📈 Totalul Istoric: Reflectă toată cariera ta în cadrul Interact Camena',
      '🏅 Pașaportul de Voluntar: Avansează în rang (Recrut → Activ → Senior → Ambasador)',
      '🌟 Milestone-uri Speciale: Insigne pentru prezență 100%, ore de impact și cotizație la zi',
    ],
    tip: 'Verifică istoricul detaliat al punctajului tău din pagina de Clasament!',
    mockup: MockLeaderboardPassport,
    sidebarHighlight: 'Clasament & Profil',
  },
  {
    id: 'initiatives_and_polls',
    section: 'Implicare Directă',
    title: 'Idei Proiecte, Sugestii & Sondaje',
    subtitle: 'Vocea ta contează direct în deciziile clubului',
    icon: Lightbulb,
    gradient: 'from-purple-600 via-violet-600 to-indigo-600',
    accentLight: 'bg-purple-50',
    accentDark: 'dark:bg-purple-950/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    description: 'Platforma îți oferă instrumente complete pentru a propune proiecte noi și a participa la deciziile democratice ale clubului.',
    bullets: [
      '💡 Propuneri de Proiecte: Propune acțiuni caritabile cu buget estimat și plan operațional',
      '🔒 Casetă de Sugestii: Trimite feedback către Board (opțiune anonimă sau cu numele tău pentru bonus de implicare)',
      '🗳️ Sondaje Live: Votează direct în chestionarele oficiale ale clubului',
    ],
    tip: 'Propunerile publice aprobate aduc recunoaștere în comunitate și puncte bonus!',
    mockup: MockInitiativesPolls,
    sidebarHighlight: 'Idei Proiecte & Sugestii',
  },
  {
    id: 'community_and_kudos',
    section: 'Comunitate & Relații',
    title: 'Știri, Forum & Aprecieri (Kudos)',
    subtitle: 'Comunicare deschisă și recunoașterea meritelor colegilor',
    icon: Heart,
    gradient: 'from-rose-500 via-pink-500 to-fuchsia-600',
    accentLight: 'bg-rose-50',
    accentDark: 'dark:bg-rose-950/30',
    iconColor: 'text-rose-600 dark:text-rose-400',
    description: 'Interact Camena este o familie unită. Rămâi conectat cu toți colegii prin spațiile dedicate de discuție și recunoaștere.',
    bullets: [
      '📢 Știri Oficiale: Anunțurile Board-ului cu secțiune de reacții și comentarii',
      '💬 Forum Deschis: Creează subiecte de discuție, împărtășește idei și colaborează liber',
      '❤️ Kudos & Aprecieri: Trimite insigne de mulțumire colegilor (Spirit de Echipă, Energie Pozitivă, Leadership)',
    ],
    tip: 'Un simplu Kudos poate schimba ziua unui coleg și întărește spiritul clubului!',
    mockup: MockCommunityKudos,
    sidebarHighlight: 'Comunitate (Știri, Forum, Kudos)',
  },
];

/* ============================================================== */
/*  Main Master Tutorial Component                                 */
/* ============================================================== */

export const PlatformTutorialModal: React.FC<PlatformTutorialModalProps> = ({
  isOpen,
  onClose,
  isMandatoryFirstTime = false,
  currentUser,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setDirection(1);
      setMaxVisitedStep(0);
    }
  }, [isOpen]);

  const goNext = useCallback(() => {
    if (currentStep < MASTER_TUTORIAL_STEPS.length - 1) {
      setDirection(1);
      setCurrentStep(p => {
        const next = p + 1;
        setMaxVisitedStep(m => Math.max(m, next));
        return next;
      });
    }
  }, [currentStep]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(p => p - 1);
    }
  }, [currentStep]);

  const handleFinish = () => {
    localStorage.setItem('tutorial_completed_v3', 'true');
    onClose();
  };

  const handleSkipIfAllowed = useCallback(() => {
    if (isMandatoryFirstTime) return; // Disallow skip on mandatory first time
    localStorage.setItem('tutorial_completed_v3', 'true');
    onClose();
  }, [isMandatoryFirstTime, onClose]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isMandatoryFirstTime) {
        handleSkipIfAllowed();
      } else if (e.key === 'ArrowRight') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMandatoryFirstTime, handleSkipIfAllowed, goNext, goPrev]);

  const goToStep = (idx: number) => {
    if (isMandatoryFirstTime && idx > maxVisitedStep) return; // Cannot jump ahead on first mandatory onboarding
    setDirection(idx > currentStep ? 1 : -1);
    setCurrentStep(idx);
    setMaxVisitedStep(m => Math.max(m, idx));
  };

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const step = MASTER_TUTORIAL_STEPS[currentStep];
  const StepIcon = step.icon;
  const MockupComponent = step.mockup;
  const isLast = currentStep === MASTER_TUTORIAL_STEPS.length - 1;
  const progress = ((currentStep + 1) / MASTER_TUTORIAL_STEPS.length) * 100;

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0, scale: 0.96 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0, scale: 0.96 }),
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-2 sm:p-4 font-anthropic">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={() => {
          if (!isMandatoryFirstTime) handleSkipIfAllowed();
        }}
      />

      {/* Main Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 25 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 25 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        className="relative w-full max-w-4xl h-[92dvh] sm:h-[88vh] max-h-[760px] bg-white dark:bg-[#0F1219] rounded-[2px] border border-slate-200/90 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col font-anthropic z-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Gradient Progress bar */}
        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 relative shrink-0">
          <motion.div
            className={`h-full bg-gradient-to-r ${step.gradient}`}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          />
        </div>

        {/* Top Header */}
        <div className="px-5 sm:px-8 py-3.5 flex items-center justify-between shrink-0 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#0F1219] z-10 font-anthropic">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-[2px] bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-xs shrink-0`}>
              <Compass size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-title flex-wrap">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Ghid Oficial Membri
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-[2px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider">
                  {step.section}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 font-data">
                {currentUser?.name || currentUser?.nickname ? `Pentru: ${currentUser?.nickname || currentUser?.name} · ` : ''}Pasul {currentStep + 1} din {MASTER_TUTORIAL_STEPS.length} · {Math.round(progress)}% finalizat
              </div>
            </div>
          </div>

          {!isMandatoryFirstTime && (
            <button
              onClick={handleSkipIfAllowed}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10 shrink-0 font-title cursor-pointer uppercase tracking-wider"
            >
              Închide <X size={14} />
            </button>
          )}

          {isMandatoryFirstTime && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-amber-800 dark:text-amber-300 font-title uppercase tracking-wider">
              <ShieldCheck size={14} className="text-amber-600" />
              <span>Onboarding Inițial Obligatoriu</span>
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-4 sm:py-5 overscroll-contain touch-pan-y font-anthropic" style={{ WebkitOverflowScrolling: 'touch' }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            >
              {/* Title Section */}
              <div className="flex items-start gap-4 mb-5 font-anthropic">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-[2px] bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-xs shrink-0`}>
                  <StepIcon size={26} className="text-white" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h2 className="text-xl sm:text-2xl font-bold font-anthropicSerif text-slate-900 dark:text-white tracking-tight leading-tight">
                    {step.title}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5 font-anthropic">
                    {step.subtitle}
                  </p>
                </div>
              </div>

              {/* Two-column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-7 font-anthropic">
                {/* Left details */}
                <div className="space-y-3 flex flex-col justify-start">
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-anthropic">
                    {step.description}
                  </p>

                  {step.bullets && (
                    <ul className="space-y-1.5 pt-1">
                      {step.bullets.map((bullet, i) => (
                        <li
                          key={i}
                          className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-anthropic leading-snug flex items-start gap-2"
                        >
                          <span className="text-slate-400 shrink-0 mt-0.5">›</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {step.tip && (
                    <div className={`p-3 rounded-[2px] ${step.accentLight} ${step.accentDark} border border-slate-200/80 dark:border-white/10 font-anthropic mt-2`}>
                      <div className="flex items-start gap-2">
                        <Sparkles size={15} className={`${step.iconColor} shrink-0 mt-0.5`} />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-snug">
                          {step.tip}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1 font-title">
                    <div className="w-2 h-2 rounded-[1px] bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                      Unde găsești în platformă:{' '}
                      <span className="text-slate-800 dark:text-slate-200 font-bold">{step.sidebarHighlight}</span>
                    </span>
                  </div>
                </div>

                {/* Right Interactive Mockup */}
                <div className="rounded-[2px] bg-slate-50/90 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/10 p-4 sm:p-5 overflow-hidden font-anthropic flex flex-col justify-center">
                  <div className="flex items-center justify-between gap-1.5 mb-3 border-b border-slate-200/60 dark:border-white/5 pb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-[1px] bg-rose-400" />
                      <div className="w-2 h-2 rounded-[1px] bg-amber-400" />
                      <div className="w-2 h-2 rounded-[1px] bg-emerald-400" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-title">
                      Exemplu Vizual
                    </span>
                  </div>
                  <MockupComponent />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 sm:px-8 py-3 bg-slate-50/95 dark:bg-[#121620] border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 shrink-0 h-16 z-10 font-title">
          {/* Step Pill Indicators */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-[45%] sm:max-w-none shrink-0">
            {MASTER_TUTORIAL_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => goToStep(idx)}
                disabled={isMandatoryFirstTime && idx > maxVisitedStep}
                className={`rounded-[1px] transition-all duration-300 ${
                  idx === currentStep
                    ? `w-5 sm:w-6 h-2 bg-gradient-to-r ${step.gradient} shadow-xs`
                    : idx <= maxVisitedStep
                    ? 'w-2 h-2 bg-slate-400 dark:bg-slate-500 cursor-pointer'
                    : 'w-2 h-2 bg-slate-200 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                }`}
                title={MASTER_TUTORIAL_STEPS[idx].title}
              />
            ))}
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 font-title">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentStep === 0}
              className={`px-3 py-2 rounded-[2px] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1 min-w-[70px] sm:min-w-[85px] uppercase tracking-wider ${
                currentStep === 0 ? 'invisible pointer-events-none opacity-0' : 'opacity-100 cursor-pointer'
              }`}
            >
              <ChevronLeft size={14} /> <span>Înapoi</span>
            </button>

            {isLast ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleFinish}
                className="px-5 py-2 rounded-[2px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all min-w-[140px] sm:min-w-[170px] cursor-pointer font-title uppercase tracking-wider"
              >
                <Sparkles size={15} /> <span>Finalizează & Intră 🎉</span>
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={goNext}
                className="px-5 py-2 rounded-[2px] bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all min-w-[130px] sm:min-w-[160px] cursor-pointer font-title uppercase tracking-wider"
              >
                <span>Următorul</span> <ChevronRight size={15} />
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
