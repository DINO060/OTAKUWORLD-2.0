/**
 * Client-side rate limiting & anti-spam utilities.
 *
 * Thresholds chosen for a live-chat + social-media hybrid:
 *  - Chat:    5 msgs / 10 s  — fast enough for live, blocks bot spam
 *  - Posts:   3 / 60 s
 *  - Uploads: 5 / 600 s (10 min)
 *  - Same-message cooldown: 30 s
 */

// ── Generic sliding-window limiter ────────────────────────────────────────────

interface RateBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateBucket>();

function getBucket(key: string): RateBucket {
  let b = buckets.get(key);
  if (!b) {
    b = { timestamps: [] };
    buckets.set(key, b);
  }
  return b;
}

/**
 * Returns `true` if the action is **allowed**, `false` if rate-limited.
 * Automatically records the attempt when allowed.
 */
export function checkRate(key: string, maxCount: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = getBucket(key);
  // prune expired
  bucket.timestamps = bucket.timestamps.filter(t => now - t < windowMs);
  if (bucket.timestamps.length >= maxCount) return false;
  bucket.timestamps.push(now);
  return true;
}

/**
 * How many seconds until the oldest entry in the window expires.
 * Useful for showing "wait X seconds" to the user.
 */
export function cooldownSeconds(key: string, windowMs: number): number {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.timestamps.length === 0) return 0;
  const oldest = bucket.timestamps[0];
  const remaining = Math.ceil((windowMs - (now - oldest)) / 1000);
  return Math.max(0, remaining);
}

// ── Preset limiters ──────────────────────────────────────────────────────────

/** Chat: max 5 messages per 10 seconds */
export function canSendChat(userId: string): boolean {
  return checkRate(`chat:${userId}`, 5, 10_000);
}

/** Feed posts: max 3 per 60 seconds */
export function canCreatePost(userId: string): boolean {
  return checkRate(`post:${userId}`, 3, 60_000);
}

/** Uploads: max 5 per 10 minutes */
export function canUpload(userId: string): boolean {
  return checkRate(`upload:${userId}`, 5, 600_000);
}

/** DM messages: max 10 per 30 seconds */
export function canSendDM(userId: string): boolean {
  return checkRate(`dm:${userId}`, 10, 30_000);
}

// ── Duplicate message detection ──────────────────────────────────────────────

const recentMessages = new Map<string, { text: string; at: number }>();

/**
 * Returns `true` if this exact message was already sent within the cooldown.
 * 30-second window — prevents copy-paste spam but allows normal repeat ("lol").
 */
export function isDuplicate(userId: string, message: string): boolean {
  const key = `dup:${userId}`;
  const prev = recentMessages.get(key);
  const now = Date.now();
  const normalised = message.trim().toLowerCase();

  if (prev && normalised === prev.text && now - prev.at < 30_000) {
    return true;
  }
  recentMessages.set(key, { text: normalised, at: now });
  return false;
}

// ── Content limits ───────────────────────────────────────────────────────────

const MAX_HASHTAGS = 5;
const MAX_MENTIONS = 5;

export function countHashtags(text: string): number {
  return (text.match(/#\w+/g) || []).length;
}

export function countMentions(text: string): number {
  return (text.match(/@\w+/g) || []).length;
}

export function validateMessageContent(text: string): string | null {
  if (countHashtags(text) > MAX_HASHTAGS) {
    return `Maximum ${MAX_HASHTAGS} hashtags par message`;
  }
  if (countMentions(text) > MAX_MENTIONS) {
    return `Maximum ${MAX_MENTIONS} mentions par message`;
  }
  return null; // valid
}

// ── Ban / Mute state (client-side cache) ─────────────────────────────────────

export interface BanInfo {
  isBanned: boolean;
  reason?: string;
  expiresAt?: string | null; // ISO date or null = permanent
}

export interface MuteInfo {
  isMuted: boolean;
  mutedUntil?: string | null;
}
