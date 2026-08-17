import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Heart, 
  Volume2, 
  Mic2, 
  Music, 
  CheckCircle2,
  Sparkles,
  Radio,
  ListMusic,
  Trash2,
  ChevronUp,
  Waves,
  Activity,
  Sliders
} from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useToastStore } from '../store/useToastStore';
import { CrossfadeControl } from './CrossfadeControl';
import { AudioVisualizer } from './AudioVisualizer';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer';
import { fetchLyrics } from '../lib/api';
import { LyricLine } from '../types';
import { ProgressBar } from './ProgressBar';
import { formatTime, formatDuration, cn } from '../lib/utils';

export function NowPlayingInterface() {
  const { 
    currentTrack, 
    isPlaying, 
    progress, 
    duration, 
    volume,
    isNowPlayingOpen,
    crossfadeDuration,
    isCrossfadeEnabled,
    isCrossfading,
    togglePlay, 
    next, 
    prev, 
    setProgress, 
    seekTo,
    setVolume,
    setNowPlayingOpen,
    queue,
    play,
    removeFromQueue,
    moveQueueItem,
    clearUpcomingQueue,
    shuffleUpcomingQueue
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLibraryStore();
  const { showToast } = useToastStore();
  const visualizerData = useAudioVisualizer();

  const [lyricsData, setLyricsData] = useState<{ synced: boolean; lines: LyricLine[] } | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [activeTab, setActiveTab] = useState<'lyrics' | 'queue' | 'visualizer'>('lyrics');
  const [viewMode, setViewMode] = useState<'cover' | 'visualizer' | 'video'>('cover');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [syncOffset, setSyncOffset] = useState<number>(0);
  
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  // Fetch lyrics whenever current track changes
  useEffect(() => {
    if (!currentTrack || !isNowPlayingOpen) return;

    setLoadingLyrics(true);
    setLyricsData(null);
    setActiveIndex(-1);

    const trackDurationSec = duration || (currentTrack.durationMs ? currentTrack.durationMs / 1000 : 210);
    fetchLyrics(currentTrack.artist, currentTrack.title, trackDurationSec).then((data) => {
      setLyricsData(data);
      setLoadingLyrics(false);
    });
  }, [currentTrack?.id, isNowPlayingOpen, duration]);

  // Compute active lyric line with exact realtime alignment (removing artificial lag)
  useEffect(() => {
    if (lyricsData?.lines && lyricsData.lines.length > 0) {
      const effectiveTime = Math.max(0, progress + syncOffset);
      let newIndex = -1;

      for (let i = lyricsData.lines.length - 1; i >= 0; i--) {
        const lineTime = lyricsData.lines[i].time ?? 0;
        if (effectiveTime >= lineTime) {
          newIndex = i;
          break;
        }
      }

      // If at start before first line, highlight line 0
      if (newIndex === -1 && effectiveTime >= 0 && lyricsData.lines.length > 0) {
        newIndex = 0;
      }

      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    }
  }, [progress, lyricsData, activeIndex, syncOffset]);

  // Auto scroll lyrics into view when activeIndex changes with reliable container centering
  useEffect(() => {
    if (activeTab === 'lyrics') {
      const container = lyricsContainerRef.current;
      const activeEl = activeLineRef.current;
      if (container && activeEl) {
        const containerTop = container.offsetTop;
        const activeTop = activeEl.offsetTop;
        const targetScrollTop = activeTop - containerTop - container.clientHeight / 2 + activeEl.clientHeight / 2;
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth',
        });
      } else if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeIndex, activeTab]);

  if (!isNowPlayingOpen || !currentTrack) return null;

  const liked = isLiked(currentTrack.id);

  const handleLike = () => {
    const isAdded = toggleLike(currentTrack);
    showToast(isAdded ? 'Added to Liked Songs' : 'Removed from Liked Songs');
  };

  const handleSeek = (newTime: number) => {
    seekTo(newTime);
  };

  // Fallback procedural lyrics if API returns no lines
  const fallbackLyrics: LyricLine[] = [
    { text: `♪ ${currentTrack.title} ♪` },
    { text: `Performed by ${currentTrack.artist}` },
    { text: `Album: ${currentTrack.album}` },
    { text: '♪ ♪ ♪' },
    { text: 'Feel the rhythm, feel the flow' },
    { text: 'Let the music take control' },
    { text: 'Surround your mind with melody' },
    { text: 'Live performance streaming now' },
    { text: '♪ ♪ ♪' },
    { text: 'Thank you for listening on Spotify' },
  ];

  const displayedLyrics = lyricsData?.lines && lyricsData.lines.length > 0 ? lyricsData.lines : fallbackLyrics;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-3xl flex flex-col text-white overflow-hidden select-none"
      >
        {/* Dynamic Glowing Ambient Background */}
        <div className="absolute inset-0 pointer-events-none opacity-30 overflow-hidden">
          <img 
            src={currentTrack.coverUrl} 
            alt="Blur background" 
            className="w-full h-full object-cover filter blur-3xl scale-150 animate-pulse" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent" />
        </div>

        {/* Top Header Bar */}
        <div className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-white/10 bg-black/30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setNowPlayingOpen(false)}
              className="w-10 h-10 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-all hover:scale-105"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-1.5">
                <Radio className="w-3 h-3 animate-ping text-green-500" />
                PLAYING FULL LENGTH
              </span>
              <span className="text-sm font-bold text-white truncate max-w-xs">{currentTrack.album}</span>
            </div>
          </div>

          {/* Equalizer Visualizer & Video Toggle & Crossfade */}
          <div className="flex items-center gap-2 sm:gap-4">
            <CrossfadeControl variant="full" />
            <div className="flex items-center bg-neutral-800 p-1 rounded-full border border-white/10 text-xs font-bold">
              <button 
                onClick={() => setViewMode('cover')} 
                className={cn("px-2.5 sm:px-3 py-1 rounded-full transition-all", viewMode === 'cover' ? "bg-green-500 text-black shadow-md" : "text-neutral-400 hover:text-white")}
              >
                Cover
              </button>
              <button 
                onClick={() => setViewMode('visualizer')} 
                className={cn("px-2.5 sm:px-3 py-1 rounded-full transition-all flex items-center gap-1", viewMode === 'visualizer' ? "bg-green-500 text-black shadow-md" : "text-neutral-400 hover:text-white")}
              >
                <Activity className="w-3 h-3" />
                <span>Visualizer</span>
              </button>
              {currentTrack.youtubeId && (
                <button 
                  onClick={() => setViewMode('video')} 
                  className={cn("px-2.5 sm:px-3 py-1 rounded-full transition-all", viewMode === 'video' ? "bg-green-500 text-black shadow-md" : "text-neutral-400 hover:text-white")}
                >
                  Video
                </button>
              )}
            </div>
            {isPlaying && (
              <div className="hidden sm:flex items-center gap-1.5 bg-neutral-800/80 px-2.5 py-1.5 rounded-full border border-white/10">
                <AudioVisualizer variant="compact" />
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
              <Music className="w-4 h-4 text-green-500" />
              <span className="text-xs font-black tracking-wider text-green-400 uppercase">Ad-Free Stream</span>
            </div>
          </div>
        </div>

        {/* Main Grid Content Area */}
        <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 md:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
          
          {/* Left Column: Cover Art / Hero Visualizer / Video & Complete Playback Controls (7 Cols on desktop) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-5">
            {/* View Mode 1: Video */}
            {viewMode === 'video' && currentTrack.youtubeId ? (
              <div className="relative w-full max-w-xl aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${currentTrack.youtubeId}?autoplay=1&controls=1&modestbranding=1&rel=0`}
                  title={currentTrack.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : viewMode === 'visualizer' ? (
              /* View Mode 2: Hero Visualizer Canvas */
              <div className="w-full max-w-xl flex flex-col items-center justify-center">
                <AudioVisualizer variant="hero" showControls={true} />
              </div>
            ) : (
              /* View Mode 3: Dynamic Beat-Reactive Album Art */
              <div className="relative flex items-center justify-center">
                {/* Dynamic CSS Reactive Soundwave Ring */}
                {isPlaying && (
                  <div 
                    className="absolute inset-0 rounded-3xl border-2 border-green-500/40 pointer-events-none transition-transform duration-75 ease-out"
                    style={{
                      transform: `scale(${1.04 + visualizerData.bass * 0.12})`,
                      boxShadow: `0 0 ${15 + visualizerData.bass * 35}px rgba(34, 197, 94, ${0.2 + visualizerData.bass * 0.5})`
                    }}
                  />
                )}
                <motion.div 
                  animate={{ scale: isPlaying ? [1, 1.015, 1] : 1 }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10 group"
                  style={{
                    boxShadow: isPlaying && visualizerData.bass > 0.3 
                      ? `0 20px 60px rgba(0,0,0,0.8), 0 0 ${visualizerData.bass * 40}px rgba(34, 197, 94, 0.3)`
                      : undefined
                  }}
                >
                  <img 
                    src={currentTrack.coverUrl} 
                    alt={currentTrack.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              </div>
            )}

            {/* Track Info */}
            <div className="w-full flex items-center justify-between max-w-xl">
              <div className="flex flex-col min-w-0 pr-4">
                <h1 
                  className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-md break-words"
                  title={currentTrack.title}
                >
                  {currentTrack.title}
                </h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <span 
                    className="text-base sm:text-lg font-bold text-neutral-300 hover:text-green-400 cursor-pointer transition-colors"
                    title={currentTrack.artist}
                  >
                    {currentTrack.artist}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500 shrink-0" />
                </div>
              </div>

              <button 
                onClick={handleLike} 
                className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all hover:scale-110 shrink-0"
              >
                <Heart className={cn("w-6 h-6 transition-colors", liked ? "fill-green-500 text-green-500" : "text-neutral-400 hover:text-white")} />
              </button>
            </div>

            {/* Progress Slider */}
            <div className="w-full max-w-xl space-y-1.5">
              {isCrossfading && (
                <motion.div 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-1.5 py-1 px-3 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-xs font-bold animate-pulse mx-auto w-fit shadow-sm"
                >
                  <Waves className="w-3.5 h-3.5 animate-pulse text-purple-400" />
                  <span>Blending into next song ({crossfadeDuration}s crossfade)...</span>
                </motion.div>
              )}
              <ProgressBar
                progress={progress}
                duration={duration || 210}
                onSeek={handleSeek}
                crossfadeDuration={isCrossfadeEnabled ? crossfadeDuration : 0}
                size="lg"
                showHoverTime={true}
              />
              <div className="flex justify-between text-xs font-mono font-bold text-neutral-400">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration || 210)}</span>
              </div>
            </div>

            {/* Main Interactive Playback Buttons */}
            <div className="flex items-center justify-center gap-6 sm:gap-8 pt-2">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="text-neutral-400 hover:text-white transition-colors">
                <Shuffle className="w-5 h-5" />
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={prev}
                className="w-12 h-12 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors"
              >
                <SkipBack className="w-6 h-6 fill-current" />
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={togglePlay}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-500 hover:bg-green-400 text-black flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.3)] transition-colors"
              >
                {isPlaying ? <Pause className="w-8 h-8 fill-black" /> : <Play className="w-8 h-8 fill-black ml-1" />}
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={next}
                className="w-12 h-12 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors"
              >
                <SkipForward className="w-6 h-6 fill-current" />
              </motion.button>
              
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="text-neutral-400 hover:text-white transition-colors">
                <Repeat className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Volume Control Slider */}
            <div className="flex items-center gap-3 w-full max-w-xs pt-2 text-neutral-400">
              <Volume2 className="w-5 h-5" />
              <input 
                type="range" 
                min={0} 
                max={1} 
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-white hover:accent-green-500"
              />
            </div>
          </div>

          {/* Right Column: Live Synced Lyrics & Upcoming Queue (5 Cols on desktop) */}
          <div className="lg:col-span-5 flex flex-col bg-neutral-900/60 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-md h-[480px] lg:h-auto overflow-hidden">
            {/* Header with Switcher Tabs */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5 shrink-0">
              <div className="flex items-center bg-neutral-800/90 p-1 rounded-full border border-white/10 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('lyrics')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all",
                    activeTab === 'lyrics' 
                      ? "bg-green-500 text-black shadow-md" 
                      : "text-neutral-400 hover:text-white"
                  )}
                >
                  <Mic2 className="w-3.5 h-3.5" />
                  <span>Lyrics</span>
                </button>
                <button
                  onClick={() => setActiveTab('queue')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all",
                    activeTab === 'queue' 
                      ? "bg-green-500 text-black shadow-md" 
                      : "text-neutral-400 hover:text-white"
                  )}
                >
                  <ListMusic className="w-3.5 h-3.5" />
                  <span>Queue {queue.length > 1 ? `(${queue.length - 1})` : ''}</span>
                </button>
                <button
                  onClick={() => setActiveTab('visualizer')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all",
                    activeTab === 'visualizer' 
                      ? "bg-green-500 text-black shadow-md" 
                      : "text-neutral-400 hover:text-white"
                  )}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>EQ Studio</span>
                </button>
              </div>

              {activeTab === 'lyrics' && (
                <div className="flex items-center gap-1.5 text-xs">
                  {loadingLyrics ? (
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <Sparkles className="w-3.5 h-3.5 text-green-400 animate-spin" />
                      <span>Syncing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-neutral-800/80 px-2 py-0.5 rounded-full border border-white/5 text-[11px] font-semibold text-neutral-400">
                      <button
                        onClick={() => setSyncOffset((prev) => Math.max(-5, Math.round((prev - 0.5) * 10) / 10))}
                        className="px-1.5 hover:text-white hover:bg-white/10 rounded transition-colors"
                        title="Lyrics earlier (-0.5s)"
                      >
                        -0.5s
                      </button>
                      <button
                        onClick={() => setSyncOffset(0)}
                        className={cn(
                          "px-1 rounded transition-colors",
                          syncOffset !== 0 ? "text-green-400 font-bold hover:underline" : "text-neutral-500"
                        )}
                        title="Reset sync offset"
                      >
                        {syncOffset === 0 ? 'SYNC' : `${syncOffset > 0 ? '+' : ''}${syncOffset}s`}
                      </button>
                      <button
                        onClick={() => setSyncOffset((prev) => Math.min(5, Math.round((prev + 0.5) * 10) / 10))}
                        className="px-1.5 hover:text-white hover:bg-white/10 rounded transition-colors"
                        title="Lyrics later (+0.5s)"
                      >
                        +0.5s
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'queue' && queue.length > 2 && (
                <button
                  onClick={() => {
                    shuffleUpcomingQueue();
                    showToast('Shuffled upcoming queue');
                  }}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                  title="Shuffle upcoming"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Tab 1: Synced Lyrics */}
            {activeTab === 'lyrics' && (
              <div ref={lyricsContainerRef} className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-none text-left relative">
                {displayedLyrics.map((line, index) => {
                  const isActive = lyricsData?.synced ? index === activeIndex : false;
                  return (
                    <motion.div
                      key={index}
                      ref={isActive ? activeLineRef : null}
                      onClick={() => {
                        if (line.time !== undefined) {
                          seekTo(line.time);
                        }
                      }}
                      className={cn(
                        "transition-all duration-300 cursor-pointer font-extrabold text-xl sm:text-2xl leading-tight rounded-xl py-1 px-2",
                        isActive 
                          ? "text-green-400 scale-105 drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]" 
                          : "text-neutral-500 hover:text-neutral-200"
                      )}
                    >
                      {line.text}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Interactive Upcoming Queue */}
            {activeTab === 'queue' && (() => {
              const curIdx = currentTrack ? queue.findIndex((t) => t.id === currentTrack.id) : -1;
              const upcoming = curIdx !== -1 ? queue.slice(curIdx + 1) : queue;

              return (
                <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-neutral-700">
                  {upcoming.length > 0 ? (
                    upcoming.map((track, i) => {
                      const actualIdx = (curIdx !== -1 ? curIdx + 1 : 0) + i;
                      return (
                        <div
                          key={`${track.id}-${i}`}
                          onClick={() => play(track, queue)}
                          className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-neutral-800/40 hover:bg-neutral-800/90 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                        >
                          {/* Reorder Up/Down buttons */}
                          <div className="flex flex-col items-center justify-center shrink-0 text-neutral-500">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (i > 0) moveQueueItem(actualIdx, actualIdx - 1);
                              }}
                              disabled={i === 0}
                              className={cn(
                                "p-0.5 rounded hover:bg-neutral-700 hover:text-white transition-colors",
                                i === 0 && "opacity-20 cursor-not-allowed"
                              )}
                              title="Move up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-mono text-neutral-400 leading-none my-0.5">
                              {i + 1}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (i < upcoming.length - 1) moveQueueItem(actualIdx, actualIdx + 1);
                              }}
                              disabled={i === upcoming.length - 1}
                              className={cn(
                                "p-0.5 rounded hover:bg-neutral-700 hover:text-white transition-colors",
                                i === upcoming.length - 1 && "opacity-20 cursor-not-allowed"
                              )}
                              title="Move down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Cover */}
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-800 shrink-0 relative">
                            {track.coverUrl ? (
                              <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                            ) : (
                              <Music className="w-4 h-4 text-neutral-500 m-auto" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-white truncate group-hover:text-green-400 transition-colors">
                              {track.title}
                            </h5>
                            <p className="text-[11px] text-neutral-400 truncate">
                              {track.artist}
                            </p>
                          </div>

                          {/* Duration & Remove */}
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-neutral-500 font-mono">
                              {track.durationMs ? formatDuration(track.durationMs) : '3:30'}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromQueue(track.id);
                                showToast(`Removed "${track.title}" from queue`);
                              }}
                              className="p-1 text-neutral-400 hover:text-red-400 rounded hover:bg-neutral-700 transition-colors"
                              title="Remove from queue"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 px-4 rounded-2xl bg-neutral-800/20 border border-dashed border-neutral-800 text-center space-y-2">
                      <ListMusic className="w-8 h-8 text-neutral-600 mx-auto" />
                      <h4 className="text-sm font-bold text-neutral-300">No upcoming songs</h4>
                      <p className="text-xs text-neutral-500">
                        Add songs from Search or Home to queue them up next.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Tab 3: Studio Equalizer & Frequency Visualizer */}
            {activeTab === 'visualizer' && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                <AudioVisualizer variant="panel" showControls={true} />
              </div>
            )}
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
