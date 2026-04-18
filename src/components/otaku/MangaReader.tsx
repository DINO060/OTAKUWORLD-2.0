import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, Settings, BookOpen, ChevronLeft, ChevronRight, Flag, Loader } from 'lucide-react';
import JSZip from 'jszip';
import type { MangaTitle } from './types';
import type { Chapter as DBChapter } from '../../types';
import { useChapters } from '../../contexts/ChaptersContext';
import { useAuth } from '../../contexts/AuthContext';
import ReportModal from '../ReportModal';

interface MangaReaderProps {
  manga: MangaTitle;
  chapter: DBChapter;
  allChapters: DBChapter[];
  onBack: () => void;
}

export function MangaReader({ manga, chapter, allChapters, onBack }: MangaReaderProps) {
  const [currentChapter, setCurrentChapter] = useState<DBChapter>(chapter);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [cbzPages, setCbzPages] = useState<string[]>([]);
  const [cbzLoading, setCbzLoading] = useState(false);
  const [cbzError, setCbzError] = useState<string | null>(null);
  const { incrementViews } = useChapters();
  const { user } = useAuth();

  // Sort chapters by number for navigation
  const sortedChapters = useMemo(() => {
    return [...allChapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
  }, [allChapters]);

  const currentIndex = sortedChapters.findIndex(ch => ch.id === currentChapter.id);
  const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null;

  const goToChapter = (ch: DBChapter) => {
    setCurrentChapter(ch);
    incrementViews(ch.id);
    window.scrollTo({ top: 0 });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setShowControls(!isFullscreen);
  };

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const resolvedUrl = currentChapter.fileUrl ||
    (currentChapter.telegramFileId ? `${apiBase}/download/${currentChapter.id}` : null);

  const isCbz = currentChapter.contentType === 'cbz' || currentChapter.fileType === 'cbz' ||
    (currentChapter.contentType === 'file' && currentChapter.fileType === 'cbz');
  const isPdf = !isCbz && (
    currentChapter.contentType === 'pdf' || currentChapter.fileType === 'pdf' ||
    currentChapter.contentType === 'file'
  );
  const isImages = currentChapter.contentType === 'images' && currentChapter.images && currentChapter.images.length > 0;
  const isText = currentChapter.contentType === 'text';

  const pages = isImages ? currentChapter.images! : [];

  // CBZ: fetch + unzip + extract images
  useEffect(() => {
    if (!isCbz || !resolvedUrl) return;
    setCbzPages([]);
    setCbzError(null);
    setCbzLoading(true);

    fetch(resolvedUrl)
      .then(r => r.arrayBuffer())
      .then(buf => JSZip.loadAsync(buf))
      .then(zip => {
        const imageFiles = Object.values(zip.files)
          .filter(f => !f.dir && /\.(jpe?g|png|webp|gif)$/i.test(f.name))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        return Promise.all(
          imageFiles.map(f =>
            f.async('blob').then(blob => URL.createObjectURL(blob))
          )
        );
      })
      .then(urls => { setCbzPages(urls); setCbzLoading(false); })
      .catch(e => { setCbzError('Impossible de lire le fichier CBZ'); setCbzLoading(false); });
  }, [currentChapter.id, isCbz, resolvedUrl]);

  return (
    <div className="h-full flex flex-col" style={{ background: isFullscreen ? '#000000' : '#0c0c14' }}>
      {/* Header */}
      {showControls && (
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{
            background: '#111119',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors flex-shrink-0"
            >
              <ArrowLeft size={20} style={{ color: '#e8e8ed' }} />
            </button>
            <div className="min-w-0">
              <p className="truncate" style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                {manga.title} — Ch.{currentChapter.chapterNumber}
              </p>
              <p style={{ fontSize: '11px', color: '#8888a0' }}>
                par @{currentChapter.author}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {user && currentChapter.authorId !== user.id && (
              <button
                onClick={() => setShowReport(true)}
                className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
                title="Signaler ce chapitre"
              >
                <Flag size={18} style={{ color: '#8888a0' }} />
              </button>
            )}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
            >
              <BookOpen size={20} style={{ color: '#e8e8ed' }} />
            </button>
          </div>
        </div>
      )}

      {/* Reader Content */}
      <div
        className="flex-1 overflow-hidden flex flex-col"
        onClick={() => !isPdf && !isCbz && setShowControls(!showControls)}
      >
        {/* PDF Reader */}
        {isPdf && resolvedUrl && (
          <iframe
            src={resolvedUrl}
            className="w-full flex-1 border-0"
            title={`${manga.title} Ch.${currentChapter.chapterNumber}`}
            style={{ background: '#1a1a25' }}
          />
        )}

        {isPdf && !resolvedUrl && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span style={{ fontSize: '48px' }}>📄</span>
              <p className="mt-3" style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>Fichier non disponible</p>
              <p className="mt-1" style={{ fontSize: '13px', color: '#8888a0' }}>L'URL du fichier est manquante</p>
            </div>
          </div>
        )}

        {/* CBZ Reader */}
        {isCbz && cbzLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader size={32} className="animate-spin" style={{ color: '#6c5ce7' }} />
          </div>
        )}
        {isCbz && !cbzLoading && (cbzError || (!cbzError && cbzPages.length === 0)) && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span style={{ fontSize: '48px' }}>📦</span>
              <p className="mt-3" style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
                {cbzError || 'Chargement du fichier impossible'}
              </p>
              <p className="mt-1" style={{ fontSize: '13px', color: '#8888a0' }}>
                Vérifiez que le serveur streaming est actif
              </p>
            </div>
          </div>
        )}
        {isCbz && !cbzLoading && !cbzError && cbzPages.length > 0 && (
          <div className="flex-1 overflow-y-auto" onClick={() => setShowControls(!showControls)}>
            <div className="max-w-3xl mx-auto">
              {cbzPages.map((url, i) => (
                <div key={i} className="w-full">
                  <img src={url} alt={`Page ${i + 1}`} className="w-full h-auto" style={{ display: 'block' }} loading="lazy" />
                </div>
              ))}
              <div className="text-center py-8" style={{ background: '#0c0c14' }}>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed', marginBottom: '8px' }}>
                  Fin du chapitre {currentChapter.chapterNumber}
                </p>
                <p style={{ fontSize: '13px', color: '#8888a0' }}>{cbzPages.length} pages</p>
                {nextChapter && (
                  <button
                    onClick={(e) => { e.stopPropagation(); goToChapter(nextChapter); }}
                    className="mt-4 px-6 py-2.5 rounded-xl"
                    style={{ background: '#6c5ce7', fontSize: '13px', fontWeight: 700, color: '#ffffff' }}
                  >
                    Chapitre suivant →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Image Reader - Vertical Scroll */}
        {isImages && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto">
              {pages.map((url, i) => (
                <div key={i} className="w-full">
                  <img
                    src={url}
                    alt={`Page ${i + 1}`}
                    className="w-full h-auto"
                    style={{ display: 'block' }}
                    loading="lazy"
                  />
                </div>
              ))}
              <div className="text-center py-8" style={{ background: '#0c0c14' }}>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed', marginBottom: '8px' }}>
                  Fin du chapitre {currentChapter.chapterNumber}
                </p>
                <p style={{ fontSize: '13px', color: '#8888a0' }}>
                  {pages.length} pages
                </p>
                {nextChapter && (
                  <button
                    onClick={(e) => { e.stopPropagation(); goToChapter(nextChapter); }}
                    className="mt-4 px-6 py-2.5 rounded-xl"
                    style={{ background: '#6c5ce7', fontSize: '13px', fontWeight: 700, color: '#ffffff' }}
                  >
                    Chapitre suivant →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Text Reader */}
        {isText && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-6">
              <div
                style={{
                  fontSize: '15px',
                  lineHeight: '1.8',
                  color: '#d0d0d8',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {currentChapter.textContent || 'Aucun contenu texte.'}
              </div>
              <div className="text-center py-8">
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed', marginBottom: '8px' }}>
                  Fin du chapitre {currentChapter.chapterNumber}
                </p>
                {nextChapter && (
                  <button
                    onClick={(e) => { e.stopPropagation(); goToChapter(nextChapter); }}
                    className="mt-4 px-6 py-2.5 rounded-xl"
                    style={{ background: '#6c5ce7', fontSize: '13px', fontWeight: 700, color: '#ffffff' }}
                  >
                    Chapitre suivant →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fallback if no content */}
        {!isPdf && !isImages && !isText && !isCbz && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span style={{ fontSize: '48px' }}>📭</span>
              <p className="mt-3" style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
                Contenu non disponible
              </p>
              <p className="mt-1" style={{ fontSize: '13px', color: '#8888a0' }}>
                Type: {currentChapter.contentType}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      {showControls && (
        <div
          className="flex items-center justify-between px-4 py-3 border-t flex-shrink-0"
          style={{
            background: '#111119',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <button
            onClick={() => prevChapter && goToChapter(prevChapter)}
            disabled={!prevChapter}
            className="flex items-center gap-1 px-3 py-2 rounded-lg transition-colors disabled:opacity-30"
            style={{
              background: '#1a1a25',
              fontSize: '12px',
              fontWeight: 600,
              color: '#e8e8ed',
            }}
          >
            <ChevronLeft size={16} />
            {prevChapter ? `Ch.${prevChapter.chapterNumber}` : 'Début'}
          </button>

          <div className="text-center">
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8ed' }}>
              Ch. {currentChapter.chapterNumber}
            </p>
            <p style={{ fontSize: '11px', color: '#8888a0' }}>
              {isImages ? `${pages.length} pages` : isPdf ? 'PDF' : 'Texte'}
            </p>
          </div>

          <button
            onClick={() => nextChapter && goToChapter(nextChapter)}
            disabled={!nextChapter}
            className="flex items-center gap-1 px-3 py-2 rounded-lg transition-colors disabled:opacity-30"
            style={{
              background: '#1a1a25',
              fontSize: '12px',
              fontWeight: 600,
              color: '#e8e8ed',
            }}
          >
            {nextChapter ? `Ch.${nextChapter.chapterNumber}` : 'Fin'}
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        reportedUserId={currentChapter.authorId}
        reportedUsername={currentChapter.author}
        reportedChapterId={currentChapter.id}
        reportedChapterTitle={`${manga.title} — Ch.${currentChapter.chapterNumber}`}
      />
    </div>
  );
}
