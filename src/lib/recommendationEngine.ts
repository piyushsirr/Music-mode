import { Track } from '../types';
import { REGIONAL_CATALOG, EnrichedTrack } from '../data/regionalTracksCatalog';
import { REGIONS_LIST } from '../data/musicPreferences';
import { searchTracks } from './api';
import { isRemixTrack, filterOutRemixes } from './utils';

export interface RecommendationParams {
  selectedLanguages: string[];
  selectedSingers: string[];
  selectedInterests: string[];
  selectedRegion: string;
  detectedRegion?: string;
  likedSongs?: Track[];
  recentTracks?: Track[];
  activeMoodFilter?: string | null;
  overrideRegionId?: string;
}

export interface ScoredTrack extends Track {
  matchScore: number;
  matchReason?: string;
  region?: string;
  languages?: string[];
  moods?: string[];
}

export interface DailyMix {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  coverUrl: string;
  gradient: string;
  badge: string;
  tracks: Track[];
}

export interface RegionalSpotlight {
  regionId: string;
  regionName: string;
  flagEmoji: string;
  nativeScript: string;
  tagline: string;
  description: string;
  tracks: Track[];
}

/**
 * Normalizes strings for robust matching
 */
function normalize(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Resolve effective region code based on user preference or IP detection
 */
export function resolveEffectiveRegion(selectedRegion: string, detectedCityOrRegion?: string): string {
  if (selectedRegion && selectedRegion !== 'auto') {
    return selectedRegion;
  }

  const raw = (detectedCityOrRegion || '').toLowerCase();
  if (raw.includes('bihar') || raw.includes('patna') || raw.includes('varanasi') || raw.includes('up') || raw.includes('uttar pradesh') || raw.includes('ranchi') || raw.includes('jharkhand') || raw.includes('lucknow')) {
    return 'bihar-up';
  }
  if (raw.includes('punjab') || raw.includes('chandigarh') || raw.includes('ludhiana') || raw.includes('amritsar') || raw.includes('jalandhar')) {
    return 'punjab';
  }
  if (raw.includes('delhi') || raw.includes('gurgaon') || raw.includes('noida') || raw.includes('haryana') || raw.includes('faridabad')) {
    return 'delhi-haryana';
  }
  if (raw.includes('mumbai') || raw.includes('maharashtra') || raw.includes('pune') || raw.includes('nagpur')) {
    return 'maharashtra';
  }
  if (raw.includes('bengal') || raw.includes('kolkata') || raw.includes('calcutta') || raw.includes('odisha') || raw.includes('bhubaneswar')) {
    return 'bengal';
  }
  if (raw.includes('chennai') || raw.includes('tamil') || raw.includes('hyderabad') || raw.includes('bengaluru') || raw.includes('bangalore') || raw.includes('kerala') || raw.includes('kochi')) {
    return 'south-india';
  }
  if (raw.includes('gujarat') || raw.includes('ahmedabad') || raw.includes('jaipur') || raw.includes('rajasthan')) {
    return 'gujarat-rajasthan';
  }

  return 'bihar-up'; // Default vibrant Indian regional baseline
}

/**
 * Calculate dynamic affinity score (0 to 100) for a track given user profile & context
 */
export function calculateTrackAffinity(
  track: EnrichedTrack,
  params: RecommendationParams
): { score: number; reason: string } {
  let score = 40; // baseline
  let primaryReason = 'Recommended for you';

  const effectiveRegion = resolveEffectiveRegion(params.selectedRegion, params.detectedRegion);
  const regMeta = REGIONS_LIST.find((r) => r.id === effectiveRegion) || REGIONS_LIST[1];
  const trackArtistNorm = normalize(track.artist);
  const trackTitleNorm = normalize(track.title);

  // 1. Regional Affinity (+50 pts for exact region, +35 for regional language match)
  const isExactRegionMatch = track.region === effectiveRegion;
  const isRegionalLangMatch = track.languages.some((l) =>
    regMeta.primaryLanguages?.some((rl) => normalize(rl) === normalize(l))
  );

  if (isExactRegionMatch) {
    score += 50;
    primaryReason = `Top trending in ${regMeta.name}`;
  } else if (isRegionalLangMatch) {
    score += 35;
    primaryReason = `Popular in ${regMeta.name}`;
  } else if (track.region === 'pan-india') {
    score += 20;
    primaryReason = 'Pan-India Chartbuster';
  } else if (track.region !== 'global' && effectiveRegion !== 'global') {
    // If from another distinct regional market, penalize unless user explicitly selected its language
    const userLikesThisLang = track.languages.some((lang) =>
      params.selectedLanguages.some((userLang) => normalize(userLang) === normalize(lang))
    );
    if (!userLikesThisLang) {
      score -= 35;
    }
  }

  // 2. Artist Affinity (+35 pts)
  const matchingSinger = params.selectedSingers.find((singer) => {
    const sNorm = normalize(singer);
    return trackArtistNorm.includes(sNorm) || sNorm.includes(trackArtistNorm);
  });

  if (matchingSinger) {
    score += 35;
    primaryReason = `Because you like ${matchingSinger}`;
  } else if (params.recentTracks?.some((r) => normalize(r.artist) === trackArtistNorm)) {
    score += 25;
    primaryReason = `Based on your recent listening to ${track.artist}`;
  }

  // 3. Language Affinity (+25 pts)
  const matchingLanguage = track.languages.find((lang) =>
    params.selectedLanguages.some((userLang) => normalize(userLang) === normalize(lang))
  );

  if (matchingLanguage) {
    score += 25;
    if (!matchingSinger && !isExactRegionMatch) {
      primaryReason = `Popular in ${matchingLanguage}`;
    }
  }

  // 4. Interests & Mood Filter Affinity (+40 pts)
  if (params.activeMoodFilter) {
    if (track.moods.includes(params.activeMoodFilter as any)) {
      score += 40;
      primaryReason = `Matches your ${params.activeMoodFilter} vibe`;
    } else {
      score -= 40;
    }
  } else if (params.selectedInterests && params.selectedInterests.length > 0) {
    const matchedMood = track.moods.find((m) => params.selectedInterests.includes(m));
    if (matchedMood) {
      score += 15;
      if (!matchingSinger && !isExactRegionMatch) {
        primaryReason = `Curated for your ${matchedMood} vibe`;
      }
    }
  }

  // 5. Liked Songs Bonus (+15 pts)
  if (params.likedSongs?.some((l) => l.id === track.id || normalize(l.title) === trackTitleNorm)) {
    score += 15;
  }

  // 6. Popularity boost
  if (track.popularityScore) {
    score += Math.round(track.popularityScore * 0.08);
  }

  const boundedScore = Math.min(99, Math.max(50, score));
  return { score: boundedScore, reason: primaryReason };
}

/**
 * Generate Main Personalized Recommendations Feed
 */
export async function getIntelligentRecommendations(
  params: RecommendationParams
): Promise<{ title: string; subtitle: string; tracks: ScoredTrack[] }> {
  const effectiveRegion = resolveEffectiveRegion(params.selectedRegion, params.detectedRegion);
  const regMeta = REGIONS_LIST.find((r) => r.id === effectiveRegion) || REGIONS_LIST[1];

  // Score all non-remix tracks in regional catalogue
  const scoredCatalogue: ScoredTrack[] = REGIONAL_CATALOG
    .filter((t) => !isRemixTrack(t.title, t.artist, t.album))
    .map((track) => {
      const { score, reason } = calculateTrackAffinity(track, params);
      return {
        ...track,
        matchScore: score,
        matchReason: reason,
      };
    });

  // Sort by affinity score descending
  scoredCatalogue.sort((a, b) => b.matchScore - a.matchScore);

  let finalTracks = scoredCatalogue;

  // Title generation tailored to user's region and preferences
  let title = `Recommended in ${regMeta.name}`;
  let subtitle = `Curated for ${params.selectedLanguages.slice(0, 3).join(', ')} • ${regMeta.nativeScript}`;

  if (params.activeMoodFilter) {
    const moodCapitalized = params.activeMoodFilter.charAt(0).toUpperCase() + params.activeMoodFilter.slice(1);
    title = `${moodCapitalized} Mix • ${regMeta.name}`;
    subtitle = `Based on your ${params.activeMoodFilter} vibe in ${regMeta.name}`;
    finalTracks = scoredCatalogue.filter((t) => t.moods?.includes(params.activeMoodFilter as any));
  } else if (params.selectedSingers.length > 0) {
    const primarySinger = params.selectedSingers[0];
    title = `${regMeta.flagEmoji} ${primarySinger} & ${regMeta.name} Hits`;
    subtitle = `Smart regional algorithm tuned for ${regMeta.name} charts`;
  }

  // Fetch dynamic regional live fallback tracks to enrich feed
  try {
    const liveRegional = await fetchRegionalHubTracks(effectiveRegion);
    if (liveRegional.length > 0) {
      const existingIds = new Set(finalTracks.map((t) => t.id));
      const enrichedLive: ScoredTrack[] = liveRegional
        .filter((t) => !existingIds.has(t.id))
        .map((t, idx) => ({
          ...t,
          matchScore: 94 - idx,
          matchReason: `Trending in ${regMeta.name}`,
        }));
      
      // Merge: top scored catalog tracks + live regional hits
      finalTracks = [...finalTracks.slice(0, 14), ...enrichedLive, ...finalTracks.slice(14)];
    }
  } catch (err) {
    console.warn('Could not enrich live regional recommendations:', err);
  }

  return {
    title,
    subtitle,
    tracks: finalTracks.slice(0, 30),
  };
}

/**
 * Generate 5 Algorithmic Daily Mixes (Made For You)
 */
export function generateDailyMixes(params: RecommendationParams): DailyMix[] {
  const effectiveRegion = resolveEffectiveRegion(params.selectedRegion, params.detectedRegion);
  const regMeta = REGIONS_LIST.find((r) => r.id === effectiveRegion) || REGIONS_LIST[1];
  const primarySinger = params.selectedSingers[0] || 'Arijit Singh';
  const secondarySinger = params.selectedSingers[1] || 'Pawan Singh';
  const thirdSinger = params.selectedSingers[2] || 'Diljit Dosanjh';

  // Filter out any remixes from catalog before building mixes
  const cleanCatalog = REGIONAL_CATALOG.filter((t) => !isRemixTrack(t.title, t.artist, t.album));

  // Mix 1: Regional Romantic & Melodic
  const mix1Tracks = cleanCatalog.filter(
    (t) => (t.moods.includes('romantic') || t.moods.includes('lofi')) && (t.region === effectiveRegion || t.region === 'pan-india')
  );

  // Mix 2: High-Energy Regional Party & Desi Energy
  const mix2Tracks = cleanCatalog.filter(
    (t) => (t.moods.includes('party') || t.moods.includes('workout')) && (t.region === effectiveRegion || t.region === 'pan-india')
  );

  // Mix 3: Midnight Chill, Indie & Lofi
  const mix3Tracks = cleanCatalog.filter(
    (t) => t.moods.includes('lofi') || t.moods.includes('indie') || t.moods.includes('sufi')
  );

  // Mix 4: Viral Regional Chartbusters
  const mix4Tracks = cleanCatalog.filter(
    (t) => t.region === effectiveRegion || t.languages.some((l) => regMeta.primaryLanguages?.includes(l))
  );

  // Mix 5: Cultural Heritage, Retro & Folk Classics
  const mix5Tracks = cleanCatalog.filter(
    (t) => t.moods.includes('retro') || t.moods.includes('devotional') || (t.region === effectiveRegion && t.releaseYear && t.releaseYear < 2022)
  );

  return [
    {
      id: 'daily-mix-1',
      title: 'Daily Mix 1',
      subtitle: `${regMeta.flagEmoji} ${regMeta.name} Romance`,
      description: `Soulful melodies and romantic chartbusters popular across ${regMeta.name}.`,
      coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
      gradient: 'from-rose-600 to-pink-700',
      badge: 'Melody & Romance',
      tracks: mix1Tracks.length > 0 ? mix1Tracks : REGIONAL_CATALOG.slice(0, 8),
    },
    {
      id: 'daily-mix-2',
      title: 'Daily Mix 2',
      subtitle: `${regMeta.flagEmoji} ${regMeta.name} Party & Bass`,
      description: `High-octane club anthems, DJ hits, and party bangers in ${regMeta.name}.`,
      coverUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&auto=format&fit=crop&q=80',
      gradient: 'from-amber-600 to-red-700',
      badge: 'Party & Beats',
      tracks: mix2Tracks.length > 0 ? mix2Tracks : REGIONAL_CATALOG.slice(2, 10),
    },
    {
      id: 'daily-mix-3',
      title: 'Daily Mix 3',
      subtitle: 'Chill, Lofi & Indie Acoustics',
      description: 'Mellow lofi beats, late-night acoustic vibes and soothing indie.',
      coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80',
      gradient: 'from-indigo-600 to-purple-800',
      badge: 'Chill & Lofi',
      tracks: mix3Tracks.length > 0 ? mix3Tracks : REGIONAL_CATALOG.slice(4, 12),
    },
    {
      id: 'daily-mix-4',
      title: 'Daily Mix 4',
      subtitle: `${regMeta.flagEmoji} Regional Radar: ${regMeta.name}`,
      description: `Hyper-local viral sensations and regional superstars trending in ${regMeta.name}.`,
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
      gradient: 'from-emerald-600 to-teal-800',
      badge: 'Regional Radar',
      tracks: mix4Tracks.length > 0 ? mix4Tracks : REGIONAL_CATALOG.slice(0, 10),
    },
    {
      id: 'daily-mix-5',
      title: 'Daily Mix 5',
      subtitle: `${regMeta.flagEmoji} Cultural Heritage & Classics`,
      description: `Timeless melodies, golden retro era, and nostalgic folk treasures of ${regMeta.name}.`,
      coverUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80',
      gradient: 'from-yellow-600 to-amber-700',
      badge: 'Heritage & Folk',
      tracks: mix5Tracks.length > 0 ? mix5Tracks : REGIONAL_CATALOG.slice(3, 11),
    },
  ];
}

/**
 * Generate Regional Spotlight Showcase
 */
export function getRegionalSpotlight(params: RecommendationParams): RegionalSpotlight {
  const targetRegionId = params.overrideRegionId || params.selectedRegion;
  const effectiveRegion = resolveEffectiveRegion(targetRegionId, params.detectedRegion);
  const regMeta = REGIONS_LIST.find((r) => r.id === effectiveRegion) || REGIONS_LIST.find((r) => r.id === 'bihar-up') || REGIONS_LIST[1];

  let regionalTracks = REGIONAL_CATALOG.filter((t) => {
    if (t.region === effectiveRegion) return true;
    if (effectiveRegion === 'bihar-up' && (t.languages.includes('Bhojpuri') || t.languages.includes('Maithili'))) return true;
    if (effectiveRegion === 'punjab' && t.languages.includes('Punjabi')) return true;
    if (effectiveRegion === 'south-india' && (t.languages.includes('Tamil') || t.languages.includes('Telugu') || t.languages.includes('Malayalam') || t.languages.includes('Kannada'))) return true;
    if (effectiveRegion === 'maharashtra' && t.languages.includes('Marathi')) return true;
    if (effectiveRegion === 'delhi-haryana' && (t.languages.includes('Haryanvi') || t.artist.toLowerCase().includes('badshah') || t.artist.toLowerCase().includes('honey singh'))) return true;
    if (effectiveRegion === 'bengal' && t.languages.includes('Bengali')) return true;
    if (effectiveRegion === 'gujarat-rajasthan' && (t.languages.includes('Gujarati') || t.languages.includes('Rajasthani'))) return true;
    if (effectiveRegion === 'global' && t.languages.includes('English')) return true;
    return false;
  });

  if (regionalTracks.length === 0) {
    regionalTracks = REGIONAL_CATALOG.slice(0, 8);
  }

  return {
    regionId: effectiveRegion,
    regionName: regMeta.name,
    flagEmoji: regMeta.flagEmoji,
    nativeScript: regMeta.nativeScript,
    tagline: `Trending Charts in ${regMeta.name}`,
    description: regMeta.description,
    tracks: regionalTracks,
  };
}

/**
 * Live search keywords for expanding regional chart hubs on the fly
 */
const REGION_SEARCH_QUERIES: Record<string, string> = {
  'bihar-up': 'Bhojpuri superhits Pawan Singh Khesari Shilpi Raj',
  'punjab': 'Punjabi hits Sidhu Moosewala Diljit Dosanjh Karan Aujla',
  'south-india': 'South Indian chartbusters Anirudh Sushin Shyam Sid Sriram',
  'maharashtra': 'Marathi Bollywood hits Ajay Atul Sairat',
  'delhi-haryana': 'Haryanvi top hits Renuka Panwar Badshah',
  'bengal': 'Bengali top hits Arijit Singh Anupam Roy',
  'gujarat-rajasthan': 'Gujarati Garba folk hits Darshan Raval Mame Khan',
  'global': 'Billboard hot 100 pop hits The Weeknd Taylor Swift',
  'pan-india': 'Bollywood top hits Arijit Singh Pritam trending',
};

/**
 * Fetch dynamic regional tracks combining catalog and live search
 */
export async function fetchRegionalHubTracks(regionId: string): Promise<Track[]> {
  const spotlight = getRegionalSpotlight({
    selectedLanguages: [],
    selectedSingers: [],
    selectedInterests: [],
    selectedRegion: regionId,
    overrideRegionId: regionId,
  });

  const catalogTracks = spotlight.tracks;

  try {
    const query = REGION_SEARCH_QUERIES[regionId] || 'Top Indian trending hits';
    const liveResults = await searchTracks(query);
    if (liveResults && liveResults.length > 0) {
      // Merge unique by title & artist
      const seen = new Set(catalogTracks.map((t) => `${normalize(t.title)}_${normalize(t.artist)}`));
      const additionalTracks: Track[] = [];
      for (const track of liveResults) {
        const key = `${normalize(track.title)}_${normalize(track.artist)}`;
        if (!seen.has(key)) {
          seen.add(key);
          additionalTracks.push(track);
        }
      }
      return [...catalogTracks, ...additionalTracks].slice(0, 15);
    }
  } catch (err) {
    console.warn('Error fetching live regional tracks fallback:', err);
  }

  return catalogTracks;
}

/**
 * Content-based "Because You Listened To" recommendations
 */
export function getBecauseYouListenedTo(
  recentTrack: Track | undefined,
  catalog: EnrichedTrack[] = REGIONAL_CATALOG
): { title: string; tracks: Track[] } | null {
  if (!recentTrack) return null;

  const artistNorm = normalize(recentTrack.artist);
  const matching = catalog.filter((t) => {
    if (t.id === recentTrack.id) return false;
    const isSameArtist = normalize(t.artist).includes(artistNorm) || artistNorm.includes(normalize(t.artist));
    return isSameArtist;
  });

  if (matching.length === 0) return null;

  return {
    title: `Because you listened to ${recentTrack.title}`,
    tracks: matching.slice(0, 6),
  };
}
