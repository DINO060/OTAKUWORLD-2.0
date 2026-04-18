import React, { useState, useEffect } from 'react';
import { Plus, Trophy, Shuffle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { QuizCard } from './QuizCard';
import { QuizPlayPage } from './QuizPlayPage';
import { QuizResultPage } from './QuizResultPage';
import { QuizLeaderboardPage } from './QuizLeaderboardPage';
import { CreateQuizSheet } from './CreateQuizSheet';
import type { Quiz } from './types';

type QuizTab = 'popular' | 'recent' | 'mine';

export function QuizPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<QuizTab>('popular');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [viewResultsQuiz, setViewResultsQuiz] = useState<Quiz | null>(null);
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [playedQuizIds, setPlayedQuizIds] = useState<Set<string>>(new Set());
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [topPlayers, setTopPlayers] = useState<{ rank: number; name: string; emoji: string; points: number }[]>([]);

  const fetchQuizzes = async () => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*, author:author_id(username), quiz_questions(id)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch quizzes:', error);
      setLoading(false);
      return;
    }

    const mapped: Quiz[] = (data || []).map((q: any) => ({
      id: q.id,
      title: q.title,
      author: q.author?.username || 'inconnu',
      authorId: q.author_id,
      questionsCount: q.quiz_questions?.length || 0,
      category: q.category,
      categoryEmoji: q.category_emoji,
      playersCount: q.players_count || 0,
      maxPlayers: q.max_players || undefined,
      rating: 0,
      coverImage: q.cover_image || undefined,
      timerSeconds: q.timer_seconds,
      duration: q.duration_hours,
      createdAt: new Date(q.created_at),
      endedAt: q.ended_at ? new Date(q.ended_at) : undefined,
      status: q.status as 'active' | 'ended',
    }));

    setQuizzes(mapped);
    setLoading(false);
  };

  const fetchPlayedQuizIds = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('quiz_results')
      .select('quiz_id')
      .eq('user_id', user.id);
    if (data) {
      setPlayedQuizIds(new Set(data.map((r: any) => r.quiz_id)));
    }
  };

  const fetchTopPlayers = async () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('quiz_results')
      .select('user_id, score, user:user_id(username)')
      .gte('completed_at', weekAgo)
      .order('score', { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      const scoreMap = new Map<string, { name: string; total: number }>();
      for (const r of data as any[]) {
        const uid = r.user_id;
        const existing = scoreMap.get(uid);
        if (existing) {
          existing.total += r.score;
        } else {
          scoreMap.set(uid, { name: r.user?.username || 'inconnu', total: r.score });
        }
      }
      const sorted = [...scoreMap.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5);
      const emojis = ['🥇', '🥈', '🥉', '🎖️', '🎖️'];
      setTopPlayers(sorted.map(([, v], i) => ({
        rank: i + 1, name: v.name, emoji: emojis[i] || '🎖️', points: v.total,
      })));
    }
  };

  useEffect(() => {
    fetchQuizzes();
    fetchPlayedQuizIds();
    fetchTopPlayers();

    const channel = supabase
      .channel('quizzes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quizzes' }, () => {
        fetchQuizzes();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Auto-end expired quizzes (only for own quizzes)
  useEffect(() => {
    const now = Date.now();
    quizzes.forEach(q => {
      if (q.status === 'active' && q.authorId === user?.id) {
        const endTime = q.createdAt.getTime() + q.duration * 60 * 60 * 1000;
        if (now >= endTime) {
          supabase.from('quizzes').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', q.id).then(() => {});
        }
      }
    });
  }, [quizzes, user]);

  const handleEndQuiz = async (quizId: string) => {
    await supabase.from('quizzes').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', quizId);
    setQuizzes(prev => prev.map(q =>
      q.id === quizId ? { ...q, status: 'ended' as const, endedAt: new Date() } : q
    ));
  };

  const handleDeleteQuiz = async (quizId: string) => {
    await supabase.from('quizzes').delete().eq('id', quizId);
    setQuizzes(prev => prev.filter(q => q.id !== quizId));
  };

  const handleCreateQuiz = (quiz: Quiz) => {
    setQuizzes(prev => [quiz, ...prev]);
    setShowCreateQuiz(false);
  };

  const handleQuizSurprise = () => {
    const activeQuizzes = quizzes.filter(q => q.status === 'active' && !playedQuizIds.has(q.id));
    if (activeQuizzes.length > 0) {
      const random = activeQuizzes[Math.floor(Math.random() * activeQuizzes.length)];
      setSelectedQuiz(random);
    }
  };

  const filteredQuizzes = (() => {
    switch (activeTab) {
      case 'popular': return [...quizzes].sort((a, b) => b.playersCount - a.playersCount);
      case 'recent': return [...quizzes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      case 'mine': return quizzes.filter(q => q.authorId === user?.id);
      default: return quizzes;
    }
  })();

  const tabs = [
    { id: 'popular' as const, label: 'Populaires' },
    { id: 'recent' as const, label: 'Récents' },
    { id: 'mine' as const, label: 'Mes Quiz' },
  ];

  if (showLeaderboard) {
    return <QuizLeaderboardPage onBack={() => setShowLeaderboard(false)} />;
  }

  if (viewResultsQuiz) {
    return (
      <QuizResultPage
        quiz={viewResultsQuiz}
        score={0}
        maxScore={viewResultsQuiz.questionsCount * 150}
        correctAnswers={0}
        totalQuestions={viewResultsQuiz.questionsCount}
        bestStreak={0}
        onBack={() => setViewResultsQuiz(null)}
      />
    );
  }

  if (selectedQuiz) {
    return (
      <QuizPlayPage
        quiz={selectedQuiz}
        onBack={() => {
          setPlayedQuizIds(prev => new Set(prev).add(selectedQuiz.id));
          setSelectedQuiz(null);
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#0c0c14' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ background: '#111119', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '18px' }}>🧩</span>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>Quiz</h2>
        </div>
        <button
          onClick={() => setShowCreateQuiz(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
          style={{ background: '#6c5ce7', fontSize: '13px', fontWeight: 600, color: '#ffffff' }}
        >
          <Plus size={16} />
          Créer
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b overflow-x-auto flex-shrink-0"
        style={{ background: '#111119', borderColor: 'rgba(255,255,255,0.06)' }}
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
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-y-auto">
          {/* Quiz Surprise */}
          <div className="px-4 pt-4">
            <div
              onClick={handleQuizSurprise}
              className="flex items-center justify-center gap-3 p-3 rounded-2xl cursor-pointer hover:opacity-90 transition-opacity"
              style={{
                background: 'linear-gradient(135deg, rgba(108,92,231,0.2), rgba(240,147,251,0.15))',
                border: '1px solid rgba(108,92,231,0.3)',
              }}
            >
              <Shuffle size={18} style={{ color: '#6c5ce7' }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8ed' }}>Quiz Surprise</span>
              <span style={{ fontSize: '12px', color: '#8888a0' }}>— Lance un quiz aléatoire!</span>
            </div>
          </div>

          {/* Top Players — mobile only */}
          {topPlayers.length > 0 && (
            <div className="md:hidden px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '16px' }}>🏆</span>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>Top joueurs cette semaine</h3>
                </div>
                <button onClick={() => setShowLeaderboard(true)} style={{ fontSize: '12px', fontWeight: 600, color: '#6c5ce7' }}>
                  Voir tout
                </button>
              </div>
              <div className="flex items-center gap-3">
                {topPlayers.slice(0, 3).map((player) => (
                  <div
                    key={player.rank}
                    onClick={() => setShowLeaderboard(true)}
                    className="flex-1 p-3 rounded-2xl border text-center cursor-pointer hover:bg-[#1a1a25] transition-colors"
                    style={{ background: '#111119', borderColor: 'rgba(255,255,255,0.06)' }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{player.emoji}</div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>{player.name}</p>
                    <p style={{ fontSize: '11px', color: '#8888a0' }}>{player.points} pts</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quiz list */}
          <div className="px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-px" style={{ background: '#555570' }} />
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                {activeTab === 'popular' ? 'Quiz populaires' : activeTab === 'recent' ? 'Quiz récents' : 'Mes quiz'}
              </h3>
              <div className="flex-1 h-px" style={{ background: '#555570' }} />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin" style={{ color: '#6c5ce7' }} />
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="text-center py-12">
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🧩</span>
                <p style={{ fontSize: '14px', color: '#8888a0' }}>
                  {activeTab === 'mine' ? 'Tu n\'as pas encore créé de quiz' : 'Aucun quiz disponible'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                {filteredQuizzes.map((quiz) => {
                  const isEnded = quiz.status === 'ended';
                  const hasPlayed = playedQuizIds.has(quiz.id);
                  return (
                    <QuizCard
                      key={quiz.id}
                      quiz={quiz}
                      onPlay={() => {
                        if (isEnded || hasPlayed) {
                          setViewResultsQuiz(quiz);
                        } else {
                          setSelectedQuiz(quiz);
                        }
                      }}
                      onEnd={() => handleEndQuiz(quiz.id)}
                      onDelete={() => handleDeleteQuiz(quiz.id)}
                      isCreator={quiz.authorId === user?.id}
                      hasPlayed={hasPlayed}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar — Desktop only */}
        <div
          className="hidden md:flex flex-col w-72 xl:w-80 flex-shrink-0 border-l overflow-y-auto gap-4 p-4"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {/* Leaderboard */}
          <div className="rounded-2xl border p-4" style={{ background: '#111119', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy size={16} style={{ color: '#ffd200' }} />
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8ed' }}>Classement de la semaine</h3>
              </div>
              <button onClick={() => setShowLeaderboard(true)} style={{ fontSize: '11px', fontWeight: 600, color: '#6c5ce7' }}>
                Voir tout
              </button>
            </div>
            <div className="space-y-3">
              {topPlayers.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#555570', textAlign: 'center', padding: '12px 0' }}>Aucun joueur cette semaine</p>
              ) : topPlayers.map((player) => (
                <div key={player.rank} onClick={() => setShowLeaderboard(true)} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                  <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>{player.emoji}</span>
                  <div className="flex-1">
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>{player.name}</p>
                    <div className="mt-1 rounded-full overflow-hidden" style={{ height: '4px', background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min((player.points / (topPlayers[0]?.points || 1)) * 100, 100)}%`,
                        background: player.rank === 1 ? '#ffd200' : player.rank === 2 ? '#c0c0c0' : player.rank === 3 ? '#cd7f32' : '#6c5ce7',
                      }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: player.rank === 1 ? '#ffd200' : player.rank <= 3 ? '#c0c0c0' : '#8888a0' }}>
                    {player.points} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Create Quiz CTA */}
          <div className="rounded-2xl p-4 text-center" style={{
            background: 'linear-gradient(135deg, rgba(108,92,231,0.2), rgba(240,147,251,0.1))',
            border: '1px solid rgba(108,92,231,0.3)',
          }}>
            <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🧩</span>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8ed', marginBottom: '4px' }}>Crée ton quiz!</p>
            <p style={{ fontSize: '12px', color: '#8888a0', marginBottom: '12px' }}>Teste les connaissances de la communauté</p>
            <button
              onClick={() => setShowCreateQuiz(true)}
              className="w-full py-2 rounded-xl font-semibold transition-opacity hover:opacity-90"
              style={{ background: '#6c5ce7', fontSize: '13px', color: '#ffffff' }}
            >
              Commencer
            </button>
          </div>
        </div>
      </div>

      {showCreateQuiz && (
        <CreateQuizSheet onClose={() => setShowCreateQuiz(false)} onCreate={handleCreateQuiz} />
      )}
    </div>
  );
}
