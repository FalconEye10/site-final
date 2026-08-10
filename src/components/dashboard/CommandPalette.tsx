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
        <div className="fixed inset-0 z-[130] flex items-start justify-center pt-[14vh] px-4">
          <motion.div
            className="adm-command-overlay absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="adm-command-panel relative w-full max-w-lg overflow-hidden"
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
              <Search size={18} className="text-white/40 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Caută o secțiune sau un membru..."
                className="flex-1 bg-transparent outline-none text-[15px] text-white placeholder:text-white/30"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-white/40">ESC</kbd>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-2">
              {filteredNav.length > 0 && (
                <div className="mb-1">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/30">Navigare</p>
                  {filteredNav.map((item) => {
                    const flatIndex = flatResults.findIndex(r => r.type === 'nav' && r.item.id === item.id);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => commit(flatIndex)}
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        className={`adm-command-item w-full flex items-center gap-3 px-3 py-2.5 text-left ${flatIndex === activeIndex ? 'is-active' : ''}`}
                      >
                        <Icon size={16} className="text-white/60 shrink-0" />
                        <span className="text-sm text-white/85 flex-1">{item.label}</span>
                        <span className="text-[10px] uppercase tracking-wide text-white/25">{item.category}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredMembers.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/30">Membri</p>
                  {filteredMembers.map((member) => {
                    const flatIndex = flatResults.findIndex(r => r.type === 'member' && r.item.id === member.id);
                    return (
                      <button
                        key={member.id}
                        onClick={() => commit(flatIndex)}
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        className={`adm-command-item w-full flex items-center gap-3 px-3 py-2.5 text-left ${flatIndex === activeIndex ? 'is-active' : ''}`}
                      >
                        <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                          <UserIcon size={12} className="text-white/60" />
                        </span>
                        <span className="text-sm text-white/85 flex-1">{member.name}</span>
                        <span className="text-[10px] uppercase tracking-wide text-white/25">Membru</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {flatResults.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-white/30">Niciun rezultat pentru "{query}"</p>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-4 px-5 py-3 border-t border-white/10 text-[10px] text-white/30">
              <span className="flex items-center gap-1"><ArrowUp size={11} /><ArrowDown size={11} /> Navighează</span>
              <span className="flex items-center gap-1"><CornerDownLeft size={11} /> Selectează</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
