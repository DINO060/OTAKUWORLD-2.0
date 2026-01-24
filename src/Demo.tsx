import React, { useState } from 'react';
import ProfileCard from './components/ProfileCard';
import PrivateChat from './components/PrivateChat';

export default function Demo() {
  const [currentPage, setCurrentPage] = useState<'home' | 'profile-owner' | 'profile-user' | 'private-chat'>('home');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {currentPage === 'home' && (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Component Demo
              </h1>
              <p className="text-gray-600 text-lg">
                Redesigned Profile Card & Private Chat
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => {
                  setCurrentPage('profile-owner');
                  setIsProfileOpen(true);
                }}
                className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  👤
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-800">My Profile</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Owner variant with edit mode, image upload, and social link editing
                </p>
                <div className="text-blue-500 font-semibold text-sm group-hover:text-blue-600">
                  Open →
                </div>
              </button>
              
              <button
                onClick={() => {
                  setCurrentPage('profile-user');
                  setIsProfileOpen(true);
                }}
                className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  SD
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-800">User Profile</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Read-only variant with Message button and clickable social links
                </p>
                <div className="text-pink-500 font-semibold text-sm group-hover:text-pink-600">
                  Open →
                </div>
              </button>
              
              <button
                onClick={() => setCurrentPage('private-chat')}
                className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 md:col-span-2"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  💬
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-800">Private Chat</h3>
                <p className="text-gray-600 text-sm mb-4">
                  1-to-1 conversation with Twitter-style header and message bubbles
                </p>
                <div className="text-purple-500 font-semibold text-sm group-hover:text-purple-600">
                  Open →
                </div>
              </button>
            </div>

            <div className="mt-12 p-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">✨ Refined & Lightweight</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ Compact sizing: 380px desktop, min(90vw, 360px) mobile</li>
                <li>✅ Cover is a background layer (80px, subtle gradient)</li>
                <li>✅ Avatar clearly sits on top (56px, -28px overlap)</li>
                <li>✅ Social icons are subtle (14px icons, not dominant)</li>
                <li>✅ Buttons are balanced (~28px height, text-xs)</li>
                <li>✅ Typography refined (10-15px, clear hierarchy)</li>
                <li>✅ Overall feel: clean, lightweight, modern</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Profile Cards */}
      {currentPage === 'profile-owner' && (
        <ProfileCard
          isOpen={isProfileOpen}
          onClose={() => {
            setIsProfileOpen(false);
            setTimeout(() => setCurrentPage('home'), 300);
          }}
          variant="owner"
          user={{
            id: '1',
            username: 'you',
            displayName: 'NeolJova',
            avatarColor: '#3b82f6',
            isActive: true,
          }}
        />
      )}

      {currentPage === 'profile-user' && (
        <ProfileCard
          isOpen={isProfileOpen}
          onClose={() => {
            setIsProfileOpen(false);
            setTimeout(() => setCurrentPage('home'), 300);
          }}
          variant="user"
          user={{
            id: '2',
            username: 'sakura_dev',
            displayName: 'Sakura Dev',
            avatarColor: '#ec4899',
            isActive: true,
          }}
          onMessage={() => {
            setCurrentPage('private-chat');
            setIsProfileOpen(false);
          }}
        />
      )}

      {/* Private Chat */}
      {currentPage === 'private-chat' && (
        <PrivateChat
          onBack={() => setCurrentPage('home')}
          isLoggedIn={true}
        />
      )}
    </div>
  );
}