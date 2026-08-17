import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(ms: number) {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
}

export function formatTime(seconds: number) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Checks if a track title, artist, or album is a remix, DJ edit, mashup, or non-original version
 */
export function isRemixTrack(title?: string, artist?: string, album?: string): boolean {
  if (!title) return false;
  const combined = `${title} ${artist || ''} ${album || ''}`.toLowerCase();
  
  // Strict regex targeting remixes, club mixes, dj versions, slowed reverb, mashups, etc.
  const remixRegex = /\b(remix|remixes|club mix|dj remix|dholki mix|dhol mix|bass boosted|slowed\s*(\+|\&|and)?\s*reverb|sped up|speed up|nightcore|flip remix|mashup|edm mix|extended mix|dance mix|reloaded mix|lofi remix|lo-fi remix|remake mix|tape mix)\b/i;
  
  return remixRegex.test(combined);
}

/**
 * Filters out all remix tracks from a list of tracks
 */
export function filterOutRemixes<T extends { title: string; artist?: string; album?: string }>(tracks: T[]): T[] {
  return tracks.filter((track) => !isRemixTrack(track.title, track.artist, track.album));
}
