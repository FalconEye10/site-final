import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { FileText, Trash2, Globe } from 'lucide-react';

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
    if (!window.confirm('Ești sigur că vrei să ștergi definitiv acest pitch? Această acțiune este ireversibilă.')) return;

    try {
      const { error } = await supabase.from('project_pitches').delete().eq('id', pitch.id);
      if (error) throw error;
    } catch (error) {
      console.error("Error deleting pitch: ", error);
      alert('A apărut o eroare la ștergerea pitch-ului.');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Se încarcă datele...</div>;
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Idei Comunitate</h1>
          <p className="text-slate-500">Propuneri de proiecte și Pitch-uri oficiale din exterior</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pitches.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            <Globe className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p>Nu există pitch-uri în comunitate momentan.</p>
          </div>
        ) : (
          pitches.map(pitch => (
            <div key={pitch.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col group relative">
              {isAdmin && (
                <button
                  onClick={() => handleDeletePitch(pitch)}
                  className="absolute top-4 right-4 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Șterge pitch"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <div className="flex-1">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2 pr-6 leading-tight">{pitch.title}</h3>
                {pitch.submitterName && (
                  <p className="text-sm font-semibold text-slate-700 mb-1">Propus de: {pitch.submitterName}</p>
                )}
                {pitch.submitterEmail && (
                  <p className="text-sm text-slate-500 mb-3">Contact: {pitch.submitterEmail}</p>
                )}
                {pitch.description && (
                  <p className="text-slate-600 text-sm mb-4 line-clamp-3">{pitch.description}</p>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
                <div className="text-xs text-slate-400">
                  {pitch.createdAt ? new Date(pitch.createdAt).toLocaleDateString('ro-RO') : ''}
                </div>
                {isSafePdfUrl(pitch.pdfUrl) ? (
                  <a
                    href={pitch.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-slate-50 hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-lg text-sm font-medium transition-colors text-center"
                  >
                    Vezi Propunerea PDF
                  </a>
                ) : (
                  <div className="w-full py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium text-center">
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
