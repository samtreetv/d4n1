// CallRoomEngine: Serverless WebRTC room & spatial call engine extracted from ONAROOM.
// Uses Trystero over Nostr relays. Remains 100% dormant in Local Mode until the user
// explicitly starts or joins a room inside the Spatial Perspective Menu.

import { joinRoom, Room } from 'trystero';
import { HorizonAudioHub, VOICE_COLOR_PRESETS } from './horizonAudioHub';

export interface CallPeerInfo {
  id: string;
  name: string;
  colorHex: string;
  seatIndex: number;
  azimuthRad: number;
  speaking: boolean;
  muted: boolean;
  volume: number;
  hasCam: boolean;
  hasScreen: boolean;
  camStream: MediaStream | null;
  screenStream: MediaStream | null;
}

export interface CallChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  colorHex: string;
  text: string;
  timestamp: number;
}

export interface CallRoomSnapshot {
  mode: 'local' | 'room';
  roomId: string | null;
  connecting: boolean;
  myName: string;
  myColorHex: string;
  micActive: boolean;
  pttActive: boolean;
  camActive: boolean;
  screenActive: boolean;
  localCamStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  peers: CallPeerInfo[];
  messages: CallChatMessage[];
  errorNotice: string | null;
}

interface PeerRuntime {
  info: CallPeerInfo;
  audioEl: HTMLAudioElement | null;
  audioSrc: MediaStreamAudioSourceNode | null;
  gainNode: GainNode | null;
  pannerNode: PannerNode | null;
  analyser: AnalyserNode | null;
}

const APP_ID = 'virginia-sylva-onaroom-v1';
const SEAT_AZIMUTHS = [Math.PI * 0.45, -Math.PI * 0.45, Math.PI * 0.85, -Math.PI * 0.85];

function randomRoomCode(): string {
  const words = ['ridge', 'sylva', 'cedar', 'bloom', 'cloud', 'paper', 'grove', 'mist'];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(100 + Math.random() * 900);
  return `${w}-${n}`;
}

export class CallRoomEngine {
  private hub: HorizonAudioHub;
  private room: Room | null = null;
  private roomId: string | null = null;
  private connecting = false;
  private myName = 'Traveler';
  private myColorHex = VOICE_COLOR_PRESETS[2].hex; // Blossom Rose default

  private micActive = false;
  private pttActive = false;
  private camActive = false;
  private screenActive = false;

  private localAudioStream: MediaStream | null = null;
  private localCamStream: MediaStream | null = null;
  private localScreenStream: MediaStream | null = null;

  private peers = new Map<string, PeerRuntime>();
  private messages: CallChatMessage[] = [];
  private errorNotice: string | null = null;

  private sendProfile:
    | ((
        data: { name: string; colorHex: string; hasCam: boolean; hasScreen: boolean },
        options?: { target?: string },
      ) => Promise<void>)
    | null = null;
  private sendChat:
    | ((data: { text: string; name: string; colorHex: string }) => Promise<void>)
    | null = null;

  private listeners = new Set<(snap: CallRoomSnapshot) => void>();

  constructor(hub: HorizonAudioHub) {
    this.hub = hub;
    this.hub.setLocalVoiceColor(this.myColorHex);
  }

  public subscribe(fn: (snap: CallRoomSnapshot) => void): () => void {
    this.listeners.add(fn);
    fn(this.getSnapshot());
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }

  public getSnapshot(): CallRoomSnapshot {
    return {
      mode: this.room ? 'room' : 'local',
      roomId: this.roomId,
      connecting: this.connecting,
      myName: this.myName,
      myColorHex: this.myColorHex,
      micActive: this.micActive,
      pttActive: this.pttActive,
      camActive: this.camActive,
      screenActive: this.screenActive,
      localCamStream: this.localCamStream,
      localScreenStream: this.localScreenStream,
      peers: Array.from(this.peers.values()).map((p) => ({ ...p.info })),
      messages: this.messages.slice(-18),
      errorNotice: this.errorNotice,
    };
  }

  public setProfile(name: string, colorHex: string) {
    const cleanName = name.trim().slice(0, 24) || 'Traveler';
    this.myName = cleanName;
    this.myColorHex = colorHex;
    this.hub.setLocalVoiceColor(colorHex);
    this.broadcastProfile();
    this.emit();
  }

  public setMyColor(colorHex: string) {
    this.myColorHex = colorHex;
    this.hub.setLocalVoiceColor(colorHex);
    this.broadcastProfile();
    this.emit();
  }

  public setMyName(name: string) {
    this.myName = name.slice(0, 24);
    this.broadcastProfile();
    this.emit();
  }

  public createAndJoinRoom(): string {
    const code = randomRoomCode();
    this.join(code);
    return code;
  }

  public join(rawRoomCode: string) {
    const clean = rawRoomCode
      .trim()
      .toLowerCase()
      .replace(/^#/, '')
      .replace(/[^a-z0-9-_]/g, '')
      .slice(0, 32);
    const code = clean || randomRoomCode();

    if (this.room) {
      this.leave();
    }

    this.errorNotice = null;
    this.connecting = true;
    this.roomId = code;
    this.emit();

    try {
      const room = joinRoom({ appId: APP_ID }, code);
      this.room = room;
      this.connecting = false;

      // Sync URL hash without breaking page history
      try {
        window.history.replaceState(null, '', `#${code}`);
      } catch {
        // ignore iframe sandbox restrictions
      }

      const profileAction = room.makeAction<{
        name: string;
        colorHex: string;
        hasCam: boolean;
        hasScreen: boolean;
      }>('profile');
      const chatAction = room.makeAction<{
        text: string;
        name: string;
        colorHex: string;
      }>('chat');

      this.sendProfile = profileAction.send;
      this.sendChat = chatAction.send;

      room.onPeerJoin(({ peerId }) => {
        this.ensurePeer(peerId);
        this.broadcastProfile(peerId);
        // Share any currently active local media streams to the newly joined peer
        if (this.localAudioStream) {
          void room.addStream(this.localAudioStream, { target: peerId, metadata: { kind: 'audio' } });
        }
        if (this.localCamStream) {
          void room.addStream(this.localCamStream, { target: peerId, metadata: { kind: 'cam' } });
        }
        if (this.localScreenStream) {
          void room.addStream(this.localScreenStream, { target: peerId, metadata: { kind: 'screen' } });
        }
        this.emit();
      });

      room.onPeerLeave(({ peerId }) => {
        this.removePeer(peerId);
        this.emit();
      });

      profileAction.onMessage((data, { peerId }) => {
        const peer = this.ensurePeer(peerId);
        peer.info.name = data.name?.slice(0, 24) || 'Guest';
        peer.info.colorHex = data.colorHex || VOICE_COLOR_PRESETS[0].hex;
        peer.info.hasCam = Boolean(data.hasCam);
        peer.info.hasScreen = Boolean(data.hasScreen);
        if (!peer.info.hasCam) peer.info.camStream = null;
        if (!peer.info.hasScreen) peer.info.screenStream = null;
        this.hub.updatePeerMeta(peerId, peer.info.name, peer.info.colorHex, peer.info.azimuthRad);
        this.emit();
      });

      chatAction.onMessage((data, { peerId }) => {
        const peer = this.peers.get(peerId);
        const text = (data.text || '').trim().slice(0, 220);
        if (!text) return;
        this.pushMessage({
          id: `${peerId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          senderId: peerId,
          senderName: data.name || peer?.info.name || 'Guest',
          colorHex: data.colorHex || peer?.info.colorHex || '#4ee6f5',
          text,
          timestamp: Date.now(),
        });
      });

      room.onPeerStream((stream, { peerId, metadata }) => {
        const peer = this.ensurePeer(peerId);
        const meta = (metadata as { kind?: string } | undefined)?.kind;
        const hasAudio = stream.getAudioTracks().length > 0;
        const hasVideo = stream.getVideoTracks().length > 0;

        if (meta === 'screen' || (hasVideo && !hasAudio && peer.info.hasScreen && !peer.info.camStream)) {
          peer.info.screenStream = stream;
          peer.info.hasScreen = true;
          stream.getVideoTracks().forEach((t: MediaStreamTrack) => {
            t.onended = () => {
              peer.info.screenStream = null;
              peer.info.hasScreen = false;
              this.emit();
            };
          });
        } else if (meta === 'cam' || hasVideo) {
          peer.info.camStream = stream;
          peer.info.hasCam = true;
          stream.getVideoTracks().forEach((t: MediaStreamTrack) => {
            t.onended = () => {
              peer.info.camStream = null;
              peer.info.hasCam = false;
              this.emit();
            };
          });
        }

        if (meta === 'audio' || hasAudio) {
          this.attachPeerSpatialAudio(peer, stream);
        }

        this.emit();
      });

      // Push initial presence
      this.broadcastProfile();
      this.emit();
    } catch (err) {
      this.connecting = false;
      this.room = null;
      this.roomId = null;
      this.errorNotice =
        err instanceof Error ? err.message : 'Unable to connect to room signaling relays.';
      this.emit();
    }
  }

  public leave() {
    this.stopMic();
    this.stopCam();
    this.stopScreen();

    if (this.room) {
      try {
        this.room.leave();
      } catch {
        // ignore
      }
      this.room = null;
    }

    Array.from(this.peers.keys()).forEach((id) => this.removePeer(id));
    this.roomId = null;
    this.connecting = false;
    this.sendProfile = null;
    this.sendChat = null;

    try {
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch {
      // ignore
    }

    this.emit();
  }

  public sendChatMessage(rawText: string) {
    const text = rawText.trim().slice(0, 220);
    if (!text) return;
    if (this.sendChat) {
      this.sendChat({
        text,
        name: this.myName || 'Traveler',
        colorHex: this.myColorHex,
      });
    }
    this.pushMessage({
      id: `self-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      senderId: 'self',
      senderName: this.myName || 'Traveler',
      colorHex: this.myColorHex,
      text,
      timestamp: Date.now(),
    });
  }

  private pushMessage(msg: CallChatMessage) {
    this.messages = [...this.messages.slice(-24), msg];
    this.emit();
  }

  private broadcastProfile(targetPeerId?: string) {
    if (!this.sendProfile) return;
    try {
      void this.sendProfile(
        {
          name: this.myName || 'Traveler',
          colorHex: this.myColorHex,
          hasCam: this.camActive,
          hasScreen: this.screenActive,
        },
        targetPeerId ? { target: targetPeerId } : undefined,
      );
    } catch {
      // ignore
    }
  }

  private ensurePeer(peerId: string): PeerRuntime {
    const existing = this.peers.get(peerId);
    if (existing) return existing;
    const seatIndex = this.peers.size % SEAT_AZIMUTHS.length;
    const azimuthRad = SEAT_AZIMUTHS[seatIndex];
    const colorHex = VOICE_COLOR_PRESETS[(seatIndex + 1) % VOICE_COLOR_PRESETS.length].hex;
    const runtime: PeerRuntime = {
      info: {
        id: peerId,
        name: `Guest ${seatIndex + 1}`,
        colorHex,
        seatIndex,
        azimuthRad,
        speaking: false,
        muted: false,
        volume: 1.0,
        hasCam: false,
        hasScreen: false,
        camStream: null,
        screenStream: null,
      },
      audioEl: null,
      audioSrc: null,
      gainNode: null,
      pannerNode: null,
      analyser: null,
    };
    this.peers.set(peerId, runtime);
    return runtime;
  }

  private attachPeerSpatialAudio(peer: PeerRuntime, stream: MediaStream) {
    const ctx = this.hub.ensureContext();
    // Hidden muted audio element nudges Chromium to decode WebRTC audio tracks reliably
    if (!peer.audioEl) {
      const el = document.createElement('audio');
      el.autoplay = true;
      el.muted = true;
      el.srcObject = stream;
      void el.play().catch(() => {});
      peer.audioEl = el;
    } else {
      peer.audioEl.srcObject = stream;
    }

    if (peer.audioSrc) {
      try {
        peer.audioSrc.disconnect();
      } catch {
        // ignore
      }
    }

    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;

    const gain = ctx.createGain();
    gain.gain.value = peer.info.muted ? 0 : peer.info.volume;

    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 15;
    panner.rolloffFactor = 0.6;
    const r = 3.2;
    panner.positionX.value = Math.sin(peer.info.azimuthRad) * r;
    panner.positionY.value = 0;
    panner.positionZ.value = -Math.cos(peer.info.azimuthRad) * r;

    src.connect(analyser);
    analyser.connect(gain);
    gain.connect(panner);
    panner.connect(ctx.destination);

    peer.audioSrc = src;
    peer.analyser = analyser;
    peer.gainNode = gain;
    peer.pannerNode = panner;

    this.hub.registerPeerAudio(
      peer.info.id,
      peer.info.name,
      analyser,
      peer.info.colorHex,
      peer.info.azimuthRad,
    );
  }

  private removePeer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    if (peer.audioEl) {
      peer.audioEl.pause();
      peer.audioEl.srcObject = null;
    }
    try {
      peer.audioSrc?.disconnect();
      peer.gainNode?.disconnect();
      peer.pannerNode?.disconnect();
    } catch {
      // ignore
    }
    this.hub.unregisterPeerAudio(peerId);
    this.peers.delete(peerId);
  }

  public setPeerVolume(peerId: string, volume: number) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.info.volume = Math.max(0, Math.min(1.5, volume));
    if (peer.gainNode) {
      peer.gainNode.gain.value = peer.info.muted ? 0 : peer.info.volume;
    }
    this.emit();
  }

  public togglePeerMute(peerId: string) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.info.muted = !peer.info.muted;
    if (peer.gainNode) {
      peer.gainNode.gain.value = peer.info.muted ? 0 : peer.info.volume;
    }
    this.emit();
  }

  // ── Microphone & Push-To-Talk ───────────────────────────────────────────────
  public async toggleMic(): Promise<boolean> {
    if (this.micActive) {
      this.stopMic();
      return false;
    }
    return this.startMic();
  }

  public async setPushToTalk(held: boolean) {
    if (held === this.pttActive) return;
    this.pttActive = held;
    if (held) {
      if (!this.micActive) {
        await this.startMic();
      }
    } else {
      this.stopMic();
    }
    this.emit();
  }

  private async startMic(): Promise<boolean> {
    this.errorNotice = null;
    try {
      this.hub.stopStandaloneMicMonitor();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      this.localAudioStream = stream;
      this.micActive = true;
      this.hub.attachLocalMicStream(stream, this.myColorHex);
      if (this.room) {
        void this.room.addStream(stream, { metadata: { kind: 'audio' } });
      }
      this.emit();
      return true;
    } catch {
      this.errorNotice = 'Microphone permission denied or unavailable.';
      this.micActive = false;
      this.pttActive = false;
      this.emit();
      return false;
    }
  }

  public stopMic() {
    if (this.localAudioStream) {
      if (this.room) {
        try {
          this.room.removeStream(this.localAudioStream);
        } catch {
          // ignore
        }
      }
      this.localAudioStream.getTracks().forEach((t) => t.stop());
      this.localAudioStream = null;
    }
    this.micActive = false;
    this.pttActive = false;
    this.hub.attachLocalMicStream(null);
    this.emit();
  }

  // ── Camera Toggle ───────────────────────────────────────────────────────────
  public async toggleCam(): Promise<boolean> {
    if (this.camActive) {
      this.stopCam();
      return false;
    }
    this.errorNotice = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
        audio: false,
      });
      this.localCamStream = stream;
      this.camActive = true;
      stream.getVideoTracks().forEach((t) => {
        t.onended = () => this.stopCam();
      });
      if (this.room) {
        void this.room.addStream(stream, { metadata: { kind: 'cam' } });
      }
      this.broadcastProfile();
      this.emit();
      return true;
    } catch {
      this.errorNotice = 'Camera permission denied or unavailable.';
      this.camActive = false;
      this.emit();
      return false;
    }
  }

  public stopCam() {
    if (this.localCamStream) {
      if (this.room) {
        try {
          this.room.removeStream(this.localCamStream);
        } catch {
          // ignore
        }
      }
      this.localCamStream.getTracks().forEach((t) => t.stop());
      this.localCamStream = null;
    }
    this.camActive = false;
    this.broadcastProfile();
    this.emit();
  }

  // ── Screen Share Toggle ─────────────────────────────────────────────────────
  public async toggleScreen(): Promise<boolean> {
    if (this.screenActive) {
      this.stopScreen();
      return false;
    }
    this.errorNotice = null;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 24 } },
        audio: false,
      });
      this.localScreenStream = stream;
      this.screenActive = true;
      stream.getVideoTracks().forEach((t) => {
        t.onended = () => this.stopScreen();
      });
      if (this.room) {
        void this.room.addStream(stream, { metadata: { kind: 'screen' } });
      }
      this.broadcastProfile();
      this.emit();
      return true;
    } catch {
      this.errorNotice = 'Screen sharing cancelled or unavailable.';
      this.screenActive = false;
      this.emit();
      return false;
    }
  }

  public stopScreen() {
    if (this.localScreenStream) {
      if (this.room) {
        try {
          this.room.removeStream(this.localScreenStream);
        } catch {
          // ignore
        }
      }
      this.localScreenStream.getTracks().forEach((t) => t.stop());
      this.localScreenStream = null;
    }
    this.screenActive = false;
    this.broadcastProfile();
    this.emit();
  }

  public dispose() {
    this.leave();
    this.listeners.clear();
  }
}
