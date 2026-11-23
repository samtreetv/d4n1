import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Layers, Minus, X } from 'lucide-react';
import {
  PlayingCardSuit,
  PlayingCardTheme,
  getPlayingCardTheme,
  isRedSuit,
} from './playingCardThemes';

export type PipAspectIndex = 0 | 1 | 2 | 3; // 0=3:4, 1=1:1, 2=4:3, 3=16:9

const PIP_RATIOS: { label: string; ratio: number }[] = [
  { label: '3:4', ratio: 3 / 4 },
  { label: '1:1', ratio: 1 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '16:9', ratio: 16 / 9 },
];

export interface PipUiCardProps {
  id: string;
  code: string;
  title: string;
  /** Playing-card rank index (e.g. 'A', 'K', 'Q', 'J', '2', '3'...) */
  rank?: string;
  /** Playing-card suit glyph */
  suit?: PlayingCardSuit;
  accentHex: string;
  /** Adaptive playing-card stock theme matching the active Visual Engine */
  cardTheme?: PlayingCardTheme;
  /** Normalized initial position in viewport (0..1) so layout scales across screens */
  anchorX: number;
  anchorY: number;
  /** Characteristic geometric side length L (same L*sqrt(r), L/sqrt(r) math as ONAROOM!) */
  initialL: number;
  initialAspect: PipAspectIndex;
  /** Optional subtle architectural resting perspective tilt (deg) */
  restRotY?: number;
  restRotX?: number;
  restSkewY?: number;
  /** Optional overlapping stacked card silhouette behind this card (great for Root Deck Cards!) */
  layered?: boolean;
  /** Dark surface fallback if cardTheme is omitted */
  darkSurface?: boolean;
  /** Optional fanning cascade entrance delay (ms) for dealt sub-cards */
  dealDelayMs?: number;
  /** Optional root-card deck deal state & handler */
  dealCount?: number;
  dealtOpen?: boolean;
  onToggleDeal?: () => void;
  zIndex: number;
  minimized: boolean;
  onFocus: () => void;
  onToggleMinimize: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

function dimsFor(L: number, aspectIdx: PipAspectIndex): { w: number; h: number } {
  const r = PIP_RATIOS[aspectIdx].ratio;
  return {
    w: Math.round(L * Math.sqrt(r)),
    h: Math.round(L / Math.sqrt(r)),
  };
}

export const PipUiCard: React.FC<PipUiCardProps> = ({
  id,
  code,
  title,
  rank,
  suit = '♠',
  accentHex,
  cardTheme,
  anchorX,
  anchorY,
  initialL,
  initialAspect,
  restRotY = 0,
  restRotX = 0,
  restSkewY = 0,
  layered = false,
  darkSurface = false,
  dealDelayMs,
  dealCount,
  dealtOpen = false,
  onToggleDeal,
  zIndex,
  minimized,
  onFocus,
  onToggleMinimize,
  onClose,
  children,
}) => {
  const tileRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const sheenRef = useRef<HTMLDivElement | null>(null);
  const aspBarRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLSpanElement | null>(null);

  const theme =
    cardTheme ?? getPlayingCardTheme(darkSurface ? 'blueprint' : 'pixel', false);
  const displayRank = rank ?? code;
  const suitColor = isRedSuit(suit) ? theme.suitRed : theme.suitBlack;

  const [aspectIdx, setAspectIdx] = useState<PipAspectIndex>(initialAspect);
  const [L, setL] = useState<number>(() => {
    if (typeof window === 'undefined') return initialL;
    const scale = Math.min(1, Math.max(0.74, window.innerWidth / 1380));
    return Math.round(initialL * scale);
  });

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 40, y: 70 };
    const scale = Math.min(1, Math.max(0.74, window.innerWidth / 1380));
    const { w, h } = dimsFor(Math.round(initialL * scale), initialAspect);
    const x = Math.round(
      Math.max(12, Math.min(window.innerWidth - w - 12, window.innerWidth * anchorX - w * 0.5)),
    );
    const y = Math.round(
      Math.max(46, Math.min(window.innerHeight - h - 14, window.innerHeight * anchorY)),
    );
    return { x, y };
  });

  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);

  // Spring-damped 3D hover tilt state (runs in RAF only while hovered/returning)
  const tiltRef = useRef({
    rx: 0,
    ry: 0,
    trx: 0,
    try: 0,
    lit: 0,
    tlit: 0,
    raf: 0,
  });

  const dragMeta = useRef<{
    mode: 'drag' | 'resize' | null;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origL: number;
    moved: boolean;
    pointerId: number;
  }>({
    mode: null,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    origL: initialL,
    moved: false,
    pointerId: -1,
  });

  const applyCardTransform = useCallback(() => {
    const t = tiltRef.current;
    const card = cardRef.current;
    const sheen = sheenRef.current;
    if (!card) return;

    if (minimized) {
      card.style.transform = 'none';
      if (sheen) sheen.style.opacity = '0';
      return;
    }

    const restBlend = Math.max(0, 1 - t.lit * 0.85);
    const rotX = -t.ry * 7.2 + restRotX * restBlend;
    const rotY = t.rx * 7.2 + restRotY * restBlend;
    const skewY = restSkewY * restBlend;
    const tz = -10 * t.lit;

    card.style.transform = `translateZ(${tz.toFixed(2)}px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) skewY(${skewY.toFixed(2)}deg)`;

    if (sheen) {
      if (t.lit > 0.01) {
        const px = 50 + t.rx * 40;
        const py = 50 + t.ry * 40;
        const fx = 100 - px;
        const fy = 100 - py;
        sheen.style.opacity = t.lit.toFixed(3);
        sheen.style.background =
          `radial-gradient(42% 34% at ${px.toFixed(1)}% ${py.toFixed(1)}%, rgba(8,12,24,0.18), transparent),` +
          `radial-gradient(52% 42% at ${fx.toFixed(1)}% ${fy.toFixed(1)}%, rgba(255,255,255,0.26), transparent)`;
      } else {
        sheen.style.opacity = '0';
      }
    }
  }, [minimized, restRotX, restRotY, restSkewY]);

  const startTiltLoop = useCallback(() => {
    const t = tiltRef.current;
    if (t.raf) return;
    const step = () => {
      t.rx += (t.trx - t.rx) * 0.14;
      t.ry += (t.try - t.ry) * 0.14;
      t.lit += (t.tlit - t.lit) * 0.12;
      applyCardTransform();
      const settled =
        Math.abs(t.rx - t.trx) < 0.002 &&
        Math.abs(t.ry - t.try) < 0.002 &&
        Math.abs(t.lit - t.tlit) < 0.002;
      if (settled) {
        t.rx = t.trx;
        t.ry = t.try;
        t.lit = t.tlit;
        applyCardTransform();
        t.raf = 0;
        return;
      }
      t.raf = requestAnimationFrame(step);
    };
    t.raf = requestAnimationFrame(step);
  }, [applyCardTransform]);

  useEffect(() => {
    applyCardTransform();
    return () => {
      if (tiltRef.current.raf) {
        cancelAnimationFrame(tiltRef.current.raf);
        tiltRef.current.raf = 0;
      }
    };
  }, [applyCardTransform]);

  useLayoutEffect(() => {
    const bar = aspBarRef.current;
    const knob = knobRef.current;
    if (!bar || !knob) return;
    const activeBtn = bar.querySelector<HTMLButtonElement>(`button[data-idx="${aspectIdx}"]`);
    if (!activeBtn) return;
    knob.style.width = `${activeBtn.offsetWidth}px`;
    knob.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
  }, [aspectIdx, minimized]);

  useEffect(() => {
    const onResize = () => {
      const { w, h } = dimsFor(L, aspectIdx);
      setPos((prev) => ({
        x: Math.max(8, Math.min(window.innerWidth - (minimized ? 52 : Math.min(w, window.innerWidth - 16)), prev.x)),
        y: Math.max(44, Math.min(window.innerHeight - (minimized ? 52 : Math.min(h, window.innerHeight - 52)), prev.y)),
      }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [L, aspectIdx, minimized]);

  const { w, h } = dimsFor(L, aspectIdx);

  const handleTilePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragMeta.current.mode === 'drag') {
      const dx = e.clientX - dragMeta.current.startX;
      const dy = e.clientY - dragMeta.current.startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) {
        dragMeta.current.moved = true;
      }
      const nextX = Math.max(8, Math.min(window.innerWidth - 56, dragMeta.current.origX + dx));
      const nextY = Math.max(40, Math.min(window.innerHeight - 56, dragMeta.current.origY + dy));
      setPos({ x: nextX, y: nextY });
      return;
    }

    if (dragMeta.current.mode === 'resize') {
      const dx = e.clientX - dragMeta.current.startX;
      const dy = e.clientY - dragMeta.current.startY;
      const delta = (dx + dy) * 0.55;
      const nextL = Math.max(165, Math.min(440, Math.round(dragMeta.current.origL + delta)));
      setL(nextL);
      return;
    }

    if (minimized) return;
    const el = tileRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1));
    tiltRef.current.trx = nx;
    tiltRef.current.try = ny;
    tiltRef.current.tlit = 1;
    startTiltLoop();
  };

  const handleTilePointerLeave = () => {
    if (dragMeta.current.mode) return;
    tiltRef.current.trx = 0;
    tiltRef.current.try = 0;
    tiltRef.current.tlit = 0;
    startTiltLoop();
  };

  const handleTilePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    onFocus();
    const target = e.target as HTMLElement;
    if (
      !minimized &&
      target.closest('button, input, select, textarea, a, label, [data-pip-interactive="true"]')
    ) {
      return;
    }
    e.stopPropagation();
    dragMeta.current = {
      mode: 'drag',
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      origL: L,
      moved: false,
      pointerId: e.pointerId,
    };
    setDragging(true);
    tileRef.current?.setPointerCapture(e.pointerId);
  };

  const handleGripPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onFocus();
    dragMeta.current = {
      mode: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      origL: L,
      moved: true,
      pointerId: e.pointerId,
    };
    setResizing(true);
    tileRef.current?.setPointerCapture(e.pointerId);
  };

  const handleTilePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const mode = dragMeta.current.mode;
    if (!mode) return;
    const wasTap = !dragMeta.current.moved;
    dragMeta.current.mode = null;
    setDragging(false);
    setResizing(false);
    if (tileRef.current?.hasPointerCapture(e.pointerId)) {
      tileRef.current.releasePointerCapture(e.pointerId);
    }
    if (minimized && wasTap) {
      onToggleMinimize();
    } else if (!minimized && wasTap && onToggleDeal) {
      // Tapping empty card stock/header on a root playing card fans or folds its deck!
      onToggleDeal();
    }
  };

  return (
    <div
      ref={tileRef}
      data-pip-id={id}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: minimized ? 44 : w,
        height: minimized ? 44 : h,
        zIndex,
        animationDelay: dealDelayMs !== undefined ? `${dealDelayMs}ms` : undefined,
        ['--card-slider-track' as string]: theme.sliderTrack,
        ['--card-slider-thumb' as string]: theme.sliderThumb,
      }}
      onPointerDown={handleTilePointerDown}
      onPointerMove={handleTilePointerMove}
      onPointerUp={handleTilePointerUp}
      onPointerCancel={handleTilePointerUp}
      onPointerLeave={handleTilePointerLeave}
      className={`sylva-pip-tile pointer-events-auto ${dragging ? 'dragging' : ''} ${
        resizing ? 'resizing' : ''
      } ${minimized ? 'minimized' : ''} ${dealDelayMs !== undefined ? 'sylva-card-dealt' : ''}`}
    >
      {/* Stacked Deck Back-Cards behind Root Playing Cards */}
      {layered && !minimized && (
        <>
          <div
            aria-hidden="true"
            style={{
              backgroundColor: theme.stockBackBg,
              borderColor: theme.border,
              transform: `translate(6px, 7px) rotate(${(dealtOpen ? 2.4 : 1.2).toFixed(1)}deg)`,
            }}
            className="pointer-events-none absolute inset-0 rounded-[6px] border opacity-75 transition-transform duration-200"
          />
          <div
            aria-hidden="true"
            style={{
              backgroundColor: theme.stockBackBg,
              borderColor: theme.innerRule,
              transform: `translate(11px, 13px) rotate(${(dealtOpen ? 4.8 : 2.3).toFixed(1)}deg)`,
            }}
            className="pointer-events-none absolute inset-0 rounded-[6px] border opacity-45 transition-transform duration-200"
          />
        </>
      )}

      <div
        ref={cardRef}
        style={{
          backgroundColor: theme.stockBg,
          color: theme.ink,
          borderColor: theme.border,
        }}
        className={`sylva-pip-card border backdrop-blur-md ${
          minimized ? 'flex items-center justify-center' : 'flex flex-col'
        }`}
      >
        {/* Dual Radial Near-Shade / Far-Light Sheen */}
        <div ref={sheenRef} className="sylva-pip-sheen" style={{ opacity: 0 }} />

        {minimized ? (
          <div
            title={`Restore ${displayRank}${suit} ${title}`}
            className="w-full h-full flex flex-col items-center justify-center select-none leading-none"
            style={{ backgroundColor: theme.stockBg, color: suitColor }}
          >
            <span className="font-mono text-[11px] font-bold">{displayRank}</span>
            <span className="text-[11px] -mt-0.5">{suit}</span>
          </div>
        ) : (
          <>
            {/* Authentic Playing-Card Double Hairline Inner Frame */}
            <div
              aria-hidden="true"
              style={{ borderColor: theme.innerRule }}
              className="pointer-events-none absolute inset-[4px] rounded-[3px] border z-[1]"
            />

            {/* Faint Center Suit Watermark */}
            <div
              aria-hidden="true"
              style={{ color: theme.watermarkColor }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-[92px] leading-none select-none z-[1]"
            >
              {suit}
            </div>

            {/* Playing-Card Header: Top-Left Rank/Suit Index + Title + Deal Trigger */}
            <div
              style={{ borderColor: theme.innerRule }}
              className="relative z-[4] flex items-center justify-between gap-1.5 px-2.5 pt-2 pb-1.5 border-b shrink-0"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className="flex flex-col items-center justify-center leading-none shrink-0 min-w-[16px]"
                  style={{ color: suitColor }}
                >
                  <span className="font-mono text-[11px] font-bold tracking-tight">
                    {displayRank}
                  </span>
                  <span className="text-[10px] -mt-0.5">{suit}</span>
                </div>
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: accentHex }}
                />
                <span className="font-mono text-[9.5px] font-bold tracking-[0.09em] uppercase truncate">
                  {title}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0" data-pip-interactive="true">
                {dealCount !== undefined && onToggleDeal ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleDeal();
                    }}
                    title={dealtOpen ? `Fold ${dealCount} dealt cards` : `Deal ${dealCount} playing cards`}
                    style={{
                      backgroundColor: dealtOpen ? theme.activeBg : theme.subtleBg,
                      color: dealtOpen ? theme.activeInk : theme.ink,
                      borderColor: dealtOpen ? theme.activeBg : theme.subtleBorder,
                    }}
                    className="px-1.5 py-0.5 border font-mono text-[8px] font-bold tracking-[0.08em] uppercase whitespace-nowrap flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Layers className="w-2.5 h-2.5 shrink-0" />
                    <span>{dealtOpen ? 'FOLD' : `DEAL +${dealCount}`}</span>
                  </button>
                ) : (
                  <span
                    className="font-mono text-[8.5px] tracking-[0.06em] uppercase tabular-nums"
                    style={{ color: theme.mutedInk }}
                  >
                    {code}
                  </span>
                )}
              </div>
            </div>

            {/* Hover/Touch Top Control Bar: Aspect Morph + Minimize + Close */}
            <div className="sylva-pip-bar">
              <div ref={aspBarRef} className="sylva-pip-asp" data-pip-interactive="true">
                <span ref={knobRef} className="sylva-pip-asp-knob" />
                {PIP_RATIOS.map((item, idx) => (
                  <button
                    key={item.label}
                    type="button"
                    data-idx={idx}
                    data-active={aspectIdx === idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAspectIdx(idx as PipAspectIndex);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1" data-pip-interactive="true">
                <button
                  type="button"
                  title="Minimize card"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMinimize();
                  }}
                  className="w-5 h-5 flex items-center justify-center bg-[#090b0f]/86 text-white border border-white/25 hover:bg-white hover:text-[#090b0f] cursor-pointer transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="Close card"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="w-5 h-5 flex items-center justify-center bg-[#090b0f]/86 text-white border border-white/25 hover:bg-[#e53e3e] hover:border-[#e53e3e] hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Interactive Card Body */}
            <div className="relative z-[4] flex-1 min-h-0 overflow-y-auto sylva-scroll px-2.5 py-2 flex flex-col">
              {children}
            </div>

            {/* Bottom Playing-Card Footer Strip with Inverted 180° Corner Index */}
            <div
              style={{ borderColor: theme.innerRule }}
              className="relative z-[4] flex items-center justify-between px-2.5 py-1 border-t shrink-0"
            >
              <span
                className="font-mono text-[7.5px] tracking-[0.1em] uppercase truncate"
                style={{ color: theme.mutedInk }}
              >
                {PIP_RATIOS[aspectIdx].label}
              </span>
              <div
                aria-hidden="true"
                className="flex items-center gap-0.5 leading-none rotate-180 pr-3 select-none"
                style={{ color: suitColor }}
              >
                <span className="font-mono text-[9.5px] font-bold">{displayRank}</span>
                <span className="text-[9px]">{suit}</span>
              </div>
            </div>

            {/* Bottom-Right Corner Resize Grip */}
            <div
              onPointerDown={handleGripPointerDown}
              title="Drag to resize card"
              className="sylva-pip-grip flex items-end justify-end p-1"
            >
              <svg width="8" height="8" viewBox="0 0 9 9" className="opacity-70">
                <path
                  d="M8 1L1 8M8 4.5L4.5 8M8 7.5L7.5 8"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="square"
                />
              </svg>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
