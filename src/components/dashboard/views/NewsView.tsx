import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { Megaphone, Trash2, ExternalLink, Plus, Send } from 'lucide-react';
import { NewsAdminForm } from './NewsAdminForm';

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
      setCommentText(prev => ({ ...prev, [newsId]: '' }));
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleDeleteNews = async (newsId: string) => {
    if (!isAdmin) return;
    if (!window.confirm('Ești sigur că vrei să ștergi această știre?')) return;
    try {
      const { error } = await supabase.from('news').delete().eq('id', newsId);
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting news:', err);
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
    return <div className="p-8 text-center text-slate-500">Se încarcă știrile...</div>;
  }

  if (showCreateForm && isAdmin) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <button
          onClick={() => setShowCreateForm(false)}
          className="px-4 py-1.5 btn-stitch-secondary text-xs font-bold"
        >
          ← Înapoi la Știri
        </button>
        <NewsAdminForm isAdmin={isAdmin} currentUserId={currentUserId} onClose={() => setShowCreateForm(false)} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Știri</h1>
          <p className="text-slate-500">Noutăți și anunțuri oficiale ale clubului</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 btn-stitch-primary text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            Știre Nouă
          </button>
        )}
      </div>

      {news.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Megaphone className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Nu există știri publicate momentan.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {news.map(item => {
            const embedUrl = item.videoUrl ? getYouTubeEmbedUrl(item.videoUrl) : null;

            return (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
                {/* Image */}
                {item.imageUrl && (
                  <div className="w-full h-56 bg-slate-100 overflow-hidden">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
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

                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-slate-800 mb-1">{item.title}</h2>
                      <span className="text-xs text-slate-400">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteNews(item.id)}
                        className="p-1.5 hover:bg-rose-50 rounded-full transition-all text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed mb-4">{item.content}</p>

                  {item.linkUrl && (
                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors mb-4"
                    >
                      <ExternalLink className="w-4 h-4" /> Citește mai mult
                    </a>
                  )}

                  {/* Reactions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-3 mb-4">
                    {REACTION_CONFIG.map(reaction => {
                      const list: string[] = (item.reactions || {})[reaction.key] || [];
                      const hasReacted = list.includes(currentUserId);
                      return (
                        <button
                          key={reaction.key}
                          onClick={() => handleToggleReaction(item.id, reaction.key)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            hasReacted
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {reaction.label}
                          {list.length > 0 && <span>{list.length}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Comments */}
                  <div className="space-y-3">
                    {(item.comments || []).map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {comment.authorName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="bg-slate-50 rounded-xl px-3 py-2 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-slate-700">{comment.authorName}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(comment.createdAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">{comment.text}</p>
                        </div>
                      </div>
                    ))}

                    {/* Add comment */}
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={commentText[item.id] || ''}
                        onChange={e => setCommentText(prev => ({ ...prev, [item.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddComment(item.id); }}
                        placeholder="Scrie un comentariu..."
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                      />
                      <button
                        onClick={() => handleAddComment(item.id)}
                        disabled={!commentText[item.id]?.trim()}
                        className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-all disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
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
