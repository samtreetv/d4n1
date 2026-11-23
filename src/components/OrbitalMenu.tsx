import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Compass,
  Download,
  Feather,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  Flower2,
  Footprints,
  Image as ImageIcon,
  Layers,
  Map as MapIcon,
  Mountain,
  Paintbrush,
  Palette,
  Pause,
  Play,
  RotateCw,
  Sparkles,
  Sprout,
  Sun,
  Trees,
  Upload,
  Waves,
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
import {
  ExperienceMode,
  SceneSimulationState,
} from '../engine/rendererTypes';
import {
  ASCII_GLYPH_SETS,
  FilterColorTint,
  PaintMaterialMode,
  VisualFilterStyle,
} from '../engine/visualFilters';
import { BotanicalIcon } from './BotanicalIcons';
import {
  FloatingOrbSlider,
  GlassOrbButton,
  GouacheSwatch,
  ORB_TONES,
} from './OrbPrimitives';

export type OrbitalPlanetId =
  | 'botanicals'
  | 'paint'
  | 'seasons'
  | 'spaces'
  | 'bim'
  | 'archive';

interface OrbitalMenuProps {
  open: boolean;
  initialPlanet: OrbitalPlanetId | null;
  onClose: () => void;
  sim: SceneSimulationState;
  mode: ExperienceMode;
  activePresetId: string | null;
  plantScale: number;
  canopyGrowth: number;
  autoCycleTime: boolean;
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
  playSfx: (kind: 'tick' | 'pop' | 'open' | 'back' | 'whoosh') => void;
}

const PLANETS: {
  id: OrbitalPlanetId;
  label: string;
  sub: string;
  tone: keyof typeof ORB_TONES;
  icon: React.ReactNode;
}[] = [
  {
    id: 'botanicals',
    label: 'Botanicals',
    sub: '24 objects',
    tone: 'emerald',
    icon: <Trees className="w-6 h-6" />,
  },
  {
    id: 'paint',
    label: 'Paint & Style',
    sub: 'Oil & filters',
    tone: 'crimson',
    icon: <Palette className="w-6 h-6" />,
  },
  {
    id: 'seasons',
    label: 'Seasons & Sky',
    sub: 'Sun & weather',
    tone: 'sky',
    icon: <Sun className="w-6 h-6" />,
  },
  {
    id: 'spaces',
    label: 'Spaces & Modes',
    sub: '5 sanctuaries',
    tone: 'violet',
    icon: <Compass className="w-6 h-6" />,
  },
  {
    id: 'bim',
    label: 'BIM Studio',
    sub: 'Layers & CSV',
    tone: 'amber',
    icon: <Layers className="w-6 h-6" />,
  },
  {
    id: 'archive',
    label: 'Archive',
    sub: 'Download',
    tone: 'rose',
    icon: <Download className="w-6 h-6" />,
  },
];

const FAMILY_TONES: Record<BimLayerId, keyof typeof ORB_TONES> = {
  trees: 'emerald',
  understory: 'chartreuse',
  'water-stone': 'sky',
  structures: 'amber',
  'paths-lighting': 'rose',
  instruments: 'violet',
};

const PAINT_MODES: {
  id: PaintMaterialMode;
  label: string;
  sub: string;
  tone: keyof typeof ORB_TONES;
}[] = [
  { id: 'pixel', label: 'Pixel Stack', sub: 'Crisp 3D', tone: 'sky' },
  { id: 'oil-3d', label: '3D Oil Paint', sub: 'World dabs', tone: 'crimson' },
  { id: 'living-canvas', label: 'Living Canvas', sub: 'Oil + linen', tone: 'amber' },
];

const SCREEN_FILTERS: {
  id: VisualFilterStyle;
  label: string;
  tone: keyof typeof ORB_TONES;
}[] = [
  { id: 'natural', label: 'Natural', tone: 'emerald' },
  { id: 'oil', label: '2D Oil', tone: 'amber' },
  { id: 'ascii', label: 'ASCII', tone: 'violet' },
  { id: 'dots', label: 'Dots', tone: 'sky' },
  { id: 'grain', label: 'Grain', tone: 'slate' },
  { id: 'scan', label: 'Scan', tone: 'rose' },
];

const COLOR_TINTS: { id: FilterColorTint; label: string; tone: keyof typeof ORB_TONES }[] = [
  { id: 'full', label: 'Full', tone: 'emerald' },
  { id: 'mono', label: 'Mono', tone: 'pearl' },
  { id: 'gold', label: 'Amber', tone: 'amber' },
  { id: 'blue', label: 'Cobalt', tone: 'sky' },
];

export const OrbitalMenu: React.FC<OrbitalMenuProps> = ({
  open,
  initialPlanet,
  onClose,
  sim,
  mode,
  activePresetId,
  plantScale,
  canopyGrowth,
  autoCycleTime,
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
  playSfx,
}) => {
  const [activePlanet, setActivePlanet] = useState<OrbitalPlanetId | null>(initialPlanet);
  const [botanicalFamily, setBotanicalFamily] = useState<BimLayerId | 'path-brush'>('trees');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setActivePlanet(initialPlanet);
    }
  }, [open, initialPlanet]);

  if (!open) return null;

  const seasonInfo = formatSeasonLabel(sim.season);
  const timeInfo = formatTimeOfDay(sim.timeOfDay);
  const rotDeg = Math.round((((sim.activeRotation * 180) / Math.PI) % 360 + 360) % 360);

  const handleSelectPlanet = (id: OrbitalPlanetId) => {
    if (id === 'bim') {
      playSfx('open');
      onClose();
      onOpenBim();
      return;
    }
    playSfx('open');
    setActivePlanet(id);
  };

  const handleBackToSolar = () => {
    playSfx('back');
    setActivePlanet(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportJson(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const activePlanetMeta = PLANETS.find((p) => p.id === activePlanet) ?? null;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-label="Virginia Sylva Orbital Menu"
    >
      {/* Soft atmospheric veil — keeps the living 3D grove softly breathing behind */}
      <button
        type="button"
        aria-label="Return to sanctuary"
        onClick={() => {
          playSfx('back');
          onClose();
        }}
        className="fixed inset-0 bg-radial from-black/35 via-black/48 to-black/62 backdrop-blur-[5px] cursor-default border-0"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ── STATE 1: 6-PLANET SOLAR SYSTEM CONSTELLATION ───────────────────── */}
      {activePlanet === null && (
        <div className="relative z-10 flex items-center justify-center w-[340px] h-[340px] sm:w-[440px] sm:h-[440px]">
          {/* Subtle orbital constellation ring */}
          <div
            className="absolute inset-8 sm:inset-10 rounded-full border border-dashed border-white/18 pointer-events-none"
            aria-hidden="true"
          />

          {/* Central Sun Hub Orb */}
          <div className="relative z-20 flex flex-col items-center">
            <GlassOrbButton
              label="Return"
              tone="amber"
              size="xl"
              onClick={() => {
                playSfx('back');
                onClose();
              }}
              className="sylva-float-gentle"
            >
              <X className="w-7 h-7" />
            </GlassOrbButton>
          </div>

          {/* 6 Orbiting Category Planets */}
          {PLANETS.map((planet, idx) => {
            const angle = -Math.PI / 2 + (idx / PLANETS.length) * Math.PI * 2;
            const radiusPct = 41;
            const leftPct = 50 + Math.cos(angle) * radiusPct;
            const topPct = 50 + Math.sin(angle) * radiusPct;
            return (
              <div
                key={planet.id}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-300"
              >
                <GlassOrbButton
                  label={planet.label}
                  sublabel={planet.sub}
                  tone={planet.tone}
                  size="lg"
                  onClick={() => handleSelectPlanet(planet.id)}
                >
                  {planet.icon}
                </GlassOrbButton>
              </div>
            );
          })}
        </div>
      )}

      {/* ── STATE 2: ACTIVE SUN PLANET + UNBOXED ORBITAL CONTROLS ─────────── */}
      {activePlanet !== null && activePlanetMeta && (
        <div className="relative z-10 w-full max-w-[780px] max-h-[86vh] overflow-y-auto sylva-scroll flex flex-col items-center gap-6 px-3 py-4">
          {/* Active Center Sun Orb Header (Click to glide back to solar system) */}
          <div className="flex items-center gap-6">
            <GlassOrbButton
              label="Orbits"
              tone="slate"
              size="xs"
              onClick={handleBackToSolar}
            >
              <ArrowLeft className="w-4 h-4" />
            </GlassOrbButton>

            <GlassOrbButton
              label={activePlanetMeta.label}
              sublabel={activePlanetMeta.sub}
              tone={activePlanetMeta.tone}
              size="lg"
              active
              onClick={handleBackToSolar}
            >
              {activePlanetMeta.icon}
            </GlassOrbButton>

            <GlassOrbButton
              label="Done"
              tone="pearl"
              size="xs"
              onClick={() => {
                playSfx('back');
                onClose();
              }}
            >
              <X className="w-4 h-4 text-[#1d231e]" />
            </GlassOrbButton>
          </div>

          {/* ── PLANET 1: BOTANICALS & PATHS (Gouache Swatches) ─────────────── */}
          {activePlanet === 'botanicals' && (
            <div className="w-full flex flex-col items-center gap-6">
              {/* 5 BIM Family Orbs + Path Brush Orb */}
              <div className="flex flex-wrap items-center justify-center gap-4">
                {BIM_LAYERS.map((layer) => (
                  <GlassOrbButton
                    key={layer.id}
                    label={layer.shortLabel}
                    tone={FAMILY_TONES[layer.id]}
                    size="sm"
                    active={botanicalFamily === layer.id}
                    onClick={() => {
                      playSfx('tick');
                      setBotanicalFamily(layer.id);
                    }}
                  >
                    {layer.id === 'trees' && <Trees className="w-4 h-4" />}
                    {layer.id === 'understory' && <Flower2 className="w-4 h-4" />}
                    {layer.id === 'water-stone' && <Waves className="w-4 h-4" />}
                    {layer.id === 'structures' && <Mountain className="w-4 h-4" />}
                    {layer.id === 'paths-lighting' && <Sparkles className="w-4 h-4" />}
                  </GlassOrbButton>
                ))}
                <GlassOrbButton
                  label="Paint Path"
                  tone="amber"
                  size="sm"
                  active={botanicalFamily === 'path-brush'}
                  onClick={() => {
                    playSfx('tick');
                    setBotanicalFamily('path-brush');
                  }}
                >
                  <Paintbrush className="w-4 h-4" />
                </GlassOrbButton>
              </div>

              {/* Gouache Swatch Field */}
              {botanicalFamily === 'path-brush' ? (
                <div className="flex flex-col items-center gap-5 w-full">
                  <div className="flex flex-wrap items-center justify-center gap-5">
                    {PATH_MATERIALS.map((mat, idx) => (
                      <GouacheSwatch
                        key={mat.id}
                        label={mat.label}
                        colorHex={mat.swatchHex}
                        shapeSeed={idx + 2}
                        size="md"
                        active={sim.tool === 'path' && sim.activePathMaterial === mat.id}
                        onClick={() => {
                          playSfx('pop');
                          onSelectPathMaterial(mat.id);
                          onClose();
                        }}
                      >
                        <Paintbrush className="w-5 h-5 text-[#18201b]" />
                      </GouacheSwatch>
                    ))}
                  </div>
                  <div className="w-full max-w-[340px]">
                    <FloatingOrbSlider
                      label="Path Brush Width"
                      valueLabel={`${(sim.pathBrushRadius * 20).toFixed(1)} ft`}
                      min={0.16}
                      max={0.44}
                      step={0.02}
                      value={sim.pathBrushRadius}
                      onChange={(v) => onPatch({ pathBrushRadius: v })}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-5 w-full">
                  <div className="flex flex-wrap items-center justify-center gap-4 max-w-[680px]">
                    {getItemsByLayer(botanicalFamily).map((item, idx) => (
                      <GouacheSwatch
                        key={item.id}
                        label={item.shortName}
                        colorHex={item.accentHex}
                        shapeSeed={item.gpuIndex + idx}
                        size="md"
                        active={sim.tool === 'plant' && sim.activeBrushId === item.id}
                        title={`${item.commonName} — ${item.tagline}`}
                        onClick={() => {
                          playSfx('pop');
                          onSelectBrush(item.id);
                          onClose();
                        }}
                      >
                        <BotanicalIcon id={item.id} className="w-7 h-7" />
                      </GouacheSwatch>
                    ))}
                  </div>

                  {/* Unboxed Placement Scale & Rotation Controls */}
                  <div className="flex flex-wrap items-center justify-center gap-6 w-full max-w-[520px]">
                    <FloatingOrbSlider
                      label="Specimen Scale"
                      valueLabel={`${Math.round(plantScale * 100)}%`}
                      min={0.65}
                      max={1.4}
                      step={0.05}
                      value={plantScale}
                      onChange={onSetPlantScale}
                      className="flex-1 min-w-[200px]"
                    />
                    <GlassOrbButton
                      label={`Angle ${rotDeg}°`}
                      tone="slate"
                      size="xs"
                      onClick={() => {
                        playSfx('tick');
                        onPatch({
                          activeRotation: (sim.activeRotation + Math.PI / 4) % (Math.PI * 2),
                        });
                      }}
                    >
                      <RotateCw className="w-4 h-4" />
                    </GlassOrbButton>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PLANET 2: PAINT & VISION (3 Oil Modes + 6 Screen Filters) ───── */}
          {activePlanet === 'paint' && (
            <div className="w-full flex flex-col items-center gap-6">
              {/* 3D Sprite Material Layer */}
              <div className="flex flex-col items-center gap-3">
                <span className="sylva-sky-text text-[10px] font-mono uppercase tracking-[0.2em] opacity-80">
                  3D Sprite Material
                </span>
                <div className="flex flex-wrap items-center justify-center gap-5">
                  {PAINT_MODES.map((pm) => (
                    <GlassOrbButton
                      key={pm.id}
                      label={pm.label}
                      sublabel={pm.sub}
                      tone={pm.tone}
                      size="md"
                      active={sim.paintMode === pm.id}
                      onClick={() => {
                        playSfx('pop');
                        onPatch({ paintMode: pm.id });
                      }}
                    >
                      {pm.id === 'pixel' ? (
                        <Layers className="w-5 h-5" />
                      ) : pm.id === 'oil-3d' ? (
                        <Paintbrush className="w-5 h-5" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                    </GlassOrbButton>
                  ))}
                </div>
              </div>

              {/* 2D Screen-Space Filter Layer */}
              <div className="flex flex-col items-center gap-3">
                <span className="sylva-sky-text text-[10px] font-mono uppercase tracking-[0.2em] opacity-80">
                  2D Visual Filter
                </span>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {SCREEN_FILTERS.map((flt) => (
                    <GlassOrbButton
                      key={flt.id}
                      label={flt.label}
                      tone={flt.tone}
                      size="sm"
                      active={sim.visualFilter.style === flt.id}
                      onClick={() => {
                        playSfx('tick');
                        onPatch({
                          visualFilter: { ...sim.visualFilter, style: flt.id },
                        });
                      }}
                    >
                      {flt.id === 'oil' ? (
                        <Paintbrush className="w-4 h-4" />
                      ) : (
                        <span className="text-[11px] font-mono font-semibold">
                          {flt.id === 'natural'
                            ? '○'
                            : flt.id === 'ascii'
                              ? '#'
                              : flt.id === 'dots'
                                ? '∷'
                                : flt.id === 'grain'
                                  ? '░'
                                  : '≡'}
                        </span>
                      )}
                    </GlassOrbButton>
                  ))}
                </div>
              </div>

              {/* Tint & Glyph Orbs when a 2D filter is active */}
              {sim.visualFilter.style !== 'natural' && (
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {COLOR_TINTS.map((tint) => (
                    <GlassOrbButton
                      key={tint.id}
                      label={tint.label}
                      tone={tint.tone}
                      size="xs"
                      active={sim.visualFilter.colorTint === tint.id}
                      onClick={() => {
                        playSfx('tick');
                        onPatch({
                          visualFilter: { ...sim.visualFilter, colorTint: tint.id },
                        });
                      }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-white/85" />
                    </GlassOrbButton>
                  ))}
                  {sim.visualFilter.style === 'ascii' &&
                    ASCII_GLYPH_SETS.map((gs) => (
                      <button
                        key={gs.id}
                        type="button"
                        onClick={() => {
                          playSfx('tick');
                          onPatch({
                            visualFilter: { ...sim.visualFilter, glyphSet: gs.id },
                          });
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-mono transition-all cursor-pointer ${
                          sim.visualFilter.glyphSet === gs.id
                            ? 'bg-white text-[#141916] font-semibold'
                            : 'bg-white/12 text-white/85 hover:bg-white/22'
                        }`}
                      >
                        {gs.label}
                      </button>
                    ))}
                </div>
              )}

              {/* Unboxed Floating Orb Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 w-full max-w-[540px] pt-1">
                <FloatingOrbSlider
                  label="Oil Impasto"
                  valueLabel={`${Math.round(sim.impasto * 100)}%`}
                  min={0}
                  max={1}
                  step={0.05}
                  value={sim.impasto}
                  onChange={(v) => onPatch({ impasto: v })}
                />
                <FloatingOrbSlider
                  label="Stack Relief"
                  valueLabel={`${sim.stackRelief.toFixed(2)}×`}
                  min={0.5}
                  max={1.8}
                  step={0.05}
                  value={sim.stackRelief}
                  onChange={(v) => onPatch({ stackRelief: v })}
                />
                {sim.visualFilter.style !== 'natural' && (
                  <>
                    <FloatingOrbSlider
                      label="Filter Density"
                      valueLabel={`${Math.round(sim.visualFilter.density * 100)}%`}
                      min={0.05}
                      max={1}
                      step={0.02}
                      value={sim.visualFilter.density}
                      onChange={(v) =>
                        onPatch({
                          visualFilter: { ...sim.visualFilter, density: v },
                        })
                      }
                    />
                    <FloatingOrbSlider
                      label="Bloom Glow"
                      valueLabel={`${Math.round(sim.visualFilter.glow * 100)}%`}
                      min={0}
                      max={1}
                      step={0.02}
                      value={sim.visualFilter.glow}
                      onChange={(v) =>
                        onPatch({
                          visualFilter: { ...sim.visualFilter, glow: v },
                        })
                      }
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── PLANET 3: SEASONS, WEATHER & SKY ────────────────────────────── */}
          {activePlanet === 'seasons' && (
            <div className="w-full flex flex-col items-center gap-6">
              {/* 4 Seasons + 3 Backdrops */}
              <div className="flex flex-wrap items-center justify-center gap-4">
                {[
                  { label: 'Spring', val: 0.45, tone: 'rose' as const },
                  { label: 'Summer', val: 1.35, tone: 'emerald' as const },
                  { label: 'Autumn', val: 2.55, tone: 'amber' as const },
                  { label: 'Winter', val: 3.45, tone: 'sky' as const },
                ].map((s) => (
                  <GlassOrbButton
                    key={s.label}
                    label={s.label}
                    tone={s.tone}
                    size="sm"
                    active={Math.abs(sim.season - s.val) < 0.42}
                    onClick={() => {
                      playSfx('pop');
                      onPatch({ season: s.val });
                    }}
                  >
                    <Flower2 className="w-4 h-4" />
                  </GlassOrbButton>
                ))}
              </div>

              {/* Weather & Backdrop Orbs */}
              <div className="flex flex-wrap items-center justify-center gap-4">
                {(
                  [
                    { id: 'clear', label: 'Clear', tone: 'amber' },
                    { id: 'mist', label: 'Mist', tone: 'pearl' },
                    { id: 'rain', label: 'Rain', tone: 'sky' },
                    { id: 'snow', label: 'Snow', tone: 'slate' },
                  ] as { id: WeatherMode; label: string; tone: keyof typeof ORB_TONES }[]
                ).map((w) => (
                  <GlassOrbButton
                    key={w.id}
                    label={w.label}
                    tone={w.tone}
                    size="xs"
                    active={sim.weather === w.id}
                    onClick={() => {
                      playSfx('tick');
                      onPatch({ weather: w.id });
                    }}
                  >
                    <Wind className="w-3.5 h-3.5" />
                  </GlassOrbButton>
                ))}

                <span className="w-px h-7 bg-white/20 mx-1" aria-hidden="true" />

                {(
                  [
                    { id: 'blue-ridge', label: 'Blue Ridge', tone: 'sky' },
                    { id: 'white-circle', label: 'White Paper', tone: 'pearl' },
                    { id: 'blueprint', label: 'Blueprint', tone: 'violet' },
                  ] as { id: BackdropStyle; label: string; tone: keyof typeof ORB_TONES }[]
                ).map((b) => (
                  <GlassOrbButton
                    key={b.id}
                    label={b.label}
                    tone={b.tone}
                    size="xs"
                    active={sim.backdropStyle === b.id}
                    onClick={() => {
                      playSfx('pop');
                      onPatch({
                        backdropStyle: b.id,
                        studioBackdrop: b.id === 'white-circle',
                      });
                    }}
                  >
                    <Mountain
                      className={`w-3.5 h-3.5 ${b.id === 'white-circle' ? 'text-[#1c241e]' : ''}`}
                    />
                  </GlassOrbButton>
                ))}

                <GlassOrbButton
                  label="Fireflies"
                  tone="chartreuse"
                  size="xs"
                  active={sim.fireflies}
                  onClick={() => {
                    playSfx('tick');
                    onPatch({ fireflies: !sim.fireflies });
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </GlassOrbButton>

                <GlassOrbButton
                  label="Sun Drift"
                  tone="amber"
                  size="xs"
                  active={autoCycleTime}
                  onClick={() => {
                    playSfx('tick');
                    onToggleAutoCycleTime();
                  }}
                >
                  <Sun className="w-3.5 h-3.5" />
                </GlassOrbButton>
              </div>

              {/* Unboxed Atmospheric Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 w-full max-w-[540px]">
                <FloatingOrbSlider
                  label="Season"
                  valueLabel={`${seasonInfo.seasonName} · ${seasonInfo.monthApprox}`}
                  min={0}
                  max={4}
                  step={0.02}
                  value={sim.season}
                  onChange={(v) => onPatch({ season: v })}
                />
                <FloatingOrbSlider
                  label="Sun Hour"
                  valueLabel={`${timeInfo.clock} ${timeInfo.phase}`}
                  min={0}
                  max={24}
                  step={0.1}
                  value={sim.timeOfDay}
                  onChange={(v) => onPatch({ timeOfDay: v })}
                />
                <FloatingOrbSlider
                  label="Wind Breeze"
                  valueLabel={`${Math.round(sim.wind * 34)} mph`}
                  min={0}
                  max={1}
                  step={0.02}
                  value={sim.wind}
                  onChange={(v) => onPatch({ wind: v })}
                />
                <FloatingOrbSlider
                  label="Weather Density"
                  valueLabel={`${Math.round(sim.weatherIntensity * 100)}%`}
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={sim.weatherIntensity}
                  onChange={(v) => onPatch({ weatherIntensity: v })}
                />
              </div>
            </div>
          )}

          {/* ── PLANET 4: SPACES, PRESETS & EXPERIENCE MODES ────────────────── */}
          {activePlanet === 'spaces' && (
            <div className="w-full flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-3">
                <span className="sylva-sky-text text-[10px] font-mono uppercase tracking-[0.2em] opacity-80">
                  Virginia Sanctuaries
                </span>
                <div className="flex flex-wrap items-center justify-center gap-5">
                  {SPACE_PRESETS.map((preset, idx) => {
                    const tones: (keyof typeof ORB_TONES)[] = [
                      'emerald',
                      'sky',
                      'rose',
                      'amber',
                      'pearl',
                    ];
                    return (
                      <GlassOrbButton
                        key={preset.id}
                        label={preset.name}
                        tone={tones[idx % tones.length]}
                        size="md"
                        active={activePresetId === preset.id}
                        title={preset.description}
                        onClick={() => {
                          playSfx('pop');
                          onSelectPreset(preset.id);
                          onClose();
                        }}
                      >
                        <Trees
                          className={`w-5 h-5 ${
                            tones[idx % tones.length] === 'pearl' ? 'text-[#1c241e]' : ''
                          }`}
                        />
                      </GlassOrbButton>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <span className="sylva-sky-text text-[10px] font-mono uppercase tracking-[0.2em] opacity-80">
                  Camera &amp; Living Motion
                </span>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <GlassOrbButton
                    label="Design 3D"
                    tone="emerald"
                    size="sm"
                    active={mode === 'design'}
                    onClick={() => {
                      playSfx('pop');
                      onSelectMode('design');
                      onClose();
                    }}
                  >
                    <Compass className="w-4 h-4" />
                  </GlassOrbButton>
                  <GlassOrbButton
                    label="Plan View"
                    tone="sky"
                    size="sm"
                    active={mode === 'plan'}
                    onClick={() => {
                      playSfx('pop');
                      onSelectMode('plan');
                      onClose();
                    }}
                  >
                    <MapIcon className="w-4 h-4" />
                  </GlassOrbButton>
                  <GlassOrbButton
                    label="Walk POV"
                    tone="amber"
                    size="sm"
                    active={mode === 'pov'}
                    onClick={() => {
                      playSfx('pop');
                      onSelectMode('pov');
                      onClose();
                    }}
                  >
                    <Footprints className="w-4 h-4" />
                  </GlassOrbButton>
                  <GlassOrbButton
                    label="Drift Orbit"
                    tone="violet"
                    size="sm"
                    active={mode === 'drift'}
                    onClick={() => {
                      playSfx('pop');
                      onSelectMode('drift');
                      onClose();
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </GlassOrbButton>
                  <GlassOrbButton
                    label="Paper Sky"
                    tone="sky"
                    size="sm"
                    onClick={() => {
                      playSfx('whoosh');
                      onClose();
                      onEnterPaperSky();
                    }}
                  >
                    <Feather className="w-4 h-4" />
                  </GlassOrbButton>
                  <GlassOrbButton
                    label={sim.paused ? 'Resume' : 'Pause'}
                    tone="slate"
                    size="sm"
                    active={sim.paused}
                    onClick={() => {
                      playSfx('tick');
                      onPatch({ paused: !sim.paused });
                    }}
                  >
                    {sim.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </GlassOrbButton>
                  <GlassOrbButton
                    label="Shake Gust"
                    tone="rose"
                    size="sm"
                    onClick={() => {
                      playSfx('whoosh');
                      onTriggerGust();
                    }}
                  >
                    <Wind className="w-4 h-4" />
                  </GlassOrbButton>
                  {canopyGrowth < 0.98 && (
                    <GlassOrbButton
                      label="Regrow"
                      tone="chartreuse"
                      size="sm"
                      onClick={() => {
                        playSfx('pop');
                        onGrowBack();
                      }}
                    >
                      <Sprout className="w-4 h-4" />
                    </GlassOrbButton>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── PLANET 6: ARCHIVE & DOWNLOADS ───────────────────────────────── */}
          {activePlanet === 'archive' && (
            <div className="flex flex-wrap items-center justify-center gap-6 py-2">
              <GlassOrbButton
                label="PNG Postcard"
                sublabel="Image"
                tone="amber"
                size="lg"
                onClick={() => {
                  playSfx('pop');
                  onDownloadPng();
                }}
              >
                <ImageIcon className="w-6 h-6" />
              </GlassOrbButton>
              <GlassOrbButton
                label="HTML Plate"
                sublabel="Offline"
                tone="rose"
                size="lg"
                onClick={() => {
                  playSfx('pop');
                  onDownloadHtml();
                }}
              >
                <FileCode2 className="w-6 h-6" />
              </GlassOrbButton>
              <GlassOrbButton
                label="Paper Sky"
                sublabel="Offline Game"
                tone="sky"
                size="lg"
                onClick={() => {
                  playSfx('pop');
                  onDownloadPaperSkyHtml();
                }}
              >
                <Feather className="w-6 h-6" />
              </GlassOrbButton>
              <GlassOrbButton
                label="BIM CSV"
                sublabel="Takeoff"
                tone="emerald"
                size="lg"
                onClick={() => {
                  playSfx('pop');
                  onDownloadCsv();
                }}
              >
                <FileSpreadsheet className="w-6 h-6" />
              </GlassOrbButton>
              <GlassOrbButton
                label="Save JSON"
                sublabel="Project"
                tone="sky"
                size="lg"
                onClick={() => {
                  playSfx('pop');
                  onDownloadJson();
                }}
              >
                <FileJson className="w-6 h-6" />
              </GlassOrbButton>
              <GlassOrbButton
                label="Load JSON"
                sublabel="Restore"
                tone="violet"
                size="lg"
                onClick={() => {
                  playSfx('tick');
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="w-6 h-6" />
              </GlassOrbButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
