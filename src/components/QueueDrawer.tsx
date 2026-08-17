import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Play, 
  Pause, 
  Trash2, 
  Shuffle, 
  ChevronUp, 
  ChevronDown, 
  ListMusic, 
  Music, 
  Volume2, 
  Sparkles, 
  MoreHorizontal,
  History,
  Check
} from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSongOptionsStore } from '../store/useSongOptionsStore';
import { useToastStore } from '../store/useToastStore';
import { formatDuration } from '../lib/utils';
import { CrossfadeControl } from './CrossfadeControl';
import { Track } from '../types';

export function QueueDrawer() {
  const { 
    isQueueOpen, 
    setQueueOpen, 
    queue, 
    currentTrack, 
    isPlaying, 
    play, 
    togglePlay, 
    removeFromQueue, 
    moveQueueItem, 
    clearUpcomingQueue, 
    shuffleUpcomingQueue 
  } = usePlayerStore();

  const { openOptions } = useSongOptionsStore();
  const { showToast } = useToastStore();
  const [showHistory, setShowHistory] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isQueueOpen) {
        setQueueOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQueueOpen, setQueueOpen]);

  if (!isQueueOpen) return null;

  // Determine current track index in queue
  const currentIndex = currentTrack 
    ? queue.findIndex((t) => t.id === currentTrack.id) 
    : -1;

  const playedTracks = currentIndex > 0 ? queue.slice(0, currentIndex) : [];
  const upcomingTracks = currentIndex !== -1 ? queue.slice(currentIndex + 1) : queue;

  // Calculate upcoming total duration
  const totalUpcomingSeconds = upcomingTracks.reduce((acc, t) => {
    return acc + (t.durationMs ? t.durationMs / 1000 : 210);
  }, 0);

  const formatTotalTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs} hr ${mins % 60} min`;
    }
    return `${mins} min`;
  };

  const handlePlayFromQueue = (track: Track) => {
    play(track, queue);
  };

  const handleRemoveTrack = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    removeFromQueue(track.id);
    showToast(`Removed "${track.title}" from queue`);
  };

  const handleMoveUp = (e: React.MouseEvent, indexInUpcoming: number) => {
    e.stopPropagation();
    if (indexInUpcoming <= 0) return;
    const actualFrom = (currentIndex !== -1 ? currentIndex + 1 : 0) + indexInUpcoming;
    const actualTo = actualFrom - 1;
    moveQueueItem(actualFrom, actualTo);
  };

  const handleMoveDown = (e: React.MouseEvent, indexInUpcoming: number) => {
    e.stopPropagation();
    if (indexInUpcoming >= upcomingTracks.length - 1) return;
    const actualFrom = (currentIndex !== -1 ? currentIndex + 1 : 0) + indexInUpcoming;
    const actualTo = actualFrom + 1;
    moveQueueItem(actualFrom, actualTo);
  };

  const handleClearUpcoming = () => {
    clearUpcomingQueue();
    showToast('Upcoming queue cleared');
  };

  const handleShuffleUpcoming = () => {
    shuffleUpcomingQueue();
    showToast('Upcoming queue shuffled');
  };

  const handleOpenSongOptions = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    openOptions(track, queue);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={() => setQueueOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="relative w-full max-w-md bg-neutral-900 border-l border-white/10 shadow-2xl flex flex-col h-full z-10 select-none overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center border border-green-500/20">
                <ListMusic className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  Play Queue
                  {upcomingTracks.length > 0 && (
                    <span className="text-xs bg-neutral-800 text-neutral-300 font-mono px-2 py-0.5 rounded-full border border-neutral-700">
                      {upcomingTracks.length} next
                    </span>
                  )}
                </h2>
                <p className="text-xs text-neutral-400">
                  {upcomingTracks.length > 0 
                    ? `${upcomingTracks.length} songs • ${formatTotalTime(totalUpcomingSeconds)}`
                    : 'Manage playback order'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <CrossfadeControl variant="compact" />
              {upcomingTracks.length > 1 && (
                <button
                  onClick={handleShuffleUpcoming}
                  className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                  title="Shuffle upcoming songs"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setQueueOpen(false)}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                title="Close queue drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Queue Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-neutral-700">
            
            {/* Now Playing Section */}
            {currentTrack ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Now Playing
                  </span>
                </div>

                <div 
                  onClick={togglePlay}
                  className="group flex items-center gap-3.5 p-3 rounded-2xl bg-green-500/10 border border-green-500/30 hover:border-green-500/50 transition-all cursor-pointer shadow-lg shadow-green-500/5"
                >
                  <div className="relative w-13 h-13 rounded-xl overflow-hidden bg-neutral-800 shrink-0 shadow-md">
                    {currentTrack.coverUrl ? (
                      <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-500">
                        <Music className="w-6 h-6" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {isPlaying ? (
                        <Pause className="w-5 h-5 text-white fill-white" />
                      ) : (
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate group-hover:text-green-400 transition-colors">
                      {currentTrack.title}
                    </h4>
                    <p className="text-xs text-neutral-300 truncate mt-0.5 font-medium">
                      {currentTrack.artist}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {isPlaying && (
                        <div className="flex items-end gap-0.5 h-3">
                          <motion.div animate={{ height: ['20%', '100%', '30%'] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-0.5 bg-green-400 rounded-full" />
                          <motion.div animate={{ height: ['60%', '20%', '90%'] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-0.5 bg-green-400 rounded-full" />
                          <motion.div animate={{ height: ['30%', '90%', '20%'] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-0.5 bg-green-400 rounded-full" />
                        </div>
                      )}
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {currentTrack.durationMs ? formatDuration(currentTrack.durationMs) : '3:30'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleOpenSongOptions(e, currentTrack)}
                    className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                    title="Track options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-neutral-800/40 border border-neutral-800 text-center">
                <Music className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                <p className="text-xs text-neutral-400">No track currently playing</p>
              </div>
            )}

            {/* Next in Queue Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Next In Queue ({upcomingTracks.length})
                </span>
                {upcomingTracks.length > 0 && (
                  <button
                    onClick={handleClearUpcoming}
                    className="text-xs text-neutral-400 hover:text-red-400 transition-colors font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {upcomingTracks.length > 0 ? (
                <div className="space-y-1.5">
                  {upcomingTracks.map((track, i) => (
                    <motion.div
                      key={`${track.id}-${i}`}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => handlePlayFromQueue(track)}
                      className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-neutral-800/30 hover:bg-neutral-800/80 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                    >
                      {/* Reorder Buttons (Up / Down) */}
                      <div className="flex flex-col items-center justify-center shrink-0 text-neutral-500 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleMoveUp(e, i)}
                          disabled={i === 0}
                          className={`p-0.5 rounded hover:bg-neutral-700 transition-colors ${
                            i === 0 ? 'opacity-20 cursor-not-allowed' : 'hover:text-white'
                          }`}
                          title="Move up in queue"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono text-neutral-400 leading-none my-0.5">
                          {i + 1}
                        </span>
                        <button
                          onClick={(e) => handleMoveDown(e, i)}
                          disabled={i === upcomingTracks.length - 1}
                          className={`p-0.5 rounded hover:bg-neutral-700 transition-colors ${
                            i === upcomingTracks.length - 1 ? 'opacity-20 cursor-not-allowed' : 'hover:text-white'
                          }`}
                          title="Move down in queue"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Song Image */}
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-800 shrink-0">
                        {track.coverUrl ? (
                          <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-500">
                            <Music className="w-4 h-4" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-green-400 transition-colors">
                          {track.title}
                        </h5>
                        <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                          {track.artist}
                        </p>
                      </div>

                      {/* Track Duration & Quick Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-neutral-500 font-mono mr-1 hidden sm:inline">
                          {track.durationMs ? formatDuration(track.durationMs) : '3:30'}
                        </span>
                        
                        <button
                          onClick={(e) => handleOpenSongOptions(e, track)}
                          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="More options"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => handleRemoveTrack(e, track)}
                          className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-neutral-700 transition-colors"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-10 px-4 rounded-2xl bg-neutral-800/20 border border-dashed border-neutral-800 text-center space-y-2">
                  <Sparkles className="w-8 h-8 text-neutral-600 mx-auto" />
                  <h4 className="text-sm font-bold text-neutral-300">Your queue is empty</h4>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                    Search or browse songs and tap "Play Next" or "Add to Queue" from the song menu.
                  </p>
                </div>
              )}
            </div>

            {/* Previously Played History Section (Collapsible) */}
            {playedTracks.length > 0 && (
              <div className="border-t border-neutral-800/80 pt-4 space-y-2">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase tracking-wider hover:text-neutral-200 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    Previously Played ({playedTracks.length})
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                </button>

                {showHistory && (
                  <div className="space-y-1.5 pt-1">
                    {playedTracks.map((track, i) => (
                      <div
                        key={`history-${track.id}-${i}`}
                        onClick={() => handlePlayFromQueue(track)}
                        className="group flex items-center gap-3 p-2 rounded-xl bg-neutral-800/20 hover:bg-neutral-800/60 transition-all cursor-pointer opacity-75 hover:opacity-100"
                      >
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-neutral-800 shrink-0">
                          {track.coverUrl ? (
                            <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                          ) : (
                            <Music className="w-3.5 h-3.5 text-neutral-500 m-auto" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-semibold text-neutral-300 group-hover:text-white truncate">
                            {track.title}
                          </h5>
                          <p className="text-[10px] text-neutral-500 truncate">
                            {track.artist}
                          </p>
                        </div>
                        <Play className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Bottom Footer Info */}
          <div className="p-3 bg-neutral-950/80 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 shrink-0">
            <span>Tap any track to jump directly</span>
            <button
              onClick={() => setQueueOpen(false)}
              className="font-semibold text-green-400 hover:text-green-300"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
