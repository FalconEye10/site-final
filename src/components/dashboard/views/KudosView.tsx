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
      const matchesSearch = 
        k.toName.toLowerCase().includes(searchMember.toLowerCase()) || 
        k.fromName.toLowerCase().includes(searchMember.toLowerCase()) ||
        k.message.toLowerCase().includes(searchMember.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === 'received') {
        return k.toId === currentUserId || k.toName.toLowerCase() === currentUsername.toLowerCase();
      }
      if (activeFilter === 'sent') {
        return k.fromId === currentUserId || k.fromName.toLowerCase() === currentUsername.toLowerCase();
      }
      return true;
    });
  }, [kudosList, activeFilter, searchMember, currentUserId, currentUsername]);

  const stats = useMemo(() => {
    const total = kudosList.length;
    const receivedCount = kudosList.filter(k => k.toId === currentUserId || k.toName.toLowerCase() === currentUsername.toLowerCase()).length;
    const sentCount = kudosList.filter(k => k.fromId === currentUserId || k.fromName.toLowerCase() === currentUsername.toLowerCase()).length;
    return { total, receivedCount, sentCount };
  }, [kudosList, currentUserId, currentUsername]);

  return (
    <div className="space-y-8 font-anthropic">
      {/* Header & Hero */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <Heart size={22} className="fill-rose-500 text-rose-500" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Kudos & Recunoaștere</h1>
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 font-['Manrope']">
            Trimite aprecieri și mulțumește colegilor pentru implicarea și energia lor în club!
          </p>
        </div>

        <button
          onClick={() => setShowSendModal(true)}
          className="ios26-btn px-6 py-3 text-sm md:text-[15px] font-bold flex items-center justify-center gap-2 shadow-lg shrink-0"
        >
          <Sparkles size={16} /> TRIMITE UN KUDOS
        </button>
      </div>

      {/* Top Stat Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm border-t-4 border-t-blue-600">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Toate Aprecierile</span>
          <div className="text-4xl font-extrabold text-slate-900 dark:text-white mt-1">{stats.total}</div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Kudos trimise în comunitate</div>
        </div>

        <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm border-t-4 border-t-rose-500">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Aprecieri Primite</span>
          <div className="text-4xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{stats.receivedCount}</div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Kudos primite de tine</div>
        </div>

        <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm border-t-4 border-t-emerald-600">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Aprecieri Trimise</span>
          <div className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{stats.sentCount}</div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Mulțumiri oferite colegilor</div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-lg flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
              activeFilter === 'all' 
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Toate ({stats.total})
          </button>
          <button
            onClick={() => setActiveFilter('received')}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
              activeFilter === 'received' 
                ? 'bg-rose-600 text-white shadow-md' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Primite de mine ({stats.receivedCount})
          </button>
          <button
            onClick={() => setActiveFilter('sent')}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
              activeFilter === 'sent' 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Trimise de mine ({stats.sentCount})
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Caută după membru sau mesaj..."
            value={searchMember}
            onChange={e => setSearchMember(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:bg-white dark:focus:bg-slate-900 dark:text-white transition-all font-['Manrope']"
          />
        </div>
      </div>

      {/* Feed List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-bold">Se încarcă aprecierile...</div>
      ) : filteredKudos.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-lg">
          <Award className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Nu a fost găsită nicio apreciere</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-['Manrope']">Fii primul care trimite un Kudos unui coleg din club!</p>
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
                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Category & Date */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-black border ${cat.color} dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700`}>
                      {cat.label}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{dateStr}</span>
                  </div>

                  {/* Message */}
                  <p className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-relaxed font-['Manrope'] mb-6 italic">
                    "{item.message}"
                  </p>
                </div>

                {/* Sender & Recipient bar */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 dark:text-slate-500 font-normal">De la:</span>
                    <span className="text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{item.fromName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 dark:text-slate-500 font-normal">Pentru:</span>
                    <span className="text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 px-2.5 py-0.5 rounded-md font-extrabold">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-850 space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Trimite un Kudos</h3>
              </div>
              <button
                onClick={() => setShowSendModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendKudos} className="space-y-4">
              {/* Select Recipient */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Alege Colegul
                </label>
                <select
                  value={selectedRecipientId}
                  onChange={e => setSelectedRecipientId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                >
                  <option value="" className="dark:bg-slate-900">-- Selectează membru --</option>
                  {members
                    .filter(m => m.id !== currentUserId)
                    .map(m => (
                      <option key={m.id} value={m.id} className="dark:bg-slate-900">
                        {m.name} ({m.role === 'admin' ? m.boardPosition || 'Board' : 'Voluntar'})
                      </option>
                    ))}
                </select>
              </div>

              {/* Select Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Categorie Apreciere
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {KUDOS_CATEGORIES.map(cat => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold text-left border transition-all ${
                        selectedCategory === cat.id
                          ? 'border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                          : 'border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Mesajul Tău de Mulțumire
                </label>
                <textarea
                  rows={3}
                  value={kudosMessage}
                  onChange={e => setKudosMessage(e.target.value)}
                  placeholder="Ex: Îți mulțumesc mult pentru suportul logistic și atitudinea pozitivă de la târg!"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 font-['Manrope']"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 ios26-btn py-2.5 text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Send size={15} /> {sending ? 'Se trimite...' : 'Trimite Kudos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
