import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { FileText, Trash2, Globe } from 'lucide-react';
import { EmptyState } from '../../ui/EmptyState';
import { toast } from '../../ui/Toast';
import { SkeletonCard, Skeleton } from '../../ui/Skeleton';
import { formatRomaniaDate } from '../../../utils/romaniaTime';

interface ProjectPitch {
  id: string;
  title: string;
  submitterName: string;
  description: string;
  submitterEmail: string;
  pdfUrl: string;
  createdAt: any;
}

interface CommunityIdeasViewProps {
  isAdmin: boolean;
  currentUserId: string;
}

const isSafePdfUrl = (url: unknown): boolean => {
  if (typeof url !== 'string') return false;
  const u = url.trim().toLowerCase();
  return u.startsWith('data:application/pdf') || u.startsWith('https://') || u.startsWith('http://');
};

export const CommunityIdeasView: React.FC<CommunityIdeasViewProps> = ({ isAdmin }) => {
  const [pitches, setPitches] = useState<ProjectPitch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPitches = async () => {
      try {
        const { data, error } = await supabase
          .from('project_pitches')
          .select('*')
          .order('createdAt', { ascending: false });
        if (error) throw error;
        setPitches(data || []);

        if (isAdmin && data && data.length > 0) {
          const readPitchIds = JSON.parse(localStorage.getItem('readPitchIds') || '[]');
          const newPitchIds = data.map((p: any) => p.id);
          const updatedReadIds = Array.from(new Set([...readPitchIds, ...newPitchIds]));
          localStorage.setItem('readPitchIds', JSON.stringify(updatedReadIds));
          window.dispatchEvent(new Event('pitchesReadUpdated'));
        }
      } catch (err) {
        console.error("Error fetching pitches:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPitches();

    const channel = supabase
      .channel('project_pitches_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_pitches' }, () => {
        fetchPitches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const handleDeletePitch = async (pitch: ProjectPitch) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase.from('project_pitches').delete().eq('id', pitch.id);
      if (error) throw error;
      toast.success('Pitch-ul a fost șters.');
    } catch (error: any) {
      console.error("Error deleting pitch: ", error);
      toast.error('A apărut o eroare la ștergerea pitch-ului.');
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <SkeletonCard count={3} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-anthropicSerif text-slate-900 dark:text-slate-100">Pitch-uri Comunitate</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-anthropic">Propuneri de proiecte și Pitch-uri oficiale din mediul extern</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-anthropic">
        {pitches.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Globe}
              title="Nu există pitch-uri din comunitate"
              description="Aici vor apărea propunerile de proiecte și fișierele PDF trimise de parteneri și comunitatea externă."
            />
          </div>
        ) : (
          pitches.map(pitch => (
            <div key={pitch.id} className="bg-white dark:bg-[#161B22] rounded-[2px] shadow-xs border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col group relative font-anthropic hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              {isAdmin && (
                <button
                  onClick={() => handleDeletePitch(pitch)}
                  className="absolute top-4 right-4 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 cursor-pointer"
                  title="Șterge pitch"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <div className="flex-1">
                <div className="w-11 h-11 bg-blue-50 dark:bg-blue-950/40 rounded-[2px] flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 border border-blue-200 dark:border-blue-800">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold font-anthropicSerif text-slate-900 dark:text-slate-100 mb-2 pr-6 leading-tight">{pitch.title}</h3>
                {pitch.submitterName && (
                  <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 font-title">Propus de: {pitch.submitterName}</p>
                )}
                {pitch.submitterEmail && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-data">Contact: {pitch.submitterEmail}</p>
                )}
                {pitch.description && (
                  <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mb-4 line-clamp-3 font-anthropic leading-relaxed">{pitch.description}</p>
                )}
              </div>
              
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
                <div className="text-xs text-slate-400 font-data">
                  {pitch.createdAt ? formatRomaniaDate(pitch.createdAt) : ''}
                </div>
                {isSafePdfUrl(pitch.pdfUrl) ? (
                  <a
                    href={pitch.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 btn-civic-secondary text-xs sm:text-sm font-title uppercase tracking-wider text-center block"
                  >
                    Vezi Propunerea PDF
                  </a>
                ) : (
                  <div className="w-full py-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-[2px] text-xs sm:text-sm font-semibold text-center font-title">
                    Atașament invalid sau lipsă
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
