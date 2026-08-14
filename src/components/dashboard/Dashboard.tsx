import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Users, Users2, CheckCircle, Calendar as CalendarIcon,
  Lightbulb, Globe, CreditCard, PieChart, FileText,
  User, LogOut, Search,
  AlertCircle, Download,
  Wallet, RotateCcw, MessageSquare, Megaphone, Trophy,
  Upload, Eye, EyeOff, Star, Clock, MapPin, Send,
  Menu, X, ChevronsLeft, ChevronsRight, ChevronDown, Settings, Sun, Moon,
  Heart, MessageSquarePlus, Compass
} from 'lucide-react';


import { MembersView } from './views/MembersView';
import { AuroraBackground } from '../ui/AuroraBackground';
import { CommandPalette, type CommandNavItem } from './CommandPalette';
import { calculateDebt, calculateQualification, generateMemberLedger } from '../../utils/finance';
import { fetchMembers, updateMemberFields, revertLatestTreasuryPayment, fetchAllTreasuryPayments } from '../../utils/supabaseService';
import { canEditMemberPassword, isBoardMember } from '../../utils/permissions';
import { supabase } from '../../supabase';
import { toast } from '../ui/Toast';
import { AddMemberModal } from '../members/AddMemberModal';
import { AttendanceView } from './views/AttendanceView';
import { EventsView } from './views/EventsView';
import { IdeasView } from './views/IdeasView';
import { CommunityIdeasView } from './views/CommunityIdeasView';
import { RepartizareView } from './views/RepartizareView';

import { ProjectProposalsView } from './views/ProjectProposalsView';
import { ForumView } from './views/ForumView';
import { NewsView } from './views/NewsView';
import { LeaderboardView } from './views/LeaderboardView';
import { BudgetView } from './views/BudgetView';
import { KudosView } from './views/KudosView';
import { SuggestionsView } from './views/SuggestionsView';
import { MasterAuditView } from './views/MasterAuditView';
import { PlatformTutorialModal } from './PlatformTutorialModal';
import { NotificationsDropdown } from './NotificationsDropdown';
import { MemberActivityHub } from './hubs/MemberActivityHub';
import { MemberCommunityHub } from './hubs/MemberCommunityHub';
import { AdminTeamHub } from './hubs/AdminTeamHub';
import { AdminFinanceHub } from './hubs/AdminFinanceHub';
import { AdminCommunityHub } from './hubs/AdminCommunityHub';
import { VolunteerSpotlightCard } from './VolunteerSpotlightCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ShieldAlert, Zap, Sparkles } from 'lucide-react';

interface DashboardProps {
  username: string;
  onLogout: () => void;
}

const easeOut: [number, number, number, number] = [0.23, 1, 0.32, 1];

const Card = ({ children, className = '', onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
  <div
    onClick={onClick}
    className={`civic-card bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 p-5 rounded-[2px] transition-colors ${
      onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 focus-ring' : ''
    } ${className}`}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    role={onClick ? 'button' : undefined}
  >
    {children}
  </div>
);

// Date, Time & Day Widget (flashes red when an event is ongoing)
function ClockWidget({ events }: { events: any[] }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check if any event is ongoing (active)
  const ongoingEvent = events.find(event => {
    if (event.attendanceClosed) return false;
    if (!event.date || !event.time) return false;
    const eventStart = new Date(`${event.date}T${event.time}`).getTime();
    const eventEnd = eventStart + 2 * 60 * 60 * 1000; // default 2 hours duration
    const now = time.getTime();
    return now >= eventStart && now <= eventEnd;
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatDay = (date: Date) => {
    const day = date.toLocaleDateString('ro-RO', { weekday: 'long' });
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  if (ongoingEvent) {
    return (
      <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800/80 rounded-[2px] transition-colors shrink-0">
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-title font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-[1px] bg-rose-600" />
            Activ
          </span>
          <span className="text-xs font-semibold truncate max-w-[120px] md:max-w-[160px] font-anthropic" title={ongoingEvent.title}>
            {ongoingEvent.title}
          </span>
        </div>
        <div className="w-px h-6 bg-rose-200 dark:bg-rose-800" />
        <div className="flex flex-col text-right shrink-0 font-data">
          <span className="text-xs md:text-sm font-bold tracking-tight">{formatTime(time)}</span>
          <span className="text-[10px] font-title uppercase text-rose-600 dark:text-rose-400">{formatDay(time)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2px] transition-colors shrink-0">
      <div className="flex flex-col text-left">
        <span className="text-[10px] font-title font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{formatDay(time)}</span>
        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-anthropic">{formatDate(time)}</span>
      </div>
      <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
      <div className="text-xs md:text-sm font-bold font-data text-slate-900 dark:text-slate-100 shrink-0">
        {formatTime(time)}
      </div>
    </div>
  );
}

// ==========================================
// VIEWS
// ==========================================

// 1. Dashboard View
interface ViewDashboardProps {
  members: any[];
  currentUserObj: any;
  isAdmin: boolean;
  onNavigateToSection: (section: string) => void;
  onRedirectToExcuse: (eventId: string) => void;
  events: any[];
}

interface Poll {
  id?: string;
  question: string;
  options: string[];
  votes: Record<string, number | number[]>;
  isActive?: boolean;
  closed?: boolean;
  isMultipleChoice?: boolean;
  createdAt?: string;
}

const ViewDashboard = ({ members, currentUserObj, isAdmin, onNavigateToSection, onRedirectToExcuse, events }: ViewDashboardProps) => {
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [latestNews, setLatestNews] = useState<any | null>(null);
  const [nextEvent, setNextEvent] = useState<any | null>(null);
  useEffect(() => {
    // 1. Live Poll Subscription
    const fetchLatestPoll = async () => {
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(1);
      if (!error && data && data.length > 0) {
        const poll = data[0];
        setActivePoll({ ...poll, closed: poll.isActive === false });
      } else {
        setActivePoll(null);
      }
    };
    fetchLatestPoll();

    // 2. Latest News Subscription
    const fetchLatestNews = async () => {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(1);
      if (!error && data && data.length > 0) {
        setLatestNews(data[0]);
      } else {
        setLatestNews(null);
      }
    };
    fetchLatestNews();

    // 3. Next Event Live Subscription
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*');
      if (!error && data) {
        const now = Date.now();
        const futureEvents = data
          .map((ev: any) => ({ ...ev, timeStamp: new Date(`${ev.date}T${ev.time || '00:00'}`).getTime() }))
          .filter((ev: any) => ev.timeStamp >= now)
          .sort((a: any, b: any) => a.timeStamp - b.timeStamp);
        setNextEvent(futureEvents.length > 0 ? futureEvents[0] : null);
      }
    };
    fetchEvents();

    const pollsChannel = supabase.channel('dashboard_polls').on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, () => { fetchLatestPoll(); }).subscribe();
    const newsChannel = supabase.channel('dashboard_news').on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, () => { fetchLatestNews(); }).subscribe();
    const eventsChannel = supabase.channel('dashboard_events').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => { fetchEvents(); }).subscribe();

    return () => {
      supabase.removeChannel(pollsChannel);
      supabase.removeChannel(newsChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, []);

  const handleVote = async (optionIndex: number) => {
    if (activePoll?.closed) {
      toast.error("Acest sondaj este închis. Votarea nu mai este posibilă.");
      return;
    }
    if (!currentUserObj) {
      toast.error("Trebuie să fii conectat ca membru pentru a vota.");
      return;
    }
    const userId = currentUserObj.id || currentUserObj.username;
    if (!userId || !activePoll?.id) return;

    try {
      const currentVotes = { ...(activePoll.votes || {}) };
      currentVotes[userId] = optionIndex;

      const { error } = await supabase
        .from('polls')
        .update({ votes: currentVotes })
        .eq('id', activePoll.id);
      if (error) throw error;
      toast.success("Votul tău a fost înregistrat!");
    } catch (err) {
      console.error("Failed to vote", err);
      toast.error("Eroare la înregistrarea votului.");
    }
  };

  const handleClosePoll = async () => {
    if (!activePoll?.id) return;
    try {
      const { error } = await supabase
        .from('polls')
        .update({ isActive: false })
        .eq('id', activePoll.id);
      if (error) throw error;
      toast.success("Sondajul a fost închis! Rezultatele finale sunt acum vizibile.");
    } catch (err) {
      console.error("Failed to close poll", err);
      toast.error("Eroare la închiderea sondajului.");
    }
  };

  const handleArchivePoll = async () => {
    if (!activePoll?.id) return;
    try {
      const archiveId = `archived_${Date.now()}`;
      const { error: insertErr } = await supabase.from('archived_polls').insert({
        id: archiveId,
        question: activePoll.question,
        options: activePoll.options,
        votes: activePoll.votes,
        isActive: activePoll.isActive,
        isMultipleChoice: activePoll.isMultipleChoice,
        createdAt: activePoll.createdAt,
        archivedAt: new Date().toISOString()
      });
      if (insertErr) throw insertErr;

      const { error: deleteErr } = await supabase.from('polls').delete().eq('id', activePoll.id);
      if (deleteErr) throw deleteErr;
      toast.success("Sondajul a fost arhivat cu succes!");
    } catch (err) {
      console.error("Failed to archive poll", err);
      toast.error("Eroare la arhivarea sondajului.");
    }
  };

  const handleRSVP = async (rsvpStatus: 'confirmed' | 'declined') => {
    if (!nextEvent || !currentUserObj) {
      toast.error("Trebuie să fii conectat ca membru pentru RSVP.");
      return;
    }
    if (currentUserObj.role === 'admin') {
      toast.error("Membrii Board nu înregistrează RSVP.");
      return;
    }
    const userId = currentUserObj.id || currentUserObj.username;
    try {
      const currentRSVPs = { ...(nextEvent.rsvps || {}) };
      currentRSVPs[userId] = rsvpStatus;

      const { error } = await supabase
        .from('events')
        .update({ rsvps: currentRSVPs })
        .eq('id', nextEvent.id);
      if (error) throw error;
      toast.success(rsvpStatus === 'confirmed' ? "Te-ai înscris la eveniment!" : "Ai refuzat participarea.");
    } catch (err) {
      console.error("RSVP error", err);
      toast.error("Eroare la trimiterea RSVP-ului.");
    }
  };

  const membersCount = members.length;
  const totalCollected = members.reduce((sum, m) => sum + (m.totalPaid || 0), 0);
  const totalGlobalDebt = members.reduce((sum, m) => sum + calculateDebt(m.joinDate, m.totalPaid || 0), 0);
  const complianceRate = totalCollected + totalGlobalDebt > 0 
    ? Math.round((totalCollected / (totalCollected + totalGlobalDebt)) * 100) 
    : 0;

  const personalDebt = currentUserObj ? calculateDebt(currentUserObj.joinDate, currentUserObj.totalPaid || 0) : 0;
  const personalHours = isBoardMember(currentUserObj) ? 0 : (currentUserObj?.stats?.hours || 0);
  const personalProjects = currentUserObj?.stats?.projects || 0;

  const topVolunteers = [...members]
    .filter(m => !isBoardMember(m))
    .sort((a, b) => (b.stats?.hours || 0) - (a.stats?.hours || 0))
    .slice(0, 3);

  // Poziția în clasamentul general (scor all-time), excluzând membrii Board-ului — arată "Top X%".
  const rankableMembers = [...members]
    .filter(m => !isBoardMember(m))
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  const myRankIndex = (currentUserObj && !isBoardMember(currentUserObj)) ? rankableMembers.findIndex(m => m.id === currentUserObj.id) : -1;
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;
  const myTopPercent = myRank && rankableMembers.length > 0
    ? Math.max(1, Math.round((myRank / rankableMembers.length) * 100))
    : null;

  const totalVotes = activePoll ? Object.keys(activePoll.votes || {}).length : 0;
  const userVote = currentUserObj && activePoll ? (activePoll.votes || {})[currentUserObj.id || currentUserObj.username] : undefined;

  // combined volunteer stats (excluding Board / Admin members from total volunteer hours)
  const totalCombinedHours = members
    .filter(m => !isBoardMember(m))
    .reduce((sum, m) => sum + (m.stats?.hours || 0), 0);
  const totalCombinedProjects = events.filter(e => e.type === 'social').length;
  const targetMonthlyHours = 500;
  const targetPercentage = Math.min(100, Math.round((totalCombinedHours / targetMonthlyHours) * 100));

  // Next Event calculations
  let countdownDays = 0;
  let userRsvpStatus = 'none';
  const enrolledCommittees: string[] = [];
  if (nextEvent) {
    const eventMidnight = new Date(`${nextEvent.date}T00:00:00`).getTime();
    countdownDays = Math.max(0, Math.ceil((eventMidnight - Date.now()) / 86400000));
    if (currentUserObj && nextEvent.rsvps) {
      userRsvpStatus = nextEvent.rsvps[currentUserObj.id || currentUserObj.username] || 'none';
    }
    if (nextEvent.type === 'project' && nextEvent.committees && currentUserObj) {
      Object.values(nextEvent.committees).forEach((comm: any) => {
        const isMember = comm.members?.includes(currentUserObj.id);
        const isCoordinator = comm.coordinatorId === currentUserObj.id;
        if (isMember || isCoordinator) {
          enrolledCommittees.push(comm.name);
        }
      });
    }
  }

  // Calculate dynamic stats for logged-in member
  const statsObj = currentUserObj?.stats || { presences: 0, excusedAbsences: 0, unexcusedAbsences: 0 };
  const personalQualObj = calculateQualification(
    statsObj.presences || 0,
    statsObj.excusedAbsences || 0,
    statsObj.unexcusedAbsences || 0,
    currentUserObj?.status,
    currentUserObj?.role
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-anthropic">
      {/* 0. Executive Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-title uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
            {(() => { const h = new Date().getHours(); return h < 12 ? 'Bună dimineața' : h < 18 ? 'Bună ziua' : 'Bună seara'; })()} • Portal Guvernanță
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-anthropicSerif font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {isAdmin ? 'Panou Administrativ' : (currentUserObj?.name || currentUserObj?.nickname || 'Voluntar')}
            <span className="text-blue-600 dark:text-blue-400 font-light mx-2">/</span>
            <span className="text-slate-500 dark:text-slate-400 font-normal text-xl sm:text-2xl">Interact Camena</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-title font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-[2px] border border-slate-200 dark:border-slate-700 shrink-0">
          <span className="w-2 h-2 rounded-[1px] bg-emerald-500" />
          {new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* 1. Primary Metrics Grid (High Legibility & Strict Contrast) */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${!isAdmin ? 'xl:grid-cols-4' : ''} gap-4`}>
        {isAdmin ? (
          <>
            <Card
              className="cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 group"
              onClick={() => onNavigateToSection('membri')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-title font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Registru Membri
                  </span>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold font-data text-slate-900 dark:text-slate-100">
                    {membersCount}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-[2px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-800/60">
                  <Users size={20} />
                </div>
              </div>
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
                <span>Voluntari activi înregistrați</span>
                <span className="text-blue-600 dark:text-blue-400 font-title font-bold group-hover:translate-x-0.5 transition-transform">Deschide →</span>
              </div>
            </Card>

            <Card
              className="cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-500 group"
              onClick={() => onNavigateToSection('istoric')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-title font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Fonduri Încasate
                  </span>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold font-data text-emerald-700 dark:text-emerald-400">
                    {totalCollected} <span className="text-base font-medium">Lei</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-[2px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60">
                  <Wallet size={20} />
                </div>
              </div>
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
                <span>Cotizații procesate trezorerie</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-title font-bold group-hover:translate-x-0.5 transition-transform">Registru →</span>
              </div>
            </Card>

            <Card
              className="cursor-pointer hover:border-rose-500 dark:hover:border-rose-500 group"
              onClick={() => onNavigateToSection('istoric')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-title font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Restanțe de Încasat
                  </span>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold font-data text-rose-700 dark:text-rose-400">
                    {totalGlobalDebt} <span className="text-base font-medium">Lei</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-[2px] bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/60 dark:border-rose-800/60">
                  <AlertCircle size={20} />
                </div>
              </div>
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
                <span>Obligații restante club</span>
                <span className="text-rose-700 dark:text-rose-400 font-title font-bold group-hover:translate-x-0.5 transition-transform">Detalii →</span>
              </div>
            </Card>
          </>
        ) : (
          <>
            <Card
              className="cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 group"
              onClick={() => onNavigateToSection('profil')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-title font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Situație Cotizație
                  </span>
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold font-data text-slate-900 dark:text-slate-100">
                    {personalDebt === 0 ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">La zi</span>
                    ) : (
                      <span className="text-rose-700 dark:text-rose-400">{personalDebt} Lei <span className="text-xs font-normal">restanță</span></span>
                    )}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-[2px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-800/60">
                  <CreditCard size={20} />
                </div>
              </div>
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
                <span>15 Lei / lună calendaristică</span>
                <span className="text-blue-600 dark:text-blue-400 font-title font-bold group-hover:translate-x-0.5 transition-transform">Fișă →</span>
              </div>
            </Card>

            <Card
              className="cursor-pointer hover:border-amber-500 dark:hover:border-amber-500 group"
              onClick={() => onNavigateToSection('clasament')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-title font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Ore Voluntariat
                  </span>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold font-data text-slate-900 dark:text-slate-100">
                    {personalHours} <span className="text-base font-normal text-slate-500">ore</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-[2px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/60 dark:border-amber-800/60">
                  <Clock size={20} />
                </div>
              </div>
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
                <span>Timp investit în acțiuni</span>
                <span className="text-amber-700 dark:text-amber-400 font-title font-bold group-hover:translate-x-0.5 transition-transform">Clasament →</span>
              </div>
            </Card>

            <Card
              className="cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-500 group"
              onClick={() => onNavigateToSection('clasament')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-title font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Poziție Clasament
                  </span>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold font-data text-slate-900 dark:text-slate-100">
                    {myTopPercent !== null ? <>Top {myTopPercent}%</> : '—'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-[2px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60">
                  <Trophy size={20} />
                </div>
              </div>
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
                <span>{myRank !== null ? `Locul #${myRank} din ${rankableMembers.length} membri` : 'Fără punctaj'}</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-title font-bold group-hover:translate-x-0.5 transition-transform">Top →</span>
              </div>
            </Card>

            <Card
              className="cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 group"
              onClick={() => onNavigateToSection('proiecte')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-title font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Proiecte & Comitete
                  </span>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold font-data text-slate-900 dark:text-slate-100">
                    {personalProjects}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-[2px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-800/60">
                  <Lightbulb size={20} />
                </div>
              </div>
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
                <span>Propuneri active înregistrate</span>
                <span className="text-blue-600 dark:text-blue-400 font-title font-bold group-hover:translate-x-0.5 transition-transform">Inițiative →</span>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Spotlight: Voluntarul Lunii */}
      <VolunteerSpotlightCard
        members={members}
        currentUserId={currentUserObj?.id}
        onNavigateToLeaderboard={() => onNavigateToSection('clasament')}
      />

      {/* 2. Official News Dispatch (Clean Civic Panel) */}
      {latestNews && (
        <div
          onClick={() => onNavigateToSection('stiri')}
          className="bg-slate-900 text-white p-5 md:p-6 rounded-[2px] border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:border-slate-700 transition-colors focus-ring"
          tabIndex={0}
          role="button"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateToSection('stiri'); } }}
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-[2px] bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/15">
              <Megaphone size={22} />
            </div>
            <div>
              <div className="inline-block text-xs font-title font-bold uppercase tracking-wider px-2.5 py-1 rounded-[2px] bg-white/10 text-slate-200 border border-white/15 mb-1.5">
                Comunicat Oficial
              </div>
              <h3 className="text-xl sm:text-2xl font-anthropicSerif font-bold text-white leading-snug">
                {latestNews.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 line-clamp-1 font-anthropic mt-1 max-w-3xl">
                {latestNews.content}
              </p>
            </div>
          </div>
          <div className="text-xs sm:text-sm font-title font-bold uppercase tracking-wider text-blue-300 shrink-0 self-end md:self-center">
            Citește Documentul &rarr;
          </div>
        </div>
      )}

      {/* 3. Core Action Matrix (2-Column Architectural Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Live Poll or Active Projects */}
        {activePoll ? (
          <Card className="md:col-span-7 lg:col-span-8 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h3 className="font-anthropicSerif font-bold text-lg sm:text-xl flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Globe size={20} className={activePoll.closed ? 'text-amber-600' : 'text-blue-600 dark:text-blue-400'} />
                  {activePoll.closed ? 'Rezultate Finale Sondaj' : 'Sondaj în Desfășurare'}
                </h3>
                <span className="text-xs font-title uppercase font-bold px-2.5 py-1 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {activePoll.closed ? 'Încheiat' : 'Activ'} • {totalVotes} {totalVotes === 1 ? 'vot' : 'voturi'}
                </span>
              </div>

              <div className="space-y-4">
                <h4 className="text-base sm:text-lg font-anthropicSerif font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {activePoll.question}
                </h4>

                <div className="space-y-2.5">
                  {(activePoll.options || []).map((option, idx) => {
                    const optionVotes = Object.values(activePoll.votes || {}).filter(v => Array.isArray(v) ? v.includes(idx) : v === idx).length;
                    const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                    const isSelected = Array.isArray(userVote) ? userVote.includes(idx) : userVote === idx;

                    if (activePoll.closed) {
                      return (
                        <div
                          key={idx}
                          className={`w-full p-3.5 sm:p-4 rounded-[2px] border transition-all relative overflow-hidden flex items-center justify-between ${
                            isSelected
                              ? 'border-amber-500/80 bg-amber-50/50 dark:bg-amber-950/20'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30'
                          }`}
                        >
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-amber-500/10 transition-all duration-500 ease-out z-0"
                            style={{ width: `${percentage}%` }}
                          />
                          <span className="text-xs sm:text-sm font-semibold z-10 relative flex items-center gap-2 font-anthropic text-slate-900 dark:text-slate-100">
                            {isSelected && <span className="text-amber-600 font-bold">✓</span>}
                            {option}
                          </span>
                          <span className="text-xs sm:text-sm font-bold font-data z-10 relative text-slate-600 dark:text-slate-400">
                            {optionVotes} ({percentage}%)
                          </span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleVote(idx)}
                        className={`w-full text-left p-3.5 sm:p-4 rounded-[2px] border transition-all relative overflow-hidden flex items-center justify-between cursor-pointer focus-ring ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-blue-600/10 transition-all duration-500 ease-out z-0"
                          style={{ width: `${percentage}%` }}
                        />
                        <span className="text-xs sm:text-sm font-semibold z-10 relative flex items-center gap-2 font-anthropic text-slate-900 dark:text-slate-100">
                          {isSelected && <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>}
                          {option}
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-data z-10 relative text-slate-600 dark:text-slate-400">
                          {percentage}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                {activePoll.closed ? (
                  <button
                    onClick={handleArchivePoll}
                    className="btn-civic-secondary py-2 px-4 text-xs sm:text-sm font-title uppercase tracking-wider"
                  >
                    Arhivează Rezultatele
                  </button>
                ) : (
                  <button
                    onClick={handleClosePoll}
                    className="btn-civic-primary py-2 px-4 text-xs sm:text-sm font-title uppercase tracking-wider"
                  >
                    Închide Votarea
                  </button>
                )}
              </div>
            )}
          </Card>
        ) : (
          <Card className="md:col-span-7 lg:col-span-8 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h3 className="font-anthropicSerif font-bold text-lg sm:text-xl flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Lightbulb size={20} className="text-blue-600 dark:text-blue-400" />
                  Portofoliu Inițiative în Derulare
                </h3>
                <span className="text-xs font-title uppercase font-bold px-2.5 py-1 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Proiecte
                </span>
              </div>

              {events.filter(e => e.type === 'project' && !e.attendanceClosed).length > 0 ? (
                <div className="space-y-2.5">
                  {events.filter(e => e.type === 'project' && !e.attendanceClosed).slice(0, 3).map((proj) => (
                    <div
                      key={proj.id}
                      className="p-3.5 bg-slate-50/70 dark:bg-slate-900/40 rounded-[2px] border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-anthropic">
                          {proj.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                          <MapPin size={13} /> {proj.location || 'Locație comunicată intern'}
                        </p>
                      </div>
                      <button
                        onClick={() => onNavigateToSection('proiecte')}
                        className="btn-civic-secondary py-1.5 px-3 text-xs sm:text-sm font-title font-bold uppercase tracking-wider"
                      >
                        Detalii
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs sm:text-sm text-slate-400 dark:text-slate-500 italic">
                  Nu există acțiuni comunitare în derulare în acest moment.
                </div>
              )}
            </div>

            {!isAdmin && (
              <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-between items-center text-xs sm:text-sm">
                <span className="text-slate-500 dark:text-slate-400">Vrei să propui o inițiativă comunitară nouă?</span>
                <button
                  onClick={() => onNavigateToSection('proiecte')}
                  className="text-blue-600 dark:text-blue-400 font-title font-bold hover:underline"
                >
                  Propune un Proiect &rarr;
                </button>
              </div>
            )}
          </Card>
        )}

        {/* Right Column: Next Meeting Countdown & RSVP */}
        <Card className="md:col-span-5 lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-anthropicSerif font-bold text-lg sm:text-xl flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Clock size={20} className="text-slate-700 dark:text-slate-300" />
                Următoarea Întâlnire
              </h3>
              <span className="text-xs font-title uppercase font-bold px-2.5 py-1 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Agenda
              </span>
            </div>

            {nextEvent ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="text-center bg-slate-100 dark:bg-slate-800 p-3 rounded-[2px] border border-slate-200 dark:border-slate-700 min-w-[70px] shrink-0">
                    <div className="text-2xl sm:text-3xl font-bold font-data text-slate-900 dark:text-slate-100 leading-none">
                      {countdownDays}
                    </div>
                    <div className="text-xs font-title font-bold uppercase text-slate-500 dark:text-slate-400 mt-1">
                      Zile
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-anthropicSerif font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate" title={nextEvent.title}>
                      {nextEvent.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin size={13} /> {nextEvent.location || 'Sediu Interact'}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-data mt-0.5">
                      {new Date(nextEvent.date).toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' })} la {nextEvent.time}
                    </p>
                  </div>
                </div>

                {nextEvent.type === 'project' ? (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="text-xs font-title font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Comitet de Lucru
                    </div>
                    {enrolledCommittees.length > 0 ? (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-[2px] text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-medium">
                        Ești înscris în: <strong className="font-bold">{enrolledCommittees.join(', ')}</strong>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-[2px] text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                        Neînscris în comitete pentru această acțiune.
                      </div>
                    )}
                  </div>
                ) : currentUserObj?.role === 'admin' ? (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2px] text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium flex items-center justify-between">
                      <span>Membru Consiliu Director</span>
                      <span className="text-xs font-title font-bold uppercase px-2 py-0.5 rounded-[2px] bg-slate-200 dark:bg-slate-700">BOARD</span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="text-xs font-title font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Confirmare Prezență (RSVP)
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRSVP('confirmed')}
                        className={`flex-1 py-2.5 text-xs sm:text-sm font-title font-bold uppercase tracking-wider rounded-[2px] transition-colors border ${
                          userRsvpStatus === 'confirmed'
                            ? 'bg-emerald-700 border-emerald-700 text-white'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                        }`}
                      >
                        Particip
                      </button>
                      <button
                        onClick={() => onRedirectToExcuse(nextEvent.id)}
                        className={`flex-1 py-2.5 text-xs sm:text-sm font-title font-bold uppercase tracking-wider rounded-[2px] transition-colors border ${
                          userRsvpStatus === 'declined'
                            ? 'bg-rose-700 border-rose-700 text-white'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                        }`}
                      >
                        Învoire
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs sm:text-sm text-slate-400 dark:text-slate-500 italic">
                Nu sunt întâlniri programate în agendă.
              </div>
            )}
          </div>
        </Card>

        {/* Financial Governance Card */}
        {isAdmin ? (
          <Card className="md:col-span-5 lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h3 className="font-anthropicSerif font-bold text-lg sm:text-xl flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <CreditCard size={20} className="text-emerald-700 dark:text-emerald-400" />
                  Monitorizare Cotizații Club
                </h3>
                <span className="text-xs font-title uppercase font-bold px-2.5 py-1 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Trezorerie
                </span>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-[2px] border border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-xs font-title uppercase font-bold text-slate-500 dark:text-slate-400">
                      Rată Conformitate
                    </div>
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-bold font-data text-slate-900 dark:text-slate-100">
                      {complianceRate}%
                    </div>
                  </div>
                  <div className="text-right text-xs sm:text-sm font-data">
                    <div className="text-emerald-700 dark:text-emerald-400 font-bold">{totalCollected} Lei încasat</div>
                    <div className="text-rose-700 dark:text-rose-400 font-bold">{totalGlobalDebt} Lei restant</div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-anthropic">
                  Calculat automat raportat la obligația de 15 Lei/lună pentru toți membrii activi.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateToSection('istoric')}
              className="w-full mt-4 py-2.5 btn-civic-secondary text-xs sm:text-sm font-title uppercase tracking-wider"
            >
              Deschide Registrul Trezoreriei &rarr;
            </button>
          </Card>
        ) : (
          <Card className="md:col-span-5 lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h3 className="font-anthropicSerif font-bold text-lg sm:text-xl flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <CreditCard size={20} className="text-emerald-700 dark:text-emerald-400" />
                  Situație Financiară Personală
                </h3>
                <span className="text-xs font-title uppercase font-bold px-2.5 py-1 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Cotizație
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-[2px] border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-title font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Total Cotizație Achitată:
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400 font-data block mt-1">
                    {currentUserObj?.totalPaid || 0} Lei
                  </span>
                </div>
                <div className="text-xs sm:text-sm space-y-1 text-slate-500 dark:text-slate-400 font-anthropic">
                  <p>• Cotizația regulamentară este de <strong>15 Lei/lună</strong>.</p>
                  <p>• Datoriile se calculează de la data aderării în club.</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigateToSection('profil')}
              className="w-full mt-4 py-2.5 btn-civic-secondary text-xs sm:text-sm font-title uppercase tracking-wider"
            >
              Vezi Fișa de Plată &rarr;
            </button>
          </Card>
        )}

        {/* Project Proposals Action Card */}
        <Card className="md:col-span-7 lg:col-span-7 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-anthropicSerif font-bold text-lg sm:text-xl flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <FileText size={20} className="text-blue-600 dark:text-blue-400" />
                {isAdmin ? 'Propuneri de Proiecte Comunitare' : 'Ai o Inițiativă pentru Comunitate?'}
              </h3>
              <span className="text-xs font-title uppercase font-bold px-2.5 py-1 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {isAdmin ? 'Evaluare' : 'Inițiative'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-anthropic">
              {isAdmin
                ? 'Membrii pot trimite fișe de proiect complete. Evaluează propunerile și alocă puncte bonus celor aprobate pentru implementare.'
                : 'Trimite fișa de proiect (titlu, obiective, estimare buget) direct în registrul de proiecte. Inițiativele aprobate primesc punctaj bonus.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToSection('proiecte')}
            className="w-full mt-4 py-3 btn-civic-primary text-xs sm:text-sm font-title uppercase tracking-wider flex items-center justify-center gap-2"
          >
            {isAdmin ? 'Deschide Registrul de Propuneri' : 'Trimite o Propunere Nouă'}
            <Send size={15} />
          </button>
        </Card>

        {/* Club Activity Metric (Admin) or Volunteer Leaders (Member) */}
        {isAdmin ? (
          <Card className="md:col-span-12 lg:col-span-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h3 className="font-anthropicSerif font-bold text-lg sm:text-xl flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Trophy size={20} className="text-amber-600" />
                  Obiectiv Anual Voluntariat
                </h3>
                <span className="text-xs font-title uppercase font-bold px-2.5 py-1 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Club Aggregate
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs sm:text-sm font-semibold mb-1.5 font-anthropic text-slate-700 dark:text-slate-300">
                    <span>Țintă lunară: {targetMonthlyHours}h</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-data font-bold">{totalCombinedHours}h realizate ({targetPercentage}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-[2px] overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div className="h-full bg-slate-900 dark:bg-slate-100 rounded-[2px] transition-all duration-500" style={{ width: `${targetPercentage}%` }}></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-[2px]">
                    <div className="text-2xl sm:text-3xl font-bold font-data text-slate-900 dark:text-slate-100">{totalCombinedHours}</div>
                    <div className="text-xs font-title font-bold uppercase text-slate-500 dark:text-slate-400 mt-1">Ore totale club</div>
                  </div>
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-[2px]">
                    <div className="text-2xl sm:text-3xl font-bold font-data text-slate-900 dark:text-slate-100">{totalCombinedProjects}</div>
                    <div className="text-xs font-title font-bold uppercase text-slate-500 dark:text-slate-400 mt-1">Acțiuni comunitare</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Leaders Snapshot */}
        <Card className={`md:col-span-12 ${isAdmin ? 'lg:col-span-6' : 'lg:col-span-12'} flex flex-col justify-between`}>
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-anthropicSerif font-bold text-lg sm:text-xl flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Star size={20} className="text-amber-600" />
                Lideri de Activitate
              </h3>
              <button
                onClick={() => onNavigateToSection('clasament')}
                className="text-xs sm:text-sm font-title font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clasament Complet &rarr;
              </button>
            </div>

            <div className="space-y-2.5">
              {topVolunteers.map((m, index) => (
                <div
                  key={m.id}
                  className="p-3 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 flex items-center gap-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className={`w-6 h-6 rounded-[1px] flex items-center justify-center font-bold text-xs sm:text-sm font-data ${
                    index === 0 ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {index + 1}
                  </div>

                  <img
                    src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}`}
                    alt={m.name}
                    className="w-8 h-8 rounded-[2px] object-cover border border-slate-200 dark:border-slate-700"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate font-anthropic">
                      {m.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-anthropic truncate">{m.role || 'Voluntar'}</div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-xs sm:text-sm font-data text-slate-900 dark:text-slate-100">{m.stats?.hours || 0}h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Member-exclusive Qualification status & Attendance Rate Card */}
        {!isAdmin && (
          <Card className="md:col-span-12 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h3 className="font-anthropicSerif font-bold text-lg sm:text-xl flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <CheckCircle size={20} className="text-emerald-700 dark:text-emerald-400" />
                  Calificativ & Disciplină Prezență
                </h3>
                <span className="text-xs font-title uppercase font-bold px-2.5 py-1 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Status Activitate
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-[2px] border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-title uppercase font-bold text-slate-500 dark:text-slate-400 block">
                    Rată de Prezență:
                  </span>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-2xl sm:text-3xl font-bold font-data text-slate-900 dark:text-slate-100">
                      {personalQualObj.rate}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">la acțiuni obligatorii</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-[1px] overflow-hidden mt-3">
                    <div className="h-full bg-emerald-600 rounded-[1px]" style={{ width: `${personalQualObj.percentage}%` }} />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-[2px] border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-title uppercase font-bold text-slate-500 dark:text-slate-400 block">
                    Calificativ Oficial Camena:
                  </span>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-2xl sm:text-3xl font-bold font-data text-slate-900 dark:text-slate-100">
                      {personalQualObj.qualification}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-anthropic">
                    Calculat conform prezențelor și învoirilor înregistrate.
                  </p>
                </div>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span>Pentru a-ți menține calificativul, transmite cereri de învoire din timp.</span>
              <button
                onClick={() => onNavigateToSection('prezenta')}
                className="text-blue-600 dark:text-blue-400 font-title font-bold hover:underline"
              >
                Cereri Învoire &rarr;
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};



// 4. Calendar View (Interactive General Calendar for Payments)




// 7. General Payments History View (With Revert Action & Warning Modals)
const ViewPayments = ({ members, onUpdateMember, isAdmin }: { members: any[], onUpdateMember: (m: any) => void, isAdmin: boolean }) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [receiptToRevert, setReceiptToRevert] = useState<any | null>(null);

  useEffect(() => {
    setLoading(true);
    const fetchPayments = async () => {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .order('date', { ascending: false });
        if (error) throw error;
        const list = (data || []).filter((p: any) => p.status !== 'Anulat');
        setPayments(list);
      } catch (err) {
        console.error("Failed to load payments via fetch", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();

    const channel = supabase
      .channel('dashboard_payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchPayments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleConfirmRevert = async () => {
    if (!receiptToRevert) return;
    
    const member = members.find(m => m.id?.toString() === receiptToRevert.memberId?.toString());
    if (!member) {
      toast.error("Membrul nu a fost găsit în sistem.");
      return;
    }

    try {
      const { newTotalPaid, newStatus } = await revertLatestTreasuryPayment(
        member.id,
        receiptToRevert.id,
        receiptToRevert.amount
      );

      onUpdateMember({ ...member, totalPaid: newTotalPaid, status: newStatus });

      setReceiptToRevert(null);
      toast.success(`Plata a fost anulată. Datoria membrului a fost restabilită.`);
    } catch (err) {
      console.error("Revert failed", err);
      toast.error("Eroare la anularea plății.");
    }
  };

  const filteredPayments = payments.filter(p => 
    p.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to check if a payment is the latest for a specific user
  const isLatestPaymentForUser = (paymentId: string, memberId: string) => {
    const userPayments = [...payments]
      .filter(p => p.memberId?.toString() === memberId?.toString())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (userPayments.length === 0) return false;
    return userPayments[0].id === paymentId;
  };

  return (
    <>
      <Card className="!p-6 md:!p-8 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161B22] shadow-xs font-anthropic">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="text-2xl md:text-3xl font-anthropicSerif font-bold text-slate-900 dark:text-slate-100">Istoric General Încasări</h2>
          <div className="relative group w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Caută după membru..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 transition-all font-anthropic font-semibold"
            />
          </div>
        </div>

        <div className="overflow-x-auto p-1">
          <Table className="min-w-[840px]">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm py-3.5 px-4 font-bold font-title uppercase tracking-wider">Membru</TableHead>
                <TableHead className="text-xs sm:text-sm py-3.5 px-4 font-bold font-title uppercase tracking-wider">Suma</TableHead>
                <TableHead className="text-xs sm:text-sm py-3.5 px-4 font-bold font-title uppercase tracking-wider">Lună Acoperită</TableHead>
                <TableHead className="text-xs sm:text-sm py-3.5 px-4 font-bold font-title uppercase tracking-wider">Data/Ora</TableHead>
                <TableHead className="text-center text-xs sm:text-sm py-3.5 px-4 font-bold font-title uppercase tracking-wider">Semn. Membru</TableHead>
                <TableHead className="text-center text-xs sm:text-sm py-3.5 px-4 font-bold font-title uppercase tracking-wider">Semn. Trezorier</TableHead>
                <TableHead className="text-right text-xs sm:text-sm py-3.5 px-4 font-bold font-title uppercase tracking-wider">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center p-10 text-slate-400 font-semibold h-36 text-sm sm:text-base font-anthropic">
                    Se încarcă istoricul...
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((receipt) => {
                  const isCancelled = receipt.status === 'Anulat';
                  const canRevert = isAdmin && !isCancelled && isLatestPaymentForUser(receipt.id, receipt.memberId);
                  
                  return (
                    <TableRow key={receipt.id} className={`group ${isCancelled ? 'opacity-50' : ''}`}>
                      <TableCell className="font-bold py-4 px-4">
                        <div className={isCancelled ? 'line-through text-slate-500 text-sm sm:text-base font-anthropic' : 'text-slate-900 dark:text-white text-sm sm:text-base font-anthropic font-bold'}>{receipt.memberName}</div>
                        <div className="text-xs text-slate-400 font-data mt-0.5">{receipt.id}</div>
                      </TableCell>
                      <TableCell className={`font-black font-data py-4 px-4 text-sm sm:text-base ${isCancelled ? 'text-slate-500 line-through' : 'text-emerald-700 dark:text-emerald-400'}`}>
                        {receipt.amount} Lei
                      </TableCell>
                      <TableCell className={`py-4 px-4 text-xs sm:text-sm font-anthropic ${isCancelled ? 'line-through text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        {receipt.month || (receipt.monthsCovered && receipt.monthsCovered.join(', '))}
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-data py-4 px-4">
                        {receipt.dateFormatted || new Date(receipt.date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-center py-4 px-4">
                        {receipt.memberSignature ? (
                          <img src={receipt.memberSignature} alt="Semnatura Membru" className="h-9 w-20 object-contain mx-auto mix-blend-multiply dark:invert dark:mix-blend-screen" />
                        ) : <span className="text-xs text-slate-400 block text-center font-data">-</span>}
                      </TableCell>
                      <TableCell className="text-center py-4 px-4">
                        {receipt.treasurerSignature ? (
                          <img src={receipt.treasurerSignature} alt="Semnatura Trezorier" className="h-9 w-20 object-contain mx-auto mix-blend-multiply dark:invert dark:mix-blend-screen" />
                        ) : <span className="text-xs text-slate-400 block text-center font-data">-</span>}
                      </TableCell>
                      <TableCell className="text-right py-4 px-4">
                        {canRevert && (
                          <button
                            onClick={() => setReceiptToRevert(receipt)}
                            className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 rounded-[2px] transition-all cursor-pointer"
                            title="Revert Payment (Permis doar pentru ultima plată)"
                          >
                            <RotateCcw size={17} />
                          </button>
                        )}
                        {!canRevert && isAdmin && !isCancelled && (
                          <button
                            disabled
                            className="p-2 text-slate-300 dark:text-slate-700 rounded-[2px] cursor-not-allowed"
                            title="Doar ultima plată a unui utilizator poate fi anulată"
                          >
                            <RotateCcw size={17} />
                          </button>
                        )}
                        {isCancelled && (
                           <span className="px-2.5 py-1 rounded-[2px] bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold uppercase tracking-wider font-title">Anulat</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center p-10 text-slate-400 font-semibold h-36 text-sm sm:text-base font-anthropic">
                    Nicio tranzacție înregistrată.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Revert Warning Modal */}
      <AnimatePresence>
        {receiptToRevert && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setReceiptToRevert(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#161B22] rounded-[2px] p-6 sm:p-8 overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-700 font-anthropic"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-600"></div>
              
              <div className="flex items-center gap-3 text-rose-600 mb-4">
                <AlertCircle size={24} />
                <h3 className="text-base sm:text-lg font-bold font-title">Anulare Plată (Revert)</h3>
              </div>
              
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-6 font-anthropic">
                Ești sigur că vrei să anulezi această plată? Anularea va readăuga automat suma <span className="font-bold font-data text-rose-600">{receiptToRevert.amount} Lei</span> la datoria membrului <span className="font-bold">{receiptToRevert.memberName}</span>.
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setReceiptToRevert(null)}
                  className="flex-1 py-2.5 btn-civic-secondary text-xs sm:text-sm font-title uppercase tracking-wider"
                >
                  Nu, renunță
                </button>
                <button 
                  onClick={handleConfirmRevert}
                  className="flex-1 py-2.5 btn-civic-danger text-xs sm:text-sm font-title uppercase tracking-wider"
                >
                  Da, anulează plata
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};


// 9. Reports View
interface ViewReportsProps {
  members: any[];
}

const ViewReports = ({ members }: ViewReportsProps) => {
  const [selectedMonth, setSelectedMonth] = useState('Iunie');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [isExporting, setIsExporting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const LUNI_DISPONIBILE = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];

  const handleExportClick = async () => {
    setIsExporting(true);
    try {
      const allCotizanti = members.filter(m => m && m.name && m.name.trim() !== '');
      
      const allPayments = await fetchAllTreasuryPayments();
      
      const targetMonthNorm = selectedMonth.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
      const targetYearStr = selectedYear;
      
      let missingCount = 0;
      allCotizanti.forEach(m => {
        const memIdNorm = m.id ? String(m.id).toLowerCase() : '';
        const memNameNorm = m.name ? m.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() : '';

        const hasPaid = allPayments.some((p: any) => {
          const pMemId = p.memberId ? String(p.memberId).toLowerCase() : '';
          const pMemName = p.memberName ? p.memberName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() : '';
          const pMonth = p.month ? p.month.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() : '';

          const isMemberMatch = (pMemId && pMemId === memIdNorm) || (pMemName && pMemName === memNameNorm);
          const isMonthMatch = pMonth.includes(targetMonthNorm) && pMonth.includes(targetYearStr);
          return isMemberMatch && isMonthMatch;
        });

        if (!hasPaid) {
          missingCount++;
        }
      });
      
      if (missingCount > 0) {
        setShowWarning(true);
        setIsExporting(false);
        return;
      }
      
      await proceedExport();
    } catch (err) {
      console.error(err);
      toast.error("Eroare la verificarea plăților.");
      setIsExporting(false);
    }
  };

  const proceedExport = async () => {
    setShowWarning(false);
    setIsExporting(true);
    try {
      const { generateTreasuryPDF } = await import('../../utils/pdfGenerator');
      await generateTreasuryPDF({
        members,
        month: selectedMonth,
        year: selectedYear
      });
      toast.success("Raportul a fost descărcat cu succes!");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Eroare la generarea raportului.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="!p-6 md:!p-8 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161B22] shadow-xs font-anthropic">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-anthropicSerif font-bold text-slate-900 dark:text-slate-100">
            Rapoarte & Exporturi Oficiale
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-anthropic">
            Modul pentru exportarea datelor oficiale. Generează balanțe analitice, rapoarte de cheltuieli și fișe de prezență direct din sistem în format PDF.
          </p>
        </div>
      </div>

      {/* Warning Modal */}
      <AnimatePresence>
        {showWarning && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowWarning(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#161B22] rounded-[2px] shadow-2xl p-6 sm:p-8 z-[121] border border-slate-300 dark:border-slate-700 font-anthropic"
            >
              <div className="flex items-center gap-3 text-amber-600 mb-4">
                <AlertCircle size={24} />
                <h3 className="text-base sm:text-lg font-bold font-title">Atenție Restanțieri</h3>
              </div>
              
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-6 font-anthropic">
                Atenție! Nu toți membrii activi au achitat cotizația pentru luna selectată (<span className="font-bold">{selectedMonth} {selectedYear}</span>). În PDF vor apărea spații goale la semnături pentru restanțieri. Doriți să continuați generarea raportului fiscal?
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowWarning(false)}
                  className="flex-1 py-2.5 btn-civic-secondary text-xs sm:text-sm font-title uppercase tracking-wider"
                >
                  Anulează
                </button>
                <button 
                  onClick={proceedExport}
                  className="flex-1 py-2.5 btn-civic-primary text-xs sm:text-sm font-title uppercase tracking-wider"
                >
                  Continuă Exportul
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card: Balanță Analitică */}
        <div className="p-5 sm:p-6 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 rounded-[2px] flex flex-col items-start gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div className="w-10 h-10 rounded-[2px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
            <CreditCard size={19} />
          </div>
          <div className="w-full">
            <h4 className="font-bold text-base sm:text-lg mb-1 font-anthropicSerif text-slate-900 dark:text-slate-100">Balanță Cotizații</h4>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4 font-anthropic">Sinteza plăților lunare și semnăturile electronice sub formă de tabel PDF.</p>
            
            <div className="flex gap-2 mb-4 w-full">
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 p-2.5 border border-slate-200 dark:border-slate-700 rounded-[2px] text-xs sm:text-sm font-bold focus:outline-none focus:border-blue-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                {LUNI_DISPONIBILE.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-[2px] text-xs sm:text-sm font-bold focus:outline-none focus:border-blue-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>
          
          <button 
            onClick={handleExportClick}
            disabled={isExporting}
            className={`mt-auto w-full py-3 btn-civic-primary text-xs sm:text-sm font-title uppercase tracking-wider flex items-center justify-center gap-2 ${
              isExporting ? 'opacity-50 cursor-wait' : ''
            }`}
          >
            {isExporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-[1px] animate-spin" />
                Se procesează datele...
              </>
            ) : (
              <>
                <Download size={15} /> Generează PDF
              </>
            )}
          </button>
        </div>

        {/* Alte card-uri in viitor */}
        {[
          { title: 'Raport Prezență', desc: 'Tabel centralizator cu toate calificativele lunare. (În curând)' },
          { title: 'Fișă Activitate Proiecte', desc: 'Statusul tuturor proiectelor interne. (În curând)' }
        ].map(r => (
          <div key={r.title} className="p-5 sm:p-6 border border-slate-200 dark:border-slate-800 rounded-[2px] flex flex-col items-start gap-4 opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/20">
            <div className="w-10 h-10 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"><FileText size={19} /></div>
            <div>
              <h4 className="font-bold text-base mb-1 font-anthropicSerif text-slate-900 dark:text-slate-100">{r.title}</h4>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-anthropic">{r.desc}</p>
            </div>
            <button disabled className="mt-auto flex items-center gap-2 text-xs sm:text-sm font-title font-bold text-slate-400">
              <Download size={14} /> Indisponibil
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
};

// 10. My Profile View
interface ViewProfileProps {
  currentUserObj: any;
  onUpdateMember: (m: any) => void;
  members: any[];
}

const ViewProfile = ({ currentUserObj, onUpdateMember, members }: ViewProfileProps) => {
  const effectiveUser = useMemo(() => {
    return currentUserObj || {
      id: 'M058',
      name: 'Administrator Sistem',
      username: 'admin',
      role: 'admin',
      boardPosition: 'Administrator Master',
      status: 'active',
      score: 0,
      presences: 0,
      excusedAbsences: 0,
      unexcusedAbsences: 0,
      totalPaid: 0,
      joinDate: '2026-01-01T00:00:00Z',
      nickname: 'Admin Master',
      avatar: '',
      password: 'admin'
    };
  }, [currentUserObj]);

  const [nickname, setNickname] = useState(effectiveUser.nickname || '');
  const [avatar, setAvatar] = useState(effectiveUser.avatar || '');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Sync state if effectiveUser updates
  useEffect(() => {
    if (effectiveUser) {
      setNickname(effectiveUser.nickname || '');
      setAvatar(effectiveUser.avatar || '');
      setNewPassword('');
    }
  }, [effectiveUser]);

  // Calculate Leaderboard Rank (excluding Board members)
  const sortedMembers = [...members]
    .filter(m => !isBoardMember(m))
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  const rankFound = sortedMembers.findIndex(m => m.id === effectiveUser.id);
  const rank = isBoardMember(effectiveUser) ? 'Board' : (rankFound >= 0 ? rankFound + 1 : '—');

  // Calculate Attendance Qualification
  const presences = effectiveUser.presences || 0;
  const excused = effectiveUser.excusedAbsences || 0;
  const unexcused = effectiveUser.unexcusedAbsences || 0;
  const { rate, qualification, colorClass, percentage, barColorClass } = calculateQualification(presences, excused, unexcused, effectiveUser.status);

  // Generate Member Ledger for Finance
  const ledger = generateMemberLedger(effectiveUser.joinDate || '2026-01-01T00:00:00Z', effectiveUser.totalPaid || 0);
  const debt = calculateDebt(effectiveUser.joinDate || '2026-01-01T00:00:00Z', effectiveUser.totalPaid || 0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropOffsetX, y: e.clientY - cropOffsetY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCropOffsetX(e.clientX - dragStart.x);
    setCropOffsetY(e.clientY - dragStart.y);
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    setIsDragging(true);
    setDragStart({ x: touch.clientX - cropOffsetX, y: touch.clientY - cropOffsetY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    if (!touch) return;
    setCropOffsetX(touch.clientX - dragStart.x);
    setCropOffsetY(touch.clientY - dragStart.y);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Up to 15MB file allowed for camera/phone photos
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Fișierul este prea mare! Te rugăm să alegi o imagine sub 15MB.");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setTempImageSrc(reader.result);
          setCropZoom(1);
          setCropOffsetX(0);
          setCropOffsetY(0);
        }
      };
      reader.onerror = () => {
        toast.error("Eroare la citirea fișierului de imagine.");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("Eroare la încărcarea imaginii.");
    }
  };

  const handleApplyCrop = () => {
    if (!tempImageSrc) return;
    const img = new Image();
    img.onload = () => {
      // Create a 200x200 canvas matching the preview viewport size
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw background
      ctx.fillStyle = '#FAF9F5';
      ctx.fillRect(0, 0, 200, 200);

      // Cover scaling math (matches object-fit: cover)
      let drawWidth = 200;
      let drawHeight = 200;
      if (img.width > img.height) {
        drawWidth = (img.width / img.height) * 200;
      } else {
        drawHeight = (img.height / img.width) * 200;
      }
      const xOffset = (200 - drawWidth) / 2;
      const yOffset = (200 - drawHeight) / 2;

      // Apply transformations exactly like CSS: translate, then scale from center
      ctx.translate(100, 100);
      ctx.translate(cropOffsetX, cropOffsetY);
      ctx.scale(cropZoom, cropZoom);
      ctx.translate(-100, -100);

      ctx.drawImage(img, xOffset, yOffset, drawWidth, drawHeight);

      // Now scale the 200x200 crop down to 192x192 to optimize storage
      const outCanvas = document.createElement('canvas');
      outCanvas.width = 192;
      outCanvas.height = 192;
      const outCtx = outCanvas.getContext('2d');
      if (outCtx) {
        outCtx.drawImage(canvas, 0, 0, 200, 200, 0, 0, 192, 192);
      }

      const dataUrl = outCanvas.toDataURL('image/jpeg', 0.82);
      setAvatar(dataUrl);
      setTempImageSrc(null);
      toast.success("Imaginea a fost decupată! Apasă pe 'Salvează Modificările' pentru a finaliza.");
    };
    img.onerror = () => {
      toast.error("Eroare la procesarea imaginii.");
    };
    img.src = tempImageSrc;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const allowedPasswordChange = canEditMemberPassword(currentUserObj || effectiveUser, effectiveUser.role, effectiveUser.id);

      // Dacă s-a introdus o parolă nouă, o actualizăm prin funcția securizată RPC
      if (allowedPasswordChange && newPassword && newPassword.trim().length > 0) {
        if (newPassword.trim().length < 6) {
          toast.error("Noua parolă trebuie să aibă cel puțin 6 caractere.");
          setIsSaving(false);
          return;
        }

        const { data: passRes, error: passErr } = await supabase.rpc('admin_set_member_password', {
          p_admin_member_id: currentUserObj?.id || currentUserObj?.username || 'stan.stefan',
          p_target_member_id: effectiveUser.id,
          p_new_password: newPassword.trim()
        });

        if (passErr || (passRes && !passRes.success)) {
          toast.error(passRes?.error || passErr?.message || "Eroare la actualizarea parolei.");
          setIsSaving(false);
          return;
        } else {
          toast.success("Parola a fost actualizată cu succes!");
          setNewPassword('');
        }
      }

      const updated = {
        ...effectiveUser,
        nickname,
        avatar,
      };

      // Scriem doar câmpurile de profil în tabela members
      await updateMemberFields(effectiveUser.id, { nickname, avatar });
      onUpdateMember(updated);
      toast.success("Profilul a fost salvat cu succes!");
    } catch (err: any) {
      console.error(err);
      toast.error("Eroare la salvarea profilului.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full space-y-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Edit Settings */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="h-full">
            <h3 className="text-base sm:text-lg font-bold mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 font-title text-slate-900 dark:text-slate-100">
              <User size={20} className="text-blue-600 dark:text-blue-400" /> Editare Profil
            </h3>
            
            <div className="space-y-6">
              {/* Profile Photo Upload */}
              <div className="flex flex-col items-center gap-4 p-5 bg-slate-50 dark:bg-slate-800/60 rounded-[2px] border border-slate-200 dark:border-slate-700">
                <div 
                  className="relative group cursor-pointer" 
                  onClick={() => document.getElementById('avatar-file-input')?.click()}
                  title="Apasă pentru a alege o poză nouă"
                >
                  {avatar ? (
                    <img 
                      src={avatar} 
                      alt="Avatar" 
                      className="w-24 h-24 rounded-[2px] object-cover border-2 border-slate-300 dark:border-slate-600 shadow-xs transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-[2px] bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 flex items-center justify-center font-bold text-4xl shadow-xs uppercase transition-transform group-hover:scale-105 font-title">
                      {currentUserObj?.name ? currentUserObj.name.charAt(0) : 'U'}
                    </div>
                  )}
                  <div 
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 rounded-[2px] transition-opacity"
                  >
                    <Upload size={22} className="mb-1" />
                    <span className="text-xs font-bold font-title uppercase tracking-wider">Schimbă</span>
                  </div>
                  <input 
                    id="avatar-file-input"
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    onClick={(e) => {
                      (e.target as HTMLInputElement).value = '';
                    }}
                  />
                </div>

                {/* Upload / Remove Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => document.getElementById('avatar-file-input')?.click()}
                    className="px-4 py-2 rounded-[2px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer font-title uppercase tracking-wider"
                  >
                    <Upload size={14} /> Încarcă Poză
                  </button>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar('')}
                      className="px-4 py-2 rounded-[2px] bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 font-bold text-xs sm:text-sm transition-colors cursor-pointer font-title uppercase tracking-wider"
                    >
                      Șterge
                    </button>
                  )}
                </div>
                
                <div className="w-full space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 text-center font-title uppercase tracking-wider">
                    Sau introdu link direct către poză (URL):
                  </label>
                  <input 
                    type="text" 
                    value={avatar}
                    onChange={e => setAvatar(e.target.value)}
                    placeholder="https://exemplu.ro/poza.jpg" 
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-anthropic font-bold"
                  />
                </div>
              </div>

              {/* Nickname / Poreclă */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-title">Poreclă / Nickname</label>
                <input 
                  type="text" 
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="Ex: Poreclă" 
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:border-sky-500 font-anthropic"
                />
              </div>

              {/* Password Reset */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-title">
                  Schimbă Parola (Opțional)
                </label>
                {canEditMemberPassword(currentUserObj || effectiveUser, effectiveUser.role, effectiveUser.id) ? (
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Lăsați gol pentru a păstra parola actuală" 
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:border-sky-500 font-anthropic pr-10"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input 
                      type="password"
                      value="••••••••"
                      disabled
                      readOnly
                      className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-[2px] text-slate-500 cursor-not-allowed font-anthropic text-sm"
                    />
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      🔒 Schimbarea parolelor pentru conturile de Board este făcută exclusiv de Stan Ștefan.
                    </p>
                  </div>
                )}
              </div>

              {/* Username Display */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-title">Username</label>
                <input
                  type="text"
                  value={effectiveUser.username}
                  readOnly
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/40 border border-slate-300 dark:border-slate-700 rounded-[2px] text-slate-900 dark:text-white text-sm font-bold font-anthropic opacity-75 cursor-not-allowed"
                />
              </div>

              {/* Save changes */}
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-3 btn-civic-primary font-bold flex items-center justify-center gap-2 rounded-[2px] text-xs sm:text-sm font-title uppercase tracking-wider"
              >
                {isSaving ? 'Se salvează...' : 'Salvează Modificările'}
              </button>
            </div>
          </Card>
        </div>

        {/* Right Column: Complex Statistics & Details */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Top Header Card */}
          <Card className="!rounded-[2px]">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {(avatar || effectiveUser.photo_url || effectiveUser.photoUrl) ? (
                <img 
                  src={avatar || effectiveUser.photo_url || effectiveUser.photoUrl} 
                  alt="Profile" 
                  className="w-20 h-20 rounded-[2px] object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                />
              ) : (
                <div className="w-20 h-20 rounded-[2px] bg-slate-900 text-white flex items-center justify-center font-bold text-3xl shadow-xs uppercase font-title">
                  {effectiveUser.name.charAt(0)}
                </div>
              )}
              <div className="text-center md:text-left flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2 font-anthropicSerif">{effectiveUser.name}</h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  <span className="px-3 py-1 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider font-title">
                    {effectiveUser.role === 'admin' ? 'Board Member' : 'Voluntar'}
                  </span>
                  {effectiveUser.boardPosition && (
                    <span className="px-3 py-1 rounded-[2px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold uppercase tracking-wider font-title">
                      {effectiveUser.boardPosition}
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-[2px] text-xs font-bold uppercase border tracking-wider font-title ${
                    effectiveUser.status === 'passive' 
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' 
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  }`}>
                    {effectiveUser.status === 'passive' ? 'Pasiv' : 'Activ'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Stats Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Leaderboard Standing */}
            <Card className="!rounded-[2px]">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 font-title text-slate-600 dark:text-slate-400">
                <Trophy size={16} className="text-amber-500" /> Clasament General
              </h4>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 font-data">#{rank}</span>
                <span className="text-xs sm:text-sm text-slate-500 font-anthropic">din {members.length} membri</span>
              </div>
              <div className="text-sm font-bold mb-4 font-anthropic">Scor total: <span className="text-amber-600 dark:text-amber-400 font-black font-data">{effectiveUser.score || 0} puncte</span></div>
              
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title">Istoric Puncte</div>
                {effectiveUser.scoreAdjustments && effectiveUser.scoreAdjustments.length > 0 ? (
                  effectiveUser.scoreAdjustments.map((adj: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-xs sm:text-sm p-2.5 bg-slate-50 dark:bg-slate-900 rounded-[2px] border border-slate-200 dark:border-slate-800 font-anthropic">
                      <div className="truncate pr-2">
                        <div className="font-bold truncate text-slate-800 dark:text-slate-200">{adj.reason}</div>
                        <div className="text-slate-400 text-xs font-data">{adj.date} • {adj.adminName}</div>
                      </div>
                      <span className={`font-black shrink-0 font-data text-sm ${adj.points >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {adj.points >= 0 ? `+${adj.points}` : adj.points}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 italic">Fără ajustări de scor înregistrate.</div>
                )}
              </div>
            </Card>

            {/* Attendance detailed */}
            <Card className="!rounded-[2px]">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 font-title text-slate-600 dark:text-slate-400">
                <CheckCircle size={16} className="text-indigo-500" /> Detalii Prezență
              </h4>
              <div className="flex items-center gap-4 mb-3">
                <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 font-data">{rate}</div>
                <div className={`px-2.5 py-1 rounded-[2px] text-xs font-black uppercase tracking-wider font-title ${colorClass}`}>
                  {qualification}
                </div>
              </div>
              
              {effectiveUser.status !== 'passive' && (
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-[2px] overflow-hidden mb-4 border border-slate-200 dark:border-slate-700">
                  <div className={`h-full transition-all ${barColorClass}`} style={{ width: `${percentage}%` }} />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-data">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-[2px] border border-emerald-200 dark:border-emerald-800">
                  <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase font-title">Prezențe</div>
                  <div className="font-bold text-emerald-700 dark:text-emerald-400 text-base mt-0.5">{presences}</div>
                </div>
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-[2px] border border-indigo-200 dark:border-indigo-800">
                  <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase font-title">Motivate</div>
                  <div className="font-bold text-indigo-700 dark:text-indigo-400 text-base mt-0.5">{excused}</div>
                </div>
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-[2px] border border-rose-200 dark:border-rose-800">
                  <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase font-title">Absențe</div>
                  <div className="font-bold text-rose-700 dark:text-rose-400 text-base mt-0.5">{unexcused}</div>
                </div>
              </div>
            </Card>

          </div>

          {/* Financial Ledger & Cotizații */}
          <Card className="!rounded-[2px]">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 font-title text-slate-600 dark:text-slate-400">
              <CreditCard size={16} className="text-blue-600 dark:text-blue-400" /> Registru Financiar (Cotizații)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-[2px] border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 font-title tracking-wider">Total Plătit</div>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-data mt-0.5">{effectiveUser.totalPaid || 0} RON</div>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-[2px] border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 font-title tracking-wider">Datorie Curentă</div>
                <div className={`text-lg font-black font-data mt-0.5 ${debt > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {debt} RON
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-[2px] border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 font-title tracking-wider">Status Plăți</div>
                <div className="text-base font-black font-title mt-0.5">
                  {debt === 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Star size={14} className="fill-emerald-400 text-emerald-400" /> La Zi</span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400">Restanțier</span>
                  )}
                </div>
              </div>
            </div>

            {/* Ledger Months grid */}
            <div>
              <div className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2.5 font-title tracking-wider">Istoric Plăți pe Luni</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {ledger.map((m, idx) => (
                  <div 
                    key={idx} 
                    className={`p-2.5 rounded-[2px] border text-center text-xs flex flex-col justify-between transition-all ${
                      m.status === 'Achitat' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    <span className="font-bold text-[10px] sm:text-xs uppercase opacity-85 font-title">{m.shortName} {m.year}</span>
                    <span className="font-black mt-1 text-xs font-title">{m.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

        </div>

      </div>

      {/* Cropper Modal */}
      {tempImageSrc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2px] p-6 max-w-md w-full border border-slate-300 dark:border-slate-800 shadow-2xl flex flex-col items-center font-anthropic">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 font-title">Ajustare Poza de Profil</h3>
            
            {/* Viewport crop area */}
            <div 
              className="w-[200px] h-[200px] overflow-hidden rounded-[2px] relative bg-black border border-slate-300 dark:border-slate-700 mb-6 shadow-inner cursor-move select-none touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img 
                src={tempImageSrc} 
                alt="Crop Preview" 
                draggable="false"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: `translate(${cropOffsetX}px, ${cropOffsetY}px) scale(${cropZoom})`,
                  transformOrigin: 'center',
                  pointerEvents: 'none'
                }}
              />
            </div>
            
            {/* Controls */}
            <div className="w-full space-y-4 mb-6">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400 font-title uppercase tracking-wider">
                  <span>ZOOM</span>
                  <span className="font-data">{Math.round(cropZoom * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.05" 
                  value={cropZoom} 
                  onChange={e => setCropZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-[2px] appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <p className="text-xs text-center text-slate-400 uppercase font-semibold font-title">Trage imaginea cu cursorul sau tactil pentru a o centra</p>
            </div>
            
            {/* Buttons */}
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setTempImageSrc(null)}
                className="flex-1 py-2.5 btn-civic-secondary text-xs sm:text-sm font-title uppercase tracking-wider"
              >
                Renunță
              </button>
              <button 
                onClick={handleApplyCrop}
                className="flex-1 py-2.5 btn-civic-primary text-xs sm:text-sm font-title uppercase tracking-wider"
              >
                Aplică
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// MEMBER ALERTS (cotizație restantă / eveniment apropiat)
// ==========================================
interface MemberAlert { id: string; kind: 'debt' | 'event'; message: string; }

function useMemberAlerts(currentUserObj: any, events: any[], isAdmin: boolean): MemberAlert[] {
  return useMemo(() => {
    if (isAdmin || !currentUserObj) return [];
    const alerts: MemberAlert[] = [];

    const debt = calculateDebt(currentUserObj.joinDate, currentUserObj.totalPaid || 0);
    if (debt > 0) {
      alerts.push({
        id: 'debt',
        kind: 'debt',
        message: `Ai o restanță de ${debt} RON la cotizație.`,
      });
    }

    const now = Date.now();
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
    const nextEvent = (events || [])
      .filter((e: any) => e?.date && !e.attendanceClosed)
      .map((e: any) => ({ ...e, ts: new Date(`${e.date}T${e.time || '00:00'}`).getTime() }))
      .filter((e: any) => e.ts >= now && e.ts <= sevenDaysFromNow)
      .sort((a: any, b: any) => a.ts - b.ts)[0];

    if (nextEvent) {
      const dateLabel = new Intl.DateTimeFormat('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(nextEvent.ts));
      alerts.push({
        id: `event-${nextEvent.id}`,
        kind: 'event',
        message: `Eveniment apropiat: "${nextEvent.title}" — ${dateLabel}${nextEvent.time ? ` la ${nextEvent.time}` : ''}.`,
      });
    }

    return alerts;
  }, [currentUserObj, events, isAdmin]);
}

function MemberAlertsBar({ alerts, dismissedIds, onDismiss }: { alerts: MemberAlert[]; dismissedIds: string[]; onDismiss: (id: string) => void }) {
  const visible = alerts.filter(a => !dismissedIds.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="px-6 md:px-8 pt-6 space-y-2 relative z-10">
      {visible.map(a => (
        <div key={a.id} className="adm-glass relative flex items-center gap-3 !p-4 bg-amber-500/5 border-amber-500/10">
          <div className="adm-accent-bar" style={{ background: a.kind === 'debt' ? '#f59e0b' : 'var(--theme-color, #89cff0)' }} />
          {a.kind === 'debt' ? <CreditCard size={16} className="shrink-0 text-amber-600" /> : <CalendarIcon size={16} className="shrink-0 text-brand-primary" />}
          <span className="flex-1 text-sm font-semibold text-slate-800">{a.message}</span>
          <button onClick={() => onDismiss(a.id)} className="opacity-40 hover:opacity-100 transition-opacity shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// MAIN DASHBOARD COMPONENT
// ==========================================
export function Dashboard({ username, onLogout }: DashboardProps) {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [members, setMembers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [unreadPitchesCount, setUnreadPitchesCount] = useState(0);
  const [preselectedEventIdForExcuse, setPreselectedEventIdForExcuse] = useState<string | undefined>(undefined);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [membersViewSeed, setMembersViewSeed] = useState<{ search?: string; memberId?: string }>({});
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('adminThemeMode') as 'dark' | 'light') || 'dark';
  });

  // First Login Ever Check: Automatically trigger tutorial if user has 0 logins or unseen tutorial
  useEffect(() => {
    if (!members || members.length === 0) return;
    const currentMember = members.find(m => m.username?.toLowerCase() === username.toLowerCase());
    const localKey = `tutorial_seen_v3_${username.toLowerCase()}`;
    const alreadySeenLocally = localStorage.getItem(localKey);

    if (currentMember) {
      if ((currentMember.login_count === 0 || !currentMember.has_seen_tutorial) && !alreadySeenLocally) {
        setIsTutorialOpen(true);
      }
    }
  }, [members, username]);

  // Auto-close mobile sidebar on resize to desktop (lg) or Escape key
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileSidebarOpen]);

  const handleCloseTutorial = async () => {
    setIsTutorialOpen(false);
    const localKey = `tutorial_seen_v3_${username.toLowerCase()}`;
    localStorage.setItem(localKey, 'true');

    // Update in Supabase so login count is saved and has_seen_tutorial is marked true
    try {
      const currentMember = members.find(m => m.username?.toLowerCase() === username.toLowerCase());
      const nextCount = Math.max(1, (currentMember?.login_count || 0) + 1);
      await supabase
        .from('members')
        .update({
          login_count: nextCount,
          has_seen_tutorial: true
        })
        .eq('username', username.toLowerCase());
      
      // Update local members state
      setMembers(prev => prev.map(m => 
        m.username?.toLowerCase() === username.toLowerCase()
          ? { ...m, login_count: nextCount, has_seen_tutorial: true }
          : m
      ));
    } catch (e) {
      console.warn("Could not sync tutorial completion:", e);
    }
  };

  // Applied on <html> (not just the local shell div) so it also reaches
  // MemberDrawer, which renders its own separate .dashboard-shell via a
  // React portal into document.body.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
    localStorage.setItem('adminThemeMode', themeMode);

    // Update cursor colors for dark mode
    const cursorDot = document.getElementById('cursor-dot');
    const cursorRing = document.getElementById('cursor-ring');
    if (cursorDot && cursorRing) {
      if (themeMode === 'dark') {
        cursorDot.style.backgroundColor = '#E0E0E0';
        cursorRing.style.borderColor = 'rgba(224, 224, 224, 0.4)';
      } else {
        cursorDot.style.backgroundColor = '';
        cursorRing.style.borderColor = '';
      }
    }
  }, [themeMode]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [activeSection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(open => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentUserObj = useMemo(() => {
    const found = members.find(
      m => m.username?.toLowerCase() === username?.toLowerCase() ||
           m.name?.toLowerCase().includes(username?.toLowerCase())
    );
    if (found) return found;
    const isStefan = username?.toLowerCase() === 'stan.stefan' || username?.toLowerCase() === 'admin';
    return {
      id: isStefan ? 'M053' : `M_${username}`,
      name: isStefan ? 'STAN STEFAN' : username?.toUpperCase() || 'MEMBRU',
      username: username || 'user',
      role: isStefan ? 'admin' : 'member',
      status: 'active',
      score: 100,
      hours: 24,
      presences: 12,
      attendanceRate: '100%',
      qualification: 'Maxim',
    };
  }, [members, username]);

  const isAdmin = currentUserObj?.role?.toLowerCase() === 'admin' || username?.toLowerCase() === 'admin' || username?.toLowerCase() === 'stan.stefan';

  const memberAlerts = useMemberAlerts(currentUserObj, events, isAdmin);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase.from('events').select('*');
      if (!error && data) {
        setEvents(data);
      }
    };
    fetchEvents();

    const channel = supabase
      .channel('dashboard_events_main')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchMembers();
        setMembers(data);
      } catch (err) {
        console.error("Initialization failed", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const channel = supabase
      .channel('dashboard_members_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchPitches = async () => {
      const { data } = await supabase.from('project_pitches').select('id');
      if (data) {
        const readPitchIds = JSON.parse(localStorage.getItem('readPitchIds') || '[]');
        const unreadCount = data.filter((p: any) => !readPitchIds.includes(p.id)).length;
        setUnreadPitchesCount(unreadCount);
      }
    };

    fetchPitches();

    const channel = supabase
      .channel('dashboard_pitches_count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_pitches' }, () => {
        fetchPitches();
      })
      .subscribe();

    const handlePitchesRead = () => setUnreadPitchesCount(0);
    window.addEventListener('pitchesReadUpdated', handlePitchesRead);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('pitchesReadUpdated', handlePitchesRead);
    };
  }, [isAdmin]);

  const isTrezorierMaster = Boolean(
    currentUserObj?.username?.toLowerCase() === 'stan.stefan' ||
    username?.toLowerCase() === 'stan.stefan' ||
    currentUserObj?.name?.toLowerCase().includes('stefan stan') ||
    currentUserObj?.name?.toLowerCase().includes('stan stefan') ||
    currentUserObj?.id === 'M053' ||
    currentUserObj?.id === 'M061' ||
    username?.toLowerCase() === 'admin'
  );

  const handleUpdateMember = (updatedMember: any) => {
    setMembers(prev => {
      const exists = prev.some(m => m.id === updatedMember.id);
      if (exists) {
        return prev.map(m => m.id === updatedMember.id ? updatedMember : m);
      } else {
        return [...prev, updatedMember];
      }
    });
  };

  const [experienceMode, setExperienceMode] = useState<'easy' | 'advanced'>(() => {
    if (typeof window === 'undefined') return 'easy';
    return (localStorage.getItem('ui_experience_mode') as 'easy' | 'advanced') || 'easy';
  });

  const MENU_CATEGORIES: { title: string; items: { id: string; label: string; icon: any; count?: number }[] }[] = useMemo(() => {
    if (experienceMode === 'easy') {
      if (isAdmin) {
        return [
          {
            title: "General",
            items: [
              { id: 'dashboard', label: 'Panou Principal', icon: Home },
            ]
          },
          {
            title: "Hub-uri Administrative",
            items: [
              { id: 'hub_admin_echipa', label: 'Membri & Echipă', icon: Users },
              { id: 'hub_admin_finante', label: 'Finanțe & Trezorerie', icon: PieChart },
              { id: 'hub_admin_comunitate', label: 'Decizii & Comunitate', icon: Megaphone },
              { id: 'clasament', label: 'Clasament & Scoruri', icon: Trophy },
            ]
          },
          {
            title: "Cont",
            items: [
              { id: 'profil', label: 'Profilul Meu', icon: User }
            ]
          }
        ];
      }

      // Member in Easy Mode
      return [
        {
          title: "General",
          items: [
            { id: 'dashboard', label: 'Acasă', icon: Home },
          ]
        },
        {
          title: "Activitate & Social",
          items: [
            { id: 'hub_activitate', label: 'Activitate & Prezență', icon: CheckCircle },
            { id: 'hub_comunitate', label: 'Social & Comunitate', icon: MessageSquare },
            { id: 'clasament', label: 'Clasament & Scor', icon: Trophy },
          ]
        },
        {
          title: "Cont",
          items: [
            { id: 'profil', label: 'Profilul Meu', icon: User }
          ]
        }
      ];
    }

    // Advanced Mode: Full granular categories
    return [
      {
        title: "General",
        items: [
          { id: 'dashboard', label: 'Panou Principal', icon: Home },
          { id: 'repartizare', label: 'Repartizare', icon: Users2 },
          { id: 'prezenta', label: 'Prezență', icon: CheckCircle },
          { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
        ]
      },
      {
        title: "Oameni & Social",
        items: [
          ...(isAdmin ? [{ id: 'membri', label: 'Membri', icon: Users }] : []),
          { id: 'clasament', label: 'Clasament', icon: Trophy },
          { id: 'kudos', label: 'Kudos & Aprecieri', icon: Heart },
        ]
      },
      {
        title: "Idei & Inițiative",
        items: [
          { id: 'idei', label: 'Sondaje', icon: PieChart },
          { id: 'proiecte', label: 'Idei Proiecte', icon: FileText },
          ...(isAdmin ? [{ id: 'comunitate', label: 'Idei Comunitate', icon: Globe }] : []),
          { id: 'sugestii', label: 'Casetă Sugestii', icon: MessageSquarePlus },
          { id: 'forum', label: 'Forum', icon: MessageSquare },
          { id: 'stiri', label: 'Știri', icon: Megaphone },
        ]
      },
      ...(isAdmin ? [{
        title: "Trezorerie",
        items: [
          { id: 'buget', label: 'Buget', icon: PieChart },
          { id: 'rapoarte', label: 'Rapoarte', icon: FileText }
        ]
      }] : []),
      ...(isTrezorierMaster ? [{
        title: "Securitate & Control",
        items: [
          { id: 'audit', label: '🛡️ Audit Master', icon: ShieldAlert }
        ]
      }] : []),
      {
        title: "Cont",
        items: [
          { id: 'profil', label: 'Profilul Meu', icon: User }
        ]
      }
    ];
  }, [experienceMode, isAdmin, isTrezorierMaster]);

  const renderActiveView = () => {
    // 1. Direct Easy Mode Hub Routing
    if (activeSection === 'hub_activitate') {
      return (
        <MemberActivityHub
          members={members}
          onUpdateMember={handleUpdateMember}
          isAdmin={isAdmin}
          currentUserId={currentUserObj?.id || ''}
          preselectedEventId={preselectedEventIdForExcuse}
        />
      );
    }
    if (activeSection === 'hub_comunitate') {
      return (
        <MemberCommunityHub
          isAdmin={isAdmin}
          currentUserId={currentUserObj?.id || ''}
          currentUsername={currentUserObj?.username || username || ''}
          members={members}
        />
      );
    }
    if (activeSection === 'hub_admin_echipa') {
      return (
        <AdminTeamHub
          members={members}
          onUpdateMember={handleUpdateMember}
          onAddMemberClick={() => setIsMemberModalOpen(true)}
          isAdmin={isAdmin}
          currentUserId={currentUserObj?.id || ''}
          currentUserObj={currentUserObj}
          preselectedEventId={preselectedEventIdForExcuse}
          membersViewSeed={membersViewSeed}
        />
      );
    }
    if (activeSection === 'hub_admin_finante') {
      return (
        <AdminFinanceHub
          isAdmin={isAdmin}
          isTrezorierMaster={isTrezorierMaster}
          currentUserObj={currentUserObj}
          members={members}
          onUpdateMember={handleUpdateMember}
          ViewPaymentsComponent={ViewPayments}
          ViewReportsComponent={ViewReports}
        />
      );
    }
    if (activeSection === 'hub_admin_comunitate') {
      return (
        <AdminCommunityHub
          isAdmin={isAdmin}
          currentUserId={currentUserObj?.id || ''}
          currentUsername={currentUserObj?.username || username || ''}
          members={members}
        />
      );
    }

    // 2. Fallback / Subtab Routing for Easy Mode (Deep Linking from Notifications & Palette)
    if (experienceMode === 'easy') {
      if (isAdmin) {
        if (activeSection === 'membri' || activeSection === 'repartizare' || activeSection === 'prezenta') {
          return (
            <AdminTeamHub
              initialSubtab={activeSection}
              members={members}
              onUpdateMember={handleUpdateMember}
              onAddMemberClick={() => setIsMemberModalOpen(true)}
              isAdmin={isAdmin}
              currentUserId={currentUserObj?.id || ''}
              currentUserObj={currentUserObj}
              preselectedEventId={preselectedEventIdForExcuse}
              membersViewSeed={membersViewSeed}
            />
          );
        }
        if (activeSection === 'buget' || activeSection === 'istoric' || activeSection === 'rapoarte' || activeSection === 'audit') {
          return (
            <AdminFinanceHub
              initialSubtab={activeSection}
              isAdmin={isAdmin}
              isTrezorierMaster={isTrezorierMaster}
              currentUserObj={currentUserObj}
              members={members}
              onUpdateMember={handleUpdateMember}
              ViewPaymentsComponent={ViewPayments}
              ViewReportsComponent={ViewReports}
            />
          );
        }
        if (activeSection === 'stiri' || activeSection === 'news' || activeSection === 'idei' || activeSection === 'forum' || activeSection === 'comunitate' || activeSection === 'kudos' || activeSection === 'sugestii' || activeSection === 'proiecte') {
          const mapped = (activeSection === 'news' ? 'stiri' : activeSection === 'proiecte' ? 'forum' : activeSection);
          return (
            <AdminCommunityHub
              initialSubtab={mapped}
              isAdmin={isAdmin}
              currentUserId={currentUserObj?.id || ''}
              currentUsername={currentUserObj?.username || username || ''}
              members={members}
            />
          );
        }
      } else {
        // Member Easy Mode Sub-routing
        if (activeSection === 'prezenta' || activeSection === 'calendar' || activeSection === 'evenimente' || activeSection === 'events') {
          const mapped = activeSection === 'prezenta' ? 'prezenta' : 'calendar';
          return (
            <MemberActivityHub
              initialSubtab={mapped}
              members={members}
              onUpdateMember={handleUpdateMember}
              isAdmin={isAdmin}
              currentUserId={currentUserObj?.id || ''}
              preselectedEventId={preselectedEventIdForExcuse}
            />
          );
        }
        if (activeSection === 'stiri' || activeSection === 'news' || activeSection === 'idei' || activeSection === 'forum' || activeSection === 'kudos' || activeSection === 'sugestii' || activeSection === 'proiecte') {
          const mapped = (activeSection === 'news' ? 'stiri' : activeSection === 'proiecte' ? 'sugestii' : activeSection);
          return (
            <MemberCommunityHub
              initialSubtab={mapped}
              isAdmin={isAdmin}
              currentUserId={currentUserObj?.id || ''}
              currentUsername={currentUserObj?.username || username || ''}
              members={members}
            />
          );
        }
      }
    }

    // 3. Standard Routing (Advanced Mode or Dedicated Views)
    switch (activeSection) {
      case 'dashboard': return (
        <ViewDashboard 
          members={members} 
          currentUserObj={currentUserObj} 
          isAdmin={isAdmin} 
          onNavigateToSection={setActiveSection} 
          onRedirectToExcuse={(eventId) => {
            setPreselectedEventIdForExcuse(eventId);
            setActiveSection(experienceMode === 'easy' ? (isAdmin ? 'hub_admin_echipa' : 'hub_activitate') : 'prezenta');
          }}
          events={events}
        />
      );
      case 'repartizare': return (
        <RepartizareView
          isAdmin={isAdmin}
          members={members}
          currentUserId={currentUserObj?.id || ''}
        />
      );
      case 'membri': return (
        <MembersView
          members={members}
          onUpdateMember={handleUpdateMember}
          onAddMemberClick={() => setIsMemberModalOpen(true)}
          isAdmin={isAdmin}
          initialSearchTerm={membersViewSeed.search}
          initialSelectedMemberId={membersViewSeed.memberId}
          currentUserObj={currentUserObj}
        />
      );
      case 'prezenta': return (
        <AttendanceView 
          members={members} 
          onUpdateMember={handleUpdateMember} 
          isAdmin={isAdmin} 
          currentUserId={currentUserObj?.id || ''}
          preselectedEventId={preselectedEventIdForExcuse}
        />
      );
      case 'clasament': return (
        <LeaderboardView members={members} events={events} isAdmin={isAdmin} onUpdateMember={handleUpdateMember} currentUserObj={currentUserObj} />
      );
      case 'kudos': return (
        <KudosView 
          currentUserId={currentUserObj?.id || ''} 
          currentUsername={currentUserObj?.username || username || ''} 
          members={members} 
        />
      );
      case 'sugestii': return (
        <SuggestionsView 
          currentUserId={currentUserObj?.id || ''} 
          currentUsername={currentUserObj?.username || username || ''} 
          isAdmin={isAdmin} 
          members={members} 
        />
      );
      case 'calendar':
      case 'evenimente':
      case 'eveniment':
      case 'events':
        return (
          <EventsView 
            isAdmin={isAdmin} 
            members={members}
            currentUserId={currentUserObj?.id || ''}
            onUpdateMember={handleUpdateMember}
          />
        );
      case 'idei': return <IdeasView isAdmin={isAdmin} currentUserId={currentUserObj?.id || ''} currentUsername={currentUserObj?.username || username || ''} />;
      case 'comunitate': return <CommunityIdeasView isAdmin={isAdmin} currentUserId={currentUserObj?.id || ''} />;
      case 'proiecte': return <ProjectProposalsView isAdmin={isAdmin} currentUserId={currentUserObj?.id || ''} currentUsername={currentUserObj?.username || username || ''} />;
      case 'forum': return <ForumView isAdmin={isAdmin} currentUserId={currentUserObj?.id || ''} currentUsername={currentUserObj?.name || currentUserObj?.username || username || ''} />;
      case 'stiri':
      case 'news':
        return <NewsView isAdmin={isAdmin} currentUserId={currentUserObj?.id || ''} currentUsername={currentUserObj?.name || currentUserObj?.username || username || ''} />;
      case 'istoric': return <ViewPayments members={members} onUpdateMember={handleUpdateMember} isAdmin={isAdmin} />;
      case 'buget': return (
        <BudgetView
          isAdmin={isAdmin}
          currentUserObj={currentUserObj}
          members={members}
        />
      );
      case 'rapoarte': return <ViewReports members={members} />;
      case 'audit': return (
        <MasterAuditView
          currentUserObj={currentUserObj}
          isAdmin={isAdmin}
          members={members}
        />
      );
      case 'profil': return (
        <ViewProfile 
          currentUserObj={currentUserObj} 
          onUpdateMember={handleUpdateMember} 
          members={members} 
        />
      );
      default: return (
        <ViewDashboard 
          members={members} 
          currentUserObj={currentUserObj} 
          isAdmin={isAdmin} 
          onNavigateToSection={setActiveSection} 
          onRedirectToExcuse={(eventId) => {
            setPreselectedEventIdForExcuse(eventId);
            setActiveSection(experienceMode === 'easy' ? (isAdmin ? 'hub_admin_echipa' : 'hub_activitate') : 'prezenta');
          }}
          events={events}
        />
      );
    }
  };

  const activeTitle = MENU_CATEGORIES.flatMap(c => c.items).find(i => i.id === activeSection)?.label || 'Dashboard';

  if (loading) {
    return (
      <div className="dashboard-shell min-h-screen flex items-center justify-center" style={{ background: 'var(--adm-bg)' }}>
        <div className="w-10 h-10 border-4 border-[#89cff0] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  interface ThemeConfig {
    /** 2-3 real colors forming this section's mesh gradient (not a single flat tone). */
    colors: string[];
  }

  // Twisted Palette: '#89cff0' (Baby Blue), '#0F172A' (Navy Blue), '#ffeacd' (Cream), '#475569' (Slate Gray)
  // Each section gets a distinct pair/trio from the brand palette so the aurora mesh actually shifts hue, not just a repeated flat color.
  const SECTION_THEMES: Record<string, ThemeConfig> = {
    dashboard: { colors: ['#89cff0', '#ffeacd', '#475569'] },
    repartizare: { colors: ['#89cff0', '#ffeacd'] },
    membri: { colors: ['#89cff0', '#0F172A'] },
    prezenta: { colors: ['#ffeacd', '#89cff0'] },
    clasament: { colors: ['#475569', '#ffeacd'] },
    calendar: { colors: ['#89cff0', '#475569'] },
    idei: { colors: ['#ffeacd', '#89cff0'] },
    proiecte: { colors: ['#0F172A', '#89cff0'] },
    forum: { colors: ['#475569', '#ffeacd'] },
    stiri: { colors: ['#475569', '#89cff0'] },
    comunitate: { colors: ['#475569', '#89cff0'] },
    istoric: { colors: ['#0F172A', '#ffeacd'] },
    buget: { colors: ['#89cff0', '#ffeacd'] },
    rapoarte: { colors: ['#ffeacd', '#475569'] },
    audit: { colors: ['#0F172A', '#89cff0'] },
    profil: { colors: ['#475569', '#89cff0'] },
    hub_activitate: { colors: ['#89cff0', '#ffeacd'] },
    hub_comunitate: { colors: ['#475569', '#89cff0'] },
    hub_admin_echipa: { colors: ['#89cff0', '#0F172A'] },
    hub_admin_finante: { colors: ['#89cff0', '#ffeacd'] },
    hub_admin_comunitate: { colors: ['#475569', '#ffeacd'] },
  };

  const currentTheme = SECTION_THEMES[activeSection] || SECTION_THEMES.dashboard;
  const themeColor = currentTheme.colors[0];

  // Returns white or dark text based on background luminance
  const getContrastColor = (hex: string) => {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#0A0C10' : '#FFFFFF';
  };
  const themeTextColor = getContrastColor(themeColor);

  // For elements on dark backgrounds (sidebar, header), pick a visible accent color
  const visibleThemeColor = (() => {
    const c = themeColor.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (lum > 0.25) return themeColor;
    // Fallback to second color in palette if primary is too dark
    return currentTheme.colors[1] || themeColor;
  })();

  const commandPaletteNavItems: CommandNavItem[] = MENU_CATEGORIES.flatMap(cat =>
    cat.items.map(item => ({ ...item, category: cat.title }))
  );

  return (
    <div
      className="dashboard-shell h-screen font-anthropic flex relative overflow-hidden"
      style={{
        '--theme-color': themeColor,
        background: 'var(--adm-bg)',
        transition: '--theme-color 1.2s ease, background 0.3s ease'
      } as React.CSSProperties}
    >

      {/* Dynamic Animated Background */}
      <AuroraBackground colors={currentTheme.colors} />

      {/* Mobile Sidebar Overlay (Closes sidebar on tap outside) */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden cursor-pointer"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        id="adm-sidebar-nav"
        className={`adm-sidebar fixed h-screen top-0 left-0 flex flex-col z-50 overflow-hidden transition-all duration-300 lg:translate-x-0 ${
          isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
        } w-72 max-w-[85vw] ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-5 pt-[max(1.5rem,env(safe-area-inset-top,1.5rem))] pb-4 flex flex-col items-center relative border-b border-slate-200 dark:border-slate-800 shrink-0">
          {/* Close button for mobile sidebar */}
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden absolute top-[max(1rem,env(safe-area-inset-top,1rem))] right-4 p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 rounded-[2px] transition-colors cursor-pointer"
            title="Închide"
            aria-label="Închide meniul"
          >
            <X size={18} />
          </button>
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setIsSidebarCollapsed(v => !v)}
            className="hidden lg:flex absolute top-4 right-3 p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-white dark:hover:bg-slate-800 rounded-[2px] transition-colors cursor-pointer"
            title={isSidebarCollapsed ? 'Expandează' : 'Restrânge'}
          >
            {isSidebarCollapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
          </button>

          <img
            src="/logo.png"
            alt="Interact Camena Logo"
            className={`w-auto object-contain mb-3 transition-all duration-300 ${isSidebarCollapsed ? 'h-9' : 'h-14'}`}
          />
          {!isSidebarCollapsed && (
            <div className="adm-meta-label flex items-center gap-2 text-center text-slate-500 dark:text-slate-400 font-bold font-title">
              <span className="w-1.5 h-1.5 shrink-0 rounded-full" style={{ backgroundColor: themeColor }} />
              District 2241 · Piatra Neamț
            </div>
          )}
        </div>

        <div className="adm-sidebar-scroll p-3 space-y-5 flex-1 overflow-y-auto">
          {MENU_CATEGORIES.map((category, idx) => (
            <div key={idx}>
              {!isSidebarCollapsed && (
                <h3 className="adm-meta-label flex items-center gap-2 px-3 mb-1.5 text-slate-600 dark:text-slate-400 font-black font-title">
                  <span className="h-px w-3 bg-slate-300 dark:bg-slate-700" />
                  {category.title}
                </h3>
              )}
              <nav className="space-y-1">
                {category.items.map(item => {
                  const isActive = activeSection === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id);
                        setIsMobileSidebarOpen(false);
                      }}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={`adm-nav-item w-full flex items-center gap-3 py-2.5 font-bold transition-all rounded-[2px] ${
                        isSidebarCollapsed ? 'justify-center px-0' : 'px-4'
                      } ${isActive 
                        ? 'active bg-slate-900 text-white dark:bg-slate-800 dark:text-sky-300 shadow-xs' 
                        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon
                        size={17}
                        className="shrink-0 transition-colors duration-300"
                        style={isActive ? { color: visibleThemeColor } : {}}
                      />
                      {!isSidebarCollapsed && <span className="text-[13.5px] font-bold flex-1 text-left font-anthropic">{item.label}</span>}
                      {!isSidebarCollapsed && item.id === 'comunitate' && unreadPitchesCount > 0 && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-[2px] border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-data">
                          +{unreadPitchesCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] border-t border-slate-200 dark:border-slate-800 shrink-0">
           {!isSidebarCollapsed && (
             <div className="flex items-center justify-between px-3 py-2 mb-2 border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 rounded-[2px]">
               <div className="flex items-center gap-2">
                 <span className="relative flex h-1.5 w-1.5">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                   <span className="relative inline-flex h-1.5 w-1.5 bg-emerald-400" />
                 </span>
                 <span className="adm-meta-label !text-emerald-800 dark:!text-emerald-300 font-bold font-title">Sistem Operațional</span>
               </div>
               <span className="adm-meta-label !text-emerald-700 dark:!text-emerald-400 font-bold font-data">v{__APP_VERSION__}</span>
             </div>
           )}
           <button
            onClick={onLogout}
            title={isSidebarCollapsed ? 'Deconectare' : undefined}
            className={`w-full flex items-center gap-3 py-2.5 rounded-[2px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/40 font-bold transition-all group cursor-pointer ${isSidebarCollapsed ? 'justify-center px-0' : 'px-4'}`}
          >
            <LogOut size={17} className="shrink-0" />
            {!isSidebarCollapsed && <span className="text-[13.5px] font-title">Deconectare</span>}
          </button>
        </div>
      </aside>

      <main
        className={`flex-1 flex flex-col h-screen overflow-y-auto relative transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}
      >

        {/* Header */}
        <header className="adm-header sticky top-0 z-30 px-3 sm:px-6 pb-3 pt-[max(0.875rem,env(safe-area-inset-top,0.875rem))] sm:py-4 flex items-center justify-between backdrop-blur-md bg-white/90 dark:bg-[#0D111A]/90 border-b border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden min-h-[42px] min-w-[42px] p-2 -ml-1 text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 rounded-[2px] transition-colors shrink-0 touch-manipulation border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer"
              title="Meniu"
              aria-label="Deschide meniul"
            >
              <Menu size={22} />
            </button>

            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: visibleThemeColor, transition: 'background-color 0.8s ease' }}
            />
            <h1 className="text-lg sm:text-xl md:text-2xl font-anthropicSerif italic font-bold text-slate-900 dark:text-white truncate">
              {activeTitle}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 shrink-0">
            <ClockWidget events={events} />

            {/* Easy / Advanced Mode Toggle Switch */}
            <div className="hidden sm:flex items-center p-0.5 rounded-[2px] border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/60 font-title shadow-xs">
              <button
                onClick={() => {
                  setExperienceMode('easy');
                  localStorage.setItem('ui_experience_mode', 'easy');
                  toast.success('🌱 Modul Simplificat activat');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  experienceMode === 'easy'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Mod Simplificat: Navigație compactă în hub-uri intuitive"
              >
                <Sparkles size={13} className={experienceMode === 'easy' ? 'text-emerald-500' : 'text-slate-400'} />
                <span>Simplu</span>
              </button>
              <button
                onClick={() => {
                  setExperienceMode('advanced');
                  localStorage.setItem('ui_experience_mode', 'advanced');
                  toast.success('⚡ Modul Avansat activat');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  experienceMode === 'advanced'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Mod Avansat: Toate modulele și paginile separate"
              >
                <Zap size={13} className={experienceMode === 'advanced' ? 'text-blue-500' : 'text-slate-400'} />
                <span>Avansat</span>
              </button>
            </div>

            {/* Smart Notifications Bell Dropdown */}
            <NotificationsDropdown
              currentUserId={currentUserObj?.id}
              currentUsername={currentUserObj?.username || username}
              onNavigateToSection={setActiveSection}
            />

            {/* Light / Dark toggle */}
            <button
              onClick={() => setThemeMode(m => m === 'dark' ? 'light' : 'dark')}
              className="p-2 sm:p-2.5 rounded-[2px] border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-all shrink-0 cursor-pointer shadow-xs min-h-[38px] min-w-[38px] flex items-center justify-center"
              title={themeMode === 'dark' ? 'Comută la mod luminos' : 'Comută la mod întunecat'}
            >
              {themeMode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Search / command palette trigger */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 pl-3.5 pr-2.5 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2px] text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all w-48 shadow-xs cursor-pointer"
            >
              <Search size={15} className="shrink-0" />
              <span className="flex-1 text-left truncate font-medium font-anthropic">Căutare...</span>
              <kbd className="text-[9px] font-bold px-1.5 py-0.5 rounded-[2px] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-data">⌘K</kbd>
            </button>

            {/* User menu */}
            <div className="relative">
              {(() => {
                const hour = new Date().getHours();
                const greeting = (hour >= 5 && hour < 12) 
                  ? 'Bună dimineața' 
                  : (hour >= 12 && hour < 18) 
                    ? 'Bună ziua' 
                    : 'Bună seara';
                const userNickname = currentUserObj?.nickname?.trim() || currentUserObj?.name?.trim().split(' ')[0] || username;
                const avatarInitial = (userNickname || 'U').charAt(0).toUpperCase();

                return (
                  <>
                    <button
                      onClick={() => setIsUserMenuOpen(v => !v)}
                      className="flex items-center gap-1.5 sm:gap-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 pl-1.5 sm:pl-2.5 pr-2 sm:pr-3 py-1.5 rounded-[2px] border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs text-slate-900 dark:text-white min-h-[38px]"
                    >
                      {(currentUserObj?.avatar || currentUserObj?.photo_url || currentUserObj?.photoUrl) ? (
                        <img
                          src={currentUserObj.avatar || currentUserObj.photo_url || currentUserObj.photoUrl}
                          alt=""
                          className="w-7 h-7 rounded-[2px] object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-[2px] flex items-center justify-center font-bold text-sm shrink-0 font-title"
                          style={{ background: themeColor, color: themeTextColor }}
                        >
                          {avatarInitial}
                        </div>
                      )}
                      <div className="hidden sm:flex flex-col leading-tight text-left">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold -mb-0.5 font-title">
                          {greeting}
                        </span>
                        <span className="text-sm font-black text-slate-900 dark:text-white font-anthropic">
                          {userNickname}
                        </span>
                      </div>
                      <ChevronDown size={14} className={`text-slate-400 dark:text-slate-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isUserMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-[calc(100%+0.5rem)] w-60 z-50 p-1.5 rounded-[2px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl font-anthropic"
                          >
                            <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                              <div className="text-xs font-bold text-slate-900 dark:text-white font-anthropic truncate">
                                {currentUserObj?.name || userNickname}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-title font-bold uppercase tracking-wider mt-0.5">
                                {currentUserObj?.role === 'admin' ? (currentUserObj.boardPosition || 'Board Member') : 'Voluntar'}
                              </div>
                            </div>
                            
                            {/* Easy / Advanced Mode Toggle in Dropdown */}
                            <button
                              onClick={() => {
                                const next = experienceMode === 'easy' ? 'advanced' : 'easy';
                                setExperienceMode(next);
                                localStorage.setItem('ui_experience_mode', next);
                                setIsUserMenuOpen(false);
                                toast.success(next === 'easy' ? '🌱 Modul Simplificat activat' : '⚡ Modul Avansat activat');
                              }}
                              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-[2px] text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 text-left transition-colors cursor-pointer font-anthropic"
                            >
                              <div className="flex items-center gap-2">
                                {experienceMode === 'easy' ? <Sparkles size={14} className="text-emerald-500" /> : <Zap size={14} className="text-blue-500" />}
                                <span>{experienceMode === 'easy' ? 'Treci la Mod Avansat' : 'Treci la Mod Simplu'}</span>
                              </div>
                              <span className="text-[10px] uppercase font-data font-black px-1.5 py-0.5 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                {experienceMode === 'easy' ? 'Easy' : 'Pro'}
                              </span>
                            </button>

                            <button
                              onClick={() => { setActiveSection('profil'); setIsUserMenuOpen(false); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[2px] text-sm font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 text-left transition-colors cursor-pointer font-anthropic"
                            >
                              <Settings size={15} className="text-slate-500 dark:text-slate-400" /> Profilul Meu
                            </button>
                            <button
                              onClick={() => { setIsTutorialOpen(true); setIsUserMenuOpen(false); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[2px] text-sm font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 text-left transition-colors cursor-pointer font-anthropic"
                            >
                              <Compass size={15} className="text-slate-500 dark:text-slate-400" /> Redeschide Turul
                            </button>
                            <button
                              onClick={onLogout}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[2px] text-sm font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/40 text-left transition-colors cursor-pointer font-anthropic"
                            >
                              <LogOut size={15} /> Deconectare
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </>
                );
              })()}
            </div>
          </div>
        </header>

        <MemberAlertsBar alerts={memberAlerts} dismissedIds={dismissedAlertIds} onDismiss={(id) => setDismissedAlertIds(prev => [...prev, id])} />

        {/* Dynamic View Content */}
        <div className="p-3.5 sm:p-5 md:p-8 w-full max-w-full relative z-10 pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: easeOut }}
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Command Palette (Ctrl/Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        navItems={commandPaletteNavItems}
        members={members}
        onNavigate={(sectionId) => { setMembersViewSeed({}); setActiveSection(sectionId); }}
        onSelectMember={(member) => { setMembersViewSeed({ memberId: member.id, search: member.name }); setActiveSection('membri'); }}
      />

      {/* Add Member Modal - Renders directly in Dashboard to overlay everything */}
      <AddMemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        members={members}
        currentUserObj={currentUserObj}
        onAddMember={(newMember) => {
          setMembers(prev => [...prev, newMember]);
        }}
      />

      {/* Platform Tutorial Modal */}
      <PlatformTutorialModal
        isOpen={isTutorialOpen}
        onClose={handleCloseTutorial}
        isMandatoryFirstTime={Boolean(currentUserObj && (currentUserObj.login_count === 0 || !currentUserObj.has_seen_tutorial))}
        currentUser={currentUserObj}
      />
    </div>
  );
}
