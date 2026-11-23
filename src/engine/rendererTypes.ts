import {
  BackdropStyle,
  BimLayerId,
  PathMaterialId,
  PathNode,
  PlaceableId,
  PlacedSpaceItem,
  WeatherMode,
} from '../data/virginiaTrees';
import { PaintMaterialMode, VisualFilterSettings } from './visualFilters';

export type DesignerTool = 'orbit' | 'plant' | 'path' | 'remove';

export type ExperienceMode = 'design' | 'plan' | 'pov' | 'drift';

export type SnapGridFt = 0 | 1 | 2;

export interface BimLayerToggle {
  visible: boolean;
  locked: boolean;
}

export type BimLayerState = Record<BimLayerId, BimLayerToggle>;

export const DEFAULT_BIM_LAYERS: BimLayerState = {
  trees: { visible: true, locked: false },
  understory: { visible: true, locked: false },
  'water-stone': { visible: true, locked: false },
  structures: { visible: true, locked: false },
  'paths-lighting': { visible: true, locked: false },
  instruments: { visible: true, locked: false },
};

export interface SceneSimulationState {
  placedItems: PlacedSpaceItem[];
  pathNodes: PathNode[];
  activeBrushId: PlaceableId;
  activePathMaterial: PathMaterialId;
  pathBrushRadius: number; // world units (0.16..0.44)
  activeRotation: number; // radians
  snapGridFt: SnapGridFt;
  showGrid: boolean;
  tool: DesignerTool;
  povMode: boolean;
  planMode: boolean;
  backdropStyle: BackdropStyle;
  bimLayers: BimLayerState;
  entrance: { x: number; z: number; yaw: number };
  season: number; // 0..4
  timeOfDay: number; // 0..24
  wind: number; // 0..1
  weather: WeatherMode;
  weatherIntensity: number; // 0..1
  studioBackdrop: boolean;
  autoOrbit: boolean;
  fireflies: boolean;
  reducedMotion: boolean;
  paused: boolean;
  stackRelief: number; // 0.5..1.8 sprite-stacking layer dimensionality
  paintMode: PaintMaterialMode; // 'pixel' | 'oil-3d' | 'living-canvas'
  impasto: number; // 0..1 oil bristle & canvas weave relief
  visualFilter: VisualFilterSettings;
}

export interface EngineCallbacks {
  onContextLost?: () => void;
  onCanopyChange?: (growth: number) => void;
  onGroundAction?: (x: number, z: number, tool: DesignerTool) => void;
  onPathStrokeStart?: () => void;
  onPathStamp?: (x: number, z: number) => void;
  onPathStrokeEnd?: () => void;
}

export interface SanctuaryRenderer {
  updateState(next: SceneSimulationState): void;
  setVirtualMove(forward: number, strafe: number, turn?: number): void;
  resetEntrance(): void;
  triggerSkyDescentArrival(): void;
  triggerGust(strength?: number, shedCanopy?: boolean): void;
  growBack(): void;
  resize(): void;
  captureDataUrl(): string | null;
  dispose(): void;
}
