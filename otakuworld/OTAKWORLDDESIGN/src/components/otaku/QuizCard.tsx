import React from 'react';
import { Play, Users } from 'lucide-react';
import type { Quiz } from './types';

interface QuizCardProps {
  quiz: Quiz;
  onPlay: () => void;
}

export function QuizCard({ quiz, onPlay }: QuizCardProps) {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < rating ? '#ffd200' : '#555570' }}>
        ⭐
      </span>
    ));
  };

  return (
    <div
      className="p-4 rounded-2xl border hover:bg-[#1f1f2e] transition-all cursor-pointer group"
      style={{
        background: '#111119',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
      onClick={onPlay}
    >
      <div className="flex items-start gap-3">
        {/* Cover */}
        {quiz.coverImage ? (
          <div
            className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #ffd200 0%, #f7971e 100%)',
            }}
          >
            <img
              src={quiz.coverImage}
              alt={quiz.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #ffd200 0%, #f7971e 100%)',
            }}
          >
            <span style={{ fontSize: '32px' }}>{quiz.categoryEmoji}</span>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="mb-1" style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
            🧠 {quiz.title}
          </h4>
          <p className="mb-2" style={{ fontSize: '11px', color: '#8888a0' }}>
            par @{quiz.author} · {quiz.questionsCount} questions
          </p>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-1">
              <span style={{ fontSize: '11px', color: '#8888a0' }}>🎯</span>
              <span style={{ fontSize: '11px', color: '#8888a0' }}>
                {quiz.category}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#555570' }}>·</span>
            <div className="flex items-center gap-1">
              <Users size={12} style={{ color: '#8888a0' }} />
              <span style={{ fontSize: '11px', color: '#8888a0' }}>
                {quiz.playersCount >= 1000
                  ? `${(quiz.playersCount / 1000).toFixed(1)}k`
                  : quiz.playersCount}{' '}
                joueurs
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {renderStars(quiz.rating)}
          </div>
        </div>

        {/* Play Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all group-hover:scale-105"
          style={{
            background: '#6c5ce7',
            fontSize: '12px',
            fontWeight: 700,
            color: '#ffffff',
          }}
        >
          <Play size={14} fill="#ffffff" />
          Jouer
        </button>
      </div>
    </div>
  );
}
