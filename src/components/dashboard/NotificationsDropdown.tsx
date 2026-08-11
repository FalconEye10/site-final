import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Heart, Megaphone, CheckCircle2, XCircle, PieChart, Sparkles, ChevronRight } from 'lucide-react';
import { supabase } from '../../supabase';

export interface NotificationItem {
  id: string;
  type: 'kudos' | 'excuse_approved' | 'excuse_rejected' | 'news' | 'poll' | 'event';
  title: string;
  description: string;
  timestamp: string;
  targetSection: string;
  isRead?: boolean;
}

interface NotificationsDropdownProps {
  currentUserId?: string;
  currentUsername?: string;
  onNavigateToSection: (sectionId: string) => void;
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  currentUserId,
  currentUsername,
  onNavigateToSection,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('read_notifications_v1') || '[]');
    } catch {
      return [];
    }
  });

  const [rawKudos, setRawKudos] = useState<any[]>([]);
  const [rawAbsences, setRawAbsences] = useState<any[]>([]);
  const [rawNews, setRawNews] = useState<any[]>([]);
  const [rawPolls, setRawPolls] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real-time data sources
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kudosRes, absRes, newsRes, pollsRes] = await Promise.all([
          supabase.from('kudos').select('*').order('createdAt', { ascending: false }).limit(10),
          supabase.from('absence_requests').select('*').order('timestamp', { ascending: false }).limit(10),
          supabase.from('news').select('*').order('createdAt', { ascending: false }).limit(5),
          supabase.from('polls').select('*').order('createdAt', { ascending: false }).limit(5),
        ]);

        if (kudosRes.data) setRawKudos(kudosRes.data);
        if (absRes.data) setRawAbsences(absRes.data);
        if (newsRes.data) setRawNews(newsRes.data);
        if (pollsRes.data) setRawPolls(pollsRes.data);
      } catch (err) {
        console.error('Error loading notifications:', err);
      }
    };

    fetchData();

    // Subscribe to channels for live updates
    const channel = supabase
      .channel('notifications_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kudos' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absence_requests' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Transform raw data into structured notifications
  const notifications: NotificationItem[] = useMemo(() => {
    const list: NotificationItem[] = [];

    // 1. Kudos received or recent
    rawKudos.forEach(k => {
      const isTarget = currentUserId && (k.recipientId === currentUserId || k.recipientName?.toLowerCase() === currentUsername?.toLowerCase());
      if (isTarget) {
        list.push({
          id: `kudos_${k.id}`,
          type: 'kudos',
          title: `Kudos primit de la ${k.senderName || 'un coleg'}!`,
          description: `"${k.message || k.badgeType || 'Apreciere deosebită'}"`,
          timestamp: k.createdAt,
          targetSection: 'kudos',
        });
      }
    });

    // 2. Absence Requests of user
    rawAbsences.forEach(req => {
      if (currentUserId && (req.memberId === currentUserId || req.memberName?.toLowerCase() === currentUsername?.toLowerCase())) {
        if (req.status === 'approved') {
          list.push({
            id: `abs_app_${req.id}`,
            type: 'excuse_approved',
            title: 'Cerere de motivare Aprobată! ✅',
            description: `Board-ul a aprobat motivarea ta pentru ședință.`,
            timestamp: req.timestamp || req.createdAt,
            targetSection: 'prezenta',
          });
        } else if (req.status === 'rejected') {
          list.push({
            id: `abs_rej_${req.id}`,
            type: 'excuse_rejected',
            title: 'Cerere de motivare Respinsă',
            description: `Motivul: ${req.reason || 'Verifică detaliile în secțiunea Prezență.'}`,
            timestamp: req.timestamp || req.createdAt,
            targetSection: 'prezenta',
          });
        }
      }
    });

    // 3. News announcements
    rawNews.forEach(n => {
      list.push({
        id: `news_${n.id}`,
        type: 'news',
        title: `Știre nouă: ${n.title}`,
        description: n.content ? (n.content.slice(0, 70) + '...') : 'Află noutățile clubului.',
        timestamp: n.createdAt,
        targetSection: 'stiri',
      });
    });

    // 4. Active Polls
    rawPolls.forEach(p => {
      list.push({
        id: `poll_${p.id}`,
        type: 'poll',
        title: `Sondaj nou: ${p.question}`,
        description: 'Exprimă-ți votul democratic pentru deciziile clubului.',
        timestamp: p.createdAt,
        targetSection: 'idei',
      });
    });

    // Sort descending by timestamp
    return list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [rawKudos, rawAbsences, rawNews, rawPolls, currentUserId, currentUsername]);

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    localStorage.setItem('read_notifications_v1', JSON.stringify(allIds));
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!readIds.includes(item.id)) {
      const updated = [...readIds, item.id];
      setReadIds(updated);
      localStorage.setItem('read_notifications_v1', JSON.stringify(updated));
    }
    setIsOpen(false);
    onNavigateToSection(item.targetSection);
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'kudos':
        return <Heart size={16} className="text-rose-500" />;
      case 'excuse_approved':
        return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'excuse_rejected':
        return <XCircle size={16} className="text-rose-500" />;
      case 'news':
        return <Megaphone size={16} className="text-blue-500" />;
      case 'poll':
        return <PieChart size={16} className="text-purple-500" />;
      default:
        return <Sparkles size={16} className="text-amber-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        title="Centru de Notificări & Alerte"
        className="relative p-2 rounded-xl border border-white/10 hover:bg-white/5 text-white/70 hover:text-white transition-all shrink-0"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-[calc(100%+0.5rem)] w-80 sm:w-96 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-50 flex flex-col font-['Hanken_Grotesk'] text-slate-800 dark:text-white"
          >
            {/* Dropdown Header */}
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">Notificări & Noutăți</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {unreadCount} noi
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <CheckCheck size={13} />
                  <span>Marchează citite</span>
                </button>
              )}
            </div>

            {/* Notification Items List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                  Nu ai notificări noi momentan.
                </div>
              ) : (
                notifications.map(item => {
                  const isUnread = !readIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-4 transition-colors cursor-pointer flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-white/5 ${
                        isUnread ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                        {getIcon(item.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className={`text-xs font-bold truncate ${isUnread ? 'text-blue-900 dark:text-blue-200' : 'text-slate-900 dark:text-white'}`}>
                            {item.title}
                          </h4>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-['Manrope'] line-clamp-2 mt-0.5">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-1 text-[10px] text-slate-400">
                          <span>
                            {item.timestamp ? new Date(item.timestamp).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                          </span>
                          <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                            Vezi <ChevronRight size={10} />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
