import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Player } from './components/Player';
import { NowPlayingInterface } from './components/NowPlayingInterface';
import { Toast } from './components/Toast';
import { SongActionSheet } from './components/SongActionSheet';
import { QueueDrawer } from './components/QueueDrawer';
import { UserSessionModal } from './components/UserSessionModal';
import { OnboardingModal } from './components/OnboardingModal';
import { DynamicBackground } from './components/DynamicBackground';
import { Home } from './views/Home';
import { Search } from './views/Search';
import { Library } from './views/Library';
import { ArtistView } from './views/ArtistView';
import { ViewState, Artist } from './types';
import { Home as HomeIcon, Search as SearchIcon, Library as LibraryIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useUserStore } from './store/useUserStore';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const { initAutoLogin } = useUserStore();

  useEffect(() => {
    initAutoLogin();
  }, [initAutoLogin]);

  const handleSelectArtist = (artist: Artist) => {
    setSelectedArtist(artist);
    setCurrentView('artist');
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query.trim() && currentView !== 'search') {
      setCurrentView('search');
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-black text-white font-sans overflow-hidden select-none">
      <div className="flex-1 flex overflow-hidden">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        
        <div className="flex-1 flex flex-col relative rounded-lg bg-neutral-950 overflow-hidden md:my-2 md:mr-2 border border-white/5 shadow-2xl">
          <DynamicBackground className="flex-1 flex flex-col">
            <div className="absolute top-0 left-0 right-0 z-20">
              <Topbar currentView={currentView} onSearchChange={handleSearchChange} />
            </div>
            
            <AnimatePresence mode="wait" initial={false}>
              {currentView === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                  className="flex-1 flex flex-col overflow-hidden w-full h-full"
                >
                  <Home onSelectArtist={handleSelectArtist} />
                </motion.div>
              )}
              {currentView === 'search' && (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                  className="flex-1 flex flex-col overflow-hidden w-full h-full"
                >
                  <Search query={searchQuery} />
                </motion.div>
              )}
              {currentView === 'library' && (
                <motion.div
                  key="library"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                  className="flex-1 flex flex-col overflow-hidden w-full h-full"
                >
                  <Library />
                </motion.div>
              )}
              {currentView === 'artist' && selectedArtist && (
                <motion.div
                  key={`artist-${selectedArtist.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                  className="flex-1 flex flex-col overflow-hidden w-full h-full"
                >
                  <ArtistView artist={selectedArtist} />
                </motion.div>
              )}
            </AnimatePresence>
          </DynamicBackground>
        </div>
      </div>
      
      <Toast />
      <Player />

      {/* Mobile Bottom Navigation Bar: Home, Search, Library */}
      <div className="md:hidden h-16 bg-neutral-900/95 backdrop-blur-md flex items-center justify-around border-t border-white/10 z-40 shrink-0 select-none">
        <button 
          onClick={() => setCurrentView('home')}
          className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'home' ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
        >
          <HomeIcon className="w-6 h-6" />
          <span className="text-[10px]">Home</span>
        </button>
        <button 
          onClick={() => setCurrentView('search')}
          className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'search' ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
        >
          <SearchIcon className="w-6 h-6" />
          <span className="text-[10px]">Search</span>
        </button>
        <button 
          onClick={() => setCurrentView('library')}
          className={`flex flex-col items-center gap-1 transition-colors ${currentView === 'library' ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
        >
          <LibraryIcon className="w-6 h-6" />
          <span className="text-[10px]">Library</span>
        </button>
      </div>
      
      <NowPlayingInterface />
      <SongActionSheet />
      <QueueDrawer />
      <UserSessionModal />
      <OnboardingModal />
    </div>
  );
}

