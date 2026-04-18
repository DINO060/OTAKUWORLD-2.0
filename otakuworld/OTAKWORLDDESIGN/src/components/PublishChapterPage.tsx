import React, { useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { TopBar } from './TopBar';
import { MenuDrawer } from './MenuDrawer';
import { Page } from '../App';

interface PublishChapterPageProps {
  isAuthenticated: boolean;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export function PublishChapterPage({ isAuthenticated, onNavigate, onLogout }: PublishChapterPageProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [mangaName, setMangaName] = useState('');
  const [chapterNumber, setChapterNumber] = useState('');
  const [language, setLanguage] = useState('english');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const handlePublish = () => {
    setError('');

    if (!mangaName || !chapterNumber || !content) {
      setError('Please fill in all fields');
      return;
    }

    // Simulate duplicate check
    if (Math.random() > 0.7) {
      setError('This chapter already exists');
      return;
    }

    alert('Chapter published successfully!');
    setMangaName('');
    setChapterNumber('');
    setContent('');
    onNavigate({ type: 'chapters' });
  };

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
            <p className="text-lg text-gray-600 mb-4">Please sign in to publish chapters</p>
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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <TopBar
        onMenuClick={() => setShowMenu(true)}
        isAuthenticated={isAuthenticated}
        onAuthClick={() => onNavigate({ type: 'login' })}
      />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto">
          {/* Page Title */}
          <div className="flex items-center gap-2 mb-6">
            <Upload className="text-blue-600" size={28} />
            <h1 className="text-2xl">Publish Chapter</h1>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* Manga Name */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Manga Name
              </label>
              <input
                type="text"
                value={mangaName}
                onChange={(e) => setMangaName(e.target.value)}
                placeholder="Enter manga name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Chapter Number */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Chapter Number
              </label>
              <input
                type="number"
                value={chapterNumber}
                onChange={(e) => setChapterNumber(e.target.value)}
                placeholder="1"
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="english">English</option>
                <option value="french">French</option>
                <option value="spanish">Spanish</option>
                <option value="japanese">Japanese</option>
              </select>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter chapter content..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-64"
              />
            </div>

            {/* Publish Button */}
            <button
              onClick={handlePublish}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload size={20} />
              <span>Publish Chapter</span>
            </button>
          </div>
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
