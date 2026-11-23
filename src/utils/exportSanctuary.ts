import {
  BackdropStyle,
  PATH_MATERIALS,
  PathMaterialId,
  PathNode,
  PlacedSpaceItem,
  VIRGINIA_ITEMS,
  WeatherMode,
  formatSeasonLabel,
  formatTimeOfDay,
  getSpaceItem,
} from '../data/virginiaTrees';
import {
  BimLayerState,
  DEFAULT_BIM_LAYERS,
  SceneSimulationState,
  SnapGridFt,
} from '../engine/rendererTypes';
import {
  DEFAULT_VISUAL_FILTER,
  PaintMaterialMode,
  VisualFilterSettings,
} from '../engine/visualFilters';
import { computeBimSchedule } from './bimSchedule';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadPngFromDataUrl(dataUrl: string, season: number) {
  const seasonTag = formatSeasonLabel(season).seasonName.toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);
  fetch(dataUrl)
    .then((res) => res.blob())
    .then((blob) => {
      triggerDownload(blob, `virginia-sylva-${seasonTag}-${stamp}.png`);
    })
    .catch(() => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `virginia-sylva-${seasonTag}-${stamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
}

export interface ExportedSanctuaryPayload {
  app: 'Virginia Sylva';
  version: 4;
  exportedAt: string;
  season: number;
  timeOfDay: number;
  wind: number;
  weather: WeatherMode;
  weatherIntensity: number;
  stackRelief: number;
  paintMode: PaintMaterialMode;
  impasto: number;
  fireflies: boolean;
  studioBackdrop: boolean;
  backdropStyle: BackdropStyle;
  snapGridFt: SnapGridFt;
  bimLayers: BimLayerState;
  entrance: { x: number; z: number; yaw: number };
  visualFilter: VisualFilterSettings;
  pathNodes: PathNode[];
  placedItems: PlacedSpaceItem[];
}

export function downloadSanctuaryJson(state: SceneSimulationState) {
  const payload: ExportedSanctuaryPayload = {
    app: 'Virginia Sylva',
    version: 4,
    exportedAt: new Date().toISOString(),
    season: state.season,
    timeOfDay: state.timeOfDay,
    wind: state.wind,
    weather: state.weather,
    weatherIntensity: state.weatherIntensity,
    stackRelief: state.stackRelief,
    paintMode: state.paintMode,
    impasto: state.impasto,
    fireflies: state.fireflies,
    studioBackdrop: state.studioBackdrop,
    backdropStyle: state.backdropStyle,
    snapGridFt: state.snapGridFt,
    bimLayers: state.bimLayers,
    entrance: state.entrance,
    visualFilter: state.visualFilter,
    pathNodes: state.pathNodes,
    placedItems: state.placedItems,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const stamp = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `virginia-sylva-sanctuary-${stamp}.json`);
}

export function parseSanctuaryJson(
  rawText: string,
): Partial<SceneSimulationState> | null {
  try {
    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.placedItems)) {
      return null;
    }

    const validIds = new Set(VIRGINIA_ITEMS.map((i) => i.id));
    const placedItems: PlacedSpaceItem[] = [];
    for (let i = 0; i < parsed.placedItems.length; i++) {
      const row = parsed.placedItems[i];
      if (
        row &&
        typeof row.itemId === 'string' &&
        validIds.has(row.itemId) &&
        typeof row.x === 'number' &&
        typeof row.z === 'number'
      ) {
        placedItems.push({
          uid: `imported-${Date.now()}-${i}`,
          itemId: row.itemId,
          x: Math.max(-4.2, Math.min(4.2, row.x)),
          z: Math.max(-4.2, Math.min(4.2, row.z)),
          scale:
            typeof row.scale === 'number'
              ? Math.max(0.55, Math.min(1.5, row.scale))
              : 1.0,
          rotation: typeof row.rotation === 'number' ? row.rotation : 0,
          seed: typeof row.seed === 'number' ? Math.floor(row.seed) : 100 + i * 37,
        });
      }
    }

    const validMaterials = new Set<PathMaterialId>(PATH_MATERIALS.map((m) => m.id));
    const pathNodes: PathNode[] = [];
    if (Array.isArray(parsed.pathNodes)) {
      for (let i = 0; i < parsed.pathNodes.length; i++) {
        const p = parsed.pathNodes[i];
        if (
          p &&
          typeof p.material === 'string' &&
          validMaterials.has(p.material as PathMaterialId) &&
          typeof p.x === 'number' &&
          typeof p.z === 'number'
        ) {
          pathNodes.push({
            uid: `imported-path-${Date.now()}-${i}`,
            material: p.material as PathMaterialId,
            x: Math.max(-3.6, Math.min(3.6, p.x)),
            z: Math.max(-3.6, Math.min(3.6, p.z)),
            radius:
              typeof p.radius === 'number'
                ? Math.max(0.14, Math.min(0.46, p.radius))
                : 0.26,
            seed: typeof p.seed === 'number' ? Math.floor(p.seed) : 300 + i * 19,
          });
        }
      }
    }

    const validWeathers: WeatherMode[] = ['clear', 'mist', 'rain', 'snow'];
    const weather: WeatherMode = validWeathers.includes(parsed.weather)
      ? parsed.weather
      : 'clear';

    const validBackdrops: BackdropStyle[] = ['white-circle', 'blue-ridge', 'blueprint'];
    const backdropStyle: BackdropStyle = validBackdrops.includes(parsed.backdropStyle)
      ? parsed.backdropStyle
      : parsed.studioBackdrop
        ? 'white-circle'
        : 'blue-ridge';

    const validPaintModes: PaintMaterialMode[] = ['pixel', 'oil-3d', 'living-canvas'];
    const paintMode: PaintMaterialMode = validPaintModes.includes(parsed.paintMode)
      ? parsed.paintMode
      : 'pixel';

    const snapGridFt: SnapGridFt =
      parsed.snapGridFt === 1 || parsed.snapGridFt === 2 ? parsed.snapGridFt : 0;

    return {
      placedItems,
      pathNodes,
      backdropStyle,
      snapGridFt,
      bimLayers:
        parsed.bimLayers && typeof parsed.bimLayers === 'object'
          ? { ...DEFAULT_BIM_LAYERS, ...parsed.bimLayers }
          : DEFAULT_BIM_LAYERS,
      season:
        typeof parsed.season === 'number'
          ? Math.max(0, Math.min(4, parsed.season))
          : 0.45,
      timeOfDay:
        typeof parsed.timeOfDay === 'number'
          ? Math.max(0, Math.min(24, parsed.timeOfDay))
          : 10.8,
      wind:
        typeof parsed.wind === 'number'
          ? Math.max(0, Math.min(1, parsed.wind))
          : 0.28,
      weather,
      weatherIntensity:
        typeof parsed.weatherIntensity === 'number'
          ? Math.max(0.1, Math.min(1, parsed.weatherIntensity))
          : 0.55,
      stackRelief:
        typeof parsed.stackRelief === 'number'
          ? Math.max(0.5, Math.min(1.8, parsed.stackRelief))
          : 1.0,
      paintMode,
      impasto:
        typeof parsed.impasto === 'number'
          ? Math.max(0, Math.min(1, parsed.impasto))
          : 0.72,
      fireflies: Boolean(parsed.fireflies),
      studioBackdrop: backdropStyle === 'white-circle',
      visualFilter:
        parsed.visualFilter && typeof parsed.visualFilter === 'object'
          ? { ...DEFAULT_VISUAL_FILTER, ...parsed.visualFilter }
          : DEFAULT_VISUAL_FILTER,
    };
  } catch {
    return null;
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Generates a self-contained offline HTML botanical plate & BIM summary
 * embedding the rendered artwork and sanctuary schedule.
 */
export function downloadStandalonePostcardHtml(
  dataUrl: string,
  state: SceneSimulationState,
) {
  const season = formatSeasonLabel(state.season);
  const time = formatTimeOfDay(state.timeOfDay);
  const schedule = computeBimSchedule(state.placedItems, state.pathNodes);

  const counts = new Map<string, number>();
  for (const item of state.placedItems) {
    const meta = getSpaceItem(item.itemId);
    counts.set(meta.commonName, (counts.get(meta.commonName) ?? 0) + 1);
  }
  const speciesRows = Array.from(counts.entries())
    .map(
      ([name, count]) =>
        `<li><span>${escapeHtml(name)}</span><strong>${count}</strong></li>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Virginia Sylva — ${escapeHtml(season.seasonName)} Landscape Plate</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background: radial-gradient(circle at 20% 10%, #242923, #0e100f 70%);
    color: #f4f2eb;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 20px;
  }
  .card {
    width: min(1040px, 100%);
    background: linear-gradient(180deg, rgba(32, 36, 31, 0.94), rgba(18, 20, 18, 0.98));
    border: 1px solid rgba(255, 245, 224, 0.14);
    border-radius: 22px;
    padding: 20px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.16), 0 24px 64px rgba(0,0,0,0.6);
  }
  .frame {
    border-radius: 14px;
    overflow: hidden;
    background: #07080a;
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: inset 0 2px 10px rgba(0,0,0,0.65);
  }
  .frame img {
    display: block;
    width: 100%;
    height: auto;
    image-rendering: pixelated;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    margin-top: 18px;
    padding: 0 4px;
  }
  h1 {
    margin: 0;
    font-family: Georgia, serif;
    font-size: 26px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .sub {
    margin-top: 6px;
    font-size: 13px;
    color: #b7b3a8;
  }
  .metrics {
    margin-top: 10px;
    font-size: 12px;
    color: #d6c8a8;
    font-variant-numeric: tabular-nums;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 10px 18px;
    font-size: 13px;
    color: #d8d4c8;
  }
  li { display: flex; gap: 6px; align-items: baseline; }
  strong { color: #f6d58e; font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
  <article class="card">
    <div class="frame">
      <img src="${dataUrl}" alt="Virginia Sylva botanical landscape plate" />
    </div>
    <div class="meta">
      <div>
        <h1>Virginia Sylva</h1>
        <div class="sub">${escapeHtml(season.seasonName)} (${escapeHtml(season.monthApprox)}) &middot; ${escapeHtml(time.clock)} ${escapeHtml(time.phase)} &middot; Wind ${Math.round(state.wind * 34)} mph &middot; Filter: ${escapeHtml(state.visualFilter.style)}</div>
        <div class="metrics">Clearing ${schedule.siteAreaSqFt.toLocaleString()} sq ft &middot; Canopy ${schedule.canopyCoveragePct}% &middot; Hardscape &amp; Paths ${schedule.hardscapeSqFt} sq ft &middot; Walls/Fences ${schedule.linearWallFenceFt} lin ft &middot; Water ${schedule.waterAreaSqFt} sq ft</div>
      </div>
      <ul>${speciesRows || '<li>Open Meadow Clearing</li>'}</ul>
    </div>
  </article>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const stamp = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `virginia-sylva-postcard-${stamp}.html`);
}
