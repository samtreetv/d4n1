import {
  BimLayerId,
  PathNode,
  PlacedSpaceItem,
  RGB,
  SeasonalPalette,
  VIRGINIA_ITEMS,
  evaluateSeason,
  getSpaceItem,
} from '../data/virginiaTrees';
import {
  BimLayerState,
  DesignerTool,
  EngineCallbacks,
  SanctuaryRenderer,
  SceneSimulationState,
} from './rendererTypes';
import {
  createBotanicalAtlas,
  createOilBristleAtlas,
  getTileUVRect,
} from './spriteAtlas';
import {
  CanopyEmitter,
  TreeSpriteInstance,
  buildSpaceScene,
} from './treeBuilder';
import {
  AsciiGlyphSetId,
  buildGlyphRampAtlas,
  colorTintToIndex,
  filterStyleToIndex,
  getGlyphAtlasKey,
  motionFxToIndex,
  paintModeToIndex,
} from './visualFilters';
import { sharedHorizonAudioHub } from './horizonAudioHub';
import { sharedCustomBackdropHub } from './customBackdropHub';
import { sharedInstrumentAudio } from './instrumentAudio';
import {
  PAPER_SKY_STYLE_INDEX,
  SHARED_VISUAL_STYLE_GLSL,
} from './paperSky/CardAtlasShader';

export type { DesignerTool, EngineCallbacks, SanctuaryRenderer, SceneSimulationState };

interface Particle {
  active: boolean;
  kind: 'leaf' | 'petal' | 'rain' | 'snow' | 'firefly';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  rot: number;
  spin: number;
  spinSpeed: number;
  phase: number;
  age: number;
  life: number;
  settled: boolean;
  tile: number;
  r: number;
  g: number;
  b: number;
  alpha: number;
}

const MAX_PARTICLES = 850;
const PARTICLE_STRIDE_FLOATS = 14;
const SPECIES_COUNT = 36;

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function norm3(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function cross3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

const SKY_VS = `#version 300 es
precision highp float;
precision highp int;
const vec2 POS[4] = vec2[4](
  vec2(-1.0, -1.0),
  vec2( 1.0, -1.0),
  vec2(-1.0,  1.0),
  vec2( 1.0,  1.0)
);
out vec2 v_uv;
void main() {
  vec2 p = POS[gl_VertexID];
  v_uv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.998, 1.0);
}`;

const SKY_FS = `#version 300 es
precision highp float;
precision highp int;
in vec2 v_uv;
out vec4 outColor;

uniform vec2 u_pixelRes;
uniform float u_time;
uniform float u_backdropMode; // 0 = white-circle, 1 = blue-ridge, 2 = blueprint
uniform int u_paintMode;      // 0 = pixel, 1 = oil-3d, 2 = living-canvas
uniform float u_showGrid;
uniform float u_snapStep;
uniform vec3 u_camPos;
uniform vec3 u_camRight;
uniform vec3 u_camUp;
uniform vec3 u_camForward;
uniform float u_focal;

uniform vec3 u_skyTop;
uniform vec3 u_skyMid;
uniform vec3 u_horizonColor;
uniform vec3 u_groundTop;
uniform vec3 u_groundBottom;
uniform vec3 u_mountainColor;
uniform vec3 u_sunDir3;
uniform vec3 u_sunColor;
uniform float u_sunVisibility;
uniform float u_moonVisibility;
uniform float u_starVisibility;
uniform float u_mist;
uniform float u_snowAmount;
uniform float u_rainAmount;
uniform float u_wind;

uniform vec2 u_hoverXZ;
uniform float u_hoverMode;   // 0 = none, 1 = plant ring, 2 = remove ring, 3 = path brush
uniform float u_hoverRot;    // radians orientation tick for rotatable BIM items
uniform float u_hoverRadius; // path brush radius

uniform int u_audioCount;
uniform vec4 u_audioPos[6];
uniform vec4 u_audioCol[6];
uniform sampler2D u_customBackdrop;
uniform float u_customActive;
uniform float u_customUnfold;
uniform float u_customStylize;
uniform float u_customParallax;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float bayer2x2(vec2 pos) {
  int x = int(mod(pos.x, 2.0));
  int y = int(mod(pos.y, 2.0));
  int idx = x + y * 2;
  if (idx == 0) return 0.0;
  if (idx == 1) return 0.5;
  if (idx == 2) return 0.75;
  return 0.25;
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

vec3 applyHoverReticle(vec3 baseCol, vec2 hitXZ) {
  if (u_hoverMode < 0.5) return baseCol;
  vec2 delta = hitXZ - u_hoverXZ;
  float hd = length(delta);

  if (u_hoverMode > 2.5) {
    // Paintable Path Brush ring
    float r = max(0.14, u_hoverRadius);
    float ring = smoothstep(0.028, 0.0, abs(hd - r));
    float fill = smoothstep(r, r - 0.02, hd) * 0.16;
    return mix(baseCol, vec3(0.96, 0.78, 0.34), clamp(ring + fill, 0.0, 0.92));
  }

  float pulse = 0.22 + 0.025 * sin(u_time * 5.0);
  float ring = smoothstep(0.028, 0.0, abs(hd - pulse));
  float center = smoothstep(0.04, 0.0, hd);

  // Orientation heading tick for rotatable BIM items when planting
  float headingTick = 0.0;
  if (u_hoverMode < 1.5) {
    vec2 fwd = vec2(cos(u_hoverRot), sin(u_hoverRot));
    float along = dot(delta, fwd);
    float perp = abs(delta.x * -fwd.y + delta.y * fwd.x);
    if (along > 0.04 && along < pulse + 0.14 && perp < 0.024) {
      headingTick = 0.9;
    }
  }

  vec3 rCol = u_hoverMode > 1.5 ? vec3(0.96, 0.36, 0.36) : vec3(0.28, 0.86, 0.52);
  return mix(baseCol, rCol, clamp(ring + center * 0.85 + headingTick, 0.0, 1.0));
}

vec3 applySiteGrid(vec3 baseCol, vec2 hitXZ, float distC, bool isBlueprint) {
  float stepSz = max(0.1, u_snapStep);
  vec2 g = abs(fract(hitXZ / stepSz + 0.5) - 0.5) * stepSz;
  float minorLine = 1.0 - smoothstep(0.004, 0.014, min(g.x, g.y));

  vec2 gMaj = abs(fract(hitXZ / 1.0 + 0.5) - 0.5);
  float majorLine = 1.0 - smoothstep(0.008, 0.022, min(gMaj.x, gMaj.y));

  // Concentric 10 ft (1.0), 20 ft (2.0), and 34 ft (3.4) clearing boundary rings
  float ringOuter = 1.0 - smoothstep(0.012, 0.032, abs(distC - 3.4));
  float ringMid = 1.0 - smoothstep(0.008, 0.022, abs(distC - 2.0));
  float ringInner = 1.0 - smoothstep(0.008, 0.022, abs(distC - 1.0));

  float insideClearing = smoothstep(3.62, 3.35, distC);
  if (isBlueprint) {
    vec3 lineCol = vec3(0.32, 0.66, 0.95);
    vec3 hiCol = vec3(0.76, 0.92, 1.0);
    vec3 c = mix(baseCol, lineCol, (minorLine * 0.22 + majorLine * 0.45) * insideClearing);
    c = mix(c, hiCol, clamp(ringOuter * 0.85 + ringMid * 0.35 + ringInner * 0.28, 0.0, 0.9));
    return c;
  }

  vec3 gridCol = mix(vec3(0.22, 0.32, 0.26), vec3(0.92, 0.96, 0.92), 0.55);
  vec3 c = mix(baseCol, gridCol, (minorLine * 0.16 + majorLine * 0.32) * insideClearing);
  c = mix(c, vec3(0.72, 0.84, 0.74), clamp(ringOuter * 0.55 + ringMid * 0.2, 0.0, 0.7));
  return c;
}

vec3 applyHorizonAudioAurora(vec3 baseCol, vec3 rayDir, float dither, float modeStrength) {
  if (u_audioCount <= 0) return baseCol;
  float az = atan(rayDir.x, rayDir.z);
  float elev = clamp(rayDir.y, -1.0, 1.0);
  vec3 auroraAdd = vec3(0.0);
  float totalGlow = 0.0;

  for (int i = 0; i < 6; i++) {
    if (i >= u_audioCount) break;
    float srcAz = u_audioPos[i].x;
    float arcHalf = max(0.35, u_audioPos[i].y);
    float energy = u_audioPos[i].z;
    float tilt = u_audioPos[i].w;
    if (energy <= 0.004) continue;

    vec3 srcCol = u_audioCol[i].rgb;
    float outerFade = u_audioCol[i].a;

    float dAz = atan(sin(az - srcAz), cos(az - srcAz));
    float absAz = abs(dAz);

    // 1/3 circle dominant arc + 60-70% outer gradient veil visible from any POV
    float coreArc = pow(smoothstep(arcHalf, 0.0, absAz), 1.3);
    float outerArc = (exp(-(absAz * absAz) / (2.0 * 1.48 * 1.48)) * 0.84 + 0.16) * outerFade;

    float ripple = 0.025 * sin(dAz * 2.5 + u_time * 1.2 + float(i) * 1.8);
    float vCore = exp(-pow((elev - 0.03 - ripple * 0.4) / (0.11 + energy * 0.12), 2.0));
    float vOuter = smoothstep(-0.12, 0.02, elev) * exp(-max(0.0, elev - ripple) / (0.20 + energy * 0.25));

    float cVal = coreArc * vCore;
    float oVal = outerArc * vOuter;
    if (u_paintMode == 0) {
      // Pixel Stack visual mode: crisp Bayer-dithered luminance steps
      cVal = floor(clamp(cVal + dither * 1.1, 0.0, 1.0) * 10.0) / 10.0;
      oVal = floor(clamp(oVal + dither * 0.9, 0.0, 1.0) * 12.0) / 12.0;
    }

    vec3 harmonic = vec3(srcCol.b * 0.72 + 0.22, srcCol.r * 0.62 + 0.26, srcCol.g * 0.78 + 0.22);
    vec3 coreTint = mix(srcCol, vec3(0.98, 0.99, 1.0), 0.30 * cVal * clamp(energy, 0.0, 1.0));
    vec3 fringeTint = mix(srcCol, harmonic, clamp(0.32 + 0.34 * sin(dAz * 1.7 + tilt * 3.14159), 0.0, 0.72));

    auroraAdd += coreTint * cVal * (0.66 * energy) + fringeTint * oVal * (0.42 * energy);
    totalGlow += (cVal * 0.6 + oVal * 0.4) * energy;
  }

  vec3 clamped = clamp(auroraAdd * modeStrength, 0.0, 0.95);
  vec3 screened = 1.0 - (1.0 - baseCol) * (1.0 - clamped * 0.74);
  return clamp(screened + clamped * 0.16 * clamp(totalGlow, 0.0, 1.0), 0.0, 1.0);
}

void main() {
  vec2 pxCoord = floor(v_uv * u_pixelRes);
  float dither = (bayer2x2(pxCoord) - 0.375) * 0.055;
  float aspect = u_pixelRes.x / max(1.0, u_pixelRes.y);
  vec2 ndc = (v_uv - 0.5) * 2.0;

  vec3 rayDir = normalize(
    u_camForward * u_focal +
    u_camRight * (ndc.x * aspect) +
    u_camUp * ndc.y
  );

  // MODE 0: Airy Circular Garden Clearing Fading Softly Into White
  if (u_backdropMode < 0.5) {
    float dayMix = smoothstep(0.0, 0.45, u_sunVisibility + 0.22);
    vec3 paperTop = mix(vec3(0.11, 0.13, 0.19), vec3(0.985, 0.982, 0.968), dayMix);
    vec3 paperBot = mix(vec3(0.15, 0.17, 0.24), vec3(0.958, 0.954, 0.938), dayMix);
    float skyGrad = u_paintMode > 0
      ? clamp(v_uv.y, 0.0, 1.0)
      : floor(clamp(v_uv.y + dither, 0.0, 1.0) * 10.0) / 10.0;
    vec3 col = mix(paperBot, paperTop, skyGrad);

    if (rayDir.y < -0.002) {
      float t = -u_camPos.y / rayDir.y;
      if (t > 0.0 && t < 32.0) {
        vec2 hitXZ = u_camPos.xz + rayDir.xz * t;
        float distC = length(hitXZ);

        if (distC < 4.25) {
          float patchVal = noise(hitXZ * 1.45) * 0.65 + noise(hitXZ * 4.8) * 0.35;
          float qTex = u_paintMode > 0
            ? patchVal
            : floor(clamp(patchVal + dither, 0.0, 1.0) * 5.0) / 5.0;
          // Lift meadow colors slightly in bright white-circle gallery light
          vec3 meadow = mix(u_groundBottom * 1.12, u_groundTop * 1.16, qTex);

          if (u_snowAmount > 0.05) {
            if (patchVal + u_snowAmount * 0.58 > 0.74) {
              vec3 snowCol = vec3(0.94, 0.96, 0.99) * (0.48 + 0.52 * dayMix);
              meadow = mix(meadow, snowCol, u_snowAmount * 0.84);
            }
          }

          // Wide, dreamy organic feather melting the exterior clearing gently into warm paper
          float orgEdge = (noise(hitXZ * 0.95) - 0.5) * 0.78 + (noise(hitXZ * 2.4) - 0.5) * 0.28;
          float featherDither = u_paintMode > 0 ? 0.0 : dither * 1.05;
          float edgeFade = smoothstep(3.92, 1.68, distC + orgEdge + featherDither);
          edgeFade = edgeFade * edgeFade * (3.0 - 2.0 * edgeFade);
          col = mix(col, meadow, edgeFade);
        }

        if (u_showGrid > 0.5) {
          col = applySiteGrid(col, hitXZ, distC, false);
        }
        col = applyHoverReticle(col, hitXZ);
      }
    }
    col = applyHorizonAudioAurora(col, rayDir, dither, 0.42);
    outColor = vec4(col, 1.0);
    return;
  }

  // MODE 2: Architectural Prussian-Indigo Blueprint Drafting Sheet
  if (u_backdropMode > 1.5) {
    vec3 bpTop = vec3(0.045, 0.095, 0.195);
    vec3 bpBot = vec3(0.068, 0.135, 0.265);
    vec3 col = mix(bpBot, bpTop, clamp(v_uv.y, 0.0, 1.0));

    if (rayDir.y < -0.002) {
      float t = -u_camPos.y / rayDir.y;
      if (t > 0.0 && t < 34.0) {
        vec2 hitXZ = u_camPos.xz + rayDir.xz * t;
        float distC = length(hitXZ);
        vec3 sheetCircle = mix(vec3(0.078, 0.165, 0.31), vec3(0.055, 0.115, 0.23), smoothstep(0.0, 3.6, distC));
        col = mix(col, sheetCircle, smoothstep(3.85, 3.25, distC));
        col = applySiteGrid(col, hitXZ, distC, true);
        col = applyHoverReticle(col, hitXZ);
      }
    }
    col = applyHorizonAudioAurora(col, rayDir, dither, 0.82);
    outColor = vec4(col, 1.0);
    return;
  }

  // MODE 1: Full 360° Blue Ridge Panoramic Horizon & Meadow
  float elev = clamp(rayDir.y, -1.0, 1.0);
  float skyT = clamp(pow(max(0.0, elev), 0.72) + (u_paintMode > 0 ? 0.0 : dither), 0.0, 1.0);
  float qSky = u_paintMode > 0 ? skyT : floor(skyT * 14.0) / 14.0;
  vec3 sky = mix(u_horizonColor, u_skyMid, smoothstep(0.0, 0.46, qSky));
  sky = mix(sky, u_skyTop, smoothstep(0.36, 1.0, qSky));

  if (u_starVisibility > 0.01 && elev > 0.04) {
    float az = atan(rayDir.x, rayDir.z);
    vec2 starCell = floor(vec2(az * 42.0, elev * 96.0));
    float sRand = hash21(starCell);
    if (sRand > 0.985) {
      float twinkle = 0.55 + 0.45 * sin(u_time * (1.8 + sRand * 4.0) + sRand * 90.0);
      sky += vec3(0.95, 0.97, 1.0) * twinkle * u_starVisibility * smoothstep(0.04, 0.22, elev);
    }
  }

  float sunDot = dot(rayDir, normalize(u_sunDir3));
  if (u_sunVisibility > 0.01) {
    float disc = u_paintMode > 0 ? smoothstep(0.994, 0.9975, sunDot) : step(0.9965, sunDot);
    float halo = u_paintMode > 0
      ? pow(max(0.0, sunDot), 38.0) * 0.42
      : step(0.986, sunDot) * 0.24 + step(0.96, sunDot) * 0.08;
    float weatherDim = 1.0 - (u_rainAmount * 0.55 + u_mist * 0.35);
    sky += u_sunColor * (disc * 0.92 + halo) * u_sunVisibility * weatherDim;
  }
  if (u_moonVisibility > 0.01) {
    float mDisc = step(0.9978, sunDot);
    float mHalo = step(0.991, sunDot) * 0.2;
    sky += vec3(0.86, 0.92, 1.0) * (mDisc * 0.85 + mHalo) * u_moonVisibility * (1.0 - u_rainAmount * 0.6);
  }

  if (elev > 0.06) {
    vec2 cloudPlane = rayDir.xz / (elev + 0.22);
    float cVal = noise(cloudPlane * 0.72 + vec2(u_time * (0.014 + u_wind * 0.045), 1.7));
    float cMask = u_paintMode > 0
      ? smoothstep(0.56 - u_rainAmount * 0.12, 0.72 - u_rainAmount * 0.12, cVal)
      : step(0.62 - u_rainAmount * 0.12, cVal);
    if (cMask > 0.01) {
      vec3 cCol = mix(u_horizonColor * 1.08, u_sunColor * 0.8 + vec3(0.2), 0.35 * u_sunVisibility);
      cCol = mix(cCol, u_skyMid * 0.78, u_rainAmount * 0.65);
      sky = mix(sky, cCol, cMask * 0.42 * smoothstep(0.06, 0.22, elev));
    }
  }

  float azim = atan(rayDir.x, rayDir.z);
  float ridgeFar = 0.088 + 0.058 * sin(azim * 3.0 + 0.5) + 0.026 * sin(azim * 7.0 - 1.2);
  float ridgeMid = 0.054 + 0.042 * sin(azim * 4.0 + 2.2) + 0.020 * cos(azim * 9.0);
  float ridgeNear = 0.026 + 0.024 * sin(azim * 5.0 - 0.9) + 0.014 * sin(azim * 11.0 + 1.4);
  vec3 col = sky;

  // Browser-native PinchDrop Custom Backdrop blended across Virginia Sylva's 360° sky dome
  if (u_customActive > 0.5) {
    float uEq = fract(azim / 6.2831853 + 0.5);
    float vEq = clamp(0.5 - asin(clamp(elev, -1.0, 1.0)) / 3.14159265, 0.002, 0.998);
    if (u_customParallax > 0.5) {
      uEq = fract(uEq * 1.15 + u_camForward.x * 0.06);
      vEq = clamp((vEq - 0.5) * 0.84 + 0.5 - u_camForward.y * 0.05, 0.002, 0.998);
    }
    vec3 texCol = texture(u_customBackdrop, vec2(uEq, vEq)).rgb;
    float radial = length(ndc * vec2(aspect * 0.62, 0.82));
    float unfoldEdge = smoothstep(u_customUnfold * 2.15, max(0.001, u_customUnfold * 2.15 - 0.28), radial);
    vec3 qTex = u_paintMode > 0 ? texCol : floor(texCol * 10.0 + dither * 0.85) / 10.0;
    vec3 styledTex = mix(texCol, qTex, u_customStylize * 0.85);
    col = mix(col, styledTex, unfoldEdge * smoothstep(-0.12, 0.06, elev));
  }

  if (u_sunVisibility > 0.05 && elev > -0.02) {
    float glowBand = pow(max(0.0, sunDot), 6.0) * smoothstep(0.55, 0.0, elev);
    col += u_sunColor * glowBand * 0.24 * u_sunVisibility * (1.0 - u_rainAmount * 0.65);
  }

  // Horizon-linked voice & audio aurora rising behind the Blue Ridge mountains!
  col = applyHorizonAudioAurora(col, rayDir, dither, 1.0);

  if (elev < ridgeFar) {
    col = mix(u_mountainColor * 1.12, u_horizonColor, 0.54 + u_mist * 0.30);
  }
  if (elev < ridgeMid) {
    col = mix(u_mountainColor * 0.84, u_horizonColor, 0.30 + u_mist * 0.34);
  }
  if (elev < ridgeNear) {
    vec3 nearRidgeCol = mix(u_mountainColor * 0.58, u_groundBottom * 0.85 + vec3(0.02, 0.05, 0.04), 0.35);
    col = mix(nearRidgeCol, u_horizonColor, 0.14 + u_mist * 0.38);
  }

  if (rayDir.y < -0.001) {
    float t = -u_camPos.y / rayDir.y;
    if (t > 0.0 && t < 35.0) {
      vec2 hitXZ = u_camPos.xz + rayDir.xz * t;
      float distC = length(hitXZ);
      float patchVal = noise(hitXZ * 1.45) * 0.65 + noise(hitXZ * 4.8) * 0.35;
      float pathDist = abs(hitXZ.x - sin(hitXZ.y * 0.8) * 0.16);
      float isPath = smoothstep(0.42, 0.18, pathDist) * smoothstep(3.4, 2.2, abs(hitXZ.y));
      float qTex = u_paintMode > 0 ? patchVal : floor(clamp(patchVal + dither, 0.0, 1.0) * 4.0) / 4.0;
      vec3 meadow = mix(u_groundBottom, u_groundTop, qTex);
      vec3 trailCol = mix(u_groundBottom * 0.95, u_groundTop * 1.08 + vec3(0.07, 0.05, 0.02), 0.5);
      meadow = mix(meadow, trailCol, isPath * 0.42);

      if (u_snowAmount > 0.05) {
        if (patchVal + u_snowAmount * 0.58 > 0.74) {
          vec3 snowCol = vec3(0.92, 0.95, 1.0) * (0.42 + 0.58 * max(u_sunVisibility, u_moonVisibility * 0.7));
          meadow = mix(meadow, snowCol, u_snowAmount * 0.86);
        }
      }

      // Softer exterior atmospheric transition melting the garden meadow seamlessly into Blue Ridge mist
      float exteriorSoft = smoothstep(2.4, 9.2, distC) * 0.34;
      float distFog = clamp(
        smoothstep(2.9, 16.0, t) * 0.88 + exteriorSoft + u_mist * smoothstep(1.2, 8.2, t) * 0.62,
        0.0,
        0.96
      );
      col = mix(meadow, u_horizonColor, distFog);

      if (u_showGrid > 0.5) {
        col = applySiteGrid(col, hitXZ, distC, false);
      }
      col = applyHoverReticle(col, hitXZ);
    }
  }

  outColor = vec4(col, 1.0);
}`;

const TREE_VS = `#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in vec2 a_quad;
layout(location = 1) in vec3 a_pos;      // 3D x, y, z
layout(location = 2) in vec2 a_size;     // w, h
layout(location = 3) in vec4 a_meta;     // rot, kind, isSlice, speciesIdx
layout(location = 4) in vec4 a_sway;     // swayWeight, swayPhase, flutterFreq, shadeBias
layout(location = 5) in vec4 a_uvRect;   // u0, v0, u1, v1
layout(location = 6) in float a_growth;  // growthOrder 0..1

uniform vec2 u_pixelRes;
uniform float u_time;
uniform float u_wind;
uniform float u_gustImpulse;
uniform float u_canopyGrowth;
uniform float u_stackRelief;
uniform int u_paintMode;

uniform vec3 u_camPos;
uniform vec3 u_camRight;
uniform vec3 u_camUp;
uniform vec3 u_camForward;
uniform float u_focal;
uniform float u_camYaw;

uniform vec3 u_barkShadow[${SPECIES_COUNT}];
uniform vec3 u_barkLit[${SPECIES_COUNT}];
uniform vec3 u_leafShadow[${SPECIES_COUNT}];
uniform vec3 u_leafLit[${SPECIES_COUNT}];
uniform vec3 u_blossomShadow[${SPECIES_COUNT}];
uniform vec3 u_blossomLit[${SPECIES_COUNT}];
uniform vec3 u_scales[${SPECIES_COUNT}]; // leafScale, blossomScale, berryScale

uniform vec3 u_grassShadow;
uniform vec3 u_grassLit;

out vec2 v_uv;
out vec2 v_localUv;
out float v_kind;
out float v_dist;
out float v_shadeBias;
out float v_visible;
out vec3 v_shCol;
out vec3 v_litCol;
out float v_emissivePulse;
out float v_seed;

void main() {
  int sIdx = clamp(int(floor(a_meta.w + 0.5)), 0, ${SPECIES_COUNT - 1});
  float kind = a_meta.y;

  vec3 spScales = u_scales[sIdx];
  float leafScale = spScales.x;
  float blossomScale = spScales.y;
  float berryScale = spScales.z;

  float scaleMul = 1.0;
  float visible = 1.0;

  vec3 shCol = u_leafShadow[sIdx];
  vec3 litCol = u_leafLit[sIdx];

  if (abs(kind - 1.0) < 0.2) {
    shCol = u_barkShadow[sIdx];
    litCol = u_barkLit[sIdx];
  } else if (abs(kind - 2.0) < 0.2) {
    float g = clamp((u_canopyGrowth - a_growth * 0.82) / 0.18, 0.0, 1.0);
    scaleMul = leafScale * g;
    visible = step(0.05, scaleMul);
  } else if (abs(kind - 3.0) < 0.2) {
    shCol = u_blossomShadow[sIdx];
    litCol = u_blossomLit[sIdx];
    float g = clamp((u_canopyGrowth - a_growth * 0.82) / 0.18, 0.0, 1.0);
    scaleMul = blossomScale * g;
    visible = step(0.05, scaleMul);
  } else if (abs(kind - 4.0) < 0.2) {
    shCol = vec3(0.45, 0.06, 0.08);
    litCol = vec3(0.92, 0.16, 0.18);
    scaleMul = berryScale;
    visible = step(0.05, scaleMul);
  } else if (abs(kind - 5.0) < 0.2) {
    shCol = u_grassShadow;
    litCol = u_grassLit;
  } else if (abs(kind - 6.0) < 0.2) {
    float useBlossom = step(0.15, blossomScale);
    shCol = mix(u_leafShadow[sIdx], u_blossomShadow[sIdx], useBlossom);
    litCol = mix(u_leafLit[sIdx], u_blossomLit[sIdx], useBlossom);
    scaleMul = clamp(max(blossomScale * 0.85, (1.0 - u_canopyGrowth) * 1.1 + step(0.15, leafScale) * 0.65), 0.25, 1.0);
  } else if (abs(kind - 7.0) < 0.2) {
    shCol = vec3(0.96, 0.62, 0.16);
    litCol = vec3(1.0, 0.94, 0.62);
  } else if (abs(kind - 8.0) < 0.2) {
    // Painted PathSurface materials (0=flagstone, 1=gravel, 2=stepping, 3=mulch)
    if (sIdx == 0) {
      shCol = vec3(0.36, 0.39, 0.43);
      litCol = vec3(0.71, 0.73, 0.76);
    } else if (sIdx == 1) {
      shCol = vec3(0.58, 0.56, 0.52);
      litCol = vec3(0.89, 0.86, 0.81);
    } else if (sIdx == 2) {
      shCol = vec3(0.41, 0.41, 0.40);
      litCol = vec3(0.74, 0.73, 0.70);
    } else {
      shCol = vec3(0.29, 0.19, 0.12);
      litCol = vec3(0.56, 0.36, 0.23);
    }
  }

  // 3D Wind traveling gust wave
  float wave1 = sin(u_time * (1.0 + u_wind * 2.2) - a_pos.x * 1.4 + a_pos.z * 1.1);
  float wave2 = sin(u_time * (2.3 + u_wind * 3.8) - a_pos.x * 2.9 + a_sway.y);
  float windComb = wave1 * 0.65 + wave2 * 0.35;
  float swayAmt = a_sway.x;

  vec3 center3 = a_pos;
  // Sculpt vertical sprite-stacking relief dimensionality while anchoring ground layer at y=0
  float heightRelief = mix(1.0, 0.72 + u_stackRelief * 0.28, step(0.03, a_pos.y));
  center3.y *= heightRelief;
  float swayX = (u_wind * 0.065 + u_gustImpulse * 0.13) * swayAmt
              + windComb * (0.01 + u_wind * 0.048) * swayAmt;
  center3.x += swayX;
  center3.z += windComb * (0.006 + u_wind * 0.022) * swayAmt;
  center3.y -= abs(swayX) * 0.15 * swayAmt;

  // Center in camera view space
  vec3 rel = center3 - u_camPos;
  float vzCenter = dot(rel, u_camForward);
  if (vzCenter < 0.09 || visible < 0.5) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    v_visible = 0.0;
    return;
  }

  float aspect = u_pixelRes.x / max(1.0, u_pixelRes.y);
  float isSlice = a_meta.z;
  float isPath = step(7.5, kind);
  float oilBoost = u_paintMode > 0 ? mix(1.0, 1.11, step(0.5, kind) * (1.0 - isPath)) : 1.0;
  vec2 sz = a_size * scaleMul * oilBoost * mix(1.0, 0.88 + u_stackRelief * 0.12, step(0.5, kind) * (1.0 - isPath));

  vec3 cornerWorld;
  if (isSlice > 0.5) {
    // True 3D horizontal stacked slice in world XZ plane!
    float rAng = a_meta.x;
    float c = cos(rAng);
    float s = sin(rAng);
    vec2 local = a_quad * sz;
    vec2 rotXZ = vec2(local.x * c - local.y * s, local.x * s + local.y * c);
    // Keep ground shadows, ground litter & painted paths strictly flat on Y=0
    float isGroundFlat = step(abs(kind - 0.0), 0.2) + step(abs(kind - 6.0), 0.2) + step(abs(kind - 8.0), 0.2);
    float thickUp = isGroundFlat > 0.5 ? 0.0 : a_quad.y * sz.y * (0.24 * u_stackRelief);
    cornerWorld = center3 + vec3(rotXZ.x, 0.0, rotXZ.y) + u_camUp * thickUp;
  } else {
    // Billboarded pixel-art / world-pinned oil brushstroke foliage cluster facing camera
    float isFoliage = step(1.5, kind);
    float flutter = sin(u_time * a_sway.z * (0.8 + u_wind * 1.7) + a_sway.y)
                  * (0.025 + u_wind * 0.2) * isFoliage;
    float oilTilt = u_paintMode > 0 ? sin(a_sway.y * 3.7) * 0.18 * isFoliage : 0.0;
    float rAng = a_meta.x + flutter + oilTilt + swayX * 0.5 * swayAmt;
    float c = cos(rAng);
    float s = sin(rAng);
    vec2 local = a_quad * sz;
    vec2 rot = vec2(local.x * c - local.y * s, local.x * s + local.y * c);
    cornerWorld = center3 + u_camRight * rot.x + u_camUp * rot.y;
  }

  vec3 relC = cornerWorld - u_camPos;
  float vx = dot(relC, u_camRight);
  float vy = dot(relC, u_camUp);
  float vz = max(0.08, dot(relC, u_camForward));

  float proj = u_focal / vz;
  vec2 ndc = vec2((vx * proj) / aspect, vy * proj);

  // Snap to virtual pixel grid in Pixel Stack mode; leave sub-pixel smooth in 3D Oil Paint modes
  if (u_paintMode == 0) {
    vec2 halfRes = u_pixelRes * 0.5;
    ndc = floor(ndc * halfRes + 0.5) / halfRes;
  }

  // Perspective depth mapping (near=0.08, far=26.0)
  float nearP = 0.08;
  float farP = 26.0;
  float ndcZ = ((farP + nearP) / (farP - nearP)) - (2.0 * farP * nearP) / ((farP - nearP) * vz);
  gl_Position = vec4(ndc, clamp(ndcZ, -0.99, 0.99), 1.0);

  v_localUv = a_quad + 0.5;
  v_uv = mix(a_uvRect.xy, a_uvRect.zw, vec2(v_localUv.x, 1.0 - v_localUv.y));
  v_kind = kind;
  v_dist = vzCenter;
  v_shadeBias = a_sway.w;
  v_visible = visible;
  v_shCol = shCol;
  v_litCol = litCol;
  v_emissivePulse = 0.88 + 0.12 * sin(u_time * 4.5 + a_sway.y);
  v_seed = a_sway.y;
}`;

const TREE_FS = `#version 300 es
precision highp float;
precision highp int;

in vec2 v_uv;
in vec2 v_localUv;
in float v_kind;
in float v_dist;
in float v_shadeBias;
in float v_visible;
in vec3 v_shCol;
in vec3 v_litCol;
in float v_emissivePulse;
in float v_seed;

out vec4 outColor;

uniform sampler2D u_atlas;
uniform sampler2D u_oilAtlas;
uniform int u_paintMode;
uniform float u_impasto;
uniform vec3 u_horizonColor;
uniform vec2 u_sunDir2;
uniform vec3 u_sunLightTint;
uniform float u_ambientLevel;
uniform float u_sunWarmth;
uniform float u_snowAmount;
uniform float u_rainAmount;
uniform float u_mist;
uniform float u_backdropMode;

void main() {
  if (v_visible < 0.5) discard;
  bool isOil = u_paintMode > 0;
  vec4 tex = isOil ? texture(u_oilAtlas, v_uv) : texture(u_atlas, v_uv);
  if (tex.a < (isOil ? 0.34 : 0.5)) discard;

  bool isWhiteCircle = u_backdropMode < 0.5;
  bool isBlueprint = u_backdropMode > 1.5;

  // Ground contact shadow disc
  if (v_kind < 0.5) {
    vec3 shBase = isBlueprint
      ? vec3(0.03, 0.07, 0.14)
      : (isWhiteCircle ? vec3(0.18, 0.24, 0.17) : vec3(0.06, 0.09, 0.06));
    float fogS = (isWhiteCircle || isBlueprint) ? 0.0 : clamp(smoothstep(4.5, 16.0, v_dist), 0.0, 0.85);
    outColor = vec4(mix(shBase, u_horizonColor, fogS), 1.0);
    return;
  }

  float texBand = isOil ? tex.r : dot(tex.rgb, vec3(0.299, 0.587, 0.114));

  // Emissive warm cedar lantern & hearth fire glow
  if (abs(v_kind - 7.0) < 0.2) {
    float q = isOil ? clamp(texBand, 0.0, 1.0) : floor(clamp(texBand, 0.0, 1.0) * 3.99) / 3.0;
    vec3 glow = mix(v_shCol, v_litCol, q) * v_emissivePulse;
    float nightBoost = 1.0 + (1.0 - u_ambientLevel) * 0.45;
    outColor = vec4(min(vec3(1.0), glow * nightBoost), 1.0);
    return;
  }

  float sunAlign = dot(v_localUv - 0.5, u_sunDir2) * 0.42 + v_shadeBias * 0.28;
  float toneRaw = clamp(texBand + sunAlign, 0.0, 1.0);
  float amb = (isWhiteCircle || isBlueprint) ? max(0.66, u_ambientLevel) : u_ambientLevel;
  vec3 col;

  if (isOil) {
    // True 3D World-Pinned Oil Paint shading: smooth bristle pigment + impasto ridge catchlights
    float ridge = tex.g;
    float tempShift = (tex.b - 0.5) * 0.16 + sin(v_seed * 9.3) * 0.035;
    float toneSmooth = smoothstep(0.06, 0.94, toneRaw);
    vec3 coolShadow = clamp(v_shCol + vec3(-0.03, -0.01, 0.055), 0.0, 1.0);
    vec3 warmLit = clamp(v_litCol + vec3(0.04, 0.025, -0.025), 0.0, 1.0);
    col = mix(coolShadow, warmLit, toneSmooth);
    col += vec3(tempShift * 0.65, tempShift * 0.25, -tempShift * 0.55);
    col *= (amb + (1.0 - amb) * (0.28 + toneSmooth * 0.72));

    // Directional impasto bristle specular glint & dark oil groove shadow
    float bristleHighlight = pow(max(0.0, ridge), 2.1) * smoothstep(0.32, 0.95, toneRaw) * u_impasto;
    float bristleGroove = (1.0 - ridge) * u_impasto * 0.16;
    col = col * (1.0 - bristleGroove) + u_sunLightTint * bristleHighlight * (0.24 + u_sunWarmth * 0.22) * (1.0 - u_rainAmount * 0.55);
    // Subtle painterly pigment richness lift
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(lum), col, 1.08 + u_impasto * 0.08);
  } else {
    // Crisp 4-tone quantized pixel-art shading
    float toneQ = floor(toneRaw * 3.99) / 3.0;
    col = mix(v_shCol, v_litCol, toneQ);
    col *= (amb + (1.0 - amb) * toneQ * 0.72);
    col += u_sunLightTint * step(0.65, toneQ) * (0.14 + u_sunWarmth * 0.18) * (1.0 - u_rainAmount * 0.6);
  }

  // Subtle architectural blueprint luminous lift
  if (isBlueprint) {
    float bpTone = isOil ? toneRaw : floor(toneRaw * 3.99) / 3.0;
    col = mix(col, vec3(0.45, 0.78, 1.0) * (0.55 + 0.45 * bpTone), 0.26);
  }

  // Winter snow cap on upper sprite edges & paths
  if (u_snowAmount > 0.15 && ((v_localUv.y > 0.68 && texBand > 0.65 && v_kind < 5.5) || (v_kind > 7.5 && texBand > 0.72))) {
    col = mix(col, vec3(0.94, 0.97, 1.0) * max(0.45, amb), isOil ? smoothstep(0.2, 0.8, u_snowAmount) : step(0.45, u_snowAmount));
  }

  // Atmospheric distance mist (only in panoramic Blue Ridge mode)
  if (!isWhiteCircle && !isBlueprint) {
    float fogMix = clamp(smoothstep(3.6, 15.8, v_dist) + u_mist * smoothstep(1.4, 8.8, v_dist) * 0.65, 0.0, 0.88);
    col = mix(col, u_horizonColor, fogMix);
  }

  outColor = vec4(col, 1.0);
}`;

const PARTICLE_VS = `#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in vec2 a_quad;
layout(location = 1) in vec3 a_pPos;     // 3D x, y, z
layout(location = 2) in vec4 a_pSizeRot; // sizeX, sizeY, rot, alpha
layout(location = 3) in vec4 a_pUv;      // u0, v0, u1, v1
layout(location = 4) in vec3 a_pColor;   // r, g, b

uniform vec2 u_pixelRes;
uniform vec3 u_camPos;
uniform vec3 u_camRight;
uniform vec3 u_camUp;
uniform vec3 u_camForward;
uniform float u_focal;

out vec2 v_uv;
out vec3 v_color;
out float v_alpha;

void main() {
  vec3 rel = a_pPos - u_camPos;
  float vz = dot(rel, u_camForward);
  if (vz < 0.1 || a_pSizeRot.w <= 0.1) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    v_alpha = 0.0;
    return;
  }

  float c = cos(a_pSizeRot.z);
  float s = sin(a_pSizeRot.z);
  vec2 local = a_quad * a_pSizeRot.xy;
  vec2 rot = vec2(local.x * c - local.y * s, local.x * s + local.y * c);
  vec3 cornerW = a_pPos + u_camRight * rot.x + u_camUp * rot.y;

  vec3 relC = cornerW - u_camPos;
  float vx = dot(relC, u_camRight);
  float vy = dot(relC, u_camUp);
  float vzC = max(0.08, dot(relC, u_camForward));

  float aspect = u_pixelRes.x / max(1.0, u_pixelRes.y);
  float proj = u_focal / vzC;
  vec2 ndc = vec2((vx * proj) / aspect, vy * proj);
  vec2 halfRes = u_pixelRes * 0.5;
  ndc = floor(ndc * halfRes + 0.5) / halfRes;

  float nearP = 0.08;
  float farP = 26.0;
  float ndcZ = ((farP + nearP) / (farP - nearP)) - (2.0 * farP * nearP) / ((farP - nearP) * vzC);
  gl_Position = vec4(ndc, clamp(ndcZ, -0.99, 0.99), 1.0);

  vec2 uvLocal = a_quad + 0.5;
  v_uv = mix(a_pUv.xy, a_pUv.zw, vec2(uvLocal.x, 1.0 - uvLocal.y));
  v_color = a_pColor;
  v_alpha = a_pSizeRot.w;
}`;

const PARTICLE_FS = `#version 300 es
precision highp float;
precision highp int;

in vec2 v_uv;
in vec3 v_color;
in float v_alpha;

out vec4 outColor;
uniform sampler2D u_atlas;

void main() {
  if (v_alpha <= 0.1) discard;
  vec4 tex = texture(u_atlas, v_uv);
  if (tex.a < 0.5) discard;
  outColor = vec4(tex.rgb * v_color, 1.0);
}`;

const BLIT_VS = `#version 300 es
precision highp float;
precision highp int;
const vec2 POS[4] = vec2[4](
  vec2(-1.0, -1.0),
  vec2( 1.0, -1.0),
  vec2(-1.0,  1.0),
  vec2( 1.0,  1.0)
);
out vec2 v_uv;
void main() {
  vec2 p = POS[gl_VertexID];
  v_uv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const BLIT_FS = `#version 300 es
precision highp float;
precision highp int;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_pixelTex;
uniform sampler2D u_glyphAtlas;
uniform vec2 u_canvasRes;
uniform float u_dpr;
uniform float u_time;
uniform int u_filterStyle; // 0=natural, 1=ascii, 2=dots, 3=grain, 4=scan, 5=2d-oil
uniform int u_engineStyle; // 0..12 unified Paper Sky & Sylva visual engine style
uniform int u_paintMode;   // 0=pixel, 1=oil-3d, 2=living-canvas
uniform float u_impasto;   // 0..1
uniform int u_colorTint;   // 0=full, 1=mono, 2=gold, 3=blue
uniform float u_density;       // 0..1
uniform float u_glow;          // 0..1
uniform float u_glowThreshold; // 0.3..0.95
uniform float u_underImage;    // 0..0.6
uniform float u_exposure;      // -3..3 EV
uniform float u_contrast;      // 0.5..3.0
uniform float u_gamma;         // 0.3..3.0
uniform float u_detail;        // 0..3.0
uniform float u_invert;        // 0 or 1
uniform int u_motion;          // 0=none, 1=pulse, 2=shimmer, 3=reveal, 4=push
uniform float u_glyphCount;
uniform float u_shimmer;       // 0 or 1

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

vec3 applyToneBasic(vec3 c) {
  vec3 outC = c * exp2(u_exposure);
  outC = (outC - 0.5) * u_contrast + 0.5;
  outC = clamp(outC, 0.0, 1.0);
  outC = pow(max(outC, vec3(0.0001)), vec3(1.0 / max(0.15, u_gamma)));
  if (u_invert > 0.5) {
    outC = 1.0 - outC;
  }
  return clamp(outC, 0.0, 1.0);
}

vec3 sampleToneGraded(vec2 uv) {
  vec3 c = texture(u_pixelTex, uv).rgb;
  if (u_detail > 0.01) {
    vec2 px = (1.35 * u_dpr) / max(u_canvasRes, vec2(1.0));
    vec3 blur = (
      texture(u_pixelTex, clamp(uv + vec2(-px.x, -px.y), 0.002, 0.998)).rgb +
      texture(u_pixelTex, clamp(uv + vec2( 0.0,  -px.y), 0.002, 0.998)).rgb +
      texture(u_pixelTex, clamp(uv + vec2( px.x, -px.y), 0.002, 0.998)).rgb +
      texture(u_pixelTex, clamp(uv + vec2(-px.x,  0.0 ), 0.002, 0.998)).rgb +
      texture(u_pixelTex, clamp(uv + vec2( px.x,  0.0 ), 0.002, 0.998)).rgb +
      texture(u_pixelTex, clamp(uv + vec2(-px.x,  px.y), 0.002, 0.998)).rgb +
      texture(u_pixelTex, clamp(uv + vec2( 0.0,   px.y), 0.002, 0.998)).rgb +
      texture(u_pixelTex, clamp(uv + vec2( px.x,  px.y), 0.002, 0.998)).rgb
    ) * 0.125;
    c = clamp(c + (c - blur) * u_detail * 0.72, 0.0, 1.0);
  }
  return applyToneBasic(c);
}

vec3 gradeColor(vec3 col, float l, int tint) {
  if (tint == 1) {
    return vec3(l);
  }
  if (tint == 2) {
    return clamp(vec3(l * 1.12 + 0.08, l * 0.82, l * 0.35), 0.0, 1.0);
  }
  if (tint == 3) {
    return clamp(vec3(l * 0.35, l * 0.75, l * 1.12 + 0.08), 0.0, 1.0);
  }
  return col;
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

// Woven linen canvas warp/weft grain + gentle painterly tooth
float linenCanvasTooth(vec2 px) {
  float warp = sin(px.x * 1.55) * 0.5 + 0.5;
  float weft = sin(px.y * 1.55 + 0.8) * 0.5 + 0.5;
  float crossThread = sin((px.x + px.y) * 0.52) * 0.5 + 0.5;
  return (warp * 0.42 + weft * 0.42 + crossThread * 0.16) - 0.5;
}

// 4-quadrant Kuwahara variance-minimizing oil-paint filter
vec3 kuwaharaOil(vec2 uv, float stepPx) {
  vec2 texel = (stepPx / max(u_canvasRes, vec2(1.0))) * u_dpr;
  vec3 mean[4];
  vec3 sq[4];
  for (int q = 0; q < 4; q++) {
    mean[q] = vec3(0.0);
    sq[q] = vec3(0.0);
  }

  for (int j = -2; j <= 0; j++) {
    for (int i = -2; i <= 0; i++) {
      vec3 c0 = texture(u_pixelTex, clamp(uv + vec2(float(i), float(j)) * texel, 0.002, 0.998)).rgb;
      mean[0] += c0;
      sq[0] += c0 * c0;

      vec3 c1 = texture(u_pixelTex, clamp(uv + vec2(float(-i), float(j)) * texel, 0.002, 0.998)).rgb;
      mean[1] += c1;
      sq[1] += c1 * c1;

      vec3 c2 = texture(u_pixelTex, clamp(uv + vec2(float(i), float(-j)) * texel, 0.002, 0.998)).rgb;
      mean[2] += c2;
      sq[2] += c2 * c2;

      vec3 c3 = texture(u_pixelTex, clamp(uv + vec2(float(-i), float(-j)) * texel, 0.002, 0.998)).rgb;
      mean[3] += c3;
      sq[3] += c3 * c3;
    }
  }

  float minVar = 1e9;
  vec3 bestCol = texture(u_pixelTex, uv).rgb;
  for (int q = 0; q < 4; q++) {
    vec3 m = mean[q] / 9.0;
    vec3 v = abs(sq[q] / 9.0 - m * m);
    float totalVar = v.r + v.g + v.b;
    if (totalVar < minVar) {
      minVar = totalVar;
      bestCol = m;
    }
  }
  return bestCol;
}

vec3 sampleGlow(vec2 uv, float glowAmt, int tint) {
  if (glowAmt <= 0.01) return vec3(0.0);
  float threshLo = clamp(u_glowThreshold - 0.16, 0.05, 0.92);
  float threshHi = clamp(u_glowThreshold + 0.18, threshLo + 0.06, 1.0);
  vec2 texel = (1.0 / max(u_canvasRes, vec2(1.0))) * (3.5 + glowAmt * 9.5) * u_dpr;
  vec3 acc = vec3(0.0);
  float wSum = 0.0;
  for (int i = 0; i < 12; i++) {
    float ang = float(i) * 0.52359878;
    float ring = (i < 6) ? 1.0 : 2.1;
    vec2 dir = vec2(cos(ang), sin(ang)) * ring;
    vec3 s = applyToneBasic(texture(u_pixelTex, clamp(uv + dir * texel, 0.002, 0.998)).rgb);
    float sl = luma(s);
    float bright = smoothstep(threshLo, threshHi, sl);
    float w = (i < 6) ? 1.0 : 0.55;
    acc += gradeColor(s, sl, tint) * bright * w;
    wSum += w;
  }
  vec3 center = applyToneBasic(texture(u_pixelTex, uv).rgb);
  float cl = luma(center);
  acc += gradeColor(center, cl, tint) * smoothstep(threshLo, threshHi, cl) * 1.1;
  wSum += 1.1;
  float pulseWave = 0.84 + 0.24 * (0.5 + 0.5 * sin(u_time * 2.4));
  float pulse = (u_motion == 1)
    ? pulseWave
    : mix(1.0, 0.91 + 0.09 * sin(u_time * 2.2), u_shimmer);
  return (acc / wSum) * glowAmt * 1.24 * pulse;
}

${SHARED_VISUAL_STYLE_GLSL}

float sampleSobelEdge(vec2 uv, vec2 pxStep) {
  vec2 d = pxStep / max(u_canvasRes, vec2(1.0));
  float tl = luma(texture(u_pixelTex, clamp(uv + vec2(-d.x,  d.y), 0.002, 0.998)).rgb);
  float t  = luma(texture(u_pixelTex, clamp(uv + vec2( 0.0,  d.y), 0.002, 0.998)).rgb);
  float tr = luma(texture(u_pixelTex, clamp(uv + vec2( d.x,  d.y), 0.002, 0.998)).rgb);
  float l  = luma(texture(u_pixelTex, clamp(uv + vec2(-d.x,  0.0), 0.002, 0.998)).rgb);
  float r  = luma(texture(u_pixelTex, clamp(uv + vec2( d.x,  0.0), 0.002, 0.998)).rgb);
  float bl = luma(texture(u_pixelTex, clamp(uv + vec2(-d.x, -d.y), 0.002, 0.998)).rgb);
  float b  = luma(texture(u_pixelTex, clamp(uv + vec2( 0.0, -d.y), 0.002, 0.998)).rgb);
  float br = luma(texture(u_pixelTex, clamp(uv + vec2( d.x, -d.y), 0.002, 0.998)).rgb);
  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
  return clamp(sqrt(gx * gx + gy * gy) * 1.45, 0.0, 1.0);
}

vec3 applySylvaEngineStyle(vec3 baseCol, vec2 uv, vec2 fragPx) {
  if (u_engineStyle == 0) return baseCol;
  vec2 cssPx = fragPx / max(1.0, u_dpr);
  float dither = bayer4x4(ivec2(floor(cssPx))) - 0.5;
  float edge = sampleSobelEdge(uv, vec2(1.6 * u_dpr));
  float l = luma(baseCol);

  // Mode 1: Halftone No.03 (30° rotated dot screen + warm newsprint cream + coral ink lift)
  if (u_engineStyle == 1) {
    vec3 paperCream = vec3(0.96, 0.94, 0.89);
    vec3 risoInk = vec3(0.16, 0.15, 0.19);
    vec2 rotUv = mat2(0.866, -0.5, 0.5, 0.866) * (cssPx * 0.34);
    float dotDist = length(fract(rotUv) - 0.5);
    float dotMask = smoothstep(0.08, 0.46, dotDist + (l - 0.54) * 0.72);
    vec3 tinted = mix(mix(risoInk, baseCol * 0.85, 0.52), mix(paperCream, baseCol, 0.48), dotMask);
    return clamp(mix(tinted, risoInk, smoothstep(0.38, 0.68, edge) * 0.62), 0.0, 1.0);
  }

  // Mode 2: Ink Vellum (archival paper + diagonal graphite hatching + crimson pigment preserve)
  if (u_engineStyle == 2) {
    vec3 vellum = vec3(0.945, 0.935, 0.905);
    vec3 graphite = vec3(0.16, 0.17, 0.20);
    float hatch = step(0.45, fract((cssPx.x + cssPx.y) * 0.22));
    float tone = smoothstep(0.22, 0.88, l + hatch * 0.08);
    vec3 inkCol = mix(graphite, vellum, tone);
    float isWarmAccent = smoothstep(0.18, 0.36, baseCol.r - max(baseCol.g, baseCol.b));
    inkCol = mix(inkCol, baseCol, isWarmAccent * 0.75);
    return clamp(mix(inkCol, graphite, smoothstep(0.30, 0.60, edge) * 0.82), 0.0, 1.0);
  }

  // Mode 3: 3D Oil Impasto (warm gilded glaze + subtle painterly brushstroke warmth)
  if (u_engineStyle == 3) {
    float stroke = sin(cssPx.x * 0.12 + sin(cssPx.y * 0.07) * 2.5) * 0.03;
    vec3 warmOil = pow(clamp(baseCol + vec3(0.045, 0.02, -0.025) + stroke, 0.0, 1.0), vec3(0.93));
    return clamp(mix(vec3(luma(warmOil)), warmOil, 1.12), 0.0, 1.0);
  }

  // Mode 4: Cyanotype Blueprint (Prussian cobalt + white drafting grid + luminous contours)
  if (u_engineStyle == 4) {
    vec3 bpDeep = vec3(0.05, 0.14, 0.36);
    vec3 bpMid = vec3(0.12, 0.32, 0.62);
    vec3 bpLine = vec3(0.80, 0.93, 1.0);
    vec3 bp = mix(bpDeep, bpMid, smoothstep(0.22, 0.92, l));
    vec2 grid = abs(fract(cssPx / 36.0 - 0.5) - 0.5) / 0.035;
    float gLine = 1.0 - min(min(grid.x, grid.y), 1.0);
    return clamp(mix(bp, bpLine, clamp(gLine * 0.14 + smoothstep(0.24, 0.56, edge) * 0.82, 0.0, 1.0)), 0.0, 1.0);
  }

  // Mode 5: Adaptive Two-Scale Mondrian De Stijl (refines cells on high-contrast silhouettes!)
  if (u_engineStyle == 5) {
    float coarseStep = 44.0 * u_dpr;
    vec2 warped = vec2(
      fragPx.x + sin(floor(fragPx.y / (coarseStep * 1.35)) * 2.1) * (coarseStep * 0.32),
      fragPx.y + cos(floor(fragPx.x / (coarseStep * 1.55)) * 1.7) * (coarseStep * 0.28)
    );
    vec2 cellSize = vec2(coarseStep * 1.18, coarseStep * 0.92);
    vec2 coarseId = floor(warped / cellSize);
    vec2 coarseCenterUv = clamp(((coarseId + 0.5) * cellSize) / max(u_canvasRes, vec2(1.0)), 0.002, 0.998);
    // Measure local silhouette contrast to decide whether to subdivide into crisp foreground panes
    float localEdge = max(edge, sampleSobelEdge(coarseCenterUv, vec2(4.0 * u_dpr)));
    bool refine = localEdge > 0.24;
    vec2 activeSize = refine ? (cellSize * 0.5) : cellSize;
    vec2 activeId = floor(warped / activeSize);
    vec2 activeF = fract(warped / activeSize);
    vec2 sampleUv = clamp(((activeId + 0.5) * activeSize) / max(u_canvasRes, vec2(1.0)), 0.002, 0.998);
    vec3 paneSample = mix(texture(u_pixelTex, sampleUv).rgb, baseCol, refine ? 0.42 : 0.14);
    float thickX = refine ? 0.075 : 0.048;
    float thickY = refine ? 0.085 : 0.056;
    float mullion = max(
      step(activeF.x, thickX) + step(1.0 - thickX, activeF.x),
      step(activeF.y, thickY) + step(1.0 - thickY, activeF.y)
    );
    vec3 blockCol = snapMondrianColor(paneSample, activeId);
    float outline = clamp(mullion + smoothstep(0.42, 0.68, edge), 0.0, 1.0);
    return mix(blockCol, vec3(0.06, 0.07, 0.09), outline * 0.94);
  }

  // Mode 10: Risograph Two-Tone with true 2px dual-drum physical misregistration
  if (u_engineStyle == 10) {
    vec2 shift = (vec2(2.0, -1.5) * u_dpr) / max(u_canvasRes, vec2(1.0));
    vec3 drumA = texture(u_pixelTex, clamp(uv + shift, 0.002, 0.998)).rgb;
    vec3 drumB = texture(u_pixelTex, clamp(uv - shift, 0.002, 0.998)).rgb;
    vec3 paper = vec3(0.965, 0.941, 0.882);
    vec3 coral = vec3(1.000, 0.353, 0.373);
    vec3 teal  = vec3(0.059, 0.420, 0.451);
    float lA = luma(drumA);
    float lB = luma(drumB);
    float warmA = clamp((drumA.r - drumA.b) * 1.45 + 0.48, 0.0, 1.0);
    float coolB = clamp((drumB.b + drumB.g * 0.6 - drumB.r) * 1.2 + 0.52, 0.0, 1.0);
    vec2 rotA = mat2(0.866, -0.5, 0.5, 0.866) * (cssPx * 0.36);
    vec2 rotB = mat2(0.5, 0.866, -0.866, 0.5) * ((cssPx + vec2(2.0, -1.5)) * 0.36);
    float grainA = length(fract(rotA) - 0.5);
    float grainB = length(fract(rotB) - 0.5);
    float coralInk = clamp((1.0 - lA * 0.92) * (0.35 + warmA * 0.85) + (0.34 - grainA) * 0.32, 0.0, 1.0);
    float tealInk  = clamp((1.0 - lB * 0.92) * (0.35 + coolB * 0.82) + (0.34 - grainB) * 0.32 + edge * 0.48, 0.0, 1.0);
    return clamp(paper * mix(vec3(1.0), coral, coralInk * 0.88) * mix(vec3(1.0), teal, tealInk * 0.90), 0.0, 1.0);
  }

  // Modes 6 (Game Boy) & 9 (PICO-8) snap to crisp retro handheld/fantasy-console pixel blocks
  vec3 srcCol = baseCol;
  vec2 evalPx = cssPx;
  if (u_engineStyle == 6 || u_engineStyle == 9) {
    float snapPx = (u_engineStyle == 9 ? 2.6 : 2.2) * u_dpr;
    vec2 snappedUv = clamp((floor(fragPx / snapPx) + 0.5) * snapPx / max(u_canvasRes, vec2(1.0)), 0.002, 0.998);
    srcCol = texture(u_pixelTex, snappedUv).rgb;
    evalPx = floor(fragPx / snapPx);
    dither = bayer4x4(ivec2(evalPx)) - 0.5;
  }

  return applyExtendedVisualStyle(srcCol, evalPx, dither, edge, 0.0, u_engineStyle);
}

void main() {
  vec2 baseUv = v_uv;
  if (u_motion == 4) {
    // Push: gentle optical breathing zoom toward frame center
    float pushScale = 1.0 - 0.05 * (0.5 - 0.5 * cos(u_time * 0.9));
    baseUv = clamp((baseUv - 0.5) * pushScale + 0.5, 0.001, 0.999);
  }
  vec2 fragPx = baseUv * u_canvasRes;
  float shimmerActive = (u_shimmer > 0.5 || u_motion == 2) ? 1.0 : 0.0;
  float revealWave = (u_motion == 3)
    ? smoothstep(0.0, 0.22, fract(u_time * 0.24) * 1.25 - baseUv.x)
    : 1.0;

  if (u_filterStyle == 0) {
    vec3 baseCol = sampleToneGraded(baseUv);
    if (u_paintMode == 2) {
      // Hybrid Living Canvas: 3D world-pinned oil strokes + woven linen canvas glaze & directional impasto sheen
      float weave = linenCanvasTooth(fragPx / max(1.0, u_dpr));
      vec2 eps = vec2(1.5, 1.5) * u_dpr / max(u_canvasRes, vec2(1.0));
      float lC = luma(baseCol);
      float lR = luma(texture(u_pixelTex, clamp(baseUv + vec2(eps.x, 0.0), 0.002, 0.998)).rgb);
      float lU = luma(texture(u_pixelTex, clamp(baseUv + vec2(0.0, eps.y), 0.002, 0.998)).rgb);
      float edgeSheen = clamp((lC - lR) + (lC - lU), -0.35, 0.35);
      baseCol += vec3(weave * (0.048 + u_impasto * 0.045));
      baseCol += vec3(1.0, 0.96, 0.88) * max(0.0, edgeSheen) * (0.18 + u_impasto * 0.32);
      baseCol -= vec3(0.04, 0.03, 0.02) * max(0.0, -edgeSheen) * (0.14 + u_impasto * 0.22);
    }
    baseCol = applySylvaEngineStyle(baseCol, baseUv, fragPx);
    if (u_colorTint != 0) {
      baseCol = gradeColor(baseCol, luma(baseCol), u_colorTint);
    }
    if (u_glow > 0.01) {
      vec3 glow = sampleGlow(baseUv, u_glow * 0.65, u_colorTint);
      baseCol = 1.0 - (1.0 - clamp(baseCol, 0.0, 1.0)) * (1.0 - clamp(glow, 0.0, 1.0));
    }
    if (u_motion == 3) {
      baseCol *= mix(0.28, 1.0, revealWave);
    }
    outColor = vec4(clamp(baseCol, 0.0, 1.0), 1.0);
    return;
  }

  if (u_filterStyle == 5) {
    // 2D Oil Paint Filter: Kuwahara brushstroke smoothing + warm linen weave + impasto edge glint
    float brushStep = 3.2 - u_density * 1.9;
    vec3 oilCol = applyToneBasic(kuwaharaOil(baseUv, max(0.9, brushStep)));
    if (u_detail > 0.01) {
      vec3 sharpRef = sampleToneGraded(baseUv);
      oilCol = clamp(mix(oilCol, sharpRef, min(0.45, u_detail * 0.14)), 0.0, 1.0);
    }
    if (u_engineStyle != 0) {
      oilCol = applySylvaEngineStyle(oilCol, baseUv, fragPx);
    }
    float oilL = luma(oilCol);
    oilCol = gradeColor(oilCol, oilL, u_colorTint);
    // Lift painterly chroma subtly in full color mode
    if (u_colorTint == 0) {
      oilCol = mix(vec3(oilL), oilCol, 1.14);
    }
    float weave = linenCanvasTooth(fragPx / max(1.0, u_dpr));
    vec2 eps = vec2(1.8, 1.8) * u_dpr / max(u_canvasRes, vec2(1.0));
    float gradX = luma(texture(u_pixelTex, clamp(baseUv + vec2(eps.x, 0.0), 0.002, 0.998)).rgb) - oilL;
    float gradY = luma(texture(u_pixelTex, clamp(baseUv + vec2(0.0, eps.y), 0.002, 0.998)).rgb) - oilL;
    float sheen = clamp(-(gradX + gradY), -0.3, 0.3);
    oilCol += vec3(weave * (0.045 + u_impasto * 0.045));
    oilCol += vec3(1.0, 0.97, 0.9) * max(0.0, sheen) * (0.2 + u_impasto * 0.32);
    vec3 glow = sampleGlow(baseUv, u_glow * 0.58, u_colorTint);
    oilCol = 1.0 - (1.0 - clamp(oilCol, 0.0, 1.0)) * (1.0 - clamp(glow, 0.0, 1.0));
    if (u_motion == 3) {
      oilCol *= mix(0.28, 1.0, revealWave);
    }
    outColor = vec4(clamp(oilCol, 0.0, 1.0), 1.0);
    return;
  }

  float cellPx = max(4.0, (17.0 - u_density * 11.5) * u_dpr);
  vec2 cellIdx = floor(fragPx / cellPx);
  vec2 localUv = fract(fragPx / cellPx);
  vec2 cellCenterUv = clamp(((cellIdx + 0.5) * cellPx) / max(u_canvasRes, vec2(1.0)), 0.001, 0.999);

  vec3 src = sampleToneGraded(cellCenterUv);
  if (u_engineStyle != 0) {
    src = applySylvaEngineStyle(src, cellCenterUv, (cellIdx + 0.5) * cellPx);
  }
  vec3 underSrc = sampleToneGraded(baseUv);
  if (u_engineStyle != 0) {
    underSrc = applySylvaEngineStyle(underSrc, baseUv, fragPx);
  }
  // Crisp botanical contrast & readability boost inspired by Glyph Light
  float rawL = luma(src);
  float adjL = clamp((rawL - 0.5) * 1.18 + 0.52, 0.0, 1.0);
  if (u_motion == 2) {
    float wave = sin(u_time * 5.2 + hash21(cellIdx) * 6.2831);
    adjL = clamp(adjL + wave * 0.075, 0.0, 1.0);
  }
  vec3 graded = gradeColor(src, adjL, u_colorTint);
  vec3 gradedUnder = gradeColor(underSrc, luma(underSrc), u_colorTint);

  // Subtle dark ink bed + user-adjustable image-under-glyphs layer for silhouette legibility
  vec3 inkBed = vec3(0.028, 0.031, 0.039);
  vec3 bg = mix(inkBed, gradedUnder, clamp(u_underImage, 0.0, 0.72));
  vec3 col = bg;

  if (u_filterStyle == 1) {
    // ASCII Glyph Ramp (ink-sorted character atlas)
    float count = max(2.0, u_glyphCount);
    float gIdx = floor(adjL * (count - 1.0) + 0.5);
    float atlasU = (gIdx + clamp(localUv.x, 0.02, 0.98)) / count;
    float atlasV = 1.0 - clamp(localUv.y, 0.02, 0.98);
    float glyphAlpha = texture(u_glyphAtlas, vec2(atlasU, atlasV)).a * revealWave;
    col = mix(bg, graded * 1.14, glyphAlpha);
  } else if (u_filterStyle == 2) {
    // 4x4 Bayer Ordered-Dither Dot Matrix
    float threshold = bayer4x4(ivec2(cellIdx));
    bool lit = adjL > threshold;
    float halfSz = lit ? 0.39 : 0.21;
    vec2 d = abs(localUv - 0.5);
    float inSquare = step(max(d.x, d.y), halfSz) * revealWave;
    vec3 dotCol = lit ? min(vec3(1.0), graded * 1.18) : graded * 0.28;
    col = mix(bg, dotCol, inSquare);
  } else if (u_filterStyle == 3) {
    // Stochastic Film Grain Specks (with optional animated shimmer)
    float tSeed = shimmerActive > 0.5 ? floor(u_time * 12.0) * 0.37 : 0.0;
    // Subdivide grain slightly finer than ASCII for crisp photographic texture
    vec2 gCell = floor(fragPx / max(2.0, cellPx * 0.45));
    vec2 gCenterUv = clamp(((gCell + 0.5) * max(2.0, cellPx * 0.45)) / max(u_canvasRes, vec2(1.0)), 0.001, 0.999);
    vec3 gSrc = sampleToneGraded(gCenterUv);
    float gL = clamp((luma(gSrc) - 0.5) * 1.16 + 0.52, 0.0, 1.0);
    vec3 gCol = gradeColor(gSrc, gL, u_colorTint);
    float rnd = hash21(gCell + vec2(tSeed, tSeed * 1.7));
    float lit = step(rnd * 0.94, gL) * revealWave;
    col = mix(bg + gCol * 0.12, min(vec3(1.0), gCol * 1.14), lit);
  } else if (u_filterStyle == 4) {
    // Luminance-Weighted Horizontal Scanlines
    float halfBar = clamp(0.07 + adjL * 0.35, 0.06, 0.43);
    float inBar = smoothstep(halfBar + 0.04, halfBar - 0.03, abs(localUv.y - 0.5));
    float dashGap = step(0.06, localUv.x) * step(localUv.x, 0.94);
    col = mix(bg, min(vec3(1.0), graded * 1.12), inBar * dashGap * revealWave);
  }

  // Screen-blended atmospheric bloom glow
  vec3 glow = sampleGlow(baseUv, u_glow, u_colorTint);
  col = 1.0 - (1.0 - clamp(col, 0.0, 1.0)) * (1.0 - clamp(glow, 0.0, 1.0));
  outColor = vec4(col, 1.0);
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? 'Shader compile error';
    gl.deleteShader(shader);
    throw new Error(info);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog) ?? 'Program link error';
    gl.deleteProgram(prog);
    throw new Error(info);
  }
  return prog;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
}

const rgb = (r: number, g: number, b: number): RGB => ({
  r: r / 255,
  g: g / 255,
  b: b / 255,
});

export interface DayAtmosphere {
  skyTop: RGB;
  skyMid: RGB;
  horizon: RGB;
  mountain: RGB;
  sunColor: RGB;
  sunDir3: [number, number, number];
  sunDir2: [number, number];
  sunVis: number;
  moonVis: number;
  starVis: number;
  ambient: number;
  sunWarmth: number;
}

export function evaluateDayAtmosphere(hours: number): DayAtmosphere {
  const h = ((hours % 24) + 24) % 24;
  const stops = [
    { h: 0.0, skyTop: rgb(12, 18, 40), skyMid: rgb(24, 36, 70), horizon: rgb(38, 54, 92), mountain: rgb(26, 38, 66), sunColor: rgb(184, 204, 240), ambient: 0.36, sunWarmth: 0.0 },
    { h: 5.5, skyTop: rgb(42, 58, 102), skyMid: rgb(138, 108, 144), horizon: rgb(246, 174, 134), mountain: rgb(92, 82, 114), sunColor: rgb(255, 184, 118), ambient: 0.64, sunWarmth: 0.72 },
    { h: 9.0, skyTop: rgb(68, 138, 208), skyMid: rgb(142, 192, 232), horizon: rgb(222, 236, 246), mountain: rgb(92, 126, 160), sunColor: rgb(255, 246, 214), ambient: 0.88, sunWarmth: 0.24 },
    { h: 13.0, skyTop: rgb(56, 128, 204), skyMid: rgb(128, 186, 234), horizon: rgb(218, 234, 246), mountain: rgb(84, 120, 156), sunColor: rgb(255, 250, 234), ambient: 0.98, sunWarmth: 0.12 },
    { h: 17.6, skyTop: rgb(60, 90, 148), skyMid: rgb(184, 136, 134), horizon: rgb(248, 186, 118), mountain: rgb(98, 86, 112), sunColor: rgb(255, 192, 102), ambient: 0.78, sunWarmth: 0.86 },
    { h: 19.6, skyTop: rgb(24, 32, 70), skyMid: rgb(78, 60, 108), horizon: rgb(158, 100, 114), mountain: rgb(48, 46, 80), sunColor: rgb(238, 134, 114), ambient: 0.48, sunWarmth: 0.42 },
    { h: 22.0, skyTop: rgb(12, 18, 40), skyMid: rgb(24, 36, 70), horizon: rgb(38, 54, 92), mountain: rgb(26, 38, 66), sunColor: rgb(184, 204, 240), ambient: 0.37, sunWarmth: 0.0 },
    { h: 24.0, skyTop: rgb(12, 18, 40), skyMid: rgb(24, 36, 70), horizon: rgb(38, 54, 92), mountain: rgb(26, 38, 66), sunColor: rgb(184, 204, 240), ambient: 0.36, sunWarmth: 0.0 },
  ];

  let idx = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    if (h >= stops[i].h && h <= stops[i + 1].h) {
      idx = i;
      break;
    }
  }
  const a = stops[idx];
  const b = stops[idx + 1];
  const t = (h - a.h) / Math.max(0.001, b.h - a.h);
  const st = t * t * (3 - 2 * t);

  const dayFrac = (h - 5.5) / 13.75;
  const isDay = dayFrac >= -0.08 && dayFrac <= 1.08;
  const sunAngle = dayFrac * Math.PI;
  const sunVis = isDay
    ? Math.max(0, Math.min(1, Math.sin(Math.max(0, Math.min(1, dayFrac)) * Math.PI) * 2.2))
    : 0;

  const nightFrac = h >= 19.0 ? (h - 19.0) / 10.5 : (h + 5.0) / 10.5;
  const moonVis = Math.max(0, 1 - sunVis * 1.6) * 0.95;
  const starVis = Math.max(0, 1 - sunVis * 2.4) * 0.95;
  const celAngle = sunVis > 0.05 ? sunAngle : nightFrac * Math.PI;

  const sx = -Math.cos(celAngle) * 0.85;
  const sy = Math.max(0.06, Math.sin(celAngle) * 0.85);
  const sz = -0.62;
  const len = Math.hypot(sx, sy, sz) || 1;

  return {
    skyTop: lerpRGB(a.skyTop, b.skyTop, st),
    skyMid: lerpRGB(a.skyMid, b.skyMid, st),
    horizon: lerpRGB(a.horizon, b.horizon, st),
    mountain: lerpRGB(a.mountain, b.mountain, st),
    sunColor: lerpRGB(a.sunColor, b.sunColor, st),
    sunDir3: [sx / len, sy / len, sz / len],
    sunDir2: [sx / len, Math.max(0.32, sy / len)],
    sunVis,
    moonVis,
    starVis,
    ambient: lerp(a.ambient, b.ambient, st),
    sunWarmth: lerp(a.sunWarmth, b.sunWarmth, st),
  };
}

export function evaluateMeadowColors(season: number, ambient: number): { top: RGB; bottom: RGB } {
  const s = ((season % 4) + 4) % 4;
  const stops = [
    { pos: 0.0, top: rgb(98, 142, 68), bot: rgb(58, 92, 42) },
    { pos: 0.7, top: rgb(82, 134, 64), bot: rgb(48, 84, 40) },
    { pos: 1.5, top: rgb(66, 118, 56), bot: rgb(38, 74, 36) },
    { pos: 2.5, top: rgb(146, 122, 58), bot: rgb(94, 74, 38) },
    { pos: 3.3, top: rgb(104, 98, 76), bot: rgb(66, 62, 50) },
    { pos: 4.0, top: rgb(98, 142, 68), bot: rgb(58, 92, 42) },
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
  const t = (s - a.pos) / Math.max(0.001, b.pos - a.pos);
  const top = lerpRGB(a.top, b.top, t);
  const bottom = lerpRGB(a.bot, b.bot, t);
  const dim = 0.28 + ambient * 0.72;
  return {
    top: { r: top.r * dim, g: top.g * dim, b: top.b * dim },
    bottom: { r: bottom.r * dim, g: bottom.g * dim, b: bottom.b * dim },
  };
}

export class WebGLTreeEngine implements SanctuaryRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private atlasTex: WebGLTexture | null = null;
  private oilAtlasTex: WebGLTexture | null = null;
  private glyphAtlasTex: WebGLTexture | null = null;
  private glyphAtlasCount = 10;
  private loadedGlyphAtlasKey: string | null = null;
  private customBackdropTex: WebGLTexture | null = null;
  private customBackdropVersion = -1;
  private skyProg!: WebGLProgram;
  private treeProg!: WebGLProgram;
  private particleProg!: WebGLProgram;
  private blitProg!: WebGLProgram;

  private pixelFbo!: WebGLFramebuffer;
  private pixelColorTex!: WebGLTexture;
  private pixelDepthRb!: WebGLRenderbuffer;
  private pixelW = 512;
  private pixelH = 288;

  private quadVbo!: WebGLBuffer;
  private skyVao!: WebGLVertexArrayObject;
  private treeVao!: WebGLVertexArrayObject;
  private treeInstanceVbo!: WebGLBuffer;
  private treeInstanceCount = 0;

  private particleVao!: WebGLVertexArrayObject;
  private particleInstanceVbo!: WebGLBuffer;
  private particleData = new Float32Array(MAX_PARTICLES * PARTICLE_STRIDE_FLOATS);
  private particles: Particle[] = [];
  private activeParticleCount = 0;

  // Flat uniform arrays for all 9 species
  private uBarkShadow = new Float32Array(SPECIES_COUNT * 3);
  private uBarkLit = new Float32Array(SPECIES_COUNT * 3);
  private uLeafShadow = new Float32Array(SPECIES_COUNT * 3);
  private uLeafLit = new Float32Array(SPECIES_COUNT * 3);
  private uBlossomShadow = new Float32Array(SPECIES_COUNT * 3);
  private uBlossomLit = new Float32Array(SPECIES_COUNT * 3);
  private uScales = new Float32Array(SPECIES_COUNT * 3);

  private emitters: CanopyEmitter[] = [];
  private lastSceneKey = '';

  private state: SceneSimulationState;
  private callbacks: EngineCallbacks;
  private rafId = 0;
  private lastTimestamp = 0;
  private elapsedTime = 0;
  private gustImpulse = 0;
  private spawnAccum = 0;
  private weatherAccum = 0;
  private fireflyAccum = 0;

  // Unified Camera State: Orbit Designer, Top-Down Plan BIM, & First-Person POV!
  private orbitYaw = 0.28;
  private targetOrbitYaw = 0.28;
  private orbitPitch = 0.34;
  private targetOrbitPitch = 0.34;
  private orbitDist = 3.45;
  private targetOrbitDist = 3.45;

  // Top-Down Plan View state
  private planBlend = 0; // 0 = 3D perspective, 1 = top-down architectural plan
  private planHeight = 6.2;
  private targetPlanHeight = 6.2;
  private planPanX = 0;
  private planPanZ = 0;
  private targetPlanPanX = 0;
  private targetPlanPanZ = 0;

  // First-Person POV state
  private fpX = 0;
  private fpZ = 2.35;
  private fpYaw = 0; // 0 looks straight toward -Z
  private targetFpYaw = 0;
  private fpPitch = 0.08;
  private targetFpPitch = 0.08;
  private walkPhase = 0;
  private fpBlend = 0; // 0 = Orbit Designer, 1 = First-Person POV

  // Current interpolated camera basis for raycasting & rendering
  private curCamPos: Vec3 = { x: 0, y: 1.2, z: 3.1 };
  private curCamRight: Vec3 = { x: 1, y: 0, z: 0 };
  private curCamUp: Vec3 = { x: 0, y: 1, z: 0 };
  private curCamForward: Vec3 = { x: 0, y: -0.25, z: -1 };
  private curFocal = 1.95;

  // Keyboard & virtual walk pad input
  private keys = new Set<string>();
  private virtualMove = { forward: 0, strafe: 0, turn: 0 };

  // Canopy growth (Shake / Grow back)
  private canopyGrowth = 1.0;
  private targetCanopyGrowth = 1.0;

  // Pointer, path painting & ground reticle state
  private isDragging = false;
  private isPaintingPath = false;
  private lastPathStampXZ: [number, number] | null = null;
  private dragMoved = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private hoverGroundXZ: [number, number] = [0, 0];
  private hoverGroundValid = false;

  private contextLost = false;

  constructor(
    canvas: HTMLCanvasElement,
    initialState: SceneSimulationState,
    callbacks: EngineCallbacks = {},
  ) {
    this.canvas = canvas;
    this.state = { ...initialState };
    this.callbacks = callbacks;
    this.fpX = initialState.entrance.x;
    this.fpZ = initialState.entrance.z;
    this.fpYaw = initialState.entrance.yaw;
    this.targetFpYaw = initialState.entrance.yaw;

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      throw new Error('WebGL2 not supported');
    }
    this.gl = gl;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        kind: 'leaf',
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        size: 0.03,
        rot: 0,
        spin: 0,
        spinSpeed: 1,
        phase: 0,
        age: 0,
        life: 5,
        settled: false,
        tile: 20,
        r: 1,
        g: 1,
        b: 1,
        alpha: 1,
      });
    }

    this.initGL();
    this.rebuildSpaceGeometry(
      initialState.placedItems,
      initialState.pathNodes,
      initialState.bimLayers,
    );
    this.attachEvents();
    this.resize();
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  private initGL() {
    const gl = this.gl;
    this.atlasTex = createBotanicalAtlas(gl);
    this.oilAtlasTex = createOilBristleAtlas(gl);
    this.loadedGlyphAtlasKey = null;
    this.ensureGlyphAtlas(this.state.visualFilter.glyphSet, this.state.visualFilter.customGlyphs);
    this.skyProg = createProgram(gl, SKY_VS, SKY_FS);
    this.treeProg = createProgram(gl, TREE_VS, TREE_FS);
    this.particleProg = createProgram(gl, PARTICLE_VS, PARTICLE_FS);
    this.blitProg = createProgram(gl, BLIT_VS, BLIT_FS);

    this.pixelFbo = gl.createFramebuffer()!;
    this.pixelColorTex = gl.createTexture()!;
    this.pixelDepthRb = gl.createRenderbuffer()!;
    this.allocatePixelTarget(512, 288);

    const quadVerts = new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]);
    this.quadVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    this.skyVao = gl.createVertexArray()!;

    // Tree VAO (18 floats per instance)
    this.treeVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.treeVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.treeInstanceVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.treeInstanceVbo);
    const treeStride = 18 * 4;
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, treeStride, 0);
    gl.vertexAttribDivisor(1, 1);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, treeStride, 3 * 4);
    gl.vertexAttribDivisor(2, 1);

    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, treeStride, 5 * 4);
    gl.vertexAttribDivisor(3, 1);

    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, treeStride, 9 * 4);
    gl.vertexAttribDivisor(4, 1);

    gl.enableVertexAttribArray(5);
    gl.vertexAttribPointer(5, 4, gl.FLOAT, false, treeStride, 13 * 4);
    gl.vertexAttribDivisor(5, 1);

    gl.enableVertexAttribArray(6);
    gl.vertexAttribPointer(6, 1, gl.FLOAT, false, treeStride, 17 * 4);
    gl.vertexAttribDivisor(6, 1);

    // Particle VAO
    this.particleVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.particleVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.particleInstanceVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleInstanceVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.particleData.byteLength, gl.DYNAMIC_DRAW);
    const pStride = PARTICLE_STRIDE_FLOATS * 4;
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, pStride, 0);
    gl.vertexAttribDivisor(1, 1);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, pStride, 3 * 4);
    gl.vertexAttribDivisor(2, 1);

    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, pStride, 7 * 4);
    gl.vertexAttribDivisor(3, 1);

    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 3, gl.FLOAT, false, pStride, 11 * 4);
    gl.vertexAttribDivisor(4, 1);

    gl.bindVertexArray(null);
  }

  private ensureGlyphAtlas(glyphSetId: AsciiGlyphSetId, customGlyphs = '') {
    const key = getGlyphAtlasKey(glyphSetId, customGlyphs);
    if (this.loadedGlyphAtlasKey === key && this.glyphAtlasTex) return;
    const gl = this.gl;
    const built = buildGlyphRampAtlas(glyphSetId, 32, customGlyphs);
    if (!this.glyphAtlasTex) {
      this.glyphAtlasTex = gl.createTexture()!;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.glyphAtlasTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, built.canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.glyphAtlasCount = built.count;
    this.loadedGlyphAtlasKey = key;
  }

  private allocatePixelTarget(pw: number, ph: number) {
    const gl = this.gl;
    this.pixelW = pw;
    this.pixelH = ph;
    const smooth = this.state.paintMode !== 'pixel' || this.state.visualFilter.style === 'oil';
    const filter = smooth ? gl.LINEAR : gl.NEAREST;

    gl.bindTexture(gl.TEXTURE_2D, this.pixelColorTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, pw, ph, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindRenderbuffer(gl.RENDERBUFFER, this.pixelDepthRb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, pw, ph);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pixelFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pixelColorTex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.pixelDepthRb);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private rebuildSpaceGeometry(
    items: PlacedSpaceItem[],
    pathNodes: PathNode[],
    bimLayers: BimLayerState,
  ) {
    const layerKey = Object.entries(bimLayers)
      .map(([k, v]) => `${k}:${v.visible ? 1 : 0}`)
      .join(',');
    const itemKey = items
      .map(
        (i) =>
          `${i.uid}:${i.itemId}:${i.x.toFixed(2)}:${i.z.toFixed(2)}:${i.scale.toFixed(2)}:${(i.rotation ?? 0).toFixed(2)}`,
      )
      .join('|');
    const pathKey = pathNodes
      .map((p) => `${p.uid}:${p.material}:${p.x.toFixed(2)}:${p.z.toFixed(2)}:${p.radius.toFixed(2)}`)
      .join(';');
    const key = `${layerKey}#${itemKey}#${pathKey}`;
    if (key === this.lastSceneKey) return;
    this.lastSceneKey = key;

    const visibleMap: Record<BimLayerId, boolean> = {
      trees: bimLayers.trees.visible,
      understory: bimLayers.understory.visible,
      'water-stone': bimLayers['water-stone'].visible,
      structures: bimLayers.structures.visible,
      'paths-lighting': bimLayers['paths-lighting'].visible,
      instruments: bimLayers.instruments.visible,
    };

    const built = buildSpaceScene(items, pathNodes, visibleMap);
    this.emitters = built.emitters;
    this.uploadTreeInstances(built.sprites);
  }

  private uploadTreeInstances(sprites: TreeSpriteInstance[]) {
    const gl = this.gl;
    const data = new Float32Array(sprites.length * 18);
    for (let i = 0; i < sprites.length; i++) {
      const sp = sprites[i];
      const uv = getTileUVRect(sp.tile);
      const off = i * 18;
      data[off + 0] = sp.x;
      data[off + 1] = sp.y;
      data[off + 2] = sp.z;
      data[off + 3] = sp.w;
      data[off + 4] = sp.h;
      data[off + 5] = sp.rot;
      data[off + 6] = sp.kind;
      data[off + 7] = sp.isSlice;
      data[off + 8] = sp.speciesIdx;
      data[off + 9] = sp.swayWeight;
      data[off + 10] = sp.swayPhase;
      data[off + 11] = sp.flutterFreq;
      data[off + 12] = sp.shadeBias;
      data[off + 13] = uv.u0;
      data[off + 14] = uv.v0;
      data[off + 15] = uv.u1;
      data[off + 16] = uv.v1;
      data[off + 17] = sp.growthOrder;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.treeInstanceVbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    this.treeInstanceCount = sprites.length;
  }

  public updateState(next: SceneSimulationState) {
    const enteredPov = next.povMode && !this.state.povMode;
    const enteredPlan = next.planMode && !this.state.planMode;
    const paintResolutionChanged =
      (next.paintMode !== 'pixel') !== (this.state.paintMode !== 'pixel') ||
      (next.visualFilter.style === 'oil') !== (this.state.visualFilter.style === 'oil');
    this.state = { ...next };
    this.rebuildSpaceGeometry(next.placedItems, next.pathNodes, next.bimLayers);
    this.ensureGlyphAtlas(next.visualFilter.glyphSet, next.visualFilter.customGlyphs);
    if (paintResolutionChanged) {
      this.resize();
    }

    if (enteredPov) {
      this.fpX = next.entrance.x;
      this.fpZ = next.entrance.z;
      this.fpYaw = next.entrance.yaw;
      this.targetFpYaw = next.entrance.yaw;
      this.fpPitch = 0.08;
      this.targetFpPitch = 0.08;
      this.triggerGust(0.38, false);
    }
    if (enteredPlan) {
      this.targetPlanPanX = 0;
      this.targetPlanPanZ = 0;
      this.targetPlanHeight = 6.2;
    }
  }

  public setVirtualMove(forward: number, strafe: number, turn = 0) {
    this.virtualMove.forward = forward;
    this.virtualMove.strafe = strafe;
    this.virtualMove.turn = turn;
  }

  public resetEntrance() {
    this.fpX = this.state.entrance.x;
    this.fpZ = this.state.entrance.z;
    this.targetFpYaw = this.state.entrance.yaw;
    this.targetFpPitch = 0.08;
  }

  public triggerSkyDescentArrival() {
    // Start high in a dramatic bird's-eye clearing angle and swoop smoothly into the 3D Blue Ridge view
    this.orbitPitch = 1.16;
    this.targetOrbitPitch = 0.34;
    this.orbitDist = 5.35;
    this.targetOrbitDist = 3.45;
    this.orbitYaw = 0.52;
    this.targetOrbitYaw = 0.28;
    this.triggerGust(0.45, false);
  }

  public triggerGust(strength = 1.0, shedCanopy = true) {
    this.gustImpulse = Math.min(1.4, this.gustImpulse + strength);
    if (shedCanopy && this.targetCanopyGrowth > 0.15) {
      this.targetCanopyGrowth = Math.max(0.08, this.targetCanopyGrowth - 0.22 * strength);
      this.callbacks.onCanopyChange?.(this.targetCanopyGrowth);
    }
    const burstCount = Math.round(20 + strength * 28);
    for (let i = 0; i < burstCount; i++) {
      this.spawnCanopyParticle(strength);
    }
  }

  public growBack() {
    this.targetCanopyGrowth = 1.0;
    this.callbacks.onCanopyChange?.(1.0);
    this.gustImpulse = Math.max(this.gustImpulse, 0.25);
  }

  private allocParticle(): Particle | null {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!this.particles[i].active) return this.particles[i];
    }
    return null;
  }

  private spawnCanopyParticle(windBoost = 0) {
    if (this.emitters.length === 0 || this.canopyGrowth < 0.1) return;
    const em = this.emitters[Math.floor(Math.random() * this.emitters.length)];
    const spec = getSpaceItem(em.itemId);
    const seasonal: SeasonalPalette = evaluateSeason(spec, this.state.season);

    const canSpawnBlossom = seasonal.blossomScale > 0.12;
    const canSpawnLeaf = seasonal.leafScale > 0.12;
    if (!canSpawnBlossom && !canSpawnLeaf) return;

    const p = this.allocParticle();
    if (!p) return;

    const spawnBlossom =
      canSpawnBlossom && (em.isBlossom || !canSpawnLeaf || Math.random() < 0.55);

    p.active = true;
    p.settled = false;
    p.kind = spawnBlossom ? 'petal' : 'leaf';
    p.x = em.x + (Math.random() - 0.5) * 0.12;
    p.y = em.y + (Math.random() - 0.5) * 0.06;
    p.z = em.z + (Math.random() - 0.5) * 0.12;
    p.vx = (0.04 + this.state.wind * 0.24 + windBoost * 0.22) * (0.7 + Math.random() * 0.6);
    p.vy = -0.04 - Math.random() * 0.06;
    p.vz = (Math.random() - 0.5) * 0.08;
    p.size = spawnBlossom ? 0.026 : 0.036;
    p.rot = Math.random() * Math.PI * 2;
    p.spin = Math.random() * Math.PI * 2;
    p.spinSpeed = 2.4 + Math.random() * 3.2;
    p.phase = Math.random() * Math.PI * 2;
    p.age = 0;
    p.life = 5.5 + Math.random() * 3.0;
    p.tile = spawnBlossom
      ? spec.architecture.fallingPetalTile
      : spec.architecture.fallingLeafTile;

    const c = spawnBlossom
      ? lerpRGB(seasonal.blossomShadow, seasonal.blossomLit, 0.4 + Math.random() * 0.6)
      : lerpRGB(seasonal.leafShadow, seasonal.leafLit, 0.35 + Math.random() * 0.65);
    p.r = c.r;
    p.g = c.g;
    p.b = c.b;
    p.alpha = 1.0;
  }

  private spawnWeatherParticle() {
    const p = this.allocParticle();
    if (!p) return;
    p.active = true;
    p.settled = false;
    p.age = 0;

    // Spawn around active camera focus so rain/snow surrounds you even while walking in POV!
    const anchorX = this.fpBlend > 0.5 ? this.fpX : 0;
    const anchorZ = this.fpBlend > 0.5 ? this.fpZ : 0;
    const spread = 4.2;

    if (this.state.weather === 'rain') {
      p.kind = 'rain';
      p.x = anchorX + (Math.random() - 0.5) * spread;
      p.y = 1.55 + Math.random() * 0.4;
      p.z = anchorZ + (Math.random() - 0.5) * spread;
      p.vx = 0.22 + this.state.wind * 0.78;
      p.vy = -(1.9 + Math.random() * 0.6);
      p.vz = 0;
      p.size = 0.085;
      p.rot = -Math.atan2(p.vx, -p.vy);
      p.spin = 0;
      p.spinSpeed = 0;
      p.phase = 0;
      p.life = 1.4;
      p.tile = 27;
      p.r = 0.78;
      p.g = 0.88;
      p.b = 0.98;
      p.alpha = 1.0;
    } else if (this.state.weather === 'snow') {
      p.kind = 'snow';
      p.x = anchorX + (Math.random() - 0.5) * spread;
      p.y = 1.45 + Math.random() * 0.4;
      p.z = anchorZ + (Math.random() - 0.5) * spread;
      p.vx = 0.04 + this.state.wind * 0.42;
      p.vy = -(0.16 + Math.random() * 0.14);
      p.vz = (Math.random() - 0.5) * 0.08;
      p.size = 0.032;
      p.rot = 0;
      p.spin = 0;
      p.spinSpeed = 0;
      p.phase = Math.random() * Math.PI * 2;
      p.life = 7.5;
      p.tile = 28;
      p.r = 0.96;
      p.g = 0.98;
      p.b = 1.0;
      p.alpha = 1.0;
    }
  }

  private spawnFirefly() {
    const p = this.allocParticle();
    if (!p) return;
    const anchorX = this.fpBlend > 0.5 ? this.fpX : 0;
    const anchorZ = this.fpBlend > 0.5 ? this.fpZ : 0;
    p.active = true;
    p.settled = false;
    p.kind = 'firefly';
    p.x = anchorX + (Math.random() - 0.5) * 3.6;
    p.y = 0.08 + Math.random() * 0.78;
    p.z = anchorZ + (Math.random() - 0.5) * 3.6;
    p.vx = (Math.random() - 0.5) * 0.06;
    p.vy = (Math.random() - 0.5) * 0.04;
    p.vz = (Math.random() - 0.5) * 0.06;
    p.size = 0.036;
    p.rot = 0;
    p.spin = 0;
    p.spinSpeed = 0;
    p.phase = Math.random() * Math.PI * 2;
    p.age = 0;
    p.life = 4.0 + Math.random() * 3.5;
    p.tile = 29;
    p.r = 1.0;
    p.g = 0.93;
    p.b = 0.48;
    p.alpha = 1.0;
  }

  private stepParticles(dt: number, atmo: DayAtmosphere) {
    const wind = this.state.wind + this.gustImpulse * 0.7;

    const shedRate = (0.35 + wind * 1.45) * (this.state.reducedMotion ? 0.25 : 1.0);
    this.spawnAccum += dt * shedRate * 9.5;
    while (this.spawnAccum >= 1.0) {
      this.spawnAccum -= 1.0;
      this.spawnCanopyParticle();
    }

    if (this.state.weather === 'rain' || this.state.weather === 'snow') {
      const rate =
        this.state.weather === 'rain'
          ? 28 + this.state.weatherIntensity * 150
          : 14 + this.state.weatherIntensity * 62;
      this.weatherAccum += dt * rate * (this.state.reducedMotion ? 0.35 : 1.0);
      while (this.weatherAccum >= 1.0) {
        this.weatherAccum -= 1.0;
        this.spawnWeatherParticle();
      }
    }

    const duskOrNight = atmo.sunVis < 0.22 && !this.state.studioBackdrop;
    if ((this.state.fireflies || duskOrNight) && this.state.weather !== 'rain' && this.state.weather !== 'snow') {
      const ffRate = this.state.fireflies ? 8.5 : 5.0 * (1 - atmo.sunVis * 4);
      this.fireflyAccum += dt * Math.max(0, ffRate);
      while (this.fireflyAccum >= 1.0) {
        this.fireflyAccum -= 1.0;
        this.spawnFirefly();
      }
    }

    let writeIdx = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        continue;
      }

      if (p.kind === 'leaf' || p.kind === 'petal') {
        if (!p.settled) {
          const glide = Math.sin(this.elapsedTime * 2.2 + p.phase) * (0.14 + wind * 0.22);
          p.vx += (wind * 0.38 + glide - p.vx) * 2.4 * dt;
          p.vy += (-0.16 - p.vy) * 1.8 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.spin += p.spinSpeed * (0.7 + wind * 0.9) * dt;
          p.rot += Math.sin(p.spin) * 1.5 * dt;

          if (p.y <= 0.01) {
            p.y = 0.01;
            p.settled = true;
            p.age = Math.max(p.age, p.life - 2.4);
          }
        }
      } else if (p.kind === 'rain') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < -0.1) {
          p.active = false;
          continue;
        }
      } else if (p.kind === 'snow') {
        p.x += (p.vx + wind * 0.24 + Math.sin(this.elapsedTime * 1.5 + p.phase) * 0.06) * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        if (p.y < -0.05) {
          p.active = false;
          continue;
        }
      } else if (p.kind === 'firefly') {
        p.x += (p.vx + Math.sin(this.elapsedTime * 0.9 + p.phase) * 0.04) * dt;
        p.y += (p.vy + Math.cos(this.elapsedTime * 1.2 + p.phase) * 0.03) * dt;
        p.z += p.vz * dt;
      }

      const uv = getTileUVRect(p.tile);
      let visAlpha = 1.0;
      if (p.age < 0.2) visAlpha = p.age / 0.2;
      else if (p.age > p.life - 0.5) visAlpha = Math.max(0, (p.life - p.age) / 0.5);
      if (p.kind === 'firefly') {
        visAlpha *= Math.sin(this.elapsedTime * 3.4 + p.phase) > -0.25 ? 1.0 : 0.0;
      }

      const tumble = p.kind === 'leaf' || p.kind === 'petal' ? 0.35 + 0.65 * Math.abs(Math.cos(p.spin)) : 1.0;
      const sx = p.size * tumble;
      const sy = p.size;
      const amb = this.state.studioBackdrop ? Math.max(0.55, atmo.ambient) : atmo.ambient;
      const lightDim = p.kind === 'firefly' ? 1.0 : 0.42 + amb * 0.58;

      const off = writeIdx * PARTICLE_STRIDE_FLOATS;
      this.particleData[off + 0] = p.x;
      this.particleData[off + 1] = p.y;
      this.particleData[off + 2] = p.z;
      this.particleData[off + 3] = sx;
      this.particleData[off + 4] = sy;
      this.particleData[off + 5] = p.rot;
      this.particleData[off + 6] = visAlpha;
      this.particleData[off + 7] = uv.u0;
      this.particleData[off + 8] = uv.v0;
      this.particleData[off + 9] = uv.u1;
      this.particleData[off + 10] = uv.v1;
      this.particleData[off + 11] = p.r * lightDim;
      this.particleData[off + 12] = p.g * lightDim;
      this.particleData[off + 13] = p.b * lightDim;
      writeIdx++;
    }
    this.activeParticleCount = writeIdx;
  }

  private updateCamera(dt: number) {
    const targetFpBlend = this.state.povMode ? 1.0 : 0.0;
    const targetPlanBlend = !this.state.povMode && this.state.planMode ? 1.0 : 0.0;
    const blendSpeed = this.state.reducedMotion ? 16.0 : 3.2;
    this.fpBlend += (targetFpBlend - this.fpBlend) * Math.min(1, dt * blendSpeed);
    this.planBlend += (targetPlanBlend - this.planBlend) * Math.min(1, dt * blendSpeed);

    if (
      !this.state.povMode &&
      !this.state.planMode &&
      this.state.autoOrbit &&
      !this.state.paused &&
      !this.isDragging &&
      !this.state.reducedMotion
    ) {
      this.targetOrbitYaw += dt * 0.26;
    }
    this.orbitYaw += (this.targetOrbitYaw - this.orbitYaw) * Math.min(1, dt * 8.0);
    this.orbitPitch += (this.targetOrbitPitch - this.orbitPitch) * Math.min(1, dt * 8.0);
    this.orbitDist += (this.targetOrbitDist - this.orbitDist) * Math.min(1, dt * 8.0);
    this.planHeight += (this.targetPlanHeight - this.planHeight) * Math.min(1, dt * 8.0);
    this.planPanX += (this.targetPlanPanX - this.planPanX) * Math.min(1, dt * 8.0);
    this.planPanZ += (this.targetPlanPanZ - this.planPanZ) * Math.min(1, dt * 8.0);

    if (this.state.povMode) {
      let fwd = this.virtualMove.forward;
      let str = this.virtualMove.strafe;
      let turn = this.virtualMove.turn;

      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) fwd += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) fwd -= 1;
      if (this.keys.has('KeyD')) str += 1;
      if (this.keys.has('KeyA')) str -= 1;
      if (this.keys.has('ArrowLeft')) turn += 1;
      if (this.keys.has('ArrowRight')) turn -= 1;

      if (Math.abs(turn) > 0.01) {
        this.targetFpYaw += turn * dt * 1.6;
      }

      const speed = 0.88;
      const moveLen = Math.hypot(fwd, str);
      if (moveLen > 0.01) {
        const nf = fwd / Math.max(1, moveLen);
        const ns = str / Math.max(1, moveLen);
        const dirX = -Math.sin(this.fpYaw);
        const dirZ = -Math.cos(this.fpYaw);
        const rightX = Math.cos(this.fpYaw);
        const rightZ = -Math.sin(this.fpYaw);

        const nextX = this.fpX + (dirX * nf + rightX * ns) * speed * dt;
        const nextZ = this.fpZ + (dirZ * nf + rightZ * ns) * speed * dt;

        const rad = Math.hypot(nextX, nextZ);
        if (rad < 4.6) {
          this.fpX = nextX;
          this.fpZ = nextZ;
        } else {
          this.fpX = (nextX / rad) * 4.6;
          this.fpZ = (nextZ / rad) * 4.6;
        }

        if (!this.state.reducedMotion) {
          this.walkPhase += dt * 7.2;
        }
        if (Math.random() < dt * 2.2) {
          this.spawnCanopyParticle(0.18);
        }
      }
    }

    this.fpYaw += (this.targetFpYaw - this.fpYaw) * Math.min(1, dt * 10.0);
    this.fpPitch += (this.targetFpPitch - this.fpPitch) * Math.min(1, dt * 10.0);

    // 1. Orbit Camera Pose
    const orbitTarget: Vec3 = { x: 0, y: 0.36, z: 0 };
    const orbPos: Vec3 = {
      x: orbitTarget.x + Math.sin(this.orbitYaw) * Math.cos(this.orbitPitch) * this.orbitDist,
      y: orbitTarget.y + Math.sin(this.orbitPitch) * this.orbitDist,
      z: orbitTarget.z + Math.cos(this.orbitYaw) * Math.cos(this.orbitPitch) * this.orbitDist,
    };
    const orbFwd = norm3({
      x: orbitTarget.x - orbPos.x,
      y: orbitTarget.y - orbPos.y,
      z: orbitTarget.z - orbPos.z,
    });

    // 2. Top-Down Architectural Plan Pose (North-Up, crisp orthographic feel)
    const planPos: Vec3 = {
      x: this.planPanX,
      y: this.planHeight,
      z: this.planPanZ + 0.14,
    };
    const planFwd = norm3({ x: 0, y: -this.planHeight, z: -0.14 });

    const pb = this.planBlend * this.planBlend * (3 - 2 * this.planBlend);
    const basePos: Vec3 = {
      x: lerp(orbPos.x, planPos.x, pb),
      y: lerp(orbPos.y, planPos.y, pb),
      z: lerp(orbPos.z, planPos.z, pb),
    };
    const baseFwd = norm3({
      x: lerp(orbFwd.x, planFwd.x, pb),
      y: lerp(orbFwd.y, planFwd.y, pb),
      z: lerp(orbFwd.z, planFwd.z, pb),
    });
    const baseFocal = lerp(1.95, 2.45, pb);

    // 3. First-Person POV Pose
    const bob = this.state.povMode && !this.state.reducedMotion ? Math.sin(this.walkPhase) * 0.008 : 0;
    const fpPos: Vec3 = { x: this.fpX, y: 0.24 + bob, z: this.fpZ };
    const fpFwd = norm3({
      x: -Math.sin(this.fpYaw) * Math.cos(this.fpPitch),
      y: Math.sin(this.fpPitch),
      z: -Math.cos(this.fpYaw) * Math.cos(this.fpPitch),
    });

    const fb = this.fpBlend * this.fpBlend * (3 - 2 * this.fpBlend);
    this.curCamPos = {
      x: lerp(basePos.x, fpPos.x, fb),
      y: lerp(basePos.y, fpPos.y, fb),
      z: lerp(basePos.z, fpPos.z, fb),
    };
    this.curCamForward = norm3({
      x: lerp(baseFwd.x, fpFwd.x, fb),
      y: lerp(baseFwd.y, fpFwd.y, fb),
      z: lerp(baseFwd.z, fpFwd.z, fb),
    });
    const worldUp: Vec3 = { x: 0, y: 1, z: 0 };
    this.curCamRight = norm3(cross3(this.curCamForward, worldUp));
    this.curCamUp = norm3(cross3(this.curCamRight, this.curCamForward));
    this.curFocal = lerp(baseFocal, 1.25, fb);
  }

  private snapGroundCoord(x: number, z: number): [number, number] {
    if (this.state.snapGridFt > 0 && this.state.tool === 'plant') {
      const step = this.state.snapGridFt * 0.1;
      return [Math.round(x / step) * step, Math.round(z / step) * step];
    }
    return [x, z];
  }

  private raycastGround(clientX: number, clientY: number): [number, number] | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    const aspect = rect.width / rect.height;

    const dir = norm3({
      x:
        this.curCamForward.x * this.curFocal +
        this.curCamRight.x * (ndcX * aspect) +
        this.curCamUp.x * ndcY,
      y:
        this.curCamForward.y * this.curFocal +
        this.curCamRight.y * (ndcX * aspect) +
        this.curCamUp.y * ndcY,
      z:
        this.curCamForward.z * this.curFocal +
        this.curCamRight.z * (ndcX * aspect) +
        this.curCamUp.z * ndcY,
    });

    if (dir.y >= -0.02) return null;
    const t = -this.curCamPos.y / dir.y;
    if (t <= 0 || t > 22.0) return null;
    const hx = this.curCamPos.x + dir.x * t;
    const hz = this.curCamPos.z + dir.z * t;
    if (Math.hypot(hx, hz) > 3.55) return null;
    return this.snapGroundCoord(hx, hz);
  }

  private fillSpeciesUniforms() {
    for (let i = 0; i < VIRGINIA_ITEMS.length; i++) {
      const sp = VIRGINIA_ITEMS[i];
      const pal = evaluateSeason(sp, this.state.season);
      const o = i * 3;
      this.uBarkShadow[o] = sp.barkShadow.r;
      this.uBarkShadow[o + 1] = sp.barkShadow.g;
      this.uBarkShadow[o + 2] = sp.barkShadow.b;

      this.uBarkLit[o] = sp.barkLit.r;
      this.uBarkLit[o + 1] = sp.barkLit.g;
      this.uBarkLit[o + 2] = sp.barkLit.b;

      this.uLeafShadow[o] = pal.leafShadow.r;
      this.uLeafShadow[o + 1] = pal.leafShadow.g;
      this.uLeafShadow[o + 2] = pal.leafShadow.b;

      this.uLeafLit[o] = pal.leafLit.r;
      this.uLeafLit[o + 1] = pal.leafLit.g;
      this.uLeafLit[o + 2] = pal.leafLit.b;

      this.uBlossomShadow[o] = pal.blossomShadow.r;
      this.uBlossomShadow[o + 1] = pal.blossomShadow.g;
      this.uBlossomShadow[o + 2] = pal.blossomShadow.b;

      this.uBlossomLit[o] = pal.blossomLit.r;
      this.uBlossomLit[o + 1] = pal.blossomLit.g;
      this.uBlossomLit[o + 2] = pal.blossomLit.b;

      this.uScales[o] = pal.leafScale;
      this.uScales[o + 1] = pal.blossomScale;
      this.uScales[o + 2] = pal.berryScale;
    }
  }

  private loop = (now: number) => {
    this.rafId = requestAnimationFrame(this.loop);
    if (this.contextLost) return;

    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTimestamp) / 1000));
    this.lastTimestamp = now;

    if (!this.state.reducedMotion && !this.state.paused) {
      this.elapsedTime += dt;
    }

    this.updateCamera(dt);
    sharedInstrumentAudio.updateListener(
      this.curCamPos.x,
      this.curCamPos.z,
      this.curCamRight.x,
      this.curCamRight.z,
    );
    if (!this.state.paused) {
      this.canopyGrowth += (this.targetCanopyGrowth - this.canopyGrowth) * Math.min(1, dt * 4.5);
      this.gustImpulse = Math.max(0, this.gustImpulse - dt * 0.58);
    }

    const gl = this.gl;
    const pw = this.pixelW;
    const ph = this.pixelH;

    const atmo = evaluateDayAtmosphere(this.state.timeOfDay);
    const meadow = evaluateMeadowColors(this.state.season, atmo.ambient);
    this.fillSpeciesUniforms();

    const snowAmount =
      this.state.weather === 'snow'
        ? 0.35 + this.state.weatherIntensity * 0.65
        : this.state.season > 3.1 && this.state.season < 3.7
          ? 0.16
          : 0.0;
    const rainAmount = this.state.weather === 'rain' ? 0.35 + this.state.weatherIntensity * 0.65 : 0.0;
    const mistAmount =
      this.state.weather === 'mist'
        ? 0.4 + this.state.weatherIntensity * 0.6
        : rainAmount * 0.35 + (atmo.sunVis < 0.35 && this.state.timeOfDay < 9 ? 0.18 : 0.0);

    if (!this.state.paused) {
      this.stepParticles(dt, atmo);
    }

    // 1. Render entire 3D sprite-stacked space into crisp virtual-pixel FBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pixelFbo);
    gl.viewport(0, 0, pw, ph);
    gl.clearDepth(1.0);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    const backdropMode =
      this.state.povMode
        ? this.state.backdropStyle === 'blueprint'
          ? 2.0
          : this.state.backdropStyle === 'white-circle'
            ? 0.0
            : 1.0
        : this.state.backdropStyle === 'white-circle'
          ? 0.0
          : this.state.backdropStyle === 'blueprint'
            ? 2.0
            : 1.0;

    const hoverMode =
      !this.state.povMode && this.hoverGroundValid && this.state.tool !== 'orbit'
        ? this.state.tool === 'plant'
          ? 1.0
          : this.state.tool === 'path'
            ? 3.0
            : 2.0
        : 0.0;

    const showGrid = this.state.showGrid || this.state.planMode || this.state.snapGridFt > 0;
    const snapStep = this.state.snapGridFt === 1 ? 0.1 : 0.2;

    const paintModeIdx = paintModeToIndex(this.state.paintMode);

    // Pass 1: 3D Sky Dome / Airy White Circle / Blueprint Drafting Ground
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.skyProg);
    gl.bindVertexArray(this.skyVao);
    gl.uniform2f(gl.getUniformLocation(this.skyProg, 'u_pixelRes'), pw, ph);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_time'), this.elapsedTime);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_backdropMode'), backdropMode);
    gl.uniform1i(gl.getUniformLocation(this.skyProg, 'u_paintMode'), paintModeIdx);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_showGrid'), showGrid ? 1.0 : 0.0);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_snapStep'), snapStep);
    gl.uniform3f(gl.getUniformLocation(this.skyProg, 'u_camPos'), this.curCamPos.x, this.curCamPos.y, this.curCamPos.z);
    gl.uniform3f(gl.getUniformLocation(this.skyProg, 'u_camRight'), this.curCamRight.x, this.curCamRight.y, this.curCamRight.z);
    gl.uniform3f(gl.getUniformLocation(this.skyProg, 'u_camUp'), this.curCamUp.x, this.curCamUp.y, this.curCamUp.z);
    gl.uniform3f(gl.getUniformLocation(this.skyProg, 'u_camForward'), this.curCamForward.x, this.curCamForward.y, this.curCamForward.z);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_focal'), this.curFocal);

    gl.uniform3f(gl.getUniformLocation(this.skyProg, 'u_skyTop'), atmo.skyTop.r, atmo.skyTop.g, atmo.skyTop.b);
    gl.uniform3f(gl.getUniformLocation(this.skyProg, 'u_skyMid'), atmo.skyMid.r, atmo.skyMid.g, atmo.skyMid.b);
    gl.uniform3f(gl.getUniformLocation(this.skyProg, 'u_horizonColor'), atmo.horizon.r, atmo.horizon.g, atmo.horizon.b);
    gl.uniform3f(gl.getUniformLocation(this.skyProg, 'u_groundTop'), meadow.top.r, meadow.top.g, meadow.top.b);
    gl.uniform3f(gl.getUniformLocation(this.skyProg, 'u_groundBottom'), meadow.bottom.r, meadow.bottom.g, meadow.bottom.b);
    gl.uniform3f(gl.getUniformLocation(this.skyProg, 'u_mountainColor'), atmo.mountain.r, atmo.mountain.g, atmo.mountain.b);
    gl.uniform3f(gl.getUniformLocation(this.skyProg, 'u_sunDir3'), atmo.sunDir3[0], atmo.sunDir3[1], atmo.sunDir3[2]);
    gl.uniform3f(gl.getUniformLocation(this.skyProg, 'u_sunColor'), atmo.sunColor.r, atmo.sunColor.g, atmo.sunColor.b);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_sunVisibility'), atmo.sunVis);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_moonVisibility'), atmo.moonVis);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_starVisibility'), atmo.starVis);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_mist'), mistAmount);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_snowAmount'), snowAmount);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_rainAmount'), rainAmount);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_wind'), this.state.wind + this.gustImpulse * 0.5);
    const audioPack = sharedHorizonAudioHub.sampleUniforms(this.elapsedTime);
    gl.uniform1i(gl.getUniformLocation(this.skyProg, 'u_audioCount'), audioPack.activeCount);
    gl.uniform4fv(gl.getUniformLocation(this.skyProg, 'u_audioPos'), audioPack.posData);
    gl.uniform4fv(gl.getUniformLocation(this.skyProg, 'u_audioCol'), audioPack.colData);
    const bd = sharedCustomBackdropHub.getShaderParams(now);
    if (!this.customBackdropTex) {
      this.customBackdropTex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, this.customBackdropTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sharedCustomBackdropHub.getCanvas());
      this.customBackdropVersion = bd.version;
    } else if (bd.version !== this.customBackdropVersion) {
      gl.bindTexture(gl.TEXTURE_2D, this.customBackdropTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sharedCustomBackdropHub.getCanvas());
      this.customBackdropVersion = bd.version;
    }
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.customBackdropTex);
    gl.uniform1i(gl.getUniformLocation(this.skyProg, 'u_customBackdrop'), 2);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_customActive'), bd.active ? 1.0 : 0.0);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_customUnfold'), bd.unfold);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_customStylize'), bd.stylize);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_customParallax'), bd.isParallax ? 1.0 : 0.0);

    gl.uniform2f(gl.getUniformLocation(this.skyProg, 'u_hoverXZ'), this.hoverGroundXZ[0], this.hoverGroundXZ[1]);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_hoverMode'), hoverMode);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_hoverRot'), this.state.activeRotation);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_hoverRadius'), this.state.pathBrushRadius);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Enable 24-bit 3D depth testing for crisp zero-polygon sprite stacking
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.oilAtlasTex);

    // Pass 2: All 24 Level 4 Landscape BIM Object Classes + Painted Paths
    gl.useProgram(this.treeProg);
    gl.bindVertexArray(this.treeVao);
    gl.uniform1i(gl.getUniformLocation(this.treeProg, 'u_atlas'), 0);
    gl.uniform1i(gl.getUniformLocation(this.treeProg, 'u_oilAtlas'), 1);
    gl.uniform1i(gl.getUniformLocation(this.treeProg, 'u_paintMode'), paintModeIdx);
    gl.uniform1f(gl.getUniformLocation(this.treeProg, 'u_impasto'), this.state.impasto);
    gl.uniform2f(gl.getUniformLocation(this.treeProg, 'u_pixelRes'), pw, ph);
    gl.uniform1f(gl.getUniformLocation(this.treeProg, 'u_time'), this.elapsedTime);
    gl.uniform1f(gl.getUniformLocation(this.treeProg, 'u_wind'), this.state.wind);
    gl.uniform1f(gl.getUniformLocation(this.treeProg, 'u_gustImpulse'), this.gustImpulse);
    gl.uniform1f(gl.getUniformLocation(this.treeProg, 'u_canopyGrowth'), this.canopyGrowth);
    gl.uniform1f(gl.getUniformLocation(this.treeProg, 'u_stackRelief'), this.state.stackRelief);

    gl.uniform3f(gl.getUniformLocation(this.treeProg, 'u_camPos'), this.curCamPos.x, this.curCamPos.y, this.curCamPos.z);
    gl.uniform3f(gl.getUniformLocation(this.treeProg, 'u_camRight'), this.curCamRight.x, this.curCamRight.y, this.curCamRight.z);
    gl.uniform3f(gl.getUniformLocation(this.treeProg, 'u_camUp'), this.curCamUp.x, this.curCamUp.y, this.curCamUp.z);
    gl.uniform3f(gl.getUniformLocation(this.treeProg, 'u_camForward'), this.curCamForward.x, this.curCamForward.y, this.curCamForward.z);
    gl.uniform1f(gl.getUniformLocation(this.treeProg, 'u_focal'), this.curFocal);
    gl.uniform1f(gl.getUniformLocation(this.treeProg, 'u_camYaw'), this.state.povMode ? this.fpYaw : this.orbitYaw);

    gl.uniform3fv(gl.getUniformLocation(this.treeProg, 'u_barkShadow'), this.uBarkShadow);
    gl.uniform3fv(gl.getUniformLocation(this.treeProg, 'u_barkLit'), this.uBarkLit);
    gl.uniform3fv(gl.getUniformLocation(this.treeProg, 'u_leafShadow'), this.uLeafShadow);
    gl.uniform3fv(gl.getUniformLocation(this.treeProg, 'u_leafLit'), this.uLeafLit);
    gl.uniform3fv(gl.getUniformLocation(this.treeProg, 'u_blossomShadow'), this.uBlossomShadow);
    gl.uniform3fv(gl.getUniformLocation(this.treeProg, 'u_blossomLit'), this.uBlossomLit);
    gl.uniform3fv(gl.getUniformLocation(this.treeProg, 'u_scales'), this.uScales);

    gl.uniform3f(gl.getUniformLocation(this.treeProg, 'u_grassShadow'), meadow.bottom.r * 1.25, meadow.bottom.g * 1.25, meadow.bottom.b * 1.25);
    gl.uniform3f(gl.getUniformLocation(this.treeProg, 'u_grassLit'), meadow.top.r * 1.55, meadow.top.g * 1.55, meadow.top.b * 1.55);
    gl.uniform3f(gl.getUniformLocation(this.treeProg, 'u_horizonColor'), atmo.horizon.r, atmo.horizon.g, atmo.horizon.b);
    gl.uniform2f(gl.getUniformLocation(this.treeProg, 'u_sunDir2'), atmo.sunDir2[0], atmo.sunDir2[1]);
    gl.uniform3f(gl.getUniformLocation(this.treeProg, 'u_sunLightTint'), atmo.sunColor.r, atmo.sunColor.g, atmo.sunColor.b);
    gl.uniform1f(gl.getUniformLocation(this.treeProg, 'u_ambientLevel'), atmo.ambient);
    gl.uniform1f(gl.getUniformLocation(this.treeProg, 'u_sunWarmth'), atmo.sunWarmth);
    gl.uniform1f(gl.getUniformLocation(this.treeProg, 'u_snowAmount'), snowAmount);
    gl.uniform1f(gl.getUniformLocation(this.treeProg, 'u_rainAmount'), rainAmount);
    gl.uniform1f(gl.getUniformLocation(this.treeProg, 'u_mist'), mistAmount);
    gl.uniform1f(gl.getUniformLocation(this.treeProg, 'u_backdropMode'), backdropMode);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.treeInstanceCount);

    // Pass 3: 3D Tumbling Leaves, Petals, Rain, Snow, & Fireflies
    if (this.activeParticleCount > 0) {
      gl.useProgram(this.particleProg);
      gl.bindVertexArray(this.particleVao);
      gl.uniform1i(gl.getUniformLocation(this.particleProg, 'u_atlas'), 0);
      gl.uniform2f(gl.getUniformLocation(this.particleProg, 'u_pixelRes'), pw, ph);
      gl.uniform3f(gl.getUniformLocation(this.particleProg, 'u_camPos'), this.curCamPos.x, this.curCamPos.y, this.curCamPos.z);
      gl.uniform3f(gl.getUniformLocation(this.particleProg, 'u_camRight'), this.curCamRight.x, this.curCamRight.y, this.curCamRight.z);
      gl.uniform3f(gl.getUniformLocation(this.particleProg, 'u_camUp'), this.curCamUp.x, this.curCamUp.y, this.curCamUp.z);
      gl.uniform3f(gl.getUniformLocation(this.particleProg, 'u_camForward'), this.curCamForward.x, this.curCamForward.y, this.curCamForward.z);
      gl.uniform1f(gl.getUniformLocation(this.particleProg, 'u_focal'), this.curFocal);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.particleInstanceVbo);
      gl.bufferSubData(
        gl.ARRAY_BUFFER,
        0,
        this.particleData.subarray(0, this.activeParticleCount * PARTICLE_STRIDE_FLOATS),
      );
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.activeParticleCount);
    }

    // 2. Blit crisp NEAREST pixel-art FBO + GPU Glyph Light Visual Filter Pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.DEPTH_TEST);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.blitProg);
    gl.bindVertexArray(this.skyVao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.pixelColorTex);
    gl.uniform1i(gl.getUniformLocation(this.blitProg, 'u_pixelTex'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.glyphAtlasTex);
    gl.uniform1i(gl.getUniformLocation(this.blitProg, 'u_glyphAtlas'), 1);

    const vf = this.state.visualFilter;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    gl.uniform2f(gl.getUniformLocation(this.blitProg, 'u_canvasRes'), this.canvas.width, this.canvas.height);
    gl.uniform1f(gl.getUniformLocation(this.blitProg, 'u_dpr'), dpr);
    gl.uniform1f(gl.getUniformLocation(this.blitProg, 'u_time'), this.elapsedTime);
    gl.uniform1i(gl.getUniformLocation(this.blitProg, 'u_filterStyle'), filterStyleToIndex(vf.style));
    gl.uniform1i(
      gl.getUniformLocation(this.blitProg, 'u_engineStyle'),
      PAPER_SKY_STYLE_INDEX[vf.engineStyle ?? 'pixel'] ?? 0,
    );
    gl.uniform1i(gl.getUniformLocation(this.blitProg, 'u_paintMode'), paintModeIdx);
    gl.uniform1f(gl.getUniformLocation(this.blitProg, 'u_impasto'), this.state.impasto);
    gl.uniform1i(gl.getUniformLocation(this.blitProg, 'u_colorTint'), colorTintToIndex(vf.colorTint));
    gl.uniform1f(gl.getUniformLocation(this.blitProg, 'u_density'), vf.density);
    gl.uniform1f(gl.getUniformLocation(this.blitProg, 'u_glow'), vf.glow);
    gl.uniform1f(gl.getUniformLocation(this.blitProg, 'u_glowThreshold'), vf.glowThreshold ?? 0.7);
    gl.uniform1f(gl.getUniformLocation(this.blitProg, 'u_underImage'), vf.underImage ?? 0.16);
    gl.uniform1f(gl.getUniformLocation(this.blitProg, 'u_exposure'), vf.exposure ?? 0);
    gl.uniform1f(gl.getUniformLocation(this.blitProg, 'u_contrast'), vf.contrast ?? 1.0);
    gl.uniform1f(gl.getUniformLocation(this.blitProg, 'u_gamma'), vf.gamma ?? 1.0);
    gl.uniform1f(gl.getUniformLocation(this.blitProg, 'u_detail'), vf.detail ?? 0);
    gl.uniform1f(gl.getUniformLocation(this.blitProg, 'u_invert'), vf.invert ? 1.0 : 0.0);
    gl.uniform1i(
      gl.getUniformLocation(this.blitProg, 'u_motion'),
      this.state.reducedMotion ? 0 : motionFxToIndex(vf.motion ?? 'none'),
    );
    gl.uniform1f(gl.getUniformLocation(this.blitProg, 'u_glyphCount'), this.glyphAtlasCount);
    gl.uniform1f(
      gl.getUniformLocation(this.blitProg, 'u_shimmer'),
      vf.shimmer && !this.state.reducedMotion ? 1.0 : 0.0,
    );

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  };

  private handlePointerDown = (e: PointerEvent) => {
    this.isDragging = true;
    this.dragMoved = false;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.canvas.setPointerCapture(e.pointerId);

    // Continuous path painting on primary button when Path tool is active
    if (!this.state.povMode && this.state.tool === 'path' && e.button === 0) {
      const hit = this.raycastGround(e.clientX, e.clientY);
      if (hit) {
        this.isPaintingPath = true;
        this.lastPathStampXZ = hit;
        this.callbacks.onPathStrokeStart?.();
        this.callbacks.onPathStamp?.(hit[0], hit[1]);
      }
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.state.povMode) {
      const hit = this.raycastGround(e.clientX, e.clientY);
      if (hit) {
        this.hoverGroundXZ = hit;
        this.hoverGroundValid = true;
      } else {
        this.hoverGroundValid = false;
      }
    } else {
      this.hoverGroundValid = false;
    }

    if (this.isPaintingPath) {
      const hit = this.raycastGround(e.clientX, e.clientY);
      if (hit) {
        const minSpacing = Math.max(0.11, this.state.pathBrushRadius * 0.62);
        const last = this.lastPathStampXZ;
        if (!last || Math.hypot(hit[0] - last[0], hit[1] - last[1]) >= minSpacing) {
          this.lastPathStampXZ = hit;
          this.callbacks.onPathStamp?.(hit[0], hit[1]);
        }
      }
      return;
    }

    if (this.isDragging) {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      if (Math.abs(dx) + Math.abs(dy) > 4) this.dragMoved = true;

      if (this.state.povMode) {
        this.targetFpYaw += dx * 0.0058;
        this.targetFpPitch = Math.max(-0.55, Math.min(1.02, this.targetFpPitch + dy * 0.0052));
      } else if (this.state.planMode) {
        const panScale = this.planHeight * 0.0014;
        this.targetPlanPanX = Math.max(-2.6, Math.min(2.6, this.targetPlanPanX - dx * panScale));
        this.targetPlanPanZ = Math.max(-2.6, Math.min(2.6, this.targetPlanPanZ - dy * panScale));
      } else {
        this.targetOrbitYaw -= dx * 0.0075;
        this.targetOrbitPitch = Math.max(0.06, Math.min(1.18, this.targetOrbitPitch + dy * 0.0055));
      }
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    }
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (this.isPaintingPath) {
      this.isPaintingPath = false;
      this.lastPathStampXZ = null;
      this.callbacks.onPathStrokeEnd?.();
      this.isDragging = false;
      if (this.canvas.hasPointerCapture(e.pointerId)) {
        this.canvas.releasePointerCapture(e.pointerId);
      }
      return;
    }

    if (this.isDragging && !this.dragMoved) {
      if (this.state.povMode) {
        this.triggerGust(0.6, false);
      } else if (this.state.tool === 'orbit') {
        const hit = this.raycastGround(e.clientX, e.clientY);
        if (hit) {
          this.callbacks.onGroundAction?.(hit[0], hit[1], 'orbit');
        }
        this.triggerGust(0.55, true);
      } else if (this.state.tool === 'plant' || this.state.tool === 'remove') {
        const hit = this.raycastGround(e.clientX, e.clientY);
        if (hit) {
          this.callbacks.onGroundAction?.(hit[0], hit[1], this.state.tool);
          this.triggerGust(0.35, false);
        }
      }
    }
    this.isDragging = false;
    if (this.canvas.hasPointerCapture(e.pointerId)) {
      this.canvas.releasePointerCapture(e.pointerId);
    }
  };

  private handleWheel = (e: WheelEvent) => {
    if (this.state.povMode) return;
    e.preventDefault();
    if (this.state.planMode) {
      this.targetPlanHeight = Math.max(3.2, Math.min(9.5, this.targetPlanHeight + e.deltaY * 0.004));
    } else {
      this.targetOrbitDist = Math.max(1.35, Math.min(5.6, this.targetOrbitDist + e.deltaY * 0.0022));
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return;
    }
    this.keys.add(e.code);
    if (e.code === 'Space' && this.state.povMode) {
      e.preventDefault();
      this.triggerGust(0.8, false);
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
    this.callbacks.onContextLost?.();
  };

  private handleContextRestored = () => {
    this.contextLost = false;
    this.initGL();
    this.lastSceneKey = '';
    this.rebuildSpaceGeometry(
      this.state.placedItems,
      this.state.pathNodes,
      this.state.bimLayers,
    );
    this.resize();
  };

  public resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const cw = Math.max(1, Math.round(rect.width * dpr));
    const ch = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    const isPainterly = this.state.paintMode !== 'pixel' || this.state.visualFilter.style === 'oil';
    const targetVirtualH = isPainterly ? 520 : 290;
    const aspect = rect.width / Math.max(1, rect.height);
    const pw = Math.max(240, Math.round(targetVirtualH * aspect));
    const ph = targetVirtualH;
    this.allocatePixelTarget(pw, ph);
  };

  private attachEvents() {
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointercancel', this.handlePointerUp);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  public captureDataUrl(): string | null {
    try {
      return this.canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }

  public dispose() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);

    const gl = this.gl;
    if (this.atlasTex) gl.deleteTexture(this.atlasTex);
    if (this.oilAtlasTex) gl.deleteTexture(this.oilAtlasTex);
    if (this.glyphAtlasTex) gl.deleteTexture(this.glyphAtlasTex);
    gl.deleteTexture(this.pixelColorTex);
    gl.deleteRenderbuffer(this.pixelDepthRb);
    gl.deleteFramebuffer(this.pixelFbo);
    gl.deleteBuffer(this.quadVbo);
    gl.deleteBuffer(this.treeInstanceVbo);
    gl.deleteBuffer(this.particleInstanceVbo);
    gl.deleteVertexArray(this.skyVao);
    gl.deleteVertexArray(this.treeVao);
    gl.deleteVertexArray(this.particleVao);
    gl.deleteProgram(this.skyProg);
    gl.deleteProgram(this.treeProg);
    gl.deleteProgram(this.particleProg);
    gl.deleteProgram(this.blitProg);
  }
}
