import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { canSendChat, isDuplicate, validateMessageContent, cooldownSeconds } from '../lib/rateLimit';
import { sanitizeMessage } from '../lib/sanitize';
import type { Message, MessageContentType, Conversation, Hashtag, User, MessageReaction } from '../types';

// ============================================
// CHAT CONTEXT - Messages & Conversations
// ============================================

interface ChatContextType {
  // Public messages
  messages: Message[];
  isLoading: boolean;
  sendMessage: (text: string, replyTo?: { messageId: string; username: string; text: string }, contentType?: MessageContentType) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<{ error?: string }>;
  editMessage: (messageId: string, newText: string) => Promise<{ error?: string }>;
  isAuthenticated: boolean; // Can user send messages?

  // Hashtags
  selectedHashtag: string | null;
  setSelectedHashtag: (tag: string | null) => void;
  getHashtags: () => Hashtag[];
  filteredMessages: Message[];

  // Conversations (private chat)
  conversations: Conversation[];
  activeConversation: string | null;
  setActiveConversation: (userId: string | null) => void;

  // Users
  users: Map<string, User>;
  getUserById: (id: string) => User | undefined;
  currentUser: User | null;

  // UI State
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;
  activeUsers: number;

  // Reactions
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  getMessageReactions: (messageId: string) => MessageReaction[];
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { user: authUser, profile, isMuted, mutedUntil } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeUsers, setActiveUsers] = useState(0);
  const [reactions, setReactions] = useState<Map<string, { emoji: string; user_id: string }[]>>(new Map());

  // Generate random color based on user ID
  const getRandomColor = (seed?: string) => {
    const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    if (seed) {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    }
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Set current user based on auth state
  useEffect(() => {
    if (authUser && profile) {
      // Authenticated user
      setCurrentUser({
        id: authUser.id,
        username: profile.username || 'User',
        avatarColor: getRandomColor(authUser.id),
        isCurrentUser: true,
        isActive: true,
      });
    } else {
      // Not authenticated - clear user (can only view, not send)
      setCurrentUser(null);
    }
  }, [authUser, profile]);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('live_messages')
          .select(`
            id,
            user_id,
            content,
            content_type,
            reply_to_id,
            hashtags,
            created_at
          `)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) {
          console.error('Error fetching messages:', error);
          return;
        }

        if (data) {
          // Build a lookup map for resolving reply_to_id
          const msgMap = new Map<string, { content: string; user_id: string }>();
          data.forEach(msg => msgMap.set(msg.id, { content: msg.content, user_id: msg.user_id }));

          // Collect user IDs from replies that reference messages we have
          const replyUserIds = new Set<string>();
          data.forEach(msg => {
            if (msg.reply_to_id) {
              const ref = msgMap.get(msg.reply_to_id);
              if (ref) replyUserIds.add(ref.user_id);
            }
          });

          // Fetch reply authors' profiles
          const allUserIds = [...new Set([...data.map(m => m.user_id), ...replyUserIds])];
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', allUserIds);
          const profileMap = new Map<string, string>();
          profilesData?.forEach(p => profileMap.set(p.id, p.username || `User${p.id.slice(-4)}`));

          const formattedMessages: Message[] = data.map(msg => {
            let replyTo: Message['replyTo'] = undefined;
            if (msg.reply_to_id) {
              const refMsg = msgMap.get(msg.reply_to_id);
              if (refMsg) {
                replyTo = {
                  username: profileMap.get(refMsg.user_id) || 'Unknown',
                  text: refMsg.content,
                };
              }
            }
            return {
              id: msg.id,
              userId: msg.user_id,
              text: msg.content,
              contentType: ((msg as any).content_type as MessageContentType) || 'text',
              timestamp: new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
              }),
              replyTo,
            };
          });
          setMessages(formattedMessages);

          // Extract unique user IDs and fetch their profiles
          const userIds = [...new Set(data.map(msg => msg.user_id))];
          fetchUserProfiles(userIds);
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, []);

  // Fetch user profiles
  const fetchUserProfiles = async (userIds: string[]) => {
    if (userIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (error) {
        console.error('Error fetching profiles:', error);
        return;
      }

      if (data) {
        const newUsers = new Map(users);
        data.forEach(profile => {
          newUsers.set(profile.id, {
            id: profile.id,
            username: profile.username || `User${profile.id.slice(-4)}`,
            avatarColor: getRandomColor(profile.id), // Use ID as seed for consistent color
            isCurrentUser: false,
            isActive: true,
          });
        });
        setUsers(newUsers);
      }
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
    }
  };

  // Subscribe to profile changes in realtime
  useEffect(() => {
    const channel = supabase
      .channel('profiles_realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const updatedProfile = payload.new as {
            id: string;
            username: string;
            avatar_url: string | null;
          };

          // Update the users map with new profile data
          setUsers(prev => {
            const newUsers = new Map(prev);
            const existingUser = newUsers.get(updatedProfile.id);
            if (existingUser) {
              newUsers.set(updatedProfile.id, {
                ...existingUser,
                username: updatedProfile.username || `User${updatedProfile.id.slice(-4)}`,
              });
            }
            return newUsers;
          });

          // Also update currentUser if it's the same user
          if (authUser && updatedProfile.id === authUser.id) {
            setCurrentUser(prev => prev ? {
              ...prev,
              username: updatedProfile.username || 'User',
            } : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser]);

  // Subscribe to realtime messages
  useEffect(() => {
    const channel = supabase
      .channel('live_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_messages',
        },
        async (payload) => {
          const newMsg = payload.new as {
            id: string;
            user_id: string;
            content: string;
            content_type?: string;
            reply_to_id?: string;
            created_at: string;
          };

          // Don't add if it's our own message (already added optimistically)
          if (authUser && newMsg.user_id === authUser.id) return;

          // Resolve reply data if present
          let replyTo: Message['replyTo'] = undefined;
          if (newMsg.reply_to_id) {
            // First check in existing messages
            const existingMsg = messages.find(m => m.id === newMsg.reply_to_id);
            if (existingMsg) {
              const replyUser = users.get(existingMsg.userId);
              replyTo = {
                username: replyUser?.username || 'Unknown',
                text: existingMsg.text,
              };
            } else {
              // Fetch from DB
              const { data: refData } = await supabase
                .from('live_messages')
                .select('content, user_id')
                .eq('id', newMsg.reply_to_id)
                .single();
              if (refData) {
                const { data: refProfile } = await supabase
                  .from('profiles')
                  .select('username')
                  .eq('id', refData.user_id)
                  .single();
                replyTo = {
                  username: refProfile?.username || 'Unknown',
                  text: refData.content,
                };
              }
            }
          }

          const formattedMessage: Message = {
            id: newMsg.id,
            userId: newMsg.user_id,
            text: newMsg.content,
            contentType: (newMsg.content_type as MessageContentType) || 'text',
            timestamp: new Date(newMsg.created_at).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            replyTo,
          };

          setMessages(prev => [...prev, formattedMessage]);

          // Fetch user profile if we don't have it
          if (!users.has(newMsg.user_id)) {
            fetchUserProfiles([newMsg.user_id]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser, users]);

  // Track active users with presence (only for authenticated users)
  useEffect(() => {
    if (!authUser || !currentUser) return;

    const presenceChannel = supabase.channel('online_users', {
      config: {
        presence: {
          key: authUser.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setActiveUsers(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: authUser.id,
            username: currentUser.username,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [authUser, currentUser]);

  // Send message (requires authentication)
  const sendMessage = useCallback(async (text: string, replyTo?: { messageId: string; username: string; text: string }, contentType?: MessageContentType) => {
    // Check authentication
    if (!authUser || !currentUser) {
      console.error('Must be logged in to send messages');
      return;
    }

    const sanitized = sanitizeMessage(text, 1000);
    if (!sanitized) return;
    text = sanitized;

    const msgContentType = contentType || 'text';

    // ── Mute check ─────────────────────────────────────────────────────
    if (isMuted && mutedUntil && new Date(mutedUntil) > new Date()) {
      console.warn('User is muted until ' + mutedUntil);
      return;
    }

    // ── Anti-spam checks ──────────────────────────────────────────────
    // Rate limit: max 5 messages per 10 seconds
    if (!canSendChat(authUser.id)) {
      const wait = cooldownSeconds(`chat:${authUser.id}`, 10_000);
      console.warn(`Rate limited — wait ${wait}s`);
      return;
    }

    // Duplicate: same exact message within 30 seconds
    if (msgContentType === 'text' && isDuplicate(authUser.id, text)) {
      console.warn('Duplicate message blocked');
      return;
    }

    // Content limits: max 5 hashtags, 5 mentions per message
    if (msgContentType === 'text') {
      const contentError = validateMessageContent(text);
      if (contentError) {
        console.warn(contentError);
        return;
      }
    }
    // ── End anti-spam ──────────────────────────────────────────────────

    // Extract hashtags from message (only for text messages)
    const hashtagMatches = msgContentType === 'text' ? text.match(/#\w+/g) : null;
    const hashtags = hashtagMatches ? hashtagMatches.map(h => h.toLowerCase()) : [];

    // Optimistic update
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      userId: currentUser.id,
      text,
      contentType: msgContentType,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      replyTo,
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const insertPayload: any = {
        user_id: authUser.id,
        content: text,
        content_type: msgContentType,
        hashtags,
      };
      if (replyTo?.messageId) {
        insertPayload.reply_to_id = replyTo.messageId;
      }
      const { data, error } = await supabase
        .from('live_messages')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== tempId));
        return;
      }

      // Replace temp message with real one
      if (data) {
        setMessages(prev => prev.map(m =>
          m.id === tempId
            ? { ...m, id: data.id }
            : m
        ));
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  }, [authUser, currentUser]);

  // Delete message (only own messages)
  const deleteMessage = useCallback(async (messageId: string): Promise<{ error?: string }> => {
    if (!authUser) {
      return { error: 'Must be logged in to delete messages' };
    }

    // Find the message to check ownership
    const message = messages.find(m => m.id === messageId);
    if (!message) {
      return { error: 'Message not found' };
    }

    if (message.userId !== authUser.id) {
      return { error: 'You can only delete your own messages' };
    }

    // Optimistic delete
    setMessages(prev => prev.filter(m => m.id !== messageId));

    try {
      const { error } = await supabase
        .from('live_messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', authUser.id); // Extra safety check

      if (error) {
        console.error('Error deleting message:', error);
        // Restore message on error (would need to keep reference)
        return { error: error.message };
      }

      return {};
    } catch (err: any) {
      console.error('Failed to delete message:', err);
      return { error: err.message || 'Failed to delete message' };
    }
  }, [authUser, messages]);

  // Edit a message (text only)
  const editMessage = useCallback(async (messageId: string, newText: string): Promise<{ error?: string }> => {
    if (!authUser) return { error: 'Must be logged in to edit messages' };

    const message = messages.find(m => m.id === messageId);
    if (!message) return { error: 'Message not found' };
    if (message.userId !== authUser.id) return { error: 'You can only edit your own messages' };
    if (message.contentType !== 'text') return { error: 'Only text messages can be edited' };

    const trimmed = newText.trim();
    if (!trimmed) return { error: 'Message cannot be empty' };

    // Optimistic update
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: trimmed } : m));

    try {
      const { error } = await supabase
        .from('live_messages')
        .update({ content: trimmed })
        .eq('id', messageId)
        .eq('user_id', authUser.id);

      if (error) {
        // Revert on error
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: message.text } : m));
        return { error: error.message };
      }
      return {};
    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: message.text } : m));
      return { error: err.message || 'Failed to edit message' };
    }
  }, [authUser, messages]);

  // Get hashtags from messages
  const getHashtags = useCallback((): Hashtag[] => {
    const hashtagCounts: { [key: string]: number } = {};
    messages.forEach(msg => {
      const hashtags = msg.text.match(/#\w+/g);
      if (hashtags) {
        hashtags.forEach(tag => {
          const normalizedTag = tag.toLowerCase();
          hashtagCounts[normalizedTag] = (hashtagCounts[normalizedTag] || 0) + 1;
        });
      }
    });
    return Object.entries(hashtagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [messages]);

  // Filter messages by hashtag
  const filteredMessages = selectedHashtag
    ? messages.filter(msg => msg.text.toLowerCase().includes(selectedHashtag.toLowerCase()))
    : messages;

  // Get user by ID
  const getUserById = useCallback((id: string): User | undefined => {
    // Check if it's the current user
    if (currentUser && id === currentUser.id) {
      return currentUser;
    }
    // Check users map
    if (users.has(id)) {
      return users.get(id);
    }
    // Return anonymous user placeholder
    return {
      id,
      username: `User${id.slice(-4)}`,
      avatarColor: getRandomColor(),
      isCurrentUser: false,
      isActive: false,
    };
  }, [users, currentUser]);

  // Fetch reactions for all messages
  const fetchReactions = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('message_id, emoji, user_id')
        .in('message_id', messageIds);

      if (error) {
        console.error('Error fetching reactions:', error);
        return;
      }

      if (data) {
        const newReactions = new Map<string, { emoji: string; user_id: string }[]>();
        data.forEach(reaction => {
          const existing = newReactions.get(reaction.message_id) || [];
          existing.push({ emoji: reaction.emoji, user_id: reaction.user_id });
          newReactions.set(reaction.message_id, existing);
        });
        setReactions(newReactions);
      }
    } catch (err) {
      console.error('Failed to fetch reactions:', err);
    }
  }, []);

  // Fetch reactions when messages change
  useEffect(() => {
    const messageIds = messages.map(m => m.id).filter(id => !id.startsWith('temp_'));
    if (messageIds.length > 0) {
      fetchReactions(messageIds);
    }
  }, [messages, fetchReactions]);

  // Subscribe to realtime reactions
  useEffect(() => {
    const channel = supabase
      .channel('message_reactions_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReaction = payload.new as { message_id: string; emoji: string; user_id: string };
            setReactions(prev => {
              const newMap = new Map(prev);
              const existing = newMap.get(newReaction.message_id) || [];
              // Check if this reaction already exists
              const alreadyExists = existing.some(
                r => r.emoji === newReaction.emoji && r.user_id === newReaction.user_id
              );
              if (!alreadyExists) {
                existing.push({ emoji: newReaction.emoji, user_id: newReaction.user_id });
                newMap.set(newReaction.message_id, existing);
              }
              return newMap;
            });
          } else if (payload.eventType === 'DELETE') {
            const oldReaction = payload.old as { message_id: string; emoji: string; user_id: string };
            setReactions(prev => {
              const newMap = new Map(prev);
              const existing = newMap.get(oldReaction.message_id) || [];
              const filtered = existing.filter(
                r => !(r.emoji === oldReaction.emoji && r.user_id === oldReaction.user_id)
              );
              if (filtered.length > 0) {
                newMap.set(oldReaction.message_id, filtered);
              } else {
                newMap.delete(oldReaction.message_id);
              }
              return newMap;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Toggle reaction on a message
  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!authUser) {
      console.error('Must be logged in to react');
      return;
    }

    // Check if user already reacted with this emoji
    const messageReactions = reactions.get(messageId) || [];
    const existingReaction = messageReactions.find(
      r => r.emoji === emoji && r.user_id === authUser.id
    );

    try {
      if (existingReaction) {
        // Remove reaction
        await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', authUser.id)
          .eq('emoji', emoji);
      } else {
        // Add reaction
        await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: authUser.id,
            emoji,
          });
      }
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  }, [authUser, reactions]);

  // Get reactions for a specific message
  const getMessageReactions = useCallback((messageId: string): MessageReaction[] => {
    const messageReactions = reactions.get(messageId) || [];

    // Group by emoji
    const emojiGroups: { [emoji: string]: string[] } = {};
    messageReactions.forEach(r => {
      if (!emojiGroups[r.emoji]) {
        emojiGroups[r.emoji] = [];
      }
      emojiGroups[r.emoji].push(r.user_id);
    });

    // Convert to MessageReaction array
    return Object.entries(emojiGroups).map(([emoji, userIds]) => ({
      emoji,
      count: userIds.length,
      users: userIds,
      hasReacted: authUser ? userIds.includes(authUser.id) : false,
    }));
  }, [reactions, authUser]);

  const value: ChatContextType = {
    messages,
    isLoading,
    sendMessage,
    deleteMessage,
    editMessage,
    isAuthenticated: !!authUser,
    selectedHashtag,
    setSelectedHashtag,
    getHashtags,
    filteredMessages,
    conversations,
    activeConversation,
    setActiveConversation,
    users,
    getUserById,
    currentUser,
    isTyping,
    setIsTyping,
    activeUsers,
    toggleReaction,
    getMessageReactions,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

export default ChatContext;
