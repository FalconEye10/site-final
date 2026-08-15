import React, { useState, useEffect, lazy, Suspense } from 'react';
import { PieChart, CreditCard, FileText, ShieldAlert, Sparkles } from 'lucide-react';

const BudgetView = lazy(() => import('../views/BudgetView').then(m => ({ default: m.BudgetView })));
const MasterAuditView = lazy(() => import('../views/MasterAuditView').then(m => ({ default: m.MasterAuditView })));

interface AdminFinanceHubProps {
  initialSubtab?: string;
  isAdmin: boolean;
  isTrezorierMaster?: boolean;
  currentUserObj: any;
  members: any[];
  onUpdateMember: (m: any) => void;
  ViewPaymentsComponent: React.ComponentType<any>;
  ViewReportsComponent: React.ComponentType<any>;
}

export const AdminFinanceHub: React.FC<AdminFinanceHubProps> = ({
  initialSubtab = 'buget',
  isAdmin,
  isTrezorierMaster = false,
  currentUserObj,
  members,
  onUpdateMember,
  ViewPaymentsComponent,
  ViewReportsComponent,
}) => {
  const [subtab, setSubtab] = useState<string>(initialSubtab);

  useEffect(() => {
    if (initialSubtab) {
      setSubtab(initialSubtab);
    }
  }, [initialSubtab]);

  const tabs = [
    { id: 'buget', label: 'Buget General', icon: PieChart },
    { id: 'istoric', label: 'Încasări Cotizații', icon: CreditCard },
    { id: 'rapoarte', label: 'Rapoarte Fiscale', icon: FileText },
    ...(isTrezorierMaster ? [{ id: 'audit', label: 'Audit Master', icon: ShieldAlert }] : []),
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
          <Sparkles size={14} className="text-emerald-500" />
          <span>Hub Trezorerie: Finanțe & Rapoarte</span>
        </div>
      </div>

      {/* Sub-view Content */}
      <Suspense fallback={<div className="h-48 rounded-[2px] bg-slate-100 dark:bg-slate-900 animate-pulse" />}>
        {subtab === 'buget' && (
          <BudgetView
            isAdmin={isAdmin}
            currentUserObj={currentUserObj}
            members={members}
          />
        )}
        {subtab === 'istoric' && (
          <ViewPaymentsComponent
            members={members}
            onUpdateMember={onUpdateMember}
            isAdmin={isAdmin}
          />
        )}
        {subtab === 'rapoarte' && (
          <ViewReportsComponent
            members={members}
          />
        )}
        {subtab === 'audit' && isTrezorierMaster && (
          <MasterAuditView
            currentUserObj={currentUserObj}
            isAdmin={isAdmin}
            members={members}
          />
        )}
      </Suspense>
    </div>
  );
};
