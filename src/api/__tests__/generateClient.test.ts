import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildRequestBody,
  sendGenerateRequest,
  mapErrorToToast,
  type GenerateError,
} from '../generateClient';
import { DEFAULT_OPTIONS } from '../../types/generate';
import type { GenerateOptions } from '../../types/generate';

// ─── buildRequestBody ──────────────────────────────────────────────────────

describe('buildRequestBody', () => {
  const baseProject = {
    id: 'proj-1',
    name: 'Test Garden',
    location: { lat: 40.7, lng: -74.0 },
    yardBoundary: { vertices: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }] },
    layers: [],
    elements: [],
    uiState: { lastGenerateOptions: {} },
    gridConfig: { size: 10 },
    viewport: { zoom: 1, panX: 0, panY: 0 },
    groups: [],
    journalEntries: [],
    yardPhoto: 'base64data',
  };

  const baseRegistries = {
    terrain: [{ id: 't1', type: 'grass' }],
    plants: [],
    structures: [],
    paths: [],
  };

  it('merges registries into project at project.registries', () => {
    const body = buildRequestBody(baseProject, baseRegistries, DEFAULT_OPTIONS, null);
    expect(body.project.registries).toEqual(baseRegistries);
  });

  it('extracts yardPhoto to top-level yard_photo', () => {
    const body = buildRequestBody(baseProject, baseRegistries, DEFAULT_OPTIONS, 'photo-base64');
    expect(body.yard_photo).toBe('photo-base64');
  });

  it('does NOT include yardPhoto inside the project object', () => {
    const body = buildRequestBody(baseProject, baseRegistries, DEFAULT_OPTIONS, 'photo-base64');
    expect('yardPhoto' in body.project).toBe(false);
  });

  it('omits yard_photo from body when yardPhoto is null', () => {
    const body = buildRequestBody(baseProject, baseRegistries, DEFAULT_OPTIONS, null);
    expect('yard_photo' in body).toBe(false);
  });

  it('omits season field when season is auto', () => {
    const opts: GenerateOptions = { ...DEFAULT_OPTIONS, season: 'auto' };
    const body = buildRequestBody(baseProject, baseRegistries, opts, null);
    expect('season' in body.options).toBe(false);
  });

  it('includes season field when season is not auto', () => {
    const opts: GenerateOptions = { ...DEFAULT_OPTIONS, season: 'summer' };
    const body = buildRequestBody(baseProject, baseRegistries, opts, null);
    expect(body.options.season).toBe('summer');
  });

  it('omits seed field when seed is null', () => {
    const opts: GenerateOptions = { ...DEFAULT_OPTIONS, seed: null };
    const body = buildRequestBody(baseProject, baseRegistries, opts, null);
    expect('seed' in body.options).toBe(false);
  });

  it('includes seed field when seed is an integer', () => {
    const opts: GenerateOptions = { ...DEFAULT_OPTIONS, seed: 42 };
    const body = buildRequestBody(baseProject, baseRegistries, opts, null);
    expect(body.options.seed).toBe(42);
  });

  it('maps viewpoint correctly to snake_case', () => {
    const opts: GenerateOptions = { ...DEFAULT_OPTIONS, viewpoint: 'elevated' };
    const body = buildRequestBody(baseProject, baseRegistries, opts, null);
    expect(body.options.viewpoint).toBe('elevated');
  });

  it('maps imageSize to options.image_size', () => {
    const opts: GenerateOptions = { ...DEFAULT_OPTIONS, imageSize: '2K' };
    const body = buildRequestBody(baseProject, baseRegistries, opts, null);
    expect(body.options.image_size).toBe('2K');
  });

  it('always includes include_planned (never omitted, even when false)', () => {
    const opts: GenerateOptions = { ...DEFAULT_OPTIONS, includePlanned: false };
    const body = buildRequestBody(baseProject, baseRegistries, opts, null);
    expect(body.options.include_planned).toBe(false);
  });

  it('strips uiState, gridConfig, viewport, groups, journalEntries from project copy', () => {
    const body = buildRequestBody(baseProject, baseRegistries, DEFAULT_OPTIONS, null);
    expect('uiState' in body.project).toBe(false);
    expect('gridConfig' in body.project).toBe(false);
    expect('viewport' in body.project).toBe(false);
    expect('groups' in body.project).toBe(false);
    expect('journalEntries' in body.project).toBe(false);
  });

  it('does not mutate the original project object', () => {
    const _original = { ...baseProject };
    buildRequestBody(baseProject, baseRegistries, DEFAULT_OPTIONS, 'photo');
    expect(baseProject.yardPhoto).toBe('base64data');
    expect(baseProject.uiState).toBeDefined();
  });
});

// ─── sendGenerateRequest ───────────────────────────────────────────────────

describe('sendGenerateRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a Blob on 200 success', async () => {
    const mockBlob = new Blob(['image-data'], { type: 'image/png' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(mockBlob, { status: 200, headers: { 'Content-Type': 'image/png' } }),
    );

    const result = await sendGenerateRequest(
      { project: {}, options: {} },
      new AbortController().signal,
    );
    expect(result).toBeInstanceOf(Blob);
  });

  it('throws GenerateError with status and errorBody on non-200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'project has no yard boundary' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    try {
      await sendGenerateRequest(
        { project: {}, options: {} },
        new AbortController().signal,
      );
      expect.unreachable('Should have thrown');
    } catch (err) {
      const e = err as GenerateError;
      expect(e.status).toBe(400);
      expect(e.errorBody).toBe('project has no yard boundary');
    }
  });

  it('handles non-JSON error response body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>Bad Gateway</html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      }),
    );

    try {
      await sendGenerateRequest(
        { project: {}, options: {} },
        new AbortController().signal,
      );
      expect.unreachable('Should have thrown');
    } catch (err) {
      const e = err as GenerateError;
      expect(e.status).toBe(502);
      expect(e.errorBody).toBe('');
    }
  });
});

// ─── mapErrorToToast ───────────────────────────────────────────────────────

describe('mapErrorToToast', () => {
  function makeHttpError(status: number, errorBody: string): GenerateError {
    const err = new Error('Generate request failed') as GenerateError;
    err.status = status;
    err.errorBody = errorBody;
    return err;
  }

  it('400 with "project has no yard boundary" → yard boundary toast', () => {
    expect(mapErrorToToast(makeHttpError(400, 'project has no yard boundary'))).toBe(
      'Set up a yard boundary before generating.',
    );
  });

  it('400 with "yard photo too large" → photo size toast', () => {
    expect(mapErrorToToast(makeHttpError(400, 'yard photo too large'))).toBe(
      'Your reference photo is too large. Use an image under 3 MB.',
    );
  });

  it('400 with "invalid request body" → "Something went wrong" toast', () => {
    expect(mapErrorToToast(makeHttpError(400, 'invalid request body'))).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('400 with "project is required" → "Something went wrong" toast', () => {
    expect(mapErrorToToast(makeHttpError(400, 'project is required'))).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('400 with other error → generic 400 toast', () => {
    expect(mapErrorToToast(makeHttpError(400, 'invalid garden_style'))).toBe(
      'Generation failed: check your options and try again.',
    );
  });

  it('413 → payload too large toast', () => {
    expect(mapErrorToToast(makeHttpError(413, 'request body too large'))).toBe(
      'Your project is too large to send. Try removing some elements.',
    );
  });

  it('500 → server error toast', () => {
    expect(mapErrorToToast(makeHttpError(500, 'segmentation render failed'))).toBe(
      'Something went wrong on the server. Please try again.',
    );
  });

  it('502 → AI service toast', () => {
    expect(mapErrorToToast(makeHttpError(502, 'no image in Nano Banana response'))).toBe(
      'The AI service returned an error. Try again in a moment.',
    );
  });

  it('504 → timeout toast', () => {
    expect(mapErrorToToast(makeHttpError(504, 'image generation timed out'))).toBe(
      'Generation timed out. Try again or simplify your garden layout.',
    );
  });

  it('503 (unmapped 5xx) → generic server error toast', () => {
    expect(mapErrorToToast(makeHttpError(503, 'service unavailable'))).toBe(
      'Something went wrong on the server. Please try again.',
    );
  });

  it('network error (TypeError) → connection toast', () => {
    expect(mapErrorToToast(new TypeError('Failed to fetch'))).toBe(
      'Could not reach the server. Check your connection.',
    );
  });

  it('AbortError with timeout flag → timeout toast', () => {
    // In production, the store creates a plain object with isTimeout when the 60s timer fires
    const err = Object.assign(
      new DOMException('The operation was aborted', 'AbortError'),
      { isTimeout: true },
    );
    expect(mapErrorToToast(err)).toBe(
      'Generation timed out. Try again or simplify your garden layout.',
    );
  });

  it('plain object with isTimeout flag → timeout toast', () => {
    const err = { isTimeout: true, message: 'aborted' };
    expect(mapErrorToToast(err)).toBe(
      'Generation timed out. Try again or simplify your garden layout.',
    );
  });

  it('AbortError without timeout flag (user cancel) → null', () => {
    const err = new DOMException('The operation was aborted', 'AbortError');
    expect(mapErrorToToast(err)).toBeNull();
  });
});
