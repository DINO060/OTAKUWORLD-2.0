// ============================================
// CONTEXTS INDEX - Export all contexts
// ============================================

export { AuthProvider, useAuth } from './AuthContext';
export { ChatProvider, useChat } from './ChatContext';
export { ChaptersProvider, useChapters } from './ChaptersContext';
export { PrivateMessagesProvider, usePrivateMessages } from './PrivateMessagesContext';
export { PresenceProvider, usePresence } from './PresenceContext';
export { NotificationsProvider, useNotifications } from './NotificationsContext';

// Combined Provider for wrapping the app
export { AppProviders } from './AppProviders';
