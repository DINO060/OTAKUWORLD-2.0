import React, { useState } from 'react';
import { MessageCircle, Menu, Smile, Hash, Send, User, MessageSquare, Settings, X, Search, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PrivateChat from './components/PrivateChat';
import ProfileCard from './components/ProfileCard';
import Inbox from './components/Inbox';
import ChaptersHome from './components/ChaptersHome';
import ChapterReader from './components/ChapterReader';
import PublishChapter from './components/PublishChapter';
import MyChapters from './components/MyChapters';
import ChaptersBrowsePanel from './components/ChaptersBrowsePanel';
import { useChat } from './contexts/ChatContext';

// Mock Data Types
interface User {
  id: string;
  username: string;
  avatarColor: string;
  isCurrentUser: boolean;
}

interface Message {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
  replyTo?: {
    username: string;
    text: string;
  };
}

export interface Chapter {
  id: string;
  title: string;
  chapterNumber: number;
  author: string;
  authorId: string;
  tags: string[];
  publishDate: string;
  status: 'new' | 'ongoing' | 'completed';
  views: number;
  likes: number;
  description: string;
  contentType: 'text' | 'images';
  textContent?: string;
  images?: string[];
  coverImage?: string;
}

// Mock Users
const mockUsers: User[] = [
  { id: '1', username: 'you', avatarColor: '#3b82f6', isCurrentUser: true },
  { id: '2', username: 'sakura_dev', avatarColor: '#ec4899', isCurrentUser: false },
  { id: '3', username: 'TechGuru', avatarColor: '#10b981', isCurrentUser: false },
  { id: '4', username: 'MangaFan22', avatarColor: '#f59e0b', isCurrentUser: false },
];

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

// Mock Messages
const initialMockMessages: Message[] = [
  {
    id: '1',
    userId: '2',
    text: 'Hey everyone! Just joined #livecom 🎉',
    timestamp: '17:05',
  },
  {
    id: '2',
    userId: '3',
    text: 'Welcome! This platform is amazing for real-time discussions #tech',
    timestamp: '17:06',
  },
  {
    id: '3',
    userId: '1',
    text: 'Thanks for having me here! Excited to chat 😊',
    timestamp: '17:07',
  },
  {
    id: '4',
    userId: '4',
    text: 'Anyone reading the new chapter? #manga #anime',
    timestamp: '17:08',
  },
  {
    id: '5',
    userId: '1',
    text: 'Yes! It was incredible 🔥',
    timestamp: '17:08',
    replyTo: {
      username: 'MangaFan22',
      text: 'Anyone reading the new chapter? #manga #anime',
    },
  },
  {
    id: '6',
    userId: '2',
    text: 'The live feed feature is so smooth #tech #livecom',
    timestamp: '17:09',
  },
  {
    id: '7',
    userId: '3',
    text: 'Agreed! The UX is top-notch 👌',
    timestamp: '17:10',
    replyTo: {
      username: 'sakura_dev',
      text: 'The live feed feature is so smooth #tech #livecom',
    },
  },
  {
    id: '8',
    userId: '4',
    text: 'Can\'t wait for the next update! #livecom',
    timestamp: '17:11',
  },
];

export default function App() {
  // Use ChatContext for messages (connected to Supabase)
  const {
    messages,
    filteredMessages: contextFilteredMessages,
    sendMessage,
    selectedHashtag,
    setSelectedHashtag,
    getUserById: getChatUserById,
    currentUser,
    isLoading: messagesLoading,
    activeUsers,
    getHashtags
  } = useChat();

  const [currentPage, setCurrentPage] = useState<'feed' | 'inbox' | 'private-chat' | 'chapters-browse' | 'chapters-platform' | 'chapter-reader' | 'publish-chapter' | 'my-chapters'>('chapters-browse');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedUserProfile, setSelectedUserProfile] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isHashtagPanelOpen, setIsHashtagPanelOpen] = useState(false);
  const [hashtagSearchQuery, setHashtagSearchQuery] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isProfileCardOpen, setIsProfileCardOpen] = useState(false);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [chapterSearchQuery, setChapterSearchQuery] = useState('');
  const [chapterFilter, setChapterFilter] = useState<'all' | 'recent' | 'popular' | 'ongoing' | 'completed'>('all');
  const [selectedChapterTag, setSelectedChapterTag] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);

  const handlePublishChapter = (newChapter: Omit<Chapter, 'id' | 'publishDate' | 'views' | 'likes' | 'author' | 'authorId'>) => {
    const chapter: Chapter = {
      ...newChapter,
      id: Date.now().toString(),
      publishDate: 'Just now',
      views: 0,
      likes: 0,
      author: 'you',
      authorId: '1',
    };
    setChapters([chapter, ...chapters]);
  };

  // Get user - first try context, then fallback to mock
  const getUserById = (userId: string) => {
    const chatUser = getChatUserById(userId);
    if (chatUser) return chatUser;
    return mockUsers.find(u => u.id === userId);
  };

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    if (inputText.trim() === '') return;

    await sendMessage(inputText);
    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const highlightHashtags = (text: string) => {
    const parts = text.split(/(#\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        const isActive = selectedHashtag === part;
        return (
          <motion.span
            key={index}
            onClick={() => setSelectedHashtag(isActive ? null : part)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold cursor-pointer transition-all ${
              isActive 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            {part}
          </motion.span>
        );
      }
      return part;
    });
  };

  // Use filtered messages from context
  const filteredMessages = contextFilteredMessages;

  // Extract all unique hashtags from messages
  const getAllHashtags = (): string[] => {
    const hashtagSet = new Set<string>();
    messages.forEach(msg => {
      const hashtags = msg.text.match(/#\w+/g);
      if (hashtags) {
        hashtags.forEach(tag => hashtagSet.add(tag));
      }
    });
    return Array.from(hashtagSet);
  };

  // Get hashtags sorted by popularity (most used first)
  const getPopularHashtags = (): { tag: string; count: number }[] => {
    const hashtagCounts: { [key: string]: number } = {};
    messages.forEach(msg => {
      const hashtags = msg.text.match(/#\w+/g);
      if (hashtags) {
        hashtags.forEach(tag => {
          hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
        });
      }
    });
    return Object.entries(hashtagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Get unique users from messages
  const getActiveUsers = (): User[] => {
    const userIds = new Set(messages.map(msg => msg.userId));
    return mockUsers.filter(user => userIds.has(user.id));
  };

  // Detect search mode based on input
  const isHashtagSearch = hashtagSearchQuery.trim().startsWith('#');
  const isUserSearch = hashtagSearchQuery.trim().length > 0 && !isHashtagSearch;

  // Filter hashtags based on search query
  const getFilteredHashtags = (): { tag: string; count: number }[] => {
    const popular = getPopularHashtags();
    if (!isHashtagSearch) return popular.slice(0, 5); // Show top 5 when no query
    
    const query = hashtagSearchQuery.toLowerCase().replace(/^#/, '');
    return popular.filter(({ tag }) => 
      tag.toLowerCase().includes(query)
    );
  };

  // Filter users based on search query
  const getFilteredUsers = (): User[] => {
    if (!isUserSearch) return [];
    
    const query = hashtagSearchQuery.toLowerCase();
    return getActiveUsers().filter(user =>
      user.username.toLowerCase().includes(query)
    );
  };

  // Handle hashtag selection from panel
  const handleHashtagSelect = (hashtag: string) => {
    setSelectedHashtag(hashtag);
    setSelectedUserFilter(null);
    setHashtagSearchQuery('');
    setIsHashtagPanelOpen(false);
    setShowSuggestions(false);
  };

  // Handle user selection
  const handleUserSelect = (userId: string) => {
    setSelectedUserFilter(userId);
    setSelectedHashtag(null);
    setHashtagSearchQuery('');
    setIsHashtagPanelOpen(false);
    setShowSuggestions(false);
  };

  // Handle search input change with live filtering
  const handleSearchChange = (value: string) => {
    setHashtagSearchQuery(value);
    setShowSuggestions(value.trim().length > 0);
    
    // If user types a complete hashtag that exists, filter immediately
    if (value.startsWith('#')) {
      const normalizedValue = value;
      const allHashtags = getAllHashtags();
      
      if (allHashtags.includes(normalizedValue)) {
        setSelectedHashtag(normalizedValue);
        setSelectedUserFilter(null);
      }
    }
  };

  // Switch between pages
  if (currentPage === 'inbox') {
    return (
      <Inbox
        onBack={() => setCurrentPage('feed')}
        onSelectConversation={(userId) => {
          setSelectedChatUserId(userId);
          setCurrentPage('private-chat');
        }}
      />
    );
  }

  if (currentPage === 'private-chat') {
    return (
      <PrivateChat
        onBack={() => setCurrentPage('inbox')}
        isLoggedIn={true}
        selectedUserId={selectedChatUserId || '2'}
      />
    );
  }

  if (currentPage === 'chapter-reader') {
    return (
      <ChapterReader
        chapterId={selectedChapterId || '1'}
        onBack={() => setCurrentPage('chapters-browse')}
        onChapterList={() => setCurrentPage('chapters-browse')}
        chapters={chapters}
        onSelectChapter={(chapterId) => setSelectedChapterId(chapterId)}
      />
    );
  }

  if (currentPage === 'publish-chapter') {
    return (
      <PublishChapter
        onBack={() => setCurrentPage('chapters-browse')}
        onPublishComplete={() => setCurrentPage('chapters-browse')}
        onPublish={handlePublishChapter}
      />
    );
  }

  if (currentPage === 'my-chapters') {
    return (
      <MyChapters
        onBack={() => setCurrentPage('chapters-browse')}
        onEditChapter={(chapterId) => {
          setSelectedChapterId(chapterId);
          setCurrentPage('publish-chapter');
        }}
        chapters={chapters.filter(ch => ch.authorId === '1')}
      />
    );
  }

  if (currentPage === 'chapters-browse') {
    return (
      <ChaptersBrowsePanel
        isOpen={true}
        onClose={() => setCurrentPage('feed')}
        searchQuery={chapterSearchQuery}
        onSearchChange={setChapterSearchQuery}
        filter={chapterFilter}
        onFilterChange={setChapterFilter}
        selectedTag={selectedChapterTag}
        onTagSelect={setSelectedChapterTag}
        onChapterClick={(chapterId) => {
          setSelectedChapterId(chapterId);
          setCurrentPage('chapter-reader');
        }}
        onPublishClick={() => setCurrentPage('publish-chapter')}
        onMyChaptersClick={() => setCurrentPage('my-chapters')}
        onPlatformClick={() => setCurrentPage('chapters-platform')}
        chapters={chapters}
      />
    );
  }

  if (currentPage === 'chapters-platform') {
    return (
      <ChaptersHome
        onBack={() => setCurrentPage('chapters-browse')}
        onReadChapter={(chapterId) => {
          setSelectedChapterId(chapterId);
          setCurrentPage('chapter-reader');
        }}
        onPublishNew={() => setCurrentPage('publish-chapter')}
        onMyChapters={() => setCurrentPage('my-chapters')}
        currentUserId="1"
        chapters={chapters}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0f0f0f]">
      {/* Unified Header Section */}
      <header className="fixed top-0 left-0 right-0 z-50 relative overflow-hidden">
        {/* Premium Gradient Background with Radial Light Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e40af] via-[#2563eb] to-[#3b82f6]">
          {/* Radial glow effects */}
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-400/30 rounded-full blur-3xl"></div>
          <div className="absolute -top-10 right-1/4 w-48 h-48 bg-indigo-300/20 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-1/2 w-56 h-56 bg-cyan-400/20 rounded-full blur-3xl"></div>
        </div>

        {/* Subtle Ad Text (Background Layer) */}
        <div className="absolute top-3 left-0 right-0 text-center">
          <p className="text-white/30 text-xs font-light tracking-wide">
            Ad space — Your discreet ad could be here
          </p>
        </div>

        {/* Header Content (Foreground) */}
        <div className="relative h-20 sm:h-24 flex items-center justify-between px-4 sm:px-6 pt-6">
          {/* Logo/Title with Live Indicator */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
              </div>
              {/* Live Pulse Indicator */}
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [1, 0.5, 1],
                }}
                transition={{
                  duration: 2,
                  ease: "easeInOut",
                  repeat: Infinity,
                }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg"
              />
            </div>
            <div>
              <h1 className="text-white text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                Comment Live
                <span className="hidden sm:inline-flex items-center gap-1.5 bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-1.5 h-1.5 bg-white rounded-full"
                  />
                  Live
                </span>
              </h1>
              {/* Active Users Count */}
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white/70 text-[10px] sm:text-xs font-medium"
              >
                {activeUsers} people active now
              </motion.p>
            </div>
          </div>

          {/* Push-Out Horizontal Menu */}
          <div className="relative flex items-center gap-2 overflow-visible">
            {/* Menu Button - Fixed Position (Leftmost) */}
            <motion.button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2.5 sm:p-3 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors relative z-20"
            >
              <motion.div
                animate={{ rotate: isMenuOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </motion.div>
            </motion.button>

            {/* Icons Container - Slides Out to the Right */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{
                    type: 'spring',
                    damping: 25,
                    stiffness: 300,
                  }}
                  className="flex items-center gap-2 overflow-hidden"
                >
                  {/* Profile Icon */}
                  <motion.button
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      damping: 25,
                      stiffness: 300,
                      delay: 0,
                    }}
                    onClick={() => {
                      setIsProfileCardOpen(true);
                      setIsMenuOpen(false);
                    }}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
                  >
                    <User className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </motion.button>

                  {/* Chat Icon - Navigate to Inbox */}
                  <motion.button
                    onClick={() => setCurrentPage('inbox')}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      damping: 25,
                      stiffness: 300,
                      delay: 0.05,
                    }}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
                  >
                    <MessageSquare className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </motion.button>

                  {/* Chapters Icon - Navigate to Browse Chapters */}
                  <motion.button
                    onClick={() => {
                      setCurrentPage('chapters-browse');
                      setIsMenuOpen(false);
                    }}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      damping: 25,
                      stiffness: 300,
                      delay: 0.075,
                    }}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
                  >
                    <BookOpen className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </motion.button>

                  {/* Settings Icon */}
                  <motion.button
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      damping: 25,
                      stiffness: 300,
                      delay: 0.1,
                    }}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
                  >
                    <Settings className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Invisible overlay to close menu when clicking outside */}
      {isMenuOpen && (
        <div
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 z-30"
        />
      )}

      {/* Main Content Area - Messages Feed */}
      <main className="flex-1 mt-20 sm:mt-24 mb-[70px] p-4 overflow-y-auto">
        {/* Active Filter Badge - Enhanced */}
        <AnimatePresence>
          {selectedHashtag && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 flex justify-center"
            >
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-full px-5 py-2.5 flex items-center gap-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-white" strokeWidth={2.5} />
                  <span className="text-white text-sm font-semibold">
                    {selectedHashtag}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <motion.button
                    onClick={() => {
                      setSelectedHashtag(null);
                      setIsHashtagPanelOpen(true);
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="text-white/80 hover:text-white text-xs font-medium px-2 py-1 rounded-md hover:bg-white/10 transition-all"
                  >
                    Change
                  </motion.button>
                  <div className="w-px h-4 bg-white/30"></div>
                  <motion.button
                    onClick={() => setSelectedHashtag(null)}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-all"
                  >
                    <X className="w-4 h-4" strokeWidth={2.5} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="max-w-3xl mx-auto space-y-4">
          {filteredMessages.map((message) => {
            const user = getUserById(message.userId);
            if (!user) return null;

            const isCurrentUser = user.isCurrentUser;

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  onClick={() => setSelectedUserProfile(user.id)}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-semibold flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-blue-400 transition-all"
                  style={{ backgroundColor: user.avatarColor }}
                >
                  {getInitials(user.username)}
                </div>

                {/* Message Bubble */}
                <div className={`flex-1 max-w-[75%] sm:max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col`}>
                  {/* Username */}
                  <span className={`text-xs text-gray-400 mb-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                    {user.username}
                  </span>

                  {/* Reply Preview */}
                  {message.replyTo && (
                    <div className={`mb-2 text-xs p-2 rounded-lg bg-[#1a1a1a] border-l-2 ${
                      isCurrentUser ? 'border-blue-400' : 'border-gray-600'
                    }`}>
                      <div className="font-semibold text-gray-300">@{message.replyTo.username}</div>
                      <div className="text-gray-500 truncate">{message.replyTo.text}</div>
                    </div>
                  )}

                  {/* Message Content */}
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      isCurrentUser
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-[#1e1e1e] text-gray-100 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">
                      {highlightHashtags(message.text)}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <span className="text-xs text-gray-400 mt-1">
                    {message.timestamp}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Empty state when filtered */}
        {filteredMessages.length === 0 && (
          <div className="text-center mt-12">
            <p className="text-gray-300 text-lg font-semibold mb-2">No messages found</p>
            <p className="text-gray-500 text-sm">Try a different hashtag filter</p>
          </div>
        )}
      </main>

      {/* Floating Hashtag Action Button */}
      <motion.button
        onClick={() => setIsHashtagPanelOpen(true)}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          ease: "easeInOut",
          repeat: Infinity,
        }}
        whileHover={{
          scale: 1.15,
          rotate: 15,
          boxShadow: "0 8px 24px rgba(59, 130, 246, 0.4)",
        }}
        whileTap={{
          scale: 0.95,
        }}
        className="fixed bottom-24 right-5 w-[60px] h-[60px] bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-2xl transition-shadow z-30"
      >
        <Hash className="w-7 h-7 text-white" strokeWidth={2.5} />
      </motion.button>

      {/* Hashtag Filter Panel - Slide-in from Bottom */}
      <AnimatePresence>
        {isHashtagPanelOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsHashtagPanelOpen(false)}
              className="fixed inset-0 bg-black/20 z-40"
            />

            {/* Compact Search Popup */}
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ 
                type: 'spring', 
                damping: 25, 
                stiffness: 300
              }}
              className="fixed bottom-28 right-5 z-50 w-[calc(100%-2.5rem)] max-w-[320px]"
            >
              <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
                {/* Search Input */}
                <div className="p-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      value={hashtagSearchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Search hashtags or users..."
                      className="w-full pl-12 pr-10 py-3 bg-[#252525] border-2 border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:bg-[#1e1e1e] transition-all"
                      autoFocus
                    />
                    <motion.button
                      onClick={() => {
                        setIsHashtagPanelOpen(false);
                        setHashtagSearchQuery('');
                        setShowSuggestions(false);
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </motion.button>
                  </div>
                </div>

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-gray-100 max-h-[300px] overflow-y-auto"
                    >
                      {/* Hashtag Suggestions */}
                      {(isHashtagSearch || (!isHashtagSearch && !isUserSearch)) && getFilteredHashtags().length > 0 && (
                        <div className="px-2 py-2">
                          <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {isHashtagSearch ? 'Matching Hashtags' : 'Popular Hashtags'}
                          </p>
                          <div className="space-y-1">
                            {getFilteredHashtags().map(({ tag, count }, index) => (
                              <motion.button
                                key={tag}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => handleHashtagSelect(tag)}
                                whileHover={{ x: 4, backgroundColor: '#f3f4f6' }}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Hash className="w-4 h-4 text-blue-600" strokeWidth={2.5} />
                                  </div>
                                  <span className="text-sm font-medium text-gray-800">{tag}</span>
                                </div>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                  {count}
                                </span>
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* User Suggestions */}
                      {isUserSearch && getFilteredUsers().length > 0 && (
                        <div className="px-2 py-2">
                          <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Matching Users
                          </p>
                          <div className="space-y-1">
                            {getFilteredUsers().map((user, index) => (
                              <motion.button
                                key={user.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => handleUserSelect(user.id)}
                                whileHover={{ x: 4, backgroundColor: '#f3f4f6' }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                              >
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                                  style={{ backgroundColor: user.avatarColor }}
                                >
                                  {getInitials(user.username)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{user.username}</p>
                                  <p className="text-xs text-gray-500">
                                    {user.isCurrentUser ? 'You' : 'Active now'}
                                  </p>
                                </div>
                                {!user.isCurrentUser && (
                                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                                )}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty State */}
                      {showSuggestions && 
                        ((isHashtagSearch && getFilteredHashtags().length === 0) ||
                         (isUserSearch && getFilteredUsers().length === 0)) && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="px-6 py-8 text-center"
                        >
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            {isHashtagSearch ? (
                              <Hash className="w-6 h-6 text-gray-400" />
                            ) : (
                              <User className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-600 mb-1">
                            {isHashtagSearch ? 'No hashtags found' : 'No users found'}
                          </p>
                          <p className="text-xs text-gray-400">
                            Try a different search term
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* User Profile Popup - Using new ProfileCard component */}
      {selectedUserProfile && (() => {
        const profileUser = getUserById(selectedUserProfile);
        if (!profileUser) return null;
        
        return (
          <ProfileCard
            isOpen={true}
            onClose={() => setSelectedUserProfile(null)}
            variant="user"
            user={{
              id: profileUser.id,
              username: profileUser.username,
              displayName: profileUser.username,
              avatarColor: profileUser.avatarColor,
              isActive: !profileUser.isCurrentUser,
            }}
            onMessage={() => {
              setSelectedChatUserId(profileUser.id);
              setSelectedUserProfile(null);
              setCurrentPage('inbox');
            }}
          />
        );
      })()}

      {/* My Profile Card - Using new ProfileCard component */}
      <ProfileCard
        isOpen={isProfileCardOpen}
        onClose={() => setIsProfileCardOpen(false)}
        variant="owner"
        user={{
          id: '1',
          username: 'you',
          displayName: 'NeolJova',
          avatarColor: '#3b82f6',
          isActive: true,
        }}
      />

      {/* Bottom Input Area */}
      <div className="fixed bottom-0 left-0 right-0 h-[70px] bg-[#1a1a1a] border-t border-gray-800 flex items-center px-4 gap-3">
        {/* Emoji Button */}
        <button className="p-3 hover:bg-[#252525] rounded-full transition-colors">
          <Smile className="w-6 h-6 text-gray-400" />
        </button>

        {/* Media Button */}
        <button className="p-3 hover:bg-[#252525] rounded-full transition-colors">
          <Hash className="w-6 h-6 text-gray-400" />
        </button>

        {/* Input Field */}
        <motion.input
          type="text"
          placeholder="Type a message..."
          className="flex-1 bg-[#252525] border-2 border-gray-700 rounded-full px-5 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-[#1e1e1e] transition-all duration-200"
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setIsTyping(e.target.value.length > 0);
          }}
          onKeyPress={handleKeyPress}
          animate={isTyping ? { scale: [1, 1.01, 1] } : {}}
          transition={{ duration: 0.3 }}
        />

        {/* Send Button */}
        <motion.button 
          onClick={handleSendMessage}
          whileHover={{ scale: 1.05, y: -3 }}
          whileTap={{ scale: 0.95 }}
          className="group bg-gradient-to-b from-[#4dc7d9] to-[#66a6ff] hover:from-[#5bd9ec] hover:to-[#97c3ff] text-white p-3 rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center"
        >
          <motion.div
            whileHover={{ rotate: 45 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center"
          >
            <Send className="w-5 h-5 text-white transition-all duration-300" />
          </motion.div>
        </motion.button>
      </div>
    </div>
  );
}