import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PosterCard, PosterCardSkeleton } from './PosterCard';
import type { DiscoverItem } from '../../../services/discoverApi';

interface CarouselSectionProps {
  title: string;
  emoji?: string;
  items: DiscoverItem[];
  isLoading?: boolean;
  onItemClick?: (item: DiscoverItem) => void;
  onSeeAll?: () => void;
}

export function CarouselSection({
  title,
  items,
  isLoading = false,
  onItemClick,
  onSeeAll,
}: CarouselSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [items]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.65;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!isLoading && items.length === 0) return null;

  return (
    <div className="py-3">
      {/* Header */}
      <div className="flex items-center justify-between px-5 mb-3">
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8ed' }}>
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {!isLoading && items.length > 0 && (
            <button
              onClick={onSeeAll}
              style={{ fontSize: '12px', fontWeight: 600, color: '#a855f7' }}
              className="hover:opacity-80 transition-opacity"
            >
              See all
            </button>
          )}
        </div>
      </div>

      {/* Carousel with arrows */}
      <div className="relative px-5">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-all hover:scale-110"
            style={{
              background: 'rgba(10,10,18,0.85)',
              border: '1px solid rgba(168,85,247,0.4)',
              color: '#a855f7',
            }}
          >
            <ChevronLeft size={16} />
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-all hover:scale-110"
            style={{
              background: 'rgba(10,10,18,0.85)',
              border: '1px solid rgba(168,85,247,0.4)',
              color: '#a855f7',
            }}
          >
            <ChevronRight size={16} />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0"
                  style={{ width: '130px', scrollSnapAlign: 'start' }}
                >
                  <PosterCardSkeleton size="small" />
                </div>
              ))
            : items.map((item) => (
                <div
                  key={item.id}
                  className="flex-shrink-0"
                  style={{ width: '130px', scrollSnapAlign: 'start' }}
                >
                  <PosterCard item={item} size="small" onClick={onItemClick} />
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
