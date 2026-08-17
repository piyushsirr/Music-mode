import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Search as SearchIcon, 
  ShieldCheck, 
  Wifi, 
  MapPin, 
  ChevronDown, 
  Check, 
  Sparkles 
} from 'lucide-react';
import { ViewState } from '../types';
import { useUserStore } from '../store/useUserStore';
import { useToastStore } from '../store/useToastStore';
import { REGIONS_LIST } from '../data/musicPreferences';
import { resolveEffectiveRegion } from '../lib/recommendationEngine';
import { motion, AnimatePresence } from 'motion/react';

interface TopbarProps {
  currentView: ViewState;
  onSearchChange?: (query: string) => void;
}

export function Topbar({ currentView, onSearchChange }: TopbarProps) {
  const { user, setSessionModalOpen, selectedRegion, setSelectedRegion } = useUserStore();
  const { showToast } = useToastStore();
  const [isRegionMenuOpen, setIsRegionMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const effectiveRegion = resolveEffectiveRegion(selectedRegion, user?.city || user?.region);
  const currentRegionMeta = REGIONS_LIST.find((r) => r.id === effectiveRegion) || REGIONS_LIST[1];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRegionMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectRegion = (regionId: string, regionName: string) => {
    setSelectedRegion(regionId);
    setIsRegionMenuOpen(false);
    showToast(`Regional recommendations updated to ${regionName}!`);
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 bg-black/40 backdrop-blur-md border-b border-white/5 transition-colors duration-700">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center cursor-not-allowed opacity-60">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center cursor-not-allowed opacity-60">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        {currentView === 'search' && (
          <div className="relative w-56 sm:w-72 md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <SearchIcon className="h-5 w-5" />
            </div>
            <input
              type="text"
              placeholder="What do you want to listen to?"
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 rounded-full bg-neutral-800 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium"
            />
          </div>
        )}
      </div>

      {/* RIGHT SIDE CONTROLS: REGION SWITCHER & USER PROFILE */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* QUICK REGION SELECTOR DROPDOWN */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsRegionMenuOpen((prev) => !prev)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-neutral-800/90 hover:bg-neutral-700/90 border border-white/10 hover:border-white/20 transition-all text-xs font-bold text-white shadow-sm active:scale-95"
            title="Switch Regional Music Charts & Recommendations"
          >
            <span className="text-sm">{currentRegionMeta.flagEmoji}</span>
            <span className="truncate max-w-[90px] sm:max-w-[120px] md:max-w-[150px]">
              {currentRegionMeta.name.split('&')[0].trim()}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${isRegionMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* DROPDOWN MENU */}
          <AnimatePresence>
            {isRegionMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-72 sm:w-80 bg-neutral-900/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50 p-2"
              >
                <div className="px-3 py-2 border-b border-white/10 mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-green-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Regional Music Engine</span>
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    {selectedRegion === 'auto' ? 'Auto-detected' : 'Custom'}
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-neutral-700">
                  {REGIONS_LIST.map((reg) => {
                    const isSelected = selectedRegion === reg.id || (selectedRegion === 'auto' && effectiveRegion === reg.id && reg.id !== 'auto');
                    const isExactAuto = selectedRegion === 'auto' && reg.id === 'auto';
                    const active = isExactAuto || (selectedRegion === reg.id);

                    return (
                      <button
                        key={`topbar-reg-${reg.id}`}
                        onClick={() => handleSelectRegion(reg.id, reg.name)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all text-xs font-semibold ${
                          active
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'text-neutral-200 hover:bg-neutral-800/80 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base shrink-0">{reg.flagEmoji}</span>
                          <div className="truncate">
                            <div className="font-bold truncate">{reg.name}</div>
                            <div className="text-[10px] text-neutral-400 font-normal truncate">
                              {reg.nativeScript} • {reg.primaryLanguages.slice(0, 2).join(', ')}
                            </div>
                          </div>
                        </div>

                        {active && (
                          <Check className="w-4 h-4 text-green-400 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Auto-Logged In User Profile Badge */}
        {user ? (
          <button
            onClick={() => setSessionModalOpen(true)}
            title="IP Session Active • Click for details"
            className="group flex items-center gap-2 p-1 sm:p-1.5 sm:pr-3 rounded-full bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 hover:border-neutral-600 transition-all shadow-md active:scale-98"
          >
            {/* User Avatar with IP Gradient */}
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white font-bold text-xs shadow-inner shrink-0`}>
              {user.displayName.charAt(0).toUpperCase()}
            </div>

            {/* Display info */}
            <div className="flex flex-col items-start text-left leading-none hidden sm:flex">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                <span className="text-xs font-bold text-white group-hover:text-green-400 transition-colors truncate max-w-[110px] md:max-w-[130px]">
                  {user.displayName}
                </span>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono mt-0.5">
                {user.ipAddress}
              </span>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-neutral-800 px-3 py-1.5 rounded-full text-xs text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Auto Connecting...
          </div>
        )}
      </div>
    </header>
  );
}

