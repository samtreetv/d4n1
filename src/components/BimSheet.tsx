import React from 'react';
import {
  Download,
  Eye,
  EyeOff,
  Grid3x3,
  Lock,
  RotateCw,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { BIM_LAYERS, BimLayerId } from '../data/virginiaTrees';
import { BimLayerState, SnapGridFt } from '../engine/rendererTypes';
import { BimScheduleSummary } from '../utils/bimSchedule';

interface BimSheetProps {
  open: boolean;
  onClose: () => void;
  bimLayers: BimLayerState;
  schedule: BimScheduleSummary;
  showGrid: boolean;
  snapGridFt: SnapGridFt;
  activeRotation: number;
  hasPaths: boolean;
  hasItems: boolean;
  onToggleLayerVisible: (layer: BimLayerId) => void;
  onToggleLayerLock: (layer: BimLayerId) => void;
  onToggleGrid: () => void;
  onChangeSnap: (snap: SnapGridFt) => void;
  onRotateStep: (deltaRad: number) => void;
  onClearPaths: () => void;
  onClearSite: () => void;
  onExportCsv: () => void;
}

export const BimSheet: React.FC<BimSheetProps> = ({
  open,
  onClose,
  bimLayers,
  schedule,
  showGrid,
  snapGridFt,
  activeRotation,
  hasPaths,
  hasItems,
  onToggleLayerVisible,
  onToggleLayerLock,
  onToggleGrid,
  onChangeSnap,
  onRotateStep,
  onClearPaths,
  onClearSite,
  onExportCsv,
}) => {
  if (!open) return null;

  const rotDeg = Math.round((((activeRotation * 180) / Math.PI) % 360 + 360) % 360);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-end p-4 sm:p-6 pointer-events-none"
      role="dialog"
      aria-label="Landscape BIM Inspector"
    >
      <aside className="sylva-bim-sheet pointer-events-auto w-full max-w-[390px] max-h-[calc(100vh-3rem)] rounded-[24px] flex flex-col overflow-hidden text-[#f4f2eb]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#d6ceb8]/75">
              Landscape BIM Sheet
            </p>
            <h2 className="font-display text-lg font-semibold tracking-tight text-white">
              Layers &amp; Takeoff
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close BIM Sheet"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white/85 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto sylva-scroll px-5 py-4 space-y-5">
          {/* Site KPI Metrics (Zero Pills — Clean Typographic Ledger) */}
          <div className="grid grid-cols-3 gap-3 pb-4 border-b border-white/10">
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-white/55">Canopy</div>
              <div className="text-lg font-semibold font-mono tabular-nums text-[#8ee6a8]">
                {schedule.canopyCoveragePct}%
              </div>
              <div className="text-[10px] font-mono tabular-nums text-white/45">
                {schedule.canopyCoverageSqFt} sq ft
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-white/55">Hardscape</div>
              <div className="text-lg font-semibold font-mono tabular-nums text-[#f7be6d]">
                {schedule.hardscapeSqFt}
              </div>
              <div className="text-[10px] font-mono tabular-nums text-white/45">
                sq ft total
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-white/55">Water / Walls</div>
              <div className="text-lg font-semibold font-mono tabular-nums text-[#9ed6f8]">
                {schedule.waterAreaSqFt}
              </div>
              <div className="text-[10px] font-mono tabular-nums text-white/45">
                {schedule.linearWallFenceFt} lin ft
              </div>
            </div>
          </div>

          {/* Drafting Precision Controls */}
          <div className="space-y-2.5 pb-4 border-b border-white/10">
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/55">
              Site Precision
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onToggleGrid}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  showGrid
                    ? 'bg-[var(--sylva-accent)] text-[var(--sylva-accent-ink)]'
                    : 'bg-white/10 text-white/85 hover:bg-white/15'
                }`}
              >
                <Grid3x3 className="w-3.5 h-3.5" />
                Grid {showGrid ? 'On' : 'Off'}
              </button>

              {([0, 1, 2] as SnapGridFt[]).map((ft) => (
                <button
                  key={ft}
                  type="button"
                  onClick={() => onChangeSnap(ft)}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-mono tabular-nums transition-colors cursor-pointer ${
                    snapGridFt === ft
                      ? 'bg-white text-[#141916] font-semibold'
                      : 'bg-white/8 text-white/75 hover:bg-white/15'
                  }`}
                >
                  {ft === 0 ? 'Free' : `${ft}ft`}
                </button>
              ))}

              <button
                type="button"
                onClick={() => onRotateStep(Math.PI / 4)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-mono tabular-nums bg-white/10 text-white/85 hover:bg-white/20 transition-colors cursor-pointer"
                title="Rotate active placement by 45 degrees"
              >
                <RotateCw className="w-3 h-3" />
                {rotDeg}°
              </button>
            </div>
          </div>

          {/* 5 BIM Layers */}
          <div className="space-y-2 pb-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/55">
                BIM Layers
              </span>
              <span className="text-[11px] font-mono tabular-nums text-white/55">
                {schedule.totalItems} objects
              </span>
            </div>
            <div className="space-y-1.5">
              {BIM_LAYERS.map((layer) => {
                const toggle = bimLayers[layer.id];
                const count = schedule.layerCounts[layer.id] ?? 0;
                return (
                  <div
                    key={layer.id}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: layer.colorHex }}
                      />
                      <span
                        className={`text-xs truncate ${
                          toggle.visible ? 'text-white/92' : 'text-white/40 line-through'
                        }`}
                      >
                        {layer.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono tabular-nums text-white/55 w-5 text-right">
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleLayerVisible(layer.id)}
                        aria-label={`${toggle.visible ? 'Hide' : 'Show'} ${layer.label}`}
                        className="p-1 rounded-lg text-white/75 hover:text-white hover:bg-white/10 cursor-pointer"
                      >
                        {toggle.visible ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 opacity-55" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleLayerLock(layer.id)}
                        aria-label={`${toggle.locked ? 'Unlock' : 'Lock'} ${layer.label}`}
                        className={`p-1 rounded-lg hover:bg-white/10 cursor-pointer ${
                          toggle.locked ? 'text-[#f7be6d]' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        {toggle.locked ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Quantity Takeoff Schedule */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/55">
                Quantity Takeoff ({schedule.siteAreaSqFt.toLocaleString()} sq ft)
              </span>
            </div>

            {schedule.rows.length === 0 && schedule.pathRows.length === 0 ? (
              <p className="text-xs text-white/55 py-2">
                Clearing is open — choose a gouache swatch below to plant or paint paths.
              </p>
            ) : (
              <div className="space-y-1">
                {schedule.rows.map((row) => (
                  <div
                    key={row.itemId}
                    className="flex items-center justify-between gap-2 py-1 text-xs border-b border-white/[0.06] last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="text-white/90 truncate">{row.name}</div>
                      <div className="text-[10px] text-white/45 truncate">
                        {row.unitLabel}
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono tabular-nums">
                      <span className="text-[var(--sylva-accent)] font-semibold">
                        ×{row.count}
                      </span>
                      <span className="text-[10px] text-white/50 ml-2">
                        {row.linearFt > 0
                          ? `${Math.round(row.linearFt)} ft`
                          : row.waterSqFt > 0
                            ? `${Math.round(row.waterSqFt)} sf`
                            : `${Math.round(row.footprintSqFt)} sf`}
                      </span>
                    </div>
                  </div>
                ))}
                {schedule.pathRows.map((prow) => (
                  <div
                    key={prow.material}
                    className="flex items-center justify-between gap-2 py-1 text-xs border-b border-white/[0.06] last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="text-white/90 truncate">{prow.label} Path</div>
                      <div className="text-[10px] text-white/45">Painted surface</div>
                    </div>
                    <div className="text-right shrink-0 font-mono tabular-nums">
                      <span className="text-[#f7be6d] font-semibold">
                        {prow.areaSqFt} sf
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-1.5">
            {hasPaths && (
              <button
                type="button"
                onClick={onClearPaths}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] bg-white/8 hover:bg-red-500/25 text-white/75 hover:text-red-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Paths
              </button>
            )}
            {hasItems && (
              <button
                type="button"
                onClick={onClearSite}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] bg-white/8 hover:bg-red-500/25 text-white/75 hover:text-red-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--sylva-accent)] text-[var(--sylva-accent-ink)] hover:brightness-105 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </aside>
    </div>
  );
};
