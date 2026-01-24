// ============================================
// SHARED TYPES FOR COMMENT LIVE PLATFORM
// ============================================

// -------------------- USER TYPES --------------------

export interface User {
  id: string;
  username: string;
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

// -------------------- MESSAGE TYPES --------------------

export interface Message {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
  replyTo?: {
    username: string;
    text: string;
  };
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

export interface Chapter {
  id: string;
  title: string;
  chapterNumber: number;
  author: string;
  authorId: string;
  tags: string[];
  publishDate: string;
  status: ChapterStatus;
  views: number;
  likes: number;
  description: string;
  contentType: ChapterContentType;
  textContent?: string;
  images?: string[];
  coverImage?: string;
  fileData?: string;
  fileName?: string;
  fileType?: string;
}

export type ChapterStatus = 'new' | 'ongoing' | 'completed';
export type ChapterContentType = 'text' | 'images' | 'file';

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
  | 'my-chapters';

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

export type PublishChapterInput = Omit<Chapter, 'id' | 'publishDate' | 'views' | 'likes' | 'author' | 'authorId'>;
