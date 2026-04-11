import { Container } from 'pixi.js'
import type { RenderScheduler } from './RenderScheduler'
import type { TextureAtlas } from './textures/TextureAtlas'
import type { CanvasTokens } from '../tokens/canvasTokens'
import type { RendererHandle } from './BaseRenderer'
import { createGridRenderer } from './GridRenderer'
import { createTerrainRenderer } from './TerrainRenderer'
import { createBoundaryRenderer } from './BoundaryRenderer'
import { createPathRenderer } from './PathRenderer'
import { createPlantRenderer } from './PlantRenderer'
import { createStructureRenderer } from './StructureRenderer'
import { createLabelRenderer } from './LabelRenderer'
import { createDimensionRenderer } from './DimensionRenderer'

export interface RendererSet {
  gridRenderer: RendererHandle
  terrainRenderer: RendererHandle
  boundaryRenderer: RendererHandle
  pathRenderer: RendererHandle
  plantRenderer: RendererHandle
  structureRenderer: RendererHandle
  labelRenderer: RendererHandle
  dimensionRenderer: RendererHandle
  textRendererUpdaters: Array<() => void>
}

interface RendererDeps {
  world: Container
  gridContainer: Container
  terrainContainer: Container
  pathsContainer: Container
  elementsContainer: Container
  labelsContainer: Container
  overflowDimContainer: Container
  scheduler: RenderScheduler
  textureAtlas: TextureAtlas
  getCanvasSize: () => { width: number; height: number }
  tokens: CanvasTokens
}

export function createAllRenderers(deps: RendererDeps): RendererSet {
  const {
    world,
    gridContainer,
    terrainContainer,
    pathsContainer,
    elementsContainer,
    labelsContainer,
    overflowDimContainer,
    scheduler,
    textureAtlas,
    getCanvasSize,
    tokens,
  } = deps

  const gridRenderer = createGridRenderer(gridContainer, scheduler)
  const terrainRenderer = createTerrainRenderer(terrainContainer, scheduler, textureAtlas, getCanvasSize)

  // BoundaryRenderer draws outlines/handles into a sub-container of world,
  // and the overflow dim into the overflowDim sub-container.
  const boundarySubContainer = new Container()
  boundarySubContainer.label = 'boundary'
  boundarySubContainer.eventMode = 'none'
  // Insert boundary visuals between paths and elements layers
  const pathsIdx = world.getChildIndex(pathsContainer)
  world.addChildAt(boundarySubContainer, pathsIdx + 1)

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

  // Apply canvas tokens to renderers
  boundaryRenderer.setTokens?.(tokens)
  dimensionRenderer.setTokens?.(tokens)
  labelRenderer.setTokens?.(tokens)
  plantRenderer.setTokens?.(tokens)
  structureRenderer.setTokens?.(tokens)

  // Text-bearing renderers for context restore (v8 bug #11685)
  const textRendererUpdaters = [
    () => plantRenderer.update(),
    () => structureRenderer.update(),
    () => labelRenderer.update(),
    () => dimensionRenderer.update(),
    () => boundaryRenderer.update(),
  ]

  return {
    gridRenderer,
    terrainRenderer,
    boundaryRenderer,
    pathRenderer,
    plantRenderer,
    structureRenderer,
    labelRenderer,
    dimensionRenderer,
    textRendererUpdaters,
  }
}
