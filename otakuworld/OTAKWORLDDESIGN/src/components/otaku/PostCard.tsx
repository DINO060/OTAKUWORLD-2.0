import React from 'react';
import { MessageCircle, Repeat2, Heart, Share2, Play } from 'lucide-react';
import type { Post } from './types';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
}

export function PostCard({ post, onLike }: PostCardProps) {
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}j`;
  };

  const getAvatarColor = (id: string) => {
    const colors = ['#6c5ce7', '#22c55e', '#ef4444', '#f59e0b', '#4facfe'];
    return colors[parseInt(id) % colors.length];
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
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
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
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
              {post.user.username}
            </span>
            <span style={{ fontSize: '12px', color: '#8888a0' }}>
              {post.user.handle}
            </span>
            <span style={{ fontSize: '12px', color: '#555570' }}>·</span>
            <span style={{ fontSize: '12px', color: '#8888a0' }}>
              {getRelativeTime(post.timestamp)}
            </span>
          </div>

          {/* Post Content */}
          <p
            className="whitespace-pre-wrap mb-3"
            style={{
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#e8e8ed',
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
                  : post.images.length === 2
                  ? 'grid-cols-2'
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
                  <img
                    src={image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
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
              <button
                className="px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-[#262638] transition-colors"
                style={{ background: '#1f1f2e' }}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#6c5ce7' }}>
                  LIRE
                </span>
                <Play size={14} style={{ color: '#6c5ce7' }} />
              </button>
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
              <button
                className="px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-[#262638] transition-colors"
                style={{ background: '#1f1f2e' }}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffd200' }}>
                  JOUER
                </span>
                <Play size={14} style={{ color: '#ffd200' }} />
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 group">
              <MessageCircle
                size={18}
                style={{ color: '#8888a0' }}
                className="group-hover:text-[#4facfe] transition-colors"
              />
              <span
                className="group-hover:text-[#4facfe] transition-colors"
                style={{ fontSize: '12px', color: '#8888a0' }}
              >
                {post.comments}
              </span>
            </button>

            <button className="flex items-center gap-2 group">
              <Repeat2
                size={18}
                style={{ color: '#8888a0' }}
                className="group-hover:text-[#22c55e] transition-colors"
              />
              <span
                className="group-hover:text-[#22c55e] transition-colors"
                style={{ fontSize: '12px', color: '#8888a0' }}
              >
                {post.reposts}
              </span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike(post.id);
              }}
              className="flex items-center gap-2 group"
            >
              <Heart
                size={18}
                style={{
                  color: post.isLiked ? '#ef4444' : '#8888a0',
                  fill: post.isLiked ? '#ef4444' : 'none',
                }}
                className="group-hover:text-[#ef4444] transition-all"
              />
              <span
                className="group-hover:text-[#ef4444] transition-colors"
                style={{
                  fontSize: '12px',
                  color: post.isLiked ? '#ef4444' : '#8888a0',
                }}
              >
                {post.likes}
              </span>
            </button>

            <button className="flex items-center gap-2 group">
              <Share2
                size={18}
                style={{ color: '#8888a0' }}
                className="group-hover:text-[#6c5ce7] transition-colors"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}