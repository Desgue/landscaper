// src/tokens/canvasTokens.ts
// Reads --ls-* CSS custom properties at runtime and exposes them as typed JS.
// Called ONCE in CanvasHost.tsx after the document is ready.
// Passed as a prop or singleton to all PixiJS renderer classes.

export interface CanvasTokens {
  colorInteractive: number;        // replaces #1971c2 in BoundaryRenderer, DimensionRenderer
  colorInteractiveSubtle: number;  // replaces #e8f0fb usage
  surfaceCanvasOverflow: number;   // replaces #f5f5f0 in CanvasHost background
  textPrimary: number;             // replaces #333333 in LabelRenderer
  plantColors: {
    vegetable: number;
    herb: number;
    fruit: number;
    flower: number;
    tree: number;
    shrub: number;
  };
  plantStatusColors: {
    planned: number;
    planted: number;
    growing: number;
    harvested: number;
    removed: number;
  };
  structureColors: {
    soil: number;
    texture: number;
  };
}

function cssColorToPixi(cssVarName: string): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVarName)
    .trim();
  // Converts #rrggbb hex to PixiJS 0xRRGGBB integer
  const result = parseInt(raw.replace('#', '0x'), 16);
  if (isNaN(result)) {
    console.warn(
      `canvasTokens: CSS variable "${cssVarName}" resolved to "${raw}" — expected #rrggbb hex color. ` +
      'Ensure the --ls- token block is loaded in :root before calling buildCanvasTokens(). ' +
      'Falling back to magenta (0xFF00FF).'
    );
    return 0xFF00FF;
  }
  return result;
}

/** Convert a PixiJS integer color (0xRRGGBB) back to a CSS hex string (#rrggbb). */
export function pixiIntToHex(color: number): string {
  return '#' + (color & 0xFFFFFF).toString(16).padStart(6, '0')
}

export function buildCanvasTokens(): CanvasTokens {
  return {
    // Read palette tokens directly — getPropertyValue does not resolve var() aliases,
    // so semantic tokens like --ls-color-interactive would return "var(--ls-brand-500)"
    // instead of a hex string, causing parseInt to return NaN.
    colorInteractive:       cssColorToPixi('--ls-brand-500'),
    colorInteractiveSubtle: cssColorToPixi('--ls-brand-100'),
    surfaceCanvasOverflow:  cssColorToPixi('--ls-surface-canvas-overflow'),
    textPrimary:            cssColorToPixi('--ls-text-primary'),
    plantColors: {
      vegetable: cssColorToPixi('--ls-plant-vegetable'),
      herb:      cssColorToPixi('--ls-plant-herb'),
      fruit:     cssColorToPixi('--ls-plant-fruit'),
      flower:    cssColorToPixi('--ls-plant-flower'),
      tree:      cssColorToPixi('--ls-plant-tree'),
      shrub:     cssColorToPixi('--ls-plant-shrub'),
    },
    plantStatusColors: {
      planned:   cssColorToPixi('--ls-plant-status-planned'),
      planted:   cssColorToPixi('--ls-plant-status-planted'),
      growing:   cssColorToPixi('--ls-plant-status-growing'),
      harvested: cssColorToPixi('--ls-plant-status-harvested'),
      removed:   cssColorToPixi('--ls-plant-status-removed'),
    },
    structureColors: {
      soil:    cssColorToPixi('--ls-structure-soil'),
      texture: cssColorToPixi('--ls-structure-texture'),
    },
  };
}
