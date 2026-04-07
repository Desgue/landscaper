/**
 * DisposalManager — Tracks GPU resources for deterministic cleanup.
 *
 * Register containers, textures, and other GPU resources during creation.
 * Call destroyAll() on CanvasHost unmount to prevent GPU memory leaks.
 */

interface Destroyable {
  destroy: (...args: any[]) => void
}

interface DestroyableContainer extends Destroyable {
  children?: unknown[]
}

interface DestroyableTexture extends Destroyable {
  // marker — we differentiate by registration category
}

type ResourceEntry =
  | { kind: 'container'; resource: DestroyableContainer }
  | { kind: 'texture'; resource: DestroyableTexture }
  | { kind: 'generic'; resource: Destroyable }

export class DisposalManager {
  private resources: ResourceEntry[] = []

  /** Register a Container (will be destroyed with children). */
  registerContainer(resource: DestroyableContainer): void {
    this.resources.push({ kind: 'container', resource })
  }

  /** Register a Texture (will be destroyed with source). */
  registerTexture(resource: DestroyableTexture): void {
    this.resources.push({ kind: 'texture', resource })
  }

  /** Register any destroyable resource. */
  register(resource: Destroyable): void {
    this.resources.push({ kind: 'generic', resource })
  }

  /** Destroy all tracked resources and clear the list. */
  destroyAll(): void {
    for (const entry of this.resources) {
      try {
        switch (entry.kind) {
          case 'container':
            entry.resource.destroy({ children: true })
            break
          case 'texture':
            entry.resource.destroy({ texture: true, textureSource: true })
            break
          case 'generic':
            entry.resource.destroy()
            break
        }
      } catch {
        // Resource may already be destroyed — swallow
      }
    }
    this.resources = []
  }
}
