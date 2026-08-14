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
  const [recommendedCommittee, setRecommendedCommittee] = useState('Servicii Comunitare & Proiecte');
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
        committee: recommendedCommittee,
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
      <div className="max-w-2xl mx-auto font-anthropic">
        <div className="bg-white dark:bg-[#161B22] rounded-[2px] shadow-xs border border-slate-200 dark:border-slate-800 p-8 text-center">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-[2px] flex items-center justify-center mx-auto mb-4 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold font-anthropicSerif text-slate-900 dark:text-slate-100 mb-2">Propunerea a fost înregistrată</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-anthropic">
            Echipa de administrare va analiza propunerea ta de proiect. Vei fi notificat când statusul se schimbă.
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
            className="px-6 py-2.5 btn-civic-primary text-xs font-title uppercase tracking-wider"
          >
            Trimite altă propunere
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto font-anthropic">
      <div className="bg-white dark:bg-[#161B22] rounded-[2px] shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-[2px] border border-slate-200 dark:border-slate-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-anthropicSerif text-slate-900 dark:text-slate-100">Propunere Proiect Nou</h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-anthropic">Formular oficial de înaintare inițiative comunitare</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 font-anthropic">
          {error && (
            <div className="flex items-center gap-2 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-[2px] text-xs sm:text-sm text-rose-700 dark:text-rose-300 font-anthropic">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">Titlul Proiectului *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Amenajare spațiu de recreere comunitar"
              className="w-full rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-anthropic"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">Descrierea Proiectului *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrie în detaliu scopul, obiectivele și planul de implementare..."
              rows={4}
              className="w-full rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 resize-none font-anthropic"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">Comitet Recomandat</label>
            <select
              value={recommendedCommittee}
              onChange={e => setRecommendedCommittee(e.target.value)}
              className="w-full rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-anthropic cursor-pointer"
            >
              <option value="Servicii Comunitare & Proiecte">🤝 Servicii Comunitare & Proiecte</option>
              <option value="Imagine Publică & PR">🎨 Imagine Publică & PR</option>
              <option value="Finanțe & Fundraising">💼 Finanțe & Fundraising</option>
              <option value="Leadership & Dezvoltare">🎯 Leadership & Dezvoltare</option>
              <option value="Organizare & Logistică">⚙️ Organizare & Logistică</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">Buget Estimat (opțional)</label>
            <input
              type="text"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              placeholder="Ex: 500 Lei sau Fără buget necesar"
              className="w-full rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-anthropic"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">Atașament PDF (opțional, max 500KB)</label>
            <div className="relative">
              <label className="flex items-center gap-3.5 cursor-pointer w-full p-4 border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-500 rounded-[2px] transition-colors bg-slate-50 dark:bg-slate-900/60">
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-anthropic">
                  {pdfFile ? pdfFile.name : 'Click pentru a încărca document PDF'}
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
                  className="absolute top-2.5 right-2.5 text-xs text-slate-400 hover:text-rose-600 transition-colors p-1.5 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-[2px] border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeUsername}
                onChange={(e) => setIncludeUsername(e.target.checked)}
                className="mt-1 rounded-[1px] border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <div className="text-xs sm:text-sm font-anthropic">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">Semnează propunerea cu numele meu</span>
                <span className="text-slate-500 dark:text-slate-400 text-xs block mt-1 leading-relaxed">
                  Dacă bifezi, adminii vor vedea autorul propunerii (<strong>{currentUsername || 'tu'}</strong>).
                  Propunerile semnate și aplicabile pot primi <strong>puncte bonus</strong> la clasament.
                </span>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !description.trim()}
            className="flex items-center justify-center gap-2 w-full py-3 btn-civic-primary text-xs sm:text-sm font-title uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-[1px] animate-spin" />
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
