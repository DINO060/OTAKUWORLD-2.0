import React from 'react';
import { X, Home, MessageSquare, BookOpen, Upload, User, Settings, LogIn, LogOut, Sparkles } from 'lucide-react';
import { Page } from '../App';

interface MenuDrawerProps {
  isOpen: boolean;
  isAuthenticated: boolean;
  onClose: () => void;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export function MenuDrawer({ isOpen, isAuthenticated, onClose, onNavigate, onLogout }: MenuDrawerProps) {
  if (!isOpen) return null;

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    onClose();
  };

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-64 bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-2">
          <button
            onClick={() => handleNavigate({ type: 'live' })}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors"
          >
            <Home size={20} />
            <span>Home (Live)</span>
          </button>

          <button
            onClick={() => handleNavigate({ type: 'otaku' })}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors"
          >
            <Sparkles size={20} />
            <span>Otaku World</span>
          </button>

          {isAuthenticated && (
            <button
              onClick={() => handleNavigate({ type: 'messages' })}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors"
            >
              <MessageSquare size={20} />
              <span>Private Messages</span>
            </button>
          )}

          <button
            onClick={() => handleNavigate({ type: 'chapters' })}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors"
          >
            <BookOpen size={20} />
            <span>Read Chapters</span>
          </button>

          {isAuthenticated && (
            <button
              onClick={() => handleNavigate({ type: 'publish-chapter' })}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors"
            >
              <Upload size={20} />
              <span>Publish Chapter</span>
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={() => handleNavigate({ type: 'profile' })}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors"
            >
              <User size={20} />
              <span>Profile</span>
            </button>
          )}

          <button
            onClick={() => handleNavigate({ type: 'settings' })}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors"
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          ) : (
            <button
              onClick={() => handleNavigate({ type: 'login' })}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <LogIn size={20} />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}