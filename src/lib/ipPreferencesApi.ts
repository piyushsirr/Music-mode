export interface StoredIpPreferences {
  ip: string;
  displayName?: string;
  selectedLanguages: string[];
  selectedSingers: string[];
  selectedInterests?: string[];
  selectedRegion?: string;
  hasCompletedOnboarding: boolean;
  likedTrackIds?: string[];
  crossfadeDuration?: number;
  isCrossfadeEnabled?: boolean;
  volume?: number;
  visualizerMode?: 'bars' | 'wave' | 'circle' | 'hud';
  visualizerTheme?: 'neon' | 'cyber' | 'sunset' | 'cosmic' | 'mono';
  updatedAt?: string;
}

/**
 * Fetch detected IP and any previously saved preferences for this IP from the backend
 */
export async function fetchServerIpAndPreferences(clientIp?: string): Promise<{
  detectedIp: string;
  preferences: StoredIpPreferences | null;
}> {
  try {
    const url = clientIp 
      ? `/api/preferences?ip=${encodeURIComponent(clientIp)}`
      : '/api/preferences';
    
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      return {
        detectedIp: data.detectedIp || data.queriedIp || clientIp || '127.0.0.1',
        preferences: data.preferences || null,
      };
    }
  } catch (err) {
    console.warn('Could not fetch preferences by IP from server:', err);
  }

  return {
    detectedIp: clientIp || '127.0.0.1',
    preferences: null,
  };
}

/**
 * Persist preferences by IP address to the backend storage
 */
export async function saveServerIpPreferences(
  ip: string,
  preferences: Partial<StoredIpPreferences>
): Promise<{ success: boolean; preferences?: StoredIpPreferences }> {
  try {
    const res = await fetch('/api/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ip,
        preferences,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        preferences: data.preferences,
      };
    }
  } catch (err) {
    console.warn('Failed saving preferences by IP to server:', err);
  }

  return { success: false };
}
