import React, { useState } from 'react';
import { ArrowLeft, Search, MoreVertical } from 'lucide-react';
import { motion } from 'motion/react';

interface Conversation {
  id: string;
  userId: string;
  username: string;
  avatarColor: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  isActive: boolean;
}

interface InboxProps {
  onBack: () => void;
  onSelectConversation: (userId: string) => void;
}

// Mock conversations
const mockConversations: Conversation[] = [
  {
    id: '1',
    userId: '2',
    username: 'sakura_dev',
    avatarColor: '#ec4899',
    lastMessage: 'Oh nice! Can\'t wait to try it out 🎉',
    timestamp: '14:36',
    unreadCount: 2,
    isActive: true,
  },
  {
    id: '2',
    userId: '3',
    username: 'TechGuru',
    avatarColor: '#10b981',
    lastMessage: 'Thanks for the help!',
    timestamp: 'Yesterday',
    isActive: false,
  },
  {
    id: '3',
    userId: '4',
    username: 'MangaFan22',
    avatarColor: '#f59e0b',
    lastMessage: 'Did you see the latest episode?',
    timestamp: '2d ago',
    unreadCount: 1,
    isActive: false,
  },
];

export default function Inbox({ onBack, onSelectConversation }: InboxProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations] = useState<Conversation[]>(mockConversations);

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const filteredConversations = searchQuery
    ? conversations.filter(conv =>
        conv.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-[#2563eb] to-[#3b82f6] shadow-lg flex-shrink-0">
        <div className="px-3 py-3 sm:px-4 sm:py-3.5 flex items-center justify-between gap-3">
          {/* Left: Back Arrow + Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
            </button>
            <h1 className="text-white font-bold text-lg sm:text-xl">Messages</h1>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-3 pb-3 sm:px-4 sm:pb-3.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" strokeWidth={2} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-white/10 backdrop-blur-sm text-white placeholder-white/60 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
            />
          </div>
        </div>
      </header>

      {/* CONVERSATION LIST */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full px-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-gray-800 font-semibold text-base mb-1">No conversations found</h3>
              <p className="text-gray-500 text-sm">Try a different search term</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conv) => (
              <motion.button
                key={conv.id}
                onClick={() => onSelectConversation(conv.userId)}
                whileTap={{ scale: 0.98 }}
                className="w-full px-3 py-3 sm:px-4 sm:py-3.5 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm"
                    style={{ backgroundColor: conv.avatarColor }}
                  >
                    {getInitials(conv.username)}
                  </div>
                  {/* Active indicator */}
                  {conv.isActive && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-gray-900 font-semibold text-sm sm:text-base truncate">
                      {conv.username}
                    </h3>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{conv.timestamp}</span>
                  </div>
                  <p className="text-gray-600 text-xs sm:text-sm truncate">
                    {conv.lastMessage}
                  </p>
                </div>

                {/* Unread badge */}
                {conv.unreadCount && conv.unreadCount > 0 && (
                  <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{conv.unreadCount}</span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}