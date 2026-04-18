export interface MangaTitle {
  id: string;
  title: string;
  coverImage: string;
  rating: number;
  chapters: number;
  status: 'ongoing' | 'completed';
  genre: string[];
  icon: string;
  author?: string;
  authorId?: string;
  description?: string;
}

export type QuizCategory = 'Anime' | 'Manga' | 'Série' | 'Movie' | 'Musique' | 'Opening' | 'Ending' | 'Culture' | 'Autre';

export const QUIZ_CATEGORIES: { value: QuizCategory; emoji: string }[] = [
  { value: 'Anime', emoji: '🎬' },
  { value: 'Manga', emoji: '📖' },
  { value: 'Série', emoji: '📺' },
  { value: 'Movie', emoji: '🎥' },
  { value: 'Musique', emoji: '🎵' },
  { value: 'Opening', emoji: '🎶' },
  { value: 'Ending', emoji: '🎧' },
  { value: 'Culture', emoji: '🧠' },
  { value: 'Autre', emoji: '🎯' },
];

export const TIMER_OPTIONS = [
  { value: 10, label: '10s' },
  { value: 15, label: '15s' },
  { value: 20, label: '20s' },
  { value: 30, label: '30s' },
];

export interface Quiz {
  id: string;
  title: string;
  author: string; // display username
  authorId?: string; // UUID from profiles
  questionsCount: number;
  category: QuizCategory;
  categoryEmoji: string;
  playersCount: number;
  maxPlayers?: number;
  rating: number;
  coverImage?: string;
  timerSeconds: number; // per-question timer (10, 15, 20, 30)
  duration: number; // quiz duration in hours
  createdAt: Date;
  endedAt?: Date;
  status: 'active' | 'ended';
  questions?: QuizQuestion[]; // attached questions for play
}

export interface QuizQuestion {
  id: string;
  question: string;
  imageUrl?: string; // optional image/GIF per question
  answers: {
    id: string;
    text: string;
    isCorrect: boolean;
  }[];
}

export interface Group {
  id: string;
  name: string;
  icon: string;
  membersCount: number;
  onlineCount: number;
  description: string;
  coverImage?: string;
  isPublic: boolean;
}

export interface GroupChannel {
  id: string;
  name: string;
  unreadCount: number;
}

export interface GroupMessage {
  id: string;
  author: string;
  authorColor: string;
  content: string;
  timestamp: string;
  avatar: string;
}

export interface Conversation {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isOnline: boolean;
  };
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
}

export interface PrivateMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

export interface Post {
  id: string;
  user: {
    id: string;
    username: string;
    handle: string;
    avatar: string;
  };
  content: string;
  timestamp: Date;
  images?: string[];
  likes: number;
  comments: number;
  reposts: number;
  isLiked?: boolean;
  type: 'text' | 'image' | 'chapter' | 'quiz' | 'poll' | 'game';
  embed?: {
    type: 'chapter' | 'quiz' | 'game';
    title: string;
    subtitle: string;
    icon: string;
  };
  poll?: {
    question: string;
    options: { id: string; text: string; votes: number }[];
    totalVotes: number;
  };
}