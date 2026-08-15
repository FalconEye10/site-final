import React, { useState, useEffect, lazy, Suspense } from 'react';
import { CheckCircle, Calendar as CalendarIcon, Sparkles } from 'lucide-react';

const AttendanceView = lazy(() => import('../views/AttendanceView').then(m => ({ default: m.AttendanceView })));
const EventsView = lazy(() => import('../views/EventsView').then(m => ({ default: m.EventsView })));

interface MemberActivityHubProps {
  initialSubtab?: 'prezenta' | 'calendar';
  members: any[];
  onUpdateMember: (m: any) => void;
  isAdmin: boolean;
  currentUserId: string;
  preselectedEventId?: string;
}

export const MemberActivityHub: React.FC<MemberActivityHubProps> = ({
  initialSubtab = 'prezenta',
  members,
  onUpdateMember,
  isAdmin,
  currentUserId,
  preselectedEventId,
}) => {
  const [subtab, setSubtab] = useState<'prezenta' | 'calendar'>(initialSubtab);

  useEffect(() => {
    if (initialSubtab) {
      setSubtab(initialSubtab);
    }
  }, [initialSubtab]);

  const tabs = [
    { id: 'prezenta', label: 'Prezență & Motivări', icon: CheckCircle, desc: 'Verifică prezențele și trimite cereri de motivare' },
    { id: 'calendar', label: 'Calendar Evenimente', icon: CalendarIcon, desc: 'Programul ședințelor, proiectelor și RSVP' },
  ];

  return (
    <div className="space-y-6 font-anthropic">
      {/* Hub Header Sub-tab Navigation */}
      <div className="bg-white dark:bg-[#161B22] p-2 sm:p-2.5 rounded-[2px] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/90 rounded-[2px] border border-slate-200/80 dark:border-slate-800 font-title overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = subtab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubtab(tab.id as 'prezenta' | 'calendar')}
                className={`flex items-center gap-2 px-4 py-2 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-bold px-2">
          <Sparkles size={14} className="text-amber-500" />
          <span>Mod Simplu: Activitate & Evenimente</span>
        </div>
      </div>

      {/* Sub-view Content */}
      <Suspense fallback={<div className="h-48 rounded-[2px] bg-slate-100 dark:bg-slate-900 animate-pulse" />}>
        {subtab === 'prezenta' && (
          <AttendanceView
            members={members}
            onUpdateMember={onUpdateMember}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            preselectedEventId={preselectedEventId}
          />
        )}
        {subtab === 'calendar' && (
          <EventsView
            isAdmin={isAdmin}
            members={members}
            currentUserId={currentUserId}
            onUpdateMember={onUpdateMember}
          />
        )}
      </Suspense>
    </div>
  );
};
