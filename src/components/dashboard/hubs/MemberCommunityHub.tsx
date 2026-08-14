import React, { useState, useEffect } from 'react';
import { Megaphone, PieChart, MessageSquare, Heart, Lightbulb, Sparkles } from 'lucide-react';
import { NewsView } from '../views/NewsView';
import { IdeasView } from '../views/IdeasView';
import { ForumView } from '../views/ForumView';
import { KudosView } from '../views/KudosView';
import { SuggestionsView } from '../views/SuggestionsView';
import { ProjectProposalsView } from '../views/ProjectProposalsView';

interface MemberCommunityHubProps {
  initialSubtab?: string;
  isAdmin: boolean;
  currentUserId: string;
  currentUsername: string;
  members: any[];
}

export const MemberCommunityHub: React.FC<MemberCommunityHubProps> = ({
  initialSubtab = 'stiri',
  isAdmin,
  currentUserId,
  currentUsername,
  members,
}) => {
  const [subtab, setSubtab] = useState<string>(initialSubtab);

  useEffect(() => {
    if (initialSubtab) {
      setSubtab(initialSubtab);
    }
  }, [initialSubtab]);

  const tabs = [
    { id: 'stiri', label: 'Știri & Anunțuri', icon: Megaphone },
    { id: 'idei', label: 'Sondaje & Vot', icon: PieChart },
    { id: 'forum', label: 'Forum & Discuții', icon: MessageSquare },
    { id: 'kudos', label: 'Kudos & Aprecieri', icon: Heart },
    { id: 'sugestii', label: 'Idei & Sugestii', icon: Lightbulb },
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
                className={`flex items-center gap-2 px-3.5 py-2 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
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
          <Sparkles size={14} className="text-indigo-500" />
          <span>Mod Simplu: Social & Comunitate</span>
        </div>
      </div>

      {/* Sub-view Content */}
      <div>
        {subtab === 'stiri' && (
          <NewsView
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
          />
        )}
        {subtab === 'idei' && (
          <IdeasView
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
          />
        )}
        {subtab === 'forum' && (
          <ForumView
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
          />
        )}
        {subtab === 'kudos' && (
          <KudosView
            currentUserId={currentUserId}
            currentUsername={currentUsername}
            members={members}
          />
        )}
        {subtab === 'sugestii' && (
          <div className="space-y-8">
            <ProjectProposalsView
              isAdmin={isAdmin}
              currentUserId={currentUserId}
              currentUsername={currentUsername}
            />
            <SuggestionsView
              currentUserId={currentUserId}
              currentUsername={currentUsername}
              isAdmin={isAdmin}
              members={members}
            />
          </div>
        )}
      </div>
    </div>
  );
};
