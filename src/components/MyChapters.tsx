import React, { useState, useMemo } from 'react';
import { ArrowLeft, Edit, Trash2, Eye, EyeOff, MoreVertical, BookOpen, PlusCircle, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserChapter {
  id: string;
  title: string;
  chapterNumber: number;
  status: 'published' | 'draft' | 'removed' | 'new' | 'ongoing' | 'completed';
  publishDate?: string;
  createdAt: string;
  views: number;
  likes: number;
  contentType: 'text' | 'images';
}

interface MyChaptersProps {
  onBack: () => void;
  onEditChapter: (chapterId: string) => void;
  onAddChapter?: (workTitle: string) => void;
  chapters: any[];
}

export default function MyChapters({ onBack, onEditChapter, onAddChapter, chapters: userChapters }: MyChaptersProps) {
  const [chapters, setChapters] = useState<UserChapter[]>(userChapters.map(ch => ({
    id: ch.id,
    title: ch.title,
    chapterNumber: ch.chapterNumber,
    status: ch.status === 'new' || ch.status === 'ongoing' || ch.status === 'completed' ? 'published' : ch.status,
    publishDate: ch.publishDate,
    createdAt: ch.createdAt || new Date().toISOString(),
    views: ch.views,
    likes: ch.likes,
    contentType: ch.contentType,
  })));

  // Check if a chapter is within the 24h delete window
  const canDelete = (chapter: UserChapter): boolean => {
    const createdTime = new Date(chapter.createdAt).getTime();
    const now = Date.now();
    const hoursSinceCreation = (now - createdTime) / (1000 * 60 * 60);
    return hoursSinceCreation <= 24;
  };

  // Get remaining time for delete window
  const getDeleteTimeLeft = (chapter: UserChapter): string => {
    const createdTime = new Date(chapter.createdAt).getTime();
    const deadline = createdTime + 24 * 60 * 60 * 1000;
    const remaining = deadline - Date.now();
    if (remaining <= 0) return '';
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  };
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft' | 'removed'>('all');
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  // Group chapters by work title
  const workGroups = useMemo(() => {
    const groups = new Map<string, UserChapter[]>();
    chapters.forEach(ch => {
      const key = ch.title.toLowerCase().trim();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ch);
    });
    return Array.from(groups.entries()).map(([, chs]) => ({
      title: chs[0].title,
      chapters: chs.sort((a, b) => a.chapterNumber - b.chapterNumber),
      maxChapter: Math.max(...chs.map(c => c.chapterNumber)),
    }));
  }, [chapters]);

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
        return 'bg-green-500/20 text-green-400';
      case 'draft':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'removed':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="h-full flex flex-col bg-[#0f0f0f] overflow-y-auto">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg flex-shrink-0">
        <div className="px-3 py-3 sm:px-4 sm:py-3.5 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg sm:text-xl">My Chapters</h1>
              <p className="text-white/70 text-xs">{chapters.length} total chapters</p>
            </div>
          </div>
        </div>
      </header>

      {/* TABS */}
      <div className="bg-[#1a1a1a] border-b border-gray-800">
        <div className="px-3 sm:px-4 flex gap-1 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            All ({chapters.length})
          </button>
          <button
            onClick={() => setActiveTab('published')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'published'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Published ({chapters.filter(ch => ch.status === 'published').length})
          </button>
          <button
            onClick={() => setActiveTab('draft')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'draft'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Drafts ({chapters.filter(ch => ch.status === 'draft').length})
          </button>
          <button
            onClick={() => setActiveTab('removed')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'removed'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Removed ({chapters.filter(ch => ch.status === 'removed').length})
          </button>
        </div>
      </div>

      {/* CHAPTERS LIST */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4">
        {filteredChapters.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[300px]">
            <div className="text-center px-6 py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-purple-900/30 rounded-full flex items-center justify-center">
                <Edit className="w-10 h-10 text-purple-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-gray-200 font-bold text-lg mb-2">No chapters yet</h3>
              <p className="text-gray-500 text-sm">
                {activeTab === 'all'
                  ? 'Start publishing your first chapter'
                  : `No ${activeTab} chapters found`}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {workGroups.map((group) => {
              const groupChapters = group.chapters.filter(ch => {
                if (activeTab === 'all') return true;
                return ch.status === activeTab;
              });
              if (groupChapters.length === 0) return null;

              return (
                <div key={group.title}>
                  {/* Work Group Header */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="text-gray-200 font-bold text-sm truncate flex-1">{group.title}</h3>
                    {onAddChapter && (
                      <button
                        onClick={() => onAddChapter(group.title)}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 flex-shrink-0 ml-2 px-2 py-1 hover:bg-blue-500/10 rounded-lg transition-all"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Add Ch. {group.maxChapter + 1}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {groupChapters.map((chapter, index) => (
                      <motion.div
                        key={chapter.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-[#1e1e1e] rounded-xl shadow-sm overflow-hidden border border-gray-800"
                      >
                        <div className="p-3 sm:p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Chapter Number & Status */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 bg-purple-900/30 text-purple-300 rounded text-xs font-bold">
                                  Ch. {chapter.chapterNumber}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusBadge(chapter.status)}`}>
                                  {getStatusLabel(chapter.status)}
                                </span>
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                {chapter.publishDate && (
                                  <span>{chapter.publishDate}</span>
                                )}
                                {chapter.status === 'published' && (
                                  <>
                                    <span className="text-gray-600">·</span>
                                    <span>{chapter.views} views</span>
                                    <span className="text-gray-600">·</span>
                                    <span>{chapter.likes} likes</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Actions Button */}
                            <button
                              onClick={() => setSelectedChapter(selectedChapter === chapter.id ? null : chapter.id)}
                              className="w-8 h-8 flex-shrink-0 flex items-center justify-center hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>

                          {/* Action Menu */}
                          <AnimatePresence>
                            {selectedChapter === chapter.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-3 pt-3 border-t border-gray-700 overflow-hidden"
                              >
                                <div className="grid grid-cols-3 gap-2">
                                  <button
                                    onClick={() => onEditChapter(chapter.id)}
                                    className="flex flex-col items-center gap-1 py-2 hover:bg-gray-700 rounded-lg transition-colors"
                                  >
                                    <Edit className="w-4 h-4 text-purple-400" />
                                    <span className="text-xs text-gray-300 font-medium">Edit</span>
                                  </button>

                                  <button
                                    onClick={() => handleToggleVisibility(chapter.id)}
                                    className="flex flex-col items-center gap-1 py-2 hover:bg-gray-700 rounded-lg transition-colors"
                                  >
                                    {chapter.status === 'published' ? (
                                      <>
                                        <EyeOff className="w-4 h-4 text-orange-400" />
                                        <span className="text-xs text-gray-300 font-medium">Hide</span>
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="w-4 h-4 text-green-400" />
                                        <span className="text-xs text-gray-300 font-medium">Show</span>
                                      </>
                                    )}
                                  </button>

                                  {canDelete(chapter) ? (
                                    <button
                                      onClick={() => handleDelete(chapter.id)}
                                      className="flex flex-col items-center gap-1 py-2 hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-400" />
                                      <span className="text-xs text-gray-300 font-medium">Delete</span>
                                      <span className="text-[10px] text-gray-500">{getDeleteTimeLeft(chapter)}</span>
                                    </button>
                                  ) : (
                                    <div className="flex flex-col items-center gap-1 py-2 opacity-40 cursor-not-allowed">
                                      <Lock className="w-4 h-4 text-gray-500" />
                                      <span className="text-xs text-gray-500 font-medium">Locked</span>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
