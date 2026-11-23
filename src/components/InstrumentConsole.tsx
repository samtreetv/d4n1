import React, { useEffect, useState } from 'react';
import {
  Minus,
  Pause,
  Play,
  Plus,
  RotateCw,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { PlacedSpaceItem, getSpaceItem, isInstrumentId } from '../data/virginiaTrees';
import {
  InstrumentEnsembleSnapshot,
  MUSICAL_SCALES,
  sharedInstrumentAudio,
} from '../engine/instrumentAudio';
import { BotanicalIcon } from './BotanicalIcons';

export interface InstrumentConsoleProps {
  selectedItem: PlacedSpaceItem | null;
  onRotate: (uid: string) => void;
  onAdjustScale: (uid: string, delta: number) => void;
  onRemove: (uid: string) => void;
  onClose: () => void;
  playSfx: (kind: 'tick' | 'pop' | 'open' | 'back' | 'whoosh') => void;
}

const DENSITY_STEPS = [0.35, 0.65, 0.95] as const;
const DENSITY_LABELS = ['SPARSE', 'MEDIUM', 'LUSH'] as const;

export const InstrumentConsole: React.FC<InstrumentConsoleProps> = ({
  selectedItem,
  onRotate,
  onAdjustScale,
  onRemove,
  onClose,
  playSfx,
}) => {
  const [ensemble, setEnsemble] = useState<InstrumentEnsembleSnapshot>(() =>
    sharedInstrumentAudio.getSnapshot(),
  );
  const [flashedPad, setFlashedPad] = useState<number | null>(null);

  useEffect(() => {
    return sharedInstrumentAudio.subscribe(() => {
      setEnsemble(sharedInstrumentAudio.getSnapshot());
    });
  }, []);

  // Keyboard 1-8 note play + Esc dismiss when an instrument is focused
  useEffect(() => {
    if (!selectedItem || !isInstrumentId(selectedItem.itemId)) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.code === 'Escape') {
        e.stopPropagation();
        playSfx('back');
        onClose();
        return;
      }
      if (e.key >= '1' && e.key <= '8' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const idx = parseInt(e.key, 10) - 1;
        sharedInstrumentAudio.triggerInstrumentNote(selectedItem.uid, idx, 0.9);
        setFlashedPad(idx);
        window.setTimeout(() => {
          setFlashedPad((cur) => (cur === idx ? null : cur));
        }, 160);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose, playSfx, selectedItem]);

  if (!selectedItem || !isInstrumentId(selectedItem.itemId)) return null;

  const meta = getSpaceItem(selectedItem.itemId);
  const voice = ensemble.voiceSettings[selectedItem.uid] ?? {
    autoPlay: true,
    muted: false,
    octaveShift: 0 as const,
    density: 0.65,
  };
  const scaleSpec =
    MUSICAL_SCALES.find((s) => s.id === ensemble.scaleId) ?? MUSICAL_SCALES[0];

  const densityIdx = voice.density < 0.5 ? 0 : voice.density < 0.8 ? 1 : 2;
  const scalePct = Math.round((selectedItem.scale || 1) * 100);

  const cycleScale = () => {
    playSfx('tick');
    const idx = MUSICAL_SCALES.findIndex((s) => s.id === ensemble.scaleId);
    const next = MUSICAL_SCALES[(idx + 1) % MUSICAL_SCALES.length];
    sharedInstrumentAudio.setScale(next.id);
  };

  const strikePad = (idx: number) => {
    sharedInstrumentAudio.triggerInstrumentNote(selectedItem.uid, idx, 0.92);
    setFlashedPad(idx);
    window.setTimeout(() => {
      setFlashedPad((cur) => (cur === idx ? null : cur));
    }, 160);
  };

  return (
    <aside
      aria-label={`${meta.commonName} Instrument Console`}
      className="fixed bottom-20 sm:bottom-22 left-1/2 -translate-x-1/2 z-30 w-[min(94vw,860px)] bg-[#050608]/94 backdrop-blur-md border border-white/25 text-white shadow-2xl pointer-events-auto"
    >
      {/* Signature hue top hairline */}
      <div className="h-[2px] w-full" style={{ backgroundColor: meta.accentHex }} />

      <div className="px-3 py-2 flex flex-col gap-2">
        {/* Row 1: Identity + Instrument Controls + Global Ensemble Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/12 pb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-6 h-6 shrink-0 flex items-center justify-center border border-white/20"
              style={{ backgroundColor: `${meta.accentHex}24` }}
            >
              <BotanicalIcon id={selectedItem.itemId} className="w-4 h-4" />
            </span>
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="font-mono text-[11px] font-bold tracking-[0.08em] uppercase text-white whitespace-nowrap truncate">
                {meta.commonName}
              </span>
              <span className="hidden sm:inline font-mono text-[9.5px] tracking-[0.06em] uppercase text-white/55 whitespace-nowrap tabular-nums">
                {scalePct}% · OCT {voice.octaveShift > 0 ? '+1' : voice.octaveShift} · KEYS 1–8
              </span>
            </div>
          </div>

          {/* Right compact global ensemble + dismiss */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => {
                playSfx('tick');
                sharedInstrumentAudio.toggleEnabled();
              }}
              className={`px-2 py-1 border font-mono text-[9px] font-bold tracking-[0.08em] uppercase whitespace-nowrap flex items-center gap-1 cursor-pointer transition-colors ${
                ensemble.enabled
                  ? 'bg-white text-[#050608] border-white'
                  : 'border-white/30 text-white/80 hover:border-white'
              }`}
            >
              {ensemble.enabled ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
              <span>ENSEMBLE</span>
            </button>

            <div className="flex items-center border border-white/25">
              <button
                type="button"
                aria-label="Decrease BPM"
                onClick={() => {
                  playSfx('tick');
                  sharedInstrumentAudio.setBpm(ensemble.bpm - 4);
                }}
                className="px-1.5 py-1 hover:bg-white hover:text-[#050608] cursor-pointer"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <span className="px-1.5 font-mono text-[9px] font-bold tabular-nums whitespace-nowrap">
                {ensemble.bpm} BPM
              </span>
              <button
                type="button"
                aria-label="Increase BPM"
                onClick={() => {
                  playSfx('tick');
                  sharedInstrumentAudio.setBpm(ensemble.bpm + 4);
                }}
                className="px-1.5 py-1 hover:bg-white hover:text-[#050608] cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={cycleScale}
              title={`Harmonic Scale: ${scaleSpec.label}`}
              className="px-2 py-1 border border-white/25 hover:border-white font-mono text-[9px] font-bold tracking-[0.06em] uppercase whitespace-nowrap cursor-pointer"
            >
              {scaleSpec.shortLabel}
            </button>

            <button
              type="button"
              aria-label="Close instrument console"
              onClick={() => {
                playSfx('back');
                onClose();
              }}
              className="w-6 h-6 flex items-center justify-center border border-white/25 hover:bg-white hover:text-[#050608] cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Row 2: 8 Scale-Locked Playable Note Pads + Per-Voice & Object Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
          {/* 8 Playable Note Pads */}
          <div className="grid grid-cols-8 gap-1 flex-1">
            {scaleSpec.noteLabels.map((note, idx) => {
              const activePad = flashedPad === idx;
              return (
                <button
                  key={`${scaleSpec.id}-${idx}`}
                  type="button"
                  onPointerDown={() => strikePad(idx)}
                  className={`py-1.5 px-1 border font-mono text-[10px] font-bold tracking-[0.04em] uppercase flex flex-col items-center justify-center leading-none cursor-pointer transition-colors ${
                    activePad
                      ? 'bg-white text-[#050608] border-white'
                      : 'bg-[#0c1015] border-white/22 text-white/90 hover:border-white'
                  }`}
                  style={
                    activePad
                      ? { backgroundColor: meta.accentHex, borderColor: meta.accentHex }
                      : undefined
                  }
                >
                  <span>{note}</span>
                  <span className="mt-0.5 text-[7.5px] opacity-50 tabular-nums">{idx + 1}</span>
                </button>
              );
            })}
          </div>

          {/* Per-Voice & Spatial Object Strip */}
          <div className="flex items-center gap-1 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => {
                playSfx('tick');
                sharedInstrumentAudio.updateVoiceSettings(selectedItem.uid, {
                  autoPlay: !voice.autoPlay,
                });
              }}
              className={`px-2 py-1.5 border font-mono text-[9px] font-bold uppercase whitespace-nowrap cursor-pointer ${
                voice.autoPlay
                  ? 'bg-white text-[#050608] border-white'
                  : 'border-white/25 text-white/65 hover:border-white'
              }`}
            >
              AUTO
            </button>

            <button
              type="button"
              aria-label={voice.muted ? 'Unmute instrument' : 'Mute instrument'}
              onClick={() => {
                playSfx('tick');
                sharedInstrumentAudio.updateVoiceSettings(selectedItem.uid, {
                  muted: !voice.muted,
                });
              }}
              className={`px-1.5 py-1.5 border cursor-pointer ${
                voice.muted
                  ? 'border-[#f26a56] text-[#f26a56]'
                  : 'border-white/25 text-white/85 hover:border-white'
              }`}
            >
              {voice.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>

            <button
              type="button"
              title="Cycle octave register (-1 / 0 / +1)"
              onClick={() => {
                playSfx('tick');
                const nextOct: -1 | 0 | 1 =
                  voice.octaveShift === -1 ? 0 : voice.octaveShift === 0 ? 1 : -1;
                sharedInstrumentAudio.updateVoiceSettings(selectedItem.uid, {
                  octaveShift: nextOct,
                });
              }}
              className="px-2 py-1.5 border border-white/25 hover:border-white font-mono text-[9px] font-bold uppercase tabular-nums whitespace-nowrap cursor-pointer"
            >
              OCT {voice.octaveShift > 0 ? '+1' : voice.octaveShift}
            </button>

            <button
              type="button"
              title="Cycle pattern density"
              onClick={() => {
                playSfx('tick');
                const nextIdx = (densityIdx + 1) % DENSITY_STEPS.length;
                sharedInstrumentAudio.updateVoiceSettings(selectedItem.uid, {
                  density: DENSITY_STEPS[nextIdx],
                });
              }}
              className="px-2 py-1.5 border border-white/25 hover:border-white font-mono text-[9px] font-bold uppercase whitespace-nowrap cursor-pointer"
            >
              {DENSITY_LABELS[densityIdx]}
            </button>

            <button
              type="button"
              title="Rotate instrument 45°"
              onClick={() => {
                playSfx('tick');
                onRotate(selectedItem.uid);
              }}
              className="px-1.5 py-1.5 border border-white/25 hover:border-white cursor-pointer"
            >
              <RotateCw className="w-3 h-3" />
            </button>

            <div className="flex items-center border border-white/25" title="Adjust scale (coupled to pitch register)">
              <button
                type="button"
                aria-label="Scale down"
                onClick={() => {
                  playSfx('tick');
                  onAdjustScale(selectedItem.uid, -0.15);
                }}
                className="px-1.5 py-1.5 hover:bg-white hover:text-[#050608] cursor-pointer"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                aria-label="Scale up"
                onClick={() => {
                  playSfx('tick');
                  onAdjustScale(selectedItem.uid, 0.15);
                }}
                className="px-1.5 py-1.5 hover:bg-white hover:text-[#050608] cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>

            <button
              type="button"
              title="Remove instrument from site"
              onClick={() => {
                playSfx('back');
                onRemove(selectedItem.uid);
              }}
              className="px-1.5 py-1.5 border border-white/25 hover:border-[#f26a56] hover:text-[#f26a56] cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
