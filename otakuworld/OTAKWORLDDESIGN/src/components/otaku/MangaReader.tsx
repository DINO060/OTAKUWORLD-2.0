import React, { useState } from 'react';
import { ArrowLeft, Settings, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MangaTitle } from './types';

interface Chapter {
  id: string;
  number: number;
  title: string;
  author: string;
  timeAgo: string;
}

interface MangaReaderProps {
  manga: MangaTitle;
  chapter: Chapter;
  onBack: () => void;
}

export function MangaReader({ manga, chapter, onBack }: MangaReaderProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mock pages (using same image for demo)
  const totalPages = 32;
  const pages = Array.from({ length: totalPages }, (_, i) => ({
    id: i + 1,
    url: 'https://images.unsplash.com/photo-1763315371278-623eeaae97cb?w=800&h=1200&fit=crop',
  }));

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setShowControls(!isFullscreen);
  };

  return (
    <div className="h-full flex flex-col" style={{ background: isFullscreen ? '#000000' : '#0c0c14' }}>
      {/* Header */}
      {showControls && (
        <div
          className="flex items-center justify-between px-4 py-3 border-b animate-in fade-in duration-200"
          style={{
            background: '#111119',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
            >
              <ArrowLeft size={20} style={{ color: '#e8e8ed' }} />
            </button>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                {manga.title} Ch.{chapter.number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors">
              <Settings size={20} style={{ color: '#e8e8ed' }} />
            </button>
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
        className="flex-1 overflow-y-auto"
        onClick={() => setShowControls(!showControls)}
      >
        <div className="max-w-3xl mx-auto">
          {/* Vertical Scroll Mode */}
          {pages.slice(0, 8).map((page) => (
            <div key={page.id} className="w-full">
              <img
                src={page.url}
                alt={`Page ${page.id}`}
                className="w-full h-auto"
                style={{ display: 'block' }}
              />
            </div>
          ))}
          {/* End of chapter message */}
          <div className="text-center py-8" style={{ background: '#0c0c14' }}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed', marginBottom: '8px' }}>
              Fin du chapitre {chapter.number}
            </p>
            <p style={{ fontSize: '13px', color: '#8888a0' }}>
              Merci d'avoir lu! 📖
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      {showControls && (
        <div
          className="flex items-center justify-between px-4 py-3 border-t animate-in fade-in duration-200"
          style={{
            background: '#111119',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 rounded-lg transition-colors disabled:opacity-30"
            style={{
              background: '#1a1a25',
              fontSize: '12px',
              fontWeight: 600,
              color: '#e8e8ed',
            }}
          >
            <ChevronLeft size={16} />
            Ch.{chapter.number - 1}
          </button>

          <div className="text-center">
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8ed' }}>
              Page {currentPage}/{totalPages}
            </p>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-lg transition-colors disabled:opacity-30"
            style={{
              background: '#1a1a25',
              fontSize: '12px',
              fontWeight: 600,
              color: '#e8e8ed',
            }}
          >
            Ch.{chapter.number + 1}
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}