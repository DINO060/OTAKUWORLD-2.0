import React, { useState } from 'react';
import { ArrowLeft, Menu, Smile, Hash, Send, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Mock Data Types
interface PrivateMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isOutgoing: boolean;
}

interface ChatUser {
  id: string;
  username: string;
  avatarColor: string;
  isActive: boolean;
  lastSeen?: string;
}

// Mock chat partner
const mockChatPartner: ChatUser = {
  id: '2',
  username: 'sakura_dev',
  avatarColor: '#ec4899',
  isActive: true,
};

// Mock conversation
const initialMessages: PrivateMessage[] = [
  {
    id: '1',
    senderId: '2',
    text: 'Hey! How are you? 😊',
    timestamp: '14:32',
    isOutgoing: false,
  },
  {
    id: '2',
    senderId: '1',
    text: 'Hi! I\'m doing great, thanks! Just working on some new features',
    timestamp: '14:33',
    isOutgoing: true,
  },
  {
    id: '3',
    senderId: '2',
    text: 'That sounds exciting! What are you building?',
    timestamp: '14:34',
    isOutgoing: false,
  },
  {
    id: '4',
    senderId: '1',
    text: 'A private chat feature 🚀',
    timestamp: '14:35',
    isOutgoing: true,
  },
  {
    id: '5',
    senderId: '2',
    text: 'Oh nice! Can\'t wait to try it out 🎉',
    timestamp: '14:36',
    isOutgoing: false,
  },
];

interface PrivateChatProps {
  onBack?: () => void;
  isLoggedIn?: boolean;
  selectedUserId?: string;
}

export default function PrivateChat({ onBack, isLoggedIn = true, selectedUserId = '2' }: PrivateChatProps) {
  const [messages, setMessages] = useState<PrivateMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Get chat partner based on selectedUserId
  const chatPartner: ChatUser = {
    id: selectedUserId,
    username: selectedUserId === '2' ? 'sakura_dev' : selectedUserId === '3' ? 'TechGuru' : 'MangaFan22',
    avatarColor: selectedUserId === '2' ? '#ec4899' : selectedUserId === '3' ? '#10b981' : '#f59e0b',
    isActive: selectedUserId === '2',
  };

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleSendMessage = () => {
    if (!isLoggedIn || inputText.trim() === '') return;

    const newMessage: PrivateMessage = {
      id: (messages.length + 1).toString(),
      senderId: '1',
      text: inputText,
      timestamp: getCurrentTime(),
      isOutgoing: true,
    };

    setMessages([...messages, newMessage]);
    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* HEADER - Same gradient as Comment Live */}
      <header className="bg-gradient-to-r from-[#2563eb] to-[#3b82f6] shadow-lg flex-shrink-0 z-40">
        <div className="px-3 py-3 sm:px-4 sm:py-3.5 flex items-center justify-between gap-3">
          {/* Left: Back Arrow + Avatar + User Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Back Button */}
            <button
              onClick={onBack}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
            </button>

            {/* Avatar */}
            <div
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-md"
              style={{ backgroundColor: chatPartner.avatarColor }}
            >
              {getInitials(chatPartner.username)}
            </div>

            {/* Username + Status */}
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-base sm:text-lg truncate">
                {chatPartner.username}
              </h1>
              <p className="text-white/80 text-xs sm:text-sm">
                {chatPartner.isActive ? 'Active now' : `Last seen ${chatPartner.lastSeen || '2h ago'}`}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* CHAT AREA - Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5 space-y-4">
        {messages.length === 0 ? (
          // Empty State
          <div className="h-full flex items-center justify-center">
            <div className="text-center px-6 py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center">
                <Smile className="w-10 h-10 text-blue-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-gray-800 font-semibold text-lg mb-2">No messages yet</h3>
              <p className="text-gray-500 text-sm">Say hi to start the conversation 👋</p>
            </div>
          </div>
        ) : (
          // Messages List
          messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-2 ${message.isOutgoing ? 'justify-end' : 'justify-start'}`}
            >
              {/* Incoming Message - Left Side with Avatar */}
              {!message.isOutgoing && (
                <>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-1"
                    style={{ backgroundColor: chatPartner.avatarColor }}
                  >
                    {getInitials(chatPartner.username)}
                  </div>
                  <div className="flex flex-col max-w-[75%] sm:max-w-[60%]">
                    <div className="bg-white rounded-2xl rounded-tl-md px-4 py-2.5 shadow-sm">
                      <p className="text-gray-800 text-sm sm:text-base leading-relaxed break-words">
                        {message.text}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 mt-1 ml-3">{message.timestamp}</span>
                  </div>
                </>
              )}

              {/* Outgoing Message - Right Side without Avatar */}
              {message.isOutgoing && (
                <div className="flex flex-col items-end max-w-[75%] sm:max-w-[60%]">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl rounded-tr-md px-4 py-2.5 shadow-sm">
                    <p className="text-white text-sm sm:text-base leading-relaxed break-words">
                      {message.text}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 mt-1 mr-3">{message.timestamp}</span>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* INPUT BAR - EXACTLY like Comment Live */}
      <div className="bg-white border-t border-gray-200 px-3 py-3 sm:px-4 sm:py-3.5 flex-shrink-0 safe-area-bottom">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Emoji Button */}
          <button
            disabled={!isLoggedIn}
            className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition-all flex-shrink-0 ${
              isLoggedIn
                ? 'bg-gray-100 hover:bg-gray-200'
                : 'bg-gray-100 opacity-50 cursor-not-allowed'
            }`}
          >
            <Smile className="w-5 h-5 text-gray-600" strokeWidth={2} />
          </button>

          {/* Hashtag Button */}
          <button
            disabled={!isLoggedIn}
            className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition-all flex-shrink-0 ${
              isLoggedIn
                ? 'bg-gray-100 hover:bg-gray-200'
                : 'bg-gray-100 opacity-50 cursor-not-allowed'
            }`}
          >
            <Hash className="w-5 h-5 text-gray-600" strokeWidth={2} />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsTyping(true)}
            onBlur={() => setIsTyping(false)}
            disabled={!isLoggedIn}
            placeholder={isLoggedIn ? 'Write a message…' : 'Sign in to send messages…'}
            className={`flex-1 bg-gray-100 rounded-xl px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all ${
              !isLoggedIn ? 'cursor-not-allowed opacity-50' : ''
            }`}
          />

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!isLoggedIn || inputText.trim() === ''}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
              isLoggedIn && inputText.trim() !== ''
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md'
                : 'bg-gray-200 cursor-not-allowed'
            }`}
          >
            <Send
              className={`w-5 h-5 ${
                isLoggedIn && inputText.trim() !== '' ? 'text-white' : 'text-gray-400'
              }`}
              strokeWidth={2.5}
            />
          </button>
        </div>
      </div>
    </div>
  );
}