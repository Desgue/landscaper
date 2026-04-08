// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { MAX_IMPORT_SIZE_BYTES } from '../WelcomeScreen'

// ─── module mocks ──────────────────────────────────────────────────────────────

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: vi.fn() }),
}))

vi.mock('../../db/projectsDb', () => ({
  getAllProjects: vi.fn().mockResolvedValue([]),
  saveProject: vi.fn().mockResolvedValue(undefined),
  deleteProject: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../store/useProjectStore', () => ({
  useProjectStore: (selector: (s: { loadProject: () => void }) => unknown) =>
    selector({ loadProject: vi.fn() }),
}))

vi.mock('../../data/builtinRegistries', () => ({
  BUILTIN_REGISTRIES: { terrain: [], plants: [], structures: [], paths: [] },
}))

// ─── tests ─────────────────────────────────────────────────────────────────────

describe('MAX_IMPORT_SIZE_BYTES', () => {
  it('is 50 MB', () => {
    expect(MAX_IMPORT_SIZE_BYTES).toBe(50 * 1024 * 1024)
  })
})

describe('WelcomeScreen file size guard', () => {
  let alertSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects a file over the size limit and fires alert', async () => {
    const { default: WelcomeScreen } = await import('../WelcomeScreen')
    render(<WelcomeScreen />)

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
    const oversizedFile = new File(['x'], 'big.json', { type: 'application/json' })
    Object.defineProperty(oversizedFile, 'size', { value: MAX_IMPORT_SIZE_BYTES + 1 })

    fireEvent.change(input, { target: { files: [oversizedFile] } })

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledOnce()
      expect(alertSpy.mock.calls[0][0]).toMatch(/too large/i)
    })
  })

  it('does not fire the size-limit alert for a file within the limit', async () => {
    const { default: WelcomeScreen } = await import('../WelcomeScreen')
    render(<WelcomeScreen />)

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
    const smallFile = new File(['{}'], 'small.json', { type: 'application/json' })
    Object.defineProperty(smallFile, 'size', { value: 1024 })

    fireEvent.change(input, { target: { files: [smallFile] } })

    // Give microtasks a tick to settle
    await new Promise((r) => setTimeout(r, 0))

    // The size guard must not have fired — any alerts that did fire are from
    // downstream validation warnings, not from the size check
    const sizeLimitCalls = alertSpy.mock.calls.filter((args: unknown[]) =>
      String(args[0]).toLowerCase().includes('too large')
    )
    expect(sizeLimitCalls).toHaveLength(0)
  })
})
