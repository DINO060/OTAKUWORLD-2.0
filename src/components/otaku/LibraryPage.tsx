import React, { useState, useMemo } from 'react';
import { Search, Plus, X, ArrowLeft } from 'lucide-react';
import { MangaCard } from './MangaCard';
import { MangaDetailPage } from './MangaDetailPage';
import PublishChapter from '../PublishChapter';
import { useChapters } from '../../contexts/ChaptersContext';
import type { MangaTitle } from './types';

type LibraryTab = 'manga' | 'anime' | 'webtoon' | 'ln';

interface LibraryPageProps {
  onBack: () => void;
}

export function LibraryPage({ onBack }: LibraryPageProps) {
  const [activeTab, setActiveTab] = useState<LibraryTab>('manga');
  const [selectedManga, setSelectedManga] = useState<MangaTitle | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { chapters, isLoading, getAllWorks } = useChapters();

  // Convert real works to MangaTitle format, filtered by active tab
  const allWorks = useMemo(() => {
    const works = getAllWorks();
    return works
      .filter(work => work.workType === activeTab)
      .map((work): MangaTitle => ({
        id: `${work.workTitle}-${work.authorId}`,
        title: work.workTitle,
        coverImage: work.coverImage || '',
        rating: 0,
        chapters: work.chapterCount,
        status: work.status === 'completed' ? 'completed' : 'ongoing',
        genre: work.tags.map(t => t.replace('#', '')),
        icon: activeTab === 'anime' ? '🎬' : activeTab === 'webtoon' ? '📱' : activeTab === 'ln' ? '📝' : '📖',
        author: work.author,
        authorId: work.authorId,
        description: work.description,
      }));
  }, [getAllWorks, activeTab]);

  // Recent chapters filtered by active tab (last 10)
  const recentUpdates = useMemo(() => {
    const seen = new Set<string>();
    const recent: MangaTitle[] = [];
    for (const ch of chapters) {
      if ((ch.workType || 'manga') !== activeTab) continue;
      const key = `${ch.title.toLowerCase().trim()}-${ch.authorId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      recent.push({
        id: ch.id,
        title: ch.title,
        coverImage: ch.coverImage || '',
        rating: 0,
        chapters: ch.chapterNumber,
        status: ch.status === 'completed' ? 'completed' : 'ongoing',
        genre: ch.tags.map(t => t.replace('#', '')),
        icon: '📖',
        author: ch.author,
        authorId: ch.authorId,
        description: ch.description,
      });
      if (recent.length >= 10) break;
    }
    return recent;
  }, [chapters]);

  // Filter by search query
  const filteredWorks = useMemo(() => {
    if (!searchQuery.trim()) return allWorks;
    const q = searchQuery.toLowerCase();
    return allWorks.filter(w =>
      w.title.toLowerCase().includes(q) ||
      w.author?.toLowerCase().includes(q) ||
      w.genre.some(g => g.toLowerCase().includes(q))
    );
  }, [allWorks, searchQuery]);

  const filteredRecent = useMemo(() => {
    if (!searchQuery.trim()) return recentUpdates;
    const q = searchQuery.toLowerCase();
    return recentUpdates.filter(w =>
      w.title.toLowerCase().includes(q) ||
      w.author?.toLowerCase().includes(q)
    );
  }, [recentUpdates, searchQuery]);

  // Trending = works sorted by most chapters/views (top 6)
  const trendingWorks = useMemo(() => {
    return [...filteredWorks]
      .sort((a, b) => b.chapters - a.chapters)
      .slice(0, 6);
  }, [filteredWorks]);

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

  const hasContent = allWorks.length > 0;

  return (
    <div className="h-full flex flex-col" style={{ background: '#0c0c14' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{
          background: '#111119',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
          >
            <ArrowLeft size={20} style={{ color: '#e8e8ed' }} />
          </button>
          <span style={{ fontSize: '18px' }}>📖</span>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
            Bibliothèque
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPublish(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:opacity-80"
            style={{ background: '#6c5ce7' }}
          >
            <Plus size={16} style={{ color: '#ffffff' }} />
            <span
              className="hidden md:inline"
              style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}
            >
              Publier
            </span>
          </button>
          <button
            onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
            className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
            style={{ color: showSearch ? '#6c5ce7' : '#e8e8ed' }}
          >
            {showSearch ? <X size={20} /> : <Search size={20} />}
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div
          className="px-4 py-2 border-b flex-shrink-0"
          style={{ background: '#111119', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#8888a0' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un titre, auteur..."
              autoFocus
              className="w-full pl-9 pr-3 py-2 rounded-xl border outline-none focus:border-[#6c5ce7] transition-colors"
              style={{
                background: '#1a1a25',
                borderColor: 'rgba(255,255,255,0.06)',
                color: '#e8e8ed',
                fontSize: '13px',
              }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b overflow-x-auto flex-shrink-0"
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
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p style={{ fontSize: '13px', color: '#8888a0' }}>Chargement...</p>
            </div>
          </div>
        ) : !hasContent ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <span style={{ fontSize: '48px' }}>📚</span>
              <p className="mt-3" style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
                Aucun contenu {activeTab === 'anime' ? 'animé' : activeTab === 'webtoon' ? 'webtoon' : activeTab === 'ln' ? 'light novel' : 'manga'}
              </p>
              <p className="mt-1" style={{ fontSize: '13px', color: '#8888a0' }}>
                Sois le premier à publier !
              </p>
              <button
                onClick={() => setShowPublish(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg mx-auto hover:opacity-80 transition-colors"
                style={{ background: '#6c5ce7', color: '#ffffff', fontSize: '13px', fontWeight: 600 }}
              >
                <Plus size={16} />
                Publier un chapitre
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tendances */}
            {trendingWorks.length > 0 && (
              <div className="px-4 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontSize: '16px' }}>🔥</span>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
                    Tendances
                  </h3>
                </div>

                {/* Mobile: horizontal scroll */}
                <div className="flex md:hidden gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {trendingWorks.map((manga) => (
                    <div
                      key={manga.id}
                      className="flex-shrink-0"
                      style={{ width: '120px' }}
                      onClick={() => setSelectedManga(manga)}
                    >
                      <MangaCard manga={manga} size="small" />
                    </div>
                  ))}
                </div>

                {/* Desktop: grid */}
                <div className="hidden md:grid grid-cols-5 lg:grid-cols-6 gap-3">
                  {trendingWorks.map((manga) => (
                    <div
                      key={manga.id}
                      onClick={() => setSelectedManga(manga)}
                      className="cursor-pointer"
                    >
                      <MangaCard manga={manga} size="small" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dernières mises à jour */}
            {filteredRecent.length > 0 && (
              <div className="px-4 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontSize: '16px' }}>📢</span>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
                    Dernières mises à jour
                  </h3>
                </div>
                <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-3">
                  {filteredRecent.map((manga) => (
                    <div
                      key={manga.id}
                      className="p-3 rounded-2xl border flex items-center gap-3 hover:bg-[#1f1f2e] transition-colors cursor-pointer"
                      style={{
                        background: '#111119',
                        borderColor: 'rgba(255,255,255,0.06)',
                      }}
                      onClick={() => setSelectedManga(manga)}
                    >
                      {manga.coverImage ? (
                        <img
                          src={manga.coverImage}
                          alt={manga.title}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <span style={{ fontSize: '24px' }}>{manga.icon}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                          {manga.title}
                        </p>
                        <p style={{ fontSize: '11px', color: '#8888a0' }}>
                          Ch. {manga.chapters} · {manga.author ? `par @${manga.author}` : ''}
                        </p>
                      </div>
                      <div
                        className="px-2 py-1 rounded-lg flex-shrink-0"
                        style={{
                          background:
                            manga.status === 'completed'
                              ? 'rgba(34,197,94,0.12)'
                              : 'rgba(108,92,231,0.12)',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: manga.status === 'completed' ? '#22c55e' : '#6c5ce7',
                        }}
                      >
                        {manga.status === 'completed' ? 'Terminé' : 'En cours'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tous les titres */}
            {filteredWorks.length > 0 && (
              <div className="px-4 py-4">
                <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
                  Tous les titres A-Z
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {[...filteredWorks]
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map((manga) => (
                      <div
                        key={manga.id}
                        onClick={() => setSelectedManga(manga)}
                        className="cursor-pointer"
                      >
                        <MangaCard manga={manga} size="medium" />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
