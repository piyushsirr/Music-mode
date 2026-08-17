import React, { useState } from 'react';
import { useLibraryStore } from '../store/useLibraryStore';
import { TrackRow } from '../components/TrackRow';
import { Heart, Music, Play, Plus, Trash2 } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useToastStore } from '../store/useToastStore';

export function Library() {
  const { likedSongs, playlists, createPlaylist, removeTrackFromPlaylist } = useLibraryStore();
  const { play } = usePlayerStore();
  const { showToast } = useToastStore();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | 'liked'>('liked');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const activePlaylist = playlists.find((p) => p.id === selectedPlaylistId);
  const activeTracks = selectedPlaylistId === 'liked' ? likedSongs : activePlaylist?.tracks || [];

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    createPlaylist(newPlaylistName.trim());
    showToast(`Created playlist "${newPlaylistName.trim()}"`);
    setNewPlaylistName('');
    setIsCreating(false);
  };

  const handlePlayAll = () => {
    if (activeTracks.length > 0) {
      play(activeTracks[0], activeTracks);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-black/10 via-neutral-900/60 to-neutral-950/95 pb-36 md:pb-24 scrollbar-thin scrollbar-thumb-neutral-700">
      <div className="px-6 py-6 pt-20">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Your Library</h1>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Playlist
          </button>
        </div>

        {/* Modal / Inline form for creating playlist */}
        {isCreating && (
          <form onSubmit={handleCreatePlaylist} className="mb-8 bg-neutral-800 p-4 rounded-xl border border-white/10 flex items-center gap-4">
            <input
              type="text"
              placeholder="Playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              autoFocus
              className="flex-1 bg-neutral-700 text-white px-4 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2 rounded-md text-sm transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-neutral-400 hover:text-white text-sm px-2"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Category Tabs */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-6 scrollbar-none">
          <button
            onClick={() => setSelectedPlaylistId('liked')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shrink-0 transition-colors ${
              selectedPlaylistId === 'liked' ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            <Heart className="w-4 h-4 fill-current text-indigo-500" />
            Liked Songs ({likedSongs.length})
          </button>

          {playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => setSelectedPlaylistId(pl.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shrink-0 transition-colors ${
                selectedPlaylistId === pl.id ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              <Music className="w-4 h-4" />
              {pl.name} ({pl.tracks.length})
            </button>
          ))}
        </div>

        {/* Selected Header Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 mb-8 bg-gradient-to-b from-indigo-900/40 to-transparent p-6 rounded-2xl">
          <div className="w-32 h-32 md:w-40 md:w-40 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-800 flex items-center justify-center shadow-2xl shrink-0">
            {selectedPlaylistId === 'liked' ? (
              <Heart className="w-16 h-16 fill-white text-white" />
            ) : (
              <Music className="w-16 h-16 text-white" />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase font-bold text-neutral-300">Playlist</span>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              {selectedPlaylistId === 'liked' ? 'Liked Songs' : activePlaylist?.name}
            </h2>
            <p className="text-neutral-400 text-sm">
              {activeTracks.length} {activeTracks.length === 1 ? 'song' : 'songs'}
            </p>

            {activeTracks.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={handlePlayAll}
                  className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 text-black flex items-center justify-center shadow-lg hover:scale-105 transition-all"
                >
                  <Play className="w-6 h-6 fill-black ml-1" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tracks List */}
        {activeTracks.length > 0 ? (
          <div className="flex flex-col">
            <div className="grid grid-cols-[16px_1fr_1fr_minmax(120px,64px)] gap-4 px-4 py-2 text-sm text-neutral-400 border-b border-white/10 mb-4 uppercase tracking-wider font-semibold">
              <div className="text-center">#</div>
              <div>Title</div>
              <div className="hidden md:block">Album</div>
              <div className="text-right">Time</div>
            </div>
            {activeTracks.map((track, i) => (
              <div key={track.id} className="relative group">
                <TrackRow track={track} index={i} queue={activeTracks} />
                {selectedPlaylistId !== 'liked' && (
                  <button
                    onClick={() => {
                      removeTrackFromPlaylist(selectedPlaylistId, track.id);
                      showToast('Removed from playlist');
                    }}
                    className="absolute right-36 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-400 transition-opacity p-1"
                    title="Remove from playlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-neutral-800/30 rounded-2xl border border-white/5">
            <Music className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No songs in this playlist</h3>
            <p className="text-neutral-400 text-sm max-w-sm mx-auto">
              Search for your favorite songs and tap the heart icon or '+' menu to add them to your library.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
