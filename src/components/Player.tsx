import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Mic2, ListMusic, Heart, Maximize2, Tv, WifiOff, Download, Waves, Activity } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useToastStore } from '../store/useToastStore';
import { LyricsModal } from './LyricsModal';
import { CrossfadeControl } from './CrossfadeControl';
import { AudioVisualizer } from './AudioVisualizer';
import { audioVisualizer } from '../lib/audioVisualizer';
import { cacheTrackAudio, getCachedTrackAudio, isTrackCached } from "../lib/offlineStorage";
import { ProgressBar } from './ProgressBar';
import { formatTime, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

export function Player() {
  const { 
    currentTrack, 
    isPlaying, 
    volume, 
    progress, 
    duration,
    seekTime,
    crossfadeDuration,
    isCrossfadeEnabled,
    isCrossfading,
    togglePlay, 
    setIsPlaying,
    next, 
    prev, 
    setVolume, 
    setProgress,
    setDuration,
    setSeekTime,
    setNowPlayingOpen,
    isQueueOpen,
    toggleQueue,
    setIsCrossfading,
    setCrossfadeProgress,
    queue
  } = usePlayerStore();
  
  const { isLiked, toggleLike, addRecentTrack } = useLibraryStore();
  const { showToast } = useToastStore();
  const [showLyrics, setShowLyrics] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [cachedAudioData, setCachedAudioData] = useState<string | null>(null);
  
  // Dual-channel HTML5 audio elements for seamless crossfading
  const primaryAudioRef = useRef<HTMLAudioElement | null>(null);
  const secondaryAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeChannelRef = useRef<'primary' | 'secondary'>('primary');
  const isPerformingCrossfadeRef = useRef(false);
  const crossfadeTargetTrackIdRef = useRef<string | null>(null);

  const ytPlayerRef = useRef<any>(null);
  const [ytReady, setYtReady] = useState(false);
  const isTransitioningRef = useRef(false);

  // Helper to get the active and inactive audio elements
  const getAudioElements = useCallback(() => {
    const active = activeChannelRef.current === 'primary' ? primaryAudioRef.current : secondaryAudioRef.current;
    const inactive = activeChannelRef.current === 'primary' ? secondaryAudioRef.current : primaryAudioRef.current;
    return { active, inactive };
  }, []);

  useEffect(() => {
    if (primaryAudioRef.current) {
      audioVisualizer.registerAudioElement(primaryAudioRef.current);
    }
    if (secondaryAudioRef.current) {
      audioVisualizer.registerAudioElement(secondaryAudioRef.current);
    }
  }, []);

  useEffect(() => {
    if (currentTrack) {
      addRecentTrack(currentTrack);
      // Check offline cache for current track
      const cached = getCachedTrackAudio(currentTrack.id);
      setCachedAudioData(cached);
    }
  }, [currentTrack?.id, addRecentTrack]);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      if (isPlaying) {
        setIsPlaying(false);
        showToast('Connection lost. Playback paused.');
      }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isPlaying, setIsPlaying, showToast]);

  // Load YouTube IFrame API script once
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setYtReady(true);
      };
    } else {
      setYtReady(true);
    }
  }, []);

  // Initialize or update YouTube Player when track changes
  useEffect(() => {
    if (!currentTrack?.youtubeId || !ytReady) return;

    isTransitioningRef.current = true;

    if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
      try {
        ytPlayerRef.current.loadVideoById({
          videoId: currentTrack.youtubeId,
          startSeconds: 0,
        });

        // Smooth fade-in for YouTube track
        if (isCrossfadeEnabled && crossfadeDuration > 0) {
          ytPlayerRef.current.setVolume(0);
          let currentFadeVol = 0;
          const targetVol = volume * 100;
          const fadeSteps = 10;
          const stepTime = 600 / fadeSteps;
          const volIncrement = targetVol / fadeSteps;

          const fadeInInterval = setInterval(() => {
            currentFadeVol = Math.min(targetVol, currentFadeVol + volIncrement);
            if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
              ytPlayerRef.current.setVolume(Math.round(currentFadeVol));
            }
            if (currentFadeVol >= targetVol) {
              clearInterval(fadeInInterval);
            }
          }, stepTime);
        } else {
          ytPlayerRef.current.setVolume(volume * 100);
        }

        if (isPlaying && !isOffline) {
          ytPlayerRef.current.playVideo();
        }
      } catch (e) {
        console.warn('YT Load error:', e);
      } finally {
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 800);
      }
    } else if (window.YT && window.YT.Player) {
      try {
        ytPlayerRef.current = new window.YT.Player('yt-player-hidden', {
          height: '1',
          width: '1',
          videoId: currentTrack.youtubeId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            start: 0,
          },
          events: {
            onReady: (event: any) => {
              event.target.setVolume(volume * 100);
              if (isPlaying && !isOffline) {
                event.target.playVideo();
              }
              isTransitioningRef.current = false;
            },
            onStateChange: (event: any) => {
              if (window.YT && event.data === window.YT.PlayerState.ENDED) {
                handleTrackEnd();
              } else if (window.YT && event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
              }
            },
            onError: (err: any) => {
              console.warn('YouTube playback notice, switching to fallback stream', err);
            }
          },
        });
      } catch (e) {
        console.warn('YT Player Init error:', e);
      }
    }
  }, [currentTrack?.youtubeId, ytReady]);

  // Sync volume for both HTML5 audio & YouTube
  useEffect(() => {
    const { active, inactive } = getAudioElements();
    if (active && !isPerformingCrossfadeRef.current) {
      active.volume = volume;
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function' && !isPerformingCrossfadeRef.current) {
      ytPlayerRef.current.setVolume(volume * 100);
    }
  }, [volume, getAudioElements]);

  // HTML5 audio track update & playback trigger on primary/active channel
  useEffect(() => {
    if (!currentTrack?.youtubeId) {
      const { active, inactive } = getAudioElements();
      
      // If we just completed a crossfade into this track, the active element is already playing it
      if (crossfadeTargetTrackIdRef.current === currentTrack?.id && active) {
        // Reset crossfade flags
        isPerformingCrossfadeRef.current = false;
        crossfadeTargetTrackIdRef.current = null;
        setIsCrossfading(false);
        setCrossfadeProgress(0);
        active.volume = volume;
        if (inactive) {
          inactive.pause();
          inactive.currentTime = 0;
          inactive.volume = 0;
        }
        return;
      }

      // Standard new track start
      if (active) {
        const audioSrc = (isOffline && cachedAudioData) ? cachedAudioData : currentTrack?.audioUrl;
        if (audioSrc && active.src !== audioSrc) {
          active.src = audioSrc;
        }
        active.currentTime = 0;
        active.volume = volume;
        if (isPlaying && !isOffline) {
          active.play().catch(() => {});
        }
      }
      if (inactive) {
        inactive.pause();
        inactive.currentTime = 0;
        inactive.volume = 0;
      }
      isPerformingCrossfadeRef.current = false;
      crossfadeTargetTrackIdRef.current = null;
      setIsCrossfading(false);
      setCrossfadeProgress(0);
    }
  }, [currentTrack?.id, cachedAudioData, isOffline]);

  // Sync seekTime from store (scrubbing slider or lyrics click)
  useEffect(() => {
    if (seekTime !== null) {
      if (currentTrack?.youtubeId && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(seekTime, true);
      } else {
        const { active } = getAudioElements();
        if (active) {
          active.currentTime = seekTime;
        }
      }
      // If user seeks, cancel active crossfade and restore full volume
      if (isPerformingCrossfadeRef.current) {
        const { active, inactive } = getAudioElements();
        if (active) active.volume = volume;
        if (inactive) {
          inactive.pause();
          inactive.currentTime = 0;
          inactive.volume = 0;
        }
        isPerformingCrossfadeRef.current = false;
        crossfadeTargetTrackIdRef.current = null;
        setIsCrossfading(false);
        setCrossfadeProgress(0);
      }
      setSeekTime(null);
    }
  }, [seekTime, currentTrack, setSeekTime, volume, getAudioElements, setIsCrossfading, setCrossfadeProgress]);

  // Media Session API & Screen Wake Lock for uninterrupted background and screen-off playback
  const wakeLockRef = useRef<any>(null);

  // Request screen wake lock while music is actively playing so device won't forcefully kill audio
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isPlaying && document.visibilityState === 'visible') {
        try {
          if (!wakeLockRef.current) {
            wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
            wakeLockRef.current.addEventListener('release', () => {
              wakeLockRef.current = null;
            });
          }
        } catch {
          // Wake lock request may fail or be rejected in certain battery saver modes
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch {
          // ignore
        }
        wakeLockRef.current = null;
      }
    };

    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // Re-acquire wake lock if tab visibility changes back while still playing
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying]);

  // Comprehensive Media Session API registration for Lock Screen, Notifications & Minimization
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album || 'Indian Hits',
          artwork: [
            { src: currentTrack.coverUrl, sizes: '96x96', type: 'image/jpeg' },
            { src: currentTrack.coverUrl, sizes: '128x128', type: 'image/jpeg' },
            { src: currentTrack.coverUrl, sizes: '192x192', type: 'image/jpeg' },
            { src: currentTrack.coverUrl, sizes: '256x256', type: 'image/jpeg' },
            { src: currentTrack.coverUrl, sizes: '384x384', type: 'image/jpeg' },
            { src: currentTrack.coverUrl, sizes: '512x512', type: 'image/jpeg' }
          ]
        });

        navigator.mediaSession.setActionHandler('play', () => {
          setIsPlaying(true);
        });

        navigator.mediaSession.setActionHandler('pause', () => {
          setIsPlaying(false);
        });

        navigator.mediaSession.setActionHandler('previoustrack', () => {
          prev();
        });

        navigator.mediaSession.setActionHandler('nexttrack', () => {
          handleTrackEnd();
        });

        // Seek forward / backward handlers
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          const skipTime = details.seekOffset || 10;
          const newTime = Math.min(duration || 300, progress + skipTime);
          handleSeekTime(newTime);
        });

        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          const skipTime = details.seekOffset || 10;
          const newTime = Math.max(0, progress - skipTime);
          handleSeekTime(newTime);
        });

        // Exact seek / scrubber handler on lock screen / system notifications
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined && details.seekTime !== null) {
            handleSeekTime(details.seekTime);
          }
        });

        // Stop handler
        navigator.mediaSession.setActionHandler('stop', () => {
          setIsPlaying(false);
        });
      } catch (err) {
        console.warn('MediaSession handler configuration warning:', err);
      }
    }
  }, [currentTrack, setIsPlaying, prev, duration, progress]);

  // Synchronize playbackState with browser MediaSession
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Synchronize playback position with browser MediaSession for lock screen timebar
  useEffect(() => {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(1, duration),
          playbackRate: isPlaying ? 1 : 0,
          position: Math.min(duration, Math.max(0, progress))
        });
      } catch {
        // ignore occasional boundary position update slips
      }
    }
  }, [progress, duration, isPlaying]);

  // Handle Play/Pause toggle
  useEffect(() => {
    if (isOffline && isPlaying) {
      setIsPlaying(false);
      return;
    }

    if (currentTrack?.youtubeId && ytPlayerRef.current) {
      if (isPlaying && typeof ytPlayerRef.current.playVideo === 'function') {
        ytPlayerRef.current.playVideo();
      } else if (!isPlaying && typeof ytPlayerRef.current.pauseVideo === 'function') {
        ytPlayerRef.current.pauseVideo();
      }
    } else {
      const { active } = getAudioElements();
      if (active) {
        if (isPlaying) {
          active.play().catch(() => {});
        } else {
          active.pause();
        }
      }
    }
  }, [isPlaying, currentTrack, isOffline, setIsPlaying, getAudioElements]);

  // Crossfade check and step handler
  const processCrossfade = useCallback((currTime: number, dur: number) => {
    if (!isCrossfadeEnabled || crossfadeDuration <= 0 || !currentTrack) return;
    
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex === -1 || currentIndex >= queue.length - 1) return;

    const nextTrack = queue[currentIndex + 1];
    const effectiveFadeDuration = Math.min(crossfadeDuration, Math.max(1, dur * 0.45));
    const timeLeft = dur - currTime;

    // Crossfade trigger window
    if (timeLeft <= effectiveFadeDuration && timeLeft > 0) {
      const fadeProgress = 1 - Math.max(0, Math.min(1, timeLeft / effectiveFadeDuration));
      
      // If using HTML5 audio
      if (!currentTrack.youtubeId) {
        const { active, inactive } = getAudioElements();
        
        // Start playing the incoming track on the inactive channel
        if (!isPerformingCrossfadeRef.current && inactive) {
          isPerformingCrossfadeRef.current = true;
          crossfadeTargetTrackIdRef.current = nextTrack.id;
          setIsCrossfading(true);

          const nextAudioSrc = (isOffline && getCachedTrackAudio(nextTrack.id)) || nextTrack.audioUrl;
          if (nextAudioSrc) {
            inactive.src = nextAudioSrc;
            inactive.currentTime = 0;
            inactive.volume = 0;
            if (isPlaying && !isOffline) {
              inactive.play().catch(() => {});
            }
          }
        }

        // Modulate volume curves smoothly
        if (active && inactive) {
          const outVol = Math.max(0, Math.min(1, volume * (1 - fadeProgress)));
          const inVol = Math.max(0, Math.min(1, volume * fadeProgress));
          active.volume = outVol;
          inactive.volume = inVol;
          setCrossfadeProgress(fadeProgress);
        }
      } 
      // If using YouTube player
      else if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
        if (!isPerformingCrossfadeRef.current) {
          isPerformingCrossfadeRef.current = true;
          setIsCrossfading(true);
        }
        const outVol = Math.max(0, Math.min(100, Math.round(volume * 100 * (1 - fadeProgress))));
        ytPlayerRef.current.setVolume(outVol);
        setCrossfadeProgress(fadeProgress);
      }

      // Finish crossfade when time runs out
      if (timeLeft <= 0.12) {
        finalizeCrossfadeTransition();
      }
    }
  }, [isCrossfadeEnabled, crossfadeDuration, currentTrack, queue, volume, isPlaying, isOffline, getAudioElements, setIsCrossfading, setCrossfadeProgress]);

  // Finalize crossfade and shift to next track
  const finalizeCrossfadeTransition = useCallback(() => {
    if (!currentTrack?.youtubeId) {
      // Swap active audio channel
      activeChannelRef.current = activeChannelRef.current === 'primary' ? 'secondary' : 'primary';
    }
    isPerformingCrossfadeRef.current = false;
    setIsCrossfading(false);
    setCrossfadeProgress(0);
    next();
  }, [currentTrack?.youtubeId, next, setIsCrossfading, setCrossfadeProgress]);

  // High-frequency progress polling for sub-second precision on both YouTube & HTML5 Audio
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        if (currentTrack?.youtubeId) {
          if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
            const curr = ytPlayerRef.current.getCurrentTime() || 0;
            const dur = ytPlayerRef.current.getDuration() || (currentTrack.durationMs ? currentTrack.durationMs / 1000 : 210);
            if (curr >= 0) {
              setProgress(curr);
            }
            if (dur > 0) {
              setDuration(dur);
            }
            processCrossfade(curr, dur);
          }
        } else {
          const { active } = getAudioElements();
          if (active && !active.paused) {
            setProgress(active.currentTime);
            processCrossfade(active.currentTime, active.duration || (currentTrack?.durationMs ? currentTrack.durationMs / 1000 : 210));
          }
        }
      }, 50);
    } else if (!currentTrack?.youtubeId && currentTrack?.durationMs) {
      setDuration(currentTrack.durationMs / 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, setProgress, setDuration, processCrossfade, getAudioElements]);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    const { active } = getAudioElements();
    if (audio === active) {
      setProgress(audio.currentTime);
      processCrossfade(audio.currentTime, audio.duration || (currentTrack?.durationMs ? currentTrack.durationMs / 1000 : 210));
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    const { active } = getAudioElements();
    if (audio === active && audio.duration) {
      setDuration(audio.duration);
    }
  };

  const handleSeekTime = (newTime: number) => {
    setProgress(newTime);
    if (currentTrack?.youtubeId && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(newTime, true);
    } else {
      const { active } = getAudioElements();
      if (active) {
        active.currentTime = newTime;
      }
    }
  };

  const handleTrackEnd = () => {
    if (isPerformingCrossfadeRef.current) {
      finalizeCrossfadeTransition();
    } else {
      next();
    }
  };

  const handlePlayPauseClick = () => {
    if (isOffline && !isPlaying) {
      showToast('Offline Mode: Playback unavailable');
      return;
    }
    togglePlay();
  };

  if (!currentTrack) return null;

  const liked = isLiked(currentTrack.id);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isAdded = toggleLike(currentTrack);
    showToast(isAdded ? 'Added to Liked Songs' : 'Removed from Liked Songs');
  };

  return (
    <>
      {/* Hidden YouTube IFrame Player Element & Audio Elements (Always active) */}
      <div className="fixed -top-[9999px] -left-[9999px] w-1 h-1 pointer-events-none opacity-0 overflow-hidden">
        <div id="yt-player-hidden" />
      </div>

      {/* Dual HTML5 Audio Elements for Seamless Crossfading */}
      <audio
        ref={primaryAudioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleTrackEnd}
        preload="auto"
      />
      <audio
        ref={secondaryAudioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleTrackEnd}
        preload="auto"
      />

      {/* MOBILE MINI PLAYER STRIP (Positioned directly above Home, Search, Library) */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="md:hidden mx-2 mb-1.5 rounded-xl bg-neutral-900/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden shrink-0 select-none z-30"
      >
        <div 
          onClick={() => setNowPlayingOpen(true)}
          className="h-14 px-3 flex items-center justify-between gap-2.5 cursor-pointer active:bg-neutral-800/60 transition-colors relative"
        >
          {/* Left: Album cover + Song & Artist info */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {currentTrack.coverUrl && (
              <div className="relative w-10 h-10 rounded-lg overflow-hidden shadow-md shrink-0 border border-white/10 bg-neutral-800">
                <img 
                  src={currentTrack.coverUrl} 
                  alt={currentTrack.title} 
                  className="w-full h-full object-cover" 
                />
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-white text-xs sm:text-sm font-bold truncate leading-tight">
                  {currentTrack.title}
                </span>
                {currentTrack.isFullLength && !isOffline && (
                  <span className="text-[9px] font-black bg-green-500/20 text-green-400 border border-green-500/30 px-1 py-0.2 rounded uppercase shrink-0">
                    FULL
                  </span>
                )}
              </div>
              <div className="text-neutral-400 text-[11px] truncate flex items-center gap-1">
                <span>{currentTrack.artist}</span>
                {isPlaying && (
                  <span className="inline-flex items-center gap-0.5 text-green-400 font-medium">
                    • <AudioVisualizer variant="compact" />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Quick action buttons */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <motion.button 
              whileTap={{ scale: 0.85 }}
              onClick={handleLike} 
              className="p-2 text-neutral-400 hover:text-white focus:outline-none"
              title={liked ? "Unlike" : "Like"}
            >
              <Heart className={cn("w-4 h-4 transition-colors", liked ? "fill-green-500 text-green-500" : "text-neutral-400")} />
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={handlePlayPauseClick}
              className={cn(
                "w-9 h-9 rounded-full bg-white text-black flex items-center justify-center transition-all shadow-md active:scale-95 ml-0.5",
                isOffline && !cachedAudioData && currentTrack?.youtubeId ? "opacity-50 cursor-not-allowed" : "hover:bg-neutral-200"
              )}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.85 }}
              onClick={handleTrackEnd} 
              className="p-2 text-neutral-400 hover:text-white transition-colors"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </motion.button>
          </div>

          {/* Ultra-thin Real-Time Progress Bar on Bottom Border */}
          <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/10 overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all duration-150"
              style={{ 
                width: `${Math.min(100, Math.max(0, ((progress || 0) / (duration || 210)) * 100))}%` 
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* DESKTOP PLAYER BAR (Full 3-Column Layout for Tablet/Desktop) */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="hidden md:flex h-24 bg-neutral-900/98 backdrop-blur-xl border-t border-neutral-800 items-center justify-between px-4 sm:px-6 sticky bottom-0 z-40 select-none shadow-2xl"
      >
        {/* Left: Track Info with Full Song Name display */}
        <div 
          onClick={() => setNowPlayingOpen(true)}
          className="w-[38%] md:w-[32%] flex items-center gap-3 cursor-pointer group pr-2"
          title={`Click to open full player view - ${currentTrack.title}`}
        >
          {currentTrack.coverUrl && (
            <div className="relative w-14 h-14 rounded-lg overflow-hidden shadow-md shrink-0 border border-white/10 bg-neutral-800">
              <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Maximize2 className="w-5 h-5 text-white" />
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="text-white text-sm font-bold group-hover:text-green-400 transition-colors flex items-center gap-1.5 min-w-0">
              <AnimatePresence>
                {isOffline && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-[9px] font-black bg-red-500/20 text-red-400 border border-red-500/30 px-1 py-0.5 rounded uppercase tracking-wider shrink-0 flex items-center gap-0.5"
                    title="You are offline"
                  >
                    <WifiOff className="w-2.5 h-2.5" /> Offline
                  </motion.span>
                )}
                {cachedAudioData && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-[9px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1 py-0.5 rounded uppercase tracking-wider shrink-0 flex items-center gap-0.5"
                    title="Cached for offline play"
                  >
                    <Download className="w-2.5 h-2.5" /> Cached
                  </motion.span>
                )}
                {isCrossfading && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-[9px] font-black bg-purple-500/30 text-purple-300 border border-purple-500/40 px-1 py-0.5 rounded uppercase tracking-wider shrink-0 flex items-center gap-1 animate-pulse"
                    title={`Crossfading (${crossfadeDuration}s)`}
                  >
                    <Waves className="w-2.5 h-2.5 animate-spin" /> Crossfade
                  </motion.span>
                )}
              </AnimatePresence>
              <span 
                className="line-clamp-1 leading-snug break-words" 
                title={currentTrack.title}
              >
                {currentTrack.title}
              </span>
              {currentTrack.isFullLength && !isOffline && (
                <span className="text-[10px] font-black bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 hidden lg:inline-block">
                  FULL
                </span>
              )}
            </div>
            <div 
              className="text-neutral-400 text-xs hover:underline line-clamp-1 mt-0.5"
              title={currentTrack.artist}
            >
              {currentTrack.artist}
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleLike} 
            className="hidden sm:block ml-1 focus:outline-none shrink-0" 
            title={liked ? "Unlike" : "Like"}
          >
            <Heart className={cn("w-4 h-4 transition-colors", liked ? "fill-green-500 text-green-500" : "text-neutral-400 hover:text-white")} />
          </motion.button>
        </div>

        {/* Center: Playback Controls */}
        <div className="w-[42%] md:w-[40%] flex flex-col items-center gap-1.5 max-w-[680px]">
          <div className="flex items-center gap-4 sm:gap-6">
            <button className="hidden sm:block text-neutral-400 hover:text-white transition-colors">
              <Shuffle className="w-4 h-4" />
            </button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={prev} className="text-neutral-400 hover:text-white transition-colors">
              <SkipBack className="w-5 h-5 fill-current" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlayPauseClick}
              className={cn(
                "w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95",
                isOffline && !cachedAudioData && currentTrack?.youtubeId ? "opacity-50 cursor-not-allowed" : "hover:bg-neutral-200"
              )}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleTrackEnd} className="text-neutral-400 hover:text-white transition-colors">
              <SkipForward className="w-5 h-5 fill-current" />
            </motion.button>
            <button className="hidden sm:block text-neutral-400 hover:text-white transition-colors">
              <Repeat className="w-4 h-4" />
            </button>
          </div>
          
          <div className="w-full flex items-center gap-2.5 text-xs text-neutral-400 font-mono">
            <span className="w-10 text-right shrink-0">{formatTime(progress)}</span>
            <div className="flex-1 flex items-center">
              <ProgressBar
                progress={progress}
                duration={duration || 210}
                onSeek={handleSeekTime}
                crossfadeDuration={isCrossfadeEnabled ? crossfadeDuration : 0}
                size="md"
                showHoverTime={true}
              />
            </div>
            <span className="w-10 text-left shrink-0">{formatTime(duration || 210)}</span>
          </div>
        </div>

        {/* Right: Extra Controls & Crossfade Selector */}
        <div className="w-[20%] md:w-[28%] flex items-center justify-end gap-2.5 sm:gap-3 text-neutral-400">
          <CrossfadeControl variant="compact" />

          {/* Real-time audio visualizer mini indicator */}
          {isPlaying && (
            <button
              onClick={() => setNowPlayingOpen(true)}
              title="Open Real-Time Visualizer"
              className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-full bg-neutral-800/80 hover:bg-neutral-700 border border-white/10 text-neutral-300 hover:text-green-400 transition-all cursor-pointer"
            >
              <AudioVisualizer variant="compact" />
            </button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setNowPlayingOpen(true)}
            title="Expand Full Player & Video"
            className="hidden xl:flex items-center gap-1.5 text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-white/10 px-3 py-1.5 rounded-full transition-all"
          >
            <Tv className="w-3.5 h-3.5 text-green-500" />
            <span className="hidden lg:inline">Open Player</span>
          </motion.button>
          
          <button
            onClick={() => setShowLyrics(true)}
            title="Lyrics"
            className="hover:text-white transition-colors focus:outline-none p-1"
          >
            <Mic2 className="w-4 h-4" />
          </button>
          
          {/* Queue Drawer Button */}
          <button
            onClick={toggleQueue}
            title="Open Queue"
            className={cn(
              "relative p-1.5 rounded-lg transition-colors focus:outline-none",
              isQueueOpen ? "text-green-400 bg-green-500/10" : "hover:text-white"
            )}
          >
            <ListMusic className="w-4 h-4" />
            {queue.length > 1 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 text-black text-[9px] font-black rounded-full flex items-center justify-center">
                {Math.min(queue.length - 1, 99)}
              </span>
            )}
          </button>

          <div className="hidden lg:flex items-center gap-2 w-24">
            <Volume2 className="w-4 h-4 hover:text-white cursor-pointer" />
            <input 
              type="range" 
              min={0} 
              max={1} 
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full h-1 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-white hover:accent-green-500"
            />
          </div>
        </div>
      </motion.div>

      <LyricsModal isOpen={showLyrics} onClose={() => setShowLyrics(false)} />
    </>
  );
}

