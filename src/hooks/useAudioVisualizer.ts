import { useState, useEffect } from 'react';
import { audioVisualizer, FrequencyData } from '../lib/audioVisualizer';
import { usePlayerStore } from '../store/usePlayerStore';

const defaultFrequencyData: FrequencyData = {
  frequencies: new Array(32).fill(0.04),
  bass: 0.04,
  lowMid: 0.04,
  mid: 0.04,
  highMid: 0.04,
  treble: 0.04,
  peak: 0.04,
  beatPulse: 0.04,
  isLive: false,
};

export function useAudioVisualizer() {
  const { isPlaying, progress, currentTrack } = usePlayerStore();
  const [data, setData] = useState<FrequencyData>(defaultFrequencyData);

  // Inform visualizer engine about playback changes
  useEffect(() => {
    audioVisualizer.setPlaybackState(isPlaying, progress, currentTrack?.id);
  }, [isPlaying, progress, currentTrack?.id]);

  // Subscribe to 60fps frequency updates
  useEffect(() => {
    const unsubscribe = audioVisualizer.subscribe((freshData) => {
      setData(freshData);
    });
    return unsubscribe;
  }, []);

  return data;
}
