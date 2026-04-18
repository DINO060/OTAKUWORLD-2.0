import React, { useState } from 'react';
import { ArrowLeft, Smile, Send } from 'lucide-react';
import { TopBar } from './TopBar';
import { MenuDrawer } from './MenuDrawer';
import { Page } from '../App';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface DMMessage {
  id: string;
  text: string;
  timestamp: Date;
  isCurrentUser: boolean;
}

const mockMessages: DMMessage[] = [
  {
    id: '1',
    text: 'Hey! How are you doing?',
    timestamp: new Date(Date.now() - 3600000),
    isCurrentUser: false,
  },
  {
    id: '2',
    text: 'I\'m doing great, thanks! How about you? 😊',
    timestamp: new Date(Date.now() - 3500000),
    isCurrentUser: true,
  },
  {
    id: '3',
    text: 'Pretty good! Just working on some projects',
    timestamp: new Date(Date.now() - 3400000),
    isCurrentUser: false,
  },
];

interface DMChatPageProps {
  conversationId: string;
  isAuthenticated: boolean;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export function DMChatPage({ conversationId, isAuthenticated, onNavigate, onLogout }: DMChatPageProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [messages, setMessages] = useState<DMMessage[]>(mockMessages);
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Mock user data
  const otherUser = {
    username: 'alice_wonder',
    avatar: 'https://i.pravatar.cc/150?img=1',
  };

  const handleSend = () => {
    if (!message.trim()) return;

    const newMessage: DMMessage = {
      id: Date.now().toString(),
      text: message,
      timestamp: new Date(),
      isCurrentUser: true,
    };

    setMessages([...messages, newMessage]);
    setMessage('');
    setShowEmojiPicker(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onEmojiSelect = (emoji: any) => {
    setMessage(prev => prev + emoji.native);
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <TopBar
        onMenuClick={() => setShowMenu(true)}
        isAuthenticated={isAuthenticated}
        onAuthClick={() => onNavigate({ type: 'login' })}
      />

      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <button
          onClick={() => onNavigate({ type: 'messages' })}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-3"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-3">
          <img
            src={otherUser.avatar}
            alt={otherUser.username}
            className="w-10 h-10 rounded-full"
          />
          <h2 className="font-medium">{otherUser.username}</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isCurrentUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-sm px-4 py-2 rounded-2xl ${
                  msg.isCurrentUser
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white text-gray-800 rounded-tl-sm shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                <span className={`text-xs mt-1 block ${msg.isCurrentUser ? 'text-blue-100' : 'text-gray-400'}`}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 relative">
        {showEmojiPicker && (
          <div className="absolute bottom-full left-4 mb-2 z-10">
            <Picker
              data={data}
              onEmojiSelect={onEmojiSelect}
              theme="light"
              onClickOutside={() => setShowEmojiPicker(false)}
            />
          </div>
        )}

        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            aria-label="Add emoji"
          >
            <Smile size={24} />
          </button>

          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <Send size={24} />
          </button>
        </div>
      </div>

      <MenuDrawer
        isOpen={showMenu}
        isAuthenticated={isAuthenticated}
        onClose={() => setShowMenu(false)}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
    </div>
  );
}
