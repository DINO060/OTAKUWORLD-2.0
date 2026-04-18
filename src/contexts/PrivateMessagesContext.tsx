import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { canSendDM, isDuplicate } from '../lib/rateLimit';

// ============================================
// PRIVATE MESSAGES CONTEXT - Supabase Integration
// ============================================

export interface Conversation {
  id: string;
  participantId: string;
  participantUsername: string;
  participantAvatar?: string;
  participantAvatarColor: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isOnline: boolean;
}

export interface PrivateMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  isOutgoing: boolean;
}

interface PrivateMessagesContextType {
  // Conversations
  conversations: Conversation[];
  isLoadingConversations: boolean;
  refreshConversations: () => Promise<void>;

  // Messages
  messages: PrivateMessage[];
  isLoadingMessages: boolean;
  currentConversationId: string | null;
  currentParticipant: { id: string; username: string; avatarColor: string; isOnline: boolean } | null;

  // Actions
  openConversation: (participantId: string) => Promise<void>;
  closeConversation: () => void;
  sendMessage: (content: string) => Promise<{ error?: string }>;
  editMessage: (messageId: string, newContent: string) => Promise<{ error?: string }>;
  deleteMessage: (messageId: string) => Promise<{ error?: string }>;
  markAsRead: (conversationId: string) => Promise<void>;
  startConversation: (participantId: string) => Promise<string | null>;

  // User lookup
  getParticipantInfo: (participantId: string) => Promise<{ username: string; avatarColor: string } | null>;
}

const PrivateMessagesContext = createContext<PrivateMessagesContextType | undefined>(undefined);

interface PrivateMessagesProviderProps {
  children: ReactNode;
}

// Generate avatar color from user ID
const generateAvatarColor = (id: string): string => {
  const colors = ['#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Format relative time
const formatRelativeTime = (date: string): string => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return then.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export function PrivateMessagesProvider({ children }: PrivateMessagesProviderProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentParticipant, setCurrentParticipant] = useState<{ id: string; username: string; avatarColor: string; isOnline: boolean } | null>(null);

  // Fetch all conversations for the current user
  const fetchConversations = useCallback(async () => {
    if (!user) {
      setIsLoadingConversations(false);
      setConversations([]);
      return;
    }

    setIsLoadingConversations(true);
    try {
      // Get conversations where user is participant_1 or participant_2
      const { data: convData, error } = await supabase
        .from('private_conversations')
        .select('id, participant_1, participant_2, last_message, last_message_at')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        setConversations([]);
        setIsLoadingConversations(false);
        return;
      }

      if (!convData || convData.length === 0) {
        setConversations([]);
        setIsLoadingConversations(false);
        return;
      }

      // Get unread counts and participant info for each conversation
      const conversationsWithUnread: Conversation[] = await Promise.all(
        convData.map(async (conv: any) => {
          // Determine which participant is the "other" user
          const isParticipant1 = conv.participant_1 === user.id;
          const otherParticipantId = isParticipant1 ? conv.participant_2 : conv.participant_1;

          // Fetch participant profile separately
          const { data: participantData } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', otherParticipantId)
            .single();

          // Count unread messages
          const { count } = await supabase
            .from('private_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          return {
            id: conv.id,
            participantId: otherParticipantId || '',
            participantUsername: participantData?.username || 'Unknown',
            participantAvatar: participantData?.avatar_url,
            participantAvatarColor: generateAvatarColor(otherParticipantId || ''),
            lastMessage: conv.last_message || 'No messages yet',
            lastMessageAt: conv.last_message_at ? formatRelativeTime(conv.last_message_at) : '',
            unreadCount: count || 0,
            isOnline: false, // Would need presence system for real online status
          };
        })
      );

      setConversations(conversationsWithUnread);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setConversations([]);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user]);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user) return;

    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('private_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: PrivateMessage[] = (data || []).map((msg: any) => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        content: msg.content,
        createdAt: new Date(msg.created_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        readAt: msg.read_at,
        isOutgoing: msg.sender_id === user.id,
      }));

      setMessages(formattedMessages);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [user]);

  // Open a conversation with a participant
  const openConversation = useCallback(async (participantId: string) => {
    if (!user) return;

    try {
      // Check if the participant accepts DMs
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('allow_dms')
        .eq('id', participantId)
        .single();

      if (targetProfile && targetProfile.allow_dms === false) {
        console.warn('This user does not accept private messages.');
        return;
      }

      // Find existing conversation
      const { data: existing } = await supabase
        .from('private_conversations')
        .select('id')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${participantId}),and(participant_1.eq.${participantId},participant_2.eq.${user.id})`)
        .single();

      let conversationId = existing?.id;

      // If no conversation exists, create one
      if (!conversationId) {
        const { data: newConv, error: createError } = await supabase
          .from('private_conversations')
          .insert({
            participant_1: user.id,
            participant_2: participantId,
          })
          .select()
          .single();

        if (createError) throw createError;
        conversationId = newConv.id;
      }

      // Get participant info
      const { data: participantData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', participantId)
        .single();

      setCurrentConversationId(conversationId);
      setCurrentParticipant({
        id: participantId,
        username: participantData?.username || 'Unknown',
        avatarColor: generateAvatarColor(participantId),
        isOnline: false,
      });

      // Fetch messages
      await fetchMessages(conversationId);

      // Mark messages as read
      await markAsRead(conversationId);
    } catch (err) {
      console.error('Error opening conversation:', err);
    }
  }, [user, fetchMessages]);

  // Close current conversation
  const closeConversation = useCallback(() => {
    setCurrentConversationId(null);
    setCurrentParticipant(null);
    setMessages([]);
  }, []);

  // Send a message
  const sendMessage = useCallback(async (content: string): Promise<{ error?: string }> => {
    if (!user || !currentConversationId) {
      return { error: 'No active conversation' };
    }

    // Rate limit DMs: max 10 per 30 seconds
    if (!canSendDM(user.id)) {
      return { error: 'Trop de messages — attendez un moment.' };
    }

    // Duplicate check (same message in 30s)
    if (isDuplicate(`dm:${user.id}`, content)) {
      return { error: 'Message identique déjà envoyé.' };
    }

    // Re-check if recipient allows DMs
    if (currentParticipant) {
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('allow_dms')
        .eq('id', currentParticipant.id)
        .single();

      if (recipientProfile && recipientProfile.allow_dms === false) {
        return { error: 'Cet utilisateur a désactivé les messages privés.' };
      }
    }

    try {
      const { data, error } = await supabase
        .from('private_messages')
        .insert({
          conversation_id: currentConversationId,
          sender_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation's last message
      await supabase
        .from('private_conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', currentConversationId);

      // Add to local state
      const newMessage: PrivateMessage = {
        id: data.id,
        conversationId: currentConversationId,
        senderId: user.id,
        content,
        createdAt: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        readAt: null,
        isOutgoing: true,
      };

      setMessages(prev => [...prev, newMessage]);
      return {};
    } catch (err: any) {
      console.error('Error sending message:', err);
      return { error: err.message || 'Failed to send message' };
    }
  }, [user, currentConversationId]);

  // Edit a message
  const editMessage = useCallback(async (messageId: string, newContent: string): Promise<{ error?: string }> => {
    if (!user) return { error: 'Not authenticated' };
    const trimmed = newContent.trim();
    if (!trimmed) return { error: 'Empty message' };
    try {
      const { error } = await supabase
        .from('private_messages')
        .update({ content: trimmed })
        .eq('id', messageId)
        .eq('sender_id', user.id);
      if (error) throw error;
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: trimmed } : m));
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to edit message' };
    }
  }, [user]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string): Promise<{ error?: string }> => {
    if (!user) return { error: 'Not authenticated' };
    try {
      const { error } = await supabase
        .from('private_messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id);
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== messageId));
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to delete message' };
    }
  }, [user]);

  // Mark messages as read
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('private_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null);

      // Update local unread count
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
        )
      );
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [user]);

  // Start a new conversation
  const startConversation = useCallback(async (participantId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('private_conversations')
        .select('id')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${participantId}),and(participant_1.eq.${participantId},participant_2.eq.${user.id})`)
        .single();

      if (existing) return existing.id;

      // Create new conversation
      const { data, error } = await supabase
        .from('private_conversations')
        .insert({
          participant_1: user.id,
          participant_2: participantId,
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (err) {
      console.error('Error starting conversation:', err);
      return null;
    }
  }, [user]);

  // Get participant info
  const getParticipantInfo = useCallback(async (participantId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', participantId)
        .single();

      if (error) throw error;

      return {
        username: data.username || 'Unknown',
        avatarColor: generateAvatarColor(participantId),
      };
    } catch {
      return null;
    }
  }, []);

  // Initial fetch and real-time subscription
  useEffect(() => {
    if (!user) {
      setConversations([]);
      setMessages([]);
      return;
    }

    fetchConversations();

    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel('private-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, async (payload) => {
        const newMsg = payload.new as any;
        if (newMsg.conversation_id === currentConversationId && newMsg.sender_id !== user.id) {
          const formattedMsg: PrivateMessage = {
            id: newMsg.id,
            conversationId: newMsg.conversation_id,
            senderId: newMsg.sender_id,
            content: newMsg.content,
            createdAt: new Date(newMsg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            readAt: newMsg.read_at,
            isOutgoing: false,
          };
          setMessages(prev => [...prev, formattedMsg]);
          await markAsRead(newMsg.conversation_id);
        }
        fetchConversations();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'private_messages' }, (payload) => {
        const updated = payload.new as any;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, content: updated.content } : m));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'private_messages' }, (payload) => {
        const deleted = payload.old as any;
        setMessages(prev => prev.filter(m => m.id !== deleted.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSubscription);
    };
  }, [user, currentConversationId, fetchConversations, markAsRead]);

  const value: PrivateMessagesContextType = {
    conversations,
    isLoadingConversations,
    refreshConversations: fetchConversations,
    messages,
    isLoadingMessages,
    currentConversationId,
    currentParticipant,
    openConversation,
    closeConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    startConversation,
    getParticipantInfo,
  };

  return (
    <PrivateMessagesContext.Provider value={value}>
      {children}
    </PrivateMessagesContext.Provider>
  );
}

export function usePrivateMessages() {
  const context = useContext(PrivateMessagesContext);
  if (context === undefined) {
    throw new Error('usePrivateMessages must be used within a PrivateMessagesProvider');
  }
  return context;
}

export default PrivateMessagesContext;
