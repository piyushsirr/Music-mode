import { create } from 'zustand';
import { Track } from '../types';

interface SongOptionsState {
  isOpen: boolean;
  track: Track | null;
  queue: Track[];
  position: { x: number; y: number } | null;
  openOptions: (track: Track, queue?: Track[], position?: { x: number; y: number } | null) => void;
  closeOptions: () => void;
}

export const useSongOptionsStore = create<SongOptionsState>((set) => ({
  isOpen: false,
  track: null,
  queue: [],
  position: null,
  openOptions: (track, queue = [], position = null) => {
    set({
      isOpen: true,
      track,
      queue,
      position,
    });
  },
  closeOptions: () => {
    set({
      isOpen: false,
      track: null,
      position: null,
    });
  },
}));
