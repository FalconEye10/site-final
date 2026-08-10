import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { Trash2, CheckCircle2, BarChart3, Plus, ChevronDown, ChevronUp } from 'lucide-react';

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
    } catch (error) {
      console.error("Error voting: ", error);
      alert('A apărut o eroare la înregistrarea votului.');
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = newPollOptionsStr.split(',').map(o => o.trim()).filter(o => o !== '');
    if (!newPollQuestion.trim() || validOptions.length < 2) {
      alert('Te rog introdu o întrebare și cel puțin 2 opțiuni valide separate prin virgulă.');
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

      setNewPollQuestion('');
      setNewPollOptionsStr('');
      setNewPollIsMultipleChoice(false);
      setShowNewPoll(false);
    } catch (error) {
      console.error("Error creating poll: ", error);
      alert('Eroare la crearea sondajului.');
    }
  };

  const handleTogglePollStatus = async (pollId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('polls')
        .update({ isActive: !currentStatus })
        .eq('id', pollId);
      if (error) throw error;
    } catch (error) {
      console.error("Error toggling poll status: ", error);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!window.confirm('Sigur dorești să ștergi acest sondaj?')) return;
    try {
      const { error } = await supabase.from('polls').delete().eq('id', pollId);
      if (error) throw error;
    } catch (error) {
      console.error("Error deleting poll: ", error);
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
          <h1 className="text-2xl font-bold text-slate-800">Sondaje</h1>
          <p className="text-slate-500">Decizii la nivelul clubului, votate de membri</p>
        </div>
        {isAdmin && (
          <div className="flex bg-slate-100 p-1 rounded-full border border-black/5">
            <button
              onClick={() => setActiveActivityModule('sondaje')}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                activeActivityModule === 'sondaje'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Sondaje Active
            </button>
            <button
              onClick={() => setActiveActivityModule('istoric')}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                activeActivityModule === 'istoric'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Istoric Sondaje
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Sondaje Active</h2>
              <p className="text-sm text-slate-500">Decizii și sondaje importante</p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowNewPoll(!showNewPoll)}
              className="flex items-center gap-2 px-4 py-1.5 btn-stitch-secondary text-xs font-bold"
            >
              {showNewPoll ? 'Anulează' : 'Sondaj Nou'}
              {!showNewPoll && <Plus className="w-4 h-4" />}
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {isAdmin && showNewPoll && (
            <form onSubmit={handleCreatePoll} className="space-y-4 p-4 bg-sky-50 rounded-xl border border-sky-100 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Întrebarea sondajului</label>
                <input
                  type="text"
                  value={newPollQuestion}
                  onChange={(e) => setNewPollQuestion(e.target.value)}
                  placeholder="Ex: Ce tematică să alegem pentru..."
                  className="w-full rounded-lg border-slate-200 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Opțiuni (separate prin virgulă)</label>
                <textarea
                  value={newPollOptionsStr}
                  onChange={(e) => setNewPollOptionsStr(e.target.value)}
                  placeholder="Ex: Opțiunea A, Opțiunea B, Opțiunea C"
                  className="w-full rounded-lg border-slate-200 shadow-sm focus:border-sky-500 focus:ring-sky-500 h-24 resize-none"
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="multipleChoice"
                  checked={newPollIsMultipleChoice}
                  onChange={(e) => setNewPollIsMultipleChoice(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="multipleChoice" className="text-sm text-slate-700">Permite selecție multiplă</label>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 btn-stitch-primary text-xs font-bold"
              >
                Lansează Sondajul
              </button>
            </form>
          )}

          {displayedPolls.length === 0 ? (
            <p className="text-center text-slate-500 py-4">Nu există sondaje active.</p>
          ) : (
            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
              {displayedPolls.map(poll => {
                const userVote = poll.votes?.[currentUserId];
                const hasVoted = userVote !== undefined;
                const isExpanded = expandedPolls[poll.id] || false;
                const { totalVoters, totalVotesCast, results } = calculatePollResults(poll);
                const showResults = isAdmin || hasVoted;

                return (
                  <div key={poll.id} className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm relative group">
                    {isAdmin && (
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button
                          onClick={() => handleTogglePollStatus(poll.id, poll.isActive !== false)}
                          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border transition-all opacity-0 group-hover:opacity-100 ${
                            poll.isActive !== false
                              ? 'border-orange-200 text-orange-650 hover:bg-orange-50'
                              : 'border-emerald-250 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {poll.isActive !== false ? 'Închide' : 'Deschide'}
                        </button>
                        <button
                          onClick={() => handleDeletePoll(poll.id)}
                          className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Șterge sondaj"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <h3 className="text-lg font-medium text-slate-800 mb-2 pr-32">
                      {poll.question}
                      {poll.isMultipleChoice && <span className="ml-2 text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-full">Alegere Multiplă</span>}
                    </h3>

                    <div className="space-y-3 mt-4">
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
                                className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-brand-primary/55 hover:bg-brand-primary/5 transition-all flex justify-between items-center group/btn active:scale-[0.99]"
                              >
                                <span className="text-sm font-medium text-slate-700">{option}</span>
                                <div className="w-4 h-4 rounded-full border border-slate-300 group-hover/btn:border-sky-400"></div>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleVotePoll(poll.id, idx)}
                                className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-brand-primary/55 bg-slate-50 hover:bg-brand-primary/5 transition-all relative overflow-hidden group/btn block active:scale-[0.99]"
                              >
                                <div
                                  className={`absolute inset-0 opacity-10 transition-all ${isSelected ? 'bg-sky-500' : 'bg-slate-300 group-hover/btn:bg-sky-200'}`}
                                  style={{ width: `${result.percentage}%` }}
                                />
                                <div className="relative flex justify-between items-center z-10">
                                  <div className="flex items-center gap-2">
                                    {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                                    <span className={`text-sm ${isSelected ? 'font-semibold text-sky-900' : 'font-medium text-slate-700 group-hover/btn:text-sky-800'}`}>
                                      {option} {isSelected && <span className="text-xs text-sky-600 ml-1">(Votul tău)</span>}
                                    </span>
                                  </div>
                                  <span className="text-sm font-medium text-slate-600">
                                    {result.percentage}% ({result.count})
                                  </span>
                                </div>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                      <div className="flex flex-col gap-1">
                        <span>Alegători unici: {totalVoters}</span>
                        {poll.isMultipleChoice && <span>Voturi totale exprimate: {totalVotesCast}</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        {isAdmin && (
                          <button
                            onClick={() => setExpandedPolls(prev => ({ ...prev, [poll.id]: !prev[poll.id] }))}
                            className="flex items-center gap-1 text-sky-600 hover:text-sky-700 font-medium"
                          >
                            {isExpanded ? 'Ascunde Detalii' : 'Vezi Detalii'}
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                        {poll.createdAt && (
                          <span>{poll.createdAt.toDate().toLocaleDateString('ro-RO')}</span>
                        )}
                      </div>
                    </div>

                    {isAdmin && isExpanded && (
                      <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
                        <h4 className="font-semibold text-slate-700 mb-2">Detalii Voturi</h4>
                        {Object.entries(poll.votes || {}).length === 0 ? (
                          <p className="text-slate-500 italic">Nu există voturi exprimate.</p>
                        ) : (
                          <ul className="space-y-1">
                            {Object.entries(poll.votes || {}).map(([voterId, voteVal]) => {
                              let selectedStr = '';
                              if (Array.isArray(voteVal)) {
                                selectedStr = voteVal.map(idx => (poll.options || [])[idx]).join(', ');
                              } else if (typeof voteVal === 'number') {
                                selectedStr = (poll.options || [])[voteVal];
                              }
                              return (
                                <li key={voterId} className="flex justify-between border-b border-slate-200/50 pb-1 last:border-0">
                                  <span className="text-slate-600 truncate max-w-[50%]" title={voterId}>{voterId}</span>
                                  <span className="font-medium text-slate-800 text-right">{selectedStr}</span>
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
