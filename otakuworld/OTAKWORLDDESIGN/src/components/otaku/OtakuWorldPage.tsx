import React, { useState } from 'react';
import { Menu, Bell, X } from 'lucide-react';
import { FeedPage } from './FeedPage';
import { LibraryPage } from './LibraryPage';
import { QuizPage } from './QuizPage';
import { MenuDrawer } from '../MenuDrawer';
import type { User, Page } from '../../App';

interface OtakuWorldPageProps {
  isAuthenticated: boolean;
  currentUser: User | null;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

type OtakuTab = 'feed' | 'library' | 'quiz';

export function OtakuWorldPage({
  isAuthenticated,
  currentUser,
  onNavigate,
  onLogout,
}: OtakuWorldPageProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<OtakuTab>('feed');

  const tabs = [
    { id: 'feed' as OtakuTab, label: 'Feed', icon: '📰' },
    { id: 'library' as OtakuTab, label: 'Biblio', icon: '📖' },
    { id: 'quiz' as OtakuTab, label: 'Quiz', icon: '🧠' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return <FeedPage isAuthenticated={isAuthenticated} currentUser={currentUser} />;
      case 'library':
        return <LibraryPage />;
      case 'quiz':
        return <QuizPage />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col" style={{ background: '#0c0c14' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: '#111119',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
          >
            <Menu size={20} style={{ color: '#e8e8ed' }} />
          </button>
          <h1 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
            Otaku World
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors relative">
            <Bell size={20} style={{ color: '#e8e8ed' }} />
            <div
              className="absolute top-1 right-1 w-2 h-2 rounded-full"
              style={{ background: '#ef4444' }}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>

      {/* Bottom Tabs (Mobile) */}
      <div
        className="md:hidden flex items-center justify-around border-t"
        style={{
          background: '#111119',
          borderColor: 'rgba(255,255,255,0.06)',
          padding: '8px 0',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-full transition-all"
            style={{
              color: activeTab === tab.id ? '#6c5ce7' : '#8888a0',
              background: activeTab === tab.id ? 'rgba(108,92,231,0.12)' : 'transparent',
            }}
          >
            <span style={{ fontSize: '18px' }}>{tab.icon}</span>
            <span style={{ fontSize: '11px', fontWeight: 600 }}>{tab.label}</span>
            {activeTab === tab.id && (
              <div
                className="w-1 h-1 rounded-full"
                style={{ background: '#6c5ce7', marginTop: '2px' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Menu Drawer */}
      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        isAuthenticated={isAuthenticated}
        onNavigate={(page) => {
          setIsMenuOpen(false);
          onNavigate(page);
        }}
        onLogout={onLogout}
      />
    </div>
  );
}