import React, { useState } from 'react';
import { ArrowLeft, Edit, Trash2, Eye, EyeOff, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserChapter {
  id: string;
  title: string;
  chapterNumber: number;
  status: 'published' | 'draft' | 'removed' | 'new' | 'ongoing' | 'completed';
  publishDate?: string;
  views: number;
  likes: number;
  contentType: 'text' | 'images';
}

interface MyChaptersProps {
  onBack: () => void;
  onEditChapter: (chapterId: string) => void;
  chapters: any[];
}

// Mock user chapters
const mockUserChapters: UserChapter[] = [
  {
    id: '1',
    title: 'The Digital Awakening',
    chapterNumber: 1,
    status: 'published',
    publishDate: '2h ago',
    views: 234,
    likes: 45,
    contentType: 'text',
  },
  {
    id: '4',
    title: 'Web3 Tales',
    chapterNumber: 8,
    status: 'published',
    publishDate: '1w ago',
    views: 891,
    likes: 123,
    contentType: 'text',
  },
  {
    id: '5',
    title: 'Untitled Chapter',
    chapterNumber: 2,
    status: 'draft',
    views: 0,
    likes: 0,
    contentType: 'text',
  },
];

export default function MyChapters({ onBack, onEditChapter, chapters: userChapters }: MyChaptersProps) {
  const [chapters, setChapters] = useState<UserChapter[]>(userChapters.map(ch => ({
    id: ch.id,
    title: ch.title,
    chapterNumber: ch.chapterNumber,
    status: ch.status === 'new' || ch.status === 'ongoing' || ch.status === 'completed' ? 'published' : ch.status,
    publishDate: ch.publishDate,
    views: ch.views,
    likes: ch.likes,
    contentType: ch.contentType,
  })));
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft' | 'removed'>('all');
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  const filteredChapters = chapters.filter(chapter => {
    if (activeTab === 'all') return true;
    return chapter.status === activeTab;
  });

  const handleDelete = (chapterId: string) => {
    if (confirm('Are you sure you want to delete this chapter?')) {
      setChapters(chapters.filter(ch => ch.id !== chapterId));
      setSelectedChapter(null);
    }
  };

  const handleToggleVisibility = (chapterId: string) => {
    setChapters(chapters.map(ch => {
      if (ch.id === chapterId) {
        return {
          ...ch,
          status: ch.status === 'published' ? 'removed' : 'published'
        };
      }
      return ch;
    }));
    setSelectedChapter(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-700';
      case 'draft':
        return 'bg-yellow-100 text-yellow-700';
      case 'removed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-[#2563eb] to-[#3b82f6] shadow-lg flex-shrink-0">
        <div className="px-3 py-3 sm:px-4 sm:py-3.5 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-white font-bold text-lg sm:text-xl">My Chapters</h1>
            <p className="text-white/80 text-xs">{chapters.length} total chapters</p>
          </div>
        </div>
      </header>

      {/* TABS */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-3 sm:px-4 flex gap-1 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            All ({chapters.length})
          </button>
          <button
            onClick={() => setActiveTab('published')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'published'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Published ({chapters.filter(ch => ch.status === 'published').length})
          </button>
          <button
            onClick={() => setActiveTab('draft')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'draft'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Drafts ({chapters.filter(ch => ch.status === 'draft').length})
          </button>
          <button
            onClick={() => setActiveTab('removed')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'removed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Removed ({chapters.filter(ch => ch.status === 'removed').length})
          </button>
        </div>
      </div>

      {/* CHAPTERS LIST */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4">
        {filteredChapters.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-6 py-12">
              <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                <Edit className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-gray-800 font-semibold text-base mb-1">No chapters yet</h3>
              <p className="text-gray-500 text-sm">
                {activeTab === 'all' 
                  ? 'Start publishing your first chapter' 
                  : `No ${activeTab} chapters found`}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredChapters.map((chapter) => (
              <motion.div
                key={chapter.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
              >
                <div className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Title & Chapter Number */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                          Ch. {chapter.chapterNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusBadge(chapter.status)}`}>
                          {getStatusLabel(chapter.status)}
                        </span>
                      </div>

                      <h3 className="text-gray-900 font-semibold text-sm sm:text-base mb-1 truncate">
                        {chapter.title}
                      </h3>

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {chapter.publishDate && (
                          <span>{chapter.publishDate}</span>
                        )}
                        {chapter.status === 'published' && (
                          <>
                            <span>•</span>
                            <span>{chapter.views} views</span>
                            <span>•</span>
                            <span>{chapter.likes} likes</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions Button */}
                    <button
                      onClick={() => setSelectedChapter(selectedChapter === chapter.id ? null : chapter.id)}
                      className="w-8 h-8 flex-shrink-0 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  {/* Action Menu */}
                  <AnimatePresence>
                    {selectedChapter === chapter.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 pt-3 border-t border-gray-100 overflow-hidden"
                      >
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => onEditChapter(chapter.id)}
                            className="flex flex-col items-center gap-1 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                            <span className="text-xs text-gray-700 font-medium">Edit</span>
                          </button>

                          <button
                            onClick={() => handleToggleVisibility(chapter.id)}
                            className="flex flex-col items-center gap-1 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            {chapter.status === 'published' ? (
                              <>
                                <EyeOff className="w-4 h-4 text-orange-600" />
                                <span className="text-xs text-gray-700 font-medium">Hide</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 text-green-600" />
                                <span className="text-xs text-gray-700 font-medium">Show</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleDelete(chapter.id)}
                            className="flex flex-col items-center gap-1 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                            <span className="text-xs text-gray-700 font-medium">Delete</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
