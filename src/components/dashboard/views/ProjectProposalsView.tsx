import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { FileText, Clock, CheckCircle2, XCircle, ExternalLink, Users, HandMetal, Sparkles } from 'lucide-react';
import { ProjectProposalForm } from './ProjectProposalForm';
import { toast } from '../../ui/Toast';

interface VolunteerInterest {
  id: string;
  name: string;
  date: string;
}

interface ProjectProposal {
  id: string;
  title: string;
  description: string;
  budget?: string | null;
  committee?: string | null;
  pdfUrl?: string;
  isAnonymous?: boolean;
  authorId: string | null;
  authorName: string;
  status: 'pending' | 'approved' | 'rejected';
  interestedVolunteers?: VolunteerInterest[];
  createdAt: any;
}

interface ProjectProposalsViewProps {
  isAdmin: boolean;
  currentUserId: string;
  currentUsername?: string;
}

export const ProjectProposalsView: React.FC<ProjectProposalsViewProps> = ({ isAdmin, currentUserId, currentUsername }) => {
  const [proposals, setProposals] = useState<ProjectProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'toate' | 'semnate' | 'anonime'>('toate');
  const [memberViewTab, setMemberViewTab] = useState<'proiecte' | 'formular'>('proiecte');

  const fetchProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('project_proposals')
        .select('*')
        .order('createdAt', { ascending: false });
      if (error) throw error;
      setProposals(data || []);
    } catch (err) {
      console.error("Error fetching proposals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();

    const channel = supabase
      .channel('project_proposals_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_proposals' }, () => {
        fetchProposals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleToggleInterest = async (proposal: ProjectProposal) => {
    if (!currentUserId) return;
    const currentList: VolunteerInterest[] = proposal.interestedVolunteers || [];
    const isAlreadyInterested = currentList.some(v => v.id === currentUserId);

    let updatedList: VolunteerInterest[];
    if (isAlreadyInterested) {
      updatedList = currentList.filter(v => v.id !== currentUserId);
      toast.info('Ai anulat disponibilitatea pentru acest proiect.');
    } else {
      updatedList = [
        ...currentList,
        {
          id: currentUserId,
          name: currentUsername || 'Voluntar',
          date: new Date().toISOString()
        }
      ];
      toast.success('Disponibilitatea ta a fost transmisă către coordonatori! 🙋');
    }

    // Optimistic UI update
    setProposals(prev => prev.map(p => p.id === proposal.id ? { ...p, interestedVolunteers: updatedList } : p));

    try {
      const { error } = await supabase
        .from('project_proposals')
        .update({ interestedVolunteers: updatedList })
        .eq('id', proposal.id);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating volunteer interest:', err);
      toast.error('A apărut o eroare la salvare.');
      fetchProposals();
    }
  };

  const signedProposals = proposals.filter(p => !p.isAnonymous);
  const anonymousProposals = proposals.filter(p => p.isAnonymous);

  const visibleProposals = activeCategory === 'toate'
    ? proposals
    : activeCategory === 'semnate'
      ? signedProposals
      : anonymousProposals;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Aprobat
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
            <XCircle className="w-3.5 h-3.5" /> Respins
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
            <Clock className="w-3.5 h-3.5" /> În Analiză
          </span>
        );
    }
  };

  const getCommitteeBadgeColor = (comm?: string | null) => {
    if (!comm) return 'bg-slate-100 text-slate-700 border-slate-200';
    if (comm.includes('Imagine') || comm.includes('PR')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (comm.includes('Comunitare') || comm.includes('Proiecte')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (comm.includes('Finanțe') || comm.includes('Fundraising')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (comm.includes('Leadership')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-orange-50 text-orange-700 border-orange-200';
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-semibold">Se încarcă propunerile de proiecte...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto font-['Hanken_Grotesk']">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Proiecte & Inițiative
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-['Manrope']">
            Propune proiecte noi, consultă inițiativele în curs și exprimă-ți interesul de implicare.
          </p>
        </div>

        {/* Action button / Toggle for Members */}
        <div className="flex items-center gap-2">
          {!isAdmin && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setMemberViewTab('proiecte')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  memberViewTab === 'proiecte'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Vezi Proiecte ({proposals.length})
              </button>
              <button
                onClick={() => setMemberViewTab('formular')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  memberViewTab === 'formular'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Sparkles size={13} className="text-amber-500" />
                <span>Propune Proiect</span>
              </button>
            </div>
          )}

          {isAdmin && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveCategory('toate')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeCategory === 'toate' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                Toate ({proposals.length})
              </button>
              <button
                onClick={() => setActiveCategory('semnate')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeCategory === 'semnate' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                Semnate ({signedProposals.length})
              </button>
              <button
                onClick={() => setActiveCategory('anonime')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeCategory === 'anonime' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                Anonime ({anonymousProposals.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Member Form Tab */}
      {!isAdmin && memberViewTab === 'formular' ? (
        <div className="max-w-2xl mx-auto pt-2">
          <ProjectProposalForm
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
            onClose={() => {
              setMemberViewTab('proiecte');
              fetchProposals();
            }}
          />
        </div>
      ) : (
        /* Proposals Grid */
        visibleProposals.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-semibold">
              Nu există propuneri în această categorie momentan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleProposals.map(proposal => {
              const isInterested = (proposal.interestedVolunteers || []).some(v => v.id === currentUserId);
              const volunteersCount = (proposal.interestedVolunteers || []).length;

              return (
                <div
                  key={proposal.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col hover:shadow-md transition-all relative overflow-hidden"
                >
                  {/* Top Bar: Icon + Status */}
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    {getStatusBadge(proposal.status)}
                  </div>

                  {/* Committee Tag */}
                  {proposal.committee && (
                    <div className="mb-2">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getCommitteeBadgeColor(proposal.committee)}`}>
                        {proposal.committee}
                      </span>
                    </div>
                  )}

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5 leading-tight">
                    {proposal.title}
                  </h3>

                  <p className={`text-xs mb-3 font-semibold ${proposal.isAnonymous ? 'text-slate-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    {proposal.isAnonymous ? 'Propunere Anonimă' : `Propus de: ${proposal.authorName}`}
                  </p>

                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-3 flex-1 font-['Manrope']">
                    {proposal.description}
                  </p>

                  {proposal.budget && (
                    <div className="text-xs bg-slate-50 dark:bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 mb-3">
                      💰 Buget estimat: <strong>{proposal.budget}</strong>
                    </div>
                  )}

                  {/* Volunteer Interest Section */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                      <Users size={15} className="text-indigo-500" />
                      <span>{volunteersCount} {volunteersCount === 1 ? 'voluntar interesat' : 'voluntari interesați'}</span>
                    </div>

                    <button
                      onClick={() => handleToggleInterest(proposal)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                        isInterested
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                      }`}
                    >
                      <HandMetal size={13} />
                      <span>{isInterested ? 'Disponibil ✓' : 'Mă implic 🙋'}</span>
                    </button>
                  </div>

                  {/* Footer */}
                  <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                    </span>
                    {proposal.pdfUrl && (
                      <a
                        href={proposal.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Plan PDF <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};
