import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Users, Users2, CheckCircle, ShieldCheck } from 'lucide-react';

const MembersView = lazy(() => import('../views/MembersView').then(m => ({ default: m.MembersView })));
const RepartizareView = lazy(() => import('../views/RepartizareView').then(m => ({ default: m.RepartizareView })));
const AttendanceView = lazy(() => import('../views/AttendanceView').then(m => ({ default: m.AttendanceView })));

interface AdminTeamHubProps {
  initialSubtab?: string;
  members: any[];
  onUpdateMember: (m: any) => void;
  onAddMemberClick: () => void;
  isAdmin: boolean;
  currentUserId: string;
  currentUserObj: any;
  preselectedEventId?: string;
  membersViewSeed?: { search?: string; memberId?: string };
}

export const AdminTeamHub: React.FC<AdminTeamHubProps> = ({
  initialSubtab = 'membri',
  members,
  onUpdateMember,
  onAddMemberClick,
  isAdmin,
  currentUserId,
  currentUserObj,
  preselectedEventId,
  membersViewSeed,
}) => {
  const [subtab, setSubtab] = useState<string>(initialSubtab);

  useEffect(() => {
    if (initialSubtab) {
      setSubtab(initialSubtab);
    }
  }, [initialSubtab]);

  const tabs = [
    { id: 'membri', label: 'Gestiune Membri', icon: Users },
    { id: 'repartizare', label: 'Repartizare Comitete', icon: Users2 },
    { id: 'prezenta', label: 'Prezență & Pontaj', icon: CheckCircle },
  ];

  return (
    <div className="space-y-6 font-anthropic">
      {/* Hub Subtab Bar */}
      <div className="bg-white dark:bg-[#161B22] p-2 sm:p-2.5 rounded-[2px] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/90 rounded-[2px] border border-slate-200/80 dark:border-slate-800 font-title overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = subtab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubtab(tab.id)}
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
          <ShieldCheck size={14} className="text-blue-500" />
          <span>Hub Board: Membri & Echipă</span>
        </div>
      </div>

      {/* Sub-view Content */}
      <Suspense fallback={<div className="h-48 rounded-[2px] bg-slate-100 dark:bg-slate-900 animate-pulse" />}>
        {subtab === 'membri' && (
          <MembersView
            members={members}
            onUpdateMember={onUpdateMember}
            onAddMemberClick={onAddMemberClick}
            isAdmin={isAdmin}
            initialSearchTerm={membersViewSeed?.search}
            initialSelectedMemberId={membersViewSeed?.memberId}
            currentUserObj={currentUserObj}
          />
        )}
        {subtab === 'repartizare' && (
          <RepartizareView
            isAdmin={isAdmin}
            members={members}
            currentUserId={currentUserId}
          />
        )}
        {subtab === 'prezenta' && (
          <AttendanceView
            members={members}
            onUpdateMember={onUpdateMember}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            preselectedEventId={preselectedEventId}
          />
        )}
      </Suspense>
    </div>
  );
};
