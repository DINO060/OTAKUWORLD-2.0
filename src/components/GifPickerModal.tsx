import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Loader2, TrendingUp } from 'lucide-react';
import {
  searchGifs,
  trendingGifs,
  searchStickers,
  trendingStickers,
  type GiphyGif,
} from '../services/giphy';
import type { GifPayload } from '../types';

const PAGE_SIZE = 20;

type MediaKind = 'gif' | 'sticker';
type ContentTab = 'trending' | 'search';

interface GifPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (payload: GifPayload) => void;
}

export default function GifPickerModal({ isOpen, onClose, onSelect }: GifPickerModalProps) {
  const [mediaKind, setMediaKind] = useState<MediaKind>('gif');
  const [activeTab, setActiveTab] = useState<ContentTab>('trending');
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Data loading ─────────────────────────────────────────────────────────

  const loadData = useCallback(
    async (
      tab: ContentTab,
      q: string,
      kind: MediaKind,
      startOffset: number,
      append: boolean,
    ) => {
      if (!append) setIsLoading(true);
      else setIsLoadingMore(true);

      let results: GiphyGif[];
      if (tab === 'trending') {
        results = kind === 'gif'
          ? await trendingGifs(startOffset, PAGE_SIZE)
          : await trendingStickers(startOffset, PAGE_SIZE);
      } else {
        results = kind === 'gif'
          ? await searchGifs(q, startOffset, PAGE_SIZE)
          : await searchStickers(q, startOffset, PAGE_SIZE);
      }

      setGifs(prev => (append ? [...prev, ...results] : results));
      setOffset(startOffset + results.length);
      setHasMore(results.length >= PAGE_SIZE);
      setIsLoading(false);
      setIsLoadingMore(false);
    },
    [],
  );

  // Load trending on first open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      if (gifs.length === 0 && activeTab === 'trending') {
        loadData('trending', '', mediaKind, 0, false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (activeTab !== 'search' || !query.trim()) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadData('search', query, mediaKind, 0, false);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, activeTab, mediaKind, loadData]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleMediaKindChange = (kind: MediaKind) => {
    if (kind === mediaKind) return;
    setMediaKind(kind);
    setGifs([]);
    // Reload current tab with new media kind
    if (activeTab === 'trending') {
      loadData('trending', '', kind, 0, false);
    } else if (query.trim()) {
      loadData('search', query, kind, 0, false);
    }
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (val.trim()) {
      if (activeTab !== 'search') {
        setActiveTab('search');
        setGifs([]);
      }
    } else {
      setActiveTab('trending');
      loadData('trending', '', mediaKind, 0, false);
    }
  };

  const handleTabChange = (tab: ContentTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    if (tab === 'trending') {
      setQuery('');
      loadData('trending', '', mediaKind, 0, false);
    } else if (query.trim()) {
      loadData('search', query, mediaKind, 0, false);
    }
  };

  const handleLoadMore = () => {
    loadData(activeTab, query, mediaKind, offset, true);
  };

  const handleSelect = (gif: GiphyGif) => {
    const payload: GifPayload = {
      mp4: gif.mp4Url,
      gif: gif.gifUrl,
      title: gif.title,
      mediaKind,
    };
    onSelect(payload);
  };

  const hasApiKey = !!import.meta.env.VITE_GIPHY_API_KEY;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed inset-x-0 bottom-[60px] sm:bottom-auto sm:top-[5%] sm:inset-x-4 z-50 mx-auto max-w-[480px] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden max-h-[60dvh] sm:max-h-[85vh]">

              {/* ── Search bar ── */}
              <div className="flex items-center gap-2 px-3 pt-3 pb-2 flex-shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => handleQueryChange(e.target.value)}
                    placeholder={mediaKind === 'gif' ? 'Search GIFs…' : 'Search Stickers…'}
                    className="w-full bg-secondary border border-border focus:border-purple-500 rounded-xl pl-9 pr-8 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                  />
                  {query && (
                    <button
                      onClick={() => handleQueryChange('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary/70 rounded-md transition-colors"
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-secondary rounded-xl transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* ── GIFs / Stickers toggle ── */}
              <div className="flex items-center justify-center px-3 pb-2 flex-shrink-0">
                <div className="flex bg-secondary rounded-xl p-0.5 gap-0.5 w-full max-w-[220px]">
                  <button
                    onClick={() => handleMediaKindChange('gif')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      mediaKind === 'gif'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    🎬 GIFs
                  </button>
                  <button
                    onClick={() => handleMediaKindChange('sticker')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      mediaKind === 'sticker'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    ✨ Stickers
                  </button>
                </div>
              </div>

              {/* ── Trending / Search tabs ── */}
              <div className="flex border-b border-border flex-shrink-0">
                <button
                  onClick={() => handleTabChange('trending')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all ${
                    activeTab === 'trending'
                      ? 'text-purple-400 border-b-2 border-purple-500'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Trending
                </button>
                <button
                  onClick={() => handleTabChange('search')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all ${
                    activeTab === 'search'
                      ? 'text-purple-400 border-b-2 border-purple-500'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  Search
                </button>
              </div>

              {/* ── Grid ── */}
              <div className="flex-1 overflow-y-auto p-2" style={{ minHeight: 260, maxHeight: '55vh' }}>

                {isLoading && gifs.length === 0 ? (
                  <div className="flex items-center justify-center h-[200px]">
                    <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
                  </div>

                ) : gifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center gap-2 px-4">
                    {!hasApiKey ? (
                      <>
                        <span className="text-2xl">🔑</span>
                        <p className="text-sm text-foreground font-medium">GIPHY API key missing</p>
                        <p className="text-xs text-muted-foreground">
                          Add <code className="bg-secondary px-1 py-0.5 rounded">VITE_GIPHY_API_KEY</code> to your{' '}
                          <code className="bg-secondary px-1 py-0.5 rounded">.env</code>
                        </p>
                      </>
                    ) : activeTab === 'search' && !query.trim() ? (
                      <>
                        <span className="text-2xl">{mediaKind === 'gif' ? '🎬' : '✨'}</span>
                        <p className="text-sm text-muted-foreground">
                          Type something to search {mediaKind === 'gif' ? 'GIFs' : 'Stickers'}
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl">😶</span>
                        <p className="text-sm text-muted-foreground">Nothing found</p>
                      </>
                    )}
                  </div>

                ) : (
                  <div className="columns-3 gap-1.5">
                    {gifs.map(gif => (
                      <motion.button
                        key={gif.id}
                        onClick={() => handleSelect(gif)}
                        whileHover={{ scale: 1.05, opacity: 0.9 }}
                        whileTap={{ scale: 0.97 }}
                        className={`w-full mb-1.5 rounded-lg overflow-hidden transition-shadow block focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 hover:ring-2 hover:ring-purple-500 ${
                          mediaKind === 'sticker' ? 'bg-white/5 p-1' : ''
                        }`}
                      >
                        <img
                          src={gif.previewUrl}
                          alt={gif.title}
                          loading="lazy"
                          className={`w-full rounded-lg ${
                            mediaKind === 'sticker' ? 'object-contain' : 'object-cover'
                          }`}
                        />
                      </motion.button>
                    ))}

                    {isLoadingMore &&
                      Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={`skel-${i}`}
                          className="w-full mb-1.5 rounded-lg bg-secondary animate-pulse"
                          style={{ height: 72 + i * 16 }}
                        />
                      ))}
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              <div className="px-3 py-2 border-t border-border flex items-center justify-between flex-shrink-0">
                {hasMore && !isLoading ? (
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                  >
                    {isLoadingMore ? (
                      <><Loader2 className="w-3 h-3 animate-spin" />Loading…</>
                    ) : (
                      'Load more'
                    )}
                  </button>
                ) : (
                  <span />
                )}
                <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
                  Powered by GIPHY
                </span>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
