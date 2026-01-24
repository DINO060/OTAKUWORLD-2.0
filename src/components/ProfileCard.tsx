import React, { useState, useEffect } from 'react';
import { X, Camera, Edit2, MessageCircle, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileCardProps {
  isOpen: boolean;
  onClose: () => void;
  variant: 'owner' | 'user';
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarColor: string;
    isActive: boolean;
  };
  onMessage?: () => void;
}

export default function ProfileCard({ isOpen, onClose, variant, user, onMessage }: ProfileCardProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  
  const [editedProfile, setEditedProfile] = useState({
    displayName: 'NeolJova',
    pronouns: 'they/them',
    bio: 'Live chat enthusiast | Love connecting with people 🌟',
    socialLinks: {
      tiktok: 'https://tiktok.com/@neoljova',
      instagram: 'https://instagram.com/neoljova',
      telegram: 'https://t.me/neoljova',
      twitter: 'https://twitter.com/neoljova',
    }
  });

  const [editingLink, setEditingLink] = useState<string | null>(null);
  const [tempLinkValue, setTempLinkValue] = useState('');

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = () => {
    setIsEditMode(false);
    // Here you would save to backend
  };

  const handleCancel = () => {
    setIsEditMode(false);
    // Reset to original values
  };

  const startEditingLink = (platform: string, currentValue: string) => {
    setEditingLink(platform);
    setTempLinkValue(currentValue);
  };

  const saveLinkEdit = () => {
    if (editingLink) {
      setEditedProfile({
        ...editedProfile,
        socialLinks: {
          ...editedProfile.socialLinks,
          [editingLink]: tempLinkValue,
        },
      });
      setEditingLink(null);
      setTempLinkValue('');
    }
  };

  const cancelLinkEdit = () => {
    setEditingLink(null);
    setTempLinkValue('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* OVERLAY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/15 backdrop-blur-sm z-[100]"
          />

          {/* MODAL */}
          <motion.div
            initial={{
              opacity: 0,
              y: window.innerWidth < 768 ? 100 : 0,
              scale: window.innerWidth < 768 ? 1 : 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: window.innerWidth < 768 ? 100 : 0,
              scale: window.innerWidth < 768 ? 1 : 0.96,
            }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed z-[101] 
              bottom-0 left-1/2 -translate-x-1/2
              md:top-1/2 md:-translate-y-1/2 md:bottom-auto
              w-[min(90vw,360px)] md:w-full md:max-w-[360px]
              max-h-[85vh]
              bg-white 
              rounded-t-3xl md:rounded-2xl 
              shadow-xl 
              flex flex-col
              overflow-hidden"
          >
            {/* COVER IMAGE LAYER - Background */}
            <div className="relative h-16 flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-500/90 via-purple-500/80 to-pink-500/90">
              {/* Cover Image */}
              {coverImage ? (
                <img src={coverImage} className="w-full h-full object-cover" alt="Cover" />
              ) : (
                <>
                  {/* Subtle decorative shapes */}
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                </>
              )}
              
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/20"></div>

              {/* Change Cover Button - Owner only in edit mode */}
              {variant === 'owner' && isEditMode && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageUpload}
                    className="hidden"
                    id="cover-upload"
                  />
                  <label
                    htmlFor="cover-upload"
                    className="absolute bottom-1.5 right-1.5 px-2 py-0.5 bg-black/30 hover:bg-black/40 rounded-md flex items-center gap-0.5 cursor-pointer transition-all z-10 text-white text-[10px] font-medium backdrop-blur-sm"
                  >
                    <Camera className="w-2.5 h-2.5" />
                    <span>Cover</span>
                  </label>
                </>
              )}

              {/* Close Button - Always visible */}
              <button
                onClick={onClose}
                className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/25 hover:bg-black/35 backdrop-blur-md rounded-full flex items-center justify-center transition-all z-20"
              >
                <X className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </button>
            </div>

            {/* AVATAR - Overlaps cover (layered on top) */}
            <div className="relative px-3.5 -mt-7 mb-1.5 flex-shrink-0">
              <div className="relative w-14 h-14">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-base font-bold border-[3px] border-white shadow-md overflow-hidden">
                  {avatarImage ? (
                    <img src={avatarImage} className="w-full h-full object-cover" alt="Avatar" />
                  ) : (
                    getInitials(isEditMode ? editedProfile.displayName : user.displayName || 'NeolJova')
                  )}
                </div>

                {/* Change Avatar Button - Owner only in edit mode */}
                {variant === 'owner' && isEditMode && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarImageUpload}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <label
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 w-4.5 h-4.5 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-sm border-2 border-white"
                    >
                      <Camera className="w-2 h-2 text-white" />
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="px-3.5 pb-2.5 overflow-y-auto flex-1 custom-scrollbar">
              {/* Display Name */}
              <div className="mb-1">
                {isEditMode ? (
                  <input
                    type="text"
                    value={editedProfile.displayName}
                    onChange={(e) => setEditedProfile({ ...editedProfile, displayName: e.target.value })}
                    className="w-full text-gray-900 text-[15px] font-semibold bg-gray-50 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Display name"
                  />
                ) : (
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-gray-900 text-[15px] font-semibold">
                      {editedProfile.displayName}
                    </h3>
                    {user.isActive && (
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    )}
                  </div>
                )}
              </div>

              {/* Pronouns */}
              <div className="mb-2">
                {isEditMode ? (
                  <input
                    type="text"
                    value={editedProfile.pronouns}
                    onChange={(e) => setEditedProfile({ ...editedProfile, pronouns: e.target.value })}
                    className="w-full text-xs text-gray-600 bg-gray-50 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Pronouns (e.g., they/them)"
                  />
                ) : (
                  <p className="text-xs text-gray-500">
                    {user.isActive ? 'Online' : 'Offline'}
                  </p>
                )}
              </div>

              {/* Badge */}
              {!isEditMode && (
                <div className="inline-flex items-center gap-1 bg-gradient-to-r from-orange-100 to-orange-50 px-2 py-0.5 rounded-full mb-2.5">
                  <div className="w-3 h-3 bg-orange-400 rounded-full flex items-center justify-center">
                    <span className="text-white text-[7px] font-bold">★</span>
                  </div>
                  <span className="text-orange-800 text-[10px] font-semibold">New Cadet</span>
                </div>
              )}

              {/* Bio */}
              <div className="mb-2.5">
                {isEditMode ? (
                  <textarea
                    value={editedProfile.bio}
                    onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none min-h-[50px]"
                    rows={2}
                  />
                ) : (
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {editedProfile.bio}
                  </p>
                )}
              </div>

              {/* Social Links */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[8px] font-semibold text-gray-500 uppercase tracking-wide">Social</h4>
                  {variant === 'owner' && isEditMode && (
                    <p className="text-[9px] text-gray-400 flex items-center gap-0.5">
                      <AlertCircle className="w-2.5 h-2.5" />
                      Tap to edit
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  {/* TikTok */}
                  <button
                    onClick={() => {
                      if (variant === 'owner' && isEditMode) {
                        startEditingLink('tiktok', editedProfile.socialLinks.tiktok);
                      } else if (editedProfile.socialLinks.tiktok) {
                        window.open(editedProfile.socialLinks.tiktok, '_blank');
                      }
                    }}
                    className="w-8 h-8 bg-black/90 hover:bg-black rounded-full flex items-center justify-center transition-all group relative"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                    {variant === 'owner' && isEditMode && (
                      <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/15 rounded-full transition-all"></div>
                    )}
                  </button>

                  {/* Instagram */}
                  <button
                    onClick={() => {
                      if (variant === 'owner' && isEditMode) {
                        startEditingLink('instagram', editedProfile.socialLinks.instagram);
                      } else if (editedProfile.socialLinks.instagram) {
                        window.open(editedProfile.socialLinks.instagram, '_blank');
                      }
                    }}
                    className="w-8 h-8 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 rounded-full flex items-center justify-center transition-all group relative"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    {variant === 'owner' && isEditMode && (
                      <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/15 rounded-full transition-all"></div>
                    )}
                  </button>

                  {/* Telegram */}
                  <button
                    onClick={() => {
                      if (variant === 'owner' && isEditMode) {
                        startEditingLink('telegram', editedProfile.socialLinks.telegram);
                      } else if (editedProfile.socialLinks.telegram) {
                        window.open(editedProfile.socialLinks.telegram, '_blank');
                      }
                    }}
                    className="w-8 h-8 bg-[#0088cc] hover:bg-[#006ca8] rounded-full flex items-center justify-center transition-all group relative"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    {variant === 'owner' && isEditMode && (
                      <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/15 rounded-full transition-all"></div>
                    )}
                  </button>

                  {/* Twitter/X */}
                  <button
                    onClick={() => {
                      if (variant === 'owner' && isEditMode) {
                        startEditingLink('twitter', editedProfile.socialLinks.twitter);
                      } else if (editedProfile.socialLinks.twitter) {
                        window.open(editedProfile.socialLinks.twitter, '_blank');
                      }
                    }}
                    className="w-8 h-8 bg-black/90 hover:bg-black rounded-full flex items-center justify-center transition-all group relative"
                  >
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="white">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    {variant === 'owner' && isEditMode && (
                      <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/15 rounded-full transition-all"></div>
                    )}
                  </button>
                </div>
              </div>

              {/* Link Edit Modal */}
              {editingLink && (
                <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-[10px] font-semibold text-blue-700 mb-1 capitalize">
                    Edit {editingLink} Link
                  </p>
                  <input
                    type="url"
                    value={tempLinkValue}
                    onChange={(e) => setTempLinkValue(e.target.value)}
                    placeholder={`https://${editingLink}.com/username`}
                    className="w-full text-xs bg-white border border-blue-300 rounded-md px-2 py-1 mb-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={saveLinkEdit}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-medium py-1 rounded-md flex items-center justify-center gap-0.5 transition-colors"
                    >
                      <Check className="w-2.5 h-2.5" />
                      Save
                    </button>
                    <button
                      onClick={cancelLinkEdit}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10px] font-medium py-1 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS - Fixed at bottom */}
            <div className="px-3.5 pb-2.5 pt-2 border-t border-gray-100 flex-shrink-0 bg-white">
              {variant === 'owner' ? (
                <>
                  {isEditMode ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleCancel}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-1.5 rounded-lg transition-all text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveChanges}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 text-xs"
                      >
                        <Check className="w-3 h-3" />
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 text-xs"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit Profile
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={onMessage}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 text-xs"
                >
                  <MessageCircle className="w-3 h-3" />
                  Message
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}