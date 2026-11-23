import {
  BimLayerId,
  PATH_MATERIALS,
  PathMaterialId,
  PathNode,
  PlaceableId,
  PlacedSpaceItem,
  VirginiaSpaceItem,
  getItemBimSpec,
  getSpaceItem,
} from '../data/virginiaTrees';

export const enum SpriteKind {
  Shadow = 0,
  Bark = 1,
  Leaf = 2,
  Blossom = 3,
  Berry = 4,
  Grass = 5,
  GroundLitter = 6,
  EmissiveGlow = 7,
  PathSurface = 8,
}

export interface TreeSpriteInstance {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  rot: number;
  tile: number;
  kind: SpriteKind;
  /** 1.0 = flat horizontal sprite-stack slice, 0.0 = billboard pixel cluster */
  isSlice: number;
  speciesIdx: number;
  swayWeight: number;
  swayPhase: number;
  flutterFreq: number;
  shadeBias: number;
  growthOrder: number;
}

export interface CanopyEmitter {
  x: number;
  y: number;
  z: number;
  isBlossom: boolean;
  itemId: PlaceableId;
}

export interface BuiltSpaceScene {
  sprites: TreeSpriteInstance[];
  emitters: CanopyEmitter[];
}

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rotOffset(
  ox: number,
  oz: number,
  lx: number,
  lz: number,
  rot: number,
): [number, number] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return [ox + lx * c - lz * s, oz + lx * s + lz * c];
}

interface BranchTip3D {
  x: number;
  y: number;
  z: number;
  swayWeight: number;
  tier: number;
}

function buildStone3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  seed: number,
  outSprites: TreeSpriteInstance[],
) {
  const rng = makeRng(seed);
  const sIdx = item.gpuIndex;

  outSprites.push({
    x: originX,
    y: 0.002,
    z: originZ,
    w: 0.34 * scale,
    h: 0.34 * scale,
    rot: 0,
    tile: 31,
    kind: SpriteKind.Shadow,
    isSlice: 1.0,
    speciesIdx: sIdx,
    swayWeight: 0,
    swayPhase: 0,
    flutterFreq: 0,
    shadeBias: 0,
    growthOrder: 0,
  });

  const slices = 11;
  const maxH = 0.14 * scale;
  const baseRot = rot + rng() * Math.PI * 2;
  for (let i = 0; i < slices; i++) {
    const t = i / (slices - 1);
    const dome = Math.sqrt(Math.max(0.08, 1 - t * t * 0.92));
    const rad = (0.14 * dome + (rng() - 0.5) * 0.012) * scale;
    outSprites.push({
      x: originX + Math.sin(t * 2.5) * 0.012 * scale,
      y: 0.008 + t * maxH,
      z: originZ + Math.cos(t * 2.1) * 0.01 * scale,
      w: rad * 2.1,
      h: rad * 1.9,
      rot: baseRot + t * 0.35,
      tile: 32,
      kind: SpriteKind.Bark,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0,
      swayPhase: 0,
      flutterFreq: 0,
      shadeBias: (t - 0.45) * 0.8,
      growthOrder: 0,
    });
  }

  for (let m = 0; m < 4; m++) {
    const a = baseRot + (m / 4) * Math.PI * 1.5;
    outSprites.push({
      x: originX + Math.cos(a) * 0.055 * scale,
      y: maxH * (0.72 + rng() * 0.25),
      z: originZ + Math.sin(a) * 0.055 * scale,
      w: 0.095 * scale,
      h: 0.08 * scale,
      rot: rng() * 0.6,
      tile: 4,
      kind: SpriteKind.Leaf,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0,
      swayPhase: 0,
      flutterFreq: 0,
      shadeBias: 0.35,
      growthOrder: 0,
    });
  }
}

function buildLantern3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  seed: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  const r = rot + ((seed % 7) - 3) * 0.04;

  outSprites.push({
    x: originX,
    y: 0.002,
    z: originZ,
    w: 0.22 * scale,
    h: 0.22 * scale,
    rot: 0,
    tile: 31,
    kind: SpriteKind.Shadow,
    isSlice: 1.0,
    speciesIdx: sIdx,
    swayWeight: 0,
    swayPhase: 0,
    flutterFreq: 0,
    shadeBias: 0,
    growthOrder: 0,
  });

  for (let i = 0; i < 3; i++) {
    outSprites.push({
      x: originX,
      y: 0.006 + i * 0.011 * scale,
      z: originZ,
      w: (0.092 - i * 0.012) * scale,
      h: (0.092 - i * 0.012) * scale,
      rot: r,
      tile: 33,
      kind: SpriteKind.Bark,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0,
      swayPhase: 0,
      flutterFreq: 0,
      shadeBias: -0.2 + i * 0.1,
      growthOrder: 0,
    });
  }

  for (let i = 0; i < 12; i++) {
    outSprites.push({
      x: originX,
      y: (0.036 + i * 0.013) * scale,
      z: originZ,
      w: 0.044 * scale,
      h: 0.044 * scale,
      rot: r,
      tile: 33,
      kind: SpriteKind.Bark,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0,
      swayPhase: 0,
      flutterFreq: 0,
      shadeBias: 0.0,
      growthOrder: 0,
    });
  }

  outSprites.push({
    x: originX,
    y: 0.194 * scale,
    z: originZ,
    w: 0.096 * scale,
    h: 0.096 * scale,
    rot: r,
    tile: 33,
    kind: SpriteKind.Bark,
    isSlice: 1.0,
    speciesIdx: sIdx,
    swayWeight: 0,
    swayPhase: 0,
    flutterFreq: 0,
    shadeBias: 0.15,
    growthOrder: 0,
  });

  for (let i = 0; i < 6; i++) {
    outSprites.push({
      x: originX,
      y: (0.205 + i * 0.012) * scale,
      z: originZ,
      w: 0.068 * scale,
      h: 0.068 * scale,
      rot: r,
      tile: 34,
      kind: SpriteKind.EmissiveGlow,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0,
      swayPhase: seed * 0.7,
      flutterFreq: 3.5,
      shadeBias: 0.6,
      growthOrder: 0,
    });
  }

  for (let i = 0; i < 5; i++) {
    const f = i / 4;
    const rw = 0.145 * (1 - f * 0.72) * scale;
    outSprites.push({
      x: originX,
      y: (0.278 + i * 0.011) * scale,
      z: originZ,
      w: rw,
      h: rw,
      rot: r,
      tile: 33,
      kind: SpriteKind.Bark,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0,
      swayPhase: 0,
      flutterFreq: 0,
      shadeBias: 0.25 + f * 0.35,
      growthOrder: 0,
    });
  }
}

function buildBollard3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  seed: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  outSprites.push({
    x: originX,
    y: 0.002,
    z: originZ,
    w: 0.14 * scale,
    h: 0.14 * scale,
    rot: 0,
    tile: 31,
    kind: SpriteKind.Shadow,
    isSlice: 1.0,
    speciesIdx: sIdx,
    swayWeight: 0,
    swayPhase: 0,
    flutterFreq: 0,
    shadeBias: 0,
    growthOrder: 0,
  });

  // Low dark cedar/bronze shaft (7 slices)
  for (let i = 0; i < 7; i++) {
    outSprites.push({
      x: originX,
      y: (0.008 + i * 0.012) * scale,
      z: originZ,
      w: 0.044 * scale,
      h: 0.044 * scale,
      rot,
      tile: 33,
      kind: SpriteKind.Bark,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0,
      swayPhase: 0,
      flutterFreq: 0,
      shadeBias: -0.15 + i * 0.05,
      growthOrder: 0,
    });
  }
  // Glowing lamp collar (3 slices)
  for (let i = 0; i < 3; i++) {
    outSprites.push({
      x: originX,
      y: (0.095 + i * 0.01) * scale,
      z: originZ,
      w: 0.052 * scale,
      h: 0.052 * scale,
      rot,
      tile: 34,
      kind: SpriteKind.EmissiveGlow,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0,
      swayPhase: seed * 0.5,
      flutterFreq: 2.6,
      shadeBias: 0.65,
      growthOrder: 0,
    });
  }
  // Flat cap
  for (let i = 0; i < 2; i++) {
    outSprites.push({
      x: originX,
      y: (0.126 + i * 0.009) * scale,
      z: originZ,
      w: (0.068 - i * 0.014) * scale,
      h: (0.068 - i * 0.014) * scale,
      rot,
      tile: 33,
      kind: SpriteKind.Bark,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0,
      swayPhase: 0,
      flutterFreq: 0,
      shadeBias: 0.3,
      growthOrder: 0,
    });
  }
}

function buildFirePit3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  seed: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  const rng = makeRng(seed);

  outSprites.push({
    x: originX,
    y: 0.002,
    z: originZ,
    w: 0.52 * scale,
    h: 0.52 * scale,
    rot: 0,
    tile: 31,
    kind: SpriteKind.Shadow,
    isSlice: 1.0,
    speciesIdx: sIdx,
    swayWeight: 0,
    swayPhase: 0,
    flutterFreq: 0,
    shadeBias: 0,
    growthOrder: 0,
  });

  // Ring of fieldstones (3 courses, 10 stones around circumference)
  const stoneCount = 10;
  const ringR = 0.165 * scale;
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < stoneCount; i++) {
      const a = (i / stoneCount) * Math.PI * 2 + layer * 0.31;
      outSprites.push({
        x: originX + Math.cos(a) * ringR,
        y: (0.014 + layer * 0.028) * scale,
        z: originZ + Math.sin(a) * ringR,
        w: 0.11 * scale,
        h: 0.085 * scale,
        rot: a,
        tile: 42,
        kind: SpriteKind.Bark,
        isSlice: 1.0,
        speciesIdx: sIdx,
        swayWeight: 0,
        swayPhase: 0,
        flutterFreq: 0,
        shadeBias: -0.25 + layer * 0.25,
        growthOrder: 0,
      });
    }
  }

  // Ember bed + flickering flame stack
  for (let i = 0; i < 4; i++) {
    outSprites.push({
      x: originX + (rng() - 0.5) * 0.04 * scale,
      y: (0.025 + i * 0.018) * scale,
      z: originZ + (rng() - 0.5) * 0.04 * scale,
      w: (0.16 - i * 0.026) * scale,
      h: (0.16 - i * 0.026) * scale,
      rot: rng() * Math.PI * 2,
      tile: 34,
      kind: SpriteKind.EmissiveGlow,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0.1 + i * 0.08,
      swayPhase: seed + i * 1.3,
      flutterFreq: 5.5 + i,
      shadeBias: 0.5 + i * 0.15,
      growthOrder: 0,
    });
  }

  // Dancing flame tongue billboards
  for (let f = 0; f < 3; f++) {
    const fa = (f / 3) * Math.PI * 2 + rng();
    outSprites.push({
      x: originX + Math.cos(fa) * 0.032 * scale,
      y: (0.08 + f * 0.024) * scale,
      z: originZ + Math.sin(fa) * 0.032 * scale,
      w: (0.095 - f * 0.018) * scale,
      h: (0.12 - f * 0.015) * scale,
      rot: (rng() - 0.5) * 0.25,
      tile: 34,
      kind: SpriteKind.EmissiveGlow,
      isSlice: 0.0,
      speciesIdx: sIdx,
      swayWeight: 0.45,
      swayPhase: seed * 0.9 + f * 2.1,
      flutterFreq: 7.2,
      shadeBias: 0.7,
      growthOrder: 0,
    });
  }
}

function buildFern3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  seed: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  const rng = makeRng(seed);

  outSprites.push({
    x: originX,
    y: 0.002,
    z: originZ,
    w: 0.32 * scale,
    h: 0.32 * scale,
    rot: 0,
    tile: 31,
    kind: SpriteKind.Shadow,
    isSlice: 1.0,
    speciesIdx: sIdx,
    swayWeight: 0,
    swayPhase: 0,
    flutterFreq: 0,
    shadeBias: 0,
    growthOrder: 0,
  });

  // Layered flat fern rosettes (4 tiers)
  for (let t = 0; t < 4; t++) {
    const frac = t / 3;
    outSprites.push({
      x: originX + (rng() - 0.5) * 0.02 * scale,
      y: (0.02 + frac * 0.085) * scale,
      z: originZ + (rng() - 0.5) * 0.02 * scale,
      w: (0.31 - frac * 0.08) * scale,
      h: (0.31 - frac * 0.08) * scale,
      rot: rot + t * 0.95 + rng() * 0.3,
      tile: 44,
      kind: SpriteKind.Leaf,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0.22 + frac * 0.3,
      swayPhase: originX * 2 + originZ * 2 + t,
      flutterFreq: 2.3,
      shadeBias: (frac - 0.4) * 1.1,
      growthOrder: 0.1 + frac * 0.35,
    });
  }

  // Arching outer frond billboards
  for (let f = 0; f < 6; f++) {
    const a = rot + (f / 6) * Math.PI * 2 + (rng() - 0.5) * 0.25;
    outSprites.push({
      x: originX + Math.cos(a) * 0.085 * scale,
      y: (0.068 + rng() * 0.03) * scale,
      z: originZ + Math.sin(a) * 0.085 * scale,
      w: 0.15 * scale,
      h: 0.13 * scale,
      rot: (rng() - 0.5) * 0.35,
      tile: 44,
      kind: SpriteKind.Leaf,
      isSlice: 0.0,
      speciesIdx: sIdx,
      swayWeight: 0.42,
      swayPhase: a + seed,
      flutterFreq: 2.8,
      shadeBias: 0.22,
      growthOrder: 0.2 + rng() * 0.4,
    });
  }
}

function buildWildflower3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  seed: number,
  outSprites: TreeSpriteInstance[],
  outEmitters: CanopyEmitter[],
) {
  const sIdx = item.gpuIndex;
  const rng = makeRng(seed);

  outSprites.push({
    x: originX,
    y: 0.002,
    z: originZ,
    w: 0.34 * scale,
    h: 0.34 * scale,
    rot: 0,
    tile: 31,
    kind: SpriteKind.Shadow,
    isSlice: 1.0,
    speciesIdx: sIdx,
    swayWeight: 0,
    swayPhase: 0,
    flutterFreq: 0,
    shadeBias: 0,
    growthOrder: 0,
  });

  // Low leafy meadow carpet slices
  for (let i = 0; i < 3; i++) {
    outSprites.push({
      x: originX + (rng() - 0.5) * 0.04 * scale,
      y: (0.018 + i * 0.03) * scale,
      z: originZ + (rng() - 0.5) * 0.04 * scale,
      w: (0.3 - i * 0.04) * scale,
      h: (0.3 - i * 0.04) * scale,
      rot: rng() * Math.PI * 2,
      tile: 44,
      kind: SpriteKind.Leaf,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0.24 + i * 0.12,
      swayPhase: seed + i,
      flutterFreq: 2.2,
      shadeBias: -0.25 + i * 0.25,
      growthOrder: 0.1 + i * 0.2,
    });
  }

  // Upright stems and colorful wildflower blossoms
  const clusterCount = 9;
  for (let k = 0; k < clusterCount; k++) {
    const a = (k / clusterCount) * Math.PI * 2 + rng() * 0.5;
    const r = (0.04 + rng() * 0.12) * scale;
    const fx = originX + Math.cos(a) * r;
    const fz = originZ + Math.sin(a) * r;
    const fy = (0.09 + rng() * 0.085) * scale;

    outSprites.push({
      x: fx,
      y: fy * 0.65,
      z: fz,
      w: 0.1 * scale,
      h: 0.11 * scale,
      rot: (rng() - 0.5) * 0.2,
      tile: 25,
      kind: SpriteKind.Leaf,
      isSlice: 0.0,
      speciesIdx: sIdx,
      swayWeight: 0.35,
      swayPhase: a + seed,
      flutterFreq: 2.6,
      shadeBias: 0.0,
      growthOrder: 0.15,
    });

    outSprites.push({
      x: fx,
      y: fy,
      z: fz,
      w: (0.12 + rng() * 0.05) * scale,
      h: (0.12 + rng() * 0.05) * scale,
      rot: (rng() - 0.5) * 0.5,
      tile: k % 2 === 0 ? 45 : 11,
      kind: SpriteKind.Blossom,
      isSlice: 0.0,
      speciesIdx: sIdx,
      swayWeight: 0.52,
      swayPhase: a + seed * 0.7,
      flutterFreq: 3.1,
      shadeBias: 0.32,
      growthOrder: 0.25 + rng() * 0.4,
    });

    if (k % 3 === 0) {
      outEmitters.push({ x: fx, y: fy, z: fz, isBlossom: true, itemId: item.id });
    }
  }
}

function buildSwitchgrass3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  seed: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  const rng = makeRng(seed);

  outSprites.push({
    x: originX,
    y: 0.002,
    z: originZ,
    w: 0.3 * scale,
    h: 0.3 * scale,
    rot: 0,
    tile: 31,
    kind: SpriteKind.Shadow,
    isSlice: 1.0,
    speciesIdx: sIdx,
    swayWeight: 0,
    swayPhase: 0,
    flutterFreq: 0,
    shadeBias: 0,
    growthOrder: 0,
  });

  // Tall fountain-shaped grass blade billboards + feathery seed plumes
  const blades = 10;
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2 + rng() * 0.4;
    const r = (0.025 + rng() * 0.085) * scale;
    const gx = originX + Math.cos(a) * r;
    const gz = originZ + Math.sin(a) * r;
    const h = (0.16 + rng() * 0.09) * scale;

    outSprites.push({
      x: gx,
      y: h * 0.55,
      z: gz,
      w: 0.14 * scale,
      h: h,
      rot: (rng() - 0.5) * 0.24,
      tile: i % 2 === 0 ? 25 : 26,
      kind: SpriteKind.Leaf,
      isSlice: 0.0,
      speciesIdx: sIdx,
      swayWeight: 0.62,
      swayPhase: a + seed,
      flutterFreq: 3.4 + rng(),
      shadeBias: (rng() - 0.3) * 0.7,
      growthOrder: 0.12 + rng() * 0.35,
    });

    if (i % 2 === 0) {
      outSprites.push({
        x: gx + Math.cos(a) * 0.025 * scale,
        y: h * 1.05,
        z: gz + Math.sin(a) * 0.025 * scale,
        w: 0.095 * scale,
        h: 0.11 * scale,
        rot: (rng() - 0.5) * 0.3,
        tile: 26,
        kind: SpriteKind.Blossom,
        isSlice: 0.0,
        speciesIdx: sIdx,
        swayWeight: 0.85,
        swayPhase: a + seed * 1.1,
        flutterFreq: 4.2,
        shadeBias: 0.38,
        growthOrder: 0.25 + rng() * 0.3,
      });
    }
  }
}

function buildRaisedBed3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  seed: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  const rng = makeRng(seed);

  // Ground shadow under 4x8 ft cedar planter (0.4 x 0.8 world units)
  for (const lx of [-0.18, 0.18]) {
    const [sx, sz] = rotOffset(originX, originZ, lx * scale, 0, rot);
    outSprites.push({
      x: sx,
      y: 0.002,
      z: sz,
      w: 0.44 * scale,
      h: 0.44 * scale,
      rot,
      tile: 31,
      kind: SpriteKind.Shadow,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0,
      swayPhase: 0,
      flutterFreq: 0,
      shadeBias: 0,
      growthOrder: 0,
    });
  }

  // Stacked cedar timber planter box + soil core (5 layers high)
  for (let layer = 0; layer < 5; layer++) {
    const y = (0.01 + layer * 0.022) * scale;
    for (const lx of [-0.21, 0.0, 0.21]) {
      const [bx, bz] = rotOffset(originX, originZ, lx * scale, 0, rot);
      outSprites.push({
        x: bx,
        y,
        z: bz,
        w: 0.26 * scale,
        h: 0.36 * scale,
        rot,
        tile: layer === 4 ? 46 : 41,
        kind: SpriteKind.Bark,
        isSlice: 1.0,
        speciesIdx: sIdx,
        swayWeight: 0,
        swayPhase: 0,
        flutterFreq: 0,
        shadeBias: -0.3 + layer * 0.16,
        growthOrder: 0,
      });
    }
  }

  // Lush planted culinary herb & vegetable rows atop the soil bed
  for (let col = -2; col <= 2; col++) {
    for (const row of [-0.08, 0.08]) {
      const [px, pz] = rotOffset(
        originX,
        originZ,
        col * 0.125 * scale,
        row * scale,
        rot,
      );
      outSprites.push({
        x: px,
        y: (0.125 + rng() * 0.025) * scale,
        z: pz,
        w: 0.115 * scale,
        h: 0.115 * scale,
        rot: rng() * Math.PI * 2,
        tile: (col + 4) % 2 === 0 ? 44 : 4,
        kind: SpriteKind.Leaf,
        isSlice: 0.0,
        speciesIdx: sIdx,
        swayWeight: 0.22,
        swayPhase: col + row * 10,
        flutterFreq: 2.2,
        shadeBias: 0.18 + (rng() - 0.5) * 0.25,
        growthOrder: 0.15 + rng() * 0.3,
      });

      if ((col + 5) % 2 === 0 && row > 0) {
        outSprites.push({
          x: px,
          y: 0.155 * scale,
          z: pz,
          w: 0.085 * scale,
          h: 0.085 * scale,
          rot: rng() * 0.6,
          tile: 45,
          kind: SpriteKind.Blossom,
          isSlice: 0.0,
          speciesIdx: sIdx,
          swayWeight: 0.32,
          swayPhase: col * 1.4,
          flutterFreq: 2.7,
          shadeBias: 0.35,
          growthOrder: 0.3,
        });
      }
    }
  }
}

function buildPond3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  seed: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  const rng = makeRng(seed);

  // Subtle recessed basin rim shadow
  outSprites.push({
    x: originX,
    y: 0.002,
    z: originZ,
    w: 1.04 * scale,
    h: 0.92 * scale,
    rot,
    tile: 31,
    kind: SpriteKind.Shadow,
    isSlice: 1.0,
    speciesIdx: sIdx,
    swayWeight: 0,
    swayPhase: 0,
    flutterFreq: 0,
    shadeBias: 0,
    growthOrder: 0,
  });

  // Shimmering water surface composed of layered water tiles (tinted by pond's Leaf azure-jade palette)
  const waterNodes: [number, number, number][] = [
    [0, 0, 0.66],
    [-0.22, -0.08, 0.44],
    [0.24, 0.06, 0.46],
    [-0.08, 0.2, 0.42],
    [0.14, -0.18, 0.4],
  ];
  for (let i = 0; i < waterNodes.length; i++) {
    const [lx, lz, sz] = waterNodes[i];
    const [wx, wz] = rotOffset(originX, originZ, lx * scale, lz * scale, rot);
    outSprites.push({
      x: wx,
      y: 0.009 + i * 0.0012,
      z: wz,
      w: sz * scale,
      h: sz * scale,
      rot: rot + i * 0.6,
      tile: 39,
      kind: SpriteKind.Leaf,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0.02,
      swayPhase: i * 1.4,
      flutterFreq: 1.2,
      shadeBias: i === 0 ? 0.15 : -0.05,
      growthOrder: 0,
    });
  }

  // Natural fieldstone edging stones around pond perimeter
  const rimStones = 14;
  for (let i = 0; i < rimStones; i++) {
    const a = (i / rimStones) * Math.PI * 2 + (rng() - 0.5) * 0.18;
    const rx = (0.41 + (rng() - 0.5) * 0.05) * scale;
    const rz = (0.35 + (rng() - 0.5) * 0.05) * scale;
    const [sx, sz] = rotOffset(originX, originZ, Math.cos(a) * rx, Math.sin(a) * rz, rot);
    const stSz = (0.13 + rng() * 0.06) * scale;
    for (let h = 0; h < 2; h++) {
      outSprites.push({
        x: sx,
        y: (0.012 + h * 0.02) * scale,
        z: sz,
        w: stSz * (1 - h * 0.15),
        h: stSz * (0.85 - h * 0.15),
        rot: a + h * 0.3,
        tile: 32,
        kind: SpriteKind.Bark,
        isSlice: 1.0,
        speciesIdx: sIdx,
        swayWeight: 0,
        swayPhase: 0,
        flutterFreq: 0,
        shadeBias: -0.15 + h * 0.35,
        growthOrder: 0,
      });
    }
  }

  // Floating lily pads & lotus blossoms
  const pads = 5;
  for (let p = 0; p < pads; p++) {
    const a = (p / pads) * Math.PI * 2 + rng() * 0.8;
    const r = (0.1 + rng() * 0.16) * scale;
    const [px, pz] = rotOffset(originX, originZ, Math.cos(a) * r, Math.sin(a) * r, rot);
    outSprites.push({
      x: px,
      y: 0.019 * scale,
      z: pz,
      w: (0.12 + rng() * 0.04) * scale,
      h: (0.12 + rng() * 0.04) * scale,
      rot: rng() * Math.PI * 2,
      tile: 40,
      kind: SpriteKind.Leaf,
      isSlice: 1.0,
      speciesIdx: 6, // lush azalea green for lily pads!
      swayWeight: 0.06,
      swayPhase: p * 1.9,
      flutterFreq: 1.5,
      shadeBias: 0.22,
      growthOrder: 0.15,
    });

    if (p < 2) {
      outSprites.push({
        x: px,
        y: 0.03 * scale,
        z: pz,
        w: 0.075 * scale,
        h: 0.075 * scale,
        rot: rng() * Math.PI * 2,
        tile: 10,
        kind: SpriteKind.Blossom,
        isSlice: 0.0,
        speciesIdx: sIdx,
        swayWeight: 0.08,
        swayPhase: p * 2.3,
        flutterFreq: 1.6,
        shadeBias: 0.45,
        growthOrder: 0.2,
      });
    }
  }
}

function buildWaterBasin3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  seed: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;

  outSprites.push({
    x: originX,
    y: 0.002,
    z: originZ,
    w: 0.28 * scale,
    h: 0.28 * scale,
    rot: 0,
    tile: 31,
    kind: SpriteKind.Shadow,
    isSlice: 1.0,
    speciesIdx: sIdx,
    swayWeight: 0,
    swayPhase: 0,
    flutterFreq: 0,
    shadeBias: 0,
    growthOrder: 0,
  });

  // Carved stone pedestal & bowl (9 slices)
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const rad =
      t < 0.35
        ? 0.08 + (0.35 - t) * 0.08
        : 0.08 + (t - 0.35) * 0.14;
    outSprites.push({
      x: originX,
      y: (0.01 + i * 0.016) * scale,
      z: originZ,
      w: rad * 2 * scale,
      h: rad * 2 * scale,
      rot: i * 0.3,
      tile: 32,
      kind: SpriteKind.Bark,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0,
      swayPhase: 0,
      flutterFreq: 0,
      shadeBias: -0.25 + t * 0.55,
      growthOrder: 0,
    });
  }

  // Water mirror inside basin
  outSprites.push({
    x: originX,
    y: 0.146 * scale,
    z: originZ,
    w: 0.24 * scale,
    h: 0.24 * scale,
    rot: seed * 0.2,
    tile: 39,
    kind: SpriteKind.Leaf,
    isSlice: 1.0,
    speciesIdx: sIdx,
    swayWeight: 0.02,
    swayPhase: seed,
    flutterFreq: 1.3,
    shadeBias: 0.4,
    growthOrder: 0,
  });

  // Floating blossom
  outSprites.push({
    x: originX + 0.022 * scale,
    y: 0.158 * scale,
    z: originZ - 0.016 * scale,
    w: 0.068 * scale,
    h: 0.068 * scale,
    rot: 0.4,
    tile: 10,
    kind: SpriteKind.Blossom,
    isSlice: 0.0,
    speciesIdx: sIdx,
    swayWeight: 0.05,
    swayPhase: seed,
    flutterFreq: 1.5,
    shadeBias: 0.45,
    growthOrder: 0.1,
  });
}

function buildSteppingStone3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  outSprites.push({
    x: originX,
    y: 0.002,
    z: originZ,
    w: 0.26 * scale,
    h: 0.22 * scale,
    rot,
    tile: 31,
    kind: SpriteKind.Shadow,
    isSlice: 1.0,
    speciesIdx: sIdx,
    swayWeight: 0,
    swayPhase: 0,
    flutterFreq: 0,
    shadeBias: 0,
    growthOrder: 0,
  });
  for (let i = 0; i < 3; i++) {
    outSprites.push({
      x: originX,
      y: (0.008 + i * 0.009) * scale,
      z: originZ,
      w: (0.24 - i * 0.012) * scale,
      h: (0.2 - i * 0.01) * scale,
      rot,
      tile: 37,
      kind: SpriteKind.Bark,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0,
      swayPhase: 0,
      flutterFreq: 0,
      shadeBias: -0.1 + i * 0.25,
      growthOrder: 0,
    });
  }
}

function buildBench3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;

  // Ground shadow
  for (const lx of [-0.14, 0.14]) {
    const [sx, sz] = rotOffset(originX, originZ, lx * scale, 0, rot);
    outSprites.push({
      x: sx,
      y: 0.002,
      z: sz,
      w: 0.28 * scale,
      h: 0.24 * scale,
      rot,
      tile: 31,
      kind: SpriteKind.Shadow,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0,
      swayPhase: 0,
      flutterFreq: 0,
      shadeBias: 0,
      growthOrder: 0,
    });
  }

  // Four cedar legs (6 slices up to seat height 0.09)
  const legPts: [number, number][] = [
    [-0.19, -0.06],
    [0.19, -0.06],
    [-0.19, 0.06],
    [0.19, 0.06],
  ];
  for (const [lx, lz] of legPts) {
    const [px, pz] = rotOffset(originX, originZ, lx * scale, lz * scale, rot);
    for (let i = 0; i < 6; i++) {
      outSprites.push({
        x: px,
        y: (0.01 + i * 0.015) * scale,
        z: pz,
        w: 0.042 * scale,
        h: 0.042 * scale,
        rot,
        tile: 33,
        kind: SpriteKind.Bark,
        isSlice: 1.0,
        speciesIdx: sIdx,
        swayWeight: 0,
        swayPhase: 0,
        flutterFreq: 0,
        shadeBias: -0.25 + i * 0.05,
        growthOrder: 0,
      });
    }
  }

  // Seat planks (2 slices thick across 3 segments)
  for (let s = 0; s < 2; s++) {
    for (const lx of [-0.15, 0.0, 0.15]) {
      const [px, pz] = rotOffset(originX, originZ, lx * scale, 0, rot);
      outSprites.push({
        x: px,
        y: (0.095 + s * 0.014) * scale,
        z: pz,
        w: 0.18 * scale,
        h: 0.17 * scale,
        rot,
        tile: 41,
        kind: SpriteKind.Bark,
        isSlice: 1.0,
        speciesIdx: sIdx,
        swayWeight: 0,
        swayPhase: 0,
        flutterFreq: 0,
        shadeBias: 0.15 + s * 0.18,
        growthOrder: 0,
      });
    }
  }

  // Backrest posts + slatted back rails along local -Z edge
  for (const lx of [-0.19, 0.19]) {
    const [px, pz] = rotOffset(originX, originZ, lx * scale, -0.072 * scale, rot);
    for (let i = 0; i < 6; i++) {
      outSprites.push({
        x: px,
        y: (0.115 + i * 0.016) * scale,
        z: pz,
        w: 0.04 * scale,
        h: 0.04 * scale,
        rot,
        tile: 33,
        kind: SpriteKind.Bark,
        isSlice: 1.0,
        speciesIdx: sIdx,
        swayWeight: 0,
        swayPhase: 0,
        flutterFreq: 0,
        shadeBias: 0.05 + i * 0.04,
        growthOrder: 0,
      });
    }
  }
  for (const by of [0.15, 0.192]) {
    for (const lx of [-0.15, 0.0, 0.15]) {
      const [px, pz] = rotOffset(originX, originZ, lx * scale, -0.076 * scale, rot);
      outSprites.push({
        x: px,
        y: by * scale,
        z: pz,
        w: 0.18 * scale,
        h: 0.044 * scale,
        rot,
        tile: 43,
        kind: SpriteKind.Bark,
        isSlice: 1.0,
        speciesIdx: sIdx,
        swayWeight: 0,
        swayPhase: 0,
        flutterFreq: 0,
        shadeBias: 0.25,
        growthOrder: 0,
      });
    }
  }
}

function buildPergola3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  seed: number,
  outSprites: TreeSpriteInstance[],
  outEmitters: CanopyEmitter[],
) {
  const sIdx = item.gpuIndex;
  const rng = makeRng(seed);
  const half = 0.42 * scale;
  const postH = 0.62 * scale;

  // Soft footprint shadow
  outSprites.push({
    x: originX,
    y: 0.002,
    z: originZ,
    w: 1.06 * scale,
    h: 1.06 * scale,
    rot,
    tile: 31,
    kind: SpriteKind.Shadow,
    isSlice: 1.0,
    speciesIdx: sIdx,
    swayWeight: 0,
    swayPhase: 0,
    flutterFreq: 0,
    shadeBias: 0,
    growthOrder: 0,
  });

  // 4 corner timber columns
  const corners: [number, number][] = [
    [-half, -half],
    [half, -half],
    [-half, half],
    [half, half],
  ];
  const postSlices = 22;
  for (const [cx, cz] of corners) {
    const [px, pz] = rotOffset(originX, originZ, cx, cz, rot);
    for (let i = 0; i <= postSlices; i++) {
      const f = i / postSlices;
      outSprites.push({
        x: px,
        y: 0.01 + f * postH,
        z: pz,
        w: (i === 0 ? 0.095 : 0.068) * scale,
        h: (i === 0 ? 0.095 : 0.068) * scale,
        rot,
        tile: 33,
        kind: SpriteKind.Bark,
        isSlice: 1.0,
        speciesIdx: sIdx,
        swayWeight: 0,
        swayPhase: 0,
        flutterFreq: 0,
        shadeBias: -0.2 + f * 0.35,
        growthOrder: 0,
      });
    }
  }

  // Overhead perimeter beams (left & right headers)
  for (const side of [-half, half]) {
    for (let s = -4; s <= 4; s++) {
      const [bx, bz] = rotOffset(originX, originZ, s * 0.118 * scale, side, rot);
      for (let h = 0; h < 2; h++) {
        outSprites.push({
          x: bx,
          y: postH + (0.01 + h * 0.022) * scale,
          z: bz,
          w: 0.15 * scale,
          h: 0.068 * scale,
          rot,
          tile: 43,
          kind: SpriteKind.Bark,
          isSlice: 1.0,
          speciesIdx: sIdx,
          swayWeight: 0,
          swayPhase: 0,
          flutterFreq: 0,
          shadeBias: 0.18 + h * 0.15,
          growthOrder: 0,
        });
      }
    }
  }

  // 6 cross rafters spanning the roof
  for (let r = 0; r < 6; r++) {
    const rx = (-0.45 + (r / 5) * 0.9) * scale;
    for (let s = -4; s <= 4; s++) {
      const [bx, bz] = rotOffset(originX, originZ, rx, s * 0.12 * scale, rot);
      outSprites.push({
        x: bx,
        y: postH + 0.052 * scale,
        z: bz,
        w: 0.06 * scale,
        h: 0.15 * scale,
        rot,
        tile: 41,
        kind: SpriteKind.Bark,
        isSlice: 1.0,
        speciesIdx: sIdx,
        swayWeight: 0,
        swayPhase: 0,
        flutterFreq: 0,
        shadeBias: 0.35,
        growthOrder: 0,
      });
    }
  }

  // Climbing wisteria foliage & pendulous spring blooms draping along rafters
  for (let v = 0; v < 20; v++) {
    const lx = (rng() - 0.5) * 0.96 * scale;
    const lz = (rng() - 0.5) * 0.96 * scale;
    const [vx, vz] = rotOffset(originX, originZ, lx, lz, rot);
    const vy = postH + (0.03 + (rng() - 0.3) * 0.07) * scale;
    outSprites.push({
      x: vx,
      y: vy,
      z: vz,
      w: (0.14 + rng() * 0.06) * scale,
      h: (0.14 + rng() * 0.06) * scale,
      rot: rng() * Math.PI * 2,
      tile: 4,
      kind: SpriteKind.Leaf,
      isSlice: 0.0,
      speciesIdx: sIdx,
      swayWeight: 0.25,
      swayPhase: rng() * Math.PI * 2,
      flutterFreq: 2.3,
      shadeBias: 0.2,
      growthOrder: 0.2 + rng() * 0.5,
    });
    if (v % 2 === 0) {
      outSprites.push({
        x: vx,
        y: vy - 0.03 * scale,
        z: vz,
        w: 0.12 * scale,
        h: 0.13 * scale,
        rot: (rng() - 0.5) * 0.4,
        tile: 11,
        kind: SpriteKind.Blossom,
        isSlice: 0.0,
        speciesIdx: sIdx,
        swayWeight: 0.35,
        swayPhase: rng() * Math.PI * 2,
        flutterFreq: 2.6,
        shadeBias: 0.32,
        growthOrder: 0.25 + rng() * 0.5,
      });
      if (v % 4 === 0) {
        outEmitters.push({ x: vx, y: vy, z: vz, isBlossom: true, itemId: item.id });
      }
    }
  }
}

function buildStoneWall3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  seed: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  const rng = makeRng(seed);

  // 8 ft linear stone wall (0.8 world units long)
  for (const lx of [-0.24, 0, 0.24]) {
    const [sx, sz] = rotOffset(originX, originZ, lx * scale, 0, rot);
    outSprites.push({
      x: sx,
      y: 0.002,
      z: sz,
      w: 0.34 * scale,
      h: 0.24 * scale,
      rot,
      tile: 31,
      kind: SpriteKind.Shadow,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0,
      swayPhase: 0,
      flutterFreq: 0,
      shadeBias: 0,
      growthOrder: 0,
    });
  }

  // 5 stacked dry-stack fieldstone courses
  const courses = 5;
  const blocksPerCourse = 5;
  for (let c = 0; c < courses; c++) {
    const stagger = c % 2 === 0 ? 0 : 0.05;
    for (let b = 0; b < blocksPerCourse; b++) {
      const lx = (-0.32 + (b / (blocksPerCourse - 1)) * 0.64 + (b < blocksPerCourse - 1 ? stagger : -stagger * 0.4)) * scale;
      const [bx, bz] = rotOffset(originX, originZ, lx, (rng() - 0.5) * 0.014 * scale, rot);
      outSprites.push({
        x: bx,
        y: (0.014 + c * 0.032) * scale,
        z: bz,
        w: 0.175 * scale,
        h: 0.14 * scale,
        rot: rot + (rng() - 0.5) * 0.05,
        tile: 42,
        kind: SpriteKind.Bark,
        isSlice: 1.0,
        speciesIdx: sIdx,
        swayWeight: 0,
        swayPhase: 0,
        flutterFreq: 0,
        shadeBias: -0.3 + c * 0.18,
        growthOrder: 0,
      });
    }
  }

  // Moss tufts tucked along capstones
  for (let m = 0; m < 3; m++) {
    const lx = (-0.24 + m * 0.24 + (rng() - 0.5) * 0.08) * scale;
    const [mx, mz] = rotOffset(originX, originZ, lx, 0, rot);
    outSprites.push({
      x: mx,
      y: 0.172 * scale,
      z: mz,
      w: 0.095 * scale,
      h: 0.08 * scale,
      rot: rng() * Math.PI,
      tile: 4,
      kind: SpriteKind.Leaf,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0,
      swayPhase: 0,
      flutterFreq: 0,
      shadeBias: 0.35,
      growthOrder: 0,
    });
  }
}

function buildFence3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;

  // Ground shadow
  for (const lx of [-0.36, 0.36]) {
    const [sx, sz] = rotOffset(originX, originZ, lx * scale, 0, rot);
    outSprites.push({
      x: sx,
      y: 0.002,
      z: sz,
      w: 0.14 * scale,
      h: 0.14 * scale,
      rot,
      tile: 31,
      kind: SpriteKind.Shadow,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0,
      swayPhase: 0,
      flutterFreq: 0,
      shadeBias: 0,
      growthOrder: 0,
    });
  }

  // Two end cedar posts (12 slices tall = ~2.6 ft)
  for (const lx of [-0.36, 0.36]) {
    const [px, pz] = rotOffset(originX, originZ, lx * scale, 0, rot);
    for (let i = 0; i < 12; i++) {
      outSprites.push({
        x: px,
        y: (0.01 + i * 0.022) * scale,
        z: pz,
        w: 0.056 * scale,
        h: 0.056 * scale,
        rot,
        tile: 33,
        kind: SpriteKind.Bark,
        isSlice: 1.0,
        speciesIdx: sIdx,
        swayWeight: 0,
        swayPhase: 0,
        flutterFreq: 0,
        shadeBias: -0.15 + i * 0.04,
        growthOrder: 0,
      });
    }
  }

  // Twin horizontal split-rails
  for (const ry of [0.105, 0.21]) {
    for (let s = -3; s <= 3; s++) {
      const [rx, rz] = rotOffset(originX, originZ, s * 0.115 * scale, 0, rot);
      outSprites.push({
        x: rx,
        y: ry * scale,
        z: rz,
        w: 0.14 * scale,
        h: 0.042 * scale,
        rot,
        tile: 43,
        kind: SpriteKind.Bark,
        isSlice: 1.0,
        speciesIdx: sIdx,
        swayWeight: 0,
        swayPhase: 0,
        flutterFreq: 0,
        shadeBias: 0.15,
        growthOrder: 0,
      });
    }
  }
}

function buildPavilion3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  seed: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  const half = 0.5 * scale;
  const colH = 0.66 * scale;

  // Ground shadow
  outSprites.push({
    x: originX,
    y: 0.002,
    z: originZ,
    w: 1.38 * scale,
    h: 1.38 * scale,
    rot,
    tile: 31,
    kind: SpriteKind.Shadow,
    isSlice: 1.0,
    speciesIdx: sIdx,
    swayWeight: 0,
    swayPhase: 0,
    flutterFreq: 0,
    shadeBias: 0,
    growthOrder: 0,
  });

  // Raised timber deck platform (3x3 tiles, 2 layers thick)
  for (let layer = 0; layer < 2; layer++) {
    for (const gx of [-0.34, 0, 0.34]) {
      for (const gz of [-0.34, 0, 0.34]) {
        const [dx, dz] = rotOffset(originX, originZ, gx * scale, gz * scale, rot);
        outSprites.push({
          x: dx,
          y: (0.01 + layer * 0.018) * scale,
          z: dz,
          w: 0.38 * scale,
          h: 0.38 * scale,
          rot,
          tile: 41,
          kind: SpriteKind.Bark,
          isSlice: 1.0,
          speciesIdx: sIdx,
          swayWeight: 0,
          swayPhase: 0,
          flutterFreq: 0,
          shadeBias: -0.15 + layer * 0.25,
          growthOrder: 0,
        });
      }
    }
  }

  // 4 slender cedar corner columns
  const corners: [number, number][] = [
    [-half, -half],
    [half, -half],
    [-half, half],
    [half, half],
  ];
  for (const [cx, cz] of corners) {
    const [px, pz] = rotOffset(originX, originZ, cx, cz, rot);
    for (let i = 0; i <= 22; i++) {
      const f = i / 22;
      outSprites.push({
        x: px,
        y: 0.04 * scale + f * colH,
        z: pz,
        w: 0.064 * scale,
        h: 0.064 * scale,
        rot,
        tile: 33,
        kind: SpriteKind.Bark,
        isSlice: 1.0,
        speciesIdx: sIdx,
        swayWeight: 0,
        swayPhase: 0,
        flutterFreq: 0,
        shadeBias: -0.1 + f * 0.3,
        growthOrder: 0,
      });
    }
  }

  // Warm suspended interior tea lantern
  for (let i = 0; i < 4; i++) {
    outSprites.push({
      x: originX,
      y: colH - (0.08 - i * 0.016) * scale,
      z: originZ,
      w: 0.095 * scale,
      h: 0.095 * scale,
      rot,
      tile: 34,
      kind: SpriteKind.EmissiveGlow,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0.03,
      swayPhase: seed,
      flutterFreq: 2.4,
      shadeBias: 0.65,
      growthOrder: 0,
    });
  }

  // Stepped pyramidal glazed-glass & cedar lattice roof (7 tapered tiers)
  for (let t = 0; t < 7; t++) {
    const frac = t / 6;
    const tierW = (1.28 - frac * 0.86) * scale;
    const isGlass = t > 0 && t < 6;
    outSprites.push({
      x: originX,
      y: colH + (0.045 + t * 0.034) * scale,
      z: originZ,
      w: tierW,
      h: tierW,
      rot,
      tile: isGlass ? 47 : 41,
      kind: isGlass ? SpriteKind.Leaf : SpriteKind.Bark,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0,
      swayPhase: 0,
      flutterFreq: 0,
      shadeBias: 0.1 + frac * 0.45,
      growthOrder: 0,
    });
  }
}

function buildDeckTile3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  outSprites.push({
    x: originX,
    y: 0.002,
    z: originZ,
    w: 0.66 * scale,
    h: 0.66 * scale,
    rot,
    tile: 31,
    kind: SpriteKind.Shadow,
    isSlice: 1.0,
    speciesIdx: sIdx,
    swayWeight: 0,
    swayPhase: 0,
    flutterFreq: 0,
    shadeBias: 0,
    growthOrder: 0,
  });

  for (let layer = 0; layer < 3; layer++) {
    outSprites.push({
      x: originX,
      y: (0.008 + layer * 0.014) * scale,
      z: originZ,
      w: 0.6 * scale,
      h: 0.6 * scale,
      rot,
      tile: 41,
      kind: SpriteKind.Bark,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0,
      swayPhase: 0,
      flutterFreq: 0,
      shadeBias: -0.2 + layer * 0.25,
      growthOrder: 0,
    });
  }
}

function buildShrub3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  seed: number,
  outSprites: TreeSpriteInstance[],
  outEmitters: CanopyEmitter[],
) {
  const rng = makeRng(seed);
  const sIdx = item.gpuIndex;
  const arch = item.architecture;

  outSprites.push({
    x: originX,
    y: 0.002,
    z: originZ,
    w: 0.56 * scale,
    h: 0.56 * scale,
    rot: 0,
    tile: 31,
    kind: SpriteKind.Shadow,
    isSlice: 1.0,
    speciesIdx: sIdx,
    swayWeight: 0,
    swayPhase: 0,
    flutterFreq: 0,
    shadeBias: 0,
    growthOrder: 0,
  });

  for (let b = 0; b < 5; b++) {
    const a = (b / 5) * Math.PI * 2 + rng() * 0.5;
    for (let s = 0; s < 5; s++) {
      const f = s / 4;
      outSprites.push({
        x: originX + Math.cos(a) * f * 0.14 * scale,
        y: (0.015 + f * 0.11) * scale,
        z: originZ + Math.sin(a) * f * 0.14 * scale,
        w: (0.038 - f * 0.016) * scale,
        h: (0.038 - f * 0.016) * scale,
        rot: a,
        tile: arch.barkTile,
        kind: SpriteKind.Bark,
        isSlice: 1.0,
        speciesIdx: sIdx,
        swayWeight: f * 0.12,
        swayPhase: a,
        flutterFreq: 0,
        shadeBias: -0.45,
        growthOrder: 0,
      });
    }
  }

  const sliceCount = 8;
  for (let i = 0; i < sliceCount; i++) {
    const t = i / (sliceCount - 1);
    const radius = Math.sqrt(Math.max(0.12, 1 - Math.pow(t, 1.8) * 0.85)) * 0.44 * scale;
    outSprites.push({
      x: originX + (rng() - 0.5) * 0.03 * scale,
      y: (0.04 + t * 0.28) * scale,
      z: originZ + (rng() - 0.5) * 0.03 * scale,
      w: radius,
      h: radius,
      rot: rng() * Math.PI * 2,
      tile: 30,
      kind: SpriteKind.Leaf,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: 0.14 + t * 0.35,
      swayPhase: rng() * Math.PI * 2,
      flutterFreq: 2.0,
      shadeBias: (t - 0.45) * 1.1,
      growthOrder: 0.1 + t * 0.35,
    });
  }

  const puffs = 24;
  for (let k = 0; k < puffs; k++) {
    const phi = rng() * Math.PI * 2;
    const elev = rng() * (Math.PI * 0.46);
    const r = (0.14 + rng() * 0.12) * scale;
    const px = originX + Math.cos(phi) * Math.cos(elev) * r;
    const pz = originZ + Math.sin(phi) * Math.cos(elev) * r;
    const py = (0.06 + Math.sin(elev) * 0.26) * scale;
    const puffSz = (0.14 + rng() * 0.07) * scale;

    outSprites.push({
      x: px,
      y: py,
      z: pz,
      w: puffSz,
      h: puffSz,
      rot: (rng() - 0.5) * 0.6,
      tile: arch.leafTiles[k % 2],
      kind: SpriteKind.Leaf,
      isSlice: 0.0,
      speciesIdx: sIdx,
      swayWeight: 0.25 + (py / (0.34 * scale)) * 0.35,
      swayPhase: rng() * Math.PI * 2,
      flutterFreq: 2.2 + rng() * 1.8,
      shadeBias: (py / (0.34 * scale)) * 1.2 - 0.45,
      growthOrder: 0.2 + rng() * 0.65,
    });

    if (k % 3 === 0) {
      outSprites.push({
        x: px,
        y: py + 0.01 * scale,
        z: pz,
        w: puffSz * 0.72,
        h: puffSz * 0.72,
        rot: rng() * Math.PI * 2,
        tile: arch.blossomTiles[k % 2],
        kind: SpriteKind.Blossom,
        isSlice: 0.0,
        speciesIdx: sIdx,
        swayWeight: 0.3 + (py / (0.34 * scale)) * 0.3,
        swayPhase: rng() * Math.PI * 2,
        flutterFreq: 2.4,
        shadeBias: 0.25,
        growthOrder: 0.3 + rng() * 0.6,
      });
      outEmitters.push({ x: px, y: py, z: pz, isBlossom: true, itemId: item.id });
    }
  }
}

function buildTree3D(
  species: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  seed: number,
  detailLevel: 'full' | 'medium',
  outSprites: TreeSpriteInstance[],
  outEmitters: CanopyEmitter[],
) {
  const rng = makeRng(seed);
  const arch = species.architecture;
  const sIdx = species.gpuIndex;
  const isFull = detailLevel === 'full';

  outSprites.push({
    x: originX,
    y: 0.002,
    z: originZ,
    w: arch.crownWidth * 0.88 * scale,
    h: arch.crownWidth * 0.88 * scale,
    rot: 0,
    tile: 31,
    kind: SpriteKind.Shadow,
    isSlice: 1.0,
    speciesIdx: sIdx,
    swayWeight: 0,
    swayPhase: 0,
    flutterFreq: 0,
    shadeBias: 0,
    growthOrder: 0,
  });

  const rootCount = isFull ? 5 : 3;
  for (let r = 0; r < rootCount; r++) {
    const ra = rot + (r / rootCount) * Math.PI * 2 + (rng() - 0.5) * 0.45;
    const steps = isFull ? 5 : 3;
    for (let s = 0; s < steps; s++) {
      const f = s / steps;
      const dist = (0.014 + f * arch.trunkBaseRadius * 1.4) * scale;
      const rad = arch.trunkBaseRadius * (0.72 - f * 0.42) * scale;
      outSprites.push({
        x: originX + Math.cos(ra) * dist,
        y: (0.008 + (1 - f) * 0.022) * scale,
        z: originZ + Math.sin(ra) * dist,
        w: rad * 2.1,
        h: rad * 2.1,
        rot: ra,
        tile: arch.barkTile,
        kind: SpriteKind.Bark,
        isSlice: 1.0,
        speciesIdx: sIdx,
        swayWeight: 0,
        swayPhase: 0,
        flutterFreq: 0,
        shadeBias: -0.35,
        growthOrder: 0,
      });
    }
  }

  const trunkH = arch.trunkHeight * scale;
  const trunkSteps = isFull ? Math.round(trunkH * 100) : Math.round(trunkH * 66);
  const leanX = (species.id === 'white-oak' ? 0.065 : (rng() - 0.5) * arch.trunkTwist * 0.55) * scale;
  const leanZ = (rng() - 0.5) * arch.trunkTwist * 0.45 * scale;

  let topX = originX;
  let topY = trunkH;
  let topZ = originZ;

  const trunkNodes: { x: number; y: number; z: number; rad: number; frac: number }[] = [];

  for (let i = 0; i <= trunkSteps; i++) {
    const t = i / trunkSteps;
    const px = originX + Math.sin(t * Math.PI * 0.9) * leanX + Math.sin(t * 5.2) * arch.trunkTwist * 0.016 * scale;
    const pz = originZ + Math.sin(t * Math.PI * 0.85) * leanZ + Math.cos(t * 4.4) * arch.trunkTwist * 0.014 * scale;
    const py = t * trunkH;
    const rad =
      (arch.trunkBaseRadius * (1 - t) + arch.trunkTopRadius * t) *
      (1 + Math.pow(1 - t, 3.2) * 0.52) *
      scale;

    outSprites.push({
      x: px,
      y: py,
      z: pz,
      w: rad * 2.08,
      h: rad * 2.08,
      rot: rot + t * 1.4,
      tile: arch.barkTile,
      kind: SpriteKind.Bark,
      isSlice: 1.0,
      speciesIdx: sIdx,
      swayWeight: Math.pow(t, 1.5) * 0.22,
      swayPhase: t * 0.8 + seed * 0.1,
      flutterFreq: 0,
      shadeBias: (t - 0.5) * 0.25,
      growthOrder: 0,
    });

    if (t > 0.36 && i % Math.max(3, Math.floor(trunkSteps / 6)) === 0) {
      trunkNodes.push({ x: px, y: py, z: pz, rad, frac: t });
    }
    topX = px;
    topY = py;
    topZ = pz;
  }

  const tips: BranchTip3D[] = [];
  const cauliflorousNodes: { x: number; y: number; z: number; sway: number }[] = [];

  const drawLimb3D = (
    sx: number,
    sy: number,
    sz: number,
    azimuth: number,
    elev: number,
    length: number,
    startRad: number,
    endRad: number,
    baseSway: number,
    depth: number,
    tier: number,
  ) => {
    const segs = isFull ? (depth === 0 ? 16 : 9) : (depth === 0 ? 11 : 6);
    let cx = sx;
    let cy = sy;
    let cz = sz;
    let curAz = azimuth;
    let curEl = elev;
    const azCurve = (rng() - 0.5) * 0.52;
    const elCurve = (rng() - 0.5) * 0.22 - arch.weepingDroop * (depth > 0 ? 0.65 : 0.22);

    for (let i = 1; i <= segs; i++) {
      const f = i / segs;
      curAz += azCurve / segs;
      curEl += (elCurve / segs) * (1 + f * 0.75);

      const step = length / segs;
      const horiz = Math.cos(curEl) * step;
      cx += Math.cos(curAz) * horiz;
      cz += Math.sin(curAz) * horiz;
      cy += Math.sin(curEl) * step;

      const rad = (startRad * (1 - f) + endRad * f) * scale;
      const sway = baseSway + f * 0.32;

      outSprites.push({
        x: cx,
        y: Math.max(0.08 * scale, cy),
        z: cz,
        w: rad * 2.1,
        h: rad * 2.1,
        rot: curAz,
        tile: arch.barkTile,
        kind: SpriteKind.Bark,
        isSlice: 1.0,
        speciesIdx: sIdx,
        swayWeight: sway,
        swayPhase: cx * 1.4 + cz * 1.2 + f,
        flutterFreq: 0,
        shadeBias: Math.sin(curEl) * 0.35,
        growthOrder: 0,
      });

      if (arch.cauliflorous && f > 0.3 && i % 3 === 0) {
        cauliflorousNodes.push({ x: cx, y: cy, z: cz, sway });
      }

      if (depth === 0 && (i === Math.floor(segs * 0.54) || i === Math.floor(segs * 0.84))) {
        const side = i % 2 === 0 ? 1 : -1;
        drawLimb3D(
          cx,
          cy,
          cz,
          curAz + side * (0.55 + rng() * 0.35),
          curEl + (rng() - 0.35) * 0.3,
          length * (0.46 + rng() * 0.16),
          rad * 0.86,
          rad * 0.34,
          sway,
          1,
          tier,
        );
      }
    }

    if (depth === 1) {
      tips.push({
        x: cx,
        y: Math.max(0.12 * scale, cy),
        z: cz,
        swayWeight: baseSway + 0.42,
        tier,
      });
    }
    if (depth === 0) {
      for (const s of [-1, 1]) {
        drawLimb3D(
          cx,
          cy,
          cz,
          curAz + s * (0.48 + rng() * 0.25),
          curEl + (rng() - 0.3) * 0.25,
          length * (0.44 + rng() * 0.14),
          endRad * 0.9,
          endRad * 0.36,
          baseSway + 0.34,
          1,
          tier,
        );
      }
    }
  };

  if (arch.evergreen) {
    const tiers = isFull ? arch.boughCount : Math.max(7, arch.boughCount - 2);
    for (let i = 0; i < tiers; i++) {
      const frac = 0.24 + (i / (tiers - 1)) * 0.74;
      const py = frac * trunkH;
      const px = originX + Math.sin(frac * Math.PI * 0.9) * leanX;
      const pz = originZ + Math.sin(frac * Math.PI * 0.85) * leanZ;
      const whorlLen = (1 - Math.pow(frac, 1.35) * 0.8) * arch.crownWidth * 0.52 * scale;
      const arms = i > tiers - 3 ? 3 : 4;
      for (let a = 0; a < arms; a++) {
        const az = rot + (a / arms) * Math.PI * 2 + i * 0.72 + (rng() - 0.5) * 0.25;
        const el = -0.12 + frac * 0.38;
        drawLimb3D(
          px,
          py,
          pz,
          az,
          el,
          whorlLen * (0.85 + rng() * 0.25),
          arch.trunkTopRadius * 0.95 * (1.25 - frac * 0.55),
          arch.trunkTopRadius * 0.32,
          0.16 + frac * 0.34,
          0,
          i,
        );
      }
      if (i >= tiers - 2) {
        tips.push({
          x: px,
          y: py + 0.04 * scale,
          z: pz,
          swayWeight: 0.65,
          tier: i,
        });
      }
    }
  } else {
    const boughs = isFull ? arch.boughCount : Math.max(5, arch.boughCount - 1);
    for (let i = 0; i < boughs; i++) {
      const az = rot + i * 2.399963 + (rng() - 0.5) * 0.25;
      const elev = 0.28 + (1 - arch.boughHorizontalBias) * 0.56 + (rng() - 0.5) * 0.22;
      const node = trunkNodes[i % Math.max(1, trunkNodes.length)] ?? {
        x: topX,
        y: topY,
        z: topZ,
        rad: arch.trunkTopRadius * scale,
        frac: 0.9,
      };
      const useCrownApex = i >= boughs - 3;
      const sx = useCrownApex ? topX : node.x;
      const sy = useCrownApex ? topY - 0.015 * scale : node.y;
      const sz = useCrownApex ? topZ : node.z;
      const len = arch.boughSpread * (0.34 + rng() * 0.14) * scale;
      drawLimb3D(
        sx,
        sy,
        sz,
        az,
        elev,
        len,
        arch.trunkTopRadius * 0.9,
        arch.trunkTopRadius * 0.32,
        0.22,
        0,
        i,
      );
    }
  }

  const stackSlicesPerTip = isFull ? 4 : 3;
  const tuftsPerTip = isFull ? 4 : 3;

  for (let tIdx = 0; tIdx < tips.length; tIdx++) {
    const tip = tips[tIdx];
    const baseSize = (arch.evergreen ? 0.17 : 0.2) * arch.clusterScale * scale;

    for (let s = 0; s < stackSlicesPerTip; s++) {
      const f = s / (stackSlicesPerTip - 1) - 0.5;
      const sliceSize = baseSize * (1.0 - Math.abs(f) * 0.42);
      const sy = tip.y + f * baseSize * 0.44;
      outSprites.push({
        x: tip.x + (rng() - 0.5) * 0.02 * scale,
        y: Math.max(0.08 * scale, sy),
        z: tip.z + (rng() - 0.5) * 0.02 * scale,
        w: sliceSize,
        h: sliceSize,
        rot: rng() * Math.PI * 2,
        tile: arch.evergreen ? arch.leafTiles[0] : 30,
        kind: SpriteKind.Leaf,
        isSlice: 1.0,
        speciesIdx: sIdx,
        swayWeight: tip.swayWeight + f * 0.12,
        swayPhase: rng() * Math.PI * 2,
        flutterFreq: 1.8 + rng() * 1.6,
        shadeBias: f * 1.15 - 0.1,
        growthOrder: 0.12 + rng() * 0.45,
      });
    }

    for (let k = 0; k < tuftsPerTip; k++) {
      const ta = (k / tuftsPerTip) * Math.PI * 2 + rng() * 0.9;
      const tr = baseSize * (0.28 + rng() * 0.24);
      const lx = tip.x + Math.cos(ta) * tr;
      const lz = tip.z + Math.sin(ta) * tr;
      const ly = tip.y + (rng() - 0.35) * baseSize * 0.44;
      const tile = arch.leafTiles[Math.floor(rng() * arch.leafTiles.length)];
      const tuftSize = baseSize * (0.85 + rng() * 0.38);

      outSprites.push({
        x: lx,
        y: Math.max(0.09 * scale, ly),
        z: lz,
        w: tuftSize,
        h: tuftSize,
        rot: (rng() - 0.5) * 0.55,
        tile,
        kind: SpriteKind.Leaf,
        isSlice: 0.0,
        speciesIdx: sIdx,
        swayWeight: tip.swayWeight + 0.18 + rng() * 0.14,
        swayPhase: rng() * Math.PI * 2,
        flutterFreq: 2.2 + rng() * 2.5,
        shadeBias: (ly - tip.y) * 2.5 + 0.15,
        growthOrder: 0.25 + rng() * 0.72,
      });

      if (k === tuftsPerTip - 1 && rng() > 0.38) {
        outEmitters.push({ x: lx, y: ly, z: lz, isBlossom: false, itemId: species.id });
      }

      if (
        !arch.evergreen &&
        (species.id === 'dogwood' ||
          species.id === 'cherry' ||
          species.id === 'redbud' ||
          species.id === 'red-maple')
      ) {
        const bTile = arch.blossomTiles[Math.floor(rng() * arch.blossomTiles.length)];
        outSprites.push({
          x: lx + (rng() - 0.5) * 0.015 * scale,
          y: Math.max(0.09 * scale, ly + 0.01 * scale),
          z: lz + (rng() - 0.5) * 0.015 * scale,
          w: tuftSize * (species.id === 'cherry' ? 1.05 : 0.9),
          h: tuftSize * (species.id === 'cherry' ? 1.05 : 0.9),
          rot: (rng() - 0.5) * 0.5,
          tile: bTile,
          kind: SpriteKind.Blossom,
          isSlice: 0.0,
          speciesIdx: sIdx,
          swayWeight: tip.swayWeight + 0.22,
          swayPhase: rng() * Math.PI * 2,
          flutterFreq: 2.4 + rng() * 2.2,
          shadeBias: (ly - tip.y) * 2.2 + 0.22,
          growthOrder: 0.2 + rng() * 0.75,
        });

        if (k === tuftsPerTip - 1 && rng() > 0.38) {
          outEmitters.push({ x: lx, y: ly, z: lz, isBlossom: true, itemId: species.id });
        }
      }
    }

    if (!arch.evergreen && tIdx % 2 === 0) {
      outSprites.push({
        x: tip.x,
        y: tip.y,
        z: tip.z,
        w: baseSize * 0.45,
        h: baseSize * 0.45,
        rot: rng() * Math.PI * 2,
        tile: 16,
        kind: SpriteKind.Berry,
        isSlice: 0.0,
        speciesIdx: sIdx,
        swayWeight: tip.swayWeight + 0.1,
        swayPhase: rng() * Math.PI * 2,
        flutterFreq: 1.5,
        shadeBias: 0.2,
        growthOrder: 0.15,
      });
    }
  }

  if (arch.cauliflorous) {
    for (const node of cauliflorousNodes) {
      const bTile = arch.blossomTiles[Math.floor(rng() * arch.blossomTiles.length)];
      const sz = 0.14 * scale * (0.8 + rng() * 0.35);
      outSprites.push({
        x: node.x,
        y: node.y,
        z: node.z,
        w: sz,
        h: sz,
        rot: rng() * Math.PI * 2,
        tile: bTile,
        kind: SpriteKind.Blossom,
        isSlice: 0.0,
        speciesIdx: sIdx,
        swayWeight: node.sway,
        swayPhase: rng() * Math.PI * 2,
        flutterFreq: 2.0,
        shadeBias: 0.15,
        growthOrder: 0.15 + rng() * 0.4,
      });
    }
  }

  if (!arch.evergreen) {
    const litterCount = isFull ? 24 : 14;
    for (let i = 0; i < litterCount; i++) {
      const la = rng() * Math.PI * 2;
      const lr = (0.06 + Math.sqrt(rng()) * arch.crownWidth * 0.44) * scale;
      const isPetal =
        species.id === 'cherry' || species.id === 'dogwood' || species.id === 'redbud';
      outSprites.push({
        x: originX + Math.cos(la) * lr,
        y: 0.004,
        z: originZ + Math.sin(la) * lr,
        w: 0.036 * scale,
        h: 0.036 * scale,
        rot: rng() * Math.PI * 2,
        tile: isPetal ? arch.fallingPetalTile : arch.fallingLeafTile,
        kind: SpriteKind.GroundLitter,
        isSlice: 1.0,
        speciesIdx: sIdx,
        swayWeight: 0,
        swayPhase: 0,
        flutterFreq: 0,
        shadeBias: (rng() - 0.5) * 0.6,
        growthOrder: 0,
      });
    }
  }
}

const PATH_MAT_INDEX: Record<PathMaterialId, number> = {
  flagstone: 0,
  gravel: 1,
  stepping: 2,
  mulch: 3,
};

function buildPathNodes(
  pathNodes: PathNode[],
  outSprites: TreeSpriteInstance[],
) {
  for (let i = 0; i < pathNodes.length; i++) {
    const node = pathNodes[i];
    const matIdx = PATH_MAT_INDEX[node.material] ?? 0;
    const meta = PATH_MATERIALS[matIdx] ?? PATH_MATERIALS[0];
    const rng = makeRng(node.seed + i * 17);
    const sz = node.radius * 2.05;

    // Slight elevation stratification so overlapping strokes never Z-fight
    const yBase = 0.0045 + (i % 17) * 0.00028;

    outSprites.push({
      x: node.x,
      y: yBase,
      z: node.z,
      w: sz,
      h: sz * (node.material === 'stepping' ? 0.86 : 1.0),
      rot: rng() * Math.PI * 2,
      tile: meta.tile,
      kind: SpriteKind.PathSurface,
      isSlice: 1.0,
      speciesIdx: matIdx,
      swayWeight: 0,
      swayPhase: 0,
      flutterFreq: 0,
      shadeBias: (rng() - 0.5) * 0.35,
      growthOrder: 0,
    });

    // Secondary soft edge scatter for gravel & mulch strokes
    if (node.material === 'gravel' || node.material === 'mulch') {
      const a = rng() * Math.PI * 2;
      const d = node.radius * 0.42;
      outSprites.push({
        x: node.x + Math.cos(a) * d,
        y: yBase + 0.0004,
        z: node.z + Math.sin(a) * d,
        w: sz * 0.62,
        h: sz * 0.62,
        rot: rng() * Math.PI * 2,
        tile: meta.tile,
        kind: SpriteKind.PathSurface,
        isSlice: 1.0,
        speciesIdx: matIdx,
        swayWeight: 0,
        swayPhase: 0,
        flutterFreq: 0,
        shadeBias: (rng() - 0.5) * 0.4,
        growthOrder: 0,
      });
    }
  }
}

// ── 10 Curated Sprite-Stacked 3D Musical Instruments ─────────────────────────

function buildUprightPiano3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  // Ground contact shadow
  outSprites.push({
    x: originX, y: 0.002, z: originZ, w: 0.44 * scale, h: 0.3 * scale,
    rot, tile: 31, kind: SpriteKind.Shadow, isSlice: 1.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0, growthOrder: 0,
  });

  // Lower walnut cabinet & brass pedals
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    outSprites.push({
      x: originX, y: (0.012 + t * 0.16) * scale, z: originZ,
      w: 0.34 * scale, h: 0.14 * scale, rot, tile: 43, kind: SpriteKind.Bark,
      isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
      shadeBias: -0.22 + t * 0.34, growthOrder: 0,
    });
  }
  // Twin brass foot pedals protruding forward
  const [px, pz] = rotOffset(originX, originZ, 0, 0.075 * scale, rot);
  outSprites.push({
    x: px, y: 0.022 * scale, z: pz, w: 0.095 * scale, h: 0.05 * scale,
    rot, tile: 33, kind: SpriteKind.Blossom, isSlice: 1.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0.3, growthOrder: 0,
  });

  // Protruding keybed shelf + crisp ivory/ebony keyboard slice!
  const [kx, kz] = rotOffset(originX, originZ, 0, 0.068 * scale, rot);
  outSprites.push({
    x: kx, y: 0.178 * scale, z: kz, w: 0.35 * scale, h: 0.12 * scale,
    rot, tile: 43, kind: SpriteKind.Bark, isSlice: 1.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0.15, growthOrder: 0,
  });
  for (let k = 0; k < 2; k++) {
    outSprites.push({
      x: kx, y: (0.194 + k * 0.011) * scale, z: kz, w: 0.33 * scale, h: 0.105 * scale,
      rot, tile: 48, kind: SpriteKind.Leaf, isSlice: 1.0, speciesIdx: sIdx,
      swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0.35 + k * 0.2, growthOrder: 0,
    });
  }

  // Tall upright soundboard upper cabinet & music rest
  const [bx, bz] = rotOffset(originX, originZ, 0, -0.018 * scale, rot);
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    outSprites.push({
      x: bx, y: (0.205 + t * 0.19) * scale, z: bz,
      w: 0.345 * scale, h: 0.115 * scale, rot, tile: 43, kind: SpriteKind.Bark,
      isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
      shadeBias: -0.1 + t * 0.42, growthOrder: 0,
    });
  }
  // Crown molding top lid + warm sheet music lamp glow
  outSprites.push({
    x: bx, y: 0.405 * scale, z: bz, w: 0.37 * scale, h: 0.14 * scale,
    rot, tile: 43, kind: SpriteKind.Bark, isSlice: 1.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0.48, growthOrder: 0,
  });
  const [lx, lz] = rotOffset(originX, originZ, 0, 0.045 * scale, rot);
  outSprites.push({
    x: lx, y: 0.29 * scale, z: lz, w: 0.08 * scale, h: 0.05 * scale,
    rot, tile: 33, kind: SpriteKind.EmissiveGlow, isSlice: 0.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0.6, growthOrder: 0,
  });
}

function buildConcertHarp3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  outSprites.push({
    x: originX, y: 0.002, z: originZ, w: 0.32 * scale, h: 0.24 * scale,
    rot, tile: 31, kind: SpriteKind.Shadow, isSlice: 1.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0, growthOrder: 0,
  });

  // Pedestal base
  for (let i = 0; i < 3; i++) {
    outSprites.push({
      x: originX, y: (0.01 + i * 0.014) * scale, z: originZ,
      w: (0.24 - i * 0.02) * scale, h: (0.14 - i * 0.01) * scale,
      rot, tile: 43, kind: SpriteKind.Bark, isSlice: 1.0, speciesIdx: sIdx,
      swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: -0.15 + i * 0.14, growthOrder: 0,
    });
  }

  // Tall front fluted pillar (left side) + diagonal soundboard rising right
  const [colX, colZ] = rotOffset(originX, originZ, -0.095 * scale, 0, rot);
  for (let i = 0; i < 20; i++) {
    const t = i / 19;
    outSprites.push({
      x: colX, y: (0.042 + t * 0.42) * scale, z: colZ,
      w: 0.042 * scale, h: 0.042 * scale, rot, tile: 33, kind: SpriteKind.Bark,
      isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
      shadeBias: -0.1 + t * 0.45, growthOrder: 0,
    });
  }
  // Crown finial atop pillar
  outSprites.push({
    x: colX, y: 0.478 * scale, z: colZ, w: 0.068 * scale, h: 0.068 * scale,
    rot, tile: 50, kind: SpriteKind.Blossom, isSlice: 1.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0.45, growthOrder: 0,
  });

  // Angled soundbox rising from base-left toward upper-right
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const [sx, sz] = rotOffset(originX, originZ, (-0.04 + t * 0.145) * scale, 0, rot);
    const w = (0.085 - t * 0.036) * scale;
    outSprites.push({
      x: sx, y: (0.048 + t * 0.28) * scale, z: sz,
      w, h: (0.095 - t * 0.035) * scale, rot, tile: 43, kind: SpriteKind.Bark,
      isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
      shadeBias: 0.05 + t * 0.35, growthOrder: 0,
    });
  }

  // Sweeping S-curved harmonic neck connecting pillar top to soundbox knee
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const [nx, nz] = rotOffset(originX, originZ, (-0.09 + t * 0.195) * scale, 0, rot);
    const archY = 0.46 - t * 0.13 + Math.sin(t * Math.PI * 1.4) * 0.025;
    outSprites.push({
      x: nx, y: archY * scale, z: nz,
      w: 0.048 * scale, h: 0.038 * scale, rot, tile: 43, kind: SpriteKind.Bark,
      isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
      shadeBias: 0.38, growthOrder: 0,
    });
  }

  // Golden string plane (vertical billboard ribs in center of harp triangle)
  const [stX, stZ] = rotOffset(originX, originZ, 0.005 * scale, 0, rot);
  outSprites.push({
    x: stX, y: 0.26 * scale, z: stZ, w: 0.19 * scale, h: 0.28 * scale,
    rot: 0, tile: 53, kind: SpriteKind.Leaf, isSlice: 0.0, speciesIdx: sIdx,
    swayWeight: 0.04, swayPhase: originX, flutterFreq: 2.2, shadeBias: 0.42, growthOrder: 0,
  });
}

function buildMarimba3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  outSprites.push({
    x: originX, y: 0.002, z: originZ, w: 0.46 * scale, h: 0.24 * scale,
    rot, tile: 31, kind: SpriteKind.Shadow, isSlice: 1.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0, growthOrder: 0,
  });

  // Left & right steel frame legs
  for (const side of [-0.165, 0.165]) {
    const [lx, lz] = rotOffset(originX, originZ, side * scale, 0, rot);
    for (let i = 0; i < 11; i++) {
      const t = i / 10;
      outSprites.push({
        x: lx, y: (0.015 + t * 0.21) * scale, z: lz,
        w: 0.034 * scale, h: (0.14 - Math.abs(t - 0.5) * 0.05) * scale,
        rot, tile: 33, kind: SpriteKind.Bark, isSlice: 1.0, speciesIdx: sIdx,
        swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: -0.1 + t * 0.3, growthOrder: 0,
      });
    }
  }

  // Hanging graduated bronze resonator pipes underneath
  for (let p = 0; p < 7; p++) {
    const u = p / 6;
    const [rx, rz] = rotOffset(originX, originZ, (-0.135 + u * 0.27) * scale, 0, rot);
    const pipeTop = 0.205;
    const pipeBot = 0.055 + u * 0.085;
    const steps = 4;
    for (let s = 0; s < steps; s++) {
      const y = pipeBot + (s / (steps - 1)) * (pipeTop - pipeBot);
      outSprites.push({
        x: rx, y: y * scale, z: rz,
        w: 0.032 * scale, h: 0.032 * scale, rot, tile: 50, kind: SpriteKind.Blossom,
        isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
        shadeBias: 0.15 + s * 0.1, growthOrder: 0,
      });
    }
  }

  // Upper rosewood graduated tone bars (two stacked rows for accidental/natural tiers)
  for (let tier = 0; tier < 2; tier++) {
    const [bx, bz] = rotOffset(originX, originZ, 0, (tier === 0 ? 0.024 : -0.028) * scale, rot);
    outSprites.push({
      x: bx, y: (0.228 + tier * 0.022) * scale, z: bz,
      w: 0.39 * scale, h: (0.155 - tier * 0.03) * scale, rot, tile: 51, kind: SpriteKind.Leaf,
      isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
      shadeBias: 0.22 + tier * 0.22, growthOrder: 0,
    });
  }
}

function buildStandingCello3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  outSprites.push({
    x: originX, y: 0.002, z: originZ, w: 0.22 * scale, h: 0.22 * scale,
    rot: 0, tile: 31, kind: SpriteKind.Shadow, isSlice: 1.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0, growthOrder: 0,
  });

  // Upright metallic endpin & tripod stand
  for (let i = 0; i < 6; i++) {
    outSprites.push({
      x: originX, y: (0.01 + i * 0.014) * scale, z: originZ,
      w: (i === 0 ? 0.12 : 0.026) * scale, h: (i === 0 ? 0.12 : 0.026) * scale,
      rot, tile: 33, kind: SpriteKind.Leaf, isSlice: 1.0, speciesIdx: sIdx,
      swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0.05, growthOrder: 0,
    });
  }

  // Sculptural hourglass spruce cello body (15 vertical slices pinched cleanly at the waist)
  for (let i = 0; i < 15; i++) {
    const t = i / 14;
    const bout =
      t < 0.45
        ? Math.sin((t / 0.45) * Math.PI) * 0.085 + 0.075
        : t < 0.62
          ? 0.072
          : Math.sin(((t - 0.62) / 0.38) * Math.PI) * 0.058 + 0.064;
    outSprites.push({
      x: originX, y: (0.095 + t * 0.21) * scale, z: originZ,
      w: bout * 1.45 * scale, h: 0.075 * scale, rot, tile: 54, kind: SpriteKind.Bark,
      isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
      shadeBias: -0.12 + t * 0.44, growthOrder: 0,
    });
  }

  // Ebony fingerboard & scroll neck rising above
  const [nx, nz] = rotOffset(originX, originZ, 0, 0.024 * scale, rot);
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    outSprites.push({
      x: nx, y: (0.28 + t * 0.165) * scale, z: nz,
      w: (0.028 - t * 0.008) * scale, h: 0.026 * scale, rot, tile: 33, kind: SpriteKind.Leaf,
      isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
      shadeBias: 0.1 + t * 0.25, growthOrder: 0,
    });
  }
  // Golden maple scroll head
  outSprites.push({
    x: nx, y: 0.458 * scale, z: nz, w: 0.044 * scale, h: 0.044 * scale,
    rot, tile: 50, kind: SpriteKind.Blossom, isSlice: 1.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0.45, growthOrder: 0,
  });
}

function buildModularSynth3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  outSprites.push({
    x: originX, y: 0.002, z: originZ, w: 0.36 * scale, h: 0.28 * scale,
    rot, tile: 31, kind: SpriteKind.Shadow, isSlice: 1.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0, growthOrder: 0,
  });

  // Angled studio stand legs
  for (const sx of [-0.11, 0.11]) {
    const [lx, lz] = rotOffset(originX, originZ, sx * scale, 0, rot);
    for (let i = 0; i < 7; i++) {
      outSprites.push({
        x: lx, y: (0.012 + i * 0.016) * scale, z: lz,
        w: 0.032 * scale, h: 0.12 * scale, rot, tile: 33, kind: SpriteKind.Bark,
        isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
        shadeBias: -0.2 + i * 0.06, growthOrder: 0,
      });
    }
  }

  // Stacked angled Eurorack modular case with walnut side cheeks & patch bay
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const zBack = -t * 0.065;
    const [cx, cz] = rotOffset(originX, originZ, 0, zBack * scale, rot);
    // Anodized dark synth module faceplate
    outSprites.push({
      x: cx, y: (0.125 + t * 0.22) * scale, z: cz,
      w: 0.26 * scale, h: 0.12 * scale, rot, tile: 52, kind: SpriteKind.Bark,
      isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
      shadeBias: -0.05 + t * 0.38, growthOrder: 0,
    });
    // Walnut side cheeks
    for (const side of [-0.14, 0.14]) {
      const [wx, wz] = rotOffset(originX, originZ, side * scale, zBack * scale, rot);
      outSprites.push({
        x: wx, y: (0.125 + t * 0.22) * scale, z: wz,
        w: 0.032 * scale, h: 0.145 * scale, rot, tile: 43, kind: SpriteKind.Leaf,
        isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
        shadeBias: 0.12 + t * 0.25, growthOrder: 0,
      });
    }
  }

  // Cyan patch-bay indicator LED strip + glowing oscilloscope node
  const [gx, gz] = rotOffset(originX, originZ, 0, 0.035 * scale, rot);
  outSprites.push({
    x: gx, y: 0.275 * scale, z: gz, w: 0.16 * scale, h: 0.08 * scale,
    rot, tile: 52, kind: SpriteKind.Blossom, isSlice: 0.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0.5, growthOrder: 0,
  });
  outSprites.push({
    x: gx, y: 0.315 * scale, z: gz, w: 0.075 * scale, h: 0.045 * scale,
    rot: 0, tile: 33, kind: SpriteKind.EmissiveGlow, isSlice: 0.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0.7, growthOrder: 0,
  });
}

function buildTapeDeck3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  outSprites.push({
    x: originX, y: 0.002, z: originZ, w: 0.34 * scale, h: 0.26 * scale,
    rot, tile: 31, kind: SpriteKind.Shadow, isSlice: 1.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0, growthOrder: 0,
  });

  // Upright studio rolling console body
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    outSprites.push({
      x: originX, y: (0.015 + t * 0.27) * scale, z: originZ,
      w: 0.26 * scale, h: (0.145 - t * 0.025) * scale, rot, tile: 33, kind: SpriteKind.Bark,
      isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
      shadeBias: -0.18 + t * 0.44, growthOrder: 0,
    });
  }

  // Twin prominent aluminum tape reels mounted high on the face!
  for (const side of [-0.088, 0.088]) {
    const [rx, rz] = rotOffset(originX, originZ, side * scale, 0.068 * scale, rot);
    outSprites.push({
      x: rx, y: 0.325 * scale, z: rz, w: 0.145 * scale, h: 0.145 * scale,
      rot: 0, tile: 49, kind: SpriteKind.Leaf, isSlice: 0.0, speciesIdx: sIdx,
      swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0.42, growthOrder: 0,
    });
  }

  // Warm illuminated VU meters in lower console
  const [vx, vz] = rotOffset(originX, originZ, 0, 0.074 * scale, rot);
  outSprites.push({
    x: vx, y: 0.185 * scale, z: vz, w: 0.11 * scale, h: 0.055 * scale,
    rot: 0, tile: 33, kind: SpriteKind.EmissiveGlow, isSlice: 0.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0.65, growthOrder: 0,
  });
}

function buildDrumStack3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  outSprites.push({
    x: originX, y: 0.002, z: originZ, w: 0.34 * scale, h: 0.3 * scale,
    rot, tile: 31, kind: SpriteKind.Shadow, isSlice: 1.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0, growthOrder: 0,
  });

  // Lower studio monitor speaker cube
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    outSprites.push({
      x: originX, y: (0.012 + t * 0.21) * scale, z: originZ,
      w: 0.23 * scale, h: 0.2 * scale, rot, tile: 33, kind: SpriteKind.Bark,
      isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
      shadeBias: -0.2 + t * 0.38, growthOrder: 0,
    });
  }
  // Front circular woofer cone
  const [wx, wz] = rotOffset(originX, originZ, 0, 0.108 * scale, rot);
  outSprites.push({
    x: wx, y: 0.125 * scale, z: wz, w: 0.165 * scale, h: 0.165 * scale,
    rot: 0, tile: 49, kind: SpriteKind.Leaf, isSlice: 0.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0.3, growthOrder: 0,
  });

  // Angled analog drum machine step-sequencer crowned on top
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const [dx, dz] = rotOffset(originX, originZ, 0, -t * 0.025 * scale, rot);
    outSprites.push({
      x: dx, y: (0.238 + t * 0.068) * scale, z: dz,
      w: 0.25 * scale, h: 0.16 * scale, rot, tile: 52, kind: SpriteKind.Blossom,
      isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
      shadeBias: 0.18 + t * 0.32, growthOrder: 0,
    });
  }
  // Glowing step-sequencer LED bar
  const [lx, lz] = rotOffset(originX, originZ, 0, 0.072 * scale, rot);
  outSprites.push({
    x: lx, y: 0.27 * scale, z: lz, w: 0.13 * scale, h: 0.042 * scale,
    rot: 0, tile: 33, kind: SpriteKind.EmissiveGlow, isSlice: 0.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0.6, growthOrder: 0,
  });
}

function buildWindChimeArch3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  outSprites.push({
    x: originX, y: 0.002, z: originZ, w: 0.48 * scale, h: 0.2 * scale,
    rot, tile: 31, kind: SpriteKind.Shadow, isSlice: 1.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0, growthOrder: 0,
  });

  // Twin cedar timber uprights
  for (const side of [-0.185, 0.185]) {
    const [px, pz] = rotOffset(originX, originZ, side * scale, 0, rot);
    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      outSprites.push({
        x: px, y: (0.012 + t * 0.47) * scale, z: pz,
        w: 0.048 * scale, h: 0.056 * scale, rot, tile: 43, kind: SpriteKind.Bark,
        isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
        shadeBias: -0.18 + t * 0.38, growthOrder: 0,
      });
    }
  }

  // Arched crossbeam lintel at top
  for (let i = 0; i < 3; i++) {
    outSprites.push({
      x: originX, y: (0.485 + i * 0.022) * scale, z: originZ,
      w: (0.46 + i * 0.03) * scale, h: 0.075 * scale, rot, tile: 43, kind: SpriteKind.Bark,
      isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
      shadeBias: 0.24 + i * 0.15, growthOrder: 0,
    });
  }

  // Hanging stepped bronze chime tubes (react directly to u_wind via swayWeight!)
  outSprites.push({
    x: originX, y: 0.33 * scale, z: originZ, w: 0.32 * scale, h: 0.28 * scale,
    rot: 0, tile: 55, kind: SpriteKind.Leaf, isSlice: 0.0, speciesIdx: sIdx,
    swayWeight: 0.42, swayPhase: originX * 2.1 + originZ, flutterFreq: 2.8,
    shadeBias: 0.35, growthOrder: 0,
  });
  // Central brass wind-catcher disc below chimes
  outSprites.push({
    x: originX, y: 0.165 * scale, z: originZ, w: 0.068 * scale, h: 0.068 * scale,
    rot: 0, tile: 50, kind: SpriteKind.Blossom, isSlice: 0.0, speciesIdx: sIdx,
    swayWeight: 0.65, swayPhase: originX * 2.1 + originZ + 0.6, flutterFreq: 3.2,
    shadeBias: 0.5, growthOrder: 0,
  });
}

function buildSingingBowl3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  outSprites.push({
    x: originX, y: 0.002, z: originZ, w: 0.32 * scale, h: 0.32 * scale,
    rot: 0, tile: 31, kind: SpriteKind.Shadow, isSlice: 1.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0, growthOrder: 0,
  });

  // Carved octagonal Blue Ridge stone altar plinth
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const rad = t < 0.2 || t > 0.82 ? 0.22 : 0.175;
    outSprites.push({
      x: originX, y: (0.012 + t * 0.145) * scale, z: originZ,
      w: rad * scale, h: rad * scale, rot: t * 0.12, tile: 32, kind: SpriteKind.Bark,
      isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
      shadeBias: -0.22 + t * 0.42, growthOrder: 0,
    });
  }

  // Burnished stepped brass singing bowl resting on top
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const bowlW = (0.11 + Math.sin(t * Math.PI * 0.72) * 0.11) * scale;
    outSprites.push({
      x: originX, y: (0.162 + t * 0.072) * scale, z: originZ,
      w: bowlW, h: bowlW, rot: t * 0.25, tile: 50, kind: SpriteKind.Leaf,
      isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
      shadeBias: 0.05 + t * 0.45, growthOrder: 0,
    });
  }

  // Warm shimmering resonance halo inside the bowl rim
  outSprites.push({
    x: originX, y: 0.236 * scale, z: originZ, w: 0.115 * scale, h: 0.115 * scale,
    rot: 0, tile: 50, kind: SpriteKind.EmissiveGlow, isSlice: 1.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0.65, growthOrder: 0,
  });
}

function buildBronzeGong3D(
  item: VirginiaSpaceItem,
  originX: number,
  originZ: number,
  scale: number,
  rot: number,
  outSprites: TreeSpriteInstance[],
) {
  const sIdx = item.gpuIndex;
  outSprites.push({
    x: originX, y: 0.002, z: originZ, w: 0.46 * scale, h: 0.22 * scale,
    rot, tile: 31, kind: SpriteKind.Shadow, isSlice: 1.0, speciesIdx: sIdx,
    swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: 0, growthOrder: 0,
  });

  // Charred timber feet & twin standing posts
  for (const side of [-0.175, 0.175]) {
    const [fx, fz] = rotOffset(originX, originZ, side * scale, 0, rot);
    outSprites.push({
      x: fx, y: 0.015 * scale, z: fz, w: 0.068 * scale, h: 0.17 * scale,
      rot, tile: 43, kind: SpriteKind.Bark, isSlice: 1.0, speciesIdx: sIdx,
      swayWeight: 0, swayPhase: 0, flutterFreq: 0, shadeBias: -0.18, growthOrder: 0,
    });
    for (let i = 0; i < 18; i++) {
      const t = i / 17;
      outSprites.push({
        x: fx, y: (0.025 + t * 0.41) * scale, z: fz,
        w: 0.044 * scale, h: 0.052 * scale, rot, tile: 43, kind: SpriteKind.Bark,
        isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
        shadeBias: -0.14 + t * 0.36, growthOrder: 0,
      });
    }
  }

  // Sweeping temple top beam
  for (let i = 0; i < 3; i++) {
    outSprites.push({
      x: originX, y: (0.44 + i * 0.02) * scale, z: originZ,
      w: (0.46 + i * 0.04) * scale, h: 0.068 * scale, rot, tile: 43, kind: SpriteKind.Bark,
      isSlice: 1.0, speciesIdx: sIdx, swayWeight: 0, swayPhase: 0, flutterFreq: 0,
      shadeBias: 0.2 + i * 0.16, growthOrder: 0,
    });
  }

  // Large hammered bronze gong disc suspended dead-center
  outSprites.push({
    x: originX, y: 0.255 * scale, z: originZ, w: 0.29 * scale, h: 0.29 * scale,
    rot: 0, tile: 50, kind: SpriteKind.Leaf, isSlice: 0.0, speciesIdx: sIdx,
    swayWeight: 0.08, swayPhase: originX + originZ, flutterFreq: 1.4,
    shadeBias: 0.4, growthOrder: 0,
  });
  // Central glowing struck boss highlight
  outSprites.push({
    x: originX, y: 0.255 * scale, z: originZ, w: 0.095 * scale, h: 0.095 * scale,
    rot: 0, tile: 50, kind: SpriteKind.Blossom, isSlice: 0.0, speciesIdx: sIdx,
    swayWeight: 0.08, swayPhase: originX + originZ, flutterFreq: 1.4,
    shadeBias: 0.65, growthOrder: 0,
  });
}

export function buildSpaceScene(
  placedItems: PlacedSpaceItem[],
  pathNodes: PathNode[] = [],
  visibleLayers?: Record<BimLayerId, boolean>,
): BuiltSpaceScene {
  const sprites: TreeSpriteInstance[] = [];
  const emitters: CanopyEmitter[] = [];

  const isLayerVisible = (layer: BimLayerId) =>
    visibleLayers ? visibleLayers[layer] !== false : true;

  // 1. Paintable ground pathways first (belongs to 'paths-lighting' BIM layer)
  if (pathNodes.length > 0 && isLayerVisible('paths-lighting')) {
    buildPathNodes(pathNodes, sprites);
  }

  // 2. Placed BIM objects across all 24 classes
  const treeCount = placedItems.filter(
    (p) => getSpaceItem(p.itemId).architecture.kind === 'tree',
  ).length;
  const detail: 'full' | 'medium' = treeCount <= 4 ? 'full' : 'medium';

  for (const placed of placedItems) {
    const bim = getItemBimSpec(placed.itemId);
    if (!isLayerVisible(bim.layer)) continue;

    const spec = getSpaceItem(placed.itemId);
    const rot = placed.rotation ?? 0;
    const kind = spec.architecture.kind;

    switch (kind) {
      case 'stone':
        buildStone3D(spec, placed.x, placed.z, placed.scale, rot, placed.seed, sprites);
        break;
      case 'lantern':
        buildLantern3D(spec, placed.x, placed.z, placed.scale, rot, placed.seed, sprites);
        break;
      case 'bollard':
        buildBollard3D(spec, placed.x, placed.z, placed.scale, rot, placed.seed, sprites);
        break;
      case 'fire-pit':
        buildFirePit3D(spec, placed.x, placed.z, placed.scale, placed.seed, sprites);
        break;
      case 'shrub':
        buildShrub3D(spec, placed.x, placed.z, placed.scale, placed.seed, sprites, emitters);
        break;
      case 'fern':
        buildFern3D(spec, placed.x, placed.z, placed.scale, rot, placed.seed, sprites);
        break;
      case 'wildflower':
        buildWildflower3D(spec, placed.x, placed.z, placed.scale, placed.seed, sprites, emitters);
        break;
      case 'switchgrass':
        buildSwitchgrass3D(spec, placed.x, placed.z, placed.scale, placed.seed, sprites);
        break;
      case 'raised-bed':
        buildRaisedBed3D(spec, placed.x, placed.z, placed.scale, rot, placed.seed, sprites);
        break;
      case 'pond':
        buildPond3D(spec, placed.x, placed.z, placed.scale, rot, placed.seed, sprites);
        break;
      case 'water-basin':
        buildWaterBasin3D(spec, placed.x, placed.z, placed.scale, placed.seed, sprites);
        break;
      case 'stepping-stone':
        buildSteppingStone3D(spec, placed.x, placed.z, placed.scale, rot, sprites);
        break;
      case 'bench':
        buildBench3D(spec, placed.x, placed.z, placed.scale, rot, sprites);
        break;
      case 'pergola':
        buildPergola3D(spec, placed.x, placed.z, placed.scale, rot, placed.seed, sprites, emitters);
        break;
      case 'stone-wall':
        buildStoneWall3D(spec, placed.x, placed.z, placed.scale, rot, placed.seed, sprites);
        break;
      case 'fence':
        buildFence3D(spec, placed.x, placed.z, placed.scale, rot, sprites);
        break;
      case 'pavilion':
        buildPavilion3D(spec, placed.x, placed.z, placed.scale, rot, placed.seed, sprites);
        break;
      case 'deck-tile':
        buildDeckTile3D(spec, placed.x, placed.z, placed.scale, rot, sprites);
        break;
      case 'upright-piano':
        buildUprightPiano3D(spec, placed.x, placed.z, placed.scale, rot, sprites);
        break;
      case 'concert-harp':
        buildConcertHarp3D(spec, placed.x, placed.z, placed.scale, rot, sprites);
        break;
      case 'marimba':
        buildMarimba3D(spec, placed.x, placed.z, placed.scale, rot, sprites);
        break;
      case 'standing-cello':
        buildStandingCello3D(spec, placed.x, placed.z, placed.scale, rot, sprites);
        break;
      case 'modular-synth':
        buildModularSynth3D(spec, placed.x, placed.z, placed.scale, rot, sprites);
        break;
      case 'tape-deck':
        buildTapeDeck3D(spec, placed.x, placed.z, placed.scale, rot, sprites);
        break;
      case 'drum-stack':
        buildDrumStack3D(spec, placed.x, placed.z, placed.scale, rot, sprites);
        break;
      case 'wind-chime-arch':
        buildWindChimeArch3D(spec, placed.x, placed.z, placed.scale, rot, sprites);
        break;
      case 'singing-bowl':
        buildSingingBowl3D(spec, placed.x, placed.z, placed.scale, sprites);
        break;
      case 'bronze-gong':
        buildBronzeGong3D(spec, placed.x, placed.z, placed.scale, rot, sprites);
        break;
      case 'tree':
      default:
        buildTree3D(
          spec,
          placed.x,
          placed.z,
          placed.scale,
          rot,
          placed.seed,
          detail,
          sprites,
          emitters,
        );
        break;
    }
  }

  // 3. Meadow grass tufts inside the circular clearing (skipping areas covered by paths/ponds)
  const grassRng = makeRng(8821);
  const grassCount = 68;
  for (let i = 0; i < grassCount; i++) {
    const ga = grassRng() * Math.PI * 2;
    const gr = 0.14 + Math.sqrt(grassRng()) * 2.95;
    const gx = Math.cos(ga) * gr;
    const gz = Math.sin(ga) * gr;

    // Avoid sprouting grass directly through painted paths
    let blocked = false;
    for (let p = 0; p < pathNodes.length; p++) {
      const dx = gx - pathNodes[p].x;
      const dz = gz - pathNodes[p].z;
      const rr = pathNodes[p].radius * 0.95;
      if (dx * dx + dz * dz < rr * rr) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    const gSize = 0.068 + grassRng() * 0.044;
    sprites.push({
      x: gx,
      y: 0.022,
      z: gz,
      w: gSize,
      h: gSize,
      rot: (grassRng() - 0.5) * 0.12,
      tile: grassRng() > 0.35 ? 25 : 26,
      kind: SpriteKind.Grass,
      isSlice: 0.0,
      speciesIdx: 0,
      swayWeight: 0.45 + grassRng() * 0.4,
      swayPhase: gx * 2.5 + gz * 2.1,
      flutterFreq: 2.0 + grassRng() * 1.8,
      shadeBias: (grassRng() - 0.5) * 0.4,
      growthOrder: 0,
    });
  }

  return { sprites, emitters };
}
