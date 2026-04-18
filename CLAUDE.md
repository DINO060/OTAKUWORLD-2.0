# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server on port 3000
npm run build    # Production build → build/ directory
```

No linter or test runner is configured.

## Architecture

### Routing & State

`src/App.tsx` is the single large root component (~1600 lines). It manages all page routing via a `currentPage` state string — there is no React Router. Page switches happen by setting `currentPage` to one of: `feed | inbox | private-chat | chapters-browse | chapters-platform | chapter-reader | publish-chapter | my-chapters | settings | admin`.

### Context Provider Stack

Defined in `src/contexts/AppProviders.tsx`. Order matters — inner providers can consume outer ones:

```
AuthProvider → PresenceProvider → NotificationsProvider → ChatProvider → ChaptersProvider → PrivateMessagesProvider
```

- **AuthContext** — Supabase auth session, `profile` (mapped AppUser), `updateProfile`, `requireAuth()` gate
- **ChatContext** — live public messages, hashtags, reactions, Supabase Realtime subscriptions
- **ChaptersContext** — chapters/works, upload, batch publish, likes
- **PrivateMessagesContext** — conversations, DM send/read, unread counts
- **PresenceContext** — Supabase Presence channel `global_presence`, exposes `isOnline(userId)`
- **NotificationsContext** — in-memory only (DMs, reactions, @mentions), not persisted

### Critical Auth Rule

**Never use `async/await` inside `supabase.auth.onAuthStateChange()` callbacks** — it blocks the entire auth flow. Use fire-and-forget (call the async fn without awaiting it).

### Dual Storage Paths

| Source | Files stored in | DB record |
|--------|----------------|-----------|
| Site uploads | Supabase Storage (`chapters` bucket, public) | `file_url` in chapters table |
| Bot uploads | Cloudflare R2 | `file_url` in chapters table |

Both paths share the same PostgreSQL `chapters` table. `src/lib/storage.ts` handles Supabase Storage uploads.

### PDF Rendering

Use native `<iframe src={pdfUrl} />` — never react-pdf. It's faster, handles all pages, has built-in zoom/search, and avoids worker/CORS issues.

### ProfileCard Variants

`src/components/ProfileCard.tsx` has two variants:
- `variant="owner"` — shows Edit Profile button, no report/DM buttons
- `variant="user"` — shows Message + Report buttons, fetches target's profile from DB

When opening from the chat feed, check `profileUser.id === user?.id` and pass `variant="owner"` for the current user's own profile.

## Database

**Schema:** `supabase-schema.sql` — run against Supabase SQL editor.

Key tables: `profiles`, `live_messages`, `message_reactions`, `chapters`, `chapter_tags`, `chapter_files`, `chapter_likes`, `private_conversations`, `private_messages`, `reports`, `bans`, `managed_ads`, `feedbacks`.

**RLS is enabled on all tables.** Admin-only operations check `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)`.

**Schema migration rules:**
- `CREATE TABLE IF NOT EXISTS` won't add new columns to existing tables — use `ALTER TABLE ADD COLUMN IF NOT EXISTS`
- Old CHECK constraints block new enum values — `DROP CONSTRAINT` then `ADD CONSTRAINT`
- Always `DROP POLICY IF EXISTS` before `CREATE POLICY` (makes scripts idempotent)

### Profiles Table Key Columns

`id (UUID)`, `username` (display name), `handle` (unique @handle, nullable), `avatar_url`, `bio`, `allow_dms`, `is_admin`, `created_at`

### Realtime Tables

`live_messages`, `private_messages`, `message_reactions`, `reports` are added to `supabase_realtime` publication.

## Key Files

| File | Role |
|------|------|
| `src/App.tsx` | Root component, all routing, message feed, hashtag panel, header ads |
| `src/contexts/AppProviders.tsx` | Provider nesting order |
| `src/contexts/AuthContext.tsx` | Auth + profile CRUD, maps DB rows to `AppUser` type |
| `src/lib/supabase.ts` | Supabase client (singleton) |
| `src/lib/storage.ts` | Supabase Storage upload helpers |
| `src/lib/fileValidation.ts` | Magic-byte validation for avatars, covers, PDF, CBZ |
| `src/lib/tenor.ts` | Tenor GIF/sticker API (`VITE_TENOR_API_KEY`) |
| `src/types/index.ts` | All shared TypeScript interfaces |
| `supabase-schema.sql` | Full DB schema + RLS policies (re-runnable) |

## Environment Variables

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_TENOR_API_KEY=      # optional, for GIF search
```

## Chapter Grouping

Chapters are grouped into "works" by `title + authorId` together — never by `authorId` alone (one author can have multiple works).
