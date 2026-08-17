import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Globe, 
  ShieldCheck, 
  RefreshCw, 
  User, 
  Check, 
  Edit2, 
  Sparkles, 
  Wifi,
  MapPin,
  Clock,
  Languages,
  Music,
  SlidersHorizontal,
  CloudCheck,
  CloudUpload,
  Database,
  Zap,
  Flame
} from 'lucide-react';
import { useUserStore } from '../store/useUserStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useToastStore } from '../store/useToastStore';
import { REGIONS_LIST, USER_INTERESTS } from '../data/musicPreferences';

export function UserSessionModal() {
  const { 
    user, 
    isSessionModalOpen, 
    setSessionModalOpen, 
    updateDisplayName, 
    refreshIpSession, 
    isLoading,
    isSyncingPreferences,
    lastSyncedWithIp,
    selectedLanguages,
    selectedSingers,
    selectedInterests,
    selectedRegion,
    saveAllPreferencesToIp,
    setIsOnboardingOpen
  } = useUserStore();
  const { likedSongs, playlists, recentTracks } = useLibraryStore();
  const { showToast } = useToastStore();

  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(user?.displayName || '');
  const [isSavingToIp, setIsSavingToIp] = useState(false);

  if (!isSessionModalOpen || !user) return null;

  const currentRegionMeta = REGIONS_LIST.find((r) => r.id === selectedRegion) || REGIONS_LIST[0];

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      await updateDisplayName(tempName.trim());
      showToast('Display name updated & saved to IP');
    }
    setIsEditing(false);
  };

  const handleRefresh = async () => {
    await refreshIpSession();
    showToast('IP Network session refreshed');
  };

  const handleSyncToIp = async () => {
    setIsSavingToIp(true);
    const success = await saveAllPreferencesToIp();
    setIsSavingToIp(false);
    if (success) {
      showToast(`Preferences locked & saved to IP ${user.ipAddress}!`);
    } else {
      showToast('Preferences updated locally');
    }
  };

  const handleOpenPreferences = () => {
    setSessionModalOpen(false);
    setIsOnboardingOpen(true);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSessionModalOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl overflow-hidden z-10 max-h-[90vh] overflow-y-auto"
        >
          {/* Header background accent */}
          <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-r ${user.avatarGradient} opacity-25`} />

          {/* Close button */}
          <button
            onClick={() => setSessionModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-neutral-400 hover:text-white hover:bg-black/60 transition-colors z-20"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative pt-4 space-y-5">
            {/* User Avatar & Status */}
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white shadow-xl font-black text-2xl border-2 border-neutral-800 shrink-0`}>
                {user.displayName.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <form onSubmit={handleSaveName} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      autoFocus
                      className="bg-neutral-800 text-white text-sm px-2.5 py-1 rounded-lg border border-neutral-700 focus:outline-none focus:border-green-500 w-full"
                    />
                    <button
                      type="submit"
                      className="p-1.5 bg-green-500 text-black rounded-lg hover:bg-green-400 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white truncate">
                      {user.displayName}
                    </h3>
                    <button
                      onClick={() => {
                        setTempName(user.displayName);
                        setIsEditing(true);
                      }}
                      className="p-1 text-neutral-400 hover:text-white transition-colors"
                      title="Edit display name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Auto IP Login
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">
                    IP Session
                  </span>
                </div>
              </div>
            </div>

            {/* IP & Persistence Details Card */}
            <div className="bg-neutral-800/60 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-neutral-700/50 pb-2.5">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-green-400" />
                  IP Address
                </span>
                <span className="text-white font-mono font-bold bg-neutral-900/80 px-2 py-0.5 rounded border border-neutral-700/60">
                  {user.ipAddress}
                </span>
              </div>

              {/* IP Persistence Status */}
              <div className="flex items-center justify-between text-xs border-b border-neutral-700/50 pb-2.5">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  IP Preferences Sync
                </span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Stored for this IP
                </span>
              </div>

              {user.city && (
                <div className="flex items-center justify-between text-xs border-b border-neutral-700/50 pb-2.5">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    Detected City & ISP
                  </span>
                  <span className="text-white font-medium">
                    {user.city}{user.region ? `, ${user.region}` : ''} ({user.country || 'IN'})
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Authentication Status
                </span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Automatic & Persistent
                </span>
              </div>
            </div>

            {/* Recommendation Calibration Card */}
            <div className="bg-neutral-800/60 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-green-400" />
                  Recommendation Calibration
                </span>
                <button
                  onClick={handleOpenPreferences}
                  className="text-[11px] font-bold text-green-400 hover:text-green-300 flex items-center gap-1 hover:underline"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  Tune Algorithm
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {/* Region */}
                <div className="flex items-center justify-between bg-neutral-900/60 p-2 rounded-xl border border-white/5">
                  <span className="text-neutral-400 text-[11px] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-400" /> Regional Hub:
                  </span>
                  <span className="text-white font-bold text-[11px] flex items-center gap-1">
                    {currentRegionMeta.flagEmoji} {currentRegionMeta.name}
                  </span>
                </div>

                {/* Interests */}
                <div className="bg-neutral-900/60 p-2 rounded-xl border border-white/5 space-y-1">
                  <span className="text-neutral-400 text-[11px] flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" /> Favorite Vibes & Interests:
                  </span>
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    {selectedInterests?.map((intId) => {
                      const intMeta = USER_INTERESTS.find((i) => i.id === intId);
                      return (
                        <span key={intId} className="bg-neutral-800 text-neutral-200 px-2 py-0.5 rounded text-[10px] font-semibold border border-white/5">
                          {intMeta ? `${intMeta.emoji} ${intMeta.name}` : intId}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Languages */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-neutral-400 text-[11px]">Languages:</span>
                  {selectedLanguages.map((lang) => (
                    <span key={lang} className="bg-neutral-900 px-2 py-0.5 rounded text-[11px] font-medium text-white border border-white/5">
                      {lang}
                    </span>
                  ))}
                </div>

                {/* Singers */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-neutral-400 text-[11px]">Top Artists:</span>
                  <span className="text-neutral-200 text-[11px] font-medium line-clamp-1">
                    {selectedSingers.join(', ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Library Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-neutral-800/40 border border-neutral-800 rounded-xl p-2.5">
                <p className="text-base font-bold text-white">{likedSongs.length}</p>
                <p className="text-[11px] text-neutral-400">Liked Songs</p>
              </div>
              <div className="bg-neutral-800/40 border border-neutral-800 rounded-xl p-2.5">
                <p className="text-base font-bold text-white">{playlists.length}</p>
                <p className="text-[11px] text-neutral-400">Playlists</p>
              </div>
              <div className="bg-neutral-800/40 border border-neutral-800 rounded-xl p-2.5">
                <p className="text-base font-bold text-white">{recentTracks.length}</p>
                <p className="text-[11px] text-neutral-400">Recent Plays</p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                onClick={handleSyncToIp}
                disabled={isSavingToIp || isSyncingPreferences}
                className="w-full sm:flex-1 flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-green-400 font-bold text-xs py-2.5 px-3 rounded-xl border border-green-500/20 transition-colors"
                title="Save and lock all settings to current IP"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSavingToIp || isSyncingPreferences ? 'animate-spin' : ''}`} />
                <span>{isSavingToIp || isSyncingPreferences ? 'Saving to IP...' : 'Save to IP'}</span>
              </button>

              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="w-full sm:flex-1 flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs py-2.5 px-3 rounded-xl border border-neutral-700 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Detecting...' : 'Refresh IP'}
              </button>

              <button
                onClick={() => setSessionModalOpen(false)}
                className="w-full sm:w-auto bg-green-500 hover:bg-green-400 text-black font-bold text-xs py-2.5 px-6 rounded-xl transition-colors shrink-0"
              >
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
