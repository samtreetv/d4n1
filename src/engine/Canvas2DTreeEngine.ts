import {
  BimLayerId,
  PATH_MATERIALS,
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
  EngineCallbacks,
  SanctuaryRenderer,
  SceneSimulationState,
} from './rendererTypes';
import {
  ATLAS_COLS,
  TILE_SIZE,
  createBotanicalAtlasCanvas,
  createOilBristleAtlasCanvas,
} from './spriteAtlas';
import {
  CanopyEmitter,
  TreeSpriteInstance,
  buildSpaceScene,
} from './treeBuilder';
import { applyGlyphLightFilter2D } from './visualFilters';
import {
  DayAtmosphere,
  evaluateDayAtmosphere,
  evaluateMeadowColors,
} from './WebGLTreeEngine';

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Particle2D {
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
}

interface DrawItem {
  dist: number;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  rot: number;
  tile: number;
  r: number;
  g: number;
  b: number;
  alpha: number;
}

const MAX_PARTICLES = 420;

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

function toCssRgb(c: RGB, mul = 1): string {
  const r = Math.max(0, Math.min(255, Math.round(c.r * mul * 255)));
  const g = Math.max(0, Math.min(255, Math.round(c.g * mul * 255)));
  const b = Math.max(0, Math.min(255, Math.round(c.b * mul * 255)));
  return `rgb(${r},${g},${b})`;
}

/**
 * Automatic Canvas 2D Fallback Renderer for Virginia Sylva.
 * Implements the identical 3D sprite-stacking space designer, First-Person POV
 * entrance mode, and Glyph Light visual filters without requiring WebGL2.
 */
export class Canvas2DTreeEngine implements SanctuaryRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bufferCanvas: HTMLCanvasElement;
  private bufferCtx: CanvasRenderingContext2D;
  private atlasCanvas: HTMLCanvasElement;
  private oilAtlasCanvas: HTMLCanvasElement;
  private tintCache = new Map<string, HTMLCanvasElement>();

  private pixelW = 420;
  private pixelH = 240;

  private sprites: TreeSpriteInstance[] = [];
  private emitters: CanopyEmitter[] = [];
  private lastSceneKey = '';

  private particles: Particle2D[] = [];
  private state: SceneSimulationState;
  private callbacks: EngineCallbacks;
  private rafId = 0;
  private lastTimestamp = 0;
  private elapsedTime = 0;
  private gustImpulse = 0;
  private spawnAccum = 0;
  private weatherAccum = 0;
  private fireflyAccum = 0;

  private orbitYaw = 0.28;
  private targetOrbitYaw = 0.28;
  private orbitPitch = 0.34;
  private targetOrbitPitch = 0.34;
  private orbitDist = 3.45;
  private targetOrbitDist = 3.45;

  private planBlend = 0;
  private planHeight = 6.2;
  private targetPlanHeight = 6.2;
  private planPanX = 0;
  private planPanZ = 0;
  private targetPlanPanX = 0;
  private targetPlanPanZ = 0;

  private fpX = 0;
  private fpZ = 2.35;
  private fpYaw = 0;
  private targetFpYaw = 0;
  private fpPitch = 0.08;
  private targetFpPitch = 0.08;
  private walkPhase = 0;
  private fpBlend = 0;

  private curCamPos: Vec3 = { x: 0, y: 1.2, z: 3.1 };
  private curCamRight: Vec3 = { x: 1, y: 0, z: 0 };
  private curCamUp: Vec3 = { x: 0, y: 1, z: 0 };
  private curCamForward: Vec3 = { x: 0, y: -0.25, z: -1 };
  private curFocal = 1.95;

  private keys = new Set<string>();
  private virtualMove = { forward: 0, strafe: 0, turn: 0 };

  private canopyGrowth = 1.0;
  private targetCanopyGrowth = 1.0;

  private isDragging = false;
  private isPaintingPath = false;
  private lastPathStampXZ: [number, number] | null = null;
  private dragMoved = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private hoverGroundXZ: [number, number] = [0, 0];
  private hoverGroundValid = false;

  constructor(
    canvas: HTMLCanvasElement,
    initialState: SceneSimulationState,
    callbacks: EngineCallbacks = {},
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }
    this.ctx = ctx;

    this.bufferCanvas = document.createElement('canvas');
    this.bufferCanvas.width = this.pixelW;
    this.bufferCanvas.height = this.pixelH;
    this.bufferCtx = this.bufferCanvas.getContext('2d', { alpha: false })!;
    this.atlasCanvas = createBotanicalAtlasCanvas();
    this.oilAtlasCanvas = createOilBristleAtlasCanvas();

    this.state = { ...initialState };
    this.callbacks = callbacks;
    this.fpX = initialState.entrance.x;
    this.fpZ = initialState.entrance.z;
    this.fpYaw = initialState.entrance.yaw;
    this.targetFpYaw = initialState.entrance.yaw;

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
      });
    }

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

  private getTintedTile(tile: number, r: number, g: number, b: number, oil: boolean): HTMLCanvasElement {
    const qr = Math.max(0, Math.min(255, Math.round((r * 255) / 16) * 16));
    const qg = Math.max(0, Math.min(255, Math.round((g * 255) / 16) * 16));
    const qb = Math.max(0, Math.min(255, Math.round((b * 255) / 16) * 16));
    const key = `${oil ? 'o' : 'p'}:${tile}:${qr},${qg},${qb}`;
    const existing = this.tintCache.get(key);
    if (existing) return existing;

    if (this.tintCache.size > 380) {
      this.tintCache.clear();
    }

    const col = tile % ATLAS_COLS;
    const row = Math.floor(tile / ATLAS_COLS);
    const srcAtlas = oil ? this.oilAtlasCanvas : this.atlasCanvas;
    const srcTilePx = oil ? 64 : TILE_SIZE;
    const c = document.createElement('canvas');
    c.width = srcTilePx;
    c.height = srcTilePx;
    const tCtx = c.getContext('2d')!;
    tCtx.imageSmoothingEnabled = oil;
    tCtx.drawImage(
      srcAtlas,
      col * srcTilePx,
      row * srcTilePx,
      srcTilePx,
      srcTilePx,
      0,
      0,
      srcTilePx,
      srcTilePx,
    );
    tCtx.globalCompositeOperation = 'multiply';
    tCtx.fillStyle = `rgb(${qr},${qg},${qb})`;
    tCtx.fillRect(0, 0, srcTilePx, srcTilePx);
    tCtx.globalCompositeOperation = 'destination-in';
    tCtx.drawImage(
      srcAtlas,
      col * srcTilePx,
      row * srcTilePx,
      srcTilePx,
      srcTilePx,
      0,
      0,
      srcTilePx,
      srcTilePx,
    );

    this.tintCache.set(key, c);
    return c;
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
    this.sprites = built.sprites;
    this.emitters = built.emitters;
  }

  public updateState(next: SceneSimulationState) {
    const enteredPov = next.povMode && !this.state.povMode;
    const enteredPlan = next.planMode && !this.state.planMode;
    this.state = { ...next };
    this.rebuildSpaceGeometry(next.placedItems, next.pathNodes, next.bimLayers);

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
    const burstCount = Math.round(14 + strength * 18);
    for (let i = 0; i < burstCount; i++) {
      this.spawnCanopyParticle(strength);
    }
  }

  public growBack() {
    this.targetCanopyGrowth = 1.0;
    this.callbacks.onCanopyChange?.(1.0);
    this.gustImpulse = Math.max(this.gustImpulse, 0.25);
  }

  private allocParticle(): Particle2D | null {
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
    p.size = spawnBlossom ? 0.032 : 0.042;
    p.rot = Math.random() * Math.PI * 2;
    p.spin = Math.random() * Math.PI * 2;
    p.spinSpeed = 2.4 + Math.random() * 3.2;
    p.phase = Math.random() * Math.PI * 2;
    p.age = 0;
    p.life = 5.0 + Math.random() * 2.5;
    p.tile = spawnBlossom
      ? spec.architecture.fallingPetalTile
      : spec.architecture.fallingLeafTile;

    const c = spawnBlossom
      ? lerpRGB(seasonal.blossomShadow, seasonal.blossomLit, 0.5 + Math.random() * 0.5)
      : lerpRGB(seasonal.leafShadow, seasonal.leafLit, 0.45 + Math.random() * 0.55);
    p.r = c.r;
    p.g = c.g;
    p.b = c.b;
  }

  private spawnWeatherParticle() {
    const p = this.allocParticle();
    if (!p) return;
    p.active = true;
    p.settled = false;
    p.age = 0;
    const anchorX = this.fpBlend > 0.5 ? this.fpX : 0;
    const anchorZ = this.fpBlend > 0.5 ? this.fpZ : 0;
    const spread = 4.0;

    if (this.state.weather === 'rain') {
      p.kind = 'rain';
      p.x = anchorX + (Math.random() - 0.5) * spread;
      p.y = 1.5 + Math.random() * 0.4;
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
    } else if (this.state.weather === 'snow') {
      p.kind = 'snow';
      p.x = anchorX + (Math.random() - 0.5) * spread;
      p.y = 1.45 + Math.random() * 0.4;
      p.z = anchorZ + (Math.random() - 0.5) * spread;
      p.vx = 0.04 + this.state.wind * 0.42;
      p.vy = -(0.16 + Math.random() * 0.14);
      p.vz = (Math.random() - 0.5) * 0.08;
      p.size = 0.036;
      p.rot = 0;
      p.spin = 0;
      p.spinSpeed = 0;
      p.phase = Math.random() * Math.PI * 2;
      p.life = 7.0;
      p.tile = 28;
      p.r = 0.96;
      p.g = 0.98;
      p.b = 1.0;
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
    p.x = anchorX + (Math.random() - 0.5) * 3.4;
    p.y = 0.1 + Math.random() * 0.75;
    p.z = anchorZ + (Math.random() - 0.5) * 3.4;
    p.vx = (Math.random() - 0.5) * 0.06;
    p.vy = (Math.random() - 0.5) * 0.04;
    p.vz = (Math.random() - 0.5) * 0.06;
    p.size = 0.04;
    p.rot = 0;
    p.spin = 0;
    p.spinSpeed = 0;
    p.phase = Math.random() * Math.PI * 2;
    p.age = 0;
    p.life = 4.0 + Math.random() * 3.0;
    p.tile = 29;
    p.r = 1.0;
    p.g = 0.93;
    p.b = 0.48;
  }

  private stepParticles(dt: number, atmo: DayAtmosphere) {
    const wind = this.state.wind + this.gustImpulse * 0.7;
    const shedRate = (0.35 + wind * 1.45) * (this.state.reducedMotion ? 0.25 : 1.0);
    this.spawnAccum += dt * shedRate * 6.5;
    while (this.spawnAccum >= 1.0) {
      this.spawnAccum -= 1.0;
      this.spawnCanopyParticle();
    }

    if (this.state.weather === 'rain' || this.state.weather === 'snow') {
      const rate =
        this.state.weather === 'rain'
          ? 20 + this.state.weatherIntensity * 90
          : 10 + this.state.weatherIntensity * 45;
      this.weatherAccum += dt * rate * (this.state.reducedMotion ? 0.35 : 1.0);
      while (this.weatherAccum >= 1.0) {
        this.weatherAccum -= 1.0;
        this.spawnWeatherParticle();
      }
    }

    const duskOrNight = atmo.sunVis < 0.22 && !this.state.studioBackdrop;
    if (
      (this.state.fireflies || duskOrNight) &&
      this.state.weather !== 'rain' &&
      this.state.weather !== 'snow'
    ) {
      const ffRate = this.state.fireflies ? 6.5 : 3.5 * (1 - atmo.sunVis * 4);
      this.fireflyAccum += dt * Math.max(0, ffRate);
      while (this.fireflyAccum >= 1.0) {
        this.fireflyAccum -= 1.0;
        this.spawnFirefly();
      }
    }

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
            p.age = Math.max(p.age, p.life - 2.0);
          }
        }
      } else if (p.kind === 'rain') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < -0.1) p.active = false;
      } else if (p.kind === 'snow') {
        p.x += (p.vx + wind * 0.24 + Math.sin(this.elapsedTime * 1.5 + p.phase) * 0.06) * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        if (p.y < -0.05) p.active = false;
      } else if (p.kind === 'firefly') {
        p.x += (p.vx + Math.sin(this.elapsedTime * 0.9 + p.phase) * 0.04) * dt;
        p.y += (p.vy + Math.cos(this.elapsedTime * 1.2 + p.phase) * 0.03) * dt;
        p.z += p.vz * dt;
      }
    }
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
      }
    }

    this.fpYaw += (this.targetFpYaw - this.fpYaw) * Math.min(1, dt * 10.0);
    this.fpPitch += (this.targetFpPitch - this.fpPitch) * Math.min(1, dt * 10.0);

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

  private projectPoint(wx: number, wy: number, wz: number, pw: number, ph: number) {
    const rx = wx - this.curCamPos.x;
    const ry = wy - this.curCamPos.y;
    const rz = wz - this.curCamPos.z;
    const vz = rx * this.curCamForward.x + ry * this.curCamForward.y + rz * this.curCamForward.z;
    if (vz < 0.09) return null;
    const vx = rx * this.curCamRight.x + ry * this.curCamRight.y + rz * this.curCamRight.z;
    const vy = rx * this.curCamUp.x + ry * this.curCamUp.y + rz * this.curCamUp.z;
    const aspect = pw / Math.max(1, ph);
    const proj = this.curFocal / vz;
    const ndcX = (vx * proj) / aspect;
    const ndcY = vy * proj;
    return {
      sx: (ndcX * 0.5 + 0.5) * pw,
      sy: (0.5 - ndcY * 0.5) * ph,
      vz,
      scalePx: proj * ph * 0.5,
    };
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
    let hx = this.curCamPos.x + dir.x * t;
    let hz = this.curCamPos.z + dir.z * t;
    if (Math.hypot(hx, hz) > 3.55) return null;
    if (this.state.snapGridFt > 0 && this.state.tool === 'plant') {
      const step = this.state.snapGridFt * 0.1;
      hx = Math.round(hx / step) * step;
      hz = Math.round(hz / step) * step;
    }
    return [hx, hz];
  }

  private drawBackdrop(
    bCtx: CanvasRenderingContext2D,
    pw: number,
    ph: number,
    atmo: DayAtmosphere,
    meadow: { top: RGB; bottom: RGB },
  ) {
    const horizonNdcY = -this.curCamForward.y * this.curFocal;
    const horizonY = Math.max(0, Math.min(ph, (0.5 - horizonNdcY * 0.5) * ph));
    const mode = this.state.backdropStyle;

    if (mode === 'white-circle' || mode === 'blueprint') {
      const isBp = mode === 'blueprint';
      const grad = bCtx.createLinearGradient(0, 0, 0, ph);
      if (isBp) {
        grad.addColorStop(0, '#0b1831');
        grad.addColorStop(1, '#112445');
      } else {
        grad.addColorStop(0, atmo.sunVis > 0.15 ? '#fbfaf6' : '#1b202e');
        grad.addColorStop(1, atmo.sunVis > 0.15 ? '#f4f3ee' : '#141824');
      }
      bCtx.fillStyle = grad;
      bCtx.fillRect(0, 0, pw, ph);

      // Draw circular garden meadow disk fading gently into white/blueprint paper
      const center = this.projectPoint(0, 0, 0, pw, ph);
      if (center) {
        const radPx = center.scalePx * 3.85;
        const ryPx = Math.max(18, radPx * Math.max(0.28, -this.curCamForward.y));
        const rGrad = bCtx.createRadialGradient(
          center.sx,
          center.sy,
          radPx * 0.36,
          center.sx,
          center.sy,
          radPx,
        );
        if (isBp) {
          rGrad.addColorStop(0, '#142a4f');
          rGrad.addColorStop(1, 'rgba(17, 36, 69, 0)');
        } else {
          rGrad.addColorStop(0, toCssRgb(meadow.top, 1.12));
          rGrad.addColorStop(0.55, toCssRgb(meadow.bottom, 1.08));
          rGrad.addColorStop(1, 'rgba(248, 247, 242, 0)');
        }
        bCtx.save();
        bCtx.translate(center.sx, center.sy);
        bCtx.scale(1, ryPx / Math.max(1, radPx));
        bCtx.fillStyle = rGrad;
        bCtx.beginPath();
        bCtx.arc(0, 0, radPx, 0, Math.PI * 2);
        bCtx.fill();
        if (isBp || this.state.showGrid) {
          bCtx.strokeStyle = isBp ? 'rgba(125,211,252,0.55)' : 'rgba(120,140,120,0.28)';
          bCtx.lineWidth = 1.2;
          bCtx.stroke();
        }
        bCtx.restore();
      }
    } else {
      const skyGrad = bCtx.createLinearGradient(0, 0, 0, Math.max(1, horizonY));
      skyGrad.addColorStop(0, toCssRgb(atmo.skyTop));
      skyGrad.addColorStop(0.55, toCssRgb(atmo.skyMid));
      skyGrad.addColorStop(1, toCssRgb(atmo.horizon));
      bCtx.fillStyle = skyGrad;
      bCtx.fillRect(0, 0, pw, Math.ceil(horizonY) + 1);

      const yaw = this.state.povMode ? this.fpYaw : this.orbitYaw;
      const ridgeLayers = [
        { color: toCssRgb(lerpRGB(atmo.mountain, atmo.horizon, 0.54)), amp: 0.95, base: 0.075, freq1: 3, phase1: 0.5, freq2: 7 },
        { color: toCssRgb(lerpRGB(atmo.mountain, atmo.horizon, 0.30), 0.85), amp: 0.72, base: 0.048, freq1: 4, phase1: 2.2, freq2: 9 },
        { color: toCssRgb(lerpRGB(atmo.mountain, meadow.bottom, 0.35), 0.62), amp: 0.44, base: 0.022, freq1: 5, phase1: -0.9, freq2: 11 },
      ];
      for (const layer of ridgeLayers) {
        bCtx.fillStyle = layer.color;
        bCtx.beginPath();
        bCtx.moveTo(0, horizonY + 2);
        for (let x = 0; x <= pw; x += 6) {
          const az = yaw + (x / pw - 0.5) * 1.8;
          const h =
            (layer.base +
              0.038 * Math.sin(az * layer.freq1 + layer.phase1) +
              0.018 * Math.sin(az * layer.freq2 - 1.2)) *
            ph *
            layer.amp;
          bCtx.lineTo(x, horizonY - h);
        }
        bCtx.lineTo(pw, horizonY + 2);
        bCtx.closePath();
        bCtx.fill();
      }

      const groundGrad = bCtx.createLinearGradient(0, horizonY, 0, ph);
      groundGrad.addColorStop(0, toCssRgb(lerpRGB(meadow.top, atmo.horizon, 0.55)));
      groundGrad.addColorStop(0.35, toCssRgb(meadow.top));
      groundGrad.addColorStop(1, toCssRgb(meadow.bottom));
      bCtx.fillStyle = groundGrad;
      bCtx.fillRect(0, Math.floor(horizonY), pw, ph - Math.floor(horizonY) + 1);
    }

    // Ground placement / path / removal reticle
    if (!this.state.povMode && this.hoverGroundValid && this.state.tool !== 'orbit') {
      const proj = this.projectPoint(this.hoverGroundXZ[0], 0.01, this.hoverGroundXZ[1], pw, ph);
      if (proj) {
        bCtx.save();
        bCtx.strokeStyle =
          this.state.tool === 'remove'
            ? '#ff6b6b'
            : this.state.tool === 'path'
              ? '#fbbf24'
              : '#4ade80';
        bCtx.lineWidth = 1.5;
        const radWorld = this.state.tool === 'path' ? this.state.pathBrushRadius : 0.22;
        const r = Math.max(4, proj.scalePx * radWorld);
        const aspectY = Math.max(0.35, -this.curCamForward.y);
        bCtx.beginPath();
        bCtx.ellipse(proj.sx, proj.sy, r, r * aspectY, 0, 0, Math.PI * 2);
        bCtx.stroke();
        bCtx.restore();
      }
    }
  }

  private loop = (now: number) => {
    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTimestamp) / 1000));
    this.lastTimestamp = now;

    if (!this.state.reducedMotion && !this.state.paused) {
      this.elapsedTime += dt;
    }

    this.updateCamera(dt);
    if (!this.state.paused) {
      this.canopyGrowth += (this.targetCanopyGrowth - this.canopyGrowth) * Math.min(1, dt * 4.5);
      this.gustImpulse = Math.max(0, this.gustImpulse - dt * 0.58);
    }

    const atmo = evaluateDayAtmosphere(this.state.timeOfDay);
    const meadow = evaluateMeadowColors(this.state.season, atmo.ambient);
    if (!this.state.paused) {
      this.stepParticles(dt, atmo);
    }

    const palettes = VIRGINIA_ITEMS.map((sp) => ({
      sp,
      pal: evaluateSeason(sp, this.state.season),
    }));

    const pw = this.pixelW;
    const ph = this.pixelH;
    const bCtx = this.bufferCtx;
    bCtx.imageSmoothingEnabled = false;

    const isLightMode = this.state.backdropStyle === 'white-circle';
    this.drawBackdrop(bCtx, pw, ph, atmo, meadow);

    const drawList: DrawItem[] = [];
    const amb = isLightMode ? Math.max(0.66, atmo.ambient) : atmo.ambient;
    const wind = this.state.wind;

    for (let i = 0; i < this.sprites.length; i++) {
      const sp = this.sprites[i];
      const spEntry = palettes[Math.min(palettes.length - 1, Math.max(0, sp.speciesIdx))];
      const pal = spEntry.pal;

      let scaleMul = 1.0;
      let col: RGB = lerpRGB(pal.leafShadow, pal.leafLit, 0.58 + sp.shadeBias * 0.24);

      if (sp.kind === 0) {
        col = isLightMode ? { r: 0.22, g: 0.28, b: 0.22 } : { r: 0.08, g: 0.12, b: 0.08 };
      } else if (sp.kind === 1) {
        col = lerpRGB(spEntry.sp.barkShadow, spEntry.sp.barkLit, 0.52 + sp.shadeBias * 0.25);
      } else if (sp.kind === 2) {
        const g = Math.max(0, Math.min(1, (this.canopyGrowth - sp.growthOrder * 0.82) / 0.18));
        scaleMul = pal.leafScale * g;
      } else if (sp.kind === 3) {
        const g = Math.max(0, Math.min(1, (this.canopyGrowth - sp.growthOrder * 0.82) / 0.18));
        scaleMul = pal.blossomScale * g;
        col = lerpRGB(pal.blossomShadow, pal.blossomLit, 0.62 + sp.shadeBias * 0.22);
      } else if (sp.kind === 4) {
        scaleMul = pal.berryScale;
        col = { r: 0.9, g: 0.18, b: 0.2 };
      } else if (sp.kind === 5) {
        col = lerpRGB(meadow.bottom, meadow.top, 0.65);
      } else if (sp.kind === 6) {
        const useB = pal.blossomScale > 0.15;
        col = useB
          ? lerpRGB(pal.blossomShadow, pal.blossomLit, 0.6)
          : lerpRGB(pal.leafShadow, pal.leafLit, 0.55);
        scaleMul = Math.max(0.25, Math.min(1, Math.max(pal.blossomScale * 0.85, 0.65)));
      } else if (sp.kind === 7) {
        col = { r: 1.0, g: 0.86, b: 0.45 };
      } else if (sp.kind === 8) {
        const mat = PATH_MATERIALS[sp.speciesIdx % PATH_MATERIALS.length] ?? PATH_MATERIALS[0];
        col = lerpRGB(mat.shadow, mat.lit, 0.58 + sp.shadeBias * 0.2);
      }

      if (scaleMul < 0.06) continue;

      const wave1 = Math.sin(this.elapsedTime * (1.0 + wind * 2.2) - sp.x * 1.4 + sp.z * 1.1);
      const swayX =
        (wind * 0.065 + this.gustImpulse * 0.13) * sp.swayWeight +
        wave1 * (0.01 + wind * 0.042) * sp.swayWeight;

      const relief = this.state.stackRelief;
      const heightRelief = sp.y > 0.03 ? 0.72 + relief * 0.28 : 1.0;
      const wx = sp.x + swayX;
      const wy = sp.y * heightRelief - Math.abs(swayX) * 0.14 * sp.swayWeight;
      const wz = sp.z;

      const proj = this.projectPoint(wx, wy, wz, pw, ph);
      if (!proj || proj.vz > 18) continue;

      const relScale = sp.kind > 0 && sp.kind !== 8 ? 0.88 + relief * 0.12 : 1.0;
      const sw = sp.w * scaleMul * relScale * proj.scalePx * 2.0;
      const flatRatio = Math.max(0.45, -this.curCamForward.y);
      const sh =
        (sp.isSlice > 0.5 && (sp.kind === 0 || sp.kind === 8) ? sp.h * flatRatio : sp.h) *
        scaleMul *
        relScale *
        proj.scalePx *
        2.0;
      if (sw < 1 || sh < 1) continue;

      const light = sp.kind === 7 ? 1.0 : 0.35 + amb * 0.65;
      drawList.push({
        dist: proj.vz,
        sx: proj.sx,
        sy: proj.sy,
        sw,
        sh,
        rot: sp.isSlice > 0.5 ? 0 : sp.rot,
        tile: sp.tile,
        r: Math.min(1, col.r * light),
        g: Math.min(1, col.g * light),
        b: Math.min(1, col.b * light),
        alpha: sp.kind === 0 ? 0.55 : 1.0,
      });
    }

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      const proj = this.projectPoint(p.x, p.y, p.z, pw, ph);
      if (!proj || proj.vz > 16) continue;
      const sz = Math.max(2, p.size * proj.scalePx * 2.2);
      const light = p.kind === 'firefly' ? 1.0 : 0.42 + amb * 0.58;
      drawList.push({
        dist: proj.vz,
        sx: proj.sx,
        sy: proj.sy,
        sw: sz,
        sh: sz,
        rot: p.rot,
        tile: p.tile,
        r: p.r * light,
        g: p.g * light,
        b: p.b * light,
        alpha: 1.0,
      });
    }

    // Painter's algorithm sort (far to near)
    drawList.sort((a, b) => b.dist - a.dist);

    const isOil = this.state.paintMode !== 'pixel';
    bCtx.imageSmoothingEnabled = isOil;
    for (let i = 0; i < drawList.length; i++) {
      const item = drawList[i];
      const sprite = this.getTintedTile(item.tile, item.r, item.g, item.b, isOil);
      bCtx.save();
      bCtx.globalAlpha = item.alpha;
      bCtx.translate(isOil ? item.sx : Math.round(item.sx), isOil ? item.sy : Math.round(item.sy));
      if (Math.abs(item.rot) > 0.02) {
        bCtx.rotate(item.rot);
      }
      const boost = isOil ? 1.12 : 1.0;
      bCtx.drawImage(sprite, -item.sw * 0.5 * boost, -item.sh * 0.5 * boost, item.sw * boost, item.sh * boost);
      bCtx.restore();
    }

    // Composite offscreen pixel buffer to main canvas with active Glyph Light / Oil Paint filter
    applyGlyphLightFilter2D(
      this.bufferCanvas,
      this.ctx,
      this.canvas.width,
      this.canvas.height,
      this.state.visualFilter,
      this.elapsedTime,
      this.state.reducedMotion,
      this.state.paintMode,
      this.state.impasto,
    );
  };

  private handlePointerDown = (e: PointerEvent) => {
    this.isDragging = true;
    this.dragMoved = false;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.canvas.setPointerCapture(e.pointerId);

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

  public resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const cw = Math.max(1, Math.round(rect.width * dpr));
    const ch = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    const targetH = 240;
    const aspect = rect.width / Math.max(1, rect.height);
    const pw = Math.max(220, Math.round(targetH * aspect));
    if (pw !== this.pixelW || targetH !== this.pixelH) {
      this.pixelW = pw;
      this.pixelH = targetH;
      this.bufferCanvas.width = pw;
      this.bufferCanvas.height = targetH;
    }
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
    this.tintCache.clear();
  }
}
