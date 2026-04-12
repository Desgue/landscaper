/**
 * DisplayObjectPool — Generic object pool for PixiJS display objects.
 *
 * Reduces GC pressure from rapid create/destroy cycles by reusing PixiJS
 * Sprite, Text, and Graphics objects instead of allocating new ones each frame.
 *
 * Usage:
 *   const pool = new DisplayObjectPool(() => new Sprite(), (s) => { s.texture = Texture.EMPTY })
 *   const sprite = pool.acquire()   // get from pool or create new
 *   pool.release(sprite)            // reset and return to pool
 *   pool.drain()                    // destroy all pooled objects on teardown
 */

import { Sprite, Text, Graphics } from 'pixi.js'

export class DisplayObjectPool<T extends Sprite | Text | Graphics> {
  private readonly pool: T[] = []
  private readonly factory: () => T
  private readonly resetFn: (obj: T) => void

  constructor(factory: () => T, reset: (obj: T) => void) {
    this.factory = factory
    this.resetFn = reset
  }

  /**
   * Acquire an object from the pool, or create a new one if the pool is empty.
   */
  acquire(): T {
    const obj = this.pool.pop()
    if (obj !== undefined) return obj
    return this.factory()
  }

  /**
   * Return an object to the pool after resetting it to a neutral state.
   * The reset function is responsible for removing the object from its parent
   * and clearing any visual state.
   */
  release(obj: T): void {
    this.resetFn(obj)
    this.pool.push(obj)
  }

  /**
   * Destroy all pooled objects and empty the pool.
   * Call this during renderer teardown to avoid memory leaks.
   */
  drain(): void {
    for (const obj of this.pool) {
      obj.destroy()
    }
    this.pool.length = 0
  }

  /**
   * Current number of objects waiting in the pool.
   */
  get size(): number {
    return this.pool.length
  }
}
