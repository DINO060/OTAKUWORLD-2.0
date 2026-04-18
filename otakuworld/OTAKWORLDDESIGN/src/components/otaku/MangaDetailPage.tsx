import React, { useState } from 'react';
import { ArrowLeft, Heart, BookOpen, Bell, Upload } from 'lucide-react';
import { MangaReader } from './MangaReader';
import { PublishChapter } from './PublishChapter';
import type { MangaTitle } from './types';

interface Chapter {
  id: string;
  number: number;
  title: string;
  author: string;
  timeAgo: string;
  isNew?: boolean;
}

interface MangaDetailPageProps {
  manga: MangaTitle;
  onBack: () => void;
}

export function MangaDetailPage({ manga, onBack }: MangaDetailPageProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [showPublish, setShowPublish] = useState(false);

  // Mock chapters
  const chapters: Chapter[] = [
    { id: '201', number: 201, title: 'Final', author: 'sophie', timeAgo: '2h', isNew: true },
    { id: '200', number: 200, title: 'Le combat', author: 'alex', timeAgo: '1j' },
    { id: '199', number: 199, title: "L'armée", author: 'jean', timeAgo: '3j' },
    { id: '198', number: 198, title: 'Réveil', author: 'marie', timeAgo: '5j' },
    { id: '197', number: 197, title: 'La bataille', author: 'yuki', timeAgo: '1sem' },
  ];

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
        className="relative"
        style={{
          height: '280px',
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
        {/* Gradient Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, #0c0c14 0%, transparent 60%)',
          }}
        />
        {/* Title Info */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontSize: '32px' }}>{manga.icon}</span>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#e8e8ed' }}>
              {manga.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '13px', color: '#e8e8ed' }}>
              ⭐ {manga.rating}
            </span>
            <span style={{ fontSize: '13px', color: '#8888a0' }}>·</span>
            <span style={{ fontSize: '13px', color: '#8888a0' }}>
              {manga.genre.join(', ')}
            </span>
            <span style={{ fontSize: '13px', color: '#8888a0' }}>·</span>
            <span style={{ fontSize: '13px', color: '#8888a0' }}>
              {manga.chapters} ch.
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 px-4 py-4">
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{
            background: isFavorite ? 'rgba(239,68,68,0.12)' : '#1a1a25',
            fontSize: '13px',
            fontWeight: 600,
            color: isFavorite ? '#ef4444' : '#e8e8ed',
          }}
        >
          <Heart size={16} fill={isFavorite ? '#ef4444' : 'none'} />
          Favoris
        </button>
        <button
          onClick={() => setSelectedChapter(chapters[0])}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{
            background: '#6c5ce7',
            fontSize: '13px',
            fontWeight: 700,
            color: '#ffffff',
          }}
        >
          <BookOpen size={16} />
          Lire Ch.1
        </button>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{
            background: '#1a1a25',
            fontSize: '13px',
            fontWeight: 600,
            color: '#e8e8ed',
          }}
        >
          <Bell size={16} />
        </button>
      </div>

      {/* Synopsis */}
      <div className="px-4 pb-4">
        <h3 className="mb-2" style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
          Synopsis:
        </h3>
        <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#8888a0' }}>
          Dans un monde où des portails vers des donjons remplis de monstres se sont ouverts,
          certaines personnes ont acquis des pouvoirs spéciaux. Sung Jin-Woo est le chasseur
          le plus faible de tous, jusqu'au jour où il découvre un donjon secret...
        </p>
        <button style={{ fontSize: '13px', fontWeight: 600, color: '#6c5ce7', marginTop: '8px' }}>
          Voir plus
        </button>
      </div>

      {/* Tags */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full" style={{ fontSize: '11px', fontWeight: 600, background: 'rgba(108,92,231,0.12)', color: '#6c5ce7' }}>
            #action
          </span>
          <span className="px-3 py-1 rounded-full" style={{ fontSize: '11px', fontWeight: 600, background: 'rgba(108,92,231,0.12)', color: '#6c5ce7' }}>
            #fantasy
          </span>
          <span className="px-3 py-1 rounded-full" style={{ fontSize: '11px', fontWeight: 600, background: 'rgba(108,92,231,0.12)', color: '#6c5ce7' }}>
            #leveling
          </span>
        </div>
      </div>

      {/* Chapters Section */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-px" style={{ background: '#555570' }} />
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
              Chapitres
            </h3>
            <div className="flex-1 h-px" style={{ background: '#555570' }} />
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <button className="px-3 py-2 rounded-lg" style={{ fontSize: '12px', fontWeight: 600, background: '#1a1a25', color: '#8888a0' }}>
            Trier: Récent ▼
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
        <div className="space-y-1">
          {chapters.map((chapter) => (
            <div
              key={chapter.id}
              onClick={() => setSelectedChapter(chapter)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#1f1f2e] transition-colors cursor-pointer"
              style={{ background: '#111119' }}
            >
              {chapter.isNew && (
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#6c5ce7' }} />
              )}
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                  Ch. {chapter.number} - {chapter.title}
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span style={{ fontSize: '11px', color: '#8888a0' }}>@{chapter.author}</span>
                  <span style={{ fontSize: '11px', color: '#8888a0' }}>{chapter.timeAgo}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comments Section */}
      <div className="px-4 pb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-px" style={{ background: '#555570' }} />
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
              Commentaires (156)
            </h3>
            <div className="flex-1 h-px" style={{ background: '#555570' }} />
          </div>
        </div>
        <div className="text-center py-8">
          <p style={{ fontSize: '13px', color: '#8888a0' }}>
            Les commentaires arrivent bientôt...
          </p>
        </div>
      </div>
    </div>
  );
}