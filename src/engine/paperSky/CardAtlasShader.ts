// CardAtlasShader: Crisp Pixel-Art 54-Card Web Emote Deck Atlas (XD, XP, :P, >:(, o_O, T_T...)
// + Sprite-Stacking GLSL ES 3.00 Shaders matching Virginia Sylva's crisp pixel & Bayer-dither aesthetic!

import { PhysicsProfileId } from './physicsProfiles';

export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 7;
export const CARD_TILE_W = 128;
export const CARD_TILE_H = 176;
export const CARD_BACK_INDEX = 52;
export const CARD_SUMMIT_INDEX = 53;

export type PaperSkyVisualStyle =
  | 'pixel'
  | 'halftone'
  | 'ink'
  | 'oil'
  | 'blueprint'
  | 'mondrian'
  | 'gameboy'
  | 'mac1bit'
  | 'crt16'
  | 'pico8'
  | 'risograph'
  | 'ukiyoe'
  | 'thermal';

export type VisualStyleFamily = 'material' | 'lattice' | 'display';

export interface VisualStyleFamilyMeta {
  id: VisualStyleFamily;
  label: string;
  subtitle: string;
}

export const VISUAL_STYLE_FAMILIES: VisualStyleFamilyMeta[] = [
  {
    id: 'material',
    label: 'World Material',
    subtitle: 'Surface geometry, paint & mineral pigment',
  },
  {
    id: 'lattice',
    label: 'Spatial Lattice',
    subtitle: 'Print screens, rectilinear grids & drafting plates',
  },
  {
    id: 'display',
    label: 'Display Hardware',
    subtitle: 'LCD matrices, 1-bit dither, CRT & color RAM',
  },
];

export const PAPER_SKY_STYLE_INDEX: Record<PaperSkyVisualStyle, number> = {
  pixel: 0,
  halftone: 1,
  ink: 2,
  oil: 3,
  blueprint: 4,
  mondrian: 5,
  gameboy: 6,
  mac1bit: 7,
  crt16: 8,
  pico8: 9,
  risograph: 10,
  ukiyoe: 11,
  thermal: 12,
};

export interface PaperSkyStyleMeta {
  id: PaperSkyVisualStyle;
  code: string;
  label: string;
  shortLabel: string;
  family: VisualStyleFamily;
  swatch: string;
  ink: string;
  darkSky: boolean;
  pixelScale: number;
  fogColor: [number, number, number];
  mechanismNote: string;
  recommendedPhysics: PhysicsProfileId;
}

export const PAPER_SKY_STYLES: PaperSkyStyleMeta[] = [
  {
    id: 'pixel',
    code: '01',
    label: 'Pixel Stack',
    shortLabel: 'PIXEL',
    family: 'material',
    swatch: '#7bb5dd',
    ink: '#122030',
    darkSky: false,
    pixelScale: 0.5,
    fogColor: [0.89, 0.92, 0.94],
    mechanismNote: 'Sprite-stack slices + 4×4 Bayer dither',
    recommendedPhysics: 'glide',
  },
  {
    id: 'halftone',
    code: '02',
    label: 'Halftone No.03',
    shortLabel: 'HALFTONE',
    family: 'lattice',
    swatch: '#f26a56',
    ink: '#181414',
    darkSky: false,
    pixelScale: 0.85,
    fogColor: [0.95, 0.89, 0.85],
    mechanismNote: '30° halftone dot screen + coral sun print',
    recommendedPhysics: 'glide',
  },
  {
    id: 'ink',
    code: '03',
    label: 'Ink Vellum',
    shortLabel: 'VELLUM',
    family: 'material',
    swatch: '#eae6dc',
    ink: '#18191b',
    darkSky: false,
    pixelScale: 0.88,
    fogColor: [0.93, 0.92, 0.89],
    mechanismNote: 'Archival graphite hatch + crimson stamp',
    recommendedPhysics: 'moon',
  },
  {
    id: 'oil',
    code: '04',
    label: '3D Oil',
    shortLabel: '3D OIL',
    family: 'material',
    swatch: '#e8a848',
    ink: '#1e160d',
    darkSky: false,
    pixelScale: 0.88,
    fogColor: [0.92, 0.91, 0.86],
    mechanismNote: 'Warm gilded impasto brushwork',
    recommendedPhysics: 'moon',
  },
  {
    id: 'blueprint',
    code: '05',
    label: 'Blueprint',
    shortLabel: 'BLUEPRINT',
    family: 'lattice',
    swatch: '#1c4da1',
    ink: '#f2f7ff',
    darkSky: true,
    pixelScale: 0.88,
    fogColor: [0.08, 0.22, 0.48],
    mechanismNote: 'Prussian cyanotype + drafting grid',
    recommendedPhysics: 'arcade',
  },
  {
    id: 'mondrian',
    code: '06',
    label: 'Mondrian De Stijl',
    shortLabel: 'MONDRIAN',
    family: 'lattice',
    swatch: '#d62828',
    ink: '#f6f3eb',
    darkSky: false,
    pixelScale: 0.9,
    fogColor: [0.95, 0.94, 0.9],
    mechanismNote: 'Halftone-evolved grid + 5 primary blocks',
    recommendedPhysics: 'skate',
  },
  {
    id: 'gameboy',
    code: '07',
    label: 'Game Boy DMG',
    shortLabel: 'DMG-01',
    family: 'display',
    swatch: '#8bac0f',
    ink: '#0f380f',
    darkSky: false,
    pixelScale: 0.4,
    fogColor: [0.61, 0.74, 0.06],
    mechanismNote: '4-tone olive LCD matrix + Bayer dither',
    recommendedPhysics: 'arcade',
  },
  {
    id: 'mac1bit',
    code: '08',
    label: '1-Bit Mac Dither',
    shortLabel: '1-BIT',
    family: 'display',
    swatch: '#f4f1e6',
    ink: '#141517',
    darkSky: false,
    pixelScale: 0.54,
    fogColor: [0.95, 0.94, 0.9],
    mechanismNote: 'Pure 2-value Bayer + crisp ink edges',
    recommendedPhysics: 'arcade',
  },
  {
    id: 'crt16',
    code: '09',
    label: 'CRT 16-Bit',
    shortLabel: 'CRT-16',
    family: 'display',
    swatch: '#3a86ff',
    ink: '#edf4ff',
    darkSky: true,
    pixelScale: 0.62,
    fogColor: [0.22, 0.29, 0.44],
    mechanismNote: 'RGB aperture grille + phosphor scanlines',
    recommendedPhysics: 'skate',
  },
  {
    id: 'pico8',
    code: '10',
    label: 'PICO-8 Fantasy',
    shortLabel: 'PICO-8',
    family: 'display',
    swatch: '#ff77a8',
    ink: '#1d2b53',
    darkSky: true,
    pixelScale: 0.38,
    fogColor: [0.16, 0.68, 1.0],
    mechanismNote: 'Strict 16-color palette + chunky pixels',
    recommendedPhysics: 'arcade',
  },
  {
    id: 'risograph',
    code: '11',
    label: 'Risograph Two-Tone',
    shortLabel: 'RISO 2T',
    family: 'lattice',
    swatch: '#ff5a5f',
    ink: '#0f2d30',
    darkSky: false,
    pixelScale: 0.78,
    fogColor: [0.96, 0.93, 0.88],
    mechanismNote: 'Fluorescent coral & deep teal overprint',
    recommendedPhysics: 'glide',
  },
  {
    id: 'ukiyoe',
    code: '12',
    label: 'Ukiyo-e Woodblock',
    shortLabel: 'UKIYO-E',
    family: 'material',
    swatch: '#2b4f78',
    ink: '#efe5cc',
    darkSky: false,
    pixelScale: 0.85,
    fogColor: [0.92, 0.88, 0.78],
    mechanismNote: 'Mineral pigment flats + sumi ink + grain',
    recommendedPhysics: 'moon',
  },
  {
    id: 'thermal',
    code: '13',
    label: 'Thermal Spectrum',
    shortLabel: 'THERMAL',
    family: 'display',
    swatch: '#ff6b2b',
    ink: '#0a0c2e',
    darkSky: true,
    pixelScale: 0.78,
    fogColor: [0.12, 0.08, 0.32],
    mechanismNote: '5-stop scientific infrared luminance map',
    recommendedPhysics: 'skate',
  },
];

export function getPaperSkyStyleMeta(id: PaperSkyVisualStyle): PaperSkyStyleMeta {
  return PAPER_SKY_STYLES.find((s) => s.id === id) ?? PAPER_SKY_STYLES[0];
}

// Single Shared Phenomenological GLSL Style Library (modes 5..12)
// Reused across Paper Sky (Sky Dome, Cards, Paper Girl) and Virginia Sylva (WebGLTreeEngine BLIT_FS).
export const SHARED_VISUAL_STYLE_GLSL = `
vec3 snapPico8(vec3 c) {
  const vec3 PAL[16] = vec3[16](
    vec3(0.000, 0.000, 0.000),
    vec3(0.114, 0.169, 0.325),
    vec3(0.494, 0.145, 0.325),
    vec3(0.000, 0.529, 0.318),
    vec3(0.671, 0.322, 0.212),
    vec3(0.373, 0.341, 0.310),
    vec3(0.761, 0.765, 0.780),
    vec3(1.000, 0.945, 0.910),
    vec3(1.000, 0.000, 0.302),
    vec3(1.000, 0.639, 0.000),
    vec3(1.000, 0.925, 0.153),
    vec3(0.000, 0.894, 0.212),
    vec3(0.161, 0.678, 1.000),
    vec3(0.514, 0.463, 0.612),
    vec3(1.000, 0.467, 0.659),
    vec3(1.000, 0.800, 0.667)
  );
  float bestD = 1e9;
  vec3 bestC = PAL[7];
  for (int i = 0; i < 16; i++) {
    vec3 diff = c - PAL[i];
    float d = dot(diff, diff * vec3(1.15, 1.35, 0.95));
    if (d < bestD) {
      bestD = d;
      bestC = PAL[i];
    }
  }
  return bestC;
}

vec3 evalThermalRamp(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.04, 0.05, 0.18);
  vec3 c1 = vec3(0.36, 0.10, 0.54);
  vec3 c2 = vec3(0.85, 0.14, 0.22);
  vec3 c3 = vec3(1.00, 0.61, 0.10);
  vec3 c4 = vec3(1.00, 0.97, 0.84);
  if (t < 0.25) return mix(c0, c1, t / 0.25);
  if (t < 0.52) return mix(c1, c2, (t - 0.25) / 0.27);
  if (t < 0.78) return mix(c2, c3, (t - 0.52) / 0.26);
  return mix(c3, c4, (t - 0.78) / 0.22);
}

vec3 snapMondrianColor(vec3 col, vec2 cellId) {
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  float maxC = max(col.r, max(col.g, col.b));
  float minC = min(col.r, min(col.g, col.b));
  float sat = maxC - minC;

  vec3 mWhite = vec3(0.955, 0.945, 0.910);
  vec3 mCream = vec3(0.875, 0.865, 0.825);
  vec3 mBlack = vec3(0.085, 0.095, 0.115);
  vec3 mRed   = vec3(0.840, 0.155, 0.155);
  vec3 mBlue  = vec3(0.105, 0.285, 0.665);
  vec3 mYel   = vec3(0.950, 0.760, 0.105);

  if (l < 0.17) return mBlack;
  // Strong chroma picks its closest De Stijl primary
  float cellBias = fract(sin(dot(cellId, vec2(127.1, 311.7))) * 43758.5453);
  if (sat > 0.14) {
    if (col.r > col.b + 0.10 && col.r > col.g + 0.08) return mRed;
    if (col.b > col.r + 0.08 && col.b >= col.g - 0.02) return mBlue;
    if (col.r > 0.52 && col.g > 0.48 && col.b < 0.48) return mYel;
    // Green / foliage maps cleanly onto either yellow-sunlit or ultramarine-shade panes!
    if (col.g > col.r && col.g > col.b) {
      return (l > 0.52 || cellBias > 0.58) ? mYel : mBlue;
    }
  }
  if (l > 0.80) return mWhite;
  if (l > 0.56) return cellBias > 0.72 ? mWhite : mCream;
  return cellBias > 0.5 ? mBlue : mCream;
}

vec3 applyExtendedVisualStyle(
  vec3 col,
  vec2 fragPx,
  float dither,
  float edgeHint,
  float isSky,
  int style
) {
  float l = dot(col, vec3(0.299, 0.587, 0.114));

  if (style == 5) {
    // 06: Mondrian De Stijl (asymmetric rectilinear Neo-Plastic grid + black mullions + 5 primaries)
    float scale = isSky > 0.5 ? 52.0 : 28.0;
    vec2 warped = vec2(
      fragPx.x + sin(floor(fragPx.y / (scale * 1.4)) * 2.1) * (scale * 0.32),
      fragPx.y + cos(floor(fragPx.x / (scale * 1.6)) * 1.7) * (scale * 0.28)
    );
    vec2 gridUv = warped / vec2(scale * 1.18, scale * 0.92);
    vec2 cellId = floor(gridUv);
    vec2 f = fract(gridUv);
    float thickX = isSky > 0.5 ? 0.045 : 0.068;
    float thickY = isSky > 0.5 ? 0.055 : 0.080;
    float mullion = max(
      step(f.x, thickX) + step(1.0 - thickX, f.x),
      step(f.y, thickY) + step(1.0 - thickY, f.y)
    );
    vec3 blockCol = snapMondrianColor(col, cellId);
    // Keep crisp black silhouette contour on 3D foreground forms so gameplay stays razor-legible
    float outline = clamp(mullion + step(0.42, edgeHint), 0.0, 1.0);
    return mix(blockCol, vec3(0.06, 0.07, 0.09), outline * 0.94);
  }

  if (style == 6) {
    // 07: Game Boy DMG (4-shade olive LCD matrix + ordered Bayer dither)
    float q = clamp(l + dither * 0.24 - edgeHint * 0.25, 0.0, 1.0);
    int level = int(clamp(floor(q * 4.0), 0.0, 3.0));
    vec3 gb0 = vec3(0.059, 0.220, 0.059);
    vec3 gb1 = vec3(0.188, 0.384, 0.188);
    vec3 gb2 = vec3(0.545, 0.675, 0.059);
    vec3 gb3 = vec3(0.608, 0.737, 0.059);
    vec3 res = level == 0 ? gb0 : (level == 1 ? gb1 : (level == 2 ? gb2 : gb3));
    // Subtle LCD sub-pixel grid lines
    vec2 lcd = fract(fragPx * 0.5);
    float gap = step(0.86, lcd.x) + step(0.86, lcd.y);
    return res * (1.0 - clamp(gap, 0.0, 1.0) * 0.09);
  }

  if (style == 7) {
    // 08: 1-Bit Mac Dither (pure 2-tone ink & warm parchment + crisp contour lines)
    float thresh = (dither + 0.5);
    float val = step(thresh, clamp((l - 0.5) * 1.18 + 0.52 - edgeHint * 0.42, 0.0, 1.0));
    return mix(vec3(0.078, 0.082, 0.090), vec3(0.957, 0.945, 0.902), val);
  }

  if (style == 8) {
    // 09: CRT 16-Bit (RGB aperture grille triads + horizontal scanline + phosphor glow)
    vec3 sat = mix(vec3(l), col, 1.24);
    sat = pow(clamp(sat * 1.04, 0.0, 1.0), vec3(0.95));
    int triad = int(mod(floor(fragPx.x), 3.0));
    vec3 mask = triad == 0
      ? vec3(1.12, 0.86, 0.86)
      : (triad == 1 ? vec3(0.86, 1.12, 0.86) : vec3(0.86, 0.86, 1.14));
    float scan = 0.84 + 0.16 * sin(fragPx.y * 3.14159265);
    vec3 crt = sat * mask * scan;
    // Gentle phosphor bloom on bright highlights
    crt += max(vec3(0.0), sat - 0.62) * 0.28;
    return clamp(crt, 0.0, 1.0);
  }

  if (style == 9) {
    // 10: PICO-8 Fantasy (strict 16-color palette snap + Bayer dither pre-offset)
    vec3 dithered = clamp(col + vec3(dither * 0.12), 0.0, 1.0);
    vec3 p8 = snapPico8(dithered);
    return mix(p8, vec3(0.114, 0.169, 0.325), step(0.62, edgeHint) * 0.65);
  }

  if (style == 10) {
    // 11: Risograph Two-Tone (Fluorescent Coral + Deep Teal dual-drum soy ink overprint)
    vec3 paper = vec3(0.965, 0.941, 0.882);
    vec3 coral = vec3(1.000, 0.353, 0.373);
    vec3 teal  = vec3(0.059, 0.420, 0.451);
    float warmth = clamp((col.r - col.b) * 1.35 + 0.46, 0.0, 1.0);
    float density = clamp(1.0 - l * 0.92, 0.0, 1.0);
    // Rotated soy-ink halftone dot grain
    vec2 rotA = mat2(0.866, -0.5, 0.5, 0.866) * (fragPx * 0.34);
    vec2 rotB = mat2(0.5, 0.866, -0.866, 0.5) * ((fragPx + vec2(2.0, -1.5)) * 0.34);
    float grainA = length(fract(rotA) - 0.5);
    float grainB = length(fract(rotB) - 0.5);
    float coralInk = clamp(density * (0.35 + warmth * 0.85) + (0.34 - grainA) * 0.32, 0.0, 1.0);
    float tealInk  = clamp(density * (1.05 - warmth * 0.72) + (0.34 - grainB) * 0.32 + edgeHint * 0.45, 0.0, 1.0);
    // Subtractive soy-ink multiply over warm stock
    vec3 printCol = paper * mix(vec3(1.0), coral, coralInk * 0.88) * mix(vec3(1.0), teal, tealInk * 0.90);
    return clamp(printCol, 0.0, 1.0);
  }

  if (style == 11) {
    // 12: Ukiyo-e Woodblock (mineral pigment flats + sumi ink contours + cedar woodgrain)
    vec3 washi = vec3(0.937, 0.898, 0.800);
    vec3 indigo = vec3(0.157, 0.298, 0.463);
    vec3 vermilion = vec3(0.812, 0.259, 0.169);
    vec3 ochre = vec3(0.847, 0.635, 0.290);
    vec3 pine = vec3(0.227, 0.388, 0.286);
    float qL = floor(l * 5.0 + dither * 0.35) / 5.0;
    vec3 pigment;
    if (col.r > col.g + 0.12 && col.r > col.b + 0.10) {
      pigment = mix(vermilion, washi, clamp(qL * 0.42, 0.0, 0.5));
    } else if (col.g > col.r + 0.03 && col.g > col.b) {
      pigment = mix(pine, ochre, clamp(qL * 0.65, 0.0, 0.75));
    } else if (col.b > col.r + 0.04) {
      pigment = mix(indigo, washi, clamp(qL * 0.88, 0.0, 0.92));
    } else {
      pigment = mix(ochre * 0.65, washi, clamp(qL * 0.95, 0.0, 1.0));
    }
    float grain = sin(fragPx.y * 0.55 + sin(fragPx.x * 0.04) * 3.0) * 0.025;
    pigment = clamp(pigment + grain, 0.0, 1.0);
    float sumi = smoothstep(0.32, 0.65, edgeHint);
    return mix(pigment, vec3(0.09, 0.095, 0.11), sumi * 0.92);
  }

  if (style == 12) {
    // 13: Thermal Spectrum (5-stop scientific infrared luminance map + isotherm contours)
    float heat = clamp(l * 0.94 + (col.r - col.b) * 0.16 + dither * 0.04, 0.0, 1.0);
    vec3 therm = evalThermalRamp(heat);
    // Crisp isotherm contour bands
    float iso = smoothstep(0.04, 0.0, abs(fract(heat * 6.0) - 0.5));
    therm = mix(therm, vec3(1.0, 0.98, 0.9), iso * 0.16 + edgeHint * 0.22);
    return clamp(therm, 0.0, 1.0);
  }

  return col;
}
`;

export interface EmoteCardSpec {
  corner: string;
  center: string;
  mood: 'crimson' | 'cobalt' | 'ink' | 'violet';
  royal?: boolean;
  pipCount: number;
}

// 52 Iconic Web Emoticon & Kaomoji Cards replacing standard playing cards!
export const EMOTE_DECK: EmoteCardSpec[] = [
  // Suit 0 (0..12): Crimson Chaos & Hype
  { corner: 'XD', center: 'XD', mood: 'crimson', pipCount: 1 },
  { corner: ':P', center: ':P', mood: 'crimson', pipCount: 2 },
  { corner: 'XP', center: 'XP', mood: 'crimson', pipCount: 3 },
  { corner: '>:(', center: '>:(', mood: 'crimson', pipCount: 4 },
  { corner: '<3', center: '<3', mood: 'crimson', pipCount: 5 },
  { corner: ':D', center: ':D', mood: 'crimson', pipCount: 6 },
  { corner: '>:D', center: '>:D', mood: 'crimson', pipCount: 4 },
  { corner: 'xD', center: 'xD', mood: 'crimson', pipCount: 5 },
  { corner: ';P', center: ';P', mood: 'crimson', pipCount: 3 },
  { corner: ':@', center: ':@', mood: 'crimson', pipCount: 4 },
  { corner: 'XD', center: '(>w<)', mood: 'crimson', royal: true, pipCount: 1 },
  { corner: '<3', center: '(づ｡◕‿◕｡)づ', mood: 'crimson', royal: true, pipCount: 1 },
  { corner: '>:(', center: '(╯°□°)╯', mood: 'crimson', royal: true, pipCount: 1 },

  // Suit 1 (13..25): Cobalt / Sky Daydream & Whimsy
  { corner: 'XP', center: 'XP', mood: 'cobalt', pipCount: 1 },
  { corner: 'o_O', center: 'o_O', mood: 'cobalt', pipCount: 2 },
  { corner: 'T_T', center: 'T_T', mood: 'cobalt', pipCount: 3 },
  { corner: '^.^', center: '^.^', mood: 'cobalt', pipCount: 4 },
  { corner: ':O', center: ':O', mood: 'cobalt', pipCount: 5 },
  { corner: 'D:', center: 'D:', mood: 'cobalt', pipCount: 4 },
  { corner: ';_;', center: ';_;', mood: 'cobalt', pipCount: 3 },
  { corner: 'O_o', center: 'O_o', mood: 'cobalt', pipCount: 4 },
  { corner: 'B)', center: 'B)', mood: 'cobalt', pipCount: 2 },
  { corner: '°_°', center: '°_°', mood: 'cobalt', pipCount: 5 },
  { corner: 'T_T', center: '(;´Д`)', mood: 'cobalt', royal: true, pipCount: 1 },
  { corner: '^.^', center: '(*^▽^*)', mood: 'cobalt', royal: true, pipCount: 1 },
  { corner: 'o_O', center: '¯\\_(ツ)_/¯', mood: 'cobalt', royal: true, pipCount: 1 },

  // Suit 2 (26..38): Deep Ink Classic Retro Web
  { corner: ':P', center: ':P', mood: 'ink', pipCount: 1 },
  { corner: '>:(', center: '>:(', mood: 'ink', pipCount: 2 },
  { corner: '-_-', center: '-_-', mood: 'ink', pipCount: 3 },
  { corner: '>_<', center: '>_<', mood: 'ink', pipCount: 4 },
  { corner: 'x_x', center: 'x_x', mood: 'ink', pipCount: 5 },
  { corner: ':/', center: ':/', mood: 'ink', pipCount: 4 },
  { corner: ':3', center: ':3', mood: 'ink', pipCount: 3 },
  { corner: '._.', center: '._.', mood: 'ink', pipCount: 5 },
  { corner: 'zzZ', center: 'zzZ', mood: 'ink', pipCount: 2 },
  { corner: '?!', center: '?!', mood: 'ink', pipCount: 4 },
  { corner: ':3', center: '(=^･ω･^=)', mood: 'ink', royal: true, pipCount: 1 },
  { corner: '-_-', center: '(¬_¬)', mood: 'ink', royal: true, pipCount: 1 },
  { corner: 'x_x', center: 'ʕ•ᴥ•ʔ', mood: 'ink', royal: true, pipCount: 1 },

  // Suit 3 (39..51): Violet / Sparkle Kaomoji Magic
  { corner: 'UwU', center: 'UwU', mood: 'violet', pipCount: 1 },
  { corner: '=D', center: '=D', mood: 'violet', pipCount: 2 },
  { corner: '^_^', center: '^_^', mood: 'violet', pipCount: 3 },
  { corner: 'OwO', center: 'OwO', mood: 'violet', pipCount: 4 },
  { corner: '=P', center: '=P', mood: 'violet', pipCount: 5 },
  { corner: '*-*', center: '*-*', mood: 'violet', pipCount: 3 },
  { corner: ';)', center: ';)', mood: 'violet', pipCount: 4 },
  { corner: '^_~', center: '^_~', mood: 'violet', pipCount: 2 },
  { corner: 'Q_Q', center: 'Q_Q', mood: 'violet', pipCount: 5 },
  { corner: ':V', center: ':V', mood: 'violet', pipCount: 4 },
  { corner: 'UwU', center: '(◕‿◕✿)', mood: 'violet', royal: true, pipCount: 1 },
  { corner: 'OwO', center: 'ヽ(>∀<☆)ノ', mood: 'violet', royal: true, pipCount: 1 },
  { corner: '*-*', center: '(•̀ᴗ•́)و', mood: 'violet', royal: true, pipCount: 1 },
];

const MOOD_COLORS: Record<EmoteCardSpec['mood'], { ink: string; tint: string; accent: string }> = {
  crimson: { ink: '#c91c28', tint: '#fae4e2', accent: '#f05a4f' },
  cobalt: { ink: '#1d4eb8', tint: '#e4eefb', accent: '#4da3e8' },
  ink: { ink: '#161a22', tint: '#eceae2', accent: '#485566' },
  violet: { ink: '#6b29b8', tint: '#efe6fb', accent: '#a86df2' },
};

// Crisp pixel-art mini emblems (drawn on an integer pixel grid!)
function drawPixelGlyph(
  ctx: CanvasRenderingContext2D,
  mood: EmoteCardSpec['mood'],
  cx: number,
  cy: number,
  px: number,
) {
  const x0 = Math.round(cx - 3.5 * px);
  const y0 = Math.round(cy - 3.5 * px);
  let pattern: string[];
  if (mood === 'crimson') {
    // Pixel heart <3
    pattern = [
      '.##.##.',
      '#######',
      '#######',
      '.#####.',
      '..###..',
      '...#...',
    ];
  } else if (mood === 'cobalt') {
    // Pixel 4-point star
    pattern = [
      '...#...',
      '...#...',
      '..###..',
      '#######',
      '..###..',
      '...#...',
      '...#...',
    ];
  } else if (mood === 'ink') {
    // Pixel cheeky cat / spark
    pattern = [
      '#.....#',
      '##...##',
      '#######',
      '#.#.#.#',
      '#######',
      '.#####.',
    ];
  } else {
    // Pixel diamond sparkle
    pattern = [
      '...#...',
      '..###..',
      '.##.##.',
      '##...##',
      '.##.##.',
      '..###..',
      '...#...',
    ];
  }

  for (let r = 0; r < pattern.length; r++) {
    const row = pattern[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '#') {
        ctx.fillRect(x0 + c * px, y0 + r * px, px, px);
      }
    }
  }
}

const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [0, -0.42],
    [0, 0.42],
  ],
  3: [
    [0, -0.46],
    [0, 0],
    [0, 0.46],
  ],
  4: [
    [-0.36, -0.42],
    [0.36, -0.42],
    [-0.36, 0.42],
    [0.36, 0.42],
  ],
  5: [
    [-0.38, -0.44],
    [0.38, -0.44],
    [0, 0],
    [-0.38, 0.44],
    [0.38, 0.44],
  ],
  6: [
    [-0.38, -0.46],
    [0.38, -0.46],
    [-0.38, 0],
    [0.38, 0],
    [-0.38, 0.46],
    [0.38, 0.46],
  ],
};

function drawEmoteCardTile(
  ctx: CanvasRenderingContext2D,
  cardIdx: number,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const spec = EMOTE_DECK[cardIdx % EMOTE_DECK.length];
  const pal = MOOD_COLORS[spec.mood];

  // Antique cotton pixel card stock
  ctx.fillStyle = '#f5efe0';
  ctx.fillRect(x, y, w, h);

  // Crisp 2px stepped pixel border + corner pixel notches
  ctx.fillStyle = '#d8cfb8';
  ctx.fillRect(x + 2, y + 2, w - 4, 2);
  ctx.fillRect(x + 2, y + h - 4, w - 4, 2);
  ctx.fillRect(x + 2, y + 2, 2, h - 4);
  ctx.fillRect(x + w - 4, y + 2, 2, h - 4);

  // Inner editorial pixel rule
  ctx.fillStyle = pal.ink;
  ctx.globalAlpha = 0.22;
  ctx.fillRect(x + 7, y + 7, w - 14, 2);
  ctx.fillRect(x + 7, y + h - 9, w - 14, 2);
  ctx.fillRect(x + 7, y + 7, 2, h - 14);
  ctx.fillRect(x + w - 9, y + 7, 2, h - 14);
  ctx.globalAlpha = 1.0;

  // Bold corner emote badges (top-left & rotated bottom-right!)
  ctx.fillStyle = pal.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '900 17px "Courier New", ui-monospace, monospace';
  ctx.fillText(spec.corner, x + 11, y + 11);
  drawPixelGlyph(ctx, spec.mood, x + 21, y + 36, 2);

  ctx.save();
  ctx.translate(x + w - 11, y + h - 11);
  ctx.rotate(Math.PI);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(spec.corner, 0, 0);
  ctx.restore();
  drawPixelGlyph(ctx, spec.mood, x + w - 21, y + h - 36, 2);

  const cx = x + Math.floor(w * 0.5);
  const cy = y + Math.floor(h * 0.5);

  if (spec.royal) {
    // Royal pixel-art kaomoji portrait medallion
    ctx.fillStyle = pal.tint;
    ctx.fillRect(x + 18, y + 38, w - 36, h - 76);
    ctx.fillStyle = pal.ink;
    ctx.fillRect(x + 18, y + 38, w - 36, 2);
    ctx.fillRect(x + 18, y + h - 40, w - 36, 2);
    ctx.fillRect(x + 18, y + 38, 2, h - 76);
    ctx.fillRect(x + w - 20, y + 38, 2, h - 76);

    // Pixel gold crown strip top & bottom
    ctx.fillStyle = '#cf911c';
    ctx.fillRect(x + 24, y + 43, w - 48, 3);
    ctx.fillRect(x + 24, y + h - 46, w - 48, 3);

    // Huge readable pixel emote centerpiece
    ctx.fillStyle = pal.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontSize = spec.center.length > 7 ? 13 : spec.center.length > 5 ? 16 : 22;
    ctx.font = `900 ${fontSize}px "Courier New", ui-monospace, monospace`;
    ctx.fillText(spec.center, cx, cy - 1);

    // Accent corner pixel sparkles inside royal frame
    ctx.fillStyle = pal.accent;
    drawPixelGlyph(ctx, spec.mood, cx, y + 57, 2);
    drawPixelGlyph(ctx, spec.mood, cx, y + h - 57, 2);
  } else if (spec.pipCount === 1) {
    // Iconic Ace-style Giant Web Emote Card (HUGE XD / XP / :P / UwU!)
    ctx.fillStyle = pal.tint;
    ctx.fillRect(x + 20, y + 46, w - 40, h - 92);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(x + 20, y + 46, w - 40, 2);
    ctx.fillRect(x + 20, y + h - 48, w - 40, 2);

    ctx.fillStyle = pal.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 34px "Courier New", ui-monospace, monospace';
    ctx.fillText(spec.center, cx, cy);

    drawPixelGlyph(ctx, spec.mood, cx, cy - 34, 2);
    drawPixelGlyph(ctx, spec.mood, cx, cy + 34, 2);
  } else {
    // Playing-card pip layout made of repeating crisp Web Emotes!
    const layout = PIP_POSITIONS[spec.pipCount] ?? PIP_POSITIONS[3];
    const spanX = w * 0.34;
    const spanY = h * 0.32;
    ctx.fillStyle = pal.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontSz = spec.pipCount >= 5 ? 16 : spec.pipCount >= 4 ? 18 : 22;
    ctx.font = `900 ${fontSz}px "Courier New", ui-monospace, monospace`;

    for (let i = 0; i < layout.length; i++) {
      const [px, py] = layout[i];
      const ex = Math.round(cx + px * spanX);
      const ey = Math.round(cy + py * spanY);
      ctx.save();
      ctx.translate(ex, ey);
      if (py > 0.25) ctx.rotate(Math.PI);
      ctx.fillText(spec.center, 0, 0);
      ctx.restore();
    }
  }
}

// Ornate Pixel-Art Crimson <3 / XD Card Back (for unfolding crimson bridge & castle walls!)
function drawEmoteCardBackTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = '#f5efe0';
  ctx.fillRect(x, y, w, h);

  // Rich crimson pixel tapestry field
  ctx.fillStyle = '#9a242c';
  ctx.fillRect(x + 8, y + 8, w - 16, h - 16);

  // Crisp 2px pixel cream inner frame
  ctx.fillStyle = '#f5ead4';
  ctx.fillRect(x + 12, y + 12, w - 24, 2);
  ctx.fillRect(x + 12, y + h - 14, w - 24, 2);
  ctx.fillRect(x + 12, y + 12, 2, h - 24);
  ctx.fillRect(x + w - 14, y + 12, 2, h - 24);

  // Checkerboard pixel tapestry dots
  ctx.fillStyle = 'rgba(245, 234, 212, 0.22)';
  for (let py = y + 18; py < y + h - 18; py += 8) {
    for (let px = x + 18; px < x + w - 18; px += 8) {
      if (((px + py) >> 3) % 2 === 0) {
        ctx.fillRect(px, py, 3, 3);
      }
    }
  }

  // Center pixel crest with <3 & XD emblem
  const cx = x + Math.floor(w * 0.5);
  const cy = y + Math.floor(h * 0.5);
  ctx.fillStyle = '#751820';
  ctx.fillRect(cx - 28, cy - 30, 56, 60);
  ctx.fillStyle = '#f5ead4';
  ctx.fillRect(cx - 28, cy - 30, 56, 2);
  ctx.fillRect(cx - 28, cy + 28, 56, 2);
  ctx.fillRect(cx - 28, cy - 30, 2, 60);
  ctx.fillRect(cx + 26, cy - 30, 2, 60);

  drawPixelGlyph(ctx, 'crimson', cx, cy - 13, 3);
  ctx.fillStyle = '#f5ead4';
  ctx.font = '900 16px "Courier New", ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('<3', cx, cy + 14);
}

// Golden Pixel Summit Card (★ \o/ ★)
function drawSummitEmoteTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = '#fdf7e4';
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = '#d6971c';
  ctx.fillRect(x + 6, y + 6, w - 12, 4);
  ctx.fillRect(x + 6, y + h - 10, w - 12, 4);
  ctx.fillRect(x + 6, y + 6, 4, h - 12);
  ctx.fillRect(x + w - 10, y + 6, 4, h - 12);

  ctx.fillStyle = '#181c22';
  ctx.fillRect(x + 13, y + 13, w - 26, 2);
  ctx.fillRect(x + 13, y + h - 15, w - 26, 2);
  ctx.fillRect(x + 13, y + 13, 2, h - 26);
  ctx.fillRect(x + w - 15, y + 13, 2, h - 26);

  const cx = x + Math.floor(w * 0.5);
  const cy = y + Math.floor(h * 0.5);

  ctx.fillStyle = '#d6971c';
  ctx.font = '900 16px "Courier New", ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('★', x + 18, y + 18);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('★', x + w - 18, y + h - 18);

  ctx.fillStyle = '#c91c28';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 32px "Courier New", ui-monospace, monospace';
  ctx.fillText('\\o/', cx, cy - 8);
  ctx.fillStyle = '#d6971c';
  ctx.font = '900 18px "Courier New", ui-monospace, monospace';
  ctx.fillText('★ XD ★', cx, cy + 28);
}

export function createCardAtlasCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * CARD_TILE_W;
  canvas.height = ATLAS_ROWS * CARD_TILE_H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#f5efe0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let idx = 0; idx < 52; idx++) {
    const col = idx % ATLAS_COLS;
    const row = Math.floor(idx / ATLAS_COLS);
    drawEmoteCardTile(ctx, idx, col * CARD_TILE_W, row * CARD_TILE_H, CARD_TILE_W, CARD_TILE_H);
  }

  {
    const col = CARD_BACK_INDEX % ATLAS_COLS;
    const row = Math.floor(CARD_BACK_INDEX / ATLAS_COLS);
    drawEmoteCardBackTile(ctx, col * CARD_TILE_W, row * CARD_TILE_H, CARD_TILE_W, CARD_TILE_H);
  }

  {
    const col = CARD_SUMMIT_INDEX % ATLAS_COLS;
    const row = Math.floor(CARD_SUMMIT_INDEX / ATLAS_COLS);
    drawSummitEmoteTile(ctx, col * CARD_TILE_W, row * CARD_TILE_H, CARD_TILE_W, CARD_TILE_H);
  }

  return canvas;
}

export function createCardAtlasTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const canvas = createCardAtlasCanvas();
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  // Crisp nearest-neighbor sprite-stack pixel filtering (matches Virginia Sylva!)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);

  const aniso =
    gl.getExtension('EXT_texture_filter_anisotropic') ||
    gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  if (aniso) {
    const maxAniso = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 4;
    gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, maxAniso));
  }

  return tex;
}

// ─── SHADER 1: Sprite-Stacked Pixel Sky Dome & Bayer-Dithered Cloud Sea ──────
export const PAPER_SKY_DOME_VS = `#version 300 es
precision highp float;
precision highp int;
const vec2 POS[4] = vec2[4](
  vec2(-1.0, -1.0),
  vec2( 1.0, -1.0),
  vec2(-1.0,  1.0),
  vec2( 1.0,  1.0)
);
out vec2 vUv;
void main() {
  vec2 p = POS[gl_VertexID];
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.999, 1.0);
}`;

export const PAPER_SKY_DOME_FS = `#version 300 es
precision highp float;
precision highp int;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uRes;
uniform float uTime;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamForward;
uniform float uTanHalfFov;
uniform float uDescentReveal;
uniform float uDreamSight;
uniform int uAudioCount;
uniform vec4 uAudioPos[6];
uniform vec4 uAudioCol[6];
uniform vec3 uDropAccent;
uniform int uVisualStyle;
uniform sampler2D uCustomBackdrop;
uniform float uCustomActive;
uniform float uCustomUnfold;
uniform float uCustomStylize;
uniform float uCustomParallax;

float hash21(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.53);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.52;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = mat2(0.8, 0.6, -0.6, 0.8) * p * 2.02 + vec2(3.1, 1.7);
    a *= 0.5;
  }
  return v;
}

float bayer4(vec2 px) {
  ivec2 p = ivec2(mod(floor(px), 4.0));
  int idx = p.y * 4 + p.x;
  const float M[16] = float[16](
     0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
    12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
     3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
    15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
  );
  return M[idx];
}
${SHARED_VISUAL_STYLE_GLSL}

void main() {
  float aspect = uRes.x / max(1.0, uRes.y);
  vec2 ndc = (vUv - 0.5) * 2.0;
  vec3 ray = normalize(
    uCamForward +
    uCamRight * (ndc.x * aspect * uTanHalfFov) +
    uCamUp * (ndc.y * uTanHalfFov)
  );

  float dither = bayer4(gl_FragCoord.xy) - 0.5;

  // Blue Ridge / Virginia Sylva palette continuity: bright azure sky + sage garden valley mist below!
  vec3 zenithBlue = vec3(0.41, 0.69, 0.89);
  vec3 midSky = vec3(0.68, 0.85, 0.94);
  vec3 horizonCream = vec3(0.93, 0.95, 0.91);
  vec3 lowerSylvaSage = vec3(0.55, 0.69, 0.56);

  float h = clamp(ray.y, -1.0, 1.0);
  // Quantized pixel-art sky gradient with Bayer dither!
  float tMid = floor(clamp((h + 0.04) / 0.28, 0.0, 1.0) * 6.0 + dither * 0.85) / 6.0;
  float tZen = floor(clamp((h - 0.22) / 0.62, 0.0, 1.0) * 6.0 + dither * 0.85) / 6.0;
  vec3 sky = mix(horizonCream, midSky, tMid);
  sky = mix(sky, zenithBlue, tZen);

  // Crisp sunlit disc
  vec3 sunDir = normalize(vec3(0.35, 0.52, -0.78));
  float sunDot = max(0.0, dot(ray, sunDir));
  sky += vec3(1.0, 0.96, 0.86) * (step(0.992, sunDot) * 0.24 + pow(sunDot, 20.0) * 0.18);

  if (h > 0.005) {
    // Pixel-stepped cumulus clouds
    vec2 cp = ray.xz / (h + 0.20) * 0.56 + vec2(uTime * 0.011, -uTime * 0.006);
    float c = fbm(cp);
    float band = smoothstep(0.42, 0.72, c) * smoothstep(0.005, 0.16, h) * smoothstep(0.88, 0.28, h);
    float qBand = floor(band * 4.0 + dither * 0.9) / 4.0;
    vec3 cloudLit = vec3(0.985, 0.98, 0.95);
    vec3 cloudShade = vec3(0.75, 0.84, 0.91);
    sky = mix(sky, mix(cloudShade, cloudLit, step(0.58, c + dither * 0.08)), qBand * 0.86);
  } else {
    // Sunlit pixel-dithered cloud sea over Virginia Sylva's sage meadow below!
    vec2 lp = ray.xz / (-h + 0.28) * 0.52 + vec2(-uTime * 0.013, uTime * 0.007);
    float lc = fbm(lp);
    float billow = floor(smoothstep(0.28, 0.74, lc) * 4.0 + dither * 0.9) / 4.0;
    vec3 cloudTop = vec3(0.97, 0.965, 0.935);
    vec3 cloudUnder = vec3(0.78, 0.85, 0.84);
    vec3 sea = mix(lowerSylvaSage, mix(cloudUnder, cloudTop, billow), smoothstep(0.14, 0.52, lc));
    sky = mix(sky, sea, 0.88);
  }

  // Crisp pixel-stepped Blue Ridge mountain silhouette along horizon
  float az = atan(ray.x, ray.z);
  float ridge = 0.03 * sin(az * 3.0 + 0.7) + 0.016 * cos(az * 7.0 - 1.1) - 0.008;
  float inRidge = step(h, ridge) * step(-0.14, h);
  sky = mix(sky, vec3(0.64, 0.77, 0.82), inRidge * 0.52);

  // Subtle Virginia Sylva drop-zone tint along lower horizon cloud seam
  float dropBand = exp(-pow((h + 0.025) / 0.11, 2.0));
  sky = mix(sky, mix(sky, uDropAccent, 0.24), dropBand * 0.42);

  // Browser-native PinchDrop Custom Backdrop (2D photo / 360° panorama / .splat dome)
  vec3 rawCustomSample = sky;
  float customBlendMask = 0.0;
  if (uCustomActive > 0.5) {
    float uEq = fract(az / 6.2831853 + 0.5);
    float vEq = clamp(0.5 - asin(clamp(h, -1.0, 1.0)) / 3.14159265, 0.002, 0.998);
    if (uCustomParallax > 0.5) {
      // Gentle 2.5D depth-parallax horizon framing
      uEq = fract(uEq * 1.15 + uCamForward.x * 0.06);
      vEq = clamp((vEq - 0.5) * 0.84 + 0.5 - uCamForward.y * 0.05, 0.002, 0.998);
    }
    vec3 texCol = texture(uCustomBackdrop, vec2(uEq, vEq)).rgb;
    rawCustomSample = texCol;
    // PinchDrop radial unfold wave expanding cleanly across the sky dome
    float radial = length(ndc * vec2(aspect * 0.62, 0.82));
    float unfoldEdge = smoothstep(uCustomUnfold * 2.15, max(0.001, uCustomUnfold * 2.15 - 0.28), radial);
    float unfoldRing = exp(-pow((radial - uCustomUnfold * 1.95) / 0.09, 2.0)) * (1.0 - smoothstep(0.82, 1.0, uCustomUnfold));
    // Harmonize with pixel-step Bayer quantization when Pixel Stack style is active
    vec3 quantizedTex = floor(texCol * 10.0 + dither * 0.85) / 10.0;
    vec3 harmonized = mix(texCol, quantizedTex, uCustomStylize * (uVisualStyle == 0 ? 0.82 : 0.25));
    // Keep soft lower cloud sea continuity near nadir while showing uploaded backdrop prominently across sky & horizon
    float skyMask = mix(0.88, 1.0, smoothstep(-0.35, 0.08, h));
    customBlendMask = unfoldEdge * skyMask;
    sky = mix(sky, harmonized, customBlendMask);
    sky += vec3(0.82, 0.94, 1.0) * unfoldRing * 0.42;
  }

  // 360° Horizon-Linked Audio & Voice Light Visualization (Zero extra passes!)
  // Dominant ~1/3 circle luminous core + 60-70% wide prismatic outer glow fade visible from any POV
  if (uAudioCount > 0) {
    vec3 auroraAdd = vec3(0.0);
    float totalGlow = 0.0;
    for (int i = 0; i < 6; i++) {
      if (i >= uAudioCount) break;
      float srcAz = uAudioPos[i].x;
      float arcHalf = max(0.35, uAudioPos[i].y);
      float energy = uAudioPos[i].z;
      float tilt = uAudioPos[i].w;
      if (energy <= 0.004) continue;

      vec3 srcCol = uAudioCol[i].rgb;
      float outerFade = uAudioCol[i].a;

      // Exact circular angular distance around 360° horizon
      float dAz = atan(sin(az - srcAz), cos(az - srcAz));
      float absAz = abs(dAz);

      // 1/3 circle dominant light source core + 60-70% wide outer glow gradient fade
      float coreArc = pow(smoothstep(arcHalf, 0.0, absAz), 1.3);
      float outerArc = (exp(-(absAz * absAz) / (2.0 * 1.48 * 1.48)) * 0.84 + 0.16) * outerFade;

      // Soft vertical prismatic aurora rising from the horizon line
      float ripple = 0.028 * sin(dAz * 2.6 + uTime * 1.25 + float(i) * 1.9);
      float vCore = exp(-pow((h - 0.015 - ripple * 0.4) / (0.095 + energy * 0.12), 2.0));
      float vOuter = smoothstep(-0.18, 0.0, h) * exp(-max(0.0, h - ripple) / (0.18 + energy * 0.24));

      // Subtle Bayer pixel-step harmony so horizon aurora feels native to sprite-stacked Paper Sky
      float qCore = floor(clamp(coreArc * vCore + dither * 0.08, 0.0, 1.0) * 10.0) / 10.0;
      float qOuter = floor(clamp(outerArc * vOuter + dither * 0.06, 0.0, 1.0) * 12.0) / 12.0;

      // Iridescent harmonic fringe matching luminous atmospheric bloom
      vec3 harmonic = vec3(srcCol.b * 0.72 + 0.22, srcCol.r * 0.62 + 0.26, srcCol.g * 0.78 + 0.22);
      vec3 coreTint = mix(srcCol, vec3(0.98, 0.99, 1.0), 0.34 * qCore * clamp(energy, 0.0, 1.0));
      vec3 fringeTint = mix(srcCol, harmonic, clamp(0.32 + 0.34 * sin(dAz * 1.7 + tilt * 3.14159), 0.0, 0.72));

      vec3 contrib = coreTint * qCore * (0.68 * energy) + fringeTint * qOuter * (0.44 * energy);
      auroraAdd += contrib;
      totalGlow += (qCore * 0.65 + qOuter * 0.35) * energy;
    }

    // Soft screen-style atmospheric blend (keeps sunlit sky luminous without harsh clipping)
    vec3 clampedAurora = clamp(auroraAdd, 0.0, 0.95);
    sky = 1.0 - (1.0 - sky) * (1.0 - clampedAurora * 0.72);
    sky += clampedAurora * 0.16 * clamp(totalGlow, 0.0, 1.0);
  }

  // Live Visual Style Harmonization (zero extra render passes!)
  if (uVisualStyle == 1) {
    // No. 03 Risograph Halftone Print: warm newsprint cream/blush + coral rising sun + rotated dot screen
    float luma = dot(sky, vec3(0.299, 0.587, 0.114));
    vec3 paperCream = vec3(0.96, 0.94, 0.89);
    vec3 blushSky = vec3(0.95, 0.82, 0.78);
    vec3 coralSun = vec3(0.95, 0.40, 0.31);
    vec3 risoInk = vec3(0.16, 0.15, 0.19);
    vec2 rotUv = mat2(0.866, -0.5, 0.5, 0.866) * (gl_FragCoord.xy * 0.24);
    vec2 cell = fract(rotUv) - 0.5;
    float dotDist = length(cell);
    float dotMask = smoothstep(0.08, 0.46, dotDist + (luma - 0.56) * 0.72);
    vec3 basePrint = mix(blushSky, paperCream, smoothstep(-0.08, 0.45, h));
    vec3 toned = mix(mix(risoInk, vec3(0.32, 0.42, 0.56), smoothstep(-0.05, 0.28, h)), basePrint, dotMask);
    // Bold graphic coral sun disc
    float disc = smoothstep(0.968, 0.976, sunDot);
    toned = mix(toned, coralSun, disc * 0.92);
    // Crisp ink ridge rule
    float ridgeLine = smoothstep(0.008, 0.0, abs(h - ridge));
    toned = mix(toned, risoInk, ridgeLine * 0.75);
    sky = mix(toned, sky, clamp(float(uAudioCount) * 0.14, 0.0, 0.28));
    if (uCustomActive > 0.5) {
      sky = mix(rawCustomSample, sky, uCustomStylize);
    }
  } else if (uVisualStyle == 2) {
    // Architectural Ink Vellum: high-key archival paper + crisp graphite horizons
    float luma = dot(sky, vec3(0.299, 0.587, 0.114));
    vec3 vellum = vec3(0.945, 0.935, 0.905);
    vec3 graphite = vec3(0.18, 0.20, 0.22);
    float hatch = step(0.42, fract((gl_FragCoord.x + gl_FragCoord.y) * 0.18));
    vec3 inkSky = mix(vec3(0.76, 0.78, 0.76), vellum, smoothstep(0.48, 0.88, luma + hatch * 0.06));
    float ridgeLine = smoothstep(0.006, 0.0, abs(h - ridge));
    inkSky = mix(inkSky, graphite, ridgeLine * 0.85);
    sky = mix(inkSky, sky, 0.16);
  } else if (uVisualStyle == 3) {
    // 3D Oil Impasto: warmer sunlit azure & painterly brushstroke ripple
    float stroke = sin(gl_FragCoord.x * 0.09 + sin(gl_FragCoord.y * 0.05) * 2.5) * 0.035;
    vec3 warmOil = pow(clamp(sky + vec3(0.05, 0.02, -0.03) + stroke, 0.0, 1.0), vec3(0.92));
    sky = mix(sky, warmOil, 0.85);
  } else if (uVisualStyle == 4) {
    // Cyanotype Blueprint: Prussian cobalt + drafting grid lines + luminous cyan contours
    float luma = dot(sky, vec3(0.299, 0.587, 0.114));
    vec3 bpDeep = vec3(0.05, 0.14, 0.36);
    vec3 bpMid = vec3(0.11, 0.29, 0.58);
    vec3 bpLine = vec3(0.78, 0.92, 1.0);
    vec3 bp = mix(bpDeep, bpMid, smoothstep(0.35, 0.92, luma));
    vec2 grid = abs(fract(gl_FragCoord.xy / 36.0 - 0.5) - 0.5) / 0.035;
    float gLine = 1.0 - min(min(grid.x, grid.y), 1.0);
    float ridgeLine = smoothstep(0.007, 0.0, abs(h - ridge));
    bp = mix(bp, bpLine, gLine * 0.14 + ridgeLine * 0.75);
    sky = bp;
  } else if (uVisualStyle >= 5) {
    float ridgeLine = smoothstep(0.008, 0.0, abs(h - ridge));
    vec3 styled = applyExtendedVisualStyle(sky, gl_FragCoord.xy, dither, ridgeLine * 0.85, 1.0, uVisualStyle);
    if (uCustomActive > 0.5) {
      sky = mix(rawCustomSample, styled, uCustomStylize);
    } else {
      sky = styled;
    }
  }

  // Dream Sight (Q): twilight-violet pixel dither wash
  if (uDreamSight > 0.001) {
    float rVig = length((vUv - 0.5) * vec2(aspect, 1.0));
    vec3 dreamTint = mix(vec3(0.48, 0.42, 0.76), vec3(0.22, 0.18, 0.44), smoothstep(0.22, 0.92, rVig));
    sky = mix(sky, sky * dreamTint * 1.48 + vec3(0.08, 0.05, 0.16), uDreamSight * 0.84);
  }

  // Radial pixel-stepped cloud curtain parting straight into Virginia Sylva below!
  float alpha = 1.0;
  if (uDescentReveal > 0.001) {
    vec2 cDelta = (vUv - 0.5) * vec2(aspect, 1.0);
    float rDist = length(cDelta);
    float edgeNoise = (fbm(vUv * 5.2 + vec2(uTime * 0.25, -uTime * 0.18)) - 0.5) * 0.34;
    float openRadius = uDescentReveal * 1.45;
    float cloudCurtain = smoothstep(openRadius - 0.34, openRadius + 0.10, rDist + edgeNoise + dither * 0.06);
    float rim = smoothstep(0.26, 0.0, abs((rDist + edgeNoise) - openRadius)) * (1.0 - uDescentReveal * 0.7);
    sky = mix(sky, vec3(0.99, 0.975, 0.93), rim * 0.65);
    alpha = clamp(cloudCurtain * (1.0 - smoothstep(0.84, 1.0, uDescentReveal)), 0.0, 1.0);
  }

  outColor = vec4(clamp(sky, 0.0, 1.0), alpha);
}`;

// ─── SHADER 2: Sprite-Stacked GPU-Instanced Emote Cards ──────────────────────
export const CARD_ATLAS_VS = `#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNor;
layout(location = 2) in vec2 aUv;
// aFaceFlag: 1.0 = top emote face, -1.0 = bottom back, 0.0..0.4 = sprite-stacked slice strata!
layout(location = 3) in float aFaceFlag;

layout(location = 4) in vec4 aCol0;
layout(location = 5) in vec4 aCol1;
layout(location = 6) in vec4 aCol2;
layout(location = 7) in vec4 aCol3;
layout(location = 8) in vec4 aCardMeta; // x = cardIndex, y = glow, z = alpha, w = backOnTop

uniform mat4 uViewProj;
uniform float uTime;

out vec3 vWorldPos;
out vec3 vWorldNor;
out vec2 vCardUv;
out float vFaceFlag;
out float vCardIndex;
out float vGlow;
out float vCardAlpha;
out float vBackOnTop;
out float vSliceHeight;

void main() {
  mat4 model = mat4(aCol0, aCol1, aCol2, aCol3);
  vec3 pos = aPos;

  // Keep sprite-stacked pixel cards crisp and architectural with minimal corner lift
  vec2 corner = abs(pos.xz * 2.0);
  float cornerFactor = smoothstep(0.62, 1.0, corner.x) * smoothstep(0.62, 1.0, corner.y);
  pos.y += cornerFactor * 0.015;

  vec4 world = model * vec4(pos, 1.0);
  vWorldPos = world.xyz;

  mat3 m3 = mat3(model);
  vec3 sx = vec3(length(m3[0]), length(m3[1]), length(m3[2]));
  mat3 invScaleRot = mat3(
    m3[0] / max(0.0001, sx.x * sx.x),
    m3[1] / max(0.0001, sx.y * sx.y),
    m3[2] / max(0.0001, sx.z * sx.z)
  );
  vWorldNor = normalize(invScaleRot * aNor);

  vCardUv = aUv;
  vFaceFlag = aFaceFlag;
  vCardIndex = aCardMeta.x;
  vGlow = aCardMeta.y;
  vCardAlpha = aCardMeta.z;
  vBackOnTop = aCardMeta.w;
  vSliceHeight = pos.y + 0.5; // 0..1 from bottom sprite slice to top slice

  gl_Position = uViewProj * world;
}`;

export const CARD_ATLAS_FS = `#version 300 es
precision highp float;
precision highp int;

in vec3 vWorldPos;
in vec3 vWorldNor;
in vec2 vCardUv;
in float vFaceFlag;
in float vCardIndex;
in float vGlow;
in float vCardAlpha;
in float vBackOnTop;
in float vSliceHeight;

out vec4 outColor;

uniform sampler2D uAtlas;
uniform vec3 uCamPos;
uniform vec3 uLightDir;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uTime;
uniform float uOpacity;
uniform float uDreamSight;
uniform int uVisualStyle;

float bayer4(vec2 px) {
  ivec2 p = ivec2(mod(floor(px), 4.0));
  int idx = p.y * 4 + p.x;
  const float M[16] = float[16](
     0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
    12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
     3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
    15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
  );
  return M[idx];
}
${SHARED_VISUAL_STYLE_GLSL}

vec2 tileUv(float idx, vec2 localUv) {
  float cols = ${ATLAS_COLS}.0;
  float rows = ${ATLAS_ROWS}.0;
  float fi = floor(idx + 0.5);
  float col = mod(fi, cols);
  float row = floor(fi / cols);
  vec2 pad = vec2(0.008, 0.008);
  vec2 uv = mix(pad, vec2(1.0) - pad, clamp(localUv, 0.0, 1.0));
  return vec2((col + uv.x) / cols, (row + uv.y) / rows);
}

void main() {
  if (vCardAlpha < 0.02) discard;

  vec3 n = normalize(vWorldNor);
  vec3 l = normalize(uLightDir);
  vec3 v = normalize(uCamPos - vWorldPos);
  float dither = bayer4(gl_FragCoord.xy) - 0.5;

  // Sample crisp nearest-neighbor pixel emote card face, back, or sprite-stacked slice edges!
  vec3 albedo;
  if (vFaceFlag > 0.5) {
    float idx = vBackOnTop > 0.5 ? ${CARD_BACK_INDEX}.0 : vCardIndex;
    vec2 auv = tileUv(idx, vCardUv);
    albedo = texture(uAtlas, auv, -0.75).rgb;
  } else if (vFaceFlag < -0.5) {
    float idx = vBackOnTop > 0.5 ? vCardIndex : ${CARD_BACK_INDEX}.0;
    vec2 auv = tileUv(idx, vec2(1.0 - vCardUv.x, vCardUv.y));
    albedo = texture(uAtlas, auv, -0.6).rgb;
  } else {
    // Visible Sprite-Stacked Card Strata: alternating warm paper & shaded kraft pixel slices!
    float layerBand = mod(floor(vSliceHeight * 5.0), 2.0);
    vec3 creamEdge = vBackOnTop > 0.5 ? vec3(0.74, 0.24, 0.26) : vec3(0.92, 0.88, 0.79);
    vec3 darkSlice = vBackOnTop > 0.5 ? vec3(0.50, 0.14, 0.17) : vec3(0.75, 0.71, 0.62);
    albedo = mix(darkSlice, creamEdge, layerBand);
  }

  // Sprite-stacking stepped cel lighting with Bayer 4x4 dithering (matches Virginia Sylva!)
  float halfLambert = dot(n, l) * 0.5 + 0.5;
  float steppedLight = floor(halfLambert * 4.0 + dither * 0.65) / 4.0;
  float lightTerm = mix(0.68, 1.06, steppedLight);
  vec3 hemi = mix(vec3(0.97, 0.95, 0.89), vec3(0.88, 0.94, 1.0), n.y * 0.5 + 0.5);

  vec3 col = albedo * hemi * lightTerm;

  // Crisp pixel rim highlight on stacked card edges
  float rim = step(0.66, 1.0 - max(0.0, dot(n, v)));
  col += vec3(0.98, 0.96, 0.90) * rim * (abs(vFaceFlag) < 0.5 ? 0.18 : 0.06);

  // Checkpoint gold glow OR Dream Sight violet shimmer
  if (vGlow > 0.01) {
    float pulse = 0.8 + 0.2 * sin(uTime * 3.0 + vCardIndex);
    float borderDist = min(min(vCardUv.x, 1.0 - vCardUv.x), min(vCardUv.y, 1.0 - vCardUv.y));
    float borderGlow = step(borderDist, 0.06);
    vec3 glowTint = vGlow > 1.2 ? vec3(0.66, 0.54, 1.0) : vec3(0.98, 0.76, 0.26);
    float strength = vGlow > 1.2 ? (vGlow - 1.0) : vGlow;
    col += glowTint * strength * (0.12 + borderGlow * 0.55) * pulse;
  }

  if (uDreamSight > 0.001) {
    col = mix(col, col * vec3(0.72, 0.66, 0.96) + vec3(0.04, 0.03, 0.10), uDreamSight * 0.68);
  }

  float finalAlpha = vCardAlpha * uOpacity;
  if (vCardAlpha < 0.92) {
    float borderDist = min(min(vCardUv.x, 1.0 - vCardUv.x), min(vCardUv.y, 1.0 - vCardUv.y));
    float edgeSpark = step(borderDist, 0.055);
    col = mix(col, vec3(0.76, 0.68, 1.0), 0.45 + edgeSpark * 0.45);
    // Crisp Bayer dither alpha cut for phantom cards!
    if (vCardAlpha + edgeSpark * 0.45 < bayer4(gl_FragCoord.xy)) discard;
    finalAlpha = uOpacity;
  }

  if (uVisualStyle == 1) {
    // Halftone No. 03 print dots + crisp black ink rim on cards
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    vec2 rotUv = mat2(0.866, -0.5, 0.5, 0.866) * (gl_FragCoord.xy * 0.28);
    float hDot = smoothstep(0.12, 0.48, length(fract(rotUv) - 0.5) + (luma - 0.52) * 0.68);
    vec3 warmCard = mix(col * vec3(1.06, 0.96, 0.90), vec3(0.12, 0.11, 0.14), (1.0 - hDot) * 0.36);
    float edgeOutline = step(0.72, 1.0 - max(0.0, dot(n, v)));
    col = mix(warmCard, vec3(0.08, 0.08, 0.10), edgeOutline * 0.72);
  } else if (uVisualStyle == 2) {
    // Ink Vellum: crisp high-contrast architectural monochrome + crimson stamp preservation
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    float redPop = clamp((col.r - max(col.g, col.b)) * 2.2, 0.0, 1.0);
    vec3 mono = mix(vec3(0.10, 0.11, 0.13), vec3(0.95, 0.94, 0.90), smoothstep(0.22, 0.82, luma));
    col = mix(mono, vec3(0.84, 0.16, 0.18), redPop * 0.85);
  } else if (uVisualStyle == 3) {
    // 3D Oil Impasto: painterly brushstroke texture + warm gilded highlight
    float brush = sin(vWorldPos.x * 5.2 + vWorldPos.z * 3.7) * cos(vWorldPos.z * 4.4 - vWorldPos.x * 2.1);
    col = clamp(col * (1.0 + brush * 0.08) + vec3(0.04, 0.02, -0.02), 0.0, 1.0);
  } else if (uVisualStyle == 4) {
    // Cyanotype Blueprint cards: inverted white drafting lines on cobalt stock
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 bpCard = mix(vec3(0.88, 0.96, 1.0), vec3(0.09, 0.24, 0.54), smoothstep(0.18, 0.78, luma));
    float borderDist = min(min(vCardUv.x, 1.0 - vCardUv.x), min(vCardUv.y, 1.0 - vCardUv.y));
    float edgeLine = step(borderDist, 0.028);
    col = mix(bpCard, vec3(0.90, 0.97, 1.0), edgeLine * 0.85);
  } else if (uVisualStyle >= 5) {
    float borderDist = min(min(vCardUv.x, 1.0 - vCardUv.x), min(vCardUv.y, 1.0 - vCardUv.y));
    float cardEdge = max(step(borderDist, 0.032), step(0.72, 1.0 - max(0.0, dot(n, v))));
    col = applyExtendedVisualStyle(col, gl_FragCoord.xy, dither, cardEdge, 0.0, uVisualStyle);
  }

  float dist = length(uCamPos - vWorldPos);
  float fogD = dist * uFogDensity;
  float fogFactor = clamp(1.0 - exp(-fogD * fogD), 0.0, 0.90);
  float qFog = floor(fogFactor * 8.0 + dither * 0.7) / 8.0;
  vec3 effectiveFog = mix(uFogColor, vec3(0.38, 0.34, 0.60), uDreamSight * 0.72);
  col = mix(col, effectiveFog, qFog);

  outColor = vec4(clamp(col, 0.0, 1.0), finalAlpha);
}`;

// ─── SHADER 3: Sprite-Stacked Voxel-Slice Girl Silhouette ────────────────────
export const PAPER_GIRL_VS = `#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNor;
layout(location = 2) in float aFlutter;

uniform mat4 uViewProj;
uniform mat4 uModel;
uniform float uTime;
uniform float uAirspeed;
uniform float uGlideSpread;

out vec3 vWorldPos;
out vec3 vWorldNor;
out float vFlutter;
out float vLocalY;

void main() {
  vec3 pos = aPos;
  if (aFlutter > 0.01) {
    float freq = 6.5 + uAirspeed * 0.55;
    float wave = sin(uTime * freq + pos.x * 7.5 + pos.z * 5.0) * 0.05 * aFlutter * (0.35 + uAirspeed * 0.065);
    float billow = cos(uTime * (freq * 0.7) + pos.y * 4.5) * 0.04 * aFlutter * (0.25 + uGlideSpread);
    pos.y += wave + billow;
    pos.z += abs(wave) * 0.6;
  }
  vec4 world = uModel * vec4(pos, 1.0);
  vWorldPos = world.xyz;
  vWorldNor = normalize(mat3(uModel) * aNor);
  vFlutter = aFlutter;
  vLocalY = aPos.y;
  gl_Position = uViewProj * world;
}`;

export const PAPER_GIRL_FS = `#version 300 es
precision highp float;
precision highp int;

in vec3 vWorldPos;
in vec3 vWorldNor;
in float vFlutter;
in float vLocalY;

out vec4 outColor;

uniform vec3 uCamPos;
uniform vec3 uBaseColor;
uniform float uOpacity;
uniform float uDashShimmer;
uniform int uVisualStyle;

float bayer4(vec2 px) {
  ivec2 p = ivec2(mod(floor(px), 4.0));
  int idx = p.y * 4 + p.x;
  const float M[16] = float[16](
     0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
    12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
     3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
    15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
  );
  return M[idx];
}
${SHARED_VISUAL_STYLE_GLSL}

void main() {
  vec3 n = normalize(vWorldNor);
  vec3 v = normalize(uCamPos - vWorldPos);
  vec3 l = normalize(vec3(0.42, 0.78, -0.46));
  float ndv = abs(dot(n, v));
  float dither = bayer4(gl_FragCoord.xy) - 0.5;

  // Stepped sprite-stack lighting with subtle slice-layer shading!
  float ndl = dot(n, l) * 0.5 + 0.5;
  float cel = floor(ndl * 3.0 + dither * 0.55) / 3.0;
  float sliceShade = 0.92 + 0.08 * mod(floor(vLocalY * 18.0), 2.0);
  vec3 col = uBaseColor * mix(0.76, 1.18, cel) * sliceShade;

  // Crisp sprite rim highlight
  float rim = step(0.68, 1.0 - ndv);
  col += vec3(0.92, 0.94, 0.98) * rim * 0.16;

  if (uVisualStyle == 1) {
    // Risograph ink silhouette with crisp coral rim pop
    col = mix(col * vec3(1.05, 0.92, 0.90), vec3(0.96, 0.44, 0.34), rim * 0.32);
  } else if (uVisualStyle == 2) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(0.08, 0.09, 0.11), vec3(0.88, 0.87, 0.84), smoothstep(0.18, 0.82, luma));
  } else if (uVisualStyle == 4) {
    // Blueprint crisp white contour figure
    col = mix(vec3(0.06, 0.16, 0.40), vec3(0.88, 0.97, 1.0), rim * 0.82 + cel * 0.25);
  } else if (uVisualStyle >= 5) {
    col = applyExtendedVisualStyle(col, gl_FragCoord.xy, dither, rim * 0.9, 0.0, uVisualStyle);
  }

  if (uDashShimmer > 0.01) {
    col = mix(col, vec3(0.46, 0.94, 1.0), uDashShimmer * (0.48 + rim * 0.45));
  }

  outColor = vec4(clamp(col, 0.0, 1.0), uOpacity);
}`;

// ─── SHADER 4: Pixel-Dithered ContactShadowProjector ─────────────────────────
export const CONTACT_SHADOW_VS = `#version 300 es
precision highp float;
precision highp int;

const vec2 QUAD[4] = vec2[4](
  vec2(-1.0, -1.0),
  vec2( 1.0, -1.0),
  vec2(-1.0,  1.0),
  vec2( 1.0,  1.0)
);

uniform mat4 uViewProj;
uniform vec3 uCenter;
uniform float uRadius;
uniform float uRotY;
uniform float uSlopeX;

out vec2 vLocal;

void main() {
  vec2 q = QUAD[gl_VertexID];
  vLocal = q;
  vec2 local = q * uRadius;
  float dy = -local.y * tan(uSlopeX);
  float c = cos(uRotY);
  float s = sin(uRotY);
  vec2 r = vec2(local.x * c - local.y * s, local.x * s + local.y * c);
  vec3 world = uCenter + vec3(r.x, dy, r.y);
  gl_Position = uViewProj * vec4(world, 1.0);
}`;

export const CONTACT_SHADOW_FS = `#version 300 es
precision highp float;
precision highp int;

in vec2 vLocal;
out vec4 outColor;

uniform float uOpacity;

float bayer4(vec2 px) {
  ivec2 p = ivec2(mod(floor(px), 4.0));
  int idx = p.y * 4 + p.x;
  const float M[16] = float[16](
     0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
    12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
     3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
    15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
  );
  return M[idx];
}

void main() {
  float d = length(vLocal);
  if (d > 1.0) discard;
  float soft = pow(1.0 - d, 1.45);
  // Crisp sprite-stack Bayer dithered shadow circle (matches Virginia Sylva tree shadows!)
  if (soft * 1.15 < bayer4(gl_FragCoord.xy)) discard;
  outColor = vec4(0.08, 0.11, 0.16, uOpacity * 0.92);
}`;

// ─── SHADER 5: Swirling Pixel Emote Card Ribbons + Angelic Slipstream Wake ────
export const AMBIENT_CARD_VS = `#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in vec2 aQuad;
layout(location = 1) in vec4 aOrigin;
layout(location = 2) in vec4 aParam; // scale, spinSpeed, colorType, ribbonMode

uniform mat4 uViewProj;
uniform vec3 uCamPos;
uniform vec3 uAnchorPos;
uniform vec3 uPlayerVel;
uniform float uGlideSpread;
uniform float uSlipstream;
uniform float uTime;

out vec2 vUv;
out float vColorType;
out float vFog;
out float vAuraGlow;

vec3 curlFlow(vec3 p, float t) {
  float a = sin(p.y * 0.16 + t * 0.35) * cos(p.z * 0.12 - t * 0.22);
  float b = sin(p.z * 0.15 + t * 0.28) * cos(p.x * 0.14 + t * 0.19);
  float c = sin(p.x * 0.13 - t * 0.31) * cos(p.y * 0.15 + t * 0.26);
  return vec3(b - c, c - a * 0.45, a - b);
}

void main() {
  float seed = aOrigin.w;
  float t = uTime;
  vec3 center;

  if (aParam.w > 0.5) {
    float phase = fract(seed + t * 0.042);
    float angle = phase * 12.566 + aOrigin.x * 0.35;
    float radius = 6.5 + sin(phase * 6.283 + aOrigin.y) * 4.5;
    float zSpan = mix(8.0, -188.0, phase);
    center = vec3(
      aOrigin.x * 0.45 + cos(angle) * radius,
      aOrigin.y + sin(phase * 9.42) * 5.2 + (1.0 - phase) * 2.0 + phase * 18.0,
      zSpan
    );
  } else {
    vec3 basePos = aOrigin.xyz;
    vec3 drift = curlFlow(basePos * 0.5 + vec3(seed * 3.7), t) * 4.2;
    center = basePos + drift;
    center.y += sin(t * 0.55 + seed * 11.3) * 1.4;
    float relZ = mod(center.z - uAnchorPos.z + 85.0, 170.0) - 85.0;
    center.z = uAnchorPos.z + relZ;
  }

  // Angelic subject-linked slipstream wake: nearby sky cards gently orbit & trail behind her flight!
  float aura = 0.0;
  if (uSlipstream > 0.01) {
    vec3 toCard = center - (uAnchorPos + vec3(0.0, 0.9, 0.0));
    float dPlayer = length(toCard);
    float pull = smoothstep(22.0, 2.2, dPlayer) * uSlipstream;
    if (pull > 0.005) {
      float spd = length(uPlayerVel);
      vec3 fwd = spd > 0.35 ? normalize(uPlayerVel) : vec3(0.0, 0.0, -1.0);
      float orbitAng = t * (1.8 + spd * 0.14) + seed * 18.84;
      float orbitRad = mix(2.2, 5.2, fract(seed * 7.13)) * (1.0 + uGlideSpread * 0.35);
      vec3 wakeAnchor = uAnchorPos + vec3(0.0, 0.85 + sin(orbitAng * 0.7) * 1.25, 0.0) - fwd * (1.8 + fract(seed * 13.7) * 4.6);
      vec3 swirlOffset = vec3(cos(orbitAng) * orbitRad, sin(orbitAng * 1.3) * 0.9, sin(orbitAng) * orbitRad);
      center = mix(center, wakeAnchor + swirlOffset, pull * 0.62);
      aura = pull * (0.45 + 0.55 * clamp(spd * 0.08 + uGlideSpread * 0.55, 0.0, 1.0));
    }
  }

  float pitch = t * aParam.y + seed * 6.283;
  float roll = t * (aParam.y * 0.73) + seed * 13.1;
  float yaw = seed * 6.283 + sin(t * 0.4 + seed) * 0.8;

  vec3 local = vec3(aQuad.x * aParam.x * 0.72, 0.0, aQuad.y * aParam.x * 1.0);
  float cp = cos(pitch), sp = sin(pitch);
  local = vec3(local.x, local.y * cp - local.z * sp, local.y * sp + local.z * cp);
  float cr = cos(roll), sr = sin(roll);
  local = vec3(local.x * cr - local.y * sr, local.x * sr + local.y * cr, local.z);
  float cy = cos(yaw), sy = sin(yaw);
  local = vec3(local.x * cy + local.z * sy, local.y, -local.x * sy + local.z * cy);

  vec3 world = center + local;
  gl_Position = uViewProj * vec4(world, 1.0);
  vUv = aQuad + 0.5;
  vColorType = aParam.z;
  vAuraGlow = aura;

  float dist = length(uCamPos - world);
  float fd = dist * 0.0072;
  vFog = clamp(1.0 - exp(-fd * fd), 0.0, 0.90);
}`;

export const AMBIENT_CARD_FS = `#version 300 es
precision highp float;
precision highp int;

in vec2 vUv;
in float vColorType;
in float vFog;
in float vAuraGlow;

out vec4 outColor;

uniform vec3 uFogColor;
uniform float uOpacity;

void main() {
  // Crisp pixel-art mini emote card (pixel face eyes + smile or crimson <3 back!)
  vec2 g = floor(vUv * vec2(7.0, 9.0));
  vec3 paper = vec3(0.96, 0.935, 0.87);
  float border = step(g.x, 0.5) + step(5.5, g.x) + step(g.y, 0.5) + step(7.5, g.y);
  vec3 col;
  if (vColorType > 1.5) {
    col = mix(vec3(0.64, 0.16, 0.20), paper, clamp(border, 0.0, 1.0));
  } else {
    // Tiny pixel ":D" / "XD" face eyes + mouth on mini cards!
    float eyes = step(abs(g.y - 5.0), 0.1) * (step(abs(g.x - 2.0), 0.1) + step(abs(g.x - 4.0), 0.1));
    float mouth = step(abs(g.y - 3.0), 0.1) * step(abs(g.x - 3.0), 1.1);
    float face = clamp(eyes + mouth, 0.0, 1.0);
    vec3 ink = vColorType > 0.5 ? vec3(0.80, 0.11, 0.16) : vec3(0.11, 0.13, 0.18);
    col = mix(paper, ink, face);
    col = mix(col, vec3(0.84, 0.80, 0.73), clamp(border, 0.0, 1.0) * 0.4);
  }
  // Angelic slipstream luminous rim when drafting near the character
  col += vec3(1.0, 0.95, 0.82) * vAuraGlow * (0.22 + clamp(border, 0.0, 1.0) * 0.42);
  col = mix(col, uFogColor, vFog);
  outColor = vec4(clamp(col, 0.0, 1.0), uOpacity * (1.0 - vFog * 0.62));
}`;

// ─── SHADER 6: Crisp Pixel-Art Burst & Updraft FX Particles ──────────────────
export const FX_PARTICLE_VS = `#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec4 aColor;
layout(location = 2) in float aSize;

uniform mat4 uViewProj;
uniform float uPixelRatio;

out vec4 vColor;

void main() {
  vec4 clip = uViewProj * vec4(aPos, 1.0);
  gl_Position = clip;
  float dist = max(1.0, clip.w);
  gl_PointSize = clamp(floor((aSize * 165.0 * uPixelRatio) / dist), 2.0, 26.0);
  vColor = aColor;
}`;

export const FX_PARTICLE_FS = `#version 300 es
precision highp float;
precision highp int;

in vec4 vColor;
out vec4 outColor;

void main() {
  // Crisp pixel diamond / butterfly-sprite silhouette!
  vec2 p = abs(gl_PointCoord * 2.0 - 1.0);
  if (p.x + p.y > 1.25) discard;
  outColor = vec4(vColor.rgb, vColor.a);
}`;

// ─── SHADER 7: Paper Sky GPU Post-Process Filter Blit (OIL / ASCII / DOTS / GRAIN / SCAN) ──
export const PAPER_SKY_FILTER_VS = `#version 300 es
precision highp float;
precision highp int;
const vec2 POS[4] = vec2[4](
  vec2(-1.0, -1.0),
  vec2( 1.0, -1.0),
  vec2(-1.0,  1.0),
  vec2( 1.0,  1.0)
);
out vec2 vUv;
void main() {
  vec2 p = POS[gl_VertexID];
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

export const PAPER_SKY_FILTER_FS = `#version 300 es
precision highp float;
precision highp int;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uSceneTex;
uniform sampler2D uGlyphAtlas;
uniform vec2 uCanvasRes;
uniform float uDpr;
uniform float uTime;
uniform int uFilterStyle;    // 0=natural, 1=ascii, 2=dots, 3=grain, 4=scan, 5=oil
uniform int uColorTint;      // 0=full, 1=mono, 2=gold, 3=blue
uniform float uDensity;      // 0..1
uniform float uGlow;         // 0..1
uniform float uGlowThreshold;// 0.30..0.95
uniform float uUnderImage;   // 0..0.60
uniform float uExposure;     // -3..+3 EV
uniform float uContrast;     // 0.5..3.0
uniform float uGamma;        // 0.3..3.0
uniform float uDetail;       // 0..3.0
uniform float uInvert;       // 0 or 1
uniform int uMotion;         // 0=none, 1=pulse, 2=shimmer, 3=reveal, 4=push
uniform float uGlyphCount;
uniform float uShimmer;      // 0 or 1

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

vec3 gradeColor(vec3 col, float l, int tint) {
  if (tint == 1) return vec3(l);
  if (tint == 2) return clamp(vec3(l * 1.12 + 0.08, l * 0.82, l * 0.35), 0.0, 1.0);
  if (tint == 3) return clamp(vec3(l * 0.35, l * 0.75, l * 1.12 + 0.08), 0.0, 1.0);
  return col;
}

vec3 applyToneBasic(vec3 c) {
  float revealEv = (uMotion == 3) ? sin(uTime * 1.15) * 0.65 : 0.0;
  float ev = pow(2.0, uExposure + revealEv);
  c = clamp((c * ev - 0.5) * uContrast + 0.5, 0.0, 1.0);
  c = pow(max(c, vec3(0.0)), vec3(1.0 / max(0.25, uGamma)));
  if (uInvert > 0.5) {
    c = 1.0 - c;
  }
  return clamp(c, 0.0, 1.0);
}

vec3 sampleToneGraded(vec2 uv) {
  vec3 c = texture(uSceneTex, clamp(uv, 0.001, 0.999)).rgb;
  float revealEv = (uMotion == 3) ? sin(uTime * 1.15) * 0.65 : 0.0;
  float ev = pow(2.0, uExposure + revealEv);
  c = clamp((c * ev - 0.5) * uContrast + 0.5, 0.0, 1.0);
  c = pow(max(c, vec3(0.0)), vec3(1.0 / max(0.25, uGamma)));

  // 3x3 unsharp-mask local detail boost (Glyph Light Legibility Detail slider)
  if (uDetail > 0.01) {
    vec2 stepUv = (vec2(1.4) * uDpr) / max(uCanvasRes, vec2(1.0));
    float meanL = 0.0;
    for (int oy = -1; oy <= 1; oy++) {
      for (int ox = -1; ox <= 1; ox++) {
        vec3 nCol = texture(uSceneTex, clamp(uv + vec2(float(ox), float(oy)) * stepUv, 0.001, 0.999)).rgb;
        nCol = clamp((nCol * ev - 0.5) * uContrast + 0.5, 0.0, 1.0);
        nCol = pow(max(nCol, vec3(0.0)), vec3(1.0 / max(0.25, uGamma)));
        meanL += luma(nCol);
      }
    }
    meanL /= 9.0;
    float curL = luma(c);
    float sharpL = clamp(curL + uDetail * (curL - meanL), 0.0, 1.0);
    float ratio = curL > 0.002 ? (sharpL / curL) : 0.0;
    c = clamp(c * ratio, 0.0, 1.0);
  }

  if (uInvert > 0.5) {
    c = 1.0 - c;
  }
  return clamp(c, 0.0, 1.0);
}

float bayer4x4(ivec2 p) {
  int x = p.x & 3;
  int y = p.y & 3;
  int idx = x + y * 4;
  if (idx == 0) return 0.0 / 16.0;
  if (idx == 1) return 8.0 / 16.0;
  if (idx == 2) return 2.0 / 16.0;
  if (idx == 3) return 10.0 / 16.0;
  if (idx == 4) return 12.0 / 16.0;
  if (idx == 5) return 4.0 / 16.0;
  if (idx == 6) return 14.0 / 16.0;
  if (idx == 7) return 6.0 / 16.0;
  if (idx == 8) return 3.0 / 16.0;
  if (idx == 9) return 11.0 / 16.0;
  if (idx == 10) return 1.0 / 16.0;
  if (idx == 11) return 9.0 / 16.0;
  if (idx == 12) return 15.0 / 16.0;
  if (idx == 13) return 7.0 / 16.0;
  if (idx == 14) return 13.0 / 16.0;
  return 5.0 / 16.0;
}

float hash21(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.53);
  return fract(p.x * p.y);
}

float linenCanvasTooth(vec2 px) {
  float warp = sin(px.x * 1.55) * 0.5 + 0.5;
  float weft = sin(px.y * 1.55 + 0.8) * 0.5 + 0.5;
  float crossThread = sin((px.x + px.y) * 0.52) * 0.5 + 0.5;
  return (warp * 0.42 + weft * 0.42 + crossThread * 0.16) - 0.5;
}

vec3 kuwaharaOil(vec2 uv, float stepPx) {
  vec2 texel = (stepPx / max(uCanvasRes, vec2(1.0))) * uDpr;
  vec3 mean[4];
  vec3 sq[4];
  for (int q = 0; q < 4; q++) {
    mean[q] = vec3(0.0);
    sq[q] = vec3(0.0);
  }
  for (int j = -2; j <= 0; j++) {
    for (int i = -2; i <= 0; i++) {
      vec3 c0 = applyToneBasic(texture(uSceneTex, clamp(uv + vec2(float(i), float(j)) * texel, 0.002, 0.998)).rgb);
      mean[0] += c0; sq[0] += c0 * c0;
      vec3 c1 = applyToneBasic(texture(uSceneTex, clamp(uv + vec2(float(i + 2), float(j)) * texel, 0.002, 0.998)).rgb);
      mean[1] += c1; sq[1] += c1 * c1;
      vec3 c2 = applyToneBasic(texture(uSceneTex, clamp(uv + vec2(float(i), float(j + 2)) * texel, 0.002, 0.998)).rgb);
      mean[2] += c2; sq[2] += c2 * c2;
      vec3 c3 = applyToneBasic(texture(uSceneTex, clamp(uv + vec2(float(i + 2), float(j + 2)) * texel, 0.002, 0.998)).rgb);
      mean[3] += c3; sq[3] += c3 * c3;
    }
  }
  float minVar = 1e9;
  vec3 bestCol = applyToneBasic(texture(uSceneTex, uv).rgb);
  for (int q = 0; q < 4; q++) {
    vec3 m = mean[q] / 9.0;
    vec3 v = abs(sq[q] / 9.0 - m * m);
    float sigma = v.r + v.g + v.b;
    if (sigma < minVar) {
      minVar = sigma;
      bestCol = m;
    }
  }
  return bestCol;
}

vec3 sampleGlow(vec2 uv, float glowAmt, int tint) {
  if (glowAmt <= 0.01) return vec3(0.0);
  float thrLo = clamp(uGlowThreshold - 0.14, 0.12, 0.94);
  float thrHi = clamp(uGlowThreshold + 0.18, thrLo + 0.04, 0.995);
  vec2 texel = (vec2(1.0) / max(uCanvasRes, vec2(1.0))) * (3.2 + glowAmt * 10.5) * uDpr;
  vec3 acc = vec3(0.0);
  float wSum = 0.0;
  for (int i = 0; i < 12; i++) {
    float ang = float(i) * 0.5235988;
    float ring = (i < 6) ? 1.0 : 2.15;
    vec2 dir = vec2(cos(ang), sin(ang)) * ring;
    vec3 s = applyToneBasic(texture(uSceneTex, clamp(uv + dir * texel, 0.002, 0.998)).rgb);
    float sl = luma(s);
    float bright = smoothstep(thrLo, thrHi, sl);
    float w = (i < 6) ? 1.0 : 0.58;
    acc += gradeColor(s, sl, tint) * bright * w;
    wSum += w;
  }
  vec3 center = applyToneBasic(texture(uSceneTex, uv).rgb);
  float cl = luma(center);
  acc += gradeColor(center, cl, tint) * smoothstep(thrLo, thrHi, cl) * 1.1;
  wSum += 1.1;
  float motionPulse = (uMotion == 1)
    ? (0.58 + 0.52 * (0.5 + 0.5 * sin(uTime * 2.6)))
    : mix(1.0, 0.92 + 0.08 * sin(uTime * 2.2), uShimmer);
  return (acc / wSum) * glowAmt * 1.08 * motionPulse;
}

void main() {
  vec2 uv = vUv;
  if (uMotion == 4) {
    // Live Push FX: gentle optical zoom breathing
    float zoom = 1.0 + 0.048 * (0.5 + 0.5 * sin(uTime * 1.35));
    uv = clamp((uv - 0.5) / zoom + 0.5, 0.001, 0.999);
  }

  vec4 raw = texture(uSceneTex, uv);
  float sceneAlpha = raw.a;
  if (sceneAlpha <= 0.005) {
    outColor = vec4(0.0);
    return;
  }

  vec2 fragPx = uv * uCanvasRes;

  if (uFilterStyle == 0) {
    // RAW mode with full Glyph Light Tone, Detail, Invert, Tint & Threshold Bloom!
    vec3 toned = sampleToneGraded(uv);
    float tl = luma(toned);
    vec3 gradedRaw = gradeColor(toned, tl, uColorTint);
    vec3 glow = sampleGlow(uv, uGlow * 0.65, uColorTint);
    gradedRaw = 1.0 - (1.0 - clamp(gradedRaw, 0.0, 1.0)) * (1.0 - clamp(glow, 0.0, 1.0));
    outColor = vec4(clamp(gradedRaw, 0.0, 1.0), sceneAlpha);
    return;
  }

  if (uFilterStyle == 5) {
    // 2D Oil Paint Filter: Kuwahara brushstroke smoothing + warm linen weave + impasto sheen
    float brushStep = 3.2 - uDensity * 1.9;
    vec3 oilCol = kuwaharaOil(uv, max(0.9, brushStep));
    float oilL = luma(oilCol);
    oilCol = gradeColor(oilCol, oilL, uColorTint);
    if (uColorTint == 0) {
      oilCol = mix(vec3(oilL), oilCol, 1.16);
    }
    float weave = linenCanvasTooth(fragPx / max(1.0, uDpr));
    vec2 eps = vec2(1.8, 1.8) * uDpr / max(uCanvasRes, vec2(1.0));
    float gradX = luma(applyToneBasic(texture(uSceneTex, clamp(uv + vec2(eps.x, 0.0), 0.002, 0.998)).rgb)) - oilL;
    float gradY = luma(applyToneBasic(texture(uSceneTex, clamp(uv + vec2(0.0, eps.y), 0.002, 0.998)).rgb)) - oilL;
    float sheen = clamp(-(gradX + gradY), -0.3, 0.3);
    oilCol += vec3(weave * 0.075);
    oilCol += vec3(1.0, 0.97, 0.9) * max(0.0, sheen) * 0.38;
    vec3 glow = sampleGlow(uv, uGlow * 0.55, uColorTint);
    oilCol = 1.0 - (1.0 - clamp(oilCol, 0.0, 1.0)) * (1.0 - clamp(glow, 0.0, 1.0));
    outColor = vec4(clamp(oilCol, 0.0, 1.0), sceneAlpha);
    return;
  }

  float cellPx = max(4.0, (17.0 - uDensity * 11.5) * uDpr);
  vec2 cellIdx = floor(fragPx / cellPx);
  vec2 localUv = fract(fragPx / cellPx);
  vec2 cellCenterUv = clamp(((cellIdx + 0.5) * cellPx) / max(uCanvasRes, vec2(1.0)), 0.001, 0.999);

  vec3 src = sampleToneGraded(cellCenterUv);
  float adjL = luma(src);
  if (uMotion == 2) {
    // Live Shimmer FX: subtle cell luminance scintillation
    float sh = hash21(cellIdx + vec2(floor(uTime * 11.0) * 0.31, 1.7)) - 0.5;
    adjL = clamp(adjL + sh * 0.14, 0.0, 1.0);
  }
  vec3 graded = gradeColor(src, adjL, uColorTint);

  vec3 underScene = gradeColor(sampleToneGraded(uv), luma(sampleToneGraded(uv)), uColorTint);
  vec3 darkInkBed = vec3(0.028, 0.031, 0.039);
  vec3 bg = mix(darkInkBed, underScene, clamp(uUnderImage, 0.0, 0.65));
  vec3 col = bg;

  if (uFilterStyle == 1) {
    // ASCII Glyph Ramp (ink-sorted character atlas)
    float count = max(2.0, uGlyphCount);
    float gIdx = floor(adjL * (count - 1.0) + 0.5);
    float atlasU = (gIdx + clamp(localUv.x, 0.02, 0.98)) / count;
    float atlasV = 1.0 - clamp(localUv.y, 0.02, 0.98);
    float glyphAlpha = texture(uGlyphAtlas, vec2(atlasU, atlasV)).a;
    col = mix(bg, min(vec3(1.0), graded * 1.14), glyphAlpha);
  } else if (uFilterStyle == 2) {
    // 4x4 Bayer Ordered-Dither Dot Matrix
    float threshold = bayer4x4(ivec2(cellIdx));
    bool lit = adjL > threshold;
    float halfSz = lit ? 0.39 : 0.21;
    vec2 d = abs(localUv - 0.5);
    float inSquare = step(max(d.x, d.y), halfSz);
    vec3 dotCol = lit ? min(vec3(1.0), graded * 1.18) : graded * 0.26;
    col = mix(bg, dotCol, inSquare);
  } else if (uFilterStyle == 3) {
    // Stochastic Film Grain Specks
    float tSeed = (uShimmer > 0.5 || uMotion == 2) ? floor(uTime * 12.0) * 0.37 : 0.0;
    float gStep = max(2.0, cellPx * 0.45);
    vec2 gCell = floor(fragPx / gStep);
    vec2 gCenterUv = clamp(((gCell + 0.5) * gStep) / max(uCanvasRes, vec2(1.0)), 0.001, 0.999);
    vec3 gSrc = sampleToneGraded(gCenterUv);
    float gL = luma(gSrc);
    vec3 gCol = gradeColor(gSrc, gL, uColorTint);
    float rnd = hash21(gCell + vec2(tSeed, tSeed * 1.7));
    float lit = step(rnd * 0.94, gL);
    col = mix(bg, min(vec3(1.0), gCol * 1.14), lit);
  } else if (uFilterStyle == 4) {
    // Luminance-Weighted Horizontal Scanlines
    float halfBar = clamp(0.07 + adjL * 0.35, 0.06, 0.43);
    float inBar = smoothstep(halfBar + 0.04, halfBar - 0.03, abs(localUv.y - 0.5));
    float dashGap = step(0.06, localUv.x) * step(localUv.x, 0.94);
    col = mix(bg, min(vec3(1.0), graded * 1.12), inBar * dashGap);
  }

  vec3 glow = sampleGlow(uv, uGlow, uColorTint);
  col = 1.0 - (1.0 - clamp(col, 0.0, 1.0)) * (1.0 - clamp(glow, 0.0, 1.0));
  outColor = vec4(clamp(col, 0.0, 1.0), sceneAlpha);
}`;
