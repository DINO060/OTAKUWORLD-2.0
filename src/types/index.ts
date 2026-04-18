// ============================================
// SHARED TYPES FOR COMMENT LIVE PLATFORM
// ============================================

// -------------------- USER TYPES --------------------

export interface User {
  id: string;
  username: string;       // display name
  handle?: string;        // unique @handle
  displayName?: string;
  avatarColor: string;
  avatarImage?: string;
  coverImage?: string;
  bio?: string;
  pronouns?: string;
  isCurrentUser: boolean;
  isActive?: boolean;
  lastSeen?: string;
  socialLinks?: SocialLinks;
  badge?: UserBadge;
  createdAt?: string;
  allowDms?: boolean;
  isAdmin?: boolean;
  matureFilter?: 'show' | 'blur' | 'hide';
}

export interface SocialLinks {
  tiktok?: string;
  instagram?: string;
  telegram?: string;
  twitter?: string;
}

export interface UserBadge {
  name: string;
  icon: string;
  color: string;
}

// -------------------- GIF TYPES --------------------

/**
 * Serialised payload stored as the `text` field of a `contentType === 'gif'` message.
 * Stored as JSON.stringify(GifPayload) so both mp4 and gif URLs are preserved.
 */
export interface GifPayload {
  /** MP4 URL — preferred for GIF playback. Empty for stickers (no alpha support). */
  mp4: string;
  /** GIF/WebP URL — gif fallback for GIFs; animated WebP for stickers (transparent bg). */
  gif: string;
  /** Human-readable title used as alt text */
  title: string;
  /** Distinguishes GIPHY stickers from regular GIFs. Defaults to 'gif'. */
  mediaKind?: 'gif' | 'sticker';
}

// -------------------- MESSAGE TYPES --------------------

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[]; // user IDs who reacted
  hasReacted: boolean; // whether current user has reacted
}

export type MessageContentType = 'text' | 'gif' | 'sticker';

export interface Message {
  id: string;
  userId: string;
  text: string;
  contentType: MessageContentType;
  timestamp: string;
  replyTo?: {
    username: string;
    text: string;
  };
  reactions?: MessageReaction[];
}

export interface PrivateMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  isOutgoing: boolean;
  isRead?: boolean;
}

export interface Conversation {
  id: string;
  recipientId: string;
  recipientUsername: string;
  recipientAvatarColor: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isActive: boolean;
}

// -------------------- CHAPTER TYPES --------------------

export type ContentRating = 'all' | '16+' | '18+';

export interface Chapter {
  id: string;
  title: string;
  chapterNumber: number;
  author: string;
  authorId: string;
  tags: string[];
  publishDate: string;
  createdAt: string;      // ISO timestamp for 24h delete window
  status: ChapterStatus;
  views: number;
  likes: number;
  description: string;
  contentType: ChapterContentType;
  contentRating: ContentRating; // 'all' | '16+' | '18+'
  textContent?: string;
  images?: string[];
  coverImage?: string;
  fileUrl?: string;       // Remote file URL (R2 for bot, Storage for site)
  fileData?: string;      // Base64 data URL (legacy, site uploads)
  fileName?: string;
  fileType?: string;      // 'pdf' | 'cbz' etc.
  telegramFileId?: string; // Present when file lives on Telegram (bot uploads)
}

export type ChapterStatus = 'new' | 'ongoing' | 'completed';
export type ChapterContentType = 'text' | 'images' | 'file' | 'pdf' | 'cbz';

export interface ChapterFilter {
  type: 'all' | 'recent' | 'popular' | 'ongoing' | 'completed';
  tag?: string;
  searchQuery?: string;
}

// -------------------- PAGE/NAVIGATION TYPES --------------------

export type AppPage =
  | 'feed'
  | 'inbox'
  | 'private-chat'
  | 'chapters-browse'
  | 'chapters-platform'
  | 'chapter-reader'
  | 'publish-chapter'
  | 'my-chapters'
  | 'settings'
  | 'otaku'
  | 'loup-garou';

// -------------------- HASHTAG TYPES --------------------

export interface Hashtag {
  tag: string;
  count: number;
}

// -------------------- AUTH TYPES (for Supabase) --------------------

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isAuthenticated: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
}

// -------------------- API RESPONSE TYPES --------------------

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

// -------------------- UTILITY TYPES --------------------

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type PublishChapterInput = Omit<Chapter, 'id' | 'publishDate' | 'views' | 'likes' | 'author' | 'authorId'> & {
  // File objects for uploading to Storage
  coverImageFile?: File;
  imageFiles?: File[];
  chapterFile?: File;       // PDF/CBZ file for upload
  existingCoverUrl?: string; // Reuse cover from existing work (no re-upload)
};

// -------------------- WORK TYPES (derived, not stored in DB) --------------------

export interface WorkSummary {
  workTitle: string;
  authorId: string;
  author: string;
  description: string;
  tags: string[];
  coverImage?: string;
  latestChapterNumber: number;
  chapterCount: number;
  status: ChapterStatus;
}

export interface BatchPublishProgress {
  totalChapters: number;
  completedChapters: number;
  currentChapterNumber: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}
