// Generates a complete, self-contained, zero-CDN offline single-file WebGL2 HTML game
// for PAPER SKY that runs locally from disk in Mac Safari and Chrome.

import {
  AMBIENT_CARD_FS,
  AMBIENT_CARD_VS,
  ATLAS_COLS,
  ATLAS_ROWS,
  CARD_ATLAS_FS,
  CARD_ATLAS_VS,
  CARD_BACK_INDEX,
  CARD_SUMMIT_INDEX,
  CARD_TILE_H,
  CARD_TILE_W,
  CONTACT_SHADOW_FS,
  CONTACT_SHADOW_VS,
  EMOTE_DECK,
  PAPER_GIRL_FS,
  PAPER_GIRL_VS,
  PAPER_SKY_DOME_FS,
  PAPER_SKY_DOME_VS,
} from '../engine/paperSky/CardAtlasShader';

function escapeInlineScript(code: string): string {
  return code.replace(/<\/script>/gi, '<\\/script>');
}

export function buildStandalonePaperSkyHtml(): string {
  const shadersJson = JSON.stringify({
    skyVs: PAPER_SKY_DOME_VS,
    skyFs: PAPER_SKY_DOME_FS,
    cardVs: CARD_ATLAS_VS,
    cardFs: CARD_ATLAS_FS,
    girlVs: PAPER_GIRL_VS,
    girlFs: PAPER_GIRL_FS,
    shadowVs: CONTACT_SHADOW_VS,
    shadowFs: CONTACT_SHADOW_FS,
    particleVs: AMBIENT_CARD_VS,
    particleFs: AMBIENT_CARD_FS,
  });

  const deckJson = JSON.stringify(EMOTE_DECK);

  const scriptBody = escapeInlineScript(`
(() => {
  const SHADERS = ${shadersJson};
  const EMOTE_DECK = ${deckJson};
  const ATLAS_COLS = ${ATLAS_COLS};
  const ATLAS_ROWS = ${ATLAS_ROWS};
  const CARD_TILE_W = ${CARD_TILE_W};
  const CARD_TILE_H = ${CARD_TILE_H};
  const CARD_BACK_INDEX = ${CARD_BACK_INDEX};
  const CARD_SUMMIT_INDEX = ${CARD_SUMMIT_INDEX};

  const canvas = document.getElementById('c');
  const hudCard = document.getElementById('hud-card');
  const hudAlt = document.getElementById('hud-alt');
  const hint = document.getElementById('hint');
  const fallback = document.getElementById('fallback');

  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) {
    fallback.style.display = 'flex';
    return;
  }

  // ── 1. Procedural 54-Card Crisp Pixel Web Emote Deck Atlas ────────────────
  const MOODS = {
    crimson: { ink: '#c91c28', tint: '#fae4e2', accent: '#f05a4f' },
    cobalt:  { ink: '#1d4eb8', tint: '#e4eefb', accent: '#4da3e8' },
    ink:     { ink: '#161a22', tint: '#eceae2', accent: '#485566' },
    violet:  { ink: '#6b29b8', tint: '#efe6fb', accent: '#a86df2' }
  };

  function drawPxGlyph(ctx, mood, cx, cy, px) {
    const x0 = Math.round(cx - 3.5 * px), y0 = Math.round(cy - 3.5 * px);
    const pat = mood === 'crimson'
      ? ['.##.##.','#######','#######','.#####.','..###..','...#...']
      : mood === 'cobalt'
      ? ['...#...','...#...','..###..','#######','..###..','...#...','...#...']
      : mood === 'violet'
      ? ['...#...','..###..','.#####.','#######','.#####.','..###..','...#...']
      : ['..###..','.#####.','##.#.##','#######','##...##','.#####.','..###..'];
    for (let r = 0; r < pat.length; r++) {
      for (let c = 0; c < pat[r].length; c++) {
        if (pat[r][c] === '#') ctx.fillRect(x0 + c * px, y0 + r * px, px, px);
      }
    }
  }

  function createAtlasTex() {
    const c = document.createElement('canvas');
    c.width = ATLAS_COLS * CARD_TILE_W; c.height = ATLAS_ROWS * CARD_TILE_H;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#f5f0e2'; ctx.fillRect(0,0,c.width,c.height);
    for (let idx = 0; idx < EMOTE_DECK.length; idx++) {
      const col = idx % ATLAS_COLS, row = Math.floor(idx / ATLAS_COLS);
      const x = col * CARD_TILE_W, y = row * CARD_TILE_H, w = CARD_TILE_W, h = CARD_TILE_H;
      const spec = EMOTE_DECK[idx], pal = MOODS[spec.mood];
      ctx.fillStyle = '#f5f0e2'; ctx.fillRect(x,y,w,h);
      ctx.fillStyle = pal.tint; ctx.fillRect(x+8,y+8,w-16,h-16);
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.strokeRect(x+7,y+7,w-14,h-14);
      ctx.fillStyle = pal.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.font = 'bold 14px ui-monospace,SFMono-Regular,Menlo,monospace';
      ctx.fillText(spec.corner, x+12, y+11);
      drawPxGlyph(ctx, spec.mood, x+22, y+35, 2);
      ctx.save(); ctx.translate(x+w-12, y+h-11); ctx.rotate(Math.PI); ctx.fillText(spec.corner, 0, 0); ctx.restore();
      drawPxGlyph(ctx, spec.mood, x+w-22, y+h-35, 2);
      if (spec.royal) {
        ctx.fillStyle = '#fbf7ec'; ctx.fillRect(x+14,y+44,w-28,h-88);
        ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.strokeRect(x+14,y+44,w-28,h-88);
        ctx.fillStyle = '#d49a2a'; ctx.fillRect(x+18,y+48,w-36,4); ctx.fillRect(x+18,y+h-52,w-36,4);
        ctx.fillStyle = pal.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = spec.center.length > 7 ? 'bold 14px ui-monospace,monospace' : 'bold 17px ui-monospace,monospace';
        ctx.fillText(spec.center, x+w*0.5, y+h*0.5);
      } else {
        ctx.fillStyle = pal.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = spec.center.length >= 3 ? 'bold 30px ui-monospace,monospace' : 'bold 38px ui-monospace,monospace';
        ctx.fillText(spec.center, x+w*0.5, y+h*0.5);
        ctx.fillStyle = pal.accent;
        const n = Math.min(spec.pipCount, 4);
        for (let i = 0; i < n; i++) {
          const px = x + w*0.5 + (i - (n-1)*0.5)*16;
          drawPxGlyph(ctx, spec.mood, px, y+h*0.72, 1);
        }
      }
    }
    // Crimson <3 Card Back (52)
    {
      const x = (CARD_BACK_INDEX % ATLAS_COLS)*CARD_TILE_W, y = Math.floor(CARD_BACK_INDEX / ATLAS_COLS)*CARD_TILE_H;
      const w = CARD_TILE_W, h = CARD_TILE_H;
      ctx.fillStyle = '#f5f0e2'; ctx.fillRect(x,y,w,h);
      ctx.fillStyle = '#a81824'; ctx.fillRect(x+8,y+8,w-16,h-16);
      ctx.strokeStyle = '#f5f0e2'; ctx.lineWidth = 2; ctx.strokeRect(x+14,y+14,w-28,h-28);
      ctx.fillStyle = '#f5f0e2'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font='bold 24px ui-monospace,monospace'; ctx.fillText('<3', x+w*0.5, y+h*0.5);
    }
    // Golden Summit Emote Card (53)
    {
      const x = (CARD_SUMMIT_INDEX % ATLAS_COLS)*CARD_TILE_W, y = Math.floor(CARD_SUMMIT_INDEX / ATLAS_COLS)*CARD_TILE_H;
      const w = CARD_TILE_W, h = CARD_TILE_H;
      ctx.fillStyle = '#fbf4df'; ctx.fillRect(x,y,w,h);
      ctx.strokeStyle = '#d4941f'; ctx.lineWidth = 4; ctx.strokeRect(x+8,y+8,w-16,h-16);
      ctx.fillStyle = '#c91c28'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font='bold 26px ui-monospace,monospace'; ctx.fillText('\\\\o/', x+w*0.5, y+h*0.44);
      ctx.fillStyle = '#b87414'; ctx.font='bold 16px ui-monospace,monospace'; ctx.fillText('★ XD ★', x+w*0.5, y+h*0.64);
    }
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
    return tex;
  }

  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function link(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  const skyProg = link(SHADERS.skyVs, SHADERS.skyFs);
  const cardProg = link(SHADERS.cardVs, SHADERS.cardFs);
  const girlProg = link(SHADERS.girlVs, SHADERS.girlFs);
  const shadowProg = link(SHADERS.shadowVs, SHADERS.shadowFs);
  const particleProg = link(SHADERS.particleVs, SHADERS.particleFs);
  const cardAtlasTex = createAtlasTex();
  const emptyVao = gl.createVertexArray();

  // ── 2. 5-Layer Sprite-Stacked Card Geometry ───────────────────────────────
  function makeCardMesh() {
    const verts = [], inds = []; let vc = 0;
    const push = (x,y,z,nx,ny,nz,u,v,f) => { verts.push(x,y,z,nx,ny,nz,u,v,f); return vc++; };
    const seg = 4, hi = 0.476;
    const cap = (top) => {
      const s0 = vc, y = top ? 0.5 : -0.5, ny = top ? 1 : -1, fl = top ? 1 : -1;
      for (let iz = 0; iz <= seg; iz++) for (let ix = 0; ix <= seg; ix++) {
        push(-hi+(ix/seg)*hi*2, y, -hi+(iz/seg)*hi*2, 0, ny, 0, ix/seg, iz/seg, fl);
      }
      for (let iz = 0; iz < seg; iz++) for (let ix = 0; ix < seg; ix++) {
        const a = s0 + iz*(seg+1) + ix, b1 = a+1, c1 = a+(seg+1), d1 = c1+1;
        if (top) inds.push(a,c1,b1, b1,c1,d1); else inds.push(a,b1,c1, b1,d1,c1);
      }
    };
    cap(true); cap(false);
    const layers = [[0.5,0.3,0.476],[0.3,0.1,0.494],[0.1,-0.1,0.5],[-0.1,-0.3,0.492],[-0.3,-0.5,0.476]];
    const nrm = [[0,-1],[1,0],[0,1],[-1,0]];
    for (let li = 0; li < layers.length; li++) {
      const [yt, yb, r] = layers[li];
      const pts = [[-r,-r],[r,-r],[r,r],[-r,r]];
      for (let s = 0; s < 4; s++) {
        const n = (s+1)%4, [x0,z0]=pts[s], [x1,z1]=pts[n], [ex,ez]=nrm[s];
        const e0=push(x0,yt,z0,ex,0,ez,0,li/5,0), e1=push(x1,yt,z1,ex,0,ez,1,li/5,0);
        const e2=push(x0,yb,z0,ex,0,ez,0,(li+1)/5,0), e3=push(x1,yb,z1,ex,0,ez,1,(li+1)/5,0);
        inds.push(e0,e1,e2,e1,e3,e2);
      }
    }
    return { v: new Float32Array(verts), i: new Uint16Array(inds) };
  }

  function makeBox(tw, bw, h, d, py, ft, fb) {
    const t=tw/2, b=bw/2, y0=-py, y1=h-py, hd=d/2, verts=[], inds=[]; let c=0;
    const q=(p0,p1,p2,p3,nx,ny,nz)=>{const i0=c++,i1=c++,i2=c++,i3=c++;
      verts.push(...p0,nx,ny,nz,...p1,nx,ny,nz,...p2,nx,ny,nz,...p3,nx,ny,nz); inds.push(i0,i1,i2,i0,i2,i3);};
    const pack=(p,fl)=>[p[0],p[1],p[2]];
    const quad=(a,b1,c1,d1,nx,ny,nz,fa,fb1,fc,fd)=>{
      const i0=c++,i1=c++,i2=c++,i3=c++;
      verts.push(a[0],a[1],a[2],nx,ny,nz,fa, b1[0],b1[1],b1[2],nx,ny,nz,fb1, c1[0],c1[1],c1[2],nx,ny,nz,fc, d1[0],d1[1],d1[2],nx,ny,nz,fd);
      inds.push(i0,i1,i2,i0,i2,i3);
    };
    quad([-b,y0,hd],[b,y0,hd],[t,y1,hd],[-t,y1,hd],0,0,1,fb,fb,ft,ft);
    quad([b,y0,-hd],[-b,y0,-hd],[-t,y1,-hd],[t,y1,-hd],0,0,-1,fb,fb,ft,ft);
    quad([-t,y1,hd],[t,y1,hd],[t,y1,-hd],[-t,y1,-hd],0,1,0,ft,ft,ft,ft);
    quad([-b,y0,-hd],[b,y0,-hd],[b,y0,hd],[-b,y0,hd],0,-1,0,fb,fb,fb,fb);
    quad([b,y0,hd],[b,y0,-hd],[t,y1,-hd],[t,y1,hd],1,0,0,fb,fb,ft,ft);
    quad([-b,y0,-hd],[-b,y0,hd],[-t,y1,hd],[-t,y1,-hd],-1,0,0,fb,fb,ft,ft);
    return { v: new Float32Array(verts), i: new Uint16Array(inds) };
  }

  function makeCape() {
    const verts=[], inds=[], cols=6, rows=4;
    for (let r=0; r<=rows; r++) {
      const tr=r/rows, hs=0.24+Math.sin(tr*Math.PI*0.78+0.35)*0.68, y=0.08-tr*0.86, zb=-0.04-tr*0.18;
      for (let c=0; c<=cols; c++) {
        const tc=c/cols, x=(tc*2-1)*hs, en=Math.abs(tc*2-1);
        verts.push(x, y+en*en*0.12, zb, 0, 0.35, -0.94, Math.min(1, tr*0.72+en*0.58));
      }
    }
    for (let r=0; r<rows; r++) for (let c=0; c<cols; c++) {
      const a=r*(cols+1)+c, b1=a+1, d1=a+cols+1, e1=d1+1;
      inds.push(a,d1,b1, b1,d1,e1, a,b1,d1, b1,e1,d1);
    }
    return { v: new Float32Array(verts), i: new Uint16Array(inds) };
  }

  // ── 3. World Cards (16 Walkable + 16 Cathedral Monoliths) ─────────────────
  const walkableSpecs = [
    [0,2,0,0,4.8,6.4,0,1,0.14],[0.4,3.1,-8.2,-0.08,4.4,5.9,13,0,0.24],[3.6,4.4,-16.4,0.14,4.2,5.6,26,0,0.28],
    [-1.8,5.9,-24.8,-0.22,3.9,5.3,3,0,0.32],[-6.4,7.5,-33.6,-0.15,3.8,5.2,14,0,0.34],[-1.2,9.2,-42.8,0.06,4.4,5.9,39,1,0.22],
    [5.8,10.7,-51.6,0.24,3.7,5.0,15,0,0.36],[9.2,12.4,-61.2,0.12,3.6,4.9,29,0,0.38],[3.4,14.0,-70.6,-0.18,3.7,5.1,32,0,0.36],
    [-4.2,15.6,-80.4,-0.26,3.6,4.9,42,0,0.4],[-8.6,17.5,-90.2,-0.05,4.3,5.8,11,1,0.24],[-2.4,19.3,-99.8,0.2,3.5,4.8,6,0,0.4],
    [5.4,21.2,-109.2,0.15,3.5,4.8,25,0,0.42],[2.0,23.1,-119.0,-0.16,3.5,4.8,30,0,0.42],[-2.8,25.0,-128.4,-0.08,3.8,5.2,4,0,0.34],
    [0,27.2,-138.8,0,5.4,7.2,CARD_SUMMIT_INDEX,1,0.18]
  ];
  const monolithSpecs = [
    [-24,12,-22,1.48,0.35,0.12,16,24,12],[26,15,-28,1.52,-0.42,-0.1,18,26,25],
    [-34,20,-56,1.38,0.58,0.24,22,32,CARD_BACK_INDEX],[35,24,-64,1.44,-0.52,-0.22,22,32,36],
    [-58,26,-92,1.55,0.25,0.08,28,42,0],[56,30,-98,1.54,-0.28,-0.06,28,42,13],
    [-26,-10,-40,0.18,0.45,0.14,18,26,CARD_BACK_INDEX],[28,-9,-46,-0.15,-0.35,-0.18,19,27,50],
    [-30,38,-158,1.46,0.42,0.16,24,36,11],[30,38,-158,1.46,-0.42,-0.16,24,36,51],
    [0,54,-185,1.56,0,0,36,52,CARD_SUMMIT_INDEX],[-84,42,-145,1.52,0.65,0.14,32,48,CARD_BACK_INDEX],
    [86,44,-152,1.5,-0.62,-0.12,32,48,26],[0,42,-72,0.22,0.34,-0.15,24,34,CARD_BACK_INDEX]
  ];

  const cards = [];
  walkableSpecs.forEach((s, i) => cards.push({
    id: i, bx: s[0], by: s[1], bz: s[2], rx: 0, ry: s[3], rz: 0, sx: s[4], sy: 0.24, sz: s[5],
    ci: s[6], walk: true, cp: !!s[7], amp: s[8], freq: 0.82+(i%3)*0.08, phase: i*0.62,
    cy: s[1], py: s[1], dip: 0, dipV: 0, tx: 0, txV: 0, tz: 0, tzV: 0, vis: i === 0
  }));
  monolithSpecs.forEach((m, i) => cards.push({
    id: 100+i, bx: m[0], by: m[1], bz: m[2], rx: m[3], ry: m[4], rz: m[5], sx: m[6], sy: 0.42, sz: m[7],
    ci: m[8], walk: false, cp: false, amp: 0.6, freq: 0.3, phase: i*1.1,
    cy: m[1], py: m[1], dip: 0, dipV: 0, tx: 0, txV: 0, tz: 0, tzV: 0, vis: false
  }));

  // Upload Card VAO (stride 20 floats = 80 bytes: mat4 + vec4 cardMeta)
  const cg = makeCardMesh();
  const instBufData = new Float32Array(cards.length * 20);
  const cardVao = gl.createVertexArray(); gl.bindVertexArray(cardVao);
  const cvbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, cvbo); gl.bufferData(gl.ARRAY_BUFFER, cg.v, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,36,0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,3,gl.FLOAT,false,36,12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2,2,gl.FLOAT,false,36,24);
  gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3,1,gl.FLOAT,false,36,32);
  const cibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cg.i, gl.STATIC_DRAW);
  const ivbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ivbo); gl.bufferData(gl.ARRAY_BUFFER, instBufData.byteLength, gl.DYNAMIC_DRAW);
  for (let col=0; col<4; col++) { gl.enableVertexAttribArray(4+col); gl.vertexAttribPointer(4+col,4,gl.FLOAT,false,80,col*16); gl.vertexAttribDivisor(4+col,1); }
  gl.enableVertexAttribArray(8); gl.vertexAttribPointer(8,4,gl.FLOAT,false,80,64); gl.vertexAttribDivisor(8,1);

  // Girl Parts
  const ink=[0.075,0.085,0.105], dInk=[0.055,0.065,0.082], red=[0.76,0.12,0.14];
  const girlParts = [
    { id:'torso', m:makeBox(0.28,0.48,0.72,0.14,0,0,0.28), col:ink },
    { id:'head', m:makeBox(0.26,0.24,0.3,0.24,0,0,0), col:dInk },
    { id:'hairL', m:makeBox(0.11,0.19,0.56,0.06,0.52,0.05,0.95), col:dInk },
    { id:'hairR', m:makeBox(0.11,0.19,0.56,0.06,0.52,0.05,0.95), col:dInk },
    { id:'armL', m:makeBox(0.11,0.08,0.52,0.08,0.48,0,0.15), col:ink },
    { id:'armR', m:makeBox(0.11,0.08,0.52,0.08,0.48,0,0.15), col:ink },
    { id:'legL', m:makeBox(0.13,0.09,0.58,0.1,0.54,0,0), col:dInk },
    { id:'legR', m:makeBox(0.13,0.09,0.58,0.1,0.54,0,0), col:dInk },
    { id:'cape', m:makeCape(), col:[0.11,0.13,0.16] },
    { id:'scarf', m:makeBox(0.12,0.06,0.62,0.04,0.6,0.1,1), col:red }
  ].map(p => {
    const vao=gl.createVertexArray(); gl.bindVertexArray(vao);
    const vbo=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,vbo); gl.bufferData(gl.ARRAY_BUFFER,p.m.v,gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,28,0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,3,gl.FLOAT,false,28,12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2,1,gl.FLOAT,false,28,24);
    const ibo=gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,p.m.i,gl.STATIC_DRAW);
    return { id:p.id, vao, count:p.m.i.length, col:p.col };
  });

  // GPU Swirling Ribbon & Curl Particles (8 floats = 32 bytes: aOrigin vec4 + aParam vec4)
  const PCOUNT = 240;
  const pVao = gl.createVertexArray(); gl.bindVertexArray(pVao);
  const pq = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,pq); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-0.5,-0.5,0.5,-0.5,-0.5,0.5,0.5,0.5]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  const pd = new Float32Array(PCOUNT*8);
  let sd=4219; const rnd=()=>{sd=(sd*16807)%2147483647;return (sd-1)/2147483646;};
  for (let i=0;i<PCOUNT;i++){
    const o=i*8, isRib=i<100;
    if(isRib){ const side=i%2===0?-1:1; pd[o]=side*(12+rnd()*14); pd[o+1]=6+rnd()*16; pd[o+2]=-rnd()*160; pd[o+3]=i/100+rnd()*0.02; pd[o+4]=0.7+rnd()*0.6; pd[o+5]=1.4+rnd()*2.1; pd[o+6]=rnd()<0.6?2:1; pd[o+7]=1; }
    else { pd[o]=(rnd()-0.5)*96; pd[o+1]=-6+rnd()*52; pd[o+2]=(rnd()-0.5)*150; pd[o+3]=rnd(); pd[o+4]=0.4+rnd()*0.65; pd[o+5]=0.7+rnd()*1.5; pd[o+6]=rnd()>0.5?1:0; pd[o+7]=0; }
  }
  const piv = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,piv); gl.bufferData(gl.ARRAY_BUFFER,pd,gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,4,gl.FLOAT,false,32,0); gl.vertexAttribDivisor(1,1);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2,4,gl.FLOAT,false,32,16); gl.vertexAttribDivisor(2,1);
  gl.bindVertexArray(null);

  // Math helpers
  function writeTrs(out,o,px,py,pz,rx,ry,rz,sx,sy,sz){
    const cx=Math.cos(rx),sx1=Math.sin(rx),cy=Math.cos(ry),sy1=Math.sin(ry),cz=Math.cos(rz),sz1=Math.sin(rz);
    out[o]=(cy*cz+sy1*sx1*sz1)*sx; out[o+1]=(cx*sz1)*sx; out[o+2]=(-sy1*cz+cy*sx1*sz1)*sx; out[o+3]=0;
    out[o+4]=(-cy*sz1+sy1*sx1*cz)*sy; out[o+5]=(cx*cz)*sy; out[o+6]=(sy1*sz1+cy*sx1*cz)*sy; out[o+7]=0;
    out[o+8]=(sy1*cx)*sz; out[o+9]=(-sx1)*sz; out[o+10]=(cy*cx)*sz; out[o+11]=0;
    out[o+12]=px; out[o+13]=py; out[o+14]=pz; out[o+15]=1;
  }
  function persp(out,fov,asp,n,f){const k=1/Math.tan(fov/2),nf=1/(n-f);out.fill(0);out[0]=k/asp;out[5]=k;out[10]=(f+n)*nf;out[11]=-1;out[14]=2*f*n*nf;}
  function lookAt(out,ex,ey,ez,tx,ty,tz,ux,uy,uz){
    let zx=ex-tx,zy=ey-ty,zz=ez-tz,zl=Math.hypot(zx,zy,zz)||1;zx/=zl;zy/=zl;zz/=zl;
    let xx=uy*zz-uz*zy,xy=uz*zx-ux*zz,xz=ux*zy-uy*zx,xl=Math.hypot(xx,xy,xz)||1;xx/=xl;xy/=xl;xz/=xl;
    const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;
    out[0]=xx;out[1]=yx;out[2]=zx;out[3]=0;out[4]=xy;out[5]=yy;out[6]=zy;out[7]=0;out[8]=xz;out[9]=yz;out[10]=zz;out[11]=0;
    out[12]=-(xx*ex+xy*ey+xz*ez);out[13]=-(yx*ex+yy*ey+yz*ez);out[14]=-(zx*ex+zy*ey+zz*ez);out[15]=1;
  }
  function mul(out,a,b){for(let c=0;c<4;c++){const b0=b[c*4],b1=b[c*4+1],b2=b[c*4+2],b3=b[c*4+3];
    out[c*4]=a[0]*b0+a[4]*b1+a[8]*b2+a[12]*b3; out[c*4+1]=a[1]*b0+a[5]*b1+a[9]*b2+a[13]*b3;
    out[c*4+2]=a[2]*b0+a[6]*b1+a[10]*b2+a[14]*b3; out[c*4+3]=a[3]*b0+a[7]*b1+a[11]*b2+a[15]*b3;}}

  // State (with Triple-Jump, Hover-Glide, Butterfly Dash, and Dream Sight)
  const p = { x:0, y:2.2, z:1.4, vx:0, vy:0, vz:0, yaw:0, roll:0, pitch:0, ground:true, cid:0,
    coyote:0.14, jbuf:0, jumps:0, dashT:0, dashCd:0, dashX:0, dashZ:-1, dream:0, spread:0, diveE:0, wasD:false, run:0, cpId:0, visited:1 };
  let camPos=[0,5.2,8.6], camTgt=[0,3,-2], camYaw=0, tCamYaw=0, camPitch=0.24, tCamPitch=0.24, fov=56;
  const keys={}; let jQueued=false, dQueued=false, dreamOn=false, tDrag=false, tMoved=false, lx=0, ly=0, vX=0, vZ=0, moved=false;

  addEventListener('keydown', e => {
    const fresh = !keys[e.code]; keys[e.code]=true;
    if(e.code==='Space'){e.preventDefault();if(fresh)jQueued=true;moved=true;}
    if(e.code==='KeyF' && fresh){dQueued=true;moved=true;}
    if(e.code==='KeyQ' && fresh){dreamOn=!dreamOn;moved=true;}
    if(e.code==='KeyR' && fresh) respawn();
  });
  addEventListener('keyup', e => { keys[e.code]=false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    if(e.button===2){dQueued=true;moved=true;return;}
    tDrag=true; tMoved=false; lx=e.clientX; ly=e.clientY; canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if(!tDrag) return; const dx=e.clientX-lx, dy=e.clientY-ly;
    if(Math.abs(dx)+Math.abs(dy)>5){tMoved=true;moved=true;}
    tCamYaw -= dx*0.0052; tCamPitch = Math.max(-0.18, Math.min(0.65, tCamPitch+dy*0.0038));
    if(e.pointerType==='touch'){ vZ=Math.max(-1,Math.min(1,vZ-dy*0.015)); vX=Math.max(-1,Math.min(1,dx*0.04)); }
    lx=e.clientX; ly=e.clientY;
  });
  canvas.addEventListener('pointerup', e => { if(tDrag && !tMoved && e.pointerType==='touch'){jQueued=true;moved=true;} tDrag=false; vX=0; vZ=0; });

  function respawn() {
    const cp = cards.find(c => c.id === p.cpId) || cards[0];
    p.x=cp.bx; p.y=cp.cy+cp.sy*0.5+0.12; p.z=cp.bz+1.0; p.vx=p.vy=p.vz=0; p.ground=true; p.cid=cp.id; p.coyote=0.14; p.jumps=0; p.dashT=0;
  }

  function resize(){ canvas.width=Math.max(320,Math.round(innerWidth*0.5)); canvas.height=Math.max(200,Math.round(innerHeight*0.5)); }
  addEventListener('resize', resize); resize();

  const proj=new Float32Array(16), view=new Float32Array(16), vp=new Float32Array(16);
  const gRoot=new Float32Array(16), pLoc=new Float32Array(16), pWld=new Float32Array(16);
  let last=performance.now(), elapsed=0;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.04, Math.max(0.001, (now-last)/1000)); last = now; elapsed += dt;

    // Step kinematic cards + spring-damper
    for (const c of cards) {
      c.py = c.cy; c.cy = c.by + c.amp * Math.sin(c.freq * elapsed + c.phase);
      if (c.walk) {
        c.dipV += (-48*c.dip - 7.4*c.dipV)*dt; c.dip += c.dipV*dt;
        c.txV += (-42*c.tx - 6.8*c.txV)*dt; c.tx += c.txV*dt;
        c.tzV += (-42*c.tz - 6.8*c.tzV)*dt; c.tz += c.tzV*dt;
      }
    }

    let fwd=vZ, str=vX;
    if(keys['KeyW']||keys['ArrowUp']) fwd+=1; if(keys['KeyS']||keys['ArrowDown']) fwd-=1;
    if(keys['KeyD']||keys['ArrowRight']) str+=1; if(keys['KeyA']||keys['ArrowLeft']) str-=1;
    if(Math.abs(fwd)>0.05||Math.abs(str)>0.05) moved=true;
    const dive = !!(keys['ShiftLeft']||keys['ShiftRight']);
    if(!tDrag && Math.abs(str)>0.05) tCamYaw -= str*dt*0.65;
    camYaw += (tCamYaw-camYaw)*Math.min(1,dt*6.5); camPitch += (tCamPitch-camPitch)*Math.min(1,dt*6.5);

    p.dream += ((dreamOn ? 1 : 0) - p.dream) * Math.min(1, dt * 7);
    if (p.ground && p.cid !== null) { const pl = cards.find(c=>c.id===p.cid); if(pl) p.y += (pl.cy - pl.py); }
    p.coyote = p.ground ? 0.14 : Math.max(0, p.coyote - dt);
    if (p.ground) p.jumps = 0;
    p.jbuf = jQueued ? 0.12 : Math.max(0, p.jbuf - dt);
    if (p.dashCd > 0) p.dashCd = Math.max(0, p.dashCd - dt);
    jQueued = false;

    const fx=-Math.sin(camYaw), fz=-Math.cos(camYaw), rx=Math.cos(camYaw), rz=-Math.sin(camYaw);
    let wx=fx*fwd+rx*str, wz=fz*fwd+rz*str; const wl=Math.hypot(wx,wz); if(wl>0.001){wx/=wl;wz/=wl;}
    if (wl>0.08 && p.dashT<=0) { let d=Math.atan2(-wx,-wz)-p.yaw; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2; p.yaw+=d*Math.min(1,dt*(p.ground?13:8)); }

    if (dQueued && p.dashCd<=0) {
      p.dashX=wl>0.1?wx:-Math.sin(p.yaw); p.dashZ=wl>0.1?wz:-Math.cos(p.yaw);
      p.dashT=0.24; p.dashCd=0.68; p.vx=p.dashX*20; p.vz=p.dashZ*20; p.vy=Math.max(p.vy*0.2,1.2); p.ground=false; p.cid=null;
    }
    dQueued = false;

    if (p.jbuf>0 && p.dashT<=0) {
      if (p.coyote>0) { p.vy=10.8; p.ground=false; p.cid=null; p.coyote=0; p.jbuf=0; p.jumps=1; if(wl>0.1){p.vx+=wx*2.2;p.vz+=wz*2.2;} }
      else if (p.jumps<3) { p.jumps=Math.max(2,p.jumps+1); p.vy=p.jumps===2?9.6:8.9; p.jbuf=0; p.wasD=false; if(wl>0.1){p.vx=p.vx*0.55+wx*6.8;p.vz=p.vz*0.55+wz*6.8;} }
    }

    if (p.dashT>0) {
      p.dashT=Math.max(0,p.dashT-dt); p.vx=p.dashX*19.5; p.vz=p.dashZ*19.5; p.vy=0.6; p.spread+=(0.85-p.spread)*Math.min(1,dt*14);
    } else if (p.ground) {
      p.vx+=(wx*9.6-p.vx)*Math.min(1,dt*14); p.vz+=(wz*9.6-p.vz)*Math.min(1,dt*14);
      p.diveE=Math.max(0,p.diveE-dt*2.5); p.wasD=false; p.spread+=-p.spread*Math.min(1,dt*10);
      p.pitch+=(wl*0.14-p.pitch)*Math.min(1,dt*10); p.roll+=-p.roll*Math.min(1,dt*10); p.run+=Math.hypot(p.vx,p.vz)*dt*1.5;
    } else {
      const hover = !dive && !!keys['Space'] && p.vy < 0.8;
      if (dive) {
        p.vy=Math.max(-21, p.vy-26*dt); p.diveE=Math.min(1,p.diveE+dt*1.35);
        p.vx+=wx*16*dt; p.vz+=wz*16*dt; p.spread+=(0.22-p.spread)*Math.min(1,dt*9); p.pitch+=(0.95-p.pitch)*Math.min(1,dt*8);
      } else {
        if (p.wasD && p.diveE>0.22) { p.vy=Math.max(p.vy,2.2+p.diveE*6.8); p.vx+=-Math.sin(p.yaw)*(3.2+p.diveE*4.5); p.vz+=-Math.cos(p.yaw)*(3.2+p.diveE*4.5); p.diveE=0; }
        const fall=p.vy<0; p.vy-=(hover?6.2:(fall?15.0:19.0))*dt; const sink=hover?-2.1:-9.5; if(p.vy<sink) p.vy+=(sink-p.vy)*Math.min(1,dt*8);
        p.vx+=wx*21*dt; p.vz+=wz*21*dt; const dr=Math.pow(hover?0.38:0.44,dt); p.vx*=dr; p.vz*=dr;
        p.spread+=((hover?1:(fall?0.65:0.4))-p.spread)*Math.min(1,dt*8); p.pitch+=((hover?0.24:(fall?0.35:-0.16))-p.pitch)*Math.min(1,dt*6.5);
      }
      p.wasD=dive; const hs=Math.hypot(p.vx,p.vz), ms=dive?17.5:13.8; if(hs>ms){p.vx*=ms/hs;p.vz*=ms/hs;}
      p.roll+=(-str*0.44-p.roll)*Math.min(1,dt*7);
    }

    const prevY=p.y; p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=p.vz*dt;
    const wasG=p.ground, pCid=p.cid; p.ground=false; p.cid=null;
    for (const c of cards) {
      if (!c.walk) continue;
      const dx=p.x-c.bx, dz=p.z-c.bz, cr=Math.cos(-c.ry), sr=Math.sin(-c.ry);
      const lcx=dx*cr-dz*sr, lcz=dx*sr+dz*cr;
      if (Math.abs(lcx)<=c.sx*0.5+0.16 && Math.abs(lcz)<=c.sz*0.5+0.16) {
        const top=c.cy+c.sy*0.5;
        if ((prevY>=top-0.35 && p.y<=top+0.18 && p.vy<=0.6) || (wasG && pCid===c.id && Math.abs(p.y-top)<0.45 && p.vy<=0.6)) {
          const imp=Math.min(5.2, 1.4+Math.abs(p.vy)*0.32);
          p.y=top+0.01; p.vy=0; p.ground=true; p.cid=c.id;
          if (!wasG || pCid!==c.id) {
            c.dipV-=imp; c.tzV-=(lcx/(c.sx*0.5))*imp*0.24; c.txV+=(lcz/(c.sz*0.5))*imp*0.2;
            p.vx*=0.72; p.vz*=0.72;
            if(!c.vis){c.vis=true;p.visited++;} if(c.cp) p.cpId=c.id;
          }
          break;
        }
      }
    }
    if (p.y < -16) respawn();

    const spd=Math.hypot(p.vx,p.vy,p.vz);
    fov += ((dive && !p.ground ? 66 : 55+Math.min(5,spd*0.25)) - fov)*Math.min(1,dt*4.5);
    const dist=7.4+(dive?1.1:0), elev=3.1+camPitch*4.2;
    const cl=1-Math.pow(0.0018,dt), tl=1-Math.pow(0.0007,dt);
    camPos[0]+=(p.x+Math.sin(camYaw)*dist-camPos[0])*cl; camPos[1]+=(p.y+elev-camPos[1])*cl; camPos[2]+=(p.z+Math.cos(camYaw)*dist-camPos[2])*cl;
    camTgt[0]+=(p.x-Math.sin(camYaw)*2.2-camTgt[0])*tl; camTgt[1]+=(p.y+1.15-camTgt[1])*tl; camTgt[2]+=(p.z-Math.cos(camYaw)*2.2-camTgt[2])*tl;

    // Render
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const fovR=fov*Math.PI/180, asp=canvas.width/Math.max(1,canvas.height);
    persp(proj,fovR,asp,0.25,360);
    lookAt(view,camPos[0],camPos[1],camPos[2],camTgt[0],camTgt[1],camTgt[2],Math.sin(p.roll*0.16),Math.cos(p.roll*0.16),0);
    mul(vp,proj,view);

    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    gl.useProgram(skyProg); gl.bindVertexArray(emptyVao);
    gl.uniform2f(gl.getUniformLocation(skyProg,'uRes'),canvas.width,canvas.height);
    gl.uniform1f(gl.getUniformLocation(skyProg,'uTime'),elapsed);
    gl.uniform3f(gl.getUniformLocation(skyProg,'uCamRight'),view[0],view[4],view[8]);
    gl.uniform3f(gl.getUniformLocation(skyProg,'uCamUp'),view[1],view[5],view[9]);
    gl.uniform3f(gl.getUniformLocation(skyProg,'uCamForward'),-view[2],-view[6],-view[10]);
    gl.uniform1f(gl.getUniformLocation(skyProg,'uTanHalfFov'),Math.tan(fovR*0.5));
    gl.uniform1f(gl.getUniformLocation(skyProg,'uDescentReveal'),0);
    gl.uniform1f(gl.getUniformLocation(skyProg,'uDreamSight'),p.dream);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

    gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
    for (let i=0;i<cards.length;i++) {
      const c=cards[i];
      writeTrs(instBufData,i*20,c.bx,c.cy+c.dip,c.bz,c.rx+c.tx,c.ry,c.rz+c.tz,c.sx,c.sy,c.sz);
      instBufData[i*20+16]=c.ci;
      instBufData[i*20+17]=c.ci===CARD_SUMMIT_INDEX?1:(c.cp?(c.id===p.cpId?0.72:0.36):0);
      instBufData[i*20+18]=1.0;
      instBufData[i*20+19]=0.0;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER,ivbo); gl.bufferSubData(gl.ARRAY_BUFFER,0,instBufData);
    gl.useProgram(cardProg); gl.bindVertexArray(cardVao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,cardAtlasTex);
    gl.uniform1i(gl.getUniformLocation(cardProg,'uAtlas'),0);
    gl.uniformMatrix4fv(gl.getUniformLocation(cardProg,'uViewProj'),false,vp);
    gl.uniform3fv(gl.getUniformLocation(cardProg,'uCamPos'),camPos);
    gl.uniform3f(gl.getUniformLocation(cardProg,'uLightDir'),0.42,0.78,-0.46);
    gl.uniform3f(gl.getUniformLocation(cardProg,'uFogColor'),0.89,0.92,0.94);
    gl.uniform1f(gl.getUniformLocation(cardProg,'uFogDensity'),0.0046);
    gl.uniform1f(gl.getUniformLocation(cardProg,'uTime'),elapsed);
    gl.uniform1f(gl.getUniformLocation(cardProg,'uOpacity'),1);
    gl.uniform1f(gl.getUniformLocation(cardProg,'uDreamSight'),p.dream);
    gl.drawElementsInstanced(gl.TRIANGLES,cg.i.length,gl.UNSIGNED_SHORT,0,cards.length);

    // Contact shadow
    let sCard=null, sTop=0, sDelta=99;
    for (const c of cards) {
      if (!c.walk) continue;
      const dx=p.x-c.bx, dz=p.z-c.bz, cr=Math.cos(-c.ry), sr=Math.sin(-c.ry);
      if (Math.abs(dx*cr-dz*sr)<=c.sx*0.5 && Math.abs(dx*sr+dz*cr)<=c.sz*0.5) {
        const top=c.cy+c.dip+c.sy*0.5, d=p.y-top;
        if (d>=-0.35 && d<sDelta) { sDelta=Math.max(0,d); sTop=top; sCard=c; }
      }
    }
    if (sCard && sDelta<14) {
      const nh=Math.min(1,sDelta/12);
      gl.depthMask(false); gl.useProgram(shadowProg); gl.bindVertexArray(emptyVao);
      gl.uniformMatrix4fv(gl.getUniformLocation(shadowProg,'uViewProj'),false,vp);
      gl.uniform3f(gl.getUniformLocation(shadowProg,'uCenter'),p.x,sTop+0.032,p.z);
      gl.uniform1f(gl.getUniformLocation(shadowProg,'uRadius'),0.60+nh*0.95);
      gl.uniform1f(gl.getUniformLocation(shadowProg,'uRotY'),sCard.ry);
      gl.uniform1f(gl.getUniformLocation(shadowProg,'uSlopeX'),sCard.rx);
      gl.uniform1f(gl.getUniformLocation(shadowProg,'uOpacity'),(1-nh)*(1-nh)*0.48);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      gl.depthMask(true);
    }

    // Girl
    gl.useProgram(girlProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(girlProg,'uViewProj'),false,vp);
    gl.uniform3fv(gl.getUniformLocation(girlProg,'uCamPos'),camPos);
    gl.uniform1f(gl.getUniformLocation(girlProg,'uTime'),elapsed);
    gl.uniform1f(gl.getUniformLocation(girlProg,'uAirspeed'),spd);
    gl.uniform1f(gl.getUniformLocation(girlProg,'uGlideSpread'),p.spread);
    gl.uniform1f(gl.getUniformLocation(girlProg,'uDashShimmer'),p.dashT>0?p.dashT/0.24:0);
    gl.uniform1f(gl.getUniformLocation(girlProg,'uOpacity'),p.dashT>0?0.65:1);
    writeTrs(gRoot,0,p.x,p.y+0.56,p.z,-p.pitch,p.yaw,p.roll,1,1,1);
    const rs=p.ground?Math.sin(p.run)*0.45:0, ak=p.ground?0:Math.sin(elapsed*4.2)*0.14;
    for (const part of girlParts) {
      let x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1;
      if(part.id==='torso'){y=0.02;}
      else if(part.id==='head'){y=0.74;rx=p.pitch*0.35;}
      else if(part.id==='hairL'){x=-0.14;y=0.94;z=0.08;rx=0.28+Math.min(0.85,spd*0.06);rz=-0.18-p.spread*0.25;}
      else if(part.id==='hairR'){x=0.14;y=0.94;z=0.08;rx=0.28+Math.min(0.85,spd*0.06);rz=0.18+p.spread*0.25;}
      else if(part.id==='armL'){x=-0.17;y=0.66;rz=p.wasD?-0.35:-0.22-p.spread*1.18;rx=p.ground?rs:-0.18;}
      else if(part.id==='armR'){x=0.17;y=0.66;rz=p.wasD?0.35:0.22+p.spread*1.18;rx=p.ground?-rs:-0.18;}
      else if(part.id==='legL'){x=-0.1;y=0.04;rx=p.ground?-rs:0.18+ak;rz=-0.05-p.spread*0.12;}
      else if(part.id==='legR'){x=0.1;y=0.04;rx=p.ground?rs:0.18-ak;rz=0.05+p.spread*0.12;}
      else if(part.id==='cape'){y=0.68;z=0.06;rx=0.24+p.spread*0.56+Math.min(0.45,spd*0.03);sx=0.55+p.spread*0.95;sy=0.88+p.spread*0.22;}
      else if(part.id==='scarf'){y=0.72;z=0.12;rx=0.35+Math.min(0.95,spd*0.08);}
      writeTrs(pLoc,0,x,y,z,rx,ry,rz,sx,sy,sz); mul(pWld,gRoot,pLoc);
      gl.uniformMatrix4fv(gl.getUniformLocation(girlProg,'uModel'),false,pWld);
      gl.uniform3fv(gl.getUniformLocation(girlProg,'uBaseColor'),part.col);
      gl.bindVertexArray(part.vao); gl.drawElements(gl.TRIANGLES,part.count,gl.UNSIGNED_SHORT,0);
    }

    // Ambient curl-noise card particles
    gl.depthMask(false); gl.useProgram(particleProg); gl.bindVertexArray(pVao);
    gl.uniformMatrix4fv(gl.getUniformLocation(particleProg,'uViewProj'),false,vp);
    gl.uniform3fv(gl.getUniformLocation(particleProg,'uCamPos'),camPos);
    gl.uniform3f(gl.getUniformLocation(particleProg,'uAnchorPos'),p.x,p.y,p.z);
    gl.uniform1f(gl.getUniformLocation(particleProg,'uTime'),elapsed);
    gl.uniform3f(gl.getUniformLocation(particleProg,'uFogColor'),0.89,0.91,0.91);
    gl.uniform1f(gl.getUniformLocation(particleProg,'uOpacity'),0.92);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,PCOUNT);
    gl.depthMask(true);

    hudCard.textContent = p.visited + ' / 16';
    hudAlt.textContent = Math.max(0, Math.round((p.y + 4.8) * 14)) + ' ft';
    if (moved) hint.style.opacity = '0.32';
  }
  requestAnimationFrame(frame);
})();
`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>PAPER SKY — Offline Edition</title>
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: #cfe2f2; font-family: Georgia, serif; }
  canvas { display: block; width: 100%; height: 100%; touch-action: none; image-rendering: pixelated; }
  .hud { position: fixed; top: 20px; left: 24px; color: #161b22; pointer-events: none; text-shadow: 0 1px 10px rgba(255,255,255,0.85); }
  .hud h1 { margin: 0; font-size: 20px; letter-spacing: 0.04em; font-weight: 600; }
  .hud p { margin: 4px 0 0; font: 500 12px/1.2 ui-monospace, SFMono-Regular, monospace; font-variant-numeric: tabular-nums; opacity: 0.78; }
  #hint { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); color: #161b22; font: 500 12px/1.3 -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: 0.02em; text-shadow: 0 1px 8px rgba(255,255,255,0.9); pointer-events: none; transition: opacity 0.6s ease; white-space: nowrap; }
  #fallback { display: none; position: fixed; inset: 0; align-items: center; justify-content: center; text-align: center; background: #eef3f7; color: #161b22; padding: 24px; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<div class="hud">
  <h1>PAPER SKY</h1>
  <p>Cards <span id="hud-card">1 / 16</span> · <span id="hud-alt">95 ft</span></p>
</div>
<div id="hint">WASD run · Space ×3 jump &amp; hold glide · F / Right-Click dash · Q dream sight · Shift dive · R checkpoint</div>
<div id="fallback"><div><h2>PAPER SKY</h2><p>WebGL2 is required to render the floating card sky.</p></div></div>
<script>${scriptBody}</script>
</body>
</html>`;
}

export function downloadStandalonePaperSkyHtml(): void {
  const html = buildStandalonePaperSkyHtml();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'paper-sky.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
