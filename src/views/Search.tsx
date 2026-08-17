import { useEffect, useState, useRef } from 'react';
import { Track } from '../types';
import { searchTracks } from '../lib/api';
import { TrackRow } from '../components/TrackRow';
import { useUserStore } from '../store/useUserStore';
import { Sparkles, Languages, Music } from 'lucide-react';
import { filterOutRemixes } from '../lib/utils';

interface SearchProps {
  query: string;
  onSelectCategory?: (category: string) => void;
}

export function Search({ query, onSelectCategory }: SearchProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);
  const { selectedLanguages, selectedSingers } = useUserStore();

  const effectiveQuery = query || activeCategory || '';

  useEffect(() => {
    if (!effectiveQuery.trim()) {
      setTracks([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchTracks(effectiveQuery);
      setTracks(filterOutRemixes(results));
      setLoading(false);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [effectiveQuery]);

  const categories = [
    { name: 'Bollywood Hits', query: 'bollywood top songs 2024', color: 'bg-amber-600' },
    { name: 'Romantic Hindi', query: 'arijit singh romantic hindi songs', color: 'bg-rose-600' },
    { name: 'Punjabi Pop', query: 'punjabi hits diljit dosanjh ap dhillon', color: 'bg-orange-600' },
    { name: 'Desi Hip-Hop', query: 'indian hip hop seedhe maut divine', color: 'bg-purple-600' },
    { name: 'Indie India', query: 'indie hindi songs anuv jain prateek kuhad', color: 'bg-indigo-600' },
    { name: 'South Chartbusters', query: 'anirudh ravichander tamil telugu hits', color: 'bg-emerald-600' },
    { name: 'Retro Classics', query: 'kishore kumar rd burman 90s bollywood', color: 'bg-blue-600' },
    { name: 'Sufi & Soul', query: 'sufi songs nusrat fateh ali khan', color: 'bg-teal-600' },
    { name: 'Party & Dance', query: 'badshah honey singh bollywood dance', color: 'bg-pink-600' },
    { name: 'Devotional & Spiritual', query: 'bhajan aarti hindi devotional', color: 'bg-yellow-600' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-black/10 via-neutral-900/60 to-neutral-950/95 pb-36 md:pb-24 scrollbar-thin scrollbar-thumb-neutral-700">
      <div className="px-6 py-6 pt-20">
        {!query && !activeCategory && (
          <div>
            {/* Quick Filter chips for user's selected preferences */}
            {(selectedLanguages.length > 0 || selectedSingers.length > 0) && (
              <div className="mb-8 p-4 rounded-2xl bg-neutral-800/50 border border-white/5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-green-400" />
                  <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                    Quick Search From Your Preferences
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedLanguages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        const q = `${lang} top hits songs`;
                        setActiveCategory(q);
                        onSelectCategory?.(q);
                      }}
                      className="px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white border border-white/10 hover:border-green-500/50 flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Languages className="w-3 h-3 text-green-400" />
                      {lang} Hits
                    </button>
                  ))}

                  {selectedSingers.map((singer) => (
                    <button
                      key={singer}
                      onClick={() => {
                        const q = `${singer} songs`;
                        setActiveCategory(q);
                        onSelectCategory?.(q);
                      }}
                      className="px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 hover:text-white border border-white/10 hover:border-green-500/50 flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Music className="w-3 h-3 text-green-400" />
                      {singer}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <h2 className="text-2xl font-bold text-white mb-6">Browse all genres</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {categories.map((cat) => (
                <div 
                  key={cat.name} 
                  onClick={() => {
                    setActiveCategory(cat.query);
                    onSelectCategory?.(cat.query);
                  }}
                  className={`${cat.color} rounded-xl aspect-square p-5 relative overflow-hidden cursor-pointer hover:scale-105 transition-transform shadow-xl`}
                >
                  <h3 className="text-white font-black text-xl md:text-2xl mt-1 tracking-tight leading-tight">{cat.name}</h3>
                  <div className="w-28 h-28 bg-black/25 absolute -bottom-5 -right-5 rotate-[25deg] rounded-lg shadow-2xl" />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeCategory && !query && (
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white capitalize">{activeCategory} Tracks</h2>
            <button
              onClick={() => setActiveCategory(null)}
              className="text-sm font-semibold text-neutral-400 hover:text-white underline"
            >
              Back to categories
            </button>
          </div>
        )}

        {effectiveQuery && loading && (
          <div className="flex justify-center mt-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        )}

        {effectiveQuery && !loading && tracks.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Results for "{effectiveQuery}"</h2>
            <div className="flex flex-col">
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
          </div>
        )}

        {effectiveQuery && !loading && tracks.length === 0 && (
          <div className="text-center mt-20">
            <h2 className="text-2xl font-bold text-white mb-4">No results found for "{effectiveQuery}"</h2>
            <p className="text-neutral-400">Please make sure your words are spelled correctly or search for another artist or song name.</p>
          </div>
        )}
      </div>
    </div>
  );
}
