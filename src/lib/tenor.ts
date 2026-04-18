const TENOR_API_KEY = import.meta.env.VITE_TENOR_API_KEY || '';
const TENOR_BASE = 'https://tenor.googleapis.com/v2';

export interface TenorGif {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

function mapResults(results: any[]): TenorGif[] {
  return (results || []).map(r => ({
    id: r.id,
    title: r.title || '',
    url: r.media_formats?.gif?.url || r.media_formats?.mediumgif?.url || '',
    previewUrl: r.media_formats?.tinygif?.url || r.media_formats?.nanogif?.url || '',
    width: r.media_formats?.gif?.dims?.[0] || 200,
    height: r.media_formats?.gif?.dims?.[1] || 200,
  }));
}

export async function searchGifs(query: string, limit = 20): Promise<TenorGif[]> {
  if (!TENOR_API_KEY) return [];
  const params = new URLSearchParams({
    key: TENOR_API_KEY,
    q: query,
    limit: String(limit),
    media_filter: 'gif,tinygif',
    contentfilter: 'medium',
  });
  try {
    const res = await fetch(`${TENOR_BASE}/search?${params}`);
    const data = await res.json();
    return mapResults(data.results);
  } catch {
    return [];
  }
}

export async function getTrendingGifs(limit = 20): Promise<TenorGif[]> {
  if (!TENOR_API_KEY) return [];
  const params = new URLSearchParams({
    key: TENOR_API_KEY,
    limit: String(limit),
    media_filter: 'gif,tinygif',
    contentfilter: 'medium',
  });
  try {
    const res = await fetch(`${TENOR_BASE}/featured?${params}`);
    const data = await res.json();
    return mapResults(data.results);
  } catch {
    return [];
  }
}
