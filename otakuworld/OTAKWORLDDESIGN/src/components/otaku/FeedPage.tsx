import React, { useState } from 'react';
import { Edit3 } from 'lucide-react';
import { PostCard } from './PostCard';
import { ComposePost } from './ComposePost';
import type { User } from '../../App';
import type { Post } from './types';

interface FeedPageProps {
  isAuthenticated: boolean;
  currentUser: User | null;
}

export function FeedPage({ isAuthenticated, currentUser }: FeedPageProps) {
  const [activeFilter, setActiveFilter] = useState<'trending' | 'following' | 'latest'>('trending');
  const [showCompose, setShowCompose] = useState(false);

  // Mock data
  const [posts, setPosts] = useState<Post[]>([
    {
      id: '1',
      user: {
        id: '1',
        username: 'Alex',
        handle: '@alex_manga',
        avatar: 'https://i.pravatar.cc/150?img=1',
      },
      content: 'Le dernier chapitre de One Piece était INSANE!! 🔥🏴‍☠️',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      images: ['https://images.unsplash.com/photo-1705927450843-3c1abe9b17d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmltZSUyMG1hbmdhJTIwYXJ0d29yayUyMGNvbG9yZnVsfGVufDF8fHx8MTc3MTIwNDY4Nnww&ixlib=rb-4.1.0&q=80&w=1080'],
      likes: 156,
      comments: 24,
      reposts: 12,
      type: 'image',
    },
    {
      id: '2',
      user: {
        id: '2',
        username: 'Marie',
        handle: '@marie_ht',
        avatar: 'https://i.pravatar.cc/150?img=5',
      },
      content: 'Quiz time! 🧠 Qui peut nommer les 5 Kage dans Naruto?',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      likes: 89,
      comments: 48,
      reposts: 5,
      type: 'quiz',
      embed: {
        type: 'quiz',
        title: 'Connais-tu les Kage?',
        subtitle: '10 questions · Naruto',
        icon: '🧠',
      },
    },
    {
      id: '3',
      user: {
        id: '3',
        username: 'Sophie',
        handle: '@sophie_dev',
        avatar: 'https://i.pravatar.cc/150?img=9',
      },
      content: '📖 Nouveau chapitre publié!\nSolo Leveling Ch. 201',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      likes: 420,
      comments: 156,
      reposts: 89,
      type: 'chapter',
      embed: {
        type: 'chapter',
        title: 'Solo Leveling',
        subtitle: 'Chapitre 201 - Final',
        icon: '⚔️',
      },
    },
    {
      id: '4',
      user: {
        id: '4',
        username: 'Jean',
        handle: '@jean_otaku',
        avatar: 'https://i.pravatar.cc/150?img=7',
      },
      content: 'Jujutsu Kaisen saison 3 confirmée!! Les théories sur Gojo étaient vraies 👀✨',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      likes: 234,
      comments: 67,
      reposts: 34,
      type: 'text',
    },
    {
      id: '5',
      user: {
        id: '5',
        username: 'Yuki',
        handle: '@yuki_anime',
        avatar: 'https://i.pravatar.cc/150?img=8',
      },
      content: 'Tokyo vibes 🌸 Qui a déjà visité Akihabara? C\'est le paradis des otakus! 🎮✨',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      images: [
        'https://images.unsplash.com/photo-1576863514292-542ef379c13b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXBhbmVzZSUyMGN1bHR1cmUlMjBzdHJlZXQlMjB0b2t5b3xlbnwxfHx8fDE3NzEyMDQ2ODl8MA&ixlib=rb-4.1.0&q=80&w=1080',
        'https://images.unsplash.com/photo-1763315371250-4ecc8bcd0638?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW5nYSUyMGNvbWljJTIwaWxsdXN0cmF0aW9uJTIwYWN0aW9ufGVufDF8fHx8MTc3MTIwNDY5M3ww&ixlib=rb-4.1.0&q=80&w=1080',
      ],
      likes: 342,
      comments: 89,
      reposts: 45,
      type: 'image',
    },
    {
      id: '6',
      user: {
        id: '6',
        username: 'Kaito',
        handle: '@kaito_reads',
        avatar: 'https://i.pravatar.cc/150?img=12',
      },
      content: 'Ma collection de mangas vient d\'atteindre 500 volumes!! 📚🎉 Prochain objectif: 1000! #MangaCollection',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      likes: 178,
      comments: 52,
      reposts: 23,
      type: 'text',
    },
  ]);

  const handleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
  };

  const handleNewPost = (content: string, images?: string[]) => {
    if (!currentUser) return;

    const newPost: Post = {
      id: Date.now().toString(),
      user: {
        id: currentUser.id,
        username: currentUser.username,
        handle: `@${currentUser.username.toLowerCase()}`,
        avatar: currentUser.avatar,
      },
      content,
      timestamp: new Date(),
      images,
      likes: 0,
      comments: 0,
      reposts: 0,
      type: images && images.length > 0 ? 'image' : 'text',
    };

    setPosts([newPost, ...posts]);
    setShowCompose(false);
  };

  const filters = [
    { id: 'trending' as const, label: 'Trending' },
    { id: 'following' as const, label: 'Following' },
    { id: 'latest' as const, label: 'Latest' },
  ];

  return (
    <div className="h-full flex flex-col" style={{ background: '#0c0c14' }}>
      {/* Filter Tabs */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b overflow-x-auto"
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

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {posts.map((post, index) => (
            <React.Fragment key={post.id}>
              <PostCard post={post} onLike={handleLike} />
              {index < posts.length - 1 && (
                <div
                  className="h-px"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Compose Button (Floating) */}
      {isAuthenticated && (
        <button
          onClick={() => setShowCompose(true)}
          className="fixed bottom-20 right-4 md:bottom-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110"
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
    </div>
  );
}