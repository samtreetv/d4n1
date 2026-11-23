// InstancedWorldBuilder: Reusable beveled playing-card mesh,
// Alice-inspired multi-section Cardbridge Sky Course (floating leaps, winding Club highway,
// Dream-Sight phantom bridge, updraft chimneys, sloped card slide, domino-unfolding crimson bridge,
// and walkable House-of-Cards Castle with open archways & solid walls), plus articulated girl mesh.

import { CARD_BACK_INDEX, CARD_SUMMIT_INDEX } from './CardAtlasShader';

export interface BeveledCardGeometry {
  vertices: Float32Array; // interleaved: pos(3), nor(3), uv(2), faceFlag(1) -> 9 floats
  indices: Uint16Array;
}

export interface PaperGirlPartGeometry {
  id:
    | 'torso'
    | 'apron'
    | 'skirt'
    | 'bow'
    | 'head'
    | 'hairL'
    | 'hairR'
    | 'armL'
    | 'armR'
    | 'legL'
    | 'legR'
    | 'gliderCape'
    | 'scarf';
  vertices: Float32Array; // interleaved: pos(3), nor(3), flutter(1) -> 7 floats
  indices: Uint16Array;
  color: [number, number, number];
}

export interface CardChoreographySettings {
  catchCardsEnabled: boolean;
  proximityWake: number;   // 0..1 lift, bank, and halo response on walkable cards
  slipstreamOrbit: number; // 0..1 helical wake coupling on swirling sky cards
}

export const DEFAULT_CARD_CHOREOGRAPHY: CardChoreographySettings = {
  catchCardsEnabled: true,
  proximityWake: 0.78,
  slipstreamOrbit: 0.85,
};

export type CardKind =
  | 'platform'
  | 'bridge'
  | 'slide'
  | 'unfolding'
  | 'phantom'
  | 'castle-floor'
  | 'castle-wall'
  | 'monolith'
  | 'catch';

export type CatchCardState = 'orbit' | 'peeling' | 'holding' | 'returning';

export interface WorldCardRecord {
  id: number;
  kind: CardKind;
  baseX: number;
  baseY: number;
  baseZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  cardIndex: number; // 0..53
  backOnTop: boolean;
  isWalkable: boolean;
  isWall: boolean;
  isSlide: boolean;
  isUnfolding: boolean;
  isHidden: boolean; // Dream Sight phantom card
  isCheckpoint: boolean;
  waveAmp: number;
  waveFreq: number;
  wavePhase: number;
  // Runtime kinematic + spring-damper + unfolding/phantom state
  curY: number;
  prevY: number;
  dipY: number;
  dipVel: number;
  tiltX: number;
  tiltVelX: number;
  tiltZ: number;
  tiltVelZ: number;
  revealProgress: number; // 0..1 (1 = fully unfolded/materialized)
  solidTimer: number; // keeps phantom cards solid briefly after Dream Sight turns off
  unfoldChimePlayed: boolean;
  visited: boolean;
  // Angelic proximity wake + dynamic sky catch-card pool fields
  wakeLift: number;
  wakeGlow: number;
  catchState: CatchCardState;
  catchProgress: number;
  catchHoldTimer: number;
  catchStartX: number;
  catchStartY: number;
  catchStartZ: number;
  catchTargetX: number;
  catchTargetY: number;
  catchTargetZ: number;
  catchSpinY: number;
}

export interface UpdraftZone {
  id: number;
  x: number;
  baseY: number;
  topY: number;
  z: number;
  radius: number;
  liftStrength: number;
}

export interface PaperSkyWorldData {
  cards: WorldCardRecord[];
  updrafts: UpdraftZone[];
}

export function createBeveledCardGeometry(): BeveledCardGeometry {
  // True 5-Layer Sprite-Stacked Card Slab matching Virginia Sylva's sprite-stacking style!
  // Each horizontal slice is slightly stepped so card edges read as stacked 2D pixel layers.
  const verts: number[] = [];
  const inds: number[] = [];
  let vCursor = 0;

  const pushVert = (
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
    u: number,
    v: number,
    faceFlag: number,
  ) => {
    verts.push(x, y, z, nx, ny, nz, u, v, faceFlag);
    return vCursor++;
  };

  const segX = 4;
  const segZ = 4;
  const topInset = 0.024;
  const halfInnerX = 0.5 - topInset;
  const halfInnerZ = 0.5 - topInset;

  const buildCap = (isTop: boolean) => {
    const startIdx = vCursor;
    const y = isTop ? 0.5 : -0.5;
    const ny = isTop ? 1 : -1;
    const flag = isTop ? 1.0 : -1.0;

    for (let iz = 0; iz <= segZ; iz++) {
      const tz = iz / segZ;
      const z = -halfInnerZ + tz * (halfInnerZ * 2);
      for (let ix = 0; ix <= segX; ix++) {
        const tx = ix / segX;
        const x = -halfInnerX + tx * (halfInnerX * 2);
        pushVert(x, y, z, 0, ny, 0, tx, tz, flag);
      }
    }

    const rowStride = segX + 1;
    for (let iz = 0; iz < segZ; iz++) {
      for (let ix = 0; ix < segX; ix++) {
        const a = startIdx + iz * rowStride + ix;
        const b = a + 1;
        const c = a + rowStride;
        const d = c + 1;
        if (isTop) {
          inds.push(a, c, b, b, c, d);
        } else {
          inds.push(a, b, c, b, d, c);
        }
      }
    }
  };

  buildCap(true);
  buildCap(false);

  // 5 discrete stepped horizontal sprite-stack slices along the perimeter!
  const layers = [
    { yTop: 0.5, yBot: 0.3, rx: 0.476, rz: 0.476 },
    { yTop: 0.3, yBot: 0.1, rx: 0.494, rz: 0.494 },
    { yTop: 0.1, yBot: -0.1, rx: 0.5, rz: 0.5 },
    { yTop: -0.1, yBot: -0.3, rx: 0.492, rz: 0.492 },
    { yTop: -0.3, yBot: -0.5, rx: 0.476, rz: 0.476 },
  ];

  const edgeNormals: [number, number][] = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  const cornersFor = (rx: number, rz: number): [number, number][] => [
    [-rx, -rz],
    [rx, -rz],
    [rx, rz],
    [-rx, rz],
  ];

  for (let li = 0; li < layers.length; li++) {
    const cur = layers[li];
    const pts = cornersFor(cur.rx, cur.rz);
    const v0 = li / layers.length;
    const v1 = (li + 1) / layers.length;

    for (let side = 0; side < 4; side++) {
      const next = (side + 1) % 4;
      const [x0, z0] = pts[side];
      const [x1, z1] = pts[next];
      const [enx, enz] = edgeNormals[side];

      // Vertical riser for this sprite slice
      const e0 = pushVert(x0, cur.yTop, z0, enx, 0, enz, 0, v0, 0);
      const e1 = pushVert(x1, cur.yTop, z1, enx, 0, enz, 1, v0, 0);
      const e2 = pushVert(x0, cur.yBot, z0, enx, 0, enz, 0, v1, 0);
      const e3 = pushVert(x1, cur.yBot, z1, enx, 0, enz, 1, v1, 0);
      inds.push(e0, e1, e2, e1, e3, e2);

      // Stepped ledge connecting to the adjacent wider slice so each stacked layer catches light
      if (li > 0) {
        const prev = layers[li - 1];
        if (cur.rx > prev.rx) {
          const pPts = cornersFor(prev.rx, prev.rz);
          const [px0, pz0] = pPts[side];
          const [px1, pz1] = pPts[next];
          const l0 = pushVert(px0, cur.yTop, pz0, 0, 1, 0, 0, v0, 0);
          const l1 = pushVert(px1, cur.yTop, pz1, 0, 1, 0, 1, v0, 0);
          const l2 = pushVert(x0, cur.yTop, z0, 0, 1, 0, 0, v0, 0);
          const l3 = pushVert(x1, cur.yTop, z1, 0, 1, 0, 1, v0, 0);
          inds.push(l0, l1, l2, l1, l3, l2);
        } else if (cur.rx < prev.rx) {
          const pPts = cornersFor(prev.rx, prev.rz);
          const [px0, pz0] = pPts[side];
          const [px1, pz1] = pPts[next];
          const l0 = pushVert(px0, cur.yTop, pz0, 0, -1, 0, 0, v0, 0);
          const l1 = pushVert(px1, cur.yTop, pz1, 0, -1, 0, 1, v0, 0);
          const l2 = pushVert(x0, cur.yTop, z0, 0, -1, 0, 0, v0, 0);
          const l3 = pushVert(x1, cur.yTop, z1, 0, -1, 0, 1, v0, 0);
          inds.push(l0, l2, l1, l1, l2, l3);
        }
      }
    }
  }

  return {
    vertices: new Float32Array(verts),
    indices: new Uint16Array(inds),
  };
}

/**
 * Builds the full interactive Cardbridge-in-the-Sky course + Walkable House-of-Cards Castle
 * + Updraft Wind Columns + Cathedral Framing Monoliths.
 */
export function buildPaperSkyWorld(): PaperSkyWorldData {
  const cards: WorldCardRecord[] = [];
  let nextId = 0;

  const pushCard = (spec: {
    kind: CardKind;
    x: number;
    y: number;
    z: number;
    rx?: number;
    ry?: number;
    rz?: number;
    sx: number;
    sy?: number;
    sz: number;
    cardIdx: number;
    backOnTop?: boolean;
    checkpoint?: boolean;
    amp?: number;
    freq?: number;
    phase?: number;
  }) => {
    const isWalkable =
      spec.kind === 'platform' ||
      spec.kind === 'bridge' ||
      spec.kind === 'slide' ||
      spec.kind === 'unfolding' ||
      spec.kind === 'phantom' ||
      spec.kind === 'castle-floor' ||
      spec.kind === 'catch';
    const isWall = spec.kind === 'castle-wall';
    const isSlide = spec.kind === 'slide';
    const isUnfolding = spec.kind === 'unfolding';
    const isHidden = spec.kind === 'phantom';
    const isCatch = spec.kind === 'catch';

    cards.push({
      id: nextId++,
      kind: spec.kind,
      baseX: spec.x,
      baseY: spec.y,
      baseZ: spec.z,
      rotX: spec.rx ?? 0,
      rotY: spec.ry ?? 0,
      rotZ: spec.rz ?? 0,
      scaleX: spec.sx,
      scaleY: spec.sy ?? (isWall ? 0.44 : isCatch ? 0.22 : 0.24),
      scaleZ: spec.sz,
      cardIndex: spec.cardIdx,
      backOnTop: Boolean(spec.backOnTop),
      isWalkable,
      isWall,
      isSlide,
      isUnfolding,
      isHidden,
      isCheckpoint: Boolean(spec.checkpoint),
      waveAmp: spec.amp ?? 0,
      waveFreq: spec.freq ?? 0.85,
      wavePhase: spec.phase ?? nextId * 0.55,
      curY: spec.y,
      prevY: spec.y,
      dipY: 0,
      dipVel: 0,
      tiltX: 0,
      tiltVelX: 0,
      tiltZ: 0,
      tiltVelZ: 0,
      revealProgress: isUnfolding || isHidden || isCatch ? 0 : 1,
      solidTimer: 0,
      unfoldChimePlayed: false,
      visited: nextId === 1,
      wakeLift: 0,
      wakeGlow: 0,
      catchState: 'orbit',
      catchProgress: 0,
      catchHoldTimer: 0,
      catchStartX: spec.x,
      catchStartY: spec.y,
      catchStartZ: spec.z,
      catchTargetX: spec.x,
      catchTargetY: spec.y,
      catchTargetZ: spec.z,
      catchSpinY: 0,
    });
  };

  // ── SECTION 1: Opening Floating Emote Leaps (XD -> XP -> :P -> >:() ─────────
  // Card 0: Massive Starting XD Runway Card (~16x larger than floating stepping cards, Checkpoint 0)
  pushCard({ kind: 'platform', x: 0.0, y: 2.0, z: 11.2, sx: 22.0, sy: 0.36, sz: 30.0, cardIdx: 0, checkpoint: true, amp: 0.03 }); // XD
  // Card 1: Classic Alice leap to XP Card
  pushCard({ kind: 'platform', x: 0.3, y: 2.9, z: -10.0, ry: -0.04, sx: 5.0, sz: 6.8, cardIdx: 13, amp: 0.24 }); // XP
  // Card 2: Gentle right-curve floating :P Card
  pushCard({ kind: 'platform', x: 3.4, y: 3.9, z: -19.8, ry: 0.16, sx: 4.8, sz: 6.4, cardIdx: 26, amp: 0.26 }); // :P
  // Card 3: Landing >:( Card into the Sinuous Highway (Checkpoint 1)
  pushCard({ kind: 'platform', x: 0.4, y: 4.6, z: -29.4, ry: -0.08, sx: 5.2, sz: 7.0, cardIdx: 3, checkpoint: true, amp: 0.16 }); // >:(

  // ── SECTION 2: Sinuous Winding Emote Highway ──────────────────────────────
  // Smooth overlapping bridge of Web Emotes curving gracefully left toward the vista
  pushCard({ kind: 'bridge', x: -0.6, y: 4.7, z: -36.2, ry: 0.18, sx: 4.6, sz: 7.2, cardIdx: 14, amp: 0.05 }); // o_O
  pushCard({ kind: 'bridge', x: -2.4, y: 4.9, z: -42.6, ry: 0.34, sx: 4.6, sz: 7.2, cardIdx: 29, amp: 0.05 }); // >_<
  pushCard({ kind: 'bridge', x: -4.8, y: 5.1, z: -48.6, ry: 0.22, sx: 4.6, sz: 7.2, cardIdx: 32, amp: 0.05 }); // :3
  pushCard({ kind: 'bridge', x: -5.6, y: 5.2, z: -55.0, ry: -0.05, sx: 4.8, sz: 7.2, cardIdx: 15, checkpoint: true, amp: 0.08 }); // T_T Lookout Edge

  // ── SECTION 3: Dream-Sight Phantom Bridge ─────────────────────────────────
  // Shimmering hidden kaomoji cards revealed & solidified with Q (Dream Sight) — curving back right!
  pushCard({ kind: 'phantom', x: -4.0, y: 5.3, z: -61.2, ry: -0.28, sx: 4.4, sz: 6.2, cardIdx: 39, amp: 0.12 }); // UwU
  pushCard({ kind: 'phantom', x: -1.2, y: 5.4, z: -66.8, ry: -0.32, sx: 4.4, sz: 6.2, cardIdx: 42, amp: 0.14 }); // OwO
  // Stepping x_x card right before the Updraft Vent
  pushCard({ kind: 'platform', x: 2.0, y: 5.4, z: -73.0, ry: -0.08, sx: 4.8, sz: 6.6, cardIdx: 30, checkpoint: true, amp: 0.18 }); // x_x

  // ── SECTION 4: Elevated Terrace After Updraft + Emote Slide + Unfolding Bridge ─
  // Catch this elevated >:D → B) deck by riding Updraft #1 at (2.2, 4.0, -79.2)!
  pushCard({ kind: 'platform', x: 2.2, y: 12.6, z: -86.6, ry: 0.0, sx: 5.4, sz: 7.4, cardIdx: 6, checkpoint: true, amp: 0.12 }); // >:D
  pushCard({ kind: 'bridge', x: 2.2, y: 12.6, z: -93.4, ry: 0.0, sx: 5.0, sz: 6.8, cardIdx: 21, amp: 0.04 }); // B)
  // Tilted Card Slide Ramp (D:) sloping smoothly downward into the unfolding crimson bridge!
  pushCard({ kind: 'slide', x: 2.2, y: 10.65, z: -104.2, rx: -0.23, ry: 0.0, sx: 4.8, sz: 16.5, cardIdx: 18, amp: 0.0 }); // D: Slide!

  // 5 Domino-Unfolding Crimson-Backed <3 Cards snapping into place one-by-one ahead of the player!
  for (let i = 0; i < 5; i++) {
    pushCard({
      kind: 'unfolding',
      x: 2.2 - i * 0.45,
      y: 8.65 - i * 0.12,
      z: -115.2 - i * 5.2,
      ry: 0.08,
      sx: 4.6,
      sz: 5.4,
      cardIdx: [4, 2, 16, 40, 27][i],
      backOnTop: true, // Crimson pixel <3 ornate back facing up!
      amp: 0.06,
    });
  }

  // Rising Entry Approach Cards leading directly into the House-of-Cards Emote Castle Gate!
  pushCard({ kind: 'bridge', x: 0.0, y: 8.0, z: -141.4, ry: 0.0, sx: 5.4, sz: 7.4, cardIdx: 7, checkpoint: true, amp: 0.05 }); // xD
  pushCard({ kind: 'bridge', x: 0.0, y: 8.2, z: -148.2, rx: 0.08, ry: 0.0, sx: 5.4, sz: 7.2, cardIdx: 41, amp: 0.0 }); // ^_^ Gateway Ramp

  // ── SECTION 5: Walkable House-of-Cards Emote Castle Courtyard ─────────────
  const cy = 8.55;
  // Wide playable 3x4 giant sprite-stacked emote-card floor courtyard
  const floorDeck = [
    { x: 0.0, z: -156.5, idx: 46, back: false }, // ^_~
    { x: -7.2, z: -156.5, idx: 52, back: true }, // Crimson <3 carpet tile
    { x: 7.2, z: -156.5, idx: 52, back: true },
    { x: 0.0, z: -165.5, idx: 25, back: false }, // ¯\_(ツ)_/¯ center plaza
    { x: -7.2, z: -165.5, idx: 8, back: false }, // ;P
    { x: 7.2, z: -165.5, idx: 17, back: false }, // :O
    { x: 0.0, z: -174.5, idx: 52, back: true }, // Crimson sanctuary runner
    { x: -7.2, z: -174.5, idx: 44, back: false }, // *-*
    { x: 7.2, z: -174.5, idx: 33, back: false }, // ._.
    // North Sky Plunge Balcony overlooking Virginia Sylva below!
    { x: 0.0, z: -183.5, idx: 4, back: false }, // <3 Plunge Balcony
  ];
  floorDeck.forEach((tile, idx) => {
    pushCard({
      kind: 'castle-floor',
      x: tile.x,
      y: cy,
      z: tile.z,
      sx: 7.4,
      sz: 9.2,
      cardIdx: tile.idx,
      backOnTop: tile.back,
      checkpoint: idx === 3,
      amp: 0.0,
    });
  });

  // Solid Walkable Castle Walls with Grand Open Archways (rotX = PI/2 stands cards vertically!)
  const wallY = cy + 5.6;
  const wallH = 11.2;
  // South Gate Wall (left & right of the wide central doorway x = -3.4..+3.4)
  pushCard({ kind: 'castle-wall', x: -7.4, y: wallY, z: -152.0, rx: Math.PI / 2, ry: 0, sx: 7.8, sz: wallH, cardIdx: 12 }); // K♠
  pushCard({ kind: 'castle-wall', x: 7.4, y: wallY, z: -152.0, rx: Math.PI / 2, ry: 0, sx: 7.8, sz: wallH, cardIdx: 24 }); // Q♥
  // Overhead Gate Lintel Card spanning the open castle archway!
  pushCard({ kind: 'monolith', x: 0.0, y: cy + 9.2, z: -152.0, rx: Math.PI / 2, ry: 0, sx: 7.4, sz: 4.4, cardIdx: CARD_BACK_INDEX, backOnTop: true });

  // West & East Castle Side Walls (with dramatic open side-sky windows!)
  pushCard({ kind: 'castle-wall', x: -11.0, y: wallY, z: -157.0, rx: Math.PI / 2, ry: Math.PI / 2, sx: 9.0, sz: wallH, cardIdx: 38 }); // K♣
  pushCard({ kind: 'castle-wall', x: -11.0, y: wallY, z: -173.5, rx: Math.PI / 2, ry: Math.PI / 2, sx: 9.0, sz: wallH, cardIdx: CARD_BACK_INDEX, backOnTop: true });
  pushCard({ kind: 'castle-wall', x: 11.0, y: wallY, z: -157.0, rx: Math.PI / 2, ry: Math.PI / 2, sx: 9.0, sz: wallH, cardIdx: 51 }); // K♦
  pushCard({ kind: 'castle-wall', x: 11.0, y: wallY, z: -173.5, rx: Math.PI / 2, ry: Math.PI / 2, sx: 9.0, sz: wallH, cardIdx: CARD_BACK_INDEX, backOnTop: true });

  // Interior Courtyard Pillar Cards framing the center archway (open walk-through center!)
  pushCard({ kind: 'castle-wall', x: -7.2, y: wallY, z: -169.8, rx: Math.PI / 2, ry: 0, sx: 7.0, sz: wallH, cardIdx: 11 }); // Q♠
  pushCard({ kind: 'castle-wall', x: 7.2, y: wallY, z: -169.8, rx: Math.PI / 2, ry: 0, sx: 7.0, sz: wallH, cardIdx: 37 }); // Q♣

  // Upper Story Battlement Towers (2nd tier of the House of Cards!)
  const tier2Y = cy + 16.4;
  pushCard({ kind: 'monolith', x: -10.8, y: tier2Y, z: -156.8, rx: Math.PI / 2, ry: 0.0, sx: 7.2, sz: 10.6, cardIdx: 0 }); // A♠
  pushCard({ kind: 'monolith', x: 10.8, y: tier2Y, z: -156.8, rx: Math.PI / 2, ry: 0.0, sx: 7.2, sz: 10.6, cardIdx: 13 }); // A♥
  pushCard({ kind: 'monolith', x: -10.8, y: tier2Y, z: -174.0, rx: Math.PI / 2, ry: Math.PI / 2, sx: 7.2, sz: 10.6, cardIdx: 25 }); // K♥
  pushCard({ kind: 'monolith', x: 10.8, y: tier2Y, z: -174.0, rx: Math.PI / 2, ry: Math.PI / 2, sx: 7.2, sz: 10.6, cardIdx: 39 }); // A♦

  // Walkable Upper Castle Battlement + Grand Golden Summit Ace (reached via Courtyard Updraft #2!)
  pushCard({ kind: 'platform', x: 0.0, y: cy + 11.4, z: -170.5, sx: 7.6, sz: 9.6, cardIdx: CARD_SUMMIT_INDEX, checkpoint: true, amp: 0.08 });

  // ── SECTION 6: Distant House-of-Cards Towers & Cathedral Sky Monoliths ────
  // Leaning house-of-cards castle silhouette visible right from the Club highway (0:13–0:15!)
  const castleCluster = [
    { x: 24, y: 12, z: -56, rx: 1.48, ry: 0.12, rz: 0.0, sx: 9, sz: 14, idx: 12 },
    { x: 33, y: 12, z: -56, rx: 1.48, ry: -0.1, rz: 0.0, sx: 9, sz: 14, idx: CARD_BACK_INDEX, back: true },
    { x: 28.5, y: 24, z: -56, rx: 1.52, ry: 0.02, rz: 0.0, sx: 10, sz: 15, idx: 25 },
    { x: 24, y: 12, z: -65, rx: 1.50, ry: 1.57, rz: 0.0, sx: 9, sz: 14, idx: 37 },
    { x: 33, y: 12, z: -65, rx: 1.50, ry: 1.57, rz: 0.0, sx: 9, sz: 14, idx: 0 },
    // Leaning A-frame card-house legs below the floating castle (just like 0:34–0:41!)
    { x: -16, y: 0, z: -155, rx: 1.25, ry: 0.2, rz: 0.25, sx: 10, sz: 16, idx: 13 },
    { x: 16, y: 0, z: -155, rx: 1.25, ry: -0.2, rz: -0.25, sx: 10, sz: 16, idx: 39 },
    { x: -16, y: 0, z: -174, rx: 1.25, ry: -0.2, rz: 0.22, sx: 10, sz: 16, idx: CARD_BACK_INDEX, back: true },
    { x: 16, y: 0, z: -174, rx: 1.25, ry: 0.2, rz: -0.22, sx: 10, sz: 16, idx: CARD_BACK_INDEX, back: true },
    // Soaring distant cathedral monoliths framing the sky corridor
    { x: -34, y: 16, z: -32, rx: 1.48, ry: 0.36, rz: 0.1, sx: 18, sz: 27, idx: 11 },
    { x: -46, y: 22, z: -96, rx: 1.52, ry: 0.45, rz: 0.14, sx: 24, sz: 36, idx: CARD_BACK_INDEX, back: true },
    { x: 46, y: 24, z: -108, rx: 1.46, ry: -0.42, rz: -0.14, sx: 24, sz: 36, idx: 50 },
    { x: -38, y: 34, z: -206, rx: 1.54, ry: 0.32, rz: 0.1, sx: 26, sz: 40, idx: 0 },
    { x: 38, y: 34, z: -206, rx: 1.54, ry: -0.32, rz: -0.1, sx: 26, sz: 40, idx: 13 },
    { x: 0, y: 46, z: -222, rx: 1.56, ry: 0.0, rz: 0.0, sx: 34, sz: 50, idx: CARD_SUMMIT_INDEX },
  ];

  castleCluster.forEach((m, i) => {
    pushCard({
      kind: 'monolith',
      x: m.x,
      y: m.y,
      z: m.z,
      rx: m.rx,
      ry: m.ry,
      rz: m.rz,
      sx: m.sx,
      sy: 0.38,
      sz: m.sz,
      cardIdx: m.idx,
      backOnTop: Boolean(m.back),
      amp: i < 9 ? 0.08 : 0.45,
      freq: 0.3 + (i % 4) * 0.05,
      phase: i * 1.1,
    });
  });

  // ── UPDRAFT WIND COLUMNS (Steam/Cloud Chimneys that launch you skyward!) ──
  const updrafts: UpdraftZone[] = [
    // Updraft #1: Between the 5♣ leap card and the high Slide Terrace (0:29–0:32!)
    {
      id: 0,
      x: 2.2,
      baseY: 2.0,
      topY: 16.5,
      z: -79.2,
      radius: 3.1,
      liftStrength: 14.5,
    },
    // Updraft #2: Inside the House-of-Cards Castle Courtyard up to the Golden Summit Ace!
    {
      id: 1,
      x: 0.0,
      baseY: cy - 0.5,
      topY: cy + 14.5,
      z: -162.5,
      radius: 3.0,
      liftStrength: 15.2,
    },
  ];

  // ── SECTION 7: Dynamic Trajectory-Predictive Angelic Catch-Card Pool (×12) ──
  // Pre-allocated in the same instanced GPU buffer (zero extra draw calls);
  // cards peel smoothly out of the sky vortex to catch the player over open sky.
  const catchFaceDeck = [0, 13, 26, 39, 4, 17, 30, 43, 11, 24, 37, 50];
  for (let i = 0; i < 12; i++) {
    pushCard({
      kind: 'catch',
      x: 0,
      y: -90,
      z: 0,
      sx: 4.8,
      sy: 0.22,
      sz: 6.4,
      cardIdx: catchFaceDeck[i % catchFaceDeck.length],
      backOnTop: i % 3 === 2,
      amp: 0.08,
      freq: 1.05,
      phase: i * 0.7,
    });
  }

  return { cards, updrafts };
}

// Sprite-stacked horizontal voxel-slice builder for the articulated girl silhouette!
// Builds discrete stacked pixel-stepped layers so the girl rotates like a genuine Virginia Sylva sprite stack.
function makeTaperedCutout(
  topW: number,
  botW: number,
  height: number,
  depth: number,
  pivotY: number,
  flutterTop: number,
  flutterBot: number,
  slices = 5,
): { vertices: Float32Array; indices: Uint16Array } {
  const verts: number[] = [];
  const inds: number[] = [];
  let c = 0;

  const pushQuad = (
    p0: [number, number, number, number],
    p1: [number, number, number, number],
    p2: [number, number, number, number],
    p3: [number, number, number, number],
    nx: number,
    ny: number,
    nz: number,
  ) => {
    const i0 = c++;
    const i1 = c++;
    const i2 = c++;
    const i3 = c++;
    verts.push(
      p0[0], p0[1], p0[2], nx, ny, nz, p0[3],
      p1[0], p1[1], p1[2], nx, ny, nz, p1[3],
      p2[0], p2[1], p2[2], nx, ny, nz, p2[3],
      p3[0], p3[1], p3[2], nx, ny, nz, p3[3],
    );
    inds.push(i0, i1, i2, i0, i2, i3);
  };

  for (let s = 0; s < slices; s++) {
    const t0 = s / slices;
    const t1 = (s + 1) / slices;
    const tm = (t0 + t1) * 0.5;
    const y0 = -pivotY + t0 * height;
    const y1 = -pivotY + t1 * height;
    const w = (botW + (topW - botW) * tm) * 0.5;
    // Slight alternating slice bevel makes each stacked voxel layer pop cleanly
    const stepMul = s % 2 === 0 ? 1.0 : 0.94;
    const hw = w * stepMul;
    const hd = depth * 0.5 * stepMul;
    const f0 = flutterBot + (flutterTop - flutterBot) * t0;
    const f1 = flutterBot + (flutterTop - flutterBot) * t1;

    pushQuad([-hw, y0, hd, f0], [hw, y0, hd, f0], [hw, y1, hd, f1], [-hw, y1, hd, f1], 0, 0, 1);
    pushQuad([hw, y0, -hd, f0], [-hw, y0, -hd, f0], [-hw, y1, -hd, f1], [hw, y1, -hd, f1], 0, 0, -1);
    pushQuad([-hw, y1, hd, f1], [hw, y1, hd, f1], [hw, y1, -hd, f1], [-hw, y1, -hd, f1], 0, 1, 0);
    pushQuad([-hw, y0, -hd, f0], [hw, y0, -hd, f0], [hw, y0, hd, f0], [-hw, y0, hd, f0], 0, -1, 0);
    pushQuad([hw, y0, hd, f0], [hw, y0, -hd, f0], [hw, y1, -hd, f1], [hw, y1, hd, f1], 1, 0, 0);
    pushQuad([-hw, y0, -hd, f0], [-hw, y0, hd, f0], [-hw, y1, hd, f1], [-hw, y1, -hd, f1], -1, 0, 0);
  }

  return { vertices: new Float32Array(verts), indices: new Uint16Array(inds) };
}

// Sprite-stacked tiered pleated dress skirt (6 crisp stepped circular sprite discs!)
function makeFlaredSkirtMesh(): { vertices: Float32Array; indices: Uint16Array } {
  const verts: number[] = [];
  const inds: number[] = [];
  const segs = 10;
  const tiers = 6;
  const topR = 0.16;
  const botR = 0.45;
  const h = 0.56;
  let vCur = 0;

  for (let t = 0; t < tiers; t++) {
    const f0 = t / tiers;
    const f1 = (t + 1) / tiers;
    const fm = (f0 + f1) * 0.5;
    const yTop = -f0 * h;
    const yBot = -f1 * h;
    const r = topR + (botR - topR) * fm;
    const flutter = 0.08 + fm * 0.8;

    const ringStart = vCur;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const pleat = 1.0 + Math.sin(a * 5 + t * 0.5) * 0.06;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const px = ca * r * pleat;
      const pz = sa * r * pleat;
      verts.push(px, yTop, pz, ca, 0.25, sa, flutter);
      verts.push(px, yBot, pz, ca, 0.05, sa, flutter);
      vCur += 2;
    }

    for (let i = 0; i < segs; i++) {
      const a = ringStart + i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      inds.push(a, b, c, c, b, d);
      inds.push(a, c, b, c, d, b);
    }

    // Flat top ledge cap on each stacked tier so the sprite layers catch sunlight!
    const centerTop = vCur++;
    verts.push(0, yTop, 0, 0, 1, 0, flutter);
    const rimStart = vCur;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const pleat = 1.0 + Math.sin(a * 5 + t * 0.5) * 0.06;
      verts.push(Math.cos(a) * r * pleat, yTop, Math.sin(a) * r * pleat, 0, 1, 0, flutter);
      vCur++;
    }
    for (let i = 0; i < segs; i++) {
      inds.push(centerTop, rimStart + i + 1, rimStart + i);
    }
  }

  return { vertices: new Float32Array(verts), indices: new Uint16Array(inds) };
}

// Wide curved "flying squirrel" paper glider shawl/cape mesh
function makeGliderCapeMesh(): { vertices: Float32Array; indices: Uint16Array } {
  const verts: number[] = [];
  const inds: number[] = [];
  const cols = 6;
  const rows = 4;

  for (let r = 0; r <= rows; r++) {
    const tr = r / rows;
    const halfSpan = 0.24 + Math.sin(tr * Math.PI * 0.78 + 0.35) * 0.72;
    const y = 0.08 - tr * 0.86;
    const zBack = -0.04 - tr * 0.18 - Math.sin(tr * Math.PI) * 0.08;
    for (let c = 0; c <= cols; c++) {
      const tc = c / cols;
      const x = (tc * 2 - 1) * halfSpan;
      const edgeNorm = Math.abs(tc * 2 - 1);
      const wingLift = edgeNorm * edgeNorm * (0.14 - tr * 0.06);
      const flutter = Math.min(1.0, tr * 0.72 + edgeNorm * 0.58);
      verts.push(x, y + wingLift, zBack, 0, 0.35, -0.94, flutter);
    }
  }

  const stride = cols + 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * stride + c;
      const b = a + 1;
      const d = a + stride;
      const e = d + 1;
      inds.push(a, d, b, b, d, e);
      inds.push(a, b, d, b, e, d);
    }
  }

  return { vertices: new Float32Array(verts), indices: new Uint16Array(inds) };
}

export function buildArticulatedGirlGeometry(): PaperGirlPartGeometry[] {
  // Crisp Alice-inspired cobalt-ink dress + pearl pinafore bow + midnight hair silhouette!
  const dressBlue: [number, number, number] = [0.16, 0.27, 0.46];
  const deepInk: [number, number, number] = [0.065, 0.072, 0.095];
  const pearlApron: [number, number, number] = [0.92, 0.91, 0.87];
  const crimsonScarf: [number, number, number] = [0.78, 0.13, 0.16];

  return [
    {
      id: 'torso',
      ...makeTaperedCutout(0.28, 0.24, 0.44, 0.15, 0.0, 0.0, 0.06),
      color: dressBlue,
    },
    {
      id: 'apron',
      ...makeTaperedCutout(0.22, 0.28, 0.40, 0.17, 0.0, 0.0, 0.18),
      color: pearlApron,
    },
    {
      id: 'skirt',
      ...makeFlaredSkirtMesh(),
      color: dressBlue,
    },
    {
      id: 'bow',
      ...makeTaperedCutout(0.32, 0.18, 0.28, 0.07, 0.24, 0.18, 0.88),
      color: pearlApron,
    },
    {
      id: 'head',
      ...makeTaperedCutout(0.25, 0.23, 0.29, 0.24, 0.0, 0.0, 0.0),
      color: deepInk,
    },
    {
      id: 'hairL',
      ...makeTaperedCutout(0.13, 0.22, 0.62, 0.07, 0.56, 0.06, 0.96),
      color: deepInk,
    },
    {
      id: 'hairR',
      ...makeTaperedCutout(0.13, 0.22, 0.62, 0.07, 0.56, 0.06, 0.96),
      color: deepInk,
    },
    {
      id: 'armL',
      ...makeTaperedCutout(0.10, 0.075, 0.52, 0.08, 0.48, 0.0, 0.12),
      color: deepInk,
    },
    {
      id: 'armR',
      ...makeTaperedCutout(0.10, 0.075, 0.52, 0.08, 0.48, 0.0, 0.12),
      color: deepInk,
    },
    {
      id: 'legL',
      ...makeTaperedCutout(0.11, 0.08, 0.60, 0.09, 0.56, 0.0, 0.0),
      color: deepInk,
    },
    {
      id: 'legR',
      ...makeTaperedCutout(0.11, 0.08, 0.60, 0.09, 0.56, 0.0, 0.0),
      color: deepInk,
    },
    {
      id: 'gliderCape',
      ...makeGliderCapeMesh(),
      color: [0.13, 0.20, 0.34],
    },
    {
      id: 'scarf',
      ...makeTaperedCutout(0.11, 0.055, 0.60, 0.04, 0.58, 0.12, 1.0),
      color: crimsonScarf,
    },
  ];
}
