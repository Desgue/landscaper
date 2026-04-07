import { useState, useEffect } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { useToolStore } from '../store/useToolStore'
import { useTerrainPaintStore } from '../canvas/TerrainLayer'
import { usePlantToolStore } from '../canvas/PlantLayer'
import { useStructureToolStore } from '../canvas/StructureLayer'
import { usePathToolStore } from '../canvas/PathLayer'
import type { ToolId } from '../types/schema'

type Tab = 'Terrain' | 'Plants' | 'Structures' | 'Paths'
const TABS: Tab[] = ['Terrain', 'Plants', 'Structures', 'Paths']

const TOOL_TO_TAB: Partial<Record<ToolId, Tab>> = {
  terrain: 'Terrain',
  plant: 'Plants',
  structure: 'Structures',
  path: 'Paths',
}

export default function SidePalette() {
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('Terrain')
  const activeTool = useToolStore((s) => s.activeTool)

  const terrainTypes = useProjectStore((s) => s.registries.terrain)
  const selectedTerrainTypeId = useTerrainPaintStore((s) => s.selectedTerrainTypeId)
  const setSelectedTerrainTypeId = useTerrainPaintStore((s) => s.setSelectedTerrainTypeId)

  // BUG-5 fix: Sync palette tab when toolbar tool changes
  useEffect(() => {
    const tab = TOOL_TO_TAB[activeTool]
    if (tab) setActiveTab(tab)
  }, [activeTool])

  // BUG-1 fix: Auto-select first terrain type when switching to terrain tool with none selected
  useEffect(() => {
    if (activeTool === 'terrain' && !selectedTerrainTypeId && terrainTypes.length > 0) {
      setSelectedTerrainTypeId(terrainTypes[0].id)
    }
  }, [activeTool, selectedTerrainTypeId, terrainTypes, setSelectedTerrainTypeId])
  const brushSize = useTerrainPaintStore((s) => s.brushSize)
  const brushSetBrushSize = useTerrainPaintStore((s) => s.setBrushSize)

  const plantTypes = useProjectStore((s) => s.registries.plants)
  const selectedPlantTypeId = usePlantToolStore((s) => s.selectedPlantTypeId)
  const setSelectedPlantTypeId = usePlantToolStore((s) => s.setSelectedPlantTypeId)

  const structureTypes = useProjectStore((s) => s.registries.structures)
  const selectedStructureTypeId = useStructureToolStore((s) => s.selectedStructureTypeId)
  const setSelectedStructureTypeId = useStructureToolStore((s) => s.setSelectedStructureTypeId)

  const pathTypes = useProjectStore((s) => s.registries.paths)
  const selectedPathTypeId = usePathToolStore((s) => s.selectedPathTypeId)
  const setSelectedPathTypeId = usePathToolStore((s) => s.setSelectedPathTypeId)

  function handleTerrainSwatchClick(id: string) {
    setSelectedTerrainTypeId(id)
    useToolStore.getState().setTool('terrain')
  }

  function handlePlantSwatchClick(id: string) {
    setSelectedPlantTypeId(id)
    useToolStore.getState().setTool('plant')
  }

  const STRUCTURE_CATEGORY_COLORS: Record<string, string> = {
    boundary: '#6b7280',
    container: '#92400e',
    surface: '#d97706',
    overhead: '#7c3aed',
    feature: '#0891b2',
    furniture: '#1d4ed8',
  }

  function handleStructureSwatchClick(id: string) {
    setSelectedStructureTypeId(id)
    useToolStore.getState().setTool('structure')
  }

  function handlePathSwatchClick(id: string) {
    setSelectedPathTypeId(id)
    useToolStore.getState().setTool('path')
  }

  return (
    <div
      className="flex flex-col bg-white border-r border-gray-200 flex-shrink-0 transition-all overflow-hidden"
      style={{ width: collapsed ? 0 : 240 }}
    >
      {!collapsed && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-200 flex-shrink-0">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 text-xs py-2 font-medium transition-colors"
                style={{
                  color: activeTab === tab ? '#1971c2' : '#6b7280',
                  borderBottom: activeTab === tab ? '2px solid #1971c2' : '2px solid transparent',
                  background: 'transparent',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          {activeTab === 'Terrain' ? (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex flex-wrap gap-2">
                {terrainTypes.map((tt) => (
                  <button
                    key={tt.id}
                    title={tt.name}
                    onClick={() => handleTerrainSwatchClick(tt.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        background: tt.color,
                        boxSizing: 'border-box',
                        border: selectedTerrainTypeId === tt.id
                          ? '2.5px solid #1971c2'
                          : '2px solid rgba(0,0,0,0.12)',
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        color: '#374151',
                        maxWidth: 40,
                        textAlign: 'center',
                        lineHeight: '1.2',
                        wordBreak: 'break-word',
                      }}
                    >
                      {tt.name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Brush size selector (FIX 7) */}
              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Brush size</span>
                <div className="flex gap-1" style={{ marginTop: 4 }}>
                  {([1, 2, 3] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => brushSetBrushSize(size)}
                      style={{
                        width: 40,
                        height: 28,
                        borderRadius: 5,
                        fontSize: 12,
                        fontWeight: brushSize === size ? 600 : 400,
                        background: brushSize === size ? '#e8f0fb' : '#f3f4f6',
                        color: brushSize === size ? '#1971c2' : '#374151',
                        border: brushSize === size ? '1.5px solid #1971c2' : '1px solid #d1d5db',
                        cursor: 'pointer',
                      }}
                    >
                      {size}x{size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'Plants' ? (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex flex-wrap gap-2">
                {plantTypes.map((pt) => {
                  const PLANT_COLORS: Record<string, string> = {
                    vegetable: '#4CAF50',
                    herb: '#66BB6A',
                    fruit: '#FF9800',
                    flower: '#E91E63',
                    tree: '#795548',
                    shrub: '#8BC34A',
                    other: '#9E9E9E',
                  }
                  const color = PLANT_COLORS[pt.category] ?? PLANT_COLORS['other']
                  return (
                    <button
                      key={pt.id}
                      title={pt.name}
                      onClick={() => handlePlantSwatchClick(pt.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 2,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: color,
                          boxSizing: 'border-box',
                          border: selectedPlantTypeId === pt.id
                            ? '2.5px solid #1971c2'
                            : '2px solid rgba(0,0,0,0.12)',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          color: '#374151',
                          maxWidth: 40,
                          textAlign: 'center',
                          lineHeight: '1.2',
                          wordBreak: 'break-word',
                        }}
                      >
                        {pt.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : activeTab === 'Structures' ? (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex flex-wrap gap-2">
                {structureTypes.map((st) => {
                  const color = STRUCTURE_CATEGORY_COLORS[st.category] ?? '#6b7280'
                  return (
                    <button
                      key={st.id}
                      title={st.name}
                      onClick={() => handleStructureSwatchClick(st.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 2,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          background: color,
                          boxSizing: 'border-box',
                          border: selectedStructureTypeId === st.id
                            ? '2.5px solid #1971c2'
                            : '2px solid rgba(0,0,0,0.12)',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          color: '#374151',
                          maxWidth: 40,
                          textAlign: 'center',
                          lineHeight: '1.2',
                          wordBreak: 'break-word',
                        }}
                      >
                        {st.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : activeTab === 'Paths' ? (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex flex-wrap gap-2">
                {pathTypes.map((pt) => (
                  <button
                    key={pt.id}
                    title={pt.name}
                    onClick={() => handlePathSwatchClick(pt.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 8,
                        borderRadius: 4,
                        background: pt.color,
                        boxSizing: 'border-box',
                        border: selectedPathTypeId === pt.id
                          ? '2.5px solid #1971c2'
                          : '2px solid rgba(0,0,0,0.12)',
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        color: '#374151',
                        maxWidth: 48,
                        textAlign: 'center',
                        lineHeight: '1.2',
                        wordBreak: 'break-word',
                      }}
                    >
                      {pt.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              No items yet
            </div>
          )}
        </>
      )}

      {/* Toggle button — sits at top of the strip */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute left-0 top-14 z-10 bg-white border border-gray-200 rounded-r text-gray-500 hover:bg-gray-50 flex items-center justify-center"
        style={{
          width: 16,
          height: 48,
          marginLeft: collapsed ? 0 : 240,
          transition: 'margin-left 0.15s',
        }}
        title={collapsed ? 'Expand palette' : 'Collapse palette'}
      >
        {collapsed ? '›' : '‹'}
      </button>
    </div>
  )
}
