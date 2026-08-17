import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SlidersHorizontal, Sparkles, Check, Play, Volume2, Waves } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useToastStore } from '../store/useToastStore';
import { cn } from '../lib/utils';

interface CrossfadeControlProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function CrossfadeControl({ variant = 'compact', className }: CrossfadeControlProps) {
  const {
    crossfadeDuration,
    isCrossfadeEnabled,
    isCrossfading,
    setCrossfadeDuration,
    setCrossfadeEnabled,
  } = usePlayerStore();

  const { showToast } = useToastStore();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const demoAudioContextRef = useRef<AudioContext | null>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Clean up demo audio if open changes
  useEffect(() => {
    return () => {
      if (demoAudioContextRef.current) {
        demoAudioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const getLabelForSeconds = (sec: number) => {
    if (sec === 0) return 'Off';
    if (sec <= 2) return 'Quick Blend';
    if (sec <= 5) return 'Smooth (Default)';
    if (sec <= 8) return 'DJ Mix';
    return 'Atmospheric Overlap';
  };

  const handlePresetClick = (sec: number) => {
    setCrossfadeDuration(sec);
    if (!isCrossfadeEnabled) {
      setCrossfadeEnabled(true);
    }
    showToast(`Crossfade set to ${sec}s (${getLabelForSeconds(sec)})`);
  };

  // Micro synthesized crossfade preview audio
  const handlePlayDemoCrossfade = () => {
    if (isDemoPlaying) return;
    setIsDemoPlaying(true);
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      demoAudioContextRef.current = ctx;

      const now = ctx.currentTime;
      const fadeSec = Math.max(1, Math.min(crossfadeDuration, 4));

      // Synth 1: Outgoing track chord (fading out)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(329.63, now); // E4
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.linearRampToValueAtTime(0, now + fadeSec);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + fadeSec);

      // Synth 2: Incoming track chord (fading in)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(440, now); // A4
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.2, now + fadeSec);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + fadeSec + 0.5);

      setTimeout(() => {
        setIsDemoPlaying(false);
      }, (fadeSec + 0.5) * 1000);
    } catch (e) {
      setIsDemoPlaying(false);
    }
  };

  return (
    <div className={cn("relative inline-block", className)} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={`Crossfade: ${isCrossfadeEnabled && crossfadeDuration > 0 ? `${crossfadeDuration}s` : 'Off'}`}
        className={cn(
          "relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all focus:outline-none select-none",
          isCrossfading
            ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse shadow-[0_0_12px_rgba(168,85,247,0.3)]"
            : isCrossfadeEnabled && crossfadeDuration > 0
            ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-white/10 hover:border-purple-500/40"
            : "bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 border border-transparent"
        )}
      >
        <SlidersHorizontal className={cn("w-3.5 h-3.5", isCrossfadeEnabled && crossfadeDuration > 0 ? "text-purple-400" : "text-neutral-400")} />
        
        {variant === 'full' ? (
          <span className="flex items-center gap-1">
            <span>Crossfade</span>
            <span className={cn("text-[10px] px-1 py-0.2 rounded font-mono font-bold", isCrossfadeEnabled && crossfadeDuration > 0 ? "bg-purple-500/20 text-purple-300" : "bg-neutral-700 text-neutral-400")}>
              {isCrossfadeEnabled && crossfadeDuration > 0 ? `${crossfadeDuration}s` : 'Off'}
            </span>
          </span>
        ) : (
          <span className="hidden xl:inline text-[11px] font-mono">
            {isCrossfadeEnabled && crossfadeDuration > 0 ? `${crossfadeDuration}s` : 'Off'}
          </span>
        )}

        {isCrossfading && (
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping shrink-0" />
        )}
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-x-4 bottom-24 sm:absolute sm:inset-auto sm:right-0 sm:bottom-full sm:mb-3 sm:w-96 max-w-[calc(100vw-24px)] max-h-[85vh] overflow-y-auto bg-neutral-900/98 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 text-white select-none scrollbar-thin scrollbar-thumb-neutral-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Waves className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Crossfade Songs
                    {isCrossfading && (
                      <span className="text-[9px] font-mono bg-purple-500/30 text-purple-300 border border-purple-500/40 px-1 rounded uppercase animate-pulse">
                        Active
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-neutral-400">Seamless blend between tracks</p>
                </div>
              </div>

              {/* On/Off Switch */}
              <button
                onClick={() => {
                  const nextState = !isCrossfadeEnabled;
                  setCrossfadeEnabled(nextState);
                  showToast(nextState ? `Crossfade enabled (${crossfadeDuration}s)` : 'Crossfade turned off');
                }}
                className={cn(
                  "w-11 h-6 rounded-full transition-colors relative p-0.5 focus:outline-none",
                  isCrossfadeEnabled ? "bg-purple-600" : "bg-neutral-700"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full bg-white transition-transform shadow-md",
                    isCrossfadeEnabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {/* Slider & Curve Visualizer */}
            <div className="py-4 space-y-4">
              {/* Curve Illustration */}
              <div className="relative h-16 w-full bg-neutral-950/80 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center px-4">
                <svg className="w-full h-12 overflow-visible" viewBox="0 0 300 60" preserveAspectRatio="none">
                  {/* Track 1 Fade Out Curve */}
                  <path
                    d="M 10,10 C 140,10 160,50 290,50"
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                  {/* Track 2 Fade In Curve */}
                  <path
                    d="M 10,50 C 140,50 160,10 290,10"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>

                {/* Overlap Labels */}
                <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none text-[10px] font-mono font-bold">
                  <span className="text-purple-400 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-500/20">
                    Track A (Fade Out)
                  </span>
                  <span className="text-neutral-400 bg-black/60 px-2 py-0.5 rounded border border-white/10">
                    {isCrossfadeEnabled ? `${crossfadeDuration}s Blend` : '0s Gapless'}
                  </span>
                  <span className="text-green-400 bg-green-950/80 px-1.5 py-0.5 rounded border border-green-500/20">
                    Track B (Fade In)
                  </span>
                </div>
              </div>

              {/* Slider Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Duration</span>
                  <span className="font-mono font-bold text-purple-400">
                    {crossfadeDuration} seconds <span className="text-neutral-400 text-[11px] font-normal">({getLabelForSeconds(crossfadeDuration)})</span>
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="12"
                  step="1"
                  disabled={!isCrossfadeEnabled}
                  value={crossfadeDuration}
                  onChange={(e) => setCrossfadeDuration(Number(e.target.value))}
                  className={cn(
                    "w-full h-2 rounded-lg appearance-none cursor-pointer bg-neutral-800 accent-purple-500 transition-opacity",
                    !isCrossfadeEnabled && "opacity-40 cursor-not-allowed"
                  )}
                />

                <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                  <span>0s</span>
                  <span>2s</span>
                  <span>4s</span>
                  <span>6s</span>
                  <span>8s</span>
                  <span>10s</span>
                  <span>12s</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-neutral-400">Quick Presets</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '2s Quick', val: 2 },
                    { label: '4s Smooth', val: 4 },
                    { label: '8s DJ Mix', val: 8 },
                    { label: '12s Long', val: 12 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      onClick={() => handlePresetClick(preset.val)}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center",
                        crossfadeDuration === preset.val && isCrossfadeEnabled
                          ? "bg-purple-500/20 border-purple-500 text-purple-300 shadow-sm"
                          : "bg-neutral-800/80 hover:bg-neutral-800 border-white/5 text-neutral-300 hover:text-white"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={handlePlayDemoCrossfade}
                disabled={isDemoPlaying}
                className="flex items-center gap-1.5 text-xs font-bold text-neutral-300 hover:text-purple-300 transition-colors focus:outline-none disabled:opacity-50"
              >
                {isDemoPlaying ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    <span>Blending Audio...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current text-purple-400" />
                    <span>Preview Blend Sound</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
