export type UUID = string;
export type ISODatetime = string; // ISO 8601 datetime
export type ISODate = string; // ISO 8601 date
export type HexColor = string; // #RRGGBB format

export interface ViewportState {
  panX: number;
  panY: number;
  zoom: number; // range [0.05, 10.0]
}

export interface UIState {
  gridVisible: boolean;
  snapEnabled: boolean;
  lastGenerateOptions?: import('./generate').GenerateOptions;
}

export interface GridConfig {
  cellSizeCm: number;      // default 100
  snapIncrementCm: number; // default 10
  originX: number;
  originY: number;
}

export interface ProjectLocation {
  lat: number | null;
  lng: number | null;
  label: string | null;
}

export interface Vec2 {
  x: number;
  y: number;
}

export type EdgeType = 'line' | 'arc';

export interface YardBoundaryEdge {
  type: EdgeType;
  arcSagitta: number | null;
}

export interface YardBoundary {
  vertices: Vec2[];
  edgeLengths: (number | null)[];
  edgeTypes: YardBoundaryEdge[];
}

export interface Layer {
  id: UUID;
  name: string; // max 100 chars
  visible: boolean;
  locked: boolean;
  order: number; // integer, display order only
}

export interface Group {
  id: UUID;
  name: string | null; // max 100 chars
  elementIds: UUID[];
  layerId: UUID;
}

export type WeatherCondition = 'sunny' | 'partly-cloudy' | 'cloudy' | 'rainy' | 'snowy' | 'windy';

export interface WeatherData {
  tempC: number | null;
  condition: WeatherCondition | null;
  humidity: number | null; // 0-100
}

export interface JournalEntry {
  id: UUID;
  projectId: UUID;
  date: ISODate;
  title: string | null;
  content: string; // markdown
  tags: string[];
  linkedElementIds: UUID[];
  weather: WeatherData | null;
  createdAt: ISODatetime;
}

export type ElementType = 'terrain' | 'plant' | 'structure' | 'path' | 'label' | 'dimension';

export interface BaseElement {
  id: UUID;
  type: ElementType;
  x: number; // cm
  y: number; // cm
  width: number; // cm
  height: number; // cm
  rotation: number; // degrees, [0, 360), only structures use non-zero
  zIndex: number; // integer, default 0
  locked: boolean;
  layerId: UUID;
  groupId: UUID | null;
  createdAt: ISODatetime;
  updatedAt: ISODatetime;
}

export interface TerrainElement extends BaseElement {
  type: 'terrain';
  terrainTypeId: string;
  // width and height are always 100 (1 grid cell)
  // position (x,y) is top-left corner, aligned to 100cm boundaries
}

export type PlantStatus = 'planned' | 'planted' | 'growing' | 'harvested' | 'removed';

export interface PlantElement extends BaseElement {
  type: 'plant';
  plantTypeId: string;
  plantedDate: ISODate | null;
  status: PlantStatus;
  quantity: number; // integer >= 1
  notes: string | null;
  // width and height equal spacingCm from plant type registry
  // rotation is always 0
}

export type StructureShape = 'straight' | 'curved';

export interface StructureElement extends BaseElement {
  type: 'structure';
  structureTypeId: string;
  shape: StructureShape;
  arcSagitta: number | null; // signed bulge height in cm
  notes: string | null;
}

export interface PathSegment {
  type: EdgeType;
  arcSagitta: number | null;
}

export interface PathElement extends BaseElement {
  type: 'path';
  pathTypeId: string;
  points: Vec2[]; // N+1 points for N segments
  segments: PathSegment[]; // always points.length - 1 entries
  strokeWidthCm: number;
  closed: boolean;
  // x,y = points[0]; width/height = AABB of all points
}

export type TextAlign = 'left' | 'center' | 'right';

export interface LabelElement extends BaseElement {
  type: 'label';
  text: string;
  fontSize: number; // px, 4-200
  fontColor: HexColor;
  fontFamily: string;
  textAlign: TextAlign;
  bold: boolean;
  italic: boolean;
  // rotation is always 0
}

export interface DimensionElement extends BaseElement {
  type: 'dimension';
  startPoint: Vec2; // world cm
  endPoint: Vec2;   // world cm
  startElementId: UUID | null;
  endElementId: UUID | null;
  offsetCm: number; // perpendicular offset, default 50
  displayUnit: 'm'; // only 'm' supported
  precision: number; // 0-4 decimal places, default 2
  // rotation is always 0
  // x,y = startPoint; width/height = AABB of startPoint, endPoint, and leader line
}

export type CanvasElement =
  | TerrainElement
  | PlantElement
  | StructureElement
  | PathElement
  | LabelElement
  | DimensionElement;

export type TerrainCategory = 'natural' | 'hardscape' | 'water' | 'other';

export interface TerrainType {
  id: string; // lowercase kebab-case slug
  name: string; // max 100 chars
  category: TerrainCategory;
  color: HexColor;
  textureUrl: string | null;
  costPerUnit: number | null; // per m²
  description: string | null;
}

export type GrowthForm = 'herb' | 'shrub' | 'tree' | 'groundcover' | 'climber';
export type SunRequirement = 'full' | 'partial' | 'shade';
export type WaterNeed = 'low' | 'medium' | 'high';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export interface PlantType {
  id: string;
  name: string;
  category: string; // e.g. 'vegetable', 'herb', 'tree', max 50 chars
  growthForm: GrowthForm;
  iconUrl: string;
  spacingCm: number; // 1-500
  rowSpacingCm: number; // 1-500
  canopyWidthCm: number | null; // 1-5000, for trees and shrubs
  heightCm: number | null; // informational only, not rendered
  trunkWidthCm: number | null; // trunk diameter for trees
  sunRequirement: SunRequirement;
  waterNeed: WaterNeed;
  season: Season[];
  daysToHarvest: number | null; // 1-365
  companionPlants: string[]; // plant type ids
  costPerUnit: number | null; // per plant
  description: string | null;
}

// Open-ended string per spec; the named values carry collision-rule semantics (canvas-viewport.md § Collision Rules)
export type StructureCategory = string;

export interface StructureType {
  id: string;
  name: string;
  category: StructureCategory;
  iconUrl: string;
  defaultWidthCm: number; // 1-10000, 2D canvas footprint X
  defaultDepthCm: number; // 1-10000, 2D canvas footprint Y
  costPerUnit: number | null; // per structure
  description: string | null;
}

export interface PathType {
  id: string;
  name: string;
  category: string; // e.g. 'edging', 'walkway'
  defaultWidthCm: number; // 1-500
  color: HexColor;
  costPerUnit: number | null; // per linear meter
  description: string | null;
}

export interface Registries {
  terrain: TerrainType[];
  plants: PlantType[];
  structures: StructureType[];
  paths: PathType[];
}

export interface Project {
  id: UUID;
  name: string; // max 200 chars
  createdAt: ISODatetime;
  updatedAt: ISODatetime;
  location: ProjectLocation;
  gridConfig: GridConfig;
  viewport: ViewportState;
  uiState: UIState;
  yardBoundary: YardBoundary | null;
  currency: string; // display symbol, default '$'
  layers: Layer[];
  groups: Group[];
  elements: CanvasElement[];
  journalEntries: JournalEntry[];
}

export interface ProjectExport {
  version: '1.0';
  exportedAt: ISODatetime;
  project: Project;
  registries: Registries;
}

export type ToolId =
  | 'select'
  | 'hand'
  | 'terrain'
  | 'plant'
  | 'structure'
  | 'arc'
  | 'eraser'
  | 'label'
  | 'measurement'
  | 'path';

export interface SnapLine {
  axis: 'x' | 'y';
  value: number; // world coordinate where the guide line is drawn
}

export interface SnapResult {
  x: number;
  y: number;
  snapped: boolean;
  guideLines: SnapLine[];
}

export type SnapContext = 'place' | 'move' | 'label' | 'measurement' | 'resize';
