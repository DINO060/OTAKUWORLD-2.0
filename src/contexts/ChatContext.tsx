import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Message, Conversation, Hashtag, User } from '../types';

// ============================================
// CHAT CONTEXT - Messages & Conversations
// ============================================

interface ChatContextType {
  // Public messages
  messages: Message[];
  isLoading: boolean;
  sendMessage: (text: string, replyTo?: { username: string; text: string }) => Promise<void>;

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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeUsers, setActiveUsers] = useState(0);

  // Generate random color for anonymous users
  const getRandomColor = () => {
    const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Generate anonymous username
  const generateAnonUsername = () => {
    const adjectives = ['Happy', 'Swift', 'Clever', 'Brave', 'Calm', 'Eager', 'Gentle'];
    const nouns = ['Panda', 'Tiger', 'Eagle', 'Wolf', 'Fox', 'Bear', 'Hawk'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}${noun}${num}`;
  };

  // Initialize anonymous user
  useEffect(() => {
    let anonId = localStorage.getItem('anon_user_id');
    let anonUsername = localStorage.getItem('anon_username');
    let anonColor = localStorage.getItem('anon_color');

    if (!anonId) {
      anonId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      anonUsername = generateAnonUsername();
      anonColor = getRandomColor();
      localStorage.setItem('anon_user_id', anonId);
      localStorage.setItem('anon_username', anonUsername);
      localStorage.setItem('anon_color', anonColor);
    }

    setCurrentUser({
      id: anonId,
      username: anonUsername || 'Anonymous',
      avatarColor: anonColor || '#3b82f6',
      isCurrentUser: true,
      isActive: true,
    });
  }, []);

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
          const formattedMessages: Message[] = data.map(msg => ({
            id: msg.id,
            userId: msg.user_id,
            text: msg.content,
            timestamp: new Date(msg.created_at).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            replyTo: undefined, // TODO: fetch reply data
          }));
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
            username: profile.username,
            avatarColor: getRandomColor(),
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
        (payload) => {
          const newMsg = payload.new as {
            id: string;
            user_id: string;
            content: string;
            created_at: string;
          };

          // Don't add if it's our own message (already added optimistically)
          if (currentUser && newMsg.user_id === currentUser.id) return;

          const formattedMessage: Message = {
            id: newMsg.id,
            userId: newMsg.user_id,
            text: newMsg.content,
            timestamp: new Date(newMsg.created_at).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
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
  }, [currentUser, users]);

  // Track active users with presence
  useEffect(() => {
    if (!currentUser) return;

    const presenceChannel = supabase.channel('online_users', {
      config: {
        presence: {
          key: currentUser.id,
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
            user_id: currentUser.id,
            username: currentUser.username,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [currentUser]);

  // Send message
  const sendMessage = useCallback(async (text: string, replyTo?: { username: string; text: string }) => {
    if (text.trim() === '' || !currentUser) return;

    // Extract hashtags from message
    const hashtagMatches = text.match(/#\w+/g);
    const hashtags = hashtagMatches ? hashtagMatches.map(h => h.toLowerCase()) : [];

    // Optimistic update
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      userId: currentUser.id,
      text,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      replyTo,
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const { data, error } = await supabase
        .from('live_messages')
        .insert({
          user_id: currentUser.id,
          content: text,
          hashtags,
        })
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
  }, [currentUser]);

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

  const value: ChatContextType = {
    messages,
    isLoading,
    sendMessage,
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
