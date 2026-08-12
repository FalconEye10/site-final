import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { MessageSquare, Send, Trash2, Edit3, Heart, ThumbsUp, ThumbsDown, X, Check } from 'lucide-react';

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
    if (!newPostTitle.trim() || !newPostContent.trim()) return;

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

      setNewPostTitle('');
      setNewPostContent('');
      setShowNewPost(false);
    } catch (err) {
      console.error('Error creating forum post:', err);
      alert('A apărut o eroare la publicarea postării.');
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
    if (!window.confirm('Ești sigur că vrei să ștergi această postare?')) return;
    try {
      const { error } = await supabase.from('forum_posts').delete().eq('id', postId);
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting post:', err);
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
      setEditingPostId(null);
    } catch (err) {
      console.error('Error updating post:', err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Se încarcă forumul...</div>;
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Forum</h1>
          <p className="text-slate-500">Discuții deschise și feedback între membrii clubului</p>
        </div>
        <button
          onClick={() => setShowNewPost(!showNewPost)}
          className="flex items-center gap-2 px-4 py-2.5 btn-stitch-primary text-xs font-bold"
        >
          {showNewPost ? 'Anulează' : 'Postare Nouă'}
        </button>
      </div>

      {showNewPost && (
        <form onSubmit={handleCreatePost} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <input
            type="text"
            value={newPostTitle}
            onChange={e => setNewPostTitle(e.target.value)}
            placeholder="Titlul postării..."
            className="w-full rounded-xl border border-slate-200 shadow-sm px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-medium"
          />
          <textarea
            value={newPostContent}
            onChange={e => setNewPostContent(e.target.value)}
            placeholder="Ce ai vrea să discuți?"
            rows={4}
            className="w-full rounded-xl border border-slate-200 shadow-sm px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newPostTitle.trim() || !newPostContent.trim()}
            className="flex items-center gap-2 px-6 py-2.5 btn-stitch-primary text-xs font-bold disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Se publică...' : 'Publică'}
          </button>
        </form>
      )}

      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Nu există postări pe forum încă. Fii primul care pornește o discuție!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 group hover:shadow-md transition-shadow">
              {editingPostId === post.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="flex items-center gap-1 px-4 py-2 btn-stitch-primary text-xs font-bold">
                      <Check className="w-4 h-4" /> Salvează
                    </button>
                    <button onClick={() => setEditingPostId(null)} className="flex items-center gap-1 px-4 py-2 btn-stitch-secondary text-xs font-bold">
                      <X className="w-4 h-4" /> Anulează
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-800 mb-1">{post.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                        <span className="font-medium text-slate-600">{post.authorName}</span>
                        <span>•</span>
                        <span>
                          {post.createdAt ? new Date(post.createdAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleStartEdit(post)} className="p-1.5 hover:bg-slate-150 rounded-full transition-all text-slate-400 hover:text-slate-700">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeletePost(post.id)} className="p-1.5 hover:bg-rose-50 rounded-full transition-all text-slate-400 hover:text-rose-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{post.content}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
                    {REACTION_CONFIG.map(reaction => {
                      const list: string[] = (post.reactions || {})[reaction.key] || [];
                      const hasReacted = list.includes(currentUserId);
                      return (
                        <button
                          key={reaction.key}
                          onClick={() => handleToggleReaction(post.id, reaction.key)}
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
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
