import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { MangaCard } from './MangaCard';
import { MangaDetailPage } from './MangaDetailPage';
import { PublishChapter } from './PublishChapter';
import type { MangaTitle } from './types';

type LibraryTab = 'manga' | 'anime' | 'webtoon' | 'ln';

export function LibraryPage() {
  const [activeTab, setActiveTab] = useState<LibraryTab>('manga');
  const [selectedManga, setSelectedManga] = useState<MangaTitle | null>(null);
  const [showPublish, setShowPublish] = useState(false);

  // Mock data
  const trendingManga: MangaTitle[] = [
    {
      id: '1',
      title: 'Solo Leveling',
      coverImage: 'https://images.unsplash.com/photo-1759302307377-e72f6a6918a1?w=400&h=600&fit=crop',
      rating: 4.8,
      chapters: 201,
      status: 'completed',
      genre: ['Action', 'Fantasy'],
      icon: '⚔️',
    },
    {
      id: '2',
      title: 'Jujutsu Kaisen',
      coverImage: 'https://images.unsplash.com/photo-1652619136719-2ddf8e849a71?w=400&h=600&fit=crop',
      rating: 4.7,
      chapters: 271,
      status: 'ongoing',
      genre: ['Action', 'Surnaturel'],
      icon: '👹',
    },
    {
      id: '3',
      title: 'One Piece',
      coverImage: 'https://images.unsplash.com/photo-1741462977698-3ec10ad7e878?w=400&h=600&fit=crop',
      rating: 4.9,
      chapters: 1108,
      status: 'ongoing',
      genre: ['Aventure', 'Comédie'],
      icon: '🏴‍☠️',
    },
    {
      id: '4',
      title: 'Chainsaw Man',
      coverImage: 'https://images.unsplash.com/photo-1542508636-3adff134f649?w=400&h=600&fit=crop',
      rating: 4.6,
      chapters: 180,
      status: 'ongoing',
      genre: ['Action', 'Horreur'],
      icon: '🪚',
    },
  ];

  const recentUpdates: MangaTitle[] = [
    {
      id: '1',
      title: 'Solo Leveling',
      coverImage: 'https://images.unsplash.com/photo-1759302307377-e72f6a6918a1?w=400&h=600&fit=crop',
      rating: 4.8,
      chapters: 201,
      status: 'completed',
      genre: ['Action', 'Fantasy'],
      icon: '⚔️',
    },
    {
      id: '2',
      title: 'Jujutsu Kaisen',
      coverImage: 'https://images.unsplash.com/photo-1652619136719-2ddf8e849a71?w=400&h=600&fit=crop',
      rating: 4.7,
      chapters: 271,
      status: 'ongoing',
      genre: ['Action', 'Surnaturel'],
      icon: '👹',
    },
  ];

  const allTitles: MangaTitle[] = [...trendingManga, ...trendingManga];

  const tabs = [
    { id: 'manga' as const, label: 'Manga' },
    { id: 'anime' as const, label: 'Anime' },
    { id: 'webtoon' as const, label: 'Webtoon' },
    { id: 'ln' as const, label: 'LN' },
  ];

  if (showPublish) {
    return (
      <PublishChapter
        onBack={() => setShowPublish(false)}
        onPublishComplete={() => setShowPublish(false)}
      />
    );
  }

  if (selectedManga) {
    return (
      <MangaDetailPage
        manga={selectedManga}
        onBack={() => setSelectedManga(null)}
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
          <span style={{ fontSize: '18px' }}>📖</span>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
            Bibliothèque
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPublish(true)}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ background: '#6c5ce7' }}
          >
            <Plus size={18} style={{ color: '#ffffff' }} />
          </button>
          <button className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors">
            <Search size={20} style={{ color: '#e8e8ed' }} />
          </button>
        </div>
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
        {/* Tendances */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <span style={{ fontSize: '16px' }}>🔥</span>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
              Tendances
            </h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {trendingManga.map((manga) => (
              <div
                key={manga.id}
                className="flex-shrink-0"
                style={{ width: '120px' }}
                onClick={() => setSelectedManga(manga)}
              >
                <MangaCard manga={manga} size="small" />
              </div>
            ))}
            <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '40px' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#1a1a25' }}>
                <span style={{ fontSize: '16px' }}>→</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dernières mises à jour */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <span style={{ fontSize: '16px' }}>📢</span>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
              Dernières mises à jour
            </h3>
          </div>
          <div className="space-y-2">
            {recentUpdates.map((manga) => (
              <div
                key={manga.id}
                className="p-3 rounded-2xl border flex items-center gap-3 hover:bg-[#1f1f2e] transition-colors cursor-pointer"
                style={{
                  background: '#111119',
                  borderColor: 'rgba(255,255,255,0.06)',
                }}
                onClick={() => setSelectedManga(manga)}
              >
                <span style={{ fontSize: '24px' }}>{manga.icon}</span>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                    {manga.title}
                  </p>
                  <p style={{ fontSize: '11px', color: '#8888a0' }}>
                    Ch. {manga.chapters} · il y a 2h · ⭐ {manga.rating}
                  </p>
                  <p style={{ fontSize: '11px', color: '#8888a0' }}>
                    par @{manga.id === '1' ? 'sophie_dev' : 'alex_manga'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tous les titres */}
        <div className="px-4 py-4">
          <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
            Tous les titres A-Z
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {allTitles.map((manga, index) => (
              <div key={`${manga.id}-${index}`} onClick={() => setSelectedManga(manga)}>
                <MangaCard manga={manga} size="medium" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}