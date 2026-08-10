import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { MessageSquarePlus, ShieldCheck, Send, EyeOff, Sparkles, Filter } from 'lucide-react';
import { toast } from '../../ui/Toast';

interface SuggestionItem {
  id: string;
  topic: string;
  message: string;
  isAnonymous: boolean;
  authorId?: string;
  authorName?: string;
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
  '💡 Idee de Proiect / Acțiune',
  '🏛️ Propunere pentru Ședința de Board',
  '🤝 Îmbunătățire Atmosferă & Coeziune',
  '⚙️ Logistică & Organizare',
  '💬 Altele / Feedback Liber'
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
      const newSuggestion = {
        id: `SUGG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        topic,
        message: message.trim(),
        isAnonymous,
        authorId: isAnonymous ? null : (currentUserId || sender?.id || null),
        authorName: isAnonymous ? 'Anonim' : (sender?.name || currentUsername),
        status: 'nou',
        createdAt: new Date().toISOString()
      };

      const { error } = await supabase.from('suggestions').insert([newSuggestion]);
      if (error) throw error;

      toast.success(isAnonymous ? 'Sugestia anonimă a fost trimisă cu succes!' : 'Sugestia a fost trimisă!');
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
    <div className="space-y-8 font-anthropic">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <MessageSquarePlus size={22} />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Casetă Anonimă de Sugestii</h1>
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 font-['Manrope']">
            Spațiul tău sigur de feedback și propuneri pentru conducerea clubului și ședințele generale.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span>Confidențialitate Garantată</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Form Column */}
        <div className="lg:col-span-1 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <Sparkles className="text-purple-600 dark:text-purple-400" size={18} />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white font-title">Trimite o Propunere</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Subiect / Categorie
              </label>
              <select
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              >
                {TOPIC_TYPES.map((t, idx) => (
                  <option key={idx} value={t} className="dark:bg-slate-900">{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Mesajul Tău
              </label>
              <textarea
                rows={5}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Descrie ideea sau întrebarea pe care dorești să o adresezi board-ului..."
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 font-['Manrope']"
              />
            </div>

            {/* Anonymous Toggle */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff size={16} className={isAnonymous ? "text-purple-600 dark:text-purple-450" : "text-slate-400"} />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isAnonymous ? "Trimitere Anonimă" : "Trimitere cu Numele Meu"}
                </span>
              </div>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full ios26-btn py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-md"
            >
              <Send size={15} /> {submitting ? 'Se trimite...' : 'Trimite Propunerea'}
            </button>
          </form>
        </div>

        {/* Suggestions List Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status Tabs */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-md flex flex-wrap gap-2 items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-slate-400 dark:text-slate-500 ml-2" />
              {(['all', 'nou', 'discutat', 'implementat'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                    activeFilter === tab
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab === 'all' ? 'Toate' : tab}
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-450 mr-2 font-title">
              {filteredSuggestions.length} {filteredSuggestions.length === 1 ? 'sugestie' : 'sugestii'}
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-450 font-bold">Se încarcă sugestiile...</div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-lg">
              <MessageSquarePlus className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Nicio sugestie în această categorie</h3>
              <p className="text-sm text-slate-500 dark:text-slate-455 mt-1 font-['Manrope']">Ai o idee? Trimite-o folosind formularul din stânga!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSuggestions.map(item => {
                const dateStr = new Date(item.createdAt).toLocaleDateString('ro-RO', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-md hover:shadow-lg transition-shadow duration-200 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 px-3 py-1 rounded-full">
                          {item.topic}
                        </span>
                        <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-2">
                          Postat la: {dateStr} • {item.isAnonymous ? '👤 Membru Anonim' : `👤 ${item.authorName}`}
                        </div>
                      </div>

                      {/* Status badge */}
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                        item.status === 'implementat'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : item.status === 'discutat'
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'bg-amber-50 text-amber-700 border-amber-300'
                      } dark:bg-slate-800 dark:text-slate-250 dark:border-slate-700`}>
                        {item.status === 'implementat' ? '✓ Implementat' : item.status === 'discutat' ? '💬 Discutat' : '⏳ În așteptare'}
                      </span>
                    </div>

                    <p className="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-200 leading-relaxed font-['Manrope']">
                      {item.message}
                    </p>

                    {/* Admin Status Controls */}
                    {isAdmin && (
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actualizează Stare:</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'nou')}
                            className={`px-2.5 py-1 rounded-lg border font-bold ${
                              item.status === 'nou' 
                                ? 'bg-amber-100 dark:bg-amber-950/40 border-amber-400 text-amber-900 dark:text-amber-300' 
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350'
                            }`}
                          >
                            Nou
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'discutat')}
                            className={`px-2.5 py-1 rounded-lg border font-bold ${
                              item.status === 'discutat' 
                                ? 'bg-blue-100 dark:bg-blue-950/40 border-blue-400 text-blue-900 dark:text-blue-300' 
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350'
                            }`}
                          >
                            Discutat
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'implementat')}
                            className={`px-2.5 py-1 rounded-lg border font-bold ${
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
