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

  const MAX_FILE_SIZE = 500 * 1024; // 500KB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('Fișierul depășește limita de 500KB.');
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
    if (!pdfFile) {
      setError('Te rog atașează propunerea în format PDF.');
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
      <div className="pitch-form-container w-full max-w-3xl mx-auto liquid-glass rounded-3xl p-8 lg:p-12 text-center border border-brand_signature-baby_blue/30 shadow-[0_20px_50px_rgba(40,250,252,0.1)]">
        <div className="w-20 h-20 bg-brand_signature-baby_blue/20 text-brand_signature-baby_blue rounded-full flex items-center justify-center mx-auto mb-6 border border-brand_signature-baby_blue/30">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="font-headings text-2xl lg:text-3xl font-black text-text-executive_dark mb-4">Propunere Trimisă cu Succes!</h2>
        <p className="font-headings text-lg text-text-executive_dark/70 max-w-xl mx-auto mb-8">
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
          className="emil-btn bg-text-executive_dark text-surface-background px-8 py-4 rounded-xl shadow-[0_4px_20px_rgba(40,250,252,0.15)] group inline-flex items-center justify-center"
        >
          <div className="emil-btn-overlay"></div>
          <span className="emil-btn-content font-headings text-sm font-bold tracking-widest uppercase">
            Trimite altă idee
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="pitch-form-container w-full max-w-3xl mx-auto liquid-glass rounded-3xl overflow-hidden border border-text-executive_dark/10 shadow-[0_15px_35px_rgba(0,31,38,0.02)] hover:border-brand_signature-baby_blue/20 transition-all duration-300">
      <div className="p-8 lg:p-12 border-b border-text-executive_dark/5 bg-gradient-to-r from-brand_signature-baby_blue/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand_signature-baby_blue/20 text-text-executive_dark rounded-2xl flex items-center justify-center border border-brand_signature-baby_blue/30">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-headings text-xl lg:text-2xl font-black text-text-executive_dark">Propune o Idee Comunității</h2>
            <p className="font-headings text-sm text-text-executive_dark/60 mt-1">Suntem deschiși la parteneriate și proiecte noi care pot ajuta orașul nostru.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 lg:p-12 space-y-6">
        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-700 dark:text-rose-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-headings font-semibold">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nume / Organizatie */}
          <div className="space-y-2">
            <label className="block font-headings text-sm font-bold text-text-executive_dark/75 tracking-wider uppercase">Nume Complet / Organizație *</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-executive_dark/40 group-focus-within:text-brand_signature-baby_blue transition-colors w-4 h-4" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Popescu Ionel sau Colegiul Național..."
                className="w-full pl-11 pr-4 py-3.5 bg-surface-background border border-text-executive_dark/10 rounded-xl text-sm font-headings outline-none focus:border-brand_signature-baby_blue focus:ring-2 focus:ring-brand_signature-baby_blue/20 transition-all text-text-executive_dark"
              />
            </div>
          </div>

          {/* Contact (Email/Tel) */}
          <div className="space-y-2">
            <label className="block font-headings text-sm font-bold text-text-executive_dark/75 tracking-wider uppercase">Informații Contact (Email / Tel) *</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-executive_dark/40 group-focus-within:text-brand_signature-baby_blue transition-colors w-4 h-4" />
              <input
                type="text"
                required
                value={contact}
                onChange={e => setContact(e.target.value)}
                placeholder="Ex: contact@email.com / 07xx..."
                className="w-full pl-11 pr-4 py-3.5 bg-surface-background border border-text-executive_dark/10 rounded-xl text-sm font-headings outline-none focus:border-brand_signature-baby_blue focus:ring-2 focus:ring-brand_signature-baby_blue/20 transition-all text-text-executive_dark"
              />
            </div>
          </div>
        </div>

        {/* Titlu idee */}
        <div className="space-y-2">
          <label className="block font-headings text-sm font-bold text-text-executive_dark/75 tracking-wider uppercase">Titlul Ideii / Proiectului *</label>
          <div className="relative group">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-text-executive_dark/40 group-focus-within:text-brand_signature-baby_blue transition-colors w-4 h-4" />
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Campania de împădurire ecologică"
              className="w-full pl-11 pr-4 py-3.5 bg-surface-background border border-text-executive_dark/10 rounded-xl text-sm font-headings outline-none focus:border-brand_signature-baby_blue focus:ring-2 focus:ring-brand_signature-baby_blue/20 transition-all text-text-executive_dark"
            />
          </div>
        </div>

        {/* Descriere */}
        <div className="space-y-2">
          <label className="block font-headings text-sm font-bold text-text-executive_dark/75 tracking-wider uppercase">Descrierea Ideii *</label>
          <div className="relative group">
            <AlignLeft className="absolute left-4 top-4 text-text-executive_dark/40 group-focus-within:text-brand_signature-baby_blue transition-colors w-4 h-4" />
            <textarea
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrie pe scurt ideea, scopul propus și modul în care Interact Camena poate sprijini inițiativa..."
              rows={4}
              className="w-full pl-11 pr-4 py-3.5 bg-surface-background border border-text-executive_dark/10 rounded-xl text-sm font-headings outline-none focus:border-brand_signature-baby_blue focus:ring-2 focus:ring-brand_signature-baby_blue/20 transition-all resize-none text-text-executive_dark"
            />
          </div>
        </div>

        {/* PDF Upload */}
        <div className="space-y-2">
          <label className="block font-headings text-sm font-bold text-text-executive_dark/75 tracking-wider uppercase">Atașament Propunere PDF * (Max 500KB)</label>
          <div className="relative">
            <label className="flex flex-col items-center justify-center gap-3 cursor-pointer w-full p-8 border-2 border-dashed border-text-executive_dark/10 hover:border-brand_signature-baby_blue rounded-xl transition-all bg-surface-background hover:bg-brand_signature-baby_blue/5 group">
              <Upload className="w-8 h-8 text-text-executive_dark/40 group-hover:text-brand_signature-baby_blue transition-colors" />
              <span className="text-sm font-headings text-text-executive_dark/60 group-hover:text-text-executive_dark font-medium transition-colors">
                {pdfFile ? pdfFile.name : 'Apasă pentru a încărca fișierul propunerii (PDF)'}
              </span>
              <span className="text-xs text-text-executive_dark/40">Sunt acceptate doar fișiere .pdf</span>
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
                className="absolute top-3 right-3 text-xs bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white px-2 py-1 rounded transition-colors"
              >
                Sterge
              </button>
            )}
            <p className="text-xs text-text-executive_dark/50 mt-2">Dimensiune maximă: 500KB. PDFs cu poze sau imagini mari pot depăși limita.</p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !title.trim() || !name.trim() || !description.trim() || !contact.trim() || !pdfFile}
          className="emil-btn bg-text-executive_dark text-surface-background w-full py-4 rounded-xl shadow-[0_4px_20px_rgba(40,250,252,0.15)] group flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <div className="emil-btn-overlay"></div>
          <span className="emil-btn-content font-headings text-sm font-bold tracking-widest uppercase flex items-center gap-2">
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-surface-background/30 border-t-surface-background rounded-full animate-spin" />
                Se trimite...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Trimite Propunerea
              </>
            )}
          </span>
        </button>
      </form>
    </div>
  );
};
