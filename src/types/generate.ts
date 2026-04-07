
// ── Option value arrays (single source of truth) ────────────────────────────
// UI components map() over these to render selects/segments.
// Union types are derived below — never hand-written.

export const GARDEN_STYLES = [
  { value: 'cottage', label: 'Cottage' },
  { value: 'formal', label: 'Formal' },
  { value: 'tropical', label: 'Tropical' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'kitchen', label: 'Kitchen Garden' },
  { value: 'native', label: 'Native' },
  { value: 'contemporary', label: 'Contemporary' },
  { value: 'garden', label: 'Garden' },
] as const;

export const SEASONS = [
  { value: 'auto', label: 'Auto (detect)' },
  { value: 'early spring', label: 'Early Spring' },
  { value: 'late spring', label: 'Late Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'late summer', label: 'Late Summer' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'winter', label: 'Winter' },
] as const;

export const TIMES_OF_DAY = [
  { value: 'morning', label: 'Morning' },
  { value: 'midday', label: 'Midday' },
  { value: 'golden hour', label: 'Golden Hour' },
  { value: 'dusk', label: 'Dusk' },
] as const;

export const CAMERA_ANGLES = [
  { value: 'eye-level', label: 'Eye Level' },
  { value: '3/4 elevated', label: '3/4 Elevated' },
  { value: 'birds-eye', label: "Bird's Eye" },
] as const;

export const WEATHER_OPTIONS = [
  { value: 'clear', label: 'Clear' },
  { value: 'overcast', label: 'Overcast' },
  { value: 'light rain', label: 'Light Rain' },
] as const;

export const RENDER_STYLES = [
  { value: 'photorealistic', label: 'Photorealistic' },
  { value: 'watercolor', label: 'Watercolor' },
  { value: 'architectural', label: 'Architectural' },
  { value: 'sketch', label: 'Sketch' },
] as const;

export const RESOLUTIONS = [
  { value: 'draft', label: 'Draft (512px)' },
  { value: 'standard', label: 'Standard (1K)' },
  { value: 'final', label: 'Final (4K)' },
] as const;

export const ASPECT_RATIOS = [
  { value: 'landscape', label: '16:9' },
  { value: 'square', label: '1:1' },
  { value: 'portrait', label: '9:16' },
] as const;

// ── Derived union types ─────────────────────────────────────────────────────

export type GardenStyle = (typeof GARDEN_STYLES)[number]['value'];
export type Season = (typeof SEASONS)[number]['value'];
export type TimeOfDay = (typeof TIMES_OF_DAY)[number]['value'];
export type CameraAngle = (typeof CAMERA_ANGLES)[number]['value'];
export type Weather = (typeof WEATHER_OPTIONS)[number]['value'];
export type RenderStyle = (typeof RENDER_STYLES)[number]['value'];
export type Resolution = (typeof RESOLUTIONS)[number]['value'];
export type AspectRatio = (typeof ASPECT_RATIOS)[number]['value'];

// ── Generation options (persisted in UIState.lastGenerateOptions) ────────────

export interface GenerateOptions {
  gardenStyle: GardenStyle;
  season: Season;
  timeOfDay: TimeOfDay;
  cameraAngle: CameraAngle;
  weather: Weather;
  renderStyle: RenderStyle;
  resolution: Resolution;
  aspectRatio: AspectRatio;
  includePlanned: boolean;
  thinkingMode: boolean;
  seed: number | null; // null = random
}

export const DEFAULT_OPTIONS: GenerateOptions = {
  gardenStyle: 'garden',
  season: 'auto',
  timeOfDay: 'golden hour',
  cameraAngle: 'eye-level',
  weather: 'clear',
  renderStyle: 'photorealistic',
  resolution: 'standard',
  aspectRatio: 'square',
  includePlanned: true,
  thinkingMode: false,
  seed: null,
};

// ── Generation state machine ────────────────────────────────────────────────

export type GenerateStatus =
  | { kind: 'idle' }
  | { kind: 'loading'; startedAt: number }
  | { kind: 'success'; resultUrl: string }
  | { kind: 'error'; message: string };

// ── Feature navigation ──────────────────────────────────────────────────────

export const FEATURE_IDS = [
  'initial',
  'multi-view',
  'seasonal',
  'conversational',
  'zone',
  'material',
  'plants',
  'draft-final',
  'outpainting',
  'style-transfer',
  'export',
] as const;

export type FeatureId = (typeof FEATURE_IDS)[number];

export interface FeatureNavItem {
  id: FeatureId;
  label: string;
  stage: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

export const FEATURE_NAV: FeatureNavItem[] = [
  { id: 'initial', label: 'Initial Setup', stage: 'Generate' },
  { id: 'multi-view', label: 'Multi-View', stage: 'Generate' },
  { id: 'seasonal', label: 'Seasonal & Lighting', stage: 'Variants' },
  { id: 'conversational', label: 'Chat Edit', stage: 'Edit' },
  { id: 'zone', label: 'Zone Edit', stage: 'Edit' },
  { id: 'material', label: 'Materials', stage: 'Edit' },
  { id: 'plants', label: 'Plant Species', stage: 'Edit' },
  { id: 'draft-final', label: 'Draft → Final', stage: 'Refine' },
  { id: 'outpainting', label: 'Expand View', stage: 'Refine' },
  { id: 'style-transfer', label: 'Style Transfer', stage: 'Refine' },
  { id: 'export', label: 'Export', stage: 'Export' },
];

// ── Chat types (Feature 4: Conversational Editing) ──────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageUrl?: string; // AI response with generated image
  status?: 'accepted' | 'rejected' | 'pending';
  timestamp: number;
}

// ── Edit versioning ─────────────────────────────────────────────────────────

export interface EditVersion {
  id: string;
  label: string; // "v1", "v2", etc.
  imageUrl: string;
  timestamp: number;
  source: FeatureId; // which feature created this version
}

// ── Draft variants (Feature 8) ──────────────────────────────────────────────

export interface DraftVariant {
  id: string;
  imageUrl: string;
  selected: boolean;
}

// ── Material swatch (Feature 6) ─────────────────────────────────────────────

export interface MaterialSwatch {
  id: string;
  name: string;
  imageUrl?: string;
  color?: string; // fallback solid color
  custom?: boolean;
}

export const PRESET_MATERIALS: MaterialSwatch[] = [
  { id: 'pavers', name: 'Pavers', color: '#B8A089' },
  { id: 'timber-deck', name: 'Timber Deck', color: '#8B6914' },
  { id: 'gravel', name: 'Gravel', color: '#C4B8A8' },
  { id: 'slate', name: 'Slate', color: '#6B7B8D' },
  { id: 'brick', name: 'Brick', color: '#A0522D' },
  { id: 'sandstone', name: 'Sandstone', color: '#D4B896' },
  { id: 'concrete', name: 'Concrete', color: '#B0B0B0' },
  { id: 'cobblestone', name: 'Cobblestone', color: '#808080' },
];

// ── Plant reference (Feature 7) ─────────────────────────────────────────────

export interface PlantEntry {
  id: string;
  commonName: string;
  botanicalName: string | null;
  verified: boolean;
  iconUrl?: string;
}
