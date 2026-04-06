import type {
  UUID,
  HexColor,
  Project,
  Registries,
  Layer,
  Group,
  CanvasElement,
  TerrainElement,
  PlantElement,
  StructureElement,
  PathElement,
  LabelElement,
  DimensionElement,
  TerrainType,
  PlantType,
  StructureType,
  PathType,
  Vec2,
  YardBoundary,
  JournalEntry,
  PlantStatus,
  StructureShape,
  EdgeType,
  TextAlign,
  WeatherCondition,
  TerrainCategory,
  GrowthForm,
  SunRequirement,
  WaterNeed,
  Season,
} from '../types/schema';

export interface ImportReport {
  warnings: string[];
}

export interface ImportResult {
  project: Project;
  registries: Registries;
  report: ImportReport;
}

export function generateUUID(): UUID {
  return crypto.randomUUID();
}

// ─── Hex color helpers ────────────────────────────────────────────────────────

export function normalizeHexColor(val: unknown, fallback: HexColor): HexColor {
  if (typeof val !== 'string') return fallback;
  let s = val.trim();
  if (!s.startsWith('#')) return fallback;
  s = s.slice(1);

  // Strip alpha (8-digit → 6-digit)
  if (s.length === 8) s = s.slice(0, 6);

  // Expand 3-digit shorthand to 6-digit
  if (s.length === 3) {
    s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  }

  if (s.length !== 6) return fallback;
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return fallback;

  return `#${s.toUpperCase()}` as HexColor;
}

// ─── Type guards / coercion helpers ──────────────────────────────────────────

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v);
}

function isISODatetime(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const d = Date.parse(v);
  return !isNaN(d);
}

function isISODate(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function isUUID(v: unknown): v is UUID {
  if (typeof v !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function isBool(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function isSlug(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) && v.length <= 50;
}

function nowISO(): string {
  return new Date().toISOString();
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function titleCaseFromId(id: string): string {
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── Registry validation ──────────────────────────────────────────────────────

function validateTerrainType(raw: unknown, warnings: string[]): TerrainType | null {
  if (!isObj(raw)) return null;
  const id = raw['id'];
  if (!isSlug(id)) {
    warnings.push(`Terrain type skipped: invalid or missing id`);
    return null;
  }
  const name = isString(raw['name']) && raw['name'].length > 0
    ? raw['name'].slice(0, 100)
    : titleCaseFromId(id);
  const TERRAIN_CATS: TerrainCategory[] = ['natural', 'hardscape', 'water', 'other'];
  const category: TerrainCategory = TERRAIN_CATS.includes(raw['category'] as TerrainCategory)
    ? (raw['category'] as TerrainCategory)
    : 'other';
  const color = normalizeHexColor(raw['color'], '#999999');
  const textureUrl = isString(raw['textureUrl']) ? raw['textureUrl'] : null;
  const costPerUnit =
    isFiniteNum(raw['costPerUnit']) && raw['costPerUnit'] > 0 ? raw['costPerUnit'] : null;
  const description =
    isString(raw['description']) ? raw['description'].slice(0, 500) : null;

  return { id, name, category, color, textureUrl, costPerUnit, description };
}

function validatePlantType(raw: unknown, warnings: string[]): PlantType | null {
  if (!isObj(raw)) return null;
  const id = raw['id'];
  if (!isSlug(id)) {
    warnings.push(`Plant type skipped: invalid or missing id`);
    return null;
  }
  const iconUrl = raw['iconUrl'];
  if (!isString(iconUrl) || iconUrl.length === 0) {
    warnings.push(`Plant type "${id}" skipped: missing iconUrl`);
    return null;
  }
  const name = isString(raw['name']) && raw['name'].length > 0
    ? raw['name'].slice(0, 100)
    : titleCaseFromId(id);
  const category = isString(raw['category']) && raw['category'].length > 0
    ? raw['category'].slice(0, 50)
    : 'other';
  const GROWTH_FORMS: GrowthForm[] = ['herb', 'shrub', 'tree', 'groundcover', 'climber'];
  const growthForm: GrowthForm = GROWTH_FORMS.includes(raw['growthForm'] as GrowthForm)
    ? (raw['growthForm'] as GrowthForm)
    : 'herb';
  const spacingCm =
    isFiniteNum(raw['spacingCm']) && raw['spacingCm'] >= 1 && raw['spacingCm'] <= 500
      ? raw['spacingCm']
      : 30;
  const rowSpacingCm =
    isFiniteNum(raw['rowSpacingCm']) && raw['rowSpacingCm'] >= 1 && raw['rowSpacingCm'] <= 500
      ? raw['rowSpacingCm']
      : spacingCm;
  const canopyWidthCm =
    isFiniteNum(raw['canopyWidthCm']) && raw['canopyWidthCm'] >= 1 && raw['canopyWidthCm'] <= 5000
      ? raw['canopyWidthCm']
      : null;
  const heightCm =
    isFiniteNum(raw['heightCm']) && raw['heightCm'] >= 1 && raw['heightCm'] <= 5000
      ? raw['heightCm']
      : null;
  const trunkWidthCm =
    isFiniteNum(raw['trunkWidthCm']) && raw['trunkWidthCm'] >= 1 && raw['trunkWidthCm'] <= 500
      ? raw['trunkWidthCm']
      : null;
  const SUN_REQS: SunRequirement[] = ['full', 'partial', 'shade'];
  const sunRequirement: SunRequirement = SUN_REQS.includes(raw['sunRequirement'] as SunRequirement)
    ? (raw['sunRequirement'] as SunRequirement)
    : 'full';
  const WATER_NEEDS: WaterNeed[] = ['low', 'medium', 'high'];
  const waterNeed: WaterNeed = WATER_NEEDS.includes(raw['waterNeed'] as WaterNeed)
    ? (raw['waterNeed'] as WaterNeed)
    : 'medium';
  const SEASONS: Season[] = ['spring', 'summer', 'fall', 'winter'];
  const season: Season[] = isArray(raw['season'])
    ? (raw['season'] as unknown[]).filter((s): s is Season => SEASONS.includes(s as Season))
    : [];
  const daysToHarvest =
    isFiniteNum(raw['daysToHarvest']) &&
    Number.isInteger(raw['daysToHarvest']) &&
    raw['daysToHarvest'] >= 1 &&
    raw['daysToHarvest'] <= 365
      ? raw['daysToHarvest']
      : null;
  const companionPlants = isArray(raw['companionPlants'])
    ? (raw['companionPlants'] as unknown[]).filter((s): s is string => isString(s))
    : [];
  const costPerUnit =
    isFiniteNum(raw['costPerUnit']) && raw['costPerUnit'] > 0 ? raw['costPerUnit'] : null;
  const description =
    isString(raw['description']) ? raw['description'].slice(0, 500) : null;

  return {
    id,
    name,
    category,
    growthForm,
    iconUrl,
    spacingCm,
    rowSpacingCm,
    canopyWidthCm,
    heightCm,
    trunkWidthCm,
    sunRequirement,
    waterNeed,
    season,
    daysToHarvest,
    companionPlants,
    costPerUnit,
    description,
  };
}

function validateStructureType(raw: unknown, warnings: string[]): StructureType | null {
  if (!isObj(raw)) return null;
  const id = raw['id'];
  if (!isSlug(id)) {
    warnings.push(`Structure type skipped: invalid or missing id`);
    return null;
  }
  const iconUrl = raw['iconUrl'];
  if (!isString(iconUrl) || iconUrl.length === 0) {
    warnings.push(`Structure type "${id}" skipped: missing iconUrl`);
    return null;
  }
  const name = isString(raw['name']) && raw['name'].length > 0
    ? raw['name'].slice(0, 100)
    : titleCaseFromId(id);
  const category = isString(raw['category']) && raw['category'].length > 0
    ? raw['category'].slice(0, 50)
    : 'other';
  const defaultWidthCm =
    isFiniteNum(raw['defaultWidthCm']) && raw['defaultWidthCm'] >= 1 && raw['defaultWidthCm'] <= 10000
      ? raw['defaultWidthCm']
      : 100;
  const defaultDepthCm =
    isFiniteNum(raw['defaultDepthCm']) && raw['defaultDepthCm'] >= 1 && raw['defaultDepthCm'] <= 10000
      ? raw['defaultDepthCm']
      : 100;
  const costPerUnit =
    isFiniteNum(raw['costPerUnit']) && raw['costPerUnit'] > 0 ? raw['costPerUnit'] : null;
  const description =
    isString(raw['description']) ? raw['description'].slice(0, 500) : null;

  return { id, name, category, iconUrl, defaultWidthCm, defaultDepthCm, costPerUnit, description };
}

function validatePathType(raw: unknown, warnings: string[]): PathType | null {
  if (!isObj(raw)) return null;
  const id = raw['id'];
  if (!isSlug(id)) {
    warnings.push(`Path type skipped: invalid or missing id`);
    return null;
  }
  const name = isString(raw['name']) && raw['name'].length > 0
    ? raw['name'].slice(0, 100)
    : titleCaseFromId(id);
  const category = isString(raw['category']) && raw['category'].length > 0
    ? raw['category'].slice(0, 50)
    : 'other';
  const defaultWidthCm =
    isFiniteNum(raw['defaultWidthCm']) && raw['defaultWidthCm'] >= 1 && raw['defaultWidthCm'] <= 500
      ? raw['defaultWidthCm']
      : 100;
  const color = normalizeHexColor(raw['color'], '#999999');
  const costPerUnit =
    isFiniteNum(raw['costPerUnit']) && raw['costPerUnit'] > 0 ? raw['costPerUnit'] : null;
  const description =
    isString(raw['description']) ? raw['description'].slice(0, 500) : null;

  return { id, name, category, defaultWidthCm, color, costPerUnit, description };
}

function mergeRegistries(
  builtin: Registries,
  imported: Partial<Registries>,
  warnings: string[]
): Registries {
  // Imported types win on ID collision

  const mergeList = <T extends { id: string }>(
    builtinList: T[],
    importedList: T[]
  ): T[] => {
    const result = new Map<string, T>();
    for (const item of builtinList) result.set(item.id, item);
    for (const item of importedList) result.set(item.id, item); // imported overwrites
    return Array.from(result.values());
  };

  const rawTerrain = isArray(imported.terrain) ? imported.terrain : [];
  const rawPlants = isArray(imported.plants) ? imported.plants : [];
  const rawStructures = isArray(imported.structures) ? imported.structures : [];
  const rawPaths = isArray(imported.paths) ? imported.paths : [];

  const importedTerrain = rawTerrain
    .map((r) => validateTerrainType(r, warnings))
    .filter((r): r is TerrainType => r !== null);
  const importedPlants = rawPlants
    .map((r) => validatePlantType(r, warnings))
    .filter((r): r is PlantType => r !== null);
  const importedStructures = rawStructures
    .map((r) => validateStructureType(r, warnings))
    .filter((r): r is StructureType => r !== null);
  const importedPaths = rawPaths
    .map((r) => validatePathType(r, warnings))
    .filter((r): r is PathType => r !== null);

  return {
    terrain: mergeList(builtin.terrain, importedTerrain),
    plants: mergeList(builtin.plants, importedPlants),
    structures: mergeList(builtin.structures, importedStructures),
    paths: mergeList(builtin.paths, importedPaths),
  };
}

// ─── Layer validation ─────────────────────────────────────────────────────────

function validateLayers(
  raw: unknown,
  warnings: string[]
): { layers: Layer[]; defaultLayerId: UUID } {
  const now = nowISO();
  const defaultLayerId = generateUUID();
  const defaultLayer: Layer = {
    id: defaultLayerId,
    name: 'Default',
    visible: true,
    locked: false,
    order: 0,
  };

  if (!isArray(raw) || raw.length === 0) {
    warnings.push('layers: invalid or empty — using default layer');
    return { layers: [defaultLayer], defaultLayerId };
  }

  const seenIds = new Set<UUID>();
  const layers: Layer[] = [];
  let orderCounter = 0;

  for (const item of raw) {
    if (!isObj(item)) {
      warnings.push('Layer skipped: not an object');
      continue;
    }
    let id: UUID;
    if (isUUID(item['id']) && !seenIds.has(item['id'] as UUID)) {
      id = item['id'] as UUID;
    } else {
      id = generateUUID();
      if (isUUID(item['id'])) {
        warnings.push(`Layer id "${String(item['id'])}" duplicated — regenerated`);
      }
    }
    seenIds.add(id);
    const name =
      isString(item['name']) && item['name'].trim().length > 0
        ? item['name'].trim().slice(0, 100)
        : 'Layer';
    const visible = isBool(item['visible']) ? item['visible'] : true;
    const locked = isBool(item['locked']) ? item['locked'] : false;
    const order =
      isFiniteNum(item['order']) && Number.isInteger(item['order'])
        ? item['order']
        : orderCounter;
    orderCounter++;
    // suppress unused warning
    void now;
    layers.push({ id, name, visible, locked, order });
  }

  if (layers.length === 0) {
    warnings.push('All layers were invalid — using default layer');
    return { layers: [defaultLayer], defaultLayerId };
  }

  return { layers, defaultLayerId: layers[0].id };
}

// ─── Yard boundary validation ─────────────────────────────────────────────────

function validateVec2(v: unknown): Vec2 | null {
  if (!isObj(v)) return null;
  if (!isFiniteNum(v['x']) || !isFiniteNum(v['y'])) return null;
  return { x: v['x'], y: v['y'] };
}

function validateYardBoundary(raw: unknown, warnings: string[]): YardBoundary | null {
  if (raw === null || raw === undefined) return null;
  if (!isObj(raw)) {
    warnings.push('yardBoundary: invalid object — set to null');
    return null;
  }

  const rawVertices = raw['vertices'];
  if (!isArray(rawVertices)) {
    warnings.push('yardBoundary.vertices: missing — set boundary to null');
    return null;
  }

  const vertices: Vec2[] = rawVertices
    .map((v) => validateVec2(v))
    .filter((v): v is Vec2 => v !== null);

  if (vertices.length < 3) {
    warnings.push('yardBoundary.vertices: fewer than 3 valid vertices — set boundary to null');
    return null;
  }

  const n = vertices.length;

  const rawEdgeLengths = raw['edgeLengths'];
  let edgeLengths: (number | null)[];
  if (isArray(rawEdgeLengths) && rawEdgeLengths.length === n) {
    edgeLengths = rawEdgeLengths.map((v) => (isFiniteNum(v) ? v : null));
  } else {
    edgeLengths = new Array(n).fill(null);
  }

  const EDGE_TYPES: EdgeType[] = ['line', 'arc'];
  const rawEdgeTypes = raw['edgeTypes'];
  let edgeTypes: import('../types/schema').YardBoundaryEdge[];
  if (isArray(rawEdgeTypes) && rawEdgeTypes.length === n) {
    edgeTypes = rawEdgeTypes.map((et) => {
      if (!isObj(et)) return { type: 'line' as EdgeType, arcSagitta: null };
      const type: EdgeType = EDGE_TYPES.includes(et['type'] as EdgeType)
        ? (et['type'] as EdgeType)
        : 'line';
      const arcSagitta = isFiniteNum(et['arcSagitta']) ? et['arcSagitta'] : null;
      return { type, arcSagitta };
    });
  } else {
    edgeTypes = Array.from({ length: n }, () => ({ type: 'line' as EdgeType, arcSagitta: null }));
  }

  return { vertices, edgeLengths, edgeTypes };
}

// ─── Element validation ───────────────────────────────────────────────────────

function validateBaseFields(
  raw: Record<string, unknown>,
  seenIds: Set<UUID>,
  defaultLayerId: UUID,
  validLayerIds: Set<UUID>,
  validGroupIds: Set<UUID>,
  warnings: string[]
): {
  id: UUID;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
  layerId: UUID;
  groupId: UUID | null;
  createdAt: string;
  updatedAt: string;
} {
  const now = nowISO();

  let id: UUID;
  if (isUUID(raw['id']) && !seenIds.has(raw['id'] as UUID)) {
    id = raw['id'] as UUID;
  } else {
    id = generateUUID();
    if (isUUID(raw['id'])) {
      warnings.push(`Element id "${String(raw['id'])}" duplicated — regenerated`);
    }
  }
  seenIds.add(id);

  const x = isFiniteNum(raw['x']) ? raw['x'] : 0;
  const y = isFiniteNum(raw['y']) ? raw['y'] : 0;
  const width = isFiniteNum(raw['width']) && raw['width'] > 0 ? raw['width'] : 100;
  const height = isFiniteNum(raw['height']) && raw['height'] > 0 ? raw['height'] : 100;
  const rawRot = isFiniteNum(raw['rotation']) ? raw['rotation'] : 0;
  const rotation = ((rawRot % 360) + 360) % 360;
  const zIndex =
    isFiniteNum(raw['zIndex']) && Number.isInteger(raw['zIndex']) ? raw['zIndex'] : 0;
  const locked = isBool(raw['locked']) ? raw['locked'] : false;
  const layerId =
    isUUID(raw['layerId']) && validLayerIds.has(raw['layerId'] as UUID)
      ? (raw['layerId'] as UUID)
      : defaultLayerId;
  const rawGroupId = raw['groupId'];
  const groupId =
    isUUID(rawGroupId) && validGroupIds.has(rawGroupId as UUID)
      ? (rawGroupId as UUID)
      : null;
  const createdAt = isISODatetime(raw['createdAt']) ? raw['createdAt'] : now;
  const updatedAt = isISODatetime(raw['updatedAt']) ? raw['updatedAt'] : now;

  return { id, x, y, width, height, rotation, zIndex, locked, layerId, groupId, createdAt, updatedAt };
}

function validateTerrainElement(
  raw: Record<string, unknown>,
  base: ReturnType<typeof validateBaseFields>,
  _mergedRegistries: Registries,
  warnings: string[]
): TerrainElement {
  const terrainTypeId =
    isString(raw['terrainTypeId']) && raw['terrainTypeId'].length > 0
      ? raw['terrainTypeId']
      : 'grass';
  if (!isString(raw['terrainTypeId']) || raw['terrainTypeId'].length === 0) {
    warnings.push(`Terrain element "${base.id}": missing terrainTypeId — defaulted to "grass"`);
  }
  return {
    ...base,
    type: 'terrain',
    terrainTypeId,
    width: 100,
    height: 100,
  };
}

function validatePlantElement(
  raw: Record<string, unknown>,
  base: ReturnType<typeof validateBaseFields>,
  mergedRegistries: Registries,
  warnings: string[]
): PlantElement | null {
  const plantTypeId = raw['plantTypeId'];
  if (!isString(plantTypeId) || plantTypeId.length === 0) {
    warnings.push(`Plant element "${base.id}" skipped: missing plantTypeId`);
    return null;
  }
  const plantType = mergedRegistries.plants.find((p) => p.id === plantTypeId);
  if (!plantType) {
    warnings.push(`Plant element "${base.id}" skipped: unknown plantTypeId "${plantTypeId}"`);
    return null;
  }

  const plantedDate = isISODate(raw['plantedDate']) ? raw['plantedDate'] : null;
  const STATUSES: PlantStatus[] = ['planned', 'planted', 'growing', 'harvested', 'removed'];
  const status: PlantStatus = STATUSES.includes(raw['status'] as PlantStatus)
    ? (raw['status'] as PlantStatus)
    : 'planned';
  const quantity =
    isFiniteNum(raw['quantity']) && Number.isInteger(raw['quantity']) && raw['quantity'] >= 1
      ? raw['quantity']
      : 1;
  const notes =
    isString(raw['notes']) ? raw['notes'].slice(0, 2000) : null;

  return {
    ...base,
    type: 'plant',
    plantTypeId,
    plantedDate,
    status,
    quantity,
    notes,
    width: plantType.spacingCm,
    height: plantType.spacingCm,
  };
}

function validateStructureElement(
  raw: Record<string, unknown>,
  base: ReturnType<typeof validateBaseFields>,
  mergedRegistries: Registries,
  warnings: string[]
): StructureElement | null {
  const structureTypeId = raw['structureTypeId'];
  if (!isString(structureTypeId) || structureTypeId.length === 0) {
    warnings.push(`Structure element "${base.id}" skipped: missing structureTypeId`);
    return null;
  }
  const structureType = mergedRegistries.structures.find((s) => s.id === structureTypeId);
  if (!structureType) {
    warnings.push(`Structure element "${base.id}" skipped: unknown structureTypeId "${structureTypeId}"`);
    return null;
  }
  const SHAPES: StructureShape[] = ['straight', 'curved'];
  const shape: StructureShape = SHAPES.includes(raw['shape'] as StructureShape)
    ? (raw['shape'] as StructureShape)
    : 'straight';
  const arcSagitta = isFiniteNum(raw['arcSagitta']) ? raw['arcSagitta'] : null;
  const notes = isString(raw['notes']) ? raw['notes'].slice(0, 2000) : null;

  return {
    ...base,
    type: 'structure',
    structureTypeId,
    shape,
    arcSagitta,
    notes,
  };
}

function validatePathElement(
  raw: Record<string, unknown>,
  base: ReturnType<typeof validateBaseFields>,
  mergedRegistries: Registries,
  warnings: string[]
): PathElement | null {
  const pathTypeId = raw['pathTypeId'];
  if (!isString(pathTypeId) || pathTypeId.length === 0) {
    warnings.push(`Path element "${base.id}" skipped: missing pathTypeId`);
    return null;
  }
  const pathType = mergedRegistries.paths.find((p) => p.id === pathTypeId);
  if (!pathType) {
    warnings.push(`Path element "${base.id}" skipped: unknown pathTypeId "${pathTypeId}"`);
    return null;
  }

  const rawPoints = raw['points'];
  if (!isArray(rawPoints)) {
    warnings.push(`Path element "${base.id}" skipped: missing points`);
    return null;
  }
  const points: Vec2[] = rawPoints
    .map((p) => validateVec2(p))
    .filter((p): p is Vec2 => p !== null);
  if (points.length < 2) {
    warnings.push(`Path element "${base.id}" skipped: fewer than 2 valid points`);
    return null;
  }

  const EDGE_TYPES: EdgeType[] = ['line', 'arc'];
  const expectedSegments = points.length - 1;
  const rawSegments = isArray(raw['segments']) ? raw['segments'] : [];
  const segments = Array.from({ length: expectedSegments }, (_, i) => {
    const seg = rawSegments[i];
    if (!isObj(seg)) return { type: 'line' as EdgeType, arcSagitta: null };
    const type: EdgeType = EDGE_TYPES.includes(seg['type'] as EdgeType)
      ? (seg['type'] as EdgeType)
      : 'line';
    const arcSagitta = isFiniteNum(seg['arcSagitta']) ? seg['arcSagitta'] : null;
    return { type, arcSagitta };
  });

  const strokeWidthCm =
    isFiniteNum(raw['strokeWidthCm']) && raw['strokeWidthCm'] >= 1 && raw['strokeWidthCm'] <= 500
      ? raw['strokeWidthCm']
      : pathType.defaultWidthCm;
  const closed = isBool(raw['closed']) ? raw['closed'] : false;

  // Compute AABB
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    ...base,
    type: 'path',
    pathTypeId,
    points,
    segments,
    strokeWidthCm,
    closed,
    x: points[0].x,
    y: points[0].y,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  };
}

function validateLabelElement(
  raw: Record<string, unknown>,
  base: ReturnType<typeof validateBaseFields>,
  warnings: string[]
): LabelElement | null {
  const rawText = raw['text'];
  if (!isString(rawText) || rawText.trim().length === 0) {
    warnings.push(`Label element "${base.id}" skipped: empty or missing text`);
    return null;
  }
  const text = rawText.trim().slice(0, 5000);
  const fontSize =
    isFiniteNum(raw['fontSize']) && raw['fontSize'] >= 4 && raw['fontSize'] <= 200
      ? raw['fontSize']
      : 16;
  const fontColor = normalizeHexColor(raw['fontColor'], '#333333');
  const fontFamily =
    isString(raw['fontFamily']) && raw['fontFamily'].trim().length > 0
      ? raw['fontFamily'].trim().slice(0, 100)
      : 'system-ui';
  const TEXT_ALIGNS: TextAlign[] = ['left', 'center', 'right'];
  const textAlign: TextAlign = TEXT_ALIGNS.includes(raw['textAlign'] as TextAlign)
    ? (raw['textAlign'] as TextAlign)
    : 'left';
  const bold = isBool(raw['bold']) ? raw['bold'] : false;
  const italic = isBool(raw['italic']) ? raw['italic'] : false;

  return {
    ...base,
    type: 'label',
    text,
    fontSize,
    fontColor,
    fontFamily,
    textAlign,
    bold,
    italic,
  };
}

function validateDimensionElement(
  raw: Record<string, unknown>,
  base: ReturnType<typeof validateBaseFields>,
  warnings: string[]
): DimensionElement | null {
  const startPoint = validateVec2(raw['startPoint']);
  if (!startPoint) {
    warnings.push(`Dimension element "${base.id}" skipped: invalid startPoint`);
    return null;
  }
  const endPoint = validateVec2(raw['endPoint']);
  if (!endPoint) {
    warnings.push(`Dimension element "${base.id}" skipped: invalid endPoint`);
    return null;
  }
  const startElementId = isUUID(raw['startElementId']) ? (raw['startElementId'] as UUID) : null;
  const endElementId = isUUID(raw['endElementId']) ? (raw['endElementId'] as UUID) : null;
  const offsetCm = isFiniteNum(raw['offsetCm']) ? raw['offsetCm'] : 50;
  const displayUnit = 'm' as const;
  const precision =
    isFiniteNum(raw['precision']) &&
    Number.isInteger(raw['precision']) &&
    raw['precision'] >= 0 &&
    raw['precision'] <= 4
      ? raw['precision']
      : 2;

  return {
    ...base,
    type: 'dimension',
    startPoint,
    endPoint,
    startElementId,
    endElementId,
    offsetCm,
    displayUnit,
    precision,
    x: startPoint.x,
    y: startPoint.y,
  };
}

function validateJournalEntry(
  raw: unknown,
  projectId: UUID,
  seenIds: Set<UUID>,
  warnings: string[]
): JournalEntry | null {
  if (!isObj(raw)) return null;
  const now = nowISO();

  let id: UUID;
  if (isUUID(raw['id']) && !seenIds.has(raw['id'] as UUID)) {
    id = raw['id'] as UUID;
  } else {
    id = generateUUID();
  }
  seenIds.add(id);

  const date = isISODate(raw['date']) ? raw['date'] : todayISO();
  const title = isString(raw['title']) ? raw['title'].slice(0, 200) : null;
  const content = isString(raw['content']) ? raw['content'].slice(0, 50000) : '';
  const tags = isArray(raw['tags'])
    ? (raw['tags'] as unknown[]).filter((t): t is string => isString(t))
    : [];
  const linkedElementIds = isArray(raw['linkedElementIds'])
    ? (raw['linkedElementIds'] as unknown[]).filter((id): id is UUID => isUUID(id))
    : [];

  let weather: JournalEntry['weather'] = null;
  const rawWeather = raw['weather'];
  if (isObj(rawWeather)) {
    const WEATHER_CONDITIONS: WeatherCondition[] = [
      'sunny', 'partly-cloudy', 'cloudy', 'rainy', 'snowy', 'windy',
    ];
    const tempC =
      isFiniteNum(rawWeather['tempC']) &&
      rawWeather['tempC'] >= -100 &&
      rawWeather['tempC'] <= 100
        ? rawWeather['tempC']
        : null;
    const condition: WeatherCondition | null = WEATHER_CONDITIONS.includes(
      rawWeather['condition'] as WeatherCondition
    )
      ? (rawWeather['condition'] as WeatherCondition)
      : null;
    const humidity =
      isFiniteNum(rawWeather['humidity']) &&
      rawWeather['humidity'] >= 0 &&
      rawWeather['humidity'] <= 100
        ? rawWeather['humidity']
        : null;
    weather = { tempC, condition, humidity };
  }

  const createdAt = isISODatetime(raw['createdAt']) ? raw['createdAt'] : now;

  warnings.length; // touch to suppress lint if ever needed
  return { id, projectId, date, title, content, tags, linkedElementIds, weather, createdAt };
}

// ─── Groups validation ────────────────────────────────────────────────────────

function validateGroups(
  raw: unknown,
  validLayerIds: Set<UUID>,
  defaultLayerId: UUID,
  elementIds: Set<UUID>,
  warnings: string[]
): Group[] {
  if (!isArray(raw)) return [];
  const seenIds = new Set<UUID>();
  const groups: Group[] = [];

  for (const item of raw) {
    if (!isObj(item)) continue;
    let id: UUID;
    if (isUUID(item['id']) && !seenIds.has(item['id'] as UUID)) {
      id = item['id'] as UUID;
    } else {
      id = generateUUID();
    }
    seenIds.add(id);

    const name = isString(item['name']) ? item['name'].slice(0, 100) : null;
    const rawElementIds = isArray(item['elementIds'])
      ? (item['elementIds'] as unknown[]).filter((eid): eid is UUID => isUUID(eid) && elementIds.has(eid as UUID))
      : [];
    if (rawElementIds.length < 2) {
      warnings.push(`Group "${id}" skipped: fewer than 2 valid element IDs`);
      continue;
    }
    const layerId =
      isUUID(item['layerId']) && validLayerIds.has(item['layerId'] as UUID)
        ? (item['layerId'] as UUID)
        : defaultLayerId;

    groups.push({ id, name, elementIds: rawElementIds, layerId });
  }
  return groups;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function validateImport(raw: unknown, builtinRegistries: Registries): ImportResult {
  const warnings: string[] = [];
  const now = nowISO();

  if (!isObj(raw)) {
    warnings.push('Import root is not an object — creating empty project');
    raw = {};
  }
  const root = raw as Record<string, unknown>;

  // Registries (merge first — needed for element validation)
  const rawRegistries = isObj(root['registries']) ? root['registries'] : {};
  const mergedRegistries = mergeRegistries(builtinRegistries, rawRegistries as Partial<Registries>, warnings);

  // Project object
  const rawProject = isObj(root['project']) ? root['project'] : {};
  const proj = rawProject as Record<string, unknown>;

  // Project-level fields
  const id: UUID = isUUID(proj['id']) ? (proj['id'] as UUID) : generateUUID();
  const name =
    isString(proj['name']) && proj['name'].trim().length > 0
      ? proj['name'].trim().slice(0, 200)
      : 'Imported Project';
  const createdAt = isISODatetime(proj['createdAt']) ? proj['createdAt'] : now;
  const updatedAt = isISODatetime(proj['updatedAt']) ? proj['updatedAt'] : now;

  // Location
  const rawLoc = isObj(proj['location']) ? proj['location'] : {};
  const location = {
    lat:
      isFiniteNum(rawLoc['lat']) && rawLoc['lat'] >= -90 && rawLoc['lat'] <= 90
        ? rawLoc['lat']
        : null,
    lng:
      isFiniteNum(rawLoc['lng']) && rawLoc['lng'] >= -180 && rawLoc['lng'] <= 180
        ? rawLoc['lng']
        : null,
    label:
      isString(rawLoc['label']) ? rawLoc['label'].slice(0, 200) : null,
  };

  // GridConfig
  const rawGrid = isObj(proj['gridConfig']) ? proj['gridConfig'] : {};
  const cellSizeCm =
    isFiniteNum(rawGrid['cellSizeCm']) && rawGrid['cellSizeCm'] > 0
      ? rawGrid['cellSizeCm']
      : 100;
  const rawSnap = rawGrid['snapIncrementCm'];
  const snapIncrementCm =
    isFiniteNum(rawSnap) &&
    rawSnap > 0 &&
    rawSnap <= cellSizeCm &&
    cellSizeCm % rawSnap === 0
      ? rawSnap
      : 10;
  const originX = isFiniteNum(rawGrid['originX']) ? rawGrid['originX'] : 0;
  const originY = isFiniteNum(rawGrid['originY']) ? rawGrid['originY'] : 0;
  const gridConfig = { cellSizeCm, snapIncrementCm, originX, originY };

  // Viewport
  const rawViewport = isObj(proj['viewport']) ? proj['viewport'] : {};
  const viewport = {
    panX: isFiniteNum(rawViewport['panX']) ? rawViewport['panX'] : 0,
    panY: isFiniteNum(rawViewport['panY']) ? rawViewport['panY'] : 0,
    zoom:
      isFiniteNum(rawViewport['zoom']) &&
      rawViewport['zoom'] >= 0.05 &&
      rawViewport['zoom'] <= 10.0
        ? rawViewport['zoom']
        : 1.0,
  };

  // UIState
  const rawUI = isObj(proj['uiState']) ? proj['uiState'] : {};
  const uiState = {
    gridVisible: isBool(rawUI['gridVisible']) ? rawUI['gridVisible'] : true,
    snapEnabled: isBool(rawUI['snapEnabled']) ? rawUI['snapEnabled'] : true,
  };

  // Currency
  const currency =
    isString(proj['currency']) && proj['currency'].trim().length > 0
      ? proj['currency'].trim().slice(0, 10)
      : '$';

  // Layers
  const { layers, defaultLayerId } = validateLayers(proj['layers'], warnings);
  const validLayerIds = new Set(layers.map((l) => l.id));

  // Yard boundary
  const yardBoundary = validateYardBoundary(proj['yardBoundary'], warnings);

  // Elements (pass 1 — collect valid elements, track IDs)
  const seenElementIds = new Set<UUID>();
  const elements: CanvasElement[] = [];
  const rawElements = isArray(proj['elements']) ? proj['elements'] : [];
  // Groups are empty set for now (resolved after elements)
  const emptyGroupIds = new Set<UUID>();

  for (const rawEl of rawElements) {
    if (!isObj(rawEl)) {
      warnings.push('Element skipped: not an object');
      continue;
    }
    const elType = rawEl['type'];
    const ELEMENT_TYPES = ['terrain', 'plant', 'structure', 'path', 'label', 'dimension'];
    if (!isString(elType) || !ELEMENT_TYPES.includes(elType)) {
      // Silently skip unknown element types — forward compatibility per spec
      continue;
    }

    const base = validateBaseFields(
      rawEl,
      seenElementIds,
      defaultLayerId,
      validLayerIds,
      emptyGroupIds,
      warnings
    );

    let element: CanvasElement | null = null;
    switch (elType) {
      case 'terrain':
        element = validateTerrainElement(rawEl, base, mergedRegistries, warnings);
        break;
      case 'plant':
        element = validatePlantElement(rawEl, base, mergedRegistries, warnings);
        break;
      case 'structure':
        element = validateStructureElement(rawEl, base, mergedRegistries, warnings);
        break;
      case 'path':
        element = validatePathElement(rawEl, base, mergedRegistries, warnings);
        break;
      case 'label':
        element = validateLabelElement(rawEl, base, warnings);
        break;
      case 'dimension':
        element = validateDimensionElement(rawEl, base, warnings);
        break;
    }

    if (element) {
      elements.push(element);
    }
  }

  const elementIdSet = new Set(elements.map((e) => e.id));

  // Groups (resolved after elements)
  const groups = validateGroups(
    proj['groups'],
    validLayerIds,
    defaultLayerId,
    elementIdSet,
    warnings
  );
  const validGroupIds = new Set(groups.map((g) => g.id));

  // Re-resolve groupId on elements now that we have valid group IDs
  const resolvedElements: CanvasElement[] = elements.map((el) => {
    if (el.groupId !== null && !validGroupIds.has(el.groupId)) {
      return { ...el, groupId: null };
    }
    return el;
  });

  // Journal entries
  const seenJournalIds = new Set<UUID>();
  const rawJournal = isArray(proj['journalEntries']) ? proj['journalEntries'] : [];
  const journalEntries: JournalEntry[] = rawJournal
    .map((entry) => validateJournalEntry(entry, id, seenJournalIds, warnings))
    .filter((e): e is JournalEntry => e !== null);

  const project: Project = {
    id,
    name,
    createdAt,
    updatedAt,
    location,
    gridConfig,
    viewport,
    uiState,
    yardBoundary,
    currency,
    layers,
    groups,
    elements: resolvedElements,
    journalEntries,
  };

  return { project, registries: mergedRegistries, report: { warnings } };
}
