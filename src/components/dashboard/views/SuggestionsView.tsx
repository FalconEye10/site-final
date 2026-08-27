import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { MessageSquarePlus, ShieldCheck, Send, EyeOff, Sparkles, Filter } from 'lucide-react';
import { toast } from '../../ui/Toast';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonList } from '../../ui/Skeleton';
import { formatRomaniaDate } from '../../../utils/romaniaTime';

interface SuggestionItem {
  id: string;
  topic: string;
  message: string;
  isAnonymous: boolean;
  authorId?: string;
  authorName?: string;
  submitterUsername?: string;
  status: 'nou' | 'discutat' | 'implementat';
  createdAt: string;
}

interface SuggestionsViewProps {
  currentUserId: string;
  currentUsername: string;
  isAdmin: boolean;
  members: any[];
}

const TOPIC_TYPES = [
  'Idee de Proiect / Acțiune',
  'Propunere pentru Ședința de Board',
  'Îmbunătățire Atmosferă & Coeziune',
  'Logistică & Organizare',
  'Altele / Feedback Liber'
];

export const SuggestionsView: React.FC<SuggestionsViewProps> = ({
  currentUserId,
  currentUsername,
  isAdmin,
  members
}) => {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [topic, setTopic] = useState(TOPIC_TYPES[0]);
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'nou' | 'discutat' | 'implementat'>('all');

  const fetchSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .order('createdAt', { ascending: false });
      if (error) throw error;
      setSuggestions(data || []);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();

    const channel = supabase
      .channel('suggestions_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suggestions' }, () => {
        fetchSuggestions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Scrie mesajul tău de sugestie.');
      return;
    }

    setSubmitting(true);
    try {
      const sender = members.find(m => m.id === currentUserId || m.username === currentUsername);
      const submitterName = sender?.name || sender?.nickname || currentUsername;
      const submitterUsername = sender?.username || currentUsername;

      const newSuggestion = {
        id: `SUGG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        topic,
        message: message.trim(),
        isAnonymous,
        authorId: currentUserId || sender?.id || null,
        authorName: submitterName,
        submitterUsername: submitterUsername,
        status: 'nou',
        createdAt: new Date().toISOString()
      };

      const { error } = await supabase.from('suggestions').insert([newSuggestion]);
      if (error) throw error;

      if (!isAnonymous) {
        toast.success('🎉 Felicitări! Propunerea ta publică a fost trimisă și ai primit +50% Puncte Bonus Bimensuale!');
      } else {
        toast.success('Sugestia anonimă a fost trimisă cu succes!');
      }

      setMessage('');
    } catch (err: any) {
      toast.error('Eroare la trimiterea sugestiei: ' + (err.message || 'Necunoscută'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'nou' | 'discutat' | 'implementat') => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from('suggestions')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      toast.success(`Status actualizat la "${newStatus}"`);
    } catch (err: any) {
      toast.error('Eroare la actualizarea statusului: ' + err.message);
    }
  };

  const filteredSuggestions = suggestions.filter(s => {
    if (activeFilter === 'all') return true;
    return s.status === activeFilter;
  });

  return (
    <div className="space-y-6 font-anthropic">
      {/* Header */}
      <div className="rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-[2px] bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <MessageSquarePlus size={22} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-anthropicSerif text-slate-900 dark:text-white tracking-tight">Casetă Anonimă & Propuneri de Impact</h1>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 font-anthropic mt-1">
            Spațiul tău de feedback și propuneri pentru conducerea clubului și ședințele generale.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-[2px] text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-title">
          <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span>Confidențialitate Protejată</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form Column */}
        <div className="lg:col-span-1 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Sparkles className="text-purple-600 dark:text-purple-400" size={18} />
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-title">Trimite o Propunere</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 font-title">
                Subiect / Categorie
              </label>
              <select
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 font-anthropic cursor-pointer"
              >
                {TOPIC_TYPES.map((t, idx) => (
                  <option key={idx} value={t} className="dark:bg-slate-900">{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 font-title">
                Mesajul Tău
              </label>
              <textarea
                rows={5}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Descrie ideea sau întrebarea pe care dorești să o adresezi board-ului..."
                required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 font-anthropic resize-none"
              />
            </div>

            {/* Anonymous Toggle & Reward Notice */}
            <div className="space-y-2.5">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2px] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <EyeOff size={16} className={isAnonymous ? "text-purple-600 dark:text-purple-400" : "text-slate-400"} />
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 font-title">
                    {isAnonymous ? "Trimitere Anonimă" : "Trimitere Publică (cu Nume)"}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={e => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded-[2px] text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </div>

              {/* Public Suggestion Notice Banner */}
              <div className={`p-3 rounded-[2px] border text-xs leading-relaxed transition-all font-anthropic ${
                !isAnonymous
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300 font-semibold'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                {!isAnonymous ? (
                  <span>Propunerea este semnată public cu numele tău și este eligibilă pentru punctaj suplimentar.</span>
                ) : (
                  <span>Propunerea este trimisă complet anonim către conducerea clubului.</span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-civic-primary py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs uppercase tracking-wider font-title cursor-pointer"
            >
              <Send size={14} /> {submitting ? 'Se trimite...' : 'Trimite Propunerea'}
            </button>
          </form>
        </div>

        {/* Suggestions List Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status Tabs */}
          <div className="rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3 shadow-xs flex flex-wrap gap-1.5 items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-slate-400 dark:text-slate-500 ml-1" />
              {(['all', 'nou', 'discutat', 'implementat'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`px-2.5 py-1 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all font-title cursor-pointer ${
                    activeFilter === tab
                      ? 'bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab === 'all' ? 'Toate' : tab}
                </button>
              ))}
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mr-2 font-data">
              {filteredSuggestions.length} {filteredSuggestions.length === 1 ? 'sugestie' : 'sugestii'}
            </span>
          </div>

          {loading ? (
            <SkeletonList count={3} />
          ) : filteredSuggestions.length === 0 ? (
            <EmptyState
              icon={MessageSquarePlus}
              title="Nicio sugestie în această categorie"
              description="Ai o idee de îmbunătățire sau o opinie constructivă? Trimite-o anonim sau asumat din panoul alăturat!"
            />
          ) : (
            <div className="space-y-3.5">
              {filteredSuggestions.map(item => {
                const dateStr = formatRomaniaDate(item.createdAt, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <div
                    key={item.id}
                    className="rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-3 font-anthropic"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 px-3 py-1 rounded-[2px] font-title">
                            {item.topic}
                          </span>

                          {/* Admin Submitter Status Badge */}
                          {isAdmin ? (
                            <span className={`text-xs font-black px-2.5 py-0.5 rounded-[2px] border font-title ${
                              item.isAnonymous
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300'
                                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                            }`}>
                              {item.isAnonymous ? '🕵️ Trimis Anonim de utilizator (Audit Admin)' : '🌐 Trimis Public (+50% Bonus)'}
                            </span>
                          ) : item.isAnonymous ? (
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-title">
                              👤 Anonim
                            </span>
                          ) : (
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-[2px] bg-purple-500/15 text-purple-700 dark:text-purple-300 font-title">
                              🌐 Public
                            </span>
                          )}
                        </div>

                        <div className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1 font-anthropic">
                          Postat la: <span className="font-data">{dateStr}</span> • {
                            isAdmin
                              ? `👤 Autor Real: ${item.authorName || 'Necunoscut'} (@${item.submitterUsername || 'user'})`
                              : item.isAnonymous
                              ? '👤 Membru Anonim'
                              : `👤 ${item.authorName}`
                          }
                        </div>
                      </div>

                      {/* Status badge */}
                      <span className={`px-3 py-1 rounded-[2px] text-xs font-black uppercase tracking-wider border font-title ${
                        item.status === 'implementat'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : item.status === 'discutat'
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'bg-amber-50 text-amber-700 border-amber-300'
                      } dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700`}>
                        {item.status === 'implementat' ? '✓ Implementat' : item.status === 'discutat' ? '💬 Discutat' : '⏳ În așteptare'}
                      </span>
                    </div>

                    <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 leading-relaxed font-anthropic">
                      {item.message}
                    </p>

                    {/* Admin Status Controls */}
                    {isAdmin && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-title text-xs">Actualizează Stare:</span>
                        <div className="flex items-center gap-2 font-title">
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'nou')}
                            className={`px-3 py-1 rounded-[2px] border font-bold text-xs uppercase tracking-wider font-title cursor-pointer ${
                              item.status === 'nou' 
                                ? 'bg-amber-100 dark:bg-amber-950/40 border-amber-400 text-amber-900 dark:text-amber-300' 
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350'
                            }`}
                          >
                            Nou
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'discutat')}
                            className={`px-3 py-1 rounded-[2px] border font-bold text-xs uppercase tracking-wider font-title cursor-pointer ${
                              item.status === 'discutat' 
                                ? 'bg-blue-100 dark:bg-blue-950/40 border-blue-400 text-blue-900 dark:text-blue-300' 
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350'
                            }`}
                          >
                            Discutat
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'implementat')}
                            className={`px-3 py-1 rounded-[2px] border font-bold text-xs uppercase tracking-wider font-title cursor-pointer ${
                              item.status === 'implementat' 
                                ? 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-300' 
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350'
                            }`}
                          >
                            Implementat
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
