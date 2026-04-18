import React, { useState, useEffect, useCallback } from 'react';
import { Edit3, Loader2, UserPlus, Check } from 'lucide-react';
import { PostCard } from './PostCard';
import { ComposePost } from './ComposePost';
import { UserProfilePopup } from './UserProfilePopup';
import ProfileCard from '../ProfileCard';
import { supabase } from '../../lib/supabase';
import { canCreatePost, canUpload } from '../../lib/rateLimit';
import { useAuth } from '../../contexts/AuthContext';

interface User { id: string; username: string; handle: string; avatar: string; }
interface SuggestedUser { id: string; username: string; handle: string | null; avatar_url: string | null; }
import type { Post } from './types';

interface FeedPageProps {
  isAuthenticated: boolean;
  currentUser: User | null;
  onNavigate?: (tab: 'quiz' | 'catalogue' | 'game', data?: string) => void;
  onOpenChat?: (userId: string) => void;
  onOpenSettings?: () => void;
}

const getDisplayName = (username: string) => username.startsWith('user_') ? 'Anonyme' : username;

export function FeedPage({ isAuthenticated, currentUser, onNavigate, onOpenChat }: FeedPageProps) {
  const { profile } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'trending' | 'following' | 'latest'>('trending');
  const [showCompose, setShowCompose] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [emptyFollowing, setEmptyFollowing] = useState(false);

  // ── Map raw DB row to Post ──────────────────────────────────────────
  const mapRow = useCallback((row: any): Post => {
    const prof = row.profile;
    const likedByMe = currentUser
      ? (row.feed_post_likes || []).some((l: any) => l.user_id === currentUser.id)
      : false;
    let poll: Post['poll'] = undefined;
    if (row.type === 'poll' && row.poll_options) {
      const opts = row.poll_options as { id: string; text: string; votes: number }[];
      const totalVotes = opts.reduce((s: number, o: any) => s + (o.votes || 0), 0);
      poll = { question: row.poll_question || row.content, options: opts, totalVotes };
    }
    return {
      id: row.id,
      user: {
        id: prof?.id || row.user_id,
        username: getDisplayName(prof?.username || 'Unknown'),
        handle: prof?.handle ? `@${prof.handle}` : `@${getDisplayName(prof?.username || 'unknown')}`,
        avatar: prof?.avatar_url || '',
      },
      content: row.content || '',
      timestamp: new Date(row.created_at),
      images: row.images || [],
      likes: (row.feed_post_likes || []).length,
      comments: (row.feed_post_comments || []).length,
      reposts: 0,
      isLiked: likedByMe,
      type: row.type || 'text',
      embed: row.embed_type ? {
        type: row.embed_type as 'chapter' | 'quiz' | 'game',
        title: row.embed_title || '',
        subtitle: row.embed_subtitle || '',
        icon: row.embed_icon || '📖',
      } : undefined,
      poll,
    };
  }, [currentUser]);

  // ── Fetch posts from DB ─────────────────────────────────────────────
  const fetchPosts = useCallback(async () => {
    setLoading(true);

    // "Abonnements" — only posts from followed users
    if (activeFilter === 'following') {
      if (!currentUser) { setPosts([]); setLoading(false); return; }
      const { data: followData } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', currentUser.id);
      const ids = (followData || []).map((f: any) => f.following_id);
      if (ids.length === 0) { setPosts([]); setEmptyFollowing(true); setLoading(false); return; }
      setEmptyFollowing(false);
      const { data, error } = await supabase
        .from('feed_posts')
        .select('*, profile:user_id(id, username, handle, avatar_url), feed_post_likes(user_id), feed_post_comments(id)')
        .in('user_id', ids)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error) setPosts((data || []).map(mapRow));
      setLoading(false);
      return;
    }

    // "Tendances" and "Récents"
    const { data, error } = await supabase
      .from('feed_posts')
      .select('*, profile:user_id(id, username, handle, avatar_url), feed_post_likes(user_id), feed_post_comments(id)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) { console.error(error); setLoading(false); return; }

    let mapped = (data || []).map(mapRow);

    // "Tendances" — sort by likes desc
    if (activeFilter === 'trending') {
      mapped = [...mapped].sort((a, b) => b.likes - a.likes);
    }

    setPosts(mapped);
    setLoading(false);
  }, [currentUser, activeFilter, mapRow]);

  // ── Fetch suggested users (not already followed) ────────────────────
  const fetchSuggestedUsers = useCallback(async () => {
    if (!currentUser) return;
    const { data: followData } = await supabase
      .from('followers').select('following_id').eq('follower_id', currentUser.id);
    const followingIds = (followData || []).map((f: any) => f.following_id);
    const excludeIds = [currentUser.id, ...followingIds];
    setFollowedIds(new Set(followingIds));
    const { data } = await supabase
      .from('profiles')
      .select('id, username, handle, avatar_url')
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .limit(5);
    setSuggestedUsers((data || []) as SuggestedUser[]);
  }, [currentUser]);

  // ── Follow / Unfollow a suggested user ─────────────────────────────
  const handleFollowToggle = async (targetId: string) => {
    if (!currentUser) return;
    const isFollowing = followedIds.has(targetId);
    setFollowedIds(prev => {
      const next = new Set(prev);
      isFollowing ? next.delete(targetId) : next.add(targetId);
      return next;
    });
    if (isFollowing) {
      await supabase.from('followers').delete()
        .eq('follower_id', currentUser.id).eq('following_id', targetId);
    } else {
      await supabase.from('followers').insert({ follower_id: currentUser.id, following_id: targetId });
    }
    // Remove from suggestions when followed
    if (!isFollowing) setSuggestedUsers(prev => prev.filter(u => u.id !== targetId));
  };

  // ── Real hashtags from posts ────────────────────────────────────────
  const getRealHashtags = () => {
    const counts: Record<string, number> = {};
    posts.forEach(p => {
      (p.content.match(/#\w+/g) || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, count]) => ({ tag, count }));
  };

  useEffect(() => {
    fetchPosts();
    fetchSuggestedUsers();
    const channel = supabase
      .channel('feed_posts_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_posts' }, () => fetchPosts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPosts, fetchSuggestedUsers]);

  // ── Like/Unlike ─────────────────────────────────────────────────────
  const handleLike = async (postId: string) => {
    if (!currentUser) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
        : p
    ));

    if (post.isLiked) {
      // Unlike
      await supabase.from('feed_post_likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
    } else {
      // Like
      await supabase.from('feed_post_likes').insert({ post_id: postId, user_id: currentUser.id });
    }
  };

  // ── Delete post ─────────────────────────────────────────────────────
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Supprimer ce post ?')) return;
    setPosts(prev => prev.filter(p => p.id !== postId));
    await supabase.from('feed_posts').delete().eq('id', postId);
  };

  // ── Create post ─────────────────────────────────────────────────────
  const handleNewPost = async (
    content: string,
    images?: string[],
    embed?: { type: 'chapter' | 'quiz'; title: string; subtitle: string; icon: string },
    poll?: { question: string; options: string[] },
  ) => {
    if (!currentUser) return;

    // Rate limit: max 3 posts per minute
    if (!canCreatePost(currentUser.id)) {
      alert('Trop de posts — attendez un moment avant de publier à nouveau.');
      return;
    }

    // Upload rate limit
    if (images && images.length > 0 && !canUpload(currentUser.id)) {
      alert('Trop d\'uploads — attendez quelques minutes.');
      return;
    }

    let type: Post['type'] = 'text';
    if (poll) type = 'poll';
    else if (embed) type = embed.type;
    else if (images && images.length > 0) type = 'image';

    // Upload images to Supabase Storage if they are data URLs
    const uploadedUrls: string[] = [];
    if (images) {
      for (const img of images) {
        if (img.startsWith('data:')) {
          const url = await uploadMediaToStorage(img);
          if (url) uploadedUrls.push(url);
        } else {
          uploadedUrls.push(img);
        }
      }
    }

    const pollOptions = poll
      ? poll.options.map((text, i) => ({ id: `opt${i}`, text, votes: 0 }))
      : null;

    const { error } = await supabase.from('feed_posts').insert({
      user_id: currentUser.id,
      content: content.trim(),
      type,
      images: uploadedUrls.length > 0 ? uploadedUrls : [],
      embed_type: embed?.type || null,
      embed_title: embed?.title || null,
      embed_subtitle: embed?.subtitle || null,
      embed_icon: embed?.icon || null,
      poll_question: poll ? (content.trim() || poll.question) : null,
      poll_options: pollOptions,
    });

    if (error) {
      alert('Erreur lors de la publication : ' + error.message);
      return;
    }

    setShowCompose(false);
    fetchPosts(); // Refresh
  };

  const filters = [
    { id: 'trending' as const, label: 'Tendances' },
    { id: 'following' as const, label: 'Abonnements' },
    { id: 'latest' as const, label: 'Récents' },
  ];

  const realHashtags = getRealHashtags();

  const categories = [
    { emoji: '⚔️', label: 'Action' },
    { emoji: '💕', label: 'Romance' },
    { emoji: '😂', label: 'Comédie' },
    { emoji: '👹', label: 'Surnaturel' },
    { emoji: '🚀', label: 'Sci-Fi' },
  ];

  return (
    <div className="h-full flex flex-col" style={{ background: '#0c0c14' }}>
      {/* Filter Tabs */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b overflow-x-auto flex-shrink-0"
        style={{
          background: '#111119',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className="px-4 py-2 rounded-full transition-all whitespace-nowrap"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: activeFilter === filter.id ? '#e8e8ed' : '#8888a0',
              background: activeFilter === filter.id ? '#6c5ce7' : 'transparent',
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Sidebar — Desktop only */}
        <div
          className="hidden md:flex flex-col w-64 xl:w-72 flex-shrink-0 overflow-y-auto border-r gap-4 p-4"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {/* Trending Topics */}
          <div
            className="rounded-2xl border p-4"
            style={{ background: '#111119', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: '16px' }}>🔥</span>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8ed' }}>
                Tendances
              </h3>
            </div>
            <div className="space-y-1">
              {realHashtags.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#555570', textAlign: 'center', padding: '8px 0' }}>
                  Aucun hashtag pour l'instant
                </p>
              ) : realHashtags.map((topic, i) => (
                <div
                  key={topic.tag}
                  className="px-2 py-2 rounded-lg hover:bg-[#1f1f2e] cursor-pointer transition-colors"
                >
                  <p style={{ fontSize: '11px', color: '#555570' }}>#{i + 1} · Trending</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>{topic.tag}</p>
                  <p style={{ fontSize: '11px', color: '#8888a0' }}>{topic.count} post{topic.count > 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div
            className="rounded-2xl border p-4"
            style={{ background: '#111119', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: '16px' }}>🎯</span>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8ed' }}>
                Catégories
              </h3>
            </div>
            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat.label}
                  className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-[#1f1f2e] transition-colors text-left"
                >
                  <span style={{ fontSize: '18px' }}>{cat.emoji}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#8888a0' }}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Feed */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#6c5ce7' }} />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20">
                <p style={{ fontSize: '40px', marginBottom: '12px' }}>
                  {activeFilter === 'following' ? '👥' : '📭'}
                </p>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8ed' }}>
                  {activeFilter === 'following' && emptyFollowing
                    ? 'Vous ne suivez personne encore'
                    : activeFilter === 'following'
                    ? 'Aucun post de vos abonnements'
                    : 'Aucun post pour le moment'}
                </p>
                <p style={{ fontSize: '13px', color: '#8888a0', marginTop: '4px' }}>
                  {activeFilter === 'following'
                    ? 'Suivez des utilisateurs pour voir leurs posts ici'
                    : 'Sois le premier à publier !'}
                </p>
              </div>
            ) : (
              posts.map((post, index) => (
                <React.Fragment key={post.id}>
                  <PostCard
                    post={post}
                    currentUser={currentUser}
                    onLike={handleLike}
                    onDelete={currentUser?.id === post.user.id ? handleDeletePost : undefined}
                    onEmbedAction={(type) => {
                      if (type === 'game') {
                        const codeMatch = post.embed?.subtitle?.match(/Code:\s*(\S+)/);
                        onNavigate?.('game', codeMatch?.[1]);
                      } else {
                        onNavigate?.(type === 'quiz' ? 'quiz' : 'catalogue');
                      }
                    }}
                    onUserClick={(user) => setProfileUser(user)}
                  />
                  {index < posts.length - 1 && (
                    <div
                      className="h-px"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    />
                  )}
                </React.Fragment>
              ))
            )}
          </div>
        </div>

        {/* Right Sidebar — Desktop only */}
        <div
          className="hidden md:flex flex-col w-72 xl:w-80 flex-shrink-0 overflow-y-auto border-l gap-4 p-4"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {/* Who to follow */}
          <div
            className="rounded-2xl border p-4"
            style={{ background: '#111119', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: '16px' }}>✨</span>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8ed' }}>
                À suivre
              </h3>
            </div>
            <div className="space-y-3">
              {suggestedUsers.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#555570', textAlign: 'center', padding: '8px 0' }}>
                  {isAuthenticated ? 'Vous suivez déjà tout le monde !' : 'Connectez-vous pour voir des suggestions'}
                </p>
              ) : suggestedUsers.map((u) => {
                const isFollowing = followedIds.has(u.id);
                const avatarColor = (() => {
                  const palette = ['#3b82f6','#ec4899','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4'];
                  let h = 0;
                  for (let i = 0; i < u.id.length; i++) h = ((h << 5) - h) + u.id.charCodeAt(i);
                  return palette[Math.abs(h) % palette.length];
                })();
                return (
                  <div key={u.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                      style={{ background: u.avatar_url ? 'transparent' : avatarColor }}>
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{getDisplayName(u.username)[0].toUpperCase()}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                        {getDisplayName(u.username)}
                      </p>
                      <p className="truncate" style={{ fontSize: '12px', color: '#8888a0' }}>
                        {u.handle ? `@${u.handle}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleFollowToggle(u.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full flex-shrink-0 transition-all"
                      style={{
                        background: isFollowing ? 'rgba(108,92,231,0.15)' : '#6c5ce7',
                        fontSize: '11px', fontWeight: 600,
                        color: isFollowing ? '#6c5ce7' : '#fff',
                        border: isFollowing ? '1px solid #6c5ce7' : 'none',
                      }}
                    >
                      {isFollowing ? <><Check size={10} /> Suivi</> : <><UserPlus size={10} /> Suivre</>}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compose widget — desktop */}
          {isAuthenticated && (
            <div
              className="rounded-2xl border p-4"
              style={{ background: '#111119', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <p style={{ fontSize: '13px', color: '#8888a0', marginBottom: '12px' }}>
                Partage ta passion otaku ✨
              </p>
              <button
                onClick={() => setShowCompose(true)}
                className="w-full py-2 rounded-xl font-semibold transition-opacity hover:opacity-90"
                style={{ background: '#6c5ce7', fontSize: '14px', color: '#ffffff' }}
              >
                Nouveau post
              </button>
            </div>
          )}

          {/* Stats widget */}
          <div
            className="rounded-2xl border p-4"
            style={{ background: '#111119', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: '16px' }}>📊</span>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8ed' }}>
                Communauté
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Membres', value: '24.8K' },
                { label: 'Posts/jour', value: '1.2K' },
                { label: 'En ligne', value: '342' },
                { label: 'Mangas', value: '8.4K' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-2 rounded-xl text-center"
                  style={{ background: 'rgba(108,92,231,0.08)' }}
                >
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#6c5ce7' }}>
                    {stat.value}
                  </p>
                  <p style={{ fontSize: '11px', color: '#8888a0' }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Compose Button (Floating — Mobile only) */}
      {isAuthenticated && (
        <button
          onClick={() => setShowCompose(true)}
          className="fixed md:hidden bottom-20 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110"
          style={{
            background: '#6c5ce7',
            boxShadow: '0 8px 24px rgba(108,92,231,0.4)',
          }}
        >
          <Edit3 size={24} style={{ color: '#ffffff' }} />
        </button>
      )}

      {/* Compose Post Sheet */}
      {showCompose && (
        <ComposePost
          currentUser={currentUser}
          onClose={() => setShowCompose(false)}
          onPost={handleNewPost}
        />
      )}

      {/* User Profile Page */}
      {profileUser && (
        <UserProfilePopup
          user={profileUser}
          isOwnProfile={currentUser?.id === profileUser.id}
          posts={posts.filter(p => p.user.id === profileUser.id)}
          onClose={() => setProfileUser(null)}
          onLike={handleLike}
          onMessage={(userId) => {
            onOpenChat?.(userId);
          }}
          onEditProfile={() => { setProfileUser(null); setShowEditProfile(true); }}
        />
      )}

      {/* Edit Profile Card */}
      {showEditProfile && currentUser && (
        <ProfileCard
          isOpen={showEditProfile}
          onClose={() => setShowEditProfile(false)}
          variant="owner"
          user={{
            id: currentUser.id,
            username: currentUser.username,
            displayName: profile?.username || currentUser.username,
            avatarColor: profile?.avatarColor || '#3b82f6',
            isActive: true,
          }}
        />
      )}
    </div>
  );
}

// ── Upload media data URL to Supabase Storage ─────────────────────────
async function uploadMediaToStorage(dataUrl: string): Promise<string | null> {
  try {
    // Parse data URL
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;

    const mime = match[1];
    const base64 = match[2];
    const ext = mime.split('/')[1]?.split('+')[0] || 'bin';
    const fileName = `feed/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Convert base64 to Uint8Array
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const { error } = await supabase.storage
      .from('chapters')
      .upload(fileName, bytes, { contentType: mime, upsert: false });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage.from('chapters').getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (e) {
    console.error('Upload failed:', e);
    return null;
  }
}
