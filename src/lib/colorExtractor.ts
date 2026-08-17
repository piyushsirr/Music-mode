export interface ExtractedPalette {
  primary: string;         // e.g. "rgb(45, 120, 80)"
  secondary: string;       // e.g. "rgb(180, 80, 50)"
  accent: string;          // e.g. "#22c55e"
  dark: string;            // e.g. "rgb(18, 24, 20)"
  light: string;           // e.g. "rgb(180, 220, 200)"
  rgbPrimary: [number, number, number];
  rgbSecondary: [number, number, number];
  rgbDark: [number, number, number];
  linearGradient: string;  // CSS linear gradient for top-to-bottom main view
  meshGradient: string;    // CSS radial ambient gradient
  glowGradient: string;    // Glowing spotlight gradient
}

// Memory cache for extracted palettes by cover URL
const paletteCache = new Map<string, ExtractedPalette>();

// Preset rich music mood palettes for instant fallbacks and seed hashes
const FALLBACK_PALETTES: [number, number, number][][] = [
  [[30, 110, 60], [20, 180, 120], [12, 18, 14]],   // Spotify Emerald
  [[140, 30, 90], [220, 60, 140], [20, 12, 18]],   // Velvet Magenta
  [[30, 80, 160], [70, 140, 240], [12, 16, 24]],   // Electric Cobalt
  [[170, 70, 20], [240, 140, 40], [24, 16, 12]],   // Sunset Amber
  [[100, 30, 160], [170, 70, 240], [18, 12, 24]],  // Cyber Violet
  [[180, 30, 40], [240, 90, 80], [24, 12, 14]],    // Crimson Beat
  [[20, 130, 140], [60, 200, 200], [12, 20, 22]],  // Deep Teal
  [[130, 110, 20], [210, 180, 40], [20, 18, 12]],  // Golden Hour
  [[70, 40, 120], [140, 90, 210], [15, 12, 20]],   // Royal Indigo
  [[40, 130, 90], [100, 210, 150], [14, 20, 16]],  // Mint Jade
];

function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateProceduralPalette(seed: string = 'spotify'): ExtractedPalette {
  const index = stringHash(seed) % FALLBACK_PALETTES.length;
  const [p, s, d] = FALLBACK_PALETTES[index];
  return createPaletteFromRgb(p, s, d);
}

function createPaletteFromRgb(
  p: [number, number, number],
  s: [number, number, number],
  d?: [number, number, number]
): ExtractedPalette {
  const [pr, pg, pb] = p;
  const [sr, sg, sb] = s;
  const [dr, dg, db] = d || [
    Math.round(pr * 0.15 + 10),
    Math.round(pg * 0.15 + 10),
    Math.round(pb * 0.15 + 10)
  ];

  const primaryStr = `rgb(${pr}, ${pg}, ${pb})`;
  const secondaryStr = `rgb(${sr}, ${sg}, ${sb})`;
  const darkStr = `rgb(${dr}, ${dg}, ${db})`;
  const lightStr = `rgb(${Math.min(255, pr + 80)}, ${Math.min(255, pg + 80)}, ${Math.min(255, pb + 80)})`;

  const linearGradient = `linear-gradient(180deg, rgba(${pr}, ${pg}, ${pb}, 0.65) 0%, rgba(${sr}, ${sg}, ${sb}, 0.25) 32%, rgba(18, 18, 18, 0.85) 68%, #121212 100%)`;
  
  const meshGradient = `radial-gradient(at 0% 0%, rgba(${pr}, ${pg}, ${pb}, 0.7) 0px, transparent 60%), radial-gradient(at 100% 0%, rgba(${sr}, ${sg}, ${sb}, 0.5) 0px, transparent 55%), radial-gradient(at 50% 100%, rgba(${dr}, ${dg}, ${db}, 0.9) 0px, #121212 80%)`;

  const glowGradient = `radial-gradient(circle at 50% 0%, rgba(${pr}, ${pg}, ${pb}, 0.45) 0%, rgba(${sr}, ${sg}, ${sb}, 0.15) 50%, transparent 80%)`;

  return {
    primary: primaryStr,
    secondary: secondaryStr,
    accent: primaryStr,
    dark: darkStr,
    light: lightStr,
    rgbPrimary: [pr, pg, pb],
    rgbSecondary: [sr, sg, sb],
    rgbDark: [dr, dg, db],
    linearGradient,
    meshGradient,
    glowGradient
  };
}

// Convert RGB to HSL for quality scoring
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h * 360, s, l];
}

interface ColorBucket {
  rTotal: number;
  gTotal: number;
  bTotal: number;
  count: number;
  maxSaturation: number;
  avgLightness: number;
}

/**
 * Extract dominant colors from an image URL using in-memory Canvas analysis
 */
export async function extractPaletteFromImageUrl(
  imageUrl: string,
  fallbackSeed: string = 'default'
): Promise<ExtractedPalette> {
  if (!imageUrl) {
    return generateProceduralPalette(fallbackSeed);
  }

  if (paletteCache.has(imageUrl)) {
    return paletteCache.get(imageUrl)!;
  }

  return new Promise<ExtractedPalette>((resolve) => {
    // Timeout safeguard
    const timeout = setTimeout(() => {
      const fallback = generateProceduralPalette(fallbackSeed || imageUrl);
      paletteCache.set(imageUrl, fallback);
      resolve(fallback);
    }, 2500);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        // 12 Hue Buckets (30 degrees each)
        const buckets: ColorBucket[] = Array.from({ length: 12 }, () => ({
          rTotal: 0,
          gTotal: 0,
          bTotal: 0,
          count: 0,
          maxSaturation: 0,
          avgLightness: 0,
        }));

        let totalValidPixels = 0;
        let avgR = 0;
        let avgG = 0;
        let avgB = 0;

        // Sample every 2nd pixel (32x32 = 1024 samples) for speed
        for (let i = 0; i < data.length; i += 8) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a < 128) continue; // Skip transparent

          // Exclude extreme darks and extreme whites for dominant color picking
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          if (brightness < 20 || brightness > 245) continue;

          const [h, s, l] = rgbToHsl(r, g, b);

          // We want colors that have some saturation
          if (s < 0.15) continue;

          const bucketIdx = Math.floor(h / 30) % 12;
          const bucket = buckets[bucketIdx];

          bucket.rTotal += r;
          bucket.gTotal += g;
          bucket.bTotal += b;
          bucket.count++;
          bucket.maxSaturation = Math.max(bucket.maxSaturation, s);
          bucket.avgLightness += l;

          avgR += r;
          avgG += g;
          avgB += b;
          totalValidPixels++;
        }

        // Score buckets based on pixel count and saturation
        const scoredBuckets = buckets
          .map((b, idx) => {
            if (b.count === 0) return { idx, score: 0, r: 0, g: 0, b: 0 };
            const r = Math.round(b.rTotal / b.count);
            const g = Math.round(b.gTotal / b.count);
            const bVal = Math.round(b.bTotal / b.count);
            const avgL = b.avgLightness / b.count;
            // Prefer vibrant, mid-tone colors
            const lightnessPenalty = 1 - Math.abs(avgL - 0.45) * 1.2;
            const score = b.count * Math.pow(b.maxSaturation, 1.4) * Math.max(0.2, lightnessPenalty);
            return { idx, score, r, g, b: bVal };
          })
          .filter((b) => b.score > 0)
          .sort((a, b) => b.score - a.score);

        let primaryRgb: [number, number, number];
        let secondaryRgb: [number, number, number];

        if (scoredBuckets.length >= 1) {
          primaryRgb = [scoredBuckets[0].r, scoredBuckets[0].g, scoredBuckets[0].b];
          
          // Boost primary saturation slightly if it's too dull
          primaryRgb = boostColor(primaryRgb);

          if (scoredBuckets.length >= 2) {
            // Pick secondary from a different hue bin if possible
            const secondaryCandidate = scoredBuckets.find(
              (b) => Math.abs(b.idx - scoredBuckets[0].idx) >= 2 && Math.abs(b.idx - scoredBuckets[0].idx) <= 10
            ) || scoredBuckets[1];
            secondaryRgb = boostColor([secondaryCandidate.r, secondaryCandidate.g, secondaryCandidate.b]);
          } else {
            // Shift hue for secondary
            secondaryRgb = shiftHue(primaryRgb, 35);
          }
        } else if (totalValidPixels > 0) {
          const meanR = Math.round(avgR / totalValidPixels);
          const meanG = Math.round(avgG / totalValidPixels);
          const meanB = Math.round(avgB / totalValidPixels);
          primaryRgb = boostColor([meanR, meanG, meanB]);
          secondaryRgb = shiftHue(primaryRgb, 30);
        } else {
          // Fallback if image was all black/white
          const fallback = generateProceduralPalette(fallbackSeed);
          paletteCache.set(imageUrl, fallback);
          resolve(fallback);
          return;
        }

        const darkRgb: [number, number, number] = [
          Math.round(primaryRgb[0] * 0.12 + 10),
          Math.round(primaryRgb[1] * 0.12 + 10),
          Math.round(primaryRgb[2] * 0.12 + 10),
        ];

        const palette = createPaletteFromRgb(primaryRgb, secondaryRgb, darkRgb);
        paletteCache.set(imageUrl, palette);
        resolve(palette);
      } catch (err) {
        // Handle CORS / taint errors gracefully by using seed fallback
        const fallback = generateProceduralPalette(fallbackSeed || imageUrl);
        paletteCache.set(imageUrl, fallback);
        resolve(fallback);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      const fallback = generateProceduralPalette(fallbackSeed || imageUrl);
      paletteCache.set(imageUrl, fallback);
      resolve(fallback);
    };

    img.src = imageUrl;
  });
}

function boostColor([r, g, b]: [number, number, number]): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return [r, g, b];

  // Increase contrast from mean
  const avg = (r + g + b) / 3;
  const factor = 1.3;
  const nr = Math.min(240, Math.max(20, Math.round(avg + (r - avg) * factor)));
  const ng = Math.min(240, Math.max(20, Math.round(avg + (g - avg) * factor)));
  const nb = Math.min(240, Math.max(20, Math.round(avg + (b - avg) * factor)));
  return [nr, ng, nb];
}

function shiftHue([r, g, b]: [number, number, number], deg: number): [number, number, number] {
  const [h, s, l] = rgbToHsl(r, g, b);
  const newH = (h + deg + 360) % 360;
  // Convert HSL back to RGB
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((newH / 60) % 2) - 1));
  const m = l - c / 2;
  let nr = 0, ng = 0, nb = 0;

  if (newH < 60) { nr = c; ng = x; nb = 0; }
  else if (newH < 120) { nr = x; ng = c; nb = 0; }
  else if (newH < 180) { nr = 0; ng = c; nb = x; }
  else if (newH < 240) { nr = 0; ng = x; nb = c; }
  else if (newH < 300) { nr = x; ng = 0; nb = c; }
  else { nr = c; ng = 0; nb = x; }

  return [
    Math.round((nr + m) * 255),
    Math.round((ng + m) * 255),
    Math.round((nb + m) * 255),
  ];
}
