import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Heart, Megaphone, CheckCircle2, XCircle, PieChart, Sparkles, ChevronRight, Trophy, Calendar } from 'lucide-react';
import { supabase } from '../../supabase';
import { PushNotificationToggle } from './PushNotificationToggle';
import { sendSystemNotification } from '../../utils/pushNotifications';
import { formatRomaniaDateTime } from '../../utils/romaniaTime';

export interface NotificationItem {
  id: string;
  type: 'score' | 'excuse_approved' | 'excuse_rejected' | 'news' | 'poll' | 'forum' | 'event' | 'kudos';
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
      return JSON.parse(localStorage.getItem('read_notifications_v2') || '[]');
    } catch {
      return [];
    }
  });

  const [rawKudos, setRawKudos] = useState<any[]>([]);
  const [rawAbsences, setRawAbsences] = useState<any[]>([]);
  const [rawNews, setRawNews] = useState<any[]>([]);
  const [rawPolls, setRawPolls] = useState<any[]>([]);
  const [rawPitches, setRawPitches] = useState<any[]>([]);
  const [rawEvents, setRawEvents] = useState<any[]>([]);
  const [currentMemberData, setCurrentMemberData] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Fetch real-time data sources
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kudosRes, absRes, newsRes, pollsRes, pitchRes, eventRes] = await Promise.all([
          supabase.from('kudos').select('*').order('createdAt', { ascending: false }).limit(10),
          supabase.from('absence_requests').select('*').order('timestamp', { ascending: false }).limit(10),
          supabase.from('news').select('*').order('createdAt', { ascending: false }).limit(5),
          supabase.from('polls').select('*').order('createdAt', { ascending: false }).limit(5),
          supabase.from('project_pitches').select('*').order('createdAt', { ascending: false }).limit(5),
          supabase.from('events').select('*').order('date', { ascending: false }).limit(5),
        ]);

        if (kudosRes.data) setRawKudos(kudosRes.data);
        if (absRes.data) setRawAbsences(absRes.data);
        if (newsRes.data) setRawNews(newsRes.data);
        if (pollsRes.data) setRawPolls(pollsRes.data);
        if (pitchRes.data) setRawPitches(pitchRes.data);
        if (eventRes.data) setRawEvents(eventRes.data);

        if (currentUserId && currentUsername) {
          const { data: memberData } = await supabase
            .from('members')
            .select('*')
            .or(`id.eq.${currentUserId},username.eq.${currentUsername}`)
            .maybeSingle();
          if (memberData) setCurrentMemberData(memberData);
        } else if (currentUserId) {
          const { data: memberData } = await supabase
            .from('members')
            .select('*')
            .eq('id', currentUserId)
            .maybeSingle();
          if (memberData) setCurrentMemberData(memberData);
        } else if (currentUsername) {
          const { data: memberData } = await supabase
            .from('members')
            .select('*')
            .eq('username', currentUsername)
            .maybeSingle();
          if (memberData) setCurrentMemberData(memberData);
        }
      } catch (err) {
        console.error('Error loading notifications:', err);
      }
    };

    fetchData();

    // Subscribe to channels for live updates
    const channel = supabase
      .channel('notifications_realtime_channel_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kudos' }, (payload: any) => {
        fetchData();
        if (payload?.new && (payload.new.toId === currentUserId || payload.new.toName?.toLowerCase() === currentUsername?.toLowerCase())) {
          sendSystemNotification({
            title: `💖 Kudos primit de la ${payload.new.fromName || 'un coleg'}!`,
            body: `"${payload.new.message || payload.new.badgeType || 'Apreciere deosebită'}"`,
            url: '/#kudos',
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absence_requests' }, (payload: any) => {
        fetchData();
        if (payload?.new && (payload.new.memberId === currentUserId || payload.new.memberName?.toLowerCase() === currentUsername?.toLowerCase())) {
          if (payload.new.status === 'approved') {
            sendSystemNotification({
              title: '📅 Cerere de Motivare Aprobată! ✅',
              body: 'Absența ta a fost motivată oficial de către Board.',
              url: '/#prezenta',
            });
          } else if (payload.new.status === 'rejected') {
            sendSystemNotification({
              title: '📅 Cerere de Motivare Respinsă ❌',
              body: `Motiv: ${payload.new.reason || 'Verifică detaliile în secțiunea Prezență.'}`,
              url: '/#prezenta',
            });
          }
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'news' }, (payload: any) => {
        fetchData();
        if (payload?.new) {
          sendSystemNotification({
            title: `📢 Știre nouă: ${payload.new.title}`,
            body: payload.new.content ? (payload.new.content.slice(0, 80) + '...') : 'Află noutățile clubului.',
            url: '/#stiri',
          });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'polls' }, (payload: any) => {
        fetchData();
        if (payload?.new) {
          sendSystemNotification({
            title: `📊 Sondaj nou: ${payload.new.question}`,
            body: 'Exprimă-ți opinia pe platforma clubului.',
            url: '/#idei',
          });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_pitches' }, (payload: any) => {
        fetchData();
        if (payload?.new) {
          sendSystemNotification({
            title: `💬 Forum: Propunere nouă!`,
            body: `"${payload.new.title}" de la ${payload.new.submitterName || 'un coleg'}.`,
            url: '/#comunitate',
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'members' }, (payload: any) => {
        if (payload?.new && (payload.new.id === currentUserId || payload.new.username === currentUsername)) {
          setCurrentMemberData(payload.new);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, currentUsername]);

  // Transform raw data into structured notifications
  const notifications: NotificationItem[] = useMemo(() => {
    const list: NotificationItem[] = [];

    // 1. Score adjustments for the current user
    if (currentMemberData?.scoreAdjustments && Array.isArray(currentMemberData.scoreAdjustments)) {
      currentMemberData.scoreAdjustments.forEach((adj: any) => {
        const isPos = (adj.points || 0) > 0;
        list.push({
          id: `score_${adj.id || adj.date}`,
          type: 'score',
          title: isPos ? `🏆 Ai primit +${adj.points} puncte!` : `⚠️ Ajustare punctaj: ${adj.points} puncte`,
          description: `Acțiune: "${adj.reason || 'Ajustare scor'}" (acordat de ${adj.adminName || 'Board'})`,
          timestamp: adj.date,
          targetSection: 'clasament',
        });
      });
    }

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
            title: 'Cerere de motivare Respinsă ❌',
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
        description: n.content ? (n.content.slice(0, 75) + '...') : 'Află noutățile clubului.',
        timestamp: n.createdAt,
        targetSection: 'stiri',
      });
    });

    // 4. Forum Project Pitches
    rawPitches.forEach(p => {
      list.push({
        id: `pitch_${p.id}`,
        type: 'forum',
        title: `Propunere Forum: ${p.title}`,
        description: `Propusă de ${p.submitterName || 'un coleg'}. Intră să votezi și să comentezi.`,
        timestamp: p.createdAt,
        targetSection: 'comunitate',
      });
    });

    // 5. Active Polls
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

    // 6. Upcoming Events
    rawEvents.forEach(e => {
      list.push({
        id: `event_${e.id}`,
        type: 'event',
        title: `Eveniment: ${e.title}`,
        description: `${e.date || ''} la ${e.time || '18:00'} - ${e.location || 'Sediul Clubului'}`,
        timestamp: e.createdAt || e.date,
        targetSection: 'calendar',
      });
    });

    // 7. Kudos received
    rawKudos.forEach(k => {
      const toId = k.toId || k.recipientId;
      const toName = (k.toName || k.recipientName || '').toLowerCase();
      const fromName = k.fromName || k.senderName || 'un coleg';
      const isTarget = currentUserId && (toId === currentUserId || toName === (currentUsername || '').toLowerCase());
      if (isTarget) {
        list.push({
          id: `kudos_${k.id}`,
          type: 'kudos',
          title: `Kudos primit de la ${fromName}!`,
          description: `"${k.message || k.badgeType || 'Apreciere deosebită'}"`,
          timestamp: k.createdAt,
          targetSection: 'kudos',
        });
      }
    });

    // Sort descending by timestamp
    return list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [rawKudos, rawAbsences, rawNews, rawPolls, rawPitches, rawEvents, currentMemberData, currentUserId, currentUsername]);

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    localStorage.setItem('read_notifications_v2', JSON.stringify(allIds));
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!readIds.includes(item.id)) {
      const updated = [...readIds, item.id];
      setReadIds(updated);
      localStorage.setItem('read_notifications_v2', JSON.stringify(updated));
    }
    setIsOpen(false);
    onNavigateToSection(item.targetSection);
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'score':
        return <Trophy size={16} className="text-amber-500" />;
      case 'kudos':
        return <Heart size={16} className="text-rose-500 fill-rose-500/20" />;
      case 'excuse_approved':
        return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'excuse_rejected':
        return <XCircle size={16} className="text-rose-500" />;
      case 'news':
        return <Megaphone size={16} className="text-blue-500" />;
      case 'poll':
        return <PieChart size={16} className="text-purple-500" />;
      case 'forum':
        return <Sparkles size={16} className="text-indigo-500" />;
      case 'event':
        return <Calendar size={16} className="text-teal-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="relative p-2.5 rounded-[2px] border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-all shrink-0 cursor-pointer shadow-xs"
        title="Notificări"
        aria-label="Deschide panoul de notificări"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-[2px] bg-rose-500 text-white text-[9px] font-black flex items-center justify-center font-data shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel & Click-Outside Dismiss Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop that intercepts clicks/taps on mobile and desktop,
                dismissing the dropdown FIRST without activating whatever was clicked underneath */}
            <div
              className="fixed inset-0 z-[140] bg-black/25 sm:bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsOpen(false);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              aria-hidden="true"
            />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 top-16 sm:top-[calc(100%+0.5rem)] max-w-sm sm:w-96 rounded-[2px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-[150] flex flex-col font-anthropic text-slate-800 dark:text-white"
            >
            {/* Header */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100/90 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-[2px] bg-blue-500 shadow-xs" />
                <h3 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-white font-title">Centru Notificări</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-[2px] bg-blue-600 text-white shadow-xs font-data">
                    {unreadCount} noi
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors font-title cursor-pointer uppercase tracking-wider"
                >
                  <CheckCheck size={14} />
                  Marchează citite
                </button>
              )}
            </div>

            {/* Push Notifications Opt-in Toggle Banner */}
            <div className="p-2.5 bg-slate-100/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
              <PushNotificationToggle memberId={currentUserId || currentUsername || 'member'} />
            </div>

            {/* Notification Items List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 font-anthropic">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs sm:text-sm font-semibold">
                  Nu ai notificări noi momentan.
                </div>
              ) : (
                notifications.map(item => {
                  const isUnread = !readIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-white/5 ${
                        isUnread ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-[2px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                        {getIcon(item.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className={`text-xs sm:text-sm font-bold truncate font-title ${isUnread ? 'text-blue-900 dark:text-blue-200' : 'text-slate-900 dark:text-white'}`}>
                            {item.title}
                          </h4>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-[2px] bg-blue-600 shrink-0" />
                          )}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 font-anthropic line-clamp-2 mt-0.5">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between mt-1.5 pt-1 text-xs text-slate-400">
                          <span className="font-data">
                            {item.timestamp ? formatRomaniaDateTime(item.timestamp, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                          </span>
                          <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5 font-title">
                            Vezi <ChevronRight size={12} />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </div>
  );
};
