import React, { useState } from 'react';
import { LiveCommentsPage } from './components/LiveCommentsPage';
import { ChaptersPage } from './components/ChaptersPage';
import { ChapterReader } from './components/ChapterReader';
import { PublishChapterPage } from './components/PublishChapterPage';
import { PrivateMessagesPage } from './components/PrivateMessagesPage';
import { DMChatPage } from './components/DMChatPage';
import { ProfilePage } from './components/ProfilePage';
import { SettingsPage } from './components/SettingsPage';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { OtakuWorldPage } from './components/otaku/OtakuWorldPage';

export interface User {
  id: string;
  username: string;
  avatar: string;
  bio?: string;
  socials?: {
    tiktok?: string;
    youtube?: string;
    x?: string;
    facebook?: string;
    email?: string;
  };
}

export interface Message {
  id: string;
  user: User;
  text: string;
  timestamp: Date;
  tags: string[];
  replyTo?: {
    id: string;
    username: string;
    text: string;
  };
  isCurrentUser?: boolean;
}

export interface Manga {
  id: string;
  title: string;
  coverImage: string;
  description: string;
}

export interface Chapter {
  id: string;
  mangaId: string;
  mangaTitle: string;
  number: number;
  language: string;
  author: string;
  content: string;
}

export interface Conversation {
  id: string;
  user: User;
  lastMessage: string;
  timestamp: Date;
  unread: boolean;
}

export type Page = 
  | { type: 'live' }
  | { type: 'chapters' }
  | { type: 'chapter-reader'; chapterId: string }
  | { type: 'publish-chapter' }
  | { type: 'messages' }
  | { type: 'dm-chat'; conversationId: string }
  | { type: 'profile' }
  | { type: 'settings' }
  | { type: 'login' }
  | { type: 'register' }
  | { type: 'otaku' };

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>({ type: 'live' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleLogin = (email: string, password: string) => {
    // Mock login
    setIsAuthenticated(true);
    setCurrentUser({
      id: '3',
      username: 'You',
      avatar: 'https://i.pravatar.cc/150?img=3',
      bio: 'Just chatting!',
    });
    setCurrentPage({ type: 'live' });
  };

  const handleRegister = (username: string, email: string, password: string) => {
    // Mock register
    setIsAuthenticated(true);
    setCurrentUser({
      id: '3',
      username: username,
      avatar: 'https://i.pravatar.cc/150?img=3',
      bio: '',
    });
    setCurrentPage({ type: 'live' });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentPage({ type: 'live' });
  };

  const navigate = (page: Page) => {
    setCurrentPage(page);
  };

  // Render current page
  const renderPage = () => {
    switch (currentPage.type) {
      case 'live':
        return (
          <LiveCommentsPage
            isAuthenticated={isAuthenticated}
            currentUser={currentUser}
            onNavigate={navigate}
            onLogout={handleLogout}
          />
        );
      case 'chapters':
        return (
          <ChaptersPage
            isAuthenticated={isAuthenticated}
            onNavigate={navigate}
            onLogout={handleLogout}
          />
        );
      case 'chapter-reader':
        return (
          <ChapterReader
            chapterId={currentPage.chapterId}
            isAuthenticated={isAuthenticated}
            onNavigate={navigate}
            onLogout={handleLogout}
          />
        );
      case 'publish-chapter':
        return (
          <PublishChapterPage
            isAuthenticated={isAuthenticated}
            onNavigate={navigate}
            onLogout={handleLogout}
          />
        );
      case 'messages':
        return (
          <PrivateMessagesPage
            isAuthenticated={isAuthenticated}
            onNavigate={navigate}
            onLogout={handleLogout}
          />
        );
      case 'dm-chat':
        return (
          <DMChatPage
            conversationId={currentPage.conversationId}
            isAuthenticated={isAuthenticated}
            onNavigate={navigate}
            onLogout={handleLogout}
          />
        );
      case 'profile':
        return (
          <ProfilePage
            isAuthenticated={isAuthenticated}
            currentUser={currentUser}
            onUpdateUser={setCurrentUser}
            onNavigate={navigate}
            onLogout={handleLogout}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            isAuthenticated={isAuthenticated}
            onNavigate={navigate}
            onLogout={handleLogout}
          />
        );
      case 'login':
        return (
          <LoginPage
            onLogin={handleLogin}
            onNavigate={navigate}
          />
        );
      case 'register':
        return (
          <RegisterPage
            onRegister={handleRegister}
            onNavigate={navigate}
          />
        );
      case 'otaku':
        return (
          <OtakuWorldPage
            isAuthenticated={isAuthenticated}
            currentUser={currentUser}
            onNavigate={navigate}
            onLogout={handleLogout}
          />
        );
      default:
        return null;
    }
  };

  return <div className="h-screen overflow-hidden">{renderPage()}</div>;
}