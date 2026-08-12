import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Calendar, Award, Heart, CreditCard,
  MessageSquarePlus, ChevronRight, ChevronLeft, X,
  CheckCircle2, Compass, ShieldCheck, Trophy,
  FileText, MessageSquare, Users, TrendingUp,
  AlertTriangle, Megaphone, User, Users2
} from 'lucide-react';

interface PlatformTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ============================================================== */
/*  Animated Mockup Components                                     */
/* ============================================================== */

const MockDashboardCards = () => (
  <div className="grid grid-cols-3 gap-3">
    {[
      { label: 'Membri Activi', value: '58', color: 'from-blue-500 to-cyan-400', icon: Users },
      { label: 'Prezență Medie', value: '87%', color: 'from-emerald-500 to-teal-400', icon: TrendingUp },
      { label: 'Cotizații Plătite', value: '42', color: 'from-amber-500 to-orange-400', icon: CreditCard },
    ].map((card, i) => (
      <motion.div
        key={card.label}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 + i * 0.15, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10"
      >
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3 shadow-lg`}>
          <card.icon size={18} className="text-white" />
        </div>
        <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">{card.value}</div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{card.label}</div>
      </motion.div>
    ))}
  </div>
);

const MockAttendanceRating = () => {
  const ratings = [
    { label: '100%', name: 'Maxim', color: 'bg-[#00ADFF]/10 text-[#00ADFF] border-[#00ADFF]/30', bar: 'bg-[#00ADFF]', pct: 100 },
    { label: '85-99%', name: 'Excelent', color: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40', bar: 'bg-emerald-500', pct: 92 },
    { label: '75-84%', name: 'Foarte Bine', color: 'bg-indigo-50 text-indigo-500 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/40', bar: 'bg-indigo-500', pct: 80 },
    { label: '65-74%', name: 'Satisfăcător', color: 'bg-orange-50 text-orange-500 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/40', bar: 'bg-orange-500', pct: 70 },
    { label: '<65%', name: 'Critic', color: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40', bar: 'bg-rose-500', pct: 50 },
  ];
  return (
    <div className="space-y-2">
      {ratings.map((r, i) => (
        <motion.div
          key={r.name}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12 + i * 0.09 }}
          className="flex items-center gap-3"
        >
          <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${r.color} w-24 text-center`}>{r.name}</span>
          <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${r.pct}%` }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
              className={`h-full rounded-full ${r.bar}`}
            />
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-12 text-right tabular-nums">{r.label}</span>
        </motion.div>
      ))}
    </div>
  );
};

const MockExcuseForm = () => (
  <div className="space-y-3">
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
      className="p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/10"
    >
      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Selectează Ședința</div>
      <div className="h-8 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center px-3">
        <span className="text-xs text-slate-500">Ședință Board — 15 Aug 2025 ▾</span>
      </div>
    </motion.div>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/10"
    >
      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Motivul Absenței</div>
      <div className="h-14 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
        <span className="text-xs text-slate-400 italic">Scrie aici motivul absenței tale...</span>
      </div>
    </motion.div>
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
      className="flex gap-2"
    >
      {[
        { label: '⏳ Pending', color: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40' },
        { label: '✓ Aprobat', color: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40' },
        { label: '✗ Respins', color: 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/40' },
      ].map(s => (
        <span key={s.label} className={`px-3 py-1.5 rounded-lg text-[10px] font-black border ${s.color}`}>{s.label}</span>
      ))}
    </motion.div>
  </div>
);

const MockCalendarGrid = () => {
  const days = ['L', 'M', 'Mi', 'J', 'V', 'S', 'D'];
  const dates = Array.from({ length: 28 }, (_, i) => i + 1);
  const eventDays = [3, 7, 12, 15, 21, 24];
  const todayDay = 15;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(d => (
          <div key={d} className="text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">{d}</div>
        ))}
        {dates.map((d, i) => (
          <motion.div key={d} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08 + i * 0.018, duration: 0.35 }}
            className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold relative
              ${d === todayDay ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
                : eventDays.includes(d) ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700'
                : 'text-slate-600 dark:text-slate-400'}`}
          >{d}
            {eventDays.includes(d) && d !== todayDay && <div className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />}
          </motion.div>
        ))}
      </div>
      <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}
        className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50"
      >
        <div className="w-1.5 h-8 rounded-full bg-blue-500" />
        <div>
          <div className="text-xs font-black text-blue-800 dark:text-blue-200">Ședință Board</div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400">15 Aug • 18:00 — RSVP activ ✓</div>
        </div>
      </motion.div>
    </div>
  );
};

const MockFinancePanel = () => (
  <div className="space-y-3">
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/20 border border-indigo-200 dark:border-indigo-800/40"
    >
      <div className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">Balanța Ta</div>
      <div className="text-3xl font-black text-indigo-900 dark:text-white mt-1">0 RON</div>
      <div className="flex items-center gap-1.5 mt-2">
        <CheckCircle2 size={14} className="text-emerald-500" />
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Cotizație la zi ✓</span>
      </div>
    </motion.div>
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-200">
          <strong>15 RON / lună</strong> — cotizația se calculează automat din data înscrierii. Dacă ai restanțe, vezi balanța negativă în profil.
        </div>
      </div>
    </motion.div>
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-slate-200/50 dark:border-white/10"
    >
      <div className="w-10 h-12 rounded-lg bg-rose-100 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 flex items-center justify-center">
        <FileText size={18} className="text-rose-500" />
      </div>
      <div>
        <div className="text-sm font-black text-slate-800 dark:text-white">Chitanță #047</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">August 2025 • 30 RON</div>
      </div>
      <button className="ml-auto text-xs font-bold text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40">PDF ↓</button>
    </motion.div>
  </div>
);

const MockLeaderboard = () => (
  <div className="space-y-2">
    {[
      { rank: 1, name: 'Andrei Popescu', pts: 142, medal: '🥇' },
      { rank: 2, name: 'Maria Dumitrescu', pts: 128, medal: '🥈' },
      { rank: 3, name: 'Elena Radu', pts: 115, medal: '🥉' },
      { rank: 4, name: 'Ion Vasilescu', pts: 98, medal: '' },
    ].map((p, i) => (
      <motion.div key={p.name} initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 + i * 0.1 }}
        className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? 'bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 shadow-md' : 'bg-white/60 dark:bg-white/5 border border-slate-200/50 dark:border-white/10'}`}
      >
        <span className="text-xl w-7 text-center">{p.medal || p.rank}</span>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center text-xs font-bold text-white">{p.name.charAt(0)}</div>
        <span className="text-sm font-bold text-slate-800 dark:text-white flex-1">{p.name}</span>
        <span className="text-sm font-black text-blue-600 dark:text-blue-400 tabular-nums">{p.pts} pt</span>
      </motion.div>
    ))}
  </div>
);

const MockPassportCard = () => (
  <div className="space-y-4">
    <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.6 }}
      className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/40"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">🌟</span>
        <div>
          <span className="text-base font-black text-amber-800 dark:text-amber-200">Senior Voluntar</span>
          <span className="text-xs ml-2 font-bold text-amber-600 dark:text-amber-400">18/25 prezențe</span>
        </div>
      </div>
      <div className="h-3 bg-amber-200/60 dark:bg-amber-800/30 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: '72%' }}
          transition={{ delay: 0.5, duration: 1.4, ease: [0.23, 1, 0.32, 1] }}
          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full shadow-lg shadow-amber-500/30"
        />
      </div>
    </motion.div>
    <div className="grid grid-cols-4 gap-2">
      {[
        { emoji: '🎯', label: 'Primii Pași', done: true },
        { emoji: '💰', label: 'Financiar', done: true },
        { emoji: '🌟', label: 'Senior', done: false },
        { emoji: '👑', label: 'Ambasador', done: false },
      ].map((m, i) => (
        <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + i * 0.1 }}
          className={`p-2.5 rounded-xl text-center border ${m.done ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/40 opacity-40'}`}
        >
          <div className="text-lg mb-0.5">{m.emoji}</div>
          <div className="text-[9px] font-bold text-slate-700 dark:text-slate-300 leading-tight">{m.label}</div>
          {m.done && <CheckCircle2 size={12} className="text-emerald-500 mx-auto mt-0.5" />}
        </motion.div>
      ))}
    </div>
  </div>
);

const MockKudosFeed = () => (
  <div className="space-y-3">
    {[
      { from: 'Maria', to: 'Andrei', badge: '🤝', badgeName: 'Spirit de Echipă', msg: 'Bravo pentru organizare!', color: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40' },
      { from: 'Ion', to: 'Elena', badge: '⚡', badgeName: 'Energie Pozitivă', msg: 'Mulțumesc pentru ajutor!', color: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40' },
    ].map((k, i) => (
      <motion.div key={i} initial={{ opacity: 0, x: -20, rotate: -2 }} animate={{ opacity: 1, x: 0, rotate: 0 }}
        transition={{ delay: 0.2 + i * 0.18, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className={`p-4 rounded-2xl border ${k.color}`}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-lg">{k.badge}</span>
          <span className="text-xs font-black text-slate-700 dark:text-slate-200">{k.badgeName}</span>
        </div>
        <div className="text-sm text-slate-700 dark:text-slate-300"><strong>{k.from}</strong> → <strong>{k.to}</strong></div>
        <div className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">"{k.msg}"</div>
      </motion.div>
    ))}
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
      className="flex flex-wrap gap-2"
    >
      {['🤝 Echipă', '📦 Logistic', '🎨 Creativ', '⚡ Energie', '👑 Lider'].map(b => (
        <span key={b} className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">{b}</span>
      ))}
    </motion.div>
  </div>
);

const MockSuggestionsBox = () => (
  <div className="space-y-3">
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
      className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200/50 dark:border-white/10"
    >
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={16} className="text-purple-500" />
        <span className="text-xs font-black text-purple-700 dark:text-purple-300">100% Anonim — nimeni nu îți vede identitatea</span>
      </div>
      <div className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800/60 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center">
        <span className="text-sm text-slate-400 italic">Scrie sugestia ta aici…</span>
      </div>
    </motion.div>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
      className="flex flex-wrap gap-2"
    >
      {['🎯 Proiect', '📋 Board', '🏗️ Club', '💡 Altele'].map(cat => (
        <span key={cat} className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-[10px] font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">{cat}</span>
      ))}
    </motion.div>
  </div>
);

const MockProjectProposal = () => (
  <div className="space-y-2.5">
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
      className="p-3.5 rounded-xl bg-white/70 dark:bg-white/5 border border-slate-200/50 dark:border-white/10"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/30 flex items-center justify-center">
          <FileText size={14} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <div className="text-sm font-black text-slate-800 dark:text-white">Campanie Donare Sânge</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Propus de: Andrei P. • 2 Aug 2025</div>
        </div>
        <span className="ml-auto text-[9px] font-black px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">⏳ În Analiză</span>
      </div>
      <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">Organizarea unei campanii de donare de sânge în parteneriat cu Crucea Roșie…</div>
    </motion.div>
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="p-3.5 rounded-xl bg-white/70 dark:bg-white/5 border border-slate-200/50 dark:border-white/10"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
          <FileText size={14} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <div className="text-sm font-black text-slate-800 dark:text-white">Workshop Educație Financiară</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Anonim • 28 Iul 2025</div>
        </div>
        <span className="ml-auto text-[9px] font-black px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">✓ Aprobat</span>
      </div>
      <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">Invitarea unui specialist bancar pentru un workshop interactiv…</div>
    </motion.div>
  </div>
);

const MockNewsFeed = () => (
  <div className="space-y-3">
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
      className="p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200/50 dark:border-white/10"
    >
      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">📌 Anunț Board — 10 Aug 2025</div>
      <div className="text-sm font-black text-slate-800 dark:text-white mb-1">Rezultate campanie „Zâmbete pentru Copii"</div>
      <div className="text-xs text-slate-600 dark:text-slate-300">Am strâns 2.500 RON și 120 de jucării! Mulțumim tuturor voluntarilor care…</div>
      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-200/50 dark:border-white/10">
        <span className="text-sm cursor-pointer">👍 12</span>
        <span className="text-sm cursor-pointer">❤️ 8</span>
        <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">5 comentarii</span>
      </div>
    </motion.div>
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
      className="p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200/50 dark:border-white/10"
    >
      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">📢 Anunț Admin — 8 Aug 2025</div>
      <div className="text-sm font-black text-slate-800 dark:text-white mb-1">Următoarea ședință: 15 August</div>
      <div className="text-xs text-slate-600 dark:text-slate-300">Agenda: buget Q3, planificare eveniment septembrie, votare…</div>
    </motion.div>
  </div>
);

const MockForumThreads = () => (
  <div className="space-y-2">
    {[
      { title: 'Strategie fundraising 2025', replies: 12, hot: true },
      { title: 'Propuneri echipament nou', replies: 5, hot: false },
      { title: 'Feedback eveniment caritabil', replies: 8, hot: true },
    ].map((t, i) => (
      <motion.div key={t.title} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 + i * 0.12 }}
        className="flex items-center gap-3 p-3.5 rounded-xl bg-white/60 dark:bg-white/5 border border-slate-200/50 dark:border-white/10"
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${t.hot ? 'bg-orange-100 dark:bg-orange-950/30' : 'bg-slate-100 dark:bg-slate-800/40'}`}>
          <MessageSquare size={16} className={t.hot ? 'text-orange-500' : 'text-slate-400'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-800 dark:text-white truncate">{t.title}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.replies} răspunsuri</div>
        </div>
        {t.hot && <span className="text-[9px] font-black px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300">🔥 HOT</span>}
      </motion.div>
    ))}
  </div>
);

const MockCommitteesOverview = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2.5">
      {[
        { name: 'PR & Social Media', icon: '🎨', members: 6, coordinator: 'Elena M.', color: 'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800/40 text-pink-700 dark:text-pink-300' },
        { name: 'Logistică & Tehnic', icon: '🏗️', members: 8, coordinator: 'Iustin B.', color: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300' },
        { name: 'Finanțe & Sponsori', icon: '💼', members: 4, coordinator: 'Radu S.', color: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300' },
        { name: 'Servicii Comunitare', icon: '🤝', members: 10, coordinator: 'Ana D.', color: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300' },
      ].map((c, i) => (
        <motion.div
          key={c.name}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 + i * 0.1 }}
          className={`p-3 rounded-2xl border ${c.color} flex flex-col justify-between`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xl">{c.icon}</span>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white/60 dark:bg-black/30">
              {c.members} membri
            </span>
          </div>
          <div>
            <div className="text-xs font-black truncate">{c.name}</div>
            <div className="text-[10px] opacity-75 truncate">Șef: <strong>{c.coordinator}</strong></div>
          </div>
        </motion.div>
      ))}
    </div>
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200"
    >
      <div className="flex items-center gap-2">
        <Users2 size={16} className="text-indigo-600 dark:text-indigo-400" />
        <span className="font-bold text-[11px]">Comitetul Tău Repartizat:</span>
      </div>
      <span className="font-black px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px]">
        🏗️ Logistică & Tehnic
      </span>
    </motion.div>
  </div>
);

const MockProfileOverview = () => (
  <div className="space-y-3">
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
      className="flex items-center gap-4 p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200/50 dark:border-white/10"
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-black text-white shadow-lg">A</div>
      <div>
        <div className="text-base font-black text-slate-800 dark:text-white">Andrei Popescu</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">Membru activ din Septembrie 2024</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">Excelent — 92%</span>
          <span className="text-[10px] font-bold text-slate-400">Piatra Neamț</span>
        </div>
      </div>
    </motion.div>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
      className="grid grid-cols-3 gap-2"
    >
      {[
        { label: 'Prezențe', value: '18', icon: '✓' },
        { label: 'Balanță', value: '0 RON', icon: '💰' },
        { label: 'Kudos', value: '7', icon: '❤️' },
      ].map((s, i) => (
        <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.08 }}
          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40 text-center"
        >
          <div className="text-sm mb-0.5">{s.icon}</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{s.value}</div>
          <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{s.label}</div>
        </motion.div>
      ))}
    </motion.div>
  </div>
);

/* ============================================================== */
/*  Tutorial Steps — Ordered Essential → Complex                   */
/* ============================================================== */

const TUTORIAL_STEPS = [
  // ── ESSENTIALS ──
  {
    id: 'welcome',
    section: 'Bun Venit',
    title: 'Bine ai venit în Interact Camena!',
    subtitle: 'Hub-ul digital al clubului tău — totul într-un singur loc',
    icon: Compass,
    gradient: 'from-blue-600 via-indigo-600 to-violet-600',
    accentLight: 'bg-blue-50', accentDark: 'dark:bg-blue-950/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    description: 'Platforma centralizează complet activitatea clubului: prezențe și motivări de absențe, cotizații cu chitanțe PDF, propuneri de proiecte, kudos între colegi, știri, forum și multe altele. Tot ce aveai nevoie pe WhatsApp sau pe hârtie, acum este într-un singur loc digital.',
    bullets: [
      '📱 Accesibilă de pe orice dispozitiv — telefon, tabletă, laptop',
      '🔄 Toate datele se actualizează în timp real',
      '🔐 Contul tău este securizat și personal',
    ],
    tip: 'Acest ghid rapid durează ~2 minute. Poți apăsa „Omite" oricând și îl redeschizi din meniul tău de utilizator (clic pe numele tău, colțul din dreapta sus).',
    mockup: MockDashboardCards,
    sidebarHighlight: 'Dashboard',
  },
  {
    id: 'attendance-rating',
    section: 'Obligatoriu',
    title: 'Sistemul de Rating & Prezență',
    subtitle: 'Cum funcționează calificativul tău — cel mai important indicator',
    icon: TrendingUp,
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    accentLight: 'bg-emerald-50', accentDark: 'dark:bg-emerald-950/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    description: 'Fiecare membru primește un calificativ automat calculat din raportul dintre prezențe și absențe nemotivate. Absențele MOTIVATE (aprobate de board) nu afectează ratingul. Doar absențele nemotivate îți scad calificativul.',
    bullets: [
      '🔵 Maxim (100%) — prezent la absolut toate ședințele',
      '🟢 Excelent (85-99%) — aproape perfect, excepțional',
      '🟣 Foarte Bine (75-84%) — solid, în regulă',
      '🟠 Satisfăcător (65-74%) — atenție, scade!',
      '🔴 Critic (<65%) — risc de excludere, trebuie îmbunătățit',
    ],
    tip: 'Ratingul se recalculează automat după fiecare ședință înregistrată de admin. Formula: Prezențe ÷ (Prezențe + Absențe Nemotivate) × 100%.',
    mockup: MockAttendanceRating,
    sidebarHighlight: 'Prezență',
  },
  {
    id: 'excuses',
    section: 'Obligatoriu',
    title: 'Motivări Absențe',
    subtitle: 'Cum să îți motivezi o absență pentru a nu afecta ratingul',
    icon: CheckCircle2,
    gradient: 'from-teal-500 via-emerald-500 to-green-500',
    accentLight: 'bg-teal-50', accentDark: 'dark:bg-teal-950/30',
    iconColor: 'text-teal-600 dark:text-teal-400',
    description: 'Nu poți ajunge la o ședință? Intră în tab-ul „Prezență", selectează ședința respectivă, și scrie motivul absenței tale. Cererea se trimite către board, care o poate aproba sau respinge.',
    bullets: [
      '1️⃣ Selectezi ședința din lista de evenimente',
      '2️⃣ Scrii motivul (examen, boală, familie, etc.)',
      '3️⃣ Trimiți cererea — primești status: Pending → Aprobat / Respins',
      '✅ Dacă e aprobată, absența NU îți afectează ratingul',
      '❌ Dacă e respinsă sau nu trimiți cerere, absența rămâne nemotivată',
    ],
    tip: 'Trimite cererea de motivare ÎNAINTE sau cât mai curând după ședință. Board-ul verifică periodic.',
    mockup: MockExcuseForm,
    sidebarHighlight: 'Prezență',
  },
  {
    id: 'finance',
    section: 'Obligatoriu',
    title: 'Cotizație & Obligații Financiare',
    subtitle: '15 RON / lună — totul transparent cu chitanțe digitale',
    icon: CreditCard,
    gradient: 'from-indigo-500 via-blue-600 to-cyan-600',
    accentLight: 'bg-indigo-50', accentDark: 'dark:bg-indigo-950/30',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    description: 'Fiecare membru activ datorează o cotizație lunară de 15 RON. Balanța se calculează automat din luna înscrierii. Plata se face către trezorier, care o înregistrează în sistem. La fiecare plată, primești o chitanță electronică PDF pe care o poți descărca.',
    bullets: [
      '💰 15 RON / lună — cotizația se acumulează automat',
      '📊 Verifică balanța ta oricând din secțiunea Profil',
      '🧾 Chitanțe PDF semnate digital — descărcabile cu un click',
      '⚠️ Restanțele apar ca balanță negativă și sunt vizibile de board',
    ],
    tip: 'Poți plăti mai multe luni în avans. Plata se înregistrează de trezorier și primești chitanță automată.',
    mockup: MockFinancePanel,
    sidebarHighlight: 'Profilul Meu',
  },
  {
    id: 'calendar',
    section: 'Important',
    title: 'Calendar & RSVP',
    subtitle: 'Toate evenimentele la un loc — confirmă-ți participarea',
    icon: Calendar,
    gradient: 'from-cyan-500 via-blue-500 to-indigo-500',
    accentLight: 'bg-cyan-50', accentDark: 'dark:bg-cyan-950/30',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    description: 'Calendarul interactiv afișează toate evenimentele planificate ale clubului: ședințe de board, acțiuni caritabile, întâlniri sociale, workshop-uri. Poți confirma participarea (RSVP) direct cu un click pe eveniment.',
    bullets: [
      '📅 Vizualizare lunară cu toate evenimentele',
      '✅ RSVP — confirmă sau infirmă participarea',
      '🔔 Evenimentele importante sunt marcate vizual',
      '📍 Fiecare eveniment arată locația, ora și detalii',
    ],
    tip: null,
    mockup: MockCalendarGrid,
    sidebarHighlight: 'Calendar',
  },
  // ── SOCIAL & COMMUNITY ──
  {
    id: 'leaderboard',
    section: 'Social',
    title: 'Clasament Live',
    subtitle: 'Competiție prietenească — cine e cel mai implicat?',
    icon: Trophy,
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    accentLight: 'bg-amber-50', accentDark: 'dark:bg-amber-950/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    description: 'Clasamentul se actualizează în timp real pe baza prezenței, participării la proiecte și implicării generale. Poți vedea unde te situezi față de ceilalți membri ai clubului.',
    bullets: [
      '🏆 Top 3 primesc medalie de aur, argint și bronz',
      '📈 Scorurile se bazează pe prezență și activitate',
      '🔄 Se actualizează automat în timp real',
    ],
    tip: null,
    mockup: MockLeaderboard,
    sidebarHighlight: 'Clasament',
  },
  {
    id: 'kudos',
    section: 'Social',
    title: 'Kudos & Aprecieri',
    subtitle: 'Recunoaște efortul colegilor tăi cu badge-uri și mesaje',
    icon: Heart,
    gradient: 'from-rose-500 via-pink-500 to-fuchsia-500',
    accentLight: 'bg-rose-50', accentDark: 'dark:bg-rose-950/30',
    iconColor: 'text-rose-600 dark:text-rose-400',
    description: 'Alege un badge (Spirit de Echipă, Creativitate, Energie Pozitivă, Ajutor Logistic sau Leadership), selectează un coleg și scrie un mesaj de apreciere. Toate kudos-urile apar live în feed-ul comun.',
    bullets: [
      '🤝 Spirit de Echipă — pentru colaborare și suport',
      '🎨 Creativitate — pentru idei și soluții originale',
      '⚡ Energie Pozitivă — pentru motivație și entuziasm',
      '📦 Ajutor Logistic — pentru efort organizatoric',
      '👑 Leadership — pentru inițiativă și conducere',
    ],
    tip: null,
    mockup: MockKudosFeed,
    sidebarHighlight: 'Kudos & Aprecieri',
  },
  {
    id: 'passport',
    section: 'Gamification',
    title: 'Pașaport Voluntar & Insigne',
    subtitle: 'Avansează prin ranguri și deblochează milestone-uri',
    icon: Award,
    gradient: 'from-orange-500 via-amber-500 to-yellow-500',
    accentLight: 'bg-orange-50', accentDark: 'dark:bg-orange-950/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
    description: 'Pașaportul tău de voluntar (accesibil din Profil) arată rangul actual, prezențele acumulate și milestone-urile deblocate. Cu cât ești mai activ, cu atât avansezi mai repede!',
    bullets: [
      '🎯 Recrut — primele prezențe (0-4)',
      '🌱 Voluntar Activ — 5-9 prezențe',
      '🌟 Senior Voluntar — 10-24 prezențe',
      '👑 Ambasador Camena — 25+ prezențe',
    ],
    tip: 'Milestone-uri speciale: „Primii Pași" (3 prezențe), „Disciplină Financiară" (cotizație la zi), „Sponsor Fidel" (donație) și altele.',
    mockup: MockPassportCard,
    sidebarHighlight: 'Profilul Meu',
  },
  // ── IDEAS & INITIATIVES ──
  {
    id: 'suggestions',
    section: 'Inițiative',
    title: 'Casetă Sugestii',
    subtitle: 'Feedback anonim sau cu numele tău — direct la board',
    icon: MessageSquarePlus,
    gradient: 'from-purple-500 via-violet-500 to-indigo-500',
    accentLight: 'bg-purple-50', accentDark: 'dark:bg-purple-950/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    description: 'Ai o idee, o nemulțumire sau o propunere? Trimite-o prin caseta de sugestii. Poți alege confidențialitate totală (anonim) sau să semnezi cu numele tău. Board-ul primește și gestionează fiecare sugestie.',
    bullets: [
      '🔒 Opțiune 100% anonimă — nimeni nu vede cine a trimis',
      '📝 Sau semnează cu numele tău pentru credit',
      '🏷️ Categorii: Proiect, Board, Club, Altele',
      '📊 Board-ul marchează: În Analiză → Aprobat → Implementat',
    ],
    tip: null,
    mockup: MockSuggestionsBox,
    sidebarHighlight: 'Casetă Sugestii',
  },
  {
    id: 'projects',
    section: 'Inițiative',
    title: 'Idei Proiecte',
    subtitle: 'Propune proiecte noi — cu buget, descriere și status',
    icon: FileText,
    gradient: 'from-violet-500 via-purple-500 to-indigo-500',
    accentLight: 'bg-violet-50', accentDark: 'dark:bg-violet-950/30',
    iconColor: 'text-violet-600 dark:text-violet-400',
    description: 'Secțiunea „Idei Proiecte" îți permite să propui proiecte noi pentru club: acțiuni caritabile, campanii, workshop-uri. Poți adăuga descriere, buget estimat și alegi dacă propunerea e cu numele tău sau anonimă.',
    bullets: [
      '📋 Completezi titlu, descriere, buget estimat',
      '🤫 Opțional: propunere anonimă',
      '👀 Board-ul vede toate propunerile și le aprobă/respinge',
      '📊 Statusuri: În Analiză → Aprobat / Respins',
    ],
    tip: null,
    mockup: MockProjectProposal,
    sidebarHighlight: 'Idei Proiecte',
  },
  // ── COMMITTEES & TEAMS ──
  {
    id: 'committees',
    section: 'Organizare',
    title: 'Comitete & Repartizare pe Echipe',
    subtitle: 'Departamente operative, roluri specializate și ore diferențiate',
    icon: Users2,
    gradient: 'from-indigo-600 via-blue-600 to-cyan-500',
    accentLight: 'bg-indigo-50', accentDark: 'dark:bg-indigo-950/30',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    description: 'Proiectele și acțiunile clubului funcționează pe bază de comitete de lucru specializate: PR & Social Media, Logistică & Tehnic (Salahori & Meșteri), Finanțe & Sponsori, Servicii Comunitare. Fiecare membru este repartizat eficient.',
    bullets: [
      '🎯 Departamente Specializate — PR, Logistică, Sponsori, IT, Social',
      '👑 Coordonatori de Comitet — conduc echipa și validează taskurile pe teren',
      '⚙️ Preferințe din Profil — îți alegi domeniile în care vrei să activezi (1-2 comitete)',
      '⏱️ Ore de Voluntariat Diferențiate — calculate automat conform volumului de muncă',
    ],
    tip: 'Setează-ți preferințele de comitet direct din Profil (tab-ul „Comitete & Abilități") pentru ca liderii de proiect să știe unde excelezi!',
    mockup: MockCommitteesOverview,
    sidebarHighlight: 'Repartizare Comitete',
  },
  // ── COMMUNICATION ──
  {
    id: 'news',
    section: 'Comunicare',
    title: 'Știri & Anunțuri',
    subtitle: 'Anunțuri oficiale, rezultate și noutăți din club',
    icon: Megaphone,
    gradient: 'from-sky-500 via-blue-500 to-indigo-500',
    accentLight: 'bg-sky-50', accentDark: 'dark:bg-sky-950/30',
    iconColor: 'text-sky-600 dark:text-sky-400',
    description: 'Știrile sunt postate exclusiv de board/admini. Ca membru, le poți citi, reacționa (👍 ❤️ 👎) și lăsa comentarii. Aici vei găsi anunțuri oficiale, rezultate campanii, și comunicări importante.',
    bullets: [
      '📢 Doar adminii/board-ul pot publica știri',
      '👍 Toți membrii pot reacționa și comenta',
      '🖼️ Știrile pot conține imagini, video și link-uri',
      '🔔 Verifică regulat — aici apar deciziile importante',
    ],
    tip: 'Comentariile la știri sunt vizibile pentru toți membrii. Folosește-le pentru feedback constructiv!',
    mockup: MockNewsFeed,
    sidebarHighlight: 'Știri',
  },
  {
    id: 'forum',
    section: 'Comunicare',
    title: 'Forum & Discuții',
    subtitle: 'Discuții deschise pe teme relevante — toți pot participa',
    icon: MessageSquare,
    gradient: 'from-slate-600 via-zinc-600 to-neutral-700',
    accentLight: 'bg-slate-100', accentDark: 'dark:bg-slate-800/30',
    iconColor: 'text-slate-600 dark:text-slate-400',
    description: 'Spre deosebire de Știri (doar admini postează), Forum-ul este deschis tuturor membrilor. Oricine poate crea un thread nou sau răspunde la unul existent. Locul ideal pentru brainstorming, planificare și discuții libere.',
    bullets: [
      '💬 Orice membru poate crea thread-uri noi',
      '🔥 Thread-urile active sunt marcate ca „HOT"',
      '📌 Adminii pot fixa thread-uri importante',
      '🗨️ Răspunsuri organizate sub fiecare subiect',
    ],
    tip: null,
    mockup: MockForumThreads,
    sidebarHighlight: 'Forum',
  },
  // ── PROFILE ──
  {
    id: 'profile',
    section: 'Contul Tău',
    title: 'Profilul Tău',
    subtitle: 'Tot ce ai nevoie despre contul tău — într-un singur loc',
    icon: User,
    gradient: 'from-blue-500 via-indigo-500 to-violet-500',
    accentLight: 'bg-blue-50', accentDark: 'dark:bg-blue-950/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    description: 'Din profilul tău ai acces la: rating și calificativ, balanța cotizației, chitanțele PDF, pașaportul de voluntar cu insigne și milestone-uri, și editarea informațiilor personale (oraș, bio, avatar).',
    bullets: [
      '📊 Rating, calificativ și statistici prezență',
      '💰 Balanța cotizației cu istoric complet',
      '🧾 Chitanțe electronice PDF descărcabile',
      '🏅 Pașaport voluntar cu rang și insigne',
      '✏️ Editare avatar, oraș, bio',
    ],
    tip: 'Accesează profilul rapid din avatar-ul tău (colțul dreapta-sus) sau din meniu: „Profilul Meu".',
    mockup: MockProfileOverview,
    sidebarHighlight: 'Profilul Meu',
  },
];

/* ============================================================== */
/*  Main Tutorial Component                                        */
/* ============================================================== */

export const PlatformTutorialModal: React.FC<PlatformTutorialModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => { if (isOpen) { setCurrentStep(0); setDirection(1); } }, [isOpen]);

  const goNext = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) { setDirection(1); setCurrentStep(p => p + 1); }
  }, [currentStep]);
  const goPrev = useCallback(() => {
    if (currentStep > 0) { setDirection(-1); setCurrentStep(p => p - 1); }
  }, [currentStep]);
  const handleSkip = useCallback(() => {
    localStorage.setItem('tutorial_completed_v1', 'true'); onClose();
  }, [onClose]);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') handleSkip();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [isOpen, handleSkip, goNext, goPrev]);

  const goToStep = (idx: number) => { setDirection(idx > currentStep ? 1 : -1); setCurrentStep(idx); };
  const handleFinish = () => { localStorage.setItem('tutorial_completed_v1', 'true'); onClose(); };

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const StepIcon = step.icon;
  const MockupComponent = step.mockup;
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0, scale: 0.95 }),
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 md:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/75 backdrop-blur-xl" onClick={handleSkip} />

      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 30 }}
        transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        className="relative w-full max-w-4xl h-[90vh] max-h-[700px] min-h-[520px] sm:min-h-[580px] bg-white dark:bg-[#0F1219] rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 relative shrink-0">
          <motion.div className={`h-full bg-gradient-to-r ${step.gradient}`}
            initial={false} animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }} />
        </div>

        {/* Header */}
        <div className="px-5 sm:px-8 md:px-10 pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#0F1219] z-10">
          <div className="flex items-center gap-3">
            <motion.div key={step.id + '-hi'}
              initial={{ rotate: -90, scale: 0.5 }} animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg shrink-0`}
            >
              <Compass size={20} className="text-white" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em]">Ghid Platformă</span>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${
                  step.section === 'Obligatoriu' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40'
                  : step.section === 'Important' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}>{step.section}</span>
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 font-bold">
                Pasul {currentStep + 1} din {TUTORIAL_STEPS.length}
              </div>
            </div>
          </div>
          <button onClick={handleSkip}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10 shrink-0"
          >Omite turul <X size={16} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 md:px-10 py-5 overscroll-contain">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={step.id} custom={direction} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              {/* Title */}
              <div className="flex items-start gap-4 sm:gap-5 mb-5 sm:mb-6 mt-1">
                <motion.div key={step.id + '-ic'} initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                  className={`w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-xl shrink-0`}
                >
                  <StepIcon size={28} className="text-white md:hidden" />
                  <StepIcon size={40} className="text-white hidden md:block" />
                </motion.div>
                <div className="min-w-0 pt-0.5 sm:pt-1">
                  <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight"
                  >{step.title}</motion.h2>
                  <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                    className="text-xs sm:text-sm md:text-base font-semibold text-slate-500 dark:text-slate-400 mt-1"
                  >{step.subtitle}</motion.p>
                </div>
              </div>

              {/* Two-column */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
                <div className="space-y-4 flex flex-col justify-start">
                  <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-['Manrope']"
                  >{step.description}</motion.p>

                  {step.bullets && (
                    <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                      className="space-y-1.5"
                    >
                      {step.bullets.map((b, i) => (
                        <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.06 }}
                          className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-['Manrope'] leading-snug"
                        >{b}</motion.li>
                      ))}
                    </motion.ul>
                  )}

                  {step.tip && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                      className={`p-3.5 sm:p-4 rounded-2xl ${step.accentLight} ${step.accentDark} border border-slate-200/60 dark:border-white/10`}
                    >
                      <div className="flex items-start gap-3">
                        <Sparkles size={18} className={`${step.iconColor} shrink-0 mt-0.5`} />
                        <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 leading-snug">{step.tip}</span>
                      </div>
                    </motion.div>
                  )}

                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                    className="flex items-center gap-2.5 pt-1"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500">
                      Locație: <span className="text-slate-700 dark:text-slate-300">{step.sidebarHighlight}</span>
                    </span>
                  </motion.div>
                </div>

                <motion.div initial={{ opacity: 0, scale: 0.92, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/8 p-4 sm:p-5 md:p-6 overflow-hidden"
                >
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 ml-2 uppercase tracking-widest">Previzualizare</span>
                  </div>
                  <MockupComponent />
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Fixed Position Footer across PC, Mobile & Tablet */}
        <div className="px-5 sm:px-8 md:px-10 py-3.5 sm:py-4 bg-slate-50/90 dark:bg-[#121620] border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 shrink-0 h-20 z-10">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 max-w-[40%] sm:max-w-none shrink-0">
            {TUTORIAL_STEPS.map((_, idx) => (
              <button key={idx} onClick={() => goToStep(idx)}
                className={`rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentStep ? 'w-6 sm:w-7 h-2.5 bg-gradient-to-r ' + step.gradient + ' shadow-md'
                  : idx < currentStep ? 'w-2 sm:w-2.5 h-2 sm:h-2.5 bg-slate-400 dark:bg-slate-500'
                  : 'w-2 sm:w-2.5 h-2 sm:h-2.5 bg-slate-200 dark:bg-slate-700'
                }`} title={TUTORIAL_STEPS[idx].title}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Always occupy space so layout never shifts */}
            <button
              onClick={goPrev}
              disabled={currentStep === 0}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 min-w-[80px] sm:min-w-[95px] ${
                currentStep === 0 ? 'invisible pointer-events-none opacity-0' : 'opacity-100 cursor-pointer'
              }`}
            >
              <ChevronLeft size={16} /> <span>Înapoi</span>
            </button>

            {isLast ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleFinish}
                className="px-4 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs sm:text-sm md:text-base font-bold flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition-all min-w-[140px] sm:min-w-[180px] cursor-pointer"
              >
                <Sparkles size={17} /> <span className="truncate">Începe Explorarea!</span>
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={goNext}
                className={`px-4 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r ${step.gradient} text-white text-xs sm:text-sm md:text-base font-bold flex items-center justify-center gap-2 shadow-xl transition-all min-w-[140px] sm:min-w-[180px] cursor-pointer`}
              >
                <span>Următorul</span> <ChevronRight size={17} />
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
