
// ── Option value arrays (single source of truth) ────────────────────────────
// UI components map() over these to render selects/segments.
// Union types are derived below — never hand-written.

export const GARDEN_STYLES = [
  { value: 'contemporary', label: 'Contemporary' },
  { value: 'cottage', label: 'Cottage' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'tropical', label: 'Tropical' },
  { value: 'formal', label: 'Formal' },
] as const;

export const SEASONS = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'winter', label: 'Winter' },
] as const;

export const TIMES_OF_DAY = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'golden hour', label: 'Golden Hour' },
] as const;

export const VIEWPOINTS = [
  { value: 'eye-level', label: 'Eye-level' },
  { value: 'elevated', label: 'Elevated' },
  { value: 'overhead', label: 'Overhead' },
  { value: 'isometric', label: 'Isometric' },
] as const;

export const IMAGE_SIZES = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
] as const;

export const ASPECT_RATIOS = [
  { value: 'landscape', label: '4:3' },
  { value: 'square', label: '1:1' },
  { value: 'portrait', label: '3:4' },
] as const;

// ── Derived union types ─────────────────────────────────────────────────────

export type GardenStyle = (typeof GARDEN_STYLES)[number]['value'];
export type Season = (typeof SEASONS)[number]['value'];
export type TimeOfDay = (typeof TIMES_OF_DAY)[number]['value'];
export type Viewpoint = (typeof VIEWPOINTS)[number]['value'];
export type ImageSize = (typeof IMAGE_SIZES)[number]['value'];
export type AspectRatio = (typeof ASPECT_RATIOS)[number]['value'];

// ── Generation options (persisted in UIState.lastGenerateOptions) ────────────

export interface GenerateOptions {
  gardenStyle: GardenStyle;
  season: Season;
  timeOfDay: TimeOfDay;
  viewpoint: Viewpoint;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  includePlanned: boolean;
  seed: number | null; // null = random
}

export const DEFAULT_OPTIONS: GenerateOptions = {
  gardenStyle: 'contemporary',
  season: 'summer',
  timeOfDay: 'afternoon',
  viewpoint: 'eye-level',
  aspectRatio: 'square',
  imageSize: '1K',
  includePlanned: true,
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
