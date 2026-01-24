-- ============================================
-- ALLOW ANONYMOUS MESSAGES
-- ============================================
-- Run this in Supabase SQL Editor

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Authenticated users can post messages" ON live_messages;

-- Create new policy that allows anyone to post
CREATE POLICY "Anyone can post messages" ON live_messages
  FOR INSERT WITH CHECK (true);

-- Allow anyone to read messages (already exists, but just in case)
DROP POLICY IF EXISTS "Live messages are viewable by everyone" ON live_messages;
CREATE POLICY "Live messages are viewable by everyone" ON live_messages
  FOR SELECT USING (true);

-- ============================================
-- DONE! Anonymous posting is now enabled.
-- ============================================
