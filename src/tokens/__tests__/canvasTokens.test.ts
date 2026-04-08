import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildCanvasTokens } from '../canvasTokens';

// cssColorToPixi reads document.documentElement via getComputedStyle.
// Stub both globals so tests run in Node without a DOM.
function stubTokens(values: Record<string, string>) {
  vi.stubGlobal('document', { documentElement: {} });
  vi.stubGlobal('getComputedStyle', () => ({
    getPropertyValue: (name: string) => values[name] ?? '',
  }));
}

const validTokens: Record<string, string> = {
  '--ls-brand-500':              '#2b6191',
  '--ls-brand-100':              '#d9e4f0',
  '--ls-surface-canvas-overflow':'#f0f0ee',
  '--ls-text-primary':           '#1a1612',
  '--ls-plant-vegetable':        '#7cb87a',
  '--ls-plant-herb':             '#a8c5a0',
  '--ls-plant-fruit':            '#e8a87c',
  '--ls-plant-flower':           '#c98bb8',
  '--ls-plant-tree':             '#4a8c6a',
  '--ls-plant-shrub':            '#6aa87a',
  '--ls-plant-status-planned':   '#94a3b8',
  '--ls-plant-status-planted':   '#60a854',
  '--ls-plant-status-growing':   '#3d8b30',
  '--ls-plant-status-harvested': '#f5a623',
  '--ls-plant-status-removed':   '#c0392b',
  '--ls-structure-soil':         '#c4a882',
  '--ls-structure-texture':      '#b8a090',
};

describe('buildCanvasTokens', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns correctly parsed CanvasTokens for all fields', () => {
    stubTokens(validTokens);
    const tokens = buildCanvasTokens();

    expect(tokens.colorInteractive).toBe(0x2b6191);
    expect(tokens.colorInteractiveSubtle).toBe(0xd9e4f0);
    expect(tokens.surfaceCanvasOverflow).toBe(0xf0f0ee);
    expect(tokens.textPrimary).toBe(0x1a1612);

    expect(tokens.plantColors.vegetable).toBe(0x7cb87a);
    expect(tokens.plantColors.herb).toBe(0xa8c5a0);
    expect(tokens.plantColors.fruit).toBe(0xe8a87c);
    expect(tokens.plantColors.flower).toBe(0xc98bb8);
    expect(tokens.plantColors.tree).toBe(0x4a8c6a);
    expect(tokens.plantColors.shrub).toBe(0x6aa87a);

    expect(tokens.plantStatusColors.planned).toBe(0x94a3b8);
    expect(tokens.plantStatusColors.planted).toBe(0x60a854);
    expect(tokens.plantStatusColors.growing).toBe(0x3d8b30);
    expect(tokens.plantStatusColors.harvested).toBe(0xf5a623);
    expect(tokens.plantStatusColors.removed).toBe(0xc0392b);

    expect(tokens.structureColors.soil).toBe(0xc4a882);
    expect(tokens.structureColors.texture).toBe(0xb8a090);
  });

  it('throws a descriptive error when a CSS variable is missing', () => {
    stubTokens({});
    expect(() => buildCanvasTokens()).toThrow(
      'canvasTokens: CSS variable "--ls-brand-500" resolved to "" — expected #rrggbb hex color.'
    );
  });

  it('throws a descriptive error when a CSS variable has a non-hex value', () => {
    stubTokens({ '--ls-brand-500': 'rgb(43, 97, 145)' });
    expect(() => buildCanvasTokens()).toThrow(
      'canvasTokens: CSS variable "--ls-brand-500" resolved to "rgb(43, 97, 145)" — expected #rrggbb hex color.'
    );
  });
});
