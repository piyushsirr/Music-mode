import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, MoreVertical, Sparkles, Flame, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { Track } from '../types';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useSongOptionsStore } from '../store/useSongOptionsStore';
import { motion, AnimatePresence } from 'motion/react';
import { isRemixTrack } from '../lib/utils';

export function SpeedDial() {
  const { currentTrack, isPlaying, play, togglePlay } = usePlayerStore();
  const { getSpeedDialTracks } = useLibraryStore();
  const { openOptions } = useSongOptionsStore();

  const [currentPage, setCurrentPage] = useState(0);
  const [speedDialTracks, setSpeedDialTracks] = useState<Track[]>([]);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  // Load and refresh speed dial tracks
  useEffect(() => {
    const rawTracks = getSpeedDialTracks();
    // Strictly filter out any remixes
    const cleanTracks = rawTracks.filter(
      (t) => t && !isRemixTrack(t.title, t.artist, t.album)
    );
    setSpeedDialTracks(cleanTracks);
  }, [getSpeedDialTracks]);

  const itemsPerPage = 9;
  const totalPages = Math.max(1, Math.ceil(speedDialTracks.length / itemsPerPage));
  const displayedTracks = speedDialTracks.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const handleTrackClick = (track: Track) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }

    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      // Play clicked track and set the speed dial as queue
      play(track, speedDialTracks);
    }
  };

  const handleTouchStart = (track: Track) => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      openOptions(track, speedDialTracks);
    }, 550);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    openOptions(track, speedDialTracks);
  };

  if (speedDialTracks.length === 0) {
    return null;
  }

  return (
    <section className="mb-8 select-none" id="speed-dial-section">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Speed dial
          </h2>
          <span className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider bg-neutral-800/80 text-neutral-400 border border-white/10 px-2 py-0.5 rounded-full">
            <Flame className="w-3 h-3 text-amber-400" />
            <span>Top Repeats & Recent</span>
          </span>
        </div>

        {/* Page Nav Arrows if multiple pages */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="w-7 h-7 rounded-full bg-neutral-800/80 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="w-7 h-7 rounded-full bg-neutral-800/80 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 3x3 SQUARE GRID (9 ITEMS) */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`speed-dial-page-${currentPage}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="grid grid-cols-3 gap-2.5 sm:gap-3.5"
          >
            {displayedTracks.map((track) => {
              const isCurrent = currentTrack?.id === track.id;
              const isCurrentlyPlaying = isCurrent && isPlaying;

              return (
                <div
                  key={`speed-dial-${track.id}`}
                  onClick={() => handleTrackClick(track)}
                  onTouchStart={() => handleTouchStart(track)}
                  onTouchEnd={handleTouchEnd}
                  onContextMenu={(e) => handleContextMenu(e, track)}
                  className={`group aspect-square relative rounded-xl sm:rounded-2xl overflow-hidden bg-neutral-900 border transition-all duration-200 cursor-pointer select-none active:scale-[0.97] shadow-lg ${
                    isCurrent
                      ? 'border-green-500/80 ring-2 ring-green-500/40 shadow-green-950/40'
                      : 'border-white/10 hover:border-white/25 hover:shadow-xl'
                  }`}
                >
                  {/* FULL COVER ARTWORK */}
                  <img
                    src={track.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'}
                    alt={track.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* BOTTOM DARK GRADIENT FOR TITLE LEGIBILITY */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent flex flex-col justify-between p-2.5 sm:p-3 pointer-events-none">
                    {/* Top corner 3-dots trigger button */}
                    <div className="flex justify-end pointer-events-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openOptions(track, speedDialTracks);
                        }}
                        className="w-6 h-6 rounded-full bg-black/40 hover:bg-black/80 text-white/70 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-sm"
                        title="Song options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* OVERLAID SONG TITLE AT BOTTOM LEFT */}
                    <div className="pointer-events-auto">
                      <h3 className="text-white font-bold text-xs sm:text-sm leading-tight line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                        {track.title}
                      </h3>
                      {track.artist && (
                        <p className="text-[10px] text-neutral-300/80 truncate font-medium mt-0.5 hidden sm:block drop-shadow">
                          {track.artist}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ACTIVE PLAYING EQUALIZER ANIMATION (LIKE YOUTUBE MUSIC SCREENSHOT) */}
                  {isCurrentlyPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="flex items-end gap-1 h-6 px-2.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 shadow-xl">
                        <span className="w-1 bg-white rounded-full h-3 animate-[pulse_0.6s_ease-in-out_infinite]" />
                        <span className="w-1 bg-white rounded-full h-5 animate-[pulse_0.8s_ease-in-out_infinite_0.2s]" />
                        <span className="w-1 bg-white rounded-full h-2.5 animate-[pulse_0.5s_ease-in-out_infinite_0.1s]" />
                      </div>
                    </div>
                  )}

                  {/* HOVER PLAY BUTTON (DESKTOP) */}
                  {!isCurrentlyPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-green-500/90 text-black flex items-center justify-center shadow-2xl backdrop-blur-sm transform group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* PAGINATION DOTS (• • •) LIKE YOUTUBE MUSIC */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={`dot-${idx}`}
              onClick={() => setCurrentPage(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentPage === idx
                  ? 'w-5 bg-white'
                  : 'w-1.5 bg-neutral-600 hover:bg-neutral-400'
              }`}
              aria-label={`Go to page ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
