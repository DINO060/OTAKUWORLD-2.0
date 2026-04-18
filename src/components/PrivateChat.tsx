import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Smile, Send, Loader2, Check, CheckCheck, Sparkles, Pencil, Trash2, MoreVertical, X } from 'lucide-react';
import { motion } from 'motion/react';
import { usePrivateMessages } from '../contexts/PrivateMessagesContext';
import { useAuth } from '../contexts/AuthContext';
import { usePresence } from '../contexts/PresenceContext';
import EmojiPicker from './EmojiPicker';
import GifPickerModal from './GifPickerModal';
import StickerPicker from './StickerPicker';
import { getStickerById } from '../data/stickers';
import type { GifPayload } from '../types';

// Detect message kind from raw content string
function detectKind(content: string): 'gif' | 'sticker' | 'text' {
  if (content.startsWith('::sticker::')) return 'sticker';
  if (content.startsWith('{')) {
    try {
      const p = JSON.parse(content);
      if (p && (p.gif || p.mp4)) return 'gif';
    } catch { /* not JSON */ }
  }
  return 'text';
}

interface PrivateChatProps {
  onBack?: () => void;
  selectedUserId?: string;
}

export default function PrivateChat({ onBack, selectedUserId }: PrivateChatProps) {
  const { user } = useAuth();
  const { isOnline } = usePresence();
  const {
    messages,
    isLoadingMessages,
    currentParticipant,
    sendMessage,
    editMessage,
    deleteMessage,
    openConversation,
    closeConversation,
  } = usePrivateMessages();

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [messageMenuOpen, setMessageMenuOpen] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLoggedIn = !!user;

  useEffect(() => {
    if (selectedUserId) openConversation(selectedUserId);
    return () => { closeConversation(); };
  }, [selectedUserId, openConversation, closeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getInitials = (username: string) => username.slice(0, 2).toUpperCase();

  const closeAllPickers = () => {
    setIsEmojiPickerOpen(false);
    setIsGifPickerOpen(false);
    setIsStickerPickerOpen(false);
  };

  // ── Send handlers ───────────────────────────────────────────────────
  const [sendError, setSendError] = useState('');

  const handleSendMessage = async () => {
    if (!isLoggedIn || inputText.trim() === '' || isSending) return;
    setSendError('');
    setIsSending(true);
    const result = await sendMessage(inputText);
    setIsSending(false);
    if (result.error) {
      setSendError('Échec de l\'envoi. Réessayez.');
      setTimeout(() => setSendError(''), 3000);
    } else {
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (editingMessageId) handleSaveEdit();
      else handleSendMessage();
    }
    if (e.key === 'Escape' && editingMessageId) handleCancelEdit();
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputText(prev => prev + emoji);
    closeAllPickers();
    inputRef.current?.focus();
  };

  const handleGifSelect = async (payload: GifPayload) => {
    if (!isLoggedIn) return;
    closeAllPickers();
    await sendMessage(JSON.stringify(payload));
  };

  const handleStickerSelect = async (stickerId: string) => {
    if (!isLoggedIn) return;
    closeAllPickers();
    await sendMessage(`::sticker::${stickerId}`);
  };

  const handleStartEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditText(content);
    setMessageMenuOpen(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || !editingMessageId) return;
    await editMessage(editingMessageId, editText);
    setEditingMessageId(null);
    setEditText('');
  };

  const handleDelete = async (messageId: string) => {
    setMessageMenuOpen(null);
    await deleteMessage(messageId);
  };

  // ── Message content renderer ────────────────────────────────────────
  const renderContent = (content: string) => {
    const kind = detectKind(content);

    if (kind === 'sticker') {
      const id = content.replace('::sticker::', '');
      const sticker = getStickerById(id);
      return <div className="text-5xl leading-none py-1">{sticker?.emoji || id}</div>;
    }

    if (kind === 'gif') {
      let gifData: GifPayload = { mp4: '', gif: content, title: 'GIF' };
      try { gifData = JSON.parse(content) as GifPayload; } catch { /* use fallback */ }

      if (gifData.mediaKind === 'sticker') {
        return (
          <img
            src={gifData.gif}
            alt={gifData.title}
            className="w-28 h-28 object-contain"
            loading="lazy"
          />
        );
      }
      return (
        <div className="rounded-2xl overflow-hidden" style={{ maxWidth: 220 }}>
          {gifData.mp4 ? (
            <video src={gifData.mp4} autoPlay loop muted playsInline className="w-full rounded-2xl block" />
          ) : (
            <img src={gifData.gif} alt={gifData.title} className="w-full max-h-[180px] object-cover rounded-2xl" loading="lazy" />
          )}
        </div>
      );
    }

    return (
      <p className="text-sm sm:text-base leading-relaxed break-words">{content}</p>
    );
  };

  // ── Participant fallback ────────────────────────────────────────────
  const chatPartner = currentParticipant || {
    id: selectedUserId || '',
    username: 'Loading...',
    avatarColor: '#6b7280',
    isOnline: false,
  };

  const online = isOnline(chatPartner.id);

  return (
    <div className="h-full flex flex-col bg-background">

      {/* HEADER */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg flex-shrink-0 z-40">
        <div className="px-3 py-3 sm:px-4 sm:py-3.5 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>

          <div
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-md"
            style={{ backgroundColor: chatPartner.avatarColor }}
          >
            {getInitials(chatPartner.username)}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-base sm:text-lg truncate">{chatPartner.username}</h1>
            <p className="text-white/80 text-xs sm:text-sm flex items-center gap-1.5">
              {online && <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />}
              {online ? 'En ligne' : 'Hors ligne'}
            </p>
          </div>
        </div>
      </header>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5 space-y-3" onClick={() => { closeAllPickers(); setMessageMenuOpen(null); }}>
        {isLoadingMessages ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center px-6 py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Smile className="w-10 h-10 text-purple-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-foreground font-semibold text-lg mb-2">Aucun message</h3>
              <p className="text-muted-foreground text-sm">Envoyez le premier message !</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const kind = detectKind(message.content);
              const isMedia = kind !== 'text';

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-2 ${message.isOutgoing ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Incoming */}
                  {!message.isOutgoing && (
                    <>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-1"
                        style={{ backgroundColor: chatPartner.avatarColor }}
                      >
                        {getInitials(chatPartner.username)}
                      </div>
                      <div className="flex flex-col max-w-[75%] sm:max-w-[60%]">
                        {isMedia ? (
                          <div className="py-1">{renderContent(message.content)}</div>
                        ) : (
                          <div
                            className="rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            <p className="text-foreground text-sm sm:text-base leading-relaxed break-words">
                              {message.content}
                            </p>
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground mt-1 ml-1">{message.createdAt}</span>
                      </div>
                    </>
                  )}

                  {/* Outgoing */}
                  {message.isOutgoing && (
                    <div className="flex flex-col items-end max-w-[75%] sm:max-w-[60%]">
                      <div className="relative group">
                        {isMedia ? (
                          <div className="py-1">{renderContent(message.content)}</div>
                        ) : (
                          <div
                            className="rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm"
                            style={{ background: 'linear-gradient(135deg, #9333ea 0%, #6366f1 100%)' }}
                          >
                            <p className="text-white text-sm sm:text-base leading-relaxed break-words">
                              {message.content}
                            </p>
                          </div>
                        )}

                        {/* Three-dot menu button (own messages only, text only) */}
                        {!isMedia && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setMessageMenuOpen(messageMenuOpen === message.id ? null : message.id); closeAllPickers(); }}
                            className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 w-5 h-5 bg-white/20 hover:bg-white/35 rounded-full flex items-center justify-center transition-all"
                          >
                            <MoreVertical className="w-3 h-3 text-white" />
                          </button>
                        )}

                        {/* Context menu */}
                        {messageMenuOpen === message.id && (
                          <div
                            className="absolute right-0 bottom-full mb-1 z-50 rounded-xl shadow-xl overflow-hidden min-w-[130px]"
                            style={{ background: '#1e2535', border: '1px solid rgba(255,255,255,0.08)' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleStartEdit(message.id, message.content)}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-white/5 transition-colors text-left"
                            >
                              <Pencil className="w-4 h-4 text-blue-400" />
                              <span>Modifier</span>
                            </button>
                            <button
                              onClick={() => handleDelete(message.id)}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Supprimer</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 mt-1 mr-1">
                        <span className="text-xs text-muted-foreground">{message.createdAt}</span>
                        {message.readAt ? (
                          <CheckCheck className="w-3.5 h-3.5 text-purple-400" strokeWidth={2.5} />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-muted-foreground/50" strokeWidth={2.5} />
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Pickers */}
      <EmojiPicker isOpen={isEmojiPickerOpen} onClose={() => setIsEmojiPickerOpen(false)} onEmojiSelect={handleEmojiSelect} />
      <GifPickerModal isOpen={isGifPickerOpen} onClose={() => setIsGifPickerOpen(false)} onSelect={handleGifSelect} />
      <StickerPicker isOpen={isStickerPickerOpen} onClose={() => setIsStickerPickerOpen(false)} onStickerSelect={handleStickerSelect} />

      {/* Editing banner */}
      {editingMessageId && (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-1.5 border-t" style={{ background: 'rgba(37,99,235,0.12)', borderColor: 'rgba(59,130,246,0.3)' }}>
          <div className="flex items-center gap-2">
            <Pencil className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-blue-400 font-medium">Modification du message</span>
          </div>
          <button onClick={handleCancelEdit} className="p-0.5 hover:bg-white/10 rounded transition-colors">
            <X className="w-3.5 h-3.5 text-blue-400" />
          </button>
        </div>
      )}

      {/* Error feedback */}
      {sendError && (
        <div className="bg-red-500/10 border-t border-red-500/20 px-4 py-1.5 text-center">
          <span className="text-xs text-red-400">{sendError}</span>
        </div>
      )}

      {/* INPUT BAR */}
      <div className="bg-card border-t border-border px-3 py-3 sm:px-4 sm:py-3.5 flex-shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2">

          {/* Emoji */}
          <button
            onClick={(e) => { e.stopPropagation(); setIsEmojiPickerOpen(o => !o); setIsGifPickerOpen(false); }}
            disabled={!isLoggedIn}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all flex-shrink-0 ${
              isLoggedIn ? (isEmojiPickerOpen ? 'bg-purple-600' : 'bg-secondary hover:bg-accent') : 'bg-secondary opacity-50 cursor-not-allowed'
            }`}
          >
            <Smile className={`w-5 h-5 ${isEmojiPickerOpen ? 'text-white' : 'text-muted-foreground'}`} strokeWidth={2} />
          </button>

          {/* GIF */}
          <button
            onClick={(e) => { e.stopPropagation(); setIsGifPickerOpen(o => !o); setIsEmojiPickerOpen(false); setIsStickerPickerOpen(false); }}
            disabled={!isLoggedIn}
            className={`px-2 h-9 flex items-center justify-center rounded-xl transition-all flex-shrink-0 text-xs font-bold ${
              isLoggedIn ? (isGifPickerOpen ? 'bg-purple-600 text-white' : 'bg-secondary hover:bg-accent text-muted-foreground') : 'bg-secondary opacity-50 cursor-not-allowed text-muted-foreground'
            }`}
          >
            GIF
          </button>

          {/* Sticker */}
          <button
            onClick={(e) => { e.stopPropagation(); setIsStickerPickerOpen(o => !o); setIsEmojiPickerOpen(false); setIsGifPickerOpen(false); }}
            disabled={!isLoggedIn}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all flex-shrink-0 ${
              isLoggedIn ? (isStickerPickerOpen ? 'bg-purple-600' : 'bg-secondary hover:bg-accent') : 'bg-secondary opacity-50 cursor-not-allowed'
            }`}
          >
            <Sparkles className={`w-5 h-5 ${isStickerPickerOpen ? 'text-white' : 'text-muted-foreground'}`} strokeWidth={2} />
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={editingMessageId ? editText : inputText}
            onChange={(e) => editingMessageId ? setEditText(e.target.value) : setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={closeAllPickers}
            disabled={!isLoggedIn || isSending}
            placeholder={isLoggedIn ? (editingMessageId ? 'Modifier le message...' : 'Message...') : 'Connectez-vous pour envoyer...'}
            className={`flex-1 border rounded-full px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 transition-all ${
              editingMessageId
                ? 'bg-blue-600/10 border-blue-500/40 focus:ring-blue-500/30'
                : 'bg-secondary border-border focus:ring-purple-500/30'
            } ${!isLoggedIn ? 'cursor-not-allowed opacity-50' : ''}`}
          />

          {/* Cancel edit button */}
          {editingMessageId && (
            <button
              onClick={handleCancelEdit}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-secondary hover:bg-secondary/70 transition-all"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          )}

          {/* Send / Save */}
          <button
            onClick={editingMessageId ? handleSaveEdit : handleSendMessage}
            disabled={!isLoggedIn || (editingMessageId ? !editText.trim() : inputText.trim() === '') || isSending}
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
              isLoggedIn && (editingMessageId ? editText.trim() !== '' : inputText.trim() !== '') && !isSending
                ? 'shadow-md'
                : 'bg-secondary cursor-not-allowed'
            }`}
            style={isLoggedIn && (editingMessageId ? editText.trim() !== '' : inputText.trim() !== '') && !isSending
              ? { background: editingMessageId ? 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)' : 'linear-gradient(135deg, #9333ea 0%, #6366f1 100%)' }
              : undefined}
          >
            {isSending
              ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              : <Send className={`w-5 h-5 ${isLoggedIn && (editingMessageId ? editText.trim() !== '' : inputText.trim() !== '') ? 'text-white' : 'text-muted-foreground'}`} strokeWidth={2.5} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
