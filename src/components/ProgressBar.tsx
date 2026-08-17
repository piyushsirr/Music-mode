import React, { useRef, useState, useCallback } from 'react';
import { formatTime } from '../lib/utils';

interface ProgressBarProps {
  progress: number;
  duration: number;
  onSeek: (time: number) => void;
  showHoverTime?: boolean;
  size?: 'sm' | 'md' | 'lg';
  crossfadeDuration?: number;
  className?: string;
}

export function ProgressBar({
  progress,
  duration,
  onSeek,
  showHoverTime = true,
  size = 'md',
  crossfadeDuration = 0,
  className = '',
}: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const safeDuration = duration > 0 ? duration : 210;
  const currentVal = dragProgress !== null ? dragProgress : progress;
  const percentage = Math.min(100, Math.max(0, (currentVal / safeDuration) * 100));

  const calculateTimeFromEvent = useCallback(
    (clientX: number) => {
      if (!barRef.current) return 0;
      const rect = barRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const ratio = rect.width > 0 ? clickX / rect.width : 0;
      return ratio * safeDuration;
    },
    [safeDuration]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    const newTime = calculateTimeFromEvent(e.clientX);
    setDragProgress(newTime);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = rect.width > 0 ? x / rect.width : 0;
    
    setHoverPosition(x);
    setHoverTime(ratio * safeDuration);

    if (isDragging) {
      setDragProgress(ratio * safeDuration);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      const finalTime = calculateTimeFromEvent(e.clientX);
      setIsDragging(false);
      setDragProgress(null);
      onSeek(finalTime);
    }
  };

  const handlePointerLeave = () => {
    if (!isDragging) {
      setHoverPosition(null);
      setHoverTime(null);
    }
  };

  const heightClasses = {
    sm: 'h-1 group-hover:h-2',
    md: 'h-1.5 group-hover:h-2.5',
    lg: 'h-2 group-hover:h-3',
  };

  const thumbClasses = {
    sm: 'w-3 h-3 -top-1',
    md: 'w-3.5 h-3.5 -top-1',
    lg: 'w-4 h-4 -top-1',
  };

  return (
    <div
      className={`relative w-full py-2 cursor-pointer select-none group touch-none ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        setIsDragging(false);
        setDragProgress(null);
      }}
      onPointerLeave={handlePointerLeave}
    >
      {/* Track Background */}
      <div
        ref={barRef}
        className={`w-full ${heightClasses[size]} bg-neutral-700/60 rounded-full overflow-visible relative transition-all duration-150`}
      >
        {/* Crossfade Transition Zone Highlight */}
        {crossfadeDuration > 0 && safeDuration > crossfadeDuration * 1.5 && (
          <div
            className="absolute top-0 bottom-0 right-0 bg-purple-500/25 border-l border-purple-400/40 rounded-r-full pointer-events-none transition-all"
            style={{ width: `${Math.min(35, (crossfadeDuration / safeDuration) * 100)}%` }}
            title={`Crossfade zone (${crossfadeDuration}s)`}
          />
        )}

        {/* Hover preview ghost bar */}
        {hoverPosition !== null && (
          <div
            className="absolute top-0 bottom-0 left-0 bg-white/20 rounded-full pointer-events-none transition-opacity"
            style={{ width: `${hoverPosition}px` }}
          />
        )}

        {/* Active Progress Fill */}
        <div
          className={`absolute top-0 bottom-0 left-0 rounded-full transition-[background-color] duration-150 ${
            isDragging ? 'bg-green-400 shadow-sm' : 'bg-white group-hover:bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />

        {/* Interactive Scrubbing Thumb Knob */}
        <div
          className={`absolute ${thumbClasses[size]} bg-white rounded-full shadow-lg border border-black/20 pointer-events-none transform -translate-x-1/2 transition-transform duration-100 ${
            isDragging
              ? 'scale-125 ring-4 ring-green-500/30 opacity-100'
              : 'scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-100'
          }`}
          style={{ left: `${percentage}%` }}
        />
      </div>

      {/* Floating Hover / Drag Time Tooltip */}
      {showHoverTime && (hoverPosition !== null || isDragging) && (
        <div
          className="absolute -top-7 transform -translate-x-1/2 bg-neutral-800 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded shadow-xl border border-white/10 pointer-events-none z-30 tracking-wide"
          style={{
            left: `${
              isDragging && dragProgress !== null
                ? (dragProgress / safeDuration) * 100
                : hoverPosition !== null && barRef.current
                ? (hoverPosition / barRef.current.clientWidth) * 100
                : percentage
            }%`,
          }}
        >
          {formatTime(
            isDragging && dragProgress !== null
              ? dragProgress
              : hoverTime !== null
              ? hoverTime
              : currentVal
          )}
        </div>
      )}
    </div>
  );
}
