import { Home, Search, Library as LibraryIcon, PlusSquare, Heart, Music, Wifi, SlidersHorizontal, MapPin } from 'lucide-react';
import { ViewState } from '../types';
import { useLibraryStore } from '../store/useLibraryStore';
import { useToastStore } from '../store/useToastStore';
import { useUserStore } from '../store/useUserStore';
import { REGIONS_LIST } from '../data/musicPreferences';
import { resolveEffectiveRegion } from '../lib/recommendationEngine';

interface SidebarProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { playlists, createPlaylist } = useLibraryStore();
  const { showToast } = useToastStore();
  const { user, setSessionModalOpen, setIsOnboardingOpen, selectedLanguages, selectedRegion } = useUserStore();

  const effectiveRegion = resolveEffectiveRegion(selectedRegion, user?.city || user?.region);
  const currentRegionMeta = REGIONS_LIST.find((r) => r.id === effectiveRegion) || REGIONS_LIST[1];

  const handleCreatePlaylist = () => {
    createPlaylist('');
    showToast('Created new playlist');
    onViewChange('library');
  };

  return (
    <div className="w-64 bg-black h-full flex flex-col hidden md:flex shrink-0 select-none">
      <div className="p-6">
        <div 
          onClick={() => onViewChange('home')}
          className="flex items-center gap-3 mb-8 text-white font-bold text-2xl tracking-tighter cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20">
            <Music className="w-5 h-5 text-black fill-black" />
          </div>
          Spotify
        </div>

        <nav className="space-y-4">
          <button 
            onClick={() => onViewChange('home')}
            className={`flex items-center gap-4 text-sm font-semibold transition-colors w-full text-left ${currentView === 'home' ? 'text-white' : 'text-neutral-400 hover:text-white'}`}
          >
            <Home className="w-6 h-6" />
            Home
          </button>
          <button 
            onClick={() => onViewChange('search')}
            className={`flex items-center gap-4 text-sm font-semibold transition-colors w-full text-left ${currentView === 'search' ? 'text-white' : 'text-neutral-400 hover:text-white'}`}
          >
            <Search className="w-6 h-6" />
            Search
          </button>
          <button 
            onClick={() => onViewChange('library')}
            className={`flex items-center gap-4 text-sm font-semibold transition-colors w-full text-left ${currentView === 'library' ? 'text-white' : 'text-neutral-400 hover:text-white'}`}
          >
            <LibraryIcon className="w-6 h-6" />
            Your Library
          </button>
          <button 
            onClick={() => setIsOnboardingOpen(true)}
            className="flex items-center gap-4 text-sm font-semibold text-neutral-400 hover:text-white transition-colors w-full text-left group"
          >
            <SlidersHorizontal className="w-6 h-6 text-green-400 group-hover:scale-110 transition-transform" />
            <span className="flex-1">Tune Engine</span>
            <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded font-mono">
              {selectedLanguages.length}
            </span>
          </button>
        </nav>

        {/* REGIONAL HUB QUICK SHORTCUT */}
        <div className="mt-6 pt-4 border-t border-neutral-800/80">
          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/60 hover:bg-neutral-800/90 border border-white/5 hover:border-white/15 transition-all text-left group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-lg">{currentRegionMeta.flagEmoji}</span>
              <div className="truncate">
                <p className="text-xs font-bold text-white group-hover:text-green-400 truncate transition-colors">
                  {currentRegionMeta.name.split('&')[0].trim()}
                </p>
                <p className="text-[10px] text-neutral-400 truncate">
                  {currentRegionMeta.nativeScript}
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-md font-bold shrink-0">
              Active
            </span>
          </button>
        </div>

        <div className="mt-4 space-y-4 pt-4 border-t border-neutral-800">
          <button 
            onClick={handleCreatePlaylist}
            className="flex items-center gap-4 text-sm font-semibold text-neutral-400 hover:text-white transition-colors w-full text-left"
          >
            <div className="w-6 h-6 bg-neutral-300 text-black flex items-center justify-center rounded-sm">
              <PlusSquare className="w-4 h-4" />
            </div>
            Create Playlist
          </button>
          <button 
            onClick={() => onViewChange('library')}
            className="flex items-center gap-4 text-sm font-semibold text-neutral-400 hover:text-white transition-colors w-full text-left"
          >
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-600 to-blue-300 text-white flex items-center justify-center rounded-sm">
              <Heart className="w-4 h-4 fill-white" />
            </div>
            Liked Songs
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-6 py-2 border-t border-neutral-800">
        {playlists.length > 0 ? (
          <ul className="space-y-3 text-sm text-neutral-400 font-medium">
            {playlists.map((pl) => (
              <li 
                key={pl.id} 
                onClick={() => onViewChange('library')}
                className="hover:text-white cursor-pointer truncate transition-colors"
              >
                {pl.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-neutral-500 italic">No custom playlists yet</p>
        )}
      </div>

      {/* Auto IP Login Session Footer */}
      {user && (
        <div className="p-4 border-t border-neutral-800/80 bg-neutral-950">
          <button
            onClick={() => setSessionModalOpen(true)}
            className="w-full flex items-center gap-3 p-2 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 border border-white/5 hover:border-white/10 transition-all text-left group"
          >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm`}>
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                <p className="text-xs font-bold text-white group-hover:text-green-400 truncate transition-colors">
                  {user.displayName}
                </p>
              </div>
              <p className="text-[10px] text-neutral-400 font-mono truncate">
                IP: {user.ipAddress}
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

