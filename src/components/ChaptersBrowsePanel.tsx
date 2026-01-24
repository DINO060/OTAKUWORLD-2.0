import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, X, Search, Eye, Heart, PlusCircle, Clock, TrendingUp } from 'lucide-react';

// Types locaux pour éviter le couplage avec App.tsx
export interface ChapterCardData {
  id: string;
  title: string;
  chapterNumber: number;
  author: string;
  authorId: string;
  tags: string[];
  publishDate: string;
  status: 'new' | 'ongoing' | 'completed';
  views: number;
  likes: number;
  description: string;
  contentType: 'text' | 'images';
  coverImage?: string;
}

interface ChaptersBrowsePanelProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: 'all' | 'recent' | 'popular' | 'ongoing' | 'completed';
  onFilterChange: (filter: 'all' | 'recent' | 'popular' | 'ongoing' | 'completed') => void;
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
  onChapterClick: (chapterId: string) => void;
  onPublishClick: () => void;
  onMyChaptersClick: () => void;
  onPlatformClick?: () => void;
  chapters: ChapterCardData[];
}

// Utility functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'new': return 'bg-green-500 text-white';
    case 'ongoing': return 'bg-blue-500 text-white';
    case 'completed': return 'bg-gray-600 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

const getStatusLabel = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const getFilterIcon = (filterName: string) => {
  switch (filterName) {
    case 'recent': return <Clock className="w-3 h-3" />;
    case 'popular': return <TrendingUp className="w-3 h-3" />;
    default: return null;
  }
};

export default function ChaptersBrowsePanel({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  selectedTag,
  onTagSelect,
  onChapterClick,
  onPublishClick,
  onMyChaptersClick,
  chapters,
}: ChaptersBrowsePanelProps) {
  if (!isOpen) return null;

  // Filter chapters
  const filteredChapters = chapters.filter(chapter => {
    const matchesSearch = searchQuery === '' ||
      chapter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chapter.chapterNumber.toString().includes(searchQuery);

    const matchesFilter =
      filter === 'all' ||
      (filter === 'recent' && ['2h ago', 'Yesterday', 'Just now'].includes(chapter.publishDate)) ||
      (filter === 'popular' && chapter.views > 1000) ||
      (filter === 'ongoing' && chapter.status === 'ongoing') ||
      (filter === 'completed' && chapter.status === 'completed');

    const matchesTag = !selectedTag || chapter.tags.includes(selectedTag);

    return matchesSearch && matchesFilter && matchesTag;
  });

  const allTags = Array.from(new Set(chapters.flatMap(ch => ch.tags)));

  return (
    <div className="min-h-screen flex flex-col bg-[#0f0f0f]">
      {/* Header */}
      <header className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Chapters</h1>
              <p className="text-white/70 text-xs">{filteredChapters.length} available</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" strokeWidth={2} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search chapters..."
            className="w-full bg-white/10 backdrop-blur-sm text-white placeholder-white/50 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
          />
        </div>
      </header>

      {/* Filters */}
      <div className="flex-shrink-0 px-4 py-3 bg-[#1a1a1a] border-b border-gray-800 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(['all', 'recent', 'popular', 'ongoing', 'completed'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => onFilterChange(filterOption)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                filter === filterOption
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-[#252525] text-gray-300 hover:bg-[#303030]'
              }`}
            >
              {getFilterIcon(filterOption)}
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2.5 bg-[#1a1a1a] border-b border-gray-800">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="flex-shrink-0 text-xs text-gray-400 font-semibold uppercase tracking-wide">
              Tags:
            </span>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagSelect(selectedTag === tag ? null : tag)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedTag === tag
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex-shrink-0 px-4 py-3 bg-[#1a1a1a] border-b border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onPublishClick}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <PlusCircle className="w-4 h-4" />
            Publish Chapter
          </button>
          <button
            onClick={onMyChaptersClick}
            className="px-4 py-2.5 bg-[#252525] hover:bg-[#303030] border border-gray-700 rounded-xl text-gray-200 text-sm font-semibold transition-all"
          >
            My Chapters
          </button>
        </div>
      </div>

      {/* Chapters Grid - RESPONSIVE */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {filteredChapters.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[300px]">
            <div className="text-center px-6 py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-purple-900/30 rounded-full flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-purple-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-gray-200 font-bold text-lg mb-2">No chapters found</h3>
              <p className="text-gray-500 text-sm">Try adjusting your filters or search terms</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredChapters.map((chapter, index) => (
              <motion.div
                key={chapter.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-[#1e1e1e] rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden cursor-pointer border border-gray-800"
                onClick={() => onChapterClick(chapter.id)}
              >
                {/* Cover Image */}
                <div className="relative aspect-[3/4] bg-gradient-to-br from-purple-900/30 via-indigo-900/30 to-pink-900/30 overflow-hidden">
                  {chapter.coverImage ? (
                    <img
                      src={chapter.coverImage}
                      alt={chapter.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <BookOpen className="w-10 h-10 text-purple-300" strokeWidth={1.5} />
                    </div>
                  )}

                  {/* Chapter Number Badge - Top Left */}
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-white text-xs font-bold">
                    Ch. {chapter.chapterNumber}
                  </div>

                  {/* Status Badge - Top Right */}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-bold ${getStatusColor(chapter.status)}`}>
                    {getStatusLabel(chapter.status)}
                  </div>

                  {/* Gradient Overlay at Bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-3">
                  {/* Primary Tag */}
                  <div className="text-xs text-purple-400 font-semibold mb-1 truncate">
                    {chapter.tags[0]?.replace('#', '') || 'Story'}
                  </div>

                  {/* Title */}
                  <h3 className="text-gray-100 font-bold text-sm mb-2 line-clamp-2 leading-snug min-h-[2.5rem]">
                    {chapter.title}
                  </h3>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-gray-400">
                      <Eye className="w-3.5 h-3.5" />
                      {formatNumber(chapter.views)}
                    </span>
                    <span className="flex items-center gap-1 text-rose-400 font-medium">
                      <Heart className="w-3.5 h-3.5 fill-rose-400" />
                      {formatNumber(chapter.likes)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
