import React, { useState } from 'react';
import { Settings as SettingsIcon, Globe, Moon, Trash2 } from 'lucide-react';
import { TopBar } from './TopBar';
import { MenuDrawer } from './MenuDrawer';
import { Page } from '../App';

interface SettingsPageProps {
  isAuthenticated: boolean;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export function SettingsPage({ isAuthenticated, onNavigate, onLogout }: SettingsPageProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [language, setLanguage] = useState('english');
  const [theme, setTheme] = useState('light');

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
            <SettingsIcon className="text-blue-600" size={28} />
            <h1 className="text-2xl">Settings</h1>
          </div>

          {/* Language */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="text-gray-600" size={24} />
              <h2 className="text-lg">Language</h2>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="english">English</option>
              <option value="french">Français</option>
              <option value="spanish">Español</option>
              <option value="german">Deutsch</option>
              <option value="japanese">日本語</option>
            </select>
          </div>

          {/* Theme */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <Moon className="text-gray-600" size={24} />
              <h2 className="text-lg">Theme</h2>
            </div>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="light">Light</option>
              <option value="dark">Dark (Coming Soon)</option>
            </select>
          </div>

          {/* Account Actions */}
          {isAuthenticated && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg mb-4">Account</h2>
              
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to logout?')) {
                    onLogout();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Logout
              </button>

              <button
                onClick={() => {
                  alert('Delete account feature coming soon');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 size={20} />
                <span>Delete Account (Coming Soon)</span>
              </button>
            </div>
          )}
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
