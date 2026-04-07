/**
 * connectStore — Subscribe to a Zustand store slice imperatively.
 *
 * Designed for imperative renderer modules (GridRenderer, etc.) that live
 * outside React but need to react to store changes.
 *
 * @returns unsubscribe function
 */
import type { StoreApi } from 'zustand'

export function connectStore<S, T>(
  store: {
    subscribe: StoreApi<S>['subscribe']
    getState: StoreApi<S>['getState']
  },
  selector: (state: S) => T,
  callback: (value: T, prevValue: T) => void,
): () => void {
  let prev = selector(store.getState())
  return store.subscribe((state) => {
    const next = selector(state)
    if (next !== prev) {
      const old = prev
      prev = next
      callback(next, old)
    }
  })
}
