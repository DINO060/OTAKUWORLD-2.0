import React, { useState } from 'react';
import { Search, BookOpen, ChevronRight } from 'lucide-react';
import { TopBar } from './TopBar';
import { MenuDrawer } from './MenuDrawer';
import { Manga, Page } from '../App';

const mockMangas: Manga[] = [
  {
    id: '1',
    title: 'One Piece',
    coverImage: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=600&fit=crop',
    description: 'The adventures of a pirate crew',
  },
  {
    id: '2',
    title: 'Naruto',
    coverImage: 'https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=400&h=600&fit=crop',
    description: 'The story of a young ninja',
  },
  {
    id: '3',
    title: 'Attack on Titan',
    coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=600&fit=crop',
    description: 'Humanity fights against titans',
  },
];

interface ChaptersPageProps {
  isAuthenticated: boolean;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export function ChaptersPage({ isAuthenticated, onNavigate, onLogout }: ChaptersPageProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [selectedManga, setSelectedManga] = useState<Manga | null>(null);

  const filteredMangas = mockMangas.filter(manga =>
    manga.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mock chapters for selected manga
  const mockChapters = selectedManga ? [
    { id: '1', number: 1, language: 'English', author: 'Translator1' },
    { id: '2', number: 2, language: 'English', author: 'Translator1' },
    { id: '3', number: 1, language: 'French', author: 'Translator2' },
    { id: '4', number: 3, language: 'English', author: 'Translator1' },
  ].filter(ch => languageFilter === 'all' || ch.language.toLowerCase() === languageFilter) : [];

  if (selectedManga) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <TopBar
          onMenuClick={() => setShowMenu(true)}
          isAuthenticated={isAuthenticated}
          onAuthClick={() => onNavigate({ type: 'login' })}
        />

        <div className="flex-1 overflow-y-auto p-4">
          {/* Back Button */}
          <button
            onClick={() => setSelectedManga(null)}
            className="mb-4 text-blue-600 hover:text-blue-700"
          >
            ← Back to Manga List
          </button>

          {/* Manga Info */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="flex gap-4">
              <img
                src={selectedManga.coverImage}
                alt={selectedManga.title}
                className="w-24 h-36 object-cover rounded-lg"
              />
              <div>
                <h2 className="text-xl mb-2">{selectedManga.title}</h2>
                <p className="text-gray-600 text-sm">{selectedManga.description}</p>
              </div>
            </div>
          </div>

          {/* Language Filter */}
          <div className="mb-4">
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Languages</option>
              <option value="english">English</option>
              <option value="french">French</option>
              <option value="spanish">Spanish</option>
            </select>
          </div>

          {/* Chapters List */}
          <div className="space-y-2">
            {mockChapters.map((chapter) => (
              <button
                key={chapter.id}
                onClick={() => onNavigate({ type: 'chapter-reader', chapterId: chapter.id })}
                className="w-full bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Chapter {chapter.number}</h3>
                    <p className="text-sm text-gray-600">
                      {chapter.language} • by {chapter.author}
                    </p>
                  </div>
                  <ChevronRight className="text-gray-400" />
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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <TopBar
        onMenuClick={() => setShowMenu(true)}
        isAuthenticated={isAuthenticated}
        onAuthClick={() => onNavigate({ type: 'login' })}
      />

      <div className="flex-1 overflow-y-auto p-4">
        {/* Page Title */}
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="text-blue-600" size={28} />
          <h1 className="text-2xl">Read Chapters</h1>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search manga..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Manga Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredMangas.map((manga) => (
            <button
              key={manga.id}
              onClick={() => setSelectedManga(manga)}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <img
                src={manga.coverImage}
                alt={manga.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-3">
                <h3 className="font-medium truncate">{manga.title}</h3>
                <p className="text-sm text-gray-600 truncate">{manga.description}</p>
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
