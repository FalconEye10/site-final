import React, { useState, useRef } from 'react';
import { supabase } from '../../supabase';
import { fileToDataUrl } from '../../utils/file';
import { FileText, Upload, Send, AlertCircle, CheckCircle2, User, Mail, Tag, AlignLeft } from 'lucide-react';

export const CommunityPitchForm: React.FC = () => {
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const COOLDOWN_MS = 5 * 60 * 1000; // 5 minute între trimiteri (anti-spam)
  const COOLDOWN_KEY = 'pitch_last_submit';

  // Validare email sau telefon românesc
  const isValidContact = (val: string): boolean => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const phoneRe = /^(\+?4?0|0)7\d{8}$/;
    const cleaned = val.replace(/[\s-]/g, '');
    return emailRe.test(val.trim()) || phoneRe.test(cleaned);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('Fișierul depășește limita de 5MB.');
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
    if (!title.trim() || !name.trim() || !description.trim() || !contact.trim()) {
      setError('Toate câmpurile (Titlu, Nume, Descriere, Contact) sunt obligatorii.');
      return;
    }
    if (!isValidContact(contact)) {
      setError('Te rog introdu o adresă de email validă sau un număr de telefon românesc (07xx...).');
      return;
    }
    if (!pdfFile) {
      setError('Te rog atașează propunerea în format PDF.');
      return;
    }

    // Anti-spam: verifică cooldown
    const lastSubmit = Number(localStorage.getItem(COOLDOWN_KEY) || '0');
    const elapsed = Date.now() - lastSubmit;
    if (elapsed < COOLDOWN_MS) {
      const remainMin = Math.ceil((COOLDOWN_MS - elapsed) / 60000);
      setError(`Te rog așteaptă încă ${remainMin} minut${remainMin === 1 ? '' : 'e'} înainte de a trimite o nouă propunere.`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const pdfUrl = await fileToDataUrl(pdfFile);
      const pitchId = `pitch_${Date.now()}`;

      const { error: insertErr } = await supabase.from('project_pitches').upsert({
        id: pitchId,
        title: title.trim(),
        submitterName: name.trim(),
        description: description.trim(),
        submitterEmail: contact.trim(),
        pdfUrl,
        createdAt: new Date().toISOString()
      });

      if (insertErr) throw insertErr;

      // Setăm timestamp cooldown anti-spam
      localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting community pitch:', err);
      setError('A apărut o eroare la trimiterea propunerii. Încearcă din nou.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="pitch-form-container w-full max-w-3xl mx-auto bg-white border border-slate-200 rounded-[2px] p-6 sm:p-10 text-center shadow-sm font-anthropic">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[2px] flex items-center justify-center mx-auto mb-4 border border-emerald-200">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="font-anthropicSerif text-2xl font-bold text-slate-900 mb-2">Propunere Trimisă cu Succes!</h2>
        <p className="font-anthropic text-sm text-slate-600 max-w-xl mx-auto mb-6">
          Îți mulțumim pentru inițiativă! Echipa de administrare Interact Camena va analiza propunerea ta de proiect și te va contacta în cel mai scurt timp posibil.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setTitle('');
            setName('');
            setDescription('');
            setContact('');
            setPdfFile(null);
          }}
          className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-[2px] shadow-xs inline-flex items-center justify-center font-title text-xs font-bold tracking-wider uppercase cursor-pointer"
        >
          Trimite altă idee
        </button>
      </div>
    );
  }

  return (
    <div className="pitch-form-container w-full max-w-3xl mx-auto bg-white rounded-[2px] overflow-hidden border border-slate-200 shadow-sm transition-all font-anthropic">
      <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 font-anthropic">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-900 rounded-[2px] flex items-center justify-center border border-indigo-200 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-anthropicSerif text-xl font-bold text-slate-900">Propune o Idee Comunității</h2>
            <p className="font-anthropic text-xs text-slate-500 mt-0.5">Suntem deschiși la parteneriate și proiecte noi care pot ajuta orașul nostru.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4 font-anthropic">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-[2px] text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-anthropic font-medium">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nume / Organizatie */}
          <div className="space-y-1">
            <label className="block font-title text-[10px] font-bold text-slate-700 tracking-wider uppercase">Nume Complet / Organizație *</label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Popescu Ionel sau Colegiul Național..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-[2px] text-xs font-anthropic outline-none focus:border-slate-800 transition-all text-slate-900"
              />
            </div>
          </div>

          {/* Contact (Email/Tel) */}
          <div className="space-y-1">
            <label className="block font-title text-[10px] font-bold text-slate-700 tracking-wider uppercase">Informații Contact (Email / Tel) *</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                required
                value={contact}
                onChange={e => setContact(e.target.value)}
                placeholder="Ex: contact@email.com / 07xx..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-[2px] text-xs font-anthropic outline-none focus:border-slate-800 transition-all text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Titlu idee */}
        <div className="space-y-1">
          <label className="block font-title text-[10px] font-bold text-slate-700 tracking-wider uppercase">Titlul Ideii / Proiectului *</label>
          <div className="relative group">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Campania de împădurire ecologică"
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-[2px] text-xs font-anthropic outline-none focus:border-slate-800 transition-all text-slate-900"
            />
          </div>
        </div>

        {/* Descriere */}
        <div className="space-y-1">
          <label className="block font-title text-[10px] font-bold text-slate-700 tracking-wider uppercase">Descrierea Ideii *</label>
          <div className="relative group">
            <AlignLeft className="absolute left-3 top-2.5 text-slate-400 w-3.5 h-3.5" />
            <textarea
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrie pe scurt ideea, scopul propus și modul în care Interact Camena poate sprijini inițiativa..."
              rows={4}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-[2px] text-xs font-anthropic outline-none focus:border-slate-800 transition-all resize-none text-slate-900"
            />
          </div>
        </div>

        {/* PDF Upload */}
        <div className="space-y-1">
          <label className="block font-title text-[10px] font-bold text-slate-700 tracking-wider uppercase">Atașament Propunere PDF * (Max 5MB)</label>
          <div className="relative">
            <label className="flex flex-col items-center justify-center gap-2 cursor-pointer w-full p-5 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-[2px] transition-all bg-slate-50 hover:bg-slate-100/50 group">
              <Upload className="w-6 h-6 text-slate-400 group-hover:text-slate-600 transition-colors" />
              <span className="text-xs font-anthropic text-slate-600 group-hover:text-slate-900 font-medium transition-colors">
                {pdfFile ? pdfFile.name : 'Apasă pentru a încărca fișierul propunerii (PDF)'}
              </span>
              <span className="text-[10px] text-slate-400">Sunt acceptate doar fișiere .pdf</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
                required
              />
            </label>
            {pdfFile && (
              <button
                type="button"
                onClick={() => {
                  setPdfFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-2.5 right-2.5 text-[10px] font-title font-bold bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white px-2 py-0.5 rounded-[2px] transition-colors cursor-pointer"
              >
                Șterge
              </button>
            )}
            <p className="text-[10px] text-slate-400 mt-1">Dimensiune maximă: 5MB.</p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !title.trim() || !name.trim() || !description.trim() || !contact.trim() || !pdfFile}
          className="bg-slate-900 hover:bg-slate-800 text-white w-full py-3 rounded-[2px] shadow-xs font-title text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-[2px] animate-spin" />
              Se trimite...
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              Trimite Propunerea
            </>
          )}
        </button>
      </form>
    </div>
  );
};
