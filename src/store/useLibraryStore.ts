import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track } from '../types';
import { isRemixTrack } from '../lib/utils';
import { REGIONAL_CATALOG } from '../data/regionalTracksCatalog';

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

export interface TrackPlayStats {
  track: Track;
  count: number;
  lastPlayed: number;
}

interface LibraryState {
  likedSongs: Track[];
  playlists: Playlist[];
  recentTracks: Track[];
  trackPlayCounts: Record<string, TrackPlayStats>;
  toggleLike: (track: Track) => boolean;
  isLiked: (trackId: string) => boolean;
  createPlaylist: (name: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  addRecentTrack: (track: Track) => void;
  getSpeedDialTracks: () => Track[];
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      likedSongs: [],
      playlists: [],
      recentTracks: [],
      trackPlayCounts: {},
      toggleLike: (track) => {
        const state = get();
        const exists = state.likedSongs.some((t) => t.id === track.id);
        if (exists) {
          set({ likedSongs: state.likedSongs.filter((t) => t.id !== track.id) });
          return false;
        } else {
          set({ likedSongs: [...state.likedSongs, track] });
          return true;
        }
      },
      isLiked: (trackId) => get().likedSongs.some((t) => t.id === trackId),
      createPlaylist: (name) =>
        set((state) => ({
          playlists: [
            ...state.playlists,
            { id: Date.now().toString(), name: name || `My Playlist #${state.playlists.length + 1}`, tracks: [] },
          ],
        })),
      addTrackToPlaylist: (playlistId, track) =>
        set((state) => ({
          playlists: state.playlists.map((pl) => {
            if (pl.id === playlistId && !pl.tracks.some((t) => t.id === track.id)) {
              return { ...pl, tracks: [...pl.tracks, track] };
            }
            return pl;
          }),
        })),
      removeTrackFromPlaylist: (playlistId, trackId) =>
        set((state) => ({
          playlists: state.playlists.map((pl) => {
            if (pl.id === playlistId) {
              return { ...pl, tracks: pl.tracks.filter((t) => t.id !== trackId) };
            }
            return pl;
          }),
        })),
      addRecentTrack: (track) =>
        set((state) => {
          // Reject any remix from tracking
          if (isRemixTrack(track.title, track.artist, track.album)) {
            return state;
          }

          const filtered = state.recentTracks.filter((t) => t.id !== track.id);
          const updatedRecent = [track, ...filtered].slice(0, 30);

          const currentStats = state.trackPlayCounts[track.id];
          const newCount = (currentStats?.count || 0) + 1;

          const updatedCounts = {
            ...state.trackPlayCounts,
            [track.id]: {
              track,
              count: newCount,
              lastPlayed: Date.now(),
            },
          };

          return {
            recentTracks: updatedRecent,
            trackPlayCounts: updatedCounts,
          };
        }),
      getSpeedDialTracks: () => {
        const { trackPlayCounts, recentTracks } = get();

        // 1. Gather all repeated tracks sorted by repeat count descending
        const repeatedTracks = Object.values(trackPlayCounts || {})
          .filter((item) => item && item.count > 1 && !isRemixTrack(item.track?.title, item.track?.artist))
          .sort((a, b) => b.count - a.count || b.lastPlayed - a.lastPlayed)
          .map((item) => item.track);

        // 2. Gather last 9 listened tracks (non-remixes)
        const validRecent = (recentTracks || []).filter(
          (t) => t && !isRemixTrack(t.title, t.artist, t.album)
        );

        // 3. Merge most repeated + last listened tracks, keeping order and deduplicating
        const seenIds = new Set<string>();
        const speedDialList: Track[] = [];

        // Add top repeated first (most repeated listened)
        for (const track of repeatedTracks) {
          if (!seenIds.has(track.id)) {
            seenIds.add(track.id);
            speedDialList.push(track);
          }
        }

        // Add last listened tracks
        for (const track of validRecent) {
          if (!seenIds.has(track.id)) {
            seenIds.add(track.id);
            speedDialList.push(track);
          }
        }

        return speedDialList;
      },
    }),
    {
      name: 'spotify-clone-library',
    }
  )
);

