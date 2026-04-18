import React from 'react';
import { Share2, RotateCcw, Trophy } from 'lucide-react';
import type { Quiz } from './types';

interface QuizResultPageProps {
  quiz: Quiz;
  score: number;
  maxScore: number;
  correctAnswers: number;
  totalQuestions: number;
  bestStreak: number;
  onBack: () => void;
}

export function QuizResultPage({
  quiz,
  score,
  maxScore,
  correctAnswers,
  totalQuestions,
  bestStreak,
  onBack,
}: QuizResultPageProps) {
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  const getBadge = () => {
    if (percentage >= 100) return { emoji: '💎', label: 'OTAKU DIAMOND', color: '#6c5ce7' };
    if (percentage >= 90) return { emoji: '🥇', label: 'OTAKU EXPERT', color: '#ffd200' };
    if (percentage >= 70) return { emoji: '🥈', label: 'OTAKU PRO', color: '#8888a0' };
    if (percentage >= 50) return { emoji: '🥉', label: 'OTAKU BRONZE', color: '#f59e0b' };
    return { emoji: '🎯', label: 'DÉBUTANT', color: '#555570' };
  };

  const badge = getBadge();

  const getRank = () => {
    if (percentage >= 90) return 'Top 5% des joueurs';
    if (percentage >= 70) return 'Top 20% des joueurs';
    if (percentage >= 50) return 'Top 50% des joueurs';
    return 'Continue à t\'entraîner!';
  };

  return (
    <div className="h-full flex flex-col" style={{ background: '#0c0c14' }}>
      {/* Content */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-6 py-8">
          {/* Celebration */}
          <div style={{ fontSize: '64px' }}>🎉</div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#e8e8ed' }}>
            Quiz terminé!
          </h2>

          {/* Score */}
          <div>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#e8e8ed', marginBottom: '8px' }}>
              Score: {score}/{maxScore} pts
            </p>
            <p style={{ fontSize: '15px', color: '#8888a0' }}>
              {correctAnswers}/{totalQuestions} bonnes réponses
            </p>
          </div>

          {/* Badge */}
          <div
            className="mx-auto max-w-sm p-6 rounded-2xl border"
            style={{
              background: 'rgba(108,92,231,0.12)',
              borderColor: badge.color,
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>{badge.emoji}</div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: badge.color }}>
              Tu es un {badge.label}!
            </h3>
            <p style={{ fontSize: '11px', color: '#8888a0', marginTop: '4px' }}>
              Badge débloqué
            </p>
          </div>

          {/* Stats */}
          <div className="space-y-2">
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8ed' }}>
              {getRank()}
            </p>
            {bestStreak > 0 && (
              <p style={{ fontSize: '13px', color: '#8888a0' }}>
                Meilleur série: <span style={{ fontWeight: 700, color: '#ffd200' }}>🔥 x{bestStreak}</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onBack}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors"
              style={{
                background: '#1a1a25',
                fontSize: '13px',
                fontWeight: 700,
                color: '#e8e8ed',
              }}
            >
              <Share2 size={16} />
              Partager
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors"
              style={{
                background: '#6c5ce7',
                fontSize: '13px',
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              <RotateCcw size={16} />
              Rejouer
            </button>
          </div>

          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors"
            style={{
              background: '#1a1a25',
              fontSize: '13px',
              fontWeight: 700,
              color: '#e8e8ed',
            }}
          >
            <Trophy size={16} />
            Classement
          </button>
        </div>
      </div>
    </div>
  );
}
