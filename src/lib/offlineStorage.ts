export const CACHE_KEY_PREFIX = 'offline_track_';

export async function cacheTrackAudio(trackId: string, artist: string, title: string) {
  try {
    // Only cache if we don't already have it
    if (localStorage.getItem(CACHE_KEY_PREFIX + trackId)) return;

    // Remove oldest tracks if we exceed 3 cached tracks to avoid 5MB quota
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX));
    if (keys.length >= 3) {
      localStorage.removeItem(keys[0]); // simplistic FIFO
    }

    const q = `${artist} ${title}`.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '');
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=1`);
    const json = await res.json();
    if (json.results && json.results[0] && json.results[0].previewUrl) {
      const audioRes = await fetch(json.results[0].previewUrl);
      const blob = await audioRes.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result;
        try {
          localStorage.setItem(CACHE_KEY_PREFIX + trackId, base64data as string);
        } catch (e) {
          console.warn('LocalStorage quota exceeded, clearing old tracks', e);
          const oldKeys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX));
          oldKeys.forEach(k => localStorage.removeItem(k));
          try {
            localStorage.setItem(CACHE_KEY_PREFIX + trackId, base64data as string);
          } catch(e2) {
             console.warn('Still failing', e2);
          }
        }
      };
      reader.readAsDataURL(blob);
    }
  } catch (error) {
    console.error('Failed to cache track for offline', error);
  }
}

export function getCachedTrackAudio(trackId: string): string | null {
  return localStorage.getItem(CACHE_KEY_PREFIX + trackId);
}

export function isTrackCached(trackId: string): boolean {
  return localStorage.getItem(CACHE_KEY_PREFIX + trackId) !== null;
}
