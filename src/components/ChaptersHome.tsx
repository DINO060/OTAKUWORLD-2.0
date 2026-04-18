import React, { useState } from 'react';
import { ArrowLeft, Search, BookOpen, PlusCircle, Clock, TrendingUp, Filter, Tag, Eye, Heart, X, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Chapter {
  id: string;
  coverImage?: string;
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
}

interface ChaptersHomeProps {
  onBack: () => void;
  onReadChapter: (chapterId: string) => void;
  onPublishNew: () => void;
  onMyChapters: () => void;
  currentUserId: string;
  chapters: any[];
}

export default function ChaptersHome({ onBack, onReadChapter, onPublishNew, onMyChapters, currentUserId, chapters: userChapters }: ChaptersHomeProps) {
  const [chapters] = useState<Chapter[]>(userChapters as Chapter[]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'popular' | 'ongoing' | 'completed'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showBrowsePanel, setShowBrowsePanel] = useState(false);

  // Filter chapters
  const filteredChapters = chapters.filter(chapter => {
    const matchesSearch = searchQuery === '' ||
      chapter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chapter.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chapter.chapterNumber.toString().includes(searchQuery);

    const matchesStatus =
      activeFilter === 'all' ||
      (activeFilter === 'recent' && ['2h ago', 'Yesterday'].includes(chapter.publishDate)) ||
      (activeFilter === 'popular' && chapter.views > 1000) ||
      (activeFilter === 'ongoing' && chapter.status === 'ongoing') ||
      (activeFilter === 'completed' && chapter.status === 'completed');

    const matchesTag = !selectedTag || chapter.tags.includes(selectedTag);

    return matchesSearch && matchesStatus && matchesTag;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(chapters.flatMap(ch => ch.tags)));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-green-500 text-white';
      case 'ongoing': return 'bg-blue-500 text-white';
      case 'completed': return 'bg-gray-600 text-white';
      default: return 'bg-gray-600 text-white';
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

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto">
      {/* Header with Search */}
      <header className="flex-shrink-0 bg-gradient-to-r from-purple-900 to-purple-800 px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" strokeWidth={2} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chapters..."
            className="w-full bg-white/10 backdrop-blur-sm text-white placeholder-white/60 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
          />
        </div>
      </header>

      {/* Filters */}
      <div className="flex-shrink-0 px-4 py-2.5 bg-card border-b border-border">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(['all', 'recent', 'popular', 'ongoing', 'completed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeFilter === filter
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {filter === 'all' && 'All'}
              {filter === 'recent' && 'Recent'}
              {filter === 'popular' && 'Popular'}
              {filter === 'ongoing' && 'Ongoing'}
              {filter === 'completed' && 'Completed'}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 bg-card border-b border-border">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <span className="flex-shrink-0 text-xs text-muted-foreground font-medium">
              Tags:
            </span>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`flex-shrink-0 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  selectedTag === tag
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex-shrink-0 px-4 py-2 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={onPublishNew}
            className="px-3 py-1.5 bg-green-600/90 hover:bg-green-700 backdrop-blur-sm rounded-lg text-white text-xs font-medium transition-all flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Publish
          </button>
          <button
            onClick={onMyChapters}
            className="flex-shrink-0 px-2 py-1 rounded-md text-xs font-medium transition-all bg-purple-900/30 text-purple-300 hover:bg-purple-900/50"
          >
            My Chapters
          </button>
        </div>
      </div>

      {/* Chapters Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {filteredChapters.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-6 py-12">
                <div className="w-16 h-16 mx-auto mb-3 bg-secondary rounded-full flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
              </div>
                <h3 className="text-foreground font-semibold text-base mb-1">No chapters found</h3>
                <p className="text-muted-foreground text-sm">Try adjusting your filters or search</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {filteredChapters.map((chapter, index) => {
              const getStatusColor = (status: string) => {
                switch (status) {
                  case 'new': return 'bg-green-900/50 text-green-400';
                  case 'ongoing': return 'bg-blue-900/50 text-blue-400';
                  case 'completed': return 'bg-slate-800 text-slate-400';
                  default: return 'bg-slate-800 text-slate-400';
                }
              };

              const getStatusLabel = (status: string) => {
                return status.charAt(0).toUpperCase() + status.slice(1);
              };

              return (
                <motion.div
                  key={chapter.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  className="bg-card rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer border border-border"
                  onClick={() => onReadChapter(chapter.id)}
                >
                  {/* Cover Image */}
                  <div className="relative h-32 bg-secondary overflow-hidden">
                    {chapter.coverImage ? (
                      <img src={chapter.coverImage} alt={chapter.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <BookOpen className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
                      </div>
                    )}

                    {/* Status Badge - Top Left */}
                    <div className={`absolute top-1 left-1 px-2 py-1 rounded text-[10px] font-bold ${getStatusColor(chapter.status)}`}>
                      {getStatusLabel(chapter.status)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-1.5">
                    {/* Genre/Tags */}
                    <div className="text-[10px] text-muted-foreground font-medium mb-0.5">
                      {chapter.tags[0]?.replace('#', '') || 'Story'}
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-foreground font-semibold text-xs mb-1 line-clamp-2 leading-tight">
                      {chapter.title}
                    </h3>
                    
                    {/* Likes */}
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                      <Heart className="w-3 h-3 fill-emerald-600" />
                      {chapter.likes.toLocaleString()}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
