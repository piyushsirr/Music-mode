import React from 'react';
import { Play, Pause, Heart, MoreHorizontal, Volume2 } from 'lucide-react';
import { Track } from '../types';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useToastStore } from '../store/useToastStore';
import { useSongOptionsStore } from '../store/useSongOptionsStore';
import { useLongPress } from '../hooks/useLongPress';
import { formatDuration } from '../lib/utils';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface TrackRowProps {
  key?: string | number;
  track: Track;
  index: number;
  queue: Track[];
}

export function TrackRow({ track, index, queue }: TrackRowProps) {
  const { currentTrack, isPlaying, play, togglePlay } = usePlayerStore();
  const { isLiked, toggleLike } = useLibraryStore();
  const { showToast } = useToastStore();
  const { openOptions } = useSongOptionsStore();

  const isCurrent = currentTrack?.id === track.id;
  const isCurrentPlaying = isCurrent && isPlaying;
  const liked = isLiked(track.id);

  const handleRowClick = () => {
    if (isCurrent) {
      if (!isPlaying) {
        togglePlay();
      }
    } else {
      play(track, queue);
    }
  };

  const handlePlayButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      play(track, queue);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isAdded = toggleLike(track);
    showToast(isAdded ? 'Added to Liked Songs' : 'Removed from Liked Songs');
  };

  const handleOpenOptions = (e?: React.SyntheticEvent | TouchEvent | MouseEvent) => {
    if (e && 'stopPropagation' in e) {
      e.stopPropagation();
    }
    openOptions(track, queue);
  };

  const longPressHandlers = useLongPress({
    threshold: 400,
    onLongPress: handleOpenOptions,
    onClick: handleRowClick,
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.3) }}
      whileHover={{ scale: 1.008 }}
      whileTap={{ scale: 0.995 }}
      {...longPressHandlers}
      title={`${track.title} - ${track.artist} (Press and hold for options)`}
      className={cn(
        "group flex items-center py-2.5 px-3 sm:px-4 rounded-xl transition-all gap-3 sm:gap-4 relative cursor-pointer border select-none mb-1 active:bg-neutral-800/80",
        isCurrent 
          ? "bg-neutral-800/90 border-green-500/30 shadow-md shadow-black/40" 
          : "bg-neutral-800/20 hover:bg-neutral-800/60 border-transparent hover:border-white/5"
      )}
    >
      {/* Index Number or Play/Pause button */}
      <div className="w-7 text-center relative flex items-center justify-center shrink-0">
        {isCurrentPlaying ? (
          <Volume2 className="w-4 h-4 text-green-400 animate-pulse group-hover:hidden" />
        ) : (
          <span className={cn(
            "text-neutral-400 group-hover:hidden text-sm font-bold",
            isCurrent ? "text-green-400" : ""
          )}>
            {index + 1}
          </span>
        )}
        <button 
          onClick={handlePlayButtonClick}
          className={cn(
            "hidden group-hover:flex items-center justify-center bg-green-500 hover:bg-green-400 p-2 rounded-full shadow-md text-black transition-transform hover:scale-110",
            isCurrent ? "flex" : ""
          )}
          aria-label={isCurrentPlaying ? "Pause" : "Play"}
        >
          {isCurrentPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-black text-black" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-black text-black ml-0.5" />
          )}
        </button>
      </div>
      
      {/* Cover and Full Title */}
      <div className="flex-1 flex items-center gap-3 sm:gap-4 min-w-0">
        {track.coverUrl && (
          <div className="relative w-11 h-11 rounded-lg overflow-hidden shadow-md shrink-0 bg-neutral-900 border border-white/10 group/cover">
            <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover transition-transform duration-300 group-hover/cover:scale-110" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 flex items-center justify-center transition-opacity">
              {isCurrentPlaying ? (
                <Pause className="w-4 h-4 text-white fill-white" />
              ) : (
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              )}
            </div>
          </div>
        )}
        <div className="flex flex-col min-w-0 flex-1 pr-2">
          <div className="flex items-center gap-2 min-w-0">
            <span 
              className={cn(
                "font-bold text-sm sm:text-base transition-colors leading-tight line-clamp-1 break-words",
                isCurrent ? "text-green-400" : "text-white group-hover:text-white"
              )}
              title={track.title}
            >
              {track.title}
            </span>
            {track.isFullLength && (
              <span className="text-[10px] font-black bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 hidden sm:inline-block">
                FULL
              </span>
            )}
          </div>
          <span 
            className="text-xs sm:text-sm text-neutral-400 hover:underline hover:text-white transition-colors cursor-pointer line-clamp-1 mt-0.5"
            title={track.artist}
          >
            {track.artist}
          </span>
        </div>
      </div>
      
      {/* Album name */}
      <div 
        className="flex-1 hidden md:flex items-center text-xs sm:text-sm text-neutral-400 hover:underline hover:text-white transition-colors cursor-pointer truncate max-w-xs"
        title={track.album}
      >
        {track.album}
      </div>
      
      {/* Options & Duration */}
      <div className="flex items-center justify-end gap-2 sm:gap-3 w-28 sm:w-36 relative shrink-0">
        {/* Like Button */}
        <motion.button 
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.8 }}
          onClick={handleLike}
          className="opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 p-1"
          title={liked ? "Remove from Liked Songs" : "Save to Liked Songs"}
        >
          <Heart className={cn("w-4 h-4", liked ? "fill-green-500 text-green-500 opacity-100" : "text-neutral-400 hover:text-white")} />
        </motion.button>

        {/* More Options Button */}
        <button 
          onClick={handleOpenOptions}
          className="opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 p-1 text-neutral-400 hover:text-white"
          title="More options (or long press row)"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>

        <div className="text-right text-xs text-neutral-400 font-mono w-10 shrink-0">
          {track.durationMs ? formatDuration(track.durationMs) : '3:30'}
        </div>
      </div>
    </motion.div>
  );
}
