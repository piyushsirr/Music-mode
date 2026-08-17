import React, { useState, useEffect } from 'react';
import { Track } from '../types';
import { REGIONS_LIST } from '../data/musicPreferences';
import { 
  getRegionalSpotlight, 
  fetchRegionalHubTracks, 
  resolveEffectiveRegion,
  RegionalSpotlight 
} from '../lib/recommendationEngine';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSongOptionsStore } from '../store/useSongOptionsStore';
import { useUserStore } from '../store/useUserStore';
import { useToastStore } from '../store/useToastStore';
import { useLongPress } from '../hooks/useLongPress';
import { 
  Play, 
  Pause, 
  Volume2, 
  MoreVertical, 
  MapPin, 
  Check, 
  Radio, 
  Sparkles,
  Loader2,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RegionalSongCardProps {
  key?: React.Key;
  song: Track;
  queue: Track[];
  index: number;
}

function RegionalSongCard({ song, queue, index }: RegionalSongCardProps) {
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.22 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      {...longPressHandlers}
      title={`${song.title} - ${song.artist} (Press & hold for options)`}
      className={`group relative p-3 bg-neutral-900/60 hover:bg-neutral-800/90 transition-all rounded-2xl cursor-pointer flex flex-col border select-none ${
        isCurrent
          ? 'border-green-500/50 bg-neutral-800/95 shadow-lg shadow-green-500/10'
          : 'border-white/5 hover:border-white/10'
      }`}
    >
      <div className="relative mb-2.5 aspect-square rounded-xl overflow-hidden shadow-md bg-neutral-950">
        <img
          src={song.coverUrl}
          alt={song.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {isCurrentPlaying && (
          <div className="absolute top-2 left-2 bg-green-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
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
          className={`absolute right-2 bottom-2 rounded-full bg-green-500 w-10 h-10 flex items-center justify-center transition-all shadow-xl hover:scale-110 active:scale-95 ${
            isCurrentPlaying ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          aria-label={`Play ${song.title}`}
        >
          {isCurrentPlaying ? (
            <Pause className="w-4 h-4 fill-black text-black" />
          ) : (
            <Play className="w-4 h-4 fill-black text-black ml-0.5" />
          )}
        </button>
      </div>

      <h4
        className={`font-bold text-xs sm:text-sm leading-snug line-clamp-1 break-words transition-colors ${
          isCurrent ? 'text-green-400' : 'text-white group-hover:text-white'
        }`}
      >
        {song.title}
      </h4>
      <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5 font-medium">
        {song.artist}
      </p>
    </motion.div>
  );
}

export function RegionalChartHub() {
  const { play, currentTrack, isPlaying } = usePlayerStore();
  const { 
    selectedLanguages, 
    selectedSingers, 
    selectedInterests, 
    selectedRegion, 
    setSelectedRegion,
    setIsOnboardingOpen,
    user 
  } = useUserStore();
  const { showToast } = useToastStore();

  // Compute effective region
  const userEffectiveRegion = resolveEffectiveRegion(selectedRegion, user?.city || user?.region);

  // Active viewing region state (defaults to userEffectiveRegion, but user can freely switch)
  const [activeRegionId, setActiveRegionId] = useState<string>(userEffectiveRegion || 'bihar-up');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Keep in sync when user profile region updates
  useEffect(() => {
    if (userEffectiveRegion) {
      setActiveRegionId(userEffectiveRegion);
    }
  }, [userEffectiveRegion]);

  const handleSelectTab = (regId: string) => {
    setActiveRegionId(regId);
    setSelectedRegion(regId);
    const meta = REGIONS_LIST.find((r) => r.id === regId);
    if (meta) {
      showToast(`Switched region to ${meta.name}! Recommendations updated.`);
    }
  };

  // Load tracks whenever active viewing region changes
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    // Immediate catalog fallback
    const instantSpotlight = getRegionalSpotlight({
      selectedLanguages,
      selectedSingers,
      selectedInterests,
      selectedRegion: activeRegionId,
      overrideRegionId: activeRegionId,
      detectedRegion: user?.city || user?.region,
    });
    setTracks(instantSpotlight.tracks);

    // Dynamic enrichment
    fetchRegionalHubTracks(activeRegionId).then((enrichedTracks) => {
      if (!isCancelled && enrichedTracks.length > 0) {
        setTracks(enrichedTracks);
        setIsLoading(false);
      }
    }).catch(() => {
      if (!isCancelled) setIsLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [activeRegionId, selectedLanguages, selectedSingers, selectedInterests, user]);

  const activeRegionMeta = REGIONS_LIST.find((r) => r.id === activeRegionId) || REGIONS_LIST[1];
  const isSelectedAsUserDefault = selectedRegion === activeRegionId || (selectedRegion === 'auto' && userEffectiveRegion === activeRegionId);

  const handleSetAsDefault = () => {
    setSelectedRegion(activeRegionId);
    showToast(`Locked ${activeRegionMeta.name} as your primary regional chart!`);
  };

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      play(tracks[0], tracks);
      showToast(`Playing ${activeRegionMeta.name} Regional Top Charts`);
    }
  };

  const isCurrentRegionPlaying = isPlaying && tracks.some((t) => t.id === currentTrack?.id);

  // Exclude 'auto' from the tab buttons so user can pick specific regions explicitly
  const selectableRegions = REGIONS_LIST.filter((r) => r.id !== 'auto');

  return (
    <section className="mb-12 p-5 sm:p-7 rounded-3xl bg-gradient-to-b from-neutral-800/80 via-neutral-900/90 to-neutral-950/90 border border-white/10 relative overflow-hidden shadow-2xl">
      {/* Background Glow */}
      <div 
        className={`absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${activeRegionMeta.accentGradient}`}
      />

      {/* HEADER WITH TITLE, FLAG, AND CONTROLS */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-xs font-black shadow-sm">
              <span className="text-base">{activeRegionMeta.flagEmoji}</span>
              <span>{activeRegionMeta.name}</span>
              <span className="text-emerald-400 font-medium">• {activeRegionMeta.nativeScript}</span>
            </span>

            {isSelectedAsUserDefault ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                <Check className="w-3 h-3" />
                Active Region
              </span>
            ) : null}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Regional Chart Hub
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
            {activeRegionMeta.description}
          </p>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto flex-wrap">
          {!isSelectedAsUserDefault && (
            <button
              onClick={handleSetAsDefault}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold border border-white/10 hover:border-white/20 transition-all shadow-md active:scale-95"
              title="Set this region as your default profile region"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Set as My Region</span>
            </button>
          )}

          <button
            onClick={handlePlayAll}
            disabled={tracks.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-500 hover:bg-green-400 text-black text-xs font-black shadow-lg shadow-green-500/25 active:scale-95 transition-all disabled:opacity-50"
          >
            {isCurrentRegionPlaying ? (
              <Pause className="w-4 h-4 fill-black" />
            ) : (
              <Play className="w-4 h-4 fill-black" />
            )}
            <span>Play Regional Top 10</span>
          </button>
        </div>
      </div>

      {/* REGION SELECTION TABS */}
      <div className="relative z-10 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {selectableRegions.map((region) => {
            const isTabActive = activeRegionId === region.id;
            return (
              <button
                key={region.id}
                onClick={() => handleSelectTab(region.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all border shrink-0 ${
                  isTabActive
                    ? 'bg-white text-black border-white shadow-lg scale-105'
                    : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border-white/10 hover:border-white/25'
                }`}
              >
                <span className="text-sm">{region.flagEmoji}</span>
                <span>{region.name.split('&')[0].trim()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* REGIONAL TRACKS GRID */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRegionId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4"
          >
            {tracks.slice(0, 12).map((song, i) => (
              <RegionalSongCard
                key={`reg-hub-${activeRegionId}-${song.id}-${i}`}
                song={song}
                queue={tracks}
                index={i}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {tracks.length === 0 && !isLoading && (
          <div className="text-center py-12 text-neutral-400 text-sm">
            No regional tracks found for {activeRegionMeta.name}.
          </div>
        )}
      </div>
    </section>
  );
}
