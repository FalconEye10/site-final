import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { Trash2, CheckCircle2, BarChart3, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '../../ui/Toast';
import { formatRomaniaDate } from '../../../utils/romaniaTime';

interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number | number[]>;
  createdAt: any;
  isActive?: boolean;
  isMultipleChoice?: boolean;
}

interface IdeasViewProps {
  isAdmin: boolean;
  currentUserId: string;
  currentUsername: string;
}

export const IdeasView: React.FC<IdeasViewProps> = ({ isAdmin, currentUserId }) => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin tabs
  const [activeActivityModule, setActiveActivityModule] = useState<'sondaje' | 'istoric'>('sondaje');

  // Admin states for new poll
  const [showNewPoll, setShowNewPoll] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptionsStr, setNewPollOptionsStr] = useState('');
  const [newPollIsMultipleChoice, setNewPollIsMultipleChoice] = useState(false);
  const [expandedPolls, setExpandedPolls] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const { data, error } = await supabase
          .from('polls')
          .select('*')
          .order('createdAt', { ascending: false });
        if (error) throw error;
        setPolls(data || []);
      } catch (err) {
        console.error("Error fetching polls:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();

    const channel = supabase
      .channel('polls_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, () => {
        fetchPolls();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleVotePoll = async (pollId: string, optionIndex: number) => {
    if (!currentUserId) return;
    try {
      const poll = polls.find(p => p.id === pollId);
      if (!poll) return;

      const currentVotes = { ...(poll.votes || {}) };
      const currentVote = currentVotes[currentUserId];

      if (poll.isMultipleChoice) {
        let newVotesArray: number[] = [];
        if (Array.isArray(currentVote)) {
          newVotesArray = [...currentVote];
        } else if (typeof currentVote === 'number') {
          newVotesArray = [currentVote];
        }

        if (newVotesArray.includes(optionIndex)) {
          newVotesArray = newVotesArray.filter(v => v !== optionIndex);
        } else {
          newVotesArray.push(optionIndex);
        }

        if (newVotesArray.length === 0) {
          delete currentVotes[currentUserId];
        } else {
          currentVotes[currentUserId] = newVotesArray;
        }
      } else {
        // Single choice
        if (currentVote === optionIndex) {
          delete currentVotes[currentUserId];
        } else {
          currentVotes[currentUserId] = optionIndex;
        }
      }

      const { error } = await supabase
        .from('polls')
        .update({ votes: currentVotes })
        .eq('id', pollId);

      if (error) throw error;
      toast.success('Votul tău a fost înregistrat!');
    } catch (error: any) {
      console.error("Error voting: ", error);
      toast.error('A apărut o eroare la înregistrarea votului.');
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = newPollOptionsStr.split(',').map(o => o.trim()).filter(o => o !== '');
    if (!newPollQuestion.trim() || validOptions.length < 2) {
      toast.error('Te rog introdu o întrebare și cel puțin 2 opțiuni valide separate prin virgulă.');
      return;
    }

    try {
      const pollId = `poll_${Date.now()}`;
      const { error } = await supabase.from('polls').upsert({
        id: pollId,
        question: newPollQuestion,
        options: validOptions,
        votes: {},
        isActive: true,
        isMultipleChoice: newPollIsMultipleChoice,
        createdAt: new Date().toISOString()
      });

      if (error) throw error;

      toast.success('Sondajul a fost creat cu succes!');
      setNewPollQuestion('');
      setNewPollOptionsStr('');
      setNewPollIsMultipleChoice(false);
      setShowNewPoll(false);
    } catch (error: any) {
      console.error("Error creating poll: ", error);
      toast.error('Eroare la crearea sondajului.');
    }
  };

  const handleTogglePollStatus = async (pollId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('polls')
        .update({ isActive: !currentStatus })
        .eq('id', pollId);
      if (error) throw error;
      toast.success(currentStatus ? 'Sondajul a fost închis.' : 'Sondajul a fost reactivat.');
    } catch (error: any) {
      console.error("Error toggling poll status: ", error);
      toast.error('Eroare la modificarea statusului sondajului.');
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    try {
      const { error } = await supabase.from('polls').delete().eq('id', pollId);
      if (error) throw error;
      toast.success('Sondajul a fost șters.');
    } catch (error: any) {
      console.error("Error deleting poll: ", error);
      toast.error('Eroare la ștergerea sondajului.');
    }
  };

  const calculatePollResults = (poll: Poll) => {
    const totalVoters = Object.keys(poll.votes || {}).length;
    let totalVotesCast = 0;

    // Count how many times each option was selected
    const counts = (poll.options || []).map(() => 0);

    Object.values(poll.votes || {}).forEach(v => {
      if (Array.isArray(v)) {
        v.forEach(idx => {
          if (counts[idx] !== undefined) {
            counts[idx]++;
            totalVotesCast++;
          }
        });
      } else if (typeof v === 'number' && counts[v] !== undefined) {
        counts[v]++;
        totalVotesCast++;
      }
    });

    const results = poll.options.map((_, idx) => {
      const count = counts[idx];
      // For multiple choice, percentage usually means % of voters who selected this option
      const percentage = totalVoters === 0 ? 0 : Math.round((count / totalVoters) * 100);
      return { count, percentage };
    });
    return { totalVoters, totalVotesCast, results };
  };

  const displayedPolls = (() => {
    const nonAdminView = polls.filter(p => p.isActive !== false);
    if (!isAdmin) return nonAdminView;

    if (activeActivityModule === 'istoric') {
      return polls.filter(p => p.isActive === false);
    }
    return nonAdminView;
  })();

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Se încarcă datele...</div>;
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-anthropicSerif text-slate-900 dark:text-slate-100">Sondaje & Consultări</h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 font-anthropic">Decizii la nivelul clubului, supuse votului democratic al membrilor</p>
        </div>
        {isAdmin && (
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-[2px] border border-slate-200 dark:border-slate-700 font-title">
            <button
              onClick={() => setActiveActivityModule('sondaje')}
              className={`px-4 py-2 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeActivityModule === 'sondaje'
                  ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Sondaje Active
            </button>
            <button
              onClick={() => setActiveActivityModule('istoric')}
              className={`px-4 py-2 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeActivityModule === 'istoric'
                  ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Istoric Sondaje
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-[#161B22] rounded-[2px] shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden font-anthropic">
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-[2px] border border-slate-200 dark:border-slate-700">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-anthropicSerif text-slate-900 dark:text-slate-100">
                {activeActivityModule === 'sondaje' ? 'Sondaje Active' : 'Arhivă Sondaje Finalizate'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-anthropic">Consultări oficiale înregistrate</p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowNewPoll(!showNewPoll)}
              className="flex items-center gap-2 px-4 py-2 btn-civic-primary text-xs sm:text-sm font-title uppercase tracking-wider cursor-pointer"
            >
              {showNewPoll ? 'Anulează' : 'Sondaj Nou'}
              {!showNewPoll && <Plus className="w-4 h-4" />}
            </button>
          )}
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {isAdmin && showNewPoll && (
            <form onSubmit={handleCreatePoll} className="space-y-4 p-5 sm:p-6 bg-slate-50 dark:bg-slate-900 rounded-[2px] border border-slate-200 dark:border-slate-800 mb-6 font-anthropic">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">Întrebarea sondajului</label>
                <input
                  type="text"
                  value={newPollQuestion}
                  onChange={(e) => setNewPollQuestion(e.target.value)}
                  placeholder="Ex: Ce tematică să alegem pentru gala de Crăciun?"
                  className="w-full px-4 py-2.5 rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">Opțiuni (separate prin virgulă)</label>
                <textarea
                  value={newPollOptionsStr}
                  onChange={(e) => setNewPollOptionsStr(e.target.value)}
                  placeholder="Ex: Opțiunea A, Opțiunea B, Opțiunea C"
                  className="w-full px-4 py-2.5 rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 h-24 resize-none font-anthropic"
                />
              </div>
              <div className="flex items-center gap-2.5 mt-2">
                <input
                  type="checkbox"
                  id="multipleChoice"
                  checked={newPollIsMultipleChoice}
                  onChange={(e) => setNewPollIsMultipleChoice(e.target.checked)}
                  className="rounded-[1px] border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="multipleChoice" className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">Permite selecție multiplă</label>
              </div>
              <button
                type="submit"
                className="w-full py-3 btn-civic-primary text-xs sm:text-sm font-title uppercase tracking-wider cursor-pointer"
              >
                Lansează Sondajul Oficial
              </button>
            </form>
          )}

          {displayedPolls.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm font-anthropic">Nu există sondaje active în această secțiune.</p>
          ) : (
            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
              {displayedPolls.map(poll => {
                const userVote = poll.votes?.[currentUserId];
                const hasVoted = userVote !== undefined;
                const isExpanded = expandedPolls[poll.id] || false;
                const { totalVoters, totalVotesCast, results } = calculatePollResults(poll);
                const showResults = isAdmin || hasVoted;

                return (
                  <div key={poll.id} className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2px] shadow-xs relative group font-anthropic">
                    {isAdmin && (
                      <div className="absolute top-4 right-4 flex gap-2 font-title">
                        <button
                          onClick={() => handleTogglePollStatus(poll.id, poll.isActive !== false)}
                          className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-[2px] border transition-all cursor-pointer ${
                            poll.isActive !== false
                              ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                              : 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          {poll.isActive !== false ? 'Închide' : 'Deschide'}
                        </button>
                        <button
                          onClick={() => handleDeletePoll(poll.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 cursor-pointer"
                          title="Șterge sondaj"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <h3 className="text-lg sm:text-xl font-bold font-anthropicSerif text-slate-900 dark:text-slate-100 mb-2 pr-32 leading-snug">
                      {poll.question}
                      {poll.isMultipleChoice && (
                        <span className="ml-2 text-xs font-bold font-title uppercase px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-[2px] border border-slate-200 dark:border-slate-700">
                          Alegere Multiplă
                        </span>
                      )}
                    </h3>

                    <div className="space-y-2.5 mt-4">
                      {(poll.options || []).map((option, idx) => {
                        const result = results[idx];
                        let isSelected = false;
                        if (Array.isArray(userVote)) {
                          isSelected = userVote.includes(idx);
                        } else if (typeof userVote === 'number') {
                          isSelected = userVote === idx;
                        }

                        return (
                          <div key={idx} className="relative">
                            {!showResults ? (
                              <button
                                onClick={() => handleVotePoll(poll.id, idx)}
                                className="w-full text-left p-4 rounded-[2px] border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-800/60 transition-all flex justify-between items-center group/btn cursor-pointer font-anthropic"
                              >
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{option}</span>
                                <div className="w-4 h-4 rounded-[1px] border border-slate-300 dark:border-slate-600 group-hover/btn:border-slate-900 dark:group-hover/btn:border-slate-100"></div>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleVotePoll(poll.id, idx)}
                                className="w-full text-left p-4 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 transition-all relative overflow-hidden group/btn block cursor-pointer font-anthropic"
                              >
                                <div
                                  className={`absolute inset-0 opacity-15 transition-all ${isSelected ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                  style={{ width: `${result.percentage}%` }}
                                />
                                <div className="relative flex justify-between items-center z-10">
                                  <div className="flex items-center gap-2.5">
                                    {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                                    <span className={`text-sm ${isSelected ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                      {option} {isSelected && <span className="text-xs text-blue-600 dark:text-blue-400 font-title uppercase ml-1.5 font-bold">(Votul tău)</span>}
                                    </span>
                                  </div>
                                  <span className="text-sm font-bold font-data text-slate-900 dark:text-slate-100">
                                    {result.percentage}% ({result.count})
                                  </span>
                                </div>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                      <div className="flex flex-col gap-0.5 font-data">
                        <span>Alegători unici: {totalVoters}</span>
                        {poll.isMultipleChoice && <span>Voturi totale exprimate: {totalVotesCast}</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        {isAdmin && (
                          <button
                            onClick={() => setExpandedPolls(prev => ({ ...prev, [poll.id]: !prev[poll.id] }))}
                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-title font-semibold hover:underline cursor-pointer"
                          >
                            {isExpanded ? 'Ascunde Detalii' : 'Vezi Detalii'}
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {poll.createdAt && (
                          <span className="font-data">{formatRomaniaDate(poll.createdAt.toDate ? poll.createdAt.toDate() : poll.createdAt)}</span>
                        )}
                      </div>
                    </div>

                    {isAdmin && isExpanded && (
                      <div className="mt-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-[2px] border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-anthropic">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 font-title uppercase">Detalii Voturi Exprimate</h4>
                        {Object.entries(poll.votes || {}).length === 0 ? (
                          <p className="text-slate-500 italic">Nu există voturi exprimate.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {Object.entries(poll.votes || {}).map(([voterId, voteVal]) => {
                              let selectedStr = '';
                              if (Array.isArray(voteVal)) {
                                selectedStr = voteVal.map(idx => (poll.options || [])[idx]).join(', ');
                              } else if (typeof voteVal === 'number') {
                                selectedStr = (poll.options || [])[voteVal];
                              }
                              return (
                                <li key={voterId} className="flex justify-between border-b border-slate-200 dark:border-slate-700/60 pb-1.5 last:border-0 font-data">
                                  <span className="text-slate-600 dark:text-slate-400 truncate max-w-[50%]" title={voterId}>{voterId}</span>
                                  <span className="font-medium text-slate-900 dark:text-slate-100 text-right">{selectedStr}</span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
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
