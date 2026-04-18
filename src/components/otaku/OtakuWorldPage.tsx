import React, { useState } from 'react';
import { ArrowLeft, Bell } from 'lucide-react';
import { FeedPage } from './FeedPage';
import { LibraryPage } from './LibraryPage';
import { QuizPage } from './QuizPage';
import { CataloguePage } from './discover/CataloguePage';
import { useAuth } from '../../contexts/AuthContext';

interface OtakuWorldPageProps {
  onBack: () => void;
  onOpenChat?: (userId: string) => void;
  onOpenGame?: (roomCode?: string) => void;
  onOpenSettings?: () => void;
}

type OtakuTab = 'feed' | 'catalogue' | 'quiz';

export function OtakuWorldPage({ onBack, onOpenChat, onOpenGame, onOpenSettings }: OtakuWorldPageProps) {
  const { profile, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<OtakuTab>('feed');
  const [showBiblio, setShowBiblio] = useState(false);

  const tabs = [
    { id: 'feed' as OtakuTab, label: 'Feed', icon: '📰' },
    { id: 'catalogue' as OtakuTab, label: 'Catalogue', icon: '📖' },
    { id: 'quiz' as OtakuTab, label: 'Quiz', icon: '🧠' },
  ];

  // If biblio is open, show the original LibraryPage
  if (showBiblio) {
    return <LibraryPage onBack={() => setShowBiblio(false)} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return (
          <FeedPage
            isAuthenticated={isAuthenticated}
            currentUser={
              profile
                ? {
                    id: profile.id,
                    username: profile.username,
                    handle: profile.handle || `@${profile.username}`,
                    avatar: profile.avatarImage || '',
                  }
                : null
            }
            onNavigate={(tab, data) => { if (tab === 'game') { onOpenGame?.(data); } else { setActiveTab(tab as OtakuTab); } }}
            onOpenChat={onOpenChat}
            onOpenSettings={onOpenSettings}
          />
        );
      case 'catalogue':
        return (
          <CataloguePage onOpenBiblio={() => setShowBiblio(true)} />
        );
      case 'quiz':
        return <QuizPage />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: '#0c0c14' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{
          background: '#111119',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeTab !== 'feed') {
                setActiveTab('feed');
              } else {
                onBack();
              }
            }}
            className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
          >
            <ArrowLeft size={20} style={{ color: '#e8e8ed' }} />
          </button>
          <span style={{ fontSize: '20px' }}>🎌</span>
          <h1 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
            Otaku World
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors relative">
            <Bell size={20} style={{ color: '#e8e8ed' }} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Left Sidebar */}
        <div
          className="hidden md:flex flex-col w-56 border-r flex-shrink-0 py-4"
          style={{
            background: '#111119',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <div className="space-y-1 px-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all text-left"
                style={{
                  background:
                    activeTab === tab.id
                      ? 'rgba(108,92,231,0.15)'
                      : 'transparent',
                  color: activeTab === tab.id ? '#6c5ce7' : '#8888a0',
                }}
              >
                <span style={{ fontSize: '20px' }}>{tab.icon}</span>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>
                  {tab.label}
                </span>
                {activeTab === tab.id && (
                  <div
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: '#6c5ce7' }}
                  />
                )}
              </button>
            ))}
          </div>

          <div
            className="mx-4 my-4 h-px"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          />

          {/* User mini card */}
          {isAuthenticated && profile && (
            <div className="mt-auto mx-3">
              <div
                className="p-3 rounded-xl"
                style={{ background: 'rgba(108,92,231,0.08)' }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                    style={{ background: '#6c5ce7' }}
                  >
                    {profile.avatarImage ? (
                      <img
                        src={profile.avatarImage}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#fff',
                        }}
                      >
                        {profile.username?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="truncate"
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#e8e8ed',
                      }}
                    >
                      {profile.username}
                    </p>
                    <p
                      className="truncate"
                      style={{ fontSize: '11px', color: '#8888a0' }}
                    >
                      {profile.handle || `@${profile.username}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>

      {/* Bottom Tabs (Mobile only) */}
      <div
        className="md:hidden flex items-center justify-around border-t flex-shrink-0"
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
            className="flex-1 flex flex-col items-center justify-center py-2 transition-all"
            style={{
              color: activeTab === tab.id ? '#6c5ce7' : '#8888a0',
            }}
          >
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>{tab.label}</span>
            <div
              className="w-4 h-0.5 rounded-full mt-1"
              style={{
                background: '#6c5ce7',
                opacity: activeTab === tab.id ? 1 : 0,
                transition: 'opacity 0.2s',
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
