// HorizonAudioHub: Lightweight shared Web Audio analyzer & 360° horizon light distributor.
// Packs up to 6 simultaneous audio/voice emitters into zero-allocation Float32Arrays
// consumed directly by both Paper Sky and Virginia Sylva sky dome fragment shaders.

export const MAX_HORIZON_AUDIO_SOURCES = 6;

export interface HorizonAudioSourceMeta {
  id: string;
  label: string;
  kind: 'track' | 'ambient' | 'local-mic' | 'peer' | 'instrument';
  azimuthRad: number; // -PI..PI around 360° horizon circle
  arcHalfRad: number; // ~1.05 rad (~120° = 1/3 circle) for dominant track; ~0.55..0.85 for voice
  outerGlow: number; // 0.60..0.72 soft wide outer gradient veil visible from any POV
  colorHex: string;
  rgb: [number, number, number];
  level: number; // 0..1 smoothed live energy
  spectralTilt: number; // 0..1 high-vs-low harmonic tint shift
  active: boolean;
}

export interface HorizonAudioUniformPack {
  // Each slot i (0..5): [azimuthRad, arcHalfRad, level, spectralTilt]
  posData: Float32Array;
  // Each slot i (0..5): [r, g, b, outerGlow]
  colData: Float32Array;
  activeCount: number;
  masterEnergy: number;
  glowStrength: number;
}

export const VOICE_COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: 'Aurora Cyan', hex: '#4ee6f5' },
  { name: 'Iris Violet', hex: '#9b7bff' },
  { name: 'Blossom Rose', hex: '#f778b4' },
  { name: 'Sunlit Amber', hex: '#ffae4d' },
  { name: 'Sylva Emerald', hex: '#4ee094' },
  { name: 'Coral Ember', hex: '#ff6f61' },
  { name: 'Cobalt Sky', hex: '#5596ff' },
  { name: 'Pearl Gold', hex: '#f4dc82' },
];

export function hexToRgbNorm(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
    : clean.padEnd(6, '0');
  const num = parseInt(full, 16);
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255,
  ];
}

interface InternalSource {
  meta: HorizonAudioSourceMeta;
  analyser: AnalyserNode | null;
  freqBuf: Uint8Array<ArrayBuffer> | null;
  smoothedLevel: number;
  smoothedTilt: number;
  syntheticPhase: number;
}

export class HorizonAudioHub {
  private ctx: AudioContext | null = null;
  private sources = new Map<string, InternalSource>();
  private posData = new Float32Array(MAX_HORIZON_AUDIO_SOURCES * 4);
  private colData = new Float32Array(MAX_HORIZON_AUDIO_SOURCES * 4);
  private glowStrength = 1.0;

  // Local Audio File Player state
  private trackEl: HTMLAudioElement | null = null;
  private trackMediaSrc: MediaElementAudioSourceNode | null = null;
  private trackAnalyser: AnalyserNode | null = null;
  private trackGain: GainNode | null = null;
  private trackUrl: string | null = null;
  private trackName: string | null = null;
  private trackPlaying = false;
  private trackAzimuth = 0.25;
  private trackColorHex = '#4ee6f5';

  // Local ambient generative horizon synth (lightweight harmonic drone when user clicks built-in sound)
  private ambientActive = false;
  private ambientAzimuth = -1.15;
  private ambientColorHex = '#9b7bff';

  // Local microphone monitor (optional in local mode or call mode)
  private localMicStream: MediaStream | null = null;
  private localMicSrc: MediaStreamAudioSourceNode | null = null;
  private localMicAnalyser: AnalyserNode | null = null;
  private localMicActive = false;
  private localMicAzimuth = 0.0;
  private localMicColorHex = '#f778b4';

  private listeners = new Set<() => void>();

  public ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public setGlowStrength(strength: number) {
    this.glowStrength = Math.max(0, Math.min(1.6, strength));
    this.notify();
  }

  public getGlowStrength(): number {
    return this.glowStrength;
  }

  // ── 1. Local Audio File Track (1/3rd circle dominant arc + 65% outer fade) ──
  public async loadAudioFile(file: File): Promise<void> {
    const ctx = this.ensureContext();
    if (this.trackUrl) {
      URL.revokeObjectURL(this.trackUrl);
    }
    const url = URL.createObjectURL(file);
    this.trackUrl = url;
    this.trackName = file.name.replace(/\.[^/.]+$/, '');

    if (!this.trackEl) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.loop = true;
      audio.preload = 'auto';
      audio.addEventListener('play', () => {
        this.trackPlaying = true;
        this.syncTrackSource();
        this.notify();
      });
      audio.addEventListener('pause', () => {
        this.trackPlaying = false;
        this.syncTrackSource();
        this.notify();
      });
      this.trackEl = audio;

      const mediaSrc = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      const gain = ctx.createGain();
      gain.gain.value = 0.85;
      mediaSrc.connect(analyser);
      analyser.connect(gain);
      gain.connect(ctx.destination);

      this.trackMediaSrc = mediaSrc;
      this.trackAnalyser = analyser;
      this.trackGain = gain;
    }

    this.trackEl.src = url;
    this.trackEl.currentTime = 0;
    try {
      await this.trackEl.play();
      this.trackPlaying = true;
    } catch {
      this.trackPlaying = false;
    }
    this.syncTrackSource();
    this.notify();
  }

  public toggleTrackPlayback(): boolean {
    if (!this.trackEl || !this.trackUrl) return false;
    this.ensureContext();
    if (this.trackEl.paused) {
      void this.trackEl.play();
      this.trackPlaying = true;
    } else {
      this.trackEl.pause();
      this.trackPlaying = false;
    }
    this.syncTrackSource();
    this.notify();
    return this.trackPlaying;
  }

  public clearTrack() {
    if (this.trackEl) {
      this.trackEl.pause();
      this.trackEl.removeAttribute('src');
    }
    if (this.trackUrl) {
      URL.revokeObjectURL(this.trackUrl);
      this.trackUrl = null;
    }
    this.trackName = null;
    this.trackPlaying = false;
    this.sources.delete('local-track');
    this.notify();
  }

  public setTrackColor(hex: string) {
    this.trackColorHex = hex;
    this.syncTrackSource();
    this.notify();
  }

  public setTrackAzimuth(rad: number) {
    this.trackAzimuth = rad;
    this.syncTrackSource();
    this.notify();
  }

  public setTrackVolume(vol: number) {
    if (this.trackGain && this.ctx) {
      this.trackGain.gain.setTargetAtTime(Math.max(0, Math.min(1.2, vol)), this.ctx.currentTime, 0.05);
    }
  }

  public getTrackInfo() {
    return {
      name: this.trackName,
      playing: this.trackPlaying,
      azimuthRad: this.trackAzimuth,
      colorHex: this.trackColorHex,
      hasTrack: Boolean(this.trackUrl),
    };
  }

  private syncTrackSource() {
    if (!this.trackUrl || !this.trackAnalyser) {
      this.sources.delete('local-track');
      return;
    }
    const existing = this.sources.get('local-track');
    const rgb = hexToRgbNorm(this.trackColorHex);
    const meta: HorizonAudioSourceMeta = {
      id: 'local-track',
      label: this.trackName || 'Audio Track',
      kind: 'track',
      azimuthRad: this.trackAzimuth,
      // ~1/3rd of the 360° circle (120° total = 60° half-angle = 1.047 rad)
      arcHalfRad: 1.05,
      // 65% outer glow gradient fade visible from any POV
      outerGlow: 0.68,
      colorHex: this.trackColorHex,
      rgb,
      level: existing?.smoothedLevel ?? 0,
      spectralTilt: existing?.smoothedTilt ?? 0.5,
      active: this.trackPlaying,
    };
    this.sources.set('local-track', {
      meta,
      analyser: this.trackAnalyser,
      freqBuf: existing?.freqBuf ?? new Uint8Array(this.trackAnalyser.frequencyBinCount),
      smoothedLevel: existing?.smoothedLevel ?? 0,
      smoothedTilt: existing?.smoothedTilt ?? 0.5,
      syntheticPhase: existing?.syntheticPhase ?? 0,
    });
  }

  // ── 2. Built-in Blue Ridge Ambient Soundscape Horizon Emitter ───────────────
  public setAmbientActive(active: boolean, windStrength = 0.35) {
    this.ambientActive = active;
    if (!active) {
      this.sources.delete('ambient-sky');
      this.notify();
      return;
    }
    const existing = this.sources.get('ambient-sky');
    const rgb = hexToRgbNorm(this.ambientColorHex);
    this.sources.set('ambient-sky', {
      meta: {
        id: 'ambient-sky',
        label: 'Blue Ridge Wind',
        kind: 'ambient',
        azimuthRad: this.ambientAzimuth,
        arcHalfRad: 1.05,
        outerGlow: 0.66,
        colorHex: this.ambientColorHex,
        rgb,
        level: Math.max(0.26, Math.min(0.75, 0.28 + windStrength * 0.45)),
        spectralTilt: 0.48,
        active: true,
      },
      analyser: null,
      freqBuf: null,
      smoothedLevel: existing?.smoothedLevel ?? 0.32,
      smoothedTilt: existing?.smoothedTilt ?? 0.48,
      syntheticPhase: existing?.syntheticPhase ?? 0,
    });
    this.notify();
  }

  public setAmbientColor(hex: string) {
    this.ambientColorHex = hex;
    const entry = this.sources.get('ambient-sky');
    if (entry) {
      entry.meta.colorHex = hex;
      entry.meta.rgb = hexToRgbNorm(hex);
      this.notify();
    }
  }

  // ── 3. Local Microphone Horizon Emitter (Local Monitor OR Shared from Call) ─
  public attachLocalMicStream(stream: MediaStream | null, colorHex?: string, azimuthRad?: number) {
    if (colorHex) this.localMicColorHex = colorHex;
    if (typeof azimuthRad === 'number') this.localMicAzimuth = azimuthRad;

    if (this.localMicSrc) {
      try {
        this.localMicSrc.disconnect();
      } catch {
        // ignore
      }
      this.localMicSrc = null;
      this.localMicAnalyser = null;
    }

    if (!stream) {
      this.localMicActive = false;
      this.sources.delete('local-mic');
      this.notify();
      return;
    }

    const ctx = this.ensureContext();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    src.connect(analyser);

    this.localMicSrc = src;
    this.localMicAnalyser = analyser;
    this.localMicActive = true;

    this.sources.set('local-mic', {
      meta: {
        id: 'local-mic',
        label: 'Your Voice',
        kind: 'local-mic',
        azimuthRad: this.localMicAzimuth,
        arcHalfRad: 0.88,
        outerGlow: 0.66,
        colorHex: this.localMicColorHex,
        rgb: hexToRgbNorm(this.localMicColorHex),
        level: 0,
        spectralTilt: 0.5,
        active: true,
      },
      analyser,
      freqBuf: new Uint8Array(analyser.frequencyBinCount),
      smoothedLevel: 0,
      smoothedTilt: 0.5,
      syntheticPhase: 0,
    });
    this.notify();
  }

  public async toggleStandaloneMicMonitor(): Promise<boolean> {
    if (this.localMicStream) {
      this.localMicStream.getTracks().forEach((t) => t.stop());
      this.localMicStream = null;
      this.attachLocalMicStream(null);
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      this.localMicStream = stream;
      this.attachLocalMicStream(stream);
      return true;
    } catch {
      return false;
    }
  }

  public stopStandaloneMicMonitor() {
    if (this.localMicStream) {
      this.localMicStream.getTracks().forEach((t) => t.stop());
      this.localMicStream = null;
      this.attachLocalMicStream(null);
    }
  }

  public isStandaloneMicActive(): boolean {
    return Boolean(this.localMicStream);
  }

  public setLocalVoiceColor(hex: string) {
    this.localMicColorHex = hex;
    const entry = this.sources.get('local-mic');
    if (entry) {
      entry.meta.colorHex = hex;
      entry.meta.rgb = hexToRgbNorm(hex);
      this.notify();
    }
  }

  public setLocalVoiceAzimuth(rad: number) {
    this.localMicAzimuth = rad;
    const entry = this.sources.get('local-mic');
    if (entry) {
      entry.meta.azimuthRad = rad;
      this.notify();
    }
  }

  // ── 4. Remote WebRTC Peer Voice Emitters ────────────────────────────────────
  public registerPeerAudio(
    peerId: string,
    label: string,
    analyser: AnalyserNode | null,
    colorHex: string,
    azimuthRad: number,
  ) {
    const key = `peer:${peerId}`;
    const existing = this.sources.get(key);
    this.sources.set(key, {
      meta: {
        id: key,
        label,
        kind: 'peer',
        azimuthRad,
        arcHalfRad: 0.84,
        outerGlow: 0.65,
        colorHex,
        rgb: hexToRgbNorm(colorHex),
        level: existing?.smoothedLevel ?? 0,
        spectralTilt: existing?.smoothedTilt ?? 0.5,
        active: Boolean(analyser),
      },
      analyser,
      freqBuf: analyser ? new Uint8Array(analyser.frequencyBinCount) : null,
      smoothedLevel: existing?.smoothedLevel ?? 0,
      smoothedTilt: existing?.smoothedTilt ?? 0.5,
      syntheticPhase: existing?.syntheticPhase ?? 0,
    });
    this.notify();
  }

  public updatePeerMeta(peerId: string, label: string, colorHex: string, azimuthRad: number) {
    const entry = this.sources.get(`peer:${peerId}`);
    if (!entry) return;
    entry.meta.label = label;
    entry.meta.colorHex = colorHex;
    entry.meta.rgb = hexToRgbNorm(colorHex);
    entry.meta.azimuthRad = azimuthRad;
  }

  public unregisterPeerAudio(peerId: string) {
    this.sources.delete(`peer:${peerId}`);
    this.notify();
  }

  // ── 4b. Placed 3D Instrument Ensemble Horizon Emitters ──────────────────────
  public updateInstrumentEmitters(
    emitters: {
      uid: string;
      label: string;
      azimuthRad: number;
      colorHex: string;
      level: number;
      spectralTilt: number;
    }[],
  ) {
    // Keep highest-energy instruments within budget so voices & tracks keep priority
    const sorted = [...emitters].sort((a, b) => b.level - a.level).slice(0, 4);
    const keepKeys = new Set<string>();

    for (const em of sorted) {
      const key = `inst:${em.uid}`;
      keepKeys.add(key);
      const existing = this.sources.get(key);
      this.sources.set(key, {
        meta: {
          id: key,
          label: em.label,
          kind: 'instrument',
          azimuthRad: em.azimuthRad,
          arcHalfRad: 0.78,
          outerGlow: 0.66,
          colorHex: em.colorHex,
          rgb: hexToRgbNorm(em.colorHex),
          level: em.level,
          spectralTilt: em.spectralTilt,
          active: em.level > 0.01,
        },
        analyser: null,
        freqBuf: null,
        smoothedLevel: existing?.smoothedLevel ?? em.level,
        smoothedTilt: existing?.smoothedTilt ?? em.spectralTilt,
        syntheticPhase: existing?.syntheticPhase ?? 0,
      });
    }

    Array.from(this.sources.keys()).forEach((k) => {
      if (k.startsWith('inst:') && !keepKeys.has(k)) {
        this.sources.delete(k);
      }
    });
  }

  public clearInstrumentEmitters() {
    let changed = false;
    Array.from(this.sources.keys()).forEach((k) => {
      if (k.startsWith('inst:')) {
        this.sources.delete(k);
        changed = true;
      }
    });
    if (changed) this.notify();
  }

  // ── 5. Per-Frame Zero-Alloc Uniform Sampling (Called by Active Renderer) ───
  public sampleUniforms(timeSec: number): HorizonAudioUniformPack {
    this.posData.fill(0);
    this.colData.fill(0);

    let slot = 0;
    let masterEnergy = 0;

    this.sources.forEach((src) => {
      if (slot >= MAX_HORIZON_AUDIO_SOURCES) return;
      if (!src.meta.active) return;

      let rawLevel = 0;
      let rawTilt = 0.5;

      if (src.analyser && src.freqBuf) {
        src.analyser.getByteFrequencyData(src.freqBuf);
        const len = src.freqBuf.length;
        let low = 0;
        let mid = 0;
        let high = 0;
        const lowEnd = Math.max(4, Math.floor(len * 0.16));
        const midEnd = Math.max(lowEnd + 4, Math.floor(len * 0.52));
        for (let i = 0; i < len; i++) {
          const v = src.freqBuf[i] / 255;
          if (i < lowEnd) low += v;
          else if (i < midEnd) mid += v;
          else high += v;
        }
        low /= lowEnd;
        mid /= Math.max(1, midEnd - lowEnd);
        high /= Math.max(1, len - midEnd);

        const weighted = low * 0.48 + mid * 0.42 + high * 0.28;
        // Boost voice & track responsiveness cleanly while keeping noise floor calm
        const floorCut = src.meta.kind === 'local-mic' || src.meta.kind === 'peer' ? 0.035 : 0.015;
        rawLevel = Math.min(1.0, Math.max(0, (weighted - floorCut) * 2.15));
        if (src.meta.kind === 'track' && this.trackPlaying) {
          // Keep a warm living baseline shimmer while track is playing
          rawLevel = Math.max(0.18, rawLevel);
        }
        const totalBand = low + mid + high + 0.001;
        rawTilt = Math.min(1, Math.max(0, (mid * 0.5 + high * 1.1) / totalBand));
      } else if (src.meta.kind === 'ambient') {
        // Gentle organic wind/sky breathing for built-in ambient soundscape
        const breath =
          0.5 +
          0.28 * Math.sin(timeSec * 0.55 + src.syntheticPhase) +
          0.22 * Math.sin(timeSec * 1.18 + 1.3);
        rawLevel = Math.min(0.85, src.meta.level * (0.65 + breath * 0.65));
        rawTilt = 0.42 + 0.26 * Math.sin(timeSec * 0.37);
      } else if (src.meta.kind === 'instrument') {
        rawLevel = Math.min(1.0, src.meta.level);
        rawTilt = src.meta.spectralTilt;
      }

      // Smooth attack / release so horizon aurora breathes like real atmospheric light
      const alpha = rawLevel > src.smoothedLevel ? 0.24 : 0.085;
      src.smoothedLevel += (rawLevel - src.smoothedLevel) * alpha;
      src.smoothedTilt += (rawTilt - src.smoothedTilt) * 0.12;
      src.meta.level = src.smoothedLevel;
      src.meta.spectralTilt = src.smoothedTilt;

      if (src.smoothedLevel < 0.006) return;

      const off = slot * 4;
      // Gently drift ambient azimuth very slowly; keep tracks & voices pinned to their compass angle
      const az =
        src.meta.kind === 'ambient'
          ? src.meta.azimuthRad + Math.sin(timeSec * 0.09) * 0.35
          : src.meta.azimuthRad;

      this.posData[off + 0] = az;
      this.posData[off + 1] = src.meta.arcHalfRad;
      this.posData[off + 2] = Math.min(1.25, src.smoothedLevel * this.glowStrength);
      this.posData[off + 3] = src.smoothedTilt;

      this.colData[off + 0] = src.meta.rgb[0];
      this.colData[off + 1] = src.meta.rgb[1];
      this.colData[off + 2] = src.meta.rgb[2];
      this.colData[off + 3] = src.meta.outerGlow;

      masterEnergy = Math.max(masterEnergy, src.smoothedLevel * this.glowStrength);
      slot += 1;
    });

    return {
      posData: this.posData,
      colData: this.colData,
      activeCount: slot,
      masterEnergy,
      glowStrength: this.glowStrength,
    };
  }

  public getActiveSourcesSnapshot(): HorizonAudioSourceMeta[] {
    const list: HorizonAudioSourceMeta[] = [];
    this.sources.forEach((src) => {
      list.push({ ...src.meta });
    });
    return list;
  }

  public getLocalVoiceColor(): string {
    return this.localMicColorHex;
  }

  public getLocalVoiceAzimuth(): number {
    return this.localMicAzimuth;
  }

  public dispose() {
    this.clearTrack();
    this.stopStandaloneMicMonitor();
    this.sources.clear();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

export const sharedHorizonAudioHub = new HorizonAudioHub();
