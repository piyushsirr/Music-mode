import { useEffect, useState } from 'react';
import { Artist, Track } from '../types';
import { getArtistTracks } from '../lib/api';
import { TrackRow } from '../components/TrackRow';
import { Play, CheckCircle2, Heart } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

interface ArtistViewProps {
  artist: Artist;
}

export function ArtistView({ artist }: ArtistViewProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const { play } = usePlayerStore();

  useEffect(() => {
    setLoading(true);
    getArtistTracks(artist.name).then((data) => {
      setTracks(data);
      setLoading(false);
    });
  }, [artist.name]);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      play(tracks[0], tracks);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-black/10 via-neutral-900/60 to-neutral-950/95 pb-36 md:pb-24 scrollbar-thin scrollbar-thumb-neutral-700">
      {/* Hero Banner */}
      <div className="relative h-80 md:h-96 w-full flex items-end p-6 md:p-10 overflow-hidden">
        <img
          src={artist.imageUrl}
          alt={artist.name}
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-75 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />

        <div className="relative z-10 flex flex-col gap-2 max-w-3xl">
          <div className="flex items-center gap-2 text-blue-400 text-sm font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-5 h-5 fill-blue-500 text-neutral-900" />
            Verified Artist
          </div>
          <h1 className="text-4xl md:text-7xl font-black text-white tracking-tight drop-shadow-md">
            {artist.name}
          </h1>
          <p className="text-neutral-300 font-semibold text-sm md:text-base">
            {artist.listeners || '85,000,000 monthly listeners'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 md:px-10 py-6">
        {/* Play Action Bar */}
        <div className="flex items-center gap-6 mb-8">
          <button
            onClick={handlePlayAll}
            disabled={tracks.length === 0}
            className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 text-black flex items-center justify-center shadow-xl shadow-green-500/20 hover:scale-105 transition-all disabled:opacity-50"
          >
            <Play className="w-7 h-7 fill-black ml-1" />
          </button>
          <button className="border border-neutral-600 hover:border-white text-white font-bold px-6 py-2.5 rounded-full text-sm transition-colors">
            Follow
          </button>
        </div>

        {/* Popular Tracks */}
        <h2 className="text-2xl font-bold text-white mb-4">Popular Songs</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : tracks.length > 0 ? (
          <div className="flex flex-col mb-12">
            <div className="grid grid-cols-[16px_1fr_1fr_minmax(120px,64px)] gap-4 px-4 py-2 text-sm text-neutral-400 border-b border-white/10 mb-4 uppercase tracking-wider font-semibold">
              <div className="text-center">#</div>
              <div>Title</div>
              <div className="hidden md:block">Album</div>
              <div className="text-right">Time</div>
            </div>
            {tracks.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} queue={tracks} />
            ))}
          </div>
        ) : (
          <p className="text-neutral-400 mb-12">No tracks found for this artist.</p>
        )}

        {/* Artist Biography */}
        {artist.bio && (
          <div className="bg-neutral-800/40 border border-white/5 p-6 rounded-2xl max-w-2xl">
            <h3 className="text-lg font-bold text-white mb-2">About {artist.name}</h3>
            <p className="text-neutral-300 text-sm leading-relaxed">{artist.bio}</p>
          </div>
        )}
      </div>
    </div>
  );
}
