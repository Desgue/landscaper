import { create } from 'zustand'
import type { ViewportState } from '../types/schema'
import { clampZoom, zoomTowardCursor } from '../canvas/viewport'

interface ViewportStore {
  panX: number
  panY: number
  zoom: number

  setPan(panX: number, panY: number): void
  setZoom(zoom: number): void
  setViewport(vp: ViewportState): void
  applyZoomTowardCursor(cursorX: number, cursorY: number, newZoom: number): void
  applyWheelZoom(cursorX: number, cursorY: number, deltaY: number): void
}

export const useViewportStore = create<ViewportStore>((set, get) => ({
  panX: 0,
  panY: 0,
  zoom: 1.0,

  setPan(panX: number, panY: number) {
    set({ panX, panY })
  },

  setZoom(zoom: number) {
    set({ zoom: clampZoom(zoom) })
  },

  setViewport(vp: ViewportState) {
    set({ panX: vp.panX, panY: vp.panY, zoom: clampZoom(vp.zoom) })
  },

  applyZoomTowardCursor(cursorX: number, cursorY: number, newZoom: number) {
    const { panX, panY, zoom } = get()
    const clamped = clampZoom(newZoom)
    const newPan = zoomTowardCursor(cursorX, cursorY, panX, panY, zoom, clamped)
    set({ zoom: clamped, panX: newPan.panX, panY: newPan.panY })
  },

  applyWheelZoom(cursorX: number, cursorY: number, deltaY: number) {
    const { zoom } = get()
    const factor = deltaY < 0 ? 1.1 : 1 / 1.1
    const newZoom = clampZoom(zoom * factor)
    const { panX, panY } = get()
    const clamped = clampZoom(newZoom)
    const newPan = zoomTowardCursor(cursorX, cursorY, panX, panY, zoom, clamped)
    set({ zoom: clamped, panX: newPan.panX, panY: newPan.panY })
  },
}))
