import React, { useState } from 'react';
import { TopBar } from './TopBar';
import { MessageFeed } from './MessageFeed';
import { Composer } from './Composer';
import { ProfilePopup } from './ProfilePopup';
import { TagsPopup } from './TagsPopup';
import { AnimatedHashtag } from './AnimatedHashtag';
import { MenuDrawer } from './MenuDrawer';
import { User, Message, Page } from '../App';

// Mock data
const mockUsers: User[] = [
  {
    id: '1',
    username: 'alice_wonder',
    avatar: 'https://i.pravatar.cc/150?img=1',
    bio: 'Creative soul 🎨',
    socials: {
      tiktok: '@alice_wonder',
      youtube: 'AliceChannel',
      x: '@alicewonder',
    }
  },
  {
    id: '2',
    username: 'bob_builder',
    avatar: 'https://i.pravatar.cc/150?img=2',
    bio: 'Tech enthusiast 💻',
    socials: {
      email: 'bob@example.com',
    }
  },
];

const initialMessages: Message[] = [
  {
    id: '1',
    user: mockUsers[0],
    text: 'Hey everyone! Anyone here for #tech talk? 🚀',
    timestamp: new Date(Date.now() - 300000),
    tags: ['tech'],
  },
  {
    id: '2',
    user: mockUsers[1],
    text: 'Yes! I love discussing #tech and #innovation 💡',
    timestamp: new Date(Date.now() - 240000),
    tags: ['tech', 'innovation'],
  },
];

interface LiveCommentsPageProps {
  isAuthenticated: boolean;
  currentUser: User | null;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export function LiveCommentsPage({ isAuthenticated, currentUser, onNavigate, onLogout }: LiveCommentsPageProps) {
  const [messages, setMessages] = useState<Message[]>(
    currentUser 
      ? [...initialMessages, {
          id: '3',
          user: currentUser,
          text: 'Same here! What about #design trends?',
          timestamp: new Date(Date.now() - 180000),
          tags: ['design'],
          isCurrentUser: true,
        }]
      : initialMessages
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showTagsPopup, setShowTagsPopup] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleSendMessage = (text: string, tags: string[], replyTo?: Message['replyTo']) => {
    if (!isAuthenticated || !currentUser) {
      alert('Please sign in to send messages');
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      user: currentUser,
      text,
      timestamp: new Date(),
      tags,
      replyTo,
      isCurrentUser: true,
    };

    setMessages([...messages, newMessage]);
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
    setShowTagsPopup(false);
  };

  const handleClearFilter = () => {
    setSelectedTag(null);
  };

  const filteredMessages = selectedTag
    ? messages.filter(msg => msg.tags.includes(selectedTag))
    : messages;

  const allTags = Array.from(
    new Set(messages.flatMap(msg => msg.tags))
  ).slice(0, 20);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Ad Banner */}
      <div className="bg-blue-600 text-white py-3 px-4 text-center">
        <span className="opacity-80">Ad space</span>
        <span className="mx-2">—</span>
        <span>Your discreet ad could be here</span>
      </div>

      {/* Top Bar */}
      <TopBar
        onMenuClick={() => setShowMenu(!showMenu)}
        isAuthenticated={isAuthenticated}
        onAuthClick={() => onNavigate({ type: 'login' })}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        <MessageFeed
          messages={filteredMessages}
          onUserClick={handleUserClick}
          selectedTag={selectedTag}
          onClearFilter={handleClearFilter}
        />

        {/* Animated Hashtag Button */}
        <AnimatedHashtag onClick={() => setShowTagsPopup(true)} />
      </div>

      {/* Composer */}
      <Composer
        onSendMessage={handleSendMessage}
        isAuthenticated={isAuthenticated}
      />

      {/* Popups */}
      {selectedUser && (
        <ProfilePopup
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {showTagsPopup && (
        <TagsPopup
          tags={allTags}
          selectedTag={selectedTag}
          onTagClick={handleTagClick}
          onClose={() => setShowTagsPopup(false)}
        />
      )}

      {/* Menu Drawer */}
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
