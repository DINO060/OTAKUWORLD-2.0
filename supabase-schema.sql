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
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'gif', 'sticker')),
  reply_to_id UUID REFERENCES live_messages(id) ON DELETE SET NULL,
  hashtags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- If table already exists without content_type, add it:
-- ALTER TABLE live_messages ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'gif', 'sticker'));

CREATE INDEX IF NOT EXISTS idx_live_messages_created_at ON live_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_messages_hashtags ON live_messages USING GIN(hashtags);

-- ============================================
-- 3. MESSAGE REACTIONS (Likes on chat messages)
-- ============================================
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES live_messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);

-- ============================================
-- 4. PRIVATE CONVERSATIONS
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

CREATE INDEX IF NOT EXISTS idx_conversations_participants ON private_conversations(participant_1, participant_2);

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

CREATE INDEX IF NOT EXISTS idx_private_messages_conversation ON private_messages(conversation_id, created_at DESC);

-- ============================================
-- 5. CHAPTERS
-- ============================================
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  chapter_number INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'ongoing', 'completed')),
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'images', 'file', 'pdf', 'cbz')),
  text_content TEXT,
  cover_url TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- If table already exists, add text_content column
-- ALTER TABLE chapters ADD COLUMN IF NOT EXISTS text_content TEXT;

CREATE INDEX IF NOT EXISTS idx_chapters_created_at ON chapters(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chapters_user ON chapters(user_id);
CREATE INDEX IF NOT EXISTS idx_chapters_status ON chapters(status);

-- ============================================
-- 6. CHAPTER TAGS
-- ============================================
CREATE TABLE IF NOT EXISTS chapter_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
  tag TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chapter_tags_chapter ON chapter_tags(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_tags_tag ON chapter_tags(tag);

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

CREATE INDEX IF NOT EXISTS idx_chapter_files_chapter ON chapter_files(chapter_id, page_number);

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
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- PROFILES: Anyone can read, users can update their own
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- LIVE MESSAGES: Anyone can read, authenticated can insert
DROP POLICY IF EXISTS "Live messages are viewable by everyone" ON live_messages;
CREATE POLICY "Live messages are viewable by everyone" ON live_messages
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can post messages" ON live_messages;
CREATE POLICY "Authenticated users can post messages" ON live_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own messages" ON live_messages;
CREATE POLICY "Users can delete their own messages" ON live_messages
  FOR DELETE USING (auth.uid() = user_id);

-- PRIVATE CONVERSATIONS: Only participants can see
DROP POLICY IF EXISTS "Users can see their conversations" ON private_conversations;
CREATE POLICY "Users can see their conversations" ON private_conversations
  FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
DROP POLICY IF EXISTS "Users can create conversations" ON private_conversations;
CREATE POLICY "Users can create conversations" ON private_conversations
  FOR INSERT WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- PRIVATE MESSAGES: Only conversation participants can see
DROP POLICY IF EXISTS "Users can see messages in their conversations" ON private_messages;
CREATE POLICY "Users can see messages in their conversations" ON private_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM private_conversations
      WHERE id = private_messages.conversation_id
      AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
  );
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON private_messages;
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
DROP POLICY IF EXISTS "Chapters are viewable by everyone" ON chapters;
CREATE POLICY "Chapters are viewable by everyone" ON chapters
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can create chapters" ON chapters;
CREATE POLICY "Authenticated users can create chapters" ON chapters
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own chapters" ON chapters;
CREATE POLICY "Users can update their own chapters" ON chapters
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own chapters" ON chapters;
CREATE POLICY "Users can delete their own chapters" ON chapters
  FOR DELETE USING (auth.uid() = user_id);

-- CHAPTER TAGS: Follow chapter access
DROP POLICY IF EXISTS "Chapter tags are viewable by everyone" ON chapter_tags;
CREATE POLICY "Chapter tags are viewable by everyone" ON chapter_tags
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Chapter owners can manage tags" ON chapter_tags;
CREATE POLICY "Chapter owners can manage tags" ON chapter_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM chapters WHERE id = chapter_tags.chapter_id AND user_id = auth.uid())
  );

-- CHAPTER FILES: Follow chapter access
DROP POLICY IF EXISTS "Chapter files are viewable by everyone" ON chapter_files;
CREATE POLICY "Chapter files are viewable by everyone" ON chapter_files
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Chapter owners can manage files" ON chapter_files;
CREATE POLICY "Chapter owners can manage files" ON chapter_files
  FOR ALL USING (
    EXISTS (SELECT 1 FROM chapters WHERE id = chapter_files.chapter_id AND user_id = auth.uid())
  );

-- CHAPTER LIKES: Anyone can read, authenticated can like
DROP POLICY IF EXISTS "Chapter likes are viewable by everyone" ON chapter_likes;
CREATE POLICY "Chapter likes are viewable by everyone" ON chapter_likes
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can like chapters" ON chapter_likes;
CREATE POLICY "Authenticated users can like chapters" ON chapter_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unlike chapters" ON chapter_likes;
CREATE POLICY "Users can unlike chapters" ON chapter_likes
  FOR DELETE USING (auth.uid() = user_id);

-- MESSAGE REACTIONS: Anyone can read, authenticated can react
DROP POLICY IF EXISTS "Message reactions are viewable by everyone" ON message_reactions;
CREATE POLICY "Message reactions are viewable by everyone" ON message_reactions
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can add reactions" ON message_reactions;
CREATE POLICY "Authenticated users can add reactions" ON message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can remove their reactions" ON message_reactions;
CREATE POLICY "Users can remove their reactions" ON message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================
-- Enable realtime (idempotent — ignores if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE live_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE private_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- STORAGE BUCKET & POLICIES
-- ============================================
-- Note: Run this AFTER creating the bucket in Supabase Dashboard
-- Storage > New Bucket > Name: "chapters" > Public bucket: ON

-- Storage policies for 'chapters' bucket
-- Policy 1: Anyone can view/download files (public bucket)
DROP POLICY IF EXISTS "Public read access for chapters" ON storage.objects;
CREATE POLICY "Public read access for chapters"
ON storage.objects FOR SELECT
USING (bucket_id = 'chapters');

-- Policy 2: Authenticated users can upload files
DROP POLICY IF EXISTS "Authenticated users can upload chapter files" ON storage.objects;
CREATE POLICY "Authenticated users can upload chapter files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chapters'
  AND auth.role() = 'authenticated'
);

-- Policy 3: Users can update their own files
DROP POLICY IF EXISTS "Users can update their own chapter files" ON storage.objects;
CREATE POLICY "Users can update their own chapter files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'chapters'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Users can delete their own files
DROP POLICY IF EXISTS "Users can delete their own chapter files" ON storage.objects;
CREATE POLICY "Users can delete their own chapter files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chapters'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- DONE! Your database is ready.
-- ============================================

-- ============================================
-- MIGRATION v2 — Profiles handle + Ads media
-- ============================================

-- 12. Profile @handle (unique, nullable)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS handle TEXT UNIQUE;

-- 13. Ads media support
ALTER TABLE managed_ads ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'none';
ALTER TABLE managed_ads ADD COLUMN IF NOT EXISTS media_url TEXT;
-- Make body nullable (video/image ads may have no text body)
ALTER TABLE managed_ads ALTER COLUMN body DROP NOT NULL;
--
-- MANUAL STEPS in Supabase Dashboard:
-- 1. Go to Storage > Create new bucket
-- 2. Name: "chapters"
-- 3. Public bucket: ON (checked)
-- 4. File size limit: 50MB (or your preference)
-- 5. Allowed MIME types: image/*, application/pdf
-- ============================================

-- ============================================
-- MIGRATIONS (run if tables already exist)
-- ============================================

-- 1. Allow DMs privacy setting
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allow_dms BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Chapter file columns (PDF/CBZ upload)
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS file_type TEXT;

-- 3. live_messages content_type (GIF/sticker support)
ALTER TABLE live_messages ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'text';
-- Update constraint if it doesn't exist yet:
ALTER TABLE live_messages DROP CONSTRAINT IF EXISTS live_messages_content_type_check;
ALTER TABLE live_messages ADD CONSTRAINT live_messages_content_type_check CHECK (content_type IN ('text', 'gif', 'sticker'));

-- 4. RLS UPDATE policy for live_messages (required for editMessage)
DROP POLICY IF EXISTS "Users can edit their own messages" ON live_messages;
CREATE POLICY "Users can edit their own messages" ON live_messages
  FOR UPDATE USING (auth.uid() = user_id);

-- 5. RLS UPDATE policy for private_conversations (required to update last_message when sending DM)
DROP POLICY IF EXISTS "Participants can update conversation" ON private_conversations;
CREATE POLICY "Participants can update conversation" ON private_conversations
  FOR UPDATE USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- 6. RLS UPDATE policy for private_messages (required for markAsRead)
DROP POLICY IF EXISTS "Users can mark messages as read" ON private_messages;
CREATE POLICY "Users can mark messages as read" ON private_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM private_conversations
      WHERE id = private_messages.conversation_id
      AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
  );

-- ============================================
-- ADMIN SYSTEM MIGRATIONS
-- ============================================

-- 7. Admin flag on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
-- To make a user admin (replace with real UUID):
-- UPDATE profiles SET is_admin = TRUE WHERE id = 'YOUR_USER_UUID';

-- 8. User reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_message_id UUID REFERENCES live_messages(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);

-- 9. User bans
CREATE TABLE IF NOT EXISTS bans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT,
  ban_type TEXT DEFAULT 'temp' CHECK (ban_type IN ('temp', 'permanent')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bans_user ON bans(user_id);

-- 10. Admin-managed ads
CREATE TABLE IF NOT EXISTS managed_ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT DEFAULT 'PROMO',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  cta TEXT NOT NULL,
  href TEXT NOT NULL,
  gradient TEXT DEFAULT 'from-purple-500 to-blue-600',
  emoji TEXT DEFAULT '📢',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can submit reports" ON reports;
CREATE POLICY "Authenticated users can submit reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Admins can view reports" ON reports;
CREATE POLICY "Admins can view reports" ON reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );
DROP POLICY IF EXISTS "Admins can update reports" ON reports;
CREATE POLICY "Admins can update reports" ON reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- RLS for bans
ALTER TABLE bans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can check their own ban" ON bans;
CREATE POLICY "Users can check their own ban" ON bans
  FOR SELECT USING (auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );
DROP POLICY IF EXISTS "Admins can manage bans" ON bans;
CREATE POLICY "Admins can manage bans" ON bans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- RLS for managed_ads
ALTER TABLE managed_ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active ads" ON managed_ads;
CREATE POLICY "Anyone can view active ads" ON managed_ads
  FOR SELECT USING (is_active = TRUE OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );
DROP POLICY IF EXISTS "Admins can manage ads" ON managed_ads;
CREATE POLICY "Admins can manage ads" ON managed_ads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE reports;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- MIGRATION v3 — Loup-Garou Notification Templates
-- ============================================

-- 14. Game notification templates (admin-customizable)
CREATE TABLE IF NOT EXISTS game_notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_key TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  default_message TEXT NOT NULL,
  custom_message TEXT,
  icon TEXT NOT NULL DEFAULT '📢',
  media_type TEXT DEFAULT 'none' CHECK (media_type IN ('none', 'image', 'gif', 'video')),
  media_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- RLS for game_notification_templates
ALTER TABLE game_notification_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can read active templates (game needs them)
DROP POLICY IF EXISTS "Anyone can view notification templates" ON game_notification_templates;
CREATE POLICY "Anyone can view notification templates" ON game_notification_templates
  FOR SELECT USING (TRUE);

-- Only admins can manage templates
DROP POLICY IF EXISTS "Admins can manage notification templates" ON game_notification_templates;
CREATE POLICY "Admins can manage notification templates" ON game_notification_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Seed default notification templates
INSERT INTO game_notification_templates (notification_key, category, default_message, icon) VALUES
  -- Kills
  ('wolf_kill', 'kills', 'Dévoré par les loups', '💀'),
  ('sk_kill', 'kills', 'Poignardé par le Serial Killer', '🔪'),
  ('witch_poison', 'kills', 'Empoisonné par la Sorcière', '🧪'),
  ('hunter_shot', 'kills', 'Abattu par le Chasseur', '🏹'),
  ('gunner_shot', 'kills', 'Abattu par le Gunner', '🔫'),
  ('ninja_kill', 'kills', 'Assassiné par le Ninja', '🥷'),
  ('arsonist_ignite', 'kills', 'Brûlé par le Pyromane', '🔥'),
  ('plague_epidemic', 'kills', 'Épidémie ! Infecté par le Médecin Peste', '🦠'),
  ('cult_hunter_kill', 'kills', 'Chassé par le Chasseur de Culte', '💂'),
  ('knight_counter', 'kills', 'Tué par le Chevalier', '⚔️'),
  ('sk_counter', 'kills', 'Tué par le SK (contre-attaque)', '🔪'),
  ('big_bad_wolf_kill', 'kills', 'Dévoré par le Grand Méchant Loup', '🐺💀'),
  ('angel_kill', 'kills', 'Tué par l''Ange Déchu', '👼🐺'),
  ('alchemist_kill', 'kills', 'Empoisonné par l''Alchimiste', '🍵'),
  ('wolf_cub_rage', 'kills', 'Tué par la rage du Louveteau', '🐺🍼'),
  ('harlot_death', 'kills', 'Tuée en visitant un loup (Courtisane)', '💋'),
  ('cult_hunter_counter', 'kills', 'Dernier converti éliminé par le Chasseur de Culte', '💂'),
  -- Lynch
  ('lynch', 'lynch', 'Lynché par le village', '⚖️'),
  ('scapegoat_death', 'lynch', 'Sacrifié (égalité au vote)', '🐐'),
  ('lover_death', 'lynch', 'Mort de chagrin (Amoureux)', '💔'),
  ('idiot_survives', 'lynch', 'L''Idiot du Village survit au lynch ! Il perd son droit de vote.', '🤪'),
  ('pacifist_blocks', 'lynch', 'Le Pacifiste empêche le lynch aujourd''hui !', '☮️'),
  -- Transformations
  ('cursed_converts', 'transforms', 'Le Maudit survit et rejoint les loups !', '😾'),
  ('wild_child_converts', 'transforms', 'L''Enfant Sauvage rejoint les loups — son modèle est mort !', '🧒🌿'),
  ('traitor_converts', 'transforms', 'Le Traître se révèle — il est le dernier loup !', '🖕'),
  ('alpha_converts', 'transforms', 'Le Loup Alpha convertit sa victime !', '🐺👑'),
  ('executioner_becomes_fool', 'transforms', 'La cible du Bourreau est morte autrement — il devient Fou !', '🎯'),
  ('doppelganger_copies', 'transforms', 'Le Doppelgänger copie le rôle de sa cible !', '🎭'),
  ('servant_steals', 'transforms', 'La Servante Dévouée prend le rôle du lynché !', '🎭'),
  -- Protections
  ('witch_save', 'protections', 'La Sorcière utilise sa potion de vie !', '🧪✨'),
  ('guard_protect', 'protections', 'Le Garde protège un joueur cette nuit.', '🛡️'),
  ('elder_survives', 'protections', 'L''Ancien survit à l''attaque des loups !', '👴'),
  ('martyr_sacrifice', 'protections', 'Le Martyr se sacrifie pour son protégé !', '🔰'),
  ('blacksmith_blocks', 'protections', 'Le Forgeron bloque les loups cette nuit !', '⚒'),
  ('sandman_blocks', 'protections', 'Le Sandman endort tout le monde — aucune action nocturne !', '💤'),
  -- Reveals / Info
  ('bear_growl', 'info', 'L''ours grogne ! Un loup est voisin du Montreur d''Ours.', '🐻'),
  ('bear_silent', 'info', 'L''ours est calme. Aucun loup voisin.', '🐻'),
  ('seer_sees', 'info', 'La Voyante découvre le rôle d''un joueur.', '🔮'),
  ('detective_same', 'info', 'Le Détective compare : même camp !', '🕵️'),
  ('detective_diff', 'info', 'Le Détective compare : camps différents !', '🕵️'),
  ('augur_excludes', 'info', 'L''Augure apprend un rôle absent de la partie.', '🦅'),
  -- Victories
  ('wolf_wins', 'victory', 'Les Loups-Garous ont dévoré le village ! Victoire des Loups !', '🐺🏆'),
  ('village_wins', 'victory', 'Le village a éliminé tous les loups ! Victoire du Village !', '🏡🏆'),
  ('solo_wins', 'victory', 'Un joueur solitaire remporte la partie !', '⚡🏆'),
  ('lovers_win', 'victory', 'Les Amoureux sont les derniers survivants ! Victoire de l''Amour !', '💕🏆'),
  ('cult_wins', 'victory', 'Le Culte a converti tous les vivants ! Victoire du Culte !', '🕯️🏆'),
  ('fool_wins', 'victory', 'Le Fou s''est fait lyncher — il gagne la partie !', '🤡🏆'),
  -- Phases
  ('night_starts', 'phase', 'La nuit tombe sur le village...', '🌙'),
  ('day_starts', 'phase', 'Le soleil se lève. Le village se réveille.', '☀️'),
  ('vote_starts', 'phase', 'Le village délibère. Qui sera lynché ?', '🗳️'),
  ('discussion_starts', 'phase', 'Discussion ouverte ! Partagez vos soupçons.', '💬')
ON CONFLICT (notification_key) DO NOTHING;

-- 11. User feedbacks
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  username TEXT NOT NULL DEFAULT 'Anonyme',
  message TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'bug', 'feature', 'other')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'done')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status, created_at DESC);

-- RLS for feedbacks
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit feedback" ON feedbacks;
CREATE POLICY "Anyone can submit feedback" ON feedbacks
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can view feedbacks" ON feedbacks;
CREATE POLICY "Admins can view feedbacks" ON feedbacks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );
DROP POLICY IF EXISTS "Admins can update feedbacks" ON feedbacks;
CREATE POLICY "Admins can update feedbacks" ON feedbacks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ============================================
-- MIGRATION v3 — Content Rating & Chapter Reports
-- ============================================

-- 14. Content rating on chapters (all / 16+ / 18+)
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS content_rating TEXT DEFAULT 'all';
-- If constraint already exists, drop it first:
ALTER TABLE chapters DROP CONSTRAINT IF EXISTS chapters_content_rating_check;
ALTER TABLE chapters ADD CONSTRAINT chapters_content_rating_check CHECK (content_rating IN ('all', '16+', '18+'));

-- 15. Mature content filter preference on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mature_filter TEXT DEFAULT 'blur';
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_mature_filter_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_mature_filter_check CHECK (mature_filter IN ('show', 'blur', 'hide'));

-- 16. Chapter reports — allow reporting chapters (not just users/messages)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reported_chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL;

-- ============================================
-- 17. OTAKU FEED — Posts, Likes, Comments
-- ============================================

CREATE TABLE IF NOT EXISTS feed_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'chapter', 'quiz', 'poll', 'game')),
  images TEXT[] DEFAULT '{}',
  embed_type TEXT,
  embed_title TEXT,
  embed_subtitle TEXT,
  embed_icon TEXT,
  poll_question TEXT,
  poll_options JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feed_post_likes (
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS feed_post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feed_poll_votes (
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- RLS on feed tables
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_poll_votes ENABLE ROW LEVEL SECURITY;

-- feed_posts policies
DROP POLICY IF EXISTS "Anyone can read posts" ON feed_posts;
CREATE POLICY "Anyone can read posts" ON feed_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can create posts" ON feed_posts;
CREATE POLICY "Auth users can create posts" ON feed_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON feed_posts;
CREATE POLICY "Users can delete own posts" ON feed_posts FOR DELETE USING (auth.uid() = user_id);

-- feed_post_likes policies
DROP POLICY IF EXISTS "Anyone can read likes" ON feed_post_likes;
CREATE POLICY "Anyone can read likes" ON feed_post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can like" ON feed_post_likes;
CREATE POLICY "Auth users can like" ON feed_post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike" ON feed_post_likes;
CREATE POLICY "Users can unlike" ON feed_post_likes FOR DELETE USING (auth.uid() = user_id);

-- feed_post_comments policies
DROP POLICY IF EXISTS "Anyone can read comments" ON feed_post_comments;
CREATE POLICY "Anyone can read comments" ON feed_post_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can comment" ON feed_post_comments;
CREATE POLICY "Auth users can comment" ON feed_post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON feed_post_comments;
CREATE POLICY "Users can delete own comments" ON feed_post_comments FOR DELETE USING (auth.uid() = user_id);

-- feed_poll_votes policies
DROP POLICY IF EXISTS "Anyone can read votes" ON feed_poll_votes;
CREATE POLICY "Anyone can read votes" ON feed_poll_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can vote" ON feed_poll_votes;
CREATE POLICY "Auth users can vote" ON feed_poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Realtime for feed
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE feed_posts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE feed_post_comments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- FOLLOWERS / FOLLOWING SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS followers (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read followers" ON followers;
CREATE POLICY "Anyone can read followers" ON followers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can follow" ON followers;
CREATE POLICY "Auth users can follow" ON followers FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON followers;
CREATE POLICY "Users can unfollow" ON followers FOR DELETE USING (auth.uid() = follower_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id);

-- Realtime for followers
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE followers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 18. QUIZ SYSTEM TABLES
-- ============================================

-- Quizzes (main quiz metadata)
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Anime',
  category_emoji TEXT NOT NULL DEFAULT '🎬',
  cover_image TEXT,
  timer_seconds INT NOT NULL DEFAULT 15,
  duration_hours INT NOT NULL DEFAULT 24,
  max_players INT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  players_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- Quiz Questions (JSONB answers array per question)
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  image_url TEXT,
  answers JSONB NOT NULL DEFAULT '[]',
  sort_order INT NOT NULL DEFAULT 0
);

-- Quiz Results (one per player per quiz)
CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  correct_answers INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(quiz_id, user_id)
);

-- Quiz Comments
CREATE TABLE IF NOT EXISTS quiz_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES quiz_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quiz Comment Likes
CREATE TABLE IF NOT EXISTS quiz_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES quiz_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(comment_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz ON quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_comments_quiz ON quiz_comments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_comments_parent ON quiz_comments(parent_id);

-- RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_comment_likes ENABLE ROW LEVEL SECURITY;

-- Quizzes policies
DROP POLICY IF EXISTS "Anyone can read quizzes" ON quizzes;
CREATE POLICY "Anyone can read quizzes" ON quizzes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can create quizzes" ON quizzes;
CREATE POLICY "Auth users can create quizzes" ON quizzes FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update own quizzes" ON quizzes;
CREATE POLICY "Authors can update own quizzes" ON quizzes FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete own quizzes" ON quizzes;
CREATE POLICY "Authors can delete own quizzes" ON quizzes FOR DELETE USING (auth.uid() = author_id);

-- Quiz Questions policies
DROP POLICY IF EXISTS "Anyone can read quiz questions" ON quiz_questions;
CREATE POLICY "Anyone can read quiz questions" ON quiz_questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Quiz authors can insert questions" ON quiz_questions;
CREATE POLICY "Quiz authors can insert questions" ON quiz_questions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM quizzes WHERE id = quiz_id AND author_id = auth.uid())
  );

DROP POLICY IF EXISTS "Quiz authors can update questions" ON quiz_questions;
CREATE POLICY "Quiz authors can update questions" ON quiz_questions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM quizzes WHERE id = quiz_id AND author_id = auth.uid())
  );

DROP POLICY IF EXISTS "Quiz authors can delete questions" ON quiz_questions;
CREATE POLICY "Quiz authors can delete questions" ON quiz_questions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM quizzes WHERE id = quiz_id AND author_id = auth.uid())
  );

-- Quiz Results policies
DROP POLICY IF EXISTS "Anyone can read quiz results" ON quiz_results;
CREATE POLICY "Anyone can read quiz results" ON quiz_results FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can insert results" ON quiz_results;
CREATE POLICY "Auth users can insert results" ON quiz_results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Quiz Comments policies
DROP POLICY IF EXISTS "Anyone can read quiz comments" ON quiz_comments;
CREATE POLICY "Anyone can read quiz comments" ON quiz_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can insert quiz comments" ON quiz_comments;
CREATE POLICY "Auth users can insert quiz comments" ON quiz_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authors can delete own quiz comments" ON quiz_comments;
CREATE POLICY "Authors can delete own quiz comments" ON quiz_comments FOR DELETE USING (auth.uid() = user_id);

-- Quiz Comment Likes policies
DROP POLICY IF EXISTS "Anyone can read quiz comment likes" ON quiz_comment_likes;
CREATE POLICY "Anyone can read quiz comment likes" ON quiz_comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can like quiz comments" ON quiz_comment_likes;
CREATE POLICY "Auth users can like quiz comments" ON quiz_comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike quiz comments" ON quiz_comment_likes;
CREATE POLICY "Users can unlike quiz comments" ON quiz_comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Update players_count trigger
CREATE OR REPLACE FUNCTION update_quiz_players_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE quizzes SET players_count = (
    SELECT COUNT(*) FROM quiz_results WHERE quiz_id = NEW.quiz_id
  ) WHERE id = NEW.quiz_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_quiz_result_insert ON quiz_results;
CREATE TRIGGER on_quiz_result_insert
  AFTER INSERT ON quiz_results
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_players_count();

-- Update comment likes_count trigger
CREATE OR REPLACE FUNCTION update_quiz_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE quiz_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE quiz_comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_quiz_comment_like_change ON quiz_comment_likes;
CREATE TRIGGER on_quiz_comment_like_change
  AFTER INSERT OR DELETE ON quiz_comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_comment_likes_count();

-- Realtime for quizzes
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE quizzes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE quiz_comments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE game_notification_templates;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- MIGRATION v4: RPC functions + Loup-Garou tables
-- ============================================

-- RPC: Increment chapter views atomically (avoids race conditions)
CREATE OR REPLACE FUNCTION public.increment_chapter_views(chapter_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE chapters SET views = COALESCE(views, 0) + 1 WHERE id = chapter_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Loup-Garou: Game Rooms ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'normal' CHECK (mode IN ('normal', 'chaos')),
  max_players INT NOT NULL DEFAULT 10 CHECK (max_players BETWEEN 4 AND 30),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'finished')),
  current_phase TEXT DEFAULT 'lobby' CHECK (current_phase IN ('lobby', 'night', 'day_discussion', 'day_vote', 'results')),
  phase_end_at TIMESTAMPTZ,
  day_number INT DEFAULT 0,
  winner TEXT CHECK (winner IN ('village', 'wolves', 'draw')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

-- ─── Loup-Garou: Game Players ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT,
  is_alive BOOLEAN DEFAULT TRUE,
  killed_by TEXT,
  killed_at_day INT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- ─── Loup-Garou: Game Actions (votes, kills, protections) ──────────────────
CREATE TABLE IF NOT EXISTS game_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('night', 'day_vote')),
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('wolf_kill', 'seer_check', 'witch_heal', 'witch_poison', 'hunter_shot', 'bodyguard_protect', 'vote_lynch')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Loup-Garou: Game Chat ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'public' CHECK (channel IN ('public', 'wolves', 'dead', 'system')),
  media_url TEXT,
  media_type TEXT DEFAULT 'none' CHECK (media_type IN ('none', 'image', 'gif', 'video')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for game_rooms
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view game rooms" ON game_rooms;
CREATE POLICY "Anyone can view game rooms" ON game_rooms FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON game_rooms;
CREATE POLICY "Authenticated users can create rooms" ON game_rooms FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Host can update room" ON game_rooms;
CREATE POLICY "Host can update room" ON game_rooms FOR UPDATE USING (host_id = auth.uid());

-- RLS for game_players
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view players" ON game_players;
CREATE POLICY "Anyone can view players" ON game_players FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can join" ON game_players;
CREATE POLICY "Authenticated users can join" ON game_players FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Players can update own record" ON game_players;
CREATE POLICY "Players can update own record" ON game_players FOR UPDATE USING (user_id = auth.uid());

-- RLS for game_actions
ALTER TABLE game_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Players in room can view actions" ON game_actions;
CREATE POLICY "Players in room can view actions" ON game_actions FOR SELECT USING (
  EXISTS (SELECT 1 FROM game_players WHERE game_players.room_id = game_actions.room_id AND game_players.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Players can insert actions" ON game_actions;
CREATE POLICY "Players can insert actions" ON game_actions FOR INSERT WITH CHECK (auth.uid() = actor_id);

-- RLS for game_messages
ALTER TABLE game_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Players in room can view messages" ON game_messages;
CREATE POLICY "Players in room can view messages" ON game_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM game_players WHERE game_players.room_id = game_messages.room_id AND game_players.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Players can send messages" ON game_messages;
CREATE POLICY "Players can send messages" ON game_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for game tables
CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON game_rooms(code);
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);
CREATE INDEX IF NOT EXISTS idx_game_players_room ON game_players(room_id);
CREATE INDEX IF NOT EXISTS idx_game_players_user ON game_players(user_id);
CREATE INDEX IF NOT EXISTS idx_game_actions_room_day ON game_actions(room_id, day_number);
CREATE INDEX IF NOT EXISTS idx_game_messages_room ON game_messages(room_id, created_at);

-- Realtime for game tables
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE game_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- MIGRATION v5: Mutes table (temporary muting)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  muted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT DEFAULT '',
  muted_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE mutes ENABLE ROW LEVEL SECURITY;

-- Admins can manage mutes
DROP POLICY IF EXISTS "Admins can manage mutes" ON mutes;
CREATE POLICY "Admins can manage mutes" ON mutes
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Users can read their own mute status
DROP POLICY IF EXISTS "Users can read own mute" ON mutes;
CREATE POLICY "Users can read own mute" ON mutes
  FOR SELECT USING (user_id = auth.uid());

-- ---------------------------------------------------------------
-- MIGRATION v6: Loup-Garou Stats
-- ---------------------------------------------------------------

-- Fix game_rooms mode constraint (add anarchie)
ALTER TABLE game_rooms DROP CONSTRAINT IF EXISTS game_rooms_mode_check;
ALTER TABLE game_rooms ADD CONSTRAINT game_rooms_mode_check CHECK (mode IN ('normal', 'chaos', 'anarchie'));

-- Fix game_rooms winner constraint (add all camps)
ALTER TABLE game_rooms DROP CONSTRAINT IF EXISTS game_rooms_winner_check;
ALTER TABLE game_rooms ADD CONSTRAINT game_rooms_winner_check CHECK (winner IN ('village', 'wolf', 'solo', 'cult', 'lovers', 'anarchie', 'draw'));

-- Fix game_rooms status constraint (add finished)
ALTER TABLE game_rooms DROP CONSTRAINT IF EXISTS game_rooms_status_check;
ALTER TABLE game_rooms ADD CONSTRAINT game_rooms_status_check CHECK (status IN ('waiting', 'in_progress', 'finished'));

-- Loup-Garou: Game Stats per user
CREATE TABLE IF NOT EXISTS game_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  total_points INT NOT NULL DEFAULT 0,
  games_played INT NOT NULL DEFAULT 0,
  games_won INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  total_kills INT NOT NULL DEFAULT 0,
  times_saved INT NOT NULL DEFAULT 0,
  times_elected_mayor INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loup-Garou: Game History per user
CREATE TABLE IF NOT EXISTS game_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES game_rooms(id) ON DELETE SET NULL,
  role_id TEXT NOT NULL,
  role_name TEXT NOT NULL,
  role_icon TEXT NOT NULL DEFAULT '',
  won BOOLEAN NOT NULL DEFAULT FALSE,
  points_earned INT NOT NULL DEFAULT 0,
  game_mode TEXT NOT NULL DEFAULT 'normal',
  played_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for game_stats
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view game stats" ON game_stats;
CREATE POLICY "Anyone can view game stats" ON game_stats FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can upsert own stats" ON game_stats;
CREATE POLICY "Users can upsert own stats" ON game_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own stats" ON game_stats;
CREATE POLICY "Users can update own stats" ON game_stats FOR UPDATE USING (auth.uid() = user_id);

-- RLS for game_history
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view game history" ON game_history;
CREATE POLICY "Anyone can view game history" ON game_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own history" ON game_history;
CREATE POLICY "Users can insert own history" ON game_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_stats_points ON game_stats(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_user ON game_history(user_id, played_at DESC);

-- ---------------------------------------------------------------
-- MIGRATION v7: Badge extended stats
-- ---------------------------------------------------------------
ALTER TABLE game_stats ADD COLUMN IF NOT EXISTS wolf_wins INT NOT NULL DEFAULT 0;
ALTER TABLE game_stats ADD COLUMN IF NOT EXISTS village_wins INT NOT NULL DEFAULT 0;
ALTER TABLE game_stats ADD COLUMN IF NOT EXISTS seer_wins INT NOT NULL DEFAULT 0;
ALTER TABLE game_stats ADD COLUMN IF NOT EXISTS sk_wins INT NOT NULL DEFAULT 0;
ALTER TABLE game_stats ADD COLUMN IF NOT EXISTS fool_wins INT NOT NULL DEFAULT 0;
ALTER TABLE game_stats ADD COLUMN IF NOT EXISTS lover_wins INT NOT NULL DEFAULT 0;
ALTER TABLE game_stats ADD COLUMN IF NOT EXISTS hunter_kills INT NOT NULL DEFAULT 0;
ALTER TABLE game_stats ADD COLUMN IF NOT EXISTS best_explosion_kills INT NOT NULL DEFAULT 0;
