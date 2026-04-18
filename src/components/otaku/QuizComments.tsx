import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, ChevronDown, ChevronUp, Send, Crown, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Comment {
  id: string;
  author: string;
  authorId: string;
  avatar: string;
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  isCreator: boolean;
  replies: Reply[];
}

interface Reply {
  id: string;
  author: string;
  authorId: string;
  avatar: string;
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  isCreator: boolean;
}

interface QuizCommentsProps {
  quizId: string;
  quizAuthor: string;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

export function QuizComments({ quizId, quizAuthor }: QuizCommentsProps) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const fetchComments = async () => {
    // Fetch top-level comments
    const { data: commentsData, error } = await supabase
      .from('quiz_comments')
      .select('*, author:user_id(id, username, avatar_url)')
      .eq('quiz_id', quizId)
      .is('parent_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch comments:', error);
      setLoading(false);
      return;
    }

    // Fetch replies
    const { data: repliesData } = await supabase
      .from('quiz_comments')
      .select('*, author:user_id(id, username, avatar_url)')
      .eq('quiz_id', quizId)
      .not('parent_id', 'is', null)
      .order('created_at', { ascending: true });

    // Fetch user's likes
    let userLikes = new Set<string>();
    if (user) {
      const { data: likesData } = await supabase
        .from('quiz_comment_likes')
        .select('comment_id')
        .eq('user_id', user.id);
      if (likesData) {
        userLikes = new Set(likesData.map((l: any) => l.comment_id));
      }
    }

    const repliesByParent = new Map<string, any[]>();
    for (const r of (repliesData || [])) {
      const list = repliesByParent.get(r.parent_id) || [];
      list.push(r);
      repliesByParent.set(r.parent_id, list);
    }

    const mapped: Comment[] = (commentsData || []).map((c: any) => ({
      id: c.id,
      author: c.author?.username || 'inconnu',
      authorId: c.author?.id || '',
      avatar: c.author?.avatar_url || '',
      content: c.content,
      timestamp: timeAgo(c.created_at),
      likes: c.likes_count || 0,
      isLiked: userLikes.has(c.id),
      isCreator: c.author?.username === quizAuthor,
      replies: (repliesByParent.get(c.id) || []).map((r: any) => ({
        id: r.id,
        author: r.author?.username || 'inconnu',
        authorId: r.author?.id || '',
        avatar: r.author?.avatar_url || '',
        content: r.content,
        timestamp: timeAgo(r.created_at),
        likes: r.likes_count || 0,
        isLiked: userLikes.has(r.id),
        isCreator: r.author?.username === quizAuthor,
      })),
    }));

    setComments(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [quizId]);

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;
    const comment = comments.find(c => c.id === commentId);
    const reply = !comment ? comments.flatMap(c => c.replies).find(r => r.id === commentId) : null;
    const target = comment || reply;
    if (!target) return;

    const isLiked = target.isLiked;

    // Optimistic update
    const updateLike = (items: Comment[]): Comment[] => items.map(c => {
      if (c.id === commentId) return { ...c, isLiked: !isLiked, likes: isLiked ? c.likes - 1 : c.likes + 1 };
      return { ...c, replies: c.replies.map(r =>
        r.id === commentId ? { ...r, isLiked: !isLiked, likes: isLiked ? r.likes - 1 : r.likes + 1 } : r
      )};
    });
    setComments(updateLike);

    if (isLiked) {
      await supabase.from('quiz_comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
    } else {
      await supabase.from('quiz_comment_likes').insert({ comment_id: commentId, user_id: user.id });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;
    const content = newComment.trim();
    setNewComment('');

    const { data, error } = await supabase
      .from('quiz_comments')
      .insert({ quiz_id: quizId, user_id: user.id, content })
      .select('*, author:user_id(id, username, avatar_url)')
      .single();

    if (error) {
      console.error('Failed to add comment:', error);
      return;
    }

    const newC: Comment = {
      id: data.id,
      author: data.author?.username || profile?.username || 'vous',
      authorId: user.id,
      avatar: data.author?.avatar_url || '',
      content: data.content,
      timestamp: "À l'instant",
      likes: 0,
      isLiked: false,
      isCreator: false,
      replies: [],
    };
    setComments(prev => [newC, ...prev]);
  };

  const handleAddReply = async (parentId: string) => {
    if (!replyText.trim() || !user) return;
    const content = replyText.trim();
    setReplyText('');
    setReplyingTo(null);

    const { data, error } = await supabase
      .from('quiz_comments')
      .insert({ quiz_id: quizId, user_id: user.id, parent_id: parentId, content })
      .select('*, author:user_id(id, username, avatar_url)')
      .single();

    if (error) {
      console.error('Failed to add reply:', error);
      return;
    }

    const newReply: Reply = {
      id: data.id,
      author: data.author?.username || profile?.username || 'vous',
      authorId: user.id,
      avatar: data.author?.avatar_url || '',
      content: data.content,
      timestamp: "À l'instant",
      likes: 0,
      isLiked: false,
      isCreator: false,
    };

    setComments(prev => prev.map(c =>
      c.id === parentId ? { ...c, replies: [...c.replies, newReply] } : c
    ));
    setExpandedReplies(prev => new Set(prev).add(parentId));
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const renderAvatar = (avatar: string, name: string, size: number = 32) => (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: avatar ? undefined : '#6c5ce7' }}
    >
      {avatar ? (
        <img src={avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.4, fontWeight: 700, color: '#fff' }}>{name[0]?.toUpperCase() || '?'}</span>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={20} className="animate-spin" style={{ color: '#6c5ce7' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* New comment input */}
      {user && (
        <div className="flex items-center gap-2">
          {renderAvatar(profile?.avatarImage || '', profile?.username || 'V', 32)}
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: '#1a1a25', border: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              placeholder="Ajouter un commentaire..."
              className="flex-1 bg-transparent outline-none"
              style={{ fontSize: '13px', color: '#e8e8ed' }}
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
              style={{ background: newComment.trim() ? '#6c5ce7' : 'transparent' }}
            >
              <Send size={14} style={{ color: '#fff' }} />
            </button>
          </div>
        </div>
      )}

      {/* Comments list */}
      {comments.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#555570', textAlign: 'center', padding: '12px 0' }}>Aucun commentaire</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id}>
              <div className="flex gap-2.5">
                {renderAvatar(comment.avatar, comment.author, 32)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                      {comment.author}
                    </span>
                    {comment.isCreator && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: 'rgba(108,92,231,0.2)', fontSize: '10px', fontWeight: 700, color: '#6c5ce7' }}>
                        <Crown size={10} /> Créateur
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: '#555570' }}>{comment.timestamp}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#c8c8d0', lineHeight: '1.4', marginBottom: '6px' }}>
                    {comment.content}
                  </p>
                  <div className="flex items-center gap-4">
                    <button onClick={() => handleLikeComment(comment.id)} className="flex items-center gap-1 transition-colors">
                      <Heart size={14} fill={comment.isLiked ? '#ef4444' : 'none'} style={{ color: comment.isLiked ? '#ef4444' : '#555570' }} />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: comment.isLiked ? '#ef4444' : '#555570' }}>
                        {comment.likes}
                      </span>
                    </button>
                    {user && (
                      <button
                        onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(''); }}
                        className="flex items-center gap-1"
                      >
                        <MessageCircle size={14} style={{ color: '#555570' }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#555570' }}>Répondre</span>
                      </button>
                    )}
                  </div>

                  {comment.replies.length > 0 && (
                    <button onClick={() => toggleReplies(comment.id)} className="flex items-center gap-1 mt-2">
                      {expandedReplies.has(comment.id) ? (
                        <ChevronUp size={14} style={{ color: '#6c5ce7' }} />
                      ) : (
                        <ChevronDown size={14} style={{ color: '#6c5ce7' }} />
                      )}
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#6c5ce7' }}>
                        {comment.replies.length} réponse{comment.replies.length > 1 ? 's' : ''}
                      </span>
                    </button>
                  )}

                  {expandedReplies.has(comment.id) && (
                    <div className="mt-3 space-y-3 pl-2 border-l-2" style={{ borderColor: 'rgba(108,92,231,0.2)' }}>
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-2">
                          {renderAvatar(reply.avatar, reply.author, 24)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#e8e8ed' }}>{reply.author}</span>
                              {reply.isCreator && (
                                <span className="flex items-center gap-0.5 px-1 py-0.5 rounded" style={{ background: 'rgba(108,92,231,0.2)', fontSize: '9px', fontWeight: 700, color: '#6c5ce7' }}>
                                  <Crown size={8} /> Créateur
                                </span>
                              )}
                              <span style={{ fontSize: '10px', color: '#555570' }}>{reply.timestamp}</span>
                            </div>
                            <p style={{ fontSize: '12px', color: '#c8c8d0', lineHeight: '1.4', marginBottom: '4px' }}>{reply.content}</p>
                            <button onClick={() => handleLikeComment(reply.id)} className="flex items-center gap-1">
                              <Heart size={12} fill={reply.isLiked ? '#ef4444' : 'none'} style={{ color: reply.isLiked ? '#ef4444' : '#555570' }} />
                              <span style={{ fontSize: '11px', fontWeight: 600, color: reply.isLiked ? '#ef4444' : '#555570' }}>{reply.likes}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {replyingTo === comment.id && (
                    <div className="flex items-center gap-2 mt-3">
                      {renderAvatar(profile?.avatarImage || '', profile?.username || 'V', 24)}
                      <div className="flex-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: '#1a1a25', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddReply(comment.id)}
                          placeholder={`Répondre à ${comment.author}...`}
                          className="flex-1 bg-transparent outline-none"
                          style={{ fontSize: '12px', color: '#e8e8ed' }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleAddReply(comment.id)}
                          disabled={!replyText.trim()}
                          className="p-1 rounded transition-colors disabled:opacity-30"
                          style={{ background: replyText.trim() ? '#6c5ce7' : 'transparent' }}
                        >
                          <Send size={12} style={{ color: '#fff' }} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
