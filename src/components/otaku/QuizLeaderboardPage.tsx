import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Target, Zap, Medal, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface LeaderboardPlayer {
  rank: number;
  name: string;
  userId: string;
  avatar: string;
  points: number;
  quizzesPlayed: number;
  accuracy: number;
  bestStreak: number;
  rankTitle: string;
  rankColor: string;
  rankIcon: string;
}

interface QuizLeaderboardPageProps {
  onBack: () => void;
}

const getRankInfo = (points: number) => {
  if (points >= 10000) return { title: 'Légende', color: '#ef4444', icon: '🔴' };
  if (points >= 5000) return { title: 'Maître', color: '#ffd200', icon: '🟡' };
  if (points >= 2000) return { title: 'Expert', color: '#a78bfa', icon: '🟣' };
  if (points >= 500) return { title: 'Otaku', color: '#3b82f6', icon: '🔵' };
  return { title: 'Débutant', color: '#22c55e', icon: '🟢' };
};

export function QuizLeaderboardPage({ onBack }: QuizLeaderboardPageProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'weekly' | 'alltime'>('weekly');
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardPlayer | null>(null);

  const fetchLeaderboard = async (tab: 'weekly' | 'alltime') => {
    setLoading(true);

    let query = supabase
      .from('quiz_results')
      .select('user_id, score, correct_answers, total_questions, best_streak, completed_at, player:user_id(id, username, avatar_url)');

    if (tab === 'weekly') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('completed_at', weekAgo);
    }

    const { data, error } = await query.order('score', { ascending: false }).limit(200);

    if (error) {
      console.error('Failed to fetch leaderboard:', error);
      setLoading(false);
      return;
    }

    // Aggregate per user
    const userMap = new Map<string, {
      name: string; userId: string; avatar: string;
      totalPoints: number; quizzesPlayed: number;
      totalCorrect: number; totalQuestions: number; bestStreak: number;
    }>();

    for (const r of (data || []) as any[]) {
      const uid = r.user_id;
      const existing = userMap.get(uid);
      if (existing) {
        existing.totalPoints += r.score;
        existing.quizzesPlayed += 1;
        existing.totalCorrect += r.correct_answers;
        existing.totalQuestions += r.total_questions;
        existing.bestStreak = Math.max(existing.bestStreak, r.best_streak);
      } else {
        userMap.set(uid, {
          name: r.player?.username || 'inconnu',
          userId: uid,
          avatar: r.player?.avatar_url || '',
          totalPoints: r.score,
          quizzesPlayed: 1,
          totalCorrect: r.correct_answers,
          totalQuestions: r.total_questions,
          bestStreak: r.best_streak,
        });
      }
    }

    const sorted = [...userMap.values()].sort((a, b) => b.totalPoints - a.totalPoints);

    const mapped: LeaderboardPlayer[] = sorted.map((p, i) => {
      const info = getRankInfo(p.totalPoints);
      const accuracy = p.totalQuestions > 0 ? Math.round((p.totalCorrect / p.totalQuestions) * 100) : 0;
      return {
        rank: i + 1,
        name: p.name,
        userId: p.userId,
        avatar: p.avatar,
        points: p.totalPoints,
        quizzesPlayed: p.quizzesPlayed,
        accuracy,
        bestStreak: p.bestStreak,
        rankTitle: info.title,
        rankColor: info.color,
        rankIcon: info.icon,
      };
    });

    setPlayers(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard(activeTab);
  }, [activeTab]);

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (selectedPlayer) {
    const info = getRankInfo(selectedPlayer.points);
    return (
      <div className="h-full flex flex-col" style={{ background: '#0c0c14' }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0" style={{ background: '#111119', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div onClick={() => setSelectedPlayer(null)} className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors cursor-pointer">
            <ArrowLeft size={20} style={{ color: '#e8e8ed' }} />
          </div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>Profil Quiz</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-md mx-auto px-4 py-6 space-y-4">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden flex items-center justify-center" style={{ border: `3px solid ${info.color}`, background: selectedPlayer.avatar ? undefined : '#1f1f2e' }}>
                {selectedPlayer.avatar ? (
                  <img src={selectedPlayer.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>{selectedPlayer.name[0]?.toUpperCase()}</span>
                )}
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#e8e8ed' }}>{selectedPlayer.name}</h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span style={{ fontSize: '14px' }}>{info.icon}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: info.color }}>{info.title}</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl text-center" style={{ background: `linear-gradient(135deg, ${info.color}15, ${info.color}08)`, border: `1px solid ${info.color}40` }}>
              <p style={{ fontSize: '36px', fontWeight: 800, color: info.color }}>{selectedPlayer.points}</p>
              <p style={{ fontSize: '13px', color: '#8888a0' }}>Points totaux</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl text-center" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Trophy size={18} style={{ color: '#ffd200', margin: '0 auto 6px' }} />
                <p style={{ fontSize: '18px', fontWeight: 800, color: '#e8e8ed' }}>#{selectedPlayer.rank}</p>
                <p style={{ fontSize: '11px', color: '#8888a0' }}>Classement</p>
              </div>
              <div className="p-4 rounded-2xl text-center" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Target size={18} style={{ color: '#22c55e', margin: '0 auto 6px' }} />
                <p style={{ fontSize: '18px', fontWeight: 800, color: '#e8e8ed' }}>{selectedPlayer.accuracy}%</p>
                <p style={{ fontSize: '11px', color: '#8888a0' }}>Précision</p>
              </div>
              <div className="p-4 rounded-2xl text-center" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Zap size={18} style={{ color: '#f59e0b', margin: '0 auto 6px' }} />
                <p style={{ fontSize: '18px', fontWeight: 800, color: '#e8e8ed' }}>🔥 x{selectedPlayer.bestStreak}</p>
                <p style={{ fontSize: '11px', color: '#8888a0' }}>Meilleur streak</p>
              </div>
              <div className="p-4 rounded-2xl text-center" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Medal size={18} style={{ color: '#6c5ce7', margin: '0 auto 6px' }} />
                <p style={{ fontSize: '18px', fontWeight: 800, color: '#e8e8ed' }}>{selectedPlayer.quizzesPlayed}</p>
                <p style={{ fontSize: '11px', color: '#8888a0' }}>Quiz joués</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#8888a0' }}>Progression rang</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: info.color }}>{info.icon} {info.title}</span>
              </div>
              <div className="flex gap-1 mb-2">
                {[
                  { label: 'Débutant', min: 0, max: 500, color: '#22c55e' },
                  { label: 'Otaku', min: 500, max: 2000, color: '#3b82f6' },
                  { label: 'Expert', min: 2000, max: 5000, color: '#a78bfa' },
                  { label: 'Maître', min: 5000, max: 10000, color: '#ffd200' },
                  { label: 'Légende', min: 10000, max: 20000, color: '#ef4444' },
                ].map((tier) => {
                  const progress = selectedPlayer.points >= tier.max ? 100 : selectedPlayer.points > tier.min ? ((selectedPlayer.points - tier.min) / (tier.max - tier.min)) * 100 : 0;
                  return (
                    <div key={tier.label} className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#1a1a25' }}>
                      <div className="h-full rounded-full" style={{ width: `${progress}%`, background: tier.color }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between">
                {['🟢', '🔵', '🟣', '🟡', '🔴'].map((icon, i) => (
                  <span key={i} style={{ fontSize: '10px' }}>{icon}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#0c0c14' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0" style={{ background: '#111119', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div onClick={onBack} className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors cursor-pointer">
          <ArrowLeft size={20} style={{ color: '#e8e8ed' }} />
        </div>
        <Trophy size={18} style={{ color: '#ffd200' }} />
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>Classement Quiz</h2>
      </div>

      <div className="flex items-center border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {[
          { id: 'weekly' as const, label: 'Cette semaine' },
          { id: 'alltime' as const, label: 'All-time' },
        ].map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center py-3 cursor-pointer hover:bg-[#111119] transition-colors relative"
          >
            <span style={{ fontSize: '13px', fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? '#e8e8ed' : '#8888a0' }}>
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1/2 h-1 rounded-full" style={{ width: '40px', transform: 'translateX(-50%)', background: '#6c5ce7' }} />
            )}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: '#6c5ce7' }} />
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-12">
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🏆</span>
              <p style={{ fontSize: '14px', color: '#8888a0' }}>Aucun joueur pour le moment</p>
            </div>
          ) : (
            <>
              {/* Top 3 podium */}
              {players.length >= 2 && (
                <div className="flex items-end justify-center gap-3 mb-6 pt-4">
                  {players[1] && (
                    <div className="text-center flex-1 cursor-pointer" onClick={() => setSelectedPlayer(players[1])}>
                      <div className="w-14 h-14 rounded-full mx-auto mb-2 overflow-hidden flex items-center justify-center" style={{ border: '2px solid #c0c0c0', background: '#1f1f2e' }}>
                        {players[1].avatar ? <img src={players[1].avatar} alt="" className="w-full h-full object-cover" /> : <span style={{ fontWeight: 700, color: '#fff' }}>{players[1].name[0]?.toUpperCase()}</span>}
                      </div>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#e8e8ed' }}>{players[1].name}</p>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#c0c0c0' }}>{players[1].points} pts</p>
                      <p style={{ fontSize: '10px', color: '#8888a0' }}>{players[1].rankIcon} {players[1].rankTitle}</p>
                      <div className="mt-2 rounded-t-xl flex items-center justify-center" style={{ height: '60px', background: 'rgba(192,192,192,0.1)' }}>
                        <span style={{ fontSize: '28px' }}>🥈</span>
                      </div>
                    </div>
                  )}
                  {players[0] && (
                    <div className="text-center flex-1 cursor-pointer" onClick={() => setSelectedPlayer(players[0])}>
                      <div className="w-16 h-16 rounded-full mx-auto mb-2 overflow-hidden flex items-center justify-center" style={{ border: '3px solid #ffd200', background: '#1f1f2e' }}>
                        {players[0].avatar ? <img src={players[0].avatar} alt="" className="w-full h-full object-cover" /> : <span style={{ fontWeight: 700, color: '#fff', fontSize: '18px' }}>{players[0].name[0]?.toUpperCase()}</span>}
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>{players[0].name}</p>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#ffd200' }}>{players[0].points} pts</p>
                      <p style={{ fontSize: '10px', color: '#8888a0' }}>{players[0].rankIcon} {players[0].rankTitle}</p>
                      <div className="mt-2 rounded-t-xl flex items-center justify-center" style={{ height: '80px', background: 'rgba(255,210,0,0.1)' }}>
                        <span style={{ fontSize: '32px' }}>🥇</span>
                      </div>
                    </div>
                  )}
                  {players[2] && (
                    <div className="text-center flex-1 cursor-pointer" onClick={() => setSelectedPlayer(players[2])}>
                      <div className="w-14 h-14 rounded-full mx-auto mb-2 overflow-hidden flex items-center justify-center" style={{ border: '2px solid #cd7f32', background: '#1f1f2e' }}>
                        {players[2].avatar ? <img src={players[2].avatar} alt="" className="w-full h-full object-cover" /> : <span style={{ fontWeight: 700, color: '#fff' }}>{players[2].name[0]?.toUpperCase()}</span>}
                      </div>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#e8e8ed' }}>{players[2].name}</p>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#cd7f32' }}>{players[2].points} pts</p>
                      <p style={{ fontSize: '10px', color: '#8888a0' }}>{players[2].rankIcon} {players[2].rankTitle}</p>
                      <div className="mt-2 rounded-t-xl flex items-center justify-center" style={{ height: '45px', background: 'rgba(205,127,50,0.1)' }}>
                        <span style={{ fontSize: '24px' }}>🥉</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Full list */}
              <div className="space-y-2">
                {players.map((player) => {
                  const isYou = player.userId === user?.id;
                  return (
                    <div
                      key={player.rank}
                      onClick={() => setSelectedPlayer(player)}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-[#1a1a25] transition-colors"
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
                      <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: isYou ? '#6c5ce7' : '#1f1f2e' }}>
                        {player.avatar ? (
                          <img src={player.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{player.name[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p style={{ fontSize: '13px', fontWeight: 700, color: isYou ? '#6c5ce7' : '#e8e8ed' }}>
                            {player.name} {isYou && '(vous)'}
                          </p>
                          <span style={{ fontSize: '10px' }}>{player.rankIcon}</span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#8888a0' }}>
                          {player.quizzesPlayed} quiz · {player.accuracy}% · 🔥 x{player.bestStreak}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p style={{ fontSize: '15px', fontWeight: 800, color: player.rank === 1 ? '#ffd200' : player.rank <= 3 ? '#e8e8ed' : '#8888a0' }}>
                          {player.points}
                        </p>
                        <p style={{ fontSize: '10px', color: '#555570' }}>pts</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rank legend */}
              <div className="mt-4 p-4 rounded-2xl" style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed', marginBottom: '10px' }}>Rangs</h4>
                <div className="space-y-2">
                  {[
                    { icon: '🟢', title: 'Débutant', range: '0 - 500 pts', color: '#22c55e' },
                    { icon: '🔵', title: 'Otaku', range: '500 - 2 000 pts', color: '#3b82f6' },
                    { icon: '🟣', title: 'Expert', range: '2 000 - 5 000 pts', color: '#a78bfa' },
                    { icon: '🟡', title: 'Maître', range: '5 000 - 10 000 pts', color: '#ffd200' },
                    { icon: '🔴', title: 'Légende', range: '10 000+ pts', color: '#ef4444' },
                  ].map((r) => (
                    <div key={r.title} className="flex items-center gap-3">
                      <span style={{ fontSize: '14px' }}>{r.icon}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: r.color, width: '70px' }}>{r.title}</span>
                      <span style={{ fontSize: '11px', color: '#8888a0' }}>{r.range}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
