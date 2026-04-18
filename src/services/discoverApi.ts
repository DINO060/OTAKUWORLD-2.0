// Discover Catalogue API — Jikan v4 (Anime/Manga/LN) + TMDB v3 (Films/Séries) + Open Library (Books) + Last.fm (Music) + RAWG (Games)
// Rate limits: Jikan 3 req/sec, TMDB 40 req/10sec, Last.fm 5 req/sec, Open Library unlimited, RAWG 20k/month

const JIKAN_BASE = 'https://api.jikan.moe/v4';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';
const OPENLIBRARY_BASE = 'https://openlibrary.org';
const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0';
const RAWG_BASE = 'https://api.rawg.io/api';

// Simple in-memory cache
const cache = new Map<string, { data: any; expires: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any, ttlMs: number) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

// Jikan rate limiter — max 3 req/sec
let jikanQueue: Array<() => void> = [];
let jikanActive = 0;
const JIKAN_MAX = 3;
const JIKAN_WINDOW = 1100; // slightly over 1 sec

function jikanThrottle<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      jikanActive++;
      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          setTimeout(() => {
            jikanActive--;
            if (jikanQueue.length > 0) {
              const next = jikanQueue.shift()!;
              next();
            }
          }, JIKAN_WINDOW);
        });
    };

    if (jikanActive < JIKAN_MAX) {
      run();
    } else {
      jikanQueue.push(run);
    }
  });
}

async function jikanFetch<T>(path: string, ttl = 3600000): Promise<T> {
  const key = `jikan:${path}`;
  const cached = getCached<T>(key);
  if (cached) return cached;

  const data = await jikanThrottle(async () => {
    const res = await fetch(`${JIKAN_BASE}${path}`);
    if (!res.ok) throw new Error(`Jikan ${res.status}`);
    return res.json();
  });

  setCache(key, data, ttl);
  return data as T;
}

async function tmdbFetch<T>(path: string, ttl = 3600000): Promise<T> {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;
  if (!apiKey) throw new Error('TMDB API key not configured');

  const key = `tmdb:${path}`;
  const cached = getCached<T>(key);
  if (cached) return cached;

  const separator = path.includes('?') ? '&' : '?';
  const res = await fetch(`${TMDB_BASE}${path}${separator}api_key=${apiKey}&language=fr`);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  const data = await res.json();
  setCache(key, data, ttl);
  return data as T;
}

async function openLibraryFetch<T>(path: string, ttl = 3600000): Promise<T> {
  const key = `openlibrary:${path}`;
  const cached = getCached<T>(key);
  if (cached) return cached;

  const res = await fetch(`${OPENLIBRARY_BASE}${path}`);
  if (!res.ok) throw new Error(`OpenLibrary ${res.status}`);
  const data = await res.json();
  setCache(key, data, ttl);
  return data as T;
}

async function lastfmFetch<T>(params: string, ttl = 3600000): Promise<T> {
  const apiKey = import.meta.env.VITE_LASTFM_API_KEY;
  if (!apiKey) throw new Error('Last.fm API key not configured');

  const key = `lastfm:${params}`;
  const cached = getCached<T>(key);
  if (cached) return cached;

  const res = await fetch(`${LASTFM_BASE}/?${params}&api_key=${apiKey}&format=json`);
  if (!res.ok) throw new Error(`Last.fm ${res.status}`);
  const data = await res.json();
  setCache(key, data, ttl);
  return data as T;
}

async function rawgFetch<T>(path: string, ttl = 3600000): Promise<T> {
  const apiKey = import.meta.env.VITE_RAWG_API_KEY;
  if (!apiKey) throw new Error('RAWG API key not configured');

  const key = `rawg:${path}`;
  const cached = getCached<T>(key);
  if (cached) return cached;

  const separator = path.includes('?') ? '&' : '?';
  const res = await fetch(`${RAWG_BASE}${path}${separator}key=${apiKey}`);
  if (!res.ok) throw new Error(`RAWG ${res.status}`);
  const data = await res.json();
  setCache(key, data, ttl);
  return data as T;
}

// ============ TYPES ============

export interface DiscoverItem {
  id: string;
  title: string;
  posterUrl: string;
  backdropUrl?: string;
  score: number;
  type: 'anime' | 'manga' | 'movie' | 'tv' | 'ln' | 'book' | 'music' | 'game';
  year?: string;
  status?: string;
  genres: string[];
  episodes?: number;
  chapters?: number;
  synopsis?: string;
}

export interface DiscoverDetail extends DiscoverItem {
  studio?: string;
  source?: string;
  duration?: string;
  airing?: string;
  trailerUrl?: string;
  characters: { name: string; role: string; imageUrl: string }[];
  related: DiscoverItem[];
}

// ============ JIKAN MAPPERS ============

function mapJikanAnime(item: any): DiscoverItem {
  return {
    id: `anime-${item.mal_id}`,
    title: item.title || item.title_english || '',
    posterUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
    score: item.score || 0,
    type: 'anime',
    year: item.aired?.prop?.from?.year?.toString() || item.year?.toString() || '',
    status: item.status === 'Currently Airing' ? 'En cours' : item.status === 'Finished Airing' ? 'Terminé' : item.status === 'Not yet aired' ? 'À venir' : item.status || '',
    genres: (item.genres || []).map((g: any) => g.name),
    episodes: item.episodes || 0,
    synopsis: item.synopsis || '',
  };
}

function mapJikanManga(item: any): DiscoverItem {
  return {
    id: `manga-${item.mal_id}`,
    title: item.title || item.title_english || '',
    posterUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
    score: item.score || 0,
    type: 'manga',
    year: item.published?.prop?.from?.year?.toString() || '',
    status: item.status === 'Publishing' ? 'En cours' : item.status === 'Finished' ? 'Terminé' : item.status || '',
    genres: (item.genres || []).map((g: any) => g.name),
    chapters: item.chapters || 0,
    synopsis: item.synopsis || '',
  };
}

// ============ TMDB MAPPERS ============

function tmdbPoster(path: string | null, size = 'w500'): string {
  if (!path) return '';
  return `${TMDB_IMG}/${size}${path}`;
}

function tmdbBackdrop(path: string | null): string {
  if (!path) return '';
  return `${TMDB_IMG}/w1280${path}`;
}

function mapTmdbMovie(item: any): DiscoverItem {
  return {
    id: `movie-${item.id}`,
    title: item.title || '',
    posterUrl: tmdbPoster(item.poster_path),
    backdropUrl: tmdbBackdrop(item.backdrop_path),
    score: Math.round((item.vote_average || 0) * 10) / 10,
    type: 'movie',
    year: item.release_date?.substring(0, 4) || '',
    status: '',
    genres: (item.genre_ids || []).map((id: number) => TMDB_GENRE_MAP[id] || '').filter(Boolean),
    synopsis: item.overview || '',
  };
}

function mapTmdbTv(item: any): DiscoverItem {
  return {
    id: `tv-${item.id}`,
    title: item.name || '',
    posterUrl: tmdbPoster(item.poster_path),
    backdropUrl: tmdbBackdrop(item.backdrop_path),
    score: Math.round((item.vote_average || 0) * 10) / 10,
    type: 'tv',
    year: item.first_air_date?.substring(0, 4) || '',
    status: item.status === 'Returning Series' ? 'En cours' : item.status === 'Ended' ? 'Terminé' : '',
    genres: (item.genre_ids || []).map((id: number) => TMDB_GENRE_MAP[id] || '').filter(Boolean),
    synopsis: item.overview || '',
  };
}

const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Aventure', 16: 'Animation', 35: 'Comédie', 80: 'Crime',
  99: 'Documentaire', 18: 'Drame', 10751: 'Famille', 14: 'Fantastique', 36: 'Histoire',
  27: 'Horreur', 10402: 'Musique', 9648: 'Mystère', 10749: 'Romance',
  878: 'Science-Fiction', 10770: 'Téléfilm', 53: 'Thriller', 10752: 'Guerre', 37: 'Western',
  10759: 'Action & Aventure', 10762: 'Enfants', 10763: 'News', 10764: 'Réalité',
  10765: 'Sci-Fi & Fantastique', 10766: 'Soap', 10767: 'Talk', 10768: 'Guerre & Politique',
};

// ============ ANIME ENDPOINTS ============

export async function getAnimeTrending(): Promise<DiscoverItem[]> {
  const data = await jikanFetch<any>('/top/anime?filter=airing&limit=20');
  return (data.data || []).map(mapJikanAnime);
}

export async function getAnimeSeason(): Promise<DiscoverItem[]> {
  const data = await jikanFetch<any>('/seasons/now?limit=20', 6 * 3600000);
  return (data.data || []).map(mapJikanAnime);
}

export async function getAnimeUpcoming(): Promise<DiscoverItem[]> {
  const data = await jikanFetch<any>('/seasons/upcoming?limit=20', 6 * 3600000);
  return (data.data || []).map(mapJikanAnime);
}

export async function getAnimeTop(): Promise<DiscoverItem[]> {
  const data = await jikanFetch<any>('/top/anime?limit=20', 24 * 3600000);
  return (data.data || []).map(mapJikanAnime);
}

export async function searchAnime(query: string): Promise<DiscoverItem[]> {
  if (!query.trim()) return [];
  const data = await jikanFetch<any>(`/anime?q=${encodeURIComponent(query)}&limit=20`, 1800000);
  return (data.data || []).map(mapJikanAnime);
}

export async function getAnimeDetail(malId: number): Promise<DiscoverDetail> {
  const [full, chars, recs] = await Promise.all([
    jikanFetch<any>(`/anime/${malId}/full`, 24 * 3600000),
    jikanFetch<any>(`/anime/${malId}/characters`, 24 * 3600000),
    jikanFetch<any>(`/anime/${malId}/recommendations`, 24 * 3600000).catch(() => ({ data: [] })),
  ]);

  const item = full.data;
  const base = mapJikanAnime(item);

  return {
    ...base,
    backdropUrl: item.images?.jpg?.large_image_url || '',
    studio: (item.studios || []).map((s: any) => s.name).join(', '),
    source: item.source || '',
    duration: item.duration || '',
    airing: item.aired?.string || '',
    trailerUrl: item.trailer?.embed_url || '',
    characters: (chars.data || []).slice(0, 12).map((c: any) => {
      const japVA = (c.voice_actors || []).find((va: any) => va.language === 'Japanese');
      return {
        name: c.character?.name || '',
        role: japVA ? japVA.person?.name || c.role || '' : c.role || '',
        imageUrl: c.character?.images?.jpg?.image_url || '',
      };
    }),
    related: (recs.data || []).slice(0, 12).map((r: any) => mapJikanAnime(r.entry)),
  };
}

// ============ MANGA ENDPOINTS ============

export async function getMangaTrending(): Promise<DiscoverItem[]> {
  const data = await jikanFetch<any>('/top/manga?filter=publishing&limit=20');
  return (data.data || []).map(mapJikanManga);
}

export async function getMangaTop(): Promise<DiscoverItem[]> {
  const data = await jikanFetch<any>('/top/manga?limit=20', 24 * 3600000);
  return (data.data || []).map(mapJikanManga);
}

export async function searchManga(query: string): Promise<DiscoverItem[]> {
  if (!query.trim()) return [];
  const data = await jikanFetch<any>(`/manga?q=${encodeURIComponent(query)}&limit=20`, 1800000);
  return (data.data || []).map(mapJikanManga);
}

export async function getMangaDetail(malId: number): Promise<DiscoverDetail> {
  const [full, chars, recs] = await Promise.all([
    jikanFetch<any>(`/manga/${malId}/full`, 24 * 3600000),
    jikanFetch<any>(`/manga/${malId}/characters`, 24 * 3600000),
    jikanFetch<any>(`/manga/${malId}/recommendations`, 24 * 3600000).catch(() => ({ data: [] })),
  ]);

  const item = full.data;
  const base = mapJikanManga(item);

  return {
    ...base,
    studio: (item.authors || []).map((a: any) => a.name).join(', '),
    source: '',
    duration: '',
    airing: item.published?.string || '',
    trailerUrl: '',
    characters: (chars.data || []).slice(0, 12).map((c: any) => ({
      name: c.character?.name || '',
      role: c.role || '',
      imageUrl: c.character?.images?.jpg?.image_url || '',
    })),
    related: (recs.data || []).slice(0, 12).map((r: any) => mapJikanManga(r.entry)),
  };
}

// ============ TMDB MOVIES ============

export async function getMoviesTrending(): Promise<DiscoverItem[]> {
  const data = await tmdbFetch<any>('/trending/movie/week');
  return (data.results || []).map(mapTmdbMovie);
}

export async function getMoviesPopular(): Promise<DiscoverItem[]> {
  const data = await tmdbFetch<any>('/movie/popular');
  return (data.results || []).map(mapTmdbMovie);
}

export async function getMoviesUpcoming(): Promise<DiscoverItem[]> {
  const data = await tmdbFetch<any>('/movie/upcoming', 6 * 3600000);
  return (data.results || []).map(mapTmdbMovie);
}

export async function searchMovies(query: string): Promise<DiscoverItem[]> {
  if (!query.trim()) return [];
  const data = await tmdbFetch<any>(`/search/movie?query=${encodeURIComponent(query)}`, 1800000);
  return (data.results || []).map(mapTmdbMovie);
}

export async function getMovieDetail(tmdbId: number): Promise<DiscoverDetail> {
  const data = await tmdbFetch<any>(`/movie/${tmdbId}?append_to_response=credits,videos,similar`, 24 * 3600000);

  const trailer = (data.videos?.results || []).find(
    (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
  );

  return {
    id: `movie-${data.id}`,
    title: data.title || '',
    posterUrl: tmdbPoster(data.poster_path),
    backdropUrl: tmdbBackdrop(data.backdrop_path),
    score: Math.round((data.vote_average || 0) * 10) / 10,
    type: 'movie',
    year: data.release_date?.substring(0, 4) || '',
    status: data.status || '',
    genres: (data.genres || []).map((g: any) => g.name),
    synopsis: data.overview || '',
    duration: data.runtime ? `${data.runtime} min` : '',
    studio: (data.production_companies || []).map((c: any) => c.name).join(', '),
    source: '',
    airing: data.release_date || '',
    trailerUrl: trailer ? `https://www.youtube.com/embed/${trailer.key}` : '',
    characters: (data.credits?.cast || []).slice(0, 12).map((c: any) => ({
      name: c.name || '',
      role: c.character || '',
      imageUrl: c.profile_path ? tmdbPoster(c.profile_path, 'w185') : '',
    })),
    related: (data.similar?.results || []).slice(0, 10).map(mapTmdbMovie),
  };
}

// ============ TMDB TV ============

export async function getTvTrending(): Promise<DiscoverItem[]> {
  const data = await tmdbFetch<any>('/trending/tv/week');
  return (data.results || []).map(mapTmdbTv);
}

export async function getTvPopular(): Promise<DiscoverItem[]> {
  const data = await tmdbFetch<any>('/tv/popular');
  return (data.results || []).map(mapTmdbTv);
}

export async function searchTv(query: string): Promise<DiscoverItem[]> {
  if (!query.trim()) return [];
  const data = await tmdbFetch<any>(`/search/tv?query=${encodeURIComponent(query)}`, 1800000);
  return (data.results || []).map(mapTmdbTv);
}

export async function getTvDetail(tmdbId: number): Promise<DiscoverDetail> {
  const data = await tmdbFetch<any>(`/tv/${tmdbId}?append_to_response=credits,videos,similar`, 24 * 3600000);

  const trailer = (data.videos?.results || []).find(
    (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
  );

  return {
    id: `tv-${data.id}`,
    title: data.name || '',
    posterUrl: tmdbPoster(data.poster_path),
    backdropUrl: tmdbBackdrop(data.backdrop_path),
    score: Math.round((data.vote_average || 0) * 10) / 10,
    type: 'tv',
    year: data.first_air_date?.substring(0, 4) || '',
    status: data.status === 'Returning Series' ? 'En cours' : data.status === 'Ended' ? 'Terminé' : data.status || '',
    genres: (data.genres || []).map((g: any) => g.name),
    episodes: data.number_of_episodes || 0,
    synopsis: data.overview || '',
    duration: data.number_of_seasons ? `${data.number_of_seasons} saison${data.number_of_seasons > 1 ? 's' : ''}` : '',
    studio: (data.networks || []).map((n: any) => n.name).join(', '),
    source: '',
    airing: data.first_air_date || '',
    trailerUrl: trailer ? `https://www.youtube.com/embed/${trailer.key}` : '',
    characters: (data.credits?.cast || []).slice(0, 12).map((c: any) => ({
      name: c.name || '',
      role: c.character || '',
      imageUrl: c.profile_path ? tmdbPoster(c.profile_path, 'w185') : '',
    })),
    related: (data.similar?.results || []).slice(0, 10).map(mapTmdbTv),
  };
}

// ============ LIGHT NOVELS (Jikan) ============

function mapJikanLN(item: any): DiscoverItem {
  return {
    id: `ln-${item.mal_id}`,
    title: item.title || item.title_english || '',
    posterUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
    score: item.score || 0,
    type: 'ln',
    year: item.published?.prop?.from?.year?.toString() || '',
    status: item.status === 'Publishing' ? 'En cours' : item.status === 'Finished' ? 'Terminé' : item.status || '',
    genres: (item.genres || []).map((g: any) => g.name),
    chapters: item.chapters || 0,
    synopsis: item.synopsis || '',
  };
}

export async function getLNTrending(): Promise<DiscoverItem[]> {
  const data = await jikanFetch<any>('/top/manga?type=lightnovel&filter=publishing&limit=20');
  return (data.data || []).map(mapJikanLN);
}

export async function getLNTop(): Promise<DiscoverItem[]> {
  const data = await jikanFetch<any>('/top/manga?type=lightnovel&limit=20', 24 * 3600000);
  return (data.data || []).map(mapJikanLN);
}

export async function searchLN(query: string): Promise<DiscoverItem[]> {
  if (!query.trim()) return [];
  const data = await jikanFetch<any>(`/manga?type=lightnovel&q=${encodeURIComponent(query)}&limit=20`, 1800000);
  return (data.data || []).map(mapJikanLN);
}

export async function getLNDetail(malId: number): Promise<DiscoverDetail> {
  const [full, chars] = await Promise.all([
    jikanFetch<any>(`/manga/${malId}/full`, 24 * 3600000),
    jikanFetch<any>(`/manga/${malId}/characters`, 24 * 3600000),
  ]);

  const item = full.data;
  const base = mapJikanLN(item);

  return {
    ...base,
    studio: (item.authors || []).map((a: any) => a.name).join(', '),
    source: '',
    duration: item.volumes ? `${item.volumes} volume${item.volumes > 1 ? 's' : ''}` : '',
    airing: item.published?.string || '',
    trailerUrl: '',
    characters: (chars.data || []).slice(0, 12).map((c: any) => ({
      name: c.character?.name || '',
      role: c.role || '',
      imageUrl: c.character?.images?.jpg?.image_url || '',
    })),
    related: [],
  };
}

// ============ BOOKS (Open Library) ============

function mapOpenLibraryBook(doc: any): DiscoverItem {
  const coverId = doc.cover_i;
  return {
    id: `book-${doc.key?.replace('/works/', '') || doc.cover_i || Math.random()}`,
    title: doc.title || '',
    posterUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : '',
    score: doc.ratings_average ? Math.round(doc.ratings_average * 10) / 10 : 0,
    type: 'book',
    year: doc.first_publish_year?.toString() || '',
    status: '',
    genres: (doc.subject || []).slice(0, 5),
    synopsis: '',
  };
}

export async function getBooksTrending(): Promise<DiscoverItem[]> {
  const data = await openLibraryFetch<any>('/trending/daily.json?limit=20');
  return (data.works || []).map(mapOpenLibraryBook);
}

export async function getBooksPopular(): Promise<DiscoverItem[]> {
  const data = await openLibraryFetch<any>('/search.json?q=subject:manga+OR+subject:anime+OR+subject:japanese&limit=20&sort=rating', 6 * 3600000);
  return (data.docs || []).filter((d: any) => d.cover_i).map(mapOpenLibraryBook);
}

export async function searchBooks(query: string): Promise<DiscoverItem[]> {
  if (!query.trim()) return [];
  const data = await openLibraryFetch<any>(`/search.json?q=${encodeURIComponent(query)}&limit=20`, 1800000);
  return (data.docs || []).map(mapOpenLibraryBook);
}

export async function getBookDetail(workId: string): Promise<DiscoverDetail> {
  const data = await openLibraryFetch<any>(`/works/${workId}.json`, 24 * 3600000);

  const description = typeof data.description === 'string'
    ? data.description
    : data.description?.value || '';

  const coverId = data.covers?.[0];

  return {
    id: `book-${workId}`,
    title: data.title || '',
    posterUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : '',
    score: 0,
    type: 'book',
    year: data.first_publish_date || '',
    status: '',
    genres: (data.subjects || []).slice(0, 8),
    synopsis: description,
    studio: (data.authors || []).map((a: any) => a.author?.key || '').join(', '),
    source: '',
    duration: '',
    airing: data.first_publish_date || '',
    trailerUrl: '',
    characters: (data.subject_people || []).slice(0, 12).map((name: string) => ({
      name,
      role: 'Personnage',
      imageUrl: '',
    })),
    related: [],
  };
}

// ============ MUSIC / ALBUMS (Last.fm) ============

function mapLastfmAlbum(album: any): DiscoverItem {
  const images = album.image || [];
  const largeImg = images.find((i: any) => i.size === 'extralarge')?.['#text']
    || images.find((i: any) => i.size === 'large')?.['#text']
    || images[images.length - 1]?.['#text']
    || '';

  return {
    id: `music-${album.mbid || album.name?.replace(/\s/g, '-')}-${album.artist?.name?.replace(/\s/g, '-') || album.artist}`,
    title: album.name || '',
    posterUrl: largeImg && !largeImg.includes('2a96cbd8b46e442fc41c2b86b821562f') ? largeImg : '',
    score: album.playcount ? Math.min(10, Math.round(parseInt(album.playcount) / 100000) / 10) : 0,
    type: 'music',
    year: '',
    status: '',
    genres: [],
    synopsis: '',
  };
}

function mapLastfmAlbumItem(album: any): DiscoverItem {
  const images = album.image || [];
  const largeImg = images.find((i: any) => i.size === 'extralarge')?.['#text']
    || images.find((i: any) => i.size === 'large')?.['#text']
    || images.find((i: any) => i.size === 'medium')?.['#text']
    || '';
  const poster = largeImg && !largeImg.includes('2a96cbd8b46e442fc41c2b86b821562f') ? largeImg : '';
  const artist = typeof album.artist === 'object' ? album.artist.name : album.artist || '';
  return {
    id: `music-${album.mbid || `${album.name}-${artist}`}`,
    title: album.name || '',
    posterUrl: poster,
    score: 0,
    type: 'music',
    year: '',
    status: artist,
    genres: [],
    synopsis: '',
  };
}

function mapLastfmTrackAsAlbum(track: any): DiscoverItem {
  const images = track.image || [];
  const largeImg = images.find((i: any) => i.size === 'extralarge')?.['#text']
    || images.find((i: any) => i.size === 'large')?.['#text']
    || '';
  return {
    id: `music-${track.mbid || `${track.name}-${track.artist?.name || track.artist}`}`,
    title: track.name || '',
    posterUrl: largeImg && !largeImg.includes('2a96cbd8b46e442fc41c2b86b821562f') ? largeImg : '',
    score: 0,
    type: 'music',
    year: '',
    status: typeof track.artist === 'object' ? track.artist.name : track.artist || '',
    genres: [],
    synopsis: '',
  };
}

export async function getMusicTopTracks(): Promise<DiscoverItem[]> {
  // Use top albums — they have proper cover artwork unlike chart.gettoptracks
  const [pop, hiphop, electronic] = await Promise.all([
    lastfmFetch<any>('method=tag.gettopalbums&tag=pop&limit=10').catch(() => ({ albums: { album: [] } })),
    lastfmFetch<any>('method=tag.gettopalbums&tag=hip-hop&limit=10').catch(() => ({ albums: { album: [] } })),
    lastfmFetch<any>('method=tag.gettopalbums&tag=electronic&limit=10').catch(() => ({ albums: { album: [] } })),
  ]);
  const all = [
    ...(pop.albums?.album || []),
    ...(hiphop.albums?.album || []),
    ...(electronic.albums?.album || []),
  ];
  return all.map(mapLastfmAlbumItem).filter(i => i.posterUrl);
}

export async function getMusicAnimeTracks(): Promise<DiscoverItem[]> {
  const data = await lastfmFetch<any>('method=tag.gettopalbums&tag=anime&limit=20');
  return (data.albums?.album || []).map(mapLastfmAlbumItem).filter((i: DiscoverItem) => i.posterUrl);
}

export async function searchMusic(query: string): Promise<DiscoverItem[]> {
  if (!query.trim()) return [];
  const data = await lastfmFetch<any>(`method=track.search&track=${encodeURIComponent(query)}&limit=20`, 1800000);
  return (data.results?.trackmatches?.track || []).map(mapLastfmTrackAsAlbum);
}

export async function getMusicDetail(artistName: string, trackName: string): Promise<DiscoverDetail> {
  const data = await lastfmFetch<any>(
    `method=track.getInfo&artist=${encodeURIComponent(artistName)}&track=${encodeURIComponent(trackName)}`,
    24 * 3600000
  );

  const track = data.track || {};
  const images = track.album?.image || [];
  const coverUrl = images.find((i: any) => i.size === 'extralarge')?.['#text'] || '';

  return {
    id: `music-${track.mbid || trackName}`,
    title: track.name || trackName,
    posterUrl: coverUrl && !coverUrl.includes('2a96cbd8b46e442fc41c2b86b821562f') ? coverUrl : '',
    score: 0,
    type: 'music',
    year: '',
    status: track.artist?.name || artistName,
    genres: (track.toptags?.tag || []).map((t: any) => t.name),
    synopsis: track.wiki?.summary?.replace(/<[^>]+>/g, '') || '',
    studio: track.artist?.name || artistName,
    source: '',
    duration: track.duration ? `${Math.round(parseInt(track.duration) / 1000 / 60)} min` : '',
    airing: '',
    trailerUrl: '',
    characters: [],
    related: [],
  };
}

// ============ GAMES (RAWG.io) ============

function mapRawgGame(game: any): DiscoverItem {
  return {
    id: `game-${game.id}`,
    title: game.name || '',
    posterUrl: game.background_image || '',
    score: game.metacritic ? Math.round(game.metacritic / 10 * 10) / 10 : (game.rating ? Math.round(game.rating * 2 * 10) / 10 : 0),
    type: 'game',
    year: game.released?.substring(0, 4) || '',
    status: game.tba ? 'À venir' : '',
    genres: (game.genres || []).map((g: any) => g.name),
    synopsis: '',
  };
}

export async function getGamesTrending(): Promise<DiscoverItem[]> {
  // Trending = recently released with high ratings
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const from = threeMonthsAgo.toISOString().split('T')[0];
  const to = now.toISOString().split('T')[0];
  const data = await rawgFetch<any>(`/games?dates=${from},${to}&ordering=-rating&page_size=20`);
  return (data.results || []).map(mapRawgGame);
}

export async function getGamesPopular(): Promise<DiscoverItem[]> {
  const data = await rawgFetch<any>('/games?ordering=-added&page_size=20');
  return (data.results || []).map(mapRawgGame);
}

export async function getGamesUpcoming(): Promise<DiscoverItem[]> {
  const now = new Date();
  const sixMonthsLater = new Date(now.getFullYear(), now.getMonth() + 6, 1);
  const from = now.toISOString().split('T')[0];
  const to = sixMonthsLater.toISOString().split('T')[0];
  const data = await rawgFetch<any>(`/games?dates=${from},${to}&ordering=-added&page_size=20`, 6 * 3600000);
  return (data.results || []).map(mapRawgGame);
}

export async function getGamesTop(): Promise<DiscoverItem[]> {
  const data = await rawgFetch<any>('/games?ordering=-metacritic&page_size=20', 24 * 3600000);
  return (data.results || []).map(mapRawgGame);
}

export async function searchGames(query: string): Promise<DiscoverItem[]> {
  if (!query.trim()) return [];
  const data = await rawgFetch<any>(`/games?search=${encodeURIComponent(query)}&page_size=20`, 1800000);
  return (data.results || []).map(mapRawgGame);
}

export async function getGameDetail(rawgId: number): Promise<DiscoverDetail> {
  const [detail, screenshots, similar] = await Promise.all([
    rawgFetch<any>(`/games/${rawgId}`, 24 * 3600000),
    rawgFetch<any>(`/games/${rawgId}/screenshots?page_size=6`, 24 * 3600000),
    rawgFetch<any>(`/games/${rawgId}/game-series?page_size=10`, 24 * 3600000),
  ]);

  // Find a YouTube trailer from the clip or via movies endpoint
  let trailerUrl = '';
  try {
    const movies = await rawgFetch<any>(`/games/${rawgId}/movies?page_size=1`, 24 * 3600000);
    const clip = movies.results?.[0];
    if (clip?.data?.max) trailerUrl = clip.data.max;
  } catch { /* no trailers */ }

  const platforms = (detail.platforms || []).map((p: any) => p.platform?.name).filter(Boolean);

  return {
    id: `game-${detail.id}`,
    title: detail.name || '',
    posterUrl: detail.background_image || '',
    backdropUrl: detail.background_image_additional || detail.background_image || '',
    score: detail.metacritic ? Math.round(detail.metacritic / 10 * 10) / 10 : (detail.rating ? Math.round(detail.rating * 2 * 10) / 10 : 0),
    type: 'game',
    year: detail.released?.substring(0, 4) || '',
    status: detail.tba ? 'À venir' : detail.released ? '' : '',
    genres: (detail.genres || []).map((g: any) => g.name),
    synopsis: detail.description_raw || detail.description?.replace(/<[^>]+>/g, '') || '',
    studio: (detail.developers || []).map((d: any) => d.name).join(', '),
    source: platforms.join(', '),
    duration: detail.playtime ? `${detail.playtime}h avg` : '',
    airing: detail.released || '',
    trailerUrl,
    characters: (screenshots.results || []).slice(0, 6).map((s: any, i: number) => ({
      name: `Screenshot ${i + 1}`,
      role: '',
      imageUrl: s.image || '',
    })),
    related: (similar.results || []).slice(0, 10).map(mapRawgGame),
  };
}
