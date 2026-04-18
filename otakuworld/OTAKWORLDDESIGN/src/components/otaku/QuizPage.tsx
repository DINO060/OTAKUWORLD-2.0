import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { QuizCard } from './QuizCard';
import { QuizPlayPage } from './QuizPlayPage';
import { CreateQuizSheet } from './CreateQuizSheet';
import type { Quiz } from './types';

type QuizTab = 'popular' | 'recent' | 'mine';

export function QuizPage() {
  const [activeTab, setActiveTab] = useState<QuizTab>('popular');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);

  // Mock data
  const topPlayers = [
    { rank: 1, name: 'Alex', emoji: '🥇', points: 2450 },
    { rank: 2, name: 'DINO', emoji: '🥈', points: 2180 },
    { rank: 3, name: 'Sophie', emoji: '🥉', points: 1920 },
  ];

  const quizzes: Quiz[] = [
    {
      id: '1',
      title: 'Connais-tu les Kage?',
      author: 'marie',
      questionsCount: 10,
      category: 'Naruto',
      categoryEmoji: '🍥',
      playersCount: 2400,
      rating: 4.0,
      coverImage: 'https://images.unsplash.com/photo-1691390927195-3f3b16849982?w=400&h=300&fit=crop',
    },
    {
      id: '2',
      title: 'Quel perso es-tu? (JJK)',
      author: 'alex',
      questionsCount: 15,
      category: 'JJK',
      categoryEmoji: '👹',
      playersCount: 1800,
      rating: 5.0,
      coverImage: 'https://images.unsplash.com/photo-1706035278070-15489ab8ae1b?w=400&h=300&fit=crop',
    },
    {
      id: '3',
      title: 'Les techniques de jutsu',
      author: 'yuki',
      questionsCount: 20,
      category: 'Naruto',
      categoryEmoji: '🍥',
      playersCount: 1200,
      rating: 4.5,
    },
  ];

  const tabs = [
    { id: 'popular' as const, label: 'Populaires' },
    { id: 'recent' as const, label: 'Récents' },
    { id: 'mine' as const, label: 'Mes Quiz' },
  ];

  if (selectedQuiz) {
    return (
      <QuizPlayPage
        quiz={selectedQuiz}
        onBack={() => setSelectedQuiz(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#0c0c14' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: '#111119',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '18px' }}>🧠</span>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
            Quiz
          </h2>
        </div>
        <button
          onClick={() => setShowCreateQuiz(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
          style={{
            background: '#6c5ce7',
            fontSize: '13px',
            fontWeight: 600,
            color: '#ffffff',
          }}
        >
          <Plus size={16} />
          Créer
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b overflow-x-auto"
        style={{
          background: '#111119',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 rounded-full transition-all whitespace-nowrap"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: activeTab === tab.id ? '#e8e8ed' : '#8888a0',
              background: activeTab === tab.id ? '#6c5ce7' : 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Top Players */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <span style={{ fontSize: '16px' }}>🏆</span>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
              Top joueurs cette semaine
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {topPlayers.map((player) => (
              <div
                key={player.rank}
                className="flex-1 p-3 rounded-2xl border text-center"
                style={{
                  background: '#111119',
                  borderColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>
                  {player.emoji}
                </div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                  {player.name}
                </p>
                <p style={{ fontSize: '11px', color: '#8888a0' }}>
                  {player.points} pts
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quiz populaires */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-px" style={{ background: '#555570' }} />
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
              Quiz populaires
            </h3>
            <div className="flex-1 h-px" style={{ background: '#555570' }} />
          </div>
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                onPlay={() => setSelectedQuiz(quiz)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Create Quiz Sheet */}
      {showCreateQuiz && (
        <CreateQuizSheet onClose={() => setShowCreateQuiz(false)} />
      )}
    </div>
  );
}
