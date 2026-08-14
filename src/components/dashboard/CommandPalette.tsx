import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, CornerDownLeft, ArrowUp, ArrowDown, User as UserIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CommandNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  category: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: CommandNavItem[];
  members: any[];
  onNavigate: (sectionId: string) => void;
  onSelectMember: (member: any) => void;
}

/**
 * Ctrl/Cmd+K quick-access palette. Lets an admin jump straight to any
 * dashboard section or find a member by name without hunting through the
 * sidebar — the "acces altcumva la funcții" the redesign asked for.
 */
export function CommandPalette({ isOpen, onClose, navItems, members, onNavigate, onSelectMember }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return navItems;
    return navItems.filter(item => item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q));
  }, [query, navItems]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return members.filter(m => m.name?.toLowerCase().includes(q) || m.username?.toLowerCase().includes(q)).slice(0, 5);
  }, [query, members]);

  const flatResults = useMemo(() => [
    ...filteredNav.map(item => ({ type: 'nav' as const, item })),
    ...filteredMembers.map(member => ({ type: 'member' as const, item: member })),
  ], [filteredNav, filteredMembers]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  const commit = (index: number) => {
    const entry = flatResults[index];
    if (!entry) return;
    if (entry.type === 'nav') onNavigate(entry.item.id);
    else onSelectMember(entry.item);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, flatResults.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); commit(activeIndex); }
    else if (e.key === 'Escape') { onClose(); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-start justify-center pt-[12vh] px-4">
          <motion.div
            className="absolute inset-0 bg-slate-950/60 dark:bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-lg overflow-hidden bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-[2px] shadow-2xl flex flex-col font-anthropic"
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900">
              <Search size={19} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Caută o secțiune sau un membru..."
                className="flex-1 bg-transparent outline-none text-sm sm:text-base font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-anthropic"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-black text-slate-600 dark:text-slate-400 font-data">ESC</kbd>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-3 space-y-3 scrollbar-thin">
              {filteredNav.length > 0 && (
                <div className="space-y-1.5">
                  <p className="px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title">Navigare</p>
                  {filteredNav.map((item) => {
                    const flatIndex = flatResults.findIndex(r => r.type === 'nav' && r.item.id === item.id);
                    const Icon = item.icon;
                    const isActive = flatIndex === activeIndex;
                    return (
                      <button
                        key={item.id}
                        onClick={() => commit(flatIndex)}
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[2px] text-left transition-all cursor-pointer font-anthropic ${
                          isActive
                            ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-sky-300 shadow-xs font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 font-semibold'
                        }`}
                      >
                        <Icon size={17} className={isActive ? 'text-white dark:text-sky-300' : 'text-slate-500 dark:text-slate-400'} />
                        <span className="text-xs sm:text-sm font-bold flex-1">{item.label}</span>
                        <span className={`text-[10px] sm:text-xs uppercase font-bold px-2 py-0.5 rounded-[2px] font-title ${
                          isActive ? 'bg-white/20 text-white dark:text-sky-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {item.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredMembers.length > 0 && (
                <div className="space-y-1.5">
                  <p className="px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title">Membri</p>
                  {filteredMembers.map((member) => {
                    const flatIndex = flatResults.findIndex(r => r.type === 'member' && r.item.id === member.id);
                    const isActive = flatIndex === activeIndex;
                    return (
                      <button
                        key={member.id}
                        onClick={() => commit(flatIndex)}
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[2px] text-left transition-all cursor-pointer font-anthropic ${
                          isActive
                            ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-sky-300 shadow-xs font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 font-semibold'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-[2px] flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}>
                          <UserIcon size={15} />
                        </span>
                        <span className="text-xs sm:text-sm font-bold flex-1">{member.name}</span>
                        <span className={`text-[10px] sm:text-xs uppercase font-bold px-2 py-0.5 rounded-[2px] font-title ${
                          isActive ? 'bg-white/20 text-white dark:text-sky-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}>
                          Membru
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {flatResults.length === 0 && (
                <p className="px-3 py-8 text-center text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 font-anthropic">
                  Niciun rezultat pentru "{query}"
                </p>
              )}
            </div>

            <div className="hidden sm:flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 text-xs font-bold text-slate-500 dark:text-slate-400 font-title">
              <span className="flex items-center gap-1.5"><ArrowUp size={13} /><ArrowDown size={13} /> Navighează</span>
              <span className="flex items-center gap-1.5"><CornerDownLeft size={13} /> Deschide</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
