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

// Mock chapters data
const mockChapters: Chapter[] = [
  {
    id: '1',
    title: 'The Digital Awakening',
    chapterNumber: 1,
    author: 'sakura_dev',
    authorId: '2',
    tags: ['#scifi', '#tech', '#adventure'],
    publishDate: '2h ago',
    status: 'new',
    views: 234,
    likes: 45,
    description: 'A journey into the virtual world begins...',
    contentType: 'text',
  },
  {
    id: '2',
    title: 'Chronicles of the Code',
    chapterNumber: 5,
    author: 'TechGuru',
    authorId: '3',
    tags: ['#programming', '#fantasy'],
    publishDate: 'Yesterday',
    status: 'ongoing',
    views: 1205,
    likes: 189,
    description: 'The battle between legacy and modern code intensifies.',
    contentType: 'images',
  },
  {
    id: '3',
    title: 'Midnight Manga',
    chapterNumber: 12,
    author: 'MangaFan22',
    authorId: '4',
    tags: ['#manga', '#anime', '#action'],
    publishDate: '3d ago',
    status: 'ongoing',
    views: 3421,
    likes: 567,
    description: 'The final showdown approaches!',
    contentType: 'images',
  },
  {
    id: '4',
    title: 'Web3 Tales',
    chapterNumber: 8,
    author: 'sakura_dev',
    authorId: '2',
    tags: ['#web3', '#blockchain'],
    publishDate: '1w ago',
    status: 'completed',
    views: 891,
    likes: 123,
    description: 'The blockchain saga concludes.',
    contentType: 'text',
  },
];

export default function ChaptersHome({ onBack, onReadChapter, onPublishNew, onMyChapters, currentUserId, chapters: userChapters }: ChaptersHomeProps) {
  const [chapters] = useState<Chapter[]>(userChapters as Chapter[]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'popular' | 'ongoing' | 'completed'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showBrowsePanel, setShowBrowsePanel] = useState(false);

  // Filter chapters
  const filteredChapters = chapters.filter(chapter => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      chapter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chapter.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chapter.chapterNumber.toString().includes(searchQuery);

    // Status filter
    const matchesStatus = 
      activeFilter === 'all' ||
      (activeFilter === 'recent' && ['2h ago', 'Yesterday'].includes(chapter.publishDate)) ||
      (activeFilter === 'popular' && chapter.views > 1000) ||
      (activeFilter === 'ongoing' && chapter.status === 'ongoing') ||
      (activeFilter === 'completed' && chapter.status === 'completed');

    // Tag filter
    const matchesTag = !selectedTag || chapter.tags.includes(selectedTag);

    return matchesSearch && matchesStatus && matchesTag;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(chapters.flatMap(ch => ch.tags)));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-green-100 text-green-700';
      case 'ongoing': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-[#2563eb] to-[#3b82f6] shadow-lg flex-shrink-0">
        <div className="px-3 py-3 sm:px-4 sm:py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="relative w-9 h-9 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all group"
            >
              <MessageCircle className="w-5 h-5 text-white" strokeWidth={2.5} />
              {/* Live Pulse Indicator */}
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [1, 0.5, 1],
                }}
                transition={{
                  duration: 2,
                  ease: "easeInOut",
                  repeat: Infinity,
                }}
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white shadow-lg"
              />
            </button>
            <div>
              <h1 className="text-white font-bold text-lg sm:text-xl">Chapters</h1>
              <p className="text-white/80 text-xs">Read & Publish</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onMyChapters}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-white text-xs font-medium transition-all"
            >
              My Chapters
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT - WELCOME STATE */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg">
            <BookOpen className="w-10 h-10 text-white" strokeWidth={2} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Chapters Platform
          </h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Discover amazing stories, publish your own chapters, and connect with readers worldwide.
          </p>

          {/* Primary Publish CTA */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onPublishNew}
            className="w-full mb-3 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <PlusCircle className="w-5 h-5" strokeWidth={2.5} />
            Publish Your Chapter
          </motion.button>
          <p className="text-xs text-gray-500">
            Create & share your stories with the world
          </p>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{chapters.length}</div>
              <div className="text-xs text-gray-500 mt-1">Chapters</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {chapters.reduce((sum, ch) => sum + ch.views, 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Total Views</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-600">
                {chapters.reduce((sum, ch) => sum + ch.likes, 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Total Likes</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* FLOATING ACTION BUTTON (FAB) - Browse Chapters */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowBrowsePanel(true)}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center z-40 transition-all"
      >
        <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={2.5} />
      </motion.button>

      {/* BROWSE PANEL - Slide Up */}
      <AnimatePresence>
        {showBrowsePanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBrowsePanel(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-none shadow-2xl z-50 flex flex-col max-h-[90vh] sm:max-h-full"
            >
              {/* Panel Header */}
              <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-4 rounded-t-3xl sm:rounded-none">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-bold text-lg">Browse Chapters</h3>
                  <button
                    onClick={() => setShowBrowsePanel(false)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all"
                  >
                    <X className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" strokeWidth={2} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, author, or chapter..."
                    className="w-full bg-white/10 backdrop-blur-sm text-white placeholder-white/60 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex-shrink-0 px-4 py-2.5 bg-white border-b border-gray-200">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {(['all', 'recent', 'popular', 'ongoing', 'completed'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activeFilter === filter
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter === 'recent' && <Clock className="w-3 h-3 inline mr-1" />}
                      {filter === 'popular' && <TrendingUp className="w-3 h-3 inline mr-1" />}
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {allTags.length > 0 && (
                <div className="flex-shrink-0 px-4 py-2 bg-white border-b border-gray-200">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <span className="flex-shrink-0 text-xs text-gray-500 font-medium">
                      Tags:
                    </span>
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                        className={`flex-shrink-0 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                          selectedTag === tag
                            ? 'bg-blue-500 text-white'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chapters Grid */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {filteredChapters.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center px-6 py-12">
                      <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                      </div>
                      <h3 className="text-gray-800 font-semibold text-base mb-1">No chapters found</h3>
                      <p className="text-gray-500 text-sm">Try adjusting your filters or search</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredChapters.map((chapter) => (
                      <motion.div
                        key={chapter.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -2 }}
                        className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer border border-gray-100"
                        onClick={() => {
                          setShowBrowsePanel(false);
                          onReadChapter(chapter.id);
                        }}
                      >
                        {/* Cover Image */}
                        <div className="relative h-32 sm:h-36 bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20 overflow-hidden">
                          {chapter.coverImage ? (
                            <img src={chapter.coverImage} className="w-full h-full object-cover" alt={chapter.title} />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <BookOpen className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
                            </div>
                          )}
                          
                          {/* Status Badge */}
                          <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-[8px] font-semibold ${getStatusColor(chapter.status)}`}>
                            {getStatusLabel(chapter.status)}
                          </div>

                          {/* Chapter Number */}
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/50 backdrop-blur-sm rounded text-white text-[8px] font-bold">
                            Ch. {chapter.chapterNumber}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-2.5">
                          <h3 className="text-gray-900 font-semibold text-sm mb-1 line-clamp-2">
                            {chapter.title}
                          </h3>
                          
                          <p className="text-gray-600 text-xs mb-1.5 line-clamp-2">
                            {chapter.description}
                          </p>

                          {/* Author */}
                          <div className="flex items-center gap-1 mb-1">
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold">
                              {chapter.author.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-gray-700 text-[10px] font-medium truncate">{chapter.author}</span>
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-0.5 mb-1">
                            {chapter.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* Stats */}
                          <div className="flex items-center justify-between text-[10px] text-gray-500">
                            <span className="flex items-center gap-0.5">
                              <Eye className="w-3 h-3" />
                              {chapter.views}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Heart className="w-3 h-3" />
                              {chapter.likes}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
