/**
 * RenderScheduler — Central dirty-flag + rAF render loop.
 *
 * Render-on-demand architecture: the PixiJS Application is created with
 * autoStart: false and ticker stopped. Modules call markDirty() when visual
 * state changes; the scheduler batches all updates into a single rAF frame.
 *
 * NOT a module-level singleton — each CanvasHost creates its own instance
 * to avoid React Strict Mode double-mount issues with stale app references.
 */
import type { Application } from 'pixi.js'

/**
 * Enable to log per-frame render time (ms) to the console.
 * Toggle at build time or patch at runtime via `(scheduler as any).perfLogging = true`.
 */
const PERF_LOGGING = false

type RenderCallback = () => void

export class RenderScheduler {
  private app: Application | null = null
  private dirty = false
  private rafId = 0
  private callbacks: Set<RenderCallback> = new Set()
  private running = false

  /** Runtime-toggleable perf logging (mirrors the module-level default). */
  perfLogging = PERF_LOGGING

  /** Bind to an Application instance and begin accepting dirty signals. */
  start(app: Application): void {
    // Guard: stop any prior session first (Strict Mode safety)
    if (this.running) {
      this.stop()
    }
    this.app = app
    this.running = true
    // Render first frame immediately
    this.markDirty()
  }

  /** Stop the render loop and release the app reference. */
  stop(): void {
    this.running = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
    this.app = null
    this.dirty = false
  }

  /** Signal that the scene needs re-rendering. */
  markDirty(): void {
    if (!this.running) return
    if (this.dirty) return
    this.dirty = true
    this.rafId = requestAnimationFrame(this.render)
  }

  /** Register a callback to run before each render. */
  onRender(cb: RenderCallback): void {
    this.callbacks.add(cb)
  }

  /** Unregister a pre-render callback. */
  offRender(cb: RenderCallback): void {
    this.callbacks.delete(cb)
  }

  private render = (): void => {
    this.rafId = 0
    this.dirty = false
    if (!this.running || !this.app) return

    const t0 = this.perfLogging ? performance.now() : 0

    // Run pre-render callbacks
    for (const cb of this.callbacks) {
      cb()
    }

    // Render the scene
    this.app.renderer.render({ container: this.app.stage })

    if (this.perfLogging) {
      const elapsed = performance.now() - t0
      console.debug(`[RenderScheduler] frame: ${elapsed.toFixed(2)}ms`)
    }
  }
}
