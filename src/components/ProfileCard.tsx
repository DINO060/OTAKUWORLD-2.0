import React, { useState, useEffect } from 'react';
import { X, Camera, Edit2, MessageCircle, Check, Loader2, Flag, ChevronRight, MessageSquareOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────
// Platform detection + SVG icons
// ─────────────────────────────────────────────

interface PlatformInfo {
  name: string;
  bg: string;
  icon: React.ReactNode;
}

const TIKTOK_ICON = (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);
const INSTAGRAM_ICON = (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);
const YOUTUBE_ICON = (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="white">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);
const X_ICON = (
  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="white">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const DISCORD_ICON = (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="white">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.16.171 18.2.23 18.228c2.028 1.487 3.988 2.388 5.908 2.985a.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028c1.961-.598 3.921-1.499 5.949-2.985a.077.077 0 0 0 .031-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);
const TWITCH_ICON = (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="white">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
  </svg>
);
const TELEGRAM_ICON = (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);
const LINKEDIN_ICON = (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);
const FACEBOOK_ICON = (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const SNAPCHAT_ICON = (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="black">
    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.045.26.27.286.53.286.22 0 .45-.035.65-.085.21-.05.42-.05.62 0 .43.15.73.5.73.86 0 .47-.36.87-.9.97-1.04.2-1.35.46-1.35.48-.02.1 0 .23.15.5.6 1.08 1.75 2.6 3.5 3.02.25.06.4.28.4.5 0 .5-.8.97-1.7 1.22-.12.04-.16.12-.16.22 0 .07.04.15.1.22.17.2.45.55.45.85 0 .2-.11.36-.33.47-.37.18-.77.27-1.17.27-.15 0-.29-.01-.43-.03-.52-.07-1.07-.24-1.55-.43-.63-.25-1.23-.38-1.77-.38-.5 0-1.03.12-1.5.38-.55.28-1.08.43-1.59.43-.17 0-.32-.02-.46-.04-.4-.07-.77-.22-1.15-.4-.22-.11-.33-.27-.33-.47 0-.3.28-.65.45-.85.06-.07.1-.15.1-.22 0-.1-.04-.18-.16-.22-.9-.25-1.7-.72-1.7-1.22 0-.22.15-.44.4-.5 1.75-.42 2.9-1.94 3.5-3.02.15-.27.17-.4.15-.5 0-.02-.31-.28-1.35-.48-.54-.1-.9-.5-.9-.97 0-.36.3-.71.73-.86.2-.05.41-.05.62 0 .2.05.43.085.65.085.26 0 .49-.026.53-.286-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.843 1.069 11.2.793 12.206.793z" />
  </svg>
);
const LINK_ICON = (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

function detectPlatform(url: string): PlatformInfo | null {
  const lower = url.toLowerCase();
  if (lower.includes('tiktok.com')) return { name: 'TikTok', bg: 'bg-black', icon: TIKTOK_ICON };
  if (lower.includes('instagram.com')) return { name: 'Instagram', bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500', icon: INSTAGRAM_ICON };
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return { name: 'YouTube', bg: 'bg-red-600', icon: YOUTUBE_ICON };
  if (lower.includes('twitter.com') || lower.includes('x.com')) return { name: 'X', bg: 'bg-black', icon: X_ICON };
  if (lower.includes('discord.gg') || lower.includes('discord.com')) return { name: 'Discord', bg: 'bg-indigo-500', icon: DISCORD_ICON };
  if (lower.includes('twitch.tv')) return { name: 'Twitch', bg: 'bg-purple-600', icon: TWITCH_ICON };
  if (lower.includes('t.me') || lower.includes('telegram.me') || lower.includes('telegram.org')) return { name: 'Telegram', bg: 'bg-[#0088cc]', icon: TELEGRAM_ICON };
  if (lower.includes('linkedin.com')) return { name: 'LinkedIn', bg: 'bg-blue-700', icon: LINKEDIN_ICON };
  if (lower.includes('snapchat.com')) return { name: 'Snapchat', bg: 'bg-yellow-400', icon: SNAPCHAT_ICON };
  if (lower.includes('facebook.com') || lower.includes('fb.com')) return { name: 'Facebook', bg: 'bg-blue-600', icon: FACEBOOK_ICON };
  return null; // unknown → Clearbit auto-logo
}

// Google Favicon API — auto-fetches logo for any domain (no CORS, no API key)
function SocialLinkIcon({ url }: { url: string }) {
  const [imgError, setImgError] = useState(false);
  const platform = detectPlatform(url);

  if (platform) {
    return <>{platform.icon}</>;
  }

  let domain = '';
  try {
    domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
  } catch { /* invalid url */ }

  if (!imgError && domain) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt={domain}
        className="w-5 h-5 object-contain"
        onError={() => setImgError(true)}
      />
    );
  }

  return <>{LINK_ICON}</>;
}

function getSocialBg(url: string): string {
  const platform = detectPlatform(url);
  if (platform) return platform.bg;
  return 'bg-[#2a2a2a]'; // dark bg for favicon logos
}

function getSocialName(url: string): string {
  const platform = detectPlatform(url);
  if (platform) return platform.name;
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return 'Link';
  }
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

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
  onOpenProfile?: () => void;
}

export default function ProfileCard({ isOpen, onClose, variant, user, onMessage, onOpenProfile }: ProfileCardProps) {
  const { profile, updateProfile, isAuthenticated, user: authUser } = useAuth();

  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);

  // Dynamic social links
  const [socialLinks, setSocialLinks] = useState<string[]>([]);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Fetch full Supabase profile for variant="user" (bio, avatar, allow_dms)
  const [targetAllowsDms, setTargetAllowsDms] = useState<boolean>(true);
  const [targetBio, setTargetBio] = useState<string>('');
  const [targetAvatarImage, setTargetAvatarImage] = useState<string | null>(null);
  const [targetHandle, setTargetHandle] = useState<string>('');

  useEffect(() => {
    if (variant !== 'user' || !user?.id) return;
    setTargetBio('');
    setTargetAvatarImage(null);
    setTargetAllowsDms(true);
    setTargetHandle('');
    supabase
      .from('profiles')
      .select('allow_dms, bio, avatar_url, handle')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setTargetAllowsDms(data.allow_dms !== false);
        setTargetBio(data.bio || '');
        setTargetAvatarImage(data.avatar_url || null);
        setTargetHandle(data.handle || '');
      });
  }, [variant, user?.id]);

  // Report feature
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);

  const REPORT_REASONS = ['Spam ou pub', 'Harcèlement', 'Contenu inapproprié', 'Faux compte', 'Autre'];

  const handleReport = () => {
    if (!reportReason) return;
    setReportSent(true);
    setTimeout(() => {
      setIsReporting(false);
      setReportSent(false);
      setReportReason('');
    }, 2000);
  };

  // Use real profile data for owner; fetched Supabase data for other users
  const displayName = variant === 'owner' && profile ? profile.username : user.displayName;
  const bio = variant === 'owner' && profile ? (profile.bio || '') : targetBio;

  const [editedProfile, setEditedProfile] = useState({
    displayName: displayName || 'User',
    bio: bio,
  });

  // Update editedProfile + avatar when profile changes
  useEffect(() => {
    if (variant === 'owner' && profile) {
      setEditedProfile(prev => ({
        ...prev,
        displayName: profile.username || 'User',
        bio: profile.bio || '',
      }));
      if (profile.avatarImage) setAvatarImage(profile.avatarImage);
    }
  }, [profile, variant]);

  // Load persisted images + social links from localStorage when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const targetId = variant === 'owner' && authUser?.id ? authUser.id : user.id;
    if (!targetId) return;

    const savedCover = localStorage.getItem(`cover_${targetId}`);
    setCoverImage(savedCover || null);

    // For owner: prefer Supabase avatar_url over localStorage
    const savedAvatar = variant === 'owner' && profile?.avatarImage
      ? profile.avatarImage
      : localStorage.getItem(`avatar_${targetId}`);
    setAvatarImage(savedAvatar || null);

    try {
      const savedLinks = localStorage.getItem(`social_links_${targetId}`);
      setSocialLinks(savedLinks ? JSON.parse(savedLinks) : []);
    } catch {
      setSocialLinks([]);
    }
  }, [isOpen, user.id, authUser?.id, variant]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setCoverImage(dataUrl);
      const targetId = variant === 'owner' && authUser?.id ? authUser.id : user.id;
      try { localStorage.setItem(`cover_${targetId}`, dataUrl); } catch { /* storage full */ }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setAvatarImage(dataUrl);
      const targetId = variant === 'owner' && authUser?.id ? authUser.id : user.id;
      try { localStorage.setItem(`avatar_${targetId}`, dataUrl); } catch { /* storage full */ }
    };
    reader.readAsDataURL(file);
  };

  const addLink = () => {
    const trimmed = newLinkUrl.trim();
    if (!trimmed) return;
    const url = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    setSocialLinks(prev => [...prev, url]);
    setIsAddingLink(false);
    setNewLinkUrl('');
  };

  const removeLink = (index: number) => {
    setSocialLinks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveChanges = async () => {
    if (!isAuthenticated || !authUser) return;
    setIsSaving(true);
    try {
      // Persist social links to localStorage
      try {
        localStorage.setItem(`social_links_${authUser.id}`, JSON.stringify(socialLinks));
      } catch { /* storage full */ }

      const result = await updateProfile({
        username: editedProfile.displayName,
        bio: editedProfile.bio,
      });

      if (!result.error) {
        setIsEditMode(false);
        setIsAddingLink(false);
        setNewLinkUrl('');
      } else {
        console.error('Failed to save profile:', result.error);
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setIsAddingLink(false);
    setNewLinkUrl('');
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
            animate={{ opacity: 1, y: 0, scale: 1 }}
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
              bg-[#1a1a1a]
              rounded-t-3xl md:rounded-2xl
              shadow-xl border border-white/10
              flex flex-col
              overflow-hidden"
          >
            {/* COVER IMAGE LAYER */}
            <div className="relative h-16 flex-shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}>
              {coverImage ? (
                <img src={coverImage} className="w-full h-full object-cover" alt="Cover" />
              ) : null}

              {/* Change Cover Button */}
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

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/25 hover:bg-black/35 backdrop-blur-md rounded-full flex items-center justify-center transition-all z-20"
              >
                <X className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </button>
            </div>

            {/* AVATAR */}
            <div className="relative px-3.5 -mt-7 mb-1.5 flex-shrink-0">
              <div className="relative w-14 h-14">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white text-base font-bold border-[3px] border-white shadow-md overflow-hidden"
                  style={{ backgroundColor: (avatarImage || targetAvatarImage) ? undefined : user.avatarColor }}
                >
                  {(avatarImage || (variant === 'user' && targetAvatarImage)) ? (
                    <img src={avatarImage || targetAvatarImage!} className="w-full h-full object-cover" alt="Avatar" />
                  ) : (
                    getInitials(isEditMode ? editedProfile.displayName : (user.displayName || 'U'))
                  )}
                </div>

                {/* Change Avatar Button */}
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
                      className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-sm border-2 border-white"
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
                    className="w-full text-white text-[15px] font-semibold bg-[#0f0f0f] border border-white/10 rounded-md px-2 py-1 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    placeholder="Display name"
                  />
                ) : (
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-white text-[15px] font-semibold">
                      {variant === 'owner' && profile ? profile.username : user.displayName}
                    </h3>
                    {(variant === 'owner' ? isAuthenticated : user.isActive) && (
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    )}
                  </div>
                )}
              </div>

              {/* @handle — falls back to @username if no handle set */}
              {!isEditMode && (() => {
                const handle = variant === 'owner'
                  ? (profile?.handle || profile?.username)
                  : (targetHandle || user.username);
                return handle ? (
                  <p className="text-[11px] text-purple-400/80 font-medium mb-1">@{handle}</p>
                ) : null;
              })()}

              {/* Online status */}
              {!isEditMode && (
                <div className="mb-2">
                  <p className="text-xs text-gray-500">
                    {user.isActive ? 'Online' : 'Offline'}
                  </p>
                </div>
              )}

              {/* Badge */}
              {!isEditMode && (
                <div className="inline-flex items-center gap-1 bg-gradient-to-r from-orange-500/20 to-orange-400/10 px-2 py-0.5 rounded-full mb-2.5">
                  <div className="w-3 h-3 bg-orange-400 rounded-full flex items-center justify-center">
                    <span className="text-white text-[7px] font-bold">★</span>
                  </div>
                  <span className="text-orange-400 text-[10px] font-semibold">New Cadet</span>
                </div>
              )}

              {/* Bio */}
              <div className="mb-2.5">
                {isEditMode ? (
                  <textarea
                    value={editedProfile.bio}
                    onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    className="w-full text-xs text-gray-300 bg-[#0f0f0f] border border-white/10 rounded-md px-2 py-1.5 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none min-h-[50px]"
                    rows={2}
                  />
                ) : (
                  <p className="text-xs text-gray-400 leading-relaxed">{editedProfile.bio}</p>
                )}
              </div>

              {/* ── SOCIAL LINKS ── */}
              {(socialLinks.length > 0 || (variant === 'owner' && isEditMode)) && (
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-[8px] font-semibold text-gray-500 uppercase tracking-wide">Social</h4>
                    {variant === 'owner' && isEditMode && (
                      <span className="text-[9px] text-gray-500">Tap icon to remove • + to add</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {socialLinks.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (variant === 'owner' && isEditMode) {
                            removeLink(i);
                          } else {
                            const href = url.startsWith('http') ? url : `https://${url}`;
                            window.open(href, '_blank');
                          }
                        }}
                        title={variant === 'owner' && isEditMode ? `Remove ${getSocialName(url)}` : getSocialName(url)}
                        className={`relative w-8 h-8 ${getSocialBg(url)} rounded-full flex items-center justify-center transition-all group hover:opacity-80 overflow-hidden`}
                      >
                        <SocialLinkIcon url={url} />
                        {variant === 'owner' && isEditMode && (
                          <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/40 rounded-full flex items-center justify-center transition-all">
                            <X className="w-2.5 h-2.5 text-white opacity-0 group-hover:opacity-100" />
                          </div>
                        )}
                      </button>
                    ))}

                    {/* Add link button (owner, edit mode) */}
                    {variant === 'owner' && isEditMode && (
                      <button
                        onClick={() => setIsAddingLink(true)}
                        className="w-8 h-8 border-2 border-dashed border-white/25 hover:border-purple-400/60 rounded-full flex items-center justify-center transition-all text-white/30 hover:text-purple-400"
                      >
                        <span className="text-lg leading-none mb-0.5">+</span>
                      </button>
                    )}
                  </div>

                  {/* URL input panel */}
                  <AnimatePresence>
                    {isAddingLink && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 overflow-hidden"
                      >
                        <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                          <p className="text-[10px] font-semibold text-purple-400 mb-1">Add Social Link</p>
                          <input
                            type="url"
                            value={newLinkUrl}
                            onChange={(e) => setNewLinkUrl(e.target.value)}
                            placeholder="https://instagram.com/username"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') addLink();
                              if (e.key === 'Escape') { setIsAddingLink(false); setNewLinkUrl(''); }
                            }}
                            className="w-full text-xs text-white bg-[#0f0f0f] border border-white/10 rounded-md px-2 py-1 mb-1.5 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                          />

                          {/* Platform preview */}
                          {newLinkUrl.trim() && (
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <div className={`w-5 h-5 ${getSocialBg(newLinkUrl)} rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                                <SocialLinkIcon url={newLinkUrl} />
                              </div>
                              <span className="text-[10px] text-gray-400">{getSocialName(newLinkUrl)} détecté</span>
                            </div>
                          )}

                          <div className="flex gap-1">
                            <button
                              onClick={addLink}
                              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-medium py-1 rounded-md flex items-center justify-center gap-0.5 transition-colors"
                            >
                              <Check className="w-2.5 h-2.5" />
                              Add
                            </button>
                            <button
                              onClick={() => { setIsAddingLink(false); setNewLinkUrl(''); }}
                              className="flex-1 bg-[#252525] hover:bg-[#303030] text-gray-300 text-[10px] font-medium py-1 rounded-md transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS — fixed at bottom */}
            <div className="px-3.5 pb-2.5 pt-2 border-t border-white/10 flex-shrink-0 bg-[#1a1a1a]">
              {variant === 'owner' ? (
                <>
                  {isEditMode ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="flex-1 bg-[#252525] hover:bg-[#303030] text-gray-300 font-medium py-1.5 rounded-lg transition-all text-xs disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 text-xs disabled:opacity-50"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 text-xs"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit Profile
                    </button>
                  )}
                </>
              ) : (
                <>
                  {/* Report panel */}
                  <AnimatePresence>
                    {isReporting && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-2 overflow-hidden"
                      >
                        {reportSent ? (
                          <div className="flex items-center justify-center gap-2 py-3 text-green-400 text-xs font-medium">
                            <Check className="w-4 h-4" />
                            Signalement envoyé
                          </div>
                        ) : (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">
                            <p className="text-[10px] font-semibold text-red-400 mb-2">Signaler ce profil</p>
                            <div className="space-y-1 mb-2">
                              {REPORT_REASONS.map((reason) => (
                                <button
                                  key={reason}
                                  onClick={() => setReportReason(reason)}
                                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-all ${
                                    reportReason === reason
                                      ? 'bg-red-500/30 text-red-300'
                                      : 'text-gray-400 hover:bg-white/5'
                                  }`}
                                >
                                  {reason}
                                  {reportReason === reason && <Check className="w-3 h-3 text-red-400" />}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => { setIsReporting(false); setReportReason(''); }}
                                className="flex-1 bg-[#252525] text-gray-300 text-[10px] font-medium py-1 rounded-md"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={handleReport}
                                disabled={!reportReason}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-[10px] font-medium py-1 rounded-md flex items-center justify-center gap-1 transition-colors"
                              >
                                <Flag className="w-2.5 h-2.5" />
                                Signaler
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Message + Report buttons */}
                  <div className="flex gap-1.5">
                    {targetAllowsDms ? (
                      <button
                        onClick={onMessage}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 text-xs"
                      >
                        <MessageCircle className="w-3 h-3" />
                        Message
                      </button>
                    ) : (
                      <div
                        title="Cet utilisateur n'accepte pas les messages privés"
                        className="flex-1 bg-secondary text-muted-foreground font-medium py-1.5 rounded-lg flex items-center justify-center gap-1 text-xs cursor-not-allowed opacity-60"
                      >
                        <MessageSquareOff className="w-3 h-3" />
                        DMs désactivés
                      </div>
                    )}
                    <button
                      onClick={() => setIsReporting(!isReporting)}
                      title="Signaler ce profil"
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center justify-center border text-xs ${
                        isReporting
                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                          : 'bg-[#252525] border-white/10 text-gray-400 hover:border-red-500/40 hover:text-red-400'
                      }`}
                    >
                      <Flag className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
