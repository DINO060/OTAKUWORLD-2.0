import React from 'react';
import { User } from '../App';
import { X, Mail, MessageSquare } from 'lucide-react';

interface ProfilePopupProps {
  user: User;
  onClose: () => void;
}

export function ProfilePopup({ user, onClose }: ProfilePopupProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Avatar and Username */}
        <div className="flex flex-col items-center mb-6">
          <img
            src={user.avatar}
            alt={user.username}
            className="w-24 h-24 rounded-full mb-4 shadow-lg"
          />
          <h2 className="text-2xl mb-2">{user.username}</h2>
          {user.bio && (
            <p className="text-gray-600 text-center">{user.bio}</p>
          )}
        </div>

        {/* Social Media Links */}
        {user.socials && Object.keys(user.socials).length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm text-gray-500 mb-3">Connect</h3>
            <div className="grid grid-cols-2 gap-3">
              {user.socials.tiktok && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-xl">🎵</span>
                  <span className="text-sm truncate">{user.socials.tiktok}</span>
                </div>
              )}
              {user.socials.youtube && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-xl">▶️</span>
                  <span className="text-sm truncate">{user.socials.youtube}</span>
                </div>
              )}
              {user.socials.x && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-xl">𝕏</span>
                  <span className="text-sm truncate">{user.socials.x}</span>
                </div>
              )}
              {user.socials.facebook && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-xl">👤</span>
                  <span className="text-sm truncate">{user.socials.facebook}</span>
                </div>
              )}
              {user.socials.email && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg col-span-2">
                  <Mail size={18} className="text-gray-600" />
                  <span className="text-sm truncate">{user.socials.email}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DM Button */}
        <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
          <MessageSquare size={20} />
          <span>Send Private Message</span>
        </button>
      </div>
    </div>
  );
}
