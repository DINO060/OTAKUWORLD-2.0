import React, { useState } from 'react';
import { X, Image as ImageIcon, BookOpen, Brain, BarChart3 } from 'lucide-react';
import type { User } from '../../App';

interface ComposePostProps {
  currentUser: User | null;
  onClose: () => void;
  onPost: (content: string, images?: string[]) => void;
}

export function ComposePost({ currentUser, onClose, onPost }: ComposePostProps) {
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const popularTags = ['#manga', '#anime', '#webtoon', '#onepiece', '#jjk', '#naruto'];

  const handlePost = () => {
    if (content.trim()) {
      onPost(content.trim());
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  if (!currentUser) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300"
        style={{
          background: '#111119',
          borderRadius: '20px 20px 0 0',
          maxHeight: '90vh',
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: '#555570' }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
            Nouveau Post
          </h2>
          <button
            onClick={handlePost}
            disabled={!content.trim()}
            className="px-4 py-2 rounded-lg transition-opacity"
            style={{
              background: content.trim() ? '#6c5ce7' : '#1f1f2e',
              fontSize: '13px',
              fontWeight: 700,
              color: content.trim() ? '#ffffff' : '#555570',
              opacity: content.trim() ? 1 : 0.5,
            }}
          >
            Publier
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {/* User Info */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
              style={{ background: '#6c5ce7' }}
            >
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                  {currentUser.username[0].toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                {currentUser.username}
              </p>
            </div>
          </div>

          {/* Text Input */}
          <div className="px-4 pb-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Quoi de neuf dans le monde otaku?"
              className="w-full bg-transparent border-none outline-none resize-none"
              style={{
                fontSize: '14px',
                lineHeight: '1.5',
                color: '#e8e8ed',
                minHeight: '120px',
              }}
              autoFocus
              maxLength={280}
            />
            <div className="flex justify-end mt-2">
              <span style={{ fontSize: '11px', color: '#8888a0' }}>
                {content.length}/280
              </span>
            </div>
          </div>

          {/* Tags */}
          <div className="px-4 pb-4">
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#8888a0', marginBottom: '8px' }}>
              Tags populaires:
            </p>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="px-3 py-1 rounded-full transition-colors"
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    background: selectedTags.includes(tag)
                      ? 'rgba(108,92,231,0.12)'
                      : '#1a1a25',
                    color: selectedTags.includes(tag) ? '#6c5ce7' : '#8888a0',
                    border: selectedTags.includes(tag)
                      ? '1px solid #6c5ce7'
                      : '1px solid transparent',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div
          className="flex items-center gap-4 px-4 py-3 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
          >
            <ImageIcon size={18} style={{ color: '#8888a0' }} />
            <span style={{ fontSize: '12px', color: '#8888a0' }}>Image</span>
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
          >
            <BookOpen size={18} style={{ color: '#8888a0' }} />
            <span style={{ fontSize: '12px', color: '#8888a0' }}>Chapter</span>
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
          >
            <Brain size={18} style={{ color: '#8888a0' }} />
            <span style={{ fontSize: '12px', color: '#8888a0' }}>Quiz</span>
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
          >
            <BarChart3 size={18} style={{ color: '#8888a0' }} />
            <span style={{ fontSize: '12px', color: '#8888a0' }}>Poll</span>
          </button>
        </div>
      </div>
    </>
  );
}
