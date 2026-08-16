import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { FileText, Clock, CheckCircle2, XCircle, ExternalLink, Users, HandMetal, Sparkles, Trash2, Check, X, Plus } from 'lucide-react';
import { ProjectProposalForm } from './ProjectProposalForm';
import { toast } from '../../ui/Toast';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonCard, Skeleton } from '../../ui/Skeleton';
import { formatRomaniaDate } from '../../../utils/romaniaTime';

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

  const handleUpdateStatus = async (proposalId: string, newStatus: 'pending' | 'approved' | 'rejected') => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from('project_proposals')
        .update({ status: newStatus })
        .eq('id', proposalId);
      if (error) throw error;
      toast.success(`Statusul propunerii a fost actualizat: ${newStatus === 'approved' ? 'Aprobat' : newStatus === 'rejected' ? 'Respins' : 'În Analiză'}`);
      setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: newStatus } : p));
    } catch (err: any) {
      console.error('Error updating proposal status:', err);
      toast.error('Eroare la actualizarea statusului propunerii.');
    }
  };

  const handleDeleteProposal = async (proposalId: string) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from('project_proposals')
        .delete()
        .eq('id', proposalId);
      if (error) throw error;
      toast.success('Propunerea de proiect a fost ștearsă.');
      setProposals(prev => prev.filter(p => p.id !== proposalId));
    } catch (err: any) {
      console.error('Error deleting proposal:', err);
      toast.error('Eroare la ștergerea propunerii.');
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-title uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" /> Aprobat
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold font-title uppercase tracking-wider">
            <XCircle className="w-3.5 h-3.5" /> Respins
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold font-title uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" /> În Analiză
          </span>
        );
    }
  };

  const getCommitteeBadgeColor = (comm?: string | null) => {
    if (!comm) return 'bg-slate-100 text-slate-700 border-slate-200';
    switch (comm) {
      case 'Dezvoltare Profesională': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Serviciu Comunitar': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Relații Internaționale': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Finanțe & Fundraising': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Public Relations': return 'bg-pink-50 text-pink-700 border-pink-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="p-3 md:p-6 space-y-6 max-w-7xl mx-auto font-anthropic">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <SkeletonCard count={3} />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-6 max-w-7xl mx-auto font-anthropic">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-anthropicSerif text-slate-900 dark:text-white tracking-tight">
            Proiecte & Inițiative
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-anthropic mt-1">
            Propune proiecte noi, consultă inițiativele în curs și exprimă-ți interesul de implicare.
          </p>
        </div>

        {/* Action button / Toggle for Members */}
        <div className="flex items-center gap-2">
          {!isAdmin && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-[2px] border border-slate-200 dark:border-slate-700 font-title">
              <button
                onClick={() => setMemberViewTab('proiecte')}
                className={`px-4 py-2 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all font-title cursor-pointer ${
                  memberViewTab === 'proiecte'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Vezi Proiecte ({proposals.length})
              </button>
              <button
                onClick={() => setMemberViewTab('formular')}
                className={`px-4 py-2 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 font-title cursor-pointer ${
                  memberViewTab === 'formular'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Sparkles size={14} className="text-amber-500" />
                <span>Propune Proiect</span>
              </button>
            </div>
          )}

          {isAdmin && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-[2px] border border-slate-200 dark:border-slate-700 font-title">
              <button
                onClick={() => setActiveCategory('toate')}
                className={`px-3.5 py-2 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all font-title cursor-pointer ${
                  activeCategory === 'toate' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                Toate ({proposals.length})
              </button>
              <button
                onClick={() => setActiveCategory('semnate')}
                className={`px-3.5 py-2 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all font-title cursor-pointer ${
                  activeCategory === 'semnate' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                Semnate ({signedProposals.length})
              </button>
              <button
                onClick={() => setActiveCategory('anonime')}
                className={`px-3.5 py-2 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all font-title cursor-pointer ${
                  activeCategory === 'anonime' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
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
          <EmptyState
            icon={FileText}
            title="Nu există propuneri în această categorie"
            description="Fii tu primul care propune o inițiativă nouă sau un proiect pentru comunitate!"
            actionLabel={!isAdmin ? "Propune Proiect Nou" : undefined}
            onAction={!isAdmin ? () => setMemberViewTab('formular') : undefined}
            actionIcon={Plus}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleProposals.map(proposal => {
              const isInterested = (proposal.interestedVolunteers || []).some(v => v.id === currentUserId);
              const volunteersCount = (proposal.interestedVolunteers || []).length;

              return (
                <div
                  key={proposal.id}
                  className="bg-white dark:bg-slate-900 rounded-[2px] shadow-xs border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col hover:border-slate-300 dark:hover:border-slate-700 transition-all relative overflow-hidden font-anthropic group"
                >
                  {/* Top Bar: Icon + Status + Admin Delete */}
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/40 rounded-[2px] flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(proposal.status)}
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteProposal(proposal.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-[2px] transition-colors cursor-pointer"
                          title="Șterge propunerea"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Committee Tag */}
                  {proposal.committee && (
                    <div className="mb-2">
                      <span className={`inline-block px-2.5 py-0.5 rounded-[2px] text-xs font-bold border font-title ${getCommitteeBadgeColor(proposal.committee)}`}>
                        {proposal.committee}
                      </span>
                    </div>
                  )}

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1 leading-snug font-title">
                    {proposal.title}
                  </h3>

                  <p className={`text-xs sm:text-sm mb-2.5 font-semibold ${proposal.isAnonymous ? 'text-slate-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    {proposal.isAnonymous ? 'Propunere Anonimă' : `Propus de: ${proposal.authorName}`}
                  </p>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-3.5 line-clamp-3 flex-1 font-anthropic leading-relaxed">
                    {proposal.description}
                  </p>

                  {proposal.budget && (
                    <div className="text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 px-3 py-2 rounded-[2px] border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 mb-3 font-data">
                      💰 Buget estimat: <strong>{proposal.budget}</strong>
                    </div>
                  )}

                  {/* Volunteer Interest Section */}
                  <div className="p-3 rounded-[2px] bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 mb-3 flex items-center justify-between gap-2 font-anthropic">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-semibold font-anthropic">
                      <Users size={16} className="text-indigo-500" />
                      <span>{volunteersCount} {volunteersCount === 1 ? 'voluntar interesat' : 'voluntari interesați'}</span>
                    </div>

                    <button
                      onClick={() => handleToggleInterest(proposal)}
                      className={`px-3 py-1.5 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 font-title cursor-pointer ${
                        isInterested
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                      }`}
                    >
                      <HandMetal size={14} />
                      <span>{isInterested ? 'Disponibil ✓' : 'Mă implic 🙋'}</span>
                    </button>
                  </div>

                  {/* Admin Status Controls */}
                  {isAdmin && proposal.status === 'pending' && (
                    <div className="flex items-center gap-2 mb-3 pt-2 border-t border-slate-100 dark:border-slate-800 font-title">
                      <button
                        onClick={() => handleUpdateStatus(proposal.id, 'approved')}
                        className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-[2px] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Check size={14} /> Aprobă
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(proposal.id, 'rejected')}
                        className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-[2px] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <X size={14} /> Respinge
                      </button>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-anthropic">
                    <span className="font-data">
                      {proposal.createdAt ? formatRomaniaDate(proposal.createdAt, { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                    </span>
                    {proposal.pdfUrl && (
                      <a
                        href={proposal.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline font-title uppercase tracking-wider"
                      >
                        Plan PDF <ExternalLink className="w-3.5 h-3.5" />
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
