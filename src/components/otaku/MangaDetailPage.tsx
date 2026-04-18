import React, { useState, useMemo } from 'react';
import { ArrowLeft, Heart, BookOpen, Upload } from 'lucide-react';
import { MangaReader } from './MangaReader';
import PublishChapter from '../PublishChapter';
import { useChapters } from '../../contexts/ChaptersContext';
import type { MangaTitle } from './types';
import type { Chapter as DBChapter } from '../../types';

interface MangaDetailPageProps {
  manga: MangaTitle;
  onBack: () => void;
}

export function MangaDetailPage({ manga, onBack }: MangaDetailPageProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<DBChapter | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [sortDesc, setSortDesc] = useState(true);
  const { chapters: allChapters } = useChapters();

  // Get real chapters for this work (match by title + authorId)
  const workChapters = useMemo(() => {
    const filtered = allChapters.filter(ch =>
      ch.title.toLowerCase().trim() === manga.title.toLowerCase().trim() &&
      (!manga.authorId || ch.authorId === manga.authorId)
    );
    return [...filtered].sort((a, b) =>
      sortDesc ? b.chapterNumber - a.chapterNumber : a.chapterNumber - b.chapterNumber
    );
  }, [allChapters, manga.title, manga.authorId, sortDesc]);

  const firstChapter = useMemo(() => {
    return [...workChapters].sort((a, b) => a.chapterNumber - b.chapterNumber)[0] || null;
  }, [workChapters]);

  if (showPublish) {
    return (
      <PublishChapter
        onBack={() => setShowPublish(false)}
        onPublishComplete={() => setShowPublish(false)}
      />
    );
  }

  if (selectedChapter) {
    return (
      <MangaReader
        manga={manga}
        chapter={selectedChapter}
        allChapters={workChapters}
        onBack={() => setSelectedChapter(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto" style={{ background: '#0c0c14' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b"
        style={{
          background: '#111119',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
        >
          <ArrowLeft size={20} style={{ color: '#e8e8ed' }} />
        </button>
        <h2 className="flex-1" style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
          Retour
        </h2>
      </div>

      {/* Banner / Cover */}
      <div
        className="relative flex-shrink-0"
        style={{
          height: '220px',
          background: 'linear-gradient(135deg, #6c5ce7 0%, #f093fb 100%)',
        }}
      >
        {manga.coverImage && (
          <img
            src={manga.coverImage}
            alt={manga.title}
            className="w-full h-full object-cover"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, #0c0c14 0%, transparent 50%)',
          }}
        />
      </div>

      {/* Title Info */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-3 mb-2">
          <span style={{ fontSize: '32px' }}>{manga.icon}</span>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#e8e8ed' }}>
            {manga.title}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {manga.author && (
            <>
              <span style={{ fontSize: '13px', color: '#8888a0' }}>
                par @{manga.author}
              </span>
              <span style={{ fontSize: '13px', color: '#555570' }}>·</span>
            </>
          )}
          {manga.genre.length > 0 && (
            <>
              <span style={{ fontSize: '13px', color: '#8888a0' }}>
                {manga.genre.join(', ')}
              </span>
              <span style={{ fontSize: '13px', color: '#555570' }}>·</span>
            </>
          )}
          <span style={{ fontSize: '13px', color: '#8888a0' }}>
            {workChapters.length} ch.
          </span>
          <span style={{ fontSize: '13px', color: '#555570' }}>·</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: manga.status === 'completed' ? '#22c55e' : '#6c5ce7',
            }}
          >
            {manga.status === 'completed' ? 'Terminé' : 'En cours'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors"
          style={{
            background: isFavorite ? 'rgba(239,68,68,0.12)' : '#1a1a25',
            border: `1px solid ${isFavorite ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
            fontSize: '13px',
            fontWeight: 600,
            color: isFavorite ? '#ef4444' : '#e8e8ed',
          }}
        >
          <Heart size={16} fill={isFavorite ? '#ef4444' : 'none'} />
          Favoris
        </button>
        {firstChapter && (
          <button
            onClick={() => setSelectedChapter(firstChapter)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-colors"
            style={{
              background: '#6c5ce7',
              fontSize: '13px',
              fontWeight: 700,
              color: '#ffffff',
            }}
          >
            <BookOpen size={16} />
            Lire Ch.{firstChapter.chapterNumber}
          </button>
        )}
      </div>

      {/* Synopsis */}
      {manga.description && (
        <div className="px-4 pb-4">
          <h3 className="mb-2" style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
            Synopsis:
          </h3>
          <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#8888a0' }}>
            {manga.description}
          </p>
        </div>
      )}

      {/* Tags */}
      {manga.genre.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {manga.genre.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full"
                style={{ fontSize: '11px', fontWeight: 600, background: 'rgba(108,92,231,0.12)', color: '#6c5ce7' }}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Chapters Section */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-px" style={{ background: '#555570' }} />
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
              Chapitres ({workChapters.length})
            </h3>
            <div className="flex-1 h-px" style={{ background: '#555570' }} />
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setSortDesc(!sortDesc)}
            className="px-3 py-2 rounded-lg"
            style={{ fontSize: '12px', fontWeight: 600, background: '#1a1a25', color: '#8888a0' }}
          >
            Trier: {sortDesc ? 'Récent ▼' : 'Ancien ▲'}
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ fontSize: '12px', fontWeight: 600, background: '#6c5ce7', color: '#ffffff' }}
            onClick={() => setShowPublish(true)}
          >
            <Upload size={14} />
            Publier
          </button>
        </div>

        {/* Chapter List */}
        {workChapters.length === 0 ? (
          <div className="text-center py-8">
            <p style={{ fontSize: '13px', color: '#8888a0' }}>
              Aucun chapitre trouvé
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {workChapters.map((chapter) => (
              <div
                key={chapter.id}
                onClick={() => setSelectedChapter(chapter)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#1f1f2e] transition-colors cursor-pointer"
                style={{ background: '#111119' }}
              >
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div className="min-w-0">
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                      Ch. {chapter.chapterNumber}
                    </p>
                    <p style={{ fontSize: '11px', color: '#8888a0' }}>
                      {chapter.contentType === 'pdf' || chapter.contentType === 'cbz'
                        ? `📄 ${chapter.contentType.toUpperCase()}`
                        : chapter.contentType === 'images'
                        ? `🖼️ ${chapter.images?.length || 0} pages`
                        : '📝 Texte'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span style={{ fontSize: '11px', color: '#8888a0' }}>@{chapter.author}</span>
                    <span style={{ fontSize: '11px', color: '#8888a0' }}>{chapter.publishDate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
