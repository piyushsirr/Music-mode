import React, { useEffect, useState, useRef } from 'react';
import { useAlbumColor } from '../hooks/useAlbumColor';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer';
import { motion, AnimatePresence } from 'motion/react';

interface DynamicBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  intensity?: 'subtle' | 'vibrant' | 'ambient';
}

export function DynamicBackground({
  children,
  className = '',
  intensity = 'vibrant',
}: DynamicBackgroundProps) {
  const { palette, hasTrack } = useAlbumColor();
  const { isPlaying } = usePlayerStore();
  const { bass } = useAudioVisualizer();

  const [currentGradient, setCurrentGradient] = useState(palette.linearGradient);
  const [prevGradient, setPrevGradient] = useState<string | null>(null);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (palette.linearGradient !== currentGradient) {
      setPrevGradient(currentGradient);
      setCurrentGradient(palette.linearGradient);
      setIsCrossfading(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsCrossfading(false);
        setPrevGradient(null);
      }, 1200);
    }
  }, [palette.linearGradient, currentGradient]);

  const [r, g, b] = palette.rgbPrimary;
  const [sr, sg, sb] = palette.rgbSecondary;

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Layer 1: Previous Gradient (Fading out) */}
      {isCrossfading && prevGradient && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-1000 ease-out opacity-0"
          style={{ background: prevGradient }}
        />
      )}

      {/* Layer 2: Current Active Linear Gradient (Fading in smoothly) */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000 ease-out"
        style={{
          background: hasTrack
            ? currentGradient
            : 'linear-gradient(180deg, rgba(30, 110, 60, 0.4) 0%, rgba(18, 18, 18, 0.95) 45%, #121212 100%)',
          opacity: intensity === 'subtle' ? 0.6 : intensity === 'ambient' ? 0.75 : 0.92,
        }}
      />

      {/* Layer 3: Dynamic Ambient Radial Color Orbs (Moves and breathes with the music) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen opacity-40">
        {/* Primary Color Orb (Top-Left / Center) */}
        <motion.div
          animate={{
            scale: isPlaying ? [1, 1.08 + bass * 0.12, 1] : [1, 1.03, 1],
            x: isPlaying ? [-10, 15, -10] : [0, 5, 0],
            y: isPlaying ? [-5, 10, -5] : [0, -5, 0],
            opacity: isPlaying ? 0.55 + bass * 0.25 : 0.4,
          }}
          transition={{
            repeat: Infinity,
            duration: isPlaying ? 4 : 8,
            ease: 'easeInOut',
          }}
          className="absolute -top-24 -left-20 w-[550px] h-[550px] rounded-full filter blur-[90px] pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(${r}, ${g}, ${b}, 0.8) 0%, rgba(${r}, ${g}, ${b}, 0) 70%)`,
          }}
        />

        {/* Secondary Accent Orb (Top-Right) */}
        <motion.div
          animate={{
            scale: isPlaying ? [1, 1.1 + bass * 0.08, 1] : [1, 1.02, 1],
            x: isPlaying ? [10, -12, 10] : [0, -4, 0],
            y: isPlaying ? [5, -8, 5] : [0, 4, 0],
            opacity: isPlaying ? 0.4 + bass * 0.2 : 0.3,
          }}
          transition={{
            repeat: Infinity,
            duration: isPlaying ? 5 : 9,
            ease: 'easeInOut',
          }}
          className="absolute -top-16 right-0 w-[480px] h-[480px] rounded-full filter blur-[80px] pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(${sr}, ${sg}, ${sb}, 0.7) 0%, rgba(${sr}, ${sg}, ${sb}, 0) 70%)`,
          }}
        />
      </div>

      {/* Layer 4: Subtle Vignette & Bottom Dark Solid Fade for pristine contrast and readability */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-black/30 to-neutral-900/90" />

      {/* Children content mounted over the dynamic background */}
      <div className="relative z-10 w-full h-full flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
