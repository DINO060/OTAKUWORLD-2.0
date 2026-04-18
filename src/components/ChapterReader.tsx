import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, File, Download, MoreVertical, Eye, Maximize, Minimize, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

interface ChapterReaderProps {
  chapterId: string;
  onBack: () => void;
  onChapterList: () => void;
  chapters: any[];
  onSelectChapter?: (chapterId: string) => void;
  onAddChapter?: (workTitle: string) => void;
}

interface ChapterContent {
  id: string;
  title: string;
  chapterNumber: number;
  author: string;
  authorId: string;
  tags: string[];
  description: string;
  contentType: 'text' | 'images' | 'file' | 'pdf' | 'cbz';
  textContent?: string;
  imagePages?: string[];
  coverImage?: string;
  fileUrl?: string;
  fileData?: string;
  fileName?: string;
  fileType?: string;
  telegramFileId?: string;
}

// Default chapter content (fallback)
const mockChapterContent: ChapterContent = {
  id: '1',
  title: 'The Digital Awakening',
  chapterNumber: 1,
  author: 'sakura_dev',
  authorId: '2',
  tags: ['#scifi', '#tech', '#adventure'],
  description: 'A young hacker discovers a mysterious breach in the digital realm that will change everything he knows about reality. As he dives deeper into the Grid, Kaito must confront the truth about his own existence.',
  contentType: 'text',
  textContent: `The neon lights of Neo-Tokyo flickered against the rain-soaked streets. Kaito stood at the edge of the building, his reflection dancing in the puddles below.

"This is it," he whispered to himself. "The moment everything changes."

His neural implant buzzed with an incoming message. The text scrolled across his vision in electric blue:

[SYSTEM ALERT: Code Breach Detected]
[Location: Sector 7-G]
[Priority: CRITICAL]

Kaito's fingers twitched instinctively, ready to dive into the digital realm. But something felt different this time. The air crackled with an energy he'd never felt before.

---

Chapter 1: The First Dive

The digital landscape stretched before him like an endless ocean of data. Streams of information flowed in rivers of light, cascading through virtual space in patterns both beautiful and terrifying.

"Welcome to the Grid," a voice echoed around him.

Kaito spun, searching for the source. A figure materialized from the data streams—part human, part code, entirely mesmerizing.

"Who are you?" Kaito demanded.

"I am what you seek. I am what you fear. I am the awakening."

The figure extended a hand, and Kaito saw his entire life flash before him—not in memories, but in lines of code. Every choice, every moment, perfectly preserved in digital amber.

"The question isn't who I am," the figure said with a knowing smile. "The question is: are you ready to see what you truly are?"

---

As Kaito reached out to touch the outstretched hand, the world around him began to fracture. Reality and digital space merged, creating something entirely new.

His consciousness expanded, touching the edges of the infinite network. He could feel every connection, every user, every bit of data flowing through the system.

For the first time in his life, Kaito understood: he wasn't just a user of the Grid.

He was part of it.

And it was part of him.

The awakening had begun.

[End of Chapter 1]`,
};

export default function ChapterReader({ chapterId, onBack, onChapterList, chapters, onSelectChapter, onAddChapter }: ChapterReaderProps) {
  const { user } = useAuth();
  const currentIndex = chapters.findIndex(ch => ch.id === chapterId);
  const foundChapter = chapters[currentIndex];
  
  const chapter: ChapterContent = foundChapter ? {
    id: foundChapter.id,
    title: foundChapter.title,
    chapterNumber: foundChapter.chapterNumber,
    author: foundChapter.author,
    authorId: foundChapter.authorId,
    tags: foundChapter.tags || [],
    description: foundChapter.description || '',
    contentType: foundChapter.contentType,
    textContent: foundChapter.textContent,
    imagePages: foundChapter.images,
    coverImage: foundChapter.coverImage,
    fileUrl: foundChapter.fileUrl,
    fileData: foundChapter.fileData,
    fileName: foundChapter.fileName,
    fileType: foundChapter.fileType,
    telegramFileId: foundChapter.telegramFileId,
  } : mockChapterContent;

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const resolvedFileUrl = chapter.fileUrl || chapter.fileData ||
    (chapter.telegramFileId ? `${apiBase}/download/${chapter.id}` : undefined);

  const [showSynopsis, setShowSynopsis] = useState(true);
  const [showChaptersList, setShowChaptersList] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);

  const isPdf = chapter.contentType === 'pdf' ||
    chapter.fileType === 'pdf' ||
    (chapter.contentType === 'file' && (chapter.fileUrl?.endsWith('.pdf') || chapter.fileName?.endsWith('.pdf')));

  // Author check for "Add Next Chapter" button
  const isAuthor = user && chapter.authorId === user.id;
  const sameWorkChapters = useMemo(() =>
    chapters.filter(ch => ch.title === chapter.title && ch.author === chapter.author),
    [chapters, chapter.title, chapter.author]
  );
  const maxChapterNumber = useMemo(() =>
    Math.max(...sameWorkChapters.map((ch: any) => ch.chapterNumber), 0),
    [sameWorkChapters]
  );

  const toggleFullscreen = useCallback(() => {
    if (!readerRef.current) return;
    if (!document.fullscreenElement) {
      readerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Listen for fullscreen changes (e.g., user presses Escape)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Scroll to top and reset reading state when chapter changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsReading(false);
  }, [chapterId]);

  return (
    <div className="h-full bg-gray-900 overflow-y-auto">
      {/* Header with Cover */}
      <div className="relative h-64 sm:h-80 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 overflow-hidden">
        {/* Cover Image Background */}
        {chapter.coverImage && (
          <img 
            src={chapter.coverImage} 
            alt={chapter.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        
        {/* Overlay Pattern */}
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
        
        {/* Back Button - Top Left */}
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white/90 hover:bg-white backdrop-blur-sm rounded-xl flex items-center justify-center transition-all shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-800" strokeWidth={2.5} />
          </button>
        </div>

        {/* Cover Content - Centered */}
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div className="text-center max-w-2xl">
            {/* Genre Badges */}
            <div className="flex items-center justify-center gap-2 mb-3">
              {chapter.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-semibold rounded-full border border-white/30"
                >
                  {tag.replace('#', '')}
                </span>
              ))}
            </div>

            {/* Story Title */}
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 drop-shadow-lg">
              {chapter.title}
            </h1>

            {/* Chapter Number */}
            <div className="mt-4">
              <span className="inline-block px-4 py-1.5 bg-white/90 backdrop-blur-sm text-purple-600 text-sm font-bold rounded-full">
                Chapter {chapter.chapterNumber}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Synopsis Section */}
        {chapter.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-2xl shadow-sm p-5 mb-6 border border-gray-700"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-lg font-bold text-white">Story Synopsis</h2>
              <button
                onClick={() => setShowSynopsis(!showSynopsis)}
                className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
              >
                {showSynopsis ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
            <AnimatePresence>
              {showSynopsis && (
                <motion.p
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="text-gray-300 text-sm leading-relaxed"
                >
                  {chapter.description}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Add Next Chapter Button (author only) */}
        {isAuthor && onAddChapter && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onAddChapter(chapter.title)}
            className="w-full mb-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            Add Next Chapter (Ch. {maxChapterNumber + 1})
          </motion.button>
        )}

        {/* All Chapters Section */}
        <div className="bg-gray-800 rounded-2xl shadow-sm mb-6 overflow-hidden border border-gray-700">
          <button
            onClick={() => setShowChaptersList(!showChaptersList)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-700 transition-colors"
          >
            <h2 className="text-lg font-bold text-white">Chapters</h2>
            {showChaptersList ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          <AnimatePresence>
            {showChaptersList && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="max-h-96 overflow-y-auto">
                  {chapters
                    .filter((ch) => ch.title === chapter.title && ch.author === chapter.author)
                    .sort((a, b) => a.chapterNumber - b.chapterNumber)
                    .map((ch, index) => {
                      const isCurrentChapter = ch.id === chapterId;
                      const isRead = index < currentIndex;
                      const isNew = index > currentIndex + 1;
                      
                      const pageCount = ch.contentType === 'images' && ch.images
                        ? ch.images.length
                        : ch.contentType === 'text' && ch.textContent
                        ? Math.ceil(ch.textContent.length / 2000)
                        : 1;
                      const viewCountFormatted = ch.views > 1000
                        ? `${(ch.views / 1000).toFixed(1)}k`
                        : (ch.views || 0).toString();
                      
                      return (
                        <motion.div
                          key={ch.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-t border-gray-100 first:border-t-0"
                        >
                          <button
                            onClick={() => {
                              setShowChaptersList(false);
                              if (isCurrentChapter) {
                                setIsReading(true);
                              } else if (onSelectChapter) {
                                onSelectChapter(ch.id);
                              }
                            }}
                            className={`
                              group w-full text-left px-4 sm:px-5 py-4 transition-all duration-200
                              hover:bg-gradient-to-r hover:from-blue-900/30 hover:to-purple-900/30
                              hover:shadow-sm active:scale-[0.98]
                              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset
                              ${isCurrentChapter ? 'bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-l-4 border-l-purple-500' : ''}
                            `}
                          >
                            <div className="flex items-center justify-between gap-3">
                              {/* Left Side - Chapter Info */}
                              <div className="flex-1 min-w-0">
                                {/* Chapter Badge */}
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-sm">
                                    Ch. {ch.chapterNumber.toString().padStart(2, '0')}
                                  </span>
                                  {isNew && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-pink-500 to-orange-500 text-white animate-pulse">
                                      NEW
                                    </span>
                                  )}
                                </div>
                                
                                {/* Title */}
                                <h3 className="font-bold text-sm sm:text-base text-white mb-1 line-clamp-1 group-hover:text-purple-400 transition-colors">
                                  {ch.title}
                                </h3>
                                
                                {/* Meta Info */}
                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <File className="w-3.5 h-3.5" />
                                    {pageCount} pages
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-3.5 h-3.5" />
                                    {viewCountFormatted} views
                                  </span>
                                </div>
                                
                                {/* Optional Progress Bar */}
                                {isCurrentChapter && (
                                  <div className="mt-2">
                                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '45%' }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Right Side - Action Buttons */}
                              <div className="flex items-center gap-2">
                                {/* Read/Continue Button */}
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="flex-shrink-0"
                                >
                                  {isCurrentChapter ? (
                                    <div className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-lg shadow-md">
                                      Continue
                                    </div>
                                  ) : isRead ? (
                                    <div className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-bold rounded-lg transition-colors">
                                      Reread
                                    </div>
                                  ) : (
                                    <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-bold rounded-lg shadow-md transition-all">
                                      Read
                                    </div>
                                  )}
                                </motion.div>
                                
                                {/* Optional Menu Button */}
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Add menu functionality here
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      // Add menu functionality here
                                    }
                                  }}
                                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                                >
                                  <MoreVertical className="w-4 h-4 text-gray-400" />
                                </div>
                              </div>
                            </div>
                          </button>
                        </motion.div>
                      );
                    })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Reading Area - Only shown after clicking a chapter */}
        {isReading && chapter.contentType === 'text' && chapter.textContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-2xl shadow-sm p-6 mb-6 border border-gray-700"
          >
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-gray-200 leading-relaxed">
                {chapter.textContent}
              </div>
            </div>
          </motion.div>
        )}

        {isReading && chapter.contentType === 'images' && chapter.imagePages && chapter.imagePages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-2xl shadow-sm p-4 mb-6 border border-gray-700"
          >
            <div className="space-y-4">
              {chapter.imagePages.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={image}
                    alt={`Page ${index + 1}`}
                    className="w-full rounded-lg"
                  />
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                    Page {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* PDF Reader - Native browser viewer */}
        {isReading && isPdf && resolvedFileUrl && (
          <motion.div
            ref={readerRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-gray-800 shadow-sm overflow-hidden mb-6 border border-gray-700 ${
              isFullscreen ? 'rounded-none' : 'rounded-2xl'
            }`}
          >
            <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-200">
                {chapter.title} — Ch. {chapter.chapterNumber}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-medium transition-all"
                >
                  {isFullscreen ? (
                    <><Minimize className="w-3.5 h-3.5" /> Exit Fullscreen</>
                  ) : (
                    <><Maximize className="w-3.5 h-3.5" /> Fullscreen</>
                  )}
                </button>
              </div>
            </div>
            <iframe
              src={`${resolvedFileUrl}#toolbar=0&navpanes=0`}
              title={`${chapter.title} - Chapter ${chapter.chapterNumber}`}
              className="w-full border-0"
              style={{ height: isFullscreen ? 'calc(100vh - 48px)' : '85vh', minHeight: '700px' }}
            />
          </motion.div>
        )}

        {/* CBZ / Other files - Download option */}
        {isReading && (chapter.contentType === 'cbz' || (chapter.contentType === 'file' && !chapter.fileName?.endsWith('.pdf'))) && resolvedFileUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-2xl shadow-sm overflow-hidden mb-6 border border-gray-700"
          >
            <div className="text-center py-8 px-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-900 rounded-full flex items-center justify-center">
                <File className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {chapter.contentType === 'cbz' ? 'CBZ Chapter' : 'File Chapter'}
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                {chapter.fileName || `${chapter.title}.${chapter.fileType || 'file'}`}
              </p>
              <a
                href={resolvedFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={chapter.fileName || `${chapter.title}.${chapter.fileType || 'file'}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-sm transition-all"
              >
                <Download className="w-5 h-5" />
                Download File
              </a>
            </div>
          </motion.div>
        )}

        {/* Back to Browse */}
        <div className="text-center pb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-xl font-semibold text-sm transition-all"
          >
            <BookOpen className="w-5 h-5" />
            Back to Browse
          </button>
        </div>
      </div>
    </div>
  );
}