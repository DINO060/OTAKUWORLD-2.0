import { supabase } from './supabase';

// ============================================
// SUPABASE STORAGE SERVICE
// Bucket: chapters
// Structure: chapters/{chapterId}/cover.{ext}
//            chapters/{chapterId}/pages/{pageNumber}.{ext}
// ============================================

const BUCKET_NAME = 'chapters';

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Get file extension from a File object or filename
 */
function getFileExtension(file: File | string): string {
  const name = typeof file === 'string' ? file : file.name;
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : 'jpg';
}

/**
 * Generate a unique chapter ID (used before inserting to DB)
 */
export function generateChapterId(): string {
  return crypto.randomUUID();
}

/**
 * Upload chapter cover image
 * @param chapterId - Unique chapter identifier
 * @param file - Cover image file
 * @returns Upload result with public URL
 */
export async function uploadChapterCover(
  chapterId: string,
  file: File
): Promise<UploadResult> {
  try {
    const ext = getFileExtension(file);
    const path = `${chapterId}/cover.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true, // Replace if exists
      });

    if (error) {
      console.error('Cover upload error:', error);
      return { success: false, error: error.message };
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    return {
      success: true,
      url: urlData.publicUrl,
      path,
    };
  } catch (err) {
    console.error('Cover upload exception:', err);
    return { success: false, error: 'Failed to upload cover' };
  }
}

/**
 * Upload a single chapter page
 * @param chapterId - Unique chapter identifier
 * @param file - Page image file
 * @param pageNumber - Page number (1-indexed)
 * @returns Upload result with public URL
 */
export async function uploadChapterPage(
  chapterId: string,
  file: File,
  pageNumber: number
): Promise<UploadResult> {
  try {
    const ext = getFileExtension(file);
    // Pad page number for proper sorting (001, 002, etc.)
    const paddedNumber = String(pageNumber).padStart(3, '0');
    const path = `${chapterId}/pages/${paddedNumber}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error(`Page ${pageNumber} upload error:`, error);
      return { success: false, error: error.message };
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    return {
      success: true,
      url: urlData.publicUrl,
      path,
    };
  } catch (err) {
    console.error(`Page ${pageNumber} upload exception:`, err);
    return { success: false, error: `Failed to upload page ${pageNumber}` };
  }
}

/**
 * Upload multiple chapter pages in sequence
 * @param chapterId - Unique chapter identifier
 * @param files - Array of page image files (in order)
 * @param onProgress - Optional callback for progress updates
 * @returns Array of upload results
 */
export async function uploadChapterPages(
  chapterId: string,
  files: File[],
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await uploadChapterPage(chapterId, files[i], i + 1);
    results.push(result);

    if (onProgress) {
      onProgress({
        loaded: i + 1,
        total: files.length,
        percentage: Math.round(((i + 1) / files.length) * 100),
      });
    }

    // Stop if upload failed
    if (!result.success) {
      console.error(`Upload stopped at page ${i + 1}`);
      break;
    }
  }

  return results;
}

/**
 * Delete all files for a chapter (cover + pages)
 * @param chapterId - Unique chapter identifier
 * @returns Success status
 */
export async function deleteChapterFiles(chapterId: string): Promise<boolean> {
  try {
    // List all files in the chapter folder
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(chapterId, { limit: 1000 });

    if (listError) {
      console.error('List files error:', listError);
      return false;
    }

    if (!files || files.length === 0) {
      return true; // No files to delete
    }

    // Get all file paths (including nested pages folder)
    const filePaths: string[] = [];

    for (const file of files) {
      if (file.name === 'pages') {
        // List files in pages subfolder
        const { data: pageFiles } = await supabase.storage
          .from(BUCKET_NAME)
          .list(`${chapterId}/pages`, { limit: 1000 });

        if (pageFiles) {
          pageFiles.forEach(pf => {
            filePaths.push(`${chapterId}/pages/${pf.name}`);
          });
        }
      } else {
        filePaths.push(`${chapterId}/${file.name}`);
      }
    }

    if (filePaths.length === 0) {
      return true;
    }

    // Delete all files
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filePaths);

    if (deleteError) {
      console.error('Delete files error:', deleteError);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Delete chapter files exception:', err);
    return false;
  }
}

/**
 * Upload a chapter file (PDF, CBZ, etc.)
 * @param chapterId - Unique chapter identifier
 * @param file - The file to upload
 * @returns Upload result with public URL
 */
export async function uploadChapterFile(
  chapterId: string,
  file: File
): Promise<UploadResult> {
  try {
    const ext = getFileExtension(file);
    const path = `${chapterId}/file.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('File upload error:', error);
      return { success: false, error: error.message };
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    return {
      success: true,
      url: urlData.publicUrl,
      path,
    };
  } catch (err) {
    console.error('File upload exception:', err);
    return { success: false, error: 'Failed to upload file' };
  }
}

/**
 * Get public URL for a file in storage
 * @param path - File path in the bucket
 * @returns Public URL
 */
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Get all page URLs for a chapter
 * @param chapterId - Unique chapter identifier
 * @returns Array of page URLs in order
 */
export async function getChapterPageUrls(chapterId: string): Promise<string[]> {
  try {
    const { data: files, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(`${chapterId}/pages`, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error || !files) {
      console.error('Get page URLs error:', error);
      return [];
    }

    return files.map(file =>
      getPublicUrl(`${chapterId}/pages/${file.name}`)
    );
  } catch (err) {
    console.error('Get page URLs exception:', err);
    return [];
  }
}

/**
 * Check if a chapter has uploaded files
 * @param chapterId - Unique chapter identifier
 * @returns Boolean indicating if files exist
 */
export async function chapterHasFiles(chapterId: string): Promise<boolean> {
  try {
    const { data: files, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(chapterId, { limit: 1 });

    if (error) {
      return false;
    }

    return files && files.length > 0;
  } catch {
    return false;
  }
}
