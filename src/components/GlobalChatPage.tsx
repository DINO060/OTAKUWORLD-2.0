import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { MessageCircle, Menu, Smile, Hash, Send, User, X, Search, Trash2, Heart, MoreVertical, Pencil, AtSign, CornerUpLeft, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProfileCard from './ProfileCard';
const EmojiPicker = lazy(() => import('./EmojiPicker'));
const GifPickerModal = lazy(() => import('./GifPickerModal'));
import { getStickerById } from '../data/stickers';
import ReportModal from './ReportModal';
import AuthModal from './AuthModal';
import { supabase } from '../lib/supabase';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import type { GifPayload } from '../types';

interface GlobalChatPageProps {
  onOpenSettings?: () => void;
  onOpenMenu: () => void;
  onNavigateToChat: (userId: string) => void;
}

export default function GlobalChatPage({ onOpenMenu, onNavigateToChat, onOpenSettings }: GlobalChatPageProps) {
  const {
    messages,
    filteredMessages: contextFilteredMessages,
    sendMessage,
    deleteMessage,
    selectedHashtag,
    setSelectedHashtag,
    getUserById: getChatUserById,
    currentUser,
    isLoading: messagesLoading,
    activeUsers,
    getHashtags,
    users,
    toggleReaction,
    getMessageReactions,
    editMessage,
  } = useChat();

  const { requireAuth, isAuthenticated, profile, user } = useAuth();

  // Feed-specific state
  const [inputText, setInputText] = useState('');
  const [selectedUserProfile, setSelectedUserProfile] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isHashtagPanelOpen, setIsHashtagPanelOpen] = useState(false);
  const [hashtagSearchQuery, setHashtagSearchQuery] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isProfileCardOpen, setIsProfileCardOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const [messageMenuOpen, setMessageMenuOpen] = useState<string | null>(null);
  const [reactionPickerOpen, setReactionPickerOpen] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyTo, setReplyTo] = useState<{ messageId: string; username: string; text: string } | null>(null);
  const [reportModal, setReportModal] = useState<{ userId: string; username: string; messageId: string; messageText: string } | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionNotifs, setMentionNotifs] = useState<Set<string>>(new Set());
  const [readMentions, setReadMentions] = useState<Set<string>>(new Set());
  const [showMentionPanel, setShowMentionPanel] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Managed ads
  interface ManagedAd { id: string; emoji: string; label: string; title: string; body?: string | null; cta: string; href: string; media_type?: string; media_url?: string | null; }
  const [managedAds, setManagedAds] = useState<ManagedAd[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [currentMediaAdIndex, setCurrentMediaAdIndex] = useState(0);

  // DB @handle search
  const [dbUserResults, setDbUserResults] = useState<Array<{ id: string; username: string; handle: string; avatarUrl: string | null }>>([]);
  const [dbSearching, setDbSearching] = useState(false);
  const [selectedDbUser, setSelectedDbUser] = useState<{ id: string; username: string; handle: string } | null>(null);

  // Fetch ads
  useEffect(() => {
    const fetchAds = () => {
      supabase
        .from('managed_ads')
        .select('id, emoji, label, title, body, cta, href, media_type, media_url')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .then(({ data }) => { if (data) setManagedAds(data as ManagedAd[]); });
    };
    fetchAds();
    const channel = supabase
      .channel('managed_ads_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'managed_ads' }, () => fetchAds())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const textAds = managedAds;
  const mediaAds = managedAds.filter(a => a.media_url && a.media_type && a.media_type !== 'none');

  useEffect(() => {
    if (textAds.length <= 1) return;
    const timer = setInterval(() => setCurrentAdIndex(i => (i + 1) % textAds.length), 5000);
    return () => clearInterval(timer);
  }, [textAds.length]);

  useEffect(() => {
    if (mediaAds.length <= 1) return;
    const timer = setInterval(() => setCurrentMediaAdIndex(i => (i + 1) % mediaAds.length), 8000);
    return () => clearInterval(timer);
  }, [mediaAds.length]);

  const currentMediaAd = mediaAds.length > 0 ? mediaAds[currentMediaAdIndex % mediaAds.length] : null;
  const currentMediaAdYoutubeId = currentMediaAd?.media_url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [contextFilteredMessages]);

  // Detect @mentions
  useEffect(() => {
    const myName = profile?.username || currentUser?.username;
    const myId = user?.id || currentUser?.id;
    if (!myName) return;
    const escaped = myName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mentioned = new Set<string>();
    messages.forEach(msg => {
      if (msg.userId === myId) return;
      const mentionPattern = new RegExp(`@${escaped}(?:\\s|$|[^\\w])`, 'i');
      if (mentionPattern.test(msg.text + ' ')) mentioned.add(msg.id);
      if (msg.replyTo?.username?.toLowerCase() === myName.toLowerCase()) mentioned.add(msg.id);
    });
    setMentionNotifs(mentioned);
  }, [messages, profile?.username, currentUser?.username, user?.id, currentUser?.id]);

  const scrollToMessage = (messageId: string) => {
    const el = messageRefs.current.get(messageId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-blue-400');
      setTimeout(() => el.classList.remove('ring-2', 'ring-blue-400'), 2000);
    }
    const newRead = new Set([...readMentions, messageId]);
    setReadMentions(newRead);
    const remaining = [...mentionNotifs].filter(id => !newRead.has(id)).length;
    if (remaining === 0) setShowMentionPanel(false);
  };

  const unreadMentionIds = [...mentionNotifs].filter(id => !readMentions.has(id));
  const unreadMentionCount = unreadMentionIds.length;
  const mentionedMessages = messages.filter(m => unreadMentionIds.includes(m.id));

  const getUserById = (userId: string) => getChatUserById(userId);
  const getInitials = (username: string) => {
    const name = username.startsWith('user_') ? 'AN' : username.slice(0, 2).toUpperCase();
    return name;
  };
  const getDisplayName = (username: string) => username.startsWith('user_') ? 'Anonyme' : username;

  // Send / edit message
  const handleSendMessage = async () => {
    if (inputText.trim() === '') return;
    if (editingMessageId) {
      await editMessage(editingMessageId, inputText);
      setEditingMessageId(null);
      setInputText('');
      return;
    }
    if (!requireAuth('Sign in to send messages')) return;
    await sendMessage(
      inputText,
      replyTo ? { messageId: replyTo.messageId, username: replyTo.username, text: replyTo.text } : undefined,
    );
    setInputText('');
    setReplyTo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSendMessage();
    if (e.key === 'Escape') setShowMentions(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setIsEmojiPickerOpen(false);
    inputRef.current?.focus();
  };

  const handleGifSelect = async (payload: GifPayload) => {
    if (!requireAuth('Sign in to send GIFs')) return;
    await sendMessage(JSON.stringify(payload), undefined, 'gif');
    setIsGifPickerOpen(false);
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editText.trim()) return;
    await editMessage(messageId, editText);
    setEditingMessageId(null);
    setEditText('');
  };

  const handleCloseMenus = () => {
    setReactionPickerOpen(null);
    setMessageMenuOpen(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);
    setIsTyping(value.length > 0);
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = value.slice(lastAtIndex + 1);
      if (textAfterAt === '' || /^\w*$/.test(textAfterAt)) {
        setMentionQuery(textAfterAt.toLowerCase());
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (username: string) => {
    const lastAtIndex = inputText.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const newText = inputText.slice(0, lastAtIndex) + `@${username} `;
      setInputText(newText);
    }
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const getMentionUsers = () => {
    const allUsers = Array.from(users.values());
    if (!mentionQuery) return allUsers.slice(0, 5);
    return allUsers.filter(u => u.username.toLowerCase().includes(mentionQuery)).slice(0, 5);
  };

  const quickReactions = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

  const highlightHashtags = (text: string) => {
    const parts = text.split(/(#\w+|@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        const isActive = selectedHashtag === part;
        return (
          <motion.span
            key={index}
            onClick={() => setSelectedHashtag(isActive ? null : part)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold cursor-pointer transition-all ${
              isActive ? 'bg-purple-600 text-white shadow-md' : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
            }`}
          >
            {part}
          </motion.span>
        );
      }
      if (part.startsWith('@')) {
        return (
          <span
            key={index}
            className="text-blue-400 font-semibold hover:underline cursor-pointer"
            onClick={() => {
              const username = part.slice(1);
              const foundUser = Array.from(users.values()).find(
                u => u.username.toLowerCase() === username.toLowerCase()
              );
              if (foundUser) setSelectedUserProfile(foundUser.id);
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const filteredMessages = contextFilteredMessages;

  const getAllHashtags = (): string[] => {
    const hashtagSet = new Set<string>();
    messages.forEach(msg => {
      const hashtags = msg.text.match(/#\w+/g);
      if (hashtags) hashtags.forEach(tag => hashtagSet.add(tag));
    });
    return Array.from(hashtagSet);
  };

  const getPopularHashtags = (): { tag: string; count: number }[] => {
    const hashtagCounts: { [key: string]: number } = {};
    messages.forEach(msg => {
      const hashtags = msg.text.match(/#\w+/g);
      if (hashtags) hashtags.forEach(tag => { hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1; });
    });
    return Object.entries(hashtagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  };

  const getActiveUsers = () => {
    const userIds = new Set(messages.map(msg => msg.userId));
    return Array.from(users.values()).filter(u => userIds.has(u.id));
  };

  const isHashtagSearch = hashtagSearchQuery.trim().startsWith('#');
  const isAtSearch = hashtagSearchQuery.trim().startsWith('@');
  const isUserSearch = hashtagSearchQuery.trim().length > 0 && !isHashtagSearch && !isAtSearch;

  // DB @handle search effect
  useEffect(() => {
    if (!isAtSearch) { setDbUserResults([]); return; }
    const handleQuery = hashtagSearchQuery.trim().slice(1);
    if (handleQuery.length < 1) { setDbUserResults([]); return; }
    const t = setTimeout(async () => {
      setDbSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, username, handle, avatar_url')
        .ilike('handle', `%${handleQuery}%`)
        .limit(10);
      setDbUserResults((data || []).map((r: any) => ({ id: r.id, username: r.username, handle: r.handle || '', avatarUrl: r.avatar_url || null })));
      setDbSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [hashtagSearchQuery, isAtSearch]);

  const colorFromId = (id: string) => {
    const palette = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return palette[hash % palette.length];
  };

  const getFilteredHashtags = (): { tag: string; count: number }[] => {
    const popular = getPopularHashtags();
    if (!isHashtagSearch) return popular.slice(0, 5);
    const query = hashtagSearchQuery.toLowerCase().replace(/^#/, '');
    return popular.filter(({ tag }) => tag.toLowerCase().includes(query));
  };

  const getFilteredUsers = () => {
    if (!isUserSearch) return [];
    const query = hashtagSearchQuery.toLowerCase();
    return getActiveUsers().filter(user => user.username.toLowerCase().includes(query));
  };

  const handleHashtagSelect = (hashtag: string) => {
    setSelectedHashtag(hashtag);
    setSelectedUserFilter(null);
    setHashtagSearchQuery('');
    setIsHashtagPanelOpen(false);
    setShowSuggestions(false);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserFilter(userId);
    setSelectedHashtag(null);
    setHashtagSearchQuery('');
    setIsHashtagPanelOpen(false);
    setShowSuggestions(false);
  };

  const handleSearchChange = (value: string) => {
    setHashtagSearchQuery(value);
    setShowSuggestions(value.trim().length > 0);
    if (value.startsWith('#')) {
      const normalizedValue = value;
      const allHashtags = getAllHashtags();
      if (allHashtags.includes(normalizedValue)) {
        setSelectedHashtag(normalizedValue);
        setSelectedUserFilter(null);
      }
    }
  };

  return (
    <>
      {/* Global Chat Header */}
      <div className="flex-shrink-0 px-3 py-2.5 border-b flex items-center gap-3" style={{ background: '#0e1621', borderColor: 'rgba(255,255,255,0.06)' }}>
        <button onClick={onOpenMenu} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0">
          <Menu className="w-5 h-5 text-gray-300" />
        </button>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#2ecc71' }}>
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-bold text-base leading-tight">Global Chat</h2>
          <p className="text-gray-500 text-xs">{activeUsers.toLocaleString()} en ligne</p>
        </div>
      </div>

      {/* Ad Banner */}
      {textAds.length > 0 && (() => {
        const ad = textAds[currentAdIndex % textAds.length];
        return (
          <a
            href={ad.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b transition-colors hover:opacity-80"
            style={{ background: '#0a1929', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            {ad.emoji && <span style={{ fontSize: '14px' }}>{ad.emoji}</span>}
            <span className="flex-1 min-w-0 truncate" style={{ fontSize: '12px', color: '#8899aa' }}>
              <span style={{ fontWeight: 700, color: '#e8e8ed' }}>{ad.title}</span>
              {ad.body ? ` — ${ad.body}` : ''}
            </span>
            <span className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-bold" style={{ background: '#3b82f6', color: '#fff' }}>
              {ad.cta}
            </span>
          </a>
        );
      })()}

      {/* Media Ad Banner */}
      {currentMediaAd && (
        <div className="flex-shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {currentMediaAd.media_type === 'video' && currentMediaAdYoutubeId ? (
            <iframe
              src={`https://www.youtube.com/embed/${currentMediaAdYoutubeId}?autoplay=0&mute=1`}
              className="w-full border-0"
              style={{ height: '96px' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              allowFullScreen
              title="Ad"
            />
          ) : currentMediaAd.media_type === 'image' && currentMediaAd.media_url ? (
            <a href={currentMediaAd.href} target="_blank" rel="noopener noreferrer">
              <img src={currentMediaAd.media_url} alt={currentMediaAd.title} className="w-full object-cover" style={{ maxHeight: '96px' }} />
            </a>
          ) : null}
        </div>
      )}

      <main className="flex-1 overflow-hidden flex" onClick={handleCloseMenus}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 pt-2 sm:pt-4 pb-0">
        {/* Active Filter Badge */}
        <AnimatePresence>
          {selectedHashtag && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 flex justify-center"
            >
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-full px-5 py-2.5 flex items-center gap-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-white" strokeWidth={2.5} />
                  <span className="text-white text-sm font-semibold">{selectedHashtag}</span>
                </div>
                <div className="flex items-center gap-1">
                  <motion.button
                    onClick={() => { setSelectedHashtag(null); setIsHashtagPanelOpen(true); }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="text-white/80 hover:text-white text-xs font-medium px-2 py-1 rounded-md hover:bg-white/10 transition-all"
                  >
                    Change
                  </motion.button>
                  <div className="w-px h-4 bg-white/30"></div>
                  <motion.button
                    onClick={() => setSelectedHashtag(null)}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-all"
                  >
                    <X className="w-4 h-4" strokeWidth={2.5} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="max-w-xl mx-auto space-y-2">
          {filteredMessages.map((message) => {
            const msgUser = getUserById(message.userId);
            if (!msgUser) return null;
            const isCurrentUser = msgUser.isCurrentUser;

            return (
              <React.Fragment key={message.id}>
              <motion.div
                ref={(el: HTMLDivElement | null) => { if (el) messageRefs.current.set(message.id, el); }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} transition-all duration-300`}
              >
                {/* Avatar */}
                <div
                  onClick={() => setSelectedUserProfile(msgUser.id)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-blue-400 transition-all"
                  style={{ backgroundColor: msgUser.avatarColor }}
                >
                  {getInitials(msgUser.username)}
                </div>

                {/* Message Bubble */}
                <div className={`min-w-0 max-w-[85%] ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col`}>
                  {/* Message Content with Menu */}
                  <div className="relative group flex items-end gap-1 flex-row">
                    <div className="relative min-w-0">
                      {message.contentType === 'gif' ? (() => {
                        let gifData: GifPayload = { mp4: '', gif: message.text, title: 'GIF' };
                        try {
                          const parsed = JSON.parse(message.text);
                          if (parsed && typeof parsed === 'object' && (parsed.gif || parsed.mp4)) {
                            gifData = parsed as GifPayload;
                          }
                        } catch { /* legacy URL */ }

                        if (gifData.mediaKind === 'sticker') {
                          return (
                            <div className="py-1">
                              <img src={gifData.gif} alt={gifData.title} className="w-28 h-28 object-contain" loading="lazy" />
                            </div>
                          );
                        }

                        return (
                          <div className={`rounded-2xl overflow-hidden ${isCurrentUser ? 'rounded-br-sm' : 'rounded-bl-sm'}`} style={{ maxWidth: '200px' }}>
                            {gifData.mp4 ? (
                              <video src={gifData.mp4} autoPlay loop muted playsInline className="w-full rounded-2xl block" />
                            ) : (
                              <img src={gifData.gif} alt={gifData.title} className="w-full max-h-[180px] object-cover rounded-2xl" loading="lazy" />
                            )}
                          </div>
                        );
                      })() : message.contentType === 'sticker' ? (
                        <div className="text-6xl leading-none py-1">
                          {getStickerById(message.text)?.emoji || message.text}
                        </div>
                      ) : (
                      <div
                        className={`relative px-3 pt-2 pb-5 rounded-xl w-full overflow-hidden ${isCurrentUser ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                        style={{ backgroundColor: isCurrentUser ? '#2b5278' : '#212d3b' }}
                      >
                        <p className="text-xs font-bold mb-0.5" style={{ color: isCurrentUser ? '#7eb8e6' : msgUser.avatarColor || '#6ab3f3' }}>
                          {getDisplayName(msgUser.username)}
                        </p>

                        {message.replyTo && (
                          <div
                            className="rounded px-2 py-1 mb-1.5 border-l-2"
                            style={{ borderColor: isCurrentUser ? '#7eb8e6' : msgUser.avatarColor || '#6ab3f3', backgroundColor: 'rgba(255,255,255,0.06)' }}
                          >
                            <p className="text-[11px] font-bold" style={{ color: isCurrentUser ? '#7eb8e6' : msgUser.avatarColor || '#6ab3f3' }}>
                              {message.replyTo.username}
                            </p>
                            <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
                              {message.replyTo.text}
                            </p>
                          </div>
                        )}

                        <p className="text-sm leading-relaxed break-all text-white" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere', paddingRight: isCurrentUser ? 20 : 0 }}>
                          {highlightHashtags(message.text)}
                        </p>

                        {/* Timestamp inside bubble — Telegram style */}
                        <div style={{ position: 'absolute', bottom: 4, right: 8, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{message.timestamp}</span>
                          {isCurrentUser && (
                            <svg width="15" height="11" viewBox="0 0 16 11" fill="none" style={{ color: '#5bb8f6', flexShrink: 0 }}>
                              <path d="M11.5 1L5.5 8L3 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M14.5 1L8.5 8L7.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>

                        {isCurrentUser && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setMessageMenuOpen(messageMenuOpen === message.id ? null : message.id); }}
                            className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 w-5 h-5 bg-white/20 hover:bg-white/35 rounded-full flex items-center justify-center transition-all"
                          >
                            <MoreVertical className="w-3 h-3 text-white" />
                          </button>
                        )}
                      </div>
                      )}

                      {/* Reaction Picker */}
                      <AnimatePresence>
                        {reactionPickerOpen === message.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className={`absolute bottom-full mb-2 ${isCurrentUser ? 'right-0' : 'left-0'} z-50`}
                          >
                            <div className="bg-card border border-border rounded-xl shadow-xl p-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                              {quickReactions.map((emoji) => (
                                <motion.button
                                  key={emoji}
                                  onClick={() => { toggleReaction(message.id, emoji); setReactionPickerOpen(null); }}
                                  whileHover={{ scale: 1.3 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-secondary rounded-lg transition-colors"
                                >
                                  {emoji}
                                </motion.button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Message Options Menu */}
                      <AnimatePresence>
                        {messageMenuOpen === message.id && isCurrentUser && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`absolute top-full mt-1 ${isCurrentUser ? 'right-0' : 'left-0'} z-50`}
                          >
                            <div className="bg-card border border-border rounded-lg shadow-xl overflow-hidden min-w-[130px]" onClick={(e) => e.stopPropagation()}>
                              {message.contentType === 'text' && (
                                <button
                                  onClick={() => {
                                    setEditingMessageId(message.id);
                                    setInputText(message.text);
                                    setMessageMenuOpen(null);
                                    setReplyTo(null);
                                    setTimeout(() => inputRef.current?.focus(), 50);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-foreground hover:bg-secondary transition-colors text-left"
                                >
                                  <Pencil className="w-4 h-4" />
                                  <span className="text-sm">Edit</span>
                                </button>
                              )}
                              <button
                                onClick={async () => { await deleteMessage(message.id); setMessageMenuOpen(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-500/10 transition-colors text-left"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="text-sm">Delete</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Reaction Button */}
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); setReactionPickerOpen(reactionPickerOpen === message.id ? null : message.id); }}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 4 }}
                    >
                      <Heart style={{ width: 13, height: 13, color: '#8899aa' }} />
                    </motion.button>

                    {/* Reply Button */}
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplyTo({ messageId: message.id, username: msgUser.username, text: message.text });
                        setEditingMessageId(null);
                        setEditText('');
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 4 }}
                    >
                      <CornerUpLeft style={{ width: 13, height: 13, color: '#8899aa' }} />
                    </motion.button>

                    {/* Report Button */}
                    {!isCurrentUser && (
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportModal({ userId: msgUser.id, username: msgUser.username, messageId: message.id, messageText: message.text });
                        }}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 4 }}
                      >
                        <Flag style={{ width: 13, height: 13, color: '#8899aa' }} />
                      </motion.button>
                    )}
                  </div>

                  {/* Reactions Display */}
                  {(() => {
                    const msgReactions = getMessageReactions(message.id);
                    if (msgReactions.length === 0) return null;
                    return (
                      <div className={`flex flex-wrap gap-1 mt-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                        {msgReactions.map((reaction) => (
                          <motion.button
                            key={reaction.emoji}
                            onClick={() => toggleReaction(message.id, reaction.emoji)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                              reaction.hasReacted
                                ? 'bg-purple-600/30 border border-purple-500'
                                : 'bg-secondary border border-transparent hover:border-border'
                            }`}
                          >
                            <span>{reaction.emoji}</span>
                            <span className="text-muted-foreground">{reaction.count}</span>
                          </motion.button>
                        ))}
                      </div>
                    );
                  })()}

                </div>
              </motion.div>
              </React.Fragment>
            );
          })}
        </div>

        <div ref={messagesEndRef} />

        {/* Empty state */}
        {filteredMessages.length === 0 && (
          <div className="text-center mt-12">
            <p className="text-foreground text-lg font-semibold mb-2">No messages found</p>
            <p className="text-muted-foreground text-sm">Try a different hashtag filter</p>
          </div>
        )}
      </div>{/* end messages scroll area */}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col w-64 flex-shrink-0 border-l overflow-y-auto" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0e1621' }}>
        {/* Online users */}
        <div className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#8888a0' }}>
            En ligne — {activeUsers}
          </p>
          <div className="space-y-2">
            {Array.from(users.values()).slice(0, 15).map(u => (
              <div key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 rounded-lg px-2 py-1 transition-colors"
                onClick={() => setSelectedUserProfile(u.id)}>
                <div className="relative flex-shrink-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                    style={{ background: u.avatarColor }}>
                    {getInitials(u.username)}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0e1621]" style={{ background: '#22c55e' }} />
                </div>
                <span className="text-[13px] font-medium truncate" style={{ color: '#c8c8d8' }}>{getDisplayName(u.username)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t mx-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />

        {/* Trending hashtags */}
        <div className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#8888a0' }}>
            Trending
          </p>
          <div className="space-y-1">
            {getHashtags().slice(0, 10).map(({ tag, count }) => (
              <button key={tag} onClick={() => handleHashtagSelect(tag)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left"
                style={{ background: selectedHashtag === tag ? 'rgba(168,85,247,0.1)' : 'transparent' }}>
                <span className="text-[13px] font-semibold" style={{ color: selectedHashtag === tag ? '#a855f7' : '#a0a0b8' }}>{tag}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#8888a0' }}>{count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      </main>{/* end main flex */}

      {/* Mention Notifications Panel */}
      <AnimatePresence>
        {showMentionPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMentionPanel(false)}
              className="fixed inset-0 bg-black/30 z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl max-h-[60vh] flex flex-col"
              style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 font-bold">@</span>
                  <h3 className="text-sm font-bold text-white">Mentions ({mentionNotifs.size})</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setShowMentionPanel(false); setIsHashtagPanelOpen(true); }}
                    className="px-3 py-1 rounded-lg text-xs font-semibold"
                    style={{ background: 'rgba(255,255,255,0.08)', color: '#a0a0b0' }}
                  >
                    # Hashtags
                  </button>
                  <button onClick={() => setShowMentionPanel(false)} className="text-white/50 hover:text-white text-lg">&times;</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {mentionedMessages.length === 0 ? (
                  <p className="text-center text-sm py-6" style={{ color: '#8888a0' }}>Aucune mention</p>
                ) : (
                  mentionedMessages.map(msg => {
                    const msgUser = getChatUserById(msg.userId);
                    return (
                      <div
                        key={msg.id}
                        onClick={() => scrollToMessage(msg.id)}
                        className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                          style={{ backgroundColor: msgUser?.avatarColor || '#6c5ce7' }}
                        >
                          {msgUser?.avatarImage ? (
                            <img src={msgUser.avatarImage} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            (msgUser?.username || '?').slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-white">{getDisplayName(msgUser?.username || 'Unknown')}</span>
                            <span className="text-[10px]" style={{ color: '#555570' }}>{msg.timestamp}</span>
                          </div>
                          <p className="text-xs truncate" style={{ color: '#c8c8d0' }}>{msg.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hashtag Filter Panel */}
      <AnimatePresence>
        {isHashtagPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsHashtagPanelOpen(false)}
              className="fixed inset-0 bg-black/20 z-40"
            />
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-[148px] right-3 sm:right-5 z-50 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2.5rem)] max-w-[320px]"
            >
              <div className="bg-card rounded-2xl shadow-2xl overflow-hidden border border-border">
                <div className="p-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={hashtagSearchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="#hashtag, @handle ou nom..."
                      className="w-full pl-12 pr-10 py-3 bg-secondary border-2 border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500 focus:bg-background transition-all"
                      autoFocus
                    />
                    <motion.button
                      onClick={() => { setIsHashtagPanelOpen(false); setHashtagSearchQuery(''); setShowSuggestions(false); }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary/70 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </motion.button>
                  </div>
                </div>

                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-white/10 max-h-[300px] overflow-y-auto"
                    >
                      {(isHashtagSearch || (!isHashtagSearch && !isUserSearch)) && getFilteredHashtags().length > 0 && (
                        <div className="px-2 py-2">
                          <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {isHashtagSearch ? 'Matching Hashtags' : 'Popular Hashtags'}
                          </p>
                          <div className="space-y-1">
                            {getFilteredHashtags().map(({ tag, count }, index) => (
                              <motion.button
                                key={tag}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => handleHashtagSelect(tag)}
                                whileHover={{ x: 4 }}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                                    <Hash className="w-4 h-4 text-purple-400" strokeWidth={2.5} />
                                  </div>
                                  <span className="text-sm font-medium text-foreground">{tag}</span>
                                </div>
                                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">{count}</span>
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )}

                      {isAtSearch && (
                        <div className="px-2 py-2">
                          <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <AtSign className="w-3 h-3" />
                            {dbSearching ? 'Recherche...' : `${dbUserResults.length} résultat${dbUserResults.length !== 1 ? 's' : ''}`}
                          </p>
                          {dbSearching && (
                            <div className="flex justify-center py-4">
                              <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                            </div>
                          )}
                          <div className="space-y-1">
                            {dbUserResults.map((u, index) => (
                              <motion.button
                                key={u.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => {
                                  setSelectedDbUser(u);
                                  setIsHashtagPanelOpen(false);
                                  setHashtagSearchQuery('');
                                  setShowSuggestions(false);
                                }}
                                whileHover={{ x: 4 }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-left"
                              >
                                {u.avatarUrl ? (
                                  <img src={u.avatarUrl} alt={u.username} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ backgroundColor: colorFromId(u.id) }}>
                                    {u.username.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{u.username}</p>
                                  <p className="text-xs text-purple-400/80 truncate">@{u.handle}</p>
                                </div>
                              </motion.button>
                            ))}
                            {!dbSearching && dbUserResults.length === 0 && hashtagSearchQuery.trim().length > 1 && (
                              <p className="text-xs text-muted-foreground px-3 py-3 text-center">Aucun utilisateur trouvé pour <span className="text-purple-400">{hashtagSearchQuery.trim()}</span></p>
                            )}
                          </div>
                        </div>
                      )}

                      {isUserSearch && getFilteredUsers().length > 0 && (
                        <div className="px-2 py-2">
                          <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Matching Users</p>
                          <div className="space-y-1">
                            {getFilteredUsers().map((u, index) => (
                              <motion.button
                                key={u.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => handleUserSelect(u.id)}
                                whileHover={{ x: 4 }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                              >
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                                  style={{ backgroundColor: u.avatarColor }}
                                >
                                  {getInitials(u.username)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{u.username}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {u.isCurrentUser ? 'Vous' : 'Actif dans le chat'}
                                  </p>
                                </div>
                                {!u.isCurrentUser && (
                                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                                )}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )}

                      {showSuggestions && !isAtSearch &&
                        ((isHashtagSearch && getFilteredHashtags().length === 0) ||
                         (isUserSearch && getFilteredUsers().length === 0)) && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="px-6 py-8 text-center"
                        >
                          <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-3">
                            {isHashtagSearch ? (
                              <Hash className="w-6 h-6 text-muted-foreground" />
                            ) : (
                              <User className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-sm font-medium text-foreground mb-1">
                            {isHashtagSearch ? 'No hashtags found' : 'No users found'}
                          </p>
                          <p className="text-xs text-muted-foreground">Try a different search term</p>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DB @handle search result ProfileCard */}
      {selectedDbUser && (
        <ProfileCard
          isOpen={true}
          onClose={() => setSelectedDbUser(null)}
          variant={selectedDbUser.id === user?.id ? 'owner' : 'user'}
          user={{
            id: selectedDbUser.id,
            username: selectedDbUser.username,
            displayName: selectedDbUser.username,
            avatarColor: colorFromId(selectedDbUser.id),
            isActive: false,
          }}
          onMessage={() => {
            onNavigateToChat(selectedDbUser.id);
            setSelectedDbUser(null);
          }}
        />
      )}

      {/* User Profile Popup */}
      {selectedUserProfile && (() => {
        const profileUser = getUserById(selectedUserProfile);
        if (!profileUser) return null;
        const isOwnProfile = profileUser.id === user?.id;
        return (
          <ProfileCard
            isOpen={true}
            onClose={() => setSelectedUserProfile(null)}
            variant={isOwnProfile ? 'owner' : 'user'}
            user={{
              id: profileUser.id,
              username: profileUser.username,
              displayName: profileUser.username,
              avatarColor: profileUser.avatarColor,
              isActive: !profileUser.isCurrentUser,
            }}
            onMessage={() => {
              onNavigateToChat(profileUser.id);
              setSelectedUserProfile(null);
            }}
          />
        );
      })()}

      {/* My Profile Card */}
      <ProfileCard
        isOpen={isProfileCardOpen}
        onClose={() => setIsProfileCardOpen(false)}
        variant="owner"
        user={{
          id: user?.id || '1',
          username: profile?.username || 'User',
          displayName: profile?.username || 'User',
          avatarColor: profile?.avatarColor || '#3b82f6',
          isActive: isAuthenticated,
        }}
        onOpenProfile={() => { setIsProfileCardOpen(false); onOpenSettings?.(); }}
      />

      {/* Emoji Picker */}
      <Suspense fallback={null}>
        <EmojiPicker
          isOpen={isEmojiPickerOpen}
          onClose={() => setIsEmojiPickerOpen(false)}
          onEmojiSelect={handleEmojiSelect}
        />
      </Suspense>

      {/* GIF Picker Modal */}
      <Suspense fallback={null}>
        <GifPickerModal
          isOpen={isGifPickerOpen}
          onClose={() => setIsGifPickerOpen(false)}
          onSelect={handleGifSelect}
        />
      </Suspense>

      {/* Mention Suggestions */}
      <AnimatePresence>
        {showMentions && getMentionUsers().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-[70px] left-4 right-4 z-50 max-w-[400px]"
          >
            <div className="bg-card rounded-xl border border-border shadow-xl overflow-hidden">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
                Mention someone
              </div>
              {getMentionUsers().map((mentionUser) => (
                <motion.button
                  key={mentionUser.id}
                  onClick={() => handleMentionSelect(mentionUser.username)}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                    style={{ backgroundColor: mentionUser.avatarColor }}
                  >
                    {mentionUser.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm text-foreground">@{mentionUser.username}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply Banner */}
      {replyTo && !editingMessageId && (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-1.5 bg-purple-600/20 border-t border-purple-500/40">
          <div className="flex items-center gap-2 min-w-0">
            <CornerUpLeft className="w-3 h-3 text-purple-400 flex-shrink-0" />
            <span className="text-xs text-purple-400 font-medium flex-shrink-0">Répondre à</span>
            <span className="text-xs text-foreground/80 font-semibold flex-shrink-0">@{replyTo.username}</span>
            <span className="text-xs text-muted-foreground truncate">· {replyTo.text}</span>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="p-0.5 hover:bg-white/10 rounded transition-colors flex-shrink-0 ml-2"
          >
            <X className="w-3.5 h-3.5 text-purple-400" />
          </button>
        </div>
      )}

      {/* Editing Banner */}
      {editingMessageId && (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-1.5 bg-blue-600/20 border-t border-blue-500/40">
          <div className="flex items-center gap-2">
            <Pencil className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-blue-400 font-medium">Editing message</span>
          </div>
          <button
            onClick={() => { setEditingMessageId(null); setInputText(''); }}
            className="p-0.5 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5 text-blue-400" />
          </button>
        </div>
      )}

      {/* Bottom Input Area */}
      <div className="flex-shrink-0 border-t flex items-center px-2 gap-1 z-30" style={{ background: '#0e1621', borderColor: 'rgba(255,255,255,0.06)', minHeight: 56 }}>
        <button
          onClick={() => { setIsEmojiPickerOpen(!isEmojiPickerOpen); setIsGifPickerOpen(false); }}
          style={{ width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: isEmojiPickerOpen ? '#6c5ce7' : 'transparent', transition: 'background 0.15s' }}
        >
          <Smile style={{ width: 20, height: 20, color: isEmojiPickerOpen ? '#fff' : '#8899aa' }} />
        </button>

        <button
          onClick={() => { setIsGifPickerOpen(!isGifPickerOpen); setIsEmojiPickerOpen(false); }}
          style={{ height: 44, paddingLeft: 10, paddingRight: 10, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: isGifPickerOpen ? '#6c5ce7' : 'transparent', fontSize: 12, fontWeight: 700, color: isGifPickerOpen ? '#fff' : '#8899aa', transition: 'background 0.15s' }}
        >
          GIF
        </button>

        <button
          onClick={() => { unreadMentionCount > 0 ? setShowMentionPanel(true) : setIsHashtagPanelOpen(true); }}
          onContextMenu={(e) => { e.preventDefault(); setIsHashtagPanelOpen(true); }}
          style={{ width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'transparent', position: 'relative' }}
        >
          <Hash style={{ width: 20, height: 20, color: '#8899aa' }} />
          {unreadMentionCount > 0 && (
            <span style={{ position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, background: '#ef4444', borderRadius: 8, fontSize: 9, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px' }}>
              {unreadMentionCount}
            </span>
          )}
        </button>

        <div className="flex-1 min-w-0 relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Message..."
            maxLength={500}
            style={{ width: '100%', background: '#1a2433', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '10px 16px', fontSize: 14, color: '#e8e8ed', outline: 'none' }}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { setIsEmojiPickerOpen(false); setIsGifPickerOpen(false); }}
          />
          {inputText.length > 400 && (
            <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-medium pointer-events-none ${inputText.length >= 490 ? 'text-red-500' : 'text-muted-foreground'}`}>
              {500 - inputText.length}
            </span>
          )}
        </div>

        <button
          onClick={handleSendMessage}
          style={{ width: 44, height: 44, borderRadius: 22, flexShrink: 0, background: 'linear-gradient(135deg, #4dc7d9, #66a6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(77,199,217,0.4)' }}
        >
          <Send style={{ width: 18, height: 18, color: '#fff' }} />
        </button>
      </div>

      {/* Report Modal */}
      {reportModal && (
        <ReportModal
          isOpen={true}
          onClose={() => setReportModal(null)}
          reportedUserId={reportModal.userId}
          reportedUsername={reportModal.username}
          reportedMessageId={reportModal.messageId}
          reportedMessageText={reportModal.messageText}
        />
      )}

      {/* Auth Modal */}
      <AuthModal />

      {/* Floating # FAB */}
      <button
        onClick={() => { unreadMentionCount > 0 ? setShowMentionPanel(true) : setIsHashtagPanelOpen(true); }}
        onContextMenu={(e) => { e.preventDefault(); setIsHashtagPanelOpen(true); }}
        style={{ position: 'fixed', bottom: 82, right: 14, zIndex: 9999 }}
        className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-2xl transition-shadow"
      >
        <Hash className="w-6 h-6 sm:w-8 sm:h-8 text-white" strokeWidth={2.5} />
        {unreadMentionCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center rounded-full text-white text-[10px] font-bold px-1 animate-pulse" style={{ background: '#ef4444' }}>
            {unreadMentionCount}
          </span>
        )}
      </button>
    </>
  );
}
