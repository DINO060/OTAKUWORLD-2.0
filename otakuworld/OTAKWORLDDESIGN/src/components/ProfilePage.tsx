import React, { useState } from 'react';
import { User as UserIcon, Upload } from 'lucide-react';
import { TopBar } from './TopBar';
import { MenuDrawer } from './MenuDrawer';
import { User, Page } from '../App';

interface ProfilePageProps {
  isAuthenticated: boolean;
  currentUser: User | null;
  onUpdateUser: (user: User) => void;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export function ProfilePage({ isAuthenticated, currentUser, onUpdateUser, onNavigate, onLogout }: ProfilePageProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [username, setUsername] = useState(currentUser?.username || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [tiktok, setTiktok] = useState(currentUser?.socials?.tiktok || '');
  const [youtube, setYoutube] = useState(currentUser?.socials?.youtube || '');
  const [xTwitter, setXTwitter] = useState(currentUser?.socials?.x || '');
  const [facebook, setFacebook] = useState(currentUser?.socials?.facebook || '');
  const [email, setEmail] = useState(currentUser?.socials?.email || '');

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <TopBar
          onMenuClick={() => setShowMenu(true)}
          isAuthenticated={isAuthenticated}
          onAuthClick={() => onNavigate({ type: 'login' })}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-4">Please sign in to view your profile</p>
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

  const handleSave = () => {
    const updatedUser: User = {
      ...currentUser,
      username,
      bio,
      socials: {
        tiktok: tiktok || undefined,
        youtube: youtube || undefined,
        x: xTwitter || undefined,
        facebook: facebook || undefined,
        email: email || undefined,
      },
    };
    onUpdateUser(updatedUser);
    alert('Profile updated successfully!');
  };

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
            <UserIcon className="text-blue-600" size={28} />
            <h1 className="text-2xl">My Profile</h1>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="w-24 h-24 rounded-full mb-4"
              />
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Upload size={18} />
                <span>Upload Avatar</span>
              </button>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-24"
              />
            </div>

            {/* Social Links */}
            <div>
              <h3 className="font-medium mb-3">Social Links</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  placeholder="TikTok username"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  placeholder="YouTube channel"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={xTwitter}
                  onChange={(e) => setXTwitter(e.target.value)}
                  placeholder="X (Twitter) username"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="Facebook profile"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Public email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Changes
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
