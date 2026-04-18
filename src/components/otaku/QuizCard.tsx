import React, { useState, useEffect } from 'react';
import { Play, Users, Clock, Square, Trophy, Trash2 } from 'lucide-react';
import type { Quiz } from './types';

interface QuizCardProps {
  quiz: Quiz;
  onPlay: () => void;
  onEnd?: () => void;
  onDelete?: () => void;
  isCreator?: boolean;
  hasPlayed?: boolean;
}

export function QuizCard({ quiz, onPlay, onEnd, onDelete, isCreator, hasPlayed }: QuizCardProps) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    if (quiz.status === 'ended') return;

    const updateTimer = () => {
      const endTime = quiz.createdAt.getTime() + quiz.duration * 60 * 60 * 1000;
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        setTimeRemaining('Terminé');
        return;
      }

      const hours = Math.floor(diff / (60 * 60 * 1000));
      const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeRemaining(`${days}j ${hours % 24}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}min`);
      } else {
        setTimeRemaining(`${minutes}min`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [quiz.status, quiz.createdAt, quiz.duration]);

  const isEnded = quiz.status === 'ended' || timeRemaining === 'Terminé';

  return (
    <div
      className="p-4 rounded-2xl border hover:bg-[#1f1f2e] transition-all cursor-pointer group relative"
      style={{
        background: '#111119',
        borderColor: 'rgba(255,255,255,0.06)',
        opacity: isEnded ? 0.7 : 1,
      }}
      onClick={onPlay}
    >
      {/* Status badge */}
      <div
        className="absolute top-3 right-3 px-2 py-0.5 rounded-full flex items-center gap-1"
        style={{
          background: isEnded ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
          border: `1px solid ${isEnded ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
        }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: isEnded ? '#ef4444' : '#22c55e' }}
        />
        <span style={{ fontSize: '10px', fontWeight: 600, color: isEnded ? '#ef4444' : '#22c55e' }}>
          {isEnded ? 'Terminé' : 'En cours'}
        </span>
      </div>

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
          <h4 className="mb-1 pr-16" style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
            🧠 {quiz.title}
          </h4>
          <p className="mb-2" style={{ fontSize: '11px', color: '#8888a0' }}>
            par @{quiz.author} · {quiz.questionsCount} questions
          </p>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
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
                  : quiz.playersCount}
                {quiz.maxPlayers ? `/${quiz.maxPlayers}` : ''} joueurs
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#555570' }}>·</span>
            <div className="flex items-center gap-1">
              <Clock size={12} style={{ color: isEnded ? '#ef4444' : '#ffd200' }} />
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: isEnded ? '#ef4444' : '#ffd200',
              }}>
                {isEnded ? 'Terminé' : timeRemaining}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        {isEnded || hasPlayed ? (
          <div
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg cursor-pointer hover:bg-[#262638] transition-colors"
            style={{ background: '#1f1f2e' }}
          >
            <Trophy size={14} style={{ color: '#ffd200' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffd200' }}>
              Voir résultats
            </span>
          </div>
        ) : (
          <div
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg cursor-pointer transition-all group-hover:scale-[1.02]"
            style={{ background: '#6c5ce7' }}
          >
            <Play size={14} fill="#ffffff" color="#ffffff" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
              Jouer
            </span>
          </div>
        )}
        {isCreator && !isEnded && (
          <div
            onClick={(e) => { e.stopPropagation(); onEnd?.(); }}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg cursor-pointer hover:bg-[#262638] transition-colors"
            style={{ background: '#1f1f2e' }}
          >
            <Square size={14} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444' }}>
              Terminer
            </span>
          </div>
        )}
        {isCreator && isEnded && (
          <div
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg cursor-pointer hover:bg-[#2a1a1a] transition-colors"
            style={{ background: '#1f1f2e' }}
          >
            <Trash2 size={14} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444' }}>
              Supprimer
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
