import React, { useState, useEffect } from 'react';
import { MessageCircle, MessageSquare, Settings as SettingsIcon, X, Bell, AtSign, Zap, ShieldAlert, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from './contexts/NotificationsContext';
import PrivateChat from './components/PrivateChat';
import Inbox from './components/Inbox';
import ChaptersHome from './components/ChaptersHome';
import ChapterReader from './components/ChapterReader';
import PublishChapter from './components/PublishChapter';
import MyChapters from './components/MyChapters';
import ChaptersBrowsePanel from './components/ChaptersBrowsePanel';
import AuthModal from './components/AuthModal';
import Settings from './components/Settings';
import AdminPanel from './components/AdminPanel';
import OtakuWorld from './components/Otaku';
import LoupGarou from './components/LoupGarou';
import GlobalChatPage from './components/GlobalChatPage';
import { useChat } from './contexts/ChatContext';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { useChapters } from './contexts/ChaptersContext';
import { usePrivateMessages } from './contexts/PrivateMessagesContext';


export default function App() {
  const { currentUser } = useChat();
  const { requireAuth, isAuthenticated, profile, user, updateProfile, setShowAuthModal } = useAuth();
  const { notifications, unreadCount, markAllRead, dismiss, clearAll } = useNotifications();
  const { conversations } = usePrivateMessages();
  const dmUnreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const {
    chapters,
    myChapters,
    filteredChapters,
    selectedChapterId,
    setSelectedChapterId,
    searchQuery: chapterSearchQuery,
    setSearchQuery: setChapterSearchQuery,
    filter: chapterFilter,
    setFilter: setChapterFilter,
    selectedTag: selectedChapterTag,
    setSelectedTag: setSelectedChapterTag,
  } = useChapters();

  const [currentPage, setCurrentPage] = useState<'feed' | 'inbox' | 'private-chat' | 'chapters-browse' | 'chapters-platform' | 'chapter-reader' | 'publish-chapter' | 'my-chapters' | 'settings' | 'admin' | 'otaku' | 'loup-garou'>('feed');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [publishWorkContext, setPublishWorkContext] = useState<{ workTitle: string } | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [gameRoomCode, setGameRoomCode] = useState<string | null>(null);
  const [showHandlePrompt, setShowHandlePrompt] = useState(false);
  const [handleInput, setHandleInput] = useState('');
  const [handleError, setHandleError] = useState<string | null>(null);
  const [savingHandle, setSavingHandle] = useState(false);

  // PWA install prompt
  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); setShowInstallBanner(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') { setInstallPrompt(null); setShowInstallBanner(false); }
  };

  // Show handle prompt if user has no custom handle (contains underscore + 4 random chars = auto-generated)
  useEffect(() => {
    if (profile && isAuthenticated && !profile.handle) {
      setShowHandlePrompt(true);
    }
  }, [profile, isAuthenticated]);

  const saveHandle = async () => {
    const handle = handleInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (handle.length < 3) {
      setHandleError('Le @username doit contenir au moins 3 caractères.');
      return;
    }
    if (handle.length > 20) {
      setHandleError('Le @username ne peut pas dépasser 20 caractères.');
      return;
    }
    setSavingHandle(true);
    setHandleError(null);

    // Check uniqueness
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('handle', handle)
      .neq('id', user?.id || '')
      .maybeSingle();

    if (existing) {
      setHandleError('Ce @username est déjà pris.');
      setSavingHandle(false);
      return;
    }

    const result = await updateProfile({ handle });
    if (result.error) {
      setHandleError(result.error);
    } else {
      setShowHandlePrompt(false);
    }
    setSavingHandle(false);
  };

  const getInitials = (username: string) => username.slice(0, 2).toUpperCase();

  // Sidebar nav item helper
  const SidebarItem = ({ icon: Icon, label, active, badge, onClick, iconBg }: { icon: any; label: string; active: boolean; badge?: number; onClick: () => void; iconBg?: string }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active ? 'text-white' : 'text-gray-300 hover:bg-white/5'
      }`}
      style={active ? { background: 'rgba(90, 110, 150, 0.25)' } : undefined}
    >
      {typeof Icon === 'string' ? (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg || '#3b82f6' }}>
          <span className="text-base">{Icon}</span>
        </div>
      ) : (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg || '#3b82f6' }}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      )}
      <span className="flex-1 text-left">{label}</span>
      {badge && badge > 0 ? (
        <span className="min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  );

  // Content for non-feed pages
  const renderPage = () => {
    switch (currentPage) {
      case 'inbox':
        return (
          <Inbox
            onBack={() => setCurrentPage('feed')}
            onSelectConversation={(userId) => {
              setSelectedChatUserId(userId);
              setCurrentPage('private-chat');
            }}
          />
        );
      case 'private-chat':
        return (
          <PrivateChat
            onBack={() => setCurrentPage('inbox')}
            selectedUserId={selectedChatUserId || '2'}
          />
        );
      case 'chapter-reader':
        return (
          <ChapterReader
            chapterId={selectedChapterId || '1'}
            onBack={() => setCurrentPage('chapters-browse')}
            onChapterList={() => setCurrentPage('chapters-browse')}
            chapters={chapters}
            onSelectChapter={(chapterId) => setSelectedChapterId(chapterId)}
            onAddChapter={(workTitle: string) => {
              if (requireAuth('Sign in to publish chapters')) {
                setPublishWorkContext({ workTitle });
                setCurrentPage('publish-chapter');
              }
            }}
          />
        );
      case 'publish-chapter':
        return (
          <PublishChapter
            onBack={() => {
              setPublishWorkContext(null);
              setCurrentPage('chapters-browse');
            }}
            onPublishComplete={() => {
              setPublishWorkContext(null);
              setCurrentPage('chapters-browse');
            }}
            preSelectedWork={publishWorkContext?.workTitle || null}
          />
        );
      case 'my-chapters':
        return (
          <MyChapters
            onBack={() => setCurrentPage('chapters-browse')}
            onEditChapter={(chapterId) => {
              setSelectedChapterId(chapterId);
              setCurrentPage('publish-chapter');
            }}
            onAddChapter={(workTitle: string) => {
              setPublishWorkContext({ workTitle });
              setCurrentPage('publish-chapter');
            }}
            chapters={myChapters}
          />
        );
      case 'otaku':
        return <OtakuWorld onBack={() => setCurrentPage('feed')} onOpenChat={(userId) => { setSelectedChatUserId(userId); setCurrentPage('private-chat'); }} onOpenGame={(code) => { setGameRoomCode(code || null); setCurrentPage('loup-garou'); }} onOpenSettings={() => setCurrentPage('settings')} />;
      case 'loup-garou':
        return <LoupGarou onBack={() => { setCurrentPage('feed'); setGameRoomCode(null); }} initialRoomCode={gameRoomCode || undefined} />;
      case 'settings':
        return (
          <Settings
            onBack={() => setCurrentPage('feed')}
            onAdminClick={() => setCurrentPage('admin')}
          />
        );
      case 'admin':
        return <AdminPanel onBack={() => setCurrentPage('feed')} />;
      case 'chapters-browse':
        return (
          <>
            <ChaptersBrowsePanel
              isOpen={true}
              onClose={() => setCurrentPage('feed')}
              searchQuery={chapterSearchQuery}
              onSearchChange={setChapterSearchQuery}
              filter={chapterFilter.type}
              onFilterChange={(f) => setChapterFilter({ type: f })}
              selectedTag={selectedChapterTag}
              onTagSelect={setSelectedChapterTag}
              onChapterClick={(chapterId) => {
                setSelectedChapterId(chapterId);
                setCurrentPage('chapter-reader');
              }}
              onPublishClick={() => {
                if (requireAuth('Sign in to publish chapters')) {
                  setCurrentPage('publish-chapter');
                }
              }}
              onMyChaptersClick={() => setCurrentPage('my-chapters')}
              onPlatformClick={() => setCurrentPage('chapters-platform')}
              chapters={filteredChapters}
            />
            <AuthModal />
          </>
        );
      case 'chapters-platform':
        return (
          <>
            <ChaptersHome
              onBack={() => setCurrentPage('chapters-browse')}
              onReadChapter={(chapterId) => {
                setSelectedChapterId(chapterId);
                setCurrentPage('chapter-reader');
              }}
              onPublishNew={() => {
                if (requireAuth('Sign in to publish chapters')) {
                  setCurrentPage('publish-chapter');
                }
              }}
              onMyChapters={() => setCurrentPage('my-chapters')}
              currentUserId={user?.id || ''}
              chapters={chapters}
            />
            <AuthModal />
          </>
        );
      default:
        return null;
    }
  };

  const isFeed = currentPage === 'feed';

  return (
    <div className="h-dvh flex bg-background overflow-hidden" style={{ height: '100dvh' }}>

      {/* ========== SIDEBAR ========== */}
      <aside
        className="h-dvh flex flex-col border-r flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden"

        style={{
          background: '#0e1621',
          borderColor: 'rgba(255,255,255,0.06)',
          width: isMenuOpen ? 250 : 0,
        }}
      >
        <div className="w-[250px] flex flex-col h-full flex-shrink-0">
        {/* Logo + close */}
        <div className="px-4 pt-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">C</div>
            <h1 className="text-white text-lg font-bold">Comment Live</h1>
          </div>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <SidebarItem icon={MessageCircle} iconBg="#2ecc71" label="Global Chat" active={currentPage === 'feed'} onClick={() => { setCurrentPage('feed'); setIsMenuOpen(false); }} />
          <SidebarItem icon={MessageSquare} iconBg="#3498db" label="Messages Privés" active={currentPage === 'inbox' || currentPage === 'private-chat'} badge={dmUnreadCount} onClick={() => { setCurrentPage('inbox'); setIsMenuOpen(false); }} />
          <SidebarItem icon={'🎌'} iconBg="#e74c8b" label="Otaku" active={currentPage === 'otaku'} onClick={() => { setCurrentPage('otaku'); setIsMenuOpen(false); }} />
          <SidebarItem icon={'🐺'} iconBg="#27ae60" label="Loup-Garou" active={currentPage === 'loup-garou'} onClick={() => { setCurrentPage('loup-garou'); setIsMenuOpen(false); }} />

          <div className="my-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />

          <SidebarItem icon={SettingsIcon} iconBg="#95a5a6" label="Settings" active={currentPage === 'settings'} onClick={() => { setCurrentPage('settings'); setIsMenuOpen(false); }} />
          {profile?.isAdmin && (
            <SidebarItem icon={ShieldAlert} iconBg="#e74c3c" label="Admin" active={currentPage === 'admin'} onClick={() => { setCurrentPage('admin'); setIsMenuOpen(false); }} />
          )}
        </nav>

        {/* User profile at bottom */}
        <div className="px-3 pb-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {!isAuthenticated && (
            <button
              onClick={() => { setShowAuthModal(true); setIsMenuOpen(false); }}
              className="w-full mb-2 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
            >
              Se connecter
            </button>
          )}
          <button
            onClick={() => { setCurrentPage('settings'); setIsMenuOpen(false); }}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
              style={{ backgroundColor: currentUser?.avatarColor || '#3b82f6' }}
            >
              {currentUser?.avatarImage ? (
                <img src={currentUser.avatarImage} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                getInitials(profile?.username || currentUser?.username || 'U')
              )}
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{profile?.username || currentUser?.username || 'Guest'}</p>
            </div>
            <div className="relative" onClick={(e) => { e.stopPropagation(); setIsNotifOpen(!isNotifOpen); setIsMenuOpen(false); }}>
              <div className={`p-1.5 rounded-full transition-colors ${isNotifOpen ? 'bg-purple-500/20' : ''}`}>
                <Bell className={`w-4 h-4 transition-colors ${isNotifOpen ? 'text-purple-400' : 'text-gray-500'}`} />
              </div>
              {isNotifOpen && (
                <>
                  <span className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-3 bg-purple-500 rounded-full" />
                  <span className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1 h-3 bg-purple-500 rounded-full" />
                </>
              )}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </button>
        </div>
        </div>{/* end inner w-[250px] wrapper */}
      </aside>

      {/* ========== MAIN CONTENT AREA ========== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">

        {/* Notification overlay */}
        {isNotifOpen && (
          <div onClick={() => setIsNotifOpen(false)} className="fixed inset-0 z-40" />
        )}

        {/* Notification Panel */}
        <AnimatePresence>
          {isNotifOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 360 }}
              className="fixed top-[60px] right-3 z-50 w-[calc(100vw-24px)] max-w-[340px]"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-bold text-foreground">Notifications</span>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clear all</button>
                    )}
                    <button onClick={() => setIsNotifOpen(false)} className="p-1 hover:bg-secondary rounded-lg transition-colors">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <Bell className="w-8 h-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map(n => {
                      const NotifIcon = n.type === 'message' ? MessageSquare : n.type === 'reaction' ? Zap : AtSign;
                      const iconColor = n.type === 'message' ? 'text-blue-400' : n.type === 'reaction' ? 'text-yellow-400' : 'text-purple-400';
                      const iconBg = n.type === 'message' ? 'bg-blue-500/20' : n.type === 'reaction' ? 'bg-yellow-500/20' : 'bg-purple-500/20';
                      return (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          onClick={() => {
                            if (n.type === 'message' && n.userId) {
                              setSelectedChatUserId(n.userId);
                              setCurrentPage('private-chat');
                              setIsNotifOpen(false);
                            }
                          }}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors ${!n.read ? 'bg-blue-500/5' : ''} ${n.type === 'message' ? 'cursor-pointer' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}>
                            <NotifIcon className={`w-4 h-4 ${iconColor}`} strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{n.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{n.timestamp}</p>
                          </div>
                          <button onClick={() => dismiss(n.id)} className="p-1 hover:bg-secondary rounded-md transition-colors flex-shrink-0 mt-0.5">
                            <X className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page content */}
        {!isFeed ? (
          <div className="flex-1 h-full overflow-hidden">
            {renderPage()}
          </div>
        ) : (
          <GlobalChatPage
            onOpenMenu={() => setIsMenuOpen(true)}
            onNavigateToChat={(userId) => {
              setSelectedChatUserId(userId);
              setCurrentPage('private-chat');
            }}
            onOpenSettings={() => setCurrentPage('settings')}
          />
        )}
      </div>

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-20 left-4 right-16 z-[90] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl"
          style={{ background: '#1a1a2e', border: '1px solid rgba(168,85,247,0.3)' }}>
          <button onClick={() => setShowInstallBanner(false)} className="text-gray-500 hover:text-white text-xl leading-none flex-shrink-0 -ml-1">×</button>
          <span style={{ fontSize: '24px' }}>⚔️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Installer OtakuWorld</p>
            <p className="text-xs text-gray-400">Accès rapide depuis ton écran d'accueil</p>
          </div>
          <button onClick={handleInstall} className="px-3 py-1.5 rounded-full text-xs font-bold text-white flex-shrink-0" style={{ background: '#a855f7' }}>
            Installer
          </button>
        </div>
      )}

      {/* Handle Prompt Modal */}
      <AnimatePresence>
        {showHandlePrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
              <h2 className="text-lg font-bold text-foreground mb-1">Choisissez votre @username</h2>
              <p className="text-sm text-muted-foreground mb-4">
                C'est votre identifiant unique. Les autres pourront vous mentionner avec @{handleInput || 'username'}.
              </p>

              <div className="relative mb-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <input
                  type="text"
                  value={handleInput}
                  onChange={(e) => {
                    setHandleInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                    setHandleError(null);
                  }}
                  placeholder="votre_username"
                  maxLength={20}
                  className="w-full pl-8 pr-3 py-2.5 bg-secondary border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              {handleError && (
                <p className="text-xs text-red-400 mb-3">{handleError}</p>
              )}

              <p className="text-xs text-muted-foreground mb-4">
                Lettres, chiffres et underscores uniquement. 3-20 caractères.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowHandlePrompt(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Plus tard
                </button>
                <button
                  onClick={saveHandle}
                  disabled={savingHandle || handleInput.length < 3}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                >
                  {savingHandle ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirmer
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
