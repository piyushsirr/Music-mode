import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track } from '../types';

export type PlayerMode = 'audio' | 'youtube';

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  seekTime: number | null;
  playerMode: PlayerMode;
  isNowPlayingOpen: boolean;
  isQueueOpen: boolean;
  crossfadeDuration: number;
  isCrossfadeEnabled: boolean;
  isCrossfading: boolean;
  crossfadeProgress: number;
  play: (track: Track, queue?: Track[]) => void;
  togglePlay: () => void;
  setIsPlaying: (isPlaying: boolean) => void;
  next: () => void;
  prev: () => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  seekTo: (time: number) => void;
  setSeekTime: (time: number | null) => void;
  setPlayerMode: (mode: PlayerMode) => void;
  togglePlayerMode: () => void;
  setNowPlayingOpen: (open: boolean) => void;
  toggleNowPlaying: () => void;
  setQueueOpen: (open: boolean) => void;
  toggleQueue: () => void;
  setCrossfadeDuration: (duration: number) => void;
  setCrossfadeEnabled: (enabled: boolean) => void;
  setIsCrossfading: (isCrossfading: boolean) => void;
  setCrossfadeProgress: (progress: number) => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;
  clearUpcomingQueue: () => void;
  shuffleUpcomingQueue: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      queue: [],
      isPlaying: false,
      volume: 1,
      progress: 0,
      duration: 0,
      seekTime: null,
      playerMode: 'audio',
      isNowPlayingOpen: false,
      isQueueOpen: false,
      crossfadeDuration: 4, // 4 seconds smooth crossfade default
      isCrossfadeEnabled: true,
      isCrossfading: false,
      crossfadeProgress: 0,
      setCrossfadeDuration: (crossfadeDuration) => set({ crossfadeDuration }),
      setCrossfadeEnabled: (isCrossfadeEnabled) => set({ isCrossfadeEnabled }),
      setIsCrossfading: (isCrossfading) => set({ isCrossfading }),
      setCrossfadeProgress: (crossfadeProgress) => set({ crossfadeProgress }),
      play: (track, queue) => set((state) => {
        let newQueue = queue || state.queue;
        if (!queue && !newQueue.find((t) => t.id === track.id)) {
          newQueue = [...newQueue, track];
        }
        return {
          currentTrack: track,
          queue: newQueue,
          isPlaying: true,
          progress: 0, // Reset progress for newly clicked track
          duration: track.durationMs ? track.durationMs / 1000 : 210,
          seekTime: null,
        };
      }),
      addToQueue: (track) => set((state) => {
        if (!state.queue.find((t) => t.id === track.id)) {
          return { queue: [...state.queue, track] };
        }
        return state;
      }),
      playNext: (track) => set((state) => {
        const { currentTrack, queue } = state;
        const newQueue = [...queue];
        const existingIndex = newQueue.findIndex((t) => t.id === track.id);
        if (existingIndex !== -1) {
          newQueue.splice(existingIndex, 1);
        }
        const currentIndex = currentTrack ? newQueue.findIndex((t) => t.id === currentTrack.id) : -1;
        if (currentIndex !== -1) {
          newQueue.splice(currentIndex + 1, 0, track);
        } else {
          newQueue.unshift(track);
        }
        return { queue: newQueue };
      }),
      removeFromQueue: (trackId) => set((state) => {
        const updatedQueue = state.queue.filter((t) => t.id !== trackId);
        // If removed track was current track, skip to next or stop if none left
        let newCurrentTrack = state.currentTrack;
        let isPlaying = state.isPlaying;
        if (state.currentTrack?.id === trackId) {
          if (updatedQueue.length > 0) {
            newCurrentTrack = updatedQueue[0];
          } else {
            newCurrentTrack = null;
            isPlaying = false;
          }
        }
        return { queue: updatedQueue, currentTrack: newCurrentTrack, isPlaying };
      }),
      moveQueueItem: (fromIndex, toIndex) => set((state) => {
        if (
          fromIndex < 0 ||
          fromIndex >= state.queue.length ||
          toIndex < 0 ||
          toIndex >= state.queue.length ||
          fromIndex === toIndex
        ) {
          return state;
        }
        const newQueue = [...state.queue];
        const [movedItem] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, movedItem);
        return { queue: newQueue };
      }),
      clearUpcomingQueue: () => set((state) => {
        if (!state.currentTrack) return { queue: [] };
        const currentIndex = state.queue.findIndex((t) => t.id === state.currentTrack?.id);
        if (currentIndex === -1) {
          return { queue: [state.currentTrack] };
        }
        // Keep songs up to and including current track
        return { queue: state.queue.slice(0, currentIndex + 1) };
      }),
      shuffleUpcomingQueue: () => set((state) => {
        if (!state.currentTrack || state.queue.length <= 2) return state;
        const currentIndex = state.queue.findIndex((t) => t.id === state.currentTrack?.id);
        if (currentIndex === -1 || currentIndex >= state.queue.length - 1) return state;
        
        const history = state.queue.slice(0, currentIndex + 1);
        const upcoming = [...state.queue.slice(currentIndex + 1)];
        // Fisher-Yates shuffle upcoming tracks
        for (let i = upcoming.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [upcoming[i], upcoming[j]] = [upcoming[j], upcoming[i]];
        }
        return { queue: [...history, ...upcoming] };
      }),
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      next: () => {
        const { currentTrack, queue } = get();
        if (!currentTrack || queue.length === 0) return;
        const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
        if (currentIndex !== -1 && currentIndex < queue.length - 1) {
          set({
            currentTrack: queue[currentIndex + 1],
            isPlaying: true,
            progress: 0,
            duration: queue[currentIndex + 1].durationMs ? queue[currentIndex + 1].durationMs! / 1000 : 210,
          });
        }
      },
      prev: () => {
        const { currentTrack, queue } = get();
        if (!currentTrack || queue.length === 0) return;
        const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
        if (currentIndex > 0) {
          set({
            currentTrack: queue[currentIndex - 1],
            isPlaying: true,
            progress: 0,
            duration: queue[currentIndex - 1].durationMs ? queue[currentIndex - 1].durationMs! / 1000 : 210,
          });
        }
      },
      setVolume: (volume) => set({ volume }),
      setProgress: (progress) => set({ progress }),
      setDuration: (duration) => set({ duration }),
      seekTo: (time) => set({ seekTime: time, progress: time }),
      setSeekTime: (time) => set({ seekTime: time }),
      setPlayerMode: (playerMode) => set({ playerMode }),
      togglePlayerMode: () => set((state) => ({
        playerMode: state.playerMode === 'audio' ? 'youtube' : 'audio',
      })),
      setNowPlayingOpen: (isNowPlayingOpen) => set({ isNowPlayingOpen }),
      toggleNowPlaying: () => set((state) => ({ isNowPlayingOpen: !state.isNowPlayingOpen })),
      setQueueOpen: (isQueueOpen) => set({ isQueueOpen }),
      toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
    }),
    {
      name: 'music-player-storage',
      partialize: (state) => ({
        currentTrack: state.currentTrack,
        queue: state.queue,
        volume: state.volume,
        crossfadeDuration: state.crossfadeDuration,
        isCrossfadeEnabled: state.isCrossfadeEnabled,
      }),
    }
  )
);
