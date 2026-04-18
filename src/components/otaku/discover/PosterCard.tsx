import React, { useState } from 'react';
import { Star, Clapperboard } from 'lucide-react';
import type { DiscoverItem } from '../../../services/discoverApi';

interface PosterCardProps {
  item: DiscoverItem;
  size?: 'small' | 'medium';
  onClick?: (item: DiscoverItem) => void;
  showScoreBadge?: boolean;
}

function StarRating({ score }: { score: number }) {
  const stars = Math.round((score / 10) * 5 * 2) / 2; // 0-5, half steps
  return (
    <div className="flex items-center gap-px">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = stars >= i;
        const half = !filled && stars >= i - 0.5;
        return (
          <Star
            key={i}
            size={11}
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

export function PosterCard({ item, size = 'small', onClick, showScoreBadge }: PosterCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const isSmall = size === 'small';

  return (
    <div
      className="cursor-pointer group transition-all duration-200"
      onClick={() => onClick?.(item)}
    >
      {/* Poster Image */}
      <div
        className="relative overflow-hidden transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg"
        style={{
          aspectRatio: '2/3',
          borderRadius: '14px',
          background: '#1a1a25',
        }}
      >
        {!imgError && item.posterUrl ? (
          <>
            {!imgLoaded && (
              <div
                className="absolute inset-0 skeleton-shimmer"
                style={{ borderRadius: '14px' }}
              />
            )}
            <img
              src={item.posterUrl}
              alt={item.title}
              className="w-full h-full object-cover"
              style={{
                borderRadius: '14px',
                opacity: imgLoaded ? 1 : 0,
                transition: 'opacity 0.3s',
              }}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              loading="lazy"
            />
          </>
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center"
            style={{
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #1a1a25 0%, #252538 100%)',
            }}
          >
            <Clapperboard size={32} style={{ color: '#555570', marginBottom: '8px' }} />
            <span style={{ fontSize: '10px', color: '#555570', textAlign: 'center', padding: '0 8px' }}>
              {item.title}
            </span>
          </div>
        )}

        {/* Score badge (top-right) — for grid/medium cards */}
        {showScoreBadge && item.score > 0 && (
          <div
            className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md"
            style={{
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <Star size={10} fill="#fbbf24" style={{ color: '#fbbf24' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24' }}>
              {item.score.toFixed(1)}
            </span>
          </div>
        )}

        {/* Star rating overlay at bottom of card */}
        {item.score > 0 && !showScoreBadge && (
          <div
            className="absolute bottom-0 left-0 right-0 px-2 pb-2 pt-6"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
              borderRadius: '0 0 14px 14px',
            }}
          >
            <StarRating score={item.score} />
          </div>
        )}
      </div>

      {/* Info below card */}
      <div className="mt-1.5 px-0.5">
        <p
          className="line-clamp-1"
          style={{
            fontSize: isSmall ? '12px' : '13px',
            fontWeight: 700,
            color: '#e8e8ed',
          }}
        >
          {item.title}
        </p>
        {item.year && (
          <span style={{ fontSize: '11px', color: '#8888a0' }}>
            {item.year}
          </span>
        )}
      </div>
    </div>
  );
}

// Skeleton version
export function PosterCardSkeleton({ size = 'small' }: { size?: 'small' | 'medium' }) {
  return (
    <div>
      <div
        className="skeleton-shimmer"
        style={{ aspectRatio: '2/3', borderRadius: '14px' }}
      />
      <div className="mt-1.5 px-0.5">
        <div className="skeleton-shimmer" style={{ height: '12px', width: '80%', borderRadius: '4px' }} />
        <div className="skeleton-shimmer mt-1" style={{ height: '10px', width: '40%', borderRadius: '4px' }} />
      </div>
    </div>
  );
}
