import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { MessageSquare, Send, Trash2, Edit3, Heart, ThumbsUp, ThumbsDown, X, Check, Plus } from 'lucide-react';
import { toast } from '../../ui/Toast';
import { triggerForumPushNotification } from '../../../utils/pushNotifications';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonCard, Skeleton } from '../../ui/Skeleton';
import { formatRomaniaDateTime } from '../../../utils/romaniaTime';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  reactions: Record<string, string[]>; // { 'like': [userId1], 'love': [userId2], 'dislike': [...] }
  createdAt: any;
}

interface ForumViewProps {
  isAdmin: boolean;
  currentUserId: string;
  currentUsername?: string;
}

const REACTION_CONFIG = [
  { key: 'like', icon: ThumbsUp, label: '👍' },
  { key: 'love', icon: Heart, label: '❤️' },
  { key: 'dislike', icon: ThumbsDown, label: '👎' },
];

export const ForumView: React.FC<ForumViewProps> = ({ isAdmin, currentUserId, currentUsername }) => {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('forum_posts')
          .select('*')
          .order('createdAt', { ascending: false });
        if (error) throw error;
        setPosts(data || []);
      } catch (err) {
        console.error("Error fetching forum posts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();

    const channel = supabase
      .channel('forum_posts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      toast.error('Completează titlul și conținutul postării.');
      return;
    }

    setIsSubmitting(true);
    try {
      const postId = `post_${Date.now()}`;
      const { error } = await supabase.from('forum_posts').upsert({
        id: postId,
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        authorId: currentUserId,
        authorName: currentUsername || currentUserId || 'Membru',
        reactions: { like: [], love: [], dislike: [] },
        createdAt: new Date().toISOString(),
      });

      if (error) throw error;

      triggerForumPushNotification(newPostTitle.trim(), currentUsername || 'Un coleg');
      toast.success('Subiectul a fost publicat pe forum!');
      setNewPostTitle('');
      setNewPostContent('');
      setShowNewPost(false);
    } catch (err: any) {
      console.error('Error creating forum post:', err);
      toast.error('Eroare la publicarea postării: ' + (err.message || 'Eroare necunoscută'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleReaction = async (postId: string, reactionKey: string) => {
    if (!currentUserId) return;
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const currentReactions = { ...(post.reactions || {}) };
      const currentList = Array.isArray(currentReactions[reactionKey]) ? currentReactions[reactionKey] : [];
      const alreadyReacted = currentList.includes(currentUserId);

      const updatedList = alreadyReacted
        ? currentList.filter(id => id !== currentUserId)
        : [...currentList, currentUserId];

      currentReactions[reactionKey] = updatedList;

      const { error } = await supabase
        .from('forum_posts')
        .update({ reactions: currentReactions })
        .eq('id', postId);

      if (error) throw error;
    } catch (err) {
      console.error('Error toggling reaction:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase.from('forum_posts').delete().eq('id', postId);
      if (error) throw error;
      toast.success('Postarea a fost ștearsă.');
    } catch (err: any) {
      console.error('Error deleting post:', err);
      toast.error('Eroare la ștergerea postării.');
    }
  };

  const handleStartEdit = (post: ForumPost) => {
    setEditingPostId(post.id);
    setEditTitle(post.title);
    setEditContent(post.content);
  };

  const handleSaveEdit = async () => {
    if (!editingPostId || !editTitle.trim() || !editContent.trim()) return;
    try {
      const { error } = await supabase
        .from('forum_posts')
        .update({
          title: editTitle.trim(),
          content: editContent.trim(),
        })
        .eq('id', editingPostId);
      if (error) throw error;
      toast.success('Postarea a fost actualizată!');
      setEditingPostId(null);
    } catch (err: any) {
      console.error('Error updating post:', err);
      toast.error('Eroare la salvarea modificărilor.');
    }
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

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto font-anthropic">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-anthropicSerif text-slate-900 dark:text-slate-100">Forum & Dialog</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-anthropic">Discuții deschise, inițiative și schimb de opinii între membri</p>
        </div>
        <button
          onClick={() => setShowNewPost(!showNewPost)}
          className="flex items-center gap-2 px-4 py-2.5 btn-civic-primary text-xs sm:text-sm font-title uppercase tracking-wider cursor-pointer"
        >
          {showNewPost ? <X size={15} /> : <Plus size={15} />}
          {showNewPost ? 'Anulează' : 'Postare Nouă'}
        </button>
      </div>

      {showNewPost && (
        <form onSubmit={handleCreatePost} className="bg-white dark:bg-[#161B22] rounded-[2px] shadow-xs border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-3.5 font-anthropic">
          <input
            type="text"
            value={newPostTitle}
            onChange={e => setNewPostTitle(e.target.value)}
            placeholder="Titlul subiectului de discuție..."
            className="w-full rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-anthropic"
          />
          <textarea
            value={newPostContent}
            onChange={e => setNewPostContent(e.target.value)}
            placeholder="Descrie ideea sau întrebarea ta pentru colegi..."
            rows={4}
            className="w-full rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 resize-none font-anthropic"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newPostTitle.trim() || !newPostContent.trim()}
            className="flex items-center gap-2 px-5 py-2.5 btn-civic-primary text-xs sm:text-sm font-title uppercase tracking-wider disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Se publică...' : 'Publică Subiect'}
          </button>
        </form>
      )}

      {posts.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Nu există postări pe forum încă"
          description="Fii primul care deschide o temă de discuție, o inițiativă nouă sau un subiect de dezbatere pentru colegi!"
          actionLabel="Deschide Prima Discuție"
          onAction={() => setShowNewPost(true)}
          actionIcon={Plus}
        />
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white dark:bg-[#161B22] rounded-[2px] shadow-xs border border-slate-200 dark:border-slate-800 p-5 sm:p-6 group hover:border-slate-300 dark:hover:border-slate-700 transition-all font-anthropic">
              {editingPostId === post.id ? (
                <div className="space-y-3.5 font-anthropic">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                  />
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={4}
                    className="w-full rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="flex items-center gap-1.5 px-4 py-2 btn-civic-primary text-xs sm:text-sm font-title uppercase tracking-wider">
                      <Check className="w-4 h-4" /> Salvează
                    </button>
                    <button onClick={() => setEditingPostId(null)} className="flex items-center gap-1.5 px-4 py-2 btn-civic-secondary text-xs sm:text-sm font-title uppercase tracking-wider">
                      <X className="w-4 h-4" /> Anulează
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-bold font-anthropicSerif text-slate-900 dark:text-slate-100 mb-1">{post.title}</h3>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-data">
                        <span className="font-bold text-slate-700 dark:text-slate-300 font-title">{post.authorName}</span>
                        <span>•</span>
                        <span>
                          {post.createdAt ? formatRomaniaDateTime(post.createdAt, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1.5">
                        <button onClick={() => handleStartEdit(post)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[2px] transition-all text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" title="Editează">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeletePost(post.id)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-[2px] transition-all text-slate-400 hover:text-rose-600 cursor-pointer" title="Șterge">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-anthropic mb-4">{post.content}</p>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                    {REACTION_CONFIG.map(reaction => {
                      const list: string[] = (post.reactions || {})[reaction.key] || [];
                      const hasReacted = list.includes(currentUserId);
                      return (
                        <button
                          key={reaction.key}
                          onClick={() => handleToggleReaction(post.id, reaction.key)}
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
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
