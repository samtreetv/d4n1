import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Compass,
  Eraser,
  Feather,
  Footprints,
  Hand,
  Layers,
  LayoutGrid,
  Map as MapIcon,
  Mountain,
  Paintbrush,
  Palette,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Sparkles,
  Sprout,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { BimSheet } from './components/BimSheet';
import { BotanicalIcon } from './components/BotanicalIcons';
import { FloatingMediaTiles } from './components/FloatingMediaTiles';
import { InstrumentConsole } from './components/InstrumentConsole';
import { GlassOrbButton, GouacheSwatch, ORB_TONES, OrbTone } from './components/OrbPrimitives';
import { PaperSkyStage } from './components/PaperSkyStage';
import { PerspectiveMenu, SpatialContainerId } from './components/PerspectiveMenu';
import { CallRoomEngine, CallRoomSnapshot } from './engine/callRoomEngine';
import { sharedCustomBackdropHub } from './engine/customBackdropHub';
import { sharedHorizonAudioHub } from './engine/horizonAudioHub';
import { sharedInstrumentAudio } from './engine/instrumentAudio';
import {
  PaperSkyVisualStyle,
  getPaperSkyStyleMeta,
} from './engine/paperSky/CardAtlasShader';
import {
  CardChoreographySettings,
  DEFAULT_CARD_CHOREOGRAPHY,
} from './engine/paperSky/InstancedWorldBuilder';
import { PaperSkyDropZone } from './engine/paperSky/PaperSkyEngine';
import { PhysicsProfileId, getPhysicsProfile } from './engine/paperSky/physicsProfiles';
import {
  BackdropStyle,
  BimLayerId,
  PATH_MATERIALS,
  PathMaterialId,
  PathNode,
  PlaceableId,
  PlacedSpaceItem,
  SPACE_PRESETS,
  VIRGINIA_ITEMS,
  formatSeasonLabel,
  formatTimeOfDay,
  getItemBimSpec,
  getSpaceItem,
  isInstrumentId,
} from './data/virginiaTrees';
import { AmbientSoundEngine } from './engine/ambientAudio';
import { Canvas2DTreeEngine } from './engine/Canvas2DTreeEngine';
import {
  DEFAULT_BIM_LAYERS,
  DesignerTool,
  ExperienceMode,
  SanctuaryRenderer,
  SceneSimulationState,
} from './engine/rendererTypes';
import {
  DEFAULT_TONE_SETTINGS,
  DEFAULT_VISUAL_FILTER,
  PaintMaterialMode,
  VisualFilterSettings,
  VisualFilterStyle,
} from './engine/visualFilters';
import { WebGLTreeEngine } from './engine/WebGLTreeEngine';
import {
  computeBimSchedule,
  downloadBimScheduleCsv,
} from './utils/bimSchedule';
import {
  downloadPngFromDataUrl,
  downloadSanctuaryJson,
  downloadStandalonePostcardHtml,
  parseSanctuaryJson,
} from './utils/exportSanctuary';
import { downloadStandalonePaperSkyHtml } from './utils/exportPaperSkyHtml';

let uidSeq = 1;
function makeUid(prefix = 'item'): string {
  uidSeq += 1;
  return `${prefix}-${uidSeq}`;
}

function hydratePresetItems(presetId: string): PlacedSpaceItem[] {
  const preset = SPACE_PRESETS.find((p) => p.id === presetId) ?? SPACE_PRESETS[0];
  return preset.items.map((item) => ({
    ...item,
    uid: makeUid('item'),
  }));
}

function hydratePresetPaths(presetId: string): PathNode[] {
  const preset = SPACE_PRESETS.find((p) => p.id === presetId) ?? SPACE_PRESETS[0];
  return (preset.paths ?? []).map((node) => ({
    ...node,
    uid: makeUid('path'),
  }));
}

interface HistorySnapshot {
  placedItems: PlacedSpaceItem[];
  pathNodes: PathNode[];
}

function getSeasonalThemeVars(season: number): React.CSSProperties {
  const s = ((season % 4) + 4) % 4;
  if (s < 0.9 || s >= 3.7) {
    return {
      '--sylva-accent': '#f7b6cc',
      '--sylva-accent-ink': '#221319',
      '--sylva-accent-ring': 'rgba(247, 182, 204, 0.58)',
      '--sylva-accent-glow': 'rgba(247, 182, 204, 0.34)',
    } as React.CSSProperties;
  }
  if (s < 2.05) {
    return {
      '--sylva-accent': '#8ee6a8',
      '--sylva-accent-ink': '#0e1f14',
      '--sylva-accent-ring': 'rgba(142, 230, 168, 0.56)',
      '--sylva-accent-glow': 'rgba(142, 230, 168, 0.32)',
    } as React.CSSProperties;
  }
  if (s < 3.05) {
    return {
      '--sylva-accent': '#f7be6d',
      '--sylva-accent-ink': '#23160a',
      '--sylva-accent-ring': 'rgba(247, 190, 109, 0.60)',
      '--sylva-accent-glow': 'rgba(247, 190, 109, 0.34)',
    } as React.CSSProperties;
  }
  return {
    '--sylva-accent': '#9ed6f8',
    '--sylva-accent-ink': '#0f1c26',
    '--sylva-accent-ring': 'rgba(158, 214, 248, 0.56)',
    '--sylva-accent-glow': 'rgba(158, 214, 248, 0.32)',
  } as React.CSSProperties;
}

function getLiveSkyOrbTone(timeOfDay: number, backdrop: BackdropStyle): OrbTone {
  if (backdrop === 'blueprint') return ORB_TONES.violet;
  if (backdrop === 'white-circle') {
    return timeOfDay >= 6 && timeOfDay < 19 ? ORB_TONES.pearl : ORB_TONES.slate;
  }
  const h = ((timeOfDay % 24) + 24) % 24;
  if (h >= 5 && h < 7.5) return ORB_TONES.rose;
  if (h >= 7.5 && h < 16.2) return ORB_TONES.sky;
  if (h >= 16.2 && h < 19.2) return ORB_TONES.amber;
  return ORB_TONES.violet;
}

const DEFAULT_PRESET = SPACE_PRESETS[0];
const PAINT_CYCLE: PaintMaterialMode[] = ['pixel', 'oil-3d', 'living-canvas'];
const PAINT_LABELS: Record<PaintMaterialMode, string> = {
  pixel: 'Pixel',
  'oil-3d': '3D Oil',
  'living-canvas': 'Canvas',
};

const QUICK_GOUACHE_IDS: PlaceableId[] = [
  'cherry',
  'dogwood',
  'red-maple',
  'pond',
  'upright-piano',
  'concert-harp',
  'wind-chime-arch',
];

const SKY_MOOD_ORBS = [
  { label: 'Dawn', hour: 6.1, tone: 'rose' as const },
  { label: 'Noon', hour: 12.2, tone: 'sky' as const },
  { label: 'Golden', hour: 17.5, tone: 'amber' as const },
  { label: 'Dusk', hour: 19.6, tone: 'crimson' as const },
  { label: 'Night', hour: 22.6, tone: 'violet' as const },
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SanctuaryRenderer | null>(null);
  const soundRef = useRef<AmbientSoundEngine | null>(null);

  const [sim, setSim] = useState<SceneSimulationState>(() => {
    const defaultBackdrop = DEFAULT_PRESET.defaultBackdrop ?? 'blue-ridge';
    return {
      placedItems: hydratePresetItems(DEFAULT_PRESET.id),
      pathNodes: hydratePresetPaths(DEFAULT_PRESET.id),
      activeBrushId: 'cherry',
      activePathMaterial: 'flagstone',
      pathBrushRadius: 0.26,
      activeRotation: 0,
      snapGridFt: 0,
      showGrid: false,
      tool: 'orbit',
      povMode: false,
      planMode: false,
      backdropStyle: defaultBackdrop,
      bimLayers: DEFAULT_BIM_LAYERS,
      entrance: DEFAULT_PRESET.entrance,
      season: DEFAULT_PRESET.defaultSeason,
      timeOfDay: DEFAULT_PRESET.defaultTime,
      wind: DEFAULT_PRESET.defaultWind,
      weather: DEFAULT_PRESET.defaultWeather,
      weatherIntensity: 0.55,
      studioBackdrop: defaultBackdrop === 'white-circle',
      autoOrbit: false,
      fireflies: false,
      reducedMotion:
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      paused: false,
      stackRelief: 1.0,
      paintMode: 'pixel',
      impasto: 0.72,
      visualFilter: DEFAULT_VISUAL_FILTER,
    };
  });

  const [realm, setRealm] = useState<'paper-sky' | 'sanctuary'>('paper-sky');
  const [mode, setMode] = useState<ExperienceMode>('design');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuContainer, setMenuContainer] = useState<SpatialContainerId | null>(null);
  const [skyFanOpen, setSkyFanOpen] = useState(false);
  const [bimOpen, setBimOpen] = useState(false);
  const [pixelTypography, setPixelTypography] = useState(false);
  const [paperSkyStyle, setPaperSkyStyle] = useState<PaperSkyVisualStyle>('pixel');
  const [physicsProfile, setPhysicsProfile] = useState<PhysicsProfileId>('glide');
  const [cardChoreography, setCardChoreography] = useState<CardChoreographySettings>({
    ...DEFAULT_CARD_CHOREOGRAPHY,
  });
  const [skyCardsVisible, setSkyCardsVisible] = useState(true);
  const [dropSignal, setDropSignal] = useState(0);
  const [activeDropZone, setActiveDropZone] = useState<PaperSkyDropZone>({
    presetId: DEFAULT_PRESET.id,
    presetName: DEFAULT_PRESET.name,
    compass: 'Center',
    accentHex: '#8ee6a8',
  });

  const callEngineRef = useRef<CallRoomEngine | null>(null);
  if (!callEngineRef.current) {
    callEngineRef.current = new CallRoomEngine(sharedHorizonAudioHub);
  }
  const [callState, setCallState] = useState<CallRoomSnapshot>(() =>
    callEngineRef.current!.getSnapshot(),
  );

  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(DEFAULT_PRESET.id);
  const [plantScale, setPlantScale] = useState(1.0);
  const [canopyGrowth, setCanopyGrowth] = useState(1.0);
  const [autoCycleTime, setAutoCycleTime] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [rendererMode, setRendererMode] = useState<'webgl' | 'canvas2d'>('webgl');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [selectedInstrumentUid, setSelectedInstrumentUid] = useState<string | null>(null);
  const lastCustomBackdropVerRef = useRef<number>(sharedCustomBackdropHub.getVersion());

  const realmRef = useRef(realm);
  realmRef.current = realm;
  const simRef = useRef(sim);
  simRef.current = sim;
  const plantScaleRef = useRef(plantScale);
  plantScaleRef.current = plantScale;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const playSfx = useCallback((kind: 'tick' | 'pop' | 'open' | 'back' | 'whoosh') => {
    soundRef.current?.playUiSfx(kind);
  }, []);

  const flashNotice = useCallback((msg: string) => {
    setToastNotice(msg);
    window.setTimeout(() => {
      setToastNotice((cur) => (cur === msg ? null : cur));
    }, 2600);
  }, []);

  const handlePatch = useCallback((patch: Partial<SceneSimulationState>) => {
    setSim((prev) => ({ ...prev, ...patch }));
  }, []);

  const pushHistory = useCallback((snapshot: HistorySnapshot) => {
    setHistory((prev) => [...prev.slice(-24), snapshot]);
  }, []);

  const handleGroundAction = useCallback(
    (x: number, z: number, tool: DesignerTool) => {
      const current = simRef.current;
      if (tool === 'orbit') {
        // Click placed 3D instruments to immediately play & open the compact performance console
        if (current.bimLayers.instruments.visible) {
          let hit: PlacedSpaceItem | null = null;
          let bestDist = 0.58;
          for (const item of current.placedItems) {
            if (!isInstrumentId(item.itemId)) continue;
            const d = Math.hypot(item.x - x, item.z - z);
            if (d < bestDist) {
              bestDist = d;
              hit = item;
            }
          }
          if (hit) {
            setSelectedInstrumentUid(hit.uid);
            sharedInstrumentAudio.triggerInstrumentNote(hit.uid);
            return;
          }
        }
        setSelectedInstrumentUid(null);
        return;
      }

      if (tool === 'plant') {
        const spec = getItemBimSpec(current.activeBrushId);
        const layerToggle = current.bimLayers[spec.layer];
        if (layerToggle.locked) {
          flashNotice('Layer is locked in BIM');
          return;
        }
        pushHistory({
          placedItems: current.placedItems,
          pathNodes: current.pathNodes,
        });
        setActivePresetId(null);
        const nextItem: PlacedSpaceItem = {
          uid: makeUid('item'),
          itemId: current.activeBrushId,
          x,
          z,
          scale: plantScaleRef.current,
          rotation: current.activeRotation,
          seed: Math.floor(Math.random() * 90000) + 100,
        };
        setSim((prev) => ({
          ...prev,
          placedItems: [...prev.placedItems, nextItem],
        }));
        if (isInstrumentId(current.activeBrushId)) {
          setSelectedInstrumentUid(nextItem.uid);
          sharedInstrumentAudio.triggerPlacementPreview(
            current.activeBrushId,
            x,
            z,
            plantScaleRef.current,
          );
          sharedInstrumentAudio.setEnabled(true);
        } else {
          playSfx('pop');
        }
      } else if (tool === 'remove') {
        let bestIdx = -1;
        let bestDist = 0.62;
        for (let i = 0; i < current.placedItems.length; i++) {
          const item = current.placedItems[i];
          const spec = getItemBimSpec(item.itemId);
          if (current.bimLayers[spec.layer].locked) continue;
          const d = Math.hypot(item.x - x, item.z - z);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }
        if (bestIdx >= 0) {
          const removedUid = current.placedItems[bestIdx].uid;
          pushHistory({
            placedItems: current.placedItems,
            pathNodes: current.pathNodes,
          });
          setActivePresetId(null);
          setSelectedInstrumentUid((cur) => (cur === removedUid ? null : cur));
          setSim((prev) => ({
            ...prev,
            placedItems: prev.placedItems.filter((_, idx) => idx !== bestIdx),
          }));
          playSfx('back');
          return;
        }
        if (!current.bimLayers['paths-lighting'].locked) {
          let bestPathIdx = -1;
          let bestPathDist = 0.45;
          for (let i = 0; i < current.pathNodes.length; i++) {
            const node = current.pathNodes[i];
            const d = Math.hypot(node.x - x, node.z - z);
            if (d < bestPathDist) {
              bestPathDist = d;
              bestPathIdx = i;
            }
          }
          if (bestPathIdx >= 0) {
            pushHistory({
              placedItems: current.placedItems,
              pathNodes: current.pathNodes,
            });
            setActivePresetId(null);
            setSim((prev) => ({
              ...prev,
              pathNodes: prev.pathNodes.filter((_, idx) => idx !== bestPathIdx),
            }));
            playSfx('back');
          }
        }
      }
    },
    [flashNotice, playSfx, pushHistory],
  );

  const handlePathStrokeStart = useCallback(() => {
    const current = simRef.current;
    if (current.bimLayers['paths-lighting'].locked) {
      flashNotice('Paths layer is locked in BIM');
      return;
    }
    pushHistory({
      placedItems: current.placedItems,
      pathNodes: current.pathNodes,
    });
    setActivePresetId(null);
  }, [flashNotice, pushHistory]);

  const handlePathStamp = useCallback((x: number, z: number) => {
    const current = simRef.current;
    if (current.bimLayers['paths-lighting'].locked) return;
    const node: PathNode = {
      uid: makeUid('path'),
      material: current.activePathMaterial,
      x,
      z,
      radius: current.pathBrushRadius,
      seed: Math.floor(Math.random() * 90000) + 100,
    };
    setSim((prev) => ({
      ...prev,
      pathNodes: [...prev.pathNodes, node],
    }));
  }, []);

  // Initialize WebGL2 engine with clean fresh-canvas fallback to Canvas 2D
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const callbacks = {
      onCanopyChange: (growth: number) => setCanopyGrowth(growth),
      onGroundAction: handleGroundAction,
      onPathStrokeStart: handlePathStrokeStart,
      onPathStamp: handlePathStamp,
      onContextLost: () => {
        setRendererMode('canvas2d');
      },
    };

    if (rendererMode === 'webgl') {
      try {
        const glEngine = new WebGLTreeEngine(canvas, simRef.current, callbacks);
        engineRef.current = glEngine;
        setRenderError(null);
        return () => {
          glEngine.dispose();
          engineRef.current = null;
        };
      } catch (glErr) {
        console.warn('WebGL2 renderer unavailable, switching to Canvas 2D fallback:', glErr);
        setRendererMode('canvas2d');
        return;
      }
    }

    try {
      const c2dEngine = new Canvas2DTreeEngine(canvas, simRef.current, callbacks);
      engineRef.current = c2dEngine;
      setRenderError(null);
      return () => {
        c2dEngine.dispose();
        engineRef.current = null;
      };
    } catch (err2) {
      setRenderError(
        err2 instanceof Error ? err2.message : 'Unable to initialize graphics context.',
      );
    }
  }, [handleGroundAction, handlePathStamp, handlePathStrokeStart, rendererMode]);

  // Sync state to engine, ambient audio, and 3D spatial instrument ensemble
  useEffect(() => {
    engineRef.current?.updateState(sim);
    soundRef.current?.update(sim.wind, sim.weather, sim.weatherIntensity);
    sharedInstrumentAudio.syncPlacedItems(sim.placedItems, sim.bimLayers.instruments.visible);
    sharedInstrumentAudio.setWindStrength(sim.wind);
    if (soundEnabled) {
      sharedHorizonAudioHub.setAmbientActive(true, sim.wind);
    }
  }, [sim, soundEnabled]);

  // Cloud-muffled drift filter when soaring above in Paper Sky vs full clarity on ground
  useEffect(() => {
    sharedInstrumentAudio.setRealmMode(realm === 'paper-sky' ? 'sky' : 'ground');
  }, [realm]);

  // If user uploads a custom backdrop while on white-circle studio backdrop, switch to sky dome so it renders in Virginia Sylva too
  useEffect(() => {
    return sharedCustomBackdropHub.subscribe(() => {
      const snap = sharedCustomBackdropHub.getSnapshot();
      if (snap.active && snap.version !== lastCustomBackdropVerRef.current) {
        lastCustomBackdropVerRef.current = snap.version;
        if (simRef.current.backdropStyle === 'white-circle') {
          setSim((prev) => ({
            ...prev,
            backdropStyle: 'blue-ridge',
            studioBackdrop: false,
          }));
        }
        if (snap.fileName) {
          flashNotice(`Backdrop: ${snap.fileName}`);
        }
      }
    });
  }, [flashNotice]);

  // Subscribe to CallRoomEngine (stays 100% dormant in Local Mode until room joined)
  useEffect(() => {
    const engine = callEngineRef.current;
    if (!engine) return;
    return engine.subscribe((snap) => setCallState(snap));
  }, []);

  // Optional Sun Drift daylight cycle
  useEffect(() => {
    if (!autoCycleTime || sim.reducedMotion || sim.paused) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setSim((prev) => ({
        ...prev,
        timeOfDay: (prev.timeOfDay + dt * 0.42) % 24,
      }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoCycleTime, sim.paused, sim.reducedMotion]);

  // Dispose audio & call engine on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.dispose();
      callEngineRef.current?.dispose();
    };
  }, []);

  const handleSelectMode = useCallback(
    (nextMode: ExperienceMode) => {
      setMode(nextMode);
      if (nextMode === 'pov') {
        setBimOpen(false);
        setSkyFanOpen(false);
        setSim((prev) => ({
          ...prev,
          povMode: true,
          planMode: false,
          autoOrbit: false,
          tool: 'orbit',
        }));
      } else if (nextMode === 'plan') {
        setSim((prev) => ({
          ...prev,
          povMode: false,
          planMode: true,
          autoOrbit: false,
          showGrid: true,
        }));
      } else if (nextMode === 'drift') {
        setSim((prev) => ({
          ...prev,
          povMode: false,
          planMode: false,
          autoOrbit: true,
          tool: 'orbit',
        }));
      } else {
        setSim((prev) => ({
          ...prev,
          povMode: false,
          planMode: false,
          autoOrbit: false,
        }));
      }
    },
    [],
  );

  // Global keyboard shortcuts (Spatial Menu works in both Paper Sky & Virginia Sylva; PTT/Mic in live room)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Live Call Room Push-To-Talk (T) & Mic Toggle (M when in live room and menu closed)
      if (callState.mode === 'room' && e.code === 'KeyT' && !e.repeat) {
        void callEngineRef.current?.setPushToTalk(true);
        return;
      }

      if (e.code === 'KeyM') {
        if (callState.mode === 'room' && !menuOpen) {
          void callEngineRef.current?.toggleMic();
        } else {
          setMenuContainer(null);
          setMenuOpen((v) => !v);
        }
        return;
      }

      if (e.code === 'KeyH' && realmRef.current === 'paper-sky' && !menuOpen) {
        setSkyCardsVisible((v) => !v);
        return;
      }

      if (e.code === 'Escape') {
        if (menuOpen) {
          // Handled inside PerspectiveMenu (steps back to overview first)
          return;
        }
        if (bimOpen) {
          setBimOpen(false);
        } else if (skyFanOpen) {
          setSkyFanOpen(false);
        } else if (realmRef.current === 'sanctuary' && simRef.current.povMode) {
          handleSelectMode('design');
        } else {
          setMenuContainer(null);
          setMenuOpen(true);
        }
        return;
      }

      if (realmRef.current === 'paper-sky' || menuOpen) return;

      if (e.code === 'KeyR' && !simRef.current.povMode) {
        setSim((prev) => ({
          ...prev,
          activeRotation: (prev.activeRotation + Math.PI / 4) % (Math.PI * 2),
        }));
      } else if (e.code === 'KeyG' && !simRef.current.povMode) {
        setSim((prev) => ({ ...prev, showGrid: !prev.showGrid }));
      } else if (e.code === 'KeyP' && !simRef.current.povMode) {
        handleSelectMode(modeRef.current === 'plan' ? 'design' : 'plan');
      } else if (e.code === 'Space' && !simRef.current.povMode) {
        e.preventDefault();
        setSim((prev) => ({ ...prev, paused: !prev.paused }));
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (callState.mode === 'room' && e.code === 'KeyT') {
        void callEngineRef.current?.setPushToTalk(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [bimOpen, callState.mode, handleSelectMode, menuOpen, skyFanOpen]);

  const handleToggleSound = useCallback(() => {
    if (!soundRef.current) {
      soundRef.current = new AmbientSoundEngine();
    }
    const active = soundRef.current.toggle();
    setSoundEnabled(active);
    sharedHorizonAudioHub.setAmbientActive(active, simRef.current.wind);
    const hasInstruments = simRef.current.placedItems.some((item) =>
      isInstrumentId(item.itemId),
    );
    if (active) {
      soundRef.current.update(
        simRef.current.wind,
        simRef.current.weather,
        simRef.current.weatherIntensity,
      );
      soundRef.current.playUiSfx('open');
      if (hasInstruments) {
        sharedInstrumentAudio.setEnabled(true);
      }
    } else {
      sharedInstrumentAudio.setEnabled(false);
    }
  }, []);

  const handleSelectBrush = useCallback((id: PlaceableId) => {
    setSim((prev) => ({ ...prev, activeBrushId: id, tool: 'plant' }));
  }, []);

  const handleSelectPathMaterial = useCallback((mat: PathMaterialId) => {
    setSim((prev) => ({ ...prev, activePathMaterial: mat, tool: 'path' }));
  }, []);

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setSim((s) => ({
        ...s,
        placedItems: last.placedItems,
        pathNodes: last.pathNodes,
      }));
      playSfx('back');
      return prev.slice(0, -1);
    });
  }, [playSfx]);

  const handleSelectPreset = useCallback(
    (presetId: string) => {
      const preset = SPACE_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      pushHistory({
        placedItems: simRef.current.placedItems,
        pathNodes: simRef.current.pathNodes,
      });
      const nextBackdrop = preset.defaultBackdrop ?? 'blue-ridge';
      setActivePresetId(preset.id);
      setSelectedInstrumentUid(null);
      const nextItems = hydratePresetItems(preset.id);
      setSim((prev) => ({
        ...prev,
        placedItems: nextItems,
        pathNodes: hydratePresetPaths(preset.id),
        entrance: preset.entrance,
        season: preset.defaultSeason,
        timeOfDay: preset.defaultTime,
        wind: preset.defaultWind,
        weather: preset.defaultWeather,
        backdropStyle: nextBackdrop,
        studioBackdrop: nextBackdrop === 'white-circle',
      }));
      if (nextItems.some((it) => isInstrumentId(it.itemId))) {
        sharedInstrumentAudio.setEnabled(true);
      }
      engineRef.current?.resetEntrance();
      flashNotice(`Loaded ${preset.name}`);
    },
    [flashNotice, pushHistory],
  );

  const handleRotatePlacedItem = useCallback((uid: string) => {
    setSim((prev) => ({
      ...prev,
      placedItems: prev.placedItems.map((it) =>
        it.uid === uid
          ? { ...it, rotation: ((it.rotation ?? 0) + Math.PI / 4) % (Math.PI * 2) }
          : it,
      ),
    }));
  }, []);

  const handleAdjustPlacedScale = useCallback((uid: string, delta: number) => {
    setSim((prev) => ({
      ...prev,
      placedItems: prev.placedItems.map((it) =>
        it.uid === uid
          ? { ...it, scale: Math.max(0.55, Math.min(1.8, (it.scale || 1) + delta)) }
          : it,
      ),
    }));
  }, []);

  const handleRemovePlacedItem = useCallback(
    (uid: string) => {
      pushHistory({
        placedItems: simRef.current.placedItems,
        pathNodes: simRef.current.pathNodes,
      });
      setActivePresetId(null);
      setSelectedInstrumentUid((cur) => (cur === uid ? null : cur));
      setSim((prev) => ({
        ...prev,
        placedItems: prev.placedItems.filter((it) => it.uid !== uid),
      }));
    },
    [pushHistory],
  );

  const handleToggleBimVisible = useCallback(
    (layer: BimLayerId) => {
      playSfx('tick');
      setSim((prev) => ({
        ...prev,
        bimLayers: {
          ...prev.bimLayers,
          [layer]: {
            ...prev.bimLayers[layer],
            visible: !prev.bimLayers[layer].visible,
          },
        },
      }));
    },
    [playSfx],
  );

  const handleToggleBimLock = useCallback(
    (layer: BimLayerId) => {
      playSfx('tick');
      setSim((prev) => ({
        ...prev,
        bimLayers: {
          ...prev.bimLayers,
          [layer]: {
            ...prev.bimLayers[layer],
            locked: !prev.bimLayers[layer].locked,
          },
        },
      }));
    },
    [playSfx],
  );

  const handleClearPaths = useCallback(() => {
    pushHistory({
      placedItems: simRef.current.placedItems,
      pathNodes: simRef.current.pathNodes,
    });
    setSim((prev) => ({ ...prev, pathNodes: [] }));
    playSfx('back');
    flashNotice('Cleared painted pathways');
  }, [flashNotice, playSfx, pushHistory]);

  const handleClearSite = useCallback(() => {
    pushHistory({
      placedItems: simRef.current.placedItems,
      pathNodes: simRef.current.pathNodes,
    });
    setActivePresetId(null);
    setSim((prev) => ({ ...prev, placedItems: [], pathNodes: [] }));
    playSfx('back');
    flashNotice('Cleared sanctuary site');
  }, [flashNotice, playSfx, pushHistory]);

  const schedule = useMemo(
    () => computeBimSchedule(sim.placedItems, sim.pathNodes),
    [sim.placedItems, sim.pathNodes],
  );

  const handleDownloadPng = useCallback(() => {
    const dataUrl = engineRef.current?.captureDataUrl();
    if (!dataUrl) {
      flashNotice('Unable to capture canvas');
      return;
    }
    downloadPngFromDataUrl(dataUrl, simRef.current.season);
    flashNotice('Saved PNG postcard');
  }, [flashNotice]);

  const handleDownloadHtml = useCallback(() => {
    const dataUrl = engineRef.current?.captureDataUrl();
    if (!dataUrl) {
      flashNotice('Unable to capture canvas');
      return;
    }
    downloadStandalonePostcardHtml(dataUrl, simRef.current);
    flashNotice('Saved offline HTML plate');
  }, [flashNotice]);

  const handleDownloadPaperSkyHtml = useCallback(() => {
    downloadStandalonePaperSkyHtml();
    flashNotice('Saved Paper Sky offline HTML');
  }, [flashNotice]);

  const handleDescentStart = useCallback(
    (zone: PaperSkyDropZone) => {
      setMenuOpen(false);
      setBimOpen(false);
      setSkyFanOpen(false);
      setMode('design');

      // Paper Sky acts as the spatial drop-zone selector: load the sanctuary beneath your drop zone!
      const targetPreset = SPACE_PRESETS.find((p) => p.id === zone.presetId);
      if (targetPreset && activePresetId !== targetPreset.id && history.length === 0) {
        const nextBackdrop = targetPreset.defaultBackdrop ?? 'blue-ridge';
        setActivePresetId(targetPreset.id);
        setSim((prev) => ({
          ...prev,
          placedItems: hydratePresetItems(targetPreset.id),
          pathNodes: hydratePresetPaths(targetPreset.id),
          entrance: targetPreset.entrance,
          season: targetPreset.defaultSeason,
          timeOfDay: targetPreset.defaultTime,
          wind: targetPreset.defaultWind,
          weather: targetPreset.defaultWeather,
          backdropStyle: nextBackdrop,
          studioBackdrop: nextBackdrop === 'white-circle',
          povMode: false,
          planMode: false,
          autoOrbit: false,
          paused: false,
        }));
      } else {
        setSim((prev) => ({
          ...prev,
          povMode: false,
          planMode: false,
          autoOrbit: false,
          paused: false,
        }));
      }

      engineRef.current?.triggerSkyDescentArrival();
    },
    [activePresetId, history.length],
  );

  const handleDescentComplete = useCallback(
    (zone: PaperSkyDropZone) => {
      setRealm('sanctuary');
      flashNotice(`Landed in ${zone.presetName}`);
    },
    [flashNotice],
  );

  const handleDropIntoSanctuary = useCallback(
    (presetId?: string) => {
      if (presetId && presetId !== activePresetId) {
        handleSelectPreset(presetId);
      }
      if (realmRef.current === 'paper-sky') {
        setDropSignal((s) => s + 1);
      } else {
        setRealm('sanctuary');
        engineRef.current?.triggerSkyDescentArrival();
      }
    },
    [activePresetId, handleSelectPreset],
  );

  const handleEnterPaperSky = useCallback(() => {
    playSfx('whoosh');
    setMenuOpen(false);
    setBimOpen(false);
    setSkyFanOpen(false);
    if (simRef.current.povMode) {
      handleSelectMode('design');
    }
    setRealm('paper-sky');
  }, [handleSelectMode, playSfx]);

  const handleDownloadCsv = useCallback(() => {
    downloadBimScheduleCsv(schedule, simRef.current.season);
    flashNotice('Saved BIM schedule CSV');
  }, [flashNotice, schedule]);

  const handleDownloadJson = useCallback(() => {
    downloadSanctuaryJson(simRef.current);
    flashNotice('Saved sanctuary JSON');
  }, [flashNotice]);

  const handleImportJson = useCallback(
    (rawText: string) => {
      const parsed = parseSanctuaryJson(rawText);
      if (!parsed) {
        flashNotice('Invalid sanctuary JSON file');
        return;
      }
      pushHistory({
        placedItems: simRef.current.placedItems,
        pathNodes: simRef.current.pathNodes,
      });
      setActivePresetId(null);
      setSim((prev) => ({ ...prev, ...parsed }));
      playSfx('open');
      flashNotice('Restored sanctuary project');
    },
    [flashNotice, playSfx, pushHistory],
  );

  const handleCyclePaintMode = useCallback(() => {
    const curIdx = PAINT_CYCLE.indexOf(simRef.current.paintMode);
    const nextMode = PAINT_CYCLE[(curIdx + 1) % PAINT_CYCLE.length];
    playSfx('pop');
    setSim((prev) => ({ ...prev, paintMode: nextMode }));
    flashNotice(`Material: ${PAINT_LABELS[nextMode]}`);
  }, [flashNotice, playSfx]);

  const handleSelectPaperSkyStyle = useCallback(
    (style: PaperSkyVisualStyle) => {
      setPaperSkyStyle(style);
      const customActive = sharedCustomBackdropHub.getSnapshot().active;
      const meta = getPaperSkyStyleMeta(style);
      // Harmonize Virginia Sylva below so diving through clouds lands in the matching visual engine,
      // while keeping the user's active 2D screen filter (RAW / OIL / ASCII / DOTS / GRAIN / SCAN) independent.
      setSim((prev) => {
        if (style === 'pixel') {
          return {
            ...prev,
            paintMode: 'pixel',
            backdropStyle: 'blue-ridge',
            studioBackdrop: false,
            visualFilter: {
              ...prev.visualFilter,
              engineStyle: 'pixel',
            },
          };
        }
        if (style === 'halftone' || style === 'ink') {
          return {
            ...prev,
            paintMode: 'pixel',
            backdropStyle: customActive ? 'blue-ridge' : 'white-circle',
            studioBackdrop: !customActive,
            visualFilter: {
              ...prev.visualFilter,
              engineStyle: style,
            },
          };
        }
        if (style === 'oil') {
          return {
            ...prev,
            paintMode: 'oil-3d',
            backdropStyle: 'blue-ridge',
            studioBackdrop: false,
            visualFilter: {
              ...prev.visualFilter,
              engineStyle: 'oil',
            },
          };
        }
        if (style === 'blueprint') {
          return {
            ...prev,
            paintMode: 'pixel',
            backdropStyle: customActive ? 'blue-ridge' : 'blueprint',
            studioBackdrop: false,
            visualFilter: {
              ...prev.visualFilter,
              engineStyle: 'blueprint',
            },
          };
        }
        // Modes 06..13: Mondrian, Game Boy DMG, 1-Bit Mac, CRT 16-Bit, PICO-8, Risograph, Ukiyo-e, Thermal
        return {
          ...prev,
          paintMode: 'pixel',
          backdropStyle: 'blue-ridge',
          studioBackdrop: false,
          visualFilter: {
            ...prev.visualFilter,
            engineStyle: meta.id,
          },
        };
      });
    },
    [],
  );

  const handleSelectPhysicsProfile = useCallback(
    (profileId: PhysicsProfileId) => {
      setPhysicsProfile(profileId);
      const p = getPhysicsProfile(profileId);
      flashNotice(`Physics: ${p.label}`);
    },
    [flashNotice],
  );

  const handleSelectVisualFilter = useCallback((style: VisualFilterStyle) => {
    setSim((prev) => ({
      ...prev,
      visualFilter: { ...prev.visualFilter, style },
    }));
  }, []);

  const handlePatchVisualFilter = useCallback((patch: Partial<VisualFilterSettings>) => {
    setSim((prev) => ({
      ...prev,
      visualFilter: { ...prev.visualFilter, ...patch },
    }));
  }, []);

  const handleResetVisualTone = useCallback(() => {
    setSim((prev) => ({
      ...prev,
      visualFilter: { ...prev.visualFilter, ...DEFAULT_TONE_SETTINGS },
    }));
    playSfx('tick');
  }, [playSfx]);

  const handlePatchCardChoreography = useCallback(
    (patch: Partial<CardChoreographySettings>) => {
      setCardChoreography((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const openSpatialMenu = useCallback(
    (container: SpatialContainerId | null) => {
      playSfx('open');
      setSkyFanOpen(false);
      setBimOpen(false);
      setMenuContainer(container);
      setMenuOpen(true);
    },
    [playSfx],
  );

  const seasonalVars = useMemo(() => getSeasonalThemeVars(sim.season), [sim.season]);
  const lightPaperBackdrop =
    sim.backdropStyle === 'white-circle' && sim.timeOfDay >= 6 && sim.timeOfDay < 19;
  const liveSkyTone = useMemo(
    () => getLiveSkyOrbTone(sim.timeOfDay, sim.backdropStyle),
    [sim.backdropStyle, sim.timeOfDay],
  );
  const seasonLabel = formatSeasonLabel(sim.season);
  const timeLabel = formatTimeOfDay(sim.timeOfDay);
  const activeSpec = getItemBimSpec(sim.activeBrushId);
  const activeItemMeta = getSpaceItem(sim.activeBrushId);
  const rotDeg = Math.round((((sim.activeRotation * 180) / Math.PI) % 360 + 360) % 360);
  const selectedInstrument = useMemo(
    () =>
      selectedInstrumentUid
        ? sim.placedItems.find(
            (it) => it.uid === selectedInstrumentUid && isInstrumentId(it.itemId),
          ) ?? null
        : null,
    [selectedInstrumentUid, sim.placedItems],
  );

  return (
    <div
      style={seasonalVars}
      className={`relative w-screen h-screen overflow-hidden select-none bg-[#101311] ${
        pixelTypography ? 'sylva-pixel-ui' : ''
      }`}
    >
      {/* Full-Viewport Living 3D Botanical Canvas (keyed so Canvas 2D fallback gets a fresh context) */}
      <canvas
        key={rendererMode}
        ref={canvasRef}
        className={`block w-full h-full touch-none ${
          sim.povMode
            ? 'cursor-grab active:cursor-grabbing'
            : sim.tool === 'plant' || sim.tool === 'path'
              ? 'cursor-crosshair'
              : sim.tool === 'remove'
                ? 'cursor-not-allowed'
                : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* ── PAPER SKY OPENING REALM & SPATIAL DROP-ZONE SELECTOR ────────────── */}
      <PaperSkyStage
        active={realm === 'paper-sky'}
        menuOpen={menuOpen}
        soundEnabled={soundEnabled}
        dropSignal={dropSignal}
        paperSkyStyle={paperSkyStyle}
        physicsProfile={physicsProfile}
        visualFilter={sim.visualFilter}
        cardChoreography={cardChoreography}
        pixelTypography={pixelTypography}
        callState={callState}
        skyCardsVisible={skyCardsVisible}
        onToggleSkyCards={() => setSkyCardsVisible((v) => !v)}
        onSelectPaperSkyStyle={handleSelectPaperSkyStyle}
        onSelectPhysicsProfile={handleSelectPhysicsProfile}
        onSelectVisualFilter={handleSelectVisualFilter}
        onPatchVisualFilter={handlePatchVisualFilter}
        onResetVisualTone={handleResetVisualTone}
        onPatchCardChoreography={handlePatchCardChoreography}
        onTogglePixelTypography={() => setPixelTypography((v) => !v)}
        onToggleSound={handleToggleSound}
        onOpenMenu={(container) => openSpatialMenu(container ?? null)}
        onDropZoneChange={setActiveDropZone}
        onDescentStart={handleDescentStart}
        onDescentComplete={handleDescentComplete}
        onSelectDropPreset={(presetId) => handleSelectPreset(presetId)}
        onDownloadPng={handleDownloadPng}
        onDownloadOfflineHtml={handleDownloadPaperSkyHtml}
        playSfx={playSfx}
      />

      {realm === 'sanctuary' && renderError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d110e]/92 p-6 text-center">
          <div className="max-w-md space-y-2">
            <h1 className="font-display text-2xl text-white">Virginia Sylva</h1>
            <p className="text-sm text-white/75">{renderError}</p>
          </div>
        </div>
      )}

      {/* ── UNIFIED RAZOR-SHARP HAIRLINE TOP RAIL IN VIRGINIA SYLVA ────────── */}
      {realm === 'sanctuary' && (
        <header className="fixed top-3 left-3.5 right-3.5 z-20 flex items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              title="Open 7-Panel Perspective Menu (M or Esc)"
              onClick={() => {
                if (menuOpen) {
                  playSfx('back');
                  setMenuOpen(false);
                } else {
                  openSpatialMenu(null);
                }
              }}
              className={`px-2.5 py-1 border font-mono text-[10px] font-bold tracking-[0.12em] uppercase cursor-pointer backdrop-blur-sm transition-colors ${
                lightPaperBackdrop
                  ? 'bg-[#f6f3eb]/88 text-[#12161c] border-[#12161c]/80 hover:bg-[#12161c] hover:text-[#f6f3eb]'
                  : 'bg-[#090c10]/80 text-white border-white/40 hover:bg-white hover:text-[#090c10]'
              }`}
            >
              &gt;&gt; MENU
            </button>

            <button
              type="button"
              title="Soar back up into Paper Sky"
              onClick={handleEnterPaperSky}
              className={`px-2.5 py-1 border font-mono text-[10px] font-bold tracking-[0.1em] uppercase flex items-center gap-1.5 cursor-pointer backdrop-blur-sm transition-colors ${
                lightPaperBackdrop
                  ? 'bg-[#7bb5dd]/90 text-[#0c1420] border-[#12161c]/80 hover:bg-[#12161c] hover:text-white'
                  : 'bg-[#7bb5dd]/88 text-[#081018] border-white/50 hover:bg-white hover:text-[#081018]'
              }`}
            >
              <Feather className="w-3 h-3" />
              <span>PAPER SKY</span>
            </button>

            <div
              className={`hidden md:flex items-center gap-2 px-2.5 py-1 border font-mono text-[9.5px] tracking-[0.08em] uppercase tabular-nums backdrop-blur-sm ${
                lightPaperBackdrop
                  ? 'bg-[#f6f3eb]/78 text-[#12161c] border-[#12161c]/35'
                  : 'bg-[#090c10]/68 text-white/85 border-white/25'
              }`}
            >
              <span className="font-bold">VIRGINIA SYLVA</span>
              <span className="opacity-40">/</span>
              <span>{seasonLabel.seasonName}</span>
              <span className="opacity-40">/</span>
              <span>{timeLabel.clock}</span>
            </div>

            <button
              type="button"
              title="Play / Pause living wind & time (Space)"
              onClick={() => {
                playSfx('tick');
                setSim((prev) => ({ ...prev, paused: !prev.paused }));
              }}
              className={`w-6.5 h-6.5 flex items-center justify-center border cursor-pointer backdrop-blur-sm transition-colors ${
                lightPaperBackdrop
                  ? 'bg-[#f6f3eb]/84 text-[#12161c] border-[#12161c]/55 hover:bg-[#12161c] hover:text-white'
                  : 'bg-[#090c10]/76 text-white border-white/30 hover:bg-white hover:text-[#090c10]'
              }`}
            >
              {sim.paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </button>

            <button
              type="button"
              title={`Switch 3D Sprite Material (${PAINT_LABELS[sim.paintMode]})`}
              onClick={handleCyclePaintMode}
              className={`px-2 py-1 border font-mono text-[9.5px] font-bold uppercase cursor-pointer backdrop-blur-sm transition-colors ${
                lightPaperBackdrop
                  ? 'bg-[#f6f3eb]/84 text-[#12161c] border-[#12161c]/55 hover:bg-[#12161c] hover:text-white'
                  : 'bg-[#090c10]/76 text-white border-white/30 hover:bg-white hover:text-[#090c10]'
              }`}
            >
              {PAINT_LABELS[sim.paintMode]}
            </button>

            <button
              type="button"
              title="Toggle Blue Ridge wind & chimes"
              onClick={handleToggleSound}
              className={`w-6.5 h-6.5 flex items-center justify-center border cursor-pointer backdrop-blur-sm transition-colors ${
                lightPaperBackdrop
                  ? 'bg-[#f6f3eb]/84 text-[#12161c] border-[#12161c]/55 hover:bg-[#12161c] hover:text-white'
                  : 'bg-[#090c10]/76 text-white border-white/30 hover:bg-white hover:text-[#090c10]'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3 opacity-70" />}
            </button>
          </div>

          {/* Right Sky Mood & Backdrop Strip */}
          <div className="pointer-events-auto flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1">
              {skyFanOpen &&
                SKY_MOOD_ORBS.map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => {
                      playSfx('tick');
                      setSim((prev) => ({
                        ...prev,
                        timeOfDay: m.hour,
                        fireflies: m.hour >= 19.2 || m.hour < 5.5,
                      }));
                    }}
                    className={`px-2 py-1 border font-mono text-[9px] font-bold uppercase cursor-pointer backdrop-blur-sm transition-colors ${
                      Math.abs(sim.timeOfDay - m.hour) < 1.5
                        ? 'bg-white text-[#090c10] border-white'
                        : lightPaperBackdrop
                          ? 'bg-[#f6f3eb]/84 text-[#12161c] border-[#12161c]/55 hover:bg-[#12161c] hover:text-white'
                          : 'bg-[#090c10]/80 text-white border-white/30 hover:border-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              <button
                type="button"
                title="Toggle Sky Mood & Backdrop strip"
                onClick={() => {
                  playSfx(skyFanOpen ? 'back' : 'open');
                  setSkyFanOpen((v) => !v);
                }}
                className={`px-2.5 py-1 border font-mono text-[10px] font-bold uppercase flex items-center gap-1.5 cursor-pointer backdrop-blur-sm transition-colors ${
                  skyFanOpen
                    ? 'bg-white text-[#090c10] border-white'
                    : lightPaperBackdrop
                      ? 'bg-[#f6f3eb]/86 text-[#12161c] border-[#12161c]/75 hover:bg-[#12161c] hover:text-white'
                      : 'bg-[#090c10]/80 text-white border-white/35 hover:bg-white hover:text-[#090c10]'
                }`}
              >
                <Mountain className="w-3 h-3" />
                <span>SKY</span>
              </button>
            </div>

            {skyFanOpen && (
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'blue-ridge', label: 'BLUE RIDGE' },
                    { id: 'white-circle', label: 'VELLUM' },
                    { id: 'blueprint', label: 'BLUEPRINT' },
                  ] as { id: BackdropStyle; label: string }[]
                ).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      playSfx('pop');
                      setSim((prev) => ({
                        ...prev,
                        backdropStyle: b.id,
                        studioBackdrop: b.id === 'white-circle',
                      }));
                    }}
                    className={`px-2 py-1 border font-mono text-[9px] font-bold uppercase cursor-pointer backdrop-blur-sm ${
                      sim.backdropStyle === b.id
                        ? 'bg-white text-[#090c10] border-white'
                        : 'bg-[#090c10]/82 text-white border-white/30 hover:border-white'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>
      )}

      {/* Transient Whisper Toast Notice (0px Sharp Hairline) */}
      {toastNotice && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="px-3 py-1 bg-[#090c10]/88 backdrop-blur-md border border-white/30 font-mono text-[10px] font-bold tracking-[0.08em] uppercase text-[#faf6ec]">
            {toastNotice}
          </div>
        </div>
      )}

      {/* ── BOTTOM TACTILE EXPERIENCE DOCK ─────────────────────────────────── */}
      {realm === 'sanctuary' && (!sim.povMode ? (
        <nav
          aria-label="Sanctuary Tools & Gouache Swatches"
          className="fixed bottom-4 sm:bottom-5 inset-x-0 z-20 px-4 sm:px-6 flex items-end justify-between gap-2 sm:gap-4 pointer-events-none"
        >
          {/* Left: Luminous Glass Tool Orbs */}
          <div className="pointer-events-auto shrink-0 flex items-end gap-2 sm:gap-2.5">
            <GlassOrbButton
              label="Orbit"
              tone="slate"
              size="sm"
              active={sim.tool === 'orbit'}
              lightBackdrop={lightPaperBackdrop}
              onClick={() => {
                playSfx('tick');
                setSim((prev) => ({ ...prev, tool: 'orbit' }));
              }}
            >
              <Hand className="w-4 h-4" />
            </GlassOrbButton>

            <GlassOrbButton
              label="Plant"
              tone="emerald"
              size="sm"
              active={sim.tool === 'plant'}
              lightBackdrop={lightPaperBackdrop}
              onClick={() => {
                playSfx('tick');
                setSim((prev) => ({ ...prev, tool: 'plant' }));
              }}
            >
              <Sprout className="w-4 h-4" />
            </GlassOrbButton>

            <GlassOrbButton
              label="Path"
              tone="amber"
              size="sm"
              active={sim.tool === 'path'}
              lightBackdrop={lightPaperBackdrop}
              onClick={() => {
                playSfx('tick');
                setSim((prev) => ({ ...prev, tool: 'path' }));
              }}
            >
              <Paintbrush className="w-4 h-4" />
            </GlassOrbButton>

            <GlassOrbButton
              label="Erase"
              tone="crimson"
              size="sm"
              active={sim.tool === 'remove'}
              lightBackdrop={lightPaperBackdrop}
              onClick={() => {
                playSfx('tick');
                setSim((prev) => ({ ...prev, tool: 'remove' }));
              }}
            >
              <Eraser className="w-4 h-4" />
            </GlassOrbButton>

            {sim.tool === 'plant' && activeSpec.rotatable && (
              <GlassOrbButton
                label={`${rotDeg}°`}
                tone="pearl"
                size="xs"
                lightBackdrop={lightPaperBackdrop}
                title={`Rotate ${activeItemMeta.shortName} (R)`}
                onClick={() => {
                  playSfx('tick');
                  setSim((prev) => ({
                    ...prev,
                    activeRotation: (prev.activeRotation + Math.PI / 4) % (Math.PI * 2),
                  }));
                }}
              >
                <RotateCw className="w-3.5 h-3.5 text-[#1c241e]" />
              </GlassOrbButton>
            )}

            {history.length > 0 && (
              <GlassOrbButton
                label="Undo"
                tone="slate"
                size="xs"
                lightBackdrop={lightPaperBackdrop}
                onClick={handleUndo}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </GlassOrbButton>
            )}
          </div>

          {/* Center: Floating Hand-Painted Gouache Swatches (No Container Bar!) */}
          <div className="flex-1 min-w-0 flex justify-center">
            <div className="pointer-events-auto flex items-end gap-2 sm:gap-2.5 overflow-x-auto max-w-full py-1 px-1 sylva-no-scrollbar">
              {sim.tool === 'path' ? (
                <>
                  {PATH_MATERIALS.map((mat, idx) => (
                    <GouacheSwatch
                      key={mat.id}
                      label={mat.label}
                      colorHex={mat.swatchHex}
                      shapeSeed={idx + 1}
                      active={sim.activePathMaterial === mat.id}
                      lightBackdrop={lightPaperBackdrop}
                      onClick={() => {
                        playSfx('pop');
                        handleSelectPathMaterial(mat.id);
                      }}
                    >
                      <Paintbrush className="w-4 h-4 text-[#18201b]" />
                    </GouacheSwatch>
                  ))}
                </>
              ) : (
                <>
                  {QUICK_GOUACHE_IDS.map((id, idx) => {
                    const item = getSpaceItem(id);
                    return (
                      <GouacheSwatch
                        key={id}
                        label={item.shortName}
                        colorHex={item.accentHex}
                        shapeSeed={item.gpuIndex + idx}
                        active={sim.tool === 'plant' && sim.activeBrushId === id}
                        lightBackdrop={lightPaperBackdrop}
                        title={`${item.commonName} — Click ground to plant`}
                        onClick={() => {
                          playSfx('pop');
                          handleSelectBrush(id);
                        }}
                      >
                        <BotanicalIcon id={id} className="w-6 h-6" />
                      </GouacheSwatch>
                    );
                  })}
                  <GlassOrbButton
                    label={`All ${VIRGINIA_ITEMS.length}`}
                    tone="chartreuse"
                    size="sm"
                    lightBackdrop={lightPaperBackdrop}
                    title={`Browse all ${VIRGINIA_ITEMS.length} sprite-stacked plants, instruments, water, and structures`}
                    onClick={() => openSpatialMenu('botanicals')}
                    className="shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </GlassOrbButton>
                </>
              )}
            </div>
          </div>

          {/* Right: View Mode & BIM Orbs */}
          <div className="pointer-events-auto shrink-0 flex items-end gap-2 sm:gap-2.5">
            <GlassOrbButton
              label="Style"
              tone="rose"
              size="sm"
              active={sim.visualFilter.style !== 'natural' || sim.paintMode !== 'pixel'}
              lightBackdrop={lightPaperBackdrop}
              title="Open Visual Style & Filters"
              onClick={() => openSpatialMenu('style')}
            >
              <Sparkles className="w-4 h-4" />
            </GlassOrbButton>

            <GlassOrbButton
              label="Plan"
              tone="sky"
              size="sm"
              active={mode === 'plan'}
              lightBackdrop={lightPaperBackdrop}
              title="Toggle Top-Down Architectural Plan View (P)"
              onClick={() => {
                playSfx('pop');
                handleSelectMode(mode === 'plan' ? 'design' : 'plan');
              }}
            >
              <MapIcon className="w-4 h-4" />
            </GlassOrbButton>

            <GlassOrbButton
              label="Walk"
              tone="amber"
              size="sm"
              lightBackdrop={lightPaperBackdrop}
              title="Step inside the sanctuary in First-Person POV"
              onClick={() => {
                playSfx('open');
                handleSelectMode('pov');
              }}
            >
              <Footprints className="w-4 h-4" />
            </GlassOrbButton>

            <GlassOrbButton
              label="BIM"
              sublabel={`${schedule.totalItems}`}
              tone="violet"
              size="sm"
              active={bimOpen}
              lightBackdrop={lightPaperBackdrop}
              title="Inspect Landscape BIM Layers & Takeoff Sheet"
              onClick={() => {
                playSfx(bimOpen ? 'back' : 'open');
                setMenuOpen(false);
                setBimOpen((v) => !v);
              }}
            >
              <Layers className="w-4 h-4" />
            </GlassOrbButton>
          </div>
        </nav>
      ) : (
        /* ── FIRST-PERSON POV FLOATING WALK ORBS ─────────────────────────── */
        <div className="fixed bottom-5 inset-x-0 z-20 px-6 flex items-end justify-between pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3">
            <GlassOrbButton
              label="Exit POV"
              tone="amber"
              size="md"
              lightBackdrop={lightPaperBackdrop}
              onClick={() => {
                playSfx('back');
                handleSelectMode('design');
              }}
            >
              <Compass className="w-5 h-5" />
            </GlassOrbButton>
            <GlassOrbButton
              label="Entrance"
              tone="slate"
              size="sm"
              lightBackdrop={lightPaperBackdrop}
              onClick={() => {
                playSfx('whoosh');
                engineRef.current?.resetEntrance();
              }}
            >
              <RotateCcw className="w-4 h-4" />
            </GlassOrbButton>
          </div>

          {/* Unboxed Directional Walk Orbs */}
          <div className="pointer-events-auto grid grid-cols-3 gap-1.5 items-center justify-items-center">
            <span />
            <button
              type="button"
              aria-label="Walk forward"
              onPointerDown={() => engineRef.current?.setVirtualMove(1, 0, 0)}
              onPointerUp={() => engineRef.current?.setVirtualMove(0, 0, 0)}
              onPointerLeave={() => engineRef.current?.setVirtualMove(0, 0, 0)}
              className="sylva-orb w-10 h-10 flex items-center justify-center text-white cursor-pointer"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <span />
            <button
              type="button"
              aria-label="Strafe left"
              onPointerDown={() => engineRef.current?.setVirtualMove(0, -1, 0)}
              onPointerUp={() => engineRef.current?.setVirtualMove(0, 0, 0)}
              onPointerLeave={() => engineRef.current?.setVirtualMove(0, 0, 0)}
              className="sylva-orb w-10 h-10 flex items-center justify-center text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Walk backward"
              onPointerDown={() => engineRef.current?.setVirtualMove(-1, 0, 0)}
              onPointerUp={() => engineRef.current?.setVirtualMove(0, 0, 0)}
              onPointerLeave={() => engineRef.current?.setVirtualMove(0, 0, 0)}
              className="sylva-orb w-10 h-10 flex items-center justify-center text-white cursor-pointer"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Strafe right"
              onPointerDown={() => engineRef.current?.setVirtualMove(0, 1, 0)}
              onPointerUp={() => engineRef.current?.setVirtualMove(0, 0, 0)}
              onPointerLeave={() => engineRef.current?.setVirtualMove(0, 0, 0)}
              className="sylva-orb w-10 h-10 flex items-center justify-center text-white cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* ── DOCKED 3D INSTRUMENT PERFORMANCE & ENSEMBLE CONSOLE ───────────── */}
      {realm === 'sanctuary' && !sim.povMode && !menuOpen && selectedInstrument && (
        <InstrumentConsole
          selectedItem={selectedInstrument}
          onRotate={handleRotatePlacedItem}
          onAdjustScale={handleAdjustPlacedScale}
          onRemove={handleRemovePlacedItem}
          onClose={() => setSelectedInstrumentUid(null)}
          playSfx={playSfx}
        />
      )}

      {/* ── FLOATING 3D-TILT CAMERA/SCREEN TILES & OVERHEAD WHISPERS ──────── */}
      <FloatingMediaTiles
        callState={callState}
        onStopLocalCam={() => callEngineRef.current?.stopCam()}
        onStopLocalScreen={() => callEngineRef.current?.stopScreen()}
      />

      {/* ── 3D PERSPECTIVE CONTAINER MAIN MENU (7-Panel -> 3/4 Focused) ───── */}
      <PerspectiveMenu
        open={menuOpen}
        initialContainer={menuContainer}
        realm={realm}
        activeDropZone={activeDropZone}
        paperSkyStyle={paperSkyStyle}
        onSelectPaperSkyStyle={handleSelectPaperSkyStyle}
        physicsProfile={physicsProfile}
        onSelectPhysicsProfile={handleSelectPhysicsProfile}
        pixelTypography={pixelTypography}
        onTogglePixelTypography={() => setPixelTypography((v) => !v)}
        onClose={() => setMenuOpen(false)}
        sim={sim}
        mode={mode}
        activePresetId={activePresetId}
        plantScale={plantScale}
        canopyGrowth={canopyGrowth}
        autoCycleTime={autoCycleTime}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onPatch={handlePatch}
        onSetPlantScale={setPlantScale}
        onSelectBrush={handleSelectBrush}
        onSelectPathMaterial={handleSelectPathMaterial}
        onToggleAutoCycleTime={() => setAutoCycleTime((v) => !v)}
        onSelectPreset={handleSelectPreset}
        onSelectMode={handleSelectMode}
        onOpenBim={() => setBimOpen(true)}
        onTriggerGust={() => engineRef.current?.triggerGust(0.95, true)}
        onGrowBack={() => engineRef.current?.growBack()}
        onDownloadPng={handleDownloadPng}
        onDownloadHtml={handleDownloadHtml}
        onDownloadPaperSkyHtml={handleDownloadPaperSkyHtml}
        onDownloadCsv={handleDownloadCsv}
        onDownloadJson={handleDownloadJson}
        onImportJson={handleImportJson}
        onEnterPaperSky={handleEnterPaperSky}
        onDropIntoSanctuary={handleDropIntoSanctuary}
        callState={callState}
        onCreateRoom={() => {
          const code = callEngineRef.current?.createAndJoinRoom();
          if (code) flashNotice(`Opened room #${code}`);
        }}
        onJoinRoom={(code) => {
          callEngineRef.current?.join(code);
          flashNotice(`Joined room #${code.replace(/^#/, '')}`);
        }}
        onLeaveRoom={() => {
          callEngineRef.current?.leave();
          flashNotice('Returned to Local Mode');
        }}
        onToggleMic={() => {
          void callEngineRef.current?.toggleMic();
        }}
        onPushToTalk={(held) => {
          void callEngineRef.current?.setPushToTalk(held);
        }}
        onToggleCam={() => {
          void callEngineRef.current?.toggleCam();
        }}
        onToggleScreen={() => {
          void callEngineRef.current?.toggleScreen();
        }}
        onSetMyName={(name) => callEngineRef.current?.setMyName(name)}
        onSetMyColor={(hex) => callEngineRef.current?.setMyColor(hex)}
        onSetPeerVolume={(peerId, vol) => callEngineRef.current?.setPeerVolume(peerId, vol)}
        onTogglePeerMute={(peerId) => callEngineRef.current?.togglePeerMute(peerId)}
        onSendChat={(text) => callEngineRef.current?.sendChatMessage(text)}
        playSfx={playSfx}
      />

      {/* ── COMPACT TRANSLUCENT BIM INSPECTION SHEET (On-Demand) ──────────── */}
      <BimSheet
        open={bimOpen}
        onClose={() => {
          playSfx('back');
          setBimOpen(false);
        }}
        bimLayers={sim.bimLayers}
        schedule={schedule}
        showGrid={sim.showGrid}
        snapGridFt={sim.snapGridFt}
        activeRotation={sim.activeRotation}
        hasPaths={sim.pathNodes.length > 0}
        hasItems={sim.placedItems.length > 0}
        onToggleLayerVisible={handleToggleBimVisible}
        onToggleLayerLock={handleToggleBimLock}
        onToggleGrid={() => {
          playSfx('tick');
          setSim((prev) => ({ ...prev, showGrid: !prev.showGrid }));
        }}
        onChangeSnap={(snap) => {
          playSfx('tick');
          setSim((prev) => ({ ...prev, snapGridFt: snap }));
        }}
        onRotateStep={(delta) => {
          playSfx('tick');
          setSim((prev) => ({
            ...prev,
            activeRotation: (prev.activeRotation + delta) % (Math.PI * 2),
          }));
        }}
        onClearPaths={handleClearPaths}
        onClearSite={handleClearSite}
        onExportCsv={handleDownloadCsv}
      />
    </div>
  );
}
