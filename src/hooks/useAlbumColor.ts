import { useState, useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { extractPaletteFromImageUrl, ExtractedPalette, generateProceduralPalette } from '../lib/colorExtractor';

const DEFAULT_PALETTE = generateProceduralPalette('spotify-default-green');

export function useAlbumColor(): {
  palette: ExtractedPalette;
  isLoading: boolean;
  hasTrack: boolean;
} {
  const { currentTrack } = usePlayerStore();
  const [palette, setPalette] = useState<ExtractedPalette>(DEFAULT_PALETTE);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!currentTrack) {
      setPalette(DEFAULT_PALETTE);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const seed = `${currentTrack.artist}-${currentTrack.title}`;
    
    extractPaletteFromImageUrl(currentTrack.coverUrl, seed)
      .then((extracted) => {
        if (isMounted) {
          setPalette(extracted);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPalette(generateProceduralPalette(seed));
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentTrack?.coverUrl, currentTrack?.id, currentTrack?.title]);

  return {
    palette,
    isLoading,
    hasTrack: !!currentTrack,
  };
}
