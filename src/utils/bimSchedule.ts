import {
  BIM_LAYERS,
  BimLayerId,
  PATH_MATERIALS,
  PathMaterialId,
  PathNode,
  PlaceableId,
  PlacedSpaceItem,
  formatSeasonLabel,
  getItemBimSpec,
  getSpaceItem,
} from '../data/virginiaTrees';

/** Calibrated circular garden clearing: 3.4 world units = 34 ft radius (~3,632 sq ft). */
export const CLEARING_RADIUS_FT = 34;
export const CLEARING_AREA_SQFT = Math.round(
  Math.PI * CLEARING_RADIUS_FT * CLEARING_RADIUS_FT,
);

export interface BimScheduleRow {
  itemId: PlaceableId;
  name: string;
  scientificName: string;
  layer: BimLayerId;
  unitLabel: string;
  count: number;
  footprintSqFt: number;
  canopySqFt: number;
  linearFt: number;
  waterSqFt: number;
}

export interface BimPathRow {
  material: PathMaterialId;
  label: string;
  nodeCount: number;
  areaSqFt: number;
}

export interface BimScheduleSummary {
  siteAreaSqFt: number;
  totalItems: number;
  treeCount: number;
  understoryCount: number;
  structureCount: number;
  waterStoneCount: number;
  lightingHardscapeCount: number;
  canopyCoverageSqFt: number;
  canopyCoveragePct: number;
  hardscapeSqFt: number;
  pathAreaSqFt: number;
  linearWallFenceFt: number;
  waterAreaSqFt: number;
  layerCounts: Record<BimLayerId, number>;
  rows: BimScheduleRow[];
  pathRows: BimPathRow[];
}

export function computeBimSchedule(
  placedItems: PlacedSpaceItem[],
  pathNodes: PathNode[],
): BimScheduleSummary {
  const layerCounts: Record<BimLayerId, number> = {
    trees: 0,
    understory: 0,
    'water-stone': 0,
    structures: 0,
    'paths-lighting': 0,
    instruments: 0,
  };

  const rowMap = new Map<PlaceableId, BimScheduleRow>();

  let canopyCoverageSqFt = 0;
  let hardscapeSqFt = 0;
  let linearWallFenceFt = 0;
  let waterAreaSqFt = 0;

  for (const placed of placedItems) {
    const item = getSpaceItem(placed.itemId);
    const spec = getItemBimSpec(placed.itemId);
    const sc = placed.scale || 1;
    const areaScale = sc * sc;

    layerCounts[spec.layer] += 1;

    const canopySqFt =
      spec.canopyRadiusFt > 0
        ? Math.PI * Math.pow(spec.canopyRadiusFt * sc, 2) * 0.78
        : 0;
    const fpSqFt = spec.footprintSqFt * areaScale;
    const linFt = spec.linearFt * sc;
    const watSqFt = spec.waterSqFt * areaScale;

    canopyCoverageSqFt += canopySqFt;
    if (
      spec.layer === 'structures' ||
      spec.layer === 'paths-lighting' ||
      placed.itemId === 'stepping-stone' ||
      placed.itemId === 'raised-bed'
    ) {
      hardscapeSqFt += fpSqFt;
    }
    if (placed.itemId === 'stone-wall' || placed.itemId === 'fence') {
      linearWallFenceFt += linFt;
    }
    waterAreaSqFt += watSqFt;

    const existing = rowMap.get(placed.itemId);
    if (existing) {
      existing.count += 1;
      existing.footprintSqFt += fpSqFt;
      existing.canopySqFt += canopySqFt;
      existing.linearFt += linFt;
      existing.waterSqFt += watSqFt;
    } else {
      rowMap.set(placed.itemId, {
        itemId: placed.itemId,
        name: item.commonName,
        scientificName: item.scientificName,
        layer: spec.layer,
        unitLabel: spec.unitLabel,
        count: 1,
        footprintSqFt: fpSqFt,
        canopySqFt,
        linearFt: linFt,
        waterSqFt: watSqFt,
      });
    }
  }

  // Compute painted path area with overlap factor (~0.62 since continuous brush strokes overlap)
  const pathMap = new Map<PathMaterialId, { count: number; area: number }>();
  let pathAreaSqFt = 0;
  for (const node of pathNodes) {
    const rFt = node.radius * 10;
    const nodeArea = Math.PI * rFt * rFt * 0.56;
    pathAreaSqFt += nodeArea;
    const prev = pathMap.get(node.material);
    if (prev) {
      prev.count += 1;
      prev.area += nodeArea;
    } else {
      pathMap.set(node.material, { count: 1, area: nodeArea });
    }
  }

  const pathRows: BimPathRow[] = PATH_MATERIALS.map((mat) => {
    const entry = pathMap.get(mat.id);
    return {
      material: mat.id,
      label: mat.label,
      nodeCount: entry?.count ?? 0,
      areaSqFt: Math.round(entry?.area ?? 0),
    };
  }).filter((r) => r.nodeCount > 0);

  const totalHardscape = Math.round(hardscapeSqFt + pathAreaSqFt);
  // Soft saturation cap for overlapping tree crowns
  const effectiveCanopy = Math.min(
    CLEARING_AREA_SQFT * 0.96,
    canopyCoverageSqFt * 0.85,
  );
  const canopyCoveragePct = Math.min(
    100,
    Math.round((effectiveCanopy / CLEARING_AREA_SQFT) * 100),
  );

  const layerOrder = new Map(BIM_LAYERS.map((l, idx) => [l.id, idx]));
  const rows = Array.from(rowMap.values()).sort((a, b) => {
    const la = layerOrder.get(a.layer) ?? 99;
    const lb = layerOrder.get(b.layer) ?? 99;
    if (la !== lb) return la - lb;
    return b.count - a.count;
  });

  return {
    siteAreaSqFt: CLEARING_AREA_SQFT,
    totalItems: placedItems.length,
    treeCount: layerCounts.trees,
    understoryCount: layerCounts.understory,
    structureCount: layerCounts.structures,
    waterStoneCount: layerCounts['water-stone'],
    lightingHardscapeCount: layerCounts['paths-lighting'],
    canopyCoverageSqFt: Math.round(effectiveCanopy),
    canopyCoveragePct,
    hardscapeSqFt: totalHardscape,
    pathAreaSqFt: Math.round(pathAreaSqFt),
    linearWallFenceFt: Math.round(linearWallFenceFt),
    waterAreaSqFt: Math.round(waterAreaSqFt),
    layerCounts,
    rows,
    pathRows,
  };
}

function csvEscape(val: string | number): string {
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export function downloadBimScheduleCsv(
  summary: BimScheduleSummary,
  seasonValue: number,
) {
  const layerLabels = new Map(BIM_LAYERS.map((l) => [l.id, l.label]));
  const lines: string[] = [
    'Virginia Sylva — Landscape BIM Plant & Materials Schedule',
    `Site Clearing Radius (ft),${CLEARING_RADIUS_FT},Total Site Area (sq ft),${summary.siteAreaSqFt},Season,${csvEscape(formatSeasonLabel(seasonValue).seasonName)}`,
    `Canopy Coverage (%),${summary.canopyCoveragePct}%,Total Hardscape & Paths (sq ft),${summary.hardscapeSqFt},Walls & Fences (lin ft),${summary.linearWallFenceFt},Water Area (sq ft),${summary.waterAreaSqFt}`,
    '',
    'Layer,Item Name,Botanical / Material Spec,Unit,Quantity,Footprint (sq ft),Canopy (sq ft),Linear (ft),Water (sq ft)',
  ];

  for (const row of summary.rows) {
    lines.push(
      [
        csvEscape(layerLabels.get(row.layer) ?? row.layer),
        csvEscape(row.name),
        csvEscape(row.scientificName),
        csvEscape(row.unitLabel),
        row.count,
        Math.round(row.footprintSqFt),
        Math.round(row.canopySqFt),
        Math.round(row.linearFt),
        Math.round(row.waterSqFt),
      ].join(','),
    );
  }

  for (const prow of summary.pathRows) {
    lines.push(
      [
        'Paths & Lighting',
        csvEscape(`${prow.label} Path Surface`),
        'Painted ground hardscape',
        'Sq Ft',
        prow.nodeCount,
        prow.areaSqFt,
        0,
        0,
        0,
      ].join(','),
    );
  }

  const blob = new Blob([lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `virginia-sylva-bim-schedule-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
