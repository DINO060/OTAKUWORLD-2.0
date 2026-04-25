import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Loader2, TrendingUp } from 'lucide-react';
import {
  searchGifs,
  trendingGifs,
  searchStickers,
  trendingStickers,
  type GiphyGif,
} from '../../services/giphy';
import type { GifPayload } from '../../types';

const PAGE_SIZE = 20;
// Total panel height — search(44) + toggle(34) + tabs(32) + footer(30) = 140px chrome, ~160px for grid
const PANEL_H = 300;

type MediaKind = 'gif' | 'sticker';
type ContentTab = 'trending' | 'search';

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (payload: GifPayload) => void;
}

export default function GifPicker({ isOpen, onClose, onSelect }: GifPickerProps) {
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

  const loadData = useCallback(async (
    tab: ContentTab, q: string, kind: MediaKind, startOffset: number, append: boolean,
  ) => {
    if (!append) setIsLoading(true); else setIsLoadingMore(true);
    let results: GiphyGif[];
    if (tab === 'trending') {
      results = kind === 'gif' ? await trendingGifs(startOffset, PAGE_SIZE) : await trendingStickers(startOffset, PAGE_SIZE);
    } else {
      results = kind === 'gif' ? await searchGifs(q, startOffset, PAGE_SIZE) : await searchStickers(q, startOffset, PAGE_SIZE);
    }
    setGifs(prev => append ? [...prev, ...results] : results);
    setOffset(startOffset + results.length);
    setHasMore(results.length >= PAGE_SIZE);
    setIsLoading(false);
    setIsLoadingMore(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      if (gifs.length === 0 && activeTab === 'trending') loadData('trending', '', mediaKind, 0, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (activeTab !== 'search' || !query.trim()) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadData('search', query, mediaKind, 0, false), 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, activeTab, mediaKind, loadData]);

  const handleMediaKindChange = (kind: MediaKind) => {
    if (kind === mediaKind) return;
    setMediaKind(kind);
    setGifs([]);
    if (activeTab === 'trending') loadData('trending', '', kind, 0, false);
    else if (query.trim()) loadData('search', query, kind, 0, false);
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (val.trim()) {
      if (activeTab !== 'search') { setActiveTab('search'); setGifs([]); }
    } else {
      setActiveTab('trending');
      loadData('trending', '', mediaKind, 0, false);
    }
  };

  const handleTabChange = (tab: ContentTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    if (tab === 'trending') { setQuery(''); loadData('trending', '', mediaKind, 0, false); }
    else if (query.trim()) loadData('search', query, mediaKind, 0, false);
  };

  const handleSelect = (gif: GiphyGif) => {
    onSelect({ mp4: gif.mp4Url, gif: gif.gifUrl, title: gif.title, mediaKind });
  };

  const hasApiKey = !!import.meta.env.VITE_GIPHY_API_KEY;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'tween', duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ position: 'fixed', insetInline: 0, bottom: 56, zIndex: 50 }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{
            background: '#13131f',
            height: PANEL_H,
            borderRadius: '16px 16px 0 0',
            border: '1px solid rgba(255,255,255,0.08)',
            borderBottom: 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
          }}>

            {/* Search bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 6px', flexShrink: 0 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  placeholder={mediaKind === 'gif' ? 'Rechercher des GIFs…' : 'Rechercher des Stickers…'}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, paddingLeft: 32, paddingRight: query ? 28 : 10,
                    paddingTop: 7, paddingBottom: 7,
                    fontSize: 13, color: '#fff', outline: 'none',
                  }}
                />
                {query && (
                  <button onClick={() => handleQueryChange('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', padding: 2 }}>
                    <X style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.4)' }} />
                  </button>
                )}
              </div>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <X style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            {/* GIFs / Stickers toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0 12px 6px', flexShrink: 0 }}>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 3, gap: 3, width: '100%', maxWidth: 200 }}>
                {(['gif', 'sticker'] as const).map(k => (
                  <button key={k} onClick={() => handleMediaKindChange(k)} style={{
                    flex: 1, padding: '5px 0', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: mediaKind === k ? '#6c5ce7' : 'transparent',
                    color: mediaKind === k ? '#fff' : 'rgba(255,255,255,0.4)',
                    transition: 'all 0.15s',
                  }}>
                    {k === 'gif' ? '🎬 GIFs' : '✨ Stickers'}
                  </button>
                ))}
              </div>
            </div>

            {/* Trending / Search tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              {([['trending', 'Trending', TrendingUp], ['search', 'Search', Search]] as const).map(([tab, label, Icon]) => (
                <button key={tab} onClick={() => handleTabChange(tab)} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  padding: '7px 0', fontSize: 11, fontWeight: 700,
                  color: activeTab === tab ? '#a29bfe' : 'rgba(255,255,255,0.35)',
                  borderBottom: activeTab === tab ? '2px solid #6c5ce7' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}>
                  <Icon style={{ width: 12, height: 12 }} />{label}
                </button>
              ))}
            </div>

            {/* Grid — flex-1 takes remaining space, NO minHeight */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
              {isLoading && gifs.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Loader2 style={{ width: 24, height: 24, color: '#6c5ce7' }} className="animate-spin" />
                </div>
              ) : gifs.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 6, padding: '0 16px', textAlign: 'center' }}>
                  {!hasApiKey ? (
                    <>
                      <span style={{ fontSize: 20 }}>🔑</span>
                      <p style={{ fontSize: 12, color: '#fff', margin: 0 }}>GIPHY API key manquante</p>
                    </>
                  ) : activeTab === 'search' && !query.trim() ? (
                    <>
                      <span style={{ fontSize: 20 }}>{mediaKind === 'gif' ? '🎬' : '✨'}</span>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Tape pour rechercher</p>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 20 }}>😶</span>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Rien trouvé</p>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ columns: 3, gap: 4 }}>
                  {gifs.map(gif => (
                    <motion.button
                      key={gif.id}
                      onClick={() => handleSelect(gif)}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        width: '100%', marginBottom: 4, borderRadius: 8, overflow: 'hidden',
                        display: 'block', background: mediaKind === 'sticker' ? 'rgba(255,255,255,0.04)' : 'transparent',
                        padding: mediaKind === 'sticker' ? 4 : 0,
                      }}
                    >
                      <img
                        src={gif.previewUrl}
                        alt={gif.title}
                        loading="lazy"
                        style={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          objectFit: mediaKind === 'sticker' ? 'contain' : 'cover',
                          borderRadius: 6,
                          display: 'block',
                        }}
                      />
                    </motion.button>
                  ))}
                  {isLoadingMore && [0, 1, 2].map(i => (
                    <div key={i} style={{ width: '100%', aspectRatio: '1/1', borderRadius: 8, background: 'rgba(255,255,255,0.06)', marginBottom: 4 }} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '5px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              {hasMore && !isLoading ? (
                <button onClick={() => loadData(activeTab, query, mediaKind, offset, true)} disabled={isLoadingMore}
                  style={{ fontSize: 11, color: '#a29bfe', display: 'flex', alignItems: 'center', gap: 4, opacity: isLoadingMore ? 0.5 : 1 }}>
                  {isLoadingMore ? <><Loader2 style={{ width: 10, height: 10 }} className="animate-spin" />Chargement…</> : 'Voir plus'}
                </button>
              ) : <span />}
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em', fontWeight: 600 }}>POWERED BY GIPHY</span>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
