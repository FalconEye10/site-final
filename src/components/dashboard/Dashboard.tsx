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
import { VolunteerSpotlightCard } from './VolunteerSpotlightCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ShieldAlert } from 'lucide-react';

interface DashboardProps {
  username: string;
  onLogout: () => void;
}

const easeOut: [number, number, number, number] = [0.23, 1, 0.32, 1];

const Card = ({ children, className = '', onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
  <div
    onClick={onClick}
    className={`adm-glass p-7 ${className}`}
  >
    <div className="adm-accent-bar" />
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
      <div className="hidden sm:flex items-center gap-2 md:gap-3 px-2.5 md:px-4 py-1 md:py-2 bg-red-600/90 text-white border border-red-700/80 rounded-xl animate-pulse transition-all shrink-0">
        <div className="flex flex-col text-left">
          <span className="text-[9px] font-black uppercase tracking-widest text-red-100 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            Live
          </span>
          <span className="text-xs font-extrabold truncate max-w-[80px] md:max-w-[150px]" title={ongoingEvent.title}>
            {ongoingEvent.title}
          </span>
        </div>
        <div className="w-px h-6 md:h-8 bg-white/20" />
        <div className="flex flex-col text-right shrink-0">
          <span className="text-xs md:text-sm font-black font-mono tracking-tight">{formatTime(time)}</span>
          <span className="text-[9px] font-bold opacity-90">{formatDay(time)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-white/[0.02] border border-white/10 rounded-xl transition-all hover:bg-white/5 shrink-0">
      <div className="flex flex-col text-left">
        <span className="text-[9px] font-bold uppercase tracking-wider text-white/35">{formatDay(time)}</span>
        <span className="text-xs font-extrabold text-white/70">{formatDate(time)}</span>
      </div>
      <div className="w-px h-8 bg-white/10" />
      <div className="text-sm font-black font-mono tracking-tight text-white shrink-0">
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
    <div className="space-y-8 animate-fade-in pb-12 font-['Hanken_Grotesk']">
      {/* 0. Personalized Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-1">
        <div>
          <p className="text-sm font-anthropicSerif italic text-slate-400 mb-0.5">
            {(() => { const h = new Date().getHours(); return h < 12 ? 'Bună dimineața' : h < 18 ? 'Bună ziua' : 'Bună seara'; })()},
          </p>
          <h1 className="text-3xl md:text-4xl font-anthropicSerif font-bold text-brand-accent capitalize leading-tight">
            {isAdmin ? 'Administrator' : (currentUserObj?.nickname || currentUserObj?.name || 'Voluntar')}
            <span className="text-brand-primary"> · </span>
            <span className="text-slate-300 font-normal not-italic text-2xl md:text-3xl">Camena</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
          {new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* 1. Header Cards Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${!isAdmin ? 'xl:grid-cols-4' : ''} gap-3.5 sm:gap-6 items-center font-anthropic`}>
        {isAdmin ? (
          <>
            <Card className="stat-hero group relative overflow-hidden cursor-pointer border border-brand-muted/10 bg-white shadow-md !p-4 sm:!p-6 flex items-center gap-4 sm:gap-5 !rounded-2xl sm:!rounded-3xl" onClick={() => onNavigateToSection('membri')}>
              <span className="stat-hero-bar bg-gradient-to-r from-[#89cff0] to-transparent" />
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0"><Users size={24} className="sm:w-[26px] sm:h-[26px]" /></div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 block">Membri</span>
                <div className="text-3xl sm:text-4xl font-extrabold leading-none text-brand-accent my-1">{membersCount}</div>
                <div className="text-[11px] opacity-60 truncate">Voluntari înregistrați</div>
              </div>
            </Card>

            <Card className="stat-hero group relative overflow-hidden cursor-pointer border border-emerald-600/20 bg-white shadow-md !p-4 sm:!p-6 flex items-center gap-4 sm:gap-5 !rounded-2xl sm:!rounded-3xl" onClick={() => onNavigateToSection('istoric')}>
              <span className="stat-hero-bar bg-gradient-to-r from-emerald-500 to-transparent" />
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0"><Wallet size={24} className="sm:w-[26px] sm:h-[26px]" /></div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 block">Fonduri</span>
                <div className="text-3xl sm:text-4xl font-extrabold leading-none text-emerald-600 my-1">{totalCollected} <span className="text-lg sm:text-xl">Lei</span></div>
                <div className="text-[11px] opacity-60 truncate">Total cotizații încasate</div>
              </div>
            </Card>

            <Card className="stat-hero group relative overflow-hidden cursor-pointer border border-rose-200 bg-white shadow-md !p-4 sm:!p-6 flex items-center gap-4 sm:gap-5 !rounded-2xl sm:!rounded-3xl" onClick={() => onNavigateToSection('istoric')}>
              <span className="stat-hero-bar bg-gradient-to-r from-rose-500 to-transparent" />
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0"><AlertCircle size={24} className="sm:w-[26px] sm:h-[26px]" /></div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 block text-rose-600">Restanțe</span>
                <div className="text-3xl sm:text-4xl font-extrabold leading-none text-rose-600 my-1">{totalGlobalDebt} <span className="text-lg sm:text-xl">Lei</span></div>
                <div className="text-[11px] opacity-60 truncate">Total datorat de recuperat</div>
              </div>
            </Card>
          </>
        ) : (
          <>
            <Card className="stat-hero group relative overflow-hidden border border-brand-muted/10 bg-white shadow-md !p-4 sm:!p-6 flex items-center gap-4 sm:gap-5 !rounded-2xl sm:!rounded-3xl">
              <span className="stat-hero-bar bg-gradient-to-r from-[#89cff0] to-transparent" />
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0"><CreditCard size={24} className="sm:w-[26px] sm:h-[26px]" /></div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 block">Cotizație</span>
                <div className="text-2xl sm:text-3xl font-extrabold leading-none text-brand-accent my-1">
                  {personalDebt === 0 ? (
                    <span className="text-emerald-600 text-lg sm:text-xl font-bold">La zi!</span>
                  ) : (
                    <span>{personalDebt} <span className="text-sm sm:text-base font-bold">Lei datorați</span></span>
                  )}
                </div>
                <div className="text-[11px] opacity-60 truncate">Datoria ta curentă</div>
              </div>
            </Card>

            <Card className="stat-hero group relative overflow-hidden cursor-pointer border border-amber-200 bg-white shadow-md !p-4 sm:!p-6 flex items-center gap-4 sm:gap-5 !rounded-2xl sm:!rounded-3xl" onClick={() => onNavigateToSection('clasament')}>
              <span className="stat-hero-bar bg-gradient-to-r from-amber-500 to-transparent" />
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0"><Trophy size={24} className="sm:w-[26px] sm:h-[26px]" /></div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 block">Activitate</span>
                <div className="text-3xl sm:text-4xl font-extrabold leading-none text-brand-accent my-1">{personalHours} <span className="text-lg sm:text-xl">ore</span></div>
                <div className="text-[11px] opacity-60 truncate">Ore voluntariat înregistrate</div>
              </div>
            </Card>

            <Card className="stat-hero group relative overflow-hidden cursor-pointer border border-emerald-200 bg-white shadow-md !p-4 sm:!p-6 flex items-center gap-4 sm:gap-5 !rounded-2xl sm:!rounded-3xl" onClick={() => onNavigateToSection('clasament')}>
              <span className="stat-hero-bar bg-gradient-to-r from-emerald-500 to-transparent" />
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0"><Trophy size={24} className="sm:w-[26px] sm:h-[26px]" /></div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 block">Clasament</span>
                <div className="text-3xl sm:text-4xl font-extrabold leading-none text-brand-accent my-1">
                  {myTopPercent !== null ? <>Top {myTopPercent}<span className="text-lg sm:text-xl">%</span></> : '—'}
                </div>
                <div className="text-[11px] opacity-60 truncate">
                  {myRank !== null ? `Locul #${myRank} din ${rankableMembers.length} membri` : 'Fără punctaj înregistrat încă'}
                </div>
              </div>
            </Card>

            <Card className="stat-hero group relative overflow-hidden cursor-pointer border border-indigo-200 bg-white shadow-md !p-4 sm:!p-6 flex items-center gap-4 sm:gap-5 !rounded-2xl sm:!rounded-3xl" onClick={() => onNavigateToSection('idei')}>
              <span className="stat-hero-bar bg-gradient-to-r from-indigo-500 to-transparent" />
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0"><Lightbulb size={24} className="sm:w-[26px] sm:h-[26px]" /></div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 block">Proiecte</span>
                <div className="text-3xl sm:text-4xl font-extrabold leading-none text-brand-accent my-1">{personalProjects}</div>
                <div className="text-[11px] opacity-60 truncate">Propuneri active în sistem</div>
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

      {/* 2. News Banner / Alert Area */}
      {latestNews && (
        <div
          onClick={() => onNavigateToSection('stiri')}
          className="adm-glass p-6 md:p-7 flex flex-col md:flex-row items-center gap-6 cursor-pointer relative overflow-hidden"
          style={{ background: 'linear-gradient(120deg, #161d31 0%, #0c1120 100%)' }}
        >
          <div className="absolute top-[-30%] right-[-5%] w-96 h-96 blur-[90px] rounded-full pointer-events-none" style={{ background: 'color-mix(in srgb, var(--theme-color, #89cff0) 30%, transparent)' }} />
          <div className="w-14 h-14 rounded-2xl bg-white/8 flex items-center justify-center shrink-0 border border-white/10">
            <Megaphone className="animate-pulse adm-theme-icon" size={26} />
          </div>
          <div className="flex-1 text-center md:text-left relative z-10">
            <span className="text-[9px] font-bold uppercase tracking-widest bg-white/8 border border-white/10 px-3 py-1 rounded-full" style={{ color: 'var(--theme-color, #89cff0)' }}>Noutăți Oficiale Camena</span>
            <h3 className="text-2xl font-anthropicSerif font-bold mt-3 mb-1.5 leading-snug text-white">{latestNews.title}</h3>
            <p className="text-sm text-white/60 line-clamp-1 font-['Manrope']">{latestNews.content}</p>
          </div>
          <div className="text-xs font-bold font-['Manrope'] shrink-0 hidden md:block" style={{ color: 'var(--theme-color, #89cff0)' }}>Citește Anunțul &rarr;</div>
        </div>
      )}

      {/* 3. Main Bento Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">

        {activePoll ? (
          <Card className="md:col-span-7 lg:col-span-8 h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-anthropicSerif font-semibold text-lg flex items-center gap-2 text-slate-800">
                  <Globe size={18} className={activePoll.closed ? 'text-amber-500' : 'text-brand-primary'} /> 
                  {activePoll.closed ? 'Rezultate Sondaj' : 'Sondaj Activ'}
                </h3>
                <span className="text-[10px] uppercase font-bold bg-white/40 px-2.5 py-1 rounded-lg border border-brand-muted/5">
                  {activePoll.closed ? 'Închis' : 'Activ'} &bull; {totalVotes} {totalVotes === 1 ? 'vot' : 'voturi'}
                </span>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-lg font-anthropicSerif font-bold text-brand-accent leading-snug mb-2">{activePoll.question}</h4>
                
                <div className="space-y-3">
                  {(activePoll.options || []).map((option, idx) => {
                    const optionVotes = Object.values(activePoll.votes || {}).filter(v => Array.isArray(v) ? v.includes(idx) : v === idx).length;
                    const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                    const isSelected = Array.isArray(userVote) ? userVote.includes(idx) : userVote === idx;
 
                    if (activePoll.closed) {
                      return (
                        <div
                          key={idx}
                          className={`w-full p-4 rounded-full border transition-all relative overflow-hidden flex items-center justify-between ${
                            isSelected 
                              ? 'border-amber-500 bg-amber-500/5' 
                              : 'border-brand-muted/5 bg-white'
                          }`}
                        >
                          <div 
                            className="absolute left-0 top-0 bottom-0 bg-amber-500/10 transition-all duration-1000 ease-out z-0" 
                            style={{ width: `${percentage}%` }}
                          />
                          
                          <span className="text-sm font-semibold z-10 relative flex items-center gap-2">
                            {isSelected && <span className="text-amber-600 font-bold">✓</span>}
                            {option}
                          </span>
                          <span className="text-xs font-bold opacity-60 z-10 relative font-['Manrope']">{optionVotes} {optionVotes === 1 ? 'vot' : 'voturi'} ({percentage}%)</span>
                        </div>
                      );
                    }
 
                    return (
                      <button
                        key={idx}
                        onClick={() => handleVote(idx)}
                        className={`w-full text-left p-4 rounded-full border transition-all relative overflow-hidden group flex items-center justify-between ${
                          isSelected 
                            ? 'border-brand-primary bg-brand-primary/5' 
                            : 'border-brand-muted/5 hover:bg-black/5'
                        }`}
                      >
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-brand-primary/10 transition-all duration-1000 ease-out z-0" 
                          style={{ width: `${percentage}%` }}
                        />
                        
                        <span className="text-sm font-semibold z-10 relative flex items-center gap-2">
                          {isSelected && <span className="text-emerald-500 font-bold">✓</span>}
                          {option}
                        </span>
                        <span className="text-xs font-bold opacity-60 z-10 relative font-['Manrope']">{percentage}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="mt-6 pt-4 border-t border-brand-muted/5 flex gap-4">
                {activePoll.closed ? (
                  <button 
                    onClick={handleArchivePoll}
                    className="btn-stitch-primary py-2 px-6 rounded-full text-xs"
                  >
                    Arhivează Sondaj
                  </button>
                ) : (
                  <button 
                    onClick={handleClosePoll}
                    className="btn-stitch-primary py-2 px-6 rounded-full text-xs"
                  >
                    Închide Sondaj
                  </button>
                )}
              </div>
            )}
          </Card>
        ) : (
          <Card className="md:col-span-7 lg:col-span-8 h-full flex flex-col justify-between font-['Manrope']">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-anthropicSerif font-semibold text-lg flex items-center gap-2 text-slate-800"><Lightbulb size={18} className="text-indigo-500" /> Proiecte în Desfășurare</h3>
                <span className="text-[10px] uppercase font-bold bg-white/40 px-2.5 py-1 rounded-lg border border-brand-muted/5">Portofoliu</span>
              </div>
              
              {events.filter(e => e.type === 'project' && !e.attendanceClosed).length > 0 ? (
                <div className="space-y-4">
                  {events.filter(e => e.type === 'project' && !e.attendanceClosed).slice(0, 3).map((proj) => (
                    <div key={proj.id} className="p-4 bg-white/40 rounded-full border border-brand-muted/5 flex items-center justify-between hover:bg-indigo-50/10 transition-colors">
                      <div>
                        <h4 className="font-bold text-sm text-brand-accent">{proj.title}</h4>
                        <p className="text-xs opacity-60 mt-1 flex items-center gap-1"><MapPin size={12} /> {proj.location || 'Locație nespecificată'}</p>
                      </div>
                      <button 
                        onClick={() => onNavigateToSection('proiecte')}
                        className="btn-stitch-secondary py-1 px-4 text-xs font-bold"
                      >
                        Detalii
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs opacity-50 italic">Nu există proiecte în desfășurare în acest moment.</div>
              )}
            </div>
            
            {!isAdmin && (
              <div className="mt-6 border-t border-brand-muted/5 pt-4 flex justify-between items-center text-xs">
                <span className="opacity-60">Vrei să propui o inițiativă nouă?</span>
                <button
                  onClick={() => onNavigateToSection('proiecte')}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  Propune un Proiect &rarr;
                </button>
              </div>
            )}
          </Card>
        )}

        {/* Widget 2: Next Event Countdown & RSVP (Tilted visually for organic asymmetric look) */}
        <Card className="md:col-span-5 lg:col-span-4 h-full flex flex-col justify-between font-['Manrope']">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-anthropicSerif font-semibold text-lg flex items-center gap-2 text-slate-800"><Clock size={18} className="text-indigo-600" /> Următoarea Întâlnire</h3>
              <span className="text-[10px] uppercase font-bold bg-[#0F172A]/10 text-[#0F172A] px-2.5 py-1 rounded-lg border border-[#0F172A]/5">Rsvp</span>
            </div>

            {nextEvent ? (
               <div className="space-y-4">
                 <div className="flex items-center gap-4">
                   <div className="text-center bg-indigo-50 p-3 rounded-2xl border border-indigo-100/50 min-w-[70px]">
                     <div className="text-3xl font-black leading-none text-indigo-700">{countdownDays}</div>
                     <div className="text-[9px] font-bold uppercase opacity-60 mt-1 text-indigo-500">Zile</div>
                   </div>
                   <div>
                     <h4 className="font-anthropicSerif font-semibold text-base truncate max-w-[170px] text-brand-accent" title={nextEvent.title}>{nextEvent.title}</h4>
                     <p className="text-xs opacity-60 mt-1 flex items-center gap-1"><MapPin size={12} /> {nextEvent.location || 'Fără locație'}</p>
                     <p className="text-xs opacity-60 mt-0.5">{new Date(nextEvent.date).toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' })} la {nextEvent.time}</p>
                   </div>
                 </div>

                 {nextEvent.type === 'project' ? (
                   <div className="pt-4 border-t border-brand-muted/5 space-y-2">
                     <div className="text-xs font-bold opacity-50 uppercase tracking-wider mb-1">Comitete de Lucru</div>
                     {enrolledCommittees.length > 0 ? (
                       <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-semibold">
                         Ești înscris în comitetul: <strong className="font-extrabold">{enrolledCommittees.join(', ')}</strong>
                       </div>
                     ) : (
                       <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-brand-accent/60 text-xs font-semibold">
                         Nu ești înscris în niciun comitet de lucru pentru acest proiect.
                       </div>
                     )}
                   </div>
                 ) : currentUserObj?.role === 'admin' ? (
                    <div className="pt-4 border-t border-brand-muted/5">
                      <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs font-semibold flex items-center justify-between">
                        <span>Membru Board (Exonerat de RSVP)</span>
                        <span className="text-[10px] font-bold bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded-md uppercase">ADMIN</span>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-4 border-t border-brand-muted/5 space-y-2">
                      <div className="text-xs font-bold opacity-50 uppercase tracking-wider mb-2">Te înscrii la activitate?</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRSVP('confirmed')}
                          className={`flex-1 py-2.5 text-xs font-bold rounded-full transition-all border ${
                            userRsvpStatus === 'confirmed'
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                              : 'bg-white border-brand-muted/10 text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          Particip
                        </button>
                        <button
                          onClick={() => onRedirectToExcuse(nextEvent.id)}
                          className={`flex-1 py-2.5 text-xs font-bold rounded-full transition-all border ${
                            userRsvpStatus === 'declined'
                              ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/10'
                              : 'bg-white border-brand-muted/10 text-rose-600 hover:bg-rose-50'
                          }`}
                        >
                          Absentez
                        </button>
                      </div>
                    </div>
                  )}
               </div>
            ) : (
              <div className="py-8 text-center text-xs opacity-50 italic">Nu sunt întâlniri planificate în viitor.</div>
            )}
          </div>
        </Card>

        {/* Widget 3: Circular compliance or personal ledger (Asymmetric col layout) */}
        {isAdmin ? (
          <Card className="md:col-span-5 lg:col-span-5 h-full flex flex-col justify-between font-['Manrope']">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-anthropicSerif font-semibold text-lg flex items-center gap-2 text-slate-800"><CreditCard size={18} className="text-emerald-500" /> Monitorizare Cotizații</h3>
                <span className="text-[10px] uppercase font-bold bg-white/40 px-2.5 py-1 rounded-lg border border-brand-muted/5">Financiar</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full border-[6px] border-emerald-500/20 flex items-center justify-center shrink-0">
                    <div className="absolute inset-0 rounded-full border-[6px] border-emerald-500" style={{ clipPath: `polygon(50% 50%, -50% -50%, ${complianceRate >= 50 ? '150%' : '50%'} -50%, ${complianceRate >= 50 ? '150%' : '50%'} 150%, 50% 150%)` }}></div>
                    <span className="text-xs font-black font-['Manrope']">{complianceRate}%</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-brand-accent">Rată Conformitate</h4>
                    <p className="text-xs opacity-60 leading-tight mt-1">Sume achitate de membri raportat la obligația totală de cotizare.</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-brand-muted/5 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="opacity-60">Total Încasări:</span>
                    <span className="font-bold text-emerald-600">{totalCollected} Lei</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Datorii Restante:</span>
                    <span className="font-bold text-rose-600">{totalGlobalDebt} Lei</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="md:col-span-5 lg:col-span-5 h-full flex flex-col justify-between font-['Manrope']">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-anthropicSerif font-semibold text-lg flex items-center gap-2 text-slate-800"><CreditCard size={18} className="text-emerald-500" /> Situație Financiara Personala</h3>
                <span className="text-[10px] uppercase font-bold bg-white px-2.5 py-1 rounded-lg border border-emerald-500/10">Ledger</span>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white border border-emerald-500/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-50 block">Total Cotizație Plătită de tine:</span>
                  <span className="text-2xl font-black text-emerald-600 block mt-1">{currentUserObj?.totalPaid || 0} Lei</span>
                </div>
                <div className="text-xs space-y-1 font-['Manrope'] opacity-80 pl-1">
                  <p>• Valoarea cotizației este <strong>15 Lei/lună</strong>.</p>
                  <p>• Datoriile se calculează dinamic de la data aderării.</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => onNavigateToSection('profil')}
              className="w-full mt-4 py-2 btn-stitch-secondary text-xs font-bold"
            >
              Vezi Fișa de Plată Completă
            </button>
          </Card>
        )}

        {/* Widget 4: Member proposes a project, admin reviews what came in */}
        {isAdmin ? (
          <Card className="md:col-span-7 lg:col-span-7 h-full flex flex-col justify-between font-['Manrope']">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-anthropicSerif font-semibold text-lg flex items-center gap-2 text-slate-800"><FileText size={18} className="text-brand-primary" /> Propuneri de Proiecte</h3>
                <span className="text-[10px] uppercase font-bold text-slate-400">Analiză</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Membrii pot trimite propuneri de proiecte anonim sau semnate. Analizează-le și acordă puncte bonus
                celor semnate care merită implementate.
              </p>
              <button
                type="button"
                onClick={() => onNavigateToSection('proiecte')}
                className="w-full py-2.5 btn-stitch-primary text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                Vezi Propunerile
                <FileText size={12} />
              </button>
            </div>
          </Card>
        ) : (
          <Card className="md:col-span-7 lg:col-span-7 h-full flex flex-col justify-between font-['Manrope']">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-anthropicSerif font-semibold text-lg flex items-center gap-2 text-slate-800"><Lightbulb size={18} className="text-brand-primary" /> Ai o Idee de Proiect?</h3>
                <span className="text-[10px] uppercase font-bold text-slate-400">Propuneri</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Trimite propunerea ta completă (titlu, descriere, buget) în secțiunea Proiecte — anonim sau cu numele tău.
                Propunerile semnate pot primi <strong>puncte bonus</strong>.
              </p>
              <button
                type="button"
                onClick={() => onNavigateToSection('proiecte')}
                className="w-full py-2.5 btn-stitch-primary text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                Propune un Proiect
                <Send size={12} />
              </button>
            </div>
          </Card>
        )}

        {/* Widget 5: Club-wide contribution total — admin-only monitoring metric, not a member's personal concern */}
        {isAdmin && (
          <Card className="md:col-span-12 lg:col-span-6 h-full flex flex-col font-['Manrope']">
            <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-anthropicSerif font-semibold text-lg flex items-center gap-2 text-slate-800"><Trophy size={18} className="text-amber-500 animate-bounce" /> Obiectiv Comun Club</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg border border-brand-muted/5">Activitate Totală</span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5 font-['Manrope'] text-slate-700">
                    <span>Țintă ore activitate: {targetMonthlyHours}h</span>
                    <span className="text-emerald-600">{totalCombinedHours}h realizate ({targetPercentage}%)</span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-brand-muted/10 shadow-inner">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${targetPercentage}%` }}></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div className="text-2xl font-black text-slate-800 dark:text-white font-['Manrope']">{totalCombinedHours}</div>
                    <div className="text-[9px] font-bold uppercase opacity-85 mt-1 text-slate-500">Ore totale club</div>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div className="text-2xl font-black text-slate-800 dark:text-white font-['Manrope']">{totalCombinedProjects}</div>
                    <div className="text-[9px] font-bold uppercase opacity-85 mt-1 text-slate-500">Acțiuni comunitare</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Widget 6: Volunteers Leaderboard snapshot — full width for members since "Obiectiv Comun Club" is admin-only */}
        <Card className={`md:col-span-12 ${isAdmin ? 'lg:col-span-6' : 'lg:col-span-12'} h-full flex flex-col justify-between font-['Manrope']`}>
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-anthropicSerif font-semibold text-lg flex items-center gap-2 text-slate-800"><Star size={18} className="text-brand-primary" /> Lideri de Activitate</h3>
              <button 
                onClick={() => onNavigateToSection('clasament')} 
                className="text-xs font-bold text-brand-primary hover:underline"
              >
                Detalii
              </button>
            </div>

            <div className="space-y-3">
              {topVolunteers.map((m, index) => (
                <div 
                  key={m.id} 
                  className={`p-3 rounded-2xl border border-brand-muted/5 flex items-center gap-3 transition-all hover:bg-brand-accent/5 ${
                    index === 0 ? 'bg-amber-500/5 border-amber-500/10' : ''
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    index === 0 ? 'bg-amber-500 text-white' : 'bg-brand-accent/5 text-brand-accent/60'
                  }`}>
                    {index + 1}
                  </div>
                  
                  <img 
                    src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}`} 
                    alt={m.name} 
                    className="w-8 h-8 rounded-xl object-cover border border-brand-muted/5 shadow-sm"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs truncate flex items-center gap-1.5">
                      {m.name}
                    </div>
                    <div className="text-[10px] opacity-50 font-['Manrope'] truncate">{m.role || 'Voluntar'}</div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-xs text-brand-accent font-['Manrope']">{m.stats?.hours || 0}h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Widget 7: Member-exclusive Qualification status or Admin insights (occupies col-span-2) */}
        {!isAdmin ? (
          <Card className="md:col-span-12 lg:col-span-12 flex flex-col justify-between font-['Manrope'] relative overflow-hidden">
            <div>
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-anthropicSerif font-semibold text-lg flex items-center gap-2 text-slate-800"><CheckCircle size={18} className="text-emerald-500" /> Analiza Performanței Tale</h3>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">Indicator Status</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-brand-muted/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-50 block">Rata de prezență curentă:</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-brand-accent font-['Manrope']">{personalQualObj.rate}</span>
                    <span className="text-xs opacity-60">la activități</span>
                  </div>
                  <div className="w-full h-1.5 bg-brand-accent/5 rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${personalQualObj.percentage}%` }} />
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-brand-muted/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-50 block">Calificativul tău Camena:</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-2xl font-black text-brand-accent">{personalQualObj.qualification}</span>
                  </div>
                  <p className="text-[10px] opacity-60 leading-tight mt-3">Calculat automat în raport cu rata de prezență și calitatea de voluntar activ.</p>
                </div>
              </div>
            </div>
            <div className="text-[11px] opacity-55 font-medium font-['Manrope'] mt-4 border-t border-brand-muted/5 pt-3">
              Pentru a-ți menține calificativul <strong>Foarte Bine</strong> sau <strong>Excelent</strong>, participă activ la întâlniri și asigură-te că transmiți cereri de învoire justificate în cazul absențelor programate.
            </div>
          </Card>
        ) : (
          <Card className="md:col-span-12 lg:col-span-12 flex flex-col justify-between font-['Manrope'] relative overflow-hidden">
            <div>
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-anthropicSerif font-semibold text-lg flex items-center gap-2 text-slate-800"><Users size={18} className="text-brand-primary" /> Monitorizare Prezență Club</h3>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 px-3 py-1 rounded-full border border-sky-200">Panel Supervizor</span>
              </div>
              <p className="text-sm opacity-80 leading-relaxed font-['Manrope']">
                Conform regulamentului, membrii activi cu un calificativ de prezență sub <strong>Bine</strong> primesc notificări automate în fisa de plată și pe e-mail. Ca administrator, poți superviza prezențele din tab-ul dedicat și poți aproba sau respinge cererile de învoire.
              </p>
            </div>
            <button 
              onClick={() => onNavigateToSection('prezenta')}
              className="w-full mt-4 py-2.5 btn-stitch-primary text-xs font-bold"
            >
              Gestionează Prezențe & Cereri de Învoire
            </button>
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
      <Card className="!p-8 rounded-[0px_3rem_3rem_3rem] border border-slate-200 bg-white shadow-xl font-anthropic">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="text-2xl md:text-3xl font-anthropicSerif font-semibold text-slate-800">Istoric General Încasări</h2>
          <div className="relative group w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-accent/40 group-focus-within:text-brand-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Caută după membru..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/15 focus:bg-white transition-all font-['Manrope']"
            />
          </div>
        </div>

        <div className="overflow-x-auto p-1">
          <Table className="min-w-[840px]">
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm md:text-base py-4 px-4 font-bold">Membru</TableHead>
                <TableHead className="text-sm md:text-base py-4 px-4 font-bold">Suma</TableHead>
                <TableHead className="text-sm md:text-base py-4 px-4 font-bold">Lună Acoperită</TableHead>
                <TableHead className="text-sm md:text-base py-4 px-4 font-bold">Data/Ora</TableHead>
                <TableHead className="text-center text-sm md:text-base py-4 px-4 font-bold">Semn. Membru</TableHead>
                <TableHead className="text-center text-sm md:text-base py-4 px-4 font-bold">Semn. Trezorier</TableHead>
                <TableHead className="text-right text-sm md:text-base py-4 px-4 font-bold">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center p-10 text-slate-400 font-semibold h-36 text-base">
                    Se încarcă istoricul...
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((receipt) => {
                  const isCancelled = receipt.status === 'Anulat';
                  const canRevert = isAdmin && !isCancelled && isLatestPaymentForUser(receipt.id, receipt.memberId);
                  
                  return (
                    <TableRow key={receipt.id} className={`group ${isCancelled ? 'opacity-50' : ''}`}>
                      <TableCell className="font-bold py-5 px-4">
                        <div className={isCancelled ? 'line-through text-slate-500 text-base md:text-lg' : 'text-slate-800 dark:text-white text-base md:text-lg'}>{receipt.memberName}</div>
                        <div className="text-xs opacity-50 font-['Manrope'] mt-0.5">{receipt.id}</div>
                      </TableCell>
                      <TableCell className={`font-black font-['Manrope'] py-5 px-4 text-base md:text-lg ${isCancelled ? 'text-slate-500 line-through' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {receipt.amount} Lei
                      </TableCell>
                      <TableCell className={`py-5 px-4 text-sm md:text-base ${isCancelled ? 'line-through text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        {receipt.month || (receipt.monthsCovered && receipt.monthsCovered.join(', '))}
                      </TableCell>
                      <TableCell className="opacity-70 text-xs md:text-sm font-['Manrope'] py-5 px-4">
                        {receipt.dateFormatted || new Date(receipt.date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-center py-5 px-4">
                        {receipt.memberSignature ? (
                          <img src={receipt.memberSignature} alt="Semnatura Membru" className="h-10 w-22 object-contain mx-auto mix-blend-multiply dark:invert dark:mix-blend-screen" />
                        ) : <span className="text-xs md:text-sm opacity-50 block text-center">-</span>}
                      </TableCell>
                      <TableCell className="text-center py-5 px-4">
                        {receipt.treasurerSignature ? (
                          <img src={receipt.treasurerSignature} alt="Semnatura Trezorier" className="h-10 w-22 object-contain mx-auto mix-blend-multiply dark:invert dark:mix-blend-screen" />
                        ) : <span className="text-xs md:text-sm opacity-50 block text-center">-</span>}
                      </TableCell>
                      <TableCell className="text-right py-5 px-4">
                        {canRevert && (
                          <button
                            onClick={() => setReceiptToRevert(receipt)}
                            className="p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 rounded-xl transition-all"
                            title="Revert Payment (Permis doar pentru ultima plată)"
                          >
                            <RotateCcw size={18} />
                          </button>
                        )}
                        {!canRevert && isAdmin && !isCancelled && (
                          <button
                            disabled
                            className="p-2.5 text-slate-300 dark:text-slate-700 rounded-xl cursor-not-allowed"
                            title="Doar ultima plată a unui utilizator poate fi anulată"
                          >
                            <RotateCcw size={18} />
                          </button>
                        )}
                        {isCancelled && (
                           <span className="px-3.5 py-1 rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-bold uppercase tracking-wider">Anulat</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center p-10 text-slate-400 font-semibold h-36 text-base">
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
              className="absolute inset-0 bg-brand-accent/40 backdrop-blur-sm"
              onClick={() => setReceiptToRevert(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2rem] p-8 overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
              
              <div className="flex items-center gap-4 text-red-600 mb-6">
                <AlertCircle size={28} />
                <h3 className="text-lg font-bold">Anulare Plată (Revert)</h3>
              </div>
              
              <p className="text-sm text-brand-accent/80 leading-relaxed mb-6 font-['Manrope']">
                Ești sigur că vrei să anulezi această plată? Anularea va readăuga automat suma <span className="font-bold">{receiptToRevert.amount} Lei</span> la datoria membrului <span className="font-bold">{receiptToRevert.memberName}</span>.
              </p>

              <div className="flex gap-4">
                <button 
                  onClick={() => setReceiptToRevert(null)}
                  className="flex-1 py-2.5 btn-stitch-secondary text-xs font-bold"
                >
                  Nu, renunță
                </button>
                <button 
                  onClick={handleConfirmRevert}
                  className="flex-1 py-2.5 btn-stitch-danger text-xs font-bold"
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
      
      // Calculăm dacă există membri care nu au plătit
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
      
      // VALIDAREA PRE-EXPORT
      if (missingCount > 0) {
        setShowWarning(true);
        setIsExporting(false);
        return;
      }
      
      await proceedExport();
    } catch (err) {
      console.error(err);
      setIsExporting(false);
    }
  };

  const proceedExport = async () => {
    setIsExporting(true);
    setShowWarning(false);
    try {
      const { generateTreasuryPDF } = await import('../../utils/pdfGenerator');
      await generateTreasuryPDF({ 
        month: selectedMonth, 
        year: parseInt(selectedYear), 
        members 
      });
      toast.success('Documentul PDF a fost generat și descărcat cu succes!');
    } catch (error) {
      console.error(error);
      toast.error('Eroare la generarea PDF-ului.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold">Generare Rapoarte</h2>
          <p className="opacity-70 mt-2 max-w-xl text-sm leading-relaxed">
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
              className="absolute inset-0 bg-brand-accent/60 backdrop-blur-md"
              onClick={() => setShowWarning(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.3)] p-8 z-[121] border border-brand-muted/10"
            >
              <div className="flex items-center gap-3 text-orange-600 mb-4">
                <AlertCircle size={28} />
                <h3 className="text-lg font-bold">Atenție Restanțieri!</h3>
              </div>
              
              <p className="text-sm text-brand-accent/80 leading-relaxed mb-6 font-['Manrope']">
                Atenție! Nu toți membrii activi au achitat cotizația pentru luna selectată (<span className="font-bold">{selectedMonth} {selectedYear}</span>). În PDF vor apărea spații goale la semnături pentru restanțieri. Doriți să continuați generarea raportului fiscal?
              </p>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowWarning(false)}
                  className="flex-1 py-2.5 btn-stitch-secondary text-xs font-bold"
                >
                  Anulează
                </button>
                <button 
                  onClick={proceedExport}
                  className="flex-1 py-2.5 btn-stitch-primary text-xs font-bold"
                >
                  Continuă Exportul
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card: Balanță Analitică */}
        <div className="p-5 border border-emerald-500/20 bg-emerald-50/10 rounded-2xl flex flex-col items-start gap-4 hover:border-emerald-500/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CreditCard size={18} />
          </div>
          <div className="w-full">
            <h4 className="font-bold text-base mb-1">Balanță Cotizații</h4>
            <p className="text-sm opacity-70 mb-4">Sinteza plăților lunare și semnăturile electronice sub formă de tabel PDF.</p>
            
            <div className="flex gap-2 mb-4 w-full">
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 p-2.5 border border-brand-muted/10 rounded-xl text-sm font-semibold focus:outline-none focus:border-brand-primary bg-white cursor-pointer"
              >
                {LUNI_DISPONIBILE.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="p-2.5 border border-brand-muted/10 rounded-xl text-sm font-semibold focus:outline-none focus:border-brand-primary bg-white cursor-pointer"
              >
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>
          
          <button 
            onClick={handleExportClick}
            disabled={isExporting}
            className={`mt-auto w-full flex justify-center items-center gap-2 py-2.5 rounded-full text-sm font-bold transition-colors btn-stitch-primary ${
              isExporting 
                ? 'opacity-50 cursor-wait' 
                : ''
            }`}
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Se procesează datele...
              </>
            ) : (
              <>
                <Download size={14} /> Generează PDF
              </>
            )}
          </button>
        </div>

        {/* Alte card-uri in viitor */}
        {[
          { title: 'Raport Prezență', desc: 'Tabel centralizator cu toate calificativele lunare. (În curând)' },
          { title: 'Fișă Activitate Proiecte', desc: 'Statusul tuturor proiectelor interne. (În curând)' }
        ].map(r => (
          <div key={r.title} className="p-5 border border-brand-muted/10 rounded-2xl flex flex-col items-start gap-4 opacity-50 cursor-not-allowed">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-500 flex items-center justify-center"><FileText size={18} /></div>
            <div>
              <h4 className="font-bold text-sm mb-1">{r.title}</h4>
              <p className="text-xs opacity-60">{r.desc}</p>
            </div>
            <button disabled className="mt-auto flex items-center gap-2 text-xs font-semibold text-neutral-400">
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
  const [password, setPassword] = useState(effectiveUser.password || '');
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
      setPassword(effectiveUser.password || '');
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
      const allowedPasswordChange = canEditMemberPassword(currentUserObj || effectiveUser, effectiveUser.role);
      const finalPassword = allowedPasswordChange ? password : (effectiveUser.password || '');

      const updated = {
        ...effectiveUser,
        nickname,
        avatar,
        password: finalPassword,
      };
      // Scriem doar câmpurile editate aici, ca să nu suprascriem scorul/plata
      // schimbate între timp de un admin (updateMemberFields ≠ overwrite total).
      await updateMemberFields(effectiveUser.id, { nickname, avatar, password: finalPassword });
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
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-brand-muted/5 pb-3">
              <User size={18} className="text-brand-primary" /> Editare Profil
            </h3>
            
            <div className="space-y-6">
              {/* Profile Photo Upload */}
              <div className="flex flex-col items-center gap-4 p-5 bg-[#FAF9F5] rounded-2xl border border-brand-muted/10">
                <div 
                  className="relative group cursor-pointer" 
                  onClick={() => document.getElementById('avatar-file-input')?.click()}
                  title="Apasă pentru a alege o poză nouă"
                >
                  {avatar ? (
                    <img 
                      src={avatar} 
                      alt="Avatar" 
                      className="w-24 h-24 rounded-3xl object-cover border-2 border-brand-primary/30 shadow-md transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-3xl bg-brand-accent text-white flex items-center justify-center font-bold text-4xl shadow-md uppercase transition-transform group-hover:scale-105">
                      {currentUserObj.name.charAt(0)}
                    </div>
                  )}
                  <div 
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity"
                  >
                    <Upload size={22} className="mb-1" />
                    <span className="text-[10px] font-bold">Schimbă</span>
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
                    className="px-3.5 py-1.5 rounded-xl bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload size={14} /> Încarcă Poză
                  </button>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar('')}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Șterge
                    </button>
                  )}
                </div>
                
                <div className="w-full space-y-1">
                  <label className="block text-[11px] font-semibold opacity-60 text-center">
                    Sau introdu link direct către poză (URL):
                  </label>
                  <input 
                    type="text" 
                    value={avatar}
                    onChange={e => setAvatar(e.target.value)}
                    placeholder="https://exemplu.ro/poza.jpg" 
                    className="w-full px-3 py-2 text-xs bg-white border border-brand-muted/10 rounded-xl focus:outline-none focus:border-brand-primary font-['Manrope']"
                  />
                </div>
              </div>

              {/* Nickname / Poreclă */}
              <div className="space-y-1">
                <label className="text-xs font-semibold opacity-60 uppercase">Poreclă / Nickname</label>
                <input 
                  type="text" 
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="Ex: Poreclă" 
                  className="w-full px-4 py-2.5 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl focus:outline-none focus:border-brand-primary font-['Manrope']"
                />
              </div>

              {/* Password Reset */}
              <div className="space-y-1">
                <label className="text-xs font-semibold opacity-60 uppercase">Parolă Nouă</label>
                {canEditMemberPassword(currentUserObj || effectiveUser, effectiveUser.role) ? (
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" 
                      className="w-full px-4 py-2.5 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl focus:outline-none focus:border-brand-primary font-['Manrope'] pr-10"
                    />
                    <button 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity animate-fade-in"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input 
                      type="password"
                      value="••••••••"
                      disabled
                      readOnly
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-['Manrope']"
                    />
                    <p className="text-[11px] font-semibold text-amber-700">
                      🔒 Schimbarea parolelor pentru conturile de Board este făcută exclusiv de Stan Ștefan.
                    </p>
                  </div>
                )}
              </div>

              {/* Username Display */}
              <div className="space-y-1">
                <label className="text-xs font-semibold opacity-60 uppercase">Username</label>
                <input
                  type="text"
                  value={effectiveUser.username}
                  readOnly
                  className="w-full px-4 py-2.5 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl font-['Manrope'] opacity-60 cursor-not-allowed"
                />
              </div>

              {/* Save changes */}
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="ios26-btn w-full py-3 font-semibold flex items-center justify-center gap-2"
              >
                {isSaving ? 'Se salvează...' : 'Salvează Modificările'}
              </button>
            </div>
          </Card>
        </div>

        {/* Right Column: Complex Statistics & Details */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Top Header Card */}
          <Card>
            <div className="flex flex-col md:flex-row items-center gap-6">
              {(avatar || effectiveUser.photo_url || effectiveUser.photoUrl) ? (
                <img 
                  src={avatar || effectiveUser.photo_url || effectiveUser.photoUrl} 
                  alt="Profile" 
                  className="w-20 h-20 rounded-3xl object-cover border border-brand-muted/10 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-3xl bg-brand-accent text-white flex items-center justify-center font-bold text-3xl shadow-md uppercase">
                  {effectiveUser.name.charAt(0)}
                </div>
              )}
              <div className="text-center md:text-left flex-1">
                <h2 className="text-2xl font-black text-brand-accent mb-2">{effectiveUser.name}</h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold uppercase tracking-wider">
                    {effectiveUser.role === 'admin' ? 'Board Member' : 'Voluntar'}
                  </span>
                  {effectiveUser.boardPosition && (
                    <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-black uppercase tracking-wider animate-pulse">
                      {effectiveUser.boardPosition}
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border tracking-wider ${
                    effectiveUser.status === 'passive' 
                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {effectiveUser.status === 'passive' ? 'Pasiv' : 'Activ'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Stats Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Leaderboard Standing */}
            <Card>
              <h4 className="text-sm font-bold opacity-60 uppercase mb-4 flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" /> Clasament General
              </h4>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-black text-brand-accent">#{rank}</span>
                <span className="text-xs opacity-60">din {members.length} membri</span>
              </div>
              <div className="text-sm font-semibold mb-4">Scor total: <span className="text-amber-600 font-bold">{effectiveUser.score || 0} puncte</span></div>
              
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                <div className="text-xs font-bold opacity-50 uppercase">Istoric Puncte</div>
                {effectiveUser.scoreAdjustments && effectiveUser.scoreAdjustments.length > 0 ? (
                  effectiveUser.scoreAdjustments.map((adj: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-xs p-2 bg-[#FAF9F5] rounded-lg border border-brand-muted/5">
                      <div className="truncate pr-2">
                        <div className="font-semibold truncate">{adj.reason}</div>
                        <div className="opacity-50 text-[10px]">{adj.date} • {adj.adminName}</div>
                      </div>
                      <span className={`font-bold shrink-0 ${adj.points >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {adj.points >= 0 ? `+${adj.points}` : adj.points}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs opacity-50 italic">Fără ajustări de scor înregistrate.</div>
                )}
              </div>
            </Card>

            {/* Attendance detailed */}
            <Card>
              <h4 className="text-sm font-bold opacity-60 uppercase mb-4 flex items-center gap-2">
                <CheckCircle size={16} className="text-indigo-500" /> Detalii Prezență
              </h4>
              <div className="flex items-center gap-4 mb-3">
                <div className="text-4xl font-black text-brand-accent">{rate}</div>
                <div className={`px-2 py-0.5 rounded text-xs font-black uppercase ${colorClass}`}>
                  {qualification}
                </div>
              </div>
              
              {effectiveUser.status !== 'passive' && (
                <div className="w-full h-3 bg-brand-accent/5 rounded-full overflow-hidden shadow-inner mb-4">
                  <div className={`h-full transition-all ${barColorClass}`} style={{ width: `${percentage}%` }} />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-['Manrope']">
                <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="opacity-60 text-[10px] uppercase">Prezențe</div>
                  <div className="font-bold text-emerald-700 text-sm mt-0.5">{presences}</div>
                </div>
                <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100">
                  <div className="opacity-60 text-[10px] uppercase">Motivate</div>
                  <div className="font-bold text-indigo-700 text-sm mt-0.5">{excused}</div>
                </div>
                <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                  <div className="opacity-60 text-[10px] uppercase">Absențe</div>
                  <div className="font-bold text-rose-700 text-sm mt-0.5">{unexcused}</div>
                </div>
              </div>
            </Card>

          </div>

          {/* Financial Ledger & Cotizații */}
          <Card>
            <h4 className="text-sm font-bold opacity-60 uppercase mb-4 flex items-center gap-2">
              <CreditCard size={16} className="text-brand-primary" /> Registru Financiar (Cotizații)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-3 bg-[#FAF9F5] rounded-xl border border-brand-muted/5">
                <div className="text-[10px] opacity-60 uppercase">Total Plătit</div>
                <div className="text-lg font-black text-emerald-600">{effectiveUser.totalPaid || 0} RON</div>
              </div>
              <div className="p-3 bg-[#FAF9F5] rounded-xl border border-brand-muted/5">
                <div className="text-[10px] opacity-60 uppercase">Datorie Curentă</div>
                <div className={`text-lg font-black ${debt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {debt} RON
                </div>
              </div>
              <div className="p-3 bg-[#FAF9F5] rounded-xl border border-brand-muted/5">
                <div className="text-[10px] opacity-60 uppercase">Status Plăți</div>
                <div className="text-lg font-black">
                  {debt === 0 ? (
                    <span className="text-emerald-600 flex items-center gap-1"><Star size={14} className="fill-emerald-400 text-emerald-400" /> La Zi</span>
                  ) : (
                    <span className="text-rose-600">Restanțier</span>
                  )}
                </div>
              </div>
            </div>

            {/* Ledger Months grid */}
            <div>
              <div className="text-xs font-bold opacity-50 uppercase mb-3">Istoric Plăți pe Luni</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {ledger.map((m, idx) => (
                  <div 
                    key={idx} 
                    className={`p-2.5 rounded-xl border text-center text-xs flex flex-col justify-between transition-all ${
                      m.status === 'Achitat' 
                        ? 'bg-emerald-50/50 border-emerald-200/50 text-emerald-700' 
                        : 'bg-rose-50/50 border-rose-200/50 text-rose-700'
                    }`}
                  >
                    <span className="font-bold text-[10px] uppercase opacity-75">{m.shortName} {m.year}</span>
                    <span className="font-black mt-1 text-[11px]">{m.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

        </div>

      </div>

      {/* Cropper Modal */}
      {tempImageSrc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-[#FAF9F5] rounded-3xl p-6 max-w-md w-full border border-brand-muted/10 shadow-[0_24px_64px_rgba(0,31,38,0.16)] flex flex-col items-center">
            <h3 className="text-lg font-bold text-brand-accent mb-4">Ajustare Poza de Profil</h3>
            
            {/* Viewport crop area */}
            <div 
              className="w-[200px] h-[200px] overflow-hidden rounded-3xl relative bg-black border border-brand-muted/15 mb-6 shadow-inner cursor-move select-none touch-none"
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
                <div className="flex justify-between text-xs font-bold text-brand-accent/60">
                  <span>ZOOM</span>
                  <span>{Math.round(cropZoom * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.05"
                  value={cropZoom}
                  onChange={e => setCropZoom(parseFloat(e.target.value))}
                  className="w-full h-1 bg-brand-accent/10 rounded-lg appearance-none cursor-pointer accent-[#28FAFC]"
                />
              </div>
              <p className="text-[10px] text-center opacity-50 uppercase font-semibold">Trage imaginea cu cursorul sau tactil pentru a o centra</p>
            </div>
            
            {/* Buttons */}
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => setTempImageSrc(null)}
                className="flex-1 py-2.5 btn-stitch-secondary text-xs font-bold"
              >
                Renunță
              </button>
              <button 
                onClick={handleApplyCrop}
                className="flex-1 ios26-btn py-2.5 text-xs font-bold uppercase tracking-wider"
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
    const localKey = `tutorial_seen_v2_${username.toLowerCase()}`;
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
    const localKey = `tutorial_seen_v2_${username.toLowerCase()}`;
    localStorage.setItem(localKey, 'true');

    // Update in Supabase so login count is saved and has_seen_tutorial is marked true
    try {
      const currentMember = members.find(m => m.username?.toLowerCase() === username.toLowerCase());
      const nextCount = (currentMember?.login_count || 0) + 1;
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
    currentUserObj?.name?.toLowerCase().includes('stefan stan') ||
    currentUserObj?.name?.toLowerCase().includes('stan stefan') ||
    currentUserObj?.boardPosition?.toLowerCase().includes('trezorier') ||
    currentUserObj?.username?.toLowerCase() === 'admin'
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

  const MENU_CATEGORIES: { title: string; items: { id: string; label: string; icon: any; count?: number }[] }[] = [
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

  const renderActiveView = () => {
    switch (activeSection) {
      case 'dashboard': return (
        <ViewDashboard 
          members={members} 
          currentUserObj={currentUserObj} 
          isAdmin={isAdmin} 
          onNavigateToSection={setActiveSection} 
          onRedirectToExcuse={(eventId) => {
            setPreselectedEventIdForExcuse(eventId);
            setActiveSection('prezenta');
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
        <LeaderboardView members={members} isAdmin={isAdmin} onUpdateMember={handleUpdateMember} currentUserObj={currentUserObj} />
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
            setActiveSection('prezenta');
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
      className="dashboard-shell h-screen font-['Hanken_Grotesk'] flex relative overflow-hidden"
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
        <div className="px-5 pt-6 pb-4 flex flex-col items-center relative border-b border-white/10 shrink-0">
          {/* Close button for mobile sidebar */}
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-2 text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
            title="Închide"
          >
            <X size={18} />
          </button>
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setIsSidebarCollapsed(v => !v)}
            className="hidden lg:flex absolute top-4 right-3 p-1.5 text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors"
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
            <div className="adm-meta-label flex items-center gap-2 text-center">
              <span className="w-1 h-1 shrink-0" style={{ backgroundColor: themeColor }} />
              District 2241 · Piatra Neamț
            </div>
          )}
        </div>

        <div className="adm-sidebar-scroll p-3 space-y-5 flex-1 overflow-y-auto">
          {MENU_CATEGORIES.map((category, idx) => (
            <div key={idx}>
              {!isSidebarCollapsed && (
                <h3 className="adm-meta-label flex items-center gap-2 px-3 mb-1.5">
                  <span className="h-px w-3 bg-white/20" />
                  {category.title}
                </h3>
              )}
              <nav className="space-y-0.5">
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
                      className={`adm-nav-item w-full flex items-center gap-3 py-2.5 font-medium transition-all ${
                        isSidebarCollapsed ? 'justify-center px-0' : 'px-4'
                      } ${isActive ? 'active text-white' : 'text-white/55 hover:text-white/90'}`}
                    >
                      <Icon
                        size={17}
                        className="shrink-0 transition-colors duration-300"
                        style={isActive ? { color: visibleThemeColor } : {}}
                      />
                      {!isSidebarCollapsed && <span className="text-[13.5px] font-medium flex-1 text-left">{item.label}</span>}
                      {!isSidebarCollapsed && item.id === 'comunitate' && unreadPitchesCount > 0 && (
                        <span className="adm-meta-label !text-[9px] px-1.5 py-0.5 border border-white/20 text-white/70">
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

        <div className="p-3 border-t border-white/10 shrink-0">
           {!isSidebarCollapsed && (
             <div className="flex items-center justify-between px-3 py-2 mb-2 border border-emerald-500/20 bg-emerald-500/5">
               <div className="flex items-center gap-2">
                 <span className="relative flex h-1.5 w-1.5">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                   <span className="relative inline-flex h-1.5 w-1.5 bg-emerald-400" />
                 </span>
                 <span className="adm-meta-label !text-emerald-300/80">Sistem Operațional</span>
               </div>
               <span className="adm-meta-label !text-emerald-400/50">v{__APP_VERSION__}</span>
             </div>
           )}
           <button
            onClick={onLogout}
            title={isSidebarCollapsed ? 'Deconectare' : undefined}
            className={`w-full flex items-center gap-3 py-2.5 text-red-400/80 hover:text-red-300 hover:bg-red-500/8 font-medium transition-all group ${isSidebarCollapsed ? 'justify-center px-0' : 'px-4'}`}
          >
            <LogOut size={17} className="shrink-0" />
            {!isSidebarCollapsed && <span className="text-[13.5px]">Deconectare</span>}
          </button>
        </div>
      </aside>

      <main
        className={`flex-1 flex flex-col h-screen overflow-y-auto relative transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}
      >

        {/* Header */}
        <header className="adm-header sticky top-0 z-30 px-3.5 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex-1 flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 -ml-1 text-white/80 hover:text-white hover:bg-white/10 active:bg-white/20 rounded-lg transition-colors shrink-0 touch-manipulation"
              title="Meniu"
              aria-label="Deschide meniul"
            >
              <Menu size={22} />
            </button>

            <div
              className="w-2 h-2 shrink-0"
              style={{ backgroundColor: visibleThemeColor, transition: 'background-color 0.8s ease' }}
            />
            <h1 className="text-xl md:text-2xl font-anthropicSerif italic font-medium text-white truncate">
              {activeTitle}
            </h1>
          </div>

          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            <ClockWidget events={events} />

            {/* Smart Notifications Bell Dropdown */}
            <NotificationsDropdown
              currentUserId={currentUserObj?.id}
              currentUsername={currentUserObj?.username || username}
              onNavigateToSection={setActiveSection}
            />

            {/* Light / Dark toggle */}
            <button
              onClick={() => setThemeMode(m => m === 'dark' ? 'light' : 'dark')}
              className="p-2 border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-all shrink-0"
              title={themeMode === 'dark' ? 'Comută la mod luminos' : 'Comută la mod întunecat'}
            >
              {themeMode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Search / command palette trigger */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 pl-3.5 pr-2.5 py-2 bg-white/[0.02] hover:bg-white/5 border border-white/10 text-sm text-white/40 hover:text-white/70 transition-all w-48"
            >
              <Search size={15} className="shrink-0" />
              <span className="flex-1 text-left truncate">Căutare...</span>
              <kbd className="text-[9px] font-bold px-1.5 py-0.5 border border-white/10 text-white/40">⌘K</kbd>
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(v => !v)}
                className="flex items-center gap-2.5 bg-white/[0.02] pl-2.5 pr-3 py-1.5 border border-white/10 hover:bg-white/5 transition-all"
              >
                 {(currentUserObj?.avatar || currentUserObj?.photo_url || currentUserObj?.photoUrl) ? (
                   <img
                     src={currentUserObj.avatar || currentUserObj.photo_url || currentUserObj.photoUrl}
                     alt=""
                     className="w-7 h-7 rounded-sm object-cover border border-white/10 shrink-0"
                   />
                 ) : (
                   <div
                    className="w-7 h-7 flex items-center justify-center font-bold text-sm shrink-0"
                    style={{ background: themeColor, color: themeTextColor }}
                   >
                     {username.charAt(0).toUpperCase()}
                   </div>
                 )}
                 <div className="hidden sm:flex flex-col leading-tight text-left">
                   <span className="text-[10px] text-white/35 font-medium -mb-0.5">
                     {(() => { const h = new Date().getHours(); return h < 12 ? 'Bună dimineața' : h < 18 ? 'Bună ziua' : 'Bună seara'; })()}
                   </span>
                   <span className="text-sm font-bold text-white capitalize">{username}</span>
                 </div>
                 <ChevronDown size={14} className={`text-white/30 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
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
                      className="adm-glass-static absolute right-0 top-[calc(100%+0.5rem)] w-48 z-50 p-1.5"
                    >
                      <button
                        onClick={() => { setActiveSection('profil'); setIsUserMenuOpen(false); }}
                        className="adm-command-item w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/80 text-left"
                      >
                        <Settings size={15} className="text-white/50" /> Profilul Meu
                      </button>
                      <button
                        onClick={() => { setIsTutorialOpen(true); setIsUserMenuOpen(false); }}
                        className="adm-command-item w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/80 text-left"
                      >
                        <Compass size={15} className="text-white/50" /> Redeschide Turul
                      </button>
                      <button
                        onClick={onLogout}
                        className="adm-command-item w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 text-left"
                      >
                        <LogOut size={15} /> Deconectare
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
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
      />
    </div>
  );
}
