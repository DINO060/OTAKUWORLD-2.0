export interface Quiz {
  id: string;
  title: string;
  author: string;
  questionsCount: number;
  category: string;
  categoryEmoji: string;
  playersCount: number;
  rating: number;
  coverImage?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
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