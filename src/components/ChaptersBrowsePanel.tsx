import { motion } from 'motion/react';
import { BookOpen, X, Search, Eye, Heart, PlusCircle } from 'lucide-react';
import type { Chapter } from '../types';


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
  chapters: Chapter[];
}

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
  onPlatformClick,
  chapters,
}: ChaptersBrowsePanelProps) {
  if (!isOpen) return null;

  // Filter chapters
  const filteredChapters = chapters.filter(chapter => {
    const matchesSearch = searchQuery === '' || 
      chapter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chapter.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chapter.chapterNumber.toString().includes(searchQuery);

    const matchesFilter = 
      filter === 'all' ||
      (filter === 'recent' && ['2h ago', 'Yesterday'].includes(chapter.publishDate)) ||
      (filter === 'popular' && chapter.views > 1000) ||
      (filter === 'ongoing' && chapter.status === 'ongoing') ||
      (filter === 'completed' && chapter.status === 'completed');

    const matchesTag = !selectedTag || chapter.tags.includes(selectedTag);

    return matchesSearch && matchesFilter && matchesTag;
  });

  const allTags = Array.from(new Set(chapters.flatMap(ch => ch.tags)));

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
    <div className="h-full flex flex-col bg-background overflow-y-auto">
        {/* Panel Header */}
        <header className="flex-shrink-0 bg-gradient-to-r from-purple-900 to-purple-800 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-white" strokeWidth={2.5} />
              <h3 className="text-white font-bold text-lg">Browse Chapters</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-white" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" strokeWidth={2} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by title, author, or chapter..."
              className="w-full bg-white/10 backdrop-blur-sm text-white placeholder-white/60 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
            />
          </div>
        </header>

        {/* Filters */}
        <div className="flex-shrink-0 px-4 py-2.5 bg-card border-b border-border">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(['all', 'recent', 'popular', 'ongoing', 'completed'] as const).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => onFilterChange(filterOption)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === filterOption
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
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
                  onClick={() => onTagSelect(selectedTag === tag ? null : tag)}
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
            {/* Platform button removed */}
            <button
              onClick={onPublishClick}
              className="px-3 py-1.5 bg-green-600/90 hover:bg-green-700 backdrop-blur-sm rounded-lg text-white text-xs font-medium transition-all flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Publish
            </button>
            <button
              onClick={onMyChaptersClick}
              className="flex-shrink-0 px-2 py-1 rounded-md text-xs font-medium transition-all bg-secondary text-secondary-foreground hover:bg-accent"
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
              {filteredChapters.map((chapter) => (
                <motion.div
                  key={chapter.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  className="bg-card rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer border border-border"
                  onClick={() => onChapterClick(chapter.id)}
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
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
