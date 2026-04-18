/**
 * Input sanitization utilities — XSS prevention.
 * Used before storing or displaying user-generated content.
 */

// Escape HTML special characters to prevent XSS
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Strip all HTML tags from a string
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

// Sanitize a chat/post message:
// - strips HTML tags
// - trims whitespace
// - enforces max length
export function sanitizeMessage(str: string, maxLength = 1000): string {
  return stripHtml(str).trim().slice(0, maxLength);
}

// Sanitize a username/handle:
// - allows only alphanumeric, underscores, hyphens
// - max 30 chars
export function sanitizeHandle(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30);
}

// Sanitize a URL — only allow http/https
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return url;
  } catch {
    return '';
  }
}

// Sanitize bio/description text — strips HTML, max 300 chars
export function sanitizeBio(str: string): string {
  return stripHtml(str).trim().slice(0, 300);
}
