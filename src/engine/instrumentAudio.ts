// InstrumentEnsembleEngine: Synced procedural Web Audio spatial ensemble
// for Virginia Sylva's 10 sprite-stacked 3D instruments.
// Features camera-relative stereo panning, distance attenuation, scale-coupled register,
// click-to-play note performance, Paper Sky cloud-muffled drift filter, and 360° horizon glow sync.

import {
  InstrumentId,
  PlacedSpaceItem,
  getSpaceItem,
  isInstrumentId,
} from '../data/virginiaTrees';
import { sharedHorizonAudioHub } from './horizonAudioHub';

export type MusicalScaleId =
  | 'lydian-ridge'
  | 'blue-pentatonic'
  | 'dusk-dorian'
  | 'meadow-maj9';

export interface MusicalScaleSpec {
  id: MusicalScaleId;
  label: string;
  shortLabel: string;
  rootMidi: number;
  intervals: number[]; // 8 scale degrees for playable pads (1..8)
  noteLabels: string[];
}

export const MUSICAL_SCALES: MusicalScaleSpec[] = [
  {
    id: 'lydian-ridge',
    label: 'Appalachian Lydian (F)',
    shortLabel: 'F Lydian',
    rootMidi: 53, // F3
    intervals: [0, 2, 4, 6, 7, 9, 11, 12],
    noteLabels: ['F', 'G', 'A', 'B', 'C', 'D', 'E', 'F+'],
  },
  {
    id: 'blue-pentatonic',
    label: 'Blue Ridge Pentatonic (D)',
    shortLabel: 'D Pent',
    rootMidi: 50, // D3
    intervals: [0, 2, 4, 7, 9, 12, 14, 16],
    noteLabels: ['D', 'E', 'F#', 'A', 'B', 'D+', 'E+', 'F#+'],
  },
  {
    id: 'dusk-dorian',
    label: 'Dusk Dorian (A)',
    shortLabel: 'A Dorian',
    rootMidi: 57, // A3
    intervals: [0, 2, 3, 5, 7, 9, 10, 12],
    noteLabels: ['A', 'B', 'C', 'D', 'E', 'F#', 'G', 'A+'],
  },
  {
    id: 'meadow-maj9',
    label: 'Meadow Major 9 (C)',
    shortLabel: 'C Maj9',
    rootMidi: 48, // C3
    intervals: [0, 2, 4, 7, 11, 12, 14, 16],
    noteLabels: ['C', 'D', 'E', 'G', 'B', 'C+', 'D+', 'E+'],
  },
];

export interface InstrumentVoiceSettings {
  autoPlay: boolean;
  muted: boolean;
  octaveShift: -1 | 0 | 1;
  density: number; // 0.25..1.0
}

export interface InstrumentEnsembleSnapshot {
  enabled: boolean;
  bpm: number;
  scaleId: MusicalScaleId;
  realmMode: 'ground' | 'sky';
  activeInstrumentCount: number;
  currentStep: number;
  voiceSettings: Record<string, InstrumentVoiceSettings>;
  lastTriggeredMap: Record<string, number>;
}

interface TrackedInstrument {
  uid: string;
  itemId: InstrumentId;
  x: number;
  z: number;
  scale: number;
  seed: number;
  accentHex: string;
  label: string;
  energy: number;
  lastTriggeredMs: number;
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function hashStep(seed: number, step: number): number {
  let n = (seed * 374761393 + step * 668265263) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export class InstrumentEnsembleEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private realmFilter: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayWet: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private enabled = false;
  private bpm = 86;
  private scaleId: MusicalScaleId = 'lydian-ridge';
  private realmMode: 'ground' | 'sky' = 'ground';
  private windStrength = 0.3;

  private instruments = new Map<string, TrackedInstrument>();
  private voiceSettings = new Map<string, InstrumentVoiceSettings>();

  // Camera listener state for spatial panning & distance attenuation
  private camX = 0;
  private camZ = 3.2;
  private rightX = 1;
  private rightZ = 0;

  // Sequencer clock
  private stepTimer: number | null = null;
  private horizonTimer: number | null = null;
  private currentStep = 0;
  private listeners = new Set<() => void>();

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public getScaleSpec(): MusicalScaleSpec {
    return MUSICAL_SCALES.find((s) => s.id === this.scaleId) ?? MUSICAL_SCALES[0];
  }

  public getVoiceSettings(uid: string): InstrumentVoiceSettings {
    return (
      this.voiceSettings.get(uid) ?? {
        autoPlay: true,
        muted: false,
        octaveShift: 0,
        density: 0.65,
      }
    );
  }

  public updateVoiceSettings(uid: string, patch: Partial<InstrumentVoiceSettings>) {
    const prev = this.getVoiceSettings(uid);
    this.voiceSettings.set(uid, { ...prev, ...patch });
    this.notify();
  }

  public getSnapshot(): InstrumentEnsembleSnapshot {
    const voiceObj: Record<string, InstrumentVoiceSettings> = {};
    const trigObj: Record<string, number> = {};
    this.instruments.forEach((inst, uid) => {
      voiceObj[uid] = this.getVoiceSettings(uid);
      trigObj[uid] = inst.lastTriggeredMs;
    });
    return {
      enabled: this.enabled,
      bpm: this.bpm,
      scaleId: this.scaleId,
      realmMode: this.realmMode,
      activeInstrumentCount: this.instruments.size,
      currentStep: this.currentStep,
      voiceSettings: voiceObj,
      lastTriggeredMap: trigObj,
    };
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      const ctx = new AudioCtx();
      this.ctx = ctx;

      // Realm low-pass filter (18kHz on ground ↔ 1150Hz dreamy cloud drift in Paper Sky)
      const realmFilter = ctx.createBiquadFilter();
      realmFilter.type = 'lowpass';
      realmFilter.frequency.value = this.realmMode === 'sky' ? 1150 : 18000;
      realmFilter.Q.value = 0.7;

      const masterGain = ctx.createGain();
      masterGain.gain.value = this.realmMode === 'sky' ? 0.34 : 0.72;

      // Subtle atmospheric stereo echo/shimmer bus
      const delayNode = ctx.createDelay(1.2);
      delayNode.delayTime.value = 0.36;
      const delayFeedback = ctx.createGain();
      delayFeedback.gain.value = 0.34;
      const delayFilter = ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 2800;
      const delayWet = ctx.createGain();
      delayWet.gain.value = this.realmMode === 'sky' ? 0.42 : 0.24;

      realmFilter.connect(masterGain);
      realmFilter.connect(delayNode);
      delayNode.connect(delayFilter);
      delayFilter.connect(delayFeedback);
      delayFeedback.connect(delayNode);
      delayFilter.connect(delayWet);
      delayWet.connect(masterGain);
      masterGain.connect(ctx.destination);

      this.realmFilter = realmFilter;
      this.masterGain = masterGain;
      this.delayNode = delayNode;
      this.delayFeedback = delayFeedback;
      this.delayWet = delayWet;

      // Shared 1.5s white/pink noise buffer for felt hammers, mallets & brush shakers
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.5), ctx.sampleRate);
      const data = buf.getChannelData(0);
      let b0 = 0;
      for (let i = 0; i < data.length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.92 * b0 + w * 0.22;
        data[i] = b0 * 0.75 + w * 0.25;
      }
      this.noiseBuffer = buf;
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setEnabled(next: boolean) {
    if (this.enabled === next) return;
    this.enabled = next;
    if (next) {
      this.ensureContext();
      this.startTimers();
    } else {
      this.stopTimers();
      sharedHorizonAudioHub.clearInstrumentEmitters();
    }
    this.notify();
  }

  public toggleEnabled(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  public setBpm(nextBpm: number) {
    const clamped = Math.max(64, Math.min(128, Math.round(nextBpm)));
    if (clamped === this.bpm) return;
    this.bpm = clamped;
    if (this.delayNode && this.ctx) {
      // Lock delay echo rhythmically to dotted 8th note
      const dottedEighth = (60 / this.bpm) * 0.75;
      this.delayNode.delayTime.setTargetAtTime(Math.min(1.1, dottedEighth), this.ctx.currentTime, 0.08);
    }
    if (this.enabled) {
      this.restartStepTimer();
    }
    this.notify();
  }

  public setScale(scaleId: MusicalScaleId) {
    this.scaleId = scaleId;
    this.notify();
  }

  public setWindStrength(wind: number) {
    this.windStrength = Math.max(0, Math.min(1, wind));
  }

  public setRealmMode(mode: 'ground' | 'sky') {
    if (this.realmMode === mode) return;
    this.realmMode = mode;
    if (this.ctx && this.realmFilter && this.masterGain && this.delayWet && this.delayFeedback) {
      const now = this.ctx.currentTime;
      if (mode === 'sky') {
        // Cloud-muffled dreamy drift upward into Paper Sky
        this.realmFilter.frequency.setTargetAtTime(1150, now, 0.35);
        this.masterGain.gain.setTargetAtTime(0.34, now, 0.35);
        this.delayWet.gain.setTargetAtTime(0.46, now, 0.35);
        this.delayFeedback.gain.setTargetAtTime(0.44, now, 0.35);
      } else {
        // Full-spectrum spatial garden clarity in Virginia Sylva
        this.realmFilter.frequency.setTargetAtTime(18000, now, 0.25);
        this.masterGain.gain.setTargetAtTime(0.74, now, 0.25);
        this.delayWet.gain.setTargetAtTime(0.24, now, 0.25);
        this.delayFeedback.gain.setTargetAtTime(0.32, now, 0.25);
      }
    }
    this.notify();
  }

  public syncPlacedItems(placedItems: PlacedSpaceItem[], visibleInstrumentLayer = true) {
    const nextIds = new Set<string>();
    if (visibleInstrumentLayer) {
      for (const item of placedItems) {
        if (!isInstrumentId(item.itemId)) continue;
        nextIds.add(item.uid);
        const spec = getSpaceItem(item.itemId);
        const existing = this.instruments.get(item.uid);
        this.instruments.set(item.uid, {
          uid: item.uid,
          itemId: item.itemId,
          x: item.x,
          z: item.z,
          scale: item.scale,
          seed: item.seed,
          accentHex: spec.accentHex,
          label: spec.shortName,
          energy: existing?.energy ?? 0,
          lastTriggeredMs: existing?.lastTriggeredMs ?? 0,
        });
      }
    }

    Array.from(this.instruments.keys()).forEach((uid) => {
      if (!nextIds.has(uid)) {
        this.instruments.delete(uid);
      }
    });

    if (this.instruments.size === 0) {
      sharedHorizonAudioHub.clearInstrumentEmitters();
    }
    this.notify();
  }

  public updateListener(camX: number, camZ: number, rightX: number, rightZ: number) {
    this.camX = camX;
    this.camZ = camZ;
    const len = Math.hypot(rightX, rightZ) || 1;
    this.rightX = rightX / len;
    this.rightZ = rightZ / len;
  }

  private startTimers() {
    this.restartStepTimer();
    if (this.horizonTimer === null && typeof window !== 'undefined') {
      this.horizonTimer = window.setInterval(() => {
        this.decayAndPushHorizon();
      }, 65);
    }
  }

  private restartStepTimer() {
    if (this.stepTimer !== null) {
      window.clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    if (!this.enabled || typeof window === 'undefined') return;
    // 16th-note step duration
    const stepMs = Math.max(85, Math.round((60 / this.bpm / 4) * 1000));
    this.stepTimer = window.setInterval(() => {
      this.tickStep();
    }, stepMs);
  }

  private stopTimers() {
    if (this.stepTimer !== null) {
      window.clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    if (this.horizonTimer !== null) {
      window.clearInterval(this.horizonTimer);
      this.horizonTimer = null;
    }
  }

  private decayAndPushHorizon() {
    if (this.instruments.size === 0) {
      sharedHorizonAudioHub.clearInstrumentEmitters();
      return;
    }
    const activeEmitters: {
      uid: string;
      label: string;
      azimuthRad: number;
      colorHex: string;
      level: number;
      spectralTilt: number;
    }[] = [];

    this.instruments.forEach((inst) => {
      inst.energy *= 0.87;
      if (inst.energy < 0.004) inst.energy = 0;
      if (inst.energy > 0.012) {
        const az = Math.atan2(inst.x, -inst.z);
        const tilt =
          inst.itemId === 'wind-chime-arch' || inst.itemId === 'concert-harp'
            ? 0.82
            : inst.itemId === 'standing-cello' || inst.itemId === 'bronze-gong'
              ? 0.22
              : 0.54;
        activeEmitters.push({
          uid: inst.uid,
          label: inst.label,
          azimuthRad: az,
          colorHex: inst.accentHex,
          level: Math.min(1, inst.energy),
          spectralTilt: tilt,
        });
      }
    });

    sharedHorizonAudioHub.updateInstrumentEmitters(activeEmitters);
  }

  private tickStep() {
    if (!this.enabled || this.instruments.size === 0) return;
    const step = this.currentStep;
    this.currentStep = (this.currentStep + 1) % 32;

    this.instruments.forEach((inst) => {
      const cfg = this.getVoiceSettings(inst.uid);
      if (cfg.muted || !cfg.autoPlay) return;
      const shouldPlay = this.shouldStepFire(inst, step, cfg.density);
      if (!shouldPlay) return;

      const r = hashStep(inst.seed + 71, step);
      const degree = Math.floor(r * 8) % 8;
      const vel = 0.48 + hashStep(inst.seed + 19, step) * 0.36;
      this.playVoice(inst, degree, vel, false, step);
    });
  }

  private shouldStepFire(inst: TrackedInstrument, step: number, density: number): boolean {
    const h = hashStep(inst.seed, step);
    switch (inst.itemId) {
      case 'bronze-gong':
        // Rare structural phrase anchor on beat 0 or 16
        return step % 16 === 0 && h < 0.35 + density * 0.55;
      case 'singing-bowl':
        return (step % 12 === 0 || step % 16 === 8) && h < 0.3 + density * 0.5;
      case 'standing-cello':
        return step % 8 === 0 && h < 0.45 + density * 0.45;
      case 'tape-deck':
        return step % 8 === 0 && h < 0.42 + density * 0.45;
      case 'upright-piano':
        return (step % 4 === 0 || step % 8 === 6) && h < 0.32 + density * 0.52;
      case 'concert-harp':
        return step % 2 === 0 && h < 0.24 + density * 0.48;
      case 'marimba':
        return (step % 2 === 0 || step % 4 === 3) && h < 0.28 + density * 0.46;
      case 'modular-synth':
        return h < 0.16 + density * 0.44;
      case 'drum-stack': {
        // Organic lo-fi kick / rim / brush pattern
        if (step % 8 === 0) return h < 0.72 + density * 0.25;
        if (step % 8 === 4) return h < 0.45 + density * 0.4;
        if (step % 2 === 1) return h < 0.12 + density * 0.35;
        return h < density * 0.22;
      }
      case 'wind-chime-arch': {
        // Reacts live to Virginia Sylva wind strength!
        const windBoost = 0.12 + this.windStrength * 0.52;
        return h < windBoost * (0.45 + density * 0.65);
      }
      default:
        return step % 4 === 0 && h < density * 0.5;
    }
  }

  // Manual click-to-play / pad trigger (works even if ensemble auto-loop is paused!)
  public triggerInstrumentNote(
    uid: string,
    degreeIdx?: number,
    velocity = 0.88,
  ): boolean {
    const inst = this.instruments.get(uid);
    if (!inst) return false;
    this.ensureContext();
    if (this.horizonTimer === null && typeof window !== 'undefined') {
      this.horizonTimer = window.setInterval(() => {
        this.decayAndPushHorizon();
      }, 65);
    }
    const deg =
      typeof degreeIdx === 'number'
        ? ((degreeIdx % 8) + 8) % 8
        : Math.floor(Math.random() * 8);
    this.playVoice(inst, deg, velocity, true, this.currentStep);
    this.notify();
    return true;
  }

  // Trigger a welcoming chord when a brand-new instrument is placed onto the terrain
  public triggerPlacementPreview(itemId: InstrumentId, x: number, z: number, scale: number) {
    this.ensureContext();
    const spec = getSpaceItem(itemId);
    const temp: TrackedInstrument = {
      uid: `preview:${itemId}`,
      itemId,
      x,
      z,
      scale,
      seed: 1,
      accentHex: spec.accentHex,
      label: spec.shortName,
      energy: 0,
      lastTriggeredMs: 0,
    };
    this.playVoice(temp, 0, 0.8, true, 0);
    if (itemId === 'upright-piano' || itemId === 'concert-harp' || itemId === 'tape-deck') {
      window.setTimeout(() => this.playVoice(temp, 4, 0.62, true, 2), 95);
    }
  }

  private computeSpatialMix(inst: TrackedInstrument, isManual: boolean): { gain: number; pan: number } {
    if (this.realmMode === 'sky') {
      // From Paper Sky high above, pan subtly by world X so the ensemble feels wide beneath clouds
      const pan = Math.max(-0.85, Math.min(0.85, inst.x * 0.42));
      return { gain: isManual ? 0.85 : 0.72, pan };
    }
    const dx = inst.x - this.camX;
    const dz = inst.z - this.camZ;
    const dist = Math.hypot(dx, dz);
    const atten = isManual
      ? Math.max(0.42, 1 / (1 + dist * 0.14))
      : Math.max(0.14, 1 / (1 + dist * 0.34));
    const proj = (dx * this.rightX + dz * this.rightZ) / Math.max(0.75, dist);
    const pan = Math.max(-0.92, Math.min(0.92, proj * 0.88));
    return { gain: atten, pan };
  }

  private playVoice(
    inst: TrackedInstrument,
    degreeIdx: number,
    velocity: number,
    isManual: boolean,
    step: number,
  ) {
    const ctx = this.ensureContext();
    if (!ctx || !this.realmFilter) return;

    const now = ctx.currentTime;
    const scaleSpec = this.getScaleSpec();
    const cfg = this.getVoiceSettings(inst.uid);

    // Scale-coupled register: bigger placed instruments play lower, smaller play brighter
    const sizeOctaveBias = inst.scale >= 1.28 ? -1 : inst.scale <= 0.76 ? 1 : 0;
    const octOffset = (cfg.octaveShift + sizeOctaveBias) * 12;
    const baseMidi = scaleSpec.rootMidi + scaleSpec.intervals[degreeIdx % scaleSpec.intervals.length] + octOffset;

    const spatial = this.computeSpatialMix(inst, isManual);
    const outGain = ctx.createGain();
    outGain.gain.value = spatial.gain * velocity;

    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = spatial.pan;
      outGain.connect(panner);
      panner.connect(this.realmFilter);
    } else {
      outGain.connect(this.realmFilter);
    }

    // Record live visual pulse + horizon glow energy
    inst.energy = Math.min(1.0, Math.max(inst.energy, 0.42 + velocity * 0.52));
    inst.lastTriggeredMs = performance.now();

    switch (inst.itemId) {
      case 'upright-piano': {
        const freq = midiToFreq(baseMidi + 12);
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(freq, now);
        osc2.frequency.setValueAtTime(freq * 2.001, now);
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(2400, now);
        filt.frequency.exponentialRampToValueAtTime(520, now + 1.4);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, now);
        env.gain.linearRampToValueAtTime(0.28, now + 0.012);
        env.gain.exponentialRampToValueAtTime(0.0008, now + 1.75);
        const g2 = ctx.createGain();
        g2.gain.value = 0.25;
        osc1.connect(filt);
        osc2.connect(g2);
        g2.connect(filt);
        filt.connect(env);
        env.connect(outGain);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.8);
        osc2.stop(now + 1.8);
        break;
      }

      case 'concert-harp': {
        const freq = midiToFreq(baseMidi + 12);
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(Math.min(5800, freq * 7.5), now);
        filt.frequency.exponentialRampToValueAtTime(Math.max(380, freq * 1.4), now + 0.65);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, now);
        env.gain.linearRampToValueAtTime(0.22, now + 0.006);
        env.gain.exponentialRampToValueAtTime(0.0006, now + 1.9);
        osc.connect(filt);
        filt.connect(env);
        env.connect(outGain);
        osc.start(now);
        osc.stop(now + 1.95);
        break;
      }

      case 'marimba': {
        const freq = midiToFreq(baseMidi + 12);
        const fund = ctx.createOscillator();
        const over = ctx.createOscillator();
        fund.type = 'sine';
        over.type = 'sine';
        fund.frequency.setValueAtTime(freq, now);
        over.frequency.setValueAtTime(freq * 4.0, now);
        const env1 = ctx.createGain();
        env1.gain.setValueAtTime(0.0001, now);
        env1.gain.linearRampToValueAtTime(0.32, now + 0.004);
        env1.gain.exponentialRampToValueAtTime(0.0008, now + 0.55);
        const env2 = ctx.createGain();
        env2.gain.setValueAtTime(0.0001, now);
        env2.gain.linearRampToValueAtTime(0.11, now + 0.003);
        env2.gain.exponentialRampToValueAtTime(0.0008, now + 0.09);
        fund.connect(env1);
        over.connect(env2);
        env1.connect(outGain);
        env2.connect(outGain);
        fund.start(now);
        over.start(now);
        fund.stop(now + 0.6);
        over.stop(now + 0.12);
        break;
      }

      case 'standing-cello': {
        const freq = midiToFreq(baseMidi - 12);
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, now);
        osc2.frequency.setValueAtTime(freq * 1.0035, now);

        const vib = ctx.createOscillator();
        const vibGain = ctx.createGain();
        vib.frequency.value = 4.6;
        vibGain.gain.value = freq * 0.007;
        vib.connect(vibGain);
        vibGain.connect(osc1.frequency);

        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(680, now);
        filt.Q.value = 1.6;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, now);
        env.gain.linearRampToValueAtTime(0.22, now + 0.38);
        env.gain.setTargetAtTime(0.16, now + 0.55, 0.5);
        env.gain.exponentialRampToValueAtTime(0.0008, now + 2.65);

        osc1.connect(filt);
        osc2.connect(filt);
        filt.connect(env);
        env.connect(outGain);
        osc1.start(now);
        osc2.start(now);
        vib.start(now);
        osc1.stop(now + 2.75);
        osc2.stop(now + 2.75);
        vib.stop(now + 2.75);
        break;
      }

      case 'modular-synth': {
        const freq = midiToFreq(baseMidi);
        const osc = ctx.createOscillator();
        const sub = ctx.createOscillator();
        osc.type = 'sawtooth';
        sub.type = 'square';
        osc.frequency.setValueAtTime(freq, now);
        sub.frequency.setValueAtTime(freq * 0.5, now);
        const subG = ctx.createGain();
        subG.gain.value = 0.25;

        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.Q.value = 6.5;
        filt.frequency.setValueAtTime(Math.min(4800, freq * 9), now);
        filt.frequency.exponentialRampToValueAtTime(Math.max(180, freq * 1.15), now + 0.34);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, now);
        env.gain.linearRampToValueAtTime(0.24, now + 0.008);
        env.gain.exponentialRampToValueAtTime(0.0008, now + 0.45);

        osc.connect(filt);
        sub.connect(subG);
        subG.connect(filt);
        filt.connect(env);
        env.connect(outGain);
        osc.start(now);
        sub.start(now);
        osc.stop(now + 0.5);
        sub.stop(now + 0.5);
        break;
      }

      case 'tape-deck': {
        // Warm lo-fi tape triad pad with gentle wow/flutter pitch drift
        const chordOffsets = [0, 7, 12];
        const lfo = ctx.createOscillator();
        const lfoG = ctx.createGain();
        lfo.frequency.value = 1.75;
        lfoG.gain.value = 2.4;
        lfo.connect(lfoG);

        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 1350;

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, now);
        env.gain.linearRampToValueAtTime(0.16, now + 0.65);
        env.gain.exponentialRampToValueAtTime(0.0008, now + 3.1);
        filt.connect(env);
        env.connect(outGain);

        chordOffsets.forEach((semi, idx) => {
          const o = ctx.createOscillator();
          o.type = idx === 1 ? 'sine' : 'triangle';
          o.frequency.setValueAtTime(midiToFreq(baseMidi + semi) * (1 + (idx - 1) * 0.0028), now);
          lfoG.connect(o.frequency);
          o.connect(filt);
          o.start(now);
          o.stop(now + 3.2);
        });
        lfo.start(now);
        lfo.stop(now + 3.2);
        break;
      }

      case 'drum-stack': {
        // Map degree/step across lo-fi warm kick, woody rim, and brush shaker
        const mode = isManual ? degreeIdx % 3 : step % 8 === 0 ? 0 : step % 8 === 4 ? 1 : 2;
        if (mode === 0) {
          // Warm analog kick
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(128, now);
          osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
          const env = ctx.createGain();
          env.gain.setValueAtTime(0.45, now);
          env.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
          osc.connect(env);
          env.connect(outGain);
          osc.start(now);
          osc.stop(now + 0.26);
        } else if (mode === 1) {
          // Woody rimshot / clave
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(640 + degreeIdx * 55, now);
          osc.frequency.exponentialRampToValueAtTime(320, now + 0.045);
          const env = ctx.createGain();
          env.gain.setValueAtTime(0.24, now);
          env.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
          osc.connect(env);
          env.connect(outGain);
          osc.start(now);
          osc.stop(now + 0.085);
        } else if (this.noiseBuffer) {
          // Brushed organic hi-hat / shaker
          const src = ctx.createBufferSource();
          src.buffer = this.noiseBuffer;
          const hp = ctx.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.value = 3800 + degreeIdx * 240;
          const env = ctx.createGain();
          env.gain.setValueAtTime(0.14, now);
          env.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          src.connect(hp);
          hp.connect(env);
          env.connect(outGain);
          src.start(now, Math.random() * 0.6, 0.1);
        }
        break;
      }

      case 'wind-chime-arch': {
        const freq = midiToFreq(baseMidi + 24);
        const ratios = [1.0, 2.756, 5.404];
        ratios.forEach((ratio, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq * ratio, now);
          const env = ctx.createGain();
          const peak = idx === 0 ? 0.14 : idx === 1 ? 0.07 : 0.03;
          const dur = idx === 0 ? 2.4 : idx === 1 ? 1.4 : 0.65;
          env.gain.setValueAtTime(0.0001, now);
          env.gain.linearRampToValueAtTime(peak, now + 0.005);
          env.gain.exponentialRampToValueAtTime(0.0005, now + dur);
          osc.connect(env);
          env.connect(outGain);
          osc.start(now);
          osc.stop(now + dur + 0.05);
        });
        break;
      }

      case 'singing-bowl': {
        const freq = midiToFreq(baseMidi);
        const partials = [
          { r: 1.0, a: 0.18, d: 4.0 },
          { r: 1.0045, a: 0.14, d: 3.8 }, // beating binaural shimmer
          { r: 2.71, a: 0.075, d: 2.8 },
        ];
        partials.forEach((p) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq * p.r, now);
          const env = ctx.createGain();
          env.gain.setValueAtTime(0.0001, now);
          env.gain.linearRampToValueAtTime(p.a, now + 0.35);
          env.gain.exponentialRampToValueAtTime(0.0006, now + p.d);
          osc.connect(env);
          env.connect(outGain);
          osc.start(now);
          osc.stop(now + p.d + 0.05);
        });
        break;
      }

      case 'bronze-gong': {
        const freq = midiToFreq(baseMidi - 12);
        const carrier = ctx.createOscillator();
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();
        carrier.type = 'sine';
        mod.type = 'sine';
        carrier.frequency.setValueAtTime(freq, now);
        mod.frequency.setValueAtTime(freq * 1.414, now);
        modGain.gain.setValueAtTime(freq * 2.2, now);
        modGain.gain.exponentialRampToValueAtTime(freq * 0.18, now + 3.4);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, now);
        env.gain.linearRampToValueAtTime(0.32, now + 0.06);
        env.gain.exponentialRampToValueAtTime(0.0006, now + 4.4);

        mod.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(env);
        env.connect(outGain);
        carrier.start(now);
        mod.start(now);
        carrier.stop(now + 4.5);
        mod.stop(now + 4.5);
        break;
      }
    }
  }

  public dispose() {
    this.stopTimers();
    sharedHorizonAudioHub.clearInstrumentEmitters();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

export const sharedInstrumentAudio = new InstrumentEnsembleEngine();
