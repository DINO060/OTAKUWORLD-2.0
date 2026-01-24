-- ============================================
-- COMMENT LIVE - DATABASE SCHEMA
-- ============================================
-- Run this in Supabase SQL Editor (Database > SQL Editor)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (User public info)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. LIVE MESSAGES (Public chat)
-- ============================================
CREATE TABLE IF NOT EXISTS live_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  reply_to_id UUID REFERENCES live_messages(id) ON DELETE SET NULL,
  hashtags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_live_messages_created_at ON live_messages(created_at DESC);
CREATE INDEX idx_live_messages_hashtags ON live_messages USING GIN(hashtags);

-- ============================================
-- 3. PRIVATE CONVERSATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS private_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_1 UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  participant_2 UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_1, participant_2)
);

CREATE INDEX idx_conversations_participants ON private_conversations(participant_1, participant_2);

-- ============================================
-- 4. PRIVATE MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS private_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES private_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_private_messages_conversation ON private_messages(conversation_id, created_at DESC);

-- ============================================
-- 5. CHAPTERS
-- ============================================
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  chapter_number INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'ongoing', 'completed')),
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'images', 'pdf', 'cbz')),
  cover_url TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chapters_created_at ON chapters(created_at DESC);
CREATE INDEX idx_chapters_user ON chapters(user_id);
CREATE INDEX idx_chapters_status ON chapters(status);

-- ============================================
-- 6. CHAPTER TAGS
-- ============================================
CREATE TABLE IF NOT EXISTS chapter_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
  tag TEXT NOT NULL
);

CREATE INDEX idx_chapter_tags_chapter ON chapter_tags(chapter_id);
CREATE INDEX idx_chapter_tags_tag ON chapter_tags(tag);

-- ============================================
-- 7. CHAPTER FILES (pages/images)
-- ============================================
CREATE TABLE IF NOT EXISTS chapter_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  page_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chapter_files_chapter ON chapter_files(chapter_id, page_number);

-- ============================================
-- 8. CHAPTER LIKES
-- ============================================
CREATE TABLE IF NOT EXISTS chapter_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chapter_id, user_id)
);

-- Function to increment/decrement likes count
CREATE OR REPLACE FUNCTION update_chapter_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chapters SET likes = likes + 1 WHERE id = NEW.chapter_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chapters SET likes = likes - 1 WHERE id = OLD.chapter_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_chapter_like ON chapter_likes;
CREATE TRIGGER on_chapter_like
  AFTER INSERT OR DELETE ON chapter_likes
  FOR EACH ROW EXECUTE FUNCTION update_chapter_likes_count();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_likes ENABLE ROW LEVEL SECURITY;

-- PROFILES: Anyone can read, users can update their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- LIVE MESSAGES: Anyone can read, authenticated can insert
CREATE POLICY "Live messages are viewable by everyone" ON live_messages
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can post messages" ON live_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own messages" ON live_messages
  FOR DELETE USING (auth.uid() = user_id);

-- PRIVATE CONVERSATIONS: Only participants can see
CREATE POLICY "Users can see their conversations" ON private_conversations
  FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE POLICY "Users can create conversations" ON private_conversations
  FOR INSERT WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- PRIVATE MESSAGES: Only conversation participants can see
CREATE POLICY "Users can see messages in their conversations" ON private_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM private_conversations
      WHERE id = private_messages.conversation_id
      AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
  );
CREATE POLICY "Users can send messages in their conversations" ON private_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM private_conversations
      WHERE id = private_messages.conversation_id
      AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
  );

-- CHAPTERS: Anyone can read, authenticated can create
CREATE POLICY "Chapters are viewable by everyone" ON chapters
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create chapters" ON chapters
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own chapters" ON chapters
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chapters" ON chapters
  FOR DELETE USING (auth.uid() = user_id);

-- CHAPTER TAGS: Follow chapter access
CREATE POLICY "Chapter tags are viewable by everyone" ON chapter_tags
  FOR SELECT USING (true);
CREATE POLICY "Chapter owners can manage tags" ON chapter_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM chapters WHERE id = chapter_tags.chapter_id AND user_id = auth.uid())
  );

-- CHAPTER FILES: Follow chapter access
CREATE POLICY "Chapter files are viewable by everyone" ON chapter_files
  FOR SELECT USING (true);
CREATE POLICY "Chapter owners can manage files" ON chapter_files
  FOR ALL USING (
    EXISTS (SELECT 1 FROM chapters WHERE id = chapter_files.chapter_id AND user_id = auth.uid())
  );

-- CHAPTER LIKES: Anyone can read, authenticated can like
CREATE POLICY "Chapter likes are viewable by everyone" ON chapter_likes
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like chapters" ON chapter_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike chapters" ON chapter_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================
-- Enable realtime for live_messages
ALTER PUBLICATION supabase_realtime ADD TABLE live_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE private_messages;

-- ============================================
-- DONE! Your database is ready.
-- ============================================
