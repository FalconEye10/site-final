import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { FileText, Clock, CheckCircle2, XCircle, ExternalLink, EyeOff, UserCheck } from 'lucide-react';
import { ProjectProposalForm } from './ProjectProposalForm';

interface ProjectProposal {
  id: string;
  title: string;
  description: string;
  budget?: string | null;
  pdfUrl?: string;
  isAnonymous?: boolean;
  authorId: string | null;
  authorName: string;
  status: 'pending' | 'approved' | 'rejected';
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
  const [activeCategory, setActiveCategory] = useState<'semnate' | 'anonime'>('semnate');

  useEffect(() => {
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

  const signedProposals = proposals.filter(p => !p.isAnonymous);
  const anonymousProposals = proposals.filter(p => p.isAnonymous);
  const visibleProposals = activeCategory === 'semnate' ? signedProposals : anonymousProposals;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Aprobat
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
            <XCircle className="w-3 h-3" /> Respins
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
            <Clock className="w-3 h-3" /> În Analiză
          </span>
        );
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Se încarcă propunerile...</div>;
  }

  // Members see a single, simple section: the submission form. Nothing else.
  if (!isAdmin) {
    return (
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Proiecte</h1>
          <p className="text-slate-500">Propune un proiect nou clubului — anonim sau cu numele tău</p>
        </div>
        <ProjectProposalForm
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          currentUsername={currentUsername}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Proiecte</h1>
          <p className="text-slate-500">Toate propunerile de proiecte trimise de membri</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-full border border-black/5">
          <button
            onClick={() => setActiveCategory('semnate')}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold transition-all ${
              activeCategory === 'semnate'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> Semnate ({signedProposals.length})
          </button>
          <button
            onClick={() => setActiveCategory('anonime')}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold transition-all ${
              activeCategory === 'anonime'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" /> Anonime ({anonymousProposals.length})
          </button>
        </div>
      </div>

      {visibleProposals.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">
            {activeCategory === 'semnate'
              ? 'Nu există propuneri semnate momentan.'
              : 'Nu există propuneri anonime momentan.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleProposals.map(proposal => (
            <div key={proposal.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                {getStatusBadge(proposal.status)}
              </div>

              <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight">{proposal.title}</h3>

              <p className={`text-xs mb-2 font-semibold ${proposal.isAnonymous ? 'text-slate-400' : 'text-indigo-600'}`}>
                {proposal.isAnonymous ? 'Anonim' : `Propus de: ${proposal.authorName}`}
              </p>

              <p className="text-sm text-slate-600 mb-4 line-clamp-3 flex-1">{proposal.description}</p>

              {proposal.budget && (
                <div className="text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-slate-600 mb-3">
                  💰 Buget estimat: <strong>{proposal.budget}</strong>
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                </span>
                {proposal.pdfUrl && (
                  <a
                    href={proposal.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Vezi PDF <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
