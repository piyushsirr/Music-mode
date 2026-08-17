import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Waves, 
  Radio, 
  Sliders, 
  Sparkles,
  Zap,
  Flame,
  Moon,
  Volume2
} from 'lucide-react';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer';
import { cn } from '../lib/utils';

export type VisualizerMode = 'spectrum' | 'mirrored' | 'radial-ambient' | 'bands-hud';
export type VisualizerTheme = 'spotify' | 'cyberpunk' | 'sunset' | 'cosmic' | 'monochrome';

interface AudioVisualizerProps {
  variant?: 'inline' | 'panel' | 'hero' | 'compact';
  showControls?: boolean;
  className?: string;
}

const THEMES: Record<VisualizerTheme, {
  name: string;
  primary: string;
  secondary: string;
  glow: string;
  bgGradient: string;
  barGradient: string;
  border: string;
  icon: React.ReactNode;
}> = {
  spotify: {
    name: 'Spotify Neon',
    primary: '#22c55e',
    secondary: '#4ade80',
    glow: 'rgba(34, 197, 94, 0.45)',
    bgGradient: 'from-green-500/10 via-emerald-500/5 to-transparent',
    barGradient: 'from-emerald-500 via-green-400 to-green-300',
    border: 'border-green-500/30',
    icon: <Sparkles className="w-3 h-3 text-green-400" />
  },
  cyberpunk: {
    name: 'Cyber Violet',
    primary: '#a855f7',
    secondary: '#06b6d4',
    glow: 'rgba(168, 85, 247, 0.45)',
    bgGradient: 'from-purple-500/15 via-cyan-500/10 to-transparent',
    barGradient: 'from-purple-600 via-fuchsia-400 to-cyan-400',
    border: 'border-purple-500/30',
    icon: <Zap className="w-3 h-3 text-purple-400" />
  },
  sunset: {
    name: 'Sunset Flare',
    primary: '#f59e0b',
    secondary: '#ef4444',
    glow: 'rgba(245, 158, 11, 0.45)',
    bgGradient: 'from-amber-500/15 via-red-500/10 to-transparent',
    barGradient: 'from-red-500 via-amber-400 to-yellow-300',
    border: 'border-amber-500/30',
    icon: <Flame className="w-3 h-3 text-amber-400" />
  },
  cosmic: {
    name: 'Cosmic Sky',
    primary: '#6366f1',
    secondary: '#38bdf8',
    glow: 'rgba(99, 102, 241, 0.45)',
    bgGradient: 'from-indigo-500/15 via-sky-500/10 to-transparent',
    barGradient: 'from-indigo-500 via-blue-400 to-sky-300',
    border: 'border-indigo-500/30',
    icon: <Radio className="w-3 h-3 text-indigo-400" />
  },
  monochrome: {
    name: 'Pure Platinum',
    primary: '#e2e8f0',
    secondary: '#ffffff',
    glow: 'rgba(255, 255, 255, 0.3)',
    bgGradient: 'from-white/10 via-neutral-400/5 to-transparent',
    barGradient: 'from-neutral-400 via-neutral-200 to-white',
    border: 'border-white/20',
    icon: <Moon className="w-3 h-3 text-neutral-300" />
  }
};

const FREQ_BANDS = [
  { label: 'Sub', freq: '32 Hz', range: [0, 2] },
  { label: 'Bass', freq: '64 Hz', range: [3, 5] },
  { label: 'Low Mid', freq: '250 Hz', range: [6, 9] },
  { label: 'Mid', freq: '1 kHz', range: [10, 15] },
  { label: 'High Mid', freq: '3.5 kHz', range: [16, 21] },
  { label: 'Treble', freq: '8 kHz', range: [22, 26] },
  { label: 'Air', freq: '16 kHz', range: [27, 31] },
];

export function AudioVisualizer({
  variant = 'hero',
  showControls = true,
  className
}: AudioVisualizerProps) {
  const data = useAudioVisualizer();
  const [mode, setMode] = useState<VisualizerMode>('spectrum');
  const [theme, setTheme] = useState<VisualizerTheme>('spotify');
  const [sensitivity, setSensitivity] = useState<number>(1.2);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const activeTheme = THEMES[theme];

  // Compact mini visualizer variant (e.g. for header badges or player rows)
  if (variant === 'compact') {
    return (
      <div className={cn("flex items-end gap-0.5 h-4 px-1", className)}>
        {data.frequencies.slice(0, 8).map((freq, idx) => {
          const heightPct = Math.max(15, Math.min(100, freq * 100 * sensitivity));
          return (
            <div
              key={idx}
              className="w-1 rounded-full bg-green-500 transition-all duration-75 ease-out"
              style={{
                height: `${heightPct}%`,
                backgroundColor: activeTheme.primary,
                boxShadow: data.isLive ? `0 0 6px ${activeTheme.glow}` : 'none'
              }}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative rounded-2xl overflow-hidden transition-all flex flex-col justify-between select-none",
        variant === 'hero' && "w-full max-w-xl bg-neutral-900/70 border border-white/10 p-4 sm:p-5 backdrop-blur-xl shadow-2xl",
        variant === 'panel' && "w-full h-full bg-neutral-900/60 border border-white/10 p-5 rounded-3xl backdrop-blur-md",
        variant === 'inline' && "w-full bg-neutral-900/40 border border-white/5 p-3 rounded-xl",
        className
      )}
      style={{
        boxShadow: data.isLive ? `0 8px 32px ${activeTheme.glow}` : undefined
      }}
    >
      {/* Background Reactive Ambient Glow */}
      <div 
        className={cn(
          "absolute inset-0 pointer-events-none bg-gradient-to-t transition-opacity duration-300",
          activeTheme.bgGradient
        )}
        style={{
          opacity: data.isLive ? 0.35 + data.bass * 0.45 : 0.1
        }}
      />

      {/* Top Header Controls (if requested) */}
      {showControls && (
        <div className="relative z-10 flex items-center justify-between gap-2 pb-3 mb-2 border-b border-white/10 text-xs">
          <div className="flex items-center gap-1.5 bg-neutral-800/80 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setMode('spectrum')}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all",
                mode === 'spectrum' 
                  ? "bg-neutral-700 text-white shadow-sm" 
                  : "text-neutral-400 hover:text-white"
              )}
              title="Multi-band Frequency Equalizer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Spectrum</span>
            </button>

            <button
              onClick={() => setMode('mirrored')}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all",
                mode === 'mirrored' 
                  ? "bg-neutral-700 text-white shadow-sm" 
                  : "text-neutral-400 hover:text-white"
              )}
              title="Mirrored Symmetrical Wave"
            >
              <Waves className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mirrored</span>
            </button>

            <button
              onClick={() => setMode('radial-ambient')}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all",
                mode === 'radial-ambient' 
                  ? "bg-neutral-700 text-white shadow-sm" 
                  : "text-neutral-400 hover:text-white"
              )}
              title="Radial Sound Pulse & Aurora"
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Radial Pulse</span>
            </button>

            <button
              onClick={() => setMode('bands-hud')}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all",
                mode === 'bands-hud' 
                  ? "bg-neutral-700 text-white shadow-sm" 
                  : "text-neutral-400 hover:text-white"
              )}
              title="Studio Frequency Telemetry"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Studio HUD</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Selector Dropdown / Pills */}
            <div className="flex items-center gap-1 bg-neutral-800/80 p-1 rounded-xl border border-white/10">
              {(Object.keys(THEMES) as VisualizerTheme[]).map((thmKey) => {
                const thm = THEMES[thmKey];
                return (
                  <button
                    key={thmKey}
                    onClick={() => setTheme(thmKey)}
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                      theme === thmKey ? "scale-110 ring-2 ring-white/60" : "opacity-50 hover:opacity-100"
                    )}
                    style={{ backgroundColor: thm.primary }}
                    title={thm.name}
                  />
                );
              })}
            </div>

            {/* Live FPS / Beat Indicator */}
            <div 
              className={cn(
                "hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-bold font-mono tracking-wider transition-all",
                data.isLive 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]" 
                  : "bg-neutral-800/50 text-neutral-500 border-white/5"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", data.isLive ? "bg-emerald-400 animate-ping" : "bg-neutral-600")} />
              <span>{data.isLive ? '60 FPS REAL-TIME' : 'IDLE'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Visualizer Canvas Area (Mode-based Rendering) */}
      <div className="relative z-10 w-full flex-1 flex flex-col justify-center min-h-[90px] py-1">
        
        {/* MODE 1: SPECTRUM EQUALIZER BARS */}
        {mode === 'spectrum' && (
          <div className="w-full flex items-end justify-between gap-1 sm:gap-1.5 h-24 sm:h-28 px-1">
            {data.frequencies.map((freq, idx) => {
              const scaledVal = Math.max(0.04, Math.min(1, freq * sensitivity));
              const heightPercent = scaledVal * 100;
              const isBass = idx < 6;
              const isTreble = idx > 22;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  {/* Peak Cap Indicator */}
                  <div
                    className="w-full h-1 rounded-full mb-0.5 transition-all duration-150 ease-out"
                    style={{
                      backgroundColor: activeTheme.secondary,
                      opacity: data.isLive ? 0.9 : 0.2,
                      transform: `translateY(-${Math.min(20, scaledVal * 8)}px)`,
                      boxShadow: data.isLive ? `0 0 6px ${activeTheme.glow}` : 'none'
                    }}
                  />
                  {/* Dynamic CSS Reactive Bar */}
                  <div
                    className={cn(
                      "w-full rounded-t-lg bg-gradient-to-t transition-all duration-75 ease-out",
                      activeTheme.barGradient
                    )}
                    style={{
                      height: `${heightPercent}%`,
                      minHeight: '4px',
                      opacity: 0.85 + scaledVal * 0.15,
                      boxShadow: data.isLive && scaledVal > 0.4 ? `0 0 ${scaledVal * 16}px ${activeTheme.glow}` : 'none',
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* MODE 2: MIRRORED HORIZON WAVE */}
        {mode === 'mirrored' && (
          <div className="w-full flex items-center justify-between gap-1 sm:gap-1.5 h-24 sm:h-28 px-1 relative">
            {/* Center Horizon Line */}
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/20 -translate-y-1/2 z-0" />
            
            {data.frequencies.map((freq, idx) => {
              const scaledVal = Math.max(0.04, Math.min(1, freq * sensitivity));
              const heightPercent = (scaledVal * 100) / 2;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-center h-full relative z-10"
                >
                  {/* Top Wave */}
                  <div
                    className={cn(
                      "w-full rounded-t-md bg-gradient-to-t transition-all duration-75 ease-out",
                      activeTheme.barGradient
                    )}
                    style={{
                      height: `${heightPercent}%`,
                      minHeight: '2px',
                      opacity: 0.9,
                      boxShadow: data.isLive && scaledVal > 0.35 ? `0 0 8px ${activeTheme.glow}` : 'none'
                    }}
                  />
                  {/* Bottom Reflected Wave */}
                  <div
                    className={cn(
                      "w-full rounded-b-md bg-gradient-to-b transition-all duration-75 ease-out",
                      activeTheme.barGradient
                    )}
                    style={{
                      height: `${heightPercent * 0.75}%`,
                      minHeight: '2px',
                      opacity: 0.45,
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* MODE 3: RADIAL AMBIENT PULSE */}
        {mode === 'radial-ambient' && (
          <div className="w-full h-24 sm:h-28 relative flex items-center justify-center overflow-hidden">
            {/* Outer Concentric Sound Rings */}
            <div 
              className="absolute rounded-full border border-dashed transition-all duration-100 ease-out pointer-events-none"
              style={{
                borderColor: activeTheme.primary,
                width: `${110 + data.bass * 90 * sensitivity}px`,
                height: `${110 + data.bass * 90 * sensitivity}px`,
                opacity: 0.3 + data.bass * 0.5,
                boxShadow: `0 0 ${data.bass * 30}px ${activeTheme.glow}`
              }}
            />
            <div 
              className="absolute rounded-full border transition-all duration-150 ease-out pointer-events-none"
              style={{
                borderColor: activeTheme.secondary,
                width: `${80 + data.lowMid * 60 * sensitivity}px`,
                height: `${80 + data.lowMid * 60 * sensitivity}px`,
                opacity: 0.5 + data.lowMid * 0.4,
              }}
            />
            {/* Center Core Glowing Orb */}
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-75 ease-out"
              style={{
                backgroundColor: activeTheme.primary,
                transform: `scale(${1 + data.bass * 0.45 * sensitivity})`,
                boxShadow: `0 0 ${20 + data.bass * 40}px ${activeTheme.glow}`
              }}
            >
              <Activity className="w-6 h-6 text-black animate-pulse" />
            </div>

            {/* Left & Right Mini Spectrum Wings */}
            <div className="absolute left-3 inset-y-0 flex items-center gap-1">
              {data.frequencies.slice(0, 6).map((f, i) => (
                <div 
                  key={i} 
                  className={cn("w-1 rounded-full bg-gradient-to-t", activeTheme.barGradient)}
                  style={{ height: `${Math.max(15, f * 70 * sensitivity)}%` }}
                />
              ))}
            </div>

            <div className="absolute right-3 inset-y-0 flex items-center gap-1">
              {data.frequencies.slice(26, 32).map((f, i) => (
                <div 
                  key={i} 
                  className={cn("w-1 rounded-full bg-gradient-to-t", activeTheme.barGradient)}
                  style={{ height: `${Math.max(15, f * 70 * sensitivity)}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* MODE 4: STUDIO EQ HUD METERS */}
        {mode === 'bands-hud' && (
          <div className="w-full grid grid-cols-7 gap-1.5 sm:gap-2 py-1">
            {FREQ_BANDS.map((band, idx) => {
              // Average frequency value in range
              let sum = 0;
              for (let i = band.range[0]; i <= band.range[1]; i++) {
                sum += data.frequencies[i] || 0;
              }
              const count = band.range[1] - band.range[0] + 1;
              const avg = (sum / count) * sensitivity;
              const dbValue = Math.round((avg - 1) * 36); // Approx -36dB to 0dB

              return (
                <div 
                  key={idx} 
                  className="flex flex-col items-center bg-black/40 border border-white/5 rounded-xl p-1.5 sm:p-2"
                >
                  <span className="text-[9px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-tighter truncate w-full text-center">
                    {band.label}
                  </span>
                  
                  {/* Vertical Meter */}
                  <div className="w-full h-14 sm:h-16 bg-neutral-950 rounded-lg p-0.5 my-1 flex flex-col justify-end overflow-hidden border border-white/5">
                    <div 
                      className={cn(
                        "w-full rounded-md bg-gradient-to-t transition-all duration-75 ease-out",
                        activeTheme.barGradient
                      )}
                      style={{
                        height: `${Math.max(8, Math.min(100, avg * 100))}%`,
                        boxShadow: avg > 0.5 ? `0 0 8px ${activeTheme.glow}` : 'none'
                      }}
                    />
                  </div>

                  <span className="text-[8px] sm:text-[9px] font-mono font-bold text-neutral-300">
                    {data.isLive ? `${dbValue > 0 ? `+${dbValue}` : dbValue}dB` : '-inf'}
                  </span>
                  <span className="text-[7px] text-neutral-500 font-mono hidden sm:inline">
                    {band.freq}
                  </span>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Bottom Summary Bar with Sensitivity & Dynamic Telemetry */}
      {showControls && (
        <div className="relative z-10 flex items-center justify-between pt-2.5 mt-1 border-t border-white/10 text-[11px] text-neutral-400">
          <div className="flex items-center gap-3">
            <span className="font-mono">
              BASS: <strong className="text-white font-bold">{Math.round(data.bass * 100)}%</strong>
            </span>
            <span className="font-mono hidden sm:inline">
              MIDS: <strong className="text-white font-bold">{Math.round(data.mid * 100)}%</strong>
            </span>
            <span className="font-mono hidden sm:inline">
              TREBLE: <strong className="text-white font-bold">{Math.round(data.treble * 100)}%</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-neutral-400">Gain</span>
            <input 
              type="range"
              min={0.6}
              max={2.0}
              step={0.1}
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-16 sm:w-20 h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-white hover:accent-green-400"
              title={`Visualizer Gain: ${sensitivity}x`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
