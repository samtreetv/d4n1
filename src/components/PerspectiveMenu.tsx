import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Compass,
  Copy,
  Download,
  Feather,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  Footprints,
  Image as ImageIcon,
  Layers,
  Map as MapIcon,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Music,
  Paintbrush,
  Pause,
  Phone,
  PhoneOff,
  Play,
  Send,
  Type,
  Upload,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Wind,
  X,
} from 'lucide-react';
import {
  BIM_LAYERS,
  BackdropStyle,
  BimLayerId,
  PATH_MATERIALS,
  PathMaterialId,
  PlaceableId,
  SPACE_PRESETS,
  WeatherMode,
  formatSeasonLabel,
  formatTimeOfDay,
  getItemsByLayer,
} from '../data/virginiaTrees';
import { CallRoomSnapshot } from '../engine/callRoomEngine';
import {
  CustomBackdropSnapshot,
  sharedCustomBackdropHub,
} from '../engine/customBackdropHub';
import {
  HorizonAudioSourceMeta,
  VOICE_COLOR_PRESETS,
  sharedHorizonAudioHub,
} from '../engine/horizonAudioHub';
import {
  InstrumentEnsembleSnapshot,
  MUSICAL_SCALES,
  sharedInstrumentAudio,
} from '../engine/instrumentAudio';
import {
  PAPER_SKY_STYLES,
  PaperSkyVisualStyle,
  VISUAL_STYLE_FAMILIES,
  getPaperSkyStyleMeta,
} from '../engine/paperSky/CardAtlasShader';
import { PaperSkyDropZone } from '../engine/paperSky/PaperSkyEngine';
import {
  PHYSICS_PROFILES,
  PhysicsProfileId,
  getPhysicsProfile,
} from '../engine/paperSky/physicsProfiles';
import { ExperienceMode, SceneSimulationState } from '../engine/rendererTypes';
import {
  ASCII_GLYPH_SETS,
  DEFAULT_TONE_SETTINGS,
  FilterColorTint,
  MOTION_FX_OPTIONS,
  PaintMaterialMode,
  VisualFilterStyle,
} from '../engine/visualFilters';
import { BotanicalIcon } from './BotanicalIcons';

export type SpatialContainerId =
  | 'sky'
  | 'call'
  | 'audio'
  | 'world'
  | 'style'
  | 'botanicals'
  | 'archive';

export interface PerspectiveMenuProps {
  open: boolean;
  initialContainer: SpatialContainerId | null;
  realm: 'paper-sky' | 'sanctuary';
  activeDropZone: PaperSkyDropZone;
  paperSkyStyle: PaperSkyVisualStyle;
  onSelectPaperSkyStyle: (style: PaperSkyVisualStyle) => void;
  physicsProfile: PhysicsProfileId;
  onSelectPhysicsProfile: (profile: PhysicsProfileId) => void;
  pixelTypography: boolean;
  onTogglePixelTypography: () => void;
  onClose: () => void;
  sim: SceneSimulationState;
  mode: ExperienceMode;
  activePresetId: string | null;
  plantScale: number;
  canopyGrowth: number;
  autoCycleTime: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onPatch: (patch: Partial<SceneSimulationState>) => void;
  onSetPlantScale: (scale: number) => void;
  onSelectBrush: (id: PlaceableId) => void;
  onSelectPathMaterial: (mat: PathMaterialId) => void;
  onToggleAutoCycleTime: () => void;
  onSelectPreset: (presetId: string) => void;
  onSelectMode: (mode: ExperienceMode) => void;
  onOpenBim: () => void;
  onTriggerGust: () => void;
  onGrowBack: () => void;
  onDownloadPng: () => void;
  onDownloadHtml: () => void;
  onDownloadPaperSkyHtml: () => void;
  onDownloadCsv: () => void;
  onDownloadJson: () => void;
  onImportJson: (text: string) => void;
  onEnterPaperSky: () => void;
  onDropIntoSanctuary: (presetId?: string) => void;
  callState: CallRoomSnapshot;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  onToggleMic: () => void;
  onPushToTalk: (held: boolean) => void;
  onToggleCam: () => void;
  onToggleScreen: () => void;
  onSetMyName: (name: string) => void;
  onSetMyColor: (hex: string) => void;
  onSetPeerVolume: (peerId: string, vol: number) => void;
  onTogglePeerMute: (peerId: string) => void;
  onSendChat: (text: string) => void;
  playSfx: (kind: 'tick' | 'pop' | 'open' | 'back' | 'whoosh') => void;
}

const WEATHER_MODES: { id: WeatherMode; label: string }[] = [
  { id: 'clear', label: 'CLEAR' },
  { id: 'mist', label: 'MIST' },
  { id: 'rain', label: 'RAIN' },
  { id: 'snow', label: 'SNOW' },
];

const SKY_PRESET_HOURS = [
  { label: 'DAWN', hour: 6.1, swatch: '#f29cb8' },
  { label: 'NOON', hour: 12.2, swatch: '#6cb4eb' },
  { label: 'GOLD', hour: 17.5, swatch: '#f2b552' },
  { label: 'DUSK', hour: 19.6, swatch: '#d65353' },
  { label: 'NIGHT', hour: 22.6, swatch: '#2b3266' },
];

const VISUAL_FILTER_OPTIONS: { id: VisualFilterStyle; label: string }[] = [
  { id: 'natural', label: 'NATURAL' },
  { id: 'oil', label: '2D OIL' },
  { id: 'ascii', label: 'ASCII' },
  { id: 'dots', label: 'DOTS' },
  { id: 'grain', label: 'GRAIN' },
  { id: 'scan', label: 'SCAN' },
];

const COLOR_TINTS: { id: FilterColorTint; label: string; swatch: string }[] = [
  { id: 'full', label: 'FULL', swatch: '#5cb88a' },
  { id: 'mono', label: 'MONO', swatch: '#d9d9d9' },
  { id: 'gold', label: 'GOLD', swatch: '#f3b74d' },
  { id: 'blue', label: 'CYAN', swatch: '#52a7ff' },
];

const PAINT_MODES: { id: PaintMaterialMode; label: string; swatch: string }[] = [
  { id: 'pixel', label: 'PIXEL STACK', swatch: '#7bb5dd' },
  { id: 'oil-3d', label: '3D OIL', swatch: '#e8a848' },
  { id: 'living-canvas', label: 'CANVAS', swatch: '#f26a56' },
];

const BACKDROPS: { id: BackdropStyle; label: string; swatch: string }[] = [
  { id: 'blue-ridge', label: 'BLUE RIDGE', swatch: '#6ea8d6' },
  { id: 'white-circle', label: 'VELLUM', swatch: '#ece9e0' },
  { id: 'blueprint', label: 'BLUEPRINT', swatch: '#1c4da1' },
];

/** Reusable Y2K hairline window chrome for focused sub-view panels (0px sharp corners) */
const ArchSubPanel: React.FC<{
  code: string;
  title: string;
  accent: string;
  badge?: string;
  children: React.ReactNode;
}> = ({ code, title, accent, badge, children }) => (
  <section className="sylva-arch-plane flex flex-col min-h-0 h-full bg-[#0b0d10]">
    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/15 shrink-0 bg-[#101318]">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: accent }} />
        <span className="font-mono text-[10px] font-bold tracking-[0.12em] uppercase text-white truncate">
          [ {code} // {title} ]
        </span>
      </div>
      <div className="hidden sm:block flex-1 h-[6px] opacity-20 text-white sylva-y2k-stripes mx-1" />
      {badge && (
        <span className="font-mono text-[9.5px] tracking-[0.08em] uppercase text-white/65 shrink-0 tabular-nums">
          {badge}
        </span>
      )}
    </div>
    <div className="flex-1 min-h-0 overflow-y-auto sylva-scroll p-3.5 flex flex-col gap-3">
      {children}
    </div>
  </section>
);

const HairlineSlider: React.FC<{
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}> = ({ label, valueLabel, min, max, step, value, onChange }) => (
  <label className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.08em] uppercase">
      <span className="text-white/65">{label}</span>
      <span className="text-white tabular-nums">{valueLabel}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-white/15 appearance-none cursor-pointer accent-white"
    />
  </label>
);

export const PerspectiveMenu: React.FC<PerspectiveMenuProps> = ({
  open,
  initialContainer,
  realm,
  activeDropZone,
  paperSkyStyle,
  onSelectPaperSkyStyle,
  physicsProfile,
  onSelectPhysicsProfile,
  pixelTypography,
  onTogglePixelTypography,
  onClose,
  sim,
  mode,
  activePresetId,
  plantScale,
  canopyGrowth,
  autoCycleTime,
  soundEnabled,
  onToggleSound,
  onPatch,
  onSetPlantScale,
  onSelectBrush,
  onSelectPathMaterial,
  onToggleAutoCycleTime,
  onSelectPreset,
  onSelectMode,
  onOpenBim,
  onTriggerGust,
  onGrowBack,
  onDownloadPng,
  onDownloadHtml,
  onDownloadPaperSkyHtml,
  onDownloadCsv,
  onDownloadJson,
  onImportJson,
  onEnterPaperSky,
  onDropIntoSanctuary,
  callState,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onToggleMic,
  onPushToTalk,
  onToggleCam,
  onToggleScreen,
  onSetMyName,
  onSetMyColor,
  onSetPeerVolume,
  onTogglePeerMute,
  onSendChat,
  playSfx,
}) => {
  const [activeContainer, setActiveContainer] = useState<SpatialContainerId | null>(
    initialContainer,
  );
  const [activeLayer, setActiveLayer] = useState<BimLayerId>('trees');
  const [roomInput, setRoomInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const backdropFileInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  const [trackInfo, setTrackInfo] = useState(() => sharedHorizonAudioHub.getTrackInfo());
  const [audioSources, setAudioSources] = useState<HorizonAudioSourceMeta[]>(() =>
    sharedHorizonAudioHub.getActiveSourcesSnapshot(),
  );
  const [localMicOn, setLocalMicOn] = useState(() =>
    sharedHorizonAudioHub.isStandaloneMicActive(),
  );
  const [glowStrength, setGlowStrength] = useState(() =>
    sharedHorizonAudioHub.getGlowStrength(),
  );
  const [backdropSnap, setBackdropSnap] = useState<CustomBackdropSnapshot>(() =>
    sharedCustomBackdropHub.getSnapshot(),
  );
  const [ensembleSnap, setEnsembleSnap] = useState<InstrumentEnsembleSnapshot>(() =>
    sharedInstrumentAudio.getSnapshot(),
  );

  useEffect(() => {
    if (open) {
      setActiveContainer(initialContainer);
    }
  }, [open, initialContainer]);

  useEffect(() => {
    const sync = () => {
      setTrackInfo(sharedHorizonAudioHub.getTrackInfo());
      setAudioSources(sharedHorizonAudioHub.getActiveSourcesSnapshot());
      setLocalMicOn(sharedHorizonAudioHub.isStandaloneMicActive());
      setGlowStrength(sharedHorizonAudioHub.getGlowStrength());
    };
    const unsubAudio = sharedHorizonAudioHub.subscribe(sync);
    const unsubBackdrop = sharedCustomBackdropHub.subscribe(() => {
      setBackdropSnap(sharedCustomBackdropHub.getSnapshot());
    });
    const unsubEnsemble = sharedInstrumentAudio.subscribe(() => {
      setEnsembleSnap(sharedInstrumentAudio.getSnapshot());
    });
    return () => {
      unsubAudio();
      unsubBackdrop();
      unsubEnsemble();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (activeContainer) {
          playSfx('back');
          setActiveContainer(null);
        } else {
          playSfx('back');
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [activeContainer, onClose, open, playSfx]);

  if (!open) return null;

  const seasonInfo = formatSeasonLabel(sim.season);
  const timeInfo = formatTimeOfDay(sim.timeOfDay);
  const activeSourceCount = audioSources.filter((s) => s.active).length;
  const inRoom = callState.mode === 'room';

  const enterContainer = (id: SpatialContainerId) => {
    playSfx('open');
    setActiveContainer(id);
  };

  const goOverview = () => {
    playSfx('back');
    setActiveContainer(null);
  };

  const handleCopyRoomCode = () => {
    if (!callState.roomId) return;
    void navigator.clipboard?.writeText(callState.roomId);
    setCopiedCode(true);
    playSfx('tick');
    window.setTimeout(() => setCopiedCode(false), 1600);
  };

  const allBotanicalItems = BIM_LAYERS.flatMap((l) => getItemsByLayer(l.id));
  const layerItems = getItemsByLayer(activeLayer);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Virginia Sylva Spatial Gallery Menu"
      className="fixed inset-0 z-[70] sylva-void-stage text-white flex flex-col overflow-hidden select-none"
    >
      {/* Hidden File Pickers */}
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            playSfx('open');
            void sharedHorizonAudioHub.loadAudioFile(f);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={backdropFileInputRef}
        type="file"
        accept="image/*,.splat,.ply"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            playSfx('open');
            void sharedCustomBackdropHub.loadFile(f);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              onImportJson(reader.result);
            }
          };
          reader.readAsText(f);
          e.target.value = '';
        }}
      />

      {/* ── RAZOR-SHARP TOP HAIRLINE BAR ──────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/15 bg-[#050608]">
        <div className="flex items-center gap-3 min-w-0">
          {activeContainer ? (
            <button
              type="button"
              onClick={goOverview}
              className="px-2.5 py-1 border border-white/40 hover:bg-white hover:text-[#050608] font-mono text-[10px] font-bold tracking-[0.12em] uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>7-PANEL</span>
            </button>
          ) : (
            <span className="font-mono text-[10px] font-bold tracking-[0.14em] uppercase text-white/55">
              [ VIRGINIA SYLVA // 07 ]
            </span>
          )}

          <div className="hidden md:flex items-center gap-2 font-mono text-[10px] tracking-[0.08em] uppercase text-white/55 tabular-nums">
            <span>{realm === 'paper-sky' ? 'PAPER SKY' : 'SANCTUARY'}</span>
            <span className="opacity-35">/</span>
            <span>{inRoom ? `ROOM #${callState.roomId}` : 'LOCAL'}</span>
            <span className="opacity-35">/</span>
            <span>{activeSourceCount} HORIZON</span>
            <span className="opacity-35">/</span>
            <span>{timeInfo.clock}</span>
          </div>
        </div>

        {/* Sub-view Quick Switcher Strip when inside a container */}
        {activeContainer && (
          <nav className="hidden lg:flex items-center gap-1">
            {(
              [
                ['sky', 'SKY'],
                ['call', 'CALL'],
                ['audio', 'AUDIO'],
                ['world', 'WORLD'],
                ['style', 'STYLE'],
                ['botanicals', 'FLORA'],
                ['archive', 'STUDIO'],
              ] as [SpatialContainerId, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => enterContainer(id)}
                className={`px-2 py-1 border font-mono text-[9.5px] font-bold tracking-[0.1em] uppercase cursor-pointer transition-colors ${
                  activeContainer === id
                    ? 'bg-white text-[#050608] border-white'
                    : 'border-white/20 text-white/65 hover:border-white/70 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playSfx('tick');
              onTogglePixelTypography();
            }}
            className={`px-2.5 py-1 border font-mono text-[10px] font-bold tracking-[0.1em] uppercase flex items-center gap-1.5 cursor-pointer transition-colors ${
              pixelTypography
                ? 'bg-white text-[#050608] border-white'
                : 'border-white/30 text-white/80 hover:border-white'
            }`}
          >
            <Type className="w-3 h-3" />
            <span className="hidden sm:inline">{pixelTypography ? 'PIXEL' : 'EDITORIAL'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playSfx('back');
              onClose();
            }}
            className="px-2.5 py-1 border border-white/50 bg-white text-[#050608] hover:bg-[#f26a56] hover:border-[#f26a56] hover:text-white font-mono text-[10px] font-bold tracking-[0.12em] uppercase flex items-center gap-1 cursor-pointer transition-colors"
          >
            <X className="w-3 h-3" />
            <span>CLOSE</span>
          </button>
        </div>
      </header>

      {/* ── MAIN STAGE: 7-PANEL STARK PERSPECTIVE ROOM OR ADAPTIVE 3/4 SUB-VIEW ── */}
      {!activeContainer ? (
        <main className="flex-1 min-h-0 p-4 sm:p-6 lg:p-8 flex flex-col justify-between gap-3 sm:gap-4 max-w-[1440px] w-full mx-auto overflow-y-auto sylva-scroll">
          {/* TOP CEILING PERSPECTIVE TRAPEZOID (3-PANEL SUB-VIEW) */}
          <div className="flex justify-center shrink-0">
            <button
              type="button"
              onClick={() => enterContainer('sky')}
              style={{ transform: 'rotateX(-28deg)' }}
              className="sylva-arch-plane sylva-arch-plane-interactive w-full max-w-[640px] h-[88px] sm:h-[98px] text-left cursor-pointer group flex flex-col justify-between bg-[#0c1016]"
            >
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/15 bg-[#121721]">
                <span className="font-mono text-[9.5px] font-bold tracking-[0.14em] uppercase text-white/90">
                  [ 01 // SKY · TIME · DROP MAP ]
                </span>
                <span className="font-mono text-[9px] tracking-[0.1em] text-white/55">
                  3-PANEL
                </span>
              </div>
              <div className="flex-1 px-4 py-2 flex items-center justify-between gap-4 relative overflow-hidden">
                {/* Bold Horizon Color Block Strip */}
                <div
                  className="absolute inset-x-0 bottom-0 h-1.5"
                  style={{
                    background: `linear-gradient(90deg, #1c4da1, ${activeDropZone.accentHex}, #f2b552, #f26a56)`,
                  }}
                />
                <div>
                  <div className="font-display text-lg sm:text-xl font-semibold tracking-tight text-white">
                    {seasonInfo.seasonName} · {timeInfo.clock}
                  </div>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em]">
                  <span
                    className="w-2.5 h-2.5 inline-block"
                    style={{ backgroundColor: activeDropZone.accentHex }}
                  />
                  <span className="text-white/80">{activeDropZone.presetName}</span>
                </div>
              </div>
            </button>
          </div>

          {/* CENTER 5-COLUMN PERSPECTIVE GALLERY WALLS (STEEP OUTER WALLS + 3 SQUARE WINDOWS) */}
          <div className="flex-1 min-h-[260px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 items-stretch">
            {/* FAR-LEFT FORESHORTENED WALL: CALL & ROOMS */}
            <button
              type="button"
              onClick={() => enterContainer('call')}
              style={{ transform: 'rotateY(30deg) scale(1.03)' }}
              className="sylva-arch-plane sylva-arch-plane-interactive text-left cursor-pointer flex flex-col justify-between bg-[#0e0c12] hover:z-10"
            >
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/15 bg-[#16131d]">
                <span className="font-mono text-[9.5px] font-bold tracking-[0.1em] uppercase">
                  [ 02 // CALL ]
                </span>
                <span className="font-mono text-[8.5px] text-white/55">4-PANEL</span>
              </div>
              <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                {/* Color-Blocked Graphic Signal Bars */}
                <div className="grid grid-cols-4 gap-1 h-16">
                  <div className="bg-[#f26a56]" />
                  <div className="bg-[#1b1824] border border-white/15" />
                  <div className="bg-[#f778b4]/85" />
                  <div className="bg-[#0a0c10] border border-white/15" />
                </div>
                <div>
                  <div className="font-display text-xl font-semibold tracking-tight leading-none">
                    Call &amp; Rooms
                  </div>
                  <div className="mt-2 flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.08em] text-white/60">
                    <span>{inRoom ? `#${callState.roomId}` : 'LOCAL'}</span>
                    <span>{callState.peers.length + 1} IN ROOM</span>
                  </div>
                </div>
              </div>
            </button>

            {/* CENTER-LEFT WINDOW: HORIZON AUDIO */}
            <button
              type="button"
              onClick={() => enterContainer('audio')}
              style={{ transform: 'rotateY(10deg)' }}
              className="sylva-arch-plane sylva-arch-plane-interactive text-left cursor-pointer flex flex-col justify-between bg-[#0b1014] hover:z-10"
            >
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/15 bg-[#111920]">
                <span className="font-mono text-[9.5px] font-bold tracking-[0.1em] uppercase">
                  [ 03 // HORIZON ]
                </span>
                <span className="font-mono text-[8.5px] text-white/55">360°</span>
              </div>
              <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                {/* Graphic 360° Ring Swatch */}
                <div className="h-16 border border-white/20 p-2 flex flex-col justify-between bg-[#070a0d]">
                  <div
                    className="h-4 w-full"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${trackInfo.colorHex}, #9b7bff, transparent)`,
                    }}
                  />
                  <div className="flex items-center justify-between font-mono text-[8.5px] text-white/55">
                    <span>1/3 CORE</span>
                    <span>65% FADE</span>
                  </div>
                </div>
                <div>
                  <div className="font-display text-xl font-semibold tracking-tight leading-none">
                    Horizon Audio
                  </div>
                  <div className="mt-2 flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.08em] text-white/60">
                    <span className="truncate max-w-[120px]">
                      {trackInfo.hasTrack ? trackInfo.name : 'DROP FILE'}
                    </span>
                    <span>{activeSourceCount} LIVE</span>
                  </div>
                </div>
              </div>
            </button>

            {/* DEAD-CENTER WINDOW: WORLD & REALMS */}
            <button
              type="button"
              onClick={() => enterContainer('world')}
              className="sylva-arch-plane sylva-arch-plane-interactive text-left cursor-pointer flex flex-col justify-between bg-[#0d1210] border-white/35 hover:z-10"
            >
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/20 bg-[#141c18]">
                <span className="font-mono text-[9.5px] font-bold tracking-[0.1em] uppercase">
                  [ 04 // REALMS ]
                </span>
                <span className="font-mono text-[8.5px] text-[#8ee6a8]">
                  {realm === 'paper-sky' ? 'SKY' : 'GROUND'}
                </span>
              </div>
              <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                {/* Bold Architectural Sanctuary Blocks */}
                <div className="grid grid-cols-2 gap-1 h-16">
                  <div className="bg-[#7bb5dd] p-1.5 flex items-end">
                    <span className="font-mono text-[8px] font-bold text-[#0b1014]">SKY</span>
                  </div>
                  <div className="bg-[#8ee6a8] p-1.5 flex items-end">
                    <span className="font-mono text-[8px] font-bold text-[#0b1014]">SYLVA</span>
                  </div>
                </div>
                <div>
                  <div className="font-display text-xl font-semibold tracking-tight leading-none">
                    World &amp; Realms
                  </div>
                  <div className="mt-2 flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.08em] text-white/60">
                    <span className="truncate">{activeDropZone.presetName}</span>
                    <span>{SPACE_PRESETS.length} SITES</span>
                  </div>
                </div>
              </div>
            </button>

            {/* CENTER-RIGHT WINDOW: VISUAL STYLE */}
            <button
              type="button"
              onClick={() => enterContainer('style')}
              style={{ transform: 'rotateY(-10deg)' }}
              className="sylva-arch-plane sylva-arch-plane-interactive text-left cursor-pointer flex flex-col justify-between bg-[#120e0c] hover:z-10"
            >
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/15 bg-[#1b1512]">
                <span className="font-mono text-[9.5px] font-bold tracking-[0.1em] uppercase">
                  [ 05 // STYLE ]
                </span>
                <span className="font-mono text-[8.5px] text-white/55 uppercase">
                  {paperSkyStyle}
                </span>
              </div>
              <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                {/* 13-Mode Phenomenological Color-Blocked Style Strip */}
                <div
                  className="grid gap-0.5 h-16"
                  style={{ gridTemplateColumns: `repeat(${PAPER_SKY_STYLES.length}, minmax(0, 1fr))` }}
                >
                  {PAPER_SKY_STYLES.map((st) => (
                    <div
                      key={st.id}
                      className={`h-full border ${
                        paperSkyStyle === st.id ? 'border-white' : 'border-black/40 opacity-80'
                      }`}
                      style={{ backgroundColor: st.swatch }}
                    />
                  ))}
                </div>
                <div>
                  <div className="font-display text-xl font-semibold tracking-tight leading-none">
                    Visual Style
                  </div>
                  <div className="mt-2 flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.08em] text-white/60">
                    <span>{PAPER_SKY_STYLES.length} MODES · 6 2D</span>
                    <span>{sim.visualFilter.style.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </button>

            {/* FAR-RIGHT FORESHORTENED WALL: FLORA & BIM (Dense Contact Sheet Grid!) */}
            <button
              type="button"
              onClick={() => enterContainer('botanicals')}
              style={{ transform: 'rotateY(-30deg) scale(1.03)' }}
              className="sylva-arch-plane sylva-arch-plane-interactive text-left cursor-pointer flex flex-col justify-between bg-[#0a100c] hover:z-10"
            >
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/15 bg-[#121c15]">
                <span className="font-mono text-[9.5px] font-bold tracking-[0.1em] uppercase">
                  [ 06 // FLORA ]
                </span>
                <span className="font-mono text-[8.5px] text-white/55">
                  {sim.placedItems.length} SITE
                </span>
              </div>
              <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                {/* Lookbook Contact-Sheet Micro Thumbnail Matrix */}
                <div className="grid grid-cols-4 gap-1 h-16">
                  {allBotanicalItems.slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-center border border-white/15"
                      style={{ backgroundColor: `${item.accentHex}33` }}
                    >
                      <BotanicalIcon id={item.id} className="w-4 h-4" />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="font-display text-xl font-semibold tracking-tight leading-none">
                    Flora, Sound &amp; BIM
                  </div>
                  <div className="mt-2 flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.08em] text-white/60">
                    <span>{allBotanicalItems.length} ITEMS</span>
                    <span>{BIM_LAYERS.length} LAYERS</span>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* BOTTOM FLOOR PERSPECTIVE TRAPEZOID (3-PANEL SUB-VIEW) */}
          <div className="flex justify-center shrink-0">
            <button
              type="button"
              onClick={() => enterContainer('archive')}
              style={{ transform: 'rotateX(28deg)' }}
              className="sylva-arch-plane sylva-arch-plane-interactive w-full max-w-[640px] h-[84px] sm:h-[94px] text-left cursor-pointer flex flex-col justify-between bg-[#100e0b]"
            >
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/15 bg-[#191611]">
                <span className="font-mono text-[9.5px] font-bold tracking-[0.14em] uppercase text-white/90">
                  [ 07 // STUDIO · EXPORT · ARCHIVE ]
                </span>
                <span className="font-mono text-[9px] tracking-[0.1em] text-[#f3c978]">
                  3-PANEL
                </span>
              </div>
              <div className="flex-1 px-4 py-2 flex items-center justify-between gap-4">
                <div className="font-display text-lg sm:text-xl font-semibold tracking-tight">
                  Postcard · Offline Paper Sky · BIM CSV · JSON
                </div>
                <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-[#f3c978] shrink-0">
                  &gt;&gt; OPEN
                </span>
              </div>
            </button>
          </div>
        </main>
      ) : (
        /* ── FOCUSED ADAPTIVE SUB-VIEWS (3 PANELS FOR SKY/ARCHIVE, 4 FOR OTHERS) ── */
        <main className="flex-1 min-h-0 p-4 sm:p-6 max-w-[1440px] w-full mx-auto overflow-y-auto sylva-scroll">
          {/* 1. SKY, HORIZON & DROP MAP -> 3 PANELS */}
          {activeContainer === 'sky' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-[420px]">
              <ArchSubPanel code="01A" title="SOLAR & SEASON" accent="#f2b552" badge={timeInfo.clock}>
                <div className="grid grid-cols-5 gap-1">
                  {SKY_PRESET_HOURS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        playSfx('tick');
                        onPatch({
                          timeOfDay: p.hour,
                          fireflies: p.hour >= 19.2 || p.hour < 5.5,
                        });
                      }}
                      className={`py-2 border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                        Math.abs(sim.timeOfDay - p.hour) < 1.3
                          ? 'bg-white text-[#050608] border-white'
                          : 'border-white/20 hover:border-white/65'
                      }`}
                    >
                      <span className="w-3 h-3 border border-black/30" style={{ backgroundColor: p.swatch }} />
                      <span className="font-mono text-[8.5px] font-bold">{p.label}</span>
                    </button>
                  ))}
                </div>

                <HairlineSlider
                  label="Time of Day"
                  valueLabel={timeInfo.clock}
                  min={0}
                  max={24}
                  step={0.1}
                  value={sim.timeOfDay}
                  onChange={(v) => onPatch({ timeOfDay: v, fireflies: v >= 19.2 || v < 5.5 })}
                />
                <HairlineSlider
                  label="Season Cycle"
                  valueLabel={seasonInfo.seasonName}
                  min={0}
                  max={4}
                  step={0.05}
                  value={sim.season}
                  onChange={(v) => onPatch({ season: v })}
                />

                <div className="grid grid-cols-2 gap-1.5 mt-auto">
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tick');
                      onToggleAutoCycleTime();
                    }}
                    className={`py-2 border font-mono text-[10px] font-bold uppercase cursor-pointer ${
                      autoCycleTime
                        ? 'bg-white text-[#050608] border-white'
                        : 'border-white/25 hover:border-white'
                    }`}
                  >
                    AUTO SUN: {autoCycleTime ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tick');
                      onPatch({ fireflies: !sim.fireflies });
                    }}
                    className={`py-2 border font-mono text-[10px] font-bold uppercase cursor-pointer ${
                      sim.fireflies
                        ? 'bg-[#f4dc82] text-[#050608] border-[#f4dc82]'
                        : 'border-white/25 hover:border-white'
                    }`}
                  >
                    FIREFLIES: {sim.fireflies ? 'ON' : 'OFF'}
                  </button>
                </div>
              </ArchSubPanel>

              <ArchSubPanel code="01B" title="WIND & WEATHER" accent="#6cb4eb" badge={sim.weather}>
                <div className="grid grid-cols-2 gap-1.5">
                  {WEATHER_MODES.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        playSfx('tick');
                        onPatch({ weather: w.id });
                      }}
                      className={`py-2.5 border font-mono text-[10px] font-bold tracking-[0.1em] cursor-pointer ${
                        sim.weather === w.id
                          ? 'bg-white text-[#050608] border-white'
                          : 'border-white/20 hover:border-white/65'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>

                <HairlineSlider
                  label="Wind Strength"
                  valueLabel={`${Math.round(sim.wind * 100)}%`}
                  min={0}
                  max={1}
                  step={0.02}
                  value={sim.wind}
                  onChange={(v) => onPatch({ wind: v })}
                />
                <HairlineSlider
                  label="Precipitation"
                  valueLabel={`${Math.round(sim.weatherIntensity * 100)}%`}
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={sim.weatherIntensity}
                  onChange={(v) => onPatch({ weatherIntensity: v })}
                />

                <div className="grid grid-cols-2 gap-1.5 mt-auto">
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('whoosh');
                      onTriggerGust();
                    }}
                    className="py-2 border border-white/30 hover:bg-white hover:text-[#050608] font-mono text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Wind className="w-3.5 h-3.5" />
                    <span>GUST</span>
                  </button>
                  <button
                    type="button"
                    onClick={onToggleSound}
                    className={`py-2 border font-mono text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer ${
                      soundEnabled
                        ? 'bg-[#8ee6a8] text-[#050608] border-[#8ee6a8]'
                        : 'border-white/30 hover:border-white'
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span>AUDIO</span>
                  </button>
                </div>
              </ArchSubPanel>

              <ArchSubPanel
                code="01C"
                title="DROP SANCTUARY"
                accent={activeDropZone.accentHex}
                badge={activeDropZone.compass}
              >
                <div className="grid grid-cols-1 gap-1.5">
                  {SPACE_PRESETS.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        playSfx('pop');
                        onDropIntoSanctuary(p.id);
                      }}
                      className={`p-2.5 border text-left flex items-center justify-between cursor-pointer transition-colors ${
                        activePresetId === p.id
                          ? 'bg-white text-[#050608] border-white'
                          : 'border-white/20 hover:border-white/70'
                      }`}
                    >
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.06em]">
                        0{idx + 1} · {p.name}
                      </span>
                      <span className="font-mono text-[9px] opacity-65">&gt;&gt; DROP</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playSfx('open');
                    onEnterPaperSky();
                  }}
                  className="mt-auto py-2.5 border border-[#7bb5dd] bg-[#7bb5dd] text-[#050608] hover:bg-white font-mono text-[10px] font-bold tracking-[0.12em] uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Feather className="w-3.5 h-3.5" />
                  <span>&gt;&gt; LAUNCH PAPER SKY</span>
                </button>
              </ArchSubPanel>
            </div>
          )}

          {/* 2. CALL & ROOMS -> 4 PANELS */}
          {activeContainer === 'call' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full min-h-[420px]">
              <ArchSubPanel
                code="02A"
                title="ROOM SESSION"
                accent="#f26a56"
                badge={inRoom ? `#${callState.roomId}` : 'LOCAL'}
              >
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-white/60">
                    CALLSIGN
                    <input
                      type="text"
                      value={callState.myName}
                      onChange={(e) => onSetMyName(e.target.value)}
                      maxLength={24}
                      className="mt-1 w-full px-2.5 py-1.5 bg-[#050608] border border-white/25 font-mono text-xs text-white outline-none focus:border-white"
                    />
                  </label>

                  <div>
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-white/60">
                      VOICE HORIZON HUE
                    </span>
                    <div className="mt-1.5 grid grid-cols-8 gap-1">
                      {VOICE_COLOR_PRESETS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          title={c.name}
                          onClick={() => {
                            playSfx('tick');
                            onSetMyColor(c.hex);
                          }}
                          className={`h-5 border cursor-pointer ${
                            callState.myColorHex === c.hex ? 'border-white scale-105' : 'border-black/40'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  </div>

                  {!inRoom ? (
                    <div className="flex flex-col gap-2 pt-2 border-t border-white/15">
                      <button
                        type="button"
                        onClick={() => {
                          playSfx('open');
                          onCreateRoom();
                        }}
                        className="w-full py-2.5 bg-white text-[#050608] hover:bg-[#8ee6a8] font-mono text-[10px] font-bold tracking-[0.12em] uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>&gt;&gt; START ROOM</span>
                      </button>

                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={roomInput}
                          onChange={(e) => setRoomInput(e.target.value)}
                          placeholder="ROOM CODE"
                          className="flex-1 min-w-0 px-2.5 py-1.5 bg-[#050608] border border-white/25 font-mono text-[11px] uppercase text-white outline-none focus:border-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!roomInput.trim()) return;
                            playSfx('open');
                            onJoinRoom(roomInput.trim());
                            setRoomInput('');
                          }}
                          className="px-3 py-1.5 border border-white/40 hover:bg-white hover:text-[#050608] font-mono text-[10px] font-bold uppercase cursor-pointer"
                        >
                          JOIN
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 pt-2 border-t border-white/15">
                      <div className="flex items-center justify-between p-2 border border-white/25 bg-[#050608]">
                        <span className="font-mono text-sm font-bold tracking-[0.12em]">
                          #{callState.roomId}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyRoomCode}
                          className="px-2 py-1 border border-white/25 hover:bg-white hover:text-[#050608] font-mono text-[9px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                        >
                          {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedCode ? 'OK' : 'COPY'}</span>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          playSfx('back');
                          onLeaveRoom();
                        }}
                        className="w-full py-2 border border-[#f26a56] text-[#f26a56] hover:bg-[#f26a56] hover:text-white font-mono text-[10px] font-bold tracking-[0.12em] uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <PhoneOff className="w-3.5 h-3.5" />
                        <span>LEAVE ROOM</span>
                      </button>
                    </div>
                  )}
                </div>
              </ArchSubPanel>

              <ArchSubPanel code="02B" title="MIC · CAM · SCREEN" accent="#f778b4">
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tick');
                      onToggleMic();
                    }}
                    className={`py-2.5 px-3 border font-mono text-[10px] font-bold uppercase flex items-center justify-between cursor-pointer ${
                      callState.micActive
                        ? 'bg-[#8ee6a8] text-[#050608] border-[#8ee6a8]'
                        : 'border-white/25 hover:border-white'
                    }`}
                  >
                    <span>MICROPHONE</span>
                    {callState.micActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onPointerDown={() => onPushToTalk(true)}
                    onPointerUp={() => onPushToTalk(false)}
                    onPointerLeave={() => onPushToTalk(false)}
                    className={`py-2.5 px-3 border font-mono text-[10px] font-bold uppercase flex items-center justify-between cursor-pointer ${
                      callState.pttActive
                        ? 'bg-[#f778b4] text-[#050608] border-[#f778b4]'
                        : 'border-white/25 hover:border-white'
                    }`}
                  >
                    <span>HOLD TO TALK</span>
                    <span>PTT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tick');
                      onToggleCam();
                    }}
                    className={`py-2.5 px-3 border font-mono text-[10px] font-bold uppercase flex items-center justify-between cursor-pointer ${
                      callState.camActive
                        ? 'bg-white text-[#050608] border-white'
                        : 'border-white/25 hover:border-white'
                    }`}
                  >
                    <span>PiP CAMERA</span>
                    {callState.camActive ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tick');
                      onToggleScreen();
                    }}
                    className={`py-2.5 px-3 border font-mono text-[10px] font-bold uppercase flex items-center justify-between cursor-pointer ${
                      callState.screenActive
                        ? 'bg-white text-[#050608] border-white'
                        : 'border-white/25 hover:border-white'
                    }`}
                  >
                    <span>PiP SCREEN</span>
                    {callState.screenActive ? (
                      <Monitor className="w-3.5 h-3.5" />
                    ) : (
                      <MonitorOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </ArchSubPanel>

              <ArchSubPanel
                code="02C"
                title="SPATIAL PEERS"
                accent="#4ee6f5"
                badge={`${callState.peers.length}`}
              >
                {callState.peers.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-white/15 font-mono text-[10px] uppercase tracking-[0.1em] text-white/45 p-4 text-center">
                    {inRoom ? 'WAITING FOR PEERS' : 'START OR JOIN A ROOM'}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {callState.peers.map((peer) => (
                      <div key={peer.id} className="p-2 border border-white/20 bg-[#050608] flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase">
                            <span className="w-2.5 h-2.5" style={{ backgroundColor: peer.colorHex }} />
                            {peer.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => onTogglePeerMute(peer.id)}
                            className="font-mono text-[9px] px-1.5 py-0.5 border border-white/25 cursor-pointer"
                          >
                            {peer.muted ? 'MUTED' : 'LIVE'}
                          </button>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1.5}
                          step={0.05}
                          value={peer.volume}
                          onChange={(e) => onSetPeerVolume(peer.id, parseFloat(e.target.value))}
                          className="w-full h-1 accent-white cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </ArchSubPanel>

              <ArchSubPanel code="02D" title="WHISPER CHAT" accent="#9b7bff">
                <div className="flex-1 min-h-[140px] border border-white/15 bg-[#050608] p-2 overflow-y-auto sylva-scroll flex flex-col gap-1.5">
                  {callState.messages.length === 0 ? (
                    <span className="font-mono text-[9.5px] text-white/35 uppercase">NO MESSAGES</span>
                  ) : (
                    callState.messages.map((m) => (
                      <div key={m.id} className="font-mono text-[10px] leading-snug">
                        <span className="font-bold" style={{ color: m.colorHex }}>
                          {m.senderName}:
                        </span>{' '}
                        <span className="text-white/90">{m.text}</span>
                      </div>
                    ))
                  )}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!chatInput.trim()) return;
                    onSendChat(chatInput.trim());
                    setChatInput('');
                  }}
                  className="flex gap-1"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="SAY..."
                    className="flex-1 min-w-0 px-2 py-1.5 bg-[#050608] border border-white/25 font-mono text-[10px] text-white outline-none focus:border-white"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 bg-white text-[#050608] font-mono text-[10px] font-bold cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </form>
              </ArchSubPanel>
            </div>
          )}

          {/* 3. HORIZON AUDIO -> 4 PANELS */}
          {activeContainer === 'audio' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full min-h-[420px]">
              <ArchSubPanel code="03A" title="LOCAL TRACK" accent={trackInfo.colorHex}>
                <button
                  type="button"
                  onClick={() => audioFileInputRef.current?.click()}
                  className="w-full py-6 border border-dashed border-white/35 hover:border-white font-mono text-[10px] font-bold uppercase tracking-[0.1em] flex flex-col items-center justify-center gap-2 cursor-pointer"
                >
                  {trackInfo.hasTrack ? <Music className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                  <span className="px-2 truncate max-w-full">
                    {trackInfo.hasTrack ? trackInfo.name : 'SELECT AUDIO FILE'}
                  </span>
                </button>

                {trackInfo.hasTrack && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => sharedHorizonAudioHub.toggleTrackPlayback()}
                      className="py-2 bg-white text-[#050608] font-mono text-[10px] font-bold uppercase flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {trackInfo.playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{trackInfo.playing ? 'PAUSE' : 'PLAY'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => sharedHorizonAudioHub.clearTrack()}
                      className="py-2 border border-white/30 hover:border-[#f26a56] hover:text-[#f26a56] font-mono text-[10px] font-bold uppercase cursor-pointer"
                    >
                      CLEAR
                    </button>
                  </div>
                )}

                <HairlineSlider
                  label="Horizon Bearing"
                  valueLabel={`${Math.round((trackInfo.azimuthRad * 180) / Math.PI)}°`}
                  min={-Math.PI}
                  max={Math.PI}
                  step={0.05}
                  value={trackInfo.azimuthRad}
                  onChange={(v) => sharedHorizonAudioHub.setTrackAzimuth(v)}
                />
              </ArchSubPanel>

              <ArchSubPanel code="03B" title="COLOR & BLOOM" accent="#9b7bff">
                <div className="grid grid-cols-4 gap-1.5">
                  {VOICE_COLOR_PRESETS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => {
                        playSfx('tick');
                        sharedHorizonAudioHub.setTrackColor(c.hex);
                        sharedHorizonAudioHub.setAmbientColor(c.hex);
                        sharedHorizonAudioHub.setLocalVoiceColor(c.hex);
                      }}
                      className={`p-1.5 border flex flex-col items-center gap-1 cursor-pointer ${
                        trackInfo.colorHex === c.hex ? 'border-white' : 'border-white/20'
                      }`}
                    >
                      <span className="w-full h-5" style={{ backgroundColor: c.hex }} />
                      <span className="font-mono text-[8px] uppercase truncate w-full text-center">
                        {c.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
                <HairlineSlider
                  label="Horizon Bloom"
                  valueLabel={`${Math.round(glowStrength * 100)}%`}
                  min={0}
                  max={1.6}
                  step={0.05}
                  value={glowStrength}
                  onChange={(v) => sharedHorizonAudioHub.setGlowStrength(v)}
                />
              </ArchSubPanel>

              <ArchSubPanel
                code="03C"
                title="VOICE & ENSEMBLE"
                accent="#f778b4"
                badge={`${ensembleSnap.activeInstrumentCount} INST`}
              >
                <button
                  type="button"
                  onClick={() => {
                    playSfx('tick');
                    void sharedHorizonAudioHub.toggleStandaloneMicMonitor();
                  }}
                  className={`py-2.5 border font-mono text-[10px] font-bold uppercase tracking-[0.1em] flex items-center justify-center gap-2 cursor-pointer ${
                    localMicOn
                      ? 'bg-[#f778b4] text-[#050608] border-[#f778b4]'
                      : 'border-white/30 hover:border-white'
                  }`}
                >
                  {localMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  <span>{localMicOn ? 'VOICE LIVE ON HORIZON' : 'ENABLE LOCAL MIC'}</span>
                </button>
                <button
                  type="button"
                  onClick={onToggleSound}
                  className={`py-2 border font-mono text-[10px] font-bold uppercase flex items-center justify-center gap-2 cursor-pointer ${
                    soundEnabled
                      ? 'bg-[#8ee6a8] text-[#050608] border-[#8ee6a8]'
                      : 'border-white/25 hover:border-white'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>AMBIENT SKY: {soundEnabled ? 'ON' : 'OFF'}</span>
                </button>

                <div className="pt-2 border-t border-white/15 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('pop');
                      sharedInstrumentAudio.toggleEnabled();
                    }}
                    className={`py-2 border font-mono text-[10px] font-bold uppercase flex items-center justify-center gap-2 cursor-pointer ${
                      ensembleSnap.enabled
                        ? 'bg-white text-[#050608] border-white'
                        : 'border-white/30 hover:border-white'
                    }`}
                  >
                    {ensembleSnap.enabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>ENSEMBLE: {ensembleSnap.enabled ? 'PLAYING' : 'PAUSED'}</span>
                  </button>

                  <HairlineSlider
                    label="Ensemble Tempo"
                    valueLabel={`${ensembleSnap.bpm} BPM`}
                    min={64}
                    max={128}
                    step={2}
                    value={ensembleSnap.bpm}
                    onChange={(v) => sharedInstrumentAudio.setBpm(v)}
                  />

                  <div className="grid grid-cols-2 gap-1">
                    {MUSICAL_SCALES.map((sc) => (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => {
                          playSfx('tick');
                          sharedInstrumentAudio.setScale(sc.id);
                        }}
                        className={`py-1.5 px-1.5 border font-mono text-[8.5px] font-bold uppercase cursor-pointer truncate ${
                          ensembleSnap.scaleId === sc.id
                            ? 'bg-white text-[#050608] border-white'
                            : 'border-white/20 text-white/75 hover:border-white'
                        }`}
                      >
                        {sc.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>
              </ArchSubPanel>

              <ArchSubPanel
                code="03D"
                title="ACTIVE SOURCES"
                accent="#4ee6f5"
                badge={`${activeSourceCount}/6`}
              >
                {audioSources.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-white/15 font-mono text-[10px] uppercase text-white/45">
                    SILENT HORIZON
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {audioSources.map((src) => (
                      <div
                        key={src.id}
                        className="p-2 border border-white/20 bg-[#050608] flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-3 h-3 shrink-0" style={{ backgroundColor: src.colorHex }} />
                          <span className="font-mono text-[10px] uppercase truncate">{src.label}</span>
                        </div>
                        <span className="font-mono text-[9px] text-white/55 tabular-nums">
                          {Math.round((src.azimuthRad * 180) / Math.PI)}°
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ArchSubPanel>
            </div>
          )}

          {/* 4. WORLD & REALMS -> 4 PANELS */}
          {activeContainer === 'world' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full min-h-[420px]">
              <ArchSubPanel code="04A" title="REALM SWITCH" accent="#7bb5dd">
                <button
                  type="button"
                  onClick={() => {
                    playSfx('open');
                    onEnterPaperSky();
                  }}
                  className={`py-3 px-3 border font-mono text-[10px] font-bold uppercase flex items-center justify-between cursor-pointer ${
                    realm === 'paper-sky'
                      ? 'bg-[#7bb5dd] text-[#050608] border-[#7bb5dd]'
                      : 'border-white/25 hover:border-white'
                  }`}
                >
                  <span>PAPER SKY</span>
                  <Feather className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSfx('open');
                    onDropIntoSanctuary();
                  }}
                  className={`py-3 px-3 border font-mono text-[10px] font-bold uppercase flex items-center justify-between cursor-pointer ${
                    realm === 'sanctuary'
                      ? 'bg-[#8ee6a8] text-[#050608] border-[#8ee6a8]'
                      : 'border-white/25 hover:border-white'
                  }`}
                >
                  <span>VIRGINIA SYLVA</span>
                  <Compass className="w-3.5 h-3.5" />
                </button>
              </ArchSubPanel>

              <ArchSubPanel code="04B" title="SANCTUARY SITES" accent="#8ee6a8">
                <div className="grid grid-cols-1 gap-1.5">
                  {SPACE_PRESETS.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        playSfx('pop');
                        onSelectPreset(p.id);
                      }}
                      className={`p-2 border text-left font-mono text-[10px] font-bold uppercase flex items-center justify-between cursor-pointer ${
                        activePresetId === p.id
                          ? 'bg-white text-[#050608] border-white'
                          : 'border-white/20 hover:border-white/70'
                      }`}
                    >
                      <span className="truncate">
                        0{idx + 1} · {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </ArchSubPanel>

              <ArchSubPanel
                code="04C"
                title="CAMERA & PHYSICS"
                accent="#f3c978"
                badge={getPhysicsProfile(physicsProfile).shortLabel}
              >
                <div className="grid grid-cols-1 gap-1.5">
                  {(
                    [
                      { id: 'design', label: 'ORBIT 3D', Icon: Compass },
                      { id: 'plan', label: 'PLAN 2D', Icon: MapIcon },
                      { id: 'pov', label: 'WALK POV', Icon: Footprints },
                    ] as { id: ExperienceMode; label: string; Icon: React.FC<{ className?: string }> }[]
                  ).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        playSfx('open');
                        onSelectMode(id);
                      }}
                      className={`py-2 px-2.5 border font-mono text-[10px] font-bold uppercase flex items-center justify-between cursor-pointer ${
                        mode === id
                          ? 'bg-white text-[#050608] border-white'
                          : 'border-white/25 hover:border-white'
                      }`}
                    >
                      <span>{label}</span>
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tick');
                      onPatch({ autoOrbit: !sim.autoOrbit });
                    }}
                    className={`py-1.5 px-2.5 border font-mono text-[9.5px] font-bold uppercase cursor-pointer ${
                      sim.autoOrbit
                        ? 'bg-[#f3c978] text-[#050608] border-[#f3c978]'
                        : 'border-white/25 hover:border-white'
                    }`}
                  >
                    AUTO ORBIT: {sim.autoOrbit ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Paper Sky Swappable Physics Profiles */}
                <div className="pt-2 border-t border-white/15 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between font-mono text-[9px] tracking-[0.1em] uppercase text-white/60">
                    <span>PAPER SKY PHYSICS</span>
                    <span>{getPhysicsProfile(physicsProfile).maxJumps}× HOP</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {PHYSICS_PROFILES.map((prof) => {
                      const isCur = physicsProfile === prof.id;
                      return (
                        <button
                          key={prof.id}
                          type="button"
                          onClick={() => {
                            playSfx('pop');
                            onSelectPhysicsProfile(prof.id);
                          }}
                          className={`p-2 border text-left cursor-pointer transition-colors ${
                            isCur
                              ? 'bg-white text-[#050608] border-white'
                              : 'border-white/20 hover:border-white/70'
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono text-[9.5px] font-bold uppercase">
                            <span className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 border border-black/30 shrink-0"
                                style={{ backgroundColor: prof.accentHex }}
                              />
                              <span>{prof.label}</span>
                            </span>
                            <span className="opacity-65">{prof.code}</span>
                          </div>
                          <div className={`mt-0.5 font-mono text-[8px] leading-tight ${isCur ? 'text-[#050608]/75' : 'text-white/55'}`}>
                            {prof.feelNote}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </ArchSubPanel>

              <ArchSubPanel code="04D" title="SITE GROWTH" accent="#8ee6a8">
                <HairlineSlider
                  label="Plant Scale"
                  valueLabel={`${Math.round(plantScale * 100)}%`}
                  min={0.6}
                  max={1.6}
                  step={0.05}
                  value={plantScale}
                  onChange={onSetPlantScale}
                />
                <HairlineSlider
                  label="Stack Relief"
                  valueLabel={`${Math.round(sim.stackRelief * 100)}%`}
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  value={sim.stackRelief}
                  onChange={(v) => onPatch({ stackRelief: v })}
                />
                <button
                  type="button"
                  onClick={() => {
                    playSfx('open');
                    onGrowBack();
                  }}
                  className="mt-auto py-2.5 border border-white/30 hover:bg-white hover:text-[#050608] font-mono text-[10px] font-bold uppercase cursor-pointer"
                >
                  REGROW CANOPY ({Math.round(canopyGrowth * 100)}%)
                </button>
              </ArchSubPanel>
            </div>
          )}

          {/* 5. VISUAL STYLE -> 4 PANELS */}
          {activeContainer === 'style' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full min-h-[420px]">
              <ArchSubPanel
                code="05A"
                title="VISUAL ENGINES"
                accent={getPaperSkyStyleMeta(paperSkyStyle).swatch}
                badge={`${PAPER_SKY_STYLES.length} MODES`}
              >
                <div className="flex flex-col gap-3">
                  {VISUAL_STYLE_FAMILIES.map((fam) => {
                    const items = PAPER_SKY_STYLES.filter((s) => s.family === fam.id);
                    return (
                      <div key={fam.id} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between border-b border-white/15 pb-1">
                          <span className="font-mono text-[9px] font-bold tracking-[0.1em] uppercase text-white/85">
                            {fam.label}
                          </span>
                          <span className="font-mono text-[8px] uppercase text-white/45">
                            {items.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {items.map((st) => {
                            const isCur = paperSkyStyle === st.id;
                            return (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => {
                                  playSfx('pop');
                                  onSelectPaperSkyStyle(st.id);
                                }}
                                className={`p-1.5 border text-left cursor-pointer transition-colors ${
                                  isCur
                                    ? 'bg-white text-[#050608] border-white'
                                    : 'border-white/20 hover:border-white/70'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="flex items-center gap-2 font-mono text-[9.5px] font-bold uppercase min-w-0">
                                    <span
                                      className="w-3.5 h-3.5 border border-black/35 shrink-0"
                                      style={{ backgroundColor: st.swatch }}
                                    />
                                    <span className="truncate">{st.label}</span>
                                  </span>
                                  <span className="font-mono text-[8.5px] opacity-60 shrink-0 tabular-nums">
                                    {st.code}
                                  </span>
                                </div>
                                <div
                                  className={`mt-0.5 pl-5.5 font-mono text-[8px] leading-tight truncate ${
                                    isCur ? 'text-[#050608]/75' : 'text-white/50'
                                  }`}
                                >
                                  {st.mechanismNote}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Optional 1-click physics pairing helper (never locks combinations) */}
                {(() => {
                  const activeMeta = getPaperSkyStyleMeta(paperSkyStyle);
                  const recProf = getPhysicsProfile(activeMeta.recommendedPhysics);
                  const isMatched = physicsProfile === recProf.id;
                  return (
                    <div className="mt-auto pt-2 border-t border-white/15 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-[8px] uppercase tracking-[0.08em] text-white/50">
                          NATURAL PHYSICS PAIR
                        </div>
                        <div className="font-mono text-[9.5px] font-bold uppercase truncate">
                          {recProf.label}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          playSfx('pop');
                          onSelectPhysicsProfile(recProf.id);
                        }}
                        className={`px-2 py-1.5 border font-mono text-[8.5px] font-bold uppercase whitespace-nowrap cursor-pointer transition-colors ${
                          isMatched
                            ? 'bg-[#8ee6a8] text-[#050608] border-[#8ee6a8]'
                            : 'border-white/40 hover:bg-white hover:text-[#050608]'
                        }`}
                      >
                        {isMatched ? 'MATCHED' : 'MATCH FEEL'}
                      </button>
                    </div>
                  );
                })()}
              </ArchSubPanel>

              <ArchSubPanel code="05B" title="3D MATERIAL" accent="#e8a848">
                <div className="grid grid-cols-1 gap-1.5">
                  {PAINT_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        playSfx('pop');
                        onPatch({ paintMode: m.id });
                      }}
                      className={`p-2.5 border flex items-center justify-between cursor-pointer ${
                        sim.paintMode === m.id
                          ? 'bg-white text-[#050608] border-white'
                          : 'border-white/20 hover:border-white/70'
                      }`}
                    >
                      <span className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase">
                        <span className="w-3.5 h-3.5" style={{ backgroundColor: m.swatch }} />
                        {m.label}
                      </span>
                    </button>
                  ))}
                </div>
                <HairlineSlider
                  label="Impasto Depth"
                  valueLabel={`${Math.round(sim.impasto * 100)}%`}
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={sim.impasto}
                  onChange={(v) => onPatch({ impasto: v })}
                />
              </ArchSubPanel>

              <ArchSubPanel code="05C" title="2D FILTER & TONE" accent="#9b7bff">
                <div className="grid grid-cols-3 gap-1">
                  {VISUAL_FILTER_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        playSfx('tick');
                        onPatch({
                          visualFilter: { ...sim.visualFilter, style: f.id },
                        });
                      }}
                      className={`py-1.5 border font-mono text-[9.5px] font-bold uppercase cursor-pointer ${
                        sim.visualFilter.style === f.id
                          ? 'bg-white text-[#050608] border-white'
                          : 'border-white/20 hover:border-white/70'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-1">
                  {COLOR_TINTS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        onPatch({
                          visualFilter: { ...sim.visualFilter, colorTint: t.id },
                        })
                      }
                      className={`py-1 border flex flex-col items-center gap-0.5 cursor-pointer ${
                        sim.visualFilter.colorTint === t.id
                          ? 'border-white bg-white/15'
                          : 'border-white/20'
                      }`}
                    >
                      <span className="w-3 h-2" style={{ backgroundColor: t.swatch }} />
                      <span className="font-mono text-[7.5px]">{t.label}</span>
                    </button>
                  ))}
                </div>

                {sim.visualFilter.style === 'ascii' && (
                  <div className="flex flex-col gap-1">
                    <div className="grid grid-cols-3 gap-1">
                      {ASCII_GLYPH_SETS.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() =>
                            onPatch({
                              visualFilter: {
                                ...sim.visualFilter,
                                glyphSet: g.id,
                                customGlyphs: '',
                              },
                            })
                          }
                          className={`py-1 border font-mono text-[8px] uppercase cursor-pointer ${
                            !sim.visualFilter.customGlyphs.trim() && sim.visualFilter.glyphSet === g.id
                              ? 'bg-white text-[#050608] border-white'
                              : 'border-white/20'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={sim.visualFilter.customGlyphs}
                      onChange={(e) =>
                        onPatch({
                          visualFilter: { ...sim.visualFilter, customGlyphs: e.target.value },
                        })
                      }
                      placeholder="Custom ASCII glyphs (auto-sorted)…"
                      className="w-full px-2 py-1 border border-white/25 bg-black/40 text-white font-mono text-[9px] outline-none focus:border-white"
                    />
                  </div>
                )}

                <div className="pt-1.5 border-t border-white/15 flex flex-col gap-2">
                  <HairlineSlider
                    label="Exposure"
                    valueLabel={`${sim.visualFilter.exposure >= 0 ? '+' : ''}${sim.visualFilter.exposure.toFixed(1)} EV`}
                    min={-3}
                    max={3}
                    step={0.1}
                    value={sim.visualFilter.exposure}
                    onChange={(v) =>
                      onPatch({ visualFilter: { ...sim.visualFilter, exposure: v } })
                    }
                  />
                  <HairlineSlider
                    label="Contrast"
                    valueLabel={`${Math.round(sim.visualFilter.contrast * 100)}%`}
                    min={0.5}
                    max={3.0}
                    step={0.05}
                    value={sim.visualFilter.contrast}
                    onChange={(v) =>
                      onPatch({ visualFilter: { ...sim.visualFilter, contrast: v } })
                    }
                  />
                  <HairlineSlider
                    label="Midtones"
                    valueLabel={sim.visualFilter.gamma.toFixed(2)}
                    min={0.3}
                    max={3.0}
                    step={0.05}
                    value={sim.visualFilter.gamma}
                    onChange={(v) =>
                      onPatch({ visualFilter: { ...sim.visualFilter, gamma: v } })
                    }
                  />
                  <HairlineSlider
                    label="Detail"
                    valueLabel={`${Math.round(sim.visualFilter.detail * 100)}%`}
                    min={0}
                    max={3.0}
                    step={0.05}
                    value={sim.visualFilter.detail}
                    onChange={(v) =>
                      onPatch({ visualFilter: { ...sim.visualFilter, detail: v } })
                    }
                  />
                  <HairlineSlider
                    label="Glow Starts At"
                    valueLabel={`${Math.round(sim.visualFilter.glowThreshold * 100)}%`}
                    min={0.3}
                    max={0.95}
                    step={0.02}
                    value={sim.visualFilter.glowThreshold}
                    onChange={(v) =>
                      onPatch({ visualFilter: { ...sim.visualFilter, glowThreshold: v } })
                    }
                  />
                  <HairlineSlider
                    label="Under Image"
                    valueLabel={`${Math.round(sim.visualFilter.underImage * 100)}%`}
                    min={0}
                    max={0.6}
                    step={0.02}
                    value={sim.visualFilter.underImage}
                    onChange={(v) =>
                      onPatch({ visualFilter: { ...sim.visualFilter, underImage: v } })
                    }
                  />
                </div>

                <div className="grid grid-cols-5 gap-1">
                  {MOTION_FX_OPTIONS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        playSfx('tick');
                        onPatch({
                          visualFilter: {
                            ...sim.visualFilter,
                            motion: m.id,
                            shimmer: m.id === 'shimmer' || m.id === 'pulse',
                          },
                        });
                      }}
                      className={`py-1 border font-mono text-[7.5px] font-bold uppercase cursor-pointer ${
                        sim.visualFilter.motion === m.id
                          ? 'bg-white text-[#050608] border-white'
                          : 'border-white/20 hover:border-white/60'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tick');
                      onPatch({
                        visualFilter: {
                          ...sim.visualFilter,
                          invert: !sim.visualFilter.invert,
                        },
                      });
                    }}
                    className={`py-1.5 border font-mono text-[8.5px] font-bold uppercase cursor-pointer ${
                      sim.visualFilter.invert
                        ? 'bg-white text-[#050608] border-white'
                        : 'border-white/25 hover:border-white'
                    }`}
                  >
                    INVERT: {sim.visualFilter.invert ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tick');
                      onPatch({
                        visualFilter: { ...sim.visualFilter, ...DEFAULT_TONE_SETTINGS },
                      });
                    }}
                    className="py-1.5 border border-white/25 hover:border-white font-mono text-[8.5px] font-bold uppercase cursor-pointer"
                  >
                    RESET TONE
                  </button>
                </div>
              </ArchSubPanel>

              <ArchSubPanel
                code="05D"
                title="BACKDROP & UPLOAD"
                accent="#1c4da1"
                badge={backdropSnap.active ? 'CUSTOM' : sim.backdropStyle}
              >
                <div className="grid grid-cols-1 gap-1.5">
                  {BACKDROPS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        playSfx('pop');
                        onPatch({
                          backdropStyle: b.id,
                          studioBackdrop: b.id === 'white-circle',
                        });
                      }}
                      className={`p-2 border flex items-center gap-2 font-mono text-[10px] font-bold uppercase cursor-pointer ${
                        sim.backdropStyle === b.id
                          ? 'bg-white text-[#050608] border-white'
                          : 'border-white/20 hover:border-white/70'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 border border-black/30" style={{ backgroundColor: b.swatch }} />
                      <span>{b.label}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Backdrop Upload Mirror (Photo / 360° / .splat / .ply) */}
                <div className="pt-2 border-t border-white/15 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => backdropFileInputRef.current?.click()}
                    className={`py-2 px-2.5 border border-dashed font-mono text-[9.5px] font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer ${
                      backdropSnap.active
                        ? 'bg-white text-[#050608] border-white'
                        : 'border-white/35 hover:border-white text-white'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {backdropSnap.active && backdropSnap.fileName
                        ? backdropSnap.fileName
                        : 'UPLOAD PHOTO / 360° / .SPLAT'}
                    </span>
                  </button>

                  {backdropSnap.active && (
                    <>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            playSfx('tick');
                            sharedCustomBackdropHub.toggleProjection();
                          }}
                          className="py-1.5 border border-white/30 hover:border-white font-mono text-[9px] font-bold uppercase cursor-pointer"
                        >
                          {backdropSnap.projection === 'photo-360' ? '360° DOME' : '2.5D PARALLAX'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playSfx('back');
                            sharedCustomBackdropHub.clear();
                          }}
                          className="py-1.5 border border-white/30 hover:border-[#f26a56] hover:text-[#f26a56] font-mono text-[9px] font-bold uppercase cursor-pointer"
                        >
                          CLEAR CUSTOM
                        </button>
                      </div>
                      <HairlineSlider
                        label="Engine Stylize"
                        valueLabel={`${Math.round(backdropSnap.stylizeAmount * 100)}%`}
                        min={0}
                        max={1}
                        step={0.05}
                        value={backdropSnap.stylizeAmount}
                        onChange={(v) => sharedCustomBackdropHub.setStylizeAmount(v)}
                      />
                    </>
                  )}
                  {backdropSnap.error && (
                    <div className="font-mono text-[9px] text-[#f26a56]">
                      {backdropSnap.error}
                    </div>
                  )}
                </div>

                <HairlineSlider
                  label="Filter Glow"
                  valueLabel={`${Math.round(sim.visualFilter.glow * 100)}%`}
                  min={0}
                  max={1}
                  step={0.05}
                  value={sim.visualFilter.glow}
                  onChange={(v) =>
                    onPatch({ visualFilter: { ...sim.visualFilter, glow: v } })
                  }
                />
                <HairlineSlider
                  label="Cell Density"
                  valueLabel={`${Math.round(sim.visualFilter.density * 100)}%`}
                  min={0}
                  max={1}
                  step={0.05}
                  value={sim.visualFilter.density}
                  onChange={(v) =>
                    onPatch({ visualFilter: { ...sim.visualFilter, density: v } })
                  }
                />
              </ArchSubPanel>
            </div>
          )}

          {/* 6. FLORA & BIM -> 4 PANELS (DENSE LOOKBOOK THUMBNAIL CONTACT SHEET) */}
          {activeContainer === 'botanicals' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full min-h-[420px]">
              <ArchSubPanel code="06A" title="BIM LAYERS" accent="#8ee6a8">
                <div className="grid grid-cols-1 gap-1.5">
                  {BIM_LAYERS.map((layer) => (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => {
                        playSfx('tick');
                        setActiveLayer(layer.id);
                      }}
                      className={`p-2.5 border text-left font-mono text-[10px] font-bold uppercase flex items-center justify-between cursor-pointer ${
                        activeLayer === layer.id
                          ? 'bg-white text-[#050608] border-white'
                          : 'border-white/20 hover:border-white/70'
                      }`}
                    >
                      <span>{layer.label}</span>
                      <span className="opacity-60">{getItemsByLayer(layer.id).length}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playSfx('open');
                    onClose();
                    onOpenBim();
                  }}
                  className="mt-auto py-2.5 border border-[#8ee6a8] text-[#8ee6a8] hover:bg-[#8ee6a8] hover:text-[#050608] font-mono text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>BIM TAKEOFF SHEET</span>
                </button>
              </ArchSubPanel>

              {/* SPAN 2 COLUMNS FOR DENSE SQUARE CONTACT-SHEET GRID */}
              <div className="lg:col-span-2 h-full">
                <ArchSubPanel
                  code="06B"
                  title="SPECIES CONTACT SHEET"
                  accent="#8ee6a8"
                  badge={`${layerItems.length} ITEMS`}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {layerItems.map((item) => {
                      const activeBrush = sim.tool === 'plant' && sim.activeBrushId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            playSfx('pop');
                            onSelectBrush(item.id);
                            if (realm === 'paper-sky') {
                              onDropIntoSanctuary();
                            } else {
                              onClose();
                            }
                          }}
                          className={`p-2.5 border text-left flex flex-col justify-between gap-2 aspect-square cursor-pointer transition-colors ${
                            activeBrush
                              ? 'bg-white text-[#050608] border-white'
                              : 'bg-[#06080a] border-white/20 hover:border-white'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-mono text-[8.5px] opacity-60">
                              #{String(item.gpuIndex + 1).padStart(2, '0')}
                            </span>
                            <span
                              className="w-3 h-3 border border-black/30"
                              style={{ backgroundColor: item.accentHex }}
                            />
                          </div>
                          <div className="flex items-center justify-center py-1">
                            <BotanicalIcon id={item.id} className="w-9 h-9" />
                          </div>
                          <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.04em] truncate">
                            {item.shortName}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ArchSubPanel>
              </div>

              <ArchSubPanel code="06C" title="PATHS & PAVING" accent="#f3c978">
                <div className="grid grid-cols-1 gap-1.5">
                  {PATH_MATERIALS.map((mat) => (
                    <button
                      key={mat.id}
                      type="button"
                      onClick={() => {
                        playSfx('pop');
                        onSelectPathMaterial(mat.id);
                        if (realm === 'sanctuary') onClose();
                      }}
                      className={`p-2 border flex items-center justify-between cursor-pointer ${
                        sim.tool === 'path' && sim.activePathMaterial === mat.id
                          ? 'bg-white text-[#050608] border-white'
                          : 'border-white/20 hover:border-white/70'
                      }`}
                    >
                      <span className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase">
                        <span className="w-3.5 h-3.5" style={{ backgroundColor: mat.swatchHex }} />
                        {mat.label}
                      </span>
                      <Paintbrush className="w-3 h-3 opacity-60" />
                    </button>
                  ))}
                </div>
                <HairlineSlider
                  label="Brush Radius"
                  valueLabel={`${Math.round(sim.pathBrushRadius * 100)}`}
                  min={0.14}
                  max={0.55}
                  step={0.02}
                  value={sim.pathBrushRadius}
                  onChange={(v) => onPatch({ pathBrushRadius: v })}
                />
              </ArchSubPanel>
            </div>
          )}

          {/* 7. ARCHIVE, EXPORT & STUDIO -> 3 PANELS */}
          {activeContainer === 'archive' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-[420px]">
              <ArchSubPanel code="07A" title="POSTCARD & OFFLINE" accent="#f3c978">
                <button
                  type="button"
                  onClick={() => {
                    playSfx('pop');
                    onDownloadPng();
                  }}
                  className="py-3 px-3 bg-white text-[#050608] hover:bg-[#f3c978] font-mono text-[10px] font-bold tracking-[0.1em] uppercase flex items-center justify-between cursor-pointer"
                >
                  <span>EXPORT POSTCARD PNG</span>
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSfx('pop');
                    onDownloadPaperSkyHtml();
                  }}
                  className="py-3 px-3 border border-white/35 hover:bg-white hover:text-[#050608] font-mono text-[10px] font-bold tracking-[0.1em] uppercase flex items-center justify-between cursor-pointer"
                >
                  <span>OFFLINE PAPER SKY HTML</span>
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSfx('pop');
                    onDownloadHtml();
                  }}
                  className="py-3 px-3 border border-white/25 hover:bg-white hover:text-[#050608] font-mono text-[10px] font-bold tracking-[0.1em] uppercase flex items-center justify-between cursor-pointer"
                >
                  <span>SANCTUARY POSTCARD HTML</span>
                  <FileCode2 className="w-4 h-4" />
                </button>
              </ArchSubPanel>

              <ArchSubPanel code="07B" title="BIM & JSON DATA" accent="#8ee6a8">
                <button
                  type="button"
                  onClick={() => {
                    playSfx('pop');
                    onDownloadCsv();
                  }}
                  className="py-3 px-3 border border-white/30 hover:bg-white hover:text-[#050608] font-mono text-[10px] font-bold tracking-[0.1em] uppercase flex items-center justify-between cursor-pointer"
                >
                  <span>BIM TAKEOFF CSV</span>
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSfx('pop');
                    onDownloadJson();
                  }}
                  className="py-3 px-3 border border-white/30 hover:bg-white hover:text-[#050608] font-mono text-[10px] font-bold tracking-[0.1em] uppercase flex items-center justify-between cursor-pointer"
                >
                  <span>SAVE SITE JSON</span>
                  <FileJson className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => jsonInputRef.current?.click()}
                  className="py-3 px-3 border border-dashed border-white/35 hover:border-white font-mono text-[10px] font-bold tracking-[0.1em] uppercase flex items-center justify-between cursor-pointer"
                >
                  <span>IMPORT SITE JSON</span>
                  <Upload className="w-4 h-4" />
                </button>
              </ArchSubPanel>

              <ArchSubPanel code="07C" title="STUDIO SYSTEM" accent="#7bb5dd">
                <button
                  type="button"
                  onClick={() => {
                    playSfx('tick');
                    onTogglePixelTypography();
                  }}
                  className={`py-3 px-3 border font-mono text-[10px] font-bold uppercase flex items-center justify-between cursor-pointer ${
                    pixelTypography
                      ? 'bg-white text-[#050608] border-white'
                      : 'border-white/30 hover:border-white'
                  }`}
                >
                  <span>TYPOGRAPHY: {pixelTypography ? 'PIXEL' : 'EDITORIAL'}</span>
                  <Type className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSfx('tick');
                    onPatch({ reducedMotion: !sim.reducedMotion });
                  }}
                  className={`py-3 px-3 border font-mono text-[10px] font-bold uppercase flex items-center justify-between cursor-pointer ${
                    sim.reducedMotion
                      ? 'bg-white text-[#050608] border-white'
                      : 'border-white/30 hover:border-white'
                  }`}
                >
                  <span>REDUCED MOTION</span>
                  <span>{sim.reducedMotion ? 'ON' : 'OFF'}</span>
                </button>

                <div className="mt-auto p-2.5 border border-white/15 bg-[#050608] font-mono text-[9.5px] text-white/60 uppercase space-y-1">
                  <div className="flex justify-between">
                    <span>MENU TOGGLE</span>
                    <span className="text-white">M / ESC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SKY PIP CARDS</span>
                    <span className="text-white">H</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PLUNGE / FLIGHT</span>
                    <span className="text-white">SHIFT / SPACE×3</span>
                  </div>
                </div>
              </ArchSubPanel>
            </div>
          )}
        </main>
      )}
    </div>
  );
};
