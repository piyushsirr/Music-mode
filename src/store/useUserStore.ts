import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile } from '../types';
import { fetchServerIpAndPreferences, saveServerIpPreferences, StoredIpPreferences } from '../lib/ipPreferencesApi';

interface UserState {
  user: UserProfile | null;
  isLoading: boolean;
  isSyncingPreferences: boolean;
  lastSyncedWithIp: string | null;
  isSessionModalOpen: boolean;
  hasCompletedOnboarding: boolean;
  isOnboardingOpen: boolean;
  selectedLanguages: string[];
  selectedSingers: string[];
  selectedInterests: string[];
  selectedRegion: string;
  initAutoLogin: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  setSessionModalOpen: (open: boolean) => void;
  setIsOnboardingOpen: (open: boolean) => void;
  setOnboardingPreferences: (languages: string[], singers: string[]) => Promise<void>;
  setFullPreferences: (languages: string[], singers: string[], interests: string[], region: string) => Promise<void>;
  toggleLanguage: (lang: string) => void;
  toggleSinger: (singer: string) => void;
  toggleInterest: (interestId: string) => void;
  setSelectedRegion: (regionId: string) => void;
  saveAllPreferencesToIp: () => Promise<boolean>;
  refreshIpSession: () => Promise<void>;
}

const GRADIENTS = [
  'from-emerald-500 to-green-600',
  'from-blue-600 to-indigo-700',
  'from-purple-600 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-teal-500 to-emerald-600',
  'from-rose-500 to-pink-600',
];

function getGradientForIp(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ip.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

let syncTimeout: any = null;

async function fetchClientIpData(): Promise<{
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  isp?: string;
}> {
  // Try backend /api/ip first
  try {
    const res = await fetch('/api/ip');
    if (res.ok) {
      const data = await res.json();
      if (data.ip && data.ip !== '127.0.0.1' && data.ip !== '::1') {
        return {
          ip: data.ip,
          country: 'Auto Detected',
          countryCode: 'IN',
        };
      }
    }
  } catch {
    // Continue to external providers
  }

  // Try ipwho.is (CORS friendly, detailed)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data.success !== false && data.ip) {
        return {
          ip: data.ip,
          city: data.city,
          region: data.region,
          country: data.country,
          countryCode: data.country_code,
          isp: data.connection?.isp || data.connection?.org,
        };
      }
    }
  } catch {
    // Continue to next fallback
  }

  // Fallback to ipify.org
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data.ip) {
        return {
          ip: data.ip,
          country: 'Auto Detected',
          countryCode: 'IN',
        };
      }
    }
  } catch {
    // Continue to fallback
  }

  // Fallback to generated unique client network identity
  const pseudoIp = `103.${Math.floor(Math.random() * 200 + 20)}.${Math.floor(Math.random() * 254 + 1)}.${Math.floor(Math.random() * 254 + 1)}`;
  return {
    ip: pseudoIp,
    city: 'India Region',
    country: 'India',
    countryCode: 'IN',
  };
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isSyncingPreferences: false,
      lastSyncedWithIp: null,
      isSessionModalOpen: false,
      hasCompletedOnboarding: false,
      isOnboardingOpen: false,
      selectedLanguages: ['Hindi', 'Bhojpuri', 'Punjabi'],
      selectedSingers: ['Arijit Singh', 'Pawan Singh', 'Khesari Lal Yadav', 'Diljit Dosanjh', 'Shreya Ghoshal'],
      selectedInterests: ['romantic', 'party', 'lofi'],
      selectedRegion: 'auto',

      initAutoLogin: async () => {
        set({ isLoading: true });
        try {
          const ipData = await fetchClientIpData();
          const cleanIp = ipData.ip || '127.0.0.1';
          const gradient = getGradientForIp(cleanIp);
          
          const profile: UserProfile = {
            id: `usr_${cleanIp.replace(/[^a-zA-Z0-9]/g, '_')}`,
            ipAddress: cleanIp,
            displayName: ipData.city ? `Listener (${ipData.city})` : `IP Listener (${cleanIp.slice(0, 10)}...)`,
            city: ipData.city,
            region: ipData.region,
            country: ipData.country || 'India',
            countryCode: ipData.countryCode || 'IN',
            avatarGradient: gradient,
            isAutoLoggedIn: true,
            sessionStartedAt: new Date().toISOString(),
            isp: ipData.isp,
          };

          // Fetch stored preferences for this IP address from the server
          const serverData = await fetchServerIpAndPreferences(cleanIp);
          if (serverData.preferences) {
            const sp = serverData.preferences;
            set({
              user: {
                ...profile,
                displayName: sp.displayName || profile.displayName,
              },
              selectedLanguages: sp.selectedLanguages?.length ? sp.selectedLanguages : get().selectedLanguages,
              selectedSingers: sp.selectedSingers?.length ? sp.selectedSingers : get().selectedSingers,
              selectedInterests: sp.selectedInterests?.length ? sp.selectedInterests : get().selectedInterests,
              selectedRegion: sp.selectedRegion || get().selectedRegion,
              hasCompletedOnboarding: sp.hasCompletedOnboarding ?? true,
              isOnboardingOpen: false,
              lastSyncedWithIp: sp.updatedAt || new Date().toISOString(),
              isLoading: false,
            });
          } else {
            const currentHasCompleted = get().hasCompletedOnboarding;
            set({ 
              user: profile, 
              isLoading: false,
              isOnboardingOpen: !currentHasCompleted,
            });
            if (currentHasCompleted) {
              get().saveAllPreferencesToIp();
            }
          }
        } catch {
          const fallbackProfile: UserProfile = {
            id: `usr_auto_ip_${Date.now()}`,
            ipAddress: '103.24.120.45',
            displayName: 'Auto Listener',
            country: 'India',
            countryCode: 'IN',
            avatarGradient: 'from-emerald-500 to-green-600',
            isAutoLoggedIn: true,
            sessionStartedAt: new Date().toISOString(),
          };
          set({ user: fallbackProfile, isLoading: false });
        }
      },

      updateDisplayName: async (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        set((state) => {
          if (!state.user) return state;
          return {
            user: {
              ...state.user,
              displayName: trimmed,
            },
          };
        });

        const state = get();
        if (state.user?.ipAddress) {
          await saveServerIpPreferences(state.user.ipAddress, {
            displayName: trimmed,
            selectedLanguages: state.selectedLanguages,
            selectedSingers: state.selectedSingers,
            selectedInterests: state.selectedInterests,
            selectedRegion: state.selectedRegion,
            hasCompletedOnboarding: state.hasCompletedOnboarding,
          });
          set({ lastSyncedWithIp: new Date().toISOString() });
        }
      },

      setSessionModalOpen: (open: boolean) => set({ isSessionModalOpen: open }),

      setIsOnboardingOpen: (open: boolean) => set({ isOnboardingOpen: open }),

      setOnboardingPreferences: async (languages: string[], singers: string[]) => {
        const finalLanguages = languages.length > 0 ? languages : ['Hindi'];
        const finalSingers = singers.length > 0 ? singers : ['Arijit Singh'];

        set({
          selectedLanguages: finalLanguages,
          selectedSingers: finalSingers,
          hasCompletedOnboarding: true,
          isOnboardingOpen: false,
          isSyncingPreferences: true,
        });

        const state = get();
        const ip = state.user?.ipAddress || '127.0.0.1';
        
        try {
          const res = await saveServerIpPreferences(ip, {
            displayName: state.user?.displayName,
            selectedLanguages: finalLanguages,
            selectedSingers: finalSingers,
            selectedInterests: state.selectedInterests,
            selectedRegion: state.selectedRegion,
            hasCompletedOnboarding: true,
          });
          set({
            isSyncingPreferences: false,
            lastSyncedWithIp: res.preferences?.updatedAt || new Date().toISOString(),
          });
        } catch {
          set({ isSyncingPreferences: false });
        }
      },

      setFullPreferences: async (languages: string[], singers: string[], interests: string[], region: string) => {
        const finalLanguages = languages.length > 0 ? languages : ['Hindi'];
        const finalSingers = singers.length > 0 ? singers : ['Arijit Singh'];
        const finalInterests = interests.length > 0 ? interests : ['romantic', 'party'];
        const finalRegion = region || 'auto';

        set({
          selectedLanguages: finalLanguages,
          selectedSingers: finalSingers,
          selectedInterests: finalInterests,
          selectedRegion: finalRegion,
          hasCompletedOnboarding: true,
          isOnboardingOpen: false,
          isSyncingPreferences: true,
        });

        const state = get();
        const ip = state.user?.ipAddress || '127.0.0.1';
        
        try {
          const res = await saveServerIpPreferences(ip, {
            displayName: state.user?.displayName,
            selectedLanguages: finalLanguages,
            selectedSingers: finalSingers,
            selectedInterests: finalInterests,
            selectedRegion: finalRegion,
            hasCompletedOnboarding: true,
          });
          set({
            isSyncingPreferences: false,
            lastSyncedWithIp: res.preferences?.updatedAt || new Date().toISOString(),
          });
        } catch {
          set({ isSyncingPreferences: false });
        }
      },

      toggleLanguage: (lang: string) => {
        set((state) => {
          const exists = state.selectedLanguages.includes(lang);
          const next = exists
            ? state.selectedLanguages.filter((l) => l !== lang)
            : [...state.selectedLanguages, lang];
          return { selectedLanguages: next };
        });

        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
          get().saveAllPreferencesToIp();
        }, 1000);
      },

      toggleSinger: (singer: string) => {
        set((state) => {
          const exists = state.selectedSingers.includes(singer);
          const next = exists
            ? state.selectedSingers.filter((s) => s !== singer)
            : [...state.selectedSingers, singer];
          return { selectedSingers: next };
        });

        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
          get().saveAllPreferencesToIp();
        }, 1000);
      },

      toggleInterest: (interestId: string) => {
        set((state) => {
          const exists = state.selectedInterests.includes(interestId);
          const next = exists
            ? state.selectedInterests.filter((i) => i !== interestId)
            : [...state.selectedInterests, interestId];
          return { selectedInterests: next.length > 0 ? next : ['romantic'] };
        });

        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
          get().saveAllPreferencesToIp();
        }, 1000);
      },

      setSelectedRegion: (regionId: string) => {
        set({ selectedRegion: regionId });
        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
          get().saveAllPreferencesToIp();
        }, 800);
      },

      saveAllPreferencesToIp: async () => {
        const state = get();
        const ip = state.user?.ipAddress || '127.0.0.1';
        set({ isSyncingPreferences: true });

        const payload: StoredIpPreferences = {
          ip,
          displayName: state.user?.displayName,
          selectedLanguages: state.selectedLanguages,
          selectedSingers: state.selectedSingers,
          selectedInterests: state.selectedInterests,
          selectedRegion: state.selectedRegion,
          hasCompletedOnboarding: state.hasCompletedOnboarding,
          updatedAt: new Date().toISOString(),
        };

        const res = await saveServerIpPreferences(ip, payload);
        set({
          isSyncingPreferences: false,
          lastSyncedWithIp: res.preferences?.updatedAt || new Date().toISOString(),
        });
        return res.success;
      },

      refreshIpSession: async () => {
        set({ isLoading: true });
        const ipData = await fetchClientIpData();
        const cleanIp = ipData.ip || '127.0.0.1';
        const gradient = getGradientForIp(cleanIp);

        const updatedProfile: UserProfile = {
          id: `usr_${cleanIp.replace(/[^a-zA-Z0-9]/g, '_')}`,
          ipAddress: cleanIp,
          displayName: get().user?.displayName || (ipData.city ? `Listener (${ipData.city})` : `IP Listener`),
          city: ipData.city,
          region: ipData.region,
          country: ipData.country || 'India',
          countryCode: ipData.countryCode || 'IN',
          avatarGradient: gradient,
          isAutoLoggedIn: true,
          sessionStartedAt: new Date().toISOString(),
          isp: ipData.isp,
        };

        const serverData = await fetchServerIpAndPreferences(cleanIp);
        if (serverData.preferences) {
          const sp = serverData.preferences;
          set({
            user: {
              ...updatedProfile,
              displayName: sp.displayName || updatedProfile.displayName,
            },
            selectedLanguages: sp.selectedLanguages?.length ? sp.selectedLanguages : get().selectedLanguages,
            selectedSingers: sp.selectedSingers?.length ? sp.selectedSingers : get().selectedSingers,
            selectedInterests: sp.selectedInterests?.length ? sp.selectedInterests : get().selectedInterests,
            selectedRegion: sp.selectedRegion || get().selectedRegion,
            hasCompletedOnboarding: sp.hasCompletedOnboarding ?? true,
            lastSyncedWithIp: sp.updatedAt || new Date().toISOString(),
            isLoading: false,
          });
        } else {
          set({ user: updatedProfile, isLoading: false });
        }
      },
    }),
    {
      name: 'spotify-user-session',
      partialize: (state) => ({
        user: state.user,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        selectedLanguages: state.selectedLanguages,
        selectedSingers: state.selectedSingers,
        selectedInterests: state.selectedInterests,
        selectedRegion: state.selectedRegion,
        lastSyncedWithIp: state.lastSyncedWithIp,
      }),
    }
  )
);

