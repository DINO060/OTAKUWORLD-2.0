import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageCircle, UserPlus, CalendarDays, MessageSquareOff } from 'lucide-react';
import { PostCard } from './PostCard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Post } from './types';

interface PopupUser {
  id: string;
  username: string;
  handle: string;
  avatar: string;
}

interface ProfileData {
  bio: string;
  handle: string;
  avatarImage: string | null;
  allowDms: boolean;
  createdAt: string | null;
  badge: { name: string; icon: string; color: string } | null;
}

type ProfileTab = 'posts' | 'chapters' | 'quiz';

// Social link detection
function detectPlatform(url: string): { name: string; color: string; icon: string } | null {
  const lower = url.toLowerCase();
  if (lower.includes('tiktok.com')) return { name: 'TikTok', color: '#000', icon: '🎵' };
  if (lower.includes('instagram.com')) return { name: 'Instagram', color: '#E1306C', icon: '📸' };
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return { name: 'YouTube', color: '#FF0000', icon: '▶️' };
  if (lower.includes('twitter.com') || lower.includes('x.com')) return { name: 'X', color: '#1DA1F2', icon: '𝕏' };
  if (lower.includes('discord')) return { name: 'Discord', color: '#5865F2', icon: '💬' };
  if (lower.includes('twitch.tv')) return { name: 'Twitch', color: '#9146FF', icon: '🟣' };
  if (lower.includes('t.me') || lower.includes('telegram')) return { name: 'Telegram', color: '#0088cc', icon: '✈️' };
  return { name: 'Lien', color: '#6c5ce7', icon: '🔗' };
}

interface UserProfilePopupProps {
  user: PopupUser;
  isOwnProfile?: boolean;
  posts: Post[];
  onClose: () => void;
  onLike: (postId: string) => void;
  onMessage?: (userId: string) => void;
  onEditProfile?: () => void;
}

export function UserProfilePopup({ user, isOwnProfile, posts, onClose, onLike, onMessage, onEditProfile }: UserProfilePopupProps) {
  const { profile: myProfile, user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowPanel, setShowFollowPanel] = useState<'followers' | 'following' | null>(null);
  const [followedInPanel, setFollowedInPanel] = useState<Set<number>>(new Set());
  const [profileData, setProfileData] = useState<ProfileData>({
    bio: '',
    handle: user.handle,
    avatarImage: user.avatar || null,
    allowDms: true,
    createdAt: null,
    badge: null,
  });
  const [socialLinks, setSocialLinks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real profile data from Supabase
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('bio, handle, avatar_url, allow_dms, created_at')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfileData({
            bio: data.bio || '',
            handle: data.handle ? `@${data.handle}` : user.handle,
            avatarImage: data.avatar_url || user.avatar || null,
            allowDms: data.allow_dms !== false,
            createdAt: data.created_at || null,
            badge: null,
          });
        }

        // Load social links from localStorage (same as ProfileCard)
        try {
          const savedLinks = localStorage.getItem(`social_links_${user.id}`);
          if (savedLinks) {
            setSocialLinks(JSON.parse(savedLinks));
          }
        } catch {
          // ignore
        }
      } catch (err) {
        // If table doesn't exist or other error, use defaults
      }
      setIsLoading(false);
    };

    // For own profile, use data from AuthContext
    if (isOwnProfile && myProfile) {
      setProfileData({
        bio: myProfile.bio || '',
        handle: myProfile.handle ? `@${myProfile.handle}` : `@${myProfile.username}`,
        avatarImage: myProfile.avatarImage || null,
        allowDms: myProfile.allowDms !== false,
        createdAt: myProfile.createdAt || null,
        badge: myProfile.badge || null,
      });
      // Load social links from localStorage for own profile too
      try {
        const savedLinks = localStorage.getItem(`social_links_${user.id}`);
        if (savedLinks) {
          setSocialLinks(JSON.parse(savedLinks));
        }
      } catch {
        // ignore
      }
      setIsLoading(false);
    } else {
      fetchProfile();
    }
  }, [user.id, isOwnProfile, myProfile]);

  // Load real followers/following counts + follow status
  useEffect(() => {
    const loadFollowData = async () => {
      const [fwersRes, fwingRes] = await Promise.all([
        supabase.from('followers').select('follower_id', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('followers').select('following_id', { count: 'exact', head: true }).eq('follower_id', user.id),
      ]);
      setFollowersCount(fwersRes.count || 0);
      setFollowingCount(fwingRes.count || 0);

      if (authUser && !isOwnProfile) {
        const { data } = await supabase
          .from('followers')
          .select('follower_id')
          .eq('follower_id', authUser.id)
          .eq('following_id', user.id)
          .maybeSingle();
        setIsFollowing(!!data);
      }
    };
    loadFollowData();
  }, [user.id, authUser, isOwnProfile]);

  const handleFollowToggle = async () => {
    if (!authUser) return;
    if (isFollowing) {
      await supabase.from('followers').delete().eq('follower_id', authUser.id).eq('following_id', user.id);
      setIsFollowing(false);
      setFollowersCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from('followers').insert({ follower_id: authUser.id, following_id: user.id });
      setIsFollowing(true);
      setFollowersCount(c => c + 1);
    }
  };

  const getAvatarColor = (id: string) => {
    // Same palette as AuthContext.getColorForId — keeps colors consistent across app
    const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const idHash = (() => {
    let h = 0;
    for (let i = 0; i < user.id.length; i++) {
      h = ((h << 5) - h) + user.id.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  })();

  const stats = {
    posts: posts.length,
    followers: followersCount,
    following: followingCount,
  };

  const tabs: { id: ProfileTab; label: string; count?: number }[] = [
    { id: 'posts', label: 'Posts', count: posts.length },
    { id: 'chapters', label: 'Chapters', count: posts.filter(p => p.type === 'chapter').length },
    { id: 'quiz', label: 'Quiz', count: posts.filter(p => p.type === 'quiz').length },
  ];

  const filteredPosts = (() => {
    switch (activeTab) {
      case 'posts': return posts;
      case 'chapters': return posts.filter(p => p.type === 'chapter');
      case 'quiz': return posts.filter(p => p.type === 'quiz');
      default: return posts;
    }
  })();

  const formatJoinDate = (dateStr: string | null) => {
    if (!dateStr) return 'Janvier 2024';
    const date = new Date(dateStr);
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const canMessage = isOwnProfile ? false : profileData.allowDms;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#0c0c14' }}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b"
        style={{ background: '#111119', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} style={{ color: '#e8e8ed' }} />
        </div>
        <div>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
            {user.username}
          </p>
          <p style={{ fontSize: '12px', color: '#8888a0' }}>
            {stats.posts} post{stats.posts !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Banner */}
        <div
          style={{
            height: '120px',
            background: `linear-gradient(135deg, ${getAvatarColor(user.id)}, ${getAvatarColor(user.id)}66, #0c0c14)`,
          }}
        />

        {/* Avatar + Action buttons row */}
        <div className="px-4" style={{ marginTop: '-40px' }}>
          <div className="flex items-end justify-between">
            {/* Avatar */}
            <div
              className="flex items-center justify-center overflow-hidden"
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '20px',
                background: getAvatarColor(user.id),
                border: '4px solid #0c0c14',
              }}
            >
              {(profileData.avatarImage || user.avatar) ? (
                <img src={profileData.avatarImage || user.avatar} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <span style={{ fontSize: '32px', fontWeight: 700, color: '#fff' }}>
                  {user.username[0].toUpperCase()}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pb-1">
              {isOwnProfile ? (
                <div
                  onClick={() => { onClose(); onEditProfile?.(); }}
                  className="px-4 py-2 rounded-full cursor-pointer hover:opacity-90 transition-opacity active:scale-95"
                  style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8ed' }}>Éditer le profil</span>
                </div>
              ) : (
                <>
                  {canMessage ? (
                    <div
                      onClick={() => onMessage?.(user.id)}
                      className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                    >
                      <MessageCircle size={16} style={{ color: '#e8e8ed' }} />
                    </div>
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ border: '1px solid rgba(255,255,255,0.08)', opacity: 0.4 }}
                      title="Les DMs sont désactivés"
                    >
                      <MessageSquareOff size={16} style={{ color: '#8888a0' }} />
                    </div>
                  )}
                  <div
                    onClick={handleFollowToggle}
                    className="px-4 py-2 rounded-full cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-2"
                    style={{
                      background: isFollowing ? 'transparent' : '#e8e8ed',
                      border: isFollowing ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                    }}
                  >
                    {!isFollowing && <UserPlus size={14} style={{ color: '#0c0c14' }} />}
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: isFollowing ? '#e8e8ed' : '#0c0c14',
                    }}>
                      {isFollowing ? 'Suivi' : 'Suivre'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* User Info */}
        <div style={{ padding: '14px 16px 0' }}>
          <div className="flex items-center gap-2">
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#e8e8ed' }}>
              {user.username}
            </p>
            {profileData.badge && (
              <span
                className="px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{
                  background: `${profileData.badge.color}20`,
                  border: `1px solid ${profileData.badge.color}40`,
                }}
              >
                <span style={{ fontSize: '10px' }}>{profileData.badge.icon}</span>
                <span style={{ fontSize: '10px', fontWeight: 600, color: profileData.badge.color }}>
                  {profileData.badge.name}
                </span>
              </span>
            )}
          </div>
          <p style={{ fontSize: '14px', color: '#8888a0', marginTop: '2px' }}>
            {profileData.handle}
          </p>
        </div>

        {/* Bio */}
        {profileData.bio && (
          <div style={{ padding: '10px 16px 0' }}>
            <p style={{ fontSize: '14px', color: '#e8e8ed', lineHeight: '1.5' }}>
              {profileData.bio}
            </p>
          </div>
        )}

        {/* Social Links */}
        {socialLinks.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" style={{ padding: '10px 16px 0' }}>
            {socialLinks.map((link, i) => {
              const platform = detectPlatform(link);
              if (!platform) return null;
              return (
                <a
                  key={i}
                  href={link.startsWith('http') ? link : `https://${link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:opacity-80 transition-opacity"
                  style={{
                    background: `${platform.color}18`,
                    border: `1px solid ${platform.color}30`,
                  }}
                >
                  <span style={{ fontSize: '12px' }}>{platform.icon}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: platform.color }}>
                    {platform.name}
                  </span>
                </a>
              );
            })}
          </div>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1" style={{ padding: '10px 16px 0' }}>
          <div className="flex items-center gap-1">
            <CalendarDays size={14} style={{ color: '#8888a0' }} />
            <span style={{ fontSize: '13px', color: '#8888a0' }}>
              Rejoint en {formatJoinDate(profileData.createdAt)}
            </span>
          </div>
          {!isOwnProfile && !profileData.allowDms && (
            <div className="flex items-center gap-1">
              <MessageSquareOff size={14} style={{ color: '#ef4444' }} />
              <span style={{ fontSize: '13px', color: '#ef4444' }}>DMs désactivés</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4" style={{ padding: '14px 16px 0' }}>
          <div className="cursor-pointer hover:underline" onClick={() => setShowFollowPanel('following')}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8ed' }}>{stats.following}</span>
            <span style={{ fontSize: '14px', color: '#8888a0', marginLeft: '4px' }}>abonnements</span>
          </div>
          <div className="cursor-pointer hover:underline" onClick={() => setShowFollowPanel('followers')}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8ed' }}>{stats.followers.toLocaleString()}</span>
            <span style={{ fontSize: '14px', color: '#8888a0', marginLeft: '4px' }}>abonnés</span>
          </div>
        </div>

        {/* Follow Panel overlay */}
        {showFollowPanel && (
          <div className="absolute inset-0 z-20 flex flex-col" style={{ background: '#0d0d14' }}>
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <button onClick={() => setShowFollowPanel(null)} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
                <ArrowLeft size={18} style={{ color: '#e8e8ed' }} />
              </button>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
                {showFollowPanel === 'followers' ? `${stats.followers.toLocaleString()} abonnés` : `${stats.following} abonnements`}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {Array.from({ length: Math.min(showFollowPanel === 'followers' ? stats.followers : stats.following, 20) }).map((_, i) => {
                const seed = (idHash + i * 31 + (showFollowPanel === 'followers' ? 0 : 1000)) % 9999;
                const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
                const color = colors[seed % colors.length];
                const letter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[seed % 26];
                const names = ['Yuki', 'Hana', 'Riku', 'Sora', 'Mika', 'Kei', 'Nao', 'Ren', 'Aoi', 'Kai', 'Luna', 'Nova', 'Zoro', 'Luffy', 'Goku', 'Naruto', 'Sakura', 'Hinata', 'Itachi', 'Levi'];
                const name = names[seed % names.length] + (seed % 99);
                const isFollowedInPanel = followedInPanel.has(seed);
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b cursor-pointer" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: color }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{letter}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>{name}</p>
                      <p style={{ fontSize: '12px', color: '#8888a0' }}>@{name.toLowerCase()}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFollowedInPanel(prev => {
                          const next = new Set(prev);
                          if (next.has(seed)) next.delete(seed); else next.add(seed);
                          return next;
                        });
                      }}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                      style={{
                        background: isFollowedInPanel ? 'rgba(168,85,247,0.12)' : '#a855f7',
                        color: isFollowedInPanel ? '#a855f7' : '#fff',
                        border: isFollowedInPanel ? '1px solid #a855f7' : 'none',
                      }}
                    >
                      {isFollowedInPanel ? 'Suivi' : 'Suivre'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div
          className="flex items-center border-b mt-4"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {tabs.map((tab) => (
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
                {tab.count !== undefined && tab.count > 0 && (
                  <span style={{
                    fontSize: '11px',
                    color: activeTab === tab.id ? '#6c5ce7' : '#555570',
                    marginLeft: '4px',
                  }}>
                    {tab.count}
                  </span>
                )}
              </span>
              {activeTab === tab.id && (
                <div
                  className="absolute bottom-0 left-1/2 h-1 rounded-full"
                  style={{
                    width: '40px',
                    transform: 'translateX(-50%)',
                    background: '#6c5ce7',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Posts list */}
        <div>
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post, index) => (
              <React.Fragment key={post.id}>
                <PostCard
                  post={post}
                  currentUser={myProfile ? {
                    id: authUser?.id || '',
                    username: myProfile.username,
                    handle: myProfile.handle ? `@${myProfile.handle}` : `@${myProfile.username}`,
                    avatar: myProfile.avatarImage || '',
                  } : null}
                  onLike={onLike}
                />
                {index < filteredPosts.length - 1 && (
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                )}
              </React.Fragment>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <span style={{ fontSize: '40px', marginBottom: '12px' }}>
                {activeTab === 'chapters' ? '📖' : activeTab === 'quiz' ? '🧠' : '📝'}
              </span>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#8888a0' }}>
                {`Aucun ${activeTab === 'chapters' ? 'chapitre' : activeTab === 'quiz' ? 'quiz' : 'post'} pour le moment`}
              </p>
              <p style={{ fontSize: '13px', color: '#555570', marginTop: '4px' }}>
                {isOwnProfile ? 'Publiez votre premier contenu!' : 'Revenez plus tard.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
