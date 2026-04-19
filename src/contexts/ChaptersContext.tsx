import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  generateChapterId,
  uploadChapterCover,
  uploadChapterPages,
  uploadChapterFile,
  deleteChapterFiles,
} from '../lib/storage';
import type { Chapter, ChapterFilter, PublishChapterInput, WorkSummary, BatchPublishProgress } from '../types';

// ============================================
// CHAPTERS CONTEXT - Supabase Integration
// ============================================

interface ChaptersContextType {
  // Chapters data
  chapters: Chapter[];
  myChapters: Chapter[];
  isLoading: boolean;
  error: string | null;

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
  publishChapter: (chapter: PublishChapterInput) => Promise<{ error?: string }>;
  publishBatch: (files: { file: File; chapterNumber: number }[], meta: { workTitle: string; description: string; tags: string[]; status: string; coverImageFile?: File; existingCoverUrl?: string; contentType: string; contentRating?: string }, onProgress?: (progress: BatchPublishProgress) => void) => Promise<{ error?: string }>;
  deleteChapter: (id: string) => Promise<{ error?: string }>;
  updateChapter: (id: string, updates: Partial<Chapter>) => Promise<{ error?: string }>;
  likeChapter: (id: string) => Promise<{ error?: string }>;
  unlikeChapter: (id: string) => Promise<{ error?: string }>;
  hasUserLiked: (chapterId: string) => boolean;
  incrementViews: (id: string) => Promise<void>;
  refreshChapters: () => Promise<void>;

  // Works (derived from chapters)
  getUserWorks: () => WorkSummary[];
  getAllWorks: () => WorkSummary[];

  // Tags
  allTags: string[];
}

const ChaptersContext = createContext<ChaptersContextType | undefined>(undefined);

interface ChaptersProviderProps {
  children: ReactNode;
}

// Helper to format relative time
const formatRelativeTime = (date: string): string => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return then.toLocaleDateString();
};

export function ChaptersProvider({ children }: ChaptersProviderProps) {
  const { user, profile } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ChapterFilter>({ type: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());

  // Fetch chapters from Supabase
  const fetchChapters = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch chapters with author info
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (chaptersError) throw chaptersError;

      // Fetch tags for all chapters
      const { data: tagsData, error: tagsError } = await supabase
        .from('chapter_tags')
        .select('chapter_id, tag');

      if (tagsError) throw tagsError;

      // Group tags by chapter_id
      const tagsByChapter: Record<string, string[]> = {};
      tagsData?.forEach((t: { chapter_id: string; tag: string }) => {
        if (!tagsByChapter[t.chapter_id]) {
          tagsByChapter[t.chapter_id] = [];
        }
        tagsByChapter[t.chapter_id].push(t.tag);
      });

      // Fetch chapter files for image chapters
      const { data: filesData, error: filesError } = await supabase
        .from('chapter_files')
        .select('chapter_id, file_url, page_number')
        .order('page_number', { ascending: true });

      if (filesError) throw filesError;

      // Group files by chapter_id
      const filesByChapter: Record<string, string[]> = {};
      filesData?.forEach((f: { chapter_id: string; file_url: string }) => {
        if (!filesByChapter[f.chapter_id]) {
          filesByChapter[f.chapter_id] = [];
        }
        filesByChapter[f.chapter_id].push(f.file_url);
      });

      // Transform to app format
      const transformedChapters: Chapter[] = (chaptersData || []).map((ch: any) => ({
        id: ch.id,
        title: ch.title,
        chapterNumber: ch.chapter_number,
        author: ch.profiles?.username || 'Unknown',
        authorId: ch.user_id,
        tags: tagsByChapter[ch.id] || [],
        publishDate: formatRelativeTime(ch.created_at),
        createdAt: ch.created_at,
        status: ch.status as 'new' | 'ongoing' | 'completed',
        views: ch.views || 0,
        likes: ch.likes || 0,
        description: ch.description || '',
        contentType: ch.content_type as Chapter['contentType'],
        contentRating: (ch.content_rating as Chapter['contentRating']) || 'all',
        textContent: ch.text_content,
        images: filesByChapter[ch.id] || [],
        coverImage: ch.cover_url,
        fileUrl: ch.file_url,
        fileType: ch.file_type,
        telegramFileId: ch.telegram_file_id,
        workType: (ch.work_type || 'manga') as Chapter['workType'],
      }));

      setChapters(transformedChapters);

      // Fetch user likes if authenticated
      if (user) {
        const { data: likesData } = await supabase
          .from('chapter_likes')
          .select('chapter_id')
          .eq('user_id', user.id);

        if (likesData) {
          setUserLikes(new Set(likesData.map((l: { chapter_id: string }) => l.chapter_id)));
        }
      }
    } catch (err: any) {
      console.error('Error fetching chapters:', err);
      setError(err.message || 'Failed to load chapters');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  // Realtime: refresh quand un nouveau chapitre est inséré
  useEffect(() => {
    const channel = supabase
      .channel('chapters-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chapters' }, () => {
        fetchChapters();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchChapters]);

  // Get chapters by current user
  const myChapters = chapters.filter(ch => user && ch.authorId === user.id);

  // Get all unique tags
  const allTags = Array.from(new Set(chapters.flatMap(ch => ch.tags)));

  // Filter chapters based on current filters + content rating
  const matureFilter = profile?.matureFilter || 'blur';

  const filteredChapters = chapters.filter(chapter => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      chapter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chapter.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chapter.chapterNumber.toString().includes(searchQuery);

    // Status filter
    const matchesFilter =
      filter.type === 'all' ||
      (filter.type === 'recent' && ['Just now', '1m ago', '5m ago', '10m ago', '30m ago', '1h ago', '2h ago'].some(t => chapter.publishDate.includes(t.split(' ')[0]))) ||
      (filter.type === 'popular' && chapter.views > 100) ||
      (filter.type === 'ongoing' && chapter.status === 'ongoing') ||
      (filter.type === 'completed' && chapter.status === 'completed');

    // Tag filter
    const matchesTag = !selectedTag || chapter.tags.includes(selectedTag);

    // Content rating filter — hide 16+/18+ content when user preference is 'hide'
    const isMature = chapter.contentRating === '16+' || chapter.contentRating === '18+';
    const matchesRating = !isMature || matureFilter !== 'hide';

    return matchesSearch && matchesFilter && matchesTag && matchesRating;
  });

  const getChapterById = useCallback((id: string) => {
    return chapters.find(ch => ch.id === id);
  }, [chapters]);

  // Helper: wrap a promise with a timeout
  const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
      ),
    ]);
  };

  // Publish a new chapter
  const publishChapter = useCallback(async (chapterInput: PublishChapterInput): Promise<{ error?: string }> => {
    if (!user) {
      return { error: 'You must be logged in to publish' };
    }

    try {
      const chapterId = generateChapterId();
      console.log('[publish] start, id:', chapterId, 'type:', chapterInput.contentType, 'hasCover:', !!chapterInput.coverImageFile, 'hasImages:', !!(chapterInput.imageFiles?.length));

      // Upload cover image (with 15s timeout) or reuse existing URL
      let coverUrl: string | undefined = chapterInput.existingCoverUrl || undefined;
      if (chapterInput.coverImageFile) {
        console.log('[publish] uploading cover...');
        try {
          const coverResult = await withTimeout(
            uploadChapterCover(chapterId, chapterInput.coverImageFile),
            15000,
            'Cover upload'
          );
          if (!coverResult.success) {
            return { error: coverResult.error || 'Failed to upload cover image' };
          }
          coverUrl = coverResult.url;
          console.log('[publish] cover done:', coverUrl);
        } catch (coverErr: any) {
          console.error('[publish] cover error:', coverErr);
          return { error: 'Cover upload failed: ' + (coverErr.message || 'Unknown error') };
        }
      }

      // Upload page images (with 30s timeout per batch)
      const imageUrls: string[] = [];
      if (chapterInput.imageFiles && chapterInput.imageFiles.length > 0) {
        console.log('[publish] uploading', chapterInput.imageFiles.length, 'pages...');
        try {
          const pagesResult = await withTimeout(
            uploadChapterPages(chapterId, chapterInput.imageFiles),
            60000,
            'Pages upload'
          );
          const failedUpload = pagesResult.find(r => !r.success);
          if (failedUpload) {
            await deleteChapterFiles(chapterId);
            return { error: failedUpload.error || 'Failed to upload chapter pages' };
          }
          pagesResult.forEach(r => {
            if (r.url) imageUrls.push(r.url);
          });
          console.log('[publish] pages done:', imageUrls.length);
        } catch (pagesErr: any) {
          console.error('[publish] pages error:', pagesErr);
          return { error: 'Pages upload failed: ' + (pagesErr.message || 'Unknown error') };
        }
      }

      // Upload chapter file (PDF/CBZ) with 60s timeout
      let fileUrl: string | undefined = undefined;
      let fileTypeStr: string | undefined = undefined;
      if (chapterInput.chapterFile) {
        console.log('[publish] uploading file:', chapterInput.chapterFile.name);
        try {
          const fileResult = await withTimeout(
            uploadChapterFile(chapterId, chapterInput.chapterFile),
            60000,
            'File upload'
          );
          if (!fileResult.success) {
            return { error: fileResult.error || 'Failed to upload file' };
          }
          fileUrl = fileResult.url;
          const ext = chapterInput.chapterFile.name.split('.').pop()?.toLowerCase();
          fileTypeStr = ext || 'file';
          console.log('[publish] file done:', fileUrl);
        } catch (fileErr: any) {
          console.error('[publish] file error:', fileErr);
          return { error: 'File upload failed: ' + (fileErr.message || 'Unknown error') };
        }
      }

      // Insert chapter into database (with 10s timeout)
      console.log('[publish] inserting into DB...');
      const dbResult = await withTimeout(
        supabase.from('chapters').insert({
          id: chapterId,
          title: chapterInput.title,
          description: chapterInput.description,
          chapter_number: chapterInput.chapterNumber,
          status: chapterInput.status,
          content_type: chapterInput.contentType,
          content_rating: chapterInput.contentRating || 'all',
          work_type: (chapterInput as any).workType || 'manga',
          text_content: chapterInput.textContent,
          cover_url: coverUrl,
          file_url: fileUrl,
          file_type: fileTypeStr,
          user_id: user.id,
        }).then(res => res) as Promise<any>,
        10000,
        'DB insert'
      );

      if (dbResult.error) {
        console.error('[publish] DB error:', dbResult.error);
        await deleteChapterFiles(chapterId);
        throw dbResult.error;
      }
      console.log('[publish] DB insert OK');

      // Insert tags
      if (chapterInput.tags.length > 0) {
        console.log('[publish] inserting tags...');
        const tagsToInsert = chapterInput.tags.map(tag => ({
          chapter_id: chapterId,
          tag: tag.startsWith('#') ? tag : `#${tag}`,
        }));
        await supabase.from('chapter_tags').insert(tagsToInsert);
      }

      // Insert file references
      if (imageUrls.length > 0) {
        console.log('[publish] inserting file refs...');
        const filesToInsert = imageUrls.map((url, index) => ({
          chapter_id: chapterId,
          file_url: url,
          file_type: 'image',
          page_number: index + 1,
        }));
        await supabase.from('chapter_files').insert(filesToInsert);
      }

      // Add to local state
      const newChapter: Chapter = {
        ...chapterInput,
        id: chapterId,
        publishDate: 'Just now',
        createdAt: new Date().toISOString(),
        views: 0,
        likes: 0,
        author: profile?.username || 'you',
        authorId: user.id,
        contentRating: chapterInput.contentRating || 'all',
        coverImage: coverUrl,
        images: imageUrls,
        fileUrl: fileUrl,
        fileType: fileTypeStr,
      };
      setChapters(prev => [newChapter, ...prev]);

      console.log('[publish] SUCCESS');
      return {};
    } catch (err: any) {
      console.error('[publish] ERROR:', err);
      return { error: err.message || 'Failed to publish chapter' };
    }
  }, [user]);

  // Delete a chapter (only within 24h of publishing)
  const deleteChapter = useCallback(async (id: string): Promise<{ error?: string }> => {
    if (!user) {
      return { error: 'You must be logged in to delete' };
    }

    // Check 24h window
    const chapter = chapters.find(ch => ch.id === id);
    if (chapter) {
      const createdTime = new Date(chapter.createdAt).getTime();
      const now = Date.now();
      const hoursSinceCreation = (now - createdTime) / (1000 * 60 * 60);
      if (hoursSinceCreation > 24) {
        return { error: 'Chapters can only be deleted within 24 hours of publishing' };
      }
    }

    try {
      // Delete from database first
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Delete files from Storage (async, don't wait)
      deleteChapterFiles(id).catch(err => {
        console.error('Error deleting chapter files from storage:', err);
      });

      setChapters(prev => prev.filter(ch => ch.id !== id));
      return {};
    } catch (err: any) {
      console.error('Error deleting chapter:', err);
      return { error: err.message || 'Failed to delete chapter' };
    }
  }, [user, chapters]);

  // Update a chapter
  const updateChapter = useCallback(async (id: string, updates: Partial<Chapter>): Promise<{ error?: string }> => {
    if (!user) {
      return { error: 'You must be logged in to update' };
    }

    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.chapterNumber !== undefined) dbUpdates.chapter_number = updates.chapterNumber;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.textContent !== undefined) dbUpdates.text_content = updates.textContent;
      if (updates.coverImage !== undefined) dbUpdates.cover_url = updates.coverImage;
      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('chapters')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update tags if provided
      if (updates.tags) {
        // Delete existing tags
        await supabase.from('chapter_tags').delete().eq('chapter_id', id);

        // Insert new tags
        if (updates.tags.length > 0) {
          const tagsToInsert = updates.tags.map(tag => ({
            chapter_id: id,
            tag: tag.startsWith('#') ? tag : `#${tag}`,
          }));
          await supabase.from('chapter_tags').insert(tagsToInsert);
        }
      }

      setChapters(prev => prev.map(ch =>
        ch.id === id ? { ...ch, ...updates } : ch
      ));
      return {};
    } catch (err: any) {
      console.error('Error updating chapter:', err);
      return { error: err.message || 'Failed to update chapter' };
    }
  }, [user]);

  // Like a chapter
  const likeChapter = useCallback(async (id: string): Promise<{ error?: string }> => {
    if (!user) {
      return { error: 'You must be logged in to like' };
    }

    if (userLikes.has(id)) {
      return { error: 'Already liked' };
    }

    try {
      const { error } = await supabase
        .from('chapter_likes')
        .insert({
          chapter_id: id,
          user_id: user.id,
        });

      if (error) throw error;

      // Update local state
      setUserLikes(prev => new Set([...prev, id]));
      setChapters(prev => prev.map(ch =>
        ch.id === id ? { ...ch, likes: ch.likes + 1 } : ch
      ));

      return {};
    } catch (err: any) {
      console.error('Error liking chapter:', err);
      return { error: err.message || 'Failed to like chapter' };
    }
  }, [user, userLikes]);

  // Unlike a chapter
  const unlikeChapter = useCallback(async (id: string): Promise<{ error?: string }> => {
    if (!user) {
      return { error: 'You must be logged in to unlike' };
    }

    try {
      const { error } = await supabase
        .from('chapter_likes')
        .delete()
        .eq('chapter_id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setUserLikes(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      setChapters(prev => prev.map(ch =>
        ch.id === id ? { ...ch, likes: Math.max(0, ch.likes - 1) } : ch
      ));

      return {};
    } catch (err: any) {
      console.error('Error unliking chapter:', err);
      return { error: err.message || 'Failed to unlike chapter' };
    }
  }, [user]);

  // Check if user has liked a chapter
  const hasUserLiked = useCallback((chapterId: string): boolean => {
    return userLikes.has(chapterId);
  }, [userLikes]);

  // Increment views
  const incrementViews = useCallback(async (id: string): Promise<void> => {
    try {
      // Use RPC or direct update
      await supabase.rpc('increment_chapter_views', { chapter_id: id });
    } catch {
      // Fallback to direct update if RPC doesn't exist
      const chapter = chapters.find(ch => ch.id === id);
      if (chapter) {
        await supabase
          .from('chapters')
          .update({ views: chapter.views + 1 })
          .eq('id', id);
      }
    }

    // Update local state
    setChapters(prev => prev.map(ch =>
      ch.id === id ? { ...ch, views: ch.views + 1 } : ch
    ));
  }, [chapters]);

  // Refresh chapters
  const refreshChapters = useCallback(async (): Promise<void> => {
    await fetchChapters();
  }, [fetchChapters]);

  // Derive unique works from user's chapters
  const getUserWorks = useCallback((): WorkSummary[] => {
    const worksMap = new Map<string, Chapter[]>();

    myChapters.forEach(ch => {
      const key = ch.title.toLowerCase().trim();
      if (!worksMap.has(key)) {
        worksMap.set(key, []);
      }
      worksMap.get(key)!.push(ch);
    });

    const works: WorkSummary[] = [];
    worksMap.forEach((chaps) => {
      const sorted = [...chaps].sort((a, b) => b.chapterNumber - a.chapterNumber);
      const latest = sorted[0];
      const coverChapter = sorted.find(ch => ch.coverImage);
      const allTags = Array.from(new Set(chaps.flatMap(ch => ch.tags)));

      works.push({
        workTitle: latest.title,
        authorId: latest.authorId,
        author: latest.author,
        description: latest.description,
        tags: allTags,
        coverImage: coverChapter?.coverImage,
        latestChapterNumber: Math.max(...chaps.map(ch => ch.chapterNumber)),
        chapterCount: chaps.length,
        status: latest.status,
        workType: latest.workType || 'manga',
      });
    });

    return works;
  }, [myChapters]);

  // Derive unique works from ALL chapters on the platform (cross-user)
  const getAllWorks = useCallback((): WorkSummary[] => {
    const worksMap = new Map<string, Chapter[]>();

    chapters.forEach(ch => {
      const key = ch.title.toLowerCase().trim();
      if (!worksMap.has(key)) {
        worksMap.set(key, []);
      }
      worksMap.get(key)!.push(ch);
    });

    const works: WorkSummary[] = [];
    worksMap.forEach((chaps) => {
      const sorted = [...chaps].sort((a, b) => b.chapterNumber - a.chapterNumber);
      const latest = sorted[0];
      const coverChapter = sorted.find(ch => ch.coverImage);
      const allWorkTags = Array.from(new Set(chaps.flatMap(ch => ch.tags)));

      works.push({
        workTitle: latest.title,
        authorId: latest.authorId,
        author: latest.author,
        description: latest.description,
        tags: allWorkTags,
        coverImage: coverChapter?.coverImage,
        latestChapterNumber: Math.max(...chaps.map(ch => ch.chapterNumber)),
        chapterCount: chaps.length,
        status: latest.status,
        workType: latest.workType || 'manga',
      });
    });

    return works;
  }, [chapters]);

  // Batch publish: upload multiple chapters sequentially
  const publishBatch = useCallback(async (
    files: { file: File; chapterNumber: number }[],
    meta: { workTitle: string; description: string; tags: string[]; status: string; coverImageFile?: File; existingCoverUrl?: string; contentType: string; contentRating?: string; workType?: string },
    onProgress?: (progress: BatchPublishProgress) => void
  ): Promise<{ error?: string }> => {
    if (!user) return { error: 'You must be logged in to publish' };
    if (files.length === 0) return { error: 'No files to upload' };
    if (files.length > 20) return { error: 'Maximum 20 chapters per batch' };

    for (let i = 0; i < files.length; i++) {
      const { file, chapterNumber } = files[i];

      onProgress?.({
        totalChapters: files.length,
        completedChapters: i,
        currentChapterNumber: chapterNumber,
        status: 'uploading',
      });

      const ext = file.name.split('.').pop()?.toLowerCase();
      const actualContentType = ext === 'pdf' ? 'pdf' : ext === 'cbz' ? 'cbz' : 'file';

      const result = await publishChapter({
        title: meta.workTitle,
        chapterNumber,
        tags: meta.tags,
        status: meta.status as any,
        description: meta.description,
        contentType: actualContentType as any,
        contentRating: (meta.contentRating as any) || 'all',
        workType: (meta.workType as any) || 'manga',
        chapterFile: file,
        fileName: file.name,
        fileType: file.type,
        // Cover only on first chapter, reuse URL for rest
        coverImageFile: i === 0 ? meta.coverImageFile : undefined,
        existingCoverUrl: i === 0 ? meta.existingCoverUrl : undefined,
      });

      if (result.error) {
        onProgress?.({
          totalChapters: files.length,
          completedChapters: i,
          currentChapterNumber: chapterNumber,
          status: 'error',
          error: result.error,
        });
        return { error: `Failed at chapter ${chapterNumber}: ${result.error}` };
      }
    }

    onProgress?.({
      totalChapters: files.length,
      completedChapters: files.length,
      currentChapterNumber: files[files.length - 1].chapterNumber,
      status: 'success',
    });

    return {};
  }, [user, publishChapter]);

  const value: ChaptersContextType = {
    chapters,
    myChapters,
    isLoading,
    error,
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
    publishBatch,
    deleteChapter,
    updateChapter,
    likeChapter,
    unlikeChapter,
    hasUserLiked,
    incrementViews,
    refreshChapters,
    getUserWorks,
    getAllWorks,
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
