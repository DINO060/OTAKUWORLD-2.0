import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Loader2, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { usePrivateMessages } from '../contexts/PrivateMessagesContext';
import { usePresence } from '../contexts/PresenceContext';

interface InboxProps {
  onBack: () => void;
  onSelectConversation: (userId: string) => void;
}

export default function Inbox({ onBack, onSelectConversation }: InboxProps) {
  const {
    conversations,
    isLoadingConversations,
    refreshConversations,
    openConversation,
  } = usePrivateMessages();

  const { isOnline } = usePresence();
  const [searchQuery, setSearchQuery] = useState('');

  // Refresh conversations on mount
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const filteredConversations = searchQuery
    ? conversations.filter(conv =>
        conv.participantUsername.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const handleSelectConversation = async (participantId: string) => {
    await openConversation(participantId);
    onSelectConversation(participantId);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg flex-shrink-0">
        <div className="px-3 py-3 sm:px-4 sm:py-3.5 flex items-center justify-between gap-3">
          {/* Left: Back Arrow + Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
            </button>
            <h1 className="text-white font-bold text-lg sm:text-xl">Messages</h1>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-3 pb-3 sm:px-4 sm:pb-3.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" strokeWidth={2} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une conversation..."
              className="w-full bg-white/10 backdrop-blur-sm text-white placeholder-white/60 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
            />
          </div>
        </div>
      </header>

      {/* CONVERSATION LIST */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingConversations ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Chargement...</p>
            </div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full px-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-purple-500/20 rounded-full flex items-center justify-center">
                {searchQuery
                  ? <Search className="w-8 h-8 text-purple-400" strokeWidth={1.5} />
                  : <MessageCircle className="w-8 h-8 text-purple-400" strokeWidth={1.5} />
                }
              </div>
              <h3 className="text-foreground font-semibold text-base mb-1">
                {searchQuery ? 'Aucune conversation trouvée' : 'Aucun message'}
              </h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery ? 'Essayez un autre terme' : 'Commencez une conversation depuis un profil utilisateur'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredConversations.map((conv) => (
              <motion.button
                key={conv.id}
                onClick={() => handleSelectConversation(conv.participantId)}
                whileTap={{ scale: 0.98 }}
                className="w-full px-3 py-3 sm:px-4 sm:py-3.5 flex items-center gap-3 hover:bg-secondary/50 active:bg-secondary transition-colors"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm"
                    style={{ backgroundColor: conv.participantAvatarColor }}
                  >
                    {getInitials(conv.participantUsername)}
                  </div>
                  {/* Active indicator */}
                  {isOnline(conv.participantId) && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full"></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-foreground font-semibold text-sm sm:text-base truncate">
                      {conv.participantUsername}
                    </h3>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{conv.lastMessageAt}</span>
                  </div>
                  <p className="text-muted-foreground text-xs sm:text-sm truncate">
                    {conv.lastMessage?.startsWith('{')
                      ? (() => { try { const p = JSON.parse(conv.lastMessage!); return (p.gif || p.mp4) ? '🎬 GIF' : conv.lastMessage; } catch { return conv.lastMessage; } })()
                      : conv.lastMessage?.startsWith('::sticker::') ? '🎨 Sticker'
                      : conv.lastMessage}
                  </p>
                </div>

                {/* Unread badge */}
                {conv.unreadCount > 0 && (
                  <div className="flex-shrink-0 min-w-[20px] h-5 px-1 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-[11px] font-bold leading-none">{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
