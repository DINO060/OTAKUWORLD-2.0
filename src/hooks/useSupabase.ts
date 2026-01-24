// ============================================
// SUPABASE HOOKS - Ready for integration
// ============================================
//
// Ces hooks sont prêts pour l'intégration Supabase.
// Pour activer Supabase:
// 1. npm install @supabase/supabase-js
// 2. Créer un fichier src/lib/supabase.ts avec votre client
// 3. Décommenter le code Supabase dans ces hooks
//

import { useState, useEffect, useCallback } from 'react';
import type { Message, Chapter, User, Conversation } from '../types';

// -------------------- SUPABASE CLIENT (à configurer) --------------------
// import { createClient } from '@supabase/supabase-js';
//
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
//
// export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// -------------------- useRealtimeMessages --------------------

interface UseRealtimeMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string, replyTo?: { username: string; text: string }) => Promise<void>;
}

export function useRealtimeMessages(): UseRealtimeMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Fetch initial messages from Supabase
    // const fetchMessages = async () => {
    //   setIsLoading(true);
    //   const { data, error } = await supabase
    //     .from('messages')
    //     .select('*')
    //     .order('created_at', { ascending: true })
    //     .limit(100);
    //
    //   if (error) setError(error.message);
    //   else setMessages(data || []);
    //   setIsLoading(false);
    // };
    // fetchMessages();

    // TODO: Subscribe to realtime changes
    // const subscription = supabase
    //   .channel('public:messages')
    //   .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
    //     (payload) => {
    //       setMessages(prev => [...prev, payload.new as Message]);
    //     }
    //   )
    //   .subscribe();
    //
    // return () => { supabase.removeChannel(subscription); };
  }, []);

  const sendMessage = useCallback(async (text: string, replyTo?: { username: string; text: string }) => {
    // TODO: Insert message into Supabase
    // const { error } = await supabase
    //   .from('messages')
    //   .insert({ text, reply_to: replyTo, user_id: currentUser.id });
    //
    // if (error) setError(error.message);

    // Mock for now
    const newMessage: Message = {
      id: Date.now().toString(),
      userId: '1',
      text,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      replyTo,
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  return { messages, isLoading, error, sendMessage };
}

// -------------------- useRealtimeConversations --------------------

interface UseRealtimeConversationsReturn {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  markAsRead: (conversationId: string) => Promise<void>;
}

export function useRealtimeConversations(): UseRealtimeConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Fetch conversations from Supabase
    // const fetchConversations = async () => {
    //   setIsLoading(true);
    //   const { data, error } = await supabase
    //     .from('conversations')
    //     .select('*, recipient:users(*)')
    //     .eq('user_id', currentUser.id)
    //     .order('last_message_time', { ascending: false });
    //
    //   if (error) setError(error.message);
    //   else setConversations(data || []);
    //   setIsLoading(false);
    // };
    // fetchConversations();
  }, []);

  const markAsRead = useCallback(async (conversationId: string) => {
    // TODO: Update in Supabase
    // await supabase
    //   .from('conversations')
    //   .update({ unread_count: 0 })
    //   .eq('id', conversationId);

    setConversations(prev =>
      prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
    );
  }, []);

  return { conversations, isLoading, error, markAsRead };
}

// -------------------- useChaptersQuery --------------------

interface UseChaptersQueryReturn {
  chapters: Chapter[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useChaptersQuery(filter?: { status?: string; tag?: string }): UseChaptersQueryReturn {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChapters = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // TODO: Fetch from Supabase
    // let query = supabase
    //   .from('chapters')
    //   .select('*')
    //   .order('publish_date', { ascending: false });
    //
    // if (filter?.status) {
    //   query = query.eq('status', filter.status);
    // }
    // if (filter?.tag) {
    //   query = query.contains('tags', [filter.tag]);
    // }
    //
    // const { data, error } = await query;
    // if (error) setError(error.message);
    // else setChapters(data || []);

    setIsLoading(false);
  }, [filter?.status, filter?.tag]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  return { chapters, isLoading, error, refetch: fetchChapters };
}

// -------------------- useChapterMutations --------------------

interface UseChapterMutationsReturn {
  publishChapter: (chapter: Omit<Chapter, 'id' | 'publishDate' | 'views' | 'likes'>) => Promise<Chapter | null>;
  updateChapter: (id: string, updates: Partial<Chapter>) => Promise<boolean>;
  deleteChapter: (id: string) => Promise<boolean>;
  likeChapter: (id: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export function useChapterMutations(): UseChapterMutationsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publishChapter = useCallback(async (chapter: Omit<Chapter, 'id' | 'publishDate' | 'views' | 'likes'>): Promise<Chapter | null> => {
    setIsLoading(true);
    setError(null);

    // TODO: Insert into Supabase
    // const { data, error } = await supabase
    //   .from('chapters')
    //   .insert({
    //     ...chapter,
    //     publish_date: new Date().toISOString(),
    //     views: 0,
    //     likes: 0,
    //   })
    //   .select()
    //   .single();
    //
    // if (error) { setError(error.message); return null; }
    // return data;

    setIsLoading(false);
    return null;
  }, []);

  const updateChapter = useCallback(async (id: string, updates: Partial<Chapter>): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    // TODO: Update in Supabase
    // const { error } = await supabase
    //   .from('chapters')
    //   .update(updates)
    //   .eq('id', id);
    //
    // if (error) { setError(error.message); return false; }

    setIsLoading(false);
    return true;
  }, []);

  const deleteChapter = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    // TODO: Delete from Supabase
    // const { error } = await supabase
    //   .from('chapters')
    //   .delete()
    //   .eq('id', id);
    //
    // if (error) { setError(error.message); return false; }

    setIsLoading(false);
    return true;
  }, []);

  const likeChapter = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    // TODO: Increment likes in Supabase (use RPC for atomic increment)
    // const { error } = await supabase.rpc('increment_likes', { chapter_id: id });
    // if (error) { setError(error.message); return false; }

    setIsLoading(false);
    return true;
  }, []);

  return { publishChapter, updateChapter, deleteChapter, likeChapter, isLoading, error };
}

// -------------------- useUserProfile --------------------

interface UseUserProfileReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
}

export function useUserProfile(userId?: string): UseUserProfileReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    // TODO: Fetch user from Supabase
    // const fetchUser = async () => {
    //   setIsLoading(true);
    //   const { data, error } = await supabase
    //     .from('users')
    //     .select('*')
    //     .eq('id', userId)
    //     .single();
    //
    //   if (error) setError(error.message);
    //   else setUser(data);
    //   setIsLoading(false);
    // };
    // fetchUser();
  }, [userId]);

  const updateProfile = useCallback(async (updates: Partial<User>): Promise<boolean> => {
    if (!userId) return false;

    // TODO: Update in Supabase
    // const { error } = await supabase
    //   .from('users')
    //   .update(updates)
    //   .eq('id', userId);
    //
    // if (error) { setError(error.message); return false; }

    setUser(prev => prev ? { ...prev, ...updates } : null);
    return true;
  }, [userId]);

  return { user, isLoading, error, updateProfile };
}
