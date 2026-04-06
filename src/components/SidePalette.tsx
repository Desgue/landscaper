import { useState } from 'react'

type Tab = 'Terrain' | 'Plants' | 'Structures' | 'Paths'
const TABS: Tab[] = ['Terrain', 'Plants', 'Structures', 'Paths']

export default function SidePalette() {
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('Plants')

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
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            No items yet
          </div>
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
