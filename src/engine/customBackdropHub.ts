// CustomBackdropHub: Browser-native PinchDrop-inspired custom backdrop engine.
// Accepts 2D photos, 360° equirectangular panoramas, and budget-capped .splat / .ply
// Gaussian Splat files, projecting them into a shared 1024×512 equirectangular sky
// canvas consumed directly by Paper Sky and Virginia Sylva sky dome shaders at 60 FPS.

export type CustomBackdropProjection = 'photo-360' | 'photo-parallax';

export type CustomBackdropSourceKind = 'none' | 'image' | 'splat';

export interface CustomBackdropSnapshot {
  active: boolean;
  sourceKind: CustomBackdropSourceKind;
  fileName: string | null;
  projection: CustomBackdropProjection;
  stylizeAmount: number; // 0 = raw photo, 1 = full visual engine stylization
  unfoldProgress: number; // 0..1 PinchDrop radial unfold animation
  splatCount: number;
  version: number;
  loading: boolean;
  error: string | null;
}

const CANVAS_W = 1024;
const CANVAS_H = 512;
const MAX_SPLAT_BUDGET = 18000;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export class CustomBackdropHub {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private active = false;
  private sourceKind: CustomBackdropSourceKind = 'none';
  private fileName: string | null = null;
  private projection: CustomBackdropProjection = 'photo-360';
  private stylizeAmount = 0.78;
  private unfoldStartMs = 0;
  private unfoldDurationMs = 720;
  private splatCount = 0;
  private version = 0;
  private loading = false;
  private error: string | null = null;
  private listeners = new Set<() => void>();

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.fillStyle = '#0c121a';
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public getVersion(): number {
    return this.version;
  }

  public isActive(): boolean {
    return this.active;
  }

  public getUnfoldProgress(nowMs = performance.now()): number {
    if (!this.active) return 0;
    const raw = (nowMs - this.unfoldStartMs) / this.unfoldDurationMs;
    if (raw >= 1) return 1;
    if (raw <= 0) return 0;
    // Crisp ease-out cubic radial unfold
    return 1 - Math.pow(1 - raw, 3);
  }

  public getShaderParams(nowMs = performance.now()): {
    active: boolean;
    version: number;
    unfold: number;
    stylize: number;
    isParallax: boolean;
  } {
    return {
      active: this.active,
      version: this.version,
      unfold: this.getUnfoldProgress(nowMs),
      stylize: this.stylizeAmount,
      isParallax: this.projection === 'photo-parallax',
    };
  }

  public getSnapshot(): CustomBackdropSnapshot {
    return {
      active: this.active,
      sourceKind: this.sourceKind,
      fileName: this.fileName,
      projection: this.projection,
      stylizeAmount: this.stylizeAmount,
      unfoldProgress: this.getUnfoldProgress(),
      splatCount: this.splatCount,
      version: this.version,
      loading: this.loading,
      error: this.error,
    };
  }

  public setProjection(projection: CustomBackdropProjection) {
    this.projection = projection;
    this.notify();
  }

  public toggleProjection(): CustomBackdropProjection {
    this.projection = this.projection === 'photo-360' ? 'photo-parallax' : 'photo-360';
    this.notify();
    return this.projection;
  }

  public setStylizeAmount(amount: number) {
    this.stylizeAmount = Math.max(0, Math.min(1, amount));
    this.notify();
  }

  public toggleStylize(): number {
    this.stylizeAmount = this.stylizeAmount > 0.35 ? 0.08 : 0.78;
    this.notify();
    return this.stylizeAmount;
  }

  public clear() {
    this.active = false;
    this.sourceKind = 'none';
    this.fileName = null;
    this.splatCount = 0;
    this.error = null;
    this.loading = false;
    this.version += 1;
    this.notify();
  }

  public async loadFile(file: File): Promise<boolean> {
    this.loading = true;
    this.error = null;
    this.notify();

    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith('.splat')) {
        const buf = await file.arrayBuffer();
        const count = this.renderDotSplatBuffer(buf);
        if (count === 0) {
          throw new Error('No valid Gaussian splats found in .splat file.');
        }
        this.active = true;
        this.sourceKind = 'splat';
        this.fileName = file.name.replace(/\.[^/.]+$/, '');
        this.projection = 'photo-360';
        this.splatCount = count;
        this.unfoldStartMs = performance.now();
        this.version += 1;
        this.loading = false;
        this.notify();
        return true;
      }

      if (lower.endsWith('.ply')) {
        const buf = await file.arrayBuffer();
        const count = this.renderPlySplatBuffer(buf);
        if (count === 0) {
          throw new Error('Could not parse vertices from .ply file.');
        }
        this.active = true;
        this.sourceKind = 'splat';
        this.fileName = file.name.replace(/\.[^/.]+$/, '');
        this.projection = 'photo-360';
        this.splatCount = count;
        this.unfoldStartMs = performance.now();
        this.version += 1;
        this.loading = false;
        this.notify();
        return true;
      }

      if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(lower)) {
        await this.renderImageFile(file);
        this.active = true;
        this.sourceKind = 'image';
        this.fileName = file.name.replace(/\.[^/.]+$/, '');
        this.splatCount = 0;
        this.unfoldStartMs = performance.now();
        this.version += 1;
        this.loading = false;
        this.notify();
        return true;
      }

      throw new Error('Use PNG, JPG, WEBP, .splat, or .ply');
    } catch (err) {
      this.loading = false;
      this.error = err instanceof Error ? err.message : 'Backdrop upload failed';
      this.notify();
      return false;
    }
  }

  private async renderImageFile(file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Image could not be decoded.'));
        el.src = url;
      });

      const ctx = this.ctx;
      const aspect = img.width / Math.max(1, img.height);
      const isEquirect = aspect >= 1.75;

      // Choose sensible default projection based on aspect ratio
      this.projection = isEquirect ? 'photo-360' : 'photo-parallax';

      ctx.save();
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      if (isEquirect) {
        // Direct 360° equirectangular panorama fit
        ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
      } else {
        // Seamless horizontal mirrored wrap so regular photos never show a hard seam at 360°
        const halfW = CANVAS_W * 0.5;
        // Draw left half upright
        ctx.drawImage(img, 0, 0, halfW, CANVAS_H);
        // Draw right half horizontally mirrored so edges join invisibly
        ctx.save();
        ctx.translate(CANVAS_W, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, halfW, CANVAS_H);
        ctx.restore();
      }

      // Soft zenith/nadir feathering to prevent polar pinching artifacts
      const topGrad = ctx.createLinearGradient(0, 0, 0, 44);
      topGrad.addColorStop(0, 'rgba(0,0,0,0.22)');
      topGrad.addColorStop(1, 'rgba(0,0,0,0.0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, CANVAS_W, 44);

      ctx.restore();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // Standard 32-byte antimatter15 .splat binary format:
  // [0..11] float32 x, y, z | [12..23] float32 sx, sy, sz | [24..27] uint8 r, g, b, a | [28..31] uint8 rot
  private renderDotSplatBuffer(buffer: ArrayBuffer): number {
    const stride = 32;
    const total = Math.floor(buffer.byteLength / stride);
    if (total <= 0) return 0;

    const view = new DataView(buffer);
    const step = Math.max(1, Math.floor(total / MAX_SPLAT_BUDGET));

    // Pass 1: estimate centroid so splat cloud wraps cleanly around viewer
    let cx = 0;
    let cy = 0;
    let cz = 0;
    let samples = 0;
    const sampleStep = Math.max(1, Math.floor(total / 1500));
    for (let i = 0; i < total; i += sampleStep) {
      const off = i * stride;
      const x = view.getFloat32(off, true);
      const y = view.getFloat32(off + 4, true);
      const z = view.getFloat32(off + 8, true);
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
        cx += x;
        cy += y;
        cz += z;
        samples += 1;
      }
    }
    if (samples > 0) {
      cx /= samples;
      cy /= samples;
      cz /= samples;
    }

    const points: {
      u: number;
      v: number;
      dist: number;
      radPx: number;
      r: number;
      g: number;
      b: number;
      a: number;
    }[] = [];

    for (let i = 0; i < total; i += step) {
      const off = i * stride;
      const x = view.getFloat32(off, true) - cx;
      const y = -(view.getFloat32(off + 4, true) - cy); // flip Y from OpenCV/COLMAP
      const z = view.getFloat32(off + 8, true) - cz;
      const dist = Math.hypot(x, y, z);
      if (!Number.isFinite(dist) || dist < 0.0001) continue;

      const sx = view.getFloat32(off + 12, true);
      const sy = view.getFloat32(off + 16, true);
      const sz = view.getFloat32(off + 20, true);
      const avgScale = Number.isFinite(sx + sy + sz) ? Math.abs(sx + sy + sz) / 3 : 0.04;

      const r = view.getUint8(off + 24);
      const g = view.getUint8(off + 25);
      const b = view.getUint8(off + 26);
      const a = view.getUint8(off + 27) / 255;
      if (a < 0.04) continue;

      const az = Math.atan2(x, z);
      const el = Math.asin(Math.max(-1, Math.min(1, y / dist)));
      const u = (az / (Math.PI * 2) + 0.5) % 1;
      const v = 0.5 - el / Math.PI;
      const radPx = Math.max(2.5, Math.min(28, (avgScale / Math.max(0.18, dist)) * 115));

      points.push({ u, v, dist, radPx, r, g, b, a });
    }

    return this.paintProjectedSplats(points);
  }

  // Lightweight .ply parser supporting ASCII and binary_little_endian 3DGS / point-cloud exports
  private renderPlySplatBuffer(buffer: ArrayBuffer): number {
    const bytes = new Uint8Array(buffer);
    const headerScanLen = Math.min(bytes.length, 16384);
    const headerText = new TextDecoder('ascii').decode(bytes.subarray(0, headerScanLen));
    const endMarker = 'end_header';
    const endIdx = headerText.indexOf(endMarker);
    if (endIdx < 0) return 0;

    let bodyOffset = endIdx + endMarker.length;
    if (bytes[bodyOffset] === 13 && bytes[bodyOffset + 1] === 10) bodyOffset += 2;
    else if (bytes[bodyOffset] === 10) bodyOffset += 1;

    const lines = headerText.slice(0, endIdx).split(/\r?\n/);
    let isAscii = false;
    let isBinaryLE = false;
    let vertexCount = 0;
    let inVertexElement = false;
    const props: { name: string; type: string; offset: number; size: number }[] = [];
    let stride = 0;

    const typeSize = (t: string): number => {
      if (t === 'float' || t === 'float32' || t === 'int' || t === 'int32' || t === 'uint' || t === 'uint32') return 4;
      if (t === 'double' || t === 'float64') return 8;
      if (t === 'short' || t === 'int16' || t === 'ushort' || t === 'uint16') return 2;
      return 1;
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (line.startsWith('format ascii')) isAscii = true;
      else if (line.startsWith('format binary_little_endian')) isBinaryLE = true;
      else if (line.startsWith('element ')) {
        const parts = line.split(/\s+/);
        inVertexElement = parts[1] === 'vertex';
        if (inVertexElement) vertexCount = parseInt(parts[2] ?? '0', 10) || 0;
      } else if (inVertexElement && line.startsWith('property ') && !line.includes('list')) {
        const parts = line.split(/\s+/);
        const type = parts[1] ?? 'float';
        const name = parts[2] ?? '';
        const size = typeSize(type);
        props.push({ name, type, offset: stride, size });
        stride += size;
      }
    }

    if (vertexCount <= 0 || (!isAscii && !isBinaryLE)) return 0;
    const findProp = (names: string[]) => props.find((p) => names.includes(p.name));
    const px = findProp(['x']);
    const py = findProp(['y']);
    const pz = findProp(['z']);
    if (!px || !py || !pz) return 0;

    const dc0 = findProp(['f_dc_0']);
    const dc1 = findProp(['f_dc_1']);
    const dc2 = findProp(['f_dc_2']);
    const pr = findProp(['red', 'r']);
    const pg = findProp(['green', 'g']);
    const pb = findProp(['blue', 'b']);
    const pOp = findProp(['opacity', 'alpha']);
    const pS0 = findProp(['scale_0']);

    const SH_C0 = 0.28209479177387814;
    const step = Math.max(1, Math.floor(vertexCount / MAX_SPLAT_BUDGET));

    const rawPts: { x: number; y: number; z: number; r: number; g: number; b: number; a: number; sc: number }[] = [];

    if (isBinaryLE) {
      const view = new DataView(buffer, bodyOffset);
      const readVal = (base: number, prop: typeof px): number => {
        const o = base + prop.offset;
        if (o + prop.size > view.byteLength) return 0;
        if (prop.type === 'float' || prop.type === 'float32') return view.getFloat32(o, true);
        if (prop.type === 'double' || prop.type === 'float64') return view.getFloat64(o, true);
        if (prop.type === 'uchar' || prop.type === 'uint8') return view.getUint8(o);
        if (prop.type === 'short' || prop.type === 'int16') return view.getInt16(o, true);
        if (prop.type === 'int' || prop.type === 'int32') return view.getInt32(o, true);
        return view.getUint8(o);
      };

      for (let i = 0; i < vertexCount; i += step) {
        const base = i * stride;
        if (base + stride > view.byteLength) break;
        const x = readVal(base, px);
        const y = -readVal(base, py);
        const z = readVal(base, pz);
        if (!Number.isFinite(x + y + z)) continue;

        let r = 185;
        let g = 195;
        let b = 215;
        if (dc0 && dc1 && dc2) {
          r = Math.max(0, Math.min(255, Math.round((0.5 + SH_C0 * readVal(base, dc0)) * 255)));
          g = Math.max(0, Math.min(255, Math.round((0.5 + SH_C0 * readVal(base, dc1)) * 255)));
          b = Math.max(0, Math.min(255, Math.round((0.5 + SH_C0 * readVal(base, dc2)) * 255)));
        } else if (pr && pg && pb) {
          const rv = readVal(base, pr);
          const gv = readVal(base, pg);
          const bv = readVal(base, pb);
          const mul = rv <= 1 && gv <= 1 && bv <= 1 ? 255 : 1;
          r = Math.max(0, Math.min(255, Math.round(rv * mul)));
          g = Math.max(0, Math.min(255, Math.round(gv * mul)));
          b = Math.max(0, Math.min(255, Math.round(bv * mul)));
        }

        let a = 0.82;
        if (pOp) {
          const ov = readVal(base, pOp);
          a = dc0 ? sigmoid(ov) : ov > 1 ? ov / 255 : ov;
        }
        const sc = pS0 ? Math.min(0.45, Math.exp(Math.max(-8, Math.min(1, readVal(base, pS0))))) : 0.05;
        rawPts.push({ x, y, z, r, g, b, a: Math.max(0.08, Math.min(1, a)), sc });
      }
    } else {
      const bodyText = new TextDecoder('ascii').decode(bytes.subarray(bodyOffset));
      const bodyLines = bodyText.split(/\r?\n/);
      const ix = props.indexOf(px);
      const iy = props.indexOf(py);
      const iz = props.indexOf(pz);
      const id0 = dc0 ? props.indexOf(dc0) : -1;
      const id1 = dc1 ? props.indexOf(dc1) : -1;
      const id2 = dc2 ? props.indexOf(dc2) : -1;
      const ir = pr ? props.indexOf(pr) : -1;
      const ig = pg ? props.indexOf(pg) : -1;
      const ib = pb ? props.indexOf(pb) : -1;

      for (let i = 0; i < Math.min(vertexCount, bodyLines.length); i += step) {
        const cols = bodyLines[i].trim().split(/\s+/);
        if (cols.length < 3) continue;
        const x = parseFloat(cols[ix]);
        const y = -parseFloat(cols[iy]);
        const z = parseFloat(cols[iz]);
        if (!Number.isFinite(x + y + z)) continue;

        let r = 185;
        let g = 195;
        let b = 215;
        if (id0 >= 0 && id1 >= 0 && id2 >= 0) {
          r = Math.max(0, Math.min(255, Math.round((0.5 + SH_C0 * parseFloat(cols[id0])) * 255)));
          g = Math.max(0, Math.min(255, Math.round((0.5 + SH_C0 * parseFloat(cols[id1])) * 255)));
          b = Math.max(0, Math.min(255, Math.round((0.5 + SH_C0 * parseFloat(cols[id2])) * 255)));
        } else if (ir >= 0 && ig >= 0 && ib >= 0) {
          const rv = parseFloat(cols[ir]);
          const gv = parseFloat(cols[ig]);
          const bv = parseFloat(cols[ib]);
          const mul = rv <= 1 && gv <= 1 && bv <= 1 ? 255 : 1;
          r = Math.max(0, Math.min(255, Math.round(rv * mul)));
          g = Math.max(0, Math.min(255, Math.round(gv * mul)));
          b = Math.max(0, Math.min(255, Math.round(bv * mul)));
        }
        rawPts.push({ x, y, z, r, g, b, a: 0.85, sc: 0.05 });
      }
    }

    if (rawPts.length === 0) return 0;

    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const p of rawPts) {
      cx += p.x;
      cy += p.y;
      cz += p.z;
    }
    cx /= rawPts.length;
    cy /= rawPts.length;
    cz /= rawPts.length;

    const projected = rawPts
      .map((p) => {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dz = p.z - cz;
        const dist = Math.hypot(dx, dy, dz);
        if (dist < 0.0001) return null;
        const az = Math.atan2(dx, dz);
        const el = Math.asin(Math.max(-1, Math.min(1, dy / dist)));
        return {
          u: (az / (Math.PI * 2) + 0.5) % 1,
          v: 0.5 - el / Math.PI,
          dist,
          radPx: Math.max(2.6, Math.min(26, (p.sc / Math.max(0.18, dist)) * 120)),
          r: p.r,
          g: p.g,
          b: p.b,
          a: p.a,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    return this.paintProjectedSplats(projected);
  }

  private paintProjectedSplats(
    points: {
      u: number;
      v: number;
      dist: number;
      radPx: number;
      r: number;
      g: number;
      b: number;
      a: number;
    }[],
  ): number {
    if (points.length === 0) return 0;

    // Back-to-front painter sort so nearer splats layer cleanly over distant ones
    points.sort((a, b) => b.dist - a.dist);

    // Compute subtle ambient backdrop base from average splat hue
    let ar = 0;
    let ag = 0;
    let ab = 0;
    for (let i = 0; i < points.length; i++) {
      ar += points[i].r;
      ag += points[i].g;
      ab += points[i].b;
    }
    ar = Math.round((ar / points.length) * 0.42);
    ag = Math.round((ag / points.length) * 0.42);
    ab = Math.round((ab / points.length) * 0.46);

    const ctx = this.ctx;
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bgGrad.addColorStop(0, `rgb(${Math.round(ar * 0.7)},${Math.round(ag * 0.8)},${Math.round(ab * 0.95)})`);
    bgGrad.addColorStop(0.55, `rgb(${ar},${ag},${ab})`);
    bgGrad.addColorStop(1, `rgb(${Math.round(ar * 0.55)},${Math.round(ag * 0.55)},${Math.round(ab * 0.55)})`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Stamp soft Gaussian splat discs (with horizontal wrap at 0 / CANVAS_W)
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const px = p.u * CANVAS_W;
      const py = p.v * CANVAS_H;
      const r = p.radPx;
      const alpha = Math.min(0.88, p.a * 0.82);

      const drawDot = (x: number) => {
        const g = ctx.createRadialGradient(x, py, 0, x, py, r);
        g.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${alpha.toFixed(3)})`);
        g.addColorStop(0.55, `rgba(${p.r},${p.g},${p.b},${(alpha * 0.45).toFixed(3)})`);
        g.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, py, r, 0, Math.PI * 2);
        ctx.fill();
      };

      drawDot(px);
      if (px < r) drawDot(px + CANVAS_W);
      else if (px > CANVAS_W - r) drawDot(px - CANVAS_W);
    }

    return points.length;
  }
}

export const sharedCustomBackdropHub = new CustomBackdropHub();
