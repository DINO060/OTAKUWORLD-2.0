import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Repeat2, Heart, Share2, Play, Send, Trash2, Copy, Check, X } from 'lucide-react';

const getDisplayName = (username: string) => username.startsWith('user_') ? 'Anonyme' : username;
import { supabase } from '../../lib/supabase';
import type { Post } from './types';

interface PostCardProps {
  post: Post;
  currentUser: { id: string; username: string; handle: string; avatar: string } | null;
  onLike: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onEmbedAction?: (type: 'chapter' | 'quiz' | 'game') => void;
  onUserClick?: (user: Post['user']) => void;
}

interface Comment {
  id: string;
  user: string;
  userId: string;
  avatar: string;
  text: string;
  time: string;
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors"
      style={{ background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(136,136,160,0.15)' }}
      title="Copier le code"
    >
      {copied ? <Check size={11} style={{ color: '#22c55e' }} /> : <Copy size={11} style={{ color: '#8888a0' }} />}
      <span style={{ fontSize: '11px', fontWeight: 600, color: copied ? '#22c55e' : '#8888a0' }}>
        {copied ? 'Copié !' : code}
      </span>
    </button>
  );
}

export function PostCard({ post, currentUser, onLike, onDelete, onEmbedAction, onUserClick }: PostCardProps) {
  const [isReposted, setIsReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(post.reposts);
  const [votedOption, setVotedOption] = useState<string | null>(null);
  const [pollVotes, setPollVotes] = useState(post.poll?.options.map(o => o.votes) || []);
  const totalPollVotes = pollVotes.reduce((a, b) => a + b, 0);
  const [copied, setCopied] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [loadingComments, setLoadingComments] = useState(false);

  // ── Load comments from DB ───────────────────────────────────────────
  const loadComments = useCallback(async () => {
    if (loadingComments) return;
    setLoadingComments(true);
    const { data } = await supabase
      .from('feed_post_comments')
      .select('id, content, created_at, user_id, profile:user_id(username, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (data) {
      setComments(data.map((c: any) => ({
        id: c.id,
        user: c.profile?.username || 'Unknown',
        userId: c.user_id,
        avatar: c.profile?.avatar_url || '',
        text: c.content,
        time: getRelativeTime(new Date(c.created_at)),
      })));
    }
    setLoadingComments(false);
  }, [post.id]);

  // Load comments when reply section opens
  useEffect(() => {
    if (showReply) loadComments();
  }, [showReply, loadComments]);

  // ── Check poll vote ─────────────────────────────────────────────────
  useEffect(() => {
    if (post.type === 'poll' && currentUser) {
      supabase
        .from('feed_poll_votes')
        .select('option_id')
        .eq('post_id', post.id)
        .eq('user_id', currentUser.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setVotedOption(data.option_id);
        });
    }
  }, [post.id, post.type, currentUser]);

  // ── Delete comment ──────────────────────────────────────────────────
  const deleteComment = async (commentId: string) => {
    await supabase.from('feed_post_comments').delete().eq('id', commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
    setCommentCount(c => Math.max(0, c - 1));
  };

  // ── Submit comment ──────────────────────────────────────────────────
  const submitComment = async () => {
    if (!replyText.trim() || !currentUser) return;

    const { error } = await supabase.from('feed_post_comments').insert({
      post_id: post.id,
      user_id: currentUser.id,
      content: replyText.trim(),
    });

    if (!error) {
      setComments(prev => [...prev, {
        id: `temp_${Date.now()}`,
        user: currentUser.username,
        userId: currentUser.id,
        avatar: currentUser.avatar,
        text: replyText.trim(),
        time: 'now',
      }]);
      setCommentCount(c => c + 1);
      setReplyText('');
    }
  };

  // ── Poll vote ───────────────────────────────────────────────────────
  const handlePollVote = async (optionId: string, optionIndex: number) => {
    if (votedOption || !currentUser) return;

    setVotedOption(optionId);
    setPollVotes(prev => prev.map((v, j) => j === optionIndex ? v + 1 : v));

    // Insert vote
    await supabase.from('feed_poll_votes').insert({
      post_id: post.id,
      user_id: currentUser.id,
      option_id: optionId,
    });

    // Update poll_options JSONB in feed_posts (increment vote count)
    if (post.poll) {
      const updatedOptions = post.poll.options.map((o, i) =>
        i === optionIndex ? { ...o, votes: o.votes + 1 } : o
      );
      await supabase.from('feed_posts').update({ poll_options: updatedOptions }).eq('id', post.id);
    }
  };

  const handleRepost = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsReposted(prev => {
      setRepostCount(c => prev ? c - 1 : c + 1);
      return !prev;
    });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}j`;
  };

  const getAvatarColor = (id: string) => {
    const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div
      className="p-4 hover:bg-[#111119] transition-colors cursor-pointer"
      style={{ background: '#0c0c14' }}
    >
      {/* User Header */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          onClick={(e) => { e.stopPropagation(); onUserClick?.(post.user); }}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
          style={{ background: getAvatarColor(post.user.id) }}
        >
          {post.user.avatar ? (
            <img
              src={post.user.avatar}
              alt={post.user.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
              {post.user.username[0].toUpperCase()}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Username & Time */}
          <div className="flex items-center gap-2 mb-1">
            <span
              onClick={(e) => { e.stopPropagation(); onUserClick?.(post.user); }}
              className="cursor-pointer hover:underline"
              style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}
            >
              {getDisplayName(post.user.username)}
            </span>
            {!post.user.username.startsWith('user_') && (
              <span
                onClick={(e) => { e.stopPropagation(); onUserClick?.(post.user); }}
                className="cursor-pointer hover:underline"
                style={{ fontSize: '12px', color: '#8888a0' }}
              >
                {post.user.handle}
              </span>
            )}
            <span style={{ fontSize: '12px', color: '#555570' }}>·</span>
            <span style={{ fontSize: '12px', color: '#8888a0' }}>
              {getRelativeTime(post.timestamp)}
            </span>
            {/* Delete button for own posts */}
            {onDelete && (
              <div
                onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}
                className="ml-auto cursor-pointer p-1 rounded hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={14} style={{ color: '#ef4444' }} />
              </div>
            )}
          </div>

          {/* Post Content */}
          <p
            className="whitespace-pre-wrap mb-3"
            style={{
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#e8e8ed',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
          >
            {post.content}
          </p>

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <div
              className={`mb-3 grid gap-2 ${
                post.images.length === 1
                  ? 'grid-cols-1'
                  : 'grid-cols-2'
              }`}
            >
              {post.images.map((image, index) => (
                <div
                  key={index}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    aspectRatio: post.images!.length === 1 ? '16/10' : '1',
                    gridColumn: post.images!.length === 3 && index === 0 ? 'span 2' : 'auto',
                  }}
                >
                  {image.startsWith('data:video/') || image.match(/\.(mp4|webm|mov)$/i) ? (
                    <video
                      src={image}
                      controls
                      className="w-full h-full object-cover"
                      style={{ background: '#000' }}
                    />
                  ) : (
                    <img
                      src={image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Chapter Embed */}
          {post.embed && post.embed.type === 'chapter' && (
            <div
              className="mb-3 p-3 rounded-2xl border flex items-center justify-between hover:bg-[#1f1f2e] transition-colors"
              style={{
                background: '#111119',
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-start gap-3 flex-1">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(240,147,251,0.12)' }}
                >
                  <span style={{ fontSize: '20px' }}>{post.embed.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                    {post.embed.title}
                  </p>
                  <p style={{ fontSize: '12px', color: '#8888a0' }}>
                    {post.embed.subtitle}
                  </p>
                </div>
              </div>
              <div
                onClick={(e) => { e.stopPropagation(); onEmbedAction?.('chapter'); }}
                className="px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-[#262638] transition-colors cursor-pointer select-none"
                style={{ background: '#1f1f2e' }}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#6c5ce7' }}>
                  LIRE
                </span>
                <Play size={14} style={{ color: '#6c5ce7' }} />
              </div>
            </div>
          )}

          {/* Quiz Embed */}
          {post.embed && post.embed.type === 'quiz' && (
            <div
              className="mb-3 p-3 rounded-2xl border flex items-center justify-between hover:bg-[#1f1f2e] transition-colors"
              style={{
                background: '#111119',
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-start gap-3 flex-1">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,210,0,0.12)' }}
                >
                  <span style={{ fontSize: '20px' }}>{post.embed.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                    {post.embed.title}
                  </p>
                  <p style={{ fontSize: '12px', color: '#8888a0' }}>
                    {post.embed.subtitle}
                  </p>
                </div>
              </div>
              <div
                onClick={(e) => { e.stopPropagation(); onEmbedAction?.('quiz'); }}
                className="px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-[#262638] transition-colors cursor-pointer select-none"
                style={{ background: '#1f1f2e' }}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffd200' }}>
                  JOUER
                </span>
                <Play size={14} style={{ color: '#ffd200' }} />
              </div>
            </div>
          )}

          {/* Game Embed */}
          {post.embed && post.embed.type === 'game' && (
            <div
              className="mb-3 p-3 rounded-2xl border flex items-center justify-between hover:bg-[#1f1f2e] transition-colors"
              style={{
                background: '#111119',
                borderColor: 'rgba(239,68,68,0.2)',
              }}
            >
              <div className="flex items-start gap-3 flex-1">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(239,68,68,0.12)' }}
                >
                  <span style={{ fontSize: '20px' }}>🐺</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                    {post.embed.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p style={{ fontSize: '12px', color: '#8888a0' }}>
                      {post.embed.subtitle}
                    </p>
                    {(() => {
                      const codeMatch = post.embed.subtitle?.match(/Code:\s*(\S+)/);
                      if (!codeMatch) return null;
                      const code = codeMatch[1];
                      return (
                        <CopyCodeButton code={code} />
                      );
                    })()}
                  </div>
                </div>
              </div>
              <div
                onClick={(e) => { e.stopPropagation(); onEmbedAction?.('game'); }}
                className="px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-[#262638] transition-colors cursor-pointer select-none"
                style={{ background: 'rgba(239,68,68,0.15)' }}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444' }}>
                  REJOINDRE
                </span>
                <Play size={14} style={{ color: '#ef4444' }} />
              </div>
            </div>
          )}

          {/* Poll */}
          {post.poll && (
            <div className="mb-3 space-y-2">
              {post.poll.options.map((option, i) => {
                const pct = totalPollVotes > 0 ? Math.round((pollVotes[i] / totalPollVotes) * 100) : 0;
                const isVoted = votedOption === option.id;
                return (
                  <div
                    key={option.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePollVote(option.id, i);
                    }}
                    className="relative rounded-xl overflow-hidden cursor-pointer transition-colors"
                    style={{
                      background: '#1a1a25',
                      border: isVoted ? '1px solid #4facfe' : '1px solid rgba(255,255,255,0.06)',
                      padding: '10px 14px',
                    }}
                  >
                    {votedOption && (
                      <div
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: isVoted ? 'rgba(79,172,254,0.12)' : 'rgba(255,255,255,0.03)',
                          width: `${pct}%`,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    )}
                    <div className="relative flex items-center justify-between">
                      <span style={{ fontSize: '13px', fontWeight: isVoted ? 700 : 500, color: isVoted ? '#4facfe' : '#e8e8ed' }}>
                        {option.text}
                      </span>
                      {votedOption && (
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#8888a0' }}>{pct}%</span>
                      )}
                    </div>
                  </div>
                );
              })}
              <p style={{ fontSize: '11px', color: '#555570', marginTop: '6px' }}>
                {totalPollVotes} vote{totalPollVotes !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between select-none" style={{ marginTop: '10px' }}>
            <div className="flex items-center" style={{ gap: '20px' }}>
              {/* Comment */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReply(prev => !prev);
                }}
                className="cursor-pointer hover:opacity-80"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: showReply ? '#4facfe' : '#8888a0' }}
              >
                <MessageCircle size={16} style={{ verticalAlign: 'middle' }} />
                <span style={{ fontSize: '13px', lineHeight: '16px' }}>{commentCount}</span>
              </div>

              {/* Repost */}
              <div
                onClick={handleRepost}
                className="cursor-pointer hover:opacity-80"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: isReposted ? '#22c55e' : '#8888a0' }}
              >
                <Repeat2 size={16} style={{ verticalAlign: 'middle' }} />
                <span style={{ fontSize: '13px', lineHeight: '16px' }}>{repostCount}</span>
              </div>

              {/* Like */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onLike(post.id);
                }}
                className="cursor-pointer hover:opacity-80"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: post.isLiked ? '#ef4444' : '#8888a0' }}
              >
                <Heart
                  size={16}
                  fill={post.isLiked ? '#ef4444' : 'none'}
                  color={post.isLiked ? '#ef4444' : '#8888a0'}
                  style={{ verticalAlign: 'middle' }}
                />
                <span style={{ fontSize: '13px', lineHeight: '16px' }}>{post.likes}</span>
              </div>
            </div>

            {/* Share */}
            <div
              onClick={handleShare}
              className="cursor-pointer hover:opacity-80"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: copied ? '#6c5ce7' : '#8888a0' }}
            >
              {copied
                ? <span style={{ fontSize: '12px', fontWeight: 600 }}>Copié ✓</span>
                : <Share2 size={16} style={{ verticalAlign: 'middle' }} />
              }
            </div>
          </div>

          {/* Comments section */}
          {showReply && (
            <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '12px' }}>
              {/* Comments list */}
              <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '10px' }}>
                {comments.length === 0 && !loadingComments && (
                  <p style={{ fontSize: '12px', color: '#555570', textAlign: 'center', padding: '8px 0' }}>
                    Aucun commentaire
                  </p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2 group/comment" style={{ marginBottom: '10px' }}>
                    <div
                      className="flex items-center justify-center flex-shrink-0 overflow-hidden rounded-lg"
                      style={{ width: '28px', height: '28px', background: getAvatarColor(c.userId) }}
                    >
                      {c.avatar ? (
                        <img src={c.avatar} alt={c.user} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{getDisplayName(c.user)[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#e8e8ed' }}>{getDisplayName(c.user)}</span>
                        <span style={{ fontSize: '11px', color: '#555570' }}>{c.time}</span>
                        {currentUser && c.userId === currentUser.id && (
                          <button
                            onClick={() => deleteComment(c.id)}
                            className="opacity-0 group-hover/comment:opacity-100 transition-opacity ml-auto p-0.5 rounded hover:bg-red-500/20"
                          >
                            <X size={11} style={{ color: '#ef4444' }} />
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: '13px', color: '#b0b0c0', lineHeight: '1.4', margin: 0, wordBreak: 'break-word' }}>{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply input */}
              {currentUser && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitComment();
                    }}
                    placeholder="Écrire un commentaire..."
                    maxLength={500}
                    className="flex-1 outline-none"
                    style={{
                      background: '#1a1a25',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      color: '#e8e8ed',
                    }}
                    autoFocus
                  />
                  <div
                    onClick={submitComment}
                    className="cursor-pointer hover:opacity-80"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: replyText.trim() ? '#6c5ce7' : '#1a1a25',
                    }}
                  >
                    <Send size={14} color={replyText.trim() ? '#fff' : '#555570'} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
