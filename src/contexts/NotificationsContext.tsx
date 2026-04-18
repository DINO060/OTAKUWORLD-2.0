import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

// ============================================
// NOTIFICATIONS CONTEXT — realtime alerts
// ============================================

export type NotifType = 'message' | 'reaction' | 'mention';

export interface AppNotification {
  id: string;
  type: NotifType;
  /** Bold first line (sender name / reaction line) */
  title: string;
  /** Preview text */
  body: string;
  timestamp: string;
  read: boolean;
  /** The triggering user's id (for avatar colour) */
  userId?: string;
  avatarColor?: string;
}

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// Deterministic avatar colour from any string
const colorFromId = (id: string) => {
  const palette = ['#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
};

const nowTime = () =>
  new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotif = useCallback((n: AppNotification) => {
    setNotifications(prev => [n, ...prev].slice(0, 50));
  }, []);

  // ── Private messages ──────────────────────────────────────────────
  // RLS guarantees only messages in *our* conversations are delivered.
  useEffect(() => {
    if (!user) return;

    const ch = supabase
      .channel('notif_private_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'private_messages' },
        async (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id === user.id) return; // own message

          // Fetch sender username
          const { data: sender } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', msg.sender_id)
            .single();

          const preview: string = msg.content || '';
          addNotif({
            id: `pm_${msg.id}`,
            type: 'message',
            title: sender?.username || 'Someone',
            body: preview.length > 70 ? preview.slice(0, 70) + '…' : preview,
            timestamp: nowTime(),
            read: false,
            userId: msg.sender_id,
            avatarColor: colorFromId(msg.sender_id),
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user, addNotif]);

  // ── Reactions on user's public messages ──────────────────────────
  useEffect(() => {
    if (!user) return;

    const ch = supabase
      .channel('notif_reactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reactions' },
        async (payload) => {
          const reaction = payload.new as any;
          if (reaction.user_id === user.id) return; // own reaction

          // Is this reaction on *my* message?
          const { data: msg } = await supabase
            .from('live_messages')
            .select('user_id, content')
            .eq('id', reaction.message_id)
            .single();

          if (!msg || msg.user_id !== user.id) return;

          const { data: reactor } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', reaction.user_id)
            .single();

          const msgPreview: string = msg.content || '';
          addNotif({
            id: `react_${reaction.id ?? Date.now()}`,
            type: 'reaction',
            title: `${reactor?.username ?? 'Someone'} reacted ${reaction.emoji}`,
            body: msgPreview.length > 60 ? msgPreview.slice(0, 60) + '…' : msgPreview,
            timestamp: nowTime(),
            read: false,
            userId: reaction.user_id,
            avatarColor: colorFromId(reaction.user_id),
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user, addNotif]);

  // ── @mentions in public chat ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const ch = supabase
      .channel('notif_mentions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_messages' },
        async (payload) => {
          const msg = payload.new as any;
          if (msg.user_id === user.id) return;
          if (msg.content_type !== 'text') return;

          // Does it mention me?
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single();

          if (!myProfile) return;
          if (!msg.content?.toLowerCase().includes(`@${myProfile.username.toLowerCase()}`)) return;

          const { data: sender } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', msg.user_id)
            .single();

          const preview: string = msg.content || '';
          addNotif({
            id: `mention_${msg.id}`,
            type: 'mention',
            title: `${sender?.username ?? 'Someone'} mentioned you`,
            body: preview.length > 70 ? preview.slice(0, 70) + '…' : preview,
            timestamp: nowTime(),
            read: false,
            userId: msg.user_id,
            avatarColor: colorFromId(msg.user_id),
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user, addNotif]);

  // Clear all notifications on sign-out
  useEffect(() => {
    if (!user) setNotifications([]);
  }, [user]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount: notifications.filter(n => !n.read).length,
      markAllRead,
      dismiss,
      clearAll,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
