/**
 * Audio Visualizer Engine & State Manager
 * Connects Web Audio API AnalyserNode when available and generates
 * real-time responsive frequency data for CSS-based visualizations.
 */

type Listener = (data: FrequencyData) => void;

export interface FrequencyData {
  frequencies: number[]; // 32 frequency bands (0 - 1)
  bass: number;          // 20 - 250Hz energy (0 - 1)
  lowMid: number;        // 250 - 500Hz energy (0 - 1)
  mid: number;           // 500 - 2000Hz energy (0 - 1)
  highMid: number;       // 2000 - 4000Hz energy (0 - 1)
  treble: number;        // 4000 - 16000Hz energy (0 - 1)
  peak: number;          // Overall peak volume (0 - 1)
  beatPulse: number;     // Rhythmic bass pulse multiplier (0 - 1)
  isLive: boolean;
}

class AudioVisualizerEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceMap = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();
  private activeElement: HTMLAudioElement | null = null;
  private listeners: Set<Listener> = new Set();
  private animationFrameId: number | null = null;
  private isRunning = false;
  private smoothedFrequencies: number[] = new Array(32).fill(0);
  private peakHold: number[] = new Array(32).fill(0);
  private lastTime = 0;
  private simulatedPhase = 0;
  private isPlaying = false;
  private currentProgress = 0;
  private trackSeed = 1;

  constructor() {
    // Lazy init on first user interaction
  }

  private initAudioContext() {
    if (!this.audioContext) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 64; // Produces 32 frequency bins
          this.analyser.smoothingTimeConstant = 0.82;
        }
      } catch (err) {
        console.warn('AudioContext initialization deferred:', err);
      }
    }
  }

  public registerAudioElement(element: HTMLAudioElement | null) {
    if (!element) return;
    this.activeElement = element;
    this.initAudioContext();

    if (this.audioContext && this.analyser && !this.sourceMap.has(element)) {
      try {
        const source = this.audioContext.createMediaElementSource(element);
        source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        this.sourceMap.set(element, source);
      } catch (e) {
        // Media element might already be connected or restricted by CORS
      }
    }
  }

  public setPlaybackState(isPlaying: boolean, progress = 0, trackId?: string) {
    this.isPlaying = isPlaying;
    this.currentProgress = progress;
    if (trackId) {
      // Create a deterministic seed for track frequency rhythm
      let hash = 0;
      for (let i = 0; i < trackId.length; i++) {
        hash = (hash << 5) - hash + trackId.charCodeAt(i);
        hash |= 0;
      }
      this.trackSeed = Math.abs(hash) % 1000 + 1;
    }

    if (isPlaying && !this.isRunning) {
      this.startLoop();
    } else if (!isPlaying && this.isRunning && this.listeners.size === 0) {
      this.stopLoop();
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (!this.isRunning) {
      this.startLoop();
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && !this.isPlaying) {
        this.stopLoop();
      }
    };
  }

  private startLoop() {
    this.isRunning = true;
    this.lastTime = performance.now();
    const tick = (now: number) => {
      const delta = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      this.simulatedPhase += delta;

      const data = this.calculateFrequencyData(delta);
      this.listeners.forEach((listener) => listener(data));

      if (this.isRunning) {
        this.animationFrameId = requestAnimationFrame(tick);
      }
    };
    this.animationFrameId = requestAnimationFrame(tick);
  }

  private stopLoop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private calculateFrequencyData(delta: number): FrequencyData {
    const rawFrequencies = new Uint8Array(32);
    let hasRealAudioData = false;

    if (this.analyser && this.isPlaying) {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      this.analyser.getByteFrequencyData(rawFrequencies);
      // Check if we actually got non-zero values
      for (let i = 0; i < rawFrequencies.length; i++) {
        if (rawFrequencies[i] > 0) {
          hasRealAudioData = true;
          break;
        }
      }
    }

    const bands = 32;
    const frequencies: number[] = new Array(bands);

    if (this.isPlaying) {
      const time = this.simulatedPhase;
      const bpm = 120 + (this.trackSeed % 28); // e.g. 120-148 BPM
      const beatFreq = (bpm / 60) * Math.PI * 2;
      const beatPhase = time * beatFreq;

      // Base kick drum pulse
      const kick = Math.pow(Math.max(0, Math.sin(beatPhase)), 4);
      // Snare on off-beat
      const snare = Math.pow(Math.max(0, Math.sin(beatPhase + Math.PI)), 5) * 0.8;
      // Hi-hats rhythm (16th notes)
      const hihat = Math.pow(Math.max(0, Math.sin(beatPhase * 4)), 3) * 0.7;

      for (let i = 0; i < bands; i++) {
        let targetVal = 0;

        if (hasRealAudioData) {
          targetVal = rawFrequencies[i] / 255;
        } else {
          // Dynamic synthesized spectrum tailored to frequency band characteristics
          const bandRatio = i / bands;
          // Harmonic wave patterns
          const wave1 = Math.sin(time * 3 + i * 0.45) * 0.25 + 0.25;
          const wave2 = Math.cos(time * 5.2 - i * 0.3) * 0.2 + 0.2;
          const noise = (Math.sin(time * 24 + i * 17) * 0.5 + 0.5) * 0.15;

          if (i < 4) {
            // Sub-bass & Kick (Bands 0 - 3)
            targetVal = 0.25 + kick * 0.65 + wave1 * 0.2 + noise;
          } else if (i < 10) {
            // Bass & Low Mid (Bands 4 - 9)
            targetVal = 0.2 + kick * 0.45 + snare * 0.3 + wave2 * 0.3 + noise;
          } else if (i < 20) {
            // Mids / Vocals (Bands 10 - 19)
            targetVal = 0.15 + snare * 0.4 + wave1 * 0.35 + wave2 * 0.2 + noise;
          } else {
            // High Mids & Treble / Air (Bands 20 - 31)
            targetVal = 0.1 + hihat * 0.5 + wave2 * 0.3 + (1 - bandRatio * 0.4) * noise;
          }

          // Scale by natural frequency curve (gradual roll-off at extreme highs)
          targetVal *= (1 - bandRatio * 0.35);
        }

        // Smooth interpolation for fluid organic motion
        const decaySpeed = targetVal > this.smoothedFrequencies[i] ? 14 : 7;
        this.smoothedFrequencies[i] += (targetVal - this.smoothedFrequencies[i]) * Math.min(1, delta * decaySpeed);
        frequencies[i] = Math.max(0.04, Math.min(1, this.smoothedFrequencies[i]));
      }
    } else {
      // Smooth decay to rest state
      for (let i = 0; i < bands; i++) {
        this.smoothedFrequencies[i] += (0.03 - this.smoothedFrequencies[i]) * Math.min(1, delta * 6);
        frequencies[i] = Math.max(0.02, this.smoothedFrequencies[i]);
      }
    }

    // Calculate regional energy metrics
    const bass = (frequencies[0] + frequencies[1] + frequencies[2] + frequencies[3] + frequencies[4]) / 5;
    const lowMid = (frequencies[5] + frequencies[6] + frequencies[7] + frequencies[8]) / 4;
    const mid = (frequencies[9] + frequencies[10] + frequencies[11] + frequencies[12] + frequencies[13] + frequencies[14]) / 6;
    const highMid = (frequencies[15] + frequencies[16] + frequencies[17] + frequencies[18] + frequencies[19]) / 5;
    const treble = (frequencies[20] + frequencies[21] + frequencies[22] + frequencies[24] + frequencies[28]) / 5;
    
    let peak = 0;
    for (let i = 0; i < bands; i++) {
      if (frequencies[i] > peak) peak = frequencies[i];
    }

    const beatPulse = Math.max(0, Math.min(1, bass * 1.3));

    return {
      frequencies,
      bass,
      lowMid,
      mid,
      highMid,
      treble,
      peak,
      beatPulse,
      isLive: this.isPlaying,
    };
  }
}

export const audioVisualizer = new AudioVisualizerEngine();
