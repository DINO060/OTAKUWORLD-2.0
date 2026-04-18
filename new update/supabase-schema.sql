-- ============================================
-- COMMENT LIVE - Chat System Schema
-- Supabase PostgreSQL
-- ============================================

-- ==========================================
-- 1. TABLES PRINCIPALES
-- ==========================================

-- Profils utilisateurs (extension de auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline', 'away', 'dnd')),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms / Groupes
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  type TEXT NOT NULL DEFAULT 'group' CHECK (type IN ('global', 'group', 'dm')),
  is_public BOOLEAN DEFAULT TRUE,
  max_members INT DEFAULT 200,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membres des rooms
CREATE TABLE public.room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
  nickname TEXT,
  is_muted BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'sticker', 'gif', 'system', 'emoji_only')),
  -- Pour les stickers/gifs
  media_url TEXT,
  media_type TEXT, -- 'sticker', 'gif'
  -- Reply/Quote
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  -- Mentions (array d'user IDs)
  mentions UUID[] DEFAULT '{}',
  -- Metadata
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Réactions sur les messages
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL, -- '👍', '❤️', '😂', '🔥', '😢', '😮' ou custom emoji ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji) -- un user = une réaction par emoji par message
);

-- Packs de stickers
CREATE TABLE public.sticker_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_official BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  download_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stickers individuels
CREATE TABLE public.stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL, -- URL vers R2 ou CDN
  emoji_shortcode TEXT, -- :happy_cat: par exemple
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sticker packs que l'user a ajoutés
CREATE TABLE public.user_sticker_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pack_id)
);

-- Emojis custom de la plateforme
CREATE TABLE public.custom_emojis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- :commentlive_fire:
  url TEXT NOT NULL, -- URL vers l'image
  category TEXT DEFAULT 'general',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Utilisateurs qui ont été mentionnés (pour les notifs)
CREATE TABLE public.mention_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room global par défaut
INSERT INTO public.rooms (name, description, type, is_public)
VALUES ('Global Chat', 'Le chat principal de Comment Live', 'global', TRUE);


-- ==========================================
-- 2. INDEX POUR PERFORMANCE
-- ==========================================

CREATE INDEX idx_messages_room_id ON public.messages(room_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_room_created ON public.messages(room_id, created_at DESC);
CREATE INDEX idx_messages_reply_to ON public.messages(reply_to) WHERE reply_to IS NOT NULL;
CREATE INDEX idx_messages_user_id ON public.messages(user_id);

CREATE INDEX idx_reactions_message_id ON public.reactions(message_id);
CREATE INDEX idx_room_members_room_id ON public.room_members(room_id);
CREATE INDEX idx_room_members_user_id ON public.room_members(user_id);
CREATE INDEX idx_mention_notifications_user ON public.mention_notifications(user_id, is_read);

CREATE INDEX idx_stickers_pack_id ON public.stickers(pack_id);
CREATE INDEX idx_user_sticker_packs_user ON public.user_sticker_packs(user_id);


-- ==========================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sticker_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sticker_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_emojis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mention_notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Profiles visibles par tous" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ROOMS
CREATE POLICY "Public rooms visibles par tous" ON public.rooms
  FOR SELECT USING (
    is_public = TRUE
    OR type = 'global'
    OR id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create rooms" ON public.rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Room owners/admins can update" ON public.rooms
  FOR UPDATE USING (
    created_by = auth.uid()
    OR id IN (
      SELECT room_id FROM public.room_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ROOM MEMBERS
CREATE POLICY "Members visible to room members" ON public.room_members
  FOR SELECT USING (
    room_id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid())
    OR room_id IN (SELECT id FROM public.rooms WHERE is_public = TRUE OR type = 'global')
  );

CREATE POLICY "Users can join public rooms" ON public.room_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND room_id IN (SELECT id FROM public.rooms WHERE is_public = TRUE OR type = 'global')
  );

CREATE POLICY "Users can leave rooms" ON public.room_members
  FOR DELETE USING (auth.uid() = user_id);

-- MESSAGES
CREATE POLICY "Messages visible to room members" ON public.messages
  FOR SELECT USING (
    room_id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid())
    OR room_id IN (SELECT id FROM public.rooms WHERE type = 'global')
  );

CREATE POLICY "Members can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      room_id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid())
      OR room_id IN (SELECT id FROM public.rooms WHERE type = 'global')
    )
  );

CREATE POLICY "Users can edit own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = user_id);

-- REACTIONS
CREATE POLICY "Reactions visible with messages" ON public.reactions
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM public.messages WHERE room_id IN (
        SELECT room_id FROM public.room_members WHERE user_id = auth.uid()
      )
      OR room_id IN (SELECT id FROM public.rooms WHERE type = 'global')
    )
  );

CREATE POLICY "Users can add reactions" ON public.reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions" ON public.reactions
  FOR DELETE USING (auth.uid() = user_id);

-- STICKER PACKS & STICKERS
CREATE POLICY "Sticker packs visible by all" ON public.sticker_packs
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Stickers visible by all" ON public.stickers
  FOR SELECT USING (true);

CREATE POLICY "User sticker packs" ON public.user_sticker_packs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "User can add sticker packs" ON public.user_sticker_packs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can remove sticker packs" ON public.user_sticker_packs
  FOR DELETE USING (auth.uid() = user_id);

-- CUSTOM EMOJIS
CREATE POLICY "Custom emojis visible by all" ON public.custom_emojis
  FOR SELECT USING (is_active = TRUE);

-- MENTION NOTIFICATIONS
CREATE POLICY "Users see own notifications" ON public.mention_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.mention_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can mark own as read" ON public.mention_notifications
  FOR UPDATE USING (auth.uid() = user_id);


-- ==========================================
-- 4. FUNCTIONS & TRIGGERS
-- ==========================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', 'User'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Auto-join global chat
  INSERT INTO public.room_members (room_id, user_id, role)
  SELECT id, NEW.id, 'member'
  FROM public.rooms WHERE type = 'global' LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-set room creator as owner
CREATE OR REPLACE FUNCTION public.handle_new_room()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NOT NULL AND NEW.type != 'global' THEN
    INSERT INTO public.room_members (room_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'owner')
    ON CONFLICT (room_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_room_created
  AFTER INSERT ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_room();

-- Create mention notifications when message has mentions
CREATE OR REPLACE FUNCTION public.handle_message_mentions()
RETURNS TRIGGER AS $$
BEGIN
  IF array_length(NEW.mentions, 1) > 0 THEN
    INSERT INTO public.mention_notifications (user_id, message_id, room_id)
    SELECT unnest(NEW.mentions), NEW.id, NEW.room_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_with_mentions
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_message_mentions();

-- Updated_at auto-update
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ==========================================
-- 5. REALTIME - Activer les tables
-- ==========================================

-- Dans Supabase Dashboard → Database → Replication
-- Activer Realtime pour ces tables :
-- ✅ messages
-- ✅ reactions
-- ✅ room_members
-- ✅ mention_notifications
-- ✅ profiles (pour le status online/offline)

-- Ou via SQL :
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mention_notifications;


-- ==========================================
-- 6. VIEWS UTILES
-- ==========================================

-- Vue des messages avec infos auteur et reply
CREATE OR REPLACE VIEW public.messages_with_author AS
SELECT
  m.id,
  m.room_id,
  m.user_id,
  m.content,
  m.type,
  m.media_url,
  m.media_type,
  m.reply_to,
  m.mentions,
  m.is_edited,
  m.is_deleted,
  m.created_at,
  -- Auteur
  p.username AS author_username,
  p.display_name AS author_display_name,
  p.avatar_url AS author_avatar_url,
  -- Message replied to
  rm.content AS reply_content,
  rp.username AS reply_author_username
FROM public.messages m
LEFT JOIN public.profiles p ON m.user_id = p.id
LEFT JOIN public.messages rm ON m.reply_to = rm.id
LEFT JOIN public.profiles rp ON rm.user_id = rp.id
WHERE m.is_deleted = FALSE
ORDER BY m.created_at ASC;

-- Vue du nombre de réactions par message
CREATE OR REPLACE VIEW public.message_reactions_count AS
SELECT
  r.message_id,
  r.emoji,
  COUNT(*) AS count,
  ARRAY_AGG(r.user_id) AS user_ids
FROM public.reactions r
GROUP BY r.message_id, r.emoji;
