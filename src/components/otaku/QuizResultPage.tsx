import React, { useState, useEffect } from 'react';
import { Share2, Trophy, ArrowLeft, Medal, Target, Zap, ChevronDown, ChevronUp, MessageCircle, Loader2, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { QuizComments } from './QuizComments';
import type { Quiz, QuizQuestion } from './types';

interface AnswerDetail {
  questionId: string;
  chosen: string | null;
  isCorrect: boolean;
  timeTaken: number;
}

interface PlayerResult {
  rank: number;
  username: string;
  userId: string;
  avatar: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  bestStreak: number;
  badge: string;
}

interface QuizResultPageProps {
  quiz: Quiz;
  score: number;
  maxScore: number;
  correctAnswers: number;
  totalQuestions: number;
  bestStreak: number;
  answers?: AnswerDetail[];
  questions?: QuizQuestion[];
  onBack: () => void;
  onReplay?: () => void;
}

export function QuizResultPage({
  quiz,
  score,
  maxScore,
  correctAnswers,
  totalQuestions,
  bestStreak,
  answers = [],
  questions = [],
  onBack,
}: QuizResultPageProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'results' | 'details' | 'leaderboard'>('results');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [leaderboard, setLeaderboard] = useState<PlayerResult[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [myResult, setMyResult] = useState<{ score: number; correctAnswers: number; bestStreak: number } | null>(null);

  // When opened from list (score=0), fetch real result from DB
  useEffect(() => {
    if (!user || score > 0) return;
    supabase
      .from('quiz_results')
      .select('score, correct_answers, best_streak')
      .eq('quiz_id', quiz.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setMyResult({ score: data.score, correctAnswers: data.correct_answers, bestStreak: data.best_streak });
      });
  }, [user, quiz.id, score]);

  const displayScore = myResult?.score ?? score;
  const displayCorrectAnswers = myResult?.correctAnswers ?? correctAnswers;
  const displayBestStreak = myResult?.bestStreak ?? bestStreak;
  const percentage = totalQuestions > 0 ? Math.round((displayCorrectAnswers / totalQuestions) * 100) : 0;

  const getBadge = (pct: number) => {
    if (pct >= 100) return { emoji: '💎', label: 'DIAMOND', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' };
    if (pct >= 90) return { emoji: '🥇', label: 'GOLD', color: '#ffd200', bg: 'rgba(255,210,0,0.12)' };
    if (pct >= 70) return { emoji: '🥈', label: 'SILVER', color: '#c0c0c0', bg: 'rgba(192,192,192,0.12)' };
    if (pct >= 50) return { emoji: '🥉', label: 'BRONZE', color: '#cd7f32', bg: 'rgba(205,127,50,0.12)' };
    return { emoji: '🎯', label: 'DÉBUTANT', color: '#555570', bg: 'rgba(85,85,112,0.12)' };
  };

  const badge = getBadge(percentage);

  // Fetch leaderboard from DB
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoadingLeaderboard(true);
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*, player:user_id(id, username, avatar_url)')
        .eq('quiz_id', quiz.id)
        .order('score', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Failed to fetch leaderboard:', error);
        setLoadingLeaderboard(false);
        return;
      }

      const mapped: PlayerResult[] = (data || []).map((r: any, i: number) => {
        const pct = r.total_questions > 0 ? Math.round((r.correct_answers / r.total_questions) * 100) : 0;
        return {
          rank: i + 1,
          username: r.player?.username || 'inconnu',
          userId: r.user_id,
          avatar: r.player?.avatar_url || '',
          score: r.score,
          correctAnswers: r.correct_answers,
          totalQuestions: r.total_questions,
          bestStreak: r.best_streak,
          badge: getBadge(pct).emoji,
        };
      });

      setLeaderboard(mapped);
      setLoadingLeaderboard(false);
    };

    fetchLeaderboard();
  }, [quiz.id]);

  const myRank = leaderboard.find(p => p.userId === user?.id)?.rank || 0;
  const percentile = leaderboard.length > 0 ? Math.round(((leaderboard.length - myRank) / leaderboard.length) * 100) : 0;

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="h-full flex flex-col" style={{ background: '#0c0c14' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ background: '#111119', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div onClick={onBack} className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors cursor-pointer">
          <ArrowLeft size={20} style={{ color: '#e8e8ed' }} />
        </div>
        <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8ed' }}>
          Résultats: {quiz.title}
        </h2>
        <div style={{ width: '40px' }} />
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {[
          { id: 'results' as const, label: 'Mon Score' },
          { id: 'details' as const, label: 'Détails' },
          { id: 'leaderboard' as const, label: 'Classement' },
        ].map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center py-3 cursor-pointer hover:bg-[#111119] transition-colors relative"
          >
            <span style={{
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? '#e8e8ed' : '#8888a0',
            }}>
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1/2 h-1 rounded-full" style={{ width: '40px', transform: 'translateX(-50%)', background: '#6c5ce7' }} />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'results' && (
          <div className="max-w-md mx-auto px-4 py-6">
            {/* Score header */}
            <div className="text-center" style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '56px', marginBottom: '8px' }}>🎉</div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#e8e8ed', marginBottom: '4px' }}>
                Quiz terminé!
              </h2>
              {myRank > 0 && (
                <p style={{ fontSize: '14px', color: '#8888a0' }}>
                  Rang: <span style={{ fontWeight: 700, color: '#ffd200' }}>{getRankEmoji(myRank)}</span> sur {leaderboard.length} joueurs
                  {percentile > 0 && <span> · Top {100 - percentile}%</span>}
                </p>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3" style={{ marginBottom: '20px' }}>
              <div className="p-4 rounded-2xl text-center" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Trophy size={20} style={{ color: '#ffd200', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '22px', fontWeight: 800, color: '#e8e8ed' }}>{displayScore}</p>
                <p style={{ fontSize: '11px', color: '#8888a0' }}>Points</p>
              </div>
              <div className="p-4 rounded-2xl text-center" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Target size={20} style={{ color: '#22c55e', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '22px', fontWeight: 800, color: '#e8e8ed' }}>{displayCorrectAnswers}/{totalQuestions}</p>
                <p style={{ fontSize: '11px', color: '#8888a0' }}>Bonnes réponses</p>
              </div>
              <div className="p-4 rounded-2xl text-center" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Zap size={20} style={{ color: '#f59e0b', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '22px', fontWeight: 800, color: '#e8e8ed' }}>{displayBestStreak > 0 ? `x${displayBestStreak}` : '—'}</p>
                <p style={{ fontSize: '11px', color: '#8888a0' }}>Meilleure série</p>
              </div>
              <div className="p-4 rounded-2xl text-center" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Medal size={20} style={{ color: '#6c5ce7', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '22px', fontWeight: 800, color: '#e8e8ed' }}>{percentage}%</p>
                <p style={{ fontSize: '11px', color: '#8888a0' }}>Précision</p>
              </div>
            </div>

            {/* Badge */}
            <div className="p-5 rounded-2xl text-center" style={{ background: badge.bg, border: `1px solid ${badge.color}40`, marginBottom: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>{badge.emoji}</div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: badge.color }}>{badge.label}</h3>
              <p style={{ fontSize: '11px', color: '#8888a0', marginTop: '4px' }}>Badge débloqué</p>
            </div>

            {/* Progress bar */}
            <div className="p-4 rounded-2xl" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '20px' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#8888a0' }}>Score</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#e8e8ed' }}>{displayScore}/{maxScore} pts</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#1a1a25' }}>
                <div className="h-full rounded-full transition-all duration-1000" style={{
                  width: `${maxScore > 0 ? Math.min((displayScore / maxScore) * 100, 100) : 0}%`,
                  background: `linear-gradient(90deg, #6c5ce7, ${badge.color})`,
                }} />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', width: '100%', marginBottom: '12px' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href).catch(() => {});
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                }}
                style={{ flex: '1 1 0%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px', background: shareCopied ? 'rgba(34,197,94,0.15)' : '#1a1a25', borderRadius: '12px', border: `1px solid ${shareCopied ? 'rgba(34,197,94,0.4)' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {shareCopied ? <Check size={16} style={{ color: '#22c55e' }} /> : <Share2 size={16} style={{ color: '#e8e8ed' }} />}
                <span style={{ fontSize: '13px', fontWeight: 700, color: shareCopied ? '#22c55e' : '#e8e8ed' }}>
                  {shareCopied ? 'Copié !' : 'Partager'}
                </span>
              </button>
              <button
                onClick={onBack}
                style={{ flex: '1 1 0%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px', background: '#6c5ce7', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
              >
                <ArrowLeft size={16} style={{ color: '#fff' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>Retour</span>
              </button>
            </div>

            <button onClick={() => setActiveTab('leaderboard')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px', background: '#1a1a25', borderRadius: '12px', cursor: 'pointer', border: 'none', marginBottom: '20px' }}>
              <Trophy size={16} style={{ color: '#ffd200' }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>Voir le classement</span>
            </button>

            {/* Comments — collapsible */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div
                onClick={() => setShowComments(!showComments)}
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#1a1a25] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle size={16} style={{ color: '#6c5ce7' }} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8ed' }}>
                    Commentaires
                  </span>
                </div>
                {showComments
                  ? <ChevronUp size={18} style={{ color: '#8888a0' }} />
                  : <ChevronDown size={18} style={{ color: '#8888a0' }} />
                }
              </div>
              {showComments && (
                <div className="px-4 pb-4">
                  <QuizComments quizId={quiz.id} quizAuthor={quiz.author} />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
            {questions.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#8888a0', textAlign: 'center', padding: '24px 0' }}>
                Aucun détail disponible
              </p>
            ) : (
              <>
                <p style={{ fontSize: '13px', color: '#8888a0', marginBottom: '8px' }}>
                  Détails de vos réponses par question
                </p>
                {questions.map((q, idx) => {
                  const answer = answers[idx];
                  const isExpanded = expandedQuestion === q.id;
                  const correctAnswer = q.answers.find(a => a.isCorrect);

                  return (
                    <div
                      key={q.id}
                      className="rounded-2xl border overflow-hidden"
                      style={{ background: '#111119', borderColor: 'rgba(255,255,255,0.06)' }}
                    >
                      <div
                        onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[#1a1a25] transition-colors"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: answer?.isCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>{answer?.isCorrect ? '✅' : '❌'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate" style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8ed' }}>
                            Q{idx + 1}: {q.question}
                          </p>
                          <p style={{ fontSize: '11px', color: '#8888a0' }}>
                            {answer?.isCorrect ? 'Correct' : `Réponse: ${correctAnswer?.text || '—'}`}
                            {answer?.timeTaken ? ` · ${(answer.timeTaken / 1000).toFixed(1)}s` : ''}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp size={16} style={{ color: '#8888a0' }} /> : <ChevronDown size={16} style={{ color: '#8888a0' }} />}
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-2">
                          {q.imageUrl && (
                            <div className="rounded-xl overflow-hidden mb-3" style={{ maxHeight: '120px' }}>
                              <img src={q.imageUrl} alt="" className="w-full object-cover" style={{ maxHeight: '120px' }} />
                            </div>
                          )}
                          {q.answers.map((a) => {
                            const isCorrectAns = a.isCorrect;
                            const isUserChoice = answer?.chosen === a.id;

                            return (
                              <div key={a.id} className="relative">
                                <div className="flex items-center gap-2 relative z-10 py-2 px-3">
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: isCorrectAns ? '#22c55e' : '#8888a0', width: '20px' }}>
                                    {a.id.toUpperCase()}.
                                  </span>
                                  <span className="flex-1" style={{ fontSize: '12px', color: '#e8e8ed' }}>
                                    {a.text}
                                  </span>
                                  {isUserChoice && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{
                                      background: isCorrectAns ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                                      color: isCorrectAns ? '#22c55e' : '#ef4444',
                                    }}>
                                      VOUS
                                    </span>
                                  )}
                                  {isCorrectAns && (
                                    <span style={{ fontSize: '12px' }}>✅</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="max-w-lg mx-auto px-4 py-4">
            {loadingLeaderboard ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin" style={{ color: '#6c5ce7' }} />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🏆</span>
                <p style={{ fontSize: '14px', color: '#8888a0' }}>Aucun joueur pour le moment</p>
              </div>
            ) : (
              <>
                {/* Top 3 podium */}
                {leaderboard.length >= 2 && (
                  <div className="flex items-end justify-center gap-3 mb-6 pt-4">
                    {leaderboard[1] && (
                      <div className="text-center flex-1">
                        <div className="w-12 h-12 rounded-full mx-auto mb-2 overflow-hidden flex items-center justify-center" style={{ border: '2px solid #c0c0c0', background: '#1f1f2e' }}>
                          {leaderboard[1].avatar ? <img src={leaderboard[1].avatar} alt="" className="w-full h-full object-cover" /> : <span style={{ fontWeight: 700, color: '#fff' }}>{leaderboard[1].username[0]?.toUpperCase()}</span>}
                        </div>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#e8e8ed' }}>{leaderboard[1].username}</p>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: '#c0c0c0' }}>{leaderboard[1].score} pts</p>
                        <div className="mt-2 rounded-t-xl flex items-center justify-center" style={{ height: '60px', background: 'rgba(192,192,192,0.1)' }}>
                          <span style={{ fontSize: '28px' }}>🥈</span>
                        </div>
                      </div>
                    )}
                    {leaderboard[0] && (
                      <div className="text-center flex-1">
                        <div className="w-14 h-14 rounded-full mx-auto mb-2 overflow-hidden flex items-center justify-center" style={{ border: '3px solid #ffd200', background: '#1f1f2e' }}>
                          {leaderboard[0].avatar ? <img src={leaderboard[0].avatar} alt="" className="w-full h-full object-cover" /> : <span style={{ fontWeight: 700, color: '#fff', fontSize: '16px' }}>{leaderboard[0].username[0]?.toUpperCase()}</span>}
                        </div>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>{leaderboard[0].username}</p>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#ffd200' }}>{leaderboard[0].score} pts</p>
                        <div className="mt-2 rounded-t-xl flex items-center justify-center" style={{ height: '80px', background: 'rgba(255,210,0,0.1)' }}>
                          <span style={{ fontSize: '32px' }}>🥇</span>
                        </div>
                      </div>
                    )}
                    {leaderboard[2] && (
                      <div className="text-center flex-1">
                        <div className="w-12 h-12 rounded-full mx-auto mb-2 overflow-hidden flex items-center justify-center" style={{ border: '2px solid #cd7f32', background: '#1f1f2e' }}>
                          {leaderboard[2].avatar ? <img src={leaderboard[2].avatar} alt="" className="w-full h-full object-cover" /> : <span style={{ fontWeight: 700, color: '#fff' }}>{leaderboard[2].username[0]?.toUpperCase()}</span>}
                        </div>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#e8e8ed' }}>{leaderboard[2].username}</p>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: '#cd7f32' }}>{leaderboard[2].score} pts</p>
                        <div className="mt-2 rounded-t-xl flex items-center justify-center" style={{ height: '45px', background: 'rgba(205,127,50,0.1)' }}>
                          <span style={{ fontSize: '24px' }}>🥉</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Full list */}
                <div className="space-y-2">
                  {leaderboard.map((player) => {
                    const isYou = player.userId === user?.id;
                    return (
                      <div
                        key={player.rank}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{
                          background: isYou ? 'rgba(108,92,231,0.12)' : '#111119',
                          border: isYou ? '1px solid rgba(108,92,231,0.3)' : '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        <div className="w-8 text-center flex-shrink-0">
                          {player.rank <= 3 ? (
                            <span style={{ fontSize: '18px' }}>{getRankEmoji(player.rank)}</span>
                          ) : (
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#8888a0' }}>#{player.rank}</span>
                          )}
                        </div>
                        <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: isYou ? '#6c5ce7' : '#1f1f2e' }}>
                          {player.avatar ? (
                            <img src={player.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{player.username[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: '13px', fontWeight: 700, color: isYou ? '#6c5ce7' : '#e8e8ed' }}>
                            {player.username} {isYou && '(vous)'}
                          </p>
                          <p style={{ fontSize: '11px', color: '#8888a0' }}>
                            {player.correctAnswers}/{player.totalQuestions} · {player.badge}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p style={{ fontSize: '14px', fontWeight: 800, color: player.rank === 1 ? '#ffd200' : player.rank <= 3 ? '#e8e8ed' : '#8888a0' }}>
                            {player.score}
                          </p>
                          <p style={{ fontSize: '10px', color: '#555570' }}>pts</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quiz stats summary */}
                <div className="mt-4 p-4 rounded-2xl" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed', marginBottom: '10px' }}>
                    Stats du quiz
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(108,92,231,0.08)' }}>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: '#6c5ce7' }}>{leaderboard.length}</p>
                      <p style={{ fontSize: '10px', color: '#8888a0' }}>Joueurs</p>
                    </div>
                    <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)' }}>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: '#22c55e' }}>
                        {leaderboard.length > 0 ? Math.round(leaderboard.reduce((a, p) => a + (p.totalQuestions > 0 ? (p.correctAnswers / p.totalQuestions) * 100 : 0), 0) / leaderboard.length) : 0}%
                      </p>
                      <p style={{ fontSize: '10px', color: '#8888a0' }}>Moy. précision</p>
                    </div>
                    <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(255,210,0,0.08)' }}>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: '#ffd200' }}>
                        {leaderboard.length > 0 ? Math.round(leaderboard.reduce((a, p) => a + p.score, 0) / leaderboard.length) : 0}
                      </p>
                      <p style={{ fontSize: '10px', color: '#8888a0' }}>Score moyen</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
