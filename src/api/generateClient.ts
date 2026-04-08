import type { GenerateOptions } from '../types/generate';

// Fields to strip from the project copy — the backend ignores them
const STRIPPED_PROJECT_FIELDS = [
  'yardPhoto',
  'uiState',
  'gridConfig',
  'viewport',
  'groups',
  'journalEntries',
] as const;

interface RequestProject {
  [key: string]: unknown;
  registries?: unknown;
}

interface GenerateRequestBody {
  project: RequestProject;
  yard_photo?: string;
  options: Record<string, unknown>;
}

export function buildRequestBody(
  project: Record<string, unknown>,
  registries: Record<string, unknown>,
  options: GenerateOptions,
  yardPhoto: string | null,
): GenerateRequestBody {
  // Clone project and merge registries
  const projectCopy: RequestProject = { ...project, registries };

  // Strip fields the backend ignores
  for (const field of STRIPPED_PROJECT_FIELDS) {
    delete projectCopy[field];
  }

  // Build options with snake_case field names
  const mappedOptions: Record<string, unknown> = {};

  if (options.gardenStyle != null) {
    mappedOptions.garden_style = options.gardenStyle;
  }
  if (options.season != null) {
    mappedOptions.season = options.season;
  }
  if (options.timeOfDay != null) {
    mappedOptions.time_of_day = options.timeOfDay;
  }
  if (options.viewpoint != null) {
    mappedOptions.viewpoint = options.viewpoint;
  }
  if (options.aspectRatio != null) {
    mappedOptions.aspect_ratio = options.aspectRatio;
  }
  if (options.imageSize != null) {
    mappedOptions.image_size = options.imageSize;
  }
  // include_planned is always present (boolean, never omitted)
  mappedOptions.include_planned = options.includePlanned;
  // seed: null → omit (backend uses -1 = random)
  if (options.seed != null) {
    mappedOptions.seed = options.seed;
  }

  const body: GenerateRequestBody = {
    project: projectCopy,
    options: mappedOptions,
  };

  // Extract yardPhoto to top-level yard_photo, stripping data-URL prefix if present
  if (yardPhoto) {
    body.yard_photo = yardPhoto.replace(/^data:[^;]+;base64,/, '');
  }

  return body;
}

export interface GenerateError extends Error {
  status?: number;
  errorBody?: string;
  isTimeout?: boolean;
}

export async function sendGenerateRequest(
  body: GenerateRequestBody,
  signal: AbortSignal,
): Promise<Blob> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'image/*',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (response.ok) {
    return response.blob();
  }

  // Non-200: parse error body
  const error = new Error('Generate request failed') as GenerateError;
  error.status = response.status;
  try {
    const json = await response.json();
    error.errorBody = json.error ?? '';
  } catch {
    error.errorBody = '';
  }
  throw error;
}

export function mapErrorToToast(error: unknown): string | null {
  // Check for timeout flag first (set by the store's 60s client timer)
  if (
    error != null &&
    typeof error === 'object' &&
    'isTimeout' in error &&
    (error as { isTimeout?: boolean }).isTimeout
  ) {
    return 'Generation timed out. Try again or simplify your garden layout.';
  }

  // User cancel — no toast
  if (error instanceof DOMException && error.name === 'AbortError') {
    return null;
  }

  // Network error (fetch throws TypeError for network failures)
  if (error instanceof TypeError) {
    return 'Could not reach the server. Check your connection.';
  }

  // HTTP errors
  if (error instanceof Error) {
    const genErr = error as GenerateError;
    const status = genErr.status;
    const body = genErr.errorBody ?? '';

    if (status === 400) {
      if (body.includes('project has no yard boundary')) {
        return 'Set up a yard boundary before generating.';
      }
      if (body.includes('yard photo too large')) {
        return 'Your reference photo is too large. Use an image under 3 MB.';
      }
      if (body.includes('invalid request body') || body.includes('project is required')) {
        return 'Something went wrong. Please try again.';
      }
      return 'Generation failed: check your options and try again.';
    }
    if (status === 413) {
      return 'Your project is too large to send. Try removing some elements.';
    }
    if (status === 502) {
      return 'The AI service returned an error. Try again in a moment.';
    }
    if (status === 504) {
      return 'Generation timed out. Try again or simplify your garden layout.';
    }
    if (status != null && status >= 500) {
      return 'Something went wrong on the server. Please try again.';
    }
  }

  // Fallback
  return 'Something went wrong. Please try again.';
}
