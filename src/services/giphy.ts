const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY || '';
const BASE_URL = 'https://api.giphy.com/v1';
const RATING = 'pg-13';
const DEFAULT_LIMIT = 20;

export interface GiphyGif {
  id: string;
  title: string;
  /** MP4 URL — preferred for GIFs (smaller, smoother). Empty for stickers. */
  mp4Url: string;
  /**
   * For GIFs: downsized gif for chat display.
   * For stickers: animated WebP (transparent bg) or gif fallback.
   */
  gifUrl: string;
  /** Small preview image shown in the picker grid */
  previewUrl: string;
}

function mapItem(item: any, kind: 'gif' | 'sticker'): GiphyGif {
  const images = item.images ?? {};
  const original = images.original ?? {};
  // fixed_width_small → ~100px thumbnails, fast to load in the grid
  const preview =
    images.fixed_width_small ??
    images.preview_gif ??
    images.fixed_width_downsampled ??
    {};

  if (kind === 'sticker') {
    // Prefer animated WebP (preserves transparency) over gif
    const gifUrl = original.webp ?? original.url ?? '';
    return {
      id: item.id ?? '',
      title: item.title ?? '',
      mp4Url: '',   // mp4 has no alpha channel — skip for stickers
      gifUrl,
      previewUrl: preview.url ?? original.url ?? '',
    };
  }

  // Regular GIF: prefer mp4 for playback, downsized for fallback
  const display = images.downsized_medium ?? images.downsized ?? original;
  return {
    id: item.id ?? '',
    title: item.title ?? '',
    mp4Url: original.mp4 ?? '',
    gifUrl: display.url ?? original.url ?? '',
    previewUrl: preview.url ?? original.url ?? '',
  };
}

async function giphyFetch(
  path: string,
  params: Record<string, string | number>,
  kind: 'gif' | 'sticker' = 'gif',
): Promise<GiphyGif[]> {
  if (!GIPHY_API_KEY) return [];

  const sp = new URLSearchParams({
    api_key: GIPHY_API_KEY,
    rating: RATING,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ),
  });

  try {
    const res = await fetch(`${BASE_URL}/${path}?${sp}`);
    if (!res.ok) return [];
    const json = await res.json();
    return ((json.data as any[]) ?? []).map(item => mapItem(item, kind));
  } catch {
    return [];
  }
}

// ─── GIFs ──────────────────────────────────────────────────────────────────

export function searchGifs(
  query: string,
  offset = 0,
  limit = DEFAULT_LIMIT,
): Promise<GiphyGif[]> {
  return giphyFetch('gifs/search', { q: query, offset, limit, lang: 'en' });
}

export function trendingGifs(
  offset = 0,
  limit = DEFAULT_LIMIT,
): Promise<GiphyGif[]> {
  return giphyFetch('gifs/trending', { offset, limit });
}

// ─── Stickers ──────────────────────────────────────────────────────────────

export function searchStickers(
  query: string,
  offset = 0,
  limit = DEFAULT_LIMIT,
): Promise<GiphyGif[]> {
  return giphyFetch('stickers/search', { q: query, offset, limit, lang: 'en' }, 'sticker');
}

export function trendingStickers(
  offset = 0,
  limit = DEFAULT_LIMIT,
): Promise<GiphyGif[]> {
  return giphyFetch('stickers/trending', { offset, limit }, 'sticker');
}
