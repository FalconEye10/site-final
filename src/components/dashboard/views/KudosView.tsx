import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../supabase';
import { Heart, Send, Sparkles, Search, Award } from 'lucide-react';
import { toast } from '../../ui/Toast';

interface KudosItem {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  category: string;
  message: string;
  createdAt: string;
}

interface KudosViewProps {
  currentUserId: string;
  currentUsername: string;
  members: any[];
}

const KUDOS_CATEGORIES = [
  { id: 'Spirit de Echipă', label: '🤝 Spirit de Echipă', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'Ajutor Logistic', label: '📦 Ajutor Logistic', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'Creativitate', label: '🎨 Creativitate & Idei', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'Energie Pozitivă', label: '⚡ Energie Pozitivă', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'Leadership', label: '👑 Leadership & Implicare', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export const KudosView: React.FC<KudosViewProps> = ({ currentUserId, currentUsername, members }) => {
  const [kudosList, setKudosList] = useState<KudosItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'received' | 'sent'>('all');
  const [searchMember, setSearchMember] = useState('');

  // Modal Send Kudos
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(KUDOS_CATEGORIES[0].id);
  const [kudosMessage, setKudosMessage] = useState('');
  const [sending, setSending] = useState(false);

  const fetchKudos = async () => {
    try {
      const { data, error } = await supabase
        .from('kudos')
        .select('*')
        .order('createdAt', { ascending: false });
      if (error) throw error;
      setKudosList(data || []);
    } catch (err) {
      console.error('Error fetching kudos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKudos();

    const channel = supabase
      .channel('kudos_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kudos' }, () => {
        fetchKudos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSendKudos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipientId || !kudosMessage.trim()) {
      toast.error('Completează destinatarul și mesajul.');
      return;
    }

    const recipient = members.find(m => m.id === selectedRecipientId);
    if (!recipient) return;

    setSending(true);
    try {
      const sender = members.find(m => m.id === currentUserId || m.username === currentUsername);
      const newKudos = {
        id: `KUDOS-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        fromId: currentUserId || sender?.id || 'M-UNKNOWN',
        fromName: sender?.name || currentUsername,
        toId: recipient.id,
        toName: recipient.name,
        category: selectedCategory,
        message: kudosMessage.trim(),
        createdAt: new Date().toISOString()
      };

      const { error } = await supabase.from('kudos').insert([newKudos]);
      if (error) throw error;

      toast.success(`I-ai trimis o apreciere lui ${recipient.name}! 👏`);
      setShowSendModal(false);
      setSelectedRecipientId('');
      setKudosMessage('');
    } catch (err: any) {
      toast.error('Eroare la trimiterea aprecierii: ' + (err.message || 'Necunoscută'));
    } finally {
      setSending(false);
    }
  };

  const filteredKudos = useMemo(() => {
    return kudosList.filter(k => {
      const toName = (k.toName || '').toLowerCase();
      const fromName = (k.fromName || '').toLowerCase();
      const message = (k.message || '').toLowerCase();
      const search = (searchMember || '').toLowerCase();

      const matchesSearch = 
        toName.includes(search) || 
        fromName.includes(search) ||
        message.includes(search);

      if (!matchesSearch) return false;

      if (activeFilter === 'received') {
        return k.toId === currentUserId || toName === (currentUsername || '').toLowerCase();
      }
      if (activeFilter === 'sent') {
        return k.fromId === currentUserId || fromName === (currentUsername || '').toLowerCase();
      }
      return true;
    });
  }, [kudosList, activeFilter, searchMember, currentUserId, currentUsername]);

  const stats = useMemo(() => {
    const total = kudosList.length;
    const receivedCount = kudosList.filter(k => k.toId === currentUserId || (k.toName || '').toLowerCase() === (currentUsername || '').toLowerCase()).length;
    const sentCount = kudosList.filter(k => k.fromId === currentUserId || (k.fromName || '').toLowerCase() === (currentUsername || '').toLowerCase()).length;
    return { total, receivedCount, sentCount };
  }, [kudosList, currentUserId, currentUsername]);

  return (
    <div className="space-y-6 font-anthropic">
      {/* Header & Hero */}
      <div className="rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-10 h-10 rounded-[2px] bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <Heart size={22} className="fill-rose-500 text-rose-500" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-anthropicSerif text-slate-900 dark:text-white tracking-tight">Kudos & Recunoaștere</h1>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 font-anthropic mt-1">
            Trimite aprecieri și mulțumește colegilor pentru implicarea și energia lor în club!
          </p>
        </div>

        <button
          onClick={() => setShowSendModal(true)}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2px] text-xs sm:text-sm font-bold font-title uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs shrink-0 cursor-pointer"
        >
          <Sparkles size={16} /> TRIMITE UN KUDOS
        </button>
      </div>

      {/* Top Stat Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs border-t-2 border-t-blue-600">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title">Toate Aprecierile</span>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1 font-data">{stats.total}</div>
          <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Kudos trimise în comunitate</div>
        </div>

        <div className="rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs border-t-2 border-t-rose-500">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title">Aprecieri Primite</span>
          <div className="text-3xl sm:text-4xl font-black text-rose-600 dark:text-rose-400 mt-1 font-data">{stats.receivedCount}</div>
          <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Kudos primite de tine</div>
        </div>

        <div className="rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs border-t-2 border-t-emerald-600">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title">Aprecieri Trimise</span>
          <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-data">{stats.sentCount}</div>
          <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Mulțumiri oferite colegilor</div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-center font-anthropic">
        <div className="flex flex-wrap gap-2 w-full md:w-auto font-title">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeFilter === 'all' 
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Toate ({stats.total})
          </button>
          <button
            onClick={() => setActiveFilter('received')}
            className={`px-4 py-2 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeFilter === 'received' 
                ? 'bg-rose-600 text-white shadow-xs' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Primite de mine ({stats.receivedCount})
          </button>
          <button
            onClick={() => setActiveFilter('sent')}
            className={`px-4 py-2 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeFilter === 'sent' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Trimise de mine ({stats.sentCount})
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Caută după membru sau mesaj..."
            value={searchMember}
            onChange={e => setSearchMember(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2px] text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 dark:text-white transition-all font-anthropic"
          />
        </div>
      </div>

      {/* Feed List */}
      {loading ? (
        <div className="p-10 text-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-bold">Se încarcă aprecierile...</div>
      ) : filteredKudos.length === 0 ? (
        <div className="rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center shadow-xs">
          <Award className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
          <h3 className="text-base sm:text-lg font-bold font-title text-slate-800 dark:text-white">Nu a fost găsită nicio apreciere</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-anthropic">Fii primul care trimite un Kudos unui coleg din club!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredKudos.map(item => {
            const cat = KUDOS_CATEGORIES.find(c => c.id === item.category) || KUDOS_CATEGORIES[0];
            const dateStr = new Date(item.createdAt).toLocaleDateString('ro-RO', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });

            return (
              <div
                key={item.id}
                className="rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Category & Date */}
                  <div className="flex items-center justify-between gap-2 mb-3 font-title">
                    <span className={`px-3 py-1 rounded-[2px] text-xs font-bold border ${cat.color} dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 uppercase tracking-wider`}>
                      {cat.label}
                    </span>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 font-data">{dateStr}</span>
                  </div>

                  {/* Message */}
                  <p className="text-sm sm:text-base font-normal text-slate-800 dark:text-slate-100 leading-relaxed font-anthropic mb-4 italic">
                    "{item.message}"
                  </p>
                </div>

                {/* Sender & Recipient bar */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 font-title">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">De la:</span>
                    <span className="text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-[2px] text-xs sm:text-sm font-bold">{item.fromName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">Pentru:</span>
                    <span className="text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1 rounded-[2px] text-xs sm:text-sm font-bold">
                      {item.toName}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Send Kudos */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-anthropic">
          <div className="bg-white dark:bg-slate-900 rounded-[2px] max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[2px] bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold font-title text-slate-900 dark:text-white">Trimite un Kudos</h3>
              </div>
              <button
                onClick={() => setShowSendModal(false)}
                className="p-1.5 rounded-[2px] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendKudos} className="space-y-4 font-anthropic">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                  Alege Destinatarul
                </label>
                <select
                  value={selectedRecipientId}
                  onChange={e => setSelectedRecipientId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2px] text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">-- Selectează un coleg din club --</option>
                  {members
                    .filter(m => m.id !== currentUserId)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.nickname ? `(${m.nickname})` : ''} — {m.role === 'admin' ? (m.boardPosition || 'Board') : 'Voluntar'}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                  Categorie
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-title">
                  {KUDOS_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`p-2.5 rounded-[2px] border text-left text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                  Mesaj Personalizat
                </label>
                <textarea
                  rows={3}
                  value={kudosMessage}
                  onChange={e => setKudosMessage(e.target.value)}
                  required
                  placeholder="Scrie câteva cuvinte frumoase sau mulțumește-i pentru sprijin..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-anthropic resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 font-title">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 py-2.5 rounded-[2px] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Send size={16} /> {sending ? 'Se trimite...' : 'Trimite Kudos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
