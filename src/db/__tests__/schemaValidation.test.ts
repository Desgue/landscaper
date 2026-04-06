import { describe, it, expect } from 'vitest'
import { normalizeHexColor, validateImport, generateUUID } from '../schemaValidation'
import type { Registries } from '../../types/schema'

const emptyRegistries: Registries = {
  terrain: [],
  plants: [],
  structures: [],
  paths: [],
}

// ─── normalizeHexColor ──────────────────────────────────────────────────────

describe('normalizeHexColor', () => {
  it('normalizes a valid 6-digit hex color', () => {
    expect(normalizeHexColor('#aabbcc', '#000000')).toBe('#AABBCC')
  })

  it('expands 3-digit shorthand to 6-digit', () => {
    expect(normalizeHexColor('#abc', '#000000')).toBe('#AABBCC')
  })

  it('strips alpha from 8-digit hex (keeps first 6)', () => {
    expect(normalizeHexColor('#aabbccdd', '#000000')).toBe('#AABBCC')
  })

  it('returns fallback for non-string input', () => {
    expect(normalizeHexColor(42, '#FFFFFF')).toBe('#FFFFFF')
    expect(normalizeHexColor(null, '#FFFFFF')).toBe('#FFFFFF')
    expect(normalizeHexColor(undefined, '#FFFFFF')).toBe('#FFFFFF')
  })

  it('returns fallback for string without # prefix', () => {
    expect(normalizeHexColor('aabbcc', '#FFFFFF')).toBe('#FFFFFF')
  })

  it('returns fallback for invalid hex characters', () => {
    expect(normalizeHexColor('#gghhii', '#FFFFFF')).toBe('#FFFFFF')
  })

  it('returns fallback for wrong length (e.g. 4 or 5 digits)', () => {
    expect(normalizeHexColor('#abcd', '#FFFFFF')).toBe('#FFFFFF')
    expect(normalizeHexColor('#abcde', '#FFFFFF')).toBe('#FFFFFF')
  })
})

// ─── generateUUID ───────────────────────────────────────────────────────────

describe('generateUUID', () => {
  it('returns a string matching UUID v4 format', () => {
    const uuid = generateUUID()
    expect(typeof uuid).toBe('string')
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  })

  it('generates unique values on successive calls', () => {
    const a = generateUUID()
    const b = generateUUID()
    expect(a).not.toBe(b)
  })
})

// ─── validateImport ─────────────────────────────────────────────────────────

describe('validateImport', () => {
  it('accepts a valid minimal project import', () => {
    const raw = {
      project: {
        name: 'Test Garden',
        layers: [{ id: '00000000-0000-0000-0000-000000000001', name: 'Layer 1' }],
        elements: [],
      },
    }
    const result = validateImport(raw, emptyRegistries)
    expect(result.project.name).toBe('Test Garden')
    expect(result.project.layers).toHaveLength(1)
    expect(result.project.elements).toHaveLength(0)
    expect(result.report.warnings).toEqual([])
  })

  it('fills missing fields with safe defaults', () => {
    const result = validateImport({}, emptyRegistries)
    expect(result.project.name).toBe('Imported Project')
    expect(result.project.layers.length).toBeGreaterThanOrEqual(1)
    expect(result.project.viewport.zoom).toBe(1.0)
    expect(result.project.uiState.gridVisible).toBe(true)
    expect(result.project.uiState.snapEnabled).toBe(true)
    expect(result.project.gridConfig.cellSizeCm).toBe(100)
    expect(result.project.gridConfig.snapIncrementCm).toBe(10)
    expect(result.project.currency).toBe('$')
  })

  it('skips elements with unknown types silently', () => {
    const raw = {
      project: {
        layers: [{ id: '00000000-0000-0000-0000-000000000001', name: 'L' }],
        elements: [
          { type: 'alien-widget', x: 0, y: 0 },
          {
            type: 'terrain',
            terrainTypeId: 'grass',
            x: 10,
            y: 10,
            width: 100,
            height: 100,
          },
        ],
      },
    }
    const result = validateImport(raw, emptyRegistries)
    // Only the terrain element should survive
    expect(result.project.elements).toHaveLength(1)
    expect(result.project.elements[0].type).toBe('terrain')
    // No warning about 'alien-widget' — it is silently skipped
    const alienWarnings = result.report.warnings.filter((w) =>
      w.includes('alien-widget'),
    )
    expect(alienWarnings).toHaveLength(0)
  })

  it('merges imported registries with builtin registries', () => {
    const builtin: Registries = {
      terrain: [
        {
          id: 'grass',
          name: 'Grass',
          category: 'natural',
          color: '#00FF00',
          textureUrl: null,
          costPerUnit: null,
          description: null,
        },
      ],
      plants: [],
      structures: [],
      paths: [],
    }
    const raw = {
      registries: {
        terrain: [
          {
            id: 'gravel',
            name: 'Gravel',
            category: 'hardscape',
            color: '#888888',
          },
        ],
      },
    }
    const result = validateImport(raw, builtin)
    // Both builtin 'grass' and imported 'gravel' should be present
    const terrainIds = result.registries.terrain.map((t) => t.id)
    expect(terrainIds).toContain('grass')
    expect(terrainIds).toContain('gravel')
  })

  it('handles non-object root by creating empty project with warning', () => {
    const result = validateImport('not-an-object', emptyRegistries)
    expect(result.project.name).toBe('Imported Project')
    expect(result.report.warnings).toContain(
      'Import root is not an object — creating empty project',
    )
  })
})
