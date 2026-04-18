import React, { useState, useEffect } from 'react';
import { ArrowLeft, Star, Play, Heart, BookmarkPlus, Clapperboard } from 'lucide-react';
import { PosterCard, PosterCardSkeleton } from './PosterCard';
import type { DiscoverItem, DiscoverDetail } from '../../../services/discoverApi';
import {
  getAnimeDetail,
  getMangaDetail,
  getMovieDetail,
  getTvDetail,
  getLNDetail,
  getBookDetail,
  getMusicDetail,
  getGameDetail,
} from '../../../services/discoverApi';

interface DetailPageProps {
  item: DiscoverItem;
  onBack: () => void;
  onItemClick?: (item: DiscoverItem) => void;
}

function extractNumericId(id: string): number {
  return parseInt(id.split('-').slice(1).join('-'), 10);
}

function StarRating({ score, size = 16 }: { score: number; size?: number }) {
  const stars = Math.round((score / 10) * 5 * 2) / 2;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = stars >= i;
        const half = !filled && stars >= i - 0.5;
        return (
          <Star
            key={i}
            size={size}
            fill={filled ? '#a855f7' : half ? '#a855f7' : 'none'}
            style={{
              color: filled || half ? '#a855f7' : '#555570',
              opacity: filled ? 1 : half ? 0.6 : 0.35,
            }}
          />
        );
      })}
    </div>
  );
}

export function DetailPage({ item, onBack, onItemClick }: DetailPageProps) {
  const [detail, setDetail] = useState<DiscoverDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isFav, setIsFav] = useState(() => {
    const favs: DiscoverItem[] = JSON.parse(localStorage.getItem('catalogue_favorites') || '[]');
    return favs.some(f => f.id === item.id);
  });

  useEffect(() => {
    setIsLoading(true);
    setDetail(null);
    setShowFullSynopsis(false);
    setShowTrailer(false);
    setImgError(false);
    // Re-check fav status when item changes
    const favs: DiscoverItem[] = JSON.parse(localStorage.getItem('catalogue_favorites') || '[]');
    setIsFav(favs.some(f => f.id === item.id));

    let cancelled = false;

    const fetchDetail = async () => {
      try {
        let result: DiscoverDetail;
        const numId = extractNumericId(item.id);
        switch (item.type) {
          case 'anime':
            result = await getAnimeDetail(numId);
            break;
          case 'manga':
            result = await getMangaDetail(numId);
            break;
          case 'movie':
            result = await getMovieDetail(numId);
            break;
          case 'tv':
            result = await getTvDetail(numId);
            break;
          case 'ln':
            result = await getLNDetail(numId);
            break;
          case 'book': {
            const bookId = item.id.replace('book-', '');
            result = await getBookDetail(bookId);
            break;
          }
          case 'music':
            result = await getMusicDetail(item.status || '', item.title);
            break;
          case 'game':
            result = await getGameDetail(extractNumericId(item.id));
            break;
          default:
            return;
        }
        if (!cancelled) setDetail(result);
      } catch (err) {
        console.error('Failed to load detail:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchDetail();
    return () => { cancelled = true; };
  }, [item.id, item.type]);

  const data = detail || item;
  const synopsis = (detail?.synopsis || item.synopsis || '').trim();
  const shortSynopsis = synopsis.length > 200 ? synopsis.slice(0, 200) + '...' : synopsis;

  const TYPE_LABELS: Record<string, string> = {
    anime: 'ANIME',
    manga: 'MANGA',
    movie: 'MOVIE',
    tv: 'TV',
    ln: 'LIGHT NOVEL',
    book: 'BOOK',
    music: 'MUSIC',
    game: 'GAME',
  };

  const STUDIO_LABEL: Record<string, string> = {
    manga: 'Auteur',
    ln: 'Auteur',
    book: 'Auteur',
    music: 'Artiste',
    game: 'Développeur',
  };

  const bannerImg = detail?.backdropUrl || item.posterUrl;

  return (
    <div className="h-full overflow-y-auto scrollbar-hide" style={{ background: '#0a0a12' }}>
      {/* Banner / Backdrop */}
      <div className="relative" style={{ height: '380px' }}>
        {!imgError && bannerImg ? (
          <img
            src={bannerImg}
            alt={data.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
          >
            <Clapperboard size={48} style={{ color: '#555570' }} />
          </div>
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, #0a0a12 0%, rgba(10,10,18,0.5) 40%, rgba(10,10,18,0.15) 100%)',
          }}
        />

        {/* Back button — purple circle */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
          style={{ background: '#a855f7' }}
        >
          <ArrowLeft size={20} style={{ color: '#fff' }} />
        </button>

        {/* Title overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <div className="flex items-end gap-4">
            {/* Small poster */}
            <div className="flex-shrink-0">
              {item.posterUrl ? (
                <img
                  src={item.posterUrl}
                  alt={data.title}
                  className="rounded-xl shadow-lg"
                  style={{ width: '90px', height: '130px', objectFit: 'cover', border: '2px solid rgba(168,85,247,0.3)' }}
                />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              {/* Type badge */}
              <span
                className="inline-block px-2.5 py-1 rounded-md mb-2"
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  background: 'rgba(168,85,247,0.25)',
                  color: '#d4a5ff',
                  border: '1px solid rgba(168,85,247,0.3)',
                }}
              >
                {TYPE_LABELS[item.type] || item.type.toUpperCase()}
              </span>

              <h1 className="line-clamp-2" style={{
                fontSize: '22px',
                fontWeight: 900,
                color: '#fff',
                lineHeight: 1.2,
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}>
                {data.title}
              </h1>

              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {data.year && (
                  <span style={{ fontSize: '13px', color: '#ccc' }}>{data.year}</span>
                )}
                {data.genres.length > 0 && (
                  <>
                    <span style={{ color: '#a855f7', fontSize: '8px' }}>●</span>
                    <span style={{ fontSize: '13px', color: '#ccc' }}>
                      {data.genres.slice(0, 3).join(', ')}
                    </span>
                  </>
                )}
                {data.episodes && (
                  <>
                    <span style={{ color: '#a855f7', fontSize: '8px' }}>●</span>
                    <span style={{ fontSize: '13px', color: '#ccc' }}>
                      {data.episodes} ep.
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-32" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Score + star rating */}
        {data.score > 0 && (
          <div className="mt-5 mb-5">
            <div className="flex items-center gap-3">
              <StarRating score={data.score} size={18} />
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#e8e8ed' }}>
                {data.score.toFixed(1)}/10
              </span>
            </div>
          </div>
        )}

        {/* Action buttons — Favorite + Play Trailer */}
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={() => {
              const newFav = !isFav;
              setIsFav(newFav);
              // Persist to localStorage
              const favs: DiscoverItem[] = JSON.parse(localStorage.getItem('catalogue_favorites') || '[]');
              if (newFav) {
                if (!favs.find(f => f.id === item.id)) {
                  favs.unshift(item);
                  localStorage.setItem('catalogue_favorites', JSON.stringify(favs));
                }
              } else {
                localStorage.setItem('catalogue_favorites', JSON.stringify(favs.filter(f => f.id !== item.id)));
              }
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-full transition-all"
            style={{
              background: isFav ? '#a855f7' : 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Heart size={18} fill={isFav ? '#fff' : 'none'} style={{ color: isFav ? '#fff' : '#e8e8ed' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: isFav ? '#fff' : '#e8e8ed' }}>
              {isFav ? '❤️ Dans les favoris' : '🤍 Ajouter aux favoris'}
            </span>
          </button>

          {detail?.trailerUrl ? (
            showTrailer ? (
              <div className="flex-1">
                <div
                  className="relative overflow-hidden"
                  style={{ aspectRatio: '16/9', borderRadius: '14px' }}
                >
                  <iframe
                    src={detail.trailerUrl}
                    title="Trailer"
                    className="w-full h-full"
                    style={{ border: 'none', borderRadius: '14px' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowTrailer(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full transition-all hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 700,
                }}
              >
                <Play size={18} fill="#fff" />
                Bande-annonce
              </button>
            )
          ) : (
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full"
              style={{
                background: 'rgba(168,85,247,0.15)',
                color: '#a855f7',
                fontSize: '15px',
                fontWeight: 700,
                border: '1px solid rgba(168,85,247,0.25)',
              }}
            >
              <BookmarkPlus size={18} />
              Ajouter à la liste
            </button>
          )}
        </div>

        {/* Synopsis */}
        {synopsis && (
          <div className="mt-8">
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#e8e8ed', marginBottom: '12px' }}>
              Synopsis
            </h3>
            <p style={{ fontSize: '14px', color: '#aaa', lineHeight: 1.7 }}>
              {showFullSynopsis ? synopsis : shortSynopsis}
            </p>
            {synopsis.length > 200 && (
              <button
                onClick={() => setShowFullSynopsis(!showFullSynopsis)}
                style={{ fontSize: '13px', fontWeight: 700, color: '#a855f7', marginTop: '6px' }}
              >
                {showFullSynopsis ? 'Voir moins' : 'Voir plus'}
              </button>
            )}
          </div>
        )}

        {/* Screenshots (Games) */}
        {detail && item.type === 'game' && detail.characters.length > 0 && (
          <div className="mt-8">
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#e8e8ed', marginBottom: '14px' }}>
              Captures d'écran
            </h3>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {detail.characters.filter(c => c.imageUrl).map((c, i) => (
                <div key={i} className="flex-shrink-0" style={{ width: '220px' }}>
                  <img
                    src={c.imageUrl}
                    alt={c.name}
                    className="w-full rounded-xl object-cover"
                    style={{ aspectRatio: '16/9' }}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platforms (Games) */}
        {detail && item.type === 'game' && detail.source && (
          <div className="mt-6">
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#e8e8ed', marginBottom: '10px' }}>
              Plateformes
            </h3>
            <div className="flex flex-wrap gap-2">
              {detail.source.split(', ').map((p, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-full"
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#e8e8ed',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Characters / Cast (non-game) */}
        {detail && item.type !== 'game' && detail.characters.length > 0 && (
          <div className="mt-10">
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#e8e8ed', marginBottom: '14px' }}>
              {item.type === 'movie' || item.type === 'tv' ? 'Casting' : item.type === 'anime' ? 'Personnages & Doubleurs' : 'Personnages'}
            </h3>
            <div className="flex gap-5 overflow-x-auto scrollbar-hide pb-2">
              {detail.characters.map((c, i) => (
                <div key={i} className="flex-shrink-0 text-center" style={{ width: '80px' }}>
                  <div
                    className="w-20 h-20 rounded-full mx-auto overflow-hidden"
                    style={{
                      background: '#1a1a25',
                      border: '2px solid rgba(168,85,247,0.2)',
                    }}
                  >
                    {c.imageUrl ? (
                      <img
                        src={c.imageUrl}
                        alt={c.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span style={{ fontSize: '22px', color: '#555570' }}>
                          {c.name[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <p
                    className="mt-2 line-clamp-1"
                    style={{ fontSize: '12px', fontWeight: 700, color: '#e8e8ed' }}
                  >
                    {c.name}
                  </p>
                  <p
                    className="line-clamp-1"
                    style={{ fontSize: '10px', color: '#8888a0' }}
                  >
                    {c.role}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informations */}
        <div className="mt-10">
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#e8e8ed', marginBottom: '12px' }}>
            Informations
          </h3>
          <div
            className="rounded-xl p-4"
            style={{ background: '#111119', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <InfoRow label="Type" value={TYPE_LABELS[item.type] || item.type} />
            {(item.type === 'anime' || item.type === 'tv') && data.episodes ? (
              <InfoRow label="Épisodes" value={data.episodes.toString()} />
            ) : null}
            {item.type === 'manga' && data.chapters ? (
              <InfoRow label="Chapters" value={data.chapters.toString()} />
            ) : null}
            {data.status && (
              <InfoRow
                label="Status"
                value={data.status}
                valueColor={
                  data.status === 'En cours' ? '#22c55e'
                    : data.status === 'Terminé' ? '#a855f7'
                    : data.status === 'À venir' ? '#f59e0b'
                    : undefined
                }
                dot
              />
            )}
            {detail?.studio && (
              <InfoRow
                label={STUDIO_LABEL[item.type] || 'Studio'}
                value={detail.studio}
              />
            )}
            {detail?.duration && (
              <InfoRow
                label={item.type === 'tv' ? 'Seasons' : item.type === 'game' ? 'Playtime' : 'Duration'}
                value={detail.duration}
              />
            )}
            {data.year && <InfoRow label="Date" value={data.year} />}
            {data.genres.length > 0 && (
              <InfoRow label="Genres" value={data.genres.join(', ')} last />
            )}
          </div>
        </div>

        {/* Genres pills */}
        {data.genres.length > 0 && (
          <div className="mt-5">
            <div className="flex flex-wrap gap-2">
              {data.genres.map((g, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-full"
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#d4a5ff',
                    background: 'rgba(168,85,247,0.1)',
                    border: '1px solid rgba(168,85,247,0.2)',
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related / Similar */}
        {detail && detail.related.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#e8e8ed' }}>
                More Like This
              </h3>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#a855f7' }}>
                See all
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {detail.related.map((rel) => (
                <div key={rel.id} className="flex-shrink-0" style={{ width: '130px' }}>
                  <PosterCard item={rel} size="small" onClick={onItemClick} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading skeleton for detail */}
        {isLoading && (
          <div className="mt-6 space-y-4">
            <div className="skeleton-shimmer" style={{ height: '18px', width: '40%', borderRadius: '4px' }} />
            <div className="skeleton-shimmer" style={{ height: '60px', width: '100%', borderRadius: '8px' }} />
            <div className="skeleton-shimmer" style={{ height: '18px', width: '30%', borderRadius: '4px' }} />
            <div className="skeleton-shimmer" style={{ height: '120px', width: '100%', borderRadius: '12px' }} />
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
  dot,
  last,
}: {
  label: string;
  value: string;
  valueColor?: string;
  dot?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between py-3.5"
      style={{ borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
    >
      <span style={{ fontSize: '13px', color: '#8888a0' }}>{label}</span>
      <span
        className="flex items-center gap-1.5"
        style={{ fontSize: '13px', fontWeight: 600, color: valueColor || '#e8e8ed' }}
      >
        {dot && (
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: valueColor || '#22c55e' }}
          />
        )}
        {value}
      </span>
    </div>
  );
}
