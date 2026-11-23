import React from 'react';

export interface OrbTone {
  core: string;
  deep: string;
  glow: string;
}

export const ORB_TONES: Record<string, OrbTone> = {
  amber: {
    core: 'rgba(246, 174, 58, 0.92)',
    deep: 'rgba(154, 72, 16, 0.94)',
    glow: 'rgba(246, 184, 72, 0.52)',
  },
  emerald: {
    core: 'rgba(98, 198, 122, 0.92)',
    deep: 'rgba(22, 92, 54, 0.95)',
    glow: 'rgba(116, 224, 146, 0.48)',
  },
  crimson: {
    core: 'rgba(232, 74, 88, 0.92)',
    deep: 'rgba(128, 22, 38, 0.95)',
    glow: 'rgba(244, 102, 114, 0.5)',
  },
  violet: {
    core: 'rgba(136, 108, 232, 0.92)',
    deep: 'rgba(54, 34, 128, 0.95)',
    glow: 'rgba(162, 134, 248, 0.5)',
  },
  sky: {
    core: 'rgba(84, 176, 238, 0.92)',
    deep: 'rgba(24, 76, 134, 0.95)',
    glow: 'rgba(114, 202, 252, 0.5)',
  },
  rose: {
    core: 'rgba(242, 142, 178, 0.92)',
    deep: 'rgba(138, 48, 86, 0.95)',
    glow: 'rgba(248, 174, 202, 0.5)',
  },
  chartreuse: {
    core: 'rgba(170, 214, 72, 0.92)',
    deep: 'rgba(72, 112, 22, 0.95)',
    glow: 'rgba(190, 232, 94, 0.48)',
  },
  slate: {
    core: 'rgba(92, 118, 132, 0.88)',
    deep: 'rgba(24, 36, 44, 0.94)',
    glow: 'rgba(154, 192, 214, 0.42)',
  },
  pearl: {
    core: 'rgba(238, 234, 222, 0.9)',
    deep: 'rgba(112, 116, 106, 0.92)',
    glow: 'rgba(255, 252, 240, 0.54)',
  },
};

interface GlassOrbButtonProps {
  label: string;
  sublabel?: string;
  tone?: keyof typeof ORB_TONES | OrbTone;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  active?: boolean;
  lightBackdrop?: boolean;
  hideCaption?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_CLASSES: Record<NonNullable<GlassOrbButtonProps['size']>, string> = {
  xs: 'w-9 h-9',
  sm: 'w-11 h-11',
  md: 'w-13 h-13',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
};

export const GlassOrbButton: React.FC<GlassOrbButtonProps> = ({
  label,
  sublabel,
  tone = 'emerald',
  size = 'sm',
  active = false,
  lightBackdrop = false,
  hideCaption = false,
  onClick,
  title,
  children,
  className = '',
  style,
}) => {
  const resolved = typeof tone === 'string' ? ORB_TONES[tone] ?? ORB_TONES.emerald : tone;
  const orbVars = {
    '--orb-core': resolved.core,
    '--orb-deep': resolved.deep,
    '--orb-glow': resolved.glow,
    ...style,
  } as React.CSSProperties;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      aria-label={label}
      aria-pressed={active}
      className={`group inline-flex flex-col items-center gap-1 bg-transparent border-0 p-0 cursor-pointer select-none ${className}`}
    >
      <span
        style={orbVars}
        className={`sylva-orb flex items-center justify-center text-white ${SIZE_CLASSES[size]} ${
          active ? 'sylva-orb-active scale-105' : ''
        }`}
      >
        <span className="relative z-10 flex items-center justify-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
          {children}
        </span>
      </span>
      {!hideCaption && (
        <span
          className={`text-[10.5px] font-medium tracking-[0.02em] leading-none whitespace-nowrap transition-opacity ${
            lightBackdrop ? 'sylva-paper-text' : 'sylva-sky-text'
          } ${active ? 'opacity-100 font-semibold' : 'opacity-85 group-hover:opacity-100'}`}
        >
          {label}
        </span>
      )}
      {!hideCaption && sublabel && (
        <span
          className={`text-[9px] font-mono leading-none whitespace-nowrap tabular-nums opacity-75 ${
            lightBackdrop ? 'sylva-paper-text' : 'sylva-sky-text'
          }`}
        >
          {sublabel}
        </span>
      )}
    </button>
  );
};

// Six hand-painted organic gouache brush-blob silhouettes inspired by watercolor/gouache swatches
const GOUACHE_BLOBS = [
  'M13 11 C24 5, 48 6, 57 12 C64 17, 63 39, 56 46 C46 54, 18 54, 10 47 C4 41, 4 17, 13 11 Z',
  'M11 14 C20 6, 46 4, 56 11 C65 18, 62 42, 53 48 C43 55, 19 52, 10 45 C3 39, 3 21, 11 14 Z',
  'M14 9 C27 5, 49 7, 58 14 C64 21, 61 40, 54 47 C44 54, 17 53, 9 44 C3 36, 5 14, 14 9 Z',
  'M12 12 C23 4, 47 6, 58 13 C63 19, 64 38, 55 46 C46 53, 21 54, 11 47 C4 41, 4 19, 12 12 Z',
  'M15 10 C28 5, 45 5, 57 13 C64 19, 63 41, 54 48 C42 54, 18 52, 10 45 C4 38, 6 16, 15 10 Z',
  'M11 13 C22 6, 47 5, 57 12 C64 18, 62 40, 55 47 C45 55, 20 53, 11 46 C3 39, 4 19, 11 13 Z',
];

interface GouacheSwatchProps {
  label: string;
  colorHex: string;
  shapeSeed: number;
  active?: boolean;
  lightBackdrop?: boolean;
  size?: 'sm' | 'md';
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}

export const GouacheSwatch: React.FC<GouacheSwatchProps> = ({
  label,
  colorHex,
  shapeSeed,
  active = false,
  lightBackdrop = false,
  size = 'sm',
  onClick,
  title,
  children,
}) => {
  const path = GOUACHE_BLOBS[Math.abs(shapeSeed) % GOUACHE_BLOBS.length];
  const dimClass = size === 'md' ? 'w-15 h-13' : 'w-13 h-11';

  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      aria-label={label}
      aria-pressed={active}
      className="sylva-gouache group select-none shrink-0"
    >
      <span className={`relative flex items-center justify-center ${dimClass}`}>
        <svg
          viewBox="0 0 68 58"
          className={`absolute inset-0 w-full h-full overflow-visible transition-transform duration-200 ${
            active ? 'scale-110' : 'group-hover:scale-105'
          }`}
          aria-hidden="true"
        >
          {/* Soft painterly under-wash shadow */}
          <path
            d={path}
            fill="rgba(0,0,0,0.28)"
            transform="translate(1.5, 3.2)"
          />
          {/* Main gouache pigment blob */}
          <path
            d={path}
            fill={colorHex}
            fillOpacity={active ? 0.96 : 0.86}
            stroke={active ? '#ffffff' : 'rgba(255,255,255,0.34)'}
            strokeWidth={active ? 2.4 : 1.15}
            strokeLinejoin="round"
          />
          {/* Subtle sunlit gouache dry-brush highlight stroke */}
          <path
            d="M17 15 C28 11, 41 11, 50 15"
            fill="none"
            stroke="rgba(255,255,255,0.42)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
        <span className="relative z-10 flex items-center justify-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
          {children}
        </span>
      </span>
      <span
        className={`mt-0.5 text-[10px] font-medium tracking-[0.015em] leading-tight whitespace-nowrap max-w-[68px] truncate ${
          lightBackdrop ? 'sylva-paper-text' : 'sylva-sky-text'
        } ${active ? 'opacity-100 font-semibold' : 'opacity-85 group-hover:opacity-100'}`}
      >
        {label}
      </span>
    </button>
  );
};

interface FloatingOrbSliderProps {
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  lightBackdrop?: boolean;
  className?: string;
}

export const FloatingOrbSlider: React.FC<FloatingOrbSliderProps> = ({
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  onChange,
  lightBackdrop = false,
  className = '',
}) => {
  const pct = Math.max(0, Math.min(100, ((value - min) / Math.max(0.0001, max - min)) * 100));

  return (
    <label className={`flex flex-col gap-1.5 select-none ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={`text-[10.5px] font-medium uppercase tracking-[0.12em] whitespace-nowrap ${
            lightBackdrop ? 'sylva-paper-text opacity-85' : 'sylva-sky-text opacity-85'
          }`}
        >
          {label}
        </span>
        <span
          className={`text-[11px] font-mono tabular-nums whitespace-nowrap ${
            lightBackdrop ? 'sylva-paper-text' : 'sylva-sky-text'
          }`}
        >
          {valueLabel}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="sylva-orb-slider"
        style={{
          background: `linear-gradient(90deg, var(--sylva-accent) 0%, var(--sylva-accent) ${pct}%, ${
            lightBackdrop ? 'rgba(28,36,30,0.22)' : 'rgba(255,255,255,0.28)'
          } ${pct}%)`,
        }}
      />
    </label>
  );
};
