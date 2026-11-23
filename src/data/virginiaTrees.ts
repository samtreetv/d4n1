export type TreeSpeciesId =
  | 'dogwood'
  | 'redbud'
  | 'cherry'
  | 'white-oak'
  | 'red-maple'
  | 'pine';

export type SpacePropId =
  | 'azalea'
  | 'fern'
  | 'wildflower'
  | 'switchgrass'
  | 'raised-bed'
  | 'pond'
  | 'water-basin'
  | 'stone'
  | 'stepping-stone'
  | 'bench'
  | 'pergola'
  | 'stone-wall'
  | 'fence'
  | 'pavilion'
  | 'lantern'
  | 'bollard'
  | 'fire-pit'
  | 'deck-tile';

export type InstrumentId =
  | 'upright-piano'
  | 'concert-harp'
  | 'marimba'
  | 'standing-cello'
  | 'modular-synth'
  | 'tape-deck'
  | 'drum-stack'
  | 'wind-chime-arch'
  | 'singing-bowl'
  | 'bronze-gong';

export const INSTRUMENT_IDS: InstrumentId[] = [
  'upright-piano',
  'concert-harp',
  'marimba',
  'standing-cello',
  'modular-synth',
  'tape-deck',
  'drum-stack',
  'wind-chime-arch',
  'singing-bowl',
  'bronze-gong',
];

export function isInstrumentId(id: string): id is InstrumentId {
  return (INSTRUMENT_IDS as string[]).includes(id);
}

export type PlaceableId = TreeSpeciesId | SpacePropId | InstrumentId;

export type BimLayerId =
  | 'trees'
  | 'understory'
  | 'water-stone'
  | 'structures'
  | 'paths-lighting'
  | 'instruments';

export type PathMaterialId = 'flagstone' | 'gravel' | 'stepping' | 'mulch';

export type BackdropStyle = 'white-circle' | 'blue-ridge' | 'blueprint';

export type WeatherMode = 'clear' | 'mist' | 'rain' | 'snow';

export type ObjectBuildKind =
  | 'tree'
  | 'shrub'
  | 'stone'
  | 'lantern'
  | 'fern'
  | 'wildflower'
  | 'switchgrass'
  | 'raised-bed'
  | 'pond'
  | 'water-basin'
  | 'stepping-stone'
  | 'bench'
  | 'pergola'
  | 'stone-wall'
  | 'fence'
  | 'pavilion'
  | 'bollard'
  | 'fire-pit'
  | 'deck-tile'
  | InstrumentId;

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface SeasonalPalette {
  leafShadow: RGB;
  leafLit: RGB;
  blossomShadow: RGB;
  blossomLit: RGB;
  leafScale: number;
  blossomScale: number;
  berryScale: number;
  shedRate: number;
}

export interface TreeArchitecture {
  kind: ObjectBuildKind;
  trunkHeight: number;
  trunkBaseRadius: number;
  trunkTopRadius: number;
  trunkTwist: number;
  boughCount: number;
  boughSpread: number;
  boughHorizontalBias: number;
  weepingDroop: number;
  crownWidth: number;
  crownHeight: number;
  clusterScale: number;
  evergreen: boolean;
  cauliflorous: boolean;
  barkTile: number;
  leafTiles: [number, number];
  blossomTiles: [number, number];
  fallingLeafTile: number;
  fallingPetalTile: number;
}

export interface BimTakeoffSpec {
  layer: BimLayerId;
  unitLabel: string;
  canopyRadiusFt: number;
  footprintSqFt: number;
  linearFt: number;
  waterSqFt: number;
  rotatable?: boolean;
}

export interface VirginiaSpaceItem {
  id: PlaceableId;
  gpuIndex: number;
  category: 'tree' | 'accent';
  bimLayer?: BimLayerId;
  commonName: string;
  shortName: string;
  scientificName: string;
  region: string;
  tagline: string;
  accentHex: string;
  barkShadow: RGB;
  barkLit: RGB;
  architecture: TreeArchitecture;
  seasons: {
    springEarly: SeasonalPalette;
    springPeak: SeasonalPalette;
    summer: SeasonalPalette;
    autumnEarly: SeasonalPalette;
    autumnPeak: SeasonalPalette;
    winter: SeasonalPalette;
  };
}

export interface PlacedSpaceItem {
  uid: string;
  itemId: PlaceableId;
  x: number;
  z: number;
  scale: number;
  rotation?: number; // radians
  seed: number;
}

export interface PathNode {
  uid: string;
  material: PathMaterialId;
  x: number;
  z: number;
  radius: number; // world units (0.16..0.44)
  seed: number;
}

export interface SpacePreset {
  id: string;
  name: string;
  description: string;
  defaultSeason: number;
  defaultTime: number;
  defaultWind: number;
  defaultWeather: WeatherMode;
  defaultBackdrop?: BackdropStyle;
  entrance: { x: number; z: number; yaw: number };
  paths?: Omit<PathNode, 'uid'>[];
  items: Omit<PlacedSpaceItem, 'uid'>[];
}

const rgb = (r: number, g: number, b: number): RGB => ({
  r: r / 255,
  g: g / 255,
  b: b / 255,
});

export function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

const NEUTRAL_SEASON: SeasonalPalette = {
  leafShadow: rgb(62, 102, 54),
  leafLit: rgb(124, 174, 86),
  blossomShadow: rgb(220, 200, 180),
  blossomLit: rgb(255, 240, 220),
  leafScale: 1.0,
  blossomScale: 0.0,
  berryScale: 0.0,
  shedRate: 0.0,
};

export const VIRGINIA_ITEMS: VirginiaSpaceItem[] = [
  {
    id: 'dogwood',
    gpuIndex: 0,
    category: 'tree',
    commonName: 'Flowering Dogwood',
    shortName: 'Dogwood',
    scientificName: 'Cornus florida',
    region: 'Virginia State Tree · Piedmont & Blue Ridge',
    tagline: 'Tiered horizontal boughs, notched white spring bracts, and crimson autumn leaves.',
    accentHex: '#f5e8e4',
    barkShadow: rgb(58, 49, 45),
    barkLit: rgb(118, 102, 92),
    architecture: {
      kind: 'tree',
      trunkHeight: 0.44,
      trunkBaseRadius: 0.044,
      trunkTopRadius: 0.018,
      trunkTwist: 0.22,
      boughCount: 6,
      boughSpread: 0.85,
      boughHorizontalBias: 0.72,
      weepingDroop: 0.05,
      crownWidth: 0.92,
      crownHeight: 0.56,
      clusterScale: 1.0,
      evergreen: false,
      cauliflorous: false,
      barkTile: 18,
      leafTiles: [4, 5],
      blossomTiles: [8, 9],
      fallingLeafTile: 22,
      fallingPetalTile: 23,
    },
    seasons: {
      springEarly: {
        leafShadow: rgb(74, 108, 52),
        leafLit: rgb(156, 198, 92),
        blossomShadow: rgb(214, 192, 194),
        blossomLit: rgb(255, 250, 248),
        leafScale: 0.25,
        blossomScale: 0.9,
        berryScale: 0.0,
        shedRate: 0.14,
      },
      springPeak: {
        leafShadow: rgb(62, 104, 48),
        leafLit: rgb(138, 188, 86),
        blossomShadow: rgb(216, 188, 194),
        blossomLit: rgb(255, 252, 250),
        leafScale: 0.62,
        blossomScale: 1.08,
        berryScale: 0.0,
        shedRate: 0.45,
      },
      summer: {
        leafShadow: rgb(32, 74, 40),
        leafLit: rgb(88, 146, 68),
        blossomShadow: rgb(216, 195, 196),
        blossomLit: rgb(255, 250, 248),
        leafScale: 1.02,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.04,
      },
      autumnEarly: {
        leafShadow: rgb(104, 34, 42),
        leafLit: rgb(192, 68, 64),
        blossomShadow: rgb(200, 180, 180),
        blossomLit: rgb(245, 238, 235),
        leafScale: 0.94,
        blossomScale: 0.0,
        berryScale: 0.65,
        shedRate: 0.45,
      },
      autumnPeak: {
        leafShadow: rgb(88, 22, 34),
        leafLit: rgb(168, 42, 54),
        blossomShadow: rgb(200, 180, 180),
        blossomLit: rgb(245, 238, 235),
        leafScale: 0.68,
        blossomScale: 0.0,
        berryScale: 0.95,
        shedRate: 0.95,
      },
      winter: {
        leafShadow: rgb(92, 48, 36),
        leafLit: rgb(138, 72, 52),
        blossomShadow: rgb(200, 180, 180),
        blossomLit: rgb(245, 238, 235),
        leafScale: 0.0,
        blossomScale: 0.0,
        berryScale: 0.78,
        shedRate: 0.0,
      },
    },
  },
  {
    id: 'redbud',
    gpuIndex: 1,
    category: 'tree',
    commonName: 'Eastern Redbud',
    shortName: 'Redbud',
    scientificName: 'Cercis canadensis',
    region: 'Understory Native · Shenandoah & Piedmont',
    tagline: 'Sculptural multi-forked limbs bursting with magenta-rose spring blooms and gold fall hearts.',
    accentHex: '#e879a8',
    barkShadow: rgb(46, 40, 42),
    barkLit: rgb(96, 86, 88),
    architecture: {
      kind: 'tree',
      trunkHeight: 0.42,
      trunkBaseRadius: 0.042,
      trunkTopRadius: 0.017,
      trunkTwist: 0.34,
      boughCount: 7,
      boughSpread: 0.82,
      boughHorizontalBias: 0.42,
      weepingDroop: 0.08,
      crownWidth: 0.88,
      crownHeight: 0.62,
      clusterScale: 0.96,
      evergreen: false,
      cauliflorous: true,
      barkTile: 18,
      leafTiles: [6, 7],
      blossomTiles: [12, 13],
      fallingLeafTile: 22,
      fallingPetalTile: 23,
    },
    seasons: {
      springEarly: {
        leafShadow: rgb(88, 118, 48),
        leafLit: rgb(166, 204, 88),
        blossomShadow: rgb(146, 44, 102),
        blossomLit: rgb(236, 126, 182),
        leafScale: 0.08,
        blossomScale: 1.05,
        berryScale: 0.0,
        shedRate: 0.16,
      },
      springPeak: {
        leafShadow: rgb(80, 120, 48),
        leafLit: rgb(158, 198, 88),
        blossomShadow: rgb(156, 54, 112),
        blossomLit: rgb(242, 144, 194),
        leafScale: 0.42,
        blossomScale: 0.98,
        berryScale: 0.0,
        shedRate: 0.55,
      },
      summer: {
        leafShadow: rgb(38, 86, 44),
        leafLit: rgb(104, 166, 76),
        blossomShadow: rgb(156, 54, 112),
        blossomLit: rgb(242, 144, 194),
        leafScale: 1.0,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.05,
      },
      autumnEarly: {
        leafShadow: rgb(138, 110, 26),
        leafLit: rgb(234, 196, 68),
        blossomShadow: rgb(156, 54, 112),
        blossomLit: rgb(242, 144, 194),
        leafScale: 0.92,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.42,
      },
      autumnPeak: {
        leafShadow: rgb(144, 96, 24),
        leafLit: rgb(244, 194, 58),
        blossomShadow: rgb(156, 54, 112),
        blossomLit: rgb(242, 144, 194),
        leafScale: 0.62,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.9,
      },
      winter: {
        leafShadow: rgb(110, 82, 40),
        leafLit: rgb(164, 128, 66),
        blossomShadow: rgb(146, 44, 102),
        blossomLit: rgb(236, 126, 182),
        leafScale: 0.0,
        blossomScale: 0.0,
        berryScale: 0.2,
        shedRate: 0.0,
      },
    },
  },
  {
    id: 'cherry',
    gpuIndex: 2,
    category: 'tree',
    commonName: 'Flowering Cherry',
    shortName: 'Cherry',
    scientificName: 'Prunus × yedoensis',
    region: 'Northern Virginia & Tidal Potomac',
    tagline: 'Arching weeping boughs billowing with blush-pink petals and apricot-copper autumn leaves.',
    accentHex: '#f9b8c8',
    barkShadow: rgb(62, 46, 42),
    barkLit: rgb(124, 92, 82),
    architecture: {
      kind: 'tree',
      trunkHeight: 0.45,
      trunkBaseRadius: 0.052,
      trunkTopRadius: 0.022,
      trunkTwist: 0.18,
      boughCount: 7,
      boughSpread: 0.95,
      boughHorizontalBias: 0.56,
      weepingDroop: 0.34,
      crownWidth: 1.04,
      crownHeight: 0.66,
      clusterScale: 1.08,
      evergreen: false,
      cauliflorous: false,
      barkTile: 18,
      leafTiles: [6, 7],
      blossomTiles: [10, 11],
      fallingLeafTile: 22,
      fallingPetalTile: 23,
    },
    seasons: {
      springEarly: {
        leafShadow: rgb(78, 108, 46),
        leafLit: rgb(154, 192, 86),
        blossomShadow: rgb(218, 152, 174),
        blossomLit: rgb(255, 232, 239),
        leafScale: 0.06,
        blossomScale: 1.15,
        berryScale: 0.0,
        shedRate: 0.35,
      },
      springPeak: {
        leafShadow: rgb(72, 110, 48),
        leafLit: rgb(146, 188, 86),
        blossomShadow: rgb(224, 168, 186),
        blossomLit: rgb(255, 240, 245),
        leafScale: 0.36,
        blossomScale: 1.18,
        berryScale: 0.0,
        shedRate: 1.15,
      },
      summer: {
        leafShadow: rgb(34, 78, 38),
        leafLit: rgb(92, 152, 68),
        blossomShadow: rgb(224, 168, 186),
        blossomLit: rgb(255, 240, 245),
        leafScale: 1.04,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.05,
      },
      autumnEarly: {
        leafShadow: rgb(148, 76, 36),
        leafLit: rgb(232, 146, 72),
        blossomShadow: rgb(224, 168, 186),
        blossomLit: rgb(255, 240, 245),
        leafScale: 0.92,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.5,
      },
      autumnPeak: {
        leafShadow: rgb(132, 54, 34),
        leafLit: rgb(218, 112, 54),
        blossomShadow: rgb(224, 168, 186),
        blossomLit: rgb(255, 240, 245),
        leafScale: 0.58,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.95,
      },
      winter: {
        leafShadow: rgb(110, 62, 40),
        leafLit: rgb(158, 92, 58),
        blossomShadow: rgb(224, 168, 186),
        blossomLit: rgb(255, 240, 245),
        leafScale: 0.0,
        blossomScale: 0.0,
        berryScale: 0.15,
        shedRate: 0.0,
      },
    },
  },
  {
    id: 'white-oak',
    gpuIndex: 3,
    category: 'tree',
    commonName: 'White Oak',
    shortName: 'White Oak',
    scientificName: 'Quercus alba',
    region: 'Piedmont & Blue Ridge Monarch',
    tagline: 'Broad gnarled limbs with deeply lobed sunlit foliage turning wine-russet and bronze.',
    accentHex: '#d98a4e',
    barkShadow: rgb(64, 60, 55),
    barkLit: rgb(138, 132, 122),
    architecture: {
      kind: 'tree',
      trunkHeight: 0.48,
      trunkBaseRadius: 0.072,
      trunkTopRadius: 0.032,
      trunkTwist: 0.14,
      boughCount: 7,
      boughSpread: 1.08,
      boughHorizontalBias: 0.6,
      weepingDroop: 0.06,
      crownWidth: 1.18,
      crownHeight: 0.72,
      clusterScale: 1.12,
      evergreen: false,
      cauliflorous: false,
      barkTile: 17,
      leafTiles: [0, 1],
      blossomTiles: [0, 1],
      fallingLeafTile: 20,
      fallingPetalTile: 20,
    },
    seasons: {
      springEarly: {
        leafShadow: rgb(98, 114, 52),
        leafLit: rgb(186, 198, 102),
        blossomShadow: rgb(98, 114, 52),
        blossomLit: rgb(186, 198, 102),
        leafScale: 0.42,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.03,
      },
      springPeak: {
        leafShadow: rgb(62, 102, 44),
        leafLit: rgb(136, 182, 78),
        blossomShadow: rgb(62, 102, 44),
        blossomLit: rgb(136, 182, 78),
        leafScale: 0.85,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.04,
      },
      summer: {
        leafShadow: rgb(28, 66, 34),
        leafLit: rgb(76, 134, 58),
        blossomShadow: rgb(28, 66, 34),
        blossomLit: rgb(76, 134, 58),
        leafScale: 1.08,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.04,
      },
      autumnEarly: {
        leafShadow: rgb(124, 72, 34),
        leafLit: rgb(212, 144, 74),
        blossomShadow: rgb(124, 72, 34),
        blossomLit: rgb(212, 144, 74),
        leafScale: 1.0,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.32,
      },
      autumnPeak: {
        leafShadow: rgb(104, 46, 28),
        leafLit: rgb(196, 102, 54),
        blossomShadow: rgb(104, 46, 28),
        blossomLit: rgb(196, 102, 54),
        leafScale: 0.82,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.85,
      },
      winter: {
        leafShadow: rgb(76, 54, 38),
        leafLit: rgb(124, 92, 62),
        blossomShadow: rgb(76, 54, 38),
        blossomLit: rgb(124, 92, 62),
        leafScale: 0.14,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.06,
      },
    },
  },
  {
    id: 'red-maple',
    gpuIndex: 4,
    category: 'tree',
    commonName: 'Red Maple',
    shortName: 'Red Maple',
    scientificName: 'Acer rubrum',
    region: 'Blue Ridge Hollows & Swamps',
    tagline: 'Graceful rounded canopy erupting into Virginia’s signature fiery scarlet-crimson blaze.',
    accentHex: '#ef4444',
    barkShadow: rgb(62, 62, 64),
    barkLit: rgb(132, 132, 134),
    architecture: {
      kind: 'tree',
      trunkHeight: 0.48,
      trunkBaseRadius: 0.056,
      trunkTopRadius: 0.022,
      trunkTwist: 0.12,
      boughCount: 7,
      boughSpread: 0.88,
      boughHorizontalBias: 0.34,
      weepingDroop: 0.04,
      crownWidth: 0.98,
      crownHeight: 0.78,
      clusterScale: 1.04,
      evergreen: false,
      cauliflorous: false,
      barkTile: 18,
      leafTiles: [2, 3],
      blossomTiles: [16, 16],
      fallingLeafTile: 21,
      fallingPetalTile: 21,
    },
    seasons: {
      springEarly: {
        leafShadow: rgb(124, 48, 46),
        leafLit: rgb(206, 114, 78),
        blossomShadow: rgb(146, 36, 42),
        blossomLit: rgb(224, 76, 72),
        leafScale: 0.28,
        blossomScale: 0.55,
        berryScale: 0.3,
        shedRate: 0.08,
      },
      springPeak: {
        leafShadow: rgb(58, 102, 42),
        leafLit: rgb(138, 190, 74),
        blossomShadow: rgb(146, 36, 42),
        blossomLit: rgb(224, 76, 72),
        leafScale: 0.84,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.06,
      },
      summer: {
        leafShadow: rgb(32, 78, 38),
        leafLit: rgb(88, 150, 66),
        blossomShadow: rgb(146, 36, 42),
        blossomLit: rgb(224, 76, 72),
        leafScale: 1.06,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.05,
      },
      autumnEarly: {
        leafShadow: rgb(146, 44, 24),
        leafLit: rgb(236, 112, 46),
        blossomShadow: rgb(146, 36, 42),
        blossomLit: rgb(224, 76, 72),
        leafScale: 0.98,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.45,
      },
      autumnPeak: {
        leafShadow: rgb(128, 18, 22),
        leafLit: rgb(228, 48, 42),
        blossomShadow: rgb(146, 36, 42),
        blossomLit: rgb(224, 76, 72),
        leafScale: 0.72,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 1.05,
      },
      winter: {
        leafShadow: rgb(98, 42, 32),
        leafLit: rgb(148, 66, 48),
        blossomShadow: rgb(146, 36, 42),
        blossomLit: rgb(224, 76, 72),
        leafScale: 0.0,
        blossomScale: 0.0,
        berryScale: 0.25,
        shedRate: 0.0,
      },
    },
  },
  {
    id: 'pine',
    gpuIndex: 5,
    category: 'tree',
    commonName: 'Eastern White Pine',
    shortName: 'White Pine',
    scientificName: 'Pinus strobus',
    region: 'Blue Ridge & Alleghany Highlands',
    tagline: 'Tall russet-plated evergreen with soft layered needle whorls swaying through winter snows.',
    accentHex: '#4ade80',
    barkShadow: rgb(58, 40, 34),
    barkLit: rgb(122, 82, 66),
    architecture: {
      kind: 'tree',
      trunkHeight: 0.88,
      trunkBaseRadius: 0.054,
      trunkTopRadius: 0.012,
      trunkTwist: 0.06,
      boughCount: 11,
      boughSpread: 0.78,
      boughHorizontalBias: 0.88,
      weepingDroop: 0.12,
      crownWidth: 0.82,
      crownHeight: 0.88,
      clusterScale: 1.0,
      evergreen: true,
      cauliflorous: false,
      barkTile: 19,
      leafTiles: [14, 15],
      blossomTiles: [14, 15],
      fallingLeafTile: 24,
      fallingPetalTile: 24,
    },
    seasons: {
      springEarly: {
        leafShadow: rgb(24, 62, 42),
        leafLit: rgb(74, 134, 78),
        blossomShadow: rgb(24, 62, 42),
        blossomLit: rgb(74, 134, 78),
        leafScale: 0.98,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.04,
      },
      springPeak: {
        leafShadow: rgb(24, 64, 42),
        leafLit: rgb(84, 146, 82),
        blossomShadow: rgb(24, 64, 42),
        blossomLit: rgb(84, 146, 82),
        leafScale: 1.02,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.05,
      },
      summer: {
        leafShadow: rgb(20, 56, 38),
        leafLit: rgb(62, 118, 70),
        blossomShadow: rgb(20, 56, 38),
        blossomLit: rgb(62, 118, 70),
        leafScale: 1.04,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.04,
      },
      autumnEarly: {
        leafShadow: rgb(22, 54, 38),
        leafLit: rgb(66, 114, 68),
        blossomShadow: rgb(22, 54, 38),
        blossomLit: rgb(66, 114, 68),
        leafScale: 1.0,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.14,
      },
      autumnPeak: {
        leafShadow: rgb(22, 52, 40),
        leafLit: rgb(62, 108, 68),
        blossomShadow: rgb(22, 52, 40),
        blossomLit: rgb(62, 108, 68),
        leafScale: 0.98,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.18,
      },
      winter: {
        leafShadow: rgb(18, 46, 40),
        leafLit: rgb(54, 96, 72),
        blossomShadow: rgb(18, 46, 40),
        blossomLit: rgb(54, 96, 72),
        leafScale: 0.96,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.05,
      },
    },
  },
  // Space Accents (Understory & Garden Architecture)
  {
    id: 'azalea',
    gpuIndex: 6,
    category: 'accent',
    commonName: 'Mountain Laurel Shrub',
    shortName: 'Shrub',
    scientificName: 'Kalmia latifolia',
    region: 'Appalachian Understory',
    tagline: 'Dense mounded woodland hedge with sunlit olive-lime leaves and soft spring clusters.',
    accentHex: '#84cc16',
    barkShadow: rgb(54, 42, 34),
    barkLit: rgb(98, 78, 62),
    architecture: {
      kind: 'shrub',
      trunkHeight: 0.12,
      trunkBaseRadius: 0.024,
      trunkTopRadius: 0.012,
      trunkTwist: 0.2,
      boughCount: 6,
      boughSpread: 0.42,
      boughHorizontalBias: 0.8,
      weepingDroop: 0.05,
      crownWidth: 0.56,
      crownHeight: 0.34,
      clusterScale: 0.86,
      evergreen: true,
      cauliflorous: false,
      barkTile: 18,
      leafTiles: [4, 5],
      blossomTiles: [8, 9],
      fallingLeafTile: 22,
      fallingPetalTile: 23,
    },
    seasons: {
      springEarly: {
        leafShadow: rgb(42, 86, 36),
        leafLit: rgb(124, 178, 68),
        blossomShadow: rgb(228, 178, 198),
        blossomLit: rgb(255, 240, 246),
        leafScale: 0.98,
        blossomScale: 0.48,
        berryScale: 0.0,
        shedRate: 0.04,
      },
      springPeak: {
        leafShadow: rgb(38, 84, 34),
        leafLit: rgb(122, 180, 68),
        blossomShadow: rgb(232, 180, 200),
        blossomLit: rgb(255, 244, 248),
        leafScale: 1.02,
        blossomScale: 0.72,
        berryScale: 0.0,
        shedRate: 0.08,
      },
      summer: {
        leafShadow: rgb(32, 74, 32),
        leafLit: rgb(104, 162, 62),
        blossomShadow: rgb(232, 180, 200),
        blossomLit: rgb(255, 244, 248),
        leafScale: 1.05,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.02,
      },
      autumnEarly: {
        leafShadow: rgb(44, 72, 34),
        leafLit: rgb(118, 148, 58),
        blossomShadow: rgb(232, 180, 200),
        blossomLit: rgb(255, 244, 248),
        leafScale: 1.0,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.04,
      },
      autumnPeak: {
        leafShadow: rgb(48, 64, 34),
        leafLit: rgb(112, 134, 58),
        blossomShadow: rgb(232, 180, 200),
        blossomLit: rgb(255, 244, 248),
        leafScale: 0.96,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.06,
      },
      winter: {
        leafShadow: rgb(32, 58, 38),
        leafLit: rgb(74, 108, 66),
        blossomShadow: rgb(232, 180, 200),
        blossomLit: rgb(255, 244, 248),
        leafScale: 0.92,
        blossomScale: 0.0,
        berryScale: 0.0,
        shedRate: 0.0,
      },
    },
  },
  {
    id: 'stone',
    gpuIndex: 7,
    category: 'accent',
    commonName: 'Blue Ridge Boulder',
    shortName: 'Moss Stone',
    scientificName: 'Granitic Gneiss',
    region: 'Shenandoah Outcrop',
    tagline: 'Stacked pixel-art weathered granite stone with soft woodland moss along its shoulders.',
    accentHex: '#a8a29e',
    barkShadow: rgb(76, 78, 76),
    barkLit: rgb(156, 158, 152),
    architecture: {
      kind: 'stone',
      trunkHeight: 0.16,
      trunkBaseRadius: 0.14,
      trunkTopRadius: 0.05,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.34,
      crownHeight: 0.18,
      clusterScale: 1.0,
      evergreen: true,
      cauliflorous: false,
      barkTile: 32,
      leafTiles: [32, 32],
      blossomTiles: [32, 32],
      fallingLeafTile: 22,
      fallingPetalTile: 23,
    },
    seasons: {
      springEarly: NEUTRAL_SEASON,
      springPeak: NEUTRAL_SEASON,
      summer: NEUTRAL_SEASON,
      autumnEarly: NEUTRAL_SEASON,
      autumnPeak: NEUTRAL_SEASON,
      winter: NEUTRAL_SEASON,
    },
  },
  {
    id: 'lantern',
    gpuIndex: 8,
    category: 'accent',
    commonName: 'Cedar Path Lantern',
    shortName: 'Lantern',
    scientificName: 'Garden Waymarker',
    region: 'Sanctuary Trail',
    tagline: 'Stacked timber post lantern casting a warm golden pixel flame as twilight settles in.',
    accentHex: '#fbbf24',
    barkShadow: rgb(66, 46, 36),
    barkLit: rgb(138, 98, 72),
    architecture: {
      kind: 'lantern',
      trunkHeight: 0.28,
      trunkBaseRadius: 0.032,
      trunkTopRadius: 0.028,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.18,
      crownHeight: 0.3,
      clusterScale: 1.0,
      evergreen: true,
      cauliflorous: false,
      barkTile: 33,
      leafTiles: [34, 34],
      blossomTiles: [34, 34],
      fallingLeafTile: 22,
      fallingPetalTile: 23,
    },
    seasons: {
      springEarly: NEUTRAL_SEASON,
      springPeak: NEUTRAL_SEASON,
      summer: NEUTRAL_SEASON,
      autumnEarly: NEUTRAL_SEASON,
      autumnPeak: NEUTRAL_SEASON,
      winter: NEUTRAL_SEASON,
    },
  },
  // ── 9: Woodland Fern Drift ────────────────────────────────────────────
  {
    id: 'fern',
    gpuIndex: 9,
    category: 'accent',
    bimLayer: 'understory',
    commonName: 'Woodland Fern Drift',
    shortName: 'Fern',
    scientificName: 'Polystichum acrostichoides',
    region: 'Shade Understory · Virginia Piedmont',
    tagline: 'Arching emerald Christmas fern fronds softening stone edges and tree roots.',
    accentHex: '#4ade80',
    barkShadow: rgb(32, 66, 36),
    barkLit: rgb(62, 114, 56),
    architecture: {
      kind: 'fern',
      trunkHeight: 0.08,
      trunkBaseRadius: 0.05,
      trunkTopRadius: 0.05,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.28,
      crownHeight: 0.14,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 44,
      leafTiles: [44, 44],
      blossomTiles: [44, 44],
      fallingLeafTile: 20,
      fallingPetalTile: 20,
    },
    seasons: {
      springEarly: { ...NEUTRAL_SEASON, leafShadow: rgb(34, 82, 40), leafLit: rgb(118, 188, 86), leafScale: 0.9 },
      springPeak: { ...NEUTRAL_SEASON, leafShadow: rgb(30, 86, 40), leafLit: rgb(104, 184, 78), leafScale: 1.0 },
      summer: { ...NEUTRAL_SEASON, leafShadow: rgb(24, 72, 36), leafLit: rgb(78, 152, 62), leafScale: 1.05 },
      autumnEarly: { ...NEUTRAL_SEASON, leafShadow: rgb(42, 74, 34), leafLit: rgb(124, 146, 58), leafScale: 0.96 },
      autumnPeak: { ...NEUTRAL_SEASON, leafShadow: rgb(56, 72, 36), leafLit: rgb(138, 134, 62), leafScale: 0.88 },
      winter: { ...NEUTRAL_SEASON, leafShadow: rgb(34, 58, 42), leafLit: rgb(72, 104, 74), leafScale: 0.72 },
    },
  },
  // ── 10: Blue Ridge Wildflowers ────────────────────────────────────────
  {
    id: 'wildflower',
    gpuIndex: 10,
    category: 'accent',
    bimLayer: 'understory',
    commonName: 'Blue Ridge Wildflowers',
    shortName: 'Wildflowers',
    scientificName: 'Rudbeckia & Symphyotrichum',
    region: 'Meadow Pollinator Border',
    tagline: 'Sun-loving native coneflowers, golden black-eyed susans, and autumn asters.',
    accentHex: '#facc15',
    barkShadow: rgb(44, 76, 38),
    barkLit: rgb(88, 134, 58),
    architecture: {
      kind: 'wildflower',
      trunkHeight: 0.12,
      trunkBaseRadius: 0.05,
      trunkTopRadius: 0.05,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.3,
      crownHeight: 0.16,
      clusterScale: 1,
      evergreen: false,
      cauliflorous: false,
      barkTile: 25,
      leafTiles: [25, 26],
      blossomTiles: [45, 45],
      fallingLeafTile: 23,
      fallingPetalTile: 23,
    },
    seasons: {
      springEarly: { ...NEUTRAL_SEASON, leafShadow: rgb(44, 92, 46), leafLit: rgb(108, 168, 74), blossomShadow: rgb(188, 114, 198), blossomLit: rgb(246, 188, 250), leafScale: 0.85, blossomScale: 0.78 },
      springPeak: { ...NEUTRAL_SEASON, leafShadow: rgb(40, 94, 44), leafLit: rgb(104, 170, 74), blossomShadow: rgb(214, 118, 168), blossomLit: rgb(255, 198, 224), leafScale: 1.0, blossomScale: 1.05 },
      summer: { ...NEUTRAL_SEASON, leafShadow: rgb(36, 86, 40), leafLit: rgb(92, 152, 62), blossomShadow: rgb(212, 146, 24), blossomLit: rgb(255, 224, 76), leafScale: 1.05, blossomScale: 1.1 },
      autumnEarly: { ...NEUTRAL_SEASON, leafShadow: rgb(62, 82, 38), leafLit: rgb(134, 138, 62), blossomShadow: rgb(132, 108, 212), blossomLit: rgb(198, 184, 255), leafScale: 0.92, blossomScale: 0.92 },
      autumnPeak: { ...NEUTRAL_SEASON, leafShadow: rgb(88, 72, 42), leafLit: rgb(156, 124, 68), blossomShadow: rgb(158, 116, 178), blossomLit: rgb(214, 186, 228), leafScale: 0.75, blossomScale: 0.45 },
      winter: { ...NEUTRAL_SEASON, leafShadow: rgb(84, 74, 58), leafLit: rgb(128, 116, 94), blossomShadow: rgb(128, 116, 94), blossomLit: rgb(156, 144, 122), leafScale: 0.45, blossomScale: 0.0 },
    },
  },
  // ── 11: Ornamental Switchgrass ────────────────────────────────────────
  {
    id: 'switchgrass',
    gpuIndex: 11,
    category: 'accent',
    bimLayer: 'understory',
    commonName: 'Shenandoah Switchgrass',
    shortName: 'Switchgrass',
    scientificName: 'Panicum virgatum',
    region: 'Native Ornamental Grass',
    tagline: 'Graceful swaying blue-green plumes turning warm coppery wheat in autumn.',
    accentHex: '#d9b978',
    barkShadow: rgb(62, 92, 68),
    barkLit: rgb(124, 162, 118),
    architecture: {
      kind: 'switchgrass',
      trunkHeight: 0.18,
      trunkBaseRadius: 0.06,
      trunkTopRadius: 0.06,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.28,
      crownHeight: 0.24,
      clusterScale: 1,
      evergreen: false,
      cauliflorous: false,
      barkTile: 26,
      leafTiles: [25, 26],
      blossomTiles: [26, 26],
      fallingLeafTile: 24,
      fallingPetalTile: 24,
    },
    seasons: {
      springEarly: { ...NEUTRAL_SEASON, leafShadow: rgb(56, 102, 72), leafLit: rgb(122, 178, 126), leafScale: 0.85 },
      springPeak: { ...NEUTRAL_SEASON, leafShadow: rgb(48, 98, 76), leafLit: rgb(110, 172, 134), leafScale: 1.0 },
      summer: { ...NEUTRAL_SEASON, leafShadow: rgb(46, 92, 74), leafLit: rgb(118, 168, 122), leafScale: 1.08 },
      autumnEarly: { ...NEUTRAL_SEASON, leafShadow: rgb(138, 78, 42), leafLit: rgb(218, 152, 78), leafScale: 1.05 },
      autumnPeak: { ...NEUTRAL_SEASON, leafShadow: rgb(146, 104, 52), leafLit: rgb(228, 186, 104), leafScale: 1.0 },
      winter: { ...NEUTRAL_SEASON, leafShadow: rgb(122, 104, 78), leafLit: rgb(186, 166, 132), leafScale: 0.88 },
    },
  },
  // ── 12: Cedar Raised Garden Bed ───────────────────────────────────────
  {
    id: 'raised-bed',
    gpuIndex: 12,
    category: 'accent',
    bimLayer: 'understory',
    commonName: 'Cedar Raised Garden Bed',
    shortName: 'Raised Bed',
    scientificName: '4 × 8 ft Kitchen Planter',
    region: 'Edible & Herb Gardening',
    tagline: 'Stacked aromatic red cedar planter filled with rich loam, herbs, and seasonal greens.',
    accentHex: '#b4784a',
    barkShadow: rgb(88, 56, 38),
    barkLit: rgb(168, 116, 76),
    architecture: {
      kind: 'raised-bed',
      trunkHeight: 0.14,
      trunkBaseRadius: 0.2,
      trunkTopRadius: 0.2,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.56,
      crownHeight: 0.16,
      clusterScale: 1,
      evergreen: false,
      cauliflorous: false,
      barkTile: 46,
      leafTiles: [4, 44],
      blossomTiles: [45, 45],
      fallingLeafTile: 20,
      fallingPetalTile: 23,
    },
    seasons: {
      springEarly: { ...NEUTRAL_SEASON, leafShadow: rgb(48, 102, 46), leafLit: rgb(124, 192, 86), blossomShadow: rgb(210, 128, 152), blossomLit: rgb(252, 196, 212), leafScale: 0.78, blossomScale: 0.45 },
      springPeak: { ...NEUTRAL_SEASON, leafShadow: rgb(42, 98, 42), leafLit: rgb(114, 188, 78), blossomShadow: rgb(216, 126, 158), blossomLit: rgb(255, 198, 218), leafScale: 0.96, blossomScale: 0.85 },
      summer: { ...NEUTRAL_SEASON, leafShadow: rgb(32, 88, 38), leafLit: rgb(96, 168, 66), blossomShadow: rgb(214, 82, 54), blossomLit: rgb(255, 152, 96), leafScale: 1.05, blossomScale: 0.9 },
      autumnEarly: { ...NEUTRAL_SEASON, leafShadow: rgb(56, 86, 38), leafLit: rgb(138, 154, 68), blossomShadow: rgb(218, 134, 42), blossomLit: rgb(255, 196, 92), leafScale: 0.85, blossomScale: 0.55 },
      autumnPeak: { ...NEUTRAL_SEASON, leafShadow: rgb(74, 72, 44), leafLit: rgb(142, 124, 72), blossomShadow: rgb(176, 114, 52), blossomLit: rgb(224, 168, 92), leafScale: 0.55, blossomScale: 0.2 },
      winter: { ...NEUTRAL_SEASON, leafShadow: rgb(62, 52, 44), leafLit: rgb(98, 86, 74), blossomShadow: rgb(110, 102, 94), blossomLit: rgb(142, 136, 128), leafScale: 0.12, blossomScale: 0.0 },
    },
  },
  // ── 13: Reflecting Lily Pond ──────────────────────────────────────────
  {
    id: 'pond',
    gpuIndex: 13,
    category: 'accent',
    bimLayer: 'water-stone',
    commonName: 'Reflecting Lily Pond',
    shortName: 'Lily Pond',
    scientificName: 'Fieldstone Water Basin',
    region: 'Water Feature · ~52 sq ft',
    tagline: 'Stacked Blue Ridge stone rim cradling luminous rippled water, lily pads, and lotus blooms.',
    accentHex: '#38bdf8',
    barkShadow: rgb(74, 82, 88),
    barkLit: rgb(144, 152, 158),
    architecture: {
      kind: 'pond',
      trunkHeight: 0.06,
      trunkBaseRadius: 0.42,
      trunkTopRadius: 0.42,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.88,
      crownHeight: 0.08,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 32,
      leafTiles: [39, 40],
      blossomTiles: [11, 12],
      fallingLeafTile: 23,
      fallingPetalTile: 23,
    },
    seasons: {
      springEarly: { ...NEUTRAL_SEASON, leafShadow: rgb(32, 114, 152), leafLit: rgb(112, 206, 238), blossomShadow: rgb(222, 134, 164), blossomLit: rgb(255, 214, 228), leafScale: 1.0, blossomScale: 0.72 },
      springPeak: { ...NEUTRAL_SEASON, leafShadow: rgb(28, 118, 158), leafLit: rgb(116, 214, 244), blossomShadow: rgb(232, 132, 168), blossomLit: rgb(255, 220, 234), leafScale: 1.0, blossomScale: 0.95 },
      summer: { ...NEUTRAL_SEASON, leafShadow: rgb(22, 108, 148), leafLit: rgb(98, 202, 234), blossomShadow: rgb(236, 134, 174), blossomLit: rgb(255, 224, 238), leafScale: 1.0, blossomScale: 1.05 },
      autumnEarly: { ...NEUTRAL_SEASON, leafShadow: rgb(34, 102, 136), leafLit: rgb(118, 184, 212), blossomShadow: rgb(206, 138, 148), blossomLit: rgb(242, 198, 204), leafScale: 1.0, blossomScale: 0.45 },
      autumnPeak: { ...NEUTRAL_SEASON, leafShadow: rgb(42, 92, 122), leafLit: rgb(124, 170, 198), blossomShadow: rgb(184, 142, 138), blossomLit: rgb(222, 192, 188), leafScale: 1.0, blossomScale: 0.15 },
      winter: { ...NEUTRAL_SEASON, leafShadow: rgb(126, 164, 194), leafLit: rgb(214, 234, 248), blossomShadow: rgb(180, 204, 222), blossomLit: rgb(228, 242, 252), leafScale: 1.0, blossomScale: 0.0 },
    },
  },
  // ── 14: Carved Stone Water Basin (Birdbath / Tsukubai) ───────────────
  {
    id: 'water-basin',
    gpuIndex: 14,
    category: 'accent',
    bimLayer: 'water-stone',
    commonName: 'Stone Water Basin',
    shortName: 'Water Basin',
    scientificName: 'Carved Granite Birdbath',
    region: 'Water Accent · Courtyard',
    tagline: 'Hand-carved stacked granite pedestal holding a tranquil mirror of rainwater.',
    accentHex: '#7dd3fc',
    barkShadow: rgb(88, 92, 94),
    barkLit: rgb(166, 170, 172),
    architecture: {
      kind: 'water-basin',
      trunkHeight: 0.22,
      trunkBaseRadius: 0.08,
      trunkTopRadius: 0.14,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.3,
      crownHeight: 0.24,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 32,
      leafTiles: [39, 39],
      blossomTiles: [39, 39],
      fallingLeafTile: 23,
      fallingPetalTile: 23,
    },
    seasons: {
      springEarly: { ...NEUTRAL_SEASON, leafShadow: rgb(52, 138, 182), leafLit: rgb(156, 224, 250), leafScale: 1.0 },
      springPeak: { ...NEUTRAL_SEASON, leafShadow: rgb(46, 142, 188), leafLit: rgb(158, 228, 252), leafScale: 1.0 },
      summer: { ...NEUTRAL_SEASON, leafShadow: rgb(40, 134, 178), leafLit: rgb(146, 220, 248), leafScale: 1.0 },
      autumnEarly: { ...NEUTRAL_SEASON, leafShadow: rgb(56, 128, 166), leafLit: rgb(162, 212, 236), leafScale: 1.0 },
      autumnPeak: { ...NEUTRAL_SEASON, leafShadow: rgb(62, 118, 152), leafLit: rgb(164, 202, 224), leafScale: 1.0 },
      winter: { ...NEUTRAL_SEASON, leafShadow: rgb(148, 182, 208), leafLit: rgb(224, 240, 252), leafScale: 1.0 },
    },
  },
  // ── 15: Stepping Stone Pad ────────────────────────────────────────────
  {
    id: 'stepping-stone',
    gpuIndex: 15,
    category: 'accent',
    bimLayer: 'water-stone',
    commonName: 'Stepping Stone Pad',
    shortName: 'Step Stone',
    scientificName: 'Pennsylvania Bluestone Slab',
    region: 'Garden Trail Hardscape',
    tagline: 'Single sculpted flat bluestone slab for crossing lawns or reflecting pond margins.',
    accentHex: '#94a3b8',
    barkShadow: rgb(92, 98, 106),
    barkLit: rgb(172, 178, 184),
    architecture: {
      kind: 'stepping-stone',
      trunkHeight: 0.02,
      trunkBaseRadius: 0.14,
      trunkTopRadius: 0.14,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.28,
      crownHeight: 0.03,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 37,
      leafTiles: [37, 37],
      blossomTiles: [37, 37],
      fallingLeafTile: 20,
      fallingPetalTile: 20,
    },
    seasons: {
      springEarly: NEUTRAL_SEASON,
      springPeak: NEUTRAL_SEASON,
      summer: NEUTRAL_SEASON,
      autumnEarly: NEUTRAL_SEASON,
      autumnPeak: NEUTRAL_SEASON,
      winter: NEUTRAL_SEASON,
    },
  },
  // ── 16: Cedar Garden Bench ────────────────────────────────────────────
  {
    id: 'bench',
    gpuIndex: 16,
    category: 'accent',
    bimLayer: 'structures',
    commonName: 'Cedar Garden Bench',
    shortName: 'Bench',
    scientificName: '5 ft Slatted Timber Seat',
    region: 'Courtyard Seating',
    tagline: 'Rotatable mortise-and-tenon cedar bench inviting quiet contemplation beneath the canopy.',
    accentHex: '#d99a64',
    barkShadow: rgb(96, 62, 42),
    barkLit: rgb(186, 132, 86),
    architecture: {
      kind: 'bench',
      trunkHeight: 0.18,
      trunkBaseRadius: 0.1,
      trunkTopRadius: 0.1,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.5,
      crownHeight: 0.22,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 41,
      leafTiles: [41, 41],
      blossomTiles: [41, 41],
      fallingLeafTile: 20,
      fallingPetalTile: 20,
    },
    seasons: {
      springEarly: NEUTRAL_SEASON,
      springPeak: NEUTRAL_SEASON,
      summer: NEUTRAL_SEASON,
      autumnEarly: NEUTRAL_SEASON,
      autumnPeak: NEUTRAL_SEASON,
      winter: NEUTRAL_SEASON,
    },
  },
  // ── 17: Timber Pergola Arbor ──────────────────────────────────────────
  {
    id: 'pergola',
    gpuIndex: 17,
    category: 'accent',
    bimLayer: 'structures',
    commonName: 'Timber Pergola Arbor',
    shortName: 'Pergola',
    scientificName: '10 × 10 ft Cedar Shade Trellis',
    region: 'Architectural Overhead Structure',
    tagline: 'Four-post cedar pergola with overhead rafters draped in blooming wisteria and vines.',
    accentHex: '#c98a56',
    barkShadow: rgb(82, 52, 34),
    barkLit: rgb(164, 112, 74),
    architecture: {
      kind: 'pergola',
      trunkHeight: 0.68,
      trunkBaseRadius: 0.04,
      trunkTopRadius: 0.04,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.92,
      crownHeight: 0.72,
      clusterScale: 1,
      evergreen: false,
      cauliflorous: false,
      barkTile: 41,
      leafTiles: [4, 5],
      blossomTiles: [11, 12],
      fallingLeafTile: 22,
      fallingPetalTile: 23,
    },
    seasons: {
      springEarly: { ...NEUTRAL_SEASON, leafShadow: rgb(46, 98, 46), leafLit: rgb(118, 184, 82), blossomShadow: rgb(168, 124, 214), blossomLit: rgb(232, 206, 255), leafScale: 0.75, blossomScale: 0.82 },
      springPeak: { ...NEUTRAL_SEASON, leafShadow: rgb(42, 96, 44), leafLit: rgb(112, 182, 78), blossomShadow: rgb(162, 114, 218), blossomLit: rgb(236, 212, 255), leafScale: 0.92, blossomScale: 1.05 },
      summer: { ...NEUTRAL_SEASON, leafShadow: rgb(30, 84, 38), leafLit: rgb(88, 158, 66), blossomShadow: rgb(184, 152, 218), blossomLit: rgb(230, 214, 248), leafScale: 1.0, blossomScale: 0.28 },
      autumnEarly: { ...NEUTRAL_SEASON, leafShadow: rgb(124, 92, 36), leafLit: rgb(212, 168, 72), blossomShadow: rgb(180, 140, 88), blossomLit: rgb(224, 192, 124), leafScale: 0.82, blossomScale: 0.0 },
      autumnPeak: { ...NEUTRAL_SEASON, leafShadow: rgb(138, 66, 32), leafLit: rgb(218, 126, 62), blossomShadow: rgb(160, 100, 62), blossomLit: rgb(206, 150, 96), leafScale: 0.45, blossomScale: 0.0 },
      winter: { ...NEUTRAL_SEASON, leafShadow: rgb(72, 62, 54), leafLit: rgb(112, 98, 86), blossomShadow: rgb(112, 98, 86), blossomLit: rgb(132, 118, 106), leafScale: 0.0, blossomScale: 0.0 },
    },
  },
  // ── 18: Dry-Stack Low Stone Wall ──────────────────────────────────────
  {
    id: 'stone-wall',
    gpuIndex: 18,
    category: 'accent',
    bimLayer: 'structures',
    commonName: 'Dry-Stack Stone Wall',
    shortName: 'Stone Wall',
    scientificName: '8 ft Virginia Fieldstone Run',
    region: 'Masonry Seat Wall & Terrace',
    tagline: 'Hand-fitted courses of Piedmont fieldstone with flat coping—rotatable to frame rooms.',
    accentHex: '#a8a29e',
    barkShadow: rgb(82, 84, 86),
    barkLit: rgb(164, 162, 156),
    architecture: {
      kind: 'stone-wall',
      trunkHeight: 0.2,
      trunkBaseRadius: 0.1,
      trunkTopRadius: 0.1,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.8,
      crownHeight: 0.22,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 42,
      leafTiles: [4, 4],
      blossomTiles: [4, 4],
      fallingLeafTile: 20,
      fallingPetalTile: 20,
    },
    seasons: {
      springEarly: NEUTRAL_SEASON,
      springPeak: NEUTRAL_SEASON,
      summer: NEUTRAL_SEASON,
      autumnEarly: NEUTRAL_SEASON,
      autumnPeak: NEUTRAL_SEASON,
      winter: NEUTRAL_SEASON,
    },
  },
  // ── 19: Split-Rail Cedar Fence ────────────────────────────────────────
  {
    id: 'fence',
    gpuIndex: 19,
    category: 'accent',
    bimLayer: 'structures',
    commonName: 'Split-Rail Cedar Fence',
    shortName: 'Cedar Fence',
    scientificName: '8 ft Blue Ridge Pasture Rail',
    region: 'Boundary & Meadow Enclosure',
    tagline: 'Classic Virginia two-rail weathered cedar fencing for defining garden boundaries.',
    accentHex: '#a38970',
    barkShadow: rgb(88, 74, 62),
    barkLit: rgb(156, 138, 118),
    architecture: {
      kind: 'fence',
      trunkHeight: 0.28,
      trunkBaseRadius: 0.04,
      trunkTopRadius: 0.04,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.82,
      crownHeight: 0.28,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 43,
      leafTiles: [43, 43],
      blossomTiles: [43, 43],
      fallingLeafTile: 20,
      fallingPetalTile: 20,
    },
    seasons: {
      springEarly: NEUTRAL_SEASON,
      springPeak: NEUTRAL_SEASON,
      summer: NEUTRAL_SEASON,
      autumnEarly: NEUTRAL_SEASON,
      autumnPeak: NEUTRAL_SEASON,
      winter: NEUTRAL_SEASON,
    },
  },
  // ── 20: Glass & Cedar Garden Pavilion ─────────────────────────────────
  {
    id: 'pavilion',
    gpuIndex: 20,
    category: 'accent',
    bimLayer: 'structures',
    commonName: 'Glass Tea Pavilion',
    shortName: 'Pavilion',
    scientificName: '12 × 12 ft Conservatory Studio',
    region: 'Architectural Focal Structure',
    tagline: 'Raised cedar deck with slender columns, luminous lattice glass roof, and warm hearth light.',
    accentHex: '#bae6fd',
    barkShadow: rgb(74, 52, 38),
    barkLit: rgb(152, 108, 76),
    architecture: {
      kind: 'pavilion',
      trunkHeight: 0.78,
      trunkBaseRadius: 0.04,
      trunkTopRadius: 0.04,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 1.12,
      crownHeight: 0.86,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 41,
      leafTiles: [47, 47],
      blossomTiles: [34, 34],
      fallingLeafTile: 20,
      fallingPetalTile: 20,
    },
    seasons: {
      springEarly: { ...NEUTRAL_SEASON, leafShadow: rgb(154, 192, 212), leafLit: rgb(228, 246, 255), leafScale: 1.0 },
      springPeak: { ...NEUTRAL_SEASON, leafShadow: rgb(154, 196, 216), leafLit: rgb(232, 248, 255), leafScale: 1.0 },
      summer: { ...NEUTRAL_SEASON, leafShadow: rgb(146, 192, 214), leafLit: rgb(224, 246, 255), leafScale: 1.0 },
      autumnEarly: { ...NEUTRAL_SEASON, leafShadow: rgb(172, 190, 204), leafLit: rgb(242, 242, 236), leafScale: 1.0 },
      autumnPeak: { ...NEUTRAL_SEASON, leafShadow: rgb(176, 186, 200), leafLit: rgb(244, 238, 228), leafScale: 1.0 },
      winter: { ...NEUTRAL_SEASON, leafShadow: rgb(164, 196, 222), leafLit: rgb(236, 248, 255), leafScale: 1.0 },
    },
  },
  // ── 21: Low Path Bollard Light ────────────────────────────────────────
  {
    id: 'bollard',
    gpuIndex: 21,
    category: 'accent',
    bimLayer: 'paths-lighting',
    commonName: 'Low Path Bollard Light',
    shortName: 'Bollard',
    scientificName: 'Architectural Bronze Luminaire',
    region: 'Pathway Illumination',
    tagline: 'Minimal low-glare architectural bollard casting warm amber light along stone walks.',
    accentHex: '#fcd34d',
    barkShadow: rgb(46, 44, 42),
    barkLit: rgb(98, 92, 84),
    architecture: {
      kind: 'bollard',
      trunkHeight: 0.16,
      trunkBaseRadius: 0.024,
      trunkTopRadius: 0.024,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.12,
      crownHeight: 0.18,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 33,
      leafTiles: [34, 34],
      blossomTiles: [34, 34],
      fallingLeafTile: 20,
      fallingPetalTile: 20,
    },
    seasons: {
      springEarly: NEUTRAL_SEASON,
      springPeak: NEUTRAL_SEASON,
      summer: NEUTRAL_SEASON,
      autumnEarly: NEUTRAL_SEASON,
      autumnPeak: NEUTRAL_SEASON,
      winter: NEUTRAL_SEASON,
    },
  },
  // ── 22: Stone Hearth Fire Pit ─────────────────────────────────────────
  {
    id: 'fire-pit',
    gpuIndex: 22,
    category: 'accent',
    bimLayer: 'paths-lighting',
    commonName: 'Stone Hearth Fire Pit',
    shortName: 'Fire Pit',
    scientificName: '4 ft Circular Fieldstone Ring',
    region: 'Gathering Focal Point',
    tagline: 'Circular stacked fieldstone ring with glowing golden embers warming evening courtyards.',
    accentHex: '#fb923c',
    barkShadow: rgb(74, 72, 70),
    barkLit: rgb(146, 142, 136),
    architecture: {
      kind: 'fire-pit',
      trunkHeight: 0.12,
      trunkBaseRadius: 0.18,
      trunkTopRadius: 0.18,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.42,
      crownHeight: 0.16,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 32,
      leafTiles: [34, 34],
      blossomTiles: [34, 34],
      fallingLeafTile: 20,
      fallingPetalTile: 20,
    },
    seasons: {
      springEarly: NEUTRAL_SEASON,
      springPeak: NEUTRAL_SEASON,
      summer: NEUTRAL_SEASON,
      autumnEarly: NEUTRAL_SEASON,
      autumnPeak: NEUTRAL_SEASON,
      winter: NEUTRAL_SEASON,
    },
  },
  // ── 23: Cedar Timber Deck Module ──────────────────────────────────────
  {
    id: 'deck-tile',
    gpuIndex: 23,
    category: 'accent',
    bimLayer: 'paths-lighting',
    commonName: 'Cedar Deck Module',
    shortName: 'Deck Tile',
    scientificName: '6 × 6 ft Modular Platform',
    region: 'Courtyard Hardscape',
    tagline: 'Low-profile slatted cedar decking platform—tile multiple modules to build terraces.',
    accentHex: '#c68b59',
    barkShadow: rgb(92, 60, 40),
    barkLit: rgb(174, 122, 82),
    architecture: {
      kind: 'deck-tile',
      trunkHeight: 0.04,
      trunkBaseRadius: 0.3,
      trunkTopRadius: 0.3,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.6,
      crownHeight: 0.05,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 41,
      leafTiles: [41, 41],
      blossomTiles: [41, 41],
      fallingLeafTile: 20,
      fallingPetalTile: 20,
    },
    seasons: {
      springEarly: NEUTRAL_SEASON,
      springPeak: NEUTRAL_SEASON,
      summer: NEUTRAL_SEASON,
      autumnEarly: NEUTRAL_SEASON,
      autumnPeak: NEUTRAL_SEASON,
      winter: NEUTRAL_SEASON,
    },
  },
  // ── 10 Curated Sprite-Stacked 3D Musical Instruments (gpuIndex 24..33) ──
  {
    id: 'upright-piano',
    gpuIndex: 24,
    category: 'accent',
    bimLayer: 'instruments',
    commonName: 'Upright Piano',
    shortName: 'Piano',
    scientificName: 'Acoustic · Chords & Arpeggios',
    region: 'Acoustic Heritage',
    tagline: 'Walnut upright cabinet with ivory keybed and warm felt-hammer voicings.',
    accentHex: '#f5b041',
    barkShadow: rgb(58, 34, 22),
    barkLit: rgb(134, 82, 52),
    architecture: {
      kind: 'upright-piano',
      trunkHeight: 0.42,
      trunkBaseRadius: 0.14,
      trunkTopRadius: 0.12,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.28,
      crownHeight: 0.42,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 43,
      leafTiles: [48, 48],
      blossomTiles: [33, 33],
      fallingLeafTile: 27,
      fallingPetalTile: 29,
    },
    seasons: {
      springEarly: { leafShadow: rgb(198, 194, 180), leafLit: rgb(252, 248, 236), blossomShadow: rgb(168, 128, 48), blossomLit: rgb(238, 198, 96), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      springPeak: { leafShadow: rgb(198, 194, 180), leafLit: rgb(252, 248, 236), blossomShadow: rgb(168, 128, 48), blossomLit: rgb(238, 198, 96), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      summer: { leafShadow: rgb(198, 194, 180), leafLit: rgb(252, 248, 236), blossomShadow: rgb(168, 128, 48), blossomLit: rgb(238, 198, 96), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnEarly: { leafShadow: rgb(198, 194, 180), leafLit: rgb(252, 248, 236), blossomShadow: rgb(168, 128, 48), blossomLit: rgb(238, 198, 96), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnPeak: { leafShadow: rgb(198, 194, 180), leafLit: rgb(252, 248, 236), blossomShadow: rgb(168, 128, 48), blossomLit: rgb(238, 198, 96), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      winter: { leafShadow: rgb(198, 194, 180), leafLit: rgb(252, 248, 236), blossomShadow: rgb(168, 128, 48), blossomLit: rgb(238, 198, 96), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
    },
  },
  {
    id: 'concert-harp',
    gpuIndex: 25,
    category: 'accent',
    bimLayer: 'instruments',
    commonName: 'Concert Harp',
    shortName: 'Harp',
    scientificName: 'Acoustic · Shimmering Plucks',
    region: 'Acoustic Heritage',
    tagline: 'Carved maple pillar and golden string plane weaving cascading arpeggios.',
    accentHex: '#f7d36f',
    barkShadow: rgb(138, 96, 44),
    barkLit: rgb(214, 166, 92),
    architecture: {
      kind: 'concert-harp',
      trunkHeight: 0.48,
      trunkBaseRadius: 0.1,
      trunkTopRadius: 0.08,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.24,
      crownHeight: 0.48,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 43,
      leafTiles: [53, 53],
      blossomTiles: [53, 53],
      fallingLeafTile: 27,
      fallingPetalTile: 29,
    },
    seasons: {
      springEarly: { leafShadow: rgb(192, 152, 54), leafLit: rgb(254, 224, 122), blossomShadow: rgb(212, 174, 72), blossomLit: rgb(255, 240, 172), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      springPeak: { leafShadow: rgb(192, 152, 54), leafLit: rgb(254, 224, 122), blossomShadow: rgb(212, 174, 72), blossomLit: rgb(255, 240, 172), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      summer: { leafShadow: rgb(192, 152, 54), leafLit: rgb(254, 224, 122), blossomShadow: rgb(212, 174, 72), blossomLit: rgb(255, 240, 172), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnEarly: { leafShadow: rgb(192, 152, 54), leafLit: rgb(254, 224, 122), blossomShadow: rgb(212, 174, 72), blossomLit: rgb(255, 240, 172), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnPeak: { leafShadow: rgb(192, 152, 54), leafLit: rgb(254, 224, 122), blossomShadow: rgb(212, 174, 72), blossomLit: rgb(255, 240, 172), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      winter: { leafShadow: rgb(192, 152, 54), leafLit: rgb(254, 224, 122), blossomShadow: rgb(212, 174, 72), blossomLit: rgb(255, 240, 172), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
    },
  },
  {
    id: 'marimba',
    gpuIndex: 26,
    category: 'accent',
    bimLayer: 'instruments',
    commonName: 'Rosewood Marimba',
    shortName: 'Marimba',
    scientificName: 'Acoustic · Melodic Percussion',
    region: 'Acoustic Heritage',
    tagline: 'Graduated rosewood tone bars over suspended bronze resonator tubes.',
    accentHex: '#e07a5f',
    barkShadow: rgb(42, 44, 52),
    barkLit: rgb(104, 110, 124),
    architecture: {
      kind: 'marimba',
      trunkHeight: 0.26,
      trunkBaseRadius: 0.16,
      trunkTopRadius: 0.16,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.36,
      crownHeight: 0.26,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 33,
      leafTiles: [51, 51],
      blossomTiles: [50, 50],
      fallingLeafTile: 27,
      fallingPetalTile: 29,
    },
    seasons: {
      springEarly: { leafShadow: rgb(96, 38, 28), leafLit: rgb(186, 86, 62), blossomShadow: rgb(146, 114, 58), blossomLit: rgb(224, 186, 108), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      springPeak: { leafShadow: rgb(96, 38, 28), leafLit: rgb(186, 86, 62), blossomShadow: rgb(146, 114, 58), blossomLit: rgb(224, 186, 108), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      summer: { leafShadow: rgb(96, 38, 28), leafLit: rgb(186, 86, 62), blossomShadow: rgb(146, 114, 58), blossomLit: rgb(224, 186, 108), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnEarly: { leafShadow: rgb(96, 38, 28), leafLit: rgb(186, 86, 62), blossomShadow: rgb(146, 114, 58), blossomLit: rgb(224, 186, 108), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnPeak: { leafShadow: rgb(96, 38, 28), leafLit: rgb(186, 86, 62), blossomShadow: rgb(146, 114, 58), blossomLit: rgb(224, 186, 108), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      winter: { leafShadow: rgb(96, 38, 28), leafLit: rgb(186, 86, 62), blossomShadow: rgb(146, 114, 58), blossomLit: rgb(224, 186, 108), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
    },
  },
  {
    id: 'standing-cello',
    gpuIndex: 27,
    category: 'accent',
    bimLayer: 'instruments',
    commonName: 'Standing Cello',
    shortName: 'Cello',
    scientificName: 'Acoustic · Bowed Bass Drone',
    region: 'Acoustic Heritage',
    tagline: 'Sculptural spruce hourglass cello on an endpin stand anchoring warm fifths.',
    accentHex: '#d97742',
    barkShadow: rgb(104, 44, 18),
    barkLit: rgb(198, 104, 48),
    architecture: {
      kind: 'standing-cello',
      trunkHeight: 0.44,
      trunkBaseRadius: 0.1,
      trunkTopRadius: 0.06,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.18,
      crownHeight: 0.44,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 54,
      leafTiles: [33, 33],
      blossomTiles: [53, 53],
      fallingLeafTile: 27,
      fallingPetalTile: 29,
    },
    seasons: {
      springEarly: { leafShadow: rgb(26, 24, 26), leafLit: rgb(62, 58, 64), blossomShadow: rgb(172, 134, 62), blossomLit: rgb(238, 202, 112), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      springPeak: { leafShadow: rgb(26, 24, 26), leafLit: rgb(62, 58, 64), blossomShadow: rgb(172, 134, 62), blossomLit: rgb(238, 202, 112), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      summer: { leafShadow: rgb(26, 24, 26), leafLit: rgb(62, 58, 64), blossomShadow: rgb(172, 134, 62), blossomLit: rgb(238, 202, 112), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnEarly: { leafShadow: rgb(26, 24, 26), leafLit: rgb(62, 58, 64), blossomShadow: rgb(172, 134, 62), blossomLit: rgb(238, 202, 112), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnPeak: { leafShadow: rgb(26, 24, 26), leafLit: rgb(62, 58, 64), blossomShadow: rgb(172, 134, 62), blossomLit: rgb(238, 202, 112), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      winter: { leafShadow: rgb(26, 24, 26), leafLit: rgb(62, 58, 64), blossomShadow: rgb(172, 134, 62), blossomLit: rgb(238, 202, 112), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
    },
  },
  {
    id: 'modular-synth',
    gpuIndex: 28,
    category: 'accent',
    bimLayer: 'instruments',
    commonName: 'Modular Synth Rack',
    shortName: 'Modular',
    scientificName: 'Electronic · Filtered Plucks',
    region: 'Studio Hardware',
    tagline: 'Angled walnut-cheeked Eurorack tower with resonant filter sweeps and glowing patch LEDs.',
    accentHex: '#4ee6f5',
    barkShadow: rgb(24, 28, 36),
    barkLit: rgb(66, 76, 92),
    architecture: {
      kind: 'modular-synth',
      trunkHeight: 0.36,
      trunkBaseRadius: 0.14,
      trunkTopRadius: 0.11,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.26,
      crownHeight: 0.36,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 52,
      leafTiles: [43, 43],
      blossomTiles: [52, 52],
      fallingLeafTile: 27,
      fallingPetalTile: 29,
    },
    seasons: {
      springEarly: { leafShadow: rgb(92, 56, 32), leafLit: rgb(164, 108, 62), blossomShadow: rgb(32, 164, 198), blossomLit: rgb(110, 238, 255), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      springPeak: { leafShadow: rgb(92, 56, 32), leafLit: rgb(164, 108, 62), blossomShadow: rgb(32, 164, 198), blossomLit: rgb(110, 238, 255), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      summer: { leafShadow: rgb(92, 56, 32), leafLit: rgb(164, 108, 62), blossomShadow: rgb(32, 164, 198), blossomLit: rgb(110, 238, 255), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnEarly: { leafShadow: rgb(92, 56, 32), leafLit: rgb(164, 108, 62), blossomShadow: rgb(32, 164, 198), blossomLit: rgb(110, 238, 255), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnPeak: { leafShadow: rgb(92, 56, 32), leafLit: rgb(164, 108, 62), blossomShadow: rgb(32, 164, 198), blossomLit: rgb(110, 238, 255), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      winter: { leafShadow: rgb(92, 56, 32), leafLit: rgb(164, 108, 62), blossomShadow: rgb(32, 164, 198), blossomLit: rgb(110, 238, 255), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
    },
  },
  {
    id: 'tape-deck',
    gpuIndex: 29,
    category: 'accent',
    bimLayer: 'instruments',
    commonName: 'Reel-to-Reel Tape Deck',
    shortName: 'Tape Deck',
    scientificName: 'Electronic · Warm Lo-Fi Pads',
    region: 'Studio Hardware',
    tagline: 'Upright aluminum studio reel console drifting warm flutter-modulated chord pads.',
    accentHex: '#9b7bff',
    barkShadow: rgb(44, 48, 56),
    barkLit: rgb(124, 132, 146),
    architecture: {
      kind: 'tape-deck',
      trunkHeight: 0.38,
      trunkBaseRadius: 0.13,
      trunkTopRadius: 0.12,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.28,
      crownHeight: 0.38,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 33,
      leafTiles: [49, 49],
      blossomTiles: [52, 52],
      fallingLeafTile: 27,
      fallingPetalTile: 29,
    },
    seasons: {
      springEarly: { leafShadow: rgb(146, 154, 168), leafLit: rgb(232, 238, 248), blossomShadow: rgb(112, 76, 198), blossomLit: rgb(188, 152, 255), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      springPeak: { leafShadow: rgb(146, 154, 168), leafLit: rgb(232, 238, 248), blossomShadow: rgb(112, 76, 198), blossomLit: rgb(188, 152, 255), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      summer: { leafShadow: rgb(146, 154, 168), leafLit: rgb(232, 238, 248), blossomShadow: rgb(112, 76, 198), blossomLit: rgb(188, 152, 255), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnEarly: { leafShadow: rgb(146, 154, 168), leafLit: rgb(232, 238, 248), blossomShadow: rgb(112, 76, 198), blossomLit: rgb(188, 152, 255), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnPeak: { leafShadow: rgb(146, 154, 168), leafLit: rgb(232, 238, 248), blossomShadow: rgb(112, 76, 198), blossomLit: rgb(188, 152, 255), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      winter: { leafShadow: rgb(146, 154, 168), leafLit: rgb(232, 238, 248), blossomShadow: rgb(112, 76, 198), blossomLit: rgb(188, 152, 255), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
    },
  },
  {
    id: 'drum-stack',
    gpuIndex: 30,
    category: 'accent',
    bimLayer: 'instruments',
    commonName: 'Analog Drum Stack',
    shortName: 'Drum Stack',
    scientificName: 'Electronic · Lo-Fi Pulse',
    region: 'Studio Hardware',
    tagline: 'Studio woofer cabinet crowned by a step-sequencer pulsing soft organic kicks and rims.',
    accentHex: '#f778b4',
    barkShadow: rgb(32, 30, 38),
    barkLit: rgb(78, 76, 90),
    architecture: {
      kind: 'drum-stack',
      trunkHeight: 0.34,
      trunkBaseRadius: 0.14,
      trunkTopRadius: 0.12,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.24,
      crownHeight: 0.34,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 33,
      leafTiles: [49, 49],
      blossomTiles: [52, 52],
      fallingLeafTile: 27,
      fallingPetalTile: 29,
    },
    seasons: {
      springEarly: { leafShadow: rgb(124, 118, 110), leafLit: rgb(214, 206, 194), blossomShadow: rgb(186, 62, 118), blossomLit: rgb(252, 134, 190), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      springPeak: { leafShadow: rgb(124, 118, 110), leafLit: rgb(214, 206, 194), blossomShadow: rgb(186, 62, 118), blossomLit: rgb(252, 134, 190), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      summer: { leafShadow: rgb(124, 118, 110), leafLit: rgb(214, 206, 194), blossomShadow: rgb(186, 62, 118), blossomLit: rgb(252, 134, 190), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnEarly: { leafShadow: rgb(124, 118, 110), leafLit: rgb(214, 206, 194), blossomShadow: rgb(186, 62, 118), blossomLit: rgb(252, 134, 190), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnPeak: { leafShadow: rgb(124, 118, 110), leafLit: rgb(214, 206, 194), blossomShadow: rgb(186, 62, 118), blossomLit: rgb(252, 134, 190), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      winter: { leafShadow: rgb(124, 118, 110), leafLit: rgb(214, 206, 194), blossomShadow: rgb(186, 62, 118), blossomLit: rgb(252, 134, 190), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
    },
  },
  {
    id: 'wind-chime-arch',
    gpuIndex: 31,
    category: 'accent',
    bimLayer: 'instruments',
    commonName: 'Bronze Wind-Chime Arch',
    shortName: 'Chime Arch',
    scientificName: 'Sculptural · Wind Shimmer',
    region: 'Sound Installation',
    tagline: 'Cedar garden arch suspending stepped bronze tubes that sway and sing in passing gusts.',
    accentHex: '#4ee094',
    barkShadow: rgb(88, 60, 38),
    barkLit: rgb(164, 118, 76),
    architecture: {
      kind: 'wind-chime-arch',
      trunkHeight: 0.56,
      trunkBaseRadius: 0.18,
      trunkTopRadius: 0.18,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.42,
      crownHeight: 0.56,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 43,
      leafTiles: [55, 55],
      blossomTiles: [50, 50],
      fallingLeafTile: 27,
      fallingPetalTile: 29,
    },
    seasons: {
      springEarly: { leafShadow: rgb(72, 134, 114), leafLit: rgb(146, 224, 188), blossomShadow: rgb(168, 134, 62), blossomLit: rgb(240, 206, 114), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      springPeak: { leafShadow: rgb(72, 134, 114), leafLit: rgb(146, 224, 188), blossomShadow: rgb(168, 134, 62), blossomLit: rgb(240, 206, 114), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      summer: { leafShadow: rgb(72, 134, 114), leafLit: rgb(146, 224, 188), blossomShadow: rgb(168, 134, 62), blossomLit: rgb(240, 206, 114), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnEarly: { leafShadow: rgb(72, 134, 114), leafLit: rgb(146, 224, 188), blossomShadow: rgb(168, 134, 62), blossomLit: rgb(240, 206, 114), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnPeak: { leafShadow: rgb(72, 134, 114), leafLit: rgb(146, 224, 188), blossomShadow: rgb(168, 134, 62), blossomLit: rgb(240, 206, 114), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      winter: { leafShadow: rgb(72, 134, 114), leafLit: rgb(146, 224, 188), blossomShadow: rgb(168, 134, 62), blossomLit: rgb(240, 206, 114), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
    },
  },
  {
    id: 'singing-bowl',
    gpuIndex: 32,
    category: 'accent',
    bimLayer: 'instruments',
    commonName: 'Stone Singing Bowl',
    shortName: 'Singing Bowl',
    scientificName: 'Sculptural · Overtone Resonance',
    region: 'Sound Installation',
    tagline: 'Blue Ridge stone plinth cradling a burnished brass bowl radiating beating overtone drones.',
    accentHex: '#f4dc82',
    barkShadow: rgb(82, 88, 96),
    barkLit: rgb(156, 164, 174),
    architecture: {
      kind: 'singing-bowl',
      trunkHeight: 0.24,
      trunkBaseRadius: 0.14,
      trunkTopRadius: 0.14,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.24,
      crownHeight: 0.24,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 32,
      leafTiles: [50, 50],
      blossomTiles: [50, 50],
      fallingLeafTile: 27,
      fallingPetalTile: 29,
    },
    seasons: {
      springEarly: { leafShadow: rgb(162, 122, 36), leafLit: rgb(248, 212, 102), blossomShadow: rgb(206, 174, 78), blossomLit: rgb(255, 240, 172), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      springPeak: { leafShadow: rgb(162, 122, 36), leafLit: rgb(248, 212, 102), blossomShadow: rgb(206, 174, 78), blossomLit: rgb(255, 240, 172), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      summer: { leafShadow: rgb(162, 122, 36), leafLit: rgb(248, 212, 102), blossomShadow: rgb(206, 174, 78), blossomLit: rgb(255, 240, 172), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnEarly: { leafShadow: rgb(162, 122, 36), leafLit: rgb(248, 212, 102), blossomShadow: rgb(206, 174, 78), blossomLit: rgb(255, 240, 172), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnPeak: { leafShadow: rgb(162, 122, 36), leafLit: rgb(248, 212, 102), blossomShadow: rgb(206, 174, 78), blossomLit: rgb(255, 240, 172), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      winter: { leafShadow: rgb(162, 122, 36), leafLit: rgb(248, 212, 102), blossomShadow: rgb(206, 174, 78), blossomLit: rgb(255, 240, 172), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
    },
  },
  {
    id: 'bronze-gong',
    gpuIndex: 33,
    category: 'accent',
    bimLayer: 'instruments',
    commonName: 'Temple Bronze Gong',
    shortName: 'Bronze Gong',
    scientificName: 'Sculptural · Deep Phrase Swell',
    region: 'Sound Installation',
    tagline: 'Twin charred-timber uprights framing a hammered bronze disc for deep atmospheric swells.',
    accentHex: '#ff6f61',
    barkShadow: rgb(38, 30, 28),
    barkLit: rgb(88, 66, 56),
    architecture: {
      kind: 'bronze-gong',
      trunkHeight: 0.5,
      trunkBaseRadius: 0.16,
      trunkTopRadius: 0.16,
      trunkTwist: 0,
      boughCount: 0,
      boughSpread: 0,
      boughHorizontalBias: 0,
      weepingDroop: 0,
      crownWidth: 0.36,
      crownHeight: 0.5,
      clusterScale: 1,
      evergreen: true,
      cauliflorous: false,
      barkTile: 43,
      leafTiles: [50, 50],
      blossomTiles: [50, 50],
      fallingLeafTile: 27,
      fallingPetalTile: 29,
    },
    seasons: {
      springEarly: { leafShadow: rgb(148, 86, 36), leafLit: rgb(236, 168, 78), blossomShadow: rgb(196, 118, 52), blossomLit: rgb(255, 214, 124), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      springPeak: { leafShadow: rgb(148, 86, 36), leafLit: rgb(236, 168, 78), blossomShadow: rgb(196, 118, 52), blossomLit: rgb(255, 214, 124), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      summer: { leafShadow: rgb(148, 86, 36), leafLit: rgb(236, 168, 78), blossomShadow: rgb(196, 118, 52), blossomLit: rgb(255, 214, 124), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnEarly: { leafShadow: rgb(148, 86, 36), leafLit: rgb(236, 168, 78), blossomShadow: rgb(196, 118, 52), blossomLit: rgb(255, 214, 124), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      autumnPeak: { leafShadow: rgb(148, 86, 36), leafLit: rgb(236, 168, 78), blossomShadow: rgb(196, 118, 52), blossomLit: rgb(255, 214, 124), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
      winter: { leafShadow: rgb(148, 86, 36), leafLit: rgb(236, 168, 78), blossomShadow: rgb(196, 118, 52), blossomLit: rgb(255, 214, 124), leafScale: 1, blossomScale: 1, berryScale: 0, shedRate: 0 },
    },
  },
];

// Real-world architectural BIM takeoff metadata calibrated at 1 world unit = 10 ft
export const ITEM_BIM_SPECS: Record<PlaceableId, BimTakeoffSpec> = {
  dogwood: { layer: 'trees', unitLabel: 'Tree', canopyRadiusFt: 11, footprintSqFt: 8, linearFt: 0, waterSqFt: 0 },
  redbud: { layer: 'trees', unitLabel: 'Tree', canopyRadiusFt: 10, footprintSqFt: 7, linearFt: 0, waterSqFt: 0 },
  cherry: { layer: 'trees', unitLabel: 'Tree', canopyRadiusFt: 13, footprintSqFt: 10, linearFt: 0, waterSqFt: 0 },
  'white-oak': { layer: 'trees', unitLabel: 'Tree', canopyRadiusFt: 16, footprintSqFt: 14, linearFt: 0, waterSqFt: 0 },
  'red-maple': { layer: 'trees', unitLabel: 'Tree', canopyRadiusFt: 14, footprintSqFt: 12, linearFt: 0, waterSqFt: 0 },
  pine: { layer: 'trees', unitLabel: 'Tree', canopyRadiusFt: 12, footprintSqFt: 10, linearFt: 0, waterSqFt: 0 },
  azalea: { layer: 'understory', unitLabel: 'Shrub', canopyRadiusFt: 4.5, footprintSqFt: 14, linearFt: 0, waterSqFt: 0 },
  fern: { layer: 'understory', unitLabel: 'Drift', canopyRadiusFt: 2.2, footprintSqFt: 6, linearFt: 0, waterSqFt: 0 },
  wildflower: { layer: 'understory', unitLabel: 'Clump', canopyRadiusFt: 2.4, footprintSqFt: 8, linearFt: 0, waterSqFt: 0 },
  switchgrass: { layer: 'understory', unitLabel: 'Clump', canopyRadiusFt: 2.5, footprintSqFt: 7, linearFt: 0, waterSqFt: 0 },
  'raised-bed': { layer: 'understory', unitLabel: '4×8 Bed', canopyRadiusFt: 0, footprintSqFt: 32, linearFt: 0, waterSqFt: 0, rotatable: true },
  pond: { layer: 'water-stone', unitLabel: 'Pond', canopyRadiusFt: 0, footprintSqFt: 58, linearFt: 0, waterSqFt: 52 },
  'water-basin': { layer: 'water-stone', unitLabel: 'Basin', canopyRadiusFt: 0, footprintSqFt: 7, linearFt: 0, waterSqFt: 5 },
  stone: { layer: 'water-stone', unitLabel: 'Boulder', canopyRadiusFt: 0, footprintSqFt: 9, linearFt: 0, waterSqFt: 0 },
  'stepping-stone': { layer: 'water-stone', unitLabel: 'Slab', canopyRadiusFt: 0, footprintSqFt: 6, linearFt: 0, waterSqFt: 0, rotatable: true },
  bench: { layer: 'structures', unitLabel: '5 ft Bench', canopyRadiusFt: 0, footprintSqFt: 12, linearFt: 5, waterSqFt: 0, rotatable: true },
  pergola: { layer: 'structures', unitLabel: '10×10 Arbor', canopyRadiusFt: 6, footprintSqFt: 100, linearFt: 0, waterSqFt: 0, rotatable: true },
  'stone-wall': { layer: 'structures', unitLabel: '8 ft Wall', canopyRadiusFt: 0, footprintSqFt: 14, linearFt: 8, waterSqFt: 0, rotatable: true },
  fence: { layer: 'structures', unitLabel: '8 ft Rail', canopyRadiusFt: 0, footprintSqFt: 4, linearFt: 8, waterSqFt: 0, rotatable: true },
  pavilion: { layer: 'structures', unitLabel: '12×12 Pavilion', canopyRadiusFt: 0, footprintSqFt: 144, linearFt: 0, waterSqFt: 0, rotatable: true },
  lantern: { layer: 'paths-lighting', unitLabel: 'Lantern', canopyRadiusFt: 0, footprintSqFt: 2, linearFt: 0, waterSqFt: 0 },
  bollard: { layer: 'paths-lighting', unitLabel: 'Bollard', canopyRadiusFt: 0, footprintSqFt: 1, linearFt: 0, waterSqFt: 0 },
  'fire-pit': { layer: 'paths-lighting', unitLabel: 'Fire Pit', canopyRadiusFt: 0, footprintSqFt: 16, linearFt: 0, waterSqFt: 0 },
  'deck-tile': { layer: 'paths-lighting', unitLabel: '6×6 Deck', canopyRadiusFt: 0, footprintSqFt: 36, linearFt: 0, waterSqFt: 0, rotatable: true },
  'upright-piano': { layer: 'instruments', unitLabel: 'Piano', canopyRadiusFt: 0, footprintSqFt: 10, linearFt: 5, waterSqFt: 0, rotatable: true },
  'concert-harp': { layer: 'instruments', unitLabel: 'Harp', canopyRadiusFt: 0, footprintSqFt: 6, linearFt: 0, waterSqFt: 0, rotatable: true },
  marimba: { layer: 'instruments', unitLabel: 'Marimba', canopyRadiusFt: 0, footprintSqFt: 14, linearFt: 6, waterSqFt: 0, rotatable: true },
  'standing-cello': { layer: 'instruments', unitLabel: 'Cello', canopyRadiusFt: 0, footprintSqFt: 4, linearFt: 0, waterSqFt: 0, rotatable: true },
  'modular-synth': { layer: 'instruments', unitLabel: 'Modular', canopyRadiusFt: 0, footprintSqFt: 8, linearFt: 0, waterSqFt: 0, rotatable: true },
  'tape-deck': { layer: 'instruments', unitLabel: 'Tape Deck', canopyRadiusFt: 0, footprintSqFt: 7, linearFt: 0, waterSqFt: 0, rotatable: true },
  'drum-stack': { layer: 'instruments', unitLabel: 'Drum Stack', canopyRadiusFt: 0, footprintSqFt: 8, linearFt: 0, waterSqFt: 0, rotatable: true },
  'wind-chime-arch': { layer: 'instruments', unitLabel: 'Chime Arch', canopyRadiusFt: 0, footprintSqFt: 12, linearFt: 7, waterSqFt: 0, rotatable: true },
  'singing-bowl': { layer: 'instruments', unitLabel: 'Bowl Altar', canopyRadiusFt: 0, footprintSqFt: 6, linearFt: 0, waterSqFt: 0 },
  'bronze-gong': { layer: 'instruments', unitLabel: 'Gong Frame', canopyRadiusFt: 0, footprintSqFt: 10, linearFt: 6, waterSqFt: 0, rotatable: true },
};

export interface BimLayerMeta {
  id: BimLayerId;
  label: string;
  shortLabel: string;
  colorHex: string;
}

export const BIM_LAYERS: BimLayerMeta[] = [
  { id: 'trees', label: 'Trees & Canopy', shortLabel: 'Trees', colorHex: '#4ade80' },
  { id: 'understory', label: 'Understory & Beds', shortLabel: 'Beds', colorHex: '#facc15' },
  { id: 'water-stone', label: 'Water & Stone', shortLabel: 'Water', colorHex: '#38bdf8' },
  { id: 'structures', label: 'Garden Structures', shortLabel: 'Structures', colorHex: '#d99a64' },
  { id: 'paths-lighting', label: 'Paths & Lighting', shortLabel: 'Paths', colorHex: '#fbbf24' },
  { id: 'instruments', label: 'Sound & Instruments', shortLabel: 'Instruments', colorHex: '#4ee6f5' },
];

export interface PathMaterialMeta {
  id: PathMaterialId;
  label: string;
  tile: number;
  swatchHex: string;
  shadow: RGB;
  lit: RGB;
}

export const PATH_MATERIALS: PathMaterialMeta[] = [
  {
    id: 'flagstone',
    label: 'Flagstone',
    tile: 35,
    swatchHex: '#94a3b8',
    shadow: rgb(92, 98, 108),
    lit: rgb(176, 182, 190),
  },
  {
    id: 'gravel',
    label: 'Gravel',
    tile: 36,
    swatchHex: '#d6d3cb',
    shadow: rgb(148, 144, 134),
    lit: rgb(224, 218, 206),
  },
  {
    id: 'stepping',
    label: 'Step Slabs',
    tile: 37,
    swatchHex: '#a8a29e',
    shadow: rgb(104, 104, 102),
    lit: rgb(184, 182, 176),
  },
  {
    id: 'mulch',
    label: 'Cedar Mulch',
    tile: 38,
    swatchHex: '#8d5b3c',
    shadow: rgb(74, 48, 32),
    lit: rgb(142, 92, 58),
  },
];

export function getItemBimSpec(id: PlaceableId): BimTakeoffSpec {
  return ITEM_BIM_SPECS[id];
}

export function getItemsByLayer(layer: BimLayerId): VirginiaSpaceItem[] {
  return VIRGINIA_ITEMS.filter((i) => ITEM_BIM_SPECS[i.id].layer === layer);
}

export const VIRGINIA_TREES = VIRGINIA_ITEMS.filter((i) => i.category === 'tree');
export const SPACE_ACCENTS = VIRGINIA_ITEMS.filter((i) => i.category === 'accent');

export type VirginiaTreeSpecies = VirginiaSpaceItem;

export function getSpaceItem(id: PlaceableId): VirginiaSpaceItem {
  return VIRGINIA_ITEMS.find((t) => t.id === id) ?? VIRGINIA_ITEMS[0];
}

export function getTreeSpecies(id: PlaceableId): VirginiaSpaceItem {
  return getSpaceItem(id);
}

export const SPACE_PRESETS: SpacePreset[] = [
  {
    id: 'courtyard-circle',
    name: 'Blue Ridge Courtyard',
    description:
      'Sunlit Virginia clearing overlooking the Blue Ridge horizon with flagstone walk, lily pond, pergola, bench, and native trees.',
    defaultSeason: 0.45,
    defaultTime: 10.8,
    defaultWind: 0.28,
    defaultWeather: 'clear',
    defaultBackdrop: 'blue-ridge',
    entrance: { x: 0.0, z: 2.35, yaw: 0.0 },
    paths: [
      { material: 'flagstone', x: 0.0, z: 2.15, radius: 0.28, seed: 501 },
      { material: 'flagstone', x: -0.04, z: 1.78, radius: 0.28, seed: 502 },
      { material: 'flagstone', x: -0.1, z: 1.42, radius: 0.28, seed: 503 },
      { material: 'flagstone', x: -0.14, z: 1.04, radius: 0.28, seed: 504 },
      { material: 'flagstone', x: -0.12, z: 0.66, radius: 0.29, seed: 505 },
      { material: 'flagstone', x: -0.04, z: 0.3, radius: 0.3, seed: 506 },
      { material: 'gravel', x: 0.34, z: 0.05, radius: 0.28, seed: 507 },
      { material: 'gravel', x: 0.72, z: -0.08, radius: 0.28, seed: 508 },
      { material: 'gravel', x: 1.08, z: -0.22, radius: 0.28, seed: 509 },
      { material: 'stepping', x: -0.42, z: 0.08, radius: 0.2, seed: 510 },
      { material: 'stepping', x: -0.74, z: -0.18, radius: 0.2, seed: 511 },
      { material: 'stepping', x: -1.04, z: -0.45, radius: 0.2, seed: 512 },
    ],
    items: [
      { itemId: 'cherry', x: -1.18, z: 0.65, scale: 1.0, seed: 601 },
      { itemId: 'dogwood', x: 1.24, z: 0.78, scale: 0.96, seed: 602 },
      { itemId: 'red-maple', x: -1.35, z: -1.15, scale: 1.02, seed: 603 },
      { itemId: 'pine', x: 1.42, z: -1.32, scale: 1.05, seed: 604 },
      { itemId: 'pond', x: 0.62, z: -0.72, scale: 1.05, seed: 605 },
      { itemId: 'pergola', x: -0.96, z: -0.58, scale: 0.95, rotation: 0.35, seed: 606 },
      { itemId: 'bench', x: -0.94, z: -0.56, scale: 0.95, rotation: 0.35, seed: 607 },
      { itemId: 'stone-wall', x: 0.05, z: -1.58, scale: 1.05, rotation: 0.0, seed: 608 },
      { itemId: 'stone-wall', x: 0.84, z: -1.52, scale: 1.0, rotation: 0.24, seed: 609 },
      { itemId: 'raised-bed', x: -0.82, z: 1.42, scale: 0.96, rotation: 0.12, seed: 610 },
      { itemId: 'wildflower', x: 0.38, z: 1.38, scale: 1.05, seed: 611 },
      { itemId: 'wildflower', x: 0.72, z: 1.18, scale: 0.95, seed: 612 },
      { itemId: 'fern', x: 0.14, z: -0.92, scale: 1.05, seed: 613 },
      { itemId: 'fern', x: 1.08, z: -0.55, scale: 1.0, seed: 614 },
      { itemId: 'switchgrass', x: 1.22, z: 0.12, scale: 1.0, seed: 615 },
      { itemId: 'stone', x: 0.18, z: -0.46, scale: 0.92, seed: 616 },
      { itemId: 'lantern', x: -0.44, z: 1.56, scale: 0.96, seed: 617 },
      { itemId: 'lantern', x: 0.34, z: 1.56, scale: 0.96, seed: 618 },
      { itemId: 'bollard', x: 0.32, z: 0.32, scale: 1.0, seed: 619 },
      { itemId: 'water-basin', x: -0.56, z: 0.64, scale: 0.92, seed: 620 },
    ],
  },
  {
    id: 'conservatory-estate',
    name: 'Conservatory Terrace',
    description:
      'Architectural glass tea pavilion on cedar decking with fire pit, split-rail fencing, and formal gravel walks.',
    defaultSeason: 1.25,
    defaultTime: 16.4,
    defaultWind: 0.26,
    defaultWeather: 'clear',
    defaultBackdrop: 'blue-ridge',
    entrance: { x: 0.0, z: 2.45, yaw: 0.0 },
    paths: [
      { material: 'gravel', x: 0.0, z: 2.1, radius: 0.32, seed: 701 },
      { material: 'gravel', x: 0.0, z: 1.65, radius: 0.32, seed: 702 },
      { material: 'gravel', x: 0.0, z: 1.2, radius: 0.32, seed: 703 },
      { material: 'gravel', x: 0.0, z: 0.72, radius: 0.36, seed: 704 },
      { material: 'gravel', x: 0.0, z: 0.24, radius: 0.38, seed: 705 },
      { material: 'flagstone', x: -0.78, z: 0.78, radius: 0.26, seed: 706 },
      { material: 'flagstone', x: 0.78, z: 0.78, radius: 0.26, seed: 707 },
    ],
    items: [
      { itemId: 'pavilion', x: 0.0, z: -0.88, scale: 1.05, rotation: 0.0, seed: 710 },
      { itemId: 'deck-tile', x: 0.0, z: -0.05, scale: 1.0, rotation: 0.0, seed: 711 },
      { itemId: 'fire-pit', x: 0.0, z: 0.78, scale: 1.0, seed: 712 },
      { itemId: 'bench', x: -0.68, z: 0.78, scale: 0.95, rotation: Math.PI / 2, seed: 713 },
      { itemId: 'bench', x: 0.68, z: 0.78, scale: 0.95, rotation: -Math.PI / 2, seed: 714 },
      { itemId: 'white-oak', x: -1.45, z: -0.75, scale: 1.08, seed: 715 },
      { itemId: 'redbud', x: 1.38, z: -0.58, scale: 0.96, seed: 716 },
      { itemId: 'dogwood', x: -1.28, z: 1.15, scale: 0.92, seed: 717 },
      { itemId: 'cherry', x: 1.35, z: 1.1, scale: 0.94, seed: 718 },
      { itemId: 'fence', x: -1.55, z: 0.3, scale: 1.0, rotation: Math.PI / 2, seed: 719 },
      { itemId: 'fence', x: 1.55, z: 0.3, scale: 1.0, rotation: Math.PI / 2, seed: 720 },
      { itemId: 'raised-bed', x: -1.05, z: 1.65, scale: 0.92, rotation: 0.0, seed: 721 },
      { itemId: 'raised-bed', x: 1.05, z: 1.65, scale: 0.92, rotation: 0.0, seed: 722 },
      { itemId: 'wildflower', x: -0.68, z: 1.48, scale: 0.95, seed: 723 },
      { itemId: 'wildflower', x: 0.68, z: 1.48, scale: 0.95, seed: 724 },
      { itemId: 'bollard', x: -0.44, z: 1.85, scale: 1.0, seed: 725 },
      { itemId: 'bollard', x: 0.44, z: 1.85, scale: 1.0, seed: 726 },
      { itemId: 'bollard', x: -0.44, z: 0.25, scale: 1.0, seed: 727 },
      { itemId: 'bollard', x: 0.44, z: 0.25, scale: 1.0, seed: 728 },
    ],
  },
  {
    id: 'cherry-walk',
    name: 'Potomac Cherry Walk',
    description: 'Twin avenue of arching cherry blossoms, stepping stones, and lanterns.',
    defaultSeason: 0.45,
    defaultTime: 10.5,
    defaultWind: 0.34,
    defaultWeather: 'clear',
    defaultBackdrop: 'blue-ridge',
    entrance: { x: 0.0, z: 2.35, yaw: 0.0 },
    paths: [
      { material: 'stepping', x: 0.0, z: 1.9, radius: 0.24, seed: 121 },
      { material: 'stepping', x: -0.06, z: 1.4, radius: 0.24, seed: 122 },
      { material: 'stepping', x: 0.04, z: 0.88, radius: 0.24, seed: 123 },
      { material: 'stepping', x: -0.04, z: 0.36, radius: 0.24, seed: 124 },
      { material: 'stepping', x: 0.02, z: -0.18, radius: 0.24, seed: 125 },
      { material: 'stepping', x: 0.0, z: -0.72, radius: 0.24, seed: 126 },
    ],
    items: [
      { itemId: 'cherry', x: -0.78, z: 1.05, scale: 0.96, seed: 101 },
      { itemId: 'cherry', x: 0.82, z: 0.92, scale: 1.02, seed: 102 },
      { itemId: 'cherry', x: -0.84, z: -0.35, scale: 1.08, seed: 103 },
      { itemId: 'cherry', x: 0.86, z: -0.45, scale: 0.98, seed: 104 },
      { itemId: 'dogwood', x: 0.0, z: -1.45, scale: 1.1, seed: 105 },
      { itemId: 'azalea', x: -1.32, z: 0.38, scale: 1.0, seed: 106 },
      { itemId: 'azalea', x: 1.35, z: 0.25, scale: 0.94, seed: 107 },
      { itemId: 'lantern', x: -0.44, z: 1.55, scale: 1.0, seed: 108 },
      { itemId: 'lantern', x: 0.44, z: 1.55, scale: 1.0, seed: 109 },
      { itemId: 'lantern', x: -0.46, z: 0.25, scale: 1.0, seed: 110 },
      { itemId: 'lantern', x: 0.46, z: 0.25, scale: 1.0, seed: 111 },
      { itemId: 'stone', x: -1.05, z: 1.62, scale: 1.0, seed: 112 },
      { itemId: 'stone', x: 0.95, z: -1.15, scale: 1.15, seed: 113 },
    ],
  },
  {
    id: 'shenandoah-autumn',
    name: 'Shenandoah Autumn',
    description: 'Crimson Red Maples, bronze White Oaks, and a glowing stone hearth under twilight skies.',
    defaultSeason: 2.55,
    defaultTime: 17.6,
    defaultWind: 0.44,
    defaultWeather: 'clear',
    defaultBackdrop: 'blue-ridge',
    entrance: { x: 0.0, z: 2.3, yaw: 0.0 },
    paths: [
      { material: 'mulch', x: 0.0, z: 1.55, radius: 0.28, seed: 321 },
      { material: 'mulch', x: 0.04, z: 1.1, radius: 0.28, seed: 322 },
      { material: 'mulch', x: 0.02, z: 0.62, radius: 0.32, seed: 323 },
    ],
    items: [
      { itemId: 'red-maple', x: -0.82, z: 0.35, scale: 1.08, seed: 301 },
      { itemId: 'white-oak', x: 0.92, z: 0.12, scale: 1.14, seed: 302 },
      { itemId: 'red-maple', x: 0.15, z: -1.25, scale: 1.05, seed: 303 },
      { itemId: 'pine', x: -1.45, z: -0.95, scale: 1.15, seed: 304 },
      { itemId: 'pine', x: 1.48, z: -1.15, scale: 1.1, seed: 305 },
      { itemId: 'fire-pit', x: 0.0, z: 0.3, scale: 1.0, seed: 306 },
      { itemId: 'bench', x: -0.58, z: 0.55, scale: 0.92, rotation: 1.15, seed: 307 },
      { itemId: 'switchgrass', x: 0.58, z: 1.05, scale: 1.05, seed: 308 },
      { itemId: 'stone', x: 0.55, z: -0.58, scale: 1.1, seed: 309 },
      { itemId: 'lantern', x: -0.35, z: 1.18, scale: 1.0, seed: 310 },
      { itemId: 'lantern', x: 0.42, z: -0.58, scale: 1.0, seed: 311 },
    ],
  },
  {
    id: 'acoustic-clearing',
    name: 'Acoustic Clearing',
    description: 'Spatial sound garden uniting an Upright Piano, Concert Harp, Modular Synth, Bronze Chime Arch, and Stone Singing Bowl.',
    defaultSeason: 0.48,
    defaultTime: 16.8,
    defaultWind: 0.34,
    defaultWeather: 'clear',
    defaultBackdrop: 'blue-ridge',
    entrance: { x: 0.0, z: 2.35, yaw: 0.0 },
    paths: [
      { material: 'flagstone', x: 0.0, z: 1.5, radius: 0.28, seed: 801 },
      { material: 'flagstone', x: 0.0, z: 0.95, radius: 0.32, seed: 802 },
      { material: 'flagstone', x: 0.0, z: 0.38, radius: 0.38, seed: 803 },
      { material: 'flagstone', x: -0.58, z: 0.22, radius: 0.28, seed: 804 },
      { material: 'flagstone', x: 0.58, z: 0.22, radius: 0.28, seed: 805 },
    ],
    items: [
      { itemId: 'dogwood', x: -1.35, z: -0.75, scale: 1.05, seed: 810 },
      { itemId: 'redbud', x: 1.32, z: -0.68, scale: 1.02, seed: 811 },
      { itemId: 'cherry', x: -1.12, z: 0.95, scale: 0.96, seed: 812 },
      { itemId: 'white-oak', x: 1.45, z: 0.88, scale: 1.04, seed: 813 },
      { itemId: 'pond', x: 0.0, z: -1.15, scale: 0.96, seed: 814 },
      { itemId: 'upright-piano', x: -0.76, z: 0.24, scale: 1.08, rotation: 0.52, seed: 815 },
      { itemId: 'concert-harp', x: 0.78, z: 0.28, scale: 1.05, rotation: -0.55, seed: 816 },
      { itemId: 'modular-synth', x: -0.55, z: -0.52, scale: 1.0, rotation: 0.28, seed: 817 },
      { itemId: 'wind-chime-arch', x: 0.0, z: 1.38, scale: 1.05, rotation: 0.0, seed: 818 },
      { itemId: 'singing-bowl', x: 0.0, z: 0.12, scale: 1.05, seed: 819 },
      { itemId: 'bronze-gong', x: 0.72, z: -0.64, scale: 1.02, rotation: -0.42, seed: 820 },
      { itemId: 'lantern', x: -0.48, z: 1.44, scale: 0.95, seed: 821 },
      { itemId: 'lantern', x: 0.48, z: 1.44, scale: 0.95, seed: 822 },
    ],
  },
  {
    id: 'single-specimen',
    name: 'Open Clearing',
    description: 'Clean airy circle with a single cherry specimen and open room to design from scratch.',
    defaultSeason: 0.45,
    defaultTime: 11.5,
    defaultWind: 0.28,
    defaultWeather: 'clear',
    defaultBackdrop: 'white-circle',
    entrance: { x: 0.0, z: 1.95, yaw: 0.0 },
    items: [
      { itemId: 'cherry', x: 0.0, z: 0.0, scale: 1.06, seed: 401 },
    ],
  },
];

export function evaluateSeason(
  species: VirginiaSpaceItem,
  seasonValue: number,
): SeasonalPalette {
  const s = ((seasonValue % 4) + 4) % 4;
  const { springEarly, springPeak, summer, autumnEarly, autumnPeak, winter } =
    species.seasons;

  const stops: { pos: number; val: SeasonalPalette }[] = [
    { pos: 0.0, val: springEarly },
    { pos: 0.45, val: springPeak },
    { pos: 1.25, val: summer },
    { pos: 2.05, val: autumnEarly },
    { pos: 2.65, val: autumnPeak },
    { pos: 3.35, val: winter },
    { pos: 4.0, val: springEarly },
  ];

  let idx = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    if (s >= stops[i].pos && s <= stops[i + 1].pos) {
      idx = i;
      break;
    }
  }

  const a = stops[idx];
  const b = stops[idx + 1];
  const rawT = (s - a.pos) / Math.max(0.0001, b.pos - a.pos);
  const t = smoothstep(rawT);

  return {
    leafShadow: lerpRGB(a.val.leafShadow, b.val.leafShadow, t),
    leafLit: lerpRGB(a.val.leafLit, b.val.leafLit, t),
    blossomShadow: lerpRGB(a.val.blossomShadow, b.val.blossomShadow, t),
    blossomLit: lerpRGB(a.val.blossomLit, b.val.blossomLit, t),
    leafScale: lerp(a.val.leafScale, b.val.leafScale, t),
    blossomScale: lerp(a.val.blossomScale, b.val.blossomScale, t),
    berryScale: lerp(a.val.berryScale, b.val.berryScale, t),
    shedRate: lerp(a.val.shedRate, b.val.shedRate, t),
  };
}

export function formatSeasonLabel(seasonValue: number): {
  seasonName: string;
  monthApprox: string;
} {
  const s = ((seasonValue % 4) + 4) % 4;
  const months = [
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
    'January',
    'February',
  ];
  const monthIdx = Math.floor((s / 4) * 12) % 12;
  let seasonName = 'Spring';
  if (s >= 0.85 && s < 1.85) seasonName = 'Summer';
  else if (s >= 1.85 && s < 2.95) seasonName = 'Autumn';
  else if (s >= 2.95 && s < 3.75) seasonName = 'Winter';
  else if (s >= 0.25 && s < 0.7) seasonName = 'Peak Bloom';

  return { seasonName, monthApprox: months[monthIdx] };
}

export function formatTimeOfDay(hours: number): {
  clock: string;
  phase: string;
} {
  const hNorm = ((hours % 24) + 24) % 24;
  const h = Math.floor(hNorm);
  const m = Math.floor((hNorm - h) * 60);
  const clock = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  let phase = 'Night';
  if (hNorm >= 5 && hNorm < 7) phase = 'Dawn';
  else if (hNorm >= 7 && hNorm < 11) phase = 'Morning';
  else if (hNorm >= 11 && hNorm < 15.5) phase = 'Midday';
  else if (hNorm >= 15.5 && hNorm < 17.5) phase = 'Afternoon';
  else if (hNorm >= 17.5 && hNorm < 19.2) phase = 'Golden Hour';
  else if (hNorm >= 19.2 && hNorm < 21) phase = 'Dusk';

  return { clock, phase };
}
