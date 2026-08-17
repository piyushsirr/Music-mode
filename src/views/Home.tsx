import React, { useEffect, useState, useMemo } from 'react';
import { Track, Artist } from '../types';
import { INDIAN_FEATURED_TRACKS, isUserInIndia } from '../lib/api';
import { TrackRow } from '../components/TrackRow';
import { 
  Play, 
  Pause, 
  History, 
  Heart, 
  Music, 
  Flame, 
  Volume2, 
  MoreVertical, 
  SlidersHorizontal, 
  Languages, 
  Sparkles,
  Radio,
  MapPin,
  Zap,
  ChevronRight,
  TrendingUp,
  Compass,
  Disc3
} from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useSongOptionsStore } from '../store/useSongOptionsStore';
import { useUserStore } from '../store/useUserStore';
import { useLongPress } from '../hooks/useLongPress';
import { 
  POPULAR_SINGERS, 
  LANGUAGES, 
  USER_INTERESTS, 
  REGIONS_LIST 
} from '../data/musicPreferences';
import { 
  getIntelligentRecommendations, 
  getBecauseYouListenedTo,
  resolveEffectiveRegion,
  ScoredTrack
} from '../lib/recommendationEngine';
import { SpeedDial } from '../components/SpeedDial';
import { motion } from 'motion/react';

interface HomeProps {
  onSelectArtist?: (artist: Artist) => void;
}

interface RecentSongCardProps {
  key?: React.Key;
  song: Track;
  queue: Track[];
  index: number;
}

function RecentSongCard({ song, queue, index }: RecentSongCardProps) {
  const { play, togglePlay, currentTrack, isPlaying } = usePlayerStore();
  const { openOptions } = useSongOptionsStore();
  const isCurrent = currentTrack?.id === song.id;
  const isCurrentPlaying = isCurrent && isPlaying;

  const handleClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      play(song, queue);
    }
  };

  const handleOpenOptions = (e?: React.SyntheticEvent | TouchEvent | MouseEvent) => {
    if (e && 'stopPropagation' in e) {
      e.stopPropagation();
    }
    openOptions(song, queue);
  };

  const longPressHandlers = useLongPress({
    threshold: 400,
    onLongPress: handleOpenOptions,
    onClick: handleClick,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      {...longPressHandlers}
      title={`${song.title} - ${song.artist} (Press and hold for options)`}
      className={`group relative p-3.5 bg-neutral-800/50 hover:bg-neutral-800/90 transition-all rounded-2xl cursor-pointer flex flex-col border select-none ${
        isCurrent
          ? 'border-green-500/50 bg-neutral-800/95 shadow-lg shadow-green-500/10'
          : 'border-white/5 hover:border-white/10'
      }`}
    >
      <div className="relative mb-3 aspect-square rounded-xl overflow-hidden shadow-md bg-neutral-900">
        <img
          src={song.coverUrl}
          alt={song.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {isCurrentPlaying && (
          <div className="absolute top-2 left-2 bg-green-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
            <Volume2 className="w-3 h-3 animate-pulse" />
            PLAYING
          </div>
        )}

        <button
          onClick={handleOpenOptions}
          className="absolute top-2 right-2 rounded-full bg-black/60 backdrop-blur-md p-1.5 text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
          title="More options"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className={`absolute right-2.5 bottom-2.5 rounded-full bg-green-500 w-11 h-11 flex items-center justify-center transition-all shadow-xl hover:scale-110 active:scale-95 ${
            isCurrentPlaying ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          aria-label={`Play ${song.title}`}
        >
          {isCurrentPlaying ? (
            <Pause className="w-5 h-5 fill-black text-black" />
          ) : (
            <Play className="w-5 h-5 fill-black text-black ml-0.5" />
          )}
        </button>
      </div>

      <h4
        className={`font-bold text-sm leading-snug line-clamp-2 break-words transition-colors ${
          isCurrent ? 'text-green-400' : 'text-white group-hover:text-white'
        }`}
        title={song.title}
      >
        {song.title}
      </h4>
      <p
        className="text-xs text-neutral-400 line-clamp-1 mt-1 font-medium"
        title={song.artist}
      >
        {song.artist}
      </p>
    </motion.div>
  );
}

export function Home({ onSelectArtist }: HomeProps) {
  const [recommendedTracks, setRecommendedTracks] = useState<ScoredTrack[]>([]);
  const [recommendationTitle, setRecommendationTitle] = useState('Recommended For You');
  const [recommendationSubtitle, setRecommendationSubtitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeMoodFilter, setActiveMoodFilter] = useState<string | null>(null);
  const [activeSingerFilter, setActiveSingerFilter] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('');

  const { play } = usePlayerStore();
  const { recentTracks, likedSongs } = useLibraryStore();
  const { 
    selectedLanguages, 
    selectedSingers, 
    selectedInterests,
    selectedRegion,
    setSelectedRegion,
    setIsOnboardingOpen,
    user
  } = useUserStore();

  const effectiveRegion = useMemo(() => {
    return resolveEffectiveRegion(selectedRegion, user?.city || user?.region);
  }, [selectedRegion, user]);

  const currentRegionMeta = useMemo(() => {
    return REGIONS_LIST.find((r) => r.id === effectiveRegion) || REGIONS_LIST[1];
  }, [effectiveRegion]);

  // Greeting time calculation
  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) setGreeting('Good morning');
      else if (hour >= 12 && hour < 17) setGreeting('Good afternoon');
      else setGreeting('Good evening');
    };
    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  // Compute Intelligent Recommendations
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    getIntelligentRecommendations({
      selectedLanguages,
      selectedSingers: activeSingerFilter ? [activeSingerFilter] : selectedSingers,
      selectedInterests,
      selectedRegion,
      detectedRegion: user?.city || user?.region,
      likedSongs,
      recentTracks,
      activeMoodFilter,
    }).then((res) => {
      if (!isCancelled) {
        setRecommendedTracks(res.tracks);
        setRecommendationTitle(res.title);
        setRecommendationSubtitle(res.subtitle);
        setLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [
    selectedLanguages,
    selectedSingers,
    selectedInterests,
    selectedRegion,
    activeMoodFilter,
    activeSingerFilter,
    recentTracks,
    likedSongs,
    user
  ]);

  // Contextual "Because You Listened To"
  const becauseYouListened = useMemo(() => {
    return getBecauseYouListenedTo(recentTracks[0]);
  }, [recentTracks]);

  // Last 5 recently played
  const last5RecentlyPlayed = recentTracks.slice(0, 5);
  const hasHistory = last5RecentlyPlayed.length > 0;
  const displayRecentSongs = hasHistory ? last5RecentlyPlayed : INDIAN_FEATURED_TRACKS.slice(0, 5);

  // Favorite singers to display
  const displayFavoriteSingers = POPULAR_SINGERS.filter((s) =>
    selectedSingers.includes(s.name)
  );

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-black/10 via-neutral-900/60 to-neutral-950/95 pb-36 md:pb-24 scrollbar-thin scrollbar-thumb-neutral-700">
      <div className="px-4 sm:px-6 py-6 pt-20">
        
        {/* TOP WELCOME & REGION BADGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black tracking-wide shadow-sm">
                <span className="text-base">{currentRegionMeta.flagEmoji}</span>
                <span>{currentRegionMeta.name}</span>
                <span className="text-emerald-500/80">• {currentRegionMeta.nativeScript}</span>
              </span>
              <span className="text-xs text-neutral-400 font-medium hidden sm:inline">
                {selectedRegion === 'auto' ? 'Auto IP Detected' : 'Custom Region'}
              </span>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-3xl sm:text-4xl font-black text-white tracking-tight"
            >
              {greeting}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="text-neutral-400 text-sm mt-1 flex items-center gap-2 flex-wrap"
            >
              <Sparkles className="w-4 h-4 text-green-400 shrink-0" />
              <span>
                Personalized engine: <strong className="text-white">{selectedLanguages.join(', ')}</strong> • <strong className="text-white">{selectedInterests.length} vibes</strong> • <strong className="text-white">{selectedSingers.length} artists</strong>
              </span>
            </motion.p>
          </div>

          {/* Quick Tune Engine Button */}
          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold border border-white/10 hover:border-white/20 transition-all self-start md:self-auto shadow-md hover:scale-105 active:scale-95"
            title="Tune your regional charts, vibes, and singer algorithms"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-green-400" />
            <span>Tune Interests & Region</span>
          </button>
        </div>

        {/* INTERACTIVE MOOD / INTERESTS PILL BAR */}
        <div className="mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {/* All / Default Mix */}
            <button
              onClick={() => {
                setActiveMoodFilter(null);
                setActiveSingerFilter(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all border shrink-0 ${
                activeMoodFilter === null && activeSingerFilter === null
                  ? 'bg-green-500 text-black border-green-500 shadow-md shadow-green-500/20'
                  : 'bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 border-white/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>✨ Smart Mix</span>
            </button>

            {USER_INTERESTS.map((interest) => {
              const isActive = activeMoodFilter === interest.id;
              return (
                <button
                  key={interest.id}
                  onClick={() => {
                    setActiveSingerFilter(null);
                    setActiveMoodFilter(isActive ? null : interest.id);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                    isActive
                      ? 'bg-green-500 text-black border-green-500 shadow-md shadow-green-500/20'
                      : 'bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 border-white/10 hover:border-white/20'
                  }`}
                >
                  <span>{interest.emoji}</span>
                  <span>{interest.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TOP SPEED DIAL (9 MOST REPEATED & LAST LISTENED TRACKS) */}
        <SpeedDial />

        {/* SECTION 3: YOUR FAVORITE ARTISTS */}
        {displayFavoriteSingers.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Music className="w-5 h-5 text-green-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Your Favorite Artists
                </h2>
                <span className="bg-neutral-800 border border-neutral-700 text-green-400 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                  {displayFavoriteSingers.length} chosen
                </span>
              </div>

              {activeSingerFilter && (
                <button
                  onClick={() => setActiveSingerFilter(null)}
                  className="text-xs text-neutral-400 hover:text-white underline font-semibold"
                >
                  Show All Mix
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {displayFavoriteSingers.map((singer) => {
                const isFilterActive = activeSingerFilter === singer.name;
                return (
                  <motion.div
                    key={singer.id}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      if (onSelectArtist) {
                        onSelectArtist({
                          id: singer.id,
                          name: singer.name,
                          imageUrl: singer.imageUrl,
                          listeners: 'Verified Artist • Popular Choice',
                          bio: `${singer.name} is one of your favorite chosen artists specializing in ${singer.languages.join(', ')} music.`,
                        });
                      } else {
                        setActiveSingerFilter(singer.name);
                      }
                    }}
                    className={`group relative p-3 bg-neutral-800/40 hover:bg-neutral-800/90 rounded-2xl border transition-all cursor-pointer flex flex-col items-center text-center ${
                      isFilterActive
                        ? 'border-green-500 bg-neutral-800 ring-2 ring-green-500/40 shadow-lg shadow-green-500/10'
                        : 'border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-2.5 shadow-lg border-2 border-neutral-700 group-hover:border-green-400 transition-colors">
                      <img
                        src={singer.imageUrl}
                        alt={singer.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="w-9 h-9 rounded-full bg-green-500 text-black flex items-center justify-center shadow-lg">
                          <Play className="w-4 h-4 fill-black ml-0.5" />
                        </div>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-white group-hover:text-green-400 transition-colors truncate max-w-full">
                      {singer.name}
                    </h4>
                    <span className="text-[11px] text-neutral-400 mt-0.5 truncate max-w-full">
                      {singer.languages.join('/')}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 4: CONTEXTUAL "BECAUSE YOU LISTENED TO" */}
        {becauseYouListened && becauseYouListened.tracks.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Compass className="w-5 h-5 text-sky-400" />
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {becauseYouListened.title}
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {becauseYouListened.tracks.map((song, i) => (
                <RecentSongCard
                  key={`because-${song.id}`}
                  song={song}
                  queue={becauseYouListened.tracks}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}

        {/* SECTION 5: RECENTLY PLAYED */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <History className="w-5 h-5 text-green-400" />
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Recently Played
              </h2>
              {hasHistory && (
                <span className="bg-neutral-800 border border-neutral-700 text-green-400 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                  Last {last5RecentlyPlayed.length} {last5RecentlyPlayed.length === 1 ? 'song' : 'songs'}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {displayRecentSongs.map((song, i) => (
              <RecentSongCard
                key={`recent-${song.id}`}
                song={song}
                queue={displayRecentSongs}
                index={i}
              />
            ))}
          </div>
        </div>

        {/* SECTION 6: INTELLIGENT RECOMMENDATIONS FEED WITH MATCH AFFINITY */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {recommendationTitle}
                </h2>
              </div>
              {recommendationSubtitle && (
                <p className="text-xs text-neutral-400 mt-0.5">
                  {recommendationSubtitle}
                </p>
              )}
            </div>

            {/* Quick language filter triggers */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {selectedLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setActiveSingerFilter(null);
                    setActiveMoodFilter(null);
                    setRecommendationTitle(`${lang} Chartbusters`);
                  }}
                  className="px-3 py-1 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold border border-white/5 transition-colors shrink-0"
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="grid grid-cols-[28px_1fr_1fr_minmax(100px,64px)] gap-3 sm:gap-4 px-3 sm:px-4 py-2 text-xs sm:text-sm text-neutral-400 border-b border-white/10 mb-3 uppercase tracking-wider font-semibold">
                <div className="text-center">#</div>
                <div>Title & Recommendation Affinity</div>
                <div className="hidden md:block">Album</div>
                <div className="text-right">Time</div>
              </div>
              {recommendedTracks.map((track, i) => (
                <div key={track.id} className="relative group">
                  <TrackRow
                    track={track}
                    index={i}
                    queue={recommendedTracks}
                  />
                  {/* Subtle match affinity badge on large screens */}
                  {track.matchScore && (
                    <div className="hidden xl:flex absolute right-24 top-1/2 -translate-y-1/2 pointer-events-none items-center gap-1">
                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {track.matchScore}% Match
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
