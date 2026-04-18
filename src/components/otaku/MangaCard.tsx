import React from 'react';
import type { MangaTitle } from './types';

interface MangaCardProps {
  manga: MangaTitle;
  size: 'small' | 'medium';
}

export function MangaCard({ manga, size }: MangaCardProps) {
  const isSmall = size === 'small';

  return (
    <div className="cursor-pointer group">
      {/* Cover */}
      <div
        className="rounded-2xl overflow-hidden relative mb-2"
        style={{
          aspectRatio: '3/4',
          maxHeight: isSmall ? '180px' : '260px',
          background: 'linear-gradient(135deg, #6c5ce7 0%, #f093fb 100%)',
        }}
      >
        {manga.coverImage ? (
          <img
            src={manga.coverImage}
            alt={manga.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span style={{ fontSize: isSmall ? '32px' : '48px' }}>
              {manga.icon}
            </span>
          </div>
        )}

        {/* Status Badge */}
        <div
          className="absolute top-2 right-2 px-2 py-1 rounded-full"
          style={{
            fontSize: '10px',
            fontWeight: 600,
            background: manga.status === 'ongoing' ? '#22c55e' : '#6c5ce7',
            color: '#ffffff',
          }}
        >
          {manga.status === 'ongoing' ? 'En cours' : 'Terminé'}
        </div>

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div
            className="px-3 py-2 rounded-lg"
            style={{
              background: '#6c5ce7',
              fontSize: '12px',
              fontWeight: 700,
              color: '#ffffff',
            }}
          >
            Voir détails
          </div>
        </div>
      </div>

      {/* Info */}
      <div>
        <p
          className="truncate mb-1"
          style={{
            fontSize: isSmall ? '12px' : '13px',
            fontWeight: 700,
            color: '#e8e8ed',
          }}
        >
          {manga.title}
        </p>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '11px', color: '#8888a0' }}>
            ⭐ {manga.rating}
          </span>
          <span style={{ fontSize: '11px', color: '#555570' }}>·</span>
          <span style={{ fontSize: '11px', color: '#8888a0' }}>
            {manga.chapters} ch.
          </span>
        </div>
        {!isSmall && (
          <div className="flex flex-wrap gap-1 mt-2">
            {manga.genre.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="px-2 py-1 rounded-full"
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  background: '#1a1a25',
                  color: '#8888a0',
                }}
              >
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}