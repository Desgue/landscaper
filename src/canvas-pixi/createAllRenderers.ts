import type { Container } from 'pixi.js'
import { createGridRenderer } from './GridRenderer'
import { createTerrainRenderer } from './TerrainRenderer'
import { createBoundaryRenderer } from './BoundaryRenderer'
import { createPathRenderer } from './PathRenderer'
import { createPlantRenderer } from './PlantRenderer'
import { createStructureRenderer } from './StructureRenderer'
import { createLabelRenderer } from './LabelRenderer'
import { createDimensionRenderer } from './DimensionRenderer'
import { createSelectionOverlay } from './SelectionOverlay'
import type { RenderScheduler } from './RenderScheduler'
import type { createTextureAtlas } from './textures/TextureAtlas'
import type { buildCanvasTokens } from '../tokens/canvasTokens'

export interface RendererContainers {
  gridContainer: Container
  terrainContainer: Container
  pathsContainer: Container
  elementsContainer: Container
  labelsContainer: Container
  overflowDimContainer: Container
  boundarySubContainer: Container
}

export interface AllRenderers {
  gridRenderer: ReturnType<typeof createGridRenderer>
  terrainRenderer: ReturnType<typeof createTerrainRenderer>
  boundaryRenderer: ReturnType<typeof createBoundaryRenderer>
  pathRenderer: ReturnType<typeof createPathRenderer>
  plantRenderer: ReturnType<typeof createPlantRenderer>
  structureRenderer: ReturnType<typeof createStructureRenderer>
  labelRenderer: ReturnType<typeof createLabelRenderer>
  dimensionRenderer: ReturnType<typeof createDimensionRenderer>
  selectionOverlay: ReturnType<typeof createSelectionOverlay>
  rendererUpdaters: Array<() => void>
}

export function createAllRenderers(
  containers: RendererContainers,
  selectionContainer: Container,
  scheduler: RenderScheduler,
  textureAtlas: ReturnType<typeof createTextureAtlas>,
  getCanvasSize: () => { width: number; height: number },
  tokens: ReturnType<typeof buildCanvasTokens>,
): AllRenderers {
  const {
    gridContainer,
    terrainContainer,
    pathsContainer,
    elementsContainer,
    labelsContainer,
    overflowDimContainer,
    boundarySubContainer,
  } = containers

  const gridRenderer = createGridRenderer(gridContainer, scheduler)
  const terrainRenderer = createTerrainRenderer(terrainContainer, scheduler, textureAtlas, getCanvasSize)
  const boundaryRenderer = createBoundaryRenderer(
    boundarySubContainer,
    overflowDimContainer,
    scheduler,
    getCanvasSize,
  )
  const pathRenderer = createPathRenderer(pathsContainer, scheduler)
  const plantRenderer = createPlantRenderer(elementsContainer, scheduler, textureAtlas, getCanvasSize)
  const structureRenderer = createStructureRenderer(elementsContainer, scheduler, textureAtlas, getCanvasSize)
  const labelRenderer = createLabelRenderer(labelsContainer, scheduler)
  const dimensionRenderer = createDimensionRenderer(labelsContainer, scheduler)

  // Apply canvas tokens to renderers that support it
  boundaryRenderer.setTokens?.(tokens)
  dimensionRenderer.setTokens?.(tokens)
  labelRenderer.setTokens?.(tokens)
  plantRenderer.setTokens?.(tokens)
  structureRenderer.setTokens?.(tokens)

  // Register Text-bearing renderers for context restore (v8 bug #11685)
  const rendererUpdaters: Array<() => void> = [
    () => plantRenderer.update(),
    () => structureRenderer.update(),
    () => labelRenderer.update(),
    () => dimensionRenderer.update(),
    () => boundaryRenderer.update(),
  ]

  const selectionOverlay = createSelectionOverlay(selectionContainer, scheduler)

  // Register selection overlay for context restore (it uses Graphics)
  rendererUpdaters.push(() => selectionOverlay.update())

  return {
    gridRenderer,
    terrainRenderer,
    boundaryRenderer,
    pathRenderer,
    plantRenderer,
    structureRenderer,
    labelRenderer,
    dimensionRenderer,
    selectionOverlay,
    rendererUpdaters,
  }
}
