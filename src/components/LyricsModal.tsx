import { useEffect, useState, useRef } from 'react';
import { X, Mic2, Sparkles } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { fetchLyrics } from '../lib/api';
import { LyricLine } from '../types';

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LyricsModal({ isOpen, onClose }: LyricsModalProps) {
  const { currentTrack, progress, duration, seekTo } = usePlayerStore();
  const [lyricsData, setLyricsData] = useState<{ synced: boolean; lines: LyricLine[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncOffset, setSyncOffset] = useState<number>(0);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const modalScrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!currentTrack || !isOpen) return;

    setLoading(true);
    setLyricsData(null);
    setActiveIndex(-1);

    const trackDurationSec = duration || (currentTrack.durationMs ? currentTrack.durationMs / 1000 : 210);
    fetchLyrics(currentTrack.artist, currentTrack.title, trackDurationSec).then((data) => {
      setLyricsData(data);
      setLoading(false);
    });
  }, [currentTrack?.id, isOpen, duration]);

  // Find active line for synced lyrics with realtime alignment
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

      if (newIndex === -1 && effectiveTime >= 0 && lyricsData.lines.length > 0) {
        newIndex = 0;
      }

      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    }
  }, [progress, lyricsData, activeIndex, syncOffset]);

  // Scroll active line into view smoothly
  useEffect(() => {
    if (isOpen) {
      const container = modalScrollContainerRef.current;
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
  }, [activeIndex, isOpen]);

  if (!isOpen || !currentTrack) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col p-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Mic2 className="w-6 h-6 text-green-500" />
          <span className="text-white font-bold text-lg">Lyrics</span>
        </div>

        {/* Sync Calibration Controls */}
        <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded-full border border-white/10 text-xs">
          <span className="text-neutral-400 font-medium hidden sm:inline">Sync Adjust:</span>
          <button
            onClick={() => setSyncOffset((prev) => Math.max(-5, Math.round((prev - 0.5) * 10) / 10))}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white font-semibold transition-colors"
            title="Advance lyrics earlier (-0.5s)"
          >
            -0.5s
          </button>
          <button
            onClick={() => setSyncOffset(0)}
            className={`px-2 py-0.5 rounded font-bold transition-colors ${
              syncOffset !== 0 ? 'text-green-400 bg-green-500/10' : 'text-neutral-500'
            }`}
            title="Reset sync"
          >
            {syncOffset === 0 ? 'DEFAULT' : `${syncOffset > 0 ? '+' : ''}${syncOffset}s`}
          </button>
          <button
            onClick={() => setSyncOffset((prev) => Math.min(5, Math.round((prev + 0.5) * 10) / 10))}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white font-semibold transition-colors"
            title="Delay lyrics (+0.5s)"
          >
            +0.5s
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Lyrics View */}
      <div ref={modalScrollContainerRef} className="flex-1 overflow-y-auto flex flex-col items-center justify-start my-8 px-4 py-12 scrollbar-none relative">
        <div className="flex items-center gap-6 mb-12 max-w-xl w-full bg-neutral-900/60 p-4 rounded-2xl border border-white/5">
          <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-20 h-20 rounded-xl shadow-2xl shrink-0" />
          <div className="overflow-hidden">
            <h2 className="text-2xl font-bold text-white truncate">{currentTrack.title}</h2>
            <p className="text-neutral-400 font-medium truncate">{currentTrack.artist}</p>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400 gap-3">
            <Sparkles className="w-8 h-8 text-green-500 animate-spin" />
            <p className="text-sm font-medium">Fetching live lyrics...</p>
          </div>
        )}

        {!loading && !lyricsData && (
          <div className="text-center py-20 text-neutral-400 max-w-md">
            <p className="text-lg font-bold text-white mb-2">Couldn't load lyrics for this song</p>
            <p className="text-sm">Enjoy the audio preview or try playing another song!</p>
          </div>
        )}

        {!loading && lyricsData && (
          <div className="max-w-2xl w-full text-center space-y-6">
            {lyricsData.lines.map((line, index) => {
              const isActive = lyricsData.synced && index === activeIndex;
              return (
                <div
                  key={index}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => {
                    if (line.time !== undefined) {
                      seekTo(line.time);
                    }
                  }}
                  className={`transition-all duration-300 py-1 px-4 rounded-xl text-xl md:text-3xl font-bold tracking-tight ${lyricsData.synced ? 'cursor-pointer' : ''} ${
                    isActive
                      ? 'text-green-400 scale-105 drop-shadow-[0_0_12px_rgba(34,197,94,0.5)]'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {line.text}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
