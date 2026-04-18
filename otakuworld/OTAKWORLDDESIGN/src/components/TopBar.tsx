import React from 'react';
import { Menu, MessageCircle } from 'lucide-react';

interface TopBarProps {
  onMenuClick: () => void;
  isAuthenticated: boolean;
  onAuthClick: () => void;
}

export function TopBar({ onMenuClick, isAuthenticated, onAuthClick }: TopBarProps) {
  return (
    <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2">
        <MessageCircle size={24} />
        <h1 className="text-xl">Comment Live</h1>
      </div>
      
      <div className="flex items-center gap-3">
        {!isAuthenticated && (
          <button
            onClick={onAuthClick}
            className="px-4 py-1 bg-white text-blue-600 rounded-full hover:bg-blue-50 transition-colors text-sm"
          >
            Sign In
          </button>
        )}
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
          aria-label="Menu"
        >
          <Menu size={24} />
        </button>
      </div>
    </div>
  );
}
