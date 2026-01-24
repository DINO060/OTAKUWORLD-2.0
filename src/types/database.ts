// ============================================
// DATABASE TYPES - Supabase Schema
// ============================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          bio?: string | null;
          updated_at?: string;
        };
      };
      live_messages: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          reply_to_id: string | null;
          hashtags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          reply_to_id?: string | null;
          hashtags?: string[];
          created_at?: string;
        };
        Update: {
          content?: string;
          hashtags?: string[];
        };
      };
      private_conversations: {
        Row: {
          id: string;
          participant_1: string;
          participant_2: string;
          last_message: string | null;
          last_message_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_1: string;
          participant_2: string;
          last_message?: string | null;
          last_message_at?: string | null;
          created_at?: string;
        };
        Update: {
          last_message?: string | null;
          last_message_at?: string | null;
        };
      };
      private_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
        };
      };
      chapters: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          chapter_number: number;
          status: 'new' | 'ongoing' | 'completed';
          content_type: 'text' | 'images' | 'pdf' | 'cbz';
          cover_url: string | null;
          views: number;
          likes: number;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          chapter_number: number;
          status?: 'new' | 'ongoing' | 'completed';
          content_type: 'text' | 'images' | 'pdf' | 'cbz';
          cover_url?: string | null;
          views?: number;
          likes?: number;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          chapter_number?: number;
          status?: 'new' | 'ongoing' | 'completed';
          cover_url?: string | null;
          views?: number;
          likes?: number;
          updated_at?: string;
        };
      };
      chapter_tags: {
        Row: {
          id: string;
          chapter_id: string;
          tag: string;
        };
        Insert: {
          id?: string;
          chapter_id: string;
          tag: string;
        };
        Update: {
          tag?: string;
        };
      };
      chapter_files: {
        Row: {
          id: string;
          chapter_id: string;
          file_url: string;
          file_type: string;
          page_number: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          chapter_id: string;
          file_url: string;
          file_type: string;
          page_number: number;
          created_at?: string;
        };
        Update: {
          file_url?: string;
          page_number?: number;
        };
      };
      chapter_likes: {
        Row: {
          id: string;
          chapter_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          chapter_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: never;
      };
    };
  };
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type LiveMessage = Database['public']['Tables']['live_messages']['Row'];
export type PrivateConversation = Database['public']['Tables']['private_conversations']['Row'];
export type PrivateMessage = Database['public']['Tables']['private_messages']['Row'];
export type Chapter = Database['public']['Tables']['chapters']['Row'];
export type ChapterTag = Database['public']['Tables']['chapter_tags']['Row'];
export type ChapterFile = Database['public']['Tables']['chapter_files']['Row'];
export type ChapterLike = Database['public']['Tables']['chapter_likes']['Row'];
