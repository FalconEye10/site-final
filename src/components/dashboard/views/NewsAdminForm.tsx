import React, { useState } from 'react';
import { supabase } from '../../../supabase';
import { Megaphone, Send, Image as ImageIcon, Link as LinkIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

interface NewsAdminFormProps {
  isAdmin: boolean;
  currentUserId: string;
  onClose?: () => void;
}

export const NewsAdminForm: React.FC<NewsAdminFormProps> = ({ isAdmin, onClose }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isAdmin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Titlul și descrierea sunt obligatorii.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const newsId = `news_${Date.now()}`;
      const { error: insertErr } = await supabase.from('news').upsert({
        id: newsId,
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageUrl.trim() || null,
        videoUrl: videoUrl.trim() || null,
        linkUrl: linkUrl.trim() || null,
        reactions: { like: [], love: [], dislike: [] },
        comments: [],
        createdAt: new Date().toISOString(),
      });

      if (insertErr) throw insertErr;

      setSubmitted(true);
    } catch (err) {
      console.error('Error creating news:', err);
      setError('A apărut o eroare la publicarea știrii.');
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
          <h2 className="text-xl font-bold text-slate-800 mb-2">Știrea a fost publicată!</h2>
          <p className="text-slate-500 mb-6">Membrii o pot vedea acum în tab-ul Știri.</p>
          <button
            onClick={() => {
              setSubmitted(false);
              setTitle('');
              setContent('');
              setImageUrl('');
              setVideoUrl('');
              setLinkUrl('');
              if (onClose) onClose();
            }}
            className="px-6 py-2.5 btn-stitch-primary text-xs font-bold"
          >
            Publică altă știre
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
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Publicare Știre Nouă</h2>
              <p className="text-sm text-slate-500">Conținut vizibil tuturor membrilor</p>
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Titlu *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Anunț important pentru membrii clubului"
              className="w-full rounded-xl border border-slate-200 shadow-sm px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Conținut *</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Scrie detalii despre știre..."
              rows={6}
              className="w-full rounded-xl border border-slate-200 shadow-sm px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-slate-400" /> URL Imagine (opțional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://exemplu.com/imagine.jpg"
              className="w-full rounded-xl border border-slate-200 shadow-sm px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
              <span className="text-slate-400">🎥</span> URL Video (opțional)
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full rounded-xl border border-slate-200 shadow-sm px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-slate-400" /> Link Extern (opțional)
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-200 shadow-sm px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !content.trim()}
            className="flex items-center justify-center gap-2 w-full py-2.5 btn-stitch-primary text-xs font-bold disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Se publică...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Publică Știrea
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
