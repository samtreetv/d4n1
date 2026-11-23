import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Image as ImageIcon,
  Layers,
  Mic,
  MicOff,
  Music,
  Pause,
  Phone,
  Play,
  RotateCcw,
  Sparkles,
  Type,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { SPACE_PRESETS } from '../data/virginiaTrees';
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
  sharedInstrumentAudio,
} from '../engine/instrumentAudio';
import {
  PAPER_SKY_STYLES,
  PaperSkyVisualStyle,
  getPaperSkyStyleMeta,
} from '../engine/paperSky/CardAtlasShader';
import { CardChoreographySettings } from '../engine/paperSky/InstancedWorldBuilder';
import {
  PaperSkyDropZone,
  PaperSkyEngine,
  PaperSkyTelemetry,
} from '../engine/paperSky/PaperSkyEngine';
import {
  PHYSICS_PROFILES,
  PhysicsProfileId,
  getPhysicsProfile,
} from '../engine/paperSky/physicsProfiles';
import {
  ASCII_GLYPH_SETS,
  FilterColorTint,
  MOTION_FX_OPTIONS,
  VisualFilterSettings,
  VisualFilterStyle,
} from '../engine/visualFilters';
import { PipUiCard } from './PipUiCard';
import { PlayingCardSuit, PlayingCardTheme, getPlayingCardTheme } from './playingCardThemes';
import { SpatialContainerId } from './PerspectiveMenu';

type RootCardId = 'style' | 'drop' | 'horizon' | 'studio';
type SubCardId =
  | 'style-engines'
  | 'style-filter'
  | 'style-tone'
  | 'style-glow'
  | 'style-backdrop'
  | 'drop-physics'
  | 'drop-angelic'
  | 'drop-sites'
  | 'horizon-audio'
  | 'horizon-ensemble'
  | 'horizon-voice'
  | 'studio-deck'
  | 'studio-export';
type AnyCardId = RootCardId | SubCardId;

const ROOT_CARD_IDS: RootCardId[] = ['style', 'drop', 'horizon', 'studio'];
const ROOT_CARD_INDEX: Record<RootCardId, { rank: string; suit: PlayingCardSuit; label: string }> = {
  style: { rank: 'A', suit: '♠', label: 'ENGINE' },
  drop: { rank: 'K', suit: '♥', label: 'FLIGHT' },
  horizon: { rank: 'Q', suit: '♣', label: 'HORIZON' },
  studio: { rank: 'J', suit: '♦', label: 'STUDIO' },
};

const ROOT_SUB_CARDS: Record<RootCardId, SubCardId[]> = {
  style: ['style-engines', 'style-filter', 'style-tone', 'style-glow', 'style-backdrop'],
  drop: ['drop-physics', 'drop-angelic', 'drop-sites'],
  horizon: ['horizon-audio', 'horizon-ensemble', 'horizon-voice'],
  studio: ['studio-deck', 'studio-export'],
};

const ALL_SUB_CARD_IDS: SubCardId[] = [
  ...ROOT_SUB_CARDS.style,
  ...ROOT_SUB_CARDS.drop,
  ...ROOT_SUB_CARDS.horizon,
  ...ROOT_SUB_CARDS.studio,
];

const QUICK_FILTERS: { id: VisualFilterStyle; label: string }[] = [
  { id: 'natural', label: 'RAW' },
  { id: 'oil', label: 'OIL' },
  { id: 'ascii', label: 'ASCII' },
  { id: 'dots', label: 'DOTS' },
  { id: 'grain', label: 'GRAIN' },
  { id: 'scan', label: 'SCAN' },
];

const TINT_OPTIONS: { id: FilterColorTint; label: string; swatch: string }[] = [
  { id: 'full', label: 'FULL', swatch: 'linear-gradient(135deg,#f26a56,#f4dc82,#7bb5dd)' },
  { id: 'mono', label: 'MONO', swatch: '#d6d9e0' },
  { id: 'gold', label: 'GOLD', swatch: '#f3c564' },
  { id: 'blue', label: 'BLUE', swatch: '#6eb4ff' },
];

interface CardRangeSliderProps {
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  theme: PlayingCardTheme;
  onChange: (value: number) => void;
}

const CardRangeSlider: React.FC<CardRangeSliderProps> = ({
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  theme,
  onChange,
}) => (
  <div className="flex flex-col gap-0.5" data-pip-interactive="true">
    <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.06em]">
      <span style={{ color: theme.mutedInk }}>{label}</span>
      <span className="font-bold tabular-nums" style={{ color: theme.ink }}>
        {valueLabel}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="sylva-card-slider"
    />
  </div>
);

export interface PaperSkyStageProps {
  active: boolean;
  menuOpen: boolean;
  soundEnabled: boolean;
  dropSignal: number;
  paperSkyStyle: PaperSkyVisualStyle;
  physicsProfile: PhysicsProfileId;
  visualFilter: VisualFilterSettings;
  cardChoreography: CardChoreographySettings;
  pixelTypography: boolean;
  callState: CallRoomSnapshot;
  skyCardsVisible: boolean;
  onToggleSkyCards: () => void;
  onSelectPaperSkyStyle: (style: PaperSkyVisualStyle) => void;
  onSelectPhysicsProfile: (profile: PhysicsProfileId) => void;
  onSelectVisualFilter: (style: VisualFilterStyle) => void;
  onPatchVisualFilter: (patch: Partial<VisualFilterSettings>) => void;
  onResetVisualTone: () => void;
  onPatchCardChoreography: (patch: Partial<CardChoreographySettings>) => void;
  onTogglePixelTypography: () => void;
  onToggleSound: () => void;
  onOpenMenu: (container?: SpatialContainerId | null) => void;
  onDropZoneChange: (zone: PaperSkyDropZone) => void;
  onDescentStart: (zone: PaperSkyDropZone) => void;
  onDescentComplete: (zone: PaperSkyDropZone) => void;
  onSelectDropPreset: (presetId: string) => void;
  onDownloadPng: () => void;
  onDownloadOfflineHtml: () => void;
  playSfx: (kind: 'tick' | 'pop' | 'open' | 'back' | 'whoosh') => void;
}

export const PaperSkyStage: React.FC<PaperSkyStageProps> = ({
  active,
  menuOpen,
  soundEnabled,
  dropSignal,
  paperSkyStyle,
  physicsProfile,
  visualFilter,
  cardChoreography,
  pixelTypography,
  callState,
  skyCardsVisible,
  onToggleSkyCards,
  onSelectPaperSkyStyle,
  onSelectPhysicsProfile,
  onSelectVisualFilter,
  onPatchVisualFilter,
  onResetVisualTone,
  onPatchCardChoreography,
  onTogglePixelTypography,
  onToggleSound,
  onOpenMenu,
  onDropZoneChange,
  onDescentStart,
  onDescentComplete,
  onSelectDropPreset,
  onDownloadPng,
  onDownloadOfflineHtml,
  playSfx,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PaperSkyEngine | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const backdropInputRef = useRef<HTMLInputElement | null>(null);
  const wasActiveRef = useRef<boolean>(active);
  const lastDropZoneRef = useRef<PaperSkyDropZone>({
    presetId: 'courtyard-circle',
    presetName: 'Blue Ridge Courtyard',
    compass: 'Center',
    accentHex: '#8ee6a8',
  });
  const lastDropSignalRef = useRef<number>(dropSignal);

  const [telemetry, setTelemetry] = useState<PaperSkyTelemetry>({
    altitudeFt: 90,
    cardsVisited: 1,
    totalWalkable: 31,
    jumpsRemaining: 3,
    maxJumps: 3,
    physicsProfile: 'glide',
    isDiving: false,
    isGliding: false,
    isSliding: false,
    inUpdraft: false,
    dreamSightActive: false,
    zoneLabel: 'XD Leap',
    dropZone: lastDropZoneRef.current,
    descending: false,
    descentProgress: 0,
    hasMoved: false,
  });
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  // Root playing cards + dealt fanning sub-cards state
  const [openCards, setOpenCards] = useState<Record<AnyCardId, boolean>>({
    style: true,
    drop: true,
    horizon: true,
    studio: true,
    'style-engines': false,
    'style-filter': false,
    'style-tone': false,
    'style-glow': false,
    'style-backdrop': false,
    'drop-physics': false,
    'drop-angelic': false,
    'drop-sites': false,
    'horizon-audio': false,
    'horizon-ensemble': false,
    'horizon-voice': false,
    'studio-deck': false,
    'studio-export': false,
  });
  const [minCards, setMinCards] = useState<Record<string, boolean>>({});
  const [zOrder, setZOrder] = useState<Record<string, number>>({
    style: 41,
    drop: 42,
    horizon: 43,
    studio: 44,
  });
  const zTopRef = useRef(50);

  // Live Horizon Audio Hub & Custom Backdrop Hub snapshots
  const [trackInfo, setTrackInfo] = useState(() => sharedHorizonAudioHub.getTrackInfo());
  const [activeSources, setActiveSources] = useState<HorizonAudioSourceMeta[]>(() =>
    sharedHorizonAudioHub.getActiveSourcesSnapshot(),
  );
  const [localMicOn, setLocalMicOn] = useState(() => sharedHorizonAudioHub.isStandaloneMicActive());
  const [dragAudioOver, setDragAudioOver] = useState(false);
  const [dragBackdropOver, setDragBackdropOver] = useState(false);
  const [backdropSnap, setBackdropSnap] = useState<CustomBackdropSnapshot>(() =>
    sharedCustomBackdropHub.getSnapshot(),
  );
  const [ensembleSnap, setEnsembleSnap] = useState<InstrumentEnsembleSnapshot>(() =>
    sharedInstrumentAudio.getSnapshot(),
  );

  useEffect(() => {
    const sync = () => {
      setTrackInfo(sharedHorizonAudioHub.getTrackInfo());
      setActiveSources(sharedHorizonAudioHub.getActiveSourcesSnapshot());
      setLocalMicOn(sharedHorizonAudioHub.isStandaloneMicActive());
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

  const callbacksRef = useRef({
    onDropZoneChange,
    onDescentStart,
    onDescentComplete,
    playSfx,
  });
  callbacksRef.current = { onDropZoneChange, onDescentStart, onDescentComplete, playSfx };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const engine = new PaperSkyEngine(canvas, {
        onTelemetry: (t) => {
          setTelemetry(t);
          if (
            t.dropZone.presetId !== lastDropZoneRef.current.presetId ||
            t.dropZone.compass !== lastDropZoneRef.current.compass
          ) {
            lastDropZoneRef.current = t.dropZone;
            callbacksRef.current.onDropZoneChange(t.dropZone);
          }
        },
        onCardLand: (_card, isNew, isCheckpoint) => {
          callbacksRef.current.playSfx(isCheckpoint ? 'open' : isNew ? 'pop' : 'tick');
        },
        onJump: (jumpNum) => {
          callbacksRef.current.playSfx(jumpNum === 1 ? 'pop' : 'whoosh');
        },
        onDash: () => {
          callbacksRef.current.playSfx('whoosh');
        },
        onCardUnfold: () => {
          callbacksRef.current.playSfx('tick');
        },
        onUpdraft: () => {
          callbacksRef.current.playSfx('open');
        },
        onDescentStart: () => {
          callbacksRef.current.playSfx('whoosh');
          callbacksRef.current.onDescentStart(lastDropZoneRef.current);
        },
        onDescentComplete: () => {
          callbacksRef.current.playSfx('open');
          callbacksRef.current.onDescentComplete(lastDropZoneRef.current);
        },
        onContextLost: () => {
          setWebglUnavailable(true);
        },
      });
      engineRef.current = engine;
      engine.setVisualStyle(paperSkyStyle);
      engine.setPhysicsProfile(physicsProfile);
      engine.setVisualFilter(visualFilter);
      engine.setChoreography(cardChoreography);
      engine.setPaused(!active);
      setWebglUnavailable(false);
      return () => {
        engine.dispose();
        engineRef.current = null;
      };
    } catch {
      setWebglUnavailable(true);
    }
    // Mount once so relaunching into Paper Sky is instantaneous with zero shader rebuild
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setVisualStyle(paperSkyStyle);
  }, [paperSkyStyle]);

  useEffect(() => {
    engineRef.current?.setPhysicsProfile(physicsProfile);
  }, [physicsProfile]);

  useEffect(() => {
    engineRef.current?.setVisualFilter(visualFilter);
  }, [visualFilter]);

  useEffect(() => {
    engineRef.current?.setChoreography(cardChoreography);
  }, [cardChoreography]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (active && !wasActiveRef.current) {
      engine.relaunchAtCheckpoint();
      engine.resize();
      setTelemetry((prev) => ({ ...prev, descending: false, descentProgress: 0 }));
    } else if (!active && wasActiveRef.current) {
      engine.setPaused(true);
    }
    wasActiveRef.current = active;
  }, [active]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !active) return;
    engine.setPaused(menuOpen);
  }, [active, menuOpen]);

  useEffect(() => {
    if (dropSignal !== lastDropSignalRef.current) {
      lastDropSignalRef.current = dropSignal;
      if (active) {
        engineRef.current?.triggerCloudDescent();
      }
    }
  }, [active, dropSignal]);

  const focusCard = (id: AnyCardId) => {
    zTopRef.current += 1;
    setZOrder((prev) => ({ ...prev, [id]: zTopRef.current }));
  };

  const toggleMinCard = (id: AnyCardId) => {
    playSfx('tick');
    setMinCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const closeCard = (id: AnyCardId) => {
    playSfx('back');
    setOpenCards((prev) => ({ ...prev, [id]: false }));
  };

  const reopenRootCard = (id: RootCardId) => {
    playSfx('pop');
    setOpenCards((prev) => ({ ...prev, [id]: true }));
    setMinCards((prev) => ({ ...prev, [id]: false }));
    focusCard(id);
  };

  const toggleDealRoot = (rootId: RootCardId) => {
    const subs = ROOT_SUB_CARDS[rootId];
    const anyOpen = subs.some((sid) => openCards[sid]);
    if (anyOpen) {
      playSfx('back');
      setOpenCards((prev) => {
        const next = { ...prev };
        subs.forEach((sid) => {
          next[sid] = false;
        });
        return next;
      });
    } else {
      playSfx('open');
      setOpenCards((prev) => {
        const next = { ...prev };
        subs.forEach((sid) => {
          next[sid] = true;
        });
        return next;
      });
      setMinCards((prev) => {
        const next = { ...prev };
        subs.forEach((sid) => {
          next[sid] = false;
        });
        return next;
      });
      setZOrder((prev) => {
        const next = { ...prev };
        subs.forEach((sid) => {
          zTopRef.current += 1;
          next[sid] = zTopRef.current;
        });
        return next;
      });
    }
  };

  const foldAllSubCards = () => {
    playSfx('back');
    setOpenCards((prev) => {
      const next = { ...prev };
      ALL_SUB_CARD_IDS.forEach((sid) => {
        next[sid] = false;
      });
      return next;
    });
  };

  const restoreAllRootCards = () => {
    playSfx('open');
    setOpenCards((prev) => ({
      ...prev,
      style: true,
      drop: true,
      horizon: true,
      studio: true,
    }));
    setMinCards((prev) => ({
      ...prev,
      style: false,
      drop: false,
      horizon: false,
      studio: false,
    }));
  };

  const handleAudioFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    playSfx('open');
    await sharedHorizonAudioHub.loadAudioFile(file);
  };

  const handleBackdropFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    playSfx('open');
    await sharedCustomBackdropHub.loadFile(file);
  };

  const cyclePaperSkyStyle = (dir: -1 | 1) => {
    const idx = PAPER_SKY_STYLES.findIndex((s) => s.id === paperSkyStyle);
    const nextIdx = (idx + dir + PAPER_SKY_STYLES.length) % PAPER_SKY_STYLES.length;
    playSfx('pop');
    onSelectPaperSkyStyle(PAPER_SKY_STYLES[nextIdx].id);
  };

  const uiFade = telemetry.descending
    ? Math.max(0, 1 - telemetry.descentProgress * 2.2)
    : 1;

  const activeStyleMeta = getPaperSkyStyleMeta(paperSkyStyle);
  const activePhysicsMeta = getPhysicsProfile(physicsProfile);
  const cardTheme = getPlayingCardTheme(paperSkyStyle, telemetry.dreamSightActive);
  const openRootCount = ROOT_CARD_IDS.filter((id) => openCards[id]).length;
  const closedRootIds = ROOT_CARD_IDS.filter((id) => !openCards[id]);
  const openSubCount = ALL_SUB_CARD_IDS.filter((id) => openCards[id]).length;

  const isRootDealt = (rootId: RootCardId) =>
    ROOT_SUB_CARDS[rootId].some((sid) => openCards[sid]);

  const btnStyle = (isActive: boolean): React.CSSProperties =>
    isActive
      ? {
          backgroundColor: cardTheme.activeBg,
          color: cardTheme.activeInk,
          borderColor: cardTheme.activeBg,
        }
      : {
          backgroundColor: cardTheme.subtleBg,
          color: cardTheme.ink,
          borderColor: cardTheme.subtleBorder,
        };

  const railStyle: React.CSSProperties = {
    backgroundColor: cardTheme.stockBg,
    color: cardTheme.ink,
    borderColor: cardTheme.border,
  };

  const exposureLabel = `${visualFilter.exposure >= 0 ? '+' : ''}${visualFilter.exposure.toFixed(1)} EV`;

  return (
    <div
      className={
        active
          ? 'fixed inset-0 z-30 overflow-hidden select-none'
          : 'hidden pointer-events-none'
      }
      aria-hidden={!active}
    >
      {/* Hidden local audio picker */}
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          void handleAudioFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {/* Hidden custom backdrop picker (Photo / 360° / .splat / .ply) */}
      <input
        ref={backdropInputRef}
        type="file"
        accept="image/*,.splat,.ply"
        className="hidden"
        onChange={(e) => {
          void handleBackdropFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Paper Sky WebGL2 Canvas */}
      <canvas
        ref={canvasRef}
        className={`block w-full h-full touch-none cursor-grab active:cursor-grabbing ${
          activeStyleMeta.pixelScale < 0.72 && visualFilter.style === 'natural'
            ? '[image-rendering:pixelated]'
            : ''
        }`}
      />

      {active && webglUnavailable && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#f4f1e8] p-6 text-center text-[#12161c]">
          <h1 className="font-mono text-2xl font-bold tracking-widest uppercase">PAPER SKY</h1>
          <button
            type="button"
            onClick={() => {
              onDescentStart(lastDropZoneRef.current);
              onDescentComplete(lastDropZoneRef.current);
            }}
            className="mt-5 px-5 py-2 border border-[#12161c] bg-[#12161c] text-[#f4f1e8] font-mono text-xs tracking-widest uppercase cursor-pointer"
          >
            &gt;&gt; ENTER VIRGINIA SYLVA
          </button>
        </div>
      )}

      {/* ── WHISPER-MINIMAL ADAPTIVE TOP RAIL ──────────────────────────────── */}
      <header
        style={{ opacity: uiFade }}
        className="fixed top-3 left-3.5 right-3.5 z-50 flex items-center justify-between gap-2 pointer-events-none transition-opacity duration-300"
      >
        <div className="pointer-events-auto flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              playSfx('open');
              onOpenMenu(null);
            }}
            title="Open 7-Panel Perspective Menu (M / Esc)"
            style={railStyle}
            className="px-2.5 py-1 border rounded-[4px] font-mono text-[10px] font-bold tracking-[0.12em] uppercase transition-opacity hover:opacity-90 cursor-pointer backdrop-blur-sm"
          >
            &gt;&gt; MENU
          </button>

          <button
            type="button"
            onClick={() => {
              playSfx('tick');
              if (!skyCardsVisible && openRootCount === 0) {
                restoreAllRootCards();
              }
              onToggleSkyCards();
            }}
            title="Toggle Playing-Card Deck (H)"
            style={railStyle}
            className="px-2 py-1 border rounded-[4px] font-mono text-[10px] font-bold tracking-[0.1em] uppercase transition-opacity hover:opacity-90 cursor-pointer backdrop-blur-sm"
          >
            DECK [{skyCardsVisible ? openRootCount : 0}/4]
          </button>

          {skyCardsVisible && openSubCount > 0 && (
            <button
              type="button"
              onClick={foldAllSubCards}
              title="Fold all dealt sub-cards"
              style={{
                backgroundColor: cardTheme.activeBg,
                color: cardTheme.activeInk,
                borderColor: cardTheme.activeBg,
              }}
              className="px-2 py-1 border rounded-[4px] font-mono text-[9.5px] font-bold tracking-[0.08em] uppercase cursor-pointer"
            >
              FOLD [{openSubCount}]
            </button>
          )}

          {skyCardsVisible &&
            closedRootIds.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => reopenRootCard(id)}
                title={`Restore ${ROOT_CARD_INDEX[id].rank}${ROOT_CARD_INDEX[id].suit} ${ROOT_CARD_INDEX[id].label}`}
                style={railStyle}
                className="px-1.5 py-1 border rounded-[4px] font-mono text-[9.5px] font-bold cursor-pointer backdrop-blur-sm"
              >
                +{ROOT_CARD_INDEX[id].rank}
                {ROOT_CARD_INDEX[id].suit}
              </button>
            ))}

          <button
            type="button"
            onClick={onToggleSound}
            title="Toggle Blue Ridge Ambient Sound"
            style={railStyle}
            className="w-6.5 h-6.5 flex items-center justify-center border rounded-[4px] cursor-pointer backdrop-blur-sm"
          >
            {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3 opacity-70" />}
          </button>
        </div>

        {/* Right Coordinate & Jump Readout + Drop Trigger */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div
            style={railStyle}
            className="hidden sm:flex items-center gap-2 px-2 py-1 border rounded-[4px] font-mono text-[9.5px] tracking-[0.08em] uppercase tabular-nums backdrop-blur-sm"
          >
            <span>{telemetry.zoneLabel}</span>
            <span className="opacity-35">/</span>
            <span>{telemetry.altitudeFt} FT</span>
            <span className="opacity-35">/</span>
            <span>{activePhysicsMeta.shortLabel}</span>
            <span className="inline-flex items-center gap-0.5 ml-0.5" aria-label={`${telemetry.jumpsRemaining} jumps`}>
              {Array.from({ length: telemetry.maxJumps }, (_, i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 border"
                  style={{
                    borderColor: cardTheme.ink,
                    backgroundColor: i < telemetry.jumpsRemaining ? cardTheme.ink : 'transparent',
                    opacity: i < telemetry.jumpsRemaining ? 1 : 0.35,
                  }}
                />
              ))}
            </span>
          </div>

          <button
            type="button"
            onClick={() => engineRef.current?.triggerCloudDescent()}
            title={`Drop into ${telemetry.dropZone.presetName}`}
            className="px-2.5 py-1 border rounded-[4px] border-[#12161c] bg-[#12161c] text-[#f6f3eb] hover:bg-[#f26a56] hover:border-[#f26a56] font-mono text-[10px] font-bold tracking-[0.12em] uppercase transition-colors cursor-pointer"
          >
            &gt;&gt; DROP
          </button>
        </div>
      </header>

      {/* ── ADAPTIVE PLAYING-CARD DECK (4 ROOT CARDS + 13 FANNED SUB-CARDS) ── */}
      {active && skyCardsVisible && !menuOpen && uiFade > 0.08 && (
        <div
          style={{ opacity: uiFade }}
          className="fixed inset-0 z-40 pointer-events-none transition-opacity duration-200"
        >
          {/* ══════════════════════════════════════════════════════════════════
              ROOT CARD 1: A♠ ENGINE (Deals 2♠–6♠ Visual, Filter, Tone, Glow, Backdrop)
             ══════════════════════════════════════════════════════════════════ */}
          {openCards.style && (
            <PipUiCard
              id="style"
              code="01"
              rank="A"
              suit="♠"
              title="ENGINE"
              accentHex={activeStyleMeta.swatch}
              cardTheme={cardTheme}
              anchorX={0.145}
              anchorY={0.105}
              initialL={248}
              initialAspect={0}
              restRotY={7}
              layered
              dealCount={5}
              dealtOpen={isRootDealt('style')}
              onToggleDeal={() => toggleDealRoot('style')}
              zIndex={zOrder.style ?? 41}
              minimized={Boolean(minCards.style)}
              onFocus={() => focusCard('style')}
              onToggleMinimize={() => toggleMinCard('style')}
              onClose={() => closeCard('style')}
            >
              <div className="flex flex-col h-full justify-between gap-1.5">
                {/* 13-Mode Visual Engine Quick Cycler */}
                <div className="flex flex-col gap-1" data-pip-interactive="true">
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      aria-label="Previous visual engine"
                      onClick={() => cyclePaperSkyStyle(-1)}
                      style={btnStyle(false)}
                      className="px-1.5 py-1 border rounded-[3px] cursor-pointer"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <div
                      style={{ borderColor: cardTheme.innerRule }}
                      className="flex-1 min-w-0 px-1.5 py-0.5 border rounded-[3px] text-center"
                    >
                      <div className="font-mono text-[9px] font-bold tracking-[0.06em] uppercase truncate">
                        {activeStyleMeta.code} · {activeStyleMeta.shortLabel}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Next visual engine"
                      onClick={() => cyclePaperSkyStyle(1)}
                      style={btnStyle(false)}
                      className="px-1.5 py-1 border rounded-[3px] cursor-pointer"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Compact 13-Swatch Strip */}
                  <div className="grid grid-cols-7 gap-0.5">
                    {PAPER_SKY_STYLES.map((st) => {
                      const isAct = paperSkyStyle === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          title={`${st.code} ${st.label}`}
                          onClick={() => {
                            playSfx('pop');
                            onSelectPaperSkyStyle(st.id);
                          }}
                          className={`h-4 border rounded-[2px] flex items-center justify-center font-mono text-[7px] font-bold cursor-pointer transition-transform ${
                            isAct ? 'scale-105 ring-1 ring-current z-10' : 'opacity-85 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: st.swatch,
                            color: st.ink,
                            borderColor: isAct ? cardTheme.ink : 'rgba(0,0,0,0.32)',
                          }}
                        >
                          {st.code}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick 6-Filter Switcher */}
                <div
                  style={{ borderColor: cardTheme.innerRule }}
                  className="pt-1.5 border-t flex flex-col gap-1"
                  data-pip-interactive="true"
                >
                  <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.08em]">
                    <span style={{ color: cardTheme.mutedInk }}>OPTICAL FILTER</span>
                    <span className="font-bold tabular-nums">{exposureLabel}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {QUICK_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          playSfx('tick');
                          onSelectVisualFilter(f.id);
                        }}
                        style={btnStyle(visualFilter.style === f.id)}
                        className="py-1 border rounded-[3px] font-mono text-[8px] font-bold tracking-[0.06em] cursor-pointer"
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Deal Prompt Footer */}
                <button
                  type="button"
                  onClick={() => toggleDealRoot('style')}
                  style={btnStyle(isRootDealt('style'))}
                  data-pip-interactive="true"
                  className="w-full py-1.5 px-2 border rounded-[3px] font-mono text-[8.5px] font-bold tracking-[0.08em] uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-3 h-3 shrink-0" />
                  <span>
                    {isRootDealt('style') ? 'FOLD 5 ENGINE CARDS' : 'DEAL 5 OPTICAL CARDS'}
                  </span>
                </button>
              </div>
            </PipUiCard>
          )}

          {/* SUB-CARD 2♠: VISUAL ENGINE MATRIX */}
          {openCards['style-engines'] && (
            <PipUiCard
              id="style-engines"
              code="2♠"
              rank="2"
              suit="♠"
              title="VISUAL ENGINE"
              accentHex={activeStyleMeta.swatch}
              cardTheme={cardTheme}
              anchorX={0.18}
              anchorY={0.47}
              initialL={248}
              initialAspect={0}
              dealDelayMs={0}
              zIndex={zOrder['style-engines'] ?? 51}
              minimized={Boolean(minCards['style-engines'])}
              onFocus={() => focusCard('style-engines')}
              onToggleMinimize={() => toggleMinCard('style-engines')}
              onClose={() => closeCard('style-engines')}
            >
              <div className="flex flex-col gap-1" data-pip-interactive="true">
                {PAPER_SKY_STYLES.map((st) => {
                  const isCur = paperSkyStyle === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        playSfx('pop');
                        onSelectPaperSkyStyle(st.id);
                      }}
                      style={btnStyle(isCur)}
                      className="px-1.5 py-1 border rounded-[3px] text-left cursor-pointer flex items-center justify-between gap-1.5"
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-[2px] border border-black/30 shrink-0"
                          style={{ backgroundColor: st.swatch }}
                        />
                        <span className="font-mono text-[8.5px] font-bold uppercase truncate">
                          {st.label}
                        </span>
                      </span>
                      <span className="font-mono text-[7.5px] opacity-65 tabular-nums shrink-0">
                        {st.code}
                      </span>
                    </button>
                  );
                })}
              </div>
            </PipUiCard>
          )}

          {/* SUB-CARD 3♠: FILTER, TINT & CUSTOM GLYPHS */}
          {openCards['style-filter'] && (
            <PipUiCard
              id="style-filter"
              code="3♠"
              rank="3"
              suit="♠"
              title="FILTER & GLYPHS"
              accentHex="#9b7bff"
              cardTheme={cardTheme}
              anchorX={0.36}
              anchorY={0.50}
              initialL={242}
              initialAspect={0}
              dealDelayMs={35}
              zIndex={zOrder['style-filter'] ?? 52}
              minimized={Boolean(minCards['style-filter'])}
              onFocus={() => focusCard('style-filter')}
              onToggleMinimize={() => toggleMinCard('style-filter')}
              onClose={() => closeCard('style-filter')}
            >
              <div className="flex flex-col gap-2" data-pip-interactive="true">
                <div className="grid grid-cols-3 gap-1">
                  {QUICK_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        playSfx('tick');
                        onSelectVisualFilter(f.id);
                      }}
                      style={btnStyle(visualFilter.style === f.id)}
                      className="py-1 border rounded-[3px] font-mono text-[8px] font-bold uppercase cursor-pointer"
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Color Tint */}
                <div className="flex flex-col gap-1">
                  <span
                    className="font-mono text-[7.5px] uppercase tracking-[0.08em]"
                    style={{ color: cardTheme.mutedInk }}
                  >
                    COLOR TINT
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {TINT_OPTIONS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          playSfx('tick');
                          onPatchVisualFilter({ colorTint: t.id });
                        }}
                        style={btnStyle(visualFilter.colorTint === t.id)}
                        className="py-1 border rounded-[3px] flex flex-col items-center gap-0.5 cursor-pointer"
                      >
                        <span
                          className="w-3 h-1.5 rounded-[1px] border border-black/25"
                          style={{ background: t.swatch }}
                        />
                        <span className="font-mono text-[7.5px] font-bold">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <CardRangeSlider
                  label="Cell Density"
                  valueLabel={`${Math.round(visualFilter.density * 100)}%`}
                  min={0}
                  max={1}
                  step={0.02}
                  value={visualFilter.density}
                  theme={cardTheme}
                  onChange={(v) => onPatchVisualFilter({ density: v })}
                />

                {/* Glyph Presets + Custom Glyph Ramp Input */}
                <div
                  style={{ borderColor: cardTheme.innerRule }}
                  className="pt-1.5 border-t flex flex-col gap-1"
                >
                  <span
                    className="font-mono text-[7.5px] uppercase tracking-[0.08em]"
                    style={{ color: cardTheme.mutedInk }}
                  >
                    ASCII GLYPH RAMP
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {ASCII_GLYPH_SETS.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          playSfx('tick');
                          onPatchVisualFilter({ glyphSet: g.id, customGlyphs: '' });
                        }}
                        style={btnStyle(
                          !visualFilter.customGlyphs.trim() && visualFilter.glyphSet === g.id,
                        )}
                        className="py-1 border rounded-[3px] font-mono text-[7.5px] font-bold uppercase cursor-pointer"
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={visualFilter.customGlyphs}
                    onChange={(e) => onPatchVisualFilter({ customGlyphs: e.target.value })}
                    placeholder="Custom glyphs (auto ink-sorted)…"
                    style={{
                      backgroundColor: cardTheme.subtleBg,
                      color: cardTheme.ink,
                      borderColor: cardTheme.subtleBorder,
                    }}
                    className="w-full px-1.5 py-1 border rounded-[3px] font-mono text-[8.5px] outline-none"
                  />
                </div>
              </div>
            </PipUiCard>
          )}

          {/* SUB-CARD 4♠: TONE & LEGIBILITY (Glyph Light Optical Controls) */}
          {openCards['style-tone'] && (
            <PipUiCard
              id="style-tone"
              code="4♠"
              rank="4"
              suit="♠"
              title="TONE · LEGIBILITY"
              accentHex="#f3c564"
              cardTheme={cardTheme}
              anchorX={0.54}
              anchorY={0.50}
              initialL={240}
              initialAspect={0}
              dealDelayMs={70}
              zIndex={zOrder['style-tone'] ?? 53}
              minimized={Boolean(minCards['style-tone'])}
              onFocus={() => focusCard('style-tone')}
              onToggleMinimize={() => toggleMinCard('style-tone')}
              onClose={() => closeCard('style-tone')}
            >
              <div className="flex flex-col h-full justify-between gap-2" data-pip-interactive="true">
                <div className="flex flex-col gap-2">
                  <CardRangeSlider
                    label="Exposure"
                    valueLabel={exposureLabel}
                    min={-3}
                    max={3}
                    step={0.1}
                    value={visualFilter.exposure}
                    theme={cardTheme}
                    onChange={(v) => onPatchVisualFilter({ exposure: v })}
                  />
                  <CardRangeSlider
                    label="Contrast"
                    valueLabel={`${Math.round(visualFilter.contrast * 100)}%`}
                    min={0.5}
                    max={3.0}
                    step={0.05}
                    value={visualFilter.contrast}
                    theme={cardTheme}
                    onChange={(v) => onPatchVisualFilter({ contrast: v })}
                  />
                  <CardRangeSlider
                    label="Midtones"
                    valueLabel={visualFilter.gamma.toFixed(2)}
                    min={0.3}
                    max={3.0}
                    step={0.05}
                    value={visualFilter.gamma}
                    theme={cardTheme}
                    onChange={(v) => onPatchVisualFilter({ gamma: v })}
                  />
                  <CardRangeSlider
                    label="Detail"
                    valueLabel={`${Math.round(visualFilter.detail * 100)}%`}
                    min={0}
                    max={3.0}
                    step={0.05}
                    value={visualFilter.detail}
                    theme={cardTheme}
                    onChange={(v) => onPatchVisualFilter({ detail: v })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-1 pt-1 border-t" style={{ borderColor: cardTheme.innerRule }}>
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tick');
                      onPatchVisualFilter({ invert: !visualFilter.invert });
                    }}
                    style={btnStyle(visualFilter.invert)}
                    className="py-1.5 border rounded-[3px] font-mono text-[8.5px] font-bold uppercase cursor-pointer"
                  >
                    INVERT: {visualFilter.invert ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={onResetVisualTone}
                    style={btnStyle(false)}
                    className="py-1.5 border rounded-[3px] font-mono text-[8.5px] font-bold uppercase cursor-pointer"
                  >
                    RESET TONE
                  </button>
                </div>
              </div>
            </PipUiCard>
          )}

          {/* SUB-CARD 5♠: GLOW, BLEND & MOTION FX */}
          {openCards['style-glow'] && (
            <PipUiCard
              id="style-glow"
              code="5♠"
              rank="5"
              suit="♠"
              title="GLOW & MOTION"
              accentHex="#7ad1ff"
              cardTheme={cardTheme}
              anchorX={0.72}
              anchorY={0.47}
              initialL={240}
              initialAspect={0}
              dealDelayMs={105}
              zIndex={zOrder['style-glow'] ?? 54}
              minimized={Boolean(minCards['style-glow'])}
              onFocus={() => focusCard('style-glow')}
              onToggleMinimize={() => toggleMinCard('style-glow')}
              onClose={() => closeCard('style-glow')}
            >
              <div className="flex flex-col h-full justify-between gap-2" data-pip-interactive="true">
                <div className="flex flex-col gap-2">
                  <CardRangeSlider
                    label="Glow Intensity"
                    valueLabel={`${Math.round(visualFilter.glow * 100)}%`}
                    min={0}
                    max={1}
                    step={0.02}
                    value={visualFilter.glow}
                    theme={cardTheme}
                    onChange={(v) => onPatchVisualFilter({ glow: v })}
                  />
                  <CardRangeSlider
                    label="Glow Starts At"
                    valueLabel={`${Math.round(visualFilter.glowThreshold * 100)}%`}
                    min={0.3}
                    max={0.95}
                    step={0.02}
                    value={visualFilter.glowThreshold}
                    theme={cardTheme}
                    onChange={(v) => onPatchVisualFilter({ glowThreshold: v })}
                  />
                  <CardRangeSlider
                    label="Image Under Glyphs"
                    valueLabel={`${Math.round(visualFilter.underImage * 100)}%`}
                    min={0}
                    max={0.6}
                    step={0.02}
                    value={visualFilter.underImage}
                    theme={cardTheme}
                    onChange={(v) => onPatchVisualFilter({ underImage: v })}
                  />
                </div>

                <div
                  style={{ borderColor: cardTheme.innerRule }}
                  className="pt-1.5 border-t flex flex-col gap-1"
                >
                  <span
                    className="font-mono text-[7.5px] uppercase tracking-[0.08em]"
                    style={{ color: cardTheme.mutedInk }}
                  >
                    MOTION FX
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {MOTION_FX_OPTIONS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          playSfx('tick');
                          onPatchVisualFilter({
                            motion: m.id,
                            shimmer: m.id === 'shimmer' || m.id === 'pulse',
                          });
                        }}
                        style={btnStyle(visualFilter.motion === m.id)}
                        className="py-1 border rounded-[3px] font-mono text-[7.5px] font-bold uppercase cursor-pointer"
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </PipUiCard>
          )}

          {/* SUB-CARD 6♠: BACKDROP STUDIO */}
          {openCards['style-backdrop'] && (
            <PipUiCard
              id="style-backdrop"
              code="6♠"
              rank="6"
              suit="♠"
              title="BACKDROP STUDIO"
              accentHex="#5ba4e0"
              cardTheme={cardTheme}
              anchorX={0.86}
              anchorY={0.44}
              initialL={226}
              initialAspect={0}
              dealDelayMs={140}
              zIndex={zOrder['style-backdrop'] ?? 55}
              minimized={Boolean(minCards['style-backdrop'])}
              onFocus={() => focusCard('style-backdrop')}
              onToggleMinimize={() => toggleMinCard('style-backdrop')}
              onClose={() => closeCard('style-backdrop')}
            >
              <div
                className="flex flex-col h-full justify-between gap-2"
                data-pip-interactive="true"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragBackdropOver(true);
                }}
                onDragLeave={() => setDragBackdropOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragBackdropOver(false);
                  void handleBackdropFiles(e.dataTransfer.files);
                }}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between font-mono text-[8px] uppercase">
                    <span style={{ color: cardTheme.mutedInk }}>ACTIVE DOME</span>
                    <span className="font-bold">
                      {backdropSnap.loading
                        ? 'LOADING'
                        : backdropSnap.active
                          ? backdropSnap.sourceKind === 'splat'
                            ? `${Math.round(backdropSnap.splatCount / 1000)}K SPLAT`
                            : backdropSnap.projection === 'photo-360'
                              ? '360° DOME'
                              : '2.5D DEPTH'
                          : 'SKY DOME'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => backdropInputRef.current?.click()}
                    style={btnStyle(dragBackdropOver || backdropSnap.active)}
                    className="w-full py-2 px-2 border border-dashed rounded-[3px] font-mono text-[8.5px] font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {backdropSnap.active && backdropSnap.fileName
                        ? backdropSnap.fileName
                        : '+ DROP BACKDROP'}
                    </span>
                  </button>

                  <div
                    className="font-mono text-[7.5px] uppercase text-center"
                    style={{ color: cardTheme.mutedInk }}
                  >
                    PNG · JPG · 360° · .SPLAT · .PLY
                  </div>
                </div>

                {backdropSnap.active && (
                  <div className="flex flex-col gap-1.5">
                    <CardRangeSlider
                      label="Engine Stylize"
                      valueLabel={`${Math.round(backdropSnap.stylizeAmount * 100)}%`}
                      min={0}
                      max={1}
                      step={0.05}
                      value={backdropSnap.stylizeAmount}
                      theme={cardTheme}
                      onChange={(v) => sharedCustomBackdropHub.setStylizeAmount(v)}
                    />
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          playSfx('tick');
                          sharedCustomBackdropHub.toggleProjection();
                        }}
                        style={btnStyle(false)}
                        className="py-1 border rounded-[3px] font-mono text-[8px] font-bold uppercase cursor-pointer"
                      >
                        {backdropSnap.projection === 'photo-360' ? '360°' : '2.5D'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playSfx('back');
                          sharedCustomBackdropHub.clear();
                        }}
                        style={btnStyle(false)}
                        className="py-1 border rounded-[3px] font-mono text-[8px] font-bold uppercase cursor-pointer"
                      >
                        CLEAR
                      </button>
                    </div>
                  </div>
                )}

                {backdropSnap.error && (
                  <div className="font-mono text-[8px] text-[#e03e42] truncate">
                    {backdropSnap.error}
                  </div>
                )}
              </div>
            </PipUiCard>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ROOT CARD 2: K♥ FLIGHT (Deals 2♥–4♥ Physics, Angelic Cards, Drop Sites)
             ══════════════════════════════════════════════════════════════════ */}
          {openCards.drop && (
            <PipUiCard
              id="drop"
              code="02"
              rank="K"
              suit="♥"
              title="FLIGHT"
              accentHex={telemetry.dropZone.accentHex}
              cardTheme={cardTheme}
              anchorX={0.385}
              anchorY={0.12}
              initialL={240}
              initialAspect={0}
              restRotY={10}
              restSkewY={2.0}
              layered
              dealCount={3}
              dealtOpen={isRootDealt('drop')}
              onToggleDeal={() => toggleDealRoot('drop')}
              zIndex={zOrder.drop ?? 42}
              minimized={Boolean(minCards.drop)}
              onFocus={() => focusCard('drop')}
              onToggleMinimize={() => toggleMinCard('drop')}
              onClose={() => closeCard('drop')}
            >
              <div className="flex flex-col h-full justify-between gap-1.5">
                <div>
                  <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.08em]">
                    <span style={{ color: cardTheme.mutedInk }}>BELOW CLOUDS</span>
                    <span className="font-bold">{telemetry.dropZone.compass}</span>
                  </div>
                  <div className="mt-0.5 font-display text-[13.5px] font-semibold leading-tight truncate">
                    {telemetry.dropZone.presetName}
                  </div>
                  <div
                    className="mt-1 h-1 w-full rounded-[1px]"
                    style={{ backgroundColor: telemetry.dropZone.accentHex }}
                  />
                </div>

                {/* Quick Physics Profile Strip */}
                <div
                  style={{ borderColor: cardTheme.innerRule }}
                  className="pt-1 border-t flex flex-col gap-1"
                  data-pip-interactive="true"
                >
                  <div className="flex items-center justify-between font-mono text-[7.5px] uppercase">
                    <span style={{ color: cardTheme.mutedInk }}>PHYSICS</span>
                    <span className="font-bold">{activePhysicsMeta.maxJumps}× HOP</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {PHYSICS_PROFILES.map((prof) => (
                      <button
                        key={prof.id}
                        type="button"
                        onClick={() => {
                          playSfx('pop');
                          onSelectPhysicsProfile(prof.id);
                        }}
                        style={btnStyle(physicsProfile === prof.id)}
                        className="py-1 px-1 border rounded-[3px] font-mono text-[8px] font-bold uppercase cursor-pointer"
                      >
                        {prof.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Drop & Action Buttons */}
                <div className="flex flex-col gap-1" data-pip-interactive="true">
                  <button
                    type="button"
                    onClick={() => engineRef.current?.triggerCloudDescent()}
                    className="w-full py-1.5 px-2 border rounded-[3px] border-[#12161c] bg-[#12161c] text-[#f6f3eb] hover:bg-[#f26a56] hover:border-[#f26a56] font-mono text-[9px] font-bold tracking-[0.1em] uppercase flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <ArrowDown className="w-3 h-3" />
                    <span>&gt;&gt; ENTER LAND</span>
                  </button>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        playSfx('back');
                        engineRef.current?.relaunchAtCheckpoint();
                      }}
                      style={btnStyle(false)}
                      className="py-1 border rounded-[3px] font-mono text-[8px] font-bold uppercase flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>RESET</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playSfx('open');
                        engineRef.current?.toggleDreamSight();
                      }}
                      style={btnStyle(telemetry.dreamSightActive)}
                      className="py-1 border rounded-[3px] font-mono text-[8px] font-bold uppercase flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-2.5 h-2.5" />
                      <span>SENSE</span>
                    </button>
                  </div>
                </div>
              </div>
            </PipUiCard>
          )}

          {/* SUB-CARD 2♥: PHYSICS PROFILES */}
          {openCards['drop-physics'] && (
            <PipUiCard
              id="drop-physics"
              code="2♥"
              rank="2"
              suit="♥"
              title="PHYSICS PROFILES"
              accentHex={activePhysicsMeta.accentHex}
              cardTheme={cardTheme}
              anchorX={0.26}
              anchorY={0.48}
              initialL={240}
              initialAspect={0}
              dealDelayMs={0}
              zIndex={zOrder['drop-physics'] ?? 56}
              minimized={Boolean(minCards['drop-physics'])}
              onFocus={() => focusCard('drop-physics')}
              onToggleMinimize={() => toggleMinCard('drop-physics')}
              onClose={() => closeCard('drop-physics')}
            >
              <div className="flex flex-col gap-1.5" data-pip-interactive="true">
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
                      style={btnStyle(isCur)}
                      className="p-1.5 border rounded-[3px] text-left cursor-pointer"
                    >
                      <div className="flex items-center justify-between font-mono text-[8.5px] font-bold uppercase">
                        <span>{prof.label}</span>
                        <span className="tabular-nums opacity-75">{prof.maxJumps}×</span>
                      </div>
                      <div className="mt-0.5 font-mono text-[7.5px] leading-tight opacity-75">
                        {prof.feelNote}
                      </div>
                    </button>
                  );
                })}
              </div>
            </PipUiCard>
          )}

          {/* SUB-CARD 3♥: ANGELIC 3D CARD CHOREOGRAPHY */}
          {openCards['drop-angelic'] && (
            <PipUiCard
              id="drop-angelic"
              code="3♥"
              rank="3"
              suit="♥"
              title="ANGELIC CARDS"
              accentHex="#f4dc82"
              cardTheme={cardTheme}
              anchorX={0.46}
              anchorY={0.50}
              initialL={240}
              initialAspect={0}
              dealDelayMs={40}
              zIndex={zOrder['drop-angelic'] ?? 57}
              minimized={Boolean(minCards['drop-angelic'])}
              onFocus={() => focusCard('drop-angelic')}
              onToggleMinimize={() => toggleMinCard('drop-angelic')}
              onClose={() => closeCard('drop-angelic')}
            >
              <div className="flex flex-col h-full justify-between gap-2" data-pip-interactive="true">
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('pop');
                      onPatchCardChoreography({
                        catchCardsEnabled: !cardChoreography.catchCardsEnabled,
                      });
                    }}
                    style={btnStyle(cardChoreography.catchCardsEnabled)}
                    className="w-full py-1.5 px-2 border rounded-[3px] font-mono text-[8.5px] font-bold uppercase flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>SKY CATCH-CARDS</span>
                    </span>
                    <span>{cardChoreography.catchCardsEnabled ? 'ON' : 'OFF'}</span>
                  </button>

                  <CardRangeSlider
                    label="Proximity Wake"
                    valueLabel={`${Math.round(cardChoreography.proximityWake * 100)}%`}
                    min={0}
                    max={1}
                    step={0.05}
                    value={cardChoreography.proximityWake}
                    theme={cardTheme}
                    onChange={(v) => onPatchCardChoreography({ proximityWake: v })}
                  />

                  <CardRangeSlider
                    label="Slipstream Orbit"
                    valueLabel={`${Math.round(cardChoreography.slipstreamOrbit * 100)}%`}
                    min={0}
                    max={1}
                    step={0.05}
                    value={cardChoreography.slipstreamOrbit}
                    theme={cardTheme}
                    onChange={(v) => onPatchCardChoreography({ slipstreamOrbit: v })}
                  />
                </div>

                <div
                  style={{ borderColor: cardTheme.innerRule, color: cardTheme.mutedInk }}
                  className="pt-1.5 border-t font-mono text-[7.5px] leading-snug"
                >
                  Cards peel from the sky vortex to catch you mid-air. Hold SHIFT to dive cleanly
                  through the clouds.
                </div>
              </div>
            </PipUiCard>
          )}

          {/* SUB-CARD 4♥: DROP SANCTUARIES */}
          {openCards['drop-sites'] && (
            <PipUiCard
              id="drop-sites"
              code="4♥"
              rank="4"
              suit="♥"
              title="DROP SITES"
              accentHex={telemetry.dropZone.accentHex}
              cardTheme={cardTheme}
              anchorX={0.66}
              anchorY={0.48}
              initialL={238}
              initialAspect={0}
              dealDelayMs={80}
              zIndex={zOrder['drop-sites'] ?? 58}
              minimized={Boolean(minCards['drop-sites'])}
              onFocus={() => focusCard('drop-sites')}
              onToggleMinimize={() => toggleMinCard('drop-sites')}
              onClose={() => closeCard('drop-sites')}
            >
              <div className="flex flex-col gap-1" data-pip-interactive="true">
                {SPACE_PRESETS.map((p, idx) => {
                  const isCur = telemetry.dropZone.presetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        playSfx('pop');
                        onSelectDropPreset(p.id);
                        engineRef.current?.triggerCloudDescent();
                      }}
                      style={btnStyle(isCur)}
                      className="flex items-center justify-between px-2 py-1.5 border rounded-[3px] font-mono text-[8px] font-bold uppercase cursor-pointer"
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="opacity-60 tabular-nums ml-1">0{idx + 1}</span>
                    </button>
                  );
                })}
              </div>
            </PipUiCard>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ROOT CARD 3: Q♣ HORIZON (Deals 2♣–4♣ Audio Ring, Ensemble, Voice)
             ══════════════════════════════════════════════════════════════════ */}
          {openCards.horizon && (
            <PipUiCard
              id="horizon"
              code="03"
              rank="Q"
              suit="♣"
              title="HORIZON"
              accentHex={trackInfo.colorHex}
              cardTheme={cardTheme}
              anchorX={0.635}
              anchorY={0.105}
              initialL={236}
              initialAspect={0}
              restRotY={-9}
              restSkewY={-2.5}
              layered
              dealCount={3}
              dealtOpen={isRootDealt('horizon')}
              onToggleDeal={() => toggleDealRoot('horizon')}
              zIndex={zOrder.horizon ?? 43}
              minimized={Boolean(minCards.horizon)}
              onFocus={() => focusCard('horizon')}
              onToggleMinimize={() => toggleMinCard('horizon')}
              onClose={() => closeCard('horizon')}
            >
              <div
                className="flex flex-col h-full justify-between gap-2"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragAudioOver(true);
                }}
                onDragLeave={() => setDragAudioOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragAudioOver(false);
                  void handleAudioFiles(e.dataTransfer.files);
                }}
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.08em]">
                    <span style={{ color: cardTheme.mutedInk }}>
                      {callState.mode === 'room' ? `ROOM #${callState.roomId}` : 'LOCAL RING'}
                    </span>
                    <span className="font-bold tabular-nums">
                      {activeSources.filter((s) => s.active).length} LIVE
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-5 w-full border rounded-[3px] relative overflow-hidden"
                    style={{
                      borderColor: cardTheme.subtleBorder,
                      background:
                        activeSources.length > 0
                          ? `linear-gradient(90deg, ${activeSources
                              .map((s) => s.colorHex)
                              .join(', ')}, ${trackInfo.colorHex})`
                          : `linear-gradient(90deg, transparent 0%, ${trackInfo.colorHex}88 50%, transparent 100%)`,
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-between px-1.5 font-mono text-[7.5px] font-bold text-[#0b0d10] mix-blend-hard-light">
                      <span>W</span>
                      <span>N</span>
                      <span>E</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1" data-pip-interactive="true">
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    style={btnStyle(dragAudioOver)}
                    className="w-full py-1.5 px-2 border border-dashed rounded-[3px] font-mono text-[8.5px] font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {trackInfo.hasTrack ? (
                      <>
                        <Music className="w-3 h-3 shrink-0" />
                        <span className="truncate">{trackInfo.name || 'AUDIO'}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3 shrink-0" />
                        <span>DROP AUDIO</span>
                      </>
                    )}
                  </button>

                  {trackInfo.hasTrack && (
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          playSfx('tick');
                          sharedHorizonAudioHub.toggleTrackPlayback();
                        }}
                        style={btnStyle(trackInfo.playing)}
                        className="py-1 border rounded-[3px] font-mono text-[8px] font-bold uppercase flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {trackInfo.playing ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                        <span>{trackInfo.playing ? 'PAUSE' : 'PLAY'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playSfx('back');
                          sharedHorizonAudioHub.clearTrack();
                        }}
                        style={btnStyle(false)}
                        className="py-1 border rounded-[3px] font-mono text-[8px] font-bold uppercase cursor-pointer"
                      >
                        CLEAR
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1 pt-1 border-t" style={{ borderColor: cardTheme.innerRule }} data-pip-interactive="true">
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tick');
                      void sharedHorizonAudioHub.toggleStandaloneMicMonitor();
                    }}
                    style={btnStyle(localMicOn)}
                    className="py-1.5 border rounded-[3px] font-mono text-[8px] font-bold uppercase flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {localMicOn ? <Mic className="w-2.5 h-2.5" /> : <MicOff className="w-2.5 h-2.5" />}
                    <span>MIC</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('open');
                      onOpenMenu('call');
                    }}
                    style={btnStyle(callState.mode === 'room')}
                    className="py-1.5 border rounded-[3px] font-mono text-[8px] font-bold uppercase flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Phone className="w-2.5 h-2.5" />
                    <span>ROOM</span>
                  </button>
                </div>
              </div>
            </PipUiCard>
          )}

          {/* SUB-CARD 2♣: AUDIO & RING SWATCHES */}
          {openCards['horizon-audio'] && (
            <PipUiCard
              id="horizon-audio"
              code="2♣"
              rank="2"
              suit="♣"
              title="AUDIO & RING"
              accentHex={trackInfo.colorHex}
              cardTheme={cardTheme}
              anchorX={0.44}
              anchorY={0.48}
              initialL={230}
              initialAspect={0}
              dealDelayMs={0}
              zIndex={zOrder['horizon-audio'] ?? 59}
              minimized={Boolean(minCards['horizon-audio'])}
              onFocus={() => focusCard('horizon-audio')}
              onToggleMinimize={() => toggleMinCard('horizon-audio')}
              onClose={() => closeCard('horizon-audio')}
            >
              <div className="flex flex-col h-full justify-between gap-2" data-pip-interactive="true">
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  style={btnStyle(false)}
                  className="w-full py-2 px-2 border border-dashed rounded-[3px] font-mono text-[8.5px] font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {trackInfo.hasTrack ? trackInfo.name || 'AUDIO TRACK' : 'LOAD AUDIO FILE'}
                  </span>
                </button>

                <div className="flex flex-col gap-1">
                  <span
                    className="font-mono text-[7.5px] uppercase tracking-[0.08em]"
                    style={{ color: cardTheme.mutedInk }}
                  >
                    HORIZON RING HUE
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {VOICE_COLOR_PRESETS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        title={c.name}
                        onClick={() => {
                          playSfx('tick');
                          sharedHorizonAudioHub.setTrackColor(c.hex);
                          sharedHorizonAudioHub.setAmbientColor(c.hex);
                          sharedHorizonAudioHub.setLocalVoiceColor(c.hex);
                        }}
                        className="h-5 rounded-[3px] border cursor-pointer"
                        style={{
                          backgroundColor: c.hex,
                          borderColor:
                            trackInfo.colorHex === c.hex ? cardTheme.ink : 'rgba(0,0,0,0.28)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </PipUiCard>
          )}

          {/* SUB-CARD 3♣: CLOUD ENSEMBLE */}
          {openCards['horizon-ensemble'] && (
            <PipUiCard
              id="horizon-ensemble"
              code="3♣"
              rank="3"
              suit="♣"
              title="CLOUD ENSEMBLE"
              accentHex="#8ee6a8"
              cardTheme={cardTheme}
              anchorX={0.63}
              anchorY={0.50}
              initialL={226}
              initialAspect={0}
              dealDelayMs={40}
              zIndex={zOrder['horizon-ensemble'] ?? 60}
              minimized={Boolean(minCards['horizon-ensemble'])}
              onFocus={() => focusCard('horizon-ensemble')}
              onToggleMinimize={() => toggleMinCard('horizon-ensemble')}
              onClose={() => closeCard('horizon-ensemble')}
            >
              <div className="flex flex-col h-full justify-between gap-2" data-pip-interactive="true">
                <div>
                  <div className="font-mono text-[8px] uppercase" style={{ color: cardTheme.mutedInk }}>
                    SANCTUARY INSTRUMENTS
                  </div>
                  <div className="mt-1 font-display text-xl font-semibold tabular-nums">
                    {ensembleSnap.activeInstrumentCount} ACTIVE
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tick');
                      sharedInstrumentAudio.toggleEnabled();
                    }}
                    style={btnStyle(ensembleSnap.enabled)}
                    className="w-full py-1.5 px-2 border rounded-[3px] font-mono text-[8.5px] font-bold uppercase flex items-center justify-between cursor-pointer"
                  >
                    <span>CLOUD DRIFT</span>
                    <span>{ensembleSnap.enabled ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('open');
                      onOpenMenu('botanicals');
                    }}
                    style={btnStyle(false)}
                    className="w-full py-1.5 px-2 border rounded-[3px] font-mono text-[8px] font-bold uppercase cursor-pointer"
                  >
                    OPEN FLORA &amp; SOUND
                  </button>
                </div>
              </div>
            </PipUiCard>
          )}

          {/* SUB-CARD 4♣: VOICE & CALL ROOM */}
          {openCards['horizon-voice'] && (
            <PipUiCard
              id="horizon-voice"
              code="4♣"
              rank="4"
              suit="♣"
              title="VOICE & ROOM"
              accentHex="#f778b4"
              cardTheme={cardTheme}
              anchorX={0.81}
              anchorY={0.48}
              initialL={224}
              initialAspect={0}
              dealDelayMs={80}
              zIndex={zOrder['horizon-voice'] ?? 61}
              minimized={Boolean(minCards['horizon-voice'])}
              onFocus={() => focusCard('horizon-voice')}
              onToggleMinimize={() => toggleMinCard('horizon-voice')}
              onClose={() => closeCard('horizon-voice')}
            >
              <div className="flex flex-col h-full justify-between gap-2" data-pip-interactive="true">
                <div>
                  <div className="font-mono text-[8px] uppercase" style={{ color: cardTheme.mutedInk }}>
                    CALL STATUS
                  </div>
                  <div className="mt-1 font-mono text-[10px] font-bold uppercase">
                    {callState.mode === 'room'
                      ? `ROOM #${callState.roomId} · ${callState.peers.length + 1} IN`
                      : 'LOCAL MONITOR'}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tick');
                      void sharedHorizonAudioHub.toggleStandaloneMicMonitor();
                    }}
                    style={btnStyle(localMicOn)}
                    className="w-full py-1.5 px-2 border rounded-[3px] font-mono text-[8.5px] font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {localMicOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                    <span>{localMicOn ? 'MIC LIVE' : 'ENABLE MIC'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('open');
                      onOpenMenu('call');
                    }}
                    style={btnStyle(callState.mode === 'room')}
                    className="w-full py-1.5 px-2 border rounded-[3px] font-mono text-[8.5px] font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Phone className="w-3 h-3" />
                    <span>OPEN CALL ROOM</span>
                  </button>
                </div>
              </div>
            </PipUiCard>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ROOT CARD 4: J♦ STUDIO (Deals 2♦–3♦ Deck/Type & Export Studio)
             ══════════════════════════════════════════════════════════════════ */}
          {openCards.studio && (
            <PipUiCard
              id="studio"
              code="04"
              rank="J"
              suit="♦"
              title="STUDIO"
              accentHex="#f4dc82"
              cardTheme={cardTheme}
              anchorX={0.865}
              anchorY={0.115}
              initialL={232}
              initialAspect={0}
              restRotY={-12}
              restSkewY={-1.8}
              layered
              dealCount={2}
              dealtOpen={isRootDealt('studio')}
              onToggleDeal={() => toggleDealRoot('studio')}
              zIndex={zOrder.studio ?? 44}
              minimized={Boolean(minCards.studio)}
              onFocus={() => focusCard('studio')}
              onToggleMinimize={() => toggleMinCard('studio')}
              onClose={() => closeCard('studio')}
            >
              <div className="flex flex-col h-full justify-between gap-1.5" data-pip-interactive="true">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('tick');
                      onTogglePixelTypography();
                    }}
                    style={btnStyle(pixelTypography)}
                    className="w-full py-1.5 px-2 border rounded-[3px] font-mono text-[8.5px] font-bold uppercase flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1">
                      <Type className="w-3 h-3" />
                      <span>PIXEL TYPE</span>
                    </span>
                    <span>{pixelTypography ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onDownloadPng}
                    style={btnStyle(false)}
                    className="w-full py-1.5 px-2 border rounded-[3px] font-mono text-[8.5px] font-bold uppercase flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>POSTCARD PNG</span>
                    </span>
                    <span>SAVE</span>
                  </button>

                  <button
                    type="button"
                    onClick={onDownloadOfflineHtml}
                    style={btnStyle(false)}
                    className="w-full py-1.5 px-2 border rounded-[3px] font-mono text-[8.5px] font-bold uppercase flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      <span>OFFLINE SKY</span>
                    </span>
                    <span>HTML</span>
                  </button>
                </div>

                <div className="pt-1 border-t flex flex-col gap-1" style={{ borderColor: cardTheme.innerRule }}>
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('open');
                      onOpenMenu(null);
                    }}
                    style={btnStyle(false)}
                    className="w-full py-1.5 px-2 border rounded-[3px] font-mono text-[8.5px] font-bold uppercase cursor-pointer"
                  >
                    &gt;&gt; 7-PANEL MENU
                  </button>
                </div>
              </div>
            </PipUiCard>
          )}

          {/* SUB-CARD 2♦: DECK & TYPOGRAPHY */}
          {openCards['studio-deck'] && (
            <PipUiCard
              id="studio-deck"
              code="2♦"
              rank="2"
              suit="♦"
              title="DECK & TYPE"
              accentHex="#f4dc82"
              cardTheme={cardTheme}
              anchorX={0.62}
              anchorY={0.48}
              initialL={224}
              initialAspect={0}
              dealDelayMs={0}
              zIndex={zOrder['studio-deck'] ?? 62}
              minimized={Boolean(minCards['studio-deck'])}
              onFocus={() => focusCard('studio-deck')}
              onToggleMinimize={() => toggleMinCard('studio-deck')}
              onClose={() => closeCard('studio-deck')}
            >
              <div className="flex flex-col gap-1.5" data-pip-interactive="true">
                <button
                  type="button"
                  onClick={() => {
                    playSfx('tick');
                    onTogglePixelTypography();
                  }}
                  style={btnStyle(pixelTypography)}
                  className="w-full py-1.5 px-2 border rounded-[3px] font-mono text-[8.5px] font-bold uppercase flex items-center justify-between cursor-pointer"
                >
                  <span>PIXEL FONT</span>
                  <span>{pixelTypography ? 'ON' : 'OFF'}</span>
                </button>
                <button
                  type="button"
                  onClick={restoreAllRootCards}
                  style={btnStyle(false)}
                  className="w-full py-1.5 px-2 border rounded-[3px] font-mono text-[8.5px] font-bold uppercase cursor-pointer"
                >
                  RESTORE 4 ROOT CARDS
                </button>
                <button
                  type="button"
                  onClick={foldAllSubCards}
                  style={btnStyle(false)}
                  className="w-full py-1.5 px-2 border rounded-[3px] font-mono text-[8.5px] font-bold uppercase cursor-pointer"
                >
                  FOLD DEALT CARDS
                </button>
                <button
                  type="button"
                  onClick={onToggleSkyCards}
                  style={btnStyle(false)}
                  className="w-full py-1.5 px-2 border rounded-[3px] font-mono text-[8.5px] font-bold uppercase cursor-pointer"
                >
                  HIDE DECK (H)
                </button>
              </div>
            </PipUiCard>
          )}

          {/* SUB-CARD 3♦: EXPORT STUDIO */}
          {openCards['studio-export'] && (
            <PipUiCard
              id="studio-export"
              code="3♦"
              rank="3"
              suit="♦"
              title="EXPORT STUDIO"
              accentHex="#8ee6a8"
              cardTheme={cardTheme}
              anchorX={0.80}
              anchorY={0.48}
              initialL={224}
              initialAspect={0}
              dealDelayMs={45}
              zIndex={zOrder['studio-export'] ?? 63}
              minimized={Boolean(minCards['studio-export'])}
              onFocus={() => focusCard('studio-export')}
              onToggleMinimize={() => toggleMinCard('studio-export')}
              onClose={() => closeCard('studio-export')}
            >
              <div className="flex flex-col gap-1.5" data-pip-interactive="true">
                <button
                  type="button"
                  onClick={onDownloadPng}
                  style={btnStyle(false)}
                  className="w-full py-2 px-2 border rounded-[3px] font-mono text-[8.5px] font-bold uppercase flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3 h-3" />
                    <span>POSTCARD PNG</span>
                  </span>
                  <span>SAVE</span>
                </button>
                <button
                  type="button"
                  onClick={onDownloadOfflineHtml}
                  style={btnStyle(false)}
                  className="w-full py-2 px-2 border rounded-[3px] font-mono text-[8.5px] font-bold uppercase flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Download className="w-3 h-3" />
                    <span>OFFLINE PAPER SKY</span>
                  </span>
                  <span>HTML</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSfx('open');
                    onOpenMenu('archive');
                  }}
                  style={btnStyle(false)}
                  className="w-full py-2 px-2 border rounded-[3px] font-mono text-[8.5px] font-bold uppercase cursor-pointer"
                >
                  OPEN FULL ARCHIVE
                </button>
              </div>
            </PipUiCard>
          )}
        </div>
      )}

      {/* ── CLEAN BOTTOM CONTROL HINT & TOUCH PAD ─────────────────────────── */}
      {active && !menuOpen && uiFade > 0.1 && (
        <div
          style={{ opacity: uiFade }}
          className="fixed bottom-3 left-3.5 right-3.5 z-50 flex items-end justify-between pointer-events-none"
        >
          <div
            style={railStyle}
            className="pointer-events-auto hidden md:flex items-center gap-2 px-2.5 py-1 border rounded-[4px] font-mono text-[9px] tracking-[0.06em] uppercase backdrop-blur-sm"
          >
            <span>WASD MOVE</span>
            <span className="opacity-35">/</span>
            <span>SPACE JUMP · GLIDE</span>
            <span className="opacity-35">/</span>
            <span>F DASH</span>
            <span className="opacity-35">/</span>
            <span>SHIFT DIVE</span>
            <span className="opacity-35">/</span>
            <span>Q SENSE</span>
            <span className="opacity-35">/</span>
            <span>CLICK CARD TO DEAL</span>
          </div>

          <div className="pointer-events-auto flex md:hidden items-center gap-1.5 ml-auto">
            <button
              type="button"
              onPointerDown={() => {
                engineRef.current?.triggerLaunchInput();
                engineRef.current?.setVirtualGlideHeld(true);
              }}
              onPointerUp={() => engineRef.current?.setVirtualGlideHeld(false)}
              onPointerLeave={() => engineRef.current?.setVirtualGlideHeld(false)}
              style={railStyle}
              className="px-3 py-1.5 border rounded-[4px] font-mono text-[10px] font-bold uppercase cursor-pointer"
            >
              JUMP / GLIDE
            </button>
            <button
              type="button"
              onClick={() => engineRef.current?.triggerDashInput()}
              style={railStyle}
              className="px-2.5 py-1.5 border rounded-[4px] font-mono text-[10px] font-bold uppercase cursor-pointer"
            >
              DASH
            </button>
            <button
              type="button"
              onPointerDown={() => engineRef.current?.setVirtualDive(true)}
              onPointerUp={() => engineRef.current?.setVirtualDive(false)}
              onPointerLeave={() => engineRef.current?.setVirtualDive(false)}
              style={railStyle}
              className="px-2.5 py-1.5 border rounded-[4px] font-mono text-[10px] font-bold uppercase cursor-pointer"
            >
              DIVE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
