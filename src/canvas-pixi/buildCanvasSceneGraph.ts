import { type Application, Container, Graphics } from 'pixi.js'
import type { DisposalManager } from './DisposalManager'

export interface SceneGraph {
  world: Container
  gridContainer: Container
  terrainContainer: Container
  pathsContainer: Container
  elementsContainer: Container
  labelsContainer: Container
  overflowDimContainer: Container
  interaction: Container
  hud: Container
}

export function buildCanvasSceneGraph(
  app: Application,
  width: number,
  height: number,
  disposal: DisposalManager,
): SceneGraph {
  // WORLD container — holds all scene content, transformed by viewport
  const world = new Container()
  world.label = 'world'
  world.eventMode = 'none'
  world.isRenderGroup = true
  disposal.registerContainer(world)

  // World sub-containers (bottom to top)
  const gridContainer = new Container()
  gridContainer.label = 'grid'
  gridContainer.eventMode = 'none'

  const terrainContainer = new Container()
  terrainContainer.label = 'terrain'
  terrainContainer.eventMode = 'none'

  const pathsContainer = new Container()
  pathsContainer.label = 'paths'
  pathsContainer.eventMode = 'none'

  const elementsContainer = new Container()
  elementsContainer.label = 'elements'
  elementsContainer.eventMode = 'none'
  elementsContainer.sortableChildren = true

  const labelsContainer = new Container()
  labelsContainer.label = 'labels'
  labelsContainer.eventMode = 'none'

  const overflowDimContainer = new Container()
  overflowDimContainer.label = 'overflowDim'
  overflowDimContainer.eventMode = 'none'

  world.addChild(
    gridContainer,
    terrainContainer,
    pathsContainer,
    elementsContainer,
    labelsContainer,
    overflowDimContainer,
  )

  // INTERACTION container — transparent hit area covering full stage
  const interaction = new Container()
  interaction.label = 'interaction'
  interaction.eventMode = 'static'

  // Draw transparent full-stage hit area
  const hitArea = new Graphics()
  hitArea.rect(0, 0, width, height).fill({ color: 0xffffff, alpha: 0.001 })
  hitArea.eventMode = 'static'
  interaction.addChild(hitArea)

  // HUD container — screen-space overlays (empty for Phase 1)
  const hud = new Container()
  hud.label = 'hud'
  hud.eventMode = 'none'

  app.stage.addChild(world, interaction, hud)

  return {
    world,
    gridContainer,
    terrainContainer,
    pathsContainer,
    elementsContainer,
    labelsContainer,
    overflowDimContainer,
    interaction,
    hud,
  }
}
