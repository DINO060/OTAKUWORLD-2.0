import React, { useState } from 'react';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { TopBar } from './TopBar';
import { MenuDrawer } from './MenuDrawer';
import { Conversation, Page } from '../App';

const mockConversations: Conversation[] = [
  {
    id: '1',
    user: {
      id: '1',
      username: 'alice_wonder',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    lastMessage: 'Hey! How are you doing?',
    timestamp: new Date(Date.now() - 3600000),
    unread: true,
  },
  {
    id: '2',
    user: {
      id: '2',
      username: 'bob_builder',
      avatar: 'https://i.pravatar.cc/150?img=2',
    },
    lastMessage: 'Thanks for the help yesterday!',
    timestamp: new Date(Date.now() - 86400000),
    unread: false,
  },
  {
    id: '3',
    user: {
      id: '4',
      username: 'charlie_brown',
      avatar: 'https://i.pravatar.cc/150?img=4',
    },
    lastMessage: 'See you tomorrow! 👋',
    timestamp: new Date(Date.now() - 172800000),
    unread: false,
  },
];

interface PrivateMessagesPageProps {
  isAuthenticated: boolean;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export function PrivateMessagesPage({ isAuthenticated, onNavigate, onLogout }: PrivateMessagesPageProps) {
  const [showMenu, setShowMenu] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <TopBar
          onMenuClick={() => setShowMenu(true)}
          isAuthenticated={isAuthenticated}
          onAuthClick={() => onNavigate({ type: 'login' })}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-4">Please sign in to view private messages</p>
            <button
              onClick={() => onNavigate({ type: 'login' })}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Sign In
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

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <TopBar
        onMenuClick={() => setShowMenu(true)}
        isAuthenticated={isAuthenticated}
        onAuthClick={() => onNavigate({ type: 'login' })}
      />

      <div className="flex-1 overflow-y-auto p-4">
        {/* Page Title */}
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="text-blue-600" size={28} />
          <h1 className="text-2xl">Private Messages</h1>
        </div>

        {/* Conversations List */}
        <div className="space-y-2">
          {mockConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onNavigate({ type: 'dm-chat', conversationId: conversation.id })}
              className="w-full bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <img
                  src={conversation.user.avatar}
                  alt={conversation.user.username}
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium">{conversation.user.username}</h3>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(conversation.timestamp)}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${conversation.unread ? 'text-gray-900' : 'text-gray-600'}`}>
                    {conversation.lastMessage}
                  </p>
                </div>
                {conversation.unread && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                )}
                <ChevronRight className="text-gray-400" size={20} />
              </div>
            </button>
          ))}
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
