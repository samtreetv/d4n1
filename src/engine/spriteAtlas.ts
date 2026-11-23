export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 7;
export const TILE_SIZE = 48;
export const ATLAS_WIDTH = ATLAS_COLS * TILE_SIZE; // 384
export const ATLAS_HEIGHT = ATLAS_ROWS * TILE_SIZE; // 336

export interface UVRect {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

export function getTileUVRect(tileIndex: number): UVRect {
  const col = tileIndex % ATLAS_COLS;
  const row = Math.floor(tileIndex / ATLAS_COLS);
  const epsU = 0.25 / ATLAS_WIDTH;
  const epsV = 0.25 / ATLAS_HEIGHT;
  return {
    u0: col / ATLAS_COLS + epsU,
    v0: row / ATLAS_ROWS + epsV,
    u1: (col + 1) / ATLAS_COLS - epsU,
    v1: (row + 1) / ATLAS_ROWS - epsV,
  };
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

class PixelTileBuffer {
  public readonly data = new Uint8ClampedArray(TILE_SIZE * TILE_SIZE * 4);

  public set(x: number, y: number, shade: number, alpha = 255) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= TILE_SIZE || iy < 0 || iy >= TILE_SIZE) return;
    const idx = (iy * TILE_SIZE + ix) * 4;
    if (alpha === 0) {
      this.data[idx + 3] = 0;
      return;
    }
    const q = shade < 0.3 ? 72 : shade < 0.56 ? 132 : shade < 0.82 ? 196 : 252;
    this.data[idx] = q;
    this.data[idx + 1] = q;
    this.data[idx + 2] = q;
    this.data[idx + 3] = 255;
  }

  public stampBlob(cx: number, cy: number, rx: number, ry: number, shade: number) {
    const x0 = Math.floor(cx - rx);
    const x1 = Math.ceil(cx + rx);
    const y0 = Math.floor(cy - ry);
    const y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x - cx) / Math.max(0.5, rx);
        const dy = (y - cy) / Math.max(0.5, ry);
        if (dx * dx + dy * dy <= 1.0) {
          this.set(x, y, shade);
        }
      }
    }
  }

  public stampRect(x0: number, y0: number, x1: number, y1: number, shade: number) {
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        this.set(x, y, shade);
      }
    }
  }

  public stampMapleLeaf(cx: number, cy: number, scale: number, shade: number, rotIdx: number) {
    const mask = [
      '0001000',
      '0101010',
      '1111111',
      '0111110',
      '1111111',
      '0011100',
      '0001000',
    ];
    for (let j = 0; j < 7; j++) {
      for (let i = 0; i < 7; i++) {
        if (mask[j][i] === '1') {
          let lx = i - 3;
          let ly = j - 3;
          if (rotIdx === 1) {
            const t = lx;
            lx = -ly;
            ly = t;
          } else if (rotIdx === 2) {
            lx = -lx;
            ly = -ly;
          } else if (rotIdx === 3) {
            const t = lx;
            lx = ly;
            ly = -t;
          }
          const px = Math.round(cx + lx * scale);
          const py = Math.round(cy + ly * scale);
          const tipBoost = i === 0 || i === 6 || j === 0 ? 0.14 : 0;
          this.set(px, py, Math.min(1, shade + tipBoost));
          if (scale > 1.15) {
            this.set(px + 1, py, Math.min(1, shade + tipBoost));
            this.set(px, py + 1, Math.min(1, shade + tipBoost));
          }
        }
      }
    }
  }

  public stampOakLeaf(cx: number, cy: number, horiz: boolean, shade: number) {
    const mask = [
      '001100',
      '011110',
      '111111',
      '011110',
      '111111',
      '011110',
      '001100',
      '001000',
    ];
    for (let j = 0; j < mask.length; j++) {
      for (let i = 0; i < mask[j].length; i++) {
        if (mask[j][i] === '1') {
          const lx = i - 2.5;
          const ly = j - 3.5;
          const px = cx + (horiz ? ly : lx);
          const py = cy + (horiz ? lx : ly);
          this.set(px, py, shade);
        }
      }
    }
  }

  public stampOvalLeaf(cx: number, cy: number, rx: number, ry: number, shade: number) {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if (Math.abs(x) / rx + Math.abs(y) / ry <= 1.15) {
          this.set(cx + x, cy + y, shade);
        }
      }
    }
  }

  public stampFloret(cx: number, cy: number, radius: number, shade: number, fourBract = false) {
    if (fourBract) {
      for (let d = -radius; d <= radius; d++) {
        for (let w = -1; w <= 1; w++) {
          if (Math.abs(d) > 0) {
            this.set(cx + d, cy + w, shade);
            this.set(cx + w, cy + d, shade);
          }
        }
      }
      this.set(cx, cy, 0.35);
    } else {
      this.stampBlob(cx, cy, radius, radius, shade);
      this.set(cx - radius, cy, shade * 0.85);
      this.set(cx + radius, cy, shade);
      this.set(cx, cy - radius, Math.min(1, shade + 0.12));
    }
  }
}

function flushTile(ctx: CanvasRenderingContext2D, tileIdx: number, buf: PixelTileBuffer) {
  const col = tileIdx % ATLAS_COLS;
  const row = Math.floor(tileIdx / ATLAS_COLS);
  const img = ctx.createImageData(TILE_SIZE, TILE_SIZE);
  img.data.set(buf.data);
  ctx.putImageData(img, col * TILE_SIZE, row * TILE_SIZE);
}

export function createBotanicalAtlasCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_WIDTH;
  canvas.height = ATLAS_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, ATLAS_WIDTH, ATLAS_HEIGHT);

  const cx = TILE_SIZE / 2;
  const cy = TILE_SIZE / 2;

  // Tiles 0, 1: White Oak Lobed Leaf Puffs
  for (let t = 0; t < 2; t++) {
    const b = new PixelTileBuffer();
    const rng = makeRng(110 + t * 37);
    const leaves = 26;
    for (let i = 0; i < leaves; i++) {
      const a = rng() * Math.PI * 2;
      const dist = Math.sqrt(rng()) * 14;
      const lx = cx + Math.cos(a) * dist;
      const ly = cy + Math.sin(a) * dist;
      const heightShade = 1 - (ly - (cy - 16)) / 34;
      const shade = Math.max(0.15, Math.min(1.0, heightShade * 0.72 + (i / leaves) * 0.35));
      b.stampOakLeaf(lx, ly, rng() > 0.5, shade);
    }
    flushTile(ctx, t, b);
  }

  // Tiles 2, 3: Red Maple Star-Leaf Puffs
  for (let t = 2; t < 4; t++) {
    const b = new PixelTileBuffer();
    const rng = makeRng(220 + t * 43);
    const leaves = 24;
    for (let i = 0; i < leaves; i++) {
      const a = rng() * Math.PI * 2;
      const dist = Math.sqrt(rng()) * 14.5;
      const lx = cx + Math.cos(a) * dist;
      const ly = cy + Math.sin(a) * dist;
      const heightShade = 1 - (ly - (cy - 16)) / 34;
      const shade = Math.max(0.15, Math.min(1.0, heightShade * 0.75 + (i / leaves) * 0.35));
      b.stampMapleLeaf(lx, ly, rng() > 0.6 ? 1.2 : 1.0, shade, Math.floor(rng() * 4));
    }
    flushTile(ctx, t, b);
  }

  // Tiles 4, 5: Dogwood & Shrub Oval Leaf Puffs
  for (let t = 4; t < 6; t++) {
    const b = new PixelTileBuffer();
    const rng = makeRng(330 + t * 51);
    const leaves = 34;
    for (let i = 0; i < leaves; i++) {
      const a = rng() * Math.PI * 2;
      const dist = Math.sqrt(rng()) * 15;
      const lx = cx + Math.cos(a) * dist;
      const ly = cy + Math.sin(a) * dist;
      const heightShade = 1 - (ly - (cy - 16)) / 34;
      const shade = Math.max(0.15, Math.min(1.0, heightShade * 0.74 + (i / leaves) * 0.34));
      b.stampOvalLeaf(lx, ly, 3 + Math.round(rng()), 2 + Math.round(rng()), shade);
    }
    flushTile(ctx, t, b);
  }

  // Tiles 6, 7: Cherry & Redbud Serrated/Heart Leaf Puffs
  for (let t = 6; t < 8; t++) {
    const b = new PixelTileBuffer();
    const rng = makeRng(440 + t * 61);
    const leaves = 32;
    for (let i = 0; i < leaves; i++) {
      const a = rng() * Math.PI * 2;
      const dist = Math.sqrt(rng()) * 14.5;
      const lx = cx + Math.cos(a) * dist;
      const ly = cy + Math.sin(a) * dist;
      const heightShade = 1 - (ly - (cy - 16)) / 34;
      const shade = Math.max(0.15, Math.min(1.0, heightShade * 0.74 + (i / leaves) * 0.34));
      b.stampOvalLeaf(lx, ly, 2 + Math.round(rng()), 3 + Math.round(rng()), shade);
    }
    flushTile(ctx, t, b);
  }

  // Tiles 8, 9: Dogwood 4-Bract Blossom Clusters
  for (let t = 8; t < 10; t++) {
    const b = new PixelTileBuffer();
    const rng = makeRng(550 + t * 29);
    const count = 11;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.4;
      const dist = i === count - 1 ? 1 : 5 + rng() * 11;
      const fx = cx + Math.cos(a) * dist;
      const fy = cy + Math.sin(a) * dist;
      const shade = Math.max(0.25, Math.min(1, 0.45 + (1 - (fy - (cy - 16)) / 34) * 0.55));
      b.stampFloret(fx, fy, 3, shade, true);
    }
    flushTile(ctx, t, b);
  }

  // Tiles 10, 11: Cherry Blossom Billowing Pixel Clouds
  for (let t = 10; t < 12; t++) {
    const b = new PixelTileBuffer();
    const rng = makeRng(660 + t * 47);
    const count = 36;
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2;
      const dist = Math.sqrt(rng()) * 15;
      const fx = cx + Math.cos(a) * dist;
      const fy = cy + Math.sin(a) * dist;
      const heightShade = 1 - (fy - (cy - 16)) / 34;
      const shade = Math.max(0.18, Math.min(1.0, heightShade * 0.68 + (i / count) * 0.38));
      b.stampFloret(fx, fy, 1.6 + rng() * 1.4, shade, false);
    }
    flushTile(ctx, t, b);
  }

  // Tiles 12, 13: Eastern Redbud Magenta Blossom Clusters
  for (let t = 12; t < 14; t++) {
    const b = new PixelTileBuffer();
    const rng = makeRng(770 + t * 53);
    const count = 34;
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2;
      const dist = Math.sqrt(rng()) * 13;
      const fx = cx + Math.cos(a) * dist;
      const fy = cy + Math.sin(a) * dist;
      const shade = Math.max(0.2, Math.min(1, 0.25 + (i / count) * 0.75));
      b.stampBlob(fx, fy, 1.5 + rng() * 1.2, 1.4 + rng() * 1.1, shade);
    }
    flushTile(ctx, t, b);
  }

  // Tiles 14, 15: Eastern White Pine Needle Fan Clusters
  for (let t = 14; t < 16; t++) {
    const b = new PixelTileBuffer();
    const rng = makeRng(880 + t * 61);
    const fans = 18;
    for (let f = 0; f < fans; f++) {
      const fx = cx + (rng() - 0.5) * 18;
      const fy = cy + (rng() - 0.5) * 14;
      const shade = Math.max(0.18, Math.min(1, 0.22 + (f / fans) * 0.78));
      const needles = 9;
      for (let n = 0; n < needles; n++) {
        const ang = -Math.PI / 2 + ((n / (needles - 1)) - 0.5) * 2.2;
        const len = 5 + rng() * 6;
        for (let step = 0; step <= len; step++) {
          b.set(
            fx + Math.cos(ang) * step,
            fy + Math.sin(ang) * step,
            step > len - 2 ? Math.min(1, shade + 0.18) : shade,
          );
        }
      }
    }
    flushTile(ctx, t, b);
  }

  // Tile 16: Winter Berry / Spring Bud Cluster
  {
    const b = new PixelTileBuffer();
    const rng = makeRng(910);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const d = 4 + rng() * 10;
      const bx = cx + Math.cos(a) * d;
      const by = cy + Math.sin(a) * d;
      b.stampBlob(bx, by, 2, 2, 0.55);
      b.set(bx - 1, by - 1, 0.98);
    }
    flushTile(ctx, 16, b);
  }

  // Tiles 17, 18, 19: 3D Sprite-Stacked Bark Cross-Section Discs
  for (let t = 17; t <= 19; t++) {
    const b = new PixelTileBuffer();
    const rng = makeRng(1000 + t * 29);
    const r = 18;
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const ang = Math.atan2(dy, dx);
        const ridge =
          t === 17
            ? Math.sin(ang * 8) * 1.8
            : t === 19
              ? Math.sin(ang * 5) * 1.4
              : Math.sin(ang * 3) * 0.7;
        const dist = Math.hypot(dx, dy);
        if (dist <= r + ridge) {
          const rim = dist > r + ridge - 2.2;
          const sunAngle = (dx * 0.65 - dy * 0.65) / r;
          let shade = 0.55 + sunAngle * 0.4;
          if (rim && sunAngle < 0) shade = 0.2;
          if (rim && sunAngle > 0.35) shade = 0.92;
          if (rng() > 0.88 && t !== 18) shade *= 0.75;
          b.set(x, y, Math.max(0.15, Math.min(1, shade)));
        }
      }
    }
    flushTile(ctx, t, b);
  }

  // Tile 20..24: Single Falling Leaves / Petals / Needles
  {
    const b = new PixelTileBuffer();
    b.stampOakLeaf(cx, cy, false, 0.88);
    b.stampOakLeaf(cx + 1, cy, false, 0.78);
    flushTile(ctx, 20, b);
  }
  {
    const b = new PixelTileBuffer();
    b.stampMapleLeaf(cx, cy, 1.5, 0.9, 0);
    flushTile(ctx, 21, b);
  }
  {
    const b = new PixelTileBuffer();
    b.stampOvalLeaf(cx, cy, 3, 5, 0.88);
    flushTile(ctx, 22, b);
  }
  {
    const b = new PixelTileBuffer();
    b.stampBlob(cx, cy, 2.5, 2.5, 0.92);
    b.set(cx + 1, cy - 1, 1.0);
    flushTile(ctx, 23, b);
  }
  {
    const b = new PixelTileBuffer();
    for (let i = -2; i <= 2; i++) {
      for (let s = 0; s < 8; s++) {
        b.set(cx + Math.round(i * s * 0.3), cy + 3 - s, 0.85);
      }
    }
    flushTile(ctx, 24, b);
  }

  // Tiles 25, 26: Crisp Pixel Grass & Fern Tufts
  for (let t = 25; t <= 26; t++) {
    const b = new PixelTileBuffer();
    const rng = makeRng(1200 + t * 23);
    for (let blade = 0; blade < 7; blade++) {
      const bx = cx - 9 + blade * 3;
      const lean = (blade - 3) * 1.4 + (rng() - 0.5) * 2;
      const h = 10 + Math.floor(rng() * 9);
      for (let s = 0; s < h; s++) {
        const f = s / h;
        const px = bx + lean * f * f;
        const py = TILE_SIZE - 4 - s;
        b.set(px, py, 0.38 + f * 0.58);
        if (s < h * 0.45) b.set(px + 1, py, 0.28 + f * 0.45);
      }
    }
    flushTile(ctx, t, b);
  }

  // Tile 27: Crisp Pixel Rain Streak
  {
    const b = new PixelTileBuffer();
    for (let y = 10; y < 38; y++) b.set(cx, y, y > 28 ? 0.95 : 0.65);
    flushTile(ctx, 27, b);
  }

  // Tile 28: Crisp Pixel Snow Crystal
  {
    const b = new PixelTileBuffer();
    b.set(cx, cy, 1.0);
    b.set(cx - 1, cy, 0.85);
    b.set(cx + 1, cy, 0.85);
    b.set(cx, cy - 1, 0.85);
    b.set(cx, cy + 1, 0.85);
    flushTile(ctx, 28, b);
  }

  // Tile 29: Crisp Pixel Firefly Glow
  {
    const b = new PixelTileBuffer();
    b.stampBlob(cx, cy, 2.2, 2.2, 0.6);
    b.set(cx, cy, 1.0);
    flushTile(ctx, 29, b);
  }

  // Tile 30: Horizontal 3D Foliage Slice Disc
  {
    const b = new PixelTileBuffer();
    const rng = makeRng(1400);
    const count = 24;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.3;
      const dist = 5 + rng() * 11;
      const lx = cx + Math.cos(a) * dist;
      const ly = cy + Math.sin(a) * dist;
      const shade = Math.max(0.2, Math.min(1, 0.45 + Math.sin(a - 0.7) * 0.45));
      b.stampBlob(lx, ly, 4 + rng() * 3, 4 + rng() * 3, shade);
    }
    b.stampBlob(cx, cy, 10, 10, 0.55);
    flushTile(ctx, 30, b);
  }

  // Tile 31: Crisp Pixel Ground Shadow Disc
  {
    const b = new PixelTileBuffer();
    b.stampBlob(cx, cy, 18, 18, 0.5);
    flushTile(ctx, 31, b);
  }

  // Tile 32: Faceted Granite Rock Disc for Stacked Mossy Boulders
  {
    const b = new PixelTileBuffer();
    const rng = makeRng(1520);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const a = Math.atan2(dy, dx);
        const polyR = 16 + Math.cos(a * 5 + 0.6) * 2.2 + Math.sin(a * 3) * 1.5;
        const dist = Math.hypot(dx, dy);
        if (dist <= polyR) {
          const sun = (dx * 0.5 - dy * 0.75) / 16;
          let shade = 0.54 + sun * 0.42;
          if (dist > polyR - 2.2) shade *= 0.65;
          if (rng() > 0.9) shade += 0.14;
          b.set(x, y, Math.max(0.18, Math.min(1, shade)));
        }
      }
    }
    flushTile(ctx, 32, b);
  }

  // Tile 33: Square Stacked Cedar Lantern Timber Slice
  {
    const b = new PixelTileBuffer();
    b.stampRect(cx - 15, cy - 15, cx + 15, cy + 15, 0.32);
    b.stampRect(cx - 13, cy - 13, cx + 13, cy + 13, 0.65);
    b.stampRect(cx - 11, cy - 11, cx + 9, cy + 9, 0.88);
    flushTile(ctx, 33, b);
  }

  // Tile 34: Glowing Warm Lantern Glass Core (Emissive)
  {
    const b = new PixelTileBuffer();
    b.stampRect(cx - 12, cy - 12, cx + 12, cy + 12, 0.72);
    b.stampRect(cx - 8, cy - 8, cx + 8, cy + 8, 0.98);
    flushTile(ctx, 34, b);
  }

  // Tile 35: Interlocking Flagstone Paver Cluster (Path Brush)
  {
    const b = new PixelTileBuffer();
    const stones = [
      { x0: 6, y0: 8, x1: 22, y1: 21, s: 0.78 },
      { x0: 25, y0: 6, x1: 41, y1: 19, s: 0.64 },
      { x0: 8, y0: 24, x1: 20, y1: 39, s: 0.56 },
      { x0: 23, y0: 22, x1: 40, y1: 37, s: 0.86 },
      { x0: 14, y0: 14, x1: 32, y1: 29, s: 0.72 },
    ];
    for (const st of stones) {
      b.stampRect(st.x0, st.y0, st.x1, st.y1, st.s * 0.65);
      b.stampRect(st.x0 + 1, st.y0 + 1, st.x1 - 2, st.y1 - 2, st.s);
    }
    // Crisp mortar seams
    for (let i = 6; i < 42; i++) {
      b.set(22, i, 0.24);
      b.set(i, 21, 0.24);
    }
    flushTile(ctx, 35, b);
  }

  // Tile 36: Crushed Limestone Gravel Aggregate Disc (Path Brush)
  {
    const b = new PixelTileBuffer();
    const rng = makeRng(1636);
    b.stampBlob(cx, cy, 18, 18, 0.52);
    for (let i = 0; i < 140; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * 17.5;
      const gx = cx + Math.cos(a) * r;
      const gy = cy + Math.sin(a) * r;
      b.stampRect(gx, gy, gx + 1, gy + 1, 0.28 + rng() * 0.68);
    }
    flushTile(ctx, 36, b);
  }

  // Tile 37: Sculpted Natural Garden Stepping Stone Slab
  {
    const b = new PixelTileBuffer();
    const rng = makeRng(1637);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const dx = (x - cx) * 0.92;
        const dy = (y - cy) * 1.08;
        const a = Math.atan2(dy, dx);
        const rad = 16 + Math.cos(a * 3 + 0.4) * 2.2 + Math.sin(a * 5) * 1.1;
        const d = Math.hypot(dx, dy);
        if (d <= rad) {
          let shade = 0.72 + ((dx * 0.3 - dy * 0.5) / 20);
          if (d > rad - 2.0) shade = 0.32;
          else if (rng() > 0.88) shade += 0.12;
          b.set(x, y, Math.max(0.22, Math.min(0.98, shade)));
        }
      }
    }
    flushTile(ctx, 37, b);
  }

  // Tile 38: Shredded Cedar Mulch Bed Disc (Path / Bed Brush)
  {
    const b = new PixelTileBuffer();
    const rng = makeRng(1638);
    b.stampBlob(cx, cy, 18, 18, 0.36);
    for (let i = 0; i < 95; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * 16.5;
      const mx = cx + Math.cos(a) * r;
      const my = cy + Math.sin(a) * r;
      b.stampRect(mx - 2, my, mx + 2, my + 1, 0.25 + rng() * 0.55);
    }
    flushTile(ctx, 38, b);
  }

  // Tile 39: Luminous Rippled Reflecting Pond Water Disc
  {
    const b = new PixelTileBuffer();
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.hypot(dx, dy);
        if (d <= 20) {
          const ripple = Math.sin(d * 0.85) * 0.14 + Math.cos(x * 0.45 + y * 0.2) * 0.08;
          const depth = 1 - d / 22;
          let shade = 0.42 + depth * 0.32 + ripple;
          if (Math.abs(y - 16) < 1.2 && Math.abs(x - 20) < 6) shade = 0.96;
          if (Math.abs(y - 29) < 1.0 && Math.abs(x - 28) < 5) shade = 0.92;
          b.set(x, y, Math.max(0.2, Math.min(1, shade)));
        }
      }
    }
    flushTile(ctx, 39, b);
  }

  // Tile 40: Floating Pixel Water Lily Pads
  {
    const b = new PixelTileBuffer();
    const pads = [
      { x: 16, y: 18, r: 6.5 },
      { x: 31, y: 26, r: 5.5 },
      { x: 22, y: 34, r: 4.5 },
    ];
    for (const p of pads) {
      for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
          const dx = x - p.x;
          const dy = y - p.y;
          const d = Math.hypot(dx, dy);
          const a = Math.atan2(dy, dx);
          if (d <= p.r && !(a > 0.15 && a < 0.65)) {
            b.set(x, y, d > p.r - 1.3 ? 0.38 : 0.72 + (-dy / p.r) * 0.2);
          }
        }
      }
    }
    flushTile(ctx, 40, b);
  }

  // Tile 41: Architectural Cedar Timber Plank / Deck / Pergola Beam
  {
    const b = new PixelTileBuffer();
    b.stampRect(4, 10, 43, 37, 0.36);
    // 4 crisp timber slats with bevel grain
    for (let s = 0; s < 4; s++) {
      const y0 = 11 + s * 6.5;
      b.stampRect(5, y0, 42, y0 + 5, s % 2 === 0 ? 0.72 : 0.62);
      b.stampRect(6, y0, 41, y0 + 1.5, 0.9);
      b.stampRect(5, y0 + 5, 42, y0 + 5.5, 0.24);
    }
    flushTile(ctx, 41, b);
  }

  // Tile 42: Dry-Stack Virginia Fieldstone Wall Block
  {
    const b = new PixelTileBuffer();
    b.stampRect(4, 12, 43, 35, 0.28);
    const blocks = [
      [5, 13, 18, 22, 0.74],
      [20, 13, 33, 22, 0.62],
      [35, 13, 42, 22, 0.84],
      [5, 24, 13, 34, 0.64],
      [15, 24, 29, 34, 0.86],
      [31, 24, 42, 34, 0.56],
    ];
    for (const [x0, y0, x1, y1, sh] of blocks) {
      b.stampRect(x0, y0, x1, y1, sh);
      b.stampRect(x0, y0, x1, y0 + 1.5, Math.min(0.98, sh + 0.14));
    }
    flushTile(ctx, 42, b);
  }

  // Tile 43: Split-Rail Cedar Fence Beam
  {
    const b = new PixelTileBuffer();
    b.stampRect(3, 18, 44, 29, 0.34);
    b.stampRect(4, 19, 43, 27, 0.68);
    b.stampRect(4, 19, 43, 21, 0.9);
    // Post end caps
    b.stampRect(3, 16, 8, 31, 0.52);
    b.stampRect(39, 16, 44, 31, 0.52);
    flushTile(ctx, 43, b);
  }

  // Tile 44: Woodland Fern Frond Cluster
  {
    const b = new PixelTileBuffer();
    for (let f = 0; f < 7; f++) {
      const a = -Math.PI * 0.88 + (f / 6) * Math.PI * 0.76;
      const len = 15 + (f % 2) * 4;
      for (let s = 2; s <= len; s++) {
        const px = cx + Math.cos(a) * s;
        const py = 39 + Math.sin(a) * s;
        const pinna = (1 - s / (len + 2)) * 4.2;
        const nx = -Math.sin(a);
        const ny = Math.cos(a);
        const sh = 0.34 + (s / len) * 0.6;
        b.set(px, py, sh);
        if (s % 2 === 0) {
          b.stampRect(px - nx * pinna, py - ny * pinna, px + nx * pinna, py + ny * pinna, sh);
        }
      }
    }
    flushTile(ctx, 44, b);
  }

  // Tile 45: Blue Ridge Meadow Wildflower Cluster
  {
    const b = new PixelTileBuffer();
    const rng = makeRng(1645);
    // Delicate flower stems
    for (let i = 0; i < 11; i++) {
      const sx = 12 + i * 2.4 + (rng() - 0.5) * 2;
      const topY = 12 + rng() * 14;
      for (let y = topY + 3; y <= 40; y++) {
        b.set(sx + Math.sin(y * 0.25 + i) * 0.8, y, 0.35);
      }
      // Crisp 5-pixel star bloom head
      b.stampBlob(sx, topY, 2.4, 2.4, 0.95);
      b.set(sx, topY, 0.62);
    }
    flushTile(ctx, 45, b);
  }

  // Tile 46: Raised Cedar Garden Bed Soil & Herbs Frame
  {
    const b = new PixelTileBuffer();
    // Outer cedar timber box border
    b.stampRect(5, 9, 42, 38, 0.42);
    b.stampRect(6, 10, 41, 37, 0.76);
    // Rich dark compost soil interior
    b.stampRect(10, 14, 37, 33, 0.26);
    const rng = makeRng(1646);
    for (let i = 0; i < 42; i++) {
      b.set(11 + rng() * 25, 15 + rng() * 17, 0.38 + rng() * 0.25);
    }
    flushTile(ctx, 46, b);
  }

  // Tile 47: Architectural Glass & Cedar Pavilion Lattice Roof
  {
    const b = new PixelTileBuffer();
    b.stampRect(5, 5, 42, 42, 0.76);
    // Translucent glass panes with bright specular diagonal
    for (let y = 7; y <= 40; y++) {
      for (let x = 7; x <= 40; x++) {
        const diag = Math.abs((x - y) - 4) < 3 || Math.abs((x - y) + 12) < 2;
        b.set(x, y, diag ? 0.98 : 0.66);
      }
    }
    // Crisp dark cedar mullions
    b.stampRect(5, 5, 42, 7, 0.3);
    b.stampRect(5, 40, 42, 42, 0.3);
    b.stampRect(5, 5, 7, 42, 0.3);
    b.stampRect(40, 5, 42, 42, 0.3);
    b.stampRect(23, 5, 25, 42, 0.32);
    b.stampRect(5, 23, 42, 25, 0.32);
    flushTile(ctx, 47, b);
  }

  // Tile 48: Piano Keybed Slice (ivory keys with rhythmic ebony sharps)
  {
    const b = new PixelTileBuffer();
    b.stampRect(4, 14, 43, 33, 0.96);
    for (let x = 8; x <= 40; x += 4) {
      b.stampRect(x, 15, x, 32, 0.62);
    }
    const sharpCols = [7, 11, 19, 23, 27, 35, 39];
    for (const sx of sharpCols) {
      b.stampRect(sx, 14, sx + 1, 24, 0.16);
    }
    b.stampRect(4, 32, 43, 33, 0.44);
    flushTile(ctx, 48, b);
  }

  // Tile 49: Circular Studio Tape Reel / Woofer Cone
  {
    const b = new PixelTileBuffer();
    b.stampBlob(24, 24, 20, 20, 0.88);
    b.stampBlob(24, 24, 16, 16, 0.36);
    b.stampBlob(24, 24, 14, 14, 0.78);
    // 3 radial reel cutouts / spoke accents
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 - Math.PI / 2;
      b.stampBlob(24 + Math.cos(a) * 10, 24 + Math.sin(a) * 10, 3.6, 3.6, 0.2);
    }
    b.stampBlob(24, 24, 4.5, 4.5, 0.98);
    b.stampBlob(24, 24, 2.0, 2.0, 0.22);
    flushTile(ctx, 49, b);
  }

  // Tile 50: Hammered Bronze Gong / Singing Bowl Concentric Disc
  {
    const b = new PixelTileBuffer();
    b.stampBlob(24, 24, 21, 21, 0.78);
    b.stampBlob(24, 24, 18, 18, 0.96);
    b.stampBlob(24, 24, 14, 14, 0.68);
    b.stampBlob(24, 24, 10, 10, 0.92);
    b.stampBlob(24, 24, 6, 6, 0.99);
    b.stampBlob(20, 19, 4, 3, 0.99);
    flushTile(ctx, 50, b);
  }

  // Tile 51: Graduated Rosewood Marimba Tone Bars
  {
    const b = new PixelTileBuffer();
    for (let i = 0; i < 8; i++) {
      const x0 = 4 + i * 5;
      const halfH = Math.round(18 - i * 1.15);
      b.stampRect(x0, 24 - halfH, x0 + 3, 24 + halfH, i % 2 === 0 ? 0.9 : 0.74);
      b.stampRect(x0, 24 - halfH, x0 + 3, 24 - halfH + 1, 0.98);
    }
    flushTile(ctx, 51, b);
  }

  // Tile 52: Modular Synth Patchbay & Encoder Knobs
  {
    const b = new PixelTileBuffer();
    b.stampRect(5, 6, 42, 41, 0.34);
    b.stampRect(6, 7, 41, 40, 0.52);
    // Top knob rows
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 5; col++) {
        const kx = 11 + col * 6.5;
        const ky = 12 + row * 9;
        b.stampBlob(kx, ky, 2.2, 2.2, 0.96);
        b.set(kx, ky - 1, 0.2);
      }
    }
    // Lower patch jack matrix
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 6; col++) {
        const jx = 10 + col * 5.6;
        const jy = 31 + row * 5.5;
        b.stampBlob(jx, jy, 1.5, 1.5, 0.88);
        b.set(jx, jy, 0.16);
      }
    }
    flushTile(ctx, 52, b);
  }

  // Tile 53: Harp Golden String Plane & Ribs
  {
    const b = new PixelTileBuffer();
    for (let x = 8; x <= 40; x += 4) {
      const topY = Math.round(6 + ((x - 8) / 32) * 10);
      b.stampRect(x, topY, x + 1, 42, 0.94);
    }
    b.stampRect(6, 40, 41, 43, 0.72);
    flushTile(ctx, 53, b);
  }

  // Tile 54: Hourglass Cello Body Cross-Section
  {
    const b = new PixelTileBuffer();
    // Upper bout & lower bout with pinched waist
    b.stampBlob(24, 15, 11, 8, 0.84);
    b.stampBlob(24, 33, 14, 10, 0.88);
    b.stampRect(17, 17, 31, 31, 0.78);
    // Waist cinch cutouts
    b.stampBlob(11, 24, 6, 4.5, 0.0);
    for (let y = 20; y <= 28; y++) {
      for (let x = 6; x <= 16; x++) {
        const dx = (x - 11) / 5.5;
        const dy = (y - 24) / 4.2;
        if (dx * dx + dy * dy <= 1.0) b.set(x, y, 0, 0);
      }
      for (let x = 32; x <= 42; x++) {
        const dx = (x - 37) / 5.5;
        const dy = (y - 24) / 4.2;
        if (dx * dx + dy * dy <= 1.0) b.set(x, y, 0, 0);
      }
    }
    // Bridge highlight + f-hole marks
    b.stampRect(20, 23, 28, 25, 0.98);
    b.stampRect(18, 22, 18, 27, 0.24);
    b.stampRect(30, 22, 30, 27, 0.24);
    flushTile(ctx, 54, b);
  }

  // Tile 55: Hanging Bronze Wind-Chime Tubes
  {
    const b = new PixelTileBuffer();
    b.stampRect(6, 5, 41, 8, 0.66);
    const tubeLen = [24, 30, 35, 38, 34, 28, 22];
    for (let i = 0; i < tubeLen.length; i++) {
      const tx = 9 + i * 5;
      b.stampRect(tx, 9, tx + 2, 9 + tubeLen[i], i % 2 === 0 ? 0.96 : 0.78);
      b.stampRect(tx, 9, tx, 9 + tubeLen[i], 0.99);
    }
    flushTile(ctx, 55, b);
  }

  return canvas;
}

export function createBotanicalAtlas(gl: WebGL2RenderingContext): WebGLTexture {
  const canvas = createBotanicalAtlasCanvas();
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return tex;
}

/**
 * Generates a companion 8x6 painterly Oil Bristle Atlas (64px per tile)
 * directly from the 48 botanical & architectural silhouettes.
 * R = painterly pigment value, G = bristle ridge relief (impasto), B = directional stroke warmth, A = feathered oil coverage.
 */
export function createOilBristleAtlasCanvas(): HTMLCanvasElement {
  const pixelSrc = createBotanicalAtlasCanvas();
  const srcCtx = pixelSrc.getContext('2d', { willReadFrequently: true })!;
  const srcImg = srcCtx.getImageData(0, 0, ATLAS_WIDTH, ATLAS_HEIGHT).data;

  const oilTile = 64;
  const outW = ATLAS_COLS * oilTile;
  const outH = ATLAS_ROWS * oilTile;
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, outW, outH);

  const scale = oilTile / TILE_SIZE;

  for (let tileIdx = 0; tileIdx < ATLAS_COLS * ATLAS_ROWS; tileIdx++) {
    const col = tileIdx % ATLAS_COLS;
    const row = Math.floor(tileIdx / ATLAS_COLS);
    const sx0 = col * TILE_SIZE;
    const sy0 = row * TILE_SIZE;
    const dx0 = col * oilTile;
    const dy0 = row * oilTile;
    const rng = makeRng(8200 + tileIdx * 131);

    // Collect active silhouette sample points
    const samples: { x: number; y: number; lum: number }[] = [];
    for (let y = 1; y < TILE_SIZE - 1; y += 2) {
      for (let x = 1; x < TILE_SIZE - 1; x += 2) {
        const idx = ((sy0 + y) * ATLAS_WIDTH + (sx0 + x)) * 4;
        if (srcImg[idx + 3] > 120) {
          samples.push({ x, y, lum: srcImg[idx] / 255 });
        }
      }
    }
    if (samples.length === 0) continue;

    // Shuffle sample order so overlapping bristles build rich painterly depth
    for (let i = samples.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = samples[i];
      samples[i] = samples[j];
      samples[j] = tmp;
    }

    // Tile-specific brush stroke orientation & shape
    const isBarkOrStone = tileIdx === 17 || tileIdx === 18 || tileIdx === 19 || tileIdx === 32;
    const isArch = tileIdx >= 33 && tileIdx <= 55 && tileIdx !== 44 && tileIdx !== 45;
    const isNeedle = tileIdx === 14 || tileIdx === 15 || tileIdx === 24 || tileIdx === 25 || tileIdx === 26;
    const isShadow = tileIdx === 31;

    ctx.save();
    ctx.beginPath();
    ctx.rect(dx0, dy0, oilTile, oilTile);
    ctx.clip();

    // Soft underpainting body pass so dabs stay rich without pinholes
    ctx.globalAlpha = isShadow ? 0.58 : 0.72;
    ctx.filter = isShadow ? 'blur(2.4px)' : 'blur(1.1px)';
    ctx.drawImage(
      pixelSrc,
      sx0,
      sy0,
      TILE_SIZE,
      TILE_SIZE,
      dx0 + 1,
      dy0 + 1,
      oilTile - 2,
      oilTile - 2,
    );
    ctx.filter = 'none';
    ctx.globalAlpha = 1.0;

    if (!isShadow) {
      const maxDabs = Math.min(samples.length, isArch ? 90 : 120);
      for (let i = 0; i < maxDabs; i++) {
        const pt = samples[i];
        const px = dx0 + pt.x * scale + (rng() - 0.5) * 1.4;
        const py = dy0 + pt.y * scale + (rng() - 0.5) * 1.4;
        const cxRel = pt.x - TILE_SIZE * 0.5;
        const cyRel = pt.y - TILE_SIZE * 0.5;

        let ang = Math.atan2(cyRel, cxRel) + Math.PI * 0.35 + (rng() - 0.5) * 0.65;
        let rx = (2.6 + rng() * 2.5) * scale;
        let ry = (1.15 + rng() * 1.1) * scale;

        if (isArch) {
          ang = (rng() > 0.25 ? 0 : Math.PI * 0.5) + (rng() - 0.5) * 0.14;
          rx = (2.4 + rng() * 2.0) * scale;
          ry = (1.0 + rng() * 0.8) * scale;
        } else if (isNeedle) {
          ang = -Math.PI * 0.5 + (rng() - 0.5) * 1.25;
          rx = (3.4 + rng() * 2.2) * scale;
          ry = (0.75 + rng() * 0.55) * scale;
        } else if (isBarkOrStone) {
          ang = Math.atan2(cyRel, cxRel) + Math.PI * 0.5 + (rng() - 0.5) * 0.35;
          rx = (2.8 + rng() * 2.2) * scale;
          ry = (1.2 + rng() * 0.9) * scale;
        }

        // Encode tone in R, bristle impasto height in G, stroke temperature shift in B
        const tone = Math.max(0.14, Math.min(1.0, pt.lum + (rng() - 0.45) * 0.22));
        const rByte = Math.round(tone * 255);
        const ridgeByte = Math.round((0.35 + rng() * 0.6) * 255);
        const warmByte = Math.round((0.35 + tone * 0.4 + (rng() - 0.5) * 0.25) * 255);

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);

        // Main loaded oil-brush dab
        ctx.fillStyle = `rgba(${rByte},${ridgeByte},${warmByte},0.92)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fine parallel bristle grooves (impasto highlight edge + dark trough)
        const hiR = Math.min(255, rByte + 34);
        const loR = Math.max(24, rByte - 30);
        ctx.strokeStyle = `rgba(${hiR},245,${Math.min(255, warmByte + 20)},0.62)`;
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(-rx * 0.72, -ry * 0.36);
        ctx.lineTo(rx * 0.76, -ry * 0.36);
        ctx.stroke();

        ctx.strokeStyle = `rgba(${loR},70,${Math.max(18, warmByte - 20)},0.48)`;
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(-rx * 0.68, ry * 0.38);
        ctx.lineTo(rx * 0.68, ry * 0.38);
        ctx.stroke();

        ctx.restore();
      }
    }

    ctx.restore();
  }

  return canvas;
}

export function createOilBristleAtlas(gl: WebGL2RenderingContext): WebGLTexture {
  const canvas = createOilBristleAtlasCanvas();
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);

  return tex;
}
