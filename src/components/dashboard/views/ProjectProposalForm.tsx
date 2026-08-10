import React, { useState } from 'react';
import { supabase } from '../../../supabase';
import { fileToDataUrl } from '../../../utils/file';
import { FileText, Upload, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ProjectProposalFormProps {
  isAdmin: boolean;
  currentUserId: string;
  currentUsername?: string;
  onClose?: () => void;
}

export const ProjectProposalForm: React.FC<ProjectProposalFormProps> = ({ currentUserId, currentUsername, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [includeUsername, setIncludeUsername] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const MAX_FILE_SIZE = 500 * 1024; // 500KB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('Fișierul depășește limita de 500KB. Te rog alege un fișier mai mic.');
      setPdfFile(null);
      return;
    }

    if (file.type !== 'application/pdf') {
      setError('Te rog încarcă doar fișiere PDF.');
      setPdfFile(null);
      return;
    }

    setError('');
    setPdfFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Titlul și descrierea sunt obligatorii.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const pdfUrl = pdfFile ? await fileToDataUrl(pdfFile) : '';
      const isAnonymous = !includeUsername;

      const proposalId = `proposal_${Date.now()}`;
      const { error: insertErr } = await supabase.from('project_proposals').upsert({
        id: proposalId,
        title: title.trim(),
        description: description.trim(),
        budget: budget.trim() || null,
        pdfUrl,
        isAnonymous,
        authorId: isAnonymous ? null : currentUserId,
        authorName: isAnonymous ? 'Anonim' : (currentUsername || 'Membru'),
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      if (insertErr) throw insertErr;

      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting proposal:', err);
      setError('A apărut o eroare la trimiterea propunerii. Încearcă din nou.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Propunerea a fost trimisă!</h2>
          <p className="text-slate-500 mb-6">
            Echipa de administrare va analiza propunerea ta. Vei fi notificat când statusul se schimbă.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setTitle('');
              setDescription('');
              setBudget('');
              setPdfFile(null);
              setIncludeUsername(false);
              if (onClose) onClose();
            }}
            className="px-6 py-2.5 btn-stitch-primary text-xs font-bold"
          >
            Trimite altă propunere
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Propunere Proiect Nou</h2>
              <p className="text-sm text-slate-500">Completează detaliile proiectului tău</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Titlul Proiectului *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Amenajare spațiu de recreere"
              className="w-full rounded-xl border border-slate-200 shadow-sm px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Descrierea Proiectului *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrie în detaliu scopul, obiectivele și planul de implementare..."
              rows={5}
              className="w-full rounded-xl border border-slate-200 shadow-sm px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Buget Estimat (opțional)</label>
            <input
              type="text"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              placeholder="Ex: 500 Lei sau Fără buget necesar"
              className="w-full rounded-xl border border-slate-200 shadow-sm px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Atașament PDF (opțional, max 500KB)</label>
            <div className="relative">
              <label className="flex items-center gap-3 cursor-pointer w-full p-4 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl transition-colors bg-slate-50/50 hover:bg-indigo-50/30">
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-slate-600">
                  {pdfFile ? pdfFile.name : 'Click pentru a încărca un plan PDF'}
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {pdfFile && (
                <button
                  type="button"
                  onClick={() => setPdfFile(null)}
                  className="absolute top-2 right-2 text-xs text-slate-400 hover:text-rose-600 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeUsername}
                onChange={(e) => setIncludeUsername(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <div className="text-sm">
                <span className="font-semibold text-slate-800 block">Semnează propunerea cu numele meu</span>
                <span className="text-slate-500 text-xs block mt-0.5">
                  Dacă bifezi, adminii vor vedea că propunerea îți aparține (<strong>{currentUsername || 'tu'}</strong>).
                  Propunerile semnate și aplicabile pot primi o <strong>mărire de punctaj (puncte bonus)</strong>! Necompletat, propunerea rămâne 100% anonimă.
                </span>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !description.trim()}
            className="flex items-center justify-center gap-2 w-full py-2.5 btn-stitch-primary text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Se trimite...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {includeUsername ? 'Trimite Semnat' : 'Trimite Anonim'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
