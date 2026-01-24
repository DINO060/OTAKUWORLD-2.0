import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Chapter, ChapterFilter, PublishChapterInput } from '../types';

// ============================================
// CHAPTERS CONTEXT - Chapter Management
// ============================================

interface ChaptersContextType {
  // Chapters data
  chapters: Chapter[];
  myChapters: Chapter[];

  // Current chapter for reading
  selectedChapterId: string | null;
  setSelectedChapterId: (id: string | null) => void;
  getChapterById: (id: string) => Chapter | undefined;

  // Filtering
  filter: ChapterFilter;
  setFilter: (filter: ChapterFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  filteredChapters: Chapter[];

  // Actions
  publishChapter: (chapter: PublishChapterInput) => void;
  deleteChapter: (id: string) => void;
  updateChapter: (id: string, updates: Partial<Chapter>) => void;
  likeChapter: (id: string) => void;

  // Tags
  allTags: string[];
}

const ChaptersContext = createContext<ChaptersContextType | undefined>(undefined);

// Initial Chapters Data
const initialChapters: Chapter[] = [
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
    textContent: 'The world was changing...',
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
    contentType: 'text',
    textContent: 'In the realm of code...',
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
    images: [],
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
    textContent: 'The final block was mined...',
  },
];

interface ChaptersProviderProps {
  children: ReactNode;
}

export function ChaptersProvider({ children }: ChaptersProviderProps) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ChapterFilter>({ type: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Get chapters by current user (authorId = '1')
  const myChapters = chapters.filter(ch => ch.authorId === '1');

  // Get all unique tags
  const allTags = Array.from(new Set(chapters.flatMap(ch => ch.tags)));

  // Filter chapters based on current filters
  const filteredChapters = chapters.filter(chapter => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      chapter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chapter.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chapter.chapterNumber.toString().includes(searchQuery);

    // Status filter
    const matchesFilter =
      filter.type === 'all' ||
      (filter.type === 'recent' && ['2h ago', 'Yesterday', 'Just now'].includes(chapter.publishDate)) ||
      (filter.type === 'popular' && chapter.views > 1000) ||
      (filter.type === 'ongoing' && chapter.status === 'ongoing') ||
      (filter.type === 'completed' && chapter.status === 'completed');

    // Tag filter
    const matchesTag = !selectedTag || chapter.tags.includes(selectedTag);

    return matchesSearch && matchesFilter && matchesTag;
  });

  const getChapterById = useCallback((id: string) => {
    return chapters.find(ch => ch.id === id);
  }, [chapters]);

  const publishChapter = useCallback((chapterInput: PublishChapterInput) => {
    const newChapter: Chapter = {
      ...chapterInput,
      id: Date.now().toString(),
      publishDate: 'Just now',
      views: 0,
      likes: 0,
      author: 'you',
      authorId: '1',
    };
    setChapters(prev => [newChapter, ...prev]);

    // TODO: Send to Supabase
    // await supabase.from('chapters').insert(newChapter);
  }, []);

  const deleteChapter = useCallback((id: string) => {
    setChapters(prev => prev.filter(ch => ch.id !== id));

    // TODO: Delete from Supabase
    // await supabase.from('chapters').delete().eq('id', id);
  }, []);

  const updateChapter = useCallback((id: string, updates: Partial<Chapter>) => {
    setChapters(prev => prev.map(ch =>
      ch.id === id ? { ...ch, ...updates } : ch
    ));

    // TODO: Update in Supabase
    // await supabase.from('chapters').update(updates).eq('id', id);
  }, []);

  const likeChapter = useCallback((id: string) => {
    setChapters(prev => prev.map(ch =>
      ch.id === id ? { ...ch, likes: ch.likes + 1 } : ch
    ));

    // TODO: Update in Supabase
    // await supabase.from('chapters').update({ likes: chapter.likes + 1 }).eq('id', id);
  }, []);

  const value: ChaptersContextType = {
    chapters,
    myChapters,
    selectedChapterId,
    setSelectedChapterId,
    getChapterById,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    selectedTag,
    setSelectedTag,
    filteredChapters,
    publishChapter,
    deleteChapter,
    updateChapter,
    likeChapter,
    allTags,
  };

  return (
    <ChaptersContext.Provider value={value}>
      {children}
    </ChaptersContext.Provider>
  );
}

export function useChapters() {
  const context = useContext(ChaptersContext);
  if (context === undefined) {
    throw new Error('useChapters must be used within a ChaptersProvider');
  }
  return context;
}

export default ChaptersContext;
