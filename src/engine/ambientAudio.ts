import { WeatherMode } from '../data/virginiaTrees';

export class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private enabled = false;

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    if (!this.enabled) {
      this.start();
    } else {
      this.stop();
    }
    return this.enabled;
  }

  private initContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    this.ctx = ctx;

    // 4-second looping pink-ish noise buffer for organic wind & rain
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.masterGain = master;

    // Wind-through-leaves layer
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = buffer;
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 340;
    windFilter.Q.value = 1.6;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.2;
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    windSrc.start();
    this.windFilter = windFilter;
    this.windGain = windGain;

    // Soft rain patter layer
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = buffer;
    rainSrc.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.value = 1200;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    rainSrc.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(master);
    rainSrc.start();
    this.rainFilter = rainFilter;
    this.rainGain = rainGain;
  }

  public start() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.enabled = true;
    this.masterGain.gain.setTargetAtTime(0.65, this.ctx.currentTime, 0.35);
  }

  public stop() {
    this.enabled = false;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.25);
    }
  }

  public update(windStrength: number, weather: WeatherMode, weatherIntensity: number) {
    if (!this.ctx || !this.enabled || !this.windFilter || !this.windGain || !this.rainGain) {
      return;
    }
    const now = this.ctx.currentTime;
    const w = Math.max(0.05, Math.min(1, windStrength));
    this.windFilter.frequency.setTargetAtTime(220 + w * 540, now, 0.2);
    this.windGain.gain.setTargetAtTime(0.08 + w * 0.42, now, 0.2);

    const rainTarget = weather === 'rain' ? 0.08 + weatherIntensity * 0.32 : 0.0;
    this.rainGain.gain.setTargetAtTime(rainTarget, now, 0.3);
  }

  public playUiSfx(kind: 'tick' | 'pop' | 'open' | 'back' | 'whoosh') {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (kind === 'tick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.04);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.055);
    } else if (kind === 'pop') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.08);
      gain.gain.setValueAtTime(0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.11);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (kind === 'open') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(560, now + 0.16);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.24);
    } else if (kind === 'back') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.13);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.17);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(380, now + 0.18);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  }

  public dispose() {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
