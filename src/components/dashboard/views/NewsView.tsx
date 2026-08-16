import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { Megaphone, Trash2, ExternalLink, Plus, Send } from 'lucide-react';
import { NewsAdminForm } from './NewsAdminForm';
import { EmptyState } from '../../ui/EmptyState';
import { Skeleton, SkeletonCard } from '../../ui/Skeleton';
import { toast } from '../../ui/Toast';
import { formatRomaniaDateTime } from '../../../utils/romaniaTime';

interface NewsComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

interface NewsItem {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  linkUrl?: string | null;
  reactions: Record<string, string[]>;
  comments: NewsComment[];
  createdAt: any;
}

interface NewsViewProps {
  isAdmin: boolean;
  currentUserId: string;
  currentUsername?: string;
}

const REACTION_CONFIG = [
  { key: 'like', label: '👍' },
  { key: 'love', label: '❤️' },
  { key: 'dislike', label: '👎' },
];

export const NewsView: React.FC<NewsViewProps> = ({ isAdmin, currentUserId, currentUsername }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { data, error } = await supabase
          .from('news')
          .select('*')
          .order('createdAt', { ascending: false });
        if (error) throw error;
        setNews(data || []);
      } catch (err) {
        console.error("Error fetching news:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();

    const channel = supabase
      .channel('news_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, () => {
        fetchNews();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleToggleReaction = async (newsId: string, reactionKey: string) => {
    if (!currentUserId) return;
    try {
      const item = news.find(n => n.id === newsId);
      if (!item) return;

      const currentReactions = { ...(item.reactions || {}) };
      const currentList = Array.isArray(currentReactions[reactionKey]) ? currentReactions[reactionKey] : [];
      const alreadyReacted = currentList.includes(currentUserId);

      const updatedList = alreadyReacted
        ? currentList.filter(id => id !== currentUserId)
        : [...currentList, currentUserId];

      currentReactions[reactionKey] = updatedList;

      const { error } = await supabase
        .from('news')
        .update({ reactions: currentReactions })
        .eq('id', newsId);

      if (error) throw error;
    } catch (err) {
      console.error('Error toggling reaction:', err);
    }
  };

  const handleAddComment = async (newsId: string) => {
    const text = commentText[newsId]?.trim();
    if (!text || !currentUserId) return;

    try {
      const item = news.find(n => n.id === newsId);
      if (!item) return;

      const newComment: NewsComment = {
        id: `comment_${Date.now()}`,
        authorId: currentUserId,
        authorName: currentUsername || currentUserId || 'Membru',
        text,
        createdAt: new Date().toISOString(),
      };

      const currentComments = Array.isArray(item.comments) ? item.comments : [];

      const { error } = await supabase
        .from('news')
        .update({ comments: [...currentComments, newComment] })
        .eq('id', newsId);

      if (error) throw error;
      toast.success('Comentariul a fost adăugat!');
      setCommentText(prev => ({ ...prev, [newsId]: '' }));
    } catch (err: any) {
      console.error('Error adding comment:', err);
      toast.error('Eroare la adăugarea comentariului.');
    }
  };

  const handleDeleteNews = async (newsId: string) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase.from('news').delete().eq('id', newsId);
      if (error) throw error;
      toast.success('Știrea a fost ștearsă.');
    } catch (err: any) {
      console.error('Error deleting news:', err);
      toast.error('Eroare la ștergerea știrii.');
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com')) {
        const videoId = urlObj.searchParams.get('v');
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      } else if (urlObj.hostname.includes('youtu.be')) {
        return `https://www.youtube.com/embed${urlObj.pathname}`;
      }
    } catch { /* ignore */ }
    return null;
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto font-anthropic">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <SkeletonCard count={2} />
      </div>
    );
  }

  if (showCreateForm && isAdmin) {
    return (
      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto font-anthropic">
        <button
          onClick={() => setShowCreateForm(false)}
          className="px-3.5 py-1.5 btn-civic-secondary text-xs font-title uppercase tracking-wider"
        >
          ← Înapoi la Știri
        </button>
        <NewsAdminForm isAdmin={isAdmin} currentUserId={currentUserId} onClose={() => setShowCreateForm(false)} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto font-anthropic">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-anthropicSerif text-slate-900 dark:text-slate-100">Jurnal & Anunțuri</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-anthropic">Noutăți oficiale, comunicate și evenimente comunitare</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 btn-civic-primary text-xs sm:text-sm font-title uppercase tracking-wider cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Știre Nouă
          </button>
        )}
      </div>

      {news.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Niciun anunț publicat momentan"
          description="Aici vor fi publicate noutățile oficiale ale clubului, comunicatele consiliului și rezumatele proiectelor."
          actionLabel={isAdmin ? "Adaugă Prima Știre" : undefined}
          onAction={isAdmin ? () => setShowCreateForm(true) : undefined}
          actionIcon={Plus}
        />
      ) : (
        <div className="space-y-6">
          {news.map(item => {
            const embedUrl = item.videoUrl ? getYouTubeEmbedUrl(item.videoUrl) : null;

            return (
              <div key={item.id} className="bg-white dark:bg-[#161B22] rounded-[2px] shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all font-anthropic">
                {/* Image */}
                {item.imageUrl && (
                  <div className="w-full h-64 bg-slate-100 dark:bg-slate-900 overflow-hidden border-b border-slate-200 dark:border-slate-800">
                    <img src={item.imageUrl} alt={item.title} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Video embed */}
                {embedUrl && (
                  <div className="w-full aspect-video bg-black">
                    <iframe
                      src={embedUrl}
                      title={item.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h2 className="text-xl sm:text-2xl font-bold font-anthropicSerif text-slate-900 dark:text-slate-100 mb-1">{item.title}</h2>
                      <span className="text-xs sm:text-sm font-data text-slate-500 dark:text-slate-400">
                        {item.createdAt ? formatRomaniaDateTime(item.createdAt, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteNews(item.id)}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-[2px] transition-all text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Șterge știre"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed mb-4 font-anthropic">{item.content}</p>

                  {item.linkUrl && (
                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-title font-bold hover:underline mb-4"
                    >
                      <ExternalLink className="w-4 h-4" /> Citește mai mult
                    </a>
                  )}

                  {/* Reactions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 mb-4 flex-wrap">
                    {REACTION_CONFIG.map(reaction => {
                      const list: string[] = (item.reactions || {})[reaction.key] || [];
                      const hasReacted = list.includes(currentUserId);
                      return (
                        <button
                          key={reaction.key}
                          onClick={() => handleToggleReaction(item.id, reaction.key)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-xs sm:text-sm font-medium border transition-all cursor-pointer font-data ${
                            hasReacted
                              ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          {reaction.label}
                          {list.length > 0 && <span className="font-bold">{list.length}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Comments */}
                  <div className="space-y-3.5">
                    {(item.comments || []).map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-[2px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 font-title border border-slate-300 dark:border-slate-700">
                          {comment.authorName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-[2px] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 font-title">{comment.authorName}</span>
                            <span className="text-xs text-slate-400 font-data">
                              {formatRomaniaDateTime(comment.createdAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-anthropic leading-relaxed">{comment.text}</p>
                        </div>
                      </div>
                    ))}

                    {/* Add comment */}
                    <div className="flex gap-2.5 mt-2.5">
                      <input
                        type="text"
                        value={commentText[item.id] || ''}
                        onChange={e => setCommentText(prev => ({ ...prev, [item.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddComment(item.id); }}
                        placeholder="Scrie un comentariu..."
                        className="flex-1 rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-anthropic"
                      />
                      <button
                        onClick={() => handleAddComment(item.id)}
                        disabled={!commentText[item.id]?.trim()}
                        className="px-4 py-2 btn-civic-primary text-xs sm:text-sm font-title uppercase tracking-wider disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Trimite</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
