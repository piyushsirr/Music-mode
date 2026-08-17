import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  Heart, 
  ListPlus, 
  ListMusic, 
  Share2, 
  User, 
  Disc, 
  Flag, 
  X, 
  Plus, 
  Check, 
  Music, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useSongOptionsStore } from '../store/useSongOptionsStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useToastStore } from '../store/useToastStore';
import { formatDuration } from '../lib/utils';

export function SongActionSheet() {
  const { isOpen, track, queue, closeOptions } = useSongOptionsStore();
  const { currentTrack, isPlaying, play, togglePlay, addToQueue, playNext } = usePlayerStore();
  const { isLiked, toggleLike, playlists, createPlaylist, addTrackToPlaylist, removeTrackFromPlaylist } = useLibraryStore();
  const { showToast } = useToastStore();

  const [showPlaylists, setShowPlaylists] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeOptions();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOptions]);

  if (!isOpen || !track) return null;

  const isCurrent = currentTrack?.id === track.id;
  const isCurrentPlaying = isCurrent && isPlaying;
  const liked = isLiked(track.id);

  const handlePlayOrPause = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      play(track, queue.length > 0 ? queue : [track]);
    }
    closeOptions();
  };

  const handlePlayNext = () => {
    playNext(track);
    showToast(`"${track.title}" will play next`);
    closeOptions();
  };

  const handleAddToQueue = () => {
    addToQueue(track);
    showToast(`Added "${track.title}" to queue`);
    closeOptions();
  };

  const handleToggleLike = () => {
    const added = toggleLike(track);
    showToast(added ? `Saved "${track.title}" to Liked Songs` : `Removed from Liked Songs`);
  };

  const handleShare = () => {
    const shareText = `🎵 Listen to "${track.title}" by ${track.artist} on Spotify`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      showToast('Song info copied to clipboard');
    }
    closeOptions();
  };

  const handleTogglePlaylistTrack = (playlistId: string, playlistName: string, inPlaylist: boolean) => {
    if (inPlaylist) {
      removeTrackFromPlaylist(playlistId, track.id);
      showToast(`Removed from "${playlistName}"`);
    } else {
      addTrackToPlaylist(playlistId, track);
      showToast(`Added to "${playlistName}"`);
    }
  };

  const handleCreateNewPlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    createPlaylist(newPlaylistName.trim());
    showToast(`Created playlist "${newPlaylistName.trim()}"`);
    setNewPlaylistName('');
    setIsCreatingPlaylist(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={closeOptions}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Content Sheet / Modal */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden z-10 max-h-[85vh] flex flex-col"
        >
          {/* Mobile Grab Handle */}
          <div className="sm:hidden w-full flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 bg-neutral-700 rounded-full" />
          </div>

          {/* Header with Track Details */}
          <div className="p-4 sm:p-5 flex items-center gap-4 border-b border-neutral-800/80 bg-neutral-900/60">
            <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden bg-neutral-800 shrink-0 shadow-lg border border-white/10">
              {track.coverUrl ? (
                <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-500">
                  <Music className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white leading-tight truncate">
                  {track.title}
                </h3>
                {track.isFullLength && (
                  <span className="text-[9px] font-black bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                    FULL
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-400 truncate mt-0.5">{track.artist}</p>
              <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1 font-mono">
                <span>{track.album || 'Single'}</span>
                <span>•</span>
                <span>{track.durationMs ? formatDuration(track.durationMs) : '3:30'}</span>
              </div>
            </div>

            <button
              onClick={closeOptions}
              className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors shrink-0"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Options List */}
          <div className="overflow-y-auto p-2 sm:p-3 space-y-1 scrollbar-thin scrollbar-thumb-neutral-700">
            {/* Play / Pause */}
            <button
              onClick={handlePlayOrPause}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-neutral-800 transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center group-hover:bg-green-500 group-hover:text-black transition-colors">
                  {isCurrentPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    {isCurrentPlaying ? 'Pause Playback' : 'Play Now'}
                  </div>
                  <div className="text-xs text-neutral-400">
                    {isCurrentPlaying ? 'Currently playing' : 'Start playing this song'}
                  </div>
                </div>
              </div>
            </button>

            {/* Play Next */}
            <button
              onClick={handlePlayNext}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-neutral-800 transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
                  <Play className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Play Next</div>
                  <div className="text-xs text-neutral-400">Insert directly after current song</div>
                </div>
              </div>
            </button>

            {/* Add to Queue */}
            <button
              onClick={handleAddToQueue}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-neutral-800 transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
                  <ListMusic className="w-4 h-4 text-neutral-300" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Add to Queue</div>
                  <div className="text-xs text-neutral-400">Append to your listening queue</div>
                </div>
              </div>
            </button>

            {/* Liked Songs Toggle */}
            <button
              onClick={handleToggleLike}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-neutral-800 transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
                  <Heart className={`w-4 h-4 ${liked ? 'fill-green-500 text-green-500' : 'text-neutral-300'}`} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    {liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
                  </div>
                  <div className="text-xs text-neutral-400">
                    {liked ? 'Currently saved in your library' : 'Add to your favorites'}
                  </div>
                </div>
              </div>
              {liked && <Check className="w-4 h-4 text-green-400" />}
            </button>

            {/* Add to Playlist Expandable */}
            <div className="rounded-xl overflow-hidden bg-neutral-800/40 border border-white/5">
              <button
                onClick={() => setShowPlaylists(!showPlaylists)}
                className="w-full flex items-center justify-between p-3 hover:bg-neutral-800/80 transition-colors text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center">
                    <ListPlus className="w-4 h-4 text-neutral-300" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Add to Playlist</div>
                    <div className="text-xs text-neutral-400">
                      {playlists.length} available {playlists.length === 1 ? 'playlist' : 'playlists'}
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-neutral-400 transition-transform ${showPlaylists ? 'rotate-90' : ''}`} />
              </button>

              {showPlaylists && (
                <div className="p-3 bg-neutral-950/40 border-t border-neutral-800 space-y-2">
                  {playlists.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic py-1">No custom playlists created yet.</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {playlists.map((pl) => {
                        const inPlaylist = pl.tracks.some((t) => t.id === track.id);
                        return (
                          <button
                            key={pl.id}
                            onClick={() => handleTogglePlaylistTrack(pl.id, pl.name, inPlaylist)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 text-xs text-white transition-colors"
                          >
                            <span className="font-medium truncate">{pl.name}</span>
                            {inPlaylist ? (
                              <Check className="w-4 h-4 text-green-400 shrink-0" />
                            ) : (
                              <Plus className="w-4 h-4 text-neutral-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Create New Playlist Form */}
                  {isCreatingPlaylist ? (
                    <form onSubmit={handleCreateNewPlaylist} className="flex gap-2 pt-2 border-t border-neutral-800">
                      <input
                        type="text"
                        placeholder="Playlist name..."
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        autoFocus
                        className="flex-1 bg-neutral-800 border border-neutral-700 text-white text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-green-500"
                      />
                      <button
                        type="submit"
                        className="bg-green-500 hover:bg-green-400 text-black text-xs font-bold px-3 py-1.5 rounded-lg"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreatingPlaylist(false)}
                        className="text-neutral-400 hover:text-white text-xs px-2"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => setIsCreatingPlaylist(true)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-green-400 hover:text-green-300 font-semibold py-1.5 rounded-lg hover:bg-green-500/10 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create New Playlist
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-neutral-800/80 my-1" />

            {/* Go to Artist */}
            <button
              onClick={() => {
                showToast(`Artist: ${track.artist}`);
                closeOptions();
              }}
              className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-neutral-800 transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
                <User className="w-4 h-4 text-neutral-300" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Go to Artist</div>
                <div className="text-xs text-neutral-400">{track.artist}</div>
              </div>
            </button>

            {/* Go to Album */}
            <button
              onClick={() => {
                showToast(`Album: ${track.album || 'Single'}`);
                closeOptions();
              }}
              className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-neutral-800 transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
                <Disc className="w-4 h-4 text-neutral-300" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Go to Album</div>
                <div className="text-xs text-neutral-400">{track.album || 'Single'}</div>
              </div>
            </button>

            {/* Share Song */}
            <button
              onClick={handleShare}
              className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-neutral-800 transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
                <Share2 className="w-4 h-4 text-neutral-300" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Share Song</div>
                <div className="text-xs text-neutral-400">Copy link & info to clipboard</div>
              </div>
            </button>

            {/* Report Audio Issue */}
            <button
              onClick={() => {
                showToast('Thanks! Audio issue reported.');
                closeOptions();
              }}
              className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-neutral-800 transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
                <Flag className="w-4 h-4 text-neutral-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-neutral-300">Report Audio Problem</div>
                <div className="text-xs text-neutral-400">Flag broken playback or missing lyrics</div>
              </div>
            </button>
          </div>

          {/* Bottom Close Button for Mobile */}
          <div className="p-3 border-t border-neutral-800 sm:hidden">
            <button
              onClick={closeOptions}
              className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
