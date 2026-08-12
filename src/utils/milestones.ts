export interface Milestone {
  id: string;
  title: string;
  desc: string;
  icon: string;
  badge: string;
  category: 'hours' | 'attendance' | 'score' | 'kudos' | 'finance' | 'custom';
  current: number;
  target: number;
  unit?: string;
  unlocked: boolean;
  color?: string;
}

export function computeMemberMilestones(member: any, kudosCount: number = 0): {
  allMilestones: Milestone[];
  unlockedMilestones: Milestone[];
  unlockedCount: number;
  totalCount: number;
  tier: { title: string; icon: string; desc: string; color: string };
} {
  const p = Number(member.presences || 0);
  const u = Number(member.unexcusedAbsences || 0);
  const tp = Number(member.totalPaid || 0);
  const hours = Number(member.stats?.hours ?? member.hours ?? (p > 0 ? p * 2 : 0));
  const score = Number(member.score || 0);
  
  const totalEvents = p + u;
  const attendanceRate = totalEvents > 0 ? Math.round((p / totalEvents) * 100) : (p > 0 ? 100 : 0);
  const isDebtFree = Number(member.debt ?? 0) === 0;

  // Tier level
  const tier = hours >= 50 || p >= 25 
    ? { title: 'Ambasador Camena', icon: '👑', desc: 'Lider de opinie și pilon de bază al clubului', color: 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700/50' }
    : hours >= 30 || p >= 10
    ? { title: 'Senior Voluntar', icon: '🌟', desc: 'Implicare remarcabilă și experiență confirmată', color: 'bg-purple-50 text-purple-900 border-purple-300 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-700/50' }
    : hours >= 12 || p >= 4
    ? { title: 'Voluntar Activ', icon: '⚡', desc: 'Participare activă și dedicare constantă', color: 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-700/50' }
    : { title: 'Recrut Nou', icon: '🌱', desc: 'La început de drum în călătoria Interact', color: 'bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-700/50' };

  // Standard Automatic Milestones
  const standardMilestones: Milestone[] = [
    {
      id: 'auto_hours_30',
      title: 'Centurion Camena',
      desc: 'Peste 30 de ore de voluntariat validate pe teren',
      icon: '🏆',
      badge: '30+ ORE',
      category: 'hours',
      current: Math.min(hours, 30),
      target: 30,
      unit: 'ore',
      unlocked: hours >= 30,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-500 border-amber-500/40'
    },
    {
      id: 'auto_hours_50',
      title: 'Veteran Devotat',
      desc: 'Peste 50 de ore dedicate inițiativelor comunitare',
      icon: '🌟',
      badge: '50+ ORE',
      category: 'hours',
      current: Math.min(hours, 50),
      target: 50,
      unit: 'ore',
      unlocked: hours >= 50,
      color: 'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/40'
    },
    {
      id: 'auto_hours_100',
      title: 'Centurion Suprem',
      desc: 'Depășit pragul de 100 de ore de voluntariat pur',
      icon: '👑',
      badge: '100+ ORE',
      category: 'hours',
      current: Math.min(hours, 100),
      target: 100,
      unit: 'ore',
      unlocked: hours >= 100,
      color: 'from-yellow-500/20 to-amber-500/20 text-yellow-500 border-yellow-500/40'
    },
    {
      id: 'auto_presences_3',
      title: 'Primii Pași',
      desc: 'Participă la minim 3 întâlniri sau acțiuni',
      icon: '🎯',
      badge: '3 PREZENȚE',
      category: 'attendance',
      current: Math.min(p, 3),
      target: 3,
      unit: 'ședințe',
      unlocked: p >= 3,
      color: 'from-blue-500/20 to-sky-500/20 text-blue-400 border-blue-500/40'
    },
    {
      id: 'auto_presences_10',
      title: 'Pilonul Echipei',
      desc: 'Atinge 10 prezențe validate în activitatea clubului',
      icon: '🏛️',
      badge: '10 PREZENȚE',
      category: 'attendance',
      current: Math.min(p, 10),
      target: 10,
      unit: 'ședințe',
      unlocked: p >= 10,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/40'
    },
    {
      id: 'auto_presences_25',
      title: 'Legendă Activă',
      desc: 'Peste 25 de participări și devotament de lungă durată',
      icon: '🔥',
      badge: '25 PREZENȚE',
      category: 'attendance',
      current: Math.min(p, 25),
      target: 25,
      unit: 'ședințe',
      unlocked: p >= 25,
      color: 'from-rose-500/20 to-red-500/20 text-rose-400 border-rose-500/40'
    },
    {
      id: 'auto_rate_100',
      title: 'Prezență Impecabilă',
      desc: 'Rată de prezență de 100% la acțiunile clubului',
      icon: '💎',
      badge: '100% PREZENȚĂ',
      category: 'attendance',
      current: (attendanceRate === 100 && p >= 3) ? 1 : 0,
      target: 1,
      unlocked: attendanceRate === 100 && p >= 3,
      color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/40'
    },
    {
      id: 'auto_kudos_5',
      title: 'Magnet de Comunitate',
      desc: 'Peste 5 aprecieri (kudos) primite de la colegi',
      icon: '❤️',
      badge: '5+ KUDOS',
      category: 'kudos',
      current: Math.min(kudosCount, 5),
      target: 5,
      unit: 'kudos',
      unlocked: kudosCount >= 5,
      color: 'from-pink-500/20 to-rose-500/20 text-pink-400 border-pink-500/40'
    },
    {
      id: 'auto_kudos_1',
      title: 'Spirit de Echipă',
      desc: 'Apreciat de colegi prin recunoaștere oficială în platformă',
      icon: '🤝',
      badge: 'KUDOS ACTIV',
      category: 'kudos',
      current: Math.min(kudosCount, 1),
      target: 1,
      unit: 'kudos',
      unlocked: kudosCount >= 1,
      color: 'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/40'
    },
    {
      id: 'auto_score_25',
      title: 'Motorul Clubului',
      desc: 'Peste 25 de puncte acumulate în clasament',
      icon: '⚡',
      badge: '25+ PUNCTE',
      category: 'score',
      current: Math.min(score, 25),
      target: 25,
      unit: 'pct',
      unlocked: score >= 25,
      color: 'from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/40'
    },
    {
      id: 'auto_finance_clear',
      title: 'Disciplină Financiară',
      desc: 'Balanță la zi și fără restanțe la cotizația de membru',
      icon: '🛡️',
      badge: 'COTIZAȚIE LA ZI',
      category: 'finance',
      current: isDebtFree && tp >= 15 ? 1 : 0,
      target: 1,
      unlocked: isDebtFree && tp >= 15,
      color: 'from-emerald-500/20 to-green-500/20 text-emerald-400 border-emerald-500/40'
    }
  ];

  // Custom Registered Milestones
  const customList: Milestone[] = (member.customMilestones || member.stats?.customMilestones || []).map((cm: any) => ({
    id: cm.id || `custom_${cm.title}`,
    title: cm.title,
    desc: cm.desc || cm.description || 'Milestone personalizat acordat de conducere.',
    icon: cm.icon || '🏆',
    badge: cm.badge || 'RECORD VALIDAT',
    category: 'custom' as const,
    current: 1,
    target: 1,
    unlocked: true,
    color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/40'
  }));

  const allMilestones = [...customList, ...standardMilestones];
  const unlockedMilestones = allMilestones.filter(m => m.unlocked);

  return {
    allMilestones,
    unlockedMilestones,
    unlockedCount: unlockedMilestones.length,
    totalCount: allMilestones.length,
    tier
  };
}
