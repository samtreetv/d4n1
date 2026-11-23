import type { PaperSkyVisualStyle } from './paperSky/CardAtlasShader';

export type PaintMaterialMode = 'pixel' | 'oil-3d' | 'living-canvas';

export type VisualFilterStyle = 'natural' | 'oil' | 'ascii' | 'dots' | 'grain' | 'scan';

export type FilterColorTint = 'full' | 'mono' | 'gold' | 'blue';

export type AsciiGlyphSetId =
  | 'classic'
  | 'fine'
  | 'blocks'
  | 'binary'
  | 'katakana'
  | 'kanji';

export type MotionFxMode = 'none' | 'pulse' | 'shimmer' | 'reveal' | 'push';

export interface VisualFilterSettings {
  style: VisualFilterStyle;
  engineStyle?: PaperSkyVisualStyle;
  colorTint: FilterColorTint;
  density: number; // 0..1 (0 = bold large cells, 1 = fine detailed cells)
  glow: number; // 0..1 bloom glow intensity
  glowThreshold: number; // 0.30..0.95 luminance threshold where bloom starts
  underImage: number; // 0..0.60 source image blend under glyph/dot/scan layers
  exposure: number; // -3.0..+3.0 EV
  contrast: number; // 0.5..3.0 (1.0 = 100% neutral)
  gamma: number; // 0.3..3.0 midtones gamma (1.0 = neutral)
  detail: number; // 0..3.0 local 3x3 unsharp-mask detail sharpening
  invert: boolean; // luminance/color inversion (luminous cream & dark silhouette mode)
  glyphSet: AsciiGlyphSetId;
  customGlyphs: string; // optional user-entered ASCII ramp, auto-sorted by ink coverage
  motion: MotionFxMode; // live optical motion FX
  shimmer: boolean;
}

export const DEFAULT_TONE_SETTINGS = {
  exposure: 0,
  contrast: 1.0,
  gamma: 1.0,
  detail: 0,
  invert: false,
} as const;

export const DEFAULT_VISUAL_FILTER: VisualFilterSettings = {
  style: 'natural',
  engineStyle: 'pixel',
  colorTint: 'full',
  density: 0.58,
  glow: 0.35,
  glowThreshold: 0.7,
  underImage: 0.16,
  exposure: 0,
  contrast: 1.0,
  gamma: 1.0,
  detail: 0,
  invert: false,
  glyphSet: 'classic',
  customGlyphs: '',
  motion: 'none',
  shimmer: true,
};

export const MOTION_FX_OPTIONS: { id: MotionFxMode; label: string }[] = [
  { id: 'none', label: 'NONE' },
  { id: 'pulse', label: 'PULSE' },
  { id: 'shimmer', label: 'SHIMMER' },
  { id: 'reveal', label: 'REVEAL' },
  { id: 'push', label: 'PUSH' },
];

export function motionFxToIndex(motion: MotionFxMode): number {
  switch (motion) {
    case 'none':
      return 0;
    case 'pulse':
      return 1;
    case 'shimmer':
      return 2;
    case 'reveal':
      return 3;
    case 'push':
      return 4;
  }
}

/**
 * Returns true whenever any Glyph Light filter, tone adjustment, invert,
 * tint, custom glow, or motion FX requires the GPU post-process pass.
 */
export function hasActiveOpticalAdjustments(vf: VisualFilterSettings): boolean {
  if (vf.style !== 'natural') return true;
  if (vf.colorTint !== 'full') return true;
  if (vf.invert) return true;
  if (vf.motion !== 'none') return true;
  if (Math.abs(vf.exposure) > 0.01) return true;
  if (Math.abs(vf.contrast - 1.0) > 0.01) return true;
  if (Math.abs(vf.gamma - 1.0) > 0.01) return true;
  if (vf.detail > 0.01) return true;
  if (Math.abs(vf.glow - DEFAULT_VISUAL_FILTER.glow) > 0.02) return true;
  if (Math.abs(vf.glowThreshold - DEFAULT_VISUAL_FILTER.glowThreshold) > 0.02) return true;
  return false;
}

export function getGlyphAtlasKey(glyphSetId: AsciiGlyphSetId, customGlyphs = ''): string {
  const trimmed = customGlyphs.trim();
  return trimmed.length >= 2 ? `custom:${trimmed}` : `preset:${glyphSetId}`;
}

export interface AsciiGlyphSetMeta {
  id: AsciiGlyphSetId;
  label: string;
  chars: string;
}

// Extracted directly from Glyph Light character ramps
export const ASCII_GLYPH_SETS: AsciiGlyphSetMeta[] = [
  { id: 'classic', label: 'Classic', chars: ' .:-=+*#%@' },
  { id: 'fine', label: 'Fine', chars: ' .·:;irsXA253hMHGS#9B&@' },
  { id: 'blocks', label: 'Blocks', chars: ' ░▒▓█' },
  { id: 'binary', label: 'Binary', chars: ' 01' },
  {
    id: 'katakana',
    label: 'Kana',
    chars: ' ･ｰｨｼﾉﾍﾄｦｺﾆﾐﾘﾈﾎﾑﾒﾜﾓﾗﾊﾏﾝｱｶｻﾀﾅ',
  },
  { id: 'kanji', label: 'Kanji', chars: ' 一二人口山日目田白百自血鬼龍' },
];

export interface VisualFilterPreset {
  id: string;
  label: string;
  settings: Partial<VisualFilterSettings>;
}

export const VISUAL_FILTER_PRESETS: VisualFilterPreset[] = [
  {
    id: 'atelier-oil',
    label: '2D Oil Glaze',
    settings: {
      style: 'oil',
      colorTint: 'full',
      density: 0.54,
      glow: 0.24,
      shimmer: false,
    },
  },
  {
    id: 'amber-ascii',
    label: 'Amber ASCII',
    settings: {
      style: 'ascii',
      colorTint: 'gold',
      density: 0.62,
      glow: 0.55,
      glyphSet: 'classic',
      shimmer: true,
    },
  },
  {
    id: 'botanical-dots',
    label: 'Bayer Dots',
    settings: {
      style: 'dots',
      colorTint: 'full',
      density: 0.66,
      glow: 0.38,
      shimmer: false,
    },
  },
  {
    id: 'midnight-scan',
    label: 'Phosphor Scan',
    settings: {
      style: 'scan',
      colorTint: 'blue',
      density: 0.56,
      glow: 0.62,
      shimmer: true,
    },
  },
  {
    id: 'film-grain',
    label: 'Silver Grain',
    settings: {
      style: 'grain',
      colorTint: 'mono',
      density: 0.72,
      glow: 0.32,
      shimmer: true,
    },
  },
];

export function getAsciiGlyphSet(id: AsciiGlyphSetId): AsciiGlyphSetMeta {
  return ASCII_GLYPH_SETS.find((s) => s.id === id) ?? ASCII_GLYPH_SETS[0];
}

export function filterStyleToIndex(style: VisualFilterStyle): number {
  switch (style) {
    case 'natural':
      return 0;
    case 'ascii':
      return 1;
    case 'dots':
      return 2;
    case 'grain':
      return 3;
    case 'scan':
      return 4;
    case 'oil':
      return 5;
  }
}

export function paintModeToIndex(mode: PaintMaterialMode): number {
  switch (mode) {
    case 'pixel':
      return 0;
    case 'oil-3d':
      return 1;
    case 'living-canvas':
      return 2;
  }
}

export function colorTintToIndex(tint: FilterColorTint): number {
  switch (tint) {
    case 'full':
      return 0;
    case 'mono':
      return 1;
    case 'gold':
      return 2;
    case 'blue':
      return 3;
  }
}

const sortedGlyphCache = new Map<string, string[]>();

/**
 * Measures ink density of each character (exact Glyph Light sorting algorithm)
 * so dark-to-bright luminance maps monotonically onto character ink coverage.
 */
export function getSortedGlyphs(charset: string): string[] {
  const cached = sortedGlyphCache.get(charset);
  if (cached) return cached;

  const unique = Array.from(new Set([...charset]));
  if (unique.length === 0) return [' ', '#'];

  if (typeof document === 'undefined') {
    sortedGlyphCache.set(charset, unique);
    return unique;
  }

  const probe = document.createElement('canvas');
  probe.width = 24;
  probe.height = 24;
  const ctx = probe.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    sortedGlyphCache.set(charset, unique);
    return unique;
  }

  const scored = unique.map((ch) => {
    ctx.clearRect(0, 0, 24, 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, 12, 13);
    const data = ctx.getImageData(0, 0, 24, 24).data;
    let ink = 0;
    for (let i = 3; i < data.length; i += 4) {
      ink += data[i];
    }
    return { ch, ink };
  });

  scored.sort((a, b) => a.ink - b.ink);
  const result = scored.map((item) => item.ch);
  sortedGlyphCache.set(charset, result);
  return result;
}

export interface GlyphRampAtlas {
  canvas: HTMLCanvasElement;
  count: number;
  glyphs: string[];
}

/**
 * Builds a single horizontal monochrome glyph-ramp texture strip (count * cellPx x cellPx)
 * used by the WebGL2 ASCII post-processing shader. Supports custom user character sets.
 */
export function buildGlyphRampAtlas(
  glyphSetId: AsciiGlyphSetId,
  cellPx = 32,
  customGlyphs = '',
): GlyphRampAtlas {
  const trimmed = customGlyphs.trim();
  const rawChars = trimmed.length >= 2 ? ` ${trimmed}` : getAsciiGlyphSet(glyphSetId).chars;
  const glyphs = getSortedGlyphs(rawChars);
  const count = glyphs.length;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(cellPx, count * cellPx);
  canvas.height = cellPx;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const fontSize = Math.round(cellPx * 0.78);
  ctx.font = `600 ${fontSize}px "IBM Plex Mono", ui-monospace, SFMono-Regular, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';

  for (let i = 0; i < count; i++) {
    ctx.fillText(glyphs[i], i * cellPx + cellPx * 0.5, cellPx * 0.54);
  }

  return { canvas, count, glyphs };
}

// 4x4 Bayer ordered-dithering matrix extracted from Glyph Light
const BAYER_4X4 = [
  [0 / 16, 8 / 16, 2 / 16, 10 / 16],
  [12 / 16, 4 / 16, 14 / 16, 6 / 16],
  [3 / 16, 11 / 16, 1 / 16, 9 / 16],
  [15 / 16, 7 / 16, 13 / 16, 5 / 16],
];

function gradeColor2D(
  r: number,
  g: number,
  b: number,
  lum: number,
  tint: FilterColorTint,
): [number, number, number] {
  if (tint === 'mono') {
    const v = Math.round(lum * 255);
    return [v, v, v];
  }
  if (tint === 'gold') {
    const l255 = lum * 255;
    return [
      Math.min(255, Math.round(l255 * 1.12 + 20)),
      Math.min(255, Math.round(l255 * 0.82)),
      Math.min(255, Math.round(l255 * 0.35)),
    ];
  }
  if (tint === 'blue') {
    const l255 = lum * 255;
    return [
      Math.min(255, Math.round(l255 * 0.35)),
      Math.min(255, Math.round(l255 * 0.75)),
      Math.min(255, Math.round(l255 * 1.12 + 20)),
    ];
  }
  return [r, g, b];
}

let sampleCanvas2D: HTMLCanvasElement | null = null;
let glowCanvas2D: HTMLCanvasElement | null = null;

/**
 * Canvas 2D implementation of all four Glyph Light filters (ASCII, Bayer Dots,
 * Stochastic Grain, Luminance Scanlines + Color Tint + Bloom Glow) used by
 * the automatic Canvas 2D fallback renderer.
 */
export function applyGlyphLightFilter2D(
  source: HTMLCanvasElement,
  targetCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: VisualFilterSettings,
  elapsedTime: number,
  reducedMotion: boolean,
  paintMode: PaintMaterialMode = 'pixel',
  impasto = 0.72,
) {
  if (settings.style === 'natural') {
    const es = settings.engineStyle ?? 'pixel';
    targetCtx.imageSmoothingEnabled = paintMode !== 'pixel' && es !== 'gameboy' && es !== 'pico8';
    targetCtx.drawImage(source, 0, 0, width, height);
    if (es === 'gameboy' || es === 'mac1bit' || es === 'risograph' || es === 'thermal' || es === 'mondrian' || es === 'crt16') {
      targetCtx.save();
      if (es === 'gameboy') {
        targetCtx.globalCompositeOperation = 'color';
        targetCtx.fillStyle = '#8bac0f';
        targetCtx.fillRect(0, 0, width, height);
      } else if (es === 'mac1bit') {
        targetCtx.globalCompositeOperation = 'saturation';
        targetCtx.fillStyle = '#000000';
        targetCtx.fillRect(0, 0, width, height);
      } else if (es === 'risograph') {
        targetCtx.globalAlpha = 0.24;
        targetCtx.globalCompositeOperation = 'multiply';
        targetCtx.fillStyle = '#ff5a5f';
        targetCtx.fillRect(0, 0, width, height);
      } else if (es === 'crt16') {
        targetCtx.globalAlpha = 0.16;
        targetCtx.fillStyle = '#000000';
        for (let y = 0; y < height; y += 3) {
          targetCtx.fillRect(0, y, width, 1);
        }
      } else if (es === 'mondrian') {
        targetCtx.strokeStyle = 'rgba(15,17,21,0.75)';
        targetCtx.lineWidth = 2;
        for (let x = 0; x < width; x += 64) {
          targetCtx.beginPath();
          targetCtx.moveTo(x, 0);
          targetCtx.lineTo(x, height);
          targetCtx.stroke();
        }
        for (let y = 0; y < height; y += 52) {
          targetCtx.beginPath();
          targetCtx.moveTo(0, y);
          targetCtx.lineTo(width, y);
          targetCtx.stroke();
        }
      }
      targetCtx.restore();
    }
    if (paintMode === 'living-canvas') {
      // Subtle woven linen canvas tooth glaze over 3D brushed sprites
      targetCtx.save();
      targetCtx.globalAlpha = 0.05 + impasto * 0.06;
      targetCtx.fillStyle = '#fff8ea';
      for (let y = 0; y < height; y += 4) {
        targetCtx.fillRect(0, y, width, 1);
      }
      targetCtx.fillStyle = '#1b1712';
      for (let x = 0; x < width; x += 5) {
        targetCtx.fillRect(x, 0, 1, height);
      }
      targetCtx.restore();
    }
    return;
  }

  if (settings.style === 'oil') {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const dabPx = Math.max(6, Math.round((16 - settings.density * 9) * dpr));
    const cols = Math.max(16, Math.floor(width / dabPx));
    const rows = Math.max(12, Math.floor(height / dabPx));

    if (!sampleCanvas2D) sampleCanvas2D = document.createElement('canvas');
    if (sampleCanvas2D.width !== cols || sampleCanvas2D.height !== rows) {
      sampleCanvas2D.width = cols;
      sampleCanvas2D.height = rows;
    }
    const sCtx = sampleCanvas2D.getContext('2d', { willReadFrequently: true })!;
    sCtx.imageSmoothingEnabled = true;
    sCtx.drawImage(source, 0, 0, cols, rows);
    const pixels = sCtx.getImageData(0, 0, cols, rows).data;

    targetCtx.imageSmoothingEnabled = true;
    targetCtx.drawImage(source, 0, 0, width, height);

    const cw = width / cols;
    const ch = height / rows;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = (row * cols + col) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const [gr, gg, gb] = gradeColor2D(r, g, b, lum, settings.colorTint);
        const seed = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
        const frac = seed - Math.floor(seed);
        const angle = (frac - 0.5) * 1.1 + lum * 0.45;
        const cx = (col + 0.5) * cw;
        const cy = (row + 0.5) * ch;
        targetCtx.save();
        targetCtx.translate(cx, cy);
        targetCtx.rotate(angle);
        targetCtx.fillStyle = `rgba(${gr},${gg},${gb},0.78)`;
        targetCtx.beginPath();
        targetCtx.ellipse(0, 0, cw * 0.78, ch * 0.48, 0, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.restore();
      }
    }
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // Map density 0..1 -> screen cell size (18px coarse down to 6px fine)
  const cellPx = Math.max(5, Math.round((18 - settings.density * 12) * dpr));
  const cols = Math.max(12, Math.floor(width / cellPx));
  const rows = Math.max(8, Math.floor(height / cellPx));

  if (!sampleCanvas2D) sampleCanvas2D = document.createElement('canvas');
  if (sampleCanvas2D.width !== cols || sampleCanvas2D.height !== rows) {
    sampleCanvas2D.width = cols;
    sampleCanvas2D.height = rows;
  }
  const sCtx = sampleCanvas2D.getContext('2d', { willReadFrequently: true })!;
  sCtx.imageSmoothingEnabled = true;
  sCtx.drawImage(source, 0, 0, cols, rows);
  const pixels = sCtx.getImageData(0, 0, cols, rows).data;

  // Deep ink background (matches Glyph Light canvas presentation)
  targetCtx.fillStyle = '#07080a';
  targetCtx.fillRect(0, 0, width, height);

  // Subtle source image bed for readability
  const underAlpha = Math.max(0, Math.min(0.6, settings.underImage ?? 0.16));
  if (underAlpha > 0.005) {
    targetCtx.save();
    targetCtx.globalAlpha = underAlpha;
    targetCtx.imageSmoothingEnabled = false;
    targetCtx.drawImage(source, 0, 0, width, height);
    targetCtx.restore();
  }

  const cw = width / cols;
  const ch = height / rows;
  const trimmedCustom = (settings.customGlyphs ?? '').trim();
  const glyphChars =
    trimmedCustom.length >= 2 ? ` ${trimmedCustom}` : getAsciiGlyphSet(settings.glyphSet).chars;
  const glyphs = settings.style === 'ascii' ? getSortedGlyphs(glyphChars) : [];
  const motionActive = !reducedMotion && settings.motion !== 'none';
  const shimmerSeed =
    (settings.shimmer || settings.motion === 'shimmer') && !reducedMotion
      ? Math.floor(elapsedTime * 12)
      : 0;
  const revealEv = motionActive && settings.motion === 'reveal' ? Math.sin(elapsedTime * 1.15) * 0.65 : 0;
  const evMul = Math.pow(2, (settings.exposure ?? 0) + revealEv);
  const contrastMul = settings.contrast ?? 1.0;
  const invGamma = 1.0 / Math.max(0.25, settings.gamma ?? 1.0);
  const invertFlag = Boolean(settings.invert);

  if (settings.style === 'ascii') {
    targetCtx.font = `600 ${Math.max(6, Math.round(ch * 0.94))}px "IBM Plex Mono", ui-monospace, monospace`;
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = (row * cols + col) * 4;
      let rN = Math.max(0, Math.min(1, ((pixels[idx] / 255) * evMul - 0.5) * contrastMul + 0.5));
      let gN = Math.max(0, Math.min(1, ((pixels[idx + 1] / 255) * evMul - 0.5) * contrastMul + 0.5));
      let bN = Math.max(0, Math.min(1, ((pixels[idx + 2] / 255) * evMul - 0.5) * contrastMul + 0.5));
      rN = Math.pow(rN, invGamma);
      gN = Math.pow(gN, invGamma);
      bN = Math.pow(bN, invGamma);
      if (invertFlag) {
        rN = 1 - rN;
        gN = 1 - gN;
        bN = 1 - bN;
      }
      const r = Math.round(rN * 255);
      const g = Math.round(gN * 255);
      const b = Math.round(bN * 255);
      const lum = Math.max(0, Math.min(1, 0.299 * rN + 0.587 * gN + 0.114 * bN));

      const [gr, gg, gb] = gradeColor2D(r, g, b, lum, settings.colorTint);
      const x = col * cw;
      const y = row * ch;

      if (settings.style === 'ascii') {
        const gIdx = Math.min(
          glyphs.length - 1,
          Math.max(0, Math.floor(lum * (glyphs.length - 1) + 0.5)),
        );
        const char = glyphs[gIdx];
        if (char !== ' ') {
          targetCtx.fillStyle = `rgb(${gr},${gg},${gb})`;
          targetCtx.fillText(char, x + cw * 0.5, y + ch * 0.54);
        }
      } else if (settings.style === 'dots') {
        const threshold = BAYER_4X4[row & 3][col & 3];
        const lit = lum > threshold;
        const size = Math.min(cw, ch) * (lit ? 0.76 : 0.42);
        const boost = lit ? 1.16 : 0.2;
        targetCtx.fillStyle = `rgb(${Math.min(255, Math.round(gr * boost))},${Math.min(255, Math.round(gg * boost))},${Math.min(255, Math.round(gb * boost))})`;
        targetCtx.fillRect(
          x + (cw - size) * 0.5,
          y + (ch - size) * 0.5,
          size,
          size,
        );
      } else if (settings.style === 'grain') {
        const h =
          Math.sin(col * 127.1 + row * 311.7 + shimmerSeed * 19.3) * 43758.5453;
        const rnd = h - Math.floor(h);
        if (lum > rnd * 0.92) {
          const speck = Math.max(1.5, Math.min(cw, ch) * 0.68);
          targetCtx.fillStyle = `rgb(${gr},${gg},${gb})`;
          targetCtx.fillRect(
            x + (cw - speck) * 0.5,
            y + (ch - speck) * 0.5,
            speck,
            speck,
          );
        }
      } else if (settings.style === 'scan') {
        const barH = Math.max(1, ch * (0.14 + lum * 0.66));
        targetCtx.fillStyle = `rgb(${gr},${gg},${gb})`;
        targetCtx.fillRect(x, y + (ch - barH) * 0.5, Math.max(1, cw - 0.5), barH);
      }
    }
  }

  // Bloom glow overlay (screen-blended blurred highlight pass)
  if (settings.glow > 0.02) {
    if (!glowCanvas2D) glowCanvas2D = document.createElement('canvas');
    const gw = Math.max(64, Math.round(width * 0.25));
    const gh = Math.max(48, Math.round(height * 0.25));
    if (glowCanvas2D.width !== gw || glowCanvas2D.height !== gh) {
      glowCanvas2D.width = gw;
      glowCanvas2D.height = gh;
    }
    const gCtx = glowCanvas2D.getContext('2d')!;
    gCtx.clearRect(0, 0, gw, gh);
    gCtx.filter = `blur(${Math.round(3 + settings.glow * 6)}px) brightness(${1.05 + settings.glow * 0.3})`;
    gCtx.drawImage(targetCtx.canvas, 0, 0, gw, gh);
    gCtx.filter = 'none';

    const pulse =
      motionActive && settings.motion === 'pulse'
        ? 0.65 + 0.4 * (0.5 + 0.5 * Math.sin(elapsedTime * 2.6))
        : settings.shimmer && !reducedMotion
          ? 0.9 + 0.1 * Math.sin(elapsedTime * 2.2)
          : 1.0;

    targetCtx.save();
    targetCtx.globalCompositeOperation = 'screen';
    targetCtx.globalAlpha = Math.min(1, settings.glow * 0.72 * pulse);
    targetCtx.imageSmoothingEnabled = true;
    targetCtx.drawImage(glowCanvas2D, 0, 0, width, height);
    targetCtx.restore();
  }
}
