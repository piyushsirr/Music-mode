import { Track, Artist, LyricLine } from '../types';
import { getSyncedLyrics } from './lyricsEngine';
import { isRemixTrack, filterOutRemixes } from './utils';

export function isUserInIndia(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (
      tz.includes('Kolkata') ||
      tz.includes('Calcutta') ||
      tz.includes('India') ||
      tz.includes('IST') ||
      tz.includes('Asia/Colombo') ||
      tz.includes('Asia/Dhaka')
    ) {
      return true;
    }
    const languages = navigator.languages || [navigator.language];
    for (const lang of languages) {
      if (
        lang &&
        (lang.includes('IN') ||
          ['hi', 'ta', 'te', 'bn', 'mr', 'gu', 'pa', 'kn', 'ml', 'ur', 'or', 'as'].some((code) =>
            lang.toLowerCase().startsWith(code)
          ))
      ) {
        return true;
      }
    }
  } catch {
    // Default to true for regional compliance
  }
  // Default to true to strictly satisfy user's region mandate
  return true;
}

export const INDIAN_FEATURED_TRACKS: Track[] = [
  {
    id: 'yt-BddP6PYo2gs',
    title: 'Kesariya',
    artist: 'Arijit Singh, Pritam',
    album: 'Brahmāstra',
    coverUrl: 'https://img.youtube.com/vi/BddP6PYo2gs/hqdefault.jpg',
    audioUrl: 'https://www.youtube-nocookie.com/embed/BddP6PYo2gs?enablejsapi=1&autoplay=1&rel=0&modestbranding=1',
    youtubeId: 'BddP6PYo2gs',
    durationMs: 268000,
    isFullLength: true,
  },
  {
    id: 'yt-ElZfdU54Cp8',
    title: 'Apna Bana Le',
    artist: 'Arijit Singh, Sachin-Jigar',
    album: 'Bhediya',
    coverUrl: 'https://img.youtube.com/vi/ElZfdU54Cp8/hqdefault.jpg',
    audioUrl: 'https://www.youtube-nocookie.com/embed/ElZfdU54Cp8?enablejsapi=1&autoplay=1&rel=0&modestbranding=1',
    youtubeId: 'ElZfdU54Cp8',
    durationMs: 261000,
    isFullLength: true,
  },
  {
    id: 'yt-VAdGW7QDJUI',
    title: 'Chaleya',
    artist: 'Arijit Singh, Shilpa Rao, Anirudh',
    album: 'Jawan',
    coverUrl: 'https://img.youtube.com/vi/VAdGW7QDJUI/hqdefault.jpg',
    audioUrl: 'https://www.youtube-nocookie.com/embed/VAdGW7QDJUI?enablejsapi=1&autoplay=1&rel=0&modestbranding=1',
    youtubeId: 'VAdGW7QDJUI',
    durationMs: 200000,
    isFullLength: true,
  },
  {
    id: 'yt-IJq0yyWug1k',
    title: 'Tum Hi Ho',
    artist: 'Arijit Singh, Mithoon',
    album: 'Aashiqui 2',
    coverUrl: 'https://img.youtube.com/vi/IJq0yyWug1k/hqdefault.jpg',
    audioUrl: 'https://www.youtube-nocookie.com/embed/IJq0yyWug1k?enablejsapi=1&autoplay=1&rel=0&modestbranding=1',
    youtubeId: 'IJq0yyWug1k',
    durationMs: 262000,
    isFullLength: true,
  },
  {
    id: 'yt-gvyUuxdRdR4',
    title: 'Raataan Lambiyan',
    artist: 'Jubin Nautiyal, Asees Kaur',
    album: 'Shershaah',
    coverUrl: 'https://img.youtube.com/vi/gvyUuxdRdR4/hqdefault.jpg',
    audioUrl: 'https://www.youtube-nocookie.com/embed/gvyUuxdRdR4?enablejsapi=1&autoplay=1&rel=0&modestbranding=1',
    youtubeId: 'gvyUuxdRdR4',
    durationMs: 230000,
    isFullLength: true,
  },
  {
    id: 'yt-gJLVTKhTnog',
    title: 'Husn',
    artist: 'Anuv Jain',
    album: 'Husn Single',
    coverUrl: 'https://img.youtube.com/vi/gJLVTKhTnog/hqdefault.jpg',
    audioUrl: 'https://www.youtube-nocookie.com/embed/gJLVTKhTnog?enablejsapi=1&autoplay=1&rel=0&modestbranding=1',
    youtubeId: 'gJLVTKhTnog',
    durationMs: 218000,
    isFullLength: true,
  },
  {
    id: 'yt-RLzC55ai0eo',
    title: 'Heeriye',
    artist: 'Jasleen Royal, Arijit Singh',
    album: 'Heeriye',
    coverUrl: 'https://img.youtube.com/vi/RLzC55ai0eo/hqdefault.jpg',
    audioUrl: 'https://www.youtube-nocookie.com/embed/RLzC55ai0eo?enablejsapi=1&autoplay=1&rel=0&modestbranding=1',
    youtubeId: 'RLzC55ai0eo',
    durationMs: 194000,
    isFullLength: true,
  },
  {
    id: 'yt-n2dXd_p-Z90',
    title: 'O Maahi',
    artist: 'Arijit Singh, Pritam',
    album: 'Dunki',
    coverUrl: 'https://img.youtube.com/vi/n2dXd_p-Z90/hqdefault.jpg',
    audioUrl: 'https://www.youtube-nocookie.com/embed/n2dXd_p-Z90?enablejsapi=1&autoplay=1&rel=0&modestbranding=1',
    youtubeId: 'n2dXd_p-Z90',
    durationMs: 233000,
    isFullLength: true,
  },
  {
    id: 'yt-cWMxCE2HTag',
    title: 'Excuses',
    artist: 'AP Dhillon, Gurinder Gill',
    album: 'Hidden Gems',
    coverUrl: 'https://img.youtube.com/vi/cWMxCE2HTag/hqdefault.jpg',
    audioUrl: 'https://www.youtube-nocookie.com/embed/cWMxCE2HTag?enablejsapi=1&autoplay=1&rel=0&modestbranding=1',
    youtubeId: 'cWMxCE2HTag',
    durationMs: 176000,
    isFullLength: true,
  },
  {
    id: 'yt-XkvybXvE4c0',
    title: 'Pehle Bhi Main',
    artist: 'Vishal Mishra, Raj Shekhar',
    album: 'Animal',
    coverUrl: 'https://img.youtube.com/vi/XkvybXvE4c0/hqdefault.jpg',
    audioUrl: 'https://www.youtube-nocookie.com/embed/XkvybXvE4c0?enablejsapi=1&autoplay=1&rel=0&modestbranding=1',
    youtubeId: 'XkvybXvE4c0',
    durationMs: 250000,
    isFullLength: true,
  },
  {
    id: 'yt-7KL4cM4d45s',
    title: 'Illuminati',
    artist: 'Sushin Shyam, Dabzee',
    album: 'Aavesham',
    coverUrl: 'https://img.youtube.com/vi/7KL4cM4d45s/hqdefault.jpg',
    audioUrl: 'https://www.youtube-nocookie.com/embed/7KL4cM4d45s?enablejsapi=1&autoplay=1&rel=0&modestbranding=1',
    youtubeId: '7KL4cM4d45s',
    durationMs: 193000,
    isFullLength: true,
  },
  {
    id: 'yt-5Eqb_-j3FDA',
    title: 'Pasoori',
    artist: 'Ali Sethi, Shae Gill',
    album: 'Coke Studio Season 14',
    coverUrl: 'https://img.youtube.com/vi/5Eqb_-j3FDA/hqdefault.jpg',
    audioUrl: 'https://www.youtube-nocookie.com/embed/5Eqb_-j3FDA?enablejsapi=1&autoplay=1&rel=0&modestbranding=1',
    youtubeId: '5Eqb_-j3FDA',
    durationMs: 224000,
    isFullLength: true,
  },
];

export const FEATURED_FULL_LENGTH_TRACKS: Track[] = INDIAN_FEATURED_TRACKS;

export const POPULAR_ARTISTS: Artist[] = [
  {
    id: 'arijit-singh',
    name: 'Arijit Singh',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    listeners: '42,300,100 monthly listeners',
    bio: 'Indian playback singer and music composer celebrated across South Asia and globally as the king of melodies.',
  },
  {
    id: 'shreya-ghoshal',
    name: 'Shreya Ghoshal',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    listeners: '35,800,200 monthly listeners',
    bio: 'Legendary Indian playback singer known for her wide vocal range and soulful renditions.',
  },
  {
    id: 'pritam',
    name: 'Pritam',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    listeners: '39,120,400 monthly listeners',
    bio: 'Renowned Indian music director, composer, and producer behind the biggest Bollywood soundtracks.',
  },
  {
    id: 'anirudh-ravichander',
    name: 'Anirudh Ravichander',
    imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
    listeners: '29,400,000 monthly listeners',
    bio: 'Acclaimed Indian music composer and singer known for his viral high-energy chartbusters.',
  },
  {
    id: 'diljit-dosanjh',
    name: 'Diljit Dosanjh',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80',
    listeners: '24,900,800 monthly listeners',
    bio: 'Global Punjabi music superstar, singer, actor, and live performer taking Indian music worldwide.',
  },
  {
    id: 'ap-dhillon',
    name: 'AP Dhillon',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    listeners: '18,750,000 monthly listeners',
    bio: 'Indo-Canadian singer and rapper fusing Punjabi music with synth-wave and trap beats.',
  },
];

export async function searchTracks(query: string): Promise<Track[]> {
  const inIndia = isUserInIndia();

  // If in India and searching generic terms, automatically target top Indian songs
  let searchQuery = query;
  if (inIndia) {
    const isGeneric =
      !query ||
      query.includes('top hits') ||
      query.includes('trending') ||
      query.includes('recommended') ||
      query.includes('popular');

    if (isGeneric) {
      searchQuery = 'bollywood top songs 2024 arijit singh hits';
    }
  }

  if (!searchQuery) {
    return INDIAN_FEATURED_TRACKS;
  }

  const results: Track[] = [];

  // Match featured tracks if query matches
  const lowerQ = searchQuery.toLowerCase();
  const localMatches = INDIAN_FEATURED_TRACKS.filter(
    (t) => t.title.toLowerCase().includes(lowerQ) || t.artist.toLowerCase().includes(lowerQ)
  );
  if (localMatches.length > 0) {
    results.push(...localMatches);
  }

  // 1. Fetch full-length YouTube Music tracks via Invidious public engines
  const invidiousInstances = [
    'https://invidious.flokinet.to',
    'https://inv.tux.pizza',
    'https://yewtu.be',
    'https://invidious.nerdvpn.de',
    'https://vid.puffyan.us',
  ];

  try {
    for (const inst of invidiousInstances) {
      try {
        const res = await fetch(`${inst}/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=video`, {
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            data.slice(0, 15).forEach((item: any) => {
              if (item.videoId && item.lengthSeconds > 30) {
                let cleanTitle = item.title
                  .replace(/\(Official (Music )?Video\)/gi, '')
                  .replace(/\[Official (Music )?Video\]/gi, '')
                  .replace(/\(Official Audio\)/gi, '')
                  .replace(/\[Official Audio\]/gi, '')
                  .replace(/\(Audio\)/gi, '')
                  .replace(/\|.*$/g, '')
                  .trim();

                let artist = item.author || 'Unknown Artist';
                if (cleanTitle.includes('-')) {
                  const parts = cleanTitle.split('-');
                  artist = parts[0].trim();
                  cleanTitle = parts.slice(1).join('-').trim();
                }

                if (!results.some((r) => r.youtubeId === item.videoId)) {
                  // Skip if remix track
                  if (!isRemixTrack(cleanTitle, artist)) {
                    results.push({
                      id: `yt-${item.videoId}`,
                      title: cleanTitle || item.title,
                      artist,
                      album: 'Full Track',
                      coverUrl: `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`,
                      audioUrl: `https://www.youtube-nocookie.com/embed/${item.videoId}?enablejsapi=1&autoplay=1&rel=0&modestbranding=1`,
                      youtubeId: item.videoId,
                      durationMs: (item.lengthSeconds || 210) * 1000,
                      isFullLength: true,
                    });
                  }
                }
              }
            });
            break; // Stop once a healthy instance gives results
          }
        }
      } catch {
        // Try next instance
      }
    }
  } catch (err) {
    console.warn('Error fetching tracks:', err);
  }

  // Fallback if search gave no live results
  if (results.length === 0) {
    return INDIAN_FEATURED_TRACKS;
  }

  return results;
}

export async function getArtistTracks(artistName: string): Promise<Track[]> {
  return searchTracks(`${artistName} songs`);
}

export async function fetchLyrics(
  artist: string,
  title: string,
  durationSeconds?: number
): Promise<{ synced: boolean; lines: LyricLine[] } | null> {
  try {
    const result = await getSyncedLyrics(artist, title, durationSeconds);
    return {
      synced: result.synced,
      lines: result.lines,
    };
  } catch (e) {
    console.error('Error fetching lyrics:', e);
    return null;
  }
}
