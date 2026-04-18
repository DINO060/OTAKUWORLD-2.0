import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, HelpCircle, Play, Heart } from 'lucide-react';
import { CarouselSection } from './CarouselSection';
import { PosterCard, PosterCardSkeleton } from './PosterCard';
import { DetailPage } from './DetailPage';
import type { DiscoverItem } from '../../../services/discoverApi';
import {
  getAnimeTrending,
  getAnimeSeason,
  getAnimeUpcoming,
  getAnimeTop,
  searchAnime,
  getMangaTrending,
  getMangaTop,
  searchManga,
  getMoviesTrending,
  getMoviesPopular,
  getMoviesUpcoming,
  searchMovies,
  getTvTrending,
  getTvPopular,
  searchTv,
  getLNTrending,
  getLNTop,
  searchLN,
  getBooksTrending,
  getBooksPopular,
  searchBooks,
  getMusicTopTracks,
  getMusicAnimeTracks,
  searchMusic,
  getGamesTrending,
  getGamesPopular,
  getGamesUpcoming,
  getGamesTop,
  searchGames,
} from '../../../services/discoverApi';

type CatalogueTab = 'home' | 'favorites' | 'anime' | 'manga' | 'films' | 'series' | 'ln' | 'books' | 'music' | 'games';

interface CataloguePageProps {
  onOpenBiblio?: () => void;
}

interface SectionData {
  key: string;
  title: string;
  emoji: string;
  items: DiscoverItem[];
  isLoading: boolean;
}

const TABS: { id: CatalogueTab; label: string; icon: string }[] = [
  { id: 'home', label: 'Accueil', icon: '🏠' },
  { id: 'favorites', label: 'Favoris', icon: '❤️' },
  { id: 'anime', label: 'Anime', icon: '⛩️' },
  { id: 'manga', label: 'Manga', icon: '📖' },
  { id: 'films', label: 'Films', icon: '🎬' },
  { id: 'series', label: 'Séries', icon: '📺' },
  { id: 'ln', label: 'Light Novel', icon: '📝' },
  { id: 'books', label: 'Livres', icon: '📚' },
  { id: 'music', label: 'Musique', icon: '🎵' },
  { id: 'games', label: 'Jeux', icon: '🎮' },
];

const hasTmdb = () => !!import.meta.env.VITE_TMDB_API_KEY;
const hasLastfm = () => !!import.meta.env.VITE_LASTFM_API_KEY;
const hasRawg = () => !!import.meta.env.VITE_RAWG_API_KEY;

const needsKey = (tab: CatalogueTab): { needed: boolean; keyName: string; label: string } => {
  if ((tab === 'films' || tab === 'series') && !hasTmdb())
    return { needed: true, keyName: 'VITE_TMDB_API_KEY', label: tab === 'films' ? 'Films' : 'Series' };
  if (tab === 'music' && !hasLastfm())
    return { needed: true, keyName: 'VITE_LASTFM_API_KEY', label: 'Music' };
  if (tab === 'games' && !hasRawg())
    return { needed: true, keyName: 'VITE_RAWG_API_KEY', label: 'Games' };
  return { needed: false, keyName: '', label: '' };
};

/* ───── Hero Banner (integrated with header) ───── */
function HeroBanner({
  items, isLoading, onItemClick, activeTab, children,
}: {
  items: DiscoverItem[]; isLoading: boolean;
  onItemClick: (item: DiscoverItem) => void; activeTab: CatalogueTab;
  children?: React.ReactNode;
}) {
  const [idx, setIdx] = useState(0);
  const heroes = items.slice(0, 5);

  useEffect(() => { setIdx(0); }, [activeTab]);
  useEffect(() => {
    if (heroes.length <= 1) return;
    const t = setInterval(() => setIdx(p => (p + 1) % heroes.length), 6000);
    return () => clearInterval(t);
  }, [heroes.length]);

  const LABELS: Record<string, string> = {
    anime: 'ANIME', manga: 'MANGA', movie: 'MOVIE', tv: 'TV',
    ln: 'LIGHT NOVEL', book: 'BOOK', music: 'MUSIC', game: 'GAME',
  };

  // Loading or no heroes — render header over a shimmer/plain background
  if (isLoading || !heroes.length) {
    return (
      <div className="relative w-full overflow-hidden" style={{ minHeight: '340px' }}>
        {isLoading && <div className="absolute inset-0 skeleton-shimmer" />}
        {!isLoading && <div className="absolute inset-0" style={{ background: '#0a0a12' }} />}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,10,18,0.7) 0%, rgba(10,10,18,0.3) 40%, #0a0a12 100%)' }} />
        {/* Header overlaid */}
        <div className="relative z-10 pt-3">
          {children}
        </div>
      </div>
    );
  }

  const hero = heroes[idx];
  if (!hero) return null;

  return (
    <div className="relative w-full overflow-hidden cursor-pointer" style={{ minHeight: '340px' }}>
      {/* Background image */}
      <img
        src={hero.posterUrl}
        alt={hero.title}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        style={{ filter: 'brightness(0.45) saturate(1.2)' }}
      />
      {/* Gradient overlays */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,10,18,0.65) 0%, rgba(10,10,18,0.2) 35%, rgba(10,10,18,0.6) 70%, #0a0a12 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(10,10,18,0.5) 0%, transparent 55%)' }} />

      {/* Header (search + tabs) overlaid at top */}
      <div className="relative z-10 pt-3">
        {children}
      </div>

      {/* Hero content at bottom */}
      <div className="relative z-10 px-5 pb-5 mt-2" onClick={() => onItemClick(hero)}>
        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide mb-1.5" style={{ background: '#a855f7', color: '#fff' }}>
          {LABELS[hero.type] || hero.type.toUpperCase()}
        </span>
        <h2 className="text-xl font-black text-white leading-tight" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>
          {hero.title}
        </h2>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[13px]" style={{ color: '#ccc' }}>
          {hero.year && <span>{hero.year}</span>}
          {hero.genres.length > 0 && (
            <>
              <span style={{ color: '#a855f7', fontSize: '6px' }}>●</span>
              <span>{hero.genres.slice(0, 3).join(', ')}</span>
            </>
          )}
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            {heroes.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
                className="rounded-full transition-all"
                style={{ width: idx === i ? '16px' : '5px', height: '5px', background: idx === i ? '#a855f7' : 'rgba(255,255,255,0.3)' }}
              />
            ))}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onItemClick(hero); }}
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            style={{ background: '#a855f7' }}
          >
            <Play size={16} fill="#fff" style={{ color: '#fff', marginLeft: '1px' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───── Main Page ───── */
export function CataloguePage({ onOpenBiblio }: CataloguePageProps) {
  const [activeTab, setActiveTab] = useState<CatalogueTab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DiscoverItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DiscoverItem | null>(null);
  const [sections, setSections] = useState<Record<string, SectionData>>({});
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [detailHistory, setDetailHistory] = useState<DiscoverItem[]>([]);
  const [favorites, setFavorites] = useState<DiscoverItem[]>([]);

  /* Load sections */
  useEffect(() => {
    if (searchQuery.trim()) return;
    if (activeTab === 'home') { loadHomeSections(); return; }
    const keyCheck = needsKey(activeTab);
    if (keyCheck.needed) return;

    const tabSections = getTabSections(activeTab);
    const loadingState: Record<string, SectionData> = {};
    tabSections.forEach(s => {
      loadingState[s.key] = { ...s, items: sections[s.key]?.items || [], isLoading: !sections[s.key]?.items.length };
    });
    setSections(prev => ({ ...prev, ...loadingState }));

    (async () => {
      for (const section of tabSections) {
        if (sections[section.key]?.items.length) continue;
        try {
          const items = await section.fetcher();
          setSections(prev => ({ ...prev, [section.key]: { ...section, items, isLoading: false } }));
        } catch {
          setSections(prev => ({ ...prev, [section.key]: { ...section, items: [], isLoading: false } }));
        }
      }
    })();
  }, [activeTab, searchQuery]);

  const loadHomeSections = async () => {
    const defs: { key: string; title: string; fetcher: () => Promise<DiscoverItem[]> }[] = [
      { key: 'home_anime', title: '⛩️ Anime Tendances', fetcher: getAnimeTrending },
      { key: 'home_manga', title: '📖 Manga Tendances', fetcher: getMangaTrending },
    ];
    if (hasTmdb()) {
      defs.push({ key: 'home_movies', title: '🎬 Films Tendances', fetcher: getMoviesTrending });
      defs.push({ key: 'home_tv', title: '📺 Séries Tendances', fetcher: getTvTrending });
    }
    defs.push({ key: 'home_ln', title: '📝 Light Novels', fetcher: getLNTrending });
    defs.push({ key: 'home_books', title: '📚 Livres Tendances', fetcher: getBooksTrending });
    if (hasLastfm()) defs.push({ key: 'home_music', title: '🎵 Top Musique', fetcher: getMusicTopTracks });
    if (hasRawg()) defs.push({ key: 'home_games', title: '🎮 Jeux Tendances', fetcher: getGamesTrending });

    const loadingState: Record<string, SectionData> = {};
    defs.forEach(s => {
      loadingState[s.key] = { key: s.key, title: s.title, emoji: '', items: sections[s.key]?.items || [], isLoading: !sections[s.key]?.items.length };
    });
    setSections(prev => ({ ...prev, ...loadingState }));

    for (const s of defs) {
      if (sections[s.key]?.items.length) continue;
      try {
        const items = await s.fetcher();
        setSections(prev => ({ ...prev, [s.key]: { key: s.key, title: s.title, emoji: '', items, isLoading: false } }));
      } catch {
        setSections(prev => ({ ...prev, [s.key]: { key: s.key, title: s.title, emoji: '', items: [], isLoading: false } }));
      }
    }
  };

  /* Search */
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!searchQuery.trim()) { setSearchResults([]); setIsSearching(false); return; }
    const searchTab = activeTab === 'home' ? 'anime' : activeTab;
    const keyCheck = needsKey(searchTab as CatalogueTab);
    if (keyCheck.needed) return;

    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        let r: DiscoverItem[] = [];
        switch (searchTab) {
          case 'anime': r = await searchAnime(searchQuery); break;
          case 'manga': r = await searchManga(searchQuery); break;
          case 'films': r = await searchMovies(searchQuery); break;
          case 'series': r = await searchTv(searchQuery); break;
          case 'ln': r = await searchLN(searchQuery); break;
          case 'books': r = await searchBooks(searchQuery); break;
          case 'music': r = await searchMusic(searchQuery); break;
          case 'games': r = await searchGames(searchQuery); break;
        }
        setSearchResults(r);
      } catch { setSearchResults([]); }
      finally { setIsSearching(false); }
    }, 500);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery, activeTab]);

  // Load favorites from localStorage — must be before any conditional return
  useEffect(() => {
    if (activeTab === 'favorites') {
      const favs: DiscoverItem[] = JSON.parse(localStorage.getItem('catalogue_favorites') || '[]');
      setFavorites(favs);
    }
  }, [activeTab]);

  const handleItemClick = useCallback((item: DiscoverItem) => {
    if (selectedItem) setDetailHistory(prev => [...prev, selectedItem]);
    setSelectedItem(item);
  }, [selectedItem]);

  const handleDetailBack = useCallback(() => {
    if (detailHistory.length > 0) {
      setDetailHistory(h => h.slice(0, -1));
      setSelectedItem(detailHistory[detailHistory.length - 1]);
    } else setSelectedItem(null);
  }, [detailHistory]);

  if (selectedItem) {
    return <DetailPage item={selectedItem} onBack={handleDetailBack} onItemClick={handleItemClick} />;
  }

  const keyCheck = (activeTab !== 'home' && activeTab !== 'favorites') ? needsKey(activeTab) : { needed: false, keyName: '', label: '' };

  let currentSections: SectionData[] = [];
  if (activeTab === 'home') {
    const homeKeys = ['home_anime', 'home_manga', 'home_movies', 'home_tv', 'home_ln', 'home_books', 'home_music', 'home_games'];
    currentSections = homeKeys.map(k => sections[k]).filter(Boolean);
  } else {
    currentSections = getTabSections(activeTab).map(s => s.key).map(k => sections[k]).filter(Boolean);
  }

  const heroSection = currentSections[0];
  const heroItems = heroSection?.items || [];
  const heroLoading = heroSection?.isLoading ?? true;

  const CATEGORY_LABELS: Record<CatalogueTab, string> = {
    home: 'DÉCOUVRIR', favorites: 'MES FAVORIS', anime: 'ANIME', manga: 'MANGA', films: 'FILMS',
    series: 'SÉRIES TV', ln: 'LIGHT NOVELS', books: 'LIVRES', music: 'MUSIQUE', games: 'JEUX',
  };

  /* Reusable header content (search + tabs) */
  const headerContent = (
    <div className="px-4">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9ca3af', left: '12px', zIndex: 2 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Rechercher${activeTab === 'home' ? '' : ' ' + (TABS.find(t => t.id === activeTab)?.label || '')}...`}
            className="w-full rounded-xl border outline-none focus:border-[#a855f7] transition-colors text-[13px]"
            style={{
              padding: '10px 14px 10px 36px',
              background: 'rgba(20,20,30,0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderColor: 'rgba(255,255,255,0.15)',
              color: '#e8e8ed',
            }}
          />
        </div>
        {onOpenBiblio && (
          <button onClick={onOpenBiblio} className="p-1.5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0" title="Library">
            <HelpCircle size={17} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </button>
        )}
      </div>

      {/* Tabs — same padding as search, scrollable */}
      <div className="flex overflow-x-auto scrollbar-hide gap-1.5 mt-4 pb-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchQuery(''); setSearchResults([]); }}
            className="px-3 py-1.5 rounded-full transition-all whitespace-nowrap flex items-center gap-1 flex-shrink-0 text-[12px] font-semibold relative"
            style={{
              color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.55)',
              background: activeTab === tab.id ? '#a855f7' : 'rgba(255,255,255,0.08)',
              border: activeTab === tab.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span className="text-[11px]">{tab.icon}</span>
            {tab.label}
            {tab.id === 'favorites' && favorites.length > 0 && (
              <span className="ml-0.5 px-1 py-0 rounded-full text-[10px] font-bold leading-4"
                style={{ background: activeTab === 'favorites' ? 'rgba(255,255,255,0.25)' : '#a855f7', color: '#fff' }}>
                {favorites.length}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto scrollbar-hide" style={{ background: '#0a0a12' }}>
      <div className="w-full max-w-[900px] mx-auto">

      {/* ── No API key ── */}
      {keyCheck.needed ? (
        <>
          {/* Header-only hero (no image) */}
          <HeroBanner items={[]} isLoading={false} onItemClick={handleItemClick} activeTab={activeTab}>
            {headerContent}
          </HeroBanner>
          <div className="flex items-center justify-center py-20">
            <div className="text-center px-8">
              <span className="text-5xl block mb-3">
                {activeTab === 'films' ? '🎬' : activeTab === 'series' ? '📺' : activeTab === 'games' ? '🎮' : '🎵'}
              </span>
              <p className="text-[15px] font-bold text-[#e8e8ed]">{keyCheck.label} — Bientôt disponible</p>
              <p className="text-[13px] text-[#8888a0] mt-1">Configurez {keyCheck.keyName} pour activer.</p>
            </div>
          </div>
        </>

      ) : searchQuery.trim() ? (
        <>
          {/* Search mode: header without hero */}
          <div className="pt-3 pb-2" style={{ background: '#0a0a12' }}>
            {headerContent}
          </div>
          <div className="px-5 pb-8">
            {isSearching ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-2">
                {Array.from({ length: 8 }).map((_, i) => <PosterCardSkeleton key={i} size="medium" />)}
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <p className="mb-3 text-[13px] text-[#8888a0]">
                  {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''} pour « {searchQuery} »
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {searchResults.map(item => (
                    <PosterCard key={item.id} item={item} size="medium" onClick={handleItemClick} showScoreBadge />
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-12 text-center">
                <div>
                  <Search size={28} style={{ color: '#555570', margin: '0 auto' }} />
                  <p className="mt-2 text-[13px] text-[#8888a0]">Aucun résultat pour « {searchQuery} »</p>
                </div>
              </div>
            )}
          </div>
        </>

      ) : activeTab === 'favorites' ? (
        <div className="pb-6">
          {/* Header without hero for favorites */}
          <div className="pt-3 pb-2" style={{ background: '#0a0a12' }}>
            {headerContent}
          </div>

          {/* Category divider */}
          <div className="flex items-center gap-2 px-5 pt-4 pb-1">
            <div className="w-[3px] rounded-full" style={{ height: '16px', background: '#a855f7' }} />
            <h2 className="text-[14px] font-extrabold tracking-wider" style={{ color: '#a855f7' }}>
              MES FAVORIS
            </h2>
          </div>

          {favorites.length > 0 ? (
            <div className="px-5 pt-4">
              <p className="text-[12px] text-[#8888a0] mb-3">{favorites.length} élément{favorites.length > 1 ? 's' : ''} sauvegardé{favorites.length > 1 ? 's' : ''}</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {favorites.map(fav => (
                  <PosterCard key={fav.id} item={fav} size="medium" onClick={handleItemClick} showScoreBadge />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-20 text-center">
              <div>
                <Heart size={40} style={{ color: '#555570', margin: '0 auto' }} />
                <p className="mt-3 text-[15px] font-bold text-[#e8e8ed]">Aucun favori</p>
                <p className="mt-1 text-[13px] text-[#8888a0]">Parcours le catalogue et appuie sur le ❤️ pour sauvegarder ici.</p>
              </div>
            </div>
          )}
        </div>

      ) : (
        <div className="pb-6">

          {/* Hero with integrated header */}
          <HeroBanner items={heroItems} isLoading={heroLoading} onItemClick={handleItemClick} activeTab={activeTab}>
            {headerContent}
          </HeroBanner>

          {/* Category divider */}
          <div className="flex items-center gap-2 px-5 pt-5 pb-1">
            <div className="w-[3px] rounded-full" style={{ height: '16px', background: '#a855f7' }} />
            <h2 className="text-[14px] font-extrabold tracking-wider" style={{ color: '#a855f7' }}>
              {CATEGORY_LABELS[activeTab]}
            </h2>
          </div>

          {/* Carousels */}
          {currentSections.map(section => (
            <CarouselSection
              key={section.key}
              title={section.title}
              items={section.items}
              isLoading={section.isLoading}
              onItemClick={handleItemClick}
            />
          ))}

          {/* Top rated grid */}
          {activeTab !== 'home' && sections[`${activeTab}_top`]?.items.length > 0 && (
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-[3px] rounded-full" style={{ height: '14px', background: '#f59e0b' }} />
                <h3 className="text-[14px] font-bold text-[#e8e8ed]">⭐ Mieux notés</h3>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {sections[`${activeTab}_top`].items.slice(0, 10).map(item => (
                  <PosterCard key={item.id} item={item} size="medium" onClick={handleItemClick} showScoreBadge />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>{/* end max-w container */}
    </div>
  );
}

/* ───── Section definitions ───── */
function getTabSections(tab: CatalogueTab): (SectionData & { fetcher: () => Promise<DiscoverItem[]> })[] {
  const S = (key: string, title: string, fetcher: () => Promise<DiscoverItem[]>) =>
    ({ key, title, emoji: '', items: [] as DiscoverItem[], isLoading: true, fetcher });

  switch (tab) {
    case 'home': return [];
    case 'favorites': return [];
    case 'anime': return [
      S('anime_trending', '🔥 Tendances', getAnimeTrending),
      S('anime_season', '🌸 Cette Saison', getAnimeSeason),
      S('anime_upcoming', '⏳ Prochainement', getAnimeUpcoming),
      S('anime_top', '⭐ Top All-Time', getAnimeTop),
    ];
    case 'manga': return [
      S('manga_trending', '🔥 Tendances', getMangaTrending),
      S('manga_top', '⭐ Top All-Time', getMangaTop),
    ];
    case 'films': return [
      S('films_trending', '🔥 Tendances', getMoviesTrending),
      S('films_popular', '🌟 Les Plus Populaires', getMoviesPopular),
      S('films_upcoming', '🎟️ Prochainement', getMoviesUpcoming),
      S('films_top', '⭐ Mieux Notés', getMoviesPopular),
    ];
    case 'series': return [
      S('series_trending', '🔥 Tendances', getTvTrending),
      S('series_popular', '🌟 Les Plus Populaires', getTvPopular),
      S('series_top', '⭐ Mieux Notées', getTvPopular),
    ];
    case 'ln': return [
      S('ln_trending', '🔥 Tendances', getLNTrending),
      S('ln_top', '⭐ Top All-Time', getLNTop),
    ];
    case 'books': return [
      S('books_trending', '🔥 Tendances', getBooksTrending),
      S('books_popular', '🌟 Populaires', getBooksPopular),
      S('books_top', '⭐ Mieux Notés', getBooksPopular),
    ];
    case 'music': return [
      S('music_top', '🎵 Top Musique', getMusicTopTracks),
      S('music_anime', '⛩️ Musique Anime', getMusicAnimeTracks),
    ];
    case 'games': return [
      S('games_trending', '🔥 Tendances', getGamesTrending),
      S('games_popular', '🌟 Les Plus Populaires', getGamesPopular),
      S('games_upcoming', '🕹️ Prochainement', getGamesUpcoming),
      S('games_top', '⭐ Mieux Notés', getGamesTop),
    ];
  }
}
