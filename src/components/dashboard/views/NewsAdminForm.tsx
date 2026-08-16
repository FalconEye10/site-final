import React, { useState } from 'react';
import { supabase } from '../../../supabase';
import { triggerNewsPushNotification } from '../../../utils/pushNotifications';
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

      triggerNewsPushNotification(title.trim(), content.trim());
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
      <div className="max-w-2xl mx-auto font-anthropic">
        <div className="bg-white dark:bg-[#161B22] rounded-[2px] shadow-xs border border-slate-200 dark:border-slate-800 p-8 text-center">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-[2px] flex items-center justify-center mx-auto mb-4 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold font-anthropicSerif text-slate-900 dark:text-slate-100 mb-2">Știrea a fost publicată</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-anthropic">Membrii o pot vizualiza acum în fluxul Jurnal & Anunțuri.</p>
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
            className="px-6 py-2.5 btn-civic-primary text-xs font-title uppercase tracking-wider"
          >
            Publică altă știre
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
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-anthropicSerif text-slate-900 dark:text-slate-100">Publicare Știre Nouă</h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-anthropic">Conținut oficial vizibil tuturor membrilor activi</p>
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">Titlu Anunț *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Anunț important privind următoarea ședință a clubului"
              className="w-full rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-anthropic"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">Conținut *</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Scrie textul detaliat al știrii sau comunicatului..."
              rows={5}
              className="w-full rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 resize-none font-anthropic"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-slate-400" /> URL Imagine (opțional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://exemplu.com/imagine.jpg"
              className="w-full rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-anthropic"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title flex items-center gap-1.5">
              <span className="text-slate-400">🎥</span> URL Video (opțional)
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-anthropic"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-slate-400" /> Link Extern (opțional)
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-anthropic"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !content.trim()}
            className="flex items-center justify-center gap-2 w-full py-3 btn-civic-primary text-xs sm:text-sm font-title uppercase tracking-wider disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-[1px] animate-spin" />
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
