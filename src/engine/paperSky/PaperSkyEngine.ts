// PaperSkyEngine: Complete WebGL2 runtime for PAPER SKY.
// Features Alice-inspired Cardbridge platforming: triple-jump + hover-glide, butterfly-paper dash,
// sloped card slides, domino-unfolding crimson bridges, Dream-Sight phantom bridges,
// vertical updraft wind columns, walkable House-of-Cards Castle, and cloud-parting descent to Virginia Sylva.

import {
  AMBIENT_CARD_FS,
  AMBIENT_CARD_VS,
  CARD_ATLAS_FS,
  CARD_ATLAS_VS,
  CARD_SUMMIT_INDEX,
  CONTACT_SHADOW_FS,
  CONTACT_SHADOW_VS,
  FX_PARTICLE_FS,
  FX_PARTICLE_VS,
  PAPER_GIRL_FS,
  PAPER_GIRL_VS,
  PAPER_SKY_DOME_FS,
  PAPER_SKY_DOME_VS,
  PAPER_SKY_FILTER_FS,
  PAPER_SKY_FILTER_VS,
  PAPER_SKY_STYLE_INDEX,
  PaperSkyVisualStyle,
  createCardAtlasTexture,
  getPaperSkyStyleMeta,
} from './CardAtlasShader';
import {
  CardChoreographySettings,
  DEFAULT_CARD_CHOREOGRAPHY,
  PaperGirlPartGeometry,
  UpdraftZone,
  WorldCardRecord,
  buildArticulatedGirlGeometry,
  buildPaperSkyWorld,
  createBeveledCardGeometry,
} from './InstancedWorldBuilder';
import {
  CLOUD_BREAK_Y,
  ControllerCallbacks,
  PaperGirlState,
  computeContactShadow,
  createInitialPlayerState,
  resetPlayerToCheckpoint,
  stepForgivingController,
  stepKinematicPlatforms,
  triggerIntentionalDescent,
} from './KinematicController';
import { PhysicsProfileId, getPhysicsProfile } from './physicsProfiles';

import { hexToRgbNorm, sharedHorizonAudioHub } from '../horizonAudioHub';
import { sharedCustomBackdropHub } from '../customBackdropHub';
import {
  AsciiGlyphSetId,
  DEFAULT_VISUAL_FILTER,
  VisualFilterSettings,
  buildGlyphRampAtlas,
  colorTintToIndex,
  filterStyleToIndex,
  getGlyphAtlasKey,
  hasActiveOpticalAdjustments,
  motionFxToIndex,
} from '../visualFilters';

export interface PaperSkyDropZone {
  presetId: string;
  presetName: string;
  compass: string;
  accentHex: string;
}

export interface PaperSkyTelemetry {
  altitudeFt: number;
  cardsVisited: number;
  totalWalkable: number;
  jumpsRemaining: number;
  maxJumps: number;
  physicsProfile: PhysicsProfileId;
  isDiving: boolean;
  isGliding: boolean;
  isSliding: boolean;
  inUpdraft: boolean;
  dreamSightActive: boolean;
  zoneLabel: string;
  dropZone: PaperSkyDropZone;
  descending: boolean;
  descentProgress: number;
  hasMoved: boolean;
}

export interface PaperSkyEngineCallbacks extends ControllerCallbacks {
  onTelemetry?: (t: PaperSkyTelemetry) => void;
  onContextLost?: () => void;
}

const AMBIENT_CARD_COUNT = 320;
const INSTANCE_STRIDE_FLOATS = 20; // mat4 (16) + cardMeta vec4 (4)
const MAX_FX_PARTICLES = 260;

interface FxParticle {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  g: number;
  b: number;
  size: number;
  life: number;
  maxLife: number;
}

// ─── Minimal Zero-Alloc Float32 Mat4 Helpers ──────────────────────────────────
function mat4Perspective(out: Float32Array, fovy: number, aspect: number, near: number, far: number) {
  const f = 1.0 / Math.tan(fovy * 0.5);
  const nf = 1.0 / (near - far);
  out.fill(0);
  out[0] = f / Math.max(0.01, aspect);
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
}

function mat4LookAt(
  out: Float32Array,
  ex: number,
  ey: number,
  ez: number,
  tx: number,
  ty: number,
  tz: number,
) {
  let zx = ex - tx;
  let zy = ey - ty;
  let zz = ez - tz;
  let len = Math.hypot(zx, zy, zz) || 1;
  zx /= len;
  zy /= len;
  zz /= len;

  let xx = zz;
  let xy = 0;
  let xz = -zx;
  len = Math.hypot(xx, xy, xz);
  if (len < 1e-5) {
    xx = 1;
    xy = 0;
    xz = 0;
  } else {
    xx /= len;
    xy /= len;
    xz /= len;
  }

  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  out[0] = xx;
  out[1] = yx;
  out[2] = zx;
  out[3] = 0;
  out[4] = xy;
  out[5] = yy;
  out[6] = zy;
  out[7] = 0;
  out[8] = xz;
  out[9] = yz;
  out[10] = zz;
  out[11] = 0;
  out[12] = -(xx * ex + xy * ey + xz * ez);
  out[13] = -(yx * ex + yy * ey + yz * ez);
  out[14] = -(zx * ex + zy * ey + zz * ez);
  out[15] = 1;
}

function mat4Mul(out: Float32Array, a: Float32Array, b: Float32Array) {
  for (let c = 0; c < 4; c++) {
    const b0 = b[c * 4 + 0];
    const b1 = b[c * 4 + 1];
    const b2 = b[c * 4 + 2];
    const b3 = b[c * 4 + 3];
    out[c * 4 + 0] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
    out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
    out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
    out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
  }
}

function writeTrsMatrix(
  target: Float32Array,
  offset: number,
  px: number,
  py: number,
  pz: number,
  rx: number,
  ry: number,
  rz: number,
  sx: number,
  sy: number,
  sz: number,
) {
  const cx = Math.cos(rx);
  const sinX = Math.sin(rx);
  const cy = Math.cos(ry);
  const sinY = Math.sin(ry);
  const cz = Math.cos(rz);
  const sinZ = Math.sin(rz);

  const m00 = cy * cz + sinY * sinX * sinZ;
  const m01 = cx * sinZ;
  const m02 = -sinY * cz + cy * sinX * sinZ;

  const m10 = -cy * sinZ + sinY * sinX * cz;
  const m11 = cx * cz;
  const m12 = sinY * sinZ + cy * sinX * cz;

  const m20 = sinY * cx;
  const m21 = -sinX;
  const m22 = cy * cx;

  target[offset + 0] = m00 * sx;
  target[offset + 1] = m01 * sx;
  target[offset + 2] = m02 * sx;
  target[offset + 3] = 0;

  target[offset + 4] = m10 * sy;
  target[offset + 5] = m11 * sy;
  target[offset + 6] = m12 * sy;
  target[offset + 7] = 0;

  target[offset + 8] = m20 * sz;
  target[offset + 9] = m21 * sz;
  target[offset + 10] = m22 * sz;
  target[offset + 11] = 0;

  target[offset + 12] = px;
  target[offset + 13] = py;
  target[offset + 14] = pz;
  target[offset + 15] = 1;
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? 'PaperSky shader compile error';
    gl.deleteShader(shader);
    throw new Error(info);
  }
  return shader;
}

function linkProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog) ?? 'PaperSky program link error';
    gl.deleteProgram(prog);
    throw new Error(info);
  }
  return prog;
}

interface GirlGpuPart {
  id: PaperGirlPartGeometry['id'];
  vao: WebGLVertexArrayObject;
  vbo: WebGLBuffer;
  ibo: WebGLBuffer;
  indexCount: number;
  color: [number, number, number];
}

function resolveZoneLabel(z: number, y: number): string {
  if (z > -32) return 'XD Leap';
  if (z > -58) return 'Emote Highway';
  if (z > -75) return 'Phantom Bridge';
  if (z > -95) return 'Updraft Terrace';
  if (z > -113) return 'Emote Slide';
  if (z > -140) return 'Crimson Bridge';
  if (y > 17.5) return 'Golden Summit';
  return 'Card Castle';
}

function resolveDropZone(x: number, z: number, y: number): PaperSkyDropZone {
  if (z > -38) {
    return {
      presetId: 'courtyard-circle',
      presetName: 'Blue Ridge Courtyard',
      compass: x < -4 ? 'WNW' : x > 4 ? 'ENE' : 'Center',
      accentHex: '#8ee6a8',
    };
  }
  if (z > -76) {
    return {
      presetId: 'cherry-walk',
      presetName: 'Potomac Cherry Walk',
      compass: x < -4 ? 'NW' : x > 4 ? 'NE' : 'North',
      accentHex: '#f7b6cc',
    };
  }
  if (z > -114) {
    return {
      presetId: 'shenandoah-autumn',
      presetName: 'Shenandoah Autumn',
      compass: x < -4 ? 'West Ridge' : x > 4 ? 'East Ridge' : 'High Pass',
      accentHex: '#f7be6d',
    };
  }
  if (z > -145 && y <= 17.5) {
    return {
      presetId: 'conservatory-estate',
      presetName: 'Conservatory Terrace',
      compass: 'Far North',
      accentHex: '#9ed6f8',
    };
  }
  return {
    presetId: 'single-specimen',
    presetName: 'Open Clearing',
    compass: 'Summit',
    accentHex: '#f4dc82',
  };
}

export class PaperSkyEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private callbacks: PaperSkyEngineCallbacks;

  private skyProg!: WebGLProgram;
  private cardProg!: WebGLProgram;
  private girlProg!: WebGLProgram;
  private shadowProg!: WebGLProgram;
  private particleProg!: WebGLProgram;
  private fxProg!: WebGLProgram;
  private filterProg!: WebGLProgram;

  private cardAtlasTex!: WebGLTexture;
  private emptyVao!: WebGLVertexArrayObject;
  private customBackdropTex: WebGLTexture | null = null;
  private customBackdropVersion = -1;

  // Offscreen FBO + ASCII Glyph Atlas for live 2D Screen Filters (OIL / ASCII / DOTS / GRAIN / SCAN)
  private sceneFbo: WebGLFramebuffer | null = null;
  private sceneColorTex: WebGLTexture | null = null;
  private sceneDepthRb: WebGLRenderbuffer | null = null;
  private sceneFboW = 0;
  private sceneFboH = 0;
  private glyphAtlasTex: WebGLTexture | null = null;
  private glyphAtlasCount = 10;
  private loadedGlyphAtlasKey: string | null = null;

  // Instanced Playing Cards GPU buffers
  private cardVao!: WebGLVertexArrayObject;
  private cardGeomVbo!: WebGLBuffer;
  private cardGeomIbo!: WebGLBuffer;
  private cardInstanceVbo!: WebGLBuffer;
  private cardIndexCount = 0;
  private cardInstanceData: Float32Array;

  // Articulated Paper Girl GPU meshes
  private girlParts: GirlGpuPart[] = [];

  // Ambient Swirling Card Particles
  private particleVao!: WebGLVertexArrayObject;
  private particleQuadVbo!: WebGLBuffer;
  private particleInstanceVbo!: WebGLBuffer;

  // Dynamic Interactive FX Particles (jump feathers, butterfly dash, updrafts)
  private fxVao!: WebGLVertexArrayObject;
  private fxVbo!: WebGLBuffer;
  private fxParticles: FxParticle[] = [];
  private fxBufferData = new Float32Array(MAX_FX_PARTICLES * 8); // pos(3), color(4), size(1)
  private fxSpawnTimer = 0;

  // World & Player State
  private cards: WorldCardRecord[];
  private updrafts: UpdraftZone[];
  private player: PaperGirlState;

  // Input & Camera State
  private keys = new Set<string>();
  private jumpQueued = false;
  private dashQueued = false;
  private dreamSightActive = false;
  private virtualSteerX = 0;
  private virtualSteerZ = 0;
  private virtualDive = false;
  private virtualGlideHeld = false;
  private hasMoved = false;

  private camYaw = 0;
  private targetCamYaw = 0;
  private camPitch = 0.13;
  private targetCamPitch = 0.13;
  private curFovDeg = 55;
  private camPos = new Float32Array([0, 5.1, 10.4]);
  private camTarget = new Float32Array([0, 3.65, 1.4]);
  private visualStyle: PaperSkyVisualStyle = 'pixel';
  private physicsProfileId: PhysicsProfileId = 'glide';
  private visualFilter: VisualFilterSettings = { ...DEFAULT_VISUAL_FILTER };
  private choreography: CardChoreographySettings = { ...DEFAULT_CARD_CHOREOGRAPHY };

  private pointerActive = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pointerMoved = false;

  // Reusable Matrix Buffers
  private projMat = new Float32Array(16);
  private viewMat = new Float32Array(16);
  private vpMat = new Float32Array(16);
  private girlRootMat = new Float32Array(16);
  private partLocalMat = new Float32Array(16);
  private partWorldMat = new Float32Array(16);

  // Lifecycle
  private rafId = 0;
  private lastTs = 0;
  private elapsed = 0;
  private telemetryTimer = 0;
  private paused = false;
  private disposed = false;
  private contextLost = false;

  constructor(canvas: HTMLCanvasElement, callbacks: PaperSkyEngineCallbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      throw new Error('WebGL2 context unavailable for Paper Sky');
    }
    this.gl = gl;

    const world = buildPaperSkyWorld();
    this.cards = world.cards;
    this.updrafts = world.updrafts;
    this.player = createInitialPlayerState(this.cards);
    this.camPos[0] = this.player.x;
    this.camPos[1] = this.player.y + 3.05;
    this.camPos[2] = this.player.z + 7.2;
    this.camTarget[0] = this.player.x;
    this.camTarget[1] = this.player.y + 1.65;
    this.camTarget[2] = this.player.z - 1.6;
    this.cardInstanceData = new Float32Array(this.cards.length * INSTANCE_STRIDE_FLOATS);

    for (let i = 0; i < MAX_FX_PARTICLES; i++) {
      this.fxParticles.push({
        alive: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        r: 1,
        g: 1,
        b: 1,
        size: 0.3,
        life: 0,
        maxLife: 1,
      });
    }

    this.initGL();
    this.attachEvents();
    this.resize();

    this.lastTs = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  private initGL() {
    const gl = this.gl;

    this.skyProg = linkProgram(gl, PAPER_SKY_DOME_VS, PAPER_SKY_DOME_FS);
    this.cardProg = linkProgram(gl, CARD_ATLAS_VS, CARD_ATLAS_FS);
    this.girlProg = linkProgram(gl, PAPER_GIRL_VS, PAPER_GIRL_FS);
    this.shadowProg = linkProgram(gl, CONTACT_SHADOW_VS, CONTACT_SHADOW_FS);
    this.particleProg = linkProgram(gl, AMBIENT_CARD_VS, AMBIENT_CARD_FS);
    this.fxProg = linkProgram(gl, FX_PARTICLE_VS, FX_PARTICLE_FS);
    this.filterProg = linkProgram(gl, PAPER_SKY_FILTER_VS, PAPER_SKY_FILTER_FS);

    this.cardAtlasTex = createCardAtlasTexture(gl);
    this.emptyVao = gl.createVertexArray()!;
    this.sceneFbo = null;
    this.sceneColorTex = null;
    this.sceneDepthRb = null;
    this.sceneFboW = 0;
    this.sceneFboH = 0;
    this.glyphAtlasTex = null;
    this.loadedGlyphAtlasKey = null;
    this.ensureGlyphAtlas(this.visualFilter.glyphSet, this.visualFilter.customGlyphs);

    // 1. Single Reusable Beveled Card Mesh + Instanced Buffer
    const cardGeom = createBeveledCardGeometry();
    this.cardIndexCount = cardGeom.indices.length;

    this.cardVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.cardVao);

    this.cardGeomVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cardGeomVbo);
    gl.bufferData(gl.ARRAY_BUFFER, cardGeom.vertices, gl.STATIC_DRAW);

    const vStride = 9 * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, vStride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, vStride, 3 * 4);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, vStride, 6 * 4);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, vStride, 8 * 4);

    this.cardGeomIbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cardGeomIbo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cardGeom.indices, gl.STATIC_DRAW);

    this.cardInstanceVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cardInstanceVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.cardInstanceData.byteLength, gl.DYNAMIC_DRAW);

    const iStride = INSTANCE_STRIDE_FLOATS * 4;
    for (let col = 0; col < 4; col++) {
      const loc = 4 + col;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, iStride, col * 16);
      gl.vertexAttribDivisor(loc, 1);
    }
    // aCardMeta vec4: cardIndex, glow, alpha, backOnTop
    gl.enableVertexAttribArray(8);
    gl.vertexAttribPointer(8, 4, gl.FLOAT, false, iStride, 64);
    gl.vertexAttribDivisor(8, 1);

    // 2. Articulated Paper-Cut Girl Parts
    this.girlParts = [];
    const parts = buildArticulatedGirlGeometry();
    for (const p of parts) {
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      const vbo = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, p.vertices, gl.STATIC_DRAW);

      const stride = 7 * 4;
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * 4);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 6 * 4);

      const ibo = gl.createBuffer()!;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, p.indices, gl.STATIC_DRAW);

      this.girlParts.push({
        id: p.id,
        vao,
        vbo,
        ibo,
        indexCount: p.indices.length,
        color: p.color,
      });
    }

    // 3. Swirling Ribbon & Curl-Noise Ambient Playing Cards
    this.particleVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.particleVao);

    const quad = new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]);
    this.particleQuadVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleQuadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // aOrigin(4) + aParam(4) = 8 floats per ambient card
    const pData = new Float32Array(AMBIENT_CARD_COUNT * 8);
    let seed = 918273;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < AMBIENT_CARD_COUNT; i++) {
      const off = i * 8;
      const isRibbon = i < 140;
      if (isRibbon) {
        // Swirling aerial card vortexes along left & right sides of the Cardbridge!
        const side = i % 2 === 0 ? -1 : 1;
        pData[off + 0] = side * (12 + rand() * 14);
        pData[off + 1] = 6 + rand() * 16;
        pData[off + 2] = -rand() * 180;
        pData[off + 3] = (i / 140) + rand() * 0.02;
        pData[off + 4] = 0.72 + rand() * 0.65;
        pData[off + 5] = 1.4 + rand() * 2.2;
        pData[off + 6] = rand() < 0.62 ? 2.0 : rand() < 0.5 ? 1.0 : 0.0; // rich crimson backs + faces!
        pData[off + 7] = 1.0; // ribbon mode
      } else {
        pData[off + 0] = (rand() - 0.5) * 90;
        pData[off + 1] = -2 + rand() * 44;
        pData[off + 2] = -rand() * 200;
        pData[off + 3] = rand();
        pData[off + 4] = 0.45 + rand() * 0.72;
        pData[off + 5] = 0.8 + rand() * 2.4;
        pData[off + 6] = rand() < 0.35 ? 2.0 : rand() < 0.5 ? 1.0 : 0.0;
        pData[off + 7] = 0.0; // curl mode
      }
    }

    this.particleInstanceVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleInstanceVbo);
    gl.bufferData(gl.ARRAY_BUFFER, pData, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 8 * 4, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 8 * 4, 4 * 4);
    gl.vertexAttribDivisor(2, 1);

    // 4. Dynamic FX Particle VAO
    this.fxVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.fxVao);
    this.fxVbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fxVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.fxBufferData.byteLength, gl.DYNAMIC_DRAW);
    const fxStride = 8 * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, fxStride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, fxStride, 3 * 4);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, fxStride, 7 * 4);

    gl.bindVertexArray(null);
  }

  private spawnFxParticle(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    r: number,
    g: number,
    b: number,
    size: number,
    maxLife: number,
  ) {
    for (let i = 0; i < MAX_FX_PARTICLES; i++) {
      const p = this.fxParticles[i];
      if (!p.alive) {
        p.alive = true;
        p.x = x;
        p.y = y;
        p.z = z;
        p.vx = vx;
        p.vy = vy;
        p.vz = vz;
        p.r = r;
        p.g = g;
        p.b = b;
        p.size = size;
        p.life = 0;
        p.maxLife = maxLife;
        return;
      }
    }
  }

  private spawnJumpBurst(jumpNum: number, x: number, y: number, z: number) {
    const count = jumpNum === 1 ? 10 : 18;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.25;
      const spd = 2.0 + Math.random() * 2.8;
      // Air jumps burst luminous azure/teal feathers & pearl petals!
      const isFeather = jumpNum >= 2;
      this.spawnFxParticle(
        x + Math.cos(a) * 0.3,
        y + 0.08,
        z + Math.sin(a) * 0.3,
        Math.cos(a) * spd,
        (isFeather ? 1.8 : 0.8) + Math.random() * 1.4,
        Math.sin(a) * spd,
        isFeather ? 0.56 : 0.98,
        isFeather ? 0.92 : 0.95,
        isFeather ? 0.99 : 0.88,
        isFeather ? 0.42 : 0.28,
        0.55 + Math.random() * 0.35,
      );
    }
  }

  private spawnDashBurst(x: number, y: number, z: number, dirX: number, dirZ: number) {
    for (let i = 0; i < 28; i++) {
      const spread = (Math.random() - 0.5) * 1.4;
      const a = Math.random() * Math.PI * 2;
      this.spawnFxParticle(
        x + (Math.random() - 0.5) * 0.6,
        y + (Math.random() - 0.5) * 0.9,
        z + (Math.random() - 0.5) * 0.6,
        -dirX * (2.5 + Math.random() * 4.5) + Math.cos(a) * 2.2,
        spread * 2.4,
        -dirZ * (2.5 + Math.random() * 4.5) + Math.sin(a) * 2.2,
        0.38 + Math.random() * 0.25,
        0.88 + Math.random() * 0.1,
        0.99,
        0.46 + Math.random() * 0.26,
        0.45 + Math.random() * 0.35,
      );
    }
  }

  private spawnCardSnapBurst(card: WorldCardRecord) {
    const isPhantom = card.isHidden;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      this.spawnFxParticle(
        card.baseX + Math.cos(a) * card.scaleX * 0.42,
        card.curY + 0.15,
        card.baseZ + Math.sin(a) * card.scaleZ * 0.38,
        Math.cos(a) * 1.6,
        1.5 + Math.random() * 1.8,
        Math.sin(a) * 1.6,
        isPhantom ? 0.72 : 0.96,
        isPhantom ? 0.62 : 0.32,
        isPhantom ? 1.0 : 0.34,
        0.38,
        0.55 + Math.random() * 0.3,
      );
    }
  }

  private stepFxParticles(dt: number) {
    // Emit continuous rising luminous wind plumes at every Updraft Chimney!
    this.fxSpawnTimer += dt;
    if (this.fxSpawnTimer >= 0.045) {
      this.fxSpawnTimer = 0;
      for (const u of this.updrafts) {
        const a = this.elapsed * 3.8 + Math.random() * Math.PI * 2;
        const r = u.radius * (0.28 + Math.random() * 0.58);
        this.spawnFxParticle(
          u.x + Math.cos(a) * r,
          u.baseY + Math.random() * 2.5,
          u.z + Math.sin(a) * r,
          -Math.sin(a) * 1.8,
          6.8 + Math.random() * 3.8,
          Math.cos(a) * 1.8,
          0.92,
          0.97,
          1.0,
          0.42 + Math.random() * 0.22,
          1.45 + Math.random() * 0.5,
        );
      }

      // Emit fluttering blue butterflies while dashing or gliding!
      if (this.player.dashTimer > 0) {
        this.spawnFxParticle(
          this.player.x + (Math.random() - 0.5) * 0.5,
          this.player.y + 0.7 + (Math.random() - 0.5) * 0.5,
          this.player.z + (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 2.0,
          1.2 + Math.random() * 1.2,
          (Math.random() - 0.5) * 2.0,
          0.42,
          0.92,
          1.0,
          0.52,
          0.42,
        );
      } else if (!this.player.onGround && this.player.glideSpread > 0.78 && Math.random() < 0.55) {
        this.spawnFxParticle(
          this.player.x + (Math.random() - 0.5) * 0.7,
          this.player.y + 0.35,
          this.player.z + (Math.random() - 0.5) * 0.7,
          (Math.random() - 0.5) * 0.9,
          -0.4,
          (Math.random() - 0.5) * 0.9,
          0.94,
          0.96,
          1.0,
          0.26,
          0.55,
        );
      }
    }

    for (let i = 0; i < MAX_FX_PARTICLES; i++) {
      const p = this.fxParticles[i];
      if (!p.alive) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.alive = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vx *= Math.pow(0.45, dt);
      p.vz *= Math.pow(0.45, dt);
    }
  }

  public setPaused(p: boolean) {
    this.paused = p;
    if (!p) {
      this.lastTs = performance.now();
    }
  }

  public setVisualStyle(style: PaperSkyVisualStyle) {
    if (this.visualStyle === style) return;
    this.visualStyle = style;
    this.resize();
    if (this.paused && !this.disposed && !this.contextLost) {
      this.renderScene();
    }
  }

  public setChoreography(next: CardChoreographySettings) {
    this.choreography = { ...next };
    if (this.paused && !this.disposed && !this.contextLost) {
      this.renderScene();
    }
  }

  public setVisualFilter(vf: VisualFilterSettings) {
    const prevUseFbo = hasActiveOpticalAdjustments(this.visualFilter);
    const nextUseFbo = hasActiveOpticalAdjustments(vf);
    const nextGlyphKey = getGlyphAtlasKey(vf.glyphSet, vf.customGlyphs);
    const glyphChanged = this.loadedGlyphAtlasKey !== nextGlyphKey;
    this.visualFilter = { ...vf };
    if (glyphChanged) {
      this.ensureGlyphAtlas(vf.glyphSet, vf.customGlyphs);
    }
    if (prevUseFbo !== nextUseFbo) {
      this.resize();
    }
    if (this.paused && !this.disposed && !this.contextLost) {
      this.renderScene();
    }
  }

  private ensureGlyphAtlas(glyphSetId: AsciiGlyphSetId, customGlyphs = '') {
    const key = getGlyphAtlasKey(glyphSetId, customGlyphs);
    if (this.loadedGlyphAtlasKey === key && this.glyphAtlasTex) return;
    const gl = this.gl;
    const atlas = buildGlyphRampAtlas(glyphSetId, 32, customGlyphs);
    this.glyphAtlasCount = atlas.count;
    this.loadedGlyphAtlasKey = key;
    if (!this.glyphAtlasTex) {
      this.glyphAtlasTex = gl.createTexture()!;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.glyphAtlasTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  private ensureSceneFbo(w: number, h: number) {
    const gl = this.gl;
    if (this.sceneFbo && this.sceneFboW === w && this.sceneFboH === h) return;
    if (this.sceneFbo) gl.deleteFramebuffer(this.sceneFbo);
    if (this.sceneColorTex) gl.deleteTexture(this.sceneColorTex);
    if (this.sceneDepthRb) gl.deleteRenderbuffer(this.sceneDepthRb);

    this.sceneFboW = w;
    this.sceneFboH = h;

    this.sceneColorTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.sceneColorTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.sceneDepthRb = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.sceneDepthRb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);

    this.sceneFbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.sceneColorTex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.sceneDepthRb);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  }

  public setPhysicsProfile(profileId: PhysicsProfileId) {
    if (this.physicsProfileId === profileId) return;
    this.physicsProfileId = profileId;
    const profile = getPhysicsProfile(profileId);
    // Clamp remaining air jumps cleanly if switching to a profile with fewer jumps mid-air
    this.player.jumpsUsed = Math.min(this.player.jumpsUsed, profile.maxJumps);
  }

  public relaunchAtCheckpoint() {
    resetPlayerToCheckpoint(this.player, this.cards);
    this.targetCamYaw = this.player.yaw;
    this.camYaw = this.player.yaw;
    this.targetCamPitch = 0.13;
    this.camPitch = 0.13;
    this.curFovDeg = 55;
    this.keys.clear();
    this.virtualDive = false;
    this.virtualGlideHeld = false;
    this.virtualSteerX = 0;
    this.virtualSteerZ = 0;
    this.paused = false;
    this.lastTs = performance.now();
  }

  public triggerCloudDescent() {
    triggerIntentionalDescent(this.player, this.callbacks);
  }

  public triggerLaunchInput() {
    this.jumpQueued = true;
    this.hasMoved = true;
  }

  public setVirtualGlideHeld(held: boolean) {
    this.virtualGlideHeld = held;
    if (held) this.hasMoved = true;
  }

  public triggerDashInput() {
    this.dashQueued = true;
    this.hasMoved = true;
  }

  public toggleDreamSight() {
    this.dreamSightActive = !this.dreamSightActive;
    this.hasMoved = true;
  }

  public setVirtualDive(diving: boolean) {
    this.virtualDive = diving;
    if (diving) this.hasMoved = true;
  }

  private updateInstanceBuffer() {
    for (let i = 0; i < this.cards.length; i++) {
      const c = this.cards[i];
      const off = i * INSTANCE_STRIDE_FLOATS;

      if (c.kind === 'catch' && c.catchState === 'orbit') {
        writeTrsMatrix(this.cardInstanceData, off, 0, -90, 0, 0, 0, 0, 0.001, 0.001, 0.001);
        this.cardInstanceData[off + 16] = c.cardIndex;
        this.cardInstanceData[off + 17] = 0.0;
        this.cardInstanceData[off + 18] = 0.0;
        this.cardInstanceData[off + 19] = c.backOnTop ? 1.0 : 0.0;
        continue;
      }

      let rx = c.rotX + c.tiltX;
      let ry = c.rotY;
      let rz = c.rotZ + c.tiltZ;
      let py = c.curY + c.dipY + c.wakeLift;
      let sx = c.scaleX;
      let sy = c.scaleY;
      let sz = c.scaleZ;
      let alpha = 1.0;
      let glow = c.wakeGlow;

      // Dynamic angelic catch-card peeling out of the vortex and feathering level under the player!
      if (c.kind === 'catch') {
        const t = c.revealProgress;
        const rem = 1.0 - t;
        rx += rem * 0.72;
        rz += rem * 0.58 * (c.id % 2 === 0 ? 1 : -1);
        ry += rem * c.catchSpinY;
        const scalePop = 0.55 + 0.45 * t;
        sx *= scalePop;
        sz *= scalePop;
        alpha = Math.min(1.0, Math.max(0.0, t * 1.15));
        glow = Math.max(glow, 0.42 + rem * 0.55);
      }

      // Domino-unfolding crimson bridge flips smoothly from vertical (-90°) to flat (0°)!
      if (c.isUnfolding) {
        const t = c.revealProgress;
        // Spring ease-out feel
        const flipAngle = -(1.0 - t) * (Math.PI * 0.56);
        rx += flipAngle;
        py -= (1.0 - t) * 1.4;
        alpha = Math.min(1.0, 0.15 + t * 0.95);
        if (t > 0.15 && t < 0.96) glow = Math.max(glow, 0.48 * (1.0 - t));
      }

      // Dream-Sight phantom cards shimmer subtly as ghostly outlines until materialized!
      if (c.isHidden) {
        const t = c.revealProgress;
        alpha = 0.16 + t * 0.84;
        // > 1.2 tells shader to emit luminous Dream-Sight violet border shimmer!
        glow = 1.0 + (0.38 + t * 0.52);
        py -= (1.0 - t) * 0.35;
      }

      if (c.cardIndex === CARD_SUMMIT_INDEX) {
        glow = 1.0;
      } else if (c.isCheckpoint && !c.isHidden) {
        glow = Math.max(glow, c.id === this.player.checkpointCardId ? 0.68 : 0.34);
      }

      writeTrsMatrix(
        this.cardInstanceData,
        off,
        c.baseX,
        py,
        c.baseZ,
        rx,
        ry,
        rz,
        sx,
        sy,
        sz,
      );
      this.cardInstanceData[off + 16] = c.cardIndex;
      this.cardInstanceData[off + 17] = glow;
      this.cardInstanceData[off + 18] = alpha;
      this.cardInstanceData[off + 19] = c.backOnTop ? 1.0 : 0.0;
    }

    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cardInstanceVbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.cardInstanceData);
  }

  private renderArticulatedGirl(airSpeed: number, opacity: number) {
    const gl = this.gl;
    gl.useProgram(this.girlProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.girlProg, 'uViewProj'), false, this.vpMat);
    gl.uniform3fv(gl.getUniformLocation(this.girlProg, 'uCamPos'), this.camPos);
    gl.uniform1f(gl.getUniformLocation(this.girlProg, 'uTime'), this.elapsed);
    gl.uniform1f(gl.getUniformLocation(this.girlProg, 'uAirspeed'), airSpeed);
    gl.uniform1f(gl.getUniformLocation(this.girlProg, 'uGlideSpread'), this.player.glideSpread);

    const activePhysics = getPhysicsProfile(this.physicsProfileId);
    const dashRatio =
      this.player.dashTimer > 0
        ? Math.min(1, this.player.dashTimer / Math.max(0.05, activePhysics.dashDuration))
        : 0;
    gl.uniform1f(gl.getUniformLocation(this.girlProg, 'uDashShimmer'), dashRatio);
    gl.uniform1i(
      gl.getUniformLocation(this.girlProg, 'uVisualStyle'),
      PAPER_SKY_STYLE_INDEX[this.visualStyle],
    );
    gl.uniform1f(
      gl.getUniformLocation(this.girlProg, 'uOpacity'),
      opacity * (1.0 - dashRatio * 0.42),
    );

    const crouchOffset = this.player.isSliding ? -0.18 : 0;
    writeTrsMatrix(
      this.girlRootMat,
      0,
      this.player.x,
      this.player.y + 0.56 + crouchOffset,
      this.player.z,
      -this.player.bodyPitch,
      this.player.yaw,
      this.player.bankRoll,
      1.0,
      1.0,
      1.0,
    );

    const spread = this.player.glideSpread;
    const isDiving = this.player.wasDiving || this.player.descending;
    const runSwing =
      this.player.onGround && !this.player.isSliding ? Math.sin(this.player.runCycle) * 0.52 : 0;
    const airKick = this.player.onGround ? 0 : Math.sin(this.elapsed * 4.8) * 0.16;

    const uModelLoc = gl.getUniformLocation(this.girlProg, 'uModel');
    const uColorLoc = gl.getUniformLocation(this.girlProg, 'uBaseColor');

    for (const part of this.girlParts) {
      let lx = 0;
      let ly = 0;
      let lz = 0;
      let rx = 0;
      let ry = 0;
      let rz = 0;
      let sx = 1;
      let sy = 1;
      let sz = 1;

      switch (part.id) {
        case 'torso':
          ly = 0.28;
          break;
        case 'apron':
          ly = 0.26;
          lz = -0.01;
          break;
        case 'skirt':
          ly = 0.34;
          // Dress blooms wide into a floating bell when hover-gliding (just like Alice!)
          sx = 1.0 + spread * 0.52;
          sz = 1.0 + spread * 0.45;
          sy = 1.0 - spread * 0.1;
          rx = this.player.isSliding ? 0.32 : spread * 0.14;
          break;
        case 'bow':
          ly = 0.36;
          lz = 0.15;
          rx = 0.32 + Math.min(0.7, airSpeed * 0.05);
          break;
        case 'head':
          ly = 0.74;
          rx = this.player.bodyPitch * 0.32;
          break;
        case 'hairL':
          lx = -0.14;
          ly = 0.94;
          lz = 0.09;
          rx = 0.26 + Math.min(0.95, airSpeed * 0.065);
          rz = -0.18 - spread * 0.25;
          break;
        case 'hairR':
          lx = 0.14;
          ly = 0.94;
          lz = 0.09;
          rx = 0.26 + Math.min(0.95, airSpeed * 0.065);
          rz = 0.18 + spread * 0.25;
          break;
        case 'armL':
          lx = -0.17;
          ly = 0.66;
          rz = isDiving ? -0.35 : -0.24 - spread * 1.15;
          rx = this.player.onGround ? runSwing : -0.18;
          break;
        case 'armR':
          lx = 0.17;
          ly = 0.66;
          rz = isDiving ? 0.35 : 0.24 + spread * 1.15;
          rx = this.player.onGround ? -runSwing : -0.18;
          break;
        case 'legL':
          lx = -0.1;
          ly = 0.04;
          rx = this.player.isSliding ? -0.55 : this.player.onGround ? -runSwing : 0.22 + airKick;
          rz = -0.05 - spread * 0.1;
          break;
        case 'legR':
          lx = 0.1;
          ly = 0.04;
          rx = this.player.isSliding ? -0.25 : this.player.onGround ? runSwing : 0.22 - airKick;
          rz = 0.05 + spread * 0.1;
          break;
        case 'gliderCape':
          // Flying-squirrel shawl blooms visibly whenever gliding or diving!
          ly = 0.66;
          lz = 0.07;
          rx = 0.22 + spread * 0.58 + Math.min(0.42, airSpeed * 0.028);
          sx = 0.32 + spread * 1.15;
          sy = 0.72 + spread * 0.32;
          break;
        case 'scarf':
          ly = 0.66;
          lz = 0.13;
          rx = 0.45 + Math.min(1.05, airSpeed * 0.08);
          rz = Math.sin(this.elapsed * 5.2) * 0.16;
          break;
      }

      writeTrsMatrix(this.partLocalMat, 0, lx, ly, lz, rx, ry, rz, sx, sy, sz);
      mat4Mul(this.partWorldMat, this.girlRootMat, this.partLocalMat);
      gl.uniformMatrix4fv(uModelLoc, false, this.partWorldMat);
      gl.uniform3fv(uColorLoc, part.color);
      gl.bindVertexArray(part.vao);
      gl.drawElements(gl.TRIANGLES, part.indexCount, gl.UNSIGNED_SHORT, 0);
    }
  }

  private renderFxParticles(opacity: number) {
    let count = 0;
    for (let i = 0; i < MAX_FX_PARTICLES; i++) {
      const p = this.fxParticles[i];
      if (!p.alive) continue;
      const t = p.life / p.maxLife;
      const alpha = Math.sin(t * Math.PI) * 0.92 * opacity;
      if (alpha <= 0.01) continue;
      const off = count * 8;
      this.fxBufferData[off + 0] = p.x;
      this.fxBufferData[off + 1] = p.y;
      this.fxBufferData[off + 2] = p.z;
      this.fxBufferData[off + 3] = p.r;
      this.fxBufferData[off + 4] = p.g;
      this.fxBufferData[off + 5] = p.b;
      this.fxBufferData[off + 6] = alpha;
      this.fxBufferData[off + 7] = p.size * (1.0 - t * 0.35);
      count++;
    }
    if (count === 0) return;

    const gl = this.gl;
    gl.depthMask(false);
    gl.useProgram(this.fxProg);
    gl.bindVertexArray(this.fxVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fxVbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.fxBufferData.subarray(0, count * 8));
    gl.uniformMatrix4fv(gl.getUniformLocation(this.fxProg, 'uViewProj'), false, this.vpMat);
    gl.uniform1f(
      gl.getUniformLocation(this.fxProg, 'uPixelRatio'),
      0.62,
    );
    gl.drawArrays(gl.POINTS, 0, count);
    gl.depthMask(true);
  }

  private frame = (now: number) => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.frame);
    if (this.paused || this.contextLost) return;

    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTs) / 1000));
    this.lastTs = now;
    this.elapsed += dt;

    this.stepSimulation(dt);
    this.renderScene();
  };

  private stepSimulation(dt: number) {
    let forward = this.virtualSteerZ;
    let strafe = this.virtualSteerX;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) forward += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) forward -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) strafe += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) strafe -= 1;

    if (Math.abs(forward) > 0.05 || Math.abs(strafe) > 0.05 || this.jumpQueued || this.dashQueued) {
      this.hasMoved = true;
    }

    const jumpHeld = this.virtualGlideHeld || this.keys.has('Space');
    const diveHeld =
      this.virtualDive || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    // Gently steer camera behind movement when turning with A/D
    if (!this.pointerActive && Math.abs(strafe) > 0.05 && !this.player.descending) {
      this.targetCamYaw -= strafe * dt * 0.58;
    }

    this.camYaw += (this.targetCamYaw - this.camYaw) * Math.min(1, dt * 6.8);
    this.camPitch += (this.targetCamPitch - this.camPitch) * Math.min(1, dt * 6.8);

    const wrappedCallbacks: ControllerCallbacks = {
      onCardLand: (card, isNew, isCheckpoint) => {
        this.callbacks.onCardLand?.(card, isNew, isCheckpoint);
      },
      onJump: (jumpNum, x, y, z) => {
        this.spawnJumpBurst(jumpNum, x, y, z);
        this.callbacks.onJump?.(jumpNum, x, y, z);
      },
      onDash: (x, y, z, dx, dz) => {
        this.spawnDashBurst(x, y, z, dx, dz);
        this.callbacks.onDash?.(x, y, z, dx, dz);
      },
      onCardUnfold: (card) => {
        this.spawnCardSnapBurst(card);
        this.callbacks.onCardUnfold?.(card);
      },
      onUpdraft: () => {
        this.callbacks.onUpdraft?.();
      },
      onDescentStart: () => {
        this.callbacks.onDescentStart?.();
      },
      onDescentComplete: () => {
        this.callbacks.onDescentComplete?.();
      },
    };

    stepKinematicPlatforms(
      this.cards,
      this.player,
      this.dreamSightActive,
      this.elapsed,
      dt,
      wrappedCallbacks,
      this.choreography,
      diveHeld,
    );

    const activeProfile = getPhysicsProfile(this.physicsProfileId);
    stepForgivingController(
      this.player,
      this.cards,
      this.updrafts,
      {
        forward: Math.max(-1, Math.min(1, forward)),
        strafe: Math.max(-1, Math.min(1, strafe)),
        jumpPressed: this.jumpQueued,
        jumpHeld,
        dashPressed: this.dashQueued,
        diveHeld,
        dreamSightActive: this.dreamSightActive,
      },
      this.camYaw,
      dt,
      wrappedCallbacks,
      activeProfile,
    );

    this.jumpQueued = false;
    this.dashQueued = false;

    this.stepFxParticles(dt);

    // Smooth expressive camera + dive/dash FOV widening + bird's-eye descent crane
    const speed = Math.hypot(this.player.vx, this.player.vy, this.player.vz);
    const targetFov = this.player.descending
      ? 69
      : this.player.dashTimer > 0
        ? 67
        : diveHeld && !this.player.onGround
          ? 66
          : this.player.isSliding
            ? 64
            : 56 + Math.min(5, speed * 0.22);
    this.curFovDeg += (targetFov - this.curFovDeg) * Math.min(1, dt * 5.0);

    let idealCamX: number;
    let idealCamY: number;
    let idealCamZ: number;
    let idealTgtX: number;
    let idealTgtY: number;
    let idealTgtZ: number;

    if (this.player.descending) {
      const dp = this.player.descentProgress;
      const craneH = 6.5 + dp * 6.5;
      const backDist = 5.2 * (1 - dp * 0.68);
      idealCamX = this.player.x + Math.sin(this.camYaw) * backDist;
      idealCamY = this.player.y + craneH;
      idealCamZ = this.player.z + Math.cos(this.camYaw) * backDist;
      idealTgtX = this.player.x;
      idealTgtY = this.player.y - 2.2 - dp * 4.0;
      idealTgtZ = this.player.z - Math.cos(this.camYaw) * (1.8 * (1 - dp));
    } else {
      const dist = 7.2 + (diveHeld ? 1.1 : 0) + (this.player.isSliding ? 0.9 : 0);
      const horiz = Math.cos(this.camPitch) * dist;
      const vert = Math.sin(this.camPitch) * dist + 2.15;
      idealCamX = this.player.x + Math.sin(this.camYaw) * horiz;
      idealCamY = this.player.y + vert;
      idealCamZ = this.player.z + Math.cos(this.camYaw) * horiz;
      idealTgtX = this.player.x - Math.sin(this.camYaw) * 1.6;
      idealTgtY = this.player.y + 1.62;
      idealTgtZ = this.player.z - Math.cos(this.camYaw) * 1.6;
    }

    const camLerp = Math.min(1, dt * 7.8);
    this.camPos[0] += (idealCamX - this.camPos[0]) * camLerp;
    this.camPos[1] += (idealCamY - this.camPos[1]) * camLerp;
    this.camPos[2] += (idealCamZ - this.camPos[2]) * camLerp;
    this.camTarget[0] += (idealTgtX - this.camTarget[0]) * camLerp;
    this.camTarget[1] += (idealTgtY - this.camTarget[1]) * camLerp;
    this.camTarget[2] += (idealTgtZ - this.camTarget[2]) * camLerp;

    this.telemetryTimer += dt;
    if (this.telemetryTimer >= 0.08 || this.player.descending) {
      this.telemetryTimer = 0;
      const altitudeFt = Math.max(0, Math.round((this.player.y - CLOUD_BREAK_Y) * 12.5));
      this.callbacks.onTelemetry?.({
        altitudeFt,
        cardsVisited: this.player.cardsVisited,
        totalWalkable: this.player.totalWalkable,
        jumpsRemaining: Math.max(0, activeProfile.maxJumps - this.player.jumpsUsed),
        maxJumps: activeProfile.maxJumps,
        physicsProfile: this.physicsProfileId,
        isDiving: this.player.wasDiving,
        isGliding: !this.player.onGround && !this.player.wasDiving && this.player.glideSpread > 0.65,
        isSliding: this.player.isSliding,
        inUpdraft: this.player.inUpdraft,
        dreamSightActive: this.dreamSightActive,
        zoneLabel: resolveZoneLabel(this.player.z, this.player.y),
        dropZone: resolveDropZone(this.player.x, this.player.z, this.player.y),
        descending: this.player.descending,
        descentProgress: this.player.descentProgress,
        hasMoved: this.hasMoved,
      });
    }
  }

  private renderScene() {
    const gl = this.gl;
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    if (canvasW === 0 || canvasH === 0) return;

    const filterIdx = filterStyleToIndex(this.visualFilter.style);
    const useFilterFbo = hasActiveOpticalAdjustments(this.visualFilter);

    let w = canvasW;
    let h = canvasH;
    if (useFilterFbo) {
      const rect = this.canvas.getBoundingClientRect();
      const pixelScale = getPaperSkyStyleMeta(this.visualStyle).pixelScale;
      const fboW = Math.max(240, Math.round(rect.width * pixelScale));
      const fboH = Math.max(160, Math.round(rect.height * pixelScale));
      this.ensureSceneFbo(fboW, fboH);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFbo);
      w = this.sceneFboW;
      h = this.sceneFboH;
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspect = w / h;
    const fovRad = (this.curFovDeg * Math.PI) / 180;
    mat4Perspective(this.projMat, fovRad, aspect, 0.25, 420.0);
    mat4LookAt(
      this.viewMat,
      this.camPos[0],
      this.camPos[1],
      this.camPos[2],
      this.camTarget[0],
      this.camTarget[1],
      this.camTarget[2],
    );
    mat4Mul(this.vpMat, this.projMat, this.viewMat);

    const camRight: [number, number, number] = [this.viewMat[0], this.viewMat[4], this.viewMat[8]];
    const camUp: [number, number, number] = [this.viewMat[1], this.viewMat[5], this.viewMat[9]];
    const camForward: [number, number, number] = [-this.viewMat[2], -this.viewMat[6], -this.viewMat[10]];

    const styleIdx = PAPER_SKY_STYLE_INDEX[this.visualStyle];
    const styleMeta = getPaperSkyStyleMeta(this.visualStyle);
    const descentReveal = this.player.descending ? this.player.descentProgress : 0.0;
    const sceneOpacity = Math.max(0, 1 - Math.max(0, (descentReveal - 0.52) / 0.48));
    const fogColor: [number, number, number] = styleMeta.fogColor;
    const airSpeed = Math.hypot(this.player.vx, this.player.vy, this.player.vz);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Pass 1: Luminous Azure Sky & Cloud Sea + Dream Sight Violet Wash
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.useProgram(this.skyProg);
    gl.bindVertexArray(this.emptyVao);
    gl.uniform2f(gl.getUniformLocation(this.skyProg, 'uRes'), w, h);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'uTime'), this.elapsed);
    gl.uniform3fv(gl.getUniformLocation(this.skyProg, 'uCamRight'), camRight);
    gl.uniform3fv(gl.getUniformLocation(this.skyProg, 'uCamUp'), camUp);
    gl.uniform3fv(gl.getUniformLocation(this.skyProg, 'uCamForward'), camForward);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'uTanHalfFov'), Math.tan(fovRad * 0.5));
    const audioPack = sharedHorizonAudioHub.sampleUniforms(this.elapsed);
    const dropZone = resolveDropZone(this.player.x, this.player.z, this.player.y);
    const dropRgb = hexToRgbNorm(dropZone.accentHex);

    const bd = sharedCustomBackdropHub.getShaderParams(performance.now());
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
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.customBackdropTex);
    gl.uniform1i(gl.getUniformLocation(this.skyProg, 'uCustomBackdrop'), 1);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'uCustomActive'), bd.active ? 1.0 : 0.0);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'uCustomUnfold'), bd.unfold);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'uCustomStylize'), bd.stylize);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'uCustomParallax'), bd.isParallax ? 1.0 : 0.0);

    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'uDescentReveal'), descentReveal);
    gl.uniform1f(gl.getUniformLocation(this.skyProg, 'uDreamSight'), this.player.dreamSight);
    gl.uniform1i(gl.getUniformLocation(this.skyProg, 'uAudioCount'), audioPack.activeCount);
    gl.uniform4fv(gl.getUniformLocation(this.skyProg, 'uAudioPos'), audioPack.posData);
    gl.uniform4fv(gl.getUniformLocation(this.skyProg, 'uAudioCol'), audioPack.colData);
    gl.uniform3f(gl.getUniformLocation(this.skyProg, 'uDropAccent'), dropRgb[0], dropRgb[1], dropRgb[2]);
    gl.uniform1i(gl.getUniformLocation(this.skyProg, 'uVisualStyle'), styleIdx);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (sceneOpacity > 0.01) {
      // Pass 2: Single-Draw-Call GPU-Instanced Playing Cards (Bridges, Slide, Unfolding, Phantom, Castle & Monoliths)
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.depthFunc(gl.LESS);

      this.updateInstanceBuffer();
      gl.useProgram(this.cardProg);
      gl.bindVertexArray(this.cardVao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.cardAtlasTex);
      gl.uniform1i(gl.getUniformLocation(this.cardProg, 'uAtlas'), 0);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.cardProg, 'uViewProj'), false, this.vpMat);
      gl.uniform3fv(gl.getUniformLocation(this.cardProg, 'uCamPos'), this.camPos);
      gl.uniform3f(gl.getUniformLocation(this.cardProg, 'uLightDir'), 0.42, 0.78, -0.46);
      gl.uniform3fv(gl.getUniformLocation(this.cardProg, 'uFogColor'), fogColor);
      gl.uniform1f(gl.getUniformLocation(this.cardProg, 'uFogDensity'), 0.0044);
      gl.uniform1f(gl.getUniformLocation(this.cardProg, 'uTime'), this.elapsed);
      gl.uniform1f(gl.getUniformLocation(this.cardProg, 'uOpacity'), sceneOpacity);
      gl.uniform1f(gl.getUniformLocation(this.cardProg, 'uDreamSight'), this.player.dreamSight);
      gl.uniform1i(gl.getUniformLocation(this.cardProg, 'uVisualStyle'), styleIdx);
      gl.drawElementsInstanced(gl.TRIANGLES, this.cardIndexCount, gl.UNSIGNED_SHORT, 0, this.cards.length);

      // Pass 3: Slope-Aligned ContactShadowProjector
      const shadow = computeContactShadow(this.player, this.cards);
      if (shadow.visible) {
        gl.depthMask(false);
        gl.useProgram(this.shadowProg);
        gl.bindVertexArray(this.emptyVao);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.shadowProg, 'uViewProj'), false, this.vpMat);
        gl.uniform3f(gl.getUniformLocation(this.shadowProg, 'uCenter'), shadow.x, shadow.y, shadow.z);
        gl.uniform1f(gl.getUniformLocation(this.shadowProg, 'uRadius'), shadow.radius);
        gl.uniform1f(gl.getUniformLocation(this.shadowProg, 'uRotY'), shadow.rotY);
        gl.uniform1f(gl.getUniformLocation(this.shadowProg, 'uSlopeX'), shadow.slopeX);
        gl.uniform1f(gl.getUniformLocation(this.shadowProg, 'uOpacity'), shadow.opacity * sceneOpacity);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.depthMask(true);
      }

      // Pass 4: Articulated Paper-Cut Girl + Flared Skirt & Flying-Squirrel Glider Shawl
      this.renderArticulatedGirl(
        airSpeed,
        Math.max(0, 1 - Math.max(0, (descentReveal - 0.68) / 0.32)),
      );

      // Pass 5: Swirling Card Ribbons & Ambient Floating Cards (with angelic helical slipstream wake)
      gl.depthMask(false);
      gl.useProgram(this.particleProg);
      gl.bindVertexArray(this.particleVao);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.particleProg, 'uViewProj'), false, this.vpMat);
      gl.uniform3fv(gl.getUniformLocation(this.particleProg, 'uCamPos'), this.camPos);
      gl.uniform3f(
        gl.getUniformLocation(this.particleProg, 'uAnchorPos'),
        this.player.x,
        this.player.y,
        this.player.z,
      );
      gl.uniform3f(
        gl.getUniformLocation(this.particleProg, 'uPlayerVel'),
        this.player.vx,
        this.player.vy,
        this.player.vz,
      );
      gl.uniform1f(gl.getUniformLocation(this.particleProg, 'uGlideSpread'), this.player.glideSpread);
      gl.uniform1f(
        gl.getUniformLocation(this.particleProg, 'uSlipstream'),
        this.choreography.slipstreamOrbit,
      );
      gl.uniform1f(gl.getUniformLocation(this.particleProg, 'uTime'), this.elapsed);
      gl.uniform3fv(gl.getUniformLocation(this.particleProg, 'uFogColor'), fogColor);
      gl.uniform1f(gl.getUniformLocation(this.particleProg, 'uOpacity'), sceneOpacity * 0.94);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, AMBIENT_CARD_COUNT);

      // Pass 6: Interactive Burst & Updraft Wind Column VFX
      this.renderFxParticles(sceneOpacity);
    }

    gl.depthMask(true);

    // Pass 7: Live GPU Post-Process Filter & Glyph Light Optical Grading Blit
    if (useFilterFbo && this.sceneColorTex) {
      this.ensureGlyphAtlas(this.visualFilter.glyphSet, this.visualFilter.customGlyphs);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvasW, canvasH);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(this.filterProg);
      gl.bindVertexArray(this.emptyVao);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.sceneColorTex);
      gl.uniform1i(gl.getUniformLocation(this.filterProg, 'uSceneTex'), 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.glyphAtlasTex);
      gl.uniform1i(gl.getUniformLocation(this.filterProg, 'uGlyphAtlas'), 1);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      gl.uniform2f(gl.getUniformLocation(this.filterProg, 'uCanvasRes'), canvasW, canvasH);
      gl.uniform1f(gl.getUniformLocation(this.filterProg, 'uDpr'), dpr);
      gl.uniform1f(gl.getUniformLocation(this.filterProg, 'uTime'), this.elapsed);
      gl.uniform1i(gl.getUniformLocation(this.filterProg, 'uFilterStyle'), filterIdx);
      gl.uniform1i(
        gl.getUniformLocation(this.filterProg, 'uColorTint'),
        colorTintToIndex(this.visualFilter.colorTint),
      );
      gl.uniform1f(gl.getUniformLocation(this.filterProg, 'uDensity'), this.visualFilter.density);
      gl.uniform1f(gl.getUniformLocation(this.filterProg, 'uGlow'), this.visualFilter.glow);
      gl.uniform1f(
        gl.getUniformLocation(this.filterProg, 'uGlowThreshold'),
        this.visualFilter.glowThreshold ?? 0.7,
      );
      gl.uniform1f(
        gl.getUniformLocation(this.filterProg, 'uUnderImage'),
        this.visualFilter.underImage ?? 0.16,
      );
      gl.uniform1f(gl.getUniformLocation(this.filterProg, 'uExposure'), this.visualFilter.exposure ?? 0);
      gl.uniform1f(gl.getUniformLocation(this.filterProg, 'uContrast'), this.visualFilter.contrast ?? 1.0);
      gl.uniform1f(gl.getUniformLocation(this.filterProg, 'uGamma'), this.visualFilter.gamma ?? 1.0);
      gl.uniform1f(gl.getUniformLocation(this.filterProg, 'uDetail'), this.visualFilter.detail ?? 0);
      gl.uniform1f(gl.getUniformLocation(this.filterProg, 'uInvert'), this.visualFilter.invert ? 1.0 : 0.0);
      gl.uniform1i(
        gl.getUniformLocation(this.filterProg, 'uMotion'),
        motionFxToIndex(this.visualFilter.motion ?? 'none'),
      );
      gl.uniform1f(gl.getUniformLocation(this.filterProg, 'uGlyphCount'), this.glyphAtlasCount);
      gl.uniform1f(
        gl.getUniformLocation(this.filterProg, 'uShimmer'),
        this.visualFilter.shimmer ? 1.0 : 0.0,
      );

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.enable(gl.BLEND);
    }

    gl.bindVertexArray(null);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (
      this.paused ||
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }
    const isFreshPress = !this.keys.has(e.code);
    this.keys.add(e.code);
    if (e.code === 'Space') {
      e.preventDefault();
      if (isFreshPress) {
        this.jumpQueued = true;
      }
      this.hasMoved = true;
    } else if (e.code === 'KeyF' && isFreshPress) {
      this.dashQueued = true;
      this.hasMoved = true;
    } else if (e.code === 'KeyQ' && isFreshPress) {
      this.dreamSightActive = !this.dreamSightActive;
      this.hasMoved = true;
    } else if (e.code === 'KeyR' && isFreshPress) {
      this.relaunchAtCheckpoint();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private handlePointerDown = (e: PointerEvent) => {
    if (this.paused) return;
    // Right-click triggers butterfly-paper dash!
    if (e.button === 2) {
      this.dashQueued = true;
      this.hasMoved = true;
      return;
    }
    this.pointerActive = true;
    this.pointerMoved = false;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.canvas.setPointerCapture(e.pointerId);
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.pointerActive || this.paused) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    if (Math.abs(dx) + Math.abs(dy) > 5) {
      this.pointerMoved = true;
      this.hasMoved = true;
    }
    this.targetCamYaw -= dx * 0.0052;
    this.targetCamPitch = Math.max(-0.16, Math.min(0.66, this.targetCamPitch + dy * 0.0038));

    if (e.pointerType === 'touch') {
      this.virtualSteerZ = Math.max(-1, Math.min(1, this.virtualSteerZ - dy * 0.015));
      this.virtualSteerX = Math.max(-1, Math.min(1, dx * 0.04));
    }

    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (!this.pointerActive) return;
    if (!this.pointerMoved && e.pointerType === 'touch') {
      this.jumpQueued = true;
      this.hasMoved = true;
    }
    this.pointerActive = false;
    this.virtualSteerX = 0;
    this.virtualSteerZ = 0;
    if (this.canvas.hasPointerCapture(e.pointerId)) {
      this.canvas.releasePointerCapture(e.pointerId);
    }
  };

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
    this.callbacks.onContextLost?.();
  };

  private handleContextRestored = () => {
    this.contextLost = false;
    this.initGL();
    this.resize();
  };

  public resize = () => {
    // Dynamic resolution: full crisp DPR when a 2D filter (ASCII/Dots/Oil/Grain/Scan) is active;
    // otherwise driven directly by the active visual style's pixelScale.
    const rect = this.canvas.getBoundingClientRect();
    const useFilterFbo = hasActiveOpticalAdjustments(this.visualFilter);
    const scale = useFilterFbo
      ? Math.min(window.devicePixelRatio || 1, 2)
      : getPaperSkyStyleMeta(this.visualStyle).pixelScale;
    const cw = Math.max(240, Math.round(rect.width * scale));
    const ch = Math.max(160, Math.round(rect.height * scale));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
  };

  private attachEvents() {
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointercancel', this.handlePointerUp);
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp);
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);

    const gl = this.gl;
    gl.deleteTexture(this.cardAtlasTex);
    if (this.customBackdropTex) gl.deleteTexture(this.customBackdropTex);
    if (this.glyphAtlasTex) gl.deleteTexture(this.glyphAtlasTex);
    if (this.sceneColorTex) gl.deleteTexture(this.sceneColorTex);
    if (this.sceneDepthRb) gl.deleteRenderbuffer(this.sceneDepthRb);
    if (this.sceneFbo) gl.deleteFramebuffer(this.sceneFbo);
    gl.deleteVertexArray(this.emptyVao);
    gl.deleteVertexArray(this.cardVao);
    gl.deleteBuffer(this.cardGeomVbo);
    gl.deleteBuffer(this.cardGeomIbo);
    gl.deleteBuffer(this.cardInstanceVbo);
    for (const part of this.girlParts) {
      gl.deleteVertexArray(part.vao);
      gl.deleteBuffer(part.vbo);
      gl.deleteBuffer(part.ibo);
    }
    gl.deleteVertexArray(this.particleVao);
    gl.deleteBuffer(this.particleQuadVbo);
    gl.deleteBuffer(this.particleInstanceVbo);
    gl.deleteVertexArray(this.fxVao);
    gl.deleteBuffer(this.fxVbo);
    gl.deleteProgram(this.skyProg);
    gl.deleteProgram(this.cardProg);
    gl.deleteProgram(this.girlProg);
    gl.deleteProgram(this.shadowProg);
    gl.deleteProgram(this.particleProg);
    gl.deleteProgram(this.fxProg);
    gl.deleteProgram(this.filterProg);
  }
}

export { CLOUD_BREAK_Y };
