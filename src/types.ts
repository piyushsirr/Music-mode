export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl: string;
  durationMs?: number;
  artistId?: string;
  releaseDate?: string;
  isFullLength?: boolean;
  youtubeId?: string;
}

export interface Artist {
  id: string;
  name: string;
  imageUrl: string;
  listeners?: string;
  bio?: string;
}

export interface LyricLine {
  time?: number; // seconds
  text: string;
}

export type ViewState = 'home' | 'search' | 'library' | 'artist';

export interface UserProfile {
  id: string;
  ipAddress: string;
  displayName: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  avatarGradient: string;
  isAutoLoggedIn: boolean;
  sessionStartedAt: string;
  isp?: string;
}

